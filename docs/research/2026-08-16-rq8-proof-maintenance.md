# RQ-8 — What a living model costs: proof maintenance in the field

Research seat, foldlab REF program. Dispatched from
`scratch/dispatch/19-refinement-research-questions.md` (RQ-8), serving
REF-9, REF-1's file layout, and the wire-model-home decision that
grill-record amendment 7 defers to REF-1 dispatch. All retrievals dated
**2026-08-16**; every command transcript in this report was executed on
this machine the same day.

Companion material, including two committed runnable reproductions and the
full licence/provenance ledger: `docs/research/reference/rq8-proof-maintenance/`.

---

## 0. What this report is and is not

**The question.** What is the empirically documented cost of changing a
specification that has proofs and generated artifacts hanging off it, and
which engineering practices measurably reduce that cost?

**Grounding discipline used throughout.** Each claim is tagged:

- **ran** — executed on this machine, transcript recorded;
- **quoted** — verbatim from a primary source retrieved at the URL given;
- **lead** — recalled or second-hand, explicitly not yet confirmed.

Nothing here is asserted from memory without a tag. Where the field has no
answer, that is stated as a finding rather than filled in.

**Toolchain, verified before use (ran).**

```
$ lake --version
Lake version 5.0.0-src+d8b1897 (Lean version 4.33.0)
$ lean --version
Lean (version 4.33.0, x86_64-w64-windows-gnu, commit d8b18978322de05a8f3dba51ef03cf5461676c17, Release)
```

---

## 1. Published proof-maintenance cost data

### 1.1 seL4 — the only large evolving verified codebase with published change costs

Klein, Andronick, Elphinstone, Murray, Sewell, Kolanski and Heiser,
*"Comprehensive Formal Verification of an OS Microkernel"*, ACM TOCS 32(1)
Article 2, February 2014, retrieved from
<https://trustworthy.systems/publications/nicta_full_text/7371.pdf>.

The paper's own framing of its scale (quoted):

> It is also the only evolving formally-verified code base of the order of
> 10 000 lines of code and we report on maintaining it for almost a decade
> together with its now 480 000 lines of Isabelle proofs and specifications.

Section 7.4, "The Cost of Change", is the field's most directly usable
proof-maintenance data. It opens by refusing to give a single number
(quoted):

> An obvious issue of verification is the cost of proof maintenance: how
> much does it cost to reverify after changes are made to the kernel? This
> clearly depends on the nature of the change, specifically the amount of
> code it changes, the number of invariants it affects, and how localised
> it is. We are not able to quantify such costs, but our iterative
> verification approach has provided us with some relevant experience.

It then gives four change classes with figures (quoted, condensed into a
table; the wording of each row is theirs):

| Change class | Implementation cost | Re-verification cost |
| --- | --- | --- |
| "local, low-level code changes, typically optimisations that do not affect the observable behaviour" | small | "always low and roughly proportional to the size of the change" |
| "Adding new, independent features" — their example, a new system call batching a short sequence of existing calls | "one day to design and implement" | "less than 0.25 pm" |
| "new, large, cross-cutting features" — interrupts, ARM page tables and address spaces | "several pm" | "1.5-2 py to re-verify … reverification cost about 32% of the time previously invested in verification"; it "modified about 12% of existing Haskell code, added another 37%" |
| "fundamental changes to existing features" — reply capabilities created on the fly | code change "less than 5% of the total code base" | "about 1 py or 17% of the original proof effort" |

Two sentences from that section are worth carrying verbatim into REF-9's
design rationale (quoted):

> The new features required only minor adjustments of existing invariants,
> but led to a considerable number of new invariants for the new code.
> These invariants have to be preserved over the whole kernel API, not just
> the new features.

> Unsurprisingly, fundamental changes to existing features are bad news.

**The shape of the finding.** Cost does not track lines changed. It tracks
*how many invariants the change touches* and *how cross-cutting it is*.
The reply-capabilities case is the sharpest data point in the literature
for our purposes: under 5% of the code, 17% of the total proof effort.

### 1.2 The disincentive that a living model must budget for

Elphinstone and Heiser, *"From L3 to seL4: What Have We Learnt in 20 Years
of L4 Microkernels?"*, SOSP 2013, retrieved from
<https://sigops.org/s/conferences/sosp/2013/papers/p133-elphinstone.pdf>
(quoted; the sentence appears in the paper's discussion of multicore
support, in the paragraph beginning "One might argue that the notion of a
single, general-purpose kernel…" — I did not record its printed page
number):

> the formal verification of seL4 creates a powerful disincentive to
> changing the kernel

This is the sentence the estate's premise contradicts. It is not an
argument against a living model; it is the named failure mode a living
model has to engineer against, from the group with the most experience of
it.

### 1.3 Proof size is quadratic in *statement* size — and over-specification inflates the bill

Matichuk, Murray, Andronick, Jeffery, Klein and Staples, *"Empirical Study
Towards a Leading Indicator for Cost of Formal Software Verification"*,
ICSE 2015, retrieved from
<https://www.trustworthy.systems/publications/nicta_full_text/8318.pdf>.

Scale and headline result (quoted from the abstract):

> We present an empirical analysis of proofs from the landmark formal
> verification of the seL4 microkernel and the two largest software
> verification proof developments in the Archive of Formal Proofs.
> Together, these comprise 15,018 individual lemmas and approximately
> 215,000 lines of proof script. We find a consistent quadratic
> relationship between the size of the formal statement of a property, and
> the final size of its formal proof in the interactive theorem prover
> Isabelle.

The finding that matters for REF-1's layout is the *outlier analysis*
(quoted from the abstract):

> Investigation revealed that these outliers were caused by over-specified
> lemma statements (see Section III-E), with large constants mentioned
> unnecessarily, effectively inflating their statement size. To test this
> hypothesis, we defined an idealised measure for statement size that is an
> approximation of its minimum size. Using this measure greatly strengthens
> the relationship between statement size and proof size across all the
> projects, with R2 between 0.73 and 0.937.

And the mechanism, in their own words (quoted, §III-E):

> Most lemmas make stronger assumptions than are actually necessary. In
> particular, a lemma might have a concrete term where an abstract one will
> suffice … In cases where a constant with a large definition is included
> unnecessarily, we observe a large discrepancy between statement and proof
> size.

They also record the practitioner's reason it happens anyway (quoted):

> In practice, over-specificity can save effort in provers like Isabelle,
> as it can aid automated reasoning by simplifying higher order
> unification … Additionally it is not often worth the effort to generalise
> a lemma that will only be used once.

**Consequence for us.** *What a theorem quantifies over is a cost driver,
quadratically.* This turns REF-1's `stateBytes` content decision — which
draft 17 frames as a per-call performance question — into a proof-cost
question as well. See §5.3.

**Companion result, marked lead.** The same group's earlier ESEM 2014
paper (Staples, Jeffery, Andronick, Murray, Klein, Kolanski,
*"Productivity for proof engineering"*) is cited by both the ICSE 2015
paper and the QED survey as establishing a **linear** relationship between
proof effort in person-weeks and proof size in lines. I did not retrieve
that paper; the chain statement-size → (quadratic) → proof-size →
(linear) → effort is therefore **half quoted, half lead**.

### 1.4 Raft in Coq — 18 months to find the method, hours to apply it

Woos, Wilcox, Anton, Tatlock, Ernst and Anderson, *"Planning for Change in
a Formal Verification of the Raft Consensus Protocol"*, CPP 2016,
retrieved from
<https://homes.cs.washington.edu/~mernst/pubs/raft-proof-cpp2016.pdf>.

Scale (quoted): "This proof required iteratively discovering and proving 90
system invariants"; the new proofs "consist of about 45000 additional
lines".

The problem statement (quoted from the abstract):

> The primary challenge we faced during the verification process was proof
> maintenance, since proving one invariant often required strengthening and
> updating other parts of our proof.

The experience section gives the before/after (quoted, §8):

> We developed the methodology described in the preceding sections over a
> period of roughly 18 months. Before we applied our recommendations, we
> found that managing the complexity of the verification process led to
> slow progress, as we spent the majority of our time reworking proofs in
> response to changes.

And the measured payoff on a real post-verification change — reordering two
calls in the top-level event handler (quoted, §8):

