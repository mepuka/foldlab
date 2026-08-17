package protod

import (
	"encoding/json"
	"fmt"
	"regexp"
	"slices"
	"strings"
	"testing"
)

// The closure law (operator ruling 7): no position in a flb.type.v0 TERM admits
// a non-integral number. Two serial blockers — the literal position, then
// check.args — proved that narrowing one position at a time does not converge,
// so the bound moved into the walker's number-decoding path and every position
// inherits it. These tests probe the inheritance, not the patch: the four
// canonical vectors are planted in check.args, at four nesting depths, and
// under four enclosing kinds, and none of those sites has a check of its own.
//
// 5e-324, 1e+21 and 1e-7 are the exact ES2019 §7.1.12.1 / RFC 8785 §3.2.2.3
// shortest-round-trip renderings the whole cure exists to keep out of identity
// bytes; 0.1 is the ordinary case showing the bound is integrality, not
// magnitude.
var canonicalNonIntegralProbes = []string{"5e-324", "0.1", "1e21", "1e-7"}

func mustDecode(t *testing.T, source string) any {
	t.Helper()
	var value any
	if err := json.Unmarshal([]byte(source), &value); err != nil {
		t.Fatal(err)
	}
	return value
}

func checkWithArgs(args any) map[string]any {
	return map[string]any{
		"k":     "check",
		"base":  map[string]any{"k": "string"},
		"check": map[string]any{"name": "minLength", "args": args},
	}
}

func requireClosureRefusal(t *testing.T, term any, wantPath []string, number float64) {
	t.Helper()
	_, refusal := walkStructure(term, []string{})
	if refusal == nil {
		t.Fatalf("term %+v was admitted into flb.type.v0", term)
	}
	if refusal.Kind != KindInvalidStructure {
		t.Fatalf("refusal kind = %q, want %q", refusal.Kind, KindInvalidStructure)
	}
	if refusal.Law != integralNumberLaw {
		t.Fatalf("refusal used a different law: %q", refusal.Law)
	}
	if !slices.Equal(refusal.Path, wantPath) {
		t.Fatalf("refusal path = %v, want %v", refusal.Path, wantPath)
	}
	if got, ok := refusal.Got.(float64); !ok || got != number {
		t.Fatalf("refusal got = %#v, want the submitted number %v", refusal.Got, number)
	}
}

// The brief's acceptance set: the four canonical vectors, in check.args.
func TestNonIntegralCheckArgsRefuseByName(t *testing.T) {
	for _, source := range canonicalNonIntegralProbes {
		t.Run(source, func(t *testing.T) {
			number := mustDecode(t, source).(float64)
			requireClosureRefusal(t,
				checkWithArgs(map[string]any{"min": number}),
				[]string{"check", "args", "min"}, number)
		})
	}
}

// The exact term the round-2 review minted lawfully, with its identity bytes and
// its flb.type.v0 digest. Two non-integral args; the refusal coordinate is the
// identity-ordered first one ("min" sorts before "tol"), never Go's map order.
func TestReviewCounterexampleTermIsDead(t *testing.T) {
	term := checkWithArgs(map[string]any{
		"min": mustDecode(t, "5e-324").(float64),
		"tol": mustDecode(t, "1e-7").(float64),
	})
	requireClosureRefusal(t, term, []string{"check", "args", "min"}, 5e-324)

	// Determinism of that coordinate is the point of the identity-ordered walk:
	// a randomized map iteration would make this flake at 1-in-2.
	for attempt := 0; attempt < 64; attempt++ {
		_, refusal := walkStructure(term, []string{})
		if refusal == nil || !slices.Equal(refusal.Path, []string{"check", "args", "min"}) {
			t.Fatalf("attempt %d: refusal coordinate moved: %+v", attempt, refusal)
		}
	}
}

// Nesting is the difference between a bound on a position and a bound on
// numbers: args is arbitrary JSON, so a patch at args' top level would still
// admit every one of these.
func TestNonIntegralCheckArgsRefuseAtEveryDepth(t *testing.T) {
	for _, probe := range []struct {
		name string
		args any
		path []string
	}{
		{"top-level", map[string]any{"min": 0.5}, []string{"check", "args", "min"}},
		{"nested-object", map[string]any{"deep": map[string]any{"a": 0.5}}, []string{"check", "args", "deep", "a"}},
		{"array-element", map[string]any{"deep": []any{1.0, 0.5}}, []string{"check", "args", "deep", "1"}},
		{
			"three-levels-down",
			map[string]any{"deep": map[string]any{"a": []any{map[string]any{"b": 0.5}}}},
			[]string{"check", "args", "deep", "a", "0", "b"},
		},
	} {
		t.Run(probe.name, func(t *testing.T) {
			requireClosureRefusal(t, checkWithArgs(probe.args), probe.path, 0.5)
		})
	}
}

