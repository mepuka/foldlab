/-
RQ-7 reference reproduction. Own-authored; not a foldlab gate.

`bv_decide?` runs the external solver and *writes the certificate to
disk*, then suggests the `bv_check "<file>"` call that re-checks it
without the solver. This is the cached-certificate pattern: the search
happens once, the check happens on every build.

`run.sh` renames the emitted file to `good.lrat`.

The statement is 8-bit multiplier commutativity — a one-line statement
whose certificate is measured in megabytes. That mismatch between
statement size and certificate size is the finding.
-/
import Std.Tactic.BVDecide

theorem mulComm8 (a b : BitVec 8) : a * b = b * a := by
  bv_decide? (timeout := 300)
