package catalogr4

import (
	"context"
	"strings"
	"testing"
)

func TestComparatorCatchesCorruptedExpectedState(t *testing.T) {
	schedule := Schedule{{Kind: Publish, Daemon: 1, Value: 1}}
	result, err := Replay(context.Background(), schedule, ReplayOptions{
		Mutation: Mutation{Step: 0, Kind: MutateData},
	})
	if err != nil {
		t.Fatal(err)
	}
	if result.Divergence == nil {
		t.Fatal("a corrupted expected state passed lockstep")
	}
	if !strings.Contains(result.Divergence.Detail, "data journal") {
		t.Fatalf("wrong divergence: %s", result.Divergence.Detail)
	}
}

func TestAtomicWireCreateCannotReplayTheModeledStaleConflict(t *testing.T) {
	result, err := Replay(context.Background(), StaleDistinctValueConflictSchedule(), ReplayOptions{})
	if err != nil {
		t.Fatal(err)
	}
	if result.Divergence == nil {
		t.Fatal("the current atomic type.create unexpectedly reproduced a stale CAS conflict")
	}
	if result.Divergence.Step != 3 {
		t.Fatalf("divergence step = %d, want the fourth action: %s",
			result.Divergence.Step, result.Divergence.Detail)
	}
	if !strings.Contains(result.Divergence.Detail, "created:true") {
		t.Fatalf("finding lost the wire evidence: %s", result.Divergence.Detail)
	}
}

func TestWireReplayCoversEveryNonFindingWitness(t *testing.T) {
	witnesses := coverageWitnesses()
	for index, schedule := range witnesses {
		result, err := Replay(context.Background(), schedule, ReplayOptions{})
		if err != nil {
			t.Fatalf("witness %d: %v", index, err)
		}
		if result.Divergence != nil {
			t.Fatalf("witness %d diverged at %s: %s", index,
				result.Divergence.Action, result.Divergence.Detail)
		}
	}
}
