package journal

import (
	"context"
	"encoding/json"
	"os"
	"path/filepath"
	"reflect"
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
	fixtureBytes, err := os.ReadFile(filepath.Join("..", "..", "fixtures", "golden-conformance.json"))
	if err != nil {
		t.Fatal(err)
	}
	var fixture struct {
		Values []struct {
			Encoded string `json:"encoded"`
		} `json:"values"`
	}
	if err := json.Unmarshal(fixtureBytes, &fixture); err != nil {
		t.Fatal(err)
	}
	js := startHardeningJetStream(t)
	opened, err := Open(context.Background(), js, "pipeline_wall")
	if err != nil {
		t.Fatal(err)
	}
	for _, value := range fixture.Values {
		if _, _, err := opened.Append(context.Background(), value.Encoded); err != nil {
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
	if !reflect.DeepEqual(pipelined, sequential) {
		t.Fatal("pipelined entries differ from the retained sequential path")
	}
	if pipelinedCursor != sequentialCursor {
		t.Fatalf("pipelined cursor=%+v, sequential=%+v", pipelinedCursor, sequentialCursor)
	}
	for index := range pipelined {
		before, err := canonical.EntryDigest(sequential[index])
		if err != nil {
			t.Fatal(err)
		}
		after, err := canonical.EntryDigest(pipelined[index])
		if err != nil {
			t.Fatal(err)
		}
		if after != before {
			t.Fatalf("entry %d digest changed: %s != %s", index, after, before)
		}
	}
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
