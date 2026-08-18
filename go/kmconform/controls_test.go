// The control arm (schema §11 check 33).
//
// A validator with no failing case proves nothing, and one that rejects
// everything proves nothing either. Every control below is a SINGLE mutation
// of the committed artifact, and the positive control is the unmutated
// artifact, which must be accepted by the same code path.
//
// One control is deliberately an ACCEPTANCE: a reflowed docstring. Naming a
// gap mechanically is worth more than leaving a reader to assume coverage.
package kmconform_test

import (
	"strings"
	"testing"

	"foldlab/kmconform"
)

// upperVerticalTabEscape is the UPPERCASE-hex spelling of U+000B, assembled
// from parts so that this source file carries neither the control character
// itself nor a four-digit escape a reader has to decode by eye. Canonical
// form writes the lowercase digits, so the uppercase spelling is a different
// byte string for the same character and must be refused.
const upperVerticalTabEscape = `\u000` + "B"

// mutate applies exactly one textual mutation, and refuses to run if the
// target text is not unique: a control that silently changed two records
// would be testing something other than what it names.
func mutate(t *testing.T, raw []byte, old, replacement string) []byte {
	t.Helper()
	text := string(raw)
	if count := strings.Count(text, old); count != 1 {
		t.Fatalf("the control target %q occurs %d times in the corpus, want exactly 1", old, count)
	}
	return []byte(strings.Replace(text, old, replacement, 1))
}

// firstDocLine returns the corpus's first doc record verbatim. The doc group
// carries the model's own prose, so a control that hard-coded a sentence from
// it would break on the next docstring edit and read as a corpus defect. The
// controls below derive their target instead.
func firstDocLine(t *testing.T, raw []byte) string {
	t.Helper()
	for _, line := range strings.Split(strings.TrimSuffix(string(raw), "\n"), "\n") {
		if strings.Contains(line, `"record":"doc"`) {
			return line
		}
	}
	t.Fatal("the corpus carries no doc record to mutate")
	return ""
}

// swapLines exchanges two whole records, which is how a group-order or a
// rank-order mutation is expressed without touching a single byte inside
// either record.
func swapLines(t *testing.T, raw []byte, first, second int) []byte {
	t.Helper()
	lines := strings.Split(strings.TrimSuffix(string(raw), "\n"), "\n")
	if first >= len(lines) || second >= len(lines) {
		t.Fatalf("cannot swap lines %d and %d of a %d-line corpus", first, second, len(lines))
	}
	lines[first], lines[second] = lines[second], lines[first]
	return []byte(strings.Join(lines, "\n") + "\n")
}

func TestThePositiveControl(t *testing.T) {
	// The unmutated artifact, through the same entry point every control
	// below uses. Without this row the sixteen refusals prove only that the
	// validator can say no.
	if _, err := kmconform.CheckBothWays(corpusBytes(t)); err != nil {
		t.Fatalf("the committed corpus was refused: %v", err)
	}
}

