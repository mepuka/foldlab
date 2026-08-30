# Session 2026-08-29 late — the full push (foldlab-f7, coordinator)

Pointer-shaped session record + BLACKOUT HANDOFF. Written at 93%
session usage on operator order: wind down, document, preserve.
A fresh session resumes from HERE.

## Rulings made (all in docs/SPECS.md decision record)
- 28: the grilling docket ratified whole (the docket file is
  .staging/operational-structure/GRILLING-DOCKET-2026-08-29.md,
  Category-1 row) + the Fable-plans/Opus-hard-reviews protocol.
- 29: front end authorized — ornamentation, Paper tier-one.
- 30: productization call.
- 31: streaming integrations (a), algebra expressiveness (b), auth
  audit (c), PLAIN-LANGUAGE PRIORITY (d), WASM canvas (e).
- 32: daemon's three releases — /projections released; SERVING.md
  promoted to Category 1 + moved to library/effects/;
  PROFILE-CAS-HTTP-0 §14 co-tenancy clause (versioning event).
- 33 + correction: ornament coordination; Codex is SUPPORT only,
  the frontend lane owns .staging/ornamentation/ entirely.

## Landed on main this session
5e9d8ad3 (28-30), 4ff5fb82 (31), 1f53b5f8 (32-33), 666d2f2d (33
correction), plus the docket file and ornamentation/COORDINATION.md.
Rescue branch rescue/r5-scheme-mismatch-diagnostic (dd54bc5f) — the
killed Fable's R5 fix, reviewed (both CLI lenses), folded into the
CLI fix pass.

## The merge/review board at blackout
Protocol: decision 26(b) — two Opus lenses per Fable seat, then a
consolidated fix pass, then the coordinator merges to main.

| Seat | Branch | State |
|---|---|---|
| CLI naming + R5 rescue | merge/cli-naming (wt: scratchpad/m3-cli-wt) | Both lenses MERGE-WITH-FIXES; consolidated fix pass RUNNING at blackout. Fix list = 2 blockers (everyday word off-registry; help --json) + S1-S8 + rescue reshape + paperwork 9-12. If pass completed: verify gates, merge to main. If died: re-dispatch from the fix list in the review outputs (task files a383a..., afac0...). |
| cas_word (seat 3) | merge/cas-word (wt: scratchpad/m2-casword-wt, merged tip ad44b40b) | Both lenses MERGE-WITH-FIXES; consolidated fix pass RUNNING. Required: F1 torn-tail-newline lie, F2 cross-process wedge, F3 swallowed diagnostics + F4-F9 + law L1-L5 (BACKEND.md layout+rsync carve-out; one worded composition; next through schema; prose softening; gloss alignment). Lean touched → check:cas mandatory. |
| daemon (seat 1) | merge/daemon-spine (wt: scratchpad/m1-daemon-wt, tip 0aeeefd7, 346 tests green) | Law lens DONE (MERGE-WITH-FIXES); CORRECTNESS LENS RUNNING at blackout (task a35ab... was law; correctness is afb9e-sibling — see tasks dir). FIX PASS NOT YET DISPATCHED. Its brief, preserved below. |

### The daemon fix-pass brief (dispatch when correctness lens is in)
Apply on merge/daemon-spine: (1) decision 32(a): keep /projections,
cite the release in code docstring + update FRONTEND.md:116's
static-host story; (2) 32(b): git mv docs/lab-core/SERVING.md →
library/effects/SERVING.md, promote its SPECS row to Category 1,
fix library/effects/AGENTS.md pointer; (3) 32(c): add PROFILE-CAS-
HTTP-0 §14 co-tenancy (additive; enumerate /mcp /metrics
/projections prefixes; profile owns its three spaces within the
authority), soften daemon totality wording to "every unclaimed
exchange" (http.ts:19-21 + SERVING.md route table); (4) F2:
VOCABULARY.md rows for the daemon's everyday words (daemon, plane,
heartbeat, stall, origin...) via the same-act precedent, and fix
:49 "in flight" to per-plane truth (2x worst case); (5) F4: grade-A
bodies on RefusedHost/RefusedOrigin/un-emitted projection for
non-wire planes (planeOf already computed at :544; wire plane may
stay octet-bare); (6) F6: provenance pin for the MCP-spec changelog
claim (SERVING.md:158-168) or mark pending; (7) F7: fix
.github/workflows/check.yml:48-53 known-red line 401→766. Then
gates: typecheck (one warning = the declared known-red), lint 154
baseline, tests 346+, ServingDoc/RpcFrameCapPin. Then two-lens
verdicts are satisfied → merge to main.

### Merge order into main (after fix passes green)
1. merge/cli-naming FIRST (it FIXES main's known-red typecheck
   commands.ts:766 — never cherry-pick, always the merge).
