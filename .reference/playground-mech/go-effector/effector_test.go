// COORDINATOR-OWNED — the P3 fitness function. Do not edit (see CLAUDE.md).
//
// OBLIGATION TABLE (law -> test, 1:1; docs/primitives/P3-effector.md):
//
//	EL0 pinned bucket shape         -> TestOpenPinsBucketShape, TestOpenRefusesWrongShape,
//	                                   TestOpenAcceptsConformantVariant
//	EL1 mutual exclusion            -> TestClaimIsExclusive
//	EL2 exactly-once commitment     -> TestConcurrentDoCommitsOnce
//	EL3 fencing (safety, not clock) -> TestStolenClaimCannotCommit,
//	                                   TestExpiredButUnsupersededClaimStillCommits
//	EL4 already terminal = success  -> TestCommittedWorkIsNotRerun
//	EL5 no permanent stranding      -> TestLapsedClaimIsRecoverable, TestFailedEffectCommitsNothing
//	EL6 the honest law              -> TestAdversarialCrashSchedule
//	EL7 commit idempotence          -> TestCommitIdempotence
//	EL8 state lives in the bucket   -> TestStateIsInTheBucketNotTheProcess
//	EL9 canonical wire values       -> TestWireValuesAreCanonical
//	EL10 foreign outcomes survive   -> TestCommitRefusesToOverwriteAForeignOutcome
package effector_test

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"sync"
	"testing"
	"time"

	"github.com/nats-io/nats-server/v2/server"
	"github.com/nats-io/nats.go"
	"github.com/nats-io/nats.go/jetstream"

	"playground/kernel/canonical"
	"playground/kernel/effector"
)

// ---------- embedded server harness (no ports: DontListen + InProcessServer) ----------

func startJetStream(t *testing.T) jetstream.JetStream {
	t.Helper()
	opts := &server.Options{
		ServerName: "p3-test",
		JetStream:  true,
		StoreDir:   t.TempDir(),
		DontListen: true,
		NoSigs:     true,
	}
	srv, err := server.NewServer(opts)
	if err != nil {
		t.Fatalf("new server: %v", err)
	}
	go srv.Start()
	if !srv.ReadyForConnections(10 * time.Second) {
		t.Fatal("embedded server not ready")
	}
	t.Cleanup(func() {
		srv.Shutdown()
		srv.WaitForShutdown()
	})
	nc, err := nats.Connect("", nats.InProcessServer(srv))
	if err != nil {
		t.Fatalf("connect: %v", err)
	}
	t.Cleanup(nc.Close)
	js, err := jetstream.New(nc)
	if err != nil {
		t.Fatalf("jetstream: %v", err)
	}
	return js
}

func ctx(t *testing.T) context.Context {
	t.Helper()
	c, cancel := context.WithTimeout(context.Background(), 30*time.Second)
	t.Cleanup(cancel)
	return c
}

// digests stand in for P1/P2b entry digests: 64 lowercase hex chars.
// Injective on seed (the first two nibbles carry it), so no two tests can
// silently share a digest.
func digest(seed byte) string {
	const hex = "0123456789abcdef"
	out := make([]byte, 64)
	out[0] = hex[seed>>4]
	out[1] = hex[seed&0xf]
	for i := 2; i < len(out); i++ {
		out[i] = hex[(int(seed)+i)%16]
	}
	return string(out)
}

func mustOpen(t *testing.T, js jetstream.JetStream, name string) *effector.Effector {
	t.Helper()
	e, err := effector.Open(ctx(t), js, name)
	if err != nil {
		t.Fatalf("open %s: %v", name, err)
	}
	return e
}

// ---------- EL0: shape ----------

func TestOpenPinsBucketShape(t *testing.T) {
	js := startJetStream(t)
	mustOpen(t, js, "shape")
	kv, err := js.KeyValue(ctx(t), "E_shape")
	if err != nil {
		t.Fatalf("bucket lookup: %v", err)
	}
	status, err := kv.Status(ctx(t))
	if err != nil {
		t.Fatalf("status: %v", err)
	}
	if status.TTL() != 0 {
		t.Fatalf("bucket TTL is %v; a committed outcome must never expire", status.TTL())
	}
	if status.History() < 1 {
		t.Fatalf("history is %d, want >= 1", status.History())
	}
	stream, err := js.Stream(ctx(t), "KV_E_shape")
	if err != nil {
		t.Fatalf("backing stream: %v", err)
	}
	if got := stream.CachedInfo().Config.Storage; got != jetstream.FileStorage {
		t.Fatalf("storage: %v, want file", got)
	}
}

