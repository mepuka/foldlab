import Cas.Schema.Notation
import Cas.Vectors.Schema

/-!
# The MCP surface, as data — R9 and R11 made concrete

An MCP tool IS an operation: name, params, result — with the params
and result as CANONICAL SCHEMA CODES, so the manifest is a described,
versioned, language-neutral document (R11) generated from the
signatures, never hand-written per host. Any agent programs the store
both ways through this surface: as a CLIENT of `CasSig` (the tools
below), and as a HANDLER of `LlmSig` (the system calls the agent as an
operation; its answer enters only as recorded content — R15).

The node wire shape is REUSED from the conformance-vector wire format
(`Wire.VectorNode`'s described code) — one node document across
vectors, replay, and MCP; no second spelling.

The run tool carries the straight-line program document: instructions
whose references name EARLIER ANSWERS BY INDEX — the minimal
defunctionalized program (F3's first citizen), exactly the fragment
the program emitter already generates. The reply is the word.
-/

namespace Cas.Backend.Mcp

open Cas.Schema Cas.Schema.Notation

/-- One reference of a straight-line instruction: the expected kind
tag, and the index of the earlier instruction whose answer it names. -/
cas_struct RunRef where
  expectedTag : SafeInt
  source : SafeInt

/-- One straight-line instruction: a node document whose references
name earlier answers by index. -/
cas_struct RunInstruction where
  version : SafeInt
  tag : SafeInt
  payloadHex : String
  refs : List RunRef

/-- The run tool's params: a self-contained straight-line program. -/
cas_struct RunParams where
  instructions : List RunInstruction

/-- One answered binding. -/
cas_struct WordEntry where
  address : String

/-- The run tool's reply: the word, in admission order. -/
cas_struct RunResult where
  word : List WordEntry

/-- An MCP tool: an operation with described params and reply. -/
structure McpTool where
  name : String
  description : String
  params : Ast
  result : Ast

private def addressDoc : Ast := .struct [("address", false, .str)]

private def nodeDoc : Ast := Described.code (α := Cas.Vectors.Wire.VectorNode)

private def emptyDoc : Ast := .struct []

private def rootsDoc : Ast :=
  .struct [("roots", false, .arr .str)]

/-- The CAS tool table — `CasSig` and the root signature, projected. -/
def tools : List McpTool := [
  { name := "cas_put"
    description := "Admit one node; the reply is its content address. Admission is the only gate: well-formedness, reference presence, and kind agreement are checked, duplicates are inert, collisions refuse."
    params := nodeDoc
    result := addressDoc },
  { name := "cas_load"
    description := "Load the node at an address, fail-closed: the frame is parsed exactly and the kind is answered as stored."
    params := addressDoc
    result := nodeDoc },
  { name := "cas_run"
    description := "Run a straight-line program: instructions in admission order, references naming earlier answers by index. The reply is the word — the run's history, byte-decidable evidence."
    params := RunParams.schemaCode
    result := RunResult.schemaCode },
  { name := "cas_publish_root"
    description := "Publish an address as a root."
    params := addressDoc
    result := emptyDoc },
  { name := "cas_list_roots"
    description := "List the published roots."
    params := emptyDoc
    result := rootsDoc }
]

/-- The manifest revision — bumped only by ruling. -/
def manifestVersion : Nat := 0

private def toolJson (t : McpTool) : Cas.Json.Value :=
  .obj [
    ("name", .str t.name),
    ("description", .str t.description),
    ("params", t.params.toJson),
    ("result", t.result.toJson)]

/-- The manifest: the versioned, language-neutral interchange document
(R11). Params and results are canonical schema projections — the same
tagged form the schema plane byte-pins across runtimes. -/
def manifest : Cas.Json.Value :=
  .obj [
    ("manifestVersion", .nat manifestVersion),
    ("language", .str "cas"),
    ("schemaRevision", .nat schemaRevision),
    ("tools", .arr (tools.map toolJson))]

/-- The rendered manifest document (manifest layout, trailing newline
— the fixture form). -/
def document : String := Cas.Json.render manifest ++ "\n"

end Cas.Backend.Mcp
