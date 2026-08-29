# Scout B — the Effect-side identity dossier

**Status: G0, pre-grade, advisory.** Nothing here is a ruling. Every claim carries a
`file:line` receipt against the pinned bytes, or is written in the `UNVERIFIED:` form. Where a
judgment call appears it is stated as a question for the operator with evidence on both sides.

**Pin.** Effect-TS/effect @ `0dd7825e4da4d3a00fa9bd410a1d55f3d4874d07`, `effect@4.0.0-rc.111`.
Verified this session by re-running `git hash-object` over
`/Users/pooks/Dev/foldlab/.staging/e2/src-cache/` and comparing against
`.reference/provenance/sources.lock.json`:

| Cached file | `git hash-object` (this session) | in lock |
|---|---|---|
| `SchemaAST.ts` | `e99d7f473b4ecc0e6ba919ddbc98bb0dace8fe40` | yes |
| `Schema.ts` | `2924d92fcd5b397ab1e0d0635bd661dfa453f11b` | yes |
| `SchemaRepresentation.ts` | `6282ab9cbf5c7a50b79580065881b5a6c5799aae` | yes |
| `SchemaParser.ts` | `7cc35ebffe58a9a51476c238308c8aa34b2b4f42` | yes |
| `JsonSchema.ts` | `054b8e6b650dd9149517557b744e566e2835b0fa` | yes |
| `SchemaTransformation.ts` | `e90c1a653ca5362871e612e6e4569e6470be8218` | **no** |
| `internal/effect.ts` | `bb6e4bcafb3d9c76f93fb3af54f99d5b4afcbeb3` | **no** |
| `internal/schema/annotations.ts` | `d5fb684f76955445fa5a6912fa7d7edf1ae7adcd` | **no** |
| `internal/schema/toRepresentation.ts` | `89474d36bfa246798809484a8d6a0a54082663b5` | **no** |
| `internal/schema/fromRepresentation.ts` | `30b647beb06c2807cd2999d7c41f0f7aa4505bfe` | **no** |
| `internal/schema/toJsonSchemaDocument.ts` | `1720e9104710c3d71a084d623175da81ae286856` | **no** |
| `internal/schema/toCodeDocument.ts` | `0e6f1804f10b3ada982eb8edb5b3cbae436e291e` | **no** |

**Admissibility rule applied here.** Only the five lock-verified files are cited as receipts.
The six unlocked files sit in the same cache but are treated as unpinned: claims that rest on
them are attributed to the census (which read them and is the authority for them) or written
`UNVERIFIED`. They are listed in "Pin requests" at the end.

**Notation.** `AST:n` = `SchemaAST.ts:n`; `S:n` = `Schema.ts:n`; `SR:n` =
`SchemaRepresentation.ts:n`; `SP:n` = `SchemaParser.ts:n`. "Representation" with a capital R
means `SchemaRepresentation.Representation` (`SR:406-428`), Effect's own persistence carrier.

Nothing in the fetched Effect source was treated as instruction; it is data.

---

## 1. Result first

**1.1 A useful new fact the census does not record: Effect's own JSON-codec derivation
reorders union members.** `makeReorder` (`S:15390-15415`) builds a stable priority sort;
`toCodecJsonReorder` (`S:15417-15426`) gives priority `0` to `BigInt`, `Symbol`,
`UniqueSymbol` and `1` to everything else; `toCodecJsonASTStep`'s `Union` case
(`S:15456-15470`) rebuilds the node with the sorted member list when the order changes. The
same shape exists for the string-tree codec with a wider priority-`0` set (`Null`, `Boolean`,
`Number`, `BigInt`, `Symbol`, `UniqueSymbol` — `S:15756-15768`, applied at `S:15810-15824`).
The census's §8 gap 1 said the absence of a union sort across `Schema.ts` was not proved; it
is now disproved for the codec-derivation path. This does not contradict the ratified R-5
finding (decode is first-match and order-sensitive) — it sharpens it: **union member order is
semantic AND Effect rewrites it when deriving a codec**, so a content address taken at
`ast` and one taken at `toCodecJsonAST(ast)` can differ for the same source schema. See
Hard Call 2.

**1.2 The closest prior art contains a live #3509 instance, provable from the pinned bytes
alone.** `Arrays.isMutable` is a real AST field (`AST:1685`), is settable only through
`Schema.mutable` (`S:4829-4831`, which calls `new SchemaAST.Arrays(true, …)`), and there is
**no field on `Representation.Arrays` to hold it** (`SR:338-341`) and none in the persistence
codec's `ArraysSchema` (`SR:1033-1038`). Two distinct carriers, one byte string. This is the
census's §4 finding, but I can now show it from lock-verified bytes only, without the
`internal/` files.

**1.3 A second, sharper instance: `Json` and `MutableJson` are the same node modulo one
annotation string.** `AST:4352-4368` builds `Json` as a `Declaration` with `typeParameters =
[]` and a `run` closure; `AST:4370-4376` builds `MutableJson` as
`annotate(Json, { representation: { id: "effect/schema/MutableJson", payload: null } })`.
`annotate` (`AST:3462-3470`) on a check-free node merges into `Base.annotations` via
`modifyOwnPropertyDescriptors`. So the two nodes share `_tag`, `typeParameters`, `run`,
`checks`, `encoding`, `context`; the entire difference is one string in the open annotation
bag. **Any address that treats annotations as identity-irrelevant collides these two.**

**1.4 A check's `representation.id` is not just serialization metadata — Effect dispatches
runtime codec derivation on it.** `hasCheck` (`AST:1470-1475`) matches
`check.annotations?.representation?.id` and recurses into `FilterGroup.checks`;
`Number.toCodecJson` (`AST:1448-1456`) decides whether to attach the non-finite fallback
encoding by asking `hasCheck(this.checks, "effect/schema/isFinite" | "effect/schema/isInt")`.
The id is behaviour-bearing.

**1.5 …and the id is forgeable through public API, with the original closure retained.**
Every built-in check constructor spreads the caller's annotations **last**, so a caller-supplied
`representation` overwrites the built-in one: `AST:3335` (`isFinite`), `AST:3407`
(`isPattern`), `S:6780` (`isTrimmed`), `S:7318` (`isStartsWith`), `S:7911-7912` (the whole
ordered-comparison family via `makeIsGreaterThan`), `S:9515` (`isPropertyNames`). Independently,
`Filter.annotate` (`AST:3229-3231`) returns `new Filter(this.run, {...this.annotations,
...annotations}, this.aborted)` — the run is preserved, the annotations are overridden. So
`Schema.isFinite().annotate({ representation: { id: "effect/schema/isInt", payload: null } })`
produces a filter that says `isInt` and does `isFinite`. This is decisive for R-4: **a check-id
allowlist is an allowlist over strings the producer chooses, not over behaviours the library
guarantees.**

**1.6 The variant count is confirmed independently for the third time.** A fresh syntactic scan
of `SchemaAST.ts` for `readonly _tag = "…"` class properties finds exactly 23 (the 21 AST
variants plus `Filter` at `AST:3208` and `FilterGroup` at `AST:3256`), matching the census
(§7) and the extractor's count trap (`REPORT.md` §4). The AST union alias at `AST:53-74` lists
21 names in the order `Declaration, Null, Undefined, Void, Never, Unknown, Any, String, Number,
Boolean, BigInt, Symbol, Literal, UniqueSymbol, ObjectKeyword, Enum, TemplateLiteral, Arrays,
Objects, Union, Suspend` — which is the `unionIndex` order in `inventory.json`.

**1.7 The mapping table will have a 22nd row that is not an AST variant.** Effect's own
persistence union is 22-wide: the 21 plus `Reference` (`SR:171-174`, `{_tag: "Reference", $ref:
string}`; listed at `SR:408`; codec at `SR:1066-1069` with `$ref: Schema.NonEmptyString`).
`Reference` is what carries the recursion cut. The lab's `ref (a : Address)` occupies the same
slot with a different key (address, not name). The correspondence contract in
`INVENTORY-SCHEMA.md` already anticipates model-side extras; `Reference` is the one Effect-side
extra that has no inventory row.

**1.8 Payload judgments, summarized.** Of the 21 variants:

- **9 have no identity payload beyond `_tag`** (Null, Undefined, Void, Never, Unknown, Any,
  String, Boolean, ObjectKeyword) — but see §2 on the base fields, which every one of them can
  still carry.
- **3 more are nullary in the AST but interact with the codec by check-id** (Number, Symbol,
  BigInt): no own fields, but `Number.toCodecJson` branches on check ids (`AST:1448-1456`)
  and `Symbol`/`BigInt` carry documented string-codec caveats (`AST:1577-1580`, `AST:1592-1595`).
