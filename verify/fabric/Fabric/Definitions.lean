/-
The objects of the Plait fabric algebra. This package is deliberately
independent of `verify/moves`: it follows that package's finite-set idiom but
restates every object at the fabric seam.
-/
import Std.Data.ExtTreeSet.Lemmas

namespace Fabric

universe uH uV uR

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

/-- The exact multi-gap row: a delivery order whose positions arrive with
    more than one gap open at once. This model ingests the whole schedule
    and then drains, so no statement here describes a transient buffer
    shape — the theorem's content is terminal equality over the window;
    the incremental drain behaviour is the consuming wall's and the chaos
    gates' to measure, not the model's. -/
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

/-! ## Context assembly programs -/

/-- The declared volatility classes, listed once in the fixed order every
    lawful assembly presents: stable content first, per-turn content last. -/
inductive Volatility where
  | static
  | policy
  | session
  | live
  | turn
deriving Repr, DecidableEq

/-- The fixed class order. Segment ordering is a function of this list and
    of the program's declared order — never of evaluation schedule. -/
def Volatility.all : List Volatility :=
  [.static, .policy, .session, .live, .turn]

/-- The wire name of a volatility class. -/
def Volatility.name : Volatility -> String
  | .static => "static"
  | .policy => "policy"
  | .session => "session"
  | .live => "live"
  | .turn => "turn"

/-- One declared read: a selector address, a pure renderer, and a declared
    volatility class. The renderer's domain is exactly the value at the
    address — no clock, schedule, or ambient input exists to consult. -/
structure ContextRead (Addr : Type uH) (Value : Type uV) where
  addr : Addr
  render : Value -> String
  volatility : Volatility

/-- A context program is exactly its ordered list of declared reads; the
    declaration is the program's identity, and assembly may consult
    nothing outside it. -/
structure ContextProgram (Addr : Type uH) (Value : Type uV) where
  reads : List (ContextRead Addr Value)

/-- The addresses a program declares. F7 quantifies valuation agreement
    over exactly this list. -/
def ContextProgram.addresses {Addr : Type uH} {Value : Type uV}
    (program : ContextProgram Addr Value) : List Addr :=
  program.reads.map ContextRead.addr

/-- One assembled segment: the declared class, the source address whose
    value it rendered, and the rendered text. -/
structure ContextSegment (Addr : Type uH) where
  volatility : Volatility
  source : Addr
  text : String
deriving Repr, DecidableEq

/-- Render every declared read at an input valuation, in program order. -/
def renderReads {Addr : Type uH} {Value : Type uV}
    (program : ContextProgram Addr Value) (valuation : Addr -> Value) :
    List (ContextSegment Addr) :=
  program.reads.map fun read =>
    { volatility := read.volatility
      source := read.addr
      text := read.render (valuation read.addr) }

/-- The stable class sort of a declared class list: the class filters
    concatenated in the fixed order. Equal-class entries keep their
    declared relative order — stability is constructive, not asserted. -/
def stableClassOrder (classes : List Volatility) : List Volatility :=
  Volatility.all.flatMap fun volatility =>
    classes.filter fun declared => declared == volatility

/-- Volatility-stable segment ordering: the same filter-concatenation over
    assembled segments. -/
def orderByVolatility {Addr : Type uH}
    (segments : List (ContextSegment Addr)) : List (ContextSegment Addr) :=
  Volatility.all.flatMap fun volatility =>
    segments.filter fun segment => segment.volatility == volatility

/-- Assembly: the volatility-stable ordering of the rendered declared
    reads. The signature is the whole discipline — a program and an input
    valuation, nothing else; no schedule or ambient address exists to
    read. -/
def assemble {Addr : Type uH} {Value : Type uV}
    (program : ContextProgram Addr Value) (valuation : Addr -> Value) :
    List (ContextSegment Addr) :=
  orderByVolatility (renderReads program valuation)

namespace Emitter

/-- The decimal ground renderer used by the assembly rows. -/
def decimalRender (value : Nat) : String := toString value

/-- A second pure ground renderer, so the ground program exercises
    renderer variety through the same declared-read shape. -/
def taggedRender (value : Nat) : String := "#" ++ toString value

