# Foldlab — Agent Specification

Status: draft, 2026-08-24. This file specifies how agents act in this project:
conduct, procedures, routing. The lab's thesis, philosophy, programme, and
roadmap live in [CHARTER.md](CHARTER.md).

**Disclosure rule.** Read this file whole; it is the only always-loaded
document. Open a referenced document only when the task touches its authority
column below. Never preload the corpus — throughput comes from routing, not
from reading everything.

## Orientation

| Resource | Authority over | Open when |
|---|---|---|
| [CHARTER.md](CHARTER.md) | Thesis, tower, principles P1–P4, roadmap | Scoping any new work |
| [CONTEXT-MAP.md](CONTEXT-MAP.md) | Which context owns which vocabulary | Using or minting a term |
| [lab-core CONTEXT](docs/lab-core/CONTEXT.md) | Artifact, grade, evidence, kind vocabulary | Classifying anything |
| [KINDS.md](docs/lab-core/KINDS.md) | Artifact-kind ledger | Assigning an artifact kind |
| [TOOLS.md](docs/lab-core/TOOLS.md) | Tool register: admissions and trust statements | A tool's output enters gated work |
| [CLAIM-GATES.md](docs/effect-typescript-semantics/CLAIM-GATES.md) | Claim ladder G0–G6 | Stating any claim |
| [DEVELOPMENT-INVARIANTS.md](docs/DEVELOPMENT-INVARIANTS.md) | Code invariants I-001–I-005 | Writing formal-core code |
| [.reference/](.reference/) | Evidence only: source lock and receipts, catalog, study clones (gitignored), dumps | Resolving or citing sources |
| `formal/` | Formal verification artifacts (claim-gated) | — |
| [`library/`](library/machine/README.md) | Distributable libraries, Lean 4 or mixed-language (claim-gated; machine and effects live here) | Building machine-algebra or effect-replay slices |
| [EFFECTS-BACKEND](library/cas/EFFECTS-BACKEND.md) | The store language, RATIFIED law: semantics, handlers, the tower, backend targets, representation strata (R1–R14) | Working on the language, the backend, generated surfaces, or reasoning about effects |
| `experiments/` | Experimental artifacts | — |
| `.staging/` | Pre-grade staged material (gitignored except README) | — |
| [`annex/coq/`](annex/coq/README.md) | Coq/OCaml toolchain annex: prior-art technique only, never an estate artifact | Reading or running executable Coq prior art |

## Conduct (C1–C7)

- **C1 — Propose before act.** In operator-guided sessions, state the intended
  action set and wait for assent before anything that writes files, commits,
  fetches new sources, or dispatches subagents. Reading and analysis are free;
  production is gated.
- **C2 — Shared understanding precedes production.** The agent role is
  colleague and mentor, not autonomous builder. Divergence between agent
  understanding and operator intent is a stop condition — surfaced, never
  resolved unilaterally.
- **C3 — Mode discipline.** Conception mode and proof mode are different
  registers. Rigor obligations attach to artifacts entering the estate, not to
  conversation. In conception mode, contribute direction and structure —
  programmatic, no-nonsense — never audit theorizing as a proof submission.
- **C4 — Ratification.** Definitions, artifact kinds, and claims enter `docs/`
  or `formal/` only after a grilling pass. Un-ratified machinery is rolled
  back, not suspended.
- **C5 — Claim discipline.** Every use of "sound," "verified," "equivalent,"
  or "preserves" links to its exact judgment and theorem (I-003). Until the
  theorem exists, the obligation is pending and says so.
- **C6 — Provenance.** No assertion about external material without a resolved
  pin or an explicit pending mark.
- **C7 — Legibility.** Formal, consistent, outsider-legible language on every
  surface; jargon glossed on first use.

## Procedures

**Session start.** Read this file; open CHARTER.md if scoping new work.
Propose the action set and wait (C1). Act, surfacing divergence immediately
(C2). Match register to mode (C3).

**Minting a definition.** Entry in the owning CONTEXT.md: name, artifact kind
(from [KINDS.md](docs/lab-core/KINDS.md)), carrier or judgment form,
obligations, avoid-list. Enters only through domain modeling plus grilling
(C4).

**Making a claim.** Owned vocabulary; stamp the highest satisfied gate
(G0–G6); link each soundness word to its judgment (C5). Passing a later gate
never silently promotes an earlier claim.

**Citing or borrowing.** Resolve a pin into `.reference/provenance/` or mark
explicitly pending (C6). Borrowed code, abstractions, and ideas are welcome —
credited and attributed, always.

