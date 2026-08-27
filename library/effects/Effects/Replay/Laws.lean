import Effects.Replay.Relation

/-!
# The obligation laws

One theorem per obligation clause, named by ledger ID (the one-name rule:
ledger ID = theorem name = manifest family = suite test name). The schema
instances cite these; nothing here is a new statement — each theorem is
the Lean half of its plan-ledger row.
-/

namespace Effects.Replay

variable {Op Req Val Err : Type} [DecidableEq Op] [DecidableEq Req]

/-! ## SES-001 — the structural abort emits and appends nothing -/

/-- An aborted session emits NO decisions at all — in particular, nothing
appends past a failure, so histories stay truthful prefixes. -/
theorem SES_001_aborted_emits_nothing (s : SessionState Op Req Val Err)
    (i : Input Op Req Val Err) (h : s.status = .aborted) :
    (reduce s i).decisions = [] := by
  simp [reduce, h, absorb]

/-- The record-mode append DOES emit its occurrence decision — the guard
in SES-001 is not vacuous. -/
theorem record_append_emits_occurrence (s : SessionState Op Req Val Err)
    (inv : Invocation Op Req) (out : Outcome Val Err)
    (ha : s.status = .active) (hm : s.mode = .record) :
    (reduce s (.recorded inv out)).decisions
      = [.occurrenceAppended inv.op s.cursor] := by
  simp [reduce, ha, hm, appendRecord]

/-! ## RPL-002 — replay-mode traces never select live delegation -/

theorem RPL_002_replay_excludes_live_delegation
    (s : SessionState Op Req Val Err) (i : Input Op Req Val Err)
    (hm : s.mode = .replay) :
    DecisionTag.liveDelegation ∉ (reduce s i).decisions.map Decision.tag := by
  cases hst : s.status with
  | aborted => simp [reduce, hst, absorb]
  | active =>
    cases i with
    | invoke inv =>
      simp only [reduce, hst, hm]
      cases he : s.history[s.cursor]? with
      | none => simp [invokeReplay, he, rejectStep, Decision.tag]
      | some e =>
        by_cases hop : e.op = inv.op
        · by_cases hrev : e.revision = inv.revision
          · by_cases hreq : e.request = inv.request
            · simp [invokeReplay, he, hop, hrev, hreq, Decision.tag]
            · simp [invokeReplay, he, hop, hrev, hreq, rejectStep,
                Decision.tag]
          · simp [invokeReplay, he, hop, hrev, rejectStep, Decision.tag]
        · simp [invokeReplay, he, hop, rejectStep, Decision.tag]
    | recorded inv out => simp [reduce, hst, hm, absorb]
    | appendFailed => simp [reduce, hst, hm, absorb]
    | complete t =>
      simp only [reduce, hst, hm]
      by_cases hc : s.cursor = s.history.length
      · simp [completeStep, hc, Decision.tag]
      · simp [completeStep, hc, Decision.tag]

/-- Record mode DOES delegate on an invocation — RPL-002's mode guard is
not vacuous. -/
theorem record_invoke_delegates (s : SessionState Op Req Val Err)
    (inv : Invocation Op Req) (ha : s.status = .active)
    (hm : s.mode = .record) :
    (reduce s (.invoke inv)).decisions = [.liveDelegation inv.op s.cursor] := by
  simp [reduce, ha, hm, invokeRecord]

/-! ## RPL-003 — matching consumes exactly the permitted occurrence -/

theorem RPL_003_match_consumes_exactly_one
    (s : SessionState Op Req Val Err) (inv : Invocation Op Req)
    (ha : s.status = .active) (hm : s.mode = .replay)
    (h : MatchesAt s inv) :
    (reduce s (.invoke inv)).state.cursor = s.cursor + 1 := by
  obtain ⟨e, he, hop, hrev, hreq⟩ := h
  simp [reduce, ha, hm, invokeReplay, he, hop, hrev, hreq]

/-! ## RPL-004 — mismatch fails closed -/