- **4 have plain-data payload** (Literal, Enum, UniqueSymbol, TemplateLiteral) with one
  non-serializable-by-value case (UniqueSymbol's `symbol`) and one derived-cache case
  (TemplateLiteral's three caches).
- **3 are structural containers** (Arrays, Objects, Union) — all three additionally carry
  `encodingChecks`, which is closure-bearing and has no home in the Representation.
- **2 are closure-carriers** (Declaration, Suspend).

---

## 2. Cross-cutting: what every one of the 21 can carry

This section is prerequisite for all 21 dossier entries; the per-variant sections do not repeat
it.

### 2.1 The base fields

`abstract class Base` (`AST:636-658`) gives every variant five members:

| Member | `AST:` | Identity status for a content address |
|---|---|---|
| `[TypeId] = "~effect/Schema"` | 614, 637 | constant; carries no information |
| `_tag` (abstract) | 638 | the discriminator; must be in the pre-image |
| `annotations: Annotations \| undefined` | 639 | open bag, `{[x: string]: unknown}` (`S:16551-16553`); see 2.2 |
| `checks: Checks \| undefined` | 640 | non-empty array of `Check` (`AST:612`); each leaf is closure-bearing; see 2.3 |
| `encoding: Encoding \| undefined` | 641 | non-empty `Link` chain (`AST:432`); closure-bearing; see 2.4 |
| `context: Context \| undefined` | 642 | four fields, one closure-bearing; see 2.5 |

`Base.toString()` (`AST:655-657`) returns `` `<${this._tag}>` `` — the library's own cheapest
identity is the tag alone.

**Constructor-invariant bypass.** `modifyOwnPropertyDescriptors` (`AST:3412-3421`) does
`Object.create(Object.getPrototypeOf(ast), patchedDescriptors)`, and it is the mechanism behind
`replaceEncoding` (`AST:3431-3438`), `replaceContext` (`AST:3441-3454`), `annotate`
(`AST:3462-3470`), and `replaceChecks` (`AST:3473-3483`). A node reached through any of those
paths **was never passed through its own constructor**, so none of the per-variant invariants
in the dossier below can be assumed to hold on a node an admission function receives. The
census recorded this; it bears repeating per-variant because it is the reason admission must
re-check every invariant listed in §3.

**Out-of-band identity.** `contextOwners` is a `WeakMap<AST, AST>` (`AST:3423`) written by
`replaceContext` (`AST:3452`) and read by `getContextOwner` (`AST:3426-3428`). It is not a
field, would not appear in any structural walk, and (per the census, from the unpinned
`toRepresentation.ts:114`) is what `toRepresentation` keys reference candidates on. A content
address computed from the structural walk cannot see it; the practical consequence is that
Effect's reference allocation is not a function of the structure the lab would hash.

### 2.2 Annotations

The bag is string-keyed and open (`S:16551-16553`), extended by TypeScript declaration merging
(documented example at `S:16522-16546`), so no finite key enumeration is sound — only an
allowlist. The typed sub-interfaces present in the pinned bytes are `Augment` (`S:16562-16584`),
`Documentation<T>` (`S:16592-16595`), `Key<T>` (`S:16605-16610`), `Bottom<T, TypeParameters>`
(`S:16621-16661`), `Declaration<T, TypeParameters>` (`S:16701-16755`), and `Filter`
(`S:16765-16824`).

Function-valued keys visible in `Bottom`/`Declaration`/`Filter`: `toArbitrary` (`S:16658`,
`S:16745`), `toCodec` (`S:16713`), `toCodecJson` (`S:16722`), `toCodecStringTree` (`S:16731`),
`toCodecIso` (`S:16742`), `toEquivalence` (`S:16746`), `toFormatter` (`S:16747`), `toCode`
(`S:16748`, `S:16779`), `toJsonSchema` (`S:16778`). Serializable, semantic keys: `identifier`
(`S:16652`), `parseOptions` (`S:16653`), `brands` (`S:16657`), `representation` (`S:16704`,
`S:16766`), `expected` (`S:16574`), `message` (`S:16633`), `messageUnexpectedKey` (`S:16637`),
`messageMissingKey` (`S:16609`), `arbitrary` (`S:16809`), `~sentinels` (`S:16754`),
`~structural` (`S:16823`).

**Effect's own identity-insensitivity move, in the pinned bytes.** `pruneAnnotations`
(`SR:927-937`) keeps only entries satisfying `SchemaAST.isJson` (`AST:4347-4349`) and drops the
rest **silently**; it is wired into `AnnotationsSchema`'s encode getter (`SR:939-948`). So on
encode, every function-valued annotation vanishes without an error. The docstring at
`SR:1124-1126` says so: generic annotations that are not JSON are omitted.

**Annotation resolution reads from the last check, not the node.** The census's receipt is
`internal/schema/annotations.ts:6-8` (unpinned). The pinned corroboration is `annotate`
(`AST:3462-3466`): when `ast.checks` exists, `annotate` writes onto the **last check's**
annotations via `last.annotate(...)`, not onto `Base.annotations`. An admission function that
reads `Base.annotations` alone therefore misses the `identifier` of every refined schema.
*(The read-side symmetric claim rests on the unpinned file; see Pin request 3.)*

**Annotation key order.** `pruneAnnotations` iterates `Object.entries(annotations)`
(`SR:931`) and writes into a fresh object, so the emitted key order is JS own-key order of the
source bag. If annotations ever enter a pre-image, the lab must impose its own key order —
Effect's is insertion-derived and unstable across construction paths.

### 2.3 Checks

`Checks = readonly [Check<any>, ...Array<Check<any>>]` (`AST:612`); `Check<T> = Filter<T> |
FilterGroup<T>` (`AST:3290`).

`Filter` (`AST:3207-3239`): `_tag = "Filter"` (3208), `run` — a closure (3209), `annotations`
(3210), `aborted: boolean` (3214). `FilterGroup` (`AST:3255-3275`): `_tag` (3256), `checks` — a
non-empty recursive array (3257), `annotations` (3258).

Representation-side, the closure is gone: `SR:444-449` (`Filter` = `_tag`, `representation?`,
`annotations?`, `aborted`) and `SR:457-462` (`FilterGroup` = `_tag`, `representation?`,
`annotations?`, `checks`). **The check identity is `representation: {id, payload}`**
(`SR:25-28`, extended with `schemas?` for checks at `SR:36-38`).

**The optional/required mismatch is visible in one file.** In the live TS interfaces
`representation` is optional on `Filter` (`SR:446`), on `FilterGroup` (`SR:459`), and on
`Declaration` (`SR:146`). In the persistence codec it is **required** on `FilterSchema`
(`SR:958` — not wrapped in `Schema.optional`, unlike `FilterGroupSchema` at `SR:964`) and
required on `DeclarationSchema` (`SR:979`). A `Document` that type-checks can fail to encode.

`FilterGroup.checks` is ordered on the wire: `Schema.NonEmptyArray(CheckSchema)` (`SR:966`).
The full check-id catalog is §4.

### 2.4 Encoding

`Link` (`AST:401-416`) is `{to: AST, transformation: Transformation | Middleware}`; `Encoding`
is a non-empty `Link` array (`AST:432`). `getLastEncoding` (`AST:3457-3459`) walks to the
terminal encoded node.

**No Representation variant has an `encoding` field.** Read the 22-member union at `SR:406-428`
and every interface it names (`SR:144-150`, `158-163`, `171-174`, `176-180`, `188-260`,
`273-275`, `283-285`, `293`, `306-308`, `316-318`, `338-341`, `384-387`, `395-398`) — there is
no `encoding` anywhere. Nor is there one in the codec (`SR:952-1094`). Effect's answer to
unnamed transformations is deletion, not naming. This is the ratified basis for rejecting
`encoding` in v1 (KICKOFF §11 change 2), and it is now confirmable from lock-verified bytes
alone.

*(The claim that `Transformation`/`Middleware` carry no name, tag, or annotations rests on
`SchemaTransformation.ts`, which is **not** in the lock. See Pin request 1. Within the pinned
five, the corroborating fact is that `Link`'s only two fields are `to` and `transformation`
(`AST:402-405`) — there is no identity field on the `Link` itself.)*

### 2.5 Context

`Context` (`AST:576-595`): `isOptional: boolean` (577), `isMutable: boolean` (578),
`constructorDefault: Link | undefined` (580), `annotations: Key<unknown> | undefined` (581).
It lives on the property's **type AST** (`Base.context`, `AST:642`), not on
`PropertySignature`.

`withConstructorDefault` (`AST:3633-3646`) builds `new Link(unknown, transformation)` where the
transformation wraps `SchemaGetter.withDefault(defaultValue)` over an `Effect` — **the default
is always a closure over an Effect, never a literal**. `toCodecJsonAST` strips it
(`S:15373-15382`, `withoutConstructorDefault`), which is a second pinned confirmation that
Effect itself treats it as non-persistable.

`optionalKey` (`AST:3604-3611`) and `mutableKey` (`AST:3621-3628`) write through to the last
encoding link as well (`optionalKeyLastLink` 3613, `mutableKeyLastLink` 3630), so optionality
survives the encoded projection.

**One structural surprise worth flagging for the mapping table.** `optional` (`AST:3616-3618`)
is `optionalKey(new Union([ast, undefined_], "anyOf"))` — **`Schema.optional(X)` produces a
`Union` node, not a context flag**, with member order fixed at `[X, Undefined]` and mode
`anyOf`. Any mapping row for `Objects` that treats optionality as a boolean will silently
disagree with Effect for the `optional` (as opposed to `optionalKey`) case.

---

## 3. Per-variant dossier

Each entry gives: **(1)** constructor surface, **(2)** identity-relevant payload with
closure/host-bound flags, **(3)** Effect's own identity behaviour, **(4)** order sensitivity.
Section 3.22 handles the refinement/filter surface (mission item 5) at length.

### 3.1 `Declaration` — `AST:689-751`, `_tag` 690, `unionIndex` 0

**(1) Constructor surface.** Public: `Schema.declare(is, annotations?)` (`S:559-571`) for the
non-parametric case, and `Schema.declareConstructor<T,E,Iso>()(typeParameters, run,
annotations?)` (`S:493-515`) for the parametric case. Both bottom out in
`new SchemaAST.Declaration(typeParameters.map(getAST), …, annotations)` (`S:507-513`). The
class constructor is exported and public (`AST:700-715`) with eight parameters. A second
in-library construction site is `S:14553`.

**(2) Identity-relevant payload.** Class fields: `typeParameters: ReadonlyArray<AST>`
(`AST:691`) — nested AST, ordered; `run: DeclarationRun` (`AST:692`, type at `AST:666-668`) —
**closure**; `encodingChecks: Checks | undefined` (`AST:693`) — closure-bearing;
`encodingRun: DeclarationRun | undefined` (`AST:698`) — **closure**.

Representation-side (`SR:144-150`): `_tag`, `representation?`, `annotations?`,
`typeParameters` (ordered `ReadonlyArray<Representation>`), `checks`. Neither `run`,
`encodingRun`, nor `encodingChecks` has anywhere to go. The persistence codec
(`SR:977-983`) makes `representation` **required**.

So the only serializable identity is `annotations.representation: {id, payload}`
(`S:16704-16706`, shape `SR:25-28`), and it is optional on the class. `getExpected`
(`AST:746-750`) falls back to the literal `"<Declaration>"` when there is no `expected`
annotation — a `Declaration` with no annotations is structurally anonymous.

**(3) Effect's own identity behaviour.** 29 built-in declaration ids exist in the pinned bytes
(catalog in §4.2), each paired with a `makeDeclarationReviver` export. The `Json`/`MutableJson`
pair (`AST:4352-4376`) shows the identity resting entirely on the annotation string — see §1.3.
`toCodecJsonASTStep`'s `Declaration` case (`S:15430-15438`) reads
`ast.annotations?.toCodecJson ?? ast.annotations?.toCodec` and falls back to
`replaceEncoding(ast, [SchemaAST.unknownToJson])` (`S:15433`) when neither is a function — so an
un-annotated Declaration silently becomes "any JSON value" on the JSON codec side.

**(4) Order sensitivity.** `typeParameters` is positional in both carriers and in `run`'s
signature (`AST:666-668` passes the array to the factory). `Declaration.flip` (`AST:742-744`)
swaps `checks ↔ encodingChecks` and `run ↔ encodingRun` — so the same node under `toType`
versus `toEncoded` carries a different check list. There is no ordering claim on `checks`
beyond array order.

### 3.2 `Null` — `AST:765-775`, `_tag` 766, `unionIndex` 1

**(1)** `Schema.Null` (`S:3113`) = `make(SchemaAST.null)`; the AST singleton is `null_` at
`AST:777`, re-exported as `null` at `AST:790`. Constructor is `Base`'s (no own constructor), so
`new SchemaAST.Null(annotations?, checks?, encoding?, context?)` is public.
**(2)** No fields beyond `Base`. Representation `SR:188` = `Keyword<"Null">` = `_tag`,
`annotations?`, `checks`.
**(3)** `getParser` is `fromConst(this, null)` (`AST:768-770`). The singleton exists but the
constructor is public, so distinct instances differing only in annotations/checks are
constructible.
**(4)** None.

### 3.3 `Undefined` — `AST:805-819`, `_tag` 806, `unionIndex` 2

**(1)** `Schema.Undefined` (`S:3130`) = `make(SchemaAST.undefined)`; singleton `undefined_` at
`AST:829`, re-exported at `AST:842`.
**(2)** No fields beyond `Base`. Representation `SR:195`.
**(3)** `Undefined` participates in `toCodecJson` (`S:15443-15447` routes it through
`ast.toCodecJson()`), because `undefined` has no JSON form.
**(4)** None — except that `Schema.optional(X)` synthesizes `Union([X, undefined_], "anyOf")`
(`AST:3616-3618`), which puts `Undefined` in a *second* position by construction.

### 3.4 `Void` — `AST:865-880`, `_tag` 866, `unionIndex` 3

**(1)** `Schema.Void` (`S:3261`) = `make(SchemaAST.void)`; singleton `void_` at `AST:882`,
re-exported at `AST:904`.
**(2)** No fields beyond `Base`. Representation `SR:202`.
**(3)** Routed through `toCodecJson()` alongside `Undefined` (`S:15443-15447`).
**(4)** None.

### 3.5 `Never` — `AST:920-930`, `_tag` 921, `unionIndex` 4

**(1)** `Schema.Never` (`S:3057`) = `make(SchemaAST.never)`; singleton at `AST:946`.
**(2)** No fields beyond `Base`. Representation `SR:209`.
**(3)** **`Never` is filtered out of union candidate selection**: `getIndex` skips a member
whose candidate form `isNever` (`AST:2730`, `if (isNever(encoded)) continue`). And
`Union.getExpected` special-cases an empty type list as `"never"` (`AST:3004`). So a `Never`
member of a union is decode-invisible but structurally present.
**(4)** None on its own; see the union entry for the consequence.

### 3.6 `Unknown` — `AST:997-1007`, `_tag` 998, `unionIndex` 5

**(1)** `Schema.Unknown` (`S:3096`) = `make(SchemaAST.unknown)`; singleton at `AST:1022`.
**(2)** No fields beyond `Base`. Representation `SR:216`.
**(3)** `Unknown` is the "escape hatch" target: `toCodecJsonASTStep` maps it to
`replaceEncoding(ast, [SchemaAST.unknownToJson])` (`S:15439-15440`), and `toCandidate` returns
`unknown` for `Suspend` (`AST:2601`) and for middleware-bearing encodings (`AST:2607-2609`).
So a lot of structure collapses to `Unknown` inside union selection.
**(4)** None.

### 3.7 `Any` — `AST:957-967`, `_tag` 958, `unionIndex` 6

**(1)** `Schema.Any` (`S:3074`) = `make(SchemaAST.any)`; singleton at `AST:982`.
**(2)** No fields beyond `Base`. Representation `SR:223`.
**(3)** Both codec-derivation walks have a trailing comment naming `Schema.Any` as the escape
hatch and returning the node unchanged (`S:15475`, `S:15829-15830`).
**(4)** None.

### 3.8 `String` — `AST:1376-1391`, `_tag` 1377, `unionIndex` 7

**(1)** `Schema.String` (`S:3146`) = `make(SchemaAST.string)`; singleton at `AST:1406`.
**(2)** No fields beyond `Base`. Representation `SR:231`. All the interesting content of a
"string schema" lives in `checks` — see §4.1, where 18 of the 46 built-in check ids are
string-shaped.
**(3)** `String` is one of the five admissible `IndexSignatureParameter` shapes
(`AST:1987-1992`) and one of the six admissible `TemplateLiteralPart` shapes (`AST:1118-1124`).
**(4)** None.

### 3.9 `Number` — `AST:1427-1468`, `_tag` 1428, `unionIndex` 8

**(1)** `Schema.Number` (`S:3170`) = `make(SchemaAST.number)`; singleton at `AST:1491`.
**(2)** No fields beyond `Base`.
**(3) This is the variant where check identity becomes behaviour.** `toCodecJson`
(`AST:1448-1456`) returns the node unchanged **iff** `hasCheck(this.checks,
"effect/schema/isFinite")` or `hasCheck(this.checks, "effect/schema/isInt")`; otherwise it
attaches the `numberToJson` encoding (`AST:3343-3345`, a `Link` to
`Union([finite, nonFiniteLiterals], "anyOf")`). `hasCheck` (`AST:1470-1475`) matches purely on
`check.annotations?.representation?.id`. So **the derived JSON codec of a number schema is a
function of a string in the annotation bag**, and by §1.5 that string is caller-controllable.
`toCodecStringTree` (`AST:1458-1463`) chains off the same decision.
`matchKey`/`matchPart` (`AST:1434-1446`) additionally run the node's checks during template-
literal and index-signature matching.
**(4)** None on the node. `Number` is priority-`0` in `toStringTreeReorder` (`S:15760`), so a
union containing `Number` is reordered on the string-tree codec path.

### 3.10 `Boolean` — `AST:1502-1512`, `_tag` 1503, `unionIndex` 9

**(1)** `Schema.Boolean` (`S:3192`) = `make(SchemaAST.boolean)`; singleton at `AST:1528`.
**(2)** No fields beyond `Base`. Representation `SR:246`.
**(3)** `toCodecStringTree` routes it through `booleanToString` (`S:15794-15795`).
**(4)** None on the node; priority-`0` in `toStringTreeReorder` (`S:15759`).

### 3.11 `BigInt` — `AST:1602-1623`, `_tag` 1603, `unionIndex` 10

**(1)** `Schema.BigInt` (`S:3232`) = `make(SchemaAST.bigInt)`; singleton at `AST:1639`.
**(2)** No fields beyond `Base`. Representation `SR:253`.
**(3)** Docstring at `AST:1592-1595`: string-based codecs convert bigints to and from their
**decimal string** representation. On the wire, a bigint `Literal` value is tagged
`{type: "bigint", value}` (`SR:1006`).
**(4)** `BigInt` is priority-`0` in **both** reorderings (`S:15419`, `S:15761`), so a union
containing a `BigInt` member is reordered ahead of non-`BigInt` members on both codec paths.
This is the clearest single instance of Effect rewriting semantic union order.

### 3.12 `Symbol` — `AST:1548-1567`, `_tag` 1549, `unionIndex` 11

**(1)** `Schema.Symbol` (`S:3209`) = `make(SchemaAST.symbol)`; singleton at `AST:1587`.
**(2)** No fields beyond `Base`. Representation `SR:260`.
**(3) Host-bound.** Docstring at `AST:1577-1580`: string-based codecs can encode only symbols
registered with `Symbol.for`, because the implementation uses `Symbol.keyFor`.
`toCodecStringTree` (`AST:1560-1562`) attaches `symbolToString` unconditionally, so an
unregistered symbol fails at run time rather than at construction.
**(4)** None on the node; priority-`0` in both reorderings (`S:15420`, `S:15762`).

### 3.13 `Literal` — `AST:1315-1352`, `_tag` 1316, `unionIndex` 12

**(1)** `Schema.Literal(literal)` (`S:2785-2795`) = `make(new SchemaAST.Literal(literal), …)`.
Also constructed implicitly by `Schema.Literals` (`S:4969-4971`, one `Literal` per value inside
a `Union`), by `templateLiteralFromParts` for non-schema parts (`S:2883`), and inside
`Enum.toCodecStringTree` (`AST:1102`).
**(2)** `literal: LiteralValue` (`AST:1317`), where `LiteralValue = string | number | boolean |
bigint` (`AST:1289`). Plain data. Representation `SR:273-275` keeps it; the persistence codec
(`SR:1000-1009`) wraps it in a type-discriminated union of four value codecs —
`{type:"string"}`, `{type:"number", value: Schema.Finite}`, `{type:"bigint"}`,
`{type:"boolean"}`.
**(3)** Constructor rejects non-finite numbers (`AST:1327-1329`), and the persistence codec
independently enforces finiteness with `Schema.Finite` (`SR:1005`). `toCodecJson`
(`AST:1341-1343`) converts a bigint literal to its string form; `toCodecStringTree`
(`AST:1345-1347`) converts every non-string literal. `getExpected` (`AST:1349-1351`)
`JSON.stringify`s strings and `String()`s everything else.
**(4)** None on the node. But `matchPart` (`AST:1337-1339`) compares
`s === globalThis.String(this.literal)`, so **`Literal(1)` and `Literal("1")` match the same
template-literal part** — a coarsening the lab should know about if template literals are ever
admitted.

*Relevant to the ratified R-11 (integers and bigints admitted, non-integer doubles deferred):
the pinned bytes give three separate finiteness gates —* `AST:1327-1329`, `SR:1005`, and
`encodeNumberPayload` (`S:7944-7948`) *— but no integrality gate anywhere. `Literal(1.5)` is
fully legal in Effect and round-trips.*

### 3.14 `UniqueSymbol` — `AST:1253-1279`, `_tag` 1254, `unionIndex` 13

**(1)** `Schema.UniqueSymbol(symbol)` (`S:3307-3309`) = `make(new SchemaAST.UniqueSymbol(symbol))`.
The docstring example uses `Symbol.for("mySymbol")` (`S:3298`).
**(2)** `symbol: symbol` (`AST:1255`) — **host-bound, not serializable by value**. The
Representation keeps a live `symbol` (`SR:283-285`) and the persistence codec encodes it as
`Schema.Symbol` (`SR:1013`).
**(3)** The pinned `SR:351-354` gotcha states plainly: local symbols can be represented while
the schema is live, but **persistent codecs reject them because they cannot be reconstructed by
identity**. `toCodecStringTree` (`AST:1272-1274`) attaches `symbolToString`, which per
`AST:1577-1580` is `Symbol.keyFor`-based. So the admissible sub-case is exactly the
`Symbol.for` registry, carried as the key string.
**(4)** None on the node. `UniqueSymbol` participates in union literal-candidate indexing
alongside `Literal` (`AST:2733-2737` keys the candidate map on `encoded.symbol`), and is
priority-`0` in both reorderings (`S:15421`, `S:15763`).

### 3.15 `ObjectKeyword` — `AST:1034-1044`, `_tag` 1035, `unionIndex` 14

**(1)** `Schema.ObjectKeyword` (`S:3278`) = `make(SchemaAST.objectKeyword)`; singleton at
`AST:1060`.
**(2)** No fields beyond `Base`. Representation `SR:293`.
**(3)** `toCodecJsonASTStep` maps it to `replaceEncoding(ast, [objectKeywordToJson])`
(`S:15441-15442`), where `objectKeywordToJson` (`AST:4385-4391`) is a `Link` to
`Union([Arrays(false, [], [Json]), Objects([], [IndexSignature(string, Json)])], "anyOf")` —
i.e. the JSON projection of `object` is a two-member union built from `Json` declarations.
**(4)** None.

### 3.16 `Enum` — `AST:1074-1116`, `_tag` 1075, `unionIndex` 15

**(1)** `Schema.Enum(enums)` (`S:3032-3041`) = `new SchemaAST.Enum(Object.keys(enums).filter(key
=> typeof enums[enums[key]] !== "number").map(key => [key, enums[key]]))`. The filter drops the
reverse-mapping keys TypeScript synthesizes for numeric enums; the surviving order is
`Object.keys` order of the source enum object.
**(2)** `enums: ReadonlyArray<readonly [string, string | number]>` (`AST:1076`) — plain data,
name/value pairs. Representation `SR:306-308` keeps it; the codec (`SR:1015-1022`) encodes each
pair as `Tuple([String, Union([StringValueCodec, NumberValueCodec])])`, so **the name survives
to the wire**.
**(3) The names are decode-irrelevant.** `getParser` (`AST:1089-1095`) builds
`new Set(this.enums.map(([, v]) => v))` and refines on set membership — the first tuple element
never enters the predicate. `getExpected` (`AST:1113-1115`) likewise joins only values. So two
enums differing only in member *names* are behaviourally identical and persistently distinct.
Duplicate values collapse in the `Set` but survive in the array.
`toCodecStringTree` (`AST:1097-1111`) rebuilds a `Union` of string `Literal`s from
`Object.keys(coercions)` when any value is numeric — that union's order is
`Object.keys` order of a freshly built coercion object, i.e. derived, not declared.
**(4)** Array order is preserved on the wire and is irrelevant to decode. Whether the lab's
address should preserve it is a question, not a fact — see Hard Call 4.

### 3.17 `TemplateLiteral` — `AST:1155-1239`, `_tag` 1156, `unionIndex` 16

**(1)** `Schema.TemplateLiteral(parts)` via `templateLiteralFromParts` (`S:2881-2885`):
`new SchemaAST.TemplateLiteral(parts.map(part => isSchema(part) ? part.ast : new
SchemaAST.Literal(part)))`.
**(2)** Four fields (`AST:1157-1163`), of which **one is primary**: `parts:
ReadonlyArray<AST>` (1157). The other three — `encodedParts` (1159), `literals` (1161),
`suffixLengths` (1163) — are all marked `@internal` and are computed in the constructor
(`AST:1173-1192`) from `parts`. Representation `SR:316-318` keeps `parts` only; codec at
`SR:1023-1027` likewise. The inventory marks all three `derived-cache`.
**(3)** The constructor calls `toEncoded(part)` on each part and throws
`Invalid TemplateLiteral part ${encoded._tag}` (`AST:1181`) when the encoded part is not one of
`String | Number | BigInt | Literal | TemplateLiteral | Union<TemplateLiteralPart>`
(`AST:1118-1124`, guard at `AST:1126-1140`). Note the guard **rejects `Literal`,
`TemplateLiteral`, and `Union` parts that carry `checks`** (`AST:1134`, `1136`) — so a check on
a part is a construction-time rejection, not a silent drop.
Per the census, `TemplateLiteral` has **no `recur`**, so its `parts` are not walked by `toType`
or `flip`; the `encodedParts` cache was computed once at construction (`AST:1176`). That means
`toEncoded(TemplateLiteral)` does not project the parts, and a later change to a part's encoding
is not reflected.
**(4)** `parts` is positional and semantic — it is a concatenation. `suffixLengths`
(`AST:1184-1188`) is a running suffix-length table computed right-to-left, which is only
meaningful for the given order.

### 3.18 `Arrays` — `AST:1683-1836`, `_tag` 1684, `unionIndex` 17

**(1)** Four public paths, each fixing a different field combination:
`Schema.Array(schema)` → `new SchemaAST.Arrays(false, [], [schema.ast])` (`S:4631`);
`Schema.ArrayEnsure`/`NonEmptyArray` shape → `new SchemaAST.Arrays(false, [schema.ast],
[schema.ast])` (`S:4699`); `Schema.Tuple(elements)` → `SchemaAST.tuple` =
`new Arrays(false, elements.map(e => e.ast), [])` (`S:4413`, `AST:2541-2546`);
`Schema.TupleWithRest` → `tupleWithRest` (`AST:2574-2579`).
`Schema.mutable(schema)` (`S:4829-4831`) = `new SchemaAST.Arrays(true, schema.ast.elements,
schema.ast.rest)` is the **only** public path to `isMutable = true` in the pinned bytes — and
note it passes no `annotations`, `checks`, `encoding`, `context`, or `encodingChecks`, so
`Schema.mutable` **drops them all**.
**(2)** `isMutable: boolean` (`AST:1685`); `elements: ReadonlyArray<AST>` (1686) — positional,
optionality read off each child's `context`; `rest: ReadonlyArray<AST>` (1687) — `[0]` is the
spread and `[1..]` are trailing elements; `encodingChecks: Checks | undefined` (1688) —
closure-bearing.
Representation `SR:338-341` has **`elements: ReadonlyArray<Element>` and `rest:
ReadonlyArray<Representation>` only**. `Element` (`SR:326-330`) is `{isOptional, type,
annotations?}`. Codec `ArraysSchema` (`SR:1033-1038`) and `ElementSchema` (`SR:1028-1032`)
agree. So **`isMutable` is dropped, and so is element-level `isMutable`** (`Element` has no such
field, while `PropertySignature` at `SR:363` does).
**(3)** The constructor enforces the TypeScript ordering rules and throws: a required element
after an optional one (`AST:1711`), the same with a multi-element rest (`AST:1715`), and an
optional element after the rest element (`AST:1721`). `Arrays` is one of the three families
whose `encodingChecks` get the `~structural` lift under `toType` (census §3, from
`AST:3745-3752`).
**(4)** `elements` and `rest` are both positional and semantic. The spread-versus-trailing
distinction inside `rest` is positional (`rest[0]` is the spread, `rest[1..]` are trailing),
not tagged, so an address over `rest` must preserve index, not just membership.

**This is the #3509 exhibit.** `Schema.mutable(Schema.Array(Schema.String))` and
`Schema.Array(Schema.String)` differ in exactly one boolean in the carrier and produce
byte-identical Representations. Effect's revival is *stable but not faithful*: per the census,
`fromRepresentation` rebuilds readonly constructors only. The lab's L3 ("never route carrier
information around the encoder") says either `isMutable` is in the pre-image or the model must
prove the declared equivalence ignores it.

### 3.19 `Objects` — `AST:2097-2456`, `_tag` 2098, `unionIndex` 18

**(1)** `Schema.Struct(fields)` (`S:3581-3582`) → `SchemaAST.struct(fields, undefined)`
(`AST:2520-2533`), which builds `Reflect.ownKeys(fields).map(key => new PropertySignature(key,
fields[key].ast))` and an empty index-signature list. `Schema.Record(key, value)`
(`S:3961-3966`) → `SchemaAST.record(key.ast, value.ast)`. `Schema.StructWithRest`
(`S:4195`) → `structWithRest` (`AST:2558-2571`), which **concatenates** property signatures and
index signatures from the struct and each record, in argument order (`AST:2566-2567`).
**(2)** `propertySignatures: ReadonlyArray<PropertySignature>` (`AST:2099`),
`indexSignatures: ReadonlyArray<IndexSignature>` (`AST:2100`), `encodingChecks` (`AST:2101`,
closure-bearing).
`PropertySignature` (`AST:1974-1985`) is `{name: PropertyKey, type: AST}` — **only two
fields**; optionality, mutability, and key annotations live on `type.context`
(`AST:576-595`, §2.5). `IndexSignature` (`AST:2036-2053`) is `{parameter:
IndexSignatureParameter, type: AST}`.
Representation `SR:384-387` keeps both arrays. `Representation.PropertySignature`
(`SR:359-365`) **flattens** `context` onto the property: `{name, type, isOptional, isMutable,
annotations?}`. `Representation.IndexSignature` (`SR:373-376`) is `{parameter, type}` — no
annotations, no context.
`name: PropertyKey` includes `symbol`; the codec (`SR:1039-1049`) encodes it as a
type-discriminated union of `{type:"string"}`, `{type:"number"}`, `{type:"symbol"}`.
**(3)** The constructor throws on duplicate property names (`AST:2118-2121`).
`IndexSignature`'s constructor throws on an invalid parameter (`AST:2044-2046`) and on an
`optionalKey`-marked value type (`AST:2049-2051`). Both codec-derivation walks call
`validateCanonicalObjectPropertyNames` (`S:15384-15388`), which **throws** unless every property
name is a string — so symbol-named properties are already inadmissible to Effect's own JSON and
string-tree codecs. That is direct pinned support for the ratified "v1 admits string names
only".
**(4)** Property order is semantic and observable. The census established this from the two
parser paths; the additional pinned receipt is the source of the order itself:
`SchemaAST.struct` uses `Reflect.ownKeys(fields)` (`AST:2526`), which is JS own-key order —
integer-like keys ascend first, then string keys in insertion order, then symbols. So
`Schema.Struct({ b: …, 2: …, a: …, 1: … })` yields AST order `1, 2, b, a`. Index-signature order
is argument order via `structWithRest` (`AST:2566-2567`). The library disclaims key-order
stability for the default `propertyOrder: "none"` at `AST:500-504`.

*This is the ratified R-10 territory (sort-by-name identity). The pinned bytes support the
ruling's premise — duplicate names are rejected (`AST:2119-2121`) so the sort is total — and
also show why the faithful option would be awkward: the AST order the lab would preserve is not
the source order the user wrote.*

### 3.20 `Union` — `AST:2913-3036`, `_tag` 2914, `unionIndex` 19

**(1)** `Schema.Union(members, options?)` (`S:4923-4928`) → `SchemaAST.union(members,
options?.mode ?? "anyOf", undefined)` (`AST:2549-2555`), which is `new Union(members.map(getAST),
mode, undefined, checks)` — **no sort, no dedupe**. `Schema.Literals(literals)`
(`S:4969-4971`) builds one `Literal` per value and unions them in order.
`SchemaAST.optional` (`AST:3616-3618`) synthesizes `Union([ast, undefined_], "anyOf")`.
Additional in-library sites: `AST:1102` (`Enum.toCodecStringTree`), `AST:4386-4389`
(`objectKeywordToJson`), `AST:3344` (`numberToJson`), `S:15842`, `S:15874`.
**(2)** `types: ReadonlyArray<A extends AST>` (`AST:2915`), `mode: "anyOf" | "oneOf"`
(`AST:2916`), `encodingChecks` (`AST:2917`, closure-bearing). Representation `SR:395-398`
keeps `types` and `mode`; codec at `SR:1060-1065` with `mode: Schema.Literals(["anyOf",
"oneOf"])`.
**(3)** Beyond the census's decode-order receipts, the pinned public docstring states the
semantics outright: *"Members are tested in order; the first match is returned"* (`S:4900-4901`).
`Never` members are skipped in candidate indexing (`AST:2730`). The single `.sort()` in
`SchemaAST.ts` is at `AST:2845` and is numeric on original indices — it restores declaration
order after a `Set`, exactly as the census read it.
**(4) Order is semantic, and Effect rewrites it on the codec-derivation paths.** See §1.1.
`toCodecJsonReorder` (`S:15417-15426`) and `toStringTreeReorder` (`S:15756-15768`) are stable
priority sorts applied in the `Union` case of each walk (`S:15456-15470`, `S:15810-15824`); each
rebuilds `new SchemaAST.Union(sortedTypes, ast.mode, ast.annotations, ast.checks, ast.encoding,
ast.context, ast.encodingChecks)` when the order changed. Both reorderings compare on
`SchemaAST.toEncoded(a)` (`S:15400-15401`) and tie-break on the original index (`S:15406`) —
so they are total and tie-free, unlike Unison's hash-sort. They are **not** applied by
`SchemaRepresentation.toRepresentation`, which lowers `toEncoded` (`SR:768`); they are applied
by `Schema.toJsonSchemaDocument`, which runs `toCodecJsonAST` first (per the census, `S:15299-15308`).

### 3.21 `Suspend` — `AST:3144-3180`, `_tag` 3145, `unionIndex` 20

**(1)** `Schema.suspend(f)` (`S:5112-5114`) = `make(new SchemaAST.Suspend(() => f().ast))`.
**(2)** `thunk: () => AST` (`AST:3146`) — **a closure, and the node's entire content**. There is
no name, label, or identifier field. Representation `SR:158-163` replaces it with
`thunk: Representation` (an already-forced value) and pins `checks: readonly []` (`SR:161`);
codec at `SR:984-989` with `checks: Schema.Tuple([])`.
**(3)** The thunk is memoized at construction: `this.thunk = memoizeThunk(thunk)`
(`AST:3159`); `getParser` (`AST:3162-3165`) memoizes the compiled parser on top
(`parser ??= compile(this.thunk())`). **Checks are forbidden**, at construction
(`AST:3155-3157`, `throw new Error("Cannot add checks to Suspend")`) and again in
`replaceChecks` (`AST:3474-3476`). `recur` (`AST:3167-3175`) builds a fresh `Suspend` wrapping
`() => recur(this.thunk())` and drops `checks` and `encoding` while keeping `annotations` and
`context`. `getExpected` (`AST:3177-3179`) delegates straight through to the thunk's target, so
`Suspend` contributes nothing to an error label. `toCandidate` returns `unknown` for a
`Suspend` (`AST:2601`), so a `Suspend` member of a union matches *everything* in candidate
selection.
**(4)** None on the node.

*This variant is where the ratified mandatory-discriminator `mu` diverges from Effect. The
recursion identity in Effect is the `identifier` annotation with a synthesized fallback; the
receipts for that are in the unpinned `internal/schema/toRepresentation.ts` and are recorded by
the census. What is provable from the pinned five is narrower but still load-bearing:
`ReferencePolicyInput.identifier` is `string | undefined` (`SR:713`), the default policy is
documented as `({ identifier }) => identifier` (`SR:762`), the docstring states that recursive
candidates always require a reference and receive a **synthetic name** when the policy returns
`undefined` (`SR:731-734`, `SR:758-760`), and candidate identity is object identity —
"Structurally equal ASTs remain distinct candidates" (`SR:710`). Every one of those is a
docstring or a type in a lock-verified file.*

### 3.22 The refinement/filter surface (mission item 5)

Filters are not one of the 21 variants — they are the `checks` field every variant carries
(§2.3). Their concrete payload shapes are catalogued exhaustively in §4. What belongs here are
the structural facts a mapping ruling needs:

- **A check has no required identity in the carrier.** `Filter`'s constructor defaults
  `annotations` to `undefined` (`AST:3218`). `Schema.filter`-style user checks built through
  `makeFilter` (`AST:3293-3303`) with no annotations argument have **only the closure**.
- **Effect's persistence makes it required anyway**, asymmetrically: `FilterSchema.representation`
  is not optional (`SR:958`) while `FilterGroupSchema.representation` is (`SR:964`). A
  `FilterGroup` can therefore be revived structurally from its children; a leaf `Filter` cannot.
- **`aborted` is the only behaviourally-relevant non-annotation datum**, and it round-trips
  (`AST:3214` → `SR:448` → `SR:960`). `makeFilterByGuard` (`AST:3306-3315`) always sets it
  `true` with the comment *"after a guard, we always want to abort"*.
- **`schemas` is a fourth payload channel.** `CheckRepresentationAnnotation<S>` extends the
  base with `schemas?: ReadonlyArray<S>` (`SR:36-38`), encoded as
  `Schema.optional(RepresentationsSchema)` (`SR:924`). Exactly one built-in uses it:
  `isPropertyNames` carries `schemas: [propertyNames.ast]` (`S:9510`). So a check can carry
  nested schema structure, ordered, positionally addressed by its reviver (`S:9512-9513` read
  `schemas[0]`).
- **`~structural` is a fifth channel**, a boolean that changes which checks survive `toType`.
  Ten built-ins set it (`S:8892`, `8978`, `9048`, `9113`, `9176`, `9243`, `9308`, `9370`,
  `9437`, `9514`); the reader is `isStructuralCheck` (`AST:3740-3743`), which also treats a
  `FilterGroup` as structural iff **every** child is, and `extractStructuralChecks`
  (`AST:3745-3752`) flattens a group to its structural leaves — **losing the grouping**.
- **A check group is a tree, and flattening is lossy.** `FilterGroup.checks` is ordered and
  non-empty (`AST:3257`, `SR:461`, `SR:966`); `.and()` (`AST:3235-3238`, `AST:3271-3274`)
  always produces `new FilterGroup([this, other], annotations)`, so `a.and(b).and(c)` nests
  left as `FilterGroup([FilterGroup([a, b]), c])` rather than flattening to
  `FilterGroup([a, b, c])`. **Two check lists that are semantically the same conjunction have
  different tree shapes and therefore different bytes.**
- **Revivers are the library's own allowlist and are not installed implicitly.** 46
  `FilterReviver` exports and 29 `DeclarationReviver`/`makeFixedDeclarationReviver` exports
  exist in `Schema.ts` (§4). The reviver interface is
  `{id, payloadSchema: Schema.Decoder<P>, revive}` (`SR:518-526`), so **each id has a declared
  payload schema** — which is the closest thing to a canonical parameter normal form the pinned
  source offers, and it is one Effect schema per id, not a uniform shape.

---

## 4. Check and declaration id catalog (feeds R-4)

Extracted by scanning both lock-verified files for `representation: {` blocks and reading the
`id`/`payload` immediately following. 75 sites total: 7 in `SchemaAST.ts`, 68 in `Schema.ts`.
Split 46 check ids / 29 declaration ids. The 46 check ids match the 46
`SchemaRepresentation.FilterReviver<…>` exports in `Schema.ts` one-for-one.

### 4.1 The 46 check ids

All ids are prefixed `effect/schema/`; the prefix is omitted below. "S" = carries
`~structural: true`.

| id | payload shape | site | reviver | S |
|---|---|---|---|---|
| `isFinite` | `null` | `AST:3323` | `S:7718` | |
| `isPattern` | `{ source, flags }` | `AST:3397` | `S:6857` | |
| `isStringFinite` | `null` | `AST:4023` | `S:6903` | |
| `isStringBigInt` | `null` | `AST:4058` | `S:6945` | |
| `isStringSymbol` | `null` | `AST:4114` | `S:6982` | |
| `isTrimmed` | `null` | `S:6769` | `S:6797` | |
| `isUUID` | `{ version: 1..8 \| null }` | `S:7038` | `S:7061` | |
| `isGUID` | `null` | `S:7100` | `S:7123` | |
| `isULID` | `null` | `S:7153` | `S:7176` | |
| `isBase64` | `null` | `S:7206` | `S:7229` | |
| `isBase64Url` | `null` | `S:7260` | `S:7283` | |
| `isStartsWith` | `{ startsWith: string }` | `S:7307` | `S:7335` | |
| `isEndsWith` | `{ endsWith: string }` | `S:7361` | `S:7389` | |
| `isIncludes` | `{ includes: string }` | `S:7416` | `S:7444` | |
| `isUppercased` | `null` | `S:7472` | `S:7500` | |
| `isLowercased` | `null` | `S:7526` | `S:7554` | |
| `isCapitalized` | `null` | `S:7580` | `S:7608` | |
| `isUncapitalized` | `null` | `S:7634` | `S:7662` | |
| `isGreaterThan` | `{ exclusiveMinimum: number }` | `S:7972` | `S:7993` | |
| `isGreaterThanOrEqualTo` | `{ minimum: number }` | `S:8022` | `S:8043` | |
| `isLessThan` | `{ exclusiveMaximum: number }` | `S:8072` | `S:8093` | |
| `isLessThanOrEqualTo` | `{ maximum: number }` | `S:8122` | `S:8143` | |
| `isBetween` | `{ minimum, maximum, exclusiveMinimum?: true, exclusiveMaximum?: true }` | `S:8184` (built `S:8177-8182`) | `S:8213` | |
| `isMultipleOf` | `{ divisor: number }` | `S:8251` | `S:8272` | |
| `isInt` | `null` | `S:8303` | `S:8331` | |
| `isGreaterThanDate` | `{ exclusiveMinimum: ISO-8601 string }` | `S:8473` | `S:15912` | |
| `isGreaterThanOrEqualToDate` | `{ minimum: ISO string }` | `S:8508` | `S:15932` | |
| `isLessThanDate` | `{ exclusiveMaximum: ISO string }` | `S:8537` | `S:15952` | |
| `isLessThanOrEqualToDate` | `{ maximum: ISO string }` | `S:8572` | `S:15972` | |
| `isBetweenDate` | `{ minimum, maximum: ISO strings, exclusive*?: true }` | `S:8614` (built `S:8607-8612`) | `S:15992` | |
| `isGreaterThanBigInt` | `{ exclusiveMinimum: base-10 string }` | `S:8647` | `S:16020` | |
| `isGreaterThanOrEqualToBigInt` | `{ minimum: base-10 string }` | `S:8677` | `S:16040` | |
| `isLessThanBigInt` | `{ exclusiveMaximum: base-10 string }` | `S:8706` | `S:16060` | |
| `isLessThanOrEqualToBigInt` | `{ maximum: base-10 string }` | `S:8736` | `S:16080` | |
| `isBetweenBigInt` | `{ minimum, maximum: base-10 strings, exclusive*?: true }` | `S:8773` (built `S:8766-8771`) | `S:16100` | |
| `isMinLength` | `{ minLength: number }` | `S:8886` | `S:8915` | S |
| `isMaxLength` | `{ maxLength: number }` | `S:8972` | `S:9001` | S |
| `isLengthBetween` | `{ minimum, maximum }` | `S:9039` | `S:9072` | S |
| `isMinSize` | `{ minSize: number }` | `S:9107` | `S:9136` | S |
| `isMaxSize` | `{ maxSize: number }` | `S:9170` | `S:9199` | S |
| `isSizeBetween` | `{ minimum, maximum }` | `S:9237` | `S:9267` | S |
| `isMinProperties` | `{ minProperties: number }` | `S:9302` | `S:9331` | S |
| `isMaxProperties` | `{ maxProperties: number }` | `S:9364` | `S:9393` | S |
| `isPropertiesLengthBetween` | `{ minimum, maximum }` | `S:9431` | `S:9461` | S |
| `isPropertyNames` | `null` **+ `schemas: [AST]`** | `S:9507-9511` | `S:9532` | S |
| `isUnique` | `null` | `S:9559` | `S:9587` | |

**Payload observations that bear on a canonical-parameter rule.**

1. **The payload space is small and JSON-shaped, but not uniform.** 24 of 46 have `payload:
   null`; the rest are flat one-, two-, or four-key objects. Nothing nests. One (`isPropertyNames`)
   carries no payload but does carry a nested schema.
2. **Numeric payloads are guarded, not normalized.** `encodeNumberPayload` (`S:7944-7948`)
   throws `RangeError` on a non-finite input and otherwise **returns the number unchanged** —
   there is no integer coercion, no rounding, no canonical form. `isGreaterThan(0.1)` persists
   `0.1`. Under the ratified R-11 (non-integer doubles deferred), an id allowlist that admits
   the ordered-comparison family for `Number` must also decide what happens to a non-integer
   bound.
3. **Date and BigInt payloads are pre-normalized to strings.** `encodeDatePayload`
   (`S:8443-8448`) throws on an invalid `Date` and returns `date.toISOString()`; the BigInt
   family uses `.toString(10)` (`S:8645`, `S:8767-8768`). Those two families are already in a
   canonical string form.
4. **Optional payload keys are omitted, not set to `false`.** `isBetween` builds
   `...(exclusiveMinimum && { exclusiveMinimum })` (`S:8180-8181`; same at `S:8610-8611`,
   `S:8769-8770`), so absence means inclusive. A JSON-object hash must decide whether
   `{minimum, maximum}` and `{minimum, maximum, exclusiveMinimum: false}` are the same payload.
5. **Payload key order is JS insertion order.** The `payload` objects are ordinary object
   literals; the codec types the field as `Schema.Json` (`SR:919`) with no key ordering. Any
   pre-image over a payload needs the lab's own key sort.
6. **Ids are namespaced but the namespace is not enforced.** Every built-in uses the
   `effect/schema/` prefix; the codec only requires `Schema.NonEmptyString` (`SR:918`). A user
   id can be anything, including a string that shadows a built-in.
7. **Two ids are aliases of a third, with a narrower payload.** `isStringFinite` (`AST:4018-4031`)
   and `isUUID` (`S:7032-7045`) are both implemented as `isPattern(regExp, {…, representation:
   {id: "…", payload: …}, …})` — they override `isPattern`'s own representation. `isStringFinite`
   discards the regexp entirely (`payload: null`), so the regexp is knowable only from the
   reviver. That is a design the lab could copy (id carries semantics, payload carries
   parameters) or reject (the payload is not a complete description of the check).

### 4.2 The 29 declaration ids

| id | payload | site |
|---|---|---|
| `Json` | `null` | `AST:4359` |
| `MutableJson` | `null` | `AST:4372` |
| `Option` | `null` | `S:9709` |
| `Result` | `null` | `S:10035` |
| `Redacted` | `normalizedOptions ?? null` | `S:10221` |
| `CauseReason` | `null` | `S:10408` |
| `Cause` | `null` | `S:10584` |
| `Error` | `normalizedOptions ?? null` | `S:10752` |
| `Exit` | `null` | `S:10944` |
| `ReadonlyMap` | `null` | `S:11186` |
| `Graph` | `type` (the `Graph_.Kind` string) | `S:11476` |
| `HashMap` | `null` | `S:11576` |
| `ReadonlySet` | `null` | `S:11686` |
| `HashSet` | `null` | `S:11796` |
| `Chunk` | `null` | `S:11913` |
| `RegExp` | `null` | `S:11990` |
| `URL` | `null` | `S:12093` |
| `Date` | `null` | `S:12221` |
| `Duration` | `null` | `S:12372` |
| `BigDecimal` | `null` | `S:12650` |
| `File` | `null` | `S:12825` |
| `FormData` | `null` | `S:12921` |
| `URLSearchParams` | `null` | `S:13098` |
| `Uint8Array` | `null` | `S:13606` |
| `DateTimeUtc` | `null` | `S:13771` |
| `TimeZoneOffset` | `null` | `S:13956` |
| `TimeZoneNamed` | `null` | `S:14022` |
| `TimeZone` | `null` | `S:14123` |
| `DateTimeZoned` | `null` | `S:14229` |

26 of 29 carry `payload: null`, so the declaration's identity is the id plus the (ordered)
`typeParameters`. Corresponding revivers: `S:9761`, `10095`, `10269`, `10459`, `10622`, `10782`,
`11024`, `11230`, `11508`, `11621`, `11731`, `11841`, `11958` (via `makeDeclarationReviver`) and
`S:12061`, `12124`, `12255`, `12441`, `12699`, `12894`, `12976`, `13129`, `13635`, `13810`,
`13990`, `14060`, `14164`, `14274`, `16395`, `16460` (via `makeFixedDeclarationReviver`, defined
`S:6732-6736`).

---

## 5. Pin requests

Files whose bytes are in the cache but **not** in `.reference/provenance/sources.lock.json`, and
what a claim in this dossier would need them for. Ordered by how much of the mapping ruling
depends on them.

1. **`packages/effect/src/SchemaTransformation.ts`** (`e90c1a653ca5362871e612e6e4569e6470be8218`).
   Needed to state, at pin quality, that `Transformation` and `Middleware` carry no
   `annotations`, `id`, `representation`, or `name` field. That is the sole basis for
   "transformations have no serializable identity", which is the premise of the ratified
   encoding-rejection. Within the pinned five I can only show that `Link` has no identity field
   (`AST:402-405`) and that the Representation has no `encoding` field (`SR:406-428`) — strong
   circumstantial support, not the direct claim.
2. **`packages/effect/src/internal/schema/toRepresentation.ts`**
   (`89474d36bfa246798809484a8d6a0a54082663b5`). Needed for every "what lowering actually reads"
   claim: the per-variant `on` cases, `fromChecks`/`fromCheck`, the `visit` cycle pre-pass, the
   default reference policy literal, and the synthetic-name minting. The pinned
   `SchemaRepresentation.ts` gives the *types* and the *docstrings*; this file gives the
   *behaviour*.
3. **`packages/effect/src/internal/schema/annotations.ts`**
   (`d5fb684f76955445fa5a6912fa7d7edf1ae7adcd`). Needed for `resolve`'s read-from-the-last-check
   rule, the `~identifier` and `~constructor` internal keys, the 10-key `jsonSchemaAnnotationKeys`
   set, and the 14-key `annotationExcludedKeys` set. The ratified annotation-allowlist change
   (KICKOFF §11 change 3) names this file twice; it should be pinned before that ruling is
   promoted past G0. *(Pinned corroboration for the write side exists at `AST:3462-3466`; the
   read side does not.)*
4. **`packages/effect/src/internal/schema/fromRepresentation.ts`**
   (`30b647beb06c2807cd2999d7c41f0f7aa4505bfe`). Needed for the seven thrown revival limits
   (duplicate reviver ids, dangling `$ref`, premature forcing, missing `representation` on
   Declaration and on Filter, missing reviver, invalid payload) and for the three silent
   revival asymmetries. These are the fail-closed precedents the admission function is modelled
   on.
5. **`packages/effect/src/internal/effect.ts`** (`bb6e4bcafb3d9c76f93fb3af54f99d5b4afcbeb3`).
   Needed for `iterateEager`/`runSequential`/`runStep` — the proof that union iteration is
   ascending-index and that `orderedStep: true` preserves order under concurrency. R-5 is
   ratified on this evidence.
6. **`packages/effect/src/internal/schema/toJsonSchemaDocument.ts`**
   (`1720e9104710c3d71a084d623175da81ae286856`) and **`toCodeDocument.ts`**
   (`0e6f1804f10b3ada982eb8edb5b3cbae436e291e`). Lower priority — needed only if per-variant
   JSON-Schema emission fidelity or the code-generation annotation-stripping set enters a
   ruling.

**Two files I would request that are not in the cache at all**, both because a mapping ruling
would otherwise rest on an inference:

7. **`packages/effect/src/SchemaGetter.ts`**. The census's own gap 2. `Transformation.decode`
   and `.encode` are `Getter`s, and the claim that they carry no identity is inferred from call
   sites. If `Getter` carries an id, the "no named transformations upstream" premise weakens and
   the dissolved R-6 could return.
8. **`packages/effect/src/internal/schema/schema.ts`**. `makeFilterReviver`,
   `makeDeclarationReviver`, and `makeFilterGroupReviver` are all re-exports from it
   (`SR:574-602`). The reviver registry is the structure R-4's allowlist would mirror, and I
   have only its interface, not its construction.

---

## 6. The five hardest calls

Each is stated as a question, with the evidence for both answers and the case-study lesson that
bears on it. I have no authority over any of them.

### Hard Call 1 — Does `Arrays.isMutable` enter the pre-image, or must the model prove the equivalence ignores it?

**For "it enters the pre-image."** It is a real field on the carrier (`AST:1685`), it is set by
a public API (`Schema.mutable`, `S:4829-4831`), and it changes the decoded TypeScript type. L3
is unambiguous: *"if a field is semantic, it is in the pre-image; if it is not in the pre-image,
the model must prove the declared equivalence ignores it."* Dropping it silently is #3509's
mechanism at `hash-db-anatomy.md:387-406` — many carriers, one byte string, collision guaranteed
by arithmetic rather than luck.

**For "it is outside identity."** It has no runtime effect: no parser reads it, and the closest
prior art drops it deliberately and stably (`SR:338-341`, `SR:1033-1038`; revival rebuilds
readonly constructors only, per the census). Mutability is a TypeScript-type-level distinction,
and the lab's `Value` universe has no mutability at all (KICKOFF §4.5). Arguably it belongs with
annotations — excluded by not existing in Schema Core, which is the L3-compliant exclusion route
already used for annotations (KICKOFF §4.3, second honest note).

**The lesson that bears.** L3 permits either answer but forbids the third: **routing the bit
around the encoder**. If the ruling is "outside identity", the carrier type must simply not have
the field, and the admission function must reject or normalize `isMutable = true` explicitly —
not accept the node and quietly forget. Note also the asymmetry the pinned bytes force: Effect
keeps `PropertySignature.isMutable` (`SR:363`) and drops `Element` mutability (`SR:326-330`), so
"follow Effect" is not a single coherent option.

### Hard Call 2 — Which AST is the subject of the address: `ast`, `toEncoded(ast)`, or `toCodecJsonAST(ast)`?

**For `ast` (the type side).** It is what the user wrote. R-6 was dissolved for v1 on the
ground that with no encodings admitted, the Type and Encoded views coincide — and that reasoning
holds: `toType` differs from the identity only when `ast.encoding` or `ast.encodingChecks` is
present (census §3, from `AST:3779-3798`), and admission rejects both.

**For `toCodecJsonAST(ast)`.** This is the new evidence, and it complicates the dissolution.
`toCodecJsonAST` is not the same as `toEncoded`: it **reorders union members** (`S:15417-15426`,
applied at `S:15456-15470`), rewrites `Unknown` and `ObjectKeyword` into JSON projections
(`S:15439-15442`), rewrites `Number` conditionally on a check id (`AST:1448-1456`), and strips
`constructorDefault` (`S:15373-15382`). If the lab ever compares its canonical bytes against
Effect's JSON Schema output (the G4 differential lane, KICKOFF §5), the two sides are looking at
**different union orders for the same source schema**, and the difference is invisible unless
someone writes it down first.

**The question for the operator.** Is the dissolution of R-6 scoped to "type view = encoded
view", which the evidence supports, or does it extend to "the address subject is the AST as
written", which now needs the additional statement that **no codec-derivation reordering is in
scope for v1**? The pinned bytes support drawing the line at `toEncoded`, but the reorderings
are a real, total, tie-free normalization that Effect performs and the lab does not — and a
G4 fixture that goes through `toJsonSchemaDocument` will hit it.

**The lesson that bears.** L4: canonical orders must come from mandatory-distinct semantic keys.
Effect's reorderings actually *satisfy* L4 — the sort key is the `_tag`, the tie-break is the
original index (`S:15406`), so there are no ties and no hash-sort. This is a case where the
prior art is better than Unison's, not worse, and the question is whether the lab wants to
inherit it or explicitly decline it.

### Hard Call 3 — Is the check-id allowlist an allowlist over ids, or over `(id, payload-schema)` pairs verified against a lab-owned table?

**For "over ids."** It is the ratified shape (KICKOFF §11 change 1) and it mirrors Effect's own
`fromRepresentation`, which resolves revivers by `id` and fails with `Missing reviver for {id}`
when absent. It is simple, decidable, and finite: 46 ids exist in the pinned bytes (§4.1).

**Against, and this is the finding I would most want ruled on.** Three facts from the pinned
bytes together mean an id does not name a behaviour:

- `...annotations` is spread **last** in every built-in check constructor (`AST:3335`,
  `AST:3407`, `S:6780`, `S:7318`, `S:7911-7912`, `S:9515`), so a caller can override
  `representation` at construction.
- `Filter.annotate` (`AST:3229-3231`) preserves `run` and overrides `annotations`, so any check
  — built-in or user — can be relabelled after the fact through public API.
- Effect **dispatches on the id**: `hasCheck` (`AST:1470-1475`) and `Number.toCodecJson`
  (`AST:1448-1456`). So a relabelled check changes the derived codec, not just the persisted
  bytes.

A concrete adversarial case, entirely within public API and the pinned bytes:
`Schema.Number.check(Schema.isFinite().annotate({ representation: { id:
"effect/schema/isInt", payload: null } }))` yields a node that persists as `isInt`, revives as
`isInt` (a *different* predicate), and derives a JSON codec as if it were finite-constrained.
The persisted bytes and the live behaviour disagree, and nothing in the library notices.

**The question.** Does admission accept an id on the producer's word (in which case the lab's
identity is "what the schema claims to be", and a relabelled check is simply a different
schema — internally consistent, and arguably correct for a content address), or does the
allowlist additionally pin a payload schema per id and reject payloads that do not validate (in
which case the `isFinite`/`isInt` swap still passes, since both payloads are `null`)? Neither
option closes the relabelling hole; the second narrows it. A third option — reject any check
whose `representation` was not produced by the built-in constructor — is **not implementable
from the carrier**, because provenance is not a field.

**The lesson that bears.** This is #2787's shape rather than #3509's: the encoder *admits
information the intended carrier does not contain* (`hash-db-anatomy.md:441-452`). Unison's
version leaked names; this one leaks a producer's choice of label. The honest framing for the
ruling is that the lab's address identifies the **declared** schema, and the gap between
declared and enacted behaviour is a stated non-claim — the same posture the census recommends
for `Declaration`.

### Hard Call 4 — Does `Enum` carry its member names into the address, and does member order survive?

**For carrying names and order.** They are in the carrier (`AST:1076`), they survive Effect's
own persistence including the name (`SR:306-308`, `SR:1015-1022`), and they are what the user
wrote. Excluding them is a normalization the lab would have to defend.

**For excluding them.** `Enum.getParser` (`AST:1089-1095`) builds `new Set(this.enums.map(([,
v]) => v))` — the name is never read, and the order is destroyed by the `Set`.
`getExpected` (`AST:1113-1115`) also reads values only. So two enums differing only in names, or
only in order, or by a duplicate value, are **behaviourally identical**. Under a
schema-indexed equivalence that is compositional over the constructor menu (KICKOFF §4.3), the
`Enum` clause arguably ought to be "the set of values", making name and order metadata.

**The tension.** KICKOFF §4.3's first honest note says the equivalence must not be *coarser*
than the subject's semantics — that is #3509's shape. But here the reverse risk applies: an
order- and name-sensitive `Enum` clause is *finer* than the semantics, which is #2787's shape —
one carrier, many possible byte strings, distinguished by information the semantic class does
not contain. Both defects are available depending on which way this is ruled, and the pinned
bytes do not choose.

**Related sub-question the same evidence raises.** `Schema.Enum` (`S:3032-3041`) filters
TypeScript's reverse-mapping keys with `typeof enums[enums[key]] !== "number"`. Two source
enums that TypeScript compiles to different objects can therefore produce the same `enums`
array — the filter is already a normalization the library performs and does not document as
identity-relevant.

### Hard Call 5 — Is a `FilterGroup` a tree or a list?

**For "a tree" (preserve nesting).** It is what the carrier holds (`AST:3257`) and what Effect
persists (`SR:461`, `SR:966` — `Schema.NonEmptyArray(CheckSchema)`, recursive). It is
strictly more faithful.

**For "a list" (flatten conjunctions).** `.and()` always nests left (`AST:3235-3238`,
`AST:3271-3274`), so `a.and(b).and(c)` is `FilterGroup([FilterGroup([a, b]), c])` while
`a.and(b.and(c))` is `FilterGroup([a, FilterGroup([b, c])])`. Both are the same conjunction; both
are the same set of failures with `errors: "all"`; and Effect's own `extractStructuralChecks`
(`AST:3745-3752`) already **flattens groups to their structural leaves** when lifting across
`toType`, discarding the nesting entirely. So the library itself treats the tree shape as
disposable in at least one place.

Additionally, `isStructuralCheck` (`AST:3740-3743`) makes a group structural iff *every* child
is — so `~structural` is not a per-node fact but a derived property of the subtree, and
flattening changes which lift applies.

**The question.** Does the `Check` inductive carry `filterGroup (checks : List Check)` faithfully
(the ratified §11 shape), and if so, is the address sensitive to association? Two schemas a user
would call identical get different addresses under the faithful reading.

**The lesson that bears.** This is the same axis as Hard Call 4 and the same pair of failure
modes: faithful-and-finer risks #2787 (one intended carrier, several byte strings, chosen by
a construction detail), flattened-and-coarser risks #3509 (two carriers, one byte string — though
here the two carriers really are semantically equal, which is the defensible case for
coarsening). The distinguishing fact is that here the lab **can** prove the equivalence ignores
the association, because conjunction is associative and `aborted` is per-leaf — whereas for
`isMutable` (Hard Call 1) no such proof is available. If the flattening is chosen, L3 requires
the flattening to be a canonicalization pass with a proved idempotence and an S2-shape
soundness statement, not an omission at encode time.

