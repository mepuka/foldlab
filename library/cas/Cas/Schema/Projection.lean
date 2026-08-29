import Cas.Schema.Codec
import Cas.Schema.Described
import Cas.Values.Refs

/-!
# The projection — a described VALUE to a store node

The path from `El a` to a `Node`: the schema plane's denotation on one
side, the typed-DAG layer's marker grammar on the other, and nothing
hand-written in between. Before this module the two never met — the
`$link` sentinel (`Codec/References.lean`) was a wire shape no Lean
caller could turn into a node, and `RValue` (`Values/Refs.lean`) was a
carrier no Lean caller could produce. A described kind could be minted,
addressed, and materialized, but it could not be PUT from Lean, so
every reification target was a generator Lean could not drive.

## The route: a direct fold, not a lift over `encode`

The runtime does this in two passes — `Schema.encode` produces
`$link` sentinels, then `markerize` rewrites them into positional
markers (`src/cas/Value.ts`, `src/internal/refMarkers.ts`). The obvious
Lean mirror is the same two passes: `encode`, then a `Value → RValue`
pass that lifts the sentinels. It is the wrong shape here, and the
reason is not taste:

- A CODE-BLIND lift, matching the sentinel's shape wherever it appears,
  is unsound. `{"$link":{"id":…,"tag":…}}` is a value a user struct can
  spell — a two-field struct with those names encodes to exactly it —
  and lifting it would mint a store edge out of plain data. The model
  refuses that class of confusion everywhere else (`lower` refuses the
  reserved key rather than escaping it); a lift that reintroduces it at
  the bridge is not a mirror of the runtime, it is a hole.
- A CODE-KEYED lift, `Ast → Json.Value → Option RValue`, is sound, but
  it is a second full mutual recursion over code and value with its own
  termination measure, and it owes a law (`lift a (encode a v) = …`)
  that re-derives what `encode` already knows. Strictly more machinery
  and strictly more proof than the alternative.

So the bridge is a DIRECT FOLD: `elR` is `encode` with exactly one arm
changed — `.ref` yields a `.link` instead of a sentinel — and every
law over it is the same structural induction on the code that the
codec's own laws are.

Factoring through `encode` is then recovered as a THEOREM rather than
paid for as an implementation: `eraseR_elR` says erasing the links back
to sentinels gives `encode` on the nose, so the bridge cannot silently
fork the wire shape the plane already ratified. That is the property
the two-pass route would have had by construction, obtained at the
price of one induction instead of a second recursion.

## What the bridge does NOT own

The scheme VERSION byte is a parameter. A value node's version is the
store's business — the grammar plane spells `schemeVersion` and the
runtime spells `CasSchemeVersion` — and the schema plane has never
reached across to it (no module under `Cas/Schema/` imports
`Cas/Grammar/`). Taking it as an argument keeps that boundary and
states no version fact this plane has no standing to state.

The ENVELOPE is owned, because it is payload discipline and payload is
what this plane produces: a value node's bytes are the compact
canonical rendering of `{"revision": r, "value": …}`, exactly the
runtime's `payloadFor`. Omitting it would produce a node whose bytes no
reader accepts.
-/

namespace Cas.Schema

open Cas (RValue Ref Node)

/-! ## The link-free embedding

The reference-free arms reuse the plane's ratified scalar encoders
(`encInt`, `encLit`) through this embedding rather than respelling
them. Respelling would put a second determination of the integer image
in the estate, and `encInt`'s is the one the wire is pinned to. -/

mutual

/-- A plain value as a reference-bearing one: the same tree, no links. -/
def jsonR : Json.Value → RValue
  | .null => .null
  | .bool b => .bool b
  | .nat n => .nat n
  | .int i => .int i
  | .str s => .str s
  | .arr xs => .arr (jsonRItems xs)
  | .obj fields => .obj (jsonRFields fields)

def jsonRItems : List Json.Value → List RValue
  | [] => []
  | x :: rest => jsonR x :: jsonRItems rest

def jsonRFields : List (String × Json.Value) → List (String × RValue)
  | [] => []
  | (k, v) :: rest => (k, jsonR v) :: jsonRFields rest

end

/-! ## The fold — `encode` with one arm changed -/

mutual

