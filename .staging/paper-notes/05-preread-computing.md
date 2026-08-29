# Pre-read note — computing seat

Written before opening the PDF. I know only: "HILBERT: Recursively Building Formal
Proofs with Informal Reasoning" (Apple/UCSD, ICLR 2026), and that the operator wants
the abstractions, not the method.

I hold the seat that has to *run* this and *pay* for it. My questions are about
execution, scheduling, cost, caching, and what survives the run as evidence.

## What I want to hear from it

1. **What is the completion criterion, and is there more than one?**
   A recursive prover fans out. Fan-out needs a rule for when the fan closes. I expect
   at least three distinct rules to be live in any real implementation: wait for all
   children (a conjunction of subgoals), stop at the first success (a disjunction of
   candidate proofs), and stop at the first failure (a gate). If the paper has all
   three, they are not three flags on a thread pool — they are a three-element algebra
   over a search node, and I want to see whether the authors noticed that or wrote it
   as three `if` branches. **This is the question I most want answered.**

2. **Where does concurrency live — in the language or in the runner?**
   Here `Prog` is a free monad over a signature sum, and concurrency is *not* in the
   signature. That is a deliberate omission or an oversight, and I do not yet know
   which. If HILBERT's parallelism is expressible as a handler decision — same program,
   different scheduler, same denotation — then the omission is correct and I will
   defend it. If the search *shape* changes with the scheduler (different answers, not
   just different wall-clock), then concurrency is semantic and belongs in the
   signature. I want the paper to force this fork rather than let me duck it.

3. **How much of the compute is re-derived work?**
   Content addressing is free in this estate. `putTree_correct` already gives shared
   subterms deduplication through `put`. A recursive proof search over a decomposed
   goal tree is *exactly* the workload where the same lemma gets attempted many times
   from different parents. I want numbers: calls, tokens, proof lengths, candidates per
   node. From those I want to estimate the *dedup ratio* HILBERT is leaving on the
   floor — across the candidates for one goal, across sibling goals in one problem, and
   across problems in the benchmark. If content addressing buys nothing here, I need to
   know why, because that would be a real result against my seat's assumption.

4. **Is the LLM call keyed by content?**
   The narrow version of (3). Is the prompt a pure function of a hashable state? If it
   carries a timestamp, a nonce, a shuffled few-shot pool, or an accumulating chat
   transcript, then no cache can ever hit and the whole run is unreplayable. I expect
   the paper to be silent on this. Silence is itself the finding.

5. **What does a run cost, and is cost visible to the person steering it?**
   I want the token and call counts, and I want to know whether the system exposes any
   *steering* surface over them — a budget, a per-node cap, a stopping rule tied to
   spend — or whether cost is only reported in the eval table after the money is gone.
   My prior is the latter. If so, the design gap is: cost is a first-class object here
   and it should be *legible without being a dashboard*. Budget as a value in the
   program, not a gauge on a wall.

6. **What is the artifact of a run, and can it be replayed?**
   `Verdicts.lean` in this estate computes verdicts by executing the model, never by
   hand-writing them. That discipline is easy when the model is deterministic Lean. Put
   a sampling LLM in the loop and it gets hard, and the honest answer is probably: the
   *proof* is replayable (the checker is deterministic), the *search* is not. That
   split — a reproducible certificate over an irreproducible process — is the thing I
   want to see named. If the paper ships a proof and no trace, the trace is my
   contribution. If it ships a trace, I want to know its schema.

7. **How does it report failure?**
   `Gate.lean --check` visits every fixture, reports each, and fails **once** at the
   end: a red gate with three stale fixtures is one run, not three. That is a designed
   failure ergonomic and it exists because a partial report is more useful than a fast
   abort. A proof session with 40 open subgoals has the same shape. I want to know
   whether HILBERT reports the whole frontier or dies at the first unproved leaf — and
   if it reports the frontier, whether the report is ordered by anything a human would
   choose (cost? depth? blast radius?) or by iteration order.

8. **What is the retry unit, in resource terms?**
   The coordinator asks what is *kept* on retry. I ask the same question in dollars:
   when an attempt fails, how much of the spend is recoverable? If a failed candidate's
   subproofs are still valid lemmas, they are assets, and throwing them away is the
   expensive mistake. A content-addressed store makes "keep the parts that checked"
   free. I want to see whether they do it.

## What I expect to be disappointed by

That parallelism is an appendix — an `asyncio` pool with a semaphore, described as an
implementation detail — while the completion criteria hiding inside it are the most
transferable idea in the paper. And that cost appears exactly once, as a column in a
results table, with no mechanism attached to it.

## The bet I am recording now, to be scored later

- Concurrency belongs to the **handler**, not the signature. `Prog` stays sequential;
  the scheduler is a semantic choice made at interpretation. I will change my mind only
  if the paper shows search results that depend on scheduling order in a way the
  program cannot express.
- The **completion criterion** is the steal, and in this algebra it is not a thread-pool
  option — it is the shape of the node itself.
- The single most valuable screen is the **post-mortem**, not the live view. A live view
  of a proof search is a progress bar with extra steps. The post-mortem is where cost,
  cache hits, and the frontier become decisions.
