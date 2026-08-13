// Black-box conformance: the daemon side of every law W1–W8 (plus W10),
// spoken ONLY over NATS subjects with a plain nats.go client against an
// acquired daemon on a real loopback listener. Every refusal kind the
// daemon can utter is exercised here.
package protod_test

import (
	"context"
	"encoding/json"
	"fmt"
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
	})
	if err != nil {
		t.Fatalf("acquire daemon: %v", err)
	}
	t.Cleanup(daemon.Release)

	conn, err := nats.Connect(daemon.URL())
	if err != nil {
		t.Fatalf("connect plain client: %v", err)
	}
	t.Cleanup(conn.Close)
	return &harness{t: t, conn: conn}
}

func (h *harness) requestRaw(subject string, body []byte) reply {
	h.t.Helper()
	msg, err := h.conn.Request(subject, body, requestTimeout)
	if err != nil {
		h.t.Fatalf("request %s: %v", subject, err)
	}
	var r reply
	if err := json.Unmarshal(msg.Data, &r); err != nil {
		h.t.Fatalf("reply on %s is not JSON: %v\n%s", subject, err, msg.Data)
	}
	return r
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
// a law sentence, next hints, and local:false — arrived as data in a
// reply, never as a NATS error.
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
			"celsius": map[string]any{"k": "float"},
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
				"fields":   {"celsius": {"k":"float"},
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
		if r["scheme"] != "bytes-sha256-v1" {
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
		if fact["scheme"] != "bytes-sha256-v1" {
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
			"type": sampleDigest, "payload": map[string]any{"id": "s-1", "celsius": 21.5},
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
		_, head := canonical.BuildChain(payloads)
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
		requests := contract["requests"].([]any)
		if len(requests) != 3 {
			t.Fatalf("expected 3 request kinds, got %d", len(requests))
		}
		for _, raw := range requests {
			request := raw.(map[string]any)
			body := request["body"].(map[string]any)
			if body["k"] == nil {
				t.Fatalf("request body is not an flb.type.v0 node: %v", request)
			}
		}
		if contract["ingress"] == nil || contract["refusal"] == nil {
			t.Fatalf("contract misses ingress or refusal: %v", contract)
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
}

// The catalog index survives a daemon restart over the same store: the
// resolve index is rebuilt by verify-on-read, not held in memory only.
func TestCatalogRebuildsFromStore(t *testing.T) {
	store := t.TempDir()
	ctx := context.Background()

	first, err := protod.Acquire(ctx, protod.Options{StoreDir: store})
	if err != nil {
		t.Fatalf("acquire: %v", err)
	}
	conn, err := nats.Connect(first.URL())
	if err != nil {
		t.Fatalf("connect: %v", err)
	}
	h := &harness{t: t, conn: conn}
	created := h.create(sampleStructure())
	if created["ok"] != true {
		t.Fatalf("create: %v", created)
	}
	digest := created["digest"].(string)
	conn.Close()
	first.Release()

	second, err := protod.Acquire(ctx, protod.Options{StoreDir: store})
	if err != nil {
		t.Fatalf("re-acquire: %v", err)
	}
	defer second.Release()
	conn2, err := nats.Connect(second.URL())
	if err != nil {
		t.Fatalf("reconnect: %v", err)
	}
	defer conn2.Close()
	h2 := &harness{t: t, conn: conn2}

	admit := h2.request("flb.ing.data", map[string]any{
		"type": digest, "payload": map[string]any{"id": "s-2", "celsius": 3},
	})
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
