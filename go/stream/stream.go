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
)

// An Event is one received fact: stream identity, position, payload. Arrival
// order across streams is NOT in the event — order is what merge facts commit.
type Event struct {
	Stream  string
	Seq     uint64
	Payload []byte
}

// EncodeEvent is the canonical byte form. Everything — chain heads, merge
// digests, wire frames — goes through it, so there is exactly one identity.
func EncodeEvent(e Event) []byte {
	buf := make([]byte, 0, 2+len(e.Stream)+8+4+len(e.Payload))
	var b2 [2]byte
	var b4 [4]byte
	var b8 [8]byte
	binary.BigEndian.PutUint16(b2[:], uint16(len(e.Stream)))
	buf = append(buf, b2[:]...)
	buf = append(buf, e.Stream...)
	binary.BigEndian.PutUint64(b8[:], e.Seq)
	buf = append(buf, b8[:]...)
	binary.BigEndian.PutUint32(b4[:], uint32(len(e.Payload)))
	buf = append(buf, b4[:]...)
	buf = append(buf, e.Payload...)
	return buf
}

// Head is a chain fingerprint: 32 bytes committing to an entire prefix.
type Head [32]byte

func (h Head) Hex() string { return fmt.Sprintf("%x", h[:]) }

// StreamSeed is the empty-history head of one named stream.
func StreamSeed(stream string) Head {
	return sha256.Sum256([]byte("playground.stream.v1:" + stream))
}

// MergeSeed is the empty-history head of a merged log. A merge is a NEW
// stream whose events happen to come from elsewhere.
func MergeSeed() Head {
	return sha256.Sum256([]byte("playground.merge.v1"))
}

// Extend is the identity fold: one event onto a head. O(1) incremental — the
// whole point of chaining over rehashing history.
func Extend(h Head, e Event) Head {
	d := sha256.New()
	d.Write(h[:])
	d.Write(EncodeEvent(e))
	var out Head
	copy(out[:], d.Sum(nil))
	return out
}

// HeadFrom folds a batch onto a base head.
func HeadFrom(base Head, events []Event) Head {
	h := base
	for _, e := range events {
		h = Extend(h, e)
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
	buf := make([]byte, 0, 4+len(m.Picks)*12)
	var b2 [2]byte
	var b4 [4]byte
	var b8 [8]byte
	binary.BigEndian.PutUint32(b4[:], uint32(len(m.Picks)))
	buf = append(buf, b4[:]...)
	for _, p := range m.Picks {
		binary.BigEndian.PutUint16(b2[:], uint16(len(p.Stream)))
		buf = append(buf, b2[:]...)
		buf = append(buf, p.Stream...)
		binary.BigEndian.PutUint64(b8[:], p.Seq)
		buf = append(buf, b8[:]...)
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

// ApplyMerge replays a merge fact over source streams: deterministic, total
// over well-formed input, and an explicit error — never a silent skip — on a
// pick with no matching source event (a gap is data, not noise).
func ApplyMerge(m MergeFact, sources map[string][]Event) ([]Event, error) {
	index := make(map[string]map[uint64]Event, len(sources))
	for name, events := range sources {
		bySeq := make(map[uint64]Event, len(events))
		for _, e := range events {
			bySeq[e.Seq] = e
		}
		index[name] = bySeq
	}
	out := make([]Event, 0, len(m.Picks))
	for i, p := range m.Picks {
		e, ok := index[p.Stream][p.Seq]
		if !ok {
			return nil, fmt.Errorf("stream: pick %d references missing event %s@%d", i, p.Stream, p.Seq)
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
type KV struct {
	m     map[string]string
	count uint32
}

func NewKV() *KV { return &KV{m: map[string]string{}} }

func (k *KV) Apply(e Event) error {
	parts := bytes.SplitN(e.Payload, []byte{'='}, 2)
	if len(parts) != 2 || len(parts[0]) == 0 {
		return fmt.Errorf("stream: payload %q is not key=value", e.Payload)
	}
	k.m[string(parts[0])] = string(parts[1])
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
		d.Write([]byte(k.m[key]))
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

// Compact folds away the first k events of a log that began at base.
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
// creation is O(1) and copies nothing, because the shared prefix is shared
// structure, not duplicated bytes. Same answer as git, for the same reason.
type Segment struct {
	Parent Head
	Events []Event
}

func (s Segment) Head() Head { return HeadFrom(s.Parent, s.Events) }

// Store is a content-addressed segment store: head -> segment.
type Store map[Head]Segment

// Put inserts a segment and returns its head (its name — nothing else names it).
func (st Store) Put(s Segment) Head {
	h := s.Head()
	st[h] = s
	return h
}

// Replay walks parent pointers from head back to root and returns the full
// event history. An unknown intermediate head is an explicit error: with hash
// chaining, ABSENCE is detectable — you know exactly what you are missing.
func (st Store) Replay(head Head, root Head) ([]Event, error) {
	var segs []Segment
	for h := head; h != root; {
		s, ok := st[h]
		if !ok {
			return nil, fmt.Errorf("stream: no segment for head %s (gap is explicit)", h.Hex())
		}
		segs = append(segs, s)
		h = s.Parent
	}
	var out []Event
	for i := len(segs) - 1; i >= 0; i-- {
		out = append(out, segs[i].Events...)
	}
	return out, nil
}

// ---------- compression: transport, never identity ----------

// GzipEvents frames a batch as concatenated canonical encodings, gzipped.
func GzipEvents(events []Event) ([]byte, error) {
	var raw bytes.Buffer
	for _, e := range events {
		raw.Write(EncodeEvent(e))
	}
	var out bytes.Buffer
	w := gzip.NewWriter(&out)
	if _, err := w.Write(raw.Bytes()); err != nil {
		return nil, err
	}
	if err := w.Close(); err != nil {
		return nil, err
	}
	return out.Bytes(), nil
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
	var out []Event
	for off := 0; off < len(raw); {
		if len(raw)-off < 2 {
			return nil, fmt.Errorf("stream: truncated frame at %d", off)
		}
		idLen := int(binary.BigEndian.Uint16(raw[off:]))
		off += 2
		if len(raw)-off < idLen+8+4 {
			return nil, fmt.Errorf("stream: truncated frame at %d", off)
		}
		id := string(raw[off : off+idLen])
		off += idLen
		seq := binary.BigEndian.Uint64(raw[off:])
		off += 8
		payLen := int(binary.BigEndian.Uint32(raw[off:]))
		off += 4
		if len(raw)-off < payLen {
			return nil, fmt.Errorf("stream: truncated payload at %d", off)
		}
		payload := make([]byte, payLen)
		copy(payload, raw[off:off+payLen])
		off += payLen
		out = append(out, Event{Stream: id, Seq: seq, Payload: payload})
	}
	return out, nil
}