func TestOpenRefusesWrongShape(t *testing.T) {
	js := startJetStream(t)
	cases := []struct {
		name string
		cfg  jetstream.KeyValueConfig
	}{
		{
			name: "ttl",
			cfg: jetstream.KeyValueConfig{
				Bucket:  "E_ttl",
				Storage: jetstream.FileStorage,
				// an expiring outcome key silently reopens committed work
				TTL: 2 * time.Second,
			},
		},
		{
			name: "memory",
			cfg: jetstream.KeyValueConfig{
				Bucket:  "E_memory",
				Storage: jetstream.MemoryStorage,
			},
		},
	}
	for _, tc := range cases {
		if _, err := js.CreateKeyValue(ctx(t), tc.cfg); err != nil {
			t.Fatalf("precreate %s: %v", tc.name, err)
		}
		if _, err := effector.Open(ctx(t), js, tc.name); !errors.Is(err, effector.ErrBadBucket) {
			t.Fatalf("open on nonconformant bucket %s: err=%v, want ErrBadBucket", tc.name, err)
		}
	}
}

func TestOpenAcceptsConformantVariant(t *testing.T) {
	js := startJetStream(t)
	if _, err := js.CreateKeyValue(ctx(t), jetstream.KeyValueConfig{
		Bucket:      "E_wide",
		Description: "pre-provisioned elsewhere",
		Storage:     jetstream.FileStorage,
		History:     5,
	}); err != nil {
		t.Fatalf("precreate conformant variant: %v", err)
	}
	e, err := effector.Open(ctx(t), js, "wide")
	if err != nil {
		t.Fatalf("open refused a conformant bucket: %v", err)
	}
	if _, err := e.Claim(ctx(t), digest(1), "w", time.Second); err != nil {
		t.Fatalf("claim on conformant bucket: %v", err)
	}
}

// ---------- EL8: the state lives in the bucket, not in the process ----------

func TestStateIsInTheBucketNotTheProcess(t *testing.T) {
	// Two independent bindings to ONE bucket. Every claim, steal, and
	// commitment must be visible across them: an in-process map is not an
	// exactly-once effector, it is a mutex.
	js := startJetStream(t)
	a := mustOpen(t, js, "shared")
	b := mustOpen(t, js, "shared")
	d := digest(11)

	claim, err := a.Claim(ctx(t), d, "A", 10*time.Second)
	if err != nil {
		t.Fatalf("claim via a: %v", err)
	}
	if _, err := b.Claim(ctx(t), d, "B", 10*time.Second); !errors.Is(err, effector.ErrHeld) {
		t.Fatalf("claim via b: err=%v, want ErrHeld (state must live in the bucket)", err)
	}
	state, _, err := b.Lookup(ctx(t), d)
	if err != nil {
		t.Fatalf("lookup via b: %v", err)
	}
	if state != effector.Held {
		t.Fatalf("b sees state %v, want held", state)
	}

	if first, err := a.Commit(ctx(t), claim, "shared-result"); err != nil || !first {
		t.Fatalf("commit via a: first=%v err=%v", first, err)
	}
	stateB, outcomeB, err := b.Lookup(ctx(t), d)
	if err != nil {
		t.Fatalf("lookup via b after commit: %v", err)
	}
	if stateB != effector.Committed || outcomeB.Result != "shared-result" || outcomeB.Fence != claim.Fence {
		t.Fatalf("b sees %v %+v, want the committed outcome at fence %d", stateB, outcomeB, claim.Fence)
	}
	if _, err := b.Claim(ctx(t), d, "B", time.Second); !errors.Is(err, effector.ErrCommitted) {
		t.Fatalf("claim via b after commit: err=%v, want ErrCommitted", err)
	}
	// a binding opened AFTER the commit sees it too
	c := mustOpen(t, js, "shared")
	stateC, outcomeC, err := c.Lookup(ctx(t), d)
	if err != nil {
		t.Fatalf("lookup via a late binding: %v", err)
	}
	if stateC != effector.Committed || outcomeC.Result != "shared-result" {
		t.Fatalf("late binding sees %v %+v, want the committed outcome", stateC, outcomeC)
	}
}

