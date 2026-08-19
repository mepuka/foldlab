// Command goastdump parses Go source with the Go toolchain's own packages
// (go/parser, go/ast, go/token, go/printer, go/format) and dumps exactly what
// the files contain: the node census, a verbatim string table per node type,
// the layout facts, and a parity manifest.
//
// It exists to size the target grammar a Lean Go-printer would have to carry
// to reproduce the estate's GENERATED Go byte for byte. It reads; it never
// writes over a target.
//
//	go run . -out ../artifacts <file.go> [<file.go> ...]
package main

import (
	"crypto/sha256"
	"encoding/hex"
	"encoding/json"
	"flag"
	"fmt"
	"go/ast"
	"go/format"
	"go/parser"
	"go/printer"
	"go/token"
	"os"
	"path/filepath"
	"reflect"
	"sort"
	"strconv"
	"strings"
	"text/tabwriter"
)

// ---- the report shapes ----

type Report struct {
	Toolchain string       `json:"toolchain"`
	Files     []FileReport `json:"files"`
	Totals    []CensusRow  `json:"totals"`
	NodeKinds int          `json:"distinctNodeTypes"`
}

type FileReport struct {
	Path       string        `json:"path"`
	Bytes      int           `json:"bytes"`
	Lines      int           `json:"lines"`
	SHA256     string        `json:"sha256"`
	Census     []CensusRow   `json:"census"`
	Variants   []VariantRow  `json:"variants"`
	Strings    []StringRow   `json:"stringTable"`
	Layout     LayoutFacts   `json:"layout"`
	TopDecls   []DeclRow     `json:"topLevelDecls"`
	Comments   CommentFacts  `json:"comments"`
	Structural StructuralSum `json:"structural"`
}

type CensusRow struct {
	Node  string `json:"node"`
	Count int    `json:"count"`
}

type VariantRow struct {
	Field string `json:"field"`
	Value string `json:"value"`
	Count int    `json:"count"`
}

type StringRow struct {
	Node     string   `json:"node"`
	Distinct int      `json:"distinct"`
	Examples []string `json:"examples"` // Go-quoted, exact bytes, possibly truncated
}

type LayoutFacts struct {
	GofmtClean         bool     `json:"gofmtClean"`           // format.Source(src) == src
	PrinterClean       bool     `json:"printerClean"`         // go/printer with gofmt's config == src
	GofmtConfig        string   `json:"gofmtConfig"`          // the printer config that reproduces it
	TrailingNewline    bool     `json:"trailingNewline"`      //
	CRLF               int      `json:"crlfLines"`            //
	TrailingWhitespace int      `json:"trailingWhitespace"`   //
	LeadingTabIndent   int      `json:"linesWithTabIndent"`   //
	InteriorTabs       int      `json:"linesWithInteriorTab"` // 0 under gofmt's UseSpaces mode
	AlignmentPadding   int      `json:"linesWithAlignment"`   // run of >=2 spaces outside a literal
	AlignmentSites     []string `json:"alignmentSites"`       // sample aligned lines, exact bytes
	RawFormatDiffLines int      `json:"tabwriterTouchedLines"`
	RawFormatDiffSites []string `json:"tabwriterTouchedSites"`
	TabwriterReplay    bool     `json:"rawPlusTabwriterReproducesFile"`
	TabwriterParams    string   `json:"tabwriterParams"`
	MaxLineBytes       int      `json:"maxLineBytes"`
	BlankLines         int      `json:"blankLines"`
	MaxConsecBlank     int      `json:"maxConsecutiveBlankLines"`
	NonASCII           int      `json:"nonASCIIBytes"`
	RawStringLits      int      `json:"rawStringLiterals"`
}

type DeclRow struct {
	Kind  string `json:"kind"` // import | const | var | type | func | method
	Tok   string `json:"tok,omitempty"`
	Name  string `json:"name"`
	Specs int    `json:"specs,omitempty"`
	Doc   bool   `json:"doc"`
	Lines int    `json:"lines"`
}

