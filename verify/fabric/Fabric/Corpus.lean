/- The executable conformance corpus, computed from the fabric definitions.
Every row constructor here demands the proof its verdict reports: the
assembly in `Fabric/Emit.lean` supplies the bridge theorems, so an emitted
verdict cannot drift from the theorem named beside it. -/
import Fabric.Canonical

namespace Fabric.Corpus

open Fabric.Canonical

abbrev GroundObservation := Emitter.GroundObservation
abbrev observationCmp := Emitter.observationCmp
abbrev GroundCell := Emitter.GroundCell

structure Vector where
  name : String
  kind : String
  input : String
  verdict : String
  witness : String

/-! ## Verdict bits are emitted from proof terms

Each combinator computes the comparison its field reports and requires the
proof that fixes the comparison's outcome. The emitted byte stays the
computed value; the proof argument makes a drifted verdict a type error
instead of a wrong byte. -/

def verdictOfEq {alpha : Type} [BEq alpha] [LawfulBEq alpha]
    (left right : alpha) (_ : left = right) : Bool :=
  left == right

def verdictOfNe {alpha : Type} [BEq alpha] [LawfulBEq alpha]
    (left right : alpha) (_ : left ≠ right) : Bool :=
  left != right

def verdictOfNone {alpha : Type} (option : Option alpha)
    (_ : option = none) : Bool :=
  option.isSome

def verdictOfTrue (bit : Bool) (_ : bit = true) : Bool := bit

def verdictOfFalse (bit : Bool) (_ : bit = false) : Bool := bit

def renderObservation (observation : GroundObservation) : String :=
  array [nat observation.1, nat observation.2]

def renderCell (cell : GroundCell) : String :=
  array (cell.toList.map renderObservation)

def renderDelivery (delivery : Positioned Nat) : String :=
  object
    [ { key := "position", value := nat delivery.position }
    , { key := "operation", value := nat delivery.operation }
    ]

def renderDeliveries (deliveries : List (Positioned Nat)) : String :=
  array (deliveries.map renderDelivery)

def renderVector (vector : Vector) : String :=
  object
    [ { key := "name", value := string vector.name }
    , { key := "kind", value := string vector.kind }
    , { key := "input", value := vector.input }
    , { key := "verdict", value := vector.verdict }
    , { key := "witness", value := string vector.witness }
    ]

def cellOf (observations : List GroundObservation) : GroundCell :=
  foldEvidence observationCmp observations

/-- The two evidence histories merged by the F1 row. -/
def f1LeftEvidence : List GroundObservation := [(1, 10), (2, 20)]

def f1RightEvidence : List GroundObservation := [(2, 20), (3, 30)]

def f1Vector
    (commutes : Cell.merge (cellOf f1LeftEvidence) (cellOf f1RightEvidence) =
      Cell.merge (cellOf f1RightEvidence) (cellOf f1LeftEvidence)) : Vector :=
  let left := cellOf f1LeftEvidence
  let right := cellOf f1RightEvidence
  let merged := Cell.merge left right
  { name := "cell-merge-aci"
    kind := "F1"
    witness := "Fabric.emitter_f1_cell_merge_aci"
    input := object
      [ { key := "left", value := renderCell left }
      , { key := "right", value := renderCell right }
      ]
    verdict := object
      [ { key := "commutes", value := bool (verdictOfEq
          (renderCell (Cell.merge left right))
          (renderCell (Cell.merge right left))
          (congrArg renderCell commutes)) }
      , { key := "state", value := renderCell merged }
      ] }

def f2DuplicateVector
    (matchesExact : cellOf Emitter.duplicatedEvidence =
      cellOf Emitter.exactEvidence) : Vector :=
  let deliveries := Emitter.duplicatedEvidence
  let exact := Emitter.exactEvidence
  let state := cellOf deliveries
  { name := "duplicated-deliveries"
    kind := "F2"
    witness := "Fabric.emitter_f2_duplication"
    input := object [{ key := "deliveries", value := array (deliveries.map renderObservation) }]
    verdict := object
      [ { key := "matchesExact", value := bool (verdictOfEq
          (renderCell state) (renderCell (cellOf exact))
          (congrArg renderCell matchesExact)) }
      , { key := "state", value := renderCell state }
      ] }

def f2PermutationVector
    (matchesSequential : cellOf Emitter.permutedEvidence =
      cellOf Emitter.sequentialEvidence) : Vector :=
  let deliveries := Emitter.permutedEvidence
  let sequential := Emitter.sequentialEvidence
  let state := cellOf deliveries
  { name := "permuted-evidence-schedule"
    kind := "F2"
    witness := "Fabric.emitter_f2_permutation"
    input := object [{ key := "deliveries", value := array (deliveries.map renderObservation) }]
    verdict := object
      [ { key := "matchesSequential", value := bool (verdictOfEq
          (renderCell state) (renderCell (cellOf sequential))
          (congrArg renderCell matchesSequential)) }
      , { key := "state", value := renderCell state }
      ] }

