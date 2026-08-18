# The kernel-conformance interchange schema, v1

Date: 2026-08-18. Status: NORMATIVE for the interchange file; the
producing and consuming code is specified elsewhere.

This document defines `kernel-conformance.ndjson` — the file through
which the Lean kernel model hands its tables to everything that is not
Lean. It is the contract three build lanes work against in parallel, so
it is written to be read cold, by someone who has never opened a Lean
file.

## 0. What this file is, in one paragraph

There is a mathematical model of a small language, written in Lean and
machine-checked. The model defines a closed vocabulary of *acts* (the
things a program can do), a closed vocabulary of *refusals* (the reasons
an act is rejected before it ever runs), and a canonical way to write an
act down as a list of numbers. Implementations of that language exist in
other languages — TypeScript today, potentially Go — and they need the
same vocabulary. Rather than have humans retype the tables into each
implementation and hope they stay in sync, the model **emits** them as a
data file, and each implementation **derives** its constants from that
file. This document specifies the file.

### House terms, glossed once

- **The kernel model** — `verify/kernel`, a self-contained Lean package.
  Its job is to state and prove properties of the act language.
- **The fabric model** — `verify/fabric`, an independent Lean package
  modelling the concrete storage substrate. It already emits a
  conformance file of its own; that is the precedent this schema
  follows.
- **Declaration kind** — the category of thing a name refers to
  (`schema`, `program`, `policy`, and nine more). There are exactly
  twelve and the list is closed.
- **Digest** — a content address: the identity of a value, derived from
  its bytes. In the model a digest always carries the *kind* of thing it
  names, so a program digest and a policy digest are different types and
  cannot be compared. This is called *branding*.
- **Brand** — a piece of information carried in a value's *type* rather
  than in its data, so that mixing two differently-branded values is a
  compile-time error rather than a runtime bug.
- **Act** — one lawful sentence of the language. There are eight
  generators: `declare`, `resolve`, `emit`, `join`, `fold`, `decide`,
  `trigger`, `spawn`.
- **Candidate act** — a sentence as an agent might *spell* it, including
  unlawful spellings. Unlawful acts are deliberately spellable so that
  the system can refuse them and teach why.
- **The door** — the single function that turns a candidate act into
  either a lawful act or a refusal. Nothing else constructs a lawful
  act.
- **Taught refusal** — a refusal that carries the law it defends and a
  concrete repair. The model makes this total: a reason that has no law
  and no repair cannot exist.
- **Hole** — a declared parameter of a program, not a wildcard. A hole
  passes through five *stages* as it is filled, disputed, decided, and
  sealed.
- **Planted candidate** — a committed unlawful example, one per refusal
  reason, that the model's gate re-runs to prove the door still refuses
  it. Together with one lawful example (which must be *admitted*), these
  form the model's negative-control arm.
- **Gate** — a shell script that re-verifies a package from scratch and
  exits nonzero if anything drifted. `verify/kernel/run.sh` is the
  kernel's.
- **NDJSON** — newline-delimited JSON: one complete JSON value per line,
  no enclosing array.

### What this file is not

The vectors in this file check an implementation against the *model's
verdicts*. They do not promote the model's theorems into guarantees
about any running system. A conforming implementation is one whose door
refuses the same candidates for the same reasons and encodes the same
acts the same way — nothing more is claimed, and nothing more should be
read into a green conformance run.

## 1. The frozen grammar (v1)

The real artifact lives at
`packages/plait/fixtures/kernel-conformance.ndjson` and is written only
by the model-end lane. Where this document is silent, the model-end
lane's implementation is normative and integration reconciles.

### 1.1 File rules

- LF line endings (`\n`). No CR bytes anywhere.
- One compact JSON object per line, no whitespace between tokens.
- ASCII only.
- Keys in exactly the order shown below, per record type.
- Deterministic record order, as listed below.
- No timestamps, no commit hashes, no floats.
- The file ends with a newline.

### 1.2 Record grammar, in file order

**1. Header** — exactly one, on line 1:

```json
{"record":"header","format":1,"generator":"verify/unity emit","source":"verify/kernel","counts":{"kind":12,"stage":5,"refusal":16,"type":<n>,"encoding":<n>,"admission":17}}
```

`counts` MUST equal the emitted record counts.

**2. Kind** — twelve lines, in rank order (`schema` .. `language`,
ranks 0..11, per `Kernel.DeclKind.rank`):

```json
{"record":"kind","name":"<DeclKind constructor name>","rank":<nat>}
```

**3. Stage** — five lines, in rank order (`opened` .. `sealed`):

```json
{"record":"stage","name":"<HoleStage constructor name>","rank":<nat>}
```

