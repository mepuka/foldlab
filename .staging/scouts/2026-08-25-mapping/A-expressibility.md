# Scout A — expressibility probe: what the ratified Lean carrier can express today

Status: **G0, pre-grade evidence.** Advisory only; no design authority is claimed and nothing here
is a ruling. Every claim carries a file:line citation or verbatim tool output, or is written as
`UNVERIFIED`. Produced 2026-08-25 against the working tree at `/Users/pooks/Dev/foldlab`.

Toolchain and build state, verbatim from `~/.elan/bin/lake build` with cwd
`/Users/pooks/Dev/foldlab/formal/entity-store`:

```
info: E2/Gates.lean:43:0: e2 opaque/unsafe gate ok (1217 constants scanned)
info: E2/Gates.lean:45:0: 'E2.Correspondence.tags_distinct' does not depend on any axioms
info: E2/Gates.lean:46:0: 'E2.directionA' depends on axioms: [propext, Classical.choice, Quot.sound]
...
Build completed successfully (15 jobs).
```

Probe files: `p00`–`p09` beside this document. Each was elaborated with
`~/.elan/bin/lake env lean <abs path>` from cwd `/Users/pooks/Dev/foldlab/formal/entity-store`.
All ten exit 0 — re-verified from this directory after copying. The captured run is
`A-TRANSCRIPT.txt`. Every `#eval` result quoted below is copied from that transcript. All addresses use the toy injective hash
`toyH : List UInt8 → Address := fun b => (⟨b⟩ : Address)`, so an address equality below is a
**byte-string equality of the pre-image** — it holds for every `H` whatsoever, which is the
point (§Loss classes, L-3509).

---

## Result first

**1. Under the most natural one-term-per-variant mapping, the 21 Effect AST variants receive 14
distinct addresses.** Five collision groups (`p07_rollup.lean`, verbatim):

```
14
[["Any", "Unknown"], ["BigInt", "Number"], ["Literal", "UniqueSymbol"], ["Null", "Undefined", "Void"],
  ["String", "Symbol", "TemplateLiteral"]]
```

**2. Every one of those collisions is breakable — through the `Check` `{id, payload, aborted}`
channel, and only through it.** Re-spelling the collapsed leaves as `.refine leaf (.filter
"lab/keyword/<Tag>" .vnull false)` restores 21 distinct addresses (`p08_escape_hatch.lean`:
`21` distinct, collision list `[]`). The price is measured: **nine minted check ids with no
counterpart in the pinned Effect source**, a leaf growing from **2 bytes to 23**, and every
former leaf becoming a `refine` whose conformance now depends on `ConformsEnv.checkSem`
(proved in `p08`, `kw_needs_checkSem`). So the mapping question is not "can the carrier express
it" — it is **"which distinctions do we buy R-4 allowlist entries for."**

**3. Three variants are genuinely inexpressible, not merely collapsed**, because the missing
thing is a constructor and no re-spelling recovers it:

- **`Declaration`** — no opaque-named node, and `typeParameters` has nowhere to go: `Check`'s
  payload is a `Value` (`Core.lean:57`) and `Value` has no schema-valued constructor
  (`Core.lean:34-41`), so `Option<String>` cannot carry `String` as an argument (`p06`).
- **Tuple-with-rest** (the `Arrays` case with both `elements` and `rest`) — every workaround
  changes the *value* shape, proved: the flat value Effect accepts is **rejected** by the nested
  encoding (`p03`, `flat_rejected`).
- **Index signatures** (`Objects.indexSignatures`) — object conformance is **exact-width**;
  there is no `ConformsF` rule admitting a value field the schema does not name
  (`Model.lean:211-218`), proved twice in `p03` (`object_exact_width`, `object_rejects_excess`).

**4. Two carrier behaviours push information *into* identity that the source does not consider
identity-bearing** — the `#2787` shape rather than the `#3509` shape:

- **The `mu` discriminator is in the pre-image** (`Encode.lean:120`), so two alpha-equivalent
  recursive schemas that accept exactly the same values get two addresses (`p05`). This is the
  precise inverse of Unison, where `Abs` emits no tokens at all (`unison-hashing.md` §3 rule 1).
- **A mutually recursive group has one address per entry point.** `type A = {a: B|null};
  type B = {b: A|null}` is expressible — nested `mu` with `var 1` is closed and guarded
  (`p05`, `closedB 0 && guardedB` → `true` for both) — but `mutualFromA` and `mutualFromB` are
  two terms with two addresses, where Effect has one `references` table holding both
  (census §6, line 819).

