/-
Downstream module. It consumes only the STATEMENT of `foo`, never its
proof body. The question the experiment answers: does Lake rebuild this
module when only that proof body changes?
-/
import Exp.A

theorem bar (n : Nat) : n + 0 = n := foo n
