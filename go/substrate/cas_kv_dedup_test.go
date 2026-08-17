package substrate

import (
	"errors"
	"fmt"
	"sync"
	"sync/atomic"
	"testing"
	"time"

	"github.com/nats-io/nats.go/jetstream"
)

func TestSubjectCAS(t *testing.T) {
	harness := startJetStream(t)
	stream := createStream(t, harness.admin, jetstream.StreamConfig{
		Name:              "ASSUME_SUBJECT_CAS",
		Subjects:          []string{"cas.>"},
		Retention:         jetstream.LimitsPolicy,
		MaxMsgs:           -1,
		MaxBytes:          -1,
		MaxMsgsPerSubject: -1,
		Storage:           jetstream.FileStorage,
		Replicas:          1,
	})

	publish := func(subject string, expected uint64, wantSequence uint64) {
		t.Helper()
		ack, err := publishSubjectCAS(t, harness.admin, subject, subject, expected, "")
		if err != nil {
			t.Fatalf("publish %s expect=%d: %v", subject, expected, err)
		}
		if ack.Sequence != wantSequence || ack.Duplicate {
			t.Fatalf("publish %s ack=%+v, want seq=%d duplicate=false", subject, ack, wantSequence)
		}
	}

	publish("cas.a", 0, 1)
	publish("cas.b", 0, 2)

	before, err := stream.Info(testContext(t))
	if err != nil {
		t.Fatalf("stream state before stale CAS: %v", err)
	}
	_, staleErr := publishSubjectCAS(t, harness.admin, "cas.a", "stale", 0, "")
	if got := classifyWrongLastSequence(t, operationJournalCAS, staleErr); got != "cas-conflict" {
		t.Fatalf("journal CAS classification=%s", got)
	}
	if !errors.Is(staleErr, jetstream.ErrKeyExists) {
		t.Fatalf("raw journal CAS no longer matches ErrKeyExists: %v", staleErr)
	}
	after, err := stream.Info(testContext(t))
	if err != nil {
		t.Fatalf("stream state after stale CAS: %v", err)
	}
	if after.State.Msgs != before.State.Msgs || after.State.LastSeq != before.State.LastSeq {
		t.Fatalf(
			"refused subject CAS moved stream: before=%d/%d after=%d/%d",
			before.State.Msgs,
			before.State.LastSeq,
			after.State.Msgs,
			after.State.LastSeq,
		)
	}

	// The cursor is subject-scoped, but its value is the latest global stream
	// sequence on that subject. It therefore jumps as the two subjects interleave.
	publish("cas.a", 1, 3)
	publish("cas.b", 2, 4)
	publish("cas.a", 3, 5)
	publish("cas.b", 4, 6)
	_, ordinalErr := publishSubjectCAS(t, harness.admin, "cas.b", "wrong ordinal", 3, "")
	classifyWrongLastSequence(t, operationJournalCAS, ordinalErr)

	t.Logf(
		"TRACE subject-cas accepted=[a@1,b@2,a@3,b@4,a@5,b@6] stale=400/10071 ErrKeyExists=true state-unchanged cursor=latest-global-stream-sequence",
	)
}

