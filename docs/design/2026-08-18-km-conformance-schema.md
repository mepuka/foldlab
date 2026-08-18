# The kernel-conformance interchange schema, v2

Date: 2026-08-18. Status: NORMATIVE for the interchange file; the
producing and consuming code is specified elsewhere.

This document defines `kernel-conformance.ndjson` — the file through
which the Lean kernel model hands its tables to everything that is not
Lean. It is the contract several build lanes work against in parallel, so
it is written to be read cold, by someone who has never opened a Lean
file.

Format 2 is a full rewrite of the serialization rules. Format 1 pinned a
bespoke key order per record type; format 2 replaces that with a single
canonical form — **estate canonical JSON** — that every record obeys, and
adds two record groups (`doc` and `canon`). §7 is the migration note.

**The corpus exists.** Everything byte-exact in this document was read
back out of the emitted file at
`packages/plait/fixtures/kernel-conformance.ndjson` — at the time of
format 2's minting, 117 lines and 22632 bytes, LF after every record —
and not typed by hand. Three implementations (Lean in `verify/unity`,
TypeScript in `packages/plait`, Go in `go/kmconform`) demonstrate the
both-ways law of §1.4 over exactly those bytes and construct all ten
canon vectors natively. §8 reports what was measured; §12 records what
that measurement closed.

**A ninth group, `program`, has been added under the add-only rule of
§6** — new group, new counts key, format unchanged at `2`. It carries
the canonical form of a *program declaration*: the DAG of generator
applications that the builder slice
(`docs/design/2026-08-18-km-dag-builder.md`) authors and addresses.
§2.7 specifies it and quotes its four emitted records. Two consequences
ride along and are applied throughout this document: the file's line and
byte totals are measurements of a moment rather than constants of the
format, so every count-shaped rule is stated as a **counts-derived**
rule (`lines == 1 + sum(header.counts)`); and `counts` now names nine
groups, not eight, which is exactly the situation §6's corollaries were
written for. A consumer that skips the `program` group entirely is
still conforming.

## 0. What this file is, in one paragraph

There is a mathematical model of a small language, written in Lean and
machine-checked. The model defines a closed vocabulary of *acts* (the
things a program can do), a closed vocabulary of *refusals* (the reasons
an act is rejected before it ever runs), and a canonical way to write an
act down as a list of numbers. Implementations of that language exist in
other languages — TypeScript and Go today — and they need the same
vocabulary. Rather than have humans retype the tables into each
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
- **The unity bridge** — `verify/unity`, the Lean package that holds the
  laws relating the two models and that carries the emitter for this
  file. `generator` names it.
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
  exits nonzero if anything drifted. `verify/unity/run.sh` owns this
  file.
- **NDJSON** — newline-delimited JSON: one complete JSON value per line,
  no enclosing array.
- **JCS** — RFC 8785, *JSON Canonicalization Scheme*: the published
  standard for turning a JSON value into one and only one byte string.
  §1 says exactly how much of it this schema inherits.
- **Canonical form / canonicalize** — throughout this document these mean
  *estate canonical JSON*, defined in §1, and never any other notion of
  canonical bytes. In particular they are unrelated to
  `Kernel.canonicalBytes`, which is the model's positional fold over act
  arguments.

### What this file is not

The vectors in this file check an implementation against the *model's
verdicts*. They do not promote the model's theorems into guarantees
about any running system. A conforming implementation is one whose door
refuses the same candidates for the same reasons, encodes the same
acts the same way, and serializes the same values to the same bytes —
nothing more is claimed, and nothing more should be read into a green
conformance run.

---

## 1. Estate canonical JSON

Format 2's governing rule is that **every line of the file is the
canonical serialization of its record**. There is no per-record key
order to memorize, no ordered-pair writer to get wrong, and no way for
two producers that both follow this section to disagree about a byte.

### 1.1 What is inherited from JCS, verbatim

RFC 8785 is the reference for member ordering, string escaping, and
structure serialization. Specifically, and with no local change:

- **Object members are sorted by key**, ascending. All keys in this
  corpus are ASCII, so JCS's UTF-16 code-unit ordering, Unicode code
  point ordering, and plain byte ordering all coincide; an
  implementation may sort by bytes and be correct here. (See the honesty
  note at the end of §1.2.)
- **No whitespace anywhere.** No space after `:` or `,`, no indentation,
  no blank lines inside a record.
- **Array element order is preserved.** Arrays are ordered data; sorting
  applies to object members only.
- **String escaping is exactly JCS's.** Escape the reverse solidus
  (`\\`) and the quotation mark (`\"`); use the two-character forms
  `\b \f \n \r \t` for U+0008, U+000C, U+000A, U+000D, U+0009; write
  every other character below U+0020 as `\u00XX` with **lowercase** hex
  digits. **Nothing else is escaped** — not the forward solidus, not any
  character above U+007F.
- **Literals** are `true`, `false`, `null`, lowercase.

### 1.2 The one deviation: numbers

JCS serializes every number as an IEEE-754 double via ECMAScript's
`Number.prototype.toString`. **This schema does not use that rule.**

> **The deviation.** Every number in this corpus is an unbounded
> non-negative integer, serialized as minimal decimal: no exponent, no
> fraction, no leading zeros, no minus sign, and `0` for zero.
> Consumers MUST parse integers at arbitrary precision — Lean `Nat`,
> TypeScript `bigint`, Go `math/big.Int` or a checked fixed width — and
> MUST refuse any input carrying a fraction point, an exponent marker,
> or a minus sign, rather than coercing it.

The rationale is not stylistic. The corpus carries encoding vectors that
are Lean `Nat`s produced by `Kernel.canonicalBytes`, a positional fold
that multiplies by 1000003 per argument. The committed
`lawful-declare` vector already reads `7000051000172` — about 7×10¹² —
from a two-argument payload, and each further argument multiplies by
another million. A handful of arguments crosses 2^53, past which a
double cannot represent consecutive integers, and JCS's serialization
would silently round. A conformance corpus that rounds its own vectors
is worse than no corpus, so the double rule is refused outright rather
than bounded by a comment.

The `big-integer` canon vector (§3) exists to make this failure visible:
its value is 9007199254740993 = 2^53 + 1, the smallest odd integer no
double can hold. An implementation that routes corpus numbers through a
double emits `9007199254740992` and fails that one vector immediately,
with a one-line diff, instead of failing much later on a long encoding.

The deviation is *tighter* than JCS, never looser: every number this
schema admits is also a number JCS admits, and for integers below 2^53
the two serializations agree character for character. A JCS library can
therefore be used as the implementation, provided the number path is
replaced and the refusal of fractions is added.

**Honesty note on the sort.** Because the corpus is ASCII by rule
(§1.3), this schema's agreement with JCS's member sort is only ever
*exercised* on ASCII keys. JCS sorts by UTF-16 code unit, which differs
from code-point order for characters above U+FFFF. Nothing here tests
that, and a future non-ASCII key would put an implementation in
untested territory; it is a format bump and a fresh reading of RFC 8785
§3.2.3, not a quiet extension.

### 1.3 File-level rules

- **UTF-8**, and in fact ASCII: every byte is `<= 0x7F`. The rule is
  unconditional and holds over the emitted corpus. The one place it
  needed defending — the kernel's docstrings, which are not ASCII — is
  handled by the transliteration of §4.2, at the emitter, before
  canonicalization.
- **One record per line**; each line is a complete canonical JSON
  object, and nothing follows the closing brace on a line.
- **LF (`\n`) after every record, including the last.** No CR bytes
  anywhere. The file ends with exactly one newline and contains no empty
  line.
- **No incidental data**: no timestamps, no commit hashes, no absolute
  paths, no host names, no iteration over an unordered container.

### 1.4 The both-ways law

> **Both-ways law (NORMATIVE, binding on every implementation).**
> For the whole corpus: parsing every line and re-emitting it in
> canonical form reproduces the input file byte for byte.
> For every `canon` record: canonicalizing the record's `value` member
> yields exactly the string in its `bytes` member.
> For every `program` record: canonicalizing the record's `declaration`
> member yields exactly the string in its `bytes` member (§2.7).

This is a conformance *requirement*, not a property to admire. Each
implementation — Lean, TypeScript, Go, and any fourth — MUST have a test
that runs both halves and fails loudly, and that test MUST be in the
gate that the implementation's build already runs.

The law is what makes the corpus a shared object rather than three
parallel readings of one. It catches the whole class of near-miss
serializers in one assertion: a parser that loses integer precision, an
emitter that inserts a space, an escaper that writes `\u000A` instead of
`\n`, an object writer that preserves insertion order, a reader that
drops a duplicate-looking key. Each of those changes some byte, and
byte-identity is checked over every byte.

Two corollaries worth stating because they are load-bearing:

1. **Key order carries no information.** Under format 1 a consumer had
   to parse in an order-preserving way or lose a checkable property.
   Under format 2, sorted order is recoverable from the data itself, so
   a hash-map parse is safe and the re-emission still reconstructs the
   bytes. This is a real simplification for every consumer.
2. **The law is stronger than a round-trip through the consumer's own
   types.** Re-emission must come from the *parsed JSON*, not from a
   consumer's domain model. A consumer that decodes into its own act
   type and re-encodes is testing something else — useful, but not this.

### 1.5 What canonical form retires

Format 1's §2.2 warned that Lean's `Json` type is backed by a sorted map
and therefore renders keys alphabetically, which fought the fixed
non-alphabetical key order the schema demanded; the emitter had to ship
its own order-preserving writer, and that was flagged as the
highest-risk detail in the whole build. Format 2 deletes the hazard by
adopting the order the sorted map already produces. The emitter's
natural implementation is now the correct one, in Lean and everywhere
else.

---

## 2. The frozen grammar (v2)

The real artifact lives at
`packages/plait/fixtures/kernel-conformance.ndjson` and is written only
by the model-end lane. **Where this document was silent or guessed, the
emitted corpus is normative and this document was corrected to match
it** — §12 records each place that happened.

### 2.1 Groups, order, and counts

Records are grouped by their `record` discriminator. Groups appear in
this order, with no interleaving:

| # | Group | Count | New in v2 |
|---|---|---|---|
| 1 | `header` | 1 | |
| 2 | `kind` | 12 | |
| 3 | `stage` | 5 | |
| 4 | `refusal` | 16 | |
| 5 | `type` | 22 | |
| 6 | `encoding` | 12 | |
| 7 | `admission` | 17 | |
| 8 | `doc` | 22 | yes |
| 9 | `canon` | 10 | yes |
| 10 | `program` | 4 | yes (add-only) |

The six v1 groups keep their relative order and their per-group internal
order; the new groups come strictly after all of them, in the order they
were added. At the time of format 2's minting — before the `program`
group — the file was **117 lines**: 1 header + 116 records, and 22632
bytes.

Those numbers are measurements of a corpus at a moment, not constants of
the format, and the `program` group is the concrete case that proves it.
A consumer MUST validate the line count as
`lines == 1 + sum(header.counts)` rather than pinning any literal: the
add-only rule of §6 lets a further group join without a format bump, and
a literal breaks on that where the sum does not. The Go consumer states
the check that way and says so in its own comment; §11 check 12 carries
the rule. Wherever this document quotes a figure measured at minting, it
says so; the counts-derived rule is what carries forward.

Within a group the order is fixed and is never alphabetical-by-accident:

- `kind`, `stage` — by `rank` ascending.
- `refusal` — `RefusalReason` declaration order.
- `type` — `Kernel/Definitions.lean` declaration order.
- `encoding` — the twelve named vectors in the order listed in §2.2.
- `admission` — the kernel gate's `check_control` order, lawful twin last.
- `doc` — type declaration order, i.e. the same order as `type`.
- `canon` — the order listed in §3.
- `program` — the vector order listed in §2.7.4.

### 2.2 Record grammar, group by group

Every line below is shown in canonical form, so its keys are sorted.
Examples marked *(from the corpus)* were produced by canonicalizing the
committed format-1 record, not typed by hand.

**Header** — exactly one, on line 1. Keys: `counts`, `format`,
`generator`, `record`, `source`; `counts` keys are the group names other
than `header`, sorted. *(from the corpus)*

```json
{"counts":{"admission":17,"canon":10,"doc":22,"encoding":12,"kind":12,"program":4,"refusal":16,"stage":5,"type":22},"format":2,"generator":"verify/unity emit","record":"header","source":"verify/kernel"}
```

Every count MUST equal the number of records of that group actually
emitted.

**The counts key sorts, it does not append.** `counts` is an object, so
its members obey §1's member sort like every other object in the file —
a new group's key lands wherever the sort puts it, never at the end.
`program` sorts sixth of nine, between `kind` and `refusal`:

```
admission, canon, doc, encoding, kind, program, refusal, stage, type
```

That is worth stating because the *group order in the file* (§2.1) and
the *key order inside `counts`* are two different orders and disagree
here: `program` is last in the file and sixth in the header. A consumer
reading `counts` positionally rather than by key has already lost, and
the header line above is the proof rather than the warning: read it left
to right and the group order is not what you get.

`scratch/km-canon/check_doc.py` compares that quoted line against the
corpus's own first line on every run, so a regenerated corpus and a
stale document cannot both be green.

**Kind** — twelve, ranks 0..11 (`schema`, `program`, `policy`,
`capability`, `lane`, `algebra`, `index`, `resource`, `ontology`,
`schedule`, `template`, `language`). *(from the corpus)*

```json
{"name":"schema","rank":0,"record":"kind"}
```

**Stage** — five, ranks 0..4 (`opened`, `filled`, `disputed`, `decided`,
`sealed`). *(from the corpus)*

```json
{"name":"opened","rank":0,"record":"stage"}
```

**Refusal** — sixteen, in `RefusalReason` declaration order, texts
verbatim from `Kernel.taught`, marks from
`Kernel.RefusalReason.applicability`. *(from the corpus)*

```json
{"applicability":"advisory","law":"the fold carrier has no clock parameter (f11_query_deterministic)","reason":"clock-read","record":"refusal","repair":"emit the claimed time as a tick fact on an evidence lane; schedule through a declared schedule value"}
```

**Type** — the mini-AST, the closed list of §2.4, in declaration order.
Keys: `constructors`, `form`, `name`, `params`, `record`. A constructor
object has keys `fields`, `name`; a field object has keys `name`,
`type`; a param object has keys `name`, `role`. Structures use the
constructor name `mk`. *(from the corpus, truncated for width)*

```json
{"constructors":[{"fields":[],"name":"schema"},{"fields":[],"name":"program"},…],"form":"inductive","name":"DeclKind","params":[],"record":"type"}
```

