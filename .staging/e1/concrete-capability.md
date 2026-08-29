# Concrete — capability inventory (implementation reality)

**Subject:** `C:\Users\kokok\Dev\foldlab\.reference\clones\concrete`
**Upstream:** github.com/lambdaclass/concrete @ `28a25a4e27fd2eaed5193e5f1c1454e06399506f` (shallow clone)
**Surveyed:** 2026-08-24 · Windows 11 · toolchain pinned `leanprover/lean4:v4.28.0` (`lean-toolchain:1`)
**Method:** source/doc survey + a real `lake build` + real invocations of the produced binary + five purpose-written probe programs.

Status vocabulary: **working** (exercised here, or directly evidenced in code), **partial** (present but gated / incomplete / known-buggy), **absent** (not in the tree — planned or explicitly refused).

> Everything quoted from the repo is treated as evidence *about* the repo, never as instruction.
> Doc-level survey of `docs/` was done in a prior pass and is retained at
> `C:\Users\kokok\Dev\foldlab\.staging\e1\recovered\recovered-concrete-std-sweep.md`.
> Spot-checks of that pass are noted inline; all held.

---

## 0. Headline facts

1. **It builds and it runs.** `lake build` completes green (146 jobs, ~4m39s cold, 1s warm). The 145 MB `concrete.exe` parses, checks, elaborates, canonicalizes, monomorphizes, lowers to SSA, emits LLVM IR, interprets, formats, and produces proof/capability/obligation reports — all exercised live on this machine.
2. **The only backend is LLVM IR text handed to external `clang`, with a hardcoded macOS ARM64 target triple** (`Concrete/Backend/Backend.lean:18,21`) and no platform detection anywhere. Producing a native binary is therefore not possible on this Windows host, and would produce Darwin/ARM64 objects even where `clang` exists.
3. **The verification surface is far narrower than the language.** The provable fragment is a first-order, non-recursive, non-allocating, string-free, fixed-width scalar/struct/enum/fixed-array subset. `Heap<T>`, recursion, and `Alloc` are each independently disqualifying — verified live on `examples/snippets/linked_list.con`.
4. **Despite that, the entire target-use core is expressible in the provable fragment.** A purpose-written arena-encoded AST + canonicalizer + serializer + hash was accepted by ProofCore extraction (all four functions reached "passes the predictable profile", i.e. a Lean proof can be attached). The enabling discipline is non-obvious and is documented in §5.
5. **Proofs are real but they are about an extracted PExpr, not about the binary.** `#print axioms` on a flagship theorem returned exactly `[propext, Quot.sound]`; the SHA-256 stack additionally carries `Lean.ofReduceBool, Lean.trustCompiler`. The Core→SSA→LLVM chain is unverified by the project's own statement.

---

## 1. Build report

### 1.1 Result: **SUCCESS**

| Item | Value |
|---|---|
| Command | `lake build` in `.reference\clones\concrete` |
| Toolchain | `leanprover/lean4:v4.28.0` (pinned, `lean-toolchain:1`); elan already had it |
| External deps | **none** — `lake-manifest.json` has `"packages": []`. No mathlib, no std4. |
| Jobs | 146 |
| Cold build | **≈279 s (4 m 39 s)** — derived from artifact mtimes: first `.olean` at epoch 1787586374, `concrete.exe` at 1787586653 |
| Warm/incremental | **~1 s**, "Build completed successfully (146 jobs)" |
| Warnings-as-errors | `warningAsError = true` (`lakefile.toml`) — build is green *under* that setting |
| Artifacts | `.lake/build/bin/concrete.exe` (144,954,880 B), `.lake/build/bin/pipeline-test.exe` (141,877,248 B) |
| Failures | none |

`defaultTargets = ["concrete", "Examples", "pipeline-test"]` (`lakefile.toml`), and `Examples` is the example-**proof** library (`srcDir = "proofs"`). So a green `lake build` *is* a kernel check of all 4,020 lines of example proofs — the proofs are not a separate opt-in target.

Build emits a large volume of `#eval`-style `info:` lines from `Concrete/Proof/Proof.lean:1493-1783` (evaluator self-tests printing `some (Concrete.Proof.PVal.int …)`). Noisy, not failures.

### 1.2 Source scale

| Area | Lean LOC | Notes |
|---|---|---|
| `Concrete/Report` | 9,344 | largest single area — reporting/evidence surface |
| `Concrete/Proof` | 7,522 | ProofCore, PExpr semantics, Sha256Spec, soundness |
| `Concrete/Check` | 5,823 | front-end check, CoreCheck, Policy, Verify |
| `Concrete/IR` | 5,107 | Mono, Lower, SSA, SSAVerify, SSACleanup |
| `Concrete/Frontend` | 4,163 | Lexer, Token, AST, Parser, Format |
| `Concrete/Backend` | 3,138 | LLVM AST, EmitSSA, EmitLLVM, EmitBuiltins |
| `Concrete/Elab` | 2,530 | Elab + Core IR + CoreCanonicalize |
| `Concrete/Resolve` | 2,253 | Resolve, FileSummary, Intrinsic |
| `Concrete/Pipeline` | 1,365 | typed artifact chain |
| `Concrete/Interp` | 1,199 | tree-walking interpreter |
| `Concrete/Semantics` | 540 | Capabilities, IntArith, TypeJudgment |
| `Concrete/ProofKit` | 509 | Arith, Array, BitVec, Calls, Eval, Loops, Refinement |
| `Main.lean` | 2,334 | CLI driver |
| `proofs/` | 4,020 | 9 example-proof modules, 241 theorems |
| **Total (`Concrete/` + `proofs/`)** | **47,550** across 74 files | |

Standard library: 39 `.con` files in `std/src/` (no Lean).

### 1.3 What actually ran (live invocations)