/-- The ground assembly program: three reads declared out of class order —
    the turn read first — so the stable class sort visibly reorders. -/
def contextProgram : ContextProgram Nat Nat where
  reads :=
    [ { addr := 30, render := taggedRender, volatility := .turn }
    , { addr := 10, render := decimalRender, volatility := .static }
    , { addr := 20, render := decimalRender, volatility := .session }
    ]

/-- The address of the planted ambient selector: a timestamp-shaped input
    no declared read names. -/
def timestampAddr : Nat := 99

/-- The ambient read the mutant assembly consults — the model rendering of
    a timestamp selector. The lawful assembly cannot mention it, because
    it is not in the program. -/
def timestampRead : ContextRead Nat Nat where
  addr := timestampAddr
  render := decimalRender
  volatility := .turn

/-- Ground valuation one: every address holds its successor. -/
def valuationOne (addr : Nat) : Nat := addr + 1

/-- Ground valuation two agrees with valuation one on every declared
    address and drifts exactly at the undeclared timestamp address. -/
def valuationTwo (addr : Nat) : Nat :=
  if addr == timestampAddr then 777 else addr + 1

end Emitter

/-! ## Query algebras over anchored supports -/

/-- Remove duplicates, keeping each entry's last occurrence: the
    executable support normalisation inside `topK`. Membership is exactly
    the input's support. -/
def dedup {Entry : Type uV} [BEq Entry] : List Entry -> List Entry
  | [] => []
  | entry :: entries =>
      if entries.contains entry then dedup entries
      else entry :: dedup entries

/-- The declared result order: score descending, then identity ascending.
    Distinct scores never consult identity; ties at one score break by
    identity bytes, never by arrival. -/
def byScoreThenIdentity {Entry : Type uV} (score identity : Entry -> Nat)
    (left right : Entry) : Bool :=
  decide (score right < score left) ||
    (decide (score left = score right) &&
      decide (identity left <= identity right))

/-- The named distinctness premise: within a support, identity bytes
    determine the entry. Content-addressed entries carry it by
    construction, and it is exactly what makes the identity tie-break
    antisymmetric. -/
def IdentityDistinct {Entry : Type uV} (identity : Entry -> Nat)
    (entries : List Entry) : Prop :=
  forall left, left ∈ entries -> forall right, right ∈ entries ->
    identity left = identity right -> left = right

/-- Top-k: dedup the delivered support, sort under the declared
    score/identity order, take the declared width. The signature admits no
    seed, clock, schedule, or arrival-order parameter. -/
def topK {Entry : Type uV} [BEq Entry] (score identity : Entry -> Nat)
    (k : Nat) (entries : List Entry) : List Entry :=
  ((dedup entries).mergeSort (byScoreThenIdentity score identity)).take k

/-- A declared query algebra answers from the anchored state and the query
    value alone. The constructor's closure is the purity admission: no
    clock, seed, schedule, or locale parameter exists to read. -/
structure QueryAlgebra (State : Type uH) (Query : Type uV)
    (Result : Type uR) where
  answer : State -> Query -> Result

/-- The support step: an index's anchored state is the entry list its
    admitted deliveries appended — the F3 resumption carrier for queries. -/
def appendEntry {Entry : Type uV} (state : List Entry) (entry : Entry) :
    List Entry :=
  state ++ [entry]

/-- The declared ground query algebra: answer width-k top-k over the
    anchored support. -/
def topKAlgebra {Entry : Type uV} [BEq Entry]
    (score identity : Entry -> Nat) :
    QueryAlgebra (List Entry) Nat (List Entry) where
  answer state k := topK score identity k state

/-- The semantic inputs an admitted query declaration may name. A seed is
    admissible only as declaration data — inside the digest. -/
inductive QueryInput where
  | anchoredState
  | queryValue
  | declaredSeed (seed : Nat)
deriving Repr, DecidableEq

/-- Candidate inputs at declaration admission, including the ambient
    shapes a runtime could try to smuggle past F11. -/
inductive QueryInputCandidate where
  | anchoredState
  | queryValue
  | declaredSeed (seed : Nat)
  | ambientSeed
  | ambientClock
  | ambientSchedule
deriving Repr, DecidableEq

