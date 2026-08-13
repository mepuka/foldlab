package stream

import (
	"fmt"
	"math/rand"
	"testing"
	"testing/quick"
)

// ApplyMerge indexes each source one of two ways: a DENSE source (sequences
// running first, first+1, ... with no gap) is resolved by arithmetic against
// the slice, and any other source is resolved through a map built with a
// duplicate check. Only one of those two paths can refuse a duplicate
// coordinate, which is the whole reason to ask whether they can disagree.
//
// referenceSparseApplyMerge is the deciding oracle: the same function with the
// dense fast path removed, reporting the same typed errors with the same
// coordinates. Anything ApplyMerge does that this does not is a divergence
// between the paths. The existing property/fuzz comparison
// (referenceApplyMerge, property_test.go:46) only compares whether an error
// occurred, so it cannot see a disagreement about WHICH error or about the
// duplicate's reported indexes; this one can.
func referenceSparseApplyMerge(m MergeFact, sources map[string][]Event) ([]Event, error) {
	type indexedEvent struct {
		event Event
		index int
	}
	index := make(map[string]map[uint64]indexedEvent, len(sources))
	for name, events := range sources {
		bySeq := make(map[uint64]indexedEvent, len(events))
		for i, e := range events {
			if first, exists := bySeq[e.Seq]; exists {
				return nil, &MergeDuplicateSequence{
					Source:         name,
					Seq:            e.Seq,
					FirstIndex:     first.index,
					DuplicateIndex: i,
				}
			}
			bySeq[e.Seq] = indexedEvent{event: e, index: i}
		}
		index[name] = bySeq
	}
	out := make([]Event, 0, len(m.Picks))
	for i, p := range m.Picks {
		found, ok := index[p.Stream][p.Seq]
		if !ok {
			return nil, &MergeGap{Pick: p, Index: i}
		}
		out = append(out, found.event)
	}
	return out, nil
}

// A source's shape decides its path; the answer must not.
func sameMergeOutcome(gotEvents []Event, gotErr error, wantEvents []Event, wantErr error) error {
	switch want := wantErr.(type) {
	case nil:
		if gotErr != nil {
			return fmt.Errorf("dense path failed where the sparse path succeeded: %v", gotErr)
		}
		if !eventsEqual(gotEvents, wantEvents) {
			return fmt.Errorf("merged events differ: %#v vs %#v", gotEvents, wantEvents)
		}
	case *MergeDuplicateSequence:
		got, ok := gotErr.(*MergeDuplicateSequence)
		if !ok {
			return fmt.Errorf("duplicate coordinate returned %T (%v), want *MergeDuplicateSequence", gotErr, gotErr)
		}
		if *got != *want {
			return fmt.Errorf("duplicate refusal differs: %#v vs %#v", got, want)
		}
	case *MergeGap:
		got, ok := gotErr.(*MergeGap)
		if !ok {
			return fmt.Errorf("gap returned %T (%v), want *MergeGap", gotErr, gotErr)
		}
		if *got != *want {
			return fmt.Errorf("gap refusal differs: %#v vs %#v", got, want)
		}
	}
	return nil
}

// A source drawn to straddle the classification boundary: exactly dense, dense
// with one gap punched in it, or carrying a repeated coordinate at a chosen
// index. Only one source at a time, so the outcome cannot depend on which
// source Go's map hands over first — that ambiguity is a separate finding, and
// mixing the two would leave neither decided.
func straddlingSource(rng *rand.Rand, name string, shape uint8, dupAt uint8, gapAt uint8) []Event {
	n := 1 + rng.Intn(6)
	first := uint64(rng.Intn(4))
	events := make([]Event, 0, n+1)
	for i := range n {
		seq := first + uint64(i)
		// Punch a gap by shifting the tail, so the source leaves the dense path
		// while its coordinates stay distinct: a gap that collided with a later
		// coordinate would smuggle in a duplicate and confuse the two questions.
		if shape&1 == 1 && i >= int(gapAt)%n {
			seq += 3
		}
		events = append(events, ev(name, seq, fmt.Sprintf("k%d=v%d", i, i)))
	}
	if shape&2 == 2 {
		at := int(dupAt) % len(events)
		dup := events[at]
		dup.Payload = []byte("k=duplicate") // a repeated identity coordinate
		events = append(events, dup)
	}
	return events
}

