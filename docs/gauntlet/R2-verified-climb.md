# R2 — The Verified Climb (optimization rung)

COORDINATOR-OWNED. Status: SPEC DRAFT — awaiting ratification; verifier
not yet frozen. The first rung whose headline is an OPTIMIZATION result:
a population hill climb over inference-pipeline specifications, against
a real model API, on a real post-cutoff benchmark, where the bundle
proves the climb, the legality of every selection, and the spend
economics — from records alone.

## The claim under test

A population hill climb over K-candidate pipeline specs (mutation →
evaluate on dev → top-k select → repeat for G generations → one holdout
pass) can be run so that the exported bundle proves, without trusting
the operator: (1) the accuracy climb from seed to final, on dev AND on
a holdout split scored exactly once; (2) that every generation's
recorded survivors are exactly the top-k of verifier-recomputed scores
— the search trajectory itself is mechanical evidence, not a claim;
(3) that the content-addressed engine bought each distinct step exactly
once fleet-wide, re-buying only edit cones; and (4) what the search
actually cost in provider-receipt dollars versus what a naive evaluator
would have paid.

Positioning: DSPy/GEPA/OPRO-style prompt optimization exists; none of
it exports an auditable record. Their trajectories are log lines. Ours
is a hash-chained journal with priced receipts, and the selection rule
is a law the verifier re-runs.

## Benchmark (pinned, post-cutoff, mechanical)

67 integer-answer questions, pinned by corpus digest
`8ce15a57d0d8a6b8bba1efb7f04ceeb64358a8d2e8227c6651d90af8c9fae5f2`:

- `MathArena/aime_2026` — 30 questions (AIME 2026, Feb 2026)
- `MathArena/hmmt_nov_2025` — 21 integer-answer questions (Nov 2025)
- `MathArena/hmmt_feb_2026` — 16 integer-answer questions (Feb 2026)

All post-date Haiku 4.5's training data cutoff (Jul 2025, per
Anthropic's models page, checked 2026-08-12) — the contamination
critique does not apply to the primary leg. Competition problems are
competition-owned: the bundle carries the corpus DIGEST plus a fetch
script (HuggingFace datasets-server), never the problem text; the
verifier checks the locally fetched corpus against the pinned digest
before recomputing anything.

Scoring is exact match under a frozen dumb normalizer (trim; strip `$`,
commas, trailing period; accept a bare integer, else take the LAST
integer token). No LLM judges anywhere (RL7 unchanged).

Splits: a pinned stratified split, dev = 40, holdout = 27, recorded in
the manifest by question-id list BEFORE any search call is made.

## Calibration (recorded 2026-08-12, pre-spec probes)

Seed pipeline (4 steps: extract → plan → solve → answer, no thinking,
1600 max_tokens): **17/67 = 25.4%** (HMMT-Nov 5/21, AIME 9/30,
HMMT-Feb 3/16); 268 calls, $0.8129. Ceiling probe (single direct-solve
step, thinking budget 6000): **31/67 = 46.3%** (10/21, 17/30, 4/16);
67 calls, $1.9651. Failure profile clean: 4/335 truncations, zero
extraction misses. So the variant-expressible space contains ≥ +20.9
points over the seed, which prices the floors below.

Second leg calibrated the same day (gpt-5-mini-2025-08-07): seed
(reasoning minimal) **35/67 = 52.2%** (12/21, 19/30, 4/16), $0.5269;
ceiling (reasoning high) **50/67 = 74.6%** (16/21, 25/30, 9/16),
$1.4425. Headroom +22.4 points — the +10 floor is conservative on both
legs. Total calibration spend: $4.7474.

Stated plainly: all probes touched all 67 questions, including the
future holdout, with the seed and ONE hand-written strong variant per
leg. The
holdout law governs the search run's record (the SEARCH never sees
holdout scores until after final selection); calibration informed floor
placement only. Probe artifacts: `artifacts/calibration/r2/`.

## Workload (pinned shape, content within it chosen at dispatch)

A candidate is a pipeline spec: L ≥ 4 ordered step specs, each
`{template, model, thinking_budget, max_tokens}`. The candidate digest
is H over the canonical spec. Work digest of a step-execution =
H({model, step-spec digest, upstream result digests}) — the FULL step
spec is in the preimage (calibration lesson: identical templates with
different thinking configs are different work; R1's template-only
preimage is insufficient here).

