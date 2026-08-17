// A throwaway, real-server probe for DEV-711's proposed StreamInfo.Created
// backing-stream incarnation pin.
//
// Run from the repository's go/ directory so the checked-in module pins
// nats-server v2.14.4 and nats.go v1.53.1:
//
//	go run ../docs/research/reference/dev711-created-time-incarnation/probe.go
package main

import (
	"context"
	"encoding/json"
	"fmt"
	"os"
	"time"

	"github.com/nats-io/nats-server/v2/server"
	"github.com/nats-io/nats.go"
	"github.com/nats-io/nats.go/jetstream"
)

const (
	bucket = "DEV711_CREATED_RESTORE"
	key    = "work.digest"
)

func main() {
	store, err := os.MkdirTemp("", "dev711-created-time-incarnation-")
	must("temporary store", err)
	defer os.RemoveAll(store)

	srv, err := server.NewServer(&server.Options{
		ServerName: "dev711-created-time-incarnation",
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

	oldKV, err := js.CreateKeyValue(ctx, jetstream.KeyValueConfig{
		Bucket:   bucket,
		History:  10,
		Storage:  jetstream.FileStorage,
		Replicas: 1,
	})
	must("create bucket", err)
	oldToken, err := oldKV.Create(ctx, key, []byte("old-holder/grant"))
	must("create grant", err)
	oldStream, err := js.Stream(ctx, "KV_"+bucket)
	must("bind old backing stream", err)
	oldInfo, err := oldStream.Info(ctx)
	must("old backing stream info", err)
	oldCreated := oldInfo.Created

	snapshot, snapshotConfig, snapshotState := snapshotStream(nc, "KV_"+bucket)
	oldOutcomeRevision, err := oldKV.Update(ctx, key, []byte("outcome-A"), oldToken)
	must("land outcome A", err)
	must("delete backing stream", js.DeleteStream(ctx, "KV_"+bucket))
	restoreStream(nc, snapshotConfig, snapshotState, snapshot)

	newKV, err := js.KeyValue(ctx, bucket)
	must("bind restored bucket", err)
	newStream, err := js.Stream(ctx, "KV_"+bucket)
	must("bind restored backing stream", err)
	newInfo, err := newStream.Info(ctx)
	must("restored backing stream info", err)
	restoredCreated := newInfo.Created
	restoredEntry, err := newKV.Get(ctx, key)
	must("get restored grant", err)
	secondOutcomeRevision, staleWriteErr := oldKV.Update(ctx, key, []byte("outcome-B-from-pre-delete-token"), oldToken)
	finalEntry, err := newKV.Get(ctx, key)
	must("get final outcome", err)

	fmt.Printf("pins nats-server=%s nats.go=v1.53.1 storage=file replicas=1 clustered=false\n", server.VERSION)
	fmt.Printf("snapshot-created=%s restored-created=%s created-equal=%t snapshot-last-seq=%d restored-revision=%d old-token=%d old-outcome-revision=%d pre-delete-token-accepted-after-rollback=%t second-outcome-revision=%d final=%q\n",
		oldCreated.Format(time.RFC3339Nano), restoredCreated.Format(time.RFC3339Nano), oldCreated.Equal(restoredCreated),
		snapshotState.LastSeq, restoredEntry.Revision(), oldToken, oldOutcomeRevision, staleWriteErr == nil,
		secondOutcomeRevision, string(finalEntry.Value()))
	restartSnapshotDrift(ctx)
}

func restartSnapshotDrift(ctx context.Context) {
	store, err := os.MkdirTemp("", "dev711-created-time-restart-")
	must("temporary restart store", err)
	defer os.RemoveAll(store)

	srv1, nc1, js1 := startServer(store, "dev711-created-before-restart")
	kv, err := js1.CreateKeyValue(ctx, jetstream.KeyValueConfig{
		Bucket:   "DEV711_CREATED_RESTART",
		History:  10,
		Storage:  jetstream.FileStorage,
		Replicas: 1,
	})
	must("create restart bucket", err)
	_, err = kv.Create(ctx, key, []byte("grant"))
	must("create restart grant", err)
	stream1, err := js1.Stream(ctx, "KV_DEV711_CREATED_RESTART")
	must("bind stream before restart", err)
	info1, err := stream1.Info(ctx)
	must("stream info before restart", err)
	nc1.Close()
	stopServer(srv1)

	// Keep the wall-clock values visibly distinct if the server's persisted
	// metadata path accidentally substitutes recovery time for creation time.
	time.Sleep(10 * time.Millisecond)
	srv2, nc2, js2 := startServer(store, "dev711-created-after-restart")
	stream2, err := js2.Stream(ctx, "KV_DEV711_CREATED_RESTART")
	must("bind stream after restart", err)
	info2, err := stream2.Info(ctx)
	must("stream info after restart", err)
	_, err = js2.UpdateStream(ctx, info2.Config)
	must("no-op update after restart", err)
	nc2.Close()
	stopServer(srv2)

	time.Sleep(10 * time.Millisecond)
	srv3, nc3, js3 := startServer(store, "dev711-created-after-update-restart")
	defer nc3.Close()
	defer stopServer(srv3)
	stream3, err := js3.Stream(ctx, "KV_DEV711_CREATED_RESTART")
	must("bind stream after update and restart", err)
	info3, err := stream3.Info(ctx)
	must("stream info after update and restart", err)
	snapshot, config, state := snapshotStream(nc3, "KV_DEV711_CREATED_RESTART")
	must("delete twice-restarted stream", js3.DeleteStream(ctx, "KV_DEV711_CREATED_RESTART"))
	restoreStream(nc3, config, state, snapshot)
	stream4, err := js3.Stream(ctx, "KV_DEV711_CREATED_RESTART")
	must("bind restored twice-restarted stream", err)
	info4, err := stream4.Info(ctx)
	must("stream info after twice-restarted snapshot restore", err)
	fmt.Printf("restart-original-created=%s live-after-restart-created=%s after-noop-update-and-second-restart-created=%s restored-from-post-restart-snapshot-created=%s live-preserved-across-first-restart=%t noop-update-preserved-created-after-next-restart=%t snapshot-restore-preserved-original=%t\n",
		info1.Created.Format(time.RFC3339Nano), info2.Created.Format(time.RFC3339Nano), info3.Created.Format(time.RFC3339Nano), info4.Created.Format(time.RFC3339Nano),
		info1.Created.Equal(info2.Created), info1.Created.Equal(info3.Created), info1.Created.Equal(info4.Created))
}

func startServer(store, name string) (*server.Server, *nats.Conn, jetstream.JetStream) {
	srv, err := server.NewServer(&server.Options{
		ServerName: name,
		JetStream:  true,
		StoreDir:   store,
		DontListen: true,
		NoLog:      true,
		NoSigs:     true,
	})
	must("new restart server", err)
	go srv.Start()
	if !srv.ReadyForConnections(10 * time.Second) {
		panic("restart server not ready")
	}
	nc, err := nats.Connect("", nats.InProcessServer(srv))
	must("connect restart server", err)
	js, err := jetstream.New(nc)
	must("restart jetstream", err)
	return srv, nc, js
}

func stopServer(srv *server.Server) {
	srv.Shutdown()
	srv.WaitForShutdown()
}

func snapshotStream(nc *nats.Conn, streamName string) ([]byte, server.StreamConfig, server.StreamState) {
	deliver := nats.NewInbox()
	sub, err := nc.SubscribeSync(deliver)
	must("subscribe for snapshot", err)
	defer sub.Unsubscribe()
	must("flush snapshot subscription", nc.Flush())

	req, err := json.Marshal(&server.JSApiStreamSnapshotRequest{
		DeliverSubject: deliver,
		ChunkSize:      1024,
	})
	must("encode snapshot request", err)
	msg, err := nc.Request(fmt.Sprintf(server.JSApiStreamSnapshotT, streamName), req, 5*time.Second)
	must("request snapshot", err)
	var response server.JSApiStreamSnapshotResponse
	must("decode snapshot response", json.Unmarshal(msg.Data, &response))
	if response.Error != nil {
		panic(fmt.Sprintf("request snapshot: %+v", response.Error))
	}
	if response.Config == nil || response.State == nil {
		panic("request snapshot: response omitted config or state")
	}

	var snapshot []byte
	for {
		chunk, err := sub.NextMsg(5 * time.Second)
		must("receive snapshot chunk", err)
		if len(chunk.Data) == 0 {
			break
		}
		snapshot = append(snapshot, chunk.Data...)
		if chunk.Reply != "" {
			must("ack snapshot chunk", chunk.Respond(nil))
		}
	}
	return snapshot, *response.Config, *response.State
}

func restoreStream(nc *nats.Conn, config server.StreamConfig, state server.StreamState, snapshot []byte) {
	req, err := json.Marshal(&server.JSApiStreamRestoreRequest{Config: config, State: state})
	must("encode restore request", err)
	msg, err := nc.Request(fmt.Sprintf(server.JSApiStreamRestoreT, config.Name), req, 5*time.Second)
	must("request restore", err)
	var response server.JSApiStreamRestoreResponse
	must("decode restore response", json.Unmarshal(msg.Data, &response))
	if response.Error != nil {
		panic(fmt.Sprintf("request restore: %+v", response.Error))
	}
	for offset := 0; offset < len(snapshot); {
		end := min(offset+512, len(snapshot))
		_, err := nc.Request(response.DeliverSubject, snapshot[offset:end], 5*time.Second)
		must("send restore chunk", err)
		offset = end
	}
	_, err = nc.Request(response.DeliverSubject, nil, 5*time.Second)
	must("finish restore", err)
}

func must(op string, err error) {
	if err != nil {
		panic(fmt.Sprintf("%s: %v", op, err))
	}
}
