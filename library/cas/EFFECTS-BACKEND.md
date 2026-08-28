# EFFECTS-BACKEND — design basis for the store language and its TypeScript target

Status: pre-grade until grilled (the MACHINE-ALGEBRA precedent). Ratified
inputs: the grammar grill's six rulings (IMPLEMENTATION-PLAN §14) and the
operator's boundary ruling of 2026-08-28 (R7 below). Everything else here
is a design commitment awaiting its grilling pass. Paper citations are
G0-resolved pins in [.reference/catalog/PAPERS.md](../../.reference/catalog/PAPERS.md)
(digests recorded there); the reading record behind §R1–R5 is the
interaction-trees reconnaissance sweep
(`.staging/explore/itrees-capabilities.md`, exploration-grade).

## Thesis

CAS is an effects language. The store is the language: sorts are its data
types (the `.schema` sort landed 2026-08-28), signatures are its effects
(`Cas.Lang.Sig`, consumer-gated per grammar-grill ruling 5), programs are
its computation (`Cas.Lang.Prog` now; F3's defunctionalized code points
when that increment lands), and a run's history is a store word. The
"metaprogramming library" is this language's **backend**; Effect
TypeScript is its first compilation target — chosen because Effect is
itself an effects language embedded in TypeScript, so the compilation is
effects-language → effects-language and the mapping is structural:
signature → service, operation → method, program → `Effect.gen` value,
interpreter → `Layer`, tagged failure → the error channel, run history →
the store word.

## Carrier rulings, each pinned to its prior art

**R1 — The program carrier is inductive, and that is the honest Lean
choice, not a compromise.** `Prog S A` is a finite interaction tree:
`pure` or one visible operation with the continuation as a function of
the answer — the `Ret`/`Vis` fragment of Xia et al.'s interaction trees
(*Interaction Trees*, POPL 2020, doi:10.1145/3371119, pinned), without
`Tau` because Lean 4 has no native coinductive types. The sweep's finding
stands as the ruling's justification: the one Coq-faithful Lean port is
dormant with `interp` unimplementable, and the serious Lean design
(*HITrees*, arXiv:2510.14558, pinned) answers by abandoning coinduction
for an inductive carrier plus a big-step relation — exactly the
`Prog` + fueled-`run` shape the F1 theorem already proves over.
Divergence enters, when it must, as fuel exhaustion (`Status.running`),
never as a coinductive citizen.

**R2 — Signatures are data and compose by sum.** `Sig` (operations with
answer types) is ITrees' event-signature discipline (`E : Type → Type`,
composition `E +' F` with `Subevent` injection); our `⊕ₛ` and
`Prog.inl`/`inr` are the same algebra. Extension stays consumer-gated
(grammar-grill ruling 5): a signature enters only with a real consumer.

**R3 — A handler is a monad morphism into a target that can iterate.**
ITrees' `interp` is defined by `iter`, requiring `MonadIter` of the
target — "you can interpret into anything that can loop." Effect is such
a target by construction. The backend's compilation of interpreters is
this theorem-shaped statement made code: a Lean handler for `Sig`
becomes a `Layer` realizing the corresponding service, and `interp`'s
monad-morphism laws are the correctness obligations the target
inherits.

**R4 — Identity hashes presentations, never denotations.** The sweep's
load-bearing survey: every production content-addressing system
(Unison's name-erased AST hash documented as syntax-only; Git; Nix;
hash-consing) identifies artifacts by a structural, decidable,
near-linear quotient, and semantic equivalence is undecidable
immediately above finite state (weak bisimilarity on Petri nets is
hyperarithmetical; general ITrees have no finite presentation to hash).
The field's frontier is α-equivalence and it took PLDI papers (Maziarz
et al. 2021, doi:10.1145/3453483.3454088; Blaauwbroek–Olšák–Geuvers
2024, doi:10.1145/3656459 — bisimulation hashing on *finite
presentations*, both pinned). Our position is more conservative than
the frontier and cheaper than Unison's: F3's defunctionalized code
points carry **no binder metatheory** (grammar-grill ruling 4), so
program identity is canonical-spelling structural identity — the same
discipline the schema plane just proved (`encode_canonical`,
`payload_renderPlain`), below even α. If binders ever enter, Blaauwbroek
et al. is the named template, not an unknown.

