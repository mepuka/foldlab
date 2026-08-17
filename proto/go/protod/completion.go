package protod

import "sort"

const typeNonterminal = "T"

// completionGrammar is a read-only projection of the closed flb.type.v0
// grammar for deciding whether its nonterminals are inhabited. Structural
// admission remains owned by walkStructure; this projection records only the
// production edges relevant to completion reachability.
type completionGrammar struct {
	start       string
	productions []completionProduction
}

type completionProduction struct {
	result              string
	kind                string
	required            []string
	requiresResolvedRef bool
	build               func(children []any, resolvedRef string) any
}

var closedTypeGrammar = completionGrammar{
	start: typeNonterminal,
	productions: []completionProduction{
		leafCompletion("string"),
		leafCompletion("bool"),
		leafCompletion("int"),
		leafCompletion("null"),
		leafCompletion("opaque"),
		{
			result: typeNonterminal,
			kind:   "literal",
			build: func(_ []any, _ string) any {
				return map[string]any{"k": "literal", "value": nil}
			},
		},
		{
			result:   typeNonterminal,
			kind:     "list",
			required: []string{typeNonterminal},
			build: func(children []any, _ string) any {
				return map[string]any{"k": "list", "of": children[0]}
			},
		},
		{
			result: typeNonterminal,
			kind:   "struct",
			build: func(_ []any, _ string) any {
				return map[string]any{"k": "struct", "fields": map[string]any{}, "optional": []any{}}
			},
		},
		{
			result:   typeNonterminal,
			kind:     "union",
			required: []string{typeNonterminal},
			build: func(children []any, _ string) any {
				return map[string]any{"k": "union", "of": []any{children[0]}}
			},
		},
		{
			result:   typeNonterminal,
			kind:     "brand",
			required: []string{typeNonterminal},
			build: func(children []any, _ string) any {
				return map[string]any{"k": "brand", "name": "Brand", "of": children[0]}
			},
		},
		{
			result:   typeNonterminal,
			kind:     "check",
			required: []string{typeNonterminal},
			build: func(children []any, _ string) any {
				return map[string]any{
					"k":     "check",
					"base":  children[0],
					"check": map[string]any{"name": "check", "args": map[string]any{}},
				}
			},
		},
		{
			result:              typeNonterminal,
			kind:                "ref",
			requiresResolvedRef: true,
			build: func(_ []any, resolvedRef string) any {
				return map[string]any{"k": "ref", "digest": resolvedRef}
			},
		},
	},
}

func leafCompletion(kind string) completionProduction {
	return completionProduction{
		result: typeNonterminal,
		kind:   kind,
		build: func(_ []any, _ string) any {
			return map[string]any{"k": kind}
		},
	}
}

type completionFixpoint struct {
	byNonterminal map[string]any
	byKind        map[string]any
}

// deriveCompletionFixpoint computes the least productive set. A production
// becomes productive only after every required child nonterminal has a closed
// witness. A ref production additionally requires at least one digest in the
// caller's exact resolved-catalog snapshot.
func deriveCompletionFixpoint(grammar completionGrammar, resolvedCatalog []string) completionFixpoint {
	digests := append([]string{}, resolvedCatalog...)
	sort.Strings(digests)

	result := completionFixpoint{
		byNonterminal: map[string]any{},
		byKind:        map[string]any{},
	}
	for {
		changed := false
		for _, production := range grammar.productions {
			if _, productive := result.byKind[production.kind]; productive {
				continue
			}
			if production.requiresResolvedRef && len(digests) == 0 {
				continue
			}

			children := make([]any, len(production.required))
			productive := true
			for index, nonterminal := range production.required {
				witness, known := result.byNonterminal[nonterminal]
				if !known {
					productive = false
					break
				}
				children[index] = cloneJSON(witness)
			}
			if !productive {
				continue
			}

			resolvedRef := ""
			if production.requiresResolvedRef {
				resolvedRef = digests[0]
			}
			witness := production.build(children, resolvedRef)
			result.byKind[production.kind] = witness
			if _, known := result.byNonterminal[production.result]; !known {
				result.byNonterminal[production.result] = cloneJSON(witness)
			}
			changed = true
		}
		if !changed {
			return result
		}
	}
}

// closedCompletion decides the current bounded claim: whether a post-fill
// partial has a closed flb.type.v0 completion under an exact snapshot of the
// locally resolvable catalog digests. It returns one witness and validates it
// through the certifier's grammar walk; each ref in the witness must be a
// member of that snapshot.
func closedCompletion(template any, resolvedCatalog []string) (any, bool) {
	partial, refusal := walkPartial(template, []string{})
	if refusal != nil {
		return nil, false
	}

	fixpoint := deriveCompletionFixpoint(closedTypeGrammar, resolvedCatalog)
	witness, inhabited := fixpoint.byNonterminal[closedTypeGrammar.start]
	if len(partial.holes) > 0 && !inhabited {
		return nil, false
	}

	completed := cloneJSON(template)
	for _, path := range partial.holes {
		var replacementRefusal *Refusal
		completed, replacementRefusal = replaceTypeNode(completed, path, cloneJSON(witness), true)
		if replacementRefusal != nil {
			return nil, false
		}
	}

	closed, refusal := walkStructure(completed, []string{})
	if refusal != nil {
		return nil, false
	}
	resolved := make(map[string]struct{}, len(resolvedCatalog))
	for _, digest := range resolvedCatalog {
		resolved[digest] = struct{}{}
	}
	for _, ref := range closed.refs {
		if _, known := resolved[ref.digest]; !known {
			return nil, false
		}
	}
	return completed, true
}

func grammarLegalKinds(grammar completionGrammar, nonterminal string) []string {
	kinds := make([]string, 0)
	for _, production := range grammar.productions {
		if production.result == nonterminal {
			kinds = append(kinds, production.kind)
		}
	}
	sort.Strings(kinds)
	return kinds
}

// grammarHolePositionKinds derives the nonterminals at which the grammar can
// recurse: the start position plus every production's required child sorts.
func grammarHolePositionKinds(grammar completionGrammar) []string {
	positions := map[string]struct{}{grammar.start: {}}
	for _, production := range grammar.productions {
		for _, required := range production.required {
			positions[required] = struct{}{}
		}
	}
	result := make([]string, 0, len(positions))
	for position := range positions {
		result = append(result, position)
	}
	sort.Strings(result)
	return result
}
