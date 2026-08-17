# Plait technical-research radar — first hourly pass

Date: 2026-08-17  
Board: Multica workspace `Dev`, project `plait`  
Repository baseline: `018efb94d` (`main`)  
Method: issue bodies, bounded comment-thread reads, run state, merged records,
and pinned-source/probe follow-up where a claim crosses the model/runtime or
runtime/substrate boundary.

## Purpose and selection rule

This is not a second code-review queue. A ticket enters the research lane only
when one of these is true:

1. a theorem's carrier or premise may not match the runtime carrier;
2. a runtime safety claim relies on a substrate fact not represented in the
   model;
3. a test wall may establish consensus while lacking an independent oracle;
4. a design decision would materially benefit from primary-source prior art;
5. a small executable probe can distinguish two plausible readings.

The first scan found 35 Plait issues, 17 already done. The recent activity is
concentrated in DEV-711 (register), DEV-712 (durable fold, queued), DEV-713
(model-faithfulness CI, blocked), DEV-716 (substrate gate, in review), and
DEV-717 (hygiene review findings).

## Immediate investigations

### P0 — DEV-711: register safety across KV lifecycle boundaries

The F5 model has five actions over `(token, holder, outcome?)`. The runtime maps
the token to JetStream KV revision CAS. DEV-704 established that terminal
immutability is supplied by the credential/shape guard, not the data mechanism.
That makes bucket/stream lifecycle a load-bearing boundary: if destroying and
recreating the bucket resets revisions, an old fencing token may become current
again, a transition absent from the five-action model.

The completed probe separates operations that must not be conflated:
per-key delete, per-key purge, whole-stream purge, and bucket/backing-stream
delete plus recreate. Bucket/stream recreation resets the revision to `1` and
lets an old token `1` land; the purge/delete cases preserve the numeric epoch
but forget terminal state. The result belongs in DEV-711's claim bounds or in
a ratified model/runtime change; it is not an implementation detail to absorb.

Durable report:
`docs/research/2026-08-17-dev711-register-lifecycle-audit.md` (complete).
The minimized finding was posted to DEV-711 as comment
`d9f56ed6-65f6-437c-88c1-f009fedb6ae3`.

### P0 — DEV-712: partition-local successor discipline over a global sequence

DEV-712 fixes the lawful pump to contiguous `floor + 1` draining within each
partition, and fixes message position to JetStream stream sequence. The merged
spine uses one stream over `flb.fab.ev.*.*`, while the terminal subject token is
the partition. On that topology, ordinary interleaving can give partition A
positions `1, 3` because partition B occupied stream sequence `2`.

The question was not whether the implementation can buffer a gap. It was whether
the missing position is even an event of A that can ever arrive. The probe also
checks consumer sequence: if redelivery increments it, it is not a stable event
ordinal and cannot replace stream sequence in the model correspondence.

The pinned probe confirmed the mismatch: A observed stream positions
`[1, 3, 5]`, B observed `[2, 4, 6]`, and consumer sequence advanced on
redelivery. The missing per-partition positions belong to other filtered
subjects and can never arrive.

Durable report (separate branch `agent/research/DEV-712`):
`docs/research/2026-08-17-dev712-partition-position-audit.md` (complete).
The minimized finding was posted to DEV-712 as comment
`8b5a2f7b-9c80-462d-9fd4-a08188e13e8e`.

## Next research targets, ranked

### P1 — DEV-712: crash cut between anchor CAS and acknowledgement

After the position-carrier question is disposed, audit every crash cut around
state application, anchor CAS, and message acknowledgement. The spec's ordering
(`acked` is a subset of `anchored`) is promising: anchored-but-unacked should
redeliver and be absorbed by the successor discipline, while acked-but-unanchored
is the named negative control. Pertinent evidence is a real-server cut-point
matrix and exact correspondence to the composed F3/F2b vectors. Generic
"exactly once" literature is useful only as a foil because the spec explicitly
declines that claim.

### P1 — DEV-713: provenance and reproducible verifier bundles

Research is useful after its blockers merge. The useful prior-art questions are
artifact identity, source-to-binary provenance, and reproducible rebuilds; the
current issue already distinguishes a required no-Lean drift tripwire from the
fresh Lean execution that catches a forged baseline. The next pass should test
whether every claim in the planned bundle has a verifier independent of the
producer, rather than merely collecting broader supply-chain guidance.

### P1 — eventual E12 implementation: F11/F12 carriers

DEV-706's grill is settled, so no more concept research is needed now. At build
time, verify the two load-bearing carriers directly: list-level deterministic
`topK` with an identity tie-break (F11), and greatest-token resolution from seal
data under the explicit `SealsWellFenced` premise plus a map-to-set ACI package
(F12). The binding acceptance bars are already in
`docs/research/2026-08-17-plait-proof-program.md`; another broad CRDT survey
would add little until code or theorem statements exist.

### P2 — future E6 contexts

