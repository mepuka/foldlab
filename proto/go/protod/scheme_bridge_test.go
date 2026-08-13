package protod

import (
	"context"
	"encoding/json"
	"testing"

	"foldlab/journal"
)

func TestSchemeBridgeFixturesRederiveAndDecode(t *testing.T) {
	var vectors []struct {
		Name      string          `json:"name"`
		Record    json.RawMessage `json:"record"`
		Canonical string          `json:"canonical"`
		Digest    string          `json:"digest"`
	}
	loadFixture(t, "scheme-bridges.json", &vectors)
	if len(vectors) == 0 {
		t.Fatal("no scheme bridge vectors")
	}
	for _, vector := range vectors {
		bridge, err := decodeSchemeBridge(vector.Record)
		if err != nil {
			t.Fatalf("%s: decode bridge: %v", vector.Name, err)
		}
		if bridge.Kind != schemeBridgeKind {
			t.Fatalf("%s: bridge kind=%q", vector.Name, bridge.Kind)
		}
		var value any
		if err := json.Unmarshal(vector.Record, &value); err != nil {
			t.Fatalf("%s: decode fixture value: %v", vector.Name, err)
		}
		canonical, err := canonicalBytes(value)
		if err != nil {
			t.Fatalf("%s: canonicalize bridge: %v", vector.Name, err)
		}
		if string(canonical) != vector.Canonical {
			t.Errorf("%s: canonical bridge drifted\n got %s\nwant %s", vector.Name, canonical, vector.Canonical)
		}
		if digest := (bytesSHA256V1{}).Derive(canonical); digest != vector.Digest {
			t.Errorf("%s: bridge digest drifted: got %s want %s", vector.Name, digest, vector.Digest)
		}
	}
	invalid := []byte(`{"kind":"flb.scheme-bridge.v0","from":{"digest":"not-a-digest","scheme":"bytes-sha256-v1"},"to":{"digest":"aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa","scheme":"flb.type.v1"}}`)
	if _, err := decodeSchemeBridge(invalid); err == nil {
		t.Fatal("strict bridge decoder admitted an invalid predecessor digest")
	}
}

func TestLegacyFactIsReidentifiedWithoutRewrite(t *testing.T) {
	ctx := context.Background()
	store := t.TempDir()
	first, err := Acquire(ctx, Options{StoreDir: store, SyncMode: SyncCrashDurable})
	if err != nil {
		t.Fatalf("acquire legacy writer: %v", err)
	}
	structure := map[string]any{"k": "string"}
	normalized, err := normalize(structure)
	if err != nil {
		first.Release()
		t.Fatalf("normalize legacy structure: %v", err)
	}
	structureBytes, err := canonicalBytes(normalized)
	if err != nil {
		first.Release()
		t.Fatalf("canonicalize legacy structure: %v", err)
	}
	digest := (bytesSHA256V1{}).Derive(structureBytes)
	legacyPayload, err := canonicalBytes(map[string]any{
		"digest":    digest,
		"scheme":    (bytesSHA256V1{}).Name(),
		"structure": normalized,
		"submitter": "legacy",
	})
	if err != nil {
		first.Release()
		t.Fatalf("canonicalize legacy fact: %v", err)
	}
	if _, _, err := first.catalog.journal.Append(ctx, string(legacyPayload)); err != nil {
		first.Release()
		t.Fatalf("append legacy fact: %v", err)
	}
	first.Release()

	second, err := Acquire(ctx, Options{StoreDir: store, SyncMode: SyncCrashDurable})
	if err != nil {
		t.Fatalf("reopen legacy store: %v", err)
	}
	t.Cleanup(second.Release)
	certificate, refusal, err := second.certify(ctx, []byte(`{"structure":{"k":"string"}}`))
	if err != nil || refusal != nil || certificate == nil {
		t.Fatalf("re-identification failed: certificate=%+v refusal=%+v err=%v", certificate, refusal, err)
	}
	if !certificate.Created || certificate.Fact.Scheme != flbTypeV1Scheme || certificate.Fact.Digest != digest {
		t.Fatalf("legacy fact was not re-identified under the owned scheme: %+v", certificate)
	}
	entries, _, err := second.catalog.journal.Read(ctx, journalGenesisCursor(), 0)
	if err != nil {
		t.Fatalf("read migrated catalog: %v", err)
	}
	if len(entries) != 3 {
		t.Fatalf("migration records=%d, want legacy fact + owned fact + bridge", len(entries))
	}
	var legacy, owned map[string]any
	if err := json.Unmarshal([]byte(entries[0].Payload), &legacy); err != nil {
		t.Fatalf("decode retained legacy fact: %v", err)
	}
	if err := json.Unmarshal([]byte(entries[1].Payload), &owned); err != nil {
		t.Fatalf("decode owned fact: %v", err)
	}
	bridge, err := decodeSchemeBridge([]byte(entries[2].Payload))
	if err != nil {
		t.Fatalf("decode migration bridge: %v", err)
	}
	if legacy["scheme"] != "bytes-sha256-v1" || owned["scheme"] != flbTypeV1Scheme {
		t.Fatalf("migration rewrote or mistagged facts: legacy=%v owned=%v", legacy, owned)
	}
	if bridge.From.Digest != digest || bridge.To.Digest != digest {
		t.Fatalf("migration bridge moved the digest: %+v", bridge)
	}
}

func journalGenesisCursor() journal.Cursor {
	return journal.Cursor{Seq: -1, Head: genesis}
}
