/-
The program declaration carrier: the meta DAG language's value shape,
its erasure to kernel program nodes, and its canonical encoding.

A program declaration is a DAG of named generator applications written
down as ONE canonical value. Local names live inside that value;
everything outside it is named by a digest that must resolve. The
carrier below models exactly that shape:

  * `nodes` — newest first, the house ledger orientation, matching the
    orientation `Kernel.ProgramAdmission` reads;
  * `edges` — one row per consumption, from the consuming (younger)
    node to the consumed (older) one, so the graph is explicit data
    rather than something a reader has to rebuild;
  * `holes` — the program's declared parameters, each with the digest
    of the schema it is typed by, ascending by name;
  * `lineage` — the ancestry of the declaration, as identity labels.

Identities are labels here, as everywhere in the model: a digest is a
natural, and the runtime's hasher stays the trusted base. Nothing in
this module runs a program, compiles one, or claims anything about an
execution. A declaration is a value; building one and publishing one
are different acts, and only the first is modelled.

## The erasure, and what it costs

`Kernel.ProgramNode` carries a generator, a list of raw arguments, and
the names it consumes. The declaration carries arguments keyed by the
generator's own field names and marks a consumption inside the
argument itself. The erasure splits that: an argument naming a local
node becomes a use, every other argument becomes a raw argument, and
the field keys drop away. Two consequences are laws rather than
comments — the edge list is exactly the erasure's uses, and the
erasure of every committed vector is a program kernel admission
accepts.

## One reconciliation, stated where a reader will find it

The freeze that governs this group enumerates three argument
references — a digest, a local name, a literal — and separately
requires a committed vector demonstrating a program and its filled
twin. Those two requirements cannot both hold: with no way to name a
hole from inside an argument, the kernel's fill machinery has nothing
to substitute and the filled twin is the same program under a
different name. The carrier therefore admits a fourth reference, a
hole by name, which is what `Kernel.RawArg.hole` already is on the
erased side. It is spelled `{"arg":"hole","name":<nat>}`, it erases to
`Kernel.RawArg.hole`, and it is the only place this module departs
from the freeze's letter in order to keep the freeze's demand.
-/
import Unity.Canon
import Kernel.Definitions

namespace Unity.Program

/-! ## The carrier -/

/-- One argument reference. A digest names something outside the
    declaration and carries the kind it is branded by; a local name
    consumes an older node of this same declaration; a literal is an
    identity label written in place; a hole is one of the
    declaration's declared parameters, unfilled. -/
inductive ArgRef where
  | digest (kind : Kernel.DeclKind) (id : Nat)
  | localRef (name : Nat)
  | literal (value : Nat)
  | hole (name : Nat)
deriving Repr, DecidableEq

/-- One argument of a node: the generator's own field name, and what
    that field is bound to. -/
structure NamedArg where
  name : String
  ref : ArgRef
deriving Repr, DecidableEq

/-- One node: its declaration-local name, the generator it applies,
    and its arguments in the canonical order of their field names. -/
structure Node where
  name : Nat
  generator : Kernel.GenTag
  args : List NamedArg
deriving Repr, DecidableEq

/-- One consumption edge: the younger node that consumes, the older
    node it consumes. -/
structure Edge where
  source : Nat
  target : Nat
deriving Repr, DecidableEq

/-- One declared parameter: its name, and the digest of the schema it
    is typed by. -/
structure Hole where
  name : Nat
  schema : Nat
deriving Repr, DecidableEq

/-- A program declaration. -/
structure Declaration where
  nodes : List Node
  edges : List Edge
  holes : List Hole
  lineage : List Nat
deriving Repr, DecidableEq

/-! ## Wire spellings

The kind and generator names the interchange writes. Both tables are
pinned against the Lean environment by the conformance checker — the
declaration kinds against `DeclKind`'s constructors, the generator
tags against `GenTag`'s and against `Act`'s — so a renamed
constructor reddens the gate instead of quietly emitting a stale
spelling. -/