**R5 — Equivalence is a certificate; the conformance gate is word
equality.** Since semantic equivalence cannot be identity (R4), it
enters only as a named, separately-checkable claim — the sweep's
"certify, don't hash" shape, with Jasmin's use of equivalence-up-to-tau
as compiler correctness cited as the production precedent. The
backend's decidable stand-in is stronger than it first looks: because
nondeterminism enters only as recorded content (grammar-grill ruling
5), a run is deterministic given its inputs, and **the run's history is
a store word — so cross-host conformance is byte-decidable word
equality**, not bisimulation. The program-vector gate (slice 2) is
exactly this: one program, the Lean interpreter and the generated
Effect runtime, identical words or red.

**R6 — The backend is four layers, and the printer is a subsystem.**
L0 denotation (the language), L1 target semantics (the Effect surface
as typed data, grounded in the pinned v4 idioms — `Effect.Effect<A, E>`
with trailing-`never` elision, `Layer.Layer<ROut, E, RIn>`,
`Context.Service` classes — the [EFFECT-SURFACE](../../.reference/catalog/EFFECT-SURFACE.md)
keyword catalog and the Stage-1 extract inventory as its drift gate),
L2 a closed TypeScript fragment grown consumer-gated, L3 rendering
under the ratified Substance/Denotation/Style split with `Style` as
digested content from the first slice. Printer obligations follow the
sweep's Hook E finding (formatter idempotence: real open gap, finite,
decidable, directly load-bearing): `render` idempotence and parse-back,
with the admitted lean4-tree-sitter twin as the style-blind structural
falsifier — generator and extractor as each other's check, never
self-comparison.

**R7 — Programs are content; hosts are code** (operator-ratified
2026-08-28). The backend generates interpreters, services, layers, and
typed surfaces — host machinery. Programs stay store-resident, loaded
by address; any static projection generated for ergonomics is stamped
with the address of the term it projects, so parity is a digest check
(the served-equals-derived wall). If generated TypeScript ever becomes
the authoritative home of a program, the language has been lost to an
ordinary compiler.

**R8 — The first five by hand; the rest of the surface ingested
mechanically** (operator-directed 2026-08-28). The hand-written
target-semantics rows are exactly the seed judged against the pinned
sources (`Cas/Backend/Target.lean`: `Effect.Effect`, `Layer.Layer`,
`Schema.Codec`, `Schema.Top`, `Option.Option`, plus the operation
arrow — every render `rfl`-pinned to a verbatim source line). Every
further row arrives GENERATED: the Stage-1 extract instruments (the
TypeScript-compiler-API / lean4-tree-sitter pair, already admitted and
cross-checked) walk the pinned Effect sources module by module
([EFFECT-SURFACE](../../.reference/catalog/EFFECT-SURFACE.md) is the
module census), emit an inventory, and a Stage-2-style generator emits
Lean target rows under the byte-identity gate — no hand-transcribed
API surface beyond the seed, and version drift is a red gate. The
pipeline is packaged as a repo skill so ingestion is one invocation.
L1 v1's admission list is the evidence-derived usage table of
2026-08-28 (the constructs `library/effects/src` actually exercises).