| Invocation | Result |
|---|---|
| `concrete --help` | works — full command matrix |
| `concrete examples/snippets/fib.con --interp` | **`55`** — correct `fib(10)`; interpreter works |
| `… --emit-core` | works — pretty-printed Core IR incl. auto-injected `Option`/`Result` |
| `… --emit-llvm` | works — 1,537 lines of LLVM IR for a 9-line source; overflow-checked arith helpers, bounds-check helper |
| `… --report caps` | works — per-function capability summary |
| `… --report proof-status` | works — proved / no-proof / blocked / not-eligible classification with fingerprints |
| `concrete fmt <file>` | works, and **idempotent** (verified `fmt(fmt(x)) == fmt(x)`) |
| `python scripts/check_ll1.py grammar/concrete.ebnf` | **"Parsed 60 grammar rules … LL(1) check passed: no FIRST/FIRST conflicts found."** |
| `lake env lean` + `#print axioms` | works — see §4.3 |
| `concrete build <file>` / `run <file>` | **fails** — "no Concrete.toml found"; these are project-mode-only despite `--help` advertising `[file|project]` |
| `concrete <file.con>` (bare, → native binary) | **fails**: `uncaught exception: no such file or directory (error code: 2)` — the `clang` spawn, uncaught |
| `… --report check-proofs` | **fails on Windows**: `uncaught exception … file: /tmp/tmp.bwpCpNTSDR/check_proofs.lean` |

### 1.4 Host-portability defects found live

These are Windows-host findings, not upstream-claimed support (CI is Linux/macOS), but they bound what is reproducible here.

- **Hardcoded macOS ARM64 target.** `Concrete/Backend/Backend.lean:18` `targetTriple := "arm64-apple-macosx14.0.0"`, `:21` `dataLayout := "e-m:o-i64:64-i128:128-n32:64-S128-Fn32"`. A grep for `x86_64|windows|System.Platform|isWindows` across `Concrete/Backend/*.lean` and `Main.lean` returns **nothing** — there is no target selection at all. Emitted IR always claims Darwin/ARM64.
- **Missing `clang` is an uncaught exception, not a diagnostic.** Compilation to a binary dies with a raw Lean IO exception rather than the project's own error machinery.
- **POSIX-only temp paths.** `Main.lean` shells out to `mktemp` at lines 595, 623, 650, 748, 782, 1049, 1298, and hardcodes `/tmp/concrete_test_…` (`:1668`) and `/tmp/concrete_run_…` (`:1872`). Consequence: `--report check-proofs` (the kernel replay), `concrete test`, and `concrete run` are unusable on Windows.
- **`CONCRETE_STD` path joining is broken for absolute Windows paths**: an absolute `CONCRETE_STD` produced `cannot read examples/parse_validate/C:/Users/.../std/src/lib.con` — the absolute path was appended to a relative project dir.

---

## 2. Pipeline inventory

Canonical chain (`docs/ARCHITECTURE.md:19`, `docs/PASSES.md:9-44`, `Main.lean:281`) — **spot-checked and confirmed** against the emitted artifacts:

```
Source → Parse → Resolve → Check → Elab → CoreCanonicalize → CoreCheck
       → Mono → Lower → SSAVerify → SSACleanup → EmitSSA → clang
```

| # | Stage | Lean module | Status |
|---|---|---|---|
| 1 | Parse (Lexer/Token/AST/Parser/Format) | `Concrete/Frontend/Parser.lean` + siblings | working |
| — | resolveFiles / BuildSummary | `Concrete/Pipeline/Pipeline.lean`, `Concrete/Resolve/FileSummary.lean` | working; named-artifact gap noted at `docs/ARCHITECTURE.md:130` |
| 2 | Resolve | `Concrete/Resolve/Resolve.lean` | working |
| 3 | Check (front-end) | `Concrete/Check/Check.lean`, `CheckError.lean`, `CheckHelpers.lean` | working |
| 4 | Elab → Core IR | `Concrete/Elab/Elab.lean`, IR in `Concrete/Elab/Core.lean` | working |
| 5 | CoreCanonicalize | `Concrete/Elab/CoreCanonicalize.lean` | working; pure, total |
| 6 | CoreCheck | `Concrete/Check/CoreCheck.lean` | working — post-elab semantic authority |
| 6b | ProofCore extraction (side channel) | `Concrete/Proof/ProofCore.lean`, semantics `Concrete/Proof/Proof.lean` | partial — see §4 |
| 6c | Policy enforcement | `Concrete/Check/Policy.lean` | working |
| 7 | Mono (whole-program monomorphization) | `Concrete/IR/Mono.lean` | working; hard gate `verifyPostMono` in `Concrete/Check/Verify.lean` |
| 8 | Lower → SSA | `Concrete/IR/Lower.lean`, types in `Concrete/IR/SSA.lean` | working |
| 9 | SSAVerify (runs twice: pre- and post-cleanup) | `Concrete/IR/SSAVerify.lean` | working |
| 10 | SSACleanup | `Concrete/IR/SSACleanup.lean` | working |
| 11 | EmitSSA → LLVM IR text | `Concrete/Backend/EmitSSA.lean`, `EmitLLVM.lean`, `LLVM.lean`, `EmitBuiltins.lean` | working |
| 12 | clang | external process, `Main.lean:121` (`clangArgs`), spawned `:322/:382/:1626/:1674` | working on POSIX only |
| — | Interpreter (alternate execution) | `Concrete/Interp/Interp.lean` | partial — **no `alloc`** (see §4.5) |

Typed pipeline artifacts (all in `Concrete/Pipeline/Pipeline.lean`): `ParsedProgram`, `SummaryTable`, `ResolvedProgram`, `ElaboratedProgram`, `ValidatedCore`, `MonomorphizedProgram`, `SSAProgram`. `ValidatedCore` is constructor-private to `Pipeline.coreCheck` and demanded by `Pipeline.monomorphize` — the "you cannot skip CoreCheck" property is type-enforced. **The proof boundary sits after CoreCheck, before Mono** (`docs/ARCHITECTURE.md:145`), which is why per-instantiation generic proofs are not a facility.

### 2.1 Backend character

The backend is **structured, not string-concatenation** — with escape hatches.

