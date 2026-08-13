package stream

import (
	"bytes"
	"unicode/utf8"
)

// An Xform is one stream-to-stream transformation: a per-event morphism,
// with ok=false dropping the event. This is the Go dual of a Schema
// decodeTo chain — each Getter pair over the wire is an Xform over the
// stream — and the two worlds are compared by DIGEST, never by argument:
// a TS schema pipeline and a Go xform pipeline are "the same transform"
// exactly when they take equal input streams to equal-head output streams.
//
// The algebra (transform_test.go): Compose is associative, Compose() is
// identity, and composition FUSES — one pass over Compose(f, g, h) equals
// the three sequential passes. Fusion is the efficiency claim: a pipeline
// of N transforms costs one traversal and zero intermediate streams.
type Xform func(Event) (Event, bool)

// Compose applies xforms left to right in ONE pass per event.
func Compose(fs ...Xform) Xform {
	return func(e Event) (Event, bool) {
		cur := e
		for _, f := range fs {
			next, ok := f(cur)
			if !ok {
				return Event{}, false
			}
			cur = next
		}
		return cur, true
	}
}

// Apply runs one traversal, keeping surviving events in order.
func Apply(f Xform, events []Event) []Event {
	out := make([]Event, 0, len(events))
	for _, e := range events {
		if t, ok := f(e); ok {
			out = append(out, t)
		}
	}
	return out
}

// RenameStream retags events onto another stream identity. A target outside
// the canonical stream-ID domain produces the transform refusal value
// (ok=false) before it can reach the identity fold.
func RenameStream(to string) Xform {
	valid := utf8.ValidString(to) && len(to) <= maxEncodedStreamLen
	return func(e Event) (Event, bool) {
		if !valid {
			return Event{}, false
		}
		e.Stream = to
		return e, true
	}
}

// FilterKeyPrefix keeps key=value events whose key starts with prefix.
func FilterKeyPrefix(prefix string) Xform {
	p := []byte(prefix)
	return func(e Event) (Event, bool) {
		i := bytes.IndexByte(e.Payload, '=')
		return e, i > 0 && bytes.HasPrefix(e.Payload[:i], p)
	}
}

func appendUpper(dst, src []byte) []byte {
	for _, c := range src {
		if 'a' <= c && c <= 'z' {
			c -= 'a' - 'A'
		}
		dst = append(dst, c)
	}
	return dst
}

// MapValueUpper uppercases ASCII a-z bytes in the value half of key=value
// payloads, allocating a fresh payload (xforms never mutate their input).
// Non-ASCII bytes are preserved verbatim: digest behavior depends on no
// runtime Unicode table.
func MapValueUpper() Xform {
	return func(e Event) (Event, bool) {
		i := bytes.IndexByte(e.Payload, '=')
		if i < 0 {
			return e, true
		}
		p := make([]byte, i+1, len(e.Payload))
		copy(p, e.Payload[:i+1])
		e.Payload = appendUpper(p, e.Payload[i+1:])
		return e, true
	}
}