> There are around 85 internal invariants and 5 external invariants in our
> development. Updating the decomposition (and thus fixing the 85 internal
> invariants all at once) required about 3 hours. Fixing the 5 external
> invariants required about the same amount of time, despite being about an
> order of magnitude fewer lines of code.

They label this honestly themselves (quoted): "This example is admittedly
somewhat of a best case".

**The 17× asymmetry is the finding.** 85 invariants behind a decomposition
lemma cost the same to repair as 5 invariants that were not. Structure, not
size, set the bill.

### 1.5 Cedar — a living Lean model shipped and maintained at AWS

Disselkoen et al., *"How We Built Cedar: A Verification-Guided Approach"*,
FSE Companion 2024, retrieved from <https://arxiv.org/pdf/2407.01688>
(CC BY 4.0).

Sizes, from their Table 1 (quoted values, in LOC): Lean model **1673**,
Lean proofs **5714**, Rust production **15693**, Rust tests **20458**.
Their own summary (quoted):

> Our total proof-to-model ratio is roughly 3.4 : 1 (see Table 1) … Our
> Lean proofs are fast to verify, and the models are fast to execute. It
> takes about 3 minutes to check all proofs and compile models for
> execution.

Bug yield (quoted): "While carrying out proofs, we found and fixed 4 bugs in
Cedar's policy validator, and DRT and PBT helped us find and fix 21
additional bugs in various parts of Cedar."

**Directly relevant to D-a/D-bc: AWS considered our exact lane and rejected
it, on maintenance grounds** (quoted, §1):

> One approach would be to develop Cedar entirely in Lean, compile to C,
> and deploy the generated C code in production. … A key benefit of this
> approach is that we would formally verify—rather than just test—the
> equivalence of the deployed code and model. But there are significant
> downsides to writing production applications in Lean and deploying its
> generated C code. Lean is a new programming language, so it has a limited
> developer pool and lacks useful libraries available in mainstream
> languages. Debugging a failure might necessitate stepping through the
> generated C code and mapping it back to the Lean source, requiring
> expertise in C and Lean. Doing so could be particularly difficult if the
> failure is due to an interaction between handwritten code and
> Lean-generated C code. In addition, C is a memory-unsafe language, so a
> bug in the Lean compiler could lead to security issues.

Read carefully, three of their four objections are about *writing the whole
product* in Lean — parsers, diagnostics, libraries, developer pool. REF-6's
kernel is a single pure step function over canonical bytes, not a product.
The objection that survives the narrowing is the fourth and the debugging
one: **a failure inside the generated artifact is debugged in generated
code**, and the Lean compiler is in the trusted base either way. That cost
belongs in VERIFICATION.md's REF-7 paragraph, and it is a maintenance cost,
not only a correctness one. It does not overturn D-a or D-bc; see §7.

### 1.6 What the QED survey adds

Ringer, Palmskog, Sergey, Gligoric and Tatlock, *"QED at Large"*,
Foundations and Trends in Programming Languages 5(2–3), 2019, preprint
retrieved from <https://arxiv.org/pdf/2003.06458>.

Its §7.2 names the general phenomenon (quoted, §6.2.3):

> A major source of inefficiency in verification is proof brittleness: Even
> a minor change to a single theorem or definition can break many dependent
> proofs.

And it supplies the summary judgement on seL4's layered design that we care
most about (quoted, §6.2.3):

> The proof development makes use of two layers of specifications: an
> abstract specification which describes only behavior of the system, and
> an executable specification which includes implementation details. These
> two layers are connected by a refinement proof. Using this approach, the
> authors found that both making low-level changes and adding new simple
> features were not very costly, though more complex changes that
> interacted with other parts of the code significantly were still costly.

That is precisely our REF-1 shape — abstract calculus, concrete wire model,
refinement equation between them — and the survey's verdict is that the
shape buys cheapness for the easy classes of change and does not rescue the
hard ones.

Its §7.2.1 also sets expectations for regression proving at scale (quoted):

> For large-scale projects, regression proving may require considerable
> machine time—from tens of minutes and hours up to several days.

Ours is 15–20 seconds (§3). That gap is the single biggest reason REF-9 is
tractable for us and was not for seL4.

---

## 2. Structural practices that measurably reduce propagation cost

### 2.1 The five recommendations from Planning for Change (quoted verbatim)

From Woos et al., CPP 2016:

> **Recommendation 1.** Hide the definitions of functions and types behind
> interfaces, and expose only the facts needed through lemmas in the
> interface.

> **Recommendation 2.** Factor out common inductive arguments into custom
> induction principles.

> **Recommendation 3.** Exploit relationships between system components to
> show that properties established for a particular component imply
> analogous properties for related components.

> **Recommendation 4.** Make proof scripts robust against renaming and
> reordering hypotheses by not relying on automatically generated
> hypothesis names and hypothesis ordering.

> **Recommendation 5.** Separate theorem statements from their proofs using
> interfaces.

Recommendation 5's rationale and measured effect (quoted, §7.2):

> In Coq, modifying a proof P causes all other proofs that depend on P to
> be rechecked, and in a large development, this has a significant cost in
> terms of developer time. We address this by separating theorems from
> their proofs, analogous to the way interfaces are separated from
> implementations in software engineering. … This approach cuts all
> dependencies between proofs, which allows proof checking to proceed
> completely in parallel after the interfaces have been typechecked. Since
> the proofs themselves take much longer to execute and check than the
> interfaces, this leads to radically faster build times (in our Raft
> development, this made rechecking proofs after edits over 100× faster).

They pair it with a CI obligation (quoted): "The final end-to-end check
ensures that no circular dependencies exist among the interfaces. … We have
found it useful to set up a continuous integration server to check the
end-to-end condition whenever a change is committed."

**Whether Recommendation 5's premise holds in Lean is checkable here, and I
checked it. See §3.1: it does.**

### 2.2 Cedar's Lean-specific stability rules (quoted verbatim)

`cedar-lean/GUIDE.md` from `cedar-policy/cedar-spec`, Apache-2.0, retrieved
2026-08-16 from
<https://raw.githubusercontent.com/cedar-policy/cedar-spec/main/cedar-lean/GUIDE.md>:

> ## Proof stability
> To make version upgrades easier, strive to follow these guidelines:
>
> - Use `simp only` instead of `simp`. It's okay to use `simp` to close a goal.
> - Use `have` to deconstruct values. Use `rcases` only to split disjunctions.
> - Use `exact` instead of `apply` whenever possible.
> - Fully spell out types in function and theorem declarations.

And, under "Theorem statements" (quoted):

> Minimize the use of explicitly named hypotheses, and use implications
> instead.

That last line is the Lean rendering of Woos Recommendation 4. This is a
production team's own written answer to "how do we keep a Lean model alive
across upgrades", from the same Lean version we are pinned to (their
`cedar-lean/lean-toolchain` reads `leanprover/lean4:v4.33.0`, retrieved
2026-08-16 — **ran**: I fetched the file and compared it to our
`verify/moves/lean-toolchain`, which reads the same string).

### 2.3 Cedar's layout: definitions and proofs in mirrored trees, with a lint

Directory listing retrieved via the GitHub API, 2026-08-16 (**ran**):

```
cedar-lean/Cedar/Spec/        Authorizer Entities Evaluator Expr Ext ExtFun
                              Policy Request Response Slice Template Value Wildcard
cedar-lean/Cedar/Validation/  EnvironmentValidator Levels RequestEntityValidator
                              Subtyping Typechecker TypedExpr Types Validator
cedar-lean/Cedar/SymCC/       …
cedar-lean/Cedar/Thm/         Authorization/ BatchedEvaluator/ Data/ PolicySlice
                              SymCC/ SymbolicCompilation TPE/ Tactics Typechecking
                              Validation/ Verification WellTyped/ WellTypedVerification
```

Definitions live under `Spec/`, `Validation/`, `SymCC/`; **all proofs live
under `Thm/`, in a tree that mirrors the definition tree**. Their README
states the split in prose (quoted): "Definitional engine
([`Cedar/Spec/`](Cedar/Spec/))" … "Verified properties — Basic
authorization theorems ([`Cedar/Thm/Authorization.lean`])".

The layout is not a convention; it is enforced. From
`cedar-lean/lakefile.lean` (quoted verbatim, Apache-2.0):

