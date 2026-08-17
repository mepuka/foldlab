/-
  NativeDecideFootprint.lean — foldlab RQ-9 reference artifact, 2026-08-16.
  Own-authored; no third-party code.

  Why this file exists.  The one piece of prior art that formalizes
  shortest-round-trip float printing in a proof assistant — lexicone42/ryu-lean4
  — advertises "Zero axioms. Zero sorrys." and separately discloses that
  `RyuLean4/Roundtrip/FormatParse.lean` uses `native_decide`.  Those two
  statements are compatible only under a narrow reading of "axiom" (no
  user-declared `axiom` command).  This file establishes, by execution on this
  machine, what `native_decide` actually does to Lean's own axiom footprint —
  the thing the estate's footprint gate measures.

      lean NativeDecideFootprint.lean

  See README.md in this directory for the recorded transcript.
-/

namespace RQ9

/-- A control: proved by the kernel's own evaluator. -/
theorem control : (2 : Nat) + 2 = 4 := by decide

/-- The same shape of goal, proved by the compiler instead. -/
theorem viaNative : (2 : Nat) + 2 = 4 := by native_decide

/-- A character comparison of exactly the kind ryu-lean4 discharges this way. -/
theorem charCompare : (('e' : Char) == '0') = false := by native_decide

/-- Anything that USES a `native_decide` lemma inherits its footprint. -/
theorem downstream : ((2 : Nat) + 2 = 4) ∧ (('e' : Char) == '0') = false :=
  ⟨viaNative, charCompare⟩

end RQ9

#print axioms RQ9.control
#print axioms RQ9.viaNative
#print axioms RQ9.charCompare
#print axioms RQ9.downstream
