# Foldlab — Agent Specification

Status: draft, 2026-08-24. This document specifies how agents act in this
project: conduct, procedures, and routing. The lab's thesis, philosophy,
programme, and roadmap live in [CHARTER.md](CHARTER.md) — read it first.

## Orientation

| Resource | Authority over |
|---|---|
| [CHARTER.md](CHARTER.md) | Thesis, philosophy, descriptive tower, principles P1–P3, references, roadmap |
| [CONTEXT-MAP.md](CONTEXT-MAP.md) | Bounded contexts and vocabulary ownership |
| [docs/](docs/) | Extended context for humans and LLMs: bounded-context glossaries, ADRs |
| [CLAIM-GATES.md](docs/effect-typescript-semantics/CLAIM-GATES.md) | Claim ladder G0–G6 |
| [DEVELOPMENT-INVARIANTS.md](docs/DEVELOPMENT-INVARIANTS.md) | Code invariants I-001–I-005 |
| [docs/lab-core/TOOLS.md](docs/lab-core/TOOLS.md) | Approved-tools ledger |
| [.reference/](.reference/) | Evidence only: source lock and receipts, catalog, study clones (gitignored, shallow), PDFs and info dumps |
| `formal/` | Formal verification artifacts (claim-gated) |
| `experiments/` | Experimental artifacts |
| `.staging/` | Staged material — gitignored except its README; committing into a graded home is promotion |

## Conduct

- **L1 — Propose before act.** In operator-guided sessions, state the intended
  action set and wait for assent before anything that writes files, commits,
  fetches new sources, or dispatches subagents. Reading and analysis are free;
  production is gated.
- **L2 — Shared understanding precedes production.** The agent role is
  colleague and mentor, not autonomous builder. Divergence between agent
  understanding and operator intent is a stop condition — surfaced, never
  resolved unilaterally. This is an operational fact of the lab.
- **L3 — Mode discipline.** Conception mode and proof mode are different
  registers. Rigor obligations attach to artifacts entering the estate, not to
  conversation. In conception mode, contribute direction and structure —
  programmatic, no-nonsense — and do not audit theorizing as if it were a
  proof submission.
- **L4 — Ratification.** Definitions, artifact kinds, and claims enter `docs/`
  or `formal/` only after a grilling pass. Un-ratified machinery is rolled
  back, not suspended.
- **L5 — Claim discipline.** Every use of "sound," "verified," "equivalent,"
  or "preserves" links to its exact judgment and theorem (I-003). Until the
  theorem exists, the obligation is pending and says so.
- **L6 — Provenance.** No assertion about an external artifact without a
  resolved pin or an explicit pending mark.
- **L7 — Legibility.** Formal, consistent, outsider-legible language on every
  surface; jargon glossed on first use.

## Procedures

### Session procedure (operator-guided)

1. Orient from CHARTER.md and the owning context documents.
2. Propose the action set; wait for assent (L1).
3. Act; surface any divergence immediately (L2).
4. Match register to mode (L3): conception → direction; proof → full rigor.

### Minting a definition

A term is usable once its definition entry exists in the owning CONTEXT.md:
name, **artifact kind** (from the artifact-kind ledger), carrier or judgment
form, obligations, avoid-list. Artifact kinds are first-class: the ledger is
itself a versioned lab artifact. Entries enter only through domain modeling
plus grilling (L4).

### Making a claim

State the claim in owned vocabulary; stamp its highest satisfied gate (G0–G6);
link each soundness word to its judgment (L5). Passing a later gate never
silently promotes an earlier claim.

### Citing or borrowing external material

Resolve a pin into `.reference/provenance/` or mark explicitly pending (L6).
Borrowed code, abstractions, and ideas are welcome — with credit and
attribution, always (see CHARTER philosophy).

### Producing artifacts

"Artifact" is a **grade, not a birthright** (see
[docs/lab-core/CONTEXT.md](docs/lab-core/CONTEXT.md)). A built thing earns it
by carrying an **artifact kind** (from the ledger), an **identity** (canonical form,
content-addressable), and **transformations** (declared derivations to and
from other artifacts). The directory tree is the grade lattice: `.staging/`
holds staged material, `experiments/` holds experimental artifacts, `formal/`
holds formal verification artifacts (claim-gated). Promotion between grades is
a declared transformation, never a silent move. Documents are values of their
kind; edits are transformations; projection, lift, and the **human semantic
projection** (P4: a derived plain-language rendering, never hand-maintained)
are the transformations of record. Nothing is loose prose.

Everything under `formal/` and `experiments/` is **artifact grade**: cleanest
functional organization, fully regenerable by tooling from declared sources —
never hand-maintained derived files.

### Admitting a tool

A tool whose output flows into a gated artifact is admitted first: an entry in
[docs/lab-core/TOOLS.md](docs/lab-core/TOOLS.md) with its name, verification
kind, and trust statement. LLM harnesses are admitted tools with an explicitly
empty trust contribution — the gates carry the trust.

### Tooling

- **Platform.** Windows-native primary; WSL2 Ubuntu is the lazy Coq/OCaml
  annex, added only when Coq code must build. The same mise config serves
  both.
- **Toolchains.** Managed with **mise** (not Nix) via the repo `mise.toml`:
  bun is the dev runtime (packages, tests, scripts); node is pinned as the
  claim-target engine (L0); Lean is pinned per Lake project through elan's
  `lean-toolchain`, never through mise.
- **Tasks.** mise tasks are the canonical runner. Reserved names: `mise run
  gen` regenerates every derived file; `mise run check` runs gen, asserts a
  clean tree, then tests and gates. CI runs `check` and nothing else.
- **Dependencies.** Exact versions only, lockfile committed. The `effect`
  npm version and the provenance source pin must name each other; when one
  moves, the correspondence is re-recorded.
- **Lake layout.** One Lake project per formal effort; no Mathlib by default;
  `formal/lib/` only when two projects share code.
- **Licensing.** Apache-2.0 for code; CC BY 4.0 for documents.

## Skill routing

| Situation | Invocation |
|---|---|
| Informal intent, no approved contract | `lean` → formalization-strategy Pass A |
| Choosing carriers, invariants, representations | `lean` → model-invariants |
| Operations, state, traces, protocols | `lean` → algebraic-systems |
| Freezing public declarations | `lean` → formalization-strategy Pass B |
| Writing or repairing proofs | `lean` → llm-proof-loop |
| Any "verified" claim | `lean` → assurance-review |
| Minting or sharpening vocabulary | `/mattpocock-skills:domain-modeling` |
| Ratification pressure-testing | `/mattpocock-skills:grilling` |
| Reading external sources | `/mattpocock-skills:research`, resolving pins into `.reference/provenance/` |
