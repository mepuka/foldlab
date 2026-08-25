# Lean 4, LLM theorem solving, and language-modeling tooling reference

Status: decision background, not configuration  
Research snapshot: 2026-08-24  
Primary-source policy: official documentation and source repositories, original papers, and the
project's own checked files only

**Repository integration note (2026-08-25).** This report was produced against
a predecessor prototype checkout. Its “Locally verified current state” section
is retained as historical research evidence, not as a description of the
canonical repository. Current operating authority is
[`AGENTS.md`](../../AGENTS.md) and [`mise.toml`](../../mise.toml): Lean pins live
per Lake effort, mise is the canonical task runner, source identity lives in
[`sources.lock.json`](../../.reference/provenance/sources.lock.json), and claims
use [`CLAIM-GATES.md`](../effect-typescript-semantics/CLAIM-GATES.md).

## Executive conclusion

Foldlab already has enough native Lean infrastructure to begin the intended work. The immediate
tooling problem is not “install a proof assistant”; it is to preserve a clean chain from source
authority, through a deliberately chosen semantic model and fixed theorem statement, to kernel,
conformance, and runtime evidence. The existing package and claim ladder are a sound start.

The recommended operating model is:

1. Keep Lean version authority in each `formal/<effort>/lean-toolchain`, selected
   by Elan. Keep direct package intent and Lake's resolved graph in that same
   effort.
2. Use root mise as the canonical cross-host task orchestrator. Do not give it
   an independent Lean version declaration.
3. Keep native Windows as the default authoring and project-check lane while it is passing. Add a
   clean Linux CI gate before accepting generated source, foreign tooling, or untrusted LLM proof
   submissions. Use WSL for Unix-first research tools rather than sharing build artifacts across
   platforms.