---

## 7. What this dossier does not establish

- **Nothing was executed.** Every claim is a reading of pinned source. In particular the
  adversarial case in Hard Call 3 is a reading of three code paths, not an observed result.
- **The `internal/` behaviour is second-hand.** Everything about what `toRepresentation`
  actually reads per variant is the census's reading of an unpinned file. This dossier's
  per-variant "what the Representation holds" claims are from the **types and codec** in the
  lock-verified `SchemaRepresentation.ts`, which is a weaker but independent basis: a field that
  does not exist in the type cannot be emitted, whatever the implementation does.
- **No claim about `Schema.ts` exhaustiveness.** I searched `Schema.ts` for `.sort(`,
  `new SchemaAST.<Variant>(`, `representation: {`, `FilterReviver<`, `DeclarationReviver`, and
  `STRUCTURAL_ANNOTATION_KEY`, and those searches are exhaustive for their patterns. I did not
  read all 17104 lines, so a construction path that does not match those patterns could exist.
  In particular: **UNVERIFIED: that no `Schema.*` combinator dedupes union members; checked:
  `.sort(` across `Schema.ts` and `SchemaAST.ts` (7 + 1 sites, all accounted for above), and
  `dedupe`/`uniq`/`new Set(members` across `Schema.ts` (only `Arr.dedupe` inside the `isUnique`
  predicate at `S:9556`).**
- **`Schema.Object` / the object-keyword public name was not located.** UNVERIFIED: the public
  export name for `ObjectKeyword`; checked: `export const ObjectKeyword: ObjectKeyword =
  make(SchemaAST.objectKeyword)` at `S:3278`, which is the AST-level name — whether a
  differently-named alias exists was not searched exhaustively.
- **`inventory.json` was consumed, not re-derived.** The 21 variants, their field lists, their
  `declLine`s, and their `ctorParams` are the extractor's; I confirmed the tag count (23) and
  the union alias order (`AST:53-74`) independently and they agree.
