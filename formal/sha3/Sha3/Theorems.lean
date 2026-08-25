import Sha3.Spec
import Sha3.Impl

/-!
# T1–T2: table-versus-generator theorems (Pass B frozen statements)

Both are finite decidable claims: the Impl tables (round constants, ρ offsets) equal the
Spec generators (the §3.2.5 LFSR, the §3.2.2 walk). Expected axioms: `[propext, Quot.sound]`.
-/

set_option maxRecDepth 8000000
set_option maxHeartbeats 8000000

namespace Sha3.Theorems

/-- T1: the 24 round-constant lanes equal the LFSR-generated round-constant bits. -/
theorem rcv_eq_lfsr : ∀ (i : Fin 24) (z : Fin 64),
    (Sha3.Impl.rcv[i]).getLsbD z.val = Sha3.Spec.rcBit i.val z := by decide

/-- T2: the ρ-offset table equals the Algorithm 2 walk-generated offsets, mod 64. -/
theorem rhov_eq_walk : ∀ (x y : Fin 5),
    Sha3.Impl.rhov[x.val + 5 * y.val]! = Sha3.Spec.rhoOffset x y % 64 := by decide

#print axioms rcv_eq_lfsr
#print axioms rhov_eq_walk

end Sha3.Theorems
