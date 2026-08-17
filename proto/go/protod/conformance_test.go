// Black-box conformance: the daemon side of every law W1–W8 (plus W10),
// spoken ONLY over NATS subjects with a plain nats.go client against an
// acquired daemon on a real loopback listener. Every refusal kind the
// daemon can utter is exercised here.
package protod_test

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"sort"
	"strconv"
	"strings"
	"testing"
	"time"

	"github.com/nats-io/nats.go"

	"foldlab/canonical"
	"foldlab/proto/protod"
)

const requestTimeout = 20 * time.Second // Windows CI is slow; refusals are never timeouts

type reply map[string]any

type harness struct {
	t    *testing.T
	conn *nats.Conn
}

func acquire(t *testing.T) *harness {
	t.Helper()
	daemon, err := protod.Acquire(context.Background(), protod.Options{
		StoreDir: t.TempDir(),
		Listen:   "127.0.0.1:0",
		SyncMode: protod.SyncCrashDurable,
	})
	if err != nil {
		t.Fatalf("acquire daemon: %v", err)
	}
	t.Cleanup(daemon.Release)

	conn, err := nats.Connect(daemon.URL(), nats.Name("foldlab-protod-test/0.0.0/conformance-client"))
	if err != nil {
		t.Fatalf("connect plain client: %v", err)
	}
	t.Cleanup(conn.Close)
	return &harness{t: t, conn: conn}
}

func (h *harness) requestRaw(subject string, body []byte) reply {
	h.t.Helper()
	raw := h.requestBytes(subject, body)
	var r reply
	if err := json.Unmarshal(raw, &r); err != nil {
		h.t.Fatalf("reply on %s is not JSON: %v\n%s", subject, err, raw)
	}
	return r
}

func (h *harness) requestBytes(subject string, body []byte) []byte {
	h.t.Helper()
	msg, err := h.conn.Request(subject, body, requestTimeout)
	if err != nil {
		h.t.Fatalf("request %s: %v", subject, err)
	}
	return msg.Data
}

func (h *harness) request(subject string, body any) reply {
	h.t.Helper()
	raw, err := json.Marshal(body)
	if err != nil {
		h.t.Fatalf("marshal request: %v", err)
	}
	return h.requestRaw(subject, raw)
}

func (h *harness) create(structure any) reply {
	return h.request("flb.req.type.create", map[string]any{"structure": structure})
}

// refusal asserts the uniform refusal shape (W7, W8): ok:false, a kind,
// its persisted ontology sort, a law sentence, next hints, and local:false —
// arrived as data in a reply, never as a NATS error.
func (h *harness) refusal(r reply, kind string) map[string]any {
	h.t.Helper()
	if r["ok"] != false {
		h.t.Fatalf("expected a refusal, got %v", r)
	}
	refusal, ok := r["refusal"].(map[string]any)
	if !ok {
		h.t.Fatalf("refusal is not an object: %v", r)
	}
	if refusal["kind"] != kind {
		h.t.Fatalf("refusal kind is %v, want %q (law: %v)", refusal["kind"], kind, refusal["law"])
	}
	sort, ok := protod.RefusalSortOf(kind)
	if !ok {
		h.t.Fatalf("daemon kind %q is absent from the frozen refusal sort table", kind)
	}
	if refusal["sort"] != string(sort) {
		h.t.Fatalf("refusal sort is %v, want %q for kind %q", refusal["sort"], sort, kind)
	}
	law, _ := refusal["law"].(string)
	if law == "" {
		h.t.Fatalf("refusal carries no law sentence: %v", refusal)
	}
	next, ok := refusal["next"].([]any)
	if !ok || len(next) == 0 {
		h.t.Fatalf("refusal carries no next hints (W7): %v", refusal)
	}
	if refusal["local"] != false {
		h.t.Fatalf("daemon refusal must be marked local:false: %v", refusal)
	}
	return refusal
}

func digestOf(t *testing.T, structure any) string {
	t.Helper()
	raw, err := json.Marshal(structure)
	if err != nil {
		t.Fatal(err)
	}
	bytes, err := canonical.Canonicalize(raw)
	if err != nil {
		t.Fatal(err)
	}
	return canonical.DigestHex(bytes)
}

func sampleStructure() map[string]any {
	return map[string]any{
		"k": "struct",
		"fields": map[string]any{
			"id":      map[string]any{"k": "brand", "name": "SensorId", "of": map[string]any{"k": "string"}},
			"reading": map[string]any{"k": "opaque"},
		},
		"optional": []any{},
	}
}

