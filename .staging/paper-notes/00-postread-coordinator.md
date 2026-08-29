# Post-read — coordinator

Paper: HILBERT (Varambally, Voice, Sun, Chen, Yu, Ye — Apple/UCSD, ICLR 2026).
Read against `00-preread-coordinator.md`. Answers in the order I asked.

## 1. Where is the boundary?

**The compiler's stdin.** Every object that crosses HILBERT's trust line is a
Lean *source string* handed to the Kimina Lean Server. Sketch, subgoal,
assembled proof, final proof — all text. There is no term, no goal, no
certificate; there is a file and an exit code.

This is not incidental, and the paper says so out loud (§3.2.1 Step 3):

> "This approach proves more reliable than parsing source code directly or
> extracting subgoals from Lean 4's proof state data structure (InfoTree)."

They had the structured object — `InfoTree`, the real proof state — and they
**chose to re-derive it by asking a language model to re-read the text.** That
sentence is the most important one in the paper and it is reported as an
implementation note. The structured representation was harder to use than
round-tripping through an LLM. That is an API failure being paid for in tokens,
and it is precisely the failure this estate exists to not have.

## 2. What is the unit of retry?

Better than I expected, then thrown away. `proved_subgoals` is threaded:
`SOLVEALLSUBGOALS` iterates over `subgoals \ proved_subgoals` (Alg. 2:5), so a
subgoal discharged during validation is not re-proved during solving. A real
partial certificate.

But it is keyed by nothing. It is a Python dict, alive for one sketch attempt.
On the failure path `REFINEANDVALIDATESKETCH` returns `⊥, ∅, ∅` (Alg. 3:6, 10,
14, 23) and every proved subgoal in that attempt is discarded — across sketch
revisions, across recursion siblings, across problems, across runs. Worse:
`VALIDATESUBGOALS` bails on the *first* mathematically-incorrect subgoal
(Alg. 3:41 — the "First Failure" criterion) and drops the proofs it already
had.

The store makes this loss structurally impossible, and for free: a proved
subgoal is content, addressed by its statement. `putTree_correct`/F2 already
proves shared subterms deduplicate through `put`. HILBERT's cache is a dict
with the wrong lifetime; ours is the identity of the thing.

## 3. What does the checker return on failure?

An **error string**, pasted into the next prompt. Nothing else. Compare
`Cas/Lift/Taxonomy.lean`: a closed refusal taxonomy, per-constructor doc
comments carrying a concrete offending example, and a `spectrum` rollup grading
each refusal by the computation class it would need — total by construction
because it is a function on an inductive. That is what a rich negative answer
looks like. HILBERT has `str`.

Note the asymmetry this creates in their own results: Gemini's failures land
44.8% at *shallow solve* (A.7) — the loop that is fed nothing but error text.
The impoverished negative answer is visible in the failure distribution.

## 4. Is the search state first-order?

No. It is Python objects plus asyncio futures. Not serialisable, not hashable,
not resumable, not showable. The 22.8M-token run is not an artifact; it is a
process that happened. Its 15,306-line output cannot be attributed back to the
decisions that produced it.

## 5. What did they NOT prove?

Everything above the kernel — and correctly. Trusted base is Lean 4.15 +
Mathlib + the Kimina server. Same posture as this estate: gate the door, don't
verify the pipeline. Defensible and well-drawn. No complaint.

## 6. Did the abstraction make them organized?

**Yes, once, and they did not notice.** §3.2.1 Step 4:

> "We then verify both the subgoal theorem statements and the assembled proof
> together ... This guarantees that after all subgoals are proven, we will have
> a complete proof of the given theorem."

That is the whole paper's good idea. Before spending a token on the hard work,
they establish a **frame**: a machine-checked implication `obligations ⊢ target`,
with the obligations still open. It is the same move as admission-before-content
— the shape is committed and checked while it is still cheap, so all later work
is discharge inside a guarantee, never a hope.

It buys three things at once, and this is the operator's thesis, earned:

- *soundness* — the composition step can no longer be wrong;
- *organization* — the search becomes a set of independent, named obligations
  instead of one long string;
- *legibility* — there is now a contract you could **put on a screen**: N named
  obligations, each a statement, plus a guarantee that they suffice.

They collected the first two. The third they left on the floor: the verified
skeleton is an intermediate value in a Python function and is never surfaced to
anyone. This is exactly the gap P4 names — the provably-good move was made and
its legibility dividend was never collected, because nothing in the system
treats it as an artifact.

## The steal

**A sketch is a program whose leaves are obligations.**

`sorry` is not a placeholder; it is a typed hole, and the checked skeleton is a
proof of an implication. That object is not a string — it is a free-monad term
over an obligation signature. Discharging a subgoal is *handling* an operation.
Recursive decomposition is *handler composition*. Depth `D` is fuel. The
"First-Success / First-Failure / Wait-for-All" pool is a three-element
scheduling vocabulary that belongs in a handler, not a Python class.

And `Prog`'s initiality (`eq_of_forall_interpret`) says two sketches agreeing
under every interpretation are equal — so sketch identity is free, which is the
memoization HILBERT cannot have.

## Where I was wrong

I expected to find a prompt template and a while loop. I found a prompt corpus
that is a **de-facto type system written in English** (A.2: the natural-number
division/subtraction rule appears twice, in capitals, in two different prompts,
because there was nowhere in the API to put it). That is more interesting than
a bad abstraction — it is a well-located one with no home. The right question
is not "what would have to be true for this to be more than a loop" but
**"where does that shouting go when the language can hold it?"**
