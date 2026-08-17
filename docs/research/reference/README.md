# Reference area — root index

This directory holds the supporting material for the nine research
reports dispatched on 2026-08-16 against
`scratch/dispatch/19-refinement-research-questions.md`, which asks for
"one subdirectory per topic and a `README.md` at the root recording, for
every item: what it is, where it came from, its license, and the date
retrieved." This file is that root index. It aggregates the nine
per-topic READMEs; where one of those records a licence as absent or
unestablished, that is recorded here as absent, never filled in by
guesswork.

**Retrieval date for every item in this area: 2026-08-16.** Where a
per-topic README pins a commit, tag or release in addition to the date,
the pin is carried below.

**Nothing third-party is vendored.** Every external item is a link plus
a distilled summary or a short attributed quotation in the report that
cites it. The only third-party bytes anywhere in this tree are the
module checksums in `rq3-wasm-verified-target/host-wazero/go.sum`, which
are hashes rather than code. Own-authored material carries this
repository's licence (Apache-2.0, `LICENSE` at the root).

**Nothing here is a foldlab gate.** The runnable items are minimal
reproductions written so that a sceptic can re-run them; several of them
are *demonstrations of failure* and would be actively wrong to wire into
a workflow. None is referenced by any gate.

Consolidated findings across the nine reports, including the defects the
independent verifiers found in this reference area, are in
[`../2026-08-16-rq-synthesis.md`](../2026-08-16-rq-synthesis.md) §3.2.

Counts below are of files the repository tracks (build outputs are
excluded by a local ignore rule in the one directory that produces them)
and of the external sources each topic README records.

| Topic directory | Report it serves | Tracked files | External sources recorded |
| --- | --- | --- | --- |
| `rq1-lean-c-backend/` | [RQ-1](../2026-08-16-rq1-lean-c-backend.md) | 16 | 3 |
| `rq2-extraction-proved-or-trusted/` | [RQ-2](../2026-08-16-rq2-extraction-proved-or-trusted.md) | 7 | 21 |
| `rq3-wasm-verified-target/` | [RQ-3](../2026-08-16-rq3-wasm-verified-target.md) | 27 | 19 |
| `rq4-verify-existing-implementations/` | [RQ-4](../2026-08-16-rq4-verify-existing-implementations.md) | 4 | 15 |
| `rq5-ci-conformance-gates/` | [RQ-5](../2026-08-16-rq5-ci-conformance-gates.md) | 18 | recorded per entry in `links-and-techniques.md` |
| `rq6-reproducible-artifacts/` | [RQ-6](../2026-08-16-rq6-reproducible-artifacts.md) | 8 | 25 |
| `rq7-run-certificates/` | [RQ-7](../2026-08-16-rq7-run-certificates.md) | 15 | recorded per entry in `links-and-quotations.md` |
| `rq8-proof-maintenance/` | [RQ-8](../2026-08-16-rq8-proof-maintenance.md) | 10 | 10 |
| `rq9-rfc8785-numbers/` | [RQ-9](../2026-08-16-rq9-rfc8785-numbers.md) | 9 | 13 |

---

## rq1-lean-c-backend/

**What the directory is.** A runnable example of a Lean 4 function
becoming a C-callable symbol through Lean's own compiler backend, with
probes for initialisation order, ownership, threading, panics and
per-call cost, plus two host bindings (a Bun foreign-function host and a
Go cgo host). Built and run on Windows with Lean 4.33.0 and MSYS2 gcc
16.1.0 on 2026-08-16.

### Committed items — all own-authored, this repository's licence (Apache-2.0)

| Path | What it is | Where it came from |
| --- | --- | --- |
| `README.md` | The topic README this section aggregates | Written for RQ-1 |
| `minimal-example/Spike.lean` | Seven `@[export]` definitions probing scalars, byte arrays, product returns, `IO`, `panic!` and refusal-as-data | Written for RQ-1 |
| `minimal-example/Reject.lean` | Three declarations the attribute should arguably refuse; the finding is that it does not, emitting C with no diagnostic | Written for RQ-1 |
| `minimal-example/main.c` | Freestanding C caller: initialisation, ownership, in-place versus copy, product return, `IO` unwrap | Written for RQ-1 against the documented sequence in the Lean 4.33.0 reference and against `<lean/lean.h>` as shipped |
| `minimal-example/probe.c` | `panic` / `thread` / `thread-noinit` / `bench` / `threadbench` modes | Written for RQ-1 |
| `minimal-example/initprobe.c` | `order` / `double` / `modonly` / `noinit` initialisation-order probes | Written for RQ-1 |
| `minimal-example/shim.c` | The plain-C façade a non-C host requires, because the runtime's byte-array allocator has no linkable symbol | Written for RQ-1 |
| `minimal-example/bun-host.ts` | Bun foreign-function-interface host against the self-contained library | Written for RQ-1 |
| `minimal-example/go-host/main.go`, `go-host/go.mod` | cgo host with `naive` / `lock` / `lock+ti` threading modes | Written for RQ-1 |
| `minimal-example/build.ps1` | Reproduces every artifact the report cites | Written for RQ-1 |
| `minimal-example/lakefile.toml`, `lean-toolchain`, `lake-manifest.json` | Pin `leanprover/lean4:v4.33.0` | Written for RQ-1 |
| `minimal-example/TRANSCRIPT.md` | Recorded output of every run | Executed on this machine 2026-08-16 |
| `minimal-example/.gitignore` | Excludes build outputs (`.lake/`, `*.o`, `*.exe`, `*.dll`, the generated `bare.c`, `go-host/go.sum`) so the committed tree is sources only | Written for RQ-1 |

*Recorded gap:* the topic README's file table omits `.gitignore`,
`go-host/go.mod`, `lake-manifest.json` and the generated `bare.c`, and
its prose says "five `@[export]`ed Lean functions" where the table row
and the file say seven. Recorded rather than corrected here; see the
synthesis scoreboard.

*On the compiled artifacts:* running `build.ps1` produces executables, a
≈4 MB dynamic library and object files beside the sources. They are
excluded by the local `.gitignore` and regenerate from the build script,
so no Lean-runtime bytes enter the commit.

### External sources — linked, never copied