**5. Two hard blockers that are not tag-loss at all.** `Value` has **no float** (`Core.lean:30-32`,
"no float"). So Effect's `Number` — the most common schema in any real codebase — cannot type
`1.5`, and `Literal(1.5)` has no term whatsoever. This is *rejection*, not collapse: admission
must turn away schemas, not merely lose a distinction. Likewise a check whose parameter is
non-integral (`greaterThan(1.5)`) is unwritable (`p04`).

---

## Loss classes — the frame the case studies supply

Three classes, used as a column in the table below. The first two are the two shipped Unison
defects, which `hash-db-anatomy.md` §3.4/§3.5 places at exactly the layer this probe is about.

| Class | What it means | Canonical instance |
|---|---|---|
| **L-3509** | The carrier holds a distinction the encoder drops. Two distinct sources produce **one byte string**, hence one address — *"collision guaranteed by arithmetic, not by luck"* (`hash-db-anatomy.md` §3.4). No cryptographic assumption is engaged. | Unison `Decl = Either EffectDeclaration DataDeclaration`; the `Left`/`Right` bit is stripped, parked in a side map and re-attached after hashing (`Convert.hs:251-267`), so `structural type Void` and `structural ability Void` share an address — issue #3509, still open (`hash-db-anatomy.md` §3.4) |
| **L-2787** | The dual. The encoder **admits** information the intended equivalence class does not contain, so one intended object has many byte forms, chosen by something the class does not care about (`hash-db-anatomy.md` §3.5) | Unison tied cycle members fall back on `Ord v` **name** order — names leak back into a hash the ABT design erased |
| **L-prec** | Effect's *own* persistence codec drops the same thing, so the loss is not a divergence from the source's notion of identity | `Arrays.isMutable` is absent from `Representation.Arrays` and never restored on revival (census §4, lines 517 and 618-620) |

The operator's framing is the right one: **L-3509 is the failure mode to fear**, because the
address layer cannot help. `hash-db-anatomy.md` §1.1 states it in one line — *"If `encode` is not
injective, the cryptographic assumption buys you nothing at that point."*

---

## Per-variant table

Order follows `experiments/entity-store-extract/inventory.json`. "Closest term" is the single
representative used in `p07_rollup.lean`; alternatives and their costs are in the loss ledger below.