type CommentFacts struct {
	Groups           int      `json:"groups"`
	Lines            int      `json:"lines"`
	LineComments     int      `json:"lineComments"`    // //
	BlockComments    int      `json:"blockComments"`   // /* */
	DocGroups        int      `json:"docGroups"`       // attached as Doc
	FloatingGroups   int      `json:"floatingGroups"`  // in File.Comments, not a Doc
	Directives       []string `json:"directives"`      // //foo:bar
	GeneratedBanner  string   `json:"generatedBanner"` // exact first line
	BannerMatchesGo  bool     `json:"bannerMatchesGoConvention"`
	HeaderLines      int      `json:"headerCommentLines"`
	InsideFuncBodies int      `json:"commentsInsideFuncBodies"`
}

type StructuralSum struct {
	MaxDepth        int            `json:"maxAstDepth"`
	DeclCount       int            `json:"declCount"`
	FuncDecls       int            `json:"funcDecls"`
	Methods         int            `json:"methods"`
	StmtKinds       []CensusRow    `json:"statementKinds"`
	ExprKinds       []CensusRow    `json:"expressionKinds"`
	CompositeShapes map[string]int `json:"compositeLitShapes"`
}

// ---- main ----

func main() {
	out := flag.String("out", ".", "directory to write the artifacts into")
	flag.Parse()
	if flag.NArg() == 0 {
		fmt.Fprintln(os.Stderr, "usage: goastdump [-out dir] <file.go> ...")
		os.Exit(2)
	}

	report := Report{Toolchain: fmt.Sprintf("go/parser+go/printer, %s", goVersion())}
	totals := map[string]int{}
	for _, path := range flag.Args() {
		fr, err := analyze(path)
		if err != nil {
			fmt.Fprintf(os.Stderr, "REFUSED %s: %v\n", path, err)
			os.Exit(1)
		}
		for _, row := range fr.Census {
			totals[row.Node] += row.Count
		}
		report.Files = append(report.Files, *fr)
	}
	report.Totals = sortCensus(totals)
	report.NodeKinds = len(totals)

	blob, err := json.MarshalIndent(report, "", "  ")
	if err != nil {
		panic(err)
	}
	blob = append(blob, '\n')
	if err := os.WriteFile(filepath.Join(*out, "census.json"), blob, 0o644); err != nil {
		panic(err)
	}
	md := renderMarkdown(&report)
	if err := os.WriteFile(filepath.Join(*out, "census.md"), []byte(md), 0o644); err != nil {
		panic(err)
	}
	fmt.Printf("wrote census.json (%d bytes) and census.md over %d file(s); %d distinct ast node types\n",
		len(blob), len(report.Files), report.NodeKinds)
}

func goVersion() string {
	// The toolchain that built this binary; recorded so the measurement is
	// attributable. printer/format behaviour is version-sensitive.
	return strings.TrimSpace(os.Getenv("GOASTDUMP_GOVERSION"))
}

// ---- the analysis ----

