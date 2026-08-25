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
  /-- Directory entries written BELOW the boundary by `(place …)` (W3-20), keyed by plane
      and filename. Kept as raw placements rather than as pre-classified view rows so that
      `view` runs the SAME classification the disk reader runs, every time it is asked —
      a pre-computed list would be a second copy of the reader's clause order, which is
      exactly the shape of a drift the differential could not catch (it would move both
      sides at once only if the copy stayed correct). At most one entry per key: a
      directory holds one entry per name. -/
  placed : List ((Plane × String) × PlaceKind)

def ModelState.empty : ModelState := ⟨[], [], [], []⟩

/-- The model's view: the three admitted planes, with every below-the-boundary placement
    folded in on top — objects and names it overrides, strays and non-regular entries it
    contributes. Before W3-20 the last three lists were hard-wired `[]` here. -/
def ModelState.view (m : ModelState) : StoreView :=
  m.placed.foldl
    (fun v pk => v.withPlaced (placedEntry pk.fst.fst pk.fst.snd pk.snd))
    { objects := m.σ, obligations := m.obligations, names := m.names }

def ModelState.apply (m : ModelState) : Effect → ModelState
  | .putObject a b kind =>
      -- The model's OWN insert (`E2.putPre`): address-keyed, append-only, no-op if
      -- present. Nothing about insertion is re-implemented here.
      { m with
        σ := putPre H m.σ b
        obligations :=
          match kind with
          | .entity => if m.obligations.contains a then m.obligations else m.obligations ++ [a]
          | .schema => m.obligations }
  | .setName n a =>
      { m with names := (n, a) :: m.names.filter (fun p => p.fst != n) }
  | .corrupt a idx mask =>
      { m with σ := m.σ.map (fun p => if p.fst = a then (p.fst, flipByte p.snd idx mask) else p) }
  | .place plane name kind =>
      -- Replace at the key, never accumulate: `writeBinFile` overwrites and a directory
      -- holds one entry per name, so a second placement at the same path is the same
      -- entry with new contents on both sides.
      { m with placed :=
          m.placed.filter (fun e => !(e.fst.fst == plane && e.fst.snd == name))
            ++ [((plane, name), kind)] }

def ModelState.applyAll (m : ModelState) (es : List Effect) : ModelState :=
  es.foldl ModelState.apply m

/-- Run one verb against the model. -/
def ModelState.run (m : ModelState) (v : Verb) : Outcome × ModelState :=
  let (out, effects) := runVerb m.view v
  (out, m.applyAll effects)

end Shell
