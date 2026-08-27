# Conformance ledger

Generated from the obligation inventory and the instance registry; do not edit by hand. Regenerate with mise run gen:effects.

| ID | Status |
| --- | --- |
| CAS-001 | instantiated (CODEC) |
| CAS-002 | instantiated (REJECTION-CLAUSE) |
| CAS-003 | standing review rule |
| RPL-001 | discharged — carrier construction (step\_iff\_reduce) |
| RPL-002 | instantiated (TRACE-EXCLUDES) |
| RPL-003 | instantiated (EXACT-STEP) |
| RPL-004 | instantiated (FAIL-CLOSED) |
| RPL-005 | instantiated (FAIL-CLOSED) |
| SES-001 | instantiated (TRACE-EXCLUDES) |
| SES-002 | instantiated (WF-PRESERVE) |
| CMP-001 | instantiated (HOMOMORPHISM) |
| CMP-002 | instantiated (DISTINCTNESS) |
| CMP-003 | deferred to M7 |
| CTX-001 | evidenced — TypeScript evidence (test/ReplaySession.test.ts) |
| CTX-002 | evidenced — TypeScript evidence (test/ReplaySession.test.ts) |
| ADM-001 | standing review rule |
| BRG-001 | evidenced — differential suite (test/ReplayReducer.test.ts) |
| BRG-002 | pending — differential evidence at M6 |
| DUR-001 | standing review rule |

## CAS-001

Project-owned canonical node encoding has one byte representation per admitted node.

**Sentence:** Canonicalization is idempotent, canonical values round-trip, and the encoding is injective on canonical forms — every admitted CAS node has exactly one byte representation: canonicalization is the identity on the admitted-node carrier, the decoder accepts nothing outside the encoder image, and trailing bytes are rejected.

## CAS-002

Graph admission rejects dangling or wrong-kind references.

**Sentence:** Admission rejects exactly the raw values a named clause condemns, and every rejection names its clause — a CAS node enters the store only when every typed reference resolves at its declared kind: a reference to an unbound address is rejected as dangling, and a reference whose declared kind tag disagrees with the resident node's kind tag is rejected as wrong-kind.

## CAS-003

Every address law is assigned to hash Level 0 or carries an explicit Level-1 hInj premise; no theorem occupies Level 2.

## RPL-001

Replay is deterministic for a fixed admitted state and request.

## RPL-002

Replay-mode decision traces never select live delegation, and replay construction has no live-service requirement.

**Sentence:** In replay mode, no step ever emits a live-delegation decision — replay is hermetic: whether a live adapter was requested is a projection of the decision trace, and in replay mode that projection is empty by law, never by luck.

## RPL-003

Matching consumes exactly the permitted occurrence.

**Sentence:** When the emitted invocation matches the entry at the cursor, one reducer step advances the cursor by exactly one — a matching request consumes exactly the permitted occurrence: never zero, never two.

## RPL-004

Mismatch fails closed.

**Sentence:** When request-side compatibility at the cursor fails, the step rejects with a typed mismatch category and the cursor is unchanged — a mismatch fails closed: it consumes nothing, names its category, and is terminal for the attempt; nothing falls through to a live adapter.

## RPL-005

Completion rejects unconsumed suffix entries; the rejection carries the program's terminal so far.

**Sentence:** When completion arrives before the cursor reaches the history length, the step rejects with the unconsumed-suffix category and the cursor is unchanged — the rejection carries the program's terminal so far, so a same-looking final value cannot hide a recorded action that was never re-emitted.

## SES-001

Record-mode append failure aborts the session through the transport seam; histories are truthful prefixes, never gapped subsequences.

**Sentence:** In an aborted session, no step ever emits an occurrence-append decision — a record-mode append failure aborts the session structurally, nothing appends past the failure, and histories stay truthful prefixes, never gapped subsequences.

## SES-002

Every reducer step preserves session-state well-formedness.

**Sentence:** On every input, one reducer step from a well-formed session state yields a well-formed session state — the cursor stays inside the history, and record mode keeps it pinned to the history length.

## CMP-001

Sequential interpretation threads replay state compositionally across success and typed-failure outcomes.

**Sentence:** Interpretation respects return and sequential bind across both outcome cases — sequential interpretation threads the replay session state compositionally: a returned value consumes nothing, a nested program continues from exactly the state its prefix reached, and both halting cases — the program's own typed failure and the session's typed rejection — short-circuit carrying the state they stopped at, so the cursor neither resets nor forks across composition; the recorded outcome envelope reaches the leaf continuation on both channels, so recovery fires exactly as it did live.

## CMP-002

Identical requests remain separate occurrences.

**Sentence:** Two occurrences with identical invocation content remain distinct occurrence positions — the store deduplicates request nodes while the history keeps entries distinct; position is the occurrence identity, and every append claims a fresh one.

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