func analyze(path string) (*FileReport, error) {
	src, err := os.ReadFile(path)
	if err != nil {
		return nil, err
	}
	fset := token.NewFileSet()
	file, err := parser.ParseFile(fset, path, src, parser.ParseComments|parser.SkipObjectResolution)
	if err != nil {
		return nil, err
	}

	sum := sha256.Sum256(src)
	fr := &FileReport{
		Path:   path,
		Bytes:  len(src),
		Lines:  strings.Count(string(src), "\n"),
		SHA256: hex.EncodeToString(sum[:]),
	}

	census := map[string]int{}
	variants := map[string]map[string]int{}
	examples := map[string]map[string]bool{}
	stmtKinds := map[string]int{}
	exprKinds := map[string]int{}
	compositeShapes := map[string]int{}
	maxDepth := 0

	slice := func(n ast.Node) string {
		lo := fset.Position(n.Pos()).Offset
		hi := fset.Position(n.End()).Offset
		if lo < 0 || hi > len(src) || lo >= hi {
			return ""
		}
		return string(src[lo:hi])
	}
	bump := func(m map[string]map[string]int, field, value string) {
		if m[field] == nil {
			m[field] = map[string]int{}
		}
		m[field][value]++
	}

	var depth int
	ast.Inspect(file, func(n ast.Node) bool {
		if n == nil {
			depth--
			return false
		}
		depth++
		if depth > maxDepth {
			maxDepth = depth
		}
		name := reflect.TypeOf(n).String()
		census[name]++

		if _, ok := n.(ast.Stmt); ok {
			stmtKinds[name]++
		}
		if _, ok := n.(ast.Expr); ok {
			exprKinds[name]++
		}

		if examples[name] == nil {
			examples[name] = map[string]bool{}
		}
		if s := slice(n); s != "" {
			examples[name][s] = true
		}

		switch t := n.(type) {
		case *ast.GenDecl:
			bump(variants, "GenDecl.Tok", t.Tok.String())
			if t.Lparen.IsValid() {
				bump(variants, "GenDecl.parenthesized", "true")
			} else {
				bump(variants, "GenDecl.parenthesized", "false")
			}
		case *ast.BasicLit:
			bump(variants, "BasicLit.Kind", t.Kind.String())
			if strings.HasPrefix(t.Value, "`") {
				bump(variants, "BasicLit.stringForm", "raw (backquoted)")
			} else if t.Kind == token.STRING {
				bump(variants, "BasicLit.stringForm", "interpreted (quoted)")
			}
		case *ast.BinaryExpr:
			bump(variants, "BinaryExpr.Op", t.Op.String())
		case *ast.UnaryExpr:
			bump(variants, "UnaryExpr.Op", t.Op.String())
		case *ast.AssignStmt:
			bump(variants, "AssignStmt.Tok", t.Tok.String())
		case *ast.IncDecStmt:
			bump(variants, "IncDecStmt.Tok", t.Tok.String())
		case *ast.BranchStmt:
			bump(variants, "BranchStmt.Tok", t.Tok.String())
		case *ast.RangeStmt:
			bump(variants, "RangeStmt.Tok", t.Tok.String())
		case *ast.ArrayType:
			if t.Len == nil {
				bump(variants, "ArrayType.form", "slice ([]T)")
			} else if _, isEllipsis := t.Len.(*ast.Ellipsis); isEllipsis {
				bump(variants, "ArrayType.form", "inferred-length ([...]T)")
			} else {
				bump(variants, "ArrayType.form", "fixed-length ([N]T)")
			}
		case *ast.FuncDecl:
			if t.Recv != nil {
				bump(variants, "FuncDecl.form", "method")
			} else {
				bump(variants, "FuncDecl.form", "function")
			}
		case *ast.CompositeLit:
			shape := "untyped"
			if t.Type != nil {
				shape = slice(t.Type)
			}
			keyed := 0
			for _, e := range t.Elts {
				if _, ok := e.(*ast.KeyValueExpr); ok {
					keyed++
				}
			}
			form := "positional"
			switch {
			case keyed == len(t.Elts) && keyed > 0:
				form = "keyed"
			case keyed > 0:
				form = "mixed"
			case len(t.Elts) == 0:
				form = "empty"
			}
			compositeShapes[shape+" ["+form+"]"]++
			bump(variants, "CompositeLit.form", form)
		case *ast.Field:
			if len(t.Names) == 0 {
				bump(variants, "Field.form", "anonymous/embedded or unnamed param")
			} else {
				bump(variants, "Field.form", "named")
			}
		}
		return true
	})

	// Comments: File.Comments carries every group including floating ones that
	// ast.Inspect does not revisit.
	fr.Comments = commentFacts(fset, file, src)
	fr.Layout = layoutFacts(fset, file, src)
	fr.TopDecls = topDecls(fset, file)
	fr.Census = sortCensus(census)
	fr.Variants = sortVariants(variants)
	fr.Strings = stringTable(examples)
	fr.Structural = StructuralSum{
		MaxDepth:        maxDepth,
		DeclCount:       len(file.Decls),
		FuncDecls:       census["*ast.FuncDecl"],
		Methods:         variantCount(variants, "FuncDecl.form", "method"),
		StmtKinds:       sortCensus(stmtKinds),
		ExprKinds:       sortCensus(exprKinds),
		CompositeShapes: compositeShapes,
	}
	return fr, nil
}