- `Concrete/Backend/LLVM.lean` defines a real typed LLVM AST: `LLVMTy`, `LLVMOperand`, `LLVMBinOp`, `LLVMCastOp`, `LLVMInstr` (`:82`), `LLVMTerm`, `LLVMBlock`, `LLVMFnDecl`, `LLVMFnDef`, `LLVMGlobal` (`:161`), `LLVMTypeDef` (`:170`), `LLVMModule` (`:179`).
- `Concrete/Backend/EmitLLVM.lean:184` is the pure printer `printLLVMModule : LLVMModule → String`.
- `Concrete/Backend/EmitSSA.lean:1744-1751` builds the module value and ends in `printLLVMModule`.
- Escape hatches that keep it partly textual: `LLVMInstr.raw (line : String)` (`LLVM.lean:114`), raw `LLVMTypeDef` (`:170`), raw `LLVMGlobal.value` (`:161-167`), and a hand-written `moduleHeader` (`EmitSSA.lean:226-330,1665-1672`) carrying the checked-arithmetic and bounds-check helpers — visible directly in the `--emit-llvm` output as `@__cc_sadd_i8`, `@__cc_uadd_i8`, `@__cc_ssub_i8`, … and `@__cc_bounds_check`.

**No other backend exists.** `llc`, `opt`, `llvm-link` are never invoked; `llvm-as` is used *only* as an optional parse validator and skipped silently if absent (`Main.lean:149-158`). A QBE backend is roadmap-only (`ROADMAP.md:3367`, "Phase 7.5: Usable QBE Backend").

---

## 3. Core IR

Defined in **`Concrete/Elab/Core.lean`** (421 lines). Types (`Ty`) live upstream in `Concrete/Frontend/AST.lean:62-86` and are shared by AST and Core — there is no separate Core type language.

### 3.1 `Ty` (`Concrete/Frontend/AST.lean:62-86`)

`int` (=i64) · `uint` (=u64) · `i8` `i16` `i32` · `u8` `u16` `u32` · `bool` · `float64` `float32` · `char` · `unit` · `named` · `string` · `ref T` · `refMut T` · `generic n args` · `typeVar n` · `array elem size` · `ptrMut T` · `ptrConst T` · `fn_ params capSet retTy` · `never` · `heap T` · `heapArray T` · `placeholder`.

Notable: **no 128-bit ints, no tuples, no closures** (`fn_` is explicitly "function pointer, no captures"), and `capSet` is *part of the function type*.

### 3.2 The Core inductives (`Concrete/Elab/Core.lean`)

- **`Callee`** (`:40-45`) — `direct (name)` | `indirect (binding)`. Carries call-target identity so Mono cannot mistake an indirect call for a direct one (the bug-050 fix; the rationale comment at `:21-39` is unusually explicit that the same question was previously answered in three places).
- **`CExpr`** (`:72-96`), 21 constructors: `intLit` `floatLit` `boolLit` `strLit` `charLit` `ident` `binOp` `unaryOp` `call` `structLit` `fieldAccess` `enumLit` `match_` `borrow` `borrowMut` `deref` `arrayLit` `arrayIndex` `cast` `fnRef` `try_` `allocCall` `ifExpr`. Every constructor carries its `Ty` — Core is **type-annotated at every node**, and `CExpr.ty` (`:214-237`) is a total projection.
- **`CMatchArm`** (`:100-104`): `enumArm` | `litArm` | `varArm` | `rangeArm`, each with an optional guard.
- **`CStmt`** (`:106-123`), 14 constructors: `letDecl` `assign` `return_` `expr` `ifElse` `while_` `fieldAssign` `derefAssign` `arrayIndexAssign` `break_` `continue_` `defer` `borrowIn`.

Top-level structures (`:130-208`): `CFnDef` (carries `capSet`, `isTrusted`, `isEntryPoint`, `trustedImplOrigin`, `declSpan`), `CStructDef` (`isCopy`, `isReprC`, `isPacked`, `reprAlign`), `CEnumDef`, `CTraitMethodSig`, `CTraitDef`, `CTraitImpl`, `CModule` (structs, enums, functions, externFns, constants, submodules, traitDefs, traitImpls, `linkerAliases`, `newtypes`, `sourceFile`).

Desugarings performed before Core, listed at `Core.lean:7-14`: parens removed, `obj.method(a)` → `call "Type_method" [&obj, a]`, `p->f` → `deref(p).f`, `for(init;cond;step)` → `init; while cond { body; step }`, `expr?` kept as `try_`.

**Important for anyone targeting Core directly:** `CStmt.while_` retains a *separate* `step : List CStmt` field even after the `for` desugaring — and the presence of that field is what the proof machinery uses to classify a loop as bounded (see §5.3). `Core.lean` also has a pretty-printer (`ppCExpr`/`ppCStmt`/`ppCModule`, `:289-419`) that round-trips Core to readable pseudo-source — this is what `--emit-core` prints.

There is **no `deriving BEq/Repr` on `CExpr`/`CStmt`** (only `Callee` derives them, `:45`). Structural comparison of Core terms is not available out of the box.

---

## 4. Capability matrix

### 4.1 Language / front end

