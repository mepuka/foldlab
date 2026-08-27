import Std.Data.HashMap
import Std.Data.HashSet
import Effects.Remote.Command

/-!
# The remote client machine

Sans-io: state and one input in; a result, the successor state, wire
commands for the shell, and the decision trace out. The machine never
models the server, HTTP, TLS, or time — the exchange alphabet is its
entire view of the wire — and the Effect shell owns all I/O.

Operations carry client-assigned identifiers and the machine keeps an
in-flight map, so unrelated operations proceed concurrently and every
wire event correlates to exactly one operation — the R1 correction
replacing the busy-serializing single phase. Commands and decisions are
emitted as identifier-tagged pairs; the identifier is a logical
operation name, never an ambient fiber identity.

State carriers are the Lean standard library's `Std.HashMap` and
`Std.HashSet`, per the ratified built-ins-first rider. The rejection
memory is a SET of key-content pairs — rejecting new content for a key
never forgets older rejections, which is what makes the terminal-
integrity law temporal rather than one-step. The upload acknowledgment
re-verifies content, making the caching law unconditional over every
state rather than the reachable subset.

R1 scope: single-key loads and uploads, verification before caching or
return, budget checks on declarations before any inspection of a body,
and terminal integrity. Retry policy, batching (and the key-count
budget), closure ordering, and resume arrive at their own R slices; in
R1 every transport fault gives up cleanly.
-/

namespace Effects.Remote

/-- The machine's environment: declared budgets, a size function for
client-held bytes, and the abstract verification oracle — the model-side
stand-in for recompute-the-address-and-admit. The vector instantiation
runs it over canonical node bytes under a declared toy digest; the tie
to the full CAS admission judgment is the R2 refinement obligation. -/
structure Params (K B : Type) where
  budgets : Budgets
  size : B → Nat
  verify : K → B → Bool

/-- A client-assigned logical operation identifier. -/
abbrev OpId := Nat

/-- What one in-flight operation is doing. -/
inductive OpState (K B : Type) where
  | loading (key : K)
  | uploading (key : K) (bytes : B)
  deriving DecidableEq

/-- A caller-requested operation. -/
inductive Op (K B : Type) where
  | load (key : K)
  | upload (key : K) (bytes : B)
  deriving DecidableEq

/-- Machine input: a caller request or a scheduled wire event, each
correlated by the operation identifier. -/
inductive MInput (K B : Type) where
  | request (id : OpId) (op : Op K B)
  | fromWire (id : OpId) (event : Event K B)
  deriving DecidableEq

/-- What the caller of one step observes. -/
inductive MResult (K B : Type) where
  | commanded
  | delivered (key : K) (bytes : B)
  | uploaded (key : K)
  | notFound (key : K)
  | budgetRejected (key : K)
  | integrityRejected (key : K)
  | repeatRefused (key : K)
  | transportFailed (key : K)
  | authFailed (key : K)
  | duplicateId
  | absorbed
  deriving DecidableEq

/-- The decision trace vocabulary. Issued commands are mirrored into the
trace, and `returned` mirrors delivery to the caller, so the laws
quantify over one observable list covering both the cache and the
caller. -/
inductive RDecision (K B : Type) where
  | issued (command : Command K B)
  | verified (key : K)
  | cached (key : K)
  | returned (key : K)
  | budgetRejected (key : K)
  | integrityRejected (key : K)
  | repeatRefused (key : K)
  | gaveUp (key : K)
  deriving DecidableEq

/-- The tag projection for TRACE-EXCLUDES instances. -/
inductive RTag where
  | issuedProbe
  | issuedLoad
  | issuedFindMissing
  | issuedUpload
  | issuedQuery
  | issuedPublish
  | verified
  | cached
  | returned
  | budgetRejected
  | integrityRejected
  | repeatRefused
  | gaveUp
  deriving DecidableEq

