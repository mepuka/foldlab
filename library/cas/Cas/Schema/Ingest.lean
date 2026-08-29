import Cas.Schema.SelfCodec
import Cas.Values.Canonicalize

/-!
# The ingestion door — foreign spelling in, canonical code out

The acquisition loop applied to the schema plane: a foreign JSON value
(a hoovered carrier, a model-minted schema — any spelling) is
NORMALIZED by the key-sorting method (`canonValue`), strictly DECODED,
and GATED by the runtime well-formedness check (`Ast.wf`, the boolean
twin of `Ast.WF`). The door is total and every refusal is named; the
foreign spelling dies at the boundary and only substance survives.

The door speaks REVISION 1 — Effect's native persistent
`SchemaRepresentation` document, wrapped in the schema-node envelope.
That is the form the live plane emits (`Ast.envelope`,
`CanonicalSchema.payloadOf`), so `ingest` can ingest what the plane
actually writes. `ingestLegacy` keeps the retired revision-0 tagged
spelling readable for already-addressed nodes; it is a
read-compatibility arm, not the door.

Population through this door is coordination-free by construction:
`ingest` is pure, the answered code is canonical, and admission is
content-addressed — the same code from any spelling lands at the same
address, and duplicates are inert.

What is proved:

- `Ast.wf_iff` — the boolean gate decides exactly `Ast.WF`;
- `ingest_wf` — the door answers only well-formed codes;
- `ingest_envelope` — the canonical image is fixed: a well-formed
  code's own revision-1 envelope ingests to exactly that code's
  revision-1 normal form, and to the code itself when the code is
  `RepNormal` (`ingest_envelope'`). The normalizer is a no-op on the
  envelope because `envelope_canonical` says it is already canonically
  spelled — the exactness law needs no canonicality hypothesis;
- `ingestLegacy_wf` / `ingestLegacy_toJson` — the same two laws for
  the revision-0 arm, unchanged in substance.
-/

namespace Cas.Schema

open Cas.Json

/-- Why an ingested value was refused. -/
inductive IngestRefusal where
  /-- The normalized value is not a spelling of any code. -/
  | notASchema
  /-- A code, but it breaks the canonical-fields discipline. -/
  | illFormed
  /-- A schema-node envelope, but not revision 1. -/
  | wrongRevision
  /-- A revision-1 document carrying a non-empty `references` table.
  Refused rather than admitted: the table is unreachable from the Lean
  side today (no `Suspend`, no `Reference` constructor), so a code
  answered from one could not be re-emitted by the projection. -/
  | nonEmptyReferences
  deriving DecidableEq, Repr

/-- Boolean twin of the strict-order clause: every later field name is
above this one — the `Pairwise` shape verbatim, so the agreement proof
needs no transitivity. -/
def pairwiseNames : List (String × Bool × Ast) → Bool
  | [] => true
  | f :: fs => fs.all (fun g => decide (f.1 < g.1)) && pairwiseNames fs

mutual

/-- Boolean twin of `Ast.WF` — the runtime gate of the ingestion
door. -/
def Ast.wf : Ast → Bool
  | .arr a => a.wf
  | .struct fs => pairwiseNames fs && wfFields fs
  | _ => true

def wfFields : List (String × Bool × Ast) → Bool
  | [] => true
  | (_, _, a) :: fs => a.wf && wfFields fs

end

theorem pairwiseNames_iff : ∀ fs, pairwiseNames fs = true ↔
    List.Pairwise (fun a b : String × Bool × Ast => a.1 < b.1) fs
  | [] => by simp [pairwiseNames]
  | f :: fs => by
    simp [pairwiseNames, List.pairwise_cons, List.all_eq_true,
      pairwiseNames_iff fs]

mutual

/-- The gate decides exactly the canonical-fields discipline. -/
theorem Ast.wf_iff : ∀ (a : Ast), a.wf = true ↔ a.WF
  | .null => by simp [Ast.wf, Ast.WF]
  | .bool => by simp [Ast.wf, Ast.WF]
  | .int => by simp [Ast.wf, Ast.WF]
  | .str => by simp [Ast.wf, Ast.WF]
  | .lit _ => by simp [Ast.wf, Ast.WF]
  | .ref _ => by simp [Ast.wf, Ast.WF]
  | .arr a => by simp [Ast.wf, Ast.WF, Ast.wf_iff a]
  | .struct fs => by
    simp [Ast.wf, Ast.WF, pairwiseNames_iff fs, wfFields_iff fs]

