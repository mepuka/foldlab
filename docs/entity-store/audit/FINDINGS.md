# FINDINGS — the program's append-only findings ledger

Schema and immutability rules: PROCEDURE.md §6. Rows append; a disposition cell is
updated exactly once, from OPEN to its resolution. Seeded 2026-08-25 with day one's
findings, in rough order of discovery.

| # | Date | Source | Finding | Receipt | Disposition |
|---|---|---|---|---|---|
| F-1 | 2026-08-25 | decode seat | fixed-width be64 frames truncate, falsifying encode injectivity | `E2/Encode.lean` header | Q10 amendment: unbounded LEB128 `encNat` |
| F-2 | 2026-08-25 | coordinator (pinning) | L-faithful is false over raw maps — a raw binding can fail `getChecked`'s hash check | STORE-MODEL §3 "reachable states" | M15 pinned over `Reachable` + hypothesis-free fresh half |
| F-3 | 2026-08-25 | coordinator (pinning) | spec-to-scaffold gap: §5 demanded `canonV`, `preimageE` embedded values as given — L-dedup silently failed for entities | STORE-MODEL §7 Q11 record | Q11: `canonV`, canonicalizing `preimageE`, M12E proved |
| F-4 | 2026-08-25 | scout B | Effect's codec path reorders union members (`makeReorder`), so an address at `ast` differs from one at `toCodecJsonAST(ast)` | B §census-gap; Schema.ts:15390 | G6: address subject is the AST as constructed |
| F-5 | 2026-08-25 | scout B | R-4 relabelling hole: annotations spread last + `Filter.annotate` + id dispatch lets a check claim to be a predicate it does not enact | B report, three pinned receipts | R-4 deferred to a dedicated session (G7); B's 75-site catalog is its input |
| F-6 | 2026-08-25 | scout B | `Json`/`MutableJson` are one `Declaration` differing only by an annotation string — annotation-insensitive addresses collide them | SchemaAST.ts:4352-4376 | informs `Declaration` REJECTED-v1 (MAPPING row 8); annotation identity → R-4 session |
| F-7 | 2026-08-25 | scout A | the natural mapping sends 21 Effect variants to 14 addresses; every collision is a pre-image byte equality (hash-independent) | A `p07_rollup` verbatim | G1 minted check-ids; MAPPING dispositions |
| F-8 | 2026-08-25 | scout A | `Value` has no float: `Schema.Number` cannot type 1.5; propagates to check payloads | A §3; Core.lean "no float" | G2: floats REJECTED-v1, explicitly; no silent int reinterpretation |
| F-9 | 2026-08-25 | scout A | the `mu` discriminator in the pre-image splits alpha-equivalent recursive schemas — the inverse of Unison's design | A `p05` | G3: discriminator stays in identity; alpha-invariance a recorded non-goal |
| F-10 | 2026-08-25 | scout A | tuple-with-rest and index signatures are inexpressible; the workarounds are wrong at the value plane | A `p03` `flat_rejected`, `object_exact_width` | G4 → A-4 landed (tags 0x3B/0x3C); MAPPING rows 4/18 MAPS |
| F-11 | 2026-08-25 | scout A | `.lit` is strictly wider than Effect's `LiteralValue` — the carrier admits schemas no source produces | A §3 dual | MAPPING admission rule 1 (`.lit` narrowing) |
| F-12 | 2026-08-25 | scout C | canon is an involution, not idempotent, on duplicate-key runs — both unconditional S1 obligations FALSE; the schemas are reachable because `WFS` lacks §5 clause 4 | `probe3_ties` (kernel-checked, coordinator-reverified) | S1 restated conditionally; A-3 implemented; M12/M15 unaffected |
| F-13 | 2026-08-25 | scout C | §16 provenance-merge and §17 naming-convergence die on array order-sensitivity; the `vobj`-key workaround provably loses WF2 coverage | C probes 2/4 | G5: no addresses in keys; set/map nodes = candidate A-5; claims demoted pending-A-5 |
| F-14 | 2026-08-25 | scout C | git delivers a SET of pre-images; `Reachable` is sequential; no theorem bridges them | C transport gap | M19 stated owed; R-15c holds no G1 claim until proved |
| F-15 | 2026-08-25 | scout C | L-comm is false as `StoreMap` value equality, true up to `find` | C probe 5 | M11-commutation must pin up to `find`-extensionality (STORE-MODEL §7 note) |
| F-16 | 2026-08-25 | A-4 seat | A-4 breaks the shell's exhaustive `renderSchema` match; the parser falls through silently | seat report finding 1 | closed at adjudication `e9b1bcc`: render/parse arms, gate round-trips, script 10 |
| F-17 | 2026-08-25 | A-4 seat | `Correspondence` part (1) never gained an `address` ascription at A-1 | seat report finding 2 | closed at `e9b1bcc` |
| F-18 | 2026-08-25 | A-4 seat | byte-literal equalities through the mutual encoder yield to neither `decide` nor `rfl`; `simp` with the named equation lemmas works | seat report finding 3 | house lesson; carries into the next brief |
| F-19 | 2026-08-25 | A-4 seat | `tupleRest` conformance is syntax-directed — `ConformsL` is lockstep, the split point is forced | seat report finding 5 | pinned in STORE-MODEL §7 for the M18 seat |
| F-20 | 2026-08-25 | coordinator | the no-push posture had no mechanism: `origin/main` advanced and a codex branch reached the remote (pusher UNVERIFIED) | audit day-one §5.2 | push guard hook installed (audit §6.2); remote branch deleted by operator ruling |
| F-21 | 2026-08-25 | coordinator (adjudication) | SHELL-v0 predates A-3: the boundary does not name `dupFreeS`; operationally covered by the canonicity byte-compare | STORE-SHELL §9 | OPEN — follow-up owed: boundary names `dupFreeS` explicitly |
| F-22 | 2026-08-25 | coordinator (audit) | spec-to-scaffold transcription is untracked — two same-day instances (F-3, F-12) | audit day-one §5.1 | clause-conformance table ratified as promotion requirement (audit §6.1) |
| F-23 | 2026-08-25 | coordinator (pinning B4) | `canonS` passes `lit` payloads through while `canonV` sorts the same bytes — the unconditional conformance bridge is false; one carrier, two canonical forms | probe: `canonS (.lit unsorted) == .lit unsorted` → `true`, `canonV unsorted == unsorted` → `false` | B4 pinned conditionally on `litsCanonicalB`; Q13 (canonS canonicalizes lit payloads) OPEN |
| F-24 | 2026-08-25 | coordinator (pinning B4) | the bridge's `refine` case requires `checkSem` invariance under `canonV` — order-insensitivity is an admission criterion for checks | B4's env hypothesis, `E2/Bridge.lean` | routed to the R-4 dedicated session as an allowlist admission criterion |
