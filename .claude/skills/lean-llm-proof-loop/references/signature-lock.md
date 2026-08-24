# Signature lock

Freeze or compare:

- elaborated target type, not only source text;
- imports and namespace/open state;
- referenced domain definitions and instances;
- allowed axioms/options and trusted dependencies;
- theorem attributes/visibility when they affect downstream use.

Allowed proof repair changes a proof body or introduces a proved helper with no stronger trust. A
statement change records old/new types, counterexample or missing assumption, downstream impact,
and reviewer approval before unlocking.

Witnesses, forbidden examples, bidirectional implication to a reference statement, and deliberately
wrong models help detect vacuity or hypothesis laundering. An LLM judge may triage semantic
mismatches; it is not the final authority.

Lean-eval is a public example of statement lock, no-sorry/axiom checks, and sandboxed acceptance
([security policy](https://github.com/leanprover/lean-eval/blob/5aa9a51e2f423e7aeb164e40641e2ee08acf9567/SECURITY.md)).
