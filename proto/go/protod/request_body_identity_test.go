package protod_test

import (
	"testing"

	"foldlab/canonical"
)

func TestTypeCreateRefusesRequestBytesOutsideCanonicalJSONBeforeCatalogMutation(t *testing.T) {
	invalidUTF8 := append([]byte(`{"structure":{"k":"literal","value":"`), 0xff)
	invalidUTF8 = append(invalidUTF8, []byte(`"}}`)...)

	cases := []struct {
		name string
		body []byte
	}{
		{
			name: "duplicate member names",
			body: []byte(`{"structure":{"k":"string","k":"bool"}}`),
		},
		{
			name: "lone surrogate escape",
			body: []byte(`{"structure":{"k":"literal","value":"\ud800"}}`),
		},
		{
			name: "invalid UTF-8",
			body: invalidUTF8,
		},
	}

	for _, test := range cases {
		t.Run(test.name, func(t *testing.T) {
			h := acquire(t)
			if _, err := canonical.Decode(test.body); err == nil {
				t.Fatalf("canonical admission control accepted %q", test.body)
			}

			before := h.request("flb.req.journal.read", map[string]any{"journal": "catalog"})
			beforeHead := before["head"]
			beforeEntries := len(before["entries"].([]any))

			refusal := h.refusal(h.requestRaw("flb.req.type.create", test.body), "malformed")
			if refusal["got"] == nil {
				t.Fatalf("malformed refusal omits the submitted bytes: %v", refusal)
			}

			after := h.request("flb.req.journal.read", map[string]any{"journal": "catalog"})
			if after["head"] != beforeHead || len(after["entries"].([]any)) != beforeEntries {
				t.Fatalf("refused request mutated catalog: before=%v after=%v", before, after)
			}

			if after["head"] != canonical.Genesis || len(after["entries"].([]any)) != 0 {
				t.Fatalf("catalog contains repaired submissions: %v", after)
			}
		})
	}
}
