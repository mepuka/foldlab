# LIBRARIES — the publish-shaped partition and the META semantics

Status: **STAGED PROPOSAL — pre-grade**. Written 2026-08-30 on the
operator's ask, BEFORE the M4 migration so the migration lands into a
ruled shape. Three questions answered: is META a good name; what
uniform output style; what library breakup — under the operator's new
standing assumption: **code everything as if it will be published as
separate libraries.**

## META — the name, adjudicated

**Yes for the plane, the directory, and the artifacts. Never as a
Lean namespace** — `Lean.Meta` is the metaprogramming namespace of
the toolchain itself, and a `Cas.Meta` would read as metaprogramming
to every Lean reader. The Lean-side lib is therefore **`CasMeta`**
(root namespace `CasMeta`), and the file plane keeps META.

**The uniform output style** (one rename event, folded into the M4
migration so paths move once):

- Self-description artifacts carry the `.META.` infix — grep-able,
  and the caps signal "about the thing, not the thing" (the
  README/LICENSE convention): `surface.META.json`,
  `obligations.META.json`, `laws.META.json`, `debts.META.json`,
  `axioms.META.json`, `trust.META.json`, `environment.META.json`;
  schemas as `<name>.META.schema.json`; generated self-description TS
  as `<name>.META.ts` (import paths move once, at the migration).
- **Language-plane emissions do NOT take the infix** — the grammar
  manifest, `names.json`, `kindTags.ts`, vectors, schema mirrors are
  the PRODUCT's API (the UI hydrates them), not introspection. The
  classification of `names.json` as language-plane (not META) is the
  one judgment call — flagged, recommended as stated, since hydration
  serves it to apps.
- Home per M4: `library/cas/meta/` — `MANIFEST.META.json`, `in/`,
  `out/`.

## The breakup (Lean side) — one package, five publish-shaped libs, a checked DAG

Not five Lake packages (per-package ceremony buys nothing yet) — one
package, five `lean_lib` strata with a DECLARED and MACHINE-CHECKED
dependency direction:

**RULED 2026-08-30 (operator): the judge trio gets its own `llm`
lib**, and the floor becomes a two-lib DAG, not a chain. `CasLlm`
(directory `Cas/Llm/`, namespace `Cas.Llm`) collects the LLM
abstractions under the split the operator named — **LLMs as
FUNCTIONS vs LLMs as DECISION POINTS**, which the algebra already
spells as "rewrites PRODUCE, verdicts SELECT":

```
Cas/Llm.lean        the front page: the functions/decisions split
Cas/Llm/Rewriter.lean   as functions — String → String, pipelines,
                        Into (schema-forced), Idempotent (canon)
Cas/Llm/Judge.lean      as decision points — Judge, Compositional,
                        the subalgebra/blame theorems, Panel and the
                        aggregator theorems
Cas/Llm/JudgeRate.lean  the measurement — Stable, defectCount,
                        CompositionalOn
```

Relocation is CHEAP NOW and only now (the trio is a day old; nothing
imports it but the root) — it moves as its own lane the moment the
CasValues lane clears the shared files. The measured import graph
(2026-08-30) also fixed the rest of the floor plan, all agreed:

- Byte floor: `Codec.{Nat32 → Bytes → Hex}` — a pure three-module
  chain; boundary lands at the migration lane.
- `Lang.{Sig, Prog}` — the free-monad core, store-free; boundary at
  migration.
- `Backend.Ts` — the Lean→TS printer, zero deps; boundary at
  migration.
- `Grammar.Sorts → Core.Node`: suspected vestigial import (the file
  uses only UInt8s) — verify-then-trim; if it trims, the grammar
  floor `{Sorts}` purifies too.

```
   CasValues   CasLlm          ← the floor (both depend on nothing)
        \\        /
         \\      /
           Cas                  ← the model
            |
        CasBackend              ← host-facing declared data
            |
         CasMeta                ← the self-description plane
```

```
CasValues    the utils abstraction (operator's instinct, confirmed):
             canonical JSON with its kernel-proved injectivity, bytes,
             hex. ZERO dependencies. The first separately publishable
             unit — "canonical JSON, proved injective" is a
             distinctive small library on its own.
   ↑
Cas          the model: Core / IR / Lang / Schema / Codec / Grammar
             (+ Values imports become CasValues imports). No loose
             top-level modules — every module lives in a stratum dir.
   ↑
CasBackend   host-facing declared data: the Ts printer, HttpProfile,
             Mcp surface, Admission clause tables. What a host
             mirrors, and nothing a host never sees.
   ↑
CasMeta      the ledger/emitter substrate (today's Gate + Obl + Law +
             MetaShapes + Walk, renamed and gathered): the
             self-description plane's library. Tools stay THIN exe
             mains over it (the flat `tools/` is fine once it is
             mains-only; the substance moves into CasMeta).

CasWp / CasExamples — unchanged, beside the tower.
```

**The standing rules** (the publish-assumption law, enforceable):

1. Lower strata never import higher — the DAG is declared as data
   and checked by a new `strata --check` gate (the org chart as a
   checked artifact, like everything else).
2. Every lib root documents its published surface (what the root
   module re-exports IS the API; reach-ins across strata are
   refusals).
3. New modules land in a stratum or are refused — no loose files.

## The breakup (TS side) — one package now, same strata inside

`library/effects` stays one npm package (PACKAGING.md's
publish-capable posture unchanged) but adopts the SAME strata
internally — values / model-gated cas / server / bin — with import
direction enforced by the existing house-rules lint (a new rule row),
and the trust census gains a `stratum` column so the boundary is
measured like everything else. Package splits happen at publish time
along lines already enforced, not before.

## Sequencing

L3 first (CasValues extraction — smallest, unlocks the "own lib"
discipline), then the M4 migration WITH the `.META.` rename (paths
move once), then CasMeta gathering, then the strata gate. Each is a
bounded lane.

## Ruling asks

- **L1**: META semantics as stated (the name yes; `.META.` infix for
  self-description only; language-plane exempt; `names.json` ruled
  language-plane).
- **L2**: the five-lib partition + the checked-DAG standing rule +
  the no-loose-modules rule, both sides.
- **L3**: commission the CasValues extraction as the first lane,
  ahead of the migration.
