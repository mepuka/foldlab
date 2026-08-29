# Pre-read note — READING seat (legibility, information design, typography)

Written before opening the PDF. I know only: "HILBERT: Recursively Building Formal
Proofs with Informal Reasoning" (Varambally, Voice, Sun, Chen, Yu, Ye — Apple/UCSD,
ICLR 2026), and that the operator wants its *abstractions*, not its method.

My seat owns P4: legibility is an architectural property of the estate, derived from the
artifact the way the elaborator's output is derived from source — never hand-maintained
beside it. So every question below is really the same question: **does the artifact this
system produces have a rendering, or only a size?**

## What I want to hear from it

1. **Is there a reading order for the output?**
   A recursive prover emits a tree. A tree has no canonical linearisation — depth-first
   is a debugger's order, breadth-first is a manager's order, and the order a *human*
   wants is neither (it is "the three places it nearly failed, then the shape"). I want
   to know if the paper ever renders its own output for a human, or whether the output
   is only ever consumed by a checker. If a proof is only ever read by `lake build`,
   that is a legitimate design position — but it should be *stated*, not defaulted into.

2. **How many words are in its verdict vocabulary?**
   `Gate.lean` here has four: wrote / ok / missing / differs — identical in prose and in
   `--json`, which is the whole trick. I want to count HILBERT's. My prediction is two
   (compiles / doesn't), possibly three (plus timeout). If it is two, the interesting
   finding is not "they were lazy" — it is that a *binary* checker forces the search to
   carry all the state, because the artifact carries none. Vocabulary size and search
   complexity trade against each other. I want evidence for or against that trade.

3. **What is the unit that gets a name?**
   Legibility is mostly naming granularity. If the system decomposes a theorem into
   lemmas, each lemma is a nameable, addressable, quotable object and the whole thing is
   readable. If it decomposes into *proof-script fragments*, nothing is nameable and the
   output is a 15,000-line blob with no table of contents. The difference between those
   two is entirely a design decision and it determines whether a UI is even possible.

4. **Does the informal reasoning survive into the artifact?**
   The title promises informal reasoning *building* formal proofs. The obvious waste is
   that the informal part is scaffolding thrown away at the end. But the informal text is
   the only part a human can read at speed. If they keep it — attached to the node it
   justified — they have accidentally built the estate's docstring-inside-the-code
   position at proof granularity, and that is the thing I would steal. If they throw it
   away, they have thrown away the readable half of their own output and kept the
   unreadable half.

5. **Where does the sub-proof boundary show up typographically?**
   In any recursive system the recursion boundary is the single most important thing to
   see and the single easiest thing to lose. A flat monospace dump erases it. I want to
   know whether they ever look at depth, and whether depth is a number they report or a
   thing they show.

6. **What does failure look like on a page?**
   The negative answer is where all the information is. A failed branch that says only
   "failed" costs the same page space as one that says "failed at step 7, goal was X,
   here is the residual" and carries a hundredth of the content. My guess is the paper
   reports failure as a *rate*, aggregated, and never once shows a single failure
   rendered — because aggregate failure is publishable and individual failure is
   embarrassing. If so, that is an information-design failure hiding a scientific one:
   you cannot debug a distribution.

## Typographic questions I expect the paper to have no opinion on, and that I have to answer anyway

- **The address problem.** 64 hex characters is not a word, not a number, and not a
  sentence; it has no shape, no ascender pattern, and no natural truncation point. It is
  the single hardest object in this estate to set on a page, and it appears everywhere.
  Whatever I sketch has to solve it, not hide it.
- **Six registers on one page.** Lean syntax, English prose, content addresses, JSON,
  diffs, and verdicts. A formal-artifact UI shows all six simultaneously. That needs a
  designed type system, not one mono and one sans picked by reflex.
- **Density.** This material rewards Tufte density. A proof tree with 400 nodes is a
  small-multiples problem, not a scroll problem. If the paper scrolls, I disagree with it.

## What I expect to be disappointed by

Figure 1 as traffic lights: a red X and a green check on boxes, with a tree. That encodes
one bit per node and spends a full page doing it. The honest version of the same figure
would encode, per node, *how far it got* — which is a bar, not a colour. I expect the
paper's visual vocabulary to be exactly two symbols wide, and I expect that to be a true
signal about how much information the system's own artifacts carry.