func TestConformance(t *testing.T) {
	h := acquire(t)
	sample := sampleStructure()
	sampleDigest := digestOf(t, sample)

	t.Run("W1 asserted digest the daemon cannot re-derive refuses with both values", func(t *testing.T) {
		lie := strings.Repeat("ab", 32)
		r := h.request("flb.req.type.create", map[string]any{
			"structure": sample, "assertedDigest": lie,
		})
		refusal := h.refusal(r, "digest-mismatch")
		if refusal["got"] != lie {
			t.Fatalf("refusal must carry the asserted value: %v", refusal["got"])
		}
		if refusal["expected"] != sampleDigest {
			t.Fatalf("refusal must carry the derived value: %v", refusal["expected"])
		}
	})

	t.Run("W1 a correct asserted digest is accepted", func(t *testing.T) {
		r := h.request("flb.req.type.create", map[string]any{
			"structure": sample, "assertedDigest": sampleDigest,
		})
		if r["ok"] != true || r["digest"] != sampleDigest {
			t.Fatalf("create with honest assertion failed: %v", r)
		}
		if r["created"] != true {
			t.Fatalf("first create must report created:true: %v", r)
		}
	})

	t.Run("W2 formatting never moves identity or refuses", func(t *testing.T) {
		// Same structure, hostile formatting and key order.
		weird := []byte(`{
			"structure": {
				"optional": [],
				"fields":   {"reading": {"k":"opaque"},
					"id": {"of":{"k":"string"},"name":"SensorId","k":"brand"}},
				"k": "struct"
			}
		}`)
		r := h.requestRaw("flb.req.type.create", weird)
		if r["ok"] != true {
			t.Fatalf("formatting caused refusal (W2 violation): %v", r)
		}
		if r["digest"] != sampleDigest {
			t.Fatalf("formatting moved identity: %v != %v", r["digest"], sampleDigest)
		}
	})

	t.Run("W3 same bytes converge, never error", func(t *testing.T) {
		r := h.create(sample)
		if r["ok"] != true || r["created"] != false {
			t.Fatalf("resubmission must converge with created:false: %v", r)
		}
		if r["digest"] != sampleDigest {
			t.Fatalf("convergence returned a different digest: %v", r)
		}
	})

	t.Run("W10 the catalog fact is scheme-tagged", func(t *testing.T) {
		r := h.create(sample)
		if r["scheme"] != "flb.type.v1" {
			t.Fatalf("create reply is not scheme-tagged: %v", r)
		}
		read := h.request("flb.req.journal.read", map[string]any{"journal": "catalog"})
		entries := read["entries"].([]any)
		if len(entries) == 0 {
			t.Fatal("catalog is empty")
		}
		var fact map[string]any
		payload := entries[0].(map[string]any)["payload"].(string)
		if err := json.Unmarshal([]byte(payload), &fact); err != nil {
			t.Fatalf("catalog payload is not a fact: %v", err)
		}
		if fact["scheme"] != "flb.type.v1" {
			t.Fatalf("committed fact is not scheme-tagged: %v", fact)
		}
	})

	t.Run("invalid-structure refusal teaches path, got, expected, example", func(t *testing.T) {
		r := h.create(map[string]any{"k": "strng"}) // the typo'd create
		refusal := h.refusal(r, "invalid-structure")
		path, ok := refusal["path"].([]any)
		if !ok || len(path) == 0 {
			t.Fatalf("no path: %v", refusal)
		}
		if refusal["got"] != "strng" {
			t.Fatalf("got must carry the offending kind: %v", refusal["got"])
		}
		expected, ok := refusal["expected"].([]any)
		if !ok || len(expected) == 0 {
			t.Fatalf("expected must list the kinds: %v", refusal["expected"])
		}
		if refusal["example"] == nil {
			t.Fatalf("no example: %v", refusal)
		}
	})

	t.Run("unknown-ref refuses an unresolvable digest", func(t *testing.T) {
		r := h.create(map[string]any{"k": "ref", "digest": strings.Repeat("9", 64)})
		h.refusal(r, "unknown-ref")
	})

	t.Run("a resolvable ref with a declared check is created", func(t *testing.T) {
		r := h.create(map[string]any{
			"k":     "check",
			"base":  map[string]any{"k": "ref", "digest": sampleDigest},
			"check": map[string]any{"name": "minLength", "args": map[string]any{"min": 1}},
		})
		if r["ok"] != true || r["created"] != true {
			t.Fatalf("ref+check create failed: %v", r)
		}
	})

	t.Run("W4 unknown identity never enters a journal", func(t *testing.T) {
		r := h.request("flb.ing.data", map[string]any{
			"type": strings.Repeat("7", 64), "payload": map[string]any{"x": 1},
		})
		h.refusal(r, "unknown-identity")
		// The journal was not brought into being by the refused publish.
		read := h.request("flb.req.journal.read", map[string]any{"journal": "data"})
		h.refusal(read, "unknown-journal")
	})

	t.Run("W5 an admit reply means durably appended and readable", func(t *testing.T) {
		admit := h.request("flb.ing.data", map[string]any{
			"type": sampleDigest, "payload": map[string]any{"id": "s-1", "reading": 21.5},
		})
		if admit["ok"] != true || admit["admitted"] != true {
			t.Fatalf("publish refused: %v", admit)
		}
		note, _ := admit["note"].(string)
		if !strings.Contains(note, "NOT checked") {
			t.Fatalf("admit reply must state that payload conformance was not checked: %q", note)
		}
		read := h.request("flb.req.journal.read", map[string]any{"journal": "data"})
		if read["ok"] != true {
			t.Fatalf("read-your-admissions failed: %v", read)
		}
		entries := read["entries"].([]any)
		if len(entries) != 1 {
			t.Fatalf("admitted frame is not readable: %v", read)
		}
		if read["head"] != admit["head"] {
			t.Fatalf("admit head %v != read head %v", admit["head"], read["head"])
		}
	})

	t.Run("W6 the reader recomputes the head the reply claims", func(t *testing.T) {
		read := h.request("flb.req.journal.read", map[string]any{"journal": "data"})
		entries := read["entries"].([]any)
		payloads := make([]string, len(entries))
		for index, raw := range entries {
			entry := raw.(map[string]any)
			payloads[index] = entry["payload"].(string)
		}
		_, head, err := canonical.BuildChain(payloads)
		if err != nil {
			t.Fatalf("recompute journal head: %v", err)
		}
		if head != read["head"] {
			t.Fatalf("claimed head %v does not recompute locally (%v)", read["head"], head)
		}
	})

	t.Run("W6 a cursor that does not verify refuses as bad-cursor", func(t *testing.T) {
		r := h.request("flb.req.journal.read", map[string]any{
			"journal": "data",
			"from":    map[string]any{"seq": -1, "head": strings.Repeat("f", 64)},
		})
		refusal := h.refusal(r, "bad-cursor")
		if entries, present := r["entries"]; present && entries != nil {
			t.Fatalf("refusal leaked entries: %v", r)
		}
		_ = refusal
	})

	t.Run("W7 facts teach: every ok reply carries next hints", func(t *testing.T) {
		for subject, body := range map[string]any{
			"flb.req.type.create":  map[string]any{"structure": sample},
			"flb.req.journal.read": map[string]any{"journal": "catalog"},
		} {
			r := h.request(subject, body)
			if r["ok"] != true {
				t.Fatalf("%s: %v", subject, r)
			}
			next, ok := r["next"].([]any)
			if !ok || len(next) == 0 {
				t.Fatalf("%s reply teaches nothing (W7): %v", subject, r)
			}
			hint := next[0].(map[string]any)
			if hint["subject"] == "" || hint["note"] == "" {
				t.Fatalf("%s: empty hint: %v", subject, hint)
			}
		}
	})

	t.Run("contract.describe describes the surface in flb.type.v0", func(t *testing.T) {
		r := h.request("flb.req.contract.describe", map[string]any{})
		if r["ok"] != true {
			t.Fatalf("describe refused: %v", r)
		}
		contract := r["contract"].(map[string]any)
		contractNote, ok := contract["note"].(string)
		if !ok {
			t.Fatalf("contract note is not a string: %v", contract["note"])
		}
		for _, required := range []string{
			"Session compaction refuses until flb.certification.v0 corpus sealing exists",
			"structural refusals export",
			"absence refusals die with the trace",
			"state digest and corpus digest remain as evidence",
		} {
			if !strings.Contains(contractNote, required) {
				t.Fatalf("contract note omits %q: %q", required, contractNote)
			}
		}
		requests := contract["requests"].([]any)
		if len(requests) != 14 {
			t.Fatalf("expected 14 request kinds, got %d", len(requests))
		}
		names := map[string]bool{}
		for _, raw := range requests {
			request := raw.(map[string]any)
			names[request["name"].(string)] = true
			body := request["body"].(map[string]any)
			if body["k"] == nil {
				t.Fatalf("request body is not an flb.type.v0 node: %v", request)
			}
		}
		if contract["ingress"] == nil || contract["refusal"] == nil {
			t.Fatalf("contract misses ingress or refusal: %v", contract)
		}
		refusalSchema := contract["refusal"].(map[string]any)
		refusalFields := refusalSchema["fields"].(map[string]any)
		if refusalFields["sort"] == nil {
			t.Fatalf("described refusal omits persisted sort: %v", refusalSchema)
		}
		if !names["type_fill"] || !names["type_unfill"] {
			t.Fatalf("contract omits concierge request kinds: %v", names)
		}
		for _, name := range []string{"session_open", "session_move", "session_state", "session_commit"} {
			if !names[name] {
				t.Fatalf("contract omits %s: %v", name, names)
			}
		}
		for _, name := range []string{"protocol.create", "protocol.session.open", "protocol.session.fill", "protocol.session.close", "protocol.session.state"} {
			if !names[name] {
				t.Fatalf("contract omits %s: %v", name, names)
			}
		}
		if names["session_compact"] {
			t.Fatalf("contract invents an unratified session compaction verb: %v", names)
		}
	})

	t.Run("W8 remaining refusal kinds arrive as data", func(t *testing.T) {
		// malformed: not JSON
		h.refusal(h.requestRaw("flb.req.type.create", []byte("{not json")), "malformed")
		// malformed: JSON but not an object
		h.refusal(h.requestRaw("flb.req.type.create", []byte(`[1,2]`)), "malformed")
		// malformed: missing structure
		h.refusal(h.request("flb.req.type.create", map[string]any{}), "malformed")
		// malformed: frame with a non-hex type claim
		h.refusal(h.request("flb.ing.data", map[string]any{"type": "nope"}), "malformed")
		// bad-journal: the catalog is not an ingress target
		h.refusal(h.request("flb.ing.catalog", map[string]any{
			"type": sampleDigest, "payload": "x",
		}), "bad-journal")
		// unknown-journal: reads do not create journals
		h.refusal(h.request("flb.req.journal.read", map[string]any{"journal": "never_written"}), "unknown-journal")
		// bad-cursor: negative beyond genesis
		h.refusal(h.request("flb.req.journal.read", map[string]any{
			"journal": "catalog", "from": map[string]any{"seq": -7},
		}), "bad-cursor")
		// unknown-request: a subject with no handler still answers with data (W9)
		h.refusal(h.requestRaw("flb.req.no.such.kind", []byte(`{}`)), "unknown-request")
	})

	t.Run("struct field ordering is canonical: permuted fields converge", func(t *testing.T) {
		first := h.create(map[string]any{
			"k":      "struct",
			"fields": map[string]any{"a": map[string]any{"k": "int"}, "b": map[string]any{"k": "bool"}},
		})
		second := h.requestRaw("flb.req.type.create", []byte(
			`{"structure":{"fields":{"b":{"k":"bool"},"a":{"k":"int"}},"k":"struct"}}`))
		if first["ok"] != true || second["ok"] != true {
			t.Fatalf("creates failed: %v / %v", first, second)
		}
		if first["digest"] != second["digest"] {
			t.Fatalf("key order moved identity: %v != %v", first["digest"], second["digest"])
		}
		if second["created"] != false {
			t.Fatalf("permuted resubmission must converge: %v", second)
		}
	})

	t.Run("union member order is canonical: permuted members converge", func(t *testing.T) {
		first := h.create(map[string]any{
			"k": "union", "of": []any{map[string]any{"k": "string"}, map[string]any{"k": "null"}},
		})
		second := h.create(map[string]any{
			"k": "union", "of": []any{map[string]any{"k": "null"}, map[string]any{"k": "string"}},
		})
		if first["ok"] != true || second["ok"] != true {
			t.Fatalf("union creates failed: %v / %v", first, second)
		}
		if first["digest"] != second["digest"] {
			t.Fatalf("union member order moved identity: %v != %v", first["digest"], second["digest"])
		}
		if second["created"] != false {
			t.Fatalf("permuted union resubmission must converge: %v", second)
		}
	})

	t.Run("duplicate union refusal uses submitted coordinates and got", func(t *testing.T) {
		cases := []struct {
			name      string
			submitted map[string]any
		}{
			{
				name: "sorted copy moves the duplicate",
				submitted: map[string]any{
					"k": "union", "of": []any{
						map[string]any{"k": "string"},
						map[string]any{"k": "string"},
						map[string]any{"k": "bool"},
					},
				},
			},
			{
				name: "got preserves the submitted duplicate",
				submitted: map[string]any{
					"k": "union", "of": []any{
						map[string]any{"k": "union", "of": []any{map[string]any{"k": "null"}, map[string]any{"k": "string"}}},
						map[string]any{"k": "union", "of": []any{map[string]any{"k": "string"}, map[string]any{"k": "null"}}},
						map[string]any{"k": "bool"},
					},
				},
			},
		}
		for _, tc := range cases {
			t.Run(tc.name, func(t *testing.T) {
				r := h.create(tc.submitted)
				refusal := h.refusal(r, "invalid-structure")
				path, ok := refusal["path"].([]any)
				if !ok || len(path) != 3 || path[0] != "structure" || path[1] != "of" {
					t.Fatalf("duplicate path is %v, want [structure of <submitted-index>]", refusal["path"])
				}
				indexText, ok := path[2].(string)
				if !ok {
					t.Fatalf("duplicate path index is %v, want a decimal string", path[2])
				}
				index, err := strconv.Atoi(indexText)
				if err != nil {
					t.Fatalf("duplicate path index is %q, want a decimal string: %v", indexText, err)
				}
				members := tc.submitted["of"].([]any)
				if index < 0 || index >= len(members) {
					t.Fatalf("duplicate path index %d is outside submitted members", index)
				}
				submittedBytes, err := canonical.Canonicalize(mustJSON(t, members[index]))
				if err != nil {
					t.Fatalf("canonicalize submitted member at refusal path: %v", err)
				}
				gotBytes, err := canonical.Canonicalize(mustJSON(t, refusal["got"]))
				if err != nil {
					t.Fatalf("canonicalize refusal got: %v", err)
				}
				if !bytes.Equal(submittedBytes, gotBytes) {
					t.Fatalf("refusal path points to %s, but got reports %s", submittedBytes, gotBytes)
				}
				if index != 1 {
					t.Fatalf("duplicate path index is %d, want later submitted duplicate 1", index)
				}
			})
		}
	})

	t.Run("opaque is a first-class leaf", func(t *testing.T) {
		r := h.create(map[string]any{"k": "opaque"})
		if r["ok"] != true || r["created"] != true {
			t.Fatalf("opaque create failed: %v", r)
		}
	})
}

