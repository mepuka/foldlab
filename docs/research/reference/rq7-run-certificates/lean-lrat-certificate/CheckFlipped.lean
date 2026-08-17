/-
RQ-7 reference reproduction. Own-authored; not a foldlab gate.
Tamper 1: one byte of the certificate overwritten. Expected: refusal,
nonzero exit. A certificate that is not refused when corrupted is not a
certificate.
-/
import Std.Tactic.BVDecide

theorem mulComm8Flipped (a b : BitVec 8) : a * b = b * a := by
  bv_check "flip.lrat"