/-- The reference-bearing image of a described value: structural on the
code, so it reduces definitionally, and identical to `encode` except at
`.ref`, where the address becomes a LINK rather than a sentinel. -/
def elR : (a : Ast) → El a → RValue
  | .null, _ => .null
  | .bool, b => .bool b
  | .int, i => jsonR (encInt i)
  | .str, s => .str s
  | .lit l, _ => jsonR (encLit l)
  | .arr a, xs => .arr (xs.map (elR a))
  | .struct fs, x => .obj (elRFields fs x)
  | .ref t, r => .link ⟨t, r.addr⟩
  | .union ms _, x => elRMembers (discriminatedB ms) ms x

def elRFields :
    (fs : List (String × Bool × Ast)) → ElFields fs →
      List (String × RValue)
  | [], _ => []
  | (n, true, a) :: fs, (x, rest) =>
    (match x with
      | some v => [(n, elR a v)]
      | none => []) ++ elRFields fs rest
  | (n, false, a) :: fs, (v, rest) =>
    (n, elR a v) :: elRFields fs rest

/-- A member's value folds as that member's value, plainly — the wire
shape of a tagged union is the wire shape of the member that matched.
The discrimination bit is an explicit argument for the same reason it
is on `encodeMembers`: it makes the union arm typecheck with no cast. -/
def elRMembers :
    (b : Bool) → (ms : List Ast) → cond b (ElMembers ms) Empty → RValue
  | true, [], x => Empty.elim x
  | true, [a], x => elR a x
  | true, a :: b :: rest, x =>
    match x with
    | Sum.inl y => elR a y
    | Sum.inr y => elRMembers true (b :: rest) y
  | false, _, x => Empty.elim x

end

/-! ## Erasure — the bridge factors through `encode`, provably -/

mutual

/-- Links back to sentinels: the inverse of the one arm that differs. -/
def eraseR : RValue → Json.Value
  | .null => .null
  | .bool b => .bool b
  | .nat n => .nat n
  | .int i => .int i
  | .str s => .str s
  | .link r => encRef r.expectedTag r.addr
  | .arr xs => .arr (eraseItems xs)
  | .obj fields => .obj (eraseFields fields)

def eraseItems : List RValue → List Json.Value
  | [] => []
  | x :: rest => eraseR x :: eraseItems rest

def eraseFields : List (String × RValue) → List (String × Json.Value)
  | [] => []
  | (k, v) :: rest => (k, eraseR v) :: eraseFields rest

end

theorem eraseItems_eq_map (l : List RValue) : eraseItems l = l.map eraseR := by
  induction l with
  | nil => rfl
  | cons x rest ih => simp [eraseItems, ih]

mutual

/-- The embedding is a section of the erasure: a link-free tree erases
to the value it came from. -/
theorem eraseR_jsonR : ∀ v : Json.Value, eraseR (jsonR v) = v
  | .null => rfl
  | .bool _ => rfl
  | .nat _ => rfl
  | .int _ => rfl
  | .str _ => rfl
  | .arr xs => by simp only [jsonR, eraseR, eraseItems_jsonRItems xs]
  | .obj fields => by simp only [jsonR, eraseR, eraseFields_jsonRFields fields]

theorem eraseItems_jsonRItems :
    ∀ xs : List Json.Value, eraseItems (jsonRItems xs) = xs
  | [] => rfl
  | x :: rest => by
    simp only [jsonRItems, eraseItems, eraseR_jsonR x, eraseItems_jsonRItems rest]

theorem eraseFields_jsonRFields :
    ∀ fs : List (String × Json.Value), eraseFields (jsonRFields fs) = fs
  | [] => rfl
  | (k, v) :: rest => by
    simp only [jsonRFields, eraseFields, eraseR_jsonR v,
      eraseFields_jsonRFields rest]

end

/-- The array arm's pointwise step, taken outside the mutual block: the
recursion there is on the CODE, so the element list needs its own
induction and it takes the code-level fact as a hypothesis rather than
as a recursive call. -/
private theorem map_eraseR_map_elR {a : Ast} (ih : ∀ v : El a, eraseR (elR a v) = encode a v) :
    ∀ xs : List (El a), (xs.map (elR a)).map eraseR = xs.map (encode a)
  | [] => rfl
  | x :: rest => by
    simp only [List.map_cons, ih x, map_eraseR_map_elR ih rest]

