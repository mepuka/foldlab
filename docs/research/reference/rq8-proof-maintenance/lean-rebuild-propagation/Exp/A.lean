/-
Upstream module. `run.sh` rewrites ONLY the proof body of `foo`; the
statement line is byte-identical across both variants.
-/
theorem foo (n : Nat) : n + 0 = n := by
  simp
