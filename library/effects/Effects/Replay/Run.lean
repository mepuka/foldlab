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

end Effects.Replay
