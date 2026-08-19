/-
The run carrier: the model's own executions of the committed program
vectors, computed rather than described.

The kernel states a run as a walk parameterised by a COMPLETION — how a
node's declared arguments and its execution-time supplies become one
candidate sentence — and by a CARRIAGE GROWTH rule. Both are deliberately
left open there, because both belong to the carriage. This module is
where they are pinned for the interchange: the corpus cannot publish a
run without saying which completion produced it, or the rows would be a
verdict about nothing.

## What the completion is

The completion here is the carriage's, restated at model identities. For
one node it reads, in this order:

  * the generator's VALUE field, dataflow substituted — a consumed local
    becomes the identity label its producer landed;
  * the generator's REFERENCE fields, which name a digest, a landed
    local, or a literal label;
  * the run's SUPPLIES, bound by node name — the slots the declaration
    form deliberately cannot carry.

Nothing else. The four provenances a carriage has are three here, because
the fourth — a carriage's own binding replica — is exactly what the model
has no counterpart for, and the one slot that needs it is recorded below
as a supply rather than invented into the declaration.

## What a run row cannot be

`Kernel.RunOutcome` has two arms because `Kernel.Completion` is TOTAL: a
completion always answers, so a walk either lands or meets a refusal at
the door. A carriage's completion does not always answer — a node whose
slot is unwired, unsupplied, or consumes a local that never landed
produces no candidate at all, so the door is never reached and there is
no door verdict to report. That third outcome is the carriage's, not the door's,
and it is spelled `unspeakable` here after the carriage's own name for
it. A run vector carrying that arm is a witness that a program the
admission relation accepts is not thereby executable.

Where the completion answers at every node, this walk is
`Kernel.runWalk` at the completion that maps each node name to the
candidate computed here, and the emitter checks exactly that against the
model's own walk before it prints a row.
-/
import Unity.Program

namespace Unity.Run

/-! ## The execution-time supplies

A supply is a candidate slot the declaration form carries no reference
for. The roster is the model's own: `declare`'s kind and `resolve`'s
kind are the generators' kind fields, `fold`'s anchor, `decide`'s token
and `trigger`'s predicate are the fields the declaration form leaves
absent, and `join`'s strategy is the one candidate slot the intrinsic
`Act` drops altogether — which is why it is carried here and not
derivable from any declaration. -/

/-- One execution-time supply, at the model's own sorts. -/
inductive Supply where
  | kind (declared : Kernel.DeclKind)
  | anchor (fact : Kernel.CandidateAnchor)
  | token (claim : Kernel.TokenClaim)
  | predicate (production : Kernel.CandidatePredicate)
  | strategy (merge : Kernel.MergeStrategy)
deriving Repr, DecidableEq

/-- The candidate slot a supply binds. The spellings are the model's own
    field names, which the checker pins against the environment. -/
def Supply.slot : Supply -> String
  | .kind _ => "kind"
  | .anchor _ => "anchor"
  | .token _ => "token"
  | .predicate _ => "predicate"
  | .strategy _ => "strategy"

/-- One supply, bound to the node it completes. -/
structure SupplyRow where
  node : Nat
  supply : Supply
deriving Repr, DecidableEq

/-- The supply bound at a node for a slot, if the run binds one. -/
def supplyAt (supplies : List SupplyRow) (node : Nat) (slot : String) :
    Option Supply :=
  (supplies.find? fun row => row.node == node && row.supply.slot == slot).map
    (·.supply)

/-- The declaration kind bound at a node. -/
def kindAt (supplies : List SupplyRow) (node : Nat) :
    Option Kernel.DeclKind :=
  match supplyAt supplies node "kind" with
  | some (.kind declared) => some declared
  | _ => none

/-- The resume coordinate bound at a node. -/
def anchorAt (supplies : List SupplyRow) (node : Nat) :
    Option Kernel.CandidateAnchor :=
  match supplyAt supplies node "anchor" with
  | some (.anchor fact) => some fact
  | _ => none

/-- The fencing claim bound at a node. -/
def tokenAt (supplies : List SupplyRow) (node : Nat) :
    Option Kernel.TokenClaim :=
  match supplyAt supplies node "token" with
  | some (.token claim) => some claim
  | _ => none

