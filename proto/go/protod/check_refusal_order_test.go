package protod_test

import (
	"bytes"
	"encoding/json"
	"testing"
)

func TestCheckUnknownKeyRefusalUsesIdentityOrder(t *testing.T) {
	h := acquire(t)
	const body = `{
		"structure": {
			"k": "check",
			"base": {"k": "string"},
			"check": {
				"name": "minLength",
				"args": {},
				"\ufffd": true,
				"\ud834\udd1e": true
			}
		}
	}`

	// U+1D11E begins with UTF-16 unit D834, before U+FFFD. Their UTF-8
	// byte order is the reverse, so this vector independently distinguishes
	// identity order from Go string order as well as map iteration order.
	var first []byte
	for run := 0; run < 128; run++ {
		raw := h.requestBytes("flb.req.type.create", []byte(body))
		if run == 0 {
			first = bytes.Clone(raw)
		} else if !bytes.Equal(raw, first) {
			t.Fatalf("run %d refusal bytes moved:\nfirst: %s\n  got: %s", run, first, raw)
		}
		var decoded reply
		if err := json.Unmarshal(raw, &decoded); err != nil {
			t.Fatalf("run %d refusal is not JSON: %v\n%s", run, err, raw)
		}
		refusal := h.refusal(decoded, "invalid-structure")
		path, ok := refusal["path"].([]any)
		if !ok || len(path) != 3 || path[0] != "structure" || path[1] != "check" || path[2] != "𝄞" {
			t.Fatalf("run %d refusal path = %v, want [structure check 𝄞]", run, refusal["path"])
		}
		if refusal["got"] != "𝄞" {
			t.Fatalf("run %d refusal got = %v, want 𝄞", run, refusal["got"])
		}
	}
}

func TestNodeUnknownKeyRefusalUsesIdentityOrder(t *testing.T) {
	h := acquire(t)
	const body = `{
		"structure": {
			"k": "string",
			"\ufffd": true,
			"\ud834\udd1e": true
		}
	}`

	refusal := h.refusal(
		h.requestRaw("flb.req.type.create", []byte(body)),
		"invalid-structure",
	)
	path, ok := refusal["path"].([]any)
	if !ok || len(path) != 2 || path[0] != "structure" || path[1] != "𝄞" {
		t.Fatalf("refusal path = %v, want [structure 𝄞]", refusal["path"])
	}
	got, ok := refusal["got"].([]any)
	if !ok || len(got) != 2 || got[0] != "𝄞" || got[1] != "�" {
		t.Fatalf("refusal got = %v, want [𝄞 �]", refusal["got"])
	}
}
