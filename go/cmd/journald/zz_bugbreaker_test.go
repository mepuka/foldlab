// BUG-BREAKER evidence (NOT coordinator-owned). End-to-end demonstration that
// JR2 (loser cursor never resyncs) surfaces to a REAL client through the
// journald daemon's own cached-handle serve path, and that JR3 (post-conflict
// re-read failure) surfaces as reason="unavailable" instead of "conflict".
// White-box: constructs the real *daemon and calls its real serve method; a
// competing writer is injected on the shared JetStream. See ../../../_bugs/WORKLOG.md.
package main

import (
	"context"
	"encoding/json"
	"errors"
	"sync/atomic"
	"testing"
	"time"

	"github.com/nats-io/nats-server/v2/server"
	"github.com/nats-io/nats.go"
	"github.com/nats-io/nats.go/jetstream"

	"foldlab/canonical"
	"foldlab/journal"
)

func bbJetStream(t *testing.T) jetstream.JetStream {
	t.Helper()
	opts := &server.Options{ServerName: "jr-bb", JetStream: true, StoreDir: t.TempDir(), DontListen: true, NoSigs: true}
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

func newDaemon(js jetstream.JetStream) *daemon {
	return &daemon{js: js, journals: map[string]*journal.Journal{}, effectors: nil}
}

// call drives the daemon's real serve path as a client would, returning the
// response as a generic map (reason/detail/outcome visible).
func call(t *testing.T, d *daemon, req request) map[string]any {
	t.Helper()
	if len(req.ID) == 0 {
		req.ID = json.RawMessage("1")
	}
	in, err := json.Marshal(req)
	if err != nil {
		t.Fatalf("marshal req: %v", err)
	}
	out := d.serve(context.Background(), in)
	raw, err := json.Marshal(out)
	if err != nil {
		t.Fatalf("marshal resp: %v", err)
	}
	var m map[string]any
	if err := json.Unmarshal(raw, &m); err != nil {
		t.Fatalf("unmarshal resp: %v", err)
	}
	return m
}

// JR2 end-to-end: the daemon caches one *Journal per name and never Reads on
// the append path, so once its cached cursor loses a CAS to another writer the
// client is wedged — every append returns "conflict" though the journal is
// healthy — and ONLY a read request heals it.
func TestBUG_JR2_DaemonCachedHandleWedgedToClient(t *testing.T) {
	js := bbJetStream(t)
	d := newDaemon(js)

	// Client opens the journal through the daemon (caches the handle).
	if r := call(t, d, request{Op: "open", Name: "wf"}); r["ok"] != true {
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

	// The client's next append via the daemon loses the CAS.
	r1 := call(t, d, request{Op: "append", Name: "wf", Payload: "a"})
	if r1["reason"] != "conflict" {
		t.Fatalf("expected conflict on first append, got %v", r1)
	}
	// WEDGE: retry conflicts again — the cached cursor never resynced (JR2).
	r2 := call(t, d, request{Op: "append", Name: "wf", Payload: "b"})
	if r2["reason"] != "conflict" {
		t.Fatalf("expected the client to stay wedged, got %v", r2)
	}
	// The daemon's head is still stale (Seq -1) though the stream holds seq 0.
	h := call(t, d, request{Op: "head", Name: "wf"})
	t.Logf("wedged daemon head: seq=%v (stream tail is seq 0)", h["seq"])

	// Recovery ONLY via a read request (which resyncs j.cursor).
	if r := call(t, d, request{Op: "read", Name: "wf", Seq: -1, Head: canonical.Genesis}); r["ok"] != true {
		t.Fatalf("read: %v", r)
	}
	r3 := call(t, d, request{Op: "append", Name: "wf", Payload: "c"})
	if r3["ok"] != true {
		t.Fatalf("append after read-resync should succeed, got %v", r3)
	}
	t.Log("CONFIRMED end-to-end: a journald client is wedged by the cached-handle after a lost CAS; only a read request recovers it")
}

// ---- JR3 at the daemon level: re-read failure -> reason "unavailable" ----

type failStream struct {
	jetstream.Stream
	fail *atomic.Bool
}

func (s *failStream) GetMsg(ctx context.Context, seq uint64, opts ...jetstream.GetMsgOpt) (*jetstream.RawStreamMsg, error) {
	if s.fail.Load() {
		return nil, errors.New("simulated transient GetMsg failure")
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

// JR2+JR3 compound: when the losing append's post-conflict re-read ALSO fails,
// the daemon surfaces reason="unavailable" to the client instead of "conflict"
// — a genuine position conflict mislabeled as a transient outage.
func TestBUG_JR3_DaemonSurfacesUnavailableForRealConflict(t *testing.T) {
	js := bbJetStream(t)
	fail := &atomic.Bool{}
	d := newDaemon(&failJS{JetStream: js, fail: fail})

	if r := call(t, d, request{Op: "open", Name: "wf3"}); r["ok"] != true {
		t.Fatalf("open: %v", r)
	}
	// Competing writer wins seq 0 (through the real js, not the daemon's wrapper).
	w, err := journal.Open(context.Background(), js, "wf3")
	if err != nil {
		t.Fatalf("competing open: %v", err)
	}
	if _, _, err := w.Append(context.Background(), "x"); err != nil {
		t.Fatalf("competing append: %v", err)
	}

	fail.Store(true) // arm: the daemon's post-conflict re-read GetMsg will fail
	r := call(t, d, request{Op: "append", Name: "wf3", Payload: "a"})
	fail.Store(false)
	t.Logf("daemon response for a real conflict with a failed re-read: reason=%v detail=%v", r["reason"], r["detail"])
	if r["reason"] == "conflict" {
		t.Fatal("re-read succeeded; JR3 window not hit")
	}
	if r["reason"] != "unavailable" {
		t.Fatalf("expected reason=unavailable (JR3 mislabel), got %v", r)
	}
	t.Log("CONFIRMED end-to-end: a real position conflict is surfaced to the client as reason=\"unavailable\" (JR2+JR3 compound)")
}