/-- The trigger production bound at a node. -/
def predicateAt (supplies : List SupplyRow) (node : Nat) :
    Option Kernel.CandidatePredicate :=
  match supplyAt supplies node "predicate" with
  | some (.predicate production) => some production
  | _ => none

/-- The merge strategy bound at a node. -/
def strategyAt (supplies : List SupplyRow) (node : Nat) :
    Option Kernel.MergeStrategy :=
  match supplyAt supplies node "strategy" with
  | some (.strategy merge) => some merge
  | _ => none

/-! ## The field tables

Which of a generator's fields is its value slot, and which are its
reference slots. Both tables are spellings, so both are pinned against
the environment's own account of `Kernel.Act` by the conformance
checker — every name below must be a field the model declares on the
constructor it names, and `strategy` must be a field of
`Kernel.CandidateAct.join` that `Kernel.Act.join` does not carry. -/

/-- The value-form field of each generator: the one argument the door
    sweeps as a payload. -/
def valueField : Kernel.GenTag -> Option String
  | .declare => some "value"
  | .resolve => none
  | .emit => some "body"
  | .join => some "contribution"
  | .fold => some "query"
  | .decide => some "outcome"
  | .trigger => none
  | .spawn => none

/-- The reference-form fields of each generator, in field order. -/
def referenceFields : Kernel.GenTag -> List String
  | .declare => ["writ"]
  | .resolve => ["target"]
  | .emit => ["lane"]
  | .join => ["cell"]
  | .fold => ["declared"]
  | .decide => ["register"]
  | .trigger => ["declaration"]
  | .spawn => ["parent", "request"]

/-- The supply slots each generator's completion reads. -/
def supplyFields : Kernel.GenTag -> List String
  | .declare => ["kind"]
  | .resolve => []
  | .emit => []
  | .join => ["strategy"]
  | .fold => ["anchor"]
  | .decide => ["token"]
  | .trigger => ["predicate"]
  | .spawn => []

/-! ## Completion -/

/-- What a run leaves behind at a node: the identity label a consumer
    reads, and the brand it carries where the sentence named one. -/
structure Landing where
  node : Nat
  label : Nat
  brand : Option Kernel.DeclKind
deriving Repr, DecidableEq

/-- The landing of a node, if it landed. -/
def landingAt (landings : List Landing) (node : Nat) : Option Landing :=
  landings.find? fun landing => landing.node == node

/-- Why a node could not be completed: which slot, and which of the four
    ways the slot had no value. `unwired` is a declaration that binds no
    reference for the slot, `unsupplied` a run that binds no supply,
    `unlanded` a consumption of a local that has not landed, and
    `unbranded` a reference whose sort the completion needs and the
    argument does not carry. -/
structure Gap where
  slot : String
  detail : String
deriving Repr, DecidableEq

/-- One completed argument. -/
inductive Completed where
  | atom (arg : Kernel.RawArg)
  | consumed (landing : Landing)
  | unlanded (name : Nat)

/-- One argument reference, with dataflow substituted. -/
def completeArg (landings : List Landing) : Program.ArgRef -> Completed
  | .digest kind id => .atom (.digestRef kind id)
  | .literal value => .atom (.literal value)
  | .hole name => .atom (.hole name)
  | .localRef name =>
      match landingAt landings name with
      | some landing => .consumed landing
      | none => .unlanded name

/-- The reference a node binds to a field, if it binds one. -/
def argAt (node : Program.Node) (field : String) : Option Program.ArgRef :=
  (node.args.find? fun argument => argument.name == field).map (·.ref)

/-- The value-form payload of one node. A value field the declaration
    leaves unwired contributes nothing rather than refusing: the payload
    is what the node actually wired, and an empty payload is a sentence
    the door judges like any other. -/
def payloadOf (node : Program.Node) (landings : List Landing) :
    Except Gap (List Kernel.RawArg) :=
  match valueField node.generator with
  | none => .ok []
  | some field =>
      match argAt node field with
      | none => .ok []
      | some reference =>
          match completeArg landings reference with
          | .atom arg => .ok [arg]
          | .consumed landing => .ok [.literal landing.label]
          | .unlanded _ => .error ⟨field, "unlanded"⟩

/-- One reference slot, completed to an identity label and its brand. -/
structure Reference where
  id : Nat
  brand : Option Kernel.DeclKind
