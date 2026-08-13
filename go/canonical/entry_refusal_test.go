package canonical_test

import (
	"encoding/hex"
	"encoding/json"
	"errors"
	"os"
	"path/filepath"
	"testing"

	"foldlab/canonical"
)

type cg1Vector struct {
	GoInvalidUTF8Hex []string `json:"goInvalidUtf8Hex"`
	InvalidSequence  []int    `json:"invalidSequence"`
	ValidSequence    []int    `json:"validSequenceBoundary"`
}

func readCG1Vector(t *testing.T) cg1Vector {
	t.Helper()
	raw, err := os.ReadFile(filepath.Join("probes", "cg1-vector.json"))
	if err != nil {
		t.Fatalf("read shared refusal vector: %v", err)
	}
	var vector cg1Vector
	if err := json.Unmarshal(raw, &vector); err != nil {
		t.Fatalf("decode shared refusal vector: %v", err)
	}
	return vector
}

func TestEntryDigestRefusesInvalidUTF8(t *testing.T) {
	vector := readCG1Vector(t)
	for _, encoded := range vector.GoInvalidUTF8Hex {
		payload := decodeHex(t, encoded)
		_, err := canonical.EntryDigest(canonical.ChainEntry{
			Seq:     0,
			Prev:    canonical.Genesis,
			Payload: string(payload),
		})
		var invalid *canonical.InvalidUTF8Error
		if !errors.As(err, &invalid) || invalid.Field != "payload" {
			t.Fatalf("EntryDigest payload %s: err=%v, want payload InvalidUTF8Error", encoded, err)
		}
	}

	_, err := canonical.EntryDigest(canonical.ChainEntry{Seq: 0, Prev: string([]byte{0xff})})
	var invalid *canonical.InvalidUTF8Error
	if !errors.As(err, &invalid) || invalid.Field != "prev" {
		t.Fatalf("EntryDigest invalid prev: err=%v, want prev InvalidUTF8Error", err)
	}
}

func TestEntryDigestRefusesSharedInvalidSequenceVector(t *testing.T) {
	vector := readCG1Vector(t)
	for _, seq := range vector.InvalidSequence {
		digest, err := canonical.EntryDigest(canonical.ChainEntry{
			Seq:     seq,
			Prev:    canonical.Genesis,
			Payload: "valid",
		})
		var invalid *canonical.InvalidSequenceError
		if !errors.As(err, &invalid) || invalid.Seq != seq {
			t.Fatalf("EntryDigest seq %d returned digest=%q err=%v, want typed InvalidSequenceError", seq, digest, err)
		}
	}
	for _, seq := range vector.ValidSequence {
		if _, err := canonical.EntryDigest(canonical.ChainEntry{
			Seq:     seq,
			Prev:    canonical.Genesis,
			Payload: "valid",
		}); err != nil {
			t.Fatalf("EntryDigest valid boundary seq %d: %v", seq, err)
		}
	}
}

func TestBuildChainPropagatesInvalidUTF8Refusal(t *testing.T) {
	digests, head, err := canonical.BuildChain([]string{"valid", string([]byte{0xff})})
	var invalid *canonical.InvalidUTF8Error
	if !errors.As(err, &invalid) || invalid.Field != "payload" {
		t.Fatalf("BuildChain: err=%v, want payload InvalidUTF8Error", err)
	}
	if digests != nil || head != "" {
		t.Fatalf("BuildChain returned partial identity on refusal: digests=%v head=%q", digests, head)
	}
}

func decodeHex(t *testing.T, value string) []byte {
	t.Helper()
	decoded, err := hex.DecodeString(value)
	if err != nil {
		t.Fatalf("decode CG1 hex vector %q: %v", value, err)
	}
	return decoded
}

func mustEntryDigest(t testing.TB, entry canonical.ChainEntry) string {
	t.Helper()
	digest, err := canonical.EntryDigest(entry)
	if err != nil {
		t.Fatalf("EntryDigest(%+v): %v", entry, err)
	}
	return digest
}

func mustBuildChain(t testing.TB, payloads []string) ([]string, string) {
	t.Helper()
	digests, head, err := canonical.BuildChain(payloads)
	if err != nil {
		t.Fatalf("BuildChain: %v", err)
	}
	return digests, head
}
