/- The substrate model's negative controls. Each one drops exactly one
   ratified law and must be refuted on exactly that law's own invariant,
   with the lawful side carried beside the mutant so that agreement by a
   machine that decides nothing cannot pass for evidence.

   Every control prints what it measured — both sides, verbatim — and
   ends in its verdict. A control that survives exits non-zero. -/
import Substrate

open Substrate

/-- The controls' own illustrative rendering of a session value. The
    model's theorems quantify over an arbitrary canonical encoding; a
    control has to execute one, so this is it, and it is a control's
    instrument rather than a claim about the estate's canonical form. -/
def render (session : SessionValue) : String :=
  "v=" ++ toString session.version ++ "|kind=" ++ session.kind ++
    "|substrate=" ++ toString session.groups.substrate.bytes ++
    "|options=" ++ toString session.groups.options.bytes ++
    "|estate=" ++ toString session.groups.estate.bytes

/-- The three declared groups both sides of the carriage control fold. -/
def sharedGroups : SessionGroups where
  substrate := ⟨11⟩
  options := ⟨22⟩
  estate := ⟨33⟩

/-- The same three groups with exactly one field of exactly one group
    moved. -/
def mutatedGroups : SessionGroups where
  substrate := ⟨12⟩
  options := ⟨22⟩
  estate := ⟨33⟩

/-- A privileged client's mint site: it folded the greeting it received,
    over one transport, at its own lane position. -/
def clientSite (groups : SessionGroups) : MintSite where
  groups := groups
  posture := .privilegedClient
  transport := 1
  position := 41

/-- The daemon's mint site: it folded the options it started under plus
    the registration it observed, over a different transport, at a
    different lane position. -/
def daemonSite (groups : SessionGroups) : MintSite where
  groups := groups
  posture := .daemon
  transport := 2
  position := 97

/-- Kill the claim that a mutated group field could leave the bytes
    alone. The lawful row carries the two carriages over ONE triple of
    groups and they must agree; the mutant row moves one field of one
    group and the bytes must move with it. A model in which the fold read
    its carriage would break the first half; a model in which the fold
    dropped a group would break the second. -/
def showMutatedGroupControl : IO UInt32 := do
  let lawfulLeft := render (mint (clientSite sharedGroups))
  let lawfulRight := render (mint (daemonSite sharedGroups))
  let mutantLeft := render (mint (clientSite sharedGroups))
  let mutantRight := render (mint (daemonSite mutatedGroups))
  let refuted := lawfulLeft == lawfulRight && mutantLeft != mutantRight
  IO.println
    ("control=mutated-group-moves-bytes;vector=one-substrate-field-moved" ++
      ";lawful-left=" ++ lawfulLeft ++ ";lawful-right=" ++ lawfulRight ++
      ";mutant-left=" ++ mutantLeft ++ ";mutant-right=" ++ mutantRight ++
      ";verdict=" ++ (if refuted then "refuted" else "survived"))
  return if refuted then 0 else 1

/-- Whether a machine carries a row for every state and every symbol. -/
def machineIsTotal (candidate : Machine) : Bool :=
  states.all fun state =>
    alphabet.all fun event => (stepOf candidate state event).isSome

/-- Render a step for the record, naming the absent row rather than
    hiding it behind a fallback. -/
def renderStep (candidate : Machine) (state : State) (event : Event) :
    String :=
  match stepOf candidate state event with
  | none => "absent"
  | some landing => toString (repr landing)

/-- Render a walk for the record. -/
def renderRun (candidate : Machine) (start : State) (trace : List Event) :
    String :=
  match run candidate start trace with
  | none => "absent"
  | some landing => toString (repr landing)

/-- Kill a machine that is missing a symbol. Totality is a property of
    the shipped table, and a table one row short must be caught. -/
def showTotalityControl : IO UInt32 := do
  let lawful := machineIsTotal machine
  let mutant := machineIsTotal machineMissingSymbol
  let refuted := lawful && !mutant
  IO.println
    ("control=machine-totality;symbol=forceReconnect-at-established" ++
      ";lawful-total=" ++ toString lawful ++
      ";lawful-rows=" ++ toString machine.length ++
      ";mutant-total=" ++ toString mutant ++
      ";mutant-rows=" ++ toString machineMissingSymbol.length ++
      ";mutant-step=" ++
        renderStep machineMissingSymbol State.established Event.forceReconnect ++
      ";verdict=" ++ (if refuted then "refuted" else "survived"))
  return if refuted then 0 else 1

/-- Kill a machine that promotes a reading to a state change. The
    transcribed table places the error event as an observation; a machine
    that moves the connection on it has named a state the vocabulary does
    not carry. -/
def showReadingPromotedControl : IO UInt32 := do
  let lawful := renderStep machine State.reconnecting Event.error
  let mutant := renderStep machinePromotingReading State.reconnecting Event.error
  let held := stepOf machine State.reconnecting Event.error == some State.reconnecting
  let moved :=
    stepOf machinePromotingReading State.reconnecting Event.error !=
      some State.reconnecting
  let refuted := held && moved
  IO.println
    ("control=reading-promoted-to-state;reading=error" ++
      ";placement=" ++ (Event.error).placement.wire ++
      ";lawful=" ++ lawful ++ ";mutant=" ++ mutant ++
      ";verdict=" ++ (if refuted then "refuted" else "survived"))
  return if refuted then 0 else 1