deriving Repr, DecidableEq

/-- The reference a node wires into one slot. -/
def referenceAt (node : Program.Node) (field : String)
    (landings : List Landing) : Except Gap (Option Reference) :=
  match argAt node field with
  | none => .ok none
  | some reference =>
      match completeArg landings reference with
      | .unlanded _ => .error ⟨field, "unlanded"⟩
      | .consumed landing => .ok (some ⟨landing.label, landing.brand⟩)
      | .atom (.digestRef kind id) => .ok (some ⟨id, some kind⟩)
      | .atom (.literal value) => .ok (some ⟨value, none⟩)
      | .atom _ => .error ⟨field, "unbranded"⟩

/-- Completes one node to a candidate sentence, or names the slot that
    stopped it. The run's writ answers only for a declare that wires no
    authority of its own. -/
def completeNode (node : Program.Node) (supplies : List SupplyRow)
    (writ : Nat) (landings : List Landing) :
    Except Gap Kernel.CandidateAct := do
  let payload <- payloadOf node landings
  match node.generator with
  | .declare =>
      match kindAt supplies node.name with
      | none => .error ⟨"kind", "unsupplied"⟩
      | some declared =>
          let authority <- referenceAt node "writ" landings
          .ok (.declare declared payload ((authority.map (·.id)).getD writ))
  | .resolve =>
      let target <- referenceAt node "target" landings
      match target with
      | none => .error ⟨"target", "unwired"⟩
      | some reference =>
          match reference.brand with
          | none => .error ⟨"kind", "unbranded"⟩
          | some declared => .ok (.resolveDigest declared reference.id none)
  | .emit =>
      let lane <- referenceAt node "lane" landings
      match lane with
      | none => .error ⟨"lane", "unwired"⟩
      | some reference => .ok (.emit reference.id payload)
  | .join =>
      let cell <- referenceAt node "cell" landings
      match cell with
      | none => .error ⟨"cell", "unwired"⟩
      | some reference =>
          match strategyAt supplies node.name with
          | none => .error ⟨"strategy", "unsupplied"⟩
          | some merge => .ok (.join reference.id payload merge)
  | .fold =>
      let declared <- referenceAt node "declared" landings
      match declared with
      | none => .error ⟨"declared", "unwired"⟩
      | some reference =>
          .ok (.fold reference.id (anchorAt supplies node.name) payload)
  | .decide =>
      let register <- referenceAt node "register" landings
      match register with
      | none => .error ⟨"register", "unwired"⟩
      | some reference =>
          .ok (.decide reference.id (tokenAt supplies node.name) payload)
  | .trigger =>
      let declaration <- referenceAt node "declaration" landings
      match declaration with
      | none => .error ⟨"declaration", "unwired"⟩
      | some reference =>
          match predicateAt supplies node.name with
          | none => .error ⟨"predicate", "unsupplied"⟩
          | some production => .ok (.trigger production reference.id)
  | .spawn =>
      let parent <- referenceAt node "parent" landings
      let request <- referenceAt node "request" landings
      match parent, request with
      | none, _ => .error ⟨"parent", "unwired"⟩
      | _, none => .error ⟨"request", "unwired"⟩
      | some first, some second => .ok (.spawn first.id second.id)

/-! ## The walk -/

/-- What an admitted sentence leaves for the nodes after it: the identity
    label a consumer reads, and the brand where the sentence carries one.
    Every label below is the model's own — a declared value's bytes, a
    resolved target, a folded state — never a label this module mints. -/
def landingOf : Kernel.Act -> Option (Nat × Option Kernel.DeclKind)
  | .declare kind value _ => some (value.bytes, some kind)
  | .resolve kind target => some (target.id, some kind)
  | .emit _ body => some (body.bytes, none)
  | .join _ contribution => some (contribution.bytes, none)
  | .fold _ _ anchor _ => some (anchor.state.value, none)
  | .decide _ _ outcome => some (outcome.bytes, none)
  | .trigger _ _ => none
  | .spawn _ _ => none

/-- One judged node of a run, at the scale the interchange carries: the
    node, its generator, the candidate it completed to, and the payload
    the door swept. -/
structure Step where
  node : Nat
  generator : Kernel.GenTag
  candidate : Kernel.CandidateAct
  payload : List Kernel.RawArg
