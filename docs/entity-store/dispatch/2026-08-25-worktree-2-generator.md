# Dispatch brief — worktree 2: Stage 2 generator, gate-first

Operational dispatch instrument, coordinator-issued 2026-08-25. Not a claim-bearing
document. Branch from the tip of `main`.

## Mission

Implement KICKOFF §12's ratified build step 2 — "stand up gen end-to-end on a
deliberately small inventory and prove the gate by breaking it three ways" — as a NEW
directory `experiments/entity-store-generate/`. Everything lives inside that directory;
nothing outside it is touched.

The generator is deliberately judgment-free: it transcribes inventory facts into Lean
text. The Effect-variant → carrier mapping is design-laden and OUT of scope — if the
work seems to need such a decision, that is a finding for the coordinator, not a choice
to make. (Trust posture, KICKOFF §12: only the extractor is trusted; the generator is
not, because everything it emits is checked by the kernel, the gate, and the diff.)

Inputs (committed, read-only):
- `experiments/entity-store-extract/inventory.json` — the real 21-variant inventory.
- `experiments/entity-store-extract/sample-mini-inventory.json` — the deliberately
  small one; primary development target.
- `experiments/entity-store-extract/INVENTORY-SCHEMA.md` — the schema both obey
  (schemaVersion 1).

## Deliverables

1. `src/generate.ts` (TypeScript on bun, zero new dependencies, no network): reads an
   inventory path argument, validates it against schemaVersion 1, and emits the
   `generated/` Lake project. Emission is byte-deterministic: inventory order preserved,
   LF endings, trailing newline, no timestamps, no host paths. Line 1 of every emitted
   `.lean` file is the Aeneas-style banner naming the generator and carrying the
   inventory's provenance pins verbatim.
2. `generated/` — a self-contained Lake project, COMMITTED (the ratified committed-text
   architecture: no elaboration-time IO anywhere): `lean-toolchain` pinned
   `leanprover/lean4:v4.33.1`, no dependencies, `lake build` green. Content for v1, all
   emitted from the inventory alone:
   - an inductive enumerating the inventory's variants (one constructor per variant,
     names derived mechanically from tags);
   - `tagOf : <that type> → String` as an exhaustive match returning each `_tag`
     verbatim;
   - a decided distinctness theorem (no two constructors share a tag) and a decided
     count theorem (constructor count = inventory length).
3. `Fixtures.lean` inside the generated project but HAND-WRITTEN and marked as such (the
   one non-generated file; the generator must leave it alone): a few `example : tagOf .… = "…" := rfl`
   expectations transcribed by hand from the inventory. This is what gives tag drift a
   kernel-level failure, not merely a diff.
4. `check` script: regenerate to a temp dir, byte-compare against the committed
   `generated/` (fail on any difference — whole-directory: extra or missing files fail
   too), then `lake build` the committed project.
5. Tests (`bun test`) proving the gate, breaking it exactly the three ratified ways —
   each against COPIES in a temp dir, never against the committed inputs:
   - hand-edit generated text → `check`'s byte-compare fails;
   - drift the JSON (change a `_tag`) → regeneration differs → byte-compare fails, and
     the hand-written fixture fails the temp `lake build` (the kernel-level catch);
   - add a constructor to the JSON → regeneration differs → byte-compare fails.
   Plus a determinism test: two runs, byte-identical trees.
6. `README.md` — what it does, how to run (`bun run gen`, `bun run check`, `bun test`),
   and a NOT-CLAIMED section (no claim about the pinned Effect implementation, no
   mapping to the E2 carrier, nothing about the extractor's own trust seam). `.gitignore`
   for temp dirs. Package scripts only; `mise` wiring is the coordinator's, at merge.

Run the final `gen` against BOTH inventories; commit the `generated/` tree for the real
21-variant inventory, with the mini inventory exercised in tests.

## Law of the worktree

- Touch nothing outside `experiments/entity-store-generate/`.
- Zero new dependencies (the TOOLS.md admission covers `typescript@5.9.2` for the
  extractor; the generator should need no compiler API at all — pure JSON to text). A
  dependency you think you need is a finding, not an install.
- `lake` is on PATH via elan (`~/.elan/bin/lake`); the toolchain pin downloads on first
  build if absent.
- Never push. Declarative commit titles stating what became true of the repo.

## Report

Branch name + diff summary; `bun test` output; the `check` run's output; `lake build`
tail of the generated project; byte-determinism evidence (the two-run comparison);
findings, especially anything that smelled like a design decision.