theorem RPL_004_mismatch_rejects (s : SessionState Op Req Val Err)
    (inv : Invocation Op Req) (ha : s.status = .active)
    (hm : s.mode = .replay) (h : ¬ MatchesAt s inv) :
    (reduce s (.invoke inv)).result.isRejection = true := by
  simp only [reduce, ha, hm]
  cases he : s.history[s.cursor]? with
  | none => simp [invokeReplay, he, rejectStep, StepResult.isRejection]
  | some e =>
    by_cases hop : e.op = inv.op
    · by_cases hrev : e.revision = inv.revision
      · by_cases hreq : e.request = inv.request
        · exact absurd ⟨e, he, hop, hrev, hreq⟩ h
        · simp [invokeReplay, he, hop, hrev, hreq, rejectStep,
            StepResult.isRejection]
      · simp [invokeReplay, he, hop, hrev, rejectStep,
          StepResult.isRejection]
    · simp [invokeReplay, he, hop, rejectStep, StepResult.isRejection]

/-- Failing closed consumes nothing: the cursor is frozen on every
request-side rejection. -/
theorem RPL_004_mismatch_frozen (s : SessionState Op Req Val Err)
    (inv : Invocation Op Req) (ha : s.status = .active)
    (hm : s.mode = .replay) (h : ¬ MatchesAt s inv) :
    (reduce s (.invoke inv)).state.cursor = s.cursor := by
  simp only [reduce, ha, hm]
  cases he : s.history[s.cursor]? with
  | none => simp [invokeReplay, he, rejectStep]
  | some e =>
    by_cases hop : e.op = inv.op
    · by_cases hrev : e.revision = inv.revision
      · by_cases hreq : e.request = inv.request
        · exact absurd ⟨e, he, hop, hrev, hreq⟩ h
        · simp [invokeReplay, he, hop, hrev, hreq, rejectStep]
      · simp [invokeReplay, he, hop, hrev, rejectStep]
    · simp [invokeReplay, he, hop, rejectStep]

/-! ## RPL-005 — completion rejects an unconsumed suffix, carrying the
program's terminal so far -/

theorem RPL_005_suffix_rejects_with_terminal
    (s : SessionState Op Req Val Err) (t : Terminal Val Err)
    (ha : s.status = .active) (hc : ¬ s.cursor = s.history.length) :
    reduce s (.complete t) =
      { result := .outcome (.rejected .unconsumedSuffix s.cursor (some t))
        state := { s with status := .aborted }
        decisions := [.typedRejection .unconsumedSuffix s.cursor] } := by
  cases hm : s.mode <;> simp [reduce, ha, hm, completeStep, hc]

/-- Completion at the history length completes with the terminal — the
rejection above is not universal. -/
theorem complete_at_end (s : SessionState Op Req Val Err)
    (t : Terminal Val Err) (ha : s.status = .active)
    (hc : s.cursor = s.history.length) :
    reduce s (.complete t) =
      { result := .outcome (.completed t), state := s
        decisions := [.completed s.cursor] } := by
  cases hm : s.mode <;> simp [reduce, ha, hm, completeStep, hc]

/-! ## CMP-002 — identical requests remain separate occurrences -/

/-- Appending an occurrence advances the position by one, regardless of
content — position is the occurrence identity, so identical invocation
content never collapses occurrences. -/
theorem CMP_002_append_advances_position (s : SessionState Op Req Val Err)
    (inv : Invocation Op Req) (out : Outcome Val Err)
    (ha : s.status = .active) (hm : s.mode = .record) :
    (reduce s (.recorded inv out)).state.cursor = s.cursor + 1 := by
  simp [reduce, ha, hm, appendRecord]

/-- The append preserves the active record flags, so occurrences can be
appended in sequence. -/
theorem append_preserves_flags (s : SessionState Op Req Val Err)
    (inv : Invocation Op Req) (out : Outcome Val Err)
    (ha : s.status = .active) (hm : s.mode = .record) :
    (reduce s (.recorded inv out)).state.status = .active ∧
      (reduce s (.recorded inv out)).state.mode = .record := by
  simp [reduce, ha, hm, appendRecord]