// ---------- EL9: the stored values are canonical encodings ----------

func TestWireValuesAreCanonical(t *testing.T) {
	js := startJetStream(t)
	e := mustOpen(t, js, "wire")
	d := digest(12)

	before := time.Now().UnixMilli()
	c, err := e.Claim(ctx(t), d, "A", 30*time.Second)
	if err != nil {
		t.Fatalf("claim: %v", err)
	}
	after := time.Now().UnixMilli()

	kv, err := js.KeyValue(ctx(t), "E_wire")
	if err != nil {
		t.Fatalf("bucket: %v", err)
	}
	// AMENDED (A6, ratified): ONE authority key per digest. The two-key
	// layout (claim.<d> / done.<d>) is REFUTED — fence validation and
	// outcome commitment must share a single linearization point, so both
	// states live at work.<d> and commit is a revision-CAS on that key.
	entry, err := kv.Get(ctx(t), "work."+d)
	if err != nil {
		t.Fatalf("get authority key (state must be stored at work.<digest>): %v", err)
	}
	if _, err := kv.Get(ctx(t), "claim."+d); err == nil {
		t.Fatal("legacy claim.<digest> key exists; the two-key layout is refuted")
	}
	if _, err := kv.Get(ctx(t), "done."+d); err == nil {
		t.Fatal("legacy done.<digest> key exists; the two-key layout is refuted")
	}
	claimBytes := entry.Value()
	canon, err := canonical.Canonicalize(claimBytes)
	if err != nil {
		t.Fatalf("claim value is not JSON: %v (%q)", err, claimBytes)
	}
	if string(canon) != string(claimBytes) {
		t.Fatalf("claim value is not canonical: %q, canonicalizes to %q", claimBytes, canon)
	}
	var fields map[string]any
	if err := json.Unmarshal(claimBytes, &fields); err != nil {
		t.Fatalf("claim value does not decode: %v", err)
	}
	if len(fields) != 4 {
		t.Fatalf("claim carries %d fields (%v), want exactly expiry/fence/owner/tag", len(fields), fields)
	}
	var claimValue struct {
		Expiry int64  `json:"expiry"`
		Fence  uint64 `json:"fence"`
		Owner  string `json:"owner"`
		Tag    string `json:"tag"`
	}
	if err := json.Unmarshal(claimBytes, &claimValue); err != nil {
		t.Fatalf("claim value shape: %v", err)
	}
	if claimValue.Tag != "claim" {
		t.Fatalf("claim tag %q, want \"claim\"", claimValue.Tag)
	}
	if claimValue.Fence != 1 {
		t.Fatalf("first fence is %d, want 1", claimValue.Fence)
	}
	if claimValue.Fence != c.Fence {
		t.Fatalf("stored fence %d != returned fence %d", claimValue.Fence, c.Fence)
	}
	if claimValue.Owner != "A" {
		t.Fatalf("stored owner %q, want A", claimValue.Owner)
	}
	if claimValue.Expiry < before+29_000 || claimValue.Expiry > after+30_000 {
		t.Fatalf("stored expiry %d is not ~30s ahead of [%d,%d]", claimValue.Expiry, before, after)
	}

	if first, err := e.Commit(ctx(t), c, "the-result"); err != nil || !first {
		t.Fatalf("commit: first=%v err=%v", first, err)
	}
	done, err := kv.Get(ctx(t), "work."+d)
	if err != nil {
		t.Fatalf("get authority key after commit: %v", err)
	}
	const wantOutcome = `{"fence":1,"result":"the-result","tag":"done"}`
	if string(done.Value()) != wantOutcome {
		t.Fatalf("outcome wire value %q, want %q", done.Value(), wantOutcome)
	}
}

