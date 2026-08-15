# The moves vector wall: Lean-step conformance vectors, refused moves included

## Why now

The moves↔protod gap is held open honestly (`AGENTS.md`, the current
lane record). Its ratified floor is the G6 interim: Go-step ≡ Lean-step
conformance vectors — a wall, not a correspondence proof. Task 49
shipped 12 vectors checked by Go and TS; nothing checks them against
the Lean model, so the wall currently has one side.

## Scope

1. A Lean-side checker in `verify/moves/`: a small executable (`lake
   exe`) or `#eval`-driven test that reads
   `proto/wire/fixtures/protocol-moves.json`, maps each vector's
   pre-state, move, and expected post-state onto `Moves.step` /
   `Moves.repair`, and verifies agreement. The mapping is data the
   reviewer can read, committed beside the checker.
2. Extend the vector set with REFUSED moves: fill on disputed, fill on
   decided, same-seat conflicting fill, dispute with empty candidate
   union. This is mandatory, not optional: the model aborts a run on
   refusal while the daemon refuses and continues (audit MOVES-1), so
   refused moves are where the two sides diverge first. The vector
   format must express "refused, state unchanged" and both sides must
   verify it.
3. Wire the checker into `verify/moves/run.sh` so the gate fails when
   a vector disagrees, and add the wall to `VERIFICATION.md` with its
   honest rung (R0/R1 differential, NOT correspondence).

## Acceptance (mechanical)

- `bash verify/moves/run.sh` fails when any committed vector is
  perturbed (demonstrate with one deliberately corrupted copy, the
  gate-teeth pattern).
- `proto/go` and `proto/ts` gates still pass the extended vector set.
- The VERIFICATION.md entry states what the wall does NOT establish:
  no refinement map, no crash/replay coverage, vector-corpus-only
  (ADR-0007).

## Out of scope

The refinement map itself; any change to `Moves/Model.lean` semantics
(a vector the model cannot express is a FINDING, reported and stopped
on, per the working precepts).

## Pointers

`docs/design/2026-08-14-protocol-grill-record.md` G6;
`docs/research/2026-08-15-model-audit-findings.md` MOVES-1, MOVES-12
(close atomicity); `proto/go/protod/protocol_moves_test.go`.
