# RQ-2 reference area — is extraction proved, or trusted?

Supports [`docs/research/2026-08-16-rq2-extraction-proved-or-trusted.md`](../../2026-08-16-rq2-extraction-proved-or-trusted.md).

**Nothing third-party is vendored here.** Every external item is a link plus
a minimal attributed excerpt in [`quotations.md`](quotations.md); the only
code in this directory is own-authored and runs against the toolchain the
estate already pins.

All web retrievals happened on **2026-08-16**.

## Own-authored items

| Item | What it is | Origin | Licence | Date |
| --- | --- | --- | --- | --- |
| [`lean-trust-gap/TrustGap.lean`](lean-trust-gap/TrustGap.lean) | 14-line Lean file: a kernel-checked theorem and an exported C symbol that compute different functions | written for this report | Apache-2.0, this repository | 2026-08-16 |
| [`lean-trust-gap/ByteKernel.lean`](lean-trust-gap/ByteKernel.lean) | an ordinary `ByteArray` function, to show what runtime C the backend emits for the kernel ABI's own type | written for this report | Apache-2.0, this repository | 2026-08-16 |
| [`lean-trust-gap/CsimpGuard.lean`](lean-trust-gap/CsimpGuard.lean) | the same swap under `@[csimp]`, which refuses it; **expected to fail elaboration** | written for this report | Apache-2.0, this repository | 2026-08-16 |
| [`lean-trust-gap/run.sh`](lean-trust-gap/run.sh) | self-checking driver: exits nonzero if any claim in the transcript is false | written for this report | Apache-2.0, this repository | 2026-08-16 |
| [`lean-trust-gap/TRANSCRIPT.md`](lean-trust-gap/TRANSCRIPT.md) | the recorded run on this machine, exit status 0 | executed here | Apache-2.0, this repository | 2026-08-16 |
| [`quotations.md`](quotations.md) | the surveyed projects' own boundary statements, quoted minimally with source, version and retrieval date | compiled for this report | excerpts remain their authors'; compilation Apache-2.0 | 2026-08-16 |

Reproduce with `bash lean-trust-gap/run.sh` on a machine with `lean` on
PATH. Recorded against Lean 4.33.0
(`d8b18978322de05a8f3dba51ef03cf5461676c17`), Windows 11, Git Bash. The
emitted C is written to a scratch directory and deleted; nothing generated
is committed.

## Linked sources

Licences are recorded where the source states one, or where the hosting
repository declares one via its own metadata. "Not stated" means exactly
that — and since nothing is copied here beyond short attributed excerpts,
no licence question arises for this directory.

| Source | What it is | Where | Licence | Retrieved |
| --- | --- | --- | --- | --- |
| seL4 "What the Proofs Assume" | the field's most explicit assumptions page | <https://sel4.systems/Verification/assumptions.html> | not stated on page | 2026-08-16 |
| seL4 FAQ | proof scope, "does seL4 have zero bugs" | <https://sel4.systems/About/FAQ.html> | not stated on page | 2026-08-16 |
| Sewell, Myreen, Klein, *Translation Validation for a Verified OS Kernel*, PLDI 2013 | validating gcc's output per build, not proving gcc | <https://trustworthy.systems/publications/nicta_full_text/6449.pdf> | ACM/author copyright | 2026-08-16 |
| CompCert manual v3.17 (13 Feb 2026) | which phases are verified, and Valex | <https://compcert.org/man/manual001.html> | CC BY-NC-SA 4.0, stated on the manual index | 2026-08-16 |
| Kumar, Myreen, Norrish, Owens, *CakeML*, POPL 2014 | the camp that closes the gap | <https://cakeml.org/popl14.pdf> | ACM copyright | 2026-08-16 |
| CakeML project page | proof-producing synthesis, bootstrapping | <https://cakeml.org/> | not stated on page | 2026-08-16 |
| Protzenko et al., *EverCrypt*, IEEE S&P 2020 | §II-C is a model TCB section | <https://eprint.iacr.org/2019/757.pdf> | IACR ePrint, author copyright | 2026-08-16 |
| KaRaMeL | the Low\*→C compiler; "formalized on paper" | <https://github.com/FStarLang/karamel> | Apache-2.0 (repo metadata) | 2026-08-16 |
| HACL\* | the verified library KaRaMeL compiles | <https://github.com/hacl-star/hacl-star> | Apache-2.0 (repo metadata) | 2026-08-16 |
| Erbsen et al., *Fiat-Crypto*, IEEE S&P 2019 | proofs to a C-like AST, printer trusted, shipped in BoringSSL | <https://people.csail.mit.edu/jgross/personal-website/papers/2019-fiat-crypto-ieee-sp.pdf> | IEEE copyright | 2026-08-16 |
| Rocq reference manual, *Program extraction* (page version 9.4+alpha) | the extraction commands and their caveats | <https://rocq-prover.org/doc/master/refman/addendum/extraction.html> | Rocq docs licence (not restated on page) | 2026-08-16 |
| Forster, Sozeau, Tabareau, *Verified Extraction from Coq to OCaml*, PLDI 2024 | states plainly that extraction is in the TCB, then removes it | <https://hal.science/hal-04329663/document> | CC BY-NC 4.0, stated in the PDF | 2026-08-16 |
| Isabelle, *Code generation from Isabelle/HOL theories* (18 Jan 2026) | the thin-untrusted-layer framing; "completely axiomatic" adaptations | <https://isabelle.in.tum.de/doc/codegen.pdf> | Isabelle distribution (BSD-style) | 2026-08-16 |
| CertiRocq | verified compiler for Gallina to Clight and WebAssembly | <https://github.com/CertiRocq/certirocq> | MIT, stated in README | 2026-08-16 |
| Meier, Pichon-Pharabod, Spitters, *CertiCoq-Wasm*, CoqPL 2024 abstract / CPP 2025 | verified compilation into our ratified target format | <https://womeier.de/files/certicoqwasm-coqpl24-abstract.pdf>, <https://doi.org/10.1145/3703595.3705879> | author copyright / ACM | 2026-08-16 |
| Lean 4 toolchain sources v4.33.0 | `trustCompiler`, `ofReduceBool`, `@[implemented_by]`, `@[csimp]` | installed by elan; upstream <https://github.com/leanprover/lean4> | Apache-2.0 (toolchain `LICENSE`) | 2026-08-16 |
| *The Lean Language Reference*, 4.34.0-rc1 | axioms chapter; FFI chapter | <https://lean-lang.org/doc/reference/latest/Axioms/>, <https://lean-lang.org/doc/reference/latest/Run-Time-Code/Foreign-Function-Interface/> | not stated on page | 2026-08-16 |
| de Moura, Ullrich, *The Lean 4 Theorem Prover and Programming Language*, CADE 2021 | "relatively small trusted kernel"; §3 the code generator | <https://lean-lang.org/papers/lean4.pdf> | Springer/author copyright | 2026-08-16 |
| Lean4Lean | verified re-implementation of the **kernel** | <https://github.com/digama0/lean4lean> | Apache-2.0 (repo metadata) | 2026-08-16 |
| cedar-spec | Lean model plus differential randomized testing against Rust | <https://github.com/cedar-policy/cedar-spec> | Apache-2.0, stated in README | 2026-08-16 |
| Cutler et al., *Cedar* (extended version) | the Lean-model-plus-Rust-implementation design | <https://arxiv.org/abs/2403.04651> | arXiv, author licence | 2026-08-16 |