func TestConciergeStartsFromABareHole(t *testing.T) {
	h := acquire(t)
	hole := map[string]any{"k": "hole"}

	started := h.request("flb.req.type.fill", map[string]any{
		"partial": hole,
		"path":    []any{},
		"subtree": hole,
	})
	if started["ok"] != true {
		t.Fatalf("bare-hole start refused: %v", started)
	}
	frontier, ok := started["frontier"].([]any)
	if !ok || len(frontier) != 1 {
		t.Fatalf("bare-hole start must return one frontier entry: %v", started)
	}
	entry := frontier[0].(map[string]any)
	if path := entry["path"].([]any); len(path) != 0 {
		t.Fatalf("root hole path is %v, want []", path)
	}
	legal, ok := entry["legal"].([]any)
	if !ok || len(legal) == 0 {
		t.Fatalf("root frontier advertises no legal fills: %v", entry)
	}

	created := h.create(hole)
	refusal := h.refusal(created, "invalid-structure")
	if refusal["path"] == nil {
		t.Fatalf("hole refusal does not locate the hole: %v", refusal)
	}
}

func TestConciergeFillUnfillAreInverse(t *testing.T) {
	h := acquire(t)
	partial := map[string]any{
		"k":  "list",
		"of": map[string]any{"k": "hole"},
	}
	path := []any{"of"}

	filled := h.request("flb.req.type.fill", map[string]any{
		"partial": partial,
		"path":    path,
		"subtree": map[string]any{"k": "string"},
	})
	if filled["ok"] != true {
		t.Fatalf("fill refused: %v", filled)
	}
	unfilled := h.request("flb.req.type.unfill", map[string]any{
		"partial": filled["partial"],
		"path":    path,
	})
	if unfilled["ok"] != true {
		t.Fatalf("unfill refused: %v", unfilled)
	}
	if fmt.Sprint(unfilled["partial"]) != fmt.Sprint(partial) {
		t.Fatalf("unfill(fill(p)) = %v, want %v", unfilled["partial"], partial)
	}
	frontier := unfilled["frontier"].([]any)
	if len(frontier) != 1 {
		t.Fatalf("restored partial has frontier %v, want one hole", frontier)
	}
}

