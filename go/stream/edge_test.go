package stream

import (
	"bytes"
	"encoding/binary"
	"testing"
)

func requirePanic(t *testing.T, f func()) {
	t.Helper()
	defer func() {
		if recover() == nil {
			t.Fatal("operation unexpectedly succeeded")
		}
	}()
	f()
}

func referenceEncodeFact(fact MergeFact) []byte {
	size := 4
	for _, pick := range fact.Picks {
		size += 2 + len(pick.Stream) + 8
	}
	out := make([]byte, size)
	binary.BigEndian.PutUint32(out, uint32(len(fact.Picks)))
	off := 4
	for _, pick := range fact.Picks {
		binary.BigEndian.PutUint16(out[off:], uint16(len(pick.Stream)))
		off += 2
		copy(out[off:], pick.Stream)
		off += len(pick.Stream)
		binary.BigEndian.PutUint64(out[off:], pick.Seq)
		off += 8
	}
	return out
}

// The key grammar is the first '=' boundary; prefixes apply only to its key.
func TestFilterKeyPrefixGrammar(t *testing.T) {
	cases := []struct {
		name    string
		payload []byte
		prefix  string
		want    bool
	}{
		{"exact", []byte("a=value"), "a", true},
		{"partial-key", []byte("alpha=value"), "a", true},
		{"empty-prefix", []byte("a=value"), "", true},
		{"empty-key", []byte("=value"), "", false},
		{"missing-boundary", []byte("alpha"), "a", false},
		{"value-only", []byte("x=a"), "a", false},
		{"long-prefix", []byte("a=value"), "alpha", false},
		{"boundary-in-prefix", []byte("alpha=value"), "alpha=", false},
		{"first-boundary", []byte("alpha=x=y"), "alpha", true},
		{"unicode", []byte("β=value"), "β", true},
		{"raw-key-suffix", []byte{'a', 0xff, '=', 'v'}, "a", true},
	}
	for _, tc := range cases {
		t.Run(tc.name, func(t *testing.T) {
			event := Event{Payload: append([]byte(nil), tc.payload...)}
			got, ok := FilterKeyPrefix(tc.prefix)(event)
			if ok != tc.want {
				t.Fatalf("filter(%q, % x) = %v, want %v", tc.prefix, tc.payload, ok, tc.want)
			}
			if ok && !eventsEqual([]Event{got}, []Event{event}) {
				t.Fatal("filter changed a kept event")
			}
		})
	}
}

// The state digest's NUL delimiters and text wall have an explicit input domain.
func TestKVRejectsAmbiguousAndInvalidPayloads(t *testing.T) {
	cases := [][]byte{
		[]byte("missing"),
		[]byte("=empty"),
		{'k', 0, '=', 'v'},
		{'k', '=', 'v', 0},
		{'k', '=', 0xff},
	}
	for _, payload := range cases {
		state := NewKV()
		if err := state.Apply(Event{Payload: payload}); err == nil {
			t.Fatalf("KV accepted payload % x", payload)
		}
		if state.count != 0 || len(state.m) != 0 {
			t.Fatalf("refused payload % x mutated state", payload)
		}
	}

	state := NewKV()
	state.count = ^uint32(0)
	if err := state.Apply(ev("s", 1, "k=v")); err == nil {
		t.Fatal("KV count wrapped past u32")
	}
	if state.count != ^uint32(0) || len(state.m) != 0 {
		t.Fatal("count overflow mutated state")
	}
}

// Reused value capacity never aliases input and handles long-empty-short writes.
func TestKVValueReuseOwnsBytes(t *testing.T) {
	state := NewKV()
	long := append([]byte("key="), bytes.Repeat([]byte{'x'}, 4096)...)
	if err := state.Apply(Event{Payload: long}); err != nil {
		t.Fatal(err)
	}
	wantLong := state.StateDigest()
	for i := range long {
		long[i] ^= 0xff
	}
	if state.StateDigest() != wantLong {
		t.Fatal("KV value aliases its source payload")
	}
	for _, payload := range [][]byte{[]byte("key="), []byte("key=z")} {
		if err := state.Apply(Event{Payload: payload}); err != nil {
			t.Fatal(err)
		}
	}
	want, err := referenceStateDigest([]Event{
		{Payload: append([]byte("key="), bytes.Repeat([]byte{'x'}, 4096)...)},
		{Payload: []byte("key=")},
		{Payload: []byte("key=z")},
	})
	if err != nil || state.StateDigest() != want {
		t.Fatal("value-buffer reuse retained bytes from an earlier write")
	}
}

