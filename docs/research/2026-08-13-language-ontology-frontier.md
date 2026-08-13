# The language and ontology frontier: NL→proven DSLs and digest-stream ontologies

Provenance: two Opus research scouts, dispatched 2026-08-13 (DSL
synthesis/grammars; ontology/neurosymbolic), live web search with
per-source verification notes (snippet-only items marked in the raw
findings; three sources fetched and read on the ontology side).
Coordinator synthesis (Fable). Product visions under study: (1) an MCP
endpoint that takes a natural-language grammar description and returns
a closed, proven DSL; (2) an MCP endpoint that ingests digest streams
and emits a bounded set of semantic classification tasks whose answers
collapse mechanically into a coherent ontology.

## The two verdicts, up front

DSL vision: the MECHANICS ARE SOLVED — constrained decoding is
production-grade (Outlines FSM indexing, arXiv 2307.09702; grammar
prompting, NeurIPS 2023), tooling-derivation-from-declaration is
twenty years old and shipped (Spoofax, OOPSLA 2010; Racket #lang, CACM
2018), translation validation makes an untrusted LLM synthesizer
acceptable (Jourdan–Pottier–Leroy, ESOP 2012), and Dhall proves a
closed, hash-identified, total language ships. The irreducible open
part is the semantic gap (does the induced grammar mean what the
description said) — the field's nearest cousin, Doc2Spec (arXiv
2602.04892, Jan 2026), explicitly claims no formal guarantees; state
it as a limitation, never engineer it away.

Ontology vision: the coordinator's FCA hunch adjudicated two-thirds
right. Attribute exploration (Ganter & Obiedkov, Conceptual
Exploration, Springer 2016; Duquenne–Guigues 1986) IS the bounded-task
engine — the canonical basis is complete, non-redundant, and
minimum-cardinality; the collapse is a mechanical closure yielding a
complete lattice. The corrections: bounded ≠ small (basis can be
exponential; next-question is coNP-complete — Babin & Kuznetsov, CLA
2010), and FCA does not supply the attributes (conceptual scaling is
the unsolved input side).

## The shared architecture (both endpoints are one pattern)

Symbolic layer bounds the questions and owns coherence; the LLM
answers only atoms it is good at; a small proved certifier admits
results; the journal makes every output RECOMPUTABLE. The
positioning sentence: the field's best current word is "grounded";
ours is "recomputable" — strictly stronger, strictly checkable.

And the inversion that is ours to claim (DSL side): Gold 1967 proves
grammar learning from positive examples alone is impossible; Angluin's
L* (Inf. & Comp. 1987) escapes via a minimally adequate teacher that
answers membership queries and returns counterexamples. The 2024–26
literature (L*LM arXiv 2402.07051; probabilistic MATs 2408.02999)
spends LLMs to APPROXIMATE a teacher and hits oracle hallucination.
foldlab BUILDS the teacher: the daemon is total, deterministic, and
refusal-emitting — a refusal carrying (path, legal alternatives,
example) is a counterexample plus an equivalence hint, strictly
stronger than the MAT contract. Theorem to write: "the concierge is a
minimally adequate teacher for flb.type.v0." Corollary for the ledger:
positive-example-only authoring is unlearnable (Gold), so the endpoint
must never accept description-in/DSL-out without a refusal round-trip.
Ontology side twin (not in the FCA literature; ours): exploration's
two answer types map onto the evidence/decisions sort — a
counterexample is monotone evidence (grow-only journal, plain-check
admissible); an accepted implication is an absence claim that can rot
and routes through the effector's CAS. The ontology is a recomputable
fold over an append-only question-answer journal, converging from
above.

## Ratifications these findings force (grill before building)

