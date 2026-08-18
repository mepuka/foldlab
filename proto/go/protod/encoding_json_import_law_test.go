// The encoding/json import law (finding #36, DEV-806; hardened under DEV-819).
//
// Finding #36 was not one bad line; it was a class. `encoding/json` is a
// REPAIRING decoder — duplicate member names last-win, lone surrogate escapes
// and raw invalid UTF-8 become U+FFFD — so reading request bytes with it names
// a value that did not arrive, and identity derived from that reading is
// identity of the repair. The repair was applied twice on this daemon: once at
// the type-identity boundary (closed by `9207ab1`, controlled by
// `request_body_identity_test.go`) and once more at the journal-identity
// boundary in `serveIngress`, which re-read the raw body after admission had
// already read it.
//
// A one-line repair has no memory. This law gives the class one: no
// `encoding/json` decode may take SUBMITTER bytes anywhere in protod, and every
// file that keeps the import must classify it AT its import site.
//
// # What this checks, and what it does NOT
//
// It is a source-level static check over protod's own sources, not a proof.
// Precisely, it holds three laws:
//
//  1. `encoding/json` is never dot-imported. A dot import erases the package
//     qualifier, so no AST check downstream of it can see a decoder at all.
//  2. Every surviving `encoding/json` import carries an
//     `// encoding/json carriage:` classification ON the import spec itself
//     (its doc comment, its line comment, or the doc of a lone import decl) —
//     not merely somewhere in the file.
//  3. No decoder entry point (`Unmarshal`, `NewDecoder`, or a function value
//     bound to one) is called with an argument whose expression mentions a
//     TAINTED name. Taint is seeded at `msg.Data` and at parameters named
//     `body`, propagates through local assignment and through call arguments
//     into the callee's parameter, and is CLEARED by the admission seam
//     (`canonical.Decode`, `canonical.Canonicalize`, `canonical.CanonicalizeValue`,
//     `decodeConstrained`, `decodeAdmitted`, `decodeBody`, `admittedFields`).
//     Clearing at the seam is the law itself: downstream of `canonical.Decode`
//     the bytes are admitted, and reading them with the standard library
//     repairs nothing.
//
// It does NOT cover: taint through function RETURN values (only parameters and
// assignments); reflection or `go:linkname`; decoders reached through an
// interface value; sources outside `protodSourceRoots`; or `_test.go` files.
// It is a gate against reopening the door by ordinary edit, not a proof that
// the door is shut. The behavioural controls are the proof:
// `request_body_identity_test.go` at the type boundary and
// `ingress_body_identity_test.go` at the journal boundary.
//
// The law ships its negative controls (`AGENTS.md`: a prover that cannot fail
// proves nothing) — TestEncodingJSONImportLawRefusesItsMutants runs the same checker
// over mutated sources and requires each to be caught on the law it dropped.
package protod

import (
	"go/ast"
	"go/parser"
	"go/printer"
	"go/token"
	"io/fs"
	"path/filepath"
	"sort"
	"strconv"
	"strings"
	"testing"
)

// protodSourceRoots are the directory trees the law governs: the daemon package
// and its command. Both sit on the meaning path. Each is walked recursively, so
// a package added underneath one of them is covered without an edit here.
var protodSourceRoots = []string{".", filepath.Join("..", "cmd", "protod")}

// seedNames are the expressions that carry SUBMITTER bytes at their point of
// entry: what arrived on the wire. On the meaning path that reading belongs to
// `canonical.Decode` alone (admission.go). Bytes the daemon produced itself —
// canonical bytes it just derived, journal payloads it wrote — are not
// submitter bytes and may be read with the standard library.
var seedNames = map[string]bool{"body": true, "msg.Data": true}

// admissionSeam clears taint. These are the functions that turn submitter bytes
// into an admitted value; everything downstream of them is admitted, by
// definition of the law this file holds.
var admissionSeam = map[string]bool{
	"Decode": true, "Canonicalize": true, "CanonicalizeValue": true,
	"decodeConstrained": true, "decodeAdmitted": true, "decodeBody": true,
	"admittedFields": true,
}

// carriageMarker is the classification every surviving import must carry at
// its import site, naming what non-meaning concern keeps encoding/json alive
// in that file.
const carriageMarker = "// encoding/json carriage:"

// jsonDecoders are the entry points that turn bytes into values.
var jsonDecoders = map[string]bool{"Unmarshal": true, "NewDecoder": true}

