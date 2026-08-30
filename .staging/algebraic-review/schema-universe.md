# The schema universe — algebraic model review

Area slug: `schema-universe`. Operator-ordered algebraic model review,
2026-08-30. Reviewer role: implementer view + breaker view + clean
algebra. Read-only outside `.staging/algebraic-review/`.

**Scope.** `library/cas/Cas/Schema/`: the code carrier (`Ast.lean`),
well-formedness (`Ast.lean`, `Ingest.lean`), the denotation
(`El.lean`, `Discriminated.lean`), the self-codec
(`SelfCodec.lean`), the registries (`Declarations.lean`,
`Union.lean`), payload injectivity (`PayloadInj.lean`), the door
(`Ingest.lean`), the basis ledger (`Basis.lean`), the value-plane
codec (`Codec/`), the projection bridge (`Projection.lean`), and the
two described kinds that ride the plane (`Exchange.lean`,
`System.lean` including CANON-1). Cross-carrier comparison against
`library/effects/src/cas/CanonicalSchema.ts` and the generated
`src/cas/generated/SchemaAdmission.ts`.

**Out of scope, by instruction.** Lane E of
`.staging/operational-structure/CORE-ABSTRACTIONS-PLAN.md` is proving
CANON-1's idempotence and permutation pair now; this review reads
CANON-1 (`Cas/Schema/System.lean:89-101`) only for what it *guards*
versus what it *states*, and proposes nothing that duplicates E1/E2.
Files on `merge/cas-word` and `merge/daemon-spine` (plan §0) are noted
as pending, never reviewed.

**Register.** Every claim below carries a `file:line`. Status words
are the four the brief names: **PROVED** (kernel-checked Lean theorem,
named), **GATED** (carried by a `#guard`, a byte gate, or a
cross-runtime corpus — named), **ASSERTED** (stated in prose or a
docstring, carried by nothing), **FOLKLORE** (relied on by code but
written nowhere). No soundness word appears without the judgment
behind it.

---

## Part A — IMPLEMENTER VIEW: the algebra that exists

### A.0 The signature

**Sorts.**

| sort | carrier | file:line |
|---|---|---|
| `Ast` | 12 constructors: `null, bool, int, str, lit, arr, struct, ref, decl, union, enum, tuple` | `Cas/Schema/Ast.lean:66-161` |
| `LitVal` | `null \| bool \| int \| str` | `Ast.lean:38-43` |
| `EnumValue` | `str \| int` (deliberately *not* `LitVal`) | `Ast.lean:60-63` |
| `SafeInt` | `{i : Int // i.natAbs ≤ 9007199254740991}` | `Ast.lean:32-35` |
| `DeclarationId` | 4 rows; `DeclarationId.General` = 3 (the non-dedicated subset) | `Declarations.lean:129-140`, `:227-234` |
| `DeclPayload` | `null \| bool \| nat \| int \| str` | `Declarations.lean:56-62` |
| `UnionMode` | `anyOf \| oneOf` | `Union.lean:33-40` |
| `IngestRefusal` | 5 names | `Ingest.lean:86-107` |
| `El a` | the denotation, a `Type` | `El.lean:148-160` |
| `StoreRef t` | tag-retaining address | `El.lean:19-20` |
| `Json.Value` | the value plane's carrier (not owned here) | `Cas/Values/Json.lean` |

**Operations, by family.** (`J` = `Json.Value`.)

*Admission (F0).*
- `Ast.WF : Ast → Prop` — `Ast.lean:194-202`, with helpers `WFFields`,
  `WFParams`, `WFMembers`, `WFElement`, `WFElements`, `WFRest`
  (`:204-243`).
- `Ast.wf : Ast → Bool` — `Ingest.lean:126-165`, with six helper twins.
- `discriminatedB : List Ast → Bool`, `Discriminated : List Ast → Prop`,
  `memberTag : Ast → Option String`, `tagsOf : List Ast → List String`,
  `Ast.discriminated : Ast → Bool` — `Discriminated.lean:45-99`, `:177-179`.

*Denotation (F-El).*
- `El : Ast → Type`, `ElFields`, `ElMembers` — `El.lean:145-177`.

*Revision-1 projection (F1 in the basis ledger, `Basis.lean:30-49`).*
- `Ast.toRepresentationJson : Ast → J` — `SelfCodec.lean:200-258`,
  with `fieldsToRepresentationJson`, `paramsToRepresentationJson`,
  `membersToRepresentationJson`, `elementToRepresentationJson`,
  `elementsToRepresentationJson`, `restToRepresentationJson` (`:261-302`).
- `Ast.representationDocument : Ast → J` — `:307-310`.
- `Ast.envelope : Ast → J` — `:317-318`.
- `Ast.payload : Ast → String` — `:322-323`.
- `Ast.payloadBytes : Ast → ByteArray` — `:327-328`.

*Revision-1 decoder.*
- `Ast.ofRepresentationJson : J → Option Ast` — `SelfCodec.lean:1351-1385`,
  with `ofRepresentationProperties` (private, `:1388`),
  `ofRepresentationParams` (`:1399`), `ofRepresentationMembers` (`:1412`),
  `ofRepresentationElement` (`:1421`), `ofRepresentationElements` (`:1427`),
  `ofRepresentationRest` (`:1437`).
- `declOfRepresentation : String → J → List Ast → Option Ast` — `:1333-1343`.
- `litOfRepresentationJson` (private, `:1312`), `isIntCheck` (private, `:1297`),
  `generalDeclOf` (private, `:1320`).
- `Ast.ofRepresentationDocument : J → Option Ast` — `:1449-1452`.
- `Ast.ofEnvelope : J → Option Ast` — `:1456-1459`.

*Normal form (F3, `Basis.lean:75-105`).*
- `Ast.repNorm : Ast → Ast` — `SelfCodec.lean:952-1005`; `Ast.RepNormal : Ast → Prop` — `:1007`.
- `deNumNorm : J → J`, `reint : J → J` — `PayloadInj.lean:82-108`.
- `canonValue : J → J` — `Cas/Values/Canonicalize.lean:44-63` (value plane).
- `Json.Value.numNorm` — value plane.

*Revision-0 projection (retired, retained — `Basis.lean:143-149`).*
- `Ast.toJson : Ast → J` — `SelfCodec.lean:112-136`, helpers `:139-169`.
- `Ast.ofJson : J → Option Ast` — `:529-599`.
- `Ast.legacyEnvelope : Ast → J` — `:313-314`.
- Enum member spelling shared by both revisions: `EnumValue.toJson` /
  `ofJson` (`:60-82`), `enumMemberToJson` (`:66`), `enumMembersToJson` (`:72`),
  `enumMembersOfJson` (`:85`).

*The door (F2, `Basis.lean:51-73`).*
- `ingest : J → Except IngestRefusal Ast` — `Ingest.lean:285-289`.
- `ingestLegacy : J → Except IngestRefusal Ast` — `Ingest.lean:328-333`.
- `ingestBytes : String → Except IngestRefusal Ast` — `Ingest.lean:601-606`.
- `refusalOf : J → IngestRefusal` (private) — `Ingest.lean:271-283`;
  `unknownDeclarationHere/In/Fields/Items` (private) — `:239-267`.

*Value-plane codec.*
- `encode : (a : Ast) → El a → J` — `Codec/Core.lean:19-28`; `encodeFields` (`:30`), `encodeMembers` (`:52`).
- `decode : (a : Ast) → J → Option (El a)` — `Codec/Core.lean:67-82`; `decodeList` (`:84`), `decodeFields` (`:92`), `decodeMembers` (`:125`).

*Projection bridge to a store node.*
- `elR`, `eraseR`, `jsonR` — `Projection.lean:81-148`.
- `envelope`, `project`, `toNode`, `putNode`, `putPayload`, `putRefs` — `Projection.lean:404-438`.
- `Described α` (class) with `encode`/`decode` — `Described/Core.lean:16-32`.

