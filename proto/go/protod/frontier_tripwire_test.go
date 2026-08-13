package protod

import (
	"slices"
	"strings"
	"testing"
)

func TestC4FrontierUniformityEqualsDerivedGrammarTripwire(t *testing.T) {
	knownDigest := strings.Repeat("4", 64)
	advertised := make([]string, 0)
	for _, choice := range frontierChoices([]string{knownDigest}) {
		advertised = append(advertised, choice.Kind)
	}
	slices.Sort(advertised)
	derived := grammarLegalKinds(closedTypeGrammar, typeNonterminal)
	if !slices.Equal(advertised, derived) {
		t.Fatalf("uniform frontier kinds %v differ from grammar-derived legal T kinds %v", advertised, derived)
	}

	holeKinds := grammarHolePositionKinds(closedTypeGrammar)
	if !slices.Equal(holeKinds, []string{typeNonterminal}) {
		t.Fatalf("current frontier assumes one hole-position kind T; grammar now has %v", holeKinds)
	}
}
