// Package brandlint closes the two brand leaks Go's type system leaves open.
//
// # What the leaks are
//
// The kernel model brands a digest by the kind of declaration it names, and
// in Lean the comparison of two differently branded digests HAS NO TYPE —
// there is nothing to write. Go's defined types (`type ProgramDigest uint64`)
// recover most of that: `programDigest == policyDigest` is a compile error.
// Two holes remain, and both are silent:
//
//	LEAK 1  an untyped constant adopts any brand, so `d == 3` compiles;
//	LEAK 2  an explicit conversion crosses any brand, so `PolicyDigest(p)`
//	        compiles for any integer-based brand p, always, with no marker.
//
// Leak 2 is the worse one: it is available everywhere, it looks deliberate,
// and it never fails. This package makes both a finding.
//
// A third leak — a value-level brand, like the register that issued a token —
// cannot be closed at all, because Go has no dependent types. It rides as
// data and becomes a run-time check, and a caller who drops the returned
// error gets nothing. Nothing here changes that; see the guarded accessors in
// foldlab/kmconform.
//
// # Why this is not golang.org/x/tools/go/analysis
//
// The module's scoped contract (go/AGENTS.md) is stdlib plus the pinned nats
// libraries and nothing else, and go/analysis is not in the standard library.
// So the SHAPE is the vet-style one — an Analyzer with a Name, a Doc, and a
// Run over a Pass carrying the file set, the syntax, the package, and the
// type information, returning Diagnostics — while the plumbing underneath is
// go/parser plus go/types. If the dependency law ever changes, each Analyzer
// here lifts onto an analysis.Analyzer through one adapter, because nothing
// below reaches for anything a Pass does not carry.
//
// # How a type is known to be a brand
//
// A brand is declared, not guessed. A defined type whose declaration carries
// the directive comment
//
//	//foldlab:brand <kind>
//
// is a brand of the package that declares it. The generated tables in
// foldlab/kmconform carry one such directive per kind, emitted from the
// corpus, so the brand set is derived from the model rather than listed here.
// A package that consumes those brands passes them in through Config.Brands,
// keyed "<import path>.<type name>" — kmconform.BrandTypeNames exists for
// exactly that.
//
// # The escape hatch
//
// A deliberate cross-brand conversion at a serialization boundary is written
// with the directive
//
//	//foldlab:brandcast <reason>
//
// on the same line as the conversion, or on the line directly above it. It is
// a directive rather than a silence: the reason is in the source, and a
// reader can count them.
package brandlint

import (
	"fmt"
	"go/ast"
	"go/constant"
	"go/token"
	"go/types"
	"sort"
	"strings"
)

// Directive comments. Both are plain line comments so that gofmt leaves them
// where they were written and a grep finds every one.
const (
	BrandDirective = "//foldlab:brand"
	CastDirective  = "//foldlab:brandcast"
)

// Diagnostic is one finding: a position and what is wrong there.
type Diagnostic struct {
	Pos     token.Pos
	Check   string
	Message string
}

// Pass is everything an analyzer is given. The field set is deliberately the
// subset of go/analysis.Pass that these checks use, so the lift is mechanical
// if the dependency law ever admits x/tools.
type Pass struct {
	Fset      *token.FileSet
	Files     []*ast.File
	Pkg       *types.Package
	TypesInfo *types.Info

	// Brands is the brand set in "<import path>.<type name>" form, already
	// merged from the declarations in Files and from the caller's config.
	Brands map[string]bool

	// castLines is the set of "file:line" positions carrying the escape
	// directive, computed once per pass.
	castLines map[string]bool
}

// Analyzer is one check.
type Analyzer struct {
	Name string
	Doc  string
	Run  func(*Pass) []Diagnostic
}

// Analyzers is the suite, in the order the schema's §9.2 ranks the checks by
// value. Two of the four are implemented here; the other two are named in
// Gaps so that what is NOT covered is as visible as what is.
var Analyzers = []*Analyzer{BrandConversion, BrandConstant}