theorem wfFields_iff : ∀ fs, wfFields fs = true ↔ WFFields fs
  | [] => by simp [wfFields, WFFields]
  | (_, _, a) :: fs => by
    simp [wfFields, WFFields, Ast.wf_iff a, wfFields_iff fs]

end

/-! ## The door — revision 1 -/

/-- The refusal namer: a pure diagnostic on the failure path, walking
only the envelope's shell. It never decides admission — that is
`Ast.ofEnvelope`'s job alone — so there is exactly one decoder behind
the door and the refusal name cannot disagree with it. -/
private def refusalOf : Json.Value → IngestRefusal
  | .obj [("revision", .nat r), ("value", d)] =>
    if r = schemaRevision then
      match d with
      | .obj [("references", .obj refs), ("representation", _)] =>
        if refs.isEmpty then .notASchema else .nonEmptyReferences
      | _ => .notASchema
    else .wrongRevision
  | _ => .notASchema

/-- THE door: normalize the spelling, strictly decode the revision-1
envelope, gate on the canonical-fields discipline. -/
def ingest (v : Json.Value) : Except IngestRefusal Ast :=
  match Ast.ofEnvelope (canonValue v) with
  | some a => if a.wf then .ok a else .error .illFormed
  | none => .error (refusalOf (canonValue v))

/-- Soundness: the door answers only well-formed codes. -/
theorem ingest_wf {v : Json.Value} {a : Ast}
    (h : ingest v = .ok a) : a.WF := by
  unfold ingest at h
  split at h
  · split at h
    · cases h
      next hw => exact (Ast.wf_iff _).mp hw
    · cases h
  · cases h

/-- Exactness on the canonical image: a well-formed code's own
revision-1 envelope ingests to that code's revision-1 normal form. The
normalizer is a no-op here — `envelope_canonical` says the envelope is
already canonically spelled — so no canonicality hypothesis is
needed. -/
theorem ingest_envelope {a : Ast} (ha : a.WF) :
    ingest a.envelope = .ok a.repNorm := by
  unfold ingest
  rw [canonValue_of_canonical _ (envelope_canonical a), ofEnvelope_envelope a]
  simp [(Ast.wf_iff _).mpr (Ast.repNorm_wf a ha)]

/-- Exactness on the nose, for the codes the revision-1 projection
distinguishes: the door is the identity on the canonical image, so the
quotient it computes agrees with the projection's round trip. -/
theorem ingest_envelope' {a : Ast} (ha : a.WF) (hn : a.RepNormal) :
    ingest a.envelope = .ok a := by
  rw [ingest_envelope ha, hn]

/-! ## The legacy arm — revision 0

The retired tagged projection (`Ast.toJson`), kept readable so
already-addressed revision-0 schema nodes can still be decoded. It is
NOT the door: it takes the bare tagged value, has no envelope, and
mints nothing new. -/

/-- The revision-0 read-compatibility arm: normalize the spelling,
decode the retired tagged projection, gate on the same discipline. -/
def ingestLegacy (v : Json.Value) : Except IngestRefusal Ast :=
  match Ast.ofJson (canonValue v) with
  | none => .error .notASchema
  | some a => if a.wf then .ok a else .error .illFormed

/-- Soundness of the legacy arm: it too answers only well-formed
codes. -/
theorem ingestLegacy_wf {v : Json.Value} {a : Ast}
    (h : ingestLegacy v = .ok a) : a.WF := by
  unfold ingestLegacy at h
  split at h
  · cases h
  · split at h
    · cases h
      next hw => exact (Ast.wf_iff _).mp hw
    · cases h

/-- The legacy arm's canonical image is fixed: a well-formed code's own
revision-0 spelling ingests to exactly itself. Revision 0 keeps a null
literal as a literal, so no normal form intervenes. -/
theorem ingestLegacy_toJson {a : Ast} (ha : a.WF) :
    ingestLegacy a.toJson = .ok a := by
  unfold ingestLegacy
  rw [canonValue_of_canonical _ (toJson_canonical a ha), ofJson_toJson]
  simp [(Ast.wf_iff a).mpr ha]

end Cas.Schema
