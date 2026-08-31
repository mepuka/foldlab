# Benchmark candidate cases

Mined 2026-08-30 from the canonical history (614 commits since
2026-08-24), the audit ledgers (`docs/entity-store/audit/FINDINGS.md`,
55 rows; `2026-08-25-wave2-faults.md`, 21 faults), the 13 PDD
contract/attack/fix triples, the operational audits, and the algebraic
reviews. Law: [../BANK.md](../BANK.md) §Benchmark.

**Read fence.** This file is for the PREPARER. A session about to run
[../LOOP.md](../LOOP.md) against a packet must not read this file, the
evidence trails it names, or anything under `bench/answers/` (local-only;
holds the per-case resolution lines and the full mining report). Peeking
⇒ the run rows as `contaminated`.

Class: **a** = specification/wording defect, **b** = invariant/proof
failure, **c** = clean slice (control). Seed classes abbreviated:
ADM admission failures, CAN canonicalization divergence, RCH
reachability gaps, DUP duplicate-chunk/index wording, SIDE side-carrying
proof format, RETRY retry/replay mistakes, PKEY parser duplicate keys,
OPEN unguarded/open-schema.

| id | cls | seeds | case | evidence |
|---|---|---|---|---|
| BC-01 | b | CAN,PKEY | canonicalizer is an involution, not idempotent — palindromic duplicate-key record defeats re-canonicalize-and-compare admission | FINDINGS F-12/F-40/F-48 |
| BC-02 | b | CAN | boundary rejects non-palindromic duplicate-key bytes it itself produced | FINDINGS F-41 |
| BC-03 | b | CAN | names case-sensitive in model, case-folding on disk; both sides exit 0 while disagreeing | FINDINGS F-39 |
| BC-04 | b | RCH | M17 typed-reachability premise checked on raw carrier while store persists the canonical form | FINDINGS F-25 |
| BC-05 | b | RCH,OPEN | `check` clean does not imply Reachable: open de Bruijn var and unguarded mu store clean | FINDINGS F-33 |
| BC-06 | b | RCH | acyclicity independent of WF1+WF2 and never checked; a cycle passes every gate | wave2-faults §F-32 |
| BC-07 | a | RCH | M19 insertion-order claim refuted four ways while still prose | FINDINGS F-30 |
| BC-08 | b | RCH | `.lit (.vaddr a)` hides an address from `refsS`; reference-closure blind spot | FINDINGS F-35 |
| BC-09 | b | ADM,PKEY | duplicate-key VALUES constructible and reachable exactly where canon-idempotence goes vacuous | FINDINGS F-28 |
| BC-10 | b | OPEN | trust instrument evadable three ways (roots outside scan; underscore naming; shadowable digest fn) | FINDINGS F-43 |
| BC-11 | b | ADM | verify-on-open not total: FIFO/dir at a valid-looking address crashes; exit 1 ambiguous with "violations found" | FINDINGS F-42 |
| BC-12 | b | PKEY | new schema variant silently fell through the shell's exhaustive render match | FINDINGS F-16/F-17 |
| BC-13 | c | — | control: acyclicity survives adversarially-colliding hashes (putPre no-ops on occupied address) | FINDINGS F-31 |
| BC-14 | c | — | control: listing order unobservable; nodup companion invariant proved as sharpening | FINDINGS F-38 |
| BC-15 | b | — | CANON-1 theorem caught a live address split in an unrelated cleanup, pre-ship | commit `bf931052` |
| BC-16 | c | — | control: PDD-2 wp transformer held under 15 attack families, zero soundness defects | commits `c6f74608`, `49def8da` |
| BC-17 | b | — | PDD-1 attack: two proof holes owed, both mechanically closed on re-run | `3224fd93` → `9ba01f35` |
| BC-18 | a | OPEN | PDD-3 prose claimed productivity ("never terminates") where the door decides constructibility | commit `f8a2da76` |
| BC-19 | b | — | PDD-3 first-round genuine BREAK; grade withdrawn; closed only on round two | `768f5fb6`, `ee9a1981`, `c700279d` |
| BC-20 | b | — | PDD-4 double BREAK, one disease: implementation discharged the FALSIFIER, not the LAW | `c9e9bc17`, `d5d89188` |
| BC-21 | a | RETRY | PDD-6 docstring "receives none twice" vs proved "none twice at the same mark" | `c66295ec`, `0c98443f` |
| BC-22 | a | — | PDD-7 review's supporting exhibits were gitignored: "the exhibits do not exist" | `c2686dc6`, `b9283eda` |
| BC-23 | b | — | PDD-7 sum algebra: two holes; the non-vacuity pin then applied uniformly across rows | `e1ceb205`, `cf91531c` |
| BC-24 | a | — | PDD-8: seven claim-scope gaps, no false law | `6e6fa80a`, `d74e6ee0` |
| BC-25 | b | — | PDD-9: coverage hole — not all seven registered programs exercised | `e2703228`, `05dc3b65` |
| BC-26 | b | — | PDD-12 self-tests cut to the extractor's parse shape; 14 forbidden shapes admitted; two-space indent evades detection | `a316fe48`, `5e080d8c` |
| BC-27 | a | — | PDD-12's own laws L2/L3 refuted by real historical loops; tagged SPEC-BUG in-repo | `521f868d` |
| BC-28 | a | DUP | MRK-010 wording "never verifies at another index" false for a legitimately duplicated chunk | archive CONFORMANCE-WORKFLOW.md:911-915 |
| BC-29 | a | SIDE | side-carrying Merkle proof format admits forgery under an injective hash | `d4f2d87a`; effect-replay CONTEXT.md:507-509 |
| BC-30 | b | DUP | word-log count divergence — Lean dedupes on `.duplicate`, TS pushed unconditionally; a green test asserted the divergence (fixed 2026-08-30, working tree — see CX-007) | word-store.md:340-367 (= CX-007) |
| BC-31 | c | — | control: AlreadyResident idempotent put gated cleanly on the shared-chunk vector | word-store.md:237 |
| BC-32 | b | ADM | phantom store: explicit `--store` typo path silently creates a fully-formed store, exit 0 | CLI-AUDIT §3, E11/E13 |
| BC-33 | b | OPEN | unreadable config read as absent → `anonymousReads: true`; doctor reports the open default as correct | AUTH-AUDIT §A3 |
| BC-34 | b | OPEN | `--allow-host` transitively grants browser-origin write trust to the byte plane | AUTH-AUDIT §A4 |
| BC-35 | b | CAN,DUP | R11 split-brain: two extraction legs each read a private manifest copy; agreement by accident | commit `6b9a7e17` |
| BC-36 | a | — | ruling 7 "Option A" premise false: the pin already IS upstream HEAD; second grammar defect at every pin | SPECS ruling 7/13; D1-OPTION-A-SCOPING.md |
| BC-37 | c | — | control: oxc Stage-1 third extractor leg landed through the cross-instrument gate — six blob-verified files, zero parse errors, five enumerations agreeing, inventory byte-identical across instruments | TOOLS.md oxc-parser Stage-1 role row (2026-08-29); `mise run check:extract-oxc` |
| BC-38 | c | — | control (restore-correctness slice only): litestream replicate→restore re-verified through the full read law — digests recomputed, canonical re-decode, roots compared exactly; the replica-lag gap is a separately named open item, out of slice | TOOLS.md litestream row; `library/effects/scripts/litestream-check.ts` |
| BC-39 | c | — | control: conformance-vector replay lane — every recorded vector replays on the host with the same admission order and addresses | `library/effects/test/ConformanceVectors.test.ts:27-49` |

## Toward the 24 packets

Target composition (plan): 8 × class a, 8 × class b, 8 × class c.
Stock after the 2026-08-30 control top-up: 9 a, 23 b, 7 c
(BC-13/14/16/31/37/38/39) — **one control still owed**. PDD-13 was
examined and refused as a control: no breaker pass has adjudicated it
yet, so its cleanliness is unestablished. The preparer selects 24,
balances shapes (relational / algorithmic / transition-trace), freezes
pre-defect snapshots, and writes `bench/answers/<id>.md` from the
answer lines already staged in `bench/answers/` (local).
