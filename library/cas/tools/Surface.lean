import Lean
import Cas.Values.Json
import Gate

/-!
# The report lane — `lake exe surface`

Per-declaration reports for the whole `Cas` library, extracted from
the COMPILED environment — the pattern source is Concrete's proof
report (`lambdaclass/concrete`, `Concrete/Report/Report.lean`,
observed 2026-08-28): per-definition entries with canonical labels,
an evidence dimension, and summary totals, so the surface is held as
a ledger, not a feeling.

Each declaration carries its name, kind, pretty-printed signature,
and doc coverage; each THEOREM additionally carries its axiom report
(`collectAxioms`), and the document heads with the library-wide axiom
census — the estate's axiom-hygiene obligation, automated. `--check`
is the byte-identity gate in `check:cas`: any change to the type
surface, any new axiom dependency, any lost docstring is a visible
diff, never a drift.

Compiler-generated boilerplate (recursors, `casesOn`, injectivity
lemmas, match/proof auxiliaries) is excluded; field projections stay —
they are real API. Signatures print at a fixed width by the pinned
toolchain's pretty printer; a toolchain bump that reprints them is a
re-gen event the gate makes loud.
-/

open Lean

def outPath : System.FilePath := "surface" / "cas-surface.json"

/-- The three axioms the estate considers clean; anything else in a
report is a finding. -/
def cleanAxioms : List Name := [`propext, `Classical.choice, `Quot.sound]

def generatedSuffixes : List String := [
  "casesOn", "ctorIdx", "rec", "recOn", "brecOn", "binductionOn",
  "below", "ibelow", "noConfusion", "noConfusionType", "toCtorIdx",
  "ofNat", "injEq", "inj", "sizeOf_spec", "eq_def", "eq_1", "eq_2",
  "eq_3", "eq_4", "elim"]

def isGenerated (n : Name) : Bool :=
  match n with
  | .str _ last =>
    generatedSuffixes.contains last ||
    last.startsWith "match_" || last.startsWith "proof_" ||
    last.startsWith "eq_def"
  | _ => true

structure Row where
  name : String
  kind : String
  signature : String
  documented : Bool
  axioms : List String := []
  /-- Architecture areas the SIGNATURE touches — the second component
  of each used constant's defining module (`Lang`, `Schema`,
  `Grammar`, `Backend`, `Codec`, `Core`, `IR`, `Values`, `Vectors`). -/
  touches : List String := []
  /-- The ratified core carriers the signature mentions — the effect
  representation index: a row carrying `Prog`/`Handler`/`Sig`/
  `interpret` IS an effect-representation function. -/
  carriers : List String := []

def moduleOf (env : Environment) (n : Name) : Option Name := do
  let idx ← env.getModuleIdxFor? n
  return env.header.moduleNames[idx.toNat]!

/-- The ratified core carriers (store-language skill vocabulary). -/
def coreCarriers : List Name := [
  `Cas.Lang.Prog, `Cas.Lang.Sig, `Cas.Lang.Handler, `Cas.Lang.interpret,
  `Cas.Lang.Status, `Cas.Lang.Refusal,
  `Cas.Schema.Ast, `Cas.Schema.El, `Cas.Schema.Described,
  `Cas.Grammar.Tree, `Cas.Grammar.Ty,
  `Cas.Word, `Cas.Node, `Cas.Binding, `Cas.Addr32]

/-- The architecture area of a constant: the component after `Cas.`
in its defining module. -/
def areaOf (env : Environment) (c : Name) : Option String := do
  let m ← moduleOf env c
  match m with
  | .str p last =>
    if p == `Cas then some last
    else match m.components with
      | _ :: area :: _ => some area.toString
      | _ => none
  | _ => none

def classify (env : Environment) (type : Expr) :
    List String × List String :=
  let used := type.getUsedConstants.toList.filter (·.getRoot == `Cas)
  let areas := (used.filterMap (areaOf env)).eraseDups.mergeSort (· < ·)
  let carriers := (used.filter coreCarriers.contains).eraseDups.map
    (fun n => n.toString) |>.mergeSort (· < ·)
  (areas, carriers)

/-- Kind, with instances detected by the head of the signature's
telescope being a class — reliable across imported environments. -/
def kindOf (env : Environment) (n : Name) (ci : ConstantInfo) :
    MetaM (Option String) := do
  match ci with
  | .thmInfo _ => return some "theorem"
  | .axiomInfo _ => return some "axiom"
  | .opaqueInfo _ => return some "opaque"
  | .inductInfo _ =>
    if isStructure env n then
      return some (if Lean.isClass env n then "class" else "structure")
    else return some "inductive"
  | .defnInfo _ =>
    if Lean.isClass env n then return some "class"
    let isInst ← Meta.forallTelescopeReducing ci.type fun _ body => do
      let f := body.getAppFn
      return f.isConst && Lean.isClass env f.constName!
    return some (if isInst then "instance" else "def")
  | _ => return none

