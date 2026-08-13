package stream

import (
	"encoding/binary"
	"encoding/json"
	"os"
	"strconv"
	"testing"
)

func TestEventIdentityUsesTheCommonSafeSequenceDomain(t *testing.T) {
	row := readTwinBoundaryRow(t)
	if row.Scheme != "stream-twin-boundaries-v1" || row.Oracle == "" {
		t.Fatalf("unrecognized boundary oracle: %q, %q", row.Scheme, row.Oracle)
	}
	maxSafe, err := strconv.ParseUint(row.MaxSafeSequence, 10, 64)
	if err != nil || maxSafe != maxSafeSequence {
		t.Fatalf("max-safe decimal = %q, %v", row.MaxSafeSequence, err)
	}
	firstRefused, err := strconv.ParseUint(row.FirstRefusedSequence, 10, 64)
	if err != nil || firstRefused != maxSafe+1 {
		t.Fatalf("first-refused decimal = %q, %v", row.FirstRefusedSequence, err)
	}
	admitted := Event{Stream: row.Event.Stream, Seq: maxSafe, Payload: nil}
	if got, want := StreamSeed(row.Event.Stream).Hex(), row.Event.SeedHex; got != want {
		t.Fatalf("seed = %s, want independent SHA-256 oracle %s", got, want)
	}
	if got, want := stringHex(EncodeEvent(admitted)), row.Event.FrameHex; got != want {
		t.Fatalf("max-safe frame = %s, want independently encoded %s", got, want)
	}
	if got, want := Extend(StreamSeed(row.Event.Stream), admitted).Hex(), row.Event.HeadHex; got != want {
		t.Fatalf("max-safe head = %s, want independent SHA-256 oracle %s", got, want)
	}

	outside := Event{Stream: row.Event.Stream, Seq: firstRefused, Payload: nil}
	requirePanic(t, func() { EncodeEvent(outside) })
	requirePanic(t, func() { Extend(StreamSeed(row.Event.Stream), outside) })
	requirePanic(t, func() { EncodeFact(MergeFact{Picks: []Pick{{Stream: row.Event.Stream, Seq: firstRefused}}}) })
	if _, err := GzipEvents([]Event{outside}); err == nil {
		t.Fatal("GzipEvents admitted sequence 2^53")
	}
	raw := make([]byte, eventFrameOverhead+1)
	binary.BigEndian.PutUint16(raw, 1)
	raw[2] = 's'
	binary.BigEndian.PutUint64(raw[3:], firstRefused)
	if _, err := decodeEvents(raw); err == nil {
		t.Fatal("decodeEvents admitted sequence 2^53")
	}
}

type twinBoundaryRow struct {
	Scheme               string `json:"scheme"`
	Oracle               string `json:"oracle"`
	MaxSafeSequence      string `json:"maxSafeSequence"`
	FirstRefusedSequence string `json:"firstRefusedSequence"`
	Event                struct {
		Stream     string `json:"stream"`
		PayloadHex string `json:"payloadHex"`
		FrameHex   string `json:"frameHex"`
		SeedHex    string `json:"seedHex"`
		HeadHex    string `json:"headHex"`
	} `json:"event"`
}

func readTwinBoundaryRow(t *testing.T) twinBoundaryRow {
	t.Helper()
	raw, err := os.ReadFile("../../fixtures/stream-twin-boundaries.json")
	if err != nil {
		t.Fatal(err)
	}
	var row twinBoundaryRow
	if err := json.Unmarshal(raw, &row); err != nil {
		t.Fatal(err)
	}
	if row.Event.PayloadHex != "" {
		t.Fatalf("boundary corpus payload is not empty: %q", row.Event.PayloadHex)
	}
	return row
}

func TestRenameStreamRefusesAnInvalidTargetBeforeIdentity(t *testing.T) {
	input := Event{Stream: "source", Seq: 1, Payload: []byte("a=1")}
	invalid := string([]byte{0xff})
	if got, ok := RenameStream(invalid)(input); ok {
		t.Fatalf("invalid rename target produced %#v", got)
	}
	requirePanic(t, func() { EncodeEvent(Event{Stream: invalid}) })
	requirePanic(t, func() { Extend(StreamSeed("source"), Event{Stream: invalid}) })
	oversized := string(make([]byte, maxEncodedStreamLen+1))
	if got, ok := RenameStream(oversized)(input); ok {
		t.Fatalf("oversized rename target produced %#v", got)
	}
	requirePanic(t, func() { StreamSeed(oversized) })
}

func TestEmptyReplayAndGunzipAreAllocatedEmptyLists(t *testing.T) {
	root := StreamSeed("root")
	replayed, err := (Store{}).Replay(root, root)
	if err != nil {
		t.Fatalf("empty replay: %v", err)
	}
	assertJSONEmptyArray(t, replayed)

	frame, err := GzipEvents([]Event{})
	if err != nil {
		t.Fatalf("gzip empty: %v", err)
	}
	decoded, err := GunzipEvents(frame)
	if err != nil {
		t.Fatalf("gunzip empty: %v", err)
	}
	assertJSONEmptyArray(t, decoded)
}

func assertJSONEmptyArray(t *testing.T, events []Event) {
	t.Helper()
	if events == nil {
		t.Fatal("empty event list is nil")
	}
	encoded, err := json.Marshal(events)
	if err != nil {
		t.Fatal(err)
	}
	if got := string(encoded); got != "[]" {
		t.Fatalf("empty event JSON = %s, want []", got)
	}
}

func stringHex(value []byte) string {
	const digits = "0123456789abcdef"
	out := make([]byte, len(value)*2)
	for i, b := range value {
		out[i*2] = digits[b>>4]
		out[i*2+1] = digits[b&0xf]
	}
	return string(out)
}