**4. Refusal** — sixteen lines, in `RefusalReason` declaration order,
with texts verbatim from `Kernel.taught` and marks from
`Kernel.RefusalReason.applicability`:

```json
{"record":"refusal","reason":"<RefusalReason.wire>","law":"<taught law text>","repair":"<taught repair text>","applicability":"machine-applicable"|"advisory"}
```

**5. Type** — the mini-AST, exactly the closed list in §1.4, in
`Kernel/Definitions.lean` declaration order:

```json
{"record":"type","name":"<Lean short name>","form":"inductive"|"structure","params":[{"name":"<param>","role":"brand"|"type"}],"constructors":[{"name":"<ctor>","fields":[{"name":"<field or arg name>","type":"<schema type reference>"}]}]}
```

**6. Encoding** — at least one vector per generator (eight generators),
including `Planted.lawfulDeclareAct`:

```json
{"record":"encoding","name":"<vector name>","act":[<encodeAct output as a JSON array of nats>]}
```

The emitter MUST check `decodeAct(encodeAct act) = some act` for every
vector at emit time and abort nonzero on failure.

**7. Admission** — seventeen lines: the sixteen planted unlawful
candidates in the kernel gate's `check_control` order, then the lawful
twin:

```json
{"record":"admission","name":"<Kernel.Planted def name>","verdict":"refused","reason":"<RefusalReason.wire>"}
{"record":"admission","name":"lawfulDeclare","verdict":"admitted","encoded":[<encodeAct of the admitted act>]}
```

### 1.3 Field-by-field semantics

#### Header

| Field | Meaning |
|---|---|
| `record` | Discriminator. Always the literal `"header"`. |
| `format` | Major version of this grammar. See §4. A consumer that does not know this integer MUST refuse the file. |
| `generator` | The command that produced the file. Provenance for a human reading a diff; consumers MUST NOT branch on it. |
| `source` | The model the tables describe (`"verify/kernel"`). |
| `counts` | Per-record-type counts. A self-check, not a hint: a consumer MUST compare each against the records it actually read and refuse on any disagreement. Keys appear in the fixed order `kind, stage, refusal, type, encoding, admission`. |

#### Kind and stage

| Field | Meaning |
|---|---|
| `name` | The Lean constructor's short name, e.g. `schema`, `opened`. Note the deliberate spelling `opened`: the protocol stage is named *open*, but `open` is a Lean keyword, so the constructor takes the past participle. Consumers rendering protocol prose may map it back. |
| `rank` | The model's numeric rank. Ranks are dense and ascending from zero, and rank order equals file order. **Rank is wire-stable within a format**: it is what an encoded act carries, so renumbering a kind is a format bump, not an edit. |

The kind rank is not decoration. `Kernel.encodeAct` writes
`kind.rank` into the canonical framing of a `declare` and a `resolve`,
so two systems disagreeing about a rank disagree about the identity of
every declaration.

Stage rank is *ordinal*: the model reads a stage only in the
reached-at-least direction (`sealed` has reached `filled`). Consumers may
therefore compare stage ranks with `>=` but MUST NOT infer that the
difference between two ranks means anything.

#### Refusal

| Field | Meaning |
|---|---|
| `reason` | The stable wire identifier, e.g. `clock-read`. This is the join key for the whole schema — admission records reference it, and consumers key their error vocabulary on it. Lowercase, hyphen-separated. |
| `law` | The rule the refusal defends, in prose, verbatim from the model. Many carry a parenthesised law name (`(f11_query_deterministic)`) naming a theorem in the fabric model. Consumers MUST treat this as opaque display text. |
| `repair` | The legal next move, in prose, verbatim from the model. |
| `applicability` | `machine-applicable` when the lawful rewrite is a function of the refused candidate alone — an agent may apply it mechanically with no new information. `advisory` when the repair needs something the candidate does not carry (a token to hold, a value to declare, an authority to request). Exactly four rows are machine-applicable. |

The `applicability` split is what makes the taught table a codemod
catalog rather than a message catalog. The four machine-applicable
repairs are: drop the anchor (`anchored-resolve`), resolve instead of
trusting bytes (`unverified-read`), rewrite an in-place update as a
successor declaration pinning its predecessor (`past-mutation`), and drop
the unlawful strategy so the declared algebra governs
(`last-writer-wins`).

**Refusal parity is total.** A row with an empty `law` or an empty
`repair` is malformed: the model's `taught` function is total by
construction, and the door never refuses without teaching.

#### Type

