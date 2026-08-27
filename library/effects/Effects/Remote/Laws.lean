import Effects.Remote.Machine

/-!
# The R1 laws

The three obligations of the R1 slice, stated over the machine's
decision trace and results with explicit hypotheses, quantified over
every state — including unreachable ones, which the acknowledgment
re-check makes possible for the caching law.
-/

namespace Effects.Remote

variable {K B : Type} [BEq K] [Hashable K] [BEq B]

/-- RMT-001: no step emits a cache decision unless the pending input is
entitled — bytes that pass the budget and verify for the in-flight key,
or an acknowledgment of content that verifies. A wire-supplied digest
is a routing hint; only verification admits. -/
theorem RMT_001_no_cache_without_admission (P : Params K B)
    (s : MachineState K B) (i : MInput K B)
    (h : entitledToCache P s i = false) :
    RTag.cached ∉ ((step P s i).decisions.map RDecision.tag) := by
  cases i with
  | request op =>
    cases op with
    | load key =>
      cases hp : s.phase <;> simp [step, hp, busyOut, RDecision.tag]
    | upload key bytes =>
      cases hp : s.phase with
      | idle =>
        simp only [step, hp]
        split
        · simp [RDecision.tag]
        · split
          · simp [RDecision.tag]
          · split <;> simp [RDecision.tag]
      | loading k => simp [step, hp, busyOut]
      | uploading k b => simp [step, hp, busyOut]
  | fromWire e =>
    cases hp : s.phase with
    | idle => simp [step, hp, absorbOut]
    | loading key =>
      cases e with
      | ok declared bytes =>
        simp only [step, hp, loadEvent]
        split
        · simp [RDecision.tag]
        · split
          · rename_i hbudget hverify
            exfalso
            simp [entitledToCache, hp, hbudget, hverify] at h
          · simp [RDecision.tag]
      | _ => simp [step, hp, loadEvent, RDecision.tag]
    | uploading key bytes =>
      cases e with
      | ok declared bytes' =>
        simp only [step, hp, uploadEvent]
        split
        · rename_i hverify
          exfalso
          simp [entitledToCache, hp, hverify] at h
        · simp [RDecision.tag]
      | _ => simp [step, hp, uploadEvent, RDecision.tag]

/-- RMT-002, rejection half: an over-budget declaration is rejected. -/
theorem RMT_002_budget_rejects (P : Params K B)
    (s : MachineState K B) (i : MInput K B)
    (h : overBudget P s i = true) :
    (step P s i).result.isBudgetRejection = true := by
  cases i with
  | request op =>
    cases op with
    | load key => simp [overBudget] at h
    | upload key bytes =>
      cases hp : s.phase with
      | idle =>
        simp [overBudget, hp] at h
        simp [step, hp, h, MResult.isBudgetRejection]
      | loading k => simp [overBudget, hp] at h
      | uploading k b => simp [overBudget, hp] at h
  | fromWire e =>
    cases hp : s.phase with
    | idle => cases e <;> simp [overBudget, hp] at h
    | loading key =>
      cases e <;> simp [overBudget, hp] at h
      case ok declared bytes =>
        simp [step, hp, loadEvent, h, MResult.isBudgetRejection]
    | uploading key bytes => cases e <;> simp [overBudget, hp] at h

/-- RMT-002, frozen half: an over-budget declaration changes nothing the
budget protects — the cache is exactly the prior cache, so no bytes were
hashed, decoded, or admitted. -/
theorem RMT_002_budget_frozen (P : Params K B)
    (s : MachineState K B) (i : MInput K B)
    (h : overBudget P s i = true) :
    (step P s i).state.cache = s.cache := by
  cases i with
  | request op =>
    cases op with
    | load key => simp [overBudget] at h
    | upload key bytes =>
      cases hp : s.phase with
      | idle =>
        simp [overBudget, hp] at h
        simp [step, hp, h]
      | loading k => simp [overBudget, hp] at h
      | uploading k b => simp [overBudget, hp] at h
  | fromWire e =>
    cases hp : s.phase with
    | idle => cases e <;> simp [overBudget, hp] at h
    | loading key =>
      cases e <;> simp [overBudget, hp] at h
      case ok declared bytes =>
        simp [step, hp, loadEvent, h]
    | uploading key bytes => cases e <;> simp [overBudget, hp] at h

/-- RMT-003: integrity is terminal for those bytes — once content is
recorded as integrity-rejected for a key, no step ever issues an upload
command carrying that exact key and content again. -/
theorem RMT_003_no_repeat_after_integrity [LawfulBEq B]
    (P : Params K B) (s : MachineState K B) (i : MInput K B)
    (k : K) (b : B) (h : s.rejected[k]? = some b) :
    RDecision.issued (.upload k b) ∉ (step P s i).decisions := by
  cases i with
  | request op =>
    cases op with
    | load key => cases hp : s.phase <;> simp [step, hp, busyOut]
    | upload key bytes =>
      cases hp : s.phase with
      | idle =>
        simp only [step, hp]
        split
        · simp
        · split
          · simp
          · split
            · rename_i hguard hverify
              intro hmem
              simp only [List.mem_cons, List.not_mem_nil, or_false] at hmem
              rcases hmem with hone | htwo
              · simp at hone
              · simp only [RDecision.issued.injEq, Command.upload.injEq] at htwo
                obtain ⟨hk, hb⟩ := htwo
                subst hk
                subst hb
                exact hguard (by simp [h])
            · simp
      | loading key' => simp [step, hp, busyOut]
      | uploading key' bytes' => simp [step, hp, busyOut]
  | fromWire e =>
    cases hp : s.phase with
    | idle => simp [step, hp, absorbOut]
    | loading key =>
      cases e with
      | ok declared bytes =>
        simp only [step, hp, loadEvent]
        split
        · simp
        · split <;> simp
      | _ => simp [step, hp, loadEvent]
    | uploading key bytes =>
      cases e with
      | ok declared bytes' =>
        simp only [step, hp, uploadEvent]
        split <;> simp
      | _ => simp [step, hp, uploadEvent]

end Effects.Remote
