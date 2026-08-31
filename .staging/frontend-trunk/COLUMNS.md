# COLUMNS — the trunk's column algebra and the naming inventory

Status: **STAGED UI/APP DIRECTION — pre-grade**. Written 2026-08-30 on
operator order ("persist this table"), beside [SPEC.md](SPEC.md) (the
trunk renders the word; this file is the column ORIENTATION of the
same single object). The Lean face lands the same session in
`library/cas/Cas/IR/Column.lean`; the sort authority is
`Cas.Grammar.Ty` ([Sorts.lean](../../library/cas/Cas/Grammar/Sorts.lean))
with its emitted table (`generated/grammar/manifest.json`,
`kindTags.ts`, [REGISTRY.md](../../library/cas/REGISTRY.md)). Nothing
here mints wire vocabulary; the registry's stillness is the discipline.

## Where `ofTag` sits — algebra vs view

The split the operator asked for: **the partition operator is algebra;
the classifier is the view's choice.**

- `Word.columnBy c l w` — the word filtered by ANY pointwise classifier
  `c : Binding → Option L`. Its laws hold for every classifier:
  appends localize (`columnBy_append` — incremental render), columns
  are pairwise disjoint, membership is exact.
- The SORTS view is one instance: `Word.column t = columnBy
  (Ty.ofTag ∘ tag) t`. It is privileged only because its classifier is
  ratified grammar with a round-trip theorem (`ofTag_wireTag`) — not
  because the UI invented it. Other views instantiate other
  classifiers and inherit the same laws.
- Boundary: `columnBy` covers POINTWISE classifiers (label computable
  from the binding alone). Groupings that need the store — "reachable
  from this root" — are RELATIONAL VIEWS (the rules/emission
  machinery, store-crdt.md §rules-as-spec), not columns. Two view
  families, both derived, different laws.
- Totality: every binding lands in exactly one column or in
  `Word.unregistered` (tags the registry refuses) — the UI surfaces
  the unregistered strip, never hides it.

## The naming algebra

Names form the free monoid over the grammar's identifiers with `.` as
concatenation; the naming function is a homomorphism from the grammar
tree: `name(child) = name(parent) · "." · segment`. REGISTRY.md's own
section headings are already these words, emitted by `emitgrammar`
from `manifestV0` — one authority, zero curation. The same string
serves every seat: UI label, view-rule relation name, generated TS
accessor path, and (modulo casing) the Lean spelling.

- **Column** = 1 segment (the sort name).
- **Block** (form) = 2 segments (`tree.leaf`).
- **Field / edge** = 3 segments (`file.file.content→manifest`).
- **Instance** (a rendered square) = form word + address:
  `entry.entry@7bfa…`.
- **Free-discipline edges** extend by numerals: `cont.cont.line.3`,
  `context.context.item.0`.
- **Unregistered remainder**: no grammar word exists, so the block is
  named by its raw coordinate — `tag:0x5A` — grouped under one strip.
- **Semantic aliases**: when the operator grants a human/app-language
  name, it ALIASES a derived string (keyed by it, app-side), never
  replaces it — the derived table exists for every entry whether a
  semantic name does or not, and is emitted as
  `generated/grammar/names.json` (landing this session).

## The inventory (the persisted table)

| column | blocks | fields / edges |
|---|---|---|
| `value` | `value.value` | `.payload` |
| `chunk` | `chunk.chunk` | `.bytes` |
| `tree` | `tree.leaf` · `tree.parent` | leaf: `.index` `.length` `.data→chunk`; parent: `.left→tree` `.right→tree` |
| `manifest` | `manifest.manifest` | `.recipe` `.totalBytes` `.leafCount` `.root→tree` |
| `file` | `file.file` | `.name` `.mediaType` `.content→manifest` |
| `entry` | `entry.genesis` · `entry.entry` | entry: `.note` `.item→file` `.prev→entry` |
| `context` | `context.context` | free: `.item.0`, `.item.1`, … (edge tag read off the loaded node) |
| `step` | `step.put` · `step.load` | put: `.form` `.version` `.tag` `.payload` `.operandCount` `.operands`; load: `.form` `.operandKind` `.operand` |
| `cont` | `cont.cont` | `.lineCount`; free: `.line.0`, `.line.1`, … `→step` |
| `git` | `git.git` | `.object` (payload-derived refinement available: `git.commit` / `git.tree` / `git.blob` / `git.tag` — the type word is IN the preimage) |
| `schema` | `schema.schema` | `.bytes` |

Ruling asks carried by the inventory (operator's):

1. **`entry.agent`** — REGISTRY row 12's note names a dispatched
   three-edge agent form (context, value, prev) with no registry
   section yet. Naming it `entry.agent` is proposed, not taken.
2. **`git` refinement** — surface the payload-derived object type as
   the block name (`git.commit` …) or keep `git.git`.
3. **Column order** — left→right is a FIXED ruling, never a live
   statistic: default from semantic speed classes (near-still:
   `schema`, `git`, `cont`; bursty-per-program: `step`;
   per-artifact: `manifest`, `tree`, `file`; steady-fast: `context`,
   `entry`, `value`; bursty-fastest on ingest: `chunk`), re-ruled at
   named cuts if measurement (the receipt plane's `at` timestamps)
   disagrees. Reordering destroys spatial memory; stability is the
   point.
4. **The hypotenuse** — as an invariant, sort by column height at a
   cut (sorted heights are a monotone staircase by definition);
   ordered by rate it is emergent only. The edge's straightness is
   itself a diagnostic: straight = appends spread evenly across
   sorts; bowed = activity concentrated.

## What this is — the two-audience statement (operator's framing, worded for the record)

**The boundary law.** The correspondence between the store's algebra
and algebraic effects is BUILT, not found. It holds because the store
language was constructed as an effects language (meaning lives in the
reference handler) and because programs were defunctionalized into
content (`step`/`cont`). Nothing transfers for free across that
boundary, in either direction: pointing this app at a structure with
no continuation discipline confers none of the language's guarantees;
and adopting the algebra kernel confers neither Effect-TS's ergonomics
nor its ecosystem without the linking work being redone at the new
boundary. The linkage has exactly one load-bearing joint: the
defunctionalized code points — where a program becomes content and
content becomes a program.

**For the Effect-TS programmer**: this is a meta-effectful agent
harness. The view into your code is algebraically linked to the
structure of the app itself — the harness observing your effectful
program is an effectful program over the same store, speaking the same
language. Observer and observed meet without translation at the
defunctionalized code points.

**For the lay viewer**: the app's one pedagogical job is to install a
single mental model — an agent run IS an effectful program. A run is a
sequence of admissions; every step is a visible effect with a typed
outcome; the trunk shows computation as growth. Nothing is a log line;
everything is content with an address.

## What the UI consumes today (no proof cycles required)

- `generated/grammar/manifest.json` + `kindTags.ts` — the column list
  and tags, emitted, versioned.
- The naming homomorphism above — mechanical from the manifest; its
  emission as a name inventory (JSON) is a small `emitgrammar`
  extension for the backend-materialize lane (owed, not landed).
- The column laws (`columnBy_append`, disjointness, coverage) — landed
  in Lean this session; the UI relies on them as invariants (append =
  incremental render; one column per block or the strip) without
  re-proving anything.
