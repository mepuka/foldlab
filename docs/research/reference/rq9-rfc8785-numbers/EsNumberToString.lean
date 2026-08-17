/-
  EsNumberToString.lean — foldlab RQ-9 reference artifact, 2026-08-16.
  Own-authored; no third-party code.

  A Lean 4 transcription of the RENDERING half of the algorithm RFC 8785
  §3.2.2.3 makes normative for JSON numbers: ECMA-262 10th edition (ES2019)
  §7.1.12.1 `NumberToString ( m )`, steps 1-4 and 6-10.

  Step 5 — "let n, k, and s be integers such that k >= 1, 10^(k-1) <= s < 10^k,
  the Number value for s * 10^(n-k) is m, and k is as small as possible" — is
  DELIBERATELY NOT IMPLEMENTED HERE.  Step 5 is the shortest-round-trip search
  (the Ryu / Grisu / Schubfach / Dragonbox problem).  This file takes its output
  as an input, which is the whole point: it exhibits, mechanically, that
  everything ES asks for BESIDES step 5 is total integer-and-string code with no
  floating point in it at all.

  Build/run on this machine (Lean 4.33.0, core only, no Mathlib):

      lean --run Driver.lean

  See README.md in this directory for the recorded transcript.
-/

namespace RQ9

/-- The output of ES2019 §7.1.12.1 step 5 for a finite non-zero Number:
    the value is `(-1)^sign * s * 10^(n-k)` and `k` is the digit count of `s`. -/
structure Step5 where
  sign : Bool
  s    : Nat
  k    : Nat
  n    : Int
deriving Repr, BEq

/-- `m` occurrences of DIGIT ZERO (U+0030). -/
def zeros (m : Nat) : String := String.ofList (List.replicate m '0')

/-- `String.take`/`String.drop` return a `String.Slice` in Lean 4.33.0. -/
@[inline] def takeS (s : String) (m : Nat) : String := (s.take m).toString
@[inline] def dropS (s : String) (m : Nat) : String := (s.drop m).toString

/-- ES2019 §7.1.12.1 steps 6-10, verbatim in structure.  Total: every branch
    returns, and the final `else` is step 10's unconditional return. -/
def render (d : Step5) : String :=
  let digits := toString d.s
  let k : Int := (d.k : Int)
  let body :=
    if k ≤ d.n && d.n ≤ 21 then
      -- step 6: the k digits, then n - k occurrences of DIGIT ZERO
      digits ++ zeros (d.n - k).toNat
    else if 0 < d.n && d.n ≤ 21 then
      -- step 7: most significant n digits, FULL STOP, remaining k - n digits
      takeS digits d.n.toNat ++ "." ++ dropS digits d.n.toNat
    else if -6 < d.n && d.n ≤ 0 then
      -- step 8: DIGIT ZERO, FULL STOP, -n zeros, the k digits
      "0." ++ zeros (-d.n).toNat ++ digits
    else
      let expSign := if d.n - 1 > 0 then "+" else "-"
      let expPart := "e" ++ expSign ++ toString (d.n - 1).natAbs
      if d.k = 1 then
        -- step 9: the single digit, then the exponent part
        digits ++ expPart
      else
        -- step 10: first digit, FULL STOP, remaining k - 1 digits, exponent part
        takeS digits 1 ++ "." ++ dropS digits 1 ++ expPart
  if d.sign then "-" ++ body else body

/-- ES2019 §7.1.12.1 steps 1-4, as a decision the caller must make before
    reaching `render`.  RFC 8785 §3.2.2.3 turns steps 1 and 4 into refusals:
    "occurrences of NaN or Infinity MUST cause a compliant JCS implementation
    to terminate with an appropriate error". -/
inductive Prelude where
  /-- ES step 1 / step 4 — RFC 8785 requires a refusal here, not a string. -/
  | refuse   : Prelude
  /-- ES step 2: "If m is +0 or -0, return the String "0"." -/
  | zero     : Prelude
  /-- ES steps 3 and 5-10: a finite non-zero Number, with step 5 already run. -/
  | finite   : Step5 → Prelude
deriving Repr

/-- The whole of NumberToString once step 5 is available, with RFC 8785's
    refusal replacing ES's "NaN"/"Infinity" strings. -/
def numberToString : Prelude → Option String
  | .refuse   => none
  | .zero     => some "0"
  | .finite d => some (render d)

/-! ## The REF-2a obligation, STATED — not proved here

The sub-grammar that every value crossing the foldlab wire occupies today is
the non-negative safe integers (`packages/moves/src/wire.ts` admits a value
only when `Number.isSafeInteger(j) && j >= 0`).  On that sub-grammar step 5 is
elementary — strip the trailing zeros of the integer — and the ES branch that
fires is always step 6.  The proposition below is what REF-2a would have to
prove.  It carries no proof in this file and must not be cited as one. -/

/-- Strip trailing zeros: returns `(s, e)` with `m = s * 10^e` and `s % 10 ≠ 0`
    for `m ≠ 0`. -/
def stripTrailingZeros (m : Nat) : Nat × Nat :=
  let rec go (s e fuel : Nat) : Nat × Nat :=
    match fuel with
    | 0 => (s, e)
    | fuel + 1 => if s ≠ 0 && s % 10 == 0 then go (s / 10) (e + 1) fuel else (s, e)
  go m 0 m

/-- Step 5 specialised to a positive `Nat` that is exactly a binary64. -/
def step5OfNat (m : Nat) : Step5 :=
  let (s, e) := stripTrailingZeros m
  let k := (toString s).length
  ⟨false, s, k, (k : Int) + (e : Int)⟩

/-- **REF-2a proof obligation (stated, unproved).** Over the wire's current
    value sub-grammar, canonical rendering is plain decimal digits. -/
def Ref2aIntegerLaw : Prop :=
  ∀ m : Nat, 0 < m → m ≤ 9007199254740991 → render (step5OfNat m) = toString m

end RQ9