def guardedVector (name witnessName : String) (floor : Nat)
    (deliveries : List (Positioned Nat))
    (matchesExact : guardedApply Nat.add floor 2 deliveries 0 =
      fold Nat.add 0 [2, 3]) : Vector :=
  let guarded := guardedApply Nat.add floor 2 deliveries 0
  let exact := fold Nat.add 0 [2, 3]
  { name
    kind := "F2b"
    witness := witnessName
    input := object
      [ { key := "deliveries", value := renderDeliveries deliveries }
      , { key := "floor", value := nat floor }
      ]
    verdict := object
      [ { key := "exact", value := nat exact }
      , { key := "guarded", value := nat guarded }
      , { key := "matchesExact", value := bool (verdictOfEq guarded exact matchesExact) }
      ] }

def f2bStaleVector
    (matchesExact : guardedApply Nat.add 10 2 Emitter.staleReplayDeliveries 0 =
      fold Nat.add 0 [2, 3]) : Vector :=
  guardedVector "floor-violating-stale-replay" "Fabric.emitter_f2b_stale_replay"
    10 Emitter.staleReplayDeliveries matchesExact

def f2bDuplicateVector
    (matchesExact : guardedApply Nat.add 10 2 Emitter.duplicatedPositionedDeliveries 0 =
      fold Nat.add 0 [2, 3]) : Vector :=
  guardedVector "duplicate-current-delivery" "Fabric.emitter_f2b_duplication"
    10 Emitter.duplicatedPositionedDeliveries matchesExact

def f2bAheadOfCeilingVector
    (matchesExact : guardedApply Nat.add 10 2 Emitter.aheadOfCeilingDeliveries 0 =
      fold Nat.add 0 [2, 3]) : Vector :=
  guardedVector "ahead-of-ceiling-arrival" "Fabric.emitter_ahead_of_ceiling"
    10 Emitter.aheadOfCeilingDeliveries matchesExact

def f2bReorderedVector
    (matchesExact : guardedApply Emitter.appendStep 4 2 Emitter.reorderedDeliveries [] =
      fold Emitter.appendStep [] [2, 3]) : Vector :=
  let guarded := guardedApply Emitter.appendStep 4 2 Emitter.reorderedDeliveries []
  let exact := fold Emitter.appendStep [] [2, 3]
  { name := "bounded-reordered-delivery"
    kind := "F2b"
    witness := "Fabric.emitter_f2b_reordering"
    input := object
      [ { key := "deliveries", value := renderDeliveries Emitter.reorderedDeliveries }
      , { key := "floor", value := nat 4 }
      ]
    verdict := object
      [ { key := "exact", value := array (exact.map nat) }
      , { key := "guarded", value := array (guarded.map nat) }
      , { key := "matchesExact", value := bool (verdictOfEq guarded exact matchesExact) }
      ] }

def f2bMultiGapVector
    (matchesExact : guardedApply Emitter.appendStep 10 4 Emitter.multiGapDeliveries [] =
      fold Emitter.appendStep [] [2, 3, 4, 5]) : Vector :=
  let guarded := guardedApply Emitter.appendStep 10 4 Emitter.multiGapDeliveries []
  let exact := fold Emitter.appendStep [] [2, 3, 4, 5]
  { name := "multi-gap-window"
    kind := "F2b"
    witness := "Fabric.emitter_multi_gap_window"
    input := object
      [ { key := "deliveries", value := renderDeliveries Emitter.multiGapDeliveries }
      , { key := "floor", value := nat 10 }
      ]
    verdict := object
      [ { key := "exact", value := array (exact.map nat) }
      , { key := "guarded", value := array (guarded.map nat) }
      , { key := "matchesExact", value := bool (verdictOfEq guarded exact matchesExact) }
      ] }

def f2bRedeliverTwiceVector
    (matchesExact : guardedApply Emitter.appendStep 10 3
        Emitter.redeliverTwiceShuffledDeliveries [] =
      fold Emitter.appendStep [] [2, 3, 4]) : Vector :=
  let guarded := guardedApply Emitter.appendStep 10 3
    Emitter.redeliverTwiceShuffledDeliveries []
  let exact := fold Emitter.appendStep [] [2, 3, 4]
  { name := "redeliver-everything-twice-shuffled"
    kind := "F2b"
    witness := "Fabric.emitter_redeliver_twice_shuffled"
    input := object
      [ { key := "deliveries", value :=
          renderDeliveries Emitter.redeliverTwiceShuffledDeliveries }
      , { key := "floor", value := nat 10 }
      ]
    verdict := object
      [ { key := "exact", value := array (exact.map nat) }
      , { key := "guarded", value := array (guarded.map nat) }
      , { key := "matchesExact", value := bool (verdictOfEq guarded exact matchesExact) }
      ] }

