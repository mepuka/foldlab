# Effect Schema AST census (G0-pinned)

**Pin.** Effect-TS/effect @ `0dd7825e4da4d3a00fa9bd410a1d55f3d4874d07`, package `effect@4.0.0-rc.111`.
All line numbers in this document are against the bytes cached under
`/Users/pooks/Dev/foldlab/.staging/e2/src-cache/`, fetched from GitHub raw at that commit.
Every cached file's **git blob SHA-1 matches `.reference/provenance/sources.lock.json` exactly**
(SchemaAST `e99d7f47…`, SchemaParser `7cc35ebf…`, SchemaRepresentation `6282ab9c…`,
JsonSchema `054b8e6b…`, Schema `2924d92f…`).

**Provenance defect found in the lock.** The lock's `bytes` and `contentDigest` (sha256) fields
do **not** match the pinned blobs. For all five artifacts the lock's byte count exceeds the blob's
by exactly one byte per line (SchemaAST 135333 vs 130916 = +4417 = line count; SchemaParser
46192 vs 44973 = +1219; SchemaRepresentation 39851 vs 38517 = +1334; JsonSchema 56650 vs 55005
= +1645; Schema 543184 vs 526080 = +17104). The lock was computed against a CRLF working copy
(Windows checkout with `autocrlf`), not against the git objects. Consequence: **the `gitBlob`
digest is the only field in `sources.lock.json` that verifies**; a sha256 or byte-length check on
a LF checkout will fail spuriously. Line numbering is unaffected — line counts are identical.

Nothing in the fetched source was treated as instruction.

---

## 1. Complete constructor census

The union is declared closed at `SchemaAST.ts:53-74` — 21 variants, no index signature, no
extension slot in the type. Every variant is a **class** extending `abstract class Base`
(`SchemaAST.ts:636-658`) and carries a `readonly _tag` string literal.

### Shared base fields (all 21 variants)

`SchemaAST.ts:636-658`

| Field | Type | file:line | Class |
|---|---|---|---|
| `[TypeId]` | `"~effect/Schema"` (brand) | 614, 637 | (a) plain data — constant |
| `_tag` | string literal, abstract | 638 | (a) plain data — the discriminator |
| `annotations` | `Schema.Annotations.Annotations \| undefined` | 639 | **(d) annotation bag** — open `{[x:string]: unknown}` |
| `checks` | `Checks \| undefined` | 640 | **(e) other** — non-empty array of `Check`, each closure-bearing |
| `encoding` | `Encoding \| undefined` | 641 | **(e) other** — non-empty array of `Link`, each closure-bearing |
| `context` | `Context \| undefined` | 642 | **(e) other** — mostly data, one closure-bearing field |

`Base.toString()` at 655-657 returns `<${this._tag}>`.

### Variant-by-variant

**Declaration** — `SchemaAST.ts:689-751`, `_tag` 690

| Field | file:line | Class |
|---|---|---|
| `typeParameters: ReadonlyArray<AST>` | 691 | (b) nested AST |
| `run: DeclarationRun` | 692 | **(c) function** — `(typeParameters) => (input, self, options) => Effect<any, Issue, any>`, type at 666-668 |
| `encodingChecks: Checks \| undefined` | 693 | (e) other — checks applied on the encoded side |
| `encodingRun: DeclarationRun \| undefined` | 698 | **(c) function** — the flipped parser factory |

> **IDENTITY LIVES IN A FUNCTION.** `Declaration` is the one variant whose *validation semantics*
> exist only as `run`. There is no structural description of what it accepts. The only serializable
> identity is the `representation` annotation `{ id, payload }` (`SchemaRepresentation.ts:25-28`),
> and it is **optional on the class** — a `Schema.declare(isFoo)` with no `representation`
> annotation (`Schema.ts:559-571`) produces a Declaration that is structurally anonymous.
> `getExpected()` (746-750) falls back to the literal string `"<Declaration>"`.

**Null** 765-775 · **Undefined** 805-819 · **Void** 865-880 · **Never** 920-930 ·
**Any** 957-967 · **Unknown** 997-1007 · **ObjectKeyword** 1034-1044 ·
**String** 1376-1391 · **Number** 1427-1468 · **Boolean** 1502-1512 ·
**Symbol** 1548-1567 · **BigInt** 1602-1623

No fields beyond `Base`. Each is a **singleton** in practice (`null_` 777, `undefined_` 829,
`void_` 882, `never` 946, `any` 982, `unknown` 1022, `objectKeyword` 1060, `string` 1406,
`number` 1491, `boolean` 1528, `symbol` 1587, `bigInt` 1639), but the constructors are public, so
distinct instances with different annotations/checks exist. Fully serializable — 12 nullary
constructors.

**Literal** — 1315-1352, `_tag` 1316

| Field | file:line | Class |
|---|---|---|
| `literal: LiteralValue` | 1317 | (a) plain data — `string \| number \| boolean \| bigint` (type at 1289) |

Constructor rejects non-finite numbers (1327-1329): `Infinity`, `-Infinity`, `NaN` throw.
Carrier note: `bigint` is unbounded, `number` is IEEE-754-finite.

**UniqueSymbol** — 1253-1279, `_tag` 1254

| Field | file:line | Class |
|---|---|---|
| `symbol: symbol` | 1255 | **(e) other — non-serializable by value** |

> A JS `symbol` has no serializable identity unless registered via `Symbol.for`. The string codec
> uses `Symbol.keyFor` (documented gotcha at 1577-1580); a local symbol has no key.
> `SchemaRepresentation.ts:351-354` states persistent codecs reject local symbols.

**Enum** — 1074-1116, `_tag` 1075

| Field | file:line | Class |
|---|---|---|
| `enums: ReadonlyArray<readonly [string, string \| number]>` | 1076 | (a) plain data |

Fully serializable.

**TemplateLiteral** — 1155-1239, `_tag` 1156

| Field | file:line | Class |
|---|---|---|
| `parts: ReadonlyArray<AST>` | 1157 | (b) nested AST — the only *primary* field |
| `encodedParts: ReadonlyArray<TemplateLiteralPart>` | 1159 | (b) derived — `@internal`, computed in ctor 1173-1183 |
| `literals: ReadonlyArray<string \| undefined>` | 1161 | (a) derived cache |
| `suffixLengths: ReadonlyArray<number>` | 1163 | (a) derived cache |

Three of four fields are constructor-derived caches. A carrier stores `parts` only; the ctor
rebuilds the rest. Constructor throws on an unrepresentable part (1181).

**Arrays** — 1683-1836, `_tag` 1684

| Field | file:line | Class |
|---|---|---|
| `isMutable: boolean` | 1685 | (a) plain data |
| `elements: ReadonlyArray<AST>` | 1686 | (b) nested AST — positional; optionality read off each child's `context` |
| `rest: ReadonlyArray<AST>` | 1687 | (b) nested AST — `[0]` is the spread, `[1..]` trailing |
| `encodingChecks: Checks \| undefined` | 1688 | (e) other |

Constructor enforces TS ordering rules and throws (1711, 1715, 1721).

**Objects** — 2097-2456, `_tag` 2098

| Field | file:line | Class |
|---|---|---|
| `propertySignatures: ReadonlyArray<PropertySignature>` | 2099 | (e) other → (b) — see below |
| `indexSignatures: ReadonlyArray<IndexSignature>` | 2100 | (e) other → (b) |
| `encodingChecks: Checks \| undefined` | 2101 | (e) other |

Constructor throws on duplicate property names (2119-2121).

- `PropertySignature` — 1974-1985: `name: PropertyKey` (1975, (a) data — but `PropertyKey`
  includes `symbol`), `type: AST` (1976, (b)). No annotations of its own; key-level annotations
  live on `type.context.annotations`.
