// Regression test for issue #3 (CG1): the journal must refuse invalid-UTF-8
// payloads, matching CanonicalizeValue's domain, rather than laundering
// distinct invalid payloads into one U+FFFD-collapsed identity.
package journal_test

import (
	"testing"

	"foldlab/canonical"
	"foldlab/journal"
)

// CG1 (#3): a refused payload must not reach the stream, and both Append and
// AppendEntry (which share the identity-minting chokepoint) must refuse.
func TestAppendRefusesInvalidUTF8(t *testing.T) {
	js := startJetStream(t)
	c := ctx(t)
	j, err := journal.Open(c, js, "cg1")
	if err != nil {
		t.Fatalf("open: %v", err)
	}
	if _, _, err := j.Append(c, string([]byte{0xff})); err == nil {
		t.Fatal("Append accepted an invalid-UTF-8 payload")
	}
	bad := canonical.ChainEntry{Seq: 0, Prev: canonical.Genesis, Payload: string([]byte{0xfe})}
	if _, err := j.AppendEntry(c, bad); err == nil {
		t.Fatal("AppendEntry accepted an invalid-UTF-8 payload")
	}
	// Nothing landed: the stream is still empty.
	stream, err := js.Stream(c, "J_cg1")
	if err != nil {
		t.Fatalf("stream: %v", err)
	}
	info, err := stream.Info(c)
	if err != nil {
		t.Fatalf("info: %v", err)
	}
	if info.State.Msgs != 0 {
		t.Fatalf("refused invalid-UTF-8 payload reached the stream: %d msgs", info.State.Msgs)
	}
}
