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

def verdictOfSome {alpha : Type} (option : Option alpha) (value : alpha)
    (_ : option = some value) : Bool :=
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

/-! ## F7 assembly rows -/

def renderVolatility (volatility : Volatility) : String :=
  string volatility.name

def renderSegment (segment : ContextSegment Nat) : String :=
  object
    [ { key := "class", value := renderVolatility segment.volatility }
    , { key := "source", value := nat segment.source }
    , { key := "text", value := string segment.text }
    ]

def renderSegments (segments : List (ContextSegment Nat)) : String :=
  array (segments.map renderSegment)

def renderRead (read : ContextRead Nat Nat) : String :=
  object
    [ { key := "addr", value := nat read.addr }
    , { key := "class", value := renderVolatility read.volatility }
    ]

def renderProgram (program : ContextProgram Nat Nat) : String :=
  array (program.reads.map renderRead)

def renderDeclaredValues (valuation : Nat -> Nat) : String :=
  object (Emitter.contextProgram.addresses.map fun addr =>
    { key := toString addr, value := nat (valuation addr) })

/-- The off-read-set drift of the two-valuations row: the undeclared
    timestamp address and its two values. -/
def renderOffReadSetDrift : String :=
  object
    [ { key := "addr", value := nat Emitter.timestampAddr }
    , { key := "left", value := nat (Emitter.valuationOne Emitter.timestampAddr) }
    , { key := "right", value := nat (Emitter.valuationTwo Emitter.timestampAddr) }
    ]

def f7DeclaredReadsVector
    (byteEqual : assemble Emitter.contextProgram Emitter.valuationOne =
      assemble Emitter.contextProgram Emitter.valuationTwo) : Vector :=
  let assembled := assemble Emitter.contextProgram Emitter.valuationOne
  { name := "assembly-declared-reads"
    kind := "F7"
    witness := "Fabric.emitter_f7_declared_reads"
    input := object
      [ { key := "declaredValues", value :=
          renderDeclaredValues Emitter.valuationOne }
      , { key := "offReadSet", value := renderOffReadSetDrift }
      , { key := "program", value := renderProgram Emitter.contextProgram }
      ]
    verdict := object
      [ { key := "assembled", value := renderSegments assembled }
      , { key := "byteEqual", value := bool (verdictOfEq
          (renderSegments (assemble Emitter.contextProgram
            Emitter.valuationOne))
          (renderSegments (assemble Emitter.contextProgram
            Emitter.valuationTwo))
          (congrArg renderSegments byteEqual)) }
      ] }

def renderClassOrder (classes : List Volatility) : String :=
  array (classes.map renderVolatility)

def f7SegmentOrderVector
    (stable : (assemble Emitter.contextProgram Emitter.valuationOne).map
        ContextSegment.volatility =
      stableClassOrder (Emitter.contextProgram.reads.map
        ContextRead.volatility)) : Vector :=
  let assembled := assemble Emitter.contextProgram Emitter.valuationOne
  let declaredOrder := Emitter.contextProgram.reads.map ContextRead.volatility
  { name := "assembly-volatility-order"
    kind := "F7"
    witness := "Fabric.emitter_f7_segment_order"
    input := object
      [ { key := "declaredClassOrder", value := renderClassOrder declaredOrder }
      , { key := "program", value := renderProgram Emitter.contextProgram }
      ]
    verdict := object
      [ { key := "assembled", value := renderSegments assembled }
      , { key := "assembledClassOrder", value :=
          renderClassOrder (assembled.map ContextSegment.volatility) }
      , { key := "matchesStableClassOrder", value := bool (verdictOfEq
          (renderClassOrder (assembled.map ContextSegment.volatility))
          (renderClassOrder (stableClassOrder declaredOrder))
          (congrArg renderClassOrder stable)) }
      ] }

/-! ## F11 query rows -/

def renderEntries (entries : List Nat) : String :=
  array (entries.map nat)