func variantCount(m map[string]map[string]int, field, value string) int {
	if m[field] == nil {
		return 0
	}
	return m[field][value]
}

func commentFacts(fset *token.FileSet, file *ast.File, src []byte) CommentFacts {
	cf := CommentFacts{}
	docGroups := map[*ast.CommentGroup]bool{}
	ast.Inspect(file, func(n ast.Node) bool {
		switch t := n.(type) {
		case *ast.File:
			if t.Doc != nil {
				docGroups[t.Doc] = true
			}
		case *ast.GenDecl:
			if t.Doc != nil {
				docGroups[t.Doc] = true
			}
		case *ast.FuncDecl:
			if t.Doc != nil {
				docGroups[t.Doc] = true
			}
		case *ast.TypeSpec:
			if t.Doc != nil {
				docGroups[t.Doc] = true
			}
		case *ast.ValueSpec:
			if t.Doc != nil {
				docGroups[t.Doc] = true
			}
		case *ast.Field:
			if t.Doc != nil {
				docGroups[t.Doc] = true
			}
		}
		return true
	})

	funcRanges := [][2]int{}
	for _, d := range file.Decls {
		if fn, ok := d.(*ast.FuncDecl); ok && fn.Body != nil {
			funcRanges = append(funcRanges, [2]int{
				fset.Position(fn.Body.Lbrace).Offset,
				fset.Position(fn.Body.Rbrace).Offset,
			})
		}
	}

	directives := map[string]bool{}
	for _, group := range file.Comments {
		cf.Groups++
		if docGroups[group] {
			cf.DocGroups++
		} else {
			cf.FloatingGroups++
		}
		off := fset.Position(group.Pos()).Offset
		for _, lo := range funcRanges {
			if off > lo[0] && off < lo[1] {
				cf.InsideFuncBodies++
				break
			}
		}
		for _, c := range group.List {
			cf.Lines++
			if strings.HasPrefix(c.Text, "//") {
				cf.LineComments++
				body := strings.TrimPrefix(c.Text, "//")
				// A Go directive is //name:args with no space after //.
				if len(body) > 0 && body[0] != ' ' && body[0] != '\t' && strings.Contains(body, ":") {
					head := body
					if i := strings.IndexAny(head, " \t"); i >= 0 {
						head = head[:i]
					}
					directives[head] = true
				}
			} else {
				cf.BlockComments++
			}
		}
	}
	for d := range directives {
		cf.Directives = append(cf.Directives, d)
	}
	sort.Strings(cf.Directives)

	lines := strings.Split(string(src), "\n")
	if len(lines) > 0 {
		cf.GeneratedBanner = lines[0]
		// Go's own convention, cmd/go: ^// Code generated .* DO NOT EDIT\.$
		cf.BannerMatchesGo = strings.HasPrefix(lines[0], "// Code generated ") &&
			strings.HasSuffix(lines[0], " DO NOT EDIT.")
	}
	for _, l := range lines {
		if !strings.HasPrefix(l, "//") {
			break
		}
		cf.HeaderLines++
	}
	return cf
}

