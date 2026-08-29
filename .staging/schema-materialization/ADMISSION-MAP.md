# Admission map — SchemaRepresentation → the canonical schema carrier

**Status: pre-grade draft, 2026-08-29. The carrier-adequacy record the
ratified PLAN.md requires (A-1/ACC-2 discipline, carried over from
`experiments/entity-store-extract/INVENTORY-SCHEMA.md`): no bijection
assumed in either direction, every variant dispositioned, every field of
an admitted variant dispositioned, model-side extras listed explicitly.
Nothing here is a ruling until the operator pins it.**

Source algebra: `SchemaRepresentation.Representation`
(`effect@4.0.0-rc.111`, `SchemaRepresentation.ts:406-428`) — 22
variants — plus the check layer (`Check = Filter | FilterGroup`,
`:436-462`) and the document layer (`Document`/`MultiDocument`/
`References`, `:470-494`). Target carrier: `Cas.Schema.Ast`
(`Cas/Schema/Ast.lean`), revision-1 projection
`Ast.toRepresentationJson` (`Cas/Schema/SelfCodec.lean`).

Refreshed 2026-08-29 (post C1/C-decl landings): rows 8 and 10 are now
ADMITTED as landed; Stage 2 (discriminated denotation) and the TS
declaration rows are in flight. The sidecar `Annotation` kind
(`65d6b137`) is a kind IN the universe, not a Representation variant,
so it carries no row here.

Dispositions: **ADMITTED** (decodes today) · **GROW(Cn)** (a named
Slice C increment) · **DEFERRED(code)** · **REJECTED(code)**.
Field dispositions: `carried` · `checked-then-dropped` ·
`reject-if-present`.

Reason codes:
- `CONSUMER-GATED` — cheap to admit, no store meaning yet; admission
  waits for a real consumer (grammar-grill ruling 5).
- `RULING-n` — blocked on open ruling n of PLAN.md.
- `PATTERN-HAZARD` — regex-adjacent semantics; Effect's own importer
  defaults `patterns:"error"` for the same reason.
- `NO-RECONSTRUCTABLE-IDENTITY` — Effect's persistent codec itself
  rejects or cannot restore it.

## Variant table

