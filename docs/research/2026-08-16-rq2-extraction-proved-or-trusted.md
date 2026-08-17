# RQ-2 — Is extraction proved, or trusted? The precedent survey

Research seat for RQ-2 of the REF program
([`scratch/dispatch/19-refinement-research-questions.md`](../../scratch/dispatch/19-refinement-research-questions.md)),
2026-08-16. Serves REF-6, D-e's trusted-base obligation, and D-a's fallback
design.

Reference area, including every boundary statement quoted in full with its
source and version:
[`docs/research/reference/rq2-extraction-proved-or-trusted/`](reference/rq2-extraction-proved-or-trusted/).

All web retrievals: **2026-08-16**. Everything marked *executed* was run on
this machine (Windows 11, Git Bash, Lean 4.33.0 via elan, toolchain commit
`d8b18978322de05a8f3dba51ef03cf5461676c17`) and its transcript is committed.

---

## Bottom line

**Extraction is trusted, not proved, in every project surveyed that ships
extracted code into production.** The proved-extraction camp exists and is
real — CakeML, and the CertiCoq/CertiRocq family including a verified
WebAssembly backend — but both live in other provers, and neither is
reachable from Lean without abandoning the estate's proofs. The
coordinator's expectation is confirmed for Lean specifically, from Lean's
own sources: the compiler and interpreter are named, in the shipped
toolchain, as things you already trust when you use Lean as a programming
language. No verified Lean 4 code generator was found; the verified
re-implementation this survey found in the Lean ecosystem (Lean4Lean) covers
the **kernel**, not the backend.

Three findings sharpen the picture beyond "as expected":

1. **The hole is bigger than "the compiler".** The compiled kernel calls
   hand-written C for every primitive over `ByteArray`, `Nat`, `String` and
   `Array` — the ABI's own types. *Executed*: an ordinary, unannotated
   `ByteArray` fold emits calls to `lean_byte_array_uget`,
   `lean_byte_array_size`, `lean_nat_add`. Lean's own `trustCompiler`
   docstring names this surface exactly: the compiler, the interpreter, and
   *all* `[implemented_by]` and `[extern]` annotations.
2. **Our existing footprint gate is blind to this channel, by
   construction.** *Executed*: a theorem that "does not depend on any
   axioms" — clean under `verify/moves/run.sh`'s roster check — coexists
   with an exported C symbol computing a different function, via
   `@[implemented_by]`. Axiom footprint is the wrong instrument for this
   risk; a source-level gate is the right one, and it is cheap.
3. **The field's wording is remarkably uniform, and we should borrow it.**
   seL4, CompCert, EverCrypt, Fiat-Crypto and Isabelle all say the same
   thing in the same shape: name the untrusted-to-trusted transition
   precisely, keep the trusted layer thin, and claim only up to it. The
   drafted REF-7 paragraph in §8 is modelled on that shape.

Nothing here reverses a ratified decision. Two amendments are recommended
(§9): the trusted-base list in draft 17 is incomplete in a specific,
correctable way, and one new mechanical gate closes the channel finding 2
exposes.

---

## 1. Method, and what "executed" means here

Primary sources only: official documentation, published papers, and
repository sources. Where a claim about Lean was mechanically checkable on
this machine, it was checked and the transcript committed
([`reference/.../lean-trust-gap/TRANSCRIPT.md`](reference/rq2-extraction-proved-or-trusted/lean-trust-gap/TRANSCRIPT.md),
reproducible by `bash run.sh`, which exits nonzero if any of its claims is
false). Web search was used only to *locate* primary sources; no search
result is cited as evidence.

RQ-1 ([`2026-08-16-rq1-lean-c-backend.md`](2026-08-16-rq1-lean-c-backend.md))
owns the mechanism question and ran the backend end to end. Two of its
findings are cited here as sibling-report evidence rather than re-derived:
that `@[export]` silently accepts signatures a bytes host cannot call and
silently emits nothing for a theorem, and that a Lean `panic!` **returns the
`Inhabited` default** instead of trapping. Both are silent channels of the
same family this report is about, found by a different route.

Two prior estate reports cover adjacent ground and were deliberately not
re-used as evidence:
[`2026-08-15-proof-to-artifact-reference.md`](2026-08-15-proof-to-artifact-reference.md)
and
[`2026-08-15-refinement-systems-survey.md`](2026-08-15-refinement-systems-survey.md).
Where this report agrees with them, it is because the primary source was
retrieved again today, independently.

---

## 2. Four camps, not two

The question "proved or trusted" resolves into four distinguishable
positions. Getting the taxonomy right matters because REF-7 must be placed
in exactly one of them, and because REF-8's certificates are a *different*
camp from REF-6's theorem.

| Camp | What holds | Who is in it |
| --- | --- | --- |
| **A. Trusted translation** | proofs stop at the source language; a program turns that source into the artifact and is believed | Coq/Rocq extraction, Isabelle code generation, F\*/KaRaMeL (paper proof, unverified implementation), Fiat-Crypto's printer, **Lean's C backend** |
| **B. Proved translation** | a machine-checked theorem covers the translation itself | CakeML (verified compiler, bootstrapped in-logic), CertiCoq/CertiRocq, CertiCoq-Wasm, MetaCoq-based verified extraction to OCaml |
| **C. Per-run proof (proof-producing)** | no universal theorem about the translator; each run emits a theorem about *its* output | CakeML's HOL→CakeML translator ("proves that the generated AST has the same behaviour as the HOL function") |
| **D. Validated after the fact** | the translator stays unproved; each build's output is checked against the input by an independent tool | seL4's binary verification (gcc output vs C semantics), CompCert's Valex (assembler/linker output), Cedar's differential randomized testing of Rust against the Lean model |

Camps C and D are the interesting ones for us, because they buy assurance
*without* requiring a verified toolchain — which is the position REF-7 is
actually in.

