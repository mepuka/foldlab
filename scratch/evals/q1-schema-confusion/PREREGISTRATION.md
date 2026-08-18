# Q1 schema-confusion evaluation preregistration

Status: **PREREGISTERED (round 2).** This contract is committed before any
round-2 evaluation population is generated. Results do not amend it.

Round 1's population is void and its numbers are not carried forward. Its
battery asked models to act on "the planted declaration" while its
hand-authored candidate ledger carried no `declaration` key, and 16 of the 17
confused calls in that entire population landed on that one row. Those rates
measured how each arm's model guessed at an unresolvable referent, not digest
naming. The ledger and the battery are derived from the surface under test in
round 2, so that failure is unconstructible rather than merely unlikely.

## Question

Does the kernel tool projection's compound digest naming produce more reliable
model calls than either bare field names or nested `{type,value}` references?
The comparison measures the locally available models on a fixed synthetic
battery. It does not claim a model-independent naming law.

## Fixed inputs

`verify/kernel/projections/tools.schema.json` is the base projection. The
harness records its SHA-256 digest with every run and inside every generated
artifact. That file declares itself `EXPLORATORY, hand-derived` in its own
`$comment`: this evaluation therefore measures naming behaviour on a surface
the estate does not yet generate, and says so on every quoted result.

Only properties whose base JSON Schema carries the digest pattern
`^sha256:[0-9a-f]+$` change between arms:

| Arm | Example |
| --- | --- |
| `compound` | `lane_digest: "sha256:..."` |
| `bare` | `lane: "sha256:..."` |
| `nested` | `lane: {"type":"lane","value":"sha256:..."}` |

The `bare` arm removes a terminal `_digest`; a property already named `digest`
stays `digest`. The `nested` arm uses those same bare property names and wraps
the digest. Tool names, tool descriptions, **property descriptions**,
non-digest fields, and all other constraints stay equal across arms.

## Derivation, not authorship

Nothing in the ledger or the battery is hand-typed. Both are functions of the
base projection, checked byte-identical by `bun run check:generated` and proved
falsifiable by `bun run check:generated-control`.

- **The ledger** is one entry per digest-carrying slot of the base projection,
  optional slots included, keyed `<generator>.<slot>`. Every referent a task
  can name is therefore a ledger key by construction. Each planted digest is
  `sha256(<key>)`, so entries are distinct and their intended slots are
  mechanically recoverable without a model judge.
- **The battery** is one task per base tool, filling exactly the fields that
  tool's schema declares `required`. The task set is the tool list, so it
  cannot be hand-picked.
- **Each entry is cross-walked** to the generated kernel corpus
  (`packages/plait/src/kernel/KernelBuilder.generated.ts`) for the declaration
  kind its slot is branded with — by exact field name, else by position when
  both sides declare the same number of digest fields, else left unresolved.
  Unresolved slots are reported as divergence between the hand-derived sketch
  and the grammar it owes; they are never guessed at.

Each task states its tool, and for each required digest slot names the ledger
entry to place there together with that slot's role **as the base schema's own
description states it**. Descriptions are identical in all three arms, so the
property name and shape are the only things that vary. Naming the tool is
deliberate: tool selection is not what Q1 asks, and leaving it to inference is
how round 1 let a comprehension failure land in a naming statistic.

## Population

The locally authenticated Claude CLI supplies two model aliases: `haiku` and
`sonnet`. The harness records the canonical model version the provider returns
rather than treating either alias as a durable version.

Every generation runs at reasoning effort **`low`**, with tools disabled and a
fixed system prompt. The effort setting is a first-order determinant of the
quantity being counted; it is named here, carried on every run record, and
reported in `RESULTS.md`.

Each model/arm cell has ten independent CLI generations. One generation answers
all eight battery rows:

```text
8 tasks × 3 arms × 2 model aliases × 10 generations = 480 calls, 60 generations
```

The CLI exposes no seed or temperature control in this path. Runs are repeated
fresh with no session persistence. Eight calls produced by one generation are
not statistically independent; the report states both the call count and the
independent-generation count.

## Measures

All measures are mechanical — Ajv compilation and exact scalar comparison. No
judge and no rubric.

Two primitive measures, disjoint by construction:

- **Omission.** An expected planted candidate is absent from its own slot.
  A row that is missing, duplicated, or answered with the wrong tool did not
  populate its slots and counts as an omission.
- **Misplacement.** A planted digest occurs in a slot that is not its own,
  including another digest slot, a non-digest slot, or a nested reference
  carrying the wrong `type`. A planted digest the task did not request, sitting
  in the slot it does belong to, is **not** misplacement — that is helpfulness,
  not slot confusion.

One derived measure:

- **Confusion** is the union of the two above. It is a union by definition and
  is never reported as a third independent line of evidence. The report states
  the count of calls on which the two primitives disagree, so a reader can see
  whether they are two measures or one on this population.

One integrity check, not a measure:

- **Valid-call rate.** Exactly one response row names the battery task, selects
  its expected tool, and validates against that arm's projected schema. Because
  each task states its tool, this is a harness-integrity check rather than a
  measured quantity.

`omitted_expected_fields` — every expected scalar absent, free-text bodies
included — is retained as a diagnostic column only. It is not a measure and no
decision reads it.

## Denominators

Each binomial rate carries a Wilson 95% interval and is quoted against the full
call denominator. The report **also** publishes the per-task table and the
count of battery rows that produced any confused call in any arm. A row that
scores zero in all three arms separates nothing, and carrying it in the
denominator dilutes the quoted effect size — round 1 quoted 7/80 against 3/80
when seventy of those eighty calls were constant across every arm, overstating
the effect roughly eightfold. Intervals describe this finite population and do
not correct for within-generation correlation.

## Decision rule, with the action each branch fixes

An arm **wins** if its valid-call rate is no lower than both others *and* its
confusion rate is strictly lower than both others *and* its confusion interval
overlaps neither. Every branch names what happens next, so no decision is left
to be made after the data.

1. **Compound wins.** Action: the compound naming in
   `verify/kernel/projections/tools.schema.json` stands, and the survey's Q1
   lean is recorded as measured rather than as convention.
2. **`bare` or `nested` wins.** Action: the compound convention does not stand
   on this evidence. The projection-naming change is filed as its own ticket,
   with this population quoted as its sole support and its bounds carried with
   it. This eval does not itself change the projection.
3. **No arm wins (ties, or any overlapping interval) — inconclusive.** Action:
   **no naming change is made.** Compound stands on the survey's
   non-experimental grounds — the nearest-neighbour practice the survey cites —
   and explicitly **not** on this evaluation. Q1 stays open, and any future
   quote of these numbers carries that sentence.
4. **A regression on misplacement vetoes an arm** even when its valid-call rate
   is higher: a surface that gets more calls admitted while putting more
   digests in the wrong slot is producing confidently wrong compositions.

## Known confounds, stated before the run

- **Ledger keys resemble the `bare` arm.** Keys are derived from the base
  projection's own slot names, so the `bare` arm's property names resemble the
  referent names in every prompt more closely than the other arms' do. Any
  `bare` advantage must be read with this, and it is stated on the result
  rather than engineered away.
- **The base is a sketch.** It is hand-derived and diverges from the generated
  builder table on some slots. The divergence table ships with the result.
- **Eight rows is a small battery**, and one generation answers all eight.

No result from this sample licenses a claim about production agents,
long-horizon sessions, other prompts, or later model versions.
