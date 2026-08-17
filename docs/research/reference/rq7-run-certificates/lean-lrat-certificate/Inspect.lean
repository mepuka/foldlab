/-
RQ-7 reference reproduction. Own-authored; not a foldlab gate.

What this file establishes, on Lean 4.33.0 core alone:

1. The Lean toolchain ships a *verified LRAT certificate checker* whose
   soundness theorem is one-directional — success implies unsatisfiable;
   nothing is claimed about failure.
2. The theorem itself rests only on Lean's three standard axioms.
3. A proof produced by `bv_decide` — which runs that checker on a
   certificate emitted by an external SAT solver — carries an *extra*
   axiom, minted per declaration, standing for "the compiled checker
   evaluated this certificate to `true`". That axiom is the visible
   trusted-base delta of the per-run certificate route.
-/
import Std.Tactic.BVDecide

-- (1) the checker and its soundness statement
#check @Std.Tactic.BVDecide.LRAT.check
#check @Std.Tactic.BVDecide.LRAT.check_sound

-- (2) what the soundness theorem itself depends on
#print axioms Std.Tactic.BVDecide.LRAT.check_sound

-- (3) a goal that the normalizer cannot close, so the SAT + certificate
--     path actually runs
theorem satPath (x y : BitVec 16) : ((x &&& y) ||| (x &&& ~~~y)) = x := by
  bv_decide

#print axioms satPath

-- (4) a goal the normalizer closes on its own: no certificate, no extra
--     axiom. The contrast is the point.
theorem normPath (x : BitVec 8) : x + x = x <<< 1 := by
  bv_decide

#print axioms normPath
