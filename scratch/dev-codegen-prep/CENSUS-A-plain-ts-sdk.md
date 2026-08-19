# Census A — the plain-TypeScript SDK sketch

Subject: `verify/kernel/projections/kernel.ts`, 408 lines, at `c0b5b69`.
Measured by `probe-sdk-drift.ts`, `probe-controls.sh`, `probe-law10.ts`.

The sketch is the adopted reference shape for the code projection: zero
imports, every closed inventory at full cardinality, dependent ties enforced at
constructors with `NoInfer`, four must-not-compile controls carried natively.
This census asks one question: what has moved underneath it since it was
written?

## What holds

Verified first-hand, not read off the header.

**It type-checks standalone.** `tsgo` under `strict`, `exactOptionalPropertyTypes`,
`noUncheckedIndexedAccess`: green, no imports, no lib beyond the default.

**Its four negative controls are each load-bearing.** Four `@ts-expect-error`
directives; with all four neutralised the compiler reports exactly four errors,
one per control, at the four control lines. No control is riding on another's
suppression and none is silently satisfied. The two dependent ties are the
interesting pair — the compiler's own words:

```
Token<... & "sha256:03"> is not assignable to Token<NoInfer<... & "sha256:99">>
AnchorFact<... & "sha256:20", ...> is not assignable to AnchorFact<NoInfer<... & "sha256:02">, ...>
```

That is a cross-register commit and a cross-reduction anchor, both refused at
the type level, with no runtime check and no door round-trip. This is the
sketch's real invention and nothing else in the estate carries it.

**Every closed inventory matches at full cardinality and wire spelling.**

| inventory | sketch | generated | verdict |
| --- | --- | --- | --- |
| declaration kinds | 12 | 12 | same members, same order |
| hole stages | 5 | 5 | same members, same order |
| refusal reasons | 16 | 16 | same members, same order |
| generator tags | 8 | 8 | same members, same order |
| trigger productions | 5 | 5 | same count |

## What has drifted

Fourteen rows. Grouped by what a seat would have to do about each.

### 1. Three taught-refusal texts are stale (mechanical)

The tables gained possessive corrections the sketch predates:

| reason | field | sketch | generated |
| --- | --- | --- | --- |
| `unfenced-decide` | repair | "hold the register token" | "hold the register's token" |
| `off-writ-referent` | law | "a declaration identifiers lie" | "a declaration's identifiers lie" |
| `closure-introspection` | law | "a program identity is" | "a program's identity is" |

Thirteen of sixteen rows match byte for byte. This is exactly the drift class a
byte-parity wall exists to catch, caught here by hand because no wall watches
this file.

### 2. Every generator's field names differ (structural)

All eight. The sketch uses a compound self-descriptive convention; the emitter
reads the model's own field names out of the `Act` type record.

| generator | model's names | sketch's names |
| --- | --- | --- |
| `declare` | kind, value, **writ** | kind, value, **writ_digest** |
| `resolve` | kind, **target** | kind, **digest** |
| `emit` | **lane**, body | **lane_digest**, body |
| `join` | **cell**, contribution | **cell_digest**, contribution |
| `fold` | **declared**, partition, anchor, query | **reduction_digest**, partition, anchor, query |
| `decide` | **register**, token, outcome | **register_digest**, token, outcome |
| `trigger` | predicate, **declaration** | predicate, **declaration_digest** |
| `spawn` | **parent**, **request** | **parent_writ_digest**, **request_writ_digest** |

The compound convention is real and ruled — for the **wire** projection, where
a tool's flat argument list has no surrounding structure to carry the sort. The
code projection has the sort in the type. Which convention the emitted SDK
takes is a decision, not an oversight, and it needs ruling before an emitter is
written: the sketch asserts the compound convention is ratified for this
surface, and the emitted artifacts spell the model's names.

Related: `fold.declared` is the model's name for what the sketch calls
`reduction_digest`. The rename of the *kind* `index` to `reduction` is proposed
and unlanded; every generated artifact still spells `index`.

### 3. The discriminant differs (structural)

| | sketch | runtime |
| --- | --- | --- |
| act key | `act` | `_tag` |
| trigger key | `production` | `_tag` |
| tag case | kebab (`outcome-landed`) | camel (`outcomeLanded`) |

Both spellings are generated today, in different layers: the tables carry the
kebab wire spelling, the schemas carry the camel constructor spelling. An
emitter must be told which register it is printing, not left to assume.

### 4. Four carriers are in play (structural, and the deepest row)

This is the number-domain change. It is **not** called A4 — there is no ruling
by that name in the tree. It is the estate number-domain ruling: canonical JSON
in every law but the number line, where integers are exact and unbounded.

| layer | carrier |
| --- | --- |
| the model | `Nat` |
| the corpus and every generated schema | `bigint` |
| the door, end to end | `bigint` |
| the generated brand aliases, by default | `number` (substitutable second parameter) |
| the sketch | `string` for digests and values, `number` for every scalar |

The sketch is the only one of these that is neither the model's carrier nor a
substitutable parameter over it. A pinned canon vector — 2^53 + 1, byte-identical
across three languages — is what forces exactness; a `number` carrier rounds it.
The sketch's `string` digests dodge that, but they also mean the sketch cannot
hand a value to the door without a conversion the sketch does not define.

### 5. The brand mechanism differs, and the generated choice has a stated reason

The sketch brands with `declare const KIND: unique symbol`. The generated
tables brand with string-literal keys, and say why: that is how the estate's
pinned Effect release spells a type identity. The tables also enumerate twelve
per-kind aliases (`SchemaDigest` … `LanguageDigest`) over a substitutable
carrier; the sketch carries one parameterised `Digest<K>` and no aliases.

