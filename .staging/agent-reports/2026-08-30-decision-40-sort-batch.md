# Decision 40 — the greenfield sort batch, landed

Lane: implementation (decision 40, the sort event)
Date: 2026-08-30
Consumed by: docs/SPECS.md decision 40 grill

The four sorts are ratified, the union is widened, the key family is
pinned, every downstream artifact is regenerated, and every gate is
green twice. Nothing is committed.

---

## 1. Tag assignments, with the in-file evidence

**First, the reserved-row claim, verified rather than trusted.** The
prior note says two rows are reserved for an F3 slice. It is STALE.
`REGISTRY.md:43` (generated, and its source `Cas/Grammar/Manifest.lean`
closing prose) reads "No row is RESERVED today, and no row is
formless"; `tools/EmitGrammar.lean:48` carries `#guard reservedTags ==
[]`. Rows 14 and 15 WERE that F3 reservation and were ratified as
`step`/`cont` on 2026-08-29. There was no reserved row to route around,
so all four tags were free choices.

The estate's tag convention is not written down anywhere as a rule, but
it is unmistakable in the bytes: every non-blob tag is the ASCII
uppercase initial of the plane's own word.

| tag | sort | word | where it is spelled |
|---|---|---|---|
| `0x47` | `git` | **G**it | `Cas/Grammar/Sorts.lean` |
| `0x48` | (history) | **H**istory | `library/effects/src/internal/kindTags.ts:23` |
| `0x53` | `schema` | **S**chema | `Cas/Schema/SelfCodec.lean:34` |
| `0x54` | (system) | **T**opology | `Cas/Schema/System.lean:160` |
| `0x57` | (witness) | **W**itness | `library/effects/src/internal/kindTags.ts:24` |
| `0x58` | (exchange) | e**X**change | `Cas/Schema/Exchange.lean:72` |

`system` is the load-bearing precedent: it is a service TOPOLOGY, and it
sits at `T` because `S` was already the schema sort's. So the estate's
rule for a taken initial is *pick the plane's other true word*, not
*take the next free byte*.

**The four:**

| sort | tag | why |
|---|---|---|
| `annotation` | `0x41` (`A`) | Not chosen — RATIFIED WHERE IT ALREADY WAS. See §3. |
| `agent` | `0x49` (`I`) | `A` is the annotation row's. `I` for IDENTITY, which is the word both the ruling ("the identity anchor", store-crdt.md §"The sort event") and SEARCH-CARRIERS ("`Agent` — an identity") use for the plane. Exactly the `system`→topology→`T` move. Verified free: `0x48` is the effects-owned history tag, `0x49` is claimed by nothing in `library/`, `docs/`, or `.staging/`. |
| `query` | `0x51` (`Q`) | Own initial, free. |
| `result` | `0x52` (`R`) | Own initial, free. |

Sweep for collisions ran over `library/`, `docs/` and `.staging/` for
`0x49`/`0x51`/`0x52` and their decimals (73/81/82): the only hit was
`library/effects/archive/replay-plane/src/storage.ts:324`, a `FLRP`
file-magic byte string, not a kind tag.

Rows are emitted in TAG-ASCENDING order, which is what the table
already was, so `annotation` lands between `cont` and `git` and the
other three between `git` and `schema`. The door's refusal set is now
`[1, 8, 9, 10, 11, 12, 13, 14, 15, 65, 71, 73, 81, 82, 83]`.

**GRILL POINT 1.** `agent` at `I` is the judgment call in this section.
The alternative readings are `0x42` (`B`, the next byte after the taken
`A`, which is what a reader who thinks the rule is "next free byte"
would predict) and leaving `agent` unratified until a writer outside
the examples exists. I took `I` because the `system`/`T` precedent is
the only one the estate actually has, and because "identity" is the
word the ruling itself uses. If the grill prefers `B`, it is a
one-line change in `Sorts.lean` plus a regeneration; nothing is stored
at `0x49`.

## 2. The four sorts, field by field

None of the four has a `Tree` constructor and none needs one — their
writers sit at the node layer. Each row's witness is therefore the NODE,
on the `context` precedent (row `0x0D`, RATIFIED core, no constructor).
That is said in each row's notes.

### `annotation` (0x41) — one form, `annotation.annotation`

- payload: `projection`, `opaque` — the annotation projection's
  canonical JSON envelope (revision, then key/subject/value).
- references: **FREE**, edge name `link`.

The law as stated in the row: the SUBJECT edge first, then the value's
own reference when the value is a typed one rather than text — one edge
under the `text` arm, two under the `ref` arm. The sort fixes no slot
list because the subject is a UNION and a reference demands one tag, so
which tag edge 0 expects is the arm the annotation carries, not a fact
of the row.

**An honesty note that is itself a grill item.** The manifest's `.free`
discipline is checked, on the witness, as "every edge's expected tag
resolves through `Ty.ofTag`". For `context` and `cont` that check IS
the law. For `annotation` it is NOT: two arms of the subject union
(`exchange` `0x58`, `system` `0x54`) address working tags with no
registry row, so a real annotation node may legitimately carry an edge
at an unratified tag. The row's own law says so in as many words rather
than letting the generic guard stand in for it, and the witness uses
the ratified `program`/`git` arms so the guard has something true to
check. **GRILL POINT 2.**

Cross-layer pin: `Cas/Grammar/Manifest.lean` may not import
`Cas/Schema/Annotation.lean`, so the witness spells the projection's
output by hand exactly as the `step`/`cont` witnesses spell `Defun`'s.
`tools/EmitGrammar.lean` imports both and holds them together —
`witnessOf "annotation" "annotation" == Cas.Schema.putNode … ` — plus
two new pins: the emitted everyday word IS `Ty.annotation.sortName`,
and `pinAnnotationKindTag` IS `Ty.annotation.wireTag`.

### `agent` (0x49) — two forms, on the `entry` precedent

`agent.genesis`
- payload: none. references: none (`.fixed []`).

`agent.agent`
- payload: `attestation`, `opaque` — the executor's claim, uninterpreted.
- references: **FIXED**, three slots:
  - `context` expects `context` (`0x0D`) — the folded context;
  - `output` expects `value` (`0x01`) — the answer recorded;
  - `prev` expects `agent` (`0x49`) — the step before it, or genesis.

This is the form `CasExamples.AgentStep` already wrote, byte for byte,
with one edge's expected tag moved from `0x0C` to `0x49`. The genesis
form exists because `prev` is now self-referencing and a backwards chain
has to bottom out.

**The greenfield claim, verified before relying on it.** Checked
`vectors/` (7 conformance vectors, none at this form),
`conformance/`, the effects test tree and both backends: nothing in the
estate holds a stored node at the three-edge agent form. The only
writer was `CasExamples.AgentStep`, which is source. So the migration
re-authored nothing.

**I migrated the writer**, rather than leaving the row consumerless:
`examples/CasExamples/AgentStep.lean` now writes `agentNode` at
`Ty.agent.wireTag`, guards `prev.tag == Ty.agent.wireTag`, seeds
`agentGenesis` into `w0`, and carries a new check that the JOURNAL
ENTRY the form used to ride is refused as a history. The example's own
build-time run went `11 → 14` bindings and now reads `12 → 15`. The
registry's rule is that a tag enters with a real consumer; without the
migration the row would have had none. **GRILL POINT 3** — if the grill
wanted the row declared and the writer left on `entry` until a
non-example consumer exists, this is the change to back out.

The `entry` row's notes were rewritten in the same breath: they used to
advertise the three-edge agent form as latitude `entry` grants, and now
record that decision 40 moved it to row `0x49`.

### `query` (0x51) — one form, `query.query`

- payload: `spec`, `opaque` — the query spec's bytes, canonical JSON at
  the layer above, opaque here.
- references: none (`.fixed []`).

A leaf deliberately: a spec names its classifiers by DERIVED NAME — the
strings `names.json` carries — and a name is not an address. What earned
the row is the other direction: `result` binds spec→query by a typed
edge, annotations are written about queries, related-edges run query to
query.

### `result` (0x52) — one form, `result.result`

- payload: `mark`, `be-u32`, 4 bytes — the zero-based word index the
  answer was computed at. Typed from the estate's existing spelling of a
  mark: `Cas/Lang/WordWire.lean:47`, "`seq` is the mark (zero-based word
  index)".
- references: **FREE**, edge name `member`, with the law that edge 0 is
  the SPEC at the `query` tag and every later edge is a member at a
  ratified tag.

## 3. The codec verdict on `result`'s mixed discipline

**The codec cannot express it, and I did not force it.**

`Cas.Grammar.RefDiscipline` (`Cas/Grammar/Manifest.lean:181-186`) has
exactly two arms:

```
inductive RefDiscipline where
  | fixed (slots : List Slot)
  | free (name : String) (meaning : String)
