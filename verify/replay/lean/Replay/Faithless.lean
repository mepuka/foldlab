/-
The negative control: drop the ready guard and determinacy fails.

`FaithlessExec` is `Exec` minus `Ready` — a runner that commits a node
whose inputs are not yet all committed, reading defaults for the absent
ones (the shape of any engine that lets an activity run against
partially-materialized inputs). Two schedules of the same two-node
workflow then commit DIFFERENT values for the same node: the committed
linearization becomes a decision about VALUES, which is exactly what the
ready guard exists to make impossible. A prover that cannot fail proves
nothing; this is the failure.
-/
import Replay.Core

namespace Replay

/-- Execution without the readiness guard. -/
inductive FaithlessExec (G : Dag) : Store → Prop where
  | init : FaithlessExec G (fun _ => none)
  | commit {σ : Store} {n : Nat}
      (hnone : σ n = none) (h : FaithlessExec G σ) :
      FaithlessExec G (commitStep G σ n)

/-- The two-node counterexample workflow: node 0 produces 1; node 1
echoes its single input. -/
def Gcex : Dag where
  preds := fun n => if n = 1 then [0] else []
  body  := fun n xs => if n = 0 then 1 else xs.getD 0 0
  acyc  := by
    intro n m hm
    by_cases hn : n = 1
    · subst hn
      simp at hm
      subst hm
      exact Nat.zero_lt_one
    · simp [hn] at hm

private def empty : Store := fun _ => none

/-- Schedule A: commit node 1 FIRST (input absent, default read), then
node 0. -/
private def sigA : Store := commitStep Gcex (commitStep Gcex empty 1) 0

/-- Schedule B: commit node 0 first, then node 1. -/
private def sigB : Store := commitStep Gcex (commitStep Gcex empty 0) 1

/-- **Faithless divergence**: both schedules are complete over the
two-node workflow, yet they commit different values at node 1. Without
the ready guard, the linearization decides values. -/
theorem faithless_diverges :
    FaithlessExec Gcex sigA ∧ FaithlessExec Gcex sigB ∧
    (sigA 0).isSome ∧ (sigA 1).isSome ∧
    (sigB 0).isSome ∧ (sigB 1).isSome ∧
    sigA 1 ≠ sigB 1 := by
  refine ⟨?_, ?_, ?_, ?_, ?_, ?_, ?_⟩
  · exact .commit rfl (.commit rfl .init)
  · exact .commit rfl (.commit rfl .init)
  · decide
  · decide
  · decide
  · decide
  · decide

/-- The values, pinned so the divergence is legible: schedule A commits
`0` at node 1 (it echoed the default), schedule B commits `1` (it echoed
the real input). -/
theorem faithless_values : sigA 1 = some 0 ∧ sigB 1 = some 1 := by
  constructor <;> decide

end Replay
