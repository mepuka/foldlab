## Report: Concrete compiler docs (read-only survey)

All paths below are absolute; line numbers refer to the files as they exist in the clone.

---

## 1. Named pipeline stages, in order, and their Lean modules

Canonical chain (`C:\Users\kokok\Dev\foldlab\.reference\clones\concrete\docs\ARCHITECTURE.md:19`, `docs\PASSES.md:9-44`, `Main.lean:281`):

```
Source -> Parse -> Resolve -> Check -> Elab -> CoreCanonicalize -> CoreCheck
       -> Mono -> Lower -> SSAVerify -> SSACleanup -> EmitSSA -> clang
```

| # | Stage | Signature (PASSES.md) | Lean module | Status claimed |
|---|---|---|---|---|
| 1 | Parse | `Pipeline.parse : String → Except Diagnostics ParsedProgram` (`docs\PASSES.md:94`) | `Concrete/Frontend/Parser.lean` (+ `Lexer`, `Token`, `AST`, `Format`) — `docs\ARCHITECTURE.md:36` | working |
| — | resolveFiles (IO submodule read) | `ParsedProgram × SourceMap` (`docs\PASSES.md:553`) | `Concrete/Pipeline/Pipeline.lean` | working, but **named-artifact gap** (`docs\ARCHITECTURE.md:130` — "Remaining gap"; candidate `ResolvedFilesProgram`, Phase 8.5) |
| — | BuildSummary | `ParsedProgram → SummaryTable` (`docs\PASSES.md:556`) | `Concrete/Resolve/FileSummary.lean` | working |
| 2 | Resolve | `Pipeline.resolve : ParsedProgram → SummaryTable → ResolvedProgram` (`docs\PASSES.md:116`) | `Concrete/Resolve/Resolve.lean` (`docs\ARCHITECTURE.md:474-478`, A3 **DONE**) | working |
| 3 | Check | `checkProgram : List ResolvedModule → Except Diagnostics Unit` (`docs\PASSES.md:150`) | `Concrete/Check/Check.lean` + `CheckError.lean` + `CheckHelpers.lean` (`docs\ARCHITECTURE.md:39-42`) | working |
| 4 | Elab | `elabProgram : List ResolvedModule → Except Diagnostics (List CModule)` (`docs\PASSES.md:194`) | `Concrete/Elab/Elab.lean` (Core IR in `Concrete/Elab/Core.lean`) | working (A2 **DONE**, `docs\ARCHITECTURE.md:470`) |
| 5 | CoreCanonicalize | `canonicalizeProgram : List CModule → List CModule` (`docs\PASSES.md:223`) | `Concrete/Elab/CoreCanonicalize.lean` | working, pure, cannot fail (`docs\PASSES.md:235-238`) |
| 6 | CoreCheck | `coreCheckProgram : List CModule → Except String Unit` (`docs\PASSES.md:244`) | `Concrete/Check/CoreCheck.lean` | working — "post-elaboration semantic authority" (A4 **DONE enough**, `docs\ARCHITECTURE.md:492`) |
| 6b | (side channel) ProofCore extraction | `extractProofCore : ValidatedCore → … → ProofCore` (`docs\PASSES.md:317`) | `Concrete/Proof/ProofCore.lean`, semantics in `Concrete/Proof/Proof.lean` | partial (A10 **Started**, `docs\ARCHITECTURE.md:544-551`) |
| 6c | Policy enforcement | `docs\PASSES.md:31` | `Concrete/Check/Policy.lean` | working |
| 7 | Mono | `monoProgram : List CModule → Except Diagnostics (List CModule)` (`docs\PASSES.md:295`) | `Concrete/IR/Mono.lean` (A8 **DONE**) | working; hard gate `verifyPostMono` in `Concrete/Check/Verify.lean` (`docs\PASSES.md:679`) |
| 8 | Lower | `lowerModule : CModule → Except Diagnostics SModule` (`docs\PASSES.md:370`) | `Concrete/IR/Lower.lean` (SSA types in `Concrete/IR/SSA.lean`) | working (A9 **DONE**) |
| 9 | SSAVerify | `ssaVerifyProgram : List SModule → Except String Unit` (`docs\PASSES.md:393`) | `Concrete/IR/SSAVerify.lean` — runs **twice**, pre- and post-cleanup (`docs\PASSES.md:395`) | working (A9b **DONE**) |
| 10 | SSACleanup | `ssaCleanupProgram : List SModule → List SModule` (`docs\PASSES.md:421`) | `Concrete/IR/SSACleanup.lean` | working |
| 11 | EmitSSA | `emitSSAProgram : List SModule → String` (`docs\PASSES.md:441`) | `Concrete/Backend/EmitSSA.lean` (+ `EmitBuiltins.lean`, `LLVM.lean`, `EmitLLVM.lean`, contract in `Backend.lean`) | working (A5 **DONE**) |
| 12 | clang | external process | `Main.lean:121` (`clangArgs`), `Main.lean:322` | working |

