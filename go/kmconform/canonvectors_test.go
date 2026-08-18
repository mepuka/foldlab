// The canon vectors, both ways.
//
// OBLIGATION TABLE (schema §11 check -> test):
//
//	25 ten canon records, the names of §3, in order  -> TestCorpusCarriesTheTenCanonVectorsInOrder
//	26 each record's value, canonicalized, is bytes  -> TestCorpusCanonRecordsSatisfyTheWeakCheck
//	27 the ten values constructed NATIVELY are bytes -> TestNativeCanonVectorsMatchTheSchemaBytes
//
// Check 27 is the one that matters. A value read out of the corpus is already
// sorted, so re-canonicalizing it sorts nothing; only a value this package
// built with `b` before `a` tests the member sort at all.
package kmconform_test

import (
	"strings"
	"testing"

	"foldlab/kmconform"
)

// schemaCanonBytes is the byte-exact reference: the canonical serialization
// each of the ten values must have. These are literals, not computed here — a
// computed expectation would agree with the implementation by construction
// and so would check nothing.
//
// Eight rows are the schema's §3 table verbatim. The last two are the values
// the model-end lane actually emits, which is what schema §12 R10 and R11
// instruct ("pending lean-meta's actual value"); §3's longer draft spelling of
// those two was not taken, and updating that table is a documentation item.
// The structural obligation the freeze DOES state — a double quote, a
// backslash, a newline and a tab in one string, and a U+0001 whose bytes show
// the lowercase four-digit fallback — is asserted separately below, so this
// pin cannot drift into agreeing with an emitter that lost a character.
var schemaCanonBytes = []struct{ name, bytes string }{
	{"empty-object", `{}`},
	{"empty-array", `[]`},
	{"empty-string", `""`},
	{"zero", `0`},
	{"big-integer", `9007199254740993`},
	{"key-order", `{"a":2,"b":1}`},
	{"nested-object", `{"z":{"y":[3,4]}}`},
	{"nested-array", `[[],[{}]]`},
	{"string-escapes", `"a\"b\\c\nd\te"`},
	{"control-char", `"\u0001"`},
}

func TestNativeCanonVectorsMatchTheSchemaBytes(t *testing.T) {
	rows, err := kmconform.CanonVectors()
	if err != nil {
		t.Fatalf("CanonVectors: %v", err)
	}
	if len(rows) != len(schemaCanonBytes) {
		t.Fatalf("built %d vectors, the schema names %d", len(rows), len(schemaCanonBytes))
	}
	for index, want := range schemaCanonBytes {
		row := rows[index]
		if row.Name != want.name {
			t.Fatalf("vector %d is %q, the schema names it %q", index, row.Name, want.name)
		}
		if row.Bytes != want.bytes {
			t.Fatalf("vector %q: the emitter produced %s, the schema pins %s", row.Name, row.Bytes, want.bytes)
		}
		// Bytes is computed by the emitter at construction; re-running the
		// emitter on the value must agree with it, or the row is stale.
		encoded, err := row.Value.Canonical()
		if err != nil {
			t.Fatalf("vector %q: %v", row.Name, err)
		}
		if string(encoded) != want.bytes {
			t.Fatalf("vector %q: re-serializing the value gives %s, the schema pins %s", row.Name, encoded, want.bytes)
		}
	}
}