/-- The wire name of a declaration kind. -/
def kindName : Kernel.DeclKind -> String
  | .schema => "schema"
  | .program => "program"
  | .policy => "policy"
  | .capability => "capability"
  | .lane => "lane"
  | .algebra => "algebra"
  | .index => "index"
  | .resource => "resource"
  | .ontology => "ontology"
  | .schedule => "schedule"
  | .template => "template"
  | .language => "language"

/-- The declaration kind a wire name denotes. -/
def kindOfName (text : String) : Option Kernel.DeclKind :=
  if text == "schema" then some .schema
  else if text == "program" then some .program
  else if text == "policy" then some .policy
  else if text == "capability" then some .capability
  else if text == "lane" then some .lane
  else if text == "algebra" then some .algebra
  else if text == "index" then some .index
  else if text == "resource" then some .resource
  else if text == "ontology" then some .ontology
  else if text == "schedule" then some .schedule
  else if text == "template" then some .template
  else if text == "language" then some .language
  else none

/-- The wire name of a generator. -/
def generatorName : Kernel.GenTag -> String
  | .declare => "declare"
  | .resolve => "resolve"
  | .emit => "emit"
  | .join => "join"
  | .fold => "fold"
  | .decide => "decide"
  | .trigger => "trigger"
  | .spawn => "spawn"

/-- The generator a wire name denotes. -/
def generatorOfName (text : String) : Option Kernel.GenTag :=
  if text == "declare" then some .declare
  else if text == "resolve" then some .resolve
  else if text == "emit" then some .emit
  else if text == "join" then some .join
  else if text == "fold" then some .fold
  else if text == "decide" then some .decide
  else if text == "trigger" then some .trigger
  else if text == "spawn" then some .spawn
  else none

/-- The eight generators in declaration order. -/
def generators : List Kernel.GenTag :=
  [.declare, .resolve, .emit, .join, .fold, .decide, .trigger, .spawn]

/-- The eight generator spellings, in declaration order. The checker
    compares this list with the environment's constructor names for
    both `GenTag` and `Act`. -/
def generatorNames : List String := generators.map generatorName

/-! ## Encoding

Members are written in the canonical order so that the value this
module builds is already the value the canonicalizer would produce;
the writer sorts regardless, and the both-ways law over the emitted
corpus is what checks that the two agree. -/

/-- One argument reference as a canonical value. -/
def argValue : ArgRef -> Canon.Value
  | .digest kind id =>
      .obj [("arg", .str "digest"), ("id", .num id),
        ("kind", .str (kindName kind))]
  | .localRef name => .obj [("arg", .str "local"), ("name", .num name)]
  | .literal value => .obj [("arg", .str "literal"), ("value", .num value)]
  | .hole name => .obj [("arg", .str "hole"), ("name", .num name)]

/-- A node's arguments as a canonical object keyed by field name. -/
def argsValue (args : List NamedArg) : Canon.Value :=
  .obj (args.map fun argument => (argument.name, argValue argument.ref))

/-- One node as a canonical value. -/
def nodeValue (node : Node) : Canon.Value :=
  .obj
    [ ("args", argsValue node.args)
    , ("generator", .str (generatorName node.generator))
    , ("name", .num node.name) ]

/-- One edge as a canonical value. -/
def edgeValue (edge : Edge) : Canon.Value :=
  .obj [("from", .num edge.source), ("to", .num edge.target)]

/-- One declared parameter as a canonical value. -/
def holeValue (hole : Hole) : Canon.Value :=
  .obj [("name", .num hole.name), ("schema", .num hole.schema)]

/-- A whole declaration as a canonical value. -/
def declarationValue (declaration : Declaration) : Canon.Value :=
  .obj
    [ ("edges", .arr (declaration.edges.map edgeValue))
    , ("holes", .arr (declaration.holes.map holeValue))
    , ("lineage", .arr (declaration.lineage.map Canon.Value.num))
    , ("nodes", .arr (declaration.nodes.map nodeValue)) ]

/-- A declaration's canonical bytes: its identity, as far as this
    model carries identity. -/
def declarationBytes (declaration : Declaration) : String :=
  Canon.render (declarationValue declaration)

/-! ## Decoding

