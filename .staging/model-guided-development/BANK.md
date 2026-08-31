# BANK — outcome bank and benchmark data law

Status: **STAGED DATA LAW — pre-grade**. Written 2026-08-30. This file
governs the two data stores the scout loop ([LOOP.md](LOOP.md)) reads and
writes: the **outcome bank** ([bank/](bank/)) and the **benchmark packets**
([bench/](bench/)). Both live as tracked markdown because the operator
ruled the CAS APIs not yet solid enough to host them (2026-08-30); the
formats below are chosen to lift cleanly into the coded event store when
MGS-001+ exists. Vocabulary provisional — grilled 2026-08-30, verdicts in
[GRILL.md](GRILL.md); ratification stamps remain the operator's. No gate
stamps; claim ceiling for everything in this lane is **heuristic
evidence, pre-grade** — the bank never carries trust, it carries memory.

## Layout — depth is law

The `.gitignore` ruling tracks `.staging` markdown only to depth 3.
Therefore every archival file in this lane is `.md` at
`.staging/model-guided-development/<name>.md` or
`.staging/model-guided-development/<dir>/<name>.md` — never deeper.
Anything deeper or non-markdown (harness output, raw model transcripts,
packet working data) is local-only by construction and must be treated as
regenerable.

```
.staging/model-guided-development/
  LOOP.md          the run procedure
  BANK.md          this law
  ANNOTATE.md      cheap-model harness (embedded canonical script)
  runs.md          run ledger (append-only)
  bank/
    README.md      pointer here
    <family>.md    one file per obligation family (tracked, curated)
    counterexamples.md   counterexample ledger (append-only)
    patterns.md          selected-invariant / success-pattern ledger
  bench/
    README.md      pointer here + packet manifest
    candidates.md  candidate case list mined from the record
    packets/       local working packets (never tracked)
    answers/       BLINDED answer key (never tracked, never read by a scout)
  annotate/        local harness materialization (script, schemas, out/)
  sources/ extracted/   pinned study sources (prior turn)
```

## Families

Nine seed families, named from the estate's existing schema families —
reused, not minted (decision 2, no new abstractions):

| Family | One-line shape |
|---|---|
| `WF-PRESERVE` | well-formedness holds initially and every operation preserves it |
| `TRACE-EXCLUDES` | a named bad event/trace never occurs in any admitted run |
| `EXACT-STEP` | an operation's effect is exactly its specification — no more, no less |
| `FAIL-CLOSED` | failure, interruption, retry, replay leave no partial admission |
| `DISTINCTNESS` | distinct inputs remain distinct; no collision, no aliasing |
| `HOMOMORPHISM` | a structure map commutes with operations; handler agreement squares |
| `CODEC` | round-trip, exact decode, canonical bytes, idempotent re-encode |
| `REJECTION-CLAUSE` | invalid input refused loudly, with a typed reason |
| `AGREEMENT` | two independent lanes agree on every declared observation |

A new family enters by the same act as any minting: proposal here,
grilling before it is used to classify gated work. Until then, classify
with the nearest existing family and note the strain in `openQuestions`.

## Family entry schema

One file per family: `bank/<family-lowercase>.md`. YAML frontmatter
carries the machine-readable core; the body carries curated prose. The
frontmatter fields (all required, empty lists allowed):

```yaml
---
id: WF-PRESERVE          # the family name, exact
version: 1               # bump on any curated change
carriers: []             # estate carriers/observables this applies to
applicability: []        # questions that decide whether the family applies
templates: []            # candidate templates: {name, form} — form is an
                         #   informal grammar over the target's vocabulary
                         #   (renamed from `constructors` at the 2026-08-30
                         #   grill — collision with Lean inductive
                         #   constructors; GRILL.md V2)
falsifiers: []           # expected falsifiers: {name, mutation, detects}
checkers: []             # compatible lanes: fast-check | lean-decide |
                         #   byte-gate | word-equality | manual
claimCeiling: heuristic  # the strongest thing bank content may ever say
---
```

Body sections, in order:

