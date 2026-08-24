# Foldlab Charter

Status: draft, 2026-08-24. Amended through domain-modeling and grilling
sessions.

*A rising abstraction lifts all monads.*

## Thesis

LLMs plus automated verification are collapsing the cost of verifiable,
content-addressed software artifacts. As that cost falls, advantage accrues to
whoever coalesces the linkages — canonical forms, projections, contracts, and
the tooling between them — that let more advanced abstractions be built and
trusted. Foldlab builds at that altitude.

The driver: agentic AI produces and consumes code, contracts, and conversations
faster than humans can inspect at the object level. Control and touch survive
only by operating higher: author whole interactions, derive the parts. Types
that abstract entire interactions are the instrument of that control.

The wager: marrying Lean (referee) with an Effect implementation in TypeScript
(substrate) works — and leads the coming wave of unifying abstractions built on
accessible, open, anti-gatekeeping functional programming and algebraic type
modeling.

## Philosophy

The estate's organizing philosophy is denotational (Xia 2022, after Scott and
Strachey), and it governs project organization, definitional precision, and
tooling choice alike:

- **Compositionality** — the meaning of a whole is composed from the meanings
  of its parts, through the operators of the underlying semantic domain
  (lattices, categories, monads). Every module, project, and document is
  organized so its meaning is a function of its parts' meanings.
- **Abstraction** — the act of suppressing irrelevant complexity. A semantics,
  an interface, or a document exposes only the behavior relevant to its
  clients and hides the mechanism.

The lab also **borrows openly, with credit**: code, abstractions, and ideas
are taken from the open ecosystem, attributed, and built upon — our part in
building up the abstraction wave. It is also how learning happens here, for
operator and agents alike.

## Programme

### Descriptive tower

Each layer reifies the one below it as a first-class object.

| Layer | Object | Role |
|---|---|---|
| L0 | Host execution (JavaScript engine, pinned) | evidence only |
| L1 | Effectful computation: the Effect value as local carrier | substrate |
| L2 | Description in the small: Schema as codec, refinement, effectful operator, and reified AST | substrate |
| L3 | Interaction: sessions, global types, projection, topology | target |
| L4 | Meta-interaction: protocols of protocols — negotiation, versioning, evolution of L3 objects | target |
| L5 | Ontology: vocabularies and kind systems as objects; canonicalization and growth | target |

Effect is a brilliant substrate and deliberately below the lab's target
altitude: studied to stand on, not to stop at.

### Principles

- **P1 — Global is not derivable from local.** A many-roled asynchronous system
  has global coordination structure — topology and causal order — that is
  erased by projection onto any endpoint. No equivalence on endpoint
  computations recovers it. L3 exists as its own semantic object.
- **P2 — Reflective closure.** Every admitted layer of description is
  representable, exchangeable, canonicalizable, and governable one layer up.
- **P3 — Verification-achievability.** Verification becomes achievable because
  of altitude: the authored global object is small, declarative, and
  canonicalizable, and projection theorems transport its verification to every
  derived local artifact. **P3 is the central abstraction; the lab builds on it
  first.**
- **P4 — Human semantic layer.** Every artifact admits a human semantic
  projection: a plain-language rendering of what it is, what it claims, and
  what tools produced it — derived from the artifact the way the Lean
  elaborator's output is derived from source, never hand-maintained beside it.
  Legibility is an architectural property of the estate, not a documentation
  chore.

### Tooling stance

- **Author above the protocol level; derive below it.** Primary artifacts are
  global descriptions held as first-class TypeScript values. Local Effect and
  Schema artifacts are obtained by projection, not hand-written against prose.
- **Projection** (global → local): obligation is the endpoint-projection
  theorem shape — projections jointly realize the global scenario. Proved once
  in the model; inherited by every projected artifact.
- **Lift** (local → global): existing Effect and Schema artifacts embed upward
  with no loss of validity — established judgments survive the lift, and
  projecting a lifted artifact returns it up to the layer's equivalence.
  Characterizing the liftable subset is lab research.
- **LLM-harnessed verification.** Practical verification tooling is built by
  harnessing low-cost LLMs against machine-checkable gates. The gates carry the
  trust, never the models.
