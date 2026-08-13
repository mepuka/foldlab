// Foldlab-owned (NOT part of the frozen P3 suite): laws for the register
// live plane. Watch is chatter — these laws pin what chatter may promise
// (revision order, faithful catch-up) and what it may not (authority).
//
//	WL1 delivered chatter is revision-ordered and points to recoverable truth
//	WL2 finite history may evict transitions; retained final state catches up
//	WL3 Initial and live chatter identify keys for authoritative Lookup
//	WL4 the feed ends with its context; the register remains authoritative
package effector_test

import (
	"context"
	"fmt"
	"testing"
	"time"

	"foldlab/effector"
)

func collectUntil(
	c context.Context,
	feed <-chan effector.Transition,
	done func(effector.Transition) bool,
) ([]effector.Transition, error) {
	var out []effector.Transition
	for {
		select {
		case transition, ok := <-feed:
			if !ok {
				if c.Err() != nil {
					return out, fmt.Errorf("context ended after %d transitions", len(out))
				}
				return out, fmt.Errorf("feed closed after %d transitions", len(out))
			}
			out = append(out, transition)
			if done(transition) {
				return out, nil
			}
		case <-c.Done():
			return out, fmt.Errorf("context ended after %d transitions", len(out))
		}
	}
}

func mustCollectUntil(
	t *testing.T,
	c context.Context,
	feed <-chan effector.Transition,
	done func(effector.Transition) bool,
) []effector.Transition {
	t.Helper()
	seen, err := collectUntil(c, feed, done)
	if err != nil {
		t.Fatal(err)
	}
	return seen
}

func TestWatchCollectorEndsWithContext(t *testing.T) {
	c, cancel := context.WithCancel(context.Background())
	cancel()
	_, err := collectUntil(c, make(chan effector.Transition), func(effector.Transition) bool { return false })
	if err == nil || err.Error() != "context ended after 0 transitions" {
		t.Fatalf("collector did not stop on its only clock: %v", err)
	}
}

// WL1: delivered chatter is revision-ordered and faithful. A later retained
// key wakes the consumer even if same-key eviction hid an intermediate target
// transition; Lookup recovers the target's final authority.
func TestWatchRecoversClaimThenCommit(t *testing.T) {
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

	wake := digest(0xa6)
	if _, err := e.Claim(c, wake, "recovery-signal", time.Minute); err != nil {
		t.Fatalf("recovery signal: %v", err)
	}
	seen := mustCollectUntil(t, c, feed, func(transition effector.Transition) bool {
		return transition.Digest == wake
	})
	for i, transition := range seen {
		if i > 0 && transition.Revision <= seen[i-1].Revision {
			t.Fatalf("revisions went backwards: %d then %d", seen[i-1].Revision, transition.Revision)
		}
		switch transition.Digest {
		case d:
			switch transition.State {
			case effector.Held:
				if transition.Claim == nil || transition.Claim.Digest != d ||
					transition.Claim.Fence != 1 || transition.Claim.Owner != "owner-1" {
					t.Fatalf("delivered target claim is not faithful: %+v", transition)
				}
			case effector.Committed:
				if transition.Outcome == nil || transition.Outcome.Digest != d ||
					transition.Outcome.Fence != 1 || transition.Outcome.Result != "the-result" {
					t.Fatalf("delivered target outcome is not faithful: %+v", transition)
				}
			default:
				t.Fatalf("delivered target state is invalid: %+v", transition)
			}
		case wake:
			if transition.State != effector.Held || transition.Claim == nil ||
				transition.Claim.Digest != wake || transition.Claim.Owner != "recovery-signal" {
				t.Fatalf("recovery signal is not faithful: %+v", transition)
			}
		default:
			t.Fatalf("watch delivered an unknown digest: %+v", transition)
		}
	}
	state, outcome, err := e.Lookup(c, d)
	if err != nil {
		t.Fatalf("authoritative recovery: %v", err)
	}
	if state != effector.Committed || outcome.Fence != 1 || outcome.Result != "the-result" {
		t.Fatalf("authoritative recovery is wrong: %v %+v", state, outcome)
	}
}

// WL2: History=1 causally evicts a same-key steal chain. The test pins that
// bounded chatter contract so exact-transition assertions cannot creep back;
// a late watcher catches up from the retained final register.
func TestWatchRecoversAfterStealChainEviction(t *testing.T) {
	js := startJetStream(t)
	e := mustOpen(t, js, "wl2")
	c := ctx(t)

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

	stream, err := js.Stream(c, "KV_E_wl2")
	if err != nil {
		t.Fatalf("backing stream: %v", err)
	}
	info, err := stream.Info(c)
	if err != nil {
		t.Fatalf("backing stream info: %v", err)
	}
	if info.State.Msgs != 1 || info.State.FirstSeq != 3 || info.State.LastSeq != 3 {
		t.Fatalf("History=1 did not evict the first two transitions: %+v", info.State)
	}

	feed, err := e.Watch(c)
	if err != nil {
		t.Fatalf("late watch: %v", err)
	}
	catchUp := mustCollectUntil(t, c, feed, func(transition effector.Transition) bool {
		return transition.Digest == d
	})
	retained := catchUp[len(catchUp)-1]
	if !retained.Initial || retained.State != effector.Committed || retained.Outcome == nil ||
		retained.Outcome.Digest != d ||
		retained.Outcome.Fence != 2 || retained.Outcome.Result != "stolen-result" {
		t.Fatalf("late watcher did not receive retained final state: %+v", retained)
	}
	state, outcome, err := e.Lookup(c, d)
	if err != nil {
		t.Fatalf("authoritative lookup: %v", err)
	}
	if state != effector.Committed || outcome.Fence != 2 || outcome.Result != "stolen-result" {
		t.Fatalf("authoritative final state is wrong: %v %+v", state, outcome)
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
	catchUpSeen := mustCollectUntil(t, c, feed, func(transition effector.Transition) bool {
		return transition.Digest == before
	})
	catchUp := catchUpSeen[len(catchUpSeen)-1]
	if !catchUp.Initial {
		t.Fatalf("catch-up transition must be Initial: %+v", catchUp)
	}
	if catchUp.State != effector.Committed || catchUp.Outcome == nil ||
		catchUp.Outcome.Result != "early-result" {
		t.Fatalf("catch-up is not a faithful retained value: %+v", catchUp)
	}
	state, outcome, err := e.Lookup(c, before)
	if err != nil {
		t.Fatalf("catch-up lookup: %v", err)
	}
	if state != effector.Committed || outcome.Result != "early-result" {
		t.Fatalf("catch-up key authority is wrong: %v %+v", state, outcome)
	}

	after := digest(0xa4)
	if _, err := e.Claim(c, after, "late", time.Minute); err != nil {
		t.Fatalf("live claim: %v", err)
	}
	liveSeen := mustCollectUntil(t, c, feed, func(transition effector.Transition) bool {
		return transition.Digest == after
	})
	live := liveSeen[len(liveSeen)-1]
	if live.Initial || live.Digest != after || live.State != effector.Held {
		t.Fatalf("live transition is wrong: %+v", live)
	}
	state, _, err = e.Lookup(c, after)
	if err != nil {
		t.Fatalf("live lookup: %v", err)
	}
	if state != effector.Held {
		t.Fatalf("live key authority is %v, want held", state)
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
	for {
		select {
		case _, ok := <-feed:
			if !ok {
				if c.Err() != nil {
					t.Fatal("context ended before feed closed after cancel")
				}
				goto closed
			}
		case <-c.Done():
			t.Fatal("context ended before feed closed after cancel")
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
