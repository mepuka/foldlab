---
id: 015
title: The grammar foundry — NL to proven DSL over MCP
type: wayfinder:build
status: open
assignee:
blocked-by: [004]
---

## Question

The first family member beyond the catalog: an MCP surface where an
agent supplies a natural-language description (plus examples) and
receives a CLOSED, PROVEN DSL — a declared grammar in the
flb.type.v0 tradition with content-addressed identity, generated law
suites, and derived artifacts. Ratified design (2026-08-13 grilling;
evidence: docs/research/2026-08-13-language-ontology-frontier.md):

1. **The certifier is the only path to the catalog** (ratified):
   `certify(bytes) → Certificate | Refusal`, one proved Go entry
   point discharging well-formedness, regularity (the closure law,
   004 addendum 3), prefix-completeness, and identity. The LLM
   synthesizer is permanently untrusted; the trusted base's line
   count is published in VERIFICATION.md. No second admission path,
   ever — not a convenience API, not a migration script.
2. **The teaching loop is mandatory** (Gold/Angluin): positive-only
   description-in/DSL-out is provably unlearnable, so the endpoint
   always runs the refusal round-trip. Theorem to write: the
   concierge is a minimally adequate teacher for the grammar universe
   (frontier decides membership; every refusal is a counterexample in
   the symmetric difference). Falsifiable benchmark: replace an
   L*LM-style LLM oracle with the concierge, measure convergence.
3. **Unrealizability is a first-class refusal**: `grammar.realizable`
   answers "no grammar in this universe satisfies your description"
   WITH proof (SemGuS-shaped) — the refusal discipline lifted to
   whole languages.
4. **Derived artifacts per grammar** (each a semantic fold, each
   walled by the GF reversibility law parse∘linearize = id):
   GBNF/FSM index served by digest (any agent runtime pins to a DSL
   by hash), JSON Schema, SemGuS encoding, tool schemas. Output
   bundle follows Spoofax's separation: syntax / static semantics /
   transformation as separately digested components.
5. **Witness tier** (FlashMeta): declared serializable inverse
   semantics per step; anonymous witnesses refuse identity;
   synthesize(grammar, examples) derives as one more fold with a
   by-construction correctness law.
6. **Stated limitations for the ledger**: the semantic gap (whether
   the induced grammar means what the description said) is
   irreducible — positioned honestly against Doc2Spec; and
   grammar-constrained decoding distorts the model's conditional
   distribution (GAD, NeurIPS 2024) — validity is a syntactic claim.

Sequencing: after 004's build reaches the certifier's prerequisites
(normalize-then-digest machinery, closure-law admission); the
concierge laws (ticket 003 amendment) are shared infrastructure.