One near-miss worth naming so it is not mistaken for camp C: Isabelle's
evaluation-by-oracle *asserts* a result rather than proving it, and its
manual says so — "The very presence of the oracle in the code acknowledges
that each computation requires explicit thinking before it can be considered
trustworthy!" Per-run **trust** is not per-run **proof**, and REF-8's
certificates must land on the proof side of that line or they add nothing
the corpus does not already give.

---

## 3. Project by project

| Project | What is extracted | Into what | Theorem covers the extraction? |
| --- | --- | --- | --- |
| **seL4** | nothing — the C is hand-written and *imported* into Isabelle/HOL | C, then binary | **The C→binary step: yes**, on ARM and RISCV64, by translation validation per build (camp D). The C itself is proved to refine the spec; no extraction step exists to prove |
| **CompCert** | the verified compiler itself, from Rocq to OCaml | OCaml | **No.** The compiler's *own* correctness theorem is about C→Asm; obtaining its executable by extraction puts Rocq's extractor and OCaml in its TCB |
| **CakeML** | HOL functions to CakeML, then CakeML to machine code | x86-64 and 5 other targets | **Yes**, both halves: proof-producing synthesis (camp C) then a verified, in-logic-bootstrapped compiler (camp B) |
| **HACL\*/EverCrypt** | Low\* (a subset of F\*) to C | C, then a C compiler | **On paper, not mechanically.** KaRaMeL's own README says the work "has been formalized on paper"; the KaRaMeL implementation is trusted |
| **Fiat-Crypto** | Rocq terms to a C-like AST, then printed | C, shipped in BoringSSL | **Down to the AST: yes. The printer: no** — it is named in the TCB |
| **Rocq/Coq extraction** | Gallina to OCaml/Haskell/Scheme | ML | **No** — stated plainly by the PLDI 2024 verified-extraction paper |
| **CertiCoq / CertiRocq** | Gallina to Clight, and to WebAssembly | C / **Wasm** | **Largely yes**, and explicitly framed as reducing the TCB versus unverified extraction |
| **Isabelle/HOL** | HOL equations to SML/OCaml/Haskell/Scala | ML family | **No** — the translation and serialisation steps happen "outside the logic" by the manual's own account |
| **Cedar (AWS)** | nothing is extracted | Rust production code written by hand | **No, and not attempted**: agreement between the Lean model and the Rust implementation is established by differential randomized testing (camp D) |
| **Lean 4** | Lean definitions to C | C, then a C compiler | **No.** See §5 |

### The boundary statements

Full excerpts with sources live in
[`reference/.../quotations.md`](reference/rq2-extraction-proved-or-trusted/quotations.md).
The load-bearing ones, because they are the wording REF-7 should imitate:

**seL4** (<https://sel4.systems/Verification/assumptions.html>) opens by
refusing the defensive frame — "Assumptions are not limitations or
problems" — and then argues that an exhaustive list is the deliverable:
being able to state one "means that the work needed to fully trust a system
is massively reduced from looking at many thousands of lines of code to a
number of small, specific, and easy to understand pieces." It admits where
its own rigor is weaker: of the virtual-memory model, "the proof is not from
first principles and there is potential for human error." And it states what
binary verification bought: "we do not need to trust the compiler and linker
any more on architectures that are supported by our binary verification."

**CompCert** (manual v3.17, 13 February 2026) is precise about *phases*
rather than about the system: "only phase 3 (from CompCert C AST to Asm AST)
and the parser in phase 2 are formalized and proved correct in Rocq/Coq",
with roughly 10% of the compiler — "elaboration, presimplifications,
assembling and linking" — "not verified". For the last mile it names the
mitigation rather than claiming the property: Valex "provides additional
assurance via a posteriori validation of the executable produced by the
external assembler and linker."

**EverCrypt** (IEEE S&P 2020, §II-C) enumerates: "we must trust the
correctness of our specifications and of our verification tools", the
Low\*→C backend, and either a verified or an unverified C compiler. Its
comparison sentence is the one worth stealing wholesale — that these trusted
tools are comparable to other efforts, "e.g., implementations verified in
Coq trust Coq, the Coq extraction to OCaml, and the OCaml compiler and
runtime."

**Fiat-Crypto** (IEEE S&P 2019) is the closest structural analogue to our
seam — proofs in an assistant, generated C, shipped into production — and
its statement is one sentence: "All formal reasoning is done in the Coq
proof assistant, and the overall trusted computing base also includes a
simple pretty-printer and the C language toolchain."

**Isabelle**'s code-generation manual gives the argument for why a trusted
translation can still be respectable: "only the last two [steps] are carried
out outside the logic; by keeping this layer as thin as possible, the amount
of code to trust is kept to a minimum." It also names the escape hatch
without euphemism: custom serialisations "are completely axiomatic."

**CakeML** is the camp that closes the gap, and states the cost of not
closing it: "an unverified compiler forms a large and complex part of the
trusted computing base", and, of their own result, "we do not rely on the
correctness of another compiler in our trusted computing base (except
perhaps as part of the proof checker or theorem prover)." Their residual is
honest too: "Having a machine code semantics in the trusted computing base
is intrinsic to the problem."

**Verified extraction to OCaml** (PLDI 2024) states the general position for
Rocq in one sentence: "for such executables obtained by extraction, the
extraction process is part of the trusted code base (TCB), as are Coq's
kernel and the compiler used to compile the extracted code."

---

## 4. How much does trusting the extractor actually cost? One data point

Monniaux and Boulmé, *The Trusted Computing Base of the CompCert Verified
Compiler* (ESOP 2022, <https://hal.science/hal-03541595/document>) is the
only empirical study this survey found of *where the bugs in a
verified-compiler TCB actually were*. Two sentences are load-bearing:
"Coq's extractor and OCaml are in the TCB of CompCert", and, in a footnote,
"Coq's bug tracker lists extractor bugs that, to the best of our knowledge,
result in programs that are rejected by OCaml compilers."

Read carefully, that is a statement about **failure mode, not frequency**,
and it is about **Rocq's** extractor: its known defects manifest as the
target compiler rejecting the output — loud — rather than as silently wrong
code. Whether Lean's backend shares that failure mode is unestablished; no
equivalent study exists, and the transfer should not be made silently. What
does not transfer at all is the `@[extern]`/`@[implemented_by]` surface in
§5, where the failure mode is silent by design. The two risks should not be
conflated merely because both live under the word "extraction".

---

## 5. Where Lean 4's C backend sits — camp A, on primary evidence

### The documentary evidence

Lean 4.33.0's own sources (Apache-2.0, installed by elan on this machine)
carry the statement. The axiom `Lean.trustCompiler` in `Init/Core.lean` is
documented as: "Depends on the correctness of the Lean compiler,
interpreter, and all `[implemented_by ...]` and `[extern ...]`
annotations." The docstring on `Lean.ofReduceBool` warns that using native
reduction makes "the Lean compiler and interpreter … part of your trusted
code base", and then adds the sentence that settles the camp question for
us: "Keep in mind that if you are using Lean as programming language, you
are already trusting the Lean compiler and interpreter."

The official reference manual (version string 4.34.0-rc1) says the same
from the other side: these axioms "track proofs that depend on the
correctness of the entire compiler, and not just on the much smaller
kernel." The Lean 4 system-description paper (CADE 2021) claims "a
relatively small trusted kernel" and titles its §3 "The Code Generator"
without making any correctness claim about it. Lean4Lean, the verified
re-implementation, is by its README "an implementation of the Lean 4
kernel" — not of the backend.

**Absence, reported as a finding.** No verified Lean 4 code generator, and
no translation-validation tool for Lean's emitted C, was found. Searched:
the Lean 4 reference manual (`/doc/reference/latest/`, all chapters reached
from the index), the Lean 4 repository's shipped sources, the Lean 4 CADE
2021 paper, the Lean4Lean repository, and web search for verified Lean
compiler / code-generator work in 2025–2026. Web search on that last query
returned no on-point primary source. Any future claim that such a thing
exists should be treated as new information, not as something this report
missed.

### The executed evidence

`bash reference/rq2-extraction-proved-or-trusted/lean-trust-gap/run.sh`,
exit 0, transcript committed. Four facts:

1. **A clean theorem and a wrong artifact coexist.** With
   `@[implemented_by liar] def honest (n : Nat) : Nat := n` and
   `theorem honest_eq (n : Nat) : honest n = n := rfl`, Lean reports
   `'honest_eq' does not depend on any axioms` and the compiled program
   prints `compiled honest 3 = 4`.
2. **`@[export]` carries the swap.** The emitted C for the exported symbol
   is `LEAN_EXPORT lean_object* foldlab_honest(...)` whose body calls
   `l_liar`. This is exactly D-a's mechanism.
3. **No annotation is needed to reach hand-written C.** An ordinary
   `ByteArray` fold emits `lean_byte_array_uget`, `lean_byte_array_size`,
   `lean_nat_add`, `lean_uint8_to_nat` and others. Counted on this machine
   in the shipped Lean 4.33.0 sources: 931 lines begin with an `@[extern`
   annotation (626 of them under `Init/`); 947 occurrences of the string
   including docstrings and comments. Our kernel sits on a subset of them by
   virtue of using `ByteArray` and `Nat` at all.
4. **`@[csimp]` is the guarded alternative.** The same replacement under
   `@[csimp]` requires a proof that the two functions are equal, and the
   false one is refused at elaboration.

### Why this matters more than the usual "the compiler is trusted"

The estate's existing gate (`verify/moves/run.sh`) checks two things about
the model: that the sources contain no `sorry`/`admit`/`axiom`, and that a
roster of theorems has an axiom footprint inside
`{propext, Classical.choice, Quot.sound}`. That gate already excludes
`Lean.trustCompiler`, `Lean.ofReduceBool`, `ofReduceNat` and
`native_decide`'s per-invocation axioms — the *loud* ways to trust the
compiler. Fact 1 above shows it cannot see the *quiet* way: an
`@[implemented_by]` swap changes no axiom footprint at all. Today that gap
is harmless, because the compiled model only produces test vectors. After
REF-7 it would be the seam. That is the one place where this survey changes
what we should build, and it is cheap to close (§9, R2).

---

## 6. Camp D: what validating-after-the-fact looks like

Four instances, each with a different shape, and all four are relevant to
REF-6/REF-8 design:

- **seL4's binary verification** (Sewell, Myreen, Klein, PLDI 2013) proves
  refinement between the C source semantics and the binary semantics *for
  the binary actually produced*, discharged by SMT. It is per-build, not
  once-and-for-all: "We handle binaries generated by unmodified gcc 4.5.1 at
  optimisation level 1, and can handle most of seL4 even at optimisation
  level 2." The payoff is stated on their assumptions page — the compiler
  leaves the trusted base. The cost is a formal semantics for both C and the
  target ISA, plus an automated refinement engine, pinned to one compiler at
  one optimisation level.
- **CompCert's Valex** validates the *executable* against the compiler's
  own Asm output, covering the assembler and linker the theorem does not
  reach. Same shape: unproved tool, checked output.
- **Cedar** is the nearest thing to our situation in the field — a Lean
  model, a production implementation in another language, and no extraction
  between them. Their instrument is differential randomized testing between
  the two, and their build links the Lean library into the Rust test harness
  to do it. An inference, offered as an inference: a team with a Lean model
  and a working Lean-to-Rust link in front of them did not make the model
  the implementation. They do not say why, and this survey found no
  statement of their reasoning.
- **Csmith against CompCert** is the negative-space version. The CompCert
  manual quotes Yang et al.: about six CPU-years of random testing, and
  CompCert "is the only compiler we have tested for which Csmith cannot find
  wrong-code errors." (That the same campaign found defects in CompCert's
  *unverified* front end is reported in the estate's
  [2026-08-15 reference report](2026-08-15-proof-to-artifact-reference.md)
  and was not re-derived from primaries today.) Testing located the residual
  risk where the proof stopped.

The estate already owns instruments of this kind (the DEV-670 corpus, the
DEV-672 oracle, the planted-mutant discipline). RQ-2's contribution is the
framing: **after REF-7, those instruments are not redundant with the proof —
they are the only evidence covering camp A's gap**, and VERIFICATION.md
should say so in those words.

---

## 7. What actually enters our trusted base

Draft 17's pre-registered list ("What stays assumed") is correct as far as
it goes. Against the evidence above it is incomplete in three specific
places. The complete list, for the ratified WASM lane:

1. Lean's logic and kernel (as today — already in the ledger's spirit).
2. **The Lean compiler *and the Lean runtime's C implementations of the
   primitives our kernel uses***. Draft 17 says "the Lean kernel and its C
   backend"; the runtime primitives are a distinct, larger, hand-written
   body of C that the backend calls. RQ-1 adds the rest of that layer for
   the native lane — the `leanc` driver and everything on its link line —
   and one behavioral item that belongs here rather than in a threshold
   table: a Lean `panic!` returns the `Inhabited` default instead of
   trapping, so a "total by refusal" kernel can return a well-formed lie.
   *(addition)*