// UTF-8 byte order, not UTF-16 code-unit order, is the cross-language pin.
func TestStateDigestUnicodeKeyOrder(t *testing.T) {
	const want = "490ea0ba348d84e20ac8b0d7312311e01c8c7578ac653c08b6092f804f410ef4"
	for _, events := range [][]Event{
		{{Payload: []byte("𐀀=supplementary")}, {Payload: []byte("=bmp")}},
		{{Payload: []byte("=bmp")}, {Payload: []byte("𐀀=supplementary")}},
	} {
		state, err := FoldKV(events)
		if err != nil {
			t.Fatal(err)
		}
		if got := state.StateDigest().Hex(); got != want {
			t.Fatalf("Unicode state digest = %s, want %s", got, want)
		}
	}
}

// Inline and heap-backed head frames are the same identity fold at the seam.
func TestHeadFrameAllocationBoundary(t *testing.T) {
	base := StreamSeed("boundary")
	fixed := len(base) + eventFrameOverhead + len("s")
	for _, payloadLen := range []int{0, inlineHeadFrameSize - fixed - 1, inlineHeadFrameSize - fixed, inlineHeadFrameSize - fixed + 1, 4096} {
		event := Event{Stream: "s", Seq: maxSafeSequence, Payload: bytes.Repeat([]byte{'x'}, payloadLen)}
		want := referenceExtend(base, event)
		if got := Extend(base, event); got != want {
			t.Fatalf("Extend payload=%d crossed the allocation seam", payloadLen)
		}
		if got := HeadFrom(base, []Event{event, event}); got != referenceHeadFrom(base, []Event{event, event}) {
			t.Fatalf("HeadFrom payload=%d crossed the allocation seam", payloadLen)
		}
	}
}

// Merge fact append encoding remains byte-identical at empty and maximal fields.
func TestEncodeFactMatchesReferenceAtBoundaries(t *testing.T) {
	facts := []MergeFact{
		{},
		{Picks: []Pick{{Stream: "", Seq: 0}}},
		{Picks: []Pick{{Stream: "β", Seq: maxSafeSequence}, {Stream: "alpha", Seq: 1}}},
		{Picks: []Pick{{Stream: string(bytes.Repeat([]byte{'s'}, maxEncodedStreamLen)), Seq: 7}}},
	}
	for _, fact := range facts {
		if got, want := EncodeFact(fact), referenceEncodeFact(fact); !bytes.Equal(got, want) {
			t.Fatalf("merge fact differs at %d picks", len(fact.Picks))
		}
	}
}

// Width and UTF-8 failures refuse before their canonical fields can wrap.
func TestCanonicalWireDomainRejectsInvalidValues(t *testing.T) {
	invalidID := string([]byte{0xff})
	oversizedID := string(bytes.Repeat([]byte{'s'}, maxEncodedStreamLen+1))
	for _, event := range []Event{{Stream: invalidID}, {Stream: oversizedID}} {
		if _, err := GzipEvents([]Event{event}); err == nil {
			t.Fatalf("GzipEvents accepted stream length %d", len(event.Stream))
		}
	}
	requirePanic(t, func() { EncodeEvent(Event{Stream: oversizedID}) })
	requirePanic(t, func() { StreamSeed(invalidID) })
	requirePanic(t, func() { EncodeFact(MergeFact{Picks: []Pick{{Stream: invalidID}}}) })
	requirePanic(t, func() { EncodeFact(MergeFact{Picks: []Pick{{Stream: oversizedID}}}) })

	raw := make([]byte, eventFrameOverhead+1)
	binary.BigEndian.PutUint16(raw, 1)
	raw[2] = 0xff
	if _, err := decodeEvents(raw); err == nil {
		t.Fatal("decodeEvents accepted an invalid UTF-8 stream ID")
	}
}

