package protod_test

import (
	"context"
	"encoding/json"
	"strings"
	"testing"
	"time"

	"github.com/nats-io/nats.go"

	"foldlab/canonical"
	"foldlab/proto/protod"
)

func TestSessionResumesExactlyAfterDaemonRestart(t *testing.T) {
	store := t.TempDir()
	first, err := protod.Acquire(context.Background(), protod.Options{StoreDir: store, SyncMode: protod.SyncCrashDurable})
	if err != nil {
		t.Fatal(err)
	}
	firstConn, err := nats.Connect(first.URL())
	if err != nil {
		first.Release()
		t.Fatal(err)
	}
	request := func(conn *nats.Conn, subject string, body any) reply {
		raw, marshalErr := json.Marshal(body)
		if marshalErr != nil {
			t.Fatal(marshalErr)
		}
		message, requestErr := conn.Request(subject, raw, 20*time.Second)
		if requestErr != nil {
			t.Fatal(requestErr)
		}
		var decoded reply
		if unmarshalErr := json.Unmarshal(message.Data, &decoded); unmarshalErr != nil {
			t.Fatal(unmarshalErr)
		}
		return decoded
	}
	opened := request(firstConn, protod.SubjectSessionOpen, map[string]any{
		"grammar": blackBoxSessionGrammarDigest(t), "author": "restart-agent",
	})
	moved := request(firstConn, protod.SubjectSessionMove, map[string]any{
		"session": opened["session"], "expectedHead": opened["head"],
		"principal": "restart-agent",
		"op":        "fill", "path": []any{}, "subtree": map[string]any{"k": "string"},
	})
	firstConn.Close()
	first.Release()

	second, err := protod.Acquire(context.Background(), protod.Options{StoreDir: store, SyncMode: protod.SyncCrashDurable})
	if err != nil {
		t.Fatal(err)
	}
	t.Cleanup(second.Release)
	secondConn, err := nats.Connect(second.URL())
	if err != nil {
		t.Fatal(err)
	}
	t.Cleanup(secondConn.Close)
	resumed := request(secondConn, protod.SubjectSessionState, map[string]any{"session": opened["session"]})
	if resumed["ok"] != true || resumed["head"] != moved["head"] || resumed["stateDigest"] != moved["stateDigest"] || resumed["principal"] != "restart-agent" {
		t.Fatalf("restart did not resume the exact verified prefix:\n moved %v\nresumed %v", moved, resumed)
	}
}