Search: population K ≥ 6, generations G ≥ 4, over the 40-question dev
split. Mutations are LLM-proposed (the mutation call is itself a
journaled, receipted, digest-addressed fact) or drawn from a pinned
move set; every candidate must trace to the seed through recorded
mutation facts. Selection: top-k by dev exact-match score, ties broken
by lexicographic candidate digest. After the final generation: exactly
one holdout pass over the final survivor.

Fleet: ≥ 4 workers race the evaluation of each generation; shared step
digests are claimed through the fenced register (lookup-before-claim,
RG-A discipline) so no digest is ever bought twice, fleet-wide.

Logical steps = Σ over generations of K × 40 × L ≥ 3,840. Physical
calls = distinct work digests only; the delta is the reuse headline.

## Laws (RL1–RL7 inherited; CL1–CL5 new, to be frozen in the verifier)

- RL1–RL7 as in R1: chain + canonical bytes; economy (physical ==
  distinct digests, no digest two receipts); receipts price everything
  at manifest micro-USD prices under the hard cap; the headline
  recomputed from the record, never read from the manifest; ≥ 1 hard
  kill mid-run with zero re-buys on resume; caps enforced in code
  before every call; the verifier proves record consistency and
  arithmetic, never output quality.
- CL1 score recomputation: every dev/holdout score is recomputed by the
  verifier from journaled outputs against the pinned labels under the
  frozen normalizer; corpus digest must match the manifest.
- CL2 selection legality: for every generation, the recorded survivor
  set equals the top-k of the verifier-recomputed dev scores under the
  pinned tie-break. A search that peeked, rerolled, or hand-picked
  cannot produce a consistent record.
- CL3 holdout-once: no holdout-split work digest appears in the journal
  before the final selection fact; exactly one holdout evaluation, of
  exactly the recorded final survivor.
- CL4 mutation provenance: every non-seed candidate carries a recorded
  mutation fact naming its parent candidate digest; LLM-proposed
  mutations carry receipts like any physical call.
- CL5 fleet economy: RL2 restated fleet-wide — across all workers, no
  work digest has two receipts; register fence tokens are exported as
  evidence of the claim discipline.

## Floors

- Final dev score ≥ seed dev score + 10 points (calibration showed
  +20.9 reachable); holdout final > holdout seed (both recomputed).
- Reuse factor ≥ 3.0x (naive K×G×Q×L pricing vs actual, verifier-
  computed — must beat R1's static 2.526x).
- ≥ 3,840 logical steps; ≥ 1 hard kill with zero re-buys; ≥ 4 workers
  with every worker having claimed work.
- Spend ≤ the operator cap. Primary model: `claude-haiku-4-5-20251001`
  (prices pinned 1/5 micro-USD per token). Operator cap at dispatch;
  default $15.00.

## Second leg: OpenAI

Same spec, model `gpt-5-mini-2025-08-07` (pinned snapshot; prices 250 /
2000 nano-USD per token, re-verified at dispatch). Chosen over the
newer 5.4-mini deliberately: gpt-5-mini's training data predates the
entire corpus (released 2025-08-07; corpus is Nov 2025+), so the
contamination-immunity claim holds on BOTH legs without caveat.
Reasoning effort is part of the step spec (minimal ↔ high is the
gpt-5 analog of the Haiku thinking budget) and therefore in the work
digest preimage. Requests to api.openai.com are permitted for this leg
only.

## Security protocol (standing, non-negotiable)

As R1: keys provisioned by the OPERATOR in the environment or repo
`.env` only (`ANTHROPIC_API_KEY`, `OPENAI_API_KEY`) — never pasted in
chat, never committed, never printed, never in bundles. Requests to
api.anthropic.com (and api.openai.com for the second leg) only. Fail
closed: missing key = clean refusal; cap reached = clean stop, bundle
exported as-is and marked partial. Receipts carry token counts and
model ids, never request contents beyond digests.

## Non-goals

Output quality beyond exact match (RL7); semantic acceptors and
cross-run reuse (still a later rung); speculation (R7/RG-C); provider
quality comparisons (the nondeterminism lab owns that) — the OpenAI leg
is an economics replication, not a model shootout.
