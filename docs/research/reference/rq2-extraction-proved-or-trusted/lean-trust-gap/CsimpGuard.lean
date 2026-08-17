/-
The guarded alternative. `@[csimp]` also swaps the compiled body, but demands
a proof that the two functions are equal, so a false swap is refused.

This file is expected to FAIL elaboration. Its failure is the evidence.

Own-authored, foldlab. Run via ./run.sh.
-/

def liar (n : Nat) : Nat := n + 1
def honest (n : Nat) : Nat := n

@[csimp] theorem honest_eq_liar : honest = liar := rfl
