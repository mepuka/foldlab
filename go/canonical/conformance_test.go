// COORDINATOR-OWNED — the P2a fitness function. Do not edit (see CLAUDE.md).
//
// OBLIGATION TABLE (law -> test, 1:1; docs/primitives/P2a-go-encoder.md):
//
//	GL1 idempotence on canonical input -> TestCanonicalizeIdempotent
//	GL2 whitespace normalization       -> TestCanonicalizeFromIndented
//	GL3 escape/format normalization    -> TestCanonicalizeFromGoRemarshal
//	GL4 digest agreement               -> TestDigests
//	GL5 entry-digest literal pin       -> TestEntryDigestLiteral
//	GL6 chain agreement                -> TestChains
//	GL7 fold consistency (runtime)     -> TestChainFoldConsistency
//	GL8 digest/encoder agreement       -> TestEntryDigestAgreesWithCanonicalize
package canonical_test

import (
	"bytes"
	"encoding/json"
	"fmt"
	"math/rand/v2"
	"os"
	"path/filepath"
	"strings"
	"testing"

	"foldlab/canonical"
)

type valueCase struct {
	Encoded string `json:"encoded"`
	Digest  string `json:"digest"`
}

type chainCase struct {
	Payloads     []string `json:"payloads"`
	EntryDigests []string `json:"entryDigests"`
	Head         string   `json:"head"`
	Length       int      `json:"length"`
}

type fixture struct {
	Values []valueCase `json:"values"`
	Chains []chainCase `json:"chains"`
}

func loadFixture(t *testing.T) fixture {
	t.Helper()
	path := filepath.Join("..", "..", "fixtures", "golden-conformance.json")
	raw, err := os.ReadFile(path)
	if err != nil {
		t.Fatalf("read fixture: %v", err)
	}
	var fx fixture
	if err := json.Unmarshal(raw, &fx); err != nil {
		t.Fatalf("parse fixture: %v", err)
	}
	if len(fx.Values) == 0 || len(fx.Chains) == 0 {
		t.Fatal("fixture is empty")
	}
	return fx
}

func TestCanonicalizeIdempotent(t *testing.T) {
	for i, vc := range loadFixture(t).Values {
		got, err := canonical.Canonicalize([]byte(vc.Encoded))
		if err != nil {
			t.Fatalf("case %d: Canonicalize(%q) error: %v", i, vc.Encoded, err)
		}
		if !bytes.Equal(got, []byte(vc.Encoded)) {
			t.Fatalf("case %d: idempotence: got %q want %q", i, got, vc.Encoded)
		}
	}
}

func TestCanonicalizeFromIndented(t *testing.T) {
	for i, vc := range loadFixture(t).Values {
		var indented bytes.Buffer
		if err := json.Indent(&indented, []byte(vc.Encoded), "", "   "); err != nil {
			t.Fatalf("case %d: indent: %v", i, err)
		}
		got, err := canonical.Canonicalize(indented.Bytes())
		if err != nil {
			t.Fatalf("case %d: Canonicalize(indented) error: %v", i, err)
		}
		if !bytes.Equal(got, []byte(vc.Encoded)) {
			t.Fatalf("case %d: whitespace normalization: got %q want %q", i, got, vc.Encoded)
		}
	}
}

func TestCanonicalizeFromGoRemarshal(t *testing.T) {
	// encoding/json's output differs from the canonical form wherever it
	// escapes what ES leaves raw (HTML metacharacters, U+2028/U+2029);
	// parsing its output and canonicalizing must recover the exact canonical
	// bytes (unescaping, number reformatting, key re-sorting).
	for i, vc := range loadFixture(t).Values {
		var value any
		if err := json.Unmarshal([]byte(vc.Encoded), &value); err != nil {
			t.Fatalf("case %d: unmarshal: %v", i, err)
		}
		remarshaled, err := json.Marshal(value)
		if err != nil {
			t.Fatalf("case %d: remarshal: %v", i, err)
		}
		got, err := canonical.Canonicalize(remarshaled)
		if err != nil {
			t.Fatalf("case %d: Canonicalize(remarshal) error: %v", i, err)
		}
		if !bytes.Equal(got, []byte(vc.Encoded)) {
			t.Fatalf("case %d: remarshal normalization: got %q want %q (via %q)", i, got, vc.Encoded, remarshaled)
		}
	}
}

