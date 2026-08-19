/- The substrate model's objects: the session fold and its mint sites,
   the lifecycle machine over the transcribed status vocabulary, and the
   incarnation register.

   This package MODELS THE ESTATE'S USE of a transcribed vendor surface.
   It states no claim about the vendor's own implementation of that
   surface, and it says nothing about liveness: what the substrate is
   doing NOW is unsayable here, exactly as the kernel language makes it
   unsayable everywhere.

   The kernel is CITED, never restated. Canonical-byte identity is the
   kernel's `Value`; the fenced register's identity and its token are the
   kernel's `Digest` and `Token`; the store directory is a kernel digest
   at the resource kind. Nothing in this file flows the other way: the
   kernel is a carrier's referee and never imports a carrier's concerns.

   STATED ABSTRACTIONS — every place this model diverges from or
   sharpens the prose it stands on:

   A1. The three declared groups are modeled as canonical VALUES, one per
       group, rather than as their field structure. The claim under test
       is that the fold is a function of the groups and of nothing else;
       what a group's fields are is the runtime differential's business,
       and modeling them would only restate the certifier's own wall.
   A2. The canonical ENCODING is a parameter, not a definition. Every
       byte-level statement here quantifies over an arbitrary encoding,
       and the sharper ones over an arbitrary INJECTIVE encoding. The
       estate's own canonical form and its injectivity are a differential
       wall's claim, not this model's.
   A3. The DIGEST is likewise a parameter. Equal bytes give one digest for
       every digest function, which is the direction this commission
       needs. The converse — different bytes give different digests — is
       NOT claimed anywhere: it is collision-freedom, it belongs to the
       trusted base, and the negative control witnesses the moved bytes
       rather than a moved hash.
   A4. The lifecycle machine's initial state is `established`. It is not
       named by any status event because establishment is not a status
       event: it is the session fact itself. The other seven states are
       each named by the transition event that lands in them.
   A5. The machine is a TABLE, not a total function. A total function
       could not express a machine missing a symbol, and a totality claim
       no mutant can break is not a claim. Totality is therefore a
       property of the shipped table, checked, with its own control.
   A6. The incarnation chain is carried NEWEST FIRST and its predecessor
       discipline is an inductive admission order, reusing the kernel's
       own pin well-foundedness idiom. Acyclicity is well-foundedness of
       the predecessor relation under a rank embedding; that a real
       digest cycle would need a hash preimage stays in the trusted base,
       exactly as it does in the kernel.
   A7. The landed-current binding is carried as a LIST of store-to-name
       pairs, which can hold two bindings for one store. Modeling it as a
       function from store directory to at-most-one name would make the
       at-most-one claim true by construction and therefore empty.
   A8. A revision is a counter and a fence is a token carrying a
       revision. Real revision assignment is the substrate's, and the
       assumptions gate is where it is probed; here the fence is what the
       step relation reads. -/
import Kernel

namespace Substrate

open Kernel

/-! ## CL-1 — the substrate session fold, and the carriage that is not an
input to it

A substrate session is the fold of three declared groups: the substrate's
own declaration of itself, the digest of the connect-options value the
process declared, and the estate's own declaration of the writ and shape
set it opened under. The fold's digest is the session's name.

Which side performed the mint — a privileged client folding the greeting
it received, or the daemon folding the options it started under plus the
registration it observed — is carriage. Carriage is not an input. -/

/-- The three declared groups a substrate session folds from, each at its
    canonical value identity. "The same three groups" is exactly equality
    of this record: two mints agree on the groups when this value is one
    value. -/
structure SessionGroups where
  substrate : Value
  options : Value
  estate : Value
deriving Repr, DecidableEq

/-- The folded session value: the envelope the three groups fold into,
    carrying the version and kind every estate value carries and the
    three groups themselves. Its digest is the session's name. -/
structure SessionValue where
  version : Nat
  kind : String
  groups : SessionGroups