- **Role split.** TypeScript and JavaScript host the authoring surface and the
  runtime. Lean referees every law the tooling claims — and is never the
  runtime.

### Discipline ladder

Ground-up, cooperative development:

1. **H1** — describe the local carrier (L1): the Effect core type, its
   variance, its combinator algebra, its ecosystem role.
2. **H2** — the contract object in the small (L2): Schema's four roles. A codec
   is the smallest instance of the projection pattern — one description, two
   views (Type and Encoded), coherence laws. Artifact kinds are minted here.
3. **H3** — scale the contract object to many roles, asynchrony, and topology
   (L3 and above).

Each rung is practice for the next.

## References

Subjects and semantic references:

- Li-yao Xia, *Executable Denotational Semantics with Interaction Trees*, PhD
  dissertation, University of Pennsylvania, 2022 — the local carrier:
  free-monad computation trees, termination-sensitive weak bisimulation,
  interpretation by handlers.
- Kohei Honda, Nobuko Yoshida, Marco Carbone, *Multiparty Asynchronous Session
  Types*, J. ACM 63(1), 2016 — the global layer: global types, endpoint
  projection, communication safety, progress, session fidelity.
- Federico Carrone, *Concrete* (series: [Proving Systems Code in
  Lean](https://federicocarrone.com/series/concrete/proving-systems-code-in-lean/))
  — under study: a minimal systems language whose Core IR is defined as Lean
  inductive types and serves as the semantic authority; proofs fingerprinted
  to code versions; the code you prove is the code you ship. The compiler-side
  counterpart of what this lab attempts library-side for Effect.

Inspirations:

- **Unison** ([unison-lang.org](https://www.unison-lang.org/)) — the existence
  proof that content-addressing works at the language level: definitions
  stored by hash in a database, names as metadata, code as shippable data,
  abilities for effects. Open, simple, rigorous roots betting on the same
  principles — its roadmap now targets agentic computing directly.
- **Lysxia study clones** (`.reference/clones/`, gitignored, shallow):
  InteractionTrees, profunctor-monad (bidirectional programming with monadic
  profunctors — closest prior art for the H2 codec thesis), system-F,
  first-class-families, coq-mtl.

External formalisms are evidence, never authority. The lab owns the
definitions appearing in its claims
([DEVELOPMENT-INVARIANTS.md](docs/DEVELOPMENT-INVARIANTS.md), I-004).

## Roadmap

Reference projects composed under `.reference/` reify the lab's themes and tie
into the **central bus of canonical abstractions** the verification wave is
producing — the shared spine of canonical forms, proofs, and linkages that
downstream projects plug into.

1. **Verification-kinds taxonomy** (immediate). Declare the different kinds of
   formal verification as lab vocabulary — what is proved, against what
   semantics, with what trust surface. Education-facing: written for
   newcomers. (Concrete's proved/assumed/trusted/incomplete split and our
   claim gates G0–G6 are the starting inputs; the two are orthogonal axes —
   strength of belief versus layer of claim.)
2. **Repo self-model** (first build after the tooling grill and a clean dev
   setup). Type-model the Foldlab repository itself in Lean 4: the grade
   lattice, artifact kinds, contexts, and transformations as types — the lab
   as its own first subject (P2 applied to the estate). Candidate
   GitHub-facing color.
3. **R1 — Effect TS as artifact.** Begin the formal description of Effect TS
   as an artifact (H1). "Artifact" is provisionally adopted as the term of
   art; its definition entry is owed at domain modeling.
4. **R2 — Concrete study, then a verified build.** Learn Concrete end to end;
   then design and build something verifiably correct in a stated, significant
   sense. Open research-pass question: composing verified Concrete tools into
   machine-level pipelines with codec-typed boundaries (inputs: Haskell
   [codec](https://hackage.haskell.org/package/codec), Xia's
   profunctor-monad, Effect Schema v4
   [toCodecJson](https://www.effect.website/docs/v4/api/effect/Schema#toCodecJson-interface)
   — a verified-tool pipeline is a small instance of projection).

Sequencing: grill project tooling first, then research passes, then lay out
the projects. Coq/Linux tooling setup is tabled pending that grill.