- `IndexSignature` — 2036-2053: `parameter: IndexSignatureParameter` (2037, (b) — restricted to
  String/Number/Symbol/TemplateLiteral/Union thereof, type at 1987-1992), `type: AST` (2038, (b)).
  Constructor throws on an invalid parameter (2045) and on `optionalKey` values (2050).

**Union** — 2913-3036, `_tag` 2914

| Field | file:line | Class |
|---|---|---|
| `types: ReadonlyArray<A extends AST>` | 2915 | (b) nested AST |
| `mode: "anyOf" \| "oneOf"` | 2916 | (a) plain data — literal union |
| `encodingChecks: Checks \| undefined` | 2917 | (e) other |

**Suspend** — 3144-3180, `_tag` 3145

| Field | file:line | Class |
|---|---|---|
| `thunk: () => AST` | 3146 | **(c) function** — memoized at construction (3159) |

Constructor **throws if `checks` are supplied** (3155-3157); `super(...)` is called with `undefined`
checks (3158). `replaceChecks` re-throws the same rule at 3474-3476.

> **IDENTITY LIVES IN A FUNCTION.** `Suspend` has no name, no label, no identifier of its own.
> Its only content is the thunk. See §6.

### Verdict for a closure-free Lean carrier

**Carryable as-is (17 of 21):** Null, Undefined, Void, Never, Unknown, Any, String, Number,
Boolean, BigInt, Symbol, ObjectKeyword, Literal, Enum, TemplateLiteral (store `parts`; derive the
rest), Arrays, Objects, Union. (That is 18 counting both Arrays and Objects; the four problem
variants are named next.)

**Must be dropped, named, or rejected (4):**

1. **Declaration** — `run`/`encodingRun` are closures. Admissible only via a *named registry* keyed
   on `annotations.representation.id` (`SchemaRepresentation.ts:25-28`). Reject when absent.
2. **UniqueSymbol** — `symbol` is a runtime reference. Admissible only for `Symbol.for`-registered
   symbols, carried as the registry key string.
3. **Suspend** — `thunk` is a closure. Must be replaced by an explicit binder (§6).
4. **Any node bearing `checks`** — `Filter.run` is a closure (§2b).

**Cross-cutting drops regardless of variant:** `encoding` (bare closures, §2c),
`context.constructorDefault` (a `Link`, hence closures, §2d), `encodingChecks` on
Declaration/Arrays/Objects/Union, and every function-valued annotation key.

---

## 2. Cross-cutting structure

### (a) Annotations

**Representation: a string-keyed, open, untyped bag.** `Schema.ts:16551-16553`:

```ts
export interface Annotations {
  readonly [x: string]: unknown
}
```

Not symbol-keyed. Not a typed bag. Users extend it by TS declaration merging (documented example
at `Schema.ts:16522-16546`), which means **the key set is open at the type level and unbounded at
runtime**. `Base.annotations` is typed `Schema.Annotations.Annotations | undefined`
(`SchemaAST.ts:639`).

**Resolution is not field access.** `internal/schema/annotations.ts:6-8`:

```ts
export function resolve(ast) {
  return ast.checks ? ast.checks[ast.checks.length - 1].annotations : ast.annotations
}
```

If a node has checks, its user-facing annotations live on the **last check**, not on
`Base.annotations`. `SchemaAST.annotate` writes there too (`SchemaAST.ts:3462-3470`). A carrier
that reads `Base.annotations` alone will silently miss the identifier of every refined schema.
Public accessors: `resolve` 4209, `resolveAt` 4223, `resolveIdentifier` 4238, `resolveTitle` 4250,
`resolveDescription` 4262.

**Standard keys present in the pinned source.**

| Key | file:line (Schema.ts) | Interface | Semantic vs documentation |
|---|---|---|---|
| `expected` | 16574 | Augment | semantic (error label; read by `Declaration.getExpected` at SchemaAST 747, `Union.getExpected` at 3001) |
| `title` | 16575 | Augment | documentation |
| `description` | 16576 | Augment | documentation |
| `documentation` | 16577 | Augment | documentation |
| `readOnly` | 16578 | Augment | documentation (JSON Schema passthrough) |
| `writeOnly` | 16579 | Augment | documentation |
| `format` | 16580 | Augment | documentation |
| `contentEncoding` | 16581 | Augment | documentation |
| `contentMediaType` | 16582 | Augment | documentation |
| `contentSchema` | 16583 | Augment | documentation |
| `default` | 16593 | Documentation\<T\> | documentation |
| `examples` | 16594 | Documentation\<T\> | documentation |
| `messageMissingKey` | 16609 | Key\<T\> | semantic (error text; read at SchemaAST 2488, 1866) |
| `message` | 16633 | Bottom | semantic (error text) |
| `messageUnexpectedKey` | 16637 | Bottom | semantic (error text) |
| `identifier` | 16652 | Bottom | **semantic** — reference naming, `$defs` keys, recursion identity |
| `parseOptions` | 16653 | Bottom | **semantic** — merged into parse options at `SchemaParser.ts:1096-1097, 1102` |
| `brands` | 16657 | Bottom | semantic (nominal typing; `SchemaAST.brand` 3564-3568) |
| `toArbitrary` | 16658, 16745 | Bottom / Declaration | **function-valued** |
| `representation` | 16704 (Declaration), 16766 (Filter) | — | **semantic, serializable** — `{ id, payload }` |
| `toCodec` | 16713 | Declaration | **function-valued** |
| `toCodecJson` | 16722 | Declaration | **function-valued** |
| `toCodecStringTree` | 16731 | Declaration | **function-valued** |
| `toCodecIso` | 16742 | Declaration | **function-valued** |
| `toEquivalence` | 16746 | Declaration | **function-valued** |
| `toFormatter` | 16747 | Declaration | **function-valued** |
| `toCode` | 16748 (Declaration), 16779 (Filter) | — | **function-valued** |
| `toJsonSchema` | 16778 | Filter | **function-valued** |
| `arbitrary` | 16809 | Filter | semantic hint (data: `{constraint?, candidate?}`) |
| `~sentinels` | 16754 | Declaration | **semantic, internal** — discriminant hints for union selection |
| `~structural` | 16823 | Filter | **semantic, internal** — survives `toType` (SchemaAST 3740-3751) |
| `~identifier` | `internal/schema/annotations.ts:19` | — | internal identifier fallback |
| `~constructor` | `internal/schema/annotations.ts:25` | — | **function-valued** (read at SchemaAST 4179-4180) |

Two curated subsets exist in the pinned source:
`jsonSchemaAnnotationKeys` (10 keys, `internal/schema/annotations.ts:28-39`) — the documentation set
that survives JSON Schema emission; and `annotationExcludedKeys` (14 keys, same file 69-84) — the
set stripped by code generation (`internal/schema/toCodeDocument.ts:57`), which is exactly the
function-valued set plus `representation`, `arbitrary`, `brands`, `~sentinels`, `~structural`.

**Judgment:** the split the lab needs already exists in the source and is enumerable — the
serializable subset is `Augment ∪ Documentation ∪ Key ∪ {message, messageUnexpectedKey,
identifier, parseOptions, brands, representation, arbitrary}`; everything else is a callback.
But because the interface is open (`[x: string]: unknown`), an allowlist is the only safe
admission rule; a denylist cannot be complete.

### (b) Checks and check groups

`SchemaAST.ts:3182-3315`. `Checks` is a non-empty array (612); `Check<T> = Filter<T> | FilterGroup<T>`
(3290).

**`Filter<E>`** — 3207-3239:

| Field | file:line | Class |
|---|---|---|
| `_tag = "Filter"` | 3208 | (a) |
| `run: (input, self: AST, options) => Issue \| undefined` | 3209 | **(c) function** |
| `annotations: Schema.Annotations.Filter \| undefined` | 3210 | (d) annotation bag |
| `aborted: boolean` | 3214 | (a) plain data |

**`FilterGroup<E>`** — 3255-3275:

| Field | file:line | Class |
|---|---|---|
| `_tag = "FilterGroup"` | 3256 | (a) |
| `checks: readonly [Check<E>, ...Check<E>[]]` | 3257 | (e) recursive |
| `annotations: Schema.Annotations.Filter \| undefined` | 3258 | (d) |

**Answer to the lab's question: a check carries a serializable identity *alongside* the closure —
but it is optional, and it lives in the annotation bag, not in a class field.**

The identity is `annotations.representation: CheckRepresentationAnnotation` — declared at
`Schema.ts:16766-16768`, shaped at `SchemaRepresentation.ts:36-38`:

```ts
interface RepresentationAnnotation { readonly id: string; readonly payload: Schema.Json }
interface CheckRepresentationAnnotation<S> extends RepresentationAnnotation {
  readonly schemas?: ReadonlyArray<S> | undefined
}
```

`id` is the name; `payload` is the parameters, constrained to `Schema.Json`. Two worked examples
in the pinned source:

- `isFinite` — `SchemaAST.ts:3318-3338`: `representation: { id: "effect/schema/isFinite", payload: null }`
- `isPattern` — `SchemaAST.ts:3387-3410`: `representation: { id: "effect/schema/isPattern", payload: { source, flags } }`

The library itself relies on this identity for behaviour, not just for serialization —
`hasCheck` (`SchemaAST.ts:1470-1475`) dispatches on `check.annotations?.representation?.id`,
recursing into `FilterGroup.checks`, and `Number.toCodecJson` (1448-1456) uses it to decide whether
to add the non-finite string fallback.

**But the identity is optional.** `Schema.Annotations.Filter.representation?` is optional at
`Schema.ts:16766`, and `Filter`'s constructor defaults `annotations` to `undefined`
(`SchemaAST.ts:3218`). A user filter built with `Schema.filter(pred)` and no annotations has
**only the closure as identity**. The consequence is enforced downstream and is fatal, not lossy:

- The persistence codec makes `representation` a **required** field on `Filter`
  (`SchemaRepresentation.ts:956-961` — note it is *not* wrapped in `Schema.optional`, unlike
  `FilterGroup`'s at 964). Encoding a Document whose Filter lacks one fails.
- Revival throws `"Missing representation annotation"` (`internal/schema/fromRepresentation.ts:141-143`).

**Verdict on a named-check registry: it can round-trip real schemas, on exactly the condition that
every leaf `Filter` carries `representation.{id, payload}` and the reader holds a reviver for each
`id`.** Effect's built-in checks satisfy this; arbitrary user filters do not. `aborted` is the only
behaviourally-relevant non-annotation datum and it does round-trip (`toRepresentation.ts:313`,
`fromRepresentation.ts:148`).

### (c) Encoding links and chains

`SchemaAST.ts:401-432`.

```ts
export class Link {
  readonly to: AST                                            // 402  (b) nested AST
  readonly transformation:                                    // 403-405  (c) FUNCTION-BEARING
    | SchemaTransformation.Transformation<any, any, any, any>
    | SchemaTransformation.Middleware<any, any, any, any, any, any>
}
export type Encoding = readonly [Link, ...Array<Link>]        // 432
```

A `Link` connects the current node to `to`, the AST **one step toward the encoded side**. Chains
compose in an array; `getLastEncoding` (3457-3459) walks to the terminal encoded AST. Chain
application order in the parser is **last link first** (`SchemaParser.ts:1177-1192`: parse with
`parsers[len-1]`, then apply transformations from `links.length-1` down to `0`).

**Transformations are bare closures — no name, no tag, no annotations.**
`SchemaTransformation.ts:143-165`:

```ts
export class Transformation<T, E, RD, RE> {
  readonly [TypeId] = TypeId
  readonly _tag = "Transformation"        // 145 — kind marker only
  readonly decode: SchemaGetter.Getter<T, E, RD>   // 146
  readonly encode: SchemaGetter.Getter<E, T, RE>   // 147
}
```

and `Middleware` at 71-98: `_tag = "Middleware"` (72) plus two effect-transforming closures
(73-80). Neither class has an `annotations`, `id`, `representation`, or `name` field. `_tag`
distinguishes only *which of the two kinds* it is.

> **This is the sharpest carrier finding.** A `Link` is `(AST, closure-pair)`. There is no
> serializable identity anywhere on the transformation. Effect's own answer is not to name them —
> it is to **discard them**: `SchemaRepresentation.Representation` (`SchemaRepresentation.ts:406-428`)
> has **no `encoding` field at all**, on any variant. The lowering runs on the encoded projection
> and the transformations simply do not appear in the output (§4).

### (d) Property context

`SchemaAST.ts:576-595`. `Context` is *not* stored on `PropertySignature`; it is stored on the
property's **type AST** (`Base.context`, 642), which is why `optionalKey`/`mutableKey` return a
modified copy of the child node.

| Field | file:line | Class | Round-trips? |
|---|---|---|---|
| `isOptional: boolean` | 577 | (a) plain data | yes |
| `isMutable: boolean` | 578 | (a) plain data | yes for object properties; **no for array elements** (§4) |
| `constructorDefault: Link \| undefined` | 580 | **(c) closure-bearing** — a `Link` | **no** |
| `annotations: Schema.Annotations.Key<unknown> \| undefined` | 581 | (d) annotation bag | yes (as JSON subset) |

Accessors: `isOptional` 3731-3733, `isMutable` 3736-3738 (both default `false` when `context` is
absent). Mutators: `annotateKey` 3591-3601, `optionalKey` 3604-3611, `optional` 3616-3618 (note:
`optional` = `optionalKey(Union([ast, undefined]))` — an *optional-or-undefined* property is
represented as a **Union node**, not a context flag), `mutableKey` 3621-3628,
`withConstructorDefault` 3633-3646.

`withConstructorDefault` (3633-3646) builds `new Link(unknown, transformation)` where the
transformation wraps an `Effect` — **the default value is a closure over an Effect, never a
literal**. `SchemaRepresentation` drops `constructorDefault` entirely.

**Data parts:** `isOptional`, `isMutable`, and the JSON-valued subset of `annotations`.
**Non-data part:** `constructorDefault`.

---

## 3. The two projections

`SchemaAST.ts:3754-3871`.

**`toType`** (3779-3798) — strips encodings, returning the decoded view.

```ts
export const toType = memoizeIdempotent(<A extends AST>(ast: A): A => {
  if (ast.encoding) return toType(replaceEncoding(ast, undefined))   // 3780-3782
  const out: any = ast
  const type = out.recur?.(toType) ?? out                            // 3784
  const encodingChecks = type.encodingChecks
  if (encodingChecks) { /* 3786-3796 */ }
  return type
})
```

- **Drops:** the whole `encoding` chain (3781) and `encodingChecks` (3793).
- **Keeps:** `_tag`, all variant fields, `annotations`, `checks`, `context`.
- **Partially recovers:** when `encodingChecks` are present, *structural* checks (those annotated
  `~structural`) are lifted into `checks` for `Arrays`/`Objects`/parametric `Declaration`
  (3789-3794 via `extractStructuralChecks` 3745-3751); for every other variant family the
  `encodingChecks` are dropped outright (3791: `: undefined`).
- **Recursion:** delegated to each variant's `recur` (Declaration 738-740, Arrays 1825-1827,
  Objects 2448-2450, Union 2984-2986, Suspend 3167-3175). **Leaf variants have no `recur`**, so
  `out.recur?.() ?? out` returns them unchanged. **`TemplateLiteral` has no `recur`** — its `parts`
  are *not* walked by `toType` (nor by `flip`).
