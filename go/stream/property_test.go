package stream

import (
	"bytes"
	"compress/gzip"
	"crypto/sha256"
	"encoding/binary"
	"io"
	"math/rand"
	"sort"
	"testing"
	"testing/quick"
	"unicode"
	"unicode/utf8"
)

func referenceEncodeEvent(e Event) []byte {
	out := make([]byte, eventFrameOverhead+len(e.Stream)+len(e.Payload))
	binary.BigEndian.PutUint16(out, uint16(len(e.Stream)))
	off := 2
	copy(out[off:], e.Stream)
	off += len(e.Stream)
	binary.BigEndian.PutUint64(out[off:], e.Seq)
	off += 8
	binary.BigEndian.PutUint32(out[off:], uint32(len(e.Payload)))
	off += 4
	copy(out[off:], e.Payload)
	return out
}

func referenceExtend(h Head, e Event) Head {
	frame := make([]byte, 0, len(h)+encodedEventLen(e))
	frame = append(frame, h[:]...)
	frame = append(frame, referenceEncodeEvent(e)...)
	return sha256.Sum256(frame)
}

func referenceHeadFrom(base Head, events []Event) Head {
	head := base
	for _, event := range events {
		head = referenceExtend(head, event)
	}
	return head
}

func referenceApplyMerge(m MergeFact, sources map[string][]Event) ([]Event, error) {
	index := make(map[string]map[uint64]Event, len(sources))
	for name, events := range sources {
		bySeq := make(map[uint64]Event, len(events))
		for _, event := range events {
			if _, exists := bySeq[event.Seq]; exists {
				return nil, io.ErrUnexpectedEOF
			}
			bySeq[event.Seq] = event
		}
		index[name] = bySeq
	}
	out := make([]Event, 0, len(m.Picks))
	for _, pick := range m.Picks {
		event, ok := index[pick.Stream][pick.Seq]
		if !ok {
			return nil, io.ErrUnexpectedEOF
		}
		out = append(out, event)
	}
	return out, nil
}

func referenceStateDigest(events []Event) (Head, error) {
	entries := make(map[string]string)
	var count uint32
	for _, event := range events {
		i := bytes.IndexByte(event.Payload, '=')
		if i <= 0 || !utf8.Valid(event.Payload) {
			return Head{}, io.ErrUnexpectedEOF
		}
		if bytes.IndexByte(event.Payload[:i], 0) >= 0 || bytes.IndexByte(event.Payload[i+1:], 0) >= 0 || count == ^uint32(0) {
			return Head{}, io.ErrUnexpectedEOF
		}
		entries[string(event.Payload[:i])] = string(event.Payload[i+1:])
		count++
	}
	keys := make([]string, 0, len(entries))
	for key := range entries {
		keys = append(keys, key)
	}
	sort.Strings(keys)
	hash := sha256.New()
	hash.Write([]byte("playground.fold.kv.v1"))
	var encodedCount [4]byte
	binary.BigEndian.PutUint32(encodedCount[:], count)
	hash.Write(encodedCount[:])
	for _, key := range keys {
		hash.Write([]byte(key))
		hash.Write([]byte{0})
		hash.Write([]byte(entries[key]))
		hash.Write([]byte{0})
	}
	var out Head
	copy(out[:], hash.Sum(nil))
	return out, nil
}

func referenceFilterKeyPrefix(payload []byte, prefix string) bool {
	i := bytes.IndexByte(payload, '=')
	return i > 0 && bytes.HasPrefix(payload[:i], []byte(prefix))
}

func referenceMapValueUpper(event Event) Event {
	i := bytes.IndexByte(event.Payload, '=')
	if i < 0 {
		return event
	}
	payload := append([]byte(nil), event.Payload...)
	for j := i + 1; j < len(payload); j++ {
		if 'a' <= payload[j] && payload[j] <= 'z' {
			payload[j] -= 'a' - 'A'
		}
	}
	event.Payload = payload
	return event
}

func eventsEqual(a, b []Event) bool {
	if len(a) != len(b) {
		return false
	}
	for i := range a {
		if a[i].Stream != b[i].Stream || a[i].Seq != b[i].Seq || !bytes.Equal(a[i].Payload, b[i].Payload) {
			return false
		}
	}
	return true
}

