/-
The store model per STORE-MODEL.md (ratified 2026-08-25, joints A/B/C closed).
Statements-first: cheap theorems proved inline (M8 WF1, M12 dedup, M13 frame, M14 half);
real seats stated as Props (M11, M18); statements owed pending decode are listed in the
OWED block — added by amendment per Q10, never as vacuous placeholders.

AMENDED 2026-08-25 (A-1, ratified under Q10): joint B now collects address-valued
entity references through `refsV`; `Reachable.putE` requires those references to
resolve. `SchemaCore.address` is the working nullary address-type label, and
`Conforms.addr` types every `Value.vaddr` without an existence premise.
-/
import E2.Core
import E2.Encode
import E2.Canon
import E2.Obligations

namespace E2

/-! ## refs on carriers (joint B). Schema refs collect `.ref` leaves; value refs
    collect `.vaddr` leaves; address-type schema nodes and checks carry none. -/

mutual
def refsS : SchemaCore → List Address
  | .prim _ => []
  | .lit _ => []
  | .address => []
  | .object fs => refsF fs
  | .tuple es => refsL es
  | .array e => refsS e
  | .union _ ms => refsL ms
  | .refine s _ => refsS s
  | .ref a => [a]
  | .var _ => []
  | .mu _ b => refsS b
  termination_by structural x => x

def refsF : FieldList → List Address
  | .nil => []
  | .cons _ v _ rest => refsS v ++ refsF rest
  termination_by structural x => x

def refsL : SchemaList → List Address
  | .nil => []
  | .cons hd tl => refsS hd ++ refsL tl
  termination_by structural x => x
end

mutual
def refsV : Value → List Address
  | .vnull => []
  | .vbool _ => []
  | .vint _ => []
  | .vstr _ => []
  | .vaddr a => [a]
  | .varr vs => refsVL vs
  | .vobj fs => refsVF fs
  termination_by structural x => x

def refsVL : ValueList → List Address
  | .nil => []
  | .cons hd tl => refsV hd ++ refsVL tl
  termination_by structural x => x

def refsVF : ValueFields → List Address
  | .nil => []
  | .cons _ v rest => refsV v ++ refsVF rest
  termination_by structural x => x
end

/-! ## Schema well-formedness: closed and guarded (STORE-MODEL §5; the checks-allowlist
    clause is deferred to ruling R-4 and enters by amendment per Q10). -/

mutual
def closedB (k : Nat) : SchemaCore → Bool
  | .prim _ => true
  | .lit _ => true
  | .address => true
  | .object fs => closedF k fs
  | .tuple es => closedL k es
  | .array e => closedB k e
  | .union _ ms => closedL k ms
  | .refine s _ => closedB k s
  | .ref _ => true
  | .var i => decide (i < k)
  | .mu _ b => closedB (k + 1) b
  termination_by structural x => x

def closedF (k : Nat) : FieldList → Bool
  | .nil => true
  | .cons _ v _ rest => closedB k v && closedF k rest
  termination_by structural x => x

def closedL (k : Nat) : SchemaList → Bool
  | .nil => true
  | .cons hd tl => closedB k hd && closedL k tl
  termination_by structural x => x
end

/-! Spine check: `var i` must not be reachable through value-non-consuming positions
    (refine, union membership, nested mu spines). object/tuple/array consume value
    structure, so the spine stops there. -/

mutual
def guardSpineB (i : Nat) : SchemaCore → Bool
  | .var j => decide (j ≠ i)
  | .refine s _ => guardSpineB i s
  | .union _ ms => guardSpineL i ms
  | .mu _ b => guardSpineB (i + 1) b
  | _ => true
  termination_by structural x => x

def guardSpineL (i : Nat) : SchemaList → Bool
  | .nil => true
  | .cons hd tl => guardSpineB i hd && guardSpineL i tl
  termination_by structural x => x
end

mutual
def guardedB : SchemaCore → Bool
  | .prim _ => true
  | .lit _ => true
  | .address => true
  | .object fs => guardedF fs
  | .tuple es => guardedL es
  | .array e => guardedB e
  | .union _ ms => guardedL ms
  | .refine s _ => guardedB s
  | .ref _ => true
  | .var _ => true
  | .mu _ b => guardSpineB 0 b && guardedB b
  termination_by structural x => x

