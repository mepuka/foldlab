package protod

import (
	"encoding/json"
	"os"
	"testing"

	"foldlab/canonical"
)

type refusalSortVector struct {
	Grammar       string                 `json:"grammar"`
	GrammarDigest string                 `json:"grammarDigest"`
	SortByKind    map[string]RefusalSort `json:"sortByKind"`
}

func readRefusalSortVector(t *testing.T) refusalSortVector {
	t.Helper()
	raw, err := os.ReadFile("../../wire/refusal-sorts.json")
	if err != nil {
		t.Fatal(err)
	}
	var vector refusalSortVector
	if err := json.Unmarshal(raw, &vector); err != nil {
		t.Fatal(err)
	}
	return vector
}

func TestRefusalSortsMatchSharedVector(t *testing.T) {
	vector := readRefusalSortVector(t)
	for kind, sort := range vector.SortByKind {
		got, ok := RefusalSortOf(kind)
		if !ok || got != sort {
			t.Fatalf("RefusalSortOf(%q) = %q, %v; want %q", kind, got, ok, sort)
		}
	}
	if got, want := len(refusalSortByKind), len(vector.SortByKind); got != want {
		t.Fatalf("classification has %d kinds, shared vector has %d", got, want)
	}
}

func TestRefusalSortTableIsFrozenByGrammarDigest(t *testing.T) {
	vector := readRefusalSortVector(t)
	manifest := map[string]any{
		"grammar":    vector.Grammar,
		"sortByKind": vector.SortByKind,
	}
	raw, err := json.Marshal(manifest)
	if err != nil {
		t.Fatal(err)
	}
	canonicalBytes, err := canonical.Canonicalize(raw)
	if err != nil {
		t.Fatal(err)
	}
	if got := canonical.DigestHex(canonicalBytes); got != vector.GrammarDigest {
		t.Fatalf("sort grammar digest = %s, frozen vector says %s", got, vector.GrammarDigest)
	}
	if vector.Grammar != RefusalSortGrammar || vector.GrammarDigest != RefusalSortGrammarDigest {
		t.Fatalf("production grammar pin = (%q, %q), vector = (%q, %q)",
			RefusalSortGrammar, RefusalSortGrammarDigest, vector.Grammar, vector.GrammarDigest)
	}
}

func TestRefusalSortRidesOnTheWire(t *testing.T) {
	raw, err := json.Marshal(refuse(&Refusal{
		Kind:  KindMalformed,
		Law:   "test law",
		Next:  []NextHint{},
		Local: false,
	}))
	if err != nil {
		t.Fatal(err)
	}
	var got map[string]any
	if err := json.Unmarshal(raw, &got); err != nil {
		t.Fatal(err)
	}
	refusal, ok := got["refusal"].(map[string]any)
	if !ok {
		t.Fatalf("wire refusal is not an object: %#v", got)
	}
	if refusal["sort"] != string(RefusalStructural) {
		t.Fatalf("wire refusal sort = %#v, want %q", refusal["sort"], RefusalStructural)
	}
}
