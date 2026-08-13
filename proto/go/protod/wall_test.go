// The Go side of the fixture wall: proto/wire/fixtures was generated
// once by cmd/wirefix and frozen. This test re-derives every canonical
// byte string and digest independently; a mismatch means this side
// drifted — the fixture is evidence, never a constant to update.
package protod

import (
	"context"
	"encoding/json"
	"os"
	"path/filepath"
	"testing"
	"time"

	"github.com/nats-io/nats.go"

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
		normalized, err := normalize(vector.Structure)
		if err != nil {
			t.Fatalf("%s: normalize: %v", vector.Name, err)
		}
		bytes, err := canonicalBytes(normalized)
		if err != nil {
			t.Fatalf("%s: canonicalize: %v", vector.Name, err)
		}
		if string(bytes) != vector.Canonical {
			t.Errorf("%s: canonical bytes drifted\n got %s\nwant %s", vector.Name, bytes, vector.Canonical)
		}
		if derived := (bytesSHA256V1{}).Derive(bytes); derived != vector.Digest {
			t.Errorf("%s: digest drifted: got %s want %s", vector.Name, derived, vector.Digest)
		}
		// Every fixture structure is a valid flb.type.v0 node.
		if _, refusal := walkStructure(vector.Structure, []string{"structure"}); refusal != nil {
			t.Errorf("%s: fixture structure refused: %+v", vector.Name, refusal)
		}
	}
}

func TestOwnedTypeV1FixturesRederive(t *testing.T) {
	var fixture struct {
		Scheme  string `json:"scheme"`
		Vectors []struct {
			Name       string `json:"name"`
			Structure  any    `json:"structure"`
			Normalized any    `json:"normalized"`
			Canonical  string `json:"canonical"`
			Digest     string `json:"digest"`
		} `json:"vectors"`
	}
	loadFixture(t, "owned-types-v1.json", &fixture)
	if fixture.Scheme != flbTypeV1Scheme || activeScheme.Name() != fixture.Scheme {
		t.Fatalf("owned scheme drifted: fixture=%q active=%q", fixture.Scheme, activeScheme.Name())
	}
	if len(fixture.Vectors) < 4 {
		t.Fatalf("owned identity corpus is too small: %d", len(fixture.Vectors))
	}
	digests := map[string]string{}
	for _, vector := range fixture.Vectors {
		if _, refusal := walkStructure(vector.Structure, []string{"structure"}); refusal != nil {
			t.Fatalf("%s: fixture structure refused: %+v", vector.Name, refusal)
		}
		normalized, err := normalize(vector.Structure)
		if err != nil {
			t.Fatalf("%s: normalize: %v", vector.Name, err)
		}
		if got, want := mustCanonicalTest(t, normalized), mustCanonicalTest(t, vector.Normalized); got != want {
			t.Fatalf("%s: normal form drifted\n got %s\nwant %s", vector.Name, got, want)
		}
		bytes, err := canonicalBytes(normalized)
		if err != nil {
			t.Fatalf("%s: canonicalize: %v", vector.Name, err)
		}
		if string(bytes) != vector.Canonical {
			t.Errorf("%s: canonical bytes drifted\n got %s\nwant %s", vector.Name, bytes, vector.Canonical)
		}
		if derived := activeScheme.Derive(bytes); derived != vector.Digest {
			t.Errorf("%s: digest drifted: got %s want %s", vector.Name, derived, vector.Digest)
		}
		digests[vector.Name] = vector.Digest
	}
	if digests["union-forward"] != digests["union-reversed"] {
		t.Fatalf("normalize did not collapse permuted unions: %v", digests)
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
		digests, head, err := canonical.BuildChain(vector.Payloads)
		if err != nil {
			t.Fatalf("%s: BuildChain: %v", vector.Name, err)
		}
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

func TestConciergeFixturesRederiveAndReplay(t *testing.T) {
	var vectors []struct {
		Name             string `json:"name"`
		Subject          string `json:"subject"`
		Request          any    `json:"request"`
		RequestCanonical string `json:"requestCanonical"`
		Reply            any    `json:"reply"`
		ReplyCanonical   string `json:"replyCanonical"`
	}
	loadFixture(t, "concierge.json", &vectors)
	if len(vectors) == 0 {
		t.Fatal("no concierge vectors")
	}

	daemon, err := Acquire(context.Background(), Options{StoreDir: t.TempDir(), SyncMode: SyncCrashDurable})
	if err != nil {
		t.Fatalf("acquire fixture daemon: %v", err)
	}
	t.Cleanup(daemon.Release)
	conn, err := nats.Connect(daemon.URL(), nats.Name("foldlab-protod-test/0.0.0/wire-wall-client"))
	if err != nil {
		t.Fatalf("connect fixture client: %v", err)
	}
	t.Cleanup(conn.Close)

	for _, vector := range vectors {
		requestBytes, err := canonicalBytes(vector.Request)
		if err != nil {
			t.Fatalf("%s: canonicalize request: %v", vector.Name, err)
		}
		if string(requestBytes) != vector.RequestCanonical {
			t.Errorf("%s: request bytes drifted\n got %s\nwant %s", vector.Name, requestBytes, vector.RequestCanonical)
		}
		replyBytes, err := canonicalBytes(vector.Reply)
		if err != nil {
			t.Fatalf("%s: canonicalize reply fixture: %v", vector.Name, err)
		}
		if string(replyBytes) != vector.ReplyCanonical {
			t.Errorf("%s: reply fixture bytes drifted\n got %s\nwant %s", vector.Name, replyBytes, vector.ReplyCanonical)
		}

		message, err := conn.Request(vector.Subject, requestBytes, 20*time.Second)
		if err != nil {
			t.Fatalf("%s: replay request: %v", vector.Name, err)
		}
		var actual any
		if err := json.Unmarshal(message.Data, &actual); err != nil {
			t.Fatalf("%s: parse replay reply: %v", vector.Name, err)
		}
		actualBytes, err := canonicalBytes(actual)
		if err != nil {
			t.Fatalf("%s: canonicalize replay reply: %v", vector.Name, err)
		}
		if string(actualBytes) != vector.ReplyCanonical {
			t.Errorf("%s: replay reply drifted\n got %s\nwant %s", vector.Name, actualBytes, vector.ReplyCanonical)
		}
	}
}
