/-
The denotational semantics — what a type MEANS, as ground truth.

`Conforms ρ t v`: value `v` inhabits type `t` under catalog resolver `ρ`.
This relation exists nowhere in the shipped system (payload conformance is
an explicit non-goal at ingress, proto/SPEC.md), yet the estate's ratified
laws are all claims ABOUT it: brands and checks are "denotationally
invisible", union identity sorts members but meaning must not move,
evidence presence is monotone. This file states the relation once and
proves those laws as theorems.

Abstractions, stated:
- JSON values mirror the IR's list discipline (mutual inductives; objects
  are association lists — canonical objects have unique sorted keys, but
  the semantics is total over any object).
- `int` and `float` both accept `num` (numeric-tower fidelity is the
  number-determinism dossier's lane).
- Structs are denotationally CLOSED — unknown value keys do not conform.
  Derived from the shipped json-schema target (`additionalProperties:
  false`, proto/ts/src/codegen.ts:243), not newly decided here.
- `ref` resolution is fuel-indexed: `conforms` is defined by recursion on
  fuel, and `Conforms` is its limit (∃ fuel). The catalog is a DAG by
  construction (W4: no forward refs, no cycles), so for any cataloged type
  a fuel of catalog depth suffices; the fuel is the model's honest account
  of that well-foundedness without importing the DAG proof.
-/
import IR.Syntax

namespace IR

/-! ## JSON values -/

mutual

inductive Json where
  | null
  | bool (b : Bool)
  | num  (n : Int)
  | str  (s : String)
  | arr  (items : JsonList)
  | obj  (fields : JsonObj)

inductive JsonList where
  | nil
  | cons (head : Json) (tail : JsonList)

inductive JsonObj where
  | nil
  | cons (name : String) (value : Json) (rest : JsonObj)

end

def JsonObj.lookup : JsonObj → String → Option Json
  | .nil, _          => none
  | .cons n v r, key => if n = key then some v else r.lookup key

def scalarMatches : Scalar → Json → Bool
  | .str s,  .str s'  => s == s'
  | .bool b, .bool b' => b == b'
  | .num n,  .num n'  => n == n'
  | .null,   .null    => true
  | _,       _        => false

/-! ## Helper predicates (higher-order, so `conforms` stays structural in fuel) -/

def listAllP (p : Json → Bool) : JsonList → Bool
  | .nil      => true
  | .cons h t => p h && listAllP p t

def membersAny (p : Ty → Bool) : Members → Bool
  | .nil      => false
  | .cons h t => p h || membersAny p t

def Fields.declares : Fields → String → Bool
  | .nil, _          => false
  | .cons n _ r, key => n == key || Fields.declares r key

/-- Every declared field: present-and-conforming, or absent-and-optional. -/
def fieldsOk (cf : Ty → Json → Bool) (opt : List String) (o : JsonObj) : Fields → Bool
  | .nil          => true
  | .cons n ty r  =>
      (match o.lookup n with
       | some v => cf ty v
       | none   => opt.contains n) && fieldsOk cf opt o r

/-- Closed structs: every value key must be a declared field. -/
def keysDeclared (fs : Fields) : JsonObj → Bool
  | .nil        => true
  | .cons n _ r => Fields.declares fs n && keysDeclared fs r

/-! ## Conformance -/

/-- The catalog, as the semantics sees it: digest ↦ cataloged type. -/
abbrev Resolver := String → Option Ty

/-- Fuel-indexed conformance. Every recursive call decrements fuel, so the
definition is structural; `Conforms` below is the limit. -/
def conforms (ρ : Resolver) : Nat → Ty → Json → Bool
  | 0, _, _ => false
  | n + 1, t, j =>
    match t with
    | .hole h       => h.elim
    | .prim .string => (match j with | .str _  => true | _ => false)
    | .prim .bool   => (match j with | .bool _ => true | _ => false)
    | .prim .int    => (match j with | .num _  => true | _ => false)
    | .prim .float  => (match j with | .num _  => true | _ => false)
    | .prim .null   => (match j with | .null   => true | _ => false)
    | .lit v        => scalarMatches v j
    | .list of      =>
        (match j with
         | .arr items => listAllP (conforms ρ n of) items
         | _          => false)
    | .strct fs opt =>
        (match j with
         | .obj o => fieldsOk (conforms ρ n) opt o fs && keysDeclared fs o
         | _      => false)
    | .union ms     => membersAny (fun m => conforms ρ n m j) ms
    | .brand _ of   => conforms ρ n of j
    | .check b _    => conforms ρ n b j
    | .ref d        =>
        (match ρ d with
         | some t' => conforms ρ n t' j
         | none    => false)
    | .opaque       => true

/-- `v` inhabits `t` under catalog `ρ`. -/
def Conforms (ρ : Resolver) (t : Ty) (j : Json) : Prop :=
  ∃ n, conforms ρ n t j = true

/-! ## The ratified laws, as theorems -/

/-- **Brands are denotationally invisible** (ratified identity law; the
fiber theorem's premise). A brand moves identity, never meaning. -/
theorem brand_invisible (ρ : Resolver) (name : String) (t : Ty) (j : Json) :
    Conforms ρ (.brand name t) j ↔ Conforms ρ t j := by
  constructor
  · rintro ⟨n, h⟩
    cases n with
    | zero   => simp [conforms] at h
    | succ n => exact ⟨n, h⟩
  · rintro ⟨n, h⟩
    exact ⟨n + 1, h⟩

/-- **Checks are declared metadata**: a check never moves the denotation. -/
theorem check_invisible (ρ : Resolver) (name : String) (t : Ty) (j : Json) :
    Conforms ρ (.check t name) j ↔ Conforms ρ t j := by
  constructor
  · rintro ⟨n, h⟩
    cases n with
    | zero   => simp [conforms] at h
    | succ n => exact ⟨n, h⟩
  · rintro ⟨n, h⟩
    exact ⟨n + 1, h⟩

/-- **The fiber, denotationally**: two differently-branded copies of one
type are indistinguishable by any value — brands are pure intent,
assertable and refutable but never confirmable by evidence. -/
theorem brand_fiber (ρ : Resolver) (a b : String) (t : Ty) (j : Json) :
    Conforms ρ (.brand a t) j ↔ Conforms ρ (.brand b t) j := by
  rw [brand_invisible, brand_invisible]

/-- Unfolding a ref is exactly resolving it. -/
theorem ref_unfold (ρ : Resolver) (d : String) (j : Json) :
    Conforms ρ (.ref d) j ↔ ∃ t, ρ d = some t ∧ Conforms ρ t j := by
  constructor
  · rintro ⟨n, h⟩
    cases n with
    | zero   => simp [conforms] at h
    | succ n =>
      simp only [conforms] at h
      cases hd : ρ d with
      | none   => rw [hd] at h; simp at h
      | some t => rw [hd] at h; exact ⟨t, rfl, n, h⟩
  · rintro ⟨t, hd, n, h⟩
    exact ⟨n + 1, by simp only [conforms, hd]; exact h⟩

/-! ### Union meaning is a property of the member SET

Order and duplication of union members are identity-level facts (the
canonical sort law); the meaning must not move under them. -/

theorem membersAny_eq_any (p : Ty → Bool) :
    (ms : Members) → membersAny p ms = ms.toList.any p
  | .nil      => rfl
  | .cons h t => by
      simp [membersAny, MembersX.toList, List.any_cons, membersAny_eq_any p t]

/-- **Union extensionality**: two unions with the same member set mean the
same thing — at every fuel, hence in the limit. -/
theorem union_extensional (ρ : Resolver) (ms ms' : Members)
    (h : ∀ t, t ∈ ms.toList ↔ t ∈ ms'.toList) (j : Json) :
    Conforms ρ (.union ms) j ↔ Conforms ρ (.union ms') j := by
  have key : ∀ n, conforms ρ (n + 1) (.union ms) j = conforms ρ (n + 1) (.union ms') j := by
    intro n
    simp only [conforms, membersAny_eq_any]
    cases hAny : ms.toList.any fun m => conforms ρ n m j with
    | true =>
      rcases List.any_eq_true.mp hAny with ⟨t, ht, hp⟩
      exact (List.any_eq_true.mpr ⟨t, (h t).mp ht, hp⟩).symm
    | false =>
      cases hAny' : ms'.toList.any fun m => conforms ρ n m j with
      | true =>
        rcases List.any_eq_true.mp hAny' with ⟨t, ht, hp⟩
        have : ms.toList.any (fun m => conforms ρ n m j) = true :=
          List.any_eq_true.mpr ⟨t, (h t).mpr ht, hp⟩
        rw [this] at hAny; cases hAny
      | false => rfl
  constructor
  · rintro ⟨n, hn⟩
    cases n with
    | zero   => simp [conforms] at hn
    | succ n => exact ⟨n + 1, by rw [← key n]; exact hn⟩
  · rintro ⟨n, hn⟩
    cases n with
    | zero   => simp [conforms] at hn
    | succ n => exact ⟨n + 1, by rw [key n]; exact hn⟩

/-! ### Sorting members never moves meaning

The identity normal form sorts union members (ratified amendment 2). The
sort is modeled abstractly: ANY comparator — the theorem needs nothing
from it, because insertion preserves membership. Identity moves; meaning
must not. This is the two-folds thesis at the type level. -/

def insertBy (le : Ty → Ty → Bool) (x : Ty) : List Ty → List Ty
  | []      => [x]
  | y :: ys => if le x y then x :: y :: ys else y :: insertBy le x ys

def sortBy (le : Ty → Ty → Bool) : List Ty → List Ty
  | []      => []
  | x :: xs => insertBy le x (sortBy le xs)

theorem mem_insertBy (le : Ty → Ty → Bool) (x t : Ty) :
    (l : List Ty) → (t ∈ insertBy le x l ↔ t = x ∨ t ∈ l)
  | [] => by simp [insertBy]
  | y :: ys => by
      simp only [insertBy]
      cases hle : le x y with
      | true  => simp
      | false =>
        simp [List.mem_cons, mem_insertBy le x t ys]
        constructor
        · rintro (h | h | h) <;> simp [h]
        · rintro (h | h | h) <;> simp [h]

theorem mem_sortBy (le : Ty → Ty → Bool) (t : Ty) :
    (l : List Ty) → (t ∈ sortBy le l ↔ t ∈ l)
  | [] => Iff.rfl
  | x :: xs => by
      simp only [sortBy, mem_insertBy, List.mem_cons, mem_sortBy le t xs]

/-- **Normalization preserves meaning**: sorting union members (by any
comparator, canonical-byte order included) never changes which values
conform. The identity fold may move; the meaning fold must not. -/
theorem sort_preserves_meaning (ρ : Resolver) (le : Ty → Ty → Bool)
    (ms : Members) (j : Json) :
    Conforms ρ (.union (MembersX.ofList (sortBy le ms.toList))) j
      ↔ Conforms ρ (.union ms) j := by
  apply union_extensional
  intro t
  rw [MembersX.toList_ofList, mem_sortBy]

/-! ### Evidence presence is monotone, denotationally

Catalog growth never invalidates conformance: if `v` conforms under
resolver `ρ` and `ρ'` resolves everything `ρ` does, `v` conforms under
`ρ'`. This is the theory's "presence of evidence is monotone" at the
meaning level — the reason ingress can admit with a plain check. -/

theorem listAllP_mono {p p' : Json → Bool}
    (h : ∀ j, p j = true → p' j = true) :
    (l : JsonList) → listAllP p l = true → listAllP p' l = true
  | .nil => by simp [listAllP]
  | .cons x xs => by
      simp only [listAllP, Bool.and_eq_true]
      rintro ⟨hx, hxs⟩
      exact ⟨h x hx, listAllP_mono h xs hxs⟩

theorem membersAny_mono {p p' : Ty → Bool}
    (h : ∀ t, p t = true → p' t = true) :
    (ms : Members) → membersAny p ms = true → membersAny p' ms = true
  | .nil => by simp [membersAny]
  | .cons x xs => by
      simp only [membersAny, Bool.or_eq_true]
      rintro (hx | hxs)
      · exact Or.inl (h x hx)
      · exact Or.inr (membersAny_mono h xs hxs)

theorem fieldsOk_mono {cf cf' : Ty → Json → Bool}
    (h : ∀ t j, cf t j = true → cf' t j = true)
    (opt : List String) (o : JsonObj) :
    (fs : Fields) → fieldsOk cf opt o fs = true → fieldsOk cf' opt o fs = true
  | .nil => by simp [fieldsOk]
  | .cons n ty r => by
      simp only [fieldsOk, Bool.and_eq_true]
      rintro ⟨hHead, hRest⟩
      refine ⟨?_, fieldsOk_mono h opt o r hRest⟩
      cases hLook : o.lookup n with
      | some v => rw [hLook] at hHead; exact h ty v hHead
      | none   => rw [hLook] at hHead; exact hHead

/-- Resolver monotonicity, at every fuel. -/
theorem conforms_resolver_mono {ρ ρ' : Resolver}
    (hres : ∀ d t, ρ d = some t → ρ' d = some t) :
    ∀ n t j, conforms ρ n t j = true → conforms ρ' n t j = true := by
  intro n
  induction n with
  | zero => intro t j h; simp [conforms] at h
  | succ n ih =>
    intro t j h
    cases t with
    | hole h' => exact h'.elim
    | prim p => cases p <;> simpa [conforms] using h
    | lit v => simpa [conforms] using h
    | list of =>
      simp only [conforms] at h ⊢
      cases j with
      | arr items => exact listAllP_mono (fun v => ih of v) items h
      | null | bool _ | num _ | str _ | obj _ => simp_all
    | strct fs opt =>
      simp only [conforms] at h ⊢
      cases j with
      | obj o =>
        rw [Bool.and_eq_true] at h ⊢
        exact ⟨fieldsOk_mono (fun t v => ih t v) opt o fs h.1, h.2⟩
      | null | bool _ | num _ | str _ | arr _ => simp_all
    | union ms =>
      simp only [conforms] at h ⊢
      exact membersAny_mono (fun m => ih m j) ms h
    | brand name of =>
      simp only [conforms] at h ⊢
      exact ih of j h
    | check b name =>
      simp only [conforms] at h ⊢
      exact ih b j h
    | ref d =>
      simp only [conforms] at h ⊢
      cases hd : ρ d with
      | none => rw [hd] at h; simp at h
      | some t' =>
        rw [hd] at h
        rw [hres d t' hd]
        exact ih t' j h
    | «opaque» => simpa [conforms] using h

/-- **Catalog growth never invalidates meaning.** -/
theorem resolver_mono {ρ ρ' : Resolver}
    (hres : ∀ d t, ρ d = some t → ρ' d = some t)
    (t : Ty) (j : Json) :
    Conforms ρ t j → Conforms ρ' t j := by
  rintro ⟨n, h⟩
  exact ⟨n, conforms_resolver_mono hres n t j h⟩

end IR
