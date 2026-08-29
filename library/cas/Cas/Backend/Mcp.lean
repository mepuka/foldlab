import Cas.Schema.Notation
import Cas.Vectors.Schema
import Cas.Lang.Defun
import Cas.Codec.Hex

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
defunctionalized program (F3's first citizen). The reply is the word.

The document is a PROJECTION, not a second program language. One
identity carries straight-line programs — `Cas.Lang.PProg`, the
defunctionalized table (`Cas/Lang/Defun.lean`) — and `RunParams` is a
strictly smaller SPELLING of part of it, converted by
`RunParams.toPProg` and given its meaning by `RunParams.run`, which is
`Cas.Lang.runP` and nothing else. Two things the document deliberately
cannot say, each pinned by a theorem below:

- a reference can only be an ANSWER INDEX, never a literal address
  (`RunRef.ofPRef_lit`);
- an instruction can only be a PUT, never a load
  (`RunInstruction.ofPLine_load`).

On the sub-fragment it does serve, the two spellings coincide exactly:
`toPProg_ofPProg` says a table the document can spell converts back to
that same table, so nothing is lost in the projection.

An earlier revision of this note claimed the document was "exactly the
fragment the program emitter already generates". That was wrong in its
load-bearing half and is corrected here. `Cas.Backend.EmitProg` lowers
a `Tree` straight to TypeScript statements over host variable NAMES; it
never builds a `PProg`, so there is no carrier shared with this
document and no theorem relating the two. What is true — and is prose,
not a theorem — is that the emitter emits only puts whose references
name earlier answers, so its output falls inside the same sub-fragment.
Making that a theorem means routing the emitter through `PProg`, which
is its own slice and is not taken here.
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

/-! ## The projection onto the one program carrier

Everything in this section is about IDENTITY, not about the manifest:
the manifest's bytes are fixed by `tools` below and are untouched by
what follows. -/

/-- A byte as a document number — the registry's own conversion
(`Cas.Vectors.safeOfUInt8`), not a second one. -/
private abbrev safeOfUInt8 : UInt8 → SafeInt := Cas.Vectors.safeOfUInt8

/-- An in-range index as a document number. -/
private def safeOfNat (i : Nat) (h : i ≤ maxSafeNat) : SafeInt :=
  ⟨Int.ofNat i, by simpa using h⟩

/-- The document's reference as an operand of the one carrier: an
expected kind tag and an ANSWER INDEX. `PIn.lit` — a literal address —
has no spelling here. -/
def RunRef.toPRef (r : RunRef) : UInt8 × Cas.Lang.PIn :=
  (UInt8.ofNat r.expectedTag.val.natAbs, .ans r.source.val.natAbs)

/-- One instruction as one code point of the one carrier. Partial only
in the payload: the document spells bytes as hex, and a string that is
not hex denotes nothing. -/
def RunInstruction.toPLine (i : RunInstruction) : Option Cas.Lang.PLine :=
  (Cas.bytesOfHexS i.payloadHex).map fun payload =>
    .put (UInt8.ofNat i.version.val.natAbs) (UInt8.ofNat i.tag.val.natAbs)
      payload (i.refs.map RunRef.toPRef)

/-- The instruction list as a code-point table. -/
def toPLines : List RunInstruction → Option Cas.Lang.PProg
  | [] => some []
  | i :: rest =>
    (i.toPLine).bind fun l => (toPLines rest).map fun ls => l :: ls

/-- THE conversion: the run tool's document IS a `Cas.Lang.PProg`,
spelled smaller. -/
def RunParams.toPProg (d : RunParams) : Option Cas.Lang.PProg :=
  toPLines d.instructions

/-- The run tool's MEANING, and its only one: convert to the carrier
and hand it to the carrier's direct interpreter. There is no second
semantics for this tool — `Cas.Lang.runP` agrees with the reference
handler (`runP_embed_agree`, and through it the R10 bridge
`run_interpretRef_agree`), so the word this tool replies with is the
word the semantics defines. -/
def RunParams.run (H : Bytes → Addr32) (d : RunParams) (w : Word) :
    Option (Cas.Lang.Status Cas.Lang.CasSig Addr32 × Word) :=
  d.toPProg.map fun p => Cas.Lang.runP H p w

/-- A code point's operand back as a document reference — defined
exactly on the sub-fragment the document serves. -/
def RunRef.ofPRef (r : UInt8 × Cas.Lang.PIn) : Option RunRef :=
  match r.2 with
  | .lit _ => none
  | .ans i =>
    if h : i ≤ maxSafeNat then some ⟨safeOfUInt8 r.1, safeOfNat i h⟩
    else none

/-- Operands back as document references. -/
def ofPRefs : List (UInt8 × Cas.Lang.PIn) → Option (List RunRef)
  | [] => some []
  | r :: rest =>
    (RunRef.ofPRef r).bind fun d => (ofPRefs rest).map fun ds => d :: ds

/-- A code point back as an instruction — defined exactly on the
sub-fragment. -/
def RunInstruction.ofPLine : Cas.Lang.PLine → Option RunInstruction
  | .put v t payload refs =>
    (ofPRefs refs).map fun rs =>
      ⟨safeOfUInt8 v, safeOfUInt8 t, Cas.hexS payload, rs⟩
  | .load _ => none

/-- A code-point table back as an instruction list. -/
def ofPLines : Cas.Lang.PProg → Option (List RunInstruction)
  | [] => some []
  | l :: rest =>
    (RunInstruction.ofPLine l).bind fun i =>
      (ofPLines rest).map fun is => i :: is

/-- A table back as a document. -/
def RunParams.ofPProg (p : Cas.Lang.PProg) : Option RunParams :=
  (ofPLines p).map RunParams.mk

/-- The first thing the document cannot say: a literal address. -/
theorem RunRef.ofPRef_lit (t : UInt8) (a : Addr32) :
    RunRef.ofPRef (t, .lit a) = none := rfl

/-- The second thing the document cannot say: a `load`. -/
theorem RunInstruction.ofPLine_load (src : Cas.Lang.PIn) :
    RunInstruction.ofPLine (.load src) = none := rfl

/-- A byte survives the trip through the document's number row. -/
private theorem ofNat_natAbs_safeOfUInt8 (b : UInt8) :
    UInt8.ofNat (safeOfUInt8 b).val.natAbs = b := by
  show UInt8.ofNat b.toNat = b
  have hb := b.toNat_lt
  apply UInt8.toNat_inj.mp
  simp only [UInt8.toNat_ofNat']
  omega

private theorem toPRef_ofPRef {r : UInt8 × Cas.Lang.PIn} {d : RunRef}
    (h : RunRef.ofPRef r = some d) : d.toPRef = r := by
  obtain ⟨t, src⟩ := r
  cases src with
  | lit a => exact absurd h (by simp [RunRef.ofPRef])
  | ans i =>
    by_cases hb : i ≤ maxSafeNat
    · simp only [RunRef.ofPRef, dif_pos hb, Option.some.injEq] at h
      subst h
      simp [RunRef.toPRef, safeOfNat, ofNat_natAbs_safeOfUInt8]
    · exact absurd h (by simp [RunRef.ofPRef, dif_neg hb])

private theorem toPRefs_ofPRefs :
    ∀ (refs : List (UInt8 × Cas.Lang.PIn)) (ds : List RunRef),
      ofPRefs refs = some ds → ds.map RunRef.toPRef = refs
  | [], ds, h => by simp only [ofPRefs, Option.some.injEq] at h; subst h; rfl
  | r :: rest, ds, h => by
    cases hd : RunRef.ofPRef r with
    | none => rw [ofPRefs, hd] at h; exact absurd h (by simp)
    | some d =>
      cases hs : ofPRefs rest with
      | none => rw [ofPRefs, hd, hs] at h; exact absurd h (by simp)
      | some ds' =>
        rw [ofPRefs, hd, hs] at h
        simp only [Option.bind_some, Option.map_some, Option.some.injEq] at h
        subst h
        simp only [List.map_cons, toPRef_ofPRef hd, toPRefs_ofPRefs rest ds' hs]

private theorem toPLine_ofPLine {l : Cas.Lang.PLine} {i : RunInstruction}
    (h : RunInstruction.ofPLine l = some i) : i.toPLine = some l := by
  cases l with
  | load src => exact absurd h (by rw [RunInstruction.ofPLine_load]; simp)
  | put v t payload refs =>
    cases hr : ofPRefs refs with
    | none => rw [RunInstruction.ofPLine, hr] at h; exact absurd h (by simp)
    | some ds =>
      rw [RunInstruction.ofPLine, hr] at h
      simp only [Option.map_some, Option.some.injEq] at h
      subst h
      simp [RunInstruction.toPLine, Cas.bytesOfHexS_hexS, ofNat_natAbs_safeOfUInt8,
        toPRefs_ofPRefs refs ds hr]

private theorem toPLines_ofPLines :
    ∀ (p : Cas.Lang.PProg) (is : List RunInstruction),
      ofPLines p = some is → toPLines is = some p
  | [], is, h => by simp only [ofPLines, Option.some.injEq] at h; subst h; rfl
  | l :: rest, is, h => by
    cases hi : RunInstruction.ofPLine l with
    | none => rw [ofPLines, hi] at h; exact absurd h (by simp)
    | some i =>
      cases hs : ofPLines rest with
      | none => rw [ofPLines, hi, hs] at h; exact absurd h (by simp)
      | some is' =>
        rw [ofPLines, hi, hs] at h
        simp only [Option.bind_some, Option.map_some, Option.some.injEq] at h
        subst h
        simp only [toPLines, toPLine_ofPLine hi, toPLines_ofPLines rest is' hs,
          Option.bind_some, Option.map_some]

/-- THE AGREEMENT: on the sub-fragment the document can spell, the two
spellings coincide. A `Cas.Lang.PProg` that this document represents at
all converts back to exactly that table — the projection loses nothing
on its own image, so `RunParams` adds a spelling and not an identity. -/
theorem toPProg_ofPProg {p : Cas.Lang.PProg} {d : RunParams}
    (h : RunParams.ofPProg p = some d) : d.toPProg = some p := by
  cases hs : ofPLines p with
  | none => rw [RunParams.ofPProg, hs] at h; exact absurd h (by simp)
  | some is =>
    rw [RunParams.ofPProg, hs] at h
    simp only [Option.map_some, Option.some.injEq] at h
    subst h
    exact toPLines_ofPLines p is hs

/-- The meaning transfers with the spelling: a table the document can
spell is RUN by the document exactly as the carrier runs it. -/
theorem run_ofPProg (H : Bytes → Addr32) {p : Cas.Lang.PProg}
    {d : RunParams} (h : RunParams.ofPProg p = some d) (w : Word) :
    d.run H w = some (Cas.Lang.runP H p w) := by
  simp [RunParams.run, toPProg_ofPProg h]

/-! ### The projection, executed

`toPProg_ofPProg` is the law; these are the witnesses that it is not
vacuous — a real two-line table in the served fragment, and the two
carrier shapes the document has no spelling for. -/

/-- A two-line table inside the sub-fragment: a value node, then a tree
node referencing the first line's answer. -/
private def sampleTable : Cas.Lang.PProg :=
  [ .put 0 1 [0xAB, 0xCD] [],
    .put 0 9 [] [(1, .ans 0)] ]

#guard (RunParams.ofPProg sampleTable).bind RunParams.toPProg
  = some sampleTable

#guard (RunParams.ofPProg [Cas.Lang.PLine.load (.ans 0)]).isNone

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
