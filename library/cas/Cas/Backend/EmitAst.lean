import Cas.Backend.Ts
import Cas.Schema.SelfCodec

/-!
# Lowering canonical schema codes to Effect Schema expressions

`Ast → Ts.Expr` over Effect's native `Schema` constructor surface, with
structural sharing against an environment of already-emitted names: a
subterm equal to an earlier named code renders as that name — the
factored form a careful hand would write, derived mechanically.
-/

namespace Cas.Backend

open Cas.Schema Cas.Backend.Ts

/- Structural equality of codes (literals by value). -/
mutual

def astBeq : Ast → Ast → Bool
  | .null, .null | .bool, .bool | .int, .int | .str, .str => true
  | .lit a, .lit b => a == b
  | .arr a, .arr b => astBeq a b
  | .struct fs, .struct gs => fieldsBeq fs gs
  | .ref a, .ref b => a == b
  | .decl i p ps, .decl j q qs => i == j && p == q && paramsBeq ps qs
  | .union ms m, .union ns n => m == n && membersBeq ms ns
  -- Members compare POSITIONWISE here too: an enum's order is its
  -- identity, so two enums over the same pairs in different orders are
  -- different codes and must not share a name.
  | .enum ms, .enum ns => ms == ns
  -- Elements compare POSITIONWISE, optionality bit included: a tuple's
  -- positions are its identity.
  | .tuple e es r, .tuple f fs s =>
    elementBeq e f && elementsBeq es fs && restBeq r s
  | _, _ => false

def elementBeq : Bool × Ast → Bool × Ast → Bool
  | (o, a), (p, b) => o == p && astBeq a b

def elementsBeq : List (Bool × Ast) → List (Bool × Ast) → Bool
  | [], [] => true
  | e :: es, f :: fs => elementBeq e f && elementsBeq es fs
  | _, _ => false

def restBeq : Option Ast → Option Ast → Bool
  | none, none => true
  | some a, some b => astBeq a b
  | _, _ => false

def fieldsBeq :
    List (String × Bool × Ast) → List (String × Bool × Ast) → Bool
  | [], [] => true
  | (n, o, a) :: fs, (m, p, b) :: gs =>
    n == m && o == p && astBeq a b && fieldsBeq fs gs
  | _, _ => false

def paramsBeq : List Ast → List Ast → Bool
  | [], [] => true
  | a :: as, b :: bs => astBeq a b && paramsBeq as bs
  | _, _ => false

/-- Members compare POSITIONWISE: two unions are equal only if their
members agree in order, which is what order-is-identity means for the
sharing environment too. -/
def membersBeq : List Ast → List Ast → Bool
  | [], [] => true
  | a :: as, b :: bs => astBeq a b && membersBeq as bs
  | _, _ => false

end

instance : BEq Ast := ⟨astBeq⟩

private def schema (name : String) : Expr := .ident ("Schema." ++ name)
private def canonicalSchema (name : String) : Expr :=
  .ident ("CanonicalSchema." ++ name)

def litExpr : LitVal → Expr
  | .null => .jsNull
  | .bool b => .bool b
  | .int i => .int i.val
  | .str s => .str s

/-- One enum member as an object-literal entry. The key is the member
NAME, quoted the way `Ts.Expr.str` quotes — so a name and a string
literal come out spelled identically, and there is one quoting rule in
this emitter rather than two. -/
private def enumEntry (m : String × EnumValue) : String × Expr :=
  ("\"" ++ m.1 ++ "\"",
    match m.2 with
    | .str s => .str s
    | .int i => .int i.val)

/-- An enum's members as object-literal entries, in the code's order. -/
private def enumEntries : List (String × EnumValue) → List (String × Expr)
  | [] => []
  | m :: ms => enumEntry m :: enumEntries ms

mutual

