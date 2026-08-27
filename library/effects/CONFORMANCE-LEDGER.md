# Conformance ledger

Generated from the obligation inventory and the instance registry; do not edit by hand. Regenerate with mise run gen:effects.

| ID | Status |
| --- | --- |
| CAS-001 | pending — CODEC instance at M2 |
| CAS-002 | pending — REJECTION-CLAUSE instance at M2 |
| CAS-003 | standing review rule |
| RPL-001 | pending — by carrier construction at M3 |
| RPL-002 | pending — TRACE-EXCLUDES instance at M3 |
| RPL-003 | pending — EXACT-STEP instance at M3 |
| RPL-004 | pending — FAIL-CLOSED instance at M3 |
| RPL-005 | pending — FAIL-CLOSED instance at M3 |
| SES-001 | pending — TRACE-EXCLUDES instance at M3 |
| CMP-001 | pending — HOMOMORPHISM instance at M5 |
| CMP-002 | pending — DISTINCTNESS instance at M3 |
| CMP-003 | deferred to M7 |
| CTX-001 | pending — TypeScript evidence at M4 |
| CTX-002 | pending — TypeScript evidence at M4 |
| ADM-001 | standing review rule |
| BRG-001 | pending — differential evidence at M3 |
| BRG-002 | pending — differential evidence at M6 |
| DUR-001 | standing review rule |

## CAS-001

Project-owned canonical node encoding has one byte representation per admitted node.

## CAS-002

Graph admission rejects dangling or wrong-kind references.

## CAS-003

Every address law is assigned to hash Level 0 or carries an explicit Level-1 hInj premise; no theorem occupies Level 2.

## RPL-001

Replay is deterministic for a fixed admitted state and request.

## RPL-002

Replay-mode decision traces never select live delegation, and replay construction has no live-service requirement.

## RPL-003

Matching consumes exactly the permitted occurrence.

## RPL-004

Mismatch fails closed.

## RPL-005

Completion rejects unconsumed suffix entries; the rejection carries the program's terminal so far.

## SES-001

Record-mode append failure aborts the session through the transport seam; histories are truthful prefixes, never gapped subsequences.

## CMP-001

Sequential interpretation threads replay state compositionally across success and typed-failure outcomes.

## CMP-002

Identical requests remain separate occurrences.

## CMP-003

Transparent and opaque policies have distinct, declared framed traces.

## CTX-001

Wrapped service construction supplies the same caller-facing interface without recursive lookup.

## CTX-002

Conforming orchestration cannot consult default Clock/Random behavior; replay-mode tripwires surface ambient use as a Violated outcome.

## ADM-001

G2 traceability distinguishes reified Lean-program quantification from discipline-conforming TypeScript orchestration.

## BRG-001

Model fixtures and the TypeScript reducer compare one declared normalized decision trace.

## BRG-002

The pinned Effect integration agrees on the enumerated domain.

## DUR-001

No exactly-once claim crosses the live-action/history-append crash gap.
