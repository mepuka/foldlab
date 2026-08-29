# The foldlab Verbal Register

**Status: pre-grade draft.** Produced by an agent swarm on 2026-08-28, synthesised from seven independent drafter groups. **Not ratified. Written for operator grilling.** Nothing here is a ruling until the operator pins it.

**What it serves.** The register is the surface half of EFFECTS-BACKEND **R13 (the printer model)**: a printer is a total function from a construct to exactly one string, and a reader is its inverse. This document fixes that string for the Effect/Schema/CAS surface. It is simultaneously the **prose projection of AE-8** — if every public API is a term of the meta-language, then every public API has a spoken form, and this is it.

**What it is not.** It is not a shorthand, not a mnemonic aid, and not a style guide. A verbal form that cannot be mechanically turned back into code is not in the register.

---

## 1. Principles

### 1.0 The determinism law

Four clauses, in force everywhere below. Every rule in section 3 is subordinate to them.

**D1 — One spelling per construct.** A construct has exactly one canonical verbal form. The printer never chooses between two legal spellings, and the register never offers "or you can say".

**D2 — One construct per spelling.** No verbal string is reachable from two different source shapes. Where two constructs looked alike in draft, one was renamed (section 4) — never annotated, never disambiguated by context.

**D3 — Compositional templates.** A compound verbal form is a fixed template with its parts already verbalised by their own rules and substituted in. Verbalising is structural recursion, never per-call-site invention. There is no rule for "map inside a flatMap inside a catchTag"; there are three rules that compose.

