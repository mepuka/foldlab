import Veil.Core.Tools.ModelChecker.Trace
import Lean

/-! # The exported register corpus

This file deliberately imports only the pinned Veil `Trace` module (three
small files), never the proved `Register` module: the exporter executable
links this closure, and linking the whole Veil/Mathlib closure into one
binary is what killed the CI exporter step. The semantic authority is NOT
this file's `acceptedStep` twin — every scenario below, prefix step and
attempt alike, is checked executably against the `Register` module's
generated transition relation in `FabricVeil/Bridge.lean`, which builds
with the library on every gate run. A twin/model disagreement is a red
library build, so the exported rows are model-checked rows. -/

namespace FabricVeil.Corpus

open Lean
open Veil.ModelChecker

structure LandedOutcome where
  token : Nat
  value : String
deriving DecidableEq, Repr, Inhabited

structure State where
  token : Nat
  holder : Option String
  outcome : Option LandedOutcome
deriving DecidableEq, Repr, Inhabited

inductive Action where
  | grant (holder : String)
  | renew (token : Nat)
  | commit (token : Nat) (outcome : String)
  | expireSteal (holder : String)
  | observe
deriving DecidableEq, Repr, Inhabited

instance : ToJson LandedOutcome where
  toJson value := Json.mkObj [
    ("token", toJson value.token),
    ("value", toJson value.value)
  ]

instance : ToJson State where
  toJson state := Json.mkObj [
    ("token", toJson state.token),
    ("holder", toJson state.holder),
    ("outcome", toJson state.outcome)
  ]

instance : ToJson Action where
  toJson
    | .grant holder => Json.mkObj [
        ("kind", "grant"), ("holder", toJson holder)]
    | .renew token => Json.mkObj [
        ("kind", "renew"), ("token", toJson token)]
    | .commit token outcome => Json.mkObj [
        ("kind", "commit"), ("token", toJson token),
        ("outcome", toJson outcome)]
    | .expireSteal holder => Json.mkObj [
        ("kind", "expire-steal"), ("holder", toJson holder)]
    | .observe => Json.mkObj [("kind", "observe")]

/-- The trace theory is `Unit`; serialize it exactly as the pinned Veil
`jsonOfRepr` catch-all did (`"()"`), keeping the fixture bytes stable
without importing the full Veil closure. -/
instance : ToJson Unit where
  toJson _ := Json.str "()"

def initial : State := { token := 0, holder := none, outcome := none }

/-- The serialization twin of the model's step. Checked, not trusted: every
exported step is verified against the module's generated transition relation
by `FabricVeil/Bridge.lean` at library-build time. -/
def acceptedStep (state : State) (act : Action) : Option State :=
  match act with
  | .grant holder =>
      if state.holder.isNone && state.outcome.isNone then
        some { state with token := state.token + 1, holder := some holder }
      else none
  | .renew token =>
      if state.holder.isSome && state.outcome.isNone && token = state.token then
        some { state with token := state.token + 1 }
      else none
  | .commit token outcome =>
      if state.holder.isSome && state.outcome.isNone && token = state.token then
        some { state with outcome := some { token, value := outcome } }
      else none
  | .expireSteal holder =>
      if state.holder.isSome && state.outcome.isNone then
        some { state with token := state.token + 1, holder := some holder }
      else none
  | .observe => some state

def pushAccepted
    (trc : Trace Unit State Action) (act : Action) :
    Except String (Trace Unit State Action) := do
  let some next := acceptedStep trc.lastState act
    | throw s!"prefix action was refused: {repr act}"
  pure <| trc.push { transitionLabel := act, nextState := next }

def buildTrace (acts : List Action) : Except String (Trace Unit State Action) := do
  let empty : Trace Unit State Action := {
    theory := (), initialState := initial, steps := #[]
  }
  acts.foldlM pushAccepted empty

structure Scenario where
  id : String
  pre : List Action
  attempt : Action
  law : String := ""

def scenarios : List Scenario := [
  { id := "grant-first", pre := [], attempt := .grant "holder-a" },
  { id := "duplicate-grant", pre := [.grant "holder-a"],
    attempt := .grant "holder-b", law := "grant requires the register to be absent" },
  { id := "renew-current", pre := [.grant "holder-a"], attempt := .renew 1 },
  { id := "renew-stale", pre := [.grant "holder-a", .renew 1],
    attempt := .renew 1, law := "renew requires the current fencing token" },
  { id := "steal-after-grant", pre := [.grant "holder-a"],
    attempt := .expireSteal "holder-b" },
  { id := "zombie-stale-commit", pre := [.grant "holder-a", .expireSteal "holder-b"],
    attempt := .commit 1 "zombie", law := "no stale token ever lands" },
  { id := "winner-commit", pre := [.grant "holder-a", .expireSteal "holder-b"],
    attempt := .commit 2 "winner" },
  { id := "second-commit", pre := [.grant "holder-a", .commit 1 "first"],
    attempt := .commit 1 "second", law := "an outcome, once set, never changes" },
  { id := "observe-absent", pre := [], attempt := .observe },
  { id := "observe-held", pre := [.grant "holder-a"], attempt := .observe },
  { id := "renew-then-steal", pre := [.grant "holder-a", .renew 1],
    attempt := .expireSteal "holder-b" },
  { id := "renewed-zombie-commit", pre := [.grant "holder-a", .renew 1, .expireSteal "holder-b"],
    attempt := .commit 2 "zombie", law := "no stale token ever lands" },
  -- Post-terminal rows: the model freezes every mutating action after a
  -- landing; these rows wall that freeze on all three non-commit actions.
  -- renew presents the CURRENT token so the landed outcome, not staleness,
  -- is the isolated refusing guard.
  { id := "grant-after-commit", pre := [.grant "holder-a", .commit 1 "first"],
    attempt := .grant "holder-b", law := "grant requires the register to be absent" },
  { id := "renew-after-commit", pre := [.grant "holder-a", .commit 1 "first"],
    attempt := .renew 1, law := "an outcome, once set, never changes" },
  { id := "steal-after-commit", pre := [.grant "holder-a", .commit 1 "first"],
    attempt := .expireSteal "holder-b", law := "an outcome, once set, never changes" }
]

