# Pre-read note — coordinator

Written before opening the PDF. I know only: ICLR 2026, and that the operator wants
its *abstractions*, not its method, for mechanizing LLMs under formal-verification APIs.

## What I want to hear from it

1. **Where does it put the boundary?** Every LLM+formal system draws a line between the
   part that may hallucinate and the part that may not. I want to know what object sits
   on that line — a term? a proof script? a tactic? a goal state? — because that object
   is the one that has to become a *value* in CAS, and therefore the one that has to be
   hashable, printable, and shown in a UI.

2. **What is the unit of retry?** If the model is wrong, what gets thrown away and what
   is kept? A system that throws away the whole attempt has no interesting abstraction.
   A system that keeps a partial certificate has one, and that certificate is the thing
   I want to steal.

3. **What does the checker return on failure?** Boolean, counterexample, residual goal,
   or a *diff*? The richness of the negative answer is the whole game. `Verdicts.lean`
   already exists here; I want to know whether they found something richer.

4. **Is the search state first-order?** Can you serialise it, hash it, resume it, and
   show it? Or does it live in a Python closure? This is exactly the CAS question:
   `Prog` is a free tree precisely so it can be a value. If they defunctionalised
   anything, I want to see how they named the code points.

5. **What did they NOT have to prove?** The trusted base. The estate's whole posture is
   "gate the door, don't verify the compiler." I want to see where they cut and whether
   the cut is defensible or merely convenient.

6. **Did the abstraction make them organized?** The operator's thesis is that the
   provably-good move and the legible move coincide. I want to find the place in this
   paper where a soundness requirement forced a naming or a layering decision — and
   whether the authors noticed.

## What I expect to be disappointed by

That the "abstraction" is a prompt template and a `while` loop with a proof-checker
subprocess, and the contribution is empirical. If so, the interesting question flips:
*what would have had to be true of the interface for this to be more than a loop?*
