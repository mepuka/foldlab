# Pre-read — PROGRAMMING seat (the algebra)

Written before opening the paper. Known: title, authors, and that the
operator wants HILBERT's abstractions, not its method. What follows is what
I want the paper to answer, phrased in the algebra I already hold.

What I hold going in (read first, deliberately):
`Sig = ⟨Op, Ans⟩`; `Prog S A = pure | vis (op) (Ans op → Prog S A)`;
`CasSig` = put/load/fail with `fail`'s answer `Empty`;
`LlmSig` = one operation, `infer : String → String`;
`AgentSig = CasSig ⊕ₛ LlmSig`; `runAgent H oracle fuel p w`;
R14's four strata; and — the surprise — `Cas/Lang/Defun.lean`, where F3's
first bite has already landed: `PLine`/`PProg`, a straight-line program as a
finite table of first-order nodes, with `runP_embed_agree` and
`encodeProg_wf`. So "the program IS content" is not a wish here; it is a
theorem for the straight-line fragment.

---

## A. The signature question — what operations does HILBERT actually need?

**Q1 — Is the verifier an operation or a handler?**
Both readings are defensible and they disagree about soundness.
*Operation*: the compiler is an external process, exactly as opaque as the
model; it belongs in a signature, answers get recorded, admission gates.
*Handler*: checking is decidable, so it could be a Lean function and never
an effect at all.
The discriminator is the ANSWER TYPE. If `check` answers `ok | err msg`,
then the caller must handle both branches — refusal is a *value*, not a
type-level dead end, and it is a fundamentally different "no" from
`fail : … → Empty`. I want to know whether HILBERT distinguishes
**"this branch is dead"** (no continuation exists) from **"rejected, and
here is the goal state that survived"** (a continuation is owed and the
rejection is its input). Those are opposite shapes. `fail` covers only the
first. If HILBERT's verifier feeds error text back into the next prompt,
its "no" is the second, and this estate currently has no constructor for it.

**Q2 — Is the retriever an operation, or a `load` with a bad key?**
`load : Addr32 → Node` is address-keyed, total-on-present, and refuses
otherwise. Retrieval is content-keyed, approximate, and answers a *ranked
list*. That difference is the whole story: an operation whose answer is
`List α` with no specification **cannot affect soundness, only
completeness**. Does the paper say this out loud? If retrieval is stated as
sound-by-construction-irrelevant, the retriever is cheap to add and cheap to
get wrong, and that is a genuinely good design property worth naming.

**Q3 — Is there a third operation I am not expecting?**
My guess: "propose a decomposition" and "propose a leaf proof" will be the
same `infer` at two prompts. I think that is a mistake and I want to see
whether the paper feels it. Two operations with different answer types would
let the type system say which model calls may produce a *plan* and which may
produce a *term*. One stringly `infer` cannot.

**Q4 — What is the carrier of a goal?**
`infer : String → String` is stringly-typed on both ends, deliberately (the
answer enters only as recorded content). But if a goal state produced by the
verifier is consumed by the next prompt, goals are strings end-to-end and
nothing about a goal is decidable. `cas_struct` exists. Should a goal be a
schema'd node with an address? If two branches produce the same goal, in a
CAS they are the *same object*, for free.

## B. The recursion — `SUBGOALDECOMPOSITION(problem, header, depth)`

**Q5 — Is the depth cutoff `D` fuel, or a shape parameter?**
This estate already draws that line sharply. `run`'s fuel is a *termination
device*: exhausting it yields `Status.running`, an honest "I do not know
yet", and the fuel appears in no public statement. A depth cutoff smells
like the other thing — part of the *specification of what you asked for*,
which makes the recursion structural on `D : Nat`, needing no fuel, no
`partial`, and no `Status.running` at all. Which is it in HILBERT? If they
are conflating them, the conflation is the finding.

**Q6 — Where does breadth get bounded?**
Structural recursion on `D` bounds depth for free. Nothing bounds the number
of subgoals per node. If HILBERT bounds breadth by sampling *k* candidates,
that k is fuel of a different kind and should be visible as such.

**Q7 — Tree or DAG?**
The store is a DAG: identical content is the same address. If two branches
of the decomposition reach the same subgoal, this substrate deduplicates
them *by construction* — subgoal caching is not a feature to implement, it
is what `put` already does. Does the paper notice? Python dicts do not hash
proof states, so I expect a memo table bolted on, or nothing.