func TestSingleMutationControls(t *testing.T) {
	raw := corpusBytes(t)

	for _, control := range []struct {
		name    string
		mutated func() []byte
		expects string
	}{
		{
			// Format 2's signature mutation: the record still parses as JSON
			// and denotes the same value, and the both-ways law still catches
			// it, because canonical form is about bytes.
			name: "a swapped pair of object members",
			mutated: func() []byte {
				return mutate(t, raw,
					`{"name":"schema","rank":0,"record":"kind"}`,
					`{"rank":0,"name":"schema","record":"kind"}`)
			},
			expects: "members are sorted",
		},
		{
			// The deviation, mutated: 2^53 is what a double-backed emitter
			// produces from 2^53 + 1, so this is the exact byte a rounding
			// implementation would write.
			name: "the big-integer canon value rounded to 2^53",
			mutated: func() []byte {
				return mutate(t, raw, `,"value":9007199254740993}`, `,"value":9007199254740992}`)
			},
			expects: "canon vector",
		},
		{
			// The canonical spelling of U+000B is lowercase; an uppercase hex
			// digit in the \u00XX fallback is a different byte string for the
			// same character, and canonical form admits only one.
			name: "an uppercase hex digit in a control-character escape",
			mutated: func() []byte {
				line := firstDocLine(t, raw)
				return mutate(t, raw, line,
					strings.Replace(line, `"doc":"`, `"doc":"`+upperVerticalTabEscape, 1))
			},
			expects: "canonically escaped",
		},
		{
			name: "whitespace inside a record",
			mutated: func() []byte {
				return mutate(t, raw,
					`{"name":"schema","rank":0,"record":"kind"}`,
					`{"name":"schema", "rank":0,"record":"kind"}`)
			},
			expects: "offset",
		},
		{
			name: "a header count off by one",
			mutated: func() []byte {
				return mutate(t, raw, `"kind":12`, `"kind":11`)
			},
			expects: "header declares 11 kind records",
		},
		{
			name: "a rank that is not dense",
			mutated: func() []byte {
				return mutate(t, raw,
					`{"name":"program","rank":1,"record":"kind"}`,
					`{"name":"program","rank":2,"record":"kind"}`)
			},
			expects: "ranks are dense",
		},
		{
			name: "two records of one group swapped",
			mutated: func() []byte {
				// Lines 2 and 3 (1-indexed) are the first two kind records, so
				// their ranks stop matching their positions.
				return swapLines(t, raw, 1, 2)
			},
			expects: "ranks are dense",
		},
		{
			name: "a group out of order",
			mutated: func() []byte {
				// Line 14 is the first stage record; line 13 the last kind.
				return swapLines(t, raw, 12, 13)
			},
			expects: "the group order is fixed",
		},
		{
			name: "a refusal with no repair",
			mutated: func() []byte {
				return mutate(t, raw,
					`"repair":"emit the claimed time as a tick fact on an evidence lane; schedule through a declared schedule value"`,
					`"repair":""`)
			},
			expects: "refusal parity is total",
		},
		{
			name: "an applicability outside the closed set",
			mutated: func() []byte {
				return mutate(t, raw,
					`{"applicability":"advisory","law":"the fold carrier has no clock parameter`,
					`{"applicability":"sometimes","law":"the fold carrier has no clock parameter`)
			},
			expects: "outside the closed set",
		},
		{
			name: "a machine-applicable repair demoted to advisory",
			mutated: func() []byte {
				return mutate(t, raw,
					`"applicability":"machine-applicable","law":"cells merge by join`,
					`"applicability":"advisory","law":"cells merge by join`)
			},
			expects: "machine-applicable",
		},
		{
			name: "a structure constructor not named mk",
			mutated: func() []byte {
				return mutate(t, raw,
					`{"fields":[{"name":"id","type":"Nat"}],"name":"mk"}],"form":"structure","name":"Digest"`,
					`{"fields":[{"name":"id","type":"Nat"}],"name":"make"}],"form":"structure","name":"Digest"`)
			},
			expects: `want "mk"`,
		},
		{
			name: "a field naming an undeclared type",
			mutated: func() []byte {
				return mutate(t, raw,
					`{"fields":[{"name":"id","type":"Nat"}],"name":"mk"}],"form":"structure","name":"Digest"`,
					`{"fields":[{"name":"id","type":"Hash"}],"name":"mk"}],"form":"structure","name":"Digest"`)
			},
			expects: "undeclared type",
		},
		{
			name: "an admission verdict outside the closed set",
			mutated: func() []byte {
				return mutate(t, raw,
					`{"name":"clockFold","reason":"clock-read","record":"admission","verdict":"refused"}`,
					`{"name":"clockFold","reason":"clock-read","record":"admission","verdict":"maybe"}`)
			},
			expects: "outside the closed set",
		},
		{
			name: "an admission refusing out of the control order",
			mutated: func() []byte {
				return mutate(t, raw,
					`{"name":"clockFold","reason":"clock-read","record":"admission","verdict":"refused"}`,
					`{"name":"clockFold","reason":"minted-identifier","record":"admission","verdict":"refused"}`)
			},
			expects: "have diverged",
		},
		{
			name: "the admitted encoding disagreeing with the lawful vector",
			mutated: func() []byte {
				return mutate(t, raw,
					`{"encoded":[0,0,7000051000172,4],"name":"lawfulDeclare"`,
					`{"encoded":[0,0,7000051000173,4],"name":"lawfulDeclare"`)
			},
			expects: "two emissions of the same fact",
		},
		{
			name: "an encoding vector of the wrong arity",
			mutated: func() []byte {
				return mutate(t, raw,
					`{"act":[0,0,7000051000172,4],"name":"lawful-declare","record":"encoding"}`,
					`{"act":[0,0,7000051000172],"name":"lawful-declare","record":"encoding"}`)
			},
			expects: "want 4 for generator tag 0",
		},
		{
			name: "a doc record naming an undeclared type",
			mutated: func() []byte {
				return mutate(t, raw, `"name":"DeclKind","record":"doc"`, `"name":"DeclKinds","record":"doc"`)
			},
			expects: "not a declared type",
		},
		{
			name: "a canon vector renamed",
			mutated: func() []byte {
				return mutate(t, raw, `"name":"empty-object","record":"canon"`, `"name":"empty-obj","record":"canon"`)
			},
			expects: "the canon group is a fixed list",
		},
		{
			name: "provenance naming another model",
			mutated: func() []byte {
				return mutate(t, raw, `"source":"verify/kernel"`, `"source":"verify/fabric"`)
			},
			expects: "header source",
		},
		{
			name: "a second header record",
			mutated: func() []byte {
				lines := strings.Split(string(raw), "\n")
				return []byte(lines[0] + "\n" + lines[0] + "\n" + strings.Join(lines[1:], "\n"))
			},
			expects: "a second header",
		},
	} {
		mutated := control.mutated()
		if string(mutated) == string(raw) {
			t.Fatalf("%s: the mutation changed nothing", control.name)
		}
		_, err := kmconform.CheckBothWays(mutated)
		if err == nil {
			t.Fatalf("%s: the mutated corpus was ACCEPTED; this validator cannot catch it", control.name)
		}
		if !strings.Contains(err.Error(), control.expects) {
			t.Fatalf("%s: refused with %q, want the refusal to name %q", control.name, err, control.expects)
		}
	}
}

// TestAReflowedDocstringIsNotCaughtHere records a boundary rather than a
// capability. A reflowed docstring is still canonical, still in order, and
// still non-empty, so every check this consumer owns passes. The check that
// catches it is regeneration against the model (schema §11 check 31), which
// belongs to the lane that owns the emitter — not to a reader of the file.
// Asserting the acceptance keeps the gap mechanical: if a later check starts
// catching reflow, this test fails and the boundary is restated deliberately.
func TestAReflowedDocstringIsNotCaughtHere(t *testing.T) {
	raw := corpusBytes(t)
	line := firstDocLine(t, raw)
	// A space becomes an escaped newline: the docstring now says something the
	// model did not say, and every check this consumer owns still passes.
	reflowed := mutate(t, raw, line, strings.Replace(line, " ", `\n`, 1))
	if _, err := kmconform.CheckBothWays(reflowed); err != nil {
		t.Fatalf("a reflowed docstring was refused by %v; if that is now a check this consumer owns, "+
			"this control has become stale and the boundary should be restated", err)
	}
}
