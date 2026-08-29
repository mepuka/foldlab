# Pre-read note — the USING seat

Written before opening the PDF. I know only the title —
"HILBERT: Recursively Building Formal Proofs with Informal Reasoning" — that it is
Apple/UCSD at ICLR 2026, and that the operator wants its *abstractions*, not its method.

I hold the seat of the person at the keyboard. Not the author of the algebra; the one
who has to live inside it at 2am with a red gate and a half-proved decomposition tree.
So my questions are all the same question wearing different hats: **is there a session
here, or only a job?**

## What I want to hear from it

1. **Is there a human in the loop at all, or only at the ends?**
   "Recursively building" smells like a batch: press go, come back tomorrow, read a
   verdict. If the human only appears at submit and at verdict, then the paper has no
   session and its abstractions are the abstractions of a *build system*, not a tool.
   That is still worth stealing — build systems have excellent abstractions — but it
   changes what I am allowed to borrow. I want to know which one it is on page 1.

2. **What is the loop of attention?**
   While the thing runs, what is the smallest object I could stare at that tells me
   whether it is going well? A goal count? A frontier? A depth? If the answer is
   "the log", the system has no attention model and I will have to invent one.

3. **Where does time actually go — and would the interface tell me the truth about it?**
   My prior: >90% of wall-clock is spent on a small number of nodes that were never
   going to close, and the system cannot tell you which ones those are until it gives
   up on them. Any progress bar over a non-monotone search is a lie. I want to know
   whether they measured *where* the tokens went, not just how many. 22.8M tokens is
   not a number, it is a distribution, and the shape of that distribution is the UI.

4. **Recovery. Forty minutes in, something fails. What survives?**
   This is the question I care about most. Options, in ascending order of interest:
   nothing survives (restart); the closed subgoals survive (cache); the *tree* survives
   with its verdicts attached and I can resume, fork a node, pin the two lemmas that
   came out beautiful and throw the rest away. If a partial decomposition is a
   first-class, nameable, resumable value, that is the abstraction and everything else
   in the paper is scaffolding around it. If it is a Python object graph, I want to see
   exactly what would have to change to make it a value.

5. **Can I steer mid-run, or only watch?**
   The title says *informal reasoning*. Informal reasoning is the human's native
   register — it is the one thing I am better at than the model at 2am. Do I get to
   write any? Can I hand the search a sentence — "this one is false, stop; try
   induction on the second argument" — and have it be *load-bearing* rather than a
   comment? A system where only the model may reason informally has inverted the
   division of labour.

6. **What must be impossible to miss?**
   Somewhere in this system there is a distinction between "proved" and "proved modulo
   something" — an admitted lemma, a `sorry`, a trusted oracle, a timeout counted as a
   pass. My whole seat lives or dies on whether that distinction is *loud*. I want to
   know if the paper even names it, or if it lives in a footnote about the evaluation
   harness. If the negative space is quiet, the tool is dangerous no matter how good
   the numbers are.

7. **What is the artifact for a human?**
   The system hands me a proof. Nobody is going to read a five-figure line count. So
   what is the *readable* residue — a decomposition tree with the informal sentences
   still attached at each node? A statement-level summary? Nothing? I would trade a
   large amount of automation for a proof I can skim the shape of. If the informal
   reasoning is discarded once the formal proof closes, they threw away the only part
   a human could use, and that is the paper's biggest miss before I have read it.

8. **Do the nodes have names I can say out loud?**
   Can I say to a colleague "node 4 died, look at node 4" and have that mean something
   tomorrow, on another machine? Stable, content-addressed names for search nodes is a
   soundness property (you can't confuse two goals) *and* a communication property
   (you can point). That coincidence is the operator's thesis in miniature, and I want
   to see whether they got it for free or missed it entirely.

9. **Is the budget a first-class object?**
   22.8M tokens on one problem. Did the operator of that run *choose* that, or discover
   it afterward? A budget I can set, split across a subtree, and watch drain is a very
   different tool from a meter I read in the postmortem.

## What I expect to be disappointed by

That the session is: a CLI invocation, a progress log, and a `.json` at the end. That
the informal reasoning exists only inside the prompt and is never surfaced back. That
"recursive" means the *code* recurses, not that the *artifact* is a tree I can hold.

## The question I will judge it by

Twenty-two million tokens produced fifteen thousand lines that nobody read. My seat's
verdict on whether that is a triumph or a failure turns on exactly one thing: **did the
run leave behind something a person can act on tomorrow that is smaller than the proof?**
If yes, it is a triumph and the proof is just exhaust. If no, it is a very expensive way
of converting a hard question into an unreadable answer, and the paper's real
contribution is a warning.