// A check is a type node, so it appears wherever a type does. The guard is not
// enumerating these either — it runs over the term.
func TestNonIntegralCheckArgsRefuseUnderEveryEnclosingKind(t *testing.T) {
	inner := checkWithArgs(map[string]any{"min": 0.5})
	for _, probe := range []struct {
		name string
		term any
		path []string
	}{
		{"list", map[string]any{"k": "list", "of": inner}, []string{"of", "check", "args", "min"}},
		{
			"struct",
			map[string]any{"k": "struct", "fields": map[string]any{"id": inner}},
			[]string{"fields", "id", "check", "args", "min"},
		},
		{
			"union",
			map[string]any{"k": "union", "of": []any{map[string]any{"k": "null"}, inner}},
			[]string{"of", "1", "check", "args", "min"},
		},
		{
			"brand",
			map[string]any{"k": "brand", "name": "UserId", "of": inner},
			[]string{"of", "check", "args", "min"},
		},
	} {
		t.Run(probe.name, func(t *testing.T) {
			requireClosureRefusal(t, probe.term, probe.path, 0.5)
		})
	}
}

// The narrowing must not cost the admission path: integral args, at the same
// depths, still author.
func TestIntegralCheckArgsStayAdmitted(t *testing.T) {
	for _, probe := range []struct {
		name string
		args any
	}{
		{"empty", map[string]any{}},
		{"integral", map[string]any{"min": 1.0}},
		{"safe-integer-boundary", map[string]any{"min": 9007199254740991.0, "max": -9007199254740991.0}},
		{"exponent-notation", mustDecode(t, `{"min":1e2}`)},
		{"zero-and-negative-zero", mustDecode(t, `{"min":0,"max":-0}`)},
		{"non-numeric", map[string]any{"source": "^a$", "flags": "", "on": true, "off": nil}},
		{"nested-integral", map[string]any{"deep": map[string]any{"a": []any{1.0, 2.0}}}},
	} {
		t.Run(probe.name, func(t *testing.T) {
			if _, refusal := walkStructure(checkWithArgs(probe.args), []string{}); refusal != nil {
				t.Fatalf("integral args %+v refused: %+v", probe.args, refusal)
			}
		})
	}
}

// The partial walk is the authoring seam, and it shares the closure: a partial
// carrying a non-integral number cannot be filled toward a lawful term.
func TestNonIntegralCheckArgsRefuseThroughConciergeFill(t *testing.T) {
	for _, source := range canonicalNonIntegralProbes {
		t.Run(source, func(t *testing.T) {
			number := mustDecode(t, source).(float64)
			body, err := json.Marshal(map[string]any{
				"partial": map[string]any{"k": "hole"},
				"path":    []any{},
				"subtree": checkWithArgs(map[string]any{"min": number}),
			})
			if err != nil {
				t.Fatal(err)
			}
			reply := (&Daemon{}).serveFill(body)
			response, ok := reply.(refusalReply)
			if !ok {
				t.Fatalf("fill with args %s returned %T, want refusalReply", source, reply)
			}
			if response.Refusal.Law != integralNumberLaw {
				t.Fatalf("fill used a different law: %q", response.Refusal.Law)
			}
			if !slices.Equal(response.Refusal.Path, []string{"partial", "check", "args", "min"}) {
				t.Fatalf("fill refusal path = %v", response.Refusal.Path)
			}
		})
	}
}

// commitCertified is the one catalog-admission seam, and the walk is the first
// thing it does. This is the sentence four tracked files asserted before the
// cure and the review falsified: 5e-324 does not reach normalization, canonical
// bytes, or a digest.
func TestNonIntegralCheckArgsNeverReachIdentity(t *testing.T) {
	term := checkWithArgs(map[string]any{"min": mustDecode(t, "5e-324").(float64)})
	commit, refusal, err := (&catalog{}).commitCertified(t.Context(), term, "", "closure-law-test")
	if err != nil {
		t.Fatal(err)
	}
	if refusal == nil {
		t.Fatalf("the catalog admitted 5e-324 in check args and committed %+v", commit)
	}
	if refusal.Law != integralNumberLaw {
		t.Fatalf("catalog admission used a different law: %q", refusal.Law)
	}
	if !slices.Equal(refusal.Path, []string{"structure", "check", "args", "min"}) {
		t.Fatalf("catalog refusal path = %v", refusal.Path)
	}
}

