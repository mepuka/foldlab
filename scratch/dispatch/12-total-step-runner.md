# The calculus made total on refusal: stepK closes MOVES-1

Issue: DEV-671 (slice stage 1, parent DEV-664)

## Why now

Ratified 2026-08-15 after the independent review: two agents
independently named this the precondition for the vector wall.
`stepTrace` kills a whole trace at the first refused move while the
daemon refuses and continues (audit MOVES-1); a bag of three distinct
fills at one hole has zero admitted runs, so `no_loss` is vacuous
over exactly the contention workloads the calculus exists to govern.
The corpus must not freeze that partiality into the artifact — ioco's
quiescence lesson: the model must be able to consume every observable
the implementation can emit, including rejections.

## Scope

Extend `verify/moves/Moves/Model.lean` (the ratified exception to the
model freeze; everything else in the moves lane stays behind it):

1. `stepK : State → Mv → State × Bool` — the total step: admitted
   moves agree with `step`; refused moves return the state unchanged
   with `false`.
2. Agreement lemmas pinning `stepK` to `step`:
   `stepK_agrees : step s m = some s' → stepK s m = (s', true)` and
   `stepK_refused : step s m = none → stepK s m = (s, false)`.
3. A total trace runner (`runK`), and the same for the repair path
   (`repairK`, `runRepairK`).
4. Restate the headline laws over the total runner where they
   strengthen: at minimum `no_loss` over complete `runRepairK`
   executions of arbitrary intent bags — no admitted-only
   restriction. Existing partial-run theorems stay untouched.
5. A negative control in the house tradition: a workload containing a
   refused move where the partial claim is vacuous and the total
   claim bites.
6. Gate: the new theorems join the axiom-footprint roster in
   `run.sh`; the `sorry`/`admit` greps cover the new definitions.

## Acceptance (mechanical)

- `bash verify/moves/run.sh` passes; the roster count grows by the
  new theorems; the footprint stays
  `{propext, Classical.choice, Quot.sound}`.
- The total `no_loss` statement quantifies over arbitrary finite
  intent bags including refused moves — checkable by reading the
  statement, enforced by the roster.
- The vacuity control is committed; the MOVES-1 row in the audit
  findings gains its disposition; VERIFICATION.md's moves entry drops
  the admitted-executions-only bound for the restated laws.

## Out of scope

The vector wall (next stage). Any change to `step`/`repair`
semantics — `stepK` is defined by agreement with them, and the
agreement lemmas are the proof of that.

## Pointers

`docs/research/2026-08-15-model-audit-findings.md` MOVES-1;
`docs/research/2026-08-15-sota-ranked-recommendation.md` (rung 0);
`docs/research/2026-08-15-dev670-adversarial-review.md` F4.
