package stream

import (
	"bytes"
	"testing"
)

func txCorpus() []Event {
	return []Event{
		ev("alpha", 1, "a=1"), ev("beta", 1, "c=x"), ev("alpha", 2, "ab=2"),
		ev("beta", 2, "a=y"), ev("alpha", 3, "b=3"),
	}
}

func txHead(events []Event) Head { return HeadFrom(StreamSeed("t"), events) }

// XL1: fusion — one pass over the composition equals the sequential passes.
func TestComposeFuses(t *testing.T) {
	f, g, h := RenameStream("z"), FilterKeyPrefix("a"), MapValueUpper()
	xs := txCorpus()
	fused := Apply(Compose(f, g, h), xs)
	sequential := Apply(h, Apply(g, Apply(f, xs)))
	if txHead(fused) != txHead(sequential) {
		t.Fatalf("fusion broke: fused and sequential streams differ")
	}
	if len(fused) == 0 || len(fused) == len(xs) {
		t.Fatalf("degenerate corpus: filter did nothing or everything")
	}
}

// XL2: associativity, witnessed by head equality.
func TestComposeAssociative(t *testing.T) {
	f, g, h := RenameStream("z"), FilterKeyPrefix("a"), MapValueUpper()
	xs := txCorpus()
	left := Apply(Compose(Compose(f, g), h), xs)
	right := Apply(Compose(f, Compose(g, h)), xs)
	if txHead(left) != txHead(right) {
		t.Fatalf("composition is not associative")
	}
}

// XL3: empty composition is identity, and xforms do not mutate inputs.
func TestComposeIdentityAndPurity(t *testing.T) {
	xs := txCorpus()
	before := txHead(xs)
	if txHead(Apply(Compose(), xs)) != before {
		t.Fatalf("Compose() is not identity")
	}
	Apply(Compose(RenameStream("z"), MapValueUpper()), xs)
	if txHead(xs) != before {
		t.Fatalf("a transform mutated its input stream")
	}
}

// A drop is terminal for that event; downstream transforms observe nothing.
func TestComposeStopsAfterDrop(t *testing.T) {
	calls := 0
	drop := func(e Event) (Event, bool) {
		return e, false
	}
	after := func(e Event) (Event, bool) {
		calls++
		return e, true
	}
	if got, ok := Compose(drop, after)(ev("s", 1, "a=1")); ok {
		t.Fatalf("dropped event survived as %#v", got)
	}
	if calls != 0 {
		t.Fatalf("downstream transform ran %d times after a drop", calls)
	}
}

// XL4: value mapping uppercases ASCII in the value only and preserves every
// non-ASCII byte, including malformed UTF-8.
func TestMapValueUpperMatchesByteSemantics(t *testing.T) {
	payloads := [][]byte{
		[]byte("key=lower"),
		[]byte("Key=ALREADY"),
		[]byte("key=Straße"),
		[]byte("key=ɐtail"),
		append([]byte("key="), 0xff, 'a'),
		[]byte("no-boundary"),
	}
	upper := MapValueUpper()
	for _, payload := range payloads {
		input := Event{Payload: append([]byte(nil), payload...)}
		got, ok := upper(input)
		if !ok {
			t.Fatalf("upper unexpectedly dropped %q", payload)
		}
		want := payload
		if i := bytes.IndexByte(payload, '='); i >= 0 {
			want = append([]byte(nil), payload...)
			for j := i + 1; j < len(want); j++ {
				if 'a' <= want[j] && want[j] <= 'z' {
					want[j] -= 'a' - 'A'
				}
			}
		}
		if !bytes.Equal(got.Payload, want) {
			t.Fatalf("upper(%q) = %q, want %q", payload, got.Payload, want)
		}
		if !bytes.Equal(input.Payload, payload) {
			t.Fatalf("upper mutated %q", payload)
		}
	}
}