/-- Structural admission at declaration time. Every ambient form maps to
    `none` because no admitted constructor exists to carry it: the refusal
    is the closure of the query carrier, and the refusing row names F11. -/
def admitQueryInput : QueryInputCandidate -> Option QueryInput
  | .anchoredState => some .anchoredState
  | .queryValue => some .queryValue
  | .declaredSeed seed => some (.declaredSeed seed)
  | .ambientSeed => none
  | .ambientClock => none
  | .ambientSchedule => none

namespace Emitter

/-- Ground query entries are content-addressed: the numeral IS the
    identity. -/
abbrev GroundEntry := Nat

/-- The declared ground score: decade buckets, so distinct identities tie. -/
def groundScore (entry : GroundEntry) : Nat := entry / 10

/-- The declared ground result width. -/
def groundWidth : Nat := 3

/-- Arrival order one: the support with one duplicated delivery. -/
def queryArrivalOne : List GroundEntry := [7, 23, 5, 23, 12]

/-- Arrival order two: the same support, permuted, with a different entry
    duplicated. -/
def queryArrivalTwo : List GroundEntry := [12, 5, 7, 23, 7]

/-- The anchored split of arrival one: checkpoint after two deliveries. -/
def queryPrefixOne : List GroundEntry := [7, 23]

/-- The suffix delivered after arrival one's checkpoint. -/
def querySuffixOne : List GroundEntry := [5, 23, 12]

/-- The anchored split of arrival two: checkpoint after three deliveries. -/
def queryPrefixTwo : List GroundEntry := [12, 5, 7]

/-- The suffix delivered after arrival two's checkpoint. -/
def querySuffixTwo : List GroundEntry := [23, 7]

end Emitter

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

/-! ## The derived join order

The order a join operation derives: `a ≤ b` exactly when joining `a` into
`b` changes nothing. One general package over a raw join function — the
`SemilatticeSup.mk'` construction transliterated: the order laws and
least-upper-bound laws from associativity, commutativity, and idempotence
alone — instantiated once per ACI carrier. -/

/-- The derived order of a join operation. -/
def supLe {alpha : Type uH} (sup : alpha -> alpha -> alpha)
    (left right : alpha) : Prop :=
  sup left right = right

/-- The join-semilattice package: the derived order is reflexive,
    antisymmetric, and transitive, and
    the join is the least upper bound. Proved once from ACI
    (`join_semilattice_of_aci`); each carrier instantiates it. -/
def JoinSemilatticePackage {alpha : Type uH}
    (sup : alpha -> alpha -> alpha) : Prop :=
  (forall a, supLe sup a a) /\
  (forall a b, supLe sup a b -> supLe sup b a -> a = b) /\
  (forall a b c, supLe sup a b -> supLe sup b c -> supLe sup a c) /\
  (forall a b, supLe sup a (sup a b)) /\
  (forall a b, supLe sup b (sup a b)) /\
  (forall a b c, supLe sup a c -> supLe sup b c -> supLe sup (sup a b) c)

/-! ## The directory — naming as a map lattice

A directory is `Map Petname (FiniteSet Digest)` under componentwise union.
The carrier is the map's graph: a finite set of `(petname, digest)` pairs.
Maps with absent-name-means-empty correspond exactly to binding-pair sets,
and componentwise union of maps is union of graphs
(`directory_merge_bindings` is the componentwise reading, proved). The
graph side is the carrier because an empty-set-valued name is
unrepresentable by construction — no well-formedness invariant exists to
thread through the statements. -/

/-- One directory binding: a petname bound to a digest. -/
abbrev Binding (Petname : Type uH) (Digest : Type uV) := Petname × Digest

/-- The directory carrier: the finite binding set under a declared
    comparator. -/
abbrev Directory (Petname : Type uH) (Digest : Type uV)
    (cmp : Binding Petname Digest -> Binding Petname Digest -> Ordering) :=
  FiniteSet (Binding Petname Digest) cmp

namespace Directory

variable {Petname : Type uH} {Digest : Type uV}
variable {cmp : Binding Petname Digest -> Binding Petname Digest -> Ordering}
variable [Std.TransCmp cmp]

/-- The directory with no bindings. -/
def empty : Directory Petname Digest cmp := ∅

