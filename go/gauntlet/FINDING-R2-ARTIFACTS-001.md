# FINDING-R2-ARTIFACTS-001 — both recorded R2 bundles violate ratified laws

Status: OPEN, stopped before artifact repair. Found while making GitHub #58's
R2 gate executable against the verifier-owned corpus pin.

## Reproduction

Fetch the competition-owned corpus through the checked-in, digest-checking
recipe, then run the public verifier:

```text
cd go
go run ./cmd/climb fetch ../artifacts/receipts/r2-001
cp ../artifacts/receipts/r2-001/corpus.json ../artifacts/receipts/r2-002/corpus.json
go run ./cmd/climbverify ../artifacts/receipts/r2-001
go run ./cmd/climbverify ../artifacts/receipts/r2-002
```

The fetched canonical corpus is 67 questions at the verifier-owned SHA-256
`8ce15a57d0d8a6b8bba1efb7f04ceeb64358a8d2e8227c6651d90af8c9fae5f2`.
The two independent refusals are:

```text
r2-001: hardness floor not met (GV8): winner holdout 5 < seed holdout 6 + 1
r2-002: selection refused (CL2/CL3): ... holdout receipt precedes the final selection
```

The same two refusals reproduce on the pre-hardening `72afae43d` verifier, so
they were not introduced by the external corpus anchor or its new controls.

## Bound

This finding says only that the two committed R2 record bundles do not support
the frozen R2 claim under their real, pinned corpus. It does not weaken the
verifier, change a floor, change the holdout-once law, or infer why the
producer emitted either record.

The negative-controls workflow now reconstructs and pins the corpus and runs
both bundles, but accepts only these exact known-red classifications. A bundle
passing or failing differently makes the workflow fail. Thus GitHub #58's
coverage void is closed without presenting either invalid bundle as verified.

## Disposition required

The coordinator must choose between producing new bundles that genuinely meet
the frozen laws, or explicitly amending the R2 claim. Editing recorded facts,
weakening the holdout gain floor, or accepting an early holdout receipt would
destroy the evidence and is not an executor repair.
