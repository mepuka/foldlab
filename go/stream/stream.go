// Package stream is the stream-journal lane: the engineering substrate the
// agent-streaming conversation needs — fingerprinting, merge, fork,
// compaction, replay, compression — each stated as a small algebra whose laws
// are CHECKED, here and byte-identically in packages/mech/src/stream.ts (the
// cross-language wall, P2a fixture tradition).
//
// The one idea underneath all six concepts: an event stream is a left fold
// twice over. Folded with a hash you get IDENTITY (the chain head commits to
// the exact history); folded with a state function you get MEANING (what the
// history did). The two folds disagree on purpose — the chain remembers what
// the fold forgives — and every law in this lane is about which of the two a
// given operation must preserve.
//
// Canonical encodings are pinned here and mirrored in TS:
//
//	enc(event)  = len(stream) u16 BE || stream utf8 || seq u64 BE || len(payload) u32 BE || payload
//	seed(s)     = SHA-256("playground.stream.v1:" + s)
//	extend(h,e) = SHA-256(h || enc(e))
//
// Identity is always of canonical UNCOMPRESSED bytes: compression is
// transport, never identity (GzipEvents/GunzipEvents round-trip the canonical
// bytes; nothing ever fingerprints a compressed frame).
package stream

import (
	"bytes"
	"compress/gzip"
	"crypto/sha256"
	"encoding/binary"
	"fmt"
	"io"
	"sort"
	"sync"
	"unicode/utf8"
)

// An Event is one received fact: stream identity, position, payload. Arrival
// order across streams is NOT in the event — order is what merge facts commit.
// Stream is valid UTF-8 by contract; transports validate it before an event
// reaches the allocation-free identity path.
type Event struct {
	Stream  string
	Seq     uint64
	Payload []byte
}

const (
	eventFrameOverhead      = 2 + 8 + 4
	maxEncodedStreamLen     = 1<<16 - 1
	maxEncodedPayloadLen    = 1<<32 - 1
	maxPooledCanonicalBytes = 1 << 20
)

func fastEncodedEventLen(e Event) (int, bool) {
	size := uint64(eventFrameOverhead) + uint64(len(e.Stream)) + uint64(len(e.Payload))
	ok := utf8.ValidString(e.Stream) &&
		len(e.Stream) <= maxEncodedStreamLen &&
		uint64(len(e.Payload)) <= maxEncodedPayloadLen &&
		size <= uint64(^uint(0)>>1)
	return int(size), ok
}

func checkedEncodedEventLen(e Event) (int, error) {
	size, ok := fastEncodedEventLen(e)
	if ok {
		return size, nil
	}
	if !utf8.ValidString(e.Stream) {
		return 0, fmt.Errorf("stream: stream ID is not valid UTF-8")
	}
	if len(e.Stream) > maxEncodedStreamLen {
		return 0, fmt.Errorf("stream: stream length %d exceeds u16", len(e.Stream))
	}
	if uint64(len(e.Payload)) > maxEncodedPayloadLen {
		return 0, fmt.Errorf("stream: payload length %d exceeds u32", len(e.Payload))
	}
	return 0, fmt.Errorf("stream: canonical event length overflows int")
}

func encodedEventLen(e Event) int {
	if len(e.Stream) > maxEncodedStreamLen || uint64(len(e.Payload)) > maxEncodedPayloadLen {
		panic("stream: event is outside the canonical encoding domain")
	}
	maxInt := int(^uint(0) >> 1)
	if ^uint(0)>>32 == 0 && len(e.Payload) > maxInt-eventFrameOverhead-len(e.Stream) {
		panic("stream: canonical event length overflows int")
	}
	return eventFrameOverhead + len(e.Stream) + len(e.Payload)
}

func appendEncodedEvent(dst []byte, e Event) []byte {
	dst = binary.BigEndian.AppendUint16(dst, uint16(len(e.Stream)))
	dst = append(dst, e.Stream...)
	dst = binary.BigEndian.AppendUint64(dst, e.Seq)
	dst = binary.BigEndian.AppendUint32(dst, uint32(len(e.Payload)))
	return append(dst, e.Payload...)
}

