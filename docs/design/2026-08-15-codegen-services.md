# Codegen services: the semantic-fold family, scoped

FROM OPERATOR-DIRECTED RESEARCH

Author: codegen lane (Opus), 2026-08-15, isolated worktree. Read at
`origin/main` = `310fc18f399a497f8552ce29cd0ea7d8e15d91ed`. Design only —
prose, signatures, laws, and an inventory; no machinery. Consumer-gated to
tickets 004 (identity on the owned walk) and 015 (the foundry), and to the
DX lane's journey, which this document joins at *"I have a certified
digest."* Labels follow the unified fold's convention — **SHIPPED**
(walled or tested in-repo), **RATIFIED-UNBUILT**, **ASPIRATIONAL**.

The brief's framing: the empty stub `packages/codegen/src/index.ts`
(`export {}`) is the reserved home for the semantic-fold family, and the DX
journey ends at *"my certified types generate my code."*

---

## 0. The finding that reframes the brief

**The flagship already exists, and it is not in `packages/codegen`.**

`proto/ts/src/codegen.ts` is 331 lines carrying three complete semantic
folds over `flb.type.v0`, with a header that already names the discipline
this document was asked to design (`proto/ts/src/codegen.ts:1-6`):

> "Codegen: semantic folds over a digest-anchored flb.type.v0 structure.
> Three targets — effect-schema (a live Schema value), json-schema (draft
> 2020-12 object), go (source text)."

- `toEffectSchema(structure, resolve): Derived<Schema.Top>` —
  `proto/ts/src/codegen.ts:136-143`
- `toJsonSchema(structure): Derived<Record<string, Json>>` — `:235-239`
- `toGoSource(structure, typeName, digest): Derived<string>` — `:319-331`

The round-trip wall is written and green over the 18-vector frozen corpus
(`proto/ts/test/codegen.test.ts:128-141`, `proto/wire/fixtures/types.json`).
The JSON Schema target has a **production consumer today**: the MCP server
derives every tool's `inputSchema` from it (`proto/ts/src/mcp.ts:13,33,43`).

`packages/codegen/src/index.ts` is `export {}`. Its `package.json`
description — *"Derivation targets: Go twins generated from cataloged
declarations"* — describes the *third* target, ranked last by consumer
demand below.

So this is not a greenfield scoping. It is a **promotion**: the question is
what changes when three prototype functions become a service with a cache
key, a refusal contract, and a delivery seam. Three things change, and each
one is a section below — the generator acquires an identity (§2), the input
acquires a *verified* identity rather than an asserted one (§2.4, a finding),
and the round-trip law acquires a second, harder half (§4).

**Correction to the brief, for the record.** The brief calls codegen "the
fold cache's second consumer family." The fold cache has **zero** production
consumers: `packages/core/src/foldCache.ts` is imported only by
`packages/core/test/fold.cache.test.ts`, `packages/core/src/foldLaws.ts`,
and `packages/core/test/fold.bindings.test.ts`. Codegen would be its
**first**. That is a heavier obligation than being second, not a lighter one:
§2.3 shows the cache's stated standing limit (`foldCache.ts:178-182`) is
benign for folds-over-histories and *load-bearing* for folds-over-generators.

---

## 1. The generator inventory, ranked by consumer demand

The ranking axis is **who consumes the output today**, per the house rule of
no machinery before a consumer. "The fold's shape" is stated over the
grammar's node set, which is **14 kinds**: the 13 decided kinds of
`proto/go/protod/walk.go:19-22` — `string, bool, int, float, null, opaque,
literal, list, struct, union, brand, check, ref` — plus `hole`, which is
authoring-only and admitted only on the partial walk (`walk.go:24`, `:79-89`).

Every target below refuses `hole` identically; that identity of refusal is
itself walled (`proto/ts/test/codegen.test.ts:258-280`, D46).

### Rank 1 — Effect Schema (TS). THE flagship.

**Consumer today: YES, and it is the one the DX journey ends at.** Client-side
validation before the wire. Today a client learns its structure is malformed
only by asking the daemon: the measured dogfood session in issue #41 spent
11 tool calls from intent to certified where the clean path is 7, and the
refusal economics are explicitly "round-trips are the only cost the model's
quality controls." A generated `Schema.Top` moves the first `n-1` of those
refusals in-process, at zero protocol cost.

*(Sizing note: the brief cites this as dogfood finding "#26-E5". Issue #26 has
findings E1–E4 and no E5; the round-trip accounting the claim rests on is in
issue #41, and that is what is cited here. The claim survives the correction —
its evidence just lives one issue over.)*

