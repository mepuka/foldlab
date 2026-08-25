# E2 — A content-addressed effectful entity store over the Schema AST (kickoff)

Status: staged material, pre-grade — 2026-08-25, written on the Mac coordinator at the
operator's direction to kick off the research program. "E2" is a working label, not a minted
term. This document proposes; the operator rules. It enters `docs/` or `formal/` only after
grilling (C4), and the promoting act is the commit into a graded home.

Highest satisfied gate: none for this document. The pins it stands on are listed in §9.

**Evidence base** (all local, all read in full this session):

| Source | What it supplies |
|---|---|
| `.staging/e1/unison-hashing.md` | The Unison V2 mechanism, byte-level, clone pinned @ `84b95a6` |
| `.staging/explore/unison-verification-claims.md` | Claims C1–C12b, deviations D1–D10, theorem ranking T1–T11; nobody has machine-checked any property of Unison's hashing |
| `.staging/explore/hash-db-anatomy.md` | Comparative anatomy: git, Unison, IPLD/IPFS, Nix, restic, Pijul; the carrier→encoding→address frame; five design axes; the straw store |
| `.staging/e1/experiment-spec-draft.md` | The E1 theorem spine T1–T13, vocabulary candidates, determinism decomposition, interop thesis |
| `.staging/e1/hash-spec-roadmap-draft.md` | Ratified decisions: pure kernel, allowlist axiom gate, v4.33.1 floor, dual-host gate |
| `.staging/explore/spine-design-inputs.md` | The four ratified-as-input theses, incl. the semantic-discriminator ladder D1/D2/D3 |
| `.staging/explore/language-design-case-studies.md` | AST-first lineage (McCarthy → Harper → Krishnaswami → Unison); the carrier is the official presentation |
| `docs/schema-json/CONTEXT.md`, `docs/schema-json/SOURCE-SURFACE.md` | Minted schema vocabulary; the pinned Raw Schema AST topology |
| `docs/effect-typescript-semantics/CONTEXT.md`, `CLAIM-GATES.md` | Semantic-layer vocabulary; the G0–G6 ladder |
| `docs/research/effect-runtime-ground-truth-extraction-scope.md` | The runtime scoping: what is deferred, and the "named blocks, not closures" admission move |
| `formal/fips202/` | The landed digest layer: `sha3_512_bridge`, 67 theorems, axioms within `[propext, Classical.choice, Quot.sound]` |
| `.reference/provenance/sources.lock.json` | G0 identities for the pinned Schema surface (§9) |

---

## 1. The program in one paragraph

Determine what an effective content-addressed effectful entity store looks like, by building
a Lean 4 model whose carrier is a lab-owned projection of the pinned Effect Schema AST, whose
addresses are computed by verified machinery — a framed injective encoding over the
kernel-checked SHA3-512 in `formal/fips202` — and whose canonicalization theory is proved
rather than asserted. Every claim is scoped by the G0–G6 ladder: the model claims are about
lab-owned Lean definitions; the pinned Effect source is evidence at G0; nothing anywhere
asserts a model of the Effect runtime, the TypeScript compiler, or a JavaScript host.

The object of study, in the anatomy document's frame: an entity store is the three-layer
stack — carrier, encoding, address — plus the two maps beside it, the store
(address → pre-image bytes, total on every address handed out) and the names
(name → address, mutable, beside the store, never inside it). What is new here is the
carrier: not a lambda calculus (Unison), not file bytes (git), but **descriptions and the
values they describe** — schemas at L2 of the charter's tower, and entities as
values-at-a-schema.

**R-0, the first ruling this document needs:** confirm the reading of "effectful entity
store". This kickoff reads it as three separable senses, treated in §4.6 — the store's API
surface is an Effect program (engineering, outside the model); schemas describe effectful
codecs (in scope, by name); effect descriptors themselves stored as entities (the horizon,
out of v1 scope). If the operator means something stronger by "effectful", the scope in §4
moves.

## 2. Where the program sits in the estate

**It is the charter's H2 rung made concrete.** L2 is "description in the small: Schema as
codec, refinement, effectful operator, and reified AST". P2 requires every admitted layer to
be representable, exchangeable, **canonicalizable**, and governable one layer up. E1's §5.3
observation still stands: artifact grade requires "a canonical content-addressable identity",
and the estate currently cannot compute one. This program builds that primitive, with the
substrate the charter actually bets on.

**It consolidates E1 rather than competing with it.** E1's option O1 was "own term language,
own scheme". E2 is O1 with the term language chosen: Schema Core instead of an untyped lambda
calculus. E1's theorem spine (T1–T13), its vocabulary candidates (declared equivalence,
canonical form, canonical serialization, digest function, definition identity, identity
scheme, definition store, name binding), its determinism decomposition (D1–D4), and its trust
statement carry over intact. What changes is that the declared equivalence becomes
**schema-indexed** (§4.3) — a structural answer to E1's open question Q2.

**It consumes what has landed.** `formal/fips202` enters as a Lake dependency — the digest
parameter `H` instantiated with a kernel-checked implementation. No other entity-store effort
anywhere has that brick. The framed token layer drafted in `.staging/unison-fragment/`
(`toBSF`, obligations F1/F2/F3, `v2_stream_not_injective` proved) is the encoding
discipline's starting point and is shared ground with the ratified A1/A2 artifact.
**Sequencing is unchanged by this kickoff: A1/A2 remains the next artifact unless the
operator reorders.**

**Adjacent, not merged: the spine language.** The spine program (v1 declarative JSON
combiner over git-storable directories) shares the carrier→encoding→address frame and the
discriminator theses. It is a language; E2 is a store. The store is a candidate substrate for
the spine later, and the two must not blur into one scope.

**The runtime program stays behind its own gates.** The T0–T7 extraction tiers, fibers,
scheduling, closures, and every JavaScript unknown remain in the runtime scoping document's
lanes. E2 takes exactly one instrument from that document: the admission move that replaces
functions with named members of a closed table, which is what makes descriptions
"enumerable, serializable, content-addressable" — the property E2 is built on.

## 3. What the case studies teach — seven laws for this design

Each law: the statement, where it was paid for, and how it lands in E2.