func layoutFacts(fset *token.FileSet, file *ast.File, src []byte) LayoutFacts {
	lf := LayoutFacts{}

	formatted, err := format.Source(src)
	lf.GofmtClean = err == nil && string(formatted) == string(src)

	// gofmt's own printer configuration (see cmd/gofmt: printerNormalizeNumbers
	// is an internal mode; the public equivalent is UseSpaces|TabIndent off,
	// i.e. Tabwidth 8 with tabs for indentation).
	cfg := printer.Config{Mode: printer.UseSpaces | printer.TabIndent, Tabwidth: 8}
	lf.GofmtConfig = "printer.Config{Mode: UseSpaces|TabIndent, Tabwidth: 8}"
	var buf strings.Builder
	if err := cfg.Fprint(&buf, fset, file); err == nil {
		lf.PrinterClean = buf.String() == string(src)
	}

	text := string(src)
	lf.TrailingNewline = strings.HasSuffix(text, "\n")
	lines := strings.Split(text, "\n")
	consec, maxConsec := 0, 0
	for _, l := range lines {
		if strings.HasSuffix(l, "\r") {
			lf.CRLF++
		}
		if l == "" {
			lf.BlankLines++
			consec++
			if consec > maxConsec {
				maxConsec = consec
			}
		} else {
			consec = 0
		}
		if len(l) > lf.MaxLineBytes {
			lf.MaxLineBytes = len(l)
		}
		if l != strings.TrimRight(l, " \t") {
			lf.TrailingWhitespace++
		}
		if strings.HasPrefix(l, "\t") {
			lf.LeadingTabIndent++
		}
		body := strings.TrimLeft(l, "\t")
		if strings.Contains(body, "\t") {
			lf.InteriorTabs++
		}
		// gofmt runs the tabwriter in UseSpaces mode, so elastic column
		// alignment lands as a run of two or more spaces, never as a tab.
		// Ignore runs inside a string literal.
		if hasAlignmentRun(body) {
			lf.AlignmentPadding++
			if len(lf.AlignmentSites) < 14 {
				lf.AlignmentSites = append(lf.AlignmentSites, strconv.Quote(l))
			}
		}
	}

	// The decisive measurement: printer.RawFormat is go/printer WITHOUT the
	// tabwriter pass. Every line where it differs from the committed bytes is
	// a line the elastic-alignment pass is load-bearing for.
	raw := printer.Config{Mode: printer.RawFormat, Tabwidth: 8}
	var rawBuf strings.Builder
	if err := raw.Fprint(&rawBuf, fset, file); err == nil {
		// Replay gofmt's own tabwriter over the raw stream. The parameters are
		// go/printer's, read off Config.fprint: minwidth 0 (TabIndent),
		// tabwidth 8, padding 1, padchar ' ' (UseSpaces), mode
		// DiscardEmptyColumns|TabIndent. If this reproduces the committed
		// bytes, the whole layout spec is "node layout + these five numbers".
		lf.TabwriterParams = "tabwriter.NewWriter(out, minwidth=0, tabwidth=8, padding=1, padchar=' ', DiscardEmptyColumns|TabIndent)"
		var replay strings.Builder
		tw := tabwriter.NewWriter(&replay, 0, 8, 1, ' ', tabwriter.DiscardEmptyColumns|tabwriter.TabIndent)
		if _, err := tw.Write([]byte(rawBuf.String())); err == nil {
			if err := tw.Flush(); err == nil {
				lf.TabwriterReplay = replay.String() == string(src)
			}
		}

		rawLines := strings.Split(rawBuf.String(), "\n")
		for i := range lines {
			if i >= len(rawLines) {
				break
			}
			if lines[i] != rawLines[i] {
				lf.RawFormatDiffLines++
				if len(lf.RawFormatDiffSites) < 14 {
					lf.RawFormatDiffSites = append(lf.RawFormatDiffSites,
						fmt.Sprintf("L%d committed=%s raw=%s", i+1,
							strconv.Quote(lines[i]), strconv.Quote(rawLines[i])))
				}
			}
		}
	}
	lf.MaxConsecBlank = maxConsec
	for _, b := range src {
		if b > 0x7e {
			lf.NonASCII++
		}
	}
	ast.Inspect(file, func(n ast.Node) bool {
		if lit, ok := n.(*ast.BasicLit); ok && lit.Kind == token.STRING && strings.HasPrefix(lit.Value, "`") {
			lf.RawStringLits++
		}
		return true
	})
	return lf
}