**The fold's shape.** A catamorphism into the Effect Schema algebra, one
clause per kind (`codegen.ts:55-134`). Five leaves map to constructors
(`String/Boolean/Int/Number/Null`, `:64-72`); `opaque` → `Schema.Unknown`
(`:74`); `hole` refuses (`:76`); `literal` → `Schema.Literal` (`:78`);
`list` → `Schema.Array` (`:82`); `struct` → `Schema.Struct` with
`Schema.optionalKey` for the optional set, traversed in identity order
(`:88-93`); `union` → `Schema.Union` (`:103`); `brand` →
`.pipe(Schema.brand(name))` (`:108`); `check` → `base.check(builder(args))`
through a seven-entry table (`:45-53`); `ref` → resolve, compile, wrap in a
`Schema.declare` whose `identifier` is the digest (`:129`, `author.ts:30-38`).

**Determinism story: split, and this is the one architectural correction the
inventory forces.** The output is a *live JavaScript value*. It has no bytes,
so "same digest in, same bytes out" is not statable for it, and it is not
cacheable. The flagship therefore needs **two faces**:

- `effectSchema(...)` → `Schema.Top`. Determinism is checkable only by
  re-folding it back to a digest — which is exactly the shipped wall
  (§4.1). Not cacheable, not content-addressed; this is the runtime
  validation face.
- `effectSchemaSource(...)` → TS source text. Deterministic bytes,
  cacheable, and what a CLI writes to a file. **RATIFIED-UNBUILT** — no
  clause of it exists today.

Merging these two faces is the mistake this section exists to prevent. The
brief's item (c) — TS type declarations — is not a separate generator; it is
the *emission* half of this one (Rank 3).

### Rank 2 — JSON Schema.

**Consumer today: YES, two of them, one shipped and one owed.**

1. Shipped: MCP tool `inputSchema`. `proto/ts/src/mcp.ts:33` calls
   `toJsonSchema(request.body)` for every request kind in
   `contract.describe`, and `:43` for the ingress frame. This is the
   mechanism behind the file's claim that *"there is no hand-written tool
   list to drift"* (`mcp.ts:1-5`).
2. Owed: **issue #17's `outputSchema` — and the brief's suspicion is
   right, and stronger than it was put.** The materials for the fix are
   already declared and already on the wire. `contract.describe` carries a
   `reply` term for **every** request kind, and each one is an
   `flb.type.v0` **struct**: `type_create` at
   `proto/go/protod/contract.go:124-132`, `type_fill` / `type_unfill` via
   `vConciergeReply()` (`:145`, `:154`), `journal_read` at `:167-179`,
   ingress at `:196-204`. The refusal shape is declared once as
   `vRefusal()` at `:208`. Both travel to the client (`wire.ts:108,130`).

   A `struct` renders as `{type:"object", …}` (`codegen.ts:186`), which is
   exactly the predicate the pin gates `outputSchema` on
   (`repos/effect/.../McpServer.ts:1286`, per
   `docs/design/2026-08-14-mcp-surface-deep-read.md:112,255-263`). So the
   defect at `mcp.ts:71` — `success: Schema.Unknown` — is not a missing
   capability. It is a **generator that was applied to `request.body`
   (`mcp.ts:33`) and never to `request.reply`.** Building the success
   envelope from the already-declared reply term, with the already-declared
   refusal as the alternate branch under an `ok` discriminant (the field is
   already in every reply struct), is #17's fix and it is this family's
   generator pointed one field to the left.

   Two honest bounds. (a) `contract_describe`'s reply is declared
   `vOpaque()` (`contract.go:187`) → `{}` → `type === undefined`: that one
   tool gets no `outputSchema` until the contract describes itself, which
   is the `opaque` escape hatch working as designed (004 addendum 2, law 8).
   (b) `Tool.dynamic`'s `success` takes a Schema value, not raw JSON Schema
   — `mcp.ts:70` only gets away with `parameters: … as any`. So the
   *flagship* target, not the JSON Schema target, is what `success` actually
   wants: `toEffectSchema(request.reply)`. **Rank 2's owed consumer is
   discharged by Rank 1.**

**The fold's shape.** `codegen.ts:147-233`. Leaves → `{type: …}`; `opaque`
→ `{}` (`:165`, permissive by design); `literal` → `{const}`; `list` →
`{type:"array", items}`; `struct` → `{type:"object", properties, required,
additionalProperties:false}` with `required` built in identity order
(`:180-186`); `union` → `{anyOf}`; `brand` → base spread plus
`"x-flb-brand"` (`:200`) — a *claim*, correctly, since JSON Schema has no
nominal tier; `check` → seven expressible constraints, and anything else
rides along as `"x-flb-check"` (`:225`) — again a claim, not a constraint;
`ref` → `{$ref: "flb:<digest>"}` (`:229`), **not inlined**.