// ---------- EL10: a foreign outcome is never displaced ----------

func TestCommitRefusesToOverwriteAForeignOutcome(t *testing.T) {
	js := startJetStream(t)
	e := mustOpen(t, js, "foreign")
	d := digest(13)

	c, err := e.Claim(ctx(t), d, "A", 30*time.Second)
	if err != nil {
		t.Fatalf("claim: %v", err)
	}
	// someone else commits out of band, under a fence of their own — on the
	// single authority key this is a revision-CAS over the live claim
	// (AMENDED A6: there is no separate outcome key to create)
	kv, err := js.KeyValue(ctx(t), "E_foreign")
	if err != nil {
		t.Fatalf("bucket: %v", err)
	}
	current, err := kv.Get(ctx(t), "work."+d)
	if err != nil {
		t.Fatalf("read authority key: %v", err)
	}
	if _, err := kv.Update(ctx(t), "work."+d,
		[]byte(`{"fence":99,"result":"someone-else","tag":"done"}`), current.Revision()); err != nil {
		t.Fatalf("out-of-band commit: %v", err)
	}

	// A's commit is bound to the revision of its own claim generation; the
	// foreign terminal state supersedes it. Per the A6 transition table a
	// Done at a different fence is ErrFenced (the claim was superseded);
	// what it must NEVER be is a success.
	first, err := e.Commit(ctx(t), c, "mine")
	if err == nil {
		t.Fatalf("Commit succeeded (first=%v) over a foreign terminal outcome", first)
	}
	if !errors.Is(err, effector.ErrFenced) {
		t.Fatalf("commit over a foreign-fence outcome: err=%v, want ErrFenced", err)
	}
	state, outcome, err := e.Lookup(ctx(t), d)
	if err != nil {
		t.Fatalf("lookup: %v", err)
	}
	if state != effector.Committed || outcome.Result != "someone-else" || outcome.Fence != 99 {
		t.Fatalf("the foreign outcome was displaced: %v %+v", state, outcome)
	}
	invoked := false
	if _, ran, err := e.Do(ctx(t), d, "B", time.Second, func(context.Context) (string, error) {
		invoked = true
		return "should-not-run", nil
	}); err != nil || ran {
		t.Fatalf("Do over committed work: ran=%v err=%v", ran, err)
	}
	if invoked {
		t.Fatal("Do invoked the effect over an already-committed digest")
	}
}

// ---------- EL1: mutual exclusion ----------

func TestClaimIsExclusive(t *testing.T) {
	js := startJetStream(t)
	e := mustOpen(t, js, "excl")
	d := digest(2)
	first, err := e.Claim(ctx(t), d, "A", 5*time.Second)
	if err != nil {
		t.Fatalf("first claim: %v", err)
	}
	if first.Fence == 0 || first.Owner != "A" || first.Digest != d {
		t.Fatalf("first claim malformed: %+v", first)
	}
	if _, err := e.Claim(ctx(t), d, "B", 5*time.Second); !errors.Is(err, effector.ErrHeld) {
		t.Fatalf("second claim: err=%v, want ErrHeld", err)
	}
	// a different digest is unaffected
	if _, err := e.Claim(ctx(t), digest(3), "B", 5*time.Second); err != nil {
		t.Fatalf("claim on a different digest: %v", err)
	}
	state, _, err := e.Lookup(ctx(t), d)
	if err != nil {
		t.Fatalf("lookup: %v", err)
	}
	if state != effector.Held {
		t.Fatalf("state: %v, want held", state)
	}
}

// ---------- EL2: exactly-once commitment under concurrency ----------