/-- Lower one code node; the name environment is consulted at every
node except the root of the code being emitted. -/
private def constructorGo (env : List (String × Ast)) (atRoot : Bool)
    (a : Ast) : Expr :=
  match (if atRoot then none else env.find? (fun e => astBeq e.2 a)) with
  | some (name, _) => .ident name
  | none =>
    match a with
    | .null => schema "Null"
    | .bool => schema "Boolean"
    | .int => schema "Int"
    | .str => schema "String"
    | .lit .null => schema "Null"
    | .lit v => .call (schema "Literal") [litExpr v]
    | .arr item => .call (schema "Array") [constructorGo env false item]
    | .struct fields =>
      .call (schema "Struct") [.objectML (constructorFields env fields)]
    | .ref tag => .call (canonicalSchema "ref") [.int tag.toNat]
    -- A general declaration lowers to the built-in Effect's own
    -- `toCode` prints for that id — the point of speaking Effect's
    -- declaration ids verbatim (PLAN P3/P4).
    | .decl .date _ _ => schema "Date"
    | .decl .url _ _ => schema "URL"
    | .decl .option _ ps => .call (schema "Option") (constructorParams env ps)
    -- `Schema.Union([…], { mode })` — Effect's own constructor
    -- (`Schema.ts:4912`), members in the code's order, and the mode
    -- ALWAYS spelled. Effect's `toCodeDocument` elides `anyOf` because
    -- it is the constructor's default; the estate does not, because a
    -- spelling that depends on a default is a spelling the reader has
    -- to know a default to check (D4).
    | .union members mode =>
      .call (schema "Union") [
        .arr (constructorMembers env members),
        .object [("mode", .str mode.wire)]]
    -- `Schema.Enum(<enum-like object>)` — Effect's own constructor
    -- (`Schema.ts:3021`), whose parameter type is
    -- `{ [x: string]: string | number }`: a TypeScript `enum` object
    -- and an object LITERAL are both inhabitants, and both build the
    -- same `SchemaAST.Enum` from `Object.keys` order. The estate emits
    -- the literal; see the note below the emitter for why.
    | .enum members =>
      .call (schema "Enum") [.object (enumEntries members)]
    -- `Schema.Tuple([…])`, and `Schema.TupleWithRest(Schema.Tuple([…]),
    -- [rest])` when there is a rest type — Effect's own printer's two
    -- shapes verbatim (`toCodeDocument.ts:486-504`), including
    -- `Schema.optionalKey` on an optional element. The third shape that
    -- printer has, `Schema.Array(item)` for the elementless case, is
    -- `.arr`'s lowering and stays there: the carrier cannot spell an
    -- elementless tuple, so this arm never has to choose.
    | .tuple first more rest =>
      let elements :=
        .arr (constructorElement env first :: constructorElements env more)
      match rest with
      | none => .call (schema "Tuple") [elements]
      | some item =>
        .call (schema "TupleWithRest") [
          .call (schema "Tuple") [elements],
          .arr [constructorGo env false item]]
    -- A reference lowers to the NAME it carries, which is the same move
    -- this emitter already makes for a shared code: `env.find?` above
    -- answers `.ident name`, and a references-table entry is that
    -- binding named ahead of time rather than discovered. Making those
    -- names RESOLVE — emitting the table as a block of consts, in
    -- dependency order — is the materialization slice's work
    -- (Lane A slice 4), which this ticket does not open.
    | .reference name => .ident name
    -- A suspend lowers to its THUNK. Effect's faithful spelling is
    -- `Schema.suspend(() => …)`, and the estate cannot print it yet: the
    -- TypeScript fragment (`Cas/Backend/Ts.lean`) has no arrow, and the
    -- fragment grows only with a real consumer, which is the
    -- materialization slice and not this one. The simplification is safe
    -- where it can currently be reached — a `susp` breaks a DEFINITION
    -- cycle, and in a materialized module the const binding is what
    -- provides the laziness — but it is a simplification, so it is owed
    -- rather than assumed. OWED (slice 4): the arrow, and
    -- `Schema.suspend(() => thunk)` printed verbatim. No registered
    -- fixture reaches this arm today, so no emitted byte depends on it.
    | .susp thunk => constructorGo env false thunk

private def constructorElement (env : List (String × Ast)) :
    Bool × Ast → Expr
  | (opt, code) =>
    if opt then .call (schema "optionalKey") [constructorGo env false code]
    else constructorGo env false code

private def constructorElements (env : List (String × Ast)) :
    List (Bool × Ast) → List Expr
  | [] => []
  | e :: es => constructorElement env e :: constructorElements env es

private def constructorFields (env : List (String × Ast)) :
    List (String × Bool × Ast) → List (String × Expr)
  | [] => []
  | (name, opt, code) :: rest =>
    (name,
      if opt then .call (schema "optionalKey") [constructorGo env false code]
      else constructorGo env false code) :: constructorFields env rest

private def constructorParams (env : List (String × Ast)) :
    List Ast → List Expr
  | [] => []
  | code :: rest => constructorGo env false code :: constructorParams env rest

private def constructorMembers (env : List (String × Ast)) :
    List Ast → List Expr
  | [] => []
  | code :: rest => constructorGo env false code :: constructorMembers env rest

end

/-- Lower a code, replacing any subterm equal to an earlier named code
by its name. The name environment is consulted at every node except
the root of the code being emitted. -/
def constructorExpr (env : List (String × Ast)) : Ast → Expr :=
  constructorGo env (atRoot := true)

/-! ## The union lowering, pinned

The two modes as rendered bytes, pinned at elaboration, so the
lowering cannot drift from the shape Effect's own `Schema.Union`
accepts (`Schema.ts:4912` — `Union(members, options?: { mode? })`).
The pins are `#guard`s rather than `rfl` examples: the constructor
emitter is a well-founded mutual recursion, so its equations do not
reduce in the kernel, and the house rule is that executable checks run
at elaboration and never as a kernel `decide`.

Where this deliberately differs from Effect's `toCodeDocument`
(`toCodeDocument.ts:559-574`): that printer elides `anyOf` because it
is the constructor's default, and — when every member is a bare
literal — collapses the union to `Schema.Literals([…])`, which drops
the mode entirely, `oneOf` included. The estate spells the mode always
and collapses nothing (D4). Both texts evaluate to the same schema for
`anyOf`; for an all-literal `oneOf` they do not, which is a finding
about Effect's generator, recorded and not worked around. -/