| # | Variant | Disposition | Carrier | Field dispositions |
|---|---|---|---|---|
| 1 | `Null` | ADMITTED | `Ast.null` | `annotations`: reject-if-present (until GROW(C-ann)); `checks`: reject-if-present (must be `[]`) |
| 2 | `Boolean` | ADMITTED | `Ast.bool` | as Null |
| 3 | `String` | ADMITTED | `Ast.str` | as Null |
| 4 | `Number` | ADMITTED iff `checks == [isInt]` verbatim | `Ast.int` | the `isInt` filter: checked-then-dropped (re-emitted by the projection); bare `Number` or other checks: DEFERRED(RULING-3) — the Integer-semantics ruling (SafeInt bounds vs bare isInt) decides the canonical meaning first |
| 5 | `Literal` | ADMITTED (bool/int/str) | `Ast.lit` | `literal.type ∈ {boolean,number,string}`: carried; `bigint`: DEFERRED with BigInt; literal-null arrives only as the `Null` keyword (the projection collapses it — register R13); `checks`: reject-if-present |
| 6 | `Arrays` | **ADMITTED** (C2 landed 2026-08-29, `b58a277b`) | `Ast.arr` (unchanged) + `Ast.tuple` (additive — growing `.arr` was an arity change) | `elements[].type`: carried; `elements[].isOptional`: carried; `elements[].annotations`: reject-if-present (C-ann); `rest`: length 0/1 carried as `Option Ast`, ≥ 2 refused STRUCTURALLY (deferred semantics now unspellable); the empty tuple `{elements:[],rest:[]}` unspellable by construction — it would be a second spelling of `Ast.arr` and break `toRepresentationJson_inj`; `Arrays.isMutable` note unchanged; denotation `Empty`, named obligation `tupleEl` (the product alone is NOT the denotation — an absent optional SHORTENS the array, so positional encoding needs the trailing-optional guard) |
| 7 | `Objects` | props-only, string names: ADMITTED as `Ast.struct` · full shape: **GROW(C3)** | `Ast.struct` | `propertySignatures[].name`: carried, `type:"string"` only — number/symbol names REJECTED(NO-RECONSTRUCTABLE-IDENTITY for local symbols; number names CONSUMER-GATED); `isOptional`: carried; `isMutable`: GROW(C3, the key-bits increment — currently emitted `false`, decode must reject `true` until then); per-property `annotations`: reject-if-present until GROW(C-ann); `indexSignatures`: GROW(C3) → the record form; until then reject-if-present (must be `[]`) |
| 8 | `Union` | **ADMITTED** (C1 Stage 1 landed 2026-08-29, commits `7a0f0d5f`/`387fe9f5`/`b23c6c7e`) | `Ast.union` | `types`: carried, ORDER IS IDENTITY (ruled), no flattening, no dedup, empty refused at WF; `mode`: both carried as `UnionMode`, always spelled; denotation `Empty` pending Stage 2 (discriminated-first, in flight) |
| 9 | `Enum` | **ADMITTED** (C4 landed 2026-08-29, `0bc64143`) | `Ast.enum` over `EnumValue` | `enums` pairs carried (string and safe-int member values); ORDER IS IDENTITY (`Object.keys` order = source order, and the wire is positional); names pairwise distinct at WF, values deliberately free (TS aliases carried); `checks`: reject-if-present; denotation `Empty`, named obligation `enumEl` (aliasing gives the general-union pathology — the index is a function of order, not value) |
| 10 | `Declaration` | **ADMITTED** — `foldlab/cas/ref` as `Ast.ref`; general form as `Ast.decl` over the `DeclarationId.General` registry (C-decl landed 2026-08-29, merge `78f38364`; rows Date/URL/Option pending ratification, ruling 7) | `Ast.ref` + `Ast.decl` | `representation.id`: carried, registry-gated (`DeclarationId`, exhaustive — an unadmitted id refuses `unknownDeclaration`); `representation.payload`: carried, per-row `payloadWf` gate (`DeclPayload`, scalar-only canonical); `typeParameters`: carried recursively (Option exercises arity 1); `checks`: reject-if-present until C5; `annotations`: reject-if-present until C-ann; denotation `Empty` with named obligation `declEl` (carrier table, not typeclass) |
| 11 | `Suspend` | **GROW(C6)** with References | — | `thunk`: carried only when it is a `Reference` (Effect's own revival shape); direct structural recursion: reject — recursion lives in the references table |
| 12 | `Reference` | **GROW(C6)** | store-addressed reference per stipulation S4 | `$ref`: carried; the name IS (or is annotated with) the target schema node's content address — RULING-2's direction under S4; carries no annotations/checks by construction |
| 13 | `Undefined` | DEFERRED(CONSUMER-GATED) | — | — |
| 14 | `Void` | DEFERRED(CONSUMER-GATED) | — | — |
| 15 | `Never` | DEFERRED(CONSUMER-GATED) | — | — |
| 16 | `Unknown` | DEFERRED(CONSUMER-GATED) | — | — |
| 17 | `Any` | DEFERRED(CONSUMER-GATED) | — | — |
| 18 | `ObjectKeyword` | DEFERRED(CONSUMER-GATED) | — | — |
| 19 | `BigInt` | DEFERRED(RULING: int-width semantics) | — | — |
| 20 | `Symbol` | REJECTED(NO-RECONSTRUCTABLE-IDENTITY) | — | — |
| 21 | `UniqueSymbol` | REJECTED(NO-RECONSTRUCTABLE-IDENTITY) — Effect's persistent codec rejects local symbols (`SchemaRepresentation.ts:351-354`) | — | — |
| 22 | `TemplateLiteral` | DEFERRED(PATTERN-HAZARD) | — | — |

## The check layer (GROW(C5))

| Shape | Disposition | Field dispositions |
|---|---|---|
| `Filter` | GROW(C5) as first-order data | `representation.id`: carried, allowlist-gated (the 46-id catalog in B-effect-identity + `foldlab/...` ids); `representation.payload`: carried, decoded per-id; `aborted`: carried; `annotations`: JSON-valued entries carried (they persist through Effect's own codec), function-valued impossible by construction |
| `FilterGroup` | GROW(C5) | `checks`: carried as a tree, NOT flattened — `a.and(b).and(c)` nests left and the nesting is the identity (B-effect-identity hard call 5); `representation`: optional, carried when present |

Until C5 lands, the only check that decodes is the verbatim `isInt`
filter inside `Number` (variant 4).

## The document layer

| Shape | Disposition | Field dispositions |
|---|---|---|
| `Document` | ADMITTED | `representation`: carried; `references`: must be `{}` until GROW(C6) — reject-if-present otherwise |
| `MultiDocument` | GROW(C6) — DAG assembly per S4 | shared `references` assembled from store words at materialization |
| envelope | ADMITTED | `revision`: must be `1` (rev-0 is the legacy read arm); `value`: carried |

## Model-side extras (carrier → representation direction)

Listed explicitly per A-1 — constructs of the Lean carrier with no
one-to-one representation variant:

- `Ast.int` — sugar: projects as `Number` + the verbatim `isInt` check.
- `Ast.ref` — projects as `Declaration{foldlab/cas/ref}`.
- `Ast.lit .null` — collapses to the `Null` keyword on projection
  (register R13's branch, preserved).
- The revision-0 tagged projection (`Ast.toJson`) — a model-side legacy
  spelling with no representation counterpart; read-compatibility only.

## What this map does NOT claim

Shape only, not semantics (the inventory's own non-claim). The four
escape hatches (`Declaration.run`, the open annotation bag, encoding
transformations, filter closures) stay outside first-order content;
transformations in particular are erased by Effect's own lowering and
stay erased here (PLAN P5). A decoder built from this map MUST refuse
anything the map does not disposition — never synthesize coverage.
