# The product sphere — grilled and refined

**Status: operator-ruled 2026-08-29 in-session (the six-press grill);
pre-grade as a document — one promotion pass owed after the operator
reads this synthesis back.**

## The thesis, as ruled

Coding, theorem proving, and data analysis have collapsed into one
task: **direct an AI to use data + code to perform an end.** The
product is the substrate for that task.

- **Effect-TS** is the effects-based computation substrate, speaking
  the language of algebraic data types.
- **Lean** is the tooling, abstraction, and verification layer that
  ties everything together.
- The expressive API potential exists ONLY because of the composed
  machinery — metaprogramming, codegen, schema gen, code analysis,
  logic programming. The goal is to **tame that and present it
  beautifully**. Paper is the top design inspiration for the UX
  semantics of human-driven AI authorship.
- **Dual output**: the product, and the developed Effect+Lean APIs
  offered as general-purpose open-source library tooling.

## The pillar rulings

**Prose (press 4)** — do not over-theorize. Prose already exists:
every LLM prompt expressing an idea, goal, or invariant is prose.
Treat those interactions as another substrate in the CAS data plane
and their API follows from CAS interaction semantics. (Note: the
archived effect-replay plane — Solicited delegation, Decision trace,
Replay session in CONTEXT.md — is this pillar's dormant vocabulary;
reactivation is a later ruling, not now.)

**Linear (press 5)** — order comes from the DAG: operations/puts →
coherent actions via the derived algebra + proofs (AST, codecs — all
connected in one data plane). Linear-ness is the VIEWS, UI, and
tooling built on top to manage ingress/egress of tasks. The enabling
claim: once the Effect API surface is ingested in full (R8) and, with
harness work, Effect PROGRAMS can be ingested into the structure,
**any integration becomes trivial** — the "wrap any async/await
universe into one Effect and manage it as a continuation" move,
generalized via the careful formalization of Lean + Effect-TS + LLMs.

**Work as content (press 6)** — yes. Tasks, dispatches, rulings are
stored content on the same plane.

## What this puts on the critical path

1. **R8 full Effect surface ingestion** — operator-named as the
   enabler. Gated on open decision D1 (the tree-sitter variance
   defect: grammar-pin upgrade re-admission vs compiler-API-only
   carve-out; the dsl-proposal recommends A, sequenced before the
   first libfree corpus run). D1 is now the highest-leverage
   undecided ruling.
2. **Program ingestion** (Effect programs into the structure) — the
   harness work; joins F3 and the R-SCHEMA/libfree recognition lane.
3. **The formalization spine** — the operational-structure design
   (selective fragment, authenticated handler pair / proposed R16)
   is the theory under "any integration becomes trivial"; its
   one-day kill-test slice (verifyHandler + verify_load_or_collision)
   decides whether the λ• mapping holds.
4. **Interactions-as-content** — a described kind for the prompt/
   answer exchange riding existing CAS semantics (R15's acquisition
   loop already names the shape); small, additive, unblocks the prose
   pillar without theory.
5. **Views/UX lane** — Paper-grade presentation; deferred behind
   substrate completeness, but the design inspiration is recorded so
   API shapes stay presentable (S5's five seats already enforces
   this).
6. **OSS packaging** — the Effect+Lean APIs as standalone libraries;
   a packaging/naming pass owed once the library level stabilizes.

## Explicitly not the wedge

Real-time collaboration, hosting, and general storage are not the
product; verification-at-the-gate over addressed content is. The
float ceiling, undiscriminated-anyOf denotation, and runtime Lean
codegen remain ruled out as before.
