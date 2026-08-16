# The TS kernel and its conformance wall — closing record

Session record, 2026-08-15 (Fable, operator-directed). The operator
ratified the build plan in-thread and authorized the TS kernel; this
record is the run report. Everything below was executed and verified in
this session — the artifact ran, the gates ran, the walls held.

## What landed

**`packages/moves` — the kernel.** `src/kernel.ts` transliterates
`verify/moves/Moves/Model.lean` one named function per named def:
`step`, `stepK`, `stepTrace`, `canonicalRepairCandidates`, `repair`,
`repairK`, `runRepair`, `runRepairK`, `d85Refusal`, the min and
plurality fences, `WF` as a runtime checker. Candidate sets are
canonically sorted deduplicated arrays; state is immutable records over
the declared hole carrier; the factory (`makeKernel`) mirrors the
model's typeclass context. `src/wire.ts` fixes the ground wire
instantiation (three holes, integer values, ASCII holders), the codec
mirroring `Oracle/Codec.lean`, and the digest seam through
`@foldlab/core`'s RFC 8785 encoder. Every proved law surfaces as an
API with the license named at the definition: `willAdmit` (L5),
`provenance` (L1), `sessionDigest`/`merge` (L2/L3), `close` +
`soundFence` (L4), receipts (L6/L7), decided-stability (L8).

**`verify/moves` — the oracle.** The spike emitter was promoted into
the model package (`Oracle/Instance.lean`, `Oracle/Codec.lean`,
`Oracle/Gen.lean`, `Main.lean`, lakefile targets) because the spike's
model copy predates D85 — its corpus would have been authored by a
stale calculus. The promoted oracle imports the canonical `Moves`
library unmodified. Same binary serves offline (`emit N`) and online
(`serve`) modes; the online-oracle lane (draft 13) can reuse it as-is.

**The corpus.** `packages/moves/fixtures/moves-conformance.ndjson`:
2000 splitmix64-indexed traces (length 1–6; fills, one-and-two-pair
disputes, empty offers, decides — every `D85Refusal` class), each line
carrying the model's full verdict: primitive partial run, repaired
partial run, total run with receipts, the reversed bag, journal
evidence per hole, and the model's own fence choices at disputed
terminal holes. Line one is the provenance (the generation command).
Regeneration was verified byte-identical across runs on this machine;
`verify/moves/run.sh` now regenerates and `cmp`s the fixture on every
gate run, and its `sorry`/`axiom` greps widened to the oracle files.

## The walls, as run

| Wall | Result |
| --- | --- |
| Conformance replay, 2000/2000 vectors, zero skips, byte-identical | PASS |
| Corpus adequacy pins (refusals > 100, disputes > 100, decided > 20; actual 1169 / 1341 / 81) | PASS |
| Five planted mutants each killed; lawful kernel survives | PASS |
| Frozen-spec laws L1–L8 + witnesses W1/W2 as fast-check properties | PASS |
| `verify/moves/run.sh` (proofs, axiom footprint, spec pin, orphan rule, corpus regeneration) | PASS |
| `bun run gates` (root typecheck/tests, workspace packages, go, proto/go, proto/ts) | PASS |

## The mutation → vector map

Each mutant drops exactly one law; the corpus kills all five.

| Mutant | Law dropped | First killed by | Kill rate |
| --- | --- | --- | --- |
| last-write-wins fill | no-loss / confluence (D3) | vector 2 | 435/2000 |
| pre-D85 legacy repair (verbatim from Spec.lean) | strong no-loss L1 (MOVES-5) | vector 1 | 719/2000 |
| decide without membership | decision provenance | vector 11 | 153/2000 |
| empty offer admitted | refusal characterization L5 (D86) | vector 0 | 531/2000 |
| reversed value order | canonical storage order | vector 1 | 1267/2000 |

## Bounds, stated plainly

This is Cedar-style differential evidence at R0/R1, deliberately below
refinement. The kernel-checked theorems hold of the instantiated model,
not of the compiled binary that emitted the corpus, and not of the TS
kernel; agreement is evidence bounded by the generator's reach. The
corpus is randomized, not the exhaustive wire-image enumeration —
DEV-670's closure certificate, typed divergences, seat-authority
`FenceRule`, and the two-tier daemon harness remain that issue's scope,
untouched here. The moves↔protod gap stays HELD. Byte identity holds
inside the corpus grammar only (ASCII keys/identifiers, integers below
2^53). Cross-platform regeneration identity is verified on this Windows
machine and argued for CI, not yet CI-proven.

## Deliberately untouched

- DEV-670 proper: `Wire.lean`, the `Divergence` enum, the exhaustive
  Tier A corpus into `proto/wire/fixtures/`, the daemon-driving
  harness, the fixture registry, `protocol-moves.json` split. This
  session's wall is model ↔ TS kernel; the daemon wall is not claimed.
- The spike (`scratch/spike-lean-oracle/`) is left as-is, evidence not
  machinery; its model copy is stale by design of history. Retiring it
  to `scratch/_archive/` is the operator's call.
- `proto/ts` and the daemon: no changes.
- The runtime TODO ledger from the model's exclusion list (signed
  intents, atomic close, journal-as-source-of-truth recovery) —
  named for the negotiation-tool lane, not started.

## Pointers

`packages/moves/` (kernel, corpus, walls; scoped AGENTS/CONTEXT/
DECISIONS), `verify/moves/Main.lean` and `Oracle/` (the emitter),
`VERIFICATION.md` §"TS move-calculus kernel ≡ Lean model" (the claim at
its rung), `SLICE.md` seam S7 (the ledger row), and
`docs/research/2026-08-15-lean-oracle-spike.md` (the feasibility spike
this promotes).
