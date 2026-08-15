# The referee engine: make TyX executable and emit the first golden vectors

BLOCKED ON: `05-tyx-referee-grills.md` — all three rulings ratified.

## Why now

The active lane (estate-focus grill record F4): the Lean model referees
every restatement of the `flb.type.v0` grammar, killing the drift
engine — the grammar restated ~6× in Go and ~4× in TS with divergent
defaults, which already produced the union-path defect. The 2026-08-15
audit enumerated exactly what is missing; this issue is that list,
ordered so each item has a checkable deliverable.

## Scope (the ten items, ordered)

1. Concrete catalog: `List (String × Ty)` with lookup, a W4
   acyclicity predicate, a depth function; prove it instantiates the
   abstract `Resolver` so the existing theorems transfer.
2. Fuel closure: fuel-monotonicity lemma and a computable sufficient
   bound with `conforms ρ (fuelBound ρ t) t j = true ↔ Conforms ρ t j`
   — after this, no emitted verdict is fuel-relative.
3. `Repr` + `DecidableEq` for the mutual types (`TyX/FieldsX/MembersX`,
   `Json/JsonList/JsonObj`).
4. UTF-16 code-unit comparator on `String`, matching `walk.go` and
   RFC 8785.
5. RFC 8785 canonical serializer in Lean, scoped per the ratified
   numerics ruling.
6. Syntax extension per the ratified `check.args` ruling.
7. `normalize : Ty → Ty` — recursive, canonical-byte member sort —
   with idempotence and meaning preservation (the congruence lemma
   lifting `sort_preserves_meaning` to the whole tree). Unlocks the
   normalization vector family.
8. `parse : Json → Except Refusal Ty` (+ partial variant) with the
   Refusal model (kind/law/path) and the full WF boundary. The largest
   item — a Lean twin of `walk.go`. Unlocks the parse-verdict family.
9. Conformance verdicts under the ratified semantics ruling. Unlocks
   the conformance family.
10. Emission harness: a `lake exe` target writing the vector files,
    canonical bytes out (consumers hash), provenance line per file.

Split into multiple board issues at the natural seams (1–3, 4–6, 7,
8, 9–10) if one issue is too large; the order is the dependency order.

## Acceptance (mechanical)

- `verify/ir/run.sh` still passes with every new theorem inside the
  axiom guard; extend the gate with the moves-style axiom-footprint
  check over the new headline lemmas.
- The first vector set is committed with provenance, and a consumer
  test in `proto/go` AND `proto/ts` reads it and passes.
- Gate teeth: perturb one vector, the consumer test fails; the
  demonstration is in the closing report.
- Every vector file states its scope exclusions (from the grills) in
  one provenance line.

## Out of scope

Code generation from the model (F3: generation waits for the vectors
to show where it pays); touching `walk.go`/`codegen.ts` beyond adding
the vector-consuming tests — a divergence a vector exposes is a
FINDING, reported with the vector as the minimized counterexample,
stopped on.

## Pointers

`docs/research/2026-08-15-model-audit-findings.md` IR-1..IR-5;
`verify/ir/`; `proto/go/protod/{walk,normalize}.go`;
`fixtures/jcs-rfc8785.json` (the serializer's oracle rows).