func TestConciergeConformance(t *testing.T) {
	h := acquire(t)
	hole := map[string]any{"k": "hole"}

	t.Run("C1 fill and unfill are byte-pure", func(t *testing.T) {
		fillBody, err := json.Marshal(map[string]any{
			"partial": hole,
			"path":    []any{},
			"subtree": hole,
		})
		if err != nil {
			t.Fatal(err)
		}
		if first, second := h.requestBytes("flb.req.type.fill", fillBody), h.requestBytes("flb.req.type.fill", fillBody); !bytes.Equal(first, second) {
			t.Fatalf("same fill request returned different bytes:\n%s\n%s", first, second)
		}

		unfillBody, err := json.Marshal(map[string]any{
			"partial": map[string]any{"k": "string"},
			"path":    []any{},
		})
		if err != nil {
			t.Fatal(err)
		}
		if first, second := h.requestBytes("flb.req.type.unfill", unfillBody), h.requestBytes("flb.req.type.unfill", unfillBody); !bytes.Equal(first, second) {
			t.Fatalf("same unfill request returned different bytes:\n%s\n%s", first, second)
		}
	})

	t.Run("C3 frontier empty means the decided partial creates", func(t *testing.T) {
		partial := map[string]any{"k": "list", "of": hole}
		open := h.request("flb.req.type.fill", map[string]any{
			"partial": partial,
			"path":    []any{"of"},
			"subtree": hole,
		})
		if open["ok"] != true || len(open["frontier"].([]any)) != 1 {
			t.Fatalf("open partial frontier is not one hole: %v", open)
		}
		h.refusal(h.create(partial), "invalid-structure")

		complete := h.request("flb.req.type.fill", map[string]any{
			"partial": partial,
			"path":    []any{"of"},
			"subtree": map[string]any{"k": "string"},
		})
		if complete["ok"] != true || len(complete["frontier"].([]any)) != 0 {
			t.Fatalf("decided partial frontier is not empty: %v", complete)
		}
		created := h.create(complete["partial"])
		if created["ok"] != true {
			t.Fatalf("frontier-empty partial did not create: %v", created)
		}
	})

	t.Run("C4 every advertised root fill is accepted", func(t *testing.T) {
		created := h.create(map[string]any{"k": "bool"})
		if created["ok"] != true {
			t.Fatalf("seed catalog type: %v", created)
		}
		started := h.request("flb.req.type.fill", map[string]any{
			"partial": hole,
			"path":    []any{},
			"subtree": hole,
		})
		entry := started["frontier"].([]any)[0].(map[string]any)
		legal := entry["legal"].([]any)
		if len(legal) != 12 {
			t.Fatalf("frontier advertises %d kinds, want 12: %v", len(legal), legal)
		}
		refs := entry["refs"].([]any)
		if len(refs) == 0 || len(refs) > 16 {
			t.Fatalf("frontier refs violate availability/cap: %v", refs)
		}
		for _, raw := range legal {
			choice := raw.(map[string]any)
			filled := h.request("flb.req.type.fill", map[string]any{
				"partial": hole,
				"path":    []any{},
				"subtree": choice["example"],
			})
			if filled["ok"] != true {
				t.Fatalf("advertised kind %v refused: %v", choice["kind"], filled)
			}
		}
	})

	t.Run("new refusal cases teach through the uniform shape", func(t *testing.T) {
		cases := []struct {
			name    string
			subject string
			body    any
			kind    string
		}{
			{name: "fill missing partial", subject: "flb.req.type.fill", body: map[string]any{"path": []any{}, "subtree": hole}, kind: "malformed"},
			{name: "fill missing path", subject: "flb.req.type.fill", body: map[string]any{"partial": hole, "subtree": hole}, kind: "malformed"},
			{name: "fill missing subtree", subject: "flb.req.type.fill", body: map[string]any{"partial": hole, "path": []any{}}, kind: "malformed"},
			{name: "unfill missing partial", subject: "flb.req.type.unfill", body: map[string]any{"path": []any{}}, kind: "malformed"},
			{name: "unfill missing path", subject: "flb.req.type.unfill", body: map[string]any{"partial": hole}, kind: "malformed"},
			{name: "fill non-hole", subject: "flb.req.type.fill", body: map[string]any{"partial": map[string]any{"k": "string"}, "path": []any{}, "subtree": map[string]any{"k": "bool"}}, kind: "invalid-structure"},
			{name: "fill invalid path", subject: "flb.req.type.fill", body: map[string]any{"partial": map[string]any{"k": "list", "of": hole}, "path": []any{"wat"}, "subtree": map[string]any{"k": "bool"}}, kind: "invalid-structure"},
			{name: "fill invalid subtree", subject: "flb.req.type.fill", body: map[string]any{"partial": hole, "path": []any{}, "subtree": map[string]any{"k": "wat"}}, kind: "invalid-structure"},
			{name: "fill unknown ref", subject: "flb.req.type.fill", body: map[string]any{"partial": hole, "path": []any{}, "subtree": map[string]any{"k": "ref", "digest": strings.Repeat("9", 64)}}, kind: "unknown-ref"},
			{name: "unfill invalid path", subject: "flb.req.type.unfill", body: map[string]any{"partial": map[string]any{"k": "string"}, "path": []any{"of"}}, kind: "invalid-structure"},
		}
		for _, testCase := range cases {
			t.Run(testCase.name, func(t *testing.T) {
				refusal := h.refusal(h.request(testCase.subject, testCase.body), testCase.kind)
				if refusal["expected"] == nil && refusal["example"] == nil {
					t.Fatalf("refusal teaches neither expected nor example: %v", refusal)
				}
			})
		}
	})
}