/-- Componentwise union of the induced maps: union of the graphs. -/
def merge (left right : Directory Petname Digest cmp) :
    Directory Petname Digest cmp :=
  left ∪ right

/-- The induced map, read as membership: `name` is bound to `digest`. -/
def BoundTo (directory : Directory Petname Digest cmp) (name : Petname)
    (digest : Digest) : Prop :=
  (name, digest) ∈ directory

/-- Two replicas hold exactly the same bindings. -/
def SameBindingSet (left right : Directory Petname Digest cmp) : Prop :=
  forall binding, binding ∈ left <-> binding ∈ right

end Directory

/-- The directory state reached by folding a raw bind-event trace. Arrival
    order and multiplicity are forgotten — binding append is monotone,
    coordination-free, and duplicate-safe. -/
def foldBindings {Petname : Type uH} {Digest : Type uV}
    (cmp : Binding Petname Digest -> Binding Petname Digest -> Ordering)
    [Std.TransCmp cmp] (events : List (Binding Petname Digest)) :
    Directory Petname Digest cmp :=
  Std.ExtTreeSet.ofList events cmp

/-! ## Fenced resolution -/

/-- The identity-ascending listing order: `byScoreThenIdentity` at the
    constant score, so its totality, transitivity, and antisymmetry lemmas
    apply verbatim. Ambiguity candidates list in identity order, never in
    arrival order. -/
abbrev byIdentity {Digest : Type uV} (identity : Digest -> Nat) :
    Digest -> Digest -> Bool :=
  byScoreThenIdentity (fun _ => 0) identity

/-- The digests a directory binds at one name: the filtered projection of
    the binding set's listing. -/
def boundDigests {Petname : Type uH} {Digest : Type uV}
    {cmp : Binding Petname Digest -> Binding Petname Digest -> Ordering}
    [Std.TransCmp cmp] [BEq Petname]
    (directory : Directory Petname Digest cmp) (name : Petname) :
    List Digest :=
  (directory.toList.filter (fun binding => binding.1 == name)).map
    (fun binding => binding.2)

/-- The canonical candidate listing at a name: dedup, then sort under the
    identity order — the `topK` normalisation at unbounded width. -/
def candidates {Petname : Type uH} {Digest : Type uV}
    {cmp : Binding Petname Digest -> Binding Petname Digest -> Ordering}
    [Std.TransCmp cmp] [BEq Petname] [BEq Digest]
    (identity : Digest -> Nat)
    (directory : Directory Petname Digest cmp) (name : Petname) :
    List Digest :=
  (dedup (boundDigests directory name)).mergeSort (byIdentity identity)

/-- A seal: a fencing token, the holder that landed it, and the digest the
    landed rebind decided. Tokens are modeled as `Nat`, a concrete linear
    order; the running system's strictly increasing token order is the
    register's (F5 I1, `verify/fabric-veil`). The holder is attributed
    observation data and never an arbitration input — the token decides,
    never the who — which is exactly the non-role the holder-arbitration
    mutant drops. -/
structure Seal (Digest : Type uV) where
  token : Nat
  holder : Nat
  digest : Digest
deriving Repr, DecidableEq

/-- The greatest-token seal of a raw observed seal list. Replacement
    happens only on a strictly larger token: at a token tie the earlier
    arrival is kept, so no tie is decided anywhere in this function — only
    the `SealsWellFenced` premise rules ties out. -/
def greatestSeal {Digest : Type uV} : List (Seal Digest) -> Option (Seal Digest)
  | [] => none
  | arrival :: rest =>
      match greatestSeal rest with
      | none => some arrival
      | some best =>
          if arrival.token < best.token then some best else some arrival

/-- Every token names at most one seal in the observed support. Discharged
    by the Veil register package's F5 invariants I1/I2 — strictly
    increasing fencing tokens, at most one landed commit per register —
    carried here as a named premise and never restated in this toolchain:
    the pinned-toolchain split makes import impossible, and a restatement
    would be drift risk, not evidence. -/
def SealsWellFenced {Digest : Type uV} (seals : List (Seal Digest)) : Prop :=
  forall left, left ∈ seals -> forall right, right ∈ seals ->
    left.token = right.token -> left = right