deriving Repr

/-- How one run ended. The first two arms are `Kernel.RunOutcome`'s; the
    third is the carriage's, and carries the node, the slot, and the way
    the slot had no value. -/
inductive Outcome where
  | landed (steps : List Step)
  | refused (node : Nat) (reason : Kernel.RefusalReason) (steps : List Step)
  | unspeakable (node : Nat) (generator : Kernel.GenTag) (gap : Gap)
      (steps : List Step)

/-- A whole run: how it ended, and every candidate it completed, judged
    or not. The judged list is what lets the emitter re-run the model's
    own walk at the same completion. -/
structure Trace where
  outcome : Outcome
  judged : List (Nat × Kernel.CandidateAct)

/-- The walk, in admission order. Judge the next node at the current
    context through the one door; carry an admitted sentence, record its
    step and its landing, and continue at the grown context; stop at the
    first refusal with the prefix intact, or at the first node the
    completion cannot speak. -/
def walk (supplies : List SupplyRow) (writ : Nat) :
    Kernel.Door -> List Landing -> List Step ->
    List (Nat × Kernel.CandidateAct) -> List Program.Node -> Trace
  | _, _, steps, judged, [] => ⟨.landed steps, judged⟩
  | door, landings, steps, judged, node :: rest =>
      match completeNode node supplies writ landings with
      | .error gap =>
          ⟨.unspeakable node.name node.generator gap steps, judged⟩
      | .ok candidate =>
          let judged := judged ++ [(node.name, candidate)]
          match Kernel.admit door candidate with
          | .refused refusal =>
              ⟨.refused node.name refusal.reason steps, judged⟩
          | .admitted act =>
              let step : Step :=
                { node := node.name
                , generator := node.generator
                , candidate := candidate
                , payload := Kernel.actArgs candidate }
              let landings :=
                match landingOf act with
                | some (label, brand) =>
                    landings ++ [⟨node.name, label, brand⟩]
                | none => landings
              walk supplies writ (Kernel.Planted.runCarry door act) landings
                (steps ++ [step]) judged rest

/-! ## The vectors

One run per shape the corpus's program vectors reach: the four-node
distill shape landed, the same shape one supply short, the filled twin
landed, its holey original refused at the door, and the ground two-node
program stopped by a slot no declaration of it carries.

Every door below is a value, emitted with its run, so a consumer can
reproduce the judgment without knowing anything this module knows. -/

/-- The referents the distill shape names, all admitted. -/
def distillDoor : Kernel.Door :=
  let catalog : List Kernel.Ref :=
    [ (.index, 8), (.program, 5), (.lane, 1), (.resource, 6)
    , (.algebra, 11), (.policy, 4) ]
  { catalog := catalog, pinned := catalog }

/-- The referents the holey pair names. -/
def holeyDoor : Kernel.Door :=
  let catalog : List Kernel.Ref := [(.lane, 1), (.policy, 4)]
  { catalog := catalog, pinned := catalog }

/-- The one referent the ground two-node program's run needs: the writ
    its declare acts under. -/
def groundDoor : Kernel.Door :=
  let catalog : List Kernel.Ref := [(.policy, 4)]
  { catalog := catalog, pinned := catalog }

/-- The policy every run below acts under. -/
def runWrit : Nat := 4

/-- The fencing claim the distill shape's decide is granted. -/
def distillToken : Kernel.TokenClaim := { register := 5, value := 1 }

/-- The merge algebra the distill shape's cell joins under. -/
def distillStrategy : Kernel.MergeStrategy := .declaredAlgebra 11

/-- One run vector: a name, the committed program it runs, the door it is
    judged at, the writ it acts under, and the supplies its completion
    read. -/
structure Vector where
  name : String
  program : String
  declaration : Program.Declaration
  door : Kernel.Door
  writ : Nat
  supplies : List SupplyRow

