# Refinement ladder — research questions for codex dispatch

Nine independently dispatchable research questions serving
`scratch/dispatch/17-the-refinement-ladder.md`. Each is answerable in
parallel with the REF-0 spike (draft 18) and none blocks it. Answers
land as dated reports in `docs/research/`; runnable examples and CI
material land in the reference area described below.

## Dispatch discipline (binding on every question)

The estate's standing rule applies without exception: **the demands of
true rigor are centered and honored, never hidden**. Concretely, for
these reports:

1. **Every claim carries its source and the date it was retrieved.**
   Primary documentation, published papers, and real repository code
   are evidence. A blog post, a forum answer, or an LLM's recollection
   is a *lead*, and must be labeled as one until a primary source
   confirms it.
2. **"I ran it" outranks "the docs say."** Where a claim is
   mechanically checkable on this machine — a toolchain builds, an API
   has the signature stated, a flag exists — check it and record the
   transcript. Where it is not checkable here, say so explicitly.
3. **Absence is a finding.** "No prior art found for X, having searched
   these sources by these terms" is a complete and valuable answer.
   Inventing a plausible precedent, or padding with adjacent work
   presented as if on-point, is the failure mode this rule exists to
   forbid.
4. **Never invent an API.** No function signature, flag, or
   configuration key appears in a report unless it is quoted from a
   primary source or executed. Mark anything reconstructed from memory
   as `UNVERIFIED`.
5. **Separate what the source establishes from what we would need.**
   Every report ends with a section stating what the prior art does
   *not* answer for our seam — the gap, named, not glossed.
6. **No recommendation without its cost.** Where a report recommends an
   approach, it states what that approach makes harder, what it adds to
   the trusted base, and what it would take to reverse.

The leads named under each question are recalled by the coordinator and
are **explicitly unverified** — they are starting points chosen to save
search time, and any of them may be misremembered, misattributed, or
wrong. Confirming or refuting a lead is part of the work; a refuted
lead reported as refuted is a good answer.

## The reference area

Create `docs/research/reference/` with one subdirectory per topic and a
`README.md` at the root recording, for every item: what it is, where it
came from, its license, and the date retrieved.

Prefer **links plus own-authored minimal reproductions** over vendoring
third-party code. Vendor only when the artifact must be runnable here,
and only with its license recorded verbatim in the subdirectory. Never
vendor code whose license is absent or unclear. CI configurations and
build scripts from other projects are usually best captured as a link
plus a distilled summary of the technique, not a copy.

---

## RQ-1 — What does Lean's C backend actually give us?

**Serves:** REF-0 spike (draft 18), REF-6.

**The question.** What is the exact, documented mechanism by which a
Lean 4 function becomes a C-callable symbol, and what does the caller
owe the Lean runtime in return?

**What a good answer contains.**

1. The `@[export]` mechanism and its constraints: which types may
   cross the boundary, how `ByteArray` is represented, what happens to
   `IO`-typed functions versus pure ones.
2. Memory and lifetime rules: who owns a returned object, how
   reference counting is exposed at the C API, what the caller must do
   to avoid leaking or double-freeing.
3. Initialization: what must be called before the first export is
   invoked, whether it is idempotent, and whether it is safe to call
   from a non-main thread.
4. Threading: what the Lean runtime documents about concurrent calls
   from multiple host threads. This directly determines T4 in the
   spike's threshold table.
5. A **committed, runnable minimal example** in the reference area —
   Lean source, build command, C caller — that builds on this machine
   (Lean 4.33.0, MSYS2 gcc 16.1.0). If it does not build, the
   transcript of the failure is the deliverable.

**Leads to verify (unverified).** Lean 4's official FFI documentation
and the `lean.h` / `lean_object` C API; the `extern`/`@[export]`
distinction; `lean_initialize_runtime_module`; how `lake` is asked to
emit a static library rather than an executable.

**What would make this answer worthless.** A summary of FFI concepts
in the abstract, with no example that builds and no statement of what
was actually executed.

---

## RQ-2 — Is extraction proved, or trusted? The precedent survey.

**Serves:** REF-6, D-e's trusted-base obligation, D-a's fallback design.

**The question.** Across the major verified-systems projects that ship
extracted code, is the extraction step itself **proved correct** or
**assumed correct** — and how does each project word that boundary in
its own claims?

This is the sharpest question in the set. D-e requires that a `proved`
seam state its trusted base. If Lean's backend is trusted rather than
proved — which the coordinator expects, but has not confirmed — then
our honest claim is bounded exactly there, and the wording of that
bound should be modeled on how the most rigorous projects in the field
word theirs.

