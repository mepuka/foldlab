---
name: store-language
description: The store language's ratified law — CAS as an effects language. Use when working in library/cas or library/effects, reasoning about programs, handlers, semantics, or equality of effectful computation, writing proofs over Prog, deciding where meaning or identity lives, or authoring anything the backend generates.
---

# Store language

This page is a projection of ratified law, never its source. The letter
lives in [EFFECTS-BACKEND.md](../../../library/cas/EFFECTS-BACKEND.md)
(R1–R14a, operator-ratified 2026-08-28), the vocabulary in
[docs/effect-replay/CONTEXT.md](../../../docs/effect-replay/CONTEXT.md),
and the lane rules in
[library/cas/AGENTS.md](../../../library/cas/AGENTS.md). Open the design
basis before any effects work; drift from it is a defect.

## The thesis

CAS is an effects language. Sorts are its data types, signatures its
effects, programs its computation, a run's history is a store word.
The metaprogramming library is its backend; Effect TypeScript is the
first target; MCP is the next.

## Ruling handles (R1–R14a)

- **R1 carrier** — `Prog` is an inductive finite interaction tree
  (the HITrees-honest Lean choice); divergence is fuel exhaustion,
  never coinduction.
- **R2 signatures** — effects are data, composed by sum (`⊕ₛ`);
  consumer-gated admission.
- **R3 handlers** — a semantics is a monad morphism into a target
  that can loop; Effect qualifies by construction.
- **R4 identity** — hash presentations, never denotations; binder-free
  tables sit below even α.
- **R5 conformance** — equivalence is a certificate; the decidable
  gate is WORD equality of recorded runs.
- **R6 layers** — denotation / target semantics / closed TS fragment /
  Substance-Denotation-Style rendering.
- **R7 boundary** — programs are content; hosts are code.
- **R8 ingestion** — five seed forms by hand; the rest of the surface
  mechanically ingested, never hand-transcribed.
- **R9 mcp** — MCP tools are generated operation signatures.
- **R10 stratification** — one syntax; meaning lives ONLY in the
  reference handler; every realization is claimed at the word.
- **R11 interchange** — one described manifest owns the protocol;
  both language surfaces generated from it.
- **R12 tower** — a service is a handler; a handler may be a program
  one signature down; `interpret_through` collapses strata; trust
  only at admitted seams.
- **R13 printer model** — a small LM may print surfaces fast; gates
  carry all trust (standing LLM law).
- **R14 representation** — four strata: first-order content
  (decidable — the metaprogrammatic stratum), `Prog` (LawfulMonad +
  INITIAL — the proof stratum), handler images (theorem-only
  equality), host IO (trust statements only). Stable API = strata 1–2.
- **R14a pure discipline** — P1: effect-free work stays OUTSIDE
  `Prog`; P2: continuations end in `.pure`, compose by constructors +
  `bind`, leaves close by `interpret_pure`/`interpret_op`; P3:
  constructor form in statements, typeclass form in programs.

## The direction law (never crossed)

- **Hoover** (parse pinned sources) = ingestion — surface tables,
  cross-checks, provenance. Never mints identity.
- **Execute** (run the Lean model) = the only minting of fixtures,
  words, payloads.
- **Materialize** = denotation → code only, byte-gated. Never code →
  denotation; the carrier is never the authority.

## Where things live

| Concern | Owner |
|---|---|
| Syntax, handlers, tower, strata | `library/cas/Cas/Lang/` |
| Canonical schema universe, self-codec | `library/cas/Cas/Schema/` |
| Backend fragment, emitters | `library/cas/Cas/Backend/`, `library/cas/tools/` |
| Generated TS surfaces | `library/effects/src/cas/generated/`, `library/effects/test/generated/` |
| Gates | `mise run check:cas` (byte gates), effects test suite (pin + run gates) |