type violation struct {
	file    string
	line    int
	message string
}

// namedFile pairs a parsed file with the name to report violations against.
type namedFile struct {
	name string
	file *ast.File
	// jsonName is the local identifier encoding/json is bound to, or "" when
	// the file does not import it.
	jsonName string
}

// checkSource holds the law over a single source, so a mutated control can run
// the identical check on sources that never touch disk.
func checkSource(fileSet *token.FileSet, name string, src any) ([]violation, error) {
	file, err := parser.ParseFile(fileSet, name, src, parser.ParseComments)
	if err != nil {
		return nil, err
	}
	return checkFiles(fileSet, []namedFile{{name: name, file: file}}), nil
}

// checkFiles holds the law over a whole package, so taint crosses file
// boundaries the way a request does: `serveCreate` takes `body` and hands it to
// `certify` in another file, which must inherit it.
func checkFiles(fileSet *token.FileSet, files []namedFile) []violation {
	var found []violation

	// Laws 1 and 2: the import itself.
	for index := range files {
		spec, decl := jsonImport(files[index].file)
		if spec == nil {
			continue
		}
		local := "json"
		if spec.Name != nil {
			local = spec.Name.Name
		}
		if local == "." {
			found = append(found, violation{
				file: files[index].name, line: fileSet.Position(spec.Pos()).Line,
				message: "dot-imports encoding/json, which erases the package qualifier" +
					" and makes every decoder in this file invisible to the import law",
			})
		}
		if local != "_" {
			files[index].jsonName = local
		}
		if !classifiedAtImportSite(spec, decl) {
			found = append(found, violation{
				file: files[index].name, line: fileSet.Position(spec.Pos()).Line,
				message: "imports encoding/json without a `" + carriageMarker +
					" ...` classification ON the import spec, naming the non-meaning" +
					" concern it serves",
			})
		}
	}

	// Law 3: no decoder entry point takes tainted bytes.
	tainted, aliases := propagate(fileSet, files)
	for _, named := range files {
		if named.jsonName == "" {
			continue
		}
		for _, decl := range funcDecls(named.file) {
			scope := tainted[declKey(decl)]
			ast.Inspect(decl, func(node ast.Node) bool {
				call, ok := node.(*ast.CallExpr)
				if !ok || len(call.Args) == 0 {
					return true
				}
				label, ok := decoderCall(call, named.jsonName, aliases)
				if !ok || !mentionsTainted(call.Args[0], scope) {
					return true
				}
				found = append(found, violation{
					file: named.name, line: fileSet.Position(call.Pos()).Line,
					message: label + "(" + render(fileSet, call.Args[0]) +
						", …) reads SUBMITTER bytes with a repairing decoder; the meaning" +
						" path admits bytes only through canonical.Decode (admission.go," +
						" finding #36)",
				})
				return true
			})
		}
	}

	sort.Slice(found, func(i, j int) bool {
		if found[i].file != found[j].file {
			return found[i].file < found[j].file
		}
		return found[i].line < found[j].line
	})
	return found
}

// jsonImport returns the encoding/json import spec and its enclosing decl.
func jsonImport(file *ast.File) (*ast.ImportSpec, *ast.GenDecl) {
	for _, decl := range file.Decls {
		gen, ok := decl.(*ast.GenDecl)
		if !ok || gen.Tok != token.IMPORT {
			continue
		}
		for _, spec := range gen.Specs {
			imported, ok := spec.(*ast.ImportSpec)
			if !ok {
				continue
			}
			path, err := strconv.Unquote(imported.Path.Value)
			if err == nil && path == "encoding/json" {
				return imported, gen
			}
		}
	}
	return nil, nil
}

// classifiedAtImportSite asks the import spec itself, not the file. A marker in
// an unrelated comment elsewhere in the file is not a classification of this
// import — that was the hole DEV-819 found.
func classifiedAtImportSite(spec *ast.ImportSpec, decl *ast.GenDecl) bool {
	marker := strings.TrimPrefix(carriageMarker, "// ")
	for _, group := range []*ast.CommentGroup{spec.Doc, spec.Comment} {
		if group != nil && strings.Contains(group.Text(), marker) {
			return true
		}
	}
	// A lone `import "encoding/json"` carries its doc on the decl.
	if decl != nil && !decl.Lparen.IsValid() && decl.Doc != nil {
		return strings.Contains(decl.Doc.Text(), marker)
	}
	return false
}

