# Language verification ecosystems: a multi-crown first edition

**Status:** living research note; first edition  
**Snapshot date:** 2026-08-24  
**Evidence policy:** primary sources only—official specifications, documentation, repositories, and original project papers  
**Scope:** representative high-assurance tools and efforts, not an unqualified popularity ranking

## Executive synthesis

There is no single “highest tier” of language verification. At least five different crowns matter:

| Crown | Question answered | Representative artifact | What it does **not** answer by itself |
|---|---|---|---|
| **A. Source-program verification** | Does this source program satisfy these contracts or safety properties in a stated source semantics? | contracts, verification conditions, solver results, proof terms | whether the production compiler/runtime preserves the result |
| **B. Verified language/compiler/runtime** | Does a compiler, interpreter, runtime, or language implementation preserve a formal semantics? | mechanized compiler proof, verified checker/interpreter, refinement theorem | whether a particular application meets its domain specification |
| **C. Deployed verified exemplar** | Has a consequential system or library been verified and connected to a deployed artifact? | checked development plus build, provenance, and deployment evidence | a general guarantee for all programs in the language |
| **D. Formal semantics/conformance** | Is there a precise, executable, or mechanized account of the language or intermediate representation? | normative rules, mechanized semantics, executable reference model, conformance suite | correctness of arbitrary implementations unless correspondence is proved or validated |
| **E. Concurrency/protocol verification** | Are temporal, distributed, concurrent, or adversarial behaviors covered? | transition-system model, invariant/liveness proof, schedule exploration, concurrent separation-logic proof | source or binary conformance unless the model-to-implementation bridge is established |

The most complete assurance cases combine several crowns, but even their guarantees are local. CompCert has an unusually strong compiler-preservation theorem; VST verifies selected C programs against CompCert's Clight semantics; seL4 connects Isabelle/HOL specifications to C and, for defined configurations, binary and security theorems. None of those facts turns “C” into a verified language globally. The same caution applies to RustBelt, Verify Rust Std, Project Everest, CakeML, Perennial, and every other exemplar below.

For Foldlab, three conclusions dominate:

1. **Track relations, not badges.** A theorem accepted by Lean or Rocq establishes logical validity in that formal environment. It does not establish correspondence to Effect TypeScript source, preservation through a translation, or behavior of emitted JavaScript. Those are separate claims and artifacts.
2. **Use multiple verification lanes.** Deductive proofs, bounded model checking, abstract interpretation, property testing, runtime checking, and conformance fixtures find different failures. They should be composed without calling them equivalent.
3. **Treat the global model as a canonical entity.** TLA+, P, Ivy, Veil, Quint/Apalache, and session/choreography work are immediately relevant to n-ary human/agent flows. They operate at model level unless a generated implementation or separately justified projection connects them to source and runtime behavior.

This note uses Foldlab's
[claim-gate registry](../effect-typescript-semantics/CLAIM-GATES.md) and
[charter](../../CHARTER.md). Its G0–G5 grades are **not** tool prestige levels:
G0 pins source; G1 records a model; G2 checks theorems in that model; G3
establishes source conformance for a slice; G4 establishes semantics
preservation for a translation; and G5 connects to runtime artifacts and
observations. A project may be exemplary at Crown A or D while remaining G2
for a particular Foldlab claim.

## Selection and reading rules

### Inclusion criteria

An entry belongs in this first edition when primary evidence supports at least one of the following:

- a maintained verifier with a stated source or IR semantics and a reproducible checking workflow;
- a mechanized preservation, soundness, refinement, or functional-correctness theorem;
- a major deployed or evaluated verified artifact with documented assumptions;
- an official or research-grade formal semantics with clear language-version coverage;
- a protocol/concurrency tool whose checked model and exploration/proof method are explicit;
- an important negative boundary: a widely used analyzer that is commonly mistaken for deductive verification.

The ordering below is therefore **relevance- and evidence-based**, not a claim about popularity. “Established” means long-lived use, stable documentation, substantial case studies, or official adoption. “Active specialist” means maintained and serious but narrower. “Research frontier” means valuable and active with material coverage or trust-boundary limitations. “Historical” means influential prior art without a current general-purpose production path.

The document uses four **evidence/maturity tiers**, always per project and crown rather than per language:

| Tier | Operational meaning |
|---|---|
| **M1 — crown exemplar** | Checked results plus an unusually strong semantic or deployment chain, with material assumptions and exclusions published. |
| **M2 — established operational tool** | Maintained, documented, reproducible verifier or semantics platform with substantial use/case studies, but not necessarily end-to-end. |
| **M3 — active research specialist** | Serious current implementation and mechanized/reproducible results, with narrower coverage or larger correspondence gaps. |
| **M4 — historical or adjacent evidence** | Influential prior art, ordinary static/testing analysis, or an older language model that must not be presented as current deductive coverage. |

M1 is not intrinsically “more formal” than M2: a kernel-checked language-model theorem may be logically stronger than a deployed bounded-checking campaign while addressing a different crown. These tiers are also non-equivalent to Foldlab G0–G5 and SPARK's Stone–Platinum vocabulary.

### Verification modalities are not interchangeable

| Modality | Positive result can establish | Typical boundary |
|---|---|---|
| Kernel-checked deductive proof | theorem follows from definitions, imported axioms, and the kernel's rules | adequacy of definitions; parser/elaboration; extraction/compilation |
| SMT-backed deductive verification | generated verification conditions are valid in the solver theory | source-to-VC encoding, solver trust, triggers, admitted/assumed contracts |
| Explicit-state model checking | no violating state in the explored finite state graph | state abstraction, finite parameters, state explosion |
| Bounded symbolic model checking | no counterexample within the stated unwind/depth/domain bounds | bounds and environmental model; not generally a global proof |
| Abstract interpretation | absence of a class of alarms under a sound abstract semantics | modeled library/environment, widening precision, configuration |
| Refinement/dependent/effect typing | terms satisfy the propositions/refinements enforced by that type system | expressiveness, trusted primitives, erasure/runtime boundary |
| Runtime assertion/checking | observed executions satisfy monitored properties | unobserved inputs, schedules, and paths |
| Property-based/systematic testing | no counterexample was found by the generated/explored tests | coverage and generator/scheduler completeness |

### Artifact checklist

For any result worth preserving, record: pinned source and tool versions; the exact property; modeled semantics; assumptions/axioms; frontend and translation chain; proof or solver artifacts; replay command; counterexample/trace format; and the connection, if any, to a built runtime artifact. This follows the open-standards analysis in [Formal artifact grades and open standards](formal-artifact-grades-open-standards.md): logical validity, correspondence, preservation, execution, provenance, and reproducibility are independent dimensions.

## Cross-language map

An em dash means “no comparably established entry identified in this first-edition primary-source sweep,” not impossibility.

