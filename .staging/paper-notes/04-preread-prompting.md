# Pre-read — PROMPTING seat

Written before opening `paper.md`. I know: the title ("HILBERT: Recursively
Building Formal Proofs with Informal Reasoning", Varambally/Voice/Sun/Chen/Yu/Ye,
Apple + UCSD, ICLR 2026), that the operator wants the ABSTRACTIONS not the
method, and that Appendix A.2 holds the prompts. Nothing else.

My seat: the LLM-facing surface. R15 says the seam is symmetric — an agent
*programs* the store as a client of `CasSig`, and is *programmed by* the store as
a handler of `LlmSig`. `infer` is already an operation here. So I am not reading
this paper to learn how to prompt. I am reading it to find out **where a system
puts its type system when the API has nowhere to put it.**

## The central question I am bringing

A prompt is a de-facto type system implemented in English. Every ALL-CAPS
imperative in a production prompt is a constraint that failed to be expressible
in the interface, so it got shouted at the model instead. My prediction is that
HILBERT's Appendix A.2 is enormous, repetitive, and full of hard-won Lean
folklore — and that the repetition is the tell. If the same paragraph appears
verbatim in five prompts, that paragraph is a missing abstraction with no home.

**What does that paragraph become when it has somewhere to go?** That is the
whole engagement from this seat.

## Questions I want the paper to answer

1. **Does the paper treat the prompt as an artifact or as a hyperparameter?**
   If the prompts are in an appendix with no analysis, the authors think the
   prompt is configuration. If they discuss its structure, they think it is
   interface. I expect the former and I expect that to be the finding.

2. **Which side of the seam is the model on?** Is the LLM the orchestrator
   calling tools, or an operation the orchestrator calls? HILBERT is
   "recursive", which suggests the *system* recurses and the model is a leaf
   oracle. If so, the model is a handler, not a client — and R15's symmetry is
   only half-used. Does the paper ever run it the other way?

3. **What is the type of the model's answer?** `String → String`, or is there a
   narrowing? I want to know exactly where in HILBERT the bytes stop being bytes
   and start being a term. Is that boundary named? Is it one place or scattered?

4. **Is there a normalize step?** R15's acquisition loop is
   acquire → ingest → normalize → gate → admit. My prediction: HILBERT has
   acquire → gate → admit, with no normalize, because `lake build` succeeding is
   treated as sufficient. If so, the model's *spelling* survives into the proof
   corpus — variable names, `by simp` vs `by simpa`, whitespace, comment style,
   term-mode vs tactic-mode. What does that cost them at scale? Does the paper
   notice? What would `normalize` even mean for a proof term — α-equivalence?
   elaborated-term identity? a canonical printer?

5. **What does the model see when it fails?** When the compiler rejects, does
   the raw `lake` stderr go back into the next prompt verbatim? That would make
   the toolchain's error prose part of the interface — an interface nobody
   designed, inherited from a compiler that was talking to a human. Is the
   failure a *typed verdict* (the estate has four words: wrote/ok/missing/differs)
   or a string?

6. **Is a run replayable?** Content addressing makes (prompt, model, params) →
   answer a cacheable pure fact. Is any of that recorded? Can you ask "which
   prompt produced this proof"? If not, the proof corpus has no provenance and
   every claim about it is a claim about a process nobody can re-run.

7. **What is actually escaping the context window?** The headline advantage of
   decomposition is that subproblems fit. But is the win *fewer tokens*, or
   *less irrelevant material competing for attention*? Those want different
   machinery. If it is the latter, then content addressing + dedup does not
   automatically buy it here — the CAS analogue needs curation, not compression.

8. **Is there a prompt for talking to the model about the model's own output?**
   A critic, a judge, a repair loop. If yes, what does the critic see — the
   diff, the error, or the whole thing again? Judges that re-read everything are
   just the context window problem again with extra steps.

9. **Does the informal reasoning have an identity?** The title says "informal
   reasoning" is load-bearing. Is the informal sketch a first-class object that
   gets stored, addressed, reused — or is it a scratchpad that evaporates once
   the formal term compiles? An informal proof sketch that survives is a
   *denotation with two renderings*; one that evaporates is a prompt trick.

10. **Where did a soundness obligation force a legibility decision?** The
    operator's thesis. My candidate: output format. If the system must parse the
    model's answer, it must fix a format, and a fixed format is exactly what
    makes the answer readable by a human too. If HILBERT does this and says so,
    the thesis earns a point. If it does it accidentally with a regex, that is a
    different finding.

## What I expect to disagree with

That `infer : String → String` is the right shape. Everyone ships it because
it is what the HTTP endpoint gives you. But if the store already has schema
codes — canonical, content-addressed descriptions of shape — then the prompt and
the answer both *have* types available to them, and refusing to use them is a
choice. The counter-argument I need to take seriously: the schema code is a
description of the *carrier*, and a prompt's real type is about *intent*, which
no schema code captures. I want to know whether HILBERT's prompts contain
anything that a schema genuinely could not have said. If every ALL-CAPS
imperative maps to a constraint expressible in the signature, `String → String`
is indefensible. If even one does not, I owe the paper a concession.

## The comparison I will run

`Cas/Backend/Mcp.lean` generates the MCP manifest from signatures: tool
descriptions are prose written *once*, next to the operation, and the schema is
derived, not restated. HILBERT's prompt corpus is prose written *n* times, far
from anything, with the schema restated in English each time. Same job, two
architectures. I want the delta measured, not asserted — how many words of
HILBERT's prompts survive translation into a signature, and what is the residue?
The residue is the interesting part. The residue is the thing that needs a new
place to live.

## Sketch obligation (noting it now so I do not forget the frame)

A prompt is a designed surface even when only a model reads it. It has
typography — ordering, emphasis, sectioning, repetition-as-emphasis — and all of
it is doing information-design work on an attention mechanism. The sketch must
show (a) what the agent sees, laid out as the composed artifact it is, and
(b) how a human inspects and edits that surface without hand-maintaining it
(P4: legibility is architectural, never hand-maintained). If a human can edit
the prompt directly, the prompt is source and the signature is decoration. That
is probably the sketch's hardest constraint.
