// The estate canonical JSON obligations, one test per rule.
//
// OBLIGATION TABLE (schema §1 rule -> test):
//
//	§1.1 member sort, no whitespace, JCS escapes -> TestCanonicalizeNormalizes
//	§1.1 canonical input is a fixed point        -> TestCanonicalIsAFixedPoint
//	§1.2 arbitrary precision, minimal decimal    -> TestIntegersSurviveArbitraryPrecision
//	§1.2 refuse fraction / exponent / minus      -> TestParseRefusesTheNumberDomainViolations
//	§1.1 refuse a non-canonical spelling         -> TestParseCanonicalRefusesNonCanonicalForms
//	§1.3 ASCII only                              -> TestNonASCIIIsRefusedBothWays
//	emitter domain refusals                      -> TestEmitterRefusesValuesOutsideTheDomain
package kmconform_test

import (
	"math/big"
	"strings"
	"testing"

	"foldlab/kmconform"
)

func TestCanonicalIsAFixedPoint(t *testing.T) {
	// Canonical bytes in, the same bytes out. Half of the both-ways law,
	// stated on single values rather than on a file.
	for _, encoded := range []string{
		`{}`,
		`[]`,
		`""`,
		`0`,
		`9007199254740993`,
		`{"a":2,"b":1}`,
		`{"z":{"y":[3,4]}}`,
		`[[],[{}]]`,
		`"quote \" backslash \\ newline \n tab \t end"`,
		`"control\u0001char"`,
		`{"a":null,"b":true,"c":false}`,
		`[1,2,3]`,
	} {
		parsed, err := kmconform.ParseCanonical([]byte(encoded))
		if err != nil {
			t.Fatalf("ParseCanonical(%s): %v", encoded, err)
		}
		emitted, err := parsed.Canonical()
		if err != nil {
			t.Fatalf("Canonical(%s): %v", encoded, err)
		}
		if string(emitted) != encoded {
			t.Fatalf("fixed point: got %s want %s", emitted, encoded)
		}
	}
}

func TestCanonicalizeNormalizes(t *testing.T) {
	// What canonicalization is ALLOWED to fix: insignificant whitespace and
	// member order. Everything else it must refuse rather than repair.
	for _, testCase := range []struct{ input, want string }{
		{`{ "b" : 1 , "a" : 2 }`, `{"a":2,"b":1}`},
		{"{\n  \"z\": {\n    \"y\": [3, 4]\n  }\n}", `{"z":{"y":[3,4]}}`},
		{`[ ]`, `[]`},
		{`{ }`, `{}`},
		{`[ 1 , 2 ]`, `[1,2]`},
		// Sorting recurses: an emitter that sorts only the top level fails here.
		{`{"z":{"y":1,"x":2},"a":3}`, `{"a":3,"z":{"x":2,"y":1}}`},
		// The escapes JCS admits on input but does not write on output.
		{`"\u0041\/"`, `"A/"`},
		{`"\u000a"`, `"\n"`},
		{`"\u000A"`, `"\n"`},
	} {
		got, err := kmconform.Canonicalize([]byte(testCase.input))
		if err != nil {
			t.Fatalf("Canonicalize(%s): %v", testCase.input, err)
		}
		if string(got) != testCase.want {
			t.Fatalf("Canonicalize(%s): got %s want %s", testCase.input, got, testCase.want)
		}
	}
}

func TestIntegersSurviveArbitraryPrecision(t *testing.T) {
	// The deviation, exercised past every fixed width. A reader routing these
	// through a double or a uint64 loses the low digits and fails here.
	for _, decimal := range []string{
		"0",
		"1",
		"9007199254740992",
		"9007199254740993",
		"18446744073709551615",
		"18446744073709551616",
		"123456789012345678901234567890123456789012345678901234567890",
	} {
		parsed, err := kmconform.ParseCanonical([]byte(decimal))
		if err != nil {
			t.Fatalf("ParseCanonical(%s): %v", decimal, err)
		}
		number, ok := parsed.Int()
		if !ok {
			t.Fatalf("ParseCanonical(%s) is a %s, not an integer", decimal, parsed.Kind())
		}
		want, _ := new(big.Int).SetString(decimal, 10)
		if number.Cmp(want) != 0 {
			t.Fatalf("precision lost: got %s want %s", number, want)
		}
		emitted, err := parsed.Canonical()
		if err != nil {
			t.Fatalf("Canonical(%s): %v", decimal, err)
		}
		if string(emitted) != decimal {
			t.Fatalf("minimal decimal: got %s want %s", emitted, decimal)
		}
	}
}

