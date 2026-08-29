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
