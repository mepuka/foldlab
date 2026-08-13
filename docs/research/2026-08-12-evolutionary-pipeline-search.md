# Search-operator and population design for evolutionary LLM-pipeline search

Research memo, 2026-08-12. Primary sources only (papers, not blog
restatements); every claim carries a URL, checked today. Written against R2
(`docs/gauntlet/R2-verified-climb.md`): K=6 population, G=4 generations, top-2
survive, 4-step pipeline, 40-question dev split, LLM-proposed single-step
mutations, content-addressed execution with a reuse floor of 3.0x.

Two attempts are already on the board (`docs/gauntlet/R2-attempts.md`): both
climbed on dev, both were refused — attempt 2 at the holdout-gain law with a
greedy lineage four deep, attempt 3 at CL3 (a verifier bug, not a search bug).
The search-quality question this memo answers is attempt 2's: **what changes to
operator and population design buy generalizing gain per dollar, given that
dollars here are cone re-buys?**

---

## TL;DR

1. The strongest, best-measured single result in this literature is **GEPA's
   ablation of greedy selection**: replacing "always extend the best candidate"
   with Pareto sampling over per-instance scores is worth **+6.4 points
   aggregate** on Qwen3-8B, and the paper's stated failure mode for greedy is
   exactly attempt 2's — the optimizer "stalls, expending entire rollout budget
   attempting to further improve this specific candidate"
   (https://arxiv.org/abs/2507.19457).
2. Under R2's cone economics, **diverse parent selection is free**. Choosing a
   non-greedy parent buys exactly one child's cone, the same as choosing the
   greedy parent. Every diversity mechanism in this literature that costs
   *evaluations* elsewhere costs *nothing* here. This is the single largest
   alignment between the evidence and the rung.
3. **Crossover is the weakest-supported operator** in the literature, and it is
   structurally expensive under cone economics (a crossover child's cone starts
   at the earliest changed step). Do not add it.
4. R2's **G=4 is a bigger outlier than its K=6**. Population sizes of 5–10 are
   well-attested; generation counts of 4 are not attested anywhere. Every
   published system runs 10–30+ rounds, or uncapped sample budgets.
5. **Every island-model / quality-diversity result is measured at scales
   R2 will never reach** (FunSearch: ~10^6 samples; theory: μ ∈ Ω(kn)). Import
   the *selection rule*, not the archive machinery.

---

## 1. What counts as evidence here, and the scale caveat

R2 runs 6 candidates × 4 generations = at most ~21 distinct pipeline specs
evaluated, on 40 questions each. Almost nothing in the evolutionary-search
literature is measured at that budget. Sorting the sources by the population /
sample scale they were actually measured at:

| System | Population / archive | Rounds | Total samples | URL |
|---|---|---|---|---|
| EPiC (code gen) | **5** | to convergence | — | https://arxiv.org/abs/2408.11198 |
| ProTeGi | beam width **4** | depth **6** | — | https://arxiv.org/abs/2305.03495 |
| OPRO | **8** new instr./step | up to 200 steps | — | https://arxiv.org/abs/2309.03409 |
| EvoPrompt | **N=10** (ablated 4–12) | T=10 | N·T·(1+\|D\|) calls | https://arxiv.org/abs/2309.08532 |
| CAPO | μ=**20**, 10 offspring/iter | until 5M input tokens | — | https://arxiv.org/abs/2504.16005 |
| PromptBreeder | **50** units | 20–30 generations | — | https://arxiv.org/abs/2309.16797 |
| GEPA | growing candidate pool (no fixed K) | budget-capped | 678–6,858 rollouts | https://arxiv.org/abs/2507.19457 |
| ShinkaEvolve | archive 20–50, 2–4 islands | migration every 10 gens | **150** samples (circle packing) | https://arxiv.org/abs/2509.19349 |
| FunSearch | m islands, m/2 reset periodically | — | **~10^6** LLM samples | https://www.nature.com/articles/s41586-023-06924-6 |
| AlphaEvolve | MAP-Elites + islands | — | unspecified, large | https://arxiv.org/abs/2506.13131 |
| (μ+1) GA theory on Jump_k | **μ ∈ Ω(kn)** | — | — | https://arxiv.org/abs/2404.07061 |

**Measured anywhere near K=6:** EPiC (5), ProTeGi (4), OPRO (8), and
EvoPrompt's population-size ablation (4–12). Everything else — islands, MAP-
Elites, QD, crowding, the runtime-analysis theory — is measured only at scale,
and in the theory case demands populations linear in problem dimension.

**Measured anywhere near G=4:** nothing. This is the honest gap.

---

## 2. Operator design

### 2.1 Reflective mutation is the best-supported operator

Four independent systems converge on the same shape: show the proposer the
current artifact, concrete execution evidence, and scored history; ask for a
targeted edit.

- **ProTeGi** ("textual gradients"): a minibatch of **64** examples produces
  **4** natural-language "gradients" criticizing the current prompt; **1 edit
  per gradient**, plus **2** paraphrase ("monte carlo") samples per edit,
  yielding ~32 candidates per step before selection. Beam width 4, depth 6.
  (https://arxiv.org/abs/2305.03495)
- **GEPA**: the mutation LLM sees system execution traces (reasoning,
  intermediate outputs, tool calls) plus an evaluation feedback function μf
  that "identifies relevant textual traces", and is asked to attribute
  successes and failures to elements of the module's prompt. Candidates are
  proposed against a **minibatch of size 3**, and only promoted to full
  validation if the minibatch improves.
  (https://arxiv.org/abs/2507.19457)
- **OPRO**: the meta-prompt carries the **best 20 instructions so far with
  their scores, sorted in ascending order**, plus **3** randomly sampled
  exemplars. The ordering ablation is real: ascending "achieves better final
  accuracies and converges faster", attributed to recency bias. More exemplars
  (10 vs 3) did **not** help and "distracted the optimizer". Optimizer
  temperature 1.0 beat both 0.0–0.5 (too little exploration) and 1.5–2.0 (too
  much). (https://arxiv.org/abs/2309.03409)
- **PromptBreeder**: nine operators in five classes — zero-order and
  first-order direct mutation, EDA mutation and EDA rank-and-index, **lineage-
  based mutation** (feed the LLM the chronological history of elite prompts so
  the weak→strong gradient guides generation), zero-order and first-order
  hypermutation of the *mutation-prompts* themselves, prompt crossover, and
  context shuffling. Ablations (Appendix L): removing any self-referential
  operator "proved harmful in nearly all circumstances".
  (https://arxiv.org/abs/2309.16797)

Two numbers recur across otherwise unrelated systems and are worth treating as
a soft consensus on **how many exemplars/inspirations to put in the proposer's
context**: FunSearch found **k=2** prior programs in the prompt "lead to better
results compared to just one, with diminishing returns beyond that"
(https://www.nature.com/articles/s41586-023-06924-6); ShinkaEvolve uses
**top-K = 2** inspirations plus 4 archive inspirations across all four of its
task domains (https://arxiv.org/abs/2509.19349); OPRO found 3 exemplars beat 10
(https://arxiv.org/abs/2309.03409). Small, sorted, high-signal context beats
volume.

### 2.2 Crossover: thin evidence, and structurally expensive here

- **EvoPrompt-GA** does crossover-then-mutation with roulette-wheel parent
  selection; **EvoPrompt-DE** replaces it with a three-part difference operator
  and wins on the harder tasks (+3.5% average on BBH vs GA's +2.5%; 5 points on
  Subj). The DE ablation is the informative part: mutating only the *differing
  parts* between two prompts beat mutating everything (**75.55 vs 69.87** on
  Subj), and including the current best prompt as "Prompt 3" beat random
  sampling, which beat omitting it.
  (https://arxiv.org/abs/2309.08532)
- **PromptBreeder** applies prompt crossover at only **10% probability** — a
  garnish, not the engine. (https://arxiv.org/abs/2309.16797)
- **GEPA+Merge**, a *system-aware* crossover that picks the best version of
  each module from two distinct lineages, gives **+2% aggregate on GPT-4.1
  Mini** but is mixed on Qwen3-8B (helps 1 of 4 tasks, hurts others). The paper
  caps merge invocations at 5 per run. (https://arxiv.org/abs/2507.19457)
- **Language Model Crossover** establishes that an LLM prompted with several
  parent genotypes emits plausible recombinations across bit-strings,
  sentences, equations, image prompts and Python — but it is a feasibility
  result across five domains, not a head-to-head win over mutation-only.
  (https://arxiv.org/abs/2302.12170)
- The classical theory that *justifies* crossover — (μ+1) GA solving Jump_k in
  polynomial time where the (1+1) EA needs Θ(n^k) — requires **μ ∈ Ω(kn)** and
  works by evolving "near-maximal population diversity". At K=6 the mechanism
  it relies on does not exist. (https://arxiv.org/abs/2404.07061)

**Reading:** crossover is the least-supported operator in prompt evolution, and
the version that did work (GEPA+Merge) is module-wise selection across
lineages, not text blending. Section 6 gives the R2-specific cost argument
against it.

### 2.3 The mutation target matters more than the mutation text

GEPA "selects a target module within the system to improve (via **round robin**
to ensure all modules receive updates)" (https://arxiv.org/abs/2507.19457).
That is the only published module-selection policy at this pipeline shape, and
the authors themselves flag per-module credit assignment as future work. MIPRO
takes the opposite route: it abstracts credit assignment away from the LLM
entirely, using a Bayesian (TPE) surrogate over (instruction, demo-set) index
combinations, learned from stochastic minibatch evaluations — 13% accuracy gain
at best on 5 of 7 multi-stage programs
(https://arxiv.org/abs/2406.11695).

Neither result says late pipeline steps are better mutation targets than early
ones. **R2's late-step bias is a cost-economics choice with no quality evidence
behind it** — the memo's honest finding, and the recommendation in §6 is to
price it explicitly rather than assume it.

---

## 3. Greedy vs diversity

### 3.1 The GEPA Pareto ablation — the load-bearing result

GEPA maintains a candidate pool and selects a parent by **instance-level Pareto
frontier**: compute per-instance best scores across all candidates, keep only
candidates that are best on at least one instance, prune the strictly
dominated, then sample with probability proportional to the number of instances
on which the candidate is best (Algorithm 2).

Ablation vs `SelectBestCandidate` (greedy), Qwen3-8B, from Table 2:

| | HotpotQA | IFBench | HoVer | PUPA |
|---|---|---|---|---|
| SelectBestCandidate | 58.33 | 30.44 | 45.33 | 85.45 |
| GEPA (Pareto) | 62.33 | 38.61 | 52.33 | 91.85 |

Aggregate **+6.4**. The stated mechanism: greedy "leads to local-optima after
one iteration", and Figure 6(a) shows the optimizer "stalls, expending entire
rollout budget attempting to further improve this specific candidate", whereas
Pareto sampling produces a "balanced search tree".
(https://arxiv.org/abs/2507.19457)

This is the closest published analogue to attempt 2's post-mortem: a lineage
four deep where each generation's winner parented the next, dev at ceiling,
holdout below seed.

### 3.2 Islands and archives — right idea, wrong scale

- **FunSearch** keeps m independent islands, each seeded with the initial
  program; every 4 hours it discards all programs from the **m/2 islands with
  the lowest-scoring best instance** and reseeds them from a survivor chosen
  uniformly at random. Within an island, programs are clustered by *signature*
  (the tuple of scores across all test inputs), clusters are picked by
  Boltzmann selection with a temperature that decays as the population grows,
  and within a cluster shorter programs are favoured. Rationale: islands
  prevent the population from "getting stuck in local minima". Scale: ~10^6 LLM
  samples, 15 samplers, 150 evaluators.
  (https://www.nature.com/articles/s41586-023-06924-6)
- **AlphaEvolve**'s program database is "inspired by a combination of the
  MAP-Elites algorithm and island-based population models", explicitly to
  "balance exploration and exploitation" while resurfacing prior ideas as
  prompt context. Its ablation figure shows every component (evolution itself,
  prompt context, meta-prompt evolution, full-file evolution, the large model)
  contributes. It also runs an **evaluation cascade**: candidates advance to
  the next, more expensive stage only if earlier stages look promising.
  (https://arxiv.org/abs/2506.13131)
- **ShinkaEvolve** is the only system in this family explicitly built for tiny
  sample budgets, and its ablations are the most transferable. Parent selection
  compared three policies: random search converges worst; **hill climbing
  improves fast then plateaus**; fitness×novelty weighted sampling
  "consistently outperforms both". Novelty is `h_i = 1/(1+N(P_i))` — inverse
  offspring count, i.e. penalize parents already exploited. Islands: 2–4,
  archive 20–50, migration every 10 generations, elite protected from
  migration. Result: SOTA circle packing in **150 samples**.
  (https://arxiv.org/abs/2509.19349)
- General island-model background and the standard claim (reduced mixing
  preserves diversity, delays premature convergence):
  https://arxiv.org/abs/2304.05811

The signal across all three: **hill climbing plateaus, and the cure is parent
sampling, not archive machinery.** The archive is bookkeeping; the behavioural
change is which parent gets extended.

### 3.3 Duplicate suppression: two systems, same threshold

- PromptBreeder filters its EDA population list "on the basis of BERT embedding
  cosine similarities... an individual is not included in the list if it is
  more than **0.95** similar to any other entry"
  (https://arxiv.org/abs/2309.16797).
- ShinkaEvolve embeds mutable code with `text-embedding-3-small`, and when
  cosine similarity to the archive exceeds **0.95**, escalates to an
  LLM-as-novelty-judge before accepting the proposal. Ablation: embedding-based
  rejection "strongly outperforms no rejection sampling"; the LLM judge on top
  gives only "marginal improvements"
  (https://arxiv.org/abs/2509.19349).

Two unrelated systems, same threshold, same finding: the cheap embedding filter
carries most of the value. Do not pay for the LLM judge.

### 3.4 Population size: the ablations that exist

- **EvoPrompt** swept 4–12. For classification, "as the size increases, curves
  for DE and GA show an ascending trend" — bigger is better. But for the
  simpler generation task ASSET, "a population size of 6 demonstrates a
  comparable performance to a population size of 10, though with a 2.5-fold
  increase in overhead". DE gains more from population diversity than GA
  because it operates on the differing parts.
  (https://arxiv.org/abs/2309.08532)
- **EPiC** ran population 5 and found 8 actively worse: "pass@1 drops to 0.37,
  token usage rises to 2,618k, and ATSP worsens to 816", concluding that
  "increasing population size beyond a certain threshold can make the results
  deviate from the optimal solution".
  (https://arxiv.org/abs/2408.11198)

**K=6 is defensible on the evidence.** No published ablation says 6 is
crippling for a task of this shape; two say the marginal candidate past ~6 is
poor value. There is no comparable defence of G=4.

### 3.5 Diversity mechanisms that provably fail

Not all diversity machinery works. Rigorous runtime analysis on the bimodal
Twomax function: **probabilistic crowding "fails to find any reasonable
solution quality even in exponential time"** (fitness-proportional replacement
degrades to uniform), whereas restricted tournament selection finds both optima
in O(μn log n) — but only if the window parameter w is large enough; too small
and RTS also fails with high probability
(https://arxiv.org/abs/1803.09766). Diversity is not a free adjective: the
replacement rule decides whether it works.

---

## 4. Fitness under budget

### 4.1 Evaluation cost dominates, and racing is the standard cure

CAPO states the cost structure directly: μ·T·(1+|D_dev|) LLM calls, "mainly
driven by the size of D_dev". Its cure is **F-Race**: evaluate candidates
sequentially on fixed-size blocks, eliminate a prompt when more than μ others
are significantly better under a **paired t-test at α=0.2**. Reported saving:
**~44% of evaluations**, reinvested in more iterations under a fixed 5M input-
token budget. It also carries few-shot examples in the genotype and applies a
length penalty `f_γ(p) = f(p) − γ·rel_token_length(p)`; the γ=0 ablation scores
slightly better but bloats prompts.
(https://arxiv.org/abs/2504.16005)

EvoPrompt gives the same cost identity from the other side: total API requests
= **N·T·(1+|D|)** (https://arxiv.org/abs/2309.08532).

Related mechanisms with the same shape:
- **ProTeGi** picks among candidates with bandit best-arm-identification and
  reports that "UCB-style algorithms consistently outperform successive
  rejects-style algorithms" in their setting, contrary to the theory
  (https://arxiv.org/abs/2305.03495).
- **AlphaEvolve**'s evaluation cascade prunes on cheap stages first
  (https://arxiv.org/abs/2506.13131).
- **GEPA** proposes against a **minibatch of 3** and only pays for full
  validation on a minibatch improvement
  (https://arxiv.org/abs/2507.19457).

### 4.2 The winner's curse — attempt 2's actual failure

**HbBoPs** frames the problem precisely: prompt evaluation on limited
validation instances has high variance, "the prompt identified as validation
optimal might not necessarily be optimal on a held-out test set", and small
random subsets increase estimator variance enough to prevent correct selection
decisions. Its answer is Hyperband/successive-halving over a *fidelity* axis
defined as the number of validation instances, with a structural-aware deep-
kernel GP surrogate over prompt embeddings to transfer information between
candidates; it beats EvoPrompt and random search under equal budget.
(https://arxiv.org/abs/2412.07820)

MIPROv2 has shipped with subsampled validation sets as small as 20 instances,
which is the same exposure (https://arxiv.org/abs/2406.11695).

*Derived here, not cited:* at R2's scale, a dev score of 15/40 has binomial
standard error √(0.375·0.625/40) ≈ 0.077, i.e. **±3 questions at one sigma**.
Attempt 2 took an argmax over ~21 such estimates and moved 9 points on dev
while losing 1 on holdout. The literature's two structural mitigations —
GEPA's per-instance Pareto (a candidate must be *best on some instance*, which
argmax-of-mean does not require) and CAPO's significance-tested elimination —
both replace "highest mean wins" with something noise-aware. That is the fix,
and it needs no extra evaluation.

### 4.3 Surrogates and fitness inheritance

Standard expensive-optimization toolkit, mostly at the wrong scale for R2 but
worth naming: surrogate-assisted EAs replace the expensive fitness with a
learned model (GP/RBF/SVM/PR) — survey at
https://link.springer.com/article/10.1007/s40747-024-01465-5. **SAIL** applies
this to MAP-Elites, using GP surrogates with UCB acquisition to cut evaluations
by orders of magnitude while producing better elites per bin
(https://arxiv.org/abs/1806.05865). At ~21 candidates R2 has too few points to
fit any surrogate; the multi-fidelity route (§4.1) is the one that works at
this size.

---

## 5. Caching-aware search — the part R2 already has

This is the least-populated corner of the literature and the one R2 is
furthest ahead on, but two results are directly on point.

**Functional-equivalence caching (FEC)** in AutoML: hash each candidate's
outputs on a small canonical input set into a fingerprint, use it as a
memoization key, and reuse the recorded evaluation on a hit — "the number of
inputs required to effectively hash the candidate is very small compared to the
number of inputs required to train it". Measured **cache hit rates above 0.5 in
every setup**, "indicating the propensity of evolutionary methods to repeat
candidates", with empirical speed gains "in the range 2x–10x". Critically, the
paper reports that FEC **improved outcomes, not just cost**, and verified on
held-out data that this was not overfitting.
(https://arxiv.org/abs/2302.05433)

**Lossless fitness inheritance** for GA-evolved decision trees: because the
fitness decomposes over the tree, offspring reuse the parent's evaluation for
unchanged subtrees exactly (not approximately) — "key tree quality parameters
can be recursively computed and re-used across generations of partially similar
decision trees", attributed to "the divide-and-conquer nature of decision
trees". (https://arxiv.org/abs/cs/0611166)

Classical GP fitness caching runs the same play at subtree granularity (DAG
representation of the population, hash tables for algebraic equivalence),
reporting up to an order of magnitude off evaluation time — survey framing in
https://arxiv.org/abs/2103.07512.

**R2's content-addressed engine is the lossless-inheritance construction
applied to a pipeline instead of a tree**: fitness decomposes over ordered
steps, an unchanged prefix is exactly reusable, and the digest of
`{model, step-spec, upstream result digests}` is the memo key. FEC's headline
finding — that memoization *changed search quality upward*, not only cost — is
the closest external evidence that this is a search primitive, not an
accounting trick.

Nothing found makes the *operator schedule* cache-aware, i.e. biases mutation
placement to maximize memo hits. R2's late-step schedule appears to be an
original construction. Adjacent but not verified in depth: FAPO, on fully
automated multi-step pipeline prompt optimization
(https://arxiv.org/abs/2606.19605) — PDF extraction failed on the method
sections, flagged rather than cited.

---

## 6. Maps onto R2

Cone arithmetic first, since it prices every recommendation. R2 has L=4 steps,
Q=40 dev questions, K=6, k_survivors=2, G=4; observed 4,216 logical rows
against ~1,218 receipts = 3.46x. *All arithmetic in this section is derived
here from the spec, not cited.*

For a fresh child whose mutation targets step s (0-indexed), the edit cone is
steps s..3, so it buys (4−s) receipts per question while contributing 4 logical
rows. Local reuse ratio **4/(4−s)**:

| mutation at step | cone size | local reuse | vs the 3.46x run average |
|---|---|---|---|
| 3 (answer) | 1 | **4.00x** | raises |
| 2 (solve) | 2 | **2.00x** | lowers |
| 1 (plan) | 3 | 1.33x | lowers hard |
| 0 (extract) | 4 | 1.00x | lowers hard |
| survivor re-listed | 0 | ∞ (all cache hits) | raises |
| mutation-proposal call | — | **0 logical rows** | lowers |

Two consequences that drive the rankings:

- **Parent choice is free.** Whichever parent is selected, the child costs one
  cone. Diversity in *parent selection* has zero cost on the reuse floor. This
  is the structural gift: everything §3 recommends is priced at zero here.
- **Mutation-proposal receipts are pure denominator.** They carry no logical
  rows. Currently ~20 of 1,218 receipts (~1.6%); doubling proposer calls costs
  ~1.6% of the ratio. Nameable but small.

### Ranked recommendations

**1. Replace greedy top-k parent selection with instance-level Pareto sampling
over the full archive of evaluated candidates.**
Cost impact: **neutral to positive** on the reuse floor. Archived candidates
already have receipts for their dev rows; re-listing them adds logical rows at
zero physical cost, which *raises* the ratio. Selecting a stale parent buys the
same one cone as selecting the champion.
Evidence: GEPA's +6.4 aggregate over `SelectBestCandidate`, with the stated
stall mode matching attempt 2 (https://arxiv.org/abs/2507.19457); ShinkaEvolve
showing hill climbing plateaus while weighted fitness×novelty sampling wins at
150 samples (https://arxiv.org/abs/2509.19349); FunSearch's island resets as
the same idea at 10^6 scale
(https://www.nature.com/articles/s41586-023-06924-6).
Caveat: this is a **CL2 spec amendment**. CL2 currently freezes "top-k by dev
score, tie-broken by candidate digest" as a mechanically recomputable law. A
Pareto rule is still mechanically recomputable — per-instance score vectors are
already recomputed under CL1, dominance is deterministic, and probability-
proportional sampling needs a seeded, journaled draw. The verifier work is
real; the law does not weaken.

**2. Select survivors by noise-aware criteria, not raw argmax of the mean.**
Cost impact: **zero**. Pure recomputation over scores CL1 already derives.
Evidence: HbBoPs on validation-set variance defeating correct selection
decisions (https://arxiv.org/abs/2412.07820); CAPO's paired t-test at α=0.2
replacing mean-ranking (https://arxiv.org/abs/2504.16005); GEPA's requirement
that a survivor be best on at least one instance
(https://arxiv.org/abs/2507.19457).
This is the direct answer to attempt 2's diagnosis. At 15/40 the one-sigma band
is ±3 questions; an argmax over ~21 estimates is optimistically biased by
construction. Concrete minimal change: keep top-k, but when candidates fall
within one standard error of the leader, break the tie by per-instance
dominance count rather than by digest — a strictly better use of the same
bytes, and mechanically checkable.

**3. Give the proposer scored lineage history in ascending order, plus concrete
failures, plus exactly two archive inspirations.**
Cost impact: **slightly negative** (~1–2% of the reuse ratio if proposal calls
grow; larger prompts do not add logical rows). Bounded and cheap.
Evidence: OPRO's ordering ablation — best-20 with scores, ascending, beats
descending and random, and 3 exemplars beat 10
(https://arxiv.org/abs/2309.03409); ProTeGi's failure-minibatch → textual
gradients → edits (https://arxiv.org/abs/2305.03495); GEPA's traces + feedback
meta-prompt (https://arxiv.org/abs/2507.19457); PromptBreeder's lineage-based
mutation over chronological elites (https://arxiv.org/abs/2309.16797); the k=2
convergence in FunSearch and ShinkaEvolve
(https://www.nature.com/articles/s41586-023-06924-6,
https://arxiv.org/abs/2509.19349).
R2 already journals every mutation fact and every dev score — the lineage
history is *already in the record*, unspent. Feeding it back to the proposer is
free data.

**4. Reject near-duplicate proposals on embedding similarity before buying
their cone.**
Cost impact: **positive**. A rejected duplicate saves a whole cone (1–2
receipts × 40 questions) at the price of one extra proposal receipt. Also
retires the current deterministic params-bump repair, which manufactures a
near-clone rather than a new direction.
Evidence: 0.95 cosine threshold in both PromptBreeder (BERT,
https://arxiv.org/abs/2309.16797) and ShinkaEvolve (`text-embedding-3-small`,
https://arxiv.org/abs/2509.19349), the latter with an ablation showing the
embedding filter carries the value and the LLM novelty judge adds only
marginally. Skip the judge.
Caveat: an embedding call is a new provider dependency and a new receipt class.
A cheaper local proxy (normalized-template digest plus a token-level Jaccard
floor) captures the params-bump clone case with no new dependency.

**5. Spend the next marginal dollar on G, not K — and price any racing scheme
against the logical-step floor.**
Cost impact: **+G is positive** (each added generation contributes 6×40×4 = 960
logical rows against ~200 receipts under the current late-step schedule ≈ 4.8x
local, above the 3.46x average, and it moves the ≥3,840 logical-step floor in
the right direction). **Racing is a floor hazard**: eliminating a candidate
early removes logical rows, and R2 must clear 3,840 of them.
Evidence for depth over width: EvoPrompt runs T=10 (https://arxiv.org/abs/2309.08532);
PromptBreeder 20–30 generations (https://arxiv.org/abs/2309.16797); OPRO up to
200 steps (https://arxiv.org/abs/2309.03409); ShinkaEvolve migrates every 10
generations, so 4 generations would not complete one migration cycle
(https://arxiv.org/abs/2509.19349). Evidence that K=6 is already adequate:
EvoPrompt's ASSET result (6 ≈ 10 at 2.5x less overhead,
https://arxiv.org/abs/2309.08532) and EPiC's finding that 8 was worse than 5
(https://arxiv.org/abs/2408.11198).
G=4 is R2's real outlier, not K=6.

### Do not do

**Do not add crossover.** The evidence is the weakest in the survey (§2.2), and
cone economics makes it the most expensive operator available: a crossover
child inherits changes from two lineages, so its cone begins at the *earliest*
changed step, collapsing the local reuse ratio toward 1.0x. GEPA+Merge, the one
crossover variant with a positive result, is module-wise selection across
lineages and was capped at 5 invocations per run with mixed results by model
(https://arxiv.org/abs/2507.19457). If any version is ever tried, it is the
GEPA one, restricted to merges whose earliest differing step is ≥ 2.

**Do not adopt MAP-Elites or island archives as machinery.** Every measurement
is at 10^2–10^6 samples with archives of 20–50
(https://arxiv.org/abs/2509.19349) or millions of samples
(https://www.nature.com/articles/s41586-023-06924-6); the supporting theory
needs μ ∈ Ω(kn) (https://arxiv.org/abs/2404.07061). At ~21 candidates the
archive *is* the population. Recommendation 1 imports the behaviour — non-
greedy parent sampling — without the bookkeeping.

**Do not assume the late-step mutation bias is quality-neutral.** It is a pure
cost optimization with no quality evidence behind it; GEPA's only published
module-selection policy is round-robin across *all* modules
(https://arxiv.org/abs/2507.19457), and its authors flag per-module credit
assignment as open. The current schedule `[2,3,3,2,3]` / `[2,3,3,3]` never
touches steps 0 or 1, so half the pipeline is frozen by budget, not by
evidence. Cheapest honest test: one step-1 mutation per run, cost 1.33x local
reuse on 160 logical rows — roughly 0.5% of the run's ratio — bought as
information about whether the prefix is where the gain lives.