```

`.fixed` is checked as EXACT list equality against the witness's
expected tags (`Manifest.lean`, the discipline guard: `f.node.refs.map
Ref.expectedTag == slots.map fun s => s.expects.wireTag`), so a form
whose arity varies cannot use it. `.free` names no slots at all
(`RefDiscipline.slots` returns `[]` on it), so a leading fixed slot
cannot be spelled beside free members. There is no "slot list then free
tail" arm.

Adding one is not a local change. It is a manifest SURFACE change: a new
`discipline.kind` string every front end has to learn, and therefore a
`manifestVersion` bump — the registry's own versioning ruling, and the
same event that took the manifest from 0 to 1 when `discipline` was
first added. That is precisely the growth the decision's stillness
clause forbids outside the batch.

**So `result` takes the honest alternative the brief names**: `.free
"member"`, with the leading slot stated as part of the law rather than
as a table row —

> The SPEC first — edge 0 expects the query tag, and is the spec this
> node answers — then one edge per member of the answer, in fold order,
> any number of them. The discipline is free rather than a slot list
> because an answer's length is not a manifest fact, and the manifest's
> two disciplines cannot state a fixed head and a free tail in one form
> […] Every member edge's expected tag must resolve through `Ty.ofTag`,
> exactly as a context's must.

**GRILL POINT 4.** The cost is real and worth naming: a reader of
`manifest.json` who consumes only `discipline.kind` sees `free` and
learns nothing about edge 0; the constraint lives in `discipline.meaning`,
which is prose. A third discipline arm (`headed`, say: a slot list plus a
free tail) would make it machine-readable, at the price of a manifest
version bump and a fresh ruling. That is a clean follow-up, not a
blocker.

## 4. The annotation-at-0x41 verdict

**0x41 CAN be the ratified tag, and it is.** No stored annotation node
moved, and none needed re-authoring.

Evidence that `0x41` was already the plane's byte:
`Cas/Schema/Annotation.lean:173` (`pinAnnotationKindTag := 0x41`, now
reading off the sort table), `annotationPlane.ts:36`
(`AnnotationKindTag = 65`), `bin/cli/naming.ts`, and
`test/SchemaAnnotation.test.ts`. `Ty.ofTag` refused it before and
answers `some .annotation` now.

**But ratification had one consequence that had to be resolved, and it
is the largest single finding of this lane.**

`Cas.value` refuses every tag in `ReservedKindTags`, which is
`GrammarKindTags` (the emitted registry column) plus the two replay
tags. Promoting `0x41` to a registry row therefore made
`Cas.value({ kindTag: 0x41, … })` THROW — and that call was how
`bin/cli/naming.ts` and `test/SchemaAnnotation.test.ts` built the
annotation projection. `cas name` would have died at module load.

The resolution is the estate's own existing pattern, made explicit
rather than invented: a plane the LIBRARY owns is read through the
module that owns it (`Cas.CanonicalSchema` owns the `schema` row
`0x53` the same way), and the door on `Cas.value` exists to stop a
CALLER-DEFINED projection from giving a registry row a second public
interpretation. So:

- `src/cas/Value.ts` splits into `libraryValue` (the constructor, no
  door) and `value` (the door, then delegate). `libraryValue` is NOT
  re-exported from `src/Cas.ts`, so it is not reachable by a consumer.
- `src/cas/Annotations.ts` exports `Node` — THE annotation projection,
  the row's one interpretation, at the emitted tag and revision — plus
  `KindTag`, `Revision`, `NameKey`, `Keys`.
- `bin/cli/naming.ts` names `Cas.Annotations.Node` instead of building
  its own; `test/SchemaAnnotation.test.ts` likewise.
- `test/ConsumerApi.test.ts` moved its caller-defined projection off
  `0x41` to `0x21` — which is the door working, not breaking.

**GRILL POINT 5.** This is a public-surface shape decision made inside
an implementation lane. The alternative was to keep annotation on a
working tag (refused — it moves stored content, which the brief forbids)
or to leave the ratified row and let `Cas.value` refuse it (refused — it
breaks `cas name`). A third option exists and I did not take it: give
`Annotations` its own put/get path built directly on the store, the way
`CanonicalSchema` does, with no `libraryValue` seam at all. I judged one
shared internal constructor cleaner than a second hand-written codec
path, but the seam is the grillable part.

## 5. CA-1 — the union widening, and the schema address that moved

`AnnotationSubject` (and through it `AnnotationValue.ref`, which nests
it) went from FIVE arms to THIRTEEN. Arms are in the deriving handler's
canonical order (ascending constructor name), which is also the emitted
table's order:

| arm | tag | group |
|---|---|---|
| `agent` | `0x49` | decision 40's four |
| `annotation` | `0x41` | decision 40's four (the reflexive rung) |
| `chunk` | `0x08` | content plane |
| `context` | `0x0D` | content plane |
| `exchange` | `0x58` | pre-existing |
| `file` | `0x0B` | content plane |
| `git` | `0x47` | pre-existing |
| `program` | `0x0F` | pre-existing |
| `query` | `0x51` | decision 40's four |
| `result` | `0x52` | decision 40's four |
| `schema` | `0x53` | pre-existing |
| `system` | `0x54` | pre-existing |
| `value` | `0x01` | content plane |

**No `text` arm.** Refused by the ruling, and the refusal is now
observable rather than merely written: `tools/Schemas.lean` guards
`!(subjectArms.map Prod.fst).contains "text"`, and the conformance
corpus carries a `subject-refused-text-arm` triple whose verdict is a
refusal.

**The old→new schema address** — one address moved, and exactly one:

```
annotation  17a8133b96bbbc7879c229263e0314e806085094a5f1606ed05093619ae2a5d2   (old)
            89e7f571f3dbc8f49565b2f531f7fce74e24081671399391d1e02d183b6a601a   (new)