func TestKVRevisionLifecycle(t *testing.T) {
	harness := startJetStream(t)
	ctx := testContext(t)
	traces := make([]string, 0, 12)

	t.Run("concurrent create and single CAS winner", func(t *testing.T) {
		const contenders = 32
		bucket := createKeyValue(t, harness.admin, jetstream.KeyValueConfig{
			Bucket:   "ASSUME_KV_RACES",
			History:  8,
			Storage:  jetstream.FileStorage,
			Replicas: 1,
		})
		type result struct {
			revision uint64
			err      error
		}
		start := make(chan struct{})
		results := make(chan result, contenders)
		var workers sync.WaitGroup
		for contender := range contenders {
			workers.Add(1)
			go func() {
				defer workers.Done()
				<-start
				revision, err := bucket.Create(ctx, "one-key", []byte(fmt.Sprintf("contender-%d", contender)))
				results <- result{revision: revision, err: err}
			}()
		}
		close(start)
		workers.Wait()
		close(results)

		winners := 0
		losers := 0
		for got := range results {
			switch {
			case got.err == nil:
				winners++
			case classifyWrongLastSequence(t, operationKVCreate, got.err) == "key-exists":
				losers++
			}
		}
		if winners != 1 || losers != contenders-1 {
			t.Fatalf("concurrent create winners=%d losers=%d, want 1/%d", winners, losers, contenders-1)
		}

		initialRevision, err := bucket.Create(ctx, "cas-key", []byte("initial"))
		if err != nil {
			t.Fatalf("create CAS key: %v", err)
		}
		start = make(chan struct{})
		casResults := make(chan result, 2)
		workers = sync.WaitGroup{}
		for contender := range 2 {
			workers.Add(1)
			go func() {
				defer workers.Done()
				<-start
				revision, err := bucket.Update(
					ctx,
					"cas-key",
					[]byte(fmt.Sprintf("racer-%d", contender)),
					initialRevision,
				)
				casResults <- result{revision: revision, err: err}
			}()
		}
		close(start)
		workers.Wait()
		close(casResults)

		winners = 0
		losers = 0
		for got := range casResults {
			switch {
			case got.err == nil:
				winners++
			case classifyWrongLastSequence(t, operationKVUpdate, got.err) == "revision-mismatch":
				if !errors.Is(got.err, jetstream.ErrKeyRevisionMismatch) {
					t.Fatalf("stale KV update does not match ErrKeyRevisionMismatch: %v", got.err)
				}
				losers++
			}
		}
		if winners != 1 || losers != 1 {
			t.Fatalf("revision CAS race winners=%d losers=%d, want 1/1", winners, losers)
		}
		traces = append(traces, fmt.Sprintf("create-race=%d/%d cas-race=%d/%d", 1, contenders-1, winners, losers))
	})

	bucket := createKeyValue(t, harness.admin, jetstream.KeyValueConfig{
		Bucket:   "ASSUME_KV_LIFECYCLE",
		History:  64,
		Storage:  jetstream.FileStorage,
		Replicas: 1,
	})
	created, err := bucket.Create(ctx, "alpha", []byte("created"))
	if err != nil || created != 1 {
		t.Fatalf("create alpha: revision=%d err=%v, want 1", created, err)
	}
	_, duplicateCreateErr := bucket.Create(ctx, "alpha", []byte("duplicate"))
	if got := classifyWrongLastSequence(t, operationKVCreate, duplicateCreateErr); got != "key-exists" {
		t.Fatalf("duplicate create classification=%s", got)
	}
	if !errors.Is(duplicateCreateErr, jetstream.ErrKeyExists) {
		t.Fatalf("duplicate KV create no longer matches ErrKeyExists: %v", duplicateCreateErr)
	}
	other, err := bucket.Create(ctx, "other", []byte("other"))
	if err != nil || other != 2 {
		t.Fatalf("create other: revision=%d err=%v, want 2", other, err)
	}
	updated, err := bucket.Update(ctx, "alpha", []byte("updated"), created)
	if err != nil || updated != 3 {
		t.Fatalf("update alpha: revision=%d err=%v, want 3", updated, err)
	}
	_, staleUpdateErr := bucket.Update(ctx, "alpha", []byte("stale"), created)
	if got := classifyWrongLastSequence(t, operationKVUpdate, staleUpdateErr); got != "revision-mismatch" {
		t.Fatalf("stale update classification=%s", got)
	}
	if !errors.Is(staleUpdateErr, jetstream.ErrKeyRevisionMismatch) {
		t.Fatalf("stale update does not match ErrKeyRevisionMismatch: %v", staleUpdateErr)
	}
	if !errors.Is(staleUpdateErr, jetstream.ErrKeyExists) {
		t.Fatalf("stale KV update no longer matches ErrKeyExists: %v", staleUpdateErr)
	}
	if err := bucket.Delete(ctx, "alpha", jetstream.LastRevision(created)); err == nil {
		t.Fatal("stale revision delete succeeded")
	} else {
		classifyWrongLastSequence(t, operationKVDelete, err)
	}
	if err := bucket.Purge(ctx, "alpha", jetstream.LastRevision(created)); err == nil {
		t.Fatal("stale revision purge succeeded")
	} else {
		classifyWrongLastSequence(t, operationKVPurge, err)
	}

	if err := bucket.Delete(ctx, "alpha", jetstream.LastRevision(updated)); err != nil {
		t.Fatalf("delete alpha at revision %d: %v", updated, err)
	}
	history := mustKVHistory(t, bucket, "alpha")
	assertKVHistory(t, history, []uint64{1, 3, 4}, []jetstream.KeyValueOp{
		jetstream.KeyValuePut,
		jetstream.KeyValuePut,
		jetstream.KeyValueDelete,
	})
	afterDelete, err := bucket.Create(ctx, "alpha", []byte("after-delete"))
	if err != nil || afterDelete != 5 {
		t.Fatalf("create alpha after delete: revision=%d err=%v, want 5", afterDelete, err)
	}
	if err := bucket.Purge(ctx, "alpha", jetstream.LastRevision(afterDelete)); err != nil {
		t.Fatalf("purge alpha at revision %d: %v", afterDelete, err)
	}
	history = mustKVHistory(t, bucket, "alpha")
	assertKVHistory(t, history, []uint64{6}, []jetstream.KeyValueOp{jetstream.KeyValuePurge})
	afterPurge, err := bucket.Create(ctx, "alpha", []byte("after-purge"))
	if err != nil || afterPurge != 7 {
		t.Fatalf("create alpha after purge: revision=%d err=%v, want 7", afterPurge, err)
	}

	startRevision, err := bucket.Create(ctx, "read-after-ack", []byte("initial"))
	if err != nil || startRevision != 8 {
		t.Fatalf("create read-after-ack key: revision=%d err=%v, want 8", startRevision, err)
	}
	const (
		writers         = 8
		writesPerWriter = 64
	)
	start := make(chan struct{})
	failures := make(chan error, writers)
	var staleReads atomic.Int64
	var workers sync.WaitGroup
	for writer := range writers {
		workers.Add(1)
		go func() {
			defer workers.Done()
			<-start
			for write := range writesPerWriter {
				for {
					before, err := bucket.Get(ctx, "read-after-ack")
					if err != nil {
						failures <- fmt.Errorf("writer %d pre-read %d: %w", writer, write, err)
						return
					}
					acknowledged, err := bucket.Update(
						ctx,
						"read-after-ack",
						[]byte(fmt.Sprintf("writer-%d-write-%d", writer, write)),
						before.Revision(),
					)
					if errors.Is(err, jetstream.ErrKeyRevisionMismatch) {
						continue
					}
					if err != nil {
						failures <- fmt.Errorf("writer %d update %d: %w", writer, write, err)
						return
					}
					after, err := bucket.Get(ctx, "read-after-ack")
					if err != nil {
						failures <- fmt.Errorf("writer %d post-read %d: %w", writer, write, err)
						return
					}
					if after.Revision() < acknowledged {
						staleReads.Add(1)
						failures <- fmt.Errorf(
							"writer %d read revision %d after acknowledged revision %d",
							writer,
							after.Revision(),
							acknowledged,
						)
						return
					}
					break
				}
			}
		}()
	}
	close(start)
	workers.Wait()
	close(failures)
	for failure := range failures {
		t.Error(failure)
	}
	finalEntry, err := bucket.Get(ctx, "read-after-ack")
	if err != nil {
		t.Fatalf("read final stressed entry: %v", err)
	}
	if finalEntry.Revision() != 520 {
		t.Fatalf("final bucket revision=%d, want 520", finalEntry.Revision())
	}

	traces = append(
		traces,
		fmt.Sprintf(
			"lifecycle=[create:1 other:2 update:3 delete:4 recreate:5 purge:6 recreate:7] read-after-ack=[start:8 writes:512 final:%d stale:%d] ErrKeyExists=[kv-create:true,kv-update:true]",
			finalEntry.Revision(),
			staleReads.Load(),
		),
	)
	for _, trace := range traces {
		t.Logf("TRACE kv %s errors=operation-context+400/10071", trace)
	}
}

