/-
The objects of the Plait fabric algebra. This package is deliberately
independent of `verify/moves`: it follows that package's finite-set idiom but
restates every object at the fabric seam.
-/
import Std.Data.ExtTreeSet.Lemmas

namespace Fabric

universe uH uV

/-- A finite, canonical set under a declared comparator. -/
abbrev FiniteSet (alpha : Type uH) (cmp : alpha -> alpha -> Ordering) :=
  Std.ExtTreeSet alpha cmp

/-- Evidence always records both the holder and what the holder observed. -/
abbrev Observation (Holder : Type uH) (Value : Type uV) := Holder × Value

/-- A fabric cell is the finite set of holder-attributed observations. -/
abbrev Cell (Holder : Type uH) (Value : Type uV)
    (cmp : Observation Holder Value -> Observation Holder Value -> Ordering) :=
  FiniteSet (Observation Holder Value) cmp

namespace Cell

variable {Holder : Type uH} {Value : Type uV}
variable {cmp : Observation Holder Value -> Observation Holder Value -> Ordering}
variable [Std.TransCmp cmp]

/-- The cell with no verified observations. -/
def empty : Cell Holder Value cmp := ∅

/-- The one-observation delta accepted by the evidence alphabet. -/
def singleton (observation : Observation Holder Value) : Cell Holder Value cmp :=
  Std.ExtTreeSet.ofList [observation] cmp

/-- Least-upper-bound merge: finite-set union. -/
def merge (left right : Cell Holder Value cmp) : Cell Holder Value cmp :=
  left ∪ right

/-- Two replicas verified exactly the same attributed observations. -/
def SameVerifiedSet (left right : Cell Holder Value cmp) : Prop :=
  forall observation, observation ∈ left <-> observation ∈ right

end Cell

/-! ## Evidence traces -/

/-- The terminal cell reached by walking a finite evidence trace. `ofList`
    performs the repeated finite-set insertion; the resulting tree forgets
    arrival order and repeated deliveries. -/
def foldEvidence {Holder : Type uH} {Value : Type uV}
    (cmp : Observation Holder Value -> Observation Holder Value -> Ordering)
    [Std.TransCmp cmp] (trace : List (Observation Holder Value)) :
    Cell Holder Value cmp :=
  Std.ExtTreeSet.ofList trace cmp

/-- Equality of delivered observation support: multiplicity and order are
    deliberately absent. -/
def SameDeliveredSet {alpha : Type uH} [BEq alpha]
    (left right : List alpha) : Prop :=
  forall value, left.contains value = right.contains value

/-! ## Executable ground instance -/

namespace Emitter

/-- The holder/value carrier used by every emitted evidence vector. -/
abbrev GroundObservation := Nat × Nat

/-- The concrete lexicographic comparator used by the emitter. Its lawful
    instances are proved in `Fabric/Proofs.lean`. -/
abbrev observationCmp : GroundObservation -> GroundObservation -> Ordering :=
  compareLex (compareOn (·.1)) (compareOn (·.2))

/-- The concrete evidence cell exercised by the generated corpus. -/
abbrev GroundCell := Cell Nat Nat observationCmp

/-- The exact duplication row shared by the emitter and its mutant control. -/
def duplicatedEvidence : List GroundObservation :=
  [(1, 10), (1, 10), (2, 20)]

/-- The exactly-once counterpart of `duplicatedEvidence`. -/
def exactEvidence : List GroundObservation := [(1, 10), (2, 20)]

/-- The exact permutation row shared by the emitter and its mutant control. -/
def permutedEvidence : List GroundObservation :=
  [(3, 30), (1, 10), (2, 20)]

/-- The sequential counterpart of `permutedEvidence`. -/
def sequentialEvidence : List GroundObservation :=
  [(1, 10), (2, 20), (3, 30)]

end Emitter

/-! ## Ordinary folds and checkpoint resumption -/

