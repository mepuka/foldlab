import Cas.Schema.Declarations
import Cas.Schema.Ast
import Cas.Schema.El
import Cas.Schema.Codec
import Cas.Schema.Described
import Cas.Schema.Foreign
import Cas.Schema.SelfCodec
import Cas.Schema.PayloadInj
import Cas.Schema.Ingest

/-!
# The schema plane — layer above the values, root of the hierarchy

The canonical schema as a universe: codes (`Ast` — the Lean twin of
the TypeScript v0 constructor set), denotation (`El` — a code is a
type), and the generic codec with its laws proved once over all codes
(forward under canonical fields, exactness unconditionally,
injectivity). `Described` attaches ordinary Lean carriers to codes by
an explicit equivalence; `Foreign.RepresentedIn` attaches the decoded
and encoded target-language types plus their codec surface. Nothing
stands above these codes; Effect Schema carries them at runtime, and
every future tree type is meant to arrive through a described code.

Named increments, in order:

- **Recursion** — named definition environments (the shape tree-sitter
  `node-types.json` and JSON Schema `$defs` actually have), with
  conformance as an inductive predicate and a fueled sound-and-complete
  checker: the admission pattern applied to schemas.
- **Deriving extension** — the opt-in `Cas.Schema.Deriving` module
  generates `Described` instances for non-recursive structures while
  leaving compiler metaprogramming outside this runtime facade.
- **Self-description** — LANDED (2026-08-28): `SelfCodec` carries the
  codes' JSON projection, the schema-node envelope, and the canonical
  payload, cross-pinned byte-for-byte against the TypeScript
  `CanonicalSchema.payloadOf` (`lake exe schemas --check` +
  `test/CanonicalSchemaPin.test.ts`). What is proved:
  `encode_canonical`/`renderCompact_encode` (`Codec/Laws/Render.lean`)
  show the encode image is canonically spelled and the canonical
  rendering performs no reordering on it, and the RETIRED revision-0
  projection carries the full discipline —
  `toJson_canonical`/`legacyEnvelope_canonical`/
  `legacyEnvelope_renderPlain`, with `ofJson_toJson`/`toJson_inj`
  making it a proved round trip. The LIVE revision-1 representation
  now carries the same discipline (Slice B): `toRepresentationJson_-
  canonical`/`representationDocument_canonical`/`envelope_canonical`
  hold UNCONDITIONALLY — revision 1 keys every object alphabetically
  by construction and carries a struct's fields as an array, so `WF`
  is not a premise — and `payload_renderPlain` is the byte
  consequence. `Ast.ofRepresentationJson` is the strict decoder, with
  `ofRepresentationJson_toRepresentationJson`/
  `toRepresentationJson_inj` the round trip and injectivity, both
  stated modulo the literal-null collapse (`Ast.repNorm`,
  `Ast.RepNormal`) — the ONE identification the revision-1 projection
  makes, which no decoder can undo (register R13). Still open, named
  precisely: injectivity of the canonical rendering itself (bytes
  determine the canonical value — the verified-parser argument), and
  `Ast.ofRepresentationJson`'s image being `RepNormal` (true by
  inspection — the decoder has no `.lit .null` arm — but not yet
  proved as a theorem).
- **Payload injectivity** — WIRED (`PayloadInj`, 2026-08-29):
  `payload_inj` — for well-formed codes, equal payload bytes give
  equal `repNorm`, with `payload_inj'` the on-the-nose `RepNormal`
  corollary. CONDITIONAL on ONE hypothesis, the value plane's named
  open obligation `Cas.Json.RenderPlainInjective`
  (`Cas.Values.JsonInj`); every step schema-side of it is proved
  unconditionally (`deNumNorm_numNorm_representation`,
  `deNumNorm_numNorm_envelope`, `envelope_numNorm_inj`). Two things
  the wiring pins: the rendering identifies `Value.nat n` with
  `Value.int n`, so the obligation can only conclude equality up to
  `Value.numNorm` and the schema plane undoes that collapse by key;
  and the `WF` premise is LOAD-BEARING there — without the registry's
  payload discipline, `Ast.decl .date (.nat 5) []` and
  `Ast.decl .date (.int 5) []` are two codes with one payload.
