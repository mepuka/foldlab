# parser-census

The parser-construct census: what TypeScript declarations the labelled
corpus actually contains, and what the store-language recognizer makes of
them.

Before this lane existed, `corpus-manifest.json` carried `declCount: null`
on every project with the note *"pending a census instrument run"*, and
there was no instrument. This is that instrument.

## What it is made of

Nothing here re-implements recognition. The two legs are the lift harness's,
imported verbatim — the same two engines its admitted multi-parser agreement
gate runs:

| Leg | Instrument | Reached through |
|---|---|---|
| `ck` | `typescript@5.9.2`, `createSourceFile`, syntax only, no checker | `lift-harness/src/lift.ts` |
| `oxc` | `oxc-parser@0.147.0` ESTree | `lift-harness/src/oxc-engine.mjs` |

A census that re-implemented recognition would be measuring a third thing no
gate has ever held to the other two.

The census's own contribution is the **declaration enumerator**, and it obeys
the same discipline: two independent walks (`src/decls-ck.ts` over the
TypeScript tree, `src/decls-oxc.mjs` over the ESTree one) sharing only the
definition in `src/census-contract.ts`. The trees are not the same shape —
TypeScript keeps `export` as a modifier, ESTree makes it a wrapper node — so
the two legs reach the same row by different routes, or they do not, and the
difference is a finding rather than a silent disagreement about what
"exported" meant on each side.

## The unit of observation

`project-labels.json` fixes it: *"the unit of observation downstream is the
TypeScript declaration"*. Comparability across runs and instruments is worth
something only if that means one thing, so it is defined once, in
`src/census-contract.ts`, and both legs implement that definition
independently. In short: a **top-level statement that introduces a name** —
`variable`, `function`, `class`, `interface`, `typeAlias`, `enum`, `module`.
Imports, re-exports, `export =`, and `import x = require(…)` declare nothing.
Nested declarations are not counted; the unit is the top-level declaration,
and a deeper walk would let the two legs' tree shapes rather than the
language decide the count.

Each row also carries the facts the strata were created to measure — chiefly
`variance`, whether the declaration bears an `in`/`out` type-parameter
modifier. That is the D1 evidence stratum, and the census measures it rather
than leaving it to prose.

## The tasks

```
mise run census:deps        install both lanes' pinned deps
mise run census:capture -- --project <id> --slice <label>
mise run census:tally
mise run census:gate
mise run census:manifest    write measured declCounts back into corpus-manifest.json
```

| Task | Writes |
|---|---|
| `census:capture` | `out/<project>/<slice>.rows.jsonl` (one row per declaration), `out/<project>/<slice>.summary.json` |
| `census:tally` | `out/histogram.json` — codes × strata × counts, spectrum roll-up |
| `census:gate` | `out/gate-report.json`, non-zero exit when red |
| `census:manifest` | `corpus-manifest.json` `declCount` + `declCountStamp` |

`--project` and `--slice` both default to `all`. A `--slice` outside the
CLOSED vocabulary of `project-labels.json` is refused: an experiment that
could invent a stratum could not produce comparable statistics, which is the
one thing the labels file exists for.

Outputs are idempotent — same committed inputs, byte-identical outputs. Files
are walked in sorted order, declarations emitted in source order, every
object rendered through the harness's canonical JSON. Nothing in a row is a
timestamp, an absolute path, or a host fact.

## The absent-corpus rule

`corpus/` is gitignored and never committed, so **absence is the common
case**, and there are three outcomes rather than two:

| Outcome | When | Exit |
|---|---|---|
| **NOT RUN** | nothing to measure, and nobody asked for a measurement | 0 |
| **RAN** | measured; the gate then says green or red on the evidence | 0 / 1 |
| **DEMANDED** | a caller named a specific `--project` or `--slice`, or passed `--require-corpus`, and the corpus is not there | non-zero |

This is the rule the lift harness's own gate applies to its fixture lane —
*"'I could not check' must not be mistaken for either green or red"* — with
the demand escape hatch added, because a census, unlike a gate, is something
a caller can explicitly ask for. Naming a project **is** demanding a census
of it, so a typo'd `--project` fails loudly instead of reporting a cheerful
nothing.

## What the gate adjudicates