/-- Resolution's four verdicts. -/
inductive Resolution (Digest : Type uV) where
  | bound (digest : Digest)
  | absent
  | ambiguous (candidates : List Digest)
  | sealedAt (token : Nat) (digest : Digest)
deriving Repr, DecidableEq

/-- Head-relative fenced resolution. With any seal observed, the binding
    sealed at the greatest token wins — computed over seal data alone,
    because a seal is evidence of a landed fenced decision whose monotone
    bind may still be in flight; requiring the sealed digest among the
    candidates would leak a liveness fact into a correctness verdict. With
    no seal, the candidate set answers: one binding, an absence refusal,
    or an ambiguity refusal listing the candidates in identity order. -/
def resolve {Petname : Type uH} {Digest : Type uV}
    {cmp : Binding Petname Digest -> Binding Petname Digest -> Ordering}
    [Std.TransCmp cmp] [BEq Petname] [BEq Digest]
    (identity : Digest -> Nat)
    (directory : Directory Petname Digest cmp) (name : Petname)
    (seals : List (Seal Digest)) : Resolution Digest :=
  match greatestSeal seals with
  | some top => .sealedAt top.token top.digest
  | none =>
      match candidates identity directory name with
      | [] => .absent
      | [digest] => .bound digest
      | first :: second :: rest => .ambiguous (first :: second :: rest)

namespace Emitter

/-- The ground binding comparator: bindings share the observation
    carrier's lexicographic shape. -/
abbrev bindingCmp : Binding Nat Nat -> Binding Nat Nat -> Ordering :=
  observationCmp

/-- The concrete directory exercised by the generated corpus. -/
abbrev GroundDirectory := Directory Nat Nat bindingCmp

/-- The contested ground petname: two nodes bound it concurrently. -/
def groundPetname : Nat := 1

/-- The singleton-bound ground petname. -/
def singletonPetname : Nat := 2

/-- The never-bound ground petname. -/
def absentPetname : Nat := 3

/-- Bind arrival order one: name 1 contested across two nodes, name 2
    bound once. -/
def bindOrderOne : List (Binding Nat Nat) := [(1, 100), (2, 300), (1, 200)]

/-- The same bind support in another arrival order. -/
def bindOrderTwo : List (Binding Nat Nat) := [(1, 200), (1, 100), (2, 300)]

/-- The ground directory state: the fold of arrival order one. -/
def groundDirectory : GroundDirectory := foldBindings bindingCmp bindOrderOne

/-- The permuted-seal row's first arrival order: (7,A) then (9,B). The
    holders are attributed data; token 7's seal was landed by holder 9 so
    a holder-arbitrating variant visibly disagrees with the token order. -/
def sealOrderOne : List (Seal Nat) :=
  [ { token := 7, holder := 9, digest := 100 }
  , { token := 9, holder := 1, digest := 200 }
  ]

/-- The same seal support arriving (9,B) then (7,A). -/
def sealOrderTwo : List (Seal Nat) :=
  [ { token := 9, holder := 1, digest := 200 }
  , { token := 7, holder := 9, digest := 100 }
  ]

/-- The landed seal history of the stale-rebind row. -/
def landedSeals : List (Seal Nat) := [{ token := 9, holder := 1, digest := 200 }]

/-- The stale rebind attempt: token 7 observed after token 9 landed. -/
def staleSeal : Seal Nat := { token := 7, holder := 9, digest := 100 }

end Emitter

/-! ## Triggers over fabric state -/

/-- The epistemic stages of a hole. `opened` is the protocol stage named
    open; Lean's keyword forces the spelling. -/
inductive HoleStage where
  | opened
  | filled
  | disputed
  | decided
  | sealed
deriving Repr, DecidableEq

/-- The numeric rank of a stage: opened, filled, disputed, decided,
    sealed, in rising order. A hole production observes rank only in the
    reached-at-least direction. -/
def HoleStage.rank : HoleStage -> Nat
  | .opened => 0
  | .filled => 1
  | .disputed => 2
  | .decided => 3
  | .sealed => 4

/-- The fabric state a trigger observes: the evidence bag, per-cell
    states, hole stages, landed outcomes, and the journal head. -/