/-- The five run vectors, in emission order. -/
def vectors : List Vector :=
  [ { name := "distill-shape"
    , program := "distill-shape"
    , declaration := Program.Vectors.distillShape
    , door := distillDoor
    , writ := runWrit
    , supplies :=
        [ ⟨2, .token distillToken⟩, ⟨4, .strategy distillStrategy⟩ ] }
  , { name := "distill-shape-unfenced"
    , program := "distill-shape"
    , declaration := Program.Vectors.distillShape
    , door := distillDoor
    , writ := runWrit
    , supplies := [ ⟨4, .strategy distillStrategy⟩ ] }
  , { name := "holey-filled"
    , program := "holey-filled"
    , declaration := Program.Vectors.holeyFilled
    , door := holeyDoor
    , writ := runWrit
    , supplies := [ ⟨1, .kind .resource⟩ ] }
  , { name := "holey"
    , program := "holey"
    , declaration := Program.Vectors.holey
    , door := holeyDoor
    , writ := runWrit
    , supplies := [ ⟨1, .kind .resource⟩ ] }
  , { name := "ground-two-node"
    , program := "ground-two-node"
    , declaration := Program.Vectors.groundTwoNode
    , door := groundDoor
    , writ := runWrit
    , supplies := [ ⟨1, .kind .resource⟩ ] }
  ]

/-- The vector names, in emission order. -/
def vectorNames : List String := vectors.map (·.name)

/-- One vector's run. The declaration is newest first, so the walk reads
    it back into admission order — the same reading `Kernel.runProgram`
    performs. -/
def traceOf (vector : Vector) : Trace :=
  walk vector.supplies vector.writ vector.door [] [] []
    vector.declaration.nodes.reverse

/-! ## Rendering -/

/-- The wire name of a raw argument atom: the model's own constructor
    spelling, which the checker pins against the environment. -/
def argTag : Kernel.RawArg -> String
  | .digestRef _ _ => "digestRef"
  | .literal _ => "literal"
  | .hole _ => "hole"
  | .clockNow => "clockNow"
  | .randomSeed => "randomSeed"
  | .secretBytes _ => "secretBytes"
  | .mintedId _ => "mintedId"
  | .functionValue _ => "functionValue"

/-- The raw-argument constructor spellings, in declaration order. -/
def argTags : List String :=
  [ "digestRef", "literal", "hole", "clockNow", "randomSeed"
  , "secretBytes", "mintedId", "functionValue" ]

/-- One catalogued reference as a canonical value. -/
def refValue (reference : Kernel.Ref) : Canon.Value :=
  .obj [("id", .num reference.2), ("kind", .str (Program.kindName reference.1))]

/-- A door as a canonical value: the admitted catalog and the writ's
    pinned universe, both as reference rows. -/
def doorValue (door : Kernel.Door) : Canon.Value :=
  .obj
    [ ("catalog", .arr (door.catalog.map refValue))
    , ("pinned", .arr (door.pinned.map refValue)) ]

/-- A candidate trigger production as a canonical value. -/
def predicateValue : Kernel.CandidatePredicate -> Canon.Value
  | .evidenceAppears lane pattern =>
      .obj [("lane", .num lane), ("pattern", .num pattern),
        ("production", .str "evidenceAppears")]
  | .cellReaches cell threshold =>
      .obj [("cell", .num cell), ("production", .str "cellReaches"),
        ("threshold", .num threshold)]
  | .holeReaches hole stage =>
      .obj [("hole", .num hole), ("production", .str "holeReaches"),
        ("stage", .num stage)]
  | .outcomeLanded register =>
      .obj [("production", .str "outcomeLanded"), ("register", .num register)]
  | .headAdvancedPast lane shard position =>
      .obj [("lane", .num lane), ("position", .num position),
        ("production", .str "headAdvancedPast"), ("shard", .num shard)]
  | .onAbsence subject =>
      .obj [("production", .str "onAbsence"), ("subject", .num subject)]
  | .negation inner =>
      .obj [("inner", predicateValue inner), ("production", .str "negation")]
  | .deadline tick =>
      .obj [("production", .str "deadline"), ("tick", .num tick)]
  | .absentEverywhere cell =>
      .obj [("cell", .num cell), ("production", .str "absentEverywhere")]

/-- The value a supply binds, at the model's own field spellings. -/
def supplyValue : Supply -> Canon.Value
  | .kind declared => .str (Program.kindName declared)
  | .anchor fact =>
      .obj
        [ ("floor", .num fact.floor), ("foldId", .num fact.foldId)
        , ("head", .num fact.head), ("lane", .num fact.lane)
        , ("shard", .num fact.shard), ("state", .num fact.state) ]
  | .token claim =>
      .obj [("register", .num claim.register), ("value", .num claim.value)]
  | .predicate production => predicateValue production
  | .strategy (.declaredAlgebra algebra) =>
      .obj [("algebra", .num algebra), ("merge", .str "declaredAlgebra")]
  | .strategy (.lastWriterWins algebra) =>
      .obj [("algebra", .num algebra), ("merge", .str "lastWriterWins")]

