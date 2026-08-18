// The finding #36 control at the JOURNAL-identity boundary (DEV-806).
//
// `request_body_identity_test.go` controls the type-identity boundary: the three
// discriminating vectors from finding #36 — duplicate member names, a lone
// surrogate escape, raw invalid UTF-8 — must each return a typed `malformed`
// refusal at `flb.req.type.create` and leave the catalog at genesis.
//
// `flb.ing.*` is the OTHER boundary where submitted bytes become identity: the
// frame the daemon appends is what the journal's hash chain commits to. That
// boundary had no such control, and until this ticket the path still re-read
// the raw body with `encoding/json` after admission had already read it
// (`ingress.go:95` on `origin/main`) and derived the appended bytes from that
// second reading. This file gives the journal boundary the same control the
// catalog boundary has had since `9207ab1`.
package protod_test

import (
	"testing"

	"foldlab/canonical"
)

// ingressIdentityVectors are finding #36's own executed evidence, restated at
// the publish path. Each is a submission `encoding/json` REPAIRS — duplicate
// members last-win, lone surrogates and invalid UTF-8 become U+FFFD — so a
// daemon that reads them with it appends a value that never arrived, and two
// distinct submissions reach one journal entry.
func ingressIdentityVectors(digest string) []struct {
	name string
	body []byte
} {
	invalidUTF8 := append([]byte(`{"type":"`+digest+`","payload":"`), 0xff)
	invalidUTF8 = append(invalidUTF8, []byte(`"}`)...)

	return []struct {
		name string
		body []byte
	}{
		{
			name: "duplicate member names",
			body: []byte(`{"type":"` + digest + `","payload":"a","payload":"b"}`),
		},
		{
			name: "lone surrogate escape",
			body: []byte(`{"type":"` + digest + `","payload":"\ud800"}`),
		},
		{
			name: "invalid UTF-8",
			body: invalidUTF8,
		},
	}
}

func TestIngressRefusesFrameBytesOutsideCanonicalJSONBeforeJournalAppend(t *testing.T) {
	for _, test := range ingressIdentityVectors("") {
		t.Run(test.name, func(t *testing.T) {
			h := acquire(t)
			digest := h.create(map[string]any{"k": "string"})["digest"].(string)

			// Rebuild the vector against the real cataloged digest so the
			// frame passes W4 identity resolution and the ONLY thing that can
			// refuse it is the byte-admission law under test.
			body := ingressIdentityVectorFor(test.name, digest)

			// The independent oracle: constrained decode refuses these bytes.
			// The daemon must reach the same verdict, and the control is
			// meaningless if the oracle admits them.
			if _, err := canonical.Decode(body); err == nil {
				t.Fatalf("canonical admission control accepted %q", body)
			}

			refusal := h.refusal(h.requestRaw("flb.ing.data", body), "malformed")
			if refusal["got"] == nil {
				t.Fatalf("malformed refusal omits the submitted bytes: %v", refusal)
			}

			// "Lag is absence": a refused publish creates no journal at all.
			// If the repairing decoder had run, the frame would have been
			// appended and this read would find a journal.
			after := h.refusal(
				h.request("flb.req.journal.read", map[string]any{"journal": "data"}),
				"unknown-journal")
			if after["law"] == "" {
				t.Fatalf("refused publish left a journal behind: %v", after)
			}
		})
	}
}

func ingressIdentityVectorFor(name, digest string) []byte {
	for _, vector := range ingressIdentityVectors(digest) {
		if vector.name == name {
			return vector.body
		}
	}
	panic("unknown ingress identity vector " + name)
}

// TestIngressAppendsTheAdmittedReadingOfTheFrame is the positive half. W2 is
// unchanged and deliberately so: hostile-but-lawful FORMATTING is admitted,
// and the bytes the journal commits to are the canonical form of the value
// constrained admission read — identical for every formatting of that value,
// and never a second decoder's separate reading of the same body.
func TestIngressAppendsTheAdmittedReadingOfTheFrame(t *testing.T) {
	h := acquire(t)
	digest := h.create(map[string]any{"k": "string"})["digest"].(string)

	canonicalFrame := []byte(`{"payload":"x","type":"` + digest + `"}`)
	hostileFrame := []byte("{\n\t\"type\":  \"" + digest + "\",\n\t\"payload\":\"x\"\n}")

	expected, err := canonical.Canonicalize(canonicalFrame)
	if err != nil {
		t.Fatalf("canonicalize control frame: %v", err)
	}

	for _, frame := range [][]byte{canonicalFrame, hostileFrame} {
		reply := h.requestRaw("flb.ing.data", frame)
		if reply["ok"] != true {
			t.Fatalf("W2: lawful formatting must not refuse: %v", reply)
		}
	}

	entries := h.request("flb.req.journal.read",
		map[string]any{"journal": "data"})["entries"].([]any)
	if len(entries) != 2 {
		t.Fatalf("expected both formattings admitted, got %d entries", len(entries))
	}
	for index, entry := range entries {
		payload := entry.(map[string]any)["payload"]
		if payload != string(expected) {
			t.Fatalf("entry %d committed %q, want the admitted canonical form %q",
				index, payload, expected)
		}
	}
}