func TestConcurrentDoCommitsOnce(t *testing.T) {
	js := startJetStream(t)
	e := mustOpen(t, js, "race")
	d := digest(4)

	const workers = 8
	var invocations int64
	var mu sync.Mutex
	type report struct {
		outcome effector.Outcome
		ran     bool
		err     error
	}
	reports := make([]report, workers)
	var wg sync.WaitGroup
	start := make(chan struct{})
	for i := 0; i < workers; i++ {
		wg.Add(1)
		go func(i int) {
			defer wg.Done()
			<-start
			outcome, ran, err := e.Do(
				context.Background(), d, fmt.Sprintf("w%d", i), 5*time.Second,
				func(context.Context) (string, error) {
					mu.Lock()
					invocations++
					mu.Unlock()
					time.Sleep(30 * time.Millisecond)
					return "the-one-result", nil
				},
			)
			reports[i] = report{outcome, ran, err}
		}(i)
	}
	close(start)
	wg.Wait()

	ranCount := 0
	for i, r := range reports {
		switch {
		case r.err == nil && r.ran:
			ranCount++
		case r.err == nil && !r.ran:
			if r.outcome.Result != "the-one-result" {
				t.Fatalf("worker %d saw a different outcome: %+v", i, r.outcome)
			}
		case errors.Is(r.err, effector.ErrHeld):
			// legitimate: someone else held the claim
		default:
			t.Fatalf("worker %d: unexpected error %v", i, r.err)
		}
	}
	if ranCount != 1 {
		t.Fatalf("%d workers reported ran=true, want exactly 1", ranCount)
	}
	if invocations != 1 {
		t.Fatalf("effect ran %d times with no crashes, want 1", invocations)
	}
	state, outcome, err := e.Lookup(ctx(t), d)
	if err != nil {
		t.Fatalf("lookup: %v", err)
	}
	if state != effector.Committed || outcome.Result != "the-one-result" {
		t.Fatalf("final state %v outcome %+v", state, outcome)
	}
}

// ---------- EL3: fencing ----------

func TestStolenClaimCannotCommit(t *testing.T) {
	js := startJetStream(t)
	e := mustOpen(t, js, "fence")
	d := digest(5)

	stale, err := e.Claim(ctx(t), d, "A", 60*time.Millisecond)
	if err != nil {
		t.Fatalf("claim A: %v", err)
	}
	time.Sleep(150 * time.Millisecond) // A stalls; its lease lapses

	fresh, err := e.Claim(ctx(t), d, "B", 5*time.Second)
	if err != nil {
		t.Fatalf("steal by B: %v", err)
	}
	if fresh.Fence <= stale.Fence {
		t.Fatalf("stolen claim fence %d must exceed %d", fresh.Fence, stale.Fence)
	}

	// A wakes up and tries to commit under its superseded fence
	if _, err := e.Commit(ctx(t), stale, "a-result"); !errors.Is(err, effector.ErrFenced) {
		t.Fatalf("stale commit: err=%v, want ErrFenced", err)
	}
	state, _, err := e.Lookup(ctx(t), d)
	if err != nil {
		t.Fatalf("lookup after refused commit: %v", err)
	}
	if state == effector.Committed {
		t.Fatal("a fenced commit wrote an outcome")
	}

	first, err := e.Commit(ctx(t), fresh, "b-result")
	if err != nil || !first {
		t.Fatalf("B commit: first=%v err=%v", first, err)
	}
	// and A still cannot overwrite: the fence check precedes the outcome check
	if _, err := e.Commit(ctx(t), stale, "a-result"); !errors.Is(err, effector.ErrFenced) {
		t.Fatalf("stale commit after B: err=%v, want ErrFenced", err)
	}
	_, outcome, err := e.Lookup(ctx(t), d)
	if err != nil {
		t.Fatalf("lookup: %v", err)
	}
	if outcome.Result != "b-result" || outcome.Fence != fresh.Fence {
		t.Fatalf("outcome %+v, want b-result at fence %d", outcome, fresh.Fence)
	}
}

// ---------- EL4: already terminal = success ----------

func TestCommittedWorkIsNotRerun(t *testing.T) {
	js := startJetStream(t)
	e := mustOpen(t, js, "terminal")
	d := digest(6)

	invocations := 0
	effect := func(context.Context) (string, error) {
		invocations++
		return "done-once", nil
	}
	if _, ran, err := e.Do(ctx(t), d, "A", 5*time.Second, effect); err != nil || !ran {
		t.Fatalf("first Do: ran=%v err=%v", ran, err)
	}
	outcome, ran, err := e.Do(ctx(t), d, "B", 5*time.Second, effect)
	if err != nil {
		t.Fatalf("second Do: %v", err)
	}
	if ran {
		t.Fatal("second Do reported ran=true on committed work")
	}
	if invocations != 1 {
		t.Fatalf("effect invoked %d times, want 1", invocations)
	}
	if outcome.Result != "done-once" {
		t.Fatalf("outcome %+v, want done-once", outcome)
	}
	if _, err := e.Claim(ctx(t), d, "C", time.Second); !errors.Is(err, effector.ErrCommitted) {
		t.Fatalf("claim on committed work: err=%v, want ErrCommitted", err)
	}
}

