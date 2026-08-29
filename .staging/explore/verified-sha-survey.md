# Machine-checked SHA-2 and SHA-3/Keccak: artifact and literature survey

**Provenance:** delivered 2026-08-24 by the prover-sweep child of the state-of-play certainty sweep;
persisted verbatim from its final report by the coordinator (the agent wrote no repo file itself).
Closes the §5.2 gap of `.staging/explore/state-of-play.md`. Staged material, pre-grade.

---

## 0. The shape of the landscape

Three findings organize everything below.

**SHA-2 and SHA-3 have opposite verification profiles.** SHA-256 has the deepest *end-to-end* results (Appel's Coq/VST proof composed with CompCert; Ironclad's Dafny proof) but almost no verified *high-speed* implementations outside HACL*/Vale. SHA-3/Keccak has the deepest *provable-security* result (EasyCrypt sponge indifferentiability) and the best verified *assembly* (s2n-bignum HOL Light, Jasmin), but no VST/CompCert-style source-to-machine chain.

**Almost every assembly-level result verifies the block function or permutation only** — not padding, parsing, or multi-block iteration. CryptoLine, CASM-Verify, and s2n-bignum all stop at Keccak-f[1600] or the SHA-256 compression function. HACL*/EverCrypt and VST are the exceptions that cover the full hash including padding.

**Where "verified SHA-3" is claimed, check whether the claim is functional correctness.** The Lean 4 SHA-3 paper proves bounds and API sequencing, not correctness. libjade's own tree contains no functional-correctness proof for any hash. `formosa-keccak` has 38 live `admit`s including all eight top-level reference sponge-stage lemmas. Several Coq "Keccak" repos have zero theorems or vacuous ones.

---

## 1. HACL* / EverCrypt (F*) — Project Everest

Repo: `https://github.com/hacl-star/hacl-star` (Apache-2.0, 1,837 stars). Last commit 2026-04-10, pushed 2026-06-07 — **actively maintained**. F* and KaRaMeL both pushed 2026-08-24.

### What exists for SHA-2 and SHA-3

| Component | Path | Spec | Implementations |
|---|---|---|---|
| SHA-2 spec | `specs/Spec.SHA2.fst(i)` | derived from **FIPS 180-4** | — |
| SHA-2 impl | `code/hash/Hacl.Hash.SHA2.fst`, `code/sha2-mb/` | agile over SHA2_224/256/384/512 | `Hacl.SHA2.Scalar32`, `Vec128` (4-way), `Vec256` (8-way multi-buffer) |
| SHA-2 assembly | `vale/code/thirdPartyPorts/OpenSSL/sha/Vale.SHA.X64.vaf`, `Vale.SHA.PPC64LE.vaf` | verified against the **same** `Spec.SHA2` | x64 Intel SHA-NI (`sha256rnds2`/`msg1`/`msg2`), PPC64LE |
| SHA-3 spec | `specs/Spec.SHA3.fst` + `Spec.SHA3.Constants.fst` | derived from **FIPS 202**; defines `keccak`, `shake128/256`, `sha3_224/256/384/512` | — |
| SHA-3 impl | `code/sha3/` | `Hacl.Hash.SHA3.Scalar.fst`, `Hacl.Hash.SHA3.Simd256.fst`, `Hacl.Impl.SHA3.Vec` | scalar + 4-way SIMD |
| SHA-3 equivalence | `code/sha3/Hacl.Spec.SHA3.Equiv.fsti` | per-lane lemmas: `sha3_256_lemma_l`, `shake128_lemma_l`, … each proving lane *l* of the vectorized result equals `Spec.SHA3.sha3_256` on lane *l*'s input | — |
| Agile API | `providers/evercrypt/EverCrypt.Hash.fsti` | covers SHA-2 and SHA-3 | SHA-2 **multiplexed** C↔Vale asm; **SHA-3 is C-only** |

### Answers to the specific questions

**Is Vale/assembly involved for SHA?** For **SHA-256, yes** — `Vale.SHA.X64.vaf` is a Vale port of OpenSSL's x64 SHA-256 using Intel SHA extensions, verified against `Spec.SHA2` via `update_multi_quads`, with a `Vale.X64.CPU_Features_s` guard. There is also a PPC64LE port. For **SHA-3, no.** The entire `vale/` tree has zero Keccak hits; the single `SHA3` hit is a build config file, not assembly.

