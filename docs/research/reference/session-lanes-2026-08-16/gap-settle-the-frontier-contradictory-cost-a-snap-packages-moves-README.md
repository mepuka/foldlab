# @foldlab/moves

The E2 move calculus as a TypeScript kernel, walled against the Lean
model that proves its laws.

Three moves — `fill`, `dispute`, `decide` — over holes whose meaning is
`open | filled | disputed | decided`. Fills are total: a conflict
absorbs into a holder-attributed candidate set instead of refusing or
overwriting. Candidate sets are joins (commutative, associative,
idempotent), so over the fill/dispute wire fragment the terminal state
is a function of the intent **bag**, never of arrival order. `decide`
is the one order-sensitive move and enters only through a fence at
close.

## The wall

`verify/moves` proves seventeen headline laws of this calculus in Lean
(no `sorry`, core axioms only). This package does not inherit those
proofs — it earns its correspondence differentially, Cedar-style:

- `fixtures/moves-conformance.ndjson` is emitted by **executing the
  model** (`cd verify/moves && lake exe oracle emit 2000`). Line one is
  the provenance; the model gate regenerates and byte-compares the file
  on every run.
- `test/conformance.test.ts` replays all 2000 vectors through this
  kernel and demands byte-identical verdicts — receipts, reversed bags,
  journal evidence, fence choices, all of it. Zero skips.
- `test/mutants.test.ts` proves the wall can fail: five planted
  law-dropping mutants each die against the corpus.
- `test/laws.property.test.ts` restates the frozen spec L1–L8 as
  fast-check properties.

Exact bounds are in root `VERIFICATION.md` ("TS move-calculus kernel ≡
Lean model").

## The API is the laws

Every convenience is a proved theorem wearing a function signature:

| Function | Law it inherits |
| --- | --- |
| `replay(intents)` / `sessionDigest(intents)` | terminal state and digest are functions of the intent bag (`runRepairK_perm`) |
| `merge(a, b)` | sync is bag union — no vector clocks, no ordering metadata (L2/L3) |
| `willAdmit(state, move)` | total public refusal prediction, an iff against `D85Refusal` (L5) |
| `provenance(state, hole)` | every offer ever made, holder-attributed, complete (`runRepairK_fill_pair`, L1) |
| `close(state, hole, fence)` | any sound pair-set rule is schedule-free (`fence_deterministic`, L4); `soundFence` wraps the one obligation |
| receipts from `runRepairK` | one admitted/refused bit per intent, aligned (L6/L7) |
| `decided` stability | no later move revises a decision (L8) — decided holes cache forever |

## Run

```bash
bun test
```