// EncodeEvent is the canonical byte form. Everything — chain heads, merge
// digests, wire frames — goes through it, so there is exactly one identity.
func EncodeEvent(e Event) []byte {
	return appendEncodedEvent(make([]byte, 0, encodedEventLen(e)), e)
}

// Head is a chain fingerprint: 32 bytes committing to an entire prefix.
type Head [32]byte

func (h Head) Hex() string { return fmt.Sprintf("%x", h[:]) }

// StreamSeed is the empty-history head of one named stream.
func StreamSeed(stream string) Head {
	if !utf8.ValidString(stream) {
		panic("stream: stream ID is not valid UTF-8")
	}
	return sha256.Sum256([]byte("playground.stream.v1:" + stream))
}

// MergeSeed is the empty-history head of a merged log. A merge is a NEW
// stream whose events happen to come from elsewhere.
func MergeSeed() Head {
	return sha256.Sum256([]byte("playground.merge.v1"))
}

const inlineHeadFrameSize = 256

func headFrame(buf []byte, h Head, e Event) []byte {
	size := len(h) + encodedEventLen(e)
	if cap(buf) < size {
		buf = make([]byte, 0, size)
	} else {
		buf = buf[:0]
	}
	buf = append(buf, h[:]...)
	return appendEncodedEvent(buf, e)
}

// Extend is the identity fold: one event onto a head. O(1) incremental — the
// whole point of chaining over rehashing history.
func Extend(h Head, e Event) Head {
	var inline [inlineHeadFrameSize]byte
	return sha256.Sum256(headFrame(inline[:0], h, e))
}

// HeadFrom folds a batch onto a base head.
func HeadFrom(base Head, events []Event) Head {
	h := base
	var inline [inlineHeadFrameSize]byte
	buf := inline[:0]
	for _, e := range events {
		buf = headFrame(buf, h, e)
		h = sha256.Sum256(buf)
	}
	return h
}

// ---------- merge: committing one linearization ----------

// A Pick references one source event by (stream, seq). A MergeFact is a
// committed linearization: the tiny, replayable FACT that a merge is. The
// merged content is derivable from sources + fact, so the fact is what gets
// stored, adopted, and fingerprinted.
type Pick struct {
	Stream string
	Seq    uint64
}

type MergeFact struct {
	Picks []Pick
}

// EncodeFact is the merge fact's canonical byte form.
func EncodeFact(m MergeFact) []byte {
	if uint64(len(m.Picks)) > maxEncodedPayloadLen {
		panic("stream: merge pick count exceeds u32")
	}
	maxInt := int(^uint(0) >> 1)
	size := 4
	for i, pick := range m.Picks {
		if !utf8.ValidString(pick.Stream) {
			panic(fmt.Sprintf("stream: pick %d stream ID is not valid UTF-8", i))
		}
		if len(pick.Stream) > maxEncodedStreamLen {
			panic(fmt.Sprintf("stream: pick %d stream length %d exceeds u16", i, len(pick.Stream)))
		}
		if size > maxInt-10 || len(pick.Stream) > maxInt-size-10 {
			panic("stream: canonical merge fact length overflows int")
		}
		size += 2 + len(pick.Stream) + 8
	}
	buf := make([]byte, 0, size)
	buf = binary.BigEndian.AppendUint32(buf, uint32(len(m.Picks)))
	for _, pick := range m.Picks {
		buf = binary.BigEndian.AppendUint16(buf, uint16(len(pick.Stream)))
		buf = append(buf, pick.Stream...)
		buf = binary.BigEndian.AppendUint64(buf, pick.Seq)
	}
	return buf
}

// FactDigest names a merge fact.
func FactDigest(m MergeFact) Head {
	d := sha256.New()
	d.Write([]byte("playground.mergefact.v1"))
	d.Write(EncodeFact(m))
	var out Head
	copy(out[:], d.Sum(nil))
	return out
}

