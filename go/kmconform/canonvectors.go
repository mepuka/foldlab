package kmconform

// The ten canon vectors, constructed natively.
//
// These are built here in Go from the schema and from nothing else: no record
// is parsed to obtain them. That is the whole point. The weak check — parse a
// canon record, canonicalize its `value`, compare to its `bytes` — cannot
// test a member sort, because a value read out of the corpus is already
// sorted. Only a value this package builds with `b` inserted before `a`
// exercises the sort, so only a natively constructed `key-order` proves the
// emitter sorts at all.
//
// Two of the ten — string-escapes and control-char — are the vectors whose
// exact text the freeze left open (schema §12, R10 and R11, both recorded
// "pending lean-meta's actual value"). They are built here to the value the
// model-end lane emits, which is what those items instruct; the schema's §3
// table shows a longer draft spelling that the emitted artifact did not take,
// and reconciling that table is a documentation item, not a code one.

import (
	"fmt"
	"math/big"
)

// twoPow53Plus1 is 9007199254740993 = 2^53 + 1, the smallest odd integer no
// binary64 can hold. It is spelled as a decimal STRING and parsed at
// arbitrary precision: writing it as a Go floating literal is exactly the
// mistake the number deviation exists to prevent, and writing it as an
// untyped integer constant would still be a second spelling of the same
// fact.
const twoPow53Plus1 = "9007199254740993"

// CanonVectors builds the ten canonicalization vectors of the freeze, in
// the freeze's order, each carrying the bytes its own value serializes to.
//
// The Bytes field is COMPUTED by the emitter, never transcribed: a row that
// carried a hand-typed byte string could disagree with what the serializer
// actually does and the disagreement would read as agreement.
func CanonVectors() ([]CanonRow, error) {
	emptyObject, err := ObjectValue()
	if err != nil {
		return nil, err
	}

	// Members supplied b-first on purpose. The canonical form sorts them, so
	// the bytes show a before b; an emitter that preserves insertion order
	// fails here and nowhere else in the ten.
	keyOrder, err := ObjectValue(
		JSONMember{Name: "b", Value: UintValue(1)},
		JSONMember{Name: "a", Value: UintValue(2)},
	)
	if err != nil {
		return nil, err
	}

	inner, err := ObjectValue(JSONMember{
		Name:  "y",
		Value: ArrayValue(UintValue(3), UintValue(4)),
	})
	if err != nil {
		return nil, err
	}
	nestedObject, err := ObjectValue(JSONMember{Name: "z", Value: inner})
	if err != nil {
		return nil, err
	}

	bigInteger, ok := new(big.Int).SetString(twoPow53Plus1, 10)
	if !ok {
		return nil, fmt.Errorf("the big-integer vector %q does not parse as a decimal integer", twoPow53Plus1)
	}

	vectors := []struct {
		name  string
		value JSONValue
	}{
		{"empty-object", emptyObject},
		{"empty-array", ArrayValue()},
		{"empty-string", StringValue("")},
		{"zero", UintValue(0)},
		{"big-integer", IntValue(bigInteger)},
		{"key-order", keyOrder},
		{"nested-object", nestedObject},
		{"nested-array", ArrayValue(ArrayValue(), ArrayValue(emptyObject))},
		// The two single-character escapes and two of the five two-character
		// ones, each with an ordinary letter on either side, so an escaper
		// that mangles the characters ADJACENT to an escape is caught too, and
		// so is one that truncates the string at the first escape.
		{"string-escapes", StringValue("a\"b\\c\nd\te")},
		// U+0001 alone. It has no two-character escape, so the bytes must show
		// the four-digit lowercase \u00XX fallback; an emitter that writes
		// \u1, writes \x01, or passes the byte through raw fails here.
		// The code point is spelled as a rune value rather than as a source
		// escape so that this file carries no control byte of its own and no
		// escape sequence a reader has to decode by eye.
		{"control-char", StringValue(string(rune(1)))},
	}

	rows := make([]CanonRow, 0, len(vectors))
	for _, vector := range vectors {
		encoded, err := vector.value.Canonical()
		if err != nil {
			return nil, fmt.Errorf("canon vector %q: %w", vector.name, err)
		}
		rows = append(rows, CanonRow{
			Name:  vector.name,
			Bytes: string(encoded),
			Value: vector.value,
		})
	}
	if len(rows) != len(canonVectorNames) {
		return nil, fmt.Errorf(
			"built %d canon vectors, the grammar names %d", len(rows), len(canonVectorNames))
	}
	for index, row := range rows {
		if row.Name != canonVectorNames[index] {
			return nil, fmt.Errorf(
				"canon vector %d is named %q, the grammar names it %q",
				index, row.Name, canonVectorNames[index])
		}
	}
	return rows, nil
}
