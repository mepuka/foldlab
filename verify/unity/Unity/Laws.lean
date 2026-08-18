/- Law statements only. Proofs live in `Unity/Proofs.lean`. -/
import Unity.Definitions
import Kernel.Laws

namespace Unity

namespace Laws

/-- U1, alignment: stage erasure preserves the epistemic rank. The two
    models number the same five stages the same way, as a theorem
    rather than a reading of two source files. -/
def UStageErasureRankAgrees : Prop :=
  forall stage : Kernel.HoleStage,
    (Unity.stageOf stage).rank = stage.rank

/-- U2, alignment: the derived join orders are one relation. Both
    models define at-or-below as joining-adds-nothing; at any shared
    carrier the two definitions are the same proposition. -/
def UDerivedOrdersAgree : Prop :=
  forall (alpha : Type) (sup : alpha -> alpha -> alpha)
      (left right : alpha),
    Kernel.supLe sup left right <-> Fabric.supLe sup left right

/-- U3, transport: an admitted kernel program erases to an admitted
    fabric ledger — uses-admitted becomes pins-admitted and freshness
    becomes freshness, with nothing invented in between. -/
def UAdmissionTransports : Prop :=
  forall nodes : List Kernel.ProgramNode,
    Kernel.ProgramAdmission nodes ->
      Fabric.Admission (Unity.ledgerOf nodes)

/-- U4, transport: a consumption edge between program nodes erases to
    a pin edge between their ledger images. The relation half of the
    erasure — the half a uses-dropping translation visibly breaks. -/
def UPinsTransport : Prop :=
  forall (nodes : List Kernel.ProgramNode)
      (parent child : Kernel.ProgramNode),
    Kernel.NodePins nodes parent child ->
      Fabric.PinsWithin (Unity.ledgerOf nodes)
        (Unity.ledgerEntry parent) (Unity.ledgerEntry child)

/-- U5, inheritance: the kernel's program pin law, word for word — but
    derived through the erasure from fabric's C7 well-foundedness at
    the action ledger, not re-proved. The instance-not-analogy claim
    at its sharpest point. -/
def UProgramWfFromC7 : Prop := Kernel.Laws.KProgramPinWellFounded

/-- U6, alignment: admission rank is preserved by the erasure — the
    two models' rank functions compute the same numeral through the
    translation, so the two well-foundedness embeddings are one
    embedding. -/
def URankAgrees : Prop :=
  forall (nodes : List Kernel.ProgramNode) (name : Nat),
    Fabric.admissionRank (Unity.ledgerOf nodes) name =
      Kernel.nodeRank nodes name

/-- U7, inhabitation: the transported relations are not empty. On the
    planted two-node program the pin edge holds on the kernel side and
    its image holds on the fabric side — the committed refutation of
    every degenerate translation whose transport is vacuously true of
    an empty image. -/
def UGroundPinInhabited : Prop :=
  Kernel.NodePins Unity.Planted.groundProgram
      Unity.Planted.nodeOne Unity.Planted.nodeTwo
  /\ Fabric.PinsWithin (Unity.ledgerOf Unity.Planted.groundProgram)
      (Unity.ledgerEntry Unity.Planted.nodeOne)
      (Unity.ledgerEntry Unity.Planted.nodeTwo)

/-- U8, discharge: the kernel's semantic growth law at fabric's ground
    cell. The two abstract hypotheses the kernel names are discharged
    by fabric's cell-merge algebra at the shipped carrier, and every
    kernel sentence's meaning grows a cell-carried world. -/
def UInterpInflationaryAtCell : Prop :=
  forall (holder : Nat) (act : Kernel.Act)
      (world : Kernel.World Unity.GroundEvidence),
    Kernel.World.Le Fabric.Cell.merge world
      (Kernel.interp Fabric.Cell.merge (Unity.contributionAt holder)
        act world)

/-- U9, anti-vacuity: growth is strict where it should be. Emitting a
    fresh observation puts that observation into the evidence cell and
    moves the cell — stated in membership terms, which no numeral
    carrier can spell, so the discharge cannot quietly retreat to a
    toy. -/
def UEvidenceStrictlyGrows : Prop :=
  forall (holder : Nat) (lane : Kernel.Digest Kernel.DeclKind.lane)
      (body : Kernel.Value) (world : Kernel.World Unity.GroundEvidence),
    (holder, body.bytes) ∉ world.evidence ->
      (holder, body.bytes) ∈
        (Kernel.interp Fabric.Cell.merge (Unity.contributionAt holder)
          (Kernel.Act.emit lane body) world).evidence
      /\ (Kernel.interp Fabric.Cell.merge (Unity.contributionAt holder)
          (Kernel.Act.emit lane body) world).evidence ≠ world.evidence

/-- U10, strengthening: journal-assigned positions satisfy fabric's
    well-fenced premise by construction. Fabric names uniqueness as a
    premise and discharges it by citation across the toolchain split;
    the kernel's positioned facts PROVE it — the one place the bridge
    adds a fact to the estate instead of checking one. -/
def UWellFencedByConstruction : Prop :=
  forall (events : List (Nat × Nat)) (hole : Nat),
    Fabric.SealsWellFenced
      (Unity.recordsAt (Kernel.positionedOf events) hole)

/-- U11, correspondence: fabric's greatest-token arbitration over the
    record image of a positioned chain is the kernel's newest-first
    environment read. Stated premise-free — the construction supplies
    what the premise would have assumed. -/
def UGreatestReadIsArbitratedRead : Prop :=
  forall (events : List (Nat × Nat)) (hole : Nat),
    (Fabric.greatestSeal
        (Unity.recordsAt (Kernel.positionedOf events) hole)).map
        (fun record => record.digest) =
      Kernel.firstProvision events hole

/-- U12, correspondence closed: the two greatest reads agree — fabric's
    greatest-token arbitration and the kernel's greatest-position read
    compute the same binding over one positioned fact set. -/
def UGreatestReadsAgree : Prop :=
  forall (events : List (Nat × Nat)) (hole : Nat),
    (Fabric.greatestSeal
        (Unity.recordsAt (Kernel.positionedOf events) hole)).map
        (fun record => record.digest) =
      (Kernel.greatestAt (Kernel.positionedOf events) hole).map
        (fun best => best.2)

/-- U13, refutation: at a token tie the two reads disagree — the
    kernel's fold keeps the later arrival, fabric's keeps the earlier.
    On the committed tie row the kernel reads 99 and fabric reads 10,
    so the unrestricted correspondence is FALSE and U11 is not
    decoration: drop the by-construction distinctness and a rostered
    refutation names the exact divergence. -/
def UGreatestTieDiverges : Prop :=
  (Kernel.greatestAt Unity.Planted.tiedFacts 1).map
      (fun best => best.2) = some 99
  /\ (Fabric.greatestSeal (Unity.recordsAt Unity.Planted.tiedFacts 1)).map
      (fun record => record.digest) = some 10

end Laws

end Unity