Artifact types (all in `Concrete/Pipeline/Pipeline.lean`): `ParsedProgram`, `SummaryTable`, `ResolvedProgram`, `ElaboratedProgram`, `ValidatedCore`, `MonomorphizedProgram`, `SSAProgram` (`docs\ARCHITECTURE.md:110-128`). `ValidatedCore` is type-enforced: only `Pipeline.coreCheck` constructs it, and `Pipeline.monomorphize` demands it (`docs\ARCHITECTURE.md:116`, `docs\PASSES.md:46`). The **proof boundary is after CoreCheck, before Mono** (`docs\ARCHITECTURE.md:145`).

Planned-but-not-built pipeline names (do not confuse with the implemented one): `ProjectContext`, `CompilerLedger`, `TypedIR`/`CheckedIR`, `CanonicalIR`, `BackendIR`/`ValidatedBackendIR` — all target-state in `docs\COMPILER_PIPELINE.md:17-32,145-153,380-421`. `BackendIR` is explicitly **not implemented**: "Today the SSA pipeline is `Lower -> SSAVerify -> SSACleanup -> EmitSSA`" (`docs\PASSES.md:465-478`).

---

## 2. Code generation target

**LLVM IR text, assembled from a structured Lean IR type, then handed to `clang`.** Not C, not the LLVM C API, not QBE, not native codegen.

- Target: LLVM IR text. `EmitSSA ── SSAProgram → String (LLVM IR)` then `clang ─── executable` (`docs\PASSES.md:40-43`); `docs\ARCHITECTURE.md:338-343` ("Output: LLVM IR text").
- **Does it invoke clang?** Yes. `Main.lean:121` builds `clangArgs` = `[llPath, "-o", outputPath, "-Wno-override-module", "-w", "-O2"]` (+ macOS `--sysroot` from `xcrun`), spawned at `Main.lean:322`, `Main.lean:382`, `Main.lean:1626`, `Main.lean:1674`. The `.ll` file is written next to the input and deleted after (`Main.lean:310,326`).
- **llc / opt / llvm-link:** not invoked anywhere in `Main.lean`.
- **llvm-as:** invoked as a *validator only* (parse-only), and skipped silently if not on PATH (`Main.lean:149-158`, `Main.lean:316`; `docs\PASSES.md:663`, `docs\PASSES.md:683`).
- Target triple/datalayout are hardcoded macOS ARM64: `arm64-apple-macosx14.0.0`, `e-m:o-i64:64-i128:128-n32:64-S128-Fn32` (`Concrete/Backend/Backend.lean`, consumed at `Concrete/Backend/EmitSSA.lean:1663-1664`).

**Textual string-building or structured IR type?** — **Both, with structure dominant.** There *is* a real typed LLVM AST:

- `Concrete/Backend/LLVM.lean` defines `LLVMTy`, `LLVMOperand`, `LLVMBinOp`, `LLVMCastOp`, `LLVMInstr` (line 82), `LLVMTerm`, `LLVMBlock`, `LLVMFnDecl`, `LLVMFnDef`, `LLVMGlobal` (161), `LLVMTypeDef` (170), `LLVMModule` (179). Its header comment claims it "replaces direct string concatenation in the backend."
- `Concrete/Backend/EmitLLVM.lean` is the pure printer: `printLLVMModule : LLVMModule → String` (line 184).
- `Concrete/Backend/EmitSSA.lean` builds the `LLVMModule` value and ends with `printLLVMModule llvmModule` (lines 1744-1751). ~144 structured instruction constructions vs. 8 uses of the `.raw` escape hatch.

Caveats that keep it partly textual: `LLVMInstr.raw (line : String)` exists as an "escape hatch for builtins, format strings, etc." (`Concrete/Backend/LLVM.lean:114`); `LLVMTypeDef` is a raw line (`:170`); `LLVMGlobal.value` is a raw LLVM constant expression (`:161-167`); module header, checked-arithmetic helpers, and the bounds-check helper are hand-written LLVM text pushed into `moduleHeader` (`EmitSSA.lean:226-330,1665-1672`). Also note bug 027: the SSA→text rendering path is still superlinear (see §6).