deriving Repr, DecidableEq

/-- The fold: three declared groups in, one session value out. -/
def foldSession (groups : SessionGroups) : SessionValue where
  version := 0
  kind := "substrate-session"
  groups := groups

/-- The posture a mint is performed under. Both postures appear in the
    model precisely so that neither can appear in the fold. -/
inductive Posture where
  | privilegedClient
  | daemon
deriving Repr, DecidableEq

/-- Everything a minting side holds at the moment it mints. Beyond the
    three declared groups it holds carriage: the posture it mints under,
    the transport it read the groups through, and the position on its own
    lane at which it minted. None of the carriage is an input to the
    fold, and that is the whole of the claim. -/
structure MintSite where
  groups : SessionGroups
  posture : Posture
  transport : Nat
  position : Nat
deriving Repr, DecidableEq

/-- What a mint site produces. The definition is the claim's content: the
    site's carriage is discarded and the fold is applied to the groups. -/
def mint (site : MintSite) : SessionValue :=
  foldSession site.groups

/-- A canonical encoding of session values into a byte carrier. It is a
    parameter of every byte-level statement here, never a definition. -/
abbrev Encoding (Bytes : Type) := SessionValue -> Bytes

/-- A naming of encoded bytes: the digest. Also a parameter. -/
abbrev Naming (Bytes Name : Type) := Bytes -> Name

/-- The session's name: the digest of the canonical bytes of the folded
    value. -/
def sessionName {Bytes Name : Type} (encode : Encoding Bytes)
    (digest : Naming Bytes Name) (session : SessionValue) : Name :=
  digest (encode session)

/-! ## CL-4 — the lifecycle machine over the transcribed status
vocabulary

The alphabet is the transcribed status-events vocabulary and nothing
else. It is DATA here — a roster this package renders and a gate arm
holds against the transcribed table's own canonical rendering. A status
event this model spelled for itself would be the twin the transcription
discipline exists to refuse. -/

/-- The eleven transcribed status events, each named by the wire type the
    transcription carries. -/
inductive Event where
  | disconnect
  | reconnect
  | reconnecting
  | update
  | ldm
  | error
  | ping
  | staleConnection
  | forceReconnect
  | slowConsumer
  | close
deriving Repr, DecidableEq

/-- The wire type of a status event. -/
def Event.wire : Event -> String
  | .disconnect => "disconnect"
  | .reconnect => "reconnect"
  | .reconnecting => "reconnecting"
  | .update => "update"
  | .ldm => "ldm"
  | .error => "error"
  | .ping => "ping"
  | .staleConnection => "staleConnection"
  | .forceReconnect => "forceReconnect"
  | .slowConsumer => "slowConsumer"
  | .close => "close"

/-- The placement column of the transcribed table: the split between the
    events that change a connection's state and the events that are
    readings within whatever state the connection is already in. -/
inductive Placement where
  | transition
  | observation
deriving Repr, DecidableEq

/-- The wire spelling of a placement. -/
def Placement.wire : Placement -> String
  | .transition => "transition"
  | .observation => "observation"

/-- Where the transcribed table places each event. Seven transitions,
    four readings. -/
def Event.placement : Event -> Placement
  | .disconnect => .transition
  | .reconnect => .transition
  | .reconnecting => .transition
  | .update => .observation
  | .ldm => .transition
  | .error => .observation
  | .ping => .observation
  | .staleConnection => .transition
  | .forceReconnect => .transition
  | .slowConsumer => .observation
  | .close => .transition

/-- The alphabet roster, in the transcribed table's own row order. -/
def alphabet : List Event :=
  [.disconnect, .reconnect, .reconnecting, .update, .ldm, .error, .ping,
   .staleConnection, .forceReconnect, .slowConsumer, .close]

/-- One roster line: a wire type and the placement column beside it. The
    gate arm holds this rendering against the transcribed table's. -/
def Event.rosterLine (event : Event) : String :=
  event.wire ++ "|" ++ event.placement.wire

