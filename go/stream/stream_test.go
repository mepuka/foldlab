package stream

import (
	"bytes"
	"errors"
	"sync"
	"testing"
)

func ev(s string, seq uint64, payload string) Event {
	return Event{Stream: s, Seq: seq, Payload: []byte(payload)}
}

// The shared corpus: two streams whose interleaving matters for key "a" and
// not for keys touched by exactly one stream.
func corpus() (alpha, beta []Event) {
	alpha = []Event{ev("alpha", 1, "a=1"), ev("alpha", 2, "b=2"), ev("alpha", 3, "a=3")}
	beta = []Event{ev("beta", 1, "c=4"), ev("beta", 2, "a=5")}
	return
}

// L1: the identity fold is deterministic and separates histories.
func TestChainDeterminismAndSeparation(t *testing.T) {
	alpha, _ := corpus()
	h1 := HeadFrom(StreamSeed("alpha"), alpha)
	h2 := HeadFrom(StreamSeed("alpha"), alpha)
	if h1 != h2 {
		t.Fatalf("same history, different heads")
	}
	// Any prefix, any reorder, any payload change separates.
	variants := [][]Event{
		alpha[:2],
		{alpha[0], alpha[2], alpha[1]},
		{alpha[0], alpha[1], ev("alpha", 3, "a=4")},
	}
	for i, v := range variants {
		if HeadFrom(StreamSeed("alpha"), v) == h1 {
			t.Fatalf("variant %d collides with the full history", i)
		}
	}
	if HeadFrom(StreamSeed("beta"), alpha) == h1 {
		t.Fatalf("stream identity is not part of the head")
	}
}

// L2: the chain remembers what the fold forgives. Swapping two adjacent
// CROSS-KEY picks changes the merged head (history identity) while the fold
// state digest is unchanged (meaning): commuting events need no committed
// order; the order is still a fact.
func TestCrossKeySwapForgivenByFoldRememberedByChain(t *testing.T) {
	alpha, beta := corpus()
	sources := map[string][]Event{"alpha": alpha, "beta": beta}
	base := MergeFact{Picks: []Pick{
		{"alpha", 1}, {"beta", 1}, {"alpha", 2}, {"beta", 2}, {"alpha", 3},
	}}
	// beta@1 is c=4, alpha@2 is b=2: distinct keys, adjacent picks swapped.
	swapped := MergeFact{Picks: []Pick{
		{"alpha", 1}, {"alpha", 2}, {"beta", 1}, {"beta", 2}, {"alpha", 3},
	}}
	for _, m := range []MergeFact{base, swapped} {
		if _, err := ApplyMerge(m, sources); err != nil {
			t.Fatal(err)
		}
	}
	a, _ := ApplyMerge(base, sources)
	b, _ := ApplyMerge(swapped, sources)
	ka, err := FoldKV(a)
	if err != nil {
		t.Fatal(err)
	}
	kb, err := FoldKV(b)
	if err != nil {
		t.Fatal(err)
	}
	if ka.StateDigest() != kb.StateDigest() {
		t.Fatalf("cross-key swap changed the fold state")
	}
	if HeadFrom(MergeSeed(), a) == HeadFrom(MergeSeed(), b) {
		t.Fatalf("cross-key swap did not change the merged head")
	}
	if FactDigest(base) == FactDigest(swapped) {
		t.Fatalf("distinct facts share a digest")
	}
}

// L3: same-key order is meaning. Swapping beta's a=5 across alpha's a=3
// changes the fold state: this is the class of events a merge MUST commit an
// order for.
func TestSameKeySwapChangesTheFold(t *testing.T) {
	alpha, beta := corpus()
	sources := map[string][]Event{"alpha": alpha, "beta": beta}
	base := MergeFact{Picks: []Pick{
		{"alpha", 1}, {"beta", 1}, {"alpha", 2}, {"beta", 2}, {"alpha", 3},
	}}
	swapped := MergeFact{Picks: []Pick{
		{"alpha", 1}, {"beta", 1}, {"alpha", 2}, {"alpha", 3}, {"beta", 2},
	}}
	a, _ := ApplyMerge(base, sources)
	b, _ := ApplyMerge(swapped, sources)
	ka, _ := FoldKV(a)
	kb, _ := FoldKV(b)
	if ka.StateDigest() == kb.StateDigest() {
		t.Fatalf("same-key swap should change the fold state (a=3 vs a=5 last)")
	}
}

// A pick with no source event is an explicit error, never a silent skip.
func TestMergeGapIsExplicit(t *testing.T) {
	alpha, beta := corpus()
	sources := map[string][]Event{"alpha": alpha, "beta": beta}
	_, err := ApplyMerge(MergeFact{Picks: []Pick{{"alpha", 9}}}, sources)
	var gap *MergeGap
	if !errors.As(err, &gap) {
		t.Fatalf("missing pick error = %T %v, want *MergeGap", err, err)
	}
	if gap.Index != 0 || gap.Pick != (Pick{"alpha", 9}) {
		t.Fatalf("gap = %#v", gap)
	}
}

// Sparse sources retain arbitrary ordering without changing pick lookup.
func TestMergeIndexesSparseSources(t *testing.T) {
	source := []Event{
		ev("alpha", 7, "a=first"),
		ev("alpha", 3, "b=middle"),
		ev("alpha", 11, "c=last"),
	}
	merged, err := ApplyMerge(MergeFact{Picks: []Pick{{"alpha", 3}, {"alpha", 7}, {"alpha", 11}}}, map[string][]Event{"alpha": source})
	if err != nil {
		t.Fatal(err)
	}
	if got := string(merged[0].Payload); got != "b=middle" {
		t.Fatalf("sparse position resolved to %q", got)
	}
	if got := string(merged[1].Payload); got != "a=first" {
		t.Fatalf("sparse position resolved to %q", got)
	}
	if got := string(merged[2].Payload); got != "c=last" {
		t.Fatalf("sparse position resolved to %q", got)
	}
}

