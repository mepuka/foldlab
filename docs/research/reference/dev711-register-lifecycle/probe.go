// A throwaway, real-server probe for DEV-711's JetStream KV lifecycle audit.
//
// Run from the repository's go/ directory so the checked-in module pins select
// nats-server v2.14.4 and nats.go v1.53.1:
//
//	go run ../docs/research/reference/dev711-register-lifecycle/probe.go
package main

import (
	"context"
	"errors"
	"fmt"
	"os"
	"time"

	"github.com/nats-io/nats-server/v2/server"
	"github.com/nats-io/nats.go"
	"github.com/nats-io/nats.go/jetstream"
)

const key = "work.digest"

func main() {
	store, err := os.MkdirTemp("", "dev711-register-lifecycle-")
	must("temporary store", err)
	defer os.RemoveAll(store)

	srv, err := server.NewServer(&server.Options{
		ServerName: "dev711-register-lifecycle",
		JetStream:  true,
		StoreDir:   store,
		DontListen: true,
		NoLog:      true,
		NoSigs:     true,
	})
	must("new server", err)
	go srv.Start()
	if !srv.ReadyForConnections(10 * time.Second) {
		panic("embedded server not ready")
	}
	defer func() {
		srv.Shutdown()
		srv.WaitForShutdown()
	}()

	nc, err := nats.Connect("", nats.InProcessServer(srv))
	must("connect", err)
	defer nc.Close()
	js, err := jetstream.New(nc)
	must("jetstream", err)

	ctx, cancel := context.WithTimeout(context.Background(), 30*time.Second)
	defer cancel()

	fmt.Printf("pins nats-server=%s nats.go=v1.53.1 storage=file replicas=1 clustered=false\n", server.VERSION)
	bucketDeleteRecreate(ctx, js)
	streamDeleteRecreate(ctx, js)
	streamPurge(ctx, js)
	keyDeleteRecreate(ctx, js)
	keyPurgeRecreate(ctx, js)
	tombstoneRemoveRecreate(ctx, js)
}

func bucketDeleteRecreate(ctx context.Context, js jetstream.JetStream) {
	const bucket = "DEV711_BUCKET_DELETE"
	oldKV := createBucket(ctx, js, bucket)
	oldToken := create(ctx, oldKV, "old-holder/open")
	oldOutcomeRev := update(ctx, oldKV, oldToken, "old-holder/outcome-A")
	before := get(ctx, oldKV)
	must("delete bucket", js.DeleteKeyValue(ctx, bucket))
	_, lookupErr := js.KeyValue(ctx, bucket)

	newKV := createBucket(ctx, js, bucket)
	newToken := create(ctx, newKV, "new-holder/open")
	staleCommitRev, staleCommitErr := oldKV.Update(ctx, key, []byte("old-holder/stale-outcome"), oldToken)
	after := get(ctx, newKV)
	fmt.Printf("bucket-delete-recreate old_token=%d old_outcome_rev=%d before=%q deleted_lookup_bucket_not_found=%t new_token=%d token_reused=%t stale_old_token_commit_accepted=%t stale_commit_rev=%d after=%q\n",
		oldToken, oldOutcomeRev, before, errors.Is(lookupErr, jetstream.ErrBucketNotFound), newToken, newToken == oldToken, staleCommitErr == nil, staleCommitRev, after)
}

func streamDeleteRecreate(ctx context.Context, js jetstream.JetStream) {
	const bucket = "DEV711_STREAM_DELETE"
	oldKV := createBucket(ctx, js, bucket)
	oldToken := create(ctx, oldKV, "old-holder/open")
	oldOutcomeRev := update(ctx, oldKV, oldToken, "old-holder/outcome-A")
	must("delete backing stream", js.DeleteStream(ctx, "KV_"+bucket))

	newKV := createBucket(ctx, js, bucket)
	newToken := create(ctx, newKV, "new-holder/open")
	staleCommitRev, staleCommitErr := oldKV.Update(ctx, key, []byte("old-holder/stale-outcome"), oldToken)
	fmt.Printf("stream-delete-recreate old_token=%d old_outcome_rev=%d new_token=%d token_reused=%t stale_old_token_commit_accepted=%t stale_commit_rev=%d after=%q\n",
		oldToken, oldOutcomeRev, newToken, newToken == oldToken, staleCommitErr == nil, staleCommitRev, get(ctx, newKV))
}

