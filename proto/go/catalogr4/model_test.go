package catalogr4

import (
	"reflect"
	"testing"
)

func TestCorpusIsDeterministicAndCoversEveryRatifiedBranch(t *testing.T) {
	first, err := GenerateCorpus(DefaultCorpusConfig())
	if err != nil {
		t.Fatal(err)
	}
	second, err := GenerateCorpus(DefaultCorpusConfig())
	if err != nil {
		t.Fatal(err)
	}
	if !reflect.DeepEqual(first, second) {
		t.Fatal("the same recorded seeds generated different schedules")
	}

	coverage := MeasureCoverage(first)
	if coverage.Schedules != 131 || coverage.Steps != 3_079 || coverage.DistinctStates != 1_077 {
		t.Fatalf("published wire corpus counts moved: schedules=%d steps=%d states=%d",
			coverage.Schedules, coverage.Steps, coverage.DistinctStates)
	}
	for _, name := range []string{
		"CreateAtomic",
		"MirrorAdvance",
		"Publish",
	} {
		if !coverage.Disjuncts[name] {
			t.Errorf("model action disjunct %s was untouched", name)
		}
	}
	for _, name := range []string{
		"CreateAtomic.created",
		"CreateAtomic.converged",
		"MirrorAdvance.advanced",
		"Publish.admitted",
		"Publish.refused",
	} {
		if !coverage.Branches[name] {
			t.Errorf("model action branch %s was untouched", name)
		}
	}
	for _, name := range []string{"CreateBegin", "CreateFinish", "CreateFinish.conflict"} {
		if coverage.Disjuncts[name] || coverage.Branches[name] {
			t.Errorf("split-only action or branch %s leaked into the wire corpus", name)
		}
	}
	if coverage.ReachableDenominator != R2ReachableStates {
		t.Fatalf("coverage denominator = %d, want the R2 closure %d",
			coverage.ReachableDenominator, R2ReachableStates)
	}
}

func TestCreateAtomicHasNoPendingCreatorState(t *testing.T) {
	state := InitialState()
	next, outcome, err := Step(state, Action{Kind: CreateAtomic, Creator: 1, Daemon: 1, Value: 1})
	if err != nil {
		t.Fatal(err)
	}
	if outcome.Branch != "CreateAtomic.created" {
		t.Fatalf("outcome = %s, want CreateAtomic.created", outcome.Branch)
	}
	for creator, pending := range next.Creators {
		if pending.Busy {
			t.Fatalf("creator %d remained pending after atomic create: %+v", creator+1, pending)
		}
	}
}

func TestStaleDistinctValueConflictIsMinimal(t *testing.T) {
	witness := StaleDistinctValueConflictSchedule()
	trace, err := Trace(witness)
	if err != nil {
		t.Fatal(err)
	}
	if got := trace[len(trace)-1].Outcome.Branch; got != "CreateFinish.conflict" {
		t.Fatalf("last outcome = %s, want the modeled CAS-conflict branch", got)
	}

	for index := range witness {
		candidate := append(Schedule(nil), witness[:index]...)
		candidate = append(candidate, witness[index+1:]...)
		candidateTrace, err := Trace(candidate)
		if err != nil {
			continue
		}
		for _, step := range candidateTrace {
			if step.Outcome.Branch == "CreateFinish.conflict" {
				t.Fatalf("removing step %d left a stale-conflict witness: %v", index, candidate)
			}
		}
	}
}
