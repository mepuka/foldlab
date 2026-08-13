package protod

import (
	"bytes"
	"fmt"
	"math/rand/v2"
	"sort"
	"testing"
)

func TestNormalizeIsSeparateFromThePositionPreservingWalk(t *testing.T) {
	term := map[string]any{
		"k": "union",
		"of": []any{
			map[string]any{"k": "string"},
			map[string]any{"k": "null"},
		},
	}
	before := mustCanonicalTest(t, term)
	if _, refusal := walkStructure(term, []string{"structure"}); refusal != nil {
		t.Fatalf("walk refused a grammar-valid term: %+v", refusal)
	}
	if after := mustCanonicalTest(t, term); after != before {
		t.Fatalf("the structure walk normalized in place: got %s want %s", after, before)
	}

	normalized, err := normalize(term)
	if err != nil {
		t.Fatalf("normalize: %v", err)
	}
	if got, want := mustCanonicalTest(t, normalized), `{"k":"union","of":[{"k":"null"},{"k":"string"}]}`; got != want {
		t.Fatalf("normalize did not sort the union: got %s want %s", got, want)
	}
	if after := mustCanonicalTest(t, term); after != before {
		t.Fatalf("normalize mutated its input: got %s want %s", after, before)
	}
}

func TestNormalizePropertiesOverGeneratedV0Terms(t *testing.T) {
	rng := rand.New(rand.NewPCG(0x36d20001, 0x36d20002))
	for index := 0; index < 512; index++ {
		term := generatedV0Term(rng, 4)
		if _, refusal := walkStructure(term, []string{"structure"}); refusal != nil {
			t.Fatalf("generator emitted an invalid term at case %d: %+v\nterm=%s", index, refusal, mustCanonicalTest(t, term))
		}

		normalized, err := normalize(term)
		if err != nil {
			t.Fatalf("totality failed at case %d: %v\nterm=%s", index, err, mustCanonicalTest(t, term))
		}
		twice, err := normalize(normalized)
		if err != nil {
			t.Fatalf("second normalization failed at case %d: %v", index, err)
		}
		if got, want := mustCanonicalTest(t, twice), mustCanonicalTest(t, normalized); got != want {
			t.Fatalf("idempotence failed at case %d:\n once=%s\ntwice=%s", index, want, got)
		}

		// There is one rewrite clause today: sort union members after
		// normalizing them. A top-down fair schedule applies the same clause
		// in the opposite order and iterates to a fixed point. Agreement is
		// the executable confluence check for every generated finite term.
		topDown, err := normalizeTopDownToFixedPoint(term)
		if err != nil {
			t.Fatalf("top-down schedule failed at case %d: %v", index, err)
		}
		if got, want := mustCanonicalTest(t, topDown), mustCanonicalTest(t, normalized); got != want {
			t.Fatalf("confluence failed at case %d:\n bottom-up=%s\n top-down=%s", index, want, got)
		}
	}
}

func TestNormalizeLawHarnessRejectsANonIdempotentControl(t *testing.T) {
	term := map[string]any{
		"k": "union",
		"of": []any{
			map[string]any{"k": "null"},
			map[string]any{"k": "string"},
		},
	}
	mutant := func(value any) (any, error) {
		cloned := cloneJSON(value)
		node := cloned.(map[string]any)
		members := node["of"].([]any)
		members[0], members[1] = members[1], members[0]
		return cloned, nil
	}
	if normalizeIsIdempotent(t, mutant, term) {
		t.Fatal("idempotence gate admitted the order-toggling normalize mutant")
	}
}

func normalizeIsIdempotent(
	t *testing.T,
	normalizer func(any) (any, error),
	term any,
) bool {
	t.Helper()
	once, err := normalizer(term)
	if err != nil {
		return false
	}
	twice, err := normalizer(once)
	if err != nil {
		return false
	}
	return mustCanonicalTest(t, once) == mustCanonicalTest(t, twice)
}

