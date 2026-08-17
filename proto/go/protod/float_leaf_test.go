package protod

import (
	"encoding/json"
	"os"
	"path/filepath"
	"regexp"
	"slices"
	"strings"
	"testing"
)

func TestRemovedFloatLeafFillRefusesThroughUnknownKind(t *testing.T) {
	body, err := json.Marshal(map[string]any{
		"partial": map[string]any{"k": "hole"},
		"path":    []any{},
		"subtree": map[string]any{"k": "float"},
	})
	if err != nil {
		t.Fatal(err)
	}

	response, ok := (&Daemon{}).serveFill(body).(refusalReply)
	if !ok {
		t.Fatalf("float-leaf fill returned %T, want refusalReply", (&Daemon{}).serveFill(body))
	}
	refusal := response.Refusal
	if refusal.Kind != KindInvalidStructure {
		t.Fatalf("float-leaf fill refusal kind = %q, want %q", refusal.Kind, KindInvalidStructure)
	}
	if refusal.Law != "flb.type.v0: unknown kind refuses — the grammar grows under ticket 004, never by admission on faith" {
		t.Fatalf("float-leaf fill used a new refusal law: %q", refusal.Law)
	}
	if !slices.Equal(refusal.Path, []string{"partial", "k"}) {
		t.Fatalf("float-leaf fill refusal path = %v, want [partial k]", refusal.Path)
	}
	if refusal.Got != "float" {
		t.Fatalf("float-leaf fill refusal got = %#v, want float", refusal.Got)
	}
}

func TestRemovedFloatLeafIsNotAdmittedByProtocolValueCheck(t *testing.T) {
	refusal := (&Daemon{}).checkValue(
		map[string]any{"k": "float"},
		float64(1.5),
		[]string{"value"},
	)
	if refusal == nil || refusal.Kind != KindInvalidStructure {
		t.Fatalf("removed float leaf value check = %#v, want invalid-structure", refusal)
	}
	if !slices.Equal(refusal.Path, []string{"value"}) {
		t.Fatalf("removed float leaf value-check path = %v, want [value]", refusal.Path)
	}
}

// The grammar is restated at sixteen sites (proto/GRAMMAR-SITES.md). This
// guard covers the fourteen that live under proto/: every executable
// restatement of the kind alphabet in Go and TypeScript, plus SPEC.md's
// declaration. The two it does not cover are the Lean reference grammar and
// its semantics in verify/ir/, which are another lane's sources behind another
// lane's gate (`bash verify/ir/run.sh`); a Go test in proto/ reaching across
// that boundary would make one gate's failure look like the other's.
//
// The forbidden pattern is the quoted kind name itself, not a shape around it:
// `case "float", "int":` evades `case\s+"float"\s*:` and is exactly how a
// dropped leaf comes back. No guarded source has any honest use for the token.
func grammarRestatementSites() []struct{ name, path string } {
	return []struct{ name, path string }{
		{"certifier kind list and leaf switch", "walk.go"},
		{"protocol value checker", "value_check.go"},
		{"completion corpus alphabet", "completion.go"},
		{"frontier choices", "concierge.go"},
		{"session grammar descriptor", "session.go"},
		{"contract.describe surface", "contract.go"},
		{"fixture corpus alphabet", filepath.Join("..", "cmd", "wirefix", "main.go")},
		{"author fold", filepath.Join("..", "..", "ts", "src", "author.ts")},
		{"derivation targets", filepath.Join("..", "..", "ts", "src", "codegen.ts")},
		{"TypeScript session descriptor", filepath.Join("..", "..", "ts", "src", "session.ts")},
	}
}

func readGuardedSource(t *testing.T, path string) string {
	t.Helper()
	content, err := os.ReadFile(filepath.Clean(path))
	if err != nil {
		t.Fatalf("read %s: %v", path, err)
	}
	return string(content)
}

func TestFloatLeafSourceGrepGuard(t *testing.T) {
	spec := readGuardedSource(t, filepath.Join("..", "..", "SPEC.md"))
	start := strings.Index(spec, "## The authoring grammar")
	if start < 0 {
		t.Fatal("could not locate SPEC.md's authoring grammar section")
	}
	end := strings.Index(spec[start:], "## Skeleton")
	if end < 0 {
		t.Fatal("could not locate SPEC.md's authoring grammar section")
	}
	if strings.Contains(spec[start:start+end], `"float"`) {
		t.Fatal("SPEC.md's flb.type.v0 grammar reintroduced the float leaf")
	}

	for _, site := range grammarRestatementSites() {
		if strings.Contains(readGuardedSource(t, site.path), `"float"`) {
			t.Errorf("%s reintroduced the float leaf in %s", site.name, site.path)
		}
	}
}

// The integrality bound is one predicate on purpose: a second statement of it
// is how the int leaf and a literal's value start admitting different numbers.
func TestIntegralityBoundIsStatedOnce(t *testing.T) {
	for _, site := range grammarRestatementSites() {
		if site.path == "walk.go" {
			continue
		}
		if strings.Contains(readGuardedSource(t, site.path), "9007199254740991") {
			t.Errorf("%s restates the safe-integer bound in %s; call isIntegralJSONNumber", site.name, site.path)
		}
	}
	if matched := regexp.MustCompile(`func isIntegralJSONNumber\(`).
		MatchString(readGuardedSource(t, "walk.go")); !matched {
		t.Error("walk.go no longer declares the one integrality bound")
	}
	if !strings.Contains(
		readGuardedSource(t, filepath.Join("..", "..", "ts", "src", "author.ts")),
		"Number.isSafeInteger",
	) {
		t.Error("the author fold no longer mirrors the integrality bound")
	}
}