| Field | Meaning |
|---|---|
| `name` | The Lean short name, without the `Kernel.` namespace prefix. |
| `form` | `inductive` for a sum type (several constructors, each with its own fields); `structure` for a product type (exactly one constructor). |
| `params` | The type's parameters, in declaration order. |
| `params[].role` | `brand` when the parameter exists to keep values apart rather than to carry data — the *kind* of a `Digest`, the *register* of a `Token`, the *partition* of a `Position`, the *fold* and *partition* of an `AnchorFact`. `type` is reserved for a genuine universe-level type parameter. In the v1 closed list every parameter is a `brand`; `type` is enumerated so that admitting a parameterised type later is not a format bump. |
| `constructors[].name` | The constructor's short name. A `structure` in Lean has exactly one constructor, conventionally `mk`. |
| `constructors[].fields` | The constructor's fields (for a structure) or arguments (for an inductive), in declaration order. |
| `fields[].type` | A **schema type reference**, per §1.5. |

#### Encoding

| Field | Meaning |
|---|---|
| `name` | A vector label. Stable within a format; not a Lean name in general, though `lawfulDeclareAct` is one. |
| `act` | The output of `Kernel.encodeAct` as a JSON array of naturals. Element 0 is the generator tag: `0 declare, 1 resolve, 2 emit, 3 join, 4 fold, 5 decide, 6 trigger, 7 spawn`. Arity is fixed per generator — 4, 3, 3, 3, 8, 4, 6, 3 for tags 0..7 respectively — so a decoder can dispatch on length and tag alone. |

The encoding is the model-level statement of content addressing: an act's
identity *is* its canonical framing. The byte-level canonicalizer's own
injectivity is a separate obligation, walled where that machinery lives
and not claimed here.

#### Admission

| Field | Meaning |
|---|---|
| `name` | The `Kernel.Planted` definition name of the candidate act. |
| `verdict` | `refused` or `admitted`. |
| `reason` | Present on `refused` rows only. Names a `refusal` record's `reason`. |
| `encoded` | Present on `admitted` rows only. The `encodeAct` of the act the door admitted the candidate to. |

The seventeenth row exists to refute the door that refuses everything. A
conformance suite that only checks refusals proves nothing about a door;
the lawful twin is not optional.

### 1.4 The closed type list

Exactly these twenty-two, in `Kernel/Definitions.lean` declaration order,
so `counts.type` is **22**:

`DeclKind`, `Digest`, `Value`, `StateLabel`, `Petname`, `Token`,
`LanePartition`, `Position`, `AnchorFact`, `HoleStage`,
`KTriggerPredicate`, `Act`, `RawArg`, `CandidateAnchor`, `TokenClaim`,
`MergeStrategy`, `CandidatePredicate`, `CandidateAct`, `RefusalReason`,
`Refusal`, `Applicability`, `Door`.

The list is a deliberate slice, not everything the model declares. Types
that exist only to state or prove propositions — `Unlawful`,
`ProgramAdmission`, `World.Le`, `ComposedExecution` — are outside it,
because they describe the model's reasoning rather than its data. So are
types that belong to machinery no implementation mirrors (`AdmitResult`,
`GenTag`, `ProgramNode`, `World`). Adding a type to the list is an
add-only change within format 1 (§4); removing one is a format bump.

### 1.5 Schema type references

A field's `type` is a string in this grammar:

```
ref     ::= name | name "(" arg ("," arg)* ")"
arg     ::= name
name    ::= [A-Za-z][A-Za-z0-9]*
```

Three classes of head name occur:

1. **Leaves.** `Nat` (a non-negative integer) and `String`.
2. **Declared types.** Any `name` in the §1.4 list, e.g. `Value`,
   `HoleStage`, `CandidatePredicate` (which is recursive — the
   `negation` constructor takes a `CandidatePredicate`).
3. **Containers.** `List(T)` and `Option(T)`, each with exactly one
   argument.

One further name occurs as a leaf without having a `type` record of its
own: **`Ref`**, the model's abbreviation for the pair
`(DeclKind, Nat)` — a kind-tagged reference, the one lawful way a
heterogeneous collection of digests is carried. It is a Lean `abbrev`
rather than an inductive or a structure, so it has no declaration to
emit. Consumers MUST accept `Ref` as a declared leaf and expand it to a
kind-plus-identifier pair. It appears only in `Door.catalog` and
`Door.pinned`.

**Brand arguments come in two forms**, and a consumer must handle both:

- A **literal kind**: `Digest(program)` — the argument is one of the
  twelve `DeclKind` constructor names, so the brand is fixed at the
  declaration site. Occurs in `LanePartition.lane`, `Act.declare.writ`,
  `Act.emit.lane`, and others.
- A **bound name**: `Digest(kind)`, `Token(register)`,
  `Position(partition)`, `AnchorFact(declared,partition)` — the argument
  names an *earlier field or parameter of the same constructor*, so the
  brand is fixed per value rather than per declaration. `Act.resolve`
  takes `kind : DeclKind` then `target : Digest(kind)`: the target's
  brand is whatever the caller passed as the kind.