The reader is total and answers with an option: a value that is not a
declaration is a finding to report, never a crash. Lookups are by key,
so the reader does not depend on member order and reads the encoder's
output and its canonicalization alike. -/

/-- Read one argument reference. -/
def readArg (value : Canon.Value) : Option ArgRef :=
  match Canon.stringAt value "arg" with
  | none => none
  | some tag =>
      if tag == "digest" then
        match Canon.natAt value "id", Canon.stringAt value "kind" with
        | some id, some text =>
            match kindOfName text with
            | some kind => some (.digest kind id)
            | none => none
        | _, _ => none
      else if tag == "local" then
        match Canon.natAt value "name" with
        | some name => some (.localRef name)
        | none => none
      else if tag == "literal" then
        match Canon.natAt value "value" with
        | some literal => some (.literal literal)
        | none => none
      else if tag == "hole" then
        match Canon.natAt value "name" with
        | some name => some (.hole name)
        | none => none
      else none

/-- Read the members of an arguments object. -/
def readNamedArgs : List (String × Canon.Value) -> Option (List NamedArg)
  | [] => some []
  | member :: rest =>
      match readArg member.2, readNamedArgs rest with
      | some ref, some arguments =>
          some ({ name := member.1, ref := ref } :: arguments)
      | _, _ => none

/-- Read an arguments object. -/
def readArgs : Canon.Value -> Option (List NamedArg)
  | .obj members => readNamedArgs members
  | _ => none

/-- Read one node. -/
def readNode (value : Canon.Value) : Option Node :=
  match Canon.member value "args", Canon.stringAt value "generator",
      Canon.natAt value "name" with
  | some arguments, some spelling, some name =>
      match readArgs arguments, generatorOfName spelling with
      | some args, some generator =>
          some { name := name, generator := generator, args := args }
      | _, _ => none
  | _, _, _ => none

/-- Read a node array. -/
def readNodes : List Canon.Value -> Option (List Node)
  | [] => some []
  | item :: rest =>
      match readNode item, readNodes rest with
      | some node, some nodes => some (node :: nodes)
      | _, _ => none

/-- Read one edge. -/
def readEdge (value : Canon.Value) : Option Edge :=
  match Canon.natAt value "from", Canon.natAt value "to" with
  | some source, some target => some { source := source, target := target }
  | _, _ => none

/-- Read an edge array. -/
def readEdges : List Canon.Value -> Option (List Edge)
  | [] => some []
  | item :: rest =>
      match readEdge item, readEdges rest with
      | some edge, some edges => some (edge :: edges)
      | _, _ => none

/-- Read one declared parameter. -/
def readHole (value : Canon.Value) : Option Hole :=
  match Canon.natAt value "name", Canon.natAt value "schema" with
  | some name, some schema => some { name := name, schema := schema }
  | _, _ => none

/-- Read a hole array. -/
def readHoles : List Canon.Value -> Option (List Hole)
  | [] => some []
  | item :: rest =>
      match readHole item, readHoles rest with
      | some hole, some holes => some (hole :: holes)
      | _, _ => none

/-- Read a lineage array. -/
def readLineage : List Canon.Value -> Option (List Nat)
  | [] => some []
  | item :: rest =>
      match Canon.asNat item, readLineage rest with
      | some identity, some lineage => some (identity :: lineage)
      | _, _ => none

/-- Read a whole declaration. -/
def readDeclaration (value : Canon.Value) : Option Declaration :=
  match Canon.member value "edges", Canon.member value "holes",
      Canon.member value "lineage", Canon.member value "nodes" with
  | some edgeItems, some holeItems, some lineageItems, some nodeItems =>
      match Canon.asItems edgeItems, Canon.asItems holeItems,
          Canon.asItems lineageItems, Canon.asItems nodeItems with
      | some edgeList, some holeList, some lineageList, some nodeList =>
          match readEdges edgeList, readHoles holeList,
              readLineage lineageList, readNodes nodeList with
          | some edges, some holes, some lineage, some nodes =>
              some
                { nodes := nodes
                , edges := edges
                , holes := holes
                , lineage := lineage }
          | _, _, _, _ => none
      | _, _, _, _ => none
  | _, _, _, _ => none

