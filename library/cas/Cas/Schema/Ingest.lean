import Cas.Schema.SelfCodec
import Cas.Values.Canonicalize

/-!
# The ingestion door — foreign spelling in, canonical code out

The acquisition loop applied to the schema plane: a foreign JSON value
(a hoovered carrier, a model-minted schema — any spelling) is
NORMALIZED by the key-sorting method (`canonValue`), strictly DECODED
by the projection's decoder (`Ast.ofJson`), and GATED by the runtime
well-formedness check (`Ast.wf`, the boolean twin of `Ast.WF`). The
door is total and every refusal is named; the foreign spelling dies at
the boundary and only substance survives.

Population through this door is coordination-free by construction:
`ingest` is pure, the answered code is canonical, and admission is
content-addressed — the same code from any spelling lands at the same
address, and duplicates are inert.

What is proved:

- `Ast.wf_iff` — the boolean gate decides exactly `Ast.WF`;
- `ingest_wf` — the door answers only well-formed codes;
- `ingest_toJson` — a well-formed code's own spelling ingests to
  exactly itself, so the door is the identity on the canonical image
  and the quotient it computes agrees with the projection's round
  trip.
-/

namespace Cas.Schema

open Cas.Json

/-- Why an ingested value was refused. -/
inductive IngestRefusal where
  /-- The normalized value is not a spelling of any code. -/
  | notASchema
  /-- A code, but it breaks the canonical-fields discipline. -/
  | illFormed
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

/-- The door: normalize the spelling, decode strictly, gate on the
canonical-fields discipline. -/
def ingest (v : Json.Value) : Except IngestRefusal Ast :=
  match Ast.ofJson (canonValue v) with
  | none => .error .notASchema
  | some a => if a.wf then .ok a else .error .illFormed

/-- Soundness: the door answers only well-formed codes. -/
theorem ingest_wf {v : Json.Value} {a : Ast}
    (h : ingest v = .ok a) : a.WF := by
  unfold ingest at h
  split at h
  · cases h
  · split at h
    · cases h
      next hw => exact (Ast.wf_iff _).mp hw
    · cases h

/-- The canonical image is fixed: a well-formed code's own spelling
ingests to exactly itself. -/
theorem ingest_toJson {a : Ast} (ha : a.WF) :
    ingest a.toJson = .ok a := by
  unfold ingest
  rw [canonValue_of_canonical _ (toJson_canonical a ha), ofJson_toJson]
  simp [(Ast.wf_iff a).mpr ha]

end Cas.Schema
