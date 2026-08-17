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

/-- F1, extensionality half: the verified observation set determines the
    cell. Two replicas whose members coincide are one replica — a statement
    about states, not about delivery histories. -/
def F1CellExtensional : Prop :=
  forall left right : Cell Holder Value cmp,
    Cell.SameVerifiedSet left right -> left = right

/-- F1, convergence half: two nodes that fold the same evidence multiset
    under different delivery orders reach the same cell — the history-level
    statement, derived from F2. -/
def F1HistoryConvergence : Prop :=
  forall left right : List (Observation Holder Value),
    left.Perm right -> foldEvidence cmp left = foldEvidence cmp right

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

/-- F2b's runtime premise, in its two named halves: `WindowCoverage` (every
    window position eventually arrives) and `PositionPayloadIntegrity` (an
    in-window arrival carries exactly its positioned payload). Multiplicity
    and arrival order stay free; stale and out-of-window deliveries may be
    present; only the contiguous successor at `floor + 1` may advance the
    frontier. -/
def F2bSerialSuccessorPremise {Op : Type uV} (floor : Nat)
    (operations : List Op) (deliveries : List (Positioned Op)) : Prop :=
  WindowCoverage floor operations deliveries /\
    PositionPayloadIntegrity floor operations deliveries

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

/-- F7, congruence half: assembly reads only the addresses the program
    declares. Two input valuations that agree there assemble one value —
    the frame statement a valuation drifting off the read set falsifies. -/
def F7AssemblyReadsOnlyDeclared {Addr : Type uH} {Value : Type uV} : Prop :=
  forall (program : ContextProgram Addr Value) (left right : Addr -> Value),
    (forall addr, addr ∈ program.addresses -> left addr = right addr) ->
      assemble program left = assemble program right

/-- F7, stability half: segment order is the stable class sort of the
    program's own declared order — a function of the program, never of
    evaluation schedule. This half pins the class projection only; the
    within-class half below pins equal-class order. -/
def F7SegmentOrderStable {Addr : Type uH} {Value : Type uV} : Prop :=
  forall (program : ContextProgram Addr Value) (valuation : Addr -> Value),
    (assemble program valuation).map ContextSegment.volatility =
      stableClassOrder (program.reads.map ContextRead.volatility)

/-- F7, within-class half: inside each volatility class, assembly keeps
    the program's declared relative order — the per-class subsequence of
    the assembled value is exactly the per-class subsequence of the
    program-order rendering. Without it, a rival that reorders equal-class
    segments satisfies both other halves and still moves bytes; with it,
    the class projection and the per-class subsequences determine the
    assembled list completely, so two lawful implementations cannot
    disagree on equal-class order. -/
def F7WithinClassOrder {Addr : Type uH} {Value : Type uV} : Prop :=
  forall (program : ContextProgram Addr Value) (valuation : Addr -> Value)
      (volatility : Volatility),
    (assemble program valuation).filter
        (fun segment => segment.volatility == volatility) =
      (renderReads program valuation).filter
        (fun segment => segment.volatility == volatility)

/-- F11, list half: under the named distinctness premise, top-k is a
    function of the delivered support — permutation and duplication of the
    anchored entry list cannot move it. Stated over raw lists, where an
    insertion-order mutant is refutable; over the extensional set carrier
    the statement would be discharged by the carrier and falsify nothing. -/
def F11TopKOfSupport {Entry : Type uV} [BEq Entry] [LawfulBEq Entry]
    (score identity : Entry -> Nat) : Prop :=
  forall (k : Nat) (left right : List Entry),
    IdentityDistinct identity left -> SameDeliveredSet left right ->
      topK score identity k left = topK score identity k right

/-- F11, composed: the rendered answer at an anchored, resumed support is
    a function of (support, query) — invariant under re-anchoring by F3
    and under permutation/duplication of the delivered support. -/
def F11QueryDeterministic {Entry : Type uV} [BEq Entry] [LawfulBEq Entry]
    (score identity : Entry -> Nat) (render : List Entry -> String) : Prop :=
  forall (k : Nat)
      (prefixLeft suffixLeft prefixRight suffixRight : List Entry),
    IdentityDistinct identity (prefixLeft ++ suffixLeft) ->
    SameDeliveredSet (prefixLeft ++ suffixLeft)
      (prefixRight ++ suffixRight) ->
      render ((topKAlgebra score identity).answer
          (foldFrom appendEntry (fold appendEntry [] prefixLeft)
            suffixLeft) k) =
        render ((topKAlgebra score identity).answer
          (foldFrom appendEntry (fold appendEntry [] prefixRight)
            suffixRight) k)

end Laws

end Fabric