4. Develop the semantics Lean-first. Evaluate the starred
   [PolyFun](https://github.com/Verified-zkEVM/PolyFun) library in an isolated dependency branch: it
   pins the same Lean 4.33.1 version and already supplies polynomial functors, interaction trees,
   handlers, strong/weak bisimulation, simulation, and multi-party interaction machinery.
5. Keep Rocq/Coq as an optional upstream-reproduction lane, not a core dependency. The original
   [InteractionTrees](https://github.com/DeepSpec/InteractionTrees) library is important evidence,
   but the immediate model can be built and audited in Lean. Add Rocq only when a concrete task
   requires running or porting the upstream development.
6. Treat LLMs as untrusted search, drafting, and review components. A candidate proof is evidence
   only after the exact statement, imports, axioms, and environment have been checked. Compilation
   of a generated theorem is not evidence that the statement faithfully represents the intended
   claim.
7. Introduce generation only with a checked regeneration contract: pinned inputs, deterministic
   output, a hand-written/generated ownership boundary, a non-mutating drift check, and downstream
   elaboration, test, and axiom gates.

### Executive decision matrix

| Area | Decision now | Why | Revisit gate |
| --- | --- | --- | --- |
| Lean and Lake | **Keep current authority model** | The project is pinned, dependency-free, and passing its full local gate. | A reviewed Lean or dependency upgrade. |
| mise | **Adopt only as an optional task/tool orchestrator** | It can improve onboarding and task discovery without replacing Elan/Lake. | When a second non-Lean tool becomes required by the ordinary workflow. |
| Linux CI | **Add before generated or untrusted inputs become normal** | Clean builds expose undeclared inputs; Linux also offers the best-supported sandbox and ML tooling path. | First generator, LLM evaluator, FFI, or external solver integration. |
| PolyFun | **Evaluate soon, isolated** | It is the closest Lean-native substrate and matches Lean 4.33.1, but introduces Mathlib and cslib into a package that currently has no dependencies. | Small compatibility spike with a written import/axiom/build-cost report. |
| Pantograph | **Evaluate after toolchain compatibility is demonstrated** | It exposes proof-search state and branching, but its current root pin is Lean 4.31.0 and it is an interface, not a prover or trust certificate. | A version-matched build or isolated service boundary. |
| LeanDojo/LeanCopilot | **Research lane, not core dependency** | Useful training, retrieval, and inference systems; operationally heavier and version/platform sensitive. | A defined benchmark or local-model experiment with a compute budget. |
| AlphaProof Nexus outputs | **Study as evidence and workflow prior art** | Published results and proof artifacts are valuable; the underlying system is not a drop-in local tool. | A reproducible comparison task on a frozen target set. |
| Rocq/Coq | **Deferred optional lane** | Needed to execute upstream ITree developments, not needed to start Lean-native semantics. | A named upstream theorem, Paco proof, or Coq artifact becomes a deliverable. |
| Tree-sitter | **Use later for concrete-syntax ingestion, never as semantic authority** | It is incremental and source-position aware but does not reproduce TypeScript or Lean elaboration. | A source-indexing/source-map requirement with conformance fixtures. |
| FrankenLean | **Watch only** | It is early, much of the README is an explicit 1.0 target, and its license rider is incompatible with use by this Codex environment. | Independently measured releases plus legal review. |

## Locally verified current state

These are observations about this checkout on 2026-08-24, not general recommendations.

### Package and gate in the predecessor prototype

- `formal/lean-toolchain` contained
  `leanprover/lean4:v4.33.1`.
- `formal/lakefile.toml` declared one library,
  `EffectSemantics`, and one default executable target, `effect_semantics_tests`.
- `formal/lake-manifest.json` contained no packages. The prototype had no
  external Lake dependency.
- `formal/EffectSemantics.lean` was the root facade. Source was
  already separated into `Foundation`, `Semantics`, `Projects`, and `Verification`, with executable
  checks under `Test`.
- `formal/scripts/check-source-lock.ps1` verified the
  Effect remote, exact commit, package name/version, and clean checkout.
- `formal/scripts/sync-effect-source.ps1` performed the
  networked clone/fetch/sparse-checkout operation and then invoked the lock check.
- `formal/scripts/check.ps1` rejected `sorry`/`admit`, ran the Lake
  build and test executable, elaborated the axiom audit, and rejected `sorryAx` or
  `Lean.trustCompiler` in that audit.
- A fresh run of `formal/scripts/check.ps1` on the snapshot date passed: the Effect source lock
  resolved `effect@4.0.0-rc.111` at commit
  `0dd7825e4da4d3a00fa9bd410a1d55f3d4874d07`; the 21-job Lean build and
  `effect_semantics_tests` succeeded; the listed Result and Machine theorems were axiom-free; and
  the script ended with `formal checks: ok`.
- The prototype script's text check was not a general axiom allowlist: it specifically rejected
  `sorryAx` and `Lean.trustCompiler`. The fresh receipt is stronger for the declarations it printed
  because their output reported no axioms, but a future gate should fail on every axiom outside an
  explicit allowlist (and decide explicitly how to treat newer native-evaluation axioms such as
  `Lean.ofReduceBool`).
- No `.github` CI directory existed in the prototype. Its local success was
  therefore not independently reproduced by committed CI.

Those receipts licensed only the predecessor prototype's recorded gates. They
do not promote or satisfy a gate in this repository. Current claims are
governed by [`CLAIM-GATES.md`](../effect-typescript-semantics/CLAIM-GATES.md).

### Environment inventory

| Environment | Observed tools | Missing or unresolved |
| --- | --- | --- |
| Native Windows | mise 2026.8.1; elan 4.2.3; Lean 4.33.1; Lake 5.0.0 | No Coq/Rocq executables or opam; no repository mise configuration or `mise.lock`. |
| WSL2 Ubuntu 26.04 | opam 2.5.0 at `/usr/bin/opam`; active switch `sprout-5.4` | No installed Coq/Rocq packages; no mise, Lean, Lake, Elan, `coqtop`, `rocq`, or `rocqtop` in the direct probe. |

The WSL result corrects an earlier quoting-broken probe. The active switch contains OCaml/Dune
packages but no installed package whose name begins with `coq` or `rocq`; that is an inventory
observation, not a claim that the switch is suitable for the upstream Interaction Trees library.

### Starred-project sweep

The authenticated GitHub CLI returned 161 starred repositories on the snapshot date. The following
were selected by repository name, description, topics, and direct README/source inspection. A star
is account preference, not a correctness or maturity endorsement.

| Starred project | Relevant lesson | Recommendation |
| --- | --- | --- |
| [leanprover/lean4](https://github.com/leanprover/lean4), [leanprover/elan](https://github.com/leanprover/elan) | Canonical compiler, kernel, elaborator, Lake, and toolchain manager. | Core authority. |
| [cameronfreer/lean4-skills](https://github.com/cameronfreer/lean4-skills) | LSP-first theorem workflow, statement fences, review/checkpoint, sorry and axiom tooling. | Continue using operationally; it does not alter formal trust. |
| [leanprover/Pantograph](https://github.com/leanprover/Pantograph) | Machine-facing proof search, goal branching, environment inspection, and frontend extraction. | Compatibility spike, not immediate dependency. |
| [google-deepmind/alphaproof-nexus-results](https://github.com/google-deepmind/alphaproof-nexus-results) | Kernel-checkable outputs plus prose artifacts from a large formal proof-search system. | Study methods and artifacts; keep denominator and selection effects visible. |
| [eth-sri/type-constrained-code-generation](https://github.com/eth-sri/type-constrained-code-generation) | Incremental parser state constrains LLM decoding to prefixes completable as typed TypeScript programs. | Later source-generation experiment; typeability is not semantic fidelity. |
| [Verified-zkEVM/PolyFun](https://github.com/Verified-zkEVM/PolyFun) | Lean-native polynomial functors, ITrees, handlers, simulation/bisimulation, and multi-party interaction. | Highest-priority dependency evaluation. |
| [DeepSpec/InteractionTrees](https://github.com/DeepSpec/InteractionTrees) | Upstream Rocq implementation and theorem inventory for recursive, effectful computation. | Normative research source; optional executable Rocq lane. |
| [LTeuse/Effectful-Choreography](https://github.com/LTeuse/Effectful-Choreography) | Lean mechanization of algebraic effects, choreographies, endpoint projection, progress/preservation, and projection soundness/completeness. | Close conceptual prior art; inspect proof contracts before reuse. |
| [cajal-technologies/talos](https://github.com/cajal-technologies/talos) | Executable semantics and proofs share definitions; optimized execution is intended to require a separate equivalence proof. | Strong architecture exemplar; active work in progress. |
| [verse-lab/veil](https://github.com/verse-lab/veil) | Lean-embedded transition systems, distributed protocols, model checking, SMT, and interactive fallback. | Evaluate when topology/safety models outgrow the small-step core. |
| [lambdaclass/concrete](https://github.com/lambdaclass/concrete) | Lean-hosted language, explicit capabilities/ownership, interpreter and evidence classes. | Study evidence accounting and staged contracts; do not import its language design wholesale. |
| [predictable-machines/lean4-tree-sitter](https://github.com/predictable-machines/lean4-tree-sitter) | FFI parser bindings, extraction, source maps, grammar schemas, and claimed verified map properties. | Later ingestion candidate; inspect source/tests because README and Lake surface are evolving. |
| [predictable-machines/lean4-json-schema](https://github.com/predictable-machines/lean4-json-schema) | Lean schema AST, validation, deriving, and correctness-theorem pattern. | Useful Schema comparison; project explicitly warns that coverage and proofs are incomplete. |
| [Dicklesworthstone/franken_lean](https://github.com/Dicklesworthstone/franken_lean) | Ambitious alternate checker/toolchain, content-addressed build, traces, and receipts. | Watch only: distinguish implemented commands from targets and respect the license rider. |
| [leanprover-community/lean4-metaprogramming-book](https://github.com/leanprover-community/lean4-metaprogramming-book) | Practical `Syntax`, `Expr`, elaboration, and tactic APIs. | Use after the official reference, which owns current behavior. |

## Version and build authority

Lean's official Elan reference says a project toolchain file should normally contain a specific
version and be committed, and that Elan chooses it by walking parent directories. Lake owns package
configuration, resolved dependencies, targets, tests, linters, scripts, and build artifacts. See
[Managing Toolchains with Elan](https://lean-lang.org/doc/reference/latest/Build-Tools-and-Distribution/Managing-Toolchains-with-Elan/)
and the [Lake reference](https://lean-lang.org/doc/reference/latest/Build-Tools-and-Distribution/Lake/).

### Recommended source-of-truth table

| Concern | Sole repository authority | Derived/ephemeral consumers |
| --- | --- | --- |
| Lean compiler and bundled Lake | `formal/<effort>/lean-toolchain` | Elan installation, editor server, CI environment. |
| Direct Lean dependency intent and targets | `formal/<effort>/lakefile.toml` | Lake workspace and build plan. |
| Resolved Lean dependency graph | `formal/<effort>/lake-manifest.json` | `.lake/packages`, compiled artifacts, caches. |
| Effect source revision and package identity | `.reference/provenance/sources.lock.json` | disposable study clone or fetched Git object database |
| Formal acceptance gate | root `mise run check`, effort-specific checks, and the claim registry | developer shortcuts and CI jobs |
| Non-Lean tool versions, if adopted | `mise.toml` plus `mise.lock` where resolution is used | Native/WSL installations. |
| Generated output | Generator input pins plus committed output inventory | Regenerated files and check artifacts. |

Do not put `lean = "4.33.1"` in mise. That duplicates the string and can select a binary that does
not match Elan's project context. A mise task may call `elan show`, `lake build`, or the project
PowerShell gate; it should not reinterpret the Lean pin.

## Terminology: two different kinds of “language model”

This project needs both ideas, but they must never share one evidentiary label.

| Term in this note | Meaning | Typical artifact | Correctness role |
| --- | --- | --- | --- |
| **Statistical language model** | A learned probabilistic model that predicts or generates tokens, tactics, proof plans, definitions, or prose. | Model/checkpoint, tokenizer, prompt, retrieval index, samples, search trace. | Untrusted proposal and search mechanism. It can improve discovery but cannot certify its own output. |
| **Formal model of a language/system** | A mathematical description of syntax, kinds/types, states, dynamics, denotation, observations, projection, or refinement. | Lean inductives, functions, relations, interpreters, and theorems. | Subject of kernel-checked claims. Its adequacy to the intended source still requires traceability and conformance evidence. |

A statistical model may generate a candidate formal model or proof. A formal model may itself
describe the behavior of a programming or interaction language. The two uses compose as follows:

```text
source requirement / pinned implementation
        ↓ interpretation and statement review
formal language/system model + frozen theorem contract
        ↓ candidate generation/search by statistical language model
Lean proof term
        ↓ elaboration, kernel, axiom, exact-statement, and review gates
licensed claim about the formal model
        ↓ separate conformance/preservation evidence
licensed claim about source, translation, runtime, or artifact
```

Kernel checking contains statistical hallucination at the proof-term boundary; it does not detect a
mis-modeled source operation, a vacuous theorem, an altered target, an unintended axiom, or a false
claim that a model theorem already applies to hosted TypeScript execution.

The current package layout is adequate for the first slices. As it grows, preserve dependency
direction:

```text
Foundation / model / judgments
          ↓
Semantics / interpreters / translations
          ↓
Project-specific models and proofs
          ↓
Verification / conformance / audits

Runtime, FFI, generators, and source adapters depend on the semantic API;
the semantic API does not depend on them.
```

The root facade should remain intentional. A file imported nowhere can appear correct in an editor
while being absent from the package gate. Conversely, importing every experiment into the facade
makes provisional work part of the stable surface. Lake targets or explicit project gates should
reach every artifact that is claimed healthy.

### Clean CI policy

The official [lean-action](https://github.com/leanprover/lean-action) supports build, test, lint,
cache, Lean checker, independent `nanoda`, and axiom-audit modes on hosted Linux, macOS, and Windows.
For Foldlab, CI should initially do less but do it explicitly:

1. Check out recursively only what is committed; do not rely on a developer's
   `.lake` or disposable study clones.
2. Run the source synchronization/check step from the pinned lock.
3. Run the same root `mise run check` entry point used locally; keep every
   effort-specific sub-gate reachable through it.
4. Periodically run without restored `.lake` caches. Cache success is not a clean-build result.
5. Add external replay (`leanchecker` or another reviewed checker) only as a separate, named trust
   gate, not as a replacement for the ordinary kernel/build/axiom checks.

## Modeling formal languages and semantics in Lean

### Select representations by semantic role

Lean's [inductive types and indexed families](https://lean-lang.org/doc/reference/latest/The-Type-System/Inductive-Types/)
support syntax, evidence, and state-indexed objects, but they should not be used merely to maximize
type-level information.

| Semantic need | First Lean representation | Reason and caution |
| --- | --- | --- |
| Syntax or canonical descriptor with observable alternatives | Recursive `inductive` in `Type` | Constructors expose the distinctions interpreters and proofs consume. |
| Well-formedness, typing, reduction, reachability | Inductive relation in `Prop` | Supports derivation induction and keeps logical evidence erased. |
| Executable normalizer, decoder, projection, or interpreter | Total `def` returning data in `Type` | Can be evaluated and tested; separately prove it agrees with a relational specification. |
| Protocol phase or intrinsically typed syntax | Indexed inductive family | Makes invalid states unconstructable, but can create equality-transport costs. |
| External input plus checked invariant | Structure or subtype | Validation remains explicit at ingestion. Keep runtime witnesses in `Type` when programs inspect them. |
| Potentially infinite interaction | Coinductive encoding, M-type, guarded observation, or step-indexed relation | Do not force infinite behavior into an unprincipled finite fuel model and then claim full equivalence. |
| Multiple interpreters or algebras | Explicit structure/dictionary first; typeclass only when coherent | Avoid hiding equal-status policy choices in global instance search. |

### Maintain multiple semantic views deliberately

For Foldlab's intended “canonical description projected or folded into context,” one representation
should not be forced to serve every proof. A useful initial separation is:

```text
Descriptor             -- canonical, inspectable syntax/data
WF / HasKind / HasType  -- formation and static judgments
Step / Runs             -- relational dynamic semantics and traces
eval / handle / fold    -- executable interpreter(s)
observe                 -- declared observation policy
refines / equivalent    -- relation induced by observations
project participant     -- global-to-local transformation
encode / decode         -- representation projections
```

The primary theorem families should connect these views rather than collapse them:

- `eval_sound`: executable results are admitted by the relational semantics;
- `eval_complete` for deterministic accepted fragments;
- determinism or an explicit characterization of nondeterminism;
- progress/preservation for a typed source language where those are the intended guarantees;
- interpreter/handler laws and compositionality;
- projection well-formedness and endpoint soundness/completeness;
- normalization idempotence and denotation preservation;
- codec round trips under stated domains and canonicalization policies;
- simulation, weak bisimulation, trace inclusion, or refinement under an explicit observation.

Do not state `x = y` where the intended result is equivalence modulo silent steps, representation,
ordering, topology, or canonicalization. “Meaning-preserving” must always name the meaning and the
observations preserved.

### Interaction trees and protocols

The core reference remains Xia et al.,
[Executable Denotational Semantics with Interaction Trees](https://repository.upenn.edu/server/api/core/bitstreams/9eaac6e3-ba5a-4f8e-b2c9-9c68c28881aa/content#page=14.58).
Its crucial separation is an indexed event signature, a recursive computation tree, handlers, an
interpreter, and behavioral equivalence that can hide finite silent computation. The
[upstream Rocq library](https://github.com/DeepSpec/InteractionTrees) documents its own assumptions,
including uses of UIP, functional extensionality, excluded middle, and choice in particular
modules. Porting the library name is not the same as inheriting an axiom-free trust story.

[PolyFun](https://github.com/Verified-zkEVM/PolyFun) is the most direct Lean-native prior art. It
models interaction trees from a polynomial-functor/M-type substrate and includes strong/weak
bisimulation, simulation, handlers, event signatures, and sequential through concurrent
interaction layers. It is especially relevant to Foldlab's desire to relate syntax, strategy,
execution, and participant-local views. Its README reports no `sorry` or `admit`, and its Lake
package includes an axiom sweep; those claims should still be reproduced at the exact selected
commit before any dependency decision.

[Effectful-Choreography](https://github.com/LTeuse/Effectful-Choreography) is closer to the later
global-type problem: it formalizes choreographies and process networks, endpoint projection,
progress/preservation, and projection soundness/completeness in Lean. Its current root pin is
4.29.0-rc6, so it is prior art rather than a drop-in dependency.

### Executable and relational semantics

The starred [Talos](https://github.com/cajal-technologies/talos) project makes a useful architectural
claim: the definitions used to execute a WebAssembly program are also the definitions used for
reasoning, while a faster implementation should sit behind a separate proved-equivalence bridge.
Foldlab should adopt that discipline, with one qualification: an executable interpreter alone does
not provide the nondeterministic, asynchronous, or coinductive behaviors that a relational or
interaction-tree view can express.

Use a pair:

```lean
def run : Fuel → Config → ExecResult

inductive Steps : Config → Trace → Outcome → Prop

theorem run_sound ... :
  run fuel cfg = .done trace outcome → Steps cfg trace outcome := ...
```

Fuel is an operational control and a bounded observation; it is not a proof of termination or a
definition of divergence unless the formal statement says so. For streams and asynchronous flows,
record fairness, delivery, cancellation, topology, and observation assumptions before proving a
refinement result.

### Syntax, elaboration, and metaprogramming

The official [Lean elaboration pipeline](https://lean-lang.org/doc/reference/latest/Elaboration-and-Compilation/)
is:

```text
source → parser → Syntax → macro expansion → elaboration → Expr/environment
       → kernel checking → compilation
```

It processes commands incrementally: a command can extend syntax and environment state used by the
next command. Consequently:

- a tree-sitter parse tree is not a Lean `Syntax` tree;
- a Lean `Syntax` tree is not an elaborated `Expr`;
- pretty-printed or delaborated text is not a guaranteed inverse of elaboration;
- a TypeScript AST is not a type-checked TypeScript program;
- a TypeScript type is not a runtime Effect or Schema value.

Use macros only for transparent syntax-to-syntax expansion. Use an elaborator when meaning depends
on expected type, environment, coercions, metavariables, or instance synthesis. Keep semantic
constructors independent of the DSL surface, and have the elaborator produce ordinary expressions
over that API. Test parse/macro shape, elaboration, expected diagnostics, and generated expressions
at separate boundaries.

## Theorem-development operating practice

### The fixed-contract workflow

1. **Orient.** Read the applicable agent policy, charter, claim gate, source pin, module imports,
   and target theorem.
2. **Freeze the statement contract.** Record the exact declaration header, informal requirement,
   meanings of definitions, allowed assumptions, and trust basis. If the statement is still being
   designed, call the work formalization, not proof filling.
3. **Test the statement before proving.** Add or evaluate representative examples, boundary cases,
   and near-miss counterexamples. Look for vacuity, reversed refinement, missing well-formedness,
   hidden determinism, and accidental stronger/weaker quantifiers.
4. **Inspect the live goal.** Prefer editor/LSP goal state, hover/type information, diagnostics, and
   code actions to reasoning from source text alone.
5. **Search before proving.** Search local declarations and imports, generated API docs, names,
   type patterns, and semantic search. The Mathlib project documents
   [its search surfaces](https://leanprover-community.github.io/blog/posts/searching-for-theorems-in-mathlib/),
   including docs, Loogle, `exact?`, `apply?`, `rw?`, and suggestion tactics.
6. **Use the structure of the model.** Start with definitional equality and direct terms, then
   controlled rewriting/simplification, cases/induction aligned with recursors, relevant domain
   automation, and only then new helper lemmas or custom tactics.
7. **Validate narrowly, then broadly.** Live diagnostics → file/module elaboration → project gate →
   axiom report → clean/independent checks appropriate to the public claim.
8. **Review the proof and statement independently.** Proof terseness is secondary to statement
   fidelity, stable dependencies, explicit observations, and maintainability.

The official [proof validation guide](https://lean-lang.org/doc/reference/latest/ValidatingProofs/)
explicitly distinguishes “does this theorem have a valid Lean proof?” from “what does the theorem
statement mean?” It also notes that dependencies may hide `sorry` or custom axioms and recommends
`#print axioms`; for stronger hostile-input settings it describes replay with a checker and warns
that Lean metaprograms can execute arbitrary actions during a build.

### Maintainability rules

- Import the smallest stable modules that express the proof, but do not optimize imports before the
  model boundary is understood.
- Prefer helper lemmas that expose the semantic reason a theorem is true.
- Use broad `simp` only when the project's simp set is intentionally part of the proof contract;
  otherwise prefer controlled rewrite sets or `simp only` at sensitive boundaries.
- Keep expensive automation bounded and visible. A proof that passes only with unbounded heartbeats
  or unstable search is an operational liability.
- Preserve theorem headers and existing docstrings during proof filling.
- Report proof generation separately from proof checking. LLM authorship changes review risk, not
  kernel rules.
- Follow Mathlib's general standard of build cleanliness, no `sorry`, intentional naming/imports,
  and maintainability, while recognizing that Foldlab is a standalone semantics project rather than
  a Mathlib contribution. See the
  [Mathlib contributor guidance](https://leanprover-community.github.io/contribute/).

### Refutation and counterexamples

Before spending proof-search budget, ask whether the proposition is false or under-specified.
Finite examples, `#eval`, decidable checks, model finders, and small counterexample theorems are
useful discovery tools. They license a refutation only when Lean checks a theorem expressing the
negation or a witness that entails it. A timeout, failed tactic search, or generated example outside
the theorem's hypotheses is inconclusive.

The installed vendor `lean4` skill (local package version 4.6.9) embodies this split: statement
design belongs to `formalize`/`autoformalize`; fixed headers belong to `prove`/`autoprove`; review is
read-only; and `disprove` reports a refutation only after Lean checks it. The project-local
`lean4-project-engineering` skill owns package, model, type-system, metaprogramming, and conformance
architecture. These workflows are operational policy, not additions to Lean's trusted kernel.

## LLM-assisted formalization and proof solving

### Separate four questions

Every tool report should answer four independent questions:

| Question | Example evidence | What it does not show |
| --- | --- | --- |
| Published capability | Peer-reviewed/preprint experiment, frozen benchmark, reported pass rate and budget. | That the tool works on this repository, toolchain, or claim. |
| Operational tooling | Source, build instructions, API, supported Lean versions, reproducible runner. | That a generated proof is correct or a benchmark statement faithful. |
| Artifact validity | Exact target compiles, no forbidden axioms, statement unchanged, optional independent replay. | That the target formalizes the intended informal problem. |
| Formal trust | Kernel, imported axioms, compiler/native evaluation, FFI, external solvers, generator, and host boundary disclosed. | That system-level runtime behavior conforms to the Lean model. |

### Tool and research landscape

| Project | Published capability | Operational surface | Trust and adoption reading |
| --- | --- | --- | --- |
| [Pantograph paper](https://arxiv.org/abs/2410.16429) / [repository](https://github.com/leanprover/Pantograph) | Demonstrates a machine-to-machine interface intended for search, including MCTS-style use. | REPL/library APIs for environments, parsing, frontend extraction, goal branching, tactics, continuation, state save/load, and conformance tracking. | Pantograph executes Lean tactics and exposes search state; the kernel still checks completed terms. Its docs warn that non-cooperative tactics can hang/leak and recommend OS resource isolation. Current repository pin 4.31.0 differs from Foldlab. |
| [LeanDojo paper](https://arxiv.org/abs/2306.15626) / [ReProver](https://github.com/lean-dojo/ReProver) | 98,734-theorem benchmark; retrieval-augmented proving; a split designed around premises unused in training. | Repository tracing, proof-state/premise extraction, tactic generation, premise retrieval, and search. | Original LeanDojo now directs new users to [LeanDojo-v2](https://github.com/lean-dojo/LeanDojo-v2). V2 combines tracing, datasets, Pantograph-based provers, SFT/GRPO/retrieval training, and external inference, but requires substantial Python/GPU/storage/toolchain setup and has no root Lean pin. |
| [Lean Copilot paper](https://arxiv.org/abs/2404.12534) / [repository](https://github.com/lean-dojo/LeanCopilot) | Reports tactic-assistance and automation results on Mathematics in Lean against Aesop under the paper's setup. | Native Lean tactic suggestion, proof search, premise selection, and local/remote model interfaces. | Suggestions are untrusted until elaborated. Built-in premise data is tied to a fixed Lean/Mathlib snapshot. Current root pin 4.33.0 is close to, not equal to, Foldlab's 4.33.1. |
| [AlphaProof Nexus paper](https://arxiv.org/abs/2605.22763) / [outputs](https://github.com/google-deepmind/alphaproof-nexus-results) | Reports 9/353 open Erdős problems and 44/492 OEIS conjectures, plus research deployments, under the paper's agent configurations and costs. | Public Lean proofs, accompanying prose proofs, attempted-problem lists, and links to unsolved formalizations. | The outputs repository contains successful proofs, not a locally deployable reproduction of the whole system. Use complete attempted sets as denominators and keep model/tool access and cost distinct from proof validity. Root pin is 4.27.0. |
| [DeepSeek-Prover-V2](https://github.com/deepseek-ai/DeepSeek-Prover-V2) | Reports high MiniF2F and PutnamBench results and uses recursive theorem decomposition/cold-start data. | Open model weights/examples for whole-proof generation. | Benchmark scores are budget- and harness-dependent; public benchmark exposure and generated-data overlap require explicit contamination analysis. A compiled completion still needs exact-statement and axiom checks. |
| [Type-Constrained Code Generation](https://arxiv.org/abs/2504.09246) / [code](https://github.com/eth-sri/type-constrained-code-generation) | PLDI 2025 work on constraining decoding to prefixes completable as type-safe TypeScript programs. | Incremental TypeScript parser plus constrained model sampling; reproduction scripts specify large GPU requirements. | Particularly relevant to a future Effect/Schema source language, but it supports a TypeScript subset and establishes type-completability, not preservation of intended meaning or Effect semantics. |
| [ProofNet](https://arxiv.org/abs/2302.12433) | Benchmark for statement autoformalization and proof generation from undergraduate text. | Natural-language statement/proof plus Lean target pairs. | Autoformalization evaluation must assess semantic equivalence, not only type checking or textual similarity. Original version is Lean 3; later corrections matter. |
| [Improving Autoformalization using Type Checking](https://arxiv.org/abs/2406.07222) | Studies type-checking feedback and releases corrected/verification-oriented autoformalization datasets. | Evaluation resources for accepted and rejected formalizations. | Supports using the compiler as a repair signal while retaining human/independent semantic review. |
| [PutnamBench](https://arxiv.org/abs/2407.11214) / [repository](https://github.com/trishullab/PutnamBench) | 640 Putnam theorems with 1,692 formalizations across Lean, Isabelle, and a Coq subset. | Multi-prover targets and evaluation harnesses. | Useful for cross-system robustness; competition-problem performance does not predict source-semantics formalization performance. |
| [Faults in Our Formal Benchmarking](https://arxiv.org/abs/2606.29493) / [checkers](https://github.com/Shashi456/atp-checkers) | Audits formal benchmark defects including vacuity, counterexamples, axioms, and semantic translation errors. | Static checkers, audit prompts, and corrected snapshots. | Recent work that reinforces Foldlab's existing claim gates: kernel validity and statement fidelity are separate review obligations. |

No benchmark number in this table is directly comparable without aligning theorem set and revision,
imports, permitted axioms, model/checkpoint, prompt, retrieval corpus, search algorithm, number of
samples, token/Lean-call/time budget, hardware, and success verifier.

### Recommended LLM proof workflow

```text
frozen source claim
    ↓ human/operator statement review + examples/counterexamples
frozen Lean declaration header in a trusted target file
    ↓ untrusted LLM/retriever/search candidates
separate submission file
    ↓ exact-header/environment comparison
Lean elaboration + build
    ↓ sorry/axiom/native-evaluation audit
optional independent environment replay
    ↓ independent proof and statement review
claim-gate update
```

Responsibilities must remain explicit:

| Participant | Authority and obligation |
| --- | --- |
| Human/operator | Owns the source interpretation, freezes the statement and trust policy, approves proposed semantic/header/file changes before they are made, and decides what claim gate the evidence supports. |
| Statistical language model, retriever, or search agent | Proposes candidate statements, lemmas, proof terms, refutations, and searches. Its output is untrusted, including when it compiles. |
| Lean toolchain and evaluation harness | Elaborates the pinned files, checks the exact target and allowed constant graph, audits prohibited escape hatches, and records reproducible results. It establishes formal acceptance under the encoded statement, not source fidelity. |
| Independent reviewer | Rechecks source-to-statement meaning, assumptions, non-vacuity, counterexamples, trust boundaries, and the resulting claim strength. This role should not rely only on the successful agent transcript. |

In a brain- or operator-guided session, the agent should therefore propose the action, affected
artifacts, intended evidence, and validation command before changing a theorem statement, semantic
definition, generated inventory, trust policy, or claim gate. Routine read-only inspection and
already-approved proof-body search remain within the agreed lane.

The installed `lean4-skills` workflow is suitable for interactive project proof work because it
uses live goal inspection, search-before-prove, header fences, bounded proof cycles, review, and
checkpoint gates. Pantograph or LeanDojo becomes useful when Foldlab needs a programmatic branching
search service or a research dataset, not merely because an LLM is participating.

## Evaluation design for theorem-solving agents

### Unit of evaluation

Each evaluation instance should freeze:

- repository URL and commit;
- `lean-toolchain`, Lake config, manifest, and source-lock digest;
- trusted challenge file and exact declaration name/header;
- permitted imports, options, axioms, and native-evaluation policy;
- editable file set;
- model/provider/checkpoint and tokenizer;
- prompt, tool schema, retrieval corpus, and any demonstrations;
- sampling parameters and seed;
- candidate, token, wall-clock, Lean-call, and branch budgets;
- verifier commit and command;
- all candidate outcomes, not only successful proofs.

### Required metrics

Report at least:

| Metric | Definition |
| --- | --- |
| Parse/elaboration rate | Candidate source reaches the specified frontend gate. Not theorem success. |
| Exact-target compile rate | Candidate proves the frozen target without changing its declaration graph. |
| Axiom-clean success | Exact-target success with only the declared allowlist. |
| Pass@k | Fraction of targets with at least one accepted candidate under exactly `k` samples and the recorded total budget. |
| Search cost | Tokens, wall time, Lean invocations, tactic expansions, retrieval calls, and hardware/API cost. |
| Statement-fidelity result | Independent review or a specified semantic equivalence/refinement check for generated statements. |
| Robustness | Results after alpha-renaming, harmless syntax changes, premise-order changes, or a frozen contamination-sensitive mutation set. |
| Maintainability | Proof replay on a reviewed compatible update, dependency footprint, and review findings. |

Pass@k without the generation budget and candidate independence assumptions is not reproducible.
Timeouts and infrastructure failures should not silently count as mathematical failures, and reruns
should not silently expand `k`.

### Leakage and contamination controls

1. Hash exact target statements and search training/retrieval corpora for exact and normalized
   duplicates.
2. Record dataset publication date, model training cutoff if disclosed, and whether the benchmark is
   widely present in public code.
3. Hold out source modules or premise families temporally or structurally. LeanDojo's “novel premise”
   split is a useful design pattern, not a universal guarantee.
4. Run renamed or semantics-preserving target variants. A large drop is evidence of surface-form
   reliance, though not a proof of contamination.
5. Prevent retrieval of the target proof, downstream declarations, solution branches, cached agent
   transcripts, or generated artifacts from earlier runs.
6. Publish the unsuccessful attempted set. The AlphaProof Nexus outputs explicitly link attempted
   OEIS/Erdős sets; successful-artifact repositories alone otherwise create selection bias.
7. Keep benchmark targets outside ordinary development search indexes when running a closed
   evaluation.

### Exact-statement and trust checks

The safest harness separates trusted challenge source from untrusted submission source. The 2026
[lean-eval repository](https://github.com/leanprover/lean-eval) and its
[security architecture](https://github.com/leanprover/lean-eval/blob/main/SECURITY.md) provide a
particularly relevant precedent. A manifest is the only CI entry point and rejects untracked
problem modules. Per-problem generation creates an isolated comparator workspace without granting
the submission ownership of `Challenge`, the trusted solution, configuration, or Lake files. The
comparator builds challenge and submission separately, compares their reachable constant graphs,
permits only its stated axiom allowlist, rejects `sorryAx` and the `Lean.ofReduceBool` path used by
`native_decide`, exports and replays the accepted environment, and adds an independent `nanoda`
kernel check. Its toolchain, comparator, exporter, replay kernel, and `landrun` sandbox are pinned.
The documented local contract includes `generate --problem ...` followed by
`check-generated-builds --problem ...`; CI regenerates rather than trusting committed generated
workspaces. This is stronger evidence than a successful ordinary `lake build` of an agent-owned
file.

The same security document is also appropriately candid: elaboration is hostile-code execution,
the sandbox boundary is part of the trusted computing base, and a writable `.lake` directory leaves
a documented self-tampering soft spot. [SafeVerify](https://github.com/GasStationManager/SafeVerify)
similarly compares target/submission declarations and replays environments, while documenting
remaining source-level and sandbox gaps. Neither architecture proves that the frozen statement is
the intended one.

[Comparator Live](https://github.com/leanprover/comparator-live) makes the intended audience
especially plain: its stated purpose is communicating when a Lean proof from an unreliable,
potentially malicious, or AI source may be relied upon. It hashes trusted challenges and isolates
challenge and solution builds in production, while explicitly warning that development mode has no
sandbox and must not evaluate unknown challenges or untrusted solutions. That warning is a useful
model for keeping a convenient local workflow distinct from a hostile-submission evaluation lane.

Foldlab does not need to adopt either immediately, but its evaluation contract should enforce the
same invariants:

- the agent cannot edit the theorem header, imported definitions, verifier, or claim registry;
- `sorry`, `admit`, custom axioms, and unapproved native evaluation fail the run;
- successful build output is checked to contain the target module;
- generated `initialize`, FFI, filesystem, network, and process behavior is sandboxed for untrusted
  submissions;
- statement meaning is independently reviewed against the source, even after exact proof checking;
- source/model/runtime conformance stays at the appropriate G0–G5 gate.

## Language and transformation tooling relevant to Foldlab

| Prior art | What to learn | Boundary not to blur |
| --- | --- | --- |
| Lean parser/elaborator/kernel | Incremental commands, extensible `Syntax`, typed `Expr`, info trees, small kernel. | Surface syntax, elaborated meaning, proof acceptance, and executable compilation are distinct. |
| [tree-sitter](https://tree-sitter.github.io/tree-sitter/) and [lean4-tree-sitter](https://github.com/predictable-machines/lean4-tree-sitter) | Incremental concrete syntax, error recovery, source spans, extraction, bidirectional source maps. | Concrete syntax does not establish TypeScript/Lean typing or Effect semantics; FFI behavior is outside pure Lean proofs. |
| [MLIR](https://mlir.llvm.org/docs/LangRef/) | Extensible dialects; one semantic IR represented textually, in memory, and serially; operations, regions, traits, interfaces, verified constraints. | MLIR's generic IR does not supply a semantics for a new dialect automatically. |
| [Strata](https://github.com/strata-org/Strata) | Lean framework for language dialects, syntax/semantics, symbolic evaluation, verification conditions, SMT, and code generation. | Active development; SMT discharges and generated targets add explicit trust/conformance boundaries. |
| [Lean-MLIR](https://github.com/opencompl/lean-mlir) and its [peephole-rewrite paper](https://arxiv.org/abs/2407.03685) | Denotations for SSA IRs, reusable rewrite semantics, and the theorem that a rewrite preserves denotation. | It targets compiler IR, not global agent interaction; reuse the proof architecture, not the domain model. |
| [Talos](https://github.com/cajal-technologies/talos) | Executable reference semantics plus compositional weakest-precondition reasoning. | Active WIP and Wasm-specific choices. |
| [Veil](https://github.com/verse-lab/veil) | Distributed transition systems, invariants, model checking, SMT automation, and interactive proof fallback. | Safety focus and bounded/model-checking results do not supply stream liveness or global-type fidelity by default. |
| [Aeneas](https://github.com/AeneasVerif/aeneas) and [paper](https://arxiv.org/abs/2206.07185) | Translate a restricted source IR into pure functional models; multiple proof backends; explicit generated/hand-written external-model split. | Translation supports a documented Rust subset; generated code requires a preservation/conformance story. |
| [Cedar specification](https://github.com/cedar-policy/cedar-spec) | Lean definitional implementation plus property/fuzz/differential randomized testing against production Rust. | Differential testing raises conformance evidence but does not by itself prove whole-implementation equivalence. |
| [Lean4Lean](https://github.com/digama0/lean4lean) | Lean kernel reimplementation, abstract typing relation, correctness effort, external replay, documented divergences. | It is derived from the C++ kernel and explicitly says it may share implementation bugs; independence is graded. |
| [Concrete](https://github.com/lambdaclass/concrete) | Canonical evidence ledger separating proofs, tests, solver output, runtime checks, assumptions, and authority. | Early language design and roadmap statements are not imported correctness results. |
| [PolyFun](https://github.com/Verified-zkEVM/PolyFun) | Event signatures, free/cofree structures, ITrees, handlers, simulations, open processes, and multi-party/concurrent interaction. | Validate exact imports, axioms, dependency cost, and compatibility before making it foundational. |
| [Effectful-Choreography](https://github.com/LTeuse/Effectful-Choreography) | Global choreography, process machines, endpoint projection, and soundness/completeness theorem shapes. | Its host language and communication model are a design point, not automatically the right Effect/agent semantics. |

### Recommended source-ingestion layers

For Effect TypeScript analysis, preserve at least four products:

```text
bytes + source revision
  → concrete syntax tree + byte ranges
  → TypeScript compiler AST/symbol/type facts
  → accepted Foldlab descriptor + provenance
  → Lean semantics and correspondence obligations
```

Tree-sitter can serve the first arrow for fast indexing and robust ranges. The TypeScript compiler
API should remain the authority for TypeScript syntax/symbol/type behavior. A project-owned
elaborator should admit only an explicit source subset into canonical descriptors. Lean proofs then
concern those descriptors; fixtures or a proved translator connect them back to the pinned Effect
source.

Content addressing should hash a versioned canonical representation, not source text or pretty
printed Lean:

```text
address = hash(
  semantic-schema-id,
  canonicalizer-version,
  canonical-encoding(descriptor)
)
```

A stable digest proves byte identity under that procedure. It proves semantic identity only after
the canonicalization/equivalence theorem and cryptographic assumptions are stated.

## Regeneration policy

### Required contract

Every generator should have a short contract containing:

```text
Generator:
Purpose:
Owned input files and external pins:
Input semantic/schema versions:
Generator source and tool versions:
Network policy (sync only / forbidden during regen):
Generated output inventory:
Hand-written extension inventory:
Canonical ordering, encoding, and newline policy:
Regeneration command:
Non-mutating drift-check command:
Downstream elaboration/build/test/conformance gates:
Provenance embedded in or adjacent to output:
Known lossy transformations and unsupported cases:
Conditions requiring operator re-approval:
```

### Pipeline template

```text
sync       network allowed; fetch exact named pins; verify hashes/identity
  ↓
extract    read pinned inputs; emit typed intermediate data and provenance
  ↓
normalize  deterministic canonical order/encoding; no ambient time/randomness/network
  ↓
generate   write only the declared generated inventory
  ↓
check      regenerate into an isolated temporary directory and fail on semantic/byte drift
  ↓
build      elaborate all generated Lean modules in the pinned Lake environment
  ↓
test       fixtures, near misses, round trips, and differential checks
  ↓
audit      sorries, axioms, unsafe/native/FFI/generator trust, and claim-gate report
```

Generated files should be either fully generator-owned or composed through explicit hand-written
extension files. Do not use marker-based partial overwrites unless the marker protocol itself is
tested and cannot destroy user text. Aeneas's generated `FunsExternal_Template.lean` versus
hand-maintained `FunsExternal.lean` pattern is a useful example.

The existing Effect source scripts already model the correct first distinction: synchronization is
the networked mutation; source-lock checking is read-only. A future regeneration check should be
equally fail-closed and should not “fix” drift as part of CI.

`lean-eval` supplies a useful generated-verifier precedent: authored problem source and manifests
remain trusted inputs; per-problem comparator workspaces are derived artifacts; `generate` performs
the mutation; `check-generated-builds` verifies the derived build surface; and CI validates manifest
coverage and regenerates before checking. Foldlab should borrow this ownership shape without
assuming that `lean-eval`'s mathematical-object comparator directly establishes equivalence for
Effect programs or operational semantics.

### mise policy

Official mise documentation supports committed `mise.toml`, local uncommitted overrides,
task-specific tools, task dependency graphs, and content/environment/tool-aware caching. See
[configuration](https://mise.jdx.dev/configuration.html) and
[task configuration](https://mise.jdx.dev/tasks/task-configuration.html).

Policy interpretation for the canonical repository:

- Each `formal/<effort>/lean-toolchain` is the sole Lean version authority for
  that effort.
- Root mise pins admitted non-Lean tools; Python, Rust, `wasm-tools`, `cvc5`,
  `z3`, or formatting utilities enter only when an ordinary workflow requires
  them.
- mise tasks call effort-specific authoritative checks rather than duplicating
  their logic in several task definitions.
- Use a mise lock when loose non-Lean version constraints are accepted but CI needs exact
  resolution.
- Do not enable task caching for formal checks until every source, environment input, tool version,
  and output is declared. A false cache hit is worse than a slow proof check.
- Keep Windows and WSL installations separate. Do not share `.lake`, native binaries, FFI objects,
  opam switches, or mise caches across them.

## Native Windows, WSL, Linux CI, and Rocq

| Option | Strengths | Costs/risks | Recommended role |
| --- | --- | --- | --- |
| Native Windows | Already has exact Lean/Elan/Lake; current PowerShell gates pass; best continuity with the present workspace. | Some ML/proof-search projects prioritize Linux; Unix shell assumptions and strong process/resource isolation are less portable. | Default authoring, source study, model/proof work, and local gate. |
| WSL2 Ubuntu | Natural home for opam/Rocq, Unix-first scripts, Linux Python/ML dependencies, cgroups/sandbox experiments. | Of the target orchestration/proof tools, only opam is present; the active switch has no Coq/Rocq packages, and Lean/mise/Rocq require separate setup. `/mnt/c` and mixed artifact ownership can complicate performance and permissions. | Optional research lane with its own checkout/build state. |
| Hosted/clean Linux CI | Reproducible empty environment, well-supported Lean action, easier resource isolation and untrusted evaluator design. | CI configuration and source-lock network/cache policy must be maintained. | Required independent gate before generators, FFI, external solvers, or untrusted LLM submissions become routine. |
| Container | Stronger dependency capture and service reproducibility. | Image pins, cache layers, and host/kernel boundary add another artifact to audit. | Later for benchmark/evaluator services, not necessary for the first model. |

### Rocq decision

Choose **deferred optional research lane**.

Evidence:

- The upstream InteractionTrees repository is a Rocq/Coq package installed through opam and depends
  on `coq-paco` and `coq-ext-lib`. Running its tutorials or replaying its exact theorem inventory
  therefore requires that ecosystem.
- The repository also documents nontrivial axiom use in parts of the library. Installing Rocq does
  not automatically produce a stronger trust basis.
- PolyFun supplies the immediately relevant ITree/handler/simulation abstractions in Lean and
  currently matches Foldlab's exact Lean release.
- Effectful-Choreography supplies Lean-native endpoint-projection prior art for the later session
  and global-type direction.
- A second proof assistant creates duplicated package/version/CI/proof-style overhead before Foldlab has a
  theorem that requires it.

Promote Rocq from deferred to active only if one of these becomes true:

1. a specific upstream ITree or Paco theorem must be executed or ported;
2. a cross-prover correspondence experiment is an explicit deliverable;
3. a relevant session-type mechanization exists only in Rocq and its proof artifacts are needed;
4. Lean's available coinduction/ITree substrate blocks a frozen theorem after a documented spike.

If promoted, use the existing WSL opam as the seed, pin an opam switch and package lock/export, keep
Rocq files in a separate package/lane, and do not let its success substitute for the Lean claim gate.

## Staged adoption plan

### Stage 0 — retain the passing baseline

- Keep the current Lean/Effect pins and `check.ps1` unchanged.
- Record this research note as background only.
- Use the existing claim ladder for every new theorem.

Exit: repeatable local baseline remains green.

### Stage 1 — clean independent build

- Add a Linux CI job that runs the exact current gate from a clean checkout.
- Add an explicit periodic/no-cache variant.
- Do not add Mathlib, Pantograph, mise config, Rocq, or generators in the same change.

Exit: local Windows and clean Linux agree on the current formal package.

### Stage 2 — semantics substrate spike

- In an isolated branch, pin a PolyFun commit/tag compatible with Lean 4.33.1.
- Import only the smallest ITree/event/handler/simulation modules needed for one neutral example.
- Measure dependency graph, cache/build cost, axiom sweep, public API stability, and notation clashes.
- Compare reuse with a minimal project-owned ITree interface; do not decide by line count alone.

Exit: written adopt/reject record with a compiling example and trust/dependency inventory.

### Stage 3 — canonical descriptor and interpreter contract

- Freeze the first descriptor kinds, well-formedness judgment, observation, executable interpreter,
  and relational semantics.
- Prove one soundness connection and one nontrivial equivalence/refinement theorem.
- Keep Effect source correspondence at G1/G2 until fixtures or translation evidence exist.

Exit: one complete statement-to-proof-to-claim-gate path.

### Stage 4 — checked source ingestion/regeneration

- Choose TypeScript compiler API as semantic source authority and tree-sitter only if incremental
  indexing/source maps are materially useful.
- Implement the regeneration contract and non-mutating drift check.
- Add differential fixtures against the pinned Effect slice.

Exit: generated artifacts can be deleted, deterministically regenerated, built, tested, and audited
in CI without editing hand-owned files.

### Stage 5 — LLM evaluation harness

- Freeze an internal target set not indexed by the agent.
- Separate challenge/submission files; enforce exact statement and axiom policies.
- Record every model, prompt, retrieval, candidate, Lean call, and budget.
- Compare the installed LSP-first agent workflow with a simple whole-proof baseline before adding
  Pantograph/LeanDojo infrastructure.

Exit: reproducible report with denominators, unsuccessful candidates, costs, and independent review.

### Stage 6 — distributed/global/stream semantics

- Add topology and delivery semantics before global projection claims.
- Use PolyFun/Effectful-Choreography/Veil as comparative models.
- State fairness, buffering, cancellation, failure, and stream observations explicitly.
- Activate Rocq only if a named theorem or comparative mechanization requires it.

Exit: a projection or interpreter preservation theorem over a declared asynchronous observation.

## Source index

### Lean, Lake, and proof practice

- [Lean Language Reference](https://lean-lang.org/doc/reference/latest/)
- [Managing Toolchains with Elan](https://lean-lang.org/doc/reference/latest/Build-Tools-and-Distribution/Managing-Toolchains-with-Elan/)
- [Lake](https://lean-lang.org/doc/reference/latest/Build-Tools-and-Distribution/Lake/)
- [Elaboration and Compilation](https://lean-lang.org/doc/reference/latest/Elaboration-and-Compilation/)
- [Inductive Types](https://lean-lang.org/doc/reference/latest/The-Type-System/Inductive-Types/)
- [Validating a Lean Proof](https://lean-lang.org/doc/reference/latest/ValidatingProofs/)
- [The Lean 4 Theorem Prover and Programming Language](https://lean-lang.org/papers/lean4.pdf)
- [leanprover/lean-action](https://github.com/leanprover/lean-action)
- [Mathlib contribution guidance](https://leanprover-community.github.io/contribute/)
- [Searching for Theorems in Mathlib](https://leanprover-community.github.io/blog/posts/searching-for-theorems-in-mathlib/)
- [Metaprogramming in Lean 4](https://github.com/leanprover-community/lean4-metaprogramming-book)
- [cameronfreer/lean4-skills](https://github.com/cameronfreer/lean4-skills)

### Semantics, languages, and transformation systems

- [Executable Denotational Semantics with Interaction Trees](https://repository.upenn.edu/server/api/core/bitstreams/9eaac6e3-ba5a-4f8e-b2c9-9c68c28881aa/content#page=14.58)
- [DeepSpec/InteractionTrees](https://github.com/DeepSpec/InteractionTrees)
- [Verified-zkEVM/PolyFun](https://github.com/Verified-zkEVM/PolyFun)
- [LTeuse/Effectful-Choreography](https://github.com/LTeuse/Effectful-Choreography)
- [cajal-technologies/talos](https://github.com/cajal-technologies/talos)
- [verse-lab/veil](https://github.com/verse-lab/veil)
- [strata-org/Strata](https://github.com/strata-org/Strata)
- [MLIR Language Reference](https://mlir.llvm.org/docs/LangRef/)
- [opencompl/lean-mlir](https://github.com/opencompl/lean-mlir)
- [Verifying Peephole Rewriting in SSA Compiler IRs](https://arxiv.org/abs/2407.03685)
- [Aeneas](https://github.com/AeneasVerif/aeneas)
- [Aeneas: Rust Verification by Functional Translation](https://arxiv.org/abs/2206.07185)
- [Cedar specification and DRT](https://github.com/cedar-policy/cedar-spec)
- [Lean4Lean](https://github.com/digama0/lean4lean)
- [tree-sitter](https://tree-sitter.github.io/tree-sitter/)
- [predictable-machines/lean4-tree-sitter](https://github.com/predictable-machines/lean4-tree-sitter)
- [predictable-machines/lean4-json-schema](https://github.com/predictable-machines/lean4-json-schema)
- [lambdaclass/concrete](https://github.com/lambdaclass/concrete)

### LLM proving, formalization, and evaluation

- [Pantograph paper](https://arxiv.org/abs/2410.16429) and
  [repository](https://github.com/leanprover/Pantograph)
- [LeanDojo paper](https://arxiv.org/abs/2306.15626),
  [original repository](https://github.com/lean-dojo/LeanDojo),
  [LeanDojo-v2](https://github.com/lean-dojo/LeanDojo-v2), and
  [ReProver](https://github.com/lean-dojo/ReProver)
- [Lean Copilot paper](https://arxiv.org/abs/2404.12534) and
  [repository](https://github.com/lean-dojo/LeanCopilot)
- [AlphaProof Nexus paper](https://arxiv.org/abs/2605.22763),
  [results](https://github.com/google-deepmind/alphaproof-nexus-results), and
  [formal conjectures](https://github.com/google-deepmind/formal-conjectures)
- [DeepSeek-Prover-V2](https://github.com/deepseek-ai/DeepSeek-Prover-V2)
- [Type-Constrained Code Generation paper](https://arxiv.org/abs/2504.09246) and
  [artifact](https://github.com/eth-sri/type-constrained-code-generation)
- [ProofNet](https://arxiv.org/abs/2302.12433)
- [Improving Autoformalization using Type Checking](https://arxiv.org/abs/2406.07222)
- [PutnamBench paper](https://arxiv.org/abs/2407.11214) and
  [repository](https://github.com/trishullab/PutnamBench)
- [Faults in Our Formal Benchmarking](https://arxiv.org/abs/2606.29493) and
  [checkers](https://github.com/Shashi456/atp-checkers)
- [lean-eval repository](https://github.com/leanprover/lean-eval) and
  [security architecture](https://github.com/leanprover/lean-eval/blob/main/SECURITY.md)
- [Comparator Live](https://github.com/leanprover/comparator-live)
- [SafeVerify](https://github.com/GasStationManager/SafeVerify)

### Environment orchestration

- [mise configuration](https://mise.jdx.dev/configuration.html)
- [mise task configuration](https://mise.jdx.dev/tasks/task-configuration.html)

## Unresolved gaps

- PolyFun's exact transitive manifest, axiom-sweep output, and build cost have not been reproduced
  inside Foldlab; only its current primary repository, configuration, and documented claims were
  inspected.
- Pantograph has not been built against Lean 4.33.1. Its current root toolchain differs.
- No clean CI receipt exists for Foldlab yet; the current full gate receipt is native Windows only.
- The TypeScript compiler API and Effect source extraction path have not been prototyped.
- No internal, contamination-controlled LLM theorem benchmark has been defined.
- No model/provider compute or data-governance policy has been chosen.
- No Rocq package has been installed or tested in the inspected WSL opam switch.
- No cross-platform deterministic regeneration experiment exists yet.
- Tool and repository maturity changes quickly. All adoption decisions should pin commits and
  reproduce documented claims rather than rely on `main` README text.

This note evaluates roughly 30 directly relevant tools/repositories and more than 40 primary
documentation, paper, and artifact links. It intentionally does not recommend a broad installation
wave: the first useful tooling change is a clean independent CI reproduction, followed by one
isolated PolyFun compatibility spike.
