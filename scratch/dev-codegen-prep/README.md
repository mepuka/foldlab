# Prep evidence: the plain-TypeScript SDK and the Effect fluent surface

A coordinator prep lane, not a build. Nothing here ships; nothing here is
generated from the corpus. This directory holds the measured evidence three
tickets cite, and the probes that produced it, so a seat can re-run the
measurement rather than trust the number.

Read the estate contract first (root `AGENTS.md`), then this.

## What this is

The meta-language pipeline projects one grammar into several surfaces. Two
targets are still hand-derived sketches rather than emitted artifacts: the
plain-TypeScript SDK (`verify/kernel/projections/kernel.ts`) and the Effect
fluent surface (which exists only as its smaller sibling, the generated
program builder). This lane measured both against what the corpus actually
emits today, and specified the code-mode MCP view that the first one enables.

## How to re-run the measurement

Every number in the census files below came out of one of these. Run from the
repository root.

| probe | what it measures |
| --- | --- |
| `bun scratch/dev-codegen-prep/probe-sdk-drift.ts` | the SDK sketch against the generated vocabulary, as running values |
| `bun scratch/dev-codegen-prep/probe-law10.ts` | the standing tracking-artifact sweep over the surfaces its wall does not cover |
| `sh scratch/dev-codegen-prep/probe-controls.sh` | whether the sketch's four must-not-compile controls are load-bearing |

`probe-sdk-drift.ts` and `probe-law10.ts` need no dependencies — both sides of
every comparison are import-free modules. `probe-controls.sh` needs `tsgo` on
the path. Captured output sits beside each probe as `evidence-*.txt`.

Two of the probes carry their own honesty check. `probe-law10.ts` re-reads the
wall's source and refuses unless all three refusal patterns are still verbatim,
so a drift in the wall reddens the probe instead of quietly changing what it
measures. `probe-controls.sh` reports the declared control count beside the
error count, so a control that stopped biting is visible as a mismatch.

## The files

| file | what it holds |
| --- | --- |
| `CENSUS-A-plain-ts-sdk.md` | the SDK sketch's shape, and its measured drift under this week's landings |
| `CENSUS-B-effect-surface.md` | the idiom table a generated Effect surface must reproduce |
| `SPEC-C-code-mode-mcp.md` | the code-mode MCP view, specified as prep — no server code |

## What this lane did not do

No MCP server code. No emitter. No change to any generated artifact, any
projection, or any wall. The sibling lanes own the TypeScript projection AST,
the JSON-schema printer, and the Go target; this lane deliberately measured
only what those do not cover.
