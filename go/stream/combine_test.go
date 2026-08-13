package stream

import (
	"encoding/json"
	"os"
	"testing"
)

// The frozen wall corpus, rebuilt exactly as cmd/streamfix built it. Nothing
// here may regenerate a fixture: the digest is read, never written.
func wallCorpus(t *testing.T) ([]Event, string) {
	t.Helper()
	raw, err := os.ReadFile("../../fixtures/stream-wall.json")
	if err != nil {
		t.Fatal(err)
	}
	var wall map[string]any
	if err := json.Unmarshal(raw, &wall); err != nil {
		t.Fatal(err)
	}
	frozen, ok := wall["foldStateDigest"].(string)
	if !ok {
		t.Fatal("stream-wall.json has no foldStateDigest")
	}

	alpha := []Event{ev("alpha", 1, "a=1"), ev("alpha", 2, "b=2"), ev("alpha", 3, "a=3")}
	beta := []Event{ev("beta", 1, "c=4"), ev("beta", 2, "a=5")}
	fact := MergeFact{Picks: []Pick{
		{Stream: "alpha", Seq: 1}, {Stream: "beta", Seq: 1}, {Stream: "alpha", Seq: 2},
		{Stream: "beta", Seq: 2}, {Stream: "alpha", Seq: 3},
	}}
	merged, err := ApplyMerge(fact, map[string][]Event{"alpha": alpha, "beta": beta})
	if err != nil {
		t.Fatal(err)
	}
	return merged, frozen
}

func foldOrFail(t *testing.T, events []Event) *KV {
	t.Helper()
	state, err := FoldKV(events)
	if err != nil {
		t.Fatalf("FoldKV(%d events): %v", len(events), err)
	}
	return state
}

func combineOrFail(t *testing.T, left, right *KV) *KV {
	t.Helper()
	out, err := CombineKV(left, right)
	if err != nil {
		t.Fatalf("CombineKV: %v", err)
	}
	return out
}

// The parallel-replay license, proven against the wall rather than against a
// property: cut the frozen corpus anywhere, fold the halves independently,
// combine, and the frozen state digest must come back byte for byte.
func TestCombineKVRecombinesToTheFrozenWallDigest(t *testing.T) {
	merged, frozen := wallCorpus(t)
	if got := foldOrFail(t, merged).StateDigest().Hex(); got != frozen {
		t.Fatalf("uncut fold digest = %s; want frozen %s", got, frozen)
	}
	for split := 0; split <= len(merged); split++ {
		left := foldOrFail(t, merged[:split])
		right := foldOrFail(t, merged[split:])
		if got := combineOrFail(t, left, right).StateDigest().Hex(); got != frozen {
			t.Fatalf("split %d recombined to %s; want frozen %s", split, got, frozen)
		}
	}
}

// Associativity, over the same corpus and against the same frozen digest: three
// pieces, either grouping, one answer.
func TestCombineKVAssociatesAcrossEveryThreeWaySplit(t *testing.T) {
	merged, frozen := wallCorpus(t)
	for i := 0; i <= len(merged); i++ {
		for j := i; j <= len(merged); j++ {
			a := foldOrFail(t, merged[:i])
			b := foldOrFail(t, merged[i:j])
			c := foldOrFail(t, merged[j:])
			leftGrouped := combineOrFail(t, combineOrFail(t, a, b), c)
			rightGrouped := combineOrFail(t, a, combineOrFail(t, b, c))
			if leftGrouped.StateDigest() != rightGrouped.StateDigest() {
				t.Fatalf("grouping at (%d,%d) disagrees: %s vs %s",
					i, j, leftGrouped.StateDigest().Hex(), rightGrouped.StateDigest().Hex())
			}
			if got := leftGrouped.StateDigest().Hex(); got != frozen {
				t.Fatalf("three-way split (%d,%d) gave %s; want frozen %s", i, j, got, frozen)
			}
		}
	}
}

func TestCombineKVIdentityIsTheEmptyState(t *testing.T) {
	merged, _ := wallCorpus(t)
	state := foldOrFail(t, merged)
	want := state.StateDigest()
	if got := combineOrFail(t, NewKV(), state).StateDigest(); got != want {
		t.Fatalf("empty on the left moved the digest: %s", got.Hex())
	}
	if got := combineOrFail(t, state, NewKV()).StateDigest(); got != want {
		t.Fatalf("empty on the right moved the digest: %s", got.Hex())
	}
}