/-- Continue a meaning fold from an already-computed state. -/
def foldFrom {State : Type uH} {Op : Type uV}
    (step : State -> Op -> State) (state : State) (trace : List Op) : State :=
  trace.foldl step state

/-- Fold a complete trace from its declared initial state. -/
def fold {State : Type uH} {Op : Type uV}
    (step : State -> Op -> State) (initial : State) (trace : List Op) : State :=
  foldFrom step initial trace

/-! ## Positioned at-least-once delivery -/

/-- An operation carrying its venue-local journal position. -/
structure Positioned (Op : Type uV) where
  position : Nat
  operation : Op
deriving Repr, DecidableEq

/-- Assign consecutive positions immediately above a checkpoint floor. -/
def positionTrace {Op : Type uV} : Nat -> List Op -> List (Positioned Op)
  | _, [] => []
  | floor, operation :: operations =>
      { position := floor + 1, operation } ::
        positionTrace (floor + 1) operations

/-- A raw delivery belongs to the checkpoint's finite trace window. -/
def InWindow {Op : Type uV} (floor ceiling : Nat) (delivery : Positioned Op) :
    Prop :=
  floor < delivery.position /\ delivery.position <= ceiling

/-- The bounded reorder buffer, addressed by journal position. -/
abbrev ReplayBuffer (Op : Type uV) := Nat -> Option Op

/-- No position has arrived. -/
def emptyReplayBuffer {Op : Type uV} : ReplayBuffer Op := fun _ => none

/-- Consume one raw arrival into the position-addressed reorder buffer.
    Redelivery replaces only the entry at the same journal position. -/
def ingestDelivery {Op : Type uV}
    (buffer : ReplayBuffer Op) (delivery : Positioned Op) : ReplayBuffer Op :=
  fun position =>
    if position = delivery.position then some delivery.operation
    else buffer position

/-- Traverse the raw delivery schedule in arrival order and fold every arrival
    into the position-addressed buffer. -/
def ingestSchedule {Op : Type uV}
    (deliveries : List (Positioned Op)) : ReplayBuffer Op :=
  deliveries.foldl ingestDelivery emptyReplayBuffer

/-- Drain exactly the consecutive successors present in the buffer. A gap
    stops application; an ahead-of-frontier entry never advances over it. -/
def applySuccessors {State : Type uH} {Op : Type uV}
    (step : State -> Op -> State) : Nat -> Nat -> State -> ReplayBuffer Op -> State
  | _, 0, state, _ => state
  | floor, count + 1, state, buffer =>
      match buffer (floor + 1) with
      | none => state
      | some operation =>
          applySuccessors step (floor + 1) count (step state operation) buffer

/-- Consume the actual redelivery schedule in list order. The buffer retains
    arrivals by position; the successor discipline provides exactly-once
    protection by advancing only at `floor + 1` within the finite window. -/
def guardedApply {State : Type uH} {Op : Type uV}
    (step : State -> Op -> State) (floor count : Nat)
    (deliveries : List (Positioned Op)) (initial : State) : State :=
  applySuccessors step floor count initial
    (ingestSchedule deliveries)

/-- Half one of the at-least-once premise: complete successor coverage.
    Every position of the checkpoint window is present among the raw
    arrivals. Nothing here constrains payloads. -/
def WindowCoverage {Op : Type uV} (floor : Nat) (operations : List Op)
    (deliveries : List (Positioned Op)) : Prop :=
  forall expected, expected ∈ positionTrace floor operations ->
    exists delivery,
      delivery ∈ deliveries /\ delivery.position = expected.position

/-- Half two of the at-least-once premise: position-payload fidelity. An
    in-window arrival carries exactly the record the contiguous positioned
    trace assigns to its journal position; redelivery at a position never
    changes that position's payload. Stale and out-of-window deliveries
    stay unconstrained. -/