**Determinism: good, with one obligation.** The output is a JSON value, so
it has canonical bytes — but only after canonicalization: the object literals
are built in insertion order (`:186`), not identity order. Any digest of a
JSON Schema output must run `canonicalize` first, never `JSON.stringify`.

### Rank 3 — TS type declarations (`.d.ts` / source).

**Consumer today: NONE as a standalone target.** Nothing in the repo emits
`.d.ts`. But as noted at Rank 1 this is not really a separate generator: a
generated Effect Schema *is* a TS type (`typeof S.Type`), and the source
emitter that produces it produces the declaration for free. Ranked here to
record the ruling: **do not build a separate `.d.ts` fold.** Build
`effectSchemaSource`, and the type declaration is `export type Foo = typeof
Foo.Type` on the next line. One fold, two artifacts, one law.

### Rank 4 — Go structs + decode.

**Consumer today: NONE.** `toGoSource` (`codegen.ts:319-331`) exists and is
tested, but nothing writes its output to disk — no script, no build step, no
Go package consumes it. The "Go twin" is, across the repo, a documented
*absence* (`packages/core/CONTEXT.md:7,18,32`, `NEXT.md:73`,
`packages/core/src/kvSemilattice.ts:37`).

**The fold's shape.** `codegen.ts:249-314`. It is the *lossiest* of the
three, and honestly so: `null`, `union`, `literal`, and `ref` all degrade to
`any` with a trailing comment (`:262,268,275,294`); `brand` and `check`
degrade to their base plus a comment (`:285,291`). Only `struct`, `list`,
and the four scalar leaves carry real Go structure.

**Determinism: source text, deterministic. Verification: weak, and the file
says so.** `codegen.ts:316-318`: *"The bullet's verification is re-parse
(gofmt accepts it); the byte-level codec wall is a stated future
obligation."* The test only checks that `gofmt -e` exits zero over the
concatenated corpus (`codegen.test.ts:282-304`). **A generator whose only
law is "the output parses" is a generator with no law**: every degradation
to `any` passes it. The decode half — `decode_Go(bytes) ≡ certify(bytes)` on
acceptance — is where this target earns its rank, and it does not exist.
Do not promote this target until a consumer names it.

### Rank 5 — fast-check / Arbitrary generators.

**Consumer today: NONE for `flb.type.v0` — but it is the *instrument* for
the flagship's jewel law, and that is a consumer.**

The named precedent is a false lead worth killing: `foldArbitrary.ts` does
**not** fold over `flb.type.v0` and does not fold over Effect Schema. It
compiles a five-constructor hand-rolled `GeneratorSpec` ADT
(`packages/core/src/foldArbitrary.ts:28-45`, kinds `integer |
optionalInteger | boolean | stringSet | product`) into fast-check
arbitraries. It is not a member of this family.

The real case for an Arbitrary target is §4.2: the **acceptance round-trip
law** — the claim that a generated validator accepts exactly what the
certifier accepts — is a statement quantified over *values of the type*, and
nothing in the repo can produce values of a cataloged type. Effect's
`Schema.toArbitrary` gives this almost free once `effectSchema` exists
(compose, do not fold). Rank 5 by demand; **rank 1 by what it unblocks.**

### Rank 6 — docs / markdown.

**Consumer today: NONE, and no evidence anyone has asked.** The fold is
trivial and the temptation is to write it because it is easy. Recorded here
only so the ranking is complete. Do not build it.

### The inventory, as a table

| # | Target | Consumer today | Fold exists | Output has bytes | Law today |
|---|---|---|---|---|---|
| 1 | Effect Schema (live value) | **YES** — client-side validation, issue #41's round-trip economics | `codegen.ts:136-143` | **no** (live value) | round-trip digest wall, 18 vectors |
| 1b | Effect Schema (source) | YES — the CLI in §3 | **no** | yes | none — RATIFIED-UNBUILT |
| 2 | JSON Schema | **YES** — `mcp.ts:33,43`; #17 partially | `codegen.ts:235-239` | yes (after canonicalize) | shape assertions only |
| 3 | TS declarations | folds into 1b | n/a | yes | inherits 1b |
| 4 | Go structs + decode | **none** | `codegen.ts:319-331` | yes | `gofmt` re-parse only |
| 5 | Arbitrary | none directly; **unblocks §4.2** | no | no | n/a |
| 6 | docs / markdown | **none** | no | yes | n/a |

---

## 2. The architecture: codegen as content-addressed derivation

### 2.1 The law

> **output = fold(generator, type)**, and the pair `(generator digest, type
> digest)` names the output uniquely and permanently.