**Constants.** `schemaKindTag = 0x53` (`SelfCodec.lean:34`),
`schemaRevision = 1` (`:37`), `legacySchemaRevision = 0` (`:40`),
`maxSafeNat` (`Ast.lean:32`), `tagField = "_tag"`
(`Discriminated.lean:37`), `exchangeKindTag = 0x58`
(`Exchange.lean:72`), `systemKindTag = 0x54` (`System.lean:160`),
`fileKindTag` read off the grammar (`System.lean:164-166`).

---

### A.1 The law table

Each row: the equation, its status, its evidence.

#### L1 — Admission twins (boolean gate decides the proposition)

| law | status | evidence |
|---|---|---|
| `a.wf = true ↔ a.WF` | **PROVED** | `Ast.wf_iff`, `Ingest.lean:185-203` |
| the same for the six helper families | **PROVED** | `wfMembers_iff` `:206`, `wfElement_iff` `:211`, `wfElements_iff` `:214`, `wfRest_iff` `:219`, `wfFields_iff` `:223`, `wfParams_iff` `:228` |
| `pairwiseNames fs = true ↔ Pairwise (·.1 < ·.1) fs` | **PROVED** | `Ingest.lean:168-173` |
| `distinctEnumNames ms = true ↔ Pairwise (·.1 ≠ ·.1) ms` | **PROVED** | `Ingest.lean:175-180` |
| `discriminatedB ms = true ↔ Discriminated ms` | **PROVED** | `discriminatedB_iff`, `Discriminated.lean:74-93` |
| `d.payloadWf p = true ↔ d.PayloadWF p` | **PROVED** | `Declarations.lean:184-187`, general form `:255-257` |
| `¬(Ast.union [] m).WF`, `¬(Ast.enum []).WF` | **PROVED** | `Ast.lean:250-252`, `:255-256` |
| sorted field names are `Nodup`; distinct enum names are `Nodup` | **PROVED** | `sorted_names_nodup` `Ast.lean:266-278`, `enum_names_nodup` `:260-263` |

#### L2 — Registry laws

| law | status | evidence |
|---|---|---|
| `DeclarationId.ofWire d.wire = some d` | **PROVED** | `Declarations.lean:210-212` |
| `General.ofWire g.wire = some g` | **PROVED** | `:269-270` |
| every row listed (`all_complete`), wire spellings `Nodup` | **PROVED** / **GATED** | `:202-203` proved; `Nodup` by `#guard` `:207` |
| `General.row_not_dedicated`, `General.row_surjective`, `General.row_inj` | **PROVED** | `:281-298` — *these are what make `General` exactly the non-dedicated part of the registry, so a new row that forgets its disposition fails to build* |
| `UnionMode.ofWire m.wire = some m`, `all_complete`, wire `Nodup` | **PROVED** / **GATED** | `Union.lean:66-68`, `:58-59`, `#guard :63` |
| `DeclPayload.ofJson p.toJson = some p`; `toJson_inj`; `toJson_canonical` | **PROVED** | `Declarations.lean:89-99`, `:85-86` |

#### L3 — Canonicality of the revision-1 projection (unconditional)

| law | status | evidence |
|---|---|---|
| `∀ a, a.toRepresentationJson.Canonical` — **no `WF` premise** | **PROVED** | `toRepresentationJson_canonical`, `SelfCodec.lean:798-861`, with the six family lemmas `:868-922` |
| `a.representationDocument.Canonical` | **PROVED** | `:928-932` |
| `a.envelope.Canonical` | **PROVED** | `:935-938` |
| `a.payload = Json.renderPlain a.envelope` (the canonical rendering does no reordering) | **PROVED** | `payload_renderPlain`, `:942-944` |
| `enumMembersToJson ms` canonical; `EnumValue.toJson` canonical | **PROVED** | `:364-371`, `:356-359` |

#### L4 — Revision-1 round trip and injectivity, modulo the one collapse

| law | status | evidence |
|---|---|---|
| `ofRepresentationJson a.toRepresentationJson = some a.repNorm` | **PROVED** | `SelfCodec.lean:1469-1515` + six family lemmas `:1517-1576` |
| on `RepNormal` codes, `= some a` | **PROVED** | `:1581-1583` |
| document and envelope round trips | **PROVED** | `:1586-1588`, `:1591-1596`, `:1599-1601` |
| `toRepresentationJson a = toRepresentationJson b → a.repNorm = b.repNorm` | **PROVED** | `toRepresentationJson_inj`, `:1608-1614` |
| the **iff** census: `toRep a = toRep b ↔ a.repNorm = b.repNorm`, no `WF` premise | **PROVED** | `toRepresentationJson_eq_iff_repNorm`, `Basis.lean:634-646` |
| `envelope a = envelope b → a.repNorm = b.repNorm` | **PROVED** | `envelope_inj`, `SelfCodec.lean:1624-1629` |
| **the decoder's image is `RepNormal`** | **PROVED** | `ofRepresentationJson_repNormal`, `SelfCodec.lean:1969-1971`; document `:1974`; envelope `:1984` |
| `repNorm` idempotent; `repNorm a` is `RepNormal` | **PROVED** | `Ast.repNorm_idem` `:1012-1026`, `Ast.repNorm_repNormal` `:1068` |
| `repNorm` preserves `WF`; preserves field keys, param/member length, member non-nil | **PROVED** | `:1238-1289`, `:1212-1236` |
| `toRepresentationJson (repNorm a) = toRepresentationJson a` | **PROVED** | `toRepresentationJson_repNorm`, `:1132-1210` |
| bloat census: the collapse is `.lit .null ↔ .null` and nothing else | **PROVED** | `repNorm_the_one_collapse` `Basis.lean:645-650`, `litNull_payload` `:651`, `repNorm_fixes_every_other_leaf` `:656`, `repNorm_is_a_congruence` `:676` |
| `.int` has no second spelling (needs no `WF`) | **PROVED** | `int_no_second_spelling`, `Basis.lean:713`; the level distinction against `payload_inj_needs_wf` argued at `:118-131` |

#### L5 — Revision-0 (retired) projection

| law | status | evidence |
|---|---|---|
| `a.WF → a.toJson.Canonical` | **PROVED** | `toJson_canonical`, `SelfCodec.lean:387-445` |
| `a.WF → a.legacyEnvelope.Canonical`, `renderCompact = renderPlain` on it | **PROVED** | `:495-507` |
| `Ast.ofJson a.toJson = some a` (on the nose — rev-0 keeps `.lit .null`) | **PROVED** | `ofJson_toJson`, `:605-632` |
| `toJson a = toJson b → a = b` | **PROVED** | `toJson_inj`, `:677-681` |
| enum member round trip (shared spelling) | **PROVED** | `EnumValue.ofJson_toJson` `:92-96`, `enumMembersOfJson_toJson` `:98-105` |

#### L6 — Payload injectivity (the "one code, one address" law)

| law | status | evidence |
|---|---|---|
| `deNumNorm ∘ numNorm = id` on the representation image of a `WF` code | **PROVED** | `deNumNorm_numNorm_representation`, `PayloadInj.lean:156-214` + families `:216-274` |
| the same on the envelope | **PROVED** | `:281-287` |
| the `WF` premise is **necessary** — exhibited counterexample | **PROVED** | `payload_inj_needs_wf`, `:296-310` (witness: `.decl .date (.nat 5) []` vs `.decl .date (.int 5) []`) |
| `a.WF → b.WF → a.payload = b.payload → a.repNorm = b.repNorm` | **PROVED** (unconditional since the parser slice) | `payload_inj`, `:327-332` |
| the `RepNormal` corollary, on the nose | **PROVED** | `payload_inj'`, `:336-340` |
| at the node's bytes | **PROVED** | `payloadBytes_inj`, `:343-346` |
| `Json.parse a.payload = some a.envelope.numNorm` | **PROVED** | `payload_parse`, `:351-353` |
| the **iff**: `a.payload = b.payload ↔ a.repNorm = b.repNorm` under `WF` | **PROVED** | `payload_eq_iff_repNorm`, `Basis.lean:589-596`; bytes form `:597-604` |
| `repNorm` is invisible at the address | **PROVED** | `payload_repNorm`, `Basis.lean:578-583` |