// Gaps names the checks the schema asks for that this package does not
// implement, so a green run cannot be read as full coverage.
var Gaps = []string{
	"a discarded error from a brand-guarded method (Spend, Compare) is not a finding here; " +
		"errcheck covers it, and it must be mandatory rather than advisory because the " +
		"value-level brands live nowhere else",
	"a type switch over a sealed act interface missing a case per generator is not a finding here; " +
		"Go gives no exhaustiveness and recovering it needs the sealed interface to exist first",
}

// BrandConversion refuses a conversion between two distinct brand types.
// This is leak 2, the worst of the three, because it is always available and
// never fails.
var BrandConversion = &Analyzer{
	Name: "brandconversion",
	Doc:  "a conversion between two distinct brand types is a finding unless marked " + CastDirective,
	Run: func(pass *Pass) []Diagnostic {
		var findings []Diagnostic
		for _, file := range pass.Files {
			ast.Inspect(file, func(node ast.Node) bool {
				call, ok := node.(*ast.CallExpr)
				if !ok || len(call.Args) != 1 {
					return true
				}
				target, ok := pass.TypesInfo.Types[call.Fun]
				if !ok || !target.IsType() {
					return true
				}
				to, isBrand := pass.brandOf(target.Type)
				if !isBrand {
					return true
				}
				argument, ok := pass.TypesInfo.Types[call.Args[0]]
				if !ok {
					return true
				}
				// Converting a constant is minting, not brand-crossing, and
				// minting is what the New<Kind>Digest constructors do.
				if argument.Value != nil {
					return true
				}
				from, fromIsBrand := pass.brandOf(argument.Type)
				if !fromIsBrand || from == to {
					return true
				}
				if pass.markedCast(call.Pos()) {
					return true
				}
				findings = append(findings, Diagnostic{
					Pos:   call.Pos(),
					Check: "brandconversion",
					Message: fmt.Sprintf(
						"conversion from %s to %s crosses a brand: in the model this comparison of sorts "+
							"has no type at all. Resolve the value in the destination sort, or mark a "+
							"deliberate serialization boundary with %s <reason>.",
						short(from), short(to), CastDirective),
				})
				return true
			})
		}
		return findings
	},
}

// BrandConstant refuses a comparison or arithmetic between a brand and an
// untyped constant other than zero. This is leak 1: the constant adopts the
// brand, so the expression compiles and means nothing.
var BrandConstant = &Analyzer{
	Name: "brandconstant",
	Doc:  "comparing or combining a brand type with a non-zero untyped constant is a finding",
	Run: func(pass *Pass) []Diagnostic {
		var findings []Diagnostic
		for _, file := range pass.Files {
			ast.Inspect(file, func(node ast.Node) bool {
				binary, ok := node.(*ast.BinaryExpr)
				if !ok || !interestingOperator(binary.Op) {
					return true
				}
				for _, pair := range [2][2]ast.Expr{{binary.X, binary.Y}, {binary.Y, binary.X}} {
					branded, literal := pair[0], pair[1]
					tv, ok := pass.TypesInfo.Types[branded]
					if !ok || tv.Value != nil {
						continue
					}
					brand, isBrand := pass.brandOf(tv.Type)
					if !isBrand {
						continue
					}
					value, untyped := pass.untypedConstant(literal)
					if !untyped {
						continue
					}
					// The designated zero is exempt: it is the one constant
					// that means the same thing in every sort.
					if value != nil && constant.Sign(value) == 0 {
						continue
					}
					if pass.markedCast(binary.Pos()) {
						continue
					}
					findings = append(findings, Diagnostic{
						Pos:   binary.Pos(),
						Check: "brandconstant",
						Message: fmt.Sprintf(
							"the untyped constant %s adopts the brand %s across %s: the comparison compiles "+
								"and says nothing about the sort. Name the value through its constructor, "+
								"or compare against the designated zero.",
							constantText(value), short(brand), binary.Op),
					})
					break
				}
				return true
			})
		}
		return findings
	},
}

func interestingOperator(op token.Token) bool {
	switch op {
	case token.EQL, token.NEQ, token.LSS, token.LEQ, token.GTR, token.GEQ,
		token.ADD, token.SUB, token.MUL, token.QUO, token.REM:
		return true
	default:
		return false
	}
}