1. `## Sites` — where the estate expresses this family today
   (file:line, test/theorem/gate names). Curated by hand from survey.
2. `## Positive examples` / `## Negative examples` /
   `## Implication examples` — concrete, replayable where possible.
3. `## Counterexample history` — pointers into
   [counterexamples.md](bank/counterexamples.md) rows for this family.
4. `## Outcome history` — per scout run: proposed/refuted/selected
   counts and cost, appended by the run's write-back.
5. `## Annotations` — model-proposed material awaiting curation (see
   protocol below).
6. `## Open questions`.

## Counterexample ledger

[bank/counterexamples.md](bank/counterexamples.md), append-only. One
entry per counterexample, numbered `CX-001…`. An entry records: family,
target, the witness itself (inline if small, else a pointer), what it
refuted, how it was found (bank replay / fast-check seed / model
proposal / historical record), and its disposition — every entry must
end in one of:

- **fixture** — proposed to the breaker as a red-battery test;
- **negative example** — folded into a family file;
- **existential** — a Lean statement that the witness exists; or
- **retired** — superseded, with the superseding entry named.

The standing rule from the study, now law here: **a counterexample never
dies in a model transcript.** If it mattered enough to kill a candidate,
it matters enough for a row.

## Pattern ledger

[bank/patterns.md](bank/patterns.md), append-only, `PT-001…`: invariant
shapes and helper-lemma forms that were SELECTED and survived their
checks in some run — the reusable half of the outcome history. Each entry
names family, the shape (abstracted over the target), the run that
produced it, and where it was ultimately used (packet, theorem, gate).

## Annotation protocol (cheap model)

`gpt-5.6-luna` (via [ANNOTATE.md](ANNOTATE.md)) may propose material for
exactly these destinations: `applicability` questions, `templates`,
`falsifiers`, negative-example sketches, related-family links, and
`openQuestions`. Rules:

1. Model output lands ONLY under `## Annotations`, marked with model,
   date, and receipt pointer. It never edits frontmatter or curated
   sections directly.
2. A human or a curating session moves an annotation up into the
   curated fields; the move is the acceptance act and keeps the
   provenance line (`curated from luna 2026-08-30, receipt <digest>`).
3. Annotations are additive proposals. Luna never deletes, weakens, or
   rewrites curated text; conflicts are surfaced as open questions.
4. Empty trust contribution, always: an annotation is a search hint.
   Nothing model-written travels into a packet, gate, or doc outside
   this lane without passing through a checker or the operator's grill.

## Benchmark packets and blinding

[bench/](bench/) holds the retrospective evaluation bank the plan's
adoption decision needs: target 24 packets — 8 historical specification
defects, 8 invariant/proof failures, 8 clean slices (controls) —
balanced across relational / algorithmic / transition-trace shapes where
the record allows.

- `bench/candidates.md` (tracked): the mined case list — description,
  class, seed-class, evidence pointer, answer pointer. This file may
  name where answers LIVE but must not state the answers themselves
  beyond the one-line historical fact needed to identify the case.
- `bench/packets/<id>/` (local): the scout-facing packet — frozen
  snapshot reference, target, draft contract or intent, budget. Built
  by a PREPARER session.
- `bench/answers/<id>.md` (local): the answer key — historical defect,
  minimal counterexample, accepted repair, final law/theorem names.

**Blinding law.** The preparer sees answers; a scout run and its
evaluator never do. A session running [LOOP.md](LOOP.md) against a
packet MUST NOT open `bench/answers/` or the evidence trail the packet
id points at until its run row is written. A run that peeked is marked
`contaminated` in its ledger row and never counts toward the adoption
measure. Preparer and scout are different sessions, same as breaker and
implementer.

## Promotion path (owed, not performed here)

When this lane earns promotion: bank entries get an artifact kind
(KINDS.md), the codex role extension lands as a TOOLS.md row edit, the
event-store lift happens under MGS-001's ratified declarations, and the
SPECS.md rows move category. Each of those is an operator act; this file
only keeps the shapes lift-ready.