func TestSessionJournalConformance(t *testing.T) {
	h := acquire(t)
	grammar := blackBoxSessionGrammarDigest(t)
	openBody := map[string]any{"grammar": grammar, "author": "conformance-agent"}
	opened := h.request(protod.SubjectSessionOpen, openBody)
	if opened["ok"] != true {
		t.Fatalf("session.open refused: %v", opened)
	}
	session := opened["session"].(string)
	if !strings.HasPrefix(session, "flb_session_v0_") {
		t.Fatalf("session does not use the reserved prefix: %s", session)
	}
	openHead := opened["head"].(string)
	if opened["step"] != float64(0) || opened["stateDigest"] == "" {
		t.Fatalf("open did not return the first exact prefix: %v", opened)
	}

	// Opening identical canonical data converges on the same journal and head.
	again := h.request(protod.SubjectSessionOpen, openBody)
	if again["session"] != session || again["head"] != openHead {
		t.Fatalf("same open did not converge: %v vs %v", opened, again)
	}

	moved := h.request(protod.SubjectSessionMove, map[string]any{
		"session": session, "expectedHead": openHead, "principal": "conformance-agent",
		"op": "fill", "path": []any{},
		"subtree": map[string]any{"k": "list", "of": map[string]any{"k": "hole"}},
	})
	if moved["ok"] != true || moved["head"] == openHead {
		t.Fatalf("session move did not append exactly one prefix: %v", moved)
	}
	currentHead := moved["head"].(string)

	missing := h.request(protod.SubjectSessionMove, map[string]any{
		"session": session, "op": "unfill", "path": []any{},
	})
	h.refusal(missing, "malformed")
	stateAfterMissing := h.request(protod.SubjectSessionState, map[string]any{"session": session})
	if stateAfterMissing["head"] != currentHead {
		t.Fatalf("missing expectedHead appended: %v", stateAfterMissing)
	}

	stale := h.request(protod.SubjectSessionMove, map[string]any{
		"session": session, "expectedHead": openHead, "principal": "conformance-agent",
		"op": "fill", "path": []any{"of"},
		"subtree": map[string]any{"k": "string"},
	})
	staleRefusal := h.refusal(stale, "session-stale")
	got := staleRefusal["got"].(map[string]any)
	expected := staleRefusal["expected"].(map[string]any)
	if got["context"] == nil || expected["currentHead"] != currentHead {
		t.Fatalf("stale refusal is not mechanically retryable: %v", staleRefusal)
	}
	stateAfterStale := h.request(protod.SubjectSessionState, map[string]any{"session": session})
	if stateAfterStale["head"] != currentHead {
		t.Fatalf("stale move appended: %v", stateAfterStale)
	}

	missingPrincipal := h.request(protod.SubjectSessionMove, map[string]any{
		"session": session, "expectedHead": currentHead,
		"op": "fill", "path": []any{"of"}, "subtree": map[string]any{"k": "string"},
	})
	h.refusal(missingPrincipal, "malformed")
	incompatiblePrincipal := h.request(protod.SubjectSessionMove, map[string]any{
		"session": session, "expectedHead": currentHead, "principal": "other-agent",
		"op": "fill", "path": []any{"of"}, "subtree": map[string]any{"k": "string"},
	})
	principalRefusal := h.refusal(incompatiblePrincipal, "session-principal")
	if principalRefusal["got"] != "other-agent" || principalRefusal["expected"] != "conformance-agent" {
		t.Fatalf("principal refusal does not name the ownership coordinate: %v", principalRefusal)
	}
	stateAfterPrincipal := h.request(protod.SubjectSessionState, map[string]any{"session": session})
	if stateAfterPrincipal["head"] != currentHead || stateAfterPrincipal["principal"] != "conformance-agent" {
		t.Fatalf("principal refusals changed journal-authoritative state: %v", stateAfterPrincipal)
	}

	filled := h.request(protod.SubjectSessionMove, map[string]any{
		"session": session, "expectedHead": currentHead, "principal": "conformance-agent",
		"op": "fill", "path": []any{"of"},
		"subtree": map[string]any{"k": "bool"},
	})
	if filled["ok"] != true || len(filled["frontier"].([]any)) != 0 {
		t.Fatalf("deciding fill failed: %v", filled)
	}
	filledHead := filled["head"].(string)

	missingCommitHead := h.request(protod.SubjectSessionCommit, map[string]any{"session": session})
	h.refusal(missingCommitHead, "malformed")
	missingCommitPrincipal := h.request(protod.SubjectSessionCommit, map[string]any{
		"session": session, "expectedHead": filledHead,
	})
	h.refusal(missingCommitPrincipal, "malformed")
	incompatibleCommitPrincipal := h.request(protod.SubjectSessionCommit, map[string]any{
		"session": session, "expectedHead": filledHead, "principal": "other-agent",
	})
	h.refusal(incompatibleCommitPrincipal, "session-principal")
	committed := h.request(protod.SubjectSessionCommit, map[string]any{
		"session": session, "expectedHead": filledHead, "principal": "conformance-agent",
		"submitter": "conformance-agent",
	})
	if committed["ok"] != true {
		t.Fatalf("session commit refused: %v", committed)
	}
	if committed["digest"] != committed["stateDigest"] || committed["scheme"] != "flb.type.v1" {
		t.Fatalf("L7 audit did not converge: %v", committed)
	}
	if committed["principal"] != "conformance-agent" {
		t.Fatalf("commit lost its journal-authoritative principal: %v", committed)
	}

	read := h.request(protod.SubjectJournalRead, map[string]any{"journal": session})
	if read["ok"] != true || read["head"] != committed["head"] {
		t.Fatalf("session journal does not replay to the commit head: %v", read)
	}
	entries := read["entries"].([]any)
	if len(entries) != 4 { // open, two fills, commit; stale/malformed attempts never append
		t.Fatalf("unexpected session history: %v", entries)
	}
	for index, raw := range entries[1:] {
		entry := raw.(map[string]any)
		var event map[string]any
		if err := json.Unmarshal([]byte(entry["payload"].(string)), &event); err != nil {
			t.Fatal(err)
		}
		if event["principal"] != "conformance-agent" {
			t.Fatalf("journal move %d lost principal: %v", index+1, event)
		}
	}

	reserved := h.request("flb.ing."+session, map[string]any{
		"type": strings.Repeat("0", 64), "payload": map[string]any{},
	})
	h.refusal(reserved, "bad-journal")
}

func blackBoxSessionGrammarDigest(t *testing.T) string {
	t.Helper()
	descriptor := map[string]any{
		"name":        "flb.type.v0",
		"numbers":     "integral",
		"partialKind": map[string]any{"k": "hole", "required": []any{"k"}},
		"productions": []any{
			map[string]any{"k": "bool", "required": []any{"k"}},
			map[string]any{"k": "brand", "required": []any{"k", "name", "of"}, "children": map[string]any{"name": "non-empty-string", "of": "T"}},
			map[string]any{"k": "check", "required": []any{"base", "check", "k"}, "children": map[string]any{"base": "T", "check": "{name:non-empty-string,args:json-object}"}},
			map[string]any{"k": "int", "required": []any{"k"}},
			map[string]any{"k": "list", "required": []any{"k", "of"}, "children": map[string]any{"of": "T"}},
			map[string]any{"k": "literal", "required": []any{"k", "value"}, "children": map[string]any{"value": "string|integral-number|bool|null"}},
			map[string]any{"k": "null", "required": []any{"k"}},
			map[string]any{"k": "opaque", "required": []any{"k"}},
			map[string]any{"k": "ref", "required": []any{"digest", "k"}, "children": map[string]any{"digest": "hex64"}},
			map[string]any{"k": "string", "required": []any{"k"}},
			map[string]any{
				"k": "struct", "required": []any{"fields", "k"}, "optional": []any{"optional"},
				"children": map[string]any{"fields": "record<string,T>", "optional": "sorted-unique-field-names"},
			},
			map[string]any{"k": "union", "required": []any{"k", "of"}, "children": map[string]any{"of": "non-empty-unique-unordered-T-array"}},
		},
	}
	raw, err := canonical.Canonicalize(mustJSON(t, descriptor))
	if err != nil {
		t.Fatal(err)
	}
	return canonical.DigestHex(raw)
}
