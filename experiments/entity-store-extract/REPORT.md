# Extractor lane report — Stage 1 standing

Status: staged, pre-grade — 2026-08-25. Definition-of-done items 1–6 of the extractor
brief, in order. Everything below is regenerable; nothing outside `experiments/entity-store-extract/`
was touched.

## 1. Admission rows — DRAFTS for the operator to land (C4: not applied to TOOLS.md)

Two rows, because two instruments are in play and the operator should rule which enters
gated work (they are not exclusive — the second can serve until the first is stood up,
then become the cross-check):

| Tool | Role | Trust statement |
|---|---|---|
| lean4-tree-sitter (`predictable-machines/lean4-tree-sitter`, revision-pinned; C seam: the tree-sitter runtime + the `tree-sitter-typescript` grammar shared library, each version-and-digest-pinned) | Syntax-level walk over pinned TypeScript sources for inventory extraction and cross-checks | Trusted only that the named grammar's parse of the pinned bytes yields the CSTs the walk reads; the C FFI boundary (runtime `.dylib`/`.so` + grammar `.so`, digests recorded per host) is the entire trusted seam. Contributes shape facts only; no semantic claims. Output enters gated work solely as `inventory.json`, which the four-way enumeration agreement must pass. |
| TypeScript compiler API (`typescript@5.9.2` exactly, npm; classic JS API, not the 7.x native port) | Interim extractor instrument: syntax-only parse (`createSourceFile`, no checker) of the pinned sources | Trusted only that its parser maps the pinned bytes to a faithful syntax tree; no type resolution is used, so no inference is trusted. Same output gate as above. Version drift is a re-admission event. |

Note for the ruling: the census keying (§7 items 1–4) is expressed in compiler-API node
kinds, and the implemented extractor uses instrument 2. The brief's named-C-seam
requirement applies to instrument 1 when it is stood up; running both and asserting
byte-identical inventories would make the two extractors each other's check — the
cheapest possible hardening of the one trusted component.

## 2. The generator contract — published

`INVENTORY-SCHEMA.md` (schemaVersion 1, extensions documented and justified) +
`sample-mini-inventory.json` (3 variants, hand-checkable, identical shape). Stage 2 can
build against the sample today.

## 3. inventory.json — complete and deterministic

All 21 variants; base fields from `abstract class Base` (SchemaAST.ts:636); every
closure-bearing field marked with its provenance (`kindBy`); TemplateLiteral's three
constructor-derived caches marked `derived-cache`; ctor params with arity/defaults;
union source order preserved through `unionIndex`. Determinism: two runs byte-identical
(tested), LF-only, no timestamps, no host paths (tested), committed copy = fresh run
(the drift-gate shape, tested).

## 4. Cross-checks — implemented, green at the pin

21 (union alias) / 21 (makeGuard tags) / 21 (Base-extending classes) agree; 22
(Representation type union) = 21 + Reference; 22 (RepresentationUnion runtime array) =
the type union. The 23-tag count trap is its own test (Filter + FilterGroup carry
`_tag`s and are asserted NOT to be variants). A synthetic-drift test asserts the
cross-check fails loudly on a wrong enumeration; a tamper test asserts extraction
refuses modified bytes before parsing.

## 5. EXT / ACC / FIX specs — drafted

`SPECS.md`: EXT-1…6 (implemented), ACC-1…4 (the admission-map contract, incl. the A-1
no-bijection affordance and the field-disposition rule), FIX-1…4 (deterministic
fixtures, decide-wall discipline, the T-2 dumper seam).

## 6. Honest gaps (census §8 style)

1. **Instrument substitution.** The brief names lean4-tree-sitter as the syntax
   instrument; this stage ran the TypeScript compiler API instead (pinned, syntax-only,
   admission row drafted). No tree-sitter parse was performed; the two-instrument
   agreement check in §1 is proposed, not executed.
2. **`kindBy: "name-table"` facts are only as good as the tables.** `Getter` was never
   read upstream (census gap 2) — its closure-bearing status is inferred from use
   sites. If `Getter` carries identity fields, the table overstates nothing (marking a
   field closure-bearing is the conservative direction), but the census caveat carries.
3. **Generic field types are recorded uninstantiated** (`Union.types :
   ReadonlyArray<A>`). Consumers get the verbatim syntax plus the union alias; the
   instantiation `A = AST` is a reading, not an extracted fact, without the checker.
4. **`optional` is a syntactic heuristic** (`?` token or `| undefined` in the type
   text). It matches all 21 variants at this pin; it is not a type-level fact.
5. **SchemaRepresentation.ts facts (enumerations D and E) rest on an unpinned-in-lock
   file** — its blob `6282ab9c…` IS in the lock; but the seven census-load-bearing
   `internal/` files remain unpinned, and nothing in this inventory depends on them.
   The dependency direction is stated per INVENTORY-SCHEMA.md's non-claims.
6. **The lock's bytes/sha256 fields were not used and not repaired** (known CRLF
   defect, repair in a separate session): verification is git-blob-SHA-1-only,
   per the brief.
7. **No runtime enumeration was taken from the installed npm package.** The sibling
   lane measured that npm `4.0.0-rc.111` dist bytes ≠ pinned commit bytes for 4 of 5
   artifacts; a dist-derived fifth enumeration would be evidence about the published
   build, not the pin, and was deliberately left out of the inventory's agreement set.

## Instruments per fact (the brief's record-keeping rule)

| Fact family | Instrument | Provenance |
|---|---|---|
| Union alias, guard tags, classes, `_tag` literals, fields, ctor params, decl lines | typescript@5.9.2 syntax parse of pinned bytes | git blob SHA-1 verified pre-parse |
| Closure-bearing / derived-cache marks | declared name tables (echoed in `extractor.nameTables`) | name-table |
| Representation union + runtime array | typescript@5.9.2 syntax parse of pinned SchemaRepresentation.ts | git blob SHA-1 verified pre-parse |
| toRepresentation behavioral facts cited in SPECS/ACC | census (G0-pinned reading) + this session's live probes against the npm build | census receipts; probes are build-evidence only |
