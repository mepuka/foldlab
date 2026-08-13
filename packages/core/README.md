# @foldlab/core entry map

The package intentionally exposes modules by concept (`@foldlab/core/stream`,
`@foldlab/core/algebra`, and so on). Use this map to choose the owner and its
refusal dialect without browsing `src/`.

| Module | Owns | Refusal channel |
| --- | --- | --- |
| `stream` | Canonical event identity, merge facts, KV fold/combine, compaction, content-addressed segments | Effect typed errors at workflow surfaces; `undefined` at pure KV steps/combine; canonical range mistakes throw |
| `xform` | Pure, fused per-event transforms | `null` drops/refuses an event |
| `streamBindings` | Effect Stream execution of xforms and heads | Effect channel inherited from the supplied stream |
| `schema` | Effect Schema wire/frame adapters | Effect Schema parse issues |
| `entity` | Correlation-key collectors and composed anchors | Malformed meaning payloads are deliberate no-ops; backing operations are synchronous |
| `jcs` | Constrained JSON decode and RFC 8785 encoding | `{ ok: false, refusal }` union |
| `algebra` | Declared reducers, steps, homomorphisms, canonical fold-state encoding | `{ ok: false, refusal }` for encoding; missing identity is named on the declaration |
| `fold` | `defineFold`, fold identity, `zip`, and `map` | Identity is optional when no declared content address exists |
| `foldCache` | Immutable results keyed by `(fold digest, head)` | `{ ok: false, refusal }` union |
| `foldLaws` / `foldArbitrary` | Generated law suites and their carriers | Test construction; false laws fail their generated property |
| `foldBindings` | Effect Stream execution of a declared fold | Effect channel inherited from the supplied stream |
| `kvSemilattice` | Enriched commutative/idempotent KV join and projection | `{ ok: false, refusal }` union, never an Effect |

`combineKV` is ordered segment recombination. `combineKVEffect` is the same
operation with `KVCountOverflow` in Effect's typed error channel. A committed
stream interleaving is a different concept and lives under `MergeFact` /
`applyMerge`.

## Executable Rosetta bridge

Issue #14's vocabulary bridge is kept checkable, not only described:

| Accepted obligation | Durable evidence |
| --- | --- |
| Common Effect names beside foldlab's house names | Root `CONTEXT.md` and the module headers in `src/algebra.ts`, `src/fold.ts`, and `src/stream.ts` |
| One shape, one fold, three consequences | `bun examples/rosetta/rosetta.ts`; pinned by `test/rosetta.demo.test.ts` |
| First-consumer parallel KV replay | `bun examples/rosetta/parallel-kv.ts`; pinned by `test/parallel-kv.example.test.ts` |
| Deliberate refusal dialects | This entry map, module `CONTEXT.md`, and `test/error-channel.surface.test.ts` |
| Machine probe versus browser-demo prose | `packages/server/test/health.surface.test.ts` |

Both demos are root-workspace members, so `bun run typecheck` checks the same
imports a consumer executes. The tests assert the exact digests and every
narrated payoff without freezing console formatting.