/-- One supply row as a canonical value. -/
def supplyRowValue (row : SupplyRow) : Canon.Value :=
  .obj
    [ ("bound", supplyValue row.supply)
    , ("node", .num row.node)
    , ("slot", .str row.supply.slot) ]

/-- One judged step as a canonical value. The payload is carried as its
    atom tags: a run's identity labels are the model's, and a consumer at
    another identity scale can still check that the completion wired the
    same shapes in the same order. -/
def stepValue (step : Step) : Canon.Value :=
  .obj
    [ ("generator", .str (Program.generatorName step.generator))
    , ("node", .num step.node)
    , ("payload", .arr (step.payload.map fun arg => .str (argTag arg)))
    , ("verdict", .str "admitted") ]

/-- One outcome as a canonical value. -/
def outcomeValue : Outcome -> Canon.Value
  | .landed steps =>
      .obj [("outcome", .str "landed"), ("steps", .arr (steps.map stepValue))]
  | .refused node reason steps =>
      .obj
        [ ("node", .num node), ("outcome", .str "refused")
        , ("reason", .str reason.wire)
        , ("steps", .arr (steps.map stepValue)) ]
  | .unspeakable node generator gap steps =>
      .obj
        [ ("detail", .str gap.detail)
        , ("generator", .str (Program.generatorName generator))
        , ("node", .num node), ("outcome", .str "unspeakable")
        , ("slot", .str gap.slot)
        , ("steps", .arr (steps.map stepValue)) ]

/-- One run record: the vector, the door it was judged at, the supplies
    its completion read, the outcome, and the outcome's own canonical
    bytes — the same self-test the canon and program groups carry, so a
    consumer that computes an outcome and canonicalizes it has the answer
    beside the question. -/
def runValue (vector : Vector) : Canon.Value :=
  let outcome := outcomeValue (traceOf vector).outcome
  .obj
    [ ("record", .str "run")
    , ("name", .str vector.name)
    , ("program", .str vector.program)
    , ("context", doorValue vector.door)
    , ("writ", .num vector.writ)
    , ("supplies", .arr (vector.supplies.map supplyRowValue))
    , ("outcome", outcome)
    , ("bytes", .str (Canon.render outcome)) ]

/-- One run record at the canonical byte form. -/
def runRow (vector : Vector) : String := Canon.render (runValue vector)

/-! ## Reading a run back

The writers above have readers beside them for one reason: a run row is
a claim that can be RECOMPUTED. Given the door, the writ and the
supplies a row carries, and the declaration the corpus's own program
group publishes, the walk is a function — so a consumer, and the
conformance checker, can rebuild the outcome from the file's bytes
instead of trusting them. The readers are total and answer with an
option: a value that is not a run input is a finding to report, never a
crash. -/

/-- Read one catalogued reference. -/
def readRef (value : Canon.Value) : Option Kernel.Ref :=
  match Canon.natAt value "id", Canon.stringAt value "kind" with
  | some id, some spelling =>
      (Program.kindOfName spelling).map fun kind => (kind, id)
  | _, _ => none

/-- Read a reference array. -/
def readRefs : List Canon.Value -> Option (List Kernel.Ref)
  | [] => some []
  | item :: rest =>
      match readRef item, readRefs rest with
      | some reference, some references => some (reference :: references)
      | _, _ => none

/-- Read a door: the admitted catalog and the pinned universe. -/
def readDoor (value : Canon.Value) : Option Kernel.Door :=
  match Canon.member value "catalog", Canon.member value "pinned" with
  | some catalog, some pinned =>
      match Canon.asItems catalog, Canon.asItems pinned with
      | some catalogItems, some pinnedItems =>
          match readRefs catalogItems, readRefs pinnedItems with
          | some catalogRefs, some pinnedRefs =>
              some { catalog := catalogRefs, pinned := pinnedRefs }
          | _, _ => none
      | _, _ => none
  | _, _ => none