**What is proved.** Memory safety (by typing in Low*), functional correctness against the F* spec, and secret independence. Secret independence is *type-enforced* via `Lib.IntTypes`' secret/public integer distinction — it rules out branching on secret values and secret-indexed memory access. The CCS'17 paper is explicit that this prevents certain timing leaks from branching and memory access, but not power analysis, and it does not cover speculative execution. The SHA-2 spec was derived from FIPS 180-4 by hand (~70 lines of pure F* for SHA-256 from a 25-page standard section).

**Trust base.** From the Low* ICFP 2017 paper, §"Trusted computing base":
- **F\* typechecker + Z3** (SMT solver)
- **The metatheory relating λow\* to CompCert Clight is proved on paper, by hand — not machine-checked.**
- **KaRaMeL/KReMLin is unverified OCaml (~10 kLOC) and is trusted.** Informed by the metatheory but not a verified translation.
- The C compiler (CompCert for greatest assurance, GCC/Clang in practice)
- The assembler and linker
- For assembly: **Vale's x64 semantics model**, plus the C↔assembly interoperation spec (EverCrypt §V-B)
- **The specs themselves** (`Spec.SHA2`, `Spec.SHA3`) — trusted; mitigated by ~8 kLOC total spec size, independent manual review against RFC/FIPS text, and OCaml extraction for test-vector runs

**Deployment (confirmed by direct repo inspection).**
- **Mozilla NSS / Firefox**: `lib/freebl/verified/Hacl_Hash_SHA3.c` — HACL* SHA-3 deployed (plus Curve25519, P-256/384/521, Ed25519, ChaCha20-Poly1305). **NSS does not use HACL* SHA-2.**
- **CPython**: `Modules/_hacl/` ships `Hacl_Hash_SHA2.c` **and** `Hacl_Hash_SHA3.c` (plus MD5, SHA-1, Blake2), backing `hashlib`.
- **Linux kernel**: `curve25519-hacl64.c` only — **no HACL* SHA in the kernel**.

### Papers

| Paper | Venue | ID | Downloaded |
|---|---|---|---|
| HACL*: A Verified Modern Cryptographic Library | CCS 2017, pp. 1789–1806 | ePrint **2017/536** | `hacl-star-2017-verified-modern-crypto-library.pdf` |
| EverCrypt: A Fast, Verified, Cross-Platform Cryptographic Provider | IEEE S&P 2020, pp. 983–1002 | ePrint **2019/757** | `protzenko-2020-evercrypt.pdf` |
| Verified Low-Level Programming Embedded in F* | ICFP 2017, art. 17 | arXiv 1703.00053, DOI 10.1145/3110261 | `protzenko-2017-verified-lowlevel-programming-fstar.pdf` |
| Vale: Verifying High-Performance Cryptographic Assembly Code | USENIX Sec 2017 | — | `bond-2017-vale-verifying-crypto-assembly.pdf` |
| A Verified, Efficient Embedding of a Verifiable Assembly Language | POPL 2019 | DOI 10.1145/3290376 | `fromherz-2019-verified-efficient-embedding-verifiable-assembly.pdf` |
| HACL×N: Verified Generic SIMD Crypto | CCS 2020, pp. 899–918 | ePrint **2020/572** | `polubelova-2020-haclxn-verified-generic-simd-crypto.pdf` |
| Modularity, Code Specialization, and Zero-Cost Abstractions | ICFP 2023, PACMPL 7:385–416 | arXiv 2102.01644, DOI 10.1145/3607851 | `ho-2023-modularity-code-specialization-zero-cost-abstractions.pdf` |
| Formally Verified Cryptographic Web Applications in WebAssembly | IEEE S&P 2019 | — | `protzenko-2019-verified-crypto-web-applications-webassembly.pdf` |

**Publication gap:** HACL×N (CCS 2020) covers vectorized **Blake2 and SHA-2 only**. The vectorized SHA-3 (`Hacl.Impl.SHA3.Vec`, Mamone Tarsha) first landed 2023-11-09 and appears **unpublished**; it exists to serve ML-KEM/Kyber. EverCrypt (S&P 2020) mentions SHA3 exactly twice.

