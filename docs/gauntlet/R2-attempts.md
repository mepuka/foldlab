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

ratification (2026-08-12): operator accepted the six mechanization
pins as recommended (derived split, k_survivors in manifest, typed
journal facts with CL3 by chain position, provider-agnostic candidate
encoding with opaque params, R1-convention economics, floors in
counts). Spec marked RATIFIED.

verifier frozen (2026-08-12): go/gauntlet/climb.go + cmd/climbverify.
CL1-CL5 mechanical on top of the RL discipline; self-test fabricates a
consistent 64-logical-step bundle (2 generations, population 3,
survivors 2, derived 4/2 split) and proves each tamper class refuses
with its named law: swapped survivors -> CL2; holdout receipt moved
before the final selection -> CL3; orphaned mutation -> CL4; forged
output text -> CL1 (result digest binds text to chain); split flip ->
plan refusal; single-owner ledger -> CL5; raised gain floor -> floor
refusal. R2 floors pinned by test (a change is a spec amendment).
Fixture surprise worth keeping: shared step-0 templates deduped
across candidates AND splits (26 physical for 64 logical, 2.46x on a
toy), caught by the verifier before the coordinator's own arithmetic —
the discipline outran its author. DISPATCH UNBLOCKED: next is the
harness (go/cmd/climb), K=6/G=4/k=2 over the 40-question dev split,
operator cap $15.

