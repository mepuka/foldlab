# Dynamic JIT typed schema verification — substrate survey

**Provenance: Opus 5 researcher, 2026-08-29, read-only over main at
`3713b345` (plus the named in-flight Stage 2 worktree). Blockers-first
by coordinator order. Research grade — findings and a staged proposal,
no implementation.**

The full report is preserved in the session record; this file carries
the load-bearing content for the lane.

## Headline finding — B8, the two doors disagree

A stored schema node that Lean's `ingest` refuses `illFormed` can
still materialize into a live TypeScript validator today. Lean's door
gates on `Ast.wf` (sorted fields, nonempty unions, payload discipline,
arity); the TS door (`Materialize.fromStore/fromPayload` →
`fromRepresentation`) runs no Lean gate — only Effect's shape decode
plus the reviver map. The allowlists are two different lists
(`DeclarationId.all` vs `Revivers`), and an unknown id THROWS rather
than refusing by name. No differential gate exists on this path.

## Blockers enumerated (23; the ones that lead)

- **B3 — recursion is absent entirely** (no Suspend/Reference/μ; door
  refuses `nonEmptyReferences` by name; deriving refuses recursive
  types). Most real-world runtime-acquired schemas are recursive. Any
  JIT-verification claim must state this on line one.
- **B4 — the float ceiling** (ruling 15).
- **B6 — no Lean-side JSON parser**: every Lean-side JIT story starts
  behind this wall (ruling 11; same slice as B7).
- **B7 — rev-1 rendering injectivity unproved**: "the node at this
  address IS this code" is a pin, not a fact.
- **B8 — above.**
- B1/B2 — `El` on `.decl` and undiscriminated `.union` stays `Empty`;
  Stage 2 discharges `unionEl` but mints `generalUnionEl` — overlapping
  `anyOf` is not verifiable in Lean and not scheduled to be.
- B5 — `Ast` has no `DecidableEq` (deriving refuses nested inductives
  at v4.33.1); R14 stratum-1's claim for `Ast` rides the byte pin.
- B13 — kernel string reduction walls at ~2k chars (measured): no
  `decide`/`rfl` over payload strings, ever.
- B14 — Lake does not track non-`.lean` inputs: `cas_from_store` as
  designed (elaboration-time store reads) is UNSAFE; generate committed
  `.lean` text instead.
- B15/B16 — `native_decide` mints per-computation axioms; runtime
  codegen is invisible to the axiom census (TCB relocation).
- B18/B19/B20 — R2 consumer gate blocks a `VerifySig`; F3 unlanded so
  store-resident verifiers are unbuildable; big-step/small-step
  agreement owed.
- B21 — two refusal taxonomies (`Refusal`, `IngestRefusal`); merging is
  a ruling.
- B22 — no pinned prior art for containers/W-types/Tarski universes/
  generic programming; the lane doc cannot cite its thesis until
  G0-resolved.
- B9/B10/B11/B12/B23 — Integer disagreement (ruling 3), TS rows gap
  (ruling 10, since landed), Literals-oneOf (ruling 13), source
  compile gate + missing estate register (17/18), annotation tag (9).

## The verdict on "a classic use"

Three things travel as "JIT": (i) Effect's compile-on-first-use
(`SchemaParser` memoized compilers — a staging JIT that runs TODAY
over revived schemas; genuinely partial evaluation, fast paths and
all); (ii) **the classic use the operator names** — dependently-typed
staging: codes are data, `decode` is one generic function, and
specializing it to a known code is partial evaluation the type system
licenses (partly built: `deriving Described` + `cas_struct`); (iii)
true runtime codegen — available (`evalConst`/`addAndCompile`, the
`surface` exe precedent), and the WRONG answer: it relocates trust
outside the axiom census; R13's fast-materializer route is the
estate's own better answer.

What the estate's laws add over Effect's JIT: `json_exact` /
`json_exact_render` — the ADDRESSABILITY property (two accepted values
are one value; anything accepted renders to canonical bytes) — which
no ordinary validator provides. Crossing it to TS is a GATE under R5,
never a theorem (R10: a realization is never a bearer of meaning).

## The classic-pattern map (summary)

Present and kernel-checked: codes/El/generic encode+decode with
soundness-completeness-injectivity (`decode_encode`, `decode_exact`,
`encode_inj`, `json_exact`), the wf gate agreement idiom everywhere,
the self-describing universe, registry-gated declarations (STILL a
closed universe — openness at the wire only, with build-error
completeness guards), `Sig`/`Prog` as textbook container + free monad
with initiality. Divergences are load-bearing and mostly correct:
`Described` as the deep facade (its cost: Lean-side JIT can only
produce `El a` for runtime `a`, never a new Lean type — say this in
any lane doc); `Empty` arms as honest partiality. The one structural
gap where the classic pattern would buy something: no `Ast` code
denotes a `Sig` — signatures are not store content.

## The Prog question — adjudicated from rulings

Verification-as-`Prog` is overreach: R14a-P1 is dispositive (`decode`
performs no operation — never lifted), codes live at stratum 1, R2
blocks a new signature, R7's carrier waits on F3. The narrow form is
real: **acquisition** is effectful — `verifyAt : Addr32 → Json.Value →
Prog CasSig Bool` over the EXISTING signature (`load` + `require`),
decide stays a plain function. Store-resident for free when F3 lands.

## Staged proposal (smallest first)

0. **Paperwork**: G0-pin the classic-pattern prior art (clears B22).
1. **The disagreement vector**: a `(code, value, verdict)` conformance
   corpus emitted Lean-side under a byte gate, run through BOTH
   `Cas.Schema.decode` and `Materialize.validator`, gated on
   agreement — S9 as a gate (R5/P6/slice-2 precedent). Makes B8
   visible and red. Corpus restricted (non-recursive, non-float,
   discriminated-unions-only) with the restriction stated.
2. **The `wf` gate on the TS door**, generated from the Lean
   definition under R11; reconcile the two allowlists. Fixes B8.
3. **Rev-1 injectivity** (S7) — short derivation from landed pieces.
4. **The parser** (S8) — one slice with 3 per ruling 11.
5. **Elaboration-time specialization, generated-text-only** — per-code
   decode equations + conformance instance as committed `.lean` text
   (B14-safe), micro-lemma firewalls, no string kernel reduction.
6. **Conditional on F3**: `verifyAt` as a `Prog CasSig`.

Explicitly not proposed: runtime codegen in Lean; a `VerifySig`; any
claim that Lean validates dynamically loaded schemas before 3+4 land.