func TestConciergePartialIsTheEntireState(t *testing.T) {
	first := acquire(t)
	second := acquire(t)
	hole := map[string]any{"k": "hole"}

	started := first.request("flb.req.type.fill", map[string]any{
		"partial": hole,
		"path":    []any{},
		"subtree": map[string]any{"k": "list", "of": hole},
	})
	if started["ok"] != true {
		t.Fatalf("first daemon refused: %v", started)
	}
	continued := second.request("flb.req.type.fill", map[string]any{
		"partial": started["partial"],
		"path":    started["frontier"].([]any)[0].(map[string]any)["path"],
		"subtree": map[string]any{"k": "string"},
	})
	if continued["ok"] != true || len(continued["frontier"].([]any)) != 0 {
		t.Fatalf("second daemon could not continue from request state alone: %v", continued)
	}
}

func TestUnknownRefRefusalTeachesOneStepRepair(t *testing.T) {
	h := acquire(t)
	candidates := []string{}
	for _, structure := range []any{map[string]any{"k": "string"}, map[string]any{"k": "bool"}} {
		created := h.create(structure)
		if created["ok"] != true {
			t.Fatalf("seed catalog type: %v", created)
		}
		candidates = append(candidates, created["digest"].(string))
	}
	sort.Strings(candidates)
	knownDigest := candidates[0]
	badDigest := strings.Repeat("9", 64)
	partial := map[string]any{
		"k": "struct",
		"fields": map[string]any{
			"amount":   map[string]any{"k": "int"},
			"currency": map[string]any{"k": "hole"},
		},
		"optional": []any{},
	}

	refusal := h.refusal(h.request("flb.req.type.fill", map[string]any{
		"partial": partial,
		"path":    []any{"fields", "currency"},
		"subtree": map[string]any{"k": "ref", "digest": badDigest},
	}), "unknown-ref")
	example := refusal["example"].(map[string]any)
	if example["digest"] != knownDigest {
		t.Fatalf("refusal example is not catalog-resolvable: %v", example)
	}

	next := refusal["next"].([]any)
	hint := next[0].(map[string]any)
	if hint["subject"] != "flb.req.type.fill" {
		t.Fatalf("first repair hint is not an executable fill: %v", hint)
	}
	body, ok := hint["body"].(map[string]any)
	if !ok {
		t.Fatalf("first repair hint has no filled body: %v", hint)
	}
	subtree, ok := body["subtree"].(map[string]any)
	if !ok || subtree["digest"] != knownDigest {
		t.Fatalf("repair echoes the unresolved digest instead of selecting catalog digest %s: %v", knownDigest, hint)
	}
	if got := fmt.Sprint(body["path"]); got != "[fields currency]" {
		t.Fatalf("repair moved the caller's fill path: %s", got)
	}
	if repaired := h.request(hint["subject"].(string), body); repaired["ok"] != true {
		t.Fatalf("advertised one-step repair refused: %v", repaired)
	}
}