def f11TopKVector
    (matchesAcrossOrders : topK Emitter.groundScore id Emitter.groundWidth
        Emitter.queryArrivalOne =
      topK Emitter.groundScore id Emitter.groundWidth
        Emitter.queryArrivalTwo) : Vector :=
  let resultOne :=
    topK Emitter.groundScore id Emitter.groundWidth Emitter.queryArrivalOne
  let resultTwo :=
    topK Emitter.groundScore id Emitter.groundWidth Emitter.queryArrivalTwo
  { name := "topk-across-arrival-orders"
    kind := "F11"
    witness := "Fabric.emitter_f11_topk_support"
    input := object
      [ { key := "arrivalOne", value := renderEntries Emitter.queryArrivalOne }
      , { key := "arrivalTwo", value := renderEntries Emitter.queryArrivalTwo }
      , { key := "k", value := nat Emitter.groundWidth }
      , { key := "scoreFold", value := string "decade-bucket" }
      ]
    verdict := object
      [ { key := "matchesAcrossOrders", value := bool (verdictOfEq
          (renderEntries resultOne) (renderEntries resultTwo)
          (congrArg renderEntries matchesAcrossOrders)) }
      , { key := "result", value := renderEntries resultOne }
      ] }

def f11ReanchoredVector
    (matchesAcrossAnchors :
      renderEntries ((topKAlgebra Emitter.groundScore id).answer
        (foldFrom appendEntry (fold appendEntry [] Emitter.queryPrefixOne)
          Emitter.querySuffixOne) Emitter.groundWidth) =
      renderEntries ((topKAlgebra Emitter.groundScore id).answer
        (foldFrom appendEntry (fold appendEntry [] Emitter.queryPrefixTwo)
          Emitter.querySuffixTwo) Emitter.groundWidth)) : Vector :=
  let answerOne := (topKAlgebra Emitter.groundScore id).answer
    (foldFrom appendEntry (fold appendEntry [] Emitter.queryPrefixOne)
      Emitter.querySuffixOne) Emitter.groundWidth
  let answerTwo := (topKAlgebra Emitter.groundScore id).answer
    (foldFrom appendEntry (fold appendEntry [] Emitter.queryPrefixTwo)
      Emitter.querySuffixTwo) Emitter.groundWidth
  { name := "query-at-reanchored-state"
    kind := "F11"
    witness := "Fabric.emitter_f11_reanchored"
    input := object
      [ { key := "anchorOnePrefix", value :=
          renderEntries Emitter.queryPrefixOne }
      , { key := "anchorOneSuffix", value :=
          renderEntries Emitter.querySuffixOne }
      , { key := "anchorTwoPrefix", value :=
          renderEntries Emitter.queryPrefixTwo }
      , { key := "anchorTwoSuffix", value :=
          renderEntries Emitter.querySuffixTwo }
      , { key := "k", value := nat Emitter.groundWidth }
      ]
    verdict := object
      [ { key := "matchesAcrossAnchors", value := bool (verdictOfEq
          (renderEntries answerOne) (renderEntries answerTwo)
          matchesAcrossAnchors) }
      , { key := "renderedAnswer", value := renderEntries answerOne }
      ] }

/-- The three ambient candidate shapes the admission row refuses. -/
def renderAmbientCandidates : String :=
  array
    [ string "ambient-seed"
    , string "ambient-clock"
    , string "ambient-schedule"
    ]

/-- The admitted candidate: its seed is declaration data, inside the
    digest. -/
def renderDeclaredSeedCandidate : String :=
  object
    [ { key := "kind", value := string "declared-seed" }
    , { key := "seed", value := nat 7 }
    ]

/-! ## F12 resolution rows -/

def renderSeal (observed : Seal Nat) : String :=
  object
    [ { key := "digest", value := nat observed.digest }
    , { key := "holder", value := nat observed.holder }
    , { key := "token", value := nat observed.token }
    ]

def renderSeals (seals : List (Seal Nat)) : String :=
  array (seals.map renderSeal)

def renderBinding (binding : Binding Nat Nat) : String :=
  object
    [ { key := "digest", value := nat binding.2 }
    , { key := "name", value := nat binding.1 }
    ]

def renderBindEvents (events : List (Binding Nat Nat)) : String :=
  array (events.map renderBinding)

def renderDirectory (directory : Emitter.GroundDirectory) : String :=
  array (directory.toList.map renderBinding)

