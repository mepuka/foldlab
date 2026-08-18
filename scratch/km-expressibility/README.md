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
| `wall.ts` | Artifact 4 — the parity wall: preimage, parity, the §6.3 oracle, the runtime anchor. Takes a directory so a mutant can be walled. | `bun scratch/km-expressibility/wall.ts [dir]` |
| `run.sh` | Seven arms: emit, project, wall, the emitted surface under `tsgo` with `tsc` as referee, the exemplar's own sources, and **two mutation arms** — without those a green run could mean the wall compares nothing and the rung brand does nothing. | `bash scratch/km-expressibility/run.sh` |

Same posture as `scratch/km-algebra`: zero imports beyond `node:crypto`, so the
exemplar stands alone. In the shipped design every row in `term.ts` comes out of
the conformance corpus instead, and no part of it is typed by a person either.

## The four artifacts, and what each one is evidence for

1. **The denotation.** `joinAll` = `s ↦ s ∨ (⋁ contributions)`, whose runtime
   term is the shipped composition: `Cells.merge` over `casJoinLoop` at the
   observation cell, join `cellJoin`, discipline `lawfulMergeDiscipline`,
   attempt bound 8, contention refused as `cell-update-contended`. Its canonical
   bytes are `generated/denotation.json`; its digest is
   `2dda26cb2435a3aed5e055f4169b05345bdb6c1ddeee6187779428e792d5b28e`.
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
   three and against what the term derives, under one digest all three name.

## The run, verbatim

