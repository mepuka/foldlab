/- The executable conformance corpus, computed from the fabric definitions. -/
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

def f1Vector : Vector :=
  let left := cellOf [(1, 10), (2, 20)]
  let right := cellOf [(2, 20), (3, 30)]
  let merged := Cell.merge left right
  { name := "cell-merge-aci"
    kind := "F1"
    witness := "Fabric.emitter_f1_cell_merge_aci"
    input := object
      [ { key := "left", value := renderCell left }
      , { key := "right", value := renderCell right }
      ]
    verdict := object
      [ { key := "commutes", value := bool (renderCell (Cell.merge left right) ==
          renderCell (Cell.merge right left)) }
      , { key := "state", value := renderCell merged }
      ] }

def f2DuplicateVector : Vector :=
  let deliveries := Emitter.duplicatedEvidence
  let exact := Emitter.exactEvidence
  let state := cellOf deliveries
  { name := "duplicated-deliveries"
    kind := "F2"
    witness := "Fabric.emitter_f2_duplication"
    input := object [{ key := "deliveries", value := array (deliveries.map renderObservation) }]
    verdict := object
      [ { key := "matchesExact", value := bool (renderCell state == renderCell (cellOf exact)) }
      , { key := "state", value := renderCell state }
      ] }

def f2PermutationVector : Vector :=
  let deliveries := Emitter.permutedEvidence
  let sequential := Emitter.sequentialEvidence
  let state := cellOf deliveries
  { name := "permuted-evidence-schedule"
    kind := "F2"
    witness := "Fabric.emitter_f2_permutation"
    input := object [{ key := "deliveries", value := array (deliveries.map renderObservation) }]
    verdict := object
      [ { key := "matchesSequential", value :=
          bool (renderCell state == renderCell (cellOf sequential)) }
      , { key := "state", value := renderCell state }
      ] }

def guardedVector (name : String) (deliveries : List (Positioned Nat)) : Vector :=
  let guarded := guardedApply Nat.add 10 2 deliveries 0
  let exact := fold Nat.add 0 [2, 3]
  { name
    kind := "F2b"
    witness := if name == "floor-violating-stale-replay" then
        "Fabric.emitter_f2b_stale_replay"
      else if name == "duplicate-current-delivery" then
        "Fabric.emitter_f2b_duplication"
      else "Fabric.emitter_f2b_reordering"
    input := object
      [ { key := "deliveries", value := renderDeliveries deliveries }
      , { key := "floor", value := nat 10 }
      ]
    verdict := object
      [ { key := "exact", value := nat exact }
      , { key := "guarded", value := nat guarded }
      , { key := "matchesExact", value := bool (guarded == exact) }
      ] }

def f2bStaleVector : Vector := guardedVector "floor-violating-stale-replay"
  Emitter.staleReplayDeliveries

def f2bDuplicateVector : Vector := guardedVector "duplicate-current-delivery"
  Emitter.duplicatedPositionedDeliveries

def f2bReorderedVector : Vector := guardedVector "bounded-reordered-delivery"
  Emitter.reorderedDeliveries

inductive AlphabetCandidate where
  | evidence (observation : GroundObservation)
  | orderedSubtract (amount : Nat)

def admitAci : AlphabetCandidate -> Option GroundObservation
  | .evidence observation => some observation
  | .orderedSubtract _ => none

/-- Arrival-order-sensitive intruder semantics: the incoming amount subtracts
    the current state, so swapping two operations changes the result. -/
def orderedSubtractStep (state amount : Nat) : Nat := amount - state

def intruderVector : Vector :=
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
      [ { key := "accepted", value := bool (admitAci candidate).isSome }
      , { key := "leftThenRight", value := nat leftThenRight }
      , { key := "nonCommuting", value := bool (leftThenRight != rightThenLeft) }
      , { key := "reason", value := string "not-aci" }
      , { key := "rightThenLeft", value := nat rightThenLeft }
      ] }

def f3Vector : Vector :=
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
      , { key := "matchesComplete", value := bool (resumed == complete) }
      , { key := "resumed", value := nat resumed }
      ] }

def natSum : CommutativeAlgebra Nat where
  empty := 0
  merge := Nat.add
  leftIdentity := Nat.zero_add
  associative := Nat.add_assoc
  commutative := Nat.add_comm

def f4Vector : Vector :=
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
      [ { key := "matchesSequential", value := bool (merged == sequential) }
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
  decide (left.capabilityClass <= right.capabilityClass) &&
  decide (left.effortClass <= right.effortClass) &&
  decide (left.budget <= right.budget) &&
  decide (left.spawnBound <= right.spawnBound)

def delegationTree : ActionTree Nat compare :=
  .node Mutants.escalatingRequest
    [.node Mutants.escalatingRequest []]

def descendantPolicy : Mutants.GroundPolicy :=
  Policy.meet (Policy.meet Mutants.rootPolicy Mutants.escalatingRequest)
    Mutants.escalatingRequest

def renderActionTree : ActionTree Nat compare -> String
  | .node requested children => object
      [ { key := "children", value := array (children.map renderActionTree) }
      , { key := "requested", value := renderPolicy requested }
      ]

def f9ClampVector : Vector :=
  let effective := Policy.meet Mutants.rootPolicy Mutants.escalatingRequest
  { name := "attenuation-request-clamped"
    kind := "F9"
    witness := "Fabric.emitter_f9_clamp"
    input := object
      [ { key := "parent", value := renderPolicy Mutants.rootPolicy }
      , { key := "requested", value := renderPolicy Mutants.escalatingRequest }
      ]
    verdict := object
      [ { key := "clamped", value := bool (policyLeBool effective Mutants.rootPolicy) }
      , { key := "effective", value := renderPolicy effective }
      , { key := "requestWithinParent", value :=
          bool (policyLeBool Mutants.escalatingRequest Mutants.rootPolicy) }
      ] }

def f9TreeVector : Vector :=
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
      , { key := "withinRoot", value :=
          bool (policyLeBool descendantPolicy Mutants.rootPolicy) }
      ] }

def vectors : List Vector :=
  [ f1Vector
  , f2DuplicateVector
  , f2PermutationVector
  , f2bStaleVector
  , f2bDuplicateVector
  , f2bReorderedVector
  , f3Vector
  , f4Vector
  , intruderVector
  , f9ClampVector
  , f9TreeVector
  ]

def header : String :=
  object
    [ { key := "command", value := string "cd verify/fabric && lake exe emitter > ../../packages/plait/fixtures/fabric-conformance.ndjson" }
    , { key := "counts", value := (object
        [ { key := "F1", value := nat 1 }
        , { key := "F2", value := nat 2 }
        , { key := "F2b", value := nat 3 }
        , { key := "F3", value := nat 1 }
        , { key := "F4", value := nat 1 }
        , { key := "F9", value := nat 2 }
        , { key := "alphabet-refusal", value := nat 1 }
        ]) }
    , { key := "format", value := nat 1 }
    , { key := "generator", value := string "verify/fabric emitter" }
    , { key := "vectors", value := nat vectors.length }
    ]

end Fabric.Corpus