**D4 — Deterministic elisions only.** A thing may be left unspoken only if exactly one value can be restored, and that value is fixed by this document (or by an invariant this document cites, such as a `satisfies` clause or Effect's own defaulting). Elision by likelihood is forbidden. Where the register's default and observed house practice diverge, the rule says so out loud rather than papering over it.

### 1.1 The case law

**Lowercase head word = declaration or type position. `Capitalised dot member` = runtime call.**

`effect(aer)`, `layer(oei)`, `codec(terw)`, `option(a)`, `schema string`, `service CasStore`, `brand ContentId of`, `tagged error`, `error union`, `tag table`, `program` — all lowercase, all naming a *type or a declaration*.

`Effect dot gen`, `Effect dot fn`, `Layer dot succeed`, `Context dot make`, `CasStore dot of` — all capitalised, all naming an *actual call that runs*.

Casing alone tells a listener which plane they are on. The two vocabularies never overlap.

### 1.2 The `dot` law

The word **dot** is spoken **only at the head of a matched rule template.** Everywhere else a dot is a literal dot.

- `Effect.gen(...)` matches R25 → "Effect **dot** gen".
- `Effect.map` appearing as a `|>` stage matches no head template (it is a *slot* in R40) → spoken "Effect map", written `Effect.map`, literal dot.
- `FetchHttpClient.layer`, `node.refs.map`, `Crypto.Crypto`, `store.load` — ordinary member paths → literal dots, always.

Without this law ordinary code drowns in "dot" noise. With it, hearing "dot" means "a register construct starts here."

### 1.3 Names are data; the register is scaffolding

Identifiers, tags, field names, parameter names, brand strings, regex literals and payload hex are carried **verbatim, casing untouched** — `ContentId`, `CasError`, `Schema.Json`, `"CasStore.put"`. Only the connective tissue (`dot`, `|>`, `->`, `gets`, `is`, `refuse`, `:`, `@`, `,`, `{}`, `()`) is register vocabulary, and each mark has exactly one meaning in both directions.

Quoted string literals are exempt from every spelling transform, including the `dot` law: `"CasStore.put"` stays `"CasStore.put"`, never "CasStore dot put". A listener can always tell code punctuation from string data on sight.

### 1.4 Values are spoken, not summarised

Runtime value expressions are carried through **verbatim as source text**. `new StoreFailure({ reason: \`SHA-256 failed: ${String(cause)}\` })` keeps its template string. Payload bytes are never truncated; a shortened digest is not an address.

*(One drafter proposed eliding values to `new StoreFailure { reason }`, keeping only field names. Rejected — see §4.12. A `…` ellipsis is permitted only in explicitly-marked **sketch mode**, which is prose about the register, not the register, and never round-trips.)*

### 1.5 Slots are positional; only trailing slots elide

Every parenthesised slot run is strictly positional, left-to-right. Only a **trailing** run may be omitted, always defaulting to `never` (the default Effect, Layer and Schema apply themselves). A middle `never` is always spoken as the literal word `never` — dropping E while keeping R would make a two-slot form ambiguous between `(A,E)` and `(A,R)`.

### 1.6 Fused letters mean abstract; commas mean concrete

A comma-less all-lowercase letter run inside parens — `(aer)`, `(oei)`, `(terw)` — is the construct's **own declared type-parameter letters**: the shape of a signature, not a usage. A comma-separated list of real names in the same parens is **one concrete instantiation**. The two notations never mix inside one paren group, so `(ae)` can never be mistaken for two classes literally named `A` and `E`.

### 1.7 Order is load-bearing

Statement order equals source order, joined by `;`. Union member order, struct field order, `Literals` member order, `refs` order, `mergeAll` order and the returned address word are all preserved exactly. Effect's canonical encoding, its decode error messages, TypeScript's inferred member order and the store's admission law each observe one of these; the register never discards ordering the type system or the byte gate can see.

### 1.8 Two planes

**Plane C — the code register** (sections 3.1–3.6): round-trips to canonical TypeScript. Faithful to syntax.

**Plane P — the program register** (section 3.7): round-trips to a canonical *store-program document*. Faithful to **content**, not syntax — a plain object literal, `CasNodeInput.make(...)` and `CasStore.use(store => store.put(...))` all collapse to the same plane-P string, and speaking it back regenerates one canonical shape. This is a deliberate many-to-one on encode with a single fixed target on decode, and it is legal **only inside a `program <name> { … }` wrapper.** The wrapper is the plane boundary. Outside it, plane C's syntactic fidelity is in force.

---

## 2. The grammar

Composite forms nest by structural recursion. Whole grammar, in thirteen lines:

```
document   := decl* | program                          -- plane C | plane P
decl       := type-decl | value-decl | service | 'program' name block-P
expr       := head-call | pipe | lambda | verbatim      -- verbatim = literal source text
head-call  := Head 'dot' member '(' arg,* ')'           -- Head capitalised; or a bespoke template
pipe       := expr ('|>' stage)+                        -- <=> expr.pipe(stage, ...)
stage      := Module '.' member '(' arg,* ')' | Module '.' member
lambda     := 'fun' params '->' (expr | block)          -- 1 param bare, else parenthesised
block      := '{' stmt (';' stmt)* '}'
stmt       := name 'gets yield' expr | name 'is' expr | 'yield' expr
            | 'refuse' Ctor '(' arg,* ')' | 'return' ['yield'] expr | 'if' cond block
type       := head '(' slot,* ')' | '(' param,* ')' '->' type | Name | type '|' type
slot       := letter-run | type | 'never'               -- fused letters = abstract, commas = concrete
arg        := expr | type | verbatim
```

Three reserved connectives, one meaning each: **`|>`** = "then pipe into" (always `.pipe`), **`->`** = "maps to" (function-type return, lambda body, `catchTags` case — same meaning, three positions), **`|`** = type union. Nesting needs no delimiter beyond parens and braces; a drafter's angle-bracket `< >` nesting marker was retired as redundant (§4.7).

---

## 3. The rules

### 3.1 Type expressions — the lowercase plane

| # | Construct | Code | Verbal | Round-trip notes |
|---|---|---|---|---|
| R1 | `Effect<A,E,R>` abstract | `Effect.Effect<A, E, R>` | `effect(aer)` | Fused run = declared letters in order. `effect(ae)` → `Effect<A,E,never>`; `effect(a)` → `Effect<A>`. Effect's own defaulting makes `Effect<A>` and `Effect<A,never,never>` the same type; the register does not distinguish which the human wrote. |
| R2 | `Effect<A,E>` concrete | `Effect.Effect<CasNodeInput, CasError>` | `effect(CasNodeInput, CasError)` | Commas ⇒ concrete (§1.6). Two names ⇒ R trail-elides to `never`. |
| R3 | `Effect<A,E,R>`, union R, written middle `never` | `Effect.Effect<CasStoreShape, never, ByteReader \| ByteWriter \| AddressScheme>` | `effect(CasStoreShape, never, ByteReader\|ByteWriter\|AddressScheme)` | Middle `never` written, never dropped (§1.5). Union members `\|`-joined in source order, no spaces — TypeScript's own spacing carries no information. |
| R4 | `Layer<ROut,E,RIn>` | `Layer.Layer<CasStore \| CasLoader, never, ByteReader \| ByteWriter \| AddressScheme>` | `layer(CasStore\|CasLoader, never, ByteReader\|ByteWriter\|AddressScheme)` | Abstract form `layer(oei)`: o=ROut (provides), e=E (fails), i=RIn (still needs). `layer(AddressScheme)` → `Layer<AddressScheme>` — self-contained. |
| R5 | `Schema.Codec<T,E,RD,RE>` | `Schema.Codec<TypeOf<A>, Schema.Json>` | `codec(TypeOf<A>, Schema.Json)` | Abstract `codec(terw)`: t=decoded, e=encoded, r=decode context, w=encode context. This mapping is the register's own, fixed here once. A parameterised name (`TypeOf<A>`) is one opaque token — its `<A>` is not re-expanded. |
| R6 | `Option.Option<A>` | `Option.Option<Ast>` | `option(Ast)` | Exactly one slot always; never a trailing elision, never an abstract/concrete ambiguity. Abstract form `option(a)`. |
| R7 | Function type | `(id: ContentId) => Effect.Effect<CasNodeInput, CasError>` | `(id: ContentId) -> effect(CasNodeInput, CasError)` | Parameter **names are kept** (they are declarations, not values — §1.3). `->` = "maps to". |
| R8 | Interface member | `readonly load: (id: ContentId) => Effect.Effect<CasNodeInput, CasError>` | `load: (id: ContentId) -> effect(CasNodeInput, CasError)` | `readonly` is the fixed house default and is regenerated, never spoken. Composes R7. |
| R9 | Typed const annotation | `export const makeSha256Address: Effect.Effect<CasAddress, never, Crypto.Crypto>` | `makeSha256Address : effect(CasAddress, never, Crypto.Crypto)` | `export const` is fixed boilerplate. `Crypto.Crypto` keeps its literal dot (§1.2). |

### 3.2 Schema declarations

| # | Construct | Code | Verbal | Round-trip notes |
|---|---|---|---|---|
| R10 | Leaf primitive | `Schema.String` | `schema string` | Zero-arg leaves take no parens. Lowercase head per §1.1; no `dot` (Schema is a declaration plane). `Schema.Int` → `schema int`. |
| R11 | Refinement | `Schema.String.check(Schema.isPattern(/^[0-9a-f]{64}$/u))` | `schema string checked pattern /^[0-9a-f]{64}$/u` | `checked <pred-words> <args>`: predicate name with `is` dropped, PascalCase split to spaced lowercase (`isMaxLength` → `checked max length 4294967295`). Regex carried verbatim with delimiters and flags. Chained checks stack as repeated particles in source order. Named-constant abbreviations are a closed table — today only `min`/`max` for `Number.MIN_SAFE_INTEGER`/`MAX_SAFE_INTEGER`: `schema int checked between(min, max)`. |
| R12 | Brand minting | `Schema.String.check(Schema.isPattern(/…/u)).pipe(Schema.brand("ContentId"))` | `brand ContentId of schema string checked pattern /^[0-9a-f]{64}$/u` | The **only** brand form. The base's own verbal (R10+R11) substitutes after `of`. Every later *occurrence* of `ContentId` is the bare name — `brand` appears at the minting site and nowhere else, so definition and use are never confusable. |
| R13 | Pinned scalar | `Schema.Literal(DigestScheme)` / `Schema.Null` | `schema literal DigestScheme` / `schema null` | Identifiers keep code casing, strings stay quoted, numbers/booleans bare. `null` gets its own leaf, **never** `schema literal null` — the house's `compile` branches null out of `Literal`, and the register preserves that branch. |
| R14 | Closed enumeration | `Schema.Literals(["read", "roots", "write"])` | `schema literals ["read", "roots", "write"]` | Singular `literal` (R13) vs plural `literals` (bracketed list) never collide. Order preserved — it is the union's declared member order. |
| R15 | Record | `Schema.Struct({ version: Byte, tag: Byte })` | `schema struct {version: Byte, tag: Byte}` | Field order is source order and is load-bearing (canonical JSON key order is declaration order). A bound identifier as a field value stays a bare name, never re-expanded. Inside `schema …` braces, values are *schema-verbals*; inside a runtime call's braces they are verbatim expressions (§1.4). |
| R16 | Tagged record | `Schema.TaggedStruct("Literal", { value: LiteralValueSchema })` | `schema tagged struct "Literal" {value: LiteralValueSchema}` | Tag always quoted (runtime discriminant data). Empty payload keeps explicit braces: `schema tagged struct "Null" {}` — absence of fields is never confusable with elision. |
| R17 | Untagged sum | `Schema.Union([RemoteProtocolError, RemoteUnavailableError, RemotePolicyError])` | `schema union [RemoteProtocolError, RemoteUnavailableError, RemotePolicyError]` | Bracketed list, source order kept (decode error messages and inferred member order both observe it). Distinct from R23 `error union`, which is a TS type alias and spells `\|`. |
| R18 | List | `Schema.Array(CasReference)` | `schema array of CasReference` | `of` marks the single wrapped argument. Trailing checks append: `schema array of CasReference checked max length 4294967295`. |
| R19 | Optional struct key | `Schema.optionalKey(compile(f.schema))` | `optional key of <schema-verbal>` | Only ever a struct-field value. Required fields carry **no** particle (the elided default is "required"), so `id: ContentId` and `id: optional key of ContentId` differ by one always-spoken particle. |
| R20 | House AST field | `field(S)` / `optionalField(S)` | `ast field(<ast-verbal>)` / `ast optional field(<ast-verbal>)` | Two distinct house functions, not a modifier. The `ast` prefix (added here, §4.9) keeps them audibly apart from R19 at word one — they live on different planes and a translator must never swap them. |
| R21 | Recursive reference | `Schema.suspend((): Schema.Codec<Ast, Ast> => AstSchema)` | `schema suspend AstSchema` | Thunk parameter list, return annotation and arrow wrapper are all fixed defaults — every suspend thunk in this codebase is zero-arg returning one named schema by reference. Decode fills the codec's type args from the named schema's own declaration. |
| R22 | Typed tagged error | `export class AddressMismatch extends Schema.TaggedError<AddressMismatch>()("CasError/AddressMismatch", { expected: ContentId, actual: ContentId }) {}` | `tagged error AddressMismatch : CasError {expected: ContentId, actual: ContentId}` | **Conforming-tag form**, legal iff the tag is exactly `"<Namespace>/<ClassName>"` (verified across all 8 `CasError` members). Then `extends`, `()()`, the self-referential `<Self>` type argument, the empty class body and the tag string all regenerate. Non-conforming tags **must** use the free form `tagged error <Name> "<tag>" {fields}` — and a conforming tag may **not** use it, so exactly one spelling exists per class. No payload → explicit `{}`. A `declare readonly` narrowing override appends `as <Type>` verbatim; absent by default. |
| R23 | Error family alias | `export type CasError = \| AddressMismatch \| NonCanonicalBytes \| …` | `error union CasError = AddressMismatch \| NonCanonicalBytes \| UnknownKind \| DanglingReference \| WrongKindReference \| ContentNotFound \| StoreFailure \| RemoteFailure` | Declaration order is canonical and must be exact — R24 and R58 both take it as their elision default. |
| R24 | Namespaced tag table | `export const CasErrorTag = { AddressMismatch: "CasError/AddressMismatch", … } satisfies { readonly [K in keyof CasErrorMembers]: \`CasError/${K}\` }` | `tag table CasErrorTag of CasError` | Whole body elided: the `satisfies` clause forces exactly the union's members, in its order, each value `"<Union>/<Member>"`. Nothing can vary independently of R23. A table covering a strict *subset* of its union is out of this rule's scope and would need its own construct. |

### 3.3 Effect construction and generator bodies

| # | Construct | Code | Verbal | Round-trip notes |
|---|---|---|---|---|
| R25 | Bare generator effect | `Effect.gen(function* () { yield* Console.log("wow") })` | `Effect dot gen { yield Console.log("wow") }` | The `function* ()` wrapper is the fixed template implied by hearing "Effect dot gen"; nothing is lost. **House caveat:** `library/effects/src` has *zero* bare `Effect.gen` calls — every generator effect is named via R26. A bare "Effect dot gen" in a transcript flags non-house code. |
| R26 | Named generator effect (the house default) | `export const put = Effect.fn("CasStore.put")(function* (input: CasNodeInput) { … })` | `Effect dot fn "CasStore.put" (input: CasNodeInput) { … }` | The doubled-call currying and `function*` are template, never spoken. Trace name carried verbatim in quotes. An explicit return annotation appends before the block: `Effect dot fn "x" (a: A, b: B) -> fn.Return(CasNodeInput, CasError) { … }`; abstract slots compress (`fn.Return(ae)`), concrete names never do. This is the house constructor for every effectful function — dozens of hits against R25's zero. |
| R27 | Effectful bind | `const node = yield* validateNode(input)` | `node gets yield validateNode(input)` | `gets yield` ⇒ `const <n> = yield* <expr>`. Always `const` — grep shows zero `let` in any gen body. Arguments verbatim. |
| R28 | Pure bind | `const canonicalBytes = encodeCasNode(node)` | `canonicalBytes is encodeCasNode(node)` | `is` (never `gets`) marks a binding with no `yield*`. `is` vs `gets yield` is the sole signal a decoder needs. |
| R29 | Effectful statement, result discarded | `yield* ensureKnownKind(node)` | `yield ensureKnownKind(node)` | Absence of a `<name> gets` prefix is the deterministic signal that nothing captures the result. Recovers to a bare statement, never `const _ = …`. |
| R30 | Service access | `const store = yield* CasStore` | `store gets yield CasStore` | Same template as R27; the yielded operand is a bare capitalised tag with **no parens**, which is what recovers `yield* CasStore` rather than a call. |
| R31 | Tail effect return | `return yield* verifyNodeBytes(address, id, resident.value)` | `return yield verifyNodeBytes(address, id, resident.value)` | Callee is a lowercase-initial call, so the marker stays `yield`. R31 and R32 partition every `return yield* …` by the purely syntactic test "is the operand `new Capitalised(...)`?" |
| R32 | Fail-closed refusal | `return yield* new NonCanonicalBytes({ id })` | `refuse NonCanonicalBytes({id})` | `refuse` is reserved for exactly this idiom and always expands to the full `return yield* new X(…)`. Object-literal shorthand `{id}` verbatim. Never confusable with R37's `Effect dot fail(new X({…}))` (a plain-function return) or with a bare value construction (R56). |
| R33 | Terminal pure return | `return cloneNode(decoded)` | `return cloneNode(decoded)` | Already minimal. A bare `return` with no following `yield`/`refuse` is the signal that no `yield*` is inserted. |
| R34 | Guard | `if (actual !== id) { return yield* new AddressMismatch({ expected: id, actual }) }` | `if (actual !== id) { refuse AddressMismatch({expected: id, actual}) }` | Condition carried verbatim, parens included. Braces mirror source. |
| R35 | Sequencing | four statements in a gen body | `node gets yield validateNode(input); yield ensureKnownKind(node); canonicalBytes is encodeCasNode(node); id gets yield address.digest(canonicalBytes.slice())` | `;` is the fixed separator; clause order equals statement order, never permuted. Threading needs no marker — a name is carried verbatim (§1.3), so any name reappearing in a later argument list is provably the same binding. |
| R36 | Array return | `return [lhs, rhs]` | `return [lhs, rhs]` | Verbatim. Every element must be a name introduced by an earlier `gets`/`is` clause in the same block; an unbound inline expression there is not register-legal. |
| R37 | Succeed / fail | `Effect.succeed(bytes)` / `return Effect.fail(new UnsupportedRecipe({ reason }))` | `Effect dot succeed(bytes)` / `return Effect dot fail(new UnsupportedRecipe({reason}))` | Head call ⇒ `dot` ⇒ arguments **always** parenthesised. (A drafter's "bare trailing identifier drops its parens" rule was cut — two spellings for one construct violates D1. §4.5.) |
| R38 | Synchronous thunk | `Effect.sync(() => { if (!nodes.has(id)) nodes.set(id, bytes.slice()) })` | `Effect dot sync(fun () -> { if (!nodes.has(id)) nodes.set(id, bytes.slice()) })` | Thunk arity is fixed at zero by the API, not by elision. Block vs single expression is spelled exactly as source spells it: `fun () -> expr` vs `fun () -> { … }`. |
| R39 | Unchecked promise lift | `Effect.promise(() => crypto.subtle.digest(algorithm, data))` | `Effect dot promise(fun () -> crypto.subtle.digest(algorithm, data))` | **House caveat:** zero bare `Effect.promise` in `library/effects/src` — the house wraps fallible promises in `Effect.tryPromise({try, catch})` to keep a typed failure channel. A bare "Effect dot promise" names the never-rejects variant and flags non-house code. |
| R40 | Lambda | `(crypto) => ({ digest: makeDigest(crypto) })` | `fun crypto -> ({digest: makeDigest(crypto)})` | **The single lambda spelling.** One parameter bare, zero or many parenthesised (`fun () -> …`, `fun (id, bytes) -> …`); a destructuring pattern is one parameter and stays bare (`fun [address, reader, writer] -> …`). A bare identifier can never begin with the word `fun`, so a named handler and an inline lambda never collide in either direction. |
| R41 | Collect services | `Effect.all([AddressScheme, ByteReader, ByteWriter])` | `Effect dot all([AddressScheme, ByteReader, ByteWriter])` | Array kept verbatim — order fixes the destructured tuple positions at the call site and is never resorted. (A drafter's flattening to `Effect dot all(A, B, C)` was cut: it collided with the record form. §4.10.) |

### 3.4 Composition

| # | Construct | Code | Verbal | Round-trip notes |
|---|---|---|---|---|
| R42 | Pipe, one stage | `CasNodeInput.makeEffect(input).pipe(Effect.mapError(fn))` | `CasNodeInput.makeEffect(input) \|> Effect.mapError(fn)` | `\|>` means `.pipe(` and nothing else. The receiver is a literal expression (its dots stay literal, §1.2). |
| R43 | Pipe, n stages | `writer.putBytes(id, canonicalBytes).pipe(Effect.mapError(backendFailure), Effect.orDie)` | `writer.putBytes(id, canonicalBytes) \|> Effect.mapError(backendFailure) \|> Effect.orDie` | One repeatable connector handles an arbitrary chain — map/flatMap/mapError/catchTag/provide/orDie in any combination — with no bespoke rule per chain shape. Stage order is argument order. |
| R44 | Argument-less stage | `Effect.orDie` in a pipe list | `\|> Effect.orDie` | The one stage with no trailing argument; its bare presence is the complete round trip (source has no parens either). **House caveat:** zero verbatim hits in `library/effects/src` — `Store.ts` keeps every branch as a typed `StoreFailure` rather than converting to a defect. Included because the brief names it. |
| R45 | Stage qualifier | `Effect.map` / `Layer.provide` as a stage | `Effect.map` / `Layer.provide` — **fully qualified, always** | A drafter proposed dropping the module prefix inside a pipe (`\|> map f`). Cut: `provide` exists on both `Effect` and `Layer` and the piped value's module is not decidable from the stage word. §4.2. |
| R46 | Standalone `pipe` | `pipe(Match.type<Ast>(), Match.withReturnType<Schema.Top>(), Match.tagsExhaustive({…}))` | `pipe(Match.type<Ast>(), Match.withReturnType<Schema.Top>(), Match.tagsExhaustive({…}))` | Literal. `pipe` the imported function is a different construct from `\|>` the method, and the register keeps them apart rather than normalising — normalising loses which one the source used. |
| R47 | Ordinary nested application | `cast(compile(ast).annotate({ [AnnotationKey]: ast }))` | `cast(compile(ast).annotate({[AnnotationKey]: ast}))` | Verbatim. Matches no head template, so no `dot`, no `\|>`, no rewriting. (A drafter canonicalised `f(g(x))` into a pipe chain; cut as lossy. §4.7.) |
| R48 | Callback on a tag | `CasStore.use((store) => store.put(nodeOf(ast)))` | `CasStore dot use(fun store -> store.put(nodeOf(ast)))` | `.use` on a `Context.Service` tag is a head template, so it takes `dot`; the callback is R40. No dedicated connector word needed. |

### 3.5 Services and layers

| # | Construct | Code | Verbal | Round-trip notes |
|---|---|---|---|---|
| R49 | Service class | `export class CasStore extends Context.Service<CasStore, CasStoreShape>()("foldlab/cas/CasStore") {}` | `service CasStore : CasStoreShape @ foldlab/cas/CasStore` | `@` reads "at" and carries the tag string — the runtime identity Context dispatches on, never abbreviated. `export class`, the self-referential first type argument and the empty body all regenerate. No statics ⇒ no trailing block. |
| R50 | Service class with statics | `… { static readonly layerOf = (address: CasAddress): Layer.Layer<AddressScheme> => Layer.succeed(AddressScheme, address); static readonly layerSha256: Layer.Layer<AddressScheme, never, Crypto.Crypto> = Layer.effect(AddressScheme, makeSha256Address) }` | `service AddressScheme : CasAddress @ foldlab/cas/AddressScheme { layerOf(address: CasAddress) = Layer dot succeed(AddressScheme, address); layerSha256 = Layer dot effect(AddressScheme, makeSha256Address) }` | Each `static readonly` member becomes `<name>[(<params>)] = <rhs-verbal>`; parens omitted only when the member is a plain value, not a function. `static readonly` is house-invariant and regenerates. Member type annotations are re-derived from the RHS, never spoken separately, because they are exactly inferable. Source order preserved. |
| R51 | Layer from a value | `Layer.succeed(AddressScheme, address)` | `Layer dot succeed(AddressScheme, address)` | Positional; never curried in house code, so no pipe-vs-direct ambiguity. |
| R52 | Layer from an effect | `Layer.effect(AddressScheme, makeSha256Address)` | `Layer dot effect(AddressScheme, makeSha256Address)` | The method token alone carries "second argument is an Effect, not a value". The register never collapses `effect` and `succeed` to one word. |
| R53 | Layer from a Context | `Layer.effectContext(makeCasStore.pipe(Effect.map(…)))` | `Layer dot effectContext(makeCasStore \|> Effect.map(fun store -> Context dot make(CasStore, store) \|> Context dot add(CasLoader, {load: store.load})))` | Composes R42/R43, R40 and R54 with no new grammar — verbalising a composite is recursive application plus substitution. |
| R54 | Context building | `Context.make(CasStore, store)` / `Context.add(CasLoader, { load: store.load })` | `Context dot make(CasStore, store)` / `Context dot add(CasLoader, {load: store.load})` | Head calls. The object literal is a runtime value ⇒ verbatim. |
| R55 | Layer combinators | `layerStore.pipe(Layer.provideMerge(layerMemoryBackend))` | `layerStore \|> Layer.provideMerge(layerMemoryBackend)` | Uses the one pipe rule (R42), not a bespoke direct-call normalisation. `Layer.provide`, `Layer.provideMerge` and `Layer.mergeAll(a, b, c)` keep their own names verbatim — the register never invents a shared shorthand for two combinators just because their call shapes rhyme. `mergeAll`'s argument order is semantically load-bearing for overlapping services and is never normalised. |
| R56 | Tagged shape value | `return CasStore.of({ put, ...makeCasLoaderOver(address, reader) })` | `return CasStore dot of({put, ...makeCasLoaderOver(address, reader)})` | `.of` is a head template. Shorthand properties and spread stay verbatim (§1.4). `return` spoken only when present in source. |

### 3.6 Errors and recovery

| # | Construct | Code | Verbal | Round-trip notes |
|---|---|---|---|---|
| R57 | Error construction | `new StoreFailure({ reason: \`SHA-256 failed: ${String(cause)}\` })` | `new StoreFailure({reason: \`SHA-256 failed: ${String(cause)}\`})` | The atomic value R32, R58, R59 and R60 all reuse. Field keys must match R22's declared fields; the value expression is carried verbatim, template string and all. Distinguished from R32 (`refuse`) by the absence of generator control flow — this form is a plain value usable anywhere an expression is. |
| R58 | Single-tag recovery | `Effect.catchTag(CasErrorTag.ContentNotFound, (missing) => Effect.succeed(fallbackNode))` | `\|> Effect.catchTag(ContentNotFound, fun missing -> Effect dot succeed(fallbackNode))` | **A bare capitalised member name** expands to `CasErrorTag.<Member>` — the house's own way of naming a tag at a catchTag site (a bare class name never matches; the constants close that gap). **A quoted string** expands to itself: `Effect.catchTag("PlatformError", …)` → `\|> Effect.catchTag("PlatformError", fun error -> …)`. The two argument shapes are visibly different, so this one rule covers both without ambiguity. |
| R59 | Multi-tag recovery | `Effect.catchTags({ ContentNotFound: () => Effect.succeed(fallbackNode), DanglingReference: (e) => Effect.fail(new StoreFailure({ reason: "unreachable" })) })` | `\|> Effect.catchTags {ContentNotFound -> fun () -> Effect dot succeed(fallbackNode), DanglingReference -> fun e -> Effect dot fail(new StoreFailure({reason: "unreachable"}))}` | Deliberately distinct from R58 (plural word, brace map, `->` case arrows) because their elisions are **opposite**: here a bare member name expands to the literal object key `"CasError/<Member>"`, since `catchTags` keys by `_tag` directly. Handlers are verbalised by whatever rule owns them (R40 + R57 here). |
| R60 | Error translation | `Effect.mapError((issue) => new StoreFailure({ reason: … }))` / `Effect.mapError(backendFailure)` | `\|> Effect.mapError(fun issue -> new StoreFailure({reason: …}))` / `\|> Effect.mapError(backendFailure)` | Inline lambda vs bare identifier are never ambiguous: one starts with `fun`, the other cannot (R40). A named translator needs no decomposition here; its own definition site is verbalised by R9 + R40. |

### 3.7 Plane P — store programs

Legal **only** inside a `program <kebab-name> { … }` wrapper (§1.8). Content-faithful, not syntax-faithful.

| # | Construct | Code | Verbal | Round-trip notes |
|---|---|---|---|---|
| R61 | Program document | `export const blobTwoLeaves = (store: CasStoreShape) => Effect.gen(function* () { … })` | `program blob-two-leaves { … }` | Name is the fixture's kebab-case registry name (`{ name: "blob-two-leaves", run: blobTwoLeaves }`), **not** the camelCase export; decode default is kebab→camel. The `(store: CasStoreShape) =>` parameter and the `Effect.gen` wrapper are fixed boilerplate the register always supplies and never speaks. |
| R62 | Address token | `const a0 = yield* store.put(…)` … later `{ id: a0, … }` / `ContentId.make("9e1f…")` | `a0` / `#9e1f…` (full 64 hex) | `aN` names a value put earlier **in this same document**, indexed by position among that document's `put` statements — the convention already used in `library/effects/test/generated/VectorPrograms.ts`, so verbal and generated code agree by construction. `#<hex64>` names a value minted anywhere else and decodes to `ContentId.make("<hex64>")`. Parsing the token alone tells you which case you are in. **Truncation is never permitted on the `#` form.** |
| R63 | Admission | `const a1 = yield* store.put({ kind: { version: 0, tag: 9 }, payload: hex("0000000000000010"), refs: [{ id: a0, expectedTag: 8 }] })` | `a1 = put {kind 9, payload 0x0000000000000010, refs [a0@8]}` | Binder index = position among this document's puts. Decodes to a `const aN = yield* store.put({…})` line in that position. |
| R64 | References | `refs: [{ id: a0, expectedTag: 8 }, { id: a2, expectedTag: 8 }]` | `refs [a0@8, a2@8]` | `<addr>@<tag>`. Order preserved — it is part of `encodeCasNode`'s canonical encoding, not cosmetic. |
| R65 | Empty references | `refs: []` | *(clause omitted)* | The only elision `refs` gets. No partial-omission form exists, so presence/absence of the clause is unambiguous. |
| R66 | Kind | `kind: { version: 0, tag: 11 }` / `{ version: 1, tag: 11 }` | `kind 11` / `kind 1.11` | Version elided exactly when it equals `CasSchemeVersion` (today `0`), read from `casCodec.ts`, not from context. The dot is the only signal of a non-default scheme, so the two forms can never collide. |
| R67 | Payload | `payload: hex("68656c6c6f2c20636173")` | `payload 0x68656c6c6f2c20636173` | **Full** hex string always — payload bytes are content whose omission changes the address. `0x` distinguishes a payload from an address token or a tag number. Which literal helper wraps it on decode (`hex(…)` in fixtures, a raw `Uint8Array` at library call sites) is a fixed default of the calling context. |
| R68 | Read | `yield* loader.load(id)` / `yield* store.load(a0)` | `load a0` | Spoken identically for `CasLoader` and `CasStore` — plane P does not distinguish read-only from read-write capability. Decode picks the service value from the document's declared parameters (`store` if a `CasStoreShape` parameter was declared, else `loader`). |
| R69 | Publish | `yield* roots.publish(a3)` | `publish a3` | Void result; nothing elided beyond the fixed wrapper. Idempotent by the backend's own law, so no distinct "already published" spelling is needed. |
| R70 | List roots | `const published = yield* roots.list` | `list roots` | No argument slot, and `RootStore` declares the result order unspecified — so no ordering claim round-trips. Decodes to the bare property access, bound to a local only if a later statement consumes it. |
| R71 | The word | `return [a0, a1, a2]` | `word: a0 a1 a2` | Always the **last** line of a program document, order-significant: R5 (EFFECTS-BACKEND) decides conformance by **word equality** of a recorded run, so the list is rendered bare and in order, never paraphrased, reordered or compressed. A program with no `return` speaks no `word:` line — the only case it is omitted. |
| R72 | Naked put | `CasStore.use((store) => store.put(nodeOf(ast)))` | `put {kind 83, payload 0x7b22…7d}` | No `aN =` prefix: the surrounding code consumes the Effect value, not a stored address. Decode renders `CasStore.use((store) => store.put({…}))` when only a `CasStore` *requirement* is in scope, or bare `store.put({…})` when a `store` value already exists — decided by the document's declared parameters, never left ambiguous in the verbal. |

**Rule count: 72.**

---

## 4. Collisions resolved

Every entry: the same verbal territory was claimed by two or more drafters; one spelling was chosen and the loser was renamed or retired **consistently throughout this document**.

| # | Territory | Claimants | Ruling | Loser |
|---|---|---|---|---|
| 4.1 | `.pipe(…)` | `\|>` · `dot-pipe … then …` · direct-call normalisation `Layer dot provide(base, dep)` · literal `.pipe(` | **`\|>`** wins (R42–R43). One repeatable connector, arbitrary chain length, reads aloud as "pipe". | `dot-pipe`, `then`, `into`, `via`, `dot-use` all retired as connectives; `dot-use` re-expressed as head call `Tag dot use(…)` (R48). |
| 4.2 | Pipe-stage qualifier | drop `Effect.` inside a pipe (`\|> map f`) vs keep it | **Keep, always** (R45). `provide` exists on both `Effect` and `Layer`; the piped value's module is not decidable from the stage word, so dropping it breaks D2. | Terse stage words. Cost is verbosity — see open question Q1. |
| 4.3 | `yield*` | `yield star` · `yield` · `<-` | **`yield`** (R27–R31). The register has no other yield, so decode to `yield*` is unconditional. | `yield star` retired; `<-` retired (service access is just R30). |
| 4.4 | Generator binding | `name = yield star e` · `name gets yield e` · `name <- Tag` | **`gets yield`** for effectful, **`is`** for pure (R27, R28). One pair makes both the elided `const` and the presence of `yield*` explicit. | bare `=`; `<-`. |
| 4.5 | Head-call arguments | "bare trailing identifier drops its parens" vs always parenthesise | **Always parenthesise** (R37). Two spellings for one construct violates D1. | `Effect dot succeed bytes` → `Effect dot succeed(bytes)`. |
| 4.6 | Typed abort in a generator | `return yield star new X({…})` · `refuse X {…}` · `return fail X{…}` | **`refuse X({…})`** (R32). A single reserved word, audibly distinct from R37's `Effect dot fail(…)`; `return fail` was rejected precisely because it shares a word with it. | `return yield star new X`; `return fail X{}`. |
| 4.7 | Nesting notation | angle brackets `<flow>` · canonicalising `f(g(x))` into a pipe chain | **Neither** (R47). Parens and braces already delimit; canonicalising nested application into a pipe is lossy and breaks plane-C fidelity. | `< >` markers; the `into` chain for nested calls. |
| 4.8 | `Schema.brand` | `brand X of <base>` (minting-site head) · `branded X` (postfix particle) | **`brand X of <base>`** (R12), with the base's check particles composing after `of`. One spelling; `brand` appears only at the minting site. | `branded X`. |
| 4.9 | "optional" field wrappers | `Schema.optionalKey(X)` → "optional key of X" vs house `optionalField(X)` → "optional field(X)" | Both kept — different planes — but the house one is **renamed to `ast optional field(X)`** (R20), with `ast field(X)` for its partner, so the two are audibly distinct at word one. | bare `optional field(X)`. |
| 4.10 | `Effect.all` | flatten the array (`Effect dot all(A, B, C)`) vs keep it | **Keep it** (R41). Flattening collides with `Effect.all({record})` and buys nothing. | flattened form. |
| 4.11 | Tagged-error declaration | `tagged error X "CasError/X" {fields}` vs `tagged error X : CasError {fields}` | **`: Namespace`** form is *mandatory* when the tag is exactly `<Namespace>/<ClassName>`; the quoted form is *mandatory* otherwise, and illegal when the tag conforms (R22). Exactly one legal spelling per class. | free choice between the two. |
| 4.12 | Runtime values | elide to field names (`new StoreFailure { reason }`) vs carry verbatim | **Verbatim** (§1.4, R57). Plane P *requires* full payload hex, and R35's answer-threading requires verbatim argument names; a register that drops values cannot serve either. | value elision. A `…` ellipsis survives only as unratified sketch mode. |
| 4.13 | Lambdas | `fun p -> body` · `p => body` · bare `p -> body` · literal source | **`fun p -> body`** (R40). The `fun` head is what makes R60's named-vs-inline handler distinction decidable in both directions. | `=>`; bare `->` as a lambda head. |
| 4.14 | Function-type return | `(T) to effect(…)` · `name(p: T): effect(…)` · `-> fn.Return(…)` | **`->`** everywhere (R7, R8, R26), with parameter **names kept**. `->` has one meaning — "maps to" — in three positions (function type, lambda body, `catchTags` case), each fixed by its head. | `to`; the `name(...): type` shape; parameter-name elision. |
| 4.15 | Whitespace before `(` | `effect (aer)` vs `effect(aer)` | **No space** (R1). Whitespace between a head word and its paren is insignificant on input; the printer emits none. See §5.6. | `effect (aer)` as printer output. |
| 4.16 | `union` | `error union X = A \| B` (TS alias) vs `schema union [A, B]` (`Schema.Union`) | Both kept: distinct head words, distinct bracket syntax, each spelling its own source syntax (R17, R23). | nothing — recorded because "union" is reused and a listener must key on the preceding word. |
| 4.17 | `dot` scope | speak `dot` for every `Module.method` vs only at a matched template head | **Template head only** (§1.2). Otherwise ordinary member paths (`FetchHttpClient.layer`, `node.refs.map`) drown the register in "dot". | universal `dot`. |
| 4.18 | Plane conflict | plane-C syntactic fidelity vs plane-P content fidelity for `put`/`load` | **Two declared planes** with the `program … { }` wrapper as the boundary (§1.8). Plane P's many-to-one is legal only inside it. | the implicit assumption that one law covered both. |

---

## 5. Worked round trips

### 5.1 `CasStore.put` — the house generator

**Code**
```ts
export const put = Effect.fn("CasStore.put")(function* (input: CasNodeInput) {
  const node = yield* validateNode(input)
  yield* ensureKnownKind(node)
  const canonicalBytes = encodeCasNode(node)
  const id = yield* address.digest(canonicalBytes.slice())
  if (actual !== id) {
    return yield* new AddressMismatch({ expected: id, actual })
  }
  return node
})
```

**Verbal** (R26 · R27 · R29 · R28 · R34 · R32 · R33 · R35)
```
Effect dot fn "CasStore.put" (input: CasNodeInput) {
  node gets yield validateNode(input);
  yield ensureKnownKind(node);
  canonicalBytes is encodeCasNode(node);
  id gets yield address.digest(canonicalBytes.slice());
  if (actual !== id) { refuse AddressMismatch({expected: id, actual}) };
  return node
}
```

**Back to code.** `Effect dot fn` restores the currying and `function*`; the quoted string is argument one; the paren run is the parameter list; each `;` clause restores one statement — `gets yield` → `const … = yield*`, bare `yield` → `yield*`, `is` → `const … =`, `refuse X({…})` → `return yield* new X({…})`, bare `return` → itself. Identical to source.

### 5.2 A pipe chain with a typed translator

**Code**
```ts
writer.putBytes(id, canonicalBytes).pipe(
  Effect.mapError(backendFailure),
  Effect.orDie,
)
```

**Verbal** (R43 · R60 · R44)
```
writer.putBytes(id, canonicalBytes) |> Effect.mapError(backendFailure) |> Effect.orDie
```

**Back to code.** Everything before the first `|>` is the receiver; each `|>` segment is one `.pipe` argument in order. `Effect.mapError(backendFailure)` — bare identifier, no `fun`, so a named handler (R60). `Effect.orDie` — no parens, so a bare property reference (R44). Identical.

### 5.3 The store layer — composite nesting

**Code**
```ts
export const layerStore: Layer.Layer<
  CasStore | CasLoader,
  never,
  ByteReader | ByteWriter | AddressScheme
> = Layer.effectContext(
  makeCasStore.pipe(
    Effect.map((store) => Context.make(CasStore, store).pipe(
      Context.add(CasLoader, { load: store.load }),
    )),
  ),
)
```

**Verbal** (R9 · R4 · R53 · R42 · R40 · R54)
```
layerStore : layer(CasStore|CasLoader, never, ByteReader|ByteWriter|AddressScheme)
  = Layer dot effectContext(makeCasStore |> Effect.map(fun store ->
      Context dot make(CasStore, store) |> Context dot add(CasLoader, {load: store.load})))
```

**Back to code.** The lowercase `layer(...)` is a type annotation with three concrete slots: two unions and a written middle `never` (§1.5). `Layer dot effectContext` is a head call. Inside it, `|>` restores `.pipe`, `fun store ->` restores the arrow, and the inner `|>` restores the second `.pipe`. Identical.

### 5.4 `ContentId` — a branded, refined leaf

**Code**
```ts
export const ContentId = Schema.String.check(
  Schema.isPattern(/^[0-9a-f]{64}$/u),
).pipe(Schema.brand("ContentId"))
export type ContentId = typeof ContentId.Type
```

**Verbal** (R12 · R11 · R10)
```
brand ContentId of schema string checked pattern /^[0-9a-f]{64}$/u
```

**Back to code.** `brand X of <base>` restores the `.pipe(Schema.brand("X"))` tail and the paired `export type X = typeof X.Type`. `<base>` = `schema string` (R10) + `checked pattern <regex>` (R11) → `Schema.String.check(Schema.isPattern(/…/u))`. Identical. Note this is the composition §4.8 was cut to allow: one head, one `of`, then the base's own particles.

### 5.5 A store program — plane P

**Code**
```ts
export const blobTwoLeaves = (store: CasStoreShape) =>
  Effect.gen(function* () {
    const a0 = yield* store.put({ kind: { version: 0, tag: 8 }, payload: hex("68656c6c6f"), refs: [] })
    const a1 = yield* store.put({ kind: { version: 0, tag: 9 }, payload: hex("0000000000000010"), refs: [{ id: a0, expectedTag: 8 }] })
    return [a0, a1]
  })
```

**Verbal** (R61 · R63 · R66 · R67 · R65 · R64 · R71)
```
program blob-two-leaves {
  a0 = put {kind 8, payload 0x68656c6c6f}
  a1 = put {kind 9, payload 0x0000000000000010, refs [a0@8]}
}
word: a0 a1
```

**Back to code.** The wrapper restores the `(store: CasStoreShape) =>` parameter, the `Effect.gen` shell and the kebab→camel export name. Each `aN = put {…}` restores one `const aN = yield* store.put({…})`, with `kind 8` → `{version: CasSchemeVersion, tag: 8}`, `payload 0x…` → `hex("…")`, and an absent `refs` clause → `refs: []`. `word:` restores `return [a0, a1]`. Content-identical; **not** guaranteed byte-identical to whatever surface syntax the original used, per §1.8.

### 5.6 Seed one — `Effect dot gen { Console.log }`

The operator's seed, reconciled. **Under the final rules the register spells it differently, in two ways.**

**Code**
```ts
Effect.gen(function* () {
  yield* Console.log("wow")
})
```

| | |
|---|---|
| **Operator's seed** | `Effect dot gen { Console.log }` |
| **This register (R25 · R29)** | `Effect dot gen { yield Console.log("wow") }` |

Two divergences, both deliberate:

1. **The seed elides `yield*`.** The register requires it (R29). Without an explicit marker, `Console.log("wow")` as a statement is ambiguous between `yield* Console.log("wow")` and a bare synchronous call — and R28's `is` / R27's `gets yield` split depends on that marker existing. Restoring `yield*` by "it's inside a gen block so it's probably an effect" is exactly the likelihood-elision D4 forbids.
2. **The seed elides the argument `"wow"`.** The register carries values verbatim (§1.4). `Console.log` with no parens would decode to a *property reference* (that is what R44 uses for `Effect.orDie`), not a call.

What the seed got right and this register keeps unchanged: the head word `Effect dot gen`, the word `dot` at a template head, the brace-delimited body, and the disappearance of `function* ()` into the template.

### 5.7 Seed two — `effect (aer)`

**Code**
```ts
Effect.Effect<A, E, R>
```

| | |
|---|---|
| **Operator's seed** | `effect (aer)` |
| **This register (R1)** | `effect(aer)` |

One divergence: **the space before the paren.** §4.15 makes whitespace between a head word and its paren insignificant on input and absent from printer output, so `effect (aer)` is *accepted* and canonicalises to `effect(aer)`. The reason to close the gap is uniformity with the concrete form `effect(CasNodeInput, CasError)` and with `layer(…)`, `codec(…)`, `option(…)`, `fn.Return(…)` — a printer that emits a space in one and not the other has two spellings for one bracket.

Everything else in the seed is load-bearing and survives intact: lowercase head = type position (§1.1), fused comma-less letters = abstract template (§1.6), declaration order `A,E,R`, and trailing-only elision (`effect(ae)`, `effect(a)`).

---

## 6. Open questions for the grill

1. **Terse pipe stages.** §4.2 kept `Effect.` on every stage because `provide` is ambiguous between `Effect` and `Layer`. The cost is that a long chain reads "pipe Effect map, pipe Effect map error, pipe Effect or die". Do we want a closed per-module stage table that permits `|> map f` for the unambiguous names and forces qualification only for the overloaded ones (`provide`, `map`, `flatMap`)? That buys brevity at the price of a lookup table a listener must hold.

2. **`yield star` vs `yield`.** §4.3 chose `yield`. Dictated aloud, is "yield" clear enough, or does the operator want the longer token for the same reason `\|>` is read "pipe"?

3. **`refuse`.** §4.6 minted a word that appears nowhere in the code. Is a reserved English verb for `return yield* new X(…)` right, or should the register never invent vocabulary that has no source token behind it?

4. **Plane P's many-to-one.** §1.8 admits content-faithful round-tripping inside `program { }`. Does R13 (printer model) tolerate a printer whose inverse is not a left inverse on source text, or must plane P be re-cut so that `store.put(…)`, `CasNodeInput.make(…)` and `CasStore.use(…)` get three distinct spellings?

5. **Whitespace.** §4.15 declared it insignificant. Is that acceptable for a *printer* — or does R13 require the printer's output to be the unique legal string, with `effect (aer)` a reader-only courtesy that the conformance gate rejects?

6. **`kind 1.11`.** R66 uses a dot to signal a non-default scheme version. That is the only place in the register where a literal `.` carries register meaning rather than being source text. Rename to `kind v1 11` or `kind 1/11`?

7. **House-caveat rules.** R25 (bare `Effect.gen`), R39 (bare `Effect.promise`) and R44 (`Effect.orDie`) have **zero** hits in `library/effects/src`. They are in the register because the brief named them. Should the register cover only attested constructs, with unattested ones quarantined in an appendix that the conformance gate ignores?

8. **`Effect.tryPromise`.** Explicitly out of scope in every drafter's group, yet it is the *actual* house idiom that R39 flags. It needs a rule before the register can print `Store.ts`'s `layerCryptoWebCrypto`.

9. **`declare readonly` overrides.** R22's `as <Type>` clause is present iff a narrowing override exists. Only `RemoteFailure` has one today. Is one attested instance enough to fix a template, or should it be an open slot until a second appears?

10. **Tag tables over a subset.** R24 elides the whole table body on the strength of a `satisfies` clause. If a future table covers a strict subset of its union, R24 silently becomes wrong. Do we gate this on the `satisfies` clause being present in source, and refuse to print otherwise?

11. **Where does this live?** The doc is staged at `.staging/verbal-register/REGISTER.md`. If it is to serve R13, it presumably wants a home under `docs/` alongside the printer model and a conformance vector set that exercises all 72 rules in both directions.

---

## Consistency findings (adversarial pass)

Thirteen findings survived. Each names the clause it breaks (D1 one spelling per construct, D2 one construct per spelling, D3 compositional templates, D4 deterministic elisions only) or the worked example it contradicts. Nothing here is a ruling; the register above is unchanged.

### C1 — Pipe stages have two `dot` spellings (D1)

§1.2 fixes the stage spelling:

> - `Effect.map` appearing as a `|>` stage matches no head template (it is a *slot* in R40) → spoken "Effect map", written `Effect.map`, literal dot.

R42, R43, R45 and R55 all obey it (`|> Effect.mapError(fn)`, `|> Layer.provideMerge(layerMemoryBackend)`). R53 does not:

> `Layer dot effectContext(makeCasStore |> Effect.map(fun store -> Context dot make(CasStore, store) |> Context dot add(CasLoader, {load: store.load})))`

and §5.3 reprints it:

> `      Context dot make(CasStore, store) |> Context dot add(CasLoader, {load: store.load})))`

`Context.add(...)` in stage position is spelled `Context dot add(...)` here and `Effect.map(...)` in the same expression is spelled with a literal dot. The head/stage test and the R54-membership test disagree, so one construct — a `Context.add` stage — has two legal spellings. (The parenthetical "it is a *slot* in R40" is also a broken cross-reference: R40 is Lambda; the pipe rule is R43.)

### C2 — A lowercase concrete type parses as an abstract letter run (D2)

§1.6:

> A comma-less all-lowercase letter run inside parens — `(aer)`, `(oei)`, `(terw)` — is the construct's **own declared type-parameter letters** … so `(ae)` can never be mistaken for two classes literally named `A` and `E`.

The defence only covers capitalised names. TypeScript's primitives are lowercase, so `Option.Option<string>` prints `option(string)` — a comma-less all-lowercase run — which R6's abstract form (`option(a)`) claims as the letters s,t,r,i,n,g. Same for `effect(void)`, `effect(never)`, `option(unknown)`. The grammar admits the hole out loud:

> `slot       := letter-run | type | 'never'               -- fused letters = abstract, commas = concrete`

`never` and every lowercase type name match two alternatives of one production.

### C3 — R72 truncates a payload and gives one source two verbals (D4, D1, D3)

§1.4: "Payload bytes are never truncated; a shortened digest is not an address." R67: "**Full** hex string always — payload bytes are content whose omission changes the address." R72 prints:

> `put {kind 83, payload 0x7b22…7d}`

— an ellipsis inside a normative rule row, in the one field the document twice declares un-elidable. Worse, R72's Code column is byte-identical to R48's:

> R48 `CasStore.use((store) => store.put(nodeOf(ast)))` → `CasStore dot use(fun store -> store.put(nodeOf(ast)))`
> R72 `CasStore.use((store) => store.put(nodeOf(ast)))` → `put {kind 83, payload 0x7b22…7d}`

§1.8's plane boundary does not rescue this: the same string is being given two verbals, and the plane is not decidable from the source. And `kind 83, payload 0x…` cannot be produced mechanically from `nodeOf(ast)` — it requires *running* `nodeOf`, which is not structural recursion over the parts' verbals (D3).

### C4 — §5.5 puts `word:` outside the plane-P wrapper (rule vs example)

§3.7: "Legal **only** inside a `program <kebab-name> { … }` wrapper (§1.8)." R71: "Always the **last** line of a program document". The worked example:

> ```
> program blob-two-leaves {
>   a0 = put {kind 8, payload 0x68656c6c6f}
>   a1 = put {kind 9, payload 0x0000000000000010, refs [a0@8]}
> }
> word: a0 a1
> ```

`word:` sits after the closing brace, outside the only wrapper plane P is legal in. The grammar has no production for it either (`decl := … | 'program' name block-P`, and `block-P` is never defined).

### C5 — §5.5 separates statements by newline; §1.7 and the grammar require `;` (rule vs example, D1)

§1.7: "Statement order equals source order, joined by `;`." Grammar: `block := '{' stmt (';' stmt)* '}'`. R35 and §5.1 use `;`. §5.5's two put statements are newline-separated with no `;`, so the register has two statement separators and the worked plane-P document is not derivable from the grammar.

### C6 — R50 spells a lambda with no `fun` and no `->` (D1, D3, D4)

R40 declares itself:

> **The single lambda spelling.** One parameter bare, zero or many parenthesised …

R50's source member is a lambda, `(address: CasAddress): Layer.Layer<AddressScheme> => Layer.succeed(...)`, and its verbal is:

> `layerOf(address: CasAddress) = Layer dot succeed(AddressScheme, address)`

No `fun`, no `->` — a second lambda spelling, and a template that does not compose R40 from its parts. §4.14 also lists "the `name(...): type` shape" among the losers, which this form revives. Separately, R50's note — "Member type annotations are re-derived from the RHS, never spoken separately, because they are exactly inferable" — silently drops `layerSha256: Layer.Layer<AddressScheme, never, Crypto.Crypto>`; restoring it requires knowing `makeSha256Address`'s type from *another* declaration, so the restored value is not fixed by this document as D4 demands.

### C7 — R59 is not a legal stage and drops mandatory parens (D1)

Grammar: `stage := Module '.' member '(' arg,* ')' | Module '.' member`. §4.5 ruling: "**Always parenthesise** (R37). Two spellings for one construct violates D1." R59 prints:

> `|> Effect.catchTags {ContentNotFound -> fun () -> Effect dot succeed(fallbackNode), …}`

A brace argument with no parens matches neither stage alternative, and contradicts the always-parenthesise ruling that R41 (`Effect dot all([…])`) and R57 (`new StoreFailure({…})`) obey. (R25/R26's brace bodies escape through head-call's "or a bespoke template"; the `stage` production has no such escape.)

### C8 — `:` carries at least three meanings (§1.3)

§1.3 promises:

> Only the connective tissue (`dot`, `|>`, `->`, `gets`, `is`, `refuse`, `:`, `@`, `,`, `{}`, `()`) is register vocabulary, and each mark has exactly one meaning in both directions.

But:

> R22 `tagged error AddressMismatch : CasError {expected: ContentId, actual: ContentId}`

means "the tag string is `"CasError/AddressMismatch"`" — `AddressMismatch` does not have type `CasError`; it is a *member* of it. Whereas

> R49 `service CasStore : CasStoreShape @ foldlab/cas/CasStore`

means "has shape type", and R8/R9/R15 mean "has type". Three meanings, one mark, against an explicit one-meaning promise.

### C9 — R11's `checked` particle has two argument spellings, and `max` names two things (D1, D2)

> `checked <pred-words> <args>`: predicate name with `is` dropped, PascalCase split to spaced lowercase (`isMaxLength` → `checked max length 4294967295`). … `schema int checked between(min, max)`.

`checked max length 4294967295` takes a bare juxtaposed argument; `checked between(min, max)` parenthesises. Nothing decides which, so a printer has two legal outputs for one check. Worse, the closed abbreviation table makes `max` a token for `Number.MAX_SAFE_INTEGER`, while `checked max length …` uses `max` as the first half of a predicate name — one spelling, two constructs. A decoder reading `checked max …` cannot tell where the predicate name ends and the arguments begin without an arity table the register does not publish.

### C10 — R70 loses the binder name (D4)

> R70 `const published = yield* roots.list` → `list roots` … "Decodes to the bare property access, bound to a local only if a later statement consumes it."

The name `published` is nowhere in the verbal, and the rule concedes a binder may be needed on decode. Exactly one value must be restorable and fixed by this document; `published` is neither. Contrast R63, which carries `a1 =` precisely because the binder is load-bearing.

### C11 — Plane-P binder indices are ambiguous once R72 exists (D4)

> R62: "`aN` names a value put earlier **in this same document**, indexed by position among that document's `put` statements"
> R63: "Binder index = position among this document's puts."

R72 is a `put` statement with no binder. If naked puts consume an index, then `a0 = put …; put …; a1 = put …` is illegal (the third put is index 2); if they do not, the two rules' stated indexing law is wrong as written. The register does not say which, so the decode of `aN` is not fixed.

### C12 — R44's caveat contradicts R43 and §5.2 (rule vs example)

> R44 … **House caveat:** zero verbatim hits in `library/effects/src` — `Store.ts` keeps every branch as a typed `StoreFailure` rather than converting to a defect.

Yet R43's Code column and §5.2's Code block both present `Effect.orDie` as live house code:

> `writer.putBytes(id, canonicalBytes).pipe(Effect.mapError(backendFailure), Effect.orDie)`

Either the caveat is wrong or the two examples are fabricated; open question 7 cannot be adjudicated while the document disagrees with itself about attestation. Related: §5.1's code guards on `actual`, which is never bound in that snippet (`id` is), so the example does not typecheck and cannot be used as a conformance vector as written.

### C13 — No rule covers the top-level initialised declaration used in §5.3 (D3)

§5.3's verbal is:

> `layerStore : layer(CasStore|CasLoader, never, ByteReader|ByteWriter|AddressScheme)`
> `  = Layer dot effectContext(…)`

R9 covers only the *annotation* (`makeSha256Address : effect(…)`) with no initialiser, and no rule in §3 gives `name : type = expr`. The grammar names `value-decl` in `decl := type-decl | value-decl | service | 'program' name block-P` but never defines it — as it also leaves `program`, `block-P`, `type-decl`, `service`, `head`, `params` and `cond` undefined. The document's flagship composite is therefore assembled by hand, not by substitution into a stated template.
