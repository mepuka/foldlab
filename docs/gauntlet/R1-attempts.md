# R1 climb log (append-only)

NOTE: this rung is COORDINATOR-EXECUTED at the operator's direction
(no external climber was fired). The adversarial separation is reduced
accordingly; compensating evidence: the frozen verifier predates the
harness, receipts are provider-reported token counts, and the operator
cross-checks verified spend against the Anthropic console.

attempt 1: authored go/cmd/realrun (controller/worker; journal file IS
the resume mechanism; caps enforced in code before every call; key
from env/.env, fail-closed, never logged) -> built clean; live run
pending. Workload: K=8 x L=6 x Q=20 = 960 logical steps; edits v1-v5 @
step5 (late), v6 @ step4, v7 @ step0 (early); structural physical
prediction 19/question = 380 calls, predicted reuse 2.526x against the
2.500x floor.

attempt 2: ran the controller live (kill at 61 receipts, resume to
completion) -> frozen verifier VERIFIED: logical=960, physical=380
(exactly the structural prediction), reuse=2.526x vs the 2.500x floor,
kills=1, zero re-buys on resume (RL2: no digest bought twice), spend
$0.160229 actual vs $0.478720 naive — $0.318491 eliminated by content
addressing, all recomputed from receipts at pinned prices. Journal head
23be3fc1...39a0.
