/- Mutant definitions only. Their refutations live in `ControlProofs.lean`. -/
import Fabric.Definitions

namespace Fabric.Mutants

/-- A multiplicity-retaining variant of the shipped observation cell. -/
abbrev MultiplicityCell := Emitter.GroundObservation -> Nat

/-- The multiplicity cell's merge retains associativity and commutativity but
    drops the shipped cell merge's idempotence. -/
def multiplicityMerge (left right : MultiplicityCell) : MultiplicityCell :=
  fun observation => left observation + right observation

def multiplicityEmpty : MultiplicityCell := fun _ => 0

def multiplicitySingleton (observation : Emitter.GroundObservation) :
    MultiplicityCell :=
  fun candidate => if candidate == observation then 1 else 0

def foldMultiplicity (trace : List Emitter.GroundObservation) : MultiplicityCell :=
  trace.foldl (fun cell observation =>
    multiplicityMerge cell (multiplicitySingleton observation)) multiplicityEmpty

/-- Left choice over the shipped `GroundCell` carrier retains associativity
    and idempotence but drops commutativity. -/
def leftBiasedCellMerge (left _right : Emitter.GroundCell) : Emitter.GroundCell :=
  left

/-- Fold the actual observation alphabet with the non-commutative cell merge. -/
def foldLeftBiased : List Emitter.GroundObservation -> Emitter.GroundCell
  | [] => Cell.empty
  | observation :: observations =>
      observations.foldl (fun cell next =>
        leftBiasedCellMerge cell (Cell.singleton next)) (Cell.singleton observation)

/-- Drops the successor discipline: any arrival above the current frontier is
    applied immediately, even when it skips the next contiguous position. -/
def arrivalOrderApply {State Op : Type} (step : State -> Op -> State)
    (floor : Nat) (deliveries : List (Positioned Op))
    (initial : State) : State :=
  (deliveries.foldl (fun replay delivery =>
    if replay.1 < delivery.position then
      (delivery.position, step replay.2 delivery.operation)
    else replay) (floor, initial)).2

/-- The exact 6-before-5 reordering row from the committed corpus. -/
def reorderedDeliveryVector : List (Positioned Nat) :=
  Emitter.reorderedDeliveries

/-- Position coverage holds over the floor-10 two-operation window, but the
    two arrivals at position 11 disagree on the payload: the schedule
    violates `PositionPayloadIntegrity` while satisfying `WindowCoverage`. -/
def payloadConflictDeliveries : List (Positioned Nat) :=
  [ { position := 11, operation := 2 }
  , { position := 11, operation := 999 }
  , { position := 12, operation := 3 }
  ]

/-- Drops the position-payload-integrity premise: the shipped consumer's
    last-write buffer is trusted on a schedule whose redeliveries conflict at
    one position, so the drain replays whichever payload arrived last. The
    body is exactly `guardedApply`'s — the mutation is running it outside
    the premise that licenses it. -/
def lastWriteBufferApply {State Op : Type} (step : State -> Op -> State)
    (floor count : Nat) (deliveries : List (Positioned Op))
    (initial : State) : State :=
  applySuccessors step floor count initial (ingestSchedule deliveries)

/-! ### F7 assembly mutants -/

/-- Drops the declared-reads frame: assembly consults one read the program
    never declared — the model rendering of a timestamp selector. The body
    is the lawful assembly of an EXTENDED program; the mutation is
    consulting a read that is not in the declaration. -/
def ambientAssemble {Addr Value : Type} (ambient : ContextRead Addr Value)
    (program : ContextProgram Addr Value) (valuation : Addr -> Value) :
    List (ContextSegment Addr) :=
  assemble { reads := program.reads ++ [ambient] } valuation

/-- Drops the volatility-stable ordering: segments are emitted in the
    ambient completion order of an evaluation schedule instead of the
    declared class order. -/
def scheduleOrderAssemble {Addr Value : Type} (schedule : List Nat)
    (program : ContextProgram Addr Value) (valuation : Addr -> Value) :
    List (ContextSegment Addr) :=
  let segments := renderReads program valuation
  schedule.filterMap fun index => segments[index]?