**Producing artifacts.** "Artifact" is an earned grade, not a birthright
([lab-core](docs/lab-core/CONTEXT.md)): an artifact kind, a canonical
content-addressable identity, and declared transformations. The
transformations of record are projection, lift, and the human semantic
projection (P4: a derived plain-language rendering, never hand-maintained).
The directory tree carries the grades: `.staging/` (pre-grade) →
`experiments/` | `formal/`; promotion is a declared transformation — for
staged material, the promoting act is the commit into a graded home.
Everything in `formal/` and `experiments/` is artifact grade: functionally
organized and fully regenerable from declared sources; no hand-maintained
derived files.

**Admitting a tool.** Before a tool's output enters gated work, register it in
[TOOLS.md](docs/lab-core/TOOLS.md) with its role and trust statement. LLM
harnesses are admitted tools with an explicitly empty trust contribution — the
gates carry the trust.

## Tooling

- **Platform.** Windows-native primary; the lazy Coq/OCaml annex lives on the
  macOS host under [`annex/coq/`](annex/coq/README.md), added only when Coq
  code must build. The root `mise.toml` serves every host and stays
  platform-neutral; the annex's own `mise.toml` is directory-scoped, so a host
  that never enters that directory installs none of it.
- **Toolchains.** Managed with **mise** (not Nix) via the repo `mise.toml`:
  bun is the dev runtime; node is pinned as the claim-target engine; Lean pins
  per Lake project through elan's `lean-toolchain`, never through mise. The
  annex pins the same way one level down: mise pins only the opam binary, and
  opam pins OCaml and Rocq through a committed switch export.
- **Tasks.** mise tasks are the canonical runner. `mise run gen` regenerates
  every derived file; `mise run check` runs gen, asserts a clean tree, then
  every test and gate defined so far. CI runs `check` and nothing else.
- **Dependencies.** Exact versions only, lockfile committed. The `effect` npm
  version and the provenance source pin must name each other; when one moves,
  the correspondence is re-recorded.
- **Lake layout.** One Lake project per formal effort; no Mathlib by default;
  `formal/lib/` only when two projects share code.
- **Library craft.** `library/` holds distributable libraries built to
  ecosystem practice — Lean 4, or mixed TypeScript/Lean where a runtime
  implementation and its model ship together. The direct style reference is
  [Functional Programming in Lean](https://lean-lang.org/functional_programming_in_lean/).
  The experimental trees (`experiments/entity-store-*`) are the house pattern
  reference — reuse their gates, obligation ledgers, framed encodings, and
  decidable-admission idioms rather than re-deriving them. The machine
  library's design basis is
  [MACHINE-ALGEBRA](library/machine/MACHINE-ALGEBRA.md) (pre-grade until
  grilled; ruling CV-4). The effects library's design basis is
  [library/effects/IMPLEMENTATION-PLAN.md](library/effects/IMPLEMENTATION-PLAN.md),
  with vocabulary in [docs/effect-replay/CONTEXT.md](docs/effect-replay/CONTEXT.md);
  the store language's RATIFIED design basis is
  [library/cas/EFFECTS-BACKEND.md](library/cas/EFFECTS-BACKEND.md) —
  CAS is an effects language, meaning lives in the reference handler,
  the stable API is the first-order and `Prog` strata (R14), and the
  direction law (hoover = ingestion, execute = fixtures, materialize =
  code) is never crossed
  (M0 contract ratified 2026-08-26; a deliberate fork of the machine's
  obligation shapes, fully independent of the Entity Store context).
- **Licensing.** Apache-2.0 for code; CC BY 4.0 for documents.

## Skill routing

| Situation | Invocation |
|---|---|
| No Lake package yet, or broken toolchain state | `lean` → project-bootstrap |
| Informal intent, no approved contract | `lean` → formalization-strategy Pass A |
| Choosing carriers, invariants, representations | `lean` → model-invariants |
| Operations, state, traces, protocols | `lean` → algebraic-systems |
| Freezing public declarations | `lean` → formalization-strategy Pass B |
| Writing or repairing proofs | `lean` → llm-proof-loop |
| Any "formally verified" claim | `lean` → assurance-review |
| Minting or sharpening vocabulary | `/mattpocock-skills:domain-modeling` |
| Ratification pressure-testing | `/mattpocock-skills:grilling` |
| Reading external sources | `/mattpocock-skills:research`, pins into `.reference/provenance/` |
