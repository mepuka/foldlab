// The Go side of the fixture wall: proto/wire/fixtures was generated
// once by cmd/wirefix and frozen. This test re-derives every canonical
// byte string and digest independently; a mismatch means this side
// drifted — the fixture is evidence, never a constant to update.
package protod

import (
	"encoding/json"
	"os"
	"path/filepath"
	"testing"

	"foldlab/canonical"
)

func loadFixture(t *testing.T, name string, into any) {
	t.Helper()
	raw, err := os.ReadFile(filepath.Join("..", "..", "wire", "fixtures", name))
	if err != nil {
		t.Fatalf("read fixture %s: %v", name, err)
	}
	if err := json.Unmarshal(raw, into); err != nil {
		t.Fatalf("parse fixture %s: %v", name, err)
	}
}

func TestTypeFixturesRederive(t *testing.T) {
	var vectors []struct {
		Name      string `json:"name"`
		Structure any    `json:"structure"`
		Canonical string `json:"canonical"`
		Digest    string `json:"digest"`
	}
	loadFixture(t, "types.json", &vectors)
	if len(vectors) == 0 {
		t.Fatal("no type vectors")
	}
	for _, vector := range vectors {
		bytes, err := canonicalBytes(vector.Structure)
		if err != nil {
			t.Fatalf("%s: canonicalize: %v", vector.Name, err)
		}
		if string(bytes) != vector.Canonical {
			t.Errorf("%s: canonical bytes drifted\n got %s\nwant %s", vector.Name, bytes, vector.Canonical)
		}
		if derived := activeScheme.Derive(bytes); derived != vector.Digest {
			t.Errorf("%s: digest drifted: got %s want %s", vector.Name, derived, vector.Digest)
		}
		// Every fixture structure is a valid flb.type.v0 node.
		if _, refusal := walkStructure(vector.Structure, []string{"structure"}); refusal != nil {
			t.Errorf("%s: fixture structure refused: %+v", vector.Name, refusal)
		}
	}
}

func TestChainFixturesRederive(t *testing.T) {
	var vectors []struct {
		Name         string   `json:"name"`
		Payloads     []string `json:"payloads"`
		EntryDigests []string `json:"entryDigests"`
		Head         string   `json:"head"`
	}
	loadFixture(t, "chains.json", &vectors)
	if len(vectors) == 0 {
		t.Fatal("no chain vectors")
	}
	for _, vector := range vectors {
		digests, head := canonical.BuildChain(vector.Payloads)
		if head != vector.Head {
			t.Errorf("%s: head drifted: got %s want %s", vector.Name, head, vector.Head)
		}
		for index, digest := range digests {
			if digest != vector.EntryDigests[index] {
				t.Errorf("%s[%d]: entry digest drifted", vector.Name, index)
			}
		}
	}
}

func TestFrameFixturesRederive(t *testing.T) {
	var vectors []struct {
		Name      string `json:"name"`
		Frame     any    `json:"frame"`
		Canonical string `json:"canonical"`
	}
	loadFixture(t, "frames.json", &vectors)
	if len(vectors) == 0 {
		t.Fatal("no frame vectors")
	}
	for _, vector := range vectors {
		bytes, err := canonicalBytes(vector.Frame)
		if err != nil {
			t.Fatalf("%s: canonicalize: %v", vector.Name, err)
		}
		if string(bytes) != vector.Canonical {
			t.Errorf("%s: canonical bytes drifted\n got %s\nwant %s", vector.Name, bytes, vector.Canonical)
		}
	}
}
