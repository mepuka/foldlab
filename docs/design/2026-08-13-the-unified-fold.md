# The unified fold: one catamorphism, four consumers

Author: expressive-power team (Opus), 2026-08-13, isolated worktree. The
theoretical capstone of the dossier→design→map arc. **Discipline: every
category-theory claim traces to a concrete repo instance or is labelled
ASPIRATIONAL** — the mint-rollback lesson is that abstraction without a consumer
gets deleted (NEXT.md). rc.108-confirmed where it touches Effect (`file:line`
into `repos/effect/`); literature named where reached. No machinery — prose and
signatures. Consumer-gated to tickets 004 (owned schema encoding), 014 (fold
algebra), 015 (grammar foundry), 016 (ontology explorer). Labels: **SHIPPED**
(walled/tested), **RATIFIED-UNBUILT**, **ASPIRATIONAL**.

The repo already states its own thesis; this doc makes it rigorous. README ("Why
foldlab"): "a fold over structure (a value's parts) and a fold over time (an
identity's events) are the same catamorphism. An entity is the fold of one
correlation key's events; composition is a fold of child anchors; a schema's
identity is a fold over its AST; code generation is a semantic fold over that
same AST." CONTEXT.md ("the two folds"): identity fold (chain head) and meaning
fold (state). The claim of this doc: **those are not analogies — they are one
structure (the catamorphism, the unique fold out of an initial algebra —
Bird–Meertens / recursion-schemes) instantiated at different algebras**, and
that identity is what makes agent codegen, multiagent communication, local DSLs,
streaming, and aggregation the *same* recomputable machine.

---

## Part 1 — The unified abstraction: everything is one catamorphism

A **catamorphism** is the unique homomorphism out of an *initial algebra*: given
a functor `F`, its initial algebra `μF` has the property that for any `F`-algebra
`(A, α : F A → A)` there is exactly one map `⦇α⦈ : μF → A` respecting the
structure. "Everything is a left fold" is the claim that foldlab's four identity
mechanisms are all `⦇α⦈` for one shape and different `α`. The **uniqueness** is
load-bearing everywhere below — it is what makes a derived artifact a function of
its input alone, hence recomputable and drift-free.

### 1.1 Three faces, one structure

**Face A — ADT as an initial algebra of a polynomial functor.** `algebra.ts`'s
`AlgebraSpec` *is* a polynomial-functor grammar: sums (the primitive `op`s),
products (`op:"product"` over `of: ReadonlyArray<AlgebraSpec>`), and mapped nodes
(`op:"mapped"` with a `hom`) — `algebra.ts:52-65`. A declared algebra is an
`F`-algebra; `product(...)` is the product functor's algebra assembled
componentwise (`algebra.ts:245-284`), and the fold over a *value's parts* is the
unique algebra hom out of the term. The **structural digest** is exactly this
catamorphism made canonical: "a schema's identity is SHA-256 over ... a canonical
structure, produced by an exhaustive fold of the authoring AST" (CONTEXT.md
"Structural digest"; ticket 004). **Label: the declared-algebra fold is SHIPPED
(`algebra.ts`, walled by `foldLaws.ts`); the AST-fold structural digest is
RATIFIED-UNBUILT (ticket 004) — today's identity is the byte-coarse
`bytes-sha256-v1` (SHIPPED, `proto/wire/CONTRACT.md:176`), and that gap is the
honest edge (§1.3).**

**Face B — the Merkle hash tree IS the same catamorphism, into the
"canonicalize-then-SHA-256" algebra.** Hashing is not adjacent to folding; it is
a fold. The chain head is `headFrom(base, events) = events.reduce(extend, base)`
with `extend(h, e) = SHA-256(h ‖ enc(e))` (`stream.ts:112-116`) — a left fold
(catamorphism over the list functor / free monoid) whose carrier is the 32-byte
head and whose algebra is `(seed, extend)`. The structural digest folds a *tree*
into the same hashing algebra over canonical bytes (`jcs.encodeJsonValue`,
`jcs.ts:108`; a value's digest is a fold over its JSON structure). So **the chain
head and the structural digest are the identity catamorphism at the hashing
algebra** — one over a list of events, one over an AST, the same `⦇α⦈`. **Label:
SHIPPED (the value/stream/JCS walls; `stream.ts`, `jcs.ts`).**

**Face C — the free monoid as the event-stream case.** `X*` is the free monoid on
the set of events; the time-fold is the **unique monoid homomorphism** `ĝ : X* →
M` extending the declared step `g : X → M` (`fold.ts:60-88`, `defineFold`; the
fundamental theorem, grounded in the dossier §1.1; mathlib `FreeMonoid.lift`).
Two corollaries of *unique*: **uniqueness ⟹ the invalidation-free cache** (a memo
keyed on `(fold digest, head)` cannot go stale — `foldCache.ts:50-51`, "no
invalidation state exists"); **homomorphism ⟹ parallel/incremental replay**
(`ĝ(u·v)=ĝ(u)⊕ĝ(v)`, the third-homomorphism split walled in `foldLaws.ts:137-154`).
**Label: SHIPPED per-instance at R1 (`foldLaws.ts`); the universal property is an
argument toward R5 (mathlib), not a mechanized claim (dossier §1.1).**

### 1.2 The unification: two catamorphisms over one shape

The identity fold (Face B, the head) and the meaning fold (the state) are the
**same catamorphism over the same initial object — the list of events / `X*` —
instantiated at two different algebras**: the hashing algebra `(seed, extend)` →
`Digest`, and the meaning monoid `(empty, combine)` → `M`. In `stream.ts` this is
literal: `headFrom` folds with `extend` (`:115`), `foldKV`/`stateDigest` fold with
`applyKV` (`:229-272`) — one event list, two folds, and the compaction law
preserves **both** across a discarded prefix (`:296-310`).

Now state "the chain remembers what the fold forgives" (README) precisely. The
identity hom `head : X* → Digest` is **injective** (modulo SHA-256 collision
resistance — VERIFICATION.md standing assumption 1): it distinguishes every
distinct history. The meaning hom `ĝ : X* → M` is generally **lossy**: histories
`u, v` with `ĝ(u) = ĝ(v)` are identified. The information the chain *remembers*
that the fold *forgives* is exactly **`ker(ĝ)`** — the congruence `ĝ` collapses
but `head` keeps apart (CONTEXT.md: "Two histories can agree in state while
differing in head"). Categorically this is the codata→data crossing: the
canonical map `μF → νF` and commitment as its section (resonances headline 3;
Freyd, "Algebraically Complete Categories" 1991; Rutten, "Universal coalgebra"
TCS 2000 — "the chain remembers what the fold forgives" is the kernel of the
minimization map into the final coalgebra). **Label: SHIPPED (both folds
walled); the kernel/minimization framing is the external theory naming the repo's
own construction (argument, not a mechanized claim).**

### 1.3 The honest edge of Part 1

The unification is real for the *walled* mechanisms (Faces B and C, and the
declared-algebra fold of Face A). It is **ASPIRATIONAL for the semantic laws of
ticket 004**: today the schema identity is a digest over submitted canonical
bytes (`bytes-sha256-v1`, SHIPPED), *not* the exhaustive AST-fold that would make
two semantically identical schemas share identity. And the AST catamorphism is
**underdefined on recursion** — a fold does not terminate on a cyclic AST, safe
today only because refs-must-resolve forces a DAG (dossier §4; Unison cycle rule
owed). The uniqueness that licenses everything downstream is, at the meta level,
a universal-property *argument* toward R5, not a machine-checked theorem
(dossier §1.1). Everything in Parts 2–4 inherits exactly this labelling.

---

## Part 2 — Agent-first, byte-guaranteed type/codegen

Part 1 makes agent codegen **recomputable**: because every derived surface is a
catamorphism over a digest-anchored input, it is a function of that input alone
and cannot drift.

### 2.1 The type as a cataloged value; the certifier as the one lawful fold

A type/grammar is a value in `flb.type.v0`, cataloged by its structural digest —
a fold over its AST (§1.1 Face A). The **certifier** is the single lawful
admission point: `certify(bytes) → Certificate | Refusal` (CONTEXT.md
"Certifier"), a fold that discharges well-formedness, identity, and whatever
closure laws the grammar declares — "no asserted identity generalized from
digests to every claimed property" (language-ontology frontier, ratification 4;
Jourdan–Pottier–Leroy translation-validation, ESOP 2012, is the trust
architecture: an untrusted LLM synthesizes, a small proved certifier admits).
**Label: the interim certifier is SHIPPED in `proto/` (W-laws, canonical-or-
refused); the closure-law fold that makes admission a regularity-preserving
catamorphism is ASPIRATIONAL (ticket 015 deliverable 1; TATA closure law).**

### 2.2 Codegen as the semantic fold — one input, many drift-free surfaces

Every derived surface is a **semantic fold** over the digest-anchored AST:
GBNF/FSM, JSON Schema, the Go twin, codecs. Each is a catamorphism, and each
"cannot drift because its input has committed identity" (ADR-0006; CONTEXT.md
"Semantic fold"). This is Part 1's uniqueness cashed in: the unique `⦇α⦈` at each
target algebra. Concretely SHIPPED in `proto/ts/src/codegen.ts`:
`toEffectSchema(structure, resolve): Derived<Schema.Top>`, `toJsonSchema`,
`toGoSource` — three algebras, one AST fold. The GF reframing (Ranta, Comp.
Linguistics 46(2), 2020): `flb.type.v0` is an *abstract syntax*, every derived
surface a *concrete syntax*, and one generated wall covers all of them —
`parse_C(linearize_C(v))` digest-equals `v` (language-ontology frontier import).
**Label: `toEffectSchema`/`toJsonSchema`/`toGoSource` SHIPPED (proto); GBNF/FSM
derivation ASPIRATIONAL (ticket 015).**

### 2.3 Byte-guaranteed grammars — the hard-won property

Constrained decode + canonical bytes ⟹ a GBNF/FSM index **served by digest**: an
agent runtime (llama.cpp, Outlines, XGrammar) pins to a foldlab DSL by hash and
gets byte-level validity (language-ontology frontier import). "Byte-guaranteed"
is not free here — it is earned. The constrained-decode public seam
(`jcs.ts:341` `decodeJson`; CONTEXT.md "Constrained decode: acceptance is part of
identity — a decoder that repairs its input is naming a different value") admits
exactly one JSON value with a typed refusal otherwise (`NonCanonicalValue` /
`InvalidJson`, `jcs.ts:16-27`). And the number-determinism dossier
(`docs/research/2026-08-13-number-determinism-dossier.md`) shows how hard the
byte-level guarantee actually is: ECMA-262's minimal-`k` guideline
**underdetermines 45.8% of doubles**, and the exact ties (0.047%) rest on a
non-normative round-to-even clause; engines agree today only by a fragile
coincidence (V8's tie rule is an unresolved TODO; JSC silently swapped to
Dragonbox in Dec 2023). RFC 8785 canonicalization + a *constrained decoder* +
the JCS differential wall (VERIFICATION.md R1) are what close that latitude into
a byte-guarantee — a canonical *writer* is only half; a constrained *parser* is
as load-bearing (resonances D). **Label: constrained decode + JCS byte-equality
SHIPPED (R1 differential, independent RFC 8785 Appendix B oracle); the
GBNF/FSM-index-by-digest that consumes it is ASPIRATIONAL (ticket 015).**

### 2.4 Honest edges of Part 2 (these bound the claim precisely)

- **Gold unlearnability.** Positive-example-only grammar authoring is unlearnable
  in principle (Gold 1967; VERIFICATION.md stated limitations). Therefore the
  refusal round-trip — the concierge's teaching refusals (dossier P7, C1–C5) — is
  **load-bearing, not UX**: an NL→DSL endpoint that accepts description-in/DSL-out
  without a refusal round-trip is unsound. Angluin's L* escapes via a minimally
  adequate teacher, and the daemon *is* that teacher (language-ontology frontier).
- **GAD distortion.** Grammar-constrained decoding distorts the model's
  conditional distribution (Grammar-Aligned Decoding, NeurIPS 2024): forced
  validity is a **syntactic** claim, never semantic. Byte-guarantee ≠ meaning-
  guarantee.
- **The semantic gap.** Whether an *induced* grammar means what the description
  meant is irreducible; foldlab's claim is recomputability of what was built,
  never fidelity to intent (VERIFICATION.md; the field's word is "grounded," ours
  is "recomputable" — strictly stronger and strictly narrower).

---

## Part 3 — The four use cases (all one machine)

**Multiagent communication.** Cataloged types are the shared ontology reached by
**content address**, not a central registry: creation works offline and same-shape
races converge by content addressing, with union resolution across per-daemon
authorities (NEXT.md ownership model; CONTEXT.md "Catalog"). The protocol is the
three-verb writ (author a type, publish records, read journals — README) plus
**typed teaching refusals**: an agent that emits an ill-formed message is refused
with path, legal alternatives, and a worked example (W7/W8; `proto/ts/test/mcp.test.ts`
typo→self-repair). A message is a record against a cataloged type; its provenance
is a journal query (ADR-0005). The Part-2 byte-guarantee is the payoff: **agents
cannot emit invalid messages** — `certify` refuses at the boundary. **Label: the
tracer/concierge substrate is SHIPPED (`proto/`); the multiagent-ontology framing
is RATIFIED-UNBUILT (ticket 016 reuses the three-sort ontology for this).**

**Local DSLs with generated translation.** A DSL is a cataloged grammar (§2). A
translation between two DSLs is a **homomorphism / semantic fold** — GF-style
`parse ∘ linearize = id` reversibility (ticket 015 deliverable 4; §2.2). "Local"
means each agent or domain owns its DSL; translation is **derived and
recomputable, not hand-written**, so `grammar.subsumes(A, B)` (automaton
inclusion) becomes an inter-agent trust verb. This is Part 1's uniqueness again: a
translation is the unique fold at the target concrete syntax, walled by
reversibility. **Label: ASPIRATIONAL (ticket 015); the GF reversibility wall is
the licensing law, unbuilt.**

**Streaming.** The fold algebra directly: a stream folds twice (identity +
meaning, §1.2); transforms are per-event morphisms where dropping an event is a
return value, not an exception (`xform.ts:19` `Xform = (e) => StreamEvent | null`;
CONTEXT.md "Transform"); and **fusion** composes at one traversal with zero
intermediate streams (`xform.ts:21-30` `compose`; CONTEXT.md "Fusion"). The
transform wall witnesses batch TS, Effect `Stream`, and Go as one transform by a
single digest (`xformPipelineHead`; NEXT.md). **Label: SHIPPED (xform wall,
stream-bindings wall).**

**Aggregation.** A declared monoid with **proven associativity** ⟹
parallel/incremental replay, O(1) extension, and the invalidation-free cache
keyed on `(fold digest, head)` (`foldCache.ts`; `foldLaws.ts`). Aggregation over a
stream **is** the free-monoid fold of §1.1 Face C — the through-line straight back
to Part 1: an aggregate is `ĝ(history)`, the unique monoid hom, and its
cacheability and splittability are the two faces of uniqueness. **Label: SHIPPED
(`foldCache`, `foldLaws`); consumer-gated — its first real consumer is ticket 020
(the metric engine / `JournalMessageStorage` slice recommended in the workflow-
replay design), which retires the missing-consumer risk the dossier named.**

---

## Part 4 — The frontier (the honest cap)

Same seam discipline as the workflow map's "commitment, not placement." **The
inherited proof EXTENDS** wherever a derived artifact is a catamorphism over a
digest-anchored input: a generated grammar surface, a codec, a Go twin, a
translation between DSLs all inherit the source's committed identity, and cannot
drift, because the fold is a function of its input alone and the `parse∘linearize`
wall witnesses it (§2.2). **The inherited proof STOPS at the semantic gap:**
whether an *induced* grammar, ontology, or type means what the human description
meant is irreducible — no fold can recompute intent, only what was built. So
foldlab's claim across the whole unified machine is **recomputability of what was
built, never fidelity to intent** (VERIFICATION.md; GAD; Gold). That is the
capstone's honest boundary, exactly as "foldlab replaces commitment, not
placement" was for the cluster map and "the fold algebra has no non-test consumer
yet" was for the dossier: the one catamorphism unifies structure, hashing, time,
and derivation into a single recomputable fact — and stops, cleanly and
admittedly, at meaning.

---

## Appendix: grounding ledger

**Repo instances (SHIPPED unless noted):** `algebra.ts:52-65` (polynomial-functor
`AlgebraSpec`), `:245-284` (product algebra); `fold.ts:60-88` (`defineFold` =
free-monoid lift); `foldCache.ts:50-51` (no invalidation state); `foldLaws.ts:137-154`
(third-hom split); `stream.ts:112-116` (head catamorphism), `:229-272` (state
fold), `:296-310` (compaction preserves both); `jcs.ts:108` (canonical encode),
`:341` (constrained decode), `:16-27` (typed refusals); `xform.ts:19-30`
(transforms + fusion); `proto/ts/src/codegen.ts` (`toEffectSchema`/`toJsonSchema`/
`toGoSource`, SHIPPED); `proto/wire/CONTRACT.md:176` (`bytes-sha256-v1` interim
identity). **RATIFIED-UNBUILT / ASPIRATIONAL:** ticket 004 (AST-fold structural
digest), 014 (fold algebra consumer via 020), 015 (grammar foundry: certifier
closure law, GBNF/FSM by digest, GF translation), 016 (ontology / multiagent).
**rc.108 (Effect):** `codegen.toEffectSchema → Schema.Top`; Schema/Stream idioms
per the dossier appendix (`Stream.runFold` `Stream.ts:10482`, etc.).
**Literature:** Bird–Meertens / recursion schemes (catamorphism); mathlib
`FreeMonoid.lift` + Green–Karvounarakis–Tannen PODS 2007 (free-monoid universal
property, resonances C1); Freyd 1991 / Rutten TCS 2000 (μF→νF, the
remember/forgive kernel, resonances headline 3); Merkle (hash tree);
Jourdan–Pottier–Leroy ESOP 2012 (certifier trust); Ranta 2020 (GF abstract/
concrete syntax); Gold 1967 + Angluin L* 1987 (learnability / the teacher);
Grammar-Aligned Decoding, NeurIPS 2024 (distribution distortion). **Repo theory:**
README "Why foldlab" + "The theory in brief"; CONTEXT.md "the two folds",
"Structural digest", "Semantic fold", "Certifier", "Fusion";
`docs/research/2026-08-13-number-determinism-dossier.md` (byte-guarantee
latitude); `docs/research/2026-08-13-language-ontology-frontier.md`;
`docs/research/2026-08-13-literature-resonances.md`.