/-- Read one candidate trigger production. -/
def readPredicate : Canon.Value -> Option Kernel.CandidatePredicate
  | value =>
      match Canon.stringAt value "production" with
      | none => none
      | some production =>
          if production == "evidenceAppears" then
            match Canon.natAt value "lane", Canon.natAt value "pattern" with
            | some lane, some pattern => some (.evidenceAppears lane pattern)
            | _, _ => none
          else if production == "cellReaches" then
            match Canon.natAt value "cell", Canon.natAt value "threshold" with
            | some cell, some threshold => some (.cellReaches cell threshold)
            | _, _ => none
          else if production == "holeReaches" then
            match Canon.natAt value "hole", Canon.natAt value "stage" with
            | some hole, some stage => some (.holeReaches hole stage)
            | _, _ => none
          else if production == "outcomeLanded" then
            (Canon.natAt value "register").map (.outcomeLanded ·)
          else if production == "headAdvancedPast" then
            match Canon.natAt value "lane", Canon.natAt value "shard",
                Canon.natAt value "position" with
            | some lane, some shard, some position =>
                some (.headAdvancedPast lane shard position)
            | _, _, _ => none
          else if production == "onAbsence" then
            (Canon.natAt value "subject").map (.onAbsence ·)
          else if production == "deadline" then
            (Canon.natAt value "tick").map (.deadline ·)
          else if production == "absentEverywhere" then
            (Canon.natAt value "cell").map (.absentEverywhere ·)
          else none

/-- Read one supply row. The slot selects the shape, which is what makes
    the row readable without knowing which generator it completes. -/
def readSupplyRow (value : Canon.Value) : Option SupplyRow :=
  match Canon.natAt value "node", Canon.stringAt value "slot",
      Canon.member value "bound" with
  | some node, some slot, some bound =>
      if slot == "kind" then
        match Canon.asString bound with
        | some spelling =>
            (Program.kindOfName spelling).map fun kind => ⟨node, .kind kind⟩
        | none => none
      else if slot == "anchor" then
        match Canon.natAt bound "foldId", Canon.natAt bound "lane",
            Canon.natAt bound "shard", Canon.natAt bound "floor",
            Canon.natAt bound "state", Canon.natAt bound "head" with
        | some foldId, some lane, some shard, some floor, some state,
            some head =>
            some ⟨node, .anchor ⟨foldId, lane, shard, floor, state, head⟩⟩
        | _, _, _, _, _, _ => none
      else if slot == "token" then
        match Canon.natAt bound "register", Canon.natAt bound "value" with
        | some register, some value => some ⟨node, .token ⟨register, value⟩⟩
        | _, _ => none
      else if slot == "predicate" then
        (readPredicate bound).map fun production => ⟨node, .predicate production⟩
      else if slot == "strategy" then
        match Canon.natAt bound "algebra", Canon.stringAt bound "merge" with
        | some algebra, some merge =>
            if merge == "declaredAlgebra" then
              some ⟨node, .strategy (.declaredAlgebra algebra)⟩
            else if merge == "lastWriterWins" then
              some ⟨node, .strategy (.lastWriterWins algebra)⟩
            else none
        | _, _ => none
      else none
  | _, _, _ => none

/-- Read a supply array. -/
def readSupplyRows : List Canon.Value -> Option (List SupplyRow)
  | [] => some []
  | item :: rest =>
      match readSupplyRow item, readSupplyRows rest with
      | some row, some rows => some (row :: rows)
      | _, _ => none

/-- Recompute one run from inputs read back rather than remembered: the
    door and supplies out of the record, the declaration out of the
    corpus's own program group. This is the whole claim of a run row —
    that these inputs and the model's door produce exactly these bytes. -/
def recompute (door : Kernel.Door) (writ : Nat) (supplies : List SupplyRow)
    (declaration : Program.Declaration) : Canon.Value :=
  outcomeValue (walk supplies writ door [] [] [] declaration.nodes.reverse).outcome

/-! ## The model's own walk

The cross-check that keeps this module a restatement rather than a
second machine: for a vector whose completion answered at every node,
`Kernel.runProgram` at the completion "this node name completes to this
candidate" must reach the same outcome. The comparison is at the
projections a `Kernel.RunStep` exposes without a decidable equality —
the walked node names, the arm, and the refusing node and reason. -/