func mustKVHistory(t *testing.T, bucket jetstream.KeyValue, key string) []jetstream.KeyValueEntry {
	t.Helper()
	history, err := bucket.History(testContext(t), key)
	if err != nil {
		t.Fatalf("history %s: %v", key, err)
	}
	return history
}

func assertKVHistory(
	t *testing.T,
	history []jetstream.KeyValueEntry,
	revisions []uint64,
	operations []jetstream.KeyValueOp,
) {
	t.Helper()
	if len(history) != len(revisions) || len(history) != len(operations) {
		t.Fatalf("history length=%d, want revisions=%d operations=%d", len(history), len(revisions), len(operations))
	}
	for index, entry := range history {
		if entry.Revision() != revisions[index] || entry.Operation() != operations[index] {
			t.Fatalf(
				"history[%d]=revision %d operation %s, want %d/%s",
				index,
				entry.Revision(),
				entry.Operation(),
				revisions[index],
				operations[index],
			)
		}
	}
}

func TestDedupAndCASPrecedence(t *testing.T) {
	harness := startJetStream(t)
	ctx := testContext(t)
	defaultStream := createStream(t, harness.admin, jetstream.StreamConfig{
		Name:              "ASSUME_DEDUP_DEFAULT",
		Subjects:          []string{"default.>"},
		MaxMsgs:           -1,
		MaxBytes:          -1,
		MaxMsgsPerSubject: -1,
		Storage:           jetstream.FileStorage,
		Replicas:          1,
	})
	defaultInfo, err := defaultStream.Info(ctx)
	if err != nil {
		t.Fatalf("read default duplicate window: %v", err)
	}
	if defaultInfo.Config.Duplicates != 2*time.Minute {
		t.Fatalf("default duplicate window=%s, want 2m", defaultInfo.Config.Duplicates)
	}

	stream := createStream(t, harness.admin, jetstream.StreamConfig{
		Name:              "ASSUME_DEDUP_CAS",
		Subjects:          []string{"dedup.>", "precedence.>"},
		MaxMsgs:           -1,
		MaxBytes:          -1,
		MaxMsgsPerSubject: -1,
		Storage:           jetstream.FileStorage,
		Replicas:          1,
		Duplicates:        configuredDuplicateWait,
	})
	configuredInfo, err := stream.Info(ctx)
	if err != nil {
		t.Fatalf("read configured duplicate window: %v", err)
	}
	if configuredInfo.Config.Duplicates != configuredDuplicateWait {
		t.Fatalf("configured duplicate window=%s, want %s", configuredInfo.Config.Duplicates, configuredDuplicateWait)
	}

	firstStartedAt := time.Now()
	first, err := harness.admin.Publish(ctx, "dedup.window", []byte("first"), jetstream.WithMsgID("window-id"))
	firstAcknowledgedAt := time.Now()
	if err != nil || first.Sequence != 1 || first.Duplicate {
		t.Fatalf("first dedup publish ack=%+v err=%v", first, err)
	}
	immediate, err := harness.admin.Publish(ctx, "dedup.window", []byte("retry"), jetstream.WithMsgID("window-id"))
	if err != nil || immediate.Sequence != 1 || !immediate.Duplicate {
		t.Fatalf("immediate duplicate ack=%+v err=%v", immediate, err)
	}
	time.Sleep(1500 * time.Millisecond)
	insideStartedAt := time.Now()
	inside, err := harness.admin.Publish(ctx, "dedup.window", []byte("inside"), jetstream.WithMsgID("window-id"))
	insideAcknowledgedAt := time.Now()
	// The window opens no earlier than firstStartedAt, so measuring the inside
	// publish from there over-estimates its elapsed time — the safe direction
	// for an "inside the original window" claim.
	insideAcknowledgedOffset := insideAcknowledgedAt.Sub(firstStartedAt)
	if insideAcknowledgedOffset >= configuredDuplicateWait {
		t.Fatalf(
			"dedup no-refresh witness inconclusive: inside publish interval=[%s,%s] escaped original window=%s",
			insideStartedAt.Sub(firstStartedAt),
			insideAcknowledgedAt.Sub(firstStartedAt),
			configuredDuplicateWait,
		)
	}
	if err != nil || inside.Sequence != 1 || !inside.Duplicate {
		t.Fatalf("inside-window duplicate ack=%+v err=%v", inside, err)
	}
	// This lands after the original's window but before a window measured from
	// the suppressed retry would expire, proving retries do not refresh it. The
	// retry at ~1.5s puts the corridor's far edge near ~3.5s, so the ~2.5s
	// outside publish keeps at least ~500ms of slack on both corridor bounds.
	time.Sleep(1000 * time.Millisecond)
	outsideStartedAt := time.Now()
	outside, err := harness.admin.Publish(ctx, "dedup.window", []byte("outside"), jetstream.WithMsgID("window-id"))
	outsideAcknowledgedAt := time.Now()
	retryOffset := insideStartedAt.Sub(firstAcknowledgedAt)
	outsideStartedOffset := outsideStartedAt.Sub(firstAcknowledgedAt)
	outsideAcknowledgedOffset := outsideAcknowledgedAt.Sub(firstAcknowledgedAt)
	corridorEnd := configuredDuplicateWait + retryOffset
	if outsideStartedOffset <= configuredDuplicateWait || outsideAcknowledgedOffset >= corridorEnd {
		t.Fatalf(
			"dedup no-refresh witness inconclusive: outside publish interval=[%s,%s] not wholly inside corridor=(%s,%s), retry-offset=%s",
			outsideStartedOffset,
			outsideAcknowledgedOffset,
			configuredDuplicateWait,
			corridorEnd,
			retryOffset,
		)
	}
	if err != nil || outside.Sequence != 2 || outside.Duplicate {
		t.Fatalf("outside-window publish ack=%+v err=%v", outside, err)
	}

	casFirst, err := publishSubjectCAS(t, harness.admin, "precedence.a", "cas", 0, "cas-id")
	if err != nil || casFirst.Sequence != 3 || casFirst.Duplicate {
		t.Fatalf("first CAS+dedup ack=%+v err=%v", casFirst, err)
	}
	_, exactRetryErr := publishSubjectCAS(t, harness.admin, "precedence.a", "cas", 0, "cas-id")
	classifyWrongLastSequence(t, operationJournalCAS, exactRetryErr)
	currentRetry, err := publishSubjectCAS(t, harness.admin, "precedence.a", "changed bytes", 3, "cas-id")
	if err != nil || currentRetry.Sequence != 3 || !currentRetry.Duplicate {
		t.Fatalf("current-CAS duplicate ack=%+v err=%v", currentRetry, err)
	}
	otherSubject, err := publishSubjectCAS(t, harness.admin, "precedence.b", "other subject", 0, "cas-id")
	if err != nil || otherSubject.Sequence != 3 || !otherSubject.Duplicate {
		t.Fatalf("stream-wide duplicate ack=%+v err=%v", otherSubject, err)
	}

	t.Logf(
		"TRACE dedup default=2m configured=%s pure=[1/new,1/duplicate,1/duplicate,2/new] corridor=(%s,%s) outside=[%s,%s] retry-offset=%s cas=[3/new,400/10071,3/duplicate] other-subject=3/duplicate namespace=stream-wide precedence=CAS-before-dedup",
		configuredDuplicateWait,
		configuredDuplicateWait,
		corridorEnd,
		outsideStartedOffset,
		outsideAcknowledgedOffset,
		retryOffset,
	)
}