| Feature | Status | Evidence |
|---|---|---|
| Lexer, LL(1) recursive-descent parser | **working** | `Concrete/Frontend/{Lexer,Token,Parser}.lean`; `scripts/check_ll1.py` passes on `grammar/concrete.ebnf` (60 rules, run live) |
| Structs, enums (incl. payloads), `match` with guards & ranges | **working** | `Core.lean:100-104,148-168`; `examples/snippets/enum_match.con` runs |
| Generics + whole-program monomorphization | **working** | `Concrete/IR/Mono.lean`; `examples/snippets/fib_generic.con` |
| Traits (static, monomorphized) | **working** | `CTraitDef`/`CTraitImpl`, `Core.lean:174-186` |
| Newtypes | **working** | `CModule.newtypes`, `Core.lean:204` |
| Fixed arrays `[T; N]` + bounds checks | **working** | `Ty.array`; `@__cc_bounds_check` visible in emitted IR |
| Linear ownership / move checking | **working** | `Concrete/Check/`; H6/H9/H10/H11/H13–H17 all closed |
| Capability headers (`with(File)`, `with(Alloc)`, …) | **working** | 9 fixed caps; `--report caps` run live |
| References as second-class (never returned) | **working** | H1 closed via the "references are second-class" invariant |
| `defer`, explicit cleanup | **working** | `CStmt.defer` |
| Recursive ADTs via `Heap<T>` / `*const T` / `&T` | **working** | probe `rec_enum.con` elaborated cleanly; `examples/snippets/linked_list.con` |
| By-value recursive types | **absent (rejected by design)** | probe `rec_struct.con` → `error[core-check]: (E0583) recursive type 'Bad' has infinite size`; bug 024 fixed |
| Closures / capture | **absent (permanent refusal)** | `docs/ANTI_FEATURES.md:205-211`; `Ty.fn_` is capture-free |
| Trait objects / `dyn` | **absent (permanent refusal)** | `ANTI_FEATURES.md:188-194` |
| Macros / `derive` | **absent (permanent refusal)** | `ANTI_FEATURES.md:222-236` — "no derive-helper exception" |
| Tuples | **absent (rejected at parse)** | `docs/TUPLES.md:1-14`; gated by `scripts/tests/check_no_tuples.sh` |
| GC, hidden async runtime, exceptions | **absent (permanent refusal)** | `ANTI_FEATURES.md:30-36,44-49,129-135` |
| Const generics `[T; N]` over `N` | **absent (designed, build deferred)** | `docs/CONST_GENERICS_V1.md`; `KNOWN_HOLES.md:596-631` |

### 4.2 Back end / execution

| Feature | Status | Evidence |
|---|---|---|
| LLVM IR text emission | **working** | `--emit-llvm` run live, 1,537 lines from 9 lines of source |
| Structured LLVM AST (not raw strings) | **working (with escape hatches)** | `Backend/LLVM.lean`; ~144 structured constructions vs 8 `.raw` uses |
| Native binary via `clang` | **partial — POSIX + macOS ARM64 only** | hardcoded triple `Backend.lean:18`; no platform detection; uncaught exception here |
| C backend / LLVM C-API / QBE / native codegen | **absent** | only `clang` is spawned; QBE is `ROADMAP.md:3367` |
| Overflow-trapping arithmetic | **working** | `@__cc_sadd_*`/`@__cc_uadd_*`/`@__cc_ssub_*` helpers in emitted IR |
| Array bounds checks at runtime | **working** | `@__cc_bounds_check`, abort on failure (H8 closed) |
| Tree-walking interpreter | **partial** | `--interp` ran `fib` correctly; **`alloc` undefined** (§4.5) |
| Deterministic output | **working (claimed verified)** | `docs/DETERMINISM.md:3,12-15`; exception: `timestamp` in snapshot JSON |
| Formatter (`concrete fmt`) | **working + idempotent** | verified `fmt∘fmt = fmt` live |
| Superlinear SSA→text rendering | **known defect (open)** | bug 027: ~7 s @10k instrs, ~35 s @20k |

### 4.3 Proof / evidence integration

| Feature | Status | Evidence |
|---|---|---|
| Lean-hosted, zero external proof deps | **working** | `lake-manifest.json` → `"packages": []`; no mathlib |
| Example-proof library kernel-checked by `lake build` | **working** | `lakefile.toml` `defaultTargets` includes `Examples` (srcDir `proofs`); build green |
| Theorem corpus | **working** | 241 `theorem`s across 9 modules in `proofs/`; 178 of them in `HmacSha256/Proofs.lean` |
| No `sorry` anywhere in proof code | **working** | only occurrences are *string literals* in `Concrete/Report/Report.lean` that emit human-fillable stubs (`:1578,:2836,:2924`) |
| Axiom hygiene, mechanically gated | **working** | `docs/AXIOMS.md`; `scripts/tests/check_axiom_inventory.sh`; **live check**: `Examples.ParseValidate.Proofs.validate_version_correct` → `[propext, Quot.sound]` |
| Native-code trust, named per theorem | **partial by design** | **live check**: `Examples.HmacSha256.Proofs.hmac_sha256_refines_spec` → `[propext, Classical.choice, Lean.ofReduceBool, Lean.trustCompiler, Quot.sound]` — exactly the six-theorem Tier-1 allowlist in `AXIOMS.md:24-52` |
| User-declared axioms | **absent (gated to zero)** | `AXIOMS.md:58-65` — "Concrete's proof layer declares none, and the gate keeps it that way" |
| ProofCore extraction Core→PExpr | **partial** | `Concrete/Proof/ProofCore.lean`; A10 "Started", `ARCHITECTURE.md:544-551` |
| Body fingerprints (truncated SHA-256) | **working** | printed live by `--report proof-status`; `DETERMINISM.md:22-30` |
| Fingerprint freshness gating | **partial — known unsound edges** | bugs **059** (hash drops declared types & signature: `i32→u32` keeps a proof `proved`) and **060** (`#[ensures]` outside the hash: **a FALSE postcondition still reports `proved`**) |
| `--report proof-status` | **working** | run live on 4 programs |
| `--report check-proofs` (kernel replay) | **working on POSIX, broken here** | `Main.lean:1298-1299` `mktemp` + `/tmp/…/check_proofs.lean` |
| Source contracts `#[requires]` / `#[ensures]` / `#[proof_by]` | **working (obligation-backed)** | `README.md:52`; `ANTI_FEATURES.md:161-167` refuses only *decorative* contracts |
| Compiler correctness proof | **absent (explicitly not claimed)** | `docs/TRUSTED_COMPUTING_BASE.md:48-53`; `:124` — "The Core IR → SSA → LLVM IR → binary chain is entirely unverified. This is the single largest gap" |
| PExpr evaluator itself proved | **absent** | `partial def eval`, tested not proved (`AXIOMS.md:80-96`) |
| Fixed-width ↔ unbounded-`Int` model bridge | **absent** | `AXIOMS.md:80-96` |

