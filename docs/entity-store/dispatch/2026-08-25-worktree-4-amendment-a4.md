# Dispatch brief — worktree 4: amendment A-4 (`tupleRest` and `record`)

Operational dispatch instrument, coordinator-issued 2026-08-25. Branch from the tip of
`main`. This is the SERIALIZATION-POINT amendment ratified under G4 (KICKOFF §18): it
may touch the E2 core modules — the one worktree allowed to — because nothing else in
`formal/` is in flight. `E2/Gates.lean` stays coordinator-only; `docs/` is untouched
(the coordinator flips MAPPING's AWAITS-A-4 rows at merge).

## Mission

Extend the carrier with the two constructors ruled in G4, end to end, leaving every
existing theorem GREEN WITH ITS STATEMENT UNCHANGED. Scout receipts for why:
report A proved the workarounds wrong at the value plane (`flat_rejected`,
`object_exact_width` in `.staging/scouts/2026-08-25-mapping/A-expressibility.md`).

Pinned design (coordinator):

- `SchemaCore.tupleRest (elems : SchemaList) (rest : SchemaCore)` — schema tag `0x3B`.
  Plain `.tuple` stays as is.
- `SchemaCore.record (cod : SchemaCore)` — schema tag `0x3C`. String-keyed only
  (symbol and template-literal domains stay REJECTED-v1 per MAPPING rows 17/23).
- `versionByte` stays `0x01` — the v1 language is still forming (R-2 deliberately
  waits on this amendment); tags are additive and old encodings decode unchanged.
- `Conforms`: `tupleRest` — the array value splits into a prefix conforming
  elementwise to `elems` and a suffix conforming-all to `rest` (define
  `ValueList.append` for the statement, or an inductive split — your latitude, but the
  flat value from report A's `flat_rejected` MUST now conform); `record` — `.vobj fs`
  where every field's value conforms to `cod`, keys unconstrained by `Conforms`
  (duplicate-freedom stays a boundary admission, per A-3's record).
- Everything componentwise: `closedB`, `guardedB` (both are structure — guard-positive
  like `tuple`/`array`), `substS`, `refsS`, `canonS` (recurse only; no sorting — order
  is semantic and `record` has no fields), `dupFreeS`.

## The method

Add the constructors to `E2/Core.lean`, then let the build errors be the todo list:
every exhaustive match in Core/Encode/Decode/Canon/Model — AND the seat-delivered
lemma families in `E2/Closure.lean` (`mem_refsS_canon` and kin match every
constructor) — gains the two cases. Extend the codec per the uniform pattern the
existing stack uses (frames, `sz`/`rt`/`szle` families, `rw [f.eq_def]` then `simp`;
the A-1 amendment and the house lessons in the worktree-1 brief are the precedent).
Extend `E2/Correspondence.lean`'s ascriptions, tag map, and `tags_distinct` to 13
variants.

## Done means

`lake build` green in `formal/entity-store` (gate included); every pre-existing
`#print axioms` report unchanged name-for-name within the allowlist; `M4a_schema` and
`M4a_value` still proved UNCONDITIONALLY over the extended carriers; two new smoke
`example`s in your own new module `E2/A4Probe.lean` (NOT Gates.lean) showing a
`tupleRest` value that the old nested spelling rejected now conforms, and a `record`
value with two differently-named keys conforms.

## Law of the worktree

Only `formal/entity-store/` files, minus `Gates.lean` and `README.md`. No new axioms
beyond `[propext, Classical.choice, Quot.sound]`, no `native_decide`, no Mathlib, no
`partial`, no new dependencies, toolchain v4.33.1. A design question the pins above
do not settle is a STOP-and-report finding. Never push; declarative commit titles.

## Report

Branch + diff summary; the full axiom-report block from the build; confirmation that
every pre-existing theorem statement is untouched (diff of statements = empty); the
two smoke examples' source; findings.
