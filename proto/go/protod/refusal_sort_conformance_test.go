package protod_test

import (
	"bytes"
	"encoding/json"
	"strings"
	"testing"

	"foldlab/proto/protod"
)

func TestStructuralRefusalsAreCatalogInvariant(t *testing.T) {
	empty := acquire(t)
	populated := acquire(t)
	if created := populated.create(sampleStructure()); created["ok"] != true {
		t.Fatalf("populate catalog: %v", created)
	}

	request := func(subject string, body any) func(*harness) []byte {
		raw, err := json.Marshal(body)
		if err != nil {
			t.Fatal(err)
		}
		return func(h *harness) []byte { return h.requestBytes(subject, raw) }
	}
	cases := []struct {
		kind   string
		invoke func(*harness) []byte
	}{
		{protod.KindMalformed, func(h *harness) []byte {
			return h.requestBytes("flb.req.type.create", []byte("{not json"))
		}},
		{protod.KindInvalidStructure, request("flb.req.type.create", map[string]any{
			"structure": map[string]any{"k": "not-a-kind"},
		})},
		{protod.KindDigestMismatch, request("flb.req.type.create", map[string]any{
			"structure": map[string]any{"k": "bool"}, "assertedDigest": strings.Repeat("f", 64),
		})},
		{protod.KindBadCursor, request("flb.req.journal.read", map[string]any{
			"journal": "catalog", "from": map[string]any{"seq": -7},
		})},
		{protod.KindUnknownRequest, request("flb.req.no.such.kind", map[string]any{})},
		{protod.KindBadJournal, request("flb.ing.catalog", map[string]any{})},
	}

	for _, tc := range cases {
		t.Run(tc.kind, func(t *testing.T) {
			if sort, ok := protod.RefusalSortOf(tc.kind); !ok || sort != protod.RefusalStructural {
				t.Fatalf("sort = %q, %v; want structural", sort, ok)
			}
			emptyReply := tc.invoke(empty)
			populatedReply := tc.invoke(populated)
			if !bytes.Equal(emptyReply, populatedReply) {
				t.Fatalf("structural refusal moved with catalog head:\nempty: %s\npopulated: %s", emptyReply, populatedReply)
			}
			var decoded reply
			if err := json.Unmarshal(emptyReply, &decoded); err != nil {
				t.Fatal(err)
			}
			empty.refusal(decoded, tc.kind)
		})
	}
}

func TestAbsenceRefusalsAreRepealedByLaterPresence(t *testing.T) {
	t.Run(protod.KindUnknownRef, func(t *testing.T) {
		h := acquire(t)
		missing := map[string]any{"k": "bool"}
		digest := digestOf(t, missing)
		request := map[string]any{"structure": map[string]any{"k": "ref", "digest": digest}}
		h.refusal(h.request("flb.req.type.create", request), protod.KindUnknownRef)
		if created := h.create(missing); created["ok"] != true {
			t.Fatalf("create missing ref target: %v", created)
		}
		if admitted := h.request("flb.req.type.create", request); admitted["ok"] != true {
			t.Fatalf("same ref request did not admit after target landed: %v", admitted)
		}
	})

	t.Run(protod.KindUnknownIdentity, func(t *testing.T) {
		h := acquire(t)
		structure := map[string]any{"k": "bool"}
		frame := map[string]any{"type": digestOf(t, structure), "payload": true}
		h.refusal(h.request("flb.ing.data", frame), protod.KindUnknownIdentity)
		if created := h.create(structure); created["ok"] != true {
			t.Fatalf("create missing identity: %v", created)
		}
		if admitted := h.request("flb.ing.data", frame); admitted["ok"] != true {
			t.Fatalf("same frame did not admit after identity landed: %v", admitted)
		}
	})

	t.Run(protod.KindUnknownJournal, func(t *testing.T) {
		h := acquire(t)
		read := map[string]any{"journal": "later"}
		h.refusal(h.request("flb.req.journal.read", read), protod.KindUnknownJournal)
		structure := map[string]any{"k": "bool"}
		digest := digestOf(t, structure)
		if created := h.create(structure); created["ok"] != true {
			t.Fatalf("create frame identity: %v", created)
		}
		if admitted := h.request("flb.ing.later", map[string]any{"type": digest, "payload": true}); admitted["ok"] != true {
			t.Fatalf("bring journal into being: %v", admitted)
		}
		if admitted := h.request("flb.req.journal.read", read); admitted["ok"] != true {
			t.Fatalf("same read did not admit after journal landed: %v", admitted)
		}
	})

	for _, kind := range []string{protod.KindUnknownRef, protod.KindUnknownIdentity, protod.KindUnknownJournal} {
		if sort, ok := protod.RefusalSortOf(kind); !ok || sort != protod.RefusalAbsence {
			t.Fatalf("%s sort = %q, %v; want absence", kind, sort, ok)
		}
	}
}