/-! ## SES-002 — every step preserves session-state well-formedness -/

theorem SES_002_reduce_preserves_wf (s : SessionState Op Req Val Err)
    (i : Input Op Req Val Err) (h : s.WF) : (reduce s i).state.WF := by
  obtain ⟨hle, hrec⟩ := h
  cases hst : s.status with
  | aborted =>
    simp only [reduce, hst, absorb]
    exact ⟨hle, hrec⟩
  | active =>
    cases hm : s.mode with
    | record =>
      cases i with
      | invoke inv =>
        simp only [reduce, hst, hm, invokeRecord]
        refine ⟨hle, fun habs => ?_⟩
        first
          | exact hrec habs
          | exact hrec hm
      | recorded inv out =>
        have hcur := hrec hm
        simp only [reduce, hst, hm, appendRecord, SessionState.WF,
          List.length_append, List.length_cons, List.length_nil]
        exact ⟨by omega, fun _ => by omega⟩
      | appendFailed =>
        simp only [reduce, hst, hm, abortRecord, SessionState.WF]
        refine ⟨hle, fun habs => ?_⟩
        first
          | exact hrec habs
          | exact hrec hm
      | complete t =>
        simp only [reduce, hst, hm, completeStep]
        by_cases hc : s.cursor = s.history.length
        · simp only [if_pos hc]
          refine ⟨hle, fun habs => ?_⟩
          first
            | exact hrec habs
            | exact hrec hm
        · simp only [if_neg hc, SessionState.WF]
          refine ⟨hle, fun habs => ?_⟩
          first
            | exact hrec habs
            | exact hrec hm
    | replay =>
      cases i with
      | invoke inv =>
        simp only [reduce, hst, hm]
        cases he : s.history[s.cursor]? with
        | none =>
          simp only [invokeReplay, he, rejectStep, SessionState.WF]
          refine ⟨hle, fun habs => ?_⟩
          first
            | exact hrec habs
            | exact nomatch habs
        | some e =>
          have hlt : s.cursor < s.history.length :=
            (List.getElem?_eq_some_iff.mp he).1
          by_cases hop : e.op = inv.op
          · by_cases hrev : e.revision = inv.revision
            · by_cases hreq : e.request = inv.request
              · simp only [invokeReplay, he, if_pos hop, if_pos hrev,
                  if_pos hreq, SessionState.WF]
                refine ⟨by omega, fun habs => ?_⟩
                first
                  | exact absurd (hm ▸ habs) (by intro hx; exact nomatch hx)
                  | exact nomatch habs
              · simp only [invokeReplay, he, if_pos hop, if_pos hrev,
                  if_neg hreq, rejectStep, SessionState.WF]
                refine ⟨hle, fun habs => ?_⟩
                first
                  | exact hrec habs
                  | exact nomatch habs
            · simp only [invokeReplay, he, if_pos hop, if_neg hrev,
                rejectStep, SessionState.WF]
              refine ⟨hle, fun habs => ?_⟩
              first
                | exact hrec habs
                | exact nomatch habs
          · simp only [invokeReplay, he, if_neg hop, rejectStep,
              SessionState.WF]
            refine ⟨hle, fun habs => ?_⟩
            first
              | exact hrec habs
              | exact nomatch habs
      | recorded inv out =>
        simp only [reduce, hst, hm, absorb]
        exact ⟨hle, hrec⟩
      | appendFailed =>
        simp only [reduce, hst, hm, absorb]
        exact ⟨hle, hrec⟩
      | complete t =>
        simp only [reduce, hst, hm, completeStep]
        by_cases hc : s.cursor = s.history.length
        · simp only [if_pos hc]
          exact ⟨hle, hrec⟩
        · simp only [if_neg hc, SessionState.WF]
          refine ⟨hle, fun habs => ?_⟩
          first
            | exact hrec habs
            | exact nomatch habs

end Effects.Replay