This is CONTEXT.md's *Semantic fold* headword (`CONTEXT.md:241-248`) given a
key. It is licensed by exactly the same argument the fold cache runs on
(`foldCache.ts:1-11`): both halves of the key are already commitments, so an
entry cannot become wrong as the world moves — there is nothing to
invalidate and no expiry. It is ADR-0006 restated as a cache key: *"anything
that re-expresses a cataloged schema for an outside consumer … is generated
from the same declaration and verified by wall, never written by hand."*

### 2.2 Where generator identity comes from — buildable now vs foundry-era

Two honest answers, and the estate has already ratified the discipline for
choosing between them.

**Buildable now: pinned code with a content digest, honestly
attestation-grade.** The generator's identity is `SHA-256` over the canonical
bytes of a small *declaration record* — `{name, version, target, checkTable}`
— plus the SHA-256 of the generator module's own source bytes. The second
half is what makes it honest: a declaration alone names *what the generator
claims to be*, not *what it does*, and §2.3 shows why that gap is fatal here.
This is exactly the posture ticket 004's D1 takes for type identity —
`bytes-sha256-v1` *"remains honestly attestation-grade until the owned
scheme ships"* (`docs/map/tickets/004-...md:121-126`). Say the same sentence
about generators and it is true for the same reason.

**Foundry-era: the generator is itself declared data.** Ticket 015
deliverable 4 already promises *"derived artifacts per grammar … Output
bundle follows Spoofax's separation: syntax / static semantics /
transformation as separately digested components"*
(`docs/map/tickets/015-...md:37-42`). At that point a generator is a term in
a grammar, folded by an interpreter, and it has a *structural* digest rather
than a source digest — vendor churn and formatting cannot move it. **ASPIRATIONAL,
and correctly so: there is no consumer for a data-declared generator today,
and building one now buys nothing the source digest does not.**

**The scheme discipline carries over unchanged.** D4 (`004:139-140`) —
dual-record; a commit names a digest under a scheme; re-derive is refuted by
the append-only axiom. A generator scheme bump is a **new scheme**, and old
outputs keep their old key. Never a re-derivation of an already-named
artifact.

### 2.3 The cache, and the standing limit that becomes load-bearing

`foldCache.ts:128-140` builds the key as the flat string
`` `${fold.digest}:${head}` ``. Structurally identical to what codegen needs.
Two mismatches, both real:

**(a) The type does not fit.** `putFoldCache(cache, fold: Fold<E,A>, head:
Head, value: A)` (`foldCache.ts:184-189`) is typed to `Fold` and
`FoldState`, and stores via `encodeFoldState` (`:194`). A codegen output is a
string or a `Record<string, Json>`, not a `FoldState`. Promotion therefore
requires either widening `foldCache` to a general
`(derivation digest, input digest) → canonical bytes` store, or a sibling
module. **Recommendation: a sibling in `packages/codegen`, not a widening.**
Widening a module whose entire correctness argument is written in terms of
histories and heads, in order to serve a consumer that has neither, is the
kind of change that costs the original module its clarity. The two can share
a key discipline without sharing a signature.

**(b) The standing limit inverts.** `foldCache.ts:178-182` states it plainly:

> "A key names declarations, not behavior. A fold assembled from a genuine
> declaration re-hosted onto a foreign combine carries the same digest as its
> honest counterpart, so it can write under that shared name and be read back
> as the honest fold's result. **No consumer yet depends on the distinction.**"

For folds over histories that is a tolerable gap. For codegen it is a
**poisoned-artifact channel**: a generator that declares itself
`effect-schema/v1` but emits different code writes under the honest key, and
every later reader gets the wrong code with a valid-looking provenance
line. This is precisely why §2.2 puts the *source* digest in the generator
identity and not just the declaration. State it as a law:

> **L-GEN-ID.** A codegen cache key's generator half commits the generator's
> code, not only its declared name. A declaration-only generator digest is
> refused by the cache.

### 2.4 FINDING: the shipped Go emitter stamps an asserted identity

`toGoSource(structure, typeName, digest)` (`codegen.ts:319`) takes the digest
as a **caller-supplied string** and writes it into the generated banner
(`:324`):

```
// digest: ${digest} (bytes-sha256-v1)
```

It never recomputes `structureDigest(structure)` and never compares. A caller
can hand it any structure with any claimed digest, and the generated Go source
will carry that claim as if it were derived. The test itself passes
`"0".repeat(64)` for two of the three targets (`codegen.test.ts:33`).

This is the no-asserted-identity law (ticket 004's 002-resolution
requirement, `004:33-35`; the daemon's own posture in
`proto/go/protod/catalog.go` is to recompute every digest it commits) being
violated in the one place the digest becomes a permanent artifact. It is not
a live exploit — nothing writes the output to disk today, which is exactly
why it has survived — but it is the defect that promotion would ship.

**Reported, not repaired** (findings before fixes). The fix belongs in the
promoted interface, where it is a signature change and not a patch: §3.3
takes `Certified` rather than `(Json, string)`.