// ---------- EL5: no permanent stranding ----------

func TestLapsedClaimIsRecoverable(t *testing.T) {
	js := startJetStream(t)
	e := mustOpen(t, js, "strand")
	d := digest(7)

	abandoned, err := e.Claim(ctx(t), d, "crasher", 60*time.Millisecond)
	if err != nil {
		t.Fatalf("claim: %v", err)
	}
	// the worker "crashes": it never commits
	time.Sleep(150 * time.Millisecond)

	state, _, err := e.Lookup(ctx(t), d)
	if err != nil {
		t.Fatalf("lookup: %v", err)
	}
	if state != effector.Unclaimed {
		t.Fatalf("state after lease lapse: %v, want open (claimable)", state)
	}
	recovered, err := e.Claim(ctx(t), d, "rescuer", 5*time.Second)
	if err != nil {
		t.Fatalf("recovery claim: %v", err)
	}
	if recovered.Fence <= abandoned.Fence {
		t.Fatalf("recovery fence %d must exceed %d", recovered.Fence, abandoned.Fence)
	}
	if first, err := e.Commit(ctx(t), recovered, "rescued"); err != nil || !first {
		t.Fatalf("recovery commit: first=%v err=%v", first, err)
	}
}

func TestExpiredButUnsupersededClaimStillCommits(t *testing.T) {
	// The lease is for LIVENESS ONLY. An effect that outlives its lease, with
	// nobody stealing the claim, MUST still be able to commit: Commit consults
	// the fence, never the clock. The opposite reading strands slow work
	// forever while its effect re-runs.
	js := startJetStream(t)
	e := mustOpen(t, js, "slow")
	d := digest(14)

	c, err := e.Claim(ctx(t), d, "slowpoke", 60*time.Millisecond)
	if err != nil {
		t.Fatalf("claim: %v", err)
	}
	time.Sleep(150 * time.Millisecond) // the effect outlived the lease; no steal

	first, err := e.Commit(ctx(t), c, "slow-result")
	if err != nil || !first {
		t.Fatalf("commit after an unsuperseded lapse: first=%v err=%v "+
			"(Commit must consult the fence, never the expiry)", first, err)
	}
	_, outcome, err := e.Lookup(ctx(t), d)
	if err != nil {
		t.Fatalf("lookup: %v", err)
	}
	if outcome.Result != "slow-result" {
		t.Fatalf("outcome %+v, want slow-result", outcome)
	}
}

func TestFailedEffectCommitsNothing(t *testing.T) {
	js := startJetStream(t)
	e := mustOpen(t, js, "effectfail")
	d := digest(8)

	boom := errors.New("effect exploded")
	_, ran, err := e.Do(ctx(t), d, "A", 60*time.Millisecond, func(context.Context) (string, error) {
		return "", boom
	})
	if !errors.Is(err, boom) {
		t.Fatalf("Do with a failing effect: err=%v, want the effect's error", err)
	}
	if ran {
		t.Fatal("Do reported ran=true for an effect that failed")
	}
	state, _, err := e.Lookup(ctx(t), d)
	if err != nil {
		t.Fatalf("lookup: %v", err)
	}
	if state == effector.Committed {
		t.Fatal("a failed effect committed an outcome")
	}
	// and the work is recoverable once the lease lapses
	time.Sleep(150 * time.Millisecond)
	if _, ran, err := e.Do(ctx(t), d, "B", 5*time.Second, func(context.Context) (string, error) {
		return "second-try", nil
	}); err != nil || !ran {
		t.Fatalf("retry after failure: ran=%v err=%v", ran, err)
	}
}