def scenarioJson (scenario : Scenario) : Except String Json := do
  let trc ← buildTrace scenario.pre
  let accepted := acceptedStep trc.lastState scenario.attempt
  let observed := accepted.getD trc.lastState
  let verdict := if accepted.isSome then "accepted" else "refused"
  pure <| Json.mkObj [
    ("id", toJson scenario.id),
    ("trace", toJson trc),
    ("attempt", toJson scenario.attempt),
    ("verdict", verdict),
    ("law", toJson scenario.law),
    ("observed", toJson observed)
  ]

def corpusText : Except String String := do
  let rows ← scenarios.mapM scenarioJson
  let header := Json.mkObj [
    ("provenance", "lake exe fabric_veil_export --write-corpus packages/plait/fixtures/register-traces.ndjson"),
    ("rows", toJson rows.length)
  ]
  pure <| String.intercalate "\n" ((header :: rows).map Json.compress) ++ "\n"

/-! ## Executed model-level mutants

Each negative control is a real mutated step function. The control artifact
is produced by RUNNING the mutant: the violating state below is computed by
execution, never hand-assembled, and the generation itself refuses to emit
an exhibit whose refutation did not execute. `FabricVeil/Bridge.lean`
additionally executes the model-side refutation: the generated transition
relation refuses each mutant's accepted step. -/

/-- Mutant: `commit` with the fencing-token guard deleted. Everything else
matches `acceptedStep`'s commit arm. -/
def commitWithoutTokenGuard (state : State) (token : Nat) (outcome : String) : Option State :=
  if state.holder.isSome && state.outcome.isNone then
    some { state with outcome := some { token, value := outcome } }
  else none

/-- Mutant: `expire-steal` with the strict token increase deleted. Everything
else matches `acceptedStep`'s expire-steal arm. -/
def stealWithoutStrictIncrease (state : State) (holder : String) : Option State :=
  if state.holder.isSome && state.outcome.isNone then
    some { state with holder := some holder }
  else none

def controlJson (name guard law honestVerdict : String) (trc : Trace Unit State Action)
    (attempt : Action) (mutantObserved : State) (witness : Json) : Json := Json.mkObj [
  ("control", toJson name),
  ("dropped_guard", toJson guard),
  ("violated_law", toJson law),
  ("trace", toJson trc),
  ("attempt", toJson attempt),
  ("honest_verdict", toJson honestVerdict),
  ("mutant_verdict", "accepted"),
  ("mutant_observed", toJson mutantObserved),
  ("violation_witness", witness)
]

/-- Runs the commit-guard mutant to its violating state and refuses to emit
the exhibit unless the refutation executed: the honest step refuses, the
mutant accepts, and the landed token is provably stale on the produced state. -/
def commitGuardControl : Except String Json := do
  let trc ← buildTrace [.grant "holder-a", .expireSteal "holder-b"]
  let pre := trc.lastState
  let attempt : Action := .commit 1 "zombie"
  if (acceptedStep pre attempt).isSome then
    throw "commit-guard control is vacuous: the honest step accepted the stale commit"
  let some mutantObserved := commitWithoutTokenGuard pre 1 "zombie"
    | throw "commit-guard control did not execute: the mutant refused"
  let some landed := mutantObserved.outcome
    | throw "commit-guard control did not execute: the mutant landed nothing"
  if landed.token == mutantObserved.token then
    throw "commit-guard control produced no violation of: no stale token ever lands"
  pure <| controlJson "drop-commit-token-guard"
    "commit requires the presented token to equal the current token"
    "no stale token ever lands" "refused" trc attempt mutantObserved
    (Json.mkObj [("landed_token", toJson landed.token), ("current_token", toJson mutantObserved.token)])

/-- Runs the steal-strictness mutant and refuses to emit the exhibit unless
the produced state fails strict increase while the honest step's succeeds. -/
def stealStrictnessControl : Except String Json := do
  let trc ← buildTrace [.grant "holder-a"]
  let pre := trc.lastState
  let some honest := acceptedStep pre (.expireSteal "holder-b")
    | throw "steal-strictness control is vacuous: the honest steal refused"
  if honest.token ≤ pre.token then
    throw "steal-strictness control is vacuous: the honest steal did not strictly increase"
  let some mutantObserved := stealWithoutStrictIncrease pre "holder-b"
    | throw "steal-strictness control did not execute: the mutant refused"
  if mutantObserved.token > pre.token then
    throw "steal-strictness control produced no violation of: every steal strictly increases the token"
  pure <| controlJson "drop-steal-strict-increase"
    "expire-steal assigns current token + 1"
    "every steal strictly increases the token" "accepted" trc (.expireSteal "holder-b") mutantObserved
    (Json.mkObj [("pre_token", toJson pre.token), ("mutant_token", toJson mutantObserved.token),
                 ("honest_token", toJson honest.token)])

def controlTexts : Except String (String × String) := do
  let stale ← commitGuardControl
  let steal ← stealStrictnessControl
  pure (stale.compress ++ "\n", steal.compress ++ "\n")

end FabricVeil.Corpus
