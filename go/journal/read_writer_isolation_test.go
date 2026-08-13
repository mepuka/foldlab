package journal_test

import (
	"errors"
	"strings"
	"testing"

	"foldlab/canonical"
	"foldlab/journal"
)

func TestReadCannotPoisonTheNextAppendCursor(t *testing.T) {
	js := startJetStream(t)
	stale, err := journal.Open(ctx(t), js, "read_append_isolation")
	if err != nil {
		t.Fatal(err)
	}
	writer, err := journal.Open(ctx(t), js, "read_append_isolation")
	if err != nil {
		t.Fatal(err)
	}
	first := mustAppend(t, writer, "first")

	forged := journal.Cursor{Seq: 0, Head: strings.Repeat("0", 64)}
	entries, echoed, err := stale.Read(ctx(t), forged, 1)
	if err != nil {
		t.Fatal(err)
	}
	if len(entries) != 0 || echoed != forged {
		t.Fatalf("empty read = entries %v cursor %+v, want forged cursor echoed without entries", entries, echoed)
	}

	if _, _, err := stale.Append(ctx(t), "second"); !errors.Is(err, journal.ErrConflict) {
		t.Fatalf("append after unverified read = %v, want ErrConflict and verified resync", err)
	}
	second, outcome, err := stale.Append(ctx(t), "second")
	if err != nil || outcome != journal.Stored {
		t.Fatalf("append after resync = (%+v, %v, %v), want stored", second, outcome, err)
	}
	wantPrev := mustEntryDigest(t, first)
	if second.Prev != wantPrev {
		t.Fatalf("second prev = %s, want verified first head %s", second.Prev, wantPrev)
	}

	entries, _, err = writer.Read(ctx(t), journal.Cursor{Seq: -1, Head: canonical.Genesis}, 0)
	if err != nil || len(entries) != 2 {
		t.Fatalf("verified read after append = %d entries, %v", len(entries), err)
	}
}