The distinction is the whole difficulty of the mapping layer, and §3
addresses it directly. Resolution rule: an argument that matches a
`DeclKind` constructor name is a literal kind; otherwise it must match
the `name` of a preceding field or param in the same constructor, and a
consumer MUST refuse a reference that matches neither.

### 1.6 Worked example

The complete `Act.fold` constructor, as it appears inside the `Act` type
record:

```json
{"name":"fold","fields":[{"name":"declared","type":"Digest(index)"},{"name":"partition","type":"LanePartition"},{"name":"anchor","type":"AnchorFact(declared,partition)"},{"name":"query","type":"Value"}]}
```

Read: a `fold` names an index declaration by its digest, a lane
partition, an anchor branded by *that* fold and *that* partition, and a
query value. Because the anchor's brands are bound names, an anchor from
a different fold does not typecheck — the model has no syntax for
replaying an anchor anywhere but its own fold and partition.

## 2. Determinism

Every one of these rules exists so that two runs of the emitter, and two
readings by different consumers, produce the same bytes and the same
meaning.

1. **Record order is total.** Types in the order given in §1.2; within
   `kind` and `stage`, by rank ascending; within `refusal`, by
   `RefusalReason` declaration order; within `type`, by
   `Kernel/Definitions.lean` declaration order; within `admission`, by
   the kernel gate's `check_control` order with the lawful twin last.
   Nothing is sorted alphabetically at emit time.
2. **Key order is fixed and is NOT alphabetical.** This is the single
   most likely place to get the emitter wrong. Lean's `Json` type is
   backed by a sorted map, so `Json.compress` on a `Json.mkObj` renders
   keys in alphabetical order — which the fabric emitter's own output
   demonstrates (`{"command":...,"counts":...,"format":...,"generator":...,"vectors":...}`).
   Every record type in this schema is in a non-alphabetical order, so
   **the kernel emitter cannot use `Json.compress` on a `mkObj`.** It
   must render each line from an ordered sequence of pairs.
3. **No incidental data.** No timestamps, no commit hashes, no absolute
   paths, no host names, no iteration over an unordered container.
4. **No floats.** Every numeric position is a natural number. A `1.0`,
   an exponent, or a minus sign is malformed, not a lenient equivalent.
5. **ASCII only.** The taught law and repair texts are already pure
   ASCII in the model; a future law text using a typographic dash or a
   non-breaking space would break this rule and must be transliterated
   at the source rather than escaped at the emitter.
6. **Byte-identical regeneration.** Re-running the emitter over an
   unchanged model must reproduce the file byte for byte. This is
   existing house discipline, already enforced for the fabric corpus,
   and it is the property that makes the file reviewable as a diff.

## 3. Mapping tables: the flexibility layer

The schema is deliberately language-neutral, which means each target
language loses something. This section says exactly what.

### 3.1 To TypeScript

TypeScript has structural typing and full erasure: nothing survives to
runtime. Brands are therefore *comments the compiler enforces* — the
standard trick is an intersection with an otherwise-unused property.

| Schema | TypeScript | Notes |
|---|---|---|
| `Nat` | `number` (or `bigint`) | See the width caveat below. |
| `String` | `string` | |
| `List(T)` | `readonly T[]` | |
| `Option(T)` | `T \| undefined` | Or the estate's `Option` if one is in use at the call site. |
| kind record | `const KINDS = [...] as const; type DeclKind = typeof KINDS[number]` | The literal union is the closed universe; adding a kind is a compile error at every exhaustive switch. |
| `rank` | `const KIND_RANK: Record<DeclKind, number>` | Generated, never typed by hand. |
| stage record | same shape; plus `stageReached(a, b) => RANK[a] >= RANK[b]` | |
| refusal record | `type RefusalReason = "clock-read" \| ...` plus a generated `TAUGHT: Record<RefusalReason, Refusal>` | The wire reason *is* the TypeScript type. |
| `Digest(program)` | `type ProgramDigest = number & { readonly __kind: "program" }` | A string-literal brand. Two kinds do not unify; the brand name comes from the emitted kind table. |
| `Digest(kind)` (bound) | `type Digest<K extends DeclKind> = number & { readonly __kind: K }` | A genuine phantom type parameter. When the caller's kind is statically known, cross-kind mixing is a compile error. |
| `Token(register)` (bound to a *value*) | `type Token<R extends ProgramDigest> = ...` only when the register is a literal type | See below. |
| `type` record | a discriminated union per `inductive`; an interface per `structure` | `{ readonly _tag: "declare"; readonly kind: DeclKind; ... }`. |
| encoding vector | `readonly number[]` fixture | |
| admission vector | test table | |