// The dense merge path remains a map lookup across the common sequence ceiling and gaps.
func TestMergeDensePathAtSequenceBoundary(t *testing.T) {
	source := []Event{
		ev("s", maxSafeSequence, "a=max"),
		ev("s", 0, "a=zero"),
	}
	fact := MergeFact{Picks: []Pick{{Stream: "s", Seq: 0}, {Stream: "s", Seq: maxSafeSequence}}}
	got, gotErr := ApplyMerge(fact, map[string][]Event{"s": source})
	want, wantErr := referenceApplyMerge(fact, map[string][]Event{"s": source})
	if (gotErr != nil) != (wantErr != nil) || !eventsEqual(got, want) {
		t.Fatalf("dense common boundary differs: %#v, %v; want %#v, %v", got, gotErr, want, wantErr)
	}
}

// Content-addressed segments own inserted and replayed payload bytes.
func TestStoreOwnershipAndCycleRefusal(t *testing.T) {
	root := StreamSeed("root")
	payload := []byte("key=value")
	store := Store{}
	head := store.Put(Segment{Parent: root, Events: []Event{{Stream: "s", Seq: 1, Payload: payload}}})
	payload[0] = 'X'
	first, err := store.Replay(head, root)
	if err != nil || string(first[0].Payload) != "key=value" {
		t.Fatalf("inserted payload was not owned: %#v, %v", first, err)
	}
	first[0].Payload[0] = 'Y'
	second, err := store.Replay(head, root)
	if err != nil || string(second[0].Payload) != "key=value" {
		t.Fatalf("replayed payload corrupted the store: %#v, %v", second, err)
	}

	a, b := Head{1}, Head{2}
	cycle := Store{
		a: {Parent: b},
		b: {Parent: a},
	}
	if _, err := cycle.Replay(a, root); err == nil {
		t.Fatal("segment cycle was not refused")
	}
}

// Gzip supports standard concatenated members but refuses garbage suffixes.
func TestGzipMemberAndPoolBoundaries(t *testing.T) {
	left := []Event{ev("left", 1, "a=1")}
	right := []Event{ev("right", 2, "b=2")}
	a, err := GzipEvents(left)
	if err != nil {
		t.Fatal(err)
	}
	b, err := GzipEvents(right)
	if err != nil {
		t.Fatal(err)
	}
	joined := append(append([]byte(nil), a...), b...)
	got, err := GunzipEvents(joined)
	if err != nil || !eventsEqual(got, append(left, right...)) {
		t.Fatalf("concatenated gzip members = %#v, %v", got, err)
	}
	if _, err := GunzipEvents(append(joined, 0xff)); err == nil {
		t.Fatal("gzip transport accepted a garbage suffix")
	}

	large := []Event{{Stream: "large", Seq: 1, Payload: bytes.Repeat([]byte{'x'}, maxPooledCanonicalBytes+1)}}
	frame, err := GzipEvents(large)
	if err != nil {
		t.Fatal(err)
	}
	if decoded, err := GunzipEvents(frame); err != nil || !eventsEqual(decoded, large) {
		t.Fatalf("large unpooled frame = %#v, %v", decoded, err)
	}
	frame, err = GzipEvents(nil)
	if err != nil {
		t.Fatal(err)
	}
	if decoded, err := GunzipEvents(frame); err != nil || len(decoded) != 0 {
		t.Fatalf("empty frame = %#v, %v", decoded, err)
	}
}

// Invalid compaction boundaries fail without producing partial state.
func TestCompactRejectsOutsideBoundaries(t *testing.T) {
	events := []Event{ev("s", 1, "a=1")}
	for _, boundary := range []int{-1, len(events) + 1} {
		if _, err := Compact(StreamSeed("s"), events, boundary); err == nil {
			t.Fatalf("compaction accepted boundary %d", boundary)
		}
	}
}
