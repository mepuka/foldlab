# km-expressibility — one affordance through the whole meta-language pipeline

**Exemplar only.** Wired into nothing, imported by nothing, served by nothing,
gated by nothing. It exists so the expressibility claim — *one declared term,
many surfaces, no second text* — is measured on a real affordance rather than
asserted about a hypothetical one. Nothing here ships, and nothing here is a
gate. It is the seam sketch generation will owe if AE-8 is adopted.

The affordance is the batched cell join, `joinAll(cell, contributions)`, chosen
because nothing needed inventing: the runtime term is the shipped `casJoinLoop`
composition, the donors are the proven F1 package, and both register texts are
already drafted in `docs/design/2026-08-18-km-algebraic-register.md` (§6.2–§6.3
for the two registers, §7.1 for the affordance row).

| File | What it is | Run |
| --- | --- | --- |
| `term.ts` | **The one declared term**, and the only file here where a sentence about `joinAll` is written by a person: the corpus `law` / `rung` / `operator` rows, the denotation as a term, the runtime anchor, the canonicalizer, the digest, and the two total renderings of one abstract statement type. | imported by the three below |
| `emit.ts` | Artifacts 1 and 2 — `generated/denotation.json` (the digest's canonical preimage) and `generated/joinAll.generated.ts` (the fluent TS surface: rung brands, signature, JSDoc, and three controls). | `bun scratch/km-expressibility/emit.ts` |
| `project.ts` | Artifact 3 — the sibling projections: `generated/tool.json` (the MCP tool entry, in `verify/kernel/projections/tools.schema.json`'s record shape) and `generated/registers.md` (the §7.1 row in both registers, plus the four statements paired). | `bun scratch/km-expressibility/project.ts` |
| `wall.ts` | Artifact 4 — the parity wall: preimage, parity, the §6.3 oracle, the runtime anchor, the served schema re-derived, and served-equals-derived by re-executing the emitters. Reads cross a service boundary and every external byte is Schema-decoded into a tagged refusal. Takes a directory so a mutant can be walled. | `bun scratch/km-expressibility/wall.ts [dir]` |
| `effect.ts` | The one seam that reaches the estate's pinned `effect@4.0.0-rc.108`, and the only file carrying the path. | imported by `wall.ts` |
| `run.sh` | Eleven arms: the Effect pin, emit, project, wall, the emitted surface under `tsgo` with `tsc` as referee, the exemplar's own sources, **four mutation arms**, and the README evidence compare. Without the mutation arms a green run could mean the wall compares nothing, the rung brand does nothing, and the served schema is unread. | `bash scratch/km-expressibility/run.sh [--write]` |

Same posture as `scratch/km-algebra` for the term and its emitters: zero imports
beyond `node:crypto`, so the declaration and both projections stand alone. The
WALL is the one exception, and deliberately so — it decodes external bytes, and
the estate's rule is that validation goes through `effect/Schema` with refusals
on the error channel, so a wall that hand-cast its inputs would be modelling the
wrong pattern. In the shipped design every row in `term.ts` comes out of the
conformance corpus instead, and no part of it is typed by a person either.

## The four artifacts, and what each one is evidence for

1. **The denotation.** `joinAll` = `s ↦ s ∨ (⋁ contributions)`, whose runtime
   term is the shipped composition: `Cells.merge` over `casJoinLoop` at the
   observation cell, join `cellJoin`, discipline `lawfulMergeDiscipline`,
   attempt bound 8, contention refused as `cell-update-contended`. Its canonical
   bytes are `generated/denotation.json`; its digest is
   `92c56ebd9c89ac51d4b0f46b80976e33f419f9f28c921c4ce1a688ae5efb9038`. Round 2
   moved the round-1 digest: the term now also carries the callable signature,
   the served parameter shapes, and the loop's second bound, because each was a
   thing the projections showed that the digest could not reach.
2. **The generated fluent surface.** `generated/joinAll.generated.ts` — the law
   atoms and rung bundles emitted from the `law` and `rung` rows, the signature
   at `Cell<State, BoundedSemilattice>`, and the docstring in §7.3's fixed
   order: algebraic sentence first, donor and evidence tier last. It carries one
   positive control and two `@ts-expect-error` must-not-compile controls, so it
   type-checks only if both of those FAIL to.
3. **The sibling projections.** The same term as an MCP tool entry and as the
   §7.1 affordance row in both registers. Each renders the shared fields in its
   own idiom — wrapped JSDoc, one labelled JSON description, markdown table
   cells. That is deliberate: three projections carrying an identical block of
   JSON would make the wall a copy check.
4. **The parity wall.** Eight shared fields pulled back OUT of each projection's
   own bytes by a parser written for that medium, then byte-compared across the
   three and against what the term derives, under one digest all three name —
   plus the served callable schema re-derived from the declaration by a second
   rendering written inside the wall, and a final check that re-executes both
   emitters and byte-compares all four artifacts. The served schema and the
   re-execution are round 2: without them the MCP callable was hand-authored
   outside the term and nothing compared it, which is the served-equals-derived
   class (standing estate law 3).

## The run, verbatim

The block below is **not pasted**. `run.sh --write` writes it, and every
ordinary run byte-compares the committed block against a fresh run and fails
on any difference (arm 10). Round 1 hand-pasted this evidence and nothing
checked it, so the quoted output could drift from the artifact it claimed to
describe while every arm stayed green — PR #101 review, Standards major.

<!-- EVIDENCE:BEGIN -->

```text

== arm 1: emit ==
EMIT: term   92c56ebd9c89ac51d4b0f46b80976e33f419f9f28c921c4ce1a688ae5efb9038
EMIT: wrote  generated/denotation.json (2700 canonical bytes)
EMIT: wrote  generated/joinAll.generated.ts (122 lines)

== arm 2: project ==
PROJECT: term   92c56ebd9c89ac51d4b0f46b80976e33f419f9f28c921c4ce1a688ae5efb9038
PROJECT: wrote  generated/tool.json (1 tool entry)
PROJECT: wrote  generated/registers.md (2 register rows, 4 paired statements)

== arm 3: wall ==
== parity wall: joinAll(cell, contributions) ==
   term      92c56ebd9c89ac51d4b0f46b80976e33f419f9f28c921c4ce1a688ae5efb9038
   projections in scratch/km-expressibility/generated

-- 1. preimage: the digest names bytes anyone can rehash --
  PASS  denotation.json is the canonical preimage (2700 bytes)
  PASS  rehashing the committed bytes reproduces the term digest

-- 2. parity: shared fields, extracted from each projection's own bytes --
  PASS  affordance  IDENTICAL in 3/3  joinAll(cell, contributions)
  PASS  rung        IDENTICAL in 3/3  bounded-semilattice
  PASS  algebraic   IDENTICAL in 3/3  s ↦ s ∨ (⋁ contributions) — ∨: (a ∨ b) ∨ c = a ∨ (b ∨ c); a...
  PASS  plain       IDENTICAL in 3/3  what is known here comes to include at least the join of th...
  PASS  inherited   IDENTICAL in 3/3  any grouping, any order, any duplication of the batch gives...
  PASS  donors      IDENTICAL in 3/3  f1_cell_merge_aci, f1_history_convergence
  PASS  evidence    IDENTICAL in 3/3  donor
  PASS  term        IDENTICAL in 3/3  92c56ebd9c89ac51d4b0f46b80976e33f419f9f28c921c4ce1a688ae5ef...

-- 3. oracle: the operator's statements against the committed design record --
  NOTE  rewrite differs by design — §6.3 states one contribution, this term a batch
          §6.3    plain     : what is known here comes to include at least this observation
          §6.3    algebraic : s ↦ s ∨ c(observation)
          term    plain     : what is known here comes to include at least the join of the contributions in the batch
          term    algebraic : s ↦ s ∨ (⋁ contributions)
  PASS  laws          both registers byte-identical to §6.3
  PASS  derived order both registers byte-identical to §6.3
  PASS  requires      both registers byte-identical to §6.3

-- 4. anchor: the declared facts, bound to the call the entry makes --
  PASS  the declared entry — `Effect.fn("Cells.merge")` in packages/plait/src/internal/cells.ts
  PASS  `Cells.merge` calls `casJoinLoop` (16 argument lines)
  PASS  the join bound into the call — `join: cellJoin`
  PASS  the discipline slot the call passes — `discipline,`
  PASS  the attempt bound the call passes — `attempts: CELL_MERGE_ATTEMPTS`
  PASS  the refusal an exhausted bound gives — `"cell-update-contended"`
  PASS  the loop the term denotes, in packages/plait/src/internal/cas.ts — `export const casJoinLoop = `
  PASS  the donors the loop's header names, in packages/plait/src/internal/cas.ts — `f1_cell_merge_aci`, `f1_history_convergence`
  PASS  the attempt bound's value, in packages/plait/src/planes/Cell.ts — `CELL_MERGE_ATTEMPTS = 8`
  PASS  the discipline bound to the shipped service — `makeCellServiceWith(options, lawfulMergeDiscipline)`
  PASS  the donor, as a proved theorem — `theorem f1_history_convergence`
  PASS  the rung at this carrier — `theorem f1_cell_join_semilattice`

-- 5. served schema: re-derived from the declaration, byte-compared --
  PASS  input_schema IDENTICAL to the term's derivation (cell_digest, contributions)
          required   ["cell_digest","contributions"]
          shapes     cell_digest:digest-string, contributions:string-array

-- 6. served equals derived: the emitters re-run, all four artifacts compared --
  PASS  all 4 artifacts byte-identical to a fresh derivation

WALL GREEN — one term, four artifacts, no second text.
```

<!-- EVIDENCE:END -->


**On `bun run gates`, stated precisely rather than claimed.** At the round-1
base it was green. It is **red on `main` itself** as of `265f7b0`:
`packages/plait`'s `check:type-control` exits 1 on effect-language-service
diagnostics in `src/truth/Refusal.ts` and `src/planes/Lane.ts`, which the
`typescript@7` / `@effect/tsgo@0.36.5` bump turned into failures. That failure
reproduces on a pristine `origin/main` worktree with none of this branch's
changes applied, so it is the estate's, not this slice's.

What this directory can still assert, and does, is CONTAINMENT — which is
structural and does not depend on a gate run: the root `tsconfig.json` includes
only `packages/*/src`, `packages/*/test`, and `scripts`, so nothing here is
type-checked by a gate; the gates' root test walk discovers `*.test.ts` only, of
which this directory has none; and the whole diff lands inside
`scratch/km-expressibility/`. `tsconfig.json` here exists so arm 5 can check the
exemplar's own sources against the estate's base config; no gate references it.

## What the wall claims, and what it does not

**Both-sides-agree is not verification** (AGENTS.md, working precepts). Checks 1
and 2 prove only that three projections of one term agree with each other, which
they would also do if the term said something false. So the wall names two
oracles outside both sides:

- **§6.3 of the design record** — written before this exemplar and by another
  hand. The `laws`, `derived order`, and `requires` statements are the join
  operator's own, and both registers of all three must come out byte-identical
  to the block committed there. The `rewrite` statement is the one line that
  legitimately differs (§6.3 states the single-contribution join, this term the
  batched one), so the wall REPORTS it rather than comparing it.
- **The shipped source** — every runtime fact `term.ts` declares is bound to the
  `casJoinLoop` call that the declared entry actually makes, so the denotation is
  anchored to code rather than to a story about code. Round 2 tightened this: the
  round-1 anchor asked only whether each string occurred *somewhere* in the named
  module, which a module that had stopped calling the loop would still have
  satisfied — it could certify a false denotation.

A third check is not an oracle but is the one the review's worst finding turned
on: the **served callable schema** is re-derived from the declaration by a second
rendering written inside the wall and byte-compared against the served bytes, and
both emitters are re-executed so all four artifacts are compared against a fresh
derivation. Two renderings of one declaration is served-equals-derived; one
rendering compared against itself would be green by construction.

Stated bounds, because a digest and a green wall both invite over-reading:

- The canonicalizer in `term.ts` is a **local** one over a small closed domain
  (sorted keys, safe integers, strings, booleans, arrays, objects; everything
  else refused). It is **not** the estate's RFC 8785 door,
  `packages/plait/src/truth/Canonical.ts`. Round 2 makes this a scope choice
  rather than an inability — `wall.ts` now reaches the pinned Effect through
  `effect.ts` — but that door is a `packages/plait` seam whose import would drag
  the plane graph into a directory meant to stand alone. A generator inside the
  estate would use it. The two agree on the shape of the claim, not on the byte
  rule for floats, `-0`, or non-BMP escapes — none of which this domain admits.
- The oracle arm compares **text**, not meaning. It catches drift between the
  record and the term; it cannot catch a sentence that is wrong in both.
- The emitted surface is a **type-level** probe. `Effect<A, E>` there is a
  structural stand-in, not the pinned `effect@4.0.0-rc.108` type, so arm 4
  measures the rung constraint and the argument sorts — nothing about runtime
  behaviour, and nothing about whether the shipped `Cells.merge` is correct.
- Nothing here measures whether either register is easier for a model or a
  person to author against. That is KM-18's eval, and this exemplar makes no
  parity-in-understanding claim.
- One affordance is one affordance. Six more rows sit in §7.1 and none of them
  is generalized from here before the ruling.

## Finding E-1

`scratch/km-algebra/two-registers.ts` carries the per-operator plain-word
phrasing that N-1 forced as a **closure**: `reading: (s, c) => ...`. Writing this
slice turned that into a defect the moment a digest entered the picture — a
closure has no canonical bytes, so under a closure the phrasing sits OUTSIDE the
term digest, and the plain register could be reworded without moving the digest
the parity wall compares. Here `reading` is a template string with `{state}` and
`{contribution}` holes, and `canonicalBytes` refuses a function outright rather
than skipping it, which makes the constraint structural instead of a note.

**E-1: N-1 made the phrasing a per-operator datum; a datum the digest cannot
reach is not yet inside the term.** The corpus `operator` group should carry
`reading` as a template string, and the shape check should refuse a row whose
reading is not one — same posture as N-1's "no generic fallback".

## Decisions the issue did not fix

| # | Decided | Alternatives | Why | Load-bearing |
| --- | --- | --- | --- | --- |
| E-D1 | The three projections render the shared fields in three different idioms, and the wall parses each medium back. | One embedded parity block per projection, compared as JSON. | A shared block makes the wall a copy check: it would stay green through a renderer that never rendered the field into the surface a reader sees. | yes — arm 6 mutates a rendered field and the wall must catch it there |
| E-D2 | The tool description uses a **labelled** segment grammar (`Algebraic: … Plain: … License: …`). | Free prose in the shape `kernel_join`'s hand-derived description uses. | A parser over free prose is a guess; the generated grammar is what makes the tool entry walled rather than trusted. Cost: the description reads more mechanically than the hand-written one it is modelled on. | yes |
| E-D3 | The wall's outside oracles are §6.3 of the design record and the shipped source. | Parity across the three projections alone. | AGENTS.md: both-sides-agree is not verification. Without an oracle the wall proves consensus among three renderings of one possibly-wrong term. | yes |
| E-D4 | The plain register's rung **adjective** is a rendering, not a shared field, and is excluded from the byte-compare. | Compare a normalized rung across both registers. | The two registers legitimately spell the rung differently (§6.3: `bounded semilattice` vs `duplicate-safe`); normalizing to compare it would have the wall assert something the registers do not claim. The canonical rung key appears in all three and IS compared. | no |
| E-D5 (round 2) | The served schema is rendered TWICE from one declaration — once in `project.ts`, once inside `wall.ts` — with no shared helper. | One exported builder both sides call, compared to the served file. | A single builder compared against its own output is self-comparison: it passes by construction and cannot see a wrong derivation, only a corrupted file. Two independent renderings of one declaration is the served-equals-derived shape the estate's law names. Cost: the rendering exists twice, and a change to the shape must be made in both — which arms 8 and 9 turn into a red run rather than a silent divergence. | yes — arms 8 and 9 |
| E-D6 (round 2) | `wall.ts` imports the pinned Effect and decodes external bytes through `Schema` into refusals carrying reason · law · repair. | Keep the wall dependency-free with `JSON.parse` and an unchecked cast, as round 1 had it. | An exemplar offered as the pattern for generated walls cannot model the thing the estate refuses on its meaning path (standing laws 5 and 6). The cost is real and is fenced to one file: `effect.ts` carries the path, because `scratch/` is outside the workspace globs and the bare specifier does not resolve. | yes — a missing projection now REFUSES with a repair instead of dying in an ENOENT stack trace |

## Deliberately untouched

The shipped `Cell` surface, the conformance corpus, `packages/plait/scripts/`'s
generators, `verify/`, and every gate. `joinAll` does not exist in
`packages/plait/src/planes/Cell.ts` and this slice does not add it — the shipped join
surface is `Cell.join` plus `CellService.merge`, and §7.1's `joinAll` row is
still an unbuilt affordance. Nothing here is imported by anything, and the four
generated files under `generated/` are committed so that the wall and this
README are checkable from a fresh clone.