// TestTheTwoOpenVectorsMeetTheFreezeStructurally checks what the freeze
// states rather than what any one lane emitted. The exact text of these two
// was left open (R10, R11) and is therefore a pin that can legitimately move;
// the STRUCTURE cannot. Without this, updating the pin to match a broken
// emitter would look like reconciliation.
func TestTheTwoOpenVectorsMeetTheFreezeStructurally(t *testing.T) {
	rows, err := kmconform.CanonVectors()
	if err != nil {
		t.Fatalf("CanonVectors: %v", err)
	}
	byName := map[string]kmconform.CanonRow{}
	for _, row := range rows {
		byName[row.Name] = row
	}

	escapes, ok := byName["string-escapes"].Value.Text()
	if !ok {
		t.Fatal("the string-escapes vector is not a string")
	}
	for label, character := range map[string]string{
		"a double quote": `"`,
		"a backslash":    `\`,
		"a newline":      "\n",
		"a tab":          "\t",
	} {
		if !strings.Contains(escapes, character) {
			t.Fatalf("the string-escapes value %q carries no %s; the freeze names all four", escapes, label)
		}
	}
	// The bytes must show the TWO-CHARACTER escapes, never the \u00XX
	// fallback: an emitter writing \u000a for a newline would round-trip and
	// still disagree with a JCS peer.
	escapeBytes := byName["string-escapes"].Bytes
	for _, want := range []string{`\"`, `\\`, `\n`, `\t`} {
		if !strings.Contains(escapeBytes, want) {
			t.Fatalf("the string-escapes bytes %s do not carry %s", escapeBytes, want)
		}
	}
	if strings.Contains(escapeBytes, `\u`) {
		t.Fatalf("the string-escapes bytes %s use the \\u00XX fallback where a two-character escape exists",
			escapeBytes)
	}

	control, ok := byName["control-char"].Value.Text()
	if !ok {
		t.Fatal("the control-char vector is not a string")
	}
	if !strings.ContainsRune(control, rune(1)) {
		t.Fatalf("the control-char value %q does not carry U+0001", control)
	}
	// Four digits, lowercase: \u1 and an uppercase hex digit are both wrong.
	// U+0001's digits are 0 and 1, so no canon vector exercises the lowercase
	// rule itself; the schema names that gap and this does not close it.
	if want := `\u0001`; !strings.Contains(byName["control-char"].Bytes, want) {
		t.Fatalf("the control-char bytes %s do not show %s", byName["control-char"].Bytes, want)
	}
}

func TestCorpusCarriesTheTenCanonVectorsInOrder(t *testing.T) {
	corpus := loadCorpus(t)
	if len(corpus.Canons) != len(schemaCanonBytes) {
		t.Fatalf("corpus carries %d canon records, want %d", len(corpus.Canons), len(schemaCanonBytes))
	}
	for index, want := range schemaCanonBytes {
		if corpus.Canons[index].Name != want.name {
			t.Fatalf("canon record %d is %q, want %q", index, corpus.Canons[index].Name, want.name)
		}
	}
}

func TestCorpusCanonRecordsSatisfyTheWeakCheck(t *testing.T) {
	for _, row := range loadCorpus(t).Canons {
		encoded, err := row.Value.Canonical()
		if err != nil {
			t.Fatalf("canon record %q: %v", row.Name, err)
		}
		if string(encoded) != row.Bytes {
			t.Fatalf("canon record %q: canonicalizing the value gives %s, the record declares %s",
				row.Name, encoded, row.Bytes)
		}
	}
}

// TestCorpusCanonRecordsAgreeWithNativeConstruction is the cross-implementation
// tripwire. The corpus is written by the model-end lane; these ten values are
// built here from the schema. If the two disagree, one of the implementations
// has read the schema differently, and reconciliation items R10 (the exact
// string-escapes text) and R11 (the exact control-char text) are the two the
// schema itself flags as still open.
func TestCorpusCanonRecordsAgreeWithNativeConstruction(t *testing.T) {
	native, err := kmconform.CanonVectors()
	if err != nil {
		t.Fatalf("CanonVectors: %v", err)
	}
	byName := map[string]string{}
	for _, row := range native {
		byName[row.Name] = row.Bytes
	}
	for _, row := range loadCorpus(t).Canons {
		want, known := byName[row.Name]
		if !known {
			t.Fatalf("the corpus carries a canon vector %q this consumer does not construct", row.Name)
		}
		if row.Bytes != want {
			t.Fatalf(
				"canon vector %q disagrees across implementations: the corpus declares %s, "+
					"this consumer's native construction gives %s. This is a reconciliation "+
					"item (schema §12 R10/R11), not a fixture to overwrite: report it.",
				row.Name, row.Bytes, want)
		}
	}
}
