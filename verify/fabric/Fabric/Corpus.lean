/- The executable conformance corpus, computed from the fabric definitions. -/
import Fabric.Canonical

namespace Fabric.Corpus

open Fabric.Canonical

abbrev GroundObservation := Nat × Nat
abbrev observationCmp : GroundObservation -> GroundObservation -> Ordering :=
  compareLex (compareOn (·.1)) (compareOn (·.2))
abbrev GroundCell := Cell Nat Nat observationCmp

structure Vector where
  name : String
  kind : String
  input : String
  verdict : String

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
    ]

def cellOf (observations : List GroundObservation) : GroundCell :=
  foldEvidence observationCmp observations

def f1Vector : Vector :=
  let left := cellOf [(1, 10), (2, 20)]
  let right := cellOf [(2, 20), (3, 30)]
  let merged := Cell.merge left right
  { name := "cell-merge-aci"
    kind := "F1"
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
  let deliveries : List GroundObservation := [(1, 10), (1, 10), (2, 20)]
  let exact : List GroundObservation := [(1, 10), (2, 20)]
  let state := cellOf deliveries
  { name := "duplicated-deliveries"
    kind := "F2"
    input := object [{ key := "deliveries", value := array (deliveries.map renderObservation) }]
    verdict := object
      [ { key := "matchesExact", value := bool (renderCell state == renderCell (cellOf exact)) }
      , { key := "state", value := renderCell state }
      ] }

def f2PermutationVector : Vector :=
  let deliveries : List GroundObservation := [(3, 30), (1, 10), (2, 20)]
  let sequential : List GroundObservation := [(1, 10), (2, 20), (3, 30)]
  let state := cellOf deliveries
  { name := "permuted-evidence-schedule"
    kind := "F2"
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
  [ { position := 9, operation := 100 }
  , { position := 11, operation := 2 }
  , { position := 12, operation := 3 }
  ]

def f2bDuplicateVector : Vector := guardedVector "duplicate-current-delivery"
  [ { position := 11, operation := 2 }
  , { position := 11, operation := 2 }
  , { position := 12, operation := 3 }
  ]

def f2bReorderedVector : Vector := guardedVector "bounded-reordered-delivery"
  [ { position := 12, operation := 3 }
  , { position := 11, operation := 2 }
  ]

inductive AlphabetCandidate where
  | evidence (observation : GroundObservation)
  | orderedSubtract (amount : Nat)

def admitAci : AlphabetCandidate -> Option GroundObservation
  | .evidence observation => some observation
  | .orderedSubtract _ => none

def intruderVector : Vector :=
  let candidate := AlphabetCandidate.orderedSubtract 7
  { name := "non-commuting-intruder"
    kind := "alphabet-refusal"
    input := object
      [ { key := "amount", value := nat 7 }
      , { key := "op", value := string "ordered-subtract" }
      ]
    verdict := object
      [ { key := "accepted", value := bool (admitAci candidate).isSome }
      , { key := "reason", value := string "not-aci" }
      ] }

def f3Vector : Vector :=
  let resumed := foldFrom Nat.add (fold Nat.add 0 [1, 2]) [3, 4]
  let complete := fold Nat.add 0 ([1, 2] ++ [3, 4])
  { name := "checkpoint-resume"
    kind := "F3"
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
    input := object
      [ { key := "interleaved", value := array (interleaved.map nat) }
      , { key := "partitions", value := array (partitions.map fun part => array (part.map nat)) }
      ]
    verdict := object
      [ { key := "matchesSequential", value := bool (merged == sequential) }
      , { key := "merged", value := nat merged }
      , { key := "sequential", value := nat sequential }
      ] }

def renderPolicyCeilings (policy : Mutants.GroundPolicy) : String :=
  object
    [ { key := "budget", value := nat policy.budget }
    , { key := "capabilityClass", value := nat policy.capabilityClass }
    , { key := "effortClass", value := nat policy.effortClass }
    , { key := "spawnBound", value := nat policy.spawnBound }
    ]

def f9ClampVector : Vector :=
  let effective := Policy.meet Mutants.rootPolicy Mutants.escalatingRequest
  { name := "attenuation-request-clamped"
    kind := "F9"
    input := object
      [ { key := "parent", value := renderPolicyCeilings Mutants.rootPolicy }
      , { key := "requested", value := renderPolicyCeilings Mutants.escalatingRequest }
      ]
    verdict := object
      [ { key := "clamped", value := bool (effective.budget == Mutants.rootPolicy.budget) }
      , { key := "effective", value := renderPolicyCeilings effective }
      ] }

def f9TreeVector : Vector :=
  let child := Policy.meet Mutants.rootPolicy Mutants.escalatingRequest
  let descendant := Policy.meet child Mutants.escalatingRequest
  { name := "delegation-tree-attenuation"
    kind := "F9"
    input := object [{ key := "depth", value := nat 2 }]
    verdict := object
      [ { key := "descendant", value := renderPolicyCeilings descendant }
      , { key := "root", value := renderPolicyCeilings Mutants.rootPolicy }
      , { key := "withinRoot", value := bool (descendant.budget <= Mutants.rootPolicy.budget) }
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
    [ { key := "command", value := string "lake exe emitter" }
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