| # | Variant | Closest carrier term (Lean) | Verdict | Loss class | Receipt |
|---|---|---|---|---|---|
| 1 | `Any` | `.mu "any" (.union .anyOf (.cons (.prim .null) … (.cons (.array (.var 0)) .nil)))` | **INEXPRESSIBLE** (no top type) | L-3509 | `p01`: `encSchema eAny` = `[57, 3, 97, 110, 121, 53, 0, 6, 48, 0, 48, 1, 48, 2, 48, 3, 58, 52, 56, 0]`; `closedB 0 && guardedB` → `true`; address equals `Unknown`'s → `true` |
| 2 | `Arrays` | `.tuple (.cons (.prim .str) (.cons (.prim .int) .nil))` / `.array e` | **COLLAPSE** (elements-only or rest-only); **INEXPRESSIBLE** (both) | L-prec (`isMutable`), L-3509 (element optionality), structural (tuple-with-rest) | `p03`: `encSchema arrTuple` = `[51, 2, 48, 3, 48, 2]`; `flat_rejected` proved; `p09`: `2^k` union blow-up, `13` vs `35` bytes |
| 3 | `BigInt` | `.prim .int` | **COLLAPSE** | L-3509 | `p01`: `eNumber == eBigInt` → `true`; address `[1, 0, 48, 2]` shared |
| 4 | `Boolean` | `.prim .bool` | **DIRECT** | — | `p01`: `encSchema eBoolean` = `[48, 1]`; round-trip and `canonS` fixpoint → `true` |
| 5 | `Declaration` | `.refine anyApprox (.filter "effect/schema/DateFromSelf" .vnull false)` | **INEXPRESSIBLE** | L-2787 (base choice) + structural (`typeParameters`) | `p06`: two encodings of one Declaration have different addresses → `true`; `optionOfStringPayloadAttempt` degrades the parameter to a string name |
| 6 | `Enum` | `.union .anyOf (.cons (.lit (.vstr "r")) (.cons (.lit (.vstr "g")) .nil))` | **COLLAPSE** | L-3509 (member names) | `p02`: `enumColor == enumFruit` → `true` (different names, same address); order preserved, `canonS` fixpoint → `true` |
| 7 | `Literal` | `.lit (.vstr "hello")` | **COLLAPSE** for string/bool/bigint/integral-number; **INEXPRESSIBLE** for non-integral number | L-3509 (number vs bigint; and vs `UniqueSymbol`) | `p02`: `litNum == litBig` → `true`, address `[1, 0, 49, 18, 0, 42]`; `lit_exact` proved |
| 8 | `Never` | `.union .anyOf .nil` | **COLLAPSE** (derived form, not a tag) | L-2787 (two spellings) | `p01`: `never_uninhabited` and `never'_uninhabited` **proved**; `anyOf`-nil address `[1, 0, 53, 0, 0]` ≠ `oneOf`-nil `[1, 0, 53, 1, 0]` |
| 9 | `Null` | `.prim .null` | **DIRECT** (but shares its address, see §Undefined/Void) | L-3509 | `p01`: `encSchema eNull` = `[48, 0]`; equal to `Undefined` and `Void` encodings → `true` |
| 10 | `Number` | `.prim .int` | **COLLAPSE** + **REJECTION** of non-integers | L-3509 | `p01`: shares `[1, 0, 48, 2]` with `BigInt`; `Core.lean:30-32` — "no float" |
| 11 | `ObjectKeyword` | `.object .nil` | **INEXPRESSIBLE** | L-3509 | `p03`: `object_exact_width` **proved** — `.object .nil` accepts only `.vobj .nil` |
| 12 | `Objects` | `.object (.cons "a" (.prim .str) false .nil)` | **DIRECT** for string keys + optionality; **INEXPRESSIBLE** for symbol keys and index signatures | L-3509 (`isMutable`, symbol keys), structural (index sigs) | `p03`: `encSchema objAB` = `[50, 2, 1, 97, 0, 48, 3, 1, 98, 1, 48, 2]`; `objAB` vs `objBA` — two terms (`false`), one address (`true`) |
| 13 | `String` | `.prim .str` | **DIRECT** (shares with `Symbol`) | L-3509 | `p01`: `encSchema eString` = `[48, 3]` |
| 14 | `Suspend` | `.mu "L" (.object (.cons "next" (.union .anyOf (.cons (.var 0) …)) false .nil))` | **COLLAPSE** (explicit binder for a thunk) | L-2787 (binder name in the address; entry-point choice) | `p05`: `closedB 0 && guardedB` → `true`; conformance derivation for `twoCell` **proved**; renamed binder gives a different address → `true` |
| 15 | `Symbol` | `.prim .str` | **INEXPRESSIBLE** (collapsed onto `String`) | L-3509 | `p01`: `encSchema eSymbol == encSchema eString` → `true` |
| 16 | `TemplateLiteral` | `.prim .str`, or `.refine (.prim .str) (.filter "effect/schema/isPattern" {source,flags} false)` | **COLLAPSE** | L-3509 (pattern erased under (a)); L-2787 (three spellings under (b)/(c)) | `p06`: collapse (a) shares `String`'s address `[1, 0, 48, 3]`; collapse (b) round-trips → `true`; collapse (c) enumerated is `27` bytes and unavailable for infinite parts |
| 17 | `Undefined` | `.prim .null` | **INEXPRESSIBLE** standalone; **DIRECT** in the optional-property position | L-3509 | `p01`: encoding equals `Null`'s → `true`; `p07`: `optProp` ≠ `reqProp` address → `true`, both value shapes accepted (`opt_present`, `opt_absent` derivations) |
| 18 | `Union` | `.union .anyOf (.cons (.prim .str) (.cons (.prim .int) .nil))` | **DIRECT** | (see note on `oneOf` semantics) | `p04`: `encSchema uAny` = `[53, 0, 2, 48, 3, 48, 2]`, `uOne` = `[53, 1, 2, 48, 3, 48, 2]`; member order preserved by `canonS` → `true` |
| 19 | `UniqueSymbol` | `.lit (.vstr "my/registered/symbol")` | **COLLAPSE** (registered) / **INEXPRESSIBLE** (local) | L-3509 | `p02`: `uniqSym == plainStrLit` → `true` — indistinguishable from a string literal of the same text |
| 20 | `Unknown` | same term as `Any` | **INEXPRESSIBLE** | L-3509 | `p01`: address equals `Any`'s → `true` |
| 21 | `Void` | `.prim .null` | **INEXPRESSIBLE** (collapsed onto `Null`) | L-3509 | `p01`: `(addressS toyH eNull).bytes == (addressS toyH eVoid).bytes` → `true` |

