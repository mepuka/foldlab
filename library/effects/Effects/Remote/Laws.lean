import Effects.Remote.Machine

/-!
# The R1 laws

The three obligations of the R1 slice, stated over the machine's
identifier-tagged decision trace with explicit hypotheses, quantified
over every state — including unreachable ones. The caching law covers
both halves of the obligation: neither the cache decision nor the
return to the caller is reachable without entitlement, `returned`
mirroring delivery one-for-one. The terminal-integrity law is temporal:
the per-step exclusion composes with rejection-set monotonicity into a
whole-run corollary.
-/

namespace Effects.Remote

variable {K B : Type} [BEq K] [Hashable K] [BEq B] [Hashable B]

/-- RMT-001: no step emits a cache decision or a return to the caller
unless the pending input is entitled — bytes that pass the budget and
verify for the in-flight key, or an acknowledgment of content that
verifies. A wire-supplied digest is a routing hint; only verification
admits, toward the cache and toward the caller alike. -/
theorem RMT_001_no_cache_or_return_without_admission (P : Params K B)
    (s : MachineState K B) (i : MInput K B)
    (h : entitledToCache P s i = false) :
    RTag.cached ∉ ((step P s i).decisions.map fun d => d.2.tag) ∧
      RTag.returned ∉ ((step P s i).decisions.map fun d => d.2.tag) := by
  cases i with
  | request id op =>
    cases hm : s.inFlight[id]? with
    | some st => simp [step, hm]
    | none =>
      cases op with
      | load key => simp [step, hm, RDecision.tag]
      | upload key bytes =>
        simp only [step, hm]
        split
        · simp [RDecision.tag]
        · split
          · simp [RDecision.tag]
          · split
            · split <;> simp [RDecision.tag]
            · simp [RDecision.tag]
  | fromWire id e =>
    cases hm : s.inFlight[id]? with
    | none => simp [step, hm, absorbOut]
    | some st =>
      cases st with
      | loading key =>
        cases e with
        | ok declared bytes =>
          simp only [step, hm, loadEvent]
          split
          · simp [RDecision.tag]
          · split
            · rename_i hbudget hverify
              exfalso
              simp [entitledToCache, hm, hbudget, hverify] at h
            · simp [RDecision.tag]
        | _ => simp [step, hm, loadEvent, RDecision.tag]
      | uploading key bytes =>
        cases e with
        | ok declared bytes' =>
          simp only [step, hm, uploadEvent]
          split
          · rename_i hverify
            exfalso
            simp [entitledToCache, hm, hverify] at h
          · simp [RDecision.tag]
        | _ => simp [step, hm, uploadEvent, RDecision.tag]

/-- RMT-002, rejection half: an over-budget declaration is rejected. -/
theorem RMT_002_budget_rejects (P : Params K B)
    (s : MachineState K B) (i : MInput K B)
    (h : overBudget P s i = true) :
    (step P s i).result.isBudgetRejection = true := by
  cases i with
  | request id op =>
    cases op with
    | load key => simp [overBudget] at h
    | upload key bytes =>
      cases hm : s.inFlight[id]? with
      | some st => simp [overBudget, hm] at h
      | none =>
        simp [overBudget, hm] at h
        simp [step, hm, h, MResult.isBudgetRejection]
  | fromWire id e =>
    cases hm : s.inFlight[id]? with
    | none => cases e <;> simp [overBudget, hm] at h
    | some st =>
      cases st with
      | loading key =>
        cases e <;> simp [overBudget, hm] at h
        case ok declared bytes =>
          simp [step, hm, loadEvent, h, MResult.isBudgetRejection]
      | uploading key bytes => cases e <;> simp [overBudget, hm] at h

/-- RMT-002, exclusion half — the form the obligation means by "before
any hashing or decoding" at the model's altitude: after an over-budget
declaration, no verification, cache, or return decision occurs in the
step. The shell-side half — that an oversized declared body is never
read or buffered — is the R2 TypeScript obligation with a streaming
byte counter. -/
theorem RMT_002_budget_excludes (P : Params K B)
    (s : MachineState K B) (i : MInput K B)
    (h : overBudget P s i = true) :
    RTag.verified ∉ ((step P s i).decisions.map fun d => d.2.tag) ∧
      RTag.cached ∉ ((step P s i).decisions.map fun d => d.2.tag) ∧
      RTag.returned ∉ ((step P s i).decisions.map fun d => d.2.tag) := by
  cases i with
  | request id op =>
    cases op with
    | load key => simp [overBudget] at h
    | upload key bytes =>
      cases hm : s.inFlight[id]? with
      | some st => simp [overBudget, hm] at h
      | none =>
        simp [overBudget, hm] at h
        simp [step, hm, h, RDecision.tag]
  | fromWire id e =>
    cases hm : s.inFlight[id]? with
    | none => cases e <;> simp [overBudget, hm] at h
    | some st =>
      cases st with
      | loading key =>
        cases e <;> simp [overBudget, hm] at h
        case ok declared bytes =>
          simp [step, hm, loadEvent, h, RDecision.tag]
      | uploading key bytes => cases e <;> simp [overBudget, hm] at h

/-- RMT-002, frozen half: an over-budget declaration leaves the cache
exactly the prior cache — nothing was admitted. -/
theorem RMT_002_budget_frozen (P : Params K B)
    (s : MachineState K B) (i : MInput K B)
    (h : overBudget P s i = true) :
    (step P s i).state.cache = s.cache := by
  cases i with
  | request id op =>
    cases op with
    | load key => simp [overBudget] at h
    | upload key bytes =>
      cases hm : s.inFlight[id]? with
      | some st => simp [overBudget, hm] at h
      | none =>
        simp [overBudget, hm] at h
        simp [step, hm, h]
  | fromWire id e =>
    cases hm : s.inFlight[id]? with
    | none => cases e <;> simp [overBudget, hm] at h
    | some st =>
      cases st with
      | loading key =>
        cases e <;> simp [overBudget, hm] at h
        case ok declared bytes =>
          simp [step, hm, loadEvent, h]
      | uploading key bytes => cases e <;> simp [overBudget, hm] at h