**What a good answer contains.**

1. For each project surveyed: what is extracted, into what language,
   and whether a theorem covers the extraction.
2. **Verbatim quotation** of how each project states this boundary in
   its own trusted-base or assumptions statement. These quotations are
   the report's most valuable content — they are the field's calibrated
   language for exactly the claim we are about to make.
3. Which camp Lean 4's C backend sits in, with a primary source.
4. Any project that *validates* extraction after the fact rather than
   proving it (translation validation, differential testing of
   extracted output, certified compilation).
5. A recommendation for how VERIFICATION.md should word the REF-7
   trusted-base paragraph, drafted against the surveyed language.

**Leads to verify (unverified).** seL4 (Isabelle/HOL refinement to C,
with a formal C semantics — the strongest refinement precedent, and
its assumptions statement is unusually explicit); CompCert (Coq,
verified compiler, but extraction to OCaml is trusted); CakeML (HOL4 —
notable because it closes the extraction gap by verified compilation
and bootstrapping, i.e. the one camp that *proves* it); F\* / KaRaMeL
producing C for HACL\* and EverCrypt, shipped into Firefox NSS, the
Linux kernel, and WireGuard — the flagship "verified model to C into
production" precedent; Coq's and Isabelle's standard extraction
mechanisms and their documented caveats.

**What would make this answer worthless.** A list of famous projects
with one-line descriptions. The value is in the exact wording of their
boundary statements and in an accurate placement of Lean.

---

## RQ-3 — WebAssembly as a target for verified code

**Serves:** D-bc (ratified WASM-preferred), REF-6, REF-7.

**The question.** Is WebAssembly a defensible compilation target for
verified code, and what exactly does its determinism guarantee — and
fail to guarantee?

**What a good answer contains.**

1. The published argument, if it exists, for compiling verified code
   to WASM rather than to native C, and what it claims WASM's semantics
   buy for a verification argument.
2. WASM's determinism guarantees and their **documented limits** —
   NaN payload canonicalization, memory growth behavior, and anything
   in the specification marked implementation-defined or
   nondeterministic. Our kernel's byte-in/byte-out ABI must not sit on
   a nondeterministic primitive, and this is where such a primitive
   would hide.
3. The host import surface: what a Lean-runtime-on-WASM module would
   demand from its host, and whether that surface is identical across
   Go (wazero) and Bun. **Divergent host imports would silently break
   the one-digest-everywhere property D-bc was ratified for** — this
   sub-question is load-bearing.
4. wazero's concurrency model: whether a compiled module and its
   instances are safe under concurrent calls, and the documented safe
   pattern (per-goroutine instance, instance pool, or serialized
   access). Primary-source or executed evidence only.
5. The state of Lean-to-WASM: whether the Lean runtime targets wasm32,
   what toolchain is used, and what is known to break. Report honestly
   if this is thin or undocumented — that is a material finding for the
   spike.

**Leads to verify (unverified).** Protzenko et al., "Formally Verified
Cryptographic Web Applications in WebAssembly" (IEEE S&P 2019) —
believed to argue WASM is a *better* target than C for verified code
precisely because its semantics are cleaner; the WebAssembly core
specification's nondeterminism section; wazero's documentation on
concurrency and module instantiation; the WASM builds of Lean used for
browser-hosted Lean editors; Lean's runtime dependency on GMP for
arbitrary-precision arithmetic — whether the wasm build carries it,
replaces it, or breaks on it (lead: the lean4web build scripts); and
whether Bun's native WebAssembly host provides a WASI preview1 shim
versus wazero's built-in one — divergent WASI shims are part of the
import-surface question in point 3.

---

## RQ-4 — The road not taken: verifying the implementations we already have

**Serves:** honest assessment of the alternative to extraction.

**The question.** Instead of generating the kernel from the model,
could we prove the *existing* Go and TypeScript implementations
correspond to the model — and what would that cost?

The estate's spirit requires the alternative be assessed rather than
assumed away. REF-6/REF-7 chose extraction; this question tests that
choice against the strongest available version of its rival, and its
honest answer may well be "extraction remains correct for us" — stated
with reasons rather than by default.

**What a good answer contains.**

1. The state of the art for verifying Go against a formal model:
   what exists, what subset of Go it handles, whether it scales to code
   that talks to a network and a store.
2. The same for TypeScript or JavaScript. The coordinator expects this
   to be very thin; confirming thinness with sources is a real finding.
3. The strongest precedent for "implementation proved against spec, in
   CI, on every commit" — including how long the proofs take and what
   happens when one breaks.
