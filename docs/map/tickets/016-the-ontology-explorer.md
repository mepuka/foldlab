---
id: 016
title: The ontology explorer — digest streams to recomputable ontologies
type: wayfinder:build
status: open
assignee:
blocked-by: [004]
---

## Question

The second family member: an MCP surface that ingests digest streams
(type digests, span heads, anchors) and emits a BOUNDED set of
semantic classification tasks whose answers collapse mechanically
into a coherent, RECOMPUTABLE ontology. Engine: attribute exploration
(Ganter & Obiedkov; Duquenne–Guigues canonical basis — complete,
non-redundant, minimum-cardinality). Ratified design (2026-08-13
grilling; evidence:
docs/research/2026-08-13-language-ontology-frontier.md):

1. **The scale is a cataloged type** (`flb.scale.v0`: ordered
   predicate digests over canonical structure). Every ontology names
   its lens: (scale digest, exploration-journal head, lattice digest)
   — the anchor triple one level up.
2. **The budget is contract**: max_questions + basis-kind (canonical |
   proper_premises | d_basis); overflow is a typed refusal carrying
   the still-sound partial basis and the resume journal head. Bounded
   ≠ small (coNP next-question, exponential worst-case basis) — the
   sharp edge arrives as a taught refusal, never a hung endpoint.
3. **Two task verbs, theorem-forced** (Konev–Lutz–Ozaki–Wolter):
   membership and equivalence — neither alone suffices. Target
   fragment is DL-Lite/OWL-2-RL-shaped (polynomially learnable; EL is
   provably not) and is itself declared contract data. EL interop, if
   ever needed, is a derived view, never the learning target.
4. **The sort mapping is the core claim** (ours; not in the FCA
   literature): a counterexample is monotone evidence (grow-only
   journal, plain-check admissible, federates); an accepted
   implication is an absence claim that can rot and routes through
   the effector's CAS. The ontology is a recomputable fold over an
   append-only Q/A journal (`flb.exploration.v0` records), converging
   from above. Positioning: the field says "grounded"; we say
   "recomputable."
5. **Merge is a colimit, not a join** (ratified): admitted only as
   (alignment span digest — a decision, effector-homed; recomputed
   colimit digest — evidence, refused on mismatch). Joins remain the
   shared-signature special case and inherit the CRDT results.
6. **Pattern structures** bridge digests in: descriptions ordered by
   structural anti-unification, meet = a declared commutative
   idempotent monoid (fold-algebra object); the projection is the
   declared precision dial, digested into the result.
7. **Discipline imports**: uncertainty gating (never ask what closure
   settles); background-knowledge pruning from declared
   checks/commutativity classes; per-task-kind error rates measured
   against gold contexts; Swoosh ICAR walls gate the
   entity-resolution path.

Sequencing: de-risking experiments first (codex tasks 11–13) — their
memos shape this ticket's build; the fallible-oracle consistency
number decides whether a consistency protocol precedes architecture.