**L1 — Every end-to-end identity claim is conditional, and all the provable work is in the
encoder.** `address = digest ∘ encode`. Digest injectivity is false by counting; collision
resistance is assumed, never proved (fips202's own non-claims say so). Encoder injectivity is
provable by finite case analysis. When the encoder is not injective, the collision is free
and arithmetic, not cryptographic — Unison #3509 is a shipped instance. E2 states every
distinct-carriers-distinct-addresses claim in two directions, E1-style: Direction A
(congruence) unconditional; Direction B conditional on a named injectivity hypothesis that
appears as a theorem premise, never an axiom.

**L2 — Frame everything; unwritten discipline fails.** Unison's token serialization has no
per-token discriminator and no uniform length frames; the discipline that instances must not
overlap is unwritten and unchecked, and `v2_stream_not_injective` (proved, in the lab's own
Lean fragment) plus #3509 are the bill. Git's `"<type> <len>\0"` header and DAG-CBOR's
canonical rules are the positive exhibits. E2 adopts the framed scheme: every node opens with
a discriminator byte; every variable-length payload carries a length frame; F1 (peelable per
token) ⟹ F2 (stream injectivity) is the proof shape already stated.

**L3 — Never route carrier information around the encoder.** #3509's mechanism: the
ability-vs-data bit was stripped before hashing and re-attached after, "to keep the hashing
types simple". The rule for E2: the encoder's domain is the whole carrier — if a field is
semantic, it is in the pre-image; if it is not in the pre-image, the model must prove the
declared equivalence ignores it. No side maps.

**L4 — Canonical orders come from mandatory-distinct semantic keys, never from derived
hashes.** Unison manufactures cycle order by sorting members on their own pass-one hashes;
ties fall back to name order (#2787 — flagged in print by Helbling in 2020, filed upstream in
2022, still unfixed; the mitigation is a hard error telling users to restructure). E2's
orders are tie-free by construction: object fields sort by field name (duplicates rejected at
admission, so no ties exist); recursive-group members are identified by mandatory
discriminators (§4.2) whose distinctness is an admission check. Nothing in E2 ever sorts by a
hash.

**L5 — Names outside the hash, with exactly one deliberate carve-out, and no randomness
anywhere in identity.** All four systems keep names beside the store; Unison proves the value
of making the name map itself addressable. Unison's two documented breaches — `unique` type
GUIDs (random draw + source position + codebase lookup) and the tie-break leak — are both
identity-not-derivable-from-source failures. The spine theses already fix E2's posture: the
**semantic discriminator is the one identity-bearing string** (D1 admission decidability, D2
scoped injectivity, D3 source-derivability — the theorem Unison's design cannot state).
Renaming never moves an address; changing a discriminator mints a new thing, on purpose.

**L6 — Version and kind separators live in the pre-image; the store keeps the pre-image
bytes.** The versioning ledger (anatomy §7.1): in-address versioning (IPFS) buys agility and
costs fixed-width addresses, dedup, and an external registry; pre-image versioning
(Unison/Nix) costs one byte and guarantees a version bump moves every address. E2 takes the
pre-image position — and one better than git's type header: **for entity objects the kind
separator is the schema's own address**, so the kind vocabulary is itself content-addressed
and extensible without IPFS's registry dependency. The store stores pre-image bytes verbatim
(anatomy §7.5: re-hash-on-read is cheap exactly to the degree stored bytes are pre-image
bytes; Unison pays a full conversion pipeline for verification, and E2 declines to).
Integrity checking catches corruption, never encoder bugs — layer-(b) correctness stays a
proof obligation.

**L7 — Cycles are unconstructible between addressed units; recursion lives inside one
unit.** A cycle across units needs a hash to be a fixed point of its own output — a preimage
attack (anatomy §4.4). Git and IPLD forbid recursion; Unison makes the SCC the addressed unit
and pays L4's bill. E2 puts recursion **inside** the carrier as a binder (§4.2), so the store
graph is a DAG by construction and no cross-unit cycle machinery exists at all.

**The axis note.** Nix contributes the one axis the others lack: input-addressed versus
content-addressed. E2 v1 is content-addressed throughout. The input-addressed option is
recorded for later derived artifacts (a decode result addressed by recipe = entity address +
codec address), coexisting in one store behind the kind separator — deliberately not v1.

## 4. The Effect-specific problems — what makes this not Unison

### 4.1 The closure problem, and fail-closed admission

The pinned Raw Schema AST is not serializable as it stands. Per the source-surface
inventory: every variant carries annotations, checks, encoding links, and context;
Declaration admits opaque behavior; checks and transformations are JavaScript functions.
This is #3509's precondition generalized: carrier content the encoder cannot see.

The ruling shape (proposed): **Schema Core admits no functions.** Refinements enter as
members of a closed, serializable check vocabulary (each with canonical parameters);
transformations and declarations enter by name against a pinned registry, exactly as Unison
hashes builtins by name against its builtin table; everything else is a Deferred Feature
(term already minted in the schema-json context) and is **rejected at admission, fail
closed** — the same `Accept : Raw → Either Rejection Core` shape the runtime document
specifies for descriptors. Admission is where the entire gap between the pinned library and
the model is made visible and finite.

### 4.2 The recursion problem: Suspend becomes a binder with a mandatory discriminator

Suspend adds recursion to the pinned AST (source-surface inventory). L7 rules out
cross-unit cycles; the design question is the in-unit representation. Proposal: a de
Bruijn-indexed `mu` binder carrying a **mandatory discriminator string**, so a recursive
schema is one addressed unit closed under its own recursion. Mutual recursion, if admitted in
v1 (ruling R-3), is one unit containing the group, members identified by their
discriminators, group order discriminator-lexicographic — total and tie-free because
admission rejects duplicate discriminators (D1). This deletes the entire #2787 bug class:
where Unison manufactures order from hashes and hits ties, E2 requires the human to supply
the distinguishing token up front, which is spine thesis 2 applied to schemas.

The corresponding correspondence question for the later G3 bridge: what in the pinned
library maps to the discriminator (candidate: the identifier annotation) — recorded as
pending, not assumed.

### 4.3 The equivalence problem: schema-indexed, per-constructor, closed

E1's Q2 asked "what exactly is the declared equivalence?" and R4 warned that equivalences
creep toward undecidability. E2's structural answer: **the declared equivalence is
compositional over the schema algebra** — each constructor contributes its clause, the menu
is exactly the constructor menu, and widening it means adding a constructor, which is a new
scheme version, never an amendment. Candidate table for v1:

| Constructor | Equivalence contribution | Canonicalization | Status |
|---|---|---|---|
| primitives, literals | syntactic | none | proposed |
| object | field-name-keyed, order-irrelevant | sort fields by name; duplicate names inadmissible | proposed; pinned-source order-independence of validation UNVERIFIED — receipt needed before freeze |
| tuple, array | ordered | none | proposed |
| union | **ordered** (decode is first-match in the pinned source — UNVERIFIED; receipt needed) | none pending that receipt | open ruling R-5 |
| refine | check name + canonical parameters | parameter normal form per check | proposed |
| ref | by address | none | proposed |
| mu / var | alpha-invariant in the binder, discriminator identity-bearing | de Bruijn | proposed |
| annotations | **outside identity** (titles, descriptions, examples are names/metadata) | erased by the encoder, L3-compliant: the carrier type simply does not contain them | proposed |

Two honest notes. First, where the pinned library's observable semantics make an order
significant (unions, if first-match holds), E2's equivalence must NOT quotient it away —
being coarser than the subject's semantics is #3509's shape again, one level up. Second,
annotations are excluded by not existing in Schema Core at all, so their exclusion is
type-level, not a normalization pass to defend.

### 4.4 The two-view problem

A schema is a codec: one description, Type and Encoded views, coherence laws (charter H2).
The address identifies the **description**, links included by name (§4.1); it does not
identify either view alone. Whether the entity payload canonicalizes at the Encoded view
(proposal: yes — Encoded JSON Value is already minted vocabulary and is the serializable
side) is ruling R-6.

### 4.5 The value universe, v1

`null | bool | int | string | array | object` — no floating point until a bit-level policy
is frozen (the runtime document's lesson; Unison conformance item 4 marks float hashing a
portability hazard), no undefined, no identity, no cycles. Strings: UTF-8 byte-length
framing, no Unicode normalization, byte-wise ordering where ordering is needed — Unison's
choices, adopted here deliberately and written down (their astral-plane `Ord` trap, item 9,
is avoided by never using a language's native string order).

### 4.6 The effectful dimension, disentangled

1. **The store as an Effect program** — the implementation surface (an Effect service with
   typed failures). Engineering, never a model claim; the model's store is the E1
   join-semilattice.
2. **Schemas describing effectful codecs** — encoding links and declared transformations,
   admitted by name (§4.1). In scope as carrier structure; their runtime meaning is not
   modeled and is never claimed.
3. **Effect computations as entities** — the runtime document's descriptors are designed to
   be "enumerable, serializable, content-addressable"; storing T0/T1 descriptors as entities
   under their own schema is the L2→L3 horizon and the eventual unification with the runtime
   program. Named here so it shapes the design (nothing in v1 may preclude it); out of v1
   scope.

## 5. Initial Lean 4 representations — the sketch to grill

One Lake project (name: ruling R-1), consuming `formal/fips202`; toolchain per the standing
rules (v4.33.1 floor, no Mathlib by default, pure-kernel discipline, allowlist axiom gate,
external recheck, dual-host gate). Everything below is conception-register material for the
grilling, not frozen declarations.

```
formal/<name>/
  <Name>/Value.lean        -- the value universe
  <Name>/SchemaCore.lean   -- the carrier
  <Name>/Conforms.lean     -- the conformance judgment
  <Name>/CanonSchema.lean  -- schema canonicalization + S-theorems
  <Name>/CanonValue.lean   -- schema-directed value canonicalization + V-theorems
  <Name>/Encode.lean       -- framed injective serialization (toBSF discipline) + F-theorems
  <Name>/Address.lean      -- identity assembly over fips202 + A-theorems
  <Name>/Store.lean        -- store + names + ST-theorems
```

Carrier sketch:

```lean
-- Value.lean — the v1 value universe (§4.5)
inductive Value
  | null | bool (b : Bool) | int (n : Int) | str (s : String)
  | arr (vs : List Value)
  | obj (fields : List (String × Value))   -- well-formedness: field names distinct

-- SchemaCore.lean — the lab-owned carrier; no functions anywhere in it
inductive Prim | null | bool | int | str

inductive Check                            -- closed v1 vocabulary (ruling R-4)
  | minLength (n : Nat) | maxLength (n : Nat)
  | minInt (n : Int)    | maxInt (n : Int)
  -- extension = new constructor = new scheme version

inductive SchemaCore
  | prim    (p : Prim)
  | lit     (v : Value)                          -- literal type
  | object  (fields : List (String × SchemaCore × Bool))  -- Bool: optionality
  | tuple   (elems : List SchemaCore)
  | array   (elem : SchemaCore)
  | union   (members : List SchemaCore)          -- ordered pending R-5 receipt
  | refine  (s : SchemaCore) (c : Check)
  | ref     (a : Address)                        -- Merkle reference to a stored schema
  | var     (i : Nat)                            -- de Bruijn, bound by mu
  | mu      (discriminator : String) (body : SchemaCore)   -- §4.2
```

Identity assembly (L6):

```
schema object  pre-image:  version-byte ++ kind-tag(schema) ++ encodeS (canonS s)
entity object  pre-image:  version-byte ++ kind-tag(entity) ++ addr(s) ++ encodeV (canonV s v)
address     =  SHA3-512 (pre-image)          -- 64 bytes, untruncated; display-truncate only
```

Theorem spine — names, statement shapes, gates, and the anti-claim each carries:

| # | Statement shape | Gate | Deliberately not claimed |
|---|---|---|---|
| F1 | every token code is peelable (self-delimiting) | G1 | — |
| F2 | `encodeS`/`encodeV` streams injective (from F1, generic) | G1 | anything about SHA3 |
| WF | admission decidable: `Accept` total, rejections typed and named (D1) | G1 | coverage of the full pinned AST |
| S1 | `canonS` idempotent | G1 | — |
| S2 | `canonS` respects the §4.3 schema equivalence; converse separately (E1 T3/T4 shape) | G1 | any pinned-library semantics |
| S3 | `encodeS` injective on canonical schemas | G1 | — |
| D2 | scoped injectivity: distinct admitted definitions in one scope get distinct pre-images (discriminator rule) | G1 | — |
| D3 | source-derivability: the address is a function of the written definition alone — no randomness, no ambient state (the theorem Unison cannot state) | G1 | — |
| V1 | `Conforms` decidable on the v1 universe | G1 | — |
| V2 | `canonV s` sound and complete for the schema-declared value equivalence | G1 | — |
| V3 | `encodeV` injective on canonical values | G1 | — |
| K1 | kind separation: schema pre-images and entity pre-images are disjoint byte sets | G1 | address disjointness unconditionally (that is K1 + collision resistance, stated conditionally) |
| K2 | `version_byte_separates` (style of `sha3_ne_prefips_spec`) | G1 | — |
| A1 | Direction A: equivalent carriers, equal addresses — unconditional congruence | G1 | — |
| A2 | Direction B: `Function.Injective H →` equal addresses, equivalent carriers — hypothesis as premise, never axiom | G1 | collision resistance |
| ST1–ST4 | store monotone, idempotent, insertion-order-independent (join-semilattice); name-layer changes move no identity | G1 | crash safety, concurrency |
| NEG | the lab's own #3509 exhibit: dropping the kind tag (or a frame) admits a proved collision between distinct carriers | G1 | — (a negative result, the motivation made machine-checked) |

G2 attaches when the theorems are traced to this program's own ratified contract
(requirement ↔ theorem table, examples and counterexamples, reviewed quantifiers). A G3
bridge (pinned Raw Schema AST dumps → admission → Schema Core, with a preservation statement)
and a G4 differential lane (fixtures decoded/encoded by the pinned `effect` build, canonical
bytes compared) are later, separately-gated additions; neither blocks the G1 spine.

## 6. Claim posture

- **G0 — in place today.** The Schema surface is pinned in the source lock at commit
  `0dd7825e4da4d3a00fa9bd410a1d55f3d4874d07`, package `effect@4.0.0-rc.111`, with git blob and
  SHA-256 content digests per file (§9).
- **G1/G2 — the program's product.** Kernel-checked theorems about lab-owned definitions,
  then traceability to the ratified contract.
- **G3/G4 — later, separate, fail-closed.** Admission bridge and differential lane; sampled
  agreement stays sampled evidence and promotes nothing.
- **G5/G6 — never claimed by this program.** No compiler, no host, no runtime conformance.

Standing non-claims, restated so no summary drifts: no collision resistance, no preimage
resistance, no security property of any digest; no semantics of JavaScript, TypeScript, or
the Effect runtime; no whole-library statement about `effect`; no claim that Schema Core
covers the pinned AST (coverage is exactly the admitted subset, enumerated by `Accept`).

## 7. Open rulings — the grilling agenda

| # | Ruling needed | Blocks |
|---|---|---|
| R-0 | Confirm the §1 reading of "effectful entity store" | the whole scope |
| R-1 | Program name, context home, vocabulary minting (new content-identity context vs extending schema-json; E1's Content Digest collision note stands) | the glossary artifact, CONTEXT-MAP entry |
| R-2 | v1 admitted constructor set (the table in §5 is the proposal) | SchemaCore.lean |
| R-3 | Mutual recursion in v1, or single-`mu` only | §4.2 machinery size |
| R-4 | v1 check vocabulary (closed list) | Check inductive |
| R-5 | Union order semantic? Object-field order irrelevant? — both need pinned-source receipts before the equivalence table freezes | S2, V2 statements |
| R-6 | Entity payload canonicalizes at the Encoded view | CanonValue.lean |
| R-7 | Raw-bytes kind in v1 (restic lesson: identity-encode unstructured payloads) | kind-tag set |
| R-8 | Sequencing against A1/A2 (this kickoff assumes A1/A2 stays next) | scheduling |
| R-9 | Dogfood target (§8) | first fixture corpus |

**Ratification record (2026-08-25, operator: "agreed on all accounts", following §10–§12).**
Ratified: R-0 (the §1/§4.6 reading of "effectful entity store"); R-5 closed by census
evidence (union ordered, carrying `mode`; the field-order half moved to R-10); R-6
dissolved for v1 (no encodings admitted ⇒ views coincide); R-8 (A1/A2 remains next); R-9
(ledger corpus as first dogfood); R-10 (sort-by-name field order in identity, tie-free via
duplicate rejection); R-11 (literals: integers and bigints; non-integer doubles deferred);
R-12 (mutual-monomorphic carrier shape); the §11 mechanism changes (checks as
`{id, payload}` against a pinned allowlist; `encoding`/`encodingChecks`/
`constructorDefault` rejected in v1; annotation allowlist read at the resolve-correct
location; mandatory discriminator, stricter than Effect, recorded as deliberate); and the
§12 architecture whole — committed-text generation, Shape B correspondence gate, extractor
built on `toRepresentation`, the opaque/unsafe scan as a **standing estate gate**, the
tactic ladder, and the three build steps. Still open: R-1 (program name and context home —
enters through domain modeling), R-2 (the exact v1 constructor enumeration, frozen at
grilling), R-3 (mutual recursion in v1 or single-`mu` only), R-4 (the concrete check-id
allowlist), R-7 (raw-bytes kind). The provenance-lock repair runs in the operator's
separate session; the seven additional pins ride with or follow it.

## 8. Dogfood

The estate is the first customer. Artifact grade already requires a canonical
content-addressable identity that nothing can compute (E1 §5.3); the repo self-model
(roadmap item 2) needs identities for grades, kinds, and transformations; the paper ledger
is a hand-run content-addressed database whose registration rules (cluster roles, exact
partition, digest-pinned entries, byte-identical regeneration) read as an entity-store
requirements document — the same correspondence the spine program claims for its combinator,
approached here from the storage side. Proposed first corpus: the ledger's entry kinds as
schemas, its entries as entities.

## 9. Pins this document stands on

From `.reference/provenance/sources.lock.json` (snapshot 2026-08-24), repository
`Effect-TS/effect`, commit `0dd7825e4da4d3a00fa9bd410a1d55f3d4874d07`, root tree
`68a2b3baeed509bc291cc3788c9b2c04bf53a80f`, package `effect@4.0.0-rc.111` (MIT):

| Pinned file | Role in lock |
|---|---|
| `packages/effect/src/SchemaAST.ts` | runtime-algebraic-schema-carrier |
| `packages/effect/src/Schema.ts` | public-schema-surface |
| `packages/effect/src/SchemaParser.ts` | public-decode-and-encode-runners |
| `packages/effect/src/JsonSchema.ts` | json-schema-conversion-surface |
| `packages/effect/src/SchemaRepresentation.ts` | schema-representation-and-revival-surface |

Unison evidence: clone pinned @ `84b95a623711b57b9ff7163f124b214d626b81e4` (Pending Source —
not yet in the source lock; any G2/G3 use requires the lock entry per E1 §8). Digest layer:
`formal/fips202` on `main`. Comparative-systems receipts: first-hand git reconstructions and
cited specifications per `hash-db-anatomy.md` §9.

Two flagged UNVERIFIED items carried out of §4.3: union first-match decode order-sensitivity
and object-field order-independence in the pinned source — each needs a `file:line` receipt
against the pinned `SchemaAST.ts`/`SchemaParser.ts` before the equivalence table freezes.

---

## 10. Operator thesis — pass-2 inputs (2026-08-25)

Captured after the operator read §1–§9 and ratified the direction ("I think that makes
sense"). These are inputs the second pass must take whole, in the operator's sense if not
their words:

**Thesis: mechanical fidelity.** The behavior of the Schema APIs is fully knowable from the
git. Full fidelity — which does NOT mean representing JavaScript closures — is therefore
mechanical, and the power of Lean 4 here is that the lab's representations, wherever they
sit on the material↔abstract spectrum, can be made **completely programmatically
checkable**: not only against the git digests (G0) but **from a walk over the TypeScript
representation itself**.

Decoded into program structure:

1. **The correspondence lane is upgraded from "later, manual" to "continuous, mechanical".**
   An extractor walks the pinned TypeScript (compiler-API walk over `SchemaAST.ts` at the
   locked commit) and emits a canonical machine-readable inventory of the constructor
   surface — variant names, field names, field kinds. The Lean side carries the same
   inventory as data and derives its own from the `SchemaCore` declaration by an
   environment walk. A build-time, kernel-checked equality between the two (`decide`/`rfl`)
   turns drift into a failing `mise run check` with a machine-checked witness. The trusted
   step shrinks to the extractor, and it is re-runnable against the pinned bytes at will.
2. **Material vs abstract becomes a checked relation, not a design anxiety.** A material
   mirror of the pinned AST shape can be generated; the abstract lab-owned carrier relates
   to it by a declared projection; both ends and the projection are checkable objects.
3. **Programmatic schema creation is a first-class requirement.** Generating schemas of
   different kinds — carriers, instances, obligations, and schema *values* (fixture
   corpora, deterministic, no ambient randomness) — via Lean 4 metaprogramming, with the
   reflective closure in view: Schema Core itself describable as an entity in the store
   (P2 applied to the store's own description layer).

**Thesis: agent-drivable organization (operator, same sitting).** The project must be
organized so AI agents can drive it mechanically. This is the charter's LLM-harnessed
stance ("the gates carry the trust, never the models"; LLM harnesses admitted with an empty
trust contribution) made a *structural* requirement of E2 rather than a tooling note.
Decoded into organizing rules for pass 2:

1. **Every unit of work terminates in a binary, machine-checkable gate** — build green,
   axiom allowlist clean, inventory-equality theorem holds, KATs reproduce, `mise run gen`
   leaves a clean tree. An agent's output is never adjudicated by prose.
2. **The obligation ledger is the work queue.** Obligations are generated as named `Prop`s
   (statements first, proofs as separate seats — the `unison-fragment` F1/F2/F3 pattern),
   dependency-ordered, one obligation per seat, claimable and adjudicable independently.
3. **Statement pins.** A proof seat receives a frozen statement identity and supplies only
   the proof; the gate checks the statement is unchanged and the axiom report clean (the
   fips202 house lesson: commit minting and statement drift are gated steps, never a proof
   seat's side effect).
4. **Typed rejections everywhere.** Admission, extraction, and generation fail closed with
   stable machine-readable reason codes, so agent outputs are classifiable without human
   reading.
5. **Determinism as an enabling property.** No ambient randomness, clocks, or
   iteration-order dependence anywhere in the pipeline — reruns converge, so agents can be
   retried, raced, and diffed.
6. **The reflexive endpoint, staged honestly.** Once the store exists, obligations and
   receipts become entities in it — statements content-addressed, proofs referencing
   statements by address, drift detection by identity rather than by fingerprint
   convention (the corrected form of Concrete's proof-fingerprint move). The bootstrap
   ledger is plain generated data files under the existing `mise` gates; graduating it into
   the store is a later, declared transformation — v0 organization must not depend on the
   store it is building.

Pending inputs for pass 2, dispatched 2026-08-25 (Opus subagents, reports land beside this
file): `research/schema-ast-census.md` — **landed, consequences in §11**; and
`research/lean-metaprogramming-survey.md` — the metaprogramming toolbox, inventory-driven generation
architectures, the correspondence-theorem pattern, obligation generation, and
nested-inductive gotchas under the estate's pure-kernel constraints — still running.

## 11. Census consequences (2026-08-25, from `research/schema-ast-census.md`)

The census is the authority; this section records only what it changes in §§4–7. Every claim
below carries a receipt in the census.

**Both §9 UNVERIFIED items are resolved — ruling R-5 is closed by evidence.**

- Union decode is first-match and member-order-sensitive under the default `anyOf` mode, and
  order sensitivity is preserved deliberately even under concurrency (`orderedStep: true`,
  `SchemaAST.ts:2965`; stop-at-first-success at `:3079`). No member sorting exists anywhere
  in the pinned source. **`union` stays an ordered list in the carrier and the equivalence;
  it also carries `mode : anyOf | oneOf`** (`:2916`), which §5's sketch was missing.
- Object property order is observable (encoded output follows AST order; validation error
  order too), the library explicitly disclaims stability of the default order
  (`SchemaAST.ts:500-504`), and AST order itself derives from JS own-key order
  (`Reflect.ownKeys`, `:2526` — integer-like names re-sort ahead of source order). So the
  lab cannot inherit an order discipline from the library either way; if identity is to be
  field-order-independent, the sort is ours, imposed at the byte layer. **New ruling R-10:**
  is field order inside the schema's declared equivalence (sort-by-name identity, with the
  already-minted Observation Normalization covering the G4 comparison) or outside it
  (AST-order-faithful identity)? Proposal: sort-by-name, since duplicate names are rejected
  at admission (`:2119-2121`) so the sort is total and tie-free — but the census shows the
  faithful option is coherent too, and the operator rules.

**Four design changes forced by the census.**

1. **Checks: adopt the library's own naming mechanism instead of a bespoke enum.** A check's
   serializable identity already exists upstream as the `representation : {id, payload}`
   annotation (`Schema.ts:16766-16768`, payload constrained to JSON), required by Effect's
   own persistence codec on every leaf `Filter` (`SchemaRepresentation.ts:958`) and enforced
   at revival (`Missing representation annotation`,
   `fromRepresentation.ts:141-143`). The §5 `Check` inductive becomes
   `filter (id : String) (payload : Value) (aborted : Bool) | filterGroup (checks : List Check)`,
   with admission restricted to a pinned id-allowlist. Bare user filters (closure-only
   identity) are rejected — exactly the boundary Effect itself draws.
2. **Encoding chains are rejected in v1, not dropped.** Transformations carry no name, no
   annotations, no identity of any kind (`SchemaTransformation.ts:143-165`, `71-98`), and
   Effect's representation deletes the `encoding` field entirely rather than naming it
   (`SchemaRepresentation.ts:406-428`). Silently dropping behavior-bearing fields from the
   pre-image is the #3509 failure shape at the transformation level — two behaviorally
   distinct codecs, one address — so v1 admission **fails closed on any `encoding`,
   `encodingChecks`, or `constructorDefault`** (all closure-bearing). Pleasant corollary:
   with no encodings admitted, the Type and Encoded views coincide on the admitted subset,
   and ruling R-6 dissolves for v1 — it returns only if named transformations ever exist
   upstream (the census flags `SchemaGetter` as the one unread surface that could change
   this).
3. **Annotations: allowlist, read from the right place.** The bag is string-keyed and open
   (`Schema.ts:16551-16553`) — only an allowlist is sound; and resolution reads from the
   **last check**, not the node, when checks are present
   (`internal/schema/annotations.ts:6-8`) — an admission function reading `Base.annotations`
   alone misses the identifier of every refined schema. The serializable/function-valued
   split is already curated upstream (`annotationExcludedKeys`,
   `internal/schema/annotations.ts:69-84`).
4. **The discriminator ruling is now measurably stricter than Effect, and that is the
   point.** Effect's recursion identity is the optional `identifier` annotation with a
   synthesized `${_tag}_` fallback ordered by minting sequence, keyed on AST **object
   identity** — structurally equal ASTs remain distinct candidates
   (`toRepresentation.ts:8, 63-65`; `SchemaRepresentation.ts:710`). None of that is
   source-derivable in the D3 sense. The lab's mandatory-discriminator `mu` therefore
   **rejects schemas Effect serializes happily** — recorded as a deliberate strengthening,
   not a gap. Suspend's own constraint (checks forbidden on it, `SchemaAST.ts:3155-3157`)
   carries over to `mu`.

**Carrier corrections from the census.** The admitted-variant table in §5 adjusts: 21
variants exist (`SchemaAST.ts:53-74`), all tagged classes; 17 are closure-free. Enum is
plain data (ordered `(String × (String ⊕ Number))` pairs). TemplateLiteral stores `parts`
only (three constructor-derived caches recomputed; note it is not walked by the
projections — defer it in v1). Literal admits `string | number | boolean | bigint` with
finiteness enforced (`:1327-1329`) — **new ruling R-11:** v1 literal policy (proposal: admit
integer-valued and bigint literals; defer non-integer finite doubles until the float byte
policy exists). UniqueSymbol admissible only as a `Symbol.for` registry key. Declaration
admissible only via its `representation.{id, payload}` annotation, else rejected
(structurally anonymous otherwise — `getExpected` bottoms at `"<Declaration>"`).
PropertySignature names are `PropertyKey` (symbols included) — v1 admits string names only.
Admission must **re-check every constructor invariant** (duplicate names `:2119`, tuple
ordering `:1711-1721`, literal finiteness, Suspend check-ban): the library's
`modifyOwnPropertyDescriptors` path (`:3412-3421`) can produce nodes that bypassed their
constructors, and candidate keying even depends on an out-of-band `WeakMap`
(`contextOwners`, `:3423-3428`) no structural walk can see.

**Walkability: confirmed, with a concrete extractor design.** The variant list, tags, and
field shapes are mechanically extractable from syntax alone (union alias at
`SchemaAST.ts:53`, classes extending `Base`, `_tag` string-literal properties, readonly
field declarations), with three independent in-source enumerations to cross-check (the AST
union, the `makeGuard` sites, the 22-variant `Representation` union and its runtime array).
The census's shape/semantics split is the admission function's specification: a walk yields
a sound **shape** inventory; semantics stay behind four open escape hatches (Declaration
`run`, open annotations, unnamed encodings, unnamed filters), so admission = shape check +
registry lookup — the same architecture as Effect's own `fromRepresentation`.

**Prior-art alignment.** Effect's `SchemaRepresentation` makes three of the lab's moves
already — drop-don't-name transformations, require `{id, payload}` names for opaque leaves
and fail loudly, break recursion through a document-level reference table — and its two
unadvertised losses (`Arrays.isMutable` silently dropped; `Filter.representation`
optional-in-type but required-in-codec, so a type-correct Document can fail to encode) are
exactly the class of defect the lab's framed, admission-checked scheme is designed to make
impossible. Cite it as the closest prior art and the sharpest local foil.

## 12. Generation architecture (2026-08-25, from `research/lean-metaprogramming-survey.md`)

The survey ran the v4.33.1 toolchain rather than reading about it; everything below is
measured there. It settles the mechanical-fidelity thesis into one pipeline and revises the
§5 sketch in two places.

**The pipeline (P1 — settled by measurement, not taste).** Deterministic text generation
into committed `.lean` files: extractor over the pinned source → `inventory.json`
(committed) → generator → `Schema/{Core,Correspondence,Encode,Obligations,Fixtures}.lean`
(committed, Aeneas-style banner on line 1, whole-directory diff) → `lake build` →
per-theorem axiom allowlist → opaque/unsafe scan → `leanchecker --fresh` on both hosts →
`mise run gen` + `git diff --exit-code`. The alternative — reading the inventory JSON at
elaboration time — is **disqualified by a measured soundness hole in the gate**: Lake does
not track non-`.lean` inputs, so editing the JSON left a stale olean holding a now-false
theorem while `lake build` and the clean-tree check stayed green. Only the committed-text
route makes drift visible to Lake, the kernel, and the PR diff at once.

**The correspondence gate (P2 — the operator's walk-over-TypeScript thesis, kernel-checked,
with an empty TCB).** Two shapes were built and measured. Shape A (environment walk emits
the Lean-side inventory, `theorem correspondence : inventoryTS = inventoryLean := by decide`,
0.42 s at 27 variants, zero axioms) works but leaves the walking metaprogram trusted. Shape
B removes the metaprogram entirely: generated **type ascriptions** (one per variant — a
kernel-checked claim about each constructor's signature), a generated **exhaustive tag
match** (a new constructor fails as `Missing cases: …`), a decided distinctness lemma, and
the generated serializer whose match arms pin field names. Both drift kinds caught with
better errors, zero axioms, nothing trusted but the extractor. **Adopt Shape B as the gate;
keep Shape A as a bootstrap/diagnostic tool.**

**Trust statement (one line).** Trusted: the extractor alone — that `inventory.json`
faithfully describes the pinned bytes. The generator is not trusted because everything it
emits is checked: ill-typed output fails the build, a wrong constructor set fails Shape B, a
false theorem is rejected by the kernel, drift fails the diff. Recommendation from the
survey, endorsed here: **build the extractor on Effect's own `toRepresentation`** (§11's
closest-prior-art finding made load-bearing). Operator pointer 2026-08-25:
`predictable-machines/lean4-tree-sitter` is available as the extractor host — a
Lean-driven walk over the pinned TypeScript via tree-sitter, matching TOOLS.md's existing
pending-admission entry for exactly this C-FFI trusted seam; same trust position as any
extractor, admission entry required before its output enters gated work. (Original
continuation: §11's
closest-prior-art finding now becomes load-bearing — it is the library's sanctioned,
round-trippable serialization, so the one trusted component can self-check), after verifying
it exposes everything the inventory needs.

**Carrier shape revision (feeds ruling R-10; new ruling R-12).** The §5 sketch nested
`List (String × SchemaCore × Bool)`; measured at v4.33.1 that shape refuses
`deriving DecidableEq` outright and — worse — the `induction` tactic refuses nested types,
so every canonicalization proof would hand-roll `SchemaCore.rec`. The survey's verdict,
adopted as the default pending R-12: **mutual, monomorphic shape**
(`SchemaCore` / `FieldList` / `SchemaList` in one `mutual` block) — `deriving DecidableEq`
works, `induction` works, `BEq` recovered in one line from `DecidableEq`. Cost: no free
`List` lemma reuse — which is why R-10 (field ordering) must be ruled first: if
canonicalization wants `List.Perm`/`Sorted` machinery, the trade tightens.

**The `partial → opaque` trap — a new estate gate, beyond E2.** Measured: most core deriving
handlers silently emit `partial def` on mutual/nested carriers (`Ord` and `FromJson` even on
plain recursive ones); `partial def` elaborates to an **`opaque` constant with an arbitrary
inhabitant as its value** — kernel-unreducible, `rfl`/`decide` silently break — and
`#print axioms` reports **nothing** (the collector ignores `.opaqueInfo`). The axiom gate
cannot see it. Proposed standing gate (operator assent; applies to every current and future
artifact, fips202 included): a ~15-line environment scan asserting no constant in an
artifact's namespaces is `opaque`/`unsafe` or carries `@[implemented_by]`/`@[extern]` — the
last two being exactly the attribute-audit gate the spine notes already owed. Corollary
rules for generated code: never derive `Repr`/`Ord`/`ToJson`/`FromJson`/`ToExpr` on the
carrier; hand-generate mutual companions with `termination_by structural` (measured
working, zero axioms; note `structural` cannot see recursion through `List.map` lambdas —
write explicit mutual traversals).

**Scaling walls for the obligation and fixture design (extends the earlier `decide`-at-scale
findings with measurements).** `Nat`-valued folds decide comfortably to ~150,000 nodes
(16 s); `String`-valued encodes hit the default heartbeat wall near **2,000 characters** —
two orders of magnitude apart, and the fips202 `rfl` calibration (a `Nat`/`UInt64` workload)
does not transfer. Consequences: canonical-encoding KATs compare byte lists / `Nat`
measures, never force whole-string kernel reduction; benchmark only *equal* strings
(inequality short-circuits and measures nothing); generated files set `maxRecDepth`
explicitly (v4.33.0 bounds kernel recursion at 16× that option — deterministic now).
Tactic ladder for generated proofs, by axiom cost: explicit
terms/`injection`/`noConfusion` (zero) → `decide` (zero) → `simp` (`propext`) →
`grind only […]` scripts from `grind?` (allowlist; bare `grind` banned in generated code —
core itself ships a `grind.warning` option for exactly this) → hand proof. `decide_cbv` is
kept for *reach* (well-founded recursion) not speed — measured slower than `decide` here.

**Kernel-soundness reinforcement for the pin.** v4.32.2 fixed a kernel bug in **nested
inductive types with phantom parameters** admitting an axiom-free proof of `False` — the
exact declaration class this carrier lives in; v4.33.1 additionally requires GMP ≥ 6.3.0
(earlier versions can make Lean unsound). The v4.33.1 floor is re-validated, and the
dual-host gate should assert the GMP version on both machines.

**Scaffold record (2026-08-25, post-ratification).** `formal/entity-store/` is a scratch Lake
project (v4.33.1) carrying the ratified shape, and it builds green on the Mac:
mutual-monomorphic carrier (`SchemaCore`/`FieldList`/`SchemaList`, plus mutual `Value` and
`Check` families) with derived `DecidableEq` and one-line `BEq`; framed mutual serializer
(`termination_by structural`, discriminator byte per node, be64 frames); `canonS` with the
R-10 field sort; Shape B correspondence (ascriptions + exhaustive tag map +
`tags_distinct` at zero axioms); the obligation ledger as named `Prop`s (encode
injectivity, canon idempotence/sortedness, Direction B) with two cheap theorems proved —
`directionA` (congruence) and `kind_separation` (schema/entity pre-images differ at the
kind byte), both within the allowlist; and the opaque/unsafe gate as a command elab that
fails the build on offenders. Gate validated negatively: a deliberate `partial def` probe
was caught as `(E2.gateBreakProbe, opaque)` and then reverted. Kernel-reducibility smoke
checks (`rfl` on the `BEq` instance, `decide` through `canonS`) pass.

**Gate-calibration finding (feeds the standing-gate spec).** The scan's first run flagged
every `f._unsafe_rec` companion: the compiler generates an `unsafe` recursive twin for
*every* recursive safe `def` (code-generator internal, never admissible in proofs). The
standing gate must exempt exactly the compiler-generated `._unsafe_rec` companions while
still flagging `opaque` logical constants (the `partial` trap — verified caught) and
user-level `unsafe` defs. A stricter future form may additionally assert each exempted
companion's parent exists and is safe.

**First three build steps (post-ratification):** (1) rule R-10/R-12, then land the
hand-written mutual carrier with `DecidableEq`, the one-line `BEq`, the mutual serializer —
no derived instances anywhere, axiom report and opaque-scan clean; (2) stand up
`mise run gen` end-to-end on a deliberately small inventory and prove the gate by breaking
it three ways (hand-edit generated text; drift the JSON; add a constructor); (3) add the
Shape B correspondence file and the opaque/unsafe scan, recorded in `PROVENANCE.md` with
Supports / Does-not-support.

## 13. The advanced-modeling lane (2026-08-25, from `research/rocq-itrees-modeling-survey.md`)

The operator directed that interaction trees — higher-order transforms and recursion
modeling — not be overlooked. The survey (985 lines; companion Lean probe
`research/rocq-itrees-lean-probe.lean`, 413 lines, building on v4.33.1) answers with measurements,
under the annex boundary rule: Rocq work is technique only, never an estate artifact.

**Local tooling: green, and better-pinned than expected.** The annex verifies with
isolation asserted; smoke compiles. Pins: `rocq-core 9.1.1`, `coq-itree 5.2.1`,
`coq-paco 4.2.3`, `coq-ext-lib 0.13.1`. The opam package ships the ITree `.v` sources —
68 files locally readable at the pin — and `switch.export` carries a **sha512 for the
5.2.1 tarball**: stronger provenance than the Windows study clone. Ruling implication: no
Mac clone; the owed `REFERENCES.md` pin cites the annex sha512.

**Recursion verdict — v1 needs no coinduction, and one idea transfers.** Measured, not
asserted: the probe defines the `mu`/`var` carrier with substitution and a total decidable
`Conforms` by well-founded recursion, axioms within the allowlist. ITrees are irrelevant
to the store's finite inductive carrier. The one transferring idea is **guardedness** —
the productivity condition `iter` enforces coinductively becomes, for the store, an
inductive admission condition on `mu` bodies (a non-productive `mu d (var 0)` is
inadmissible). **Proposed addition to §4.2's admission rules: mu-body guardedness, as a
decidable check** — the reference sweep had already reserved the slot.

**Where coinduction actually starts: between T4 and T5 of the runtime lane.** T0–T4 are
finite and total by the runtime document's own theorem inventory; T5 (`yieldNow`,
suspension) is the first tier forcing divergence into the observation. ITree denotation is
therefore a *runtime-lane M6-era* instrument, not an entity-store one.

**Higher-order transforms — real offer, correctly dated.** `interp` into an error monad
would make issue policy a swappable handler rather than a decision welded into decode —
but v1 admits no encodings (§11 change 2), so there is no effectful codec to model until
named transformations exist upstream. The "effect descriptors as entities" horizon is
structurally well-served (signatures are data; handlers compose), with the caveat that
ITrees are first-order in events.

**The Lean realization bet, measured.** Hand-rolled M-type over a **container-presented
event signature** `(Op, Ans)`. Two findings from the probe: (1) the axiom objection is
empty — the UIP axiom the ITrees README needs for `Vis` inversion is *free* in Lean via
definitional proof irrelevance; (2) the blocker is a **universe jump, not missing
coinduction** — `vis {A : Type}` pushes the base functor to `Type 1`, and presenting
events as a container keeps it in `Type`, a restriction that coincides exactly with the
estate's own no-functions-in-the-carrier discipline. On bare v4.33.1 (no Mathlib, no
imports) the probe carries carrier, `corec`, `observe`, `bind`, `iter`, `translate`,
`interp` — the combinator a dormant spike had called blocked — typed-failure `throw`, and
the `eqit`/`eutt`/`euttge` family: 413 lines, 0.63 s, mostly axiom-free. **The honest
bound:** definitional layer only — no monad laws, no `eutt` transitivity, no congruence,
no up-to techniques. The real risk is the paco/gpaco equational layer (1,575 lines in the
Rocq original), not "Lean has no coinductives."

**Sequencing (defer-with-triggers, adopted into the roadmap posture).** Now: read the six
core ITree files in the annex (~800 lines, no new packages); pin ITrees in
`REFERENCES.md` via the annex sha512 (owed provenance action below). Triggers: ITree
carrier in the store — **never on the current design**; ITree denotation — when T5 opens;
ctrees — when the scheduler goes nondeterministic; `interp`-modeled codecs — when named
transformations appear upstream.

**Gap closed (same day): the coinduction-realization sweep reported late and is persisted
at `research/lean-coinduction-realization-survey.md`.** It revises §13's Lean-realization bet with
build-verified findings:

- **QpfTypes is ruled out**, not merely unconfirmed — its own `ITree/Basic.lean` documents
  that `codata` cannot express the dependent `vis` arrow (author's open PR since Dec 2024
  says the same), and its v0.2 pivot drops the `codata` command entirely.
- **Two viable Lean 4 ITree implementations now exist, splitting exactly on the estate's
  Mathlib rule.** `Verified-zkEVM/PolyFun`: at the estate's exact v4.33.1 floor, complete
  stack with a **correct** eutt (naive τ-stripping documented as unsound and fixed with an
  inductive `TauSteps`), and a machine-checked axiom sweep enforcing precisely
  `{propext, Classical.choice, Quot.sound}` with a committed zero-debt baseline.
  `ISTA-PLV/coinductive`: zero dependencies, full definitional stack via a bespoke CCPO +
  `partial_fixpoint`, but breaks on v4.33.1 (bounded fixes, verified locally), has **no
  weak-bisimulation theory at all**, and silently elaborates unproductive definitions to
  `⊥` — the guardedness admission condition again, from the other side. The only located
  Lean 4 **paco port** (pcofix/pfold/punfold tactics) lives in `mit-plv/lean4-itree`.
- **A degenerate eutt was proved in the wild**: the dead `boogie-org/lean-itrees` defines
  weak bisimilarity so that `Eutt (ret r) spin` closes sorry-free (child's proof) — a
  shipped equivalence identifying return with divergence. The estate should keep this
  exhibit; it is the claims-discipline lesson (#3509's genre) at the equivalence layer.
- **Fuel is not the Lean idiom** (meaningful negative: no serious project uses it for
  divergence), and Aeneas supplies the live precedent — it deleted its bespoke divergence
  elaborator for native `partial_fixpoint` over a flat CCPO.

Updated posture for the T5-era ruling (deferred with the same trigger): reuse-first policy
points at **PolyFun** if the runtime-lane project argues the per-project Mathlib exception
(adopting a discipline that already matches ours), and at **ISTA-PLV + hand-built eutt
theory** if not — with the survey's §13 hand-rolled container option as the fallback.
§2's Rocq signatures are unaffected — all read from the pinned sources with `file:line`.

**Reference companion (same day): the primary-source literature sweep is persisted at
`research/itrees-ctrees-literature-notes.md`** (POPL'20, paco/gpaco, ctrees POPL'23+JFP, the Xia
dissertation, and the library's actual structure at 5.2.1, definitions quoted from
source). Four instruments from it earmarked for this program's later lanes: (1) the
one-line teaching chain for why weak bisimulation is forced — Tau exists for guardedness
→ `iter` must insert a Tau → the fixed-point law holds only up to Tau → the equational
theory lives at eutt; (2) **`rutt`** (relation-up-to-tau across *different* event
families, matching events by `REv` and answers by `RAns`) as the likely top-level shape
for a future decoder-vs-specification conformance relation; (3) the typed-failure kit for
the effectful-codec horizon — `exceptE Err` with a `void` answer type (throw is a genuine
monad zero), `throw_prefix` reifying failure into `R + Err`, and `has_post_iter_strong`
as the loop-invariant rule ("the decoder, however it loops, only returns well-formed
values"); (4) ctrees' crisp boundary criterion confirming the store's side of the line —
delayed choice is needed only when a rule's transitions depend on the existence of other
transitions, and "a codec is squarely in ITree territory." One cross-confirmation worth
keeping: the dissertation proves `Vis`-injectivity is equivalent to UIP in Rocq — the
exact axiom the Lean probe found to be free under definitional proof irrelevance. A third
sibling sweep (Vellvm/layered-interpreter detail) could not be cancelled and may land
later; the notes above do not depend on it.

## 14. Operator thesis — dynamics belong in the semantic domain (2026-08-25)

Captured from the operator's reading of the runtime tier table ("T7 — tracing, metrics,
cost — orthogonal"), which they reject as a scoping error. Two theses, taken whole:

**Thesis: observability is denotation, not instrumentation.** A *"well-defined inhabitant
of the semantic domain"* is precisely what the lab is interested in for tracing, metrics,
and cost. The runtime document's own T7 risk row ("instrumentation changes the runtime
path") is evidence *for* this reframing: anything bolted on perturbs the subject; anything
denoted is part of the subject. Cost, trace, and usage should be carried by the semantics
the way values are — graded, weighted, or phase-separated — so that quantitative claims
sit at G1/G2 like everything else.

**Thesis: entities are not static objects.** Especially not effectful ones. What the lab
often wants to model is *the universe in which schemas are projections of a global type*,
and questions of *which ones become hot during computation* are of critical interest.
Decoded against the charter: this is P1/P3 applied to the store — the global object (L3)
is primary, stored schemas are its projections, and the store's dynamics (demand, usage,
heat, provenance of derived entities) are semantic content about that universe, not
telemetry about an implementation. The store is a living system; its identity layer
(§1–§13) is the statics, and this thesis opens the dynamics program.

Dispatched, same sitting: a three-reader literature wave (reports land beside this file):
`research/cost-semantics-survey.md` — cost and quantity as denotation (cost-aware logical
frameworks, graded/quantitative types, resource analysis, mechanized cost reasoning);
`research/demand-provenance-survey.md` — heat, demand, and provenance as semantics (semiring
provenance, demand/usage analysis, incremental and demand-driven computation, memoization
semantics); `research/global-projection-survey.md` — the universe frame (global types and
projection, choreographies, categorical data migration, lenses and view-update). Each
reader answers the two theses directly and reports mechanization status per thread.

## 15. Deployment topology (2026-08-25, UNDER DISCUSSION — nothing ratified)

Frame from the in-session discussion, held for the rulings below.

**Organizing principle.** Content addressing splits any deployment into an immutable plane
(coordination-free: same content converges, distinct content cannot collide, every node
verifies locally by re-hash) and a mutable plane (names, claims, placement) that can be
made arbitrarily small. Every topology question reduces to: where does the name plane
live, and where do reads get denoted.

**Four properties the results require of a topology:** (1) local verifiability everywhere
(held by design — stored bytes are the pre-image); (2) conflict-free production with
claim-based coordination (the agent-drive thesis and the topology thesis coincide);
(3) demand denoted, not sniffed — heat capture happens where handlers run, and heat
valuations merge associatively/commutatively across sites (the semiring chooses the
deployment property); (4) projections carried with receipts — sites verify their schema is
THE projection of the named global without holding the global.

**The rung ladder.** T-A single node/single writer (the scaffold's world; dogfood).
T-B coordinator + seats (the estate's current Mac/PC practice, formalized; single-writer
name plane; content-addressed bundles over git transport; dual-host gates). T-C hub +
edges (verify-on-arrival replication; names in single-writer scopes; heat aggregating
upward by semiring merge; only names can be stale — values cannot). T-D federation (D3
source-derivability delivers convergence without coordination across trust domains — the
theorem Unison's design forfeits; scheme-version cohorts partition dedup deliberately;
content-address equality leakage across tenants flagged for a later ruling).

**Two unifications.** A topology is a handler stack: local/remote/cached interpretation of
the same store events, so topology substitution ("the edge cache is faithful") is an
eutt/rutt-shaped conformance claim, statable at G1. And the derivation-cache plane
(input-addressed results keyed by function address + input address, behind the kind
separator) is where cost and heat attach naturally — receipts carry denoted cost; demand
on cache keys is the heat map.

**Refinement from the literature wave (clairvoyance child):** heat should be
**demand-shaped, not scalar** — per-entity valuations in an approximation lattice (which
parts were forced), which exist only at the decode boundary. Consequence: define the heat
object at the decode judgment, making it topology-invariant; raw byte access below that
boundary is transport, contributing at most a coarse touch event.

**Open rulings (this section's grilling agenda):**

| # | Ruling | Options on the table |
|---|---|---|
| R-15a | Mediated-read policy (heat capture) | all reads mediated / two-path (verified-raw + heat at decode plane) / sampled (proposed: reject for v1 — an estimator is not a denotation) |
| R-15b | Name-plane story at T-C | bare refs per scope / content-addressed name-map versions + causal spine, map itself a store entity / CRDT multi-writer (proposed: staged second option; CRDT deferred with trigger) |
| R-15c | git as v1 transport and interim name history | **RATIFIED 2026-08-25 ("yeah git as transport")** — the store directory is git-storable; git addresses transport integrity, SHA3-512 addresses semantic identity; two layers, never conflated |
| R-15d | Federation posture | defer whole; never break D3 |

## 16. Dynamics program synthesis (2026-08-25 — the §14 wave, all three readers landed)

Reports: `research/cost-semantics-survey.md` (+ `research/cost-denotation-lean-probe.lean`, building,
allowlist-clean), `research/demand-provenance-survey.md`, `research/global-projection-survey.md`. Three
children folded in en route (AARA mechanization; quantitative equational theories;
clairvoyant CBV). This section is the composition; the surveys are the authority.

**The stack the wave converges on** — four layers, each licensed by a different reader,
composing without tension:

1. **Cost carrier with a proved phase distinction** (reader A, measured in its probe):
   writer-style cost accounting where the behavioral phase is a `Quot`, so calf's
   phase-separation *axiom* becomes the *theorem* `beh (step c e) = beh e := Quot.sound
   rfl` — non-perturbing and non-degenerate, inside the allowlist, with a transport lemma
   letting existing cost-free theorems carry over unchanged. The precise, two-sided form
   of the §14 "instrumentation" argument.
2. **Trace → polynomial → valuation** (reader B): derivation traces stored as entities
   (`(output addr, dep addrs, recipe addr)` — three addresses and a list); `N[Address]`
   provenance polynomials over them as the *most general* dynamics object (freeness
   theorem: any semiring semantics factors through it); heat, usage count, tropical cost,
   confidence, and GC-retention all homomorphic images computed afterwards. L7
   (acyclicity) keeps every polynomial finite — none of the hard ω-continuity theory at
   v1. Cross-site aggregation is semiring addition: coordination-free by algebra.
3. **Demand-shaped refinement** (clairvoyance child, deferred with trigger "partial
   reads"): per-entity heat as an approximation-lattice element (which parts were forced),
   defined at the decode judgment — topology-invariant by construction.
4. **The universe frame** (reader C): split the §14 sentence. *Statics*: the global
   object is a diagram merged by the **Grothendieck construction** — named by Spivak in
   two paragraphs and developed by nobody; Clarke's June 2026 "Grothendieck construction
   for delta lenses" shows two literatures converging on it from opposite ends. *Dynamics*:
   the global object is an *interaction*; schemas are what each role sees — "which become
   hot" is definable only once the universe is an interaction. *Bridge*: the codec as a
   view with a complement (Bancilhon–Spyratos through JRW 2012: a lens's get IS a product
   projection) — and the census already proves the pinned Effect codec is **not** an
   isomorphism, so the complement is real, not decorative.

**The flagship first theorem.** Reader C's proposed G1 slice needs no LTS, no coinduction,
no Mathlib: `GlobalDescription` over Schema Core with roles and a merge `⊓` from the §4.3
table, then (T-A) `⊓` is a partial join; **(T-B) address–projection commutation —
`addr(project G p)` is determined by `addr(G)` and `p`** — a theorem no literature thread
has ever stated, because none of them has addresses; (T-C) projectability decidable.
T-B marries the identity layer to the universe frame and is this program's signature
claim. Composed agenda: T-A/T-B/T-C + reader B's ten dynamics obligations + reader A's
L-0–L-3 cost layers, all `Nat`/`Bool`-valued (cheap side of the §12 `decide` wall).

**Standing findings the wave established:**

- **Mech/cslib**: >40,000 lines of *Lean 4* proving endpoint-projection soundness AND
  completeness (Montesi co-leads cslib; upstreamed 2026-08). The projection lane's best
  mechanized asset is already in the estate's own language — on Mathlib and v4.34.0-rc2,
  above the floor. MPST corrections to carry: the POPL'19 "flawed foundations" story is
  itself corrected (mergeability vindicated 2026); mechanization keeps finding real bugs
  in this field; zero Lean 4 session-type work otherwise.
- Mathlib already holds the data-migration adjoints unnamed (`Functor.lanAdjunction`/
  `ranAdjunction`); CQL is unusable (restricted license, patented core) and — verified —
  has **no canonical identity for schemas or instances**: precisely what our addresses add.
- Quantitative session types exist (CAMP's cost-in-the-global-type with bounded-cost
  soundness; timed MPST) and are **unmechanized** — and across every thread, **nobody
  quantifies demand**: every quantity in the literature is a cost-of-doing, never a heat.
  The exact join §14 names is unclaimed.
- Typed errors and the profunctor-optic abstraction are mutually exclusive (exposing the
  error type pins the residual the abstraction hides) — a real boundary for the H2 codec
  thesis, stated with receipts in reader C §4.

**New rulings for the queue:**

| # | Ruling | Proposal on the table |
|---|---|---|
| R-16a | Cost ground: does decode cost count **DAG nodes or tree-unfolding paths**? (They diverge exponentially under sharing; AARA can express only paths) | rule before the dynamics contract freezes; interacts with memo/heat |
| R-16b | **Mathlib stratification**: identity layer stays Mathlib-free/allowlist; a fenced, separate Lake target for the projection/dynamics layers may take Mathlib (and cslib/Mech), reported at its own gate | adopt |
| R-16c | Wave papers into `REFERENCES.md` (GKT provenance; BSLC; clairvoyance line incl. ICFP'24; calf/decalf; CAMP; Mech; TAC algebraic databases; JRW lenses) | batch with the other provenance actions |

**Unclaimed-firsts ledger** (each verified absent by a reader; each aligned with a lab
program): the Lean cost-semantics substrate; the category **Met** in any assistant; the
first concrete quantale instance in Mathlib (near-free); quantitative equational theories
in any assistant; quantitative/timed MPST mechanization; the BSLC correctness definition
proved for a real derivation layer (the suspending × constructive-traces cell is empty —
Nix cannot occupy it, a content-addressed store can); Hackett–Hutton's own CBN ≡
clairvoyant-CBV theorem; demand-as-heat in any formalism; T-B address–projection
commutation.

## 17. Naming as entities — the metadata design thrust (2026-08-25, ratified as direction)

Captured from the in-session exchange after the operator asked what L-names-inert (M16)
means and ruled that the lab still wants a carrier for *modeling* naming — annotations,
local and scenario naming — as forward-looking convenience.

**The principle.** Naming is not added to the identity layer; naming is modeled **as
entities in the store** — P2's reflexive move applied to the name plane, and the
completion of R-15b's staged ruling. M16 stays exact throughout: everything below is
ordinary immutable entities, and the mutable plane remains one pointer per scope
("current view is address X").

**Name views.** A name view is an entity under its own schema — shape:
`{ bindings: [{name, target}], parent, base, annotations }`. Consequences, each free once
views are entities: a *scenario* is its own view entity; a *local context* is a view
whose `base` references another view by address and overlays deltas — "what does this
name mean here" is resolution against a chosen view, a pure provable function over
entities; *history* is the Unison causal spine as plain data (each view references its
predecessor; "what were the names last Tuesday" is a lookup); and deduplication applies
to naming itself — two scenarios converging on the same naming ARE the same entity.

**Annotations as sidecar entities.** An annotation is an entity that references its
subject by address — documentation, deprecation, provenance of a naming decision,
scenario tags. The subject never knows its annotations: no back-pointer, or the
subject's address would change (the census's open-annotation-bag lesson, inverted into a
design rule). Names are thereby one species of a uniform shape — metadata-about-
addresses — and the sidecar pattern covers the species uniformly.

**The carrier gap this exposes, and its amendments (RATIFIED as planned; enter the
carrier per Q10 when implemented, natural companion to the M15 seat):**

| # | Amendment | Content |
|---|---|---|
| **A-1** | Address-valued values | `Value.vaddr (a : Address)` plus a SchemaCore address-type node, so schemas can *type* address-valued fields. Unlocks name views, annotation sidecars, and §16's trace entities (`(output, deps, recipe)` are addresses) in one stroke. Extends joint B: an entity's `refs` become its schema address plus every `vaddr` in its value, so WF2 closure covers entity→entity references — typed name views can only name what exists. Mechanical cost bounded: one new case each in encode/decode/canon/refs/`Conforms`; the M4a proof stack extends per-constructor by its uniform pattern. |
| **A-2** | The name-view schema | First dogfood schema once A-1 lands; its resolution function and view-composition laws are the first entity-level theorems over the store. |

**Provenance actions owed (operator assent required — touches `.reference/provenance/`).**

1. The lock's `bytes` and sha256 `contentDigest` fields are wrong for **all five** pinned
   Schema artifacts — computed against a CRLF working copy (+1 byte per line, exact on all
   five); only the `gitBlob` SHA-1s verify. Any LF-checkout digest check fails spuriously
   today. Proposed fix: recompute `bytes`/`contentDigest` from the git blob bytes and record
   the checkout-normalization rule in the provenance context.
2. Seven files the census's claims rest on are not in the lock (`SchemaTransformation.ts`,
   `internal/effect.ts`, `internal/schema/{annotations,toRepresentation,fromRepresentation,
   toJsonSchemaDocument,toCodeDocument}.ts`); their blob SHA-1s are recorded in the census's
   file table. Pin them before any census-dependent claim is promoted past G0.
3. InteractionTrees 5.2.1 enters `REFERENCES.md` as prior art, pinned by the sha512 the
   annex's `switch.export` already carries (§13) — no clone needed on this host.