4. An honest cost comparison for **our** seam specifically, given that
   after DEV-674/675 the behavior lives in one pure function per
   runtime rather than smeared across the codebase. That concentration
   changes the cost of this option materially and the comparison must
   account for it.
5. A verdict: does anything here change the REF-6/REF-7 plan? A "no,
   and here is why" is a complete answer.

**Leads to verify (unverified).** SAW and Cryptol (Galois) proving
C/LLVM implementations against specifications, reportedly run in CI for
AWS's s2n-tls — if real, this is the closest existing precedent for our
standing law; goose and the Perennial project (Go translated into Coq
for verification of storage and concurrent systems); Gobra (Viper-based
Go verifier); Frama-C/ACSL and VST as the general "verify existing C"
alternative to extraction.

---

## RQ-5 — CI patterns for conformance as a build invariant

**Serves:** REF-9's standing law, D-e's status-as-gate obligation.

**The question.** Which projects gate their build on a proof or a
conformance check, and what does that actually look like in practice —
in wall-clock time, in failure modes, and in developer experience?

**What a good answer contains.**

1. Real CI configurations from projects that run proofs or
   model-conformance checks as gates, captured as links plus distilled
   technique summaries in the reference area.
2. **Wall-clock reality**: how long these gates take. A gate that takes
   forty minutes changes how REF-9's update cycle is designed, and we
   should learn that from other people's published numbers rather than
   from our own first painful experience.
3. How projects handle the proof-breaks-the-build case: is the gate
   blocking or advisory, is there a staged or nightly tier, how are
   long-running proofs cached or incrementalized.
4. Patterns for the specific gate D-e ratified: a command that
   re-verifies a documented status claim at HEAD, such that the
   documentation cannot silently drift from the code. Any prior art for
   *executable documentation status* is directly on-point.
5. Anti-patterns: gates that appear to check something and do not.
   Given DEV-670's own history — a naive corpus that would have skipped
   99% of its universe while reporting green — this section is
   especially valuable.

**Leads to verify (unverified).** s2n-tls's SAW proofs in CI; seL4's
proof CI and its published maintenance data; HACL\*/EverCrypt's build
and CI; Cedar's differential-random-testing gate (already referenced in
VERIFICATION.md as the model for our S7 evidence).

---

## RQ-6 — Byte-identical artifact generation, in practice

**Serves:** REF-6's regeneration gate, D-bc's one-digest-everywhere
claim.

**The question.** What actually makes a compiled artifact byte-identical
across two platforms and two clean checkouts, and which of those
requirements does our chosen toolchain satisfy today?

D-bc was ratified partly on the strength of a single content digest for
the deployed kernel across Go, TypeScript, Windows, and Linux. That
claim must be earned mechanically, and the ways it fails are well
documented by people who have fought this before.

**What a good answer contains.**

1. The standard sources of build nondeterminism — embedded timestamps,
   absolute paths, environment leakage, archive metadata, ordering
   effects, parallelism, locale — and the standard mitigations.
2. Whether the WASM toolchain under consideration produces
   deterministic output in practice, what flags are required, and what
   is known to leak into the artifact.
3. Whether cross-platform byte-identity (same bytes from Windows and
   Linux) is realistically achievable for this toolchain, or whether
   the honest gate is same-platform reproducibility plus cross-platform
   *behavioral* equality. **If it is the latter, say so plainly** —
   REF-6's gate would then need rewording before dispatch, and
   discovering that now is exactly the point of asking.
4. How other projects express this gate in CI concretely.

**Leads to verify (unverified).** The Reproducible Builds project's
documentation of nondeterminism sources and mitigations;
`SOURCE_DATE_EPOCH`; path-remapping compiler flags; Nix and Bazel as
existence proofs of reproducible toolchains; any published statement
about determinism of the emscripten or WASI-SDK output.

---

## RQ-7 — Certificates: what a per-run proof buys

**Serves:** REF-8.

**The question.** In the tradition of verified checkers and translation
validation, what is the honest strength of a per-execution certificate
compared with a universal proof, and what does a well-designed
certificate format look like?

**What a good answer contains.**

1. The distinction, stated precisely: a universal proof covers all
   runs of a program; a certificate covers the run that produced it. A
   verified *checker* moves the trust from the producer to the checker.
   Getting this framing exactly right matters, because REF-8 must not
   be described as if it were REF-3.
2. Prior art in verified checking, with attention to what is proved
   about the checker versus assumed about the producer.
3. Translation validation as the sibling technique: validating each
   run of a transformation rather than proving the transformation.
