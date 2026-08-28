import Cas.Node
import Cas.Store
import Cas.Json

/-!
# Typed references: the marker grammar and the `Root` type

The type model of the library's typed-DAG layer. A typed reference
appears in a payload as exactly `{"$ref": k}`, and the k-th marker in
canonical byte order carries index k into the node's reference array —
one representation by construction. Three clauses:

- **Forced indexes.** Markers scanned in canonical traversal order (the
  order the compact renderer emits — codepoint-sorted keys) must read
  exactly `0, 1, …, n-1`, with exactly `n` reference entries.
  `wellRefIndexed` is the decode-side judge.
- **Sharing repeats entries.** The same target referenced twice is two
  markers and two reference entries; no dedup law exists.
- **Collision refuses.** The reserved key outside the exact marker
  shape refuses at encode (`lower` answers `none`) and at decode
  (`markerScan` answers `none`) — never an escape, which would give one
  user value two spellings and split its content identity.

Every traversal canonicalizes first (sort object fields after the
recursion, the renderer's own trick), so assignment and scan walk the
same order with structural recursion only. The coherence law
`markerScan ∘ lower = range` is guarded over the fixtures below; its
general induction is a named follow-up of this model.

`Root α` is the typed root itself: an address claimed at a kind tag,
carrying the decoded type as a phantom index. Its edge form is an
ordinary `Ref`, which is what lets the store's admission law check
typed edges with no projection-side machinery — and in a `Closed`
store, every resident edge dereferences at its declared kind
(`Store.Closed` is exactly that statement).
-/

namespace Cas

open Json

/-- The reserved marker key. -/
def refKey : String := "$ref"

/-- Recognize the exact marker shape: one field, the reserved key, a
natural index. Anything else is not a marker. -/
def asMarker : Value → Option Nat
  | .obj [(k, .nat n)] => if k = refKey then some n else none
  | _ => none

/-! ## Canonicalization — sort object fields everywhere, recursion
before sort so everything stays structural. -/

mutual

def canonValue : Value → Value
  | .null => .null
  | .bool b => .bool b
  | .nat n => .nat n
  | .int i => .int i
  | .str s => .str s
  | .arr xs => .arr (canonItems xs)
  | .obj fields =>
    .obj ((canonFields fields).mergeSort fun a b => decide (a.1 ≤ b.1))

def canonItems : List Value → List Value
  | [] => []
  | x :: rest => canonValue x :: canonItems rest

def canonFields : List (String × Value) → List (String × Value)
  | [] => []
  | (k, v) :: rest => (k, canonValue v) :: canonFields rest

end

/-! ## The decode-side judge -/

mutual

/-- Marker indexes of a canonicalized value, in traversal order.
`none` is the collision refusal: the reserved key outside the exact
marker shape. -/
def scanCanon : Value → Option (List Nat)
  | .null | .bool _ | .nat _ | .int _ | .str _ => some []
  | .arr xs => scanItems xs
  | .obj fields =>
    match asMarker (.obj fields) with
    | some k => some [k]
    | none =>
      if fields.any (·.1 = refKey) then none
      else scanFields fields

def scanItems : List Value → Option (List Nat)
  | [] => some []
  | x :: rest =>
    match scanCanon x, scanItems rest with
    | some ks, some more => some (ks ++ more)
    | _, _ => none

def scanFields : List (String × Value) → Option (List Nat)
  | [] => some []
  | (_, v) :: rest =>
    match scanCanon v, scanFields rest with
    | some ks, some more => some (ks ++ more)
    | _, _ => none

end

/-- Marker indexes in canonical byte order, collision refused. -/
def markerScan (v : Value) : Option (List Nat) := scanCanon (canonValue v)

/-- The forced-index law: markers read `0…n-1` in canonical order and
the reference array carries exactly `n` entries. -/
def wellRefIndexed (v : Value) (refCount : Nat) : Bool :=
  match markerScan v with
  | some ks => decide (ks = List.range refCount)
  | none => false

/-! ## The encode direction — reference-bearing trees lowered to a
payload value plus the reference array, indexes assigned in canonical
order. -/

/-- A value with typed-reference leaves — what a projection encodes
before lowering. -/
inductive RValue where
  | null
  | bool (b : Bool)
  | nat (n : Nat)
  | int (i : Int)
  | str (s : String)
  | arr (xs : List RValue)
  | obj (fields : List (String × RValue))
  | link (r : Ref)

mutual

def canonR : RValue → RValue
  | .null => .null
  | .bool b => .bool b
  | .nat n => .nat n
  | .int i => .int i
  | .str s => .str s
  | .link r => .link r
  | .arr xs => .arr (canonRItems xs)
  | .obj fields =>
    .obj ((canonRFields fields).mergeSort fun a b => decide (a.1 ≤ b.1))

def canonRItems : List RValue → List RValue
  | [] => []
  | x :: rest => canonR x :: canonRItems rest

def canonRFields : List (String × RValue) → List (String × RValue)
  | [] => []
  | (k, v) :: rest => (k, canonR v) :: canonRFields rest

end

mutual

/-- Lower a canonicalized tree: links become markers carrying the next
index, references accumulate in traversal order, and a user object
mentioning the reserved key refuses the whole encode. -/
def lowerCanon : RValue → List Ref → Option (Value × List Ref)
  | .null, acc => some (.null, acc)
  | .bool b, acc => some (.bool b, acc)
  | .nat n, acc => some (.nat n, acc)
  | .int i, acc => some (.int i, acc)
  | .str s, acc => some (.str s, acc)
  | .link r, acc => some (.obj [(refKey, .nat acc.length)], acc ++ [r])
  | .arr xs, acc =>
    match lowerItems xs acc with
    | some (vs, acc') => some (.arr vs, acc')
    | none => none
  | .obj fields, acc =>
    if fields.any (·.1 = refKey) then none
    else
      match lowerFields fields acc with
      | some (fs, acc') => some (.obj fs, acc')
      | none => none

def lowerItems : List RValue → List Ref → Option (List Value × List Ref)
  | [], acc => some ([], acc)
  | x :: rest, acc =>
    match lowerCanon x acc with
    | some (v, acc') =>
      match lowerItems rest acc' with
      | some (vs, acc'') => some (v :: vs, acc'')
      | none => none
    | none => none

def lowerFields :
    List (String × RValue) → List Ref →
      Option (List (String × Value) × List Ref)
  | [], acc => some ([], acc)
  | (k, v) :: rest, acc =>
    match lowerCanon v acc with
    | some (v', acc') =>
      match lowerFields rest acc' with
      | some (fs, acc'') => some ((k, v') :: fs, acc'')
      | none => none
    | none => none

end

/-- The encoder: canonicalize, then assign indexes in traversal order.
`none` is the collision refusal. -/
def lower (v : RValue) : Option (Value × List Ref) := lowerCanon (canonR v) []

/-! ## Fixtures — the executable law -/

def addrA : Addr32 := ⟨List.replicate 32 1, by simp⟩
def addrB : Addr32 := ⟨List.replicate 32 2, by simp⟩

def refA : Ref := ⟨5, addrA⟩
def refB : Ref := ⟨7, addrB⟩

/-- Declaration order disagrees with canonical order — the load-bearing
fixture: the link under `a` is assigned index 0 although declared
second. -/
def orderFixture : RValue :=
  .obj [("b", .link refA), ("a", .link refB)]

def refFixtures : List RValue :=
  [ .obj [("author", .link refA), ("title", .str "hi")]
  , orderFixture
  , .arr [.link refA, .link refA]
  , .obj [("z", .nat 3), ("list", .arr [.link refB, .obj [("deep", .link refA)]])]
  , .obj [("data", .obj [(refKey, .nat 0)])]
  , .obj [(refKey, .str "x"), ("y", .nat 1)]
  , .obj [("k", .arr [.nat 1, .nat 2])] ]

-- The coherence guard: every lowered fixture satisfies the decode-side
-- judge — assignment and scan walk one order.
#guard refFixtures.all fun fixture =>
  match lower fixture with
  | some (payload, refs) => wellRefIndexed payload refs.length
  | none => true

-- The two collision fixtures refuse, the rest lower.
#guard (refFixtures.map fun f => (lower f).isSome)
  == [true, true, true, true, false, false, true]

-- Canonical assignment: the `a`-declared-second link takes index 0,
-- so the reference array leads with its target.
#guard (lower orderFixture).map (fun (_, refs) => refs) == some [refB, refA]

/-- A marker at index `k`. -/
def marker (k : Nat) : Value := .obj [(refKey, .nat k)]

-- The forced-index law refuses disorder, gaps, duplication, count
-- mismatch, malformed markers, and payload collisions.
#guard wellRefIndexed (.obj [("a", marker 0), ("b", marker 1)]) 2 == true
#guard wellRefIndexed (.obj [("a", marker 1), ("b", marker 0)]) 2 == false
#guard wellRefIndexed (.arr [marker 0, marker 2]) 3 == false
#guard wellRefIndexed (.arr [marker 0, marker 0]) 2 == false
#guard wellRefIndexed (.arr [marker 0]) 2 == false
#guard wellRefIndexed (.obj [(refKey, .nat 0), ("x", .nat 1)]) 1 == false
#guard wellRefIndexed (.obj [(refKey, .str "0")]) 1 == false
#guard wellRefIndexed (.obj [("k", .nat 1)]) 0 == true

/-! ## The typed root -/

/-- A typed root: an address whose resident is claimed at kind `tag`,
with the decoded type carried as a phantom index. The runtime mirror is
`Root<A>` — a branded content id. -/
structure Root (α : Type u) where
  tag : UInt8
  addr : Addr32

/-- A typed root's edge form: the ordinary reference the node carries,
which is what the admission law checks. -/
def Root.ref (r : Root α) : Ref := ⟨r.tag, r.addr⟩

/-- A root dereferences in a store when a node resides at its address
at the declared kind. -/
def Root.resolvesIn (r : Root α) (σ : Store) : Prop :=
  ∃ n, σ r.addr = some n ∧ n.tag = r.tag

/-- In a closed store, every resident typed edge dereferences at its
declared kind: the projection layer's "follow a `Root`" is total over
admitted graphs. -/
theorem Root.closed_deref {σ : Store} (hσ : Store.Closed σ)
    {a : Addr32} {n : Node} (ha : σ a = some n)
    {α : Type u} (r : Root α) (hr : r.ref ∈ n.refs) :
    r.resolvesIn σ := by
  obtain ⟨m, hm, htag⟩ := hσ a n ha r.ref hr
  exact ⟨m, hm, htag⟩

end Cas
