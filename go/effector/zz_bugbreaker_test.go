// BUG-BREAKER evidence (NOT coordinator-owned). Adversarial schedules against
// the A6 register's fencing/terminal-uniqueness laws. See ../../_bugs/WORKLOG.md.
package effector_test

import (
	"errors"
	"testing"
	"time"

	"github.com/nats-io/nats.go/jetstream"

	"foldlab/effector"
)

// D1 — NOT A BUG (documents the substrate boundary). The theorem assumes "Done
// is never deleted or mutated". A KV bucket is inherently deletable and Open's
// shape gate cannot config-deny it (unlike the journal's append-only stream
// DenyDelete). Under ADMIN credentials a delete of a COMMITTED key resurrects
// Unclaimed and lets a DIFFERENT outcome commit at fence 1 — this is exactly
// the admin-success NEGATIVE CONTROL already proven in
// go/substrate/assumptions_test.go, where the same delete/purge is REFUSED to
// application credentials. The premise is discharged by credential scoping, not
// by config; this test only re-derives WHY that gate must exist (runs as admin).
func TestBUG_D1_DeletionBreaksTerminalUniqueness_AdminNegativeControl(t *testing.T) {
	js := startJetStream(t)
	e := mustOpen(t, js, "d1")
	d := digest(0x11)
	c := ctx(t)

	claim, err := e.Claim(c, d, "A", 30*time.Second)
	if err != nil {
		t.Fatalf("claim: %v", err)
	}
	if first, err := e.Commit(c, claim, "RESULT-ONE"); err != nil || !first {
		t.Fatalf("commit one: first=%v err=%v", first, err)
	}
	st, out, err := e.Lookup(c, d)
	if err != nil || st != effector.Committed || out.Result != "RESULT-ONE" {
		t.Fatalf("pre-delete lookup: st=%v out=%+v err=%v", st, out, err)
	}

	// The effector's OWN Open created this bucket. Nothing in its shape gate
	// prevents deletion of the committed authority key.
	kv, err := js.KeyValue(c, "E_d1")
	if err != nil {
		t.Fatalf("raw kv: %v", err)
	}
	if err := kv.Delete(c, "work."+d); err != nil {
		t.Fatalf("delete committed key: %v", err)
	}

	// Terminal outcome is GONE; a fresh claim resurrects the work at fence 1.
	st, _, err = e.Lookup(c, d)
	if err != nil {
		t.Fatalf("post-delete lookup: %v", err)
	}
	t.Logf("post-delete state = %v (was Committed)", st)
	reclaim, err := e.Claim(c, d, "B", 30*time.Second)
	if err != nil {
		t.Fatalf("resurrection claim: %v", err)
	}
	t.Logf("resurrection claim fence = %d (terminal work re-opened)", reclaim.Fence)
	if first, err := e.Commit(c, reclaim, "RESULT-TWO"); err != nil || !first {
		t.Fatalf("second distinct outcome should commit after resurrection: first=%v err=%v", first, err)
	}
	_, out2, _ := e.Lookup(c, d)
	if out2.Result != "RESULT-TWO" {
		t.Fatalf("expected resurrected outcome RESULT-TWO, got %q", out2.Result)
	}
	t.Logf("admin-only: committed outcome RESULT-ONE replaced by RESULT-TWO via kv.Delete")
	t.Log("This is the substrate NEGATIVE CONTROL; application credentials are refused delete/purge in go/substrate/assumptions_test.go. Not a leak in the register code.")
}

// D2 — SAFETY CERTIFICATION (expected: holds). A stolen claim cannot land a
// commit below the highest fence, even though Commit never checks expiry.
func TestBUG_D2_NoCommitBelowHighestFence(t *testing.T) {
	js := startJetStream(t)
	e := mustOpen(t, js, "d2")
	d := digest(0x22)
	c := ctx(t)

	a, err := e.Claim(c, d, "A", 1*time.Millisecond) // tiny lease
	if err != nil {
		t.Fatalf("A claim: %v", err)
	}
	time.Sleep(5 * time.Millisecond) // A's lease lapses, unsuperseded
	b, err := e.Claim(c, d, "B", 30*time.Second)
	if err != nil {
		t.Fatalf("B steal: %v", err)
	}
	if b.Fence <= a.Fence {
		t.Fatalf("fence not monotonic: a=%d b=%d", a.Fence, b.Fence)
	}
	// A now tries to commit under the SUPERSEDED fence.
	first, err := e.Commit(c, a, "A-RESULT")
	if !errors.Is(err, effector.ErrFenced) || first {
		t.Fatalf("SAFETY VIOLATION: superseded fence committed: first=%v err=%v", first, err)
	}
	// B commits at the highest fence.
	if first, err := e.Commit(c, b, "B-RESULT"); err != nil || !first {
		t.Fatalf("B commit at highest fence: first=%v err=%v", first, err)
	}
	t.Log("CERTIFIED: commit below the highest fence is refused (ErrFenced); fencing law upheld")
}

var _ = jetstream.KeyValuePut
