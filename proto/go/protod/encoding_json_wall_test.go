// The encoding/json wall (finding #36, DEV-806).
//
// Finding #36 was not one bad line; it was a class. `encoding/json` is a
// REPAIRING decoder — duplicate member names last-win, lone surrogate escapes
// and raw invalid UTF-8 become U+FFFD — so reading request bytes with it names
// a value that did not arrive, and identity derived from that reading is
// identity of the repair. The repair was applied twice on this daemon: once at
// the type-identity boundary (closed by `9207ab1`, walled by
// `request_body_identity_test.go`) and once more at the journal-identity
// boundary in `serveIngress`, which re-read the raw body after admission had
// already read it.
//
// A one-line repair has no memory. This wall gives the class one: no
// `encoding/json` decode may take REQUEST bytes anywhere in protod, and every
// file that keeps the import must say at its import site which carriage
// concern it keeps it for. New code that reopens the door fails here rather
// than in a review that may not happen.
//
// The wall ships its negative controls (`AGENTS.md`: a prover that cannot fail
// proves nothing) — TestEncodingJSONWallRefusesItsMutants runs the same
// checker over mutated sources and requires each to be caught.
package protod

import (
	"go/ast"
	"go/parser"
	"go/printer"
	"go/token"
	"os"
	"path/filepath"
	"regexp"
	"sort"
	"strconv"
	"strings"
	"testing"
)

// protodSourceRoots are the directories the wall governs: the daemon package
// and its command. Both sit on the meaning path.
var protodSourceRoots = []string{".", filepath.Join("..", "cmd", "protod")}

// requestBytes names the expressions that carry SUBMITTER bytes. A decode
// whose input mentions one of these is reading what arrived on the wire, and
// on the meaning path that reading belongs to `canonical.Decode` alone
// (admission.go). Bytes the daemon produced itself — canonical bytes it just
// derived, journal payloads it wrote — are not submitter bytes and may be read
// with the standard library.
var requestBytes = regexp.MustCompile(`\b(body|msg\.Data)\b`)

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

// checkSource is the wall itself, expressed over one file's source so the
// mutated control can run the identical check on sources that never touch
// disk. `src` may be nil, in which case `name` is read from disk.
func checkSource(fileSet *token.FileSet, name string, src any) ([]violation, error) {
	file, err := parser.ParseFile(fileSet, name, src, parser.ParseComments)
	if err != nil {
		return nil, err
	}

	imports := false
	for _, spec := range file.Imports {
		path, err := strconv.Unquote(spec.Path.Value)
		if err == nil && path == "encoding/json" {
			imports = true
		}
	}
	if !imports {
		return nil, nil
	}

	var found []violation

	// Law 1: the import is classified at its site.
	classified := false
	for _, group := range file.Comments {
		if strings.Contains(group.Text(), strings.TrimPrefix(carriageMarker, "// ")) {
			classified = true
		}
	}
	if !classified {
		found = append(found, violation{
			file: name, line: fileSet.Position(file.Pos()).Line,
			message: "imports encoding/json without a `" + carriageMarker +
				" ...` classification naming the non-meaning concern it serves",
		})
	}

	// Law 2: no decode takes request bytes.
	ast.Inspect(file, func(node ast.Node) bool {
		call, ok := node.(*ast.CallExpr)
		if !ok || len(call.Args) == 0 {
			return true
		}
		selector, ok := call.Fun.(*ast.SelectorExpr)
		if !ok || !jsonDecoders[selector.Sel.Name] {
			return true
		}
		pkg, ok := selector.X.(*ast.Ident)
		if !ok || pkg.Name != "json" {
			return true
		}
		var rendered strings.Builder
		if err := printer.Fprint(&rendered, fileSet, call.Args[0]); err != nil {
			return true
		}
		if requestBytes.MatchString(rendered.String()) {
			found = append(found, violation{
				file: name, line: fileSet.Position(call.Pos()).Line,
				message: "json." + selector.Sel.Name + "(" + rendered.String() +
					", …) reads REQUEST bytes with a repairing decoder; the meaning path" +
					" admits bytes only through canonical.Decode (admission.go, finding #36)",
			})
		}
		return true
	})

	return found, nil
}

func protodSourceFiles(t *testing.T) []string {
	t.Helper()
	var files []string
	for _, root := range protodSourceRoots {
		entries, err := os.ReadDir(root)
		if err != nil {
			t.Fatalf("read %s: %v", root, err)
		}
		for _, entry := range entries {
			name := entry.Name()
			if entry.IsDir() || !strings.HasSuffix(name, ".go") || strings.HasSuffix(name, "_test.go") {
				continue
			}
			files = append(files, filepath.Join(root, name))
		}
	}
	sort.Strings(files)
	if len(files) == 0 {
		t.Fatal("wall scanned no sources: the wall would pass vacuously")
	}
	return files
}

func TestNoRepairingDecoderReadsRequestBytes(t *testing.T) {
	fileSet := token.NewFileSet()
	var found []violation
	for _, file := range protodSourceFiles(t) {
		violations, err := checkSource(fileSet, file, nil)
		if err != nil {
			t.Fatalf("parse %s: %v", file, err)
		}
		found = append(found, violations...)
	}
	for _, v := range found {
		t.Errorf("%s:%d: %s", v.file, v.line, v.message)
	}
}

// TestEncodingJSONWallRefusesItsMutants is the wall's negative control. Each
// mutant drops exactly one of the two laws and must be refused on that law;
// the clean source must pass, so the checker is not merely always-red.
func TestEncodingJSONWallRefusesItsMutants(t *testing.T) {
	const clean = `package protod

import "encoding/json"

// encoding/json carriage: reply serialization only.
func serialize(reply any) ([]byte, error) { return json.Marshal(reply) }
`

	const decodesRequestBytes = `package protod

import "encoding/json"

// encoding/json carriage: reply serialization only.
func serve(body []byte) error {
	var into any
	return json.Unmarshal(body, &into)
}
`

	const decodesTransportData = `package protod

import "encoding/json"

// encoding/json carriage: reply serialization only.
func handle(msg *nats.Msg) error {
	var into any
	return json.NewDecoder(bytes.NewReader(msg.Data)).Decode(&into)
}
`

	const unclassifiedImport = `package protod

import "encoding/json"

func serialize(reply any) ([]byte, error) { return json.Marshal(reply) }
`

	mutants := []struct {
		name   string
		source string
		want   string
	}{
		{"clean source passes", clean, ""},
		{"decode of body", decodesRequestBytes, "REQUEST bytes"},
		{"decode of msg.Data", decodesTransportData, "REQUEST bytes"},
		{"unclassified import", unclassifiedImport, "classification"},
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
				t.Fatalf("wall admitted the mutant: it cannot fail, so it proves nothing")
			}
			var messages []string
			for _, v := range found {
				messages = append(messages, v.message)
			}
			if !strings.Contains(strings.Join(messages, "\n"), mutant.want) {
				t.Fatalf("wall refused on the wrong law: want %q, got %v", mutant.want, messages)
			}
		})
	}
}
