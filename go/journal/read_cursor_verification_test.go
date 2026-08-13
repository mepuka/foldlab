// Regression controls for issues #34, #39, and #52: Read validates a cursor
// claim even when no later entry is available to expose it through Prev, and
// a rejected observation cannot move the append cursor.
package journal_test

import (
	"errors"
	"testing"

	"foldlab/canonical"
	"foldlab/journal"
)

const forgedReadHead = "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa"

func TestReadRefusesForgedGenesisHead(t *testing.T) {
	js := startJetStream(t)
	opened, err := journal.Open(ctx(t), js, "forged_genesis_cursor")
	if err != nil {
		t.Fatalf("open: %v", err)
	}
	forged := journal.Cursor{Seq: -1, Head: forgedReadHead}
	entries, cursor, err := opened.Read(ctx(t), forged, 0)
	if !errors.Is(err, journal.ErrTampered) {
		t.Fatalf("read with forged genesis head: err=%v, want ErrTampered", err)
	}
	if len(entries) != 0 {
		t.Fatalf("forged cursor leaked %d entries", len(entries))
	}
	if cursor != forged {
		t.Fatalf("refusal cursor = %+v, want submitted cursor %+v", cursor, forged)
	}
}

func TestReadRefusesForgedTailHead(t *testing.T) {
	js := startJetStream(t)
	opened, err := journal.Open(ctx(t), js, "forged_tail_cursor")
	if err != nil {
		t.Fatalf("open: %v", err)
	}
	mustAppend(t, opened, "first")
	forged := journal.Cursor{Seq: 0, Head: forgedReadHead}
	entries, cursor, err := opened.Read(ctx(t), forged, 0)
	if !errors.Is(err, journal.ErrTampered) {
		t.Fatalf("read with forged tail head: err=%v, want ErrTampered", err)
	}
	if len(entries) != 0 {
		t.Fatalf("forged cursor leaked %d entries", len(entries))
	}
	if cursor != forged {
		t.Fatalf("refusal cursor = %+v, want submitted cursor %+v", cursor, forged)
	}
}

func TestRejectedFutureCursorDoesNotPoisonAppend(t *testing.T) {
	js := startJetStream(t)
	opened, err := journal.Open(ctx(t), js, "future_cursor")
	if err != nil {
		t.Fatalf("open: %v", err)
	}
	first := mustAppend(t, opened, "first")
	forged := journal.Cursor{Seq: 7, Head: forgedReadHead}
	if _, _, err := opened.Read(ctx(t), forged, 0); !errors.Is(err, journal.ErrTampered) {
		t.Fatalf("read with future cursor: err=%v, want ErrTampered", err)
	}
	second := mustAppend(t, opened, "second")
	if second.Seq != 1 || second.Prev != mustEntryDigest(t, first) {
		t.Fatalf("append after refused read = %+v, want seq 1 chained from the real tail", second)
	}
}

func TestReadAcceptsStoredCursorAfterAppend(t *testing.T) {
	js := startJetStream(t)
	reader, err := journal.Open(ctx(t), js, "cursor_after_append")
	if err != nil {
		t.Fatalf("open reader: %v", err)
	}
	writer, err := journal.Open(ctx(t), js, "cursor_after_append")
	if err != nil {
		t.Fatalf("open writer: %v", err)
	}
	mustAppend(t, writer, "first")
	first, verified, err := reader.Read(
		ctx(t),
		journal.Cursor{Seq: -1, Head: canonical.Genesis},
		0,
	)
	if err != nil || len(first) != 1 {
		t.Fatalf("initial read: entries=%d cursor=%+v err=%v", len(first), verified, err)
	}
	second := mustAppend(t, writer, "second")

	entries, cursor, err := reader.Read(ctx(t), verified, 0)
	if err != nil {
		t.Fatalf("resume after append: %v", err)
	}
	if len(entries) != 1 || entries[0] != second {
		t.Fatalf("resume entries = %+v, want only %+v", entries, second)
	}
	wantHead := mustEntryDigest(t, second)
	if cursor.Seq != 1 || cursor.Head != wantHead {
		t.Fatalf("resume cursor = %+v, want seq 1 head %s", cursor, wantHead)
	}
}
