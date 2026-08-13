package catalogr4

import (
	"context"
	"testing"
)

func TestEveryCorruptedScheduleIsCaught(t *testing.T) {
	corpus, err := GenerateCorpus(DefaultCorpusConfig())
	if err != nil {
		t.Fatal(err)
	}
	report, err := RunCorruptedControls(context.Background(), corpus)
	if err != nil {
		t.Fatal(err)
	}
	if report.Caught != report.Schedules {
		t.Fatalf("caught %d of %d corrupted schedules", report.Caught, report.Schedules)
	}
}

func TestFindingMinimizesToFourActions(t *testing.T) {
	minimized, divergence, err := Minimize(
		context.Background(), StaleDistinctValueConflictSchedule(), ReplayOptions{})
	if err != nil {
		t.Fatal(err)
	}
	if divergence == nil {
		t.Fatal("expected the stale conflict to diverge")
	}
	if len(minimized) != 4 {
		t.Fatalf("minimized schedule has %d actions:\n%s", len(minimized), FormatSchedule(minimized))
	}
}
