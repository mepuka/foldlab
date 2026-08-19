/- The laws, stated once and proved nowhere. Every statement in this
   file is a proposition about the objects the definitions mint; the
   proofs live one file deeper, and a statement carrying its own proof
   body would let the claim drift toward what happens to be provable. -/
import Substrate.Definitions

namespace Substrate.Laws

open Substrate

/-! ## CL-1 — carriage invariance -/

/-- The central claim, at the value level: two mints whose three declared
    groups are one value fold to one session value, whatever carriage
    each side minted under. -/
def SCarriageInvariance : Prop :=
  forall left right : MintSite, left.groups = right.groups ->
    mint left = mint right

/-- Carriage is not an input, stated as a rewrite: moving a site's
    posture, transport, and lane position moves nothing the fold sees. -/
def SPostureNotAnInput : Prop :=
  forall (groups : SessionGroups) (leftPosture rightPosture : Posture)
    (leftTransport rightTransport leftPosition rightPosition : Nat),
    mint ⟨groups, leftPosture, leftTransport, leftPosition⟩ =
      mint ⟨groups, rightPosture, rightTransport, rightPosition⟩

/-- The byte-level claim, over an arbitrary canonical encoding: equal
    groups give equal bytes. -/
def SCarriageInvariantBytes : Prop :=
  forall (Bytes : Type) (encode : Encoding Bytes) (left right : MintSite),
    left.groups = right.groups -> encode (mint left) = encode (mint right)

/-- Hence one digest, over an arbitrary naming of those bytes. The
    converse is not claimed anywhere in this package: that two different
    byte strings never share a digest is collision-freedom and belongs to
    the trusted base. -/
def SOneDigestPerGroups : Prop :=
  forall (Bytes Name : Type) (encode : Encoding Bytes)
    (digest : Naming Bytes Name) (left right : MintSite),
    left.groups = right.groups ->
      sessionName encode digest (mint left) =
        sessionName encode digest (mint right)

/-- The fold is faithful to the groups: one session value comes from one
    triple of groups. This is what makes a mutated group field a moved
    value rather than a silent collision. -/
def SFoldFaithful : Prop := Function.Injective foldSession

/-- A mutated group field moves the canonical bytes, for every injective
    canonical encoding. The digest then moves unless the digest collides,
    which is the trusted base's business and not this model's. -/
def SMutatedGroupMovesBytes : Prop :=
  forall (Bytes : Type) (encode : Encoding Bytes),
    Function.Injective encode ->
      forall left right : MintSite, left.groups ≠ right.groups ->
        encode (mint left) ≠ encode (mint right)

/-! ## CL-4 — lifecycle machine soundness -/

/-- The alphabet is the transcribed eleven, split seven transitions to
    four readings, with no symbol spelled twice. The roster's agreement
    with the transcribed table itself is a gate arm, not a theorem: a
    model that restated the table would be the twin the transcription
    discipline refuses. -/
def LAlphabetTranscribed : Prop :=
  alphabet.length = 11 /\
    (alphabet.filter fun event =>
      event.placement == Placement.transition).length = 7 /\
    (alphabet.filter fun event =>
      event.placement == Placement.observation).length = 4 /\
    alphabet.Nodup

/-- The machine is TOTAL over the eleven-symbol alphabet: every state
    carries a row for every symbol. -/
def LMachineTotal : Prop :=
  forall (state : State) (event : Event),
    (stepOf machine state event).isSome = true

/-- A reading is read WITHIN a state and never moves it. Promoting one
    would name a state the transcription never carries. -/
def LReadingsHoldState : Prop :=
  forall (state : State) (event : Event),
    event.placement = Placement.observation ->
      stepOf machine state event = some state

/-- A transition lands in the state its own event names, everywhere but
    at the terminal. -/
def LTransitionNamesItsState : Prop :=
  forall (state : State) (event : Event) (landing : State),
    state ≠ terminal -> event.target = some landing ->
      stepOf machine state event = some landing

/-- The terminal state absorbs: no symbol leaves it. -/
def LTerminalAbsorbing : Prop :=
  forall event : Event, stepOf machine terminal event = some terminal

/-- The terminal absorbing state is reachable from establishment. -/
def LTerminalReachable : Prop :=
  run machine State.established closeTrace = some terminal

/-- Drain and close are distinct paths to the shared terminal: the
    lame-duck disposition lands in a state of its own, that state is not
    the terminal, the drain path reaches the terminal all the same, and
    the two paths are two. -/
def LDrainCloseDistinct : Prop :=
  stepOf machine State.established Event.ldm = some State.ldm /\
    State.ldm ≠ terminal /\
    run machine State.established drainTrace = some terminal /\
    drainTrace ≠ closeTrace

/-! ## CL-5 — incarnation chain integrity -/

/-- Successor-names-predecessor is well-founded over a lawful landing
    order: the chain is acyclic. That a real digest cycle would need a
    hash preimage stays in the trusted base. -/
def RChainPinWellFounded : Prop :=
  forall chain : List Incarnation, ChainAdmission chain ->
    WellFounded (ChainPins chain)

/-- No incarnation names itself: the one-step cycle, refuted directly by
    the rank embedding. -/
def RNoSelfPredecessor : Prop :=
  forall (chain : List Incarnation), ChainAdmission chain ->
    forall entry : Incarnation, ¬ ChainPins chain entry entry

/-- Base: the register at its beginning satisfies the invariant. -/
def RRegisterBase : Prop := RegisterInv initialRegister

/-- Consecution: every lawful act carries the invariant forward. -/
def RRegisterConsecution : Prop :=
  forall (register : Register) (act : Act) (next : Register),
    RegisterInv register -> stepRegister register act = some next ->
      RegisterInv next

/-- Safety: the invariant implies what the commission asks — a lawful
    landing order, hence acyclicity, and at most one landed-current
    incarnation per store directory at every revision. -/
def RRegisterSafety : Prop :=
  forall register : Register, RegisterInv register ->
    AtMostOneCurrent register /\ ChainAdmission register.chain

end Substrate.Laws