/-- The candidate a judged node completed to, or the planted lawful
    declaration where the trace judged no such node. The fallback is
    never reached for a gap-free vector, and a `Kernel.Completion` is
    total, so one has to be named. -/
def judgedCompletion (judged : List (Nat × Kernel.CandidateAct)) :
    Kernel.Completion :=
  fun _ node =>
    match judged.find? fun entry => entry.1 == node.name with
    | some entry => entry.2
    | none => Kernel.Planted.lawfulDeclare

/-- The arm and walked shape of one of this module's outcomes. -/
def outcomeShape : Outcome -> String
  | .landed steps => s!"landed:{steps.map (·.node)}"
  | .refused node reason steps =>
      s!"refused:{node}:{reason.wire}:{steps.map (·.node)}"
  | .unspeakable node _ gap steps =>
      s!"unspeakable:{node}:{gap.slot}:{steps.map (·.node)}"

/-- The arm and walked shape of one of the model's own outcomes. -/
def modelShape : Kernel.RunOutcome -> String
  | .landed _ steps => s!"landed:{steps.map (·.node)}"
  | .refused node refusal steps =>
      s!"refused:{node}:{refusal.reason.wire}:{steps.map (·.node)}"

/-- The model's own walk over one vector, at the completion this module
    computed. -/
def modelOutcome (vector : Vector) : Kernel.RunOutcome :=
  Kernel.runProgram (judgedCompletion (traceOf vector).judged)
    Kernel.Planted.runCarry vector.door (Program.erase vector.declaration)

/-- Whether a vector's completion answered at every node it reached. -/
def gapFree (vector : Vector) : Bool :=
  match (traceOf vector).outcome with
  | .unspeakable _ _ _ _ => false
  | _ => true

/-! ## Emit-time checks -/

/-- The committed program declaration a name denotes. -/
def declarationOf (name : String) : Option Program.Declaration :=
  (Program.vectors.find? fun entry => entry.1 == name).map (·.2)

/-- The outcome arms the group must exercise. A run group that only
    refused would satisfy every refusal statement and still be wrong, and
    one that only landed would never show the tail untouched, so the
    roster is required to carry all three. -/
def outcomeArms : List String :=
  ["landed", "refused", "unspeakable"]

/-- The arm one outcome takes. -/
def armOf : Outcome -> String
  | .landed _ => "landed"
  | .refused _ _ _ => "refused"
  | .unspeakable _ _ _ _ => "unspeakable"

/-- Every reason the emitter would refuse to print the run group: a
    vector naming a program the corpus does not carry, a vector carrying
    a declaration that is not that program's, a rendered row whose bytes
    are not its outcome's canonical form, a gap-free vector whose walk
    disagrees with the model's own, and an arm the group leaves
    unexercised. -/
def runFailures : List String :=
  vectors.flatMap (fun vector =>
    (match declarationOf vector.program with
     | none =>
         [s!"run: vector {vector.name} names the program {vector.program}, which the corpus does not carry"]
     | some declaration =>
         if declaration == vector.declaration then [] else
           [s!"run: vector {vector.name} carries a declaration that is not the committed {vector.program}"]) ++
    (match Canon.parse (runRow vector) with
     | .error reason => [s!"run: a run record does not parse: {reason}"]
     | .ok record =>
         match Canon.member record "outcome", Canon.stringAt record "bytes" with
         | some outcome, some bytes =>
             if Canon.render outcome == bytes then [] else
               [s!"run: vector {vector.name} carries bytes that are not its outcome's canonical form"]
         | _, _ => [s!"run: a run record is missing a field: {vector.name}"]) ++
    (if !gapFree vector then [] else
      if outcomeShape (traceOf vector).outcome == modelShape (modelOutcome vector)
        then [] else
        [s!"run: vector {vector.name} walks {outcomeShape (traceOf vector).outcome}; the model's own walk reaches {modelShape (modelOutcome vector)}"])) ++
  (let arms := vectors.map fun vector => armOf (traceOf vector).outcome
   outcomeArms.filterMap fun arm =>
     if arms.contains arm then none
     else some s!"run: the run group exercises no {arm} outcome")

/-- The run rows. -/
def runRows : List String := vectors.map runRow

end Unity.Run
