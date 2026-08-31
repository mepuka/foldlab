---
id: AGREEMENT
version: 4
carriers:
  - "interpreter pairs (embedded vs defunctionalized)"
  - "Lean model vs TS host (doors, vectors, words)"
  - "independent parser/extractor legs"
  - "MCP host vs spec executable"
applicability:
  - "Do two independent implementations answer the same question?"
  - "Is their agreement asserted somewhere, and on which exact observation?"
templates:
  - name: observation-agreement
    form: "∀ admitted input v: observe_A(v) = observe_B(v) (byte-identical where possible)"
  - name: replay-agreement
    form: "every recorded vector replays on the other lane: same admission order, same addresses"
  - name: pinned-disagreement
    form: "a KNOWN divergence is pinned as an expected-failure test; an accidental fix must retire the pin explicitly (PT-003)"
falsifiers:
  - name: same-source-legs
    mutation: "let both legs read one shared copy of the data they are supposed to compute independently"
    detects: "agreement by accident (the R11 split-brain shape, inverted)"
  - name: observation-narrowing
    mutation: "compare on a projection (counts, not contents)"
    detects: "agreement claims wider than the compared observation"
checkers: [byte-gate, word-equality, fast-check]
claimCeiling: heuristic
---

# AGREEMENT

Two independent lanes agree on every declared observation.

## Sites

- `library/cas/Cas/Lang/Defun.lean:359-363` `runP_embed_agree`
- `library/cas/Cas/Backend/Mcp.lean:441-446` `toPProg_ofPProg` — "THE AGREEMENT: the two spellings coincide"
- `library/effects/test/ConformanceVectors.test.ts:27-49` every vector replays: same admission order, same addresses
- `library/effects/test/SchemaVerdicts.test.ts:1-30` THE DISAGREEMENT VECTOR + pinned `knownDisagreements`
- `library/effects/test/McpHost.test.ts:9-13` `assertAgreement` vs `lake exe mcpspec`
- `experiments/lift-harness/test/T4-property.test.ts:84,151` engines byte-identical on generated + mutated programs; gate `experiments/lift-harness/src/gate.ts:184`

## Positive examples

(pending curation)

## Negative examples

- Store-equal ⇏ word-equal (RUN-002, proposed BY THE MODEL as a
  non-theorem): equal `toStore` projections of two words do not imply
  the words are equal without an additional receipt/order premise —
  the word is a per-host observation; only stores merge. Candidates
  crossing this boundary are malformed, not merely unproved.

## Implication examples

(pending curation)

## Counterexample history

- CX-007 (word-count divergence, OPEN at review time; fixed 2026-08-30)
- CX-008 (R11 split-brain — agreement by accident)

## Outcome history

- RUN-002 (2026-08-30, scout): byte-level restore-inclusion and
  closure-local observational agreement selected (handoff items 9-10);
  the store/word boundary non-theorem banked above; see
  [../runs.md](../runs.md).

## Annotations

gpt-5.6-luna 2026-08-30, receipt `4ec229d9` (full JSON local). It
independently converged on the open CX-007 shape. Distilled:

- Template adds: `status-and-word-agreement` (compare BOTH run
  status and the final word, not one projection);
  `replay-order-address-agreement` (per-position admission order AND
  address); `byte-roundtrip-agreement` (loaded payload bytes and refs,
  not just the address); `representation-agreement`
  (`toPProg(ofPProg p) = some p` on well-formed tables); and
  `pinned-disagreement` as an executable form (`∀ v ∈
  knownDisagreements: observe_A(v) ≠ observe_B(v)` until retired).
- Falsifier adds: `duplicate-admission` (host appends a binding for
  every put line including duplicates the model dedupes — EXACTLY
  CX-007, proposed blind); `drop-final-word-check` (compare status/
  counts only — the observation-narrowing disease made concrete);
  `payload-byte-change` (address unchanged, bytes changed);
  `rejection-as-throw`.
- Open questions kept: every agreement instance must DECLARE its
  observation (status, word, bytes, refs, order, verdict channel,
  frames); pins should record cause, scope, and retirement condition
  machine-checkably; re-check the Programs.ts working-tree diff before
  using the duplicate-handling example as current evidence.

## Open questions

- The open CX-007 divergence: `.staging/algebraic-review/word-store.md:340-367`
  records Lean deduping on the `.duplicate` arm while TS `runProgram`
  pushes unconditionally, with a green test asserting the divergence.
  `library/effects/src/cas/Programs.ts` + its test sit modified in the
  working tree as of 2026-08-30; diff inspected at the grill (same day):
  the edit adds a `PLine.WF` admission gate (byte/nat32 bounds) at
  `putProgram`, `programAddress`, and `runProgram`, and does not touch
  the duplicate-word arm. RESOLVED same day on operator order ("if it's
  obviously a bug then fix it"): `CasStoreShape` gained `putOutcome` —
  the model's `Cas.PutOutcome`, with `put` kept as its address
  projection so the generated vector runners and every call site stand
  — and `runProgram` appends only on `fresh`; the divergence-asserting
  test was replaced by law tests (word = store-relative admissions;
  re-run word empty). The reviewer's naming ruling — emission word vs
  admission word — remains the operator's.