func generatedEvents(data []byte) []Event {
	if len(data) == 0 {
		return nil
	}
	cursor := 1
	next := func() byte {
		if cursor >= len(data) {
			cursor++
			return 0
		}
		value := data[cursor]
		cursor++
		return value
	}
	n := int(data[0] % 17)
	events := make([]Event, n)
	for i := range events {
		streamLen := int(next() % 12)
		stream := make([]byte, streamLen)
		for j := range stream {
			stream[j] = next()
		}
		stream = bytes.ToValidUTF8(stream, []byte(string(utf8.RuneError)))
		var seq uint64
		for range 8 {
			seq = seq<<8 | uint64(next())
		}
		payloadLen := int(next() % 48)
		payload := make([]byte, payloadLen)
		for j := range payload {
			payload[j] = next()
		}
		events[i] = Event{Stream: string(stream), Seq: seq, Payload: payload}
	}
	return events
}

func generatedKVEvents(data []byte) []Event {
	events := generatedEvents(data)
	for i := range events {
		key := []byte{byte(i%11 + 1), byte(events[i].Seq%251 + 1)}
		for j := range key {
			if key[j] == '=' {
				key[j] = 1
			}
		}
		value := events[i].Payload
		if len(data) == 0 || data[0]&0x80 == 0 {
			value = append([]byte(nil), value...)
			for j := range value {
				value[j] = 'a' + value[j]%26
			}
		}
		payload := make([]byte, 0, len(key)+1+len(events[i].Payload))
		payload = append(payload, key...)
		payload = append(payload, '=')
		payload = append(payload, value...)
		events[i].Payload = payload
	}
	return events
}

func generatedMerge(data []byte) (MergeFact, map[string][]Event) {
	events := generatedEvents(data)
	sources := map[string][]Event{"left": nil, "right": nil, "": nil}
	for i, event := range events {
		names := [...]string{"left", "right", ""}
		name := names[i%len(names)]
		event.Stream = name
		if i%4 == 0 {
			event.Seq = uint64(i)
		} else {
			event.Seq %= 13
		}
		sources[name] = append(sources[name], event)
	}
	picks := make([]Pick, 0, len(events)+1)
	for i, event := range events {
		name := event.Stream
		if i%3 == 0 {
			picks = append(picks, Pick{Stream: name, Seq: event.Seq})
		}
	}
	if len(data) > 1 && data[len(data)-1]&1 != 0 {
		picks = append(picks, Pick{Stream: "missing", Seq: ^uint64(0)})
	}
	return MergeFact{Picks: picks}, sources
}

func quickConfig(seed int64) *quick.Config {
	return &quick.Config{
		MaxCount: 10_000,
		Rand:     rand.New(rand.NewSource(seed)),
	}
}

// Canonical bytes and both head paths agree with an intentionally simple oracle.
func TestPropertyCanonicalPathsMatchReference(t *testing.T) {
	property := func(stream string, seq uint64, payload []byte) bool {
		event := Event{Stream: stream, Seq: seq, Payload: payload}
		if !bytes.Equal(EncodeEvent(event), referenceEncodeEvent(event)) {
			return false
		}
		base := Head(sha256.Sum256(payload))
		return Extend(base, event) == referenceExtend(base, event)
	}
	if err := quick.Check(property, quickConfig(1)); err != nil {
		t.Fatal(err)
	}
}

// Batch scratch reuse cannot alter the identity fold at any frame size.
func TestPropertyHeadFromMatchesReference(t *testing.T) {
	property := func(data []byte) bool {
		events := generatedEvents(data)
		base := Head(sha256.Sum256(data))
		return HeadFrom(base, events) == referenceHeadFrom(base, events)
	}
	if err := quick.Check(property, quickConfig(2)); err != nil {
		t.Fatal(err)
	}
}

// Dense detection and sparse fallback are observationally equal to a map index.
func TestPropertyApplyMergeMatchesReference(t *testing.T) {
	property := func(data []byte) bool {
		fact, sources := generatedMerge(data)
		got, gotErr := ApplyMerge(fact, sources)
		want, wantErr := referenceApplyMerge(fact, sources)
		return (gotErr != nil) == (wantErr != nil) && eventsEqual(got, want)
	}
	if err := quick.Check(property, quickConfig(3)); err != nil {
		t.Fatal(err)
	}
}

// Reused value storage has the same digest as copying every key and value.
func TestPropertyFoldKVMatchesReference(t *testing.T) {
	property := func(data []byte) bool {
		events := generatedKVEvents(data)
		state, gotErr := FoldKV(events)
		want, wantErr := referenceStateDigest(events)
		if (gotErr != nil) != (wantErr != nil) {
			return false
		}
		return gotErr != nil || state.StateDigest() == want
	}
	if err := quick.Check(property, quickConfig(4)); err != nil {
		t.Fatal(err)
	}
}