/-- RMT-004: an upload request naming a key already admitted in the
cache, with content that verifies for it — within budget, not
integrity-rejected, its identifier free — completes in one step as
success with the state unchanged, zero commands, and only the
verification decision: an already-present exact-digest upload transfers
nothing. -/
theorem RMT_004_present_upload_needs_no_transfer (P : Params K B)
    (s : MachineState K B) (id : OpId) (key : K) (bytes : B)
    (hflight : s.inFlight[id]? = none)
    (hsize : ¬ P.size bytes > P.budgets.maxBytes)
    (hrej : s.rejected.contains (key, bytes) = false)
    (hver : P.verify key bytes = true)
    (hcache : s.cache.contains key = true) :
    step P s (.request id (.upload key bytes)) =
      { result := .uploaded key, state := s, commands := []
        decisions := [(id, .verified key)] } := by
  simp [step, hflight, hsize, hrej, hver, hcache]

/-- RMT-003, per-step half: once a key-content pair stands
integrity-rejected, no step issues an upload command carrying that
exact pair, under any operation identifier. -/
theorem RMT_003_no_repeat_after_integrity [LawfulBEq K] [LawfulBEq B]
    [LawfulHashable K] [LawfulHashable B]
    (P : Params K B) (s : MachineState K B) (i : MInput K B)
    (k : K) (b : B) (h : (k, b) ∈ s.rejected) (id' : OpId) :
    (id', RDecision.issued (.upload k b)) ∉ (step P s i).decisions := by
  cases i with
  | request id op =>
    cases hm : s.inFlight[id]? with
    | some st => simp [step, hm]
    | none =>
      cases op with
      | load key => simp [step, hm]
      | upload key bytes =>
        simp only [step, hm]
        split
        · simp
        · split
          · simp
          · split
            · split
              · simp
              · rename_i hguard _ _
                intro hmem
                simp only [List.mem_cons, List.not_mem_nil, or_false] at hmem
                rcases hmem with hone | htwo
                · simp at hone
                · simp only [Prod.mk.injEq, RDecision.issued.injEq,
                    Command.upload.injEq] at htwo
                  obtain ⟨-, hk, hb⟩ := htwo
                  subst hk
                  subst hb
                  exact absurd (Std.HashSet.contains_iff_mem.mpr h) (by
                    simpa using hguard)
            · simp
  | fromWire id e =>
    cases hm : s.inFlight[id]? with
    | none => simp [step, hm, absorbOut]
    | some st =>
      cases st with
      | loading key =>
        cases e with
        | ok declared bytes =>
          simp only [step, hm, loadEvent]
          split
          · simp
          · split <;> simp
        | _ => simp [step, hm, loadEvent]
      | uploading key bytes =>
        cases e with
        | ok declared bytes' =>
          simp only [step, hm, uploadEvent]
          split <;> simp
        | _ => simp [step, hm, uploadEvent]

/-- RMT-003, monotonicity half: the rejection memory only ever grows —
no step forgets a rejected pair. -/
theorem RMT_003_rejection_monotone [LawfulBEq K] [LawfulBEq B]
    [LawfulHashable K] [LawfulHashable B] (P : Params K B)
    (s : MachineState K B) (i : MInput K B) (k : K) (b : B)
    (h : (k, b) ∈ s.rejected) :
    (k, b) ∈ (step P s i).state.rejected := by
  cases i with
  | request id op =>
    cases hm : s.inFlight[id]? with
    | some st => simpa [step, hm] using h
    | none =>
      cases op with
      | load key => simpa [step, hm] using h
      | upload key bytes =>
        simp only [step, hm]
        split
        · simpa using h
        · split
          · simpa using h
          · split
            · split <;> simpa using h
            · simp [h]
  | fromWire id e =>
    cases hm : s.inFlight[id]? with
    | none => simpa [step, hm, absorbOut] using h
    | some st =>
      cases st with
      | loading key =>
        cases e with
        | ok declared bytes =>
          simp only [step, hm, loadEvent]
          split
          · simpa using h
          · split <;> simpa using h
        | _ => simpa [step, hm, loadEvent] using h
      | uploading key bytes =>
        cases e with
        | ok declared bytes' =>
          simp only [step, hm, uploadEvent]
          split
          · simpa using h
          · simp [h]
        | integrityMismatch =>
          simp [step, hm, uploadEvent, h]
        | _ => simpa [step, hm, uploadEvent] using h

/-- RMT-003, temporal corollary: over any whole run from a state where
a pair stands rejected, no step of the run ever issues that upload —
the per-step exclusion composed with monotonicity. -/
theorem RMT_003_terminal_over_run [LawfulBEq K] [LawfulBEq B]
    [LawfulHashable K] [LawfulHashable B]
    (P : Params K B) (s : MachineState K B) (k : K) (b : B)
    (h : (k, b) ∈ s.rejected) (inputs : List (MInput K B)) (id' : OpId) :
    (id', RDecision.issued (.upload k b)) ∉ (run P s inputs).2.2.1 := by
  induction inputs generalizing s with
  | nil => simp [run]
  | cons i is ih =>
    simp only [run, List.mem_append]
    rintro (hstep | hrest)
    · exact RMT_003_no_repeat_after_integrity P s i k b h id' hstep
    · exact ih (step P s i).state
        (RMT_003_rejection_monotone P s i k b h) hrest

end Effects.Remote
