---
id: CODEC
version: 2
carriers:
  - "AdmittedNode bytes"
  - "schema Ast"
  - "blob manifest"
  - "program table (cross-host address agreement)"
applicability:
  - "Is there an encode/decode pair, a canonical byte form, or a printed/parsed surface?"
  - "Must two hosts compute the same bytes/address for the same value?"
templates:
  - name: round-trip
    form: "decode(encode(x)) = ok(x) on the admitted domain"
  - name: non-malleability
    form: "encode is injective — one byte representation per admitted value"
  - name: exact-decode
    form: "decode(b) = ok(x) ⇒ encode(x) = b (no tolerant decoding)"
  - name: canon-idempotent
    form: "canon(canon(v)) = canon(v) — and canon is NOT merely an involution (F-40)"
falsifiers:
  - name: palindromic-duplicate-keys
    mutation: "feed a duplicate-key record that byte-compares equal to its own re-canonicalization"
    detects: "an involution posing as idempotence (F-40/F-41 shape)"
  - name: tolerant-decode
    mutation: "make decode accept a non-canonical spelling"
    detects: "exact-decode obligations missing from the suite"
checkers: [byte-gate, fast-check, lean-decide]
claimCeiling: heuristic
---

# CODEC

Round-trip, exact decode, canonical bytes, idempotent re-encode.

## Sites

- `library/cas/Cas/Codec/NodeCodec.lean:248,268,288` `decode_encodeNode`, `encodeNode_injOn` ("one byte representation per admitted node"), `decodeAdmitted_encodeAdmitted`
- `library/cas/Cas/Schema/Codec/Laws/Mutual.lean:590-609` mutual round-trip laws
- `library/effects/test/CasStore.test.ts:173` CAS-001 "consumes every ratified CODEC row structurally" — byte gate
- `library/effects/test/Programs.test.ts:1-25` THE CROSS-HOST CODEC GATE — Lean-vs-TS program address agreement
- `library/effects/test/blob/Blob.test.ts:125` blob-manifest codec
- `library/effects/test/SchemaMaterialization.test.ts:85-100,341` `expectLossless` — seeded fast-check property (numRuns 25, seed 20260829)
- Arbitrary source: `library/effects/src/cas/Value.ts:218-280` (ContentId arbitrary)

## Positive examples

(pending curation)

## Negative examples

- The F-40 palindromic duplicate-key record
  (see [counterexamples.md](counterexamples.md) CX-003)

## Implication examples

(pending curation)

## Counterexample history

- CX-003 (F-40/F-41 involution-not-idempotence)

## Outcome history

- 2026-08-30 RUN-001 (demonstration): see [../runs.md](../runs.md)

## Annotations

gpt-5.6-luna 2026-08-30, receipt `6d312134` (full JSON local). Distilled:

- Template adds: `closed-decode` (a successful decode consumed the
  WHOLE input — no trailing bytes); split `cross-host-byte-agreement`
  from `cross-host-address-agreement` (bytes and addresses drift
  independently); `exact-representation` stated decode-side
  (`decode(b) = some x ⇒ b = encode(x)`).
- Falsifier adds: `append-trailing-byte`, `roundtrip-field-loss` (drop /
  reorder / alter one encoded field), `reject-valid-encoding` (the
  completeness direction — decoder refusing an admitted encoding),
  `cross-host-byte-drift` / `cross-host-address-drift`.
- Scoping catch, kept as open question: for `AdmittedNode` the cited
  surface makes canonicalization the identity and puts canonicality in
  decoder EXACTNESS — `canon-idempotent` applies only to codecs that
  define a non-trivial canon (the F-40 carrier did; scope per carrier).
- Also kept: injectivity vs exact-decode are distinct obligations —
  don't conflate "one byte form per value" with "decoder accepts only
  the canonical spelling"; declare which checker discharges which
  constructor.

## Open questions

(none)