inductive AlphabetCandidate where
  | evidence (observation : GroundObservation)
  | orderedSubtract (amount : Nat)

def admitAci : AlphabetCandidate -> Option GroundObservation
  | .evidence observation => some observation
  | .orderedSubtract _ => none

/-- Arrival-order-sensitive intruder semantics: the incoming amount subtracts
    the current state, so swapping two operations changes the result. -/
def orderedSubtractStep (state amount : Nat) : Nat := amount - state

def intruderVector
    (refused : admitAci (AlphabetCandidate.orderedSubtract 7) = none)
    (nonCommuting : fold orderedSubtractStep 10 [7, 3] ≠
      fold orderedSubtractStep 10 [3, 7]) : Vector :=
  let candidate := AlphabetCandidate.orderedSubtract 7
  let leftThenRight := fold orderedSubtractStep 10 [7, 3]
  let rightThenLeft := fold orderedSubtractStep 10 [3, 7]
  { name := "non-commuting-intruder"
    kind := "alphabet-refusal"
    witness := "Fabric.emitter_intruder_refused"
    input := object
      [ { key := "initial", value := nat 10 }
      , { key := "leftThenRight", value := array [nat 7, nat 3] }
      , { key := "op", value := string "ordered-subtract" }
      , { key := "rightThenLeft", value := array [nat 3, nat 7] }
      ]
    verdict := object
      [ { key := "accepted", value := bool (verdictOfNone (admitAci candidate) refused) }
      , { key := "leftThenRight", value := nat leftThenRight }
      , { key := "nonCommuting", value := bool (verdictOfNe
          leftThenRight rightThenLeft nonCommuting) }
      , { key := "reason", value := string "not-aci" }
      , { key := "rightThenLeft", value := nat rightThenLeft }
      ] }

def f3Vector
    (matchesComplete : foldFrom Nat.add (fold Nat.add 0 [1, 2]) [3, 4] =
      fold Nat.add 0 ([1, 2] ++ [3, 4])) : Vector :=
  let resumed := foldFrom Nat.add (fold Nat.add 0 [1, 2]) [3, 4]
  let complete := fold Nat.add 0 ([1, 2] ++ [3, 4])
  { name := "checkpoint-resume"
    kind := "F3"
    witness := "Fabric.emitter_f3_resume"
    input := object
      [ { key := "prefix", value := array [nat 1, nat 2] }
      , { key := "suffix", value := array [nat 3, nat 4] }
      ]
    verdict := object
      [ { key := "complete", value := nat complete }
      , { key := "matchesComplete", value := bool (verdictOfEq resumed complete matchesComplete) }
      , { key := "resumed", value := nat resumed }
      ] }

def resumeThenRedeliverVector
    (matchesComplete : guardedApply Emitter.appendStep 2 2
        Emitter.resumeSuffixDeliveries (fold Emitter.appendStep [] [1, 2]) =
      fold Emitter.appendStep [] ([1, 2] ++ [3, 4])) : Vector :=
  let checkpoint := fold Emitter.appendStep [] [1, 2]
  let resumed := guardedApply Emitter.appendStep 2 2
    Emitter.resumeSuffixDeliveries checkpoint
  let complete := fold Emitter.appendStep [] ([1, 2] ++ [3, 4])
  { name := "resume-then-redeliver"
    kind := "F3-F2b"
    witness := "Fabric.emitter_resume_then_redeliver"
    input := object
      [ { key := "checkpointFloor", value := nat 2 }
      , { key := "prefix", value := array [nat 1, nat 2] }
      , { key := "suffixDeliveries", value :=
          renderDeliveries Emitter.resumeSuffixDeliveries }
      ]
    verdict := object
      [ { key := "complete", value := array (complete.map nat) }
      , { key := "matchesComplete", value := bool (verdictOfEq resumed complete matchesComplete) }
      , { key := "resumed", value := array (resumed.map nat) }
      ] }

def natSum : CommutativeAlgebra Nat where
  empty := 0
  merge := Nat.add
  leftIdentity := Nat.zero_add
  associative := Nat.add_assoc
  commutative := Nat.add_comm

def f4Vector
    (matchesSequential : mergePartitionFolds natSum id [[1, 3], [2, 4]] =
      foldCommutative natSum id [1, 2, 3, 4]) : Vector :=
  let partitions := [[1, 3], [2, 4]]
  let interleaved := [1, 2, 3, 4]
  let merged := mergePartitionFolds natSum id partitions
  let sequential := foldCommutative natSum id interleaved
  { name := "partition-interleaving"
    kind := "F4"
    witness := "Fabric.emitter_f4_partition"
    input := object
      [ { key := "interleaved", value := array (interleaved.map nat) }
      , { key := "partitions", value := array (partitions.map fun part => array (part.map nat)) }
      ]
    verdict := object
      [ { key := "matchesSequential", value := bool (verdictOfEq
          merged sequential matchesSequential) }
      , { key := "merged", value := nat merged }
      , { key := "sequential", value := nat sequential }
      ] }

