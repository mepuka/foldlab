# Local paper corpus

Status: generated index, snapshot 2026-08-24. Do not edit by hand — this
file is rendered from the paper lock plus the cluster roles declared in the
generator; regeneration instructions are in
[../provenance/README-papers.md](../provenance/README-papers.md).

88 papers are held locally under `.reference/papers/` (gitignored: the
repository must not redistribute publisher-copyrighted documents). Canonical
identity — digest, byte length, and the identifier printed on the document —
lives in the [paper lock](../provenance/papers.lock.json). This index adds the
one thing a digest cannot carry: what each group of sources may be used for,
and what it may not.

Two entries in the [reference catalog](REFERENCES.md) (the E1 type-system
lineage) carry per-source role scoping in prose; they are also listed here.

## Clusters

| Cluster | Papers |
| --- | --- |
| [Normative standard](#normative-standard) | 1 |
| [Mechanized hash functions and their assurance record](#hash-mechanization) | 8 |
| [Canonical hashing, alpha-equivalence, and graph canonization](#canonical-hashing) | 11 |
| [High-assurance cryptographic toolchains and libraries](#crypto-toolchains) | 20 |
| [Side-channel and speculative-execution preservation](#side-channel-preservation) | 6 |
| [Game-based cryptographic proof frameworks](#crypto-proof-frameworks) | 2 |
| [Proof-assistant internals, kernel checking, and reduction cost](#proof-assistant-internals) | 17 |
| [Effectful semantics carriers and coinductive reasoning](#semantics-carriers) | 12 |
| [Translation validation and derived-artifact correctness](#translation-validation) | 4 |
| [Type-system and effect lineage (E1)](#type-effect-lineage) | 2 |
| [Machine-assisted proof search and development flow](#proof-automation-ml) | 5 |

## Normative standard

<a id="normative-standard"></a>

**Supports.** The algorithm definition itself: state diagrams, step mappings, padding, and the parameter sets. A behavior requirement about SHA-3 may be owned here.

**Does not support.** Nothing about any implementation's correctness, performance, or security in deployment.

| Source | Identifier | Local pin (sha256) |
| --- | --- | --- |
| SHA-3 Standard: Permutation-Based Hash and Extendable-Output Functions (FIPS PUB 202) | [doi:10.6028/NIST.FIPS.202](https://doi.org/10.6028/NIST.FIPS.202) | `1592607831ff0908…` |

## Mechanized hash functions and their assurance record

<a id="hash-mechanization"></a>

**Supports.** Prior mechanizations of hash primitives in proof assistants — what was stated, at which layer, and against which carrier — plus the record of what mechanization has failed to catch.

**Does not support.** Transfer of any of these theorems to this estate's definitions; each is a theorem about its own model and toolchain.

| Source | Identifier | Local pin (sha256) |
| --- | --- | --- |
| Machine-Checked Proofs for Cryptographic Standards: Indifferentiability of Sponge and Secure High-Assurance Implementations of SHA-3 | [doi:10.1145/3319535.3363211](https://doi.org/10.1145/3319535.3363211) | `463214a90569716b…` |
| Cryptography Experiments In Lean 4: SHA-3 Implementation | unresolved — pinned by digest | `64118c081b480dfe…` |
| Verification of a Cryptographic Primitive: SHA-256 (second edition) | unresolved — pinned by digest | `75527a72e57d7752…` |
| Verified correctness and security of OpenSSL HMAC | unresolved — pinned by digest | `017d4acd67d9db5c…` |
| `borrione-toma-2003-sha-formalization-acl2` — title not recoverable from the document (text layer does not decode); identity pending | unresolved — pinned by digest | `2354e76fd272d856…` |
| Verification of a cryptographic circuit: SHA-1 using ACL2 (ACL2 Workshop 2004 slides) | unresolved — pinned by digest | `c1243d552cd76ee0…` |
| A Vulnerability in Implementations of SHA-3, SHAKE, EdDSA, and Other NIST-Approved Algorithms | unresolved — pinned by digest | `e5ce94c802fc96b9…` |
| Verification Theatre: False Assurance in Formally Verified Cryptographic Libraries | unresolved — pinned by digest | `acd25e26fe0f65a6…` |

## Canonical hashing, alpha-equivalence, and graph canonization

<a id="canonical-hashing"></a>

**Supports.** The working set for a content-addressing scheme with proved invariance: how to hash terms modulo binding, how to canonize cyclic and shared structure, and what the known algorithms cost. Directly bears on the cycle-ordering defect this estate is tracking.

**Does not support.** Any claim that a published scheme is sound as stated for this estate's term algebra; each carries its own equivalence relation and must be restated before it binds.

| Source | Identifier | Local pin (sha256) |
| --- | --- | --- |
| Hashing Modulo Alpha-Equivalence | [arXiv:2105.02856v1](https://arxiv.org/abs/2105.02856) | `37cda15bd6ff8605…` |
| Hashing Modulo Context-Sensitive Alpha-Equivalence | [arXiv:2401.02948v3](https://arxiv.org/abs/2401.02948) | `2538ba5cf57e5592…` |
| A Simple Formalization of Alpha-Equivalence | [arXiv:2507.10181v2](https://arxiv.org/abs/2507.10181) | `7a85278a884203f4…` |
| Directed Graph Hashing | [arXiv:2002.06653v3](https://arxiv.org/abs/2002.06653) | `1a4f2e4bc8ea42c6…` |
| Scott: A method for representing graphs as rooted trees for graph canonization | [doi:10.1007/978-3-030-36687-2_48](https://doi.org/10.1007/978-3-030-36687-2_48) | `dab0960cd30ba3cb…` |
| Canonical Forms for General Graphs Using Rooted Trees: Correctness and Complexity Study of the SCOTT Algorithm | unresolved — pinned by digest | `092a2b06cac29bd8…` |
| Maximal Sharing in the Lambda Calculus with letrec | [arXiv:1401.1460v5](https://arxiv.org/abs/1401.1460) | `a867452b21b85730…` |
| Implementing and reasoning about hash-consed data structures in Coq | [arXiv:1311.2959v4](https://arxiv.org/abs/1311.2959) | `1d42a91a6f12371c…` |
| Slotted E-Graphs: First-Class Support for (Bound) Variables in E-Graphs | [doi:10.1145/3729326](https://doi.org/10.1145/3729326) | `b7f2563e39b5dbd6…` |
| Lifting E-Graphs: A Function Isn't a Constant | [arXiv:2606.22734v1](https://arxiv.org/abs/2606.22734) | `c35b501ba33da876…` |
| Efficient Coalgebraic Partition Refinement | [doi:10.4230/LIPIcs.CONCUR.2017.28](https://doi.org/10.4230/LIPIcs.CONCUR.2017.28) | `91f3a010512e837a…` |

## High-assurance cryptographic toolchains and libraries

<a id="crypto-toolchains"></a>

**Supports.** Pattern and prior art for the spec-to-executable architecture: where each project puts its specification, its implementation, and the bridge between them, and what its trust boundary admits.

**Does not support.** Any transferred guarantee. These are theorems about C, assembly, F*, or Jasmin artifacts, not about Lean definitions in this estate.

| Source | Identifier | Local pin (sha256) |
| --- | --- | --- |
| Jasmin: High-Assurance and High-Speed Cryptography | [doi:10.1145/3133956.3134078](https://doi.org/10.1145/3133956.3134078) | `7d9766b109ec264e…` |
| The Last Mile: High-Assurance and High-Speed Cryptographic Implementations | [arXiv:1904.04606v1](https://arxiv.org/abs/1904.04606) | `f7ca3c64981f9477…` |
| Formally verifying Kyber Episode IV: Implementation correctness | unresolved — pinned by digest | `6beec8cb66f7c021…` |
| Formally verifying Kyber Episode V: Machine-checked IND-CCA security and correctness of ML-KEM in EasyCrypt | unresolved — pinned by digest | `a5ed0be5587f26b6…` |
| Jazzline: Composable CryptoLine Functional Correctness Proofs for Jasmin Programs | [doi:10.1145/3719027.3744814](https://doi.org/10.1145/3719027.3744814) | `eb97cfc8081a35d9…` |
| Automatic Verification of Cryptographic Block Function Implementations with Logical Equivalence Checking | unresolved — pinned by digest | `3abfda5479a7ed7b…` |
| Automatic Equivalence Checking for Assembly Implementations of Cryptography Libraries | [doi:10.5281/zenodo.2229779](https://doi.org/10.5281/zenodo.2229779) | `f3716c148c3d033f…` |
| AXE: An Automated Formal Equivalence Checking Tool for Programs (front matter only) | unresolved — pinned by digest | `a67276820853ddd8…` |
| Simple High-Level Code For Cryptographic Arithmetic: With Proofs, Without Compromises | unresolved — pinned by digest | `bbb0f6fcd768b820…` |
| Vale: Verifying High-Performance Cryptographic Assembly Code | unresolved — pinned by digest | `68100387a2ffdca3…` |
| A Verified, Efficient Embedding of a Verifiable Assembly Language | [doi:10.1145/3290376](https://doi.org/10.1145/3290376) | `9fa061bb98c51346…` |
| Modularity, Code Specialization, and Zero-Cost Abstractions for Program Verification | [arXiv:2102.01644v3](https://arxiv.org/abs/2102.01644) | `473dec09755c4b5d…` |
| HACL*: A Verified Modern Cryptographic Library | unresolved — pinned by digest | `2c8e0345089d7004…` |
| HACLxN: Verified Generic SIMD Crypto (for all your favorite platforms) | unresolved — pinned by digest | `cffc679db7f9528b…` |
| Verified Low-Level Programming Embedded in F* | [arXiv:1703.00053v6](https://arxiv.org/abs/1703.00053) | `0300c35ca6eabd91…` |
| Formally Verified Cryptographic Web Applications in WebAssembly | unresolved — pinned by digest | `170cfea65d9059ff…` |
| EverCrypt: A Fast, Verified, Cross-Platform Cryptographic Provider | unresolved — pinned by digest | `1d2fc6715fbf5cc4…` |
| The Last Yard: Foundational End-to-End Verification of High-Speed Cryptography | unresolved — pinned by digest | `ceac115253dde925…` |
| Ironclad Apps: End-to-End Security via Automated Full-System Verification | unresolved — pinned by digest | `8cae14c26bc82b73…` |
| Verified Cryptographic Code for Everybody | [doi:10.1007/978-3-030-81685-8_31](https://doi.org/10.1007/978-3-030-81685-8_31) | `d30b37a8eddcad68…` |

## Side-channel and speculative-execution preservation

<a id="side-channel-preservation"></a>

**Supports.** What a compilation step can and cannot preserve once the attacker model includes timing and speculation; the shape of a preservation statement over an operational semantics.

**Does not support.** Any claim that this estate's artifacts are constant-time or Spectre-resistant. No such property is stated or tested here.

| Source | Identifier | Local pin (sha256) |
| --- | --- | --- |
| High-Assurance Cryptography in the Spectre Era | unresolved — pinned by digest | `1a5e3911891b667b…` |
| Spectre Declassified: Reading from the Right Place at the Wrong Time | unresolved — pinned by digest | `0308ba9956fdf6a6…` |
| Typing High-Speed Cryptography against Spectre v1 | unresolved — pinned by digest | `527b6e6120d550b5…` |
| Protecting Cryptographic Code Against Spectre-RSB (and, in Fact, All Known Spectre Variants) | [doi:10.5281/zenodo.14773254](https://doi.org/10.5281/zenodo.14773254) | `64cb76f4fa0ebaa4…` |
| Preservation of Speculative Constant-Time by Compilation | [doi:10.1145/3704880](https://doi.org/10.1145/3704880) | `e8e30064e4902882…` |
| KEM-IND-CCA-Preserving Compilation of Jasmin's ML-KEM | [arXiv:2511.11292v2](https://arxiv.org/abs/2511.11292) | `400e0a532c4b9843…` |

## Game-based cryptographic proof frameworks

<a id="crypto-proof-frameworks"></a>

**Supports.** How probabilistic programs, oracles, and adversary games are represented inside a higher-order logic when a security property rather than a functional one is the target.

**Does not support.** Any security claim in this estate. The current programme states functional correctness only; no game, adversary, or advantage bound is defined.

| Source | Identifier | Local pin (sha256) |
| --- | --- | --- |
| CryptHOL: Game-based Proofs in Higher-order Logic | unresolved — pinned by digest | `8e5557a07d91e1b1…` |
| Probabilistic functions and cryptographic oracles in higher order logic | unresolved — pinned by digest | `3c7a6f3baf876493…` |

## Proof-assistant internals, kernel checking, and reduction cost

<a id="proof-assistant-internals"></a>

**Supports.** What the kernel actually does when it is asked to decide an equality, what reduction strategies cost, and how external certificates enter a proof. The basis for every feasibility judgment about kernel-checked evaluation.

**Does not support.** A performance result measured on another system or toolchain version is evidence about that pin only, never a prediction for this estate's pinned Lean.

| Source | Identifier | Local pin (sha256) |
| --- | --- | --- |
| The Lean 4 Theorem Prover and Programming Language | [doi:10.1007/978-3-030-79876-5_37](https://doi.org/10.1007/978-3-030-79876-5_37) | `e1fc635e3e6e8457…` |
| Lean4Lean: Verifying a Typechecker for Lean, in Lean | [arXiv:2403.14064v3](https://arxiv.org/abs/2403.14064) | `6c252ceb01b82a5f…` |
| Interactive Bitvector Reasoning using Verified Bit-Blasting | [doi:10.1145/3763167](https://doi.org/10.1145/3763167) | `a89fa62e1ed96a14…` |
| LRAT-Catcher: Importing SAT Solver Certificates into Lean 4 by Reflection | [arXiv:2607.00815v1](https://arxiv.org/abs/2607.00815) | `3838fff9f3a62481…` |
| A Lazy, Concurrent Convertibility Checker | [arXiv:2510.18418v2](https://arxiv.org/abs/2510.18418) | `6384b268fe53f3be…` |
| Full reduction at full throttle | unresolved — pinned by digest | `8c6a65520b8235ea…` |
| A Compiled Implementation of Strong Reduction | unresolved — pinned by digest | `0d799e758d73d3a5…` |
| Proving Equalities in a Commutative Ring Done Right in Coq | unresolved — pinned by digest | `1815552890c02cb9…` |
| Reflexive tactics for algebra, revisited | [arXiv:2202.04330v1](https://arxiv.org/abs/2202.04330) | `3f7282db94befe8b…` |
| A computer-checked proof of the Four Colour Theorem | unresolved — pinned by digest | `4019e3bce2525a36…` |
| An introduction to small scale reflection in Coq | unresolved — pinned by digest | `83cc7c36a24cefa5…` |
| Performance Engineering of Proof-Based Software Systems at Scale | unresolved — pinned by digest | `1009b9904182adf7…` |
| Changing Data Representation within the Coq System | unresolved — pinned by digest | `fbc39bcc2fcdfda6…` |
| SMTCoq: A plug-in for integrating SMT solvers into Coq | unresolved — pinned by digest | `7054a806218d3e0b…` |
| Reconstruction of Z3's Bit-Vector Proofs in HOL4 and Isabelle/HOL | unresolved — pinned by digest | `a8e7e6dc8ddacbc7…` |
| Towards Bit-Width-Independent Proofs in SMT Solvers | [arXiv:1905.10434v3](https://arxiv.org/abs/1905.10434) | `8beb0f2701513011…` |
| A Formalization of Core Why3 in Coq | [doi:10.1145/3632902](https://doi.org/10.1145/3632902) | `79cb0553de36380c…` |

## Effectful semantics carriers and coinductive reasoning

<a id="semantics-carriers"></a>

**Supports.** Carriers for programs with effects, recursion, and nontermination — interaction trees and their descendants — together with the equational and coinductive machinery that makes them provable.

**Does not support.** A settled carrier decision for this estate. No domain decision selects any of these representations.

| Source | Identifier | Local pin (sha256) |
| --- | --- | --- |
| Interaction Trees: Representing Recursive and Impure Programs in Coq (preprint) | [arXiv:1906.00046v2](https://arxiv.org/abs/1906.00046) | `943dc278978b9d85…` |
| Interaction Trees: Representing Recursive and Impure Programs in Coq (POPL published version) | [doi:10.1145/3371119](https://doi.org/10.1145/3371119) | `4cc833d5d09f520e…` |
| From C to Interaction Trees: Specifying, Verifying, and Testing a Networked Server | [arXiv:1811.11911v1](https://arxiv.org/abs/1811.11911) | `8c7d610f72255df0…` |
| An Equational Theory for Weak Bisimulation via Generalized Parameterized Coinduction | [arXiv:2001.02659v1](https://arxiv.org/abs/2001.02659) | `8c00b92dd09ec077…` |
| Modular, compositional, and executable formal semantics for LLVM IR | [doi:10.1145/3473572](https://doi.org/10.1145/3473572) | `592aa955d443d6ac…` |
| Vellvm: Formalizing the Informal LLVM (Experience Report) | unresolved — pinned by digest | `e51286573144d32b…` |
| Choice Trees: Representing Nondeterministic, Recursive, and Impure Programs in Coq | [arXiv:2211.06863v1](https://arxiv.org/abs/2211.06863) | `87cae08d3a3c0156…` |
| HITrees: Higher-Order Interaction Trees | [arXiv:2510.14558v1](https://arxiv.org/abs/2510.14558) | `86389e257dc4b0bd…` |
| Modular Denotational Semantics for Effects with Guarded Interaction Trees | [arXiv:2307.08514v2](https://arxiv.org/abs/2307.08514) | `40d999b3e15d69b8…` |
| Formally Verified Simulations of State-Rich Processes using Interaction Trees in Isabelle/HOL | [arXiv:2105.05133v1](https://arxiv.org/abs/2105.05133) | `7ea89f9ef194aace…` |
| Interaction Tree Semantics for RISC-V: Bridging Compiler and Hardware Verification | [arXiv:2605.04933v1](https://arxiv.org/abs/2605.04933) | `3136b2b383615ba8…` |
| Verifying an HTTP Key-Value Server with Interaction Trees and VST | [doi:10.4230/LIPIcs.ITP.2021.32](https://doi.org/10.4230/LIPIcs.ITP.2021.32) | `f159b5ea9b2cbde4…` |

## Translation validation and derived-artifact correctness

<a id="translation-validation"></a>

**Supports.** How a generated artifact is made trustworthy without trusting its generator: per-run validation, verified generators, and typed intermediate representations. The pattern any code generation in this estate must answer to.

**Does not support.** A verdict about any generator used here. Admission of a tool is governed by the tool register, not by these papers.

| Source | Identifier | Local pin (sha256) |
| --- | --- | --- |
| Translation Validation for an Optimizing Compiler | unresolved — pinned by digest | `335d4a06577b2231…` |
| Validating LR(1) Parsers | unresolved — pinned by digest | `12c960e08f7b5235…` |
| A Verified LL(1) Parser Generator | [doi:10.4230/LIPIcs.ITP.2019.24](https://doi.org/10.4230/LIPIcs.ITP.2019.24) | `0e80eca0a7835ccb…` |
| MimIR: An Extensible and Type-Safe Intermediate Representation for the DSL Age | [arXiv:2411.07443v2](https://arxiv.org/abs/2411.07443) | `89abaa4b949554e6…` |

## Type-system and effect lineage (E1)

<a id="type-effect-lineage"></a>

**Supports.** The declarative and algorithmic systems behind the typechecker and ability model this estate compares itself to; the specification shape any typechecker-equivalence claim must take.

**Does not support.** Any implementation's conformance to these systems, and any statement about content addressing, which neither paper treats.

| Source | Identifier | Local pin (sha256) |
| --- | --- | --- |
| Complete and Easy Bidirectional Typechecking for Higher-Rank Polymorphism | [arXiv:1306.6032v2](https://arxiv.org/abs/1306.6032) | `0e75ac60ee631775…` |
| Do Be Do Be Do | [arXiv:1611.09259v2](https://arxiv.org/abs/1611.09259) | `9cc06103fd865a49…` |

## Machine-assisted proof search and development flow

<a id="proof-automation-ml"></a>

**Supports.** How learned models are attached to a proof assistant, what they are measured against, and the reported experience of driving formalization with them.

**Does not support.** Any trust contribution. A model-produced proof step carries the kernel's verdict and nothing else; harnesses are admitted with an empty trust statement.

| Source | Identifier | Local pin (sha256) |
| --- | --- | --- |
| Graph2Tac: Online Representation Learning of Formal Math Concepts | [arXiv:2401.02949v3](https://arxiv.org/abs/2401.02949) | `3cc5312d60edf083…` |
| The Tactician's Web of Large-Scale Formal Knowledge | [arXiv:2401.02950v2](https://arxiv.org/abs/2401.02950) | `97a0a285995ca7f5…` |
| Tree-Based Premise Selection for Lean4 | unresolved — pinned by digest | `12b81958bf2f9f10…` |
| A Rust-to-Lean Verification Pipeline with AI Provers: An Experience Report | [arXiv:2605.30106v2](https://arxiv.org/abs/2605.30106) | `7edf74067d3b2186…` |
| Highly Interactive Testing for Uninterrupted Development Flow | [arXiv:2508.02176v1](https://arxiv.org/abs/2508.02176) | `b12e04c917f7e588…` |

## Reading this index

A cluster's **Supports** line is the only use its members are admitted for.
A source cited outside that line is being used beyond its role, which is a
provenance defect (C6), not a stylistic one. Identifiers marked *unresolved*
carry no public pin: the document did not print an arXiv identifier or a DOI,
so the digest is the whole of its identity until one is resolved by hand.
