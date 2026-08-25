/-
Resolve vocabulary and the pinned statements for the M15 / M9 / NEG-2 proof seats.
Coordinator-pinned 2026-08-25 (statement-pin discipline, KICKOFF §10). This module is
FROZEN for the seat worktree: seats import it and prove the Obligation Props below in
their own modules (`E2/Faithful.lean`, `E2/Closure.lean`, `E2/Reject.lean`), never edit
this file. A statement that resists proof is a STOP-and-report, not a rewording.

`resolveSchema`/`resolveEntity` are STORE-MODEL §4's `resolve_k`: checked lookup, strip
version/kind, decode via the serializer's partial inverse. `refsOfPreimage` is the
refs-of-bytes reading M9 needs: a stored byte string parses as a well-formed pre-image
and yields the references of its body (for entities, the schema address heads the list —
`putE`'s own precondition). Spec authority: STORE-MODEL §3 (WF2), §4 (L-faithful), §6
(M9, M15, NEG-2). Per §3, store theorems quantify over reachable states; the fresh-put
faithfulness half needs no hypothesis at all and is stated separately.
-/
import E2.Core
import E2.Encode
import E2.Canon
import E2.Obligations
import E2.Model
import E2.Decode

namespace E2

/-- Strip the two-byte version/kind prefix, checking both bytes. -/
def stripPre (kind : UInt8) : Bytes → Option Bytes
  | v :: k :: body => if v = versionByte ∧ k = kind then some body else none
  | _ => none

/-- STORE-MODEL §4 `resolve_S`: checked lookup, strip, decode. -/
def resolveSchema (H : Bytes → Address) (σ : StoreMap) (d : Address) :
    Option SchemaCore :=
  match getChecked H σ d with
  | some b =>
    match stripPre kindSchema b with
    | some body => decodeSchema body
    | none => none
  | none => none

/-- STORE-MODEL §4 `resolve_E`: checked lookup, strip, split off the schema address,
    decode the value. -/
def resolveEntity (H : Bytes → Address) (σ : StoreMap) (d : Address) :
    Option (Address × Value) :=
  match getChecked H σ d with
  | some b =>
    match stripPre kindEntity b with
    | some body =>
      match decAddr body with
      | some (sAddr, rest) =>
        match decodeValue rest with
        | some v => some (sAddr, v)
        | none => none
      | none => none
    | none => none
  | none => none

/-- The references a stored pre-image carries, read back off the bytes (M9's subject).
    `none` means the bytes are not a well-formed pre-image of either kind. An entity's
    schema address heads its list. -/
def refsOfPreimage : Bytes → Option (List Address)
  | v :: k :: body =>
    if v = versionByte then
      if k = kindSchema then
        match decodeSchema body with
        | some s => some (refsS s)
        | none => none
      else if k = kindEntity then
        match decAddr body with
        | some (sAddr, rest) =>
          match decodeValue rest with
          | some w => some (sAddr :: refsV w)
          | none => none
        | none => none
      else none
    else none
  | _ => none

/-! ## Pinned statements — the seat ledger (Q10 discipline: statements only when their
    vocabulary exists; it exists now). -/

/-- M15, fresh half — no hypotheses: a put at a fresh address resolves to exactly the
    canonical representative. Seat: `E2/Faithful.lean`, `theorem M15_fresh`. -/
def ObligationM15_fresh : Prop :=
  ∀ (H : Bytes → Address) (σ : StoreMap) (s : SchemaCore),
    σ.find (addressS H s) = none →
    resolveSchema H (putSchema H σ s) (addressS H s) = some (canonS s)

/-- M15 — L-faithful for kind S: on reachable stores, under a collision-free `H` (the
    only place a hash hypothesis ever appears, and only as a hypothesis), resolve after
    put returns the canonical representative — what you get is what you put, up to
    exactly the declared equivalence. Seat: `theorem M15_faithful_schema`. -/
def ObligationM15_faithful_schema : Prop :=
  ∀ (H : Bytes → Address) (env : ConformsEnv),
    (∀ b₁ b₂, H b₁ = H b₂ → b₁ = b₂) →
    ∀ (σ : StoreMap) (s : SchemaCore), Reachable H env σ →
      resolveSchema H (putSchema H σ s) (addressS H s) = some (canonS s)

/-- M15 — L-faithful for kind E. Value canonicalization is currently the identity
    (`preimageE` embeds the value as given), so the faithful representative is the value
    itself. Flagged for design review in the dispatch record. Seat:
    `theorem M15_faithful_entity`. -/
def ObligationM15_faithful_entity : Prop :=
  ∀ (H : Bytes → Address) (env : ConformsEnv),
    (∀ b₁ b₂, H b₁ = H b₂ → b₁ = b₂) →
    ∀ (σ : StoreMap) (sAddr : Address) (v : Value), Reachable H env σ →
      resolveEntity H (putEntity H σ sAddr v) (H (preimageE sAddr v)) =
        some (sAddr, v)

/-- M9 — WF2 over stored bytes: on reachable stores, every stored byte string parses as
    a well-formed pre-image and every reference it carries resolves in the store.
    Seat: `E2/Closure.lean`, `theorem M9_wf2`. -/
def ObligationM9_wf2 : Prop :=
  ∀ (H : Bytes → Address) (env : ConformsEnv) (σ : StoreMap),
    Reachable H env σ →
    ∀ d b, σ.find d = some b →
      ∃ rs, refsOfPreimage b = some rs ∧ AllResolve σ rs

/-- NEG-2 — the dangling-reference exhibit: the singleton store holding one schema whose
    reference dangles is unreachable, for every hash and every environment. Raw maps are
    not the object of the theorems; `Reachable` is. Seat: `E2/Reject.lean`,
    `theorem NEG2_dangling_unreachable`. -/
def ObligationNEG2_dangling_unreachable : Prop :=
  ∀ (H : Bytes → Address) (env : ConformsEnv) (a₀ : Address),
    ¬ Reachable H env [(H (preimageS (.ref a₀)), preimageS (.ref a₀))]

end E2