---

## 3. The service seam

### 3.1 The ruling that decides the order

**The flagship cannot be a daemon request kind.** The daemon is Go and the
Go module is stdlib-only by standing law (`AGENTS.md`, non-negotiable rules).
An Effect Schema value is a TypeScript runtime object. No amount of protocol
design moves `toEffectSchema` behind `dispatch.go`. The substrate decides
this one, not preference.

That also disposes of the collision the brief flagged. Issue #35 row 7
records three lanes already contending for `dispatch.go` / `CONTRACT.md` /
frozen wire fixtures; codegen simply does not join the queue. If a Go-side
JSON Schema derivation is ever wanted, the daemon already builds `flb.type.v0`
nodes natively (`proto/go/protod/contract.go:13-102`) and could grow one —
but that is a different generator with a different consumer, and no consumer
has asked.

### 3.2 The recommended order

**First — library import.** Promote `proto/ts/src/codegen.ts` into
`packages/codegen/src/` with the corrected interface (§3.3). Justification:
it has a shipped consumer *right now* (`mcp.ts:13`), it adds zero protocol
surface, and the promotion is where the §2.4 finding gets fixed as a
signature rather than a patch. `proto/ts` re-exports from the package so the
tracer bullet keeps working and the round-trip wall keeps running against
one implementation.

**Second — build-time CLI.** `bun x foldlab-codegen <digest> --target
effect-schema --out src/types/`. This is where *"my certified types generate
my code"* becomes a thing a developer does, and it is the first consumer that
needs `effectSchemaSource` (§1, Rank 1b) and the cache (§2.3). It also
forces the closure question to be answered honestly: the CLI reads the
catalog once, up front, and hands the fold a resolved map (§3.3).

**Third — MCP tool, with a stated cost.** A `type_derive` tool is the natural
agent-facing surface, and it collides with a claim the MCP server currently
makes. `mcp.ts:1-5`: *"tools are DERIVED from contract.describe at startup …
There is no hand-written tool list to drift (drift is structurally
impossible)."* Every tool today comes from `toolsFromContract`
(`mcp.ts:28-58`). A codegen tool has no daemon request kind behind it, so
adding one means either (a) the server grows a second, hand-written tool
source and the structural-impossibility claim must be *restated with an
exception*, or (b) codegen's *input-shape* description is itself published as
a `flb.type.v0` term and the tool is derived from that. **(b) is the design
that keeps the claim** — and it is a small one, because the input shape is
`{digest: string, target: <literal union>}`, four v0 nodes. Do not take (a).

**Fourth — daemon request kind: refused for the flagship**, per §3.1.
Available for Go-side and JSON Schema targets if and when a consumer names
one.

### 3.3 The flagship interface, precisely

```ts
/** A type as the catalog knows it: the claimed digest, the scheme that
 *  digest was computed under, and the canonical structure. Never a bare
 *  Json — an asserted identity is not an input this family accepts. */
export interface Certified {
  readonly digest: string        // 64 lowercase hex
  readonly scheme: string        // "bytes-sha256-v1" today
  readonly structure: Json       // an flb.type.v0 term
}

/** The ref closure, resolved BEFORE the fold runs. digest → Certified. */
export type Closure = ReadonlyMap<string, Certified>

export interface Provenance {
  readonly typeDigest: string
  readonly typeScheme: string
  readonly generator: string     // "effect-schema/v1"
  readonly generatorDigest: string
  readonly closureDigests: ReadonlyArray<string>  // identity order
}

export const effectSchema: (
  input: Certified,
  closure: Closure,
) => Derived<{ readonly schema: Schema.Top; readonly provenance: Provenance }>

export const effectSchemaSource: (
  input: Certified,
  closure: Closure,
  options: { readonly typeName: string },
) => Derived<{ readonly source: string; readonly provenance: Provenance }>
```

`Derived<A>` is unchanged (`codegen.ts:12-14`) and the refusal is the uniform
wire `Refusal` marked `local` (`wire.ts:24-33`, `:145-155`).

**Why the closure is pre-fetched, not network.** This is the load-bearing
interface decision and it follows directly from §4.1. The drift-free claim is
*"the derivation is a function of its input alone."* A generator that reaches
the network mid-fold is a function of its input **and the catalog's state at
call time**, and the claim evaporates — two runs at the same digest can
differ because a ref landed between them. So resolution is a **separate
seam**:

```ts
export const resolveClosure: (
  root: string,
  read: (digest: string) => Promise<Certified | undefined>,
) => Promise<Derived<Closure>>
```

