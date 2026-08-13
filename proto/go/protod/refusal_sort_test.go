package protod

import (
	"encoding/json"
	"os"
	"reflect"
	"testing"
)

type refusalSortVector struct {
	Structural []string `json:"structural"`
	Absence    []string `json:"absence"`
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
	for sort, kinds := range map[RefusalSort][]string{
		RefusalStructural: vector.Structural,
		RefusalAbsence:    vector.Absence,
	} {
		for _, kind := range kinds {
			got, ok := RefusalSortOf(kind)
			if !ok || got != sort {
				t.Fatalf("RefusalSortOf(%q) = %q, %v; want %q", kind, got, ok, sort)
			}
		}
	}
	if got, want := len(refusalSortByKind), len(vector.Structural)+len(vector.Absence); got != want {
		t.Fatalf("classification has %d kinds, shared vector has %d", got, want)
	}
}

func TestRefusalSortDoesNotRideOnTheWire(t *testing.T) {
	raw, err := json.Marshal(Refusal{
		Kind:  KindMalformed,
		Law:   "test law",
		Next:  []NextHint{},
		Local: false,
	})
	if err != nil {
		t.Fatal(err)
	}
	var got map[string]any
	if err := json.Unmarshal(raw, &got); err != nil {
		t.Fatal(err)
	}
	want := map[string]any{
		"kind":  KindMalformed,
		"law":   "test law",
		"next":  []any{},
		"local": false,
	}
	if !reflect.DeepEqual(got, want) {
		t.Fatalf("wire refusal changed: got %#v, want %#v", got, want)
	}
	if _, present := got["sort"]; present {
		t.Fatal("server-side refusal sort leaked onto the wire")
	}
}
