/-
A machine-checked theorem about a Lean definition says nothing about the C
that Lean emits for it. `@[implemented_by]` replaces the compiled body; the
kernel never sees the replacement, and the exported C symbol carries it.

Own-authored, foldlab. Run via ./run.sh.
-/

def liar (n : Nat) : Nat := n + 1

@[implemented_by liar]
def honest (n : Nat) : Nat := n

/-- Kernel-checked, and true. -/
theorem honest_eq (n : Nat) : honest n = n := rfl

/-- The C-callable symbol: `@[export]` over a swapped definition. -/
@[export foldlab_honest]
def honestExport (n : Nat) : Nat := honest n

#print axioms honest_eq

def main : IO Unit :=
  IO.println s!"compiled honest 3 = {honest 3}"