def renderAtoms (atoms : FiniteSet Nat compare) : String :=
  array (atoms.toList.map nat)

def renderPolicy (policy : Mutants.GroundPolicy) : String :=
  object
    [ { key := "budget", value := nat policy.budget }
    , { key := "capabilities", value := renderAtoms policy.capabilities }
    , { key := "capabilityClass", value := nat policy.capabilityClass }
    , { key := "contextAllowlist", value := renderAtoms policy.contextAllowlist }
    , { key := "effortClass", value := nat policy.effortClass }
    , { key := "indexes", value := renderAtoms policy.indexes }
    , { key := "resources", value := renderAtoms policy.resources }
    , { key := "toolkits", value := renderAtoms policy.toolkits }
    , { key := "writ", value := renderAtoms policy.writ }
    , { key := "spawnBound", value := nat policy.spawnBound }
    ]

def finiteSubsetBool (left right : FiniteSet Nat compare) : Bool :=
  left.toList.all right.contains

def policyLeBool (left right : Mutants.GroundPolicy) : Bool :=
  finiteSubsetBool left.capabilities right.capabilities &&
  finiteSubsetBool left.contextAllowlist right.contextAllowlist &&
  finiteSubsetBool left.toolkits right.toolkits &&
  finiteSubsetBool left.writ right.writ &&
  finiteSubsetBool left.indexes right.indexes &&
  finiteSubsetBool left.resources right.resources &&
  decide (left.capabilityClass <= right.capabilityClass) &&
  decide (left.effortClass <= right.effortClass) &&
  decide (left.budget <= right.budget) &&
  decide (left.spawnBound <= right.spawnBound)

/-- The second-level request strictly attenuates the first effective policy. -/
def attenuatedChildRequest : Mutants.GroundPolicy where
  capabilities := Mutants.atoms [2]
  contextAllowlist := Mutants.atoms [20]
  toolkits := Mutants.atoms [30]
  writ := Mutants.atoms [50]
  indexes := Mutants.atoms [60]
  resources := Mutants.atoms [71]
  capabilityClass := 2
  effortClass := 3
  budget := 4
  spawnBound := 2

def delegationTree : ActionTree Nat compare :=
  .node Mutants.escalatingRequest
    [.node attenuatedChildRequest []]

def descendantPolicy : Mutants.GroundPolicy :=
  Policy.meet (Policy.meet Mutants.rootPolicy Mutants.escalatingRequest)
    attenuatedChildRequest

def renderActionTree : ActionTree Nat compare -> String
  | .node requested children => object
      [ { key := "children", value := array (children.map renderActionTree) }
      , { key := "requested", value := renderPolicy requested }
      ]

def f9ClampVector
    (clamped : policyLeBool
      (Policy.meet Mutants.rootPolicy Mutants.escalatingRequest)
      Mutants.rootPolicy = true)
    (escalates : policyLeBool Mutants.escalatingRequest Mutants.rootPolicy =
      false) : Vector :=
  let effective := Policy.meet Mutants.rootPolicy Mutants.escalatingRequest
  { name := "attenuation-request-clamped"
    kind := "F9"
    witness := "Fabric.emitter_f9_clamp"
    input := object
      [ { key := "parent", value := renderPolicy Mutants.rootPolicy }
      , { key := "requested", value := renderPolicy Mutants.escalatingRequest }
      ]
    verdict := object
      [ { key := "clamped", value := bool (verdictOfTrue
          (policyLeBool effective Mutants.rootPolicy) clamped) }
      , { key := "effective", value := renderPolicy effective }
      , { key := "requestWithinParent", value := bool (verdictOfFalse
          (policyLeBool Mutants.escalatingRequest Mutants.rootPolicy) escalates) }
      ] }

def f9TreeVector
    (withinRoot : policyLeBool descendantPolicy Mutants.rootPolicy = true) :
    Vector :=
  { name := "delegation-tree-attenuation"
    kind := "F9"
    witness := "Fabric.emitter_f9_tree"
    input := object
      [ { key := "root", value := renderPolicy Mutants.rootPolicy }
      , { key := "tree", value := renderActionTree delegationTree }
      ]
    verdict := object
      [ { key := "descendant", value := renderPolicy descendantPolicy }
      , { key := "root", value := renderPolicy Mutants.rootPolicy }
      , { key := "withinRoot", value := bool (verdictOfTrue
          (policyLeBool descendantPolicy Mutants.rootPolicy) withinRoot) }
      ] }

end Fabric.Corpus
