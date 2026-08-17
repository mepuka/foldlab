/-
  Driver.lean — foldlab RQ-9 reference artifact, 2026-08-16. Own-authored.

  Runs the transcribed ES2019 §7.1.12.1 renderer over the generated RFC 8785
  Appendix B vectors and over the wire's current integer sub-grammar.

      lean --run Driver.lean

  Exit is via IO; a mismatch prints and the process exits nonzero.
-/
import AppendixBVectors

namespace RQ9

/-- The two zero rows of Appendix B (`0000000000000000`, `8000000000000000`)
    both expect `"0"`, which is ES step 2, not `render`. -/
def zeroRows : List String := ["0000000000000000", "8000000000000000"]

/-- The two rows Appendix B marks with a `null` expectation — NaN and Infinity.
    RFC 8785 §3.2.2.3 requires a refusal, which `numberToString` returns as
    `none`. -/
def refuseRows : List String := ["7fffffffffffffff", "7ff0000000000000"]

def main : IO UInt32 := do
  let mut bad := 0
  for (d, expected, comment) in appendixB do
    let got := render d
    if got != expected then
      bad := bad + 1
      IO.println s!"MISMATCH {comment}: render {repr d} = {got}, expected {expected}"
  IO.println s!"appendix-b rendered rows: {appendixB.length}, mismatches: {bad}"

  -- ES step 2 and RFC 8785's refusal, exercised through `numberToString`.
  unless numberToString .zero == some "0" do
    bad := bad + 1; IO.println "MISMATCH: zero row"
  unless numberToString .refuse == none do
    bad := bad + 1; IO.println "MISMATCH: refusal row"
  IO.println s!"zero rows: {zeroRows.length}, refusal rows: {refuseRows.length}"

  -- The wire's current sub-grammar: every non-negative safe integer renders as
  -- its own decimal digits.  Sampled, not proved (that is `Ref2aIntegerLaw`).
  let samples : List Nat :=
    [1, 7, 10, 100, 1000000, 999999999999999, 9007199254740991, 9007199254740990,
     123456789, 2, 20, 200, 2000000000000000]
  let mut intBad := 0
  for m in samples do
    if render (step5OfNat m) != toString m then
      intBad := intBad + 1
      IO.println s!"MISMATCH integer {m}: {render (step5OfNat m)}"
  IO.println s!"integer sub-grammar samples: {samples.length}, mismatches: {intBad}"

  return if bad + intBad == 0 then 0 else 1

end RQ9

def main : IO UInt32 := RQ9.main
