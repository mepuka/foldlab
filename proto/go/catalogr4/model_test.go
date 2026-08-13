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
	if coverage.Schedules != 133 || coverage.Steps != 3_089 || coverage.DistinctStates != 1_326 {
		t.Fatalf("published corpus counts moved: schedules=%d steps=%d states=%d",
			coverage.Schedules, coverage.Steps, coverage.DistinctStates)
	}
	for _, name := range []string{
		"CreateBegin",
		"CreateFinish",
		"MirrorAdvance",
		"Publish",
	} {
		if !coverage.Disjuncts[name] {
			t.Errorf("model action disjunct %s was untouched", name)
		}
	}
	for _, name := range []string{
		"CreateBegin.pending",
		"CreateBegin.converged",
		"CreateFinish.appended",
		"CreateFinish.conflict",
		"MirrorAdvance.advanced",
		"Publish.admitted",
		"Publish.refused",
	} {
		if !coverage.Branches[name] {
			t.Errorf("model action branch %s was untouched", name)
		}
	}
	if coverage.ReachableDenominator != R2ReachableStates {
		t.Fatalf("coverage denominator = %d, want the R2 closure %d",
			coverage.ReachableDenominator, R2ReachableStates)
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