| Code | Meaning |
|---|---|
| `E-INSTRUMENT-DISAGREE` | the legs enumerated different declarations, or reached different verdicts, on the same file — or the corroborated total does not reconcile with the two raw totals. Identical **refusal** matters as much as identical match |
| `E-PARSE-DISJOINT` | exactly one leg could parse the file. The TS-land analogue of the Lean twin's ERROR-disjointness: the leg that goes silent under R12 silently changes the denominator of every count |
| `E-PIN-DRIFT` | a parser pin declared, installed, or recorded in a summary that is not the admitted exact version — the grammar stamp included |
| `E-CORPUS-PIN` | a checkout whose `.git/HEAD` is not the revision `corpus-manifest.json` names, or has no readable head |

### Corroboration, and what `declCount` means

Agreement is asserted over the **corroborated** total — declarations in
files both legs parsed *and* enumerated identically. A file only one leg can
parse does not make the other leg wrong about what it read; it means part of
the count has no second witness. So the two are separated:

- Anything that impeaches the count — `E-INSTRUMENT-DISAGREE`, `E-PIN-DRIFT`,
  `E-CORPUS-PIN` — **holds** the project's `declCount`. A number admitted
  under an instrument disagreement would be worse than `null`; `null` is
  honest about not knowing.
- `E-PARSE-DISJOINT` does not hold it. The count is written with
  `declCountUncorroborated`: the exact number of declarations no second
  instrument has seen. The gate still reports the finding and still goes red;
  the artifact still gets its number, with the residue on its face.

## The grammar stamp

Operator requirement (2026-08-29): every `declCount` this instrument writes
is stamped with the grammar revision it was counted under, and a run on the
current pin is **provisional** — a pin bump is a re-run event. The stamp is
part of the output schema, and `src/manifest.ts` writes the count and the
stamp in one statement, so there is no path that emits one without the other.

Stated honestly alongside it: census v0's two legs are `typescript` and
`oxc-parser`. **Neither is tree-sitter**, and both parse `in`/`out` variance
correctly — the census in fact *measures* variance as a per-declaration fact.
So D1 does not depress these counts. The stamp is still load-bearing: the
proposal's L2 tier is `T ∧ Cs`, census v0 runs no tree-sitter leg at all, and
when that leg joins its counts will be taken under a grammar revision. A
count with no revision on it cannot be compared with one that has it. The
revision is read from the admission receipt
(`.reference/provenance/receipts/lean4-tree-sitter-stage1-standup.json`), not
transcribed, so a pin bump moves the stamp.

## What this is not

- **Not the proposal's T ∧ Cs twin.** §10's L2 tier requires the generated
  Lean tree-sitter walker *and* the compiler API. The Lean walker is not
  reachable as a TS-callable leg, so census v0's twin is the two TypeScript
  parsers the estate has admitted. Its evidence is measurement-grade (L1 by
  the proposal's ladder, per leg), and no tier above that is claimed.
- **Not sliced.** `project-labels.json`'s `slices` entries are prose, not
  machine globs — *"src/compiler/\*\* (sampled)"*, *"types/\*\* (stratified
  random sample of packages …)"*. An instrument that guessed a glob semantics
  out of them would be minting a sampling design the labels file never
  committed to. A slice is the whole project tree attributed to one of its
  labels, and every summary says so.
- **Not a statistical claim.** Every number is an exact integer count with no
  estimator, no interval, and no sampling correction.

## TOOLS.md disposition

`TOOLS.md` rows 33 and 35 admit **winkComposer** and **wink-statistics** as
"promoting to `experiments/parser-census/`". This instrument uses neither,
and the reason is not an oversight:

- Both rows make the same thing the *gate* on their use — *"every tally must
  be reproducible by a batch (non-streaming) replay of the same corpus
  slice"*. `census:tally` **is** that batch replay: a fold over rows on disk
  with plain integer counters. There is nothing for a streaming harness to
  stream, and nothing for a statistics package to estimate.
- The composer's stated job is moving messages between instrument nodes. The
  census has two in-process legs and a `for` loop.

They are flagged for retirement in the lane report rather than deleted here:
admission rows are the operator's.

`TOOLS.md:37`'s dead `.staging/parser-experiments/dslv0/` path is corrected
to `experiments/lift-harness/src/plugin.mjs` (M10).
