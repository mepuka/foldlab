---
id: DISTINCTNESS
version: 2
carriers:
  - "schema-tag encoding / node version+tag bytes"
  - "Addr32 addresses"
  - "schema field and enum names"
applicability:
  - "Do two syntactically different things map into one representation space (tags, addresses, names)?"
  - "Is any comparison or lookup keyed on the mapped value?"
templates:
  - name: encode-injective
    form: "encode(x) = encode(y) ⇒ x = y (on the admitted domain)"
  - name: tag-separation
    form: "constructors carry pairwise-distinct tags; version and tag bytes never overlap"
  - name: name-distinctness
    form: "field/enum name lists are pairwise distinct (order NOT required — asks distinctness only)"
falsifiers:
  - name: tag-collision
    mutation: "give two constructors one tag byte"
    detects: "decoders that dispatch on something other than the tag"
  - name: kind-tag-drop
    mutation: "drop the kind tag from the pre-image (NEG-1 shape)"
    detects: "hash-input designs with cross-kind pre-image collisions"
checkers: [lean-decide, fast-check, manual]
claimCeiling: heuristic
---

# DISTINCTNESS

Distinct inputs remain distinct; no collision, no aliasing.

## Sites

- `experiments/entity-store-model/E2/Correspondence.lean:51-52` `tags_distinct` (13-constructor injectivity; comment names the family)
- `experiments/entity-store-model/E2/Obligations.lean:50,54` encode-injectivity; `:35,42` `directionA` / `kind_separation`
- `library/cas/Cas/Core/Address.lean:69` `addr_inj`; `library/cas/Cas/Core/Canonical.lean:75` `address_inj`
- `library/cas/Cas/Codec/Separation.lean:34-61` version/tag separation
- `library/cas/Cas/Schema/Ingest.lean:139-146` `distinctEnumNames` / `pairwiseNames`

## Positive examples

(pending curation)

## Negative examples

- NEG-1 kind-tag-drop pre-image collision — pinned, motivates M7, unproved
  (see [counterexamples.md](counterexamples.md) CX-001)

## Implication examples

(pending curation)

## Counterexample history

- CX-001 (NEG-1)

## Outcome history

- RUN-002 (2026-08-30, scout): Honest⇒Compatible chain selected
  (handoff items 2-3; `Honest.no_alias` + `encodeNode_injOn` are the
  held anchors) and the byte-scoped-injectivity discipline recorded
  (AG-3); one vacuous-premise variant REFUTED against the CX-001
  shape; see [../runs.md](../runs.md).

## Annotations

gpt-5.6-luna 2026-08-30, receipt `153e4e7b` (full JSON local). It
surfaced the schema/entity pre-image domain separation. Distilled:

- Template adds: `schema-entity-preimage-separation`
  (`preimageS(s) ≠ preimageE(a, v)` — domain separation between kinds
  of pre-image); `leading-version-separation` / `leading-kind-separation`
  (differing version/kind byte ⇒ differing encoding);
  `lookup-key-reflection`; `address-reflection-under-injective-hash`
  (with the injectivity PREMISE explicit).
- Falsifier adds: `version-byte-erasure`, `kind-byte-erasure`,
  `payload-omission` (omit a source field while keeping the type —
  NEG-1's generalization), `address-function-collapse` (constant
  address function — the M10-attack probe), `duplicate-field-name` /
  `duplicate-enum-name`.
- Open questions kept: should each constructor record whether it is
  unconditional, domain-restricted, or premise-conditional (the cited
  address theorems carry an injectivity premise)? Does "version and tag
  bytes never overlap" mean disjoint positions, disjoint values, or
  both? Field-name ordering is checked strictly at one site while the
  bank says order is NOT required — reconcile before constructing
  candidates there.

## Open questions

(none)