The long-term claim is that this boundary becomes a *checked* structured boundary — `ValidatedSSA -> BackendIR -> ValidatedBackendIR -> EmitLLVM` (`docs\COMPILER_PIPELINE.md:385-421`, `docs\PASSES.md:470`), with direct SSA→LLVM emission retired after parity. Status: **planned only**.

---

## 3. The provable fragment TODAY — exhaustive IN/OUT

`docs\PROVABLE_SUBSET.md` is background/architecture (`:5-9` explicitly defers the allowlist); `docs\PROVABLE_V1.md` is the canonical contract.

### Function-level eligibility gates (all must hold) — `docs\PROVABLE_V1.md:38-52`
IN only if: no capabilities (authority-free); not `trusted`, not in a trusted impl, no FFI; **not an entry point** (`main` excluded); **direct calls only**, FnTable-complete; **no recursion**; **no heap allocation**, no `Alloc`; none of `File`/`Network`/`Process`/`Console`/`Time`/`Random`/`Env`; no raw pointer ops, no `Unsafe`; whole body in the ProofCore surface; a proved claim needs `body_fingerprint` + `spec` + `proof` + `coverage`.

Restated at `docs\PROVABLE_SUBSET.md:50-63`, which also says the old blanket rules "no loops / no mutation / no aggregates" are **obsolete**.

### Types IN — `docs\PROVABLE_V1.md:55-65`
- `Int` / integer-like scalars (mathematical `Int` in the PExpr value model)
- `Bool`
- Fixed-width integer ops, but only at recorded widths: **`i32`, `u32`, `u8`**
- **Struct** values (algebraic values) — IN
- **Enum** values (algebraic tagged values) — IN
- **Fixed arrays** — IN, for reads, literals, and functional updates

### Types OUT — `docs\PROVABLE_V1.md:66-76`
- **strings and text APIs** — OUT
- heap-owning values — OUT
- raw pointers — OUT
- **references and borrow semantics** — OUT
- function pointers, closures, trait objects — OUT
- generic proof obligations not monomorphized into an explicit proof target — OUT
- layout-sensitive `repr(C)` / packed / FFI values — OUT

**Bytes:** there is no `Bytes`/byte-buffer type in the IN list; the byte story is only `u8` scalars and fixed `[u8; N]` arrays — e.g. `constant_time_tag` is described as "byte-array comparison, u8 bitwise ops" (`docs\PROVABLE_V1.md:178`).

### Expressions IN — `docs\PROVABLE_V1.md:78-102`
int/bool literals; variables; arithmetic + comparisons admitted by `PBinOp` (width-agnostic `add`/`sub`/`mul` model mathematical `Int`); wrapping add `addw` at `u32` only; `mod` for recorded width/signedness; `div` at `i32` (sdiv) and `u32` (udiv), div-by-zero ⇒ `none`; `bitxor`/`bitor` at `i32`/`u32`/`u8` as applicable; `bitand` at `u32` only; `shr` (lshr) at `u32` only; `shl` at `u32` only (truncates to width); `let` bindings; `if/then/else` and the early-return fall-through shape; **non-recursive direct calls** when FnTable-complete; struct literals + field access; enum literals + `match` (extracted pattern forms); casts (identity/widening only — narrowing is outside the stable claim); array literals; array reads (OOB ⇒ `none`); array functional update via `arraySet` (OOB ⇒ `none`); **bounded flat-assignment `while` loops** via `while_` with fuel, bodies may rebind scalars and write array elements; **richer loop bodies with `Cont`/`Break`** via `while_step` + the `LoopStep` enum.

State model (`docs\PROVABLE_V1.md:118-131`): `let` → `letIn`; loop-carried updates → environment rebinding; array assignment → `arraySet` + rebind; loop exits → `LoopStep::Cont`/`Break`. Mutation is modeled functionally, never by aliasing.

### Expressions OUT — `docs\PROVABLE_V1.md:104-116`
shifts at widths other than `u32`; arithmetic right shift `ashr`; `bitand` at non-`u32` widths; rotations as a dedicated op; wrapping `sub`/`mul` at fixed width; true multi-word (>64-bit) arithmetic; arbitrary mutation outside the modeled state forms; **arbitrary loop invariants**; **recursive functions**; exceptions/panic-like recovery; **string/char operations**; allocation, FFI, raw pointer ops, effectful calls.

