/-
RQ-7 reference reproduction. Own-authored; not a foldlab gate.
Tamper 3: an intact, genuine certificate presented against a *different
but equally true* claim. Expected: refusal, nonzero exit.

This is the case that matters most for REF-8. The certificate is not
corrupt, and the goal is not false — the certificate is simply not a
certificate of *this* statement. A checker that validated certificates
in isolation, without re-deriving the claim they are attached to, would
pass this.
-/
import Std.Tactic.BVDecide

theorem mulComm16 (a b : BitVec 16) : a * b = b * a := by
  bv_check "good.lrat"
