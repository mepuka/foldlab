package substrate

import (
	"errors"
	"fmt"
	"testing"
	"time"

	"github.com/nats-io/nats.go"
	"github.com/nats-io/nats.go/jetstream"
)

func TestSubstrateEnvelopeShape(t *testing.T) {
	harness := startPermissionedJetStream(t)
	ctx := testContext(t)
	stream := createStream(t, harness.admin, journalEnvelopeConfig())
	info, err := stream.Info(ctx)
	if err != nil {
		t.Fatalf("read journal shape: %v", err)
	}
	if harness.server.JetStreamIsClustered() {
		t.Fatal("embedded substrate envelope unexpectedly enabled clustered JetStream")
	}
	assertJournalEnvelope(t, info)

	journalAttempt := nats.NewMsg("plait.journal.alpha")
	journalAttempt.Data = []byte("unauthorized append")
	expectPermissionViolation(t, harness, journalAttempt)

	bucket := createKeyValue(t, harness.admin, jetstream.KeyValueConfig{
		Bucket:   "ASSUME_TERMINAL",
		History:  8,
		Storage:  jetstream.FileStorage,
		Replicas: 1,
	})

	type destructiveCase struct {
		name    string
		key     string
		headers nats.Header
		apply   func(uint64) error
	}
	cases := []destructiveCase{
		{
			name: "delete",
			key:  "terminal.delete",
			headers: nats.Header{
				"KV-Operation": []string{"DEL"},
			},
			apply: func(revision uint64) error {
				return bucket.Delete(ctx, "terminal.delete", jetstream.LastRevision(revision))
			},
		},
		{
			name: "purge",
			key:  "terminal.purge",
			headers: nats.Header{
				"KV-Operation":      []string{"PURGE"},
				jetstream.MsgRollup: []string{jetstream.MsgRollupSubject},
			},
			apply: func(revision uint64) error {
				return bucket.Purge(ctx, "terminal.purge", jetstream.LastRevision(revision))
			},
		},
	}

	for _, tc := range cases {
		t.Run(tc.name, func(t *testing.T) {
			revision, err := bucket.Create(ctx, tc.key, []byte("terminal"))
			if err != nil {
				t.Fatalf("create terminal key: %v", err)
			}
			attempt := nats.NewMsg("$KV.ASSUME_TERMINAL." + tc.key)
			attempt.Header = tc.headers
			attempt.Header.Set(jetstream.ExpectedLastSubjSeqHeader, fmt.Sprintf("%d", revision))
			expectPermissionViolation(t, harness, attempt)

			entry, err := bucket.Get(ctx, tc.key)
			if err != nil || entry.Revision() != revision || string(entry.Value()) != "terminal" {
				t.Fatalf("refused application %s moved terminal key: entry=%v err=%v", tc.name, entry, err)
			}

			// Negative control: the same revision-checked operation succeeds for
			// the administrator. This is the witness that the credential guard,
			// rather than KV mechanics, supplies terminal immutability.
			if err := tc.apply(revision); err != nil {
				t.Fatalf("admin %s must succeed as the load-bearing negative control: %v", tc.name, err)
			}
			if _, err := bucket.Get(ctx, tc.key); !errors.Is(err, jetstream.ErrKeyNotFound) {
				t.Fatalf("admin %s left key readable: %v", tc.name, err)
			}
			recreated, err := bucket.Create(ctx, tc.key, []byte("replacement"))
			if err != nil {
				t.Fatalf("create after admin %s: %v", tc.name, err)
			}
			if recreated <= revision {
				t.Fatalf("create after admin %s revision=%d, want later than %d", tc.name, recreated, revision)
			}
			t.Logf(
				"TRACE envelope operation=%s app=permission-refused admin=success create-after=%d original=%d",
				tc.name,
				recreated,
				revision,
			)
		})
	}
}

func journalEnvelopeConfig() jetstream.StreamConfig {
	return jetstream.StreamConfig{
		Name:              "ASSUME_JOURNAL",
		Subjects:          []string{"plait.journal.>"},
		Retention:         jetstream.LimitsPolicy,
		MaxConsumers:      -1,
		MaxMsgs:           -1,
		MaxBytes:          -1,
		MaxAge:            0,
		MaxMsgsPerSubject: -1,
		MaxMsgSize:        -1,
		Storage:           jetstream.FileStorage,
		Replicas:          1,
		Discard:           jetstream.DiscardOld,
		Duplicates:        2 * time.Minute,
		DenyDelete:        true,
		DenyPurge:         true,
	}
}

func assertJournalEnvelope(t *testing.T, info *jetstream.StreamInfo) {
	t.Helper()
	config := info.Config
	// Standalone v2.14.4 still reports a ClusterInfo shell naming the local
	// leader. A Raft group or peers, rather than non-nil ClusterInfo, is the
	// observable clustered-stream witness; JetStreamIsClustered is asserted by
	// the caller against the server itself.
	if info.Cluster != nil && (info.Cluster.RaftGroup != "" || len(info.Cluster.Replicas) != 0) {
		t.Fatalf("journal has a clustered stream placement: %+v", info.Cluster)
	}
	if config.Storage != jetstream.FileStorage || config.Replicas != 1 {
		t.Fatalf("journal storage/replicas=%s/%d, want file/1", config.Storage, config.Replicas)
	}
	if config.Retention != jetstream.LimitsPolicy || config.Discard != jetstream.DiscardOld {
		t.Fatalf("journal retention/discard=%s/%s, want limits/old", config.Retention, config.Discard)
	}
	if config.MaxMsgs != -1 || config.MaxBytes != -1 || config.MaxAge != 0 ||
		config.MaxMsgsPerSubject != -1 || config.MaxMsgSize != -1 {
		t.Fatalf(
			"journal eviction surface msgs=%d bytes=%d age=%s per-subject=%d msg-size=%d",
			config.MaxMsgs,
			config.MaxBytes,
			config.MaxAge,
			config.MaxMsgsPerSubject,
			config.MaxMsgSize,
		)
	}
	if !config.DenyDelete || !config.DenyPurge || config.AllowRollup || config.AllowMsgTTL ||
		config.SubjectDeleteMarkerTTL != 0 {
		t.Fatalf(
			"journal destructive surface delete=%t purge=%t rollup=%t ttl=%t marker-ttl=%s",
			config.DenyDelete,
			config.DenyPurge,
			config.AllowRollup,
			config.AllowMsgTTL,
			config.SubjectDeleteMarkerTTL,
		)
	}
	if config.Mirror != nil || len(config.Sources) != 0 {
		t.Fatalf("journal imports messages: mirror=%v sources=%d", config.Mirror, len(config.Sources))
	}
	if config.RePublish != nil || config.SubjectTransform != nil || config.AllowDirect ||
		config.MirrorDirect || config.AllowAtomicPublish || config.AllowBatchPublish || config.AllowMsgSchedules {
		t.Fatalf("journal exposes an alternate mutation or read path: %+v", config)
	}
	t.Logf(
		"TRACE envelope stream=%s storage=file replicas=1 cluster=none limits=unbounded delete=denied purge=denied imports=none",
		config.Name,
	)
}
