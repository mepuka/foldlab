package canonical_test

import (
	"encoding/json"
	"math"
	"os"
	"path/filepath"
	"strconv"
	"testing"

	"foldlab/canonical"
)

type rfc8785Corpus struct {
	Numbers []struct {
		IEEE754 string  `json:"ieee754"`
		Encoded *string `json:"encoded"`
		Comment string  `json:"comment"`
	} `json:"numbers"`
}

func loadRFC8785Corpus(t *testing.T) rfc8785Corpus {
	t.Helper()
	raw, err := os.ReadFile(filepath.Join("..", "..", "fixtures", "jcs-rfc8785.json"))
	if err != nil {
		t.Fatalf("read RFC 8785 corpus: %v", err)
	}
	var corpus rfc8785Corpus
	if err := json.Unmarshal(raw, &corpus); err != nil {
		t.Fatalf("decode RFC 8785 corpus: %v", err)
	}
	return corpus
}

func TestRFC8785SerializesNegativeZeroAsZero(t *testing.T) {
	got, err := canonical.Canonicalize([]byte("-0"))
	if err != nil {
		t.Fatalf("Canonicalize(-0): %v", err)
	}
	if string(got) != "0" {
		t.Fatalf("Canonicalize(-0) = %q, want 0", got)
	}
}

func TestRFC8785AppendixBNumberVectors(t *testing.T) {
	for _, vector := range loadRFC8785Corpus(t).Numbers {
		bits, err := strconv.ParseUint(vector.IEEE754, 16, 64)
		if err != nil {
			t.Fatalf("parse IEEE-754 bits %q: %v", vector.IEEE754, err)
		}
		got, err := canonical.CanonicalizeValue(math.Float64frombits(bits))
		if vector.Encoded == nil {
			if err == nil {
				t.Fatalf("%s (%s): got %q, want refusal", vector.IEEE754, vector.Comment, got)
			}
			continue
		}
		if err != nil {
			t.Fatalf("%s (%s): %v", vector.IEEE754, vector.Comment, err)
		}
		if string(got) != *vector.Encoded {
			t.Fatalf("%s (%s): got %q, want %q", vector.IEEE754, vector.Comment, got, *vector.Encoded)
		}
	}
}

func TestCanonicalizeValueRefusesInvalidUTF8StringsAndNames(t *testing.T) {
	invalid := string([]byte{0xff})
	for _, value := range []any{invalid, map[string]any{invalid: true}} {
		if got, err := canonical.CanonicalizeValue(value); err == nil {
			t.Fatalf("CanonicalizeValue(%#v) = %q, want refusal", value, got)
		}
	}
}

func TestConstrainedDecodeAcceptsOneUnambiguousValue(t *testing.T) {
	got, err := canonical.Canonicalize([]byte(` { "b": 2, "a": 1 } `))
	if err != nil {
		t.Fatalf("Canonicalize: %v", err)
	}
	if string(got) != `{"a":1,"b":2}` {
		t.Fatalf("Canonicalize = %q, want sorted canonical object", got)
	}
}

func TestConstrainedDecodeRefusesMalformedOrAmbiguousInput(t *testing.T) {
	tests := []struct {
		name  string
		input []byte
	}{
		{name: "duplicate member names", input: []byte(`{"a":1,"a":2}`)},
		{name: "escape-equivalent duplicate member names", input: []byte(`{"a":1,"\u0061":2}`)},
		{name: "lone high surrogate", input: []byte(`"\ud800"`)},
		{name: "lone low surrogate", input: []byte(`"\udc00"`)},
		{name: "trailing second value", input: []byte(`null true`)},
		{name: "invalid UTF-8", input: []byte{0x22, 0xff, 0x22}},
	}
	for _, test := range tests {
		t.Run(test.name, func(t *testing.T) {
			if _, err := canonical.Decode(test.input); err == nil {
				t.Fatalf("Decode(%q) unexpectedly succeeded", test.input)
			}
		})
	}
}
