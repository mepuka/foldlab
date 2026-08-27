import Effects.Conformance.ManifestReplay
import Effects.Mutants.CMP001_ForkNestedCursor
import Effects.Mutants.RPL002_LiveFallback
import Effects.Mutants.RPL003_SkipAdvance
import Effects.Mutants.RPL004_ConsumeOnMismatch
import Effects.Mutants.RPL005_AcceptSuffix
import Effects.Mutants.SES001_AppendPastAbort
import Effects.Mutants.SES002_CursorUnpinned
import Effects.Mutants.CMP002_CollapseIdentical

/-!
Direction 1 of the ratified mutation form: for every declared mutant, the
attacked family's vectors regenerated under the mutant must differ from
the model's — `manifest(mutant model) ≠ manifest(model)`. A survivor
fails the task hard; there are no waivers.

CMP-001 has no manifest family (reified programs carry meta-level
continuations, and nothing serializes a continuation), so its mutant is
killed on the declared witness run instead: the model's interpretation
and the mutated one must disagree on the two-leaf witness program.
-/

open Effects.Conformance Effects.Conformance.Manifest Effects.Replay

def declaredMutants : List (Mutant RReducer) :=
  [ Effects.Mutants.RPL002LiveFallback.mutant
  , Effects.Mutants.RPL003SkipAdvance.mutant
  , Effects.Mutants.RPL004ConsumeOnMismatch.mutant
  , Effects.Mutants.RPL005AcceptSuffix.mutant
  , Effects.Mutants.SES001AppendPastAbort.mutant
  , Effects.Mutants.SES002CursorUnpinned.mutant
  , Effects.Mutants.CMP002CollapseIdentical.mutant ]

def cmpMutants : List (Mutant Effects.Mutants.CMP001ForkNestedCursor.CmpInterp) :=
  [ Effects.Mutants.CMP001ForkNestedCursor.mutant ]

/-- The CMP-001 witness start: two recorded successes ahead of the
cursor. -/
def cmpStart : ReplayState String String String String :=
  ⟨⟨.replay, .active,
      [ ⟨"acme/Rates/get", 1, "req-0", .success "ok-0"⟩
      , ⟨"acme/Rates/get", 1, "req-1", .success "ok-1"⟩], 0⟩, rfl⟩

/-- The CMP-001 witness: a two-leaf sequential composition through
`Prog.bind` — the second leaf must continue from the state the first one
reached. -/
def cmpWitness : Prog String String String String String :=
  (Prog.invoke ⟨"acme/Rates/get", 1, "req-0"⟩ Prog.pure).bind fun o0 =>
    (Prog.invoke ⟨"acme/Rates/get", 1, "req-1"⟩ Prog.pure).bind fun o1 =>
      match o0, o1 with
      | .success a, .success b => Prog.pure (a ++ "/" ++ b)
      | _, _ => Prog.fail "unexpected-channel"

def sameRun :
    EStateM.Result (Halt String) (ReplayState String String String String) String →
      EStateM.Result (Halt String) (ReplayState String String String String) String →
      Bool
  | .ok a s, .ok b t => decide (a = b) && decide (s.val = t.val)
  | .error e s, .error f t => decide (e = f) && decide (s.val = t.val)
  | _, _ => false

def main : IO UInt32 := do
  let mut survivors := 0
  for m in declaredMutants do
    let model := familyRowsRendered Effects.Replay.reduce m.attacks
    let mutated := familyRowsRendered m.mutant m.attacks
    if model.isEmpty then
      IO.eprintln s!"UNKNOWN FAMILY {m.attacks} for mutant {m.id}"
      survivors := survivors + 1
    else if model == mutated then
      IO.eprintln s!"SURVIVOR {m.id} ({m.attacks}): vectors did not move"
      survivors := survivors + 1
    else
      IO.println s!"killed {m.id} ({m.attacks})"
  let modelRun := interpE cmpWitness cmpStart
  for m in cmpMutants do
    let mutated := m.mutant cmpWitness cmpStart
    if sameRun modelRun mutated then
      IO.eprintln s!"SURVIVOR {m.id} ({m.attacks}): witness run did not move"
      survivors := survivors + 1
    else
      IO.println s!"killed {m.id} ({m.attacks})"
  if survivors > 0 then
    IO.eprintln s!"{survivors} mutation survivor(s); a survivor fails the task"
    return 1
  IO.println s!"mutation clean: {declaredMutants.length + cmpMutants.length} declared mutants killed"
  return 0
