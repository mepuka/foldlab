/-
RQ-7 reference reproduction. Own-authored; not a foldlab gate.
The honest certificate: `bv_check` re-derives the verdict from the
stored bytes, without calling the SAT solver. Expected exit code 0.
-/
import Std.Tactic.BVDecide

theorem mulComm8 (a b : BitVec 8) : a * b = b * a := by
  bv_check "good.lrat"

#print axioms mulComm8