// The optimized uppercase path follows the table-free ASCII oracle over the
// value and never the key.
func TestPropertyMapValueUpperMatchesReference(t *testing.T) {
	property := func(key, value []byte) bool {
		payload := make([]byte, 0, len(key)+1+len(value))
		payload = append(payload, key...)
		payload = append(payload, '=')
		payload = append(payload, value...)
		before := append([]byte(nil), payload...)
		event := Event{Stream: "s", Seq: 1, Payload: payload}
		got, ok := MapValueUpper()(event)
		want := referenceMapValueUpper(event)
		return ok && bytes.Equal(got.Payload, want.Payload) && bytes.Equal(event.Payload, before)
	}
	if err := quick.Check(property, quickConfig(5)); err != nil {
		t.Fatal(err)
	}
}

// Fusion, sequential traversal, and the primitive oracles agree structurally.
func TestPropertyTransformAlgebra(t *testing.T) {
	property := func(data, prefixBytes []byte) bool {
		events := generatedKVEvents(data)
		prefix := string(prefixBytes)
		if len(prefix) > 16 {
			prefix = prefix[:16]
		}
		f, g, h := RenameStream("z"), FilterKeyPrefix(prefix), MapValueUpper()
		fused := Apply(Compose(f, g, h), events)
		sequential := Apply(h, Apply(g, Apply(f, events)))
		if !eventsEqual(fused, sequential) {
			return false
		}
		for _, event := range events {
			got, ok := g(event)
			if ok != referenceFilterKeyPrefix(event.Payload, prefix) {
				return false
			}
			if ok && !eventsEqual([]Event{got}, []Event{event}) {
				return false
			}
		}
		return true
	}
	if err := quick.Check(property, quickConfig(6)); err != nil {
		t.Fatal(err)
	}
}

// ASCII fast paths cover every byte in both positions, not only words.
func TestMapValueUpperEveryASCIIPair(t *testing.T) {
	upper := MapValueUpper()
	for a := byte(0); a < utf8.RuneSelf; a++ {
		for b := byte(0); b < utf8.RuneSelf; b++ {
			event := Event{Payload: []byte{'k', '=', a, b}}
			got, ok := upper(event)
			want := referenceMapValueUpper(event)
			if !ok || !bytes.Equal(got.Payload, want.Payload) {
				t.Fatalf("upper(% x) = % x, want % x", event.Payload, got.Payload, want.Payload)
			}
		}
	}
}

// Non-ASCII bytes are outside this transform's deliberately table-free domain.
func TestMapValueUpperPreservesEveryUnicodeRune(t *testing.T) {
	upper := MapValueUpper()
	for r := rune(utf8.RuneSelf); r <= unicode.MaxRune; r++ {
		if !utf8.ValidRune(r) {
			continue
		}
		payload := utf8.AppendRune([]byte{'k', '='}, r)
		event := Event{Payload: payload}
		got, ok := upper(event)
		if !ok || !bytes.Equal(got.Payload, event.Payload) {
			t.Fatalf("upper(U+%04X) = % x, want byte-identical % x", r, got.Payload, event.Payload)
		}
	}
}

// Malformed UTF-8 is data too: every isolated non-ASCII byte stays byte-identical.
func TestMapValueUpperPreservesEveryNonASCIIByte(t *testing.T) {
	upper := MapValueUpper()
	for value := utf8.RuneSelf; value <= 0xff; value++ {
		event := Event{Payload: []byte{'k', '=', byte(value), 'a'}}
		got, ok := upper(event)
		want := []byte{'k', '=', byte(value), 'A'}
		if !ok || !bytes.Equal(got.Payload, want) {
			t.Fatalf("upper(% x) = % x, want % x", event.Payload, got.Payload, want)
		}
	}
}

func gzipRaw(t *testing.T, raw []byte) []byte {
	t.Helper()
	var out bytes.Buffer
	writer := gzip.NewWriter(&out)
	if _, err := writer.Write(raw); err != nil {
		t.Fatal(err)
	}
	if err := writer.Close(); err != nil {
		t.Fatal(err)
	}
	return out.Bytes()
}

// The raw parser rejects partial headers and architecture-sized length traps.
func TestDecodeEventsRejectsMalformedLengths(t *testing.T) {
	cases := [][]byte{
		{0},
		{0, 1},
		make([]byte, eventFrameOverhead-1),
		func() []byte {
			raw := make([]byte, eventFrameOverhead)
			binary.BigEndian.PutUint32(raw[10:], ^uint32(0))
			return raw
		}(),
	}
	for _, raw := range cases {
		if _, err := decodeEvents(raw); err == nil {
			t.Fatalf("decodeEvents(% x) unexpectedly succeeded", raw)
		}
	}
	event := Event{Seq: ^uint64(0), Payload: []byte{}}
	got, err := decodeEvents(EncodeEvent(event))
	if err != nil || !eventsEqual(got, []Event{event}) {
		t.Fatalf("empty-field boundary round trip = %#v, %v", got, err)
	}
}