**R9 — MCP is a backend target, generated from the same signatures**
(operator-directed 2026-08-28; AE-8 named `mcp` as a projection
register from the start). An MCP tool IS an operation: name, params,
result — `OperationSig`'s arrow with canonical schema codes projected
to JSON Schema (the plane's sanctioned export projection) for the
wire. The MCP server the lab's agents use is therefore a GENERATED
host, subject to R7 exactly like the TS target: tools materialize
signatures, programs stay store-resident, and the served surface is a
projection of the same denotation the TS services and the prose docs
project — parity by digest, never by review. This target is cheaper
than the TS one (no syntax fragment; tools are data) and lands right
after slice 2's semantics gate.

**R10 — Semantic stratification: one syntax, every semantics a
handler, one observation** (operator-pressed 2026-08-28; carrier
`Cas/Lang/Handler.lean`). The account of what the several interfaces
MEAN, stated once: `Prog S` is syntax and means nothing; a semantics
is a `Handler S M` — one meaning per operation in a target monad —
and `interpret` is the induced monad morphism (`interpret_bind`
proved once, for every handler). The strata:

- **Meaning** lives in exactly one place: the reference handler —
  Lean's admission judgment in `StateT Word (Except Refusal)`, total
  because the carrier is finite. "The pure interface is better" is
  correct in this precise sense: it is not a better interface, it IS
  the semantics.
- **Realizations** (the Effect adapter, direct TS callers, any future
  host) are handlers into richer monads; fibers, interruption,
  latency, and retries are the target monad's contribution, never the
  language's. A realization is never a bearer of meaning: it is
  CLAIMED against the reference by observational agreement, and the
  observation is the WORD — decidable, byte-level, deliberately
  quotienting everything the seam adds that the history does not
  record.
- **Transports** (CLI, daemon, HTTP) are handler composition: a
  signature translation into a wire language plus a remote handler.
  A Lean program calling the CLI calling a store is the SAME program
  with the SAME meaning, interpreted through a composed stack whose
  every seam is named — modeled differently on purpose, because
  claims and trust attach at seams; meaning does not move.
- **Seam effects get signatures.** Transport failure, cancellation,
  backpressure, progress are operations of their own signature summed
  in (`⊕ₛ`, `Handler.sum`), never smuggled through request/reply.
- Replay and record are handlers too: replay answers from the
  recorded word (the oracle-from-content direction), record is the
  writer direction — the record/replay plane is two instances of one
  notion, not separate machinery.
- Finite syntax interprets into ANY monad; ITrees' `MonadIter`
  obligation returns exactly when F3 adds loops. The
  big-step/small-step agreement (`interpretRef` vs the fueled `run`)
  is a named obligation of the F3 increment.

**R11 — One described manifest owns the protocol; both language
surfaces are generated from it** (operator-directed 2026-08-28).
Canonical semantics: Lean owns the operation model and admission
meaning (R10). Canonical interchange: a versioned, language-neutral
manifest — commands, replies, errors, constraints, byte encoding —
authored as canonical schema codes and a wire signature, from which
`Protocol.lean` and `Protocol.ts` (and the shared protocol vectors)
are generated or mechanically checked, never written twice. The
production Effect implementation executes operations as an ADAPTER,
never as the semantic oracle. The CLI is the first transport adapter;
a daemon or HTTP transport implements the same interface without
touching the program layer. Native TypeScript callers keep using
`CasStore`/`Layer` directly — the operation language is the canonical
CROSS-language pattern, not a toll on local calls.

## Slices

1. **The generated mirror** — LANDED 2026-08-28: the six
   canonical-schema mirrors of the vector wire format are generated
   (`Cas/Backend/Ts.lean` fragment + fixed-layout printer with
   `Style.house0`, `EmitAst.lean` lowering with structural sharing,
   `lake exe emitwire` under the byte-identity gate in `check:cas`);
   `ConformanceVector.ts` re-exports them, its public surface
   unchanged, and the pin suite now compares GENERATED values against
   the Lean fixtures — the drift tripwire derived on both sides,
   generator correctness by independent evaluation.
2. **The language's hello world** — LANDED 2026-08-28: every
   registered grammar term (the six vector trees, schema node
   included) lowers to a straight-line Effect program
   (`Cas/Backend/EmitProg.lean`, `lake exe emitprograms`,
   byte-identity-gated) that re-performs its puts against the live TS
   store, addresses computed by the host's own digest; the
   VectorPrograms suite asserts the answered addresses equal the
   Lean-computed word binding for binding, duplicates included — R5's
   cross-host run gate, real and green. The store language executes on
   its second host.
3. **F3** — code points and step/cont sorts; programs become
   store-resident content and the R7 boundary becomes load-bearing.
4. **Surface ingestion** (R8) — the extract→generate pipeline pointed
   at the whole pinned Effect surface, skill-packaged.
5. **The MCP host** (R9) — tools generated from signatures; the
   lab's agents drive the store language through it.
6. **A domain signature** (operator-directed) — one real domain type
   through the whole pipe (cas_struct → schema node → generated
   carrier → a program over a domain signature → program vector), so
   the semantics exploration runs on something worth staring at. Once
   the semantics gate holds, the exploration mandate is explicit:
   go wild.

## Named follow-ups

- The grilling pass that ratifies R1–R6 (R7 already ratified) and this
  document's promotion out of pre-grade.
- GITrees (arXiv:2307.08514, pinned) as the study source when modular
  higher-order effects pressure R2's first-order signature discipline.
- The Blaauwbroek/Unison comparison question the sweep left open
  (name-erased hashing vs context-sensitive α: agree, disagree,
  incomparable?) — becomes live only if binders enter.
