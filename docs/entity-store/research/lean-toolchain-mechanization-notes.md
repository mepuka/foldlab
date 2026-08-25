# Lean toolchain surface for mechanizing the loop — survey notes

Coordinator survey, 2026-08-25, against the pinned toolchain source at
`~/.elan/toolchains/leanprover--lean4---v4.33.1` (same pin as everything else; every
claim below is a receipt from that tree or its CLI `--help`). Advisory (G0): nothing
here is adopted by appearing here — adoption is a ruling, and the two trust-relevant
rows say so explicitly.

## Tier 1 — direct upgrades to existing instruments

| Surface | Receipt | Use |
|---|---|---|
| `lean --json` — messages as JSON, one per line | `lean --help` | The ledger's strict TEXT parsing (worktree 5, in flight) becomes JSON parsing in v2; adjudication error-handling becomes mechanical everywhere. |
| `Lean.collectAxioms` + environment iteration | `Lean/Util/CollectAxioms.lean:149`; the `Gates.lean` pattern | **Ledger v2 as a Lean exe**: import the modules, walk `env.constants`, collect axioms programmatically, emit via `Lean.Data.Json` — the text-parsing seam disappears entirely and extraction is itself elaborated code. |
| `lake test` + `@[test_driver]` | `lake test --help` | The differential harness becomes the package's configured test driver — `lake test` is the standard entry. |
| `lake lint` + lint driver | `lake --help` | The gates (opaque/unsafe scan, shell G-S set) as the configured lint driver — `lake lint` = run the gates. |
| `lake query --json` | `lake query --help` | Machine-readable target build results for orchestration (mise/CI) without log parsing. |
| Lake `script` DSL, `lake run <name>` | `lake/DSL/Syntax.lean:374-396` | Workspace automation written in Lean in the lakefile — gate runs, regeneration flows — one language end to end; mise remains the outer runner. |

## Tier 2 — telemetry (the §14 dynamics thesis applied to the loop itself)

| Surface | Receipt | Use |
|---|---|---|
| `lean --profile` | `lean --help` | Per-declaration elaboration/typechecking time — proof-cost telemetry per theorem, trackable across commits (the cost-semantics lane, aimed at ourselves). |
| `trace.profiler.output` — Firefox Profiler export | `Lean/Util/Profiler.lean:14`, `namespace Lean.Firefox` | Build traces in a standard profiler format; a telemetry sidecar, never an artifact (timestamps stay out of gated outputs). |
| `lean --stats`, `--deps`, `--src-deps` | `lean --help` | Environment statistics; mechanical dependency graphs for dispatch planning (which modules a seat's change can touch). |

## Tier 3 — build and distribution mechanics

| Surface | Receipt | Use / caution |
|---|---|---|
| `lake pack` / `unpack` / `cache` | `lake --help` | Artifact archives for SPEED elsewhere. **Never for the dual-host gate** — that gate exists to force an independent rebuild; shipping oleans would hollow it out. |
| `lake shake` | `lake --help` | Import minimization — hygiene passes over the formal tree. |
| Custom facets | `lake/Lake/Build/Facets.lean` | Per-module derived artifacts under Lake's incremental trace system (e.g., a per-module axiom-report facet making the ledger incremental). Advanced; revisit after ledger v2. |

## Tier 4 — agent tooling and trust-caveated items

| Surface | Receipt | Use / caution |
|---|---|---|
| `Lean.Data.Lsp`, `JsonRpc`, `lake serve` | `Lean/Data/Lsp*`, `lake --help` | Drive the language server over JSON-RPC: mechanical goal-state extraction for proof-loop instrumentation — agents query proof states instead of parsing CLI text. |
| `Std.Tactic.BVDecide` | `Std/Tactic/BVDecide` | Bitvector/SAT decisions, attractive for byte-level lemmas — but it rides an external solver plus reflection machinery adjacent to the banned `native_decide` posture. **Not admissible without a TOOLS.md-grade ruling on its trust seam.** |

## Recommended sequence

1. After worktree 5 merges: ledger v2 as a Lean exe (`collectAxioms` + `Lean.Data.Json`), retiring the text seam the v1 brief was forced to police with strict parsing.
2. Wire `lake test` (harness) and `lake lint` (gates) drivers — standard entries for CI and the dual-host leg.
3. Stand up `--profile`-based proof-cost telemetry as a sidecar series next to the audit.
4. Facets and LSP-driven proof-state tooling when a concrete consumer exists; BVDecide only by ruling.
