# Effect Schema materialization — integration plan

**Status: RATIFIED by the operator 2026-08-29, in-session, with
stipulations:**

- **S1 — Metaprogramming-forward.** Take full advantage of Lean 4
  metaprogramming, macros, and `Expr` semantics for expressiveness and
  DX. Efficient modular design with a DEEP API: hide complexity and the
  risk of proof doom loops behind small public surfaces.
- **S2 — The DAG rides annotations.** The annotation surface at the
  expected API carries the DAG — addresses, related schemas, twenty
  encoded other schemas if wanted. That is the power of the
  metaprogramming position; the namespace is open by design (string
  keys, `foldlab/...`).
- **S3 — Custom schema declarations over brands.** Brands are a maybe
  (open ruling 4 stays open); the priority extension point is custom
  schema declarations (the `Declaration`/reviver/`toCode` contract).
- **S4 — THE stipulation: a schema is just another extension of the DAG
  language.** Schemas are minted from DAGs, and referenced AS schemas —
  by address — not only as concrete instances. This directs open ruling
  2 (references = content addresses; exact spelling confirmed at Slice
  C). Everything else is detail until the dev work lands.
- **S5 — One language, five seats (operator-directed 2026-08-29).**
  Naming patterns and descriptions stay aligned with estate language,
  the DSL goals, and the estate's design patterns. Every API designed
  on this codebase is judged from all five seats at once: USING the
  software, PROGRAMMING it, READING it, PROMPTING an agent with it,
  and RUNNING computations on it — all within the same language. A
  name or surface that works in one seat and jars in another is not
  done. (This is AE-8's expressibility principle and the verbal
  register's determinism law applied to API design.)
- Housekeeping ordered: the stale
  `.claude/worktrees/entity-store-parallelize-d0a1cd/` worktree is
  deleted.
- Implementation delegated to Opus 5 subagents per the standing
  coordinator order.

Evidence base: three reader passes over the pinned Effect 4 source
(`effect@4.0.0-rc.111`, commit `0dd7825e`, live in
`library/effects/node_modules/effect/src/`), the estate's schema plane
(`library/cas/Cas/Schema/`, `library/effects/src/cas/`), and the prior-art
record (`docs/entity-store/research/schema-ast-census.md`,
`.staging/scouts/2026-08-25-mapping/`, `experiments/entity-store-extract/`).
Line citations below are to the pinned source.

## The finding that shapes everything

Effect 4 ships the integration surface this lane was going to build.
`SchemaRepresentation.ts` is an **open, compiler-extensible, first-order
representation of Effect schemas** with:

- `toRepresentation` / `toJson` / `fromJson` — the persistent form
  (what our revision-1 `SelfCodec` already mirrors);
- `fromRepresentation(doc, {revivers})` — reconstruction of a **live,
  running validator** from stored content (validation-gen, native);
- `toCodeDocument` — a complete Representation → TypeScript **code
  generator** (codegen, native), with topological sorting, recursion via
  `Schema.suspend`, and import management;
- `fromJsonSchemaDocument` / `toJsonSchemaDocument` — JSON Schema
  draft-2020-12 in both directions with a semantic round-trip guarantee
  on the exact subset;
- three extension points, all annotation-borne, all reduced to
  `{id: string, payload: Json}`: opaque **Declarations**, opaque
  **Filter** checks, and per-id **revivers** — exactly the
  no-identity-in-a-function shape the estate's law already demands.

The estate has never called `fromRepresentation`, `toCodeDocument`, or
`fromJsonSchemaDocument`. The integration is therefore mostly *adoption
and confrontation*, not construction.

## Design position (the base)

**P1 — The Lean `Ast` grows toward the store-admissible subset of
`SchemaRepresentation.Representation`.** Effect has drawn the first-order
line (22 constructors, `SchemaRepresentation.ts:406-428`); the canonical
schema remains the ROOT and Effect Schema a CARRIER, never an authority
(IMPLEMENTATION-PLAN §13). The Lean side's job is unchanged in kind:
define the admissible subset, prove its discipline (WF, canonicality,
codec laws, round trip), and pin the persistent bytes. What changes is
the target: the subset is a subset *of Effect's own representation
algebra*, so the byte pin confronts Effect's `toJson` image directly.

**P2 — Store metadata rides annotations, never constructors.** String
keys only (symbol-keyed annotations are silently dropped at persistence
and codegen — `pruneAnnotations`, `SchemaRepresentation.ts:927`;
`renderAnnotations`, `toCodeDocument.ts:51`). Namespace: `foldlab/...`
slash-keys; never the reserved `~*` space. Persistence identities
(representation ids) follow the built-in convention:
`foldlab/cas/<name>`. Attachment discipline: the representation lowers
the **encoded** side (`toRepresentation.ts:113`), and `annotate` lands on
the last check when checks exist (`SchemaAST.ts:3369-3377`) — metadata
intended to persist attaches via `annotateEncoded` or before checks, and
reads via Effect's `resolve` semantics, not raw `Base.annotations`.

**P3 — Every foldlab declaration and check ships the full contract:**
`representation.id` + reviver + `toCode` + `toArbitrary` (and
`toEquivalence` where meaningful). That is what makes a foldlab construct
indistinguishable from a built-in across persistence, revival, codegen,
validation, and instance generation. Today `foldlab/cas/ref` has id +
reviver only; `toCodeDocument` and `toArbitrary` both throw on it.

**P4 — Reuse Effect's check ids verbatim.** All ~70 built-in filters
carry `{id, payload}` identities (`effect/schema/isInt`,
`effect/schema/isMinLength`, …) with revivers and `toCode` already
shipped. A Lean-emitted check that speaks those ids inherits Effect's
own revival and codegen for free. The check-id allowlist (46 check ids +
29 declaration ids, cataloged in `B-effect-identity.md`) is the admission
vocabulary; per the census verdict, an **allowlist is the only safe
admission rule** for the open annotation bag.

**P5 — Transformations never become content.** Effect erases them from
the representation by design (`getLastEncoding`, no `Link` counterpart);
the estate's law says no canonical identity lives in a function. The two
positions agree. If generated codecs ever need a transformation, it is a
named, registry-resolved link id on the TS side — a projection concern,
never store content.

**P6 — Dual conformance gates.** The estate's byte-identity gates keep
carrying identity (canonical payload bytes, addresses). On top:
*differential* gates against Effect's own machinery — our emitter vs
`toCodeDocument` (generator and reference emitter as each other's check,
never self-comparison — the R6 discipline applied to Effect itself), AST
structural equality via `TestSchema.Asserts`, and
`verifyLosslessTransformation` as the per-codec law.

## The admissible subset (proposed, for ruling)

| Representation node | Proposal | Notes |
|---|---|---|
| `Null, Boolean, Number, String` | admitted (already) | `.int` = `Number`+`isInt` check |
| `Literal` (bool/int/str) | admitted (already) | literal-null collapses to `Null` (register R13) |
| `Arrays` — full `elements` + `rest` | **grow** | tuples and array-with-rest; per-element `isOptional` |
| `Objects` — full: `isMutable` bit, `indexSignatures` | **grow** | records; do NOT collapse the four key bits (type/encoded × optional/mutable) |
| `Union` (`anyOf`/`oneOf`) | **grow** | the materializer-lane blocker; no v0 encoding tricks |
| `Enum` | **grow** | plain data, cheap |
| Checks layer: `Filter`/`FilterGroup` as data `{id, payload, aborted}` | **grow** | id allowlist per P4; `FilterGroup` nests left, identity is the tree |
| `Suspend` + `Reference` + `references` table | **grow** (recursion ruling below) | rev-1 `references` is emitted `{}` today — the table is unreachable from Lean |
| `Declaration` | admitted (already: `foldlab/cas/ref`) | contract completion per P3 |
| `Undefined, Void, Never, Unknown, Any, ObjectKeyword` | defer | TS-flavored keywords; no store meaning yet; admission is cheap when a consumer arrives |
| `BigInt` | defer | int-width semantics decision first |
| `TemplateLiteral` | defer | regex-adjacent hazards (Effect's own importer defaults `patterns:"error"`) |
| `Symbol, UniqueSymbol` | refuse | Effect's persistent codec itself rejects local symbols — no reconstructable identity |

## Slices

**Slice A — complete the declaration contract, TS side** (small; unblocks
Effect's native codegen today):
1. `toCode` + `toArbitrary` on `foldlab/cas/ref` (`Value.ts:263`).
2. Decide/fix the `representationOf` annotation-slot read
   (`CanonicalSchema.ts:139` reads `Base.annotations`; Effect resolves
   off the last check — census `:203-209`).
3. First differential gate: the four registered codes through
   `fromJson → fromRepresentation → toCodeDocument`, compared against
   `emitwire`'s output by AST equality after evaluation
   (`TestSchema.Asserts.ast.fields.equals`), plus
   `verifyLosslessTransformation` per code.

**Slice B — the revision-1 decoder and door, Lean side** (fixes a live
defect): `Ast.ofRepresentationJson` — strict decoder of the admitted
rev-1 subset — with round trip and injectivity (the named open
obligations of `SelfCodec`), then re-aim `ingest` at revision 1
(normalize → decode rev-1 → gate). Today's `ingest` decodes only the
retired rev-0 tagged spelling: it cannot ingest anything the live plane
emits. Rev-0 decode remains as the legacy/read-compatibility arm.
Also reconcile the Integer disagreement (ruling 3 below) so both
revisions project one code to one Document.

**Slice C — universe growth, one constructor per slice**, in commission
order: `Union` → `Arrays` (tuple/rest, unblocks the tree-sitter
materializer lane) → `Objects` completion (key bits + index signatures)
→ `Enum` → checks layer → `Suspend`/`Reference`/references table.
Each slice ripples through: `Ast` ctor + `WF` + codec laws + `El` +
`Described` + rev-1 mirror + `EmitAst` lowering + fixtures + pin + an
**admission-map row** (the A-1/ACC-2 discipline from the extract lane:
every inventory variant dispositioned, no bijection assumed, no field
undispositioned).

**Slice D — the materializer** (the codegen/validation-gen engine
proper): the dynamic door composing what exists —
`payload/address → decode → gate → materialize` — with two output
registers: Effect-native (`fromRepresentation` for live validators,
`toCodeDocument` for source, with the foldlab reviver/toCode registry)
and estate-native (`EmitAst`/`Ts` printer for provenance-stamped,
byte-gated committed modules). The two registers differentially test
each other (P6). "Materializer" owes a minting pass in CONTEXT.md
(MATERIALIZER-LANE.md names the debt).

**Slice E — foreign JSON Schema ingestion**: `fromJsonSchemaDocument →
toRepresentation → toJson → normalize → gate against the admitted subset
→ admit`. This is the "any well-formed JSON" door, using Effect's own
importer as the acquisition instrument (R15 loop; importer output is
evidence, the gates carry trust). `patterns: "error"` stays the default.

## Open rulings (operator)

1. **The admissible subset** — the table above.
2. **Recursion / references**: rev-1 `references` names are `$ref`
   strings; the deferred commission item says references carry their
   target schema's **address**. Proposal: reference name = the target's
   content address (or a name annotated with it), `Document.references`
   assembled from store words at materialization — DAG assembly as
   MultiDocument. This decides Slice C's last step.
3. **Integer semantics**: rev-0 decodes `Integer` as
   `Int.check(isBetween(MIN_SAFE, MAX_SAFE))` (matches Lean `SafeInt`);
   rev-1 emits bare `isInt`. One of them is the canonical meaning.
4. **Brands**: structurally identical, nominally distinct types collapse
   to one address (A-expressibility L-3509, "most consequential"). The
   named escape hatch — brand as an identity-bearing check
   (`{id: "effect/schema/brand", payload: name}`) — needs a yes/no.
5. **Variance defect D1** (grammar upgrade vs compiler-API carve-out):
   NOT blocking this lane — `SchemaRepresentation.ts` and
   `SchemaParser.ts` parse clean under the pinned grammar and the twin
   already gates them — but it blocks full R8 surface ingestion and
   should be decided before the first libfree corpus run.
   (Also: EFFECTS-BACKEND.md:247 "five of eight affected classes" is a
   misstatement of "five of eight affected modules.")

## Ruling queue — accumulated in-flight (2026-08-29, post-ratification)

Items surfaced by the landed slices, awaiting operator rulings; rulings
1-5 above stay open except where noted:

6. **Union identity — RULED 2026-08-29** (UNION-DESIGN.md, promoted):
   order is identity, both modes carried and admitted, Stage 1 landed
   to order. Stage 2 (discriminated denotation) joins
   deriving-for-inductives — LANDED.
15. **D1, the deriving handler's member spelling**: `deriving
    Described` orders a derived union's members by ascending tag
    string, not source order, so that shuffling an inductive's
    constructors does not move its address. Order stays identity to
    the CARRIER (nothing rearranges a code); the choice is the
    generator's, made once. R17's register row owes both clauses.
    Ratify or reject the sort.
16. **Parameter-free restriction on the alternatives path**: the
    structure path derives for parametric types; the
    constructor-alternative path refuses them, because the union code
    has nowhere to spell a type parameter and the emission reads
    constructor field types as closed expressions. Not a defect — a
    scoped restriction with a named refusal — but it is the obvious
    next growth request, and it wants the reference/`Suspend` slice
    (C6) more than it wants a handler change.
17. **`_tag` as the estate's discriminant name**: adopted verbatim
    from Effect's `TaggedStruct` so a derived union materializes as
    idiomatic TypeScript with no translation. It reserves the field
    name in every derived member, and it constrains member field names
    to sort at or after `_tag` (uppercase-initial JSON names are
    therefore refused on this path). Ratify the reservation.
18. **`Schema.TaggedUnion` is NOT the TypeScript mirror**: Effect's
    `TaggedUnion` constructor builds at the default `anyOf`, and a
    derived union's mode is `oneOf`, which is part of its identity. The
    hand mirror therefore spells `Schema.Union([...], { mode: "oneOf" })`.
    Confirmed live: the derived code regenerates faithfully through
    `toCodeDocument` (the literal-collapse defect of ruling 13 cannot
    fire, because no member is a bare literal).
7. **The three adopted Effect declaration rows** (`effect/schema/Date`,
   `URL`, `Option` — C-decl merge `78f38364`): ratify or reject.
   Adopted verbatim per P4 so the general constructor is inhabited; no
   estate identity minted.
8. **`Ast.ref` as sugar for `Ast.decl` row zero**: kept open by
   construction (the `DeclarationId.General` split costs nothing either
   way).
9. **Reserved annotation kind tag**: annotation nodes currently reside
   at caller-chosen tags (suite uses `0x41`); minting an
   `AnnotationKindTag` is plane identity and wants Lean and TS
   counterparts together.
10. **TS-side declaration rows**: `CanonicalSchema` does not yet admit
    Date/URL/Option-carrying schemas (Lean-root asymmetry; follow-on
    lane, not a defect).
11. **The parser dependency, named**: `cas_from_store` (DERIVING-DESIGN
    §4) requires a Lean-side strict JSON parser — none exists
    (`Values/Json.lean` is render-only). The parser slice is the SAME
    work as the standing "bytes determine the canonical value"
    obligation (ruling: injectivity of the canonical rendering), so one
    slice discharges both debts. Sequencing decision owed.
12. **Declaration registry documentation home**: the wire-identity
    table lives in `Declarations.lean`'s docstring; `REGISTRY.md` is
    scoped to kind tags. Promote or leave.
13. **Effect upstream defect, confirmed by the C1 differential gate**
    (2026-08-29): `toCodeDocument` collapses an all-bare-literal union
    to `Schema.Literals([…])` (`toCodeDocument.ts:559-566`), and
    `Literals` carries no mode slot — a `oneOf` literal union
    regenerates as source meaning `anyOf`. Effect's generated TEXT is
    therefore not a faithful regeneration path for literal `oneOf`
    unions; the stored representation and the estate's own emitter
    are. Demonstrated live by the `union-pin` fixture's `exact`
    member, loss stated where it bites; not worked around. Decide:
    report upstream, and/or exclude literal-`oneOf` from any future
    reliance on Effect's text generation.
14. **Union refusal taxonomy**: empty `types` refuses as `illFormed`,
    unknown `mode` as `notASchema` — both `#guard`-pinned. A separate
    `emptyUnion` name would be a taxonomy change, available on order.
15. **THE FLOAT CEILING** (surfaced late from the 2026-08-25
    expressibility dossier, `A-expressibility.md:73` — belongs at the
    top of any "any Effect Schema" conversation): `Value` has no float
    (`Cas/Core/Node`-plane `Core.lean:30-32`). Effect's bare `Number`
    cannot type `1.5`, `Literal(1.5)` has no term, and non-integral
    check parameters (`greaterThan(1.5)`) are unwritable. This is
    rejection, not collapse — admission must turn such schemas away
    until a float ruling exists (representation, canonical spelling of
    doubles, NaN/±0/precision — a value-plane commission question, far
    upstream of the schema plane). Bounds what "full Effect Schema
    coverage" can ever mean; decide posture explicitly.
16. **Materializer-lane blocker, half-discharged**: the tree-sitter
    materializer lane (`.staging/treesitter/MATERIALIZER-LANE.md`) was
    blocked on union AND `mu`/named references. Union landed (C1);
    recursion/references (C6, ruling 2) is the remaining half.
17. **Materialized-source compile gate**: `Materialize.source` output
    is byte-pinned but never typechecked as a module; a `tsc`
    round-trip on materialized output is the natural next gate (same
    shape as the estate-native byte gate).
18. **The estate-native second register**: P6's differential requires
    the Lean-owned `EmitAst`/`Ts` printer as `Materialize.source`'s
    counterpart; only the Effect-native register exists on the TS
    side today.
19. **THE TWO DOORS DISAGREE** (JIT-substrate survey B8,
    `.staging/schema-materialization/JIT-SUBSTRATE-SURVEY.md`,
    2026-08-29): a stored schema Lean's `ingest` refuses `illFormed`
    can still materialize into a live TS validator — the TS door runs
    no `wf` gate and its reviver allowlist is a different list from
    `DeclarationId.all`, with unknown ids thrown rather than refused
    by name. The survey's staged proposal (0-6, blockers-first) fixes
    it at stages 1-2 (the disagreement-vector conformance gate, then
    the generated `wf` gate on the TS door under R11). Sequencing of
    the six stages is the operator's; stages 3+4 are ruling 11's
    slice.

## Defect register (found in passing, not part of the plan)

- `Ingest.lean` is untracked, rev-0-only, unconsumed (fixed by Slice B).
- `representationOf` annotation-slot read (fixed by Slice A).
- Rev-0/rev-1 Integer disagreement (ruling 3).
- `Cas/Backend/Ts.lean` imports `Cas.Schema.Foreign` and never uses it.
- `.claude/worktrees/entity-store-parallelize-d0a1cd/` holds a stale
  duplicate of `Foreign.lean` era files.
- Extractor promotion EXT-6 not wired into `mise run gen`.
- `Foreign.lean` type-expression strings remain rfl-proved against
  hand-written strings, confronted by nothing on the TS side (the known
  R8 note; Slice A's differential gate begins the confrontation).