---

## 2. Cryptol / SAW (Galois) — AWS-LC, BoringSSL, OpenSSL

Repo: `https://github.com/awslabs/aws-lc-verification` (Apache-2.0, 71 stars). Last commit 2026-03-26 — **maintained, proofs run in CI**. SAW and Cryptol both pushed 2026-08-24.

### What is verified — and the SHA-256 correction

The README's verified-algorithm table lists, for SHA-2, **variants 384 and 512 only**:

| Algorithm | Variants | API | Platform | Caveats | Tech |
|---|---|---|---|---|---|
| SHA-2 | **384, 512** | EVP_DigestInit/Update/Final | SandyBridge+ | NoEngine, MemCorrect | SAW |
| SHA-2 | **384, 512** | same | neoverse-n1, neoverse-v1 | NoEngine, NoInline, MemCorrect, ArmSpecGap, ToolGap, LaxPointer | SAW, NSym |
| HMAC | with SHA-384 | HMAC_* | SandyBridge+ | +InitZero, CRYPTO_once_Correct | SAW |

**SHA-256 is NOT currently verified in AWS-LC.** `SAW/proof/SHA256/SHA256.saw` exists but is unwired; the release scripts run only SHA-384/512; issue #32 (opened 2020-12-17, **still open**) tracks the SHA-NI/no-SHA-NI split. Kobeissi's 2026 audit independently confirms the scope limit.

### What exactly is proved

Against Cryptol specs from `GaloisInc/cryptol-specs` (FIPS 180-4 cited). SAW safety: no out-of-bounds access, no writes through read-only params, no uninitialized reads, no other C UB. Functional correctness = I/O equivalence to the Cryptol spec.

**Bounded vs unbounded — changed after CAV 2021.** CAV 2021's SHA-384 proof was for fixed input sizes. The current repo has both `sha512_block_data_order_spec` (bounded, one block) and `sha512_block_data_order_array_spec` — **symbolic block count** via `llvm_verify_or_assume_fixpoint_asm` with `{{ processBlocksLoop }}` as invariant. Caveat: SAW's fixpoint feature assumes the inductive invariant without a mechanized well-foundedness check (documented for AES-GCM as `GcmWellFoundedInduction`; same mechanism in use here). Proofs discharge with `w4_uninit_z3`, uninterpreting the round functions.

### Trust base (CAV 2021 §7)

1. Top-level functional and interface specifications
2. Assumed library behavior in overrides (`OPENSSL_malloc`/`free` — `MemCorrect`)
3. **The SAW and Cryptol toolchain**: the tools, the **LLVM and x86 language models**, back-end SMT solvers (Z3 via What4), Haskell runtime
4. LLVM→executable compilation and hardware
5. Behavior not covered at verified sizes

Proofs run on **Clang-10 LLVM bitcode**, not C source. Some functions patched `noinline`. The repo's Coq component validates **EC specs only — no Coq validation of the SHA Cryptol specs**.

### Elsewhere in the SAW/Cryptol line

- **`GaloisInc/cryptol-specs`** (pushed 2026-08-06): full SHA-2 and SHA-3 executable reference specs with `property` declarations discharged on demand (`:prove`/`:check`/`:exhaust`) — not stored proof objects. SHA-3's spec `:prove`s the ρ table and round constants; SHA-2's internal equivalence is `:exhaust` at width 10 / `:check` at 256 — **bounded testing, not unbounded proof**.
- **OpenSSL SHA-3 verified with SAW**: Hanson, Winters, Mercer, Decker, SPIN 2022, LNCS 13255, pp. 97–113, DOI 10.1007/978-3-031-15077-7_6. Artifact `ericmercer/sha3-verification` — dormant since 2022-06-14. Predecessor: NFM 2021, DOI 10.1007/978-3-030-76384-8_5 (SHA-256, "towards").

**Papers:** `boston-2021-verified-cryptographic-code-for-everybody.pdf` (CAV 2021, DOI 10.1007/978-3-030-81685-8_31); `kobeissi-2026-verification-theatre.pdf` (ePrint 2026/192).

---

## 3. Coq / Rocq

**SHA-256: the strongest end-to-end result in existence for real-world C crypto. SHA-3: nothing.**

