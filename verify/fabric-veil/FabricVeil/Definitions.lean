import Veil
import Lean

namespace FabricVeil

open Lean

/-- F5 is parameterized by one work digest; a runtime key supplies it. -/
abbrev Token := Nat

/-- The five actions in the lease-register transition system. -/
inductive ActionKind where
  | grant
  | renew
  | commit
  | expireSteal
  | observe
deriving DecidableEq, Repr, ToJson

/-! ## Axiom-footprint census

Trust enforcement is by artifact, never prose: the checkers below read the
kernel's axiom census of named theorem terms out of the environment. A trusted
SMT discharge leaves `sorryAx` in the proof term's footprint, so it cannot pass
`assertPinnedFootprint` no matter what any log or source grep says. -/

/-- The only axioms a claimed theorem may depend on. -/
def pinnedAxioms : List Name := [``propext, ``Classical.choice, ``Quot.sound]

/-- The kernel-level axiom census of one declaration, sorted for stable logs. -/
def axiomFootprint (env : Environment) (decl : Name) : List String :=
  let (_, s) := ((CollectAxioms.collect decl).run env).run {}
  (s.axioms.toList.map toString).mergeSort (fun a b => decide (a ≤ b))

/-- Renders a census as the log form `[a, b, c]`. -/
def renderFootprint (axioms : List String) : String :=
  "[" ++ String.intercalate ", " axioms ++ "]"

/-- Fails elaboration unless every rostered theorem exists and its axiom
census stays inside `pinnedAxioms`; logs one census line per theorem. -/
def assertPinnedFootprint (decls : List Name) : Elab.Command.CommandElabM Unit := do
  let env ← getEnv
  let allowed := pinnedAxioms.map toString
  for decl in decls do
    unless env.contains decl do
      throwError "roster-footprint MISSING {decl}: the claimed theorem is not in the environment"
    let axioms := axiomFootprint env decl
    let offending := axioms.filter (fun a => !allowed.contains a)
    unless offending.isEmpty do
      throwError "roster-footprint RED {decl}: axioms {renderFootprint axioms} leave the pinned set {renderFootprint allowed}"
    logInfo s!"roster-footprint PASS {decl} axioms={renderFootprint axioms}"

/-- The negative-control direction: fails elaboration unless the named theorem's
census exposes `sorryAx` — proving the census checker can refuse. -/
def expectSorryFootprint (decl : Name) : Elab.Command.CommandElabM Unit := do
  let env ← getEnv
  unless env.contains decl do
    throwError "trusted-mode control theorem missing: {decl}"
  let axioms := axiomFootprint env decl
  if axioms.contains (toString ``sorryAx) then
    logInfo s!"control-footprint REFUSED {decl} axioms={renderFootprint axioms}"
  else
    throwError "trusted-mode control was incorrectly accepted: {decl} axioms={renderFootprint axioms}"

end FabricVeil
