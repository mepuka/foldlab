package journal

import (
	"context"
	"encoding/json"
	"os"
	"path/filepath"
	"testing"
	"time"

	"github.com/nats-io/nats-server/v2/server"
	"github.com/nats-io/nats.go"
	"github.com/nats-io/nats.go/jetstream"

	"foldlab/canonical"
)

func TestBadShapeReasonRefusesEveryTask19Hazard(t *testing.T) {
	base := func() jetstream.StreamConfig {
		return jetstream.StreamConfig{
			Name:              "J_gate",
			Subjects:          []string{"j.gate"},
			Retention:         jetstream.LimitsPolicy,
			MaxMsgs:           -1,
			MaxBytes:          -1,
			Discard:           jetstream.DiscardOld,
			MaxMsgsPerSubject: -1,
			Storage:           jetstream.FileStorage,
			Duplicates:        2 * time.Minute,
			DenyDelete:        true,
			DenyPurge:         true,
		}
	}
	cases := []struct {
		name   string
		mutate func(*jetstream.StreamConfig)
	}{
		{"persist-mode-async", func(c *jetstream.StreamConfig) { c.PersistMode = jetstream.AsyncPersistMode }},
		{"republish", func(c *jetstream.StreamConfig) {
			c.RePublish = &jetstream.RePublish{Source: "j.gate", Destination: "elsewhere"}
		}},
		{"subject-transform", func(c *jetstream.StreamConfig) {
			c.SubjectTransform = &jetstream.SubjectTransformConfig{Source: "j.gate", Destination: "elsewhere"}
		}},
		{"message-ttl", func(c *jetstream.StreamConfig) { c.AllowMsgTTL = true }},
		{"delete-marker-ttl", func(c *jetstream.StreamConfig) { c.SubjectDeleteMarkerTTL = time.Second }},
		{"allow-direct", func(c *jetstream.StreamConfig) { c.AllowDirect = true }},
		{"mirror-direct", func(c *jetstream.StreamConfig) { c.MirrorDirect = true }},
		{"atomic-publish", func(c *jetstream.StreamConfig) { c.AllowAtomicPublish = true }},
		{"message-counter", func(c *jetstream.StreamConfig) { c.AllowMsgCounter = true }},
		{"compression", func(c *jetstream.StreamConfig) { c.Compression = jetstream.S2Compression }},
		{"max-message-size", func(c *jetstream.StreamConfig) { c.MaxMsgSize = 1024 }},
		{"consumer-max-ack-pending", func(c *jetstream.StreamConfig) { c.ConsumerLimits.MaxAckPending = 1 }},
		{"consumer-inactive-threshold", func(c *jetstream.StreamConfig) { c.ConsumerLimits.InactiveThreshold = time.Second }},
	}
	if reason := badShapeReason(base(), "j.gate"); reason != "" {
		t.Fatalf("baseline shape refused: %s", reason)
	}
	for _, tc := range cases {
		t.Run(tc.name, func(t *testing.T) {
			cfg := base()
			tc.mutate(&cfg)
			if reason := badShapeReason(cfg, "j.gate"); reason == "" {
				t.Fatal("hazard shape was admitted")
			}
		})
	}
}

func TestPipelinedReadMatchesSequentialOnFrozenFixture(t *testing.T) {
	fixtureBytes, err := os.ReadFile(filepath.Join("..", "..", "proto", "wire", "fixtures", "chains.json"))
	if err != nil {
		t.Fatal(err)
	}
	type frozenChain struct {
		Name         string   `json:"name"`
		Payloads     []string `json:"payloads"`
		EntryDigests []string `json:"entryDigests"`
		Head         string   `json:"head"`
	}
	var fixture []frozenChain
	if err := json.Unmarshal(fixtureBytes, &fixture); err != nil {
		t.Fatal(err)
	}
	if len(fixture) == 0 || len(fixture[0].Payloads) < 2 {
		t.Fatal("frozen chain oracle is missing its directed multi-entry row")
	}
	oracle := fixture[0]
	js := startHardeningJetStream(t)
	opened, err := Open(context.Background(), js, "pipeline_wall")
	if err != nil {
		t.Fatal(err)
	}
	for _, payload := range oracle.Payloads {
		if _, _, err := opened.Append(context.Background(), payload); err != nil {
			t.Fatal(err)
		}
	}
	from := Cursor{Seq: -1, Head: canonical.Genesis}
	sequential, sequentialCursor, err := opened.readSequential(context.Background(), from, 0)
	if err != nil {
		t.Fatalf("sequential read: %v", err)
	}
	pipelined, pipelinedCursor, err := opened.Read(context.Background(), from, 0)
	if err != nil {
		t.Fatalf("pipelined read: %v", err)
	}
	for name, result := range map[string]struct {
		entries []canonical.ChainEntry
		cursor  Cursor
	}{
		"sequential": {sequential, sequentialCursor},
		"pipelined":  {pipelined, pipelinedCursor},
	} {
		if mismatch := frozenReadMismatch(result.entries, result.cursor, oracle.Payloads, oracle.EntryDigests, oracle.Head); mismatch != "" {
			t.Fatalf("%s read differs from independent frozen chain oracle: %s", name, mismatch)
		}
	}

	// Negative control: a scheduler that folds two fetched messages out of
	// sequence can make the two implementations agree if they share the bug;
	// the fixed external chain oracle must still reject it.
	mutant := append([]canonical.ChainEntry(nil), pipelined...)
	mutant[0], mutant[1] = mutant[1], mutant[0]
	if mismatch := frozenReadMismatch(mutant, pipelinedCursor, oracle.Payloads, oracle.EntryDigests, oracle.Head); mismatch == "" {
		t.Fatal("frozen chain oracle admitted the out-of-order fold mutant")
	}
}

func frozenReadMismatch(
	entries []canonical.ChainEntry,
	cursor Cursor,
	payloads []string,
	digests []string,
	head string,
) string {
	if len(entries) != len(payloads) || len(entries) != len(digests) {
		return "entry count"
	}
	prev := canonical.Genesis
	for index, entry := range entries {
		if entry.Seq != int64(index) || entry.Prev != prev || entry.Payload != payloads[index] {
			return "entry coordinates"
		}
		digest, err := canonical.EntryDigest(entry)
		if err != nil {
			return "entry digest refused"
		}
		if digest != digests[index] {
			return "entry digest"
		}
		prev = digest
	}
	if cursor != (Cursor{Seq: len(entries) - 1, Head: head}) {
		return "cursor"
	}
	return ""
}

func startHardeningJetStream(t *testing.T) jetstream.JetStream {
	t.Helper()
	s, err := server.NewServer(&server.Options{
		ServerName: "flb-journal-hardening-test",
		JetStream:  true, StoreDir: t.TempDir(), DontListen: true, NoLog: true, NoSigs: true,
	})
	if err != nil {
		t.Fatal(err)
	}
	go s.Start()
	if !s.ReadyForConnections(10 * time.Second) {
		s.Shutdown()
		t.Fatal("embedded nats-server did not become ready")
	}
	nc, err := nats.Connect("", nats.InProcessServer(s), nats.Name("foldlab/test journal pipeline wall"))
	if err != nil {
		s.Shutdown()
		t.Fatal(err)
	}
	t.Cleanup(func() {
		nc.Close()
		s.Shutdown()
		s.WaitForShutdown()
	})
	js, err := jetstream.New(nc)
	if err != nil {
		t.Fatal(err)
	}
	return js
}
