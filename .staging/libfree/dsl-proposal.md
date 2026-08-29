# libfree — a recognition-manifest DSL for lifting Effect v4 programs into the store language

Status: **pre-grade proposal, staged for grilling** (`.staging/` per AGENTS.md
orientation; nothing here is ratified). Conception-mode register (C3):
direction and structure, no proof submissions. Every external claim carries a
provenance pin (C6): web fetches record URL + date observed; repo facts cite
`path:line`. Sections that speculate say **SPECULATION** in place.

Author's mandate: propose the DSL that produces the best possible
tree-sitter parser semantics for recognizing Effect v4 TypeScript programs
and lifting them FAITHFULLY into the estate's effect plane as first-order
program documents — and recommend how reliably, and with what evidence
registers, recognition should collect evidence for the lift.

---

## Table of contents

1. [Frame: what recognition is here](#1-frame)
2. [Glossary](#2-glossary)
3. [TypeScript × Effect v4 as parsing problems: the register catalog](#3-registers)
4. [Worked examples from the estate's own code](#4-worked-examples)
4b. [The wild register: monorepo samples and adversarial variants](#4b-wild-register)
4c. [Recognition posture: Effect-only vs TypeScript+Effect jointly](#4c-posture)
5. [Tree-sitter parsing heuristics](#5-tree-sitter-heuristics)
6. [The `<in E>` defect and its remediation](#6-in-e-defect)
7. [The DSL: the recognition manifest made concrete](#7-the-dsl)
8. [Example rules](#8-example-rules)
9. [Generation targets](#9-generation-targets)
9b. [The codex-operable lane: tasks, state, and the loop contract](#9b-codex-lane)
10. [The evidence-register recommendation](#10-evidence-registers)
10b. [The classifier lane: learned candidate proposal](#10b-classifier)
11. [What can never be established statically](#11-never-static)
12. [Honest limits and named risks](#12-limits-and-risks)
13. [Decisions for the grill](#13-decisions)

---

<a name="1-frame"></a>
## 1. Frame: what recognition is here

Constraints taken as given (decided in-session; treated as law for this
proposal):

- **libfree is the ingestion parser for Effect programs.** Its CORE is built
  over the *program document* — the first-order stratum of
  EFFECTS-BACKEND R14 (`library/cas/EFFECTS-BACKEND.md:250-277`) — never over
  TypeScript concrete syntax. TS syntax appears only at the recognition
  frontier, behind admitted instruments (the TS-compiler-API / tree-sitter
  pair already admitted for Stage-1 extraction,
  `experiments/entity-store-extract/src/extract.ts` and
  `experiments/entity-store-extract/twin/extract-lean/ExtractTwin.lean`).
- **The claim boundary is the document.** What libfree asserts about a piece
  of TypeScript is exactly: "this file's program `P` lifts to program
  document `D`." Semantic validation of that assertion is the word-equality
  gate of R5 (`library/cas/EFFECTS-BACKEND.md:79-91`): run the parsed
  document and a recording of the original program; identical store words or
  the parse is rejected. No claim about `P` survives that is not decided at
  the word.
- **Recognition is admission.** A whitelist judgment plus a FAIL-CLOSED
  rejection taxonomy, exactly the house pattern of the Stage-1 extractor
  (whitelist + cross-checks + loud non-zero exit, `extract.ts:1-20,349-399`;
  ERROR-disjointness refusal, `ExtractTwin.lean:518-523`). A refusal with a
  named reason is a **correct output**. The refusal histogram over real
  codebases is the measurement of "how linearizable Effect-in-the-wild is."
- **The linearization spectrum.** Applicative-shaped straight-line programs
  are fully liftable today — this is precisely the emitted fragment
  (`library/effects/test/generated/VectorPrograms.ts`). Selective-shaped
  static branching lifts to finite code tables and arrives with the F3
  increment (`library/cas/EFFECTS-BACKEND.md:324-325`). Monadic-general
  programs are never statically liftable and are covered dynamically by the
  recording handler (`library/cas/Cas/Lang/Handler.lean:103-117` is the
  replay direction; recording is its co-direction per R10,
  `EFFECTS-BACKEND.md:174-177`). Frame citation: Mokhov, Lukyanov, Marlow,
  Dimino, *Selective Applicative Functors*, PACMPL 3(ICFP) art. 90, 2019,
  doi:10.1145/3341694 — **pin pending** per C6 (to be resolved into
  `.reference/catalog/PAPERS.md` before promotion; the spectrum frame in
  this document relies on it).
- **Two-instrument discipline.** The TS compiler API is the syntax/type
  authority; tree-sitter is the independent cross-check; both must implement
  ONE declared recognition manifest, R11-style — generated or mechanically
  checked from one source, never written twice
  (`library/cas/EFFECTS-BACKEND.md:189-198`).

What "faithful" means, precisely: the lift preserves the operation sequence
and every operation's first-order content (kind, payload bytes, reference
structure with answer-projection by index), such that the document's
reference-handler run answers the same word as the original program's
recorded run. Faithfulness is *observational at the word* (R5, R14 stratum
3) — deliberately not syntactic equivalence, and deliberately not semantic
equivalence in any richer sense (undecidable per R4,
`EFFECTS-BACKEND.md:61-77`).

<a name="2-glossary"></a>
## 2. Glossary (jargon glossed once, used throughout)

- **Store language** — CAS as an effects language: `Prog CasSig A`
  programs over `put`/`load`/`fail` (`library/cas/Cas/Lang/Ops.lean:21-33`),
  meaning fixed by the reference handler
  (`library/cas/Cas/Lang/Handler.lean:77-91`).
- **Program document** — the first-order, serializable form of a
  straight-line program: a list of instructions whose references name
  earlier answers BY INDEX. Carrier: `RunRef`/`RunInstruction`/`RunParams`
  (`library/cas/Cas/Backend/Mcp.lean:31-46`), rendered in the MCP manifest
  (`library/cas/mcp/cas-tools.json`, the `cas_run` tool). This is F3's first
  citizen and libfree's core datatype.
- **Word** — a run's history: the ordered list of (address, node) bindings
  (`Handler.lean:72-91`). Word equality is byte-decidable and is the
  conformance gate (R5).
- **CST** — concrete syntax tree, tree-sitter's output: every token
  present, error-recovering, no name or type resolution.
- **Compiler API** — the TypeScript compiler as a library
  (`typescript@5.9.2` pinned, `extract.ts:9-11,29-38`): parser (AST),
  binder (symbols), checker (types). Syntax-only use keeps the checker out
  of the trusted seam; the type register (§10) deliberately brings it in as
  a *separate, named* evidence source.
- **Recognition manifest** — the one declared artifact from which both
  recognizers and the refusal taxonomy are generated (§7).
- **Evidence register** — one instrument's kind of testimony about a
  candidate lift (tree-sitter hit; compiler-API syntactic match;
  compiler-API typed match; dynamic word agreement). §10.
- **Refusal** — a fail-closed rejection carrying a taxonomy code. A
  first-class output, counted, never a crash.

<a name="3-registers"></a>
## 3. TypeScript × Effect v4 as parsing problems: the register catalog

Effect v4 programs occur in a small number of syntactic registers. The
estate's own `library/effects/src/cas/*.ts` exercises all of them (they are
the pinned idiom set per R6/L1, `EFFECTS-BACKEND.md:93-105`). For each
register: what a tree-sitter CST query can see, what only the compiler API
can see, and what neither can see.

The uniform truth underneath all rows: **tree-sitter sees spelling;
the compiler API sees names and types; nothing static sees values.**
TypeScript's syntax is expression-oriented and higher-order, so the same
Effect denotation has unboundedly many spellings (point-free vs generator,
pipe vs method chain, extracted helper vs inline). Recognition therefore
targets registers (spellings), not denotations — and the word gate, not the
recognizer, carries the semantic claim.

### 3.1 R-GEN — generator bodies: `Effect.gen(function* () { … yield* … })`

The monadic do-notation. Estate examples: every generated program
(`VectorPrograms.ts:20-23`), and hand-written bodies via `Effect.fn` (R-FN).

- **CST sees:** the call spine
  `call_expression(function: member_expression(object|property), arguments)`;
  the `generator_function` node with `body: statement_block`
  (node-types.json: `generator_function` has fields `body`, `name`,
  `parameters`, `return_type`, `type_parameters` —
  `.staging/treesitter/clones/tree-sitter-typescript/typescript/src/node-types.json`,
  inspected 2026-08-28); each statement's shape; `yield_expression` with the
  `*` present as an anonymous token child (the CST keeps every token);
  `return_statement` with its optional expression child. Statement ORDER —
  the thing the lift most depends on — is fully visible.
- **Compiler API only:** that the `Effect` identifier resolves to the pinned
  `effect` package import and not a local shadow; that the receiver of a
  yielded call has type `CasStoreShape`; generic instantiation of
  `Effect.Effect<A, E, R>`; `satisfies`/`as const` refinements.
- **Neither sees:** what any yielded expression *evaluates to*; whether the
  generator body is entered once; anything about the ambient store the
  program will run against.

### 3.2 R-FN — `Effect.fn("name")(function* …)`: the traced-generator wrapper

Estate examples: `Store.ts` `verifyNodeBytes`
(`library/effects/src/cas/Store.ts:118`), `CasStore.put` (`Store.ts:205`),
`Blob.ts` `loadPlan` (`library/effects/src/cas/Blob.ts:172`),
`CanonicalSchema.get` (`library/effects/src/cas/CanonicalSchema.ts:333-336`).
CST-wise this is a *curried call*: `call_expression` whose `function` is
itself a `call_expression` (`Effect.fn("…")`) and whose single argument is a
`generator_function`. Fully queryable; the string literal ("CasStore.put")
is a free provenance anchor. The compiler API adds the same as R-GEN. The
wrapper's tracing semantics are invisible to both and irrelevant to the word.

### 3.3 R-PIPE — pipe chains: `x.pipe(f, g, …)` and `pipe(x, f, …)`

Estate example, method form (`Store.ts:106-110`):

```ts
CasNodeInput.makeEffect(input).pipe(
    Effect.mapError((issue) => new StoreFailure({ … })),
  )
```

and the standalone-`pipe` form (`CanonicalSchema.ts:232-235`,
`const compile … = pipe(Match.type<Ast>(), …)`).

- **CST sees:** the left spine (`member_expression property: "pipe"` vs
  `call_expression function: (identifier "pipe")`) and each stage as an
  argument expression. Chains are just nested calls — mechanically walkable.
- **Compiler API only:** each stage's type, hence what the chain *is* (an
  Effect? a Layer? a Schema?). Syntax alone cannot distinguish
  `Effect.map` from a user function named `map` off a namespace import
  alias.
- **Neither sees:** the composed function's behavior. A pipe chain is
  point-free computation — for the lift it is opaque unless every stage is a
  whitelisted combinator with a first-order reading.

### 3.4 R-PF — point-free combinator style

`Effect.map(f)(x)`, `Effect.all([…])` (`Store.ts:279-281`), `Match.*`
towers (`CanonicalSchema.ts:232-257`). Same CST machinery as R-PIPE.
This register is where static lifting *ends*: a combinator argument that is
a lambda is a host closure (R14 stratum 4 at the recognition frontier). The
straight-line fragment deliberately contains none of this.

### 3.5 R-SVC — service accessors

`Context.Service` classes (`Store.ts:67-69,77-79`; `Blob.ts:122-124`;
`Transfer.ts:82-84`), accessed by `yield* CasLoader`
(`CanonicalSchema.ts:337`) or `Service.use((s) => …)`
(`Blob.ts:485-488`, `CanonicalSchema.ts:325-327`).

- **CST sees:** the class-declaration shape
  (`class X extends Context.Service<X, Shape>()("tag")` — a
  `class_declaration` whose heritage is a *call expression*; note this is
  the same curried-call spine as R-FN), the tag string literal, and accessor
  call shapes.
- **Compiler API only:** that the yielded identifier's type is the service
  class; the `Shape` interface's members and their `Effect` types — this is
  how a recognizer learns that `store.put` answers `ContentId` and demands
  `CasNodeInput` without hand-coding the store's surface.
- **Neither sees:** which Layer will provide the service at run time —
  dependency injection is resolved dynamically; the static side sees only
  the requirement in the `R` type parameter.

### 3.6 R-LAYER — layer wiring

`Layer.effect`, `Layer.succeed`, `.pipe(Layer.provideMerge(…))`
(`Store.ts:314-324,346-350,396-397,401-403`). CST: pipe/call spines again.
Compiler API: `Layer.Layer<ROut, E, RIn>` instantiations — the wiring
GRAPH is a typed static object. Neither sees memoization or acquisition
order at run time. **This register is not program-lifting territory** — a
layer is a handler/interpreter (R3, R10), i.e. host machinery per R7
(`EFFECTS-BACKEND.md:107-114`). Recognition should *classify* it (evidence
for "this file wires hosts") and refuse to lift it as a program.

### 3.7 R-ERR — tagged errors

`Schema.TaggedError` subclasses (`Blob.ts:60-91`), yielded as refusals:
`return yield* new NonCanonicalBytes({ id })` (`Store.ts:135`). CST sees
the class declarations and the `yield* new X({…})` shape (this maps to the
store language's `fail` — an operation answering `Empty`,
`Ops.lean:27-31,54-57`). Compiler API sees the error channel type. Neither
sees whether a given run reaches the refusal.

### 3.8 R-SCHEMA — `Schema.*` combinator expressions

`Schema.Union([...])`, `Schema.TaggedStruct`, `Schema.suspend`
(`CanonicalSchema.ts:125-155`). These are *value-level type descriptions* —
data, not computation. CST sees the full combinator tree when it is
literal; the compiler API sees the inferred codec types. This register
feeds the schema plane (canonical schema codes), not the program plane; the
R8 surface-ingestion lane owns it. Listed because a recognizer must
CLASSIFY it correctly rather than refuse noisily.

### Summary table

| Register | CST query sees | Compiler API adds | Invisible to both | Lift verdict (v0) |
|---|---|---|---|---|
| R-GEN generator body | statement order, yield* spine, literals | import/type resolution of callees | run-time values | LIFT if every statement matches §8 rules |
| R-FN Effect.fn wrapper | curried-call spine + name literal | same as R-GEN | tracing semantics | unwrap, then as R-GEN |
| R-PIPE pipe chain | stage list | stage types | composed behavior | refuse `E-SPINE-ESCAPE` unless whitelisted stages |
| R-PF point-free | combinator tree | combinator identity | closure behavior | refuse `E-ARG-DYNAMIC` |
| R-SVC service access | class + tag literal, accessor shape | service Shape types | provided implementation | classify; receiver whitelist input |
| R-LAYER layer wiring | wiring spine | wiring graph types | memoization, ordering | classify as host machinery; never a program |
| R-ERR tagged errors | class decl, `yield* new` | error channel type | reachability | maps to `fail`; classify |
| R-SCHEMA schema combinators | combinator tree | codec types | — | route to schema plane |

<a name="4-worked-examples"></a>
## 4. Worked examples from the estate's own code

Four hand-lifts, each quoting the real code, the per-instrument evidence,
and the resulting document fragment or refusal. Instruction documents below
use the `RunInstruction` shape (`Mcp.lean:37-42`: `version`, `tag`,
`payloadHex`, `refs: List {expectedTag, source}` — `source` is the index of
the earlier instruction whose answer is named).

### 4.1 `valueSingle` — the emitted register; full lift

`library/effects/test/generated/VectorPrograms.ts:19-23`:

```ts
export const valueSingle = (store: CasStoreShape) =>
  Effect.gen(function* () {
    const a0 = yield* store.put({ kind: { version: 0, tag: 1 }, payload: hex("68656c6c6f2c20636173"), refs: [] })
    return [a0]
  })
```

- **Tree-sitter evidence:** one `lexical_declaration` (kind `const`) whose
  `variable_declarator` has `name: identifier "a0"` and
  `value: yield_expression` containing `"*"` and a
  `call_expression(function: member_expression(object "store", property
  "put"), arguments: (arguments (object)))`; the object literal's three
  `pair`s bind `kind`/`payload`/`refs`; a final `return_statement` whose
  child is `array (identifier "a0")`. Zero ERROR nodes. Statement partition:
  2 statements, 2 matches — total.
- **Compiler-API evidence (syntactic):** identical facts from `ts.Node`
  walks. **(typed):** `store` is the sole parameter, typed `CasStoreShape`
  (`VectorPrograms.ts:12` imports the type from `../../src/cas/Store.ts`,
  whose `put` is declared at `Store.ts:71-75`); the callee symbol resolves
  to that member; the argument's contextual type is `CasNodeInput`.
- **Document:**

```json
{ "instructions": [
    { "version": 0, "tag": 1, "payloadHex": "68656c6c6f2c20636173", "refs": [] }
] }
```

- **Word gate:** run the document under `referenceHandler`
  (`Handler.lean:77-91`) and the original under a recording store; both
  words are one binding; byte-equal ⇒ lift admitted. (Note the estate
  already runs this program live and asserts word agreement — slice 2,
  `EFFECTS-BACKEND.md:314-323` — so the leg exists.)

Answer-projection example from the same file
(`VectorPrograms.ts:28-29`, `blobTwoLeaves`):
`const a1 = yield* store.put({ …, refs: [{ id: a0, expectedTag: 8 }] })`
lifts to `{ …, "refs": [ { "expectedTag": 8, "source": 0 } ] }` — the
identifier `a0` is not content, it is a *hole* filled by projecting the
answer of instruction 0. The recognizer's job is exactly this index
resolution; a name with no earlier binder refuses `E-REF-UNBOUND`.

### 4.2 `verifyNodeBytes` — Effect.fn generator with host computation; refusal

`library/effects/src/cas/Store.ts:118-131`:

```ts
export const verifyNodeBytes = Effect.fn("CasStore.verifyNodeBytes")(
  function* (
    address: CasAddress,
    id: ContentId,
    bytes: Uint8Array,
  ): Effect.fn.Return<CasNodeInput, CasError> {
    const canonicalBytes = bytes.slice()
    const decodedNode = decodeCasNode(canonicalBytes)
    if (Option.isNone(decodedNode)
      || !bytesEqual(encodeCasNode(decodedNode.value), canonicalBytes)) {
      return yield* new NonCanonicalBytes({ id })
    }
    …
```

- **Tree-sitter evidence:** R-FN spine recognized (curried call, name
  literal `"CasStore.verifyNodeBytes"`); body statements: two plain `const`
  with non-yield initializers, an `if_statement`, `yield*` of a
  `new_expression`. No statement matches a v0 lift rule.
- **Compiler-API evidence:** confirms; typed register adds that
  `decodeCasNode` is a host function (not a signature operation) and the
  yield target is a tagged error (maps to `fail`).
- **Verdict: refusal**, multiply witnessed:
  `E-STMT-SHAPE` (host-computed consts — effect-free work that R14a-P1
  keeps *outside* `Prog` on the Lean side lives *inside* the body here),
  `E-BRANCH` (data-dependent `if` — beyond selective: the condition
  inspects run-time bytes), `E-ARG-DYNAMIC` (arguments are parameters, not
  literals). Histogram: this body is monadic-general. **Correct output** —
  this function is part of the store's *implementation* (a handler-side
  law, cf. the tower's `casOverBytes`,
  `library/cas/Cas/Lang/Tower.lean:108-133`), not a program over the store,
  and the taxonomy says so legibly.

### 4.3 `CanonicalSchema.get` — service accessor + pipe error mapping; refusal with classification

`library/effects/src/cas/CanonicalSchema.ts:336-347`:

```ts
  function* (id: ContentId) {
    const loader = yield* CasLoader
    const node = yield* loader.load(id)
    if (node.kind.tag !== KindTag) {
      return yield* new UnknownKind(node.kind)
    }
    …
```

- **Tree-sitter evidence:** `const loader = yield* CasLoader` — a yield of
  a *bare identifier*: the R-SVC accessor shape, cleanly queryable.
  `const node = yield* loader.load(id)` — a load whose argument is a
  parameter (dynamic). Then guarded refusals.
- **Compiler-API evidence:** `CasLoader` resolves to the
  `Context.Service` class (`Store.ts:67-69`); `loader.load` is
  `CasLoaderShape.load` (`Store.ts:57-61`) — so the *operation identity* is
  established statically even though the lift fails.
- **Verdict: refusal** `E-ARG-DYNAMIC` (the `id` hole is an input, not an
  earlier answer) + `E-BRANCH`. But the evidence is not wasted: the
  recognizer classifies the body as "CasSig-shaped with one free input" —
  exactly the shape that becomes liftable when F3 adds parameterized code
  tables. The taxonomy should carry this sub-code (`E-ARG-DYNAMIC/input`)
  so the histogram separates "dynamic because parameterized" (near-liftable)
  from "dynamic because computed" (not).

### 4.4 `layerStore` — layer wiring; classified, never lifted

`library/effects/src/cas/Store.ts:314-324`:

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

- **Tree-sitter evidence:** R-LAYER spine (`Layer.effectContext(…pipe(…))`);
  the type annotation's `union_type` of service names is CST-visible.
- **Compiler-API evidence:** the full `Layer.Layer<ROut, E, RIn>`
  instantiation — the wiring graph's typed edges.
- **Verdict:** not a program; classify as host machinery (R7: "hosts are
  code"). Emitting a "layer inventory" row (services provided/required) is
  useful R8-adjacent evidence, but it flows to the surface/ingestion lane,
  never to the program plane. Attempting to lift wiring as computation
  would cross the direction law (hoover ≠ execute,
  `.agents/skills/store-language/SKILL.md:60-67`).

### 4.5 (supplementary) `sharedChunk` — why the word, not the syntax, is the validator

`VectorPrograms.ts:67-70` puts the same chunk bytes twice (`a0` and `a2`
have identical arguments). Statically the document just repeats the
instruction; whether the second put is a fresh admission or an inert
duplicate is decided by the store's history, not the text
(`Handler.lean:79-86`: `.duplicate` answers the same address without
extending the word). No static register can see this — the run gate does,
and the Lean fixture asserts it binding-for-binding. This is the cleanest
argument that Tier-4 (word agreement) must gate admission (§10).

<a name="4b-wild-register"></a>
## 4b. The wild register: monorepo samples and adversarial variants

The estate's house style is the friendliest possible corpus. Operator
directive (2026-08-28, in-session): the reliability analysis must stand
against "random code as well, not just clean library effect." Two legs:
real samples from the Effect monorepo checkout
(`/Users/pooks/Dev/foldlab/.claude/worktrees/agent-a832c002de4e1234c/repos/effect`,
cited below as `effect-repo/…`; all inspected 2026-08-28), and
deliberately constructed adversarial variants. Every finding that forced a
design change is marked **⇒ design consequence**.

### 4b.1 Wild samples

**W1 — submodule namespace imports; yields in expression position.**
`effect-repo/packages/effect/test/Deferred.test.ts:1-14`:

```ts
import { Deferred, Fiber, Option } from "effect"
import * as Cause from "effect/Cause"
import * as Effect from "effect/Effect"
…
      Effect.gen(function*() {
        const deferred = yield* Deferred.make<number>()
        assert.isTrue(yield* Deferred.succeed(deferred, 1))
        assert.isFalse(yield* Deferred.succeed(deferred, 1))
        assert.strictEqual(yield* Deferred.await(deferred), 1)
```

- **T sees:** `import_statement`s with `namespace_import` — so the name
  `Effect` here is NOT the barrel import the house style uses but
  `effect/Effect`; the CST carries enough to resolve this *file-locally*.
  The `yield_expression`s at lines 12–14 sit inside `arguments` of
  `assert.*` calls — not in `variable_declarator value` position, so
  Rule 3 does not fire.
- **Cs sees:** the same; **Ct** additionally resolves `Effect.gen` to the
  same exported symbol regardless of import spelling.
- **Neither sees:** that `assert.isTrue` throwing is a host exception
  outside the effect plane entirely.
- **Verdict:** the operation-in-argument spelling is a real, pervasive
  wild register (three of four operations in this body). Refusal code
  minted for it: `E-YIELD-POSITION` (a yield outside a recognized binding
  or statement position), spectrum class `monadic` (the answer flows into
  a host call). **⇒ design consequence 1:** the callee whitelist cannot be
  a spelling (`["Effect","gen"]`); it must be an import-resolved
  (module, export) pair — §7.2 is amended accordingly (`OpRef`).

**W2 — pipe chains feeding yields; the yielded answer used as a callee.**
`effect-repo/packages/effect/test/Schedule.test.ts:86-97`:

```ts
        const left = Schedule.identity<string>().pipe(
          Schedule.upTo({ times: 2 }),
          Schedule.map(({ output }) => `left:${output}`)
        )
        …
        const step = yield* Schedule.toStep(Schedule.concat(left, right))

        const first = yield* step(0, "a")
```

- **T/Cs see:** `const left = …pipe(…)` — a non-yield const (host
  computation, `E-STMT-SHAPE` under Rule 9); `const step = yield* …` — a
  yield of a whitelistable-shaped call whose argument is a computed value
  (`E-ARG-DYNAMIC/computed`); then `yield* step(0, "a")` — the callee is a
  *previous answer*.
- **Ct sees:** that `step`'s type is a function returning an Effect — a
  higher-order answer.
- **Verdict:** refusal, with a code of its own: `E-ANSWER-HIGHER-ORDER`
  (an earlier answer used as an operation), spectrum class `monadic` —
  this is exactly the shape R4/F3 excludes from first-order documents (no
  binder metatheory, no function-valued answers). The histogram must
  separate it from plain `E-ARG-DYNAMIC` because it is *never* closable by
  manifest growth.

**W3 — answers laundered through destructuring; applicative bundles.**
`effect-repo/packages/effect/test/Effect.test.ts:754` and
`effect-repo/packages/effect/test/LogLevel.test.ts:16-21`:

```ts
        const [excluded, satisfying] = yield* Effect.partition(values, Effect.succeed)
```

```ts
      Effect.gen(function*() {
        const [debugEnabled, warnEnabled, errorEnabled] = yield* Effect.all([
          LogLevel.isEnabled("Debug"),
          LogLevel.isEnabled("Warn"),
          LogLevel.isEnabled("Error")
        ]).pipe(Effect.provideService(References.MinimumLogLevel, "Warn"))
```

- **T sees:** `variable_declarator name: array_pattern` (node-types.json
  lists `array_pattern` as a legal `name` — inspected 2026-08-28), i.e.
  Rule 3's `name: identifier` correctly does not fire.
- **Ct sees:** the tuple element types.
- **Verdict:** refusal `E-BIND-SHAPE` (destructured binder). Note the
  LogLevel body is genuinely *applicative* — `Effect.all` of a literal
  array is the applicative bundle the linearization frame says is
  liftable — so `E-BIND-SHAPE` carries spectrum class `applicative-gap`,
  and an `Effect.all`-bundle rule is the named v1 candidate that would
  convert this refusal into a lift. The `.pipe(provideService(…))` tail,
  however, is environment surgery: even v1 refuses the pipe tail
  (`E-SPINE-ESCAPE`).

**W4 — helper-wrapped generators with type parameters, `as`-casts, and
closure-mutating finalizers.**
`effect-repo/packages/effect/src/internal/rcRef.ts:140-149`:

```ts
export const get = Effect.fnUntraced(function*<A, E>(
  self_: RcRef.RcRef<A, E>
) {
  const self = self_ as RcRefImpl<A, E>
  const state = yield* getState(self)
  const scope = yield* Effect.scope
  …
  yield* Scope.addFinalizerExit(scope, () => {
    state.refCount--
```

- **T sees:** the R-FN-like curried spine but with callee `fnUntraced`
  and a `generator_function` carrying `type_parameters`; a
  non-literal-arg yield (`getState(self)`); a bare-identifier-ish yield
  (`Effect.scope` — an operation with NO arguments spelled as a member
  access, not a call); a yield whose argument contains an arrow closure
  that mutates captured state.
- **Cs/Ct:** same shapes; Ct resolves `fnUntraced` and sees the
  finalizer's type.
- **Verdict:** refusals `E-OP-UNKNOWN` (helper `getState`),
  `E-ARG-DYNAMIC/computed`, `E-ARG-CLOSURE` (a function-valued argument —
  minted: distinct from `E-ARG-DYNAMIC` because no constant propagation
  could ever close it), and a *classification* finding: property-access
  operations without call syntax (`yield* Effect.scope`) are a real wild
  spelling the pattern algebra must be able to name (an `SPat.opAccess`
  case) even though v0 only refuses it.

**W5 — interleaved mutable host state.**
`effect-repo/packages/effect/test/Deferred.test.ts:19-23`:

```ts
        let value = 0
        const complete = Effect.sync(() => {
          value += 1
          return value
        })
```

- **All static registers see** the `let` (a `lexical_declaration` with
  kind `let` — Rule 3 requires `const`) and the closure.
- **Verdict:** `E-STMT-SHAPE` + `E-ARG-CLOSURE`. Nothing recoverable;
  correct refusal. This body is the recording handler's territory in its
  purest form — the effect (`Effect.sync`) exists only to smuggle host
  mutation.

### 4b.2 Constructed adversarial variants

Each constructed (marked so; not repo code), with what every instrument
sees and where recognition must refuse.

**A1 — aliased import.** `import { Effect as E } from "effect"` then
`E.gen(function* () { const a0 = yield* store.put({…}) … })`.
- T: resolvable file-locally — the `import_specifier` carries
  `name: Effect, alias: E`; the generated walker must consult the import
  table before matching `OpRef`s. Cs: same. Ct: trivially resolved.
- Must NOT refuse: this is a legal spelling of a liftable program.
  A spelling-keyed recognizer would wrongly refuse it — the concrete
  failure D1-style pattern matching would produce. This variant is the
  regression test for design consequence 1.

**A2 — operation behind a local helper.**
`const putNode = (s: CasStoreShape, n: CasNodeInput) => s.put(n)` then
`const a0 = yield* putNode(store, {…})`.
- T/Cs: unknown callee → `E-OP-UNKNOWN`. Ct: sees `putNode`'s *type* is
  `Effect<ContentId, CasError>` — type-compatible with an operation — but
  the operation identity is not syntactically established, and inlining
  helpers is interprocedural analysis the trusted seam must not grow.
- Must refuse (`E-OP-UNKNOWN`), even though a run would word-agree. This
  is the sharpest tier lesson: **W without static operation identity has
  no document to validate** — the word gate validates a candidate, it
  cannot conjure one. Wild-corpus recall is bounded by the whitelist, by
  design.

**A3 — answer laundering through destructuring.**
`const [x] = yield* Effect.all([store.put(n)])`, later `refs: [{ id: x, … }]`.
- T/Cs: `array_pattern` binder → `E-BIND-SHAPE` (per W3). Ct: element
  type is `ContentId`.
- Must refuse in v0; the v1 `Effect.all`-bundle rule may admit it with
  index projection through the tuple — at which point `answerRef`
  resolution must follow destructuring positions, a real growth of the
  binder environment that lands only with its own twin-checked rules.

**A4 — constants interleaved and folded.**
`const payload = "68656c6c6f2c20636173"` then
`const a0 = yield* store.put({ …, payload: hex(payload), refs: [] })`.
- T/Cs: the non-yield const is `E-STMT-SHAPE` under Rule 9; the `hexArg`
  pattern sees an identifier, not a string literal → `E-ARG-DYNAMIC`.
- v0 must refuse. Constant propagation would close it — and is refused as
  a v0 feature deliberately: every folding step is recognizer-side
  computation whose wrongness produces a *plausible but different*
  document, the worst failure mode (see D5's counterargument; a wrong
  document can still run green against a harness store on small words).
  If the histogram shows this pattern dominating wild corpora, constant
  folding becomes a named, separately-gated v1 rule — never a silent
  widening.

**A5 — comments and formatting inside chains.**
`const a0 = yield* store.put({ /* node */ kind: { version: 0, tag: 1 }, // …
  payload: hex("…"), refs: [] })`.
- T: comments are `extras` in the grammar (grammar-authoring guide,
  observed 2026-08-28) — patterns and fields are untouched; byte ranges
  consumed by the rule simply include comment bytes. Cs: trivia likewise
  skipped.
- Must NOT refuse; and because the extracted DOCUMENT carries no spelling
  (indexes and hex only), the L2 twin byte-identity comparison is immune
  to formatting by construction. This is the one adversarial axis that is
  a non-problem, and it is worth saying why: the comparison target is the
  document, never the source bytes.

### 4b.3 What the wild leg changes

1. **`OpRef`, not spelling** (§7.2 amended): operations and combinators
   are whitelisted as (module, export) pairs — e.g.
   (`effect`, `Effect.gen`), (`effect/Effect`, `gen`) unified by the
   package's export map, and (`CasStoreShape`, `put`) as a *typed* member
   ref — resolved through the file's import table by BOTH instruments,
   file-locally for T, symbol-table for Cs/Ct. Twin comparison covers the
   resolution: if T's file-local resolution and Cs's disagree (re-exports,
   `export * from`), that is `E-INSTRUMENT-DISAGREE`, surfaced — T cannot
   see through cross-file re-export chains and must refuse
   `E-IMPORT-OPAQUE` rather than guess (named tree-sitter limit).
2. **New refusal codes** (folded into §8/§9.4): `E-YIELD-POSITION`,
   `E-ANSWER-HIGHER-ORDER`, `E-BIND-SHAPE`, `E-ARG-CLOSURE`,
   `E-IMPORT-OPAQUE`, and the `E-ARG-DYNAMIC/{input,computed}` split
   (§4.3).
3. **Tier justification against the wild leg** (§10 relies on this):
   W1/A1 show Ct is what makes callee identity trustworthy under
   aliasing — hence Ct mandatory wherever a build exists; W2/W4 show T
   and Cs agree on *refusals* only if the taxonomy is shared verbatim —
   hence identical-refusal in the L2 contract; A2 shows W cannot
   substitute for static identity — hence W gates *validation*, never
   *recognition*; A4/A5 show why the twin comparison targets documents,
   not source bytes.
4. **Expected histogram shape** (SPECULATION, to be measured): on
   `effect-repo/packages/effect/test/**`, `E-YIELD-POSITION` and
   `E-ARG-CLOSURE` dominate; straight-line lift rate near zero; the
   `applicative-gap` bucket (W3-shaped `Effect.all` bundles) is the
   largest recoverable class. The measurement is the deliverable either
   way.

<a name="4c-posture"></a>
## 4c. Recognition posture: Effect-only vs TypeScript+Effect jointly

Two postures the DSL could take (operator-directed comparison,
2026-08-28, in-session):

- **Posture A — Effect-only.** The manifest's patterns target just the
  Effect op spine: gen bodies, `yield*` ops, the curried wrappers, pipe
  chains, combinator calls, node literals. All surrounding TypeScript is
  opaque: any statement or expression outside the spine rules is simply
  "unmatched" and Rule 9 refuses it with a range.
- **Posture B — TypeScript+Effect jointly.** The manifest additionally
  models the TS-level patterns the ops are embedded in: destructuring of
  answers (`array_pattern`/`object_pattern` binds), const assertions and
  `satisfies`, generic instantiation, type narrowing, control-flow
  constructs (`if`/ternary/loops as *modeled* shapes, not just refusals),
  helper-function boundaries (local inlining), template literals and
  constant expressions in argument position.

The governing principle comes from the estate's own pure discipline
(R14a-P1, `EFFECTS-BACKEND.md:270-277`): the word observes operations and
their arguments; pure computation between ops is semantically load-bearing
ONLY where it (i) plumbs earlier answers into later op arguments, (ii)
constructs op arguments, or (iii) determines control flow that decides
which ops run. Every other TS-level fact — `satisfies`, generic
instantiation, narrowing — is fidelity about the TYPE plane: evidence
(the Ct register), never document content. Posture B's value must be
audited against that line, example by example.

### 4c.1 Per-example audit

| Example | What B recovers that A cannot | Load-bearing for the word? | Verdict |
|---|---|---|---|
| §4.1 `valueSingle` (clean, emitted) | nothing — A lifts it fully | — | A suffices; B adds zero |
| §4.2 `verifyNodeBytes` | models the host consts and the data-dependent `if` — finer refusal codes, richer classification | no: the branch inspects run-time bytes; no static posture reaches the ops behind it | refusal either way; B buys histogram precision only |
| §4.3 `CanonicalSchema.get` | models the parameter hole (`id`) and the kind-tag narrowing — recognizes the *selective*, parameterized shape | yes, LATER: this is exactly F3's code-table shape; today no document exists to carry it | A refuses; B classifies as near-liftable — worth having as classification, not lift |
| §4.4 `layerStore` | generic instantiation → richer host-machinery inventory | no: never a program | B feeds the R8/surface lane, not libfree's core |
| W1 `Deferred.test` (yield-in-argument) | an ANF-style rewrite could hoist `yield*` out of `assert.isTrue(…)` and recover the op ORDER | **partially — and unsoundly**: the interleaved `assert.*` calls can throw, truncating the recorded run; a document that drops them is NOT faithful (word divergence on failing asserts) | the flagship false-positive risk: B's most tempting recovery is wrong. Refuse (`E-YIELD-POSITION`) in any posture |
| W2 `Schedule.test` (answer-as-callee) | pipe-stage modeling classifies the chain | no: higher-order answers are permanently outside first-order documents (R4) | refusal either way |
| W3 `Effect.all` + destructuring | **a real lift**: the bundle is applicative, the `array_pattern` positions are answer plumbing that feeds later `refs` | **yes** — this is (i), answer plumbing, squarely load-bearing | the strongest case FOR a B rule; scoped, decidable, twin-checkable |
| W4 `rcRef.get` (helper boundary) | inlining `getState` would expose one more op | yes in principle, but interprocedural: the trusted seam grows without bound | refuse; helper inlining rejected in any posture |
| A4 (constant folding) | folds `payload` into the literal — a lift A refuses | **yes** — this is (ii), argument construction | admissible ONLY as a named, separately-gated B rule; wrong folding yields plausible-but-different documents |
| A5 (comments/formatting) | nothing — A is already immune | — | non-problem in both |

### 4c.2 What posture B costs

- **Fragment size.** A's pattern algebra is ~11 constructors over ~15
  stock node types (§5.1's table). B pulls in `array_pattern`,
  `object_pattern`, `ternary_expression`, `if_statement`,
  `template_string`, `as_expression`, `satisfies_expression`,
  binary/property chains for folding — tens of additional node types from
  the 324-type inventory, each needing twin-identical treatment in BOTH
  generated recognizers. The manifest roughly triples.
- **Drift exposure.** A's spine is old, stable syntax (generators,
  calls, object literals — stable across every modern TS). B's additions
  are TypeScript's fastest-moving edge: `satisfies` (TS 4.9), const type
  parameters (5.0) — both younger than the pinned grammar's defect zone,
  exactly where grammar revisions and compiler versions churn (§6, §12).
  Every B pattern widens the surface the pins must track.
- **False-positive risk.** A cannot produce a wrong document — it can
  only refuse too much (recall loss, never precision loss). Every
  B-recovery is recognizer-side *computation* (rewriting, folding,
  projecting) whose bugs produce documents that are wrong yet plausible —
  and W1 shows a B rewrite that is semantically wrong even when correctly
  implemented. The word gate catches divergence per-run, but only on the
  store the harness supplies; precision loss is strictly worse than
  recall loss under this architecture.
- **Grammar complexity.** For the tree-sitter leg specifically: A needs
  no custom grammar and only fielded walks; B's control-flow and folding
  patterns push toward semantic analysis the CST cannot carry, dragging
  the instrument toward being a second compiler — the exact asymmetry the
  twin discipline exists to prevent.

### 4c.3 Ruled recommendation: a layered DSL

**Posture A is the core, at every tier; posture B enters as three named,
individually-gated rule-pack layers** (a `layer` field on `RecRule`,
§7.2):

| Layer | Content | Tier ceiling |
|---|---|---|
| **core** (posture A) | the §8 spine rules | L4 — may mint and validate documents |
| **B-plumb** | answer plumbing with a first-order reading: `Effect.all` literal bundles + destructuring projection (W3/A3) | L4, but only after the pack's own twin + word validation on a dedicated fixture corpus; OFF by default until then |
| **B-args** | argument normalization: constant folding of literal consts, template-literal concatenation (A4) | L2 ceiling (candidate only) until a per-rule ruling promotes it; every fold records its provenance in the evidence document |
| **B-class** | classification-only TS patterns: branches, helper boundaries, `satisfies`/generic facts (§4.2/§4.3/§4.4) | never mints document content; feeds the histogram and the Ct register |

Type-plane facts stay OUT of the pattern algebra entirely — they are the
Ct register's testimony (§10), attached to evidence, never to documents.
The wild leg's finding stands: B-plumb is the only layer with proven
lift-recovering value on real code, and W1 is the standing exhibit for
why every other B recovery must clear its own gate rather than ride in on
the core's trust. The layering question is on the grill list as D8.

<a name="5-tree-sitter-heuristics"></a>
## 5. Tree-sitter parsing heuristics

Grounding: the grammar-authoring guide
(https://tree-sitter.github.io/tree-sitter/creating-parsers/3-writing-the-grammar.html,
observed 2026-08-28) and query syntax/operators pages
(https://tree-sitter.github.io/tree-sitter/using-parsers/queries/1-syntax.html
and …/2-operators.html, observed 2026-08-28); the pinned grammar's
machine-readable inventory
(`.staging/treesitter/clones/tree-sitter-typescript/typescript/src/node-types.json`,
324 node types, 7 supertype unions: `declaration`, `expression`, `pattern`,
`primary_expression`, `primary_type`, `statement`, `type` — counted by jq,
2026-08-28).

### 5.1 What is robust as queries over the stock grammar

The straight-line fragment's every construct has a *fielded* CST spelling —
the stock grammar names exactly the child positions the lift needs
(node-types.json, all inspected 2026-08-28):

| Recognition | Node types and fields the query binds |
|---|---|
| const binding | `lexical_declaration` (field `kind` = anonymous `"const"`) → `variable_declarator` (fields `name`, `type?`, `value`) |
| yield* | `yield_expression` with anonymous child `"*"` (no field; matched as a quoted token, per the anonymous-node query rule — query-syntax page, observed 2026-08-28) |
| operation call | `call_expression` (fields `function`, `arguments`, `type_arguments?`) with `function: member_expression` (fields `object`, `property`, `optional_chain?`) |
| node literal | `object` → `pair` (fields `key`, `value`); `array`; `string`; `number` |
| exact arity | the anchor operator `.` — `(arguments . (object) .)` means exactly one named child (operators page, observed 2026-08-28) |
| return of word | `return_statement` (optional `expression` child) → `array` of `identifier`s |
| gen spine | `call_expression(function: member_expression)` over `generator_function` (fields `body`, `parameters`, `return_type?`, `type_parameters?`) |
| Effect.fn spine | `call_expression(function: call_expression(…))` — the curried shape |

These are stable, fielded, and shallow — precisely the "intuitive
structure, designed for analyzability" property the grammar-authoring guide
names as tree-sitter's design goal (observed 2026-08-28). Recognition
should bind ONLY named fields and supertypes, never positional children of
unfielded nodes, so grammar-internal refactors don't silently shift
matches.

### 5.2 The existential/universal gap — the central heuristic

Tree-sitter queries are **existential**: a query enumerates places where a
pattern matches. Admission is **universal**: *every* statement of the body
must match some rule, in order, with nothing left over. The query language
has no complement ("no other statement exists") and its quantifiers/anchors
cannot express "this list of children is exactly a permutation-free
sequence of rule matches" across rule alternatives.

Consequence, and the proposal's core tree-sitter recommendation: **the
tree-sitter instrument is a generated WALKER (field-directed CST
traversal), and the `.scm` queries are a generated projection** used for
tooling, editor highlighting of matches, and quick corpus scans — never as
the admitting judgment. This is also what the estate has already admitted:
the twin instrument drives raw FFI field access
(`ExtractTwin.lean:133-160`, `childByFieldName`/`namedChild` walks) and no
query-engine use is part of its admission; the generated walker inherits
that trust position unchanged. The walker computes the *partition
judgment*: statements consumed exactly once, in order, else
`E-STMT-SHAPE` naming the first unconsumed range.

A second engine-level reason points the same way: query predicates
(`#eq?`, `#match?`) are implemented by the host binding, not the core
library, so a `.scm`-driven twin would put the predicate engine inside the
trusted seam. The generated walker keeps the seam at the C FFI where it
already is.

### 5.3 Error recovery and the ERROR-disjointness discipline

Tree-sitter recovers from parse errors by inserting `ERROR` and
zero-width `MISSING` nodes and continuing — a strength for editors, a trap
for extraction: recovered structure NEAR an error can be silently wrong.
The estate's discipline is already the right one and should be inherited
verbatim: collect every ERROR/MISSING range and refuse if any intersects a
byte range the recognizer consumed (`assertErrorsDisjoint`,
`ExtractTwin.lean:518-523`). The refinement this proposal adds for
program lifting: the consumed range of a candidate program is the WHOLE
exported declaration, not just matched sub-nodes — a recovered error
*inside* the generator body must refuse (`E-CST-ERROR`) even if every
individually matched statement parses cleanly, because recovery may have
resynthesized statement boundaries. Queries `(ERROR)`/`(MISSING)` exist
(query-syntax page, observed 2026-08-28) but the walker computes the
ranges directly, as the twin does today.

### 5.4 Custom "Effect spine" grammar — when it would win, and why it loses here

The tempting move: author an external tree-sitter grammar for an "Effect
spine" sublanguage (const-yield-op statements, node literals, return-word)
so the parser itself enforces the fragment and the CST *is* the document.

Where it genuinely wins:
- Parsing a **closed corpus**: the emitted fragment
  (`VectorPrograms.ts`) is a closed language (fixed by
  `Cas/Backend/Ts.lean` + `EmitProg.lean:30-36`), so a custom grammar over
  exactly that fragment would be small, conflict-free, LR(1)-clean per the
  authoring guide's design advice (observed 2026-08-28), and would make
  parse-back (R6's printer obligation, `EFFECTS-BACKEND.md:100-105`) a
  single instrument with grammar-level totality.
- Grammar-level refusal: anything outside the fragment fails to parse —
  fail-closed by construction.

Why it is a mistake for **recognition over wild TypeScript**:
1. A sublanguage grammar pointed at a real `.ts` file mangles everything
   outside the sublanguage into ERROR soup, destroying the
   ERROR-disjointness signal — refusals stop being *named* (which rule,
   which range) and become "did not parse," the opposite of the taxonomy
   mandate.
2. It forks the syntax authority: TypeScript's lexical layer (template
   strings, regex-vs-divide, ASI) is exactly the hard part the stock
   grammar and the compiler API already agree on; a third lexer is a third
   opinion inside the trusted seam.
3. It breaks the twin symmetry: the compiler API parses TypeScript; the
   cross-check must parse the SAME language or byte-identical inventory
   comparison (the twin's contract, `ExtractTwin.lean:10-15`) is
   meaningless.
4. Grammar drift doubles: the estate would pin and re-admit two grammars.

**Recommendation:** no custom grammar for recognition. Reconsider a custom
fragment grammar later, only as a *third falsifier for the closed emitted
fragment* (a parse-back gate on generated files), where its closed-corpus
strengths apply and its wild-corpus weaknesses are irrelevant. Priority:
low; the generated walker + compiler API already give two independent legs
there.

<a name="6-in-e-defect"></a>
## 6. The `<in E>` defect and its remediation

The defect, held honestly by the twin: the pinned grammar
(tree-sitter-typescript rev `75b3874edb2dc714fb1fd77a32013d0f8699989f`,
over vendored core v0.24.7, via lean4-tree-sitter v0.2.4 —
`ExtractTwin.lean:4-8`) cannot parse the `<in E>` variance annotation;
`Filter`/`FilterGroup` produce two 1-byte ERROR nodes
(`ExtractTwin.lean:16-19`). Structural confirmation from the pinned
inventory: the `type_parameter` node type declares fields `constraint`,
`name`, `value` ONLY — no variance-modifier position exists in this
grammar revision (node-types.json, inspected 2026-08-28). And the blast
radius is known: five of eight affected classes in Effect's own SCHEMA
machinery carry variance annotations, so R8 ingestion over that surface
will refuse on the twin by design
(`library/cas/EFFECTS-BACKEND.md:243-248` — the ruling explicitly defers
the remediation decision to when ingestion lands, "not silently").

**Option A — grammar pin upgrade.** Adopt a tree-sitter-typescript
revision whose grammar accepts variance modifiers, re-vendor, re-admit.
- For: it is the honest fix — the estate's own ingestion targets (Effect's
  schema machinery) are inside the defect's blast radius, so a carve-out
  would exempt exactly the modules where the cross-check matters most; the
  re-admission procedure exists (the twin's byte-identical inventory
  contract IS the re-admission gate: run both instruments over the pinned
  corpus, diff); node-inventory drift is machine-diffable (`node-types.json`
  is committed and checkable).
- Against: a new pin invalidates the current 324-type inventory analysis;
  every generated walker and query must be re-validated against the new
  `node-types.json` (field additions are usually additive, but the estate
  should verify, not assume — the upgrade lands as a red-gate regeneration,
  never a quiet bump); lean4-tree-sitter's vendoring couples the grammar
  pin to the binding pin, so the upgrade may require a binding release.

**Option B — compiler-API-only carve-out.** Rule specific modules (the
variance-carrying ones) as single-instrument, recorded per-module.
- For: zero toolchain motion; the compiler API parses `<in E>` today; the
  carve-out is small and enumerable.
- Against: it breaks the two-instrument discipline exactly where Effect's
  most identity-critical surface lives; a "temporary" trust asymmetry
  recorded per-module is the kind of standing exception that quietly
  becomes architecture; and for *libfree recognition* (this proposal's
  concern, distinct from R8 ingestion) variance annotations appear in the
  service/schema *declaration* registers (R-SVC, R-SCHEMA) that
  recognition must at least classify — so the defect is not confined to
  ingestion.

**Recommendation: A, sequenced before libfree's first corpus run**, with B
as an explicit, dated bridge only if the binding-release dependency stalls:
carve-out rows name their modules, cite this defect, and carry an expiry
condition (the pin upgrade), so the exception cannot outlive its cause.
Because the DSL (§7) generates the walker from the manifest, the upgrade
cost is re-running generation + gates, not hand-porting matchers — this is
a designed-for property, and it is the strongest practical argument for
the manifest architecture itself.

<a name="7-the-dsl"></a>
## 7. The DSL: the recognition manifest made concrete

### 7.1 Reconciliation with the no-new-text-format law

Grammar-grill ruling 6 (cited in `EFFECTS-BACKEND.md` R4/R2 context as the
consumer-gating/grammar rulings; the constraint as given: *no new text
format may be minted per grammar-grill ruling 6*). The DSL therefore has
**no surface syntax of its own**:

- **Carrier:** recognition rules are FIRST-ORDER DATA — R14 stratum 1
  citizens: `DecidableEq`, hashable, addressable, store-admissible.
- **Authoring surface:** Lean declarations (`cas_struct` values and
  inductive terms in `library/cas/Cas/…`), exactly how the MCP tool table
  is authored (`Mcp.lean:31-93`). Lean notation IS the input surface; no
  parser for a rule language is ever written.
- **Interchange:** one versioned, language-neutral manifest document —
  canonical-JSON, rendered by the estate's own `Cas.Json.render`, emitted
  by a `lake exe recognitionspec` under the byte-identity gate, exactly the
  `cas-tools.json` pattern (`Mcp.lean:105-118`;
  `.agents/skills/backend-materialize/SKILL.md:15-27`). Both recognizers
  are generated from this document (R11: one described manifest, both
  surfaces generated, never written twice).

Honest carrier caveat: the canonical schema v0 has no union constructor
(`CanonicalSchema.ts:26-28` defers `union` by name; the v0 `Ast` set is
Null/Boolean/Integer/String/Literal/Array/Struct/Ref,
`CanonicalSchema.ts:109-119`). A pattern algebra is a sum type. Two lawful
encodings exist today: (i) tagged records in canonical JSON — the exact
discipline the schema plane uses for its own AST (`AstSchema`,
`CanonicalSchema.ts:136-155`, and the schema node payloads are literally
`{"_tag": …}` JSON); (ii) wait for the union constructor. Recommendation:
(i) now — the manifest is a described *document* whose pattern fields are
tagged canonical-JSON values, with "describe the pattern sum canonically"
named as a follow-up that lands with the schema commission's `union`.
This is a grill decision (D2).

### 7.2 The data model

Three layers, all data. (Lean sketches; field lists are the proposal.)

**Layer 1 — the spine pattern algebra.** Instrument-neutral patterns over
a small abstract surface both instruments can project TypeScript into:

```lean
/-- An import-resolved operation reference (wild-leg consequence,
§4b.3): whitelisting is by (module, export) or (type, member), NEVER by
local spelling — `import { Effect as E }` and `import * as Effect from
"effect/Effect"` are the same OpRef. Both instruments resolve through
the file's import table; T refuses `E-IMPORT-OPAQUE` on cross-file
re-export chains it cannot see. -/
cas_struct OpRef where
  module : String        -- "effect" | "effect/Effect" | "" for typed members
  export : String        -- "Effect.gen" | "gen" | "put"
  viaType : String       -- "" | "CasStoreShape" (typed-member receiver)

/-- Spine patterns — first-order, no functions (R14 stratum 1).
Encoded as tagged canonical-JSON records (§7.1 caveat). -/
inductive SPat where
  | intLit   (role : String)                    -- a literal integer, captured
  | strLit   (role : String)                    -- a literal string, captured
  | hexArg   (role : String)                    -- hex("…"), string captured
  | ident    (role : String)                    -- an identifier name, captured
  | answerRef (role : String)                   -- identifier that MUST resolve
                                                --   to an earlier binder (index)
  | call     (callee : OpRef) (args : List SPat)
  | opAccess (callee : OpRef)                   -- argument-less op spelled as
                                                --   member access (W4: Effect.scope)
  | obj      (fields : List (String × SPat)) (closed : Bool)
  | arr      (item : SPat) (role : String)      -- homogeneous array, captured
  | constYield (var : String) (rhs : SPat)      -- const <var> = yield* <rhs>
  | retArray (role : String)                    -- return [i0 … iN]
```

Design points: `closed := true` on `obj` means *no other properties* — the
universal side the walker checks (queries cannot); `answerRef` is the
answer-projection hole — the recognizer resolves the name against the
body's binder environment and emits an INDEX, so the document never
contains a name (model spelling dies at the boundary, R15's acquisition
loop, `EFFECTS-BACKEND.md:292-301`).

**Layer 2 — rules and binding.** A rule marries a pattern to its document
production and its refusals:

```lean
cas_struct BindField where
  role : String          -- an SPat capture role
  target : String        -- a RunInstruction field path, e.g. "tag", "refs[].source"

cas_struct RecRule where
  name : String          -- e.g. "const-yield-put"
  register : String      -- the §3 register it serves, e.g. "R-GEN"
  layer : String         -- "core" | "B-plumb" | "B-args" | "B-class" (§4c.3)
  scope : String         -- "statement" | "declaration" | "expression"
  pattern : Json         -- the SPat, tagged canonical JSON
  binds : List BindField
  refusals : List String -- taxonomy codes this rule's guards may emit
  enabled : Bool         -- rule packs ship OFF until their gate clears
```

**Layer 3 — the manifest.** Versioned, with the pins that make evidence
reproducible:

```lean
cas_struct RecognitionManifest where
  manifestVersion : SafeInt
  language : String                    -- "cas-libfree"
  grammarPin : String                  -- tree-sitter-typescript rev
  grammarInventoryDigest : String      -- digest of node-types.json
  compilerPin : String                 -- typescript version
  effectPin : String                   -- effect package version
  rules : List RecRule
  refusalTaxonomy : List RefusalEntry  -- code, description, spectrum class
```

`RefusalEntry.spectrumClass ∈ {applicative-gap, selective, monadic,
instrument, classification}` — so the histogram (§10.4) rolls up to the
linearization spectrum without re-interpretation.

### 7.3 What gets generated from the manifest (R11 discipline)

| Target | Form | Gate |
|---|---|---|
| (a) tree-sitter leg | a generated **Lean walker** (field-directed FFI traversal in the `ExtractTwin` idiom) + generated `.scm` query file as a tooling projection | byte-identity on both generated files; walker output cross-checked per §10 |
| (b) compiler-API leg | a generated TypeScript recognizer module (`ts.Node` matchers, one function per rule + the partition driver) | byte-identity; recognizer output cross-checked per §10 |
| (c) refusal taxonomy | generated enum/schema on both sides + the manifest's own `refusalTaxonomy` JSON | byte-identity; codes shared verbatim, so the twin comparison covers refusals too — **both instruments must refuse identically**, not just match identically |

The twin contract extends the Stage-1 one: byte-identical *evidence
documents* (recognized document candidates AND refusal lists), instrument
self-identification fields exempted — the same shape as
`ExtractTwin.lean:10-15`.

<a name="8-example-rules"></a>
## 8. Example rules

Nine rules covering the straight-line fragment (v0 whitelist) plus the
named refusal producers. Patterns shown in the Lean notation surface;
capture roles in `⟨⟩` comments.

**Rule 1 — `program-decl` (scope: declaration).** An exported const arrow
whose sole parameter is the store and whose body is `Effect.gen` of a
generator:
`call(OpRef("effect","Effect.gen"), [generator(body)])` under
`export const ⟨name⟩ = (⟨store⟩: CasStoreShape) => …` — the callee
import-resolved per §4b.3, so `E.gen` and `effect/Effect` spellings match.
Binds: program name; the store binder name (becomes the ONLY legal callee
receiver in the body — receiver identity is *bound*, not hard-coded, so
α-renaming the parameter is admitted). Refusals: `E-SPINE-ESCAPE` (the
gen value is piped/stored instead of returned), `E-PARAM-SHAPE`.

**Rule 2 — `fn-decl` (scope: declaration).** The R-FN alternative spine:
`call(call(["Effect","fn"], [strLit ⟨traceName⟩]), [generator(body)])`.
Same body rules; `traceName` is recorded as provenance, never identity.

**Rule 3 — `const-yield-put` (scope: statement).** The workhorse:

```lean
SPat.constYield "a" (.call (OpRef.typedMember "CasStoreShape" "put") [nodeLiteral])
```

(the receiver must be the identifier Rule 1 bound as the store parameter;
its member identity is the typed `OpRef`, confirmed by Ct where available)

Binds: binder name → the instruction's index (dense order); the node
literal via Rule 4. Refusals: `E-OP-RECEIVER` (receiver ≠ the bound store
parameter), `E-OP-UNKNOWN` (property ≠ a signature operation).

**Rule 4 — `node-literal` (scope: expression).** The closed node object:

```lean
SPat.obj [
  ("kind",    .obj [("version", .intLit "version"), ("tag", .intLit "tag")] (closed := true)),
  ("payload", .hexArg "payloadHex"),
  ("refs",    .arr refEntry "refs")
] (closed := true)
```

Binds: `version`, `tag`, `payloadHex` → `RunInstruction` fields
(`Mcp.lean:37-42`). Refusals: `E-ARG-DYNAMIC` (any non-literal in a
captured position — a computed tag, a spread, a variable payload),
`E-NODE-SHAPE` (missing/extra keys; `closed` violation).

**Rule 5 — `answer-ref` (the argument hole; scope: expression).**

```lean
def refEntry : SPat :=
  .obj [("id", .answerRef "source"), ("expectedTag", .intLit "expectedTag")] (closed := true)
```

`answerRef` resolves the identifier against earlier Rule-3 binders and
emits the INDEX (`RunRef.source`, `Mcp.lean:31-35`). Refusals:
`E-REF-UNBOUND` (no such binder), `E-REF-FORWARD` (binder appears later —
impossible in a well-scoped body but checked anyway: fail-closed means the
checker owns the invariant, not the host language).

**Rule 6 — `return-word` (scope: statement, must be final).**
`SPat.retArray "word"` where the array must list EXACTLY the Rule-3
binders, in binding order, dense. Refusals: `E-RETURN-SHAPE` (omissions,
reordering, extra expressions). Rationale: the return IS the word's
projection; a program that answers a permutation is a different document.

**Rule 7 — `hex-helper` (scope: declaration, per-file).** The `hex`
helper must byte-match the pinned form (`VectorPrograms.ts:14-16`) or be
imported from an admitted module. This keeps `hexArg` honest: the DSL
treats `hex("…")` as a byte literal ONLY because the helper is pinned.
Refusal: `E-HELPER-UNPINNED`.

**Rule 8 — `const-yield-load` (scope: statement; reserved).**
`constYield "n" (.call ⟨["‹store›","load"]⟩ [.answerRef "source"])` — a
load of an earlier answer. Present in the manifest from v0 with
`enabled := false` until the document schema grows a load instruction
(today's `RunInstruction` is put-only): rules are data, so capability
growth is a manifest revision, not new code. Refusal while disabled:
`E-OP-UNKNOWN/load-not-yet-documented` (its own histogram bucket — we
should know how often wild code would have lifted but for this).

**Rule 9 — `body-partition` (scope: body; the universal rule).** Every
statement of the generator body matches exactly one enabled statement
rule; statements are consumed in order; the final statement is Rule 6.
This rule has no pattern — it is the walker's driver, declared in the
manifest so both instruments implement it identically. Refusal:
`E-STMT-SHAPE(range)` naming the first unconsumed statement's byte range.

**Refusal-only rules** (patterns that exist to classify, feeding the
histogram): `if`/ternary/`Option.match` in statement position →
`E-BRANCH` (spectrumClass `selective` when both arms would lift,
`monadic` otherwise — the recognizer attempts the arms); loops /
`foldlM`-shaped recursion → `E-LOOP`; `try`/`catch`/`Effect.catch*` →
`E-HANDLER`; `yield* new ⟨TaggedError⟩(…)` → classified as `fail`
(liftable in principle — `Ops.lean:54-57` — but v0 refuses
`E-FAIL-NOT-DOCUMENTED` since the document has no fail instruction);
pipe/point-free bodies → `E-SPINE-ESCAPE`.

**Wild-leg codes** (minted in §4b, part of the v0 taxonomy):
`E-YIELD-POSITION` (yield outside a recognized binding position — W1),
`E-ANSWER-HIGHER-ORDER` (an earlier answer used as an operation — W2;
never closable), `E-BIND-SHAPE` (destructured binder — W3/A3; the
`applicative-gap` bucket the B-plumb pack targets), `E-ARG-CLOSURE`
(function-valued op argument — W4/W5; never closable),
`E-IMPORT-OPAQUE` (T cannot resolve a re-export chain file-locally —
§4b.3), and the `E-ARG-DYNAMIC/{input,computed}` split (§4.3).

<a name="9-generation-targets"></a>
## 9. Generation targets

### 9.1 Emitted tree-sitter query text (the tooling projection)

Generated from Rules 3+4+5 (sketch; capture names are
`rule.role`-qualified so hits are self-describing):

```scm
;; GENERATED from recognition manifest v0 — rule const-yield-put
(lexical_declaration
  kind: "const"
  (variable_declarator
    name: (identifier) @constYieldPut.binder
    value: (yield_expression
      "*"
      (call_expression
        function: (member_expression
          object: (identifier) @constYieldPut.receiver
          property: (property_identifier) @constYieldPut.op)
        arguments: (arguments . (object
          (pair key: (property_identifier) @nodeLiteral.kindKey
                value: (object
                  (pair key: (property_identifier) value: (number) @nodeLiteral.version)
                  (pair key: (property_identifier) value: (number) @nodeLiteral.tag)))
          (pair key: (property_identifier) @nodeLiteral.payloadKey
                value: (call_expression
                  function: (identifier) @nodeLiteral.hexFn
                  arguments: (arguments . (string) @nodeLiteral.payloadHex .)))
          (pair key: (property_identifier) @nodeLiteral.refsKey
                value: (array) @nodeLiteral.refs)) .))))
  (#eq? @constYieldPut.op "put")
  (#eq? @nodeLiteral.hexFn "hex")) @constYieldPut.stmt
```

```scm
;; GENERATED — rule return-word
(return_statement (array (identifier)+ @returnWord.answers)) @returnWord.stmt
```

Notes the generator must encode: the empty payload `hex("")` has a
`string` with no `string_fragment` child, so the capture is the `string`
node and the walker strips quotes; `#eq?` predicates are host-evaluated,
which is exactly why these queries are a projection, not the instrument
(§5.2); receiver equality to the *bound* store parameter cannot be a
static `#eq?` — it is a walker-side check against Rule 1's binding.

### 9.2 The generated Lean walker (the actual tree-sitter instrument)

Shape (idiom inherited from `ExtractTwin.lean:299-378`'s member walk):
one generated function per rule —
`matchConstYieldPut (src : String) (env : BinderEnv) (stmt : TSNode) :
IO (Sum Refusal (RunInstruction × BinderEnv))` — using `childByFieldName`
for every fielded position, anonymous-token checks for `"const"`/`"*"`,
plus the partition driver (Rule 9) and `assertErrorsDisjoint` over the
whole declaration range (§5.3). All generated, byte-gated, never
hand-edited (the `backend-materialize` discipline,
`.agents/skills/backend-materialize/SKILL.md:44-54`).

### 9.3 The generated compiler-API recognizer

One generated matcher per rule over `ts.Node` (idiom inherited from
`extract.ts:197-268`): `ts.isVariableStatement` + const-flag,
`ts.isYieldExpression` + `asteriskToken`, `ts.isCallExpression` /
`ts.isPropertyAccessExpression`, object-literal walks with `closed`
enforcement; plus, in the TYPED register only (§10), checker calls: the
receiver's type is `CasStoreShape` (`Store.ts:71-75`), the callee symbol
is its `put` member, the node literal's contextual type is `CasNodeInput`.
The generator emits the syntactic matchers unconditionally and the typed
assertions behind a register flag, so the same manifest drives both
registers.

### 9.4 The taxonomy

One generated JSON document (codes, descriptions, spectrum classes) +
generated Lean inductive + generated TS union — three spellings, one
source, byte-gated. The histogram tool consumes the JSON directly.

<a name="9b-codex-lane"></a>
## 9b. The codex-operable lane: tasks, state, and the loop contract

Operator extension (2026-08-28, in-session): the libfree/parser-census
surface must be operable by a codex-class agent in a *supervised goal
loop* — the agent iterates between gates; the operator adjudicates at
them. Four requirements, then the contract.

### 9b.1 Every step is one idempotent mise task

mise is already the estate's canonical runner (`AGENTS.md:104-107`), and
the emitter/gate discipline already has the required shape
(`.agents/skills/backend-materialize/SKILL.md:15-27`: regenerate,
`--check`, red means read the diff). The lane's tasks:

| Task | Does | Output (stable path, machine-readable) |
|---|---|---|
| `census:capture -- --project <id> --slice <label>` | run both instruments over one labeled slice | `experiments/parser-census/out/<project>/<slice>.rows.jsonl` — one row per TypeScript declaration (feature facts, rule hits, refusal codes) |
| `census:tally` | fold rows into the histogram | `…/out/histogram.json` (codes × strata × counts, spectrum roll-up) |
| `census:gate` | twin comparison (documents AND refusals byte-identical), ERROR-disjointness, pin verification | non-zero exit + `…/out/gate-report.json` naming every disagreement as `E-INSTRUMENT-DISAGREE` with byte ranges |
| `libfree:recognize -- --run <runManifest>` | mint L2 candidates from a corpus slice | `…/out/<run>/documents.jsonl` + `refusals.jsonl` |
| `libfree:validate -- --run <run>` | the word gate over minted candidates | `…/out/<run>/word-report.json` (per-document: words compared, verdict) |
| `libfree:gen` | regenerate walker/recognizer/taxonomy from the manifest | byte-identity `--check` wired into `check:cas`-style gating |

Idempotent means: same committed inputs ⇒ byte-identical outputs (the
determinism discipline the Stage-1 extractor already enforces,
`extract.ts:15-18`); two runs disagreeing is itself a gate failure.

### 9b.2 Refusals are the loop's error signal

The refusal taxonomy (§8, §9.4) is not just measurement — it is the
structured, actionable feedback the agent iterates on: every refusal row
carries `{code, byteSpan, rule, stratum}`, so "reduce
`E-NODE-SHAPE` in stratum `generated` to zero" is a legible goal state,
and progress is a diff of `histogram.json`. Free-text errors are a
defect in this lane; anything the agent is expected to act on appears as
a taxonomy code or a gate-report entry.

### 9b.3 Loop state is committed data, never ambient

The run manifest is a committed JSON document naming: the corpus slice
(project id + slice label from the CLOSED vocabulary of
`experiments/parser-census/project-labels.json`, committed `70e684fd` —
the file itself orders "extend it here first, never ad hoc"), the
sampled package list (the labels file mandates committing it for the
DefinitelyTyped stratum — `project-labels.json`, `definitely-typed`
entry), every sampling/mutation seed, the recognition-manifest version,
and the enabled-pack set (D8's reproducibility counter is answered
here: the histogram is a function of committed state only).

### 9b.4 The loop contract

| The agent may do FREELY (between gates) | Ratification-GATED (operator adjudicates) |
|---|---|
| re-run any `census:*`/`libfree:*` task; regenerate all derived outputs | any change to a recognition-manifest RULE (pattern, binds, refusals, `enabled`) |
| extend a run manifest with new slices drawn from EXISTING labels | extending the label vocabulary (`project-labels.json` is closed by its own header) |
| propose rule changes as diffs + the histogram delta they would cause | pin bumps: grammar, tree-sitter core, `typescript`, `effect` (§12 drift instruments) |
| author fixture programs and decoy candidates into `.staging` | minting or renaming taxonomy codes; tier-ceiling changes (D8) |
| tune classifier training/eval (§10b) and report metrics | promoting a trained model into the proposer role (§10b); admitting any L4 document into the store |

The asymmetry is the R15 acquisition loop applied to the lane itself:
iteration is free where outputs are regenerable evidence; anything that
changes what counts as evidence — rules, labels, pins, taxonomy — is a
ruling. Contestable boundary → grill list D9.

<a name="10-evidence-registers"></a>
## 10. The evidence-register recommendation

### 10.1 The registers

| Register | Instrument | What it testifies |
|---|---|---|
| **T** | generated Lean walker over the pinned tree-sitter CST | the spelling matches the manifest's patterns; ERROR-disjoint; partition total. Style-blind, type-blind, independent of the TS toolchain |
| **Cs** | generated compiler-API recognizer, syntax only | same testimony from an independent parser — the classic-compiler AST, ASI/lexical subtleties resolved by the language's own reference implementation |
| **Ct** | compiler-API + checker | the callee IS `CasStoreShape.put` (symbol resolution through imports/aliases/shadowing); argument types agree; the program declaration's type is an Effect over the store. Requires a buildable project |
| **W** | dynamic: recording + word comparison | the lifted document's reference run (`interpretRef`, `Handler.lean:93-98`) word-equals the original program's recorded run against a recording store adapter. Byte-decidable (R5) |

### 10.2 The tiers, and what each admits

| Tier | Requirement | Standing | What it may be used for |
|---|---|---|---|
| **L0 refused** | any register refuses | correct output | histogram; nothing else |
| **L1 candidate** | Cs alone (or T alone) | measurement-grade | corpus scans, histogram, triage. NEVER a document mint |
| **L2 recognized** | **T ∧ Cs, byte-identical outputs** (documents AND refusals, twin contract §7.3) | a candidate document exists | may be shown, stored in `.staging`, queued for W. No semantic claim |
| **L3 typed-recognized** | L2 ∧ Ct | strong static evidence | prioritization; required whenever the corpus typechecks (all estate code) |
| **L4 validated lift** | L2 ∧ W (Ct too when available) | the lift claim, per-run | ONLY tier at which a document may be admitted to the store / claimed as the program's lift |

Mapping to the claim ladder: every tier is **evidence only — no G-grade is
claimed by recognition at any tier** (CLAIM-GATES G0–G6 govern claims;
this proposal mints none). The L4 statement is precise and small: "*on
this run, over this store state, the document's reference word equals the
original's recorded word*." It is per-(program, input) — for the
straight-line fragment the only input is the store, and since a
straight-line program's operation sequence is input-independent, one run
decides the document (the same logic by which R5 calls the run gate
decidable: nondeterminism enters only as recorded content,
`EFFECTS-BACKEND.md:83-88`). It is never a universal equivalence
certificate (R4 forbids pretending one exists).

Why L2 requires BOTH static instruments rather than either: each leg's
failure mode is the other's strength — tree-sitter can mis-recover
silently (§5.3) where the compiler API errors loudly; the compiler API is
one toolchain whose parse the estate cannot independently falsify without
the twin (the R6 principle: generator and extractor as each other's check,
never self-comparison, `EFFECTS-BACKEND.md:100-105`). Identical-refusal
matters as much as identical-match: an instrument that refuses where its
twin matches is a defect in one of them, surfaced as
`E-INSTRUMENT-DISAGREE` and investigated, never averaged.

The wild leg is the justification's ground (§4b.3): W1/A1 (aliased and
submodule imports) are why callee identity needs Ct wherever a build
exists — spelling-keyed recognition either wrongly refuses legal
programs (A1) or wrongly trusts homonyms; W2/W4 are why the taxonomy is
shared verbatim and refusals compared byte-identically at L2 — two
instruments that refuse *differently* on the same body are hiding a
defect; A2 is why W sits above recognition rather than replacing it (a
run cannot conjure a document from an unrecognized body); A5 is why the
L2 comparison targets extracted documents, never source bytes. And §4c's
W1 audit (the unsound ANF recovery) is why tier ceilings attach to rule
PACKS, not to the recognizer as a whole.

Why Ct is required-when-available but not always: on wild corpora
(arbitrary GitHub Effect code) a full typecheck may be unobtainable
(missing deps, broken builds). The manifest records per-corpus whether Ct
ran; an L4 admission from an untyped corpus carries that mark. On estate
code, Ct is mandatory — there is no excuse locally.

### 10.3 The dynamic leg, concretely

The recording store is the co-direction of `replayHandler`
(`Handler.lean:103-117`): a `CasStoreShape` adapter whose `put`/`load`
append to a word while delegating to the in-memory law
(`makeMemoryCasStore`, `Store.ts:285-310`) under the host digest
(`layerAddressSha256Live`, `Store.ts:396-397`). The document side runs
under Lean's `referenceHandler` with the SAME address function modeled
(the vector machinery already binds Lean-computed words to the host's
SHA-256 — slice 2's landed gate, `EFFECTS-BACKEND.md:314-323`). Word
comparison is byte equality of the rendered binding lists. Everything
here already exists in the estate; libfree adds only the
document→`Prog` loader (trivial: `RunInstruction`s fold into
`put`-then-`bind` with an answer environment — the exact inverse of
`EmitProg.lean:47-75`'s lowering).

### 10.4 The histogram as a first-class deliverable

Every corpus run emits `{refusalCode → count}` rolled up by
`spectrumClass`. Reading: `applicative-gap` codes (E-NODE-SHAPE,
E-HELPER-UNPINNED, E-OP-UNKNOWN/load…) measure distance-to-fragment that
manifest growth can close; `selective` codes (E-BRANCH with liftable arms)
size the F3 payoff; `monadic` codes (E-LOOP, E-HANDLER,
E-ARG-DYNAMIC/computed) bound what static lifting will EVER get, i.e. the
recording handler's permanent territory. This is the "how linearizable is
Effect-in-the-wild" measurement, produced as a by-product of refusing
correctly.

<a name="10b-classifier"></a>
## 10b. The classifier lane: learned candidate proposal

Operator framing (2026-08-28, in-session, quoted): "seems like we're
looking for basically a random forest classifier… to successfully pull
`class HttpError extends Data.TaggedError("HttpError")<{}> {}` out of
noise… we should be able to generate a substantial data set to optimize
this formally in a lightweight way." The quoted target is the R-ERR
register (§3.7) — a fully CST-recognizable shape (class declaration whose
heritage is a call expression with `type_arguments`), which is exactly
the point: candidate *detection* over noisy corpora is a supervised
classification problem, and the estate can manufacture its own labels.

### 10b.1 Place in the tier diagram: register P, strictly below L1

The classifier is a **pre-L1 candidate proposer** — call it register
**P**. Its output is a ranking of declarations ("likely
spine-constructor X / likely refusal-class Y"), consumed only as the
*work list* fed into the L1+ pipeline (§10.2). P sits below every tier:

- P never mints a document, never contributes to L2's twin agreement,
  never substitutes for any static or dynamic register.
- Direction-law position: **hoover-side evidence only** (the skill's
  direction law, `.agents/skills/store-language/SKILL.md:60-67`), under
  the estate's standing model law — empty trust contribution, the gates
  carry the trust (the R13/LLM clause, `EFFECTS-BACKEND.md:220-234`,
  applied to a non-LLM model unchanged). Every admission still passes
  the manifest recognizer and the word gate; a classifier error costs
  compute (false positive) or coverage (false negative), never
  correctness.

Why a random forest first: lightweight to train/serve inside a mise
task; auditable (feature importances are inspectable evidence, not
weights-in-a-blob); and its importances feed BACK into manifest design —
features that dominate the separation of a refusal class are precisely
the patterns that deserve first-class spine or B-pack rules next.
Citation: Breiman, *Random Forests*, Machine Learning 45(1):5–32, 2001,
doi:10.1023/A:1010933404324 — **pin pending** per C6.

### 10b.2 Features and labels

- **Feature vector = the census row** (§9b.1's `rows.jsonl`, already
  specified): per-declaration node-type multiset (sparse over the pinned
  324-type inventory), import-resolution facts (Effect dependency
  present, barrel/submodule/alias spelling, `E-IMPORT-OPAQUE` flags),
  spine/B-pack rule hit and refusal counts, body statistics (statement
  count, yield count and positions, binder shapes). No new
  instrumentation: the classifier consumes what the census lane already
  emits, so P is reproducible from committed state (§9b.3).
- **Labels = spine-constructor-or-refusal-class** — the manifest's rule
  names and taxonomy codes ARE the label space, which keeps the learned
  lane and the rule lane in one vocabulary by construction.

### 10b.3 The dataset interface (handoff to the parallel generation lane)

Operator scope ruling (2026-08-28, in-session): dataset GENERATION —
grammar-driven fixture-text production — is a second parallel effort
with its own agent and lane. This proposal owns the *interface*: the
labeled-example contract, and the inventory of which manifest rules the
generation lane can run generatively (rules as producers). The
recognition manifest is the shared artifact between the lanes.

**Labeled-example contract** (JSONL row, one per generated example; the
generation lane emits it, `libfree:train`/`libfree:eval` consume it):

```json
{ "exampleId": "…",
  "file": "…", "byteSpan": [start, end],
  "text": "…",
  "label": { "kind": "spine" | "refusal",
             "value": "const-yield-put" | "E-BRANCH/selective" | … },
  "provenance": { "manifestVersion": 0, "generatingRule": "const-yield-put",
                  "seed": "…" },
  "mutations": [ { "op": "alias-import" | "rename-binder" | "embed-noise" | …,
                   "params": { … } } ],
  "stratum": "generated" | "non-effect-baseline" | …,
  "embedding": { "hostProjectId": "typescript-compiler", "hostPath": "…" } }
```

Constraints the contract carries: `label` is ground truth **by
construction** (the generating rule or the refusal-inducing mutation is
the label — no hand labeling and no recognizer in the loop, which is
what keeps evaluation off the self-comparison trap, §12); `stratum` and
`hostProjectId` come from the CLOSED vocabulary and project list of
`experiments/parser-census/project-labels.json` (committed `70e684fd`);
`mutations` is ordered and replayable from `seed`.

**Invertibility inventory** — which spine constructors (§7.2) run as
generators as-is, and which need extra data from/for the generation
lane:

| Constructor | Generative as-is? | Extra data needed |
|---|---|---|
| `constYield` | yes (structure) | binder-name policy (dense `a_i` vs lexicon — the mutation lane's rename axis) |
| `retArray` | **yes** — fully determined by the binder environment | — |
| `obj (closed := true)` | yes with the pattern's declared field order | a field-order policy if the recognizer is ruled order-tolerant (permutation then becomes a mutation operator) |
| `arr` | structure yes | length distribution per role |
| `answerRef` | yes structurally | requires threading the SAME binder environment the recognizer threads (generator-side state; already defined by the manifest) |
| `call` / `opAccess` | structure yes | an **import-spelling table** per `OpRef` (barrel / submodule / alias / namespace — §4b's W1/A1 axis); the recognizer accepts many spellings, a generator must choose one, so the table is the mutation lane's alias axis |
| `intLit` / `strLit` | no | per-role value domains (e.g. `tag` ∈ registered wire tags, `version` = 0) |
| `hexArg` | no | per-sort payload domains (byte-length laws: leaf = 8, manifest = 16 — the shapes `Blob.ts:147-158` decodes) |
| `ident` | no | name lexicon |
| Rule 9 (partition) | trivially satisfied by pure-rule emission | noise embedding and statement interleaving are mutation operators, not constructor inversions |
| refusal codes | — | each rule's `refusals` list enumerates the decoy label space: a decoy is a minimal mutation that breaks exactly one guard (`const`→`let`, reorder `retArray`, computed payload…) — the generation lane designs the operators; the manifest tells it which codes are reachable per rule |

### 10b.4 Evaluation protocol

Per-stratum precision/recall, strata from `project-labels.json`:

1. **Generated strata:** ground truth by construction (contract above).
   Report per-label P/R and the confusion matrix over
   spine-constructors × refusal-classes. The manifest recognizer runs on
   the same rows as a *baseline proposer* — this measures the classifier
   against hand-written rules on the same axis, which is the operator's
   "when does learned proposal beat hand-written" question, answered
   per stratum and per label.
2. **Wild strata** (`clean-effect`, `wild-effect`, `estate`): the
   recognizer's verdict is the reference — metrics there measure
   *proposal efficiency* (how much corpus P lets the pipeline skip),
   explicitly NOT correctness, plus a small hand-audited sample per
   stratum for calibration (the independent leg).
3. **Control stratum** (`non-effect-baseline`): the labels file's own
   criterion applies to P verbatim — spine-positive rate must be ~zero
   "or the recognizer is hallucinating" (`project-labels.json`,
   labelVocabulary entry).
4. **Threshold policy:** tuned for recall. Downstream is fail-closed
   (§10), so a false positive costs one wasted recognizer run; a false
   negative is silent coverage loss — the one error class nothing
   downstream can repair.
5. **Feedback loop:** feature importances and the refusal-class
   confusion identify which wild patterns cluster hardest — that ranking
   is the evidence input to authoring the next B-pack rules (§4c.3),
   closing the loop between the learned lane and the manifest.

Success criterion, stated so it can fail: P earns its place when, at
matched recall ≥ 0.95 on generated strata, it cuts wild-corpus
recognizer invocations by an order of magnitude versus scanning every
declaration; otherwise the census scan IS the proposer and P is
retired — the architecture loses nothing either way, because P was
never load-bearing.

<a name="11-never-static"></a>
## 11. What can never be established statically

Delegated to the recording handler and the word gate, permanently:

1. **Address outcomes.** Which digest a put answers; whether a put is
   fresh, an inert duplicate, or a collision refusal — decided by the
   store's history and the address function (`Handler.lean:79-86`;
   worked example §4.5). No syntax sees this.
2. **Host closure behavior.** Any lambda, any un-pinned helper, any
   combinator argument (R14 stratum 4: no equational theory, reasoning
   stops at the trust statement).
3. **Ambient bindings.** That the `store` actually supplied at run time
   implements the ratified law — Layer resolution is dynamic (§3.5/§3.6).
   Static registers verify the *shape*; only the word verifies the
   *behavior* (and only per-run).
4. **Environmental effects.** Tracing, interruption, fibers, retry — the
   target monad's contribution (R10), quotiented away by the word
   observation on purpose.
5. **Equivalence of two lifts.** Whether two different documents mean the
   same thing is stratum-3 territory: theorem or per-run observation,
   never recognition (R4/R5).

<a name="12-limits-and-risks"></a>
## 12. Honest limits and named risks

- **Grammar drift.** The manifest pins the grammar rev + a digest of
  `node-types.json`; any pin motion is a re-admission (regenerate walker,
  re-run twin gates, diff the inventory). The `<in E>` episode (§6) is the
  standing proof this risk is real. Mitigation is architectural: nothing
  hand-written depends on the grammar; only generated artifacts do.
- **TS version drift.** The compiler API is pinned (`typescript@5.9.2`,
  deliberately the classic API, `extract.ts:9-11`); the announced native
  (7.x) port is a DIFFERENT instrument requiring its own admission, not a
  version bump. The manifest's `compilerPin` makes any motion loud.
- **Effect v4→v5 surface drift.** The recognizer's whitelist (`Effect.gen`,
  `Effect.fn`, service classes, `CasStoreShape`) is exactly the kind of
  surface the R8 extract lane and the EFFECT-SURFACE census exist to watch
  (`EFFECTS-BACKEND.md:118-129`;
  `.reference/catalog/EFFECT-SURFACE.md:1-26`). The manifest's `effectPin`
  names the recognized version; recognition against an unpinned Effect is
  refused, not attempted. When v5 moves the idioms, the manifest grows new
  register rules — data growth, not parser rewrites.
- **The self-comparison trap.** The obvious validation corpus —
  `VectorPrograms.ts` — is generated by `EmitProg.lean` from the SAME
  registry that produces the Lean words. Validating the recognizer only
  there compares the estate with itself (forbidden by the R6 principle and
  by R15's acquisition-loop logic). Required independent legs: (i)
  hand-authored fixture programs (a person writes straight-line programs
  the emitter never produced — different names, orderings, spacings); (ii)
  wild corpora (the estate's own `library/effects/src`, then the Effect
  monorepo checkout already sampled in §4b —
  `effect-repo/packages/effect/test/**` and `packages/*/src` internals —
  then GitHub); (iii) the dynamic leg itself, whose digest and
  runtime are independent of the emitter. The emitted corpus is still
  valuable — as the ROUND-TRIP anchor (emit → recognize → document must
  equal the registry's own lowering) — but round-trip is a printer gate,
  not recognition validation.
- **Existential queries.** If any consumer ever wires the `.scm`
  projection as an admitting judgment, the universal checks (partition,
  closed objects, dense return) silently vanish. The projection files
  must carry a generated header saying exactly this.
- **SPECULATION — corpus yield.** Expectation, not measurement: wild
  Effect code is dominated by R-PIPE/R-PF/R-SVC registers and will refuse
  at high rates; near-total lift rates occur only on emitted/disciplined
  corpora. The histogram will decide; the DSL is designed so that a
  disappointing yield is itself the finding.
- **Scale limits.** v0 recognizes single-file, single-declaration
  programs; cross-module program assembly (a program calling an imported
  sub-program) is out of scope until F3's code points give composition a
  first-order carrier (`EFFECTS-BACKEND.md:324-325`).

<a name="13-decisions"></a>
## 13. Decisions for the grill

Each with a recommendation and the strongest argument against it.

**D1 — `<in E>` remediation: grammar-pin upgrade (recommended) vs
compiler-API carve-out.**
Recommendation: upgrade, sequenced before the first corpus run; carve-out
only as a dated bridge with an expiry condition (§6).
Strongest counter: the upgrade is hostage to a lean4-tree-sitter release
(vendored grammar), and a stalled dependency would block libfree entirely,
whereas the carve-out ships now and the affected modules are enumerable —
pragmatism says ship the asymmetry and record it.

**D2 — DSL carrier: Lean-authored data + generated canonical-JSON
manifest, patterns as tagged records (recommended) vs waiting for the
canonical-schema `union` constructor vs a `.scm`-first source.**
Recommendation: tagged records now (the schema plane's own discipline,
§7.1), union migration named as follow-up; never `.scm`-first (it is
single-instrument and existential).
Strongest counter: tagged records are exactly the kind of
"described-except-for-the-part-that-matters" document R11 exists to
forbid — the pattern sum is the manifest's heart, and shipping it outside
the canonical-schema universe means the manifest cannot fully
self-describe until the migration; better to land `union` first and mint
the manifest whole.

**D3 — tree-sitter instrument: generated Lean walker with `.scm` as
non-authoritative projection (recommended) vs query-engine-driven
recognition.**
Recommendation: walker (universality gap §5.2; predicate engines are
host-side; the admitted twin idiom is already raw-FFI,
`ExtractTwin.lean:133-160`).
Strongest counter: queries are the ecosystem's lingua franca — editor
tooling, corpus grep, third-party reproduction all speak `.scm`; a
walker-only instrument makes the estate's recognition harder for
outsiders to falsify with stock tools, which cuts against C7 legibility.

**D4 — admission tier: word gate (L4) required for EVERY document
admission (recommended) vs L3 sufficing for estate-emitted files already
under byte gates.**
Recommendation: L4 always — §4.5 shows semantics the static side cannot
see even on emitted code, and one uniform gate is one uniform claim.
Strongest counter: for emitted files the byte-identity gate already
proves the text is the registry's own lowering, so the run adds nothing
the registry's existing run gate hasn't proved; requiring W there is
ceremony that slows the loop without adding evidence.

**D5 — binder discipline: accept arbitrary binder names and normalize to
indexes (recommended) vs requiring the emitter's dense `a0…aN` spelling.**
Recommendation: accept-and-normalize — the document carries indexes only,
spelling dies at the boundary (R15), and wild code will never spell
`a0…aN`; requiring it would collapse the recognizer's domain to the
emitter's image (the self-comparison trap in whitelist form).
Strongest counter: normalization is a transformation inside the
recognizer, and every transformation inside the trusted seam is attack
surface for a silent mis-lift (wrong index = wrong program that may still
run green on small words); the strictest possible v0 (dense names, no
normalization) is the smallest trusted computing base and wild-corpus
recall can be bought later.

**D6 — custom Effect-spine grammar: reject for recognition; optionally
revisit as a third falsifier for the closed emitted fragment
(recommended).**
Strongest counter: §5.4's own admission — for the closed fragment the
custom grammar gives grammar-level totality, i.e. a *parser* that is the
fragment's decision procedure; refusing it leaves the fragment's
parse-back gate spread across two general-purpose instruments where a
purpose-built one would be smaller and stronger.

**D7 — the typed register: mandatory on estate code, recorded-optional on
wild corpora (recommended) vs mandatory everywhere.**
Strongest counter: an L4 admission whose Ct never ran admits a document
from code whose `store.put` was never symbol-resolved — a homonym callee
on a lookalike shape could pass T ∧ Cs ∧ W against the recognizer's own
harness store while meaning something else in its home project; if that
risk is unacceptable, mandatory-Ct everywhere is the only honest gate and
unbuildable corpora simply cap at L2. The wild leg sharpens the counter:
aliased and submodule imports (W1/A1) are the NORM in the Effect monorepo,
so untyped resolution leans hardest on exactly the corpora where it is
weakest.

**D8 — posture layering: Effect-only core with optional, individually
gated TS-pattern rule packs (recommended, §4c.3) vs a single joint
TypeScript+Effect posture.**
Recommendation: layered — core (posture A) at every tier; `B-plumb`
(Effect.all bundles + destructuring projection) eligible for L4 only
after its own twin + word gate on a dedicated fixture corpus; `B-args`
(constant folding, template concatenation) capped at L2 until per-rule
ruling; `B-class` classification-only. Rationale: posture A cannot mint a
wrong document (refusal-only failure mode), and the one demonstrated
lift-recovering B family on real code is B-plumb (W3), while the most
tempting B rewrite is demonstrably unsound (W1's ANF hoist past throwing
host calls, §4c.1).
Strongest counter: the layer ceilings make the recognizer's effective
whitelist a function of pack state, so two runs of "libfree v0" on the
same corpus can disagree because packs differ — a reproducibility hazard
the manifest version must fully determine (every histogram and evidence
document must carry the enabled-pack set); and if wild corpora are
dominated by W3-shaped code, shipping the core without B-plumb measures
mostly the whitelist's smallness rather than Effect-in-the-wild's
linearizability, weakening the histogram's headline claim until the
second release.

**D9 — the codex loop contract's free/gated boundary (§9b.4):
recommend as drawn — re-running capture/tally/recognize/train and
extending run manifests over EXISTING labels is free; rule changes,
label-vocabulary extension, pin bumps, taxonomy minting, model
promotion, and store admission are ratification-gated.**
The one deliberately contestable line: *fixture and decoy authoring
into `.staging` is free*, though fixtures shape what the classifier
learns and what the recognizer is tested against.
Strongest counter: free fixture authoring lets the loop quietly curate
its own evaluation set — an agent optimizing a histogram goal can
author fixtures its rules already pass (Goodhart pressure on the loop's
own metric); the strict alternative gates fixture admission like rule
changes, at the cost of making every iteration operator-blocking and
losing most of the supervised-loop throughput the lane exists for.

**D10 — classifier promotion: register P enters the pipeline only by
ratification, and its outputs are ranked work lists, never filters
(recommended: below-threshold declarations are still scannable by the
census lane; P re-orders work, it does not hide it).**
Strongest counter: if P never filters, it saves latency but not the
compute the operator asked to save ("pull … out of noise" implies
skipping the noise) — a P that cannot skip anything is a prioritizer
with no order-of-magnitude win, and the honest version of the lane may
require admitting that skipped-below-threshold declarations are
UNMEASURED in that run (recorded as such in the run manifest), which
trades histogram completeness against throughput and should be ruled
explicitly, not defaulted.

---

*End of proposal. Deliverable of the libfree design lane; grilling pass
requested before any part of this enters `docs/` or generates code.*