/-- Kill a machine that conflates the drain path with the close path. In
    the lawful machine the lame-duck disposition lands in a state of its
    own and the connection then closes; in the mutant the disposition
    lands straight in the terminal, so draining and closing stop being
    two paths. Both machines must still REACH the terminal, or the
    control would be killing reachability instead. -/
def showDrainConflationControl : IO UInt32 := do
  let lawfulDrainStep := stepOf machine State.established Event.ldm
  let mutantDrainStep := stepOf machineConflatingDrain State.established Event.ldm
  let lawfulDistinct := lawfulDrainStep != some terminal
  let mutantDistinct := mutantDrainStep != some terminal
  let lawfulReaches := run machine State.established drainTrace == some terminal
  let mutantReaches :=
    run machineConflatingDrain State.established drainTrace == some terminal
  let refuted := lawfulDistinct && lawfulReaches && mutantReaches && !mutantDistinct
  IO.println
    ("control=drain-close-conflated;paths=ldm-then-close-versus-close" ++
      ";lawful-drain-step=" ++
        renderStep machine State.established Event.ldm ++
      ";lawful-drain-end=" ++ renderRun machine State.established drainTrace ++
      ";lawful-close-end=" ++ renderRun machine State.established closeTrace ++
      ";mutant-drain-step=" ++
        renderStep machineConflatingDrain State.established Event.ldm ++
      ";mutant-drain-end=" ++
        renderRun machineConflatingDrain State.established drainTrace ++
      ";verdict=" ++ (if refuted then "refuted" else "survived"))
  return if refuted then 0 else 1

/-- The register after the first run over the sample store lands. -/
def afterFirst : Option Register :=
  stepRegister initialRegister (.land firstIncarnation (fenceAt 0))

/-- Render a register's chain for the record. -/
def renderChain : Option Register -> String
  | none => "refused"
  | some register =>
      "[" ++ String.intercalate ","
        (register.chain.map fun entry =>
          toString entry.name ++ "<-" ++
            (match entry.predecessor with
             | none => "none"
             | some predecessor => toString predecessor)) ++ "]"

/-- Render the landed-current names for one store directory. -/
def renderCurrents (store : Store) : Option Register -> String
  | none => "refused"
  | some register =>
      "[" ++ String.intercalate ","
        ((currentsAt register store).map toString) ++ "]"

/-- Whether a register's chain carries a run that names itself. -/
def carriesSelfCycle : Option Register -> Bool
  | none => false
  | some register => register.chain.any namesItself

/-- Kill a register that lets a run name itself as its predecessor. The
    lawful step refuses the landing outright; the mutant, which drops the
    successor discipline and keeps everything else, admits it and leaves
    a one-step cycle standing in the chain. -/
def showChainCycleControl : IO UInt32 := do
  match afterFirst with
  | none => do
      IO.println "control=chain-cycle;setup=absent;verdict=survived"
      return 1
  | some seeded => do
      let lawful := stepRegister seeded (.land selfPredecessor (fenceAt 1))
      let mutant := stepCyclic seeded (.land selfPredecessor (fenceAt 1))
      let refuted := lawful.isNone && mutant.isSome && carriesSelfCycle mutant
      IO.println
        ("control=chain-cycle;candidate=run-naming-itself" ++
          ";seeded-chain=" ++ renderChain (some seeded) ++
          ";lawful=" ++ renderChain lawful ++
          ";mutant=" ++ renderChain mutant ++
          ";mutant-self-cycle=" ++ toString (carriesSelfCycle mutant) ++
          ";verdict=" ++ (if refuted then "refuted" else "survived"))
      return if refuted then 0 else 1

/-- Kill a register that lands a successor without retiring the
    incumbent. The lawful landing replaces the store directory's current
    binding in the one fenced act; the mutant appends beside it and two
    incarnations stand current for one store. -/
def showTwoCurrentControl : IO UInt32 := do
  match afterFirst with
  | none => do
      IO.println "control=two-landed-current;setup=absent;verdict=survived"
      return 1
  | some seeded => do
      let lawful := stepRegister seeded (.land secondIncarnation (fenceAt 1))
      let mutant := stepUnfenced seeded (.land secondIncarnation (fenceAt 1))
      let lawfulCount :=
        match lawful with
        | none => 0
        | some register => (currentsAt register sampleStore).length
      let mutantCount :=
        match mutant with
        | none => 0
        | some register => (currentsAt register sampleStore).length
      let refuted := lawfulCount == 1 && mutantCount == 2
      IO.println
        ("control=two-landed-current;candidate=successor-over-one-store" ++
          ";lawful-currents=" ++ renderCurrents sampleStore lawful ++
          ";lawful-count=" ++ toString lawfulCount ++
          ";mutant-currents=" ++ renderCurrents sampleStore mutant ++
          ";mutant-count=" ++ toString mutantCount ++
          ";verdict=" ++ (if refuted then "refuted" else "survived"))
      return if refuted then 0 else 1

def main (args : List String) : IO UInt32 := do
  match args with
  | ["mutated-group-moves-bytes"] => showMutatedGroupControl
  | ["machine-totality"] => showTotalityControl
  | ["reading-promoted-to-state"] => showReadingPromotedControl
  | ["drain-close-conflated"] => showDrainConflationControl
  | ["chain-cycle"] => showChainCycleControl
  | ["two-landed-current"] => showTwoCurrentControl
  | _ =>
      (← IO.getStderr).putStrLn
        "usage: control (mutated-group-moves-bytes|machine-totality|reading-promoted-to-state|drain-close-conflated|chain-cycle|two-landed-current)"
      return 2
