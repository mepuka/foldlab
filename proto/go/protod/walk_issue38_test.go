package protod

import (
	"reflect"
	"testing"
)

var (
	issue38Astral      = string(rune(0x1d11e))
	issue38Replacement = string(rune(0xfffd))
)

func TestCheckUnknownKeyBlameIsUTF16FirstAndRepeatable(t *testing.T) {
	structure := map[string]any{
		"k":    "check",
		"base": map[string]any{"k": "string"},
		"check": map[string]any{
			"name":             "bounded",
			"args":             map[string]any{},
			issue38Astral:      true,
			issue38Replacement: true,
		},
	}
	want := []string{"structure", "check", issue38Astral}
	for attempt := 0; attempt < 512; attempt++ {
		_, refusal := walkStructure(structure, []string{"structure"})
		if refusal == nil {
			t.Fatal("walk admitted check metadata with unknown keys")
		}
		if !reflect.DeepEqual(refusal.Path, want) {
			t.Fatalf("attempt %d blamed %q, want UTF-16-first %q", attempt, refusal.Path, want)
		}
	}
}

func TestNodeUnknownKeyBlameAndGotListUseUTF16IdentityOrder(t *testing.T) {
	structure := map[string]any{
		"k":                "string",
		issue38Astral:      true,
		issue38Replacement: true,
	}
	_, refusal := walkStructure(structure, []string{"structure"})
	if refusal == nil {
		t.Fatal("walk admitted node with unknown keys")
	}
	if want := []string{"structure", issue38Astral}; !reflect.DeepEqual(refusal.Path, want) {
		t.Fatalf("path = %q, want %q", refusal.Path, want)
	}
	if want := []string{issue38Astral, issue38Replacement}; !reflect.DeepEqual(refusal.Got, want) {
		t.Fatalf("got list = %q, want UTF-16 order %q", refusal.Got, want)
	}
}

func TestRefusingWalkDoesNotNormalizeAnEarlierUnionInPlace(t *testing.T) {
	unionMembers := []any{
		map[string]any{"k": "string"},
		map[string]any{"k": "null"},
	}
	structure := map[string]any{
		"k": "struct",
		"fields": map[string]any{
			"a": map[string]any{"k": "union", "of": unionMembers},
			"z": map[string]any{"k": "not-a-kind"},
		},
	}
	before := mustCanonicalTest(t, structure)
	if _, refusal := walkStructure(structure, []string{"structure"}); refusal == nil {
		t.Fatal("walk admitted the invalid later sibling")
	}
	if after := mustCanonicalTest(t, structure); after != before {
		t.Fatalf("refusing walk mutated its caller: got %s want %s", after, before)
	}
}