| Language / target | A. Source verifier | B. Verified implementation | C. Notable exemplar | D. Semantics / conformance | E. Concurrency / protocol | First-edition reading |
|---|---|---|---|---|---|---|
| C | Frama-C/WP, VST, VeriFast | CompCert | seL4, HACL*/EverCrypt, Fiat Crypto | Cerberus; CompCert C/Clight models | VST concurrency; model-level tools | unusually broad general-purpose ecosystem, with explicit front/back boundaries |
| C++ | ESBMC, CBMC, VeriFast | — | bounded industrial case studies | ISO prose; partial research frontends | bounded schedule/thread analyses | capable but fragmented; full modern C++ semantics remains a hard boundary |
| Rust | Verus, Kani, Creusot, RefinedRust | verified subsets/translations, not rustc as a whole | Verify Rust Std; RustBelt library results | FLS, RustBelt, Aeneas/Charon | Iris/RefinedRust; model-level tools | fastest-growing multi-tool ecosystem; translation and compiler gaps remain |
| Ada/SPARK | GNATprove | qualified toolchains are not the same as a verified compiler | industrial SPARK systems | Ada RM + SPARK subset rules | tasking profiles plus proof/modeling | explicit integrated industrial assurance vocabulary |
| Go | Gobra | Goose/Perennial verified model and selected compiler paths, not the Go toolchain | Perennial/Grove systems; VerifiedSCION | GooseLang for translated subset | Perennial/Grove | excellent distributed-systems proof laboratory with a deliberate source subset |
| Java/JVM | KeY, OpenJML, VeriFast | — | Java Card and verified-library case studies | JLS/JVM specs plus tool-specific models | Java Pathfinder, VerCors | mature source verifiers; mainstream JVM remains outside the proof |
| C#/.NET | — | — | P/Coyote-derived production validation | ECMA specs, Boogie-level models | Coyote, P | main mature lane found is systematic concurrency testing/modeling, not direct deductive C# proof |
| Kotlin/JVM | ESBMC-Jimple research path | — | — | Kotlin specification is partly experimental/platform-dependent | — | honest gap; JVM tools may apply only after a justified frontend boundary |
| Haskell | LiquidHaskell, hs-to-rocq | GHC is not verified; CakeML is a different language | verified Haskell libraries/case studies | GHC Core and translation-specific models | testing/model-level tools | strong refinement and proof-translation work, weak end-to-end compiler guarantee |
| OCaml | Cameleer, CFML | — | verified data structures/libraries | Gospel contracts; tool models | — | strong source deductive ecosystem with generator/translation boundaries |
| Scala | Stainless | — | Stainless-verified libraries/systems | Stainless Pure Scala subset | Stainless state/imperative subset; model tools | unusually coherent source verifier for a substantial subset |
| F# | F7 (historical) | — | miTLS-era F7 results | — | F7 protocol reasoning | influential precursor to F*; no comparable current native F# lane found |
| Erlang/Elixir | — | — | — | BEAM/language prose; research models | Concuerror; model/property testing | concurrency analysis is valuable, but not general deductive verification |
| Python | Nagini | — | — | Python spec plus verifier subset models | CrossHair exploration | useful subset verifier and symbolic testing; no verified CPython bridge |
| JavaScript/TypeScript | JaVerT (research), refinement prototypes | — | — | ECMAScript normative spec; JSCert/KJS historical ES5 models | choreography/model tools | critical Foldlab gap; TypeScript explicitly does not promise soundness |
| Solidity/EVM | SMTChecker, Certora | — | verified production contracts | KEVM; EVM specifications | temporal/rule verification | strong contract-focused tools; compiler, bytecode, chain environment are separate boundaries |
| Move | Move Prover | bytecode verifier, not a fully verified compiler/runtime | deployed Move modules with project-specific proofs | Move bytecode model/spec language | model-level protocol tools | resource typing plus deductive contracts is compelling, but not end-to-end by default |
| WebAssembly | Wasm logics / WasmCert components | verified interpreters/checkers in research, not mainstream engines | verified Wasm components are emerging | official formal spec/SpecTec; WasmCert | model/program logics | unusually developed official formal-semantics path for a portable low-level target |
| LLVM/MLIR | Alive2 (translation validation) | Vellvm verified subset/transformations | optimizer bug finding and checked rewrites | Vellvm; Lean-MLIR dialect models | — | LLVM has strong refinement checking; MLIR still lacks one global semantics |

## Language profiles

### C

