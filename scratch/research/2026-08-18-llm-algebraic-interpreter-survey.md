# LLMs and small models as algebraic interpreters — survey for the training-loop question

Status: **SURVEY, informational only.** Commissioned 2026-08-18 by the
operator through the coordinator; written by a Fable research seat
("the reader"). This memo gathers external evidence on training small
models (and other ML/statistical constructs) on defined-behavior
algebraic data and closed languages, with special focus on DSL
training loops, AST/grammar-based synthetic data, and integration into
software systems and UI. It decides nothing, changes no code, and
advances no ticket. Estate paths were read read-only; the parallel
kernel-model worktree was not written to.

For an outsider, the context in one paragraph. The estate (this
repository's project) runs a deliberately tiny algebraic language as
its agent-facing API: eight primitive acts — `declare`, `resolve`,
`emit`, `join`, `fold`, `decide`, `trigger`, `spawn` — over
content-addressed state, machine-modeled in Lean (a proof assistant).
The language is closed: unlawful acts either cannot be written down at
all, or are refused at ONE admission door with a **taught refusal** —
a typed value carrying the reason, the law it defends, and a legal
repair, where a subset of repairs is machine-applicable (a program can
apply the fix without a human). Conformance corpora are **generated
vectors**: label-perfect examples emitted by executing the Lean model
itself, byte-identical on regeneration. Aggregations classify on a
**rung ladder** of algebraic strength (monoid → commutative monoid →
semilattice → group). The operator's question, paraphrased: the
outside world trains models on synthetic data from grammars and
verifies them with symbolic engines — what is actually measured about
that loop, and what would it take to point it at this language? The
operator's working term **"weights coalescence"** — the moment trained
weights stop memorizing examples and settle into implementing the
algebra itself — is glossed throughout by its nearest measured
referent in the literature: *grokking*.

Evidence tiers, used on every load-bearing claim:

- **MEASURED** — a study's own numbers, read against the primary
  source this session; "(abstract tier)" marks claims verified only
  against the paper's abstract, announcement, or a secondary summary.
- **PRACTICE** — vendor documentation, position papers, or community
  convention: what practitioners do and claim, not controlled
  experiments.
- **SYNTHESIS** — this memo's own inference across sources, always
  labeled.
- **LEAD** — found but not verified against a primary source this
  session; a pointer, not evidence.

Two distinct loops are kept separate throughout, because the
literature separates them and conflating them produces wrong
experiment designs (SYNTHESIS, defended in §5):

- **Loop I (interpreter)** — train a model to *execute* the algebra:
  given operands and an operation, predict the result. Area A's
  literature. Payoff: evidence the structure is internalized;
  scientific instrument, not product.
- **Loop E (emitter)** — train a model to *speak* the language: given
  intent, produce a lawful sentence the door admits. Areas B/C's
  literature. Payoff: cheaper, faster, more reliable agents and UI.

---

## 1. Result first — the strongest findings on one screen

1. **Small transformers provably internalize group operations from
   defined-behavior data — the grokking result — and the training
   regime that triggers it is characterized.** Two-layer-scale
   transformers trained on binary-operation tables (modular
   arithmetic; composition in the permutation group S5) jump from
   chance to near-perfect *held-out* accuracy long after perfectly
   overfitting the training set (MEASURED, abstract tier, §2.1).
   Mechanistic follow-up reverse-engineered the learned algorithm for
   modular addition — the network implements a discrete Fourier
   transform and trig identities, converting addition to rotation —
   and resolved training into three phases: memorization, circuit
   formation, cleanup (MEASURED, abstract tier, §2.2). Weights
   coalescence is not a metaphor; for small algebras it is an
   observed, dissected phenomenon.
2. **Every landmark DSL training loop is the same triad — closed
   grammar generator, verifier, retrained model — and the estate
   already owns all three pieces as proof infrastructure.**
   RobustFill (trained entirely on sampled DSL programs: 92% on
   real-world benchmarks vs 34% prior neural art), AlphaGeometry
   (100M synthetic theorem-proofs generated from symbolic rules, no
   human demonstrations, 25/30 olympiad problems vs gold-medalist
   average 25.9), AlphaProof (~1M informal problems auto-formalized
   to ~80M Lean statements, RL against the Lean verifier, IMO 2024
   silver: 28/42), DreamCoder (wake-sleep: grow the DSL library,
   retrain the recognizer) — all MEASURED (abstract tier), §3. The
   estate's Lean-model emitter + admission door + generated-vectors
   discipline is this triad, built for a different reason (SYNTHESIS,
   §5.1).
3. **Denser, more structured verifier feedback measurably beats
   binary pass/fail — the taught-refusal shape is ahead of the
   literature, not behind it.** Process supervision beats outcome
   supervision for math (78% vs lower on MATH subset; PRM800K)
   (MEASURED, abstract tier); ToolPRM (ACL 2026) finds step-level
   reward beats outcome reward *specifically for structured
   function-call emission*, and that "early JSON errors are
   unrecoverable" (MEASURED, abstract tier); FeedbackEval (2025)
   ranks feedback richness against repair success — and finds raw
   compiler diagnostics (49.2%) UNDER minimal feedback (53.1%), i.e.
   unstructured verbosity is worse than nothing much; VeriHarness
   (2026) shows structured refusals carrying failure location +
   observed value + **admissible alternatives** lift agent repair
   from 28%→72% (Qwen2.5-Coder-14B) and 16%→58% (Llama-3.1-8B), with
   ablations attributing most of the gain to the admissible-
   alternatives field — the closest published analog of a taught
   repair (all MEASURED, abstract tier, §3.4). What nobody has done:
   *train on* repair-annotated refusals as labels (§6).
4. **Fine-tuned small models already run structured emission in
   production, and the cost case is stated in the tens.** 13B
   NexusRaven-V2 beats GPT-4 by ~4-7% on nested function calling
   (PRACTICE/vendor); 1-3B xLAM models post ~54-66% on the Berkeley
   function-calling suite (MEASURED, abstract tier); NVIDIA's
   position paper argues agentic subtasks are narrow and repetitive
   and prices 7B serving at 10-30x cheaper than 70-175B in latency,
   energy, and FLOPs (PRACTICE with paper-stated numbers, §4.1).
   Constrained decoding is the zero-training complement — grammar
   masking guarantees syntax at negligible overhead — but two
   measured caveats bind: format strictness costs reasoning, and
   greedy grammar-masking distorts the model's own distribution
   (GAD, NeurIPS 2024) (§4.2).
5. **The honest boundary: internalization does not compose for
   free.** Transformers fail to generalize compositionally on
   SCAN/COGS (in-distribution 96-99% vs 16-35% on structural
   generalization); trained-from-scratch and few-shot LLMs both fail
   compositional splits in program synthesis (ExeDec); a 2026
   controlled study finds >30% accuracy drop the moment generated
   programs are *syntactically* novel, with only log-linear returns
   to compute; and the Chomsky-hierarchy study (20,910 models) finds
   transformers reliably generalize only regular-language-like
   structure without architectural help (all MEASURED, abstract
   tier, §2.4). Design consequence for the estate: the eight flat
   tool sentences sit in the favorable regime; the recursive program
   declaration DAG is where the risk concentrates (SYNTHESIS).

---

## 2. Area A — can models internalize algebra? The weights-coalescence evidence

### 2.1 Grokking: the canonical defined-algebraic-data result

"Grokking: Generalization Beyond Overfitting on Small Algorithmic
Datasets" (Power, Burda, Edwards, Babuschkin, Misra; arXiv 2201.02177,
2022) trains small transformers on binary-operation tables — the
complete finite table of `a ∘ b = c` for an operation, split
train/test — and observes generalization "from random chance level to
perfect generalization... well past the point of overfitting"
(MEASURED, abstract tier). The operations are exactly
defined-behavior algebraic data: modular arithmetic (e.g. division
mod 97) and composition in S5, the 120-element permutation group
(MEASURED via follow-up papers' descriptions of the original setup —
secondary confirmation this session: S5 grokking replications use
[a, b, =] sequences over the 120×120 composition table with ~30%
train fraction; modular division groks with a 2-layer, 1-head,
128-dim network at 50% train fraction). Two regime facts matter for
experiment design:

- **Data fraction is the lever.** Smaller train fractions delay
  generalization; below a threshold it never arrives. The interesting
  band in replications is roughly 20-50% of the full operation table
  (MEASURED, abstract + secondary tier).
- **Regularization (notably weight decay under AdamW) is what makes
  the generalizing solution win** over the memorizing one; this is
  the load-bearing hyperparameter across the replication literature
  (MEASURED, secondary tier).

### 2.2 The mechanism: the network builds the algebra's own machinery

"Progress measures for grokking via mechanistic interpretability"
(Nanda, Chan, Lieberum, Smith, Steinhardt; arXiv 2301.05217, ICLR
2023) reverse-engineers small transformers grokked on modular
addition: the learned algorithm uses "discrete Fourier transforms and
trigonometric identities to convert addition to rotation about a
circle" (MEASURED, abstract tier). For a cyclic group, Fourier
characters ARE the group's representation theory — the network did
not memorize the table; it found the structure mathematics would
name. Training resolves into three continuous phases — memorization,
circuit formation, cleanup — so the "sudden" generalization jump is
the visible tail of gradual structure amplification plus removal of
the memorizing component. This is the sharpest available operational
definition of weights coalescence: a measurable circuit forms while
the memorizer decays (MEASURED, abstract tier).

Extension to relational composition: "Grokked Transformers are
Implicit Reasoners" (Wang et al., arXiv 2405.15071, 2024) finds
transformers acquire implicit multi-hop reasoning *only* via
grokking-length training; that a fully grokked small transformer hits
near-perfect accuracy on tasks where GPT-4-Turbo and Gemini-1.5-Pro
fail regardless of prompting (parametric beats non-parametric memory
here); but with a sharp asymmetry — OOD generalization succeeds for
*comparison* and fails for *composition* (MEASURED, abstract tier).
The asymmetry previews §2.4's boundary.

### 2.3 Sequence-trained world models and neural algorithmic reasoning