4. Practical certificate design: what must be in the certificate for
   an independent party to check it, how large certificates get, and
   what makes them cheap or expensive to verify.
5. What this means for our session certificates specifically: what a
   foldlab certificate would have to contain for a third party holding
   only the kernel artifact and the journal to re-derive the verdict.

**Leads to verify (unverified).** Verified SAT proof checkers in the
LRAT/DRAT lineage, including CakeML-verified checkers; the translation
validation literature originating with Pnueli and colleagues;
proof-carrying code.

---

## RQ-8 — What a living model costs: proof maintenance in the field

**Serves:** REF-9, and the operator's explicit constraint that the
model will never be final.

**The question.** What is the empirically documented cost of changing a
specification that has proofs and generated artifacts hanging off it,
and which engineering practices measurably reduce that cost?

This is the question the whole ladder is ultimately for. Most
verification literature treats the proof as a one-time achievement; the
estate has ratified the opposite premise. Whatever the field knows
about proof evolution is directly load-bearing for REF-9's design.

**What a good answer contains.**

1. Published data on proof-maintenance effort where it exists —
   ratios of proof-change to code-change, cost of a specification
   change propagating through a large development.
2. Structural practices that reduce propagation cost: layering of
   specifications, abstraction barriers between the abstract model and
   the refinement, keeping statements separate from proof scripts,
   proof-repair tooling.
3. Whether any project has built something like REF-9's loop — a
   gated chain in which a specification change mechanically forces
   regeneration and re-proof of everything downstream — and what they
   learned.
4. Concrete recommendations for how `verify/moves/` and the REF-1 wire
   model should be *structured* so that a future extension costs the
   least. Since REF-1 has not been built yet, its file layout can still
   be shaped by this answer — which is why this question is dispatched
   now rather than after.
5. The negative control's design: how one demonstrates that a
   law-breaking change is *refused* by the chain, without leaving
   sabotage machinery in the estate.

**Leads to verify (unverified).** Ringer et al., "QED at Large: A
Survey of the Engineering of Formally Verified Software"; the seL4
project's published data on proof maintenance across kernel changes;
proof-repair tooling in the Coq ecosystem; CompCert's release history.

---

## RQ-9 — RFC 8785 in a proof assistant: how bad is the number problem?

**Serves:** REF-2, and REF-2's scope honesty.

**The question.** What would it take to model RFC 8785 canonical JSON
in Lean, and specifically: how hard is the number-serialization
requirement?

The coordinator's concern, to be confirmed or refuted: RFC 8785's
number formatting inherits ECMAScript's shortest-round-trip algorithm,
and formally specifying *that* is a substantially harder problem than
the rest of the canonicalization combined. If true, REF-2's scope needs
splitting before dispatch — the structural canonicalization laws are
one slice, and the number formatting is a much larger one that may
warrant a different treatment entirely. Finding this out now is honest
incremental implementation; finding it out mid-slice is the hidden
rigor demand the estate refuses.

**What a good answer contains.**

1. Exactly what RFC 8785 requires of number serialization, quoted from
   the specification, and what it inherits by reference.
2. The state of formalized floating-point in Lean: what exists in core
   or in the ecosystem for IEEE-754 reasoning, and whether
   shortest-round-trip printing has been formalized in **any** proof
   assistant.
3. Prior art in verified serialization and parsing generally.
4. A scope recommendation for REF-2 with at least two options — for
   instance, proving the structural laws while treating number
   formatting as a differentially-walled component with a stated bound,
   versus attempting the whole thing — each with its honest cost and
   its honest residual.
5. What our existing corpus already covers, checked against
   `fixtures/jcs-rfc8785.json` and the differential tests in this
   repository, so the recommendation is grounded in what we hold today
   rather than in the abstract.

**Leads to verify (unverified).** RFC 8785 itself and its normative
reference to ECMAScript number-to-string; the Ryū and Grisu family of
shortest-round-trip algorithms; EverParse (F\*) for verified parser and
serializer generation; any formalization of floating-point printing in
Coq, Isabelle, or Lean.

---

## Suggested dispatch order

All nine are independent, but if capacity is limited, RQ-2, RQ-3, and
RQ-9 have the highest chance of *changing a ratified decision or a
slice's scope* and should go first. RQ-1 most directly assists the
spike. RQ-5 and RQ-6 shape REF-6 and REF-9 but do not gate REF-1.
RQ-8 now sits on REF-1's dispatch path: the wire model's home and
layout are decided at REF-1 dispatch informed by its recommendations
(grill-record amendment 7), so RQ-8 should close before REF-1
dispatches. RQ-4 and RQ-7 are assessment and design support for
slices further out.
