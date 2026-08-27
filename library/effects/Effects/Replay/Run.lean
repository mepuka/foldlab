import Effects.Replay.Laws

/-!
# The session interpreter

Threading replay state through program composition: a session run is the
left fold of the reducer over an ordered input list, accumulating the
emitted decision trace. Composition appends inputs and traces — it never
rewrites what was already decided — and a well-formed start stays
well-formed through every step.
-/

namespace Effects.Replay

variable {Op Req Val Err : Type} [DecidableEq Op] [DecidableEq Req]

/-- Run a session: fold the reducer over the inputs, accumulating the
decision trace. -/
def run (s : SessionState Op Req Val Err) :
    List (Input Op Req Val Err) →
    SessionState Op Req Val Err × List (Decision Op)
  | [] => (s, [])
  | i :: is =>
    let o := reduce s i
    let rest := run o.state is
    (rest.1, o.decisions ++ rest.2)

/-- Composition: running a concatenation is running the pieces in order,
with the traces concatenated. -/
theorem run_append (s : SessionState Op Req Val Err)
    (is js : List (Input Op Req Val Err)) :
    run s (is ++ js) =
      ((run (run s is).1 js).1,
        (run s is).2 ++ (run (run s is).1 js).2) := by
  induction is generalizing s with
  | nil => simp [run]
  | cons i is ih => simp [run, ih]

/-- Well-formedness survives a whole run. -/
theorem run_preserves_wf (s : SessionState Op Req Val Err)
    (is : List (Input Op Req Val Err)) (h : s.WF) : (run s is).1.WF := by
  induction is generalizing s with
  | nil => simpa [run] using h
  | cons i is ih =>
    simp only [run]
    exact ih _ (SES_002_reduce_preserves_wf s i h)

/-- The soliciting input list of a call sequence: each invocation
immediately followed by its recorded outcome — the lawful record-mode
protocol. -/
def soliciting (ps : List (Invocation Op Req × Outcome Val Err)) :
    List (Input Op Req Val Err) :=
  ps.flatMap fun io => [.invoke io.1, .recorded io.1 io.2]

/-- SES-003, run half: a solicited record run appends exactly its calls,
in invocation order — invocation order IS append order — advances the
cursor by the call count, and returns to a clean active record state. -/
theorem SES_003_solicited_run_appends_in_order
    (ps : List (Invocation Op Req × Outcome Val Err))
    (s : SessionState Op Req Val Err)
    (ha : s.status = .active) (hm : s.mode = .record)
    (hp : s.pending = none) :
    (run s (soliciting ps)).1.history
        = s.history ++ ps.map (fun io => io.1.entry io.2) ∧
      (run s (soliciting ps)).1.cursor = s.cursor + ps.length ∧
      (run s (soliciting ps)).1.status = .active ∧
      (run s (soliciting ps)).1.mode = .record ∧
      (run s (soliciting ps)).1.pending = none := by
  induction ps generalizing s with
  | nil =>
    simp only [soliciting, List.flatMap_nil]
    exact ⟨by simp [run], by simp [run], by simp [run, ha],
      by simp [run, hm], by simp [run, hp]⟩
  | cons io rest ih =>
    simp only [soliciting, List.flatMap_cons, List.cons_append,
      List.nil_append, run]
    simp only [reduce, ha, hm, invokeRecord, hp, appendRecord]
    rw [if_pos trivial]
    dsimp only
    have step := ih ⟨.record, .active, s.history ++ [io.1.entry io.2],
      s.cursor + 1, none⟩ rfl rfl rfl
    simp only [soliciting] at step
    refine ⟨?_, ?_, step.2.2.1, step.2.2.2.1, step.2.2.2.2⟩
    · rw [step.1]
      simp [List.append_assoc]
    · rw [step.2.1]
      simp only [List.length_cons]
      omega

end Effects.Replay