def renderResolution : Resolution Nat -> String
  | .bound digest => object
      [ { key := "digest", value := nat digest }
      , { key := "verdict", value := string "bound" }
      ]
  | .absent => object [{ key := "verdict", value := string "absent" }]
  | .ambiguous listing => object
      [ { key := "candidates", value := array (listing.map nat) }
      , { key := "verdict", value := string "ambiguous" }
      ]
  | .sealedAt token digest => object
      [ { key := "digest", value := nat digest }
      , { key := "token", value := nat token }
      , { key := "verdict", value := string "sealed-at" }
      ]

/-- The stale-rebind row's provenance for its well-fenced seal history:
    the Veil register package's exported corpus vintage. -/
def veilCorpusCitation : String :=
  "F5 I1/I2, verify/fabric-veil: packages/plait/fixtures/register-traces.ndjson (15 rows, sha256 376503be58dcaa01)"

def f12AbsentVector
    (absentRefusal : resolve id Emitter.groundDirectory Emitter.absentPetname
      ([] : List (Seal Nat)) = .absent) : Vector :=
  let resolution :=
    resolve id Emitter.groundDirectory Emitter.absentPetname []
  { name := "resolution-absent-name"
    kind := "F12"
    witness := "Fabric.emitter_f12_absent"
    input := object
      [ { key := "directory", value := renderDirectory Emitter.groundDirectory }
      , { key := "petname", value := nat Emitter.absentPetname }
      , { key := "seals", value := renderSeals [] }
      ]
    verdict := object
      [ { key := "isAbsenceRefusal", value := bool (verdictOfEq
          (renderResolution resolution) (renderResolution .absent)
          (congrArg renderResolution absentRefusal)) }
      , { key := "resolution", value := renderResolution resolution }
      ] }

def f12SingletonVector
    (singletonBound : resolve id Emitter.groundDirectory
      Emitter.singletonPetname ([] : List (Seal Nat)) = .bound 300) : Vector :=
  let resolution :=
    resolve id Emitter.groundDirectory Emitter.singletonPetname []
  { name := "resolution-singleton-binding"
    kind := "F12"
    witness := "Fabric.emitter_f12_singleton"
    input := object
      [ { key := "directory", value := renderDirectory Emitter.groundDirectory }
      , { key := "petname", value := nat Emitter.singletonPetname }
      , { key := "seals", value := renderSeals [] }
      ]
    verdict := object
      [ { key := "boundDigest", value := nat 300 }
      , { key := "isSingletonBinding", value := bool (verdictOfEq
          (renderResolution resolution) (renderResolution (.bound 300))
          (congrArg renderResolution singletonBound)) }
      , { key := "resolution", value := renderResolution resolution }
      ] }

def f12AmbiguousVector
    (acrossOrders :
      resolve id (foldBindings Emitter.bindingCmp Emitter.bindOrderOne)
          Emitter.groundPetname [] = .ambiguous [100, 200] /\
        resolve id (foldBindings Emitter.bindingCmp Emitter.bindOrderTwo)
          Emitter.groundPetname [] = .ambiguous [100, 200]) : Vector :=
  let resolutionOne :=
    resolve id (foldBindings Emitter.bindingCmp Emitter.bindOrderOne)
      Emitter.groundPetname []
  let resolutionTwo :=
    resolve id (foldBindings Emitter.bindingCmp Emitter.bindOrderTwo)
      Emitter.groundPetname []
  { name := "ambiguous-across-bind-orders"
    kind := "F12"
    witness := "Fabric.emitter_f12_ambiguous_across_orders"
    input := object
      [ { key := "bindOrderOne", value := renderBindEvents Emitter.bindOrderOne }
      , { key := "bindOrderTwo", value := renderBindEvents Emitter.bindOrderTwo }
      , { key := "petname", value := nat Emitter.groundPetname }
      ]
    verdict := object
      [ { key := "equalAcrossOrders", value := bool (verdictOfEq
          (renderResolution resolutionOne) (renderResolution resolutionTwo)
          (congrArg renderResolution
            (acrossOrders.1.trans acrossOrders.2.symm))) }
      , { key := "refusal", value := string "ambiguous-binding" }
      , { key := "resolution", value := renderResolution resolutionOne }
      ] }

