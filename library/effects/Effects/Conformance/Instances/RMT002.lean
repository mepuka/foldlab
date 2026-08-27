import Effects.Conformance.Schema.FailClosed
import Effects.Conformance.Instances.RMT001
import Effects.Remote.Laws

/-!
# RMT-002 — budgets before bytes

FAIL-CLOSED over the remote client machine: the hypothesis is
"within declared budgets", its failure — an idle-phase upload whose
content size exceeds the byte budget, or a load response whose declared
length does — rejects with the typed budget rejection, and the cache is
frozen: nothing was hashed, decoded, or admitted. The negative kit is a
within-budget upload, proving rejection is not universal.
-/

namespace Effects.Conformance

open Effects.Remote

private abbrev MSt := MachineState Nat (List UInt8)
private abbrev MIn := MInput Nat (List UInt8)
private abbrev MRes := MResult Nat (List UInt8)

/-- RMT-002: declared sizes and counts are checked against declared
budgets before any hashing or decoding. -/
def rmt002 : FailClosed MSt MIn MRes where
  id := "RMT-002"
  sentence := "When a declaration exceeds the declared budgets — an upload whose content size is over the byte budget, or a load response whose declared length is — the step rejects with the typed budget rejection and the cache is unchanged: the budget check reads only declarations, so nothing over budget is ever hashed, decoded, or admitted."
  wf := fun _ => True
  hyp := fun s i => overBudget rmtParams s i = false
  step := fun s i =>
    ((Effects.Remote.step rmtParams s i).result,
      (Effects.Remote.step rmtParams s i).state)
  isRejection := MResult.isBudgetRejection
  measure := fun s => s.cache.size
  law_reject := fun s i _ hn =>
    RMT_002_budget_rejects rmtParams s i
      (by revert hn; cases overBudget rmtParams s i <;> simp)
  law_frozen := fun s i _ hn => by
    have hc := RMT_002_budget_frozen rmtParams s i
      (by revert hn; cases overBudget rmtParams s i <;> simp)
    simp [hc]
  posState := rmtEmpty
  posInput := .request (.upload 9 (List.replicate 9 0))
  pos_wf := trivial
  pos_nohyp := by decide
  negState := rmtEmpty
  negInput := .request (.upload 2 [7, 9])
  neg_hyp := by decide

end Effects.Conformance