`resolveClosure` is effectful and may refuse; `effectSchema` is pure and total
over a resolved closure. The catalog is a DAG by construction — no forward
refs, no cycles (`proto/go/protod/walk.go:11-14`) — so the root digest
transitively determines the closure, which is what makes
`(generator digest, type digest)` a sufficient cache key without the closure
in it. That inference leans on the catalog being honest about digest →
structure, which is why `resolveClosure` recomputes every member's digest
before admitting it.

Today's `Resolve = (digest: string) => Json | undefined` (`codegen.ts:20`)
is the same idea with the identity check missing and the effect not
separated.

**What it does with brands, checks, and refs.**

- **Brands** — identity-bearing per ticket 004 law 4; rendered as
  `Schema.brand(name)` (`codegen.ts:108`). `UserId` and `OrderId` at equal
  shape produce distinguishable generated types, which is the whole point of
  a catalog preserving nominal intent.
- **Checks** — the seven-name `CHECK_BUILDERS` table (`codegen.ts:45-53`),
  documented as *"Inverse of the author fold's table"* (`:44`). A check name
  outside the table refuses (`:117`) rather than being dropped: a silently
  widened type is worse than no type.
- **Refs** — resolved from the closure, compiled, and wrapped in a
  `Schema.declare` carrying the digest as `identifier` (`:129`,
  `author.ts:30-38`), so the generated schema validates *through* the
  reference rather than treating it as unknown.

**Refusal modes.** Six, four shipped and two new:

| kind | law | shipped |
|---|---|---|
| `underivable` | a `hole` is authoring-only and never derives from catalog data | `codegen.ts:76` |
| `underivable` | unknown kind — the grammar grows under 004, never by admission on faith | `:132` |
| `underivable` | this check name has no v0 builder | `:117` |
| `underivable` | the ref does not resolve — supply a catalog read | `:125` |
| `digest-mismatch` | the structure does not hash to the digest it claims (§2.4) | **new** |
| `scheme-unknown` | this generator was not built against that identity scheme (D4) | **new** |

The `ref does not resolve` refusal inherits issue #41's lesson directly: it
must carry the missing digest *and* a legal next step naming the catalog
read, or it is the one refusal in the family that cannot teach its own repair.

**A corpus gap, measured.** The check table has seven names
(`minLength, maxLength, pattern, greaterThan, min, lessThan, max`;
`codegen.ts:45-53`) and its author-side inverse has the matching seven
(`author.ts:44-60`). The frozen corpus exercises **one**: `check-min-length`
(`proto/wire/fixtures/types.json`, 18 vectors). Under ADR-0007 — a wall
certifies only its corpus — six of the seven check clauses are **unwalled**,
and the failure mode is silent: two hand-kept tables that disagree on an
args key name produce a *different but well-formed* schema. Promotion should
either add six fixtures or merge the two tables into one bidirectional
registry so disagreement is a type error rather than a fixture's job.

---

## 4. The drift-free claim, made precise

### 4.1 What IS proven

> **L-DERIVE (SHIPPED for the effect-schema target).** For every structure
> in the frozen corpus, `foldSchema(toEffectSchema(structure, resolve))`
> yields the corpus's pinned canonical bytes and pinned digest.
> `proto/ts/test/codegen.test.ts:128-141`, over the 18 vectors of
> `proto/wire/fixtures/types.json`.

Read exactly: the generator is a **catamorphism over committed identity**,
and composed with the author fold in the other direction it is the identity
on digests. Same digest in ⇒ same schema out, because the fold has no input
other than the structure and the structure's identity is committed. Two
companion laws sharpen it:

- **Cross-target derivability consistency** (`codegen.test.ts:144-151`,
  1000 runs): if one target refuses, all three refuse, at the same path.
- **Traversal is in identity order** (`codegen.test.ts:153-217`, D48 and the
  astral-key case): the first path that refuses is a well-defined fact —
  construction history never leaks into evidence (`CONTEXT.md:210-217`).

Bounds, stated: 18 vectors; one of seven check names; the effect-schema
target only (the other two have no inverse fold, so this law is not even
*expressible* for them); and `bytes-sha256-v1`, which is attestation-grade.

### 4.2 What is NOT proven — and the jewel

**The generator's own correctness is not touched by any of the above.** This
is the honest edge, and it deserves the sharpest possible statement:

> A generator bug reproduces **deterministically**. Content addressing makes
> a wrong artifact *stable*, *cacheable*, and *federated* — it does not make
> it right. Determinism is a property of the derivation; correctness is a
> property of the algebra, and no amount of the first buys any of the second.

Worse, L-DERIVE is *blind to a whole class of bugs by construction*: it
composes the generator with its own inverse, so any error the two tables make
**symmetrically** cancels. If `CHECK_BUILDERS` and `CHECK_TABLE` both agree
that `maxLength` means minimum, the digest round-trips perfectly and every
generated validator is wrong. A wall between two things that share a bug
proves only consensus (`AGENTS.md`, *walls need independent oracles*).