def collect (env : Environment) : CoreM (Array (Name × Array Row)) := do
  let mut byModule : Std.HashMap Name (Array Row) := {}
  for (n, ci) in env.constants.toList do
    if n.isInternalDetail || n.isAnonymous || isGenerated n then continue
    unless n.getRoot == `Cas do continue
    let some m := moduleOf env n | continue
    unless m.getRoot == `Cas do continue
    let some kind ← Meta.MetaM.run' (kindOf env n ci) | continue
    let sig ← Meta.MetaM.run' do
      return (← Meta.ppExpr ci.type).pretty (width := 10000)
    let documented := (← findDocString? env n).isSome
    let axioms ←
      if kind == "theorem" then do
        let axs ← Lean.collectAxioms n
        pure (axs.toList.map Name.toString |>.mergeSort (· < ·))
      else pure []
    let (touches, carriers) := classify env ci.type
    let row : Row := { name := n.toString, kind, signature := sig,
                       documented, axioms, touches, carriers }
    byModule := byModule.insert m ((byModule.getD m #[]).push row)
  let sorted := byModule.toArray.qsort (fun a b => a.1.toString < b.1.toString)
  return sorted.map fun (m, rows) =>
    (m, rows.qsort (fun a b => a.name < b.name))

def rowJson (r : Row) : Cas.Json.Value :=
  .obj <|
    [("name", .str r.name), ("kind", .str r.kind),
     ("signature", .str r.signature),
     ("documented", .bool r.documented)] ++
    (if r.touches.isEmpty then []
     else [("touches", .arr (r.touches.map Cas.Json.Value.str))]) ++
    (if r.carriers.isEmpty then []
     else [("carriers", .arr (r.carriers.map Cas.Json.Value.str))]) ++
    (if r.kind == "theorem" then
      [("axioms", .arr (r.axioms.map Cas.Json.Value.str))]
     else [])

def document (modules : Array (Name × Array Row)) : String :=
  let kinds := ["axiom", "class", "def", "inductive", "instance",
                "opaque", "structure", "theorem"]
  let allRows := (modules.map Prod.snd).flatten
  let totals : List (String × Cas.Json.Value) :=
    kinds.filterMap fun k =>
      let c := allRows.filter (·.kind == k) |>.size
      if c == 0 then none else some (k, .nat c)
  let axiomNames := (allRows.toList.flatMap (·.axioms)).eraseDups.mergeSort (· < ·)
  let axiomCensus : List (String × Cas.Json.Value) :=
    axiomNames.map fun a =>
      (a, .nat (allRows.filter (·.axioms.contains a) |>.size))
  let unclean := axiomNames.filter fun a =>
    !cleanAxioms.any (fun c => c.toString == a)
  let documented := allRows.filter (·.documented) |>.size
  let carrierNames := (allRows.toList.flatMap (·.carriers)).eraseDups.mergeSort (· < ·)
  let carrierCensus : List (String × Cas.Json.Value) :=
    carrierNames.map fun c =>
      (c, .nat (allRows.filter (·.carriers.contains c) |>.size))
  let areaNames := (allRows.toList.flatMap (·.touches)).eraseDups.mergeSort (· < ·)
  let areaCensus : List (String × Cas.Json.Value) :=
    areaNames.map fun a =>
      (a, .nat (allRows.filter (·.touches.contains a) |>.size))
  let moduleJson (m : Name × Array Row) : Cas.Json.Value :=
    .obj [
      ("module", .str m.1.toString),
      ("declarations", .nat m.2.size),
      ("documented", .nat (m.2.filter (·.documented) |>.size)),
      ("surface", .arr (m.2.toList.map rowJson))]
  Cas.Json.render (.obj [
    ("library", .str "Cas"),
    ("declarations", .nat allRows.size),
    ("documented", .nat documented),
    ("totals", .obj totals),
    ("axiomCensus", .obj axiomCensus),
    ("beyondCleanAxioms", .arr (unclean.map Cas.Json.Value.str)),
    ("areaCensus", .obj areaCensus),
    ("carrierCensus", .obj carrierCensus),
    ("modules", .arr (modules.toList.map moduleJson))]) ++ "\n"

def buildModules : IO (Array (Name × Array Row)) := do
  initSearchPath (← findSysroot)
  let env ← importModules #[{module := `Cas}] {} (loadExts := true)
  let ctx : Core.Context := { fileName := "<surface>", fileMap := default }
  let (modules, _) ← (collect env).toIO ctx { env }
  return modules

/-- The ledger as the driver's single fixture. The environment walk
runs HERE — inside the action the driver forces only after arguments
parse — so a typo'd flag never pays for the whole import. -/
unsafe def fixtures : IO (List Gate.Fixture) := do
  enableInitializersExecution
  let modules ← buildModules
  let declarations := modules.foldl (fun n m => n + m.2.size) 0
  return [⟨outPath, document modules, s!"{declarations} declarations"⟩]

unsafe def main := Gate.main "lake exe surface" fixtures
