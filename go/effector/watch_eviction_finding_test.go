package effector_test

import (
	"context"
	"fmt"
	"os"
	"slices"
	"testing"
	"time"

	"github.com/nats-io/nats.go/jetstream"

	"foldlab/effector"
)

const watchEvictionFindingEnv = "FOLDLAB_WATCH_EVICTION_FINDING"

// TestFindingHistoryOneEvictsAnEstablishedWatchTransition pins GitHub issue
// #15 without choosing its unratified disposition. Pausing the already-created
// ordered consumer replaces the original load-dependent stall with one exact,
// deterministic stall. History is the only differing bucket field.
func TestFindingHistoryOneEvictsAnEstablishedWatchTransition(t *testing.T) {
	historyOne := observePausedClaimCommit(t, 1)
	historyTwo := observePausedClaimCommit(t, 2)

	if !slices.Equal(historyOne, []effector.State{effector.Committed}) {
		t.Fatalf("History:1 states = %v, want [committed] finding", historyOne)
	}
	if !slices.Equal(historyTwo, []effector.State{effector.Held, effector.Committed}) {
		t.Fatalf("History:2 control states = %v, want [held committed]", historyTwo)
	}
}

// TestFindingWL1RequiresBothClaimAndCommit is deliberately red when opted in:
// it states WL1 as currently written against the production History:1 shape.
// The normal gate skips it so an unratified repair cannot be smuggled in merely
// to make CI green; FINDING-WATCH-EVICTION-001.md carries the exact command.
func TestFindingWL1RequiresBothClaimAndCommit(t *testing.T) {
	if os.Getenv(watchEvictionFindingEnv) != "1" {
		t.Skipf("set %s=1 to reproduce the preserved red finding", watchEvictionFindingEnv)
	}

	got := observePausedClaimCommit(t, 1)
	want := []effector.State{effector.Held, effector.Committed}
	if !slices.Equal(got, want) {
		t.Fatalf("WL1 lost a transition with an established watcher: got %v, want %v", got, want)
	}
}

func observePausedClaimCommit(t *testing.T, history uint8) []effector.State {
	t.Helper()
	js := startJetStream(t)
	c := ctx(t)
	name := fmt.Sprintf("watch_eviction_h%d", history)
	bucket := "E_" + name
	if _, err := js.CreateKeyValue(c, jetstream.KeyValueConfig{
		Bucket:   bucket,
		History:  history,
		TTL:      0,
		MaxBytes: -1,
		Storage:  jetstream.FileStorage,
	}); err != nil {
		t.Fatalf("create History:%d bucket: %v", history, err)
	}
	var e *effector.Effector
	if history == 1 {
		e = mustOpen(t, js, name)
	} else {
		// Task 19 now correctly refuses History:2 in production. The issue #15
		// one-field control deliberately binds the same implementation to the
		// otherwise identical precreated bucket through a test-only seam.
		var bindErr error
		e, bindErr = effector.OpenHistoryFindingForTest(c, js, name)
		if bindErr != nil {
			t.Fatalf("bind History:%d finding control: %v", history, bindErr)
		}
	}

	watchCtx, cancelWatch := context.WithCancel(c)
	t.Cleanup(cancelWatch)
	feed, err := e.Watch(watchCtx)
	if err != nil {
		t.Fatalf("establish History:%d watch: %v", history, err)
	}

	stream, err := js.Stream(c, "KV_"+bucket)
	if err != nil {
		t.Fatalf("open History:%d backing stream: %v", history, err)
	}
	consumerNames := stream.ConsumerNames(c)
	var names []string
	for consumerName := range consumerNames.Name() {
		names = append(names, consumerName)
	}
	if err := consumerNames.Err(); err != nil {
		t.Fatalf("list History:%d watch consumers: %v", history, err)
	}
	if len(names) != 1 {
		t.Fatalf("History:%d watch created %d consumers, want 1", history, len(names))
	}
	pause, err := stream.PauseConsumer(c, names[0], time.Now().Add(250*time.Millisecond))
	if err != nil {
		t.Fatalf("pause established History:%d watch: %v", history, err)
	}
	if !pause.Paused {
		t.Fatalf("History:%d watch consumer was not paused: %+v", history, pause)
	}

	d := fmt.Sprintf("%064x", history)
	claim, err := e.Claim(c, d, "owner", time.Minute)
	if err != nil {
		t.Fatalf("History:%d claim: %v", history, err)
	}
	if _, err := e.Commit(c, claim, "result"); err != nil {
		t.Fatalf("History:%d commit: %v", history, err)
	}

	info, err := stream.Info(c)
	if err != nil {
		t.Fatalf("inspect History:%d stream: %v", history, err)
	}
	wantFirst := uint64(1)
	if history == 1 {
		wantFirst = 2
	}
	if info.State.Msgs != uint64(history) || info.State.FirstSeq != wantFirst || info.State.LastSeq != 2 {
		t.Fatalf(
			"History:%d retained msgs=%d first=%d last=%d, want msgs=%d first=%d last=2",
			history,
			info.State.Msgs,
			info.State.FirstSeq,
			info.State.LastSeq,
			history,
			wantFirst,
		)
	}
	states := make([]effector.State, 0, history)
	quiet := time.NewTimer(time.Second)
	defer quiet.Stop()
	for {
		select {
		case transition, ok := <-feed:
			if !ok {
				t.Fatalf("History:%d feed closed after states %v", history, states)
			}
			if transition.Initial {
				t.Fatalf("History:%d transition was catch-up, want established live watch: %+v", history, transition)
			}
			states = append(states, transition.State)
			if len(states) == int(history) {
				return states
			}
		case <-quiet.C:
			return states
		}
	}
}
