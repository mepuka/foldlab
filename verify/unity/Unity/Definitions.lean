/-
The translations of the unity bridge. This package proves that the
kernel model's abstract hypotheses are discharged by the fabric model's
theorems at fabric's shipped ground carriers, witnessed by the total
translation functions below — never by analogy. Neither upstream
package imports the other, and neither imports this one: the bridge
requires both, reads both, and changes nothing in either.
-/
import Kernel.Definitions
import Fabric.Definitions

namespace Unity

/-! ## Node erasure — programs to ledgers

A kernel program node carries a generator tag and raw arguments that
fabric's action ledger never sees; the erasure keeps exactly the name
and the consumption edges. The direction is kernel to fabric because
the erasure is total — an introduction would have to invent a
generator. A degenerate erasure that dropped the uses would still
transport admission and would silently empty the pin relation; the
inhabitation law below is the committed refutation of that shape. -/

/-- The ledger image of one program node: its name becomes the work
    digest, its uses become the pins. -/
def ledgerEntry (node : Kernel.ProgramNode) : Fabric.ActionDeclaration :=
  { work := node.name, pins := node.uses }

/-- The ledger image of a whole program, newest first on both sides —
    the two admission inductives share their orientation. -/
def ledgerOf (nodes : List Kernel.ProgramNode) :
    List Fabric.ActionDeclaration :=
  nodes.map ledgerEntry

/-! ## Stage erasure -/

/-- The fabric image of a kernel hole stage. The two models declare the
    same five epistemic stages; the erasure is identity on constructor
    names, and the rank-agreement law pins that it stays one — a
    renamed or reordered stage on either side breaks a rostered
    theorem, not a comment. -/
def stageOf : Kernel.HoleStage -> Fabric.HoleStage
  | .opened => .opened
  | .filled => .filled
  | .disputed => .disputed
  | .decided => .decided
  | .sealed => .sealed

/-! ## The evidence carrier

The kernel's semantic law is hypothesis-parameterized over any
associative and idempotent merge. The bridge instantiates it at the one
carrier the estate actually ships: fabric's ground cell, the finite
holder-attributed observation set under the emitter comparator. A
numeral carrier would satisfy the same two hypotheses and certify
nothing; the strict-growth law is stated in membership terms, so it
cannot even be spelled at a numeral. -/

/-- The bridge's evidence carrier: fabric's shipped ground cell. -/
abbrev GroundEvidence := Fabric.Emitter.GroundCell

/-- One kernel value contributed as one holder-attributed observation.
    The holder is a parameter, never a constant, so attribution stays
    visible to every statement downstream. -/
def contributionAt (holder : Nat) (value : Kernel.Value) : GroundEvidence :=
  Fabric.Cell.singleton (holder, value.bytes)

/-! ## Positioned facts as fencing records

The kernel reads a provision chain at the greatest position; fabric
arbitrates a fencing history at the greatest token. The record image
sends a positioned fact to the fencing record whose token is the
position — the correspondence the greatest-wins laws quantify over.
The holder field is constant because the token decides and the holder
never does: arbitration on both sides is holder-blind by
construction. -/

/-- The fencing-record image of one positioned provision fact. -/
def recordOf (fact : Nat × Nat × Nat) : Fabric.Seal Nat :=
  { token := fact.1, holder := 0, digest := fact.2.2 }

/-- The per-hole record support of a positioned fact set: the facts at
    the hole, as fencing records. -/
def recordsAt (facts : List (Nat × Nat × Nat)) (hole : Nat) :
    List (Fabric.Seal Nat) :=
  (facts.filter (fun fact => hole == fact.2.1)).map recordOf

/-! ## Planted ground vectors

The committed vectors the refutation law and the controls read. The
tie row is two facts at one token — exactly the shape journal-assigned
positions make impossible, and exactly where the two models' reads
visibly disagree. The bridge's falsifiability lives here: a
translation that flipped list orientation or tie sense would move one
of these rows and redden a rostered theorem. -/

namespace Planted

/-- Two positioned facts at one token, one hole, different values. -/
def tiedFacts : List (Nat × Nat × Nat) := [(5, 1, 10), (5, 1, 99)]

/-- A provision chain that binds one hole twice, newest first. -/
def shadowedEvents : List (Nat × Nat) := [(1, 10), (1, 20)]

/-- The elder ground node: declares, consumes nothing. -/
def nodeOne : Kernel.ProgramNode :=
  { name := 1, generator := .declare, args := [], uses := [] }

/-- The younger ground node: consumes the elder. -/
def nodeTwo : Kernel.ProgramNode :=
  { name := 2, generator := .emit, args := [], uses := [1] }

/-- The two-node ground program, newest first. -/
def groundProgram : List Kernel.ProgramNode := [nodeTwo, nodeOne]

end Planted

end Unity