```

`schemas/addresses.json` shows a one-line diff. Every other registered
code's address is byte-identical, which is the ruling's own claim about
arm-additive growth made visible. `schemas/annotation.json` grew from
5619 to 12589 bytes; `schemas/index.json` records the new length.

Planes deliberately still OUTSIDE the union, stated in
`Annotation.lean` so the absence is a decision and not a gap: `tree`
(`0x09`), `manifest` (`0x0A`), `entry` (`0x0C`), `step` (`0x0E`) — the
INTERIOR of composites. What a person names is the `file`, the `cont`,
the `value`, never the shape underneath. An arm for each is one ruling
and one more versioning event away. **GRILL POINT 6.**

## 6. CA-2 — the key family

Five worked pins beside `pinName`, each with `putPayload` AND `putRefs`
guards, which is exactly the discipline `pinName`/`pinLink` carry. Each
pin is worked on an arm that CA-1 admitted, so the pins exhibit the
widening as well as the key.

| key | subject arm | value | what it exhibits |
|---|---|---|---|
| `foldlab/name` | `system` `0x54` | text | (pre-existing) the name seat |
| `foldlab/related` | `query` `0x51` | `ref` → `query` `0x51` | the association edge, at the search plane's own sorts |
| `foldlab/search-note` | `result` `0x52` | text | a note about an answer |
| `foldlab/pref` | `exchange` `0x58` | text | a preference on ONE past turn |
| `foldlab/embedding` | `value` `0x01` | `ref` → `chunk` `0x08` | content→vector; why no `vec` sort was minted |
| `foldlab/tombstone` | `annotation` `0x41` | text | the REFLEXIVE rung, at byte level |

Plus three list-level guards: `keyFamily.Nodup`, every key
`foldlab/`-namespaced, and `foldlab/view` explicitly NOT in the family
(it is `pinLink`'s worked example, not a ratified seat).

The family is EMITTED, not just written down — `AnnotationKeys` in
`annotationPlane.ts`, re-exported as `Cas.Annotations.Keys`. That is
what "ratify them the way the name seat is pinned" means: the name seat
is pinned by being emitted.

**Spellings I would change, and why I did not.** All five ship as the
decision names them. Two are worth a grill sentence:

- `foldlab/search-note` — the compound is the one awkward spelling in
  the family. `foldlab/note` is prettier and I refused it as too broad:
  the key means "a note made during a search", and a bare `note` would
  become the dumping ground for every annotation nobody chose a key
  for. Recorded in `Annotation.lean` as the reason.
- `foldlab/pref` — an abbreviation, alone among six full words
  (`name`, `related`, `search-note`, `embedding`, `tombstone`).
  `foldlab/preference` would be consistent. I kept `pref` because it is
  the decision's own spelling and this lane does not get to re-spell a
  ruled name. **GRILL POINT 7** — this is the cheapest thing in the
  batch to change: one string, one regeneration.

A third, offered without changing anything: `foldlab/embedding` names
the ANNOTATION but its value points at the chunk, so a reader might
expect the key on the chunk rather than on the content. The pin
direction is the ruling's (subject = content, value = ref to chunk) and
`Annotation.lean` says so beside the pin.

## 7. What regenerated

Every artifact below was regenerated by its own emitter, never
hand-edited.

**`lake exe emitgrammar`** (15 sorts, up from 11):
- `library/cas/REGISTRY.md` — four new rows, the `entry` row's notes
  rewritten, a new closing paragraph for the batch, the preamble
  extended.
- `library/effects/src/cas/generated/grammar/manifest.json`
- `library/effects/src/cas/generated/grammar/kindTags.ts` — door set now
  15 tags.
- `library/effects/src/cas/generated/grammar/names.json` — 15 columns,
  19 blocks, 26 fields, 14 edges. The four sorts entered the naming
  inventory: blocks `annotation.annotation`, `agent.genesis`,
  `agent.agent`, `query.query`, `result.result`; fields
  `annotation.annotation.projection`, `agent.agent.attestation`,
  `query.query.spec`, `result.result.mark`; edges
  `annotation.annotation.link.<index>`, `agent.agent.context`,
  `agent.agent.output`, `agent.agent.prev`,
  `result.result.member.<index>`.
- `refMarkers.ts` unchanged (byte-identical, as expected).

**`lake exe schemas`**:
- `library/cas/schemas/annotation.json`, `addresses.json`, `index.json`
- `library/effects/src/cas/generated/annotationPlane.ts` — 13 arms, plus
  the new `AnnotationKeys`.
- `library/effects/src/cas/generated/StoreKindSchema.ts` — 15 live
  references (2 exchange + 13 annotation), the guard now derived rather
  than a literal `8`.

**`lake exe verdicts`**: `library/cas/conformance/schema-verdicts.json`
— 79 cases, up from 75. Four new triples on the annotation kind:
`tombstone-on-annotation` (reflexive), `embedding-on-value` (content
planes), `related-query-to-query` (the search sorts), and
`subject-refused-text-arm` (the refusal made observable). The kind's
note now spells all thirteen planes.

**`lake exe materialize`** +
**`bun scripts/gen-materialized.ts`**: both registers of the P6
differential for the annotation code —
`test/generated/materialized/estate/annotation.ts` and
`.../effect/annotation.ts`.

**Not regenerated, deliberately.** `meta/out/trust.META.json` is stale
on the main tree — but the staleness is NOT this lane's: it is
`src/cas/MetaSchema.ts` (new, `tested`) and `bin/cli/ledgers.ts`
(`bare` → `tested`), both from the concurrent effects lane. I
regenerated it, saw the diff was entirely theirs, and reverted. The
`trust` gate is not part of `check:cas`; whoever lands the MetaSchema
work owes `mise run gen:trust`. **Flagged, not fixed.**

`meta/out/surface.META.json` did NOT move, and that is correct rather
than suspicious: `Cas.Schema.Annotation` keeps compiler metaprogramming
an opt-in import, so it is outside `Walk.libraryImports` and the surface
ledger never saw its declarations. The gate says `ok`.

## 8. Gates — every tail

**`mise run --force check:cas` — EXIT 0, run twice consecutively, both
0.** 54 `ok` lines, zero `differs`. The sub-gates, forced individually:

```
check:cas                → EXIT 0 (×2)
  ok ../effects/src/cas/generated/grammar/manifest.json (31914 bytes) — 15 sorts
  ok REGISTRY.md (22636 bytes) — 15 sorts, the kind-tag registry
  ok ../effects/src/cas/generated/grammar/kindTags.ts (3326 bytes) — 15 kind tags, the TypeScript door's refusal set
  ok ../effects/src/cas/generated/grammar/names.json (13461 bytes) — 15 columns, 19 blocks, 26 fields, 14 edges — every name the grammar derives
  ok schemas/addresses.json / index.json / all 10 payloads
  ok ../effects/src/cas/generated/annotationPlane.ts — 13 nameable planes
  ok ../effects/src/cas/generated/StoreKindSchema.ts — 5 mirrors
  ok conformance/schema-verdicts.json — 79 cases
  ok meta/out/strata.META.json — 9 strata, 135 modules (108 walked), 1 violation — 1 known
