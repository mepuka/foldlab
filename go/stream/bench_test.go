package stream

import (
	"bytes"
	"strconv"
	"testing"
)

func benchmarkEvents(n, payloadSize int) []Event {
	payload := bytes.Repeat([]byte{'x'}, payloadSize)
	events := make([]Event, n)
	for i := range events {
		events[i] = Event{Stream: "bench", Seq: uint64(i), Payload: payload}
	}
	return events
}

func benchmarkKVEvents(n, keyCount int) []Event {
	events := make([]Event, n)
	for i := range events {
		keyIndex := i % keyCount
		prefix := "a"
		if keyIndex%2 != 0 {
			prefix = "b"
		}
		payload := prefix + strconv.Itoa(keyIndex) + "=value-" + strconv.Itoa(i)
		events[i] = Event{Stream: "bench", Seq: uint64(i), Payload: []byte(payload)}
	}
	return events
}

func benchmarkMerge(n int) (MergeFact, map[string][]Event) {
	left := make([]Event, n/2)
	right := make([]Event, n/2)
	picks := make([]Pick, 0, n)
	for i := range left {
		seq := uint64(i)
		left[i] = Event{Stream: "left", Seq: seq, Payload: []byte("left")}
		right[i] = Event{Stream: "right", Seq: seq, Payload: []byte("right")}
		picks = append(picks, Pick{Stream: "left", Seq: seq}, Pick{Stream: "right", Seq: seq})
	}
	return MergeFact{Picks: picks}, map[string][]Event{"left": left, "right": right}
}

var (
	benchmarkBytesSink  []byte
	benchmarkEventsSink []Event
	benchmarkHeadSink   Head
	benchmarkKVSink     *KV
)

func BenchmarkEncodeEvent(b *testing.B) {
	for _, size := range []struct {
		name  string
		bytes int
	}{
		{name: "payload=8B", bytes: 8},
		{name: "payload=4KiB", bytes: 4 * 1024},
	} {
		event := benchmarkEvents(1, size.bytes)[0]
		b.Run(size.name, func(b *testing.B) {
			b.ReportAllocs()
			b.ResetTimer()
			var encoded []byte
			for i := 0; i < b.N; i++ {
				encoded = EncodeEvent(event)
			}
			benchmarkBytesSink = encoded
		})
	}
}

// The two chain folds expose their batch-sized allocation slope.
func BenchmarkExtend(b *testing.B) {
	for _, n := range []int{100, 10_000} {
		events := benchmarkEvents(n, 32)
		base := StreamSeed("bench")
		b.Run("n="+strconv.Itoa(n), func(b *testing.B) {
			b.ReportAllocs()
			b.ResetTimer()
			var head Head
			for i := 0; i < b.N; i++ {
				head = base
				for _, event := range events {
					head = Extend(head, event)
				}
			}
			benchmarkHeadSink = head
		})
	}
}

func BenchmarkHeadFrom(b *testing.B) {
	for _, n := range []int{100, 10_000} {
		events := benchmarkEvents(n, 32)
		base := StreamSeed("bench")
		b.Run("n="+strconv.Itoa(n), func(b *testing.B) {
			b.ReportAllocs()
			b.ResetTimer()
			var head Head
			for i := 0; i < b.N; i++ {
				head = HeadFrom(base, events)
			}
			benchmarkHeadSink = head
		})
	}
}

// Fusion witnesses the intermediate streams paid by sequential traversal.
func BenchmarkApplyFusion(b *testing.B) {
	f := RenameStream("z")
	g := FilterKeyPrefix("a")
	h := MapValueUpper()
	fused := Compose(f, g, h)
	for _, n := range []int{100, 10_000} {
		events := benchmarkKVEvents(n, 100)
		b.Run("n="+strconv.Itoa(n), func(b *testing.B) {
			b.Run("fused", func(b *testing.B) {
				b.ReportAllocs()
				b.ResetTimer()
				var out []Event
				for i := 0; i < b.N; i++ {
					out = Apply(fused, events)
				}
				benchmarkEventsSink = out
			})
			b.Run("sequential", func(b *testing.B) {
				b.ReportAllocs()
				b.ResetTimer()
				var out []Event
				for i := 0; i < b.N; i++ {
					out = Apply(h, Apply(g, Apply(f, events)))
				}
				benchmarkEventsSink = out
			})
		})
	}
}

func BenchmarkApplyMerge(b *testing.B) {
	fact, sources := benchmarkMerge(10_000)
	b.ReportAllocs()
	b.ResetTimer()
	var merged []Event
	for i := 0; i < b.N; i++ {
		var err error
		merged, err = ApplyMerge(fact, sources)
		if err != nil {
			b.Fatal(err)
		}
	}
	benchmarkEventsSink = merged
}

func BenchmarkFoldKV(b *testing.B) {
	events := benchmarkKVEvents(10_000, 100)
	b.ReportAllocs()
	b.ResetTimer()
	var state *KV
	for i := 0; i < b.N; i++ {
		var err error
		state, err = FoldKV(events)
		if err != nil {
			b.Fatal(err)
		}
	}
	benchmarkKVSink = state
}

func BenchmarkStateDigest(b *testing.B) {
	events := benchmarkKVEvents(10_000, 100)
	state, err := FoldKV(events)
	if err != nil {
		b.Fatal(err)
	}
	b.ReportAllocs()
	b.ResetTimer()
	var digest Head
	for i := 0; i < b.N; i++ {
		digest = state.StateDigest()
	}
	benchmarkHeadSink = digest
}

func BenchmarkGzipEvents(b *testing.B) {
	events := benchmarkKVEvents(1_000, 100)
	b.ReportAllocs()
	b.ResetTimer()
	var frame []byte
	for i := 0; i < b.N; i++ {
		var err error
		frame, err = GzipEvents(events)
		if err != nil {
			b.Fatal(err)
		}
	}
	benchmarkBytesSink = frame
}

func BenchmarkGunzipEvents(b *testing.B) {
	events := benchmarkKVEvents(1_000, 100)
	frame, err := GzipEvents(events)
	if err != nil {
		b.Fatal(err)
	}
	b.ReportAllocs()
	b.ResetTimer()
	var decoded []Event
	for i := 0; i < b.N; i++ {
		decoded, err = GunzipEvents(frame)
		if err != nil {
			b.Fatal(err)
		}
	}
	benchmarkEventsSink = decoded
}