2. merge/cas-word (check:cas full).
3. merge/daemon-spine (after its fix pass).
Then: decision 34 to record at merge time — the cas_word seat's
in-session rulings (bytes-first/receipt-second, fail-together,
optional log lawful, the history-row reword) cited to decision 28.
Then re-run mise run check:ci on the result. Then the GATEKEEPER
(decision 27) dispatches against the settled floor —
scratchpad/GATEKEEPER-BRIEF.md holds the draft brief (superseded in
part by the docket's strikeouts; reconcile before dispatch).

## Research/planning agents RUNNING at blackout (outputs land as
files; if died, re-dispatch from these briefs)
- FABLE PLANNER → .staging/operational-structure/CORE-ABSTRACTIONS-
  PLAN.md (uncommitted). Mandate: docket Tier-1 execution plan,
  proof grill sketches+decomposition, hard parts, decision 30
  productization, PLAIN-LANGUAGE FIRST, algebra-expressiveness +
  horizontals section (decision 31b). PROTOCOL: Opus 5 hard review
  BEFORE commit (decision 28) — NOT YET DISPATCHED.
- FRONTEND LANE → .staging/ornamentation/{ORNAMENTATION,PROOF-
  OBLIGATIONS,WASM-CANVAS}.md (owns the dir; Codex is support only).
- STREAMING RESEARCH → .staging/research-backlog/agent-streaming-
  integrations.md (pi dev + extension system, protocol landscape,
  estate design sketch).
- AUTH AUDIT → .staging/operational-structure/AUTH-AUDIT.md
  (decision 31c; audits merge/daemon-spine floor; BROKEN-SILENT
  grading).
Uncommitted outputs from these are PRE-GRADE; review then commit
with SPECS rows per the maintenance law.

## Pending inputs
- Seat replies to the grilling solicitation: foldlab-00, foldlab-bf,
  wizardly-blackwell-2d1862-d2, effect-nats-48/38 (c7's reply is
  banked in the docket). Fold any that arrive as docket addenda.
- The killed Fable's worktree agent-a1997956e8eab5080 (locked, pid
  4945): its diff is rescued+landed via dd54bc5f; worktree can be
  released when its process exits.

## Debts this session opened
- Turso token rotation (operator, personal) — file untracked+
  gitignored, never committed/pushed; verified.
- Decision 34 (cas_word in-session rulings) owed at merge.
- Queue propagation of docket rulings into owning specs (rides the
  planning lane).
- main is ~38 commits ahead of origin — push when the operator
  chooses.

## Blackout log — completions after the record was cut
- FABLE PLANNER DONE: .staging/operational-structure/CORE-
  ABSTRACTIONS-PLAN.md written (UNCOMMITTED — decision 28 protocol:
  Opus 5 HARD REVIEW before commit; that review is the NEXT
  SESSION'S FIRST DISPATCH). Plan highlights the next session must
  heed: §1 four docket entries ALREADY DISCHARGED on main (proof-
  grill E and F closed by 698b2f18/Defun.lean; Tier-1 item 4's
  lowering landed 659a909d; CANON-1 implemented at the authoring
  door System.lean:89-100) — land the strikeouts before any lane
  re-plans landed work. MERGE CAUTION from §0: the seat branches
  were cut pre-docket — when merging to main, VERIFY docs/SPECS.md
  decisions 28-33 survive each merge. Hard-parts register §4 (9
  items) includes: CANON-1 permutation theorem FALSE without Nodup
  keys; annotation-bag size unmeasured (measurement slice first);
  Prop spelling scout-only.
- DAEMON CORRECTNESS LENS DONE (pre-blackout): MERGE-WITH-FIXES,
  "land it" — S1 case-sensitive host/origin allowlists (breaks the
  documented proxy deployment), S2 /projections serves 1/7 artifacts
  from the published package, S3 Prometheus duplicate +Inf bucket
  (upstream; fix via explicit boundaries), S4 port-bind failure
  escapes the register and mis-diagnoses, S5 idleTimeout inert on
  the Bun pin, S6 session map documented-not-bounded (+33.7MiB/4000
  sessions), S7 URL-pathname percent-encode nit, S8 --otlp silent
  failures. All merge-agent fixes verified sound; SIGKILL/SIGTERM/
  clamp/inflight probes all exact.
- BLACKOUT killed: CLI fix pass (m3-cli-wt: both merges COMMITTED,
  fix work dirty on 5 files), cas_word fix pass (untouched),
  auth audit (nothing), streaming research (partial file exists),
  front-end lane (ALL THREE FILES WRITTEN pre-kill).
- MISROUTE note: the planner never received the 31(b)/(d) update
  (delivered to the daemon reviewer, who refused it) — the plan's
  hard review must check for the algebra-expressiveness section and
  plain-language-first sequencing, and require them if absent.
- Usage reset; all lanes re-dispatched.
- FRONT-END LANE COMPLETE: three ornamentation deliverables finished
  and rowed (Category 2). WASM position: DOM-first, falsifiable
  escalation trigger; trust as the design material. Ruling ask
  surfaced: Ts.Decl N-parameter arrow arm (blocks FE-O1/2/3).