def PositionPayloadIntegrity {Op : Type uV} (floor : Nat) (operations : List Op)
    (deliveries : List (Positioned Op)) : Prop :=
  forall delivery, delivery ∈ deliveries ->
    InWindow floor (floor + operations.length) delivery ->
      delivery ∈ positionTrace floor operations

namespace Emitter

/-- The exact stale-replay row used by the F2b bridge. -/
def staleReplayDeliveries : List (Positioned Nat) :=
  [ { position := 9, operation := 100 }
  , { position := 11, operation := 2 }
  , { position := 12, operation := 3 }
  ]

/-- The exact duplicate-current row used by the F2b bridge. -/
def duplicatedPositionedDeliveries : List (Positioned Nat) :=
  [ { position := 11, operation := 2 }
  , { position := 11, operation := 2 }
  , { position := 12, operation := 3 }
  ]

/-- The exact bounded-reordering row used by the F2b bridge. -/
def reorderedDeliveries : List (Positioned Nat) :=
  [ { position := 6, operation := 3 }
  , { position := 5, operation := 2 }
  ]

/-- The order-sensitive step used by the bounded-reordering vector. -/
def appendStep (state : List Nat) (operation : Nat) : List Nat :=
  state ++ [operation]

/-- The exact resume-then-redeliver suffix row: after a checkpoint at floor 2,
    the suffix schedule arrives reordered and duplicated (the kill-9 shape). -/
def resumeSuffixDeliveries : List (Positioned Nat) :=
  [ { position := 4, operation := 4 }
  , { position := 3, operation := 3 }
  , { position := 4, operation := 4 }
  ]

/-- The exact ahead-of-ceiling row: position 13 sits beyond the two-operation
    window above floor 10, so it is buffered and never applied. -/
def aheadOfCeilingDeliveries : List (Positioned Nat) :=
  [ { position := 13, operation := 7 }
  , { position := 11, operation := 2 }
  , { position := 12, operation := 3 }
  ]

/-- The exact multi-gap row: distant positions arrive first, so the reorder
    buffer transiently holds disconnected runs with more than one gap. -/
def multiGapDeliveries : List (Positioned Nat) :=
  [ { position := 13, operation := 4 }
  , { position := 11, operation := 2 }
  , { position := 14, operation := 5 }
  , { position := 12, operation := 3 }
  ]

/-- The exact redeliver-everything-twice row: the whole positioned trace,
    delivered twice, shuffled. -/
def redeliverTwiceShuffledDeliveries : List (Positioned Nat) :=
  [ { position := 12, operation := 3 }
  , { position := 11, operation := 2 }
  , { position := 13, operation := 4 }
  , { position := 11, operation := 2 }
  , { position := 13, operation := 4 }
  , { position := 12, operation := 3 }
  ]

end Emitter

/-! ## Commutative-class partition folds -/

/-- The declared commutative monoid that licenses cross-partition replay. -/
structure CommutativeAlgebra (State : Type uH) where
  empty : State
  merge : State -> State -> State
  leftIdentity : forall state, merge empty state = state
  associative : forall left middle right,
    merge (merge left middle) right = merge left (merge middle right)
  commutative : forall left right, merge left right = merge right left

/-- Fold operations by merging each operation's declared contribution. -/
def foldCommutative {State : Type uH} {Op : Type uV}
    (algebra : CommutativeAlgebra State) (contribution : Op -> State) :
    List Op -> State
  | [] => algebra.empty
  | operation :: operations =>
      algebra.merge (contribution operation)
        (foldCommutative algebra contribution operations)

/-- Merge one independently computed fold per lane partition. -/
def mergePartitionFolds {State : Type uH} {Op : Type uV}
    (algebra : CommutativeAlgebra State) (contribution : Op -> State) :
    List (List Op) -> State
  | [] => algebra.empty
  | partition :: partitions =>
      algebra.merge (foldCommutative algebra contribution partition)
        (mergePartitionFolds algebra contribution partitions)

/-- An interleaved trace contains exactly the partition operations, with only
    their global schedule changed. -/
