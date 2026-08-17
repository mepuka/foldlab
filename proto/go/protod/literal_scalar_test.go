package protod

import (
	"encoding/json"
	"math"
	"slices"
	"testing"
)

// The literal position carries the same integrality bound as the int leaf, so
// no flb.type.v0 term can carry a number whose canonical form needs
// shortest-round-trip printing. The refused vectors below are the exact
// values the review probes minted lawfully before the narrowing: 5e-324,
// 1e+21, and 1e-7 are ES2019 shortest-round-trip renderings, and 0.1 is the
// ordinary case that shows the bound is about integrality, not magnitude.

const nonIntegerLiteralLaw = "flb.type.v0: a literal number is integral — whole and within ±(2^53-1); a non-integer number has no v0 form"

func TestNonIntegerLiteralScalarsRefuseByName(t *testing.T) {
	for _, source := range []string{"5e-324", "0.1", "1e21", "1e-7", "-0.5", "1.7976931348623157e308", "9007199254740992"} {
		t.Run(source, func(t *testing.T) {
			var value any
			if err := json.Unmarshal([]byte(source), &value); err != nil {
				t.Fatal(err)
			}
			node := map[string]any{"k": "literal", "value": value}
			_, refusal := walkStructure(node, []string{})
			if refusal == nil {
				t.Fatalf("literal %s was admitted into flb.type.v0", source)
			}
			if refusal.Kind != KindInvalidStructure {
				t.Fatalf("literal %s refusal kind = %q, want %q", source, refusal.Kind, KindInvalidStructure)
			}
			if refusal.Law != nonIntegerLiteralLaw {
				t.Fatalf("literal %s used a different refusal law: %q", source, refusal.Law)
			}
			if !slices.Equal(refusal.Path, []string{"value"}) {
				t.Fatalf("literal %s refusal path = %v, want [value]", source, refusal.Path)
			}
			if got, ok := refusal.Got.(float64); !ok || got != value.(float64) {
				t.Fatalf("literal %s refusal got = %#v, want the submitted number", source, refusal.Got)
			}
		})
	}
}

func TestIntegralLiteralScalarsStayAdmitted(t *testing.T) {
	for _, source := range []string{`"on"`, "true", "null", "0", "-0", "10", "-1", "9007199254740991", "-9007199254740991", "1e2"} {
		var value any
		if err := json.Unmarshal([]byte(source), &value); err != nil {
			t.Fatal(err)
		}
		node := map[string]any{"k": "literal", "value": value}
		if _, refusal := walkStructure(node, []string{}); refusal != nil {
			t.Fatalf("literal %s refused: %+v", source, refusal)
		}
	}
}

func TestNonScalarLiteralKeepsItsOwnRefusal(t *testing.T) {
	node := map[string]any{"k": "literal", "value": []any{"a"}}
	_, refusal := walkStructure(node, []string{})
	if refusal == nil {
		t.Fatal("array-valued literal was admitted")
	}
	if refusal.Law == nonIntegerLiteralLaw {
		t.Fatal("an array-valued literal is refused as a non-integer number")
	}
	if refusal.Law != `flb.type.v0: a literal value is a JSON scalar — string, integral number, bool, or null` {
		t.Fatalf("array-valued literal used an unexpected law: %q", refusal.Law)
	}
}

// The int leaf and the literal position must not be able to drift apart:
// there is one predicate, and this pins the bound it states.
func TestOneIntegralityBoundGovernsIntAndLiteral(t *testing.T) {
	daemon := &Daemon{}
	for _, sample := range []float64{5e-324, 0.1, 1e21, 1e-7, math.MaxFloat64, 9007199254740992} {
		if isIntegralJSONNumber(sample) {
			t.Fatalf("%v passes the integrality bound", sample)
		}
		if daemon.checkValue(map[string]any{"k": "int"}, sample, []string{"value"}) == nil {
			t.Fatalf("int admitted %v", sample)
		}
		if _, refusal := walkStructure(map[string]any{"k": "literal", "value": sample}, []string{}); refusal == nil {
			t.Fatalf("literal admitted %v", sample)
		}
	}
	for _, sample := range []float64{0, -0, 1, -1, 9007199254740991, -9007199254740991} {
		if !isIntegralJSONNumber(sample) {
			t.Fatalf("%v fails the integrality bound", sample)
		}
		if daemon.checkValue(map[string]any{"k": "int"}, sample, []string{"value"}) != nil {
			t.Fatalf("int refused %v", sample)
		}
		if _, refusal := walkStructure(map[string]any{"k": "literal", "value": sample}, []string{}); refusal != nil {
			t.Fatalf("literal refused %v: %+v", sample, refusal)
		}
	}
	for _, sample := range []float64{math.NaN(), math.Inf(1), math.Inf(-1)} {
		if isIntegralJSONNumber(sample) {
			t.Fatalf("%v passes the integrality bound", sample)
		}
	}
}

// The narrowing has to hold at the public seam too, not only in the walk.
func TestNonIntegerLiteralRefusesThroughConciergeFill(t *testing.T) {
	body, err := json.Marshal(map[string]any{
		"partial": map[string]any{"k": "hole"},
		"path":    []any{},
		"subtree": map[string]any{"k": "literal", "value": 5e-324},
	})
	if err != nil {
		t.Fatal(err)
	}
	response, ok := (&Daemon{}).serveFill(body).(refusalReply)
	if !ok {
		t.Fatalf("non-integer literal fill returned %T, want refusalReply", (&Daemon{}).serveFill(body))
	}
	refusal := response.Refusal
	if refusal.Kind != KindInvalidStructure {
		t.Fatalf("fill refusal kind = %q, want %q", refusal.Kind, KindInvalidStructure)
	}
	if refusal.Law != nonIntegerLiteralLaw {
		t.Fatalf("fill used a different refusal law: %q", refusal.Law)
	}
	if !slices.Equal(refusal.Path, []string{"partial", "value"}) {
		t.Fatalf("fill refusal path = %v, want [partial value]", refusal.Path)
	}
}