def RDecision.tag {K B : Type} : RDecision K B → RTag
  | .issued .probeCapabilities => .issuedProbe
  | .issued (.load _) => .issuedLoad
  | .issued (.findMissing _) => .issuedFindMissing
  | .issued (.upload _ _) => .issuedUpload
  | .issued (.queryCommitted _) => .issuedQuery
  | .issued (.publishRoot _) => .issuedPublish
  | .verified _ => .verified
  | .cached _ => .cached
  | .returned _ => .returned
  | .budgetRejected _ => .budgetRejected
  | .integrityRejected _ => .integrityRejected
  | .repeatRefused _ => .repeatRefused
  | .gaveUp _ => .gaveUp

/-- Machine state: the in-flight operations, the admitted cache, and the
set of integrity-rejected key-content pairs — the terminal-integrity
memory, which only ever grows. -/
structure MachineState (K B : Type)
    [BEq K] [Hashable K] [BEq B] [Hashable B] where
  inFlight : Std.HashMap OpId (OpState K B)
  cache : Std.HashSet K
  rejected : Std.HashSet (K × B)

/-- One step's output: the result, the successor state, and the
identifier-tagged commands and decisions. -/
structure StepOut (K B : Type)
    [BEq K] [Hashable K] [BEq B] [Hashable B] where
  result : MResult K B
  state : MachineState K B
  commands : List (OpId × Command K B)
  decisions : List (OpId × RDecision K B)

variable {K B : Type} [BEq K] [Hashable K] [BEq B] [Hashable B]

/-- Absorb an uncorrelated or unexpected input: no state change, no
decisions. -/
def absorbOut (s : MachineState K B) : StepOut K B :=
  { result := .absorbed, state := s, commands := [], decisions := [] }

/-- A load's wire event for operation `id` in flight on `key`. The
budget check reads only the declared length — it precedes any
inspection of the body — and both the cache decision and the return to
the caller happen exactly in the branch where verification passed. -/
def loadEvent (P : Params K B) (s : MachineState K B) (id : OpId)
    (key : K) : Event K B → StepOut K B
  | .ok declared bytes =>
    if declared > P.budgets.maxBytes then
      { result := .budgetRejected key
        state := { s with inFlight := s.inFlight.erase id }
        commands := []
        decisions := [(id, .budgetRejected key), (id, .gaveUp key)] }
    else if P.verify key bytes then
      { result := .delivered key bytes
        state := { s with inFlight := s.inFlight.erase id, cache := s.cache.insert key }
        commands := []
        decisions := [(id, .verified key), (id, .cached key),
                      (id, .returned key)] }
    else
      { result := .integrityRejected key
        state := { s with inFlight := s.inFlight.erase id }
        commands := []
        decisions := [(id, .integrityRejected key), (id, .gaveUp key)] }
  | .absent =>
      { result := .notFound key
        state := { s with inFlight := s.inFlight.erase id }
        commands := [], decisions := [(id, .gaveUp key)] }
  | .unauthenticated =>
      { result := .authFailed key
        state := { s with inFlight := s.inFlight.erase id }
        commands := [], decisions := [(id, .gaveUp key)] }
  | .denied =>
      { result := .authFailed key
        state := { s with inFlight := s.inFlight.erase id }
        commands := [], decisions := [(id, .gaveUp key)] }
  | _ =>
      { result := .transportFailed key
        state := { s with inFlight := s.inFlight.erase id }
        commands := [], decisions := [(id, .gaveUp key)] }

/-- An upload's wire event for operation `id` in flight on `key` with
`bytes`. Content was verified before the command was issued and is
re-checked at the acknowledgment; a server-side integrity mismatch
records the terminal rejection for exactly this content. -/
def uploadEvent (P : Params K B) (s : MachineState K B) (id : OpId)
    (key : K) (bytes : B) : Event K B → StepOut K B
  | .ok _ _ =>
      if P.verify key bytes then
        { result := .uploaded key
          state := { s with inFlight := s.inFlight.erase id, cache := s.cache.insert key }
          commands := []
          decisions := [(id, .cached key)] }
      else
        { result := .integrityRejected key
          state := { s with inFlight := s.inFlight.erase id, rejected := s.rejected.insert (key, bytes) }
          commands := []
          decisions := [(id, .integrityRejected key), (id, .gaveUp key)] }
  | .integrityMismatch =>
      { result := .integrityRejected key
        state := { s with inFlight := s.inFlight.erase id, rejected := s.rejected.insert (key, bytes) }
        commands := []
        decisions := [(id, .integrityRejected key), (id, .gaveUp key)] }
  | .unauthenticated =>
      { result := .authFailed key
        state := { s with inFlight := s.inFlight.erase id }
        commands := [], decisions := [(id, .gaveUp key)] }
  | .denied =>
      { result := .authFailed key
        state := { s with inFlight := s.inFlight.erase id }
        commands := [], decisions := [(id, .gaveUp key)] }
  | _ =>
      { result := .transportFailed key
        state := { s with inFlight := s.inFlight.erase id }
        commands := [], decisions := [(id, .gaveUp key)] }