check:cas:surface        → EXIT 0   ok meta/out/surface.META.json (1069395 bytes) — 2426 declarations
check:cas:obligations    → EXIT 0   16 of 16 controls fire; ok meta/out/obligations.META.json (27653 bytes) — 84 obligations
check:cas:laws           → EXIT 0   13 of 13 controls fire; ok meta/out/laws.META.json (9963 bytes) — 9 of 37 rulings bound, 28 unbound
```

Out-of-battery ledgers checked by hand: `debts --check` ok (14985
bytes), `axioms --check` ok (1205 of 2426 declarations carry an axiom),
`emitmeta --check` ok (7 outputs), `trust --check` differs for the
reason in §7.

**`library/effects`:**

```
bun run typecheck        → clean (tsc --noEmit && tsc -p tsconfig.test.json --noEmit)
bun --bun vitest run     → Test Files 54 passed (54) | Tests 439 passed (439)
bun run lint             → 172 warnings + 1 error (CanonicalSchema.ts:605, no-useless-return)
```

439 is the stated baseline exactly. Lint is the stated baseline exactly
— 172 warnings and the one pre-existing error, no new findings.

**The fallout I fixed, all through the seams, none by hand-editing an
emitted file.** Seven cases went red on the first full run:

- `Cli.test.ts` "every everyday kind word is an emitted one" —
  `isRegisteredTag(0x41)` flipped `false` → `true`. Now asserts `true`,
  plus a new assertion that `KindTagsByName.annotation` IS the emitted
  tag.
- `Cli.test.ts` "a plane outside the subject union is refused" — used
  the default `value` kind, which CA-1 made nameable. Moved to `tree`
  (`0x09`), the interior of a blob, with the reason written down.
- `Cli.test.ts` "one screen, one spelling" — same, moved to `manifest`
  (`0x0A`).
- `ConsumerApi.test.ts` — caller projection moved off `0x41` to `0x21`.
- `SchemaMaterialization.test.ts` — two hand-written snapshot strings
  of the printed annotation code (runtime and Type), rewritten for 13
  arms.
- `MaterializeDifferential.test.ts` ×3 — the committed Effect-register
  snapshot was stale; regenerated with `bun scripts/gen-materialized.ts`,
  which is that register's own emitter.

## 9. Every judgment call, collected for the grill

1. **`agent` at `0x49` (`I` for identity)** rather than `0x42` — §1.
2. **`annotation`'s free-discipline law diverges from the generic
   guard**, because two subject arms sit at working tags. Stated in the
   row rather than papered over — §2.
3. **I migrated `CasExamples.AgentStep`** to the new tag, so the row has
   a real consumer. Backing this out leaves the row consumerless — §2.
4. **`result` takes `.free` with a prose-stated leading slot**, because
   the codec has no headed discipline and adding one is a
   `manifestVersion` bump — §3.
5. **`libraryValue`, a new internal seam in `Value.ts`**, and
   `Cas.Annotations.Node` as the annotation plane's one projection.
   Forced by ratifying `0x41`; the shape is the grillable part — §4.
6. **`tree`/`manifest`/`entry`/`step` left out of the subject union** —
   §5.
7. **`foldlab/pref` kept as an abbreviation** where the family is
   otherwise full words; `foldlab/search-note`'s compound kept over the
   broader `foldlab/note` — §6.

Two more, smaller:

8. **Rows are emitted in tag-ascending order**, which inserts
   `annotation` into the middle of the table rather than appending. It
   is the order the table already had (`git` `0x47` precedes `schema`
   `0x53` despite the reverse `Ty` declaration order), and it keeps the
   registry's own "row N" prose convention — where N is the tag —
   readable. The cost is a larger generated diff.
9. **`AnnotationKeys` is a NEW emitted surface** in `annotationPlane.ts`.
   No gate demanded it; CA-2's "pin them the way the name seat is
   pinned" did, since the name seat is pinned by being emitted.

## 10. Not done, and deliberately

- **Nothing is committed.** The working tree carries the batch.
- The `on*` arm constructors for the eight new planes are in
  `src/cas/Annotations.ts` because `Cli.test.ts` walks the emitted arm
  table through `subjectFor` and fails on an arm with no constructor —
  that is a gate demanding a mirror, not scope creep.
- `meta/out/trust.META.json` left stale for the concurrent lane — §7.
- No fifth sort, no `text` arm, no manifest version bump, no new
  discipline arm. The stillness resumes.