// The catalog index survives a daemon restart over the same store: the
// resolve index is rebuilt by verify-on-read, not held in memory only.
func TestCatalogRebuildsFromStore(t *testing.T) {
	store := t.TempDir()
	ctx := context.Background()

	first, err := protod.Acquire(ctx, protod.Options{StoreDir: store, SyncMode: protod.SyncCrashDurable})
	if err != nil {
		t.Fatalf("acquire: %v", err)
	}
	conn, err := nats.Connect(first.URL(), nats.Name("foldlab-protod-test/0.0.0/restart-client"))
	if err != nil {
		t.Fatalf("connect: %v", err)
	}
	h := &harness{t: t, conn: conn}
	structure := sampleStructure()
	digest := digestOf(t, structure)
	frame := map[string]any{
		"type": digest, "payload": map[string]any{"id": "s-2", "reading": 3},
	}
	archivedBytes := h.requestBytes("flb.ing.data", mustJSON(t, frame))
	var archived reply
	if err := json.Unmarshal(archivedBytes, &archived); err != nil {
		t.Fatalf("decode archived refusal: %v", err)
	}
	h.refusal(archived, protod.KindUnknownIdentity)

	created := h.create(structure)
	if created["ok"] != true {
		t.Fatalf("create: %v", created)
	}
	if created["digest"] != digest {
		t.Fatalf("created digest = %v, want %s", created["digest"], digest)
	}
	conn.Close()
	first.Release()

	second, err := protod.Acquire(ctx, protod.Options{StoreDir: store, SyncMode: protod.SyncCrashDurable})
	if err != nil {
		t.Fatalf("re-acquire: %v", err)
	}
	defer second.Release()
	conn2, err := nats.Connect(second.URL(), nats.Name("foldlab-protod-test/0.0.0/restart-client"))
	if err != nil {
		t.Fatalf("reconnect: %v", err)
	}
	defer conn2.Close()
	h2 := &harness{t: t, conn: conn2}

	// The archived bytes retain their historical absence sort after restart,
	// even though the identical request now admits because presence repealed it.
	var afterRestart reply
	if err := json.Unmarshal(archivedBytes, &afterRestart); err != nil {
		t.Fatalf("decode archived refusal after restart: %v", err)
	}
	h2.refusal(afterRestart, protod.KindUnknownIdentity)
	admit := h2.request("flb.ing.data", frame)
	if admit["ok"] != true {
		t.Fatalf("identity did not survive restart: %v", admit)
	}
	resubmit := h2.create(sampleStructure())
	if resubmit["ok"] != true || resubmit["created"] != false {
		t.Fatalf("convergence did not survive restart: %v", resubmit)
	}
	if fmt.Sprintf("%v", resubmit["digest"]) != digest {
		t.Fatalf("digest moved across restart")
	}
}