3. **The absence of `@[implemented_by]` and of non-core `@[extern]` in the
   kernel's own sources** — an assumption today, mechanically enforceable
   tomorrow. *(addition)*
4. The wasm toolchain (emscripten or WASI SDK) that lowers that C.
5. wazero and Bun's WebAssembly host, **and their agreement with each other
   on this module** — one artifact does not imply one behavior; two hosts
   are two implementations of a specification. *(sharpening; RQ-3 owns the
   evidence)*
6. The thin embedding code in each runtime, plus transport, storage, auth,
   serialization edges — policed by oracle and gauntlet, never proved.
7. SHA-256 collision resistance; JetStream properties per the standing gate.

---

## 8. Drafted VERIFICATION.md paragraph for REF-7

To be landed in the REF-7 commit, in the S1/S7 entry's bounds section (or as
a subsection immediately after it). Wording modelled on seL4's assumptions
page, Fiat-Crypto's one-sentence enumeration, CompCert's phase precision,
and Isabelle's thin-layer argument. Bracketed placeholders are the parts
REF-6/REF-7 must fill with real names.

> ### What `proved` assumes — S1 and S7
>
> The refinement equation is machine-checked in Lean, and the seam that runs
> in production is the compiled image of the same definitions. Between the
> theorem and the bytes that execute there is a layer this repository
> assumes rather than proves. Listing it exhaustively is the point of the
> claim, not a hedge against it: each item below is small, named, and
> separately attackable, where "the seam is correct" would be none of those
> things.
>
> 1. **Lean's logic and kernel.** That Lean's axioms are consistent and that
>    its kernel checked these proofs. The theorems' axiom footprint is
>    `propext`, `Classical.choice` and `Quot.sound`, and nothing else,
>    re-checked at HEAD by `[status gate command]`.
> 2. **Lean's compiler, and the Lean runtime's C.** Lean's own
>    documentation states the position we inherit: using Lean as a
>    programming language means already trusting its compiler and
>    interpreter. The code generator is not verified, and no verified Lean
>    code generator is known to exist. Below it, the kernel's primitives over
>    `ByteArray`, `Nat`, `String` and `Array` are hand-written C in the Lean
>    runtime — the emitted code calls `lean_byte_array_uget`,
>    `lean_nat_add` and their neighbours — and no theorem here covers those
>    implementations. What is checked mechanically is that the kernel's own
>    sources add nothing to this surface: in the model sources this
>    repository owns, `@[implemented_by]` is forbidden and `@[extern]` is
>    allowed only from the pinned list in `[allowlist file]`, because a
>    replaced implementation is not checked against the definition it
>    replaces. `[gate command]`. The primitives inherited from Lean's own
>    `Init/` are not gated by that check and remain assumed here.
> 3. **The WebAssembly toolchain and the two hosts.** `[toolchain and
>    version]` lowers that C to the deployed artifact; wazero runs it in Go
>    and Bun's engine runs it in TypeScript. One artifact with one content
>    digest is journaled per session by each host, so *which* bytes ran is
>    established; that those bytes implement the C, and that the two hosts
>    agree on them, is not proved. The evidence for the second is the
>    DEV-670 corpus driven through the same artifact under both hosts on
>    both platforms — differential testing, not proof, and it is named here
>    as such.
> 4. **The shell.** The FFI boundary, transport, storage, auth and the
>    serialization edges outside the kernel are policed by the DEV-672
>    oracle and the gauntlet, and are not proved. Refinement does not reach
>    them; nothing in this entry claims it does.
> 5. **SHA-256 collision resistance**, on which every identity claim in this
>    ledger already rests, and the JetStream properties of the standing
>    assumptions section.
>
> An assumption absent from this list is a claim this ledger has overstated.
> The list is therefore part of the gate: `[status gate command]` fails at
> HEAD if the footprint, the source-surface check, or the artifact-digest
> match stops holding, and this entry is false the moment it does.

Three notes on the drafting choices, for the grill:

- It **does not** say "proved end-to-end", "verified kernel", or
  "correct by construction". The field's most rigorous projects do not say
  those things either; CompCert claims phases, seL4 claims a refinement
  under listed assumptions, Fiat-Crypto claims formal reasoning plus a named
  trusted printer.
- It **does** claim more than seL4's page does in one respect: item 2
  enumerates a runtime-primitive surface. No surveyed project itemizes its
  language runtime's primitives that way (§10). That is a deliberate excess
  of disclosure, chosen because the executed evidence says this is where our
  silent channel would be.
- One item is deliberately **not** in the draft: RQ-1's finding that
  `panic!` returns the `Inhabited` default instead of trapping. That is a
  fact about the artifact's failure mode, and D-d already rules on it; it
  belongs in REF-6's gates ("no trap on any corpus row" must become "no
  trap **and** no defaulted return"), not in the assumptions list. Flagged
  here so the grill can overrule the placement.

---

## 9. Recommendations, with costs