// MergeGap is a pick referencing no source event. A gap is data, not noise.
type MergeGap struct {
	Pick  Pick
	Index int
}

func (err *MergeGap) Error() string {
	return fmt.Sprintf("stream: pick %d references missing event %s@%d", err.Index, err.Pick.Stream, err.Pick.Seq)
}

// MergeDuplicateOffender is one duplicate-bearing identity coordinate. Every
// event index claiming the coordinate is retained in source order.
type MergeDuplicateOffender struct {
	Source  string `json:"source"`
	Seq     uint64 `json:"seq"`
	Indexes []int  `json:"indexes"`
}

// MergeDuplicateSequence refuses every ambiguous source coordinate at once.
// Offenders are sorted by UTF-8 source bytes, then sequence. The refusal is a
// corpus-grade value: deterministic, complete, and shared with the TS twin.
type MergeDuplicateSequence struct {
	Offenders []MergeDuplicateOffender `json:"offenders"`
}

func (err *MergeDuplicateSequence) Error() string {
	if len(err.Offenders) == 0 || len(err.Offenders[0].Indexes) < 2 {
		return "stream: source repeats a sequence coordinate"
	}
	first := err.Offenders[0]
	// Preserve the established message shape; the typed Offenders field, not
	// Error text, carries the complete corpus-grade refusal.
	return fmt.Sprintf(
		"stream: source %s repeats sequence %d at event indexes %d and %d",
		first.Source,
		first.Seq,
		first.Indexes[0],
		first.Indexes[1],
	)
}

// ApplyMerge replays a merge fact over source streams: deterministic, total
// over sources with unique sequence coordinates, and an explicit typed error
// — never a silent skip or last-write-wins collapse — on malformed input.
func ApplyMerge(m MergeFact, sources map[string][]Event) ([]Event, error) {
	type indexedEvent struct {
		event Event
		index int
	}
	type sourceIndex struct {
		events []Event
		first  uint64
		dense  bool
		bySeq  map[uint64]indexedEvent
	}

	index := make(map[string]sourceIndex, len(sources))
	offenders := make([]MergeDuplicateOffender, 0)
	for name, events := range sources {
		source := sourceIndex{events: events, dense: true}
		if len(events) > 0 {
			source.first = events[0].Seq
		}
		for i, e := range events {
			if e.Seq != source.first+uint64(i) {
				source.dense = false
				break
			}
		}
		if !source.dense {
			source.bySeq = make(map[uint64]indexedEvent, len(events))
			indexesBySeq := make(map[uint64][]int, len(events))
			for i, e := range events {
				indexesBySeq[e.Seq] = append(indexesBySeq[e.Seq], i)
				if _, exists := source.bySeq[e.Seq]; !exists {
					source.bySeq[e.Seq] = indexedEvent{event: e, index: i}
				}
			}
			for seq, indexes := range indexesBySeq {
				if len(indexes) > 1 {
					offenders = append(offenders, MergeDuplicateOffender{
						Source: name, Seq: seq, Indexes: indexes,
					})
				}
			}
		}
		index[name] = source
	}
	if len(offenders) > 0 {
		sort.Slice(offenders, func(i, j int) bool {
			if offenders[i].Source != offenders[j].Source {
				return offenders[i].Source < offenders[j].Source
			}
			return offenders[i].Seq < offenders[j].Seq
		})
		return nil, &MergeDuplicateSequence{Offenders: offenders}
	}

	out := make([]Event, 0, len(m.Picks))
	for i, p := range m.Picks {
		source, ok := index[p.Stream]
		var e Event
		if ok && source.dense {
			offset := p.Seq - source.first
			ok = offset < uint64(len(source.events))
			if ok {
				e = source.events[int(offset)]
			}
		} else if ok {
			indexed, found := source.bySeq[p.Seq]
			if found {
				e = indexed.event
			}
			ok = found
		}
		if !ok {
			return nil, &MergeGap{Pick: p, Index: i}
		}
		out = append(out, e)
	}
	return out, nil
}

