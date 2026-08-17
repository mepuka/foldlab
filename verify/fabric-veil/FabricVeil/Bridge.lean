import FabricVeil.Statements
import FabricVeil.Corpus

/-! # The corpus↔model bridge

The executable enabledness check the corpus twin answers to. Every exported
scenario — each prefix step and the attempted action — is driven through the
`Register` module's GENERATED transition relation (`Register.
enumerableTransitionSystem`, the same machinery `#model_check interpreted`
executes) at a finite interpreted instance, and the twin's verdicts and
states must agree step by step. A disagreement fails this `#eval`, which
fails `lake build FabricVeil`, which is the gate's first stage — so the
committed corpus can only regenerate as model-checked rows.

The same machinery executes the model-side refutation of the two mutant
controls: the generated relation refuses each mutant's accepted step.

Bound: the check instantiates the module at `Fin 3` holders, `Fin 4`
outcomes, token cap 3, `presentedToken h = h.val` — large enough to carry
every corpus row exactly. It verifies the exported rows against the proved
module; the module's invariants themselves are proved for all instances by
`#check_invariants`. -/

namespace FabricVeil.Bridge

open Veil FabricVeil

abbrev WHolder := Fin 3
abbrev WOutcome := Fin 4
abbrev WState := Register.State (Register.FieldConcreteType WHolder WOutcome)
abbrev WLabel := Register.Label WHolder WOutcome

/-- The wall instance's theory: presenting holder `h` presents token `h.val`,
so any presented token `t < 3` embeds as the attempt holder `⟨t⟩`. Holder
identity is never authority in the module, so the choice of attempt holder
cannot change a verdict. -/
def wallTheory : Register.Theory WHolder WOutcome :=
  { tokenCap := 3, presentedToken := fun h => h.val }

/-- The module's two assumptions, executed at the wall instance. -/
def wallTheoryOk : Bool :=
  decide (wallTheory.tokenCap > 0) &&
    (List.finRange 3).all fun h => decide (wallTheory.presentedToken h ≤ wallTheory.tokenCap)

def wallSystem := Register.enumerableTransitionSystem
  (holder := WHolder) (outcome := WOutcome) wallTheory

/-- The canonical initial state (`after_init` leaves `holderValue` and
`committedValue` unconstrained; both are projected away while absent). -/
def wallInit : WState :=
  Register.State.mk false 0 0 false 0 0 0 0 false

def wstateEq (a b : WState) : Bool :=
  a.present == b.present && a.token == b.token && a.holderValue == b.holderValue &&
    a.committed == b.committed && a.committedValue == b.committedValue &&
    a.landedToken == b.landedToken && a.landedCount == b.landedCount &&
    a.previousToken == b.previousToken && a.lastGrantOrSteal == b.lastGrantOrSteal

def mapHolder : String → Except String WHolder
  | "holder-a" => pure 0
  | "holder-b" => pure 1
  | h => throw s!"unmapped holder name: {h}"

def unmapHolder (h : WHolder) : Except String String :=
  match h.val with
  | 0 => pure "holder-a"
  | 1 => pure "holder-b"
  | _ => throw "module holder 2 carries no name; only presented-token attempts use it"

def outcomeNames : List String := ["first", "second", "winner", "zombie"]

def mapOutcome (v : String) : Except String WOutcome :=
  match outcomeNames.idxOf? v with
  | some i =>
      if h : i < 4 then pure ⟨i, h⟩
      else throw s!"outcome table exceeded the wall instance: {v}"
  | none => throw s!"unmapped outcome value: {v}"

def unmapOutcome (o : WOutcome) : Except String String :=
  match o.val with
  | 0 => pure "first"
  | 1 => pure "second"
  | 2 => pure "winner"
  | 3 => pure "zombie"
  | _ => throw "impossible Fin 4 value"

def mapPresented (t : Nat) : Except String WHolder :=
  if h : t < 3 then pure ⟨t, h⟩
  else throw s!"presented token {t} exceeds the wall instance"

def mapAction : Corpus.Action → Except String WLabel
  | .grant h => Register.Label.grant <$> mapHolder h
  | .renew t => Register.Label.renew <$> mapPresented t
  | .commit t v => do pure (Register.Label.commit (← mapPresented t) (← mapOutcome v))
  | .expireSteal h => Register.Label.expireSteal <$> mapHolder h
  | .observe => pure Register.Label.observe

/-- Projects a module state onto the corpus's observable fields. -/
def project (ms : WState) : Except String Corpus.State := do
  let holder ← if ms.present then some <$> unmapHolder ms.holderValue else pure none
  let outcome ← if ms.committed then do
      pure (some { token := ms.landedToken, value := ← unmapOutcome ms.committedValue })
    else pure none
  pure { token := ms.token, holder, outcome }

/-- All successful post-states the generated relation admits for one label. -/
def successorsFor (ms : WState) (label : WLabel) : List WState :=
  (wallSystem.tr wallTheory ms).filterMap fun (l, out) =>
    match out with
    | .success s' => if l == label then some s' else none
    | _ => none