def guardedF : FieldList → Bool
  | .nil => true
  | .cons _ v _ rest => guardedB v && guardedF rest
  termination_by structural x => x

def guardedL : SchemaList → Bool
  | .nil => true
  | .cons hd tl => guardedB hd && guardedL tl
  termination_by structural x => x
end

/-- Schema well-formedness (v1 clauses; R-4 allowlist clause pending).
    A-3 (2026-08-25): §5 clause 4 — duplicate-free field names — implemented; its
    absence is what let the M1 falsification's schemas be reachable. -/
def WFS (s : SchemaCore) : Prop :=
  closedB 0 s = true ∧ guardedB s = true ∧ dupFreeS s = true

/-! ## mu-unfolding. Substitution of a CLOSED schema (no lifting needed — WFS demands
    closedness at the top, and `mu d b` is closed whenever the whole schema is). -/

mutual
def substS (k : Nat) (u : SchemaCore) : SchemaCore → SchemaCore
  | .prim p => .prim p
  | .lit v => .lit v
  | .address => .address
  | .object fs => .object (substF k u fs)
  | .tuple es => .tuple (substL k u es)
  | .array e => .array (substS k u e)
  | .union m ms => .union m (substL k u ms)
  | .refine s c => .refine (substS k u s) c
  | .ref a => .ref a
  | .var i => if i = k then u else .var i
  | .mu d b => .mu d (substS (k + 1) u b)
  termination_by structural x => x

def substF (k : Nat) (u : SchemaCore) : FieldList → FieldList
  | .nil => .nil
  | .cons key v opt rest => .cons key (substS k u v) opt (substF k u rest)
  termination_by structural x => x

def substL (k : Nat) (u : SchemaCore) : SchemaList → SchemaList
  | .nil => .nil
  | .cons hd tl => .cons (substS k u hd) (substL k u tl)
  termination_by structural x => x
end

def unfoldMu (d : String) (b : SchemaCore) : SchemaCore :=
  substS 0 (.mu d b) b