- Memoized idempotently: same reference in, same reference out (3760).

**`toEncoded`** (3826-3828) — `toType(flip(ast))`. Two-pass, not a direct walk.

**`flip`** (3865-3871):

```ts
export const flip = memoize((ast: AST): AST => {
  if (ast.encoding) return flipEncoding(ast, ast.encoding)   // 3866-3868
  const out: any = ast
  return out.flip?.(flip) ?? out.recur?.(flip) ?? out        // 3870
})
```

`flipEncoding` (3830-3846) reverses the chain and calls `transformation.flip()` on each link —
`Transformation.flip()` swaps `decode`/`encode` (`SchemaTransformation.ts:156-158`);
`Middleware.flip()` does the same (95-97). Variants with an explicit `flip` swap `checks` with
`encodingChecks`: Declaration 742-744 (also swaps `run` ↔ `encodingRun`), Arrays 1829-1831,
Objects 2444-2446, Union 2988-2990. `Suspend` has **no `flip`** — it falls through to `recur`
(3167-3175), which rebuilds a fresh `Suspend` wrapping `() => recur(this.thunk())`.

### What the Encoded view preserves and drops, per family

| Family | Under `toEncoded` |
|---|---|
| Leaves (Null…BigInt, Literal, UniqueSymbol, Enum, ObjectKeyword) | The node is **replaced** by whatever its encoding chain terminates in. `NumberFromString` → `String` (worked example at 3816-3818). Annotations and checks travel with the *node*, so a check on the type side becomes an `encodingCheck` and is largely dropped |
| TemplateLiteral | `parts` are **not** projected — no `recur`. The `encodedParts` cache (1159) was already computed from `toEncoded(part)` at construction (1176) |
| Arrays / Objects / Union / Declaration | Structure preserved, children projected, `checks` ↔ `encodingChecks` swapped, then the encoding-side checks re-filtered to the `~structural` subset |
| Suspend | Preserved as a `Suspend` wrapping the projected thunk — recursion is *not* unrolled |
| `context` | Preserved on the node, but `optionalKey`/`mutableKey` write through to the **last link** as well (`optionalKeyLastLink` 3613, `mutableKeyLastLink` 3630), so optionality survives the projection |

**Ruling input for "do canonical bytes live at the Encoded view".** Effect answers yes for
persistence: `SchemaRepresentation.toRepresentation` lowers **the encoded side** and says so
explicitly — *"Lowers the encoded side of an AST to a live representation document"*
(`SchemaRepresentation.ts:768`), with `SchemaAST.toType` offered as the opt-out (776-777).
`Schema.toJsonSchemaDocument` likewise runs `toCodecJsonAST(schema.ast)` first
(`Schema.ts:15304-15306`).

**Judgment:** the Encoded view is the right home for canonical bytes, with one caveat the lab
should price in — **`toType`/`toEncoded` are lossy on non-structural checks that sit on the wrong
side of an encoding** (3789-3791). A round trip Type → Encoded → Type does not restore
`encodingChecks`, so the projection is not an isomorphism on checks.

---

## 4. SchemaRepresentation — Effect's own serialization answer

`SchemaRepresentation.ts` (1334 lines), `internal/schema/toRepresentation.ts` (361 lines),
`internal/schema/fromRepresentation.ts` (339 lines).

### The persistence representation

A **`Document`** (`SchemaRepresentation.ts:480-483`) is `{ representation: Representation,
references: References }`, where `References` is `{ [$ref: string]: Representation }` (470-472).
`MultiDocument` (491-494) generalizes to a non-empty list of roots sharing one reference table.

`Representation` (406-428) is a **22-variant** closed union: the 21 AST variants **plus `Reference`**
(171-174, `{ _tag: "Reference", $ref: string }`).

Every non-`Reference` variant extends `Keyword<Tag>` (176-180):

```ts
interface Keyword<Tag extends string> {
  readonly _tag: Tag
  readonly annotations?: Schema.Annotations.Annotations | undefined
  readonly checks: ReadonlyArray<Check>
}
```

Note `checks` is a plain (possibly empty) array here, not the AST's non-empty-or-`undefined`.

`Check` mirrors the AST but **with the closure removed**:

```ts
interface Filter {        // 444-449
  _tag: "Filter"; representation?: CheckRepresentationAnnotation<Representation>;
  annotations?: Annotations; aborted: boolean            // no `run`
}
interface FilterGroup {   // 457-462
  _tag: "FilterGroup"; representation?: …; annotations?: …; checks: [Check, ...Check[]]
}
```

### What lowering keeps, drops, and renames

`internal/schema/toRepresentation.ts:190-298` (`on`), 300-323 (`fromChecks`/`fromCheck`).

**Dropped outright — no field exists to hold them:**

| Dropped | Evidence |
|---|---|
| `encoding` (the entire `Link`/`Encoding` chain) | no `encoding` field in `Representation` (406-428); lowering never reads `ast.encoding` |
| `Declaration.run`, `Declaration.encodingRun` | `on` case 193-199 emits only `typeParameters`, `checks`, `representation`, `annotations` |
| `Filter.run` | `fromCheck` 310-315 emits only `aborted` + annotations |
| `encodingChecks` (Declaration/Arrays/Objects/Union) | never read by `on` |
| `context.constructorDefault` | `Objects` case 264-274 reads only `isOptional`/`isMutable`/`annotations` |
| `Arrays.isMutable` | **`Representation.Arrays` (338-341) has `elements` and `rest` only.** Array mutability is silently lost; object-property mutability is not (`PropertySignature.isMutable`, 363) |
| `TemplateLiteral.encodedParts` / `literals` / `suffixLengths` | 238-244 emits `parts` only (correct — they are derived) |
| Non-JSON annotation values | `pruneAnnotations` (`SchemaRepresentation.ts:927-937`) keeps only entries satisfying `SchemaAST.isJson`; everything else is **silently omitted** on encode (documented at 1126) |
| `Base.annotations` on Declaration when `representation` is present | split out — see "renamed" |

**Renamed / restructured:**

| AST | Representation | Evidence |
|---|---|---|
| `Base.context.isOptional` on `ps.type` | `PropertySignature.isOptional` (flattened onto the property) | 270 |
| `Base.context.isMutable` on `ps.type` | `PropertySignature.isMutable` | 271 |
| `Base.context.annotations` on `ps.type` | `PropertySignature.annotations` | 265-266, 272 |
| `Base.context.isOptional` on an array element | `Element.isOptional` (326-330) | 252 |
| `annotations.representation` | promoted to a **top-level `representation` field** on Declaration/Filter/FilterGroup; the remainder stays in `annotations` | `fromDeclarationAnnotations` 325-339, `fromCheckAnnotations` 341-360 |
| a recursive or policy-selected node | `{ _tag: "Reference", $ref }` + an entry in `references` | `makeReference` 102-110 |
| `Filter.annotations.representation.schemas: AST[]` | `…schemas: Representation[]` (recursively lowered via `toType`) | 355 |

**Kept faithfully:** `_tag`; `Literal.literal` (221); `UniqueSymbol.symbol` (227); `Enum.enums`
(234); `TemplateLiteral.parts` (241); `Arrays.elements`/`rest` (248-257); `Objects.propertySignatures`
(incl. `name: PropertyKey`) and `indexSignatures` (264-278); `Union.types` **in order** and `mode`
(285-286); `Filter.aborted` (313); `FilterGroup.checks` **in order** (319).

### Recursion / Suspend

Two mechanisms, layered.