Aggregate checks over all 21 mapped terms (`p07`, verbatim): round-trip `true`, `canonS` fixpoint
`true`, `closedB 0 && guardedB` `true`. Every term in the table is a legal, well-formed, canonical
carrier value that decodes back to itself.

---

## Loss ledger — what each non-DIRECT verdict actually costs

**§1 The keyword nullaries (`Null`/`Undefined`/`Void`, `Number`/`BigInt`, `Any`/`Unknown`,
`String`/`Symbol`).** Twelve Effect nullary variants map onto seven addresses (`p01`: `12` in,
`7` out). This is **L-3509 in its purest form**: Effect declares 21 distinct `_tag` string
literals (census §7, line 839) and its own persistence `Representation` union keeps all 21 plus
`Reference` (census §4, lines 406-428) — so the source unambiguously considers these distinct,
and the carrier merges them at layer (b). The Unison parallel is exact: the `Either` bit was
routed around the encoder *for convenience*, and the resulting address collision is free and
reproducible. Nothing about SHA3-512 is relevant to it (`hash-db-anatomy.md` §1.1).

**§2 `Enum` member names.** `enums: ReadonlyArray<readonly [string, string|number]>` (census §1,
line 96) is kept faithfully by Effect's own lowering (census §4, line 534). A union-of-literals
collapse keeps the values and drops the names, so two enums with different member names and the
same values are one entity (`p02`: `enumColor == enumFruit` → `true`). **L-3509.** The
name-preserving alternative — an `.object` keyed by member name — changes the type's meaning from
"one of these values" to "a record with these fields", and its encoding differs
(`p02`: `encSchema enumColor ≠ encSchema enumAsObject` → `true`).