**Encoding** — the twelve named vectors, in this order:
`lawful-declare`, `resolve-schema`, `emit-lane`, `join-cell`,
`fold-at-anchor`, `decide-fenced`, `trigger-evidence-appears`,
`trigger-cell-reaches`, `trigger-hole-reaches`,
`trigger-outcome-landed`, `trigger-head-advanced-past`,
`spawn-under-writ`. *(from the corpus)*

```json
{"act":[0,0,7000051000172,4],"name":"lawful-declare","record":"encoding"}
```

The emitter MUST check `decodeAct (encodeAct act) = some act` for every
vector at emit time and abort nonzero on failure.

**Admission** — seventeen: the sixteen planted unlawful candidates in
`check_control` order, then the lawful twin. Two shapes.
*(both from the corpus)*

```json
{"name":"clockFold","reason":"clock-read","record":"admission","verdict":"refused"}
{"encoded":[0,0,7000051000172,4],"name":"lawfulDeclare","record":"admission","verdict":"admitted"}
```

**Doc** *(new)* — one per closed-list type, in type declaration order,
extracted mechanically from the environment (`findDocString?`) and
**never retyped**. Keys: `doc`, `name`, `record`, `target`. `target` is
`"type"`; the key exists so that a later `doc` record about a
constructor, a field, or a refusal is an add-only change.
*(both from the corpus)*

```json
{"doc":"A lane partition: the venue-local shard of an evidence stream. ","name":"LanePartition","record":"doc","target":"type"}
```

A multi-line docstring keeps its internal newlines, escaped `\n`:

```json
{"doc":"A journal position, meaningful only within its partition. As with\ntokens, the space rides the type. ","name":"Position","record":"doc","target":"type"}
```

Read both `doc` values to their last character: each ends with a space
before the closing quote. That is not a typo in this document. It is
what the Lean environment returns, and §4.1 states the rule.

**`counts.doc` is structurally pinned at 22.** The extractor does not
skip a type that lacks a docstring — it **refuses**, naming the type,
and the emit fails. So the `doc` group is one record per closed-list
type, always, and is index-aligned with the `type` group by
construction rather than by today's luck. Removing a docstring from a
closed-list type reddens the gate; it does not quietly shrink the
corpus. See §4 for the extraction rules.

**Canon** *(new)* — exactly ten, in the order of §3. Keys: `bytes`,
`name`, `record`, `value`. `value` holds the actual JSON value; `bytes`
holds that value's canonical serialization, as a JSON string.

```json
{"bytes":"{\"a\":2,\"b\":1}","name":"key-order","record":"canon","value":{"a":2,"b":1}}
```

**Program** *(new, add-only)* — the program declaration vectors, in the
order of §2.7.4. Keys: `bytes`, `declaration`, `name`, `record`.
`declaration` holds the declaration value; `bytes` holds that value's
canonical serialization, as a JSON string — the same self-testing shape
as `canon`, for the same reason. §2.7 is the whole specification: the
declaration grammar, the argref forms, the edge rule, and the
consistency law.

### 2.3 Field-by-field semantics

#### Header

| Field | Meaning |
|---|---|
| `record` | Discriminator. Always the literal `"header"`. |
| `format` | Major version of this grammar. `2`. A consumer that does not know this integer MUST refuse the file (§6). |
| `generator` | The command that produced the file. Provenance for a human reading a diff; consumers MUST NOT branch on it. |
| `source` | The model the tables describe (`"verify/kernel"`). |
| `counts` | Per-group counts. A self-check, not a hint: a consumer MUST compare each against the records it actually read and refuse on any disagreement. |

#### Kind and stage

| Field | Meaning |
|---|---|
| `name` | The Lean constructor's short name, e.g. `schema`, `opened`. Note the deliberate spelling `opened`: the protocol stage is named *open*, but `open` is a Lean keyword, so the constructor takes the past participle. Consumers rendering protocol prose may map it back. |
| `rank` | The model's numeric rank. Ranks are dense and ascending from zero, and rank order equals file order. **Rank is wire-stable within a format**: it is what an encoded act carries, so renumbering a kind is a format bump, not an edit. |

The kind rank is not decoration. `Kernel.encodeAct` writes `kind.rank`
into the canonical framing of a `declare` and a `resolve`, so two systems
disagreeing about a rank disagree about the identity of every
declaration.

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
repairs, verified against the committed corpus, are: `last-writer-wins`,
`unverified-read`, `past-mutation`, `anchored-resolve`.

**Refusal parity is total.** A row with an empty `law` or an empty
`repair` is malformed: the model's `taught` function is total by
construction, and the door never refuses without teaching.

#### Type

| Field | Meaning |
|---|---|
| `name` | The Lean short name, without the `Kernel.` namespace prefix. |
| `form` | `inductive` for a sum type (several constructors, each with its own fields); `structure` for a product type (exactly one constructor). |
| `params` | The type's parameters, in declaration order. |
| `params[].role` | `brand` when the parameter exists to keep values apart rather than to carry data — the *kind* of a `Digest`, the *register* of a `Token`, the *partition* of a `Position`, the *fold* and *partition* of an `AnchorFact`. `type` is reserved for a genuine universe-level type parameter. In the closed list every parameter is a `brand`; `type` is enumerated so that admitting a parameterised type later is not a format bump. |
| `constructors[].name` | The constructor's short name. A `structure` in Lean has exactly one constructor, named `mk`. |
| `constructors[].fields` | The constructor's fields (for a structure) or arguments (for an inductive), in declaration order. |
| `fields[].type` | A **schema type reference**, per §2.5. |

#### Encoding

| Field | Meaning |
|---|---|
| `name` | A vector label, hyphen-separated. Stable within a format; not a Lean name. |
| `act` | The output of `Kernel.encodeAct` as a JSON array of naturals. Element 0 is the generator tag: `0 declare, 1 resolve, 2 emit, 3 join, 4 fold, 5 decide, 6 trigger, 7 spawn`. Arity is fixed per generator — 4, 3, 3, 3, 8, 4, 6, 3 for tags 0..7 — so a decoder can dispatch on length and tag alone. |

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

#### Doc

| Field | Meaning |
|---|---|
| `name` | The type's Lean short name. Joins to a `type` record's `name`. Every closed-list type has one; a type without a docstring is a refused emit, not an absent record. |
| `target` | What the docstring documents. `"type"` in format 2. Present so that constructor-level and field-level docs are an add-only extension. |
| `doc` | The docstring text as the Lean environment returns it, then transliterated to ASCII per §4.2: mechanically extracted, never re-typed, never reflowed, internal newlines preserved, edge whitespace exactly as returned — which today means no leading whitespace and one trailing space (§4.1). |

#### Canon

| Field | Meaning |
|---|---|
| `name` | The vector label, from the closed list of §3. |
| `value` | The JSON value itself — whatever kind of value it is. This is the only place in the corpus where a value is not a string, a natural, an array of naturals, or a structured record. |
| `bytes` | The canonical serialization of `value`, carried as a JSON string. The both-ways law (§1.4) binds these two fields together. |

#### Program

| Field | Meaning |
|---|---|
| `record` | Discriminator. Always the literal `"program"`. |
| `name` | The vector label, hyphen-separated, from the list of §2.7.4. Stable within a format; not a Lean name and not a program's identity. |
| `declaration` | The program declaration value itself, in the grammar of §2.7.1. An object with exactly the four members `edges`, `holes`, `lineage`, `nodes`. |
| `bytes` | The canonical serialization of `declaration`, carried as a JSON string. The both-ways law (§1.4) binds these two fields together, exactly as it does a `canon` record's pair. |

A `program` record therefore self-tests every consumer twice over: once
through the per-line canonicality check that binds every record (§11
check 5), and once through the `bytes`-equals-canonicalize-`declaration`
identity that is specific to this group and to `canon`. The second is
the one that catches a consumer whose canonicalizer is right about
corpus records and wrong about the nested declaration value it will
actually be asked to address.

### 2.4 The closed type list

Exactly these twenty-two, in `Kernel/Definitions.lean` declaration order,
so `counts.type` is **22**:

`DeclKind`, `Digest`, `Value`, `StateLabel`, `Petname`, `Token`,
`LanePartition`, `Position`, `AnchorFact`, `HoleStage`,
`KTriggerPredicate`, `Act`, `RawArg`, `CandidateAnchor`, `TokenClaim`,
`MergeStrategy`, `CandidatePredicate`, `CandidateAct`, `RefusalReason`,
`Refusal`, `Applicability`, `Door`.

The list is a deliberate slice, not everything the model declares. Types
that exist only to state or prove propositions — `Unlawful`,
`ProgramAdmission`, `World.Le` — are outside it, because they describe
the model's reasoning rather than its data. So are types that belong to
machinery no implementation mirrors (`AdmitResult`, `GenTag`,
`ProgramNode`, `World`). Adding a type to the list is an add-only change
within a format (§6); removing one is a bump.

### 2.5 Schema type references

A field's `type` is a string in this grammar:

```
ref     ::= name | name "(" arg ("," arg)* ")"
arg     ::= name
name    ::= [A-Za-z][A-Za-z0-9]*
```

Three classes of head name occur:

1. **Leaves.** `Nat` (a non-negative integer) and `String`.
2. **Declared types.** Any `name` in the §2.4 list, e.g. `Value`,
   `HoleStage`, `CandidatePredicate` (which is recursive — the
   `negation` constructor takes a `CandidatePredicate`).
3. **Containers.** `List(T)` and `Option(T)`, each with exactly one
   argument.

One further name occurs as a leaf without having a `type` record of its
own: **`Ref`**, the model's abbreviation for the pair `(DeclKind, Nat)` —
a kind-tagged reference, the one lawful way a heterogeneous collection of
digests is carried. It is a Lean `abbrev` rather than an inductive or a
structure, so it has no declaration to emit. Consumers MUST accept `Ref`
as a declared leaf and expand it to a kind-plus-identifier pair. It
appears only in `Door.catalog` and `Door.pinned`.

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

The distinction is the whole difficulty of the mapping layer, and §9
addresses it directly. Resolution rule: an argument that matches a
`DeclKind` constructor name is a literal kind; otherwise it must match
the `name` of a preceding field or param in the same constructor, and a
consumer MUST refuse a reference that matches neither.

### 2.6 Worked example

The complete `Act.fold` constructor, as it appears inside the `Act` type
record (canonical order, so `fields` precedes `name`):

```json
{"fields":[{"name":"declared","type":"Digest(index)"},{"name":"partition","type":"LanePartition"},{"name":"anchor","type":"AnchorFact(declared,partition)"},{"name":"query","type":"Value"}],"name":"fold"}
```

Read: a `fold` names an index declaration by its digest, a lane
partition, an anchor branded by *that* fold and *that* partition, and a
query value. Because the anchor's brands are bound names, an anchor from
a different fold does not typecheck — the model has no syntax for
replaying an anchor anywhere but its own fold and partition.

Note that the *field* list stays in declaration order while the *keys of
each field object* are sorted. Canonical form sorts object members; it
never reorders an array. Getting this backwards — sorting the fields —
destroys the meaning of `AnchorFact(declared,partition)`, whose
arguments are resolved against *preceding* fields.

### 2.7 The program group

The ninth counted group — row 10 of §2.1's table, which numbers the
header as row 1 — added under §6's add-only rule: appended after
`canon`, a new `counts` key, `format` still `2`. Nothing about the
earlier groups changes, and a consumer that does not know this one skips
it and stays conforming.

#### 2.7.0 What a program declaration is, glossed once

The eight generators of §0 are single sentences. A **program** is a
paragraph: a finite set of generator applications, each with a
program-local name, where one application may consume the result of an
earlier one. Because consumption is the only way the applications relate,
a program is a directed acyclic graph, and because every application's
arguments are either program-local names, content addresses, or plain
numbers, the whole paragraph has one canonical serialization and
therefore one identity.

Three things follow, and they are the reason this group exists at all:

- **The declaration is data, not code.** It carries no function values
  and no closures — computation is referenced by digest, never carried
  (§2.7.5). A declaration can be hashed, diffed, and re-read years
  later.
- **Building is not publishing.** Serializing a declaration and taking
  its identity is total and always available; *declaring* it into a
  catalog is a separate, explicit act. The corpus carries declarations.
- **Nothing here runs.** A `program` record is a declaration, never an
  execution record, never a trace, never a replay. §2.7.5's non-claims
  are as binding as its claims.

#### 2.7.1 The declaration value grammar

The value under `declaration` is a JSON object with exactly four
members. Shown here in canonical form, so keys are sorted at every
level:

```
declaration ::= { "edges"   : [ edge, ... ],
                  "holes"   : [ hole, ... ],
                  "lineage" : [ nat, ... ],
                  "nodes"   : [ node, ... ] }

edge        ::= { "from" : nat, "to" : nat }
hole        ::= { "name" : nat, "schema" : nat }
node        ::= { "args" : { fieldName : argref, ... },
                  "generator" : gen,
                  "name" : nat }

gen         ::= "declare" | "resolve" | "emit" | "join"
              | "fold"    | "decide"  | "trigger" | "spawn"

argref      ::= { "arg" : "digest",  "id"   : nat, "kind" : kindName }
              | { "arg" : "local",   "name" : nat }
              | { "arg" : "literal", "value": nat }
              | { "arg" : "hole",    "name" : nat }

kindName    ::= one of the twelve DeclKind constructor names (§2.2)
nat         ::= an unbounded non-negative integer (§1.2)
```

All four members are always present, including as empty arrays. A
program with no holes carries `"holes":[]`, not an absent key: the
grammar is fixed-shape so a consumer's decoder has no optional-member
branch, and an absent member is malformed rather than defaulted.

Member by member:

| Member | Meaning |
|---|---|
| `nodes` | The generator applications, **newest first** (§2.7.3). Each carries a program-local `name`, the `generator` it applies, and its `args`. Node names are unique within a declaration. |
| `edges` | The consumption relation made explicit: one entry per consumption, `from` the consuming (younger) node's name, `to` the consumed (older) node's name. Redundant with the `args` by construction, and deliberately so (§2.7.3). |
| `holes` | The program's declared typed parameters, ascending by `name`. `name` is the hole's program-local identifier; `schema` is the identity label of the schema declaration that types it. A hole is a *declared parameter*, never a wildcard (§0). |
| `lineage` | Identity labels of the declarations this one descends from, as an ordered list. Provenance carried in the value, so it is inside the identity rather than beside it. |