func streamPurge(ctx context.Context, js jetstream.JetStream) {
	const bucket = "DEV711_STREAM_PURGE"
	kv := createBucket(ctx, js, bucket)
	oldToken := create(ctx, kv, "old-holder/open")
	oldOutcomeRev := update(ctx, kv, oldToken, "old-holder/outcome-A")
	stream, err := js.Stream(ctx, "KV_"+bucket)
	must("get backing stream", err)
	before, err := stream.Info(ctx)
	must("stream info before purge", err)
	must("purge backing stream", stream.Purge(ctx))
	afterPurge, err := stream.Info(ctx)
	must("stream info after purge", err)
	_, forgottenErr := kv.Get(ctx, key)
	newToken := create(ctx, kv, "new-holder/open")
	_, staleCommitErr := kv.Update(ctx, key, []byte("old-holder/stale-outcome"), oldToken)
	newOutcomeRev := update(ctx, kv, newToken, "new-holder/outcome-B")
	fmt.Printf("stream-purge old_token=%d old_outcome_rev=%d before_msgs=%d before_first=%d before_last=%d after_msgs=%d after_first=%d after_last=%d old_outcome_forgotten=%t new_token=%d token_reused=%t stale_old_token_refused=%t new_outcome_rev=%d after=%q\n",
		oldToken, oldOutcomeRev, before.State.Msgs, before.State.FirstSeq, before.State.LastSeq,
		afterPurge.State.Msgs, afterPurge.State.FirstSeq, afterPurge.State.LastSeq,
		errors.Is(forgottenErr, jetstream.ErrKeyNotFound), newToken, newToken == oldToken,
		errors.Is(staleCommitErr, jetstream.ErrKeyRevisionMismatch), newOutcomeRev, get(ctx, kv))
}

func keyDeleteRecreate(ctx context.Context, js jetstream.JetStream) {
	const bucket = "DEV711_KEY_DELETE"
	kv := createBucket(ctx, js, bucket)
	oldToken := create(ctx, kv, "old-holder/open")
	oldOutcomeRev := update(ctx, kv, oldToken, "old-holder/outcome-A")
	must("delete key", kv.Delete(ctx, key, jetstream.LastRevision(oldOutcomeRev)))
	_, deletedErr := kv.Get(ctx, key)
	deleteMarker := lastHistory(ctx, kv)
	newToken := create(ctx, kv, "new-holder/open")
	_, staleCommitErr := kv.Update(ctx, key, []byte("old-holder/stale-outcome"), oldToken)
	newOutcomeRev := update(ctx, kv, newToken, "new-holder/outcome-B")
	fmt.Printf("key-delete-recreate old_token=%d old_outcome_rev=%d delete_marker_rev=%d delete_marker_op=%s key_absent=%t new_token=%d token_reused=%t stale_old_token_refused=%t new_outcome_rev=%d after=%q\n",
		oldToken, oldOutcomeRev, deleteMarker.Revision(), deleteMarker.Operation(), errors.Is(deletedErr, jetstream.ErrKeyNotFound), newToken, newToken == oldToken,
		errors.Is(staleCommitErr, jetstream.ErrKeyRevisionMismatch), newOutcomeRev, get(ctx, kv))
}