func mustJSON(t *testing.T, value any) []byte {
	t.Helper()
	raw, err := json.Marshal(value)
	if err != nil {
		t.Fatal(err)
	}
	return raw
}

func TestCertificationAppendsFactAndSchemeBridge(t *testing.T) {
	h := acquire(t)
	created := h.create(map[string]any{"k": "string"})
	if created["ok"] != true || created["created"] != true {
		t.Fatalf("create failed: %v", created)
	}
	digest := created["digest"].(string)
	read := h.request("flb.req.journal.read", map[string]any{"journal": "catalog"})
	entries := read["entries"].([]any)
	if len(entries) != 2 {
		t.Fatalf("one certification appended %d records, want fact + bridge", len(entries))
	}

	var fact map[string]any
	if err := json.Unmarshal([]byte(entries[0].(map[string]any)["payload"].(string)), &fact); err != nil {
		t.Fatalf("decode catalog fact: %v", err)
	}
	var bridge map[string]any
	if err := json.Unmarshal([]byte(entries[1].(map[string]any)["payload"].(string)), &bridge); err != nil {
		t.Fatalf("decode scheme bridge: %v", err)
	}
	if fact["digest"] != digest || fact["scheme"] != "flb.type.v1" {
		t.Fatalf("wrong owned fact: %v", fact)
	}
	if bridge["kind"] != "flb.scheme-bridge.v0" {
		t.Fatalf("wrong bridge kind: %v", bridge)
	}
	from := bridge["from"].(map[string]any)
	to := bridge["to"].(map[string]any)
	if from["scheme"] != "bytes-sha256-v1" || from["digest"] != digest ||
		to["scheme"] != "flb.type.v1" || to["digest"] != digest {
		t.Fatalf("wrong bridge: %v", bridge)
	}

	converged := h.create(map[string]any{"k": "string"})
	if converged["ok"] != true || converged["created"] != false {
		t.Fatalf("resubmission did not converge: %v", converged)
	}
	read = h.request("flb.req.journal.read", map[string]any{"journal": "catalog"})
	if got := len(read["entries"].([]any)); got != 2 {
		t.Fatalf("convergence duplicated bridge evidence: got %d records", got)
	}
}