**R1 — Adopt the §8 paragraph as the REF-7 trusted-base text, subject to
the operator's grill.**
*Cost:* it forecloses the shorter, stronger-sounding phrasings; every future
kernel change must re-read the list.
*Adds to the trusted base:* nothing — it states the base that D-a and D-bc
already committed to.
*Reversal:* edit the text; any weakening should be ratified, since the
ledger's rule is that an absent assumption is an overstated claim.

**R2 — Add a source-surface gate to REF-6: the kernel's Lean sources
contain no `@[implemented_by]`, and no `@[extern]` outside a pinned
allowlist.** This is the one build change this survey recommends. It closes
the channel demonstrated in §5, which the existing axiom-footprint gate
cannot see. Implementation is a word-boundary grep over **our** Lean
sources, in the same shape as the existing `sorry`/`axiom` greps in
`verify/moves/run.sh`: `@[implemented_by]` forbidden outright, `@[extern]`
forbidden unless listed in a small allowlist file with a reason per entry.
Note the honest limit: this gates what *we* declare, not the several hundred
`@[extern]` primitives we inherit from Lean's `Init/`. Those stay in the
trusted base as item 2 of §8 states; the gate's job is to stop the list
growing silently.
*Cost:* one script and one allowlist to maintain; the allowlist needs review
whenever the kernel's own source surface changes. Adds seconds to the gate.
*Adds to the trusted base:* nothing. It removes an assumption from the base
by making it checkable.
*Reversal:* delete the check and its allowlist; the assumption returns to
prose.

**R3 — Where the kernel wants a faster implementation than the proved
definition, use `@[csimp]`, never `@[implemented_by]`.**
*Cost:* the equality must be proved, so genuinely unsafe optimizations
(pointer tricks, in-place mutation via `unsafe`) become unavailable inside
the kernel; performance work moves into the model, where it is provable.
*Adds to the trusted base:* nothing; strictly reduces it relative to
`@[implemented_by]`.
*Reversal:* swap the attribute back — at which point R2's gate fires, which
is exactly the design.

**R4 — Record the camp in the ledger's own words: after REF-7 the seam is
proved to the C boundary and trusted below it (camp A), not proved
end-to-end (camp B).**
*Cost:* the estate cannot use "verified kernel" unqualified in any public
writing; the R2-publication lane inherits the constraint.
*Adds to the trusted base:* nothing.
*Reversal:* only by moving to camp B, which means a verified pipeline in
another prover — see "considered and rejected" below.

**R5 — Journal the toolchain identity beside the artifact digest.** D-d
already has the host journal the content digest of the artifact it loaded,
and the kernel export its model-source build identity. Add the toolchain
identity (Lean toolchain commit, wasm toolchain version) to what the build
stamps, so that a session's journal names the *whole* trusted chain that
produced its kernel, not just the model source.
*Cost:* a few bytes per session and one build-time stamp; a rebuild with a
new toolchain becomes visible as a different identity, which will generate
churn the first time a toolchain is bumped.
*Adds to the trusted base:* nothing — it makes an existing trusted
component auditable per session.
*Reversal:* drop the field; older journals keep it harmlessly.

### Considered and rejected

- **Move to a verified extraction pipeline (camp B).** CertiCoq-Wasm proves
  compilation from Gallina to WebAssembly against a mechanized Wasm 1.0
  specification — remarkably, our exact target format. It is not available
  from Lean. Adopting it means abandoning `verify/moves` and `verify/ir` for
  Rocq and re-ratifying the estate's proofs, which is precisely the cost
  that killed OCaml in the REF-0 record. Rejected on the same grounds, and
  recorded here so that the option is on file with its price rather than
  forgotten.
- **Translation-validate the emitted C or wasm against the Lean model
  (camp D, seL4-style).** No such tool was found for Lean; building one
  needs a formal semantics for the source, a formal semantics for the
  target, and an automated refinement engine — a research programme, not a
  slice. Rejected
  for REF-6; the corpus-through-the-artifact evidence is the affordable
  substitute and is already ratified.
- **Hand-write the C and verify it (VST/Frama-C style).** Already refused by
  the 2026-08-15 hand-authoring ruling, and the survey supports the ruling:
  HACL\*'s SHA-256 needed ~708 lines of F\* where verifying pre-existing C
  needed roughly an order of magnitude more Coq for a weaker property (per
  the estate's 2026-08-15 reference report; not re-derived from primaries
  today).

---

## 10. What the surveyed material does *not* answer for our seam

1. **No precedent for Lean-to-shipped-kernel.** Cedar is the only
   production system found with a Lean model, and it does not extract: the
   Rust implementation is hand-written and reconciled by differential
   testing. The *wording* precedent transfers to us; the *mechanism*
   precedent does not exist. If REF-7 lands, the estate is, as far as this
   survey found, doing something without a shipped precedent — which is a
   reason for the corpus evidence to be strong, not a reason to stop.
2. **Nobody itemizes their language runtime's primitives in a trusted-base
   statement.** Every surveyed statement says "the compiler", "the
   extractor", or "the C toolchain". None enumerates the hand-written
   runtime routines the generated code calls. §8's item 2 is therefore
   *unmodelled* language: it goes beyond the field's norm, and no source
   tells us how far to take it — where to stop between "the Lean runtime"
   and a list of the 931 `@[extern]`-annotated declarations in Lean's own
   sources. That boundary is a judgment the operator should make at REF-7,
   not one this survey can settle.
3. **No precedent found for host-divergence wording.** None of the surveyed
   projects ships one artifact into two independent host runtimes. seL4
   pins one compiler at one optimisation level; CompCert names its assembler
   and linker; nobody says "and we assume these two engines agree." RQ-3
   owns the technical question; the *claim wording* for it has no model in
   this survey.
4. **The ABI boundary is unmodelled precedent.** Every surveyed extraction
   crosses at typed C functions. A stateless bytes-in/bytes-out ABI over
   RFC 8785 canonical bytes adds an assumption none of them carries: that
   the canonical encoding is injective enough for the theorems to transfer
   across the boundary. REF-2 owns the property; no surveyed project has
   worded such an assumption for us to imitate.