/-- The eager completion schedule of the two-schedules row: reads complete
    in declared order, so the turn read lands first. -/
def completionScheduleEager : List Nat := [0, 1, 2]

/-- The late completion schedule of the same row: reads complete in the
    reverse order. -/
def completionScheduleLate : List Nat := [2, 1, 0]

/-- The completion schedule that happens to coincide with the declared
    class order of the ground program (static, session, turn sit at read
    indices 1, 2, 0). -/
def completionScheduleCanonical : List Nat := [1, 2, 0]

/-- Reverses each class's segments while keeping the class blocks in the
    fixed order: lawful under the congruence half and the class-projection
    half, refuted by the within-class half. -/
def reversedWithinClass {Addr : Type} (segments : List (ContextSegment Addr)) :
    List (ContextSegment Addr) :=
  Volatility.all.flatMap fun volatility =>
    (segments.filter fun segment => segment.volatility == volatility).reverse

/-- The rival assembler built from it: drops exactly the within-class
    order — equal-class segments leave program order — while both other
    F7 statements keep holding at every program and valuation. -/
def rivalAssemble {Addr Value : Type} (program : ContextProgram Addr Value)
    (valuation : Addr -> Value) : List (ContextSegment Addr) :=
  reversedWithinClass (renderReads program valuation)

/-- The two-reads-one-class program of the within-class row. The ground
    program's three classes are pairwise distinct, so a within-class rival
    is byte-identical there; this vector is where it becomes visible. -/
def twoStaticProgram : ContextProgram Nat Nat where
  reads :=
    [ { addr := 10, render := Emitter.decimalRender, volatility := .static }
    , { addr := 20, render := Emitter.taggedRender, volatility := .static }
    ]

/-! ### F11 query mutants -/

/-- Drops the identity tie-break: take the first k of the support in
    arrival order — insertion order becomes the tie-break. -/
def arrivalOrderTopK (k : Nat) (entries : List Emitter.GroundEntry) :
    List Emitter.GroundEntry :=
  (dedup entries).take k

/-- Drops schedule independence and nothing else: an answer with an extra
    ambient-thread parameter it actually consults — an entry the thread
    has seen gets a score boost — while the declared sort and tie-break
    stay in force. At the empty thread it is definitionally the lawful
    top-k, so a kill is attributable to consulting the thread alone. The
    lawful query carrier has no such parameter to read. -/
def ambientScheduleAnswer (ambient : List Emitter.GroundEntry) (k : Nat)
    (entries : List Emitter.GroundEntry) : List Emitter.GroundEntry :=
  topK
    (fun entry =>
      Emitter.groundScore entry + (if ambient.contains entry then 10 else 0))
    id k entries

/-- The empty ambient thread of the two-schedules row. -/
def ambientThreadEmpty : List Emitter.GroundEntry := []

/-- The boosting ambient thread of the same row: it has seen entry 12. -/
def ambientThreadBoosting : List Emitter.GroundEntry := [12]

/-- The duplicate-free presentation of arrival order one, for the retained
    duplication pins. -/
def queryArrivalOneExact : List Emitter.GroundEntry := [7, 5, 23, 12]

abbrev GroundPolicy := Policy Nat compare

def atoms (values : List Nat) : FiniteSet Nat compare :=
  Std.ExtTreeSet.ofList values compare

def rootPolicy : GroundPolicy where
  capabilities := atoms [1, 2]
  contextAllowlist := atoms [10, 20]
  toolkits := atoms [30]
  writ := atoms [40, 50]
  indexes := atoms [60]
  resources := atoms [70, 71]
  capabilityClass := 3
  effortClass := 4
  budget := 10
  spawnBound := 5

def escalatingRequest : GroundPolicy where
  capabilities := atoms [2, 3]
  contextAllowlist := atoms [20, 21]
  toolkits := atoms [30, 31]
  writ := atoms [50, 51]
  indexes := atoms [60, 61]
  resources := atoms [71, 72]
  capabilityClass := 8
  effortClass := 9
  budget := 20
  spawnBound := 12

/-- Drops meet-clamping: the request becomes effective without its parent. -/
def unclampedChild (_parent requested : GroundPolicy) : GroundPolicy := requested

end Fabric.Mutants