### Failure model
Evaluator returns `some v` or `none`; `none` = stuck (OOB read/update, missing FnTable callee, unsupported value shape, insufficient fuel, unsupported extraction) — `docs\PROVABLE_V1.md:133-147`, `docs\PROVABLE_SUBSET.md:83-95`. Runtime-error obligations are **not** systematically generated yet (`docs\PROVABLE_V1.md:145-147`, `:194`).

### Explicit non-claims — `docs\PROVABLE_V1.md:184-199`
Not claimed: compiler correctness; that binaries preserve PExpr theorems; LLVM/clang/linker/libc/OS/hardware verification; machine-level constant-time; that all eligible functions are proved; full functional specs; source contracts in the proof subject; systematic runtime-error obligations; borrow/reference semantics in the proof model.

Known incompleteness: extraction happens **before** monomorphization, so per-instantiation generic proof identity is not a general facility (R-0271, `docs\PROVABLE_SUBSET.md:42-46`); ProofCore callable identity was incomplete under bug 061 / R-0442 (`docs\PROVABLE_SUBSET.md:98-104`; the bug ledger marks 061 fixed).

Current flagship examples: `parse_validate`, `crypto_verify` ("toy proof-scaffolding … explicitly not real crypto"), `fixed_capacity`, `constant_time_tag` — "not proof-complete" (`docs\PROVABLE_V1.md:172-182`).

---

## 4. AXIOMS.md — axioms/sorries and policy

File: `C:\Users\kokok\Dev\foldlab\.reference\clones\concrete\docs\AXIOMS.md`. Mechanically enforced by `scripts/tests/check_axiom_inventory.sh`, which runs `#print axioms` over every theorem named by a `#[proof_by(...)]` attribute and fails on anything undocumented (`:1-11`).

- **Tier 0 — allowlisted kernel axioms** (`:13-21`): `propext`, `Classical.choice`, `Quot.sound`. Standard classical Lean; every theorem may depend on these *and nothing else*.
- **Tier 1 — named native-code trust, theorem-by-theorem** (`:24-52`): `Lean.ofReduceBool` and `Lean.trustCompiler`, entering via `native_decide` and — less obviously — via `bv_decide`, whose LRAT certificate checker runs as compiled Lean. Six theorems are granted it, all in the SHA-256/HMAC stack: `Examples.HmacSha256.Proofs.{hmac_sha256_refines_spec, round_refines_list, sha256_compress_at_refines_spec, sha256_compress_refines_spec, sha256_hash_refines_spec, state_to_bytes_refines_spec}`. The list must match `scripts/tests/axiom_native_trust.txt`; unlisted additions fail the gate. `proved_by_kernel_decision (bv_decide)` must be read as "kernel-checked reflection over a natively-executed certificate check" — a larger TCB than `omega`.
- **Tier 2 — forbidden** (`:58-65`): **`sorryAx` — gate fails hard**; **any user-declared `axiom` — "Concrete's proof layer declares none, and the gate keeps it that way."** One future exception is pre-announced: a planned float profile would add a named `float_semantics_trusted` axiom as a Tier-1-style entry, never a silent widening.
- **Out of gate scope** (`:53-57`): `Concrete.Sha256Spec` RFC test vectors and `Concrete.Diagnostic`'s render self-test use `native_decide` but are anonymous `example`s, not evidence.
- **Fixture-only theorem names** (`:67-78`): several `#[proof_by(...)]` attributes in test fixtures name theorems that don't exist as Lean constants (e.g. `Concrete.Proof.pure_add_correct`, `Nonexistent.Module.totally_fake_theorem`). These deliberately exercise the documented limitation that `proof-status` validates fingerprints, not names; `concrete prove --check` is the net. The list is closed — a *new* unresolvable name fails.
- **What no axiom check can see** (`:80-96`) — trusted without any theorem: Core→PExpr extraction preservation (per-rule theorems in progress, R-01…R-28); the PExpr evaluator (`partial def eval`, tested not proved); `BitVec` ↔ LLVM semantics (no correspondence proof); the unbounded-`Int` proof model vs fixed-width runtime; the Lean toolchain itself.

Corroborated by `docs\KNOWN_HOLES.md:578-593` (trust ledger T1) and `docs\TRUSTED_COMPUTING_BASE.md:95-102`.

---

## 5. KNOWN_HOLES.md — the H-series right now

Key framing (`docs\KNOWN_HOLES.md:1-30`): this file is **not** a second bug ledger. It is "a curated index of legacy H-series gaps and cross-cutting safety boundaries"; the current open numbered defects live in `docs/bugs/README.md`. Governing rule: no construct may be **semantically dark**; a hole is acceptable only while tracked, gated, and disclosed, never while silent.

