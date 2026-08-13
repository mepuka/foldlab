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
}

func TestEntryDigestRefusesInvalidUTF8(t *testing.T) {
	raw, err := os.ReadFile(filepath.Join("probes", "cg1-vector.json"))
	if err != nil {
		t.Fatalf("read shared refusal vector: %v", err)
	}
	var vector cg1Vector
	if err := json.Unmarshal(raw, &vector); err != nil {
		t.Fatalf("decode shared refusal vector: %v", err)
	}
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

	_, err = canonical.EntryDigest(canonical.ChainEntry{Seq: 0, Prev: string([]byte{0xff})})
	var invalid *canonical.InvalidUTF8Error
	if !errors.As(err, &invalid) || invalid.Field != "prev" {
		t.Fatalf("EntryDigest invalid prev: err=%v, want prev InvalidUTF8Error", err)
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