**Where TypeScript falls short.** A brand parameter bound to a *value*
(the register of a token, the partition of a position) can be tracked
only when that value's type is a literal. In real code a register is a
digest computed at runtime, so its type is `ProgramDigest`, not a
singleton — and every token collapses to `Token<ProgramDigest>`. The
cross-register refusal that the Lean elaborator performs must therefore
be a runtime check in TypeScript, exactly as in Go. The compile-time
guarantee TypeScript *does* buy is the kind brand, because a kind is a
literal from the closed twelve.

**Two caveats worth pinning.** First, `number` is IEEE-754: naturals
above 2^53 lose precision, and the sample's real `lawfulDeclareAct`
encoding already contains `7000051000172` — comfortably inside the safe
range, but the model's `canonicalBytes` fold multiplies by 1000003 per
argument, so a longer payload exceeds it quickly. Encoding vectors
should be carried as `bigint` or as strings, not `number`. Second, the
standing runtime pin finding stands: in the Effect version in use, type
identities are string-literal brands, not unique symbols, so brand names
must come from the emitted kind table rather than from locally minted
symbols.

### 3.2 To Go

Go has nominal typing: a *defined type* (`type ProgramDigest uint64`) is
a genuinely distinct type from its underlying type and from every sibling
definition. That gives kind brands directly and at compile time.

| Schema | Go | Enforcement |
|---|---|---|
| `Nat` | `uint64` | |
| `String` | `string` | |
| `List(T)` | `[]T` | |
| `Option(T)` | `*T`, or `(T, bool)` | |
| kind record | `type DeclKind uint8` + one constant per kind at its rank, `String()`, and `DeclKindFromRank(uint8) (DeclKind, bool)` | The decoder refuses an out-of-range rank rather than saturating. |
| stage record | `type HoleStage uint8` + `Reached(target) bool` | |
| refusal record | `type RefusalReason uint8`, `RefusalTable [16]Refusal`, `Taught()`, `RefusalByWire()`, and a `RefusalError` implementing `error` | The taught table becomes the caller-facing diagnostic vocabulary. |
| `Digest(program)` | `type ProgramDigest uint64` | **Compile-time.** Verified. |
| `Digest(kind)` (bound) | one defined type per kind; the generic caller takes an interface or a `Ref` pair | |
| `Token(register)` (bound to a value) | `struct { register ProgramDigest; value uint64 }`, unexported fields, constructor `NewToken`, guarded accessor `Spend(register) (uint64, error)` | **Run-time only.** |
| `Position(partition)` | same pattern; `Compare(other) (int, error)` refuses cross-partition | **Run-time only.** |
| `type` record (`inductive`) | a sealed interface with an unexported marker method, or a tagged struct | Go has no sum types. |
| `type` record (`structure`) | a struct | |

**Correction to a common assumption: Go does have phantom types.** Since
generics landed, a type parameter that appears nowhere in a struct's
body is legal, so `type Token[R any] struct{ value uint64 }` compiles,
and `Token[ProgramBrand]` and `Token[LaneBrand]` are distinct types.
Verified by compiling both arms against Go 1.26.5
(`scratch/km-polyglot/brand-probe/run.sh`, which pins these diagnostics
and fails if either arm changes behaviour):

```
refused.go:15:11: invalid operation: p == q (mismatched types ProgramDigest and PolicyDigest)
refused.go:18:6: cannot use u (variable of struct type Token[LaneBrand]) as Token[ProgramBrand] value in assignment
```

Both the defined-type brand and the phantom-generic brand are genuinely
enforced by the Go compiler. **The recommendation is still the
defined-type-per-brand pattern**, for three reasons: a phantom parameter
must be written at every mention of the type and Go infers nothing for
it; it does not solve the hard case anyway, because a *value*-level brand
(the specific register that issued a token) still has no type to become;
and a per-kind defined type is exactly twelve declarations, all
generated.

**What Go cannot enforce, stated plainly.** In Lean the forbidden
comparison *has no type* — there is nothing to write. In Go there is
always something to write:

1. **Untyped constants leak.** `d == 3` compiles for any branded `d`,
   because an untyped constant adopts the branded type. Verified.
2. **Explicit conversion leaks.** `PolicyDigest(p)` compiles for any
   `p` of any integer-based brand, always, with no unsafe marker.
   Verified.
3. **Value-level brands cannot exist.** Go has no dependent types, so
   `Token(register)` and `AnchorFact(declared,partition)` become data
   plus a runtime check. This is not a workaround that recovers the
   property; it moves a compile-time refusal to a runtime one, and a
   caller who ignores the returned `error` gets nothing.
4. **`inductive` has no faithful encoding.** A sealed interface prevents
   outside implementations but not a `nil` interface value, and a type
   switch is not checked for exhaustiveness.

**What a vet-style lint would need to cover.** A `go vet` pass or a
custom `golang.org/x/tools/go/analysis` analyzer would need four checks
to close the gap, in decreasing order of value:

1. **Conversion between brand types is a finding** unless the
   destination is the underlying type at a serialization boundary
   explicitly marked with a directive comment. This closes leak 2, the
   worst one, because it is silent and always available.
2. **Comparison or arithmetic between a brand type and an untyped
   constant is a finding**, except against a designated zero. This
   closes leak 1.
3. **A discarded `error` from a brand-guarded method** (`Spend`,
   `Compare`) **is a finding.** `errcheck` covers this today; it must be
   mandatory rather than advisory, because these are the only place the
   value-level brands live.
4. **A type switch over a sealed act interface that lacks a case per
   generator is a finding.** This recovers exhaustiveness, which the
   compiler does not give.

Checks 1 and 2 have no standard implementation and would have to be
written. That cost is the honest price of the Go target, and it should
be paid before, not after, any Go consumer is wired to the artifact.

### 3.3 To prose

The taught table is not merely renderable as documentation — it *is*
documentation, and treating it as anything else duplicates it. The
rendering is mechanical:

| Record | Renders as |
|---|---|
| header | A provenance line naming the source model and format, plus a do-not-edit banner. |
| kind | A rank/name table, prefaced by the sentence that the universe is closed. |
| stage | A rank/name table, prefaced by the reached-at-least reading. |
| refusal | One section per reason: the wire name as heading, then **Law**, **Repair**, **Applicability**. This is the reference an agent reads when the door refuses it. |
| refusal (filtered) | A second table of just the machine-applicable rows: the codemod catalog. |
| type | One section per type: name, brand parameters called out as brands, then a bullet per constructor listing its fields with their type references. |
| encoding | A vector/encoding table. |
| admission | A candidate/verdict/reason table — the door's behaviour as a specification a reader can check by eye. |

Two rules keep the rendering honest. First, the law and repair texts are
reproduced **verbatim**; a renderer that paraphrases has forked the
model. Second, the conformance section carries the safety disclaimer
from §0 — a reader who meets the vectors without it will read them as
runtime guarantees.

A working renderer and its 422-line Markdown output are in
`scratch/km-polyglot/render-prose.ts` and
`scratch/km-polyglot/prose-sample.md`.

## 4. Versioning discipline

- **`format` is a major-only integer.** There is no minor version and no
  semantic-version string. It starts at 1.
- **Any grammar change bumps it.** A new key, a removed key, a reordered
  key, a changed key order, a changed record order, a changed field
  meaning, a renamed record type, a removed record type, a changed
  encoding tag or arity, a renumbered kind or stage rank, or a renamed
  wire reason — all of these are format bumps. There is no such thing as
  a compatible reorder, because key order is normative.
- **Consumers MUST refuse an unknown format.** Not warn, not
  best-effort, not degrade: refuse, with a nonzero exit or a thrown
  error naming both the format found and the format understood.
  Best-effort parsing of an unknown grammar is how a wrong table reaches
  production silently.
- **Record types are add-only within a format.** A new record type may
  be introduced without a bump, provided it is appended after all
  existing record types in file order and existing records are untouched.
  Consumers MUST skip unrecognised record types rather than fail — this
  is the one place leniency is correct, and it is what makes the add-only
  rule usable.
  - Corollary: a consumer MUST NOT validate `counts` by requiring that
    its keys be exactly the six it knows. It must check that every key it
    knows is present and agrees; an unknown counts key belongs to an
    unknown record type and is skipped with it.
  - Corollary: adding a *type* to the §1.4 closed list, or an encoding
    vector, is add-only. Removing one is a bump.
- **The wire reason is the stable identifier.** Consumers key on
  `reason`, never on a refusal's position in the file. Positions are
  stable within a format but are not the contract; only `rank` is
  wire-stable in the stronger sense, because it is carried inside
  encodings.
- **Editing a `law` or `repair` text is not a bump.** These are display
  strings. But it does change the artifact bytes, so it lands with a
  regenerated fixture in the same commit, and any consumer asserting on
  the text (a prose snapshot, a golden test) updates in that commit too.

## 5. Go viability survey

Surveyed against the worktree at branch `agent/kernel-model`, HEAD
`6470495d6`.

### 5.1 What exists

Seven `go.mod` files:

| Path | Module | Status |
|---|---|---|
| `go/go.mod` | `foldlab` | **The live substrate module.** Go 1.26; `canonical/` (RFC 8785 JCS), `journal/` (CAS-append, verify-on-read), `register/` (the five-action commitment register), and three commands. Depends on the pinned NATS libraries. |
| `proto/go/go.mod` | `foldlab/proto` | Live; `replace foldlab => ../../go`. |
| `docs/media/folding/scripts/refusal/go.mod` | — | Documentation media script. |
| `docs/research/reference/rq1-lean-c-backend/minimal-example/go-host/go.mod` | — | Research reference. |
| `docs/research/reference/rq3-wasm-verified-target/gen/go.mod` | — | Research reference. |
| `docs/research/reference/rq3-wasm-verified-target/gowasi/go.mod` | — | Research reference. |
| `docs/research/reference/rq3-wasm-verified-target/host-wazero/go.mod` | — | Research reference. |

