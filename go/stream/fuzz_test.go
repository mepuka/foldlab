package stream

import (
	"bytes"
	"crypto/sha256"
	"testing"
	"unicode/utf8"
)

func FuzzMapValueUpperMatchesReference(f *testing.F) {
	for _, seed := range [][]byte{
		[]byte("key=ascii"),
		[]byte("key=Straße"),
		[]byte("key=ɐtail"),
		[]byte("key=ﬀ"),
		{'k', 'e', 'y', '=', 0xff, 'a'},
		{'=', 0x80, 0xbf, 0xc0, 0xe0, 0xf0},
		[]byte("no-boundary"),
	} {
		f.Add(seed)
	}
	f.Fuzz(func(t *testing.T, payload []byte) {
		if len(payload) > 4096 {
			return
		}
		input := append([]byte(nil), payload...)
		event := Event{Stream: "s", Seq: 1, Payload: input}
		got, ok := MapValueUpper()(event)
		if !ok {
			t.Fatal("MapValueUpper dropped an event")
		}
		want := referenceMapValueUpper(event)
		if !bytes.Equal(got.Payload, want.Payload) {
			t.Fatalf("upper(% x) = % x, want % x", payload, got.Payload, want.Payload)
		}
		if !bytes.Equal(input, payload) {
			t.Fatal("MapValueUpper mutated its input")
		}
	})
}

func FuzzCanonicalPathsMatchReference(f *testing.F) {
	f.Add("alpha", uint64(0), []byte{})
	f.Add("", ^uint64(0), []byte{0, 0xff})
	f.Add("β", uint64(1), bytes.Repeat([]byte{'x'}, inlineHeadFrameSize))
	f.Fuzz(func(t *testing.T, stream string, seq uint64, payload []byte) {
		if len(stream) > 1024 || len(payload) > 8192 || !utf8.ValidString(stream) {
			return
		}
		event := Event{Stream: stream, Seq: seq, Payload: payload}
		if got, want := EncodeEvent(event), referenceEncodeEvent(event); !bytes.Equal(got, want) {
			t.Fatalf("canonical bytes differ: % x != % x", got, want)
		}
		base := Head(sha256.Sum256(payload))
		if got, want := Extend(base, event), referenceExtend(base, event); got != want {
			t.Fatalf("incremental head differs: %s != %s", got.Hex(), want.Hex())
		}
		events := append(generatedEvents(payload), event)
		if got, want := HeadFrom(base, events), referenceHeadFrom(base, events); got != want {
			t.Fatalf("batch head differs: %s != %s", got.Hex(), want.Hex())
		}
	})
}

func FuzzDecodeEventsIsCanonicalInverse(f *testing.F) {
	for _, seed := range [][]byte{
		nil,
		{0},
		make([]byte, eventFrameOverhead),
		func() []byte {
			event := Event{Stream: "alpha", Seq: ^uint64(0), Payload: []byte{0, 0xff, '='}}
			return EncodeEvent(event)
		}(),
	} {
		f.Add(seed)
	}
	f.Fuzz(func(t *testing.T, raw []byte) {
		if len(raw) > 64<<10 {
			return
		}
		events, err := decodeEvents(raw)
		if err != nil {
			return
		}
		var encoded []byte
		for _, event := range events {
			encoded = append(encoded, EncodeEvent(event)...)
		}
		if !bytes.Equal(encoded, raw) {
			t.Fatalf("successful decode did not invert canonical bytes: % x != % x", encoded, raw)
		}
	})
}

func FuzzGzipEventsRoundTrip(f *testing.F) {
	f.Add([]byte{})
	f.Add([]byte{3, 1, 2, 3, 4, 5, 6, 7})
	f.Add(bytes.Repeat([]byte{0xff}, 512))
	f.Fuzz(func(t *testing.T, data []byte) {
		if len(data) > 64<<10 {
			return
		}
		events := generatedEvents(data)
		frame, err := GzipEvents(events)
		if err != nil {
			t.Fatal(err)
		}
		got, err := GunzipEvents(frame)
		if err != nil {
			t.Fatal(err)
		}
		if !eventsEqual(got, events) {
			t.Fatalf("gzip round trip changed events: %#v != %#v", got, events)
		}
		if HeadFrom(MergeSeed(), got) != HeadFrom(MergeSeed(), events) {
			t.Fatal("gzip round trip moved the head")
		}
	})
}

func FuzzGunzipEventsNeverReturnsNonCanonicalData(f *testing.F) {
	valid, err := GzipEvents([]Event{{Stream: "alpha", Seq: 1, Payload: []byte("a=1")}})
	if err != nil {
		f.Fatal(err)
	}
	f.Add(valid)
	f.Add([]byte{})
	f.Add([]byte("not gzip"))
	f.Fuzz(func(t *testing.T, frame []byte) {
		if len(frame) > 64<<10 {
			return
		}
		events, err := GunzipEvents(frame)
		if err != nil {
			return
		}
		reencoded, err := GzipEvents(events)
		if err != nil {
			t.Fatal(err)
		}
		roundTrip, err := GunzipEvents(reencoded)
		if err != nil || !eventsEqual(roundTrip, events) {
			t.Fatalf("successful gunzip returned non-round-trippable events: %v", err)
		}
	})
}

