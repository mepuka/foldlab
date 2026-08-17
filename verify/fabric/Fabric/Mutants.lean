/- Mutant definitions only. Their refutations live in `ControlProofs.lean`. -/
import Fabric.Definitions

namespace Fabric.Mutants

/-- Drops only idempotence from ACI: addition remains associative and
    commutative, but a duplicate increments the state twice. -/
def additiveMerge (left right : Nat) : Nat := left + right

/-- Drops only commutativity from ACI: left choice remains associative and
    idempotent, but the delivery order chooses the result. -/
def leftBiasedMerge (left _right : Nat) : Nat := left

/-- Drops the position-floor guard while retaining the same step function. -/
def unguardedApply {State Op : Type} (step : State -> Op -> State)
    (deliveries : List (Positioned Op)) (initial : State) : State :=
  deliveries.foldl (fun state delivery => step state delivery.operation) initial

/-- A stale replay, a reordered pair, and a duplicate current delivery. -/
def floorReplayVector : List (Positioned Nat) :=
  [ { position := 9, operation := 100 }
  , { position := 12, operation := 3 }
  , { position := 11, operation := 2 }
  , { position := 11, operation := 2 }
  ]

abbrev GroundPolicy := Policy Nat compare

def emptyAtoms : FiniteSet Nat compare := ∅

def rootPolicy : GroundPolicy where
  capabilities := emptyAtoms
  contextAllowlist := emptyAtoms
  toolkits := emptyAtoms
  writ := emptyAtoms
  capabilityClass := 1
  effortClass := 1
  budget := 1
  spawnBound := 1

def escalatingRequest : GroundPolicy where
  capabilities := emptyAtoms
  contextAllowlist := emptyAtoms
  toolkits := emptyAtoms
  writ := emptyAtoms
  capabilityClass := 2
  effortClass := 2
  budget := 2
  spawnBound := 2

/-- Drops meet-clamping: the request becomes effective without its parent. -/
def unclampedChild (_parent requested : GroundPolicy) : GroundPolicy := requested

end Fabric.Mutants