There is no `go.work`, so the modules are independent. The toolchain
present is Go 1.26.5 windows/amd64.

### 5.2 Assessment

Go is viable, and more than viable — the estate already runs a
disciplined Go module with a gate contract (`gofmt -l .` prints nothing;
`go vet ./...` and `go test -count=1 ./...` green), and it already
consumes cross-language oracle fixtures from outside its own module
tree: `go/canonical/` reads root `fixtures/**`, and `go/journal/` reads
`proto/wire/fixtures/chains.json`. A kernel-conformance consumer under
`go/` would be doing something the module has done twice already.

Three warnings, all real:

1. **The `-count=1` trap is load-bearing here.** `go/AGENTS.md` records
   the measurement: Go's test cache cannot attribute a mutation in a
   file outside the module root, so `go test ./...` prints `ok (cached)`
   over a mutated oracle. A kernel-conformance fixture living under
   `packages/plait/fixtures/` is exactly such a file. Any Go conformance
   test MUST run with `-count=1`, and its gate line must say so.
2. **Generated Go must be `gofmt`-canonical or byte-identical
   regeneration is unenforceable**, because anyone running `gofmt -w`
   silently changes it. The generator should format its own output with
   `go/format` before writing, not rely on a downstream `gofmt` step.
   (This was found by running it: the first generated file was not
   canonical.)
3. **The brand gap is not closed by the type system alone.** See §3.2.
   A Go consumer without the lint checks has weaker guarantees than the
   TypeScript consumer, which in turn has weaker guarantees than the
   model. That ordering should be stated wherever a Go consumer is
   proposed, not discovered later.

### 5.3 The exemplar

`scratch/km-polyglot/` — **exemplar only**, wired into nothing, its own
isolated module so it joins nothing. Contents and run instructions are
in that directory's `README.md`. It demonstrates:

- a schema-v1 sample written from the model sources
  (`make-sample.ts` → `sample-kernel-conformance.ndjson`, 81 lines);
- a stdlib-only Go generator that validates the artifact against §1 and
  §2 and emits Go (`kmgen.go` → `kmconform/kmconform_exemplar.go`);
- a smoke test proving the generated package compiles and carries its
  tables (`go test -count=1 ./...` → `ok kmconform`);
- eleven single-mutation negative controls plus a positive control for
  the validator (`refusal-controls.sh` → 12 passed, 0 failed);
- the prose rendering (`render-prose.ts` → `prose-sample.md`).

The sample is a *sample*. The real artifact is emitted by executing the
model, per the standing ruling that model/runtime vectors are generated,
never hand-typed.

## 6. The integration validation checklist

The exact checks a consumer runs before trusting an artifact. Every one
of these is mechanical, and every one of them has a corresponding
mutation in `scratch/km-polyglot/refusal-controls.sh` that proves the
check can fail.

### Byte level

1. **No CR bytes.** The file uses LF endings throughout.
2. **All bytes are ASCII** (every byte `<= 0x7F`).
3. **The file ends with exactly one newline**; there is no trailing
   blank line and no line is empty.
4. **Every line parses as a JSON object**, and nothing follows the
   closing brace on a line.
5. **No whitespace between JSON tokens** on any line. (Cheap form:
   re-render each parsed line compactly with the schema's key order and
   compare to the original bytes. This subsumes checks 4, 6, and 7.)
6. **No number carries `.`, `e`, `E`, or a leading `-`.** Every numeric
   position is a natural.
7. **Key order matches §1.2 exactly**, per record type, including the
   inner `counts` object. This requires a streaming or order-preserving
   parse; a decode into a hash map loses it silently.

### Structure

8. **Line 1 is the header**, and there is exactly one header record.
9. **`format` is an integer this consumer knows.** If not, refuse —
   naming both the format found and the format understood. Do not
   attempt a partial read.
10. **Record types appear in the §1.2 file order**, with no interleaving.
11. **Unrecognised record types are skipped, not fatal** (the add-only
    rule), and skipping is logged.
12. **Every `counts` key the consumer knows equals the number of records
    of that type actually read.** Unknown counts keys are skipped with
    their record type.

### Tables

13. **Twelve kind records; ranks dense and ascending from 0 to 11; file
    order equals rank order; names unique.**