```lean
/--
Check that Cedar.Thm imports all top level proofs recursively.

USAGE:
  lake run checkThm
  lake lint
-/
@[lint_driver]
script checkThm do
  let exitCode ← checkThmFile "Cedar.Thm" [⟨"Cedar/Thm.lean"⟩, ⟨"SymCC.lean"⟩]
  return ⟨exitCode⟩
```

and their CI runs it as a step named "Lint for unchecked theorems"
(`.github/workflows/ci.yml`, quoted: `run: source ~/.profile && lake lint`).

This is the same species as our orphan rule in `verify/moves/run.sh`: a
mechanical guard that a proof file cannot be silently orphaned from the
gate. Two independent teams arrived at it.

### 2.4 Proof-repair tooling: real for Coq, absent for Lean

The QED survey's §7.2.3 describes the proof-repair line, and PUMPKIN PATCH
/ PUMPKIN Pi (Ringer et al.) are real, MIT-licensed Coq plugins —
<https://github.com/uwplse/PUMPKIN-PATCH>, <https://github.com/uwplse/pumpkin-pi>
(licence field checked via the GitHub API, 2026-08-16).

**Absence finding.** Searching on 2026-08-16 for a Lean 4 equivalent — by
the terms *"Lean 4 proof repair tool"*, *"automated proof maintenance Lean
4"*, *"mathlib port breakage tooling"*, *"PUMPKIN PATCH Lean port"* —
returned no primary source: only LLM-assistant marketing pages. **No
established Lean 4 proof-repair tool was found.** REF-9 must therefore
plan on manual repair plus prevention-by-structure, not on tooling.

---

## 3. Executed measurements on this machine

Both reproductions are committed and replayable:
`docs/research/reference/rq8-proof-maintenance/{lean-rebuild-propagation,proof-edit-artifact-stability}/run.sh`.

### 3.1 A proof-body edit propagates a rebuild downstream in Lean 4.33.0 (ran)

Minimal project: `Exp/A.lean` states and proves `foo`; `Exp/B.lean` imports
it and uses only `foo`'s *statement*. Editing only `foo`'s proof body:

```
== build 1 (proof of foo: 'by simp') ==
A.olean 2d4ced4c87d2c9e0dac977313fb6c36cce9266a0fc127ac7adc9682e9c661eeb
B.olean 0f0d322aa5aa4eb5cb14cec2fe58ccf8d056735bcc5a8bc12ca01d0990180bbb
== edit: proof body ONLY (statement line untouched) ==
== build 2 ==
✔ [2/5] Built Exp.A (582ms)
✔ [3/5] Built Exp.B (577ms)
A.olean 231d9e18bc2456862314a9cfd563e303b0f018ffe145b09c8dcaf33ccedbe776
B.olean 8eb7b8803f24866673f408f92b8d7fb33b8d8c3587673e04cc777184876e37aa
== verdict ==
DOWNSTREAM olean CHANGED: a proof-body edit propagates a rebuild downstream.
```

The same session tried Lean 4.33.0's module system, which the toolchain
accepts (`module` / `public theorem` / `public import`; build products split
into `.olean`, `.olean.private`, `.olean.server`). Result table, all three
variants:

| variant | downstream rebuilt? | downstream `.olean` changed? |
| --- | --- | --- |
| classic (no `module` header) | yes | yes |
| `module` + `public import` | yes | yes |
| `module` + private `import` | yes | yes |

**Scope of the claim.** This establishes that proof-body isolation is *not
obtained by default* under Lean 4.33.0 / Lake 5.0.0-src+d8b1897 with these
constructs. It does not establish that no option or attribute achieves it.
Woos Recommendation 5 therefore has a real target in Lean, but the
mechanism available to us is **module partitioning**, not a Coq-style
interface trick.

### 3.2 The current `verify/moves` graph makes every proof edit reach the corpus generator (ran)

Composition at commit `e9fe0a3be`:

| file | definitions | `theorem`s | lines |
| --- | --- | --- | --- |
| `Moves/Model.lean` | 42 | 94 | 1961 |
| `Moves/Spec.lean` | 34 (`Prop`-valued statements) | 1 | 175 |
| `Moves/SpecProofs.lean` | 0 | 14 | 143 |
| `Moves/SpecDischarge.lean` | 0 | 1 | 45 |
| `Moves/Violations.lean` | 11 | 5 | 361 |

Import graph:

```
Moves/Model.lean ──┬─→ Moves/Spec.lean → SpecProofs.lean → SpecDischarge.lean
                   └─→ Moves/Violations.lean
Moves.lean = Model + Violations + SpecDischarge
Oracle/Instance.lean → Moves   (hence transitively → all 94 proofs in Model.lean)
Oracle/{Codec,Gen}.lean → Oracle/Instance.lean ; Main.lean → Oracle/*
```

**The Spec layer already implements Woos Recommendation 5, independently.**
`Spec.lean` holds statements as `Prop`-valued definitions and one theorem;
`SpecProofs.lean` holds the proofs; `SpecDischarge.lean` conjoins them.
`run.sh` sha256-pins `Spec.lean` so statement drift is a gate failure. That
is Recommendation 5 plus a freeze the paper does not have.

**`Model.lean` does not.** 42 definitions and 94 theorems share one
1961-line module, and the corpus generator imports it whole.

### 3.3 Wall clock (ran)

| operation | wall clock |
| --- | --- |
| cold `lake build`, clean `.lake` | 15.0 s (a second cold run: 20.1 s) |
| no-op `lake build` | 0.25 s |
| rebuild after a content change to `Moves/Model.lean` | 4.2 s |
| rebuild after a content change to `Moves/Violations.lean` | 1.1 s |
| rebuild after a proof-body edit inside `Model.lean`, incl. re-emitting the corpus | 10.3 s |

Compare §1.6: QED reports "tens of minutes and hours up to several days"
for large developments; Cedar reports "about 3 minutes". We are two to
three orders of magnitude below the regime the literature's mitigations
were designed for. **This is the decisive local fact for REF-9's design:
selection, caching and staging are premature for us; we can afford to
re-prove everything on every commit.**

### 3.4 Proof churn does not perturb the generated artifact (ran) — the load-bearing result for REF-6

Patch: a vacuous `have _rq8probe : True := trivial` inserted into the proof
of `no_loss` in `Model.lean`. Statement line byte-identical. Result:

```
== rebuild (timed) ==
✔ [12/23] Built Moves ✔ [15/23] Built Oracle.Instance
✔ [17/23] Built Oracle.Codec ✔ [18/23] Built Oracle.Gen ✔ [21/23] Built Main
real	0m10.255s
corpus digest before: 37ead01ea48e6c1508ce44deb87bee48a615a7ab8f0dbafd7f83b08cd59284cf
corpus digest after:  37ead01ea48e6c1508ce44deb87bee48a615a7ab8f0dbafd7f83b08cd59284cf
== verdict ==
GENERATED C: byte-identical across the proof edit
CORPUS: byte-identical across the proof edit
```

Every generated `.c` under `.lake/build/ir` was regenerated (mtimes
advanced past the source edit) and every one was byte-identical. Lean
erases proofs before code generation.

**Three consequences, stated plainly.**

1. REF-6's byte-identical regeneration gate will **not** false-alarm on
   proof churn. Proof maintenance and artifact identity are independent
   axes.
2. Symmetrically, the regeneration gate **cannot detect proof breakage**.
   D-e's obligations 1 and 3 are genuinely independent gates; neither
   subsumes the other. This is now measured, not assumed.
3. The §5.2 module-partition recommendation's payoff is therefore **build
   time only**, not artifact stability. I state this because the naive
   version of the recommendation — "split proofs out so the kernel does not
   churn" — is *false here*, and a recommendation sold on a false benefit
   is worse than none.

---

## 4. Has anyone built REF-9's loop?

REF-9's loop is: a specification change mechanically forces regeneration
and re-proof of *everything* downstream, in one gated chain, with a
demonstrated negative control. Three projects come close in different
directions. None does the whole thing.

### 4.1 Cedar — closest on the chain, but no generation step

