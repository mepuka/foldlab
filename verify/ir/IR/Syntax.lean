/-
The typed IR — flb.type.v0 as an algebraic type, the reference model.

Ground truth for docs/research/2026-08-14-architecture-audit.md §3 and §5.
The shipped implementations represent this grammar as `map[string]any` (Go)
and `Json` (TypeScript) with at least ten restatements between them; this
file is the single statement they should all mirror.

Abstractions, stated so they can be argued with:
- The 12 kinds are faithful: four primitives, literal, list, struct, union,
  brand, check, ref, opaque (proto/SPEC.md grammar + the ratified opaque
  amendment). `check` args are abstracted to the check name; literal values
  are abstracted to `Scalar` with integer numerics (non-integer literal
  identity questions are the number-determinism dossier's lane, not this file's).
- Struct fields and union members are modeled as mutual inductive lists so
  every recursion is plainly structural.
- The hole is a type PARAMETER: `TyX Empty` is the closed grammar (a hole is
  uninhabitable — C5 "a tree containing a hole never bears identity" holds
  by construction), `TyX Unit` is the partial grammar. That holes exist only
  at type positions — never at field-name or metadata positions — is
  visible in the definition: `H` appears in exactly one constructor
  (FINDING-FRONTIER-001's "one hole-bearing nonterminal", as a type).
-/

namespace IR

inductive PrimKind where
  | string | bool | int | null
deriving Repr, DecidableEq

/-- JSON scalar payloads for `literal` nodes (numerics abstracted to Int). -/
inductive Scalar where
  | str  (s : String)
  | bool (b : Bool)
  | num  (n : Int)
  | null
deriving Repr, DecidableEq

mutual

/-- The flb.type.v0 grammar, parameterized by the hole payload `H`. -/
inductive TyX (H : Type) where
  | hole   (h : H)
  | prim   (p : PrimKind)
  | lit    (v : Scalar)
  | list   (of : TyX H)
  | strct  (fields : FieldsX H) (opt : List String)
  | union  (of : MembersX H)
  | brand  (name : String) (of : TyX H)
  | check  (base : TyX H) (name : String)
  | ref    (digest : String)
  | opaque

/-- Struct fields: an association list of name ↦ type. Canonical terms keep
names strictly sorted and unique; that is a well-formedness law, not a
representation constraint. -/
inductive FieldsX (H : Type) where
  | nil
  | cons (name : String) (ty : TyX H) (rest : FieldsX H)

/-- Union members. -/
inductive MembersX (H : Type) where
  | nil
  | cons (head : TyX H) (rest : MembersX H)

end

/-- The closed grammar: holes uninhabitable. -/
abbrev Ty      := TyX Empty
abbrev Fields  := FieldsX Empty
abbrev Members := MembersX Empty

/-- The partial (authoring) grammar: holes exist. -/
abbrev PTy      := TyX Unit
abbrev PFields  := FieldsX Unit
abbrev PMembers := MembersX Unit

/-! ## Hole-payload maps, embedding, closing (C5 as machinery) -/

mutual

def TyX.mapH {H H' : Type} (f : H → H') : TyX H → TyX H'
  | .hole h       => .hole (f h)
  | .prim p       => .prim p
  | .lit v        => .lit v
  | .list of      => .list (of.mapH f)
  | .strct fs opt => .strct (fs.mapH f) opt
  | .union ms     => .union (ms.mapH f)
  | .brand n of   => .brand n (of.mapH f)
  | .check b n    => .check (b.mapH f) n
  | .ref d        => .ref d
  | .opaque       => .opaque

def FieldsX.mapH {H H' : Type} (f : H → H') : FieldsX H → FieldsX H'
  | .nil          => .nil
  | .cons n t r   => .cons n (t.mapH f) (r.mapH f)

def MembersX.mapH {H H' : Type} (f : H → H') : MembersX H → MembersX H'
  | .nil          => .nil
  | .cons t r     => .cons (t.mapH f) (r.mapH f)

end

/-- A closed term embeds into the partial grammar. -/
def Ty.embed (t : Ty) : PTy := t.mapH (fun e => e.elim)

def Fields.embed (fs : Fields) : PFields := fs.mapH (fun e => e.elim)

def Members.embed (ms : Members) : PMembers := ms.mapH (fun e => e.elim)

mutual

/-- Closing a term: succeeds exactly when no hole remains. -/
def TyX.close {H : Type} : TyX H → Option Ty
  | .hole _       => none
  | .prim p       => some (.prim p)
  | .lit v        => some (.lit v)
  | .list of      => (of.close).map (fun t => TyX.list t)
  | .strct fs opt =>
      match fs.close with
      | some fs' => some (.strct fs' opt)
      | none     => none
  | .union ms     => (ms.close).map (fun m => TyX.union m)
  | .brand n of   => (of.close).map (fun t => TyX.brand n t)
  | .check b n    => (b.close).map (fun t => TyX.check t n)
  | .ref d        => some (.ref d)
  | .opaque       => some .opaque

