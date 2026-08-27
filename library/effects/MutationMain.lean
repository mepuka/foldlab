import Effects.Conformance.ManifestReplay
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
-/

open Effects.Conformance Effects.Conformance.Manifest

def declaredMutants : List (Mutant RReducer) :=
  [ Effects.Mutants.RPL002LiveFallback.mutant
  , Effects.Mutants.RPL003SkipAdvance.mutant
  , Effects.Mutants.RPL004ConsumeOnMismatch.mutant
  , Effects.Mutants.RPL005AcceptSuffix.mutant
  , Effects.Mutants.SES001AppendPastAbort.mutant
  , Effects.Mutants.SES002CursorUnpinned.mutant
  , Effects.Mutants.CMP002CollapseIdentical.mutant ]

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
  if survivors > 0 then
    IO.eprintln s!"{survivors} mutation survivor(s); a survivor fails the task"
    return 1
  IO.println s!"mutation clean: {declaredMutants.length} declared mutants killed"
  return 0