| Tool / effort | Crown and claim | Artifact / checker | Boundary, maturity, limitation, and Foldlab relevance |
|---|---|---|---|
| [Frama-C](https://www.frama-c.com/) with [ACSL](https://frama-c.com/acsl.html) | A. WP proves ACSL contracts deductively; Eva computes sound abstract interpretations; E-ACSL checks assertions at runtime. | WP emits VCs to supported provers; Eva produces analysis results and alarms; E-ACSL produces instrumented executions. | Established, extensible platform. Each plugin has a different guarantee, and libc/environment models matter. Its separation of specification, proof, abstract interpretation, and monitoring is an excellent artifact taxonomy for Foldlab. |
| [Verified Software Toolchain (VST)](https://github.com/PrincetonUniversity/VST) | A/E. Separation-logic proofs of functional correctness for C/Clight, including concurrency libraries. | Rocq proof scripts and kernel-checked theorem objects over CompCert semantics. | Established research/teaching platform. `clightgen`, preprocessing, compiler version, external calls, and the C-to-Clight connection are explicit boundaries. A useful model for composing user specifications with a verified semantic stack. |
| [CompCert](https://compcert.org/man/manual001.html) | B/D. Machine-checked semantic preservation from CompCert's elaborated C program through verified passes to assembly semantics. | Rocq development plus extracted compiler. | Crown-level exemplar, maintained; [3.17 was released in February 2026](https://compcert.org/download.html). The manual explicitly places preprocessing, parsing/elaboration, assembling, and linking outside the central theorem and describes some unverified algorithms. Foldlab should copy this honesty about pass-by-pass and endpoint scope. |
| [Cerberus](https://www.cl.cam.ac.uk/~pes20/cerberus/) | D. Executable formal model for a substantial C11 fragment, designed to expose standard ambiguities and test small examples. | Executable semantics and exploration tools; [WG14 project paper](https://www.open-std.org/jtc1/sc22/wg14/www/docs/n2311.pdf). | High-value research semantics, not the normative ISO C text and not an implementation proof. It shows how an executable meaning model can mediate between prose standards, tests, and proof. |

**Crown exemplar—seL4.** The [seL4 proof overview](https://sel4.systems/Verification/proofs.html) separates functional correctness, security, and binary verification, while the [verified-configuration matrix](https://docs.sel4.systems/projects/sel4/verified-configurations.html) records architecture/configuration coverage. This is a deployed-system Crown C, not a claim about every seL4 configuration or every C program; the repository's [caveats](https://github.com/seL4/seL4/blob/master/CAVEATS.md) are part of the assurance case.

### C++

| Tool / effort | Crown and claim | Artifact / checker | Boundary, maturity, limitation, and Foldlab relevance |
|---|---|---|---|
| [ESBMC](https://github.com/esbmc/esbmc) | A/E. Bounded model checking and k-induction for assertions, memory safety, arithmetic, and selected concurrency properties. | C/C++ frontend, goto-style IR, SMT formulas, counterexample traces. | Active and substantial; its [language support documentation](https://esbmc.github.io/docs/c-cpp/) states supported C/C++ versions and limitations. A successful bounded run is conditional on bounds, modeled libraries, and frontend coverage. |
| [CBMC](https://github.com/diffblue/cbmc) | A. Bit-precise bounded verification of C/C++ assertions and runtime-safety properties. | GOTO programs, SAT/SMT solving, counterexample traces; see the [original/current tool paper](https://arxiv.org/abs/2302.02384). | Established bounded verifier. Loops, recursion, environment, and concurrency require explicit bounds or completeness arguments; no source-wide correctness follows from one harness. |
| [VeriFast](https://github.com/verifast/verifast) | A/E. Modular separation-logic verification of annotated C and selected C++/Java/Rust subsets. | Symbolic execution against contracts, predicates, lemmas, and proof obligations. | Long-lived research tool with predictable automation. C++ coverage is deliberately narrower than the language, and the verifier/frontend is trusted rather than kernel-certified. |
| [Frama-Clang](https://www.frama-c.com/download/frama-clang-manual-0.0.7.pdf) | A, research bridge. Translates a documented C++ subset plus ACSL++ toward Frama-C. | Clang-based frontend to Frama-C models and plugins. | Useful evidence that the C verification stack can be extended, but its own manual documents unsupported C++/annotation features. It should not be presented as full Frama-C coverage for modern C++. |

The first-edition conclusion is fragmentation, not absence: C++ has strong bounded and modular tools, but templates, exceptions, object lifetime, undefined behavior, evolving standards, and compiler conformance prevent a single broad Crown A/B claim.

### Rust

| Tool / effort | Crown and claim | Artifact / checker | Boundary, maturity, limitation, and Foldlab relevance |
|---|---|---|---|
| [Verus](https://github.com/verus-lang/verus) | A/E. Functional correctness, invariants, ghost state, and selected concurrent reasoning for a Rust-derived language/subset. | `spec`/`proof`/`exec` modes; Rust HIR is translated through VIR/AIR to SMT obligations. | Active specialist. Solver success depends on the frontend and VC encoding; supported Rust and trusted/unsafe boundaries are explicit. Its coexistence of executable, specification, and proof terms is directly relevant to a user-land description object. |
| [Kani](https://github.com/model-checking/kani) | A. Bit-precise bounded model checking of Rust proof harnesses, including panics, arithmetic, memory, and user assertions. | Rust compiler MIR path to CBMC/SAT-SMT with counterexamples; see the [project paper](https://arxiv.org/abs/2607.01504). | Active and integrated with Rust workflows. Results quantify over harness inputs but remain conditional on loop/recursion bounds, supported features, and the MIR/backend encoding. |
| [Creusot](https://github.com/creusot-rs/creusot) | A. Deductive verification of contracts, panic freedom, arithmetic obligations, and functional properties for a safe-Rust subset. | Rust frontend to Coma/Why3, Why3 proof sessions, SMT/interactive provers; [architecture](https://github.com/creusot-rs/creusot/blob/master/ARCHITECTURE.md). | Research-active. Safe Rust coverage and library models are narrower than rustc; the source-to-Why3 translation is a substantive trust/correspondence boundary. |
| [RefinedRust](https://plv.mpi-sws.org/refinedrust/) | A/D/E. Foundational verification of safe and unsafe Rust using refinement types and Iris-style separation logic. | Generated Rocq/Iris proofs checked by the Rocq kernel. | Research frontier with a small trusted proof kernel; annotation generation and Rust translation remain boundaries. It is unusually relevant to meaning-preserving refinements and effectful ownership reasoning. |

**Operational-profile case—Verify Rust Std.** [Verify Rust Std](https://model-checking.github.io/verify-rust-std/intro.html) is not one verifier or one proof format. Its [general rules](https://model-checking.github.io/verify-rust-std/general-rules.html) define a governed, pinned standard-library campaign with multiple tools, proof criteria, CI expectations, and review. The 2026 [project paper](https://arxiv.org/abs/2606.17374) records the campaign's methods and results. This is valuable prior art for a verification profile: property, target, tool, bounds, ownership, and replay are made operational. It does not make different tools' successes semantically equivalent, and it does not by itself verify rustc or downstream binaries.

**Semantic boundary.** The [Ferrocene Language Specification](https://github.com/rust-lang/fls) is an officially adopted specification effort, but its [scope text](https://rust-lang.github.io/fls/general.html) does not make it the normative definition over rustc behavior. [RustBelt](https://plv.mpi-sws.org/rustbelt/) gives a foundational semantic soundness account for a Rust subset and key unsafe abstractions in Iris/Rocq; that is a language-model theorem, not rustc conformance. [Charon](https://github.com/AeneasVerif/charon) extracts a MIR-like LLBC representation and [Aeneas](https://github.com/AeneasVerif/aeneas) translates it into Lean, F*, Rocq, or HOL4. Proofs in those targets can be strong, while the Rust→LLBC→target relation remains an independent G3/G4 obligation. The projects explicitly describe alpha status and unsupported/edge cases, so “translation succeeded” is not “verified compiler.”

### Ada / SPARK

| Tool / effort | Crown and claim | Artifact / checker | Boundary, maturity, limitation, and Foldlab relevance |
|---|---|---|---|
| [SPARK and GNATprove](https://docs.adacore.com/spark2014-docs/pdf/spark2014_ug.pdf) | A/E. Language-subset checking, initialization/data-flow proof, absence of run-time errors, contracts, functional properties, and selected tasking reasoning. | Flow analysis plus Why3-generated VCs discharged by automatic or interactive provers; proof reports retain unproved/justified obligations. | Established industrial ecosystem. Guarantees apply to code in the SPARK subset/scopes, under imported contracts, prover results, and toolchain assumptions. Qualification evidence and formal verification are related assurance mechanisms, not identical. |

SPARK supplies important prior-art vocabulary. Its guide defines cumulative **Stone, Bronze, Silver, Gold, and Platinum** assurance levels: valid SPARK; initialization/correct data flow; absence of run-time errors; selected integrity properties; and full functional correctness. These are outcome-oriented project levels, useful for communicating effort and coverage. They are **not equivalent** to Foldlab G0–G5: for example, SPARK Silver is a property class, while Foldlab G3 is a correspondence relation. Foldlab should keep both dimensions if it later profiles SPARK-like artifacts.

### Go

| Tool / effort | Crown and claim | Artifact / checker | Boundary, maturity, limitation, and Foldlab relevance |
|---|---|---|---|
| [Gobra](https://github.com/viperproject/gobra) | A/E. Modular verification of contracts, memory permissions, data races, and functional properties for a substantial Go subset. | Go annotations translated to Viper; Silicon/Carbon and SMT discharge the obligations. | Active research verifier with nontrivial applications. The Go→Viper encoding, supported subset, specs for libraries, and solver are in the trusted chain. |
| [Perennial](https://github.com/mit-pdos/perennial) and [Goose](https://github.com/goose-lang/goose) | A/C/E. Concurrent separation-logic proofs for crash-safe, distributed, and storage systems written in a disciplined Go subset. | Goose translates Go into GooseLang/Rocq; Perennial supplies Iris-derived logics and kernel-checked proofs. | Crown-level research exemplars, including Grove-related distributed systems. Goose's translator and subset correspondence are boundaries rather than a verified Go compiler. This is a prime Foldlab model for global protocol invariants plus local implementation proofs. |

Gobra and Goose are complementary: one emphasizes automated source contracts; the other supports foundational proofs of hard concurrent systems. Neither verifies the general Go compiler/runtime. VerifiedSCION case studies in the [Gobra repository](https://github.com/viperproject/gobra) are deployment signals, not a blanket statement about all SCION or Go code.

### Java / JVM

| Tool / effort | Crown and claim | Artifact / checker | Boundary, maturity, limitation, and Foldlab relevance |
|---|---|---|---|
| [KeY](https://keyproject.github.io/key-docs/user/) | A. Deductive verification of JML-annotated Java using Java Dynamic Logic, including functional and object-oriented properties. | Interactive/automatic proof trees and replayable KeY proof sessions. | Established verifier with deep Java semantics. Supported Java/JML versions, library models, proof rules, and the JVM/compiler boundary must be recorded. |
| [OpenJML](https://www.openjml.org/) | A. JML contract checking and SMT-backed deductive verification for Java. | Source annotations, generated verification conditions, solver outcomes/counterexamples; [OpenJML paper](https://arxiv.org/abs/1404.6608). | Active and accessible. The JML-to-VC encoding, solver, modeled APIs, and unproved assumptions are central to the claim. |
| [Java Pathfinder](https://software.nasa.gov/software/ARC-17487-1) | E/A for finite models. Explicit-state exploration of Java bytecode executions for assertions, deadlocks, exceptions, and custom properties. | Search graph, listeners/property monitors, counterexample traces; [NASA project report](https://ntrs.nasa.gov/citations/20100010932). | Established research/mission tool. State explosion and native/environment abstractions limit completeness; bytecode exploration does not establish source semantics or arbitrary production-JVM equivalence. |
| [VeriFast](https://github.com/verifast/verifast) | A/E. Separation-logic verification for a documented Java subset. | Contracts, predicates, lemma functions, symbolic execution. | Valuable alternative proof discipline, but narrower language/library coverage than KeY/OpenJML. |

### C# / .NET

| Tool / effort | Crown and claim | Artifact / checker | Boundary, maturity, limitation, and Foldlab relevance |
|---|---|---|---|
| [Coyote](https://github.com/microsoft/coyote) | E, systematic testing. Finds safety/liveness/concurrency bugs by controlling and repeatedly exploring asynchronous schedules. | Instrumented .NET execution, scheduler strategies, reproducible traces; [documentation](https://microsoft.github.io/coyote/get-started/using-coyote/). | Active and production-informed, but its documentation presents systematic testing, not theorem proving. Results cover explored schedules under Coyote's instrumentation and controlled APIs. Excellent trace/replay prior art for agent flows. |
| [P](https://p-org.github.io/P/) | E, model/generation. State-machine language for asynchronous systems with model checking, runtime monitoring, and generated executable code. | P models, explored schedules/traces, generated targets and monitors. | Strong protocol methodology with industrial history. Claims about a handwritten C# service require a conformance bridge; generated components inherit only the documented backend assumptions. |
| [Boogie](https://github.com/boogie-org/boogie) | A infrastructure, not a C# source verifier. Verification IR and VC generator used by multiple frontends. | Boogie procedures/specifications translated to SMT. | Mature verification infrastructure. A theorem about translated Boogie is only as source-relevant as the C# frontend/encoding; no current broadly adopted direct C# deductive frontend was identified in this sweep. |

The honest Crown A/B result for general C# is a gap. Dafny can compile to C# and uses Boogie, but it verifies Dafny programs, not arbitrary C# source, and its C# backend is a separate translation boundary.

### Kotlin / JVM

The [Kotlin specification](https://kotlinlang.org/spec/introduction.html) describes parts of the specification as experimental and notes platform-dependent behavior. [ESBMC's Kotlin/Jimple work](https://arxiv.org/abs/2206.04397) provides a research bounded-model-checking path through Soot's Jimple IR. That can establish bounded properties of supported translated programs; it does not provide a broad source-deductive Kotlin ecosystem or a verified Kotlin/JVM compiler chain. Ordinary Kotlin nullability and static checking are valuable but do not fill Crown A. This is a marked gap for a later language-specific audit.

### Haskell

| Tool / effort | Crown and claim | Artifact / checker | Boundary, maturity, limitation, and Foldlab relevance |
|---|---|---|---|
| [LiquidHaskell](https://github.com/ucsd-progsys/liquidhaskell) | A. Refinement-type checking of functional correctness, termination, and selected safety properties. | GHC plugin extracts Core, generates refinement constraints, and discharges them with SMT; [documentation](https://ucsd-progsys.github.io/liquidhaskell/). | Established research tool with real libraries. The supported GHC version, Core extraction, reflected definitions, measures, assumptions, and SMT solver form the boundary. GHC code generation is not verified by a LiquidHaskell success. |
| [hs-to-rocq](https://github.com/plclub/hs-to-rocq) | A/D bridge. Translates a substantial Haskell subset into Rocq for semantic and functional proofs. | Generated Gallina plus Rocq proof developments. | Active successor naming to hs-to-coq. Proof terms are kernel checked, but the Haskell→Rocq translation and supported-language restrictions determine source correspondence. |

Haskell's pure core makes equational reasoning unusually productive, but laziness, bottoms, type classes, unsafe primitives, FFI, and GHC transformations matter. CakeML and PureCake are nearby verified-functional-language exemplars, not a verified GHC replacement and not evidence about arbitrary Haskell source.

### OCaml

| Tool / effort | Crown and claim | Artifact / checker | Boundary, maturity, limitation, and Foldlab relevance |
|---|---|---|---|
| [Gospel](https://ocaml-gospel.github.io/gospel/faq) + [Cameleer](https://arxiv.org/abs/2104.11050) | A. Gospel specifies OCaml interfaces; Cameleer translates supported OCaml/Gospel to WhyML for deductive verification. | Why3 proof obligations and proof sessions, discharged by automatic or interactive provers. | Active ecosystem. Gospel alone checks specification well-formedness rather than proving implementations; Cameleer's frontend/translation, supported effects, and Why3/prover chain are explicit boundaries. |
| [CFML](https://www.chargueraud.org/softs/cfml/) | A. Interactive separation-logic verification of OCaml programs, including full functional correctness of supported programs. | Generated characteristic formulae plus Rocq proofs. | Established research framework. The formula generator is external to the kernel and historically introduces the program formula as a logical interface; source parsing/generation and OCaml compiler behavior are separate from the checked proof. |

The [Gospel ecosystem paper](https://arxiv.org/abs/2407.17289) usefully separates static deduction (Cameleer/CFML) from Ortac runtime assertion/property checking. Foldlab should preserve that same distinction when combining theorem proving with generated Effect/Schema fixtures.

### Scala

[Stainless](https://epfl-lara.github.io/stainless/intro.html) is the clear first-edition Crown A entry. It verifies contracts, termination, arithmetic/memory-safety conditions, and functional properties for a documented Pure Scala and imperative subset by applying source transformations and reducing obligations through Inox to SMT. Its counterexamples and integration make it operationally strong; its source subset, transformation soundness, solver theories, and runtime/Scala compiler remain the claim boundary. Stainless is particularly relevant to Foldlab because it treats ordinary-looking functional programs as both executable descriptions and theorem-bearing objects without pretending the entire Scala ecosystem is verified.

### F#

[F7](https://www.microsoft.com/en-us/research/project/f7-refinement-types-for-f/) is influential historical Crown A/E prior art: refinement-typed interfaces for F# generated conditions for Z3 and were applied to security-protocol code, including the miTLS line. It led conceptually to F*. No comparably current, general-purpose native-F# deductive verifier was identified from primary sources in this sweep. [FsCheck](https://fscheck.github.io/FsCheck/) is excellent property-based testing, but generated tests are not deductive proof. New Foldlab work should study F* directly while treating F# interoperation as a separate translation/runtime problem.

### Erlang / Elixir

| Tool / effort | Crown and claim | Artifact / checker | Boundary, maturity, limitation, and Foldlab relevance |
|---|---|---|---|
| [Dialyzer](https://www.erlang.org/doc/apps/dialyzer/dialyzer.html) | Adjacent static analysis. Finds type discrepancies and other defects using success typing. | BEAM/Core analysis, warnings, PLT cache. | Established BEAM tooling. Success typing intentionally differs from a sound “well typed implies no type error” proof discipline; absence of warnings is not full correctness. |
| [Concuerror](https://concuerror.com/) | E, stateless model checking. Systematically explores supported Erlang process schedules to find concurrency errors, deadlocks, and races. | Exploration runs and reproducible schedules/traces. | Valuable specialist tool. Completeness depends on supported Erlang behavior, input/domain choices, scheduling bounds, and external effects. |
| [PropEr](https://github.com/proper-testing/proper) | Testing, including state-machine/property testing. | generators, properties, shrunk counterexamples. | Established testing ecosystem, not proof. It is highly relevant as a G1/G3 fixture generator and falsification lane. |

Elixir's emerging gradual/set-theoretic typing work is important language design, but it is not yet a general deductive verifier for BEAM applications. The gap is especially relevant to Foldlab: actors and supervision make global temporal models useful, while source/runtime conformance remains separate.

### Python

| Tool / effort | Crown and claim | Artifact / checker | Boundary, maturity, limitation, and Foldlab relevance |
|---|---|---|---|
| [Nagini](https://github.com/marcoeilers/nagini) | A. Contract, permission, functional, and selected information-flow verification for an annotated Python subset. | Python translated to Viper; Silicon/Carbon/SMT checks the obligations. | Serious research verifier. Dynamic features, libraries, native extensions, translator correctness, and the CPython runtime are outside the central proof unless separately modeled. |
| [CrossHair](https://github.com/pschanely/crosshair) | Symbolic/concolic exploration of Python contracts and assertions to find counterexamples. | symbolic execution against a real interpreter, SMT models, concrete counterexamples; [contract support](https://crosshair.readthedocs.io/en/latest/contracts.html). | Active and developer-friendly. Its search is incomplete and depends on supported operations/timeouts; “no counterexample found” is not a proof of arbitrary Python behavior. |

Python therefore has a credible subset-deductive lane and a strong falsification lane, but no verified CPython/compiler/runtime bridge in this first-edition set. Mypy, Pyright, and similar analyzers are intentionally omitted from Crown A: ordinary static typing is not deductive functional verification.

### JavaScript / TypeScript

| Tool / effort | Crown and claim | Artifact / checker | Boundary, maturity, limitation, and Foldlab relevance |
|---|---|---|---|
| ECMAScript specification + test262 | D, normative prose/algorithms and conformance tests. | Published standard plus executable test corpus. | Normative authority is stronger than a research model, but prose algorithms and tests are not a kernel proof or complete implementation verification. Version and host environment matter. |
| [JSCert](https://github.com/jscert/jscert) | D/A, historical research. Mechanized ES5 semantics and a verified reference interpreter in Rocq. | Rocq definitions/proofs and extracted interpreter. | Important semantic precedent, but the repository targets ES5-era JavaScript, relies on an external parser/perfect-AST interface, and documents axioms/admitted development points. It is not current ECMAScript or TypeScript conformance. |
| [KJS](https://github.com/kframework/javascript-semantics) | D, historical executable semantics for ES5.1 in K. | K definition, executable interpreter/search, test262-derived testing. | Useful research semantics with library/edition gaps; not the normative ECMAScript definition and not a current engine proof. |
| [JaVerT](https://gillianplatform.github.io/publications/javert.html) | A, research. Semi-automatic separation-logic verification for JavaScript through the JSIL intermediate representation. | specifications and proofs over JSIL, with a tested rather than verified JS→JSIL compiler. | High-quality prior art for heap/dynamic-language verification. Its publication explicitly makes translation validation a boundary; coverage is not modern full ECMAScript. |

TypeScript's own [design goals](https://github.com/microsoft/TypeScript/wiki/TypeScript-Design-Goals) list soundness/provable correctness as a non-goal, and its [compatibility documentation](https://www.typescriptlang.org/docs/handbook/type-compatibility) describes deliberately unsound accommodations. The Effect repository and Schema AST can provide rich executable descriptions, but [Effect](https://github.com/Effect-TS/effect) is not thereby a proof system. The first-edition conclusion is a strategic Foldlab gap: no current primary-source evidence establishes a maintained, verified path from full TypeScript/Effect source through JavaScript emission to runtime. The required program is exactly the staged one in the charter—pin an Effect slice, define its meaning, prove model theorems, validate source conformance, then justify translations and observed artifacts independently.

### Solidity / EVM

| Tool / effort | Crown and claim | Artifact / checker | Boundary, maturity, limitation, and Foldlab relevance |
|---|---|---|---|
| [Solidity SMTChecker](https://docs.soliditylang.org/en/latest/smtchecker.html) | A. Proves or refutes assertions and runtime-safety properties using CHC-based symbolic reasoning for supported Solidity/EVM behavior. | compiler-generated verification conditions, SMT results, counterexamples/warnings. | Officially integrated. Unsupported constructs, abstractions, solver availability, environmental assumptions, and the source/compiler/EVM chain constrain claims. |
| [Certora Prover](https://docs.certora.com/en/latest/docs/user-guide/index.html) | A/E. CVL rules over compiled smart contracts for invariants, functional, temporal, and relational properties. | compiled contract model, rule suite, VC/SMT reports and counterexamples. | Strong production adoption signal, but the prover/encoding is a trusted service/tool boundary; source/bytecode versions and “havoc”/environment models must be preserved with results. |
| [KEVM](https://github.com/runtimeverification/evm-semantics) | D/A. Executable K semantics for EVM plus reachability-logic verification. | K definition, symbolic execution/proof artifacts, solver results. | Major research semantics. It is not identical to normative Ethereum prose or proof of a specific client/compiler; hard-fork/version pinning is essential. |

### Move

The [Move Prover](https://github.com/aptos-labs/move) verifies Move specifications by translating Move bytecode and its specification language into Boogie and SMT; the [original paper](https://theory.stanford.edu/~barrett/pubs/ZCQ%2B20.pdf) describes the bytecode-level verification architecture, and the [specification-language documentation](https://github.com/move-language/move/blob/main/language/move-prover/doc/user/spec-lang.md) defines contracts, invariants, and ghost/spec constructs. This is a coherent Crown A effort combined with Move's resource-oriented type and bytecode checking. The compiler-to-bytecode step, prover translation, native functions, VM implementation, chain configuration, and deployed bytecode identity remain separate boundaries. Resource safety is not automatically functional correctness, and successful source verification is not automatically G5 chain conformance.

### WebAssembly

| Tool / effort | Crown and claim | Artifact / checker | Boundary, maturity, limitation, and Foldlab relevance |
|---|---|---|---|
| [WebAssembly Core Specification](https://webassembly.github.io/spec/core/) and [SpecTec](https://webassembly.org/news/2025-03-27-spectec/) | D, official/normative formal rules and specification-generation infrastructure. | typed reduction rules, generated prose/definitions/reference interpreter/conformance materials. | Official status distinguishes this from research mechanizations. The current spec version must be pinned; formal rules do not prove that a browser/runtime implements them. SpecTec's generated artifacts have distinct maturity and trust status. |
| [WasmCert-Coq](https://github.com/WasmCert/WasmCert-Coq) | D/B research. Mechanized WebAssembly semantics, type-safety metatheory, checker correctness, and executable interpreter components. | Rocq definitions and kernel-checked proofs. | Strong research mechanization aligned with official semantics, but version/extension coverage varies and binary parsing/engine conformance is not automatically proved. |
| [Talos](https://github.com/cajal-technologies/talos) | A, research. Lean-based weakest-precondition reasoning over WebAssembly programs. | Lean model, specifications, and kernel-checked theorems. | Relevant project surfaced in the user's stars. It is an emerging verifier over a formal Wasm model, not evidence of source-language or browser-runtime conformance. |

WebAssembly is attractive as a future Foldlab target because it has a real official formal-semantics crown. A TypeScript/Effect→Wasm pipeline would still need a verified or validated translation and a pinned engine/artifact path.

### LLVM / MLIR

| Tool / effort | Crown and claim | Artifact / checker | Boundary, maturity, limitation, and Foldlab relevance |
|---|---|---|---|
| [Alive2](https://github.com/AliveToolkit/alive2) | A/B validation. Checks refinement of LLVM IR transformations, including undefined/poison behavior, with bounded symbolic reasoning. | SMT queries, counterexamples, compiler-plugin/translation-validation reports. | High-impact optimizer validation. It checks individual functions/transformations under documented bounds and does not prove the whole LLVM compiler or interprocedural behavior. |
| [Vellvm](https://github.com/vellvm/vellvm) | B/D research. Rocq semantics for an LLVM IR subset and verified transformations/interpreters. | Rocq definitions and kernel-checked theorems. | Foundational and active research, but LLVM version/feature coverage is necessarily partial; frontend and native backend are outside the subset proof unless linked separately. |
| [Lean-MLIR / first-class verification dialect work](https://users.cs.utah.edu/~regehr/papers/pldi25.pdf) | D/A research. Dialect-specific semantics and verified rewrite/refinement infrastructure for MLIR. | Lean definitions/proofs and MLIR-integrated verification constructs. | Promising frontier. MLIR is an extensible family of dialects rather than one fixed semantics; effects, regions, interfaces, lowering chains, and dialect versions require separate models. No global “verified MLIR” claim is warranted. |

LLVM demonstrates the value of per-pass refinement and translation validation. MLIR demonstrates why canonical entities need explicit kinds: a transformation cannot preserve “meaning” until the source/target dialect meanings and admissible observations are named.

## Proof-oriented and verification-language ecosystems

These systems are grouped separately because the language is itself part of the proof interface. Kernel acceptance gives unusually strong Crown A/D evidence, but does not eliminate source-model, extraction, compiler, runtime, or deployment boundaries.

### Lean 4

| Capability | Claim and artifact | Boundary, maturity, and Foldlab relevance |
|---|---|---|
| Lean kernel and elaborator | A/D. Definitions and proof terms elaborate to a small kernel-checkable calculus. Official [proof-validation guidance](https://lean-lang.org/doc/reference/latest/ValidatingProofs/) explains independent checking and `#print axioms`. | Active, production-quality prover with a comparatively small logical kernel. Elaborator, macros, code generators, native evaluation, FFI, and the compiler/runtime do not all inherit a theorem merely because the kernel accepted it. |
| [mathlib](https://github.com/leanprover-community/mathlib4) | Large reusable library of kernel-checked mathematics, tactics, and definitions. | Major maturity signal, but imported axioms and exact dependency/version closure must still be audited per theorem. |
| Lean metaprogramming | Typed syntax, elaborator extensions, tactics, and code generation can make a canonical definition serve documentation, proof, and execution. | Powerful fit for Foldlab's “type as projectable object” thesis. Generated declarations and external artifacts require provenance and semantic-preservation checks; metaprogram execution is not part of the theorem unless reflected and proved. |

Lean is Foldlab's immediate proving environment, not a magical G5 endpoint. A theorem over `formal/Foldlab/...` is G2 until source fixtures, translation relations, and runtime observations are separately established. Projects such as Lean4Lean are valuable checker/metatheory research, but the [Lean reference's validation guidance](https://lean-lang.org/doc/reference/latest/ValidatingProofs/) remains the appropriate operational baseline.

### Rocq / Coq

Rocq's [reference manual](https://rocq-prover.org/doc/master/refman/index.html) describes an interactive dependent-type theory in which proof terms are checked by a small kernel. This supplies strong proof-artifact and replay discipline and underpins CompCert, VST, RustBelt, Fiat Crypto, Perennial, Verdi, and many other entries here. The artifact is normally source plus compiled dependencies and a checked theorem; `Print Assumptions`/axiom audits and exact package versions remain material. Extraction to OCaml/Haskell/Scheme is a separate semantic and compiler boundary; a kernel theorem about a Gallina program is not automatically a theorem about an extracted binary. [MetaRocq/MetaCoq's verified erasure work](https://arxiv.org/abs/2108.02995) is important progress on that boundary, not a blanket certification of every extraction/deployment path.

### Isabelle/HOL

[Isabelle](https://isabelle.in.tum.de/) provides an LCF-style logical framework, structured Isar proofs, code generation, and strong automation. The trusted inference kernel checks theorem construction, while sessions and generated heaps record a dependency graph rather than a universal, language-neutral certificate. The [Isabelle system manual](https://isabelle.in.tum.de/website-Isabelle2024/dist/Isabelle2024/doc/system.pdf) documents session/build/reproducibility mechanics. seL4 is the flagship Crown C signal, but code generation or C refinement must be justified in each development; Isabelle/HOL acceptance alone is G2 with respect to an external program.

### Agda

[Agda](https://agda.readthedocs.io/) combines dependent programming and proving with termination, coverage, positivity, and universe checks. Its [`--safe` mode](https://agda.readthedocs.io/en/latest/language/safe-agda.html) excludes postulates and other features that would undermine a portable no-extra-axiom claim. An Agda module accepted in safe mode is a strong typed proof/program artifact. Compilation through MAlonzo/Haskell or JavaScript is a distinct backend/runtime boundary, and FFI or unsafe primitives must be inventoried. Agda is relevant to kinded, intrinsically typed descriptions; Lean is currently the better operational fit for Foldlab, while Agda is an important design comparison.

### Dafny

[Dafny](https://dafny.org/dafny/DafnyRef/DafnyRef) is an integrated programming and specification language with pre/postconditions, frames, invariants, termination measures, ghost state, and automated deductive verification. Dafny translates verification obligations through Boogie to SMT, so source elaboration, the VC generator, solver, and trusted declarations are part of the assurance case. Compilers target C#, Java, JavaScript, Go, and other backends, but verifier success is not by itself a semantics-preservation theorem for every backend/runtime. Dafny's combination of executable code, ghost descriptions, and protocol case studies such as IronFleet makes it a high-value comparison for Foldlab's operator-oriented language design.

### F*

[F*](https://fstar-lang.org/) combines dependent/refinement types, an effect system, weakest-precondition reasoning, SMT automation, tactics, and extraction. Its Low* subset and KaRaMeL path support verified low-level code; Pulse adds concurrent separation-logic reasoning. The proof artifact is a type-checked F* development plus SMT obligations/results and extraction configuration. Trusted primitives, solver behavior, normalization, extraction, C compiler, platform APIs, and side-channel model remain explicit boundaries. F* is arguably the closest mature conceptual comparator for Foldlab's union of effect descriptions, refinements, multiple interpretations, and verified compilation.

### WhyML / Why3

[Why3](https://why3.org/) is both a deductive-verification platform and an intermediate language ecosystem. WhyML programs/specifications generate verification conditions for multiple automatic and interactive provers; [proof sessions](https://why3.org/doc/) retain transformations, prover/version choices, goals, and replay state. A green session establishes that all required VCs were discharged under the chosen theories and provers. Why3 is not itself a tiny proof kernel for every solver result, and every source frontend—Cameleer, Creusot, SPARK/GNATprove, or another translator—adds a correspondence boundary. Why3's portable VC/session model is excellent prior art for a common Foldlab verification manifest.

### Viper

[Viper](https://www.viper.ethz.ch/) is a permission-based intermediate verification language used by source frontends including Gobra, Nagini, Prusti-family research, and VerCors. [Silicon](https://github.com/viperproject/silicon) performs symbolic execution; Carbon uses verification-condition generation, with both commonly relying on SMT. Viper can express heap ownership, framing, concurrency protocols, and quantified invariants. A successful Viper check establishes the encoded Viper program's obligations; correctness of the source→Viper frontend is an independent Crown D/G3–G4 issue. This “many frontends, one semantic IR” architecture is a leading candidate for Foldlab study.

### K Framework

The [K Framework](https://kframework.org/) defines executable language semantics using rewriting and matching logic and derives interpreters, symbolic execution, model checking, and deductive verification from those definitions; the [user manual](https://kframework.org/docs/user_manual/) documents the generated tools and proof workflows. KEVM is a prominent deployed-language semantics. A K definition may be official, validated, or purely research-authored; those statuses must not be conflated. Proofs establish properties in the chosen K semantics and solver/toolchain, while conformance to a prose standard or implementation requires tests or a separate theorem. K is highly relevant to Foldlab's desire to make meaning definitions executable and multi-interpretable.

## Verification-native modeling languages and intermediate logics

These tools are essential to Foldlab's global-type direction. Unless the implementation is generated through a justified pipeline or connected by refinement/monitoring, their results are **model-level Crown E/D claims**, not source-program conformance.

| Language / tool | What it can establish | Artifact and checking model | Implementation boundary and Foldlab use |
|---|---|---|---|
| [TLA+ / PlusCal / TLC](https://tla.msr-inria.inria.fr/) | Safety and selected liveness properties of temporal transition systems; PlusCal supplies an algorithm notation translated to TLA+. | TLA+ specification; TLC finite-state model-checking configuration, state graph/counterexample; generated TLA+ from PlusCal. [Toolbox docs](https://tla.msr-inria.inria.fr/tlatoolbox/doc/contents.html). | TLC covers the configured finite model; PlusCal→TLA+ is not application code generation. A handwritten service needs a refinement, generated implementation, or trace monitor. Prime candidate for global agent/human flow topology. |
| [TLAPS](https://tla.msr-inria.inria.fr/tlatoolbox/doc/prover/prover.html) | Deductive safety proofs for TLA+ specifications beyond finite TLC instances. | Hierarchical proof plus backend prover obligations/checks. | Still a theorem about the TLA+ model. Liveness coverage and implementation correspondence must be stated separately. |
| [Alloy](https://alloytools.org/spec.html) | Relational and temporal constraints; counterexamples and satisfying instances within finite scopes. | Alloy model, commands/scopes, SAT instance or unsat result. | “No counterexample” is scoped, not global. Excellent for rapidly digesting schema, ownership, graph, and topology hypotheses before Lean formalization. |
| [P](https://p-org.github.io/P/) | Safety/liveness of asynchronous communicating state machines under systematic schedule exploration; runtime monitoring and code generation. | P machine model, specifications/monitors, explored traces, generated code. | Generated code has a stronger connection than a handwritten reimplementation, but backend/runtime preservation must still be characterized. Highly relevant to n-ary event flows. |
| [Ivy](https://www.microsoft.com/en-us/research/project/ivy/) | Modular invariant and refinement proofs for distributed protocols, with interactive proof support and executable/test artifacts. | Ivy model, invariants/lemmas, solver-backed proof, generated implementation/tester where used. | Established protocol-research tool. A proof applies to the Ivy model and generated/refined path; external code needs a bridge. Its decidable-fragment discipline is useful for keeping global specifications tractable. |
| [Quint](https://github.com/quint-co/quint) | Executable TLA-inspired specifications, simulation, testing, invariant and temporal checking through backends. | Quint source plus simulator/test traces or translated TLC/Apalache queries. [Model-checker docs](https://quint.sh/docs/model-checkers). | Translation/backends and finite configuration are part of the result. Strong UX prior art for making global models approachable to operators. |
| [Apalache](https://github.com/apalache-mc/apalache) | SMT-based symbolic checking of TLA+/Quint-style transition systems: bounded executions for fixed parameters, plus inductiveness checks for candidate invariants that can establish safety over unbounded executions under the declared transition model. | symbolic transition relation, SMT query, invariant obligation, counterexample trace; [official docs](https://apalache-mc.org/docs/apalache/index.html). | The result must say whether it is a bounded check or an inductive proof and retain parameter, type, initialization, and transition assumptions; docs also describe experimental/feature limits. Good complement to explicit TLC, not an implementation proof. |
| [Veil](https://veil.dev/) | Concrete/symbolic model checking plus kernel-checked inductive-invariant safety proofs for distributed protocols. | Lean DSL/model, invariant proof checked by Lean, generated counterexamples; [CAV paper](https://verse-lab.github.io/papers/veil-cav25.pdf). | Active pre-release research tool. It verifies Veil transition systems, not service code. Directly relevant as Lean-native global-state prior art and surfaced in the user's stars. |
| [Boogie](https://github.com/boogie-org/boogie) | Intermediate-language assertions, pre/postconditions, invariants, and refinement-style VCs. | Boogie program, generated SMT obligations/results. | Mature IR, but source claims depend entirely on the frontend encoding; ordinary Boogie success is not a source certificate. Useful common lowering target. |
| [WhyML / Why3](https://why3.org/) | Deductive functional verification with multiple prover backends and replayable sessions. | WhyML/specification, transformations, VCs, session and prover results. | Source frontends and extracted code need separate validation. Strong provenance/session design. |
| [Viper](https://www.viper.ethz.ch/) | Permission, framing, heap, concurrency, and functional obligations at verification-IR level. | Viper IR, Silicon/Carbon execution or VCs, SMT results. | Source→Viper encodings are part of the trusted base. Strong ownership/effect abstraction candidate. |

The practical composition is layered: Alloy/Quint for early finite exploration; TLA+/P/Ivy/Veil for canonical global behavior; Lean/TLAPS for durable proofs; a source verifier or generated projection for local code; trace/event monitors for deployed correspondence. No layer should silently inherit another layer's crown.

## Cross-language semantic infrastructure

| Infrastructure | Status and role | Critical distinction |
|---|---|---|
| [Sail](https://github.com/rems-project/sail) and [Sail RISC-V](https://github.com/riscv/sail-riscv) | Domain-specific language for ISA semantics, generating executable emulators, documentation, and prover definitions. The RISC-V model is maintained with RISC-V International involvement. | One source can generate multiple views, but generated definitions and implementations still need versioned correspondence; the language definition may be official for a project without proving every processor/emulator. Sail's explicit effects and monadic interpretations are especially relevant to Foldlab. |
| [Ott](https://github.com/ott-lang/ott) | Generates typeset rules and definitions for Rocq, HOL, and Isabelle from programming-language semantics. | Generation reduces transcription drift; it does not generate metatheory proofs or certify external interpreters. |
| [Lem](https://github.com/rems-project/lem) | Portable executable semantics with generation to OCaml and prover targets including Isabelle/HOL and Rocq/HOL4-era workflows. | Valuable established infrastructure with lower current development intensity; generated artifacts are views of the Lem model, not automatic conformance proofs. |
| [K Framework](https://kframework.org/) | Executable semantics plus derived verification/search tools; used for EVM, C, JavaScript, and other languages. | Official/normative, research-mechanized, and merely executable definitions are different evidence grades. |
| [Interaction Trees](https://github.com/DeepSpec/InteractionTrees) | Rocq library representing effectful and potentially nonterminating computations as coinductive trees, with equational reasoning and interpreters. | A semantic substrate, not a source frontend or runtime proof. It is directly relevant to Foldlab's effect-handler and trace semantics. |

Three semantics statuses should always be labeled:

1. **Official/normative formal semantics:** for example, WebAssembly's formal core specification and emerging SpecTec generation path.
2. **Research mechanization of a standard/language:** for example, Cerberus, JSCert, KJS, RustBelt, WasmCert, Vellvm, and parts of Lean-MLIR.
3. **Executable model:** a model that runs or generates interpreters, whether or not it is normative or connected to production implementations.

Executability increases testability; it does not by itself establish authority, adequacy, or conformance.

### Project-starred, early-stage watchlist

These projects are unusually close to Foldlab's intended abstractions, but their repositories are primary evidence of project-authored claims, not independent certification:

| Project | Relevant idea | Required caution |
|---|---|---|
| [PolyFun](https://github.com/Verified-zkEVM/PolyFun) | Lean library combining polynomial functors, lenses, free/cofree structures, Interaction Trees, handlers, simulations, and multi-party interaction. | Pin and rebuild before adoption; audit exact theorem statements, imported axioms, API stability, and performance. It is a candidate substrate, not a verified Effect bridge. |
| [Effectful Choreography](https://github.com/LTeuse/Effectful-Choreography) | Lean definitions for choreographies, algebraic effects, process machines, endpoint projection, and stated projection soundness/completeness. | Inspect the precise semantics, topology/queue assumptions, theorem dependencies, and version pin. Theorems concern the formal choreography/process models, not Effect TypeScript execution. |
| [Telltale](https://github.com/hxrts/telltale) | Global multiparty protocols projected to typed effects and runtime machines, with asynchronous buffering, traces/replay, and Lean/Rust artifacts. | Broad claims are currently repository-authored and fast-moving. Treat as M3/watch until independent build, axiom, theorem, and Rust/artifact-correspondence audits succeed. |

## Crown-jewel exemplars and what they actually demonstrate

| Exemplar | Crowns | Strong claim / artifact | Important non-claim and lesson for Foldlab |
|---|---|---|---|
| [CompCert](https://compcert.org/man/manual001.html) | B/D | Rocq-checked semantic preservation across a substantial optimizing C compiler pipeline. | Not every frontend/backend/toolchain step is in the theorem. Publish the pass graph and trusted endpoints. |
| [seL4](https://sel4.systems/Verification/proofs.html) | B/C/E | Layered functional-correctness, security, and for supported configurations binary-correctness evidence. | Architecture/configuration and threat-model matrices matter as much as the headline theorem. |
| [CakeML](https://cakeml.org/) | B/C/D | HOL4 semantics, verified compiler, bootstrapping, multiple machine-code backends, and end-to-end verified applications; [repository](https://github.com/CakeML/cakeml). | A purpose-built language can close more of the chain than mainstream-language add-on tools, but basis/FFI/platform coverage remains versioned. Strong reference for a future Foldlab core language. |
| [Project Everest](https://project-everest.github.io/) / [HACL*](https://hacl-star.github.io/) / EverCrypt | A/C/E | F*/Low* proofs of memory safety, functional correctness, and stated side-channel properties for cryptographic components, with deployed generated C. | Proofs are algorithm/property/platform specific; compiler, leakage model, assembly, build, CPU, and integration assumptions remain. It is particularly instructive for refinement-to-deployment with explicit extraction. |
| [Fiat Crypto](https://github.com/mit-plv/fiat-crypto) | A/B/C | Generates verified finite-field arithmetic from specifications with Rocq proofs. | The repository explicitly distinguishes proved and unproved backends; the Bedrock2 path has stronger end-to-end guarantees than emitted text/C paths. Backend-specific claim labels are mandatory. |
| [Bedrock2](https://github.com/mit-plv/bedrock2) | A/B/C | Rocq-embedded C-like language, program logic, and verified paths toward RISC-V used in end-to-end systems research. | The repository calls itself work in progress and documents unverified peripherals/integration. A deep narrow slice beats a broad unlabeled promise. |
| [IronFleet](https://www.microsoft.com/en-us/research/?p=171410) | A/C/E | Dafny proofs of safety and liveness for distributed-system implementations, with Ironclad/IronFleet [source artifacts](https://github.com/microsoft/Ironclad/tree/main/ironfleet). | Experimental code and client/network/runtime boundaries remain. Shows why global invariants and implementation refinement need separate proof layers. |
| [Verdi](https://homes.cs.washington.edu/~ztatlock/pubs/verdi-wilcox-pldi15.pdf) | A/B/E | Rocq framework for verified distributed systems and verified system transformers, including a verified Raft line. | Extraction, network shim, storage, and deployment environment remain outside unless linked. Transformers can preserve global properties if their semantics are explicit. |
| [Perennial / Goose](https://github.com/mit-pdos/perennial) | A/C/E | Rocq/Iris proofs of crash-safe and concurrent Go-like systems, including distributed and storage case studies. | Goose translates a Go subset; translator, runtime, external libraries, and build artifacts are boundaries. Particularly strong global-to-local proof architecture. |
| [Verify Rust Std](https://model-checking.github.io/verify-rust-std/intro.html) | A/C operational profile | Governed multi-tool verification of selected Rust standard-library functions with pinned artifacts, criteria, and CI. | Not one logic, certificate, or semantic tier; bounded, deductive, and other results must retain modality. It is the most concrete multi-tool governance template identified in this first-edition set. |
| [RustBelt](https://plv.mpi-sws.org/rustbelt/) | D/A | Foundational Iris/Rocq soundness account for Rust ownership and selected unsafe libraries. | The theorem is about the formal Rust model and verified abstractions, not full rustc or arbitrary unsafe code. Excellent example of proving the language/library contract itself. |

These exemplars are not interchangeable “G5 projects.” Each should be described as a relation among a pinned program, a model, a theorem, a translation, and an observable artifact. The closer a project gets to deployment, the more configuration, build, hardware, FFI, and provenance dimensions appear.

## Foldlab study shortlist

The following sequence maximizes conceptual leverage rather than copying any one stack:

1. **Lean 4 + Interaction Trees.** Establish the kernel, axiom, replay, and effect-semantics baseline for definitions of Effect computations, handlers, traces, and observations.
2. **Verify Rust Std + SPARK.** Derive a Foldlab verification-profile manifest from the Rust campaign's operational rules and SPARK's cumulative assurance vocabulary, while keeping both orthogonal to G0–G5.
3. **Why3 and Viper.** Compare portable VC sessions against a permission/effect verification IR. These are leading designs for allowing several source projections to share one proof infrastructure.
4. **Rust spectrum: RustBelt, RefinedRust, Verus, Creusot, Kani, Aeneas/Charon.** It exposes every major boundary—foundational semantics, refinement logic, SMT deduction, bounded checking, and translation to proof assistants—within one language community.
5. **TLA+, P, Ivy, Veil, and Quint/Apalache.** Prototype canonical global entities for dynamic n-ary agent/human interaction, topology change, asynchronous messaging, streams, failure, and liveness.
6. **CompCert, CakeML, Fiat Crypto/Bedrock2, and Project Everest.** Learn how a formal source becomes a deployed artifact and how to state exclusions without diluting the central theorem.
7. **WebAssembly SpecTec + WasmCert + Alive2/Vellvm.** Explore a portable runtime target with official formal rules, mechanized models, and per-transformation refinement.
8. **Sail, Ott, Lem, and K.** Study definition-as-data systems that project one canonical meaning into prose, executable models, and prover-specific definitions.
9. **Perennial/Goose, IronFleet, and Verdi.** Compare global invariants, local implementation logics, crash semantics, protocol transformations, extraction, and traces.
10. **Gospel/Cameleer/CFML and Stainless.** Study approachable source-language contracts where executable functional descriptions and deductive properties coexist.

For the initial Effect v4 goal, the shortest credible route is not a full JavaScript verifier. It is:

```text
pinned Effect source slice
  -> source-derived fixtures and discriminant inventory       (G0/G3 evidence)
  -> Lean canonical syntax + kinds + meaning functions         (G1)
  -> model theorems and trace/refinement algebra                (G2)
  -> validated or proved source-to-model relation per slice     (G3)
  -> semantics-preserving projections/interpreters              (G4)
  -> pinned emitted artifact + runtime trace conformance         (G5)
```

This staged path allows useful theorems early without confusing them with claims about TypeScript or V8.

## Open questions and evidence gaps

1. **Effect/TypeScript semantic bridge.** No maintained primary-source project found here verifies current Effect v4 source, TypeScript erasure/emission, JavaScript execution, and Schema/Codec behavior end to end.
2. **Common verification-profile standard.** No single cross-ecosystem standard found in the companion survey defines a portable formal-verification vocabulary for property, semantic slice, proof modality, assumptions, source relation, translation relation, binary identity, and replay. Reusable envelope layers do exist: the companion note recommends native proof evidence, SACM claim/evidence/reasoning semantics represented through CycloneDX Declarations, in-toto/SCAI content binding, and DSSE/Sigstore or optional SCITT authentication/transparency. The missing standard is the domain profile and checking policy that gives those fields formal-verification meaning. Verify Rust Std and SPARK are strong operational prior art; SARIF, SPDX/SLSA-style provenance, proof-assistant package metadata, SMT-LIB, Alethe/LFSC, and proof certificates solve additional narrower pieces.
3. **Translation certification.** Many strong tools—Gobra, Nagini, Creusot, Cameleer, Aeneas, hs-to-rocq, JaVerT, Goose—prove a translated program or generate VCs without a verified full source translation. A standard should label tested, translation-validated, proved, and assumed translators distinctly.
4. **Solver evidence.** SMT-backed tools vary from trusting a solver verdict to replaying proof certificates or sending goals to an interactive prover. The exact certificate availability and independent-checking story needs a tool-by-tool audit.
5. **Language-version matrices.** C++ standards, Rust nightlies, GHC, ECMAScript editions, Wasm proposals, Solidity hard forks, LLVM IR, and MLIR dialects move faster than formal models. Every claim needs a machine-readable version/slice key.
6. **Liveness and fairness.** Safety dominates source verifiers. Global agent flows need fairness, progress, cancellation, retry, resource exhaustion, backpressure, and topology-change assumptions made explicit.
7. **Probabilistic and learning components.** Most tools here assume nondeterministic or deterministic transition systems. Human/LLM choices, probabilistic policies, and adaptive models need a separate semantics and statistical-evidence layer rather than being smuggled into deterministic proof.
8. **Observability and tracing.** A trace schema can connect model events to runtime spans, but instrumentation may perturb scheduling and omit internal state. Trace refinement, content addressing, causal clocks, redaction, and signed provenance need first-class definitions.
9. **Industrial adoption evidence.** This edition uses documented deployments and official adoption qualitatively. It does not rank user counts, proof cost, maintenance burden, defect yield, or auditor acceptance; those require a separate reproducible evidence audit.
10. **Closed/proprietary components.** Some valuable verifiers are services or contain non-open pieces. The reproducibility and independent-checking implications require explicit procurement/tool-access analysis.

## Coverage backlog for later editions

This first edition is intentionally broad but not exhaustive. The following ecosystems were **not deeply audited** and should not be inferred from adjacent tools:

| Backlog area | Questions for a focused audit |
|---|---|
| **Swift** | What remains active from Swift verification and SIL-level work? Can ownership/concurrency claims be connected to the current compiler? |
| **Zig** | Which formal semantics, comptime analyses, bounded verifiers, or LLVM/Wasm translation-validation paths cover current Zig? |
| **Nim** | Are there maintained source verifiers or only contracts/testing and C-backend inheritance? |
| **Ruby** | Which symbolic execution, contract, refinement-type, or VM-semantics efforts remain current? |
| **PHP / Hack** | How should Hack's static typing and HHVM verification work be separated from deductive program proof? |
| **Lua** | What formal VM/language semantics and verified embedded-system efforts cover current Lua versions? |
| **Julia** | Are compiler-IR semantics, numerical proof, and type-inference analyses connected to source guarantees? |
| **R** | Which theorem-proving/statistical-language semantics efforts are active, and how are numerical/runtime assumptions represented? |
| **SQL and database languages** | Compare deductive query verification, verified optimizers, refinement types for schemas, transaction isolation models, and systems such as Verdi/Perennial database exemplars. |
| **Shell languages** | Audit formal shell semantics, symbolic testing, and verified build systems; quoting, environment, filesystem, and process behavior make G3/G5 difficult. |
| **Hardware-description and HDL ecosystems** | Separate theorem proving, equivalence checking, property/model checking, verified synthesis, and implementation sign-off across Verilog/SystemVerilog, VHDL, Chisel, Bluespec, Coq/Lean HDLs, and commercial flows. |

Additional next-pass topics include Clojure and other JVM languages, Racket/Scheme, Prolog/logic languages, Erlang's formal semantics lineage, GPU/kernel languages, synchronous/reactive languages (Lustre, SCADE), proof-carrying code, verified operating-system families beyond seL4, and hardware/ISA connections through Sail.

## Maintenance protocol

For every future edit:

1. pin the snapshot date and prefer official docs/repos or original papers;
2. name the crown and verification modality;
3. state the exact source or IR slice and property class;
4. name the artifact and checker, including solver/prover versions where material;
5. separate normative, research-mechanized, and executable semantics;
6. record unsupported features, bounds, axioms, environment, and external-call assumptions;
7. label the source/model, translation, compiler/runtime, and deployed-artifact boundaries independently;
8. treat maturity/deployment as evidence about operability, never as a substitute for a theorem;
9. do not map project assurance vocabularies directly onto G0–G5;
10. downgrade or archive claims when source links, replay, or version coverage can no longer be established.

The durable unit of comparison is therefore not “tool X verifies language Y.” It is: **tool/version X checks artifact A, expressing property P over semantic slice S, under assumptions H, with correspondence relation C and observation boundary O**. That sentence is the seed of a verification-native artifact standard and the right level of precision for Foldlab's long-term language work.
