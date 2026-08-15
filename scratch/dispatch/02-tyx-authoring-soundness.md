# Authoring soundness over TyX: the flywheel's first step gets theorems

## Why now

Ruling from the 2026-08-15 alignment grill: the test bed's first step —
an agent producing typed holes from prose — is covered today only by
the concierge walls (C1–C5, R0/R1). It is NOT what `verify/moves`
proves: that model's hole carrier is fixed (no creation move) and its
runs exclude refused-move continuations, while agent authoring is
refusal-driven by design. The operator ratified proving the authoring
loop in the TyX model's own territory, making the step-1 priority and
the type-generation lane the same lane.

## Scope

Extend `verify/ir` (new modules beside `IR/Syntax.lean` and
`IR/Semantics.lean`; do not weaken existing theorems):

1. Path-addressed `fill` and `unfill` over the partial grammar
   (`PTy = TyX Unit`), mirroring the concierge's operations.
2. `frontier : PTy → List Path` — the open holes, in a canonical
   order.
3. The theorems, upgrading the walls to model-level results:
   - `unfill_fill` — unfill(fill(p, path, subtree), path) = p on the
     admissible domain (the C2 wall's law).
   - `frontier_closed` — frontier(p) empty ↔ p closes to a `Ty`
     (via the existing `close`; connects to the proved C5 round trip).
   - `no_dead_ends` — every reachable partial extends to a closed
     term: completion-reachability, the frozen ticket/task-33 question,
     now a theorem (the C4 wall's law).
   - `fill_preserves_wf` once a WF predicate lands (coordinate with
     the referee work items; if WF is not yet defined, state the
     structural invariants fill preserves today and record the WF
     obligation in the README's next rungs).
4. Gate hardening: add the moves-style mechanical axiom-footprint
   check to `verify/ir/run.sh` covering the new headline theorems and
   the existing eight.
5. Ledger: upgrade the concierge-adjacent claims honestly — the C-law
   walls remain walls (they test the RUNNING concierge); the new row
   claims the model-level laws, code-model correspondence explicitly
   unproved, same as the IR row's discipline.

## Acceptance (mechanical)

- `bash verify/ir/run.sh` passes with the axiom-footprint check
  covering old and new theorems.
- No `sorry`/`admit`/user axioms (the gate greps enforce this).
- A negative control in the moves tradition: a broken fill (one that
  can strand a partial with no completion) exhibited as a transparent
  counterexample theorem, refuting exactly `no_dead_ends`.
- VERIFICATION.md row added with bounds stated.

## Out of scope

The referee engine items (normalize, parse, canonical bytes — issues
05/06); any edit to the running concierge in `proto/`; `check.args`
(blocked on the 05 grills — state the exclusion in the README if it
bites the no-dead-ends statement).

## Pointers

`verify/ir/IR/Syntax.lean` (PTy, embed/close, `Ty.close_embed_id`);
`proto/ts/test/concierge.test.ts` (the C1–C5 walls being upgraded);
`docs/research/2026-08-15-model-audit-findings.md` (IR verdict);
`docs/LAWS.md` §concierge.