#### L7 — The door

| law | status | evidence |
|---|---|---|
| `ingest v = .ok a → a.WF` | **PROVED** | `ingest_wf`, `Ingest.lean:291-303` |
| `a.WF → ingest a.envelope = .ok a.repNorm` | **PROVED** | `ingest_envelope`, `:306-313` |
| `a.WF → a.RepNormal → ingest a.envelope = .ok a` | **PROVED** | `ingest_envelope'`, `:315-317` |
| the same three for `ingestLegacy` (on the **bare** rev-0 value) | **PROVED** | `ingestLegacy_wf` `:335-346`, `ingestLegacy_toJson` `:348-357` |
| the same for `ingestBytes` | **PROVED** | `:608-632` |
| `ingest` is constant on `canonValue`'s classes | **PROVED** | `ingest_absorbs_canonValue`, `Basis.lean:323-329` |
| `canonValue` is a no-op on the projection's image | **PROVED** | `canonValue_redundant_on_image`, `Basis.lean:316-322` |
| `canonValue` genuinely widens the door (key-swapped envelope) | **PROVED** | `canonValue_widens_door`, `Basis.lean:362-371` |
| `wf` is independent of the rest of the door core | **PROVED** | `wf_is_independent`, `Basis.lean:372-384` |
| `deNumNorm` idempotent; commutes with `canonValue`; `canonValue`/`numNorm` commute | **PROVED** | `Basis.lean:479-505`, `:534-543`, `:432-446` |
| the door's refusal **names** (`notASchema`, `illFormed`, `unknownDeclaration`) | **GATED** | `#guard`s in `Ingest.lean:366-390`, `:405-441`, `:460-500`, `:512-568`, `:634-671` |
| the refusal names `wrongRevision`, `nonEmptyReferences` | **GATED (cross-runtime corpus only)** | one row each in `library/cas/conformance/schema-verdicts.json`, executed by `library/effects/test/SchemaVerdicts.test.ts`. **No Lean `#guard` and no Lean theorem touches either name** — see B-4. |

#### L8 — The value-plane codec (`El`)

| law | status | evidence |
|---|---|---|
| exactness, **no premise at all**: `decode a v = some x → v = encode a x` | **PROVED** | `decode_exact`, `Codec/Laws/Mutual.lean:251-255`; three family projections `:256-273` |
| forward round trip under `WF`: `decode a (encode a x) = some x` | **PROVED** | `decode_encode`, `Codec/Laws/Mutual.lean:582-587`; families `:588-605` |
| `encode` injective under `WF` | **PROVED** | `encode_inj`, `Codec/Laws.lean:15-20` |
| unique JSON representative; unique canonical rendering; `decode` injective in the value | **PROVED** | `json_exact` `:27-29`, `json_exact_render` `:34-37`, `decode_inj` `:41-45` |
| the encode image is canonically spelled under `WF` | **PROVED** | `encode_canonical`, `Codec/Laws/Render.lean:63-96` |
| `renderCompact (encode a x) = renderPlain (encode a x)` under `WF` | **PROVED** | `renderCompact_encode`, `Render.lean:123-125` |
| a tagged member's encoding leads with its tag; a member sum's leads with one of the list's tags | **PROVED** | `encode_memberTag` `Codec/Core.lean:180-185`, `encodeMembers_tag` `:189-208` |
| no member of a discriminated list accepts a later member's encoding | **PROVED** | `decode_head_encodeMembers_tail`, `Codec/Laws/Mutual.lean:284` |
| a union VALUE is itself evidence that its code is discriminated | **PROVED** | `discriminatedB_of_el`, `El.lean:195-199` |
| `El` of an undiscriminated / discriminated union | **PROVED** | `El_union_undiscriminated` `:182-184`, `El_union_discriminated` `:187-189` |
| `Described`: `decode (encode x) = some x`, `decode_exact`, `encode_inj` | **PROVED** | `Described/Core.lean:34-61` |

#### L9 — The projection bridge

| law | status | evidence |
|---|---|---|
| `eraseR (elR a v) = encode a v` (the bridge cannot fork the ratified wire shape) | **PROVED** | `eraseR_elR`, `Projection.lean:220-234` |
| `canonR (elR a v) = elR a v` under `WF` | **PROVED** | `canonR_elR`, `:332-361` |
| forced-index law: markers read `0…n-1` | **PROVED** | `project_wellRefIndexed`, `:449-462` |
| the reference array is the folded tree's links, canonical order | **PROVED** | `project_refs`, `:464-477` |
| **marker/link agreement** under `WF` — the array is the code's `StoreRef` positions in the code's own field order | **PROVED** | `project_agreement`, `:486-500` |
| `putPayload` / `putRefs` / `putNode` byte pins for `Exchange`, `SystemNode` | **GATED** | `#guard`s `Exchange.lean:120-132`, `System.lean:265-283`; the exchange payload half is cross-runtime (`test/SchemaExchange.test.ts`), the system half is single-register and says so (`System.lean:233-240`) |

#### L10 — Basis / minimality (the bloat ledger)

| law | status | evidence |
|---|---|---|
| F1 generation: document / envelope / payload / payloadBytes each the next stage | **PROVED** | `Basis.lean:179-217` |
| `renderCompact` collapses to `renderPlain` on the envelope | **PROVED** | `:219-230` |
| F2 generation: `ingest`, `ingestLegacy`, `ingestBytes` as compositions | **PROVED** | `:255-303` |
| F3: emit-path normalizer set is exactly `{repNorm}`, minimal | **PROVED** | `payload_eq_iff_repNorm` `:589`, `normalizers_are_independent` `:612-624` |
| F4: carrier bloat = 1, named | **PROVED** | `toRepresentationJson_eq_iff_repNorm` `:634`, `repNorm_the_one_collapse` `:645` |
| F5: twelve boolean/`Prop` twin pairs are one capability each | **PROVED** | `twins_inventory`, `Basis.lean:727`; ledger row `:132-137` |

#### L11 — CANON-1 (read only; Lane E owns the theorems)

| law | status | evidence |
|---|---|---|
| the authored topology is spelled in canonical service order | **GATED** | `#guard`s in `tools/EmitLayers.lean:178-233`, `canonServices` `Cas/Backend/EmitLayer.lean:220` |
| canonicalization is idempotent; equal service **sets** reside at equal addresses | **ASSERTED (owed to Lane E)** | `System.lean:92-101` states the ruling; the plan names E1/E2 as the theorem pair (`CORE-ABSTRACTIONS-PLAN.md` Lane E) |
| the carrier "means the term it was given"; renormalize-on-read is a named defect | **ASSERTED** | `System.lean:96-101`, citing `Cas/Core/Canonicalize.lean:40-42` |

#### L12 — Named obligations the plane declares openly (all ASSERTED-as-owed, and honestly so)

| obligation | where named |
|---|---|
| `declEl` — a carrier table for the admitted general rows | `El.lean:37-48` |
| `generalUnionEl` — the try-order denotation for undiscriminated unions | `El.lean:78-83` |
| `enumEl` — the distinctness-guarded denotation for enums | `El.lean:104-109` |
| `tupleEl` — the trailing-optional-guarded positional denotation | `El.lean:130-138` |
| `raise` — the `Node → El a` read path, with `raise_lower` / `lower_raise` | `Projection.lean:504-525` |
| the `$link` reserved-key asymmetry (encode admits, TS read refuses) | `Projection.lean:527-535` |
| whether `.ref` becomes sugar for `.decl` at row zero | `Ast.lean:84-86`, `Declarations.lean:35-36` |
| whether the estate stores or strips Effect's `annotations` bag | `Cas/Backend/Admission.lean:53-60` |

---

## Part B — BREAKER VIEW: the attack