So the round-trip that matters is not the syntactic one. It is:

> **L-ACCEPT (the jewel; RATIFIED-UNBUILT).** For every cataloged type `t`
> and every value `v`:
>
> ```
> is(generate_effect(t))(v)   ⟺   certify_daemon(t, v) accepts v
> ```
>
> The generated validator accepts **exactly** the language the certifier
> accepts. Not a subset (the client would send bytes the daemon refuses —
> the round-trip cost is not closed). Not a superset (the client would refuse
> bytes the daemon accepts — the generated type is a lie about the catalog).

This is the claim that licenses the flagship. Everything in §1 Rank 1 is
worth building *because* of it, and nothing in L-DERIVE implies it.

### 4.3 The test shape for L-ACCEPT

The law is quantified over *values of the type*, which is why §1 Rank 5
matters: nothing in the repo can currently produce them.

**Shape, three layers.**

1. **A type arbitrary.** Already exists in prototype form —
   `codegen.test.ts:38-70` builds `flb.type.v0` structures with fast-check
   (`decidedLeafArbitrary`, recursive struct/union/list builders). Promote it
   out of the test file; it is a reusable instrument.
2. **A value arbitrary, per type.** `Schema.toArbitrary(generate_effect(t))`
   — compose Effect's, do not write a fold. This is Rank 5's whole content.
3. **The differential, with an oracle outside both sides.** For each
   generated value: run the generated `Schema.is`, and independently ask the
   **Go daemon** to accept or refuse the same canonical bytes against the
   same cataloged digest. Assert agreement on the boolean, and — the stronger
   form — assert agreement on the *refusal path* when both refuse, which is
   already the estate's granularity (`(Law, Path)`,
   `docs/design/2026-08-14-learning-by-refutation.md:118-149`).

The Go daemon is the right oracle precisely because it shares no code with
the TS generator: independent implementation, digest-anchored input,
different language. This is the estate's standing wall discipline
(ADR-0001, `CONTEXT.md:69-77`) applied to the semantic fold family, and it is
what stops L-ACCEPT from degenerating into another both-sides-agree.

**Negative controls, one per generator clause — a prover that cannot fail
proves nothing.** The discipline is mechanical here in a way it rarely is:
each clause of the fold has an obvious sabotage, and each must be refuted by
a *named* law.

| Sabotage | Must go red on |
|---|---|
| drop `minLength` from `CHECK_BUILDERS` | L-DERIVE (refusal at `:117`) |
| swap `min` and `max` args keys in both tables | **L-ACCEPT only** — L-DERIVE cancels it. The control that proves L-DERIVE is insufficient. |
| render optional fields as required | L-ACCEPT (values missing the field) |
| drop `additionalProperties:false` (JSON Schema) | L-ACCEPT against the JSON Schema validator |
| render `brand` as its base | L-DERIVE (digest moves) |
| inline a `ref` instead of declaring it | L-DERIVE (digest moves) |
| render `union` members in submission order | neither — union order is normalized away (`walk.go:158-174`); correctly not a bug |

The second row is the load-bearing one: it is the negative control whose
**only** refuter is L-ACCEPT, and it is therefore the control that justifies
building L-ACCEPT at all. Ship it red first, as evidence, per the standing
findings-before-fixes rule.

**Golden outputs: yes, and subordinate.** Frozen golden artifacts per
`(generator digest, type digest)` are the right regression net for the
*source* targets (1b, 2, 4) where the output has bytes, and they belong in
`proto/wire/fixtures/` under the same freezing discipline as
`types.json` — a mismatch is evidence, not a constant to update
(`AGENTS.md`, `CONTEXT.md:78-81`). But a golden output pins *what this
generator did*, never *whether it was right*. Goldens catch drift; L-ACCEPT
catches wrongness. Both, in that order of authority.

---

## 5. User stories

Strict form. Each starts at *"I have a certified digest"* — the deploy→types
half of the journey belongs to the sibling DX lane and is not restated here.
Each carries the law that licenses it and the refusal that bounds it.

**S1 — Validate before I send.**
As a TypeScript developer holding a certified digest, I want an Effect Schema
for it in my process, so that a malformed value is refused at my keyboard
instead of after a network round-trip.
*Law:* L-ACCEPT — the generated validator accepts exactly what the daemon
accepts. *Refusal:* `underivable` naming the node path my type uses that this
generator's version cannot express. *Evidence it is needed:* issue #41's
measured 11-calls-for-a-7-call-path.