5. **No precedent found for D-e obligation 5 (status-as-gate).** seL4,
   CompCert, HACL\* and Fiat-Crypto all state their assumptions in prose;
   this survey found no project whose CI re-verifies its own trusted-base
   statement at HEAD. This is a finding about the field, not a gap in our
   design — but it means we have no template, and no other project's
   experience to learn the failure modes from. (RQ-5 surveys proof-gating
   CI generally; this narrower claim is bounded to the sources here.)
6. **No effort data for the extraction boundary specifically.** Projects
   report proof effort (seL4 ~9:1 proof-to-development, per the estate's
   prior report) but none isolates the cost of building, maintaining, or
   re-validating the extraction step across model changes. REF-9's budget
   cannot be calibrated from this literature.
7. **The failure-rate question is answered only for Rocq.** Monniaux and
   Boulmé give one careful account of where a verified compiler's TCB bugs
   actually landed. Nothing equivalent exists for Lean's backend. Our
   confidence that "the failure mode is loud" is borrowed from a different
   toolchain and should be labelled as borrowed wherever it is used.

---

## 11. Sources

Every source below was retrieved 2026-08-16; versions, licences and full
excerpts are recorded in
[`reference/rq2-extraction-proved-or-trusted/README.md`](reference/rq2-extraction-proved-or-trusted/README.md)
and
[`reference/rq2-extraction-proved-or-trusted/quotations.md`](reference/rq2-extraction-proved-or-trusted/quotations.md).

| # | Source | URL |
| --- | --- | --- |
| 1 | seL4, "What the Proofs Assume" | <https://sel4.systems/Verification/assumptions.html> |
| 2 | seL4 FAQ | <https://sel4.systems/About/FAQ.html> |
| 3 | Sewell, Myreen, Klein, *Translation Validation for a Verified OS Kernel*, PLDI 2013 | <https://trustworthy.systems/publications/nicta_full_text/6449.pdf> |
| 4 | CompCert manual v3.17 (13 Feb 2026), ch. 1 | <https://compcert.org/man/manual001.html> |
| 5 | Monniaux, Boulmé, *The Trusted Computing Base of the CompCert Verified Compiler*, ESOP 2022 | <https://hal.science/hal-03541595/document> |
| 6 | Kumar, Myreen, Norrish, Owens, *CakeML*, POPL 2014 | <https://cakeml.org/popl14.pdf> |
| 7 | CakeML project page | <https://cakeml.org/> |
| 8 | Protzenko et al., *EverCrypt*, IEEE S&P 2020 | <https://eprint.iacr.org/2019/757.pdf> |
| 9 | KaRaMeL README | <https://github.com/FStarLang/karamel> |
| 10 | Erbsen et al., *Fiat-Crypto*, IEEE S&P 2019 | <https://people.csail.mit.edu/jgross/personal-website/papers/2019-fiat-crypto-ieee-sp.pdf> |
| 11 | Rocq reference manual, *Program extraction* | <https://rocq-prover.org/doc/master/refman/addendum/extraction.html> |
| 12 | Forster, Sozeau, Tabareau, *Verified Extraction from Coq to OCaml*, PLDI 2024 | <https://hal.science/hal-04329663/document> |
| 13 | Isabelle, *Code generation from Isabelle/HOL theories* (18 Jan 2026) | <https://isabelle.in.tum.de/doc/codegen.pdf> |
| 14 | CertiRocq README | <https://github.com/CertiRocq/certirocq> |
| 15 | Meier, Pichon-Pharabod, Spitters, *CertiCoq-Wasm*, CoqPL 2024 / CPP 2025 | <https://womeier.de/files/certicoqwasm-coqpl24-abstract.pdf>, <https://doi.org/10.1145/3703595.3705879> |
| 16 | Lean 4.33.0 toolchain sources (`Init/Core.lean`, `Lean/Compiler/ImplementedByAttr.lean`, `Lean/Compiler/CSimpAttr.lean`) | <https://github.com/leanprover/lean4> |
| 17 | *The Lean Language Reference* 4.34.0-rc1, ch. 8 and §12.4 | <https://lean-lang.org/doc/reference/latest/Axioms/> |
| 18 | de Moura, Ullrich, *The Lean 4 Theorem Prover and Programming Language*, CADE 2021 | <https://lean-lang.org/papers/lean4.pdf> |
| 19 | Lean4Lean README | <https://github.com/digama0/lean4lean> |
| 20 | cedar-spec README and cedar-drt README | <https://github.com/cedar-policy/cedar-spec> |
| 21 | Cutler et al., *Cedar* (extended version) | <https://arxiv.org/abs/2403.04651> |

---

## Independent verification — 2026-08-16

Adversarial re-check by a second agent, same day. Every source below was
re-fetched independently of the report's own retrievals; PDFs were
re-downloaded and re-extracted; the executed evidence was re-run on this
machine. Nothing in the report body above was edited — findings before
fixes.

**Verdict: sound.** All ten load-bearing claims CONFIRMED; no invented API,
flag, or signature found; no ratified decision is reversed by the survey,
and the report's decisionImpact survives attempted refutation. Seven
defects are recorded below, all non-material.

### Claim-by-claim

