# R2 climb log (append-only)

NOTE: like R1, this rung is COORDINATOR-EXECUTED at the operator's
direction unless an external climber is fired. Compensating evidence:
verifier frozen before the harness, receipts provider-reported,
operator console cross-check.

attempt 0 (calibration, 2026-08-12, pre-spec): built the pinned
integer-answer corpus (67 questions: aime_2026 30, hmmt_nov_2025 21,
hmmt_feb_2026 16; sha256 8ce15a57...ae5f2) from MathArena via the
HuggingFace datasets-server. Seed pipeline (extract→plan→solve→answer,
no thinking) scored 17/67 = 25.4% — 268 calls, $0.8129, 0 errors.
Ceiling probe (direct solve, thinking budget 6000) scored 31/67 =
46.3% — 67 calls, $1.9651. Headroom +20.9 points inside the
variant-expressible space; floors set at +10. Lesson pinned into the
spec: the work digest preimage must carry the FULL step spec
(template + model + thinking_budget + max_tokens), not template+model
alone — the two probes differ only in config and are different work.
Probe artifacts: artifacts/calibration/r2/ (no problem text — corpus
by digest + fetch script only).

attempt 0b (calibration, second leg, 2026-08-12): operator provisioned
OPENAI_API_KEY; model pinned gpt-5-mini-2025-08-07 (training data
predates the corpus — contamination immunity holds on both legs).
Seed (reasoning_effort minimal) 35/67 = 52.2%, 268 calls, $0.5269.
Ceiling (reasoning_effort high) 50/67 = 74.6%, 67 calls, $1.4425.
Headroom +22.4 points. Two operational lessons pinned: (1) client
timeouts shorter than a high-effort reasoning call turn into
billed-but-unrecorded retry cycles — the R2 harness owes generous
per-call timeouts, and the console cross-check is the compensating
control for the undercount; (2) the ceiling run was killed twice
mid-flight (timeout patch, then a session restart) and resumed both
times with zero re-buys — RL5 exercised incidentally, 45/67 facts
served from the journal on the second resume. Prices pinned in
nano-USD per token (gpt-5-mini 250/2000) because sub-micro rates
don't fit integer micro units. Total calibration spend both legs:
$4.7474.