**S2 — Regenerate and see nothing change.**
As a developer, I want to re-run generation on an unchanged digest and get
byte-identical output, so that my diff is empty and my review is about my
code.
*Law:* output = fold(generator, type); the cache key is
`(generator digest, type digest)` and there is nothing to invalidate.
*Refusal:* a cache conflict — the same key already names different bytes —
surfaced rather than resolved, exactly as `foldCache.ts:77-84` does.

**S3 — Know what generated my file.**
As a reviewer, I want every generated artifact to carry the type digest, the
type's identity scheme, the generator name and its code digest, so that I can
recompute the artifact and check the claim myself.
*Law:* every field of a provenance claim is recomputable by an auditor
(`CONTEXT.md:171-176`). *Refusal:* `digest-mismatch` — the structure does not
hash to the digest it claims. *Blocked by:* §2.4; today the Go emitter stamps
whatever string the caller passed.

**S4 — Get the whole graph, or a refusal that tells me what is missing.**
As a developer generating a type that references others, I want the ref
closure resolved before generation, so that I get one complete artifact set
or one actionable refusal — never a half-generated tree.
*Law:* the catalog is a DAG by construction (`walk.go:11-14`), so the root
digest determines the closure. *Refusal:* the unresolved digest **and** the
catalog read that would fetch it — issue #41's lesson, applied so that
codegen does not repeat `unknown-ref`'s teaching failure.

**S5 — Hand an agent a tool schema I did not write.**
As an agent-tooling author, I want a cataloged type to become an MCP
`inputSchema` and `outputSchema` without a hand-written mapping, so that a
new request kind cannot drift from its advertised tool.
*Law:* ADR-0006 — external surfaces are derivation targets, never
hand-written ports. *Refusal:* `underivable` on any node the target cannot
render. *Status:* `inputSchema` **SHIPPED** (`mcp.ts:33`); `outputSchema`
is issue #17 and is unblocked — the reply and refusal terms are already
declared v0 structs on the wire (`contract.go:124-132,208`), so the fix is
this family's generator applied to `request.reply` instead of only
`request.body` (§1 Rank 2).

**S6 — Pin my build to a type, not to a version number.**
As a build engineer, I want `foldlab-codegen <digest>` in my build script, so
that my generated code is pinned to a content address and a rebuild on a
different machine at a different time produces the same bytes.
*Law:* the fold is a function of its input alone; the input's identity is
committed. *Refusal:* `scheme-unknown` — my pinned generator was not built
against the identity scheme this digest was committed under (D4: a scheme
bump is a new scheme, never a silent re-derivation).

**S7 — Learn that my generator is wrong, from something that did not help me
write it.**
As a maintainer, I want the generated validator differentially tested against
the Go daemon over generated values, so that a symmetric bug in the two TS
tables is caught by something that shares no code with either.
*Law:* L-ACCEPT (§4.2), with the daemon as an independent oracle. *Refusal:*
a minimized counterexample value plus both sides' verdicts — reported and
stopped on, never repaired first.

**S8 — Trust a wall that can fail.**
As a reviewer of this family, I want each generator clause to ship a
sabotage that is refuted by exactly the law it dropped, so that a green suite
is evidence rather than decoration.
*Law:* `AGENTS.md` — a prover that cannot fail proves nothing; every gate
ships its negative controls with traces committed. *Refusal:* the
swap-`min`-and-`max` control, which L-DERIVE **cannot** catch, is the one
that licenses building L-ACCEPT.

---

## 6. Labels, and what this document does not claim

**SHIPPED:** three folds over `flb.type.v0` (`proto/ts/src/codegen.ts`); the
syntactic round-trip wall over 18 vectors; cross-target derivability
consistency and identity-order traversal; JSON Schema feeding MCP
`inputSchema`.

**RATIFIED-UNBUILT (by this document, pending operator grilling):**
`effectSchemaSource`; the `Certified` / `Closure` / `Provenance` interface
and its two new refusal kinds; L-GEN-ID; the codegen derivation cache;
L-ACCEPT and its negative-control battery; the library → CLI → derived-MCP-tool
seam order.

**ASPIRATIONAL:** the generator as declared data (foundry-era, ticket 015 §4);
the Go decode wall; the Arbitrary target beyond its role as L-ACCEPT's
instrument.

**Not claimed.** That codegen is correct — §4.2 is written specifically to
prevent that reading. That L-DERIVE generalizes beyond its 18 vectors or
beyond the effect-schema target. That `bytes-sha256-v1` is more than
attestation-grade. That issue #17 is *closed* by this family — the generator
supplies the schema, but choosing the envelope's discriminant shape and
writing the negative control that fails if it regresses to a bare union are
#17's own work, in `proto/ts/src/mcp.ts`. And that the fold cache is
ready to receive this family: it has no production consumer, its signature
does not fit, and its stated standing limit is benign only for the consumer
it does not yet have.
