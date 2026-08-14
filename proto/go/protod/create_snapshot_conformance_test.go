package protod_test

import (
	"bytes"
	"encoding/json"
	"math"
	"strings"
	"testing"

	"foldlab/canonical"
)

func TestContractDescribesCreateSnapshotCoordinates(t *testing.T) {
	h := acquire(t)
	described := h.request("flb.req.contract.describe", map[string]any{})
	if described["ok"] != true {
		t.Fatalf("contract.describe failed: %v", described)
	}
	contract := described["contract"].(map[string]any)
	var note string
	for _, raw := range contract["requests"].([]any) {
		request := raw.(map[string]any)
		if request["name"] == "type_create" {
			note, _ = request["note"].(string)
			break
		}
	}
	for _, required := range []string{
		"catalogSeq addresses this create's fact",
		"catalogHead is captured atomically",
		"Heads are claims",
	} {
		if !strings.Contains(note, required) {
			t.Fatalf("type_create contract note omits %q: %q", required, note)
		}
	}
}

func TestCreateReplyNamesItsFactAndBridgeSnapshot(t *testing.T) {
	h := acquire(t)
	structure := map[string]any{"k": "string"}
	reply := h.create(structure)
	if reply["ok"] != true || reply["created"] != true {
		t.Fatalf("create failed: %v", reply)
	}

	entries, entryHeads, _ := readCatalogEvidence(t, h)
	seq := createCatalogSeq(t, reply)
	assertCreateFactAt(t, entries, seq, reply, structure)
	assertCreateBridgeAt(t, entries, seq+1, reply)
	if got, want := reply["catalogHead"], entryHeads[seq+1]; got != want {
		t.Fatalf("create head %v, want locally recomputed bridge head %s", got, want)
	}
}

func TestConvergedCreateReplyNamesItsObservationSnapshot(t *testing.T) {
	h := acquire(t)
	structure := map[string]any{"k": "string"}
	first := h.create(structure)
	if first["ok"] != true || first["created"] != true {
		t.Fatalf("first create failed: %v", first)
	}
	if advance := h.create(map[string]any{"k": "bool"}); advance["ok"] != true {
		t.Fatalf("intervening create failed: %v", advance)
	}
	converged := h.create(structure)
	if converged["ok"] != true || converged["created"] != false {
		t.Fatalf("duplicate create did not converge: %v", converged)
	}
	if converged["catalogSeq"] != first["catalogSeq"] {
		t.Fatalf("convergence moved the historical fact seq: first=%v duplicate=%v", first, converged)
	}

	entries, entryHeads, catalogHead := readCatalogEvidence(t, h)
	seq := createCatalogSeq(t, converged)
	assertCreateFactAt(t, entries, seq, converged, structure)
	if got := converged["catalogHead"]; got != catalogHead {
		t.Fatalf("convergence head %v, want locally recomputed observation head %s", got, catalogHead)
	}
	if converged["catalogHead"] == entryHeads[seq+1] {
		t.Fatalf("convergence head still names only the historical bridge: %v", converged)
	}
}

func readCatalogEvidence(t *testing.T, h *harness) ([]map[string]any, []string, string) {
	t.Helper()
	read := h.request("flb.req.journal.read", map[string]any{"journal": "catalog"})
	if read["ok"] != true {
		t.Fatalf("read catalog: %v", read)
	}
	rawEntries, ok := read["entries"].([]any)
	if !ok {
		t.Fatalf("catalog entries are not an array: %v", read)
	}
	entries := make([]map[string]any, len(rawEntries))
	payloads := make([]string, len(rawEntries))
	for index, raw := range rawEntries {
		entry, ok := raw.(map[string]any)
		if !ok {
			t.Fatalf("catalog entry %d is not an object: %v", index, raw)
		}
		entries[index] = entry
		payload, ok := entry["payload"].(string)
		if !ok {
			t.Fatalf("catalog entry %d has no payload: %v", index, entry)
		}
		payloads[index] = payload
	}
	entryHeads, head, err := canonical.BuildChain(payloads)
	if err != nil {
		t.Fatalf("recompute catalog chain: %v", err)
	}
	return entries, entryHeads, head
}

func createCatalogSeq(t *testing.T, reply reply) int {
	t.Helper()
	raw, ok := reply["catalogSeq"].(float64)
	if !ok || raw < 0 || raw != math.Trunc(raw) {
		t.Fatalf("catalogSeq is not a non-negative integer: %v", reply["catalogSeq"])
	}
	return int(raw)
}

func assertCreateFactAt(
	t *testing.T,
	entries []map[string]any,
	seq int,
	reply reply,
	submitted any,
) {
	t.Helper()
	if seq < 0 || seq >= len(entries) {
		t.Fatalf("catalogSeq %d outside %d entries", seq, len(entries))
	}
	payload := entries[seq]["payload"].(string)
	var fact map[string]any
	if err := json.Unmarshal([]byte(payload), &fact); err != nil {
		t.Fatalf("decode catalog fact at seq %d: %v", seq, err)
	}
	if fact["digest"] != reply["digest"] || fact["scheme"] != reply["scheme"] {
		t.Fatalf("catalogSeq %d does not address the reply's fact: fact=%v reply=%v", seq, fact, reply)
	}
	got, err := canonical.CanonicalizeValue(fact["structure"])
	if err != nil {
		t.Fatalf("canonicalize stored structure: %v", err)
	}
	want, err := canonical.CanonicalizeValue(submitted)
	if err != nil {
		t.Fatalf("canonicalize submitted structure: %v", err)
	}
	if !bytes.Equal(got, want) {
		t.Fatalf("catalogSeq %d stored %s, want submitted structure %s", seq, got, want)
	}
}

func assertCreateBridgeAt(t *testing.T, entries []map[string]any, seq int, reply reply) {
	t.Helper()
	if seq < 0 || seq >= len(entries) {
		t.Fatalf("bridge seq %d outside %d entries", seq, len(entries))
	}
	payload := entries[seq]["payload"].(string)
	var bridge map[string]any
	if err := json.Unmarshal([]byte(payload), &bridge); err != nil {
		t.Fatalf("decode scheme bridge at seq %d: %v", seq, err)
	}
	to, _ := bridge["to"].(map[string]any)
	if bridge["kind"] != "flb.scheme-bridge.v0" ||
		to["digest"] != reply["digest"] || to["scheme"] != reply["scheme"] {
		t.Fatalf("seq %d is not the reply's scheme bridge: %v", seq, bridge)
	}
}