| Source | What it establishes | Where | Licence | Retrieved |
| --- | --- | --- | --- | --- |
| Lean 4 language reference, Foreign Function Interface chapter | The `@[export]` mechanism, the Lean ABI, borrowing, initialisation, the interface's documented instability | <https://lean-lang.org/doc/reference/4.33.0/Run-Time-Code/Foreign-Function-Interface/> — version pinned by the toolchain's own `include/lean/version.h` | **Not established.** The topic README records that the manual's licence could not be determined, so nothing beyond short evidential quotations is used | 2026-08-16 |
| `include/lean/lean.h`, toolchain `leanprover/lean4:v4.33.0` | Ownership convention, byte-array representation, the allocator's `static inline` status; 3,333 lines / 133,942 bytes | On disk at `$(lean --print-prefix)/include/lean/lean.h`; upstream <https://github.com/leanprover/lean4/blob/v4.33.0/src/include/lean/lean.h> | Apache-2.0, per the file's own header | 2026-08-16 (read on disk) |
| `src/runtime/init_module.cpp` @ tag `v4.33.0` | That the runtime-module initialiser carries no idempotence guard — nine unconditional sub-initialiser calls | <https://github.com/leanprover/lean4/blob/v4.33.0/src/runtime/init_module.cpp> | Apache-2.0, stated in the file header | 2026-08-16 |

---

## rq2-extraction-proved-or-trusted/

**What the directory is.** A survey of how verified-systems projects
word the boundary between what they prove and what they trust, plus a
small executed demonstration that Lean's axiom footprint cannot see a
compiled-code substitution.

### Committed items — all own-authored, Apache-2.0 (this repository)

| Path | What it is | Where it came from |
| --- | --- | --- |
| `README.md` | The topic README | Written for RQ-2 |
| `lean-trust-gap/TrustGap.lean` | 14 lines: a kernel-checked theorem and an exported C symbol that compute different functions | Written for RQ-2 |
| `lean-trust-gap/ByteKernel.lean` | An ordinary byte-array function, showing what runtime C the backend emits for the kernel interface's own type | Written for RQ-2 |
| `lean-trust-gap/CsimpGuard.lean` | The same substitution under a checked attribute, which refuses it; **expected to fail elaboration** | Written for RQ-2 |
| `lean-trust-gap/run.sh` | Self-checking driver; exits nonzero if any claim in the transcript is false | Written for RQ-2 |
| `lean-trust-gap/TRANSCRIPT.md` | The recorded run, exit status 0 | Executed here 2026-08-16 (Lean 4.33.0, commit `d8b1897…`) |
| `quotations.md` | The surveyed projects' own boundary statements, quoted minimally with source, version and retrieval date | Compiled for RQ-2; excerpts remain their authors', compilation Apache-2.0 |

### External sources — linked, never copied

| Source | What it establishes | Where | Licence | Retrieved |
| --- | --- | --- | --- | --- |
| seL4, "What the Proofs Assume" | The field's most explicit assumptions statement | <https://sel4.systems/Verification/assumptions.html> | Not stated on page | 2026-08-16 |
| seL4 FAQ | Proof scope; binary verification removing compiler and linker from the base | <https://sel4.systems/About/FAQ.html> | Not stated on page | 2026-08-16 |
| Sewell, Myreen, Klein, *Translation Validation for a Verified OS Kernel*, PLDI 2013 | Validating a compiler's output per build rather than proving the compiler | <https://trustworthy.systems/publications/nicta_full_text/6449.pdf> | ACM / author copyright | 2026-08-16 |
| CompCert manual v3.17 (13 Feb 2026) | Which phases are proved and which are not; the after-the-fact validation tool | <https://compcert.org/man/manual001.html> | CC BY-NC-SA 4.0, stated on the manual index | 2026-08-16 |
| Kumar, Myreen, Norrish, Owens, *CakeML*, POPL 2014 | The camp that closes the extraction gap by proof | <https://cakeml.org/popl14.pdf> | ACM copyright | 2026-08-16 |
| CakeML project page | Proof-producing synthesis and bootstrapping | <https://cakeml.org/> | Not stated on page | 2026-08-16 |
| Protzenko et al., *EverCrypt*, IEEE S&P 2020 | A model trusted-base section (§II-C) | <https://eprint.iacr.org/2019/757.pdf> | IACR ePrint, author copyright | 2026-08-16 |
| KaRaMeL | The Low\*-to-C compiler; "formalized on paper" | <https://github.com/FStarLang/karamel> | Apache-2.0 (repository metadata) | 2026-08-16 |
| HACL\* | The verified library that compiler compiles | <https://github.com/hacl-star/hacl-star> | Apache-2.0 (repository metadata) | 2026-08-16 |
| Erbsen et al., *Fiat-Crypto*, IEEE S&P 2019 | Proofs to a C-like syntax tree, printer trusted, shipped in BoringSSL | <https://people.csail.mit.edu/jgross/personal-website/papers/2019-fiat-crypto-ieee-sp.pdf> | IEEE copyright | 2026-08-16 |
| Rocq reference manual, *Program extraction* (9.4+alpha) | The extraction commands and their caveats | <https://rocq-prover.org/doc/master/refman/addendum/extraction.html> | Rocq documentation licence (not restated on page) | 2026-08-16 |
| Forster, Sozeau, Tabareau, *Verified Extraction from Coq to OCaml*, PLDI 2024 | States that extraction is in the trusted base, then removes it | <https://hal.science/hal-04329663/document> | CC BY-NC 4.0, stated in the PDF | 2026-08-16 |
| Isabelle, *Code generation from Isabelle/HOL theories* (18 Jan 2026) | The thin-untrusted-layer framing; "completely axiomatic" adaptations | <https://isabelle.in.tum.de/doc/codegen.pdf> | Isabelle distribution (BSD-style) | 2026-08-16 |
| CertiRocq | Verified compiler for Gallina to Clight and WebAssembly | <https://github.com/CertiRocq/certirocq> | MIT, stated in README | 2026-08-16 |
| Meier, Pichon-Pharabod, Spitters, *CertiCoq-Wasm*, CoqPL 2024 / CPP 2025 | Verified compilation into our ratified target format — for Rocq, not Lean | <https://womeier.de/files/certicoqwasm-coqpl24-abstract.pdf>, <https://doi.org/10.1145/3703595.3705879> | Author copyright / ACM | 2026-08-16 |
| Lean 4 toolchain sources v4.33.0 | `trustCompiler`, `ofReduceBool`, `@[implemented_by]`, `@[csimp]` | Installed by elan; upstream <https://github.com/leanprover/lean4> | Apache-2.0 (toolchain `LICENSE`) | 2026-08-16 |
| *The Lean Language Reference*, 4.34.0-rc1 | Axioms chapter; FFI chapter | <https://lean-lang.org/doc/reference/latest/Axioms/> | Not stated on page | 2026-08-16 |
| de Moura, Ullrich, *The Lean 4 Theorem Prover and Programming Language*, CADE 2021 | "Relatively small trusted kernel"; §3 the code generator, with no correctness claim attached | <https://lean-lang.org/papers/lean4.pdf> | Springer / author copyright | 2026-08-16 |
| Lean4Lean | A verified re-implementation of the **kernel**, not the backend | <https://github.com/digama0/lean4lean> | Apache-2.0 (repository metadata) | 2026-08-16 |
| cedar-spec | A Lean model plus differential randomized testing against Rust | <https://github.com/cedar-policy/cedar-spec> | Apache-2.0, stated in README | 2026-08-16 |
| Cutler et al., *Cedar* (extended version) | The Lean-model-plus-hand-written-implementation design | <https://arxiv.org/abs/2403.04651> | arXiv, author licence | 2026-08-16 |

