---
id: FAIL-CLOSED
version: 3
carriers:
  - "AdmissionError / Except channel"
  - "word-log receipts (put + receipt fail together)"
  - "schema ingestion refusals"
applicability:
  - "Can the operation fail, be interrupted, retried, or replayed?"
  - "Would a partial admission (state mutated, receipt missing) be observable?"
templates:
  - name: error-condemns
    form: "check(x) = error(e) ⇒ e condemns x (the error names a real violation)"
  - name: error-complete
    form: "x violates some clause ⇒ check(x) = error (nothing bad slips through)"
  - name: success-implies-receipt
    form: "put returns success ⇒ its receipt is appended; a receipt failure fails the put. NOT the biconditional: the tested law permits bytes to remain after a receipt failure as an observable crash-recovery state, with the later duplicate carrying a permanent receipt gap (corrected from the ⇔ form by luna annotation 2026-08-30, receipt d7d27a16, against WordLog.test.ts)"
falsifiers:
  - name: accept-unknown
    mutation: "accept an unregistered identifier instead of failing (MRK018 shape)"
    detects: "a decoder/door that fails open"
  - name: drop-receipt
    mutation: "commit state but skip the receipt append"
    detects: "observers that cannot tell a torn write from an admitted one"
checkers: [fast-check, byte-gate, word-equality, manual]
claimCeiling: heuristic
---

# FAIL-CLOSED

Failure, interruption, retry, replay leave no partial admission.

## Sites

- `library/cas/Cas/Core/Admission.lean:49,88,108,137,152,156` `checkRefs`, `.Condemns.not_refsOk`, `checkRefs_error_condemns` / `_complete`, `admitNode_error_condemns` / `_complete` — the two-sided rejection pair (pattern PT-002)
- `library/effects/test/WordLog.test.ts:98` "a put whose receipt fails FAILS TOGETHER"; `:309,338` mark-reuse / edited-mark refusals
- `library/effects/test/blob/MutationRed.test.ts:10` + `test/blob/mutants/MRK018_GuessUnknownRecipe.ts` — mutation-kill gate for fail-open decoding
- `library/effects/test/SchemaVerdicts.test.ts` ADMISSION clause — refusal must arrive through the failure channel; a defect counts as disagreement
- Crash-safety probe: `.staging/operational-structure/BACKEND-ROBUSTNESS.md` (2097/2097 verified post-SIGKILL; host-side gaps named there)

## Positive examples

(pending curation)

## Negative examples

- CX-012 (2026-08-30, decide-checked): run-level refusal does NOT
  preserve the word — a two-line table whose first put succeeds and
  whose second line refuses returns the GROWN word. Fail-closed is a
  per-step law (the refusing step admits nothing); it is never
  run-level rollback, because the store is grow-only. State
  interruption/replay candidates prefix/frame-shaped, never as
  `w' = w` over a whole run.

## Implication examples

(pending curation)

## Counterexample history

(none yet)

## Outcome history

- RUN-002 (2026-08-30, scout): the receipt-failure retry square
  proposed as a fixture (handoff item 12 — blocked on a
  failure-injection seam for `writer.putBytes`/`wordLog.append`,
  flagged); refusal-preserves-word decomposition selected (item 6);
  the premature-put `DanglingReference` refusal checker-witnessed
  (probe P1b → CX-011); see [../runs.md](../runs.md).
- RUN-002 post-run (same day, proving lane): item 6's WHOLE-RUN form
  REFUTED by decide-checked witness → CX-012 and the negative example
  above; the per-line head forms stay `proposed`, re-homed to the
  Defun frame group.

## Annotations

gpt-5.6-luna 2026-08-30, receipt `d7d27a16` (full JSON local,
`annotate/out/family-fail-closed-*.json`). Its repo read reached the
WordLog receipt-gap test, MRK018, and BACKEND-ROBUSTNESS. Distilled:

- **Correction accepted into frontmatter**: `atomic-with-receipt` was a
  biconditional the tested law does not support; now
  `success-implies-receipt` (see frontmatter).
- Template adds: `no-receipt-replay` (after a receipt failure, a
  retry answers duplicate, writes no bytes, appends no receipt);
  `oversize-frame-answers` (an oversized request frame gets an explicit
  refusal or terminal result, never silence).
- Falsifier adds: `swallow-receipt-error`, `skip-receipt-on-success`,
  `heal-gap-on-retry` (a retry that back-fills the missing receipt),
  `drop-oversize-response`.
- Negative-example adds: bytes written + receipts plane BackendFailure;
  oversized frame logged then dropped without a client answer.
- Open questions kept: does silent oversized-frame loss belong to
  FAIL-CLOSED or a separate transport-liveness family? Should the 282
  durable-admissions-without-acknowledgement (BACKEND-ROBUSTNESS) be
  tracked here so long as re-put is idempotent?

## Open questions

- BACKEND-ROBUSTNESS found the HOST not live-safe (oversized frames
  silently lost). Is there a FAIL-CLOSED candidate there the store-level
  theorems cannot see? Scout material for the daemon fix pass.
