/-
Deterministic case generation. splitmix64 in pure Lean over `UInt64`:
wrapping 64-bit arithmetic is fixed-width and platform-independent, so the
stream depends on the seed alone -- not on the host, the word size, or the
build. Case `i` is addressed by seed `i`; the corpus is a memoized prefix
of this function, never a hand-authored artifact.

The move mix deliberately covers every refusal class of `D85Refusal`:
empty dispute offers (refused at every state), disputes and decides at
decided holes, and decides whose value is absent from the candidate set.
-/
import Oracle.Instance

namespace Oracle
open Moves

abbrev Seed := UInt64

def nextSeed (s : Seed) : Seed := s + 0x9E3779B97F4A7C15

def mix (s : Seed) : UInt64 :=
  let z := s
  let z := (z ^^^ (z >>> 30)) * 0xBF58476D1CE4E5B9
  let z := (z ^^^ (z >>> 27)) * 0x94D049BB133111EB
  z ^^^ (z >>> 31)

/-- Uniform-ish `Nat` below `n`. -/
def rand (s : Seed) (n : Nat) : Nat × Seed :=
  let s' := nextSeed s
  ((mix s').toNat % (max n 1), s')

def pick {α} (s : Seed) (xs : List α) (dflt : α) : α × Seed :=
  let (i, s') := rand s xs.length
  (xs.getD i dflt, s')

def actors : List Actor := ["alice", "bob", "carol"]

def randMove (s : Seed) : Mv × Seed :=
  let (k, s) := rand s 12
  let (h, s) := pick s holes .h0
  let (v, s) := rand s 4
  let (a, s) := pick s actors "alice"
  if k < 6 then (.fill h v a, s)
  else if k < 7 then (.dispute h (∅ : CSet) a, s)
  else if k < 10 then
    let (v2, s) := rand s 4
    let (a2, s) := pick s actors "alice"
    (.dispute h (Std.ExtTreeSet.ofList [(v, a), (v2, a2)] candCmp) a, s)
  else (.decide h v, s)

def randTrace (s : Seed) (len : Nat) : List Mv × Seed :=
  let rec go (s : Seed) (n : Nat) (acc : List Mv) : List Mv × Seed :=
    match n with
    | 0 => (acc.reverse, s)
    | n+1 => let (m, s) := randMove s; go s n (m :: acc)
  go s len []

def caseOf (i : Nat) : List Mv :=
  let s : Seed := UInt64.ofNat i
  let (len, s) := rand s 6
  (randTrace s (len + 1)).1

end Oracle