1. **Occurrence + cycle detection** in a pre-pass. `visit` (141-170) walks with a
   `visitingCandidates` set; re-entering a candidate on the current path sets `isRecursive = true`
   (145-148). `Suspend` is walked by forcing the thunk: `visit(ast.thunk())` (165-167).
2. **Reference allocation.** After the pre-pass, `referencePolicy` runs once per candidate
   (49-67). Default policy is `({ identifier }) => identifier` (line 8) — i.e. **the `identifier`
   annotation is the reference name**. If the policy declines but the candidate is recursive, a
   **synthetic** name `${ast._tag}_` is minted (63-65) and de-duplicated by numeric suffix
   (`getReference` 73-82). Documented as a hard rule at `SchemaRepresentation.ts:759-761`:
   *"Recursive candidates always require a reference…"*.

Candidate identity is **AST reference identity**, not structural equality: `getCandidate` (112-139)
keys on `SchemaAST.getContextOwner(getLastEncoding(input))` — the object — and the docstring at
`SchemaRepresentation.ts:710` states *"Structurally equal ASTs remain distinct candidates."*

`Suspend` survives into the representation as a node (158-163) whose `thunk` field is an
**already-evaluated `Representation`**, not a closure (`toRepresentation.ts:290-296`). The cycle is
broken because that value is a `Reference`. `checks` is pinned to `readonly []` (161).

### Declarations, checks, transformations, annotations — summary

- **Transformations: not handled. Absent from the model.** The lowering operates on the encoded
  projection and there is nowhere to put a transformation.
- **Declarations:** reduced to `{ representation, annotations, typeParameters, checks }`.
- **Checks:** reduced to `{ representation, annotations, aborted }` / `{…, checks}`.
- **Annotations:** JSON-valued subset only, with `representation` promoted out of the bag.

### JSON persistence and its declared failure modes

The persistence codec is built out of Effect schemas at `SchemaRepresentation.ts:912-1115` and
exposed as `toJson` (1134-1136), `toJsonMultiDocument` (1155-1157), `fromJson` (1177-1179),
`fromJsonMultiDocument` (1199-1201).

Notable codec decisions:

- **Type discriminators added on the wire.** `makeValueSchema` (990-997) wraps primitives as
  `{ type: "string"|"number"|"bigint"|"boolean"|"symbol", value }`. Applied to `Literal.literal`
  (1000-1009), `Enum` values (1018-1021), and `PropertySignature.name` (1039-1044). This is how
  `PropertyKey` and `LiteralValue` survive JSON.
- **`Literal` numbers must be finite** — `makeValueSchema("number", Schema.Finite)` (1005).
- **`Filter.representation` is REQUIRED** (958 — not `Schema.optional`), while
  `FilterGroup.representation` is optional (964) and `Declaration.representation` is required (979).
  The live TS interfaces mark all three optional (446, 459, 146). **A Document that type-checks can
  therefore fail to encode.**
- `Suspend.checks` is pinned to the empty tuple (987).
- `Reference.$ref` and `RepresentationAnnotation.id` must be non-empty (1068, 918).

**Declared failure modes, verbatim in the docstrings:**

- `toJson` (1124-1126): *"Generic annotations that are not JSON are omitted. Invalid persistence
  identities and unsupported structural values throw an `Error` containing their representation path."*
- `fromJson` (1166-1168): *"Invalid documents throw a schema decoding error. **Decoding does not
  reconstruct runtime callbacks.**"*
- `fromRepresentation` (1210-1212): *"**Revivers are resolved locally by `id`; none are installed
  implicitly.** Reviver results are used directly, and exceptions raised by a reviver pass through
  unchanged."*
- `fromRepresentations` (1250): *"Only references reachable from a root are revived."*

**Reviver limits, from the implementation** (`internal/schema/fromRepresentation.ts`):

| Limit | file:line | Thrown message |
|---|---|---|
| Duplicate reviver ids rejected | 41-43 | `Duplicate reviver for {id}` |
| Dangling `$ref` | 67-69 | `Invalid reference {key}` |
| Reference forced before resolution | 26-29 | `Reference {key} was evaluated before it was resolved` |
| Declaration without `representation` | 125-127 | `Missing representation annotation` |
| Filter without `representation` | 141-143 | `Missing representation annotation` |
| No reviver registered for an `id` | 94-96 | `Missing reviver for {id}` |
| Payload fails its reviver's schema | 106-108 | `Invalid representation payload for {id}` |

Every message is path-annotated via `errorWithPath`.

**Revival asymmetries (silent, not thrown):**

- `FilterGroup` **without** a `representation` is revived structurally by rebuilding from children
  (157-163) — a group needs no reviver, a leaf `Filter` always does.
- **`Arrays.isMutable` is never restored** — revival builds `Schema.Array`/`Schema.Tuple`/
  `Schema.TupleWithRest` (279-283), all readonly. This is consistent with the field being dropped
  in lowering, so the round trip is *stable* but *not faithful* to a mutable source.
- References acquire an `identifier` annotation equal to their key on revival (82) — a synthetic
  recursion name becomes a permanent identifier.
- Cyclic references revive through a `ReferenceSlot.wrapper`, itself a `Schema.suspend` closure
  (24-31, 217-227) — **recursion re-enters the closure world on the way back in.**

**Judgment — closest prior art, read against our admission function.** SchemaRepresentation is a
*lossy encoded-side projection plus a named-registry escape hatch*, not a faithful AST codec. It
makes exactly the three moves the lab is contemplating: (i) drop transformations rather than name
them, (ii) require a `{id, payload}` name for every opaque leaf and fail loudly without it,
(iii) break recursion with a document-level `$ref` table keyed on the `identifier` annotation. Its
declared failure modes are honest. Its two unadvertised losses are `Arrays.isMutable` and the
optional/required mismatch on `Filter.representation`.

---

## 5. The two UNVERIFIED receipts

### (a) Union decode order — **YES, first-match and member-order-sensitive.**

The union parser is in `SchemaAST.ts`, not `SchemaParser.ts`. `SchemaParser.ts` holds only the
public runners and the memoized `Compiler` (`SchemaParser.ts:1022-1035`), which dispatches via
`ast.getParser(compile, compileConstructorDefault)` (`SchemaParser.ts:1090`).

**The dispatch loop — `SchemaAST.ts:2933-2976`:**

```ts
getParser(compile, compileConstructorDefault): Parser {
  return (input, options) => {
    const candidates = getCandidates(input, ast.types, compileConstructorDefault !== undefined)  // 2945
    if (candidates.length === 1) { … }                                                          // 2947-2953
    const state = { …, successes: ast.mode === "oneOf" ? [] : undefined, … }                     // 2955-2963
    const eff = parseUnion(state, candidates, concurrency ? {…, orderedStep: true} : undefined)  // 2965
```

**The step function — `SchemaAST.ts:3049-3083`:**

```ts
step(s, candidate, exit) {
  if (exit._tag === "Failure") { … collect issue … }        // 3063-3069
  else {
    if (s.out && s.successes) {                              // 3071 — oneOf: a SECOND success
      s.successes.push(candidate)
      return Exit.fail(new SchemaIssue.OneOf(...))           // 3073
    }
    s.out = exit
    if (s.successes) s.successes.push(candidate)             // 3076-3077 — oneOf: keep going
    else return Exit.void                                    // 3079 — anyOf: STOP HERE
  }
}
```

`Exit.void` at 3079 is a Success, and the driver treats any non-`undefined` `step` return as
terminal: `internal/effect.ts:4763-4764` —
`const terminal = step(...); if (terminal) return terminal._tag === "Failure" ? terminal : undefined`.

So for `mode: "anyOf"` (the default, `Schema.ts` union constructor at `SchemaAST.ts:2549-2555`):
**decoding stops at the first member that succeeds.** For `mode: "oneOf"` every candidate is tried
and a second success is an error.