| # | Claim | Source | Verdict | Evidence |
| --- | --- | --- | --- | --- |
| 1 | Lean's shipped sources place its compiler in the trusted base and name `[implemented_by]`/`[extern]` | `Init/Core.lean` 4.33.0 (local elan toolchain) + upstream tag | **CONFIRMED** | Local lines 2374–2378 read verbatim "Depends on the correctness of the Lean compiler, interpreter, and all `[implemented_by ...]` and `[extern ...]` annotations."; lines 2422–2436 (`ofReduceBool`) carry "Keep in mind that if you are using Lean as programming language, you are already trusting the Lean compiler and interpreter." Upstream `raw.githubusercontent.com/leanprover/lean4/v4.33.0/src/Init/Core.lean` line 2375 matches (HTTP 200). |
| 2 | An empty axiom footprint coexists with an exported C symbol computing a different function; the estate's gate cannot see it | `lean-trust-gap/`, `verify/moves/run.sh` | **CONFIRMED** | `bash run.sh` re-run here: exit 0, `GATE: PASS`, printing `'honest_eq' does not depend on any axioms`, `compiled honest 3 = 4`, and `foldlab_honest` whose body is `v___x_7_ = l_liar(v_n_6_);`. `grep -E "implemented_by\|extern" verify/moves/run.sh` returns nothing (exit 1); the only footprint filter is line 88, `grep -Ev '^(propext\|Classical\.choice\|Quot\.sound)$'`. |
| 3 | The generated kernel calls hand-written Lean-runtime C for the ABI's own types with no annotations of ours; 931 `@[extern` lines (626 under `Init/`) | `ByteKernel.lean`, toolchain sources | **CONFIRMED** | Re-run emits `lean_byte_array_uget` ×2, `lean_byte_array_size` ×2, `lean_nat_add` ×2, `lean_uint8_to_nat` ×2 from an unannotated `ByteArray.foldl`. Independent count on the 4.33.0 toolchain: 931 / 626 / 947 — exact match on all three figures. |
| 4 | CompCert's manual: ~10% unverified; assembly/linking covered only by Valex a-posteriori validation | compcert.org/man/manual001.html | **CONFIRMED** | Re-fetched raw: "about 90% of the compiler's algorithms (including all optimizations and all code generation algorithms) are proved correct in Rocq/Coq, but the remaining 10% (including elaboration, presimplifications, assembling and linking) are not verified."; "only phase 3 (from CompCert C AST to Asm AST) and the parser in phase 2 are formalized and proved correct in Rocq/Coq."; "For phase 4 (assembly and linking), we have no formal guarantees yet, but the Valex tool, available from AbsInt, provides additional assurance via a posteriori validation of the executable produced by the external assembler and linker." Index page confirms "Version 3.17 … February 13, 2026" and CC BY-NC-SA 4.0. |
| 5 | seL4 states assumptions exhaustively; binary verification removes compiler and linker from the base | sel4.systems assumptions + FAQ | **CONFIRMED** | Verbatim on the assumptions page: "Assumptions are not limitations or problems."; "Being able to clearly state an exhaustive list of assumptions means that the work needed to fully trust a system is massively reduced…"; "For the proof, we assume this code is correct."; "…the proof is not from first principles and there is potential for human error."; "We assume our prover checks this particular proof correctly."; "Note that we do not need to trust the compiler and linker any more on architectures that are supported by our binary verification." Seven enumerated categories present. FAQ: "On the ARM and RISCV64 platforms, there is a further proof that the binary code which executes on the hardware is a correct translation of the C code." and "This means that the compiler does not have to be trusted, and extends the functional correctness property to the binary." |
| 6 | Fiat-Crypto names a pretty-printer and the C toolchain in its TCB while shipping into BoringSSL | 2019 IEEE S&P PDF | **CONFIRMED** | PDF re-extracted: "All formal reasoning is done in the Coq proof assistant, and the overall trusted computing base also includes a simple pretty-printer and the C language toolchain." Abstract: "Implementations from our library were included in BoringSSL to replace existing specialized code, for inclusion in several large deployments for Chrome, Android, and CloudFlare." The "We trust only the standard Coq theorem prover … (plus, for now, the C compiler; see below)" sentence is also verbatim. |
| 7 | Coq/Rocq extraction is in the TCB (PLDI 2024); Monniaux & Boulmé report known extractor bugs surfacing as rejected programs | PLDI 2024 abstract; ESOP 2022 | **CONFIRMED** | HAL is behind a bot-challenge interstitial and was not bypassed. The PLDI'24 abstract was re-verified from the Rocq project's own papers page (`rocq-prover.org/papers/verified-extraction-from-coq-to-ocaml`), verbatim: "However, for such executables obtained by extraction, the extraction process is part of the trusted code base (TCB), as are Coq's kernel and the compiler used to compile the extracted code." — correctly attributed to Forster, Sozeau, Tabareau, PLDI 2024. The ESOP'22 paper was re-fetched from arXiv:2201.10280: "Coq's extractor and OCaml are in the TCB of CompCert." and footnote 9 "Coq's bug tracker lists extractor bugs that, to the best of our knowledge, result in programs that are rejected by OCaml compilers." |
| 8 | CakeML proves the translation and says so in TCB terms | cakeml.org/popl14.pdf, cakeml.org | **CONFIRMED** | "in the context of program verification, an unverified compiler forms a large and complex part of the trusted computing base."; "Lastly, we note that we do not rely on the correctness of another compiler in our trusted computing base (except perhaps as part of the proof checker or theorem prover)."; "Having a machine code semantics in the trusted computing base is intrinsic to the problem." Front page: "It generates CakeML AST from ML-like functions in HOL and proves that the generated AST has the same behaviour as the HOL function." |
| 9 | CertiCoq-Wasm is verified against WasmCert-Coq's Wasm 1.0 — for Rocq, not Lean | CoqPL'24 abstract | **CONFIRMED** | Abstract re-extracted: "Coq provides both unverified extraction [5] and a recent certified extraction, CertiCoq [1]."; "We prove CertiCoq-Wasm correct with respect to the official specification of WebAssembly 1.0 [7], as mechanised in WasmCert-Coq [10]."; Figure 1 caption "MetaCoq [9] (which has to be trusted)". Independent search for a verified Lean 4 code generator returned nothing on-point; the nearest hit (a Lean-hosted DSL-to-C optimizer) explicitly disclaims being an end-to-end verified compiler and is not Lean's backend. The absence finding stands as bounded. |
| 10 | Cedar does not extract; Rust vs Lean model reconciled by differential randomized testing | cedar-spec READMEs, arXiv:2403.04651 | **CONFIRMED** | Top-level README: "This repository contains the formalization of Cedar and infrastructure for performing differential randomized testing (DRT) between the formalization and Rust production implementation…"; `cedar-drt/README.md` carries the DRT/PBT fuzz-target table verbatim. arXiv abstract: "We have modeled Cedar in the Lean programming language… We have implemented Cedar in Rust, and released it open-source." The string "extraction" does not appear in the abstract. |

