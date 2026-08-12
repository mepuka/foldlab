// Foldlab-owned (NOT part of the frozen P3 suite): laws for the register
// live plane. Watch is chatter — these laws pin what chatter may promise
// (revision order, faithful catch-up) and what it may not (authority).
//
//	WL1 transitions arrive in revision order with faithful payloads
//	WL2 a steal chain is visible fence by fence
//	WL3 a late watcher catches up via Initial entries
//	WL4 the feed ends with its context; the register remains authoritative
package effector_test

import (
	"context"
	"testing"
	"time"

	"foldlab/effector"
)

func collect(
	t *testing.T,
	feed <-chan effector.Transition,
	n int,
) []effector.Transition {
	t.Helper()
	out := make([]effector.Transition, 0, n)
	deadline := time.After(10 * time.Second)
	for len(out) < n {
		select {
		case transition, ok := <-feed:
			if !ok {
				t.Fatalf("feed closed after %d of %d transitions", len(out), n)
			}
			out = append(out, transition)
		case <-deadline:
			t.Fatalf("timed out after %d of %d transitions", len(out), n)
		}
	}
	return out
}

// WL1: claim then commit arrive as Held then Committed, at the same
// fence, with strictly increasing revisions and faithful payloads.
func TestWatchObservesClaimThenCommit(t *testing.T) {
	js := startJetStream(t)
	e := mustOpen(t, js, "wl1")
	c := ctx(t)

	feed, err := e.Watch(c)
	if err != nil {
		t.Fatalf("watch: %v", err)
	}

	d := digest(0xa1)
	claim, err := e.Claim(c, d, "owner-1", time.Minute)
	if err != nil {
		t.Fatalf("claim: %v", err)
	}
	if _, err := e.Commit(c, claim, "the-result"); err != nil {
		t.Fatalf("commit: %v", err)
	}

	seen := collect(t, feed, 2)
	held, committed := seen[0], seen[1]
	if held.State != effector.Held || held.Claim == nil {
		t.Fatalf("first transition is not a held claim: %+v", held)
	}
	if held.Claim.Fence != 1 || held.Claim.Owner != "owner-1" || held.Digest != d {
		t.Fatalf("claim payload is not faithful: %+v", held.Claim)
	}
	if committed.State != effector.Committed || committed.Outcome == nil {
		t.Fatalf("second transition is not a committed outcome: %+v", committed)
	}
	if committed.Outcome.Fence != 1 || committed.Outcome.Result != "the-result" {
		t.Fatalf("outcome payload is not faithful: %+v", committed.Outcome)
	}
	if committed.Revision <= held.Revision {
		t.Fatalf("revisions not increasing: %d then %d", held.Revision, committed.Revision)
	}
	if held.Initial || committed.Initial {
		t.Fatal("live transitions must not be marked Initial")
	}
}

// WL2: a lapsed claim stolen at fence 2 and committed there is visible
// as Held(1), Held(2), Committed(2) — the fence chain, in order.
func TestWatchObservesStealChain(t *testing.T) {
	js := startJetStream(t)
	e := mustOpen(t, js, "wl2")
	c := ctx(t)

	feed, err := e.Watch(c)
	if err != nil {
		t.Fatalf("watch: %v", err)
	}

	d := digest(0xa2)
	if _, err := e.Claim(c, d, "sleepy", 10*time.Millisecond); err != nil {
		t.Fatalf("first claim: %v", err)
	}
	time.Sleep(20 * time.Millisecond)
	stolen, err := e.Claim(c, d, "thief", time.Minute)
	if err != nil {
		t.Fatalf("steal: %v", err)
	}
	if _, err := e.Commit(c, stolen, "stolen-result"); err != nil {
		t.Fatalf("commit: %v", err)
	}

	seen := collect(t, feed, 3)
	fences := []uint64{0, 0, 0}
	for i, transition := range seen {
		if transition.Claim != nil {
			fences[i] = transition.Claim.Fence
		} else if transition.Outcome != nil {
			fences[i] = transition.Outcome.Fence
		}
	}
	if fences[0] != 1 || fences[1] != 2 || fences[2] != 2 {
		t.Fatalf("fence chain is %v, want [1 2 2]", fences)
	}
	if seen[0].State != effector.Held ||
		seen[1].State != effector.Held ||
		seen[2].State != effector.Committed {
		t.Fatalf("state chain is wrong: %+v", seen)
	}
}

// WL3: a watcher started after the fact catches up — the committed
// outcome arrives marked Initial, and live traffic follows unmarked.
func TestLateWatcherCatchesUp(t *testing.T) {
	js := startJetStream(t)
	e := mustOpen(t, js, "wl3")
	c := ctx(t)

	before := digest(0xa3)
	claim, err := e.Claim(c, before, "early", time.Minute)
	if err != nil {
		t.Fatalf("claim: %v", err)
	}
	if _, err := e.Commit(c, claim, "early-result"); err != nil {
		t.Fatalf("commit: %v", err)
	}

	feed, err := e.Watch(c)
	if err != nil {
		t.Fatalf("watch: %v", err)
	}
	catchUp := collect(t, feed, 1)[0]
	if !catchUp.Initial {
		t.Fatalf("catch-up transition must be Initial: %+v", catchUp)
	}
	if catchUp.State != effector.Committed || catchUp.Outcome == nil ||
		catchUp.Outcome.Result != "early-result" {
		t.Fatalf("catch-up is not the committed authority: %+v", catchUp)
	}

	after := digest(0xa4)
	if _, err := e.Claim(c, after, "late", time.Minute); err != nil {
		t.Fatalf("live claim: %v", err)
	}
	live := collect(t, feed, 1)[0]
	if live.Initial || live.Digest != after || live.State != effector.Held {
		t.Fatalf("live transition is wrong: %+v", live)
	}
}

// WL4: cancelling the watch context closes the feed, and the register —
// not the feed — remains the authority afterwards.
func TestWatchEndsWithContextRegisterRemains(t *testing.T) {
	js := startJetStream(t)
	e := mustOpen(t, js, "wl4")
	c := ctx(t)

	watchCtx, cancel := context.WithCancel(c)
	feed, err := e.Watch(watchCtx)
	if err != nil {
		t.Fatalf("watch: %v", err)
	}
	cancel()
	deadline := time.After(10 * time.Second)
	for {
		select {
		case _, ok := <-feed:
			if !ok {
				goto closed
			}
		case <-deadline:
			t.Fatal("feed did not close after cancel")
		}
	}
closed:

	d := digest(0xa5)
	claim, err := e.Claim(c, d, "owner", time.Minute)
	if err != nil {
		t.Fatalf("claim: %v", err)
	}
	if _, err := e.Commit(c, claim, "result"); err != nil {
		t.Fatalf("commit: %v", err)
	}
	state, outcome, err := e.Lookup(c, d)
	if err != nil {
		t.Fatalf("lookup: %v", err)
	}
	if state != effector.Committed || outcome.Result != "result" {
		t.Fatalf("register lost authority after watch ended: %v %+v", state, outcome)
	}
}