**§3 `Literal` and the missing float.** Effect's `LiteralValue` is `string | number | boolean |
bigint` (census §1 line 77, `SchemaAST.ts:1289`), with non-finite numbers rejected at construction
(1327-1329). The carrier gives string, boolean and unbounded-integer literals directly, merges the
integral `number` literal with the `bigint` literal (`p02`: `litNum == litBig` → `true`), and has
**no term at all** for `Literal(1.5)`. The two nearest spellings both change what the value plane
holds (`p02`: `litHalfAsString`, `litHalfAsRatio`). This is not L-3509 — it is a domain gap, and it
propagates to `Check` payloads too, where `Schema.Json` admits JS numbers but `Value` does not
(`p04`: `greaterThan(1.5)` unwritable; `greaterThan(3)` exact,
address `[1, 0, 54, 48, 2, 32, 25, …, 18, 0, 3, 0]`).

The dual is worth recording: **`.lit` is strictly *wider* than Effect's `Literal`.** `.lit .vnull`,
`.lit (.varr …)`, `.lit (.vobj …)` and `.lit (.vaddr …)` all round-trip (`p02`, four `true`s) and
have no Effect counterpart. Admission must narrow `.lit`, or the carrier admits schemas that
cannot have come from the source — a **L-2787** shape.

**§4 `Arrays`.** Three sub-cases with three different verdicts.
*(a) elements only* → `.tuple`, near-direct. *(b) rest only* → `.array`, near-direct. *(c) both* →
**no constructor exists**, and this is the sharpest structural finding in the probe, because the
workaround is provably wrong at the value plane. `TupleWithRest([String, Number], Boolean)` accepts
`["a", 1, true, false]`; the nested spelling `.tuple [str, int, .array bool]` accepts
`["a", 1, [true, false]]` and **rejects** the flat value — proved in `p03` as `flat_rejected`. The
flattening spelling `.array (union …)` loses position entirely and accepts elements in the wrong
order (`p03`, worked example). Beyond that: `isMutable` has no slot (**L-prec** — Effect's own
codec drops it and never restores it, census §4 lines 517 and 618-620), and per-element optionality
has no slot either (`SchemaList.cons hd tl`, `Core.lean:88-89`, versus `FieldList.cons key val
optional rest`, `Core.lean:86`), forcing a `2^k` union blow-up (`p09`: `13` bytes for 2 members
versus `35` for 8, against `12` bytes for the object-side spelling that carries the flag).

**§5 `Objects`.** The string-keyed, optionality-bearing part is direct and clean. Three things are
missing. (i) Per-property `isMutable` (`SchemaAST.ts:578`) — **L-3509**, though note Effect *does*
keep this one on the object side (census §4 line 517 explicitly contrasts it with the array side),
so unlike `Arrays.isMutable` this loss is **not** precedented. (ii) Symbol-valued property keys
(`name: PropertyKey`, `SchemaAST.ts:1975`) — the key is a `String`, so a symbol key must be
re-spelled and collides (`p06`-shape argument, `p03` receipt). (iii) Index signatures — no
constructor, and the exact-width conformance proof (`p03`, `object_exact_width` and
`object_rejects_excess`) shows why no finite `.object` term substitutes. The nearest expressible
shape is an array of key/value records, which changes the entity's value from `{x: 1}` to
`[{k:"x",v:1}]` (`p09`).

One divergence worth naming as a *deliberate* choice rather than a loss: **R-10 sorts object field
names, and Effect does not.** `canonS objAB == canonS objBA` → `true` while `objAB == objBA` →
`false` (`p03`). The census is explicit that Effect's property order is AST order, is observable in
encoded output, and comes from `Reflect.ownKeys` (§5b, lines 710-747). The lab is normalizing away
something the source observes — formally an **L-2787**-adjacent move — but Q11's record already
weighed and rejected the mechanical-fidelity reading, "per the closure-identity precedent"
(`STORE-MODEL.md` §7, Q11). Recorded here for completeness, not reopened.

**§6 `Suspend` / recursion.** The de Bruijn `mu`/`var` pair is a genuine improvement on a thunk,
and mutual recursion *is* expressible by nesting (`p05`, both directions closed and guarded). Two
costs, both **L-2787**.

First, **the binder name is inside the pre-image.** `encSchema (.mu d body) = 0x39 :: (encStr d ++
encSchema body)` (`Encode.lean:120`), and `canonS` leaves the discriminator alone (`Canon.lean:37`).
So `listSchema` and `listSchemaRenamed` — alpha-equivalent, accepting exactly the same values —
are two entities (`p05`, `≠` → `true`). Unison's design goes the other way on purpose: *"`Abs`
contributes no tokens at all… The binder's name never reaches the hash"* and `Var` emits a de Bruijn
index (`unison-hashing.md` §3, rules 1-2), which is the mechanism behind the thesis
`language-design-case-studies.md` §4 records as *"The hash of a term or type is its true name"*
with names as separately-stored metadata. The carrier has the de Bruijn half and not the erasure
half. `STORE-MODEL.md` §8 already prices this ("the discriminator is the one priced carve-out"),
so the question is whether the price was quoted against this consequence.

Second, **one group, two addresses.** Because WF3 makes the store's reference graph a DAG
(`STORE-MODEL.md` §3), two `.ref`-linked schema objects can never be mutually recursive, so a
mutually recursive group must live inside one addressed unit. That is exactly the ruling
`hash-db-anatomy.md` §7.2 extracts from all four systems — *"Make the strongly-connected component
the unit of addressing"* — but the same section states the bill: *"The cost of admitting cycles is
that you owe a total, tie-free canonical order."* Nested `mu` does not pay that bill; it picks an
entry point instead, so `mutualFromA` and `mutualFromB` are two terms and two addresses (`p05`,
`≠` → `true`). Effect's answer is one flat `references` table covering both roots (census §6,
line 819).

A compensating strength: **guardedness is a real filter.** `guardedB (.mu "x" (.var 0))`,
`guardedB (.mu "x" (.union .anyOf (.cons (.var 0) .nil)))` and the `refine` variant all return
`false`, while `array` and `object` bodies return `true` (`p05`, five `#eval`s). Effect rejects
none of these; its lowering mints a synthetic `${_tag}_` name rather than failing (census §6,
lines 799-801). The census already flags this as a deliberate strengthening that means the lab
"must **reject** schemas that Effect happily serializes" (§6, lines 828-830). This probe confirms
the mechanism exists and works.