- **OthelloGPT** ("Emergent World Representations," Li, Hopkins, Bau,
  Viégas, Pfister, Wattenberg; arXiv 2210.13382, ICLR 2023 oral): a
  GPT trained only on legal-move sequences, no rules given, develops
  an internal representation of board state recoverable by probes;
  interventions on the recovered state change the model's predictions
  as the real board would (MEASURED, abstract tier). Follow-up work
  reports the representation is linearly decodable when the right
  basis (mine-vs-theirs) is chosen (LEAD — Nanda et al., "Emergent
  Linear Representations in World Models of Self-Supervised Sequence
  Models," not fetched this session). Reading for the estate:
  sequence exposure to a closed rule system yields probeable internal
  state — the probe methodology transfers directly to "does a model
  trained on kernel traces represent anchors/rungs internally?"
- **CLRS / neural algorithmic reasoning** (Veličković et al., ICML
  2022; arXiv 2205.15659): thirty classical algorithms (sorting,
  searching, DP, graphs, strings, geometry) posed as graph-network
  trajectory-imitation with intermediate "hints"; the field's
  measured lesson is that architecture-algorithm alignment decides
  generalization (MEASURED, abstract tier). "A Generalist Neural
  Algorithmic Learner" (Ibarz et al., LoG 2022; arXiv 2209.11142)
  shows ONE shared GNN can learn all thirty, improving average
  single-task performance >20% over prior art (MEASURED, abstract
  tier). Relevance is real but bounded: this lineage executes
  algorithms over graphs, closer to Loop I than anything the estate
  would ship; its durable export is the *hints* idea — supervising on
  intermediate state, which the estate's Lean emitter can produce for
  free (SYNTHESIS).
- **In-context, not weights**: "Teaching Algorithmic Reasoning via
  In-context Learning" (Zhou et al., arXiv 2211.09066) gets ~10x/9x/
  5x/2x error reductions (parity/addition/multiplication/subtraction)
  purely by algorithmic prompting (MEASURED, abstract tier) — the
  no-training baseline any estate experiment must beat before
  claiming fine-tuning earned its cost (SYNTHESIS).
- Early precedent: "Learning to Execute" (Zaremba & Sutskever, arXiv
  1410.4615, 2014) — LSTMs evaluate short programs character-level;
  naive curriculum fails, a combined curriculum strategy reaches 99%
  on 9-digit addition (MEASURED, abstract tier). The oldest version
  of both the promise and the curriculum caveat.

### 2.4 Honest boundaries: where internalization fails

- **SCAN** (Lake & Baroni, ICML 2018; arXiv 1711.00350): seq2seq
  models master a compositional command language in-distribution and
  "fail spectacularly" on systematic recombination — the novel
  primitive ("dax") cannot be used in known frames (MEASURED,
  abstract tier).
- **COGS** (Kim & Linzen, EMNLP 2020; arXiv 2010.05465): semantic
  parsing with a generalization split: 96-99% in-distribution vs
  16-35% on structural generalization, with ±6-8% seed variance
  (MEASURED). The cleanest number for "the same grammar, differently
  composed, is a different task to a transformer."
- **Chomsky-hierarchy study** (Delétang et al., ICLR 2023; arXiv
  2207.02098): 20,910 models across 15 formal-language tasks; RNNs
  and transformers fail to length-generalize beyond regular tasks,
  LSTMs reach counter languages, only structured-memory architectures
  (stack/tape) generalize on context-free/context-sensitive tasks —
  and some failures persist at any data/compute budget (MEASURED,
  abstract tier).
- **Program-synthesis-specific**: ExeDec (Shi et al., ICLR 2024;
  arXiv 2307.13883) defines compositional-generalization splits for
  RobustFill/DeepCoder domains; from-scratch transformers struggle,
  few-shot LLMs also fail the splits, and predicting execution
  subgoals step-by-step (decomposition) is what helps (MEASURED,
  abstract tier). "Beyond the Training Distribution" (arXiv
  2604.27551, 2026) builds a controlled arithmetic-DSL environment,
  distinguishes *density* generalization (novel programs inside the
  seen syntactic support) from *support* generalization (novel
  syntax), and measures >30% accuracy drop at the support boundary
  with only log-linear gains from compute; its stated remedy is
  maximizing training diversity across syntactic and semantic
  manifolds (MEASURED, abstract tier).

**SYNTHESIS for the estate.** The kernel wire is eight flat,
fixed-shape sentences — closer to a regular language than to SCAN's
recursive command grammar — and §2.4's failures concentrate exactly
where recursion and novel composition live. Two consequences: (a)
Loop E over the eight tools is on the favorable side of every
boundary above; (b) the program-declaration DAG (nodes/edges/holes)
is the one estate surface with real compositional depth, so any
training plan should treat DAG emission as a separate, harder,
later target — consistent with the house projection survey's
independent finding that code-shaped linear emission beats graph
emission for LLMs.

---

## 3. Area B — the DSL training-loop canon: synthetic data from grammars and ASTs

### 3.1 The semantic-parsing lineage: grammars manufacture the corpus

- **Overnight** ("Building a Semantic Parser Overnight," Wang,
  Berant, Liang; ACL 2015): the original AST-based synthetic loop. A
  small grammar generates logical forms PAIRED with canonical
  utterances (stilted but readable English); crowdworkers paraphrase
  the canonical utterances into natural language; the (paraphrase,
  logical form) pairs train the parser. Seven domains, built in about
  a day each (MEASURED, abstract tier + method verified via the
  paper's own framing in search results). The design insight that
  survives: *the grammar authors the semantics; humans (or now LLMs)
  only ever author surface variation* — labels are correct by
  construction.
- **The modern replacement of the crowd**: "Constrained Language
  Models Yield Few-Shot Semantic Parsers" (Shin et al., EMNLP 2021;
  arXiv 2104.08768): an LLM paraphrases user utterances into a
  controlled sublanguage (canonical-utterance-shaped English),
  constrained decoding forces grammar conformance, and a
  deterministic mapping yields the logical form — strong few-shot
  results on Overnight and SMCalFlow (MEASURED, abstract tier). This
  is the direct blueprint for "model as prose-to-candidate-sentence
  parser with the door as validator" (§4.4).

### 3.2 Neural program induction trained entirely on synthetic DSL data

- **RobustFill** (Devlin et al., ICML 2017; arXiv 1703.07469):
  attention seq2seq over I/O examples for a string-transformation
  DSL, trained on sampled synthetic programs; 92% on a real-world
  test set vs 34% for prior neural art, and robust to input noise
  where the hand-engineered symbolic system "fails entirely"
  (MEASURED, abstract tier). Existence proof that a model trained on
  NOTHING but generator output transfers to real tasks when the DSL
  actually covers the domain.
- **Karel** ("Leveraging Grammar and Reinforcement Learning for
  Neural Program Synthesis," Bunel et al., ICLR 2018; arXiv
  1805.04276): synthetic Karel programs + execution; two upgrades to
  plain likelihood training — enforcing syntax during training/
  decoding, and RL against *semantic* correctness (does the program
  behave right) rather than token-matching one reference — improve
  accuracy "especially in cases where the training data is limited"
  (MEASURED, abstract tier). The program-aliasing point matters to
  the estate: many lawful sentences can name the same act, and
  token-level imitation punishes lawful variants; reward-by-verifier
  does not (SYNTHESIS).
- **DeepCoder** (Balog et al., ICLR 2017; arXiv 1611.01989): the
  cheaper integration shape — the network only *predicts properties*
  of the target program to rank a symbolic enumerator's search;
  order-of-magnitude search speedups (MEASURED, abstract tier). A
  reminder that "small statistical construct guiding an exact engine"
  is a valid endpoint short of full emission.

### 3.3 The verifier-in-the-loop wave

- **AlphaGeometry** (Trinh et al., Nature 2024; DeepMind
  announcement 2024-01-17): from symbolic rules alone, generate 1B
  random geometric diagrams, extract 100M unique theorem-proof
  training examples via "symbolic deduction and traceback" (9M
  featuring auxiliary constructions) — zero human demonstrations. A
  small language model proposes constructions only when the symbolic
  deduction engine stalls; the engine does all sound inference.
  Result: 25/30 olympiad geometry problems vs 10 for the prior
  symbolic method (Wu) and 25.9 average for human gold medalists
  (MEASURED, abstract/announcement tier; the language model's size is
  reported in secondary coverage as ~150M parameters — LEAD).
- **AlphaProof** ("Olympiad-level formal mathematical reasoning with
  reinforcement learning," Nature 2025, s41586-025-09833-y): ~1M
  informal math problems auto-formalized into ~80M Lean statements
  (deliberately noisy/variant formalizations to maximize RL signal);
  an encoder-decoder transformer described by an author as
  "relatively small," pretrained on code+math; RL where the Lean
  kernel is the reward oracle; **test-time RL** generates many
  variants of a target theorem as a self-curriculum. IMO 2024: 28/42
  points — silver-medal level, including P6, solved by 5 of 609
  humans (MEASURED, abstract + author-blog tier). Precedent within
  this lineage: expert iteration on formal proofs with an
  auto-discovered difficulty curriculum ("Formal Mathematics
  Statement Curriculum Learning," Polu et al., arXiv 2202.01344) —
  expert iteration beats raw proof search at equal compute
  (MEASURED, abstract tier).
- **DreamCoder** (Ellis et al., arXiv 2006.08381; PLDI 2021): the
  full closed loop including *language growth* — wake: solve tasks by
  neurally-guided search; sleep: (abstraction) compress recurring
  program fragments into new DSL library primitives, (dreaming)
  retrain the recognition network on replayed and imagined tasks.
  Concepts build compositionally on earlier ones (MEASURED, abstract
  tier). The one canon loop whose analog the estate has NOT built:
  the kernel alphabet is fixed by ruling (growth only by grill), so
  DreamCoder's library learning maps not to new generators but to
  learned *composition macros* — cataloged template values —
  which the estate's template family could hold by construction
  (SYNTHESIS).

### 3.4 RLVR and the reward-density question — the estate angle

**RLVR as current paradigm.** Tulu 3 (Lambert et al., arXiv
2411.15124) names the recipe — RL against a *verifying function*
instead of a learned reward model, on tasks with checkable answers
(MEASURED, abstract tier). DeepSeek-R1 (Nature 2025; arXiv
2501.12948) is the scale demonstration: reasoning emerges from pure
RL with rule-based accuracy + format rewards, no supervised reasoning
traces; and the behaviors distill down into 1.5B-70B dense models
(MEASURED, abstract tier). The estate's admission door is exactly a
verifying function; every act is checkable by construction.

**Does richer feedback beat binary pass/fail?** The commissioned
question, and the evidence is consistent across five independent
lines:

| Evidence | Shape of the feedback | Measured effect |
| --- | --- | --- |
| "Let's Verify Step by Step" (Lightman et al., arXiv 2305.20050) | per-step labels (process) vs final-answer (outcome) | process-supervised reward model reaches 78% on a MATH subset, significantly above outcome supervision; PRM800K = 800K step labels (MEASURED, abstract tier) |
| ToolPRM (arXiv 2510.14703, ACL 2026) | step-level reward over function-name and argument-filling decisions | fine-grained PRM beats outcome and coarse reward models across function-calling benchmarks; "early JSON errors are unrecoverable" → explore wide, retain little (MEASURED, abstract tier) |
| RLEF (Gehring et al., arXiv 2410.02089) | execution feedback inside a multi-turn RL loop | state of the art on CodeContests at 8B and 70B with an order of magnitude fewer samples than independent sampling (MEASURED, abstract tier) |
| FeedbackEval (arXiv 2504.06939, 2025) | five feedback types, in-context repair | success ranking: mixed 63.6% > LLM-expert 62.9% > test 57.9% > minimal 53.1% > raw compiler 49.2% — structure beats verbosity; raw diagnostics UNDERPERFORM minimal feedback (MEASURED, abstract tier) |
| VeriHarness (arXiv 2607.14167, 2026) | refusal = location + observed value + admissible alternatives | repair success 14/50→36/50 (Qwen2.5-Coder-14B) and 8/50→29/50 (Llama-3.1-8B) vs raw diagnostics; ablation: the admissible-alternatives field carries most of the gain (MEASURED, abstract tier) |

Supporting: property-oriented, structurally minimal feedback (arXiv
2506.18315) — semantic guidance plus the *simplest failing
counterexample* beats plain I/O mismatch feedback (on hard problems:
28.1% baseline → 32.0% I/O → 36.2% property) (MEASURED, abstract
tier). And the negative control on naive self-feedback: "Is
Self-Repair a Silver Bullet?" (Olausson et al., ICLR 2024; arXiv
2306.09896) — when the model critiques its own code, gains are often
marginal vs just sampling more; repair unblocks only when feedback
quality rises (stronger model, or human) (MEASURED, abstract tier).

**SYNTHESIS.** The taught refusal — reason + law + repair, four
repairs machine-applicable — is precisely the feedback shape this
literature converges on: structured over verbose (FeedbackEval),
naming the admissible next move (VeriHarness's winning field),
minimal and located (2506.18315), dense per-decision rather than
terminal (Lightman, ToolPRM), and produced by an external verifier
rather than self-critique (Olausson). Every published system had to
*manufacture* that channel; the estate's door emits it as its normal
refusal behavior. What no published work does: use repair-annotated
refusals as *training labels* rather than in-context hints — §6 lists
this as the estate's open contribution.

### 3.5 Data-generation hygiene

- **Curriculum**: naive shortest-first curricula can fail; mixed
  strategies work (Learning to Execute, MEASURED abstract tier);
  expert iteration discovers difficulty curricula automatically when
  a verifier prices attempts (Polu et al., MEASURED abstract tier);
  AlphaProof's test-time variant generation is curriculum-at-
  inference (abstract tier).
- **Distribution over ASTs**: uniform-by-construction sampling
  measures support cleanly but real gains come from maximizing
  diversity across syntactic AND semantic manifolds; density
  generalization is easy, support generalization is the cliff (>30%
  drop) (arXiv 2604.27551, MEASURED abstract tier). AlphaGeometry's
  pipeline deduplicated 1B samples to 100M — dedup and coverage,
  not volume, carried the result (abstract tier).
- **Small-model capability per token**: TinyStories (Eldan & Li,
  arXiv 2305.07759) — <10M-parameter models produce fluent, coherent,
  rule-respecting text when the training distribution is small,
  clean, and closed (MEASURED, abstract tier). phi-1 ("Textbooks Are
  All You Need," Gunasekar et al., arXiv 2306.11644) — 1.3B params /
  7B curated+synthetic tokens → 50.6% HumanEval; the 350M phi-1-small
  still reaches 45% (MEASURED, abstract tier). Together: on a
  *closed, curated* distribution, the parameter budget that suffices
  is orders of magnitude below frontier scale — directly calibrating
  §5.3's experiment sizes.

---

## 4. Area C — small models in production software: integration patterns

### 4.1 Fine-tuned small models for structured emission

- **Gorilla** (Patil et al., arXiv 2305.15334): LLaMA-based model
  fine-tuned for API-call emission with retrieval-aware training;
  beats GPT-4 on APIBench and measurably reduces hallucinated APIs
  (MEASURED, abstract tier).
- **NexusRaven-V2** (Nexusflow, 2023): 13B, function calling, +4%
  average and up to +7% on nested/composite calls vs GPT-4 on the
  vendor's human-curated benchmark; no proprietary-model distillation
  in training (PRACTICE/vendor numbers, README tier).
- **xLAM** (Salesforce): family of action models; on Berkeley
  Function-Calling Leaderboard style evaluation the 3B variant posts
  ~65.7% overall / 88.2% AST-level single-turn, the 1B ~54.0% overall
  with multi-turn collapsing to ~8.4% (numbers as reported in the
  TinyLLM edge-agents evaluation, arXiv 2511.22138 — MEASURED,
  abstract tier). Single-turn structured emission is where small
  models are already strong; long-horizon multi-turn is where they
  fall off (SYNTHESIS on those numbers).
- **The NVIDIA position** ("Small Language Models are the Future of
  Agentic AI," Belcak et al., arXiv 2506.02153): agentic workloads
  are narrow, repetitive subtasks (route, extract, format the call);
  SLMs are "sufficiently powerful, inherently more suitable, and
  necessarily more economical"; serving a 7B model is priced at
  10-30x cheaper than 70-175B in latency, energy, and FLOPs; includes
  an LLM→SLM conversion procedure (collect agent traces → cluster
  subtasks → fine-tune specialists) (PRACTICE — position paper with
  stated numbers, not a controlled study).

### 4.2 Constrained decoding: the complement, and its two measured costs

- **Mechanics**: Outlines (Willard & Louf, arXiv 2307.09702)
  reformulates regex/CFG-constrained generation as FSM transitions
  with negligible per-token overhead (MEASURED, abstract tier);
  llguidance/XGrammar are the production descendants (PRACTICE).
  JSONSchemaBench (Geng et al., arXiv 2501.10868) tests six
  frameworks over ~10K real-world schemas on coverage, efficiency,
  and quality (MEASURED, abstract tier); the house projection survey
  already recorded its lean — flat, shallow, enum-light schemas are
  the reliable regime; `oneOf` unions collapse reliability (house
  survey, cited as internal grounding).
- **Cost 1 — reasoning**: "Let Me Speak Freely?" (Tam et al., EMNLP
  2024; arXiv 2408.02442): the stricter the format constraint, the
  larger the reasoning degradation (MEASURED, abstract tier).
- **Cost 2 — distribution distortion**: "Grammar-Aligned Decoding"
  (Park et al., NeurIPS 2024; arXiv 2405.21047): token-level grammar
  masking yields grammatical outputs whose likelihoods are NOT the
  model's conditional distribution under the constraint — outputs
  are systematically low-quality; their ASAp sampler provably
  converges to the true grammar-conditioned distribution and
  measures higher-likelihood outputs (MEASURED, abstract tier).
- **When constraint suffices vs when to fine-tune** (SYNTHESIS on
  the above + §4.1): constraint alone suffices when the grammar is
  small/flat and the *content* decisions (which digest, which kind)
  are easy given context; fine-tuning earns its cost when (a) call
  volume makes the 10-30x economics bite, (b) the choice among
  lawful sentences carries the difficulty (semantics, not syntax),
  or (c) format-constraint reasoning tax on a frontier model exceeds
  a specialist's gap. These regimes compose: the production pattern
  is a fine-tuned emitter UNDER grammar masking, with the door as
  final authority.
- **Speculative decoding** (Leviathan et al., ICML 2023; arXiv
  2211.17192): a small draft model proposes, the large model
  verifies, output distribution provably identical, 2-3x wall-clock
  on T5-XXL (MEASURED, abstract tier). Over a DSL the draft can be
  tiny (the surface language is near-regular); no published
  DSL-specific draft-model study was found (absence, §6).

### 4.3 Neurosymbolic division of labor

- **PAL** (Gao et al., arXiv 2211.10435): LLM writes a program as
  the reasoning artifact; the Python interpreter executes;
  +15 points over chain-of-thought PaLM-540B on GSM8K with a smaller
  model — "decomposing the problem into runnable steps remains the
  only learning task for the LLM, while solving is delegated to the
  interpreter" (MEASURED, abstract tier). Program-of-Thoughts is the
  contemporaneous same-shape result (LEAD, not fetched).
- **Scallop** (Li, Huang, Naik, arXiv 2304.04812; PLDI 2023):
  Datalog with neural predicates and provenance-semiring
  differentiation — logic rules stay symbolic and exact, perception
  stays neural, gradients flow end-to-end; eight applications with
  better data/runtime efficiency than end-to-end baselines (MEASURED,
  abstract tier). **DeepProbLog** (Manhaeve et al., NeurIPS 2018;
  arXiv 1805.10872) is the probabilistic-logic ancestor (MEASURED,
  abstract tier).
- **Learned components inside data systems** — the "statistical
  constructs in data processing" branch: "The Case for Learned Index
  Structures" (Kraska et al., arXiv 1712.01208; SIGMOD 2018) — an
  index IS a model of the key→position CDF; learned indexes beat
  optimized B-trees by up to ~70% speed at an order of magnitude
  less memory (MEASURED, abstract tier); learned cardinality
  estimation is the same move for query optimizers (LEAD). Estate
  mapping (SYNTHESIS): these live *inside* engines as approximations
  whose errors are caught by exact structures around them — the
  general integration law all of Area C obeys: **the statistical
  construct proposes; an exact construct disposes.** In estate
  terms: a model may sit anywhere a refusal-checked door or a
  verify-on-read stands behind it; it may never BE the door.

### 4.4 UI integration: prose in, lawful sentences out, door in the middle

- **Semantic parsers as UI command layers**: "Task-Oriented Dialogue
  as Dataflow Synthesis" (Andreas et al., TACL 2020; arXiv
  2009.11423; Microsoft Semantic Machines): dialogue state is a
  dataflow graph; each user turn extends the graph with a program;
  explicit metacomputation operators for reference ("that meeting")
  and revision ("make it 3pm instead") make complex intents
  predictable for learned models; seq2seq over this representation
  matches specialized state trackers (MEASURED, abstract tier). This
  is the strongest published precedent for "the UI speaks a program
  algebra and the model is the parser" — including the estate-shaped
  detail that *revision is a new program referencing the old one*,
  not mutation (SYNTHESIS: cf. successor declarations).
- **The pattern for the estate's front door** is §3.1's Shin et al.
  loop verbatim: model paraphrases prose intent into
  canonical-sentence space (the prose projection is the estate's
  canonical-utterance layer), constrained decoding keeps it inside
  the grammar, the admission door validates, and on refusal the
  taught repair is fed back (SYNTHESIS on MEASURED components).
- **Repair-loop convergence, as measured anywhere**: thin. VeriHarness
  runs a 4-call cap and reports success-within-budget, not
  iterations-to-convergence (MEASURED, abstract tier); FeedbackEval
  measures single- and multi-round repair success by feedback type;
  RLEF *trains* the loop and cuts samples ~10x; the agent-robustness
  benchmarks (τ-bench pass@k; "Failing Tools"; ToolFailBench — LEADs,
  surfaced not fetched) measure recovery *behaviors* (retry vs
  switch vs loop) and find weak models enter repetitive retry loops
  without reducing uncertainty. NO published distribution of
  "attempts until a verifier admits" for tool emission was found —
  logged as an absence the estate can fill cheaply, since the door
  makes every attempt classifiable (§6).

---

## 5. Area D — the estate-specific synthesis (SYNTHESIS throughout)

Everything in this section is SYNTHESIS: this memo's own mapping,
grounded in the MEASURED items above and the estate files read this
session (`docs/design/2026-08-18-plait-kernel-algebra.md` §4-§5;
`verify/kernel/projections/kernel.ts`, `tools.schema.json`; the house
projection survey). It proposes candidate experiments for grilling;
it does not license a build.

### 5.1 The triad is already on hand

The three components every Area B loop had to construct from scratch
exist in the estate as proof infrastructure:

| Loop component (canon) | Canon example | Estate artifact, today |
| --- | --- | --- |
| Closed-grammar generator with labels correct by construction | AlphaGeometry's rule sampler; Overnight's grammar; RobustFill's DSL sampler | the Lean model's emitter — generated vectors, byte-identical on regeneration, label-perfect by the generated-vectors ruling |
| Verifier / reward oracle | Lean kernel (AlphaProof); execution (Karel, RLEF); unit tests (RLVR) | the ONE admission door — every act admits or refuses, refusals typed |
| Dense structured feedback | PRM800K step labels (built by hand, 800K human labels); ToolPRM's masking+rollout+annotation pipeline (built) | taught refusals: reason + law + repair, machine-applicable subset — emitted free on every wrong sentence |
| Hard negatives with labeled causes | adversarial mining, manual curation | closure-row planted unlawful programs, each with the law it violates named — negatives with *reasons* as labels |
| Eval harness | benchmark construction (a paper each) | the Q1 eval harness (the estate's existing kernel-language eval rig) |

The one canon component with no estate analog is DreamCoder's library
growth — deliberately, since the alphabet grows only by ruling; its
lawful analog is learned composition macros landing as cataloged
template values (§3.3).

### 5.2 The two loops, mapped

**Loop I (interpreter probe — science).** Grokking's task menu maps
onto the rung ladder with almost embarrassing directness: modular
addition = cyclic group; S5 = non-abelian group; the ladder's lower
rungs (monoid, commutative monoid, semilattice) are *weaker* —
associativity only, then +commutativity, then +idempotence. Published
grokking evidence covers the group end; whether idempotent/absorptive
structures coalesce as cleanly appears unmeasured (§6). The estate
can generate complete operation tables for declared algebras at every
rung (join tables for cells, fold steps, meet tables for writs), plus
OthelloGPT-style trace corpora (kernel act sequences) for probing
whether anchors/heads/rungs become linearly decodable internal state.
Payoff: a measured statement of the form "a 10^5-parameter
transformer internalizes the estate's rung-R algebra from N examples
under weight decay λ," and a probe suite for what a production
emitter has actually internalized.

**Loop E (emitter — product).** The near-term production shape,
assembled entirely from measured components: fine-tuned small model
(1-3B; §4.1 precedents) emitting the eight flat tool sentences under
grammar masking (§4.2), the door validating, taught refusals fed back
in-context (VeriHarness shape), with the whole loop optionally
RLVR-trained (door admit = reward; refusal kind = shaped signal). The
wire is in the reliable regime by prior house finding (flat, no
oneOf); the DAG program declaration is deferred to a later, separate
target (§2.4 boundary; house code-beats-graph finding).

### 5.3 The minimal first experiments, priced by the evidence

Three rungs, each small enough to refuse cheaply:

- **E-α (Loop I probe; days, one GPU).** Grokking replication on
  estate algebras. Model: 1-2 layer transformer, width 128-256
  (~10^5-10^6 params — the published regime). Data: complete
  operation tables for three declared algebras, one per ladder band
  (a commutative monoid; a semilattice join; a small group as the
  positive control known to grok), train fractions {20,30,50}%,
  AdamW + weight decay sweep. Eval: held-out cell accuracy;
  coalescence curves; Nanda-style probe for the semilattice
  (does idempotence show as a distinct circuit signature?). New
  knowledge regardless of outcome: either the ladder's weak rungs
  coalesce like groups (nobody has shown it) or they don't (a real
  boundary finding for algebra-first DSL design).
- **E-β (Loop E, supervised; the production rehearsal).** Fine-tune
  a 1-3B open model on generated (intent, kernel sentence) pairs:
  positives from the Lean emitter rendered through the prose
  projection (the Overnight/Shin canonical-utterance move — LLM
  paraphrases canonical prose into varied natural prose; labels stay
  generator-authored, so label-perfection survives paraphrase);
  negatives from closure rows WITH their refusal labels. Corpus:
  10^4-10^5 pairs (RobustFill/phi-1-small scale suggests this
  suffices for a closed surface). Eval on the Q1 harness: door
  admit-rate at first emission; refusal-class confusion; and the
  metric the literature lacks — attempts-to-admission distribution
  under taught-refusal feedback at a 4-call cap (directly comparable
  to VeriHarness's published deltas).
- **E-γ (the estate's unique claim; runs on E-β's corpus).**
  Repair-as-label: train on (unlawful sentence, taught refusal) →
  machine-applied repaired sentence triples — supervision the door's
  four machine-applicable repairs manufacture for free. A/B against
  binary-signal training (same tokens, refusal reduced to
  reject/accept). If repair-trained models converge faster or refuse
  better on *unseen* violation classes, that is a publishable,
  estate-branded result no external lab can cheaply replicate —
  their verifiers don't teach (R2-ambition adjacent; the splash rule
  still binds: verifier passes first).

### 5.4 Fences the mapping must respect

- **The door is law; the model is not.** Every integration in §4
  that works keeps the exact component authoritative (PAL's
  interpreter, AlphaGeometry's deduction engine, learned indexes'
  surrounding exact structures). A trained emitter is a proposer in
  front of the door — never a second admission path, never a second
  assembler.
- **Models are outside meaning.** A model's weights have no
  canonical bytes the estate would trust; a trained artifact enters
  the estate as an opaque blob-store resource with a digest, its
  *behavior* walled by the same corpora that trained it (dogfood
  rule: the eval must run the artifact).
- **No liveness claims.** Nothing here says an emitter converges;
  E-β measures whether it tends to, under a cap.
- **Generated, never hand-typed.** Every corpus above is emitted by
  executing the model — the standing vectors ruling extends to
  training data unchanged; hand-authored training examples would be
  the same defect class as hand-authored fixtures.

---

## 6. What would transfer — technique by technique

| Technique | Evidence tier | Needs from the estate | Smallest experiment |
| --- | --- | --- | --- |
| Grokking-style algebra internalization (Power/Nanda) | MEASURED (abstract tier), replicated widely | emitter: complete op tables per declared algebra + rung labels | E-α: 2-layer transformer per rung band; coalescence curves + probes |
| Trace world-model probing (OthelloGPT) | MEASURED (abstract tier) | emitter: lawful act-sequence corpora (session traces) | linear probes for anchor/rung/writ state on E-α/E-β models |
| Synthetic-only DSL training (RobustFill/Karel) | MEASURED (abstract tier) | emitter + prose projection for surface variety | E-β supervised fine-tune, 10^4-10^5 pairs, 1-3B model |
| Canonical-utterance paraphrase loop (Overnight → Shin 2021) | MEASURED (abstract tier) | prose projection as the canonical-utterance layer; door as validator | LLM-paraphrase augmentation of E-β corpus; few-shot baseline before any tuning |
| Verifier-loop RL / expert iteration (AlphaProof, Polu, RLVR, RLEF) | MEASURED (abstract tier) | door as reward oracle; refusal kinds as shaped signal | RLVR pass over the E-β model; compare vs SFT-only at equal compute |
| Process-level reward for structured emission (ToolPRM, Lightman) | MEASURED (abstract tier) | per-field refusal paths (refusals already carry path) | rerank E-β beams with a small PRM trained on field-level refusal data |
| Repair-as-label training (no external precedent; nearest: VeriHarness in-context) | MEASURED for in-context; ABSENT for training | machine-applicable repairs as supervision triples | E-γ A/B: repair-trained vs binary-trained, same token budget |
| Hard negatives with labeled reasons | ABSENT as a labeled-negative training study | closure rows + planted unlawful programs | ablate negatives in/out of E-β; measure refusal-class generalization to held-out violation classes |
| Grammar-constrained decoding (Outlines/llguidance) | MEASURED (abstract tier) + house survey | tools.schema.json patterns compiled to masks | zero-training baseline: frontier + masks vs E-β on the Q1 harness |
| Distribution-true constrained sampling (GAD/ASAp) | MEASURED (abstract tier) | same grammar masks | check whether greedy masking distorts E-β outputs on ambiguous intents |
| Speculative decoding with DSL draft (Leviathan) | MEASURED for general text; ABSENT for DSLs | tiny draft trained on kernel sentences (E-α scale) | measure acceptance rate of a 10^6-param draft against a large target on kernel emission |
| SLM cost displacement (NVIDIA position; xLAM/NexusRaven) | PRACTICE + vendor MEASURED | call-volume telemetry from real agent sessions | cost/latency/accuracy triple: E-β model vs frontier+masks on the same workload |
| PAL-style division of labor | MEASURED (abstract tier) | nothing new — the kernel IS the interpreter | none needed; adopt as framing: model emits programs, kernel executes |
| Dataflow-graph UI command layer (SMCalFlow) | MEASURED (abstract tier) | prose→sentence parser + session journal for reference/revision | prototype "revise that declaration" flows as successor-declaration emission |
| Learned components inside folds (learned indexes) | MEASURED (abstract tier) | none near-term; would need a declared-fold boundary + exact fallback | out of scope until a concrete fold has a measured hot path |

## 7. Honest absences — what nobody has measured

1. **Training on repair-annotated refusals.** All measured
   richer-feedback results are in-context (FeedbackEval, VeriHarness,
   2506.18315) or reward-shaped (ToolPRM, RLEF). No study trains on
   (bad output, structured refusal, repaired output) triples as
   supervision. The estate's machine-applicable repairs make this
   corpus free; nobody else appears to have one.
2. **Repair-loop convergence distributions.** No published
   iterations-to-acceptance curves for verifier-gated emission;
   budgeted success rates only (4-call caps, pass@k). The door makes
   every attempt classifiable by refusal kind — the estate could
   publish the first such curve.
3. **Grokking on idempotent/absorptive structures.** The
   grokking literature covers modular arithmetic and permutation
   groups; nothing found on semilattices (idempotent join) or the
   monoid→group gradation the rung ladder walks — i.e., whether
   coalescence difficulty tracks algebraic strength is unmeasured.
4. **Content-addressed reference emission.** No study of models
   emitting digest-valued references (opaque 64-hex handles) as
   argument values — the house projection survey hit the same
   absence for the `schema`-digest field. Reliability of
   digest-slot filling under context pressure is unknown territory.
5. **DSL-specific speculative drafting.** Speculative decoding is
   measured on general text; no published study exploits a closed
   DSL's near-regular surface with a micro-draft model.
6. **Fine-tuned SLM vs frontier+constrained-decoding, matched on a
   closed DSL.** §4's cost claims compare general agentic workloads;
   no head-to-head on a small closed algebraic language with a
   verifier was found — E-β/baseline would be such a measurement.
7. **oneOf-free wire at scale over long horizons.** Single-turn flat
   emission is strong (xLAM AST-level ~88%); multi-turn collapses
   (~8% at 1B). Whether taught-refusal feedback closes the
   multi-turn gap for small models is unmeasured.

## 8. Grill-ready open questions

- **LI-1.** Loop I or Loop E first? E-α is cheapest and
  operator-educational (Lean emitter reuse, probe methodology), but
  E-β is the production rehearsal. Which earns the first GPU-day,
  and does E-α's outcome actually gate anything in E-β?
- **LI-2 (the estate's claim).** Is E-γ (repair-as-label) worth
  pre-registering as the estate-of-safety-style headline experiment —
  the one result the taught-refusal architecture uniquely enables —
  and what admission bar would the R2 splash rule set for it?
- **LI-3.** Decode discipline for the emitter: raw sampling +
  door-as-filter, greedy grammar masking (distribution distortion,
  GAD), or ASAp-style aligned sampling? The door refuses safely
  either way; the question is sample efficiency vs emission quality.
- **LI-4.** Corpus distribution policy: who owns the sampling law —
  uniform over grammar depth (clean support measurement), execution-
  realistic (session-trace shaped), or the 2604.27551 lean (maximize
  diversity across syntactic AND semantic manifolds)? Is the sampler
  itself a declared, digested value (generated-vectors discipline
  extended to the sampling seed and policy)?
- **LI-5.** Negatives ratio and generalization: closure rows give
  labeled unlawful programs — what positive:negative mix, and is
  the eval criterion "refuses correctly on held-out violation
  CLASSES" (support generalization for refusals) rather than
  held-out instances?
- **LI-6.** Multi-turn: single-turn flat emission is the measured
  sweet spot; session-length agency is the measured cliff. Does the
  estate's UI keep the model single-turn by construction (one
  sentence, one door verdict, one repair) and push horizon onto the
  session machinery — and is that a design law worth stating?
- **LI-7.** Digest-slot filling (absence #4): does the emitter ever
  *generate* digests, or only *select* from resolved context? A
  selection-only fence (digests enter the prompt via resolve/fold,
  the model copies, the door verifies) would make hallucinated
  references structurally impossible rather than merely refused.
  Should that be a stated law of any estate training loop?
- **LI-8.** Test-time variants (AlphaProof's move): typed holes
  already parameterize program families — is hole-valuation sweep
  the estate's variant generator for hard cases, and does that
  belong in the Q1 harness or the training loop?
- **LI-9.** Holdout discipline under byte-identical regeneration:
  split by seed, by grammar region (support split), or by generator
  version? What prevents eval leakage when the corpus is
  deterministically regenerable by anyone holding the emitter?
- **LI-10.** The cost gate: at what measured call volume and
  accuracy delta does a fine-tuned 1-3B emitter displace
  frontier+masks for estate workloads (NVIDIA's 10-30x is a serving
  claim, not a workload measurement)? What telemetry must exist
  before that comparison is honest?

## 9. Sources

### Fetched-primary (arXiv abstract page, vendor announcement, or article read this session)

Area A:
- Power et al., "Grokking: Generalization Beyond Overfitting on Small Algorithmic Datasets," arXiv:2201.02177 (2022). https://arxiv.org/abs/2201.02177
- Nanda, Chan, Lieberum, Smith, Steinhardt, "Progress measures for grokking via mechanistic interpretability," ICLR 2023, arXiv:2301.05217. https://arxiv.org/abs/2301.05217
- Li et al., "Emergent World Representations: Exploring a Sequence Model Trained on a Synthetic Task," ICLR 2023 oral, arXiv:2210.13382. https://arxiv.org/abs/2210.13382
- Wang et al., "Grokked Transformers are Implicit Reasoners: A Mechanistic Journey to the Edge of Generalization," arXiv:2405.15071 (2024). https://arxiv.org/abs/2405.15071
- Veličković et al., "The CLRS Algorithmic Reasoning Benchmark," ICML 2022, arXiv:2205.15659. https://arxiv.org/abs/2205.15659
- Ibarz et al., "A Generalist Neural Algorithmic Learner," LoG 2022, arXiv:2209.11142. https://arxiv.org/abs/2209.11142
- Lake, Baroni, "Generalization without systematicity" (SCAN), ICML 2018, arXiv:1711.00350. https://arxiv.org/abs/1711.00350
- Kim, Linzen, "COGS: A Compositional Generalization Challenge Based on Semantic Interpretation," EMNLP 2020, arXiv:2010.05465. https://arxiv.org/abs/2010.05465
- Delétang et al., "Neural Networks and the Chomsky Hierarchy," ICLR 2023, arXiv:2207.02098. https://arxiv.org/abs/2207.02098
- Zhou et al., "Teaching Algorithmic Reasoning via In-context Learning," arXiv:2211.09066 (2022). https://arxiv.org/abs/2211.09066
- Zaremba, Sutskever, "Learning to Execute," arXiv:1410.4615 (2014). https://arxiv.org/abs/1410.4615

Area B:
- Wang, Berant, Liang, "Building a Semantic Parser Overnight," ACL 2015. https://aclanthology.org/P15-1129/ (method details corroborated via https://nlp.stanford.edu/pubs/wang-berant-liang-acl2015.pdf search surfacing)
- Devlin et al., "RobustFill: Neural Program Learning under Noisy I/O," ICML 2017, arXiv:1703.07469. https://arxiv.org/abs/1703.07469
- Bunel et al., "Leveraging Grammar and Reinforcement Learning for Neural Program Synthesis," ICLR 2018, arXiv:1805.04276. https://arxiv.org/abs/1805.04276
- Balog et al., "DeepCoder: Learning to Write Programs," ICLR 2017, arXiv:1611.01989. https://arxiv.org/abs/1611.01989
- Ellis et al., "DreamCoder: Growing generalizable, interpretable knowledge with wake-sleep Bayesian program learning," arXiv:2006.08381 (PLDI 2021). https://arxiv.org/abs/2006.08381
- Trinh et al., AlphaGeometry — DeepMind announcement, 2024-01-17. https://deepmind.google/blog/alphageometry-an-olympiad-level-ai-system-for-geometry/ (Nature 2024 article s41586-023-06747-5 paywalled this session)
- Polu et al., "Formal Mathematics Statement Curriculum Learning," arXiv:2202.01344 (2022). https://arxiv.org/abs/2202.01344
- Lambert et al., "Tulu 3: Pushing Frontiers in Open Language Model Post-Training," arXiv:2411.15124 (2024). https://arxiv.org/abs/2411.15124
- DeepSeek-AI, "DeepSeek-R1: Incentivizing Reasoning Capability in LLMs via Reinforcement Learning," Nature 645:633-638 (2025), arXiv:2501.12948. https://arxiv.org/abs/2501.12948
- Lightman et al., "Let's Verify Step by Step," arXiv:2305.20050 (2023). https://arxiv.org/abs/2305.20050
- Gehring et al., "RLEF: Grounding Code LLMs in Execution Feedback with Reinforcement Learning," arXiv:2410.02089 (2024). https://arxiv.org/abs/2410.02089
- Olausson et al., "Is Self-Repair a Silver Bullet for Code Generation?," ICLR 2024, arXiv:2306.09896. https://arxiv.org/abs/2306.09896
- "FeedbackEval: A Benchmark for Evaluating LLMs in Feedback-Driven Code Repair Tasks," arXiv:2504.06939 (2025). https://arxiv.org/abs/2504.06939
- "Effective LLM Code Refinement via Property-Oriented and Structurally Minimal Feedback," arXiv:2506.18315 (2025). https://arxiv.org/abs/2506.18315
- "Structured Feedback Improves Repair in an LLM Agent Loop" (VeriHarness), arXiv:2607.14167 (2026). https://arxiv.org/abs/2607.14167
- "ToolPRM: Fine-Grained Inference Scaling of Structured Outputs for Function Calling," ACL 2026, arXiv:2510.14703. https://arxiv.org/abs/2510.14703
- Eldan, Li, "TinyStories: How Small Can Language Models Be and Still Speak Coherent English?," arXiv:2305.07759 (2023). https://arxiv.org/abs/2305.07759
- Gunasekar et al., "Textbooks Are All You Need" (phi-1), arXiv:2306.11644 (2023). https://arxiv.org/abs/2306.11644
- Shi et al., "ExeDec: Execution Decomposition for Compositional Generalization in Neural Program Synthesis," ICLR 2024, arXiv:2307.13883. https://arxiv.org/abs/2307.13883
- "Beyond the Training Distribution: Mapping Generalization Boundaries in Neural Program Synthesis," arXiv:2604.27551 (2026). https://arxiv.org/abs/2604.27551

Area C:
- Patil et al., "Gorilla: Large Language Model Connected with Massive APIs," arXiv:2305.15334 (2023). https://arxiv.org/abs/2305.15334
- Belcak et al., "Small Language Models are the Future of Agentic AI," arXiv:2506.02153 (2025). https://arxiv.org/abs/2506.02153
- Willard, Louf, "Efficient Guided Generation for Large Language Models" (Outlines), arXiv:2307.09702 (2023). https://arxiv.org/abs/2307.09702
- Park et al., "Grammar-Aligned Decoding," NeurIPS 2024, arXiv:2405.21047. https://arxiv.org/abs/2405.21047
- Geng et al., "JSONSchemaBench" ("Generating Structured Outputs from Language Models: Benchmark and Studies"), arXiv:2501.10868 (2025). https://arxiv.org/abs/2501.10868
- Tam et al., "Let Me Speak Freely? A Study on the Impact of Format Restrictions on Performance of Large Language Models," EMNLP 2024 industry, arXiv:2408.02442. https://arxiv.org/abs/2408.02442
- Leviathan et al., "Fast Inference from Transformers via Speculative Decoding," ICML 2023 oral, arXiv:2211.17192. https://arxiv.org/abs/2211.17192
- Gao et al., "PAL: Program-aided Language Models," ICML 2023, arXiv:2211.10435. https://arxiv.org/abs/2211.10435
- Li, Huang, Naik, "Scallop: A Language for Neurosymbolic Programming," PLDI 2023, arXiv:2304.04812. https://arxiv.org/abs/2304.04812
- Manhaeve et al., "DeepProbLog: Neural Probabilistic Logic Programming," NeurIPS 2018 spotlight, arXiv:1805.10872. https://arxiv.org/abs/1805.10872
- Andreas et al., "Task-Oriented Dialogue as Dataflow Synthesis," TACL 8:556-571 (2020), arXiv:2009.11423. https://arxiv.org/abs/2009.11423
- Shin et al., "Constrained Language Models Yield Few-Shot Semantic Parsers," EMNLP 2021, arXiv:2104.08768. https://arxiv.org/abs/2104.08768
- Kraska et al., "The Case for Learned Index Structures," SIGMOD 2018, arXiv:1712.01208. https://arxiv.org/abs/1712.01208

### Abstract-tier / search-corroborated (numbers taken from search-surfaced text or secondary write-ups, not the primary read in full)

- AlphaProof: "Olympiad-level formal mathematical reasoning with reinforcement learning," Nature (2025), s41586-025-09833-y — ~1M informal problems → ~80M formal Lean statements; IMO 2024 28/42 (silver level), P1/P2/P6 solved; test-time RL via theorem variants; encoder-decoder described by an author as relatively small. https://www.nature.com/articles/s41586-025-09833-y ; author blog read: https://www.julian.ac/blog/2025/11/13/alphaproof-paper/ ; DeepMind 2024 announcement: https://deepmind.google/blog/ai-solves-imo-problems-at-silver-medal-level/
- NexusRaven-V2 13B vs GPT-4 (+4% avg, up to +7% nested) — vendor README/benchmark. https://github.com/nexusflowai/NexusRaven-V2
- xLAM BFCL-style numbers (3B ~65.7% overall / 88.2% AST; 1B ~54.0%, multi-turn 8.4%) — as reported in "TinyLLM: Evaluation and Optimization of Small Language Models for Agentic Tasks on Edge Devices," arXiv:2511.22138. https://arxiv.org/abs/2511.22138
- NVIDIA 10-30x serving-cost claim — paper text surfaced via search of arXiv:2506.02153 PDF. https://arxiv.org/pdf/2506.02153
- Grokking setup specifics (S5 table, [a,b,=] format, ~30% split; modular division p=97 with 2-layer/128-dim at 50%) — via replication papers surfaced in search (e.g., arXiv:2604.20923, arXiv:2603.05228).
- House internal grounding (read in place): `docs/design/2026-08-18-plait-kernel-algebra.md` (§4-§5); `verify/kernel/projections/{kernel.ts, tools.schema.json}`; `docs/research/2026-08-18-kernel-language-projection-survey.md` (flat-schema reliability, oneOf collapse, code-beats-graph).

### Leads (found, not verified this session)

- Nanda et al., "Emergent Linear Representations in World Models of Self-Supervised Sequence Models" (Othello linear world model), arXiv:2309.00941.
- Liu et al., "Omnigrok: Grokking Beyond Algorithmic Data."
- AlphaGeometry model size ~150M parameters (secondary coverage of the Nature paper).
- τ-bench / τ²-bench (pass@k agent-consistency evaluation); "Failing Tools: Benchmarking LLM Agent Recovery Under Runtime Tool Failures" (OpenReview); "ToolFailBench," arXiv:2607.04686; "When Tools Fail," arXiv:2606.05806.
- Hammer (function masking for on-device function calling), arXiv:2410.04587.
- Chen et al., "Program of Thoughts"; "Teaching Large Language Models to Self-Debug."
- Learned cardinality estimation lineage (MSCN and successors).
- NVIDIA Dynamo (SLM inference serving OS) — vendor.