---

## rq3-wasm-verified-target/

**What the directory is.** Eight hand-encoded WebAssembly probes written
directly from the core specification's binary format, drivers for two
hosts (wazero in Go, Bun's engine and system-interface runner), and the
transcripts of running every probe through both. Nothing here was
produced by a WebAssembly toolchain; there is none on the machine.

### Committed items — all own-authored, this repository's licence

| Path | What it is | Where it came from |
| --- | --- | --- |
| `README.md`, `RUNBOOK.md` | The topic README, and the commands that reproduce every transcript | Written for RQ-3 |
| `gen/main.go`, `gen/go.mod` | Hand-encodes the eight probes from the binary format; no dependencies beyond the Go compiler | Written for RQ-3 |
| `wasm/probe.wasm` | Zero-import identity probe (NaN payloads, memory growth at the declared maximum, a byte-in/byte-out function over linear memory). sha256 `ec49aa6decea4c8a6562c6ca5baadf08bd4466dc3368c42e92881ddc3a768b50`, regenerated identically from two directories | Generated by `gen/` |
| `wasm/feat_shared.wasm`, `wasm/feat_atomic.wasm` | Whether a host accepts a module built the way Lean's Emscripten target is built (threads implying shared memory and atomics) | Generated by `gen/` |
| `wasm/feat_tailcall.wasm` | Whether a host accepts a WebAssembly 3.0 tail call (validate only) | Generated by `gen/` |
| `wasm/wasi_min.wasm`, `wasm/wasi_grow.wasm` | Baseline system-interface probes before and after guest memory growth | Generated by `gen/` |
| `wasm/wasi_rand_ok.wasm`, `wasm/wasi_rand_oob.wasm` | The sharp pair: the process exit code *is* the errno the host's shim returned, so a divergence needs no instrumentation | Generated by `gen/` |
| `host-wazero/main.go`, `go.mod`, `go.sum` | wazero driver: identity, feature acceptance, system interface, import listing, three concurrency patterns. `go.sum` carries module checksums only | Written for RQ-3; declares `github.com/tetratelabs/wazero v1.12.0` |
| `host-bun/run.ts` | Bun driver, output shaped to diff line-for-line against the wazero transcript; uses only the standard WebAssembly JavaScript interface and `node:wasi` | Written for RQ-3 |
| `gowasi/main.go`, `go.mod` | A three-line Go program built for the system-interface target, used only to obtain a realistic import surface. The 2.6 MB built module is **not** kept; rebuild it from `RUNBOOK.md` | Written for RQ-3 |
| `transcripts/*.txt` (9 files) | Verbatim standard output of the runs described in `RUNBOOK.md`: `bun-features`, `bun-identity`, `bun-wasi`, `gowasi-both-hosts`, `wazero-concurrency`, `wazero-features`, `wazero-gowasi-imports`, `wazero-identity`, `wazero-wasi` | Executed here 2026-08-16 |

*Recorded gap:* `RUNBOOK.md` is own-authored and load-bearing but does
not appear in the topic README's own inventory table, so it carries no
provenance, licence or retrieval row there. Recorded, not corrected.

*Naming note carried from the topic README:* the Go module path is still
`github.com/tetratelabs/wazero`, while the GitHub repository now answers
as `wazero/wazero`.

### External sources — linked, never copied

| Source | What it establishes | Pin | Licence | Retrieved |
| --- | --- | --- | --- | --- |
| WebAssembly/design `Nondeterminism.md` | The design repository's enumeration of where the language admits nondeterminism | commit `06ec8db6…` (2025-01-22) | Apache-2.0 | 2026-08-16 |
| WebAssembly core spec, `appendix/profiles.rst` | The deterministic profile; present at `wg-3.0`, absent at `wg-2.0` (HTTP 404) | tag `wg-3.0` | W3C Software and Document Licence | 2026-08-16 |
| WebAssembly core spec, `exec/numerics.rst` | NaN-propagation rule and the deterministic-profile exception | `main`, file last touched `63201edd…` | W3C Software and Document Licence | 2026-08-16 |
| WebAssembly core spec, `exec/instructions.rst` | Memory-growth nondeterminism; "Invoking a host function has non-deterministic behavior" | `main` | W3C Software and Document Licence | 2026-08-16 |
| WebAssembly/proposals `finished-proposals.md`, `README.md` | Exception handling and tail call are 3.0; threads is still Phase 4 and in no released version | `main` | Apache-2.0 | 2026-08-16 |
| wazero `api/wasm.go` | The goroutine-safety contract on calling a function handle | tag `v1.12.0` (released 2026-05-29) | Apache-2.0 | 2026-08-16 |
| wazero `config.go`, `api/features.go`, `experimental/features.go` | Default is core features v2; threads, tail calls and exception handling are experimental opt-ins | tag `v1.12.0` | Apache-2.0 | 2026-08-16 |
| wazero `site/content/specs.md` | Conformance statement and system-interface status | tag `v1.12.0` | Apache-2.0 | 2026-08-16 |
| wazero `imports/wasi_snapshot_preview1/random.go` | Returns 0 on success and a fault errno out of range | tag `v1.12.0` | Apache-2.0 | 2026-08-16 |
| WASI `snapshot-01` docs | That the call in question returns an errno, not a byte count | tag `snapshot-01` | Apache-2.0 WITH LLVM-exception | 2026-08-16 |
| Bun `docs/runtime/nodejs-compat.mdx` | Bun's own statement that its `node:wasi` is partially implemented | `main` | MIT | 2026-08-16 |
| Lean 4 `src/CMakeLists.txt` | Emscripten target settings, GMP handling, the LibUV patch, dynamic-linking mode | tag `v4.33.0` | Apache-2.0 | 2026-08-16 |
| Lean 4 `.github/workflows/ci.yml` | The "Web Assembly" job, active at v4.15.0 and commented out from v4.16.0 through `master` | tags `v4.15.0`, `v4.16.0`, `v4.20.0`, `v4.24.0`, `v4.33.0`, `master` | Apache-2.0 | 2026-08-16 |
| Lean 4 `src/runtime/mpz.h` | A non-GMP bignum path exists | tag `v4.33.0` | Apache-2.0 | 2026-08-16 |
| lean4web README | Refutes the dispatch's lead: it runs Lean server-side, not in WebAssembly | `main` | Apache-2.0 | 2026-08-16 |
| T-Brick/lean2wasm | The only located tool for compiling user Lean code to WebAssembly; last push 2024-03-17 | `main` | MIT | 2026-08-16 |
| Emscripten `src/settings.js`, `site/source/docs/compiling/WebAssembly.rst` | Standalone-output semantics, and that the default output is not a standalone module | `main`, version `6.0.7-git` | MIT / NCSA | 2026-08-16 |
| Protzenko, Beurdouche, Merigoux, Bhargavan, *Formally Verified Cryptographic Web Applications in WebAssembly*, IEEE S&P 2019 | The published argument for WebAssembly over C as a target for verified code | <https://eprint.iacr.org/2019/542.pdf> | ePrint posting; not redistributed here | 2026-08-16 |
| Lean Zulip, `#lean4 > lol another WASM question` | **Lead, not primary.** Maintainer statements from 2021–2022 on standalone builds | Public archive | Archive of a public stream | 2026-08-16 |

---

## rq4-verify-existing-implementations/

**What the directory is.** A census of the constructs in our own seam
files that the candidate verifiers' own documentation places outside
their input subsets, plus measured continuous-integration durations for
three real proof-bearing pipelines, plus links and distilled technique
summaries for the tools and precedents surveyed.

### Committed items — all own-authored, this repository's licence

| Path | What it is | Where it came from |
| --- | --- | --- |
| `README.md` | The topic README | Written for RQ-4 |
| `subset-census.mjs` | Counts, in the five files holding the seam's decisions, the constructs the candidate verifiers document as outside or weakly inside their subsets. Each row cites a primary-source key | Written for RQ-4 |
| `subset-census.txt` | The transcript, which also records that Gobra could **not** be run here (no JVM configured; the other prover not installed) | Executed here 2026-08-16 |
| `measured-ci-durations.txt` | Read-only GitHub REST API calls measuring wall-clock duration of three proof-bearing workflows. Durations include runner provisioning, as the file records | Commands run by the RQ-4 seat 2026-08-16; embedded timestamps are factual API output |

*Honest limit carried from the topic README:* the census is a census, not
a verifier. A zero does not mean a tool would accept the file. (The
independent verifier further found that two of its probes over-count
rather than under-count; see the synthesis scoreboard.)

### External sources — linked, never copied

| Source | What it establishes | Where / pin | Licence | Retrieved |
| --- | --- | --- | --- | --- |
| `aws/s2n-tls` | The prover gate as an actual chain of six files; the eight assumed functions; the bounded-trace correspondence; the planted-defect negative controls and where they sit relative to the per-commit batch | <https://github.com/aws/s2n-tls>, commit `72f5db1f…` on `main` | Apache-2.0 | 2026-08-16 |
| Chudnov et al., *Continuous Formal Verification of Amazon s2n*, CAV 2018 | The field's own statement of the extraction-versus-verify-existing choice, and the only published maintenance data of this shape (956 replays, three proof updates) | <https://d1.awsstatic.com/whitepapers/Security/Continuous_Formal_Verification_Of_Amazon_s2n.pdf> | Open access, © The Author(s) 2018 | 2026-08-16 |
| Pereira et al., *Protocols to Code* (VerifiedSCION) | The one sound prover-to-Gobra link, which calls its own linking step unverified; effort figures | <https://arxiv.org/abs/2405.06074> (v1) | arXiv author-posted | 2026-08-16 |
| `viperproject/VerifiedSCION` | A live Gobra gate on every push and pull request, with per-step timeouts up to six hours | <https://github.com/viperproject/VerifiedSCION> | Apache-2.0 | 2026-08-16 |
| Gobra | "Prototype verifier"; limited string support; the shipped standard-library stub tree | <https://github.com/viperproject/gobra>, `master` HEAD `782b530f…` | MPL-2.0 per the README badge; GitHub reports `NOASSERTION` | 2026-08-16 |
| Gobra issues #902, #671 | Open gaps: `select` statements, generics | <https://github.com/viperproject/gobra/issues/902>, `/pull/671` | Repository licence | 2026-08-16 |
| Goose | Declares its translator and semantics trusted; repository archived | <https://github.com/goose-lang/goose>, `master` commit `7434b9c1…` | MIT | 2026-08-16 |
| Perennial | The active successor; targets Rocq, not Lean | <https://github.com/mit-pdos/perennial>, `master` `aa4b4b61…` | MIT | 2026-08-16 |
| Gillian / Gillian-JS | ES5 JavaScript only; types elided; builtins axiomatised; no higher-order reasoning | <https://github.com/GillianPlatform/Gillian>, `master` `b195dfc3…` | BSD-3-Clause | 2026-08-16 |
| Maksimović et al., *Gillian, Part II*, CAV 2021 | The ~200-line frontier and its stated caveats | <https://giltho.github.io/publications/GillianCAV2021.pdf> | Author copy; Springer record at doi 10.1007/978-3-030-81688-9_38 | 2026-08-16 |
| JaVerT2.0 | The deprecated predecessor | <https://github.com/javert2/JaVerT2.0> | BSD-3-Clause | 2026-08-16 |
| TypeScript design goals and archived specification | Soundness disclaimed as a non-goal; the specification archived in 2020 and the directory now returning 404 | <https://github.com/microsoft/TypeScript-wiki>, commit `30cb2043` | Repository licence | 2026-08-16 |
| cedar-spec | The peer that has a Lean model of the same shape and did **not** verify its production implementation; keeps differential testing and a foreign-function bridge to the Lean model | <https://github.com/cedar-policy/cedar-spec> | Apache-2.0 | 2026-08-16 |
| Frama-C | Named because the brief names it; verifies C, no Go or TypeScript frontend. Release 33.0 "Arsenic" | <https://frama-c.com/html/get-frama-c.html>; mirror `Frama-C/Frama-C-snapshot` last pushed 2020-10-21 | Mirror carries **no detected licence**; the project site is the live source | 2026-08-16 |
| VST | Same category | <https://github.com/PrincetonUniversity/VST> | GitHub reports `NOASSERTION` | 2026-08-16 |

**Deliberately not vendored, and why**, carried verbatim in intent from
the topic README: **JSCert** (<https://github.com/jscert/jscert>) and
**KJS** (<https://github.com/kframework/javascript-semantics>) both
report no detected licence, and the dispatch forbids vendoring code
whose licence is absent or unclear — linked only. The s2n
continuous-integration files are Apache-2.0 and therefore vendorable,
but the discipline prefers a link plus a distilled technique for
configuration, so nothing was copied.

---

## rq5-ci-conformance-gates/

**What the directory is.** Links and distilled technique summaries for
six real proof-gating pipelines, plus three own-authored minimal
reproductions: what a Lean "the proofs build" gate does and does not
catch, how a gate's nonzero exit gets lost between the gate and the
step, and a working shape for the status-as-gate obligation.

### Committed items — all own-authored, this repository's licence

| Path | What it is | Where it came from |
| --- | --- | --- |
| `README.md` | The topic README | Written for RQ-5 |
| `links-and-techniques.md` | Links to six real configurations plus distilled techniques and measured wall-clock numbers; quotations only | Compiled for RQ-5 from `aws/s2n-tls`, `seL4/l4v`, `seL4/ci-actions`, `cedar-policy/cedar-spec`, `hacl-star/hacl-star`, `leanprover-community/mathlib4`, `realworldocaml/mdx`, `doc.rust-lang.org`; per-entry URLs and repository states recorded in the file |
| `lean-sorry-gate/` — `SorryLab.lean`, `SorryLab/Basic.lean`, `axioms.lean`, `lakefile.toml`, `lean-toolchain`, `run.sh` | A Lean 4 package demonstrating that `lake build` exits 0 on a `sorry`, that the incompleteness axiom is inherited one hop away, and that `native_decide` mints a per-declaration axiom. Depends only on Lean 4.33.0 core | Written for RQ-5 |
| `lean-sorry-gate/TRANSCRIPT.md` | The recorded run and its four findings | Executed here 2026-08-16 |
| `exit-code-masking/masking.sh`, `masking.ps1`, `TRANSCRIPT.md` | How a gate's nonzero exit is lost in a pipe, in a command substitution, and past a failing native command, in both shells | Written for and executed here 2026-08-16 |
| `status-as-gate/STATUS.md`, `check-status.sh`, `kernel/step.txt`, `TRANSCRIPT.md` | A minimal reproduction of D-e obligation 5: a status document with machine-readable claim markers, a checker that re-derives every claim at HEAD, a self-test that refutes the checker, and an anti-vacuity check that fails a status file whose markers were deleted | Written for and executed here 2026-08-16 |
| `skipped-required-check/NOTES.md` | The verbatim GitHub documentation on skipped-but-required checks, and why the "a job skipped by a conditional reports Success" row is the sharpest hazard for D-e | Quoted from `github/docs`, `content/pull-requests/how-tos/merge-and-close-pull-requests/troubleshooting-required-status-checks.md`, read via the contents API. **Documentation content is CC-BY-4.0** per `github/docs` `LICENSE`; short attributed quotations only |
| `skipped-required-check/example-workflow.yml.sample` | An illustration of which jobs may carry a conditional and which may not. The extension and a deliberately invalid header mean a stray copy into a workflow directory fails to parse rather than running | Written for RQ-5 |

### External sources

Recorded per entry inside `links-and-techniques.md` with upstream commit
identifiers: `aws/s2n-tls`, `seL4/l4v`, `seL4/ci-actions`,
`cedar-policy/cedar-spec`, `hacl-star/hacl-star`,
`leanprover-community/mathlib4`, `realworldocaml/mdx`, and the Rust
documentation source. The topic README records their licences as
Apache-2.0 / MIT-0 / BSD-2-Clause / ISC as applicable per entry, with
quoted fragments only and nothing copied. The GitHub documentation quoted
in `skipped-required-check/NOTES.md` is CC-BY-4.0, as recorded above.

*Disclosed deviation, now closed:* the topic README records that no root
`README.md` existed, deliberately, so that concurrent sibling seats could
not clobber one another's file. This is that file.

---

## rq6-reproducible-artifacts/

**What the directory is.** Two executed probes and one inspection tool
answering what actually makes a compiled artifact byte-identical, plus a
sample (inactive) shape for REF-6's rebuild gate, plus the surveyed
reproducible-builds literature and toolchain primary sources.

### Committed items — all own-authored, this repository's licence

| Path | What it is | Ran? |
| --- | --- | --- |
| `README.md` | The topic README | — |
| `build-path-probe.sh` | Builds one Go source to a WebAssembly target from two directories whose names differ in length, with and without path trimming, and compares digests. The executable form of the build-path claim | Yes — `transcripts/2026-08-16-build-path-probe-windows.txt` |
| `lean-c-emission-probe.sh` | Asks whether Lean emits byte-identical C for the same source, and whether the containing directory leaks into that C | Yes — `transcripts/2026-08-16-lean-c-emission-probe-windows.txt` |
| `wasm-sections.mjs` | Dependency-free lister of a module's sections, flagging the custom sections that carry build identity and printing the producers text verbatim. An own decoder — it never instantiates the module | Yes — `transcripts/2026-08-16-wasm-sections-windows.txt` |
| `ci-rebuild-identity.sample.yml` | Sample, inactive shape for REF-6's gate: blocking same-platform rebuild identity at two different checkout paths, blocking deployment-digest pin, non-blocking cross-platform build identity, blocking corpus-through-the-one-artifact on both platforms | No — it references build scripts REF-6 has not written |
| `transcripts/` (3 files) | Verbatim standard output of the three runs above | Executed here 2026-08-16 |

### External sources — linked, never copied

Reproducible-builds practice, all **CC BY-SA 4.0** per the site footer,
retrieved 2026-08-16: the project's [definition](https://reproducible-builds.org/docs/definition/);
the [documentation index](https://reproducible-builds.org/docs/) enumerating
the standard nondeterminism sources; the [build-path page](https://reproducible-builds.org/docs/build-path/),
which is the most on-point for our gate; [stable order for inputs](https://reproducible-builds.org/docs/stable-inputs/);
the [`SOURCE_DATE_EPOCH` specification](https://reproducible-builds.org/docs/source-date-epoch/);
and the [tools page](https://reproducible-builds.org/tools/).

| Toolchain source | What it establishes | Licence | Where |
| --- | --- | --- | --- |
| Emscripten `tools/system_libs.py` | A deterministic path prefix "to produce reproducible builds across platforms" — scoped to Emscripten's **own system libraries**, not user translation units | MIT / UIUC-NCSA (dual) | <https://github.com/emscripten-core/emscripten/blob/main/tools/system_libs.py> |
| Emscripten `tools/cmdline.py` | Generated **text** output defaults to the host's line endings | MIT / UIUC-NCSA | <https://github.com/emscripten-core/emscripten/blob/main/tools/cmdline.py> |
| Emscripten `emcc` documentation | The documented line-ending override | MIT / UIUC-NCSA | <https://github.com/emscripten-core/emscripten/blob/main/site/source/docs/tools_reference/emcc.rst> |
| Emscripten `emcc.py` reproduce flag | Packages the link inputs and response file for exact re-invocation | MIT / UIUC-NCSA | <https://github.com/emscripten-core/emscripten/blob/main/emcc.py> |
| Emscripten issue #7714 | The project lead's own statement of the same-machine / cross-machine boundary (2018), and the opposite result across machines | Repository licence; issue text is the author's | <https://github.com/emscripten-core/emscripten/issues/7714> |
| LLVM `lld/wasm/Options.td` | The build-identifier, strip, keep-section and reproduce flags | Apache-2.0 WITH LLVM-exception | <https://github.com/llvm/llvm-project/blob/main/lld/wasm/Options.td> |
| LLVM `lld/wasm/Writer.cpp` | The linker synthesises the producers section, so the compiler version becomes part of the artifact | Apache-2.0 WITH LLVM-exception | <https://github.com/llvm/llvm-project/blob/main/lld/wasm/Writer.cpp> |
| LLVM commit `2c090162` | Recognises the standard build-timestamp environment variable, 2022-10-12 | Apache-2.0 WITH LLVM-exception | <https://github.com/llvm/llvm-project/commit/2c090162746a6b901c5639562c090e4bb2b7327e> |
| Clang command-line reference | The file-prefix-map family of flags | Apache-2.0 WITH LLVM-exception | <https://clang.llvm.org/docs/ClangCommandLineReference.html> |
| LLVM blog, "Deterministic builds with clang and lld" | The four-level determinism ladder the recommendation is built on; requires the same compiler and linker **binaries** | LLVM project content | <https://blog.llvm.org/2019/11/deterministic-builds-with-clang-and-lld.html> |
| WASI SDK README | Surveyed for determinism language; there is none, and release assets are per-host | Apache-2.0 | <https://github.com/WebAssembly/wasi-sdk/blob/main/README.md> |
| WebAssembly binary module format | The preamble is magic plus version; no timestamp field exists in the format | W3C Software and Document Notice and License | <https://webassembly.github.io/spec/core/binary/modules.html> |
| WebAssembly tool-conventions `ProducersSection.md` | Defines the producers section and advises keeping it even in release builds | Artistic-2.0 | <https://github.com/WebAssembly/tool-conventions/blob/main/ProducersSection.md> |
| Binaryen `src/passes/pass.cpp` | The passes that remove the identity-bearing custom sections | Apache-2.0 | <https://github.com/WebAssembly/binaryen/blob/main/src/passes/pass.cpp> |
| Go blog, "Perfectly Reproducible, Verified Go Toolchains" | The strongest published host-independence claim, and the list of what had to be removed to get there | Go website content, CC BY 4.0 | <https://go.dev/blog/rebuild> |
| `golang.org/x/build/cmd/gorebuild` | An independent rebuild verifier with its exceptions enumerated | BSD-3-Clause | <https://github.com/golang/build/blob/master/cmd/gorebuild/main.go> |
| CosmWasm `optimizer` README | The production reproducible-WebAssembly pipeline: a pinned container image, and the statement that a different processor architecture's output is non-interchangeable for release | Apache-2.0 | <https://github.com/CosmWasm/optimizer/blob/main/README.md> |
| SLSA v1.0 FAQ | Why a supply-chain standard does **not** require reproducibility | CC BY 4.0 | <https://slsa.dev/spec/v1.0/faq> |
| Bazel, Hermeticity | Isolation from the host achieved by treating tools as source | CC BY 4.0 | <https://bazel.build/basics/hermeticity> |

**Searches that found nothing, recorded as findings** in the topic
README so a later reader re-runs rather than re-guesses: the WASI SDK
issue tracker for reproducibility and determinism; the Emscripten issue
tracker for a Windows/Linux output difference; a web search for any
published claim of cross-operating-system byte identity for Emscripten
output, positive or negative. The README also warns explicitly against
citing Emscripten's own `test_deterministic`, which is about **runtime**
determinism and is not evidence for this question.

---

## rq7-run-certificates/

**What the directory is.** Two own-authored reproductions — one that
exercises the verified checker Lean already ships, one that builds a
session certificate whose obligations a third party re-derives from the
artifact and the journal alone — plus the surveyed literature on
verified checking and translation validation.

### Committed items — all own-authored, this repository's licence

| Path | What it is | Where it came from |
| --- | --- | --- |
| `README.md` | The topic README | Written for RQ-7 |
| `links-and-quotations.md` | Every source consulted, with the single load-bearing sentence from each, its URL, and its licence where stated. Section E records the searches issued and what they did **not** find | Compiled for RQ-7 |
| `lean-lrat-certificate/` — `Inspect.lean`, `Emit.lean`, `CheckGood.lean`, `CheckFlipped.lean`, `CheckTruncated.lean`, `CheckWrongGoal.lean`, `run.sh` | Inspect the Lean-core verified checker's soundness theorem, emit a real certificate, re-check it, and run three tampering controls. Lean 4.33.0 core only — no external package, no network. The checker, the solver and the checking tactic are toolchain components, invoked rather than copied | Written for RQ-7 |
| `lean-lrat-certificate/TRANSCRIPT.md` | The recorded run, the axiom footprints, the measured certificate sizes (130 KB / 5.8 MB / 734 MB), and the separately-run 12-bit measurement whose *check* exceeded Lean's default limits | Executed here 2026-08-16 |
| `certificate-shape/` — `kernel.mjs`, `emit.mjs`, `check.mjs`, `run.sh` | A toy kernel shaped like the ratified interface (stateless, total, self-identifying), a certificate over a session, and six controls: one honest, four tamperings, one restore | Written for RQ-7; runs on Bun 1.3.14 or Node, no packages |
| `certificate-shape/TRANSCRIPT.md` | The recorded run, the obligation table, and the record of a first-attempt control that silently could not fail | Executed here 2026-08-16 |

*Defect recorded against this reproduction by its independent verifier:*
the guard `run.sh` is documented as implementing — assert the tamper
changed the artifact before checking that it is refused — does not work;
a neutered control reports success. REF-8 should take the rule and not
this implementation. See the synthesis scoreboard.

### External sources — linked, never copied

Recorded per entry inside `links-and-quotations.md`, from
`satcompetition.github.io`, `cs.utexas.edu/~marijn`, `drops.dagstuhl.de`,
`cse.chalmers.se/~myreen`, `people.eecs.berkeley.edu/~necula`,
`isafor-ceta.uibk.ac.at`, `inesc-id.pt`,
`github.com/tanyongkiam/cake_lpr`, and the local Lean 4.33.0 toolchain.
Licences as the topic README records them: **Lean 4 Apache-2.0**;
**LIPIcs SAT 2023 CC-BY-4.0**; **cake_lpr under the CakeML BSD-style
licence** quoted from its own `LICENSE` (GitHub's detector reports
`NOASSERTION`, so it is linked rather than copied); and **CeTA's licence
is not stated on its page and is therefore not asserted**, so nothing
from it is copied and no licence is claimed for it. Paper text appears
only as short attributed quotations, at most the one sentence carrying
each claim.

**Deliberately absent**, carried from the topic README: no signature,
key or transparency-log machinery in `certificate-shape/`. That
reproduction is evidence that a verdict follows from a journal and a
kernel — not evidence about who produced it. Authenticity is named as a
gap in the report rather than simulated.

*Disclosed deviation, now closed:* the topic README records the absent
root index and its reason. This is that file.

---

## rq8-proof-maintenance/

**What the directory is.** Two own-authored reproductions measuring how
a proof edit propagates in Lean 4.33.0 and whether it perturbs the
generated artifacts, plus the published proof-maintenance literature and
the three peer projects whose gate topology the report reads.

### Committed items — all own-authored, this repository's licence

| Path | What it is | Where it came from |
| --- | --- | --- |
| `README.md` | The topic README | Written for RQ-8 |
| `lean-rebuild-propagation/` — `Exp.lean`, `Exp/A.lean`, `Exp/B.lean`, `lakefile.toml`, `lean-toolchain`, `run.sh` | A five-file Lean project answering one question mechanically: does editing only the *proof body* of an upstream theorem force a rebuild of a downstream module that consumes only its *statement*? It copies its sources to a temporary directory, so nothing here is mutated | Written for RQ-8 |
| `lean-rebuild-propagation/TRANSCRIPT.md` | The recorded run, including the module-system variants | Executed here 2026-08-16 |
| `proof-edit-artifact-stability/run.sh` | Applies a proof-body-only patch inside a scratch copy of `verify/moves` and reports which modules rebuild, whether the generated C changes, and whether the emitted corpus changes. It reads the repository and copies it out; the working tree is never modified | Written for RQ-8 |
| `proof-edit-artifact-stability/TRANSCRIPT.md` | The recorded run plus the companion timing and composition tables | Executed here 2026-08-16 |

*Defects recorded by the independent verifier:* the module-system
variants in the first transcript had no committed raw output behind them
(the verifier re-derived both and they hold); the published cold-build
range does not reproduce; and one composition cell is mislabelled. See
the synthesis scoreboard.

### External sources — linked, never copied

| Source | What it establishes | Where | Rights | Retrieved |
| --- | --- | --- | --- | --- |
| Ringer, Palmskog, Sergey, Gligoric, Tatlock, *QED at Large* (2019) | The field's survey of proof engineering; design principles, proof evolution, cost estimation | <https://arxiv.org/pdf/2003.06458>; version of record doi 10.1561/2500000045 | arXiv perpetual non-exclusive licence; quoted, not redistributed | 2026-08-16 |
| Klein et al., *Comprehensive Formal Verification of an OS Microkernel*, ACM TOCS 32(1), 2014 | §7.4 "The Cost of Change" — the field's best published proof-maintenance data | <https://trustworthy.systems/publications/nicta_full_text/7371.pdf> | © ACM, author-hosted copy; quoted, not redistributed | 2026-08-16 |
| Matichuk et al., ICSE 2015 | The quadratic relation between statement size and proof size across 15,018 lemmas | <https://www.trustworthy.systems/publications/nicta_full_text/8318.pdf> | © IEEE, author-hosted copy; quoted, not redistributed | 2026-08-16 |
| Woos, Wilcox, Anton, Tatlock, Ernst, Anderson, *Planning for Change*, CPP 2016 | The five design-for-change recommendations and the measured build-time effect of the statement/proof split | <https://homes.cs.washington.edu/~mernst/pubs/raft-proof-cpp2016.pdf> | © ACM, author-hosted copy; quoted, not redistributed | 2026-08-16 |
| Elphinstone, Heiser, SOSP 2013 | The "powerful disincentive to changing the kernel" statement (printed page 143) | <https://sigops.org/s/conferences/sosp/2013/papers/p133-elphinstone.pdf> | © ACM, SIGOPS-hosted copy; quoted, not redistributed | 2026-08-16 |
| Disselkoen et al., *How We Built Cedar*, FSE Companion 2024 | A Lean model plus hand-written production code; the explicit rejection of the Lean-to-C deployment route | <https://arxiv.org/pdf/2407.01688> | **CC BY 4.0** per the arXiv abstract page — redistributable with attribution; still linked rather than vendored | 2026-08-16 |
| `cedar-policy/cedar-spec` | The lint driver, the toolchain pin (the same Lean version this estate pins), the proof-stability guide, the mirrored definition/proof layout, and the two-repository per-pull-request chain | <https://github.com/cedar-policy/cedar-spec>, `main`, last push 2026-08-14 | Apache-2.0 | 2026-08-16 |
| `hacl-star/hacl-star` | Generated C and solver hints committed; regeneration is a weekly scheduled bot pull request, not a per-commit gate | <https://github.com/hacl-star/hacl-star>, `main` | Apache-2.0 | 2026-08-16 |
| `seL4/l4v` | Proofs as a per-pull-request gate across five architectures, with the largest session deliberately excluded | <https://github.com/seL4/l4v>, `master` | GitHub reports `NOASSERTION`. `LICENSE.md` states a **per-file SPDX scheme** — proofs about the kernel under GPL-2.0, general libraries and tools under BSD-2-Clause. **Mixed and per-file; do not reuse any file without reading its tag.** Nothing copied | 2026-08-16 |
| `uwplse/PUMPKIN-PATCH`, `uwplse/pumpkin-pi` | Establish that the proof-repair tooling line is Coq-only | <https://github.com/uwplse/PUMPKIN-PATCH>, <https://github.com/uwplse/pumpkin-pi> | MIT (both) | 2026-08-16 |

*Recorded gap:* the topic README's "Not found" section states that no
Lean 4 proof-repair tooling was found and that the search returned only
assistant marketing pages. The independent verifier's re-run of the same
terms returned primary research (a 260,000-example Lean repair dataset,
February 2026; a 127-problem Lean repair benchmark). The narrow claim —
no established tool repairing proof terms in response to a *definition*
change — survives, and the section should be narrowed rather than
deleted.

---

## rq9-rfc8785-numbers/

**What the directory is.** A Lean transcription of the *rendering* half
of the ECMAScript number-to-string algorithm with the shortest-digits
step taken as an input, a generator that derives the step's output for
the specification's own sample vectors from an independent source, a
probe settling what `native_decide` does to Lean's axiom footprint, and
a two-runtime differential over the number path at scale.

### Committed items — all own-authored, this repository's licence

| Path | What it is | Where it came from |
| --- | --- | --- |
| `README.md` | The topic README | Written for RQ-9 |
| `EsNumberToString.lean` | The rendering half — steps 1–4 and 6–10 — transcribed into Lean 4.33.0, with step 5 taken as an input. Zero imports, no floating point, no `native_decide`. Contains `Ref2aIntegerLaw`, which is **stated, not proved**, and must not be cited as a proof | Written for RQ-9 against ECMA-262 10th edition §7.1.12.1 |
| `Driver.lean` | Runs the transcription over the specification's Appendix B vectors and over the wire's current integer sub-grammar | Written for RQ-9 |
| `AppendixBVectors.lean` | **Generated output** — regenerate, never hand-edit | Produced by `make_triples.py` |
| `make_triples.py` → `appendix-b-triples.json` | Derives the step-5 triple for each Appendix B row and emits both a JSON record and the generated Lean vector list. The triples come from CPython 3.13.14's shortest round-trip repr — a source **independent of the expected strings in the fixture**, so the renderer must reproduce the table rather than echo it | Written for RQ-9; its input is the repository's own `fixtures/jcs-rfc8785.json` |
| `NativeDecideFootprint.lean` | Four one-line theorems and four axiom prints, settling by execution that kernel evaluation has an empty footprint while `native_decide` mints a per-theorem axiom every downstream theorem inherits | Written for and executed here 2026-08-16 |
| `number-differential/emit.go`, `check.ts` | A standalone two-runtime differential over the *number path only*: Go's JSON encoder against the JavaScript runtime's stringifier, over pseudorandom 64-bit-float bit patterns at a pinned seed. 200,000 rows, zero divergences. The emitted corpus is regenerable and not committed | Written for and executed here 2026-08-16 |

*Bound stated in the topic README, and worth carrying:* the differential
measures *agreement between two implementations*, not conformance to the
specification. Neither implementation is the specification. (The
independent verifier adds that uniform random bit patterns put 95.6% of
the corpus in the exponential branch, so the plain-decimal branches —
every value a human or a wire is likely to carry — get 8,784 samples.)

### External sources — linked, never copied

| Source | What it is | Where | Licence | Retrieved |
| --- | --- | --- | --- | --- |
| RFC 8785 | The JSON Canonicalization Scheme; §3.2.2.3 is the number requirement, Appendix B the sample table our fixture copies | <https://www.rfc-editor.org/rfc/rfc8785.txt> | IETF Trust legal provisions (BCP 78/79) | 2026-08-16 |
| ECMA-262 10th edition (ES2019) | The normative reference §3.2.2.3 points at, including Note 2 | <https://262.ecma-international.org/10.0/#sec-tostring-applied-to-the-number-type> | Ecma International; see the standard's own terms | 2026-08-16 |
| `cyberphone/json-canonicalization` | The scheme author's reference implementations and test data; the number corpus generators are in-repo and deterministic | <https://github.com/cyberphone/json-canonicalization> | Apache-2.0 ("Copyright 2018 Anders Rundgren") | 2026-08-16 |
| `es6testfile100m.txt.gz` | 100 million rows — the exhaustive number-serialisation wall; 2,081,240,993 bytes | <https://github.com/cyberphone/json-canonicalization/releases/download/es6testfile/es6testfile100m.txt.gz> | Apache-2.0 with the repository | 2026-08-16 |
| `ulfjack/ryu` | The reference shortest-digits implementation, cited by RFC 8785 at a pinned commit | <https://github.com/ulfjack/ryu> | Apache-2.0 / Boost (dual) | 2026-08-16 |
| Adams, *Ryū: fast float-to-string conversion*, PLDI 2018 | The algorithm and its paper — not machine-checked — correctness proof | <https://dl.acm.org/doi/10.1145/3192366.3192369> | ACM | 2026-08-16 |
| `lexicone42/ryu-lean4` | The only proof-assistant formalization of shortest-decimal printing found; Lean 4, HEAD `5dd60fd7…`; 3,296 lines, 1,865 of them on the hard step | <https://github.com/lexicone42/ryu-lean4> | MIT ("Copyright (c) 2026 lexicone42") | 2026-08-16 |
| `lexicone42/shortest-decimal` | The same author's generic round-trip framework | <https://github.com/lexicone42/shortest-decimal> | MIT | 2026-08-16 |
| `lexicone42/nickelean` | Verified JSON serialization in Lean 4; the closest existing analogue of REF-2, and it names this gap as its own known limitation | <https://github.com/lexicone42/nickelean> | MIT | 2026-08-16 |
| `boa-dev/ryu-js` | A fork "adjusted to comply to the ECMAScript number-to-string algorithm" — evidence that the plain algorithm is not conformant as printed | <https://github.com/boa-dev/ryu-js> | Apache-2.0 | 2026-08-16 |
| EverParse / EverCBOR | Verified parser and serializer generation; the deterministic encoding ships **without floating-point numbers** | <https://project-everest.github.io/everparse/>; `doc/index.rst` at commit `b7dfc53f…` | Apache-2.0 | 2026-08-16 |
| Champagne Gareau & Lemire, arXiv:2603.06581 | A 2026 experimental review reporting that surveyed implementations do not consistently produce the shortest strings | <https://arxiv.org/abs/2603.06581> | arXiv posted licence | 2026-08-16 |
| AFP `IEEE_Floating_Point` | An Isabelle/HOL IEEE-754 model — arithmetic and code generation, no decimal-string printing | <https://www.isa-afp.org/entries/IEEE_Floating_Point.html> | BSD (AFP) | 2026-08-16 |

**Considered for vendoring and rejected:** `lexicone42/ryu-lean4` and
`lexicone42/shortest-decimal` are MIT and could lawfully be vendored,
but they pull all of Mathlib and pin a different Lean toolchain, so they
are linked and audited by reading rather than copied.

**Searches that returned nothing on-point**, recorded in the topic
README so the absence is a finding: Coq/Flocq, Isabelle/AFP,
HOL4/CakeML, PVS and ACL2 searched for a mechanized proof of any
shortest-round-trip *printing* algorithm — found arithmetic
formalizations, error-bound checkers and verified floating-point
compilation, but no printing formalization; and RFC 8785 itself in any
proof assistant, nothing found.

---

## Provenance and licence gaps, recorded rather than filled

The dispatch forbids inventing a missing field. Where a licence could
not be established, that is what the per-topic README says and what this
index repeats:

1. **The Lean 4 reference manual's licence was not established** (RQ-1).
   Nothing from it is copied beyond short evidential quotations.
2. **Several project pages state no licence**: seL4's assumptions page
   and FAQ, and the CakeML project page (RQ-2, each recorded as "not
   stated on page"). Nothing copied.
3. **CeTA states no licence on its page** (RQ-7) and none is asserted.
   Nothing copied.
4. **`seL4/l4v` carries a per-file SPDX scheme**, mixed GPL-2.0 and
   BSD-2-Clause (RQ-8). Do not reuse any file from it without reading
   its own tag. Nothing copied.
5. **JSCert and KJS report no detected licence** (RQ-4). Linked only,
   never vendored, per the dispatch's rule.
6. **Frama-C's GitHub mirror carries no detected licence** (RQ-4); the
   project's own site is treated as the live source.
7. **Two inventory omissions inside this area**, recorded in the
   sections above and in the synthesis scoreboard: RQ-1's file table
   omits four files present in the directory and miscounts the example's
   exports, and RQ-3's `RUNBOOK.md` carries no provenance row of its own.

Nothing in this list blocks anything. It exists so that a later reader
knows which fields are genuinely unknown rather than merely unwritten.