**Iteration is in array order.** `parseUnion` is built by `iterateEager`
(`internal/effect.ts:4737-4766`); with the default `concurrency: 1` it runs
`runSequential(state, items, 0, end)` — a plain ascending `for` loop (4754-4765). With
`concurrency > 1`, `Union.getParser` passes `orderedStep: true` (`SchemaAST.ts:2965`), and
`runStep` (4800-4812) buffers exits and applies `step` strictly in ascending index order. **Order
sensitivity is preserved even under concurrency — deliberately.**

**Normalization / sorting of union members — there is exactly one sort, and it restores AST order.**
`getCandidates` (2875-2881) → `getIndex` (2718-2856) builds an index that *filters* members, never
reorders them relative to `ast.types`:

- literal-only unions (2764-2766): `literalCandidates` arrays are pushed in loop order `i = 0…`
  (2727-2738)
- single-sentinel unions (2767-2780): `Array.from(indexes, i => types[i])` over a `Set` filled in
  ascending `i` (2771)
- multi-sentinel unions (2781-2846): the selected set is explicitly re-sorted back into declaration
  order — `Array.from(selected).sort((a, b) => a - b).map((i) => types[i])` (**2845**)
- the fallback (2847-2851): `otherwise[runtimeType]` arrays are pushed in ascending `i` (2760)

`toCandidate` (2599-2612) normalizes each *member* (not the list) to its encoded candidate form,
returning `unknown` for `Suspend` (2601) and for middleware-bearing encodings (2607-2609).

**No sorting of union members anywhere in the pinned source.** The `.sort()` at 2845 is numeric on
original indices and exists precisely to undo the `Set`'s insertion order.

> **Carrier consequence.** `Union.types` order is semantically load-bearing under `anyOf`. A Lean
> carrier that models a union as an unordered set, or that canonicalizes member order for hashing,
> **changes decode results**. Only `mode: "oneOf"` is order-insensitive in outcome (though not in
> error reporting: `SchemaIssue.OneOf` and `AnyOf` carry members in encounter order, 3073, 2968).

### (b) Object property order — **YES, observable, and it follows AST order.**

**Encoded output order follows `ast.propertySignatures` order.** Both parser paths iterate the
property list in order and write into a fresh `{}`, so JS own-property insertion order — and hence
`JSON.stringify` key order — is the AST order.

- Fast path (`SchemaAST.ts:2370-2409`): `const props = compileMembers()` (2383), where
  `compileMembers` (2215-2231) maps `ast.propertySignatures` in order (2217-2221); then
  `for (let index = 0; index < props.length; index++)` (2388) writing via
  `InternalRecord.assignProperty(out, name, value)` (2398) / `stepProperty` (2483).
- Fallback path (2233-2347): `parseProperties(state, properties!, concurrency)` (2297), driven by
  the same ordered `iterateEager` (2501-2511).

**Three order caveats, all in the pinned source:**

1. `onExcessProperty: "preserve"` writes **excess keys first** (2285), before any schema property
   (2296-2299). Preserved-key output order is `Reflect.ownKeys(input)` then schema order.
2. `propertyOrder: "original"` (2335-2345) rebuilds the output from
   `(inputKeys ?? Reflect.ownKeys(record)).concat(expectedKeys)` — i.e. **input order first**, AST
   order only as a tail for keys the input lacked. It also forces the fallback path (2375).
3. The default `propertyOrder: "none"` is documented as **explicitly unstable**
   (`SchemaAST.ts:500-504`): *"The key order for `"none"` should not be considered stable and may
   change in future updates without notice."* Empirically at this commit it equals AST order, but
   the library disclaims it.

**Where AST property order itself comes from:** `SchemaAST.struct` (2520-2533) builds property
signatures from `Reflect.ownKeys(fields)` (2526). That is **JS own-key order, not source order** —
integer-like keys sort ascending first, then string keys in insertion order, then symbols. A struct
with fields `{ b, 2, a, 1 }` yields AST order `1, 2, b, a`.

**Validation order is also observable** through error reporting: with `errors: "all"`, issues are
pushed in property order (2489-2492), and `SchemaIssue.Pointer` paths are emitted in that sequence.

> **Carrier consequence.** If canonical bytes are produced by encoding through Effect, field order
> is AST order and **the AST is an ordered list, not a map**. A Lean carrier modelling `Objects`
> as a finite map over keys loses information that the encoder observes. Conversely, if the lab
> wants order-independent canonical bytes, it must impose its own key sort at the byte layer and
> not rely on `propertyOrder` — which the library refuses to stabilize.

---

## 6. Suspend and recursion

**Node shape** — `SchemaAST.ts:3144-3160`:

```ts
export class Suspend extends Base {
  readonly _tag = "Suspend"
  readonly thunk: () => AST                       // 3146
  constructor(thunk: () => AST, annotations?, checks?, encoding?, context?) {
    if (checks) throw new Error("Cannot add checks to Suspend")   // 3155-3157
    super(annotations, undefined, encoding, context)              // 3158
    this.thunk = memoizeThunk(thunk)                              // 3159
  }
}
```

- **Thunk type:** `() => AST`. Nullary, synchronous, returns the AST directly (not an Effect, not a Schema).
- **Memoization: yes, at construction.** `memoizeThunk` (3100-3111) is a one-shot latch — first
  call evaluates and caches, subsequent calls return the cached AST. `getParser` (3162-3165) adds a
  second layer, caching the compiled parser: `(parser ??= compile(this.thunk()))`.
- **Checks are forbidden**, at construction (3155) and via `replaceChecks` (3474-3476).
- `recur` (3167-3175) builds a *new* `Suspend` wrapping `() => recur(this.thunk())`, dropping checks
  and encoding.
- **No identity field.** No name, no label, no `identifier` of its own. `getExpected` (3177-3179)
  delegates straight through to the thunk's target.

**How the library breaks recursion when serializing.**

*Correction to the brief:* **`JsonSchema.ts` does not walk `SchemaAST` at all.** At this commit it
is a JSON-Schema/OpenAPI *document* module — dialect normalization, `$ref` rewriting, pointer
helpers (`JsonSchema.ts:1-10`, `Dialect` at 55, `rewriteRefs` at 739-751, `getReferenceKey` at
684-687). The AST → JSON Schema path is:

`Schema.toJsonSchemaDocument` (`Schema.ts:15299-15308`)
→ `toCodecJsonAST(schema.ast)` (15304)
→ `InternalToRepresentation.toRepresentation` (15304-15306)
→ `InternalToJsonSchemaDocument.toJsonSchemaDocument` (15307).

So **recursion is broken exactly once, in `SchemaRepresentation`'s lowering**, and the JSON Schema
compiler merely renders the reference table that lowering already produced.

**The mechanism, and the recursion identity.**

1. `internal/schema/toRepresentation.ts:141-170` — `visit` forces `Suspend` thunks (165-167) and
   marks a candidate `isRecursive` when re-entered on the current path (145-148).
2. Lines 49-67 — the reference policy runs per candidate. **Default: `({ identifier }) => identifier`
   (line 8).** So *the recursion identity is the `identifier` annotation* — a plain string in the
   open annotation bag.
3. Lines 63-65 — if the policy declines and the candidate is recursive, a **synthetic** name
   `${ast._tag}_` is minted and disambiguated by numeric suffix (`getReference` 73-82). So a
   recursive schema with no `identifier` still gets a reference, named e.g. `Objects_`, `Objects__1`.
4. The `Suspend` node itself survives (290-296) but its `thunk` field holds a `Reference` value —
   the cycle is cut at the reference, not at the `Suspend`.