attempt 1 (harness, 2026-08-12): built go/cmd/climb (controller /
worker / fetch). The worker is a deterministic replay engine: every
run replays the climb from generation 0, serving recorded facts out of
the journal-backed register (lookup-before-claim, 4 racing worker
goroutines + a mutator owner) and buying only missing digests — that
is what makes the hard kill resumable with zero re-buys. Design pins
worth recording: (1) every mutation proposal yields EXACTLY one child
(deterministic params-bump repair on unparseable/duplicate proposals),
because the verifier refuses receipts demanded by nothing; (2) the
target-step schedule ([2,3,3,2,3] gen 1, [2,3,3,3] after) prices the
edit cones for the 3.0x reuse floor; (3) proposal validation caps
thinking at 6000 / max_tokens at 12000 — tighter than the manifest cap
— so a maximal cone cannot trip the spend law mid-run; (4) a claim
landing between receipt and ledger line is reconciled at resume, so
the ledger stays one-claim-per-receipt across kills. Dry-run: `climb
run <dir> --fake` uses a deterministic offline provider whose fake
corpus embeds its answers and whose mutated templates carry a success
bias, so the rehearsal genuinely climbs — the frozen verifier PASSED
the fake bundle at the FULL R2 floors, $0 spent: logical 4216 (the
spec's exact arithmetic), physical 1179, reuse 3.575x, dev 3->9,
holdout 3->11, kill at 350 journal lines, resume served 344 facts with
zero re-buys, 5 owners. `climb fetch` (Go, RFC 8785) reproduced the
pinned corpus digest byte-for-byte against the live datasets-server —
canonicalization IS python's sort_keys+compact+utf-8 encoding, so one
canonicalizer serves both languages.

attempt 2 (first real dispatch, 2026-08-12, REFUSED): Haiku leg at
artifacts/receipts/r2-001, K=6/G=4/k=2, $15 cap. Kill at 353 journal
lines mid-gen-1; resume replayed gen 0 to the identical 9/40 and
finished with zero re-buys. 1218 receipts, $5.7880 (logical 4216 →
reuse 3.46x, above floor). The climb worked on dev: 9/40 → 13 → 15 →
17 → 18/40, a +9 gain (floor +4). The frozen verifier REFUSED at the
holdout gain law: winner holdout 5/27 vs seed 6/27, needed ≥ 7. Every
structural law passed — the refusal is the TRANSFER law, which is the
floor doing exactly its job. Diagnosis (from the record): not
truncation (2/27 step-2 max_tokens stops, same as the seed and as
dev); winner spec is thinking 5000 at the solve step + a tightened
256-token extraction step, lineage greedy four deep (the gen-1 winner
parented every later winner). The ceiling probe predicts ~12.6/27 for
thinking-at-solve on these holdout tiers; the winner's 45% dev is at
ceiling while its 18.5% holdout is far below — reading: the winner's
dev score is an argmax over ~21 noisy 40-question estimates and is
optimistically biased, and the 27-question holdout drew low on top of
it. Also recorded: the proposer echoed the prompt's <<<>>> delimiters
into two templates (cosmetic; the record hashes what ran). The refused
bundle is kept as evidence; corpus.json stays out of git (spec:
digest + fetch script are the corpus reference). Lesson for attempt 3:
the search needs selection-bias resistance (e.g. deeper final-round
evidence or diversity pressure), not a reroll — dice have no place in
the lane.

attempt 3 (second real dispatch, 2026-08-12, REFUSED — and the
refusal found a SPEC BUG): seed r2-002 (fresh derived split), harness
changes from attempt 2's lesson: proposals with thinking must leave
>= 2000 visible tokens, and the mutation prompt states the calibrated
optimum (thinking 5000-6000 at solve, max_tokens comfortably above,
extraction-proof final step). Bundle at artifacts/receipts/r2-002:
1216 receipts, $6.8718, kill at 350 lines, resume zero re-buys. The
climb CLEARED BOTH GAIN FLOORS: dev 9/40 -> 15/40 (+6, steadier than
attempt 2's inflated 18 — the gen-3 champion survived gen 4 unbeaten),
holdout 8/27 -> 12/27 (+4, needed +1). The frozen verifier REFUSED at
CL3: the winner's holdout step-3 row for hmmt_nov_2025-17 resolves to
a receipt at journal position 218, before the final selection at 1076.
From the record: the winner's step-2 output on that holdout question
is the EMPTY STRING (thinking ate the whole budget; stop=max_tokens),
and in gen 1 the same empty text arose on DEV question
hmmt_feb_2026-13 under candidates sharing the step-3 spec — identical
input digest + identical step spec = identical work digest, so the
content-addressed engine (correctly, per RL2) served the holdout row
from a dev-bought receipt, and CL3 as frozen reads any pre-selection
receipt under a holdout row as peeking. The law misfires on legitimate
content-address sharing: the receipt was demanded by six dev rows
across gens 1-4 and leaked nothing about the holdout question. This
false-refusal mode triggers whenever any intermediate text repeats
across splits (empty outputs make it common), independent of operator
honesty. Proposed amendment (needs ratification): CL3 refined — a
holdout row may resolve to a pre-final-selection receipt IFF that
receipt is also demanded by at least one dev row; holdout-ONLY
receipts before the final selection still refuse. Attempt 2 stays
refused under the amendment (it failed the gain floor, a real miss) —
the discipline distinguishes.

research synthesis (2026-08-12): three commissioned reports landed in
docs/research/ (selection-under-noise, prompt-transfer-gap,
evolutionary-pipeline-search), plus an operator-side citation check on
the bandit lineage. They correct this log and indict the floors:

- CORRECTION to attempt 2's diagnosis: the argmax bias is +4.1
  QUESTIONS (~+10 points), double what the entry above estimated.
  Attempt 2's dev 18/40 is consistent with a true ~14/40, making its
  5/27 holdout an unremarkable draw — not even bad luck.
- The floors are noise-dominated at n=40/27. With 21 candidates all
  truly equal to the seed, one clears the +4 dev floor 88% of the
  time; the +1 holdout floor passes a genuinely +10-point winner only
  75% of the time; a +4 holdout floor would refuse a +12.5-point
  pipeline 51% of the time. Between our two real attempts, the
  stronger dev evidence (18/40, null p~2.8%) failed transfer and the
  weaker (15/40, p~38.6%) passed — the record demonstrates its own
  gates' noise.
- Deepest cause (p1, arXiv 2604.08801, measured on our exact corpus):
  on AIME, variance among responses dominates variance among prompts —
  much of what a hill climb on this benchmark climbs is generation
  noise. A second 2026 paper (arXiv 2604.14585, Haiku 4.5) finds half
  of prompt-optimization runs score below zero-shot on held-out data.
- Both greedy four-deep lineages are GEPA's documented failure mode;
  its Pareto-sampling ablation is worth +6.4 aggregate. The late-step
  mutation bias has NO quality evidence behind it — it is pure cone
  economics; nothing in the literature runs at G=4 (generations, not
  population, are R2's outlier axis and the cheap one under reuse).
- Standing caution: the last-integer normalizer is an unmeasured
  false-positive channel a mutation can attack; attempt 2's winner
  ("tightened 256-token extraction") had exactly that shape. Guard: a
  second stricter normalizer, both scores exported.

Amendment package awaiting ratification (frozen artifacts change only
by ratified amendment): (A) CL3 refined — holdout rows may resolve to
pre-selection receipts iff also dev-demanded (the attempt-3 misfire);
(B) verifier exports paired discordance (b,c), exact p, and Wilson
intervals — integer floors become stated statistics; (C) replicate
scoring (k>=3 on finalists; replicate index in the work-digest
preimage keeps it honest distinct work under RL2/CL5); (D) selection
law upgraded from raw argmax (Pareto or noise-aware; still
mechanically recomputable, CL2 stays a law); (E) needs no amendment:
k_survivors 2->3 within manifest bounds; seed dev scored twice under
two eval seeds to measure decoding variance before buying anything
else.