**§7 `Declaration`.** Census §1 lines 55-60 is the governing finding — *"IDENTITY LIVES IN A
FUNCTION"*, and the only serializable identity is an **optional** `representation` annotation.
Three attempts, all recorded in `p06`. (i) `.refine anyApprox (.filter repId …)` — well-formed and
round-tripping, but the base is not a top type, so every `vobj` value is rejected outright, and the
approximation's member list becomes part of the declaration's identity. (ii) `.refine (.prim .int)
(.filter repId …)` — works when the runtime type is known, but gives a *different address* from
(i) for the *same* Effect Declaration (`p06`, `≠` → `true`). Since `getExpected()` bottoms out at
the literal string `"<Declaration>"` (census §1 line 60), nothing in the AST determines the base:
**the admitter picks, and the address follows the admitter** — L-2787. (iii) `typeParameters`
cannot be carried at all: `Check.filter`'s payload is a `Value` (`Core.lean:57`) and `Value` has no
schema constructor, so `Option<String>` degrades to a string *name* of a schema with nothing
relating it back to a `SchemaCore` (`p06`, `optionOfStringPayloadAttempt`). Effect's own
representation keeps `typeParameters` as recursively lowered `Representation`s (census §4, line 513).

**§8 Cross-cutting — `checks`.** The serializable triple `{id, payload, aborted}` maps exactly
(`Core.lean:56-58` mirrors census §2b), including `aborted`, which is identity-relevant and moves
the address (`p04`, `≠` → `true`). Two structural mismatches. (i) **Arity**: Effect attaches a
non-empty *array* of checks to one node (`SchemaAST.ts:612, 640`); the carrier attaches one check
per `.refine`, so multiple checks become nesting. Order survives, which is right — Effect resolves
a node's user-facing annotations off the **last** check (census §2a, lines 199-210) — but
`.refine (.refine s c1) c2` and `.refine s (.filterGroup [c1, c2])` are two spellings of the same
Effect node with two addresses (`p04`, `≠` → `true`). **L-2787.** (ii) **`Filter.annotations`**
(`SchemaAST.ts:3210`) and `FilterGroup.annotations` (3258) have no slot at all.

**§9 Cross-cutting — the annotation bag.** `Base.annotations` (`SchemaAST.ts:639`) has no carrier
slot. Two consequences separate cleanly. `identifier` — which the census marks **semantic**
("reference naming, `$defs` keys, recursion identity", §2a line 232) and which *is* Effect's
recursion identity by default policy (§6 line 816) — survives on a recursive node, re-homed as the
`mu` discriminator, and is dropped everywhere else (`p06`: two differently-identified `String`s
share an address, `true`). `brands` — also marked semantic, nominal typing, `SchemaAST.brand`
3564-3568 — is a nominal distinction between structurally identical types, which is precisely what
an address is supposed to preserve; with no slot, `Brand<string,"UserId">`,
`Brand<string,"OrderId">` and plain `string` are one address (`p06`, two `true`s). **L-3509, and
the most consequential instance of it in this report**, because branding is how application code
says "these two strings are not interchangeable".

The escape hatch applies here too and it is the same one: `.refine (.prim .str) (.filter
"effect/schema/brand" (.vstr "UserId") false)` separates them (`p06`, `≠` → `true`).

**§10 Cross-cutting — `encoding`, `encodingChecks`, `constructorDefault`.** All absent from the
carrier by construction, stated at `Core.lean:67-69`. **L-prec throughout**: `Representation` has
no `encoding` field on any variant, `encodingChecks` is never read by the lowering, and
`constructorDefault` is dropped (census §4, lines 512-516). The lab is not diverging from the
source's identity notion here; it is following it.

**§11 A semantic gap not visible in the syntax.** `UMode` is carried and is identity-relevant
(`p04`: `anyOf` and `oneOf` have different addresses, `true`), but `Conforms` does not use it:
`union_mem` picks *some* member, so a value satisfying two members of a `oneOf` union is still
accepted, and two distinct derivations of the same judgment exist (`p04`, two worked `example`s).
Effect's `oneOf` fails on a second success (`SchemaAST.ts:3071-3073`, census §5a). So the mode is
in the address without being in the semantics — the carrier can distinguish two schemas it cannot
tell apart behaviourally. Flagging, not ruling.

---

## The five hardest calls

Each is stated as a question with the evidence for both sides. None is answered here.

### 1. Do the keyword nullaries get minted check ids, or do they collide?

`Null`/`Undefined`/`Void` are one address; `Number`/`BigInt` are one; `Any`/`Unknown` are one;
`String`/`Symbol` are one (`p01`, `p07`).