// L4: compaction preserves both folds at EVERY boundary — the final state
// (meaning) and the final head recomputed across the boundary (identity).
func TestCompactionPreservesBothFolds(t *testing.T) {
	alpha, beta := corpus()
	sources := map[string][]Event{"alpha": alpha, "beta": beta}
	fact := MergeFact{Picks: []Pick{
		{"alpha", 1}, {"beta", 1}, {"alpha", 2}, {"beta", 2}, {"alpha", 3},
	}}
	merged, _ := ApplyMerge(fact, sources)
	fullHead := HeadFrom(MergeSeed(), merged)
	fullState, _ := FoldKV(merged)
	for k := 0; k <= len(merged); k++ {
		c, err := Compact(MergeSeed(), merged, k)
		if err != nil {
			t.Fatal(err)
		}
		if got := HeadFrom(c.Base, c.Tail); got != fullHead {
			t.Fatalf("k=%d: identity fold broken across the boundary", k)
		}
		state := c.State
		for _, e := range c.Tail {
			if err := state.Apply(e); err != nil {
				t.Fatal(err)
			}
		}
		if state.StateDigest() != fullState.StateDigest() {
			t.Fatalf("k=%d: state fold broken across the boundary", k)
		}
	}
}

// L5: a fork is two segments with one parent — shared prefix by structure,
// distinct heads by content, and replay from the store reconstructs each
// branch. An unknown head is an explicit gap.
func TestForkSharesPrefixAndSeparatesHeads(t *testing.T) {
	root := StreamSeed("session")
	st := Store{}
	trunk := st.Put(Segment{Parent: root, Events: []Event{
		ev("session", 1, "a=1"), ev("session", 2, "b=2"),
	}})
	childA := st.Put(Segment{Parent: trunk, Events: []Event{ev("session", 3, "a=9")}})
	childB := st.Put(Segment{Parent: trunk, Events: []Event{ev("session", 3, "b=7")}})
	if childA == childB {
		t.Fatalf("distinct branches share a head")
	}
	ra, err := st.Replay(childA, root)
	if err != nil {
		t.Fatal(err)
	}
	rb, err := st.Replay(childB, root)
	if err != nil {
		t.Fatal(err)
	}
	for i := 0; i < 2; i++ {
		if !bytes.Equal(EncodeEvent(ra[i]), EncodeEvent(rb[i])) {
			t.Fatalf("branches disagree on the shared prefix at %d", i)
		}
	}
	if HeadFrom(root, ra) != childA || HeadFrom(root, rb) != childB {
		t.Fatalf("replay does not reproduce the branch heads")
	}
	if _, err := st.Replay(Head{1}, root); err == nil {
		t.Fatalf("unknown head should be an explicit gap")
	}
}

// L6: compression is transport, never identity — a gzip round trip
// reproduces the canonical bytes exactly, and identity is computed on those.
func TestGzipRoundTripPreservesIdentity(t *testing.T) {
	alpha, _ := corpus()
	frame, err := GzipEvents(alpha)
	if err != nil {
		t.Fatal(err)
	}
	back, err := GunzipEvents(frame)
	if err != nil {
		t.Fatal(err)
	}
	if len(back) != len(alpha) {
		t.Fatalf("round trip changed event count")
	}
	for i := range alpha {
		if !bytes.Equal(EncodeEvent(alpha[i]), EncodeEvent(back[i])) {
			t.Fatalf("round trip changed canonical bytes at %d", i)
		}
	}
	if HeadFrom(StreamSeed("alpha"), back) != HeadFrom(StreamSeed("alpha"), alpha) {
		t.Fatalf("round trip changed the head")
	}
}

// Repeated and switching stream IDs decode through the same canonical frame.
func TestGzipRoundTripPreservesStreamSwitches(t *testing.T) {
	events := []Event{
		ev("alpha", 1, "a=1"),
		ev("alpha", 2, "b=2"),
		ev("beta", 1, "c=3"),
		ev("alpha", 3, "d=4"),
	}
	frame, err := GzipEvents(events)
	if err != nil {
		t.Fatal(err)
	}
	back, err := GunzipEvents(frame)
	if err != nil {
		t.Fatal(err)
	}
	for i := range events {
		if !bytes.Equal(EncodeEvent(events[i]), EncodeEvent(back[i])) {
			t.Fatalf("stream switch changed canonical bytes at %d", i)
		}
	}
}

// Pool reuse cannot share transport state across concurrent round trips.
func TestGzipConcurrentRoundTripsDoNotCrossTalk(t *testing.T) {
	events := []Event{
		ev("alpha", 1, "a=1"),
		ev("beta", 1, "b=2"),
		ev("alpha", 2, "c=3"),
	}
	want := HeadFrom(MergeSeed(), events)
	var workers sync.WaitGroup
	for range 8 {
		workers.Add(1)
		go func() {
			defer workers.Done()
			for range 50 {
				frame, err := GzipEvents(events)
				if err != nil {
					t.Errorf("gzip: %v", err)
					return
				}
				back, err := GunzipEvents(frame)
				if err != nil {
					t.Errorf("gunzip: %v", err)
					return
				}
				if got := HeadFrom(MergeSeed(), back); got != want {
					t.Errorf("concurrent round trip moved the head")
					return
				}
			}
		}()
	}
	workers.Wait()
}