/-! ## Erasure -/

/-- The raw argument one reference erases to. A local name erases to
    no argument at all: it is a consumption, and consumptions live in
    the node's uses. -/
def eraseArg : ArgRef -> Option Kernel.RawArg
  | .digest kind id => some (.digestRef kind id)
  | .literal value => some (.literal value)
  | .hole name => some (.hole name)
  | .localRef _ => none

/-- The consumption one reference marks, if it marks one. -/
def useOf : ArgRef -> Option Nat
  | .localRef name => some name
  | _ => none

/-- The names one node consumes, in argument order. -/
def usesOf (node : Node) : List Nat :=
  node.args.filterMap fun argument => useOf argument.ref

/-- The kernel program node one declaration node erases to. -/
def eraseNode (node : Node) : Kernel.ProgramNode :=
  { name := node.name
  , generator := node.generator
  , args := node.args.filterMap fun argument => eraseArg argument.ref
  , uses := usesOf node }

/-- The kernel program a declaration erases to, newest first on both
    sides. -/
def erase (declaration : Declaration) : List Kernel.ProgramNode :=
  declaration.nodes.map eraseNode

/-! ## Edge consistency

The edge list is redundant by design: it states as data what the
arguments already imply. Redundancy is only safe when it is checked,
so the derivation is a function and the agreement is a law. -/

/-- The edges one node's arguments imply. -/
def nodeEdges (node : Node) : List Edge :=
  (usesOf node).map fun use => { source := node.name, target := use }

/-- The edges a declaration's arguments imply, in node order. -/
def consumptionEdges (declaration : Declaration) : List Edge :=
  declaration.nodes.flatMap nodeEdges

/-- The edges an erased program's uses imply — the same list, read off
    the kernel side. -/
def erasedEdges (nodes : List Kernel.ProgramNode) : List Edge :=
  nodes.flatMap fun node =>
    node.uses.map fun use => { source := node.name, target := use }

/-- Whether a declaration's committed edges are exactly its
    consumptions. -/
def edgesConsistent (declaration : Declaration) : Bool :=
  declaration.edges == consumptionEdges declaration

/-! ## Admission, decided

`Kernel.ProgramAdmission` is a proposition, and the emitter needs a
verdict it can compute. The decision procedure below is the emitter's
guard; its soundness is a rostered law, so a green emit is not merely
a green shell check. -/

/-- Whether every use names an already-admitted node. -/
def usesAdmitted (nodes : List Kernel.ProgramNode) (uses : List Nat) : Bool :=
  uses.all fun use => nodes.any fun prior => prior.name == use

/-- Whether a name is not already taken. -/
def freshName (nodes : List Kernel.ProgramNode) (name : Nat) : Bool :=
  nodes.all fun prior => !(prior.name == name)

/-- Whether a program satisfies node admission: reading newest first,
    every use names an older node and no name admits twice. -/
def admissible : List Kernel.ProgramNode -> Bool
  | [] => true
  | node :: nodes =>
      admissible nodes && usesAdmitted nodes node.uses &&
        freshName nodes node.name

/-- Whether the declared parameters ascend by name. -/
def holesAscend (holes : List Hole) : Bool :=
  (holes.zip (holes.drop 1)).all fun pair => pair.1.name < pair.2.name

/-- Every reason a declaration is not well formed, named. The order is
    the order a reader wants a failure reported in: the shape the
    arguments imply, then the kernel's verdict on the erasure, then
    the parameter order. -/
def wellFormedFailures (name : String) (declaration : Declaration) :
    List String :=
  (if edgesConsistent declaration then [] else
    [s!"program: vector {name} carries edges that are not the consumptions its arguments imply"]) ++
  (if admissible (erase declaration) then [] else
    [s!"program: vector {name} erases to a program node admission refuses"]) ++
  (if holesAscend declaration.holes then [] else
    [s!"program: vector {name} declares holes that do not ascend by name"])

/-! ## The committed vectors

