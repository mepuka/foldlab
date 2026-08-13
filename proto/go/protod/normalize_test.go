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

func TestNormalizeCostGrowsWithTheGrammarTree(t *testing.T) {
	// Forty alternating layers stay inside constrained decode's 256-container
	// domain while making any redundant fixed-point traversal visible.
	for _, depth := range []int{1, 8, 24, 40} {
		term := adversarialNormalizeTerm(depth)
		if _, refusal := walkStructure(term, []string{"structure"}); refusal != nil {
			t.Fatalf("depth %d: adversary left the grammar domain: %+v", depth, refusal)
		}
		normalized, withinBound, work, envelope, err := normalizeWithinCostEnvelope(term, normalizeWithWork)
		if err != nil {
			t.Fatalf("depth %d: normalize: %v", depth, err)
		}
		if !withinBound {
			t.Fatalf("depth %d: normalize work %+v exceeded independent envelope %+v", depth, work, envelope)
		}
		ordinary, err := normalize(term)
		if err != nil {
			t.Fatalf("depth %d: ordinary normalize: %v", depth, err)
		}
		if got, want := mustCanonicalTest(t, normalized), mustCanonicalTest(t, ordinary); got != want {
			t.Fatalf("depth %d: metered normalize changed identity\n got %s\nwant %s", depth, got, want)
		}
	}
}

func TestNormalizeCostCanaryRejectsIdentityPreservingExtraPass(t *testing.T) {
	term := adversarialNormalizeTerm(32)
	honest, honestWithinBound, _, _, err := normalizeWithinCostEnvelope(term, normalizeWithWork)
	if err != nil {
		t.Fatalf("honest normalize: %v", err)
	}
	if !honestWithinBound {
		t.Fatal("cost canary rejected honest single-pass normalize")
	}

	extraPassMutant := func(value any) (any, normalizeWork, error) {
		once, first, err := normalizeWithWork(value)
		if err != nil {
			return nil, normalizeWork{}, err
		}
		twice, second, err := normalizeWithWork(once)
		return twice, first.plus(second), err
	}
	mutated, mutantWithinBound, work, envelope, err := normalizeWithinCostEnvelope(term, extraPassMutant)
	if err != nil {
		t.Fatalf("extra-pass mutant: %v", err)
	}
	if got, want := mustCanonicalTest(t, mutated), mustCanonicalTest(t, honest); got != want {
		t.Fatalf("control changed identity instead of cost\n got %s\nwant %s", got, want)
	}
	if mutantWithinBound {
		t.Fatalf("cost canary admitted identity-preserving extra-pass mutant: work=%+v envelope=%+v", work, envelope)
	}
}

type normalizeCostEnvelope struct {
	nodeVisits     int
	unionSortKeys  int
	unionSortComps int
}

func normalizeWithinCostEnvelope(
	value any,
	normalizer func(any) (any, normalizeWork, error),
) (any, bool, normalizeWork, normalizeCostEnvelope, error) {
	nodes, unionMembers, comparisonBound := independentNormalizeCost(value)
	envelope := normalizeCostEnvelope{
		nodeVisits:     nodes,
		unionSortKeys:  unionMembers,
		unionSortComps: comparisonBound,
	}
	normalized, work, err := normalizer(value)
	if err != nil {
		return nil, false, work, envelope, err
	}
	withinBound := work.nodeVisits <= envelope.nodeVisits &&
		work.unionSortKeys <= envelope.unionSortKeys &&
		work.unionSortComps <= envelope.unionSortComps
	return normalized, withinBound, work, envelope, nil
}

// independentNormalizeCost walks only the input grammar shape. It neither
// calls normalize nor shares normalize's implementation, so its envelope
// cannot grow merely because the implementation repeats work. The adversary
// uses binary unions; insertion sorting needs at most one comparison for each.
func independentNormalizeCost(value any) (nodes, unionMembers, comparisonBound int) {
	node := value.(map[string]any)
	nodes = 1
	addChild := func(child any) {
		childNodes, childMembers, childComparisons := independentNormalizeCost(child)
		nodes += childNodes
		unionMembers += childMembers
		comparisonBound += childComparisons
	}
	switch node["k"] {
	case "list", "brand":
		addChild(node["of"])
	case "check":
		addChild(node["base"])
	case "struct":
		for _, field := range node["fields"].(map[string]any) {
			addChild(field)
		}
	case "union":
		members := node["of"].([]any)
		unionMembers += len(members)
		if len(members) > 1 {
			comparisonBound += len(members) - 1
		}
		for _, member := range members {
			addChild(member)
		}
	}
	return nodes, unionMembers, comparisonBound
}

func adversarialNormalizeTerm(depth int) any {
	term := any(map[string]any{"k": "string"})
	for level := 0; level < depth; level++ {
		term = map[string]any{
			"k": "struct",
			"fields": map[string]any{
				"nested": map[string]any{
					"k": "union",
					"of": []any{
						map[string]any{"k": "brand", "name": "Deep", "of": term},
						map[string]any{"k": "brand", "name": "Leaf", "of": map[string]any{"k": "null"}},
					},
				},
				"sibling": map[string]any{
					"k": "struct",
					"fields": map[string]any{
						"left":  map[string]any{"k": "bool"},
						"right": map[string]any{"k": "int"},
					},
				},
			},
		}
	}
	return term
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
