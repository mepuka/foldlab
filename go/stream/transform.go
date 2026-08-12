package stream

import "bytes"

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

// RenameStream retags events onto another stream identity.
func RenameStream(to string) Xform {
	return func(e Event) (Event, bool) {
		e.Stream = to
		return e, true
	}
}

// FilterKeyPrefix keeps key=value events whose key starts with prefix.
func FilterKeyPrefix(prefix string) Xform {
	p := []byte(prefix)
	return func(e Event) (Event, bool) {
		return e, bytes.HasPrefix(e.Payload, p) ||
			(bytes.IndexByte(e.Payload, '=') > len(p) && bytes.HasPrefix(e.Payload[:len(p)], p))
	}
}

// MapValueUpper uppercases the value half of key=value payloads, allocating
// a fresh payload (xforms never mutate their input).
func MapValueUpper() Xform {
	return func(e Event) (Event, bool) {
		i := bytes.IndexByte(e.Payload, '=')
		if i < 0 {
			return e, true
		}
		p := make([]byte, len(e.Payload))
		copy(p, e.Payload[:i+1])
		copy(p[i+1:], bytes.ToUpper(e.Payload[i+1:]))
		e.Payload = p
		return e, true
	}
}
