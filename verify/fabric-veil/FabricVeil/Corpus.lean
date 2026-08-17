import FabricVeil.Definitions
import Veil.Core.Tools.ModelChecker.Trace

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

def initial : State := { token := 0, holder := none, outcome := none }

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

def system : Veil.RelationalTransitionSystem Unit State Action where
  assumptions := fun _ => True
  init := fun _ state => state = initial
  tr := fun _ state act next => acceptedStep state act = some next

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

def traceValid (trc : Trace Unit State Action) : Bool :=
  trc.initialState = initial &&
    (trc.steps.foldl (fun current step =>
      current.bind fun state =>
        match acceptedStep state step.transitionLabel with
        | some next => if next = step.nextState then some next else none
        | none => none) (some trc.initialState)).isSome

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
    attempt := .commit 2 "zombie", law := "no stale token ever lands" }
]

def scenarioJson (scenario : Scenario) : Except String Json := do
  let trc ← buildTrace scenario.pre
  if !traceValid trc then throw s!"invalid trace construction: {scenario.id}"
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

def droppedCommitGuardState : State := {
  token := 2,
  holder := some "holder-b",
  outcome := some { token := 1, value := "zombie" }
}

def droppedStealStrictnessState : State := {
  token := 1,
  holder := some "holder-b",
  outcome := none
}

def controlJson (name guard law : String) (trc : Trace Unit State Action)
    (attempt : Action) (observed : State) : Json := Json.mkObj [
  ("control", toJson name),
  ("dropped_guard", toJson guard),
  ("violated_law", toJson law),
  ("trace", toJson trc),
  ("attempt", toJson attempt),
  ("mutant_observed", toJson observed)
]

def controlTexts : Except String (String × String) := do
  let staleTrace ← buildTrace [.grant "holder-a", .expireSteal "holder-b"]
  let stealTrace ← buildTrace [.grant "holder-a"]
  let stale := controlJson "drop-commit-token-guard"
    "commit requires the presented token to equal the current token"
    "no stale token ever lands" staleTrace (.commit 1 "zombie") droppedCommitGuardState
  let steal := controlJson "drop-steal-strict-increase"
    "expire-steal assigns current token + 1"
    "every steal strictly increases the token" stealTrace (.expireSteal "holder-b")
    droppedStealStrictnessState
  pure (stale.compress ++ "\n", steal.compress ++ "\n")

end FabricVeil.Corpus