`.github/workflows/ci.yml` in `cedar-policy/cedar-spec` (Apache-2.0,
retrieved 2026-08-16) fires on `pull_request` and runs, in order (quoted
step names): "Build proofs" (`lake build Cedar SymCC`) → "Lint for
unchecked theorems" (`lake lint`) → "Build libs" (`lake build Cedar:static
Protobuf:static CedarProto:static Cedar.SymCC:static DiffTest:static
CedarFFI:static`) → "Run unit tests" → DRT → corpus-generation test → FFI,
CLI, integration and benchmarking jobs.

The cross-repository pin is the part worth stealing: `build_and_test_drt_reusable.yml`
checks out `cedar-policy/cedar` at `ref: ${{ inputs.cedar_policy_ref }}`,
which `ci.yml` sets to the pull request's base branch. Model and
implementation are pinned to each other by construction, so a model change
is tested against the matching implementation rather than against `main`.

**What Cedar does not do:** the Rust implementation is hand-written. The
chain is *differential*, not *generative*. There is no "model change forces
artifact regeneration" edge, because there is no generated artifact.

Their tiering (quoted, FSE 2024 §4.3) is the second thing worth stealing:

> We use Amazon's Elastic Container Service (ECS) to test our properties
> daily on currently supported Cedar versions. We allocate 4096 CPU units
> (4 vCPUs) and 8GB memory to fuzz each target for 6 hours.

with, per §4 (quoted): "With each version of Cedar, we save a minimized set
of corpus tests generated by cargo-fuzz to use as part of continuous
integration testing". Cheap saved corpus on every PR; six-hour fuzz daily.

### 4.2 HACL\*/EverCrypt — has the generation step, does not gate it

`hacl-star/hacl-star` (Apache-2.0, retrieved 2026-08-16) commits its
KaRaMeL-generated C under `dist/` and its F\* SMT hints under `hints/` (the
`hints` directory returns 1000 entries from the contents API, i.e. at least
that many).

- `.github/workflows/dist.yml` runs on every push and PR to `main` and
  invokes `.ci/script.sh`, which `./configure`s and `make`s the **committed**
  `dist/gcc-compatible` tree and runs its tests. It does not re-derive
  `dist/` from the F\* sources.
- Regeneration is `.github/workflows/hintsanddist.yml`, whose trigger is
  (quoted) `schedule: - cron: '0 0 * * 0'` — **weekly** — on a self-hosted
  runner. It `nix build`s the artifacts, `git rm -r hints dist/*/*`,
  unpacks the fresh ones, commits as "Hacl Bot", asserts the diff is
  non-trivial, and opens a pull request.

**The finding, stated as a warning.** The field's flagship
verified-model-to-C-in-production project does **not** gate every commit on
byte-identical regeneration of its generated artifact. It commits the
artifact, tests the committed artifact per PR, and refreshes it weekly by
bot PR. Whatever their reasons — plausibly the cost of a full F\*
verification run, which `nix.yml` puts on a self-hosted runner — the
precedent for REF-6's per-commit regeneration gate is **not** HACL\*. Our
justification for a stricter gate has to be our own 15-second build (§3.3),
and it is a good justification precisely because our numbers are what
theirs are not.

### 4.3 seL4/l4v — proofs as a per-PR gate, with an explicit exclusion

`.github/workflows/proof.yml` in `seL4/l4v` (retrieved 2026-08-16;
repository licence is per-file REUSE/SPDX, mixed GPL-2.0 and BSD-2-Clause —
nothing copied here). It triggers on `pull_request_target`, matrixes over
`[ARM, ARM_HYP, AARCH64, RISCV64, X64]`, and runs the
`seL4/ci-actions/aws-proofs` action with `skip_dups: true`, a cache bucket,
and — quoted — `session: '-x AutoCorresSEL4' # exclude large AutoCorresSEL4
session for PRs`.

**The lesson is the exclusion.** Even with AWS hardware and a shared cache,
the largest proof session is deliberately outside the PR gate. Gate scope is
a budget decision that the strongest project in the field makes explicitly
and in public.

### 4.4 The absence

Searching the above three plus the QED survey's §7.2 and §7.4, **I found no
published project that gates a build on a chain of the form "specification
edit ⇒ proofs re-run ⇒ downstream artifact regenerated ⇒ regenerated
artifact byte-compared ⇒ consumers rebuilt", and no published report of
what such a chain costs to operate.** Cedar has the chain without the
generation; HACL\* has the generation without the gate; l4v has the proofs
without a generated deployment artifact. REF-9 would be, as far as this
survey reaches, novel — and the novelty is in the *gating*, not in any
individual link.

---

## 5. Concrete recommendations for `verify/moves/` and the REF-1 wire model

Every recommendation states its cost, what it adds to the trusted base, and
what reversal takes.

### 5.1 R1 — Wire-model home: **one Lake package, `Moves.Wire` namespace**, not `verify/wire/`

**The recommendation.** Put the wire model inside the existing
`verify/moves` package under a `Moves.Wire` namespace and a `Moves/Wire/`
directory. Do not create a second Lake package.

**Why, from evidence rather than taste.**

1. The usual reason to split packages is build isolation. §3.3 measures that
   reason away: 15 s cold, 4.2 s for a `Model.lean` edit. There is no build
   cost to isolate.
2. The gates are per-package artifacts. `run.sh` holds one frozen-spec
   sha256 pin, one axiom-footprint roster, one orphan rule, one corpus
   regeneration check, and one `lake build`. D-e obligation 1 requires the
   refinement equation to be *footprint-clean* — i.e. inside the same
   `#print axioms` sweep as the abstract laws. Splitting packages splits
   that sweep into two, and a federated footprint gate is a new mechanism
   whose failure mode is silence. Cedar keeps model, proofs, FFI, protobuf
   and test executables in a **single** `cedar-lean` package with multiple
   `lean_lib` targets (§2.3), and drives them all from one `lake lint` and
   one CI job.
3. Cedar's own README records the recurring cost of a second package
   (quoted): "To change the version of Lean used, you will need to update
   three files: `lean-toolchain` … `lakefile.lean` … `lake-manifest.json`".
   A second package doubles that, forever, for a living model.

**Cost.** One package grows to hold two layers; the directory listing gets
longer; a future contributor cannot build the wire model without building
the calculus (which takes 15 s).

**Trusted-base delta.** None. Same toolchain, same `lakefile`, same gate
script.

**Reversal.** Extracting `Moves/Wire/` into `verify/wire/` later is
mechanical: a new `lakefile.toml` with a path `require` on `moves`, a
`lean-toolchain` copy, and splitting the `run.sh` roster and pins in two.
It is cheap while the wire model is small and gets steadily more expensive
once REF-6 targets it. The asymmetry is real but modest; the merged
direction is the one whose costs are measured rather than assumed.

### 5.2 R2 — Partition every layer into `Defs` / `Laws` / `Proofs` modules, and gate the partition

**The recommendation.** Adopt this shape, for the new wire layer
immediately and for `Model.lean` as a follow-on:

```
Moves/
  Model.lean                     -- (today: 42 defs + 94 theorems, 1961 lines)
  Spec.lean / SpecProofs.lean    -- already statement/proof split, Spec sha-pinned
  Wire/
    Defs.lean         -- session state, wire ops, close, digest recipe. NO theorem.
    Translate.lean    -- translate, translateOp. NO theorem.
    Divergence.lean   -- the typed divergence enumeration (inductive), count pinned
    Laws.lean         -- the refinement equation's STATEMENT. Frozen + sha-pinned.
    Proofs.lean       -- the proofs of Laws.lean
  Wire.lean           -- imports all of the above
```

with one mechanically checked invariant, added to `run.sh` beside the
orphan rule:

> **The generation rule.** Any module that the corpus generator or the
> REF-6 kernel root imports must be a `Defs`/`Translate` module, and no
> `Defs`/`Translate` module may contain a `theorem`.

Both halves are greppable exactly as the existing orphan rule is: check the
`import` lines of `Oracle/Instance.lean` and the kernel root against an
allowlist, and `grep -c '^theorem '` the `Defs` modules for zero.

**Why.** §3.1 (ran) shows a proof edit forces downstream rebuilds; §3.2
(ran) shows the corpus generator currently sits downstream of all 94
`Model.lean` proofs; Woos Recommendation 5 (quoted) is exactly this split
and reports a 100× rebuild improvement in Coq; Cedar realises the same
split as `Spec/` versus `Thm/` (§2.3) and enforces it with `lake lint`.

**What it does NOT buy — stated so the recommendation is not oversold.**
Per §3.4 (ran), proof churn already leaves the generated C and the corpus
byte-identical. This partition buys *build time* and *blast-radius
legibility*: a reviewer can see from the import graph that a proof edit
cannot reach the kernel. It does not buy artifact stability, because we
already have that.

**Cost.** More files; a rule that new contributors can trip over; a
one-time refactor of `Model.lean` that will churn `gate-exclusions.txt` and
the roster. The `Model.lean` half should be a separate, gated commit whose
acceptance is "corpus regenerates byte-identically" — a mechanical proof
that the move changed nothing, exactly as REF-1's promotion gate is already
specified.

**Trusted-base delta.** None. Two more grep-level gate steps, which
*shrink* what is taken on trust.

**Reversal.** Concatenating modules back is mechanical and safe; deleting
the two gate steps is a one-line edit each. Cheap in both directions.

### 5.3 R3 — Treat `stateBytes` content as a proof-cost decision, not only a performance one

Draft 17 frames REF-1's `stateBytes` split — journal in, or journal
host-owned and out — as a per-call cost question, with the spike's
payload-size curve as the evidence.

§1.3 adds a second, independent argument for the same answer. Matichuk et
al. find proof size quadratic in statement size, and find that the dominant
source of inflated statements is **mentioning constants and structure a
lemma does not need**. The refinement equation

```
translate (wireStep s op) = modelStep (translate s) (translate op)
```

quantifies over whatever `s` contains. A journal inside `s` puts an
unbounded, append-only list inside the object every wire theorem ranges
over, and inside `translate`'s domain. Every future law about the wire
layer then carries it.

**Recommendation.** Keep the journal host-owned and outside `stateBytes`,
and record *this* — statement minimality — as a stated reason beside the
per-call cost curve, so the decision has two independent supports rather
than one.

**Cost.** The host owns more; the kernel cannot make journal-dependent
decisions, so any future law that genuinely needs journal history requires
either widening `stateBytes` (re-opening this decision, with the quadratic
bill attached) or a separate observation function.

**Trusted-base delta.** Slightly larger host responsibility — the
append-only journal is outside the proved object and stays policed by the
oracle and corpus. This must be named in VERIFICATION.md's REF-7 paragraph.

**Reversal.** Widening `stateBytes` later is a statement change to a frozen,
sha-pinned file plus re-proof of everything that quantifies over state.
Expensive by design; that is the point of freezing it.

### 5.4 R4 — Freeze the refinement equation's statement the way `Spec.lean` is frozen

Draft 17's REF-3 already says the equation's statement file is Rev-frozen
and sha256-pinned. R2's layout makes that mechanical: `Wire/Laws.lean`
contains statements only, so its hash changes if and only if a statement
changes. Today `Spec.lean` mixes 34 statement definitions with local
notation and section variables; a `Laws.lean` that contains nothing but
statements is a cleaner freeze target.

**Cost.** A second sha pin in `run.sh` to re-pin on every ratified change;
one more place a legitimate change is deliberately made annoying.

**Trusted-base delta.** None; it subtracts from what is trusted.

**Reversal.** Delete the pin. Trivial, and therefore worth watching: the
pin is only as strong as the ratification discipline around re-pinning it.

### 5.5 R5 — Keep the gate single-tier for now, and record the threshold at which it splits

Cedar (§4.1) and l4v (§4.3) both run a cheap per-PR tier and push expense
elsewhere — daily ECS fuzzing, an excluded `AutoCorresSEL4` session. We are
at 15–20 s (§3.3). Splitting the gate now would add machinery for a problem
we do not have, and staged gates are exactly where a "green" that checked
nothing hides.

**Recommendation.** One blocking tier for REF-1 through REF-6. Pre-register
the split threshold now, so the decision is not made under deadline
pressure later: **when the single-command gate exceeds five minutes on the
designated build platform, split the exhaustive corpus and the kernel
regeneration into a nightly tier, and keep proofs, footprint, pins and
orphan/generation rules blocking.**

**Cost.** At some future point a commit will be slower than it needed to
be. That is the intended trade.

**Trusted-base delta.** None.

**Reversal.** Splitting later is additive. The pre-registered threshold is
what makes it a decision rather than a drift.

### 5.6 R6 — Adopt Cedar's stability rules as house style for the wire layer

`verify/moves/README.md` and `DECISIONS.md` already carry house discipline.
Add the four `simp only` / `have` / `exact` / spelled-out-types rules from
Cedar's GUIDE.md (§2.2, quoted verbatim there) plus Woos Recommendation 4's
Lean form ("minimize explicitly named hypotheses"). Cite them as house
laws, not as decision numbers, per the estate's comment-style ruling.

**Cost.** Proof scripts get slightly longer and slightly less convenient to
write.

**Trusted-base delta.** None.

**Reversal.** Style guidance; reversible by editing one file. Worth noting
it is *not* mechanically gated and should not pretend to be — an
ungated style rule that CI appears to check is exactly the anti-pattern
RQ-5 is hunting.

---

## 6. REF-9's negative control: design

### 6.1 The estate already holds the pattern

`verify/moves/Moves/Spec.lean` contains (quoted from the repository):

```lean
/-- The pre-D85 repair semantics, frozen verbatim as the canonical mutant. -/
def legacyRepair (s : State) : Mv → Option State
```

and `Moves/SpecProofs.lean` proves `spec_mutant_legacy_killed_by_L1`,
`spec_mutant_legacy_killed_by_L2` and `spec_mutant_refuseAll_killed`, all
three rostered in `run.sh`'s axiom-footprint check and conjoined by
`spec_discharged`.

This is a **mutant-as-theorem** design: the law-breaking variant lives in
the estate as a named definition, and what is committed is a *proof that it
violates a named law*. There is no sabotage machinery, no disabled test, no
flag that could be flipped. The mutant is evidence, not a hazard.

### 6.2 Recommended design for REF-9's negative control

Two controls, one committed and one recorded, because REF-9's chain has
both a model half and an artifact half.

**Control A — the model-level mutant, committed as a theorem.** Extend the
existing pattern to the wire layer. The chosen law-breaking edit (draft 17's
candidate class: a no-loss-violating step) is defined in `Wire/Laws.lean` as
`wireStepMutant`, and `Wire/Proofs.lean` carries
`wire_mutant_violates_no_loss : ¬ (refinement equation holds for wireStepMutant)`.
Rostered, footprint-clean, permanently in the estate. This is what makes
the negative control **replayable** rather than anecdotal, which is the
gate REF-9 needs: a committed artifact that replays.

Cost: the mutant definition sits in the frozen statement file, so its hash
is pinned with the rest — a change to the mutant is a ratified change like
any other. Trusted base: unchanged. Reversal: delete the definition and its
theorem and re-pin.

**Control B — the chain-level sabotage, run on a throwaway branch and
recorded as a transcript, never merged.** Take the actual law-breaking
source edit, commit it on a branch that is created and deleted within the
runbook, run the runbook's commands, and record the transcript — command,
nonzero exit code, the refusing gate's message — into
`docs/research/reference/` beside the runbook, together with the branch's
commit sha and the date. The branch does not survive; the transcript and
the sha do.

Cost: the transcript is only as good as its honesty, since the branch is
gone; it must record the exact command and the exact exit code, and the
runbook must name the branch-creation step so a reader can reproduce it.
Trusted base: unchanged. Reversal: n/a.

**Why two.** Control A proves the *model* refuses the law-breaking
semantics, permanently and mechanically, with no sabotage left behind.
Control B demonstrates the *chain* refuses the law-breaking edit — which is
a different claim, since a chain can be correct in the model and still have
a gate that does not run. Neither substitutes for the other. Committing
only A would be the anti-pattern of §4's warning: a check that appears to
cover the chain and covers only the model.

**What to avoid, named.** Do not add a permanent `SABOTAGE=1` environment
switch, a `--mutate` flag, or a commented-out mutant in the gate script.
Each is a live path by which a green build can be produced from a broken
model, which is the precise inverse of the standing law REF-9 exists to
install.

---

## 7. Decision impact

Nothing here reverses a ratified decision. Three items are flagged for the
operator.

1. **D-bc / D-a acquire a documented dissent, not a refutation (§1.5).** AWS
   explicitly considered "develop entirely in Lean, compile to C, deploy the
   generated C" and rejected it. Three of their four reasons dissolve under
   our narrower scope — a pure step function, not a product. The surviving
   one, "debugging a failure might necessitate stepping through the
   generated C code and mapping it back to the Lean source", is a real
   maintenance cost that the REF-0 record's cost paragraph does not name.
   Recommend it be added to the D-bc costs and to VERIFICATION.md's REF-7
   trusted-base paragraph. **This is an addition to a stated cost, not a
   change of lane.**
2. **REF-1's `stateBytes` decision gains a second, independent support
   (§5.3).** Not a change of scope; a strengthening of an argument that
   draft 17 currently rests on performance alone.
3. **Amendment 7's open question is answerable (§5.1):** one package,
   `Moves.Wire` namespace, on measured build cost and gate topology. This
   report supplies the evidence the amendment said REF-1 dispatch would be
   informed by; the decision remains the operator's at REF-1 dispatch.

---

## 8. What the surveyed material does NOT answer for our seam

Named, not glossed.

1. **No published cost data exists for a chain that regenerates a deployed
   artifact under a proof gate (§4.4).** seL4's numbers are proof-repair
   costs with no artifact generation in the loop. HACL\* generates but does
   not gate. Cedar gates but does not generate. **We will be the first to
   learn what REF-9's cycle costs, and the estate should expect to publish
   that number rather than cite one.**
2. **The seL4 change-class figures do not transfer numerically.** They are
   person-months against a 10,000-line kernel with 480,000 lines of proof.
   Our model is 2,950 lines. The *ordering* of the classes — local cheap,
   independent-feature moderate, cross-cutting expensive, fundamental worst
   — is what transfers. Any use of "17%" or "32%" as a foldlab budget would
   be a misuse of the source.
3. **The quadratic law is Isabelle-only and lemma-level.** Matichuk et al.
   measured Isabelle proof developments. Nothing was found measuring the
   same relationship in Lean 4, and their own "idealised statement size" is
   (their word) undecidable in general and approximated. We should treat
   "minimise what statements quantify over" as sound engineering advice with
   quantitative support in a neighbouring prover, not as a law we can
   compute against our own sources.
4. **No source addresses proof maintenance across a *language boundary*.**
   Our Gap 2 — the Lean model to the running Go and TypeScript daemons — has
   no published maintenance-cost literature at all. Cedar's DRT is the
   closest analogue and it maintains a hand-written implementation, not a
   generated one. The cost of a model change propagating through
   emscripten, wazero and Bun is unmeasured anywhere I could find.
5. **Nothing found measures the cost of maintaining a *frozen, sha-pinned
   statement* discipline.** Our `Spec.lean` pin and the proposed
   `Wire/Laws.lean` pin have no precedent I located with published
   experience. The risk they carry — that re-pinning becomes routine and
   the freeze becomes theatre — is unaddressed by any source here, and is a
   process risk that only the estate's own ratification discipline covers.
6. **No Lean 4 proof-repair tooling exists to plan around (§2.4).** The Coq
   line is real and MIT-licensed; nothing equivalent was found for Lean.
   REF-9's repair budget is manual.
7. **The `module`-system question is not closed (§3.1).** I established
   that proof-body isolation is not the default under Lean 4.33.0 with the
   constructs tried. Whether some attribute, option, or a later Lean release
   provides it is unknown, and if it does, R2's build-time justification
   weakens (its blast-radius-legibility justification does not).
8. **Nothing here bears on how often the operator will actually change the
   model.** Every cost figure in this report is per-change. The annual bill
   is per-change cost times change frequency, and no source, including this
   estate's own history, gives us the second factor yet.

---

## 9. Source ledger

| # | Source | Retrieved | Grounding |
| --- | --- | --- | --- |
| 1 | Klein et al., TOCS 32(1):2, 2014 — <https://trustworthy.systems/publications/nicta_full_text/7371.pdf> | 2026-08-16 | quoted (§7.4, abstract) |
| 2 | Elphinstone & Heiser, SOSP 2013 — <https://sigops.org/s/conferences/sosp/2013/papers/p133-elphinstone.pdf> | 2026-08-16 | quoted |
| 3 | Matichuk et al., ICSE 2015 — <https://www.trustworthy.systems/publications/nicta_full_text/8318.pdf> | 2026-08-16 | quoted (abstract, §III-E) |
| 4 | Woos et al., CPP 2016 — <https://homes.cs.washington.edu/~mernst/pubs/raft-proof-cpp2016.pdf> | 2026-08-16 | quoted (Recs 1–5, §7.2, §8) |
| 5 | Ringer et al., QED at Large — <https://arxiv.org/pdf/2003.06458> | 2026-08-16 | quoted (§6.2.3, §7.2, §7.2.1) |
| 6 | Disselkoen et al., FSE Companion 2024 — <https://arxiv.org/pdf/2407.01688> (CC BY 4.0) | 2026-08-16 | quoted (§1, §3.2, §4, §4.3, Table 1) |
| 7 | `cedar-policy/cedar-spec` (Apache-2.0) — lakefile, GUIDE.md, lean-toolchain, ci.yml, DRT workflow, `Cedar/{Spec,Thm}` trees | 2026-08-16 | quoted + ran (API/raw fetches) |
| 8 | `hacl-star/hacl-star` (Apache-2.0) — dist.yml, hintsanddist.yml, nix.yml, `.ci/script.sh` | 2026-08-16 | quoted + ran |
| 9 | `seL4/l4v` (per-file REUSE/SPDX) — proof.yml, pr.yml, LICENSE.md | 2026-08-16 | quoted + ran |
| 10 | `uwplse/PUMPKIN-PATCH`, `uwplse/pumpkin-pi` (MIT) | 2026-08-16 | ran (licence field via API) |
| 11 | This machine: Lean 4.33.0 / Lake 5.0.0-src+d8b1897; `verify/moves` at `e9fe0a3be` | 2026-08-16 | ran (§3, both reproductions committed) |
| 12 | Staples et al., ESEM 2014, "Productivity for proof engineering" | not retrieved | **lead** — cited by sources 3 and 5 for the linear effort↔proof-size relationship |

---

## Independent verification — 2026-08-16

Adversarial re-check by a second seat, same machine, same day. Every primary
source below was **re-fetched independently** (not read from the researcher's
notes): six PDFs pulled fresh and extracted with `pdftotext`, seven raw files
pulled from `raw.githubusercontent.com`, five GitHub contents/licence queries
via `gh api`. Both committed reproductions were re-run from a clean shell, and
three measurements the report asserts without a committed transcript were
re-derived from scratch. Findings before fixes: the body above is untouched.

### Claim-by-claim verdicts

| # | Claim (report §) | Source | Verdict | Evidence |
| --- | --- | --- | --- | --- |
| 1 | seL4 change-class costs: 0.25 pm; 1.5–2 py / 32%; <5% code → 1 py / 17%; "We are not able to quantify such costs" (§1.1) | Klein et al., TOCS 32(1):2 PDF | **CONFIRMED** | §7.4 extracted verbatim; every figure and both carried sentences ("…minor adjustments of existing invariants…", "Unsurprisingly, fundamental changes to existing features are bad news.") match byte-for-byte |
| 2 | "only evolving formally-verified code base … 480 000 lines of Isabelle proofs" (§1.1) | same | **CONFIRMED** | Abstract, extracted lines 172–174 |
| 3 | Elphinstone & Heiser: "the formal verification of seL4 creates a powerful disincentive to changing the kernel" (§1.2) | SOSP 2013 PDF | **CONFIRMED** | Verbatim; paragraph beginning "One might argue…" as stated. **Printed page 143** (PDF page 11) — the number the report says it did not record |
| 4 | Matichuk et al.: 15,018 lemmas / ~215,000 lines / consistent quadratic relationship (§1.3) | ICSE 2015 PDF | **CONFIRMED** | Abstract verbatim |
| 5 | Outliers caused by "over-specified lemma statements"; idealised measure raises R² to 0.73–0.937 (§1.3) | same | **CONFIRMED** | Abstract verbatim |
| 6 | §III-E mechanism quotes ("Most lemmas make stronger assumptions…", "In practice, over-specificity can save effort…") (§1.3) | same | **CONFIRMED** | Both verbatim in §III-E; the report's ellipses elide only the "1 is odd / 2n+1 is odd" example and one clause |
| 7 | Staples et al. ESEM 2014 linear effort↔proof-size relationship, marked **lead** (§1.3) | not retrieved | **UNVERIFIABLE** | I did not retrieve it either. Note: the ICSE 2015 paper states it in its own introduction — "In prior work [11] … a strong linear relationship between effort (in person-weeks) and proof size" — so the lead is corroborated at one remove by a source the report *did* retrieve. The "lead" tag is honest but more conservative than the evidence in hand |
| 8 | Woos et al. Recommendations 1–5 quoted verbatim (§2.1) | CPP 2016 PDF | **CONFIRMED** | All five match the paper word for word, including Rec 5 "Separate theorem statements from their proofs using interfaces." |
| 9 | Rec 5 rationale + "over 100× faster"; the end-to-end / CI obligation (§2.1) | same | **CONFIRMED** | §7.2 verbatim; the PDF renders the multiplication sign as a replacement glyph, so "100×" is the correct reading |
| 10 | 85 internal vs 5 external invariants, ~3 hours each; "admittedly somewhat of a best case" (§1.4) | same | **CONFIRMED** | §8 verbatim, including the "order of magnitude fewer lines of code" clause |
| 11 | 90 system invariants; ~45000 additional lines; the abstract's proof-maintenance sentence; "roughly 18 months" (§1.4) | same | **CONFIRMED** | Abstract, §1, §8 |
| 12 | Cedar team considered and rejected "develop Cedar entirely in Lean, compile to C, and deploy the generated C code in production", with four downsides and the acknowledged benefit (§1.5) | arXiv:2407.01688 | **CONFIRMED** | §1 paragraph extracted verbatim; all four downsides and "we would formally verify—rather than just test—the equivalence" present exactly as quoted |
| 13 | Cedar Table 1 LOC 1673 / 5714 / 15693 / 20458; "roughly 3.4 : 1"; "about 3 minutes"; 4 + 21 bugs (§1.5) | same | **CONFIRMED** | Table 1 totals column, §3.2, abstract |
| 14 | Cedar §4.3 ECS: 4096 CPU units / 8GB / 6 hours daily; minimized corpus per version (§4.1) | same | **CONFIRMED** | §4.3 and §4 verbatim |
| 15 | QED at Large: proof-brittleness sentence; the seL4 two-layer summary judgement; "tens of minutes and hours up to several days" (§1.6) | arXiv:2003.06458 | **CONFIRMED** | First two in §6.2.3, third in §7.2.1 — the report's parenthetical section attributions are right |
| 16 | cedar-spec pins Lean 4.33.0, same as foldlab (§2.2) | raw `cedar-lean/lean-toolchain` | **CONFIRMED** | Fetched: `leanprover/lean4:v4.33.0`; `verify/moves/lean-toolchain` is the identical string |
| 17 | `@[lint_driver] script checkThm` block, quoted verbatim (§2.3) | raw `cedar-lean/lakefile.lean` | **CONFIRMED** | Lines 90–100 match the report's code block exactly, doc-comment included. Single `package Cedar` with nine `lean_lib` and three `lean_exe` targets, as §5.1 claims |
| 18 | CI step "Lint for unchecked theorems" runs `lake lint`; order Build proofs → lint → Build libs → unit tests (§2.3, §4.1) | raw `.github/workflows/ci.yml` | **CONFIRMED** | Lines 40–71; trigger is `pull_request` |
| 19 | `Cedar/{Spec,Validation,SymCC,Thm}` layout, proofs mirrored under `Thm/` (§2.3) | GitHub contents API | **CONFIRMED** | Listings match the report's tree exactly. Independently: all seven `Cedar/Spec/*.lean` files I sampled contain zero `theorem`/`lemma` declarations |
| 20 | Cedar GUIDE.md "Proof stability" four rules + "Minimize the use of explicitly named hypotheses" (§2.2) | raw `cedar-lean/GUIDE.md` | **CONFIRMED** | Lines 37–41, 65–71 verbatim |
| 21 | Cedar README "three files" toolchain-upgrade cost; "Definitional engine" / "Verified properties" split (§2.3, §5.1) | raw `cedar-lean/README.md` | **CONFIRMED** | Lines 31–35, 43, 60–62 |
| 22 | DRT cross-repo pin: `ref: ${{ inputs.cedar_policy_ref }}`, set to the PR's base branch (§4.1) | raw `build_and_test_drt_reusable.yml` + `ci.yml` | **CONFIRMED** | `cedar_policy_ref` ← `GITHUB_BASE_REF`; checkout of `cedar-policy/cedar` at that ref |
| 23 | HACL\*: `dist.yml` tests the **committed** `dist/gcc-compatible`; regeneration is a weekly `cron: '0 0 * * 0'` job with `git rm -r hints dist/*/*` and a bot PR (§4.2) | raw `dist.yml`, `hintsanddist.yml`, `.ci/script.sh` | **CONFIRMED** | `.ci/script.sh` does `pushd dist/gcc-compatible; ./configure; make -j` and `make -C tests test` — no F\* re-derivation. `hintsanddist.yml` carries the cron, `nix build`, `git rm -r hints dist/*/*`, the "Hacl Bot" commit, the "avoid trivial changes" assertion, and `peter-evans/create-pull-request@v6`. `hints` returns the API's 1000-entry cap |
| 24 | l4v `proof.yml`: `pull_request_target`, matrix `[ARM, ARM_HYP, AARCH64, RISCV64, X64]`, `aws-proofs`, `skip_dups: true`, `session: '-x AutoCorresSEL4' # exclude large AutoCorresSEL4 session for PRs` (§4.3) | raw `seL4/l4v` `proof.yml` | **CONFIRMED** | Every element verbatim, comment included |
| 25 | Licences: cedar-spec Apache-2.0, hacl-star Apache-2.0, l4v NOASSERTION, PUMPKIN-PATCH and pumpkin-pi MIT (§9, README) | `gh api repos/*` | **CONFIRMED** | All five `license.spdx_id` values as recorded |
| 26 | A proof-body-only edit changes the downstream `.olean` under Lean 4.33.0 — classic import (§3.1) | committed `lean-rebuild-propagation/run.sh` | **CONFIRMED** | Re-ran `bash run.sh`: **all four olean digests reproduced byte-for-byte** against TRANSCRIPT.md (`2d4ced4c…` / `0f0d322a…` → `231d9e18…` / `8eb7b880…`); verdict line "DOWNSTREAM olean CHANGED" |
| 27 | Same result under `module` + `public import` and `module` + private `import` (§3.1 table) | — | **CONFIRMED**, but not from a committed artifact | `run.sh` covers only the classic variant and the report commits no transcript for the other two. I rebuilt both variants from scratch under Lean 4.33.0: downstream rebuilt and `B.olean`, `B.olean.private` and `B.olean.server` **all three changed** in both. The claim holds; the evidence for it did not exist in the estate until now |
| 28 | Proof-body edit leaves generated C and the 2000-row corpus byte-identical; ~10 s rebuild (§3.4) | committed `proof-edit-artifact-stability/run.sh` | **CONFIRMED** | Re-ran: corpus digest `37ead01e…` **identical to the report's, before and after**; both verdict lines as printed. Rebuild 9.3 s here against the report's 10.3 s |
| 29 | "Every generated `.c` … was regenerated (mtimes advanced past the source edit)" (§3.4) | — | **CONFIRMED** | Not covered by the committed script, so I checked it separately: 10 `.c` files under `.lake/build/ir`, **all 10** with mtime at or after the patched `Model.lean` mtime. The byte-identity result is therefore non-vacuous — the files really are re-emitted |
| 30 | Timing table: no-op 0.25 s, `Model.lean` edit 4.2 s, `Violations.lean` edit 1.1 s (§3.3) | hand-measured, no transcript | **CONFIRMED** | Independently re-measured in a fresh scratch copy: **0.221 s / 4.060 s / 1.064 s** |
| 31 | Cold `lake build` of `verify/moves` is 15–20 s (§3.3, §5.1) | hand-measured, no transcript | **REFUTED as a range** | Two independent cold builds from a deleted `.lake` measured **11.41 s** and **11.70 s** — below the stated floor. The direction of the error favours the report's own argument, but the published range is not what this machine does |
| 32 | `verify/moves` composition: 94/1/14/1/5 theorems, 1961/175/143/45/361 lines, 42/34/0/0/11 definitions (§3.2) | repository at `e9fe0a3be` | **CONFIRMED** with one mislabel | Theorem and line counts exact. Definition counts exact *as total declaration counts* (Model.lean 34 `def` + 4 `abbrev` + 3 `inductive` + 1 `structure` = 42; Spec.lean 25 + 7 + 2 `instance` = 34). But the cell reads "34 (`Prop`-valued statements)" — **only 15 of Spec.lean's 34 declarations are `Prop`-valued**; the rest are carrier abbreviations, `Ord` / `FiniteCarrier` instances, and the mutant definitions |
| 33 | The estate's mutant-as-theorem pattern: the `legacyRepair` doc-comment, three killed-mutant theorems rostered in `run.sh` and conjoined by `spec_discharged` (§6.1) | repository | **CONFIRMED** | `Moves/Spec.lean:118-119`; `SpecProofs.lean:95,100,129`; `run.sh:52-54`; `SpecDischarge.lean:41-42`. `run.sh` does carry exactly one spec sha-pin, one axiom roster, one orphan rule and one corpus-regeneration check |
| 34 | "No established Lean 4 proof-repair tool was found"; the named searches "returned no primary source: only LLM-assistant marketing pages" (§2.4, §8 item 6) | — | **REFUTED as worded** | Searching the report's own terms surfaces primary research, not marketing: **"Learning to Repair Lean Proofs from Compiler Feedback"** (arXiv:2602.02990, submitted 2026-02-03, revised 2026-03-13), which introduces APRIL, "a dataset of 260,000 supervised tuples pairing systematically generated proof failures with compiler diagnostics and aligned repair and explanation targets"; and **ProofRepairBench** (OpenReview `6SwWVNwEJK`), a benchmark of 127 Lean repair problems. The *narrow* claim — no established PUMPKIN-style tool repairing proof terms in response to a **definition change** — survives, but the report's stated search outcome does not |
| 35 | decisionImpact item 1: "Three of their four objections dissolve under our narrower scope" (§7.1) | arXiv:2407.01688 §1 | **REFUTED** | The paper's four downsides are (i) limited developer pool / missing libraries, (ii) debugging through generated C requiring C **and** Lean expertise, (iii) "particularly difficult if the failure is due to an interaction between handwritten code and Lean-generated C code", (iv) C is memory-unsafe, so a Lean-compiler bug becomes a security bug. Only **(i)** is about "writing the whole product in Lean". (ii) and (iii) are both debugging costs, and (iii) is *sharpened*, not dissolved, by foldlab's design — hand-written Go and TypeScript hosts calling generated kernel code across a bytes ABI is precisely a handwritten↔generated interaction. (iv) is mitigated in D-bc's ratified WASM lane but live in its pre-registered native fallback. **At most one of the four dissolves cleanly** |

### Defects

1. **§2.4 / §8 item 6 — the absence finding is overstated (row 34).** The report's own
   search terms return primary literature on Lean proof repair (arXiv:2602.02990;
   OpenReview `6SwWVNwEJK`). Dismissing that line as "only LLM-assistant marketing
   pages" is the one place the report's search failed its own dispatch rule 3. The
   *recommendation* built on it — "REF-9's repair budget is manual" — is probably still
   right, since nothing found is a drop-in for definition-change-driven repair, but it
   now needs that narrower justification rather than the blanket one.

2. **§7 item 1 — the "three of four dissolve" count is wrong (row 35), and it
   contradicts §1.5.** §1.5 says two objections survive ("the fourth and the debugging
   one"); §7 says one. Neither matches the source, which yields at most one clean
   dissolution. Consequence for the operator: the addition recommended to D-bc's cost
   paragraph should name **two** costs, not one — (a) debugging a failure means stepping
   through generated code and mapping it back to Lean, made harder rather than easier by
   the handwritten-host / generated-kernel boundary, and (b) memory-unsafety of generated
   C, live in the native fallback lane and mitigated but not erased by the WASM lane's
   sandbox. The report's *direction* — documented dissent, not refutation; no lane change
   — stands.

3. **§3.3's cold-build figure is not reproducible (row 31).** 11.4 s and 11.7 s measured
   against a published 15–20 s. Since "15–20 s" is quoted in §5.1's R1 justification and
   again in the decisionImpact, the number that reaches the operator should be the
   measured one.

4. **§3.1's module-system table had no evidence behind it (row 27).** `run.sh` tests the
   classic import only; TRANSCRIPT.md gives a summary table for the `module` variants
   with no raw output. "I ran it" outranks "the docs say" only when the transcript is
   recorded. I re-derived both variants and they hold; the table should either gain a
   committed reproduction or be re-tagged.

5. **§3.2 / §5.4 mislabel Spec.lean's 34 declarations as "`Prop`-valued statements"
   (row 32).** Fifteen are. This does not weaken §5.4's argument — it *is* the argument,
   since the point is that `Spec.lean` mixes statements with non-statements — but the
   number should be stated as what it counts.

6. **§2.3 overstates Cedar's enforcement.** "The layout is not a convention; it is
   enforced" — `checkThm` enforces that `Cedar/Thm.lean` recursively imports every file
   under `Cedar/Thm/`, i.e. that **no proof file is orphaned from the gate**. It does not
   enforce that definitions and proofs live in separate trees; that half is convention,
   held in the seven `Spec/` files I sampled. This matters because R2 (§5.2) cites Cedar
   as precedent for a rule that *would* mechanically enforce the split ("no
   `Defs`/`Translate` module may contain a `theorem`"). R2's rule is a **stronger** guard
   than Cedar's and should be presented as an extension of the precedent, not an instance
   of it.

7. **Reference README wording drift.** The README says the DRT job checks out
   `cedar-policy/cedar` at "the *matching branch* of the pull request"; it is the PR's
   **base** branch (`GITHUB_BASE_REF`), which the report body states correctly.

8. **§1.2's missing citation detail is now supplied.** The "disincentive" sentence is on
   **printed page 143** of the SOSP 2013 proceedings.

### Notes that strengthen rather than defect

- **§5.3 / R3 is better supported than the report argues.** Matichuk et al. define raw
  statement size as "the total number of unique constants required to write the statement
  for l, **including all of its dependencies, recursively**" (§III-D). A journal inside
  `stateBytes` therefore really does inflate the measured statement size of every law
  quantifying over state — the report's analogy is the paper's actual measure, not a
  loose reading. One caveat the report does not state: the strongest R² (0.73–0.937)
  belongs to the *idealised* measure, which excludes constants whose defining equations
  the proof never unfolds. The journal inflates the idealised measure only if `translate`
  must unfold it — which, for a `translate` that carries the journal, it must. R3 survives
  the probe.
- **decisionImpact item 2 (one Lake package) survives and is strengthened.** The build
  numbers underwriting "build isolation buys nothing" are, if anything, better than
  published (11.4 s cold, 4.06 s for a `Model.lean` edit). The gate-topology argument was
  checked against the grill record: D-e obligation 1 does read "the refinement equation
  proved, statement sha-pinned, footprint-clean", and amendment 7 does defer the
  `verify/wire/` vs `Moves.Wire` question to REF-1 dispatch, exactly as characterised.
- **No invented API.** Every mechanism named in the report — `@[lint_driver]`,
  `script checkThm`, `lake lint`, `session: '-x AutoCorresSEL4'`, `skip_dups`,
  `cron '0 0 * * 0'`, `git rm -r hints dist/*/*`, `#print axioms`, `lake exe oracle emit`,
  and the `module` / `public import` / `.olean.private` split — was either fetched from
  the cited file or executed here.
- **Dispatch-discipline compliance (draft 19).** Sources dated: yes, every ledger row.
  Leads separated from evidence: yes, and the one lead is correctly tagged. `UNVERIFIED`
  marks: none present and none required — no API in the report is reconstructed from
  memory. What-it-does-not-answer section: present, eight named items. Recommendations
  carrying costs: yes, R1–R6 and both negative controls each carry cost, trusted-base
  delta and reversal. Reference-area README recording provenance and licence: yes,
  including the correct per-file REUSE caveat for l4v and a "Not found" section — whose
  content is the subject of defect 1.

**Verdict: material defects.** Two claims refuted (rows 34 and 35). Neither is on the
report's own load-bearing list — all ten of those are CONFIRMED, several byte-for-byte —
but both refuted claims carry weight: one sits inside the decisionImpact the operator is
being asked to act on, and one underwrites a stated recommendation. The report's three
decision-impact directions all survive; the arithmetic under item 1 does not.