func generatedV0Term(rng *rand.Rand, depth int) any {
	leaves := []string{"string", "bool", "int", "float", "null", "opaque"}
	if depth == 0 {
		return map[string]any{"k": leaves[rng.IntN(len(leaves))]}
	}
	switch rng.IntN(10) {
	case 0:
		return map[string]any{"k": leaves[rng.IntN(len(leaves))]}
	case 1:
		values := []any{"x", float64(rng.IntN(17)), rng.IntN(2) == 0, nil}
		return map[string]any{"k": "literal", "value": values[rng.IntN(len(values))]}
	case 2:
		return map[string]any{"k": "list", "of": generatedV0Term(rng, depth-1)}
	case 3:
		return map[string]any{
			"k": "struct",
			"fields": map[string]any{
				"a": generatedV0Term(rng, depth-1),
				"z": generatedV0Term(rng, depth-1),
			},
			"optional": []any{"z"},
		}
	case 4, 5:
		// The distinct outer brands make the members unique even when the
		// generated children happen to be equal after normalization.
		left := map[string]any{"k": "brand", "name": "Left", "of": generatedV0Term(rng, depth-1)}
		right := map[string]any{"k": "brand", "name": "Right", "of": generatedV0Term(rng, depth-1)}
		members := []any{left, right}
		if rng.IntN(2) == 0 {
			members[0], members[1] = members[1], members[0]
		}
		return map[string]any{"k": "union", "of": members}
	case 6:
		return map[string]any{"k": "brand", "name": "Generated", "of": generatedV0Term(rng, depth-1)}
	case 7:
		return map[string]any{
			"k":    "check",
			"base": generatedV0Term(rng, depth-1),
			"check": map[string]any{
				"name": "bounded",
				"args": map[string]any{"max": float64(rng.IntN(32))},
			},
		}
	default:
		return map[string]any{"k": "ref", "digest": "0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef"}
	}
}

func mustCanonicalTest(t *testing.T, value any) string {
	t.Helper()
	encoded, err := canonicalBytes(value)
	if err != nil {
		t.Fatalf("canonicalize test value: %v", err)
	}
	return string(encoded)
}

func normalizeTopDownToFixedPoint(value any) (any, error) {
	current := cloneJSON(value)
	for pass := 0; pass < 64; pass++ {
		next, changed, err := applyNormalizeClauseTopDown(current)
		if err != nil {
			return nil, err
		}
		if !changed {
			return next, nil
		}
		current = next
	}
	return nil, fmt.Errorf("top-down normalize schedule did not reach a fixed point")
}

func applyNormalizeClauseTopDown(value any) (any, bool, error) {
	node, ok := value.(map[string]any)
	if !ok {
		return value, false, nil
	}
	cloned := make(map[string]any, len(node))
	for key, item := range node {
		cloned[key] = item
	}
	changed := false

	if cloned["k"] == "union" {
		members := append([]any(nil), cloned["of"].([]any)...)
		before, err := canonicalBytes(members)
		if err != nil {
			return nil, false, err
		}
		sort.Slice(members, func(i, j int) bool {
			left, _ := canonicalBytes(members[i])
			right, _ := canonicalBytes(members[j])
			return bytes.Compare(left, right) < 0
		})
		after, err := canonicalBytes(members)
		if err != nil {
			return nil, false, err
		}
		changed = !bytes.Equal(before, after)
		cloned["of"] = members
	}

	rewriteChild := func(key string) error {
		child, childChanged, err := applyNormalizeClauseTopDown(cloned[key])
		if err != nil {
			return err
		}
		cloned[key] = child
		changed = changed || childChanged
		return nil
	}
	switch cloned["k"] {
	case "list", "brand":
		if err := rewriteChild("of"); err != nil {
			return nil, false, err
		}
	case "check":
		if err := rewriteChild("base"); err != nil {
			return nil, false, err
		}
	case "struct":
		fields := cloned["fields"].(map[string]any)
		nextFields := make(map[string]any, len(fields))
		for name, field := range fields {
			next, fieldChanged, err := applyNormalizeClauseTopDown(field)
			if err != nil {
				return nil, false, err
			}
			nextFields[name] = next
			changed = changed || fieldChanged
		}
		cloned["fields"] = nextFields
	case "union":
		members := cloned["of"].([]any)
		for index, member := range members {
			next, memberChanged, err := applyNormalizeClauseTopDown(member)
			if err != nil {
				return nil, false, err
			}
			members[index] = next
			changed = changed || memberChanged
		}
	}
	return cloned, changed, nil
}