```
== arm 1: emit ==
EMIT: term   2dda26cb2435a3aed5e055f4169b05345bdb6c1ddeee6187779428e792d5b28e
EMIT: wrote  generated/denotation.json (1698 canonical bytes)
EMIT: wrote  generated/joinAll.generated.ts (119 lines)
PASS  denotation and surface emitted

== arm 2: project ==
PROJECT: term   2dda26cb2435a3aed5e055f4169b05345bdb6c1ddeee6187779428e792d5b28e
PROJECT: wrote  generated/tool.json (1 tool entry)
PROJECT: wrote  generated/registers.md (2 register rows, 4 paired statements)
PASS  sibling projections emitted

== arm 3: wall ==
== parity wall: joinAll(cell, contributions) ==
   term      2dda26cb2435a3aed5e055f4169b05345bdb6c1ddeee6187779428e792d5b28e
   projections in scratch/km-expressibility/generated

-- 1. preimage: the digest names bytes anyone can rehash --
  PASS  denotation.json is the canonical preimage (1698 bytes)
  PASS  rehashing the committed bytes reproduces the term digest

-- 2. parity: shared fields, extracted from each projection's own bytes --
  PASS  affordance  IDENTICAL in 3/3  joinAll(cell, contributions)
  PASS  rung        IDENTICAL in 3/3  bounded-semilattice
  PASS  algebraic   IDENTICAL in 3/3  s ↦ s ∨ (⋁ contributions) — ∨: (a ∨ b) ∨ c = a ∨ (b ∨ c); a...
  PASS  plain       IDENTICAL in 3/3  what is known here comes to include at least the join of th...
  PASS  inherited   IDENTICAL in 3/3  any grouping, any order, any duplication of the batch gives...
  PASS  donors      IDENTICAL in 3/3  f1_cell_merge_aci, f1_history_convergence
  PASS  evidence    IDENTICAL in 3/3  donor
  PASS  term        IDENTICAL in 3/3  2dda26cb2435a3aed5e055f4169b05345bdb6c1ddeee6187779428e792d...

-- 3. oracle: the operator's statements against the committed design record --
  NOTE  rewrite differs by design — §6.3 states one contribution, this term a batch
          §6.3    plain     : what is known here comes to include at least this observation
          §6.3    algebraic : s ↦ s ∨ c(observation)
          term    plain     : what is known here comes to include at least the join of the contributions in the batch
          term    algebraic : s ↦ s ∨ (⋁ contributions)
  PASS  laws          both registers byte-identical to §6.3
  PASS  derived order both registers byte-identical to §6.3
  PASS  requires      both registers byte-identical to §6.3

-- 4. anchor: every runtime fact the term declares, against shipped source --
  PASS  the loop the term denotes — `export const casJoinLoop = ` in packages/plait/src/internal/cas.ts
  PASS  the donors the loop's header names — `f1_cell_merge_aci`, `f1_history_convergence` in packages/plait/src/internal/cas.ts
  PASS  the one call site of that loop — `casJoinLoop({` in packages/plait/src/internal/cells.ts
  PASS  the join bound into it — `const cellJoin: CasJoin` in packages/plait/src/internal/cells.ts
  PASS  the discipline slot the entry passes — `discipline,` in packages/plait/src/internal/cells.ts
  PASS  the refusal an exhausted bound gives — `"cell-update-contended"` in packages/plait/src/internal/cells.ts
  PASS  the attempt bound — `CELL_MERGE_ATTEMPTS = 8` in packages/plait/src/Cell.ts
  PASS  the donor, as a proved theorem — `theorem f1_history_convergence` in verify/fabric/Fabric/Proofs.lean
  PASS  the rung at this carrier — `theorem f1_cell_join_semilattice` in verify/fabric/Fabric/Proofs.lean

WALL GREEN — one term, four artifacts, no second text.

== arm 4: the emitted surface, tsgo Version 7.0.0-dev.20260707.2 then tsc as referee ==
PASS  emitted surface type-checks; every must-not-compile control failed to compile

== arm 5: the exemplar's own sources under the estate's base config ==
PASS  term/emit/project/wall type-check

== arm 6: mutation — one donor mangled in the tool projection alone ==
PASS  mutation caught on exactly the mutated field:
    FAIL  donors      DIFFERS in 1/3
            derived : f1_cell_merge_aci, f1_history_convergence
            tool(.json)    : f1_cell_merge_aci, f1_history_convergenc

== arm 7: mutation — join weakened to the commutative-monoid rung ==
PASS  mutation caught — the weakened rung leaves a control unused:
  .mutant-surface.ts(112,1): error TS2578: Unused '@ts-expect-error' directive.

ALL ARMS PASS
```

`bun run gates` is green at the same commit, which is the assertion that no
estate gate changed: the root `tsconfig.json` includes only `packages/*/src`,
`packages/*/test`, and `scripts`, so nothing in this directory is type-checked
by a gate, and the gates' root test walk discovers `*.test.ts` only, of which
this directory has none. `tsconfig.json` here exists so arm 5 can check the
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
- **The shipped source** — every runtime fact `term.ts` declares is matched
  against the file it names, so the denotation is anchored to code rather than
  to a story about code.

Stated bounds, because a digest and a green wall both invite over-reading:

- The canonicalizer in `term.ts` is a **local** one over a small closed domain
  (sorted keys, safe integers, strings, booleans, arrays, objects; everything
  else refused). It is **not** the estate's RFC 8785 door,
  `packages/plait/src/Canonical.ts`, which the exemplar cannot import because
  `effect` does not resolve from `scratch/`. A generator inside the estate would
  use that door. The two agree on the shape of the claim, not on the byte rule
  for floats, `-0`, or non-BMP escapes — none of which this domain admits.
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

## Deliberately untouched

The shipped `Cell` surface, the conformance corpus, `packages/plait/scripts/`'s
generators, `verify/`, and every gate. `joinAll` does not exist in
`packages/plait/src/Cell.ts` and this slice does not add it — the shipped join
surface is `Cell.join` plus `CellService.merge`, and §7.1's `joinAll` row is
still an unbuilt affordance. Nothing here is imported by anything, and the four
generated files under `generated/` are committed so that the wall and this
README are checkable from a fresh clone.