func TestDigests(t *testing.T) {
	for i, vc := range loadFixture(t).Values {
		if got := canonical.DigestHex([]byte(vc.Encoded)); got != vc.Digest {
			t.Fatalf("case %d: digest: got %s want %s", i, got, vc.Digest)
		}
	}
}

func TestEntryDigestLiteral(t *testing.T) {
	if canonical.Genesis != "0000000000000000000000000000000000000000000000000000000000000000" {
		t.Fatalf("Genesis constant wrong: %s", canonical.Genesis)
	}
	got := canonical.EntryDigest(canonical.ChainEntry{Seq: 0, Prev: canonical.Genesis, Payload: "p"})
	const want = "d5a1b56d653004c5659c1aae4dc41470dfd2a3656f14f2966d2f01c4287340b4"
	if got != want {
		t.Fatalf("entry digest literal: got %s want %s", got, want)
	}
}

func TestChainFoldConsistency(t *testing.T) {
	// Runtime-derived payloads (random per run): defeats any lookup-table
	// implementation and pins BuildChain to EntryDigest's own fold.
	payloads := make([]string, 12)
	for i := range payloads {
		payloads[i] = fmt.Sprintf("p%d-%d-é <&>\U0001F680", i, rand.Int64())
	}
	digests, head := canonical.BuildChain(payloads)
	if len(digests) != len(payloads) {
		t.Fatalf("length: got %d want %d", len(digests), len(payloads))
	}
	prev := canonical.Genesis
	for i, p := range payloads {
		want := canonical.EntryDigest(canonical.ChainEntry{Seq: i, Prev: prev, Payload: p})
		if digests[i] != want {
			t.Fatalf("entry %d (payload %q): got %s want %s", i, p, digests[i], want)
		}
		prev = want
	}
	if head != prev {
		t.Fatalf("head: got %s want %s", head, prev)
	}
}

func TestEntryDigestAgreesWithCanonicalize(t *testing.T) {
	// Drags HTML metachars, U+2028, a tab, and a control char through BOTH
	// escape paths: EntryDigest's own encoding and Canonicalize's normalizer.
	// Key order in the raw JSON is deliberately non-canonical.
	e := canonical.ChainEntry{Seq: 7, Prev: strings.Repeat("ab", 32), Payload: "x\ty\u2028z<&>\u0001"}
	raw := []byte("{\"seq\":7,\"prev\":\"" + e.Prev + "\",\"payload\":\"x\\ty\u2028z<&>\\u0001\"}")
	c, err := canonical.Canonicalize(raw)
	if err != nil {
		t.Fatalf("canonicalize: %v", err)
	}
	got, want := canonical.EntryDigest(e), canonical.DigestHex(c)
	if got != want {
		t.Fatalf("EntryDigest %s != DigestHex(Canonicalize(entry)) %s (canonical %q)", got, want, c)
	}
}

func TestChains(t *testing.T) {
	for i, cc := range loadFixture(t).Chains {
		digests, head := canonical.BuildChain(cc.Payloads)
		if len(digests) != cc.Length {
			t.Fatalf("chain %d: length: got %d want %d", i, len(digests), cc.Length)
		}
		for j := range digests {
			if digests[j] != cc.EntryDigests[j] {
				t.Fatalf("chain %d entry %d: digest: got %s want %s", i, j, digests[j], cc.EntryDigests[j])
			}
		}
		if head != cc.Head {
			t.Fatalf("chain %d: head: got %s want %s", i, head, cc.Head)
		}
	}
}
