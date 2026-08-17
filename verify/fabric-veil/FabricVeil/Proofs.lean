import FabricVeil.Statements

namespace FabricVeil

open Lean

/-! ## The claim-carrying roster

The F5 obligations are the verification-condition theorems
`#check_invariants` generated and discharged and `#gen_theorems` landed in
the environment: one initialization obligation and one preservation
obligation per action for every invariant clause. The census below reads
each proof term's axiom footprint out of the kernel and fails the build on
anything outside the pinned set — `sorryAx` (trusted mode) included. The
list is generated as the full action×invariant product so no obligation can
be silently dropped; `theorem-roster.txt` pins the same names for the gate's
independent cross-check of this build's log. -/

def rosterProcedures : List String :=
  ["initializer", "grant", "renew", "commit", "expireSteal", "observe"]

def rosterInvariants : List String :=
  ["token_monotone", "grant_or_steal_strict", "at_most_one_landed_commit",
   "no_stale_token_lands", "commit_has_one_landing", "landing_has_outcome"]

def rosteredVCTheorems : List Name :=
  rosterProcedures.flatMap fun act =>
    rosterInvariants.map fun inv =>
      Name.mkStr2 "Register" s!"{act}_{inv}"

run_cmd assertPinnedFootprint rosteredVCTheorems

/-! ## Arithmetic warm-ups

These two theorems are arithmetic shadows of the invariant shapes and carry
NO F5 claim; they exist as elementary kernel-checked demonstrations only.
The claim-carrying theorems are the rostered `Register.*` verification
conditions above. -/

/-- Warm-up only: the successor shape behind strict token increase. -/
theorem nat_successor_strict (n : Nat) : n < n + 1 := by
  omega

/-- Warm-up only: the counting shape behind the unique landing. -/
theorem nat_first_landing_counts_once (landed : Nat) (h : landed = 0) : landed + 1 = 1 := by
  omega

end FabricVeil
