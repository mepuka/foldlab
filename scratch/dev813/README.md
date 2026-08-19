# DEV-813 prep: the JSON-schema projection lane

The mechanical census over the committed tool-schema sketch, collected the way
the TS and Go AST preps were collected. Every number here is read off two files
— `verify/kernel/Kernel/Definitions.lean` and
`verify/kernel/projections/tools.schema.json` — by
`scratch/dev813/extract.py`. Re-derive with `python3 scratch/dev813/extract.py`
from the repository root.

Read at `origin/main` commit `c0b5b69`. Sketch sha256
`8d9cb4b106c86f60f6e74ae60ff20ee57a3f0354e91227480f8562e6ea3bd7d4`.

## The headline

| measurement | value |
| --- | ---: |
| distinct JSON-Schema keywords used | 10 |
| keyword occurrences | 144 |
| naming-map rows | 32 |
| carrier-map rows | 14 |
| trigger-flattening rows | 5 productions over 9 optional slots |
| rows carrying the stale safe-range bound | 7 of 7 integer rows |
| prose paragraphs with no model source | 45 (8 tools, 34 fields, 3 `$comment`) |
| prose words with no model source | 819 |
| constructor-level docstrings in the model | 0 |

## The files

- [`keyword-census.md`](keyword-census.md) — the closed vocabulary the direct
  printer must emit, and the thirty-six keywords it must not.
- [`wire-convention-tables.md`](wire-convention-tables.md) — **DRAFT.** The
  naming map, the carrier map, and the trigger-flattening rule, extracted as
  data. This is the first draft of the reviewed manifest the recut says must
  have a home.
- [`stale-bounds.md`](stale-bounds.md) — the seven rows A4 invalidated, with
  the corrected fragment beside each and the corpus witness that proves it.
- [`prose-inventory.md`](prose-inventory.md) — the 45 paragraphs verbatim, each
  tagged with the law it cites. The review load the ticket must price.
- [`parity-manifest.md`](parity-manifest.md) — the pin, and the determinism
  constraints a direct printer inherits: key ordering, layout, alphabet,
  escaping.
- [`measurements.txt`](measurements.txt) — the extractor's full output.
- [`census-out.json`](census-out.json), [`tables-out.json`](tables-out.json) —
  the same data machine-readable.

## What the search found

One committed sketch is in scope. `.schema.json` files elsewhere in the tree
are unrelated: `repos/effect/packages/tools/ai-codegen/codegen.schema.json` is
vendored Effect, and `scratch/evals/q1-schema-confusion/generated/tools.{bare,
compound,nested}.schema.json` are eval fixtures for a different question.
Copies under `.claude/worktrees/` are checkouts of the same file.

## Five findings the collection produced

**1. The prose has no source and cannot acquire one by walking harder.**
`verify/kernel/Kernel/Definitions.lean` carries 109 declaration-level
docstrings and **zero** constructor-level ones. `Projections.Walk.docOf` calls
`findDocString?` on the declaration name only, so `ProjectionAst.docs` carries
one `DocSentence` per manifest name — 22 rows, none of them a tool and none of
them a field. The 42 tool-and-field paragraphs have nowhere in the AST to come
from today.

**2. The sketch's prose cites four laws the model's own ledger does not.**
`verify/unity/citations.txt` is an eight-row ledger, scraped from the model's
taught table and gated at `verify/unity/run.sh:182-225`: every cited name must
resolve in `verify/fabric`'s roster, or stay out of it if veil-walled. The
sketch's eight tool descriptions cite nine laws. Five are in the ledger.
`f2_trace_invariant`, `f3_resume_exact`, `f9_policy_meet_semilattice` and
`f9_tree_attenuation` are not. A citations-style wall over emitted prose goes
red today.

**3. The naming map is total, which is better news than it looks.** All 32 wire
properties are reached by exactly one model row, and no model field is
orphaned. The convention is not arbitrary — it is four rules (identity,
`+_digest`, rename, flatten) plus brand erasure. That is small enough to be
reviewed data rather than an algorithm.

**4. Three of the sketch's divergences are already known to be its own
defects.** Twelve property objects are written on one line and twenty-four are
expanded; two `kind` fields order `description` before `enum` where four others
order it after; and nine em dashes conflict with `Projections.asciiDoc`, whose
landed artifact carries `--`. A printer emits one layout, one key order, one
alphabet. These three will show up in the first parity diff and are the
sketch's fault, not the printer's.

