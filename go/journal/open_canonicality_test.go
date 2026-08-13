// Regression test for issue #2 (JR1): Open must verify the tail's
// byte-canonicality exactly as Read does. Lives beside the coordinator-owned
// fitness function (which is a fixed 1:1 law->test table) rather than inside it.
package journal_test

import (
	"errors"
	"testing"

	"foldlab/canonical"
	"foldlab/journal"
)

// JR1 (#2): Open must fail fast with ErrTampered on a tail Read would refuse,
// instead of silently adopting a head Read rejects. This is a canonicality
// fail-fast that makes Open agree with Read; it does NOT close the
// canonical-but-forged tail hole (see issue #2's disposition).
func TestOpenRefusesNonCanonicalTail(t *testing.T) {
	js := startJetStream(t)
	c := ctx(t)
	if _, err := journal.Open(c, js, "jr1"); err != nil {
		t.Fatalf("bootstrap open: %v", err)
	}
	// Inject a valid-JSON but non-canonical tail (spaced keys) straight onto the
	// subject, bypassing Append's canonical encoder.
	nonCanonical := []byte(`{"seq":0, "prev":"` + canonical.Genesis + `", "payload":"x"}`)
	if _, err := rawPublishBytes(t, js, "jr1", nonCanonical, "noncanon-tail", 0); err != nil {
		t.Fatalf("inject non-canonical tail: %v", err)
	}
	// Read has always refused this tail; Open must now refuse it identically.
	if _, err := journal.Open(c, js, "jr1"); !errors.Is(err, journal.ErrTampered) {
		t.Fatalf("reopen over non-canonical tail: err=%v, want ErrTampered", err)
	}
}
