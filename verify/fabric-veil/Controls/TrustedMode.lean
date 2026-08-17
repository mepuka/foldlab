import FabricVeil.Definitions

/-! # Trusted-mode negative control

The DEV-711 review's plant, committed as a control: a minimal
invariant-bearing Veil module whose verification conditions are discharged
under a SCOPED `veil.smt.trust true` override while the file-level option
stays `false` — the one-line shape that slipped every log- and grep-level
check in round 1. The census checker must refuse it by ARTIFACT:
`#gen_theorems` lands the trusted VC theorems, and their kernel axiom
footprints expose `sorryAx`. Both checks below fail the build if a footprint
comes back clean — the checker is proven able to fail. This module is
deliberately outside `theorem-roster.txt`.

Measured correction to the round-1 mechanism reading: at this pin the VC
dischargers bind their options when the spec is FINALIZED, so the review's
literal plant site (`... true in #check_invariants`) leaves the proofs
reconstructed and their footprints clean — census-measured here before
moving the override. The load-bearing site is the option in force at
`#gen_spec`; that is where this control plants it (as a bare toggle,
because `set_option ... in` scoping rolls back Veil's module-state
extension), and the census REDs on the resulting `sorryAx`. Either way
round 1's grep pair saw nothing: only the footprint census distinguishes
the two runs, which is the point. -/

set_option warn.sorry false
set_option veil.smt.trust false

veil module TrustedTwin

individual flag : Bool

#gen_state

after_init {
  flag := false
}

action keep {
  pure ()
}

invariant [stays_false] ¬ flag

set_option veil.smt.trust true
#gen_spec
set_option veil.smt.trust false

#check_invariants

#gen_theorems

end TrustedTwin

run_cmd FabricVeil.expectSorryFootprint (Lean.Name.mkStr2 "TrustedTwin" "keep_stays_false")
run_cmd FabricVeil.expectSorryFootprint (Lean.Name.mkStr2 "TrustedTwin" "initializer_stays_false")