/-- The rendered lowering of one code — what the pins below compare. -/
private def renderedConstructor (a : Ast) : String :=
  Render.expr house0 0 (constructorExpr [] a)

#guard renderedConstructor (.union [.str, .bool] .anyOf) ==
  "Schema.Union([Schema.String, Schema.Boolean], { mode: \"anyOf\" })"

#guard renderedConstructor (.union [.str, .bool] .oneOf) ==
  "Schema.Union([Schema.String, Schema.Boolean], { mode: \"oneOf\" })"

-- Order is identity all the way out to the emitted source: reversing
-- the members emits different text, because it is a different code.
#guard renderedConstructor (.union [.bool, .str] .anyOf) ==
  "Schema.Union([Schema.Boolean, Schema.String], { mode: \"anyOf\" })"

-- No flattening at the lowering either: the nested union stays nested,
-- and each level carries its own mode.
#guard renderedConstructor (.union [.null, .union [.arr .str, .bool] .oneOf] .anyOf) ==
  "Schema.Union([Schema.Null, Schema.Union([Schema.Array(Schema.String), " ++
    "Schema.Boolean], { mode: \"oneOf\" })], { mode: \"anyOf\" })"

/-! ## The enum lowering, pinned — and a recorded deviation

Effect's own printer (`toCodeDocument.ts:454-469`) emits an ARTIFACT —
`enum _Enum0 { "Up" = "Up", … }` as a separate declaration — and refers
to it as `Schema.Enum(_Enum0)`. The estate emits the enum-like object
INLINE: `Schema.Enum({ "Up": "Up", … })`.

The call this records (A-1): the two texts build the SAME schema.
`Schema.Enum` takes any `{ [x: string]: string | number }`
(`Schema.ts:3021`) and reads its members as
`Object.keys(enums).filter(key => typeof enums[enums[key]] !== "number")
.map(key => [key, enums[key]])` — insertion order, with the numeric
enum's reverse mappings filtered out. An object literal has no reverse
mappings, so the filter is a no-op on it and the member list is
identical, in identical order.

What the estate gains by deviating: the lowering stays a FUNCTION of the
code alone. Effect's spelling needs a fresh identifier per enum, which
means a counter threaded through the recursion and a second output
channel for the artifacts — plumbing this emitter does not have, and
plumbing whose only purpose would be to reproduce a name that carries no
meaning. The emitted expression is self-contained, so a code's lowering
does not depend on where in a module it appears. Growing the artifact
channel is a backend increment, owed when a consumer wants the named
`enum` declaration itself (a TypeScript `enum` TYPE, which the object
literal does not declare). -/

#guard renderedConstructor (.enum [("Up", .str "Up"), ("Down", .str "Down")]) ==
  "Schema.Enum({ \"Up\": \"Up\", \"Down\": \"Down\" })"

#guard renderedConstructor (.enum [("One", .int ⟨1, by decide⟩),
    ("MinusOne", .int ⟨-1, by decide⟩)]) ==
  "Schema.Enum({ \"One\": 1, \"MinusOne\": -1 })"

-- Order is identity out to the emitted source here too: reversing the
-- members emits different text, because it is a different code.
#guard renderedConstructor (.enum [("Down", .str "Down"), ("Up", .str "Up")]) ==
  "Schema.Enum({ \"Down\": \"Down\", \"Up\": \"Up\" })"

/-! ## The tuple lowering, pinned

Effect's printer's own two shapes (`toCodeDocument.ts:486-504`), and its
`Schema.optionalKey` on an optional element. Its third shape,
`Schema.Array(item)` for `{elements:[], rest:[t]}`, is `.arr`'s lowering
and stays there — the carrier cannot spell an elementless tuple, so the
choice never arises on this arm. -/

#guard renderedConstructor (.tuple (false, .str) [(false, .int)] none) ==
  "Schema.Tuple([Schema.String, Schema.Int])"

#guard renderedConstructor (.tuple (false, .str) [(true, .int)] none) ==
  "Schema.Tuple([Schema.String, Schema.optionalKey(Schema.Int)])"

#guard renderedConstructor (.tuple (false, .str) [] (some .bool)) ==
  "Schema.TupleWithRest(Schema.Tuple([Schema.String]), [Schema.Boolean])"

-- Position is identity out to the emitted source: swapping two elements
-- emits different text, because it is a different code.
#guard renderedConstructor (.tuple (false, .int) [(false, .str)] none) ==
  "Schema.Tuple([Schema.Int, Schema.String])"

-- A tuple nests like any other code, and a plain array is still a plain
-- array beside it.
#guard renderedConstructor
    (.arr (.tuple (false, .str) [(false, .arr .int)] none)) ==
  "Schema.Array(Schema.Tuple([Schema.String, Schema.Array(Schema.Int)]))"

end Cas.Backend