Nine findings. Each carries an exhibit in the format the breaker
reference asks for (`.claude/skills/implement/BREAKER.md`): the law,
the falsification equation, the witness, the class.

---

### B-1 · The revision-1 decoder has **no exactness law**, and its docstring claims one

**Class:** adequacy (`CONTRACT.md` obligation classes), plus
claim-scope.

`Ast.ofRepresentationJson`'s docstring says it decodes "exactly the
spellings `Ast.toRepresentationJson` emits, key order and all, nothing
else" (`SelfCodec.lean:1347-1349`). That sentence is a *left-inverse*
claim about the decoder's domain. What is proved is the *other*
direction only: `ofRepresentationJson (toRep a) = some a.repNorm`
(`:1469`) and `ofRep v = some a → a.RepNormal` (`:1969`). There is no
theorem of the form

```
LAW        the revision-1 decoder is exact on its domain:
           ofRepresentationJson v = some a  →  a.toRepresentationJson = v
FALSIFIER  exhibit v, a with ofRepresentationJson v = some a
           and a.toRepresentationJson ≠ v
BATTERY    none exists — this is the missing statement
```

Contrast the **value-plane** codec, which has exactly this law with no
premise at all: `decode_exact` (`Codec/Laws/Mutual.lean:251-255`,
proved *first* in that module precisely because the union's forward law
needs it). The schema plane's own codec has the discipline; the schema
plane's *self*-codec does not.

**Why it is load-bearing, not tidiness.** Compose the door with the
projection. `ingest v = .ok a` (`Ingest.lean:285`) answers a code;
`a.payload` (`SelfCodec.lean:322`) is the bytes the store will address
it at. Nothing states that those bytes are the bytes that came in. The
missing chain is

```
ingest v = .ok a   →   canonValue v = a.envelope   →   a.payload = renderPlain (canonValue v)
```

Without it, "the same code from any spelling lands at the same address"
(`Ingest.lean:23-26`) is an **ASSERTED** claim about the door, carried
by `#guard` witnesses on a handful of shapes and by the cross-runtime
corpus — not by a theorem quantified over `v`.

**Adversarial implementation (the adequacy witness).** Replace the
`Number` arm with

```lean
| .obj [("_tag", .str "Number"), ("checks", .arr [c])] =>
    if isIntCheck c then some .int else some .int
```

or, more sharply, replace the `Enum` arm with one that drops a member:
`(enumMembersOfJson ms).map (fun l => .enum (l.take 1))`. Both keep
`ofRepresentationJson (toRep a) = some a.repNorm` **false** — so that
one is caught. But an arm that *widens* the domain is not caught:

```lean
| .obj [("_tag", .str "Null"), ("checks", .arr [_])] => some .null
```