// brandOf reports the brand key of a type, if it is a brand.
func (p *Pass) brandOf(typ types.Type) (string, bool) {
	named, ok := typ.(*types.Named)
	if !ok {
		return "", false
	}
	object := named.Obj()
	if object.Pkg() == nil {
		return "", false
	}
	key := object.Pkg().Path() + "." + object.Name()
	return key, p.Brands[key]
}

// untypedConstant reports the value of an operand that was WRITTEN as an
// untyped constant. The type checker has already converted it to the branded
// type by the time it reaches Info, so the syntax is what distinguishes
// `d == 3` from `d == ProgramDigest(3)`.
func (p *Pass) untypedConstant(expr ast.Expr) (constant.Value, bool) {
	switch node := expr.(type) {
	case *ast.ParenExpr:
		return p.untypedConstant(node.X)
	case *ast.UnaryExpr:
		if node.Op == token.SUB || node.Op == token.ADD {
			return p.untypedConstant(node.X)
		}
		return nil, false
	case *ast.BasicLit:
		return p.TypesInfo.Types[node].Value, true
	case *ast.Ident:
		declared, ok := p.TypesInfo.Uses[node].(*types.Const)
		if !ok {
			return nil, false
		}
		basic, ok := declared.Type().(*types.Basic)
		if !ok || basic.Info()&types.IsUntyped == 0 {
			return nil, false
		}
		return declared.Val(), true
	default:
		return nil, false
	}
}

// markedCast reports whether the escape directive sits on the position's line
// or on the line directly above it.
func (p *Pass) markedCast(pos token.Pos) bool {
	if p.castLines == nil {
		p.castLines = map[string]bool{}
		for _, file := range p.Files {
			for _, group := range file.Comments {
				for _, comment := range group.List {
					if !strings.HasPrefix(comment.Text, CastDirective) {
						continue
					}
					at := p.Fset.Position(comment.Pos())
					p.castLines[fmt.Sprintf("%s:%d", at.Filename, at.Line)] = true
				}
			}
		}
	}
	at := p.Fset.Position(pos)
	return p.castLines[fmt.Sprintf("%s:%d", at.Filename, at.Line)] ||
		p.castLines[fmt.Sprintf("%s:%d", at.Filename, at.Line-1)]
}

// declaredBrands collects the brands a package declares through the
// //foldlab:brand directive.
func declaredBrands(files []*ast.File, importPath string) map[string]bool {
	brands := map[string]bool{}
	for _, file := range files {
		for _, declaration := range file.Decls {
			generic, ok := declaration.(*ast.GenDecl)
			if !ok || generic.Tok != token.TYPE {
				continue
			}
			for _, spec := range generic.Specs {
				typeSpec, ok := spec.(*ast.TypeSpec)
				if !ok {
					continue
				}
				if carriesBrandDirective(generic.Doc) || carriesBrandDirective(typeSpec.Doc) {
					brands[importPath+"."+typeSpec.Name.Name] = true
				}
			}
		}
	}
	return brands
}

func carriesBrandDirective(group *ast.CommentGroup) bool {
	if group == nil {
		return false
	}
	for _, comment := range group.List {
		if strings.HasPrefix(comment.Text, BrandDirective) {
			return true
		}
	}
	return false
}

// short renders a brand key for a diagnostic: the type name, plus the last
// path element when a reader could otherwise not tell two brands apart.
func short(key string) string {
	cut := strings.LastIndex(key, ".")
	if cut < 0 {
		return key
	}
	path, name := key[:cut], key[cut+1:]
	if slash := strings.LastIndex(path, "/"); slash >= 0 {
		path = path[slash+1:]
	}
	return path + "." + name
}

func constantText(value constant.Value) string {
	if value == nil {
		return "a constant"
	}
	return value.String()
}

// SortDiagnostics puts findings in file, line, column order so a run's output
// is stable and two runs can be diffed.
func SortDiagnostics(fset *token.FileSet, findings []Diagnostic) {
	sort.SliceStable(findings, func(left, right int) bool {
		leftAt, rightAt := fset.Position(findings[left].Pos), fset.Position(findings[right].Pos)
		if leftAt.Filename != rightAt.Filename {
			return leftAt.Filename < rightAt.Filename
		}
		if leftAt.Line != rightAt.Line {
			return leftAt.Line < rightAt.Line
		}
		return leftAt.Column < rightAt.Column
	})
}