Three shapes, four records. The first is the bridge's own planted
two-node program lifted, so the lift is checked against a value that
already carries proofs. The second is a program with one declared
parameter beside its filled twin, which is where the fill machinery
and the requirement channel become theorems about committed bytes
rather than statements about a general carrier. The third is the
ratified four-node sketch at ground identities: resolve, then decide,
then emit, then join.

Digest identity labels are chosen distinct from local node names
throughout, so a consumer that confused the two spaces would read a
different graph and fail the edge check rather than pass by
coincidence. -/

namespace Vectors

/-- The bridge's planted two-node program, lifted: an emit consuming a
    declare. Its arguments are exactly the consumption, so the
    erasure is the planted program on the nose. -/
def groundTwoNode : Declaration :=
  { nodes :=
      [ { name := 2, generator := .emit
        , args := [{ name := "body", ref := .localRef 1 }] }
      , { name := 1, generator := .declare, args := [] } ]
  , edges := [{ source := 2, target := 1 }]
  , holes := []
  , lineage := [] }

/-- The declared parameter the holey pair opens. -/
def holeName : Nat := 7

/-- The schema digest that parameter is typed by. -/
def holeSchema : Nat := 88

/-- The value the filled twin binds the parameter to. -/
def holeFill : Nat := 42

/-- The valuation that carries the holey program to its filled twin. -/
def holeValuation : Kernel.Valuation :=
  fun name => if name == holeName then some holeFill else none

/-- A one-parameter program: a declare whose value is the parameter,
    consumed by an emit. -/
def holey : Declaration :=
  { nodes :=
      [ { name := 2, generator := .emit
        , args :=
            [ { name := "body", ref := .localRef 1 }
            , { name := "lane", ref := .digest .lane 1 } ] }
      , { name := 1, generator := .declare
        , args :=
            [ { name := "value", ref := .hole holeName }
            , { name := "writ", ref := .digest .policy 4 } ] } ]
  , edges := [{ source := 2, target := 1 }]
  , holes := [{ name := holeName, schema := holeSchema }]
  , lineage := [] }

/-- The same program with its parameter filled: the hole becomes the
    literal, and the declaration opens no parameter. -/
def holeyFilled : Declaration :=
  { nodes :=
      [ { name := 2, generator := .emit
        , args :=
            [ { name := "body", ref := .localRef 1 }
            , { name := "lane", ref := .digest .lane 1 } ] }
      , { name := 1, generator := .declare
        , args :=
            [ { name := "value", ref := .literal holeFill }
            , { name := "writ", ref := .digest .policy 4 } ] } ]
  , edges := [{ source := 2, target := 1 }]
  , holes := []
  , lineage := [] }

/-- The ratified four-node sketch at ground identities, newest first:
    a join over an emit over a decide over a resolve. The lineage
    carries one ancestor label, so the field is exercised by a
    non-empty list somewhere in the corpus. -/
def distillShape : Declaration :=
  { nodes :=
      [ { name := 4, generator := .join
        , args :=
            [ { name := "cell", ref := .digest .resource 6 }
            , { name := "contribution", ref := .localRef 3 } ] }
      , { name := 3, generator := .emit
        , args :=
            [ { name := "body", ref := .localRef 2 }
            , { name := "lane", ref := .digest .lane 1 } ] }
      , { name := 2, generator := .decide
        , args :=
            [ { name := "outcome", ref := .localRef 1 }
            , { name := "register", ref := .digest .program 5 } ] }
      , { name := 1, generator := .resolve
        , args := [{ name := "target", ref := .digest .index 8 }] } ]
  , edges :=
      [ { source := 4, target := 3 }
      , { source := 3, target := 2 }
      , { source := 2, target := 1 } ]
  , holes := []
  , lineage := [9] }

end Vectors

/-- The committed program vectors, in emission order. -/
def vectors : List (String × Declaration) :=
  [ ("ground-two-node", Vectors.groundTwoNode)
  , ("holey", Vectors.holey)
  , ("holey-filled", Vectors.holeyFilled)
  , ("distill-shape", Vectors.distillShape) ]

/-- The committed vector names, in emission order. -/
def vectorNames : List String := vectors.map (·.1)

end Unity.Program