/-! ## Conformance (STORE-MODEL §5). Inductive proposition; parameterized by the check
    semantics (R-4 pending) and a schema resolver for `.ref` (coherence with a store is
    owed statement M17'). Assumes both sides canonical (field lists sorted). -/

structure ConformsEnv where
  checkSem : Check → Value → Prop
  res : Address → Option SchemaCore

/-- Membership in a SchemaList. -/
inductive SMem : SchemaCore → SchemaList → Prop
  | head {s tl} : SMem s (.cons s tl)
  | tail {s hd tl} : SMem s tl → SMem s (.cons hd tl)

mutual
inductive Conforms (env : ConformsEnv) : SchemaCore → Value → Prop
  | prim_null : Conforms env (.prim .null) .vnull
  | prim_bool (b : Bool) : Conforms env (.prim .bool) (.vbool b)
  | prim_int (n : Int) : Conforms env (.prim .int) (.vint n)
  | prim_str (s : String) : Conforms env (.prim .str) (.vstr s)
  | addr (a : Address) : Conforms env .address (.vaddr a)
  | lit (v : Value) : Conforms env (.lit v) v
  | obj {fs vfs} : ConformsF env fs vfs → Conforms env (.object fs) (.vobj vfs)
  | tup {es vs} : ConformsL env es vs → Conforms env (.tuple es) (.varr vs)
  | arr {e vs} : ConformsAll env e vs → Conforms env (.array e) (.varr vs)
  | union_mem {mode ms m v} : SMem m ms → Conforms env m v →
      Conforms env (.union mode ms) v
  | refine {s c v} : Conforms env s v → env.checkSem c v →
      Conforms env (.refine s c) v
  | ref {a s v} : env.res a = some s → Conforms env s v → Conforms env (.ref a) v
  | mu {d b v} : Conforms env (unfoldMu d b) v → Conforms env (.mu d b) v

inductive ConformsF (env : ConformsEnv) : FieldList → ValueFields → Prop
  | nil : ConformsF env .nil .nil
  | req {k t rest v vfs} : Conforms env t v → ConformsF env rest vfs →
      ConformsF env (.cons k t false rest) (.cons k v vfs)
  | opt_present {k t rest v vfs} : Conforms env t v → ConformsF env rest vfs →
      ConformsF env (.cons k t true rest) (.cons k v vfs)
  | opt_absent {k t rest vfs} : ConformsF env rest vfs →
      ConformsF env (.cons k t true rest) vfs

inductive ConformsL (env : ConformsEnv) : SchemaList → ValueList → Prop
  | nil : ConformsL env .nil .nil
  | cons {s ss v vs} : Conforms env s v → ConformsL env ss vs →
      ConformsL env (.cons s ss) (.cons v vs)

inductive ConformsAll (env : ConformsEnv) : SchemaCore → ValueList → Prop
  | nil {e} : ConformsAll env e .nil
  | cons {e v vs} : Conforms env e v → ConformsAll env e vs →
      ConformsAll env e (.cons v vs)
end

/-! ## The store (joint A: finite map + inductive Reachable). -/

abbrev Bytes := List UInt8
abbrev StoreMap := List (Address × Bytes)

def StoreMap.find : StoreMap → Address → Option Bytes
  | [], _ => none
  | (d', b) :: rest, d => if d = d' then some b else StoreMap.find rest d

/-- Insert a pre-image at its own address; no-op if the address is present
    (append-only; on reachable stores the present bytes are the same anyway, by WF1). -/
def putPre (H : Bytes → Address) (σ : StoreMap) (b : Bytes) : StoreMap :=
  match σ.find (H b) with
  | some _ => σ
  | none => (H b, b) :: σ

def AllResolve (σ : StoreMap) (as : List Address) : Prop :=
  ∀ a ∈ as, (σ.find a).isSome

def putSchema (H : Bytes → Address) (σ : StoreMap) (s : SchemaCore) : StoreMap :=
  putPre H σ (preimageS s)

def putEntity (H : Bytes → Address) (σ : StoreMap) (sAddr : Address) (v : Value) :
    StoreMap :=
  putPre H σ (preimageE sAddr v)

def getChecked (H : Bytes → Address) (σ : StoreMap) (d : Address) : Option Bytes :=
  match σ.find d with
  | some b => if H b = d then some b else none
  | none => none

/-- Joint A: the legal stores, inductively. Canonical-image strictness (Q5) holds by
    construction — inserts go only through `preimageS`/`preimageE`. `putE` carries the
    ratified typing precondition (Q4); its schema-presence half is WF2 for the entity's
    schema reference, stated as the `find`, while `AllResolve σ (refsV v)` extends WF2
    to every entity reference carried by the value. -/
inductive Reachable (H : Bytes → Address) (env : ConformsEnv) : StoreMap → Prop
  | empty : Reachable H env []
  | putS {σ s} : Reachable H env σ → WFS s → AllResolve σ (refsS s) →
      Reachable H env (putSchema H σ s)
  | putE {σ sAddr v s} : Reachable H env σ → σ.find sAddr = some (preimageS s) →
      Conforms env s v → AllResolve σ (refsV v) →
      Reachable H env (putEntity H σ sAddr v)

/-- Names beside the store (Q6): the mutable plane, never inside any pre-image. -/
abbrev NameMap := List (String × Address)

/-! ## The ledger — proved inline where cheap. -/

/-- Helper for M8: a put preserves the hash-consistency of lookups. -/
theorem find_putPre_hashes {H : Bytes → Address} {σ : StoreMap} {b₀ : Bytes}
    (ih : ∀ d b, σ.find d = some b → H b = d)
    {d : Address} {b : Bytes}
    (hf : (putPre H σ b₀).find d = some b) : H b = d := by
  unfold putPre at hf
  split at hf
  · exact ih d b hf
  · simp only [StoreMap.find] at hf
    split at hf
    · next heq =>
      cases hf
      exact heq.symm
    · exact ih d b hf

/-- M8 — WF1: on reachable stores, every binding hashes to its key. PROVED. -/
theorem M8_wf1 {H env σ} (h : Reachable H env σ) :
    ∀ d b, σ.find d = some b → H b = d := by
  induction h with
  | empty => intro d b hf; simp [StoreMap.find] at hf
  | putS _ _ _ ih => intro d b hf; exact find_putPre_hashes ih hf
  | putE _ _ _ _ ih => intro d b hf; exact find_putPre_hashes ih hf

/-- M12 — unconditional deduplication for schemas: equal canonical forms give identical
    stores and addresses. PROVED — no cryptographic hypothesis anywhere. -/
theorem M12_dedup {H : Bytes → Address} {σ : StoreMap} {s₁ s₂ : SchemaCore}
    (h : canonS s₁ = canonS s₂) : putSchema H σ s₁ = putSchema H σ s₂ := by
  unfold putSchema preimageS
  rw [h]

/-- M12E — unconditional deduplication for entities (Q11): values equal up to `vobj`
    field order give identical stores and addresses. PROVED — same two lines as M12,
    which is the point: dedup is a theorem of the encoding for both kinds. -/
theorem M12E_dedup {H : Bytes → Address} {σ : StoreMap} {sAddr : Address}
    {v₁ v₂ : Value} (h : canonV v₁ = canonV v₂) :
    putEntity H σ sAddr v₁ = putEntity H σ sAddr v₂ := by
  unfold putEntity preimageE
  rw [h]

/-- M13 — frame/append-only: a put never disturbs an existing binding. PROVED. -/
theorem M13_frame {H : Bytes → Address} {σ : StoreMap} {b₀ : Bytes} {d : Address}
    (hd : (σ.find d).isSome) : (putPre H σ b₀).find d = σ.find d := by
  unfold putPre
  split
  · rfl
  · next hnone =>
    simp only [StoreMap.find]
    split
    · next heq => rw [heq, hnone] at hd; simp at hd
    · rfl

/-- M14 (fresh half) — get after a fresh put retrieves the inserted pre-image at its
    address. PROVED; the already-present half is M13 + M8. -/
theorem M14_get_put_fresh {H : Bytes → Address} {σ : StoreMap} {b : Bytes}
    (hfresh : σ.find (H b) = none) : (putPre H σ b).find (H b) = some b := by
  unfold putPre
  rw [hfresh]
  simp [StoreMap.find]

/-- M11 — put idempotence (semilattice, first law). Seat: provable from M13/M14 by
    cases on presence; stated here, claimed separately. -/
def ObligationM11_put_idem : Prop :=
  ∀ (H : Bytes → Address) (σ : StoreMap) (s : SchemaCore),
    putSchema H (putSchema H σ s) s = putSchema H σ s

/-- M18 — Conforms decidable on well-formed schemas over the ref-free fragment first
    (joint C: total-on-guarded, no fuel; the seat extends to coherent resolvers). -/
def ObligationM18_conforms_decidable : Prop :=
  ∀ (env : ConformsEnv) (s : SchemaCore) (v : Value),
    WFS s →
    (∀ c w, Decidable (env.checkSem c w)) →
    (∀ a, env.res a = none) →
    Nonempty (Decidable (Conforms env s v))

/-! OWED statements (Q10 amendment discipline — added when their vocabulary exists,
    never as vacuous placeholders). UPDATE 2026-08-25: decode landed (`E2/Decode.lean`,
    M4a proved both halves) — the decode-blocked seats below are now unblocked.
    DISPATCH 2026-08-25: the M9, M15, and NEG-2 statements are PINNED in
    `E2/Resolve.lean` (seat modules `Faithful`/`Closure`/`Reject`); still owed here
    for vocabulary: M10, M11-commutation, M16, M17/M17′.
    - M9  WF2 closure over stored bytes — needs refs-of-bytes via decode (M4).
    - M10 WF3 acyclicity — needs the reference-graph vocabulary.
    - M11 commutation half (independent puts commute) — with the idempotence Prop above.
    - M15 faithfulness (resolve ∘ put = canonical representative) — needs decode (M4).
    - M16 names-inert — stated against the shell API surface, not as a tautology.
    - M17 typed reachability as a post-hoc invariant + M17' resolver coherence — decode.
    - NEG-2 dangling-reference exhibit — decode. -/

end E2
