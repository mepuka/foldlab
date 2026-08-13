// BUG-BREAKER evidence (NOT coordinator-owned). These tests assert the
// CURRENT (buggy) behavior so the suite stays runnable; each documents the
// expected-correct behavior it violates. See ../../_bugs/WORKLOG.md.
package journal_test

import (
	"errors"
	"testing"

	"github.com/nats-io/nats.go"
	"github.com/nats-io/nats.go/jetstream"

	"foldlab/canonical"
	"foldlab/journal"
)

// CG1 — canonical.EntryDigest substitutes U+FFFD for invalid UTF-8 instead of
// refusing (unlike CanonicalizeValue), minting COLLIDING identities for
// distinct payloads outside the canonical domain.
func TestBUG_CG1_EntryDigestInvalidUTF8Collides(t *testing.T) {
	a := canonical.ChainEntry{Seq: 0, Prev: canonical.Genesis, Payload: string([]byte{0xff})}
	b := canonical.ChainEntry{Seq: 0, Prev: canonical.Genesis, Payload: string([]byte{0xfe})}
	da := canonical.EntryDigest(a)
	db := canonical.EntryDigest(b)
	t.Logf("EntryDigest(0xff)=%s", da)
	t.Logf("EntryDigest(0xfe)=%s", db)
	if da != db {
		t.Fatalf("expected collision (bug); got distinct digests")
	}
	t.Log("CONFIRMED: distinct invalid-UTF-8 payloads share one journal identity")

	// The refusal law DOES exist on the CanonicalizeValue path:
	if _, err := canonical.CanonicalizeValue(string([]byte{0xff})); err == nil {
		t.Fatal("CanonicalizeValue accepted invalid UTF-8 (law absent everywhere)")
	} else {
		t.Logf("CanonicalizeValue REFUSES the same bytes: %v", err)
	}
}

// CG1 (identity consequence) — EntryDigest IS the Nats-Msg-Id and the chain
// head. Two DISTINCT payloads sharing seq+prev but differing only in invalid
// UTF-8 bytes produce the SAME identity: the journal's content-identity is not
// injective on its Go string domain, so appendEntry's idempotency check
// (DigestHex(stored)==digest) would falsely report one as a Duplicate of the
// other. LATENT at the JSON network ingress (JSON launders UTF-8); reachable
// by any direct Go caller / the appendEntry path with a raw Go string.
func TestBUG_CG1_IdentityNotInjective(t *testing.T) {
	seqPrev := func(p []byte) canonical.ChainEntry {
		return canonical.ChainEntry{Seq: 7, Prev: canonical.Genesis, Payload: string(p)}
	}
	a := canonical.EntryDigest(seqPrev([]byte{0xff, 0x80}))
	b := canonical.EntryDigest(seqPrev([]byte{0xfe, 0x80}))
	t.Logf("EntryDigest(0xff80)=%s", a)
	t.Logf("EntryDigest(0xfe80)=%s", b)
	if a != b {
		t.Fatal("expected identity collision for distinct invalid payloads at one position")
	}
	t.Log("CONFIRMED: journal content-identity is not injective on distinct invalid-UTF-8 payloads")
}

// JR2 — a losing writer's cursor never resyncs after ErrConflict: a second
// Journal handle that loses the CAS stays wedged at its stale cursor and can
// never make progress via Append alone.
func TestBUG_JR2_LoserCursorWedged(t *testing.T) {
	js := startJetStream(t)
	c := ctx(t)
	j1, err := journal.Open(c, js, "jr2")
	if err != nil {
		t.Fatalf("open j1: %v", err)
	}
	j2, err := journal.Open(c, js, "jr2")
	if err != nil {
		t.Fatalf("open j2: %v", err)
	}
	if _, _, err := j1.Append(c, "a"); err != nil {
		t.Fatalf("j1 append: %v", err)
	}
	before := j2.Head()
	_, _, err = j2.Append(c, "b") // loses CAS at position 0
	if !errors.Is(err, journal.ErrConflict) {
		t.Fatalf("expected ErrConflict for the loser, got %v", err)
	}
	after := j2.Head()
	t.Logf("loser cursor before=%+v after-conflict=%+v", before, after)
	if after != before {
		t.Fatalf("cursor advanced after conflict (bug would be absent)")
	}
	// Still wedged: retrying Append conflicts again, forever, with no resync.
	_, _, err2 := j2.Append(c, "c")
	if !errors.Is(err2, journal.ErrConflict) {
		t.Fatalf("expected the loser to stay wedged, got %v", err2)
	}
	t.Log("CONFIRMED: loser cursor never resyncs after ErrConflict; Append cannot recover")
}

// JR1 — Open adopts the tail head WITHOUT the byte-digest canonicality check
// that Read enforces. A non-canonical tail is trusted by Open but refused by
// Read: the two disagree on whether the journal is valid.
func TestBUG_JR1_OpenTrustsNonCanonicalTail(t *testing.T) {
	js := startJetStream(t)
	c := ctx(t)
	// Create the stream via a normal Open so the shape gate is satisfied.
	if _, err := journal.Open(c, js, "jr1"); err != nil {
		t.Fatalf("bootstrap open: %v", err)
	}
	// Inject a NON-canonical wire message for seq 0 directly onto the subject,
	// bypassing Append (valid JSON, but keys in non-canonical order / spaced).
	nonCanonical := []byte(`{"seq":0, "prev":"` + canonical.Genesis + `", "payload":"x"}`)
	if _, err := js.Publish(c, "j.jr1", nonCanonical); err != nil {
		t.Fatalf("inject: %v", err)
	}
	// Open re-reads the tail and ADOPTS a head with no canonicality check.
	j, err := journal.Open(c, js, "jr1")
	if err != nil {
		t.Fatalf("open trusted the tail (expected, that's the bug): %v", err)
	}
	head := j.Head()
	t.Logf("Open adopted cursor=%+v from a non-canonical tail", head)

	// Read over the SAME message refuses it as tampered.
	_, _, rerr := j.Read(c, journal.Cursor{Seq: -1, Head: canonical.Genesis}, 0)
	if !errors.Is(rerr, journal.ErrTampered) {
		t.Fatalf("expected Read to refuse the non-canonical tail, got %v", rerr)
	}
	t.Logf("Read REFUSES the same tail: %v", rerr)
	t.Log("CONFIRMED: Open trusts a tail Read refuses — verify-on-read hole in Open")
}

var _ = nats.NewMsg
var _ = jetstream.ErrStreamNotFound