/-- The roster this model claims as its alphabet, rendered. -/
def alphabetRoster : List String :=
  alphabet.map Event.rosterLine

/-- The connection's states. `established` is the initial state and is
    named by no event, because establishment is not a status event; every
    other state is named by the transition event that lands in it. -/
inductive State where
  | established
  | disconnect
  | reconnect
  | reconnecting
  | ldm
  | staleConnection
  | forceReconnect
  | close
deriving Repr, DecidableEq

/-- The state a transition event names. A reading names none. -/
def Event.target : Event -> Option State
  | .disconnect => some .disconnect
  | .reconnect => some .reconnect
  | .reconnecting => some .reconnecting
  | .ldm => some .ldm
  | .staleConnection => some .staleConnection
  | .forceReconnect => some .forceReconnect
  | .close => some .close
  | .update => none
  | .error => none
  | .ping => none
  | .slowConsumer => none

/-- The terminal state: the one a closed connection never leaves. -/
def terminal : State := .close

/-- The state roster. -/
def states : List State :=
  [.established, .disconnect, .reconnect, .reconnecting, .ldm,
   .staleConnection, .forceReconnect, .close]

/-- One row of a lifecycle machine: a state, a symbol, and where the
    symbol lands from that state. -/
abbrev Row := State × Event × State

/-- A lifecycle machine is a table of rows. It is a table rather than a
    function so that a machine missing a symbol is expressible, and so
    that totality is a property with a control instead of a truth by
    construction. -/
abbrev Machine := List Row

/-- The step a machine takes, if it carries a row for the pair. -/
def stepOf (machine : Machine) (state : State) (event : Event) :
    Option State :=
  (machine.find? (fun row => row.1 == state && row.2.1 == event)).map
    (fun row => row.2.2)

/-- Where the ratified machine lands one symbol from one state: the
    terminal absorbs everything, a reading holds the state it is read
    in, and a transition lands in the state its own event names. -/
def lawfulTarget (state : State) (event : Event) : State :=
  if state == terminal then terminal
  else
    match event.target with
    | some landing => landing
    | none => state

/-- The ratified machine: the full table over the state roster and the
    transcribed alphabet. -/
def machine : Machine :=
  states.flatMap fun state =>
    alphabet.map fun event => (state, event, lawfulTarget state event)

/-- Walking a machine over a trace, refusing where the table is silent. -/
def run (machine : Machine) : State -> List Event -> Option State
  | state, [] => some state
  | state, event :: rest =>
      match stepOf machine state event with
      | none => none
      | some landing => run machine landing rest

/-- The drain path: the lame-duck disposition reaches the connection, and
    the connection then closes. -/
def drainTrace : List Event := [.ldm, .close]

/-- The close path: the connection closes with no drain before it. -/
def closeTrace : List Event := [.close]

/-- A machine one symbol short: every row for one state-and-symbol pair
    dropped. Totality is broken and nothing else is. -/
def machineMissingSymbol : Machine :=
  machine.filter fun row =>
    !(row.1 == State.established && row.2.1 == Event.forceReconnect)

/-- A machine that promotes a reading to a state change: the error
    reading, which the transcription places as an observation, moves the
    connection instead of being read within it. -/
def machinePromotingReading : Machine :=
  machine.map fun row =>
    if row.2.1 == Event.error && !(row.1 == terminal) then
      (row.1, row.2.1, State.disconnect)
    else row

/-- A machine that conflates the drain path with the close path: the
    lame-duck disposition lands directly in the terminal, so draining and
    closing are one path rather than two. -/
def machineConflatingDrain : Machine :=
  machine.map fun row =>
    if row.2.1 == Event.ldm then (row.1, row.2.1, terminal) else row

/-! ## CL-5 — incarnation chain integrity