DEV-688 will merit a dedicated determinism audit when specified: canonical
input valuation, stable ordering/tie-breaking, declared volatility, and whether
memo keys cover every semantic input. Today it is only an epic-shaped issue, so
research would be speculative.

## Explicitly not selected this pass

- **DEV-717:** the surviving findings concern TypeScript overload introspection,
  recursive conditional-type cutoffs, and local/CI install parity. They are
  material review findings, but source-level repairs and bounded controls are
  the right tool; literature is not the bottleneck.
- **DEV-716:** the eight-suite substrate gate is already grounded in pinned
  source plus minimized real-server traces. Review should test the gate and its
  negative controls. A general JetStream survey would dilute stronger evidence.
- **DEV-714:** cancellation/process-tree semantics is an operations defect in
  Multica's Windows runtime. It matters operationally but is outside Plait's
  mathematical and architectural claim lane.
- **DEV-715:** turning quickstart snippets into executable doctests is a known
  documentation-testing task with a clear oracle (the files execute and the
  page byte-diffs). No deep research question is presently open.

## Recurrence rule

Each hourly pass first checks whether either P0 question has an unresolved
disposition or new evidence. It continues that line if so. Otherwise it rescans
recently active Multica threads and selects at most one new load-bearing claim
using the five criteria above. Material findings are posted to their issue;
ordinary notes remain in the research record.

## Hourly continuation — 15:20 UTC

The board moved from 37 issues / 20 done at the preceding scan to 38 / 21.
DEV-720 was created and closed as a targeted hygiene re-review; its residuals
are compiler-surface and test-gate review work, not a new literature bottleneck.
DEV-711 has no replacement head or coordinator ruling. Its executor accepted
`DEV711-LIFECYCLE-1`, withdrew the unqualified runtime/ledger claim, and left
PR #74 not merge-ready.

The exact PR #74 audit is now durable at
`docs/research/2026-08-17-dev711-pr74-lifecycle-closure-audit.md`. It confirms
that the five-action theorem remains sound, while the runtime bridge has no
incarnation state, credential guard, or fixed-incarnation bound. A particularly
strong test-specific witness is that the TypeScript replay destroys and
recreates `flb-fab-reg` after every row and expects token `1` again, but drops
the old token before the cross-incarnation stale commit that would expose the
bug.

DEV-716 / PR #73 also advanced and remains changes-requested. Its round-two
credential probes now cover stream DELETE/PURGE and KV backing-stream deletion,
but a reviewer widened only `$JS.API.STREAM.UPDATE.>` and successfully changed
`MaxMsgs` to 1, evicting two of three frames while the suite stayed green. This
is pertinent to the same design choice: a fixed-incarnation/terminality guard
must cover configuration authority, not only operations whose names sound
destructive. It remains an operational premise, outside the Lean transition
system and not yet bound to the register runtimes.

No new Multica comment was posted this hour. The original counterexample is
accepted and stopped on, and DEV-716 already carries the newer UPDATE witness;
duplicating either would add notification without evidence. The next best
research target remains the disposition itself: after the coordinator chooses
fixed incarnation versus epoch-bearing identity, test the selected boundary
against stream update, snapshot/restore/import, account/credential replacement,
and operator rollback. Until that ruling, broad lease or consensus literature
is not pertinent because it cannot determine the missing semantic identity.

## Hourly continuation — 17:28 UTC

The board is now 39 issues / 23 done. DEV-711 and its E5 epic closed after PR
#74 merged at `bd1c7e3dd`; the separate ledger commit is `5004471ae`. The
landed claim is honestly bounded to one fixed backing-stream incarnation, with
the creation-time pin explicitly deferred in `packages/plait/DECISIONS.md` T6.
DEV-721 moved in progress after that merge. DEV-716 remains in review and its
draft PR is now conflicting with main; there is no newer review evidence than
the round-two UPDATE finding.

The newly ruled suggestion to use JetStream stream creation time as a future
incarnation pin was tested against pinned source and the exact standalone
file/R1 server. It is not a sound safety epoch:

- snapshot at revision 1, commit outcome A, delete, then restore the snapshot
  preserves the same `StreamInfo.Created`, restores revision 1, and lets the
  pre-deletion token 1 land outcome B at revision 2;
- restart followed by a no-op stream update and another restart changes the
  reported creation time without replacing the logical stream; and
- an info comparison is a separate request from numeric revision CAS, so even
  per-operation checking has a deletion/recreation TOCTOU gap.

The primary-source cause and real-server traces are recorded in
`docs/research/2026-08-17-dev711-created-time-incarnation-audit.md`, with the
probe under `docs/research/reference/dev711-created-time-incarnation/`. The
finding does not retract the merged ledger row because that row chose the
recorded deferral. It does constrain the next repair: `Created` may diagnose a
violated operational premise, but equality cannot prove continuity. The
load-bearing guard remains restricted application credentials plus an
administrative procedure excluding delete, restore, rollback, and update while
issued tokens are live. The next best probe target is the repaired DEV-716
credential itself after its next head: verify both the denied management API
surface and that the register runtime actually uses that identity.