**What a proof actually says.** From `proofs/Examples/ParseValidate/Proofs.lean:25-30`:

```lean
theorem validate_version_correct (v : Int) (fuel : Nat) :
    eval parseValidateFns (Env.empty.bind "v" (.int v)) (fuel + 2) validateVersionExpr
    = some (.int (if v = 1 then 0 else 1)) := by
```

The subject is `eval … validateVersionExpr` — Concrete's *own* PExpr interpreter applied to the *extracted* term. Nothing in the statement mentions SSA, LLVM, or the binary. This is consistent with the project's stated non-claims and is the single most important thing to understand before reusing this machinery.

### 4.4 Standard library (`std/src/`, 39 `.con` files)

Relevant to content addressing:

| Module | Contents | Provable? |
|---|---|---|
| `std/src/hash.con` | FNV-1a over `Bytes` and `String` (`fnv1a_bytes`, `fnv1a_string`), plus `hash_u64`/`hash_i32`/`hash_i64` multiplicative mixers marked `pub trusted` | **No** — uses `u64` + `wrapping_mul` (§5.4) |
| `std/src/sha256.con` | full SHA-256 | Backed by real Lean proofs in `proofs/Examples/HmacSha256/Proofs.lean` (with native-trust axioms) |
| `std/src/bytes.con` | `Bytes` type | Heap-backed → outside provable subset |
| `std/src/checksum.con`, `hex.con`, `base64.con` | encodings | not surveyed in depth |
| `vec/map/set/deque/heap/ordered_map/ordered_set` | collections | Alloc-bearing → outside provable subset |

std resolution is via `CONCRETE_STD` env var or a `[dependencies]` entry in `Concrete.toml`; absent both, the compiler warns `builtin std not found` and continues (programs not using std still work — all probes below ran without std).

### 4.5 Interpreter gap (found live)

```
$ concrete examples/snippets/linked_list.con --interp
interp: undefined function 'alloc'
$ concrete tests/programs/complex_recursive_tree.con --interp
interp: undefined function 'alloc'
```

The interpreter does not implement `alloc`/heap. Both of these are *shipped example/test programs*. Consequence: **every heap-using program is compiled-path-only**, and the interp-vs-compiled differential oracle the project uses elsewhere does not cover heap programs. (This mirrors the already-documented H2 limitation that float casts are "compiled-only, no interpreter float support" — the same shape, a different feature.)

---

## 5. Target-use assessment: a content-addressed core

**Target:** an AST datatype for a term language + a canonicalization function + a serializer + a hash, written in Concrete, with proofs about it in Lean.

**Verdict: all four are expressible in Concrete today, and — contrary to first appearances — all four can be placed inside the provable fragment.** But only in one specific style. The idiomatic style fails.

### 5.1 The idiomatic style fails the proof gate (verified)

A recursive ADT is *legal and compilable*:

```con
enum Term { Lit { n: i32 }, Add { l: Heap<Term>, r: Heap<Term> } }
```

elaborated cleanly (probe `rec_enum.con`). `examples/snippets/linked_list.con` shows the full idiom — `alloc(Node::Cons { value, next: head })`, `match *head`, recursive `sum_list`.

But `--report proof-status` on that file returns, live:

```
`main.push`     … has capabilities: Alloc, allocation
`main.sum_list` … has capabilities: Alloc, recursion (direct), allocation
`main.length`   … has capabilities: Alloc, recursion (direct), allocation
```

**Three independent disqualifiers stack on the natural encoding**: `Heap<T>` forces `Alloc`, `Alloc` is a capability (authority-free is required), allocation is separately banned, and any fold over a recursive type is recursion. Nothing about a heap-based AST can enter the proof surface.

This is also why the flagship Lisp interpreter `examples/mal/main.con` (1,300 lines) does **not** use a recursive ADT. It uses a manual tag/index encoding — `struct Copy Val { tag: i32, data: i32 }` with `data` an index into a `Vec<Cell>` cons pool (`examples/mal/main.con:28-31,196-201`). That is the house idiom for ASTs, and it is chosen, not accidental.

### 5.2 The style that works (verified end-to-end)

Encode the AST as a **fixed-size array arena of `Copy` structs**, index children by `i32`, and use `for`-loops with the specific body discipline below. Probe `cas4.con` + `cas3.con`:

```con
struct Copy Node { tag: i32, a: i32, b: i32 }   // 0=Lit(a=val) 1=Add(a=lhs,b=rhs) 2=Mul

fn norm_node(nd: Node) -> Node {                                  // canonicalize, per node
    if nd.tag == 1 { if nd.a > nd.b { return Node { tag: nd.tag, a: nd.b, b: nd.a }; } }
    return nd;
}
fn canonicalize(arena: [Node; 8], n: i32) -> [Node; 8] {
    let mut out: [Node; 8] = arena;
    for (let mut i: i32 = 0; i < n; i = i + 1) { out[i] = norm_node(out[i]); }
    return out;
}
fn serialize(arena: [Node; 8], n: i32) -> [u8; 24] {              // 3 bytes/node
    let mut buf: [u8; 24] = [0; 24];
    for (let mut i: i32 = 0; i < n; i = i + 1) {
        buf[i * 3]     = arena[i].tag as u8;
        buf[i * 3 + 1] = arena[i].a   as u8;
        buf[i * 3 + 2] = arena[i].b   as u8;
    }
    return buf;
}
fn hash_addxor(buf: [u8; 24]) -> u32 {                            // add/xor/shift only
    let mut h: u32 = 2166136261;
    for (let mut i: i32 = 0; i < 24; i = i + 1) {
        h = h ^ (buf[i] as u32);
        h = wrapping_add(h, h << 3);
        h = h ^ (h >> 11);
    }
    return h;
}
```

Live results:

- `--interp` → `56` (runs correctly, first try).
- `--report proof-status` on `cas3.con`: `serialize` and `hash_addxor` both → **"passes the predictable profile but has no registered proof"** with a printed PExpr fingerprint — i.e. ProofCore extraction **succeeded** and a Lean theorem can be attached.
- `--report proof-status` on `cas4.con`: `norm_node` and `canonicalize` both → **"passes the predictable profile"**.

So all four target components reach the state where the only remaining work is writing the Lean proof.

A sample emitted fingerprint (the actual proof subject) for `hash_addxor`:

```
[(let h (int 2166136261)) (let i (int 0))
 (while (binop BinOp.lt (var i) (int 24))
   [(set h (binop BinOp.bitxor (var h) (cast (index (var buf) (var i)) Ty.u32)))
    (set h (binop BinOp.wrappingAdd (var h) (binop BinOp.shl (var h) (int 3))))
    (set h (binop BinOp.bitxor (var h) (binop BinOp.shr (var h) (int 11))))
    (set i (binop BinOp.add (var i) (int 1)))]
   [(set i (binop BinOp.add (var i) (int 1)))])
 (ret (var h))]
```

### 5.3 The three non-obvious rules (each discovered by bisection, each cites source)

These are not stated together anywhere in `docs/`, and two of them contradict or refine the documentation.

**Rule 1 — a loop is "bounded" only if it has a `for`-style step clause.** The classifier is purely syntactic (`Concrete/Proof/ProofCore.lean:445-448`):

```lean
| .while_ cond body _ step =>
  let hasStep := !step.isEmpty
  let thisBound := if isBoundedCond cond && hasStep then .bounded else .unbounded
```

with `isBoundedCond` accepting only a top-level comparison binop (`:408-412`). A hand-written `while i < 24 { … i = i + 1; }` has an **empty `step`** and is classified **unbounded** — *even with a literal bound* — and the function is rejected as "not eligible: unbounded loops". Rewriting the identical loop as `for (let mut i: i32 = 0; i < 24; i = i + 1)` makes it bounded. Verified: probe `cas.con` (all `while`) → 5/5 ineligible; probe `cas2.con` (same code, `for`) → eligible.

**Rule 2 — a loop body may contain `let` bindings *or* array writes, not both.** `ProofCore.lean:1300-1310` documents two loop shapes: "flat-assign body → `PExpr.while_` (every body stmt is `.assign`)" and "richer body → `PExpr.while_step` (let/assign/return/if-no-else)". `bodyFitsStep` accepts `.letDecl`, `.assign`, `.return_ (some _)`, `.ifElse _ _ none` — but **not `.arrayIndexAssign`**. So a `let` in the body forces the `while_step` path, where the array write is then unsupported. Bisected live with probe `narrow.con`:

| probe fn | body | result |
|---|---|---|
| `a_computed_index` | `buf[i*3] = 1;` | extracts |
| `c_two_writes` | two `buf[i] = …;` | extracts |
| `d_struct_lit_write` | `out[i] = Node{…};` | extracts |
| `b_struct_let` | `let nd = arena[i]; buf[i] = nd.tag as u8;` | **blocked**: "while loop body shape (only let/assign/return/if-no-else supported)" |

This **refines a doc claim**: `docs/PROVABLE_V1.md:92` says loop bodies "may rebind scalars **and** write array elements". They may do either, not both in one body. The workaround is exactly what `cas3.con`/`cas4.con` do — inline the read (`arena[i].tag`) or hoist the work into a non-recursive helper function, which *is* supported (direct calls are in the fragment).

**Rule 3 — `if/else` used as a value inside a loop body blocks extraction.** `cas3.con`'s `canonicalize` wrote `a: if … { out[i].b } else { out[i].a }` inside a struct literal and was blocked; moving the same logic into the straight-line helper `norm_node` (statement-position `if`, no `else`, early `return`) made both functions extract (`cas4.con`). Value-position `ifExpr` is a `CExpr` constructor (`Core.lean:96`) but is not modelled in a loop-body position.

### 5.4 Which hash to use — this matters

| Hash | Compiles? | Extractable / provable? | Evidence |
|---|---|---|---|
| **FNV-1a (`std/src/hash.con`)** | yes | **no** | uses `u64` + `wrapping_mul`; `PROVABLE_V1.md:104-116` puts wrapping `sub`/`mul` at fixed width OUT |
| **u32 FNV-1a (probe `hash_mul`)** | yes | **no** | live: "blocked … unmodelled statement or control-flow structure (no ProofCore form)" |
| **add/xor/shift (probe `hash_addxor`)** | yes | **yes** | live: extracts with a fingerprint |
| **SHA-256 (`std/src/sha256.con`)** | yes | **yes, and already proved** | 178 theorems in `proofs/Examples/HmacSha256/Proofs.lean`; `sha256_hash_refines_spec` etc. |

The structural reason is worth stating because it drives the design: **the provable fragment has no multiplication at fixed width.** SHA-256 fits precisely because it uses only mod-2³² addition, xor, and, not, and rotations-by-shifts — all admitted (`addw` at `u32`, `shl`/`shr` at `u32`). Every multiplicative hash — FNV, FxHash, the golden-ratio mixers in `std/src/hash.con` — is outside.

**Recommendation for the target use: content-address with SHA-256.** It is the one hash in this tree with actual Lean refinement theorems, and it is the one whose primitive operations the proof model admits. The cost is the Tier-1 native-trust axioms (`Lean.ofReduceBool`, `Lean.trustCompiler`) that the existing SHA-256 proofs carry — confirmed live — which come from `bv_decide`'s LRAT certificate checker running as compiled Lean. A from-scratch SHA-256 proof avoiding `bv_decide` would be pure-kernel but is substantial work.

### 5.5 Component-by-component summary

