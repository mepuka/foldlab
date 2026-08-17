/- Law statements only. Proofs live in `Fabric/Proofs.lean`. -/
import Fabric.Definitions

namespace Fabric

universe uH uV

namespace Laws

variable {Holder : Type uH} {Value : Type uV}
variable {cmp : Observation Holder Value -> Observation Holder Value -> Ordering}
variable [Std.TransCmp cmp]

/-- F1, algebra half: cell merge is associative, commutative, and idempotent. -/
def F1CellMergeACI : Prop :=
  (forall left right : Cell Holder Value cmp,
    Cell.merge left right = Cell.merge right left) /\
  (forall left middle right : Cell Holder Value cmp,
    Cell.merge (Cell.merge left middle) right =
      Cell.merge left (Cell.merge middle right)) /\
  (forall cell : Cell Holder Value cmp, Cell.merge cell cell = cell)

/-- F1, convergence half: the verified observation set determines the cell. -/
def F1SameVerifiedSetConverges : Prop :=
  forall left right : Cell Holder Value cmp,
    Cell.SameVerifiedSet left right -> left = right

/-- F2: schedule order and delivery multiplicity cannot move the terminal
    evidence cell. -/
def F2TraceInvariant [BEq (Observation Holder Value)] : Prop :=
  forall left right : List (Observation Holder Value),
    SameDeliveredSet left right ->
      foldEvidence cmp left = foldEvidence cmp right

/-- F3: a checkpoint anchors resumption exactly at the prefix boundary. -/
def F3ResumeExact {State : Type uH} {Op : Type uV}
    (step : State -> Op -> State) (initial : State) : Prop :=
  forall (xs ys : List Op),
    foldFrom step (fold step initial xs) ys =
      fold step initial (xs ++ ys)

/-- F2b's runtime premise. Deliveries are consumed in their listed order into
    a bounded buffer, and effective application is serial within a partition:
    only the contiguous successor at `floor + 1` may advance the frontier. -/
def F2bSerialSuccessorPremise {Op : Type uV} (floor : Nat)
    (operations : List Op) (deliveries : List (Positioned Op)) : Prop :=
  SerialSuccessorSchedule floor operations deliveries

/-- F2b: for an arbitrary step function, a finite redelivery schedule has
    exactly the sequential meaning of its positioned trace under the explicit
    serial/successor premise. The shipped raw-arrival buffer fold appears in
    the statement: schedule robustness is proved, not supplied as an equation
    about the buffer's output. -/
def F2bGuardedExactlyOnce {State : Type uH} {Op : Type uV}
    (step : State -> Op -> State) : Prop :=
  forall (floor : Nat) (operations : List Op)
      (deliveries : List (Positioned Op)) (initial : State),
    F2bSerialSuccessorPremise floor operations deliveries ->
      applySuccessors step floor operations.length initial
          (ingestSchedule deliveries) =
        fold step initial operations

/-- F4: only a declared commutative algebra may identify a merged set of
    partition folds with a sequential interleaving. -/
def F4PartitionFold {State : Type uH} {Op : Type uV}
    (algebra : CommutativeAlgebra State) (contribution : Op -> State) : Prop :=
  forall (partitions : List (List Op)) (interleaved : List Op),
    Interleaves partitions interleaved ->
      mergePartitionFolds algebra contribution partitions =
        foldCommutative algebra contribution interleaved

/-- F9, algebra half: policies form a meet-semilattice, including the greatest
    lower-bound clauses rather than only ACI equations. -/
def F9PolicyMeetSemilattice {Atom : Type uH} {cmp : Atom -> Atom -> Ordering}
    [Std.TransCmp cmp] : Prop :=
  (forall left right : Policy Atom cmp,
    Policy.meet left right = Policy.meet right left) /\
  (forall left middle right : Policy Atom cmp,
    Policy.meet (Policy.meet left middle) right =
      Policy.meet left (Policy.meet middle right)) /\
  (forall policy : Policy Atom cmp, Policy.meet policy policy = policy) /\
  (forall left right : Policy Atom cmp,
    Policy.meet left right <= left /\ Policy.meet left right <= right) /\
  (forall lower left right : Policy Atom cmp,
    lower <= left -> lower <= right -> lower <= Policy.meet left right)

/-- F9, tree half: every effective descendant stays under the root grant. -/
def F9TreeAttenuation {Atom : Type uH} {cmp : Atom -> Atom -> Ordering}
    [Std.TransCmp cmp] : Prop :=
  forall (root descendant : Policy Atom cmp) (tree : ActionTree Atom cmp),
    DescendantEffective root tree descendant -> descendant <= root

end Laws

end Fabric