- **Ingestion** — LANDED (Slice B): `Ingest` is the door. `ingest`
  normalizes, decodes the revision-1 envelope, and gates on `Ast.wf`,
  with named refusals (`notASchema`/`illFormed`/`wrongRevision`/
  `nonEmptyReferences`/`unknownDeclaration`), soundness (`ingest_wf`)
  and exactness on the canonical image (`ingest_envelope`).
  `ingestLegacy` keeps the retired revision-0 spelling readable.
- **Custom declarations** — LANDED (increment C-decl, stipulation S3):
  `Declarations` is the ALLOWLIST as first-order data
  (`DeclarationId`, row zero `foldlab/cas/ref`), and `Ast.decl` is the
  general declaration code — a registry id, a first-order
  `DeclPayload`, and the type parameters, in Effect's persisted shape.
  Admission is BY CONSTRUCTION (`DeclarationId.General` is the carrier's
  index), the row's own discipline — payload shape, arity — is what
  `Ast.WF` reads off the registry, and `declOfRepresentation` is the
  single registry-driven gate every persisted `Declaration` passes
  through. Every revision-1 law extends arm-wise with its STATEMENT
  UNCHANGED, and `Ast.repNorm_decl`/`decl_wire_ne_casRef` say why: the
  general code cannot spell row zero, so it adds no second collapse.
  Named obligation, deliberately parked: the general declaration's
  DENOTATION. `El` of a `.decl` is `Empty` — the rows are admitted as
  CONTENT, and Lean has no carrier for their instances yet — so every
  value-plane law holds over the grown carrier vacuously rather than
  falsely, and the codec's own arms never fire. `Cas/Schema/El.lean`
  carries the design note: a typeclass cannot serve here (`El` consumes
  a runtime id), so the denotation wants a carrier table, as its own
  increment.
- **Union, stage 1 — carriage** — LANDED (increment C1, `UNION-DESIGN.md`,
  operator-ratified 2026-08-29): `Union` is the two modes as a registry
  table (`UnionMode`, wire spellings `anyOf`/`oneOf` verbatim), and
  `Ast.union` is the code — an ORDERED member list and the mode.
  **ORDER IS IDENTITY**: members are never sorted, never flattened,
  never deduplicated, so `union [a, b]` and `union [b, a]` are two
  codes at two addresses. `WF` asks for nonemptiness and well-formed
  members and nothing about the order (`union_nil_not_wf` states the
  empty union's refusal — that is `Never`'s job, and `Never` is not
  admitted). Every revision-1 law extends arm-wise with its STATEMENT
  UNCHANGED, and `Ast.repNorm_union` says why: the normal form rewrites
  the members positionwise and leaves mode, count, and order alone, so
  no third collapse is owed.
- **Union, stage 2 — denotation, discriminated first** — LANDED
  (`UNION-DESIGN.md`, joined with the deriving growth as ratified):
  `Discriminated` is Effect's sentinel property as first-order data
  (`discriminatedB`/`Discriminated`/`discriminatedB_iff`, the house
  wf-idiom), and `El (.union ms m)` is `ElMembers ms` — the iterated
  member sum — when the members are discriminated and `Empty` when they
  are not. That guard is what keeps every stage-1 law TRUE over the
  grown carrier rather than merely unchanged: an undiscriminated union
  still denotes nothing, so its value-plane arms stay vacuous, while a
  discriminated one gets tag dispatch (`encodeMembers`/`decodeMembers`)
  whose forward law is a THEOREM because distinct `_tag` literals make
  the members' images disjoint (`decode_head_encodeMembers_tail`).
  Discrimination is deliberately NOT part of `Ast.WF`: `WF` is the
  store's admission discipline and stage 1 already admits every union,
  the pathological ones included. `deriving Described` grows the same
  slice: a non-recursive, non-mutual, parameter-free inductive derives
  as `Ast.union […] .oneOf` of per-constructor tagged structs, with
  members ordered by tag (the ONE spelling a generator may pick — D1)
  and `<T>.schemaDiscriminated` emitted beside the instance as the
  proof that the code is discriminated. `cas_union` is the authoring
  notation. Named obligation, deliberately parked: the GENERAL union's
  denotation — the try-order dependent sum for undiscriminated members,
  owed only when a consumer demands it (`Cas/Schema/El.lean` carries
  the note). Stage 3, `oneOf` uniqueness as a checkable property,
  belongs to the validation-gen lane and owes a statement only when a
  gate consumes it.
-/
