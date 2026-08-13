package stream

import (
	"encoding/json"
	"errors"
	"os"
	"testing"
)

type mergeRefusalVector struct {
	Source string `json:"source"`
	Events []struct {
		Seq     uint64 `json:"seq"`
		Payload string `json:"payload"`
	} `json:"events"`
	Picks          []Pick `json:"picks"`
	DuplicateSeq   uint64 `json:"duplicateSeq"`
	FirstIndex     int    `json:"firstIndex"`
	DuplicateIndex int    `json:"duplicateIndex"`
}

func readMergeRefusalVector(t *testing.T) mergeRefusalVector {
	t.Helper()
	raw, err := os.ReadFile("testdata/m1-duplicate-seq.json")
	if err != nil {
		t.Fatal(err)
	}
	var vector mergeRefusalVector
	if err := json.Unmarshal(raw, &vector); err != nil {
		t.Fatal(err)
	}
	return vector
}

// M1: a source sequence is an identity coordinate, so two events cannot own
// the same coordinate. The shared frozen vector must be refused before any
// pick is resolved; last-write-wins would silently mint an ambiguous merge.
func TestApplyMergeRefusesSharedDuplicateSequenceVector(t *testing.T) {
	vector := readMergeRefusalVector(t)
	events := make([]Event, len(vector.Events))
	for i, event := range vector.Events {
		events[i] = ev(vector.Source, event.Seq, event.Payload)
	}
	merged, err := ApplyMerge(MergeFact{Picks: vector.Picks}, map[string][]Event{vector.Source: events})
	var duplicate *MergeDuplicateSequence
	if !errors.As(err, &duplicate) {
		t.Fatalf("duplicate source sequence returned %#v, %T %v; want *MergeDuplicateSequence", merged, err, err)
	}
	if merged != nil {
		t.Fatalf("duplicate refusal returned partial merge %#v", merged)
	}
	if duplicate.Source != vector.Source || duplicate.Seq != vector.DuplicateSeq ||
		duplicate.FirstIndex != vector.FirstIndex || duplicate.DuplicateIndex != vector.DuplicateIndex {
		t.Fatalf("duplicate refusal = %#v; want vector coordinates", duplicate)
	}
}
