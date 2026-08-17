package substrate

import (
	"encoding/json"
	"errors"
	"fmt"
	"testing"
	"time"

	"github.com/nats-io/nats-server/v2/server"
	"github.com/nats-io/nats.go"
	"github.com/nats-io/nats.go/jetstream"
)

func TestSubstrateEnvelopeShape(t *testing.T) {
	harness := startPermissionedJetStream(t)
	ctx := testContext(t)
	assertApplicationPositiveControl(t, harness)
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

	purgeStream := createStream(t, harness.admin, jetstream.StreamConfig{
		Name:      "ASSUME_API_PURGE",
		Subjects:  []string{"acl.purge"},
		Storage:   jetstream.FileStorage,
		Replicas:  1,
		Retention: jetstream.LimitsPolicy,
	})
	if _, err := harness.admin.Publish(ctx, "acl.purge", []byte("destructive control")); err != nil {
		t.Fatalf("seed API purge control: %v", err)
	}
	assertApplicationRefusedAPI(
		t,
		harness,
		fmt.Sprintf(server.JSApiStreamPurgeT, "ASSUME_API_PURGE"),
		[]byte("{}"),
	)
	if info, err := purgeStream.Info(ctx); err != nil || info.State.Msgs != 1 {
		t.Fatalf("refused application stream purge moved state: info=%+v err=%v", info, err)
	}
	purgeResponse := adminPurgeStreamAPI(t, harness, "ASSUME_API_PURGE")
	if info, err := purgeStream.Info(ctx); err != nil || info.State.Msgs != 0 {
		t.Fatalf("admin stream purge left state: info=%+v err=%v", info, err)
	}
	t.Logf(
		"TRACE acl-api subject=%s app=permission-refused admin=success purged=%d",
		fmt.Sprintf(server.JSApiStreamPurgeT, "ASSUME_API_PURGE"),
		purgeResponse.Purged,
	)

	journalDeleteSubject := fmt.Sprintf(server.JSApiStreamDeleteT, "ASSUME_JOURNAL")
	assertApplicationRefusedAPI(t, harness, journalDeleteSubject, nil)
	if _, err := stream.Info(ctx); err != nil {
		t.Fatalf("refused application journal delete removed stream: %v", err)
	}
	adminDeleteStreamAPI(t, harness, "ASSUME_JOURNAL")
	if _, err := harness.admin.Stream(ctx, "ASSUME_JOURNAL"); !errors.Is(err, jetstream.ErrStreamNotFound) {
		t.Fatalf("admin journal delete left stream present: %v", err)
	}
	t.Logf("TRACE acl-api subject=%s app=permission-refused admin=success stream=gone", journalDeleteSubject)

	kvDeleteSubject := fmt.Sprintf(server.JSApiStreamDeleteT, "KV_ASSUME_TERMINAL")
	assertApplicationRefusedAPI(t, harness, kvDeleteSubject, nil)
	if _, err := bucket.Get(ctx, "terminal.delete"); err != nil {
		t.Fatalf("refused application KV backing-stream delete removed bucket: %v", err)
	}
	adminDeleteStreamAPI(t, harness, "KV_ASSUME_TERMINAL")
	if _, err := harness.admin.Stream(ctx, "KV_ASSUME_TERMINAL"); !errors.Is(err, jetstream.ErrStreamNotFound) {
		t.Fatalf("admin KV backing-stream delete left stream present: %v", err)
	}
	t.Logf("TRACE acl-api subject=%s app=permission-refused admin=success stream=gone", kvDeleteSubject)
}

func TestApplicationACLWideningPlant(t *testing.T) {
	harness := startPermissionedJetStreamWithApplicationPermissions(t, []string{"$JS.API.>"}, nil)
	ctx := testContext(t)
	createStream(t, harness.admin, journalEnvelopeConfig())

	subject := fmt.Sprintf(server.JSApiStreamDeleteT, "ASSUME_JOURNAL")
	response, err := harness.applicationConn.Request(subject, nil, permissionTimeout)
	if err != nil {
		t.Fatalf("widened application delete request: %v", err)
	}
	var deleted server.JSApiStreamDeleteResponse
	if err := json.Unmarshal(response.Data, &deleted); err != nil {
		t.Fatalf("decode widened application delete response: %v", err)
	}
	if deleted.Error != nil || !deleted.Success {
		t.Fatalf("widened application did not delete stream: %+v", deleted)
	}
	if _, err := harness.admin.Stream(ctx, "ASSUME_JOURNAL"); !errors.Is(err, jetstream.ErrStreamNotFound) {
		t.Fatalf("widening plant left stream present: %v", err)
	}
	t.Logf("TRACE acl-plant allow=$JS.API.> subject=%s result=stream-deleted baseline=must-red", subject)
}