/-- The total remote client step. -/
def step (P : Params K B) (s : MachineState K B) :
    MInput K B → StepOut K B
  | .request id op =>
    match s.inFlight[id]? with
    | some _ =>
        { result := .duplicateId, state := s
          commands := [], decisions := [] }
    | none =>
      match op with
      | .load key =>
          { result := .commanded
            state := { s with inFlight := s.inFlight.insert id (.loading key) }
            commands := [(id, .load key)]
            decisions := [(id, .issued (.load key))] }
      | .upload key bytes =>
        if P.size bytes > P.budgets.maxBytes then
          { result := .budgetRejected key, state := s
            commands := [], decisions := [(id, .budgetRejected key)] }
        else if s.rejected.contains (key, bytes) then
          { result := .repeatRefused key, state := s
            commands := [], decisions := [(id, .repeatRefused key)] }
        else if P.verify key bytes then
          { result := .commanded
            state := { s with
                       inFlight := s.inFlight.insert id (.uploading key bytes) }
            commands := [(id, .upload key bytes)]
            decisions := [(id, .verified key), (id, .issued (.upload key bytes))] }
        else
          { result := .integrityRejected key
            state := { s with rejected := s.rejected.insert (key, bytes) }
            commands := []
            decisions := [(id, .integrityRejected key), (id, .gaveUp key)] }
  | .fromWire id event =>
    match s.inFlight[id]? with
    | none => absorbOut s
    | some (.loading key) => loadEvent P s id key event
    | some (.uploading key bytes) => uploadEvent P s id key bytes event

/-- Whether this state-and-input pair is entitled to cache or return:
the wire event answers an in-flight operation with bytes that pass the
budget and verify for its key (load side), or acknowledges an upload
whose content verifies. RMT-001's guard. -/
def entitledToCache (P : Params K B) (s : MachineState K B) :
    MInput K B → Bool
  | .fromWire id (.ok declared bytes) =>
    match s.inFlight[id]? with
    | some (.loading key) =>
        !(declared > P.budgets.maxBytes) && P.verify key bytes
    | some (.uploading key bytes') => P.verify key bytes'
    | none => false
  | _ => false

/-- Whether this state-and-input pair carries a declaration over the
byte budget — the inputs RMT-002 obliges the machine to reject before
any verification or admission decision: a fresh upload request whose
content size exceeds the byte budget, or a load response whose declared
length does. The key-count budget is the R3 batch slice's. -/
def overBudget (P : Params K B) (s : MachineState K B) :
    MInput K B → Bool
  | .request id (.upload _ bytes) =>
    match s.inFlight[id]? with
    | none => P.size bytes > P.budgets.maxBytes
    | some _ => false
  | .fromWire id (.ok declared _) =>
    match s.inFlight[id]? with
    | some (.loading _) => declared > P.budgets.maxBytes
    | _ => false
  | _ => false

/-- Whether a result is the budget rejection. -/
def MResult.isBudgetRejection : MResult K B → Bool
  | .budgetRejected _ => true
  | _ => false

/-- Run the machine over an input list, collecting per-step results,
the decision trace, and the command stream. -/
def run (P : Params K B) : MachineState K B → List (MInput K B) →
    MachineState K B × List (MResult K B) ×
      List (OpId × RDecision K B) × List (OpId × Command K B)
  | s, [] => (s, [], [], [])
  | s, i :: is =>
    let o := step P s i
    let rest := run P o.state is
    (rest.1, o.result :: rest.2.1, o.decisions ++ rest.2.2.1,
      o.commands ++ rest.2.2.2)

end Effects.Remote