| Artifact | Prover | What is proved | Trust base | Maintained |
|---|---|---|---|---|
| Appel, VST SHA-256 (`PrincetonUniversity/VST` `sha/`) | Coq/Rocq + VST | Functional correctness of OpenSSL's SHA-256 C against a 169-line Coq spec from FIPS 180-4; memory safety as corollary; **composed with CompCert to reach assembly**. 6,539 lines of proof. | CiC; functional+propositional extensionality; Coq kernel; OCaml; the 169-line spec; API spec; **CompCert x86 ISA spec**; as/ld; hardware. C semantics drops out (VST soundness stated against what CompCert compiles). **Nothing about timing.** | **Yes** — carried through Rocq 9 fix (2025-11-14); `body_SHA256 … Qed` |
| Beringer, Petcher, Ye, Appel — OpenSSL HMAC | VST + FCF + CompCert | HMAC C meets FIPS 198-1; equivalence to Bellare-abstract; HMAC is a PRF **given** three assumed compression-fn properties (PRF, weak CR, RKA dual PRF) | `hmacfcf/` last touched 2021-05-26 | Partially |
| Coq SHA-3 / Keccak | — | **ABSENT** (0 hits in VST, fiat-crypto, rupicola, bedrock2, SSProve, coq-community, opam) | — | — |

**"Is it really OpenSSL?"** Appel documents four source modifications (SHA-256-only macro expansion, hoisted side effects, one memory ref per assignment, explicit returns). The verified object is the **Clight** program.

What exists in the wild otherwise: `formalize/coq-evm` (structural lemmas + 2 test vectors), `coq-vyper` (length lemmas), `palmskog/mcevm`, `aa755/EVMOpSemCoq` (zero theorems), `formal-land/garden` (ZK circuits; sponge is a `Parameter`).

**Warning — `AU-COBRA/AUCurves`** `RupicolaCrypto/Keccak.v`: the functional-correctness clause of `spec_of_keccak_f` is **inside a comment**; the `_ok` lemmas take the spec as hypothesis; `src/Spec/Keccak.v` **does not exist** despite being imported by tests. Treat its Keccak claims as unsupported.

**Papers:** `appel-2015-sha256-verification.pdf` (TOPLAS 37(2) art. 7, DOI 10.1145/2701415; Second Edition Jan 2016); `beringer-2015-openssl-hmac.pdf` (USENIX Sec 2015, no DOI).

---

## 4. Isabelle/HOL and the AFP

**SHA-2 in the AFP: yes. SHA-3 in the AFP: absent — established by exhaustive index scan.**

| Entry | Authors / date | Contents | Maintained |
|---|---|---|---|
| **`Crypto_Standards`** | A Whitley, 2023-06-06, BSD | `FIPS180_4.thy`, 2,230 lines: SHA-1/224/256/384/512/512_224/512_256 + octets variants. 65 defs, **185 lemmas, 0 theorems** — all *structural* (bounds, lengths, validity). 28 NIST vectors **`by eval`**. Also FIPS 186-4, 198-1, PKCS#1, SEC1. | Yes — through Isabelle2025-2 (2026-02-06) |
| `RSAPSS` | 2005 | **SHA-1 only** | Yes |
| `RIPEMD-160-SPARK` | 2011 | obsolete | builds |
| CryptHOL lineage | Lochbihler et al. | **No concrete hash anywhere** — random oracles and abstract PRFs | Yes |
| SHA-3 / Keccak / sponge / FIPS 202 | — | **ABSENT** | — |

**Evidence:** the AFP index (`index.json`, 1,020 entries, newest 2026-08-22) regex-scanned: `keccak` 0, `SHA-?3` 0, `sponge` 0, `FIPS` 1. Full-text over `mirror-afp-devel`: `FIPS202` 0; `Keccak` 4 hits, all Isabelle-Solidity, where `keccak256` is an **uninterpreted locale parameter assumed injective** — the opposite of a formalization. Caveat: `by eval` trusts the code generator, not just the kernel.