// decoderCall names the decoder a call reaches, if any: a qualified
// `json.Unmarshal` / `json.NewDecoder` under whatever name the file bound the
// package to, or a local function value assigned from one.
func decoderCall(call *ast.CallExpr, jsonName string, aliases map[string]string) (string, bool) {
	switch fun := call.Fun.(type) {
	case *ast.SelectorExpr:
		pkg, ok := fun.X.(*ast.Ident)
		if ok && pkg.Name == jsonName && jsonDecoders[fun.Sel.Name] {
			return jsonName + "." + fun.Sel.Name, true
		}
	case *ast.Ident:
		if target, ok := aliases[fun.Name]; ok {
			return fun.Name + " (= " + target + ")", true
		}
	}
	return "", false
}

func funcDecls(file *ast.File) []*ast.FuncDecl {
	var decls []*ast.FuncDecl
	for _, decl := range file.Decls {
		if fn, ok := decl.(*ast.FuncDecl); ok && fn.Body != nil {
			decls = append(decls, fn)
		}
	}
	return decls
}

// declKey identifies a function across files. Methods key on their own name, so
// two same-named methods share a taint scope — conservative, never permissive.
func declKey(decl *ast.FuncDecl) string { return decl.Name.Name }

// propagate computes, per function, the set of names holding submitter bytes,
// and the set of local identifiers bound to a decoder entry point. It iterates
// to a fixpoint so caller/callee order in the file list does not matter.
func propagate(fileSet *token.FileSet, files []namedFile) (map[string]map[string]bool, map[string]string) {
	tainted := map[string]map[string]bool{}
	aliases := map[string]string{}
	decls := map[string]*ast.FuncDecl{}

	for _, named := range files {
		for _, decl := range funcDecls(named.file) {
			key := declKey(decl)
			decls[key] = decl
			scope := map[string]bool{}
			for _, param := range decl.Type.Params.List {
				for _, name := range param.Names {
					if seedNames[name.Name] {
						scope[name.Name] = true
					}
				}
			}
			// msg.Data is a seed wherever it appears.
			for seed := range seedNames {
				if strings.Contains(seed, ".") {
					scope[seed] = true
				}
			}
			tainted[key] = scope
		}
		// A local bound to a decoder entry point is that decoder.
		if named.jsonName == "" {
			continue
		}
		ast.Inspect(named.file, func(node ast.Node) bool {
			assign, ok := node.(*ast.AssignStmt)
			if !ok {
				return true
			}
			for index, rhs := range assign.Rhs {
				selector, ok := rhs.(*ast.SelectorExpr)
				if !ok || index >= len(assign.Lhs) {
					continue
				}
				pkg, ok := selector.X.(*ast.Ident)
				if !ok || pkg.Name != named.jsonName || !jsonDecoders[selector.Sel.Name] {
					continue
				}
				if lhs, ok := assign.Lhs[index].(*ast.Ident); ok {
					aliases[lhs.Name] = named.jsonName + "." + selector.Sel.Name
				}
			}
			return true
		})
	}

	for round := 0; round < 8; round++ {
		changed := false
		for _, named := range files {
			for _, decl := range funcDecls(named.file) {
				scope := tainted[declKey(decl)]
				ast.Inspect(decl.Body, func(node ast.Node) bool {
					switch stmt := node.(type) {
					case *ast.AssignStmt:
						for index, rhs := range stmt.Rhs {
							if clearedAtSeam(rhs) || !mentionsTainted(rhs, scope) {
								continue
							}
							// One RHS, many LHS (a multi-value call) cannot be
							// a pass-through; only same-arity assignment is.
							if len(stmt.Rhs) != len(stmt.Lhs) {
								continue
							}
							if lhs, ok := stmt.Lhs[index].(*ast.Ident); ok && !scope[lhs.Name] {
								scope[lhs.Name] = true
								changed = true
							}
						}
					case *ast.CallExpr:
						callee, ok := calleeName(stmt)
						if !ok {
							return true
						}
						target, known := decls[callee]
						if !known || admissionSeam[callee] {
							return true
						}
						for index, arg := range stmt.Args {
							if !mentionsTainted(arg, scope) {
								continue
							}
							if name, ok := paramName(target, index); ok {
								if !tainted[callee][name] {
									tainted[callee][name] = true
									changed = true
								}
							}
						}
					}
					return true
				})
			}
		}
		if !changed {
			break
		}
	}
	return tainted, aliases
}

