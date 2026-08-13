package journal_test

import (
	"errors"
	"testing"

	"foldlab/canonical"
	"foldlab/journal"
)

func TestReadInvalidCursorReturnsErrBadCursor(t *testing.T) {
	js := startJetStream(t)
	j, err := journal.Open(ctx(t), js, "bad_cursor")
	if err != nil {
		t.Fatal(err)
	}
	_, _, err = j.Read(ctx(t), journal.Cursor{Seq: -2, Head: canonical.Genesis}, 1)
	if !errors.Is(err, journal.ErrBadCursor) {
		t.Fatalf("Read() error = %v, want ErrBadCursor", err)
	}
}
