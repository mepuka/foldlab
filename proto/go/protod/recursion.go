package protod

// walkRefGraph enforces the flb.type.v1 recursion ban over the candidate and
// every resolvable reference reachable from it. The current catalog ordering
// makes cycles unreachable in honest operation; keeping the law here means a
// rebuilt or directly exercised walk cannot silently rely on that accident.
//
// The pre-ratified successor, when a real recursive consumer exists, is the
// Unison SCC rule: hash the SCC, order members by cycle-removed hashes, and
// address digest.n. No SCC machinery belongs in the recursion-banned scheme.
func walkRefGraph(
	value any,
	path []string,
	resolve func(digest string) (any, bool),
) *Refusal {
	active := map[string]bool{}
	visited := map[string]bool{}
	stack := []string{}

	var visit func(any, []string) *Refusal
	visit = func(term any, termPath []string) *Refusal {
		result, refusal := walkStructure(term, termPath)
		if refusal != nil {
			return refusal
		}
		for _, ref := range result.refs {
			if active[ref.digest] {
				cycle := append(append([]string{}, stack...), ref.digest)
				return &Refusal{
					Kind: KindInvalidStructure,
					Law:  "flb.type.v1: recursion is banned; every admitted ref graph is acyclic",
					Path: ref.path,
					Got: map[string]any{
						"digest": ref.digest,
						"cycle":  cycle,
					},
					Expected: "an acyclic ref graph",
					Next: []NextHint{
						{
							Subject: SubjectTypeCreate,
							Note:    "remove the recursive reference and resubmit",
						},
						readCatalogHint(),
					},
				}
			}
			if visited[ref.digest] {
				continue
			}
			target, known := resolve(ref.digest)
			if !known {
				// Unknown refs are refused by the catalog resolution step, which
				// can give the more specific unknown-ref repair.
				continue
			}
			active[ref.digest] = true
			stack = append(stack, ref.digest)
			if refusal := visit(target, append(ref.path, "$resolved")); refusal != nil {
				return refusal
			}
			stack = stack[:len(stack)-1]
			delete(active, ref.digest)
			visited[ref.digest] = true
		}
		return nil
	}

	return visit(value, path)
}
