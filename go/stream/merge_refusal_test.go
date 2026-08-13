package stream

import (
	"encoding/json"
	"errors"
	"os"
	"reflect"
	"testing"
)

type mergeRefusalVector struct {
	Sources []struct {
		Source string `json:"source"`
		Events []struct {
			Seq     uint64 `json:"seq"`
			Payload string `json:"payload"`
		} `json:"events"`
	} `json:"sources"`
	Picks     []Pick                   `json:"picks"`
	Offenders []MergeDuplicateOffender `json:"offenders"`
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
	sources := make(map[string][]Event, len(vector.Sources))
	for _, source := range vector.Sources {
		events := make([]Event, len(source.Events))
		for i, event := range source.Events {
			events[i] = ev(source.Source, event.Seq, event.Payload)
		}
		sources[source.Source] = events
	}
	merged, err := ApplyMerge(MergeFact{Picks: vector.Picks}, sources)
	var duplicate *MergeDuplicateSequence
	if !errors.As(err, &duplicate) {
		t.Fatalf("duplicate source sequence returned %#v, %T %v; want *MergeDuplicateSequence", merged, err, err)
	}
	if merged != nil {
		t.Fatalf("duplicate refusal returned partial merge %#v", merged)
	}
	if !reflect.DeepEqual(duplicate.Offenders, vector.Offenders) {
		t.Fatalf("duplicate refusal = %#v; want %#v", duplicate.Offenders, vector.Offenders)
	}
	const wantMessage = "stream: source alpha repeats sequence 3 at event indexes 1 and 3"
	if got := duplicate.Error(); got != wantMessage {
		t.Fatalf("refusal message changed: %q; want %q", got, wantMessage)
	}
}