structure FabricState (Holder : Type uH) (Value : Type uV)
    (cmp : Observation Holder Value -> Observation Holder Value -> Ordering)
    where
  evidence : Cell Holder Value cmp
  cells : Nat -> Cell Holder Value cmp
  holes : Nat -> HoleStage
  landed : FiniteSet Nat compare
  head : Nat

/-- Componentwise fabric growth. The evidence and per-cell components
    grow in the derived semilattice order; hole stages only rise along
    the epistemic rank — the high-water reading; whether the runtime's
    hole stages are monotone along real evolution is the projection
    lane's question, not this model's — and landed outcomes and the head
    are monotone reads of the journal, the head being the prefix order
    projected to its length. -/
structure FabricState.Le {Holder : Type uH} {Value : Type uV}
    {cmp : Observation Holder Value -> Observation Holder Value -> Ordering}
    [Std.TransCmp cmp]
    (before after : FabricState Holder Value cmp) : Prop where
  evidence : supLe Cell.merge before.evidence after.evidence
  cells : forall cell, supLe Cell.merge (before.cells cell) (after.cells cell)
  holes : forall hole, (before.holes hole).rank <= (after.holes hole).rank
  landed : forall outcome, outcome ∈ before.landed -> outcome ∈ after.landed
  head : before.head <= after.head

/-- The closed trigger grammar: exactly the five ruled monotone
    productions. Absence, negation, and deadline are unrepresentable —
    no constructor exists to carry them; the grammar's closure IS the
    structural enforcement, and the deadline seat stays a fenced session
    act outside this algebra. -/
inductive TriggerPredicate (Holder : Type uH) (Value : Type uV) where
  | evidenceAppears (pattern : List (Observation Holder Value))
  | cellReaches (cell : Nat) (threshold : List (Observation Holder Value))
  | holeReaches (hole : Nat) (target : HoleStage)
  | outcomeLanded (work : Nat)
  | headAdvancedPast (position : Nat)

/-- The denotation of a trigger predicate at a fabric state. Every
    production reads its component upward: presence, reached-at-least,
    landed, advanced-past. -/
def holds {Holder : Type uH} {Value : Type uV}
    {cmp : Observation Holder Value -> Observation Holder Value -> Ordering}
    [Std.TransCmp cmp] :
    TriggerPredicate Holder Value -> FabricState Holder Value cmp -> Prop
  | .evidenceAppears pattern, state =>
      forall observation, observation ∈ pattern ->
        observation ∈ state.evidence
  | .cellReaches cell threshold, state =>
      forall observation, observation ∈ threshold ->
        observation ∈ state.cells cell
  | .holeReaches hole target, state =>
      target.rank <= (state.holes hole).rank
  | .outcomeLanded work, state => work ∈ state.landed
  | .headAdvancedPast position, state => position < state.head

/-- The executable evaluation of a trigger predicate. -/
def holdsBool {Holder : Type uH} {Value : Type uV}
    {cmp : Observation Holder Value -> Observation Holder Value -> Ordering}
    [Std.TransCmp cmp] :
    TriggerPredicate Holder Value -> FabricState Holder Value cmp -> Bool
  | .evidenceAppears pattern, state =>
      pattern.all fun observation => state.evidence.contains observation
  | .cellReaches cell threshold, state =>
      threshold.all fun observation => (state.cells cell).contains observation
  | .holeReaches hole target, state =>
      decide (target.rank <= (state.holes hole).rank)
  | .outcomeLanded work, state => state.landed.contains work
  | .headAdvancedPast position, state => decide (position < state.head)

/-- A declared trigger: a monotone predicate and the action-declaration
    template digest its firing hints at. That the landed CLAIMS of those
    hints never land twice is the register's F5 I2 — cited, never
    restated here. -/
structure Trigger (Holder : Type uH) (Value : Type uV) where
  predicate : TriggerPredicate Holder Value
  declaration : Nat

/-- The declarations a trigger set hints at a state: the enabled set. -/
def enabledDeclarations {Holder : Type uH} {Value : Type uV}
    {cmp : Observation Holder Value -> Observation Holder Value -> Ordering}
    [Std.TransCmp cmp] (triggers : List (Trigger Holder Value))
    (state : FabricState Holder Value cmp) : List Nat :=
  (triggers.filter fun trigger => holdsBool trigger.predicate state).map
    fun trigger => trigger.declaration