/-- THE ENABLEDNESS CHECK: one corpus action driven through the module's
generated transition relation. `none` means the generated relation refuses. -/
def moduleStep (ms : WState) (act : Corpus.Action) : Except String (Option WState) := do
  match successorsFor ms (← mapAction act) with
  | [] => pure none
  | [s'] => pure (some s')
  | _ => throw s!"generated relation yields multiple successors for {repr act}"

/-- Walks a prefix through twin and module together, requiring projected
state agreement at every step; returns both cursors. -/
def walkPrefix (acts : List Corpus.Action) (who : String) :
    Except String (Corpus.State × WState) := do
  let mut cs := Corpus.initial
  let mut ms := wallInit
  unless (← project ms) == cs do throw s!"{who}: init projection mismatch"
  for act in acts do
    let some cs' := Corpus.acceptedStep cs act
      | throw s!"{who}: the twin refused a prefix step {repr act}"
    let some ms' ← moduleStep ms act
      | throw s!"{who}: the generated relation refuses a prefix step the twin accepted: {repr act}"
    unless (← project ms') == cs' do
      throw s!"{who}: prefix state disagreement after {repr act}"
    cs := cs'
    ms := ms'
  pure (cs, ms)

def checkScenario (sc : Corpus.Scenario) : Except String String := do
  let (cs, ms) ← walkPrefix sc.pre sc.id
  let twinNext := Corpus.acceptedStep cs sc.attempt
  let modelNext ← moduleStep ms sc.attempt
  match twinNext, modelNext with
  | some cs', some ms' =>
      unless (← project ms') == cs' do
        throw s!"{sc.id}: accepted-state disagreement on the attempt"
      pure s!"corpus-model agreement: {sc.id} verdict=accepted (generated relation)"
  | none, none =>
      pure s!"corpus-model agreement: {sc.id} verdict=refused (generated relation)"
  | some _, none =>
      throw s!"{sc.id}: the twin accepts an attempt the generated relation refuses"
  | none, some _ =>
      throw s!"{sc.id}: the twin refuses an attempt the generated relation accepts"

/-- Model-side refutation of the commit-guard mutant, executed: the mutant
accepts a stale commit; the generated relation refuses that very label. -/
def commitMutantRefutation : Except String String := do
  let (cs, ms) ← walkPrefix [.grant "holder-a", .expireSteal "holder-b"] "drop-commit-token-guard"
  let some mutantPost := Corpus.commitWithoutTokenGuard cs 1 "zombie"
    | throw "drop-commit-token-guard: the mutant refused; the control did not execute"
  let some landed := mutantPost.outcome
    | throw "drop-commit-token-guard: the mutant landed nothing"
  if landed.token == mutantPost.token then
    throw "drop-commit-token-guard: no violation of: no stale token ever lands"
  match ← moduleStep ms (.commit 1 "zombie") with
  | none =>
      pure "mutant-refutation: drop-commit-token-guard — the generated relation refuses the step the mutant accepts (executed)"
  | some _ =>
      throw "drop-commit-token-guard: the generated relation ACCEPTED the mutant's step; the guard is not load-bearing"

/-- Model-side refutation of the steal-strictness mutant, executed: the label
is enabled, but the mutant's non-increasing post-state is outside the
generated relation. -/
def stealMutantRefutation : Except String String := do
  let (cs, ms) ← walkPrefix [.grant "holder-a"] "drop-steal-strict-increase"
  let some mutantPost := Corpus.stealWithoutStrictIncrease cs "holder-b"
    | throw "drop-steal-strict-increase: the mutant refused; the control did not execute"
  if mutantPost.token > cs.token then
    throw "drop-steal-strict-increase: the mutant did not drop strict increase"
  let some ms' ← moduleStep ms (.expireSteal "holder-b")
    | throw "drop-steal-strict-increase: the generated relation unexpectedly refuses expire-steal"
  let projected ← project ms'
  if projected == mutantPost then
    throw "drop-steal-strict-increase: the mutant's post-state matches the generated relation; strictness is not load-bearing"
  unless projected.token > cs.token do
    throw "drop-steal-strict-increase: the generated relation's steal did not strictly increase"
  pure "mutant-refutation: drop-steal-strict-increase — the mutant's post-state is outside the generated relation, whose steal strictly increases (executed)"

def wallReport : Except String (List String) := do
  unless wallTheoryOk do
    throw "the wall instance violates the module's assumptions"
  unless wallSystem.initStates.any (wstateEq · wallInit) do
    throw "the canonical initial state is not among the generated initial states"
  let mut lines : Array String := #[]
  for sc in Corpus.scenarios do
    lines := lines.push (← checkScenario sc)
  lines := lines.push (← commitMutantRefutation)
  lines := lines.push (← stealMutantRefutation)
  pure lines.toList

/- Executes the whole bridge at library-build time; a twin/model
disagreement is a failed build. -/
#eval show IO Unit from do
  match wallReport with
  | .ok lines => lines.forM IO.println
  | .error e => throw (IO.userError s!"corpus-model bridge RED: {e}")

end FabricVeil.Bridge