// THE DECIDING TEST: does the dense fast path ever answer differently from the
// map path, on the same source?
//
// Verdict, from this test: no. A duplicate coordinate cannot survive the
// density check — dense means seq == first+i, and two distinct indexes cannot
// satisfy that with one seq — so a duplicated source always leaves the fast
// path and always meets the map that refuses it. Results, error kinds and
// reported coordinates agree on every input drawn here.
func TestApplyMergeDenseAndSparsePathsAgreeOnOneSource(t *testing.T) {
	property := func(seed int64, shape uint8, dupAt uint8, gapAt uint8) bool {
		rng := rand.New(rand.NewSource(seed))
		events := straddlingSource(rng, "s", shape, dupAt, gapAt)
		sources := map[string][]Event{"s": events}

		picks := make([]Pick, 0, len(events)+2)
		for _, e := range events {
			picks = append(picks, Pick{Stream: "s", Seq: e.Seq})
		}
		picks = append(picks, Pick{Stream: "s", Seq: 9999}) // a certain gap
		picks = append(picks, Pick{Stream: "absent", Seq: 0})
		rng.Shuffle(len(picks), func(i, j int) { picks[i], picks[j] = picks[j], picks[i] })
		fact := MergeFact{Picks: picks}

		gotEvents, gotErr := ApplyMerge(fact, sources)
		wantEvents, wantErr := referenceSparseApplyMerge(fact, sources)
		if err := sameMergeOutcome(gotEvents, gotErr, wantEvents, wantErr); err != nil {
			t.Log(err)
			return false
		}
		return true
	}
	if err := quick.Check(property, quickConfig(5)); err != nil {
		t.Fatal(err)
	}
}

// The same comparison with several sources, but with at most ONE of them
// duplicated, so exactly one refusal exists and the answer is well defined
// however the map is walked. Sources are mixed dense and sparse on purpose:
// this is the case where one source takes the fast path while its neighbour
// takes the map, and the two must still agree.
func TestApplyMergeMixedDenseAndSparseSourcesAgree(t *testing.T) {
	property := func(seed int64, shapes uint8, dupAt uint8, gapAt uint8, duplicated uint8) bool {
		rng := rand.New(rand.NewSource(seed))
		names := []string{"alpha", "beta", "gamma"}
		carrier := int(duplicated) % (len(names) + 1) // (len) means: none duplicated
		sources := map[string][]Event{}
		for i, name := range names {
			shape := (shapes >> uint(i)) & 1 // gap or no gap: dense or sparse
			if i == carrier {
				shape |= 2 // and this one, if any, repeats a coordinate
			}
			sources[name] = straddlingSource(rng, name, shape, dupAt, gapAt)
		}
		picks := make([]Pick, 0, 16)
		for _, name := range names {
			for _, e := range sources[name] {
				picks = append(picks, Pick{Stream: name, Seq: e.Seq})
			}
		}
		picks = append(picks, Pick{Stream: names[0], Seq: 9999})
		rng.Shuffle(len(picks), func(i, j int) { picks[i], picks[j] = picks[j], picks[i] })
		fact := MergeFact{Picks: picks}

		gotEvents, gotErr := ApplyMerge(fact, sources)
		wantEvents, wantErr := referenceSparseApplyMerge(fact, sources)
		if err := sameMergeOutcome(gotEvents, gotErr, wantEvents, wantErr); err != nil {
			t.Log(err)
			return false
		}
		return true
	}
	if err := quick.Check(property, quickConfig(6)); err != nil {
		t.Fatal(err)
	}
}

// The classification itself: a duplicate coordinate can never make a source
// dense, because dense means seq == first+i and two distinct indexes cannot
// share one seq under that equation. So the fast path is never the path that
// sees a duplicate, and every duplicate reaches the map that refuses it. This
// table walks the shapes a duplicate can take, including one that is dense
// right up to the repeat.
func TestApplyMergeRefusesEveryDuplicateWhateverTheSourceShape(t *testing.T) {
	cases := []struct {
		name           string
		events         []Event
		seq            uint64
		firstIndex     int
		duplicateIndex int
	}{
		{
			name:           "dense run then a repeat of its last coordinate",
			events:         []Event{ev("s", 0, "a=0"), ev("s", 1, "a=1"), ev("s", 1, "a=x")},
			seq:            1,
			firstIndex:     1,
			duplicateIndex: 2,
		},
		{
			name:           "a repeat in the very first position",
			events:         []Event{ev("s", 4, "a=0"), ev("s", 4, "a=x")},
			seq:            4,
			firstIndex:     0,
			duplicateIndex: 1,
		},
		{
			name:           "a repeat across an already sparse source",
			events:         []Event{ev("s", 7, "a=0"), ev("s", 3, "b=1"), ev("s", 7, "a=x")},
			seq:            7,
			firstIndex:     0,
			duplicateIndex: 2,
		},
		{
			name:           "a repeat that would restore density if it were skipped",
			events:         []Event{ev("s", 0, "a=0"), ev("s", 0, "a=x"), ev("s", 1, "b=1")},
			seq:            0,
			firstIndex:     0,
			duplicateIndex: 1,
		},
		{
			name:           "a long dense prefix with the repeat at the end",
			events:         []Event{ev("s", 5, "a=0"), ev("s", 6, "b=1"), ev("s", 7, "c=2"), ev("s", 5, "a=x")},
			seq:            5,
			firstIndex:     0,
			duplicateIndex: 3,
		},
	}
	for _, tc := range cases {
		t.Run(tc.name, func(t *testing.T) {
			for _, picks := range [][]Pick{nil, {{Stream: "s", Seq: tc.seq}}, {{Stream: "s", Seq: 4242}}} {
				merged, err := ApplyMerge(MergeFact{Picks: picks}, map[string][]Event{"s": tc.events})
				duplicate, ok := err.(*MergeDuplicateSequence)
				if !ok {
					t.Fatalf("picks %v: got %#v, %T %v; want *MergeDuplicateSequence", picks, merged, err, err)
				}
				if merged != nil {
					t.Fatalf("picks %v: refusal returned a partial merge %#v", picks, merged)
				}
				want := &MergeDuplicateSequence{
					Source:         "s",
					Seq:            tc.seq,
					FirstIndex:     tc.firstIndex,
					DuplicateIndex: tc.duplicateIndex,
				}
				if *duplicate != *want {
					t.Fatalf("picks %v: refusal = %#v; want %#v", picks, duplicate, want)
				}
			}
		})
	}
}