One incarnation is one server run over one store directory. A restart
mints a successor naming its predecessor; the chain over one store
directory is the audit. The register that lands the current incarnation
is fenced, and the fence is the kernel's own token sort: a token means
nothing outside the register that issued it, and the comparison that
would carry it across has no type. -/

/-- The store directory's digest: the substrate's durable identity, at
    the kernel's resource-declaration digest sort. -/
abbrev Store := Digest DeclKind.resource

/-- The incarnation register's own identity, at the kernel's
    program-declaration digest sort. -/
def incarnationRegister : Digest DeclKind.program where
  id := 0

/-- A fencing token for the incarnation register. Its type names the
    register: a token from another register cannot be presented here,
    and the attempt to write one does not elaborate. -/
abbrev Fence := Token incarnationRegister

/-- One server run over one store directory: its own name, the store it
    runs over, and the predecessor it names. The first run over a store
    names none. -/
structure Incarnation where
  name : Nat
  store : Store
  predecessor : Option Nat
deriving Repr, DecidableEq

/-- The inductive landing order over incarnations, newest first: a
    successor names a predecessor already landed over the SAME store, a
    run that names no predecessor is the first over its store, and a name
    lands at most once. -/
inductive ChainAdmission : List Incarnation -> Prop where
  | empty : ChainAdmission []
  | land (prior : List Incarnation) (entry : Incarnation)
      (admission : ChainAdmission prior)
      (predecessorLanded : forall predecessor,
        entry.predecessor = some predecessor ->
        exists earlier, earlier ∈ prior /\ earlier.name = predecessor /\
          earlier.store = entry.store)
      (firstOverStore : entry.predecessor = none ->
        forall earlier, earlier ∈ prior -> earlier.store ≠ entry.store)
      (fresh : forall earlier, earlier ∈ prior ->
        earlier.name ≠ entry.name) :
      ChainAdmission (entry :: prior)

/-- The predecessor relation inside a chain: `predecessor` is named by
    `successor`. -/
def ChainPins (chain : List Incarnation)
    (predecessor successor : Incarnation) : Prop :=
  successor ∈ chain /\ predecessor ∈ chain /\
    successor.predecessor = some predecessor.name

/-- The landing rank of an incarnation name: its distance from the oldest
    landing. Later landings rank strictly higher. -/
def chainRank : List Incarnation -> Nat -> Nat
  | [], _ => 0
  | entry :: rest, name =>
      if entry.name == name then rest.length else chainRank rest name

/-- The register's observable state at one revision: the revision itself,
    the append-only chain newest first, and the landed-current bindings.
    The bindings are a LIST, so a register holding two current
    incarnations for one store directory is expressible. -/
structure Register where
  revision : Nat
  chain : List Incarnation
  current : List (Store × Nat)
deriving Repr, DecidableEq

/-- The register at its beginning: no revisions, no chain, nothing
    current. -/
def initialRegister : Register where
  revision := 0
  chain := []
  current := []

/-- The names a binding list holds as landed-current for one store
    directory. -/
def bindingsAt (bindings : List (Store × Nat)) (store : Store) :
    List Nat :=
  bindings.filterMap fun binding =>
    if binding.1 = store then some binding.2 else none

/-- The names bound as landed-current for one store directory. -/
def currentsAt (register : Register) (store : Store) : List Nat :=
  bindingsAt register.current store

/-- Dropping every landed-current binding for one store directory — what
    a landing does to the incumbent it succeeds, and what a retirement
    does outright. -/
def withoutStore (bindings : List (Store × Nat)) (store : Store) :
    List (Store × Nat) :=
  bindings.filter fun binding => decide (binding.1 ≠ store)

/-- The safety half: at most one incarnation stands landed-current for
    one store directory. -/
def AtMostOneCurrent (register : Register) : Prop :=
  forall store, (currentsAt register store).length ≤ 1

/-- The register's inductive invariant: the chain is a lawful landing
    order, and no store directory holds two current incarnations. -/
