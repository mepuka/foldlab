---
id: REJECTION-CLAUSE
version: 2
carriers:
  - "node admission (AdmissionError)"
  - "schema ingestion (IngestRefusal)"
  - "word-log marks"
applicability:
  - "Does the operation refuse some inputs? Is every refusal named and typed?"
  - "Is there a completeness claim — everything bad is refused, everything refused is bad?"
templates:
  - name: refusal-soundness
    form: "check(x) = error(e) ⇒ clause(e) condemns x"
  - name: refusal-completeness
    form: "(∃ clause condemning x) ⇒ check(x) = error — the two-sided pair with soundness (PT-002)"
  - name: doors-agree
    form: "the Lean door and the host door refuse exactly the same inputs with corresponding reasons (LAW SM-19)"
falsifiers:
  - name: unnamed-refusal
    mutation: "refuse via a generic throw instead of a typed clause"
    detects: "refusals invisible to the completeness proof"
  - name: fail-open-door
    mutation: "accept an unregistered identifier (MRK018 shape)"
    detects: "doors whose refusal list silently lags the registry"
checkers: [lean-decide, byte-gate, fast-check]
claimCeiling: heuristic
---

# REJECTION-CLAUSE

Invalid input refused loudly, with a typed reason.

## Sites

- `library/cas/Cas/Core/Admission.lean:26-33,60,108,137` `AdmissionError`, `checkRefs_ok_iff`, `checkRefs_error_condemns` / `checkRefs_complete`
- `library/cas/Cas/Backend/Admission.lean:138-153,334` `refusalName` / `refusals_complete` — "LAW SM-19: the two doors are held in agreement"
- `library/cas/Cas/Schema/Ingest.lean:~120-146` `IngestRefusal` (`unguardedCycle`, `unknownDeclaration`, …)
- `library/effects/test/CasStore.test.ts:196` CAS-002 "consumes every ratified REJECTION-CLAUSE row structurally" — byte gate
- `library/effects/test/WordLog.test.ts:309,338` mark-reuse / edited-mark refusals

## Positive examples

(pending curation)

## Negative examples

(pending curation)

## Implication examples

(pending curation)

## Counterexample history

- CX-006 (phantom store — an admission door that silently creates)

## Outcome history

(no scout runs yet)

## Annotations

gpt-5.6-luna 2026-08-30, receipt `d836dc3e` (full JSON local). Distilled:

- Precision catch on PT-002's completeness half: `checkRefs_complete`
  proves existence of SOME error, not that the returned error is the
  particular condemning clause — the two-sided pair is
  soundness-of-the-returned-clause + existence-of-refusal, weaker than
  "the right clause fires". Candidates should state which form they
  claim.
- Template adds: `refusal-registry-coverage` (every `IngestRefusal`
  constructor appears in the refusals table);
  `refusal-name-distinctness` (`Nodup(map refusalName refusals)`);
  `word-log-refusal` (duplicate/edited marks refuse by name).
- Falsifier adds: `generic-ingest-throw` (typed refusal replaced by an
  untyped throw), `collapse-door-names` (two refusal constructors, one
  name — defeats door agreement by name), `accept-unguarded-cycle`,
  `accept-duplicate-word-mark` / `accept-edited-word-mark`.
- Negative-example adds: constructor-only cycle with no `susp` guard
  (vs the admitted suspended self-reference — the CX-005 pair, both
  sides).

## Open questions

- PDD-3's lesson (CX-005): a door may decide CONSTRUCTIBILITY while its
  prose claims PRODUCTIVITY. Scout runs on doors should always ask "what
  exactly does this door decide?" before proposing completeness candidates.