5. JSON Schema emission renders each `Reference` as `{ $ref: "#/$defs/<escaped>" }`
   (`internal/schema/toJsonSchemaDocument.ts:284-287`), with definitions compiled under a
   three-state map (`null` = in progress, string = alias, object = compiled; 172, 193-219). A
   `Suspend` compiles to its thunk's schema, transparently (`toJsonSchemaDocument.ts:329-330`).
6. On the way back, `fromRepresentation` re-creates cycles with a `ReferenceSlot` holding a
   `Schema.suspend` wrapper (`internal/schema/fromRepresentation.ts:19-32`, 217-227), and stamps
   the reference key onto the revived schema as `identifier` (82).

**Answers to the lab's correspondence question.**

| Question | Answer from pinned bytes |
|---|---|
| What is the recursion identity? | The **`identifier` annotation string** (default policy, `toRepresentation.ts:8`), falling back to a synthetic `${_tag}_` name (63-65). Not the `Suspend` node, not structural equality. |
| Is it structural or nominal? | **Nominal, and object-identity-based.** Candidates are keyed on AST reference identity via `getContextOwner(getLastEncoding(input))` (113-114); the docstring states *"Structurally equal ASTs remain distinct candidates"* (`SchemaRepresentation.ts:710`). |
| Is there a discriminator? | **No.** There is no mandatory tag on `Suspend`, and `identifier` is optional. The library's fallback is synthesis, not rejection. |
| Is the binder explicit? | **Yes, at document level** — `references: { [$ref]: Representation }` (470-472) is a flat, non-scoped, mutually-recursive definition table. It is *not* a binder in the de Bruijn sense: names are global to the document, there is no scope nesting, and a `Reference` can name any entry. |

> **Judgment for the lab's de Bruijn μ-binder with a mandatory discriminator.** The correspondence
> is answerable but **not an isomorphism**. Effect's table is a flat letrec keyed by *nominal*
> names derived from an optional annotation; a de Bruijn μ-binder is *positional* and scoped.
> Translating Effect → lab is total (names are already explicit, and where absent they are
> synthesized), so admission can succeed. Translating lab → Effect requires minting names for
> binders, which is fine. But **making the discriminator mandatory is strictly stronger than what
> Effect guarantees**: Effect synthesizes `Objects_` rather than failing, so two structurally
> distinct recursive schemas can be distinguished only by minting order. A lab carrier that
> requires the discriminator must **reject** schemas that Effect happily serializes — that is a
> design choice to make deliberately, not a gap to close.

---

## 7. Programmatic construction and walkability

**How nodes are constructed.** Plain ES classes with public constructors, all exported. No factory
indirection, no private brands beyond the `TypeId` string constant (`SchemaAST.ts:614`, assigned as
an instance field at 637). Each class declares `readonly _tag = "<Literal>"` as an initialized
class property — 23 of them (21 AST variants at lines 690, 766, 806, 866, 921, 958, 998, 1035,
1075, 1156, 1254, 1316, 1377, 1428, 1503, 1549, 1603, 1684, 2098, 2914, 3145; plus `Filter` 3208
and `FilterGroup` 3256).

Constructor arity is uniform: variant-specific fields first, then
`(annotations?, checks?, encoding?, context?)`, then `encodingChecks?`/`encodingRun?` where they
exist. Guards are generated from the tag by `makeGuard` (76-78) and exported one-per-variant
(109-380).

Non-obvious construction facts worth recording:

- Node "mutation" is **prototype-preserving structural sharing**, not `new`:
  `modifyOwnPropertyDescriptors` (3412-3421) does
  `Object.create(Object.getPrototypeOf(ast), patchedDescriptors)`. Used by `replaceEncoding` (3431),
  `replaceContext` (3441), `annotate` (3462), `replaceChecks` (3473). So an AST node can exist that
  was never produced by its own constructor — **constructor invariants are not re-checked** on these
  paths.
- `contextOwners` is a `WeakMap` side table (3423) mapping a context-modified copy back to its
  origin; `getContextOwner` (3426-3428) reads it. This is *out-of-band identity* — it is not a field
  and would not appear in any structural walk, yet `toRepresentation` depends on it for candidate
  keying (`toRepresentation.ts:114`).

**Is `.ast` public?** Yes. `Schema.Constraint` declares `readonly "ast": SchemaAST.AST`
(`Schema.ts:789`); `Top` extends `Bottom<…, SchemaAST.AST, …>` (745-763). Narrowed forms exist,
e.g. `Constraint & { readonly ast: SchemaAST.Objects }` (3986) and `readonly ast: SchemaAST.Arrays`
(4439). The reverse direction is public too: **`Schema.make(ast)`** at `Schema.ts:2377` lifts an
arbitrary AST to a Schema. Both directions of the boundary are supported API.

**Could a TypeScript-compiler-API extractor mechanically enumerate the union from the pinned
source? Yes — assessment follows.**

What such an extractor would key on, concretely:

1. **The union alias.** `TypeAliasDeclaration` named `AST` at `SchemaAST.ts:53`, whose type is a
   `UnionTypeNode` of 21 `TypeReferenceNode`s. This is the authoritative variant list and it is
   syntactically flat — no conditional types, no mapped types, no `extends` in the union itself.
2. **The class declarations.** For each name in the union, an exported `ClassDeclaration` in the
   same file with `heritageClauses` = `extends Base`. All 21 are present and local (no
   cross-module variants).
3. **The `_tag` literal.** A `PropertyDeclaration` named `_tag` with `readonly` and a
   `StringLiteral` initializer. Present on all 21. This gives the discriminator value without
   evaluation.
4. **Field names and types.** The remaining `readonly` `PropertyDeclaration`s, plus the
   `ConstructorDeclaration` parameter list for arity/ordering/defaults. Base fields come from
   `abstract class Base` at 636.
5. **Function-valued detection.** A field is closure-bearing iff its type node is a
   `FunctionTypeNode`, or resolves to one (`DeclarationRun` at 666, `Filter.run`'s inline signature
   at 3209), or is a class known to hold closures (`SchemaTransformation.Transformation` /
   `Middleware`, reachable through `Link.transformation` at 403-405).
6. **Cross-checks that make the extraction self-validating.** `makeGuard` call sites (109-380)
   should produce exactly the same 21 tag strings as the class declarations; the
   `SchemaRepresentation.Representation` union (`SchemaRepresentation.ts:406-428`) should be the
   same 21 plus `Reference`; the `RepresentationUnion` runtime array (1071-1094) should list the
   same 22. Three independent enumerations agreeing is a strong signal.

**Judgment: mechanically extractable, with high confidence, from syntax alone — no type-checker
required for items 1-4.** The declarations are unusually regular for this purpose. Items 5-6 want
the checker for alias resolution. Output would be a JSON inventory of
`{variant, tagLiteral, declLine, fields: [{name, typeText, kind, declLine}]}`.

**What makes the union NOT closed in practice.** The *type* is closed; the *semantics* are not.
Four escape hatches, in decreasing severity:

1. **`Declaration` is the intended extension point and is opaque by construction.**
   `Schema.declare` (`Schema.ts:559-571`) and `Schema.declareConstructor` (493-515) let any user
   mint a node whose entire meaning is the `run` closure (508-512). A walk can enumerate that a
   `Declaration` exists; it cannot enumerate what it accepts. `getExpected` bottoms out at the
   string `"<Declaration>"` (`SchemaAST.ts:749`).
2. **The annotation bag is an open string-keyed record** (`Schema.ts:16551-16553`) extended by
   declaration merging. No finite key enumeration is sound; only an allowlist is.
3. **`encoding` admits arbitrary `Transformation`/`Middleware`** with no identity
   (`SchemaTransformation.ts:143-165`, 71-98), so the space of *behaviours* attachable to any of
   the 21 variants is unbounded even though the variant list is not.
