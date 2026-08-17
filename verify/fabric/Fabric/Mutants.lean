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

/-- Consume one arrival with only the upper bound. This is the lawful replay
    consumer with exactly the lower position-floor guard removed. -/
def ingestWithoutFloor {Op : Type} (ceiling : Nat)
    (buffer : List (Positioned Op)) (delivery : Positioned Op) :
    List (Positioned Op) :=
  if delivery.position <= ceiling then insertPositioned delivery buffer else buffer

/-- Drops only the lower position-floor guard: sorting, deduplication, the
    upper bound, and the arbitrary step function are unchanged. -/
def unguardedApply {State Op : Type} (step : State -> Op -> State)
    (floor count : Nat) (deliveries : List (Positioned Op))
    (initial : State) : State :=
  let ingested := deliveries.foldl (ingestWithoutFloor (floor + count)) []
  applyPositioned step initial ingested

/-- The exact stale-replay row from the committed corpus. -/
def floorReplayVector : List (Positioned Nat) :=
  Emitter.staleReplayDeliveries

abbrev GroundPolicy := Policy Nat compare

def atoms (values : List Nat) : FiniteSet Nat compare :=
  Std.ExtTreeSet.ofList values compare

def rootPolicy : GroundPolicy where
  capabilities := atoms [1, 2]
  contextAllowlist := atoms [10, 20]
  toolkits := atoms [30]
  writ := atoms [40, 50]
  capabilityClass := 3
  effortClass := 4
  budget := 10
  spawnBound := 5

def escalatingRequest : GroundPolicy where
  capabilities := atoms [2, 3]
  contextAllowlist := atoms [20, 21]
  toolkits := atoms [30, 31]
  writ := atoms [50, 51]
  capabilityClass := 8
  effortClass := 9
  budget := 20
  spawnBound := 12

/-- Drops meet-clamping: the request becomes effective without its parent. -/
def unclampedChild (_parent requested : GroundPolicy) : GroundPolicy := requested

end Fabric.Mutants
