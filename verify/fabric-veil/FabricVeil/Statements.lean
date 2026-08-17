import FabricVeil.Definitions

set_option veil.smt.trust false

veil module Register

type holder
type outcome

/- The bound is a falsification parameter. The invariant is proved for every
positive bound, so any finite runtime trace embeds by choosing a larger bound. -/
immutable individual tokenCap : Nat
immutable function presentedToken : holder → Nat

individual present : Bool
individual token : Nat
individual holderValue : holder
individual committed : Bool
individual committedValue : outcome
individual landedToken : Nat
individual landedCount : Nat
individual previousToken : Nat
individual lastGrantOrSteal : Bool

#gen_state

assumption tokenCap > 0
assumption ∀ h, presentedToken h ≤ tokenCap

after_init {
  present := false
  token := 0
  holderValue := *
  committed := false
  committedValue := *
  landedToken := 0
  landedCount := 0
  previousToken := 0
  lastGrantOrSteal := false
}

action grant (newHolder : holder) {
  require ¬present
  require ¬committed
  require token < tokenCap
  previousToken := token
  token := token + 1
  holderValue := newHolder
  present := true
  lastGrantOrSteal := true
}

action renew (attempt : holder) {
  require present
  require ¬committed
  require presentedToken attempt = token
  require token < tokenCap
  previousToken := token
  token := token + 1
  lastGrantOrSteal := false
}

action commit (attempt : holder) (value : outcome) {
  require present
  require ¬committed
  require presentedToken attempt = token
  previousToken := token
  landedToken := presentedToken attempt
  landedCount := landedCount + 1
  committedValue := value
  committed := true
  lastGrantOrSteal := false
}

action expireSteal (newHolder : holder) {
  require present
  require ¬committed
  require token < tokenCap
  previousToken := token
  token := token + 1
  holderValue := newHolder
  lastGrantOrSteal := true
}

action observe {
  previousToken := token
  lastGrantOrSteal := false
}

/- I1: the token never decreases, and grant/steal strictly increase it. -/
invariant [token_monotone] previousToken ≤ token
invariant [grant_or_steal_strict]
  lastGrantOrSteal → previousToken < token

/- I2: an outcome lands at most once and only under the current token. -/
invariant [at_most_one_landed_commit] landedCount ≤ 1
invariant [no_stale_token_lands]
  committed → landedToken = token
invariant [commit_has_one_landing]
  committed → landedCount = 1
invariant [landing_has_outcome]
  landedCount = 1 → committed

#gen_spec

set_option veil.smt.trust false in
#check_invariants

/- Land every discharged verification-condition proof as an addressable theorem
(`Register.<action>_<invariant>` plus the initialization obligations), so the
roster census in `FabricVeil/Proofs.lean` can read each proof term's axiom
footprint out of the kernel. -/
#gen_theorems

#model_check interpreted
  { holder := Fin 3, outcome := Fin 2 }
  { tokenCap := 3, presentedToken := fun h => h.val }

end Register