// clearedAtSeam reports whether an expression's outermost call is the admission
// seam. `value, err := canonical.Decode(body)` yields an admitted value, not
// submitter bytes — that is the whole law.
func clearedAtSeam(expr ast.Expr) bool {
	call, ok := expr.(*ast.CallExpr)
	if !ok {
		return false
	}
	name, ok := calleeName(call)
	return ok && admissionSeam[name]
}

func calleeName(call *ast.CallExpr) (string, bool) {
	switch fun := call.Fun.(type) {
	case *ast.Ident:
		return fun.Name, true
	case *ast.SelectorExpr:
		return fun.Sel.Name, true
	}
	return "", false
}

func paramName(decl *ast.FuncDecl, index int) (string, bool) {
	position := 0
	for _, field := range decl.Type.Params.List {
		for _, name := range field.Names {
			if position == index {
				return name.Name, name.Name != "_"
			}
			position++
		}
	}
	return "", false
}

// mentionsTainted reports whether an expression's subtree names tainted bytes.
func mentionsTainted(expr ast.Expr, scope map[string]bool) bool {
	found := false
	ast.Inspect(expr, func(node ast.Node) bool {
		switch value := node.(type) {
		case *ast.SelectorExpr:
			if ident, ok := value.X.(*ast.Ident); ok && scope[ident.Name+"."+value.Sel.Name] {
				found = true
			}
		case *ast.Ident:
			if scope[value.Name] {
				found = true
			}
		}
		return !found
	})
	return found
}

func render(fileSet *token.FileSet, expr ast.Expr) string {
	var out strings.Builder
	if err := printer.Fprint(&out, fileSet, expr); err != nil {
		return "?"
	}
	return out.String()
}

func protodSourceFiles(t *testing.T) []string {
	t.Helper()
	var files []string
	for _, root := range protodSourceRoots {
		err := filepath.WalkDir(root, func(path string, entry fs.DirEntry, err error) error {
			if err != nil {
				return err
			}
			name := entry.Name()
			if entry.IsDir() {
				if path != root && (name == "testdata" || strings.HasPrefix(name, ".")) {
					return fs.SkipDir
				}
				return nil
			}
			if !strings.HasSuffix(name, ".go") || strings.HasSuffix(name, "_test.go") {
				return nil
			}
			files = append(files, path)
			return nil
		})
		if err != nil {
			t.Fatalf("walk %s: %v", root, err)
		}
	}
	sort.Strings(files)
	if len(files) == 0 {
		t.Fatal("the import law scanned no sources: it would pass vacuously")
	}
	return files
}

func TestNoRepairingDecoderReadsRequestBytes(t *testing.T) {
	fileSet := token.NewFileSet()
	var parsed []namedFile
	for _, name := range protodSourceFiles(t) {
		file, err := parser.ParseFile(fileSet, name, nil, parser.ParseComments)
		if err != nil {
			t.Fatalf("parse %s: %v", name, err)
		}
		parsed = append(parsed, namedFile{name: name, file: file})
	}
	for _, v := range checkFiles(fileSet, parsed) {
		t.Errorf("%s:%d: %s", v.file, v.line, v.message)
	}
}

