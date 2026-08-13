package protod

import (
	"strings"
	"testing"
)

func TestC4NoDeadEndsEveryFrontierTemplateHasClosedCompletion(t *testing.T) {
	knownDigest := strings.Repeat("1", 64)
	tests := []struct {
		name    string
		catalog []string
	}{
		{name: "empty catalog", catalog: nil},
		{name: "populated catalog", catalog: []string{knownDigest}},
	}

	// C4 is claimed only at the current closed-grammar bounds. Ticket 025's
	// future metadata holes extend this domain and must re-earn the claim.
	for _, testCase := range tests {
		t.Run(testCase.name, func(t *testing.T) {
			fixpoint := deriveCompletionFixpoint(closedTypeGrammar, testCase.catalog)
			choices := frontierChoices(testCase.catalog)
			for _, choice := range choices {
				if _, productive := fixpoint.byKind[choice.Kind]; !productive {
					t.Fatalf("frontier kind %q is not productive in the grammar fixpoint", choice.Kind)
				}
				closed, completable := closedCompletion(choice.Example, testCase.catalog)
				if !completable {
					t.Fatalf("frontier kind %q has no closed certifiable completion: %#v", choice.Kind, choice.Example)
				}
				if _, refusal := walkStructure(closed, []string{}); refusal != nil {
					t.Fatalf("frontier kind %q produced a non-certifiable witness: %v", choice.Kind, refusal)
				}
			}
		})
	}
}

func TestCompletionReachabilityCatalogAssumption(t *testing.T) {
	knownDigest := strings.Repeat("2", 64)
	unknownDigest := strings.Repeat("3", 64)
	ref := map[string]any{"k": "ref", "digest": knownDigest}

	if _, completable := closedCompletion(ref, nil); completable {
		t.Fatal("a template demanding a resolvable ref completed against an empty catalog")
	}
	if _, completable := closedCompletion(ref, []string{unknownDigest}); completable {
		t.Fatal("a template demanding one digest completed against a different populated catalog")
	}
	if _, completable := closedCompletion(ref, []string{knownDigest}); !completable {
		t.Fatal("a template demanding a resolvable ref did not complete against a catalog containing it")
	}
	if _, completable := closedCompletion(
		map[string]any{"k": "list", "of": map[string]any{"k": "hole"}},
		nil,
	); !completable {
		t.Fatal("a template that does not demand a ref must complete against an empty catalog")
	}
}

func TestCompletionReachabilityNegativeControlRejectsImpossibleChildKind(t *testing.T) {
	impossible := completionProduction{
		result:   typeNonterminal,
		kind:     "impossible-parent",
		required: []string{"not-admitted-by-the-grammar"},
		build: func(_ []any, _ string) any {
			return map[string]any{"k": "impossible-parent"}
		},
	}
	grammar := completionGrammar{start: typeNonterminal, productions: []completionProduction{impossible}}
	if _, productive := deriveCompletionFixpoint(grammar, nil).byKind[impossible.kind]; productive {
		t.Fatal("negative control survived: a production with an impossible required child was called completable")
	}

	// The paired mutant drops exactly the child requirement. It must become
	// productive, proving the control is refuted on the dependency law.
	impossible.required = nil
	grammar.productions[0] = impossible
	if _, productive := deriveCompletionFixpoint(grammar, nil).byKind[impossible.kind]; !productive {
		t.Fatal("control calibration failed: dropping the impossible child did not make the production productive")
	}
}
