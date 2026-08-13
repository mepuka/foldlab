// Daemon-level regression tests for the multi-writer findings (issues #1 JR2,
// #10 JR3). These drive the real *daemon serve path as a client would and
// assert the CORRECTED behavior, so each fails on the pre-fix code. White-box:
// a competing writer is injected on the shared JetStream, which a black-box
// single-daemon spawn cannot express (the daemon owns its in-process store).
package main

import (
	"context"
	"encoding/json"
	"sync/atomic"
	"testing"
	"time"

	"github.com/nats-io/nats-server/v2/server"
	"github.com/nats-io/nats.go"
	"github.com/nats-io/nats.go/jetstream"

	"foldlab/journal"
)

func regressionJetStream(t *testing.T) jetstream.JetStream {
	t.Helper()
	opts := &server.Options{ServerName: "jr-reg", JetStream: true, StoreDir: t.TempDir(), DontListen: true, NoSigs: true}
	srv, err := server.NewServer(opts)
	if err != nil {
		t.Fatalf("new server: %v", err)
	}
	go srv.Start()
	if !srv.ReadyForConnections(10 * time.Second) {
		t.Fatal("embedded server not ready")
	}
	t.Cleanup(func() { srv.Shutdown(); srv.WaitForShutdown() })
	nc, err := nats.Connect("", nats.InProcessServer(srv))
	if err != nil {
		t.Fatalf("connect: %v", err)
	}
	t.Cleanup(nc.Close)
	js, err := jetstream.New(nc)
	if err != nil {
		t.Fatalf("jetstream: %v", err)
	}
	return js
}

func newRegressionDaemon(js jetstream.JetStream) *daemon {
	return &daemon{js: js, journals: map[string]*journal.Journal{}, effectors: nil}
}

func serveCall(t *testing.T, d *daemon, req request) map[string]any {
	t.Helper()
	if len(req.ID) == 0 {
		req.ID = json.RawMessage("1")
	}
	in, err := json.Marshal(req)
	if err != nil {
		t.Fatalf("marshal req: %v", err)
	}
	raw, err := json.Marshal(d.serve(context.Background(), in))
	if err != nil {
		t.Fatalf("marshal resp: %v", err)
	}
	var m map[string]any
	if err := json.Unmarshal(raw, &m); err != nil {
		t.Fatalf("unmarshal resp: %v", err)
	}
	return m
}

// JR2 (#1) end-to-end: the daemon caches one *Journal per name and never Reads
// on the append path. Once a competing writer wins a position the daemon's
// cached cursor lost, the client must still recover through Append alone — the
// wedge heals itself, no Read request required.
func TestDaemonHealsWedgedHandleAfterLostCAS(t *testing.T) {
	js := regressionJetStream(t)
	d := newRegressionDaemon(js)

	if r := serveCall(t, d, request{Op: "open", Name: "wf"}); r["ok"] != true {
		t.Fatalf("open: %v", r)
	}
	// A competing writer wins position 0 on the same stream.
	w, err := journal.Open(context.Background(), js, "wf")
	if err != nil {
		t.Fatalf("competing open: %v", err)
	}
	if _, _, err := w.Append(context.Background(), "x"); err != nil {
		t.Fatalf("competing append: %v", err)
	}

	// The client's append via the daemon loses the CAS and is reported conflict.
	if r := serveCall(t, d, request{Op: "append", Name: "wf", Payload: "a"}); r["reason"] != "conflict" {
		t.Fatalf("first append: %v, want reason conflict", r)
	}
	// The cached cursor must have resynced: head now reflects the winner's tail.
	if h := serveCall(t, d, request{Op: "head", Name: "wf"}); h["seq"] != float64(0) {
		t.Fatalf("daemon head after conflict: seq=%v, want 0 (cursor did not resync)", h["seq"])
	}
	// Recovery without any Read: the next append chains onto the winner.
	if r := serveCall(t, d, request{Op: "append", Name: "wf", Payload: "c"}); r["ok"] != true {
		t.Fatalf("append after conflict should recover without a Read, got %v", r)
	}
}

// JR3 (#10) end-to-end: when the post-conflict re-read also fails, the daemon
// must surface reason "conflict" (the CAS proved occupancy) — not mislabel a
// genuine position conflict as a transient "unavailable".
func TestDaemonReportsConflictWhenReReadFails(t *testing.T) {
	js := regressionJetStream(t)
	fail := &atomic.Bool{}
	d := newRegressionDaemon(&failJS{JetStream: js, fail: fail})

	if r := serveCall(t, d, request{Op: "open", Name: "wf3"}); r["ok"] != true {
		t.Fatalf("open: %v", r)
	}
	w, err := journal.Open(context.Background(), js, "wf3")
	if err != nil {
		t.Fatalf("competing open: %v", err)
	}
	if _, _, err := w.Append(context.Background(), "x"); err != nil {
		t.Fatalf("competing append: %v", err)
	}

	fail.Store(true) // arm: the daemon's post-conflict re-read GetMsg will fail
	r := serveCall(t, d, request{Op: "append", Name: "wf3", Payload: "a"})
	fail.Store(false)
	if r["reason"] != "conflict" {
		t.Fatalf("real conflict with a failed re-read: reason=%v detail=%v, want conflict", r["reason"], r["detail"])
	}
}

// ---- a JetStream whose Stream re-reads (GetMsg) can be armed to fail ----

type failStream struct {
	jetstream.Stream
	fail *atomic.Bool
}

func (s *failStream) GetMsg(ctx context.Context, seq uint64, opts ...jetstream.GetMsgOpt) (*jetstream.RawStreamMsg, error) {
	if s.fail.Load() {
		return nil, context.DeadlineExceeded
	}
	return s.Stream.GetMsg(ctx, seq, opts...)
}

type failJS struct {
	jetstream.JetStream
	fail *atomic.Bool
}

func (w *failJS) Stream(ctx context.Context, name string) (jetstream.Stream, error) {
	s, err := w.JetStream.Stream(ctx, name)
	if err != nil {
		return nil, err
	}
	return &failStream{Stream: s, fail: w.fail}, nil
}

func (w *failJS) CreateStream(ctx context.Context, cfg jetstream.StreamConfig) (jetstream.Stream, error) {
	s, err := w.JetStream.CreateStream(ctx, cfg)
	if err != nil {
		return nil, err
	}
	return &failStream{Stream: s, fail: w.fail}, nil
}