// TestEncodingJSONImportLawRefusesItsMutants is the negative control. Each mutant
// drops exactly one law and must be refused on that law; the clean source must
// pass, so the checker is not merely always-red.
//
// The eight evasions below were found by adversarial review (DEV-819) against
// the first version of this file, which matched the printed text of a decode's
// first argument against the names `body` and `msg.Data`. Every one of them
// reopened finding #36 and every one was admitted.
func TestEncodingJSONImportLawRefusesItsMutants(t *testing.T) {
	mutants := []struct {
		name   string
		source string
		want   string
	}{
		{"clean source passes", `package protod

import (
	// encoding/json carriage: reply serialization only.
	"encoding/json"
)

func serialize(reply any) ([]byte, error) { return json.Marshal(reply) }
`, ""},

		{"clean source passes with a lone import", `package protod

// encoding/json carriage: reply serialization only.
import "encoding/json"

func serialize(reply any) ([]byte, error) { return json.Marshal(reply) }
`, ""},

		{"admitted bytes are not submitter bytes", `package protod

import (
	// encoding/json carriage: the typed projection over admitted bytes.
	"encoding/json"
)

func decodeAdmitted(body []byte, into any) error {
	value, err := canonical.Decode(body)
	if err != nil {
		return err
	}
	admitted, err := canonical.CanonicalizeValue(value)
	if err != nil {
		return err
	}
	return json.Unmarshal(admitted, into)
}
`, ""},

		{"decode of body", `package protod

import (
	// encoding/json carriage: reply serialization only.
	"encoding/json"
)

func serve(body []byte) error {
	var into any
	return json.Unmarshal(body, &into)
}
`, "SUBMITTER bytes"},

		{"decode of msg.Data", `package protod

import (
	// encoding/json carriage: reply serialization only.
	"encoding/json"
)

func handle(msg *nats.Msg) error {
	var into any
	return json.NewDecoder(bytes.NewReader(msg.Data)).Decode(&into)
}
`, "SUBMITTER bytes"},

		{"unclassified import", `package protod

import "encoding/json"

func serialize(reply any) ([]byte, error) { return json.Marshal(reply) }
`, "classification"},

		{"marker not at the import site", `package protod

import "encoding/json"

func serialize(reply any) ([]byte, error) { return json.Marshal(reply) }

// Historical note: the encoding/json carriage: classification used to sit on
// the import above. A refactor moved it here and nothing noticed.
func unrelated() {}
`, "classification"},

		{"aliased import", `package protod

import (
	// encoding/json carriage: reply serialization only.
	stdjson "encoding/json"
)

func serve(body []byte) error {
	var into any
	return stdjson.Unmarshal(body, &into)
}
`, "SUBMITTER bytes"},

		{"dot import", `package protod

import (
	// encoding/json carriage: reply serialization only.
	. "encoding/json"
)

func serve(body []byte) error {
	var into any
	return Unmarshal(body, &into)
}
`, "dot-imports"},

		{"parameter not named body", `package protod

import (
	// encoding/json carriage: reply serialization only.
	"encoding/json"
)

func dispatch(body []byte) error { return serve(body) }

func serve(payload []byte) error {
	var into any
	return json.Unmarshal(payload, &into)
}
`, "SUBMITTER bytes"},

		{"parameter named bytes, certify.go's own convention", `package protod

import (
	// encoding/json carriage: reply serialization only.
	"encoding/json"
)

func serveCreate(body []byte) error { return certify(body) }

func certify(bytes []byte) error {
	var into any
	return json.Unmarshal(bytes, &into)
}
`, "SUBMITTER bytes"},

		{"one-hop local alias", `package protod

import (
	// encoding/json carriage: reply serialization only.
	"encoding/json"
)

func serve(body []byte) error {
	raw := body
	var into any
	return json.Unmarshal(raw, &into)
}
`, "SUBMITTER bytes"},

		{"reader hoisted out of the call", `package protod

import (
	// encoding/json carriage: reply serialization only.
	"encoding/json"
)

func serve(body []byte) error {
	reader := bytes.NewReader(body)
	var into any
	return json.NewDecoder(reader).Decode(&into)
}
`, "SUBMITTER bytes"},

		{"decoder taken as a function value", `package protod

import (
	// encoding/json carriage: reply serialization only.
	"encoding/json"
)

func serve(body []byte) error {
	unmarshal := json.Unmarshal
	var into any
	return unmarshal(body, &into)
}
`, "SUBMITTER bytes"},

		{"slice of the body", `package protod

import (
	// encoding/json carriage: reply serialization only.
	"encoding/json"
)

func serve(body []byte) error {
	request := body[0:]
	var into any
	return json.Unmarshal(request[0:], &into)
}
`, "SUBMITTER bytes"},
	}

	for _, mutant := range mutants {
		t.Run(mutant.name, func(t *testing.T) {
			fileSet := token.NewFileSet()
			found, err := checkSource(fileSet, "mutant.go", mutant.source)
			if err != nil {
				t.Fatalf("parse mutant: %v", err)
			}
			if mutant.want == "" {
				if len(found) != 0 {
					t.Fatalf("clean source was refused: %v", found)
				}
				return
			}
			if len(found) == 0 {
				t.Fatalf("the law admitted the mutant: it cannot fail, so it proves nothing")
			}
			var messages []string
			for _, v := range found {
				messages = append(messages, v.message)
			}
			if !strings.Contains(strings.Join(messages, "\n"), mutant.want) {
				t.Fatalf("refused on the wrong law: want %q, got %v", mutant.want, messages)
			}
		})
	}
}
