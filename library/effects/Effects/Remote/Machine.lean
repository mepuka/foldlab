import Std.Data.HashMap
import Std.Data.HashSet
import Effects.Remote.Command

/-!
# The remote client machine

Sans-io: state and one input in; a result, the successor state, wire
commands for the shell, and the decision trace out. The machine never
models the server, HTTP, TLS, or time — the exchange alphabet is its
entire view of the wire — and the Effect shell owns all I/O.

State carriers are the Lean standard library's `Std.HashSet` and
`Std.HashMap`, per the ratified built-ins-first rider; the laws are
stated over the step's decisions and commands, so proofs lean on branch
structure and the standard library's lookup lemmas, never on kernel
evaluation of carrier internals.

R1 scope: one operation in flight (single load or upload), verification
before caching, budget checks before any inspection of a body, and the
terminal-integrity guard. Retry policy, batching, closure ordering,
resume, and cache-hit short-circuits arrive at their own R slices; in
R1 every transport fault gives up cleanly.
-/

namespace Effects.Remote

/-- The machine's environment: declared budgets, a size function for
client-held bytes, and the abstract verification oracle — the model-side
stand-in for recompute-the-address-and-admit. -/
structure Params (K B : Type) where
  budgets : Budgets
  size : B → Nat
  verify : K → B → Bool

/-- What the machine is currently doing. R1 admits one operation in
flight. -/
inductive Phase (K B : Type) where
  | idle
  | loading (key : K)
  | uploading (key : K) (bytes : B)
  deriving DecidableEq

/-- A caller-requested operation. -/
inductive Op (K B : Type) where
  | load (key : K)
  | upload (key : K) (bytes : B)
  deriving DecidableEq

/-- Machine input: a caller request, or a scheduled wire event. -/
inductive MInput (K B : Type) where
  | request (op : Op K B)
  | fromWire (event : Event K B)
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
  | busy
  | absorbed
  deriving DecidableEq

/-- The decision trace vocabulary. Issued commands are mirrored into the
trace so laws quantify over one observable list. -/
inductive RDecision (K B : Type) where
  | issued (command : Command K B)
  | verified (key : K)
  | cached (key : K)
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
  | .budgetRejected _ => .budgetRejected
  | .integrityRejected _ => .integrityRejected
  | .repeatRefused _ => .repeatRefused
  | .gaveUp _ => .gaveUp

/-- Machine state: the phase, the admitted cache, and the per-key record
of integrity-rejected upload content — the terminal-integrity memory. -/
structure MachineState (K B : Type) [BEq K] [Hashable K] where
  phase : Phase K B
  cache : Std.HashSet K
  rejected : Std.HashMap K B

/-- One step's output. -/
structure StepOut (K B : Type) [BEq K] [Hashable K] where
  result : MResult K B
  state : MachineState K B
  commands : List (Command K B)
  decisions : List (RDecision K B)

variable {K B : Type} [BEq K] [Hashable K] [BEq B]

/-- Refuse a request while another operation is in flight. -/
def busyOut (s : MachineState K B) : StepOut K B :=
  { result := .busy, state := s, commands := [], decisions := [] }

/-- Absorb an unexpected wire event: no state change, no decisions. -/
def absorbOut (s : MachineState K B) : StepOut K B :=
  { result := .absorbed, state := s, commands := [], decisions := [] }

/-- A load's wire event, with the machine in `loading key`. The budget
check reads only the declared length — it precedes any inspection of the
body — and caching happens exactly in the branch where verification
passed. -/
def loadEvent (P : Params K B) (s : MachineState K B) (key : K) :
    Event K B → StepOut K B
  | .ok declared bytes =>
    if declared > P.budgets.maxBytes then
      { result := .budgetRejected key
        state := { s with phase := .idle }
        commands := []
        decisions := [.budgetRejected key, .gaveUp key] }
    else if P.verify key bytes then
      { result := .delivered key bytes
        state := { s with phase := .idle, cache := s.cache.insert key }
        commands := []
        decisions := [.verified key, .cached key] }
    else
      { result := .integrityRejected key
        state := { s with phase := .idle }
        commands := []
        decisions := [.integrityRejected key, .gaveUp key] }
  | .absent =>
      { result := .notFound key, state := { s with phase := .idle }
        commands := [], decisions := [.gaveUp key] }
  | .unauthenticated =>
      { result := .authFailed key, state := { s with phase := .idle }
        commands := [], decisions := [.gaveUp key] }
  | .denied =>
      { result := .authFailed key, state := { s with phase := .idle }
        commands := [], decisions := [.gaveUp key] }
  | _ =>
      { result := .transportFailed key, state := { s with phase := .idle }
        commands := [], decisions := [.gaveUp key] }

