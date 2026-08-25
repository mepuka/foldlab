/-
The store model per STORE-MODEL.md (ratified 2026-08-25, joints A/B/C closed).
Statements-first: cheap theorems proved inline (M8 WF1, M12 dedup, M13 frame, M14 half);
real seats stated as Props (M11, M18); statements owed pending decode are listed in the
OWED block — added by amendment per Q10, never as vacuous placeholders.

AMENDED 2026-08-25 (A-1, ratified under Q10): joint B now collects address-valued
entity references through `refsV`; `Reachable.putE` requires those references to
resolve. `SchemaCore.address` is the working nullary address-type label, and
`Conforms.addr` types every `Value.vaddr` without an existence premise.

AMENDED 2026-08-25 (A-4, ratified under G4): `tupleRest` and `record` are
componentwise in `refsS`/`closedB`/`guardedB`/`substS` and both are guard-positive
(they consume value structure, so `guardSpineB`'s catch-all is correct for them).
`Conforms.tupleRest` splits the array value into a prefix conforming elementwise to
the positional elements and a suffix conforming-all to the rest schema — so the FLAT
value that report A's `flat_rejected` proved the nested workaround rejects now
conforms. `Conforms.record` admits a `.vobj` whose every field value conforms to the
codomain, with keys unconstrained.

AMENDED 2026-08-25 (window B, rulings W3-7/W3-9/W3-17/W3-18):

- `WFS` gains two conjuncts, `canonicalSpellingB` (W3-17) and `litNarrowB` (W3-18),
  bringing it to five. Strengthening `WFS` strengthens a HYPOTHESIS: every theorem
  that *takes* `WFS` stays true unchanged, and every theorem quantified over
  `Reachable` stays true because `Reachable` shrinks.
- `Reachable` moves to route (i-a) (W3-7, R-D §3.1): both `putS` premises and the two
  transported `putE` premises are stated on the STORED form — `canonS s` / `canonV v` —
  so every premise is about what the store actually holds. `putE` additionally gains
  `dupFreeV (canonV v)` (W3-9), reversing the A-3 record's delegation of value-plane
  duplicate-freedom to a boundary check that F-33/F-40 showed does not exist and, by
  the mechanism it intended to use, cannot.

TOPOLOGY NOTE (window B, reported to the coordinator). The CONTEXT glossary letters
`canonicalSpellingB` / `usesBinderB` / `litNarrowB` as owned by `E2/Admission` (W3-3).
They are DEFINED here because the import DAG forces it: they are `WFS` conjuncts, `WFS`
is `Reachable.putS`'s premise, and `E2/Admission` sits downstream of `E2/Resolve`, which
is downstream of this module. Ownership is unchanged — the public surface is
`E2/Admission`'s, and nothing outside the model calls these directly (W3-3).
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
  | .tupleRest es rest => refsL es ++ refsS rest
  | .record cod => refsS cod
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
  | .tupleRest es rest => closedL k es && closedB k rest
  | .record cod => closedB k cod
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
    (refine, union membership, nested mu spines). object/tuple/array — and, from A-4,
    tupleRest/record — consume value structure, so the spine stops there; those
    constructors fall into the catch-all below, which is what guard-positive means. -/

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
  | .tupleRest es rest => guardedL es && guardedB rest
  | .record cod => guardedB cod
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

/-! ## Binder use (W3-17). `usesBinderB k s` decides whether `s` mentions the binder at
    de Bruijn depth `k`. It mirrors `closedB`'s recursion skeleton exactly, with three
    changes: the `.var` leaf compares for EQUALITY at the depth (`i = k`) rather than
    `i < k`, the combining operator is `or` rather than `and`, and the neutral element
    is `false`. `guardSpineB` already carries the depth-indexed `.var` comparison this
    needs; it differs only by stopping at value-consuming constructors, which this must
    not do — a binder used under an `object` field is still used.

    The clause it serves: a `.mu` whose body ignores its binder is a discriminator
    identifying nothing, and the family `{ .mu d X : d ∈ String }` for binder-free `X`
    is UNBOUNDED in `d`. One decidable predicate on the body kills every member at once
    (R-B §5.2). G3's ratified carve-out — `.mu d₁ b` and `.mu d₂ b` are two addresses
    for a binder-USING `b` — is untouched. -/

mutual
def usesBinderB (k : Nat) : SchemaCore → Bool
  | .prim _ => false
  | .lit _ => false
  | .address => false
  | .object fs => usesBinderF k fs
  | .tuple es => usesBinderL k es
  | .array e => usesBinderB k e
  | .union _ ms => usesBinderL k ms
  | .refine s _ => usesBinderB k s
  | .ref _ => false
  | .var i => decide (i = k)
  | .mu _ b => usesBinderB (k + 1) b
  | .tupleRest es rest => usesBinderL k es || usesBinderB k rest
  | .record cod => usesBinderB k cod
  termination_by structural x => x

def usesBinderF (k : Nat) : FieldList → Bool
  | .nil => false
  | .cons _ v _ rest => usesBinderB k v || usesBinderF k rest
  termination_by structural x => x

def usesBinderL (k : Nat) : SchemaList → Bool
  | .nil => false
  | .cons hd tl => usesBinderB k hd || usesBinderL k tl
  termination_by structural x => x
end

/-! ## Literal narrowing (W3-18, F-35). MAPPING admission rule 1 made decidable. -/

/-- MAPPING admission rule 1's payload domain: a `.lit` carries a string, a boolean, or
    an integer, and NOTHING else. `vaddr` is the load-bearing exclusion (SP-11): the
    schema-plane `refsS` does not descend into `.lit`, so `.lit (.vaddr a)` hides an
    address from WF2 while `WFS` holds and the store stays `Reachable`. `vnull`,
    `vobj`, and `varr` are excluded by the same rule. -/
def litPayloadNarrowB : Value → Bool
  | .vstr _ => true
  | .vbool _ => true
  | .vint _ => true
  | .vnull => false
  | .vaddr _ => false
  | .vobj _ => false
  | .varr _ => false

mutual
def litNarrowB : SchemaCore → Bool
  | .prim _ => true
  | .lit v => litPayloadNarrowB v
  | .address => true
  | .object fs => litNarrowF fs
  | .tuple es => litNarrowL es
  | .array e => litNarrowB e
  | .union _ ms => litNarrowL ms
  | .refine s _ => litNarrowB s
  | .ref _ => true
  | .var _ => true
  | .mu _ b => litNarrowB b
  | .tupleRest es rest => litNarrowL es && litNarrowB rest
  | .record cod => litNarrowB cod
  termination_by structural x => x

def litNarrowF : FieldList → Bool
  | .nil => true
  | .cons _ v _ rest => litNarrowB v && litNarrowF rest
  termination_by structural x => x

def litNarrowL : SchemaList → Bool
  | .nil => true
  | .cons hd tl => litNarrowB hd && litNarrowL tl
  termination_by structural x => x
end

/-! ## Canonical spelling (W3-17).

    UNCHECKED CLAIM — the clause table below is AUDITED AGAINST THE CENSUS, NOT PROVED
    COMPLETE. A spelling rule is complete when the admissible set holds exactly one
    representative per source construct; the estate has no formal source-side
    equivalence (the source side is TypeScript), and `Conforms` is the wrong yardstick
    for it (rule `source-construct-yardstick`). So the table can be enumerated and
    audited, never proved exhaustive. In particular NO FINITE SYNTACTIC CLAUSE REACHES
    THE UNINHABITED GENERALISATION: the carrier still offers uninhabited spellings this
    table does not name, and any function constructing carriers directly can still build
    one (F-34; RULINGS W3-17). This marker is permanent, not a seat-owed gap.

    Per `canonicalizer-is-not-an-admission-rule` (W3-17/W3-19), none of this belongs in
    `canonS`: a normalization pass asked to carry an admission rule is not even a
    function of its equivalence class on the inputs the rule would have rejected.
    `canonS` stays constructor-preserving permanently. -/

/-- The canonical Never spelling: the empty `anyOf` union (MAPPING row 12; the `oneOf`
    nil spelling is already rejected). Compared SYNTACTICALLY — the yardstick is the
    source construct, never a lab judgment. -/
def neverS : SchemaCore := .union .anyOf .nil

/-- `s` does not occur later in the member list. Mirrors `keyAbsent`. -/
def smemAbsent (s : SchemaCore) : SchemaList → Bool
  | .nil => true
  | .cons hd tl => (!(s == hd)) && smemAbsent s tl

/-- Pairwise-distinct union members. MODE-GATED: applied under `anyOf` only. Under
    `oneOf` duplicate members change the judgment's arity, not merely its spelling, so
    no dedup clause fires there (F-50). -/
def membersDistinctB : SchemaList → Bool
  | .nil => true
  | .cons hd tl => smemAbsent hd tl && membersDistinctB tl

mutual
/-- The ruled clause table (R-B §5.2, ruling W3-17). Each clause names the spelling
    family it kills; the "reject" side is chosen to preserve pre-A-4 addresses, so no
    address moves. -/
def canonicalSpellingB : SchemaCore → Bool
  | .prim _ => true
  | .lit _ => true
  | .address => true
  | .ref _ => true
  | .var _ => true
  | .object fs => canonicalSpellingF fs
  | .tuple es => canonicalSpellingL es
  -- SP-10: `.array Never` is a second spelling of the empty array type.
  | .array e => (!(e == neverS)) && canonicalSpellingB e
  -- SP-1: a one-member union is a spelling of its member.
  -- SP-3 (anyOf): duplicate members are a spelling of the deduplicated union.
  | .union .anyOf ms =>
      (!decide (SchemaList.length ms = 1)) && membersDistinctB ms && canonicalSpellingL ms
  | .union .oneOf ms =>
      (!decide (SchemaList.length ms = 1)) && canonicalSpellingL ms
  | .refine s _ => canonicalSpellingB s
  -- SP-6 and the whole unbounded SP-6′ family: a binder-free `mu` body.
  | .mu _ b => usesBinderB 0 b && canonicalSpellingB b
  -- SP-7 (the infinite family): an empty positional prefix is a spelling of `.array`.
  -- SP-8: a `Never` tail is a spelling of the plain `.tuple`.
  | .tupleRest es rest =>
      (!(es == SchemaList.nil)) && (!(rest == neverS))
        && canonicalSpellingL es && canonicalSpellingB rest
  -- SP-9: `.record Never` is a second spelling of the empty object type.
  | .record cod => (!(cod == neverS)) && canonicalSpellingB cod
  termination_by structural x => x

def canonicalSpellingF : FieldList → Bool
  | .nil => true
  | .cons _ v _ rest => canonicalSpellingB v && canonicalSpellingF rest
  termination_by structural x => x

def canonicalSpellingL : SchemaList → Bool
  | .nil => true
  | .cons hd tl => canonicalSpellingB hd && canonicalSpellingL tl
  termination_by structural x => x
end

/-- Schema well-formedness (v1 clauses; R-4 allowlist clause pending).
    A-3 (2026-08-25): §5 clause 4 — duplicate-free field names — implemented; its
    absence is what let the M1 falsification's schemas be reachable.
    W3-17 / W3-18 (2026-08-25, window B): clauses 4 and 5 — canonical spelling and
    literal narrowing — join, on the A-3 shape. Both are conjuncts of a HYPOTHESIS, so
    the additive-vs-arity law classifies this as additive: no constructor arity changes
    and no name a seat imports changes. -/
def WFS (s : SchemaCore) : Prop :=
  closedB 0 s = true ∧ guardedB s = true ∧ dupFreeS s = true ∧
    canonicalSpellingB s = true ∧ litNarrowB s = true

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
  | .tupleRest es rest => .tupleRest (substL k u es) (substS k u rest)
  | .record cod => .record (substS k u cod)
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

/-- Value-list concatenation — the split `tupleRest` conformance is stated over (A-4).
    The prefix is the positional part, the suffix the homogeneous tail. -/
def ValueList.append : ValueList → ValueList → ValueList
  | .nil, ys => ys
  | .cons v vs, ys => .cons v (ValueList.append vs ys)

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
  | tupleRest {es rest pre suf} : ConformsL env es pre → ConformsAll env rest suf →
      Conforms env (.tupleRest es rest) (.varr (ValueList.append pre suf))
  | record {cod vfs} : ConformsAllF env cod vfs → Conforms env (.record cod) (.vobj vfs)

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

/- A-4: the `record` codomain rule. Every field's VALUE conforms to `cod`; the KEYS are
   unconstrained here — string-keyed by construction (`ValueFields.cons key : String`),
   and duplicate-freedom stays a boundary admission (A-3's record), never a Conforms
   premise. This is exactly what `object_exact_width` showed `ConformsF` cannot express:
   admitting a field the schema does not name by name. -/
inductive ConformsAllF (env : ConformsEnv) : SchemaCore → ValueFields → Prop
  | nil {c} : ConformsAllF env c .nil
  | cons {c k v vfs} : Conforms env c v → ConformsAllF env c vfs →
      ConformsAllF env c (.cons k v vfs)
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
    schema reference, stated as the `find`, while the `AllResolve` premise extends WF2
    to every entity reference carried by the value.

    AMENDED 2026-08-25 (W3-7, route (i-a); W3-9): EVERY carrier premise is now stated on
    the STORED form. `putS` reads `WFS (canonS s)` and `AllResolve σ (refsS (canonS s))`;
    `putE` reads `Conforms env (canonS s) (canonV v)` and
    `AllResolve σ (refsV (canonV v))`. This is what makes M17 hold by construction: the
    premise IS the goal, with no `H`-injectivity hypothesis anywhere (R-D §3.1).

    Direction of change: every replacement is weaker or equal except the `Conforms` one,
    which is incomparable. `WFS s → WFS (canonS s)` is B1∧B2∧B3; the `AllResolve`
    replacements are `allResolve_canonS` / `allResolve_canonV`, both proved — so `putS`
    admits at least as many stores as before.

    `dupFreeV (canonV v)` is an ADDED premise, not a replacement (W3-9). It closes the
    entity-value route of F-28; the `.lit`-payload route is closed one plane up by the
    F-26 repair `dupFreeS (.lit v) := dupFreeV v` (window A), and the `Check`-payload
    route stays OPEN pending F-29 / R-4. Two of three planes closed — recorded so this
    amendment does not repeat A-3's error of calling a plane closed that is not. -/
inductive Reachable (H : Bytes → Address) (env : ConformsEnv) : StoreMap → Prop
  | empty : Reachable H env []
  | putS {σ s} : Reachable H env σ → WFS (canonS s) →
      AllResolve σ (refsS (canonS s)) →
      Reachable H env (putSchema H σ s)
  | putE {σ sAddr v s} : Reachable H env σ → σ.find sAddr = some (preimageS s) →
      Conforms env (canonS s) (canonV v) → dupFreeV (canonV v) = true →
      AllResolve σ (refsV (canonV v)) →
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
  -- W3-9 pattern hole 1 of 3: `dupFreeV (canonV v)` is an ADDED `putE` premise, so this
  -- pattern gains one hole. The premises stay unused — M8 is about bytes, not carriers.
  | putE _ _ _ _ _ ih => intro d b hf; exact find_putPre_hashes ih hf

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

/-- B3's value-plane twin (W3-9, owed by R-D §6.1). `canonV` permutes `vobj` keys and
    never multiplies them, so canonicalizing a value neither creates nor destroys a
    duplicate key. This is what licenses reading `putE`'s `dupFreeV (canonV v)` premise
    as a statement about the raw value the caller supplied, and vice versa — the schema
    twin (B3) is swept `true` over the corpus; this one has never been stated anywhere.
    Stated as the BICONDITIONAL: the premise has to transfer in both directions.
    Stated, unproved. -/
def ObligationCanonVPreservesDupFree : Prop :=
  ∀ v : Value, dupFreeV (canonV v) = true ↔ dupFreeV v = true

/-! OWED statements (Q10 amendment discipline — added when their vocabulary exists,
    never as vacuous placeholders). UPDATE 2026-08-25: decode landed (`E2/Decode.lean`,
    M4a proved both halves) — the decode-blocked seats below are now unblocked.
    DISPATCH 2026-08-25: the M9, M15, and NEG-2 statements are PINNED in
    `E2/Resolve.lean` (seat modules `Faithful`/`Closure`/`Reject`).
    WINDOW B 2026-08-25: M17 and M17′ are now STATED, in `E2/Admission.lean` — both
    quantify over `resolveSchema`/`resolveEntity`, which live in `E2/Resolve.lean`,
    downstream of this module, and `E2/Resolve.lean` is frozen. `ObligationM19_transport`
    and the two topo obligations are stated there and in `E2/Graph.lean`.
    W3-22 2026-08-25: M10 and M11's commutation half are no longer owed here — both need
    `E2/Graph.lean`'s address-node vocabulary, which is downstream of this module, so both
    are stated (and proved) in their seats:
    - M10 WF3 acyclicity — `ObligationM10_wf3` with `ObligationM10_rank` beside it, in
      `E2/Wf3.lean`. Nodes are ADDRESSES, not pre-images (F-31's correction).
    - M11 commutation half (independent puts commute) — `ObligationM11_comm` in
      `E2/Commutation.lean`, pinned up to find-extensionality and shipped with the
      `reachable_keys_nodup` companion F-38 showed it needs. The idempotence Prop above
      is unchanged and stays here.
    Still owed here for vocabulary:
    - M16 names-inert — stated against the shell API surface, not as a tautology. -/

end E2