**Digests are identity labels.** Every `nat` that stands for a digest —
an argref's `id`, a hole's `schema`, a `lineage` entry — is the model's
identity label for a value, not a hash. The model has always carried
identities as naturals; real hashing is the runtime's trusted base and
is not modelled here, and no property in this document depends on a
digest being collision-resistant.

**`args` is keyed by field name, and is a partial map.** Every key of a
node's `args` object is one of the generator's field names, exactly as
the corpus's own `type` record for `Act` gives them — which is the point
of having the mini-AST in the corpus at all. A consumer joins the two
groups rather than carrying its own table:

| `generator` | `args` keys (the `Act` constructor's fields, in declaration order) |
|---|---|
| `declare` | `kind`, `value`, `writ` |
| `resolve` | `kind`, `target` |
| `emit` | `lane`, `body` |
| `join` | `cell`, `contribution` |
| `fold` | `declared`, `partition`, `anchor`, `query` |
| `decide` | `register`, `token`, `outcome` |
| `trigger` | `predicate`, `declaration` |
| `spawn` | `parent`, `request` |

**Subset, not equality — measured, and the one place a validator written
from the freeze alone would be wrong.** The emitted vectors do *not*
carry every field of every generator. `ground-two-node`'s `declare` node
carries `"args":{}` and its `emit` node carries only `body`;
`distill-shape`'s `decide` carries `outcome` and `register` but no
`token`, and its `resolve` carries `target` but no `kind`. So the rule
is:

> **Every key of `args` MUST be a field name of that node's generator.
> Not every field name need appear.**

A consumer MUST check membership, never equality. What an omitted field
means at the model seam — an argument the erasure supplies, or a
position the declaration leaves to the runtime — is the unity lane's to
say; what the corpus fixes is the subset rule, and R21 in §12 carries
the semantics as an open question rather than letting the checker's
leniency pass for an answer.

Two traps in the table above, both worth a sentence.

- **`args` is an object, so its keys sort; the field list is an array,
  so it does not.** In the serialized node, `declare`'s arguments appear
  as `kind`, `value`, `writ` — which happens to be both sorted *and*
  declaration order — while `fold`'s appear as `anchor`, `declared`,
  `partition`, `query`, which is sorted and **not** declaration order.
  Nothing is lost, because the keys name the fields; but a consumer
  reconstructing a positional argument list MUST re-order by the `type`
  record's field order and never by the serialized key order. This is
  §2.6's warning one level up.
- **`trigger`'s field is named `declaration`.** It is a field of the
  `Act.trigger` constructor and has nothing to do with the `program`
  record's top-level `declaration` member. The collision is inherited
  from the model's vocabulary, not introduced here.

**The `args` count is not the encoding arity.** A node's `args` has one
entry per constructor field; the `encoding` group's arrays are a
*flattened* positional framing where a structured field spreads over
several naturals. For six of the eight generators the two happen to
line up — arity is one tag plus one natural per field — and for two they
do not: `fold` has four fields and arity 8, `trigger` has two fields and
arity 6. The coincidence is not a rule, and a consumer that cross-checks
one count against the other is right six times and wrong twice, which is
the worst way to be wrong.

#### 2.7.2 The four argument-reference forms

An argref is a tagged object; `arg` is the discriminator and the member
set is fixed per tag. Note that `"local"` and `"hole"` carry the same
member set and differ only by tag, so a consumer MUST discriminate on
`arg` and never on shape.

| `arg` | Members | Reads as |
|---|---|---|
| `"digest"` | `id`, `kind` | An **outside** reference: a content address that must resolve, carrying the `DeclKind` it names so a program digest and a policy digest cannot be confused. Erases to the model's `RawArg.digestRef`. |
| `"local"` | `name` | An **inside** reference: the result of another node of this same declaration, by its program-local name. This is the only form that creates an edge. |
| `"literal"` | `value` | An immediate natural. Erases to the model's `RawArg.literal`. |
| `"hole"` | `name` | A reference to one of the declaration's own **holes**, by the hole's name. Erases to the model's `RawArg.hole`, which is what `Kernel.requiresOf` reads to compute a program's requirement set. Creates no edge: a hole is a parameter, not a prior node. |

The inside/outside split is the whole discipline: local names are
meaningful only within the one canonical value, and every reference that
leaves the value is a digest that must resolve. That is what lets a
declaration inherit acyclicity by admission rather than by a separate
cycle check — an outside reference cannot point back into a program
being built, because the program has no identity until its bytes exist.

**The `"hole"` form is where this document was corrected by the
emission.** The freeze listed three forms and no hole reference, but the
model reads a program's requirements out of node arguments
(`Kernel.requiresOf` over `RawArg.hole`), not out of a declaration-level
list — so under three forms alone, `holey` and `holey-filled` would
erase to identical node arguments and the valuation correspondence would
have nothing to demonstrate. This document flagged the gap before the
emission and the emission closed it by adding the form. The `holes`
array declares a parameter; a `"hole"` argref *uses* it; filling
rewrites the use to a `"literal"` and drops the declaration (§2.7.4).
Recorded as R16, CLOSED.

#### 2.7.3 Orientation, and why the edges are written down twice

**Nodes are newest-first.** The array's head is the youngest
application, its tail the oldest — the house ledger orientation, and
exactly the orientation of `Kernel.ProgramNode` lists, where
`ProgramAdmission` admits by *prepending* (`node :: nodes`) and requires
every use to name a node already in the tail. Two consequences a
validator can check directly:

1. For a node at index *i*, every `"local"` argref names a node at some
   index *j* with *j* > *i*. A local reference always points *later* in
   the array, i.e. *older* in time.
2. Node names are unique. (This is `ProgramAdmission`'s freshness half:
   a name admits at most once.)

Together those two are acyclicity. There is no separate cycle check and
no need for one.

**Holes ascend by `name`.** The `holes` array is sorted ascending on
`name`, which makes it a canonical rendering of a set rather than an
arrival order.

**The edge rule (NORMATIVE).** The `edges` array MUST equal exactly the
consumptions implied by the nodes' local argrefs — no edge without an
argref, no argref without an edge. Written as a check:

> Collect, over every node *n* and every member of `n.args` whose `arg`
> is `"local"`, the pair (`n.name`, that argref's `name`). The `edges`
> array, read as `from`/`to` pairs, MUST equal that collection.

Only `"local"` argrefs count. A `"digest"` argref points outside the
declaration, a `"literal"` points nowhere, and a `"hole"` names a
parameter rather than a prior node — none of the three is a consumption
and none contributes an edge.

Why write down twice what is already there? Because a redundant encoding
that a validator checks is a **consistency oracle**, and this is the one
place the corpus can catch a whole class of builder bug for free. A
builder that drops an edge, flattens a hole, or rewires a node produces
a declaration whose `edges` and `args` disagree, and the disagreement is
mechanical, local, and visible in a one-line diff — before any
downstream consumer has to reason about graph shape. The DAG-builder
slice's mutant arm is built on exactly this: a deliberately degenerate
builder that drops edges must visibly diverge from the committed
vectors.

The redundancy also gives a consumer that only wants the graph — a
renderer, a diff tool, a topological sort — a direct read, with no need
to understand the argref grammar at all.

#### 2.7.4 The committed vectors

Exactly these four, in this order — `counts.program` is 4. Each entry
names the vector and says what it is for; the byte quotes below it are
the corpus's own.

| # | `name` | Intent |
|---|---|---|
| 1 | `ground-two-node` | The bridge's planted two-node program, lifted into declaration form: an `emit` consuming a `declare`. The smallest declaration with an edge in it, and the one whose erasure is literally the `groundProgram` the unity bridge already proves admitted. It is the group's floor: a consumer that cannot replay this one has not implemented the grammar. |
| 2 | `holey` | A one-hole program: the declaration side of a typed parameter, and the vector that shows what an *unfilled* requirement looks like in the bytes. |
| 3 | `holey-filled` | Its filled twin — the same program with the hole's value supplied. The pair demonstrates the **valuation correspondence**: filling is a total, mechanical rewrite of the declaration, and it changes the bytes, therefore the identity. A filled program is a *different declaration*, not an annotated one. |
| 4 | `distill-shape` | The ratified record's four-node sketch at ground identities: `resolve`, then `decide`, then `emit`, then `join` — which, newest-first, serializes as `join`, `emit`, `decide`, `resolve`. The first vector with a non-trivial graph, and the one that exercises four different generators' `args` shapes in one value. |

The `holey` / `holey-filled` pair is two records, named exactly that:
the freeze permitted the unity lane a different paired convention and it
took the primary spelling.

**The four records, byte for byte** *(from the corpus)*, on its last
four lines:

```json
{"bytes":"{\"edges\":[{\"from\":2,\"to\":1}],\"holes\":[],\"lineage\":[],\"nodes\":[{\"args\":{\"body\":{\"arg\":\"local\",\"name\":1}},\"generator\":\"emit\",\"name\":2},{\"args\":{},\"generator\":\"declare\",\"name\":1}]}","declaration":{"edges":[{"from":2,"to":1}],"holes":[],"lineage":[],"nodes":[{"args":{"body":{"arg":"local","name":1}},"generator":"emit","name":2},{"args":{},"generator":"declare","name":1}]},"name":"ground-two-node","record":"program"}
{"bytes":"{\"edges\":[{\"from\":2,\"to\":1}],\"holes\":[{\"name\":7,\"schema\":88}],\"lineage\":[],\"nodes\":[{\"args\":{\"body\":{\"arg\":\"local\",\"name\":1},\"lane\":{\"arg\":\"digest\",\"id\":1,\"kind\":\"lane\"}},\"generator\":\"emit\",\"name\":2},{\"args\":{\"value\":{\"arg\":\"hole\",\"name\":7},\"writ\":{\"arg\":\"digest\",\"id\":4,\"kind\":\"policy\"}},\"generator\":\"declare\",\"name\":1}]}","declaration":{"edges":[{"from":2,"to":1}],"holes":[{"name":7,"schema":88}],"lineage":[],"nodes":[{"args":{"body":{"arg":"local","name":1},"lane":{"arg":"digest","id":1,"kind":"lane"}},"generator":"emit","name":2},{"args":{"value":{"arg":"hole","name":7},"writ":{"arg":"digest","id":4,"kind":"policy"}},"generator":"declare","name":1}]},"name":"holey","record":"program"}
{"bytes":"{\"edges\":[{\"from\":2,\"to\":1}],\"holes\":[],\"lineage\":[],\"nodes\":[{\"args\":{\"body\":{\"arg\":\"local\",\"name\":1},\"lane\":{\"arg\":\"digest\",\"id\":1,\"kind\":\"lane\"}},\"generator\":\"emit\",\"name\":2},{\"args\":{\"value\":{\"arg\":\"literal\",\"value\":42},\"writ\":{\"arg\":\"digest\",\"id\":4,\"kind\":\"policy\"}},\"generator\":\"declare\",\"name\":1}]}","declaration":{"edges":[{"from":2,"to":1}],"holes":[],"lineage":[],"nodes":[{"args":{"body":{"arg":"local","name":1},"lane":{"arg":"digest","id":1,"kind":"lane"}},"generator":"emit","name":2},{"args":{"value":{"arg":"literal","value":42},"writ":{"arg":"digest","id":4,"kind":"policy"}},"generator":"declare","name":1}]},"name":"holey-filled","record":"program"}
{"bytes":"{\"edges\":[{\"from\":4,\"to\":3},{\"from\":3,\"to\":2},{\"from\":2,\"to\":1}],\"holes\":[],\"lineage\":[9],\"nodes\":[{\"args\":{\"cell\":{\"arg\":\"digest\",\"id\":6,\"kind\":\"resource\"},\"contribution\":{\"arg\":\"local\",\"name\":3}},\"generator\":\"join\",\"name\":4},{\"args\":{\"body\":{\"arg\":\"local\",\"name\":2},\"lane\":{\"arg\":\"digest\",\"id\":1,\"kind\":\"lane\"}},\"generator\":\"emit\",\"name\":3},{\"args\":{\"outcome\":{\"arg\":\"local\",\"name\":1},\"register\":{\"arg\":\"digest\",\"id\":5,\"kind\":\"program\"}},\"generator\":\"decide\",\"name\":2},{\"args\":{\"target\":{\"arg\":\"digest\",\"id\":8,\"kind\":\"index\"}},\"generator\":\"resolve\",\"name\":1}]}","declaration":{"edges":[{"from":4,"to":3},{"from":3,"to":2},{"from":2,"to":1}],"holes":[],"lineage":[9],"nodes":[{"args":{"cell":{"arg":"digest","id":6,"kind":"resource"},"contribution":{"arg":"local","name":3}},"generator":"join","name":4},{"args":{"body":{"arg":"local","name":2},"lane":{"arg":"digest","id":1,"kind":"lane"}},"generator":"emit","name":3},{"args":{"outcome":{"arg":"local","name":1},"register":{"arg":"digest","id":5,"kind":"program"}},"generator":"decide","name":2},{"args":{"target":{"arg":"digest","id":8,"kind":"index"}},"generator":"resolve","name":1}]},"name":"distill-shape","record":"program"}
```

Read `ground-two-node` against §2.7.1: two nodes, the younger `emit`
(name 2) first, its `body` a `"local"` reference to the elder `declare`
(name 1); one edge `2 -> 1` matching that one local argref; no holes, no
lineage. The `declare` node carries `"args":{}` — the subset rule of
§2.7.1 in its starkest form, and the reason a validator must check
membership rather than equality.

Its erasure is exact rather than approximate, which is what makes it the
group's floor: the `emit` node's one local argref becomes `uses := [1]`
and leaves `args := []`, the `declare` node erases to `args := []`,
`uses := []`, and the pair is literally `Unity.Planted.groundProgram` —
the two-node program the bridge already proves admitted.

Read the `holey` / `holey-filled` pair side by side and the valuation
correspondence is visible in the diff, which is the whole point of
shipping them as a pair:

| | `holey` | `holey-filled` |
|---|---|---|
| `holes` | `[{"name":7,"schema":88}]` | `[]` |
| `declare`'s `value` argref | `{"arg":"hole","name":7}` | `{"arg":"literal","value":42}` |
| everything else | identical | identical |

Filling is a total, mechanical rewrite: the use becomes a literal, the
declaration goes away, and **the bytes change, therefore the identity
changes**. A filled program is a different declaration, not an annotated
one. That answers R18 — a filled program does not keep declaring the
hole it filled.

`distill-shape` is the group's only non-trivial graph: four nodes,
authored `resolve` then `decide` then `emit` then `join`, serialized
newest-first as `join` (4), `emit` (3), `decide` (2), `resolve` (1). Its
three edges appear in the nodes' own order — `4 -> 3`, `3 -> 2`,
`2 -> 1` — which is the emission's answer to the edge-ordering half of
R19. It is also the only vector with a non-empty `lineage` (`[9]`), a
single element, so it pins the member's presence and not its
orientation.

#### 2.7.5 The consistency law, and the non-claims

> **Consistency law (NORMATIVE).** Every vector's `declaration` erases
> to a list of `Kernel.ProgramNode` satisfying
> `Kernel.ProgramAdmission`.

The erasure drops the declaration's extra structure onto the model's
node shape: a node's `name` and `generator` carry across unchanged; its
`"digest"`, `"literal"`, and `"hole"` argrefs become the model's
`RawArg.digestRef`, `RawArg.literal`, and `RawArg.hole`, taken in the
`type` record's **field declaration order**, not the serialized key
order (§2.7.1); and its `"local"` argrefs become the node's `uses` list.
Edges become uses; args flatten. The exact carrier is the unity lane's
to define (§2.7.6); what is frozen is that it lands in
`ProgramAdmission`.

The `"hole"` arm is what makes the erasure carry a program's
*requirements*: `Kernel.requiresOf` is a fold over exactly those
`RawArg.hole` occurrences, so the requirement set of an erased
declaration is the set of holes its nodes still use — which is why
`holey` erases to a program that requires something and `holey-filled`
erases to one that requires nothing.

The law is short and the payoff is not. `ProgramAdmission` is what the
bridge's transport theorems U3–U7 are stated over, so an admitted
erasure carries a built program's well-foundedness to the fabric side
**for free** — no new proof per vector, no new proof per program. This
is the estate-of-safety move in its usual shape: prove the property once
at the seam, and every artifact that erases through the seam inherits
it.

For a consumer, the law is also a validation target that costs almost
nothing, because §2.7.3's two index conditions plus name uniqueness
*are* `ProgramAdmission` read as a checklist. §11 checks 37–38 state it
that way.

**What the group does not claim, stated as plainly as §0's disclaimer.**

- **No execution.** A `program` record is a declaration. Nothing in this
  group is a trace, a run, a replay, or evidence that anything ever
  executed. A consumer that reads a vector as an execution record has
  misread it.
- **No scheduler, no clock, no engine.** No member of the grammar
  carries a time, a delay, a retry, a priority, or an ordering other
  than the consumption DAG. The declaration says what depends on what,
  and stops.
- **No closures.** There is no argref form for a function value, and
  there will not be one: a closure has no canonical bytes, so it has no
  identity, so it cannot be content-addressed. Computation is referenced
  by digest. Closure introspection stays refused.
- **No liveness and no correspondence to any runtime.** That an
  erasure is admitted says the declaration is a well-founded DAG in the
  model. It says nothing about whether a program is useful, terminates,
  or is executable by anything.

#### 2.7.6 What the emission settled, and what is still open

This section was drafted from the freeze, ahead of the emission. Where
the freeze was silent, **the unity lane's implementation is normative
and this document was corrected to match it** — the same rule §2 states
for the corpus generally, and the same way R10 and R11 were settled when
format 2 was minted. The group has since been emitted, so most of what
was pending is now measured. Every point is carried in §12 as R15–R21.

**Settled by the emission, and this document rewritten accordingly:**

1. **`counts.program` is 4** — `ground-two-node`, `holey`,
   `holey-filled`, `distill-shape`, in that order (R15).
2. **A fourth argref form exists**, `{"arg":"hole","name":<nat>}`
   (§2.7.2). This document had flagged its absence from the freeze as
   the most likely correction a consumer would need, and it was
   (R16).
3. **`args` is a partial map**, not one entry per field (§2.7.1). This
   is the correction the draft did *not* anticipate: a validator written
   from the freeze alone would demand equality and reject all four
   vectors (R21).
4. **A filled program drops the hole it filled**: `holey-filled` carries
   `"holes":[]`, and the pair is named `holey` / `holey-filled` (R18).
5. **Edges follow the nodes' own order** — `distill-shape` emits
   `4 -> 3`, `3 -> 2`, `2 -> 1` against nodes 4, 3, 2, 1 (half of R19).

**Still open, and honestly so:**

6. **How a `DeclKind`-typed field would be spelled.** No emitted vector
   carries one: every node that has a `kind` field omits it under the
   subset rule. So the question is untouched rather than answered, and
   no argref form carries a bare kind (R17).
7. **`lineage` orientation.** The only non-empty `lineage` in the corpus
   is `[9]`, one element, which pins presence and not order (the rest
   of R19).
8. **Whether `edges` deduplicates.** No vector consumes the same local
   through two arguments, so nothing measures it. Set semantics is the
   reading §2.7.3 states (the rest of R19).
9. **What an omitted `args` field means at the model seam** — supplied
   by the erasure, or left to the runtime (R21).
10. **Whether the program vector set is add-only** (R20). A ruling, not
    a measurement.

Never in doubt, because the freeze states them: the record's four keys,
the four declaration members, newest-first nodes, ascending holes, the
edge-equals-consumptions rule, the
`bytes`-equals-canonicalize-`declaration` self-test, and the consistency
law.

---

## 3. The canon vectors, byte-exact

Ten records, in this order. They are the cross-implementation reference
for §1: an implementation agrees with this schema exactly when it
produces these ten `bytes` strings from these ten values.

| # | `name` | The value | `bytes` |
|---|---|---|---|
| 1 | `empty-object` | the empty object | `{}` |
| 2 | `empty-array` | the empty array | `[]` |
| 3 | `empty-string` | the empty string | `""` |
| 4 | `zero` | the integer zero | `0` |
| 5 | `big-integer` | 9007199254740993 (2^53 + 1) | `9007199254740993` |
| 6 | `key-order` | an object built with member `b` first: `b` ↦ 1, `a` ↦ 2 | `{"a":2,"b":1}` |
| 7 | `nested-object` | `z` ↦ (`y` ↦ the array 3, 4) | `{"z":{"y":[3,4]}}` |
| 8 | `nested-array` | a two-element array: the empty array, then a one-element array holding the empty object | `[[],[{}]]` |
| 9 | `string-escapes` | the 9-character text `a"b\c<LF>d<TAB>e` — the two single-character escapes and two of the five two-character ones, alternating with single ordinary letters | `"a\"b\\c\nd\te"` |
| 10 | `control-char` | the single character U+0001, and nothing else | `"\u0001"` |

Spelled out character by character, row 9's value is `a`, U+0022, `b`,
U+005C, `c`, U+000A, `d`, U+0009, `e` — nine characters. Row 10's value
is one character long: U+0001. Neither vector carries surrounding
words; §3.1 says what that costs and where the cost is paid instead.

The `bytes` column above is the literal byte content, unescaped. Inside
the corpus that content is itself a JSON string and picks up a second
layer of escaping. The ten complete records, byte for byte, as they
stand on lines 108–117 of the corpus — its last ten lines at format 2's
minting, and still its lines 108–117 now that the `program` group
appends after them:

```json
{"bytes":"{}","name":"empty-object","record":"canon","value":{}}
{"bytes":"[]","name":"empty-array","record":"canon","value":[]}
{"bytes":"\"\"","name":"empty-string","record":"canon","value":""}
{"bytes":"0","name":"zero","record":"canon","value":0}
{"bytes":"9007199254740993","name":"big-integer","record":"canon","value":9007199254740993}
{"bytes":"{\"a\":2,\"b\":1}","name":"key-order","record":"canon","value":{"a":2,"b":1}}
{"bytes":"{\"z\":{\"y\":[3,4]}}","name":"nested-object","record":"canon","value":{"z":{"y":[3,4]}}}
{"bytes":"[[],[{}]]","name":"nested-array","record":"canon","value":[[],[{}]]}
{"bytes":"\"a\\\"b\\\\c\\nd\\te\"","name":"string-escapes","record":"canon","value":"a\"b\\c\nd\te"}
{"bytes":"\"\\u0001\"","name":"control-char","record":"canon","value":"\u0001"}
```

The double escaping on rows 9 and 10 is where hand-typing goes wrong,
so read row 9 slowly, counting through its three layers. The **value**
is 9 characters, four of them special. Its **canonical serialization**
is 15 characters: the five letters unchanged, each of the four special
characters replaced by its two-character escape, all wrapped in
quotation marks. Those 15 characters then go *into* a JSON string as
the `bytes` member, which doubles every reverse solidus again and
escapes all three quotation marks, giving the 23 characters between
the quotes of `bytes`. Row 9 is the one vector where a correct
implementation and a plausible-looking hand transcription differ,
which is exactly why it is in the set.

### 3.1 What each vector is for

| Vector | The mistake it catches |
|---|---|
| `empty-object`, `empty-array` | An emitter that writes `{ }`, `[ ]`, or `null` for an empty container. |
| `empty-string` | A serializer that special-cases empty as absent. |
| `zero` | A minimal-decimal writer that emits `-0`, `0.0`, or `00`. |
| `big-integer` | **The deviation.** Any implementation that routes numbers through a double emits `9007199254740992`. |
| `key-order` | An emitter that preserves insertion order instead of sorting. Only catchable at *construction*; see §3.2. |
| `nested-object` | Sorting applied at the top level only, and not recursively. |
| `nested-array` | Array order confused with member order; empty containers inside a non-empty one. |
| `string-escapes` | The two single-character escapes and two of the five two-character ones, in one string, each with an ordinary letter on both sides. Catches an escaper that mangles the characters adjacent to an escape, an emitter that escapes the forward solidus, and one that writes `\u0022` or `\u000a` where a shorter form is required. |
| `control-char` | The `\u00XX` fallback and its four-digit zero padding — an emitter writing `\u1`, writing `\x01`, or passing U+0001 through raw fails here. The vector is the bare control character, so it does **not** catch an escaper that truncates at one; see the gap note below. |

**What the ten do not cover, stated plainly.** Four gaps, all measured
against the emitted corpus rather than guessed at:

1. **No hex letter is ever printed.** U+0001's hex digits are `0` and
   `1`, so **the lowercase-hex rule of §1.1 is not exercised by any
   canon vector.** The control characters that would need a letter are
   U+000B and U+000E–U+001F, and none appears in the corpus.
2. **No escape has text on both sides of it except in
   `string-escapes`.** The emitted `control-char` is the bare
   character, so nothing in the ten catches an escaper that truncates a
   string at a control character. (An earlier draft of this document
   claimed otherwise, on the strength of a `control` … `char` spelling
   the emitter did not produce. The claim is withdrawn.)
3. **Three of the five two-character escapes never appear**: `\b`,
   `\f`, and `\r` are carried by no corpus value.
4. **No JSON literal appears.** `true`, `false`, and `null` are legal
   in the grammar of §1 and absent from every record.

So an implementation can be corpus-conforming and still disagree with a
JCS peer about a value this corpus never carries.

**The principle: the ten are a floor, not a ceiling.** They are the
*cross-language* floor — the set every consumer must agree on, and the
set a three-way disagreement is resolved against. They are deliberately
not the whole of what a consumer should test. A consumer may and should
add **native gap vectors**: values it constructs and checks against §1
directly, in its own suite, binding nobody else.

The TypeScript lane does exactly that, and its four gap vectors are the
worked example — `control-char-surrounded` (`"control\u0001char"`,
closing gap 2), `hex-letter` (U+000B → `"\u000b"`, closing gap 1 and
also checked in the other direction, that `\u000B` canonicalizes to
`\u000b`), `every-two-char-escape` (`"\b\f\n\r\t"`, closing gap 3),
and `literals` (`[null,true,false]`, closing gap 4).

On `\b` and `\f` specifically: **all three writers implement them**
(the Lean, TypeScript, and Go escapers each carry the full seven-escape
table), and no corpus vector exercises them. An eleventh canon vector
covering them is a reasonable candidate for a future corpus. It is not
a v2 requirement, and adding it is not silent: under §6 / R14 the canon
set is not add-only, so it lands at a format bump where every consumer
sees it.

A consumer that intends to canonicalize values beyond this corpus — and
any consumer using the canonicalizer for its own data does — should
test the uncovered cases against RFC 8785 and §1 directly rather than
inferring coverage from a green conformance run.

### 3.2 How the vectors are checked — two ways, and only one of them is strong

**Weak check (free, do it anyway).** Parse each `canon` record, take its
`value` member, canonicalize it, compare to its `bytes` member. This is
one half of the both-ways law. It catches most emitter faults.

**Strong check (required).** **Construct all ten values natively in the
consumer's own language, from the specification in the table above and
not by parsing the corpus, canonicalize them, and compare to the `bytes`
strings above.** This is where `key-order` earns its place: once the
value is in the file it is already sorted, so re-canonicalizing a parsed
value sorts nothing. Only a value the consumer built with `b` inserted
first exercises the sort.

Every consumer's conformance suite MUST include the strong check. All
three bound implementations do (§8.1). The checklist in §8.2 is keyed
to these vector names precisely so the strong check can be ticked off
vector by vector.

### 3.3 The independent reference

`scratch/km-canon/canon_vectors.py` — a standalone, dependency-free
Python program written from this section and from nothing else. It
implements the serializer of §1, constructs the ten values natively
from the specification in the table above, prints their bytes and their
full records, and self-checks the both-ways law, the refusal of
fractions and negatives, and the 2^53 + 1 precision claim. It also
prints the four gap vectors of §3.1, marked as what they are — not
canon vectors, in no corpus — so this reference makes the same coverage
claim the document does and no larger one. Run it with
`python canon_vectors.py`; it exits nonzero on any failure.

It exists so the ten strings above have a machine-checked origin that
does not run through any of the three bound implementations, and so
that a three-way disagreement has a fourth opinion to break it rather
than being settled by majority.

Two companions sit beside it, both scratch, both wired into nothing,
neither a gate:

- `scratch/km-canon/check_doc.py` reads the committed corpus and this
  document and asserts that every byte-exact block quoted here is the
  corpus's own bytes, that every count quoted here is the corpus's own
  count, and that the ten lines `canon_vectors.py` derives from §3
  match the corpus's canon group exactly. It is how the numbers in this
  document stay true to the file. It also validates the `program` group
  against §2.7 — the record shape, the declaration members, the argref
  forms, the newest-first order, the edge rule, and the
  `bytes`-equals-canonicalize-`declaration` self-test — and when the
  group is not in the corpus it prints **WAITING** lines rather than
  passes or failures, so its output is honest in both tree states
  instead of green by silence.
- `scratch/km-canon/recanonicalize_v1.py` reads the corpus read-only and
  prints one canonically-serialized record per group plus the header
  line implied by the group counts. It was written against the format-1
  corpus to source the *(from the corpus)* examples in §2.2; the corpus
  it reads is now format 2, and it reports the fixed-point property
  over whatever it finds there rather than over a pinned record count.

---

## 4. The doc group and the annotation story

### 4.1 Extraction rules

- **One `doc` record per closed-list type, and the extractor refuses
  rather than skips.** A closed-list type with no docstring is not
  omitted from the group — the extraction throws, naming the type, and
  the emit fails nonzero. `counts.doc` is therefore structurally equal
  to `counts.type`, today and after any future addition to the closed
  list. Order is type declaration order, so the two groups are
  index-aligned by construction.
- The text comes from the Lean environment (`findDocString?`), never
  from re-reading the source file with a regex and never from a human
  retyping it. A docstring edited in `Kernel/Definitions.lean` changes
  the corpus on the next emit, and that is the point.
- No reflow, no paraphrase, no truncation, no Markdown normalization.
  Internal newlines survive as `\n`. Backticks, arrows written as `->`,
  and inline code survive as written.
- **Edge whitespace, measured.** `findDocString?` returns the docstring
  with leading whitespace trimmed and **one trailing space preserved**
  — the space that sits before the closing `-/` in the source. The
  corpus carries that trailing space on all twenty-two records; the
  examples in §2.2 show it. It is not trimmed, not normalized, and not
  something a consumer may quietly drop, because dropping it breaks the
  both-ways law.
- **One documented downstream deviation, in prose only.** The
  TypeScript prose renderer
  (`packages/plait/scripts/render-kernel-prose.ts`) trims trailing
  spaces at line ends, because Markdown discards them anyway, and says
  so in the banner of every page it generates. That is a property of
  the *prose projection*, not of the corpus and not of the generated
  schemas: the untrimmed text is what `KernelSchemas.generated.ts`
  carries. A renderer is allowed this because nothing round-trips
  through prose; a parser is not. The two preceding bullets are R12,
  closed by measurement.
- **The one transliteration**, per §4.2: U+2014 becomes `--` before
  canonicalization. This is the only place a docstring's characters are
  changed, and it is why this section says "mechanically extracted"
  rather than "byte-raw".

### 4.2 The ASCII collision — closed, option 1

Measured against `verify/kernel/Kernel/Definitions.lean`: all
twenty-two closed-list types carry a docstring, and **five of those
docstrings contain U+2014 EM DASH** — `AnchorFact`, `Act`,
`CandidateAnchor`, `CandidatePredicate`, and `Applicability`. None
contains any other non-ASCII character.

That collided head-on with two rules that are both binding:

- §1.3: the corpus is ASCII.
- The slice constitution: `verify/kernel` is byte-frozen and read-only to
  every lane, so the em dashes cannot be transliterated at the source.

Three resolutions existed and only three. They were not equivalent, and
the reasoning is kept here so the choice is auditable rather than
merely recorded.

1. **Transliterate at extraction.** The emitter maps U+2014 to `--`
   (or ` -- `) as a documented, mechanical, total normalization applied
   after `findDocString?` and before canonicalization. The corpus stays
   ASCII, the both-ways law is untouched, every consumer stays simple.
   The cost is honesty: `doc` is then the docstring *normalized*, not
   raw, and this document must say so in §4.1 rather than say "raw".
2. **Relax ASCII for the corpus.** The file becomes UTF-8-not-ASCII, the
   em dash is emitted raw (JCS never escapes above U+007F, so raw is the
   only JCS-legal spelling), and the byte-level check "every byte
   `<= 0x7F`" retires. The cost lands on every consumer: Go and
   TypeScript handle UTF-8 fine, but the sort-order honesty note in §1.2
   stops being hypothetical, and a fourth consumer in a language with
   weak Unicode support inherits a real problem.
3. **`\u2014`-escape it.** **Refused.** JCS escapes nothing above
   U+007F, so a JCS-conformant peer re-emitting the parsed value writes
   the raw em dash and the both-ways law fails across implementations.
   This option looks like the cheap one and is the only one that breaks
   the law this schema is built on. It is recorded here so nobody
   rediscovers it.

**Option 1 is what the emitter does.** The rule, as implemented and as
binding:

> **The transliteration rule (NORMATIVE).** Docstring text is
> transliterated to ASCII through a **named table**, applied after
> `findDocString?` and before canonicalization. The table has exactly
> one entry today: **U+2014 → `--`**. A code point that is neither
> printable ASCII (U+0020–U+007E), nor LF, nor named in the table is
> **refused** — the emit fails nonzero and the error message reports
> the offending code point. Nothing is silently dropped, substituted,
> or escaped.

Two consequences to state plainly:

- **`doc` records are not byte-raw**, in exactly this one documented
  way, and this document says so rather than claiming "raw". Everything
  else about the text — wording, internal newlines, edge whitespace —
  is what the environment returned.
- **The refusal arm is the load-bearing half.** A future docstring
  reaching for a non-breaking space or a curly quote reddens the gate
  with its code point in the message. A silent replacement would deny
  that signal, and a table that grows by accident is a table nobody is
  reading. Adding an entry is a deliberate edit to
  `Unity.Shape.transliterations`, reviewable as a diff.

Recorded as **R9, CLOSED**. It was flagged as the single most likely
place the three lanes would disagree; the emitter chose, the corpus is
ASCII, and the other two lanes read what it wrote.

### 4.3 Annotations are consumers, not decoration

The normative intent of the `doc` group and of the taught table is that
they land in **Effect Schema annotations** on the TypeScript surface.
Annotations are a first-class consumer of this corpus, on the same
footing as generated constant tables, and they are **generated, never
hand-written**. A hand-typed `description` that restates a docstring has
forked the model exactly as surely as a hand-typed refusal table would.

**The TypeScript lane implements exactly this mapping.**
`packages/plait/src/KernelSchemas.generated.ts` is emitted from the
corpus and carries `identifier`, `title`, `description`, and examples
per the table below; its regeneration is byte-identical and gated. The
mapping is therefore a description of shipped code, not a proposal —
with one measured amendment, `canonicalExamples`, recorded after the
table.

The estate already annotates: `packages/plait/src/Digest.ts:12` carries
`.annotate({ identifier: "PlaitDigest" })`, and
`packages/plait/src/internal/refusals.ts` already rides a structural
refusal through `Schema.Annotations.Issue` under the
`@foldlab/plait/refusal` key. The mapping below extends what is there
rather than proposing a new mechanism.

| Corpus field | Annotation | Rule |
|---|---|---|
| `type.name` | `identifier` | The stable schema identity. Estate convention prefixes the surface name (`Digest` → `PlaitDigest`), so the rule is *derive from* `type.name`, not *equal* it. |
| `doc.doc`, first sentence | `title` | A one-line human label. Mechanically: text up to the first `. ` or the first newline, whichever comes first. |
| `doc.doc`, whole text | `description` | The full docstring. This is the field that reaches an agent as a tool-parameter description, so a stale one is a wrong answer, not a typo. |
| `encoding.act` for the vectors of a type | `examples` | Real values from the model, so an example can never drift from what the door admits. `Act` takes the twelve encoding vectors; the ten canon vectors are the `examples` of whatever schema describes a canonical value. |
| `admission` rows | `examples`, negative arm | The seventeen verdicts are the worked examples of the door: sixteen things it refuses, one it admits. |
| `refusal.law`, `refusal.repair` | issue annotation payload | Already the shape in `internal/refusals.ts`: the refusal rides the issue rather than being flattened to a message string, so `law` and `repair` survive the parse boundary intact. |
| `refusal.applicability` | issue annotation payload | The `machine-applicable` flag is what tells an agent whether it may apply the repair without asking. It must survive to the caller or the codemod catalog is just prose. |
| `canon` records | `canonicalExamples`, a custom key | A byte-string annotation, added because `examples` could not carry these. See below. |
| `kind.rank`, `stage.rank` | not an annotation | Ranks are wire data. They belong in generated constant tables, not in display metadata. |

**The `canonicalExamples` amendment, and why it exists.** Measured at
the Effect version in use (rc.108): **Effect's JSON Schema export drops
the `examples` key entirely whenever any example holds a `bigint`.**
Corpus numbers are `bigint` by rule (§9.1), so the `big-integer` canon
vector and every encoding vector are exactly the values that trigger
the drop — the examples that matter most are the ones that vanish, and
they vanish silently, in the generated JSON Schema, downstream of every
test that only looks at the Effect schema object.

The lane's response is a second, explicit annotation key,
`canonicalExamples`, holding each example's **canonical serialization
as a JSON string** rather than the value. A string survives the export
path unconditionally. The generated module exports the key name as
`KERNEL_CANONICAL_EXAMPLES_KEY` so consumers join on a constant rather
than a spelling, and a test asserts the array's length equals the
corpus's canon count and its first entry equals the corpus's first
canon `bytes`.

This is a workaround with a stated cause, not a design preference. If a
later Effect release carries `bigint` examples through the JSON Schema
export, `canonicalExamples` becomes redundant and can retire; until
measured otherwise, it is how a canonical example reaches an agent's
tool description at all.

Two consequences worth making explicit, because they are the reason to
do this at all:

1. **The docstring reaches the agent.** Effect Schema annotations feed
   JSON Schema generation, and JSON Schema is what an MCP tool surface
   publishes as its parameter descriptions. A sentence written once in
   `Kernel/Definitions.lean`, proved against, and emitted into the
   corpus, arrives in an agent's tool description with no human in the
   path. That is the agent-first posture applied to documentation.
2. **`title` and `description` become checkable.** Because they are
   derived, a test can assert that every annotated schema's
   `description` equals the corresponding `doc` record's text. A
   drifted annotation becomes a failing test rather than a slowly
   rotting comment.

---

## 5. Determinism

Every rule in §1 and §2 exists so that two runs of the emitter, and two
readings by different consumers, produce the same bytes and the same
meaning.

1. **Record order is total**, per §2.1. Nothing is sorted alphabetically
   at emit time; the only sort in the whole schema is the member sort
   *inside* a record, and that one is mandatory.
2. **Key order is derived, not declared.** Format 2 has no key-order
   table. If two producers disagree about member order, one of them is
   not sorting.
3. **No incidental data.** No timestamps, no commit hashes, no absolute
   paths, no host names, no iteration over an unordered container.
4. **No non-integer numbers.** A `1.0`, an exponent, or a minus sign is
   malformed, not a lenient equivalent.
5. **ASCII only**, unconditionally, by the transliteration rule of
   §4.2 — which is itself deterministic and total on the corpus, and
   refuses rather than guesses on anything it does not name.
6. **Byte-identical regeneration.** Re-running the emitter over an
   unchanged model must reproduce the file byte for byte. This is
   existing house discipline, already enforced for the fabric corpus,
   and it is the property that makes the file reviewable as a diff.
7. **The both-ways law** (§1.4) holds in every implementation, and its
   test is in that implementation's gate.

---

## 6. Versioning discipline

- **`format` is a major-only integer.** There is no minor version and no
  semantic-version string. It is `2`.
- **Any grammar change bumps it.** A new key, a removed key, a changed
  field meaning, a changed group order, a renamed record group, a
  removed record group, a changed encoding tag or arity, a renumbered
  kind or stage rank, a renamed wire reason, or **any change to the
  canonical form of §1** — all of these are format bumps.
  - Format 2 removes one bump trigger that format 1 had: a *key order*
    change is no longer expressible, because key order is derived.
- **Consumers MUST refuse an unknown format.** Not warn, not
  best-effort, not degrade: refuse, with a nonzero exit or a thrown
  error naming both the format found and the format understood.
  Best-effort parsing of an unknown grammar is how a wrong table reaches
  production silently.
- **Record groups are add-only within a format.** A new group may be
  introduced without a bump, provided it is appended after all existing
  groups in file order and existing records are untouched. Consumers
  MUST skip unrecognised record groups rather than fail — this is the
  one place leniency is correct, and it is what makes the add-only rule
  usable.
  - **`program` is the worked instance.** The ninth group (§2.7) is
    added exactly this way: appended after `canon`, existing records
    untouched, `format` still `2`. It is the rule being exercised rather
    than merely stated, and a consumer written against the eight-group
    corpus must keep passing against the nine-group one without an edit.
  - Corollary: a consumer MUST NOT validate `counts` by requiring that
    its keys be exactly the ones it knows. It must check that every key
    it knows is present and agrees; an unknown counts key belongs to an
    unknown group and is skipped with it.
  - Corollary: a `counts` key is a *member of an object*, so it lands in
    sorted position, not at the end. `program` sorts sixth of nine
    (§2.2). A consumer reading `counts` positionally is broken by any
    add-only group, which is one more reason the rule above is stated
    over keys.
  - Corollary: adding a type to the §2.4 closed list, or an encoding
    vector, is add-only. Removing one is a bump. A `doc` record is not
    added independently: it arrives with its type, because the extractor
    refuses a closed-list type that has none (§4.1).
  - Corollary: **the ten canon vectors are not add-only.** They are the
    cross-implementation reference; adding an eleventh changes what
    "conforming" means for every consumer at once. Changing the canon
    set is a bump. A consumer that wants coverage beyond the ten adds
    **native** vectors in its own suite (§3.1), which bind nobody else
    and need no bump.
  - Corollary, **unruled**: whether the `program` vector set is add-only
    within the group is not settled by the freeze. The canon set is not,
    for a stated reason that may or may not carry over. §12 R20 keeps it
    open rather than letting silence become a rule.
- **The wire reason is the stable identifier.** Consumers key on
  `reason`, never on a refusal's position in the file. Positions are
  stable within a format but are not the contract; only `rank` is
  wire-stable in the stronger sense, because it is carried inside
  encodings.
- **Editing a `law`, `repair`, or `doc` text is not a bump.** These are
  display strings. But it does change the artifact bytes, so it lands
  with a regenerated fixture in the same commit, and any consumer
  asserting on the text — a prose snapshot, a golden test, a generated
  annotation — updates in that commit too.

---

## 7. Migration: format 1 to format 2

### 7.1 What changed

| | Format 1 | Format 2 |
|---|---|---|
| Serialization | Bespoke: a fixed, non-alphabetical key order per record type | Estate canonical JSON (§1): members sorted, one rule for everything |
| Numbers | "no floats", width unspecified | Unbounded non-negative integers, minimal decimal, arbitrary-precision parse required |
| Round-trip | Not specified | The both-ways law (§1.4), normative on every consumer |
| Groups | 6 + header, 85 lines | 8 + header, 117 lines at minting; add-only since |
| New groups | — | `doc` (22), `canon` (10) at the bump; `program` added after, add-only (§2.7) |
| Emitter risk | An order-preserving writer per producer | None: the natural sorted-map rendering is correct |
| Consumer parse | Must be order-preserving or lose a check | A hash-map parse is safe |

The six original groups keep their fields, their meanings, their
internal order, and their relative order. Nothing was renamed and
nothing was removed. Mechanically, a format-1 record becomes its
format-2 record by parsing it and re-serializing it canonically —
which is what `scratch/km-canon/recanonicalize_v1.py` demonstrated
against the format-1 corpus while it was the committed one. That corpus
has since been replaced by the format-2 emission, so the script now
reports the same fixed-point property over the format-2 record set
rather than over 85 records. The property is the point; the count is
whatever file it is pointed at.

### 7.2 Why the v1 fixed key order was retired

It was a rule that fought its own producer. Lean's `Json` is backed by a
sorted map, so the natural rendering sorts; format 1 demanded an order
that was not sorted, which meant every producer needed a bespoke
ordered-pair writer, and format 1's own §2.2 named that as the
highest-risk detail in the build. The rule bought one thing — a
consumer could detect a re-serialization fault by comparing key order —
and the both-ways law buys that same detection and much more, without
requiring anyone to write a special writer or a special parser.

The remaining argument for a fixed non-alphabetical order was
readability: `record` first reads nicely in a terminal. That is worth
less than the correctness of three independent producers. A reader who
wants `record` first can pipe through a formatter; a producer that
mis-orders keys ships a wrong file.

### 7.3 The consumers-refuse-unknown-formats rule, doing its job

The rule in §6 is why this bump is safe to make in one commit. Every
format-1 consumer refuses a `"format":2` file loudly, at the first line,
naming both integers — it does not read the 85 lines it recognises and
quietly build a table missing the `doc` group. A consumer that had been
written "leniently" would instead half-succeed, and the failure would
surface as a wrong annotation or a missing description somewhere
downstream, weeks later.

The practical consequence: **a consumer is upgraded and the corpus is
regenerated in the same commit.** There is no window in which a
format-1 reader meets a format-2 file except as a hard, immediate,
well-named refusal. That refusal is the feature.

---

## 8. Cross-language agreement, as measured

Agreement is not "the three implementations pass their own tests". It
is a specific, small set of identities over one file. This section
reports what those identities are and what running them produced. It is
written from results, not from a plan.

### 8.1 What agreement means, and what was measured

**Three parse-reemit identities, over the same file** — 22632 bytes when
this was measured, at format 2's minting and before the `program` group.
All three hold. The identity is over whatever the committed corpus is,
not over a pinned size.

| Implementation | Where | The identity | Gate | Status |
|---|---|---|---|---|
| Lean | `verify/unity` | Emit the corpus; re-read the emitted file, parse, re-emit canonically; compare bytes | `verify/unity/run.sh` | **holds** |
| TypeScript | `packages/plait` | Read the committed corpus, parse, re-emit canonically; compare bytes | the package's test wall | **holds** |
| Go | `go/kmconform` | Read the committed corpus, parse at arbitrary precision, re-emit canonically; compare bytes. **`go test -count=1`**, always — the module's own `AGENTS.md` records that Go's test cache cannot attribute a mutation in a file outside the module root, so a cached `ok` will happily cover a mutated fixture | the Go gate line | **holds** |

Each identity is *within* one implementation. Agreement *between* them
follows: if all three re-emissions equal the committed bytes, all three
equal each other. The integration check is therefore one hash compared
three times, not three pairwise diffs — and that is how it was run.

**Ten shared canon vectors, constructed natively.** Each implementation
constructs the ten values of §3 in its own language — not by parsing the
corpus — canonicalizes them, and compares to the ten `bytes` strings.
All three do this, for all ten vectors. This is the strong check of
§3.2, and it is the half of agreement that a parse-reemit identity
cannot reach, because the corpus already contains sorted members and
normalized escapes.

**A fourth opinion to break a tie.** Every implementation's ten outputs
are diffed against `scratch/km-canon/canon_vectors.py`'s printed
output, which derives the ten from §3 alone and consulted no Lean,
TypeScript, or Go source. A three-way disagreement resolves against
that reference and against this document, not by majority.

**Where the corpus overruled the draft.** Two of the ten vectors were
specified in this document before the emitter ran, from a freeze that
named the characters without pinning the string. The emission chose
differently, and the emission is normative: `string-escapes` is
`a"b\c<LF>d<TAB>e`, not the longer `quote … backslash …` spelling an
earlier draft carried, and `control-char` is the bare U+0001, not
`control<U+0001>char`. §3 and the checklist below are the corrected
text. The cost of the shorter spellings is a coverage gap, which §3.1
names and the TypeScript lane closes with native vectors.

### 8.2 The per-consumer conformance checklist

Every consumer — the three above and any fourth — ticks every row. The
canon rows are keyed by vector name so the strong check of §3.2 is
itemized rather than summarized.

**Serialization**

- [ ] `empty-object` — the empty object renders `{}`
- [ ] `empty-array` — the empty array renders `[]`
- [ ] `empty-string` — the empty string renders `""`
- [ ] `zero` — zero renders `0`, not `-0`, `0.0`, or `00`
- [ ] `big-integer` — 2^53 + 1 renders `9007199254740993`, exactly
- [ ] `key-order` — an object built `b` first renders `{"a":2,"b":1}`
- [ ] `nested-object` — sorting recurses: `{"z":{"y":[3,4]}}`
- [ ] `nested-array` — array order is preserved: `[[],[{}]]`
- [ ] `string-escapes` — the nine-character string `a"b\c<LF>d<TAB>e`
      renders `"a\"b\\c\nd\te"`
- [ ] `control-char` — the one-character string U+0001 renders
      `"\u0001"`: four hex digits, zero-padded, lowercase

**Parsing**

- [ ] Integers parse at arbitrary precision; `9007199254740993` survives
- [ ] A number carrying `.`, `e`, `E`, or `-` is **refused**, not coerced
- [ ] The two-character escapes and `\u00XX` both decode
- [ ] A byte above `0x7F` is refused
- [ ] A CR byte anywhere is refused
- [ ] A missing final LF is refused

**The both-ways law**

- [ ] Whole-corpus parse-reemit is byte-identical to the input file
- [ ] Every `canon` record's `value`, canonicalized, equals its `bytes`
- [ ] Every `program` record's `declaration`, canonicalized, equals its
      `bytes` (§2.7) — or the group is skipped wholesale, per the
      add-only rule
- [ ] All of the above run inside a gate this implementation's build
      already executes

**Grammar**

- [ ] `format` is refused unless it is an integer this consumer knows
- [ ] Unknown record groups are skipped and logged, never fatal
- [ ] Every `counts` key the consumer knows equals the records it read;
      unknown counts keys are skipped with their group
- [ ] The line count is validated as `1 + sum(header.counts)`, **not**
      against any literal (§2.1, §11 check 12) — the `program` group is
      the case that breaks a pinned 117
- [ ] The full structural checklist of §11 passes, except where §11
      marks a check consumer-optional

**Program group** *(required of a consumer that reads the group; a
consumer that skips it ticks the skip row instead)*

- [ ] The group is either fully validated or fully skipped — never
      half-read
- [ ] Each `declaration` has exactly the members `edges`, `holes`,
      `lineage`, `nodes`, all present, arrays possibly empty
- [ ] Every node's `generator` is one of the eight names, and every
      `args` key is a field name of that constructor from the `type`
      group — **a subset, not an equality** (§2.7.1)
- [ ] Every argref's `arg` is `digest`, `local`, `literal`, or `hole`,
      with that tag's exact member set; `"local"` and `"hole"` are
      distinguished by tag, not by shape
- [ ] Every `"hole"` argref names a hole the declaration declares
- [ ] Node names are unique, and every `local` argref names a node
      appearing **later** in the array (§2.7.3)
- [ ] `edges` equals exactly the consumptions implied by the local
      argrefs — no more and no fewer
- [ ] `holes` ascends by `name`

**Recommended, not required**

- [ ] Native gap vectors covering what the ten do not reach (§3.1): a
      control character with text on both sides, a hex-letter escape,
      `\b` and `\f`, and the three JSON literals

### 8.2.1 Where the three consumers stand

Measured, not projected. A gap is named as a gap.

| | Lean (`verify/unity`) | TypeScript (`packages/plait`) | Go (`go/kmconform`) |
|---|---|---|---|
| Both-ways law, whole corpus | yes | yes | yes |
| Ten canon vectors, native | yes | yes | yes |
| Native gap vectors beyond the ten | — | yes, four (§3.1) | — |
| Generated tables from the corpus | n/a (it is the producer) | yes, regeneration checked | yes, regeneration checked |
| Line count validated from `counts` | yes, per group against records present | snapshot pins the literal 117 beside the eight group counts — **the one place the `program` group will force an edit**, and the reason §11 check 12 states the rule as a sum | yes, `lines == 1 + sum(counts)`, and says why in its own comment |
| `program` group (§2.7) | producer — the four vectors are emitted from the model | the builder slice's coherence wall replays them | read-only replay (parse, validate, re-emit) |
| §11 check 19, act-decoder round-trip | yes | yes | **not implementable — no act decoder exists in Go** |
| Brand enforcement lint | n/a | n/a | 2 of the 4 checks §9.2 asks; see below |

The Go row deserves its two sentences rather than a tick.

- **Check 19 is consumer-optional.** It requires a decoder for the act
  encoding, and Go has none — no `DecodeAct`, nothing to round-trip
  through. The Go consumer validates each vector's arity against its
  generator tag, which is the part of check 19 that does not need a
  decoder, and stops there. §11 marks the round-trip half optional for
  exactly this reason. It is a real gap in coverage, not a redefinition
  of the check: a Go decoder, when one exists, inherits the obligation.
- **The brand lint ships two of four.** `go/brandlint` implements
  §9.2's checks 1 and 2 — cross-brand conversion is a finding unless
  carried by a directive comment, and comparison or arithmetic between
  a brand type and an untyped constant is a finding. Checks 3
  (mandatory `errcheck` on brand-guarded methods) and 4
  (sealed-interface exhaustiveness) are **not implemented**; both need
  machinery that does not exist in the module today, and neither is
  closed by writing more of the same analyzer. They are named in §9.2
  and they stay named until something covers them.

### 8.3 What a fourth consumer must implement

The whole obligation, with nothing hidden. A fourth consumer needs:

1. **An arbitrary-precision non-negative integer type**, with a
   minimal-decimal writer and a parser that refuses fractions,
   exponents, and minus signs. In a language with only fixed-width
   integers this is the one place real work may be needed; a checked
   64-bit width is acceptable *only* if the consumer refuses on
   overflow rather than wrapping or saturating.
2. **JCS string escaping, both directions** — seven escapes plus the
   `\u00XX` fallback in lowercase, and nothing else escaped.
3. **A lexicographic member sort** applied recursively at every object.
4. **A JSON parser whose output does not depend on member order** —
   which, under format 2, any ordinary parser satisfies.
5. **The format check, the group skip, and the counts cross-check** of
   §6.
6. **The ten canon vectors, constructed natively**, per §3.2.
7. **The both-ways law**, per §1.4, wired into its gate.

**The `program` group adds nothing to that list.** Its records are
ordinary canonical JSON, so items 1–4 already cover reading and
re-emitting them, and §6's skip rule means a fourth consumer may ignore
the group entirely and still conform. Understanding the declaration
grammar of §2.7 is what a consumer needs to *use* programs, not what it
needs to read the corpus faithfully — the same line §9 draws.

Items 1–4 are the serializer, and the serializer is small: the reference
implementation in `scratch/km-canon/canon_vectors.py` is under a hundred
lines of standard-library Python including comments, and it is itself
the worked example of a fourth consumer — Python is not one of the three
implementations the freeze binds. A candidate fourth consumer that finds
this section expensive has almost certainly reached for a general JSON
library and is fighting its number path; writing the serializer directly
is the shorter road.

What a fourth consumer does **not** need: any Lean, any knowledge of the
model's proofs, any order-preserving parse, or any of the mapping
machinery in §9. Those are for a consumer that wants to *use* the act
language, not merely to read the corpus faithfully.

---

## 9. Mapping tables: the flexibility layer

The schema is deliberately language-neutral, which means each target
language loses something. This section says exactly what.

### 9.1 To TypeScript

TypeScript has structural typing and full erasure: nothing survives to
runtime. Brands are therefore *comments the compiler enforces* — the
standard trick is an intersection with an otherwise-unused property.

| Schema | TypeScript | Notes |
|---|---|---|
| `Nat` | `bigint` | See the width caveat below. `number` is wrong for corpus numbers. |
| `String` | `string` | |
| `List(T)` | `readonly T[]` | |
| `Option(T)` | `T \| undefined` | Or the estate's `Option` if one is in use at the call site. |
| kind record | `const KINDS = [...] as const; type DeclKind = typeof KINDS[number]` | The literal union is the closed universe; adding a kind is a compile error at every exhaustive switch. |
| `rank` | `const KIND_RANK: Record<DeclKind, number>` | Generated, never typed by hand. |
| stage record | same shape; plus `stageReached(a, b) => RANK[a] >= RANK[b]` | |
| refusal record | `type RefusalReason = "clock-read" \| ...` plus a generated `TAUGHT: Record<RefusalReason, Refusal>` | The wire reason *is* the TypeScript type. |
| `Digest(program)` | `type ProgramDigest = Carrier & { readonly __kind: "program" }` | A string-literal brand. Two kinds do not unify; the brand name comes from the emitted kind table. `Carrier` is `bigint` if the surface mirrors the model's `id : Nat`, and `string` if it mirrors the estate's existing hex-digest surface (`packages/plait/src/Digest.ts`, 64 lowercase hex characters). The brand mechanism is the same either way; the carrier choice is the runtime's, not the schema's. |
| `Digest(kind)` (bound) | `type Digest<K extends DeclKind> = Carrier & { readonly __kind: K }` | A genuine phantom type parameter. When the caller's kind is statically known, cross-kind mixing is a compile error. |
| `Token(register)` (bound to a *value*) | `type Token<R extends ProgramDigest> = ...` only when the register is a literal type | See below. |
| `type` record | a discriminated union per `inductive`; an interface per `structure` | `{ readonly _tag: "declare"; readonly kind: DeclKind; ... }`. |
| `doc` record | `.annotate({ description })` on the corresponding schema | §4.3. The trailing space of §4.1 rides through unchanged. |
| `canon` record | the conformance suite's fixture table, plus a `canonicalExamples` annotation | §3.2 strong check; §4.3 for why the byte-string annotation exists. |
| encoding vector | `readonly bigint[]` fixture | |
| admission vector | test table | |
| `program` record | a `Declaration` type — a discriminated union per argref tag, `readonly` arrays for `edges`/`holes`/`lineage`/`nodes` — plus the vectors as a fixture table | §2.7. The union discriminates on `arg`, exactly as the act union discriminates on `_tag`. The builder's own output is compared to these bytes, so the fixture is a conformance oracle rather than a snapshot. |

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
above 2^53 lose precision, and the corpus's `lawful-declare` encoding
already contains `7000051000172`. Corpus numbers are carried as `bigint`,
and `JSON.parse` alone is not a conforming parser — it produces
`number`. A conforming TypeScript reader needs a reviver or its own
scanner. This is the concrete reason the `big-integer` canon vector
exists. Second, the standing runtime pin finding stands: in the Effect
version in use, type identities are string-literal brands, not unique
symbols, so brand names must come from the emitted kind table rather
than from locally minted symbols.

**A third caveat, measured at rc.108 and consequential:** because
corpus numbers are `bigint`, Effect's JSON Schema export silently drops
the `examples` key from any schema whose examples hold one. The
`canonicalExamples` byte-string annotation of §4.3 exists to route
around it. A TypeScript consumer that annotates with `examples` alone
and then publishes JSON Schema will publish no examples at all, and
nothing in the Effect schema object will say so.

### 9.2 To Go

Go has nominal typing: a *defined type* (`type ProgramDigest uint64`) is
a genuinely distinct type from its underlying type and from every sibling
definition. That gives kind brands directly and at compile time.

| Schema | Go | Enforcement |
|---|---|---|
| `Nat` | `*big.Int`, or a checked `uint64` that refuses on overflow | |
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
| `program` record | structs for `Declaration`, `Node`, `Edge`, `Hole`; an argref as a tagged struct or a sealed interface | §2.7. Read-only in the Go lane: parse, validate against §11's program checks, re-emit byte-identically. Leak 4 of this section applies to the argref union as it does to the act union. |

Go's `encoding/json` deserves a specific warning: `json.Unmarshal` into
`any` yields `float64` for every number, which fails `big-integer` on
contact. A conforming Go reader uses `json.Decoder` with `UseNumber()`
and converts through `big.Int`, or scans the bytes itself. The estate's
own `go/canonical/` package already implements RFC 8785 and is the
natural place to add the integer deviation, but it must be *added*: a
faithful JCS implementation is not a conforming implementation of this
schema until its number path is replaced.

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

**What a vet-style lint needs to cover, and what shipped.** Four checks
close the gap, in decreasing order of value. **Two of the four are
implemented**, in `go/brandlint`; two are not, and are named as gaps
rather than deferred quietly.

1. **Conversion between brand types is a finding** unless the
   destination is the underlying type at a serialization boundary
   explicitly marked with a directive comment. This closes leak 2, the
   worst one, because it is silent and always available.
   **Implemented** in `go/brandlint`.
2. **Comparison or arithmetic between a brand type and an untyped
   constant is a finding**, except against a designated zero. This
   closes leak 1. **Implemented** in `go/brandlint`.
3. **A discarded `error` from a brand-guarded method** (`Spend`,
   `Compare`) **is a finding.** **Not implemented.** `errcheck` covers
   the shape, but making it *mandatory* is the whole content of the
   check, and the module has no mechanism today that makes a
   third-party linter a gate condition. Until it does, a caller who
   drops the returned error loses the only enforcement the value-level
   brands have, and nothing says so.
4. **A type switch over a sealed act interface that lacks a case per
   generator is a finding.** **Not implemented.** It needs
   exhaustiveness machinery over a sealed interface that does not exist
   in the module, and it is not a variation on checks 1 and 2 — a
   different analysis, over different information.

Checks 1 and 2 had no standard implementation and were written:
`go/brandlint` is stdlib-only (`go/parser` plus `go/types`), shaped like
a `golang.org/x/tools/go/analysis` Analyzer so it lifts onto one through
a single adapter if the module's dependency law ever changes. Brands are
declared by a directive comment on the type, emitted from the corpus, so
the brand set is derived from the model rather than listed in the
linter; a deliberate cross-brand conversion is written with a second
directive on the conversion line, which keeps the reason in the source
and keeps the exceptions countable.

Checks 3 and 4 remain open. That is the honest current price of the Go
target: **a Go consumer's guarantees are weaker than the TypeScript
consumer's, which are weaker than the model's**, and the two unwritten
checks are exactly where the difference lives.

### 9.3 To prose

The taught table is not merely renderable as documentation — it *is*
documentation, and treating it as anything else duplicates it. The
rendering is mechanical:

| Group | Renders as |
|---|---|
| header | A provenance line naming the source model and format, plus a do-not-edit banner. |
| kind | A rank/name table, prefaced by the sentence that the universe is closed. |
| stage | A rank/name table, prefaced by the reached-at-least reading. |
| refusal | One section per reason: the wire name as heading, then **Law**, **Repair**, **Applicability**. This is the reference an agent reads when the door refuses it. |
| refusal (filtered) | A second table of just the machine-applicable rows: the codemod catalog. |
| type | One section per type: name, brand parameters called out as brands, then a bullet per constructor listing its fields with their type references. |
| doc | The prose body of each type's section, above its constructor list. The `doc` group is what makes the rendered reference readable rather than a bare AST dump. |
| encoding | A vector/encoding table. |
| admission | A candidate/verdict/reason table — the door's behaviour as a specification a reader can check by eye. |
| canon | A serialization appendix: the ten values and their bytes, which is also the copy-paste source for a new consumer's test table. |
| program | One section per vector: the vector's intent, its node list read youngest-to-oldest, and its edges as a consumption list. The `bytes` go in a code block beside it. A renderer MUST carry the §2.7.5 non-claims verbatim beside the group — a reader who meets a program declaration without them will read it as a runnable thing. |

Two rules keep the rendering honest. First, the law, repair, and
docstring texts are reproduced **verbatim**; a renderer that paraphrases
has forked the model. Second, the conformance section carries the safety
disclaimer from §0 — a reader who meets the vectors without it will read
them as runtime guarantees.

**A format-2 renderer exists and is generated, not scratch.**
`packages/plait/scripts/render-kernel-prose.ts` reads the corpus and
emits the reference page under `docs/generated/`, with a do-not-edit
banner naming the source model, the generator, and the format it read.
It carries the §0 safety disclaimer verbatim, and it states its
mechanical exceptions in the banner rather than in a comment nobody
reads. There are exactly two: inside a Markdown table cell a line break
becomes a space and a pipe is escaped, because a cell holds neither;
and **trailing spaces are trimmed at line ends** (§4.1), which Markdown
discards anyway. The untrimmed text is what the generated schemas
carry, so the deviation is confined to the prose projection.

The older `scratch/km-polyglot/render-prose.ts` and its
`prose-sample.md` are the **format-1** exemplar and were not updated;
they are superseded by the generated renderer above and survive only as
reference.

---

## 10. The Go consumer

This section began as a viability survey. Go is no longer a candidate
target — the consumer exists, under `go/kmconform`, inside the live
`foldlab` module. What follows is the survey's findings and what
building against them actually cost.

### 10.1 What exists

The consumer and its neighbours, all inside `go/go.mod`:

| Path | What it is |
|---|---|
| `go/kmconform` | The consumer. Canonical JSON both directions, the corpus reader and validator, the ten canon vectors constructed natively, generated tables, and negative controls. |
| `go/cmd/kmgen` | The table generator, with a regeneration check beside it. |
| `go/brandlint`, `go/cmd/brandlint` | §9.2 checks 1 and 2, stdlib-only, vet-shaped. |

Eight `go.mod` files exist across the worktree; the consumer added none
of them:

| Path | Module | Status |
|---|---|---|
| `go/go.mod` | `foldlab` | **The live substrate module.** Go 1.26; `canonical/` (RFC 8785 JCS), `journal/` (CAS-append, verify-on-read), `register/` (the five-action commitment register), `substrate/`, and commands under `cmd/`. Depends on the pinned NATS libraries. |
| `proto/go/go.mod` | `foldlab/proto` | Live; `replace foldlab => ../../go`. |
| `scratch/km-polyglot/kmconform/go.mod` | — | The format-1 exemplar's generated package. Scratch, isolated, wired into nothing. |
| `docs/media/folding/scripts/refusal/go.mod` | — | Documentation media script. |
| `docs/research/reference/rq1-lean-c-backend/minimal-example/go-host/go.mod` | — | Research reference. |
| `docs/research/reference/rq3-wasm-verified-target/gen/go.mod` | — | Research reference. |
| `docs/research/reference/rq3-wasm-verified-target/gowasi/go.mod` | — | Research reference. |
| `docs/research/reference/rq3-wasm-verified-target/host-wazero/go.mod` | — | Research reference. |

There is no `go.work`, so the modules are independent. The toolchain
present is Go 1.26.5 windows/amd64.

### 10.2 The four warnings, and how each landed

The survey named four risks before the consumer was written. Each is
recorded here with what happened to it, because a warning that is never
checked against the outcome is just a hedge.

1. **The existing `canonical/` package implements JCS, not this
   schema — and its number path is exactly the deviation.**
   `CanonicalizeValue` documents that values outside
   `nil/bool/float64/string/[]any/map[string]any` refuse, and `Decode`
   documents its I-JSON constraint as "finite binary64 numbers". Every
   corpus number would land in a `float64`, so reusing the package
   unchanged produces a consumer that passes nine canon vectors and
   fails `big-integer` with `9007199254740992`. **Confirmed, and the
   consumer does not reuse it**: `go/kmconform` carries its own
   canonical-JSON path with an arbitrary-precision number type. The
   escaping and the member sort were the parts that carried over.
2. **The `-count=1` trap is load-bearing here.** `go/AGENTS.md` records
   the measurement: Go's test cache cannot attribute a mutation in a
   file outside the module root, so `go test ./...` prints `ok (cached)`
   over a mutated oracle. A kernel-conformance fixture living under
   `packages/plait/fixtures/` is exactly such a file. **Still binding**:
   any Go conformance test MUST run with `-count=1`, and its gate line
   must say so. This is the one warning that no code can retire — it is
   a property of the toolchain, not of the consumer.
3. **Generated Go must be `gofmt`-canonical or byte-identical
   regeneration is unenforceable**, because anyone running `gofmt -w`
   silently changes it. **Confirmed by running it** — the first
   generated file was not canonical. The generator formats its own
   output before writing, and `go/cmd/kmgen` ships a regeneration check
   beside it.
4. **The brand gap is not closed by the type system alone.** See §9.2.
   **Half-closed.** `go/brandlint` implements two of the four checks;
   the mandatory-`errcheck` and sealed-interface-exhaustiveness checks
   are not implemented. The ordering therefore still holds and should
   be stated wherever the Go consumer is relied on: **its guarantees
   are weaker than the TypeScript consumer's, which are weaker than the
   model's.**

### 10.3 The exemplars

Two scratch directories predate the consumer and are not it.

`scratch/km-polyglot/` — **format-1 exemplar only**, wired into nothing,
its own isolated module so it joins nothing. Contents and run
instructions are in that directory's `README.md`. It demonstrates a
schema-v1 sample, a stdlib-only Go generator validating it, a smoke test,
eleven single-mutation negative controls plus a positive control, and the
prose rendering. It has **not** been updated for format 2; its validator
would refuse a format-2 file at the header, correctly. It is superseded
by `go/kmconform` and survives only as reference.

`scratch/km-canon/` — the format-2 canonical-form reference (§3.3).
Python, standard library only, wired into nothing, not a gate. It is
*not* superseded: its whole value is being written from this document
rather than from any of the three implementations, so it stays as the
independent fourth opinion.

The real artifact is emitted by executing the model, per the standing
ruling that model/runtime vectors are generated, never hand-typed.

---

## 11. The integration validation checklist

The exact checks a consumer runs before trusting an artifact. Every one
is mechanical. Exactly one has a **consumer-optional** half — check
19's act-decoder round-trip, which binds only a consumer that has a
decoder. Everything else is required of every consumer.

### Byte level

1. **No CR bytes.** The file uses LF endings throughout.
2. **All bytes are ASCII** (every byte `<= 0x7F`). Unconditional: the
   transliteration of §4.2 is what keeps it true, and it is applied at
   the emitter, so a consumer only ever has to check it.
3. **The file ends with exactly one newline**; there is no trailing
   blank line and no line is empty.
4. **Every line parses as a JSON object**, and nothing follows the
   closing brace on a line.
5. **Every line is canonical**: re-serializing the parsed record per §1
   reproduces the line exactly. This one check subsumes member ordering,
   whitespace, escaping, and number form, and it is the per-line half of
   the both-ways law.
6. **No number carries `.`, `e`, `E`, or a leading `-`**, and every
   number round-trips at full precision.

### Structure

7. **Line 1 is the header**, and there is exactly one header record.
8. **`format` is an integer this consumer knows.** If not, refuse —
   naming both the format found and the format understood. Do not
   attempt a partial read.
9. **Groups appear in the §2.1 order**, with no interleaving.
10. **Unrecognised record groups are skipped, not fatal** (the add-only
    rule), and skipping is logged.
11. **Every `counts` key the consumer knows equals the number of records
    of that group actually read.** Unknown counts keys are skipped with
    their group.
12. **The line count agrees with the header:**
    `lines == 1 + sum(header.counts)`. A cheap cross-check that a
    partial read fails immediately. **State it as the sum, not as a
    literal.** The corpus had 117 lines at format 2's minting, but the
    add-only rule of §6 lets a further group join without a format
    bump — and one has: `program`, §2.7. A pinned integer breaks on that
    where the sum generalizes. A consumer that
    met an unrecognised group whose count the header omits should skip
    this check rather than fail it — the counts then no longer account
    for every line, and the check would be measuring the consumer's
    ignorance rather than the file.

### Tables

13. **Twelve kind records; ranks dense and ascending from 0 to 11; file
    order equals rank order; names unique.**
14. **Five stage records**, same conditions, 0 to 4.
15. **Sixteen refusal records; `reason` values unique**; every `law` and
    every `repair` non-empty (refusal parity is total); every
    `applicability` in `{machine-applicable, advisory}`; exactly four
    are `machine-applicable`, and they are `last-writer-wins`,
    `unverified-read`, `past-mutation`, `anchored-resolve`.
16. **Twenty-two type records**, names unique, `form` in
    `{inductive, structure}`, every `params[].role` in `{brand, type}`,
    every `structure` carrying exactly one constructor, named `mk`.
17. **Every `fields[].type` resolves**: its head name is `Nat`,
    `String`, `Ref`, a declared type name, or `List`/`Option` wrapping
    one of those; and every brand argument is either a `DeclKind`
    constructor name or the name of a preceding field or param in the
    same constructor.

### Vectors

18. **Twelve encoding records**, and generator tags 0..7 each appear at
    least once, so no generator is unrepresented.
19. **Each `act` has the arity its tag requires** (declare 4, resolve 3,
    emit 3, join 3, fold 8, decide 4, trigger 6, spawn 3). The arity
    check is required of every consumer.
    **Consumer-optional:** the round-trip half — `decode(act)` succeeds
    and re-encodes to the same array — binds only a consumer that has
    an act decoder. The Lean and TypeScript consumers do and run it.
    **The Go consumer does not: no act decoder exists in `go/kmconform`,
    so there is nothing to round-trip through**, and it validates arity
    alone. That is a named coverage gap, not a weaker reading of the
    check; a Go decoder inherits the obligation the day one is written.
20. **Seventeen admission records**: sixteen `refused` then one
    `admitted`, in that order.
21. **Every refused row's `reason` names a refusal record.** Every
    admitted row carries a non-empty `encoded`.
22. **At least one row is `admitted`.** A suite of refusals alone
    cannot distinguish a correct door from one that refuses everything.

### Doc and canon

23. **Every `doc` record's `name` names a `type` record**, `target` is
    `"type"`, and `doc` is non-empty.
24. **`doc` records appear in `type` declaration order, one per type,
    with no exceptions.** The count equals `counts.type` structurally,
    not coincidentally: the extractor refuses a closed-list type with
    no docstring rather than skipping it (§4.1), so a missing docstring
    is a failed emit and never a shorter `doc` group. The two groups
    are index-aligned, and a consumer may check equality rather than
    subsequence.
25. **Ten canon records, with exactly the names of §3, in that order.**
26. **Every canon record's `value`, canonicalized, equals its `bytes`.**
27. **The ten values constructed natively equal the ten `bytes`** — the
    strong check of §3.2. A consumer that only performs check 26 has not
    tested its member sort.

### The program group

*Numbered from 34 so that checks 1–33 keep the numbers other documents,
comments, and consumers already cite; the section sits here because it
reads in group order. A consumer that skips the group under §6's
add-only rule skips 34–39 with it — but it may not read the group and
run only some of them.*

34. **Every `program` record has exactly the keys `bytes`,
    `declaration`, `name`, `record`**, `name` values are unique within
    the group, and the group is the last group in the file.
35. **Every `declaration` has exactly the members `edges`, `holes`,
    `lineage`, `nodes`** — all four present, each an array, empty arrays
    written out rather than omitted (§2.7.1). No extra member.
36. **Every `declaration`, canonicalized, equals its `bytes`.** The
    program-level twin of check 26, and the half of the both-ways law
    that reaches the nested value a consumer will actually be asked to
    address.
37. **The graph is well founded**: node names are unique, and every
    `"local"` argref names a node at a **strictly later index** than the
    node carrying it, nodes being newest-first. Those two conditions are
    `Kernel.ProgramAdmission` read as a checklist, which is how a
    consumer discharges the consistency law of §2.7.5 without a proof
    assistant.
38. **`edges` equals exactly the consumptions implied by the local
    argrefs.** Every local argref contributes its (`from`, `to`) pair,
    and no pair appears that no argref implies. This is §2.7.3's
    consistency oracle and the cheapest builder-bug detector in the
    corpus.
39. **The parts are well formed**: every `generator` is one of the eight
    names; every key of a node's `args` is a field name of that
    constructor as the `type` group gives them — **a subset check, not
    an equality check** (§2.7.1); every argref's `arg` is `digest`,
    `local`, `literal`, or `hole`, carrying that tag's exact member set;
    every `"digest"` argref's `kind` is one of the twelve `DeclKind`
    names; every `"hole"` argref names a hole the declaration declares;
    `holes` ascends by `name` with no duplicate.

### Cross-record invariants

28. **Admission row *i* and refusal row *i* carry the same reason**, for
    *i* in 0..15. The kernel gate's `check_control` order and the
    `RefusalReason` declaration order coincide today; this check pins
    that coincidence so a reorder on either side is caught rather than
    silently accepted. If a future change deliberately breaks the
    alignment, this check is retired by a ruling, not by deletion.
29. **The admitted row's `encoded` equals the `act` of the encoding
    vector named `lawful-declare`.** These are two emissions of the same
    fact and must agree.

### Provenance and regeneration

30. **`source` is the expected model** and `generator` is the expected
    command. Display only; never branch on them.
31. **Regeneration is byte-identical.** Re-run the emitter over an
    unchanged model and compare hashes. This is the check that makes all
    the others durable, and it belongs in the gate that owns the
    artifact.
32. **Any code generated *from* the artifact is also regenerated
    byte-identically**, and is canonical for its language's formatter
    (`gofmt` for Go), so that a routine format pass cannot silently
    change it.

### The control arm

33. **The consumer's own validator has a negative-control arm**: for
    each check above that matters, a committed single-mutation fixture
    that the validator must refuse, plus the unmutated artifact which it
    must accept. A validator with no failing case proves nothing, and a
    validator that rejects everything proves nothing either.
    Format 2 adds five mutations worth committing specifically: a
    swapped pair of object members (fails 5), a `9007199254740992` in
    the `big-integer` canon record (fails 26), an uppercased hex digit
    in a `\u00XX` escape (fails 5), a `doc` record whose text has been
    reflowed (fails 31), and a `doc` record with its trailing space
    stripped (fails 5, and would pass a consumer that trims on read —
    which is the point of committing it).
    The `program` group adds three more: a **dropped edge** (fails 38
    and nothing else, which is the whole argument for writing the edges
    down twice), a **reversed edge** with `from` and `to` swapped (fails
    38, and would otherwise be a plausible-looking DAG), and a **node
    reordered oldest-first** (fails 37). Each is a single mutation and
    each is the shape a real builder bug takes.

---

## 12. Reconciliation items for integration

Points where this document had to resolve something the freeze does not
state, or states in tension with the source. Each was a place another
lane's implementation could turn out to be normative.

Five of them — R9 through R13 — were open when the lanes started and are
closed now, by the emitter running rather than by anyone deciding. One,
R14, stays open, and stays open honestly: it is a ruling about what
future change is allowed, and no measurement can settle it. The table
keeps its original style: what the freeze was silent about, what
resolved it, and, where the resolution is a measurement, what measured
it. Where the emission disagreed with this document's draft, the
emission won and the draft is what changed.

**R15 through R21 are the program group's items** (§2.7.6). They were
drafted before that group's emission and most are closed by it, in
exactly the way R10 and R11 were closed when format 2 was minted: the
document named a detail the freeze left unpinned, the emitter chose, and
the document was corrected. R16 and R21 are the two that changed this
document's rules rather than just filling in a blank, and R21 is the one
the draft did not see coming. R17, R19, R20 stay open, and say why.

| # | Item | Resolution taken here | Status |
|---|---|---|---|
| R1 | Format 1 demanded a fixed non-alphabetical key order, which fought Lean's sorted `Json` map and forced a bespoke writer. | **Retired by format 2.** Canonical form sorts members, which is what the sorted map already does. The highest-risk emitter detail in format 1 no longer exists. | CLOSED |
| R2 | `Ref` appears as a field type but has no `type` record, being an `abbrev`. | Treated as a declared leaf aliasing the pair `(DeclKind, Nat)`. | CLOSED (v1) |
| R3 | The freeze does not name the constructor of a `structure`. | `mk`, Lean's default. Confirmed against the emitted format-1 artifact. | CLOSED (v1) |
| R4 | The freeze's type-reference example shows only literal brands. | The grammar admits bound names and multi-argument references. Specified in §2.5. | CLOSED (v1) |
| R5 | `counts.type`. | **22**, matching the committed corpus. | CLOSED (v1) |
| R6 | `counts.encoding`. | **12**, the named set in §2.2, matching the committed corpus. | CLOSED (v1) |
| R7 | `params[].role` admits `"type"`, but no type in the closed list has a universe-level parameter. | Documented as reserved, so a later parameterised type is add-only rather than a bump. | CLOSED (v1) |
| R8 | The `admission` record has two shapes (`reason` vs `encoded`). | Under canonical form both are just sorted objects; a consumer selects the expected member set on `verdict`. The v1 "two key orders" problem is gone. | CLOSED |
| **R9** | **Five closed-list docstrings contain U+2014, and `verify/kernel` is byte-frozen, so the ASCII rule and the "raw docstring" rule cannot both hold.** | **Option 1 of §4.2, as implemented:** the emitter transliterates U+2014 to `--` through a **named table** and **refuses any other non-ASCII code point**, reporting the offending code point rather than mangling it. `doc` records are therefore not byte-raw, in exactly this one documented way, and §4.1 says so. Option 3 (`\u2014`) stays refused: it breaks the both-ways law against a JCS-conformant peer. | **CLOSED** — the emitted corpus is ASCII; the transliteration table is `Unity.Shape.transliterations` |
| R10 | The freeze specifies the `string-escapes` vector as "a value string containing a double quote, a backslash, a newline and a tab" without pinning the exact string. | **Pinned by the emission** to the nine characters `a`, U+0022, `b`, U+005C, `c`, U+000A, `d`, U+0009, `e` — the four special characters alternating with single letters. This document's draft had guessed a longer `quote … backslash …` spelling; the emission overruled it and §3 was corrected. | **CLOSED** — measured from the corpus's canon group |
| R11 | The freeze specifies `control-char` as "a value string containing U+0001" without pinning the exact string. | **Pinned by the emission** to the single character U+0001, with nothing around it. The draft had guessed `control<U+0001>char`; the emission overruled it. The cost is that no corpus vector catches truncation at a control character, which §3.1 names and the TypeScript lane's `control-char-surrounded` gap vector covers. | **CLOSED** — measured from the corpus's canon group |
| R12 | The freeze says the `doc` text is "raw"; Lean's `findDocString?` applies its own edge-whitespace handling. | **Measured:** `findDocString?` returns the text with leading whitespace trimmed and **one trailing space preserved**. The corpus carries that trailing space on all twenty-two records and it is part of the bytes the both-ways law binds. The TypeScript **prose** renderer trims trailing spaces at line ends and declares it in its banner — a deviation of the prose projection only; the generated schemas carry the untrimmed text. | **CLOSED** — measured from the corpus and the renderer's banner |
| R13 | The freeze does not say whether `counts.doc` is fixed or derived. | **Stricter than the freeze:** the extractor **refuses** a closed-list type with no docstring rather than skipping it, so `counts.doc` is structurally equal to `counts.type` — 22 today, and one-per-type after any addition. Validation check 24 checks equality, not subsequence. | **CLOSED** — refuse-not-skip is the rule |
| R14 | The freeze does not say whether the canon set is add-only. | **Not add-only.** Changing the ten is a format bump, because the ten *are* the cross-implementation reference. §6. A consumer wanting more coverage adds **native** gap vectors instead, which bind nobody else (§3.1). | OPEN — a ruling, not a measurement |
| **R15** | `counts.program` — how many vectors the group carries. | **4**, measured from the corpus: `ground-two-node`, `holey`, `holey-filled`, `distill-shape`, in that order. Quoted as a count in §2.1 and never as a line total, per the counts-derived rule. | **CLOSED** — measured from the corpus |
| **R16** | **The freeze listed three argref forms and none referenced a hole**, yet the model reads a program's requirement set out of node arguments (`Kernel.requiresOf` over `RawArg.hole`), not out of a declaration-level list. Under three forms alone, `holey` and `holey-filled` would erase to the same node arguments and the valuation correspondence would have nothing to demonstrate. | **A fourth form exists:** `{"arg":"hole","name":<nat>}`, §2.7.2. It carries the same member set as `"local"` and differs only by tag, so a consumer discriminates on `arg` and never on shape. It creates no edge. This document flagged the gap before the emission and the emission closed it by adding the form. | **CLOSED** — measured from the corpus |
| **R17** | No argref form carries a bare `DeclKind`, but `Act.declare.kind` and `Act.resolve.kind` are `DeclKind`-typed fields. | **Untouched, not answered.** Every emitted node that has a `kind` field omits it under the subset rule of §2.7.1, so no vector exercises the question and no form was added. A later vector that needs one will have to settle it. | OPEN — nothing measures it |
| **R18** | Whether a filled program still declares the hole it filled, and how the `holey` / `holey-filled` pair is named. | **`"holes":[]`.** Filling rewrites the `"hole"` argref to a `"literal"` and drops the declaration, so the bytes and therefore the identity change: a filled program is a different declaration, not an annotated one. The pair is named `holey` and `holey-filled` — the freeze's primary spelling. | **CLOSED** — measured from the corpus |
| **R19** | `lineage` orientation, the order of the `edges` array, and whether `edges` deduplicates a doubled consumption. | **Edge order closed:** `distill-shape` emits `4 -> 3`, `3 -> 2`, `2 -> 1` against nodes 4, 3, 2, 1, so edges follow the nodes' own order. **Lineage orientation and deduplication stay open:** the only non-empty `lineage` is the single element `[9]`, and no vector consumes the same local through two arguments. §2.7.3 states set semantics as the reading, not as a measurement. | PARTLY CLOSED — edge order measured; two halves unmeasured |
| **R20** | The freeze does not say whether the `program` vector set is add-only within the group. | **Unruled here.** The canon set is not add-only for a stated reason — the ten *are* the cross-implementation reference — and it is genuinely unclear whether program vectors carry that weight or are ordinary group members under §6. Left open rather than settled by analogy. | OPEN — a ruling, not a measurement |
| **R21** | **The freeze's record shape implies one `args` entry per constructor field; the emission carries fewer.** `ground-two-node`'s `declare` node is `"args":{}`; `distill-shape`'s `decide` omits `token` and its `resolve` omits `kind`. | **Subset, not equality.** Every `args` key MUST be a field name of that node's generator; not every field name need appear. §2.7.1 states the rule and §11 check 39 checks membership. This is the correction the draft did not anticipate: a validator written from the freeze alone would demand equality and reject all four vectors. What an omitted field *means* at the model seam — supplied by the erasure, or left to the runtime — is not settled by the bytes. | **CLOSED on the rule** — measured from the corpus; the semantics of an omission stays OPEN |
