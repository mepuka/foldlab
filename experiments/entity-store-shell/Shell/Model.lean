/-
The in-process pure model (STORE-SHELL §6, side (a)).

The state is the model's own: `E2.StoreMap` under `E2.putPre`, `E2.NameMap` beside it,
and the SH6 obligation set. No IO, no `IO` monad, nothing to mock. This is the side the
disk store is differenced against.
-/
import E2
import Shell.Verbs

namespace Shell

open E2

structure ModelState where
  σ : StoreMap
  obligations : List Address
  names : NameMap

def ModelState.empty : ModelState := ⟨[], [], []⟩

def ModelState.view (m : ModelState) : StoreView :=
  { objects := m.σ, obligations := m.obligations, names := m.names }

def ModelState.apply (m : ModelState) : Effect → ModelState
  | .putObject a b kind =>
      -- The model's OWN insert (`E2.putPre`): address-keyed, append-only, no-op if
      -- present. Nothing about insertion is re-implemented here.
      { σ := putPre H m.σ b
        obligations :=
          match kind with
          | .entity => if m.obligations.contains a then m.obligations else m.obligations ++ [a]
          | .schema => m.obligations
        names := m.names }
  | .setName n a =>
      { m with names := (n, a) :: m.names.filter (fun p => p.fst != n) }
  | .corrupt a idx mask =>
      { m with σ := m.σ.map (fun p => if p.fst = a then (p.fst, flipByte p.snd idx mask) else p) }

def ModelState.applyAll (m : ModelState) (es : List Effect) : ModelState :=
  es.foldl ModelState.apply m

/-- Run one verb against the model. -/
def ModelState.run (m : ModelState) (v : Verb) : Outcome × ModelState :=
  let (out, effects) := runVerb m.view v
  (out, m.applyAll effects)

end Shell