**5. The digest pattern cannot be copied forward.** All thirteen digest fields
carry `^sha256:[0-9a-f]+$`, and the sketch's own `digest_format` `$comment`
says why: "Model uses short identity labels (sha256:NN); the running system
carries 64 lowercase hex chars. The pattern below is the model's." An artifact
that serves real clients needs `^sha256:[0-9a-f]{64}$`. The width is a wire
fact with no model source, and it belongs in the carrier map beside the
corrected integer fragments. This also makes the sketch a deliberately
non-serving reference in one more respect than the stale bounds alone.

## The charter sharpening

### The mechanical build steps

1. **Land the wire-convention tables as reviewed data**, in the shape the
   sketch measured them: a naming map of 32 rows, a carrier map of 14 rows, a
   trigger correspondence of 5 productions over 9 slots, and the tool-name rule.
   Two precedents exist in the tree and both should be read before choosing:
   `packages/plait/scripts/kernel-runtime-refusals.ts` — a reviewed datum
   explicitly marked DRAFT, with a wall that requires the DRAFT marker to be
   present, and its destination named as staged debt — and
   `verify/unity/citations.txt` — a tab-separated ledger reconciled against the
   environment by its gate. The refusals file is the closer analogue because it
   carries prose; the citations file is the closer analogue because it carries
   a name-to-name table with a reconciliation wall. The manifest needs both
   halves.

2. **Write the direct printer over `ProjectionAst`**, walled the way
   `Prose.lean` is: pure, total, all layout decisions in one file, rendering to
   a deterministic `Format` and then to a string. The printer's input is the
   `ProjectionAst` plus the reviewed manifest; it invents nothing. `Prose.lean`
   already proves direct printing works — 50 lines, no target AST, no
   metaprogramming — and its `renderString` pins the physical width even though
   its own layout uses hard breaks. The JSON printer needs the same discipline
   at three named points: key order, object expansion, and string escaping.

3. **Fix the printer's determinism rules before emitting**, because the sketch
   cannot arbitrate them: one key order per node shape, one layout for every
   property object, and one prose alphabet shared with `asciiDoc`.

4. **Build the walls.** Byte-identical regeneration across two runs. A parity
   diff against the sketch with every divergence quoted and filed. A
   manifest-versus-environment reconciliation in the citations style: every
   model field named by the naming map must exist in the environment, and every
   environment field of a projected declaration must appear in the map — the
   check that would have caught `Kernel.AdmitResult`'s absence from
   `names.txt`. A law-citation check against `verify/unity/citations.txt`. A
   mutation arm per wall, because a wall whose failure mode is untested is a
   comment.

5. **Retire the sketch in the flip commit**, once the divergences are filed and
   the emitted artifact is the served one.

### The two gates it stays behind

**Gate 1 — the wire-convention-table home.** A3 ruled the printer placement on
2026-08-19 and explicitly deferred this: "The wire-convention-table sub-row
carries the standing recommendation (reviewed manifest beside the printer now,
model docstrings as destination) — to be confirmed at DEV-813's recut; not
separately ruled tonight." The tables in this collection are that manifest's
first draft and are marked DRAFT for exactly that reason. Until the home is
ruled, the printer has no input to read and the ticket cannot start.

**Gate 2 — DEV-822's majors.** Four DEV-815 majors merged into toolkit A
unrepaired, and each one bites this lane specifically. The hard-coded module
list at `Main.lean:54` means the walk is parameterized by names, not by the
environment, so a JSON printer inherits a walk that cannot be pointed at
anything new. `names.txt` has no environment side, so the 22-versus-22 count is
pin against pin and a missing declaration is invisible — the same defect the
naming map's reconciliation wall must not repeat. `refusals := []` is never
rendered, so `refusal_result` would be the first consumer of a printer branch
no input has ever reached. And the one-metaprogramming-site gate does not scan
`Main.lean`, which is where a second environment site already sits. A JSON
printer built on that toolkit inherits all four.

The A4 numeric ruling is **not** a third gate. It has ruled — identity fields
carry exact integers, clients must not parse them as doubles — and the `§11a`
ruling-3 edit rides this ticket's recut. The seven corrected fragments are
drafted in `stale-bounds.md` and are ready to land with it.
