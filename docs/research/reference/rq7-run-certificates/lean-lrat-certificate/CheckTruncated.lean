/-
RQ-7 reference reproduction. Own-authored; not a foldlab gate.
Tamper 2: the certificate truncated to half its bytes. Expected:
refusal, nonzero exit. Note that this is a *different* refusal from the
byte flip — a truncated certificate stops short of the empty clause.
-/
import Std.Tactic.BVDecide

theorem mulComm8Truncated (a b : BitVec 8) : a * b = b * a := by
  bv_check "trunc.lrat"