**Every H-series entry in the file is CLOSED.** There are no OPEN H-numbered holes.

| Hole | Status | Summary |
|---|---|---|
| H1 | CLOSED 2026-06-13 (`:373`) | Returned-reference provenance. Resolved by the invariant "references are second-class — never returned"; accessor surface migrated to `get -> Option<V>` / `with_value` / `remove`. Follow-on `with_value_mut`/`modify` closed 2026-07-06 with E0293 overlapping-borrow rejection. `from(param)` remains deferred (Phase 7 #8e). |
| H2 | CLOSED 2026-06-26 (`:345`) | Float→int cast overflow. `f as iN` is now a checked conversion; NaN/±inf/out-of-range abort. **Documented limitation:** the gate is compiled-only — no interpreter float support, so no interp==compiled oracle. |
| H5 | → became C8, CLOSED 2026-06-11 (`:456`) | Address-of-local didn't alias the local. |
| H6 | CLOSED 2026-06-28 (`:282`) | `_` / discarded-expression silent drop of a linear value. `let _ = e;` removed (E0289); `_` dropping a non-Copy value is E0288; discarded linear statement expr E0287. |
| H7 | CLOSED 2026-06-28 (`:269`) | Loop after a loop-bearing `if`-branch produced invalid SSA (E0708). |
| H8 | CLOSED 2026-06-28 (`:320`) | Array indexing not bounds-checked at runtime. Now every array GEP is preceded by `@__cc_bounds_check`; failure calls `abort()` (exit 134), matching the interpreter. |
| H9 | CLOSED 2026-06-28 (`:235`) | Named linear value bound in a nested scope, left unconsumed → leak. Fixed via move-through-let, per-block scope exit (E0208), divergence exemption. |
| H10 | CLOSED 2026-07-01 (`:222`) | Array literal duplicated linear elements (double-free). |
| H11 | CLOSED 2026-07-05 (`:146`) | Projecting a non-Copy value out of a place by value duplicated it → **E0290**. |
| H12 | CLOSED 2026-07-02 (`:191`) | Submodule bodies (including *all of std*) were never front-end checked. 384 std violations burned down to 0; exemption machinery deleted. Forced seven checker fixes. |
| H13–H17 | ALL CLOSED 2026-07-06 (`:80-143`) | Five write/discharge-site holes: H13 `a = b` rebind never consumed RHS (duplication); H14 `break f;` never consumed the break-value (duplication); H15 `arr[i] = v` / `*r = v` leaked the overwritten value (**E0291**); H16 same-scope shadowing dropped the shadowed value (**E0292**); H17 linear params (incl. by-value `self`) carried no consume obligation. |
| H18 | CLOSED 2026-07-16 — **structural remainder OPEN** (`:41-78`) | Collection drop glue for named element types across Vec/HashMap/HashSet/Deque/BinaryHeap/OrderedMap/OrderedSet. **Open remainder: bug 052** — an array or other unnamed element type misses `tyName` lookup and gets synthesized no-op glue, so `Vec<[T; N]>.drop()` can skip leaves. R-0006 owns the fix. Until then "nesting composes" is limited to the named element shapes in the COLLECTIONS-DROP-GLUE gate. Residual by design: `slice.set_unchecked`/`vec.set_unchecked` are raw trusted overwrite escapes. |
| C1–C10 | All CLOSED (`:419-575`) | C1 fn-pointer capability escalation; C2 explicit enum discriminants silently discarded (now E0001 parse rejection); C3 unknown attributes silently ignored; C4 monomorphization name collision; C5 nested place-write miscompile; C6 struct mixed-width field-layout miscompile; C7 proven safety violations not enforced (now E0900); C8/C9/C10 as above. |
| T1 (trust ledger, not a hole) | Tracked (`:578-593`) | Native-code trust under `bv_decide` for the six HMAC/SHA-256 theorems. |

**Two disclosed expressiveness consequences that matter for data-structure code** (`:137-143`, `:180-185`): an owned `[linear; N]` **cannot be discharged at all** — the unsound element copy-out was removed and array destructure patterns do not exist — so merely holding one is **E0208**. Fails closed, never a silent leak; array destructure is a workload-gated follow-up.

**Policy, explicitly not a hole** (`:31-38`): HashMap/HashSet traversal order is **UNORDERED, permanently**. `for_each`/`fold` walk raw slot order; reproducible within a build but never a public contract. Order-sensitive code must use `OrderedMap`/`OrderedSet` (whose traversal APIs are still pending "collections phase 2").

**Open design decisions gating the Phase 5/6/7 freeze** (`:596-631`) — not holes, but unmade: callable values + capability-polymorphic callbacks (design done, implementation workload-gated); narrow const generics `[T; N]` (design decided, **build deferred**, `docs/CONST_GENERICS_V1.md`); pattern completeness (ranges/guards/or/nested); explicit-dictionary coherence; arena/index safety (stale-index use-after-remove); interpreter structured diagnostics; declaration-span remainders.

---

## 6. Bug ledger — counts and what bites data-structure-heavy code

`C:\Users\kokok\Dev\foldlab\.reference\clones\concrete\docs\bugs\README.md`

- **FIXED: 54** entries (`:25-80`).
- **OPEN (numbered): 9** entries (`:82-92`) — bugs **027, 049, 052, 054, 055, 058, 059, 060, 063**.
- Plus **unnumbered still-open** classes (`:96-102`): formatting/interpolation, runtime-oriented collection maturity, runtime/stack-pressure classification.
- Plus **confirmed defects awaiting fixture-backed numbering** (`:104-120`): proof replay is working-directory-sensitive (R-0004: HMAC reports 11 verified from repo root, 0/11 `theorem_lookup` failures from `examples/hmac_sha256/`); capability-polymorphic callback inference rejects stored/derived values (R-0016 — same class as bug 063).

### Bug 024 — recursive struct infinite size: **FIXED**
`C:\Users\kokok\Dev\foldlab\.reference\clones\concrete\docs\bugs\024_recursive_struct_infinite_size.md` — Status: **Fixed**, discovered and fixed 2026-07-07 (`:3-5`).

What it says: a struct containing itself by value — directly (`struct S { x: S }`), mutually (`struct A { b: B } struct B { a: A }`), or through an array element (`struct S { xs: [S; 2] }`) — was not rejected by the checker and reached `llvm-as`, which errored with "identified structure type 'struct.S' is recursive" (`:9-29`). Root cause: `ccCheckModuleDecls` in `Concrete/Check/CoreCheck.lean` never checked that a struct's by-value field graph is acyclic (`:31-37`). Fix: `tyReachesByValue`, a by-value reachability walk where `named`/`array` edges continue and every indirection (`ref`/`refMut`/`ptrMut`/`ptrConst`/`heap`/`heapArray`) breaks the cycle, plus a new `ccCheckModuleDecls` section 1b raising `CoreCheckError.recursiveType` (**E0583**) with the hint "store the recursive field behind an indirection — `heap<T>`, a reference, or a raw pointer" (`:39-53`). Indirected recursive shapes (`next: *const Node`, mutual via `*mut`) still compile; the gate `scripts/tests/check_error_leaks.sh` pins both the rejection and the no-false-positive cases (`:53-55`).

**Practical read for a linked list / tree:** recursive data structures are legal but *must* go through `heap<T>`, a reference, or a raw pointer. A by-value recursive struct is now a clean compile error, not a codegen crash.

### Open bugs that matter for data-structure-heavy programs

| Bug | Status | Impact |
|---|---|---|
| **052** `052_array_element_destroy_noop.md` | **Open** | **Silent resource leak.** `Vec<[T; N]>.drop()` skips element destruction: `Mono.rewriteCallNames` maps `T` via `tyName`, which returns `""` for `.array`/`.ref`/`.ptrMut`/`.heap`/`.fn_`, so the call is never rewritten and Mono synthesizes an **empty no-op destructor** on the false premise "no destroy fn ⇒ element is Copy". Reproduced: expected 2 destructor calls, compiled binary printed 0. Same exposure for `Deque`/`BinaryHeap` and any `tyName = ""` element type. Directly affects arrays-inside-collections. |
| **054** `054_struct_mono_name_collision.md` | **Half closed** (README lists it Open) | Generic **struct specialization mangling is still forgeable**: `base ++ "_" ++ suffixes` with no reserved separator. Since R-0001 a collision **fails closed with E0809** (both reproduced miscompile variants are now clean rejections), but a legitimate program can be *refused* for spelling a generated name. The **function-symbol half is untouched** — fn specializations use a different mangler and are not covered by E0809. R-0007 owns the injective `TypeId`/`FunctionId` fix. |
| **055** `055_sibling_import_alias_unusable.md` | **Open** | **Valid program rejected.** In a project, `src/main.con` doing `import a.{pick as f}` from sibling `src/a.con` resolves at Check but EmitSSA emits a call to undefined `@pick` — fails at llvm-as for generic *and* non-generic callees. Workaround: use the fully-qualified `import proj.a.{pick as f}` form, which works. Hits multi-file data-structure modules. |
| **063** `063_cap_inference_defaults_derived_fnptr_to_empty.md` | **Open** | Cap-variable inference maps "unknown argument type" onto `CapSet.empty`. A fn pointer read from a **struct field, call result, or array element** cannot reach a `cap C` parameter — rejected as E0220 against a `with()` the program never wrote. Explicitly collides with the documented "struct of function pointers" replacement for dynamic dispatch (`ANTI_FEATURES.md:192`). Rejected-valid-program today; flagged as becoming an authority hole if fn-type cap comparison is ever relaxed to subset. |
| **027** `027_emitssa_quadratic_rendering.md` | **Partially fixed / Open** | Codegen (SSA→LLVM text) is superlinear: ~7s at 10k instructions, ~35s at 20k after the dominant quadratic was removed. Matters for generated/large functions; bug 026's 2²⁰ array-repeat cap bounds the array-literal trigger. |
| 049 | Open | `concrete reduce --predicate crash` reduces anything to an empty program — tooling only, not codegen. |
| 058 / 059 / 060 | Open (R-0004) | Proof-subject freshness: 058 contained (missing fingerprint is now `unbound`, never `proved`); **059** the body hash drops declared types and never sees the signature, so an `i32 → u32` change keeps a proof `proved`; **060** `#[ensures]` is outside the hash, so a **FALSE postcondition still reports `proved`**. Affects proof claims, not codegen. |

### Fixed bugs worth knowing when writing this kind of program
Recursion/enums/generics/strings/arrays history, all now fixed: 051 generic enums not monomorphized (R-0001), 050 mono indirect-call hijack (R-0002), 044 renamed generic import not monomorphized, 016 cross-module generic monomorphization link failure, 035 `fieldOffset` generic-enum panic, 005 enum-field struct layout panic, 042 imported newtype not a type, 046/047/048/057 HashMap defects (duplicate-linear keys/values, insert-duplicate past tombstone, `find_slot` hang with no empty slots, builtin size undercount), 052's sibling 019 array struct-field mutation, 004 array variable index assign, 018 stack-array borrow creates copy, 029/030 array addressing and non-mut array write, 026 array-repeat count hang, 010 no string substr, 011 linear string building in loops, 014 string literal in loop invalid IR, 032 multibyte string literal emit, 043 string not NUL-terminated at FFI, 006 cross-module string-literal collision, 013 alloca inside loops stack overflow, 023/033/034/038 aggregate-phi and borrow-promotion classes, 040/041/045 match-binder scope/clobber classes, 053 DCE deleting checked negation, 056 fn-pointer reassign phi.

---

## 7. Anti-features: what is explicitly refused

`C:\Users\kokok\Dev\foldlab\.reference\clones\concrete\docs\ANTI_FEATURES.md` summary table at `:349-369`; each has a "What Concrete does instead."

| Feature | Status | Reason / replacement |
|---|---|---|
| Garbage collection | **Permanent** (`:30-36`) | Hides memory behavior. Instead: linear ownership, `defer`, `with(Alloc)`. |
| Hidden async runtime / event loop | **Permanent for hidden runtimes; Deferred for explicit structured concurrency** (`:44-49`) | Function coloring, hidden scheduling. Single-threaded today. |
| Implicit numeric conversions | **Permanent** (`:60-66`) | Explicit `as` casts only. |
| Implicit/user-extensible string conversions (`Display`/`ToString`) | **Permanent** (`:74-86`) | Hides allocation. `print`/`println`/`append` are a *closed* compiler-known exception expanded by Elab into typed `print_*`/`string_append_*` calls — no lookup, no user hook, no runtime format dispatch. |
| Implicit bool / truthiness | **Permanent** (`:93-99`) | `if`/`while` require `Bool`. |
| Hindley-Milner / global type inference | **Permanent** (`:111-117`) | Local let-binding inference only; params and returns annotated. |
| Exceptions / unwinding | **Permanent** (`:129-135`) | `Result<T,E>` + `?` (sugar for early return); abort-only for unrecoverable. |
| Effect system beyond capabilities | **Permanent** for the fixed model (`:143-149`) | Nine named caps: `File`, `Network`, `Time`, `Env`, `Random`, `Process`, `Console`, `Alloc`, `Unsafe`. Names may grow; the mechanism is structural. |
| Decorative contracts | **Permanent** (`:161-167`) | Contracts *exist* and are shipped, but only because obligation-backed and evidence-classed. The refusal is contracts that decorate without producing an obligation. |
| Ghost code / spec-only types | **Deferred** (`:176-182`) | Erasure discipline not designed. |
| **Trait objects / `dyn` dispatch** | **Permanent** (`:188-194`) | Opaque call targets. Instead: enums for closed dispatch, monomorphized generics, **typed function pointers**, struct-of-function-pointers as manual vtable. |
| **Closures / anonymous functions with capture** | **Permanent** (`:205-211`) | Hidden capture, hidden data flow. Instead: named functions, capture-free function pointers, monomorphized generics, enums + match. |
| **Source-generating macros** (incl. `#[derive]`) | **Permanent** (`:222-236`) | Breaks phase separation, locality, auditability. "There is no derive-helper exception." Compiler-recognized attributes classify evidence/policy but generate no source. External codegen must emit reviewable source as a build step. |
| Comptime evaluation | **Deferred** (`:243-249`) | May return for compile-time constants only. |
| User-defined operator overloading | **Permanent (first release)** (`:260-266`) | Named methods instead; any future version must be effect-transparent. |
| C-style / user-defined variadics | **Permanent** (`:277-291`) | `print`/`println`/`append` are the only exception — desugared into fixed-arity intrinsic calls, not declarable by users, not passable as a callable value. |
| Default function arguments | **Deferred** (`:302-308`) | Invisible parameters; define `open` / `open_with_mode` instead. |
| Class inheritance | **Permanent** (`:320-326`) | Structs + traits + enums + composition. |
| Implicit trait resolution beyond monomorphization | **Permanent** (`:337-343`) | Action-at-a-distance. |
| **Anonymous tuples** | **DECIDED / closed** (`docs\TUPLES.md:1-14`) | No tuple types, tuple literals, or positional tuple indexing in V1 — rejected at *parse* time with a clean error. The named struct is the one product type; `struct Copy DivMod { quotient, remainder }`. `t.0` survives only for **newtypes** (`Port(u16)`). Gated by `scripts/tests/check_no_tuples.sh`. |

Meta-principle (`:375`): "if it hides behavior from the reader, the auditor, or the prover, it does not belong in the first release."

Reinforced by `docs\LANGUAGE_SHAPE.md:23-28` (dispatch is monomorphized or through typed fn pointers — "No closures, no trait objects, no implicit vtables"), `:47` (linear-by-default ownership, E0219, no silent auto-drop at scope exit), `:52-57` (whole-program monomorphization, no separate compilation of generics, no RTTI), and `:66-76` ("Not a metaprogramming language… No comptime evaluation beyond a possible future constants-only profile"; "Not a runtime-dependent language" — no GC, no async runtime, no thread pool).

---

## Cross-cutting status notes

- **Trusted computing base** (`docs\TRUSTED_COMPUTING_BASE.md`): the Concrete checker/compiler is **trusted, not proved** — "Not currently claimed: formal proof of compiler correctness … checker soundness … code-generation correctness (Core IR → SSA → LLVM IR)" (`:48-53`). "The Core IR → SSA → LLVM IR → binary chain is entirely unverified. This is the single largest gap" (`:124`). Provable-profile TCB has four critical layers (checker, extraction, registry, Lean kernel) and two explicit **Gap** rows (backend, runtime/integer model) (`:186-197`). Claimed active verification: adversarial suite of 1272 trust-gate checks, CI proof gate of 20 checks across 8 sections (`:42-47`).
- **Determinism** (`docs\DETERMINISM.md`): Status "**verified**" (`:3`). Deterministic: all 17 report modes, all query modes, `--emit-llvm`, `--emit-ssa`, `--emit-core` (`:12-15`). **Not tested:** the compiled binary — depends on LLVM/clang determinism, outside Concrete's control (`:16`, `:52`). **Known exception:** the `timestamp` field in snapshot JSON (`:17`, `:34-36`). Mechanisms: no HashMap/HashSet iteration in output paths (all internal collections are `List`-based), no PRNG, no env-dependent data, explicit `mergeSort` in `CapSet.normalize`, monotonic SSA register counter, truncated-SHA-256 fingerprints (`:22-30`). Determinism is guaranteed **within a compiler version only** (`:40-48`).
- **Architecture work phases** (`docs\ARCHITECTURE.md:555-567`): A1, A2, A3, A5, A8, A9, A9b = **DONE**; A4, A6 = **DONE enough**; **A7 (builtin vs stdlib boundary) = Active/In progress** (`:518`); **A10 (formal kernel proofs) = Started** — "Recursion, references, allocation/effects, unsupported operation widths/failure forms, and complete source-to-Core preservation remain outside the current claim" (`:544-551`).