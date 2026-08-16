# The payoff: generated schemas validate the session's values

Issue: DEV-668 (slice stage 6, parent DEV-664)

## Why now

Slice stage 4 — the reason the type lane exists. A concrete, usable
validator falls out of the authored digest with inherited
correctness. The daemon already type-checks fills server-side
(`proto/go/protod/value_check.go`); this stage derives the seat-side
twin from the same digest and makes the two agree — a differential
wall across languages — while showing one type wearing all its
concrete forms at once.

## Scope

1. Derive all three codegen targets from the stage-2 digest:
   effect-schema (live value), json-schema (draft 2020-12), Go
   source. Commit the json-schema and Go outputs as fixtures.
2. Validate the actual `build_report` value from the stage-3 journal
   with the derived effect-schema; then a mutant of that value (one
   field with the wrong shape) must refuse. Submit the same mutant to
   the daemon as a fill: it must refuse too — derived schema and
   daemon checker agree on both sides of the line.
3. Extend the existing round-trip wall to this digest:
   derive → compile → re-fold → same digest.
4. Commit the four-forms page: the same type as wire JSON, TS schema
   source, JSON Schema, and Go, side by side — generated from the
   digest, not hand-written.

## Acceptance (mechanical)

- A committed test exits nonzero unless the derived schema accepts
  the journaled stage-3 value, refuses the mutant, the daemon also
  refuses the mutant fill, and the re-folded digest equals the
  stage-2 digest.
- The three target outputs and the four-forms page are committed; the
  page's generator command sits beside it.

## Out of scope

Changing the daemon's checker — a disagreement between it and the
derived schema is a FINDING, reported and stopped on. Any additional
types. Publishing.

## Pointers

`proto/ts/src/codegen.ts` (the three folds; the hole refusal at
codegen.ts:128); `proto/ts/test/codegen.test.ts` (the round-trip wall
to extend); the stage-2 and stage-3 committed records; `SLICE.md`
seams S5/S6.