func TestParseRefusesTheNumberDomainViolations(t *testing.T) {
	// Refused, never coerced. Each of these has a "reasonable" reading that a
	// lenient parser would take, and taking it would silently change a vector.
	for _, testCase := range []struct{ input, wants string }{
		{`1.5`, "fraction"},
		{`1.0`, "fraction"},
		{`1e3`, "exponent"},
		{`1E3`, "exponent"},
		{`-1`, "minus"},
		{`-0`, "minus"},
		{`00`, "leading zero"},
		{`01`, "leading zero"},
		{`[1.0]`, "fraction"},
		{`{"a":-1}`, "minus"},
	} {
		if _, err := kmconform.ParseRelaxed([]byte(testCase.input)); err == nil {
			t.Fatalf("ParseRelaxed(%s) was accepted; want a refusal naming %q", testCase.input, testCase.wants)
		} else if !strings.Contains(err.Error(), testCase.wants) {
			t.Fatalf("ParseRelaxed(%s) refused with %q, want the refusal to name %q", testCase.input, err, testCase.wants)
		}
	}
}

func TestParseCanonicalRefusesNonCanonicalForms(t *testing.T) {
	// The strict reader is the corpus reader. A file is canonical by rule, so
	// a deviation is a defect in whatever produced it; reading it leniently
	// would hide that defect behind a working consumer.
	for _, testCase := range []struct{ name, input string }{
		{"space after colon", `{"a": 1}`},
		{"space after comma", `{"a":1, "b":2}`},
		{"space inside empty object", `{ }`},
		{"space inside empty array", `[ ]`},
		{"leading space", ` {}`},
		{"trailing space", `{} `},
		{"unsorted members", `{"b":1,"a":2}`},
		{"duplicate member name", `{"a":1,"a":2}`},
		{"unsorted nested members", `{"a":{"z":1,"y":2}}`},
		{"escaped solidus", `"\/"`},
		{"unicode escape of a printable", `"\u0041"`},
		{"unicode escape of a newline", `"\u000a"`},
		{"uppercase hex in a control escape", `"\u000A"`},
		// The canonical form of U+000B is \u000b, so \u000B must be refused.
		{"uppercase hex in the fallback", `"\u000B"`},
		{"trailing input", `{}{}`},
		{"unterminated string", `"abc`},
		{"raw control character in a string", "\"a\tb\""},
		{"unclosed object", `{"a":1`},
		{"unclosed array", `[1`},
		{"bare word", `undefined`},
	} {
		if _, err := kmconform.ParseCanonical([]byte(testCase.input)); err == nil {
			t.Fatalf("%s: ParseCanonical(%s) was accepted, want a refusal", testCase.name, testCase.input)
		}
	}
}

func TestNonASCIIIsRefusedBothWays(t *testing.T) {
	// The corpus is ASCII by rule. A non-ASCII byte is refused rather than
	// escaped on the way out: escaping it would produce a file that reads back
	// fine and violates the rule invisibly.
	if _, err := kmconform.ParseCanonical([]byte("\"\u00e9\"")); err == nil {
		t.Fatal("a non-ASCII byte in a string was accepted")
	}
	if _, err := kmconform.StringValue("\u2014").Canonical(); err == nil {
		t.Fatal("the emitter serialized a non-ASCII string; the corpus is ASCII-only by rule")
	}
	if _, err := kmconform.ParseCanonical([]byte("\"\\u00e9\"")); err == nil {
		t.Fatal("a non-ASCII unicode escape was accepted")
	}
}

func TestEmitterRefusesValuesOutsideTheDomain(t *testing.T) {
	negative := kmconform.IntValue(big.NewInt(-1))
	if _, err := negative.Canonical(); err == nil {
		t.Fatal("the emitter serialized a negative integer; the number domain is the non-negative integers")
	}
	absent := kmconform.IntValue(nil)
	if _, err := absent.Canonical(); err == nil {
		t.Fatal("the emitter serialized an absent integer")
	}
	if _, err := kmconform.ObjectValue(
		kmconform.JSONMember{Name: "a", Value: kmconform.UintValue(1)},
		kmconform.JSONMember{Name: "a", Value: kmconform.UintValue(2)},
	); err == nil {
		t.Fatal("ObjectValue accepted a duplicate member name; two members with one name denote no value")
	}
}

func TestObjectValueSortsOnConstruction(t *testing.T) {
	// The in-memory form is canonical, so serialization never re-sorts. This
	// is what makes the both-ways law a claim about the reader rather than
	// about a sort that happens to run at write time.
	object, err := kmconform.ObjectValue(
		kmconform.JSONMember{Name: "b", Value: kmconform.UintValue(1)},
		kmconform.JSONMember{Name: "a", Value: kmconform.UintValue(2)},
	)
	if err != nil {
		t.Fatal(err)
	}
	if got := strings.Join(object.MemberNames(), ","); got != "a,b" {
		t.Fatalf("members are [%s], want [a,b]", got)
	}
}
