# Selection under noise: how prompt/pipeline optimizers pick winners on small dev sets

Motivated by R2 attempt 2 (`docs/gauntlet/R2-attempts.md`): dev 9/40 → 18/40,
holdout 5/27 vs seed 6/27, verifier REFUSED at the transfer law. Every claim
below carries a URL. Section 4 is DERIVED ARITHMETIC, not a source, and is
labelled as such.

## The problem

R2 selects a winner by taking the argmax of exact-match scores over ~25
candidates, each scored once on the same 40 dev questions. Jensen & Cohen name
this exactly — a *multiple comparison procedure* — and prove the recorded score
of the argmax is a biased estimator of that candidate's true accuracy, with the
bias growing in the number of items compared and growing as the sample shrinks
([Machine Learning 38:309-338, 2000](https://link.springer.com/article/10.1023/A:1007631014630);
[PDF](https://groups.cs.umass.edu/wp-content/uploads/sites/17/2022/03/jensen-cohen-mlj2000.pdf),
§5.3, §6.2, Appendix A). At n=40 and p≈0.35 one standard error is 3.0 questions
(7.5 points), so the winner's 18/40 is the maximum of ~25 draws each carrying
±3 questions of noise. This is not a harness bug and not bad luck; it is the
selection rule doing what argmax does. The holdout, scored once on disjoint
data, is the correct instrument — it is Jensen & Cohen's own first remedy (§7.1,
"evaluate items on a new data sample S_new disjoint from the original sample S")
— but at 27 questions it is itself underpowered. Both facts have to be priced.

## 1. Prompt/pipeline optimizers: what they actually do

### MIPROv2 (DSPy) — minibatch to explore, full eval to decide

- Mechanism: candidates are scored on a random minibatch each trial; every
  `minibatch_full_eval_steps` trials the best-averaging candidate is re-scored
  on the *full* validation set, and **the returned program is chosen only from
  full-eval scores**. Defaults in source: `minibatch_size: int = 35`,
  `minibatch_full_eval_steps: int = 5`; trigger is
  `if minibatch and ((trial_num % (minibatch_full_eval_steps + 1) == 0) or (trial_num == (adjusted_num_trials - 1)))`, and the final candidate list is
  filtered to `[score_data for score_data in sorted_candidate_programs if score_data['full_eval']]`
  ([dspy/teleprompt/mipro_optimizer_v2.py](https://github.com/stanfordnlp/dspy/blob/main/dspy/teleprompt/mipro_optimizer_v2.py),
  [docs](https://dspy.ai/api/optimizers/MIPROv2/)).
- Promotion is by **mean minibatch score across trials**, not a single
  minibatch — an explicit variance-reduction step before the expensive eval.
- Paper: "a stochastic mini-batch evaluation function for learning a surrogate
  model of our objective"; Optuna TPE over (instruction, demo-set) indices;
  splits 500 train / 500 dev / 2000 test on HotPotQA, 500/500/1200 ScoNe,
  500/500/1520 HoVer ([arXiv:2406.11695](https://arxiv.org/abs/2406.11695),
  [HTML](https://arxiv.org/html/2406.11695v2), Table 3, App. B.1).
- **Evidence quality: strong for the mechanism (it is in shipped source), weak
  for the anti-overfitting claim** — the paper does not analyse val-vs-test gap
  or validation overfitting. The two-tier design is a *cost* mechanism that
  happens to have a bias-reducing side effect (decide on the largest sample).

### GEPA — Pareto frontier over per-instance scores, not aggregate argmax

- Mechanism (Algorithm 2): take "the highest score achieved for each individual
  training instance across all candidates in the pool, creating a 'Pareto
  frontier'"; keep candidates that "achieve the best score on at least one
  training task"; prune strictly dominated ones; sample a parent with
  probability rising in the number of instances on which it is best
  ([arXiv:2507.19457](https://arxiv.org/abs/2507.19457),
  [HTML](https://arxiv.org/html/2507.19457v1)).
- Explicit rationale against R2's rule: "A naive strategy is to always select
  the best-performing candidate in the pool. However, this can cause the
  optimizer to get stuck in a local optimum within the prompt space." Their
  failure trace — one child found, then many iterations failing to improve it,
  budget exhausted — is the same shape as R2 attempt 2's "greedy four deep, the
  gen-1 winner parented every later winner".
- Two-tier evaluation: a minibatch per iteration; only if the child beats its
  parent *on that minibatch* is it promoted and evaluated on the full
  `D_pareto` set. Splits 150 train / 300 val / 300 test (HotpotQA, IFBench,
  HoVer); 111/111/221 PUPA.
- Reported: beats GRPO "by 10% on average and by up to 20%, while using up to
  35x fewer rollouts"; beats MIPROv2 "on every benchmark and model", aggregate
  +14%.
- **Evidence quality: strong.** The Pareto rule is stated as pseudocode, the
  motivation is stated as an anti-local-optimum argument, and the ablation is
  the headline comparison. Note the claim is about *search quality*, not about
  selection bias — GEPA does not measure argmax bias either.

### OPRO — one fixed subset, reused every step

- "For prompt optimization, we randomly sample 3.5% examples from the GSM8K
  training set. The same subset is used throughout optimization" (≈261 of 7473);
  BBH uses a 20% subset; 8 instructions generated per step at optimizer
  temperature 1.0, scored at temperature 0
  ([arXiv:2309.03409](https://arxiv.org/abs/2309.03409),
  [ar5iv](https://ar5iv.labs.arxiv.org/html/2309.03409)).
- They report the gap plainly: "our training accuracies are often 5%-20% higher
  than our test accuracies", and argue the ranking survives because "validation
  accuracy curves trend up and down alongside the training curves."
- **Evidence quality: moderate.** The 5-20% train/test gap is a measured number
  from a paper doing exactly R2's thing (fixed small scoring subset, repeated
  argmax) and is the closest published analogue to R2's 45% dev vs 18.5%
  holdout. The "ranking survives" defence is an eyeball claim, not a test.

### ProTeGi — best-arm identification as the selection rule

- The only optimizer in this set that treats candidate selection as a bandit
  problem outright: "It is expensive to evaluate each candidate prompt on the
  entire training dataset, so we would like to minimize the number of such
  queries." Beam search with a bandit over the candidate set
  ([arXiv:2305.03495](https://arxiv.org/abs/2305.03495),
  [ar5iv](https://ar5iv.labs.arxiv.org/html/2305.03495)).
- Four algorithms compared, budget matched per prompt (Table 2, "Relative
  performance of different bandit algorithms, matching the query budget on a
  per-prompt basis"):

  | | Jailbreak @25 | Liar @25 | Jailbreak @50 | Liar @50 |
  |---|---|---|---|---|
  | Unif | 0.77 | 0.59 | 0.77 | 0.61 |
  | UCB | 0.83 | 0.66 | 0.85 | 0.66 |
  | UCB-E | 0.83 | 0.65 | 0.83 | 0.67 |
  | SR (successive rejects) | 0.81 | 0.62 | 0.82 | 0.66 |
  | SH (successive halving) | 0.82 | 0.64 | 0.80 | 0.62 |

- Finding: "Interestingly, UCB-style algorithms consistently outperform
  successive rejects-style algorithms, contrary to the hypothesis described in
  Section 2.2.2." Config: "minibatch size of 64, beam size b=4, and ran the
  algorithm for 6 optimization steps."
- **Evidence quality: strong for the negative result (elimination-style racing
  is NOT automatically better than UCB on prompt selection), weak in scale (two
  tasks, single seeds, ~0.02-0.04 spreads).** The uniform-allocation row losing
  by 6-7 points at both budgets is the load-bearing number: *how* you spend a
  fixed query budget across candidates matters more than the budget itself.

### EvoPrompt, Promptbreeder — population search with no noise discipline

- EvoPrompt: population N=10, T=10 iterations, roulette-wheel parent selection
  with p_i = s_i / Σs_j on dev scores, dev size 200 (classification) or 50
  (BBH); final answer is `p* ← argmax_{p∈P_T} f(p, D)`
  ([arXiv:2309.08532](https://arxiv.org/abs/2309.08532),
  [ar5iv](https://ar5iv.labs.arxiv.org/html/2309.08532), Table 11, App. B.3).
  No dev-size ablation, no overfitting analysis.
- Promptbreeder: population 50, binary tournament ("we sample two individuals
  from the population, we take the individual with the higher fitness, mutate
  it... and overwrite the loser"), fitness = "a batch of 100 Q&A pairs from the
  entire training set", 20-30 generations, nine self-referential mutation
  operators ([arXiv:2309.16797](https://arxiv.org/abs/2309.16797),
  [ar5iv](https://ar5iv.labs.arxiv.org/html/2309.16797)). No treatment of
  evaluation noise.
- **Evidence quality: strong for the parameters, and the relevant finding is an
  absence** — neither paper adjusts for the number of comparisons. Two things
  transfer anyway: (a) roulette/tournament selection is *stochastic in the
  score*, so a candidate 1 question ahead does not deterministically win, which
  is incidentally a noise-tolerant rule; (b) Promptbreeder's fitness batch of
  100 is 2.5x R2's dev, at 50 population.

## 2. The statistical-selection literature

### Racing: Hoeffding races and F-Race

- Hoeffding races (Maron & Moore, NIPS 1993): each model keeps a running error
  estimate and a Hoeffding interval ε = sqrt(B² log(2/δ) / 2n); "we then
  eliminate those learning boxes whose best possible error (their lower bound)
  is still greater than the worst error of the best learning box (its upper
  bound)... The intervals get smaller as more points are tested, thereby
  'racing' the good learning boxes, and eliminating the bad ones." The algorithm
  "returns a set of learning boxes whose error rates are insignificantly (to
  within ε) different after N test points"
  ([PDF](https://proceedings.neurips.cc/paper_files/paper/1993/file/02a32ad2669e6fe298e607fe7cc0e1a0-Paper.pdf)).
- F-Race / irace: "A race starts with a finite set of candidate configurations.
  At each step of the race, the candidate configurations are evaluated on a
  single instance... those candidate configurations that perform statistically
  worse than at least another one are discarded". F-Race uses the Friedman test
  and Conover's post-hoc test; irace also offers the paired t-test, both at
  α=0.05. "Since the first elimination test is crucial, typically a higher
  number of instances (T_first) are seen before performing the first statistical
  test"; subsequent tests every T_each (default 1). Notably: "the t-test is
  applied without p-value correction for multiple comparisons, since poor
  behavior of racing was previously reported if corrections are applied... due
  to the test becoming more conservative and not discarding configurations"
  ([López-Ibáñez et al., Operations Research Perspectives 3:43-58, 2016](https://doi.org/10.1016/j.orp.2016.09.002);
  [PDF](https://iridia.ulb.ac.be/mbiro/paperi/LopDubPer-etal2016orp.pdf)).
- Elitist racing: "aims at preserving the best configurations found so far,
  called elite configurations, unless they become worse than a new configuration
  that is evaluated in as many instances as the elite ones." New instances are
  *prepended* to a reshuffled elite instance set — "Randomizing the order of the
  instances should help to avoid biases in the elimination test induced by a
  particularly lucky or unlucky order of instances."
- **Evidence quality: strong and mature (irace is a maintained package with
  decades of use), but the mechanism is a BUDGET saver, not a bias remover.**
  Racing exists because evaluating every candidate on every instance is
  unaffordable. R2 already pays for full-dev evaluation of every candidate;
  racing R2 would make early scores noisier, not less biased. The transferable
  parts are the *equal-evidence* rule (elitist racing: an incumbent only falls
  to a challenger measured on at least as much data) and the explicit refusal to
  Bonferroni-correct inside a search loop.

### Successive halving / Hyperband / ASHA

- Successive halving inner loop: sample n configurations, evaluate at resource
  r_i, "keep top ⌊n_i/η⌋ configurations based on validation loss", repeat; η
  "controls the proportion of configurations discarded in each round" (default
  η=3), R is "the maximum amount of resource that can be allocated to a single
  configuration", s_max = ⌊log_η(R)⌋, budget per bracket (s_max+1)R. Guarantee:
  within log factors of known lower bounds in the infinite- and finite-armed
  bandit settings ([arXiv:1603.06560](https://arxiv.org/abs/1603.06560),
  [ar5iv](https://ar5iv.labs.arxiv.org/html/1603.06560)).
- ASHA: promote whenever possible rather than waiting for a rung to fill —
  "ASHA removes the bottleneck associated with synchronous promotions by
  incurring a small number of incorrect promotions"; if no promotion is legal it
  adds a configuration to the base rung
  ([arXiv:1810.05934](https://arxiv.org/abs/1810.05934),
  [ar5iv](https://ar5iv.labs.arxiv.org/html/1810.05934)).
- Sequential halving for best-arm identification: budget split into log₂(n)
  rounds, each round samples surviving arms equally and drops the worse half;
  parameter-free, with the gap to the lower bound reduced to doubly-logarithmic
  ([Karnin, Koren & Somekh, ICML 2013](https://proceedings.mlr.press/v28/karnin13.html)).
- **Evidence quality: strong theory, strong practice — and mostly inapplicable
  to R2.** All three assume a *cheap low-fidelity signal* (few training epochs,
  small resource r) that correlates with the expensive one. R2 has no fidelity
  ladder: a 4-step pipeline on 10 questions costs 1/4 of 40 questions and buys a
  ±4.7-question standard error. Halving on a noisier signal discards good
  candidates. The one exception is the *last rung*: sequential halving's final
  round spends the largest share of budget separating the finalists, which is
  the R2-shaped move (§5, rec 1).

### Winner's curse and multiple comparisons

- Jensen & Cohen give the mechanism and the arithmetic. Their charlatan example:
  a test with a 0.0287 false-positive rate applied to the best of n=10
  candidates has error probability "no greater than 1 − (1 − .0287)ⁿ" = 0.253 —
  "you underestimate by roughly an order of magnitude the probability that... the
  best of them will pass". Theorem (§5.2): E(X_i) ≤ E(X_max); Appendix A:
  E(X_max_a) < E(X_max_b) for n_a < n_b. §6.2: decreasing sample size increases
  the divergence, because "the standard deviation of X_i" is the standard error
  of the score. §6.1: the divergence also increases as candidates approach
  independence. Remedies enumerated in §7: new disjoint data, cross-validation,
  randomization tests, Bonferroni.
- **Oversearching (§4.3) is the direct warning to R2**: algorithms searching
  larger model spaces "produce models that are often less accurate on new data
  than models produced by algorithms that search only a fraction of the same
  space"; scores from MCPs with different n "are not directly comparable" and
  "scores resulting from MCPs with large n will be incorrectly favored". R2's
  floors reward more search; the literature says more search on a fixed 40-item
  sample buys a worse model and a more inflated number.
- Cawley & Talbot: "a low variance is at least as important" as unbiasedness in
  a selection criterion; "the degradation in performance due to over-fitting the
  model selection criterion can be surprisingly large"; the effects "are often of
  comparable magnitude to differences in performance between learning
  algorithms". Their measured selection bias (external vs internal
  cross-validation, 13 benchmarks) is significant on 11 of 13, e.g. breast
  cancer 26.280 external vs 27.470 internal, bias 1.190 ± 0.135. The direct
  variance remedy is stated plainly: "A straightforward way to reduce the
  variance of the model selection criterion is simply to increase the size of the
  validation sample over which it is evaluated"
  ([JMLR 11:2079-2107, 2010](https://www.jmlr.org/papers/v11/cawley10a.html)).
- Dodge et al.: report expected validation performance *as a function of budget*,
  because max-over-n-trials is a budget-dependent statistic; "we find multiple
  recent model comparisons where authors would have reached a different
  conclusion if they had used more (or less) computation"
  ([arXiv:1909.03004](https://arxiv.org/abs/1909.03004)).
- **Evidence quality: strongest tier in this document.** Jensen & Cohen is a
  proof; Cawley & Talbot is a controlled measurement across 13 benchmarks;
  Dodge et al. is a reporting standard adopted in NLP.

### Adaptive holdout reuse: Ladder and Thresholdout

- Ladder (Blum & Hardt): the leaderboard value updates only past a step size —
  "If R_S(f_t) < R_{t−1} − η, assign R_t ← [R_S(f_t)]_η. Else assign R_t ←
  R_{t−1}." Theorem 3.1 bounds |min_i R_D(f_i) − R_t| with failure probability
  exp(−2ε²n + (1/η + 2)log(4t/η) + 1); with η = O(n^{−1/3} log^{1/3}(kn)) the
  leaderboard error is O(log^{1/3}(kn)/n^{1/3}) — logarithmic in the number of
  submissions, so "we don't even limit the number of submissions an analyst can
  make" ([arXiv:1502.04585](https://arxiv.org/abs/1502.04585),
  [ar5iv](https://ar5iv.labs.arxiv.org/html/1502.04585)).
- Thresholdout (Dwork et al.): answer from the training set unless the holdout
  disagrees by more than a noisy threshold, and charge a budget B when it does —
  `if |E_Sh[φ] − E_St[φ]| > T̂ + η` then output `E_Sh[φ] + ξ`, `B ← B − 1`, with
  γ ~ Lap(2σ), η ~ Lap(4σ), ξ ~ Lap(σ); output "⊥" when B is exhausted
  ([arXiv:1506.02629](https://arxiv.org/abs/1506.02629),
  [ar5iv](https://ar5iv.labs.arxiv.org/html/1506.02629)).
- **Evidence quality: strong theory, and the closest structural match to R2's
  hash-chained-record framing** — both are mechanisms whose whole point is that
  the *recorded number* stays honest under adaptive reuse. Critical scope note,
  easy to get wrong: the Ladder bounds the reported score against the best true
  risk *seen so far*. It protects the headline, not the selected model. It does
  not make the winner better.

### Statistical power of a 27-question holdout

- Card et al. measure this class of problem directly: "For several tasks in the
  popular GLUE benchmark, small test sets mean that most attempted comparisons to
  state of the art models will not be adequately powered"; for MT, "typical test
  sets of 2000 sentences have approximately 75% power to detect differences of 1
  BLEU point" ([arXiv:2010.06595](https://arxiv.org/abs/2010.06595)).
- **Evidence quality: strong, and it cuts against R2's own floor.** See §4.

## 3. What nobody does

No optimizer surveyed here corrects its selection for the number of comparisons.
MIPROv2 and GEPA reduce variance incidentally (decide on the full set; promote
on a Pareto rule), OPRO measures the 5-20% gap and shrugs, ProTeGi optimises
query allocation not bias, EvoPrompt and Promptbreeder do not raise the issue.
The correction machinery is entirely in the older statistical literature. R2's
holdout law is already more disciplined than any of them — the refusal in
attempt 2 is a capability, not a defect, and is worth saying out loud in the
publication.

## 4. Derived arithmetic (NOT a source — reproduce before citing)

Monte Carlo over R2's exact structure (K=6, G=4, k_survivors=2, dev=40, seed
true accuracy 0.225, mutation effect ~ N(+0.01, 0.06) applied to the parent's
true accuracy, observed score ~ Binomial(40, p), 8000 trials). Script kept in
scratchpad, not committed; regenerate rather than trust these numbers.

Standard errors, in questions:

| p | n=40 | n=27 |
|---|---|---|
| 0.225 | 2.64 (6.6 pts) | 2.17 (8.0 pts) |
| 0.35 | 3.02 (7.5 pts) | 2.48 (9.2 pts) |
| 0.45 | 3.15 (7.9 pts) | 2.59 (9.6 pts) |

Bias of the recorded winner's dev score against that winner's true accuracy:

| condition | recorded − true | true dev score |
|---|---|---|
| K=4 (~17 candidates) | **+3.75 q** | 15.80/40 |
| K=6 (~25 candidates) | **+4.09 q** | 17.31/40 |
| K=10 (~41 candidates) | **+4.43 q** | 19.40/40 |
| K=6, 2 independent dev evals averaged | **+2.33 q** | 18.86/40 |
| K=6, 3 independent dev evals averaged | **+1.63 q** | 19.47/40 |

Three readings, in order of importance:

1. **The bias is ~4 questions, i.e. ~+10 points, not +4-5 points.** The working
   note in `R2-attempts.md` understates it by half. Attempt 2's dev 18/40 is
   consistent with a true dev accuracy near 14/40, and a winner at 14/40 true
   scoring 5/27 on holdout is an unremarkable draw. The record is consistent
   with a winner that genuinely improved a little and a dev number that lied by
   about 4 questions.
2. **Bias rises with K exactly as Jensen & Cohen's Appendix A theorem requires**
   (+3.75 → +4.09 → +4.43 for K=4/6/10). Widening the population to satisfy the
   climb floor makes the transfer law harder to pass, not easier.
3. **Replication is the only lever in the table that improves the winner AND
   shrinks the bias simultaneously** (true dev 17.31 → 18.86 → 19.47 while bias
   halves). This is Cawley & Talbot's "increase the size of the validation
   sample" in the only form available when the sample is frozen at 40.
   Caveat, load-bearing: the simulation treats *all* score variance as
   resampleable. Re-running the same 40 questions removes decoding/sampling
   variance but not question-set variance, which is shared across candidates and
   is precisely what the holdout exposes. Treat the R=2 row as an upper bound on
   what replication buys; the true figure depends on the seed-to-seed variance
   of the pipeline, which R2 has never measured and could measure cheaply.

Power of the current transfer floor (`winner holdout ≥ seed holdout + 1`, n=27,
seed true 0.225, 200k trials):

| true gain | P(floor passes) |
|---|---|
| +5 pts | 0.61 |
| +10 pts | 0.75 |
| +15 pts | 0.86 |
| +20 pts | 0.93 |

**A winner that genuinely gains the spec's own +10-point dev target fails the
holdout floor one run in four.** The floor is not conservative; it is a noisy
test that a good run can fail and a lucky bad run can pass. This is Card et
al.'s finding applied to R2's own numbers, and it is the single most important
result in this document for spec purposes.

## 5. Maps onto R2

Ranked by expected effect on the transfer law per dollar. R2 attempt 2 spent
$5.79 of a $15 cap, so there is ~2.5x headroom for evaluation spend.

### Rec 1 — Confirmation round: replicate the finalists on dev before selecting

**SPEC-AMENDMENT.** After the final generation, re-evaluate the k survivors (or
the G generation champions) on the dev 40 with fresh step-0 seeds, and select
the winner by the *mean* over replicates. This is MIPROv2's rule verbatim —
promote by average score, decide only on full evaluations
([source](https://github.com/stanfordnlp/dspy/blob/main/dspy/teleprompt/mipro_optimizer_v2.py))
— and sequential halving's principle of spending the largest budget share on the
final round ([Karnin et al.](https://proceedings.mlr.press/v28/karnin13.html)).
§4 measures it as the only mechanism that improves the selected candidate and
shrinks the bias at once.

Why it is an amendment: the frozen rule is "top-k by dev exact-match, ties by
digest", and CL2 recomputes exactly that. Defining the final score as a mean
over R replicates changes what CL2 recomputes. It stays fully mechanical — the
verifier recomputes R scores per finalist and their mean, and the replicate
seeds are already in the step-0 input digest preimage
(`H({question: id, seed})`), so replicates are honest distinct work, not
double-buying under RL2/CL5. Cost: 2 replicates of 2 finalists ≈ 2 × 2 × 40 × 4
= 640 logical steps, a few dollars at attempt-2 rates.

Cheap prerequisite, HARNESS-SIDE and worth doing first: run the seed pipeline on
dev twice with different seeds and record the delta. That single number
separates decoding variance from question-set variance and tells you whether
Rec 1 is worth the amendment at all. Nothing in the record currently measures
it.

### Rec 2 — State the transfer law's power, or widen the holdout

**SPEC-AMENDMENT.** `winner holdout ≥ seed holdout + 1` on n=27 has 75% power
against a true +10-point winner (§4). Three options, in order of preference:

- Report the power alongside the floor in the spec, so a refusal is read as
  "failed a test with a known 25% false-refusal rate against the target effect"
  rather than "the winner did not transfer". This costs nothing and is the
  honest framing; Dodge et al. is the precedent for publishing the
  budget/power dependence rather than the bare number
  ([arXiv:1909.03004](https://arxiv.org/abs/1909.03004)).
- Re-derive the split as dev=40 / holdout=27 is currently forced by 67 total
  questions. Growing the corpus (more MathArena tiers) is the only way to buy
  power; Cawley & Talbot's remedy is literally "increase the size of the
  validation sample" ([JMLR 11:2079-2107](https://www.jmlr.org/papers/v11/cawley10a.html)).
- State the floor as a paired comparison over the same 27 questions (the seed
  and winner are scored on identical items, so the discordant-pair count is the
  informative statistic, not the two marginal totals). Mechanical, verifier-
  computable from journaled outputs under CL1, and strictly more powerful than
  comparing totals.

Do not lower the floor to make attempts pass. The floor is doing its job; what
is missing is the stated error rate.

### Rec 3 — Pareto/diversity pressure in the survivor set

**SPEC-AMENDMENT** (selection rule), with a **HARNESS-SIDE** partial. GEPA's
argument — "always select the best-performing candidate... can cause the
optimizer to get stuck in a local optimum" — describes attempt 2's record
exactly (greedy lineage four deep, gen-1 winner parented every later winner)
([arXiv:2507.19457](https://arxiv.org/abs/2507.19457)). Full GEPA is a rule
change: survivors = candidates best on at least one dev question, dominated ones
pruned, parents sampled proportional to instance-wins. Per-question results are
already recomputed by CL1, so the Pareto frontier is verifier-computable with no
new evidence.

Harness-side partial available today without amendment: `k_survivors` is a
manifest fact constrained only by `2 ≤ k_survivors < k_population`. Raising it
from 2 to 3 at K=6 widens the parent pool and breaks single-lineage collapse
under the existing rule. Free, and it is the change to make on the next dispatch
if no amendment is ratified.

Warning attached: diversity pressure increases the number of distinct candidates
examined, and Jensen & Cohen prove the bias grows in n (Appendix A; §4 confirms
+3.75 → +4.43 as K goes 4 → 10). Rec 3 without Rec 1 trades a local-optimum
problem for a larger winner's curse.

### Rec 4 — Ladder-style champion gate on the recorded headline

**SPEC-AMENDMENT** (small, mechanical). Record the dev headline as a Ladder
value: the champion score updates only when a candidate beats the incumbent by
more than a step size η, otherwise the recorded value is carried forward
([Blum & Hardt, arXiv:1502.04585](https://arxiv.org/abs/1502.04585), Fig. 1).
At n=40 the paper's η = O(n^{−1/3} log^{1/3}(kn)) with k≈25 is ≈2-3 questions,
which is also ~1 standard error (§4). Simulation: the gap between the reported
headline and the best true candidate seen falls from +2.31 q (η=0) to +1.65 q
(η=3).

Scope discipline, and the reason this is ranked below Recs 1-3: **the Ladder
protects the number, not the model.** Simulating η as a gate on the champion
while survivor selection remains a raw argmax leaves the winner's own bias
unchanged (+4.30 → +4.55 q, i.e. slightly worse — the threshold selects for
candidates that jumped further, which selects for larger noise). Adopt it as a
reporting law if R2's headline claim is "the recorded climb is honest"; do not
adopt it expecting better transfer.

### Rec 5 — Do NOT adopt racing, successive halving, or minibatch tiers

**Recorded as a rejected option, with reasons.** Racing (Hoeffding, F-Race,
irace) and successive halving (Hyperband, ASHA) exist to avoid paying full
evaluation cost for every candidate
([Maron & Moore](https://proceedings.neurips.cc/paper_files/paper/1993/file/02a32ad2669e6fe298e607fe7cc0e1a0-Paper.pdf);
[López-Ibáñez et al.](https://doi.org/10.1016/j.orp.2016.09.002);
[arXiv:1603.06560](https://arxiv.org/abs/1603.06560)). R2 already pays it, has
no cheaper fidelity tier (a 10-question sub-eval carries ±4.7 questions of
standard error), and is not budget-bound at $5.79 of $15. Importing them would
make early scores noisier and eliminate good candidates on less evidence — the
opposite of what the transfer law needs. ProTeGi's own Table 2 shows
elimination-style methods (SR, SH) losing to UCB on prompt selection
([arXiv:2305.03495](https://arxiv.org/abs/2305.03495)).

Two fragments from that literature do transfer and are already partly in R2:

- irace's elitist rule — an incumbent falls only to a challenger "evaluated in
  as many instances as the elite ones" — is R2's status quo (all candidates see
  all 40) and should be *stated as a law* rather than left implicit, because Rec
  1's replication would break it if only challengers were replicated. Replicate
  incumbent and challenger alike.
- irace's refusal to apply multiple-comparison correction inside the search loop
  ("poor behavior of racing was previously reported if corrections are applied")
  is direct evidence against a Bonferroni-adjusted selection rule for R2.
  Correct at the *reporting* boundary (holdout, Rec 2), not inside the climb.

## Open questions

- Seed-to-seed variance of a fixed R2 pipeline on the same 40 questions is
  unmeasured. It determines whether Rec 1 is worth its amendment. One cheap
  harness run answers it.
- Whether R2's candidates are near-independent (Jensen & Cohen §6.1: bias grows
  as candidates approach independence). A greedy four-deep lineage shares most
  of its spec, so the real bias is likely below §4's figures, which assume
  independent mutation effects. The record has the per-question results to
  measure the candidate-score correlation matrix directly.
- Nothing here addresses whether the *second leg* (gpt-5-mini, seed 35/67) has
  the same bias profile at a much higher base rate — binomial variance peaks at
  p=0.5, so the 52.2% seed sits at the worst point on the curve.
