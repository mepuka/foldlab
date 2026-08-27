/-!
# The obligation inventory

The plan's section-7 obligation ledger as typed data — the merge input the
ledger generator joins with the instance registry. Every row here mirrors
one plan row exactly; a new obligation enters the plan first, then this
inventory. SES-002, the reducer well-formedness obligation, was minted at
the M3 slice through exactly that route.
-/

namespace Effects.Conformance

/-- Where an obligation's evidence comes from, and when. -/
inductive Disposition where
  /-- A Lean schema-bundle instance of the named family, expected at the
  named milestone. -/
  | schema (family : String) (milestone : String)
  /-- Discharged by construction of the model carrier (for example,
  determinism of a total function), recorded at the named milestone. -/
  | carrier (milestone : String)
  /-- TypeScript-side evidence: typecheck, layer graph, integration
  fixtures. -/
  | tsSide (milestone : String)
  /-- Differential or conformance evidence across the manifest seam. -/
  | bridge (milestone : String)
  /-- A standing review rule; checked by reading, not by a theorem. -/
  | review
  /-- Deferred to a later extension milestone. -/
  | deferred (target : String)
  deriving Repr

/-- One obligation: its plan identifier, its plan statement (plain prose, no
markup), and its disposition. Instance sentences live on registry entries,
never here — the inventory carries statements, the instances carry the
ratified plain-meaning sentences. -/
structure Obligation where
  id : String
  statement : String
  disposition : Disposition
  deriving Repr

def inventory : List Obligation := [
  { id := "CAS-001"
    statement := "Project-owned canonical node encoding has one byte representation per admitted node."
    disposition := .schema "CODEC" "M2" },
  { id := "CAS-002"
    statement := "Graph admission rejects dangling or wrong-kind references."
    disposition := .schema "REJECTION-CLAUSE" "M2" },
  { id := "CAS-003"
    statement := "Every address law is assigned to hash Level 0 or carries an explicit Level-1 hInj premise; no theorem occupies Level 2."
    disposition := .review },
  { id := "RPL-001"
    statement := "Replay is deterministic for a fixed admitted state and request."
    disposition := .carrier "M3" },
  { id := "RPL-002"
    statement := "Replay-mode decision traces never select live delegation, and replay construction has no live-service requirement."
    disposition := .schema "TRACE-EXCLUDES" "M3" },
  { id := "RPL-003"
    statement := "Matching consumes exactly the permitted occurrence."
    disposition := .schema "EXACT-STEP" "M3" },
  { id := "RPL-004"
    statement := "Mismatch fails closed."
    disposition := .schema "FAIL-CLOSED" "M3" },
  { id := "RPL-005"
    statement := "Completion rejects unconsumed suffix entries; the rejection carries the program's terminal so far."
    disposition := .schema "FAIL-CLOSED" "M3" },
  { id := "SES-001"
    statement := "Record-mode append failure aborts the session through the transport seam; histories are truthful prefixes, never gapped subsequences."
    disposition := .schema "TRACE-EXCLUDES" "M3" },
  { id := "SES-002"
    statement := "Every reducer step preserves session-state well-formedness."
    disposition := .schema "WF-PRESERVE" "M3" },
  { id := "CMP-001"
    statement := "Sequential interpretation threads replay state compositionally across success and typed-failure outcomes."
    disposition := .schema "HOMOMORPHISM" "M5" },
  { id := "CMP-002"
    statement := "Identical requests remain separate occurrences."
    disposition := .schema "DISTINCTNESS" "M3" },
  { id := "CMP-003"
    statement := "Transparent and opaque policies have distinct, declared framed traces."
    disposition := .deferred "M7" },
  { id := "CTX-001"
    statement := "Wrapped service construction supplies the same caller-facing interface without recursive lookup."
    disposition := .tsSide "M4" },
  { id := "CTX-002"
    statement := "Conforming orchestration cannot consult default Clock/Random behavior; replay-mode tripwires surface ambient use as a Violated outcome."
    disposition := .tsSide "M4" },
  { id := "ADM-001"
    statement := "G2 traceability distinguishes reified Lean-program quantification from discipline-conforming TypeScript orchestration."
    disposition := .review },
  { id := "BRG-001"
    statement := "Model fixtures and the TypeScript reducer compare one declared normalized decision trace."
    disposition := .bridge "M3" },
  { id := "BRG-002"
    statement := "The pinned Effect integration agrees on the enumerated domain."
    disposition := .bridge "M6" },
  { id := "DUR-001"
    statement := "No exactly-once claim crosses the live-action/history-append crash gap."
    disposition := .review },
  { id := "PRJ-001"
    statement := "Value-descriptor identity is explicit and checked: kind tag and revision are declared, and reading verifies the expected root kind."
    disposition := .tsSide "E2" },
  { id := "PRJ-002"
    statement := "A value round-trips through its descriptor: get after put returns the declared domain canonicalization."
    disposition := .tsSide "E2" },
  { id := "PRJ-003"
    statement := "A payload failing the descriptor's schema is rejected with a typed projection error distinct from the CAS error family and the mismatch taxonomy."
    disposition := .tsSide "E2" },
  { id := "PRJ-004"
    statement := "Fixed-root hydration matches by-value construction: the layer builds the same caller-facing shape, construction errors stay on the layer, and method error unions never widen."
    disposition := .tsSide "E3" },
  { id := "PRJ-005"
    statement := "Hydrated record construction stays non-recursive and single-wrapped: layerAs targets the internal live role only, never resolves the public wrapper, and double wrapping stays rejected."
    disposition := .tsSide "E3" },
  { id := "PRJ-006"
    statement := "Equal roots imply no stronger value equality than the hash-hypothesis lattice permits."
    disposition := .review }
]

end Effects.Conformance
