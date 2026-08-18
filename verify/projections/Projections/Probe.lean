namespace Projections.Probe

/-- The gate renames this field temporarily and requires the projection to move. -/
structure Envelope where
  payload : Nat
deriving Repr, BEq

end Projections.Probe