def Interleaves {Op : Type uV}
    (partitions : List (List Op)) (interleaved : List Op) : Prop :=
  interleaved.Perm partitions.flatten

/-! ## Policies and attenuating action trees -/

/-- A policy is the componentwise capability envelope carried by an action.
    Set-valued components intersect; numeric ceilings take their minimum. -/
@[ext] structure Policy (Atom : Type uH) (cmp : Atom -> Atom -> Ordering) where
  capabilities : FiniteSet Atom cmp
  contextAllowlist : FiniteSet Atom cmp
  toolkits : FiniteSet Atom cmp
  writ : FiniteSet Atom cmp
  indexes : FiniteSet Atom cmp
  resources : FiniteSet Atom cmp
  capabilityClass : Nat
  effortClass : Nat
  budget : Nat
  spawnBound : Nat

namespace Policy

variable {Atom : Type uH} {cmp : Atom -> Atom -> Ordering}
variable [Std.TransCmp cmp]

/-- Componentwise intersection, the only constructor for an effective child
    policy. -/
def meet (left right : Policy Atom cmp) : Policy Atom cmp where
  capabilities := left.capabilities ∩ right.capabilities
  contextAllowlist := left.contextAllowlist ∩ right.contextAllowlist
  toolkits := left.toolkits ∩ right.toolkits
  writ := left.writ ∩ right.writ
  indexes := left.indexes ∩ right.indexes
  resources := left.resources ∩ right.resources
  capabilityClass := Nat.min left.capabilityClass right.capabilityClass
  effortClass := Nat.min left.effortClass right.effortClass
  budget := Nat.min left.budget right.budget
  spawnBound := Nat.min left.spawnBound right.spawnBound

/-- Capability inclusion and ceiling order. -/
structure Le (left right : Policy Atom cmp) : Prop where
  capabilities : forall atom, atom ∈ left.capabilities -> atom ∈ right.capabilities
  contextAllowlist : forall atom,
    atom ∈ left.contextAllowlist -> atom ∈ right.contextAllowlist
  toolkits : forall atom, atom ∈ left.toolkits -> atom ∈ right.toolkits
  writ : forall atom, atom ∈ left.writ -> atom ∈ right.writ
  indexes : forall atom, atom ∈ left.indexes -> atom ∈ right.indexes
  resources : forall atom, atom ∈ left.resources -> atom ∈ right.resources
  capabilityClass : left.capabilityClass <= right.capabilityClass
  effortClass : left.effortClass <= right.effortClass
  budget : left.budget <= right.budget
  spawnBound : left.spawnBound <= right.spawnBound

instance : LE (Policy Atom cmp) where
  le := Policy.Le

end Policy

/-- A node records only what it requests; its effective policy is always the
    meet with the effective policy above it. -/
inductive ActionTree (Atom : Type uH) (cmp : Atom -> Atom -> Ordering) where
  | node (requested : Policy Atom cmp) (children : List (ActionTree Atom cmp))

/-- The effective policies reachable below a root grant. The `below`
    constructor selects a child by a list decomposition, avoiding any equality
    assumption on whole trees. -/
inductive DescendantEffective {Atom : Type uH} {cmp : Atom -> Atom -> Ordering}
    [Std.TransCmp cmp] :
    Policy Atom cmp -> ActionTree Atom cmp -> Policy Atom cmp -> Prop where
  | here (root requested : Policy Atom cmp) (children : List (ActionTree Atom cmp)) :
      DescendantEffective root (.node requested children) (Policy.meet root requested)
  | throughChild (root requested : Policy Atom cmp)
      (before after : List (ActionTree Atom cmp)) (child : ActionTree Atom cmp)
      (effective : Policy Atom cmp)
      (descendant : DescendantEffective (Policy.meet root requested) child effective) :
      DescendantEffective root (.node requested (before ++ child :: after)) effective

end Fabric