1. Normalize-then-digest (Dhall's semantic integrity check,
   https://docs.dhall-lang.org/discussions/Safety-guarantees.html):
   digest = SHA-256(canonical(normalize(term))), normalize = identity
   today, specified reduction once v0 grows binders/aliases/imports —
   decide BEFORE binders arrive or semantically identical grammars
   fork digests. α-normalization: bound-variable names are
   annotations (law 5 generalized to binders).
2. The closure law (TATA,
   https://www.eecs.harvard.edu/~shieber/Projects/Transducers/Papers/comon-tata.pdf):
   every node kind admitted to flb.type.v0 must preserve regularity of
   the induced tree language, argued in the node's spec. Buys
   decidable emptiness, membership, inclusion — legality, liveness,
   and inter-agent subsumption as tree-automaton questions.
3. The prefix property as the concierge's law (type-constrained
   generation, PLDI 2025, arXiv 2504.09246; Hazelnut, POPL 2017,
   arXiv 1607.04180): every offered fill admits a closed completion —
   never a dead end discovered six steps later. Discharge as
   tree-automaton emptiness per transition; property-test as
   random-walks-never-dead-end. Hazelnut supplies the two theorems the
   concierge owes: SENSIBILITY (every reachable state well-formed —
   so every intermediate state has a digest) and CONSTRUCTION
   REACHABILITY (every closed term reachable from the empty hole).
   Reconsider opaque as a TYPED hole so half-built grammars are
   content-addressable and shareable by digest.
4. The certifier as the only path to the catalog
   (translation-validation, Jourdan–Pottier–Leroy ESOP 2012): LLM
   (untrusted) → certify(bytes) → Certificate | Refusal (proved, Go,
   small) → catalog. Publish the trusted-base line count. This is
   no-asserted-identity generalized from digests to every claimed
   property.
5. The scale as a cataloged type (flb.scale.v0: ordered predicate
   digests over canonical structure): every ontology carries (scale
   digest, exploration-journal head, lattice digest) — the anchor
   triple one level up. Exploration budget in the contract:
   max_questions + basis-kind (canonical | proper_premises | d_basis),
   overflow = typed refusal carrying the still-sound partial basis and
   resume journal head.
6. Target fragment as declared data (exact learning, Konev–Lutz–
   Ozaki–Wolter JMLR 2018): DL-Lite/OWL-2-RL-shaped targets are
   polynomially learnable, EL is NOT; the endpoint needs exactly two
   task verbs — membership and equivalence (neither alone suffices).
7. Ontology merge law (Goguen institutions,
   https://cseweb.ucsd.edu/~goguen/pps/ifi04.pdf): merge admitted only
   as (alignment span digest, colimit digest) — span is a decision
   (effector), colimit is recomputed evidence. Identical shape to the
   merge-fact rule.

## Imports (adopt)

- GF's vocabulary and law (Ranta, Computational Linguistics 46(2),
  2020): flb.type.v0 is an ABSTRACT SYNTAX; every derived surface
  (Encoded, JSON Schema, Go twin, GBNF, tool schema, span preview) is
  a CONCRETE SYNTAX; one generated wall covers all of them:
  parse_C(linearize_C(v)) digest-equals v.
- Frontier as derived artifact: compile the declared grammar to a tree
  automaton; frontier(hole) = successor-state set — derived, not
  hand-written. `grammar.subsumes(A, B)` as an MCP verb (automaton
  inclusion) = inter-agent DSL trust.
- GBNF/FSM index as a semantic fold served by digest: any agent
  runtime (llama.cpp, Outlines, XGrammar) pins to a foldlab DSL by
  hash. Ledger note (Grammar-Aligned Decoding, NeurIPS 2024): masked
  decoding distorts the model's conditional distribution — validity
  is a syntactic claim, never semantic; GAD is the ratified fix if
  measurement shows the bias matters.
- Witness tier (FlashMeta, OOPSLA 2015): declared, serializable
  inverse semantics per step (anonymous witnesses refuse identity);
  synthesize(grammar, examples) becomes one more semantic fold with a
  by-construction correctness law.
- SemGuS (POPL 2021, arXiv 2008.09836) as interchange: derived
  encoding per cataloged grammar; UNREALIZABILITY as a first-class
  refusal kind — "no grammar in this universe satisfies your
  description, with proof" is the refusal discipline lifted to whole
  languages.
- Pattern structures (Ganter & Kuznetsov, ICCS 2001): digests enter
  FCA as objects with descriptions ordered by anti-unification — the
  meet is a declared commutative idempotent monoid (the fold
  algebra's own object); projections are the declared precision dial,
  digested into the certificate.
- Swoosh ICAR (VLDB J 2009): wall-test idempotence/commutativity/
  associativity of declared merges; ICAR types get order-independent
  entity anchors — the monotone result applied a second time.
- Uncertainty gating + eval shape (LLM-as-oracle alignment, EACL 2026;
  OAEI-LLM benchmarks): never ask the agent what closure already
  settles; measure and publish answer error rates per task kind.
- Spoofax's separation for the output bundle: syntax / static
  semantics / transformation as separately digested components, so
  certification and subsumption decompose. Doc2Spec is the
  related-work baseline: same pipeline, minus certifier, identity,
  and law suites.

## No-LLM experiments (cheap de-risking, codex-shaped)

1. Snelting & Tip (TOPLAS 22(3), 2000) verbatim on our own catalog +
   journal usage relations: types × (appears-in-span, consumed-by-
   program, carries-check) → provably behavior-equivalent minimal
   hierarchy. The vision's empirical floor, zero LLM calls.
2. Background-knowledge pruning (Baader–Ganter–Sertkaya–Sattler,
   IJCAI 2007): feed declared checks/commutativity classes into
   exploration as background implications; measure questions removed —
   the quantified "rigor pays" number.
3. Fallible-oracle test: same exploration question, three shuffled
   presentations, measure agent disagreement. Decides whether a
   consistency protocol precedes any architecture.
4. Exploration journal round-trip: journal every Q/A as records
   against flb.exploration.v0; recompute the lattice from the journal
   alone; digest must equal the live computation. "Ontology as a
   recomputable fold" as a running artifact.

## Read-first stack

1. Hazelnut (POPL 2017) — the concierge's calculus and its two owed
   theorems; one afternoon rewrites the concierge spec.
2. Ganter & Obiedkov, Conceptual Exploration + Baader et al. IJCAI
   2007 — the theory, the nearest prior art, and the design document
   for the ontology endpoint, together.
3. Jourdan–Pottier–Leroy (ESOP 2012) — the certifier's trust
   architecture.
4. Konev–Lutz–Ozaki–Wolter (JMLR 2018) — which ontology fragment to
   target, decided by learnability.
5. Type-Constrained Code Generation (PLDI 2025) — the prefix property,
   generative direction.