// ---------- the semantic fold: a last-write-wins KV ----------

// KV is the deliberately order-sensitive fold that gives merge order meaning:
// payloads are "key=value", same-key later writes win. Cross-key events
// commute under this fold; same-key events do not — which is exactly the
// classification that decides where a merge NEEDS a committed order.
type kvEntry struct {
	value []byte
}

type KV struct {
	m     map[string]*kvEntry
	count uint32
}

func NewKV() *KV { return &KV{m: map[string]*kvEntry{}} }

func (k *KV) Apply(e Event) error {
	if !utf8.Valid(e.Payload) {
		return fmt.Errorf("stream: payload is not valid UTF-8")
	}
	i := bytes.IndexByte(e.Payload, '=')
	if i <= 0 {
		return fmt.Errorf("stream: payload %q is not key=value", e.Payload)
	}
	key, value := e.Payload[:i], e.Payload[i+1:]
	if bytes.IndexByte(key, 0) >= 0 || bytes.IndexByte(value, 0) >= 0 {
		return fmt.Errorf("stream: payload %q contains NUL outside the state-digest domain", e.Payload)
	}
	if k.count == ^uint32(0) {
		return fmt.Errorf("stream: KV event count exceeds u32")
	}
	entry := k.m[string(key)]
	if entry == nil {
		entry = &kvEntry{}
		k.m[string(key)] = entry
	}
	entry.value = append(entry.value[:0], value...)
	k.count++
	return nil
}

// StateDigest is the canonical fingerprint of the fold STATE: sorted keys, so
// two histories that converge to the same state digest identically even when
// their chain heads differ. The chain remembers what the fold forgives.
func (k *KV) StateDigest() Head {
	keys := make([]string, 0, len(k.m))
	for key := range k.m {
		keys = append(keys, key)
	}
	sort.Strings(keys)
	d := sha256.New()
	d.Write([]byte("playground.fold.kv.v1"))
	var b4 [4]byte
	binary.BigEndian.PutUint32(b4[:], k.count)
	d.Write(b4[:])
	for _, key := range keys {
		d.Write([]byte(key))
		d.Write([]byte{0})
		d.Write(k.m[key].value)
		d.Write([]byte{0})
	}
	var out Head
	copy(out[:], d.Sum(nil))
	return out
}

// FoldKV folds a whole log.
func FoldKV(events []Event) (*KV, error) {
	k := NewKV()
	for _, e := range events {
		if err := k.Apply(e); err != nil {
			return nil, err
		}
	}
	return k, nil
}

// KVCountOverflow refuses a union whose summed event count leaves the u32 the
// state digest stores it in.
type KVCountOverflow struct {
	Left  uint32
	Right uint32
}

func (err *KVCountOverflow) Error() string {
	return fmt.Sprintf("stream: KV counts %d + %d exceed u32", err.Left, err.Right)
}

// CombineKV is the meaning fold's combine: the last-write-wins map union, with
// right read as the LATER half of one history. It is the twin of combineKV in
// packages/core/src/stream.ts and the same three laws hold on both sides —
// identity, associativity, and the homomorphism that licenses parallel replay:
//
//	CombineKV(FoldKV(xs), FoldKV(ys)) == FoldKV(append(xs, ys...))
//
// The wall is the proof rather than the property: combine_test.go cuts the
// frozen fixtures/stream-wall.json corpus at every split point and requires the
// recombined StateDigest to be the frozen foldStateDigest byte for byte.
//
// It is a monoid and NOT a semilattice. Order is the semantics of last-write-
// wins, so swapping the arguments moves the answer wherever the two halves
// write one key; and the count is a sum, so a state combined with itself
// double-counts. A fold that must merge WITHOUT a committed order needs the
// join-semilattice, which is only reachable by keeping every event's identity
// coordinate — see packages/core/src/kvSemilattice.ts, which has no Go twin.
//
// Both inputs are left untouched and the result owns its value bytes.
func CombineKV(left, right *KV) (*KV, error) {
	if uint64(left.count)+uint64(right.count) > uint64(^uint32(0)) {
		return nil, &KVCountOverflow{Left: left.count, Right: right.count}
	}
	out := &KV{m: make(map[string]*kvEntry, len(left.m)+len(right.m)), count: left.count + right.count}
	for key, entry := range left.m {
		out.m[key] = &kvEntry{value: bytes.Clone(entry.value)}
	}
	for key, entry := range right.m {
		out.m[key] = &kvEntry{value: bytes.Clone(entry.value)}
	}
	return out, nil
}