**Significant find outside the AFP — `apple/corecrypto`** (created 2026-05-22, 404 stars): hand-written Isabelle FIPS 202 spec (`FIPS202.thy`, 296 lines, BSD-2: θ/ρ/π/χ/ι, `Keccak_f1600`, sponge, SHA3-256/512, SHAKE, `RCs_correct`); `FIPS202_lemmas.thy` (822 lines, ~50 lemmas); **`keccak_MT_refines_FIPS.thy`** (360 lines) proving the Cryptol machine-translation refines FIPS202 (`keccak_SHA3_256_refine`, `_512_`, `SHAKE256_`). Plus ARM64 assembly theories. Caveats: `MT/keccak.thy` is under Apple's **Internal Use License**, per-file licensing; Keccak exists only as an ML-KEM/ML-DSA dependency. **No SHA-2 in that repo.** `argotorg/yul-isabelle` Keccak: Lem-generated, zero lemmas.

**Papers:** `basin-lochbihler-sefidgar-2020-crypthol.pdf` (J. Cryptology 33:494–566); `lochbihler-2016-probabilistic-functions-crypto-oracles.pdf` (ESOP 2016). No paper exists for `Crypto_Standards`.

---

## 5. Jasmin / libjade / EasyCrypt

Repos: `jasmin-lang/jasmin` (MIT, 362 stars, pushed 2026-08-23, v2026.03.2); `formosa-crypto/libjade` (72 stars, last commit 2026-07-09, last release 2024-07-16); `formosa-crypto/formosa-keccak` (WIP by its own README).

### Graded claim table for SHA-3/Keccak

| Property | Grade | Where |
|---|---|---|
| Sponge indifferentiable from RO, concrete bound | **machine-checked in EasyCrypt** | ePrint 2019/1155 |
| FIPS 202 ↔ EasyCrypt spec | **hand transcription, human inspection** | `crypto-specs/fips202/FIPS202_SHA3.ec` |
| FIPS-shaped ↔ byte-oriented functional spec | machine-checked | `crypto-specs/fips202/properties/` |
| ref & AVX2 asm ↔ Jasmin reference, **byte-aligned inputs only** | machine-checked (2019 artifact) | 2019/1155 |
| Same, in libjade's own tree | **absent** — README's correctness/security sections are HTML-commented `TODO: write this` | libjade `proof/` |
| Same, in formosa-keccak | **incomplete — 38 live `admit`s** incl. all 8 top-level sponge-stage lemmas; EasyCrypt accepts `admitted` with only a warning, so **green CI ≠ closed** | @ `fe5d22f` |
| Memory safety | trusted static analyser, yields a precondition | — |
| Constant-time (lengths public) | machine-checked pRHL `equiv` on leakage accumulator | libjade |
| CT type-system soundness | pen-and-paper; unverified OCaml impl | — |
| CT preservation by compiler | Rocq, **separate development** (ePrint 2021/650), absent from jasmin@main | — |
| SCT/Spectre-v1 | type-checked with `--infer` (docs: not for production) | `Makefile.checksct` |
| SCT preservation | POPL 2025: fails in practice, proved for a **distilled** compiler only | ePrint 2024/1203 |
| Compiler semantics preservation | Rocq: `it_compile_prog_to_asmP`, `it_compiler_proof.v:1708` | — |

**Compiler:** passes are proved / validated (unverified oracle + proved checker) / trusted (parser, pre-typer, **assembly pretty-printer**). Trust base: FIPS→EasyCrypt hand transcription; EasyCrypt + its SMT solvers; `jasmin2ec` extractor; trusted safety analyser; Rocq + ~21 axioms; instruction-semantics model (differential-tested, not verified vs silicon); as/ld; `#declassify`s; any `admit`.

**SHA-2 in libjade: present, essentially unverified.** ref only; proof dir = `.gitkeep` + CT proof. **No SHA-2 EasyCrypt spec exists anywhere in the ecosystem** (`crypto-specs` has fips202 and ml-kem only). In formosa-xmss, SHA-256 is an uninterpreted `op`. (`jasmin/proofs/lang/sha256.v` models **SHA-NI instruction semantics**, not an implementation.)

**Keccak is a hole in the Kyber result.** Episode IV (TCHES 2023): proofs do not cover SHA-3 implementation correctness; 9 call sites are **axiomatized operators**. Episode V (CRYPTO 2024): SHA3-512 idealized as RO, SHAKE assumed pseudorandom.