/-- An upload's wire event, with the machine in `uploading key bytes`.
The content was verified before the command was issued and is re-checked
at the acknowledgment — defense in depth that makes the
cache-only-after-verification law unconditional over every state, not
only the reachable ones. A server-side integrity mismatch records the
terminal rejection for exactly this content. -/
def uploadEvent (P : Params K B) (s : MachineState K B) (key : K)
    (bytes : B) : Event K B → StepOut K B
  | .ok _ _ =>
      if P.verify key bytes then
        { result := .uploaded key
          state := { s with phase := .idle, cache := s.cache.insert key }
          commands := []
          decisions := [.cached key] }
      else
        { result := .integrityRejected key
          state := { s with phase := .idle, rejected := s.rejected.insert key bytes }
          commands := []
          decisions := [.integrityRejected key, .gaveUp key] }
  | .integrityMismatch =>
      { result := .integrityRejected key
        state := { s with phase := .idle, rejected := s.rejected.insert key bytes }
        commands := []
        decisions := [.integrityRejected key, .gaveUp key] }
  | .unauthenticated =>
      { result := .authFailed key, state := { s with phase := .idle }
        commands := [], decisions := [.gaveUp key] }
  | .denied =>
      { result := .authFailed key, state := { s with phase := .idle }
        commands := [], decisions := [.gaveUp key] }
  | _ =>
      { result := .transportFailed key, state := { s with phase := .idle }
        commands := [], decisions := [.gaveUp key] }

/-- The total remote client step. -/
def step (P : Params K B) (s : MachineState K B) :
    MInput K B → StepOut K B
  | .request (.load key) =>
    match s.phase with
    | .idle =>
        { result := .commanded
          state := { s with phase := .loading key }
          commands := [.load key]
          decisions := [.issued (.load key)] }
    | _ => busyOut s
  | .request (.upload key bytes) =>
    match s.phase with
    | .idle =>
        if P.size bytes > P.budgets.maxBytes then
          { result := .budgetRejected key, state := s
            commands := [], decisions := [.budgetRejected key] }
        else if s.rejected[key]? == some bytes then
          { result := .repeatRefused key, state := s
            commands := [], decisions := [.repeatRefused key] }
        else if P.verify key bytes then
          { result := .commanded
            state := { s with phase := .uploading key bytes }
            commands := [.upload key bytes]
            decisions := [.verified key, .issued (.upload key bytes)] }
        else
          { result := .integrityRejected key
            state := { s with rejected := s.rejected.insert key bytes }
            commands := []
            decisions := [.integrityRejected key, .gaveUp key] }
    | _ => busyOut s
  | .fromWire event =>
    match s.phase with
    | .idle => absorbOut s
    | .loading key => loadEvent P s key event
    | .uploading key bytes => uploadEvent P s key bytes event

/-- Whether this state-and-input pair is entitled to cache: the pending
wire event carries bytes that pass the budget and verify for the
in-flight key (load side), or acknowledges an upload whose content was
verified before the command was issued. RMT-001's guard. -/
def entitledToCache (P : Params K B) (s : MachineState K B) :
    MInput K B → Bool
  | .fromWire (.ok declared bytes) =>
    match s.phase with
    | .loading key => !(declared > P.budgets.maxBytes) && P.verify key bytes
    | .uploading key bytes' => P.verify key bytes'
    | .idle => false
  | _ => false

/-- Whether this state-and-input pair carries a declaration over the
budgets — the inputs RMT-002 obliges the machine to reject before any
hashing or decoding: an idle-phase upload request whose content size
exceeds the byte budget, or a load response whose declared length does.
-/
def overBudget (P : Params K B) (s : MachineState K B) :
    MInput K B → Bool
  | .request (.upload _ bytes) =>
    match s.phase with
    | .idle => P.size bytes > P.budgets.maxBytes
    | _ => false
  | .fromWire (.ok declared _) =>
    match s.phase with
    | .loading _ => declared > P.budgets.maxBytes
    | _ => false
  | _ => false

/-- Whether a result is the budget rejection. -/
def MResult.isBudgetRejection : MResult K B → Bool
  | .budgetRejected _ => true
  | _ => false

end Effects.Remote