The sketch's `unique symbol` cannot survive as-is: a brand key that is a
module-local symbol is not nameable from another module, which is what the
per-kind aliases exist to provide.

### 6. The `meaning` field is entirely absent

Sixty draft-meaning markers in the generated tables — sixteen model reasons and
forty-four runtime structural kinds. Zero in the sketch.

The distinction the generated source insists on is worth carrying into any
emitter: a law and a repair speak at the moment of refusal, to whoever
presented the candidate, about that one presentation; a meaning speaks about
the kind itself, standing, to anyone reading the vocabulary. Meanings ride as
doc comments, never as a data field, because the corpus carries no field a
meaning could ride in — they come from a reviewed house ledger and are marked
drafts until a taste pass rules.

The sketch projects sixteen of the sixty refusal spellings.

### 7. Provenance under the tracking-artifact law

The law: an official document carries no tracking artifact; provenance is a
digest of the source, never a path or a command. Its wall sweeps exactly three
surfaces. Running the same three refusal classes over everything else:

| surface | walled | hits |
| --- | --- | --- |
| `KernelTables.generated.ts` | yes | 0 |
| `RefusalKinds.generated.ts` | yes | 0 |
| `kernel-language.generated.md` | yes | 0 |
| `kernel.ts` (this sketch) | **no** | 1 |
| `prose.md` | **no** | 1 |
| `tools.schema.json` | **no** | 1 |
| `KernelBuilder.generated.ts` | **no** | 8 |
| `KernelSchemas.generated.ts` | **no** | 11 |

The walled three are clean. Everything else carries paths, and the two
generated ones carry generation commands as well. The three sketches each carry
exactly one, in their header's "hand-derived from the model in ..." line.

One gap in the wall itself, found by this sweep: the tracking-id class matches
only one ticket series. The sketch cites an obligation from a second series
inline, at its `index` arm, and the pattern does not see it.

### 8. The door seam does not exist in the sketch

The sketch declares `AdmitResult` — admitted-or-refused — and nothing in the
file can produce one. There is no `admit`, and more fundamentally there is no
way to *spell a candidate*: the sketch projects only lawful acts, by design.

The door's one judgment function takes a candidate, not an act:

```
KernelAdmit = (context: KernelDoorContext, candidate: KernelCandidateAct) => KernelVerdict
```

The candidate grammar is generated and shipped — eleven candidate-act arms
(the eight generators, four of them widened with a slot that makes the crime
spellable, plus three pure crimes), nine candidate-predicate arms, eight
raw-argument atoms of which five are unlawful. The sketch's stated principle —
an SDK that cannot spell the crime — is a real design position, and its
consequence is that **the sketch cannot reach the door at all**. `AdmitResult`
is unreachable surface.

For an authoring SDK that is arguably correct. For the code-mode view, where
every effect must route through the one door, it is the blocking gap. See
`SPEC-C-code-mode-mcp.md`.

## What is hand-invented

Forty-nine exports. Classified:

**Derived from a generated inventory** — `DeclKind`, `HoleStage`,
`TriggerPredicate`, `Act`, `GenTag`, `RefusalReason`, `Applicability`,
`Refusal`, `TAUGHT`, `ProgramArg`/`ProgramNode`/`ProgramDecl`. The program
triple corresponds to the corpus's program-declaration record group, whose
argument-reference grammar has four arms; the sketch's `ProgramArg` has three,
omitting the local-node reference that makes a declaration a DAG rather than a
list — while `ProgramNode` carries a separate `uses` array instead.

**Sorts whose shape drifts** — `Digest`, `Value`, `Token`, `AnchorFact`,
`LanePartition`. The model brands three sorts (digest, token, position) and
reports `AnchorFact` as indexed-but-unbranded because it has no single carrier
field. The sketch has no `Position` at all; its `Token` is a struct where the
model's is a branded scalar; its `AnchorFact` carries the reduction digest
inside, where the model carries partition and anchor as sibling fields of the
act.

**Invented, no generated counterpart:**

- `digest()`, `value()`, `token()` — three mint functions. They mint literal
  *types*, not identifiers, which is the inference trick the whole file rests
  on. Worth naming anyway: minting an identifier is one of the sixteen refusals,
  so an emitter printing these needs the distinction stated in the docstring, or
  the SDK reads as offering the crime it refuses.
- `resolve()`, `decide()`, `fold()` — the dependent constructors. Three of
  eight, asymmetric: the other five generators are spelled as bare object
  literals in the examples. Only these three have ties to enforce.
- Twenty example constants and the program walkthrough — data, not language.
- `AdmitResult` — declared, unreachable (above).

**The asymmetry is the finding.** The sketch's dependent ties live exactly where
the generated builder declares fields **absent**: the builder omits
`fold.partition`, `fold.anchor`, `decide.token`, and `trigger.predicate`
entirely, because the program-declaration form carries no reference for them.
So generating this SDK is not "print the builder again with different syntax."
The builder drops the fields the sketch's whole type-level argument is about. An
emitter has to carry the model's dependent-constructor shape, which no current
emitter path does.

## Summary for a seat

Cardinality: intact, all five inventories. Wire names: intact for the
inventories, drifted for every generator's fields. Texts: three stale. Carrier:
incompatible. Brands: incompatible mechanism, with the generated choice reasoned.
Meanings: absent. Door: unreachable.

None of that makes the sketch wrong — it makes it a sketch, which is what its
header says it is. What it means for an emitter is that four things must be
ruled before printing starts: field-name convention per projection, discriminant
register, carrier, and whether the emitted SDK carries the dependent ties the
builder currently drops.