namespace Emitter

/-- The small ground state: one observation, hole 0 open, nothing landed,
    head at 3. -/
def smallState : FabricState Nat Nat observationCmp where
  evidence := foldEvidence observationCmp [(1, 10)]
  cells := fun cell =>
    if cell == 5 then foldEvidence observationCmp [] else Cell.empty
  holes := fun _ => .opened
  landed := Std.ExtTreeSet.ofList [] compare
  head := 3

/-- The grown ground state: more evidence, cell 5 grown, hole 0 filled,
    outcome 42 landed, head advanced to 7 — componentwise above
    `smallState`. -/
def grownState : FabricState Nat Nat observationCmp where
  evidence := foldEvidence observationCmp [(1, 10), (2, 20)]
  cells := fun cell =>
    if cell == 5 then foldEvidence observationCmp [(2, 20)] else Cell.empty
  holes := fun hole => if hole == 0 then .filled else .opened
  landed := Std.ExtTreeSet.ofList [42] compare
  head := 7

/-- The ground trigger set: one trigger per production. -/
def groundTriggers : List (Trigger Nat Nat) :=
  [ { predicate := .evidenceAppears [(1, 10)], declaration := 100 }
  , { predicate := .holeReaches 0 .filled, declaration := 101 }
  , { predicate := .outcomeLanded 42, declaration := 102 }
  , { predicate := .headAdvancedPast 5, declaration := 103 }
  , { predicate := .cellReaches 5 [(2, 20)], declaration := 104 }
  ]

/-- Hint arrival order one: the grown evidence support with one
    duplicated delivery. -/
def hintOrderOne : List GroundObservation := [(1, 10), (2, 20), (1, 10)]

/-- The same evidence support, permuted, duplicating the other
    observation. -/
def hintOrderTwo : List GroundObservation := [(2, 20), (1, 10), (2, 20)]

/-- The trigger-observed state at a delivered evidence schedule, the
    non-evidence components held at the grown state. -/
def hintStateOf (deliveries : List GroundObservation) :
    FabricState Nat Nat observationCmp where
  evidence := foldEvidence observationCmp deliveries
  cells := grownState.cells
  holes := grownState.holes
  landed := grownState.landed
  head := grownState.head

end Emitter

/-! ## Action admission and the pin order (C7) -/

/-- An action declaration: its work digest and the digests it pins.
    Digests are modeled as identity labels; that a real digest cycle
    would need a hash preimage is the trusted base's sentence, never
    proved here. -/
structure ActionDeclaration where
  work : Nat
  pins : List Nat
deriving Repr, DecidableEq

/-- The inductive admission order: a ledger grows one declaration at a
    time (newest first), every pin names an already-admitted work
    digest, and a work digest admits at most once — the in-model reading
    of content addressing. -/
inductive Admission : List ActionDeclaration -> Prop where
  | empty : Admission []
  | admit (ledger : List ActionDeclaration)
      (declaration : ActionDeclaration) (admission : Admission ledger)
      (pinsAdmitted : forall pin, pin ∈ declaration.pins ->
        exists prior, prior ∈ ledger /\ prior.work = pin)
      (fresh : forall prior, prior ∈ ledger ->
        prior.work ≠ declaration.work) :
      Admission (declaration :: ledger)

/-- The pin relation inside a ledger: `parent` is pinned by `child`. -/
def PinsWithin (ledger : List ActionDeclaration)
    (parent child : ActionDeclaration) : Prop :=
  child ∈ ledger /\ parent ∈ ledger /\ parent.work ∈ child.pins

/-- The admission rank of a work digest: its distance from the oldest
    admission. Later admissions rank strictly higher. -/
def admissionRank : List ActionDeclaration -> Nat -> Nat
  | [], _ => 0
  | declaration :: ledger, work =>
      if declaration.work == work then ledger.length
      else admissionRank ledger work

/-! ## Compaction below the anchor floor -/

/-- The minimum anchor floor across a nonempty family of deployed folds:
    the compaction horizon is derived, never chosen. -/
def minimumFloor (floor : Nat) (floors : List Nat) : Nat :=
  floors.foldr Nat.min floor

end Fabric