mutual

/-- **The bridge factors through the ratified projection.** Erasing the
links gives `encode` on the nose, so the payload the bridge produces is
the payload the plane already pinned — differing at reference positions
and nowhere else. This is what makes the fold a mirror of the runtime's
two passes rather than a second, independent wire shape. -/
theorem eraseR_elR : ∀ (a : Ast) (v : El a), eraseR (elR a v) = encode a v
  | .null, _ => rfl
  | .bool, _ => rfl
  | .int, i => by simp only [elR, encode, eraseR_jsonR]
  | .str, _ => rfl
  | .lit l, _ => by simp only [elR, encode, eraseR_jsonR]
  | .ref t, r => rfl
  | .arr a, xs => by
    simp only [elR, encode, eraseR, eraseItems_eq_map]
    exact congrArg Json.Value.arr
      (map_eraseR_map_elR (fun v => eraseR_elR a v) xs)
  | .struct fs, x => by
    simp only [elR, encode, eraseR, eraseFields_elRFields fs x]
  | .union ms _, x => by
    simp only [elR, encode, eraseR_elRMembers (discriminatedB ms) ms x]

theorem eraseFields_elRFields :
    ∀ (fs : List (String × Bool × Ast)) (x : ElFields fs),
      eraseFields (elRFields fs x) = encodeFields fs x
  | [], _ => rfl
  | (n, true, a) :: fs, (x, rest) => by
    cases x with
    | none =>
      simp only [elRFields, encodeFields, List.nil_append,
        eraseFields_elRFields fs rest]
    | some v =>
      simp only [elRFields, encodeFields, List.singleton_append, eraseFields,
        eraseR_elR a v, eraseFields_elRFields fs rest]
  | (n, false, a) :: fs, (v, rest) => by
    simp only [elRFields, encodeFields, eraseFields, eraseR_elR a v,
      eraseFields_elRFields fs rest]

theorem eraseR_elRMembers :
    ∀ (b : Bool) (ms : List Ast) (x : cond b (ElMembers ms) Empty),
      eraseR (elRMembers b ms x) = encodeMembers b ms x
  | true, [], x => Empty.elim x
  | true, [a], x => eraseR_elR a x
  | true, a :: b :: rest, x => by
    match x with
    | Sum.inl y => exact eraseR_elR a y
    | Sum.inr y => exact eraseR_elRMembers true (b :: rest) y
  | false, _, x => Empty.elim x

end

/-! ## The store node

Three stages, in the runtime's own order: fold to a reference-bearing
tree, lower it to a marker-bearing payload plus the reference array,
render the envelope compactly. `none` is the reserved-key refusal
travelling out from `lower` — a code MAY spell a field literally named
`$ref`, `Ast.WF` admits it, and the model refuses to escape it, so the
projection is partial by design and not by omission. -/

/-- The projection envelope: `{revision, value}`, the exact discipline
the runtime's `payloadFor` spells. -/
def envelope (revision : Nat) (payload : Json.Value) : Json.Value :=
  .obj [("revision", .nat revision), ("value", payload)]

/-- The payload TEXT and the reference array a described value projects
to. Text rather than bytes because the canonical rendering IS the
identity here and the bytes are its UTF-8 image. -/
def project (revision : Nat) (a : Ast) (v : El a) :
    Option (String × List Ref) :=
  (Cas.lower (elR a v)).map fun (payload, refs) =>
    (Json.renderCompact (envelope revision payload), refs)

/-- The node a described value resides at, at a caller-given scheme
version and kind tag. -/
def toNode (version tag : UInt8) (revision : Nat) (a : Ast) (v : El a) :
    Option Node :=
  (project revision a v).map fun (text, refs) =>
    { version := version, tag := tag, payload := text.toUTF8.toList,
      refs := refs }

/-- The front door, at a native carrier: the Lean mirror of the
runtime's `Cas.value({kindTag, revision, schema}).put`. -/
def putNode {α : Type u} [d : Described α]
    (version tag : UInt8) (revision : Nat) (x : α) : Option Node :=
  toNode version tag revision d.code (d.toEl x)

