# The dev→holdout gap in prompt/pipeline optimization

Research memo, 2026-08-12. Occasioned by R2 attempt 2 (dev 9/40 → 18/40,
holdout 5/27 vs seed's 6/27 — the transfer floor refused it) and attempt 3
(dev +6, holdout +4 — both floors cleared). Question: what does the
literature actually know about when optimized prompts transfer, and what
does our 40/27 split let us conclude? Primary sources only; every claim
carries a URL. Binomial arithmetic worked out explicitly and stated in
questions, not just percentages.

---

## TL;DR

1. **Almost no prompt-optimization paper reports a train-vs-test gap.**
   OPRO is the exception and it reports 5–20 points
   (https://arxiv.org/html/2309.03409v3, §5.4). EvoPrompt, APE, and
   Promptbreeder report none; EvoPrompt's BBH dev set is drawn *from the
   test set*. GEPA reports the gap only as an unlabelled bar in Figure 16.
2. **The 2026 replication literature is brutal and it used our model.**
   "Prompt Optimization Is a Coin Flip" ran 72 optimization runs on Claude
   Haiku 4.5: 49% score *below* zero-shot; train/test gaps up to +5.6 pts;
   optimization is "statistically indistinguishable from random selection"
   (https://arxiv.org/abs/2604.14585).
3. **Competition math is the adversarial case.** `p1` decomposes the search
   signal into variance-among-responses and variance-among-system-prompts
   and finds that on AIME the first dominates: AIME is "remarkably less
   sensitive to the system prompt"
   (https://arxiv.org/html/2604.08801). On our corpus the thing we are
   hill-climbing is mostly generation noise.
4. **Our arithmetic.** One holdout question = 3.70 pts. SEM on 27 questions
   at 30% is 8.8 pts (2.4 questions). A **+4 net gain on 27 paired
   questions cannot reach p<0.05 under any discordance pattern** — the
   best case (b=0, c=4) is p=0.125; you need a net +6 with zero
   regressions. Meanwhile the **+4-of-40 dev floor is cleared ~88% of the
   time by a population of 21 candidates that are all no better than the
   seed**, purely by argmax.
5. **The floors are the right *shape*** — both are gains over the seed on
   the same split, so split-difficulty (SD ≈ 11 pts on a random 40/27 cut
   of 67 questions) cancels — **but they are set at levels the sample size
   cannot referee.**

---

## 1. What the literature actually measures

### 1.1 The one classical optimizer paper that reports a number

**OPRO**, "Large Language Models as Optimizers"
(https://arxiv.org/abs/2309.03409, full text
https://arxiv.org/html/2309.03409v3) has a dedicated §5.4, "Overfitting
Analysis in Prompt Optimization":

- Optimization scores on a small training sample: **3.5% of the GSM8K
  training split** (≈260 examples); **20% of BBH** with the remaining 80%
  as test.
- The gap, stated: "our training accuracies are often 5%-20% higher than
  our test accuracies" (Tables 7 and 10).
- They admit "we do not set aside a validation set in our default setting".
  The defense is co-monotonicity, not absence of overfitting: with an
  equal-sized validation set "the validation accuracy curves trend up and
  down alongside the training curves" (Figure 11), so argmax-on-train still
  ranks correctly.
- Their own mitigation: "Setting aside a larger training set and optimizing
  for fewer steps (early stopping)".

Note what OPRO does *not* say: it never frames the small-sample score as
*noisy*. Its variance language (§5.2.3) is about decoding temperature. The
"score is noisy" framing has to come from elsewhere (§1.4 below).

### 1.2 What everyone else reports: nothing

| system | dev/val size | final selection | train-vs-test gap reported |
|---|---|---|---|
| OPRO (https://arxiv.org/abs/2309.03409) | 3.5% GSM8K / 20% BBH | argmax on train sample | **yes, 5–20 pts** |
| EvoPrompt (https://arxiv.org/abs/2309.08532) | 200 (classification), 100 (generation), 50 (BBH) | "We pick the prompt with the highest score on the development set" | no |
| APE (https://arxiv.org/abs/2211.01910) | adaptive filtering, size not stated in main text | moving-average survivor | no numeric gap |
| Promptbreeder (https://arxiv.org/abs/2309.16797) | "a batch of 100 Q&A pairs" per fitness eval | argmax on fitness | no |
| MIPRO (https://arxiv.org/abs/2406.11695) | 500 train / 500 dev / **2k test** | best full-eval candidate | separate test reported; no gap analysis |
| GEPA (https://arxiv.org/abs/2507.19457) | 150 train / 300 val / 300 test (HotpotQA, HoVer); 111/111/221 (PUPA) | best aggregate on `D_pareto` (= val) | **figure only** (Fig. 16), no number |

Two methodological flags worth carrying:

- **EvoPrompt's BBH dev set is sampled from the test set** — "We sample a
  subset from the test set as the development set" (§4.4,
  https://arxiv.org/html/2309.08532v3). Those numbers are not a clean
  held-out measurement.
- **APE admits its selected instructions overfit the selection condition**:
  instructions chosen zero-shot degrade few-shot — "selected instructions
  overfit the zero-shot learning scenario" — and on TruthfulQA "our results
  are not 'true few-shot learning'". It also records a reward-hacking
  observation: filtered instructions that merely echo the input scored near
  perfect (https://ar5iv.labs.arxiv.org/html/2211.01910).

**GEPA's Pareto argument is about the search trajectory, not the final
answer.** It is commonly misread. GEPA's per-instance Pareto frontier
decides *which candidate to mutate next*; after the budget is exhausted it
"returns the candidate with the best aggregate performance on D_pareto" —
i.e. the returned program *is* the best-on-validation candidate. The
anti-greedy claim: "A naive approach is to always select the best-performing
candidate, but this often traps the optimizer in a local optimum"
(§3.1, https://arxiv.org/html/2507.19457v2#S3.SS1). The ablation is
substantial — Pareto sampling gives **+12.44%** aggregate improvement vs
**+6.05%** for greedy best-candidate selection and **+5.11%** for beam
search N=4 (Table 3, Qwen3-8B, evolution harness held fixed). GEPA's
minibatch size is **3** (Appendix E.4), and "the majority of GEPA's rollout
budget is spent on validation".

The word "overfit" appears exactly once in the GEPA paper, and approvingly
(§5.1, inference-time search, scare quotes theirs). There is no warning
about overfitting the feedback or validation set.

### 1.3 Published sizing guidance

DSPy's guidance is the only concrete numeric doctrine from a framework. It
has been **delisted from the live site** (`/learn/optimization/overview/`
now HTTP-meta-redirects to `/getting-started/gepa-optimization/`; see the
redirect map at
https://raw.githubusercontent.com/stanfordnlp/dspy/main/docs/mkdocs.yml).
The markdown still lives in `main`:

- https://github.com/stanfordnlp/dspy/blob/main/docs/docs/learn/optimization/overview.md
  — "you can often get substantial value out of 30 examples, but aim for at
  least 300 examples"; and the split doctrine: "we recommend an unusual
  split compared to deep neural networks: 20% for training, 80% for
  validation", because "prompt-based optimizers often overfit to small
  training sets". They separately tell you to build a held-out test set *in
  addition to* the development set.
- https://github.com/stanfordnlp/dspy/blob/main/docs/docs/learn/optimization/optimizers.md
  — MIPROv2 wants "40 trials or more" and "200 examples or more to prevent
  overfitting". This is the only explicit numeric overfitting threshold in
  the docs.
- The strongest framework statement anywhere is DSPy-GEPA's runtime warning
  (https://github.com/stanfordnlp/dspy/blob/main/dspy/teleprompt/gepa/gepa.py):
  reusing the trainset as valset "makes GEPA overfit prompts to the provided
  trainset"; "In order to ensure generalization and perform well on unseen
  tasks, please provide separate trainset and valset."
- MIPROv2's implementation defaults
  (https://github.com/stanfordnlp/dspy/blob/main/dspy/teleprompt/mipro_optimizer_v2.py):
  `minibatch_size = 35`, `MIN_MINIBATCH_SIZE = 50` (minibatching only
  engages above a 50-example valset), auto-split hard-codes the 20/80 ratio,
  and the auto presets are light `val_size:100` / medium `300` / heavy
  `1000`.

The statistics side gives a much larger number. Miller's *Adding Error Bars
to Evals* (https://arxiv.org/abs/2411.00640, full text
https://ar5iv.labs.arxiv.org/html/2411.00640) runs the power analysis and
concludes **"new evals should contain at least 1,000 questions"**, from a
worked example needing ≈969 questions to detect a 3-point difference at 80%
power. `tinyBenchmarks` (https://arxiv.org/abs/2402.14992) is the optimistic
counterpoint — "it is sufficient to evaluate this LLM on 100 curated
examples", with "estimation error within 2% on all benchmarks with 100
examples or less" — but those 100 are IRT-selected, not a random draw. A
random 100 does not buy 2%.

Our dev=40 / holdout=27 is below every one of these numbers.

### 1.4 The 2026 replication literature

**"Prompt Optimization Is a Coin Flip: Diagnosing When It Helps in Compound
AI Systems"** (https://arxiv.org/abs/2604.14585, v1 Apr 2026, v2 May 2026)
is the closest published analogue to our setup — same model family, same
order of magnitude of dev set.

- Setup: 6 methods (APE, OPRO, EvoPrompt, PromptBreeder, DSPy-style
  bootstrap, PROSE) × 4 tasks × 3 repeats = 72 runs on **Claude Haiku 4.5**;
  **20 training questions, 100 held-out test**; 18,000 grid evaluations.
- Headline: "49% score below zero-shot"; "optimization is statistically
  indistinguishable from random selection" (binomial p=0.91). Per-task
  average gains: HelpSteer2 **+6.8 pts**, Feedback-Bench −0.20, WildBench
  −0.82, XSum −0.17.
- The sentence that describes our attempt 2 exactly: "with only 20 training
  questions, per-candidate scores are too noisy for reliable selection, and
  iterative methods overfit (train-test gaps up to +5.6 pts)". Non-iterative
  APE "shows none".
- Their diagnostic: optimization "helps only when the task has exploitable
  output structure: a format the model can produce but does not default
  to", plus a headroom pre-test ("if best gain >> 2 pts over zero-shot,
  optimize"). They flag that the 2-point threshold is calibrated to their
  setup.

**"Why Prompt Optimization Works, and Why It Sometimes Doesn't — A
Causal-Inspired Edit-Level Analysis"** (https://arxiv.org/abs/2605.26655)
studies DSPy/MIPROv2, TextGrad and GEPA across 11 benchmarks and 5
backbones, over 2,095 pairwise prompt comparisons (DSPy) plus 17,708
(TextGrad/GEPA). Findings: "prompt revisions that improve one benchmark
frequently fail to transfer to another"; edit effects are **task-conditioned
with no universally generalizing family** — complexity-increasing and
meta-instruction edits are *negatively* associated with mathematical
performance (ACMGD = −0.103), while step-by-step and meta-cognitive edits
help logical and sequential tasks. They report no aggregate transfer-failure
rate.

### 1.5 The variance-decomposition account — and it names our corpus

**`p1`: Better Prompt Optimization with Fewer Prompts**
(https://arxiv.org/abs/2604.08801, Gao et al., Apr 2026) is the most
directly load-bearing paper for R2, because its evaluation set is *our*
corpus: AIME 24/25/26, HMMT Nov 2025, HMMT Feb 2026.

It decomposes the reward variance across candidate system prompts into
**variance among responses** (generation stochasticity) and **variance among
system prompts** (actual prompt quality), and states the criterion plainly:
"Prompt optimization succeeds when variance among system prompts is
sufficiently large, but fails when variance among responses dominates."

On AIME the second term is the small one — "AIME is remarkably less
sensitive to the system prompt, with variance being dominated by the
stochasticity of the generation process itself"
(https://arxiv.org/html/2604.08801). Two consequences they demonstrate:

- **More questions can make the signal worse.** "as K increases, the
  variance among system prompts decreases for both AIME and IFBench" —
  because on a heterogeneous set different questions favour different
  prompts, averaging washes out the prompt term. "simply adding more user
  prompts does not strengthen the optimization signal".
- **Training on two well-chosen AIME-24 questions beat training on the whole
  set**, and beat GEPA on transfer (Table 1): AIME 25 54.01% vs GEPA's
  46.87% and full-dataset RL's 47.24%; AIME 26 62.24% vs 54.22% vs 54.58%;
  HMMT Nov 2025 45.42% vs 40.26%; HMMT Feb 2026 29.40% vs 27.04%. Their
  reading: "GEPA tends to memorize the training set, whereas p1 is more
  likely to discover transferable behaviors."

### 1.6 Distributional overfitting: prompts get longer and narrower

**TextReg** (https://arxiv.org/abs/2605.21318) defines *prompt
distributional overfitting* as optimization reducing training loss "while
increasing" the out-of-distribution gap, and traces it to prompts that
"become longer, accumulate narrow sample-specific rules, and generalize
poorly beyond the training distribution". Their inefficiency measure is
multiplicative in length — `I(p) = |p|_tok · (1 − s̄(p))` — so "longer
prompts magnify the impact of low-scope rules". Evidence: on
Phi-3.5-Mini-Instruct, REVOLVE "underperforms CoT on all six datasets" OOD
while improving on train; TextGrad reaches 38.0% train vs 33.1% on the
harder OOD variant of Logical Deduction (7obj). Splits are 50/100/100
train/val/test, 12 optimization iterations = 36 training samples total.

GEPA independently notes the mechanism without calling it overfitting: it
accumulates detail across iterations, and length-aware proposers are
proposed as regularization.

---

## 2. Four mechanisms behind a transfer failure

These are distinct and our record can, in principle, tell them apart.

### 2.1 Selection bias — the winner's curse (a property of argmax, not of prompts)

Scoring N candidates on one fixed set and returning the max is *adaptive
data analysis*. Dwork et al. (https://arxiv.org/abs/1411.2664) establish
that standard estimators are "limited to a linear number of estimates" when
queries are adaptive — a holdout of size n supports ~O(n) adaptive queries
before the estimates stop meaning anything; only differentially-private
mechanisms buy exponentially more. The leaderboard analogue is Blum & Hardt
(https://arxiv.org/abs/1502.04585): participants "may begin to overfit to
the holdout data that supports the leaderboard", and existing defenses are
"poorly understood heuristics". Zrnic & Fithian
(https://arxiv.org/abs/2411.18569) name it directly for model selection:
"cherry-picking the best candidate leads to the winner's curse: the observed
performance for the winner is biased upwards, rendering conclusions based on
standard measures of uncertainty invalid."

This mechanism produces a transfer gap **even when every candidate is
genuinely identical**. §3.5 prices it for R2.

### 2.2 Proxy overoptimization (Goodhart)

Gao, Schulman & Hilton (https://arxiv.org/abs/2210.10760) fit the
gold-reward curve as a function of `d = sqrt(KL(π‖π_init))`:
`R_bon(d) = d(α − β·d)` for best-of-n and `R_RL(d) = d(α − β·log d)` for RL
— both rise, peak, and fall while the *proxy* keeps climbing. (They were
"unable to obtain a satisfactory fit" for the proxy curve itself, so cite
the gold form only.) Karwowski et al.
(https://arxiv.org/abs/2310.09144) prove the general statement for MDPs —
"increasing optimisation of an imperfect proxy beyond some critical point
decreases performance on the true objective" — and, usefully for us, derive
"an optimal early stopping method that provably avoids the aforementioned
pitfall". Early stopping of a search loop is a principled move, not a
heuristic.

For R2 the proxy is *dev exact-match score* and the true objective is
*pipeline quality*; four generations of greedy descent down one lineage is
exactly the shape that overshoots.

### 2.3 Scorer and format exploitation

Distinct from selection bias: the candidate genuinely improves the *measured
quantity* by attacking the measuring instrument. This one does **not**
produce a dev/holdout gap (it transfers perfectly) — it produces an invalid
headline, which is worse.

- Format alone moves accuracy enormously. FormatSpread
  (https://arxiv.org/abs/2310.11324) reports "performance differences of up
  to 76 accuracy points when evaluated using LLaMA-2-13B" between
  semantically-equivalent formats, "~10 accuracy points on average across
  50+ tasks", and a median spread of 6.4 points with GPT-3.5 over 320
  formats × 53 tasks; "20% of tasks consistently result in a spread of at
  least 15 accuracy points". Their conclusion is that format choice "puts
  into question the methodological validity of comparing models with an
  arbitrarily chosen, fixed prompt format", and — the transfer point —
  "format performance only weakly correlates between models".
- Prompt paraphrase can invert a leaderboard: *State of What Art?*
  (https://arxiv.org/abs/2401.00595), 6.5M instances / 20 LLMs / 39 tasks,
  on the brittleness of single-prompt evaluation.
- Rule-based graders false-negative at scale. TinyV
  (https://arxiv.org/abs/2505.14625): "over 38% of model-generated responses
  suffer from false negatives" on Big-Math-RL-Verified; fixing the verifier
  "boosts pass rates by up to 10%".
- Scoring convention alone reorders models. lm-evaluation-harness
  (https://arxiv.org/abs/2405.14782), Table 1: Mistral-7B on ARC-Challenge
  goes 50.1% (cloze) → 72.4% (MMLU-style), while Falcon-7B goes the *other*
  way, 40.2% → 25.9%.

**Our exposure.** R2's normalizer accepts a bare integer, "else take the
LAST integer token" (`docs/gauntlet/R2-verified-climb.md`). That is a rule a
mutation can attack: a final step that emits only the integer, or that
appends the answer after any prose, gains score without gaining
mathematics. Attempt 2's winner carried "a tightened 256-token extraction
step" — the shape of exactly this move. Integer-only answers cap the
false-negative risk far below TinyV's LaTeX-equivalence setting, but "last
integer token" is a *false-positive* channel (an answer trailing a stray
number), and it is unmeasured in the bundle.

### 2.4 Task-conditioned edits

Even a real improvement may be real *only for this task family*. 2605.26655
finds no universally generalizing edit family; TextReg finds the improvement
is carried by narrow sample-specific rules. Our tiers (AIME / HMMT-Nov /
HMMT-Feb) differ in difficulty, and the derived split does not stratify
*within* a tier by problem type.

---

## 3. The binomial arithmetic for dev=40 / holdout=27

Everything below treats a score as a sum of Bernoulli trials, which is the
convention MathArena itself uses for our corpus: "we treat each answer as a
Bernoulli trial with parameter p̂ and compute variance as p̂(1−p̂)/N, where N
is the number of questions" (https://arxiv.org/html/2505.23281v2). Miller's
recommendation 1 is the same formula in sample-variance form,
`SE = sqrt(Var(s)/n)` (https://ar5iv.labs.arxiv.org/html/2411.00640).

**Granularity first.** One holdout question = **3.70 points**. One dev
question = **2.50 points**. There is no such thing as a 2-point measurement
on this corpus; the grid does not have that resolution.

### 3.1 The standard error of one score

`SEM = sqrt(p(1−p)/n)`:

| p | SEM at n=27 | in questions | SEM at n=40 | in questions | SEM at n=67 |
|---|---|---|---|---|---|
| 20.0% | 7.70 pts | 2.08 | 6.32 pts | 2.53 | 4.89 pts |
| 22.5% | 8.04 pts | 2.17 | 6.60 pts | 2.64 | 5.10 pts |
| 30.0% | 8.82 pts | 2.38 | 7.25 pts | 2.90 | 5.60 pts |
| 37.5% | 9.32 pts | 2.52 | 7.65 pts | 3.06 | 5.91 pts |
| 45.0% | 9.57 pts | 2.59 | 7.87 pts | 3.15 | 6.08 pts |

A ±1 SEM band on the holdout is ±2.4 questions. The R2 holdout floor
(+1 question) is **0.4 SEM**.

### 3.2 Our actual scores, with intervals (Wilson 95%)

| score | rate | Wilson 95% | width |
|---|---|---|---|
| r2-001 seed holdout 6/27 | 22.2% | [10.6, 40.8] | 30.2 pts |
| r2-001 winner holdout 5/27 | 18.5% | [8.2, 36.7] | 28.5 pts |
| r2-002 seed holdout 8/27 | 29.6% | [15.9, 48.5] | 32.6 pts |
| r2-002 winner holdout 12/27 | 44.4% | [27.6, 62.7] | 35.1 pts |
| seed dev 9/40 | 22.5% | [12.3, 37.5] | 25.2 pts |
| r2-002 winner dev 15/40 | 37.5% | [24.2, 53.0] | 28.7 pts |
| r2-001 winner dev 18/40 | 45.0% | [30.7, 60.2] | 29.5 pts |
| calibration seed 17/67 | 25.4% | [16.5, 36.9] | 20.4 pts |
| calibration ceiling 31/67 | 46.3% | [34.9, 58.1] | 23.2 pts |

Every holdout interval is ~30 points wide. **The calibration seed and the
calibration ceiling — the two probes that priced the +10 floor — have
overlapping 95% intervals on 67 questions** ([16.5, 36.9] vs [34.9, 58.1]
just barely clear each other). The 20.9-point headroom is a real effect at
n=67 (unpaired power 73%), but only just.

### 3.3 The paired comparison — the right test, and its ceiling

Seed and winner run the *same* questions, so the correct statistic is the
paired one. Miller's recommendation 4 is explicit: conduct inference "on the
question-level paired differences, rather than the population-level summary
statistics", with
`SE_paired = sqrt(SE_A² + SE_B² − 2·SE_A·SE_B·Corr)` — "using paired
differences will reduce the variance of the estimator by 1/3 in relative
terms" at correlation 0.5, which he calls free variance reduction. For
binary scores the exact version is the sign test on discordant pairs
(McNemar): let `b` = seed-right/winner-wrong, `c` = seed-wrong/winner-right,
net gain = `c − b`, exact two-sided `p = 2·P(X ≤ min(b,c) | b+c, ½)`.

**With zero regressions (b = 0), the minimum significant net gain is 6
questions — on any n.** The 27-question holdout cannot do better:

| b (regressions) | c needed for p<0.05 | net gain | net in points |
|---|---|---|---|
| 0 | 6 | +6 | 22.2 pts |
| 1 | 8 | +7 | 25.9 pts |
| 2 | 10 | +8 | 29.6 pts |
| 3 | 12 | +9 | 33.3 pts |

Applied to what we actually observed:

- **Attempt 3's holdout +4 (8/27 → 12/27) cannot reach p<0.05 under any
  discordance pattern.** Best case b=0, c=4: **p = 0.125**. If the winner
  lost even one question the seed got (b=1, c=5): p = 0.219. b=2, c=6:
  p = 0.289.
- Attempt 2's dev +9 (9/40 → 18/40) *is* significant paired, and robustly
  so: b=0 → p=0.0039; b=3, c=12 → p=0.0352; it only fails past b=5
  (p=0.064). **But it is the selected maximum**, which is precisely the
  case where a nominal p-value is invalid (Zrnic & Fithian,
  https://arxiv.org/abs/2411.18569).
- Pooling dev+holdout after the fact (67 questions) is the only combination
  that reaches significance: attempt 3 winner 27/67 vs seed 17/67, net +10,
  is p=0.031 at b=4/c=14 and p=0.053 at b=6/c=16. Attempt 2 winner 23/67 vs
  seed 15/67, net +8, is p=0.039 at b=2 but p=0.077 at b=4. **The bundle
  does not currently export b and c**, so neither p-value is recomputable
  from the record today.

### 3.4 How many questions would be needed

Unpaired two-proportion, 80% power, α=0.05 two-sided,
`n = (z_{α/2}+z_β)²·(p₁(1−p₁)+p₂(1−p₂))/Δ²`, per arm:

| baseline | Δ | n per arm (unpaired) | n paired, ψ=0.30 |
|---|---|---|---|
| 22.5% | 2 pts | 7,051 | 5,884 |
| 22.5% | 5 pts | 1,173 | 939 |
| 22.5% | 10 pts | 309 | 233 |
| 22.5% | 20 pts | 82 | 56 |
| 30.0% | 5 pts | 1,374 | — |
| 45.0% | 5 pts | 1,562 | — |

(Paired column uses `n = (z_{α/2}√ψ + z_β√(ψ−δ²))²/δ²` with discordance
rate ψ = 0.30. Pairing buys ~20–30%, matching Miller's "1/3 in relative
terms". It does not buy an order of magnitude.)

This reproduces Miller's number independently: he computes ≈969 questions
for a 3-point difference and concludes evals should carry **at least 1,000
questions** (https://ar5iv.labs.arxiv.org/html/2411.00640). **A 2–5 point
delta at 20–45% accuracy needs on the order of 1,000–7,000 questions. It is
not resolvable on 27, on 40, on 67, or on any corpus we can afford.** What
*is* resolvable at n=27–67 is a 20-point delta — which is exactly the size
of the calibration headroom, and exactly why the +10-point dev floor was the
right order of magnitude to pick.

Power of the splits we actually have:

| comparison | n | Δ | unpaired power |
|---|---|---|---|
| 22.2% → 30.0% | 27 | 7.8 pts | 10.0% |
| 30.0% → 44.0% | 27 | 14.0 pts | 19.0% |
| 22.5% → 32.5% | 40 | 10.0 pts | 17.2% |
| 22.5% → 45.0% | 40 | 22.5 pts | 59.1% |
| 25.4% → 46.3% (calibration) | 67 | 20.9 pts | 73.4% |

### 3.5 The winner's curse, priced for R2

Attempt 2's record shows the winner was the argmax over ~21 dev evaluations.
Take the pure null: **every candidate is truly identical to the seed at
22.5%**, each scored once on the same 40 questions. `E[max of K iid
Binomial(40, 0.225)]`, computed exactly from order statistics:

| K | E[best observed dev] | inflation | in questions |
|---|---|---|---|
| 6 | 31.05% | +8.55 pts | 3.42 |
| 12 | 33.62% | +11.12 pts | 4.45 |
| **21** | **35.50%** | **+13.00 pts** | **5.20** |
| 30 | 36.62% | +14.12 pts | 5.65 |
| 50 | 38.14% | +15.64 pts | 6.26 |

Two consequences, and they are the sharpest numbers in this memo.

**(a) The +4-of-40 dev floor is a null-model formality.** With 21 candidates
all no better than the seed, `P(at least one reaches 13/40)` — the floor —
is **88.0%**. At K=6 it is 45.4%; at K=30, 95.1%. The dev floor as written
does not distinguish a climb from an argmax.

**(b) But attempt 2's dev score was not pure luck.** `P(one candidate ≥
18/40 | p=22.5%)` = 0.134%, so `P(≥1 of 21)` ≈ **2.8%**. Attempt 2's 45%
dev sits 9.5 points *above* the null-model argmax expectation — some of that
climb was real. Attempt 3's 15/40 = 37.5% sits only 2.0 points above the
null expectation, and `P(≥1 of 21 ≥ 15/40 | p=22.5%)` = **38.6%** — attempt
3's dev score is, on its own, roughly what an unimproved population produces
by selection alone.

The honest summary is uncomfortable: **attempt 2 had the stronger dev
evidence and failed transfer; attempt 3 had the weaker dev evidence and
passed.** Both are consistent with n being too small to tell.

Caveat on the null model: candidates share lineage (attempt 2's gen-1 winner
parented every later winner), so they are positively correlated and the
effective K is below 21. Correlation *reduces* the inflation figures above —
treat them as upper bounds. It does not reduce them to zero.

### 3.6 The floors read as statistical screens

Treating winner and seed as independent 27-question draws (the paired
version is tighter but needs `b`,`c` which the bundle does not export):

| floor | false-pass rate (winner truly = seed at 22.5%) | false-refuse rate at true 30% | at true 35% | at true 40% | at true 45% |
|---|---|---|---|---|---|
| holdout ≥ seed+1 (**current spec**) | 43.5% | 31.7% | 19.1% | 10.3% | 5.0% |
| holdout ≥ seed+2 | 31.2% | — | — | — | — |
| **holdout ≥ seed+4** | **12.6%** | **67.6%** | **51.4%** | **35.5%** | **22.2%** |
| holdout ≥ seed+6 | 3.6% | — | — | — | — |

Read the +4 row carefully. It is a decent guard against a *null* winner
(passes 12.6% of the time by chance) and a **terrible** guard against a
type-II error: a pipeline that is genuinely 12.5 points better than the seed
would be **refused 51% of the time**. A pipeline at the calibration ceiling
(46.3%, i.e. ~+22 points) would still be refused ~20% of the time.

### 3.7 One thing the spec already got right, and its size

The derived 40/27 split is random, so the two halves differ in difficulty by
chance. For a fixed pipeline with M correct of 67, the dev count is
hypergeometric and

`SD(dev% − holdout%) = SD(D)·(1/40 + 1/27)`

| M/67 | SD(dev count) | SD(dev% − holdout%) |
|---|---|---|
| 15 (22.4%) | 1.69 q | **10.5 pts** |
| 17 (25.4%) | 1.76 q | **10.9 pts** |
| 23 (34.3%) | 1.92 q | **11.9 pts** |
| 27 (40.3%) | 1.98 q | **12.3 pts** |

**A random 40/27 cut of 67 questions produces a dev-minus-holdout difference
of ~11 points SD for a completely fixed pipeline**, before any search
happens. Observed seed splits: r2-001 +0.3 pts (balanced), r2-002 −7.1 pts
(holdout is the easier half — which is why *both* seed and winner score
higher on holdout than dev in attempt 3).

Because both R2 floors are stated as **gains over the seed on the same
split**, this term cancels to first order. That was the right design. The
residual is paired binomial noise, which §3.3 prices. It also means the
seed's own dev-minus-holdout difference is a free, in-bundle read on split
imbalance and should be reported next to the winner's.

---

## 4. Variance reduction and robustness: what has evidence

| technique | primary evidence | what it buys R2 |
|---|---|---|
| **Repeated sampling per question** (score the mean of k runs) | MathArena runs 4 per question "To account for stochasticity" (https://arxiv.org/html/2505.23281v2). Miller rec. 3: with K samples, `Var(sᵢ)=σᵢ²/K`, and once `E[σᵢ²]/K ≪ Var(x)` further K "will have little effect" (https://ar5iv.labs.arxiv.org/html/2411.00640) | **The highest-leverage lever on our corpus**, because `p1` shows response variance *dominates* on AIME. Kills the within-question term; the between-question floor `Var(x)/n` survives — so it improves candidate *ranking* far more than it narrows the headline CI |
| **Self-consistency / majority vote** | Wang et al. (https://arxiv.org/abs/2203.11171): +17.9 GSM8K, +12.2 AQuA, +11.0 SVAMP over greedy CoT, at 40 samples; "in most cases the performance saturates quickly"; practitioners can "try a small number of paths (e.g., 5 or 10)". **MATH is not reported in this paper** | Raises the score, and drives per-question `p_i` toward 0/1 (reducing the within-question variance term). It is an *accuracy* technique, not an estimator-variance technique — the paper makes no eval-variance claim |
| **Paired inference** | Miller rec. 4 (above): ~1/3 relative variance reduction, "free" | Already implicit in gain-over-seed floors; making it explicit (export `b`,`c`) turns the floor into a recomputable p-value at zero extra spend |
| **Clustered standard errors** | Miller rec. 2: `SE_clustered` includes the within-cluster cross terms and can be **up to 3× the unclustered SE** | Our three competition tiers *are* clusters. Any CI we publish that ignores tier structure understates the noise |
| **Successive halving / Hyperband on candidates** | Hyperband (https://arxiv.org/abs/1603.06560): "throw out the worst half, and repeat"; "5× to 30× faster than popular Bayesian optimization algorithms". Applied to prompt selection by HbBoPs (https://arxiv.org/abs/2412.07820, "Hyperband as a multi-fidelity scheduler") and framed as best-arm-identification by TRIPLE (https://arxiv.org/abs/2402.09723). CAPO (https://arxiv.org/abs/2504.16005) uses racing and names SH as future work | Cheap wide screen → expensive narrow confirm. Mainstream optimizers (APE, MIPRO/DSPy, OPRO, EvoPrompt, GEPA) do *not* use it; APE reinvented an ad-hoc version citing AlphaCode instead |
| **Pareto / non-greedy candidate sampling** | GEPA Table 3: **+12.44%** vs **+6.05%** greedy vs **+5.11%** beam-4 (https://arxiv.org/html/2507.19457v2) | Directly addresses the "gen-1 winner parented every later winner" lineage collapse in attempt 2. Mechanical, and therefore verifiable as a law |
| **Ensembling prompts** | Boosted Prompt Ensembles (https://arxiv.org/abs/2304.05970): GSM8K self-consistency 81.0 → **85.2**; AQuA "train time boosting obtains 63.5% as compared to the 57% obtained by single prompt self-consistency", explicitly larger "if the initial prompt is suboptimal". AMA (https://arxiv.org/abs/2210.02441): "average performance lift of 10.2%" from aggregating imperfect prompts | Ensembling survivors is the literature's answer to "the single argmax is unreliable". Conflicts with R2's one-winner framing; would need a spec amendment |
| **Early stopping of the search** | OPRO's own recommendation (§5.4); Karwowski et al. derive "an optimal early stopping method that provably avoids" Goodhart degradation (https://arxiv.org/abs/2310.09144) | G=4 generations of greedy descent is exactly the overshoot shape |
| **Multi-prompt / paraphrase-augmented eval sets** | FormatSpread (https://arxiv.org/abs/2310.11324), *State of What Art?* (https://arxiv.org/abs/2401.00595) | Guards §2.3 format exploitation. Expensive; not the binding constraint here since our answers are integers |
| **More questions** | Miller: "new evals should contain at least 1,000 questions". tinyBenchmarks (https://arxiv.org/abs/2402.14992): 100 *curated* examples give 2% error — random 100 does not | The only thing that moves §3.4. MathArena has 7 competitions / 162 problems available (https://arxiv.org/abs/2505.23281) |

One caution against reflexively enlarging the dev set: `p1` shows that on
heterogeneous math sets, adding user prompts *decreases* variance-among-
system-prompts and therefore weakens the search signal
(https://arxiv.org/html/2604.08801). More questions is unambiguously right
for the **holdout** (measurement). For the **dev** set it is a trade — and
`p1`'s two-question result argues the other way.

---

## 5. Consequences for R2

### 5.1 What a +4 gain on 27 holdout questions can and cannot resolve

**Can:**

- Rule out a large *regression*. A winner that lost 5+ net questions would
  be caught.
- Serve as an honest **directional screen**. As a screen with a null winner
  it passes 12.6% of the time (§3.6) — better than the current +1 floor's
  43.5%.
- Combine with dev. Pooled over 67 questions, attempt 3's +10 net reaches
  p≈0.03–0.05 depending on discordance (§3.3) — but only if `b` and `c` are
  exported, which they currently are not.
- Report an effect *size* with an honest interval: 12/27 = 44.4%,
  Wilson [27.6, 62.7].

**Cannot:**

- **Reach statistical significance.** Best case p = 0.125 (b=0, c=4). You
  need net +6 with zero regressions, i.e. 22.2 points, to hit p<0.05 on 27
  questions. This is arithmetic, not a modelling choice.
- **Distinguish a real +15-point improvement from a lucky draw.** The
  holdout SEM at 30% is 8.8 points; +14.8 points is 1.7 SEM.
- **Serve as a reliable pass/fail gate.** A genuinely +12.5-point pipeline
  is refused 51.4% of the time by a +4 floor. Raising the floor to make it a
  stronger *proof* makes it a worse *gate*, monotonically. At n=27 there is
  no floor that is simultaneously a decent screen and a decent gate — that
  tradeoff is what a 27-question holdout buys.
- **Certify the dev climb.** The dev floor (+4 of 40) is cleared by an
  unimproved 21-candidate population 88% of the time (§3.5).
- **Say anything about a 2–5 point delta.** That needs ~1,000–7,000
  questions (§3.4). It is out of reach on any corpus this lab will run.

**The framing that survives all of this:** R2's headline is not "this
pipeline is better", which n=27 cannot support. R2's headline is "**the
climb, the legality of every selection, and the spend are provable from the
record**" — which is a claim about the *record*, and is fully supported at
any n. The floors exist to stop a null result being dressed as a win. They
should be honest about being screens, and the bundle should carry the
statistics that let a reader price them.

### 5.2 Recommendations, ranked

**1. Export the paired discordance and recompute the interval in the
verifier. (Free; do it regardless of anything else.)**
Add `b` (seed-right/winner-wrong) and `c` (seed-wrong/winner-right) per
split to the bundle, plus the exact sign-test p-value and the Wilson
interval, all recomputed by `climbverify` from journaled outputs — CL1
already recomputes every score, so the inputs are present. This converts an
arbitrary integer floor into a stated statistic with stated power, costs
zero dollars, and is exactly the lab's discipline (a law the verifier
re-runs). Miller's recommendation 4 is the citation
(https://ar5iv.labs.arxiv.org/html/2411.00640). Also export the *seed's*
dev-minus-holdout difference — the free read on split imbalance (§3.7).

**2. Replicate the dev scoring: score each candidate on the mean of k≥3
runs. (Highest statistical leverage; costs ~k× the search.)**
`p1` shows that on AIME-family problems the variance among responses
dominates the variance among system prompts
(https://arxiv.org/html/2604.08801) — i.e. our single-sample dev scores are
mostly generation noise, and the argmax is largely selecting on that noise.
MathArena runs 4 per question for exactly this reason
(https://arxiv.org/html/2505.23281v2); Miller's `Var(sᵢ)=σᵢ²/K` prices it.
This attacks the *cause* of the attempt-2 failure rather than its symptom.
Mechanically it is clean: replicate index enters the work-digest preimage,
so replicas are distinct work and the reuse accounting is unaffected.
Cheaper variant if k× the whole search is unaffordable: run k=1 through the
generations and k≥3 on the final survivors only — successive halving
(https://arxiv.org/abs/1603.06560, HbBoPs
https://arxiv.org/abs/2412.07820).

**3. Re-set the floors to levels the sample size can referee.**
The dev floor (+4 of 40) is met by noise 88% of the time at K=21; the
null-model argmax expectation is 35.5% ≈ 14/40, so a dev floor that means
anything starts at **≥ 18/40** (which attempt 2 hit, and which has
`P ≈ 2.8%` under the null). The holdout floor should be stated as a paired
count with its p-value attached, and the spec should say plainly which
number is the *screen* (+4, false-pass 12.6%) and which would be the *proof*
(+6 with b=0, p=0.031). Pick one and label it honestly; do not let a
screen's number be read as a proof's.

**4. Break the greedy lineage — Pareto or beam, not argmax-of-one.**
Attempt 2's gen-1 winner parented every later winner; GEPA's ablation puts
instance-level Pareto sampling at **+12.44%** against **+6.05%** for greedy
best-candidate (https://arxiv.org/html/2507.19457v2). This is a change to
CL2's selection law, so it is a spec amendment, but it is exactly the kind
of amendment this lane can make: the rule stays mechanical and the verifier
still re-runs it. Pair it with an early-stopping rule — OPRO recommends it
(§5.4, https://arxiv.org/html/2309.03409v3) and Karwowski et al. prove it
avoids proxy degradation (https://arxiv.org/abs/2310.09144).

**Standing caution (not a ranked item):** the normalizer's "take the LAST
integer token" rule is an unmeasured false-positive channel that a mutation
can attack (§2.3). Cheap guard: recompute every score under a second,
stricter normalizer (bare-integer-only) and export both. If they diverge,
the divergence is the finding. TinyV's 38% false-negative rate
(https://arxiv.org/abs/2505.14625) is the warning for graders in general;
ours is the mirror-image risk.

---

## Verification notes

Checked and *not* usable as claimed:

- GEPA reports a generalization gap **only as Figure 16**; no number appears
  in text or tables. Do not cite a numeric GEPA gap.
- The MIPRO paper never states its minibatch size (symbolic `B` only). The
  DSPy implementation default is **35**, not 25
  (https://github.com/stanfordnlp/dspy/blob/main/dspy/teleprompt/mipro_optimizer_v2.py).
- OPRO contains no statement that its small-sample score is *noisy*; it
  frames the problem as overfitting. Its variance discussion is about
  decoding temperature.
- The lm-evaluation-harness paper's numbers are prompt-format and
  scoring-convention effects, **not** answer-extraction effects. TinyV is
  the correct source for extraction failures.
- GSM1k (https://arxiv.org/abs/2405.00332): the "up to 13%" drop is the v1
  abstract; the revised abstract says "up to 8%". Cite the version.
- Self-consistency (2203.11171) does **not** report MATH, and makes no
  eval-estimator-variance claim.
- No canonical primary source was found for McNemar's test applied to LLM
  benchmark comparison; it is folklore. Cite Miller's paired-difference
  framing instead, with the exact sign test as the binary-score
  specialization. A recent alternative on resolution:
  https://arxiv.org/abs/2605.30315 ("11 of 40 Open LLM Leaderboard v1
  pairwise comparisons... unresolved at (α, 1−β) = (0.05, 0.8)").
- Dwork et al. state linear-vs-exponential query scaling, not a `sqrt(n)`
  rule. The Science 2015 "reusable holdout" is paywalled; cite the arXiv
  companions (1411.2664, 1506.02629).
- DSPy's sizing guidance is **no longer served on the live docs site** and
  has no Wayback snapshot; the GitHub `main` blob is the only citable
  location.
