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
	"sort"
	"strings"
	"testing"
	"time"

	"github.com/nats-io/nats.go"

	"foldlab/canonical"
)

func TestCatalogQueryFixtureRederives(t *testing.T) {
	var fixture struct {
		Provenance      string                 `json:"_provenance"`
		Pattern         any                    `json:"pattern"`
		QueryDigest     string                 `json:"queryDigest"`
		OverCatalogHead string                 `json:"overCatalogHead"`
		Entries         []canonical.ChainEntry `json:"entries"`
		Results         []catalogRow           `json:"results"`
	}
	loadFixture(t, "catalog-query.json", &fixture)
	if !strings.Contains(fixture.Provenance, "generated once by the Go query fixture") {
		t.Fatalf("query fixture lacks provenance: %q", fixture.Provenance)
	}

	headAt := make(map[int64]string, len(fixture.Entries))
	cursor := canonical.Genesis
	got := make([]string, 0)
	for _, entry := range fixture.Entries {
		if entry.Prev != cursor {
			t.Fatalf("entry %d prev = %s, want %s", entry.Seq, entry.Prev, cursor)
		}
		head, err := canonical.EntryDigest(entry)
		if err != nil {
			t.Fatalf("entry %d digest: %v", entry.Seq, err)
		}
		headAt[entry.Seq] = head
		cursor = head
		var fact catalogFact
		if err := json.Unmarshal([]byte(entry.Payload), &fact); err != nil {
			t.Fatalf("entry %d fact: %v", entry.Seq, err)
		}
		if structureMatch(fixture.Pattern, fact.Structure) {
			got = append(got, fact.Digest)
		}
	}
	if cursor != fixture.OverCatalogHead {
		t.Fatalf("query head = %s, want %s", cursor, fixture.OverCatalogHead)
	}
	queryDigest, err := catalogQueryDigest(fixture.Pattern)
	if err != nil {
		t.Fatal(err)
	}
	if queryDigest != fixture.QueryDigest {
		t.Fatalf("query digest = %s, want %s", queryDigest, fixture.QueryDigest)
	}
	sort.Strings(got)
	want := make([]string, len(fixture.Results))
	for index, row := range fixture.Results {
		bytes, err := canonicalBytes(row.Structure)
		if err != nil {
			t.Fatalf("row %d structure: %v", index, err)
		}
		if activeScheme.Derive(bytes) != row.Digest {
			t.Fatalf("row %d digest does not re-derive", index)
		}
		if headAt[row.CatalogSeq] != row.CatalogHead {
			t.Fatalf("row %d catalog position does not re-derive", index)
		}
		want[index] = row.Digest
	}
	if strings.Join(got, ",") != strings.Join(want, ",") {
		t.Fatalf("query fold = %v, fixture = %v", got, want)
	}
}

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

	daemon, err := Acquire(context.Background(), Options{StoreDir: t.TempDir()})
	if err != nil {
		t.Fatalf("acquire fixture daemon: %v", err)
	}
	t.Cleanup(daemon.Release)
	conn, err := nats.Connect(daemon.URL())
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
