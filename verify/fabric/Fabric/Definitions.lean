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
deriving Repr, BEq, DecidableEq

/-- Find the operation delivered at a position. Duplicate deliveries of the
    same positioned operation are observationally irrelevant. -/
def lookupPosition {Op : Type uV} (position : Nat) :
    List (Positioned Op) -> Option Op
  | [] => none
  | delivery :: deliveries =>
      if delivery.position == position then some delivery.operation
      else lookupPosition position deliveries

/-- Consume at most `count` consecutive positions above `floor`. Old replays
    at or below the floor and deliveries beyond the bounded window are ignored. -/
def guardedApply {State : Type uH} {Op : Type uV}
    (step : State -> Op -> State) :
    Nat -> Nat -> List (Positioned Op) -> State -> State
  | _, 0, _, state => state
  | floor, count + 1, deliveries, state =>
      match lookupPosition (floor + 1) deliveries with
      | none => guardedApply step (floor + 1) count deliveries state
      | some operation =>
          guardedApply step (floor + 1) count deliveries (step state operation)

/-- A finite at-least-once schedule covers each consecutive expected
    operation at its position. The list may contain duplicates, may be in any
    order, and may include replays at or below the floor. -/
def AtLeastOnceSchedule {Op : Type uV} :
    Nat -> List Op -> List (Positioned Op) -> Prop
  | _, [], _ => True
  | floor, operation :: operations, deliveries =>
      lookupPosition (floor + 1) deliveries = some operation /\
        AtLeastOnceSchedule (floor + 1) operations deliveries

/-- Assign consecutive positions immediately above a checkpoint floor. -/
def positionTrace {Op : Type uV} : Nat -> List Op -> List (Positioned Op)
  | _, [] => []
  | floor, operation :: operations =>
      { position := floor + 1, operation } ::
        positionTrace (floor + 1) operations

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