func FuzzApplyMergeMatchesReference(f *testing.F) {
	f.Add([]byte{})
	f.Add([]byte{4, 1, 2, 3, 4, 5, 6, 7, 8})
	f.Add(bytes.Repeat([]byte{0xff}, 256))
	f.Fuzz(func(t *testing.T, data []byte) {
		if len(data) > 64<<10 {
			return
		}
		fact, sources := generatedMerge(data)
		got, gotErr := ApplyMerge(fact, sources)
		want, wantErr := referenceApplyMerge(fact, sources)
		if (gotErr != nil) != (wantErr != nil) || !eventsEqual(got, want) {
			t.Fatalf("merge differs: got %#v, %v; want %#v, %v", got, gotErr, want, wantErr)
		}
	})
}

func FuzzFoldKVMatchesReference(f *testing.F) {
	f.Add([]byte{})
	f.Add([]byte{8, 1, 2, 3, 4, 5, 6, 7, 8})
	f.Add(bytes.Repeat([]byte{0xff}, 256))
	f.Fuzz(func(t *testing.T, data []byte) {
		if len(data) > 64<<10 {
			return
		}
		events := generatedKVEvents(data)
		state, gotErr := FoldKV(events)
		want, wantErr := referenceStateDigest(events)
		if (gotErr != nil) != (wantErr != nil) {
			t.Fatalf("KV error differs: got %v, want %v", gotErr, wantErr)
		}
		if gotErr != nil {
			return
		}
		if got := state.StateDigest(); got != want {
			t.Fatalf("KV digest differs: %s != %s", got.Hex(), want.Hex())
		}
		before := state.StateDigest()
		for i := range events {
			for j := range events[i].Payload {
				events[i].Payload[j] ^= 0xff
			}
		}
		if after := state.StateDigest(); after != before {
			t.Fatal("KV state aliases input event payloads")
		}
	})
}

func FuzzTransformAlgebraAndPrefix(f *testing.F) {
	f.Add([]byte("a=value"), "a")
	f.Add([]byte{'a', '=', 0xff, 'z'}, "a")
	f.Add([]byte("β=ɐ"), "β")
	f.Fuzz(func(t *testing.T, payload []byte, prefix string) {
		if len(payload) > 4096 || len(prefix) > 64 {
			return
		}
		event := Event{Stream: "source", Seq: 1, Payload: append([]byte(nil), payload...)}
		filtered, ok := FilterKeyPrefix(prefix)(event)
		if ok != referenceFilterKeyPrefix(payload, prefix) {
			t.Fatalf("prefix decision differs for %q over % x", prefix, payload)
		}
		if ok && !eventsEqual([]Event{filtered}, []Event{event}) {
			t.Fatal("filter changed a kept event")
		}
		transforms := []Xform{RenameStream("z"), FilterKeyPrefix(prefix), MapValueUpper()}
		fused := Apply(Compose(transforms...), []Event{event})
		sequential := Apply(transforms[2], Apply(transforms[1], Apply(transforms[0], []Event{event})))
		if !eventsEqual(fused, sequential) {
			t.Fatalf("fusion differs: %#v != %#v", fused, sequential)
		}
		if !bytes.Equal(event.Payload, payload) {
			t.Fatal("transform pipeline mutated its input")
		}
	})
}

func FuzzEncodeFactMatchesReference(f *testing.F) {
	f.Add([]byte{})
	f.Add([]byte{9, 1, 2, 3, 4, 5, 6, 7, 8})
	f.Add(bytes.Repeat([]byte{0xff}, 256))
	f.Fuzz(func(t *testing.T, data []byte) {
		if len(data) > 64<<10 {
			return
		}
		fact, _ := generatedMerge(data)
		if got, want := EncodeFact(fact), referenceEncodeFact(fact); !bytes.Equal(got, want) {
			t.Fatalf("merge fact differs: % x != % x", got, want)
		}
	})
}

func FuzzCompactionPreservesBothFolds(f *testing.F) {
	f.Add([]byte{})
	f.Add([]byte{8, 1, 2, 3, 4, 5, 6, 7, 8})
	f.Add(bytes.Repeat([]byte{'a'}, 256))
	f.Fuzz(func(t *testing.T, data []byte) {
		if len(data) > 64<<10 {
			return
		}
		events := generatedKVEvents(data)
		fullState, err := FoldKV(events)
		if err != nil {
			return
		}
		base := StreamSeed("compact")
		fullHead := HeadFrom(base, events)
		for boundary := 0; boundary <= len(events); boundary++ {
			compacted, err := Compact(base, events, boundary)
			if err != nil {
				t.Fatal(err)
			}
			if HeadFrom(compacted.Base, compacted.Tail) != fullHead {
				t.Fatalf("boundary %d moved the head", boundary)
			}
			for _, event := range compacted.Tail {
				if err := compacted.State.Apply(event); err != nil {
					t.Fatal(err)
				}
			}
			if compacted.State.StateDigest() != fullState.StateDigest() {
				t.Fatalf("boundary %d changed folded state", boundary)
			}
		}
	})
}

func FuzzStoreReplayOwnsBytes(f *testing.F) {
	f.Add([]byte{})
	f.Add([]byte{4, 1, 2, 3, 4, 5, 6, 7, 8})
	f.Fuzz(func(t *testing.T, data []byte) {
		if len(data) > 64<<10 {
			return
		}
		events := generatedEvents(data)
		want := cloneEvents(events)
		root := StreamSeed("store")
		store := Store{}
		head := store.Put(Segment{Parent: root, Events: events})
		for i := range events {
			clear(events[i].Payload)
		}
		got, err := store.Replay(head, root)
		if err != nil || !eventsEqual(got, want) {
			t.Fatalf("replay differs: %#v, %v; want %#v", got, err, want)
		}
	})
}