// A dense source is resolved by subtraction, so a pick below the source's first
// coordinate underflows uint64. The offset must still miss the slice — this is
// the arithmetic the fast path stands on.
func TestApplyMergeDensePathRefusesPicksBelowTheFirstCoordinate(t *testing.T) {
	source := []Event{ev("s", 10, "a=0"), ev("s", 11, "b=1"), ev("s", 12, "c=2")}
	for _, seq := range []uint64{0, 9, 13, maxSafeSequence} {
		fact := MergeFact{Picks: []Pick{{Stream: "s", Seq: seq}}}
		merged, err := ApplyMerge(fact, map[string][]Event{"s": source})
		if _, ok := err.(*MergeGap); !ok {
			t.Fatalf("seq %d: got %#v, %T %v; want *MergeGap", seq, merged, err, err)
		}
		want, wantErr := referenceSparseApplyMerge(fact, map[string][]Event{"s": source})
		if err := sameMergeOutcome(merged, err, want, wantErr); err != nil {
			t.Fatalf("seq %d: %v", seq, err)
		}
	}
}

// FINDING (pinned, not repaired). When TWO sources each carry a duplicate,
// WHICH refusal comes back is chosen by Go's randomized map iteration order.
// ApplyMerge's own doc-comment opens with "deterministic", and the TypeScript
// twin IS: it walks a ReadonlyMap in insertion order and always reports the
// first duplicated source. So the refusal VALUE — a typed error the lane treats
// as data, carrying source, seq and both indexes — is not a function of the
// input on the Go side, and the two implementations can disagree about it on
// the same input.
//
// The refusal is always sound: whichever source is named really does repeat the
// coordinate the error reports. What varies is only which of several true
// refusals is returned. Nothing here proposes a repair; the shape of one
// (iterate sources in sorted order, or in the order the picks first reach them)
// is a disposition for the operator.
//
// This test pins the behaviour the way fold.laws.test.ts pins its KNOWN GAP: it
// stays green and fails only if the behaviour changes, so a later fix is
// visible rather than silent.
func TestFindingApplyMergeMultiSourceRefusalOrderIsUnpinned(t *testing.T) {
	sources := map[string][]Event{
		"alpha": {ev("alpha", 1, "a=1"), ev("alpha", 1, "a=2")},
		"beta":  {ev("beta", 1, "b=1"), ev("beta", 1, "b=2")},
	}
	fact := MergeFact{Picks: []Pick{{Stream: "alpha", Seq: 1}}}
	seen := map[string]int{}
	const runs = 2000
	for range runs {
		_, err := ApplyMerge(fact, sources)
		duplicate, ok := err.(*MergeDuplicateSequence)
		if !ok {
			t.Fatalf("two duplicated sources returned %T %v; want *MergeDuplicateSequence", err, err)
		}
		// Whichever source is named, it really is duplicated at that coordinate.
		if duplicate.Seq != 1 || duplicate.FirstIndex != 0 || duplicate.DuplicateIndex != 1 {
			t.Fatalf("refusal names coordinates no source has: %#v", duplicate)
		}
		if _, exists := sources[duplicate.Source]; !exists {
			t.Fatalf("refusal named a source that does not exist: %q", duplicate.Source)
		}
		seen[duplicate.Source]++
	}
	t.Logf("FINDING: refusal source over %d identical calls: %v", runs, seen)
	if len(seen) < 2 {
		t.Fatalf(
			"the refusal named one source in all %d calls (%v) — the map order is now stable, "+
				"which means this finding was repaired or masked; re-read ApplyMerge",
			runs, seen,
		)
	}
}