// The rights CombineKV does not confer, pinned so that "the KV lane has a
// combine" is never read as "the KV lane federates". Both failures are
// structural: order is the semantics, and the count is a sum.
func TestCombineKVIsNeitherCommutativeNorIdempotent(t *testing.T) {
	left := foldOrFail(t, []Event{ev("s", 1, "a=1")})
	right := foldOrFail(t, []Event{ev("s", 2, "a=2")})
	if combineOrFail(t, left, right).StateDigest() == combineOrFail(t, right, left).StateDigest() {
		t.Fatal("CombineKV commuted on a same-key pair; the LWW union must not")
	}
	if got := string(combineOrFail(t, left, right).m["a"].value); got != "2" {
		t.Fatalf("right did not win: a=%s", got)
	}
	if got := string(combineOrFail(t, right, left).m["a"].value); got != "1" {
		t.Fatalf("left did not win when handed last: a=%s", got)
	}

	// Disjoint keys DO commute — the classification the lane already draws.
	disjoint := foldOrFail(t, []Event{ev("s", 2, "b=2")})
	if combineOrFail(t, left, disjoint).StateDigest() != combineOrFail(t, disjoint, left).StateDigest() {
		t.Fatal("cross-key writes failed to commute")
	}

	doubled := combineOrFail(t, left, left)
	if doubled.count != 2 {
		t.Fatalf("self-combined count = %d; want 2 (the count is a sum)", doubled.count)
	}
	if doubled.StateDigest() == left.StateDigest() {
		t.Fatal("CombineKV absorbed a repeated state; the LWW union must not")
	}
}

func TestCombineKVRefusesACountPastU32(t *testing.T) {
	heavy := &KV{m: map[string]*kvEntry{"a": {value: []byte("1")}}, count: ^uint32(0)}
	one := foldOrFail(t, []Event{ev("s", 1, "b=2")})
	for _, pair := range [][2]*KV{{heavy, one}, {one, heavy}} {
		if _, err := CombineKV(pair[0], pair[1]); err == nil {
			t.Fatal("a summed count past u32 was admitted")
		} else if _, ok := err.(*KVCountOverflow); !ok {
			t.Fatalf("count overflow returned %T, want *KVCountOverflow", err)
		}
	}
	if out := combineOrFail(t, heavy, NewKV()); out.count != ^uint32(0) {
		t.Fatalf("the boundary count was rejected: %d", out.count)
	}
}

// The result owns its bytes: a later write through either input cannot reach a
// state already combined, the same ownership discipline Store.Put keeps.
func TestCombineKVResultOwnsItsValues(t *testing.T) {
	left := foldOrFail(t, []Event{ev("s", 1, "a=1")})
	right := foldOrFail(t, []Event{ev("s", 2, "b=2")})
	out := combineOrFail(t, left, right)
	before := out.StateDigest()
	left.m["a"].value[0] = 'X'
	right.m["b"].value[0] = 'Y'
	if out.StateDigest() != before {
		t.Fatal("mutating an input moved a combined state")
	}
}

// The cross-language claim: TypeScript's combineKV computes the same union.
// Neither side is the oracle — the frozen digest is, and both must reach it.
func TestCombineKVAgreesWithTheTypeScriptTwinThroughTheFrozenDigest(t *testing.T) {
	merged, frozen := wallCorpus(t)
	// packages/core/test/stream.combine.test.ts runs the identical split sweep
	// against the identical constant. This side records the constant it met.
	got := combineOrFail(t, foldOrFail(t, merged[:2]), foldOrFail(t, merged[2:])).StateDigest().Hex()
	if got != frozen {
		t.Fatalf("Go split-recombine digest %s != frozen %s", got, frozen)
	}
	if frozen != "bb947adc8d4623e9340ae0932ac1f7e65dbae211b991b11eaf24817dbe7dafe1" {
		t.Fatalf("the frozen fold state digest moved: %s", frozen)
	}
}