// The closure is a property of WHERE the guard sits. This guard keeps it there:
// walk.go may call the bound from exactly one place — the number-decoding walk —
// so a future position cannot be "fixed" by pasting the predicate next to it,
// which is the shape that failed twice.
func TestIntegralityBoundHasOneCallSiteInTheWalker(t *testing.T) {
	source := readGuardedSource(t, "walk.go")
	calls := regexp.MustCompile(`isIntegralJSONNumber\(`).FindAllString(source, -1)
	declarations := regexp.MustCompile(`func isIntegralJSONNumber\(`).FindAllString(source, -1)
	if got := len(calls) - len(declarations); got != 1 {
		t.Errorf("walk.go calls the integrality bound %d times; the closure law has exactly one call site", got)
	}
	body := source[strings.Index(source, "func requireIntegralNumbers("):]
	if !strings.Contains(body[:strings.Index(body, "\n}\n")], "isIntegralJSONNumber(") {
		t.Error("the one call site is no longer the number-decoding walk")
	}
}

// A grammar site that carries the term-wide law must not restate it as a
// per-position sentence: one law, one string, everywhere it is taught.
func TestOneRefusalLawTeachesEveryNumberPosition(t *testing.T) {
	laws := map[string]bool{}
	terms := []any{
		map[string]any{"k": "literal", "value": 0.5},
		checkWithArgs(map[string]any{"min": 0.5}),
		map[string]any{"k": "list", "of": map[string]any{"k": "literal", "value": 0.5}},
	}
	for index, term := range terms {
		_, refusal := walkStructure(term, []string{})
		if refusal == nil {
			t.Fatalf("term %d was admitted", index)
		}
		laws[refusal.Law] = true
	}
	if len(laws) != 1 {
		t.Fatalf("the number bound is taught by %d different sentences: %v", len(laws), laws)
	}
	for law := range laws {
		if law != integralNumberLaw {
			t.Fatalf("unexpected law %q", law)
		}
	}
}

// Opaque is the sole exception, and it is a VALUE exception, not a term one:
// {"k":"opaque"} carries no number in the term, and the payload it admits later
// is uninterpreted canonical bytes (ruling 6).
func TestOpaqueRemainsTheSoleExceptionAndIsAValueNotATerm(t *testing.T) {
	if _, refusal := walkStructure(map[string]any{"k": "opaque"}, []string{}); refusal != nil {
		t.Fatalf("the opaque node refused: %+v", refusal)
	}
	daemon := &Daemon{}
	for _, payload := range []float64{21.5, 5e-324, 1e-7, 1e21} {
		if refusal := daemon.checkValue(map[string]any{"k": "opaque"}, payload, []string{"value"}); refusal != nil {
			t.Fatalf("opaque payload %v refused: %+v", payload, refusal)
		}
	}
	// And the exception does not leak back into terms: an opaque node inside a
	// term still cannot smuggle a number, because it has nowhere to put one.
	term := map[string]any{"k": "opaque", "payload": 0.5}
	if _, refusal := walkStructure(term, []string{}); refusal == nil {
		t.Fatal("an opaque node with a payload key was admitted")
	}
}

// Closure over the committed corpus: every structure in the frozen types
// fixture is admitted, and planting one non-integral number anywhere a number
// can go inside it turns each one into a refusal under the single law.
func TestCommittedTypeVectorsCarryNoNonIntegralNumber(t *testing.T) {
	var vectors []struct {
		Name      string `json:"name"`
		Structure any    `json:"structure"`
	}
	raw := readGuardedSource(t, fmt.Sprintf("..%c..%cwire%cfixtures%ctypes.json", '/', '/', '/', '/'))
	if err := json.Unmarshal([]byte(raw), &vectors); err != nil {
		t.Fatal(err)
	}
	if len(vectors) == 0 {
		t.Fatal("types.json carried no vectors")
	}
	for _, vector := range vectors {
		if _, refusal := walkStructure(vector.Structure, []string{}); refusal != nil {
			t.Errorf("committed vector %q refused: %+v", vector.Name, refusal)
		}
		if refusal := requireIntegralNumbers(vector.Structure, []string{}); refusal != nil {
			t.Errorf("committed vector %q carries a non-integral number: %+v", vector.Name, refusal)
		}
	}
}