// ---------- EL6: the honest law, under an adversarial schedule ----------

func TestAdversarialCrashSchedule(t *testing.T) {
	js := startJetStream(t)
	e := mustOpen(t, js, "adversary")
	d := digest(9)

	const lease = 60 * time.Millisecond
	var mu sync.Mutex
	invocations := 0
	produced := map[string]bool{}

	// phase 0: claim then "crash" before running the effect
	// phase 1: claim, run the effect, then "crash" before committing
	// phase 2: the honest worker — claim, run, commit
	runPhase := func(worker string, phase int) error {
		c, err := e.Claim(context.Background(), d, worker, lease)
		if err != nil {
			return err
		}
		if phase == 0 {
			return nil // crashed after claiming
		}
		mu.Lock()
		invocations++
		result := fmt.Sprintf("result-by-%s", worker)
		produced[result] = true
		mu.Unlock()
		if phase == 1 {
			return nil // crashed after the effect, before the commit
		}
		if _, err := e.Commit(context.Background(), c, result); err != nil {
			return err
		}
		return nil
	}

	for i, phase := range []int{0, 1, 1, 2} {
		worker := fmt.Sprintf("w%d", i)
		if err := runPhase(worker, phase); err != nil &&
			!errors.Is(err, effector.ErrHeld) &&
			!errors.Is(err, effector.ErrFenced) &&
			!errors.Is(err, effector.ErrCommitted) {
			t.Fatalf("%s (phase %d): unexpected error %v", worker, phase, err)
		}
		time.Sleep(lease + 90*time.Millisecond) // let the lease lapse between workers
	}

	state, outcome, err := e.Lookup(ctx(t), d)
	if err != nil {
		t.Fatalf("lookup: %v", err)
	}
	if state != effector.Committed {
		t.Fatalf("state %v, want committed exactly once", state)
	}
	// exactly-once COMMITMENT
	if !produced[outcome.Result] {
		t.Fatalf("committed result %q was never produced by an invocation", outcome.Result)
	}
	if outcome.Fence == 0 {
		t.Fatalf("committed outcome carries no fence: %+v", outcome)
	}
	// at-least-once EXECUTION: the law does not promise 1, only >= 1, and
	// this schedule deliberately drives it above 1
	if invocations < 1 {
		t.Fatalf("effect never ran (%d invocations)", invocations)
	}
	if invocations == 1 {
		t.Fatalf("schedule failed to exercise duplicate execution (%d invocation)", invocations)
	}
	// a later worker cannot displace the commitment
	if _, err := e.Claim(ctx(t), d, "latecomer", time.Second); !errors.Is(err, effector.ErrCommitted) {
		t.Fatalf("post-commit claim: err=%v, want ErrCommitted", err)
	}
}

// ---------- EL7: commit idempotence ----------

func TestCommitIdempotence(t *testing.T) {
	js := startJetStream(t)
	e := mustOpen(t, js, "idem")
	d := digest(10)

	c, err := e.Claim(ctx(t), d, "A", 10*time.Second)
	if err != nil {
		t.Fatalf("claim: %v", err)
	}
	first, err := e.Commit(ctx(t), c, "the-result")
	if err != nil || !first {
		t.Fatalf("first commit: first=%v err=%v", first, err)
	}
	// the same (claim, result) again: absorbed, not an error
	again, err := e.Commit(ctx(t), c, "the-result")
	if err != nil {
		t.Fatalf("repeat commit: %v", err)
	}
	if again {
		t.Fatal("repeat commit reported first=true")
	}
	// a DIFFERENT result under the same live claim: refused
	if _, err := e.Commit(ctx(t), c, "other-result"); !errors.Is(err, effector.ErrCommitted) {
		t.Fatalf("conflicting commit: err=%v, want ErrCommitted", err)
	}
	state, outcome, err := e.Lookup(ctx(t), d)
	if err != nil {
		t.Fatalf("lookup: %v", err)
	}
	if state != effector.Committed || outcome.Result != "the-result" || outcome.Fence != c.Fence {
		t.Fatalf("outcome mutated: state=%v outcome=%+v", state, outcome)
	}
}
