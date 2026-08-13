package effector

import (
	"testing"

	"github.com/nats-io/nats.go/jetstream"
)

func TestBadShapeReasonPinsHistoryAndPersistMode(t *testing.T) {
	baseKV := jetstream.KeyValueConfig{
		Bucket: "E_gate", Storage: jetstream.FileStorage, History: 1, MaxBytes: -1,
	}
	baseStream := jetstream.StreamConfig{PersistMode: jetstream.DefaultPersistMode}
	if reason := badShapeReason(baseKV, baseStream); reason != "" {
		t.Fatalf("baseline shape refused: %s", reason)
	}

	wide := baseKV
	wide.History = 2
	if reason := badShapeReason(wide, baseStream); reason != "history is not exactly one" {
		t.Fatalf("history=2 reason=%q", reason)
	}

	async := baseStream
	async.PersistMode = jetstream.AsyncPersistMode
	if reason := badShapeReason(baseKV, async); reason != "persist mode is async" {
		t.Fatalf("async persist reason=%q", reason)
	}
}