*For collapsing.* `STORE-MODEL.md` §8 excludes "runtime semantics of schemas, values, Effect, or
JavaScript" — and `Void`, `Any`, `Unknown` are TypeScript type-system distinctions with no distinct
*runtime* content. Separating them costs nine minted ids that cannot be justified by citing a
`representation` annotation Effect actually emits (unlike `effect/schema/isFinite` and
`effect/schema/isPattern`, census §2b line 301-302), grows a 2-byte leaf to 23 bytes, and makes
every keyword's conformance depend on a `checkSem` ruling (`p08`, all measured).

*Against.* This is textbook L-3509. Effect declares 21 distinct `_tag`s (census §7 line 839) and
its persistence codec preserves every one of them (census §4 lines 406-428) — the source considers
them distinct and says so twice. `hash-db-anatomy.md` §3.6 lists "Routing carrier information
*around* the encoder for convenience (#3509)" in the **Leave** column of its take-from-Unison
table. Concretely: a name view pointing at "the Void schema" would resolve to the Null schema, and
`resolve_S` would return `.prim .null` for something a user put in as `Schema.Void` — breaking
L-faithful's promise (*"What you get is what you put, up to exactly the declared equivalence, and
nothing coarser"*, `STORE-MODEL.md` §4) unless the declared equivalence is amended to say these
*are* equivalent.

**The question:** is `Schema.Void ≈ Schema.Null` a ruling the lab is prepared to write into the
R-10 equivalence table explicitly — or is the collapse an accident of the carrier that R-2 should
close with nine allowlist entries?

### 2. Is `Number` allowed to mean `Int`, and if not, what happens to every real schema?

*For the current position.* R-11 already ratified integer literals only (`Core.lean:31-32`).
Floats put IEEE-754 in the pre-image, and `unison-hashing.md` §10 item 4 names float hashing as
"a portability hazard", with open question 6 recording that no test pins the hash of `NaN`, `-0.0`
or subnormals. `hash-db-anatomy.md` §7.1's argument for keeping the version byte in the pre-image
applies with force here: a later float decision changes every address.

*Against.* Unlike every other row in this report, this is **rejection, not collapse**. `Schema.Number`
is the most common leaf in any real Effect codebase, and `Value` cannot type `1.5` at all
(`Core.lean:30`). The consequence reaches the entity plane, not just the schema plane: no entity
whose value contains a non-integer can be stored. It also blocks the check channel — `greaterThan(1.5)`
has no payload (`p04`). No allowlist entry rescues this; it needs a `Value` constructor.

**The question:** is the v1 admission function expected to *reject* every schema containing a
non-integral `Number`, and is that acceptable as a v1 boundary — or does `Value` need a float (or
a decimal) constructor before the mapping is usable on real input?

### 3. Does the `mu` discriminator belong in the pre-image?

*For keeping it.* `STORE-MODEL.md` §8 already names it as "the one priced carve-out". D1 (pairwise
distinct discriminators, §5 clause 3) needs the string to exist. Census §6 lines 821-830 states
plainly that a mandatory discriminator is strictly stronger than what Effect guarantees — Effect
synthesizes `Objects_` rather than failing — and calls this "a design choice to make deliberately,
not a gap to close". Without it, two structurally distinct recursive schemas are distinguishable
only by minting order.

*Against.* It makes the address **alpha-variant**: renaming a recursive type mints a new entity
(`p05`). That is L-2787 — the encoder admitting information the intended class does not contain —
and it is the exact property Unison spent its design budget removing (`unison-hashing.md` §3;
`hash-db-anatomy.md` §3.6 puts "Binder erasure inside the encoder … alpha-invariance by
construction, not by a pass" in the **Take** column). It also interacts with call 5: since the
discriminator is the re-home for Effect's `identifier` annotation, and `identifier` on a *recursive*
node is exactly what Effect uses as the `$ref` key, the lab is importing a nominal, optional,
synthesizable string into a structural identity.

**The question:** should the discriminator be in the *carrier* (for D1 and for readable
`$ref`-style rendering) but *erased by `canonS`* before encoding — recovering alpha-invariance while
keeping the D1 admission check — or is nominal recursion identity the intended semantics?

### 4. Tuple-with-rest and index signatures: extend the carrier, or reject them?

Both are inexpressible today, and both correspond to heavily used constructors
(`Schema.TupleWithRest`, `Schema.Record`).

*For extending.* Two constructors close it — something of the shape
`tupleRest (elems : SchemaList) (rest : SchemaCore)` and `record (key : SchemaCore) (val : SchemaCore)`.
The survey's measured verdict is that the mutual-monomorphic shape's cost is "generated text, which
is the cheap axis here" (`lean-metaprogramming-survey.md` §4), so adding constructors to existing
mutual members is cheaper than the same move on a nested carrier — `induction` still works and
`deriving DecidableEq` still works.

*Against.* Every existing M1–M18 statement and every proved theorem is over the current carrier, and
the survey's own table (§4) records that the mutual shape buys ergonomics by paying with a re-proved
lemma set per type. More sharply: **both workarounds change the entity's value shape, not just the
schema's** (`p03` `flat_rejected`, `p09` index-signature-as-pair-array). So this is not a change
that can be deferred and patched later — entity addresses computed under the workaround would not
survive the extension.

**The question:** is the v1 carrier frozen against these two, with admission rejecting them and the
rejection documented as a known boundary — or does R-2 add the constructors now, before any entity
addresses are minted under a workaround?

### 5. `Declaration` — reject it, or mint an opaque named node?

*For rejecting.* Census §1 lines 169-170 recommends exactly this: admissible only via a named
registry keyed on `annotations.representation.id`, **reject when absent**. Effect's own
`fromRepresentation` throws `"Missing representation annotation"` (census §4 line 607), and its JSON
codec makes `Declaration.representation` *required* on the wire (census §4 line 583) even though the
TS interface marks it optional. Rejecting is the behaviour the source itself exhibits at its
persistence boundary.

*Against.* Rejecting Declaration rejects `Schema.Date`, `Schema.Option`, `Schema.Map` and every
`Schema.declare` in user code — census §7 line 902 calls Declaration "the intended extension point".
And the `refine`-over-approximation workaround is worse than rejection, because it silently produces
**two addresses for one Declaration** depending on which base the admitter chooses (`p06`), which is
L-2787 with the admitter — not the source — as the deciding party. A minted node of shape
`decl (id : String) (payload : Value) (params : SchemaList)` fixes both: it gives `typeParameters`
a home (which no `Check` payload can, since `Value` has no schema constructor) and removes the base
choice entirely.

**The question:** does the carrier mint a `decl` constructor with a `SchemaList` of type parameters,
or does v1 reject Declaration outright and accept that the mapping covers no parametric or
user-declared type?

---

## What this probe did not establish

- **I did not read the pinned Effect source.** Every Effect-side fact is taken from
  `docs/entity-store/research/schema-ast-census.md` and
  `experiments/entity-store-extract/inventory.json`, cited by their own file:line receipts. The
  census's own §8 "Honest gaps" (nine items) carries forward unchanged into this document.
- **UNVERIFIED: that Effect actually constructs the AST shapes I assumed for the surface syntax
  examples** (`{ a?: string }` as `optionalKey(Union([String, Undefined]))`; `TupleWithRest`'s
  `rest[0]`/`rest[1..]` layout). Checked: census §2d line 380 and §1 line 118 respectively. Not
  checked: any `Schema.*` combinator, since none was run.
- **`Conforms` has no `Decidable` instance**, so nothing here was decided by `decide`. Conformance
  claims are hand-built derivations (positive) or `cases`-based refutations (negative), each
  elaborated by the kernel. M18 remains a stated `Prop` (`Model.lean:347-352`).
- **The toy hash is `fun b => ⟨b⟩`, not SHA3-512.** Consequently every address claim above is a
  claim about **pre-image bytes**. Collision claims therefore hold for *every* `H` — which is the
  substance of the L-3509 point, not a weakness of the method. Separation claims (`≠`) are weaker:
  they say the pre-images differ, and lifting them to address separation needs `hInj`, exactly as
  `ObligationDirectionB` states (`Obligations.lean:71-73`).
- **No claim about admission.** I constructed terms the carrier accepts; whether the admission
  function *would* produce them from Effect input is a separate lane. R-2 (the admitted enumeration)
  and R-4 (the check-id allowlist) are both open, and several of the terms above depend on R-4.
- **I did not measure elaboration cost at scale.** All terms here are small. The survey's finding
  that `String`-valued work does not scale under `decide`/`rfl`
  (`lean-metaprogramming-survey.md` "Result first" item 3) was not re-tested and may bear on any
  future decision procedure over these mappings.