accepts `{"_tag":"Null","checks":[<anything>]}` and answers `.null`,
whose re-emission is `{"_tag":"Null","checks":[]}`. Every stated law of
the module still holds: the round trip is unaffected (it quantifies
over the encoder's image), `ofRepresentationJson_repNormal` still holds
(`.null` is `RepNormal`), `ingest_wf` still holds (`.null` is `WF`),
`ingest_envelope` still holds. The door now silently **discards a
check** and readdresses the schema. That is the wrong-implementation-
passing-the-spec shape the adequacy class exists for.

**Owed:** state and prove `ofRepresentationJson_exact` (and its five
family lemmas, its document and envelope corollaries, and the door
corollary `ingest_canonical_image`). By inspection of `:1351-1385` the
statement is *true* today — every arm is an exact literal pattern and
the two non-structural gates (`isIntCheck` at `:1297`, the `tag < 256`
guard at `:1339`) both re-emit what they matched. It is a real proof,
not a `rfl`, because of `declOfRepresentation`'s registry dispatch —
which is exactly why `declOfRepresentation_image` (`:1671`) already
exists as a private inversion lemma and would be reused.

---

### B-2 · The two doors disagree at revision 0 — Lean refuses what TypeScript admits

**Class:** conformance (`CONTRACT.md`: "the class where 'proved in
Lean, wrong in TS' lives"), plus claim-scope.

`CanonicalSchema.ts:680-691` is one `switch` over the revision byte:

```
case Revision:       return documentFromJson(envelope.value)
case LegacyRevision: return nativeDocument(legacySchema(envelope.value))
default:             return refuseBy("wrongRevision", …)
```

and it is documented as "the SINGLE revision switch behind every door
on the schema plane" (`CanonicalSchema.ts:674-679`), under the standing
requirement that the doors "must answer exactly what Lean's
`Cas.Schema.ingest` answers" (`CanonicalSchema.ts:110-115`).

Lean's `Ast.ofEnvelope` (`SelfCodec.lean:1456-1459`) accepts revision 1
and nothing else; `refusalOf` names anything else `wrongRevision`
(`Ingest.lean:280`). And `ingestLegacy` (`Ingest.lean:328-333`) does
**not** take an envelope — it takes the *bare* revision-0 tagged value
(`Ast.ofJson`), a fact its own docstring states (`Ingest.lean:320-324`).

```
LAW        the two doors name the same verdict on the same bytes
FALSIFIER  exhibit bytes v with ingest(v) refusing and the TS door admitting
WITNESS    v = {"revision":0,"value":{"_tag":"String"}}
             Lean : Cas.Schema.ingestBytes v  =  .error .wrongRevision
                    (Ast.ofEnvelope, SelfCodec.lean:1458)
             TS   : CanonicalSchema.fromEnvelope({revision:0, value:{_tag:"String"}})
                    = nativeDocument(legacySchema(...))  — admits, returns Schema.String
                    (CanonicalSchema.ts:686-687; legacySchema :785-849)
CLASS      conformance
BATTERY    none — the differential corpus is revision-1 only
           (schema-verdicts.json header, SchemaVerdicts.test.ts:1-11:
            "every row carries a revision-1 schema-node payload")
```

**The structural cause.** `Ast.legacyEnvelope` (`SelfCodec.lean:313-314`)
is an operation with **no decoder anywhere in the estate's Lean**. Its
only laws are canonicality and `renderPlain` (`:495-507`). The
docstring calls it "retained as a decoder pin"; nothing decodes it. So
the read-compatibility promise — "kept readable so already-addressed
revision-0 schema nodes can still be decoded" (`Ingest.lean:320-324`) —
is true only for a caller who strips the envelope by hand, and that
stripping step exists on the TypeScript side and not on the Lean side.

**Second, smaller divergence on the same arm.** TS's `legacySchema`
collapses a null literal at read time —
`item === null ? Schema.Null : Schema.Literal(item)`
(`CanonicalSchema.ts:816`) — while Lean's `ingestLegacy` keeps
`.lit .null` a literal and says so (`ingestLegacy_toJson`
and its docstring, `Ingest.lean:345-349`). The two answers agree *at the address* only
because `repNorm` identifies them (`litNull_payload`, `Basis.lean:651`).
Nothing states that. Exhibit: `v = {"_tag":"Literal","value":null}` →
Lean `.ok (.lit .null)`, TS `Schema.Null`.

---

### B-3 · The declaration allowlist admits three rows whose **actual persisted bytes** the Lean decoder refuses

**Class:** adequacy, conformance.

The estate's own record states the fact:

> "`toJson` emits an `annotations` bag on a `Declaration` node
> (`Schema.Date` persists `{"annotations":{"expected":"a valid
> Date"},…}`), so exact-key enforcement on the TypeScript side would
> refuse three of the four registry rows as they are actually stored."
> — `Cas/Backend/Admission.lean:53-58`

TypeScript answers by reading the generated key lists as *required*
keys, tolerating extras (`SchemaAdmission.ts:16-20`). Lean's decoder
does the opposite: the `Declaration` arm is an exact four-key pattern

```lean
| .obj [("_tag", .str "Declaration"), ("checks", .arr []),
    ("representation", .obj [("id", .str w), ("payload", p)]),
    ("typeParameters", .arr tps)] => …
```
(`SelfCodec.lean:1365-1368`).

Canonical key order puts `_tag` (`_` = 0x5F) before `annotations`
(`a` = 0x61), so the annotated spelling is
`[_tag, annotations, checks, representation, typeParameters]` — five
keys, no matching arm, `none`.

```
LAW        a row the registry ADMITS can be read back from the bytes
           the source language actually writes for it
FALSIFIER  exhibit an admitted DeclarationId row whose real persisted
           representation ingest refuses
WITNESS    the payload of Schema.Date as Effect stores it:
             canonicalJson({revision:1, value:{references:{},
               representation: SchemaRepresentation.toJson(
                 SchemaRepresentation.toRepresentation(Schema.Date.ast))}})
             Lean : ingestBytes  =  .error .notASchema
             TS   : admitDocument accepts (required-keys column)
CLASS      conformance + adequacy
BATTERY    none. Every declaration row in the differential corpus is
           the LEAN-projected spelling with no annotations bag —
           `decl-date`, `decl-url`, `decl-option-str`,
           `decl-option-nested` in conformance/schema-verdicts.json.
```

**Why this is the sharpest finding in the area.** The admission map is
the plane's CLAIMS artifact, and its verdict `ADMITTED` is pinned "by a
WITNESS: a code of the carrier whose revision-1 projection carries that
variant's `_tag` and whose envelope survives `ingest`"
(`AdmissionMap.lean:37-40`). The witness is the *estate's own
projection*, checked against the *estate's own decoder*. That is
self-comparison, and R6's printer discipline names the alternative:
"generator and extractor as each other's check, never self-comparison"
(`EFFECTS-BACKEND.md:107-109`). At exactly the three rows where the
estate has *documented* that Effect's spelling differs from its own,
the corpus contains no Effect-spelled row.

This is not a defect in the decoder — refusing an un-modelled
annotation bag is a defensible position. It is a defect in the **claim**:
`ADMITTED` reads, to any outsider, as "the door takes this variant as
Effect writes it," and it does not.

---

### B-4 · The refusal taxonomy is carried entirely by point witnesses, and they live two modules away from the door

**Class:** claim-scope. **Downgraded during review** — the obvious
adversarial witness does not fire, and saying so is part of the job.

`refusalOf` (`Ingest.lean:271-283`) is a pure diagnostic on the failure
path. Its docstring is careful — "It never decides admission; that is
`Ast.ofEnvelope`'s job alone, so there is exactly one decoder behind
the door and the refusal name cannot disagree with it"
(`Ingest.lean:266-270`) — and that half is true by construction. No
theorem relates the *name* it produces to any property of the input.

**The adversarial implementation I looked for is caught.** Swapping the
`wrongRevision` and `nonEmptyReferences` arms passes every theorem in
`Ingest.lean` (none mentions `refusalOf`) and every `#guard` in
`Ingest.lean` (none asserts either name) — but it goes red at
`Cas/Backend/Admission.lean:457-462` and `:464-468`, which run `ingest`
on a non-empty-references document and a `revision: 7` envelope and
compare the answer to the clause table's column. All five names are
witnessed there, one `#guard` per clause
(`Admission.lean:385-468`, via `refusalFor` `:372-375` and
`clauseRefusal` `:378-381`).

What is left is smaller and still worth writing down:

1. **The carrier is a point witness, never a quantified law.** The
   generated table says so itself — the clause column is "a hand column
   tied to `ingest`'s answers by `#guard`"
   (`src/cas/generated/SchemaAdmission.ts:12-13`). A statement of the
   form `refusalOf v = .wrongRevision ↔ v is an envelope whose revision
   ≠ schemaRevision` exists nowhere, in either direction.
2. **The witnesses are in a backend module, not beside the door.** A
   reader of `Ingest.lean` sees `wrongRevision` (`:92`, `:280`) and
   `nonEmptyReferences` (`:97`, `:276`) with no local carrier at all,
   while the other three names have `#guard`s in that file
   (`:366-390`, `:405-441`, `:460-500`, `:512-568`, `:634-671`). The
   door's own module under-reports its own coverage.

Repair is two lines: `#guard`s in `Ingest.lean` in the shape of the one
at `:428-433`, mirroring `Admission.lean:457-468`. Disposition D3/D4 in
Part C.

---

### B-5 · `Ast.WF`'s struct clause is justified by a **retired** revision's rationale

**Class:** claim-scope.

`Ast.WF`'s docstring:

> "every struct's fields are in STRICT sorted name order — so the only
> admissible spelling of a struct is the canonical one, and the Lean
> identity agrees with the sorted canonical-JSON identity on the
> TypeScript side by construction"
> — `Ast.lean:165-169`

That reasoning is a **revision-0** reasoning. In revision 0 a struct's
fields are the *keys* of a JSON record (`fieldsToJson`,
`SelfCodec.lean:139-142`), so sortedness of the field list and
canonicality of the JSON object are the same fact. In revision 1 a
struct's fields are an **array** of property signatures
(`SelfCodec.lean:225-229`), and the module says so itself: canonicality
holds "by construction, unconditionally … revision 1 carries a struct's
property signatures as an ARRAY, so field-name order is not a
canonicality premise (unlike revision 0, where the struct record's keys
are the field names and `WF` is needed)" (`SelfCodec.lean:693-699`).

So under revision 1 the sortedness clause is needed by **neither**
canonicality (`toRepresentationJson_canonical` takes no premise,
`:798`) **nor** the round trip (`ofRepresentationJson_toRepresentationJson`
takes no premise, `:1469`) **nor** the census
(`toRepresentationJson_eq_iff_repNorm` takes no premise,
`Basis.lean:634`).

Where it *is* load-bearing is the **value plane**: `encode_canonical`'s
struct arm destructures `⟨hsorted, hwf⟩` and uses `hsorted` to show the
encoded JSON *object* has strictly sorted keys
(`Codec/Laws/Render.lean:73-79`), which is what `renderCompact_encode`
(`:123`) and therefore `encode_inj` (`Codec/Laws.lean:15`) rest on.

**The technically.** The clause is doing real work; the docstring names
the wrong work. An outsider reading `Ast.lean:165-169` concludes
sortedness is a schema-identity requirement. It is a *value*-identity
requirement, and the schema-identity claim it makes ("agrees with the
sorted canonical-JSON identity … by construction") is now false as
written, because revision 1's canonical JSON identity does not sort
property signatures at all.

**And it has an observable consequence.** `payload_inj`'s `WF` premise
is stronger than its proof needs. `payload_inj_needs_wf`
(`PayloadInj.lean:296-310`) exhibits necessity with a **`.decl`**
witness, and `deNumNorm_decl_payload` (`:114-118`) is documented as
"THE arm where the well-formedness premise is consumed" (`:113`). The
struct-sortedness half of `WF` is never consumed by that proof. So a
client holding a code that is `WF` except for field order — which is a
code the *projection* is total on (`Ast.payload` is total,
`SelfCodec.lean:322`) — cannot cite `payload_inj` about it, although the
statement is true of it.

---

### B-6 · `envelope`/`payload` are total on `Ast`; the door is not — and the boundary is a `#guard`, not an equation

**Class:** contract.

`Ast.payload : Ast → String` (`SelfCodec.lean:322-323`) is a total
function. `ingest` (`Ingest.lean:285`) is not total on its image:
`ingest a.envelope = .ok a.repNorm` is stated only under `a.WF`
(`ingest_envelope`, `:306`). The converse — that a non-`WF` code's own
envelope is refused, and refused `illFormed` — is stated nowhere; it is
carried by one point witness per admission clause in a different
module.

```
LAW        the door's domain on the projection's image is exactly WF:
           ingest a.envelope = .ok a.repNorm  ↔  a.WF
           and  ¬a.WF → ingest a.envelope = .error .illFormed
FALSIFIER  exhibit a with ¬a.WF and ingest a.envelope ≠ .error .illFormed
STATUS     the shape is GATED at one point, not proved. The witness
           a = Ast.struct [("b", false, .str), ("a", false, .str)]
           IS exercised — `#guard clauseRefusal "propertyOrder" ==
           refusalFor (Ast.struct [("b",…),("a",…)]).toRepresentationJson`
           (Cas/Backend/Admission.lean:427-428, clause row :324-325,
           refusal `illFormed`). One code, one direction; the ↔ and the
           general refusal statement exist nowhere.
CLASS      contract (the door's stated domain)
```

The consequence is a real address hazard, and it is CANON-1's hazard
one plane over. On the TypeScript side the *lowering* path normalizes
property-signature order (`normalizeRepresentationJson`,
`CanonicalSchema.ts:77-104`, invoked with `requireCanonicalOrder = false`
from `snapshotDocument`, `:150-153`); the *door* path refuses it
(`admitDocument(encoded)` on the spelling as stored, `:139-145`). The
asymmetry is deliberate and documented (`CanonicalSchema.ts:109-116`).
Lean has **the door's half and no lowering half**: there is no `Ast`
operation that sorts a struct's fields. `Ast.repNorm` performs the
literal-null collapse and nothing else (`SelfCodec.lean:952-1005`,
census `Basis.lean:634`).

So: a Lean author who writes `cas_struct` fields out of order is caught
at elaboration (the deriving handler sorts, `Deriving/Handler.lean:63`,
`:166-179`), and a Lean caller who builds `Ast.struct` by hand is caught
by nothing until the door refuses their own bytes. The projection is
total on a carrier the door is partial on, and the boundary is not an
equation.

---

### B-7 · `schemaKindTag` is a second spelling of a byte the grammar owns — in violation of the discipline the sibling module states

**Class:** conformance (single-source-of-truth for a wire byte).

`SelfCodec.lean:34` defines `schemaKindTag : UInt8 := 0x53` with the
comment "the Lean carrier of the TypeScript `SchemaKindTag`".
`Cas/Grammar/Sorts.lean:63` defines `Ty.schema.wireTag = 0x53`. Nothing
binds them.

The estate's own statement of the rule is two files away, at the same
grain, for the same kind of byte:

> "The scheme VERSION byte a node carries is the grammar's ratified
> constant, not a second spelling of `0` — `Cas/Grammar/Sorts.lean` is a
> leaf over `Cas.Core.Node`, so citing it here costs one edge and keeps
> the byte owned in one place."
> — `System.lean:3-7`, which then does exactly that for the *file* tag:
> `def fileKindTag := Cas.Grammar.Ty.file.wireTag` with
> `#guard fileKindTag == 0x0B` (`System.lean:164-166`).

```
LAW        one wire byte, one owner
FALSIFIER  exhibit two independent spellings of one tag with no gate
WITNESS    SelfCodec.lean:34 (0x53) and Cas/Grammar/Sorts.lean:63 (0x53).
           Edit either and the other does not move; nothing goes red.
CLASS      conformance
FIX        `def schemaKindTag : UInt8 := Cas.Grammar.Ty.schema.wireTag`
           plus `#guard schemaKindTag == 0x53` — the System.lean shape,
           verbatim. Costs one import edge, which System.lean:3-7
           already argues is the right price.
```

The same question is open for `exchangeKindTag = 0x58`
(`Exchange.lean:72`) and `systemKindTag = 0x54` (`System.lean:160`),
but both are *declared* working tags with the reserved-registry ruling
explicitly deferred (`Exchange.lean:51-59`, `System.lean:140-147`), so
they are honestly stated. `0x53` is not: it **is** a registry row
(`Sorts.lean:63`, `REGISTRY.md` per `Sorts.lean:50-52`).

---

### B-8 · Three documents state a closed obligation as open — including the ratified law

**Class:** claim-scope.

`ofRepresentationJson_repNormal` is proved at `SelfCodec.lean:1969-1971`
(with `ofRepresentationDocument_repNormal` `:1974` and
`ofEnvelope_repNormal` `:1984`), and `toRepresentationJson_canonical`
/ `envelope_canonical` / `payload_renderPlain` /
`ofRepresentationJson_toRepresentationJson` are all proved in the same
file. Four documents still say otherwise:

1. `SelfCodec.lean:342-346` — "The live revision-1 representation
   (`toRepresentationJson`/`envelope`/`payload`) has **no canonicality
   theorem, no decoder, and no round trip yet** — it is held by the
   cross-runtime byte pin alone, and its laws are the named open
   obligation of this module." All four exist in the same file,
   400–1600 lines below.
2. `Cas/Schema/Schema.lean:59-63` — "what remains open is
   `Ast.ofRepresentationJson`'s image being `RepNormal` (true by
   inspection … but **not yet proved as a theorem**)."
3. `Cas/Schema/Basis.lean:151-153` — "`Ast.ofRepresentationJson`'s
   `RepNormal` image — the named open obligation of `SelfCodec`. Until
   it is proved, `RepNormal` is a hypothesis on the exactness laws
   rather than a characterization." This one *counts* it as deliberate
   multiplicity in the bloat ledger, so the ledger's arithmetic
   ("4 items, 5 operations", `Basis.lean:163`) is off by the item.
4. `library/cas/EFFECTS-BACKEND.md:75-79` (R4, **ratified law**) —
   "revision 1's Effect-native persistent representation is held by the
   independent Lean/TypeScript byte pin while its corresponding byte
   theorem remains pending." `payload_renderPlain`
   (`SelfCodec.lean:942-944`) is that byte theorem, and
   `envelope_canonical` (`:935`) is its premise.

All four understate the estate. That direction is the safe one for
trust and the wrong one for the operator's standard: a reader who wants
to know what is known has to read 2000 lines of Lean to discover the
docs are behind. Per the brief, drift from `EFFECTS-BACKEND.md` is a
defect — and item 4 is drift *of* the law, which is the same defect
with a bigger blast radius.

---

### B-9 · Operations with **no stated equation at all**

The brief asks directly. Enumerated, with the class each falls into.

| operation | file:line | what constrains it |
|---|---|---|
| `Ast.legacyEnvelope` | `SelfCodec.lean:313-314` | canonicality + `renderPlain` only (`:495-507`). **No decoder, no round trip, no consumer in Lean.** See B-2. |
| `refusalOf` and the four `unknownDeclaration*` walkers | `Ingest.lean:239-283` | no theorem in either direction; all five names carried by one `#guard` per clause in `Cas/Backend/Admission.lean:385-468`, two of them (`wrongRevision`, `nonEmptyReferences`) with no witness at all in `Ingest.lean` itself. See B-4. |
| `Ast.discriminated` | `Discriminated.lean:177-179` | **no theorem at all.** Used only as `#guard X.schemaCode.discriminated` (`Exchange.lean:82`, `System.lean:225`, `Annotation.lean:135`, `:146`, `Cas/Backend/Mcp.lean:98`, `:118`) and by the deriving handler (`Deriving/Handler.lean:377`). Nothing states `Ast.discriminated a = true → ∃ ms m, a = .union ms m ∧ discriminatedB ms`. |
| `declOfRepresentation` | `SelfCodec.lean:1333-1343` | one **private** inversion lemma (`:1671`); no public equation. Its docstring calls it "THE declaration gate … exactly the allowlist P4 requires" (`:1324-1332`), but it enforces the **id** allowlist only — payload discipline and arity are enforced later, at `Ast.wf` (corpus rows `refuse-decl-payload`, `refuse-decl-arity-short/long` all answer `illFormed`, not `unknownDeclaration`). |
| `ofRepresentationParams/Members/Element/Elements/Rest/Properties` | `SelfCodec.lean:1388-1440` | round trip + `repNorm` image; **no exactness** (B-1) |
| `enumMembersOfJson`, `EnumValue.ofJson` | `SelfCodec.lean:78-90` | round trip only; no exactness, no injectivity |
| `reint` | `PayloadInj.lean:82-84` | no standalone law; only reachable through `deNumNorm` |
| `ElFields`, `ElMembers` | `El.lean:163-176` | no equations (type-level; definitional only). `ElMembers`'s "last member carried bare" design (`:167-171`) has no law tying it to `encodeMembers`'s matching three-arm shape (`Codec/Core.lean:52-61`) — the correspondence is FOLKLORE held by elaboration. |
| `StoreRef` | `El.lean:19-20` | the tag is retained by construction; no law relates `StoreRef t`'s tag to the `Ref` the projection emits except through `project_agreement` (`Projection.lean:486`) |
| `SafeInt`'s bound ≡ Effect's `isInt` | `Ast.lean:32-35` vs `intCheck` `SelfCodec.lean:185-195` | **GATED only**, by the corpus rows `int/max-safe`, `int/above-max-safe`, `int/below-min-safe` and the note at `SchemaVerdicts.test.ts:32-39` citing `Schema.ts:8227`. The `intCheck` JSON is a hand-written literal confronted by no extractor — this is exactly ingestion note (a) of `EFFECTS-BACKEND.md:240-247`, at the schema plane. |
| `schemaRevision` / `legacySchemaRevision` | `SelfCodec.lean:37`, `:40` | `schemaRevision` is used by `ofEnvelope` (`:1458`); `legacySchemaRevision` is used only by `legacyEnvelope` (`:314`) and the TS emitter (`Cas/Backend/Admission.lean:640-642`) |

---

## Part C — THE CLEAN ALGEBRA

Decision 2 binds: **no new sorts, no new carriers.** Everything below
is a law over the twelve constructors, the existing operations, and the
existing gates. Where a proposal would need a new carrier it is moved
to the ruling questions at the end.

### C.1 The signature, as it should read

Unchanged. Twelve constructors, six auxiliary sorts, four operation
families. The carrier's redundancy is measured and equals one
(`Basis.lean:634-651`), the emit-path normalizer set is measured and
equals `{repNorm}` (`Basis.lean:589-624`), and both are theorems. The
signature is not the problem in this area.

One **naming** correction inside the existing signature (no new sort):

- `schemaKindTag` becomes `Cas.Grammar.Ty.schema.wireTag` plus a
  `#guard` — **strengthen** (B-7).

### C.2 The law list

Grouped by what the law is *about*, with a disposition per row.

#### Group 1 — Admission

| # | law | disposition |
|---|---|---|
| A1 | `a.wf = true ↔ a.WF`, and the six family twins | **keep** — `Ingest.lean:185-232` |
| A2 | `discriminatedB ms = true ↔ Discriminated ms` | **keep** — `Discriminated.lean:74` |
| A3 | the registry is closed, complete, `Nodup` on the wire, and `General` is exactly the non-dedicated part | **keep** — `Declarations.lean:202-298` |
| A4 | `¬(union []).WF`, `¬(enum []).WF` | **keep** — `Ast.lean:250-256` |
| A5 | **the struct clause's ground is `encode_canonical`, not schema canonicality** | **state-new (prose)** — rewrite `Ast.lean:165-169` to cite `Codec/Laws/Render.lean:73-79`. B-5. |
| A6 | `Ast.discriminated a = true ↔ ∃ ms m, a = .union ms m ∧ discriminatedB ms` | **state-new, prove-owed** — one `cases`; closes B-9's third row |

#### Group 2 — The revision-1 projection

| # | law | disposition |
|---|---|---|
| P1 | canonicality of representation / document / envelope, unconditional | **keep** — `SelfCodec.lean:798-938` |
| P2 | `payload = renderPlain envelope` | **keep** — `:942` |
| P3 | the F1 generation chain (four equations) | **keep** — `Basis.lean:179-217` |

#### Group 3 — The revision-1 codec (the round trip **and its inverse**)

| # | law | disposition |
|---|---|---|
| C1 | `ofRep (toRep a) = some a.repNorm`; `= some a` on `RepNormal` | **keep** — `SelfCodec.lean:1469`, `:1581` |
| C2 | the decoder's image is `RepNormal` | **keep** — `:1969` |
| C3 | census: `toRep a = toRep b ↔ a.repNorm = b.repNorm` | **keep** — `Basis.lean:634` |
| **C4** | **`ofRep v = some a → a.toRepresentationJson = v`** (+ five family lemmas, + document, + envelope) | **state-new, prove-owed** — B-1. This is the single largest hole in the area. |
| **C5** | `ingest v = .ok a → canonValue v = a.envelope` (the door's canonical image, quantified over `v`) | **state-new, prove-owed** — corollary of C4 + `ingest_absorbs_canonValue` (`Basis.lean:323`) |
| **C6** | `ingest v = .ok a → ingest a.envelope = .ok a` (the door is a retraction) | **state-new** — derivable today from `ingest_wf` + `ofEnvelope_repNormal` + `ingest_envelope'`; state it because clients assume it |
| **C7** | `¬a.WF → ingest a.envelope = .error .illFormed`, and the `↔` form of `ingest_envelope` | **state-new, prove-owed** — B-6 |
| C8 | `declOfRepresentation` enforces the **id** allowlist and nothing else | **strengthen (prose)** — `SelfCodec.lean:1324-1332`; and promote `declOfRepresentation_image` (`:1671`) from `private` to public, since C4 will need it |

#### Group 4 — Identity (the address law)

| # | law | disposition |
|---|---|---|
| I1 | `payload_inj` / `payload_inj'` / `payloadBytes_inj`, unconditional | **keep** — `PayloadInj.lean:327-346` |
| I2 | the `WF` premise is necessary, exhibited | **keep** — `payload_inj_needs_wf`, `:296` |
| I3 | the **iff** at the address, and `repNorm` invisible there | **keep** — `Basis.lean:578-604` |
| **I4** | `payload_inj` under the **weakest** premise that carries it — the `.decl` payload discipline alone, not full `WF` | **strengthen, prove-owed** — B-5. `deNumNorm_decl_payload` (`PayloadInj.lean:114`) already isolates the consuming arm; the induction would carry `DeclPayloadWF` rather than `WF`. Non-urgent, but it is what makes the necessity witness (I2) and the premise agree. |
| I5 | `payload_parse` | **keep** — `PayloadInj.lean:351` |

#### Group 5 — Revision 0, as a first-class arm rather than a fragment

| # | law | disposition |
|---|---|---|
| R1 | rev-0 canonicality, decoder, round trip, injectivity | **keep** — `SelfCodec.lean:387-681` |
| **R2** | `Ast.ofLegacyEnvelope : J → Option Ast`, with `ofLegacyEnvelope (legacyEnvelope a) = some a` under `WF` | **state-new, prove-owed** — B-2. No new sort: it is `ofEnvelope`'s shape at the other revision constant, and it gives `legacyEnvelope` the decoder its docstring already claims (`SelfCodec.lean:312`). |
| **R3** | `ingest` dispatches on the revision — revision 1 to `ofRepresentationDocument`, revision 0 to the legacy arm — matching `CanonicalSchema.fromEnvelope`'s single switch (`CanonicalSchema.ts:680-691`) | **ruling question** — see Q1. It changes the door's admitted set, which is a behaviour ruling, not a theorem. |
| **R4** | the two arms agree modulo `repNorm`: for a `WF` rev-0 value `v`, `ingestLegacy v` and the TS `legacySchema` answer codes with equal `repNorm` | **state-new, prove-owed (Lean half) + GATE-owed (corpus half)** — B-2's null-literal witness is the only case, and `litNull_payload` (`Basis.lean:650`) already proves it at the address |

#### Group 6 — The door's refusals

| # | law | disposition |
|---|---|---|
| D1 | `ingest_wf`, `ingest_envelope`, `ingest_envelope'`, and the same for the legacy and bytes arms | **keep** — `Ingest.lean:291-357`, `:608-632` |
| D2 | `canonValue` redundant on the image, irredundant on the domain, absorbed by the door | **keep** — `Basis.lean:316-371` |
| **D3** | `#guard` witnesses for `wrongRevision` and `nonEmptyReferences` in `Ingest.lean` | **state-new** (two `#guard`s) — B-4 |
| **D4** | `refusalOf v = .wrongRevision ↔ v is an envelope whose revision ≠ 1` (and the analogue for `nonEmptyReferences`) | **state-new, prove-owed** — makes the taxonomy a theorem rather than a diagnostic. Both are `rfl`-adjacent given the pattern shapes. |

#### Group 7 — The value plane (`El`)

| # | law | disposition |
|---|---|---|
| V1 | exactness with no premise; forward round trip under `WF`; `encode_inj`; `json_exact`; `decode_inj` | **keep** — `Codec/Laws/Mutual.lean:251-605`, `Codec/Laws.lean:15-45` |
| V2 | encode image canonical under `WF`; `renderCompact_encode` | **keep** — `Codec/Laws/Render.lean:63-125` |
| V3 | tag visibility and member disjointness | **keep** — `Codec/Core.lean:180-208`, `Mutual.lean:284` |
| V4 | the three `Empty` arms (`decl`, `enum`, `tuple`) and the undiscriminated union arm are **deliberate**, with every value-plane law holding vacuously | **keep** — `El.lean:22-142`, restated in the corpus restrictions (`schema-verdicts.json` `restrictions[2,3,5,6]`) |
| **V5** | `encodeMembers`'s three-arm shape mirrors `ElMembers`'s | **state-new** — currently FOLKLORE held by elaboration (B-9). One `rfl`-shaped lemma per arm. |
| V6 | `declEl`, `enumEl`, `generalUnionEl`, `tupleEl` | **prove-owed**, already named and dated — `El.lean:46-48`, `:106-109`, `:81-83`, `:132-138`. No change: these are the model of how an obligation should be written. |

#### Group 8 — The bridge to a node

| # | law | disposition |
|---|---|---|
| B1 | `eraseR_elR`, `canonR_elR`, `project_wellRefIndexed`, `project_refs`, `project_agreement` | **keep** — `Projection.lean:220-500` |
| B2 | `raise` and its two laws (`raise_lower`, `lower_raise`), then the node-level round trip | **prove-owed**, already named — `Projection.lean:504-525` |
| B3 | the `$link` asymmetry (encode admits a user field named `$link`; the TS reader refuses it) | **ruling question** — see Q3; named at `Projection.lean:527-535` |

#### Group 9 — Cross-carrier (the conformance class)

| # | law | disposition |
|---|---|---|
| X1 | the differential corpus: `Materialize.fromPayload` admits exactly where `ingest` admits, refusing by the same name; `Materialize.validator` accepts exactly where `decode` accepts | **keep** — `conformance/schema-verdicts.json`, `test/SchemaVerdicts.test.ts` |
| X2 | the byte-identity gate on the generated admission table | **keep** — `SchemaAdmission.ts:1-8`, `lake exe emitgate --check` in `check:cas` |
| **X3** | the corpus carries at least one row per admitted declaration in **Effect's own persisted spelling** (annotations bag included) | **state-new (gate)** — B-3. This is the row that turns `ADMITTED` from a self-comparison into a cross-check, and it is the row that will go red. |
| **X4** | the corpus carries revision-0 envelopes | **state-new (gate)** — B-2 |
| X5 | the recorded `knownDisagreements` pin (empty-struct excess properties, an upstream Effect defect found by this corpus) stays red until retired | **keep** — `test/SchemaVerdicts.test.ts` `knownDisagreements` |

#### Group 10 — CANON-1 (Lane E owns; listed for completeness only)

| # | law | disposition |
|---|---|---|
| K1 | idempotence of `canonServices` | **prove-owed — Lane E (E1)**, not this review |
| K2 | address stability under authored permutation, with the duplicate-key subtlety | **prove-owed — Lane E (E2)**, not this review |
| K3 | the plane-level analogue: the schema plane has a door-side refusal for field order and **no** lowering-side normalizer, where TypeScript has both | **ruling question** — see Q2 |

### C.3 Documentation corrections (no code, no proof)

| where | correction |
|---|---|
| `SelfCodec.lean:342-346` | delete the "no canonicality theorem, no decoder, no round trip" sentence; the four theorems are in the same file |
| `Schema.lean:59-63` | `ofRepresentationJson_repNormal` is proved (`SelfCodec.lean:1969`) |
| `Basis.lean:151-153` and the count at `:163` | same; the bloat ledger's deliberate-multiplicity count drops by one item |
| `EFFECTS-BACKEND.md:75-79` (R4) | `payload_renderPlain` (`SelfCodec.lean:942`) is the byte theorem R4 calls pending |
| `Ast.lean:165-169` | the sortedness clause's ground is `encode_canonical` (`Codec/Laws/Render.lean:73-79`), not revision-1 canonicality |
| `SelfCodec.lean:1324-1332` | `declOfRepresentation` gates the **id** allowlist; payload and arity are `Ast.wf`'s |
| `AdmissionMap.lean:37-40` | say that the `ADMITTED` witness is the estate's own projection, and that Effect's persisted spelling for three rows differs (`Cas/Backend/Admission.lean:53-58`) |

---

## Ruling questions (Decision 2: these need a carrier or a behaviour change, so they are questions, not proposals)

**Q1 — Does `ingest` become revision-dispatching?**
TypeScript's `fromEnvelope` reads both revisions from one switch
(`CanonicalSchema.ts:680-691`) and is documented as answering exactly
what `ingest` answers (`:110-115`). Lean's `ingest` refuses revision 0
(`SelfCodec.lean:1458`). Either the Lean door grows the legacy arm
(admitting more content — a behaviour change), or the TypeScript door
loses it (retiring read compatibility for already-addressed rev-0
nodes), or the "same answer" claim at `CanonicalSchema.ts:110-115` is
narrowed in writing to revision 1. Three answers, all defensible; one
must be picked. B-2.

**Q2 — Does the schema plane get a field-order *normalizer*, or stay
refusal-only?**
TypeScript normalizes property-signature order on the lowering path and
refuses it at the door (`CanonicalSchema.ts:77-104`, `:139-145`). Lean
has the refusal and no normalizer. CANON-1's answer for the system kind
was "canonicalize at the AUTHORING door, never here"
(`System.lean:92-101`), and the schema plane's authoring door — the
deriving handler — already sorts (`Deriving/Handler.lean:63`). The open
half is the hand-built `Ast.struct`. Adding an `Ast` sorter is *not* a
new sort, but it is a second emit-path normalizer, and
`payload_eq_iff_repNorm` (`Basis.lean:589`) makes "the emit-path
normalizer set is `{repNorm}` and cannot grow" a theorem. So this
question is: does the plane widen the normalizer set (breaking F3's
minimality claim as stated) or keep refusing? B-6.

**Q3 — The `$link` reserved-key asymmetry.**
Already named at `Projection.lean:527-535` as wanting a ruling, not a
patch: `lower` refuses `$ref` in plain data, nothing refuses a user
field literally named `$link` on the encode side, and the runtime's
`resolveMarkers` refuses it on read (`refMarkers.ts:220-224`). Repeated
here because it is a live cross-carrier inconsistency in this area, not
to re-open it.

**Q4 — Does the estate store Effect's `annotations` bag, or strip it?**
Already recorded at `Cas/Backend/Admission.lean:53-60`. B-3 is what
makes it urgent rather than tidy: until it is answered, `ADMITTED` on
three registry rows means "admitted in the estate's spelling," and the
admission map does not say so.

---

## Pending, not reviewed

Per the brief: `Cas/Lang/Worded.lean` and `Cas/Lang/WordWire.lean` on
`merge/cas-word`, and the daemon files on `merge/daemon-spine`
(`CORE-ABSTRACTIONS-PLAN.md` §0). Neither branch touches
`Cas/Schema/`, so nothing in this report is expected to move at the
merge. Lane E's CANON-1 theorem pair is in flight and is deliberately
not duplicated here.

The two dirty working-tree files
(`library/effects/src/cas/Programs.ts`,
`library/effects/test/Programs.test.ts`) are outside this area and were
not read in either form.