// ---------- compaction: replacing a prefix by its fold ----------

// Compacted replaces a prefix by (its chain head, its fold state) and keeps
// the tail. The two-fold law of compaction: the STATE fold of prefix+tail
// must equal state(prefix) then tail, and the IDENTITY fold must survive too
// — the final head recomputed from Base over Tail equals the uncompacted
// head, so verification crosses the compaction boundary. What is lost, and
// only ever by explicit choice: step-through INSIDE the discarded prefix.
type Compacted struct {
	Base  Head // chain head of the discarded prefix
	State *KV  // fold state at the boundary
	Tail  []Event
}

// Compact folds away the first k events of a generic stream log that began at
// base. It does not license session-journal compaction: the session journal
// itself refuses until flb.certification.v0 can export structural refusals,
// let absence refusals die with the trace, and preserve both the state digest
// and corpus digest as evidence of the summarized prefix.
func Compact(base Head, events []Event, k int) (Compacted, error) {
	if k < 0 || k > len(events) {
		return Compacted{}, fmt.Errorf("stream: compaction boundary %d outside 0..%d", k, len(events))
	}
	state, err := FoldKV(events[:k])
	if err != nil {
		return Compacted{}, err
	}
	tail := make([]Event, len(events)-k)
	copy(tail, events[k:])
	return Compacted{Base: HeadFrom(base, events[:k]), State: state, Tail: tail}, nil
}

// ---------- fork: two histories sharing a prefix ----------

// A Segment is a batch of events chained onto a parent head. Histories are
// DAG nodes addressed by head; a fork is two segments with the SAME parent —
// the shared prefix is never copied, while the inserted tail owns its payload
// bytes so caller mutation cannot change content already named by its head.
type Segment struct {
	Parent Head
	Events []Event
}

func (s Segment) Head() Head { return HeadFrom(s.Parent, s.Events) }

// Store is a content-addressed segment store: head -> segment.
type Store map[Head]Segment

func cloneEvents(events []Event) []Event {
	out := make([]Event, len(events))
	for i, event := range events {
		out[i] = event
		out[i].Payload = bytes.Clone(event.Payload)
	}
	return out
}

// Put inserts a segment and returns its head (its name — nothing else names it).
func (st Store) Put(s Segment) Head {
	h := s.Head()
	st[h] = Segment{Parent: s.Parent, Events: cloneEvents(s.Events)}
	return h
}

// Replay walks parent pointers from head back to root and returns the full
// event history. An unknown intermediate head is an explicit error: with hash
// chaining, ABSENCE is detectable — you know exactly what you are missing.
func (st Store) Replay(head Head, root Head) ([]Event, error) {
	var (
		segs []Segment
		seen = make(map[Head]struct{})
	)
	for h := head; h != root; {
		if _, ok := seen[h]; ok {
			return nil, fmt.Errorf("stream: segment cycle at head %s", h.Hex())
		}
		seen[h] = struct{}{}
		s, ok := st[h]
		if !ok {
			return nil, fmt.Errorf("stream: no segment for head %s (gap is explicit)", h.Hex())
		}
		segs = append(segs, s)
		h = s.Parent
	}
	var out []Event
	for i := len(segs) - 1; i >= 0; i-- {
		out = append(out, cloneEvents(segs[i].Events)...)
	}
	return out, nil
}

// ---------- compression: transport, never identity ----------