func keyPurgeRecreate(ctx context.Context, js jetstream.JetStream) {
	const bucket = "DEV711_KEY_PURGE"
	kv := createBucket(ctx, js, bucket)
	oldToken := create(ctx, kv, "old-holder/open")
	oldOutcomeRev := update(ctx, kv, oldToken, "old-holder/outcome-A")
	must("purge key", kv.Purge(ctx, key, jetstream.LastRevision(oldOutcomeRev)))
	_, purgedErr := kv.Get(ctx, key)
	purgeMarker := lastHistory(ctx, kv)
	newToken := create(ctx, kv, "new-holder/open")
	_, staleCommitErr := kv.Update(ctx, key, []byte("old-holder/stale-outcome"), oldToken)
	newOutcomeRev := update(ctx, kv, newToken, "new-holder/outcome-B")
	fmt.Printf("key-purge-recreate old_token=%d old_outcome_rev=%d purge_marker_rev=%d purge_marker_op=%s key_absent=%t new_token=%d token_reused=%t stale_old_token_refused=%t new_outcome_rev=%d after=%q\n",
		oldToken, oldOutcomeRev, purgeMarker.Revision(), purgeMarker.Operation(), errors.Is(purgedErr, jetstream.ErrKeyNotFound), newToken, newToken == oldToken,
		errors.Is(staleCommitErr, jetstream.ErrKeyRevisionMismatch), newOutcomeRev, get(ctx, kv))
}

func tombstoneRemoveRecreate(ctx context.Context, js jetstream.JetStream) {
	const bucket = "DEV711_TOMBSTONE_REMOVE"
	kv := createBucket(ctx, js, bucket)
	oldToken := create(ctx, kv, "old-holder/open")
	oldOutcomeRev := update(ctx, kv, oldToken, "old-holder/outcome-A")
	must("delete key before removing tombstone", kv.Delete(ctx, key, jetstream.LastRevision(oldOutcomeRev)))
	deleteMarker := lastHistory(ctx, kv)
	must("remove delete tombstone", kv.PurgeDeletes(ctx, jetstream.DeleteMarkersOlderThan(-1)))
	_, absentErr := kv.Get(ctx, key)
	stream, err := js.Stream(ctx, "KV_"+bucket)
	must("get backing stream after tombstone removal", err)
	afterRemoval, err := stream.Info(ctx)
	must("stream info after tombstone removal", err)
	newToken := create(ctx, kv, "new-holder/open")
	_, staleCommitErr := kv.Update(ctx, key, []byte("old-holder/stale-outcome"), oldToken)
	newOutcomeRev := update(ctx, kv, newToken, "new-holder/outcome-B")
	fmt.Printf("tombstone-remove-recreate old_token=%d old_outcome_rev=%d delete_marker_rev=%d after_remove_msgs=%d after_remove_first=%d after_remove_last=%d key_absent=%t new_token=%d token_reused=%t stale_old_token_refused=%t new_outcome_rev=%d after=%q\n",
		oldToken, oldOutcomeRev, deleteMarker.Revision(), afterRemoval.State.Msgs, afterRemoval.State.FirstSeq, afterRemoval.State.LastSeq,
		errors.Is(absentErr, jetstream.ErrKeyNotFound), newToken, newToken == oldToken,
		errors.Is(staleCommitErr, jetstream.ErrKeyRevisionMismatch), newOutcomeRev, get(ctx, kv))
}

func createBucket(ctx context.Context, js jetstream.JetStream, bucket string) jetstream.KeyValue {
	kv, err := js.CreateKeyValue(ctx, jetstream.KeyValueConfig{
		Bucket:   bucket,
		History:  10,
		Storage:  jetstream.FileStorage,
		Replicas: 1,
	})
	must("create bucket "+bucket, err)
	return kv
}

func create(ctx context.Context, kv jetstream.KeyValue, value string) uint64 {
	rev, err := kv.Create(ctx, key, []byte(value))
	must("create key", err)
	return rev
}

func update(ctx context.Context, kv jetstream.KeyValue, revision uint64, value string) uint64 {
	rev, err := kv.Update(ctx, key, []byte(value), revision)
	must("update key", err)
	return rev
}

func get(ctx context.Context, kv jetstream.KeyValue) string {
	e, err := kv.Get(ctx, key)
	must("get key", err)
	return string(e.Value())
}

func lastHistory(ctx context.Context, kv jetstream.KeyValue) jetstream.KeyValueEntry {
	history, err := kv.History(ctx, key)
	must("read key history", err)
	if len(history) == 0 {
		panic("read key history: empty")
	}
	return history[len(history)-1]
}

func must(op string, err error) {
	if err != nil {
		panic(fmt.Sprintf("%s: %v", op, err))
	}
}
