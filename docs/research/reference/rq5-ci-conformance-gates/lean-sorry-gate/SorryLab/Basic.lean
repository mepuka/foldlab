/-
Own-authored minimal reproduction for RQ-5. Not part of any foldlab gate.

Three declarations, three different ways a "the proofs build" gate can be
green while a theorem is not proved:

  * `dishonest` — the honest hole. `lake build` emits a WARNING, not an
    error, and exits 0.
  * `derived`   — the hole one hop away. No `sorry` token appears on any of
    its lines, so a source grep over the file cannot see it. `#print axioms`
    can.
  * `compiled`  — no `sorry` anywhere, and trust has moved into the compiler
    instead. Lean mints a fresh, per-declaration axiom name for it, so an
    axiom check written as a NAME allowlist has to be a deny-everything-else
    check to catch it.
-/
namespace SorryLab

theorem honest : 1 + 1 = 2 := rfl

theorem dishonest (n : Nat) : n + 0 = n := by
  sorry

-- The token `sorry` appears on none of this declaration's lines.
theorem derived (n : Nat) : n + 0 = n := dishonest n

-- No `sorry` token anywhere; the trust moves into the compiler instead.
theorem compiled : (List.range 20).length = 20 := by
  native_decide

end SorryLab