### Sampled beyond the list — all CONFIRMED

Isabelle codegen (18 January 2026 title page): "From these steps, only the
last two are carried out outside the logic; by keeping this layer as thin
as possible, the amount of code to trust is kept to a minimum."; "custom
serialisations are completely axiomatic."; and the oracle sentence ending
"…before it can be considered trustworthy!". EverCrypt's TCB subsection is
literally headed "C. Trusted Computing Base (TCB)" inside Section II — so
the report's "§II-C" is exact — and carries "…implementations verified in
Coq [72] trust Coq, the Coq extraction to OCaml, and the OCaml compiler and
runtime." KaRaMeL README: "This work has been formalized on paper."
Sewell, Myreen and Klein, PLDI 2013: "We handle binaries generated by
unmodified gcc 4.5.1 at optimisation level 1, and can handle most of seL4
even at optimisation level 2." Rocq extraction manual (page version
9.4+alpha): the "certified and relatively efficient functional programs"
opener, "The external function name string is not checked in any way.", and
the overflow caveat. The Lean reference manual at
`/doc/reference/latest/` resolves to version string 4.34.0-rc1 and carries
"These axioms instead track proofs that depend on the correctness of the
entire compiler, and not just on the much smaller kernel."; its FFI chapter
carries the "designed for internal use in Lean and should be considered
unstable" sentence. Lean CADE 2021: "Lean has a relatively small trusted
kernel", and its §3 is titled "The Code Generator" with no correctness
claim attached. Lean4Lean README: "This is an implementation of the Lean 4
kernel written in (mostly) pure Lean 4." CertiRocq README: "Large parts of
the CertiRocq compiler have been verified whereas others are in the process
of being verified." (MIT, as recorded). `ImplementedByAttr.lean`: "The
provided implementation is not checked to be equivalent to the original
definition."

### Attempted refutation of the decisionImpact — failed

Each premise was checked against the repository, not against the report.
Draft 17 line 370 does read "The Lean kernel and its C backend" and omits
both the runtime-primitive layer and the no-`@[implemented_by]` assumption,
so amendment (1) names a real gap. `verify/moves/run.sh` contains no
`implemented_by`/`extern` grep and its footprint filter is exactly the
three-axiom allowlist, so amendment (2)'s premise holds and its executed
evidence reproduces here. Draft 17 line 254 does read "no trap on any
corpus row", and RQ-1 §6 does record that the function "returned the
`Inhabited` default", so amendment (3) names a real wording gap. The
"already trusted today" premise also holds mechanically: the final check in
`verify/moves/run.sh` runs `lake exe oracle emit 2000` — compiled Lean —
and byte-compares the result against the committed fixture, so the Lean
compiler is load-bearing for the estate's committed corpus at HEAD. No
ratified decision is reversed.

One caution rather than a refutation, flagged for the grill: "REF-7
enlarges the exposure, not the kind" is true of the *component* but
understates the change in *consequence*. Today the compiler's output is a
fixture a human ratified and a diff would expose; after REF-7 it is the
production seam with no oracle above it. The report body says this plainly
in §5 and §6, so the summary sentence should not be read as softer than the
body it summarises.

### Defects

1. **§5 understates the existing gate.** It says `verify/moves/run.sh`
   "checks two things about the model". The gate enforces five — a frozen
   `Spec.lean` sha256 pin, `sorry`/`admit`/`axiom` greps, the axiom
   footprint over a 40-name roster, an orphan rule against
   `gate-exclusions.txt`, and byte-identical corpus regeneration — and says
   so in its own PASS line. The conclusion is unaffected: every one of the
   additional checks is equally blind to `@[implemented_by]`, which is the
   report's point.
2. **An "I ran it" claim without a committed transcript.** The `@[extern`
   counts (931 / 626 / 947) are attributed to "Counted on this machine",
   but `run.sh` does not perform the count and `TRANSCRIPT.md` does not
   record it. The figures are correct — re-derived independently here, all
   three exact — but §1's own standard ("its transcript is committed") is
   not met for this item. Fix: assert the three counts in `run.sh`.
3. **No `docs/research/reference/README.md` at the root.** Draft 19's
   reference-area rule asks for a root README recording, for every item,
   what it is, where it came from, its licence and the date retrieved. Only
   the per-topic subdirectory READMEs exist. RQ-2's own subdirectory README
   is complete and compliant; this is a program-wide gap rather than an
   RQ-2 one.
4. **§6 trims a qualifier from the Csmith quote.** The manual reads "As of
   early 2011, the under-development version of CompCert is the only
   compiler we have tested for which Csmith cannot find wrong-code errors."
   The report renders it as a standing property of CompCert, without the
   date or the "under-development version" qualifier. The six-CPU-years
   figure is verbatim and correct.
5. **Cedar strains the camp-D definition.** Camp D is defined as "the
   translator stays unproved; each build's output is checked against the
   input by an independent tool". Cedar has no translator and no per-build
   check of an output against an input — it is randomized differential
   testing between two independently written implementations. §3 and §10
   state this correctly; only the §2 table row is loose.
6. **`run.sh` step 4 asserts too little.** It requires only that
   `CsimpGuard.lean` fail to elaborate, and prints the first four lines of
   the error without checking them. A failure for an unrelated reason — a
   typo, a toolchain change — would still report `GATE: PASS`. Fix: grep
   the output for "definitional equality".
7. **Cosmetic quotation shape.** §5 renders the `ofReduceBool` warning as
   "the Lean compiler and interpreter … part of your trusted code base"
   where the source reads "become part of". `quotations.md` carries the
   sentence correctly and in full, so this is presentational only.

*Method note: HAL (hal.science) served an anti-bot interstitial for both
`hal-04329663` and `hal-03541595`. No attempt was made to defeat it; both
papers were verified from independent authoritative mirrors instead — the
Rocq project's own papers page and arXiv respectively — and that
substitution is recorded here rather than passed over.*