func TestApplicationDenyAllPlant(t *testing.T) {
	harness := startPermissionedJetStreamWithApplicationPermissions(t, nil, []string{">"})
	attempt := nats.NewMsg("flb.req.credential-control")
	attempt.Data = []byte("legitimate application work")
	expectPermissionViolation(t, harness, attempt)
	t.Log("TRACE acl-plant deny=> legitimate-publish=permission-refused positive-control=must-red")
}

func assertApplicationPositiveControl(t *testing.T, harness *testHarness) {
	t.Helper()
	ctx := testContext(t)
	work := createStream(t, harness.admin, jetstream.StreamConfig{
		Name:     "ASSUME_APPLICATION_WORK",
		Subjects: []string{"flb.req.>", "flb.ing.>"},
		Storage:  jetstream.FileStorage,
		Replicas: 1,
	})
	for _, subject := range []string{"flb.req.credential-control", "flb.ing.credential-control"} {
		message := nats.NewMsg(subject)
		message.Data = []byte("legitimate application work")
		if _, err := harness.applicationConn.RequestMsg(message, permissionTimeout); err != nil {
			t.Fatalf("application positive-control publish %s: %v", subject, err)
		}
	}
	info, err := work.Info(ctx)
	if err != nil {
		t.Fatalf("read application positive-control stream: %v", err)
	}
	if info.State.Msgs != 2 {
		t.Fatalf("application positive-control publishes stored=%d, want 2", info.State.Msgs)
	}

	bucket := createKeyValue(t, harness.admin, jetstream.KeyValueConfig{
		Bucket:   "ASSUME_APP_SCOPE",
		History:  1,
		Storage:  jetstream.FileStorage,
		Replicas: 1,
	})
	for revision, value := range []string{"application-scoped KV create", "application-scoped KV update"} {
		message := nats.NewMsg("$KV.ASSUME_APP_SCOPE.credential-control")
		message.Data = []byte(value)
		message.Header.Set(jetstream.ExpectedLastSubjSeqHeader, fmt.Sprintf("%d", revision))
		if _, err := harness.applicationConn.RequestMsg(message, permissionTimeout); err != nil {
			t.Fatalf("application positive-control KV write revision=%d: %v", revision, err)
		}
	}
	entry, err := bucket.Get(ctx, "credential-control")
	if err != nil || entry.Revision() != 2 || string(entry.Value()) != "application-scoped KV update" {
		t.Fatalf("application positive-control KV read entry=%v err=%v", entry, err)
	}
	t.Log("TRACE application-positive publishes=[flb.req,flb.ing] kv=$KV.ASSUME_APP_SCOPE:create+CAS-update credential=operational")
}

func assertApplicationRefusedAPI(t *testing.T, harness *testHarness, subject string, payload []byte) {
	t.Helper()
	message := nats.NewMsg(subject)
	message.Data = payload
	message.Reply = nats.NewInbox()
	expectPermissionViolation(t, harness, message)
}

func adminDeleteStreamAPI(t *testing.T, harness *testHarness, stream string) {
	t.Helper()
	subject := fmt.Sprintf(server.JSApiStreamDeleteT, stream)
	message, err := harness.adminConn.Request(subject, nil, permissionTimeout)
	if err != nil {
		t.Fatalf("admin stream delete API %s: %v", subject, err)
	}
	var response server.JSApiStreamDeleteResponse
	if err := json.Unmarshal(message.Data, &response); err != nil {
		t.Fatalf("decode admin stream delete API %s: %v", subject, err)
	}
	if response.Error != nil || !response.Success {
		t.Fatalf("admin stream delete API %s response=%+v", subject, response)
	}
}

func adminPurgeStreamAPI(t *testing.T, harness *testHarness, stream string) server.JSApiStreamPurgeResponse {
	t.Helper()
	subject := fmt.Sprintf(server.JSApiStreamPurgeT, stream)
	message, err := harness.adminConn.Request(subject, []byte("{}"), permissionTimeout)
	if err != nil {
		t.Fatalf("admin stream purge API %s: %v", subject, err)
	}
	var response server.JSApiStreamPurgeResponse
	if err := json.Unmarshal(message.Data, &response); err != nil {
		t.Fatalf("decode admin stream purge API %s: %v", subject, err)
	}
	if response.Error != nil || !response.Success {
		t.Fatalf("admin stream purge API %s response=%+v", subject, response)
	}
	return response
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
