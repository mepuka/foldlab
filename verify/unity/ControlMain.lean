/- The unity bridge controls. Each control refutes a named wrong
   bridge: a translation that flips the tie sense, a positioner that
   numbers oldest-first, an erasure that drops the consumption edges.
   A bridge that cannot fail proves nothing; these are the committed
   demonstrations that this one can. -/
import Unity

open Unity

/-- Render an optional numeral binding. -/
def renderRead : Option Nat -> String
  | some value => toString value
  | none => "_"

/-- The kernel's greatest-position read of the committed tie row. -/
def kernelTieRead : Option Nat :=
  (Kernel.greatestAt Planted.tiedFacts 1).map (fun best => best.2)

/-- Fabric's greatest-token arbitration of the same tie row. -/
def fabricTieRead : Option Nat :=
  (Fabric.greatestSeal (recordsAt Planted.tiedFacts 1)).map
    (fun record => record.digest)

/-- The mutant positioner: the lawful positioner applied to the
    reversed chain, so the oldest event carries the greatest
    position — the orientation flip a wrong translation would
    smuggle. -/
def ascendingOf (events : List (Nat × Nat)) : List (Nat × Nat × Nat) :=
  Kernel.positionedOf events.reverse

/-- The lawful greatest-position read of the shadowed chain. -/
def lawfulShadowRead : Option Nat :=
  (Kernel.greatestAt (Kernel.positionedOf Planted.shadowedEvents) 1).map
    (fun best => best.2)

/-- The mutant read of the same chain under the flipped positioner. -/
def mutantShadowRead : Option Nat :=
  (Kernel.greatestAt (ascendingOf Planted.shadowedEvents) 1).map
    (fun best => best.2)

/-- The mutant erasure: keeps the name, drops the consumption edges. -/
def prunedEntry (node : Kernel.ProgramNode) : Fabric.ActionDeclaration :=
  { work := node.name, pins := [] }

/-- The executable mirror of the fabric pin edge: the child is in the
    ledger, the parent is in the ledger, and the parent's work digest
    is among the child's pins. -/
def pinEdgeHolds (ledger : List Fabric.ActionDeclaration)
    (parent child : Fabric.ActionDeclaration) : Bool :=
  ledger.contains child && ledger.contains parent &&
    child.pins.contains parent.work

/-- The transported pin edge under the lawful erasure. -/
def lawfulPinHolds : Bool :=
  pinEdgeHolds (ledgerOf Planted.groundProgram)
    (ledgerEntry Planted.nodeOne) (ledgerEntry Planted.nodeTwo)

/-- The transported pin edge under the pruned erasure. -/
def mutantPinHolds : Bool :=
  pinEdgeHolds (Planted.groundProgram.map prunedEntry)
    (prunedEntry Planted.nodeOne) (prunedEntry Planted.nodeTwo)

/-- Tie control: refuted when the two models' reads of the tie row are
    exactly the opposite picks — the kernel keeps the later arrival,
    fabric the earlier. A bridge whose translation made these agree
    would be lying about orientation, and this line would say
    survived. -/
def showTieControl : IO UInt32 := do
  let kernelRead := renderRead kernelTieRead
  let fabricRead := renderRead fabricTieRead
  let refuted := kernelRead == "99" && fabricRead == "10"
  IO.println
    s!"control=tie-orientation;vector=two-facts-one-token;kernel-read={kernelRead};fabric-read={fabricRead};verdict={if refuted then "refuted" else "survived"}"
  return if refuted then 0 else 1

/-- Orientation control: refuted when the lawful positioner reads the
    newest binding while the flipped positioner visibly reads the
    stale one. -/
def showAscendingControl : IO UInt32 := do
  let lawful := renderRead lawfulShadowRead
  let mutant := renderRead mutantShadowRead
  let refuted := lawful == "10" && mutant == "20"
  IO.println
    s!"control=ascending-positions;vector=one-hole-bound-twice;lawful-read={lawful};mutant-read={mutant};verdict={if refuted then "refuted" else "survived"}"
  return if refuted then 0 else 1

/-- Erasure control: refuted when the lawful erasure carries the
    ground pin edge and the pruned erasure visibly loses it — the
    relation half of transport falsified by the degenerate map. -/
def showErasureControl : IO UInt32 := do
  let refuted := lawfulPinHolds && !mutantPinHolds
  IO.println
    s!"control=broken-erasure-pins;vector=two-node-ground-program;lawful-pin={lawfulPinHolds};mutant-pin={mutantPinHolds};verdict={if refuted then "refuted" else "survived"}"
  return if refuted then 0 else 1

def main (args : List String) : IO UInt32 := do
  match args with
  | ["tie-orientation"] => showTieControl
  | ["ascending-positions"] => showAscendingControl
  | ["broken-erasure-pins"] => showErasureControl
  | _ =>
      (← IO.getStderr).putStrLn
        "usage: control (tie-orientation|ascending-positions|broken-erasure-pins)"
      return 2
