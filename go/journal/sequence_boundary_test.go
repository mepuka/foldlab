package journal

import (
	"strconv"
	"testing"
)

func TestCursorPositionChecksPlatformBoundary(t *testing.T) {
	t.Parallel()

	if got, err := cursorPosition(0); err != nil || got != 0 {
		t.Fatalf("cursorPosition(0) = (%d, %v), want (0, nil)", got, err)
	}
	if _, err := cursorPosition(-1); err == nil {
		t.Fatal("cursorPosition(-1) accepted a negative canonical sequence")
	}

	if strconv.IntSize == 32 {
		tooLarge := int64(1 << 31)
		if _, err := cursorPosition(tooLarge); err == nil {
			t.Fatalf("cursorPosition(%d) accepted a sequence outside the platform cursor range", tooLarge)
		}
		if _, err := positionFromStreamSequence(uint64(tooLarge) + 1); err == nil {
			t.Fatalf("positionFromStreamSequence(%d) accepted a position outside the platform cursor range", uint64(tooLarge)+1)
		}
	}
}

func TestPositionFromStreamSequenceRejectsZero(t *testing.T) {
	t.Parallel()

	if _, err := positionFromStreamSequence(0); err == nil {
		t.Fatal("positionFromStreamSequence(0) accepted a nonexistent stream position")
	}
}
