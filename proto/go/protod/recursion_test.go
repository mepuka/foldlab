package protod

import (
	"strings"
	"testing"
)

func TestWalkRefGraphRefusesRecursionAsTypedData(t *testing.T) {
	a := strings.Repeat("a", 64)
	b := strings.Repeat("b", 64)
	graph := map[string]any{
		a: map[string]any{"k": "list", "of": map[string]any{"k": "ref", "digest": b}},
		b: map[string]any{"k": "brand", "name": "Cycle", "of": map[string]any{"k": "ref", "digest": a}},
	}
	resolve := func(digest string) (any, bool) {
		structure, ok := graph[digest]
		return structure, ok
	}

	refusal := walkRefGraph(map[string]any{"k": "ref", "digest": a}, []string{"structure"}, resolve)
	if refusal == nil {
		t.Fatal("two-hop recursive ref graph was admitted")
	}
	if refusal.Kind != KindInvalidStructure {
		t.Fatalf("cycle refusal kind=%q, want %q", refusal.Kind, KindInvalidStructure)
	}
	if !strings.Contains(refusal.Law, "recursion is banned") {
		t.Fatalf("cycle refusal did not state the recursion law: %q", refusal.Law)
	}
	if len(refusal.Path) == 0 || refusal.Got == nil || refusal.Expected == nil || len(refusal.Next) == 0 {
		t.Fatalf("cycle refusal is not W7-shaped: %+v", refusal)
	}
}

func TestWalkRefGraphAcceptsAcyclicSharing(t *testing.T) {
	a := strings.Repeat("a", 64)
	b := strings.Repeat("b", 64)
	graph := map[string]any{
		a: map[string]any{
			"k": "struct",
			"fields": map[string]any{
				"left":  map[string]any{"k": "ref", "digest": b},
				"right": map[string]any{"k": "ref", "digest": b},
			},
			"optional": []any{},
		},
		b: map[string]any{"k": "string"},
	}
	resolve := func(digest string) (any, bool) {
		structure, ok := graph[digest]
		return structure, ok
	}
	if refusal := walkRefGraph(map[string]any{"k": "ref", "digest": a}, []string{"structure"}, resolve); refusal != nil {
		t.Fatalf("acyclic shared ref was refused: %+v", refusal)
	}
}