def RegisterInv (register : Register) : Prop :=
  ChainAdmission register.chain /\ AtMostOneCurrent register

/-- An act at the incarnation register. -/
inductive Act where
  | land (entry : Incarnation) (fence : Fence)
  | retire (store : Store)
deriving Repr

/-- Whether a landing is admitted: the fence names the register's current
    revision, the name is fresh, and the predecessor discipline holds —
    a named predecessor is already landed over the same store, and a
    landing that names none is the first over its store. -/
def landAdmitted (register : Register) (entry : Incarnation)
    (fence : Fence) : Bool :=
  fence.value == register.revision &&
    (register.chain.all fun earlier => !(earlier.name == entry.name)) &&
    (match entry.predecessor with
     | some predecessor =>
         register.chain.any fun earlier =>
           earlier.name == predecessor && earlier.store == entry.store
     | none =>
         register.chain.all fun earlier => !(earlier.store == entry.store))

/-- The lawful step. A landing prepends the successor to the chain and
    REPLACES the store's landed-current binding in the same act — the one
    fenced decide, which is why racing landings cannot both stand. A
    retirement drops the store's binding and leaves the chain exactly as
    it lies, because history is the point. -/
def stepRegister (register : Register) : Act -> Option Register
  | .land entry fence =>
      if landAdmitted register entry fence then
        some { revision := register.revision + 1,
               chain := entry :: register.chain,
               current :=
                 withoutStore register.current entry.store ++
                   [(entry.store, entry.name)] }
      else none
  | .retire store =>
      some { revision := register.revision + 1,
             chain := register.chain,
             current := withoutStore register.current store }

/-- The guard with the successor discipline dropped: the fence and the
    freshness check stand, and what a landing may name as its predecessor
    does not. -/
def landAdmittedSansPredecessor (register : Register)
    (entry : Incarnation) (fence : Fence) : Bool :=
  fence.value == register.revision &&
    (register.chain.all fun earlier => !(earlier.name == entry.name))

/-- The mutant that lands without the successor discipline, so a run may
    name itself — or a run over another store — as its predecessor. -/
def stepCyclic (register : Register) : Act -> Option Register
  | .land entry fence =>
      if landAdmittedSansPredecessor register entry fence then
        some { revision := register.revision + 1,
               chain := entry :: register.chain,
               current :=
                 withoutStore register.current entry.store ++
                   [(entry.store, entry.name)] }
      else none
  | .retire store => stepRegister register (.retire store)

/-- Whether an incarnation names itself as its own predecessor: the
    one-step cycle, read straight off the entry. -/
def namesItself (entry : Incarnation) : Bool :=
  entry.predecessor == some entry.name

/-- The mutant that lands without retiring the incumbent: everything the
    lawful step does except replacing the store's binding, so two
    incarnations stand landed-current for one store directory. -/
def stepUnfenced (register : Register) : Act -> Option Register
  | .land entry fence =>
      if landAdmitted register entry fence then
        some { revision := register.revision + 1,
               chain := entry :: register.chain,
               current := register.current ++ [(entry.store, entry.name)] }
      else none
  | .retire store => stepRegister register (.retire store)

/-- A store directory to exercise the register at. -/
def sampleStore : Store where
  id := 7

/-- A second store directory, so a landing at one store can be seen to
    leave the other's binding alone. -/
def otherStore : Store where
  id := 9

/-- The first run over the sample store. -/
def firstIncarnation : Incarnation where
  name := 1
  store := sampleStore
  predecessor := none

/-- Its successor, naming it. -/
def secondIncarnation : Incarnation where
  name := 2
  store := sampleStore
  predecessor := some 1

/-- A run over the sample store that names ITSELF as its predecessor —
    the one-step cycle the landing order refuses. -/
def selfPredecessor : Incarnation where
  name := 3
  store := sampleStore
  predecessor := some 3

/-- A fence carrying a revision. -/
def fenceAt (revision : Nat) : Fence where
  value := revision

end Substrate