def FieldsX.close {H : Type} : FieldsX H → Option Fields
  | .nil        => some .nil
  | .cons n t r =>
      match t.close, r.close with
      | some t', some r' => some (.cons n t' r')
      | _, _             => none

def MembersX.close {H : Type} : MembersX H → Option Members
  | .nil      => some .nil
  | .cons t r =>
      match t.close, r.close with
      | some t', some r' => some (.cons t' r')
      | _, _             => none

end

/-! ## C5 round trip: closing an embedded closed term recovers it -/

mutual

theorem Ty.close_embed : (t : Ty) → t.embed.close = some t
  | .hole h       => nomatch h
  | .prim _       => rfl
  | .lit _        => rfl
  | .list of      => by
      have ih := Ty.close_embed of
      simp only [Ty.embed] at ih
      simp [Ty.embed, TyX.mapH, TyX.close, ih]
  | .strct fs opt => by
      have ih := Fields.close_embed fs
      simp only [Fields.embed] at ih
      simp [Ty.embed, TyX.mapH, TyX.close, ih]
  | .union ms     => by
      have ih := Members.close_embed ms
      simp only [Members.embed] at ih
      simp [Ty.embed, TyX.mapH, TyX.close, ih]
  | .brand n of   => by
      have ih := Ty.close_embed of
      simp only [Ty.embed] at ih
      simp [Ty.embed, TyX.mapH, TyX.close, ih]
  | .check b n    => by
      have ih := Ty.close_embed b
      simp only [Ty.embed] at ih
      simp [Ty.embed, TyX.mapH, TyX.close, ih]
  | .ref _        => rfl
  | .opaque       => rfl

theorem Fields.close_embed : (fs : Fields) → fs.embed.close = some fs
  | .nil        => rfl
  | .cons n t r => by
      have iht := Ty.close_embed t
      have ihr := Fields.close_embed r
      simp only [Ty.embed] at iht
      simp only [Fields.embed] at ihr
      simp [Fields.embed, FieldsX.mapH, FieldsX.close, iht, ihr]

theorem Members.close_embed : (ms : Members) → ms.embed.close = some ms
  | .nil      => rfl
  | .cons t r => by
      have iht := Ty.close_embed t
      have ihr := Members.close_embed r
      simp only [Ty.embed] at iht
      simp only [Members.embed] at ihr
      simp [Members.embed, MembersX.mapH, MembersX.close, iht, ihr]

end

/-- **C5, machine form**: embed then close is the identity — a closed term
survives the trip through the authoring grammar untouched. -/
theorem Ty.close_embed_id (t : Ty) : t.embed.close = some t :=
  Ty.close_embed t

/-! ## Member lists as Lean lists (for the extensionality theorems) -/

def MembersX.toList {H : Type} : MembersX H → List (TyX H)
  | .nil      => []
  | .cons t r => t :: r.toList

def MembersX.ofList {H : Type} : List (TyX H) → MembersX H
  | []      => .nil
  | t :: r  => .cons t (MembersX.ofList r)

theorem MembersX.toList_ofList {H : Type} : (l : List (TyX H)) → (MembersX.ofList l).toList = l
  | []     => rfl
  | _ :: r => by simp [MembersX.ofList, MembersX.toList, MembersX.toList_ofList r]

end IR