// hasAlignmentRun reports whether a line carries a run of two or more spaces
// outside a string or rune literal — the shape gofmt's tabwriter leaves when
// it aligns a column.
func hasAlignmentRun(line string) bool {
	inStr, inRune, inRaw := false, false, false
	run := 0
	for i := 0; i < len(line); i++ {
		c := line[i]
		switch {
		case inRaw:
			if c == '`' {
				inRaw = false
			}
			continue
		case inStr:
			if c == '\\' {
				i++
				continue
			}
			if c == '"' {
				inStr = false
			}
			continue
		case inRune:
			if c == '\\' {
				i++
				continue
			}
			if c == '\'' {
				inRune = false
			}
			continue
		}
		switch c {
		case '`':
			inRaw = true
			run = 0
		case '"':
			inStr = true
			run = 0
		case '\'':
			inRune = true
			run = 0
		case ' ':
			run++
			if run >= 2 {
				return true
			}
		default:
			run = 0
		}
	}
	return false
}

func topDecls(fset *token.FileSet, file *ast.File) []DeclRow {
	rows := []DeclRow{}
	for _, d := range file.Decls {
		lines := fset.Position(d.End()).Line - fset.Position(d.Pos()).Line + 1
		switch t := d.(type) {
		case *ast.GenDecl:
			name := ""
			switch len(t.Specs) {
			case 0:
			default:
				switch s := t.Specs[0].(type) {
				case *ast.TypeSpec:
					name = s.Name.Name
				case *ast.ValueSpec:
					if len(s.Names) > 0 {
						name = s.Names[0].Name
					}
				case *ast.ImportSpec:
					name = s.Path.Value
				}
				if len(t.Specs) > 1 {
					name += fmt.Sprintf(" (+%d more)", len(t.Specs)-1)
				}
			}
			rows = append(rows, DeclRow{
				Kind: "GenDecl", Tok: t.Tok.String(), Name: name,
				Specs: len(t.Specs), Doc: t.Doc != nil, Lines: lines,
			})
		case *ast.FuncDecl:
			kind := "func"
			name := t.Name.Name
			if t.Recv != nil {
				kind = "method"
				if len(t.Recv.List) > 0 {
					var b strings.Builder
					_ = printer.Fprint(&b, fset, t.Recv.List[0].Type)
					name = b.String() + "." + name
				}
			}
			rows = append(rows, DeclRow{Kind: kind, Name: name, Doc: t.Doc != nil, Lines: lines})
		}
	}
	return rows
}

// ---- rendering ----

const exampleCap = 110

func stringTable(examples map[string]map[string]bool) []StringRow {
	rows := []StringRow{}
	for node, set := range examples {
		all := make([]string, 0, len(set))
		for s := range set {
			all = append(all, s)
		}
		// Deterministic and representative: shortest first, then a long one.
		sort.Slice(all, func(i, j int) bool {
			if len(all[i]) != len(all[j]) {
				return len(all[i]) < len(all[j])
			}
			return all[i] < all[j]
		})
		picked := []string{}
		add := func(s string) {
			q := strconv.Quote(s)
			if len(s) > exampleCap {
				q = strconv.Quote(s[:exampleCap]) + fmt.Sprintf(" ...(+%d bytes)", len(s)-exampleCap)
			}
			for _, seen := range picked {
				if seen == q {
					return
				}
			}
			picked = append(picked, q)
		}
		for i := 0; i < len(all) && i < 4; i++ {
			add(all[i])
		}
		if len(all) > 4 {
			add(all[len(all)/2])
			add(all[len(all)-1])
		}
		rows = append(rows, StringRow{Node: node, Distinct: len(all), Examples: picked})
	}
	sort.Slice(rows, func(i, j int) bool { return rows[i].Node < rows[j].Node })
	return rows
}

func sortCensus(m map[string]int) []CensusRow {
	rows := make([]CensusRow, 0, len(m))
	for k, v := range m {
		rows = append(rows, CensusRow{Node: k, Count: v})
	}
	sort.Slice(rows, func(i, j int) bool {
		if rows[i].Count != rows[j].Count {
			return rows[i].Count > rows[j].Count
		}
		return rows[i].Node < rows[j].Node
	})
	return rows
}