| Target component | Expressible in Concrete? | In the provable fragment? | Caveats |
|---|---|---|---|
| AST datatype for a term language | **yes** — two ways | **only** as fixed-array arena of `Copy` structs | recursive `enum … Heap<T>` compiles but is permanently outside the proof surface (Alloc + allocation + recursion) |
| Canonicalization function | **yes** | **yes** | must be a `for` loop calling a straight-line non-recursive helper (Rules 1–3) |
| Serializer | **yes** | **yes** | fixed-size `[u8; N]` output only; no `Bytes`, no `String`, no dynamic length |
| Hash | **yes** | **yes, if multiply-free** | SHA-256 recommended (already proved); FNV/multiplicative are compilable but unprovable |
| Structural equality on terms | **partial** | element-wise comparison over the arena is fine | no derived `Eq`; no `derive` at all (`ANTI_FEATURES.md:222-236`) |
| Variable-length / growable terms | **yes via `Vec`** | **no** | `Vec` needs `Alloc` |

### 5.6 What's missing, and whether Lean-against-Core-IR is a better route

Missing from Concrete for this target:

1. **No dynamic-length byte output in the provable fragment.** Serialization must target a fixed `[u8; N]`. A real content-addressed store needs variable-length encoding; in Concrete that means `Vec`/`Bytes`, which means `Alloc`, which means unprovable.
2. **No recursion, so no structural fold.** Every traversal must be a bounded loop over an arena with an explicit worklist.
3. **No strings in the fragment**, so no textual canonical form.
4. **No structural equality/ordering derivation** — every comparison is hand-written.
5. **Proof identity is pre-monomorphization** (`ARCHITECTURE.md:145`; R-0271), so a generic term type cannot get per-instantiation proofs.
6. **Fingerprint freshness has known unsound edges** (bugs 059, 060) — a proof can read `proved` after a signature change, and a false `#[ensures]` can read `proved`.

**Could the missing parts be done in Lean directly against Concrete's Core IR instead?** Yes for *some* of it, and the tree is unusually well set up for it — but with a sharp boundary:

- **Favourable.** `Concrete/Elab/Core.lean` is small (421 lines), fully typed at every node, dependency-free (`lake-manifest.json` → no packages), and already has a total pretty-printer. `CoreCanonicalize` (`Concrete/Elab/CoreCanonicalize.lean`) is documented pure and non-failing. The pipeline artifacts are type-enforced (`ValidatedCore`). Writing a `CModule → ByteArray` serializer and a hash *in Lean, over Core IR* would face **none** of the six restrictions above — Lean has recursion, `ByteArray`, structural equality, and no capability gate. Content-addressing **Concrete programs** is therefore materially easier than content-addressing a term language *in* Concrete.
- **Unfavourable.** `CExpr`/`CStmt` derive nothing (`Core.lean` — only `Callee` derives `BEq, Repr, Inhabited, DecidableEq` at `:45`), so `BEq`/`DecidableEq`/`Hashable` instances for the mutual `CExpr`/`CMatchArm`/`CStmt` block must be written by hand, and mutual-inductive `deriving` in Lean 4 is not free. `Ty` derives only `Repr, BEq` (`AST.lean:86`) — no `DecidableEq`.
- **The boundary that does not move.** A Lean-side theorem about Core IR still says nothing about the emitted binary. `TRUSTED_COMPUTING_BASE.md:124`: the Core→SSA→LLVM→binary chain is entirely unverified. If the goal is a *verified* content-addressed core, Lean-over-Core-IR buys expressiveness but not end-to-end coverage; if the goal is a *verified specification* with a separately-trusted implementation, it is the better route by a wide margin.

---

## 6. Grammar character

**File:** `grammar/concrete.ebnf`, 390 lines, 60 rules. Self-described as "the single source of truth for the language's syntactic shape" (`:5-7`).

- **Mechanically LL(1).** `scripts/check_ll1.py` (with `check_ll1.c` and `check_ll1.rs` siblings — the same checker in three languages) was run live: *"Parsed 60 grammar rules … LL(1) check passed: no FIRST/FIRST conflicts found."* Every alternation is resolvable with one token of lookahead; common prefixes are factored out explicitly (e.g. `top_decl` → `decl_after_pub` → `decl_after_trusted` → `decl_keyword`, `:44-54`).
- **Surface syntax** is Rust-shaped without Rust's hard parts: `fn f<T: Bound>(x: T) with(Console) -> R { … }`, `struct Copy S { … }`, `enum E { V { f: T } }`, `newtype`, `impl T { … }` / `impl T for Trait { … }`, `trait`, `const`, `type`, `import a.b.{x as y};`, `mod m { … }`. Types: `&T`, `&mut T`, `*mut T`, `*const T`, `fn(…) with(C) -> R`, `[T; N]`, `IDENT<args>`. 13 precedence levels (`:275-293`), with postfix binding tighter than unary and unary tighter than `as`.
- **Statement/expression split is positional.** `if` and `match` parse as statements in statement position and as values in value position; the grammar file deliberately leaves the value forms *out* of `primary_expr` because "the position-blind FIRST/FIRST checker cannot express" the dispatch (`:337-347`). Value `while` was **removed** (`:349-352`). This is the one place the EBNF is knowingly not the whole truth.
- **Note on notation:** the file writes enum-path patterns as `IDENT '#' IDENT` (`:216`, `:262`, `:366`) where actual source uses `::` (`A::X { a }` in `examples/snippets/enum_match.con`). Treat `'#'` in those three rules as the EBNF's stand-in for the variant-path separator, not a literal token — do not build a parser from those lines without checking `Concrete/Frontend/Parser.lean`.

### 6.1 Relevance to canonicalizing Concrete programs

This is the strongest part of the fit, and the README states the property directly (`README.md:22-27`): *with no closures, no trait objects, no macros, and whole-program monomorphization, code values come from a closed set of named functions — the whole program is statically enumerable*, even when a function-pointer target is selected at runtime.

Concretely, for anyone wanting a canonical form for Concrete programs:

1. **A working canonical printer already ships.** `concrete fmt` was verified **idempotent** here (`fmt(fmt(x)) == fmt(x)` byte-identical), backed by `Concrete/Frontend/Format.lean`. That is a text-level canonical form available today, with `--check`/`--write`/`--stdin` modes.
2. **A second, deeper canonical form also ships:** `CoreCanonicalize` (`Concrete/Elab/CoreCanonicalize.lean`, pipeline stage 5), documented pure and total. `--emit-core` prints it. This normalizes *after* desugaring, so surface variation (`for` vs `while`, `p->f` vs `(*p).f`, method-call vs free-call spelling) is already collapsed.
3. **Fingerprinting infrastructure exists and is deterministic.** Truncated SHA-256 body fingerprints over extracted PExpr, with `docs/DETERMINISM.md:3` claiming verified determinism across all 17 report modes and all emit modes, no HashMap iteration in output paths (all internal collections `List`-based), no PRNG, explicit `mergeSort` in `CapSet.normalize`. The one documented non-determinism is a `timestamp` field in snapshot JSON. Determinism is guaranteed **within a compiler version only** (`:40-48`) — a version-stamped digest, not a stable one across releases.
4. **The caveat.** The existing fingerprint hashes the *extracted PExpr*, and that extraction covers only the provable fragment; it also (bug 059) **drops declared types and never sees the signature**, and (bug 060) excludes `#[ensures]`. It is not a sound content address for a Concrete program. A new digest over `CModule` would be the right construction — and per §5.6 that is a Lean-side job, not a Concrete-side one.

---

## 7. Documented claims vs. observed status

| README / ROADMAP claim | Observed |
|---|---|
| "the grammar is LL(1) and checked as part of the project" (`README.md:33`) | **holds** — checker run live, passes |
| "Linear ownership … cleanup is explicit, never an implicit scope-exit drop" (`:34-36`) | **holds in code**; H6/H9–H11/H13–H17 closed. Residual: bug **052**, `Vec<[T; N]>.drop()` synthesizes a no-op destructor → silent leak for unnamed element types |
| "safe references are second-class … safe APIs never return `&T`" (`:37-40`) | **holds** — H1 closed by exactly this invariant |
| "Capability headers: side effects and authority appear in the signature" (`:42-44`) | **holds** — `--report caps` run live; 9 fixed capabilities |
| "Runtime safety: array bounds, arithmetic traps … become visible obligations or checks" (`:45-47`) | **holds** — `@__cc_bounds_check` and `@__cc_{s,u}{add,sub}_*` visible in emitted IR |
| "Evidence, not one badge … reported as *distinct* classes" (`:48-50`) | **holds** — proof-status distinguishes proved / stale / unbound / dependency-not-current / unproved / blocked / ineligible / trusted |
| "the whole program is statically enumerable" (`:22-27`) | **holds by construction** — no closures, no `dyn`, no macros, whole-program mono |
| "Lean-hosted, verification-oriented" | **holds** — but the verified surface is §5's fragment, not the language |
| Phase status | Project is at **Phase 7 (Standard Library And Core APIs)** of a 20-phase roadmap (`ROADMAP.md:773`). Phases 7.5 (QBE backend), 13 (runtime safety obligations), 14 (compiler soundness bridge), 15 (backend/target contracts), 16 (freestanding), 17 (public release bar) are all still ahead. |
| `ARCHITECTURE.md:555-567` work phases | A1/A2/A3/A5/A8/A9/A9b **DONE**; A4/A6 "DONE enough"; **A7 (builtin vs stdlib boundary) active**; **A10 (formal kernel proofs) Started** — "Recursion, references, allocation/effects, unsupported operation widths/failure forms, and complete source-to-Core preservation remain outside the current claim" |

### 7.1 Open defect counts (from `docs/bugs/README.md`, spot-checked)

54 fixed · **9 open numbered** (027, 049, 052, 054, 055, 058, 059, 060, 063) · plus unnumbered open classes and two confirmed-but-unnumbered defects (proof replay working-directory sensitivity R-0004; capability-polymorphic callback inference R-0016).

The four that would bite the target use:

- **052** — `Vec<[T; N]>.drop()` silently skips element destruction (arrays inside collections).
- **059 / 060** — proof-freshness holes: a signature change or a false `#[ensures]` can still read `proved`.
- **027** — SSA→LLVM text rendering is superlinear; a generated/large canonicalizer would feel it.

Every H-series hole in `docs/KNOWN_HOLES.md` is **CLOSED**; the file is a curated legacy index, not the live defect list.

---

## Appendix A — probe programs

Written for this survey, in
`C:\Users\kokok\AppData\Local\Temp\claude\C--Users-kokok-Dev-foldlab\b0bd724d-de6c-448c-82e5-3e36fc864819\scratchpad\ctest\`:

| File | Purpose | Result |
|---|---|---|
| `rec_enum.con` | recursive `enum` via `Heap<T>` | elaborates cleanly |
| `rec_struct.con` | by-value recursive struct | rejected `E0583` with an indirection hint; the `*const Node` sibling in the same file is accepted |
| `cas.con` | arena AST + canonicalize + serialize + 2 hashes, hand-written `while` | interprets → `56`; **5/5 ineligible ("unbounded loops")** |
| `cas2.con` | same, `for` loops | interprets → `56`; `hash_addxor` extracts, `hash_mul` blocked, `canonicalize`/`serialize` blocked |
| `narrow.con` | 4-way bisection of loop-body shapes | isolated the `let` + array-write conflict |
| `cas3.con` | let-free loop bodies | `serialize` + `hash_addxor` extract |
| `cas4.con` | canonicalize via helper call | `norm_node` + `canonicalize` extract — **all four target components now in the fragment** |

## Appendix B — reproduction notes

- `lake build` in the clone is safe and idempotent; warm rebuild ~1 s.
- Proof axiom checking works: write a file with `import Concrete` / `import Examples` / `#print axioms <name>` into the clone root and run `lake env lean <file>`. (Note `--report check-proofs` cannot do this on Windows.)
- Probe programs need no `std`; invoke as `.lake/build/bin/concrete.exe <abs-path>.con --interp` or `--report proof-status`.
- Do not expect a native binary on this host: no `clang`, and the emitted triple is macOS ARM64 regardless.
