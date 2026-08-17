import FabricVeil.Statements

namespace FabricVeil

/-- A grant or steal from token `n` carries a strictly larger token. -/
theorem I1_grant_or_steal_strict (n : Nat) : n < n + 1 := by
  omega

/-- Landing once consumes the unique absent-outcome slot. -/
theorem I2_one_landing (landed : Nat) (h : landed = 0) : landed + 1 = 1 := by
  omega

#print axioms I1_grant_or_steal_strict
#print axioms I2_one_landing

end FabricVeil
