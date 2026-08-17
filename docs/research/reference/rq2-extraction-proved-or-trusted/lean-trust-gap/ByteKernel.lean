/-
Nothing exotic is needed to reach hand-written C. An ordinary, unannotated
function over `ByteArray` — the shape of the kernel ABI — compiles to calls
into the Lean runtime's C implementations of the primitives.

Own-authored, foldlab. Run via ./run.sh.
-/

@[export foldlab_sum]
def sumBytes (b : ByteArray) : Nat :=
  b.foldl (init := 0) fun acc x => acc + x.toNat
