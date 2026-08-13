// Regression tests for issues #1 (JR2) and #10 (JR3): the conflict/resume path.
// A losing writer must resync its cursor from the tail and recover through
// Append alone (JR2), and a failed post-conflict re-read must still classify as
// ErrConflict (JR3). These assert the corrected behavior, so each fails on the
// pre-fix code.
package journal_test

import (
	"context"
	"errors"
	"testing"

	"github.com/nats-io/nats.go/jetstream"

	"foldlab/canonical"
	"foldlab/journal"
)

// JR2 (#1): a writer that loses a CAS-append resyncs its cursor from the stream
// tail on ErrConflict and recovers through Append alone — no external Read.
func TestConflictResyncsLoserCursor(t *testing.T) {
	js := startJetStream(t)
	c := ctx(t)
	winner, err := journal.Open(c, js, "jr2")
	if err != nil {
		t.Fatalf("open winner: %v", err)
	}
	loser, err := journal.Open(c, js, "jr2")
	if err != nil {
		t.Fatalf("open loser: %v", err)
	}
	win := mustAppend(t, winner, "a")

	// The loser proposes position 0 and loses the CAS.
	if _, _, err := loser.Append(c, "b"); !errors.Is(err, journal.ErrConflict) {
		t.Fatalf("loser append: err=%v, want ErrConflict", err)
	}
	// The cursor must now reflect the winner's tail, not the stale genesis head.
	if got := loser.Head(); got.Seq != 0 || got.Head != canonical.EntryDigest(win) {
		t.Fatalf("loser cursor after conflict: %+v, want seq 0 head %s", got, canonical.EntryDigest(win))
	}
	// Recovery is through Append alone: the next append chains onto the winner.
	next, outcome, err := loser.Append(c, "c")
	if err != nil {
		t.Fatalf("loser recovery append: %v (still wedged)", err)
	}
	if outcome != journal.Stored {
		t.Fatalf("loser recovery outcome: %v, want stored", outcome)
	}
	if next.Seq != 1 || next.Prev != canonical.EntryDigest(win) {
		t.Fatalf("recovered entry did not chain onto the winner: %+v", next)
	}
	// The whole journal reads back as one verified chain.
	entries, _, err := loser.Read(c, journal.Cursor{Seq: -1, Head: canonical.Genesis}, 0)
	if err != nil {
		t.Fatalf("read after recovery: %v", err)
	}
	if len(entries) != 2 || entries[0].Payload != "a" || entries[1].Payload != "c" {
		t.Fatalf("chain after recovery: %+v, want [a c]", entries)
	}
}

// JR3 (#10): when the confirmatory post-conflict re-read fails, the CAS has
// already proven the position occupied, so the error classifies as ErrConflict
// — not the raw JetStream *APIError that errors.Is misses.
func TestConflictClassifiedWhenReReadFails(t *testing.T) {
	js := startJetStream(t)
	c := ctx(t)
	if _, err := journal.Open(c, js, "jr3"); err != nil {
		t.Fatalf("bootstrap open: %v", err)
	}
	fail := &boolFlag{}
	loser, err := journal.Open(c, &failReadJS{JetStream: js, fail: fail}, "jr3")
	if err != nil {
		t.Fatalf("open loser: %v", err)
	}
	// A rival wins position 0 through the real JetStream.
	winner, err := journal.Open(c, js, "jr3")
	if err != nil {
		t.Fatalf("open winner: %v", err)
	}
	mustAppend(t, winner, "a")

	fail.value = true // the loser's post-conflict re-read GetMsg will fail
	_, _, err = loser.Append(c, "b")
	fail.value = false
	if !errors.Is(err, journal.ErrConflict) {
		t.Fatalf("append with failed re-read: err=%v, want ErrConflict", err)
	}
}

// ---- a JetStream whose Stream re-reads (GetMsg) can be armed to fail ----

type boolFlag struct{ value bool }

type failReadJS struct {
	jetstream.JetStream
	fail *boolFlag
}

func (w *failReadJS) Stream(ctx context.Context, name string) (jetstream.Stream, error) {
	s, err := w.JetStream.Stream(ctx, name)
	if err != nil {
		return nil, err
	}
	return &failReadStream{Stream: s, fail: w.fail}, nil
}

func (w *failReadJS) CreateStream(ctx context.Context, cfg jetstream.StreamConfig) (jetstream.Stream, error) {
	s, err := w.JetStream.CreateStream(ctx, cfg)
	if err != nil {
		return nil, err
	}
	return &failReadStream{Stream: s, fail: w.fail}, nil
}

type failReadStream struct {
	jetstream.Stream
	fail *boolFlag
}

func (s *failReadStream) GetMsg(ctx context.Context, seq uint64, opts ...jetstream.GetMsgOpt) (*jetstream.RawStreamMsg, error) {
	if s.fail.value {
		return nil, errors.New("simulated transient GetMsg failure")
	}
	return s.Stream.GetMsg(ctx, seq, opts...)
}