4. **`checks` admits arbitrary `Filter`s** whose `run` is any predicate
   (`SchemaAST.ts:3207-3239`), with `representation` optional.

Additionally: `Schema.make(ast)` (`Schema.ts:2377`) accepts any AST, and
`modifyOwnPropertyDescriptors` (3412-3421) can produce nodes bypassing constructor validation — so
a walker cannot assume constructor invariants hold on nodes it receives.

**Practical upshot:** an extractor gives the lab a sound, machine-checkable **shape** inventory
(21 variants, their fields, their closure-bearing fields). It cannot give a **semantics** inventory,
because four of the shape's fields are deliberately open. The admission function has to be a
shape-check plus a registry lookup, exactly as `fromRepresentation` is.

---

## 8. Honest gaps

Things I could not determine from the pinned bytes, stated plainly.

1. **The `Schema.ts` union-construction surface was not exhaustively read.** I read the
   `Annotations` namespace (16465-16860), `declare`/`declareConstructor` (470-571),
   `make` (2377), `Top`/`Constraint` (745-806), `toJsonSchemaDocument` (15299-15308), and the
   `MutableJson` region (16400-16463). The file is 17104 lines; I did not audit every
   AST-constructing combinator. **Specifically unverified: whether any `Schema.*` combinator sorts,
   dedupes, or normalizes union members before calling `new Union(...)`.** I verified that
   `SchemaAST.union` (2549-2555) does not, and that no sort exists in `SchemaAST.ts`; I did **not**
   prove the absence of one across all of `Schema.ts`.

2. **`SchemaGetter.Getter` was not fetched.** `Transformation.decode`/`encode` are `Getter`s
   (`SchemaTransformation.ts:146-147`), and I asserted they are closure-bearing from their use sites
   (`SchemaParser.ts:1051, 1056` call `.run(...)`) rather than from the class definition. I did not
   check whether `Getter` carries any annotation or identity field. **If it does, the §2(c)
   conclusion that transformations have no serializable identity would need revision** — though
   `SchemaRepresentation`'s total omission of `encoding` makes that moot for persistence.

3. **`SchemaIssue.ts` was not fetched.** Issue shapes (`InvalidType`, `Composite`, `AnyOf`,
   `OneOf`, `Filter`, `Pointer`, `MissingKey`, `UnexpectedKey`, `Encoding`) are cited by
   construction site only. Error-path field order and content are unverified.

4. **`internal/schema/parser.ts`** (the `missing` sentinel, `sameExit`, `succeed`) was not fetched.
   I relied on its call sites. The `InternalParser.missing` sentinel's interaction with optionality
   is inferred from usage (e.g. `SchemaAST.ts:2482-2498`), not read.

5. **No execution.** Nothing here was run. Every claim is a reading of source. In particular the
   §5(b) statement that default `propertyOrder: "none"` output order *equals* AST order at this
   commit is a code reading of two parser paths, not an observed result — and the library
   explicitly disclaims the guarantee (`SchemaAST.ts:500-504`).

6. **`internal/schema/toJsonSchemaDocument.ts` read only in part** (lines 1-340 of 598). The
   variant cases beyond `Number` (line 335 onward: `Literal`, `Enum`, `Arrays`, `Objects`, `Union`,
   `TemplateLiteral`) were not read. **JSON Schema emission fidelity per variant is therefore not
   inventoried** — only the reference/recursion mechanism (162-305), which was the question asked.

7. **`internal/schema/fromJsonSchemaDocument.ts` was not fetched at all.** The JSON Schema *import*
   limits in §4 are quoted from the public docstrings (`SchemaRepresentation.ts:1280-1291,
   1313-1321`), not verified against the implementation.

8. **Package-level export surface unverified.** I did not fetch `packages/effect/package.json` or
   `src/index.ts`, so I cannot confirm which of these modules are public entry points versus
   deep-import-only. `SchemaAST`, `SchemaRepresentation`, `JsonSchema`, and `SchemaTransformation`
   are all imported by name in the docstring examples (e.g. `SchemaAST.ts:1304`,
   `SchemaRepresentation.ts:1217`), which is strong but indirect evidence.

9. **The lock's `bytes`/`contentDigest` discrepancy is diagnosed, not proven.** The CRLF hypothesis
   fits all five artifacts to the byte (+1 per line, exactly). I did not obtain the Windows working
   copy to confirm.

---

## Files fetched

All fetched from `https://raw.githubusercontent.com/Effect-TS/effect/0dd7825e4da4d3a00fa9bd410a1d55f3d4874d07/packages/effect/src/` (abbreviated `RAW/` below), cached under
`/Users/pooks/Dev/foldlab/.staging/e2/src-cache/`.

| Cached path | Bytes | Lines | git blob SHA-1 | Raw URL |
|---|---|---|---|---|
| `SchemaAST.ts` | 130916 | 4417 | `e99d7f473b4ecc0e6ba919ddbc98bb0dace8fe40` ✓lock | `RAW/SchemaAST.ts` |
| `SchemaParser.ts` | 44973 | 1219 | `7cc35ebffe58a9a51476c238308c8aa34b2b4f42` ✓lock | `RAW/SchemaParser.ts` |
| `SchemaRepresentation.ts` | 38517 | 1334 | `6282ab9cbf5c7a50b79580065881b5a6c5799aae` ✓lock | `RAW/SchemaRepresentation.ts` |
| `JsonSchema.ts` | 55005 | 1645 | `054b8e6b650dd9149517557b744e566e2835b0fa` ✓lock | `RAW/JsonSchema.ts` |
| `Schema.ts` | 526080 | 17104 | `2924d92fcd5b397ab1e0d0635bd661dfa453f11b` ✓lock | `RAW/Schema.ts` |
| `SchemaTransformation.ts` | 57699 | 1946 | `e90c1a653ca5362871e612e6e4569e6470be8218` ✗lock | `RAW/SchemaTransformation.ts` |
| `internal/effect.ts` | 212712 | 6709 | `bb6e4bcafb3d9c76f93fb3af54f99d5b4afcbeb3` ✗lock | `RAW/internal/effect.ts` |
| `internal/schema/annotations.ts` | 2224 | 84 | `d5fb684f76955445fa5a6912fa7d7edf1ae7adcd` ✗lock | `RAW/internal/schema/annotations.ts` |
| `internal/schema/toRepresentation.ts` | 12169 | 361 | `89474d36bfa246798809484a8d6a0a54082663b5` ✗lock | `RAW/internal/schema/toRepresentation.ts` |
| `internal/schema/fromRepresentation.ts` | 13014 | 339 | `30b647beb06c2807cd2999d7c41f0f7aa4505bfe` ✗lock | `RAW/internal/schema/fromRepresentation.ts` |
| `internal/schema/toJsonSchemaDocument.ts` | 24098 | 598 | `1720e9104710c3d71a084d623175da81ae286856` ✗lock | `RAW/internal/schema/toJsonSchemaDocument.ts` |
| `internal/schema/toCodeDocument.ts` | 22796 | 578 | `0e6f1804f10b3ada982eb8edb5b3cbae436e291e` ✗lock | `RAW/internal/schema/toCodeDocument.ts` |

✓lock = git blob SHA-1 matches `.reference/provenance/sources.lock.json`; ✗lock = artifact absent
from the lock (digest recorded here so it can be pinned). The six `internal/`
and `SchemaTransformation` artifacts are **not pinned in the lock** and should be added before any
of the claims that depend on them are promoted past G0. The claims most affected are §2(c)
(SchemaTransformation), §4 (both `internal/schema/*Representation.ts`), §5(a) iteration order
(`internal/effect.ts`), and §6 (`toJsonSchemaDocument.ts`).