func sortVariants(m map[string]map[string]int) []VariantRow {
	rows := []VariantRow{}
	for field, values := range m {
		for value, count := range values {
			rows = append(rows, VariantRow{Field: field, Value: value, Count: count})
		}
	}
	sort.Slice(rows, func(i, j int) bool {
		if rows[i].Field != rows[j].Field {
			return rows[i].Field < rows[j].Field
		}
		if rows[i].Count != rows[j].Count {
			return rows[i].Count > rows[j].Count
		}
		return rows[i].Value < rows[j].Value
	})
	return rows
}

func renderMarkdown(r *Report) string {
	var b strings.Builder
	fmt.Fprintf(&b, "# The Go AST census of the estate's generated Go\n\n")
	fmt.Fprintf(&b, "Measured with the Go toolchain's own packages (`go/parser`, `go/ast`,\n")
	fmt.Fprintf(&b, "`go/token`, `go/printer`, `go/format`). Toolchain: %s.\n\n", r.Toolchain)
	fmt.Fprintf(&b, "Distinct `go/ast` node types across all targets: **%d**.\n\n", r.NodeKinds)

	fmt.Fprintf(&b, "## Totals\n\n| node | count |\n| --- | ---: |\n")
	for _, row := range r.Totals {
		fmt.Fprintf(&b, "| `%s` | %d |\n", row.Node, row.Count)
	}
	b.WriteString("\n")

	for i := range r.Files {
		f := &r.Files[i]
		fmt.Fprintf(&b, "## %s\n\n", f.Path)
		fmt.Fprintf(&b, "- bytes: %d, lines: %d\n- sha256: `%s`\n", f.Bytes, f.Lines, f.SHA256)
		fmt.Fprintf(&b, "- max AST depth: %d; top-level decls: %d; funcs: %d (methods: %d)\n\n",
			f.Structural.MaxDepth, f.Structural.DeclCount, f.Structural.FuncDecls, f.Structural.Methods)

		fmt.Fprintf(&b, "### Layout facts\n\n")
		fmt.Fprintf(&b, "| fact | value |\n| --- | --- |\n")
		fmt.Fprintf(&b, "| `format.Source(src) == src` (gofmt fixed point) | **%v** |\n", f.Layout.GofmtClean)
		fmt.Fprintf(&b, "| `%s` reproduces the file | **%v** |\n", f.Layout.GofmtConfig, f.Layout.PrinterClean)
		fmt.Fprintf(&b, "| trailing newline | %v |\n", f.Layout.TrailingNewline)
		fmt.Fprintf(&b, "| CRLF lines | %d |\n", f.Layout.CRLF)
		fmt.Fprintf(&b, "| lines with trailing whitespace | %d |\n", f.Layout.TrailingWhitespace)
		fmt.Fprintf(&b, "| lines indented with tabs | %d |\n", f.Layout.LeadingTabIndent)
		fmt.Fprintf(&b, "| lines carrying an interior tab | %d |\n", f.Layout.InteriorTabs)
		fmt.Fprintf(&b, "| lines carrying elastic column alignment (>=2 spaces outside a literal) | %d |\n", f.Layout.AlignmentPadding)
		fmt.Fprintf(&b, "| lines `printer.RawFormat` (no tabwriter) spells differently — the alignment pass is load-bearing here | **%d** |\n", f.Layout.RawFormatDiffLines)
		fmt.Fprintf(&b, "| `RawFormat` + `%s` reproduces the file byte for byte | **%v** |\n", f.Layout.TabwriterParams, f.Layout.TabwriterReplay)
		fmt.Fprintf(&b, "| blank lines / max consecutive | %d / %d |\n", f.Layout.BlankLines, f.Layout.MaxConsecBlank)
		fmt.Fprintf(&b, "| longest line (bytes) | %d |\n", f.Layout.MaxLineBytes)
		fmt.Fprintf(&b, "| non-ASCII bytes | %d |\n", f.Layout.NonASCII)
		fmt.Fprintf(&b, "| raw (backquoted) string literals | %d |\n", f.Layout.RawStringLits)
		b.WriteString("\n")
		if len(f.Layout.AlignmentSites) > 0 {
			fmt.Fprintf(&b, "Alignment sites (sample, exact bytes):\n\n```\n")
			for _, s := range f.Layout.AlignmentSites {
				fmt.Fprintf(&b, "%s\n", s)
			}
			b.WriteString("```\n\n")
		}
		if len(f.Layout.RawFormatDiffSites) > 0 {
			fmt.Fprintf(&b, "Lines the tabwriter pass is load-bearing for (sample, exact bytes):\n\n```\n")
			for _, s := range f.Layout.RawFormatDiffSites {
				fmt.Fprintf(&b, "%s\n", s)
			}
			b.WriteString("```\n\n")
		}

		fmt.Fprintf(&b, "### Comment facts\n\n")
		fmt.Fprintf(&b, "- groups: %d (doc: %d, floating: %d); comment lines: %d\n",
			f.Comments.Groups, f.Comments.DocGroups, f.Comments.FloatingGroups, f.Comments.Lines)
		fmt.Fprintf(&b, "- `//` line comments: %d; `/* */` block comments: %d\n",
			f.Comments.LineComments, f.Comments.BlockComments)
		fmt.Fprintf(&b, "- comment groups inside function bodies: %d\n", f.Comments.InsideFuncBodies)
		fmt.Fprintf(&b, "- directives: %v\n", f.Comments.Directives)
		fmt.Fprintf(&b, "- header comment lines before the first blank: %d\n", f.Comments.HeaderLines)
		fmt.Fprintf(&b, "- first line: `%s`\n", f.Comments.GeneratedBanner)
		fmt.Fprintf(&b, "- matches Go's `Code generated ... DO NOT EDIT.` convention: **%v**\n\n",
			f.Comments.BannerMatchesGo)

		fmt.Fprintf(&b, "### Node census\n\n| node | count |\n| --- | ---: |\n")
		for _, row := range f.Census {
			fmt.Fprintf(&b, "| `%s` | %d |\n", row.Node, row.Count)
		}
		b.WriteString("\n")

		fmt.Fprintf(&b, "### Discriminators (the variant fields the inductives must carry)\n\n")
		fmt.Fprintf(&b, "| field | value | count |\n| --- | --- | ---: |\n")
		for _, row := range f.Variants {
			fmt.Fprintf(&b, "| `%s` | `%s` | %d |\n", row.Field, row.Value, row.Count)
		}
		b.WriteString("\n")

		fmt.Fprintf(&b, "### Composite-literal shapes\n\n| type | count |\n| --- | ---: |\n")
		shapes := make([]string, 0, len(f.Structural.CompositeShapes))
		for k := range f.Structural.CompositeShapes {
			shapes = append(shapes, k)
		}
		sort.Strings(shapes)
		for _, k := range shapes {
			fmt.Fprintf(&b, "| `%s` | %d |\n", k, f.Structural.CompositeShapes[k])
		}
		b.WriteString("\n")

		fmt.Fprintf(&b, "### Top-level declarations, in file order\n\n")
		fmt.Fprintf(&b, "| # | kind | tok | name | specs | doc | lines |\n| ---: | --- | --- | --- | ---: | --- | ---: |\n")
		for i, row := range f.TopDecls {
			fmt.Fprintf(&b, "| %d | %s | %s | `%s` | %d | %v | %d |\n",
				i+1, row.Kind, row.Tok, row.Name, row.Specs, row.Doc, row.Lines)
		}
		b.WriteString("\n")

		fmt.Fprintf(&b, "### String table — verbatim slices per node type\n\n")
		for _, row := range f.Strings {
			fmt.Fprintf(&b, "**`%s`** — %d distinct source slices\n\n```\n", row.Node, row.Distinct)
			for _, ex := range row.Examples {
				fmt.Fprintf(&b, "%s\n", ex)
			}
			b.WriteString("```\n\n")
		}
	}
	return b.String()
}