// Every non-frame boundary truncation refuses instead of reading past the input.
func TestDecodeEventsRejectsEveryPartialFrame(t *testing.T) {
	events := []Event{
		{Stream: "", Seq: 0, Payload: nil},
		{Stream: "alpha", Seq: ^uint64(0), Payload: []byte{0, 0xff, '='}},
		{Stream: "β", Seq: 7, Payload: bytes.Repeat([]byte{0xa5}, 257)},
	}
	var raw []byte
	boundaries := map[int]bool{0: true}
	for _, event := range events {
		raw = append(raw, EncodeEvent(event)...)
		boundaries[len(raw)] = true
	}
	for i := 0; i <= len(raw); i++ {
		got, err := decodeEvents(raw[:i])
		if boundaries[i] {
			if err != nil {
				t.Fatalf("boundary %d refused: %v", i, err)
			}
			continue
		}
		if err == nil {
			t.Fatalf("partial frame at %d decoded as %d events", i, len(got))
		}
	}
}

// Gzip truncation, checksum corruption, and malformed canonical payloads refuse.
func TestGunzipEventsRejectsCorruption(t *testing.T) {
	events := []Event{{Stream: "alpha", Seq: 1, Payload: []byte("a=1")}}
	frame, err := GzipEvents(events)
	if err != nil {
		t.Fatal(err)
	}
	for i := 0; i < len(frame); i++ {
		if _, err := GunzipEvents(frame[:i]); err == nil {
			t.Fatalf("gzip prefix %d/%d unexpectedly succeeded", i, len(frame))
		}
	}
	for _, offset := range []int{len(frame) - 1, len(frame) - 5} {
		corrupt := append([]byte(nil), frame...)
		corrupt[offset] ^= 0xff
		if _, err := GunzipEvents(corrupt); err == nil {
			t.Fatalf("gzip trailer corruption at %d unexpectedly succeeded", offset)
		}
	}
	malformed := make([]byte, eventFrameOverhead)
	binary.BigEndian.PutUint32(malformed[10:], ^uint32(0))
	if _, err := GunzipEvents(gzipRaw(t, malformed)); err == nil {
		t.Fatal("malformed canonical payload length unexpectedly succeeded")
	}
}

// Returned compressed and decoded bytes remain owned across pool reuse.
func TestGzipAndGunzipResultsOwnTheirBytes(t *testing.T) {
	events := []Event{
		{Stream: "alpha", Seq: 1, Payload: []byte("first")},
		{Stream: "alpha", Seq: 2, Payload: []byte("second")},
	}
	frame, err := GzipEvents(events)
	if err != nil {
		t.Fatal(err)
	}
	savedFrame := append([]byte(nil), frame...)
	for i := 0; i < 100; i++ {
		if _, err := GzipEvents([]Event{{Stream: "other", Seq: uint64(i), Payload: bytes.Repeat([]byte{byte(i)}, 1024)}}); err != nil {
			t.Fatal(err)
		}
	}
	if !bytes.Equal(frame, savedFrame) {
		t.Fatal("a pooled writer or raw frame mutated returned gzip bytes")
	}
	decoded, err := GunzipEvents(frame)
	if err != nil {
		t.Fatal(err)
	}
	frame[0] ^= 0xff
	if !eventsEqual(decoded, events) {
		t.Fatal("decoded events alias the compressed input")
	}
	for i := range decoded {
		if cap(decoded[i].Payload) != len(decoded[i].Payload) {
			t.Fatalf("payload %d exposes adjacent canonical storage", i)
		}
	}
	first := append(decoded[0].Payload, '!')
	if string(first) != "first!" || string(decoded[1].Payload) != "second" {
		t.Fatal("appending one payload mutated adjacent decoded events")
	}
	events[0].Payload[0] = 'X'
	if string(decoded[0].Payload) != "first" {
		t.Fatal("decoded payload aliases the original event")
	}
}

// Unsupported wire widths fail explicitly rather than wrapping a u16 length.
func TestCanonicalEncodingRejectsOversizedStream(t *testing.T) {
	event := Event{Stream: string(bytes.Repeat([]byte{'s'}, maxEncodedStreamLen+1))}
	if _, err := GzipEvents([]Event{event}); err == nil {
		t.Fatal("gzip accepted a stream name that cannot fit u16")
	}
	defer func() {
		if recover() == nil {
			t.Fatal("EncodeEvent silently wrapped an oversized stream length")
		}
	}()
	EncodeEvent(event)
}
