# MAPPING — Effect AST variants → carrier dispositions (DRAFT for ratification)

Status: RATIFIED 2026-08-25 (G1–G8 all as recommended, KICKOFF §18; the three open
rows ruled as recommended the same day; the promoting act is this commit). Derived from
the mapping-wave rulings applied to the three scout reports
(`.staging/scouts/2026-08-25-mapping/`). This is the committed data the Stage 2
generator transcribes; changes arrive only by declared amendment.

Disposition vocabulary:
- **MAPS** — direct carrier form, no information priced.
- **MAPS+ID** — carrier form plus a minted check-id via the ratified `Check` channel
  (G1); the id enters the future R-4 allowlist as a committed row.
- **COLLAPSE-PRICED** — a recorded, deliberate loss (only where Effect's own codec
  drops the same thing — the L-prec class).
- **REJECTED-v1** — admission turns the schema away, explicitly and loudly (G2
  posture); never a silent reinterpretation.
- **AWAITS-A-4** — expressible only after the ratified-as-planned `tupleRest`/`record`
  amendment lands (G4).

## The table

| # | Variant | Disposition | Carrier form / note | Authority |
|---|---|---|---|---|
| 1 | `Any` | REJECTED-v1 | no top type exists; the mu-union approximation silently narrows conformance, which G2's posture forbids elsewhere; revisit after A-4 | ruled 2026-08-25 |
| 2 | `Arrays` (elements only) | MAPS | `.tuple` | A §4a |
| 3 | `Arrays` (rest only) | MAPS | `.array` | A §4b |
| 4 | `Arrays` (both) | AWAITS-A-4 | `tupleRest`; the flat-value workaround is proved wrong (`flat_rejected`) | G4 |
| 5 | `Arrays.isMutable` | COLLAPSE-PRICED | Effect's own codec drops and never restores it (census §4) — L-prec | A §4, B |
| 6 | `BigInt` | MAPS | `.prim .int` — bigints are integers; the former Number collision dissolves under G2 | G2 |
| 7 | `Boolean` | MAPS | `.prim .bool` | A table 4 |
| 8 | `Declaration` | REJECTED-v1 | no opaque-named node; `typeParameters` cannot ride a `Value` payload | G4 |
| 9 | `Enum` | MAPS+ID | union-of-literals + `lab/enum` check whose payload carries the `[name, value]` pairs — names preserved without changing the value plane | ruled 2026-08-25 |
| 10 | `Literal` (string/bool/bigint/integral) | MAPS | `.lit` — with the admission narrowing below | A §3 |
| 11 | `Literal` (non-integral number) | REJECTED-v1 | no float in `Value`; propagates to check payloads | G2 |
| 12 | `Never` | MAPS | `.union .anyOf .nil`; the `oneOf`-nil spelling is INADMISSIBLE (single-spelling rule below) | A table 8 |
| 13 | `Null` | MAPS | `.prim .null` | A table 9 |
| 14 | `Number` | REJECTED-v1 | loud; a float ruling is its own future amendment | G2 |
| 15 | `ObjectKeyword` | REJECTED-v1 | exact-width conformance means no faithful form; revisit after A-4's `record` | G4 rider |
| 16 | `Objects` (string keys + optionality) | MAPS | `.object`; R-10 sort is the ratified deliberate divergence (Q11 record) | A §5 |
| 17 | `Objects` (symbol keys) | REJECTED-v1 | key is `String`; re-spelling collides | A §5ii |
| 18 | `Objects` (index signatures) | AWAITS-A-4 | `record` | G4 |
| 19 | `Objects` per-property `isMutable` | MAPS+ID | `lab/mutable` on the property schema; unlike the array side, Effect KEEPS this one — dropping it would be unprecedented L-3509 | ruled 2026-08-25 |
| 20 | `String` | MAPS | `.prim .str` | A table 13 |
| 21 | `Suspend` | MAPS | `.mu`/`.var`; discriminator mandatory (D1) and in identity (G3) | G3 |
| 22 | `Symbol` | MAPS+ID | `.refine (.prim .str) (lab/keyword/Symbol)` | G1 |
| 23 | `TemplateLiteral` | MAPS+ID | `.refine (.prim .str) (pattern check: source+flags payload)`; Effect-side id if the pinned bytes carry one, else `lab/pattern` — resolve from report B's catalog at promotion; the refine spelling is the ONLY admissible one (single-spelling rule) | G1, G6 |
| 24 | `Undefined` (optional-property position) | MAPS | the `optional` flag — value-plane verified both ways | A table 17 |
| 25 | `Undefined` (standalone) | MAPS+ID | `.refine (.prim .null) (lab/keyword/Undefined)` | G1 |
| 26 | `Union` | MAPS | `.union`, ordered, `mode` semantic (first-match decode; codec-path reorders are transformations, never identity — G6) | G6 |
| 27 | `UniqueSymbol` (registered) | MAPS+ID | `.refine (.prim .str) (lab/uniqueSymbol, payload = key string)` | G1 |
| 28 | `UniqueSymbol` (local) | REJECTED-v1 | no stable cross-process identity exists to address | A table 19 |
| 29 | `Unknown` | REJECTED-v1 | same grounds as row 1 | ruled 2026-08-25 |
| 30 | `Void` | MAPS+ID | `.refine (.prim .null) (lab/keyword/Void)` | G1 |

## Admission rules riding the table

1. **`.lit` narrowing** — `.lit` accepts only `vstr`/`vbool`/`vint` payloads at
   admission; `vnull`/`varr`/`vobj`/`vaddr` literals have no source counterpart
   (report A's dual finding — an L-2787 shape if left open).
2. **Single-spelling rule** — where the carrier offers multiple byte forms for one
   source construct (`Never` via `anyOf`-nil vs `oneOf`-nil; `TemplateLiteral`'s three
   spellings), exactly one is admissible; the others are rejected at the boundary.
3. **Minted-id register (v1, first R-4 rows per G1):** `lab/keyword/Void`,
   `lab/keyword/Undefined`, `lab/keyword/Symbol`, `lab/uniqueSymbol`, `lab/enum`,
   `lab/mutable`; plus `lab/pattern` only if the pinned bytes carry no Effect-side
   pattern id (resolve from report B's catalog before the generator consumes this
   register).

## Ruling record for the formerly open rows (2026-08-25, all as recommended)

1. **`Any`/`Unknown` → REJECTED-v1.** G1 restores their address distinction, but no top
   type exists and the mu-union approximation silently narrows what conforms — the move
   G2 forbids for `Number`. Revisit after A-4 (whether `record` plus a top ruling makes
   an honest `Any` expressible).
2. **`Enum` → MAPS+ID** with `lab/enum` carrying the `[name, value]` pairs — faithful
   at zero value-plane cost.
3. **Per-property `isMutable` → MAPS+ID** with `lab/mutable` on the property's schema —
   Effect keeps this one, so pricing it away would be unprecedented loss.

## Not decided here

`FilterGroup` tree-vs-list flattening and everything else check-plane goes to the
dedicated R-4 session (G7) with report B's 75-site catalog. Mutual-recursion entry
points stay under deferred R-3 with report C's `.ref`-carries-no-index finding.