var (
	gzipWriters = sync.Pool{
		New: func() any { return gzip.NewWriter(io.Discard) },
	}
	gzipFrames = sync.Pool{
		New: func() any { return new([]byte) },
	}
)

func encodedEventsLen(events []Event) (int, error) {
	maxInt := int(^uint(0) >> 1)
	total := 0
	for i, e := range events {
		size, err := checkedEncodedEventLen(e)
		if err != nil {
			return 0, fmt.Errorf("stream: event %d: %w", i, err)
		}
		if size > maxInt-total {
			return 0, fmt.Errorf("stream: canonical frame length overflows int")
		}
		total += size
	}
	return total, nil
}

// GzipEvents frames a batch as concatenated canonical encodings, gzipped.
func GzipEvents(events []Event) ([]byte, error) {
	size, err := encodedEventsLen(events)
	if err != nil {
		return nil, err
	}
	frame := gzipFrames.Get().(*[]byte)
	raw := (*frame)[:0]
	if cap(raw) < size {
		raw = make([]byte, 0, size)
	}
	defer func() {
		if cap(raw) <= maxPooledCanonicalBytes {
			*frame = raw[:0]
			gzipFrames.Put(frame)
		}
	}()
	for _, e := range events {
		raw = appendEncodedEvent(raw, e)
	}

	var out bytes.Buffer
	w := gzipWriters.Get().(*gzip.Writer)
	w.Reset(&out)
	defer func() {
		w.Reset(io.Discard)
		gzipWriters.Put(w)
	}()
	if _, err := w.Write(raw); err != nil {
		return nil, err
	}
	if err := w.Close(); err != nil {
		return nil, err
	}
	return out.Bytes(), nil
}

func decodeEvents(raw []byte) ([]Event, error) {
	var (
		lastStreamBytes []byte
		lastStream      string
		haveLastStream  bool
		streams         map[string]string
		out             []Event
	)
	for off := 0; off < len(raw); {
		if len(raw)-off < 2 {
			return nil, fmt.Errorf("stream: truncated frame at %d", off)
		}
		idLen := int(binary.BigEndian.Uint16(raw[off:]))
		off += 2
		if len(raw)-off < idLen+8+4 {
			return nil, fmt.Errorf("stream: truncated frame at %d", off)
		}
		idBytes := raw[off : off+idLen]
		if !utf8.Valid(idBytes) {
			return nil, fmt.Errorf("stream: stream ID at %d is not valid UTF-8", off)
		}
		var id string
		switch {
		case !haveLastStream:
			id = string(idBytes)
			lastStreamBytes = idBytes
			lastStream = id
			haveLastStream = true
		case bytes.Equal(idBytes, lastStreamBytes):
			id = lastStream
		default:
			if streams == nil {
				streams = map[string]string{lastStream: lastStream}
			}
			var ok bool
			id, ok = streams[string(idBytes)]
			if !ok {
				id = string(idBytes)
				streams[id] = id
			}
			lastStreamBytes = idBytes
			lastStream = id
		}
		off += idLen
		seq := binary.BigEndian.Uint64(raw[off:])
		off += 8
		payLen := binary.BigEndian.Uint32(raw[off:])
		off += 4
		if uint64(payLen) > uint64(len(raw)-off) {
			return nil, fmt.Errorf("stream: truncated payload at %d", off)
		}
		end := off + int(payLen)
		payload := raw[off:end:end]
		off = end
		out = append(out, Event{Stream: id, Seq: seq, Payload: payload})
	}
	return out, nil
}

// GunzipEvents inverts GzipEvents, re-parsing the canonical frames.
func GunzipEvents(frame []byte) ([]Event, error) {
	r, err := gzip.NewReader(bytes.NewReader(frame))
	if err != nil {
		return nil, err
	}
	raw, err := io.ReadAll(r)
	if err != nil {
		return nil, err
	}
	if err := r.Close(); err != nil {
		return nil, err
	}
	return decodeEvents(raw)
}