**Papers (12):** almeida-2017-jasmin-ccs, almeida-2020-last-mile-sp (arXiv 1904.04606), almeida-2019-sha3-sponge-easycrypt (**the** SHA-3 paper, ePrint 2019/1155), kyber ep4+ep5, shivakumar spectre ×3, barthe-2020-spectre-era, arranz-olmos-2024-sct-preservation, haselwarter-2023-last-yard, tsai-2025-jazzline (CCS 2025 Distinguished Paper).

---

## 6. Everything else

| Prover / tool | SHA-2 | SHA-3 / Keccak | Strongest property | Trust notes |
|---|---|---|---|---|
| **HOL Light — `awslabs/s2n-bignum`** | SHA-NI models only | **YES — verified assembly** | `SHA3_KECCAK_F1600_SUBROUTINE_CORRECT` (ARM64 + x86-64, batched variants, alt ABIs): Hoare triple ending `wordlist_from_memory(a,25) s = keccak 24 A` vs `keccak_spec.ml`. Plus `_SUBROUTINE_SAFE`: event trace a function of public inputs only — genuine secret-independence theorem. | **Verifies the ELF object code — no compiler in TCB**, the single biggest narrowing anywhere. `SOUNDNESS.md` maps gaps: spec fidelity, ISA model (CI co-simulation on real hardware), loader, no concurrency/interrupts/VM/**speculation**/privilege, HOL Light kernel. Keccak added 2025-06-01, touched 2026-03-16. **Active.** |
| **Dafny — `microsoft/Ironclad`** | **YES — full functional correctness** | absent | `SHA256_impl_Bytes` for **arbitrary-length messages incl. padding**; 961 lines, 48 lemmas, 0 `assume` (+64 padding lemmas). Also SHA-1, HMAC. | 2 `{:axiom}`s in the spec file (the functional `SHA256` and its function-hood); `IsSHA256` constructively defined from FIPS 180-4. OSDI 2014 → `hawblitzel-2014-ironclad-apps.pdf`. |
| **CryptoLine** | **YES — 6 asm impls** (cc, shaext, avx2, avx 4x, avx2 8x, aarch64; **armv4 timed out — not verified**) | **YES — 13+ asm impls** (OpenSSL + XKCP families) | Block function / permutation **only** — no padding/multi-block. Reference is a **C implementation**, not a checked FIPS transcription; some chains verify vs the aarch64 impl. | TCB: Boolector, abc, llvm2cryptoline, Clang. ESORICS 2024, DOI 10.1007/978-3-031-70903-6_19, ePrint 2023/1861. Pushed 2026-08-24. |
| **HOL4** | spec + 2 NIST vector theorems (Dec 2024) | **4,565-line 3-layer development** (2023–2026): bit-level FIPS 202 spec with real theorems, sptree refinement, **word64 refinement proved step-by-step**, `cv_eval` vector theorems | **The end-to-end composition `Keccak_256_w64_thm` is inside a comment and ends in `cheat`.** Components are theorems; the composition is not. No paper. | — |
| **CASM-Verify** | **YES** — x86-64 + SSE OpenSSL SHA-256, per block | absent | Equivalence to FIPS-derived DSL spec via SMT. | Not a proof assistant. CGO 2019. Dormant since 2022. |
| **ACL2** (Kestrel) | executable specs + 19 return-type lemmas | `sha-3/` 143 defthm, `keccak/` 93 defthm; §3.1.2 indexing proved; **Axe spec-to-spec equivalence at 8-bit and 256-bit fixed lengths only** | **No theorem relates any ACL2 spec to an implementation.** The claimed Axe Java SHA-256 verification could not be substantiated (examples contain AES-128 only). | Toma & Borrione 2003–2005 PDFs captured. |
| **Lean 4** (Doussot, ePrint 2024/1880) | absent | SHA3 family, streaming, pure Lean | **NOT functional correctness** — 3 theorems, all index bounds; correctness by SHA3VS vectors; API misuse prevented by types. ~100× slower than Rust. | Repo pushed 2026-02-09. |
| **Lean 4** (other) | absent from mathlib | `NethermindEth/halo2-fv`: ZK-circuit soundness, **3 `sorry`s in Normalize/Padding/AbsorbSqueeze**. **`emberian/dregg`: claims a sorry-free FIPS 202 refinement chain (~80 theorems) — AGPL-3.0, single developer, unreviewed, NOT built or checked by this sweep.** `trailofbits/scroll-fv`: executable spec, zero theorems. | — | mathlib: keccak 0, sha256 0. |
| **Aeneas / Verus / Rust** | — | libcrux Aeneas→Lean extraction: 870 lines, **0 theorems** (real proofs are in F*). Verus: absent. SymCrust axiomatizes SHAKE. | — | — |
| **Why3 / Fiat-Crypto / CakeML / Agda / Idris** | **ABSENT** | **ABSENT** | — | CakeML has a verified MD5 only. |