## C. The hole — the question I care most about

**Q8 — `sorry` is a term with a hole that TYPECHECKS. What is the CAS-native
form of that?** Three candidates, and I want the paper to tell me which
shape it is actually using:

- **(a) hole as refusal.** `failWith "hole"`. I already believe this is
  wrong and I want to say why in one line: `fail` answers `Empty` — *no
  continuation exists*. A hole is precisely a place where a continuation is
  **owed**. Refusal and incompleteness are different modalities and
  collapsing them loses the only interesting thing about a sketch.
- **(b) hole as an operation in its own signature.** `SketchSig` with
  `hole : Goal → Proof`; a sketch is `Prog (CasSig ⊕ₛ SketchSig) A`; filling
  holes is *handling `SketchSig` away*, and a **complete proof is a program
  over a signature that has no `hole` operation**. Completeness becomes a
  type rather than a predicate, and `⊕ₛ` — which already exists — does all
  the work. This is the elegant answer.
- **(c) hole as a first-order operand.** `Defun.lean` already has
  `PIn = lit a | ans i`: a positional reference to an answer *not yet
  computed when the table was authored*. A hole may be nothing more than a
  third constructor, `PIn.hole j` — which would make a partial program
  **admissible store content**: addressable, hashable, diffable, gateable.

  (b) and (c) are not rivals; they are the same object at two R14 strata,
  and that is the point of Q9.

**Q9 — At which stratum does a hole's IDENTITY live?**
A hole in stratum 2 (`Prog`) has propositional equality, needs `funext`, and
is **invisible to hashing** — you cannot address "the sketch with three
holes", cannot cache it, cannot diff two attempts, cannot gate it. A hole in
stratum 1 (`PLine`, first-order, `DecidableEq`) can do all of that. So the
operational question for the paper is simply: **does HILBERT ever need to
address a partial proof?** Cache it, dedupe it, compare two candidate
fillings, ship it to another worker? If yes, it needs stratum 1 and almost
certainly does not know it, because in Python there is only one stratum.

**Q10 — Is the skeleton's judgment transportable?**
If a `sorry`-ed sketch typechecks, the *skeleton is machine-checked* and only
the leaves are open — the sketch carries a real judgment. So: when a hole is
filled with a term of the stated type, does the surrounding proof stay
proved, or is the whole file re-checked? If re-checked, the paper has
discarded the entire value of the hole abstraction and kept only its
ergonomics. Compositionality here is the difference between a *typed
interface between the model and the kernel* and a *prompt template*.

**Q11 — What law would I owe?** (stating it now so I can be held to it)
Something like **hole-filling refines**: a filling agrees with the sketch on
every hole-free line, and filling a hole-free program is the identity. Plus
a sharing statement the store makes literally true rather than metaphorical:
a sketch and its filling differ only at the filled addresses; every other
node is the same node. **PENDING** — I have no such theorem and will not
imply one. `Defun.lean`'s own round-trip laws are currently ROLLED BACK
(C4, 2026-08-28), so even the hole-free case is not fully closed.

## D. What is unrepresentable

**Q12 — What does HILBERT make impossible by construction, versus by
convention, assertion, or retry?** My prior is: nothing. Python makes nothing
unrepresentable. So the useful reading is inverted — I intend to read the
failure-mode section as **a list of missing types**, and ask for each failure
whether a signature could have excluded that state.

**Q13 — Gate or retry?** R15's loop is acquire → ingest → normalize → gate →
admit, with standing empty trust. A retry is not a gate. The verifier's
verdict is the only thing that *can* be a gate here. So: does anything other
than a verdict flow into the final artifact? If the model's natural-language
reasoning reaches the shipped proof object by any path, that is an ungated
seam and I should name it.

## E. The suspicion I am recording so it can be falsified

**Q14.** I expect HILBERT's headline contribution to be a **control-flow**
contribution — a search strategy — presented as an abstraction; and I expect
the actually-transferable abstraction to be the thing they treat as an
implementation detail, namely the hole. If the paper contradicts this, I want
that on the record too.

---

Claim discipline: nothing above is a claim. Q11 names a theorem I do not
have and marks it PENDING; every carrier proposal downstream must state its
R14 stratum and the equality it gets.