/-- The payload text at a native carrier — what a byte pin compares. -/
def putPayload {α : Type u} [d : Described α] (revision : Nat) (x : α) :
    Option String :=
  (project revision d.code (d.toEl x)).map (·.1)

/-- The reference array at a native carrier — what the store's
admission law checks. -/
def putRefs {α : Type u} [d : Described α] (revision : Nat) (x : α) :
    Option (List Ref) :=
  (project revision d.code (d.toEl x)).map (·.2)

/-! ## The forced-index law, inherited

Every payload this bridge produces satisfies the decode-side judge, for
every code and every value, because `Values/Refs.lean`'s coherence law
is now general. Nothing here re-proves it; the point of stating it at
this grain is that a projection never has to. -/

/-- The node's payload markers read `0, 1, …, n-1` in canonical byte
order against the node's own reference array. -/
theorem project_wellRefIndexed {revision : Nat} {a : Ast} {v : El a}
    {text : String} {refs : List Ref}
    (h : project revision a v = some (text, refs)) :
    ∃ payload, Cas.lower (elR a v) = some (payload, refs) ∧
      Cas.wellRefIndexed payload refs.length = true := by
  simp only [project, Option.map_eq_some_iff] at h
  obtain ⟨⟨payload, rs⟩, hlow, heq⟩ := h
  simp only [Prod.mk.injEq] at heq
  obtain ⟨_, hr⟩ := heq
  subst hr
  exact ⟨payload, hlow, Cas.wellRefIndexed_lower hlow⟩

/-- The reference array is a function of the value, not of the
traversal: it is exactly the links of the folded tree, in canonical
order. -/
theorem project_refs {revision : Nat} {a : Ast} {v : El a}
    {text : String} {refs : List Ref}
    (h : project revision a v = some (text, refs)) :
    refs = Cas.linksOf (Cas.canonR (elR a v)) := by
  simp only [project, Option.map_eq_some_iff] at h
  obtain ⟨⟨payload, rs⟩, hlow, heq⟩ := h
  simp only [Prod.mk.injEq] at heq
  obtain ⟨_, hr⟩ := heq
  subst hr
  exact (Cas.markerScan_lower hlow).1

/-! ## The read path — a named obligation, and why it is not forced here

The round trip `Node → El a` is NOT cheap once the coherence law lands,
and stating that plainly is better than forcing a weak version of it.
What it needs, precisely:

    raise : Json.Value → List Ref → Option RValue

the inverse walk of `lower` — the mirror of the runtime's
`resolveMarkers` — restoring the k-th marker to the k-th reference
while verifying the forced-index law as it goes. That is a NEW
recursion in `Values/Refs.lean` with its own refusals, and it owes two
laws of its own before it is worth anything:

    raise_lower  : lower v = some (p, rs) → raise p rs = some (canonR v)
    lower_raise  : raise p rs = some v → lower v = some (p, rs)

The coherence law is a PREMISE of the first, not a substitute for it:
knowing the markers read `0…n-1` says the walk will not run out of
references, and says nothing about the tree it rebuilds. Only with
`raise` in hand does the value-plane round trip

    decode a (eraseR <$> raise payload refs) = some v

follow from `decode_encode` and `eraseR_elR`, and note the `canonR` in
the first law: the round trip recovers the value up to CANONICAL
SPELLING, which is the honest statement — `lower` sorts, and sorting is
not injective on spellings. `Described.decode_encode` then lifts it to
the native carrier.

Two things this module deliberately does not pretend. First, the read
path is where the reserved-key asymmetry becomes visible: `lower`
refuses `$ref` in plain data, but nothing on the encode side refuses a
user field literally named `$link`, and the runtime's `resolveMarkers`
DOES refuse it on read (`refMarkers.ts:220-224`). A tree carrying such
a field lowers here and is unreadable there. That is a genuine mirror
gap, named rather than papered over; closing it is a refusal-side
change to `lower`, and it is a change to a landed wire discipline, so
it wants a ruling and not a patch. Second, `El (.decl …)`, `El
(.enum …)` and `El (.tuple …)` are `Empty`, so this bridge's arms for
them never fire — every law here holds over those codes vacuously, in
the same register as the rest of the plane.
-/

end Cas.Schema