---

## 7. Cross-cutting notes on proof strength and trust base

**The comparison that matters most (full-hash SHA-256 functional correctness):** VST/Coq (reaches assembly via CompCert; modified OpenSSL C; nothing about timing) · Ironclad/Dafny (arbitrary length incl. padding, zero assumes, 2 axioms, bespoke codebase) · HACL*/EverCrypt (deployed everywhere + secret independence; unverified KaRaMeL + paper metatheory in TCB) · AWS-LC/SAW (**does not verify SHA-256** — only 384/512).

**The FIPS-prose gap is never closed and never can be.** Every project hand-transcribes the standard and mitigates with small specs, independent review, and NIST vectors. This is the irreducible bottom of every stack.

**Verified assembly ranked by compiler-in-TCB:** s2n-bignum (ELF object code, no compiler) > Jasmin (Rocq-verified compiler, trusted printer/parser) > SAW (Clang-10 bitcode, trusts LLVM→exe) > Vale (hand-written x64 semantics + trusted interop spec).

**CT/secret-independence ranked:** s2n-bignum `_SUBROUTINE_SAFE` and libjade pRHL (machine-checked; lengths public) > HACL*/Vale (type-enforced, soundness in prior work) > Jasmin sct (paper soundness, unverified checker, `--infer` in CI) > VST (explicitly claims nothing). **None covers speculation** except the Jasmin SCT line, whose preservation result is for a distilled model.

**Read directly when reasoning about trust boundaries:** `awslabs/s2n-bignum/SOUNDNESS.md` (gap taxonomy A–D with mitigations) and Kobeissi, *Verification Theatre* (ePrint 2026/192) — five verification-boundary failure types; AWS-LC's caveats table is the positive exemplar.

**Adjacent evidence:** Mouha & Celi, CT-RSA 2023 (`mouha-celi-2023-sha3-vulnerability.pdf`) — a real bug in the SHA-3 reference implementation (XKCP), exactly the failure mode the padding/sponge layers (the layer most proofs omit) should rule out.

---

## 8. PDF inventory and fetch failures

33 PDFs verified on disk in `.reference/papers/` (list with sizes in the delivering agent's transcript; all verified `file` = PDF).

**Could NOT fetch:** Hanson et al. SPIN 2022 (DOI 10.1007/978-3-031-15077-7_6, paywalled); Winters et al. NFM 2021 (DOI 10.1007/978-3-030-76384-8_5, same); Arranz Olmos "Let's DOIT" (DOI 10.46586/tches.v2025.i3.644-667 — endpoint served wrong/corrupt files, deleted); Appel TOPLAS first edition (superseded by Second Edition, retrieved); Smith Axe dissertation (`purl.stanford.edu/bj102hs9687` serves only 10 pages of front matter — saved as `smith-2011-axe-dissertation-FRONTMATTER-ONLY.pdf` with the limitation in the filename).

**Two pre-existing defects found in the papers directory** — verified fixed on disk at persistence time (the delivering agents' own cleanup): the mislabeled `almeida-2017-jasmin.pdf` and the duplicate `almeida-2020-last-mile-high-assurance.pdf` are gone; correct copies present as `almeida-2017-jasmin-ccs.pdf` and `almeida-2020-last-mile-sp.pdf`. The earlier-flagged `.txt` failure artifacts and the ASCII fake PDF are also gone. Directory count at persistence: 87 files; one unidentified stray remains (`16146_Tree_Based_Premise_Selec.pdf`, non-conforming name, pending identification).