14. **Five stage records**, same conditions, 0 to 4.
15. **Sixteen refusal records; `reason` values unique**; every `law` and
    every `repair` non-empty (refusal parity is total); every
    `applicability` in `{machine-applicable, advisory}`; exactly four
    are `machine-applicable`.
16. **Twenty-two type records**, names unique, `form` in
    `{inductive, structure}`, every `params[].role` in `{brand, type}`,
    every `structure` carrying exactly one constructor.
17. **Every `fields[].type` resolves**: its head name is `Nat`,
    `String`, `Ref`, a declared type name, or `List`/`Option` wrapping
    one of those; and every brand argument is either a `DeclKind`
    constructor name or the name of a preceding field or param in the
    same constructor.

### Vectors

18. **At least eight encoding records**, and generator tags 0..7 each
    appear at least once, so no generator is unrepresented.
19. **Each `act` has the arity its tag requires** (declare 4, resolve 3,
    emit 3, join 3, fold 8, decide 4, trigger 6, spawn 3). A consumer
    that implements a decoder MUST additionally round-trip every vector:
    `decode(act)` succeeds and re-encodes to the same array.
20. **Seventeen admission records**: sixteen `refused` then one
    `admitted`, in that order.
21. **Every refused row's `reason` names a refusal record.** Every
    admitted row carries a non-empty `encoded`.
22. **At least one row is `admitted`.** A suite of refusals alone
    cannot distinguish a correct door from one that refuses everything.

### Cross-record invariants

23. **Admission row *i* and refusal row *i* carry the same reason**, for
    *i* in 0..15. The kernel gate's `check_control` order and the
    `RefusalReason` declaration order coincide today; this check pins
    that coincidence so a reorder on either side is caught rather than
    silently accepted. If a future change deliberately breaks the
    alignment, this check is retired by a ruling, not by deletion.
24. **The admitted row's `encoded` equals the `act` of the encoding
    vector named `lawfulDeclareAct`.** These are two emissions of the
    same fact and must agree.

### Provenance and regeneration

25. **`source` is the expected model** and `generator` is the expected
    command. Display only; never branch on them.
26. **Regeneration is byte-identical.** Re-run the emitter over an
    unchanged model and compare hashes. This is the check that makes all
    the others durable, and it belongs in the gate that owns the
    artifact.
27. **Any code generated *from* the artifact is also regenerated
    byte-identically**, and is canonical for its language's formatter
    (`gofmt` for Go), so that a routine format pass cannot silently
    change it.

### The control arm

28. **The consumer's own validator has a negative-control arm**: for
    each check above that matters, a committed single-mutation fixture
    that the validator must refuse, plus the unmutated artifact which it
    must accept. A validator with no failing case proves nothing, and a
    validator that rejects everything proves nothing either.

## 7. Reconciliation items for integration

Points where this document had to resolve something the freeze does not
state. Each is a place the model-end lane's implementation is normative;
if it chose differently, this document is what changes.

| # | Item | Resolution taken here |
|---|---|---|
| R1 | Key order is non-alphabetical in every record type, but Lean's `Json` sorts keys (demonstrated by the fabric emitter's own output). | The emitter must render ordered pairs directly, not via `Json.compress` on a `mkObj`. Flagged as the highest-risk emitter detail. RESOLVED at integration: the emitter ships its own order-preserving writer; the emitted artifact passes the key-order validation. |
| R2 | `Ref` appears as a field type but has no `type` record, being an `abbrev`. | Treated as a declared leaf aliasing the pair `(DeclKind, Nat)`. |
| R3 | The freeze does not name the constructor of a `structure`. | `mk`, Lean's default. RESOLVED at integration: the emitted artifact uses `mk`. |
| R4 | The freeze's type-reference example shows only literal brands (`Digest(program)`). | The grammar admits bound names too (`Digest(kind)`, `Token(register)`), and multi-argument references (`AnchorFact(declared,partition)`) need a comma-separated argument list. Specified in §1.5. |
| R5 | `counts.type` is written `<n>`. | **22**, counted from `Kernel/Definitions.lean` declaration order and matching the freeze's closed list exactly. |
| R6 | `counts.encoding` is written `<n>`. | At least 8, one per generator. The exemplar uses exactly 8. RESOLVED at integration: the normative emission carries exactly 12 — lawful-declare, resolve-schema, emit-lane, join-cell, fold-at-anchor, decide-fenced, five trigger-production vectors, spawn-under-writ — and the runtime tables pin that set. |
| R7 | `params[].role` admits `"type"`, but no type in the closed list has a universe-level parameter. | Documented as reserved, so a later parameterised type is add-only rather than a bump. |
| R8 | The `admission` record has two shapes (`reason` vs `encoded`) and therefore two key orders. | Both pinned in §1.2; a consumer selects the expected key order on `verdict`. |
