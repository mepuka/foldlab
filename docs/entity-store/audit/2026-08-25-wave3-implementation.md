# Audit — wave-3 implementation (2026-08-25)

Companion to `2026-08-25-wave3-design.md`, which recorded the design pass through the
docket ruling and batch-1 dispatch. This entry records the implementation wave:
ten Opus seats, every one adjudicated on the merged state, from ruling to green in one
day.

## 1. State at entry

Rulings W3-1..25 taken (RULINGS.md); registry amended; batch-1 seats dispatched.
Ground gates: E2 at 1,444 constants; shell G-S1..G-S4 at 884; harness ten scripts.

## 2. Trail (26 commits, `0f930a2..8922b6c`)

Seats in adjudication order, each merged with full rebuild + gates + harness on the
merged state, worktree and branch deleted at adjudication:

1. **Spec-text** (`df7507f`) — the ruled STORE-SHELL/STORE-MODEL amendments; five
   editorial flags corrected at adjudication (`f7563fc`).
2. **Window A** (`b44b9c6`) — A-6 + F-26 equations; zero proof repairs; R1's sweep
   replayed against the landed code. Same-day script landed later (`9ec56a0`).
3. **Context ratification** (`b24b8b2`) — CONTEXT.md, R-1 discharged, operator
   in-session.
4. **fips202** (`4603b3d`) — the F-47 quadratic removed from both digest paths;
   bridge repaired, statements untouched; post-fix doubling ratios ~×2.0 to 1 MB.
5. **Window B** (`b2b5013`) — Reachable on stored forms + dupFreeV; WFS at five
   clauses; Graph + Admission minted; B4 retired; M17/M17′/M19 pinned. Coordinator
   addendum `741a3d9`: carrier-level admission verdicts with proved iff bridges.
6. **M17 proof** (`63a5d76`) — typed reachability kernel-checked, no `H`-injectivity.
7. **F-42 shell** (`5c24f21`) — StoreFault, symlinkMetadata discipline, G-S5
   (negatively validated), three-way exit contract.
8. **Boundary wiring** (`af13824`) — the shell decides the model's premises in the
   ruled order; Kahn's live with the `order` verb; `(place …)`; scripts 12–22; the
   one ratchet flip (`11-a6-lit-canon`, W3-18's honest outcome).
9. **Flip window** (`4f118d8`) — stable tie handling both planes; S1 idempotence
   unconditional and PROVED; the W3-13 rationale rewritten to its post-flip form.
10. **F-39 names** (`6307738`) — hex name files, 64-char cap, `names` verb; r2-11's
    divergence now a committed PASS.
11. **Residual pins** (`f4c432c`) — all four W3-22 pins stated AND proved: M10 rank +
    WF3, M11-comm + `reachable_keys_nodup`, the `version_byte_separates` family,
    `intraKindFaithful`.

## 3. Workflow observations

- **Every worktree seat was cut from a stale base** (`f3f0988`, pre-wave-2) and had to
  fast-forward to main before working. Every seat detected and handled it because the
  briefs carried a base-verification step after the first seat reported it. Standing
  brief clause from here on.
- **One Lean seat at a time after mid-wave**: the boundary seat found the machine at
  19.6 GB swap under six competing Lean processes. Serializing the remaining seats
  cost nothing (each was on the critical path anyway).
- **The STOP discipline was never used in anger** — ten seats, zero STOPs — but the
  flagging discipline was used constantly and well: every seat surfaced its judgment
  calls for adjudication instead of deciding silently, and three seat flags became
  adjudication corrections or findings (F-52, the README count drift, the M19 shape).

## 4. What worked

- **The (i-a) bet paid exactly as analyzed**: zero statements restated outside the
  ruled set, three proofs touched, two shorter, M17 then proved with every ingredient
  already in-tree.
- **Ruling-before-seat made the seats mechanical.** The one place a seat faced a
  genuinely underdetermined shape (M19 vs the Conforms exclusion), the two ruled
  constraints jointly forced the resolution, and the seat found it.
- **The ratchet flip discipline carried its first real case**: `11-a6-lit-canon`
  flipped from dedup-assertion to rejection-assertion with the full why recorded in
  the fixture — "the dedup claim moved from provable-at-the-shell to
  true-and-unreachable."

## 5. Failure modes and lessons

- **Skeleton optimism.** R-D's M17 step 4 said "M13 frames both bindings"; the
  schema's binding actually needs WF2 through the resolver. Cost: eleven helpers, not
  four. Lesson: a proof skeleton's implicit dependencies are findings-in-waiting;
  briefs should ask the seat to name them.
- **A coordinator-authored fixture aged in hours.** The A-6 script asserted a dedup
  observable that W3-18 (ruled the same morning) made unreachable. No harm — the flip
  is the record — but same-day script obligations should be written against the
  END-of-docket ruling set, not the mid-wave state.
- **README-local finding numbers collide with the program ledger** (the shell README's
  F-1..F-12 vs FINDINGS.md's F-numbers). Rename the README series (SF-n) at the next
  shell delivery; the ledger extractor should refuse ambiguous citations.
- **Fixture coverage can vanish silently when both runners move together** — the F-39
  seat's re-spelled stray fixtures stayed green through a representation change that
  changed what they exercised. Its declaration of the re-spelling is the model
  behavior; a future differential-of-differentials (transcript diffing across
  commits) would catch this class mechanically.

## 6. Standing amendments

None proposed. One open ruling carried: **F-52** (place-symlink/place-fifo need a
capability the pinned toolchain lacks; recommendation on the table is accepting the
hand-exercised residue).

## 7. Numbers

26 commits; 10 seats + 1 coordinator addendum, all adjudicated same-day; gates
1,444 → **1,707** constants (E2) and 884 → ~1,100 (shell, now five legs G-S1..G-S5);
harness 10 → **26 scripts**, green at every adjudication; axiom allowlist unchanged
throughout — every report within `[propext, Classical.choice, Quot.sound]`.

Newly proved today: `M17_typed_reachability` · `S1_canon_idempotent` ·
`S1_canon_v_idempotent` · `wfsB_iff` · `schemaAdmissionClause_none_iff` ·
`valueAdmissionClause_none_iff` · `M10_rank` · `M10_wf3` · `reachable_keys_nodup` ·
`M11_comm` (+ keys-nodup half) · `version_byte_separates` (+ bump) ·
`intraKindFaithful` · the fips202 bridge repairs.

Residue, named: M17′ (`ObligationM17'_store_env`) · `ObligationM19_transport`'s proof ·
M18 decision procedure · M16 · M6 (now a two-liner, flagged) · `ObligationCanonSorts`
(now a short corollary) · F-52's ruling · the name-file content clause (family-3
residue) · the R-4 session (F-5/F-24/F-29 + the payload invariance) · the R-2
carrier-narrowing window (F-51) · LEDGER.md (codex worktree 5, in flight) · the
dual-host Windows leg · migration steps 4–6 (ledger join, editorial window, retire
the review).
