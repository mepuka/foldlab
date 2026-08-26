# entity-store — the CAS model, formalized

Status: promoted from `.staging/e2/lab/` on 2026-08-25 (the promoting act is this
commit; declared transformation: pre-grade staged material → `formal/`). The model spec
it implements is [docs/entity-store/STORE-MODEL.md](../../docs/entity-store/STORE-MODEL.md)
(ratified by grilling, same day); the program record is
[docs/entity-store/KICKOFF.md](../../docs/entity-store/KICKOFF.md). Namespace `E2` is a
working label — the program name and context home are ruling R-1, still open; a rename is
a declared transformation, not drift.

Toolchain: `leanprover/lean4:v4.33.1` (kernel-soundness floor). No dependencies — core
only. Build: `lake build` (in this directory).

Amendment A-1 was implemented 2026-08-25 under the ratified Q10 amendment discipline:
address-valued values are `Value.vaddr`; the nullary address-type schema leaf uses the
pre-R-1 working label `SchemaCore.address`; their discriminator bytes are 0x16 and 0x3A,
respectively. Joint B now closes entity insertion over every address in the value.

Ruling Q11 (2026-08-25, STORE-MODEL §7): values canonicalize — `canonV` mirrors R-10
(`vobj` fields sort by key), `preimageE` stores the canonical form, and M12E extends
unconditional dedup to entities. The M15 entity pin returns `canonV v`.

## What is here, and what is proved

| Module | Content | Proved now |
|---|---|---|
| `E2/Core.lean` | mutual-monomorphic carriers: `SchemaCore`/`FieldList`/`SchemaList`, `Value` family (including `vaddr`), `Check` family; nullary `SchemaCore.address`; derived `DecidableEq`, `BEq` from it | — |
| `E2/Encode.lean` | framed byte encoding; unbounded LEB128-style `encNat` frames (Q10 amendment: the earlier be64 frame truncated and falsified injectivity); A-1 tags 0x16/0x3A | — |
| `E2/Decode.lean` | fueled decoders, fuel derived from input length and absent from all statements; A-1 cases included | **M4a both kinds**: `decodeSchema ∘ encSchema = some`, `decodeValue ∘ encValue = some`, unconditional over the extended carriers |
| `E2/Canon.lean` | `canonS` with the ratified sort-by-name field order (R-10); the address-type node is a leaf; `canonV` value canonicalizer (Q11: `vobj` fields sort by key, array/tuple order semantic). The field sort is STABLE since W3-19/F-48 — an equal key inserts before the run it meets | — |
| `E2/Model.lean` | `refsS`/`refsV`, `closedB`/`guardedB`/`WFS`, `substS`/`unfoldMu`, inductive `Conforms` (including unconditional address conformance; parameterized check semantics + resolver), `StoreMap`, `Reachable` with entity-reference closure, operations, `NameMap` | **M8** WF1 (address consistency, by induction on `Reachable`); **M12/M12E** unconditional dedup, both kinds (Q11); **M13** frame/append-only; **M14** get-after-put (fresh half) |
| `E2/Obligations.lean` | identity assembly (`preimageS`/`preimageE`, version + kind in pre-image); obligation ledger as named `Prop`s | **directionA** (congruence); **kind_separation** (schema/entity pre-images differ) |
| `E2/Correspondence.lean` | Shape B correspondence pattern (ascriptions + exhaustive tag map) | `tags_distinct` (zero axioms) |
| `E2/Resolve.lean` | STORE-MODEL §4 `resolve_k` (`resolveSchema`/`resolveEntity`, `stripPre`), `refsOfPreimage`; the PINNED M15/M9/NEG-2 statements (coordinator-frozen, dispatch 2026-08-25) | — |
| `E2/Faithful.lean` | seat delivery (codex worktree, adjudicated 2026-08-25) | **M15** fresh + both L-faithful halves (reachable stores; H-injectivity only ever a hypothesis); **F/S, F/V encode injectivity** discharged as M4a corollaries |
| `E2/Closure.lean` | canon-refs lemma families (schema and value sides), `refsOfPreimage` characterizations | **M9** WF2 over stored bytes |
| `E2/Reject.lean` | the dangling-singleton derivation analysis | **NEG-2** unreachability, for every `H` and env |
| `E2/CanonIdem.lean` | W3-19 seat: the stable sort's own invariant (`CanonF`/`CanonVF`), proved on the bespoke carrier rather than cited from `List.mergeSort` (R-E §5.2 caveat). Only order fact used: `String.lt_asymm` | **S1 and its value twin, UNCONDITIONAL**: `canonS (canonS s) = canonS s` and `canonV (canonV v) = canonV v`, duplicate keys included |
| `E2/A4Probe.lean` | A-4 exhibits: the flat tuple-rest value conforms, the two-key record conforms, the old nested spelling still rejects (axiom-free), byte receipts for tags 0x3B/0x3C | smoke `example`s + `nested_still_rejects` |
| `E2/Gates.lean` | the opaque/unsafe scan (fails the build on any `partial`→opaque or unsafe constant in `E2` namespaces, exempting compiler `._unsafe_rec` companions); `#print axioms` reports | gate green at 1,672 constants |

Axiom posture: every proved theorem within `[propext, Classical.choice, Quot.sound]`
(several at `[propext]` or fewer). No `native_decide`, no Mathlib, no `partial`, no
`@[extern]`/`@[implemented_by]` in these namespaces.

Stated (seats, statements pinned): M11 idempotence, M18 conformance decidability.
S1 canon idempotence, both kinds, was stated conditionally on duplicate-freedom after
the M1 falsification (STORE-MODEL §7 A-3 record); W3-19/F-48 flipped the tie comparison
that caused the falsification, and both halves are now PROVED unconditional in
`E2/CanonIdem.lean`. Owed with named vocabulary dependencies
(see `E2/Model.lean` OWED block and STORE-MODEL §6): M10, M11-commutation, M16,
M17/M17′, M4b, M19. A-3 (WFS clause 4) and A-4 (`tupleRest` 0x3B / `record` 0x3C,
componentwise, guard-positive) both landed 2026-08-25.

## Not claimed

Nothing here claims anything about the pinned Effect implementation (correspondence is
the extractor lane's separate, gated business), any digest's cryptographic properties
(`H` is abstract; injectivity only ever a theorem hypothesis), the Effect runtime, the
TypeScript compiler, or any JavaScript host.

## Owed before this leaves the local repository

- **Dual-host re-check** (standing gate): rebuild + gate + axiom diff on the Windows
  host, absolutely clean, before any push or claim.
- `PROVENANCE.md` in the fips202 house form; KINDS.md rows; `mise` task wiring so
  `mise run check` covers this project; bundled `leanchecker` replay.
- R-1 ruling: mint the program name and context home; rename `E2` accordingly.