def f12GreatestSealVector
    (acrossOrders :
      resolve id Emitter.groundDirectory Emitter.groundPetname
          Emitter.sealOrderOne = .sealedAt 9 200 /\
        resolve id Emitter.groundDirectory Emitter.groundPetname
          Emitter.sealOrderTwo = .sealedAt 9 200) : Vector :=
  let resolutionOne :=
    resolve id Emitter.groundDirectory Emitter.groundPetname
      Emitter.sealOrderOne
  let resolutionTwo :=
    resolve id Emitter.groundDirectory Emitter.groundPetname
      Emitter.sealOrderTwo
  { name := "greatest-seal-across-orders"
    kind := "F12"
    witness := "Fabric.emitter_f12_greatest_seal"
    input := object
      [ { key := "directory", value := renderDirectory Emitter.groundDirectory }
      , { key := "petname", value := nat Emitter.groundPetname }
      , { key := "sealOrderOne", value := renderSeals Emitter.sealOrderOne }
      , { key := "sealOrderTwo", value := renderSeals Emitter.sealOrderTwo }
      ]
    verdict := object
      [ { key := "equalAcrossOrders", value := bool (verdictOfEq
          (renderResolution resolutionOne) (renderResolution resolutionTwo)
          (congrArg renderResolution
            (acrossOrders.1.trans acrossOrders.2.symm))) }
      , { key := "resolution", value := renderResolution resolutionOne }
      ] }

def f12StaleRebindVector
    (staleInert :
      resolve id Emitter.groundDirectory Emitter.groundPetname
          (Emitter.staleSeal :: Emitter.landedSeals) =
        resolve id Emitter.groundDirectory Emitter.groundPetname
          Emitter.landedSeals /\
      resolve id Emitter.groundDirectory Emitter.groundPetname
          Emitter.landedSeals = .sealedAt 9 200) : Vector :=
  let withStale :=
    resolve id Emitter.groundDirectory Emitter.groundPetname
      (Emitter.staleSeal :: Emitter.landedSeals)
  let withoutStale :=
    resolve id Emitter.groundDirectory Emitter.groundPetname
      Emitter.landedSeals
  { name := "stale-token-rebind-inert"
    kind := "F12"
    witness := "Fabric.emitter_f12_stale_rebind"
    input := object
      [ { key := "directory", value := renderDirectory Emitter.groundDirectory }
      , { key := "landedSeals", value := renderSeals Emitter.landedSeals }
      , { key := "petname", value := nat Emitter.groundPetname }
      , { key := "staleAttempt", value := renderSeal Emitter.staleSeal }
      , { key := "wellFencedBy", value := string veilCorpusCitation }
      ]
    verdict := object
      [ { key := "resolution", value := renderResolution withoutStale }
      , { key := "staleObservationInert", value := bool (verdictOfEq
          (renderResolution withStale) (renderResolution withoutStale)
          (congrArg renderResolution staleInert.1)) }
      ] }

def querySeedAdmissionVector
    (ambientSeedRefused : admitQueryInput .ambientSeed = none)
    (ambientClockRefused : admitQueryInput .ambientClock = none)
    (ambientScheduleRefused : admitQueryInput .ambientSchedule = none)
    (declaredAdmitted : admitQueryInput (.declaredSeed 7) =
      some (.declaredSeed 7)) : Vector :=
  { name := "undeclared-seed-refused"
    kind := "query-admission"
    witness := "Fabric.emitter_query_seed_admission"
    input := object
      [ { key := "ambientCandidates", value := renderAmbientCandidates }
      , { key := "declaredCandidate", value := renderDeclaredSeedCandidate }
      ]
    verdict := object
      [ { key := "ambientClockAccepted", value := bool (verdictOfNone
          (admitQueryInput .ambientClock) ambientClockRefused) }
      , { key := "ambientScheduleAccepted", value := bool (verdictOfNone
          (admitQueryInput .ambientSchedule) ambientScheduleRefused) }
      , { key := "ambientSeedAccepted", value := bool (verdictOfNone
          (admitQueryInput .ambientSeed) ambientSeedRefused) }
      , { key := "declaredSeedAccepted", value := bool (verdictOfSome
          (admitQueryInput (.declaredSeed 7)) (.declaredSeed 7)
          declaredAdmitted) }
      , { key := "reason", value := string "F11-undeclared-ambient-input" }
      , { key := "seedInsideDeclaration", value := nat 7 }
      ] }

end Fabric.Corpus
