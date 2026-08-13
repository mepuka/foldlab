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
