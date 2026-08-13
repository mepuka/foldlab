# FINDING-G07 — R2 deterministic mutation provenance has no external anchor

Status: **CONFIRMED, NOT REPAIRED**. This is a findings-before-fixes stop.

The R2 contract permits a non-seed candidate to arise either from an
LLM-proposed mutation (which owes a receipt) or from a pinned deterministic
move set. `mutation.via` carries the receipt digest in the first case, but the
bundle and verifier carry no identifier or digest for the second case. Any
non-empty, non-hex string is consequently accepted as if it named a pinned
move.

Minimized corruption: take the honest synthetic R2 bundle and replace every
mutation `via` with `"manual"`; leave candidates, selections, receipts, plan,
outputs, ledger, and corpus unchanged. The bundle still verifies.

The preserved red probe is build-tagged so ordinary repository gates remain
usable:

```text
cd go
go test -tags gauntlet_findings ./gauntlet -run TestFindingG07UnpinnedManualMutationPasses -count=1
```

Observed at base `abbdda96b3bc74cd02a193097b606615df24efe7` plus the
G-01..G-05 repairs:

```text
--- FAIL: TestFindingG07UnpinnedManualMutationPasses
    FINDING-G07: unpinned manual mutation provenance accepted: <nil>
FAIL
```

Disposition needed before a repair: either pin and externally anchor a finite
move-set vocabulary/digest, or require every mutation to name a receipt. A
prefix convention such as `move:*` alone would only rename the same
self-assertion and is not an independent anchor.

G-08 was investigated separately and is not the same defect. `stop` is
strictly decoded and hash-chain-bound, so a truncated call is distinguishable
in the record. The ratified laws score whatever output was received and do
not claim every call reached `end_turn`; refusing `max_tokens` would invent a
new completion law and contradict the recorded R2 attempts, which explicitly
include legal `stop=max_tokens` outputs.
