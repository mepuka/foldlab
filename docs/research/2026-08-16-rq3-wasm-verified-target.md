# RQ-3 — WebAssembly as a target for verified code

Research seat, 2026-08-16. Serves D-bc (ratified WASM-preferred lane),
REF-6, REF-7. Reference area and reproductions:
`docs/research/reference/rq3-wasm-verified-target/`.

**Headline.** WebAssembly's *core* semantics are a defensible foundation
for a byte-in/byte-out kernel — the arithmetic and memory instructions
our seam would use are deterministic, and I measured bit-identical
results for a zero-import module across wazero's compiler engine,
wazero's interpreter, and Bun's JavaScriptCore. But the specification
places host imports **outside** that determinism guarantee in as many
words, and I demonstrated the consequence mechanically: the same
`.wasm` bytes that wazero runs to completion make Bun 1.3.14 throw
`RuntimeError: Out of bounds memory access`, and a WASI call that
wazero answers with errno `0` (and `21` when it should fault) Bun
answers with `32` in both cases. D-bc's one-digest-everywhere property
is real, but it is a property of **modules with no imports**, not of
`.wasm` files in general. Meanwhile the Lean-to-wasm path is thinner
than the dispatch's leads suggested: Lean 4 does have an in-tree
Emscripten target, but its CI job has been commented out since v4.16.0
(2025-02-03), no release ships a wasm artifact, and the target is
configured with `-pthread -fwasm-exceptions`, both of which wazero
rejects at its default configuration — I ran that too.

---

## 0. Method, and what "I ran it" covers here

Executed on this machine (Windows 11 10.0.26200, x86-64; Go 1.26.5;
Bun 1.3.14; Lean 4.33.0 via elan 4.2.3; wazero v1.12.0 fetched from the
module proxy):

- eight hand-encoded `.wasm` probes, written directly from the core
  spec's binary format, no toolchain and no vendored code;
- both wazero engine backends and Bun's `WebAssembly` host driven over
  the same probes, with transcripts recorded;
- WASI preview1 probes designed so the **process exit code is the errno
  the host's shim returned**, so a divergence needs no instrumentation;
- a stock `GOOS=wasip1 GOARCH=wasm go build` module, for a realistic
  import surface, run under both hosts;
- three wazero concurrency patterns, repeated.

Not executable here, stated plainly: I have **no emscripten, no clang,
no wasi-sdk, no wat2wasm, no cmake** on this machine (checked; all
absent). I therefore did **not** build the Lean runtime to wasm, and
every claim about that build below is read from Lean's own build system
and CI configuration, never from an attempted build. That build is the
REF-0 spike's job; this report tells it where to look and what to
record.

---

## 1. Is there a published argument for compiling verified code to WASM rather than to C?

**Yes — the dispatch's lead is confirmed, and it is narrower than the
lead's phrasing.**

Protzenko, Beurdouche, Merigoux and Bhargavan, *Formally Verified
Cryptographic Web Applications in WebAssembly*, IEEE S&P 2019
(IACR ePrint 2019/542, retrieved <https://eprint.iacr.org/2019/542.pdf>
2026-08-16). Their argument has two halves and only one of them is
about wasm-versus-C.

The first half is a **trusted-base** argument against the *toolchain*,
not against C as a language:

> "The core issue with the current toolchain is both the complexity of
> the tooling involved and its lack of auditability. Trusting libsodium
> to be a correct cryptographic library for the web involves trusting,
> in order: that the C code is correct, something notoriously hard to
> achieve; that LLVM introduces no bugs; that the runtime system of
> Emscripten does not interfere with the rest of the code; that the
> Binaryen tool produces correct WebAssembly code; that none of these
> tools introduce side-channels; that the code is sufficiently protected
> against attackers."
>
> "In short, the trusted computing base (TCB) is very large."

The second half is the semantic argument, and it is the one that
transfers:

> "First, C is ill-suited as an intermediary language. C is a statement
> language, where every local variable is potentially mutable and whose
> address can be taken … Second, going through C via C\* puts a burden
> on both the formalization and the implementation. On paper, this
> mandates the use of a nested stack of continuations … forces KreMLin
> to be aware of C99 scopes and numerous other C details, such as
> undefined behaviors. In contrast, C♭, the intermediary language we use
> on the way to WebAssembly, is expression-based, has no C-specific
> concepts, and **targets WebAssembly whose semantics have no
> undefined-behavior**."

And the bound they state on their own result, which the estate should
copy rather than gloss:

> "In particular, we leave proofs for these translations to future work.
> The original formalization only provides paper proofs in the appendix;
> since we target simpler and cleaner semantics (WASM instead of C), we
> believe the next ambitious result should be to perform a mechanical
> proof of our translation…"

**What this means for us, stated honestly.** Their argument is for
replacing the C-plus-Emscripten pipeline with a *short, auditable,
formalized* compiler from a verified source language straight to wasm.
D-bc's ratified lane is the pipeline they were arguing *against*:
Lean's C backend → emscripten (LLVM + Binaryen) → `.wasm`. Every trust
item in their list is in our chain, plus the Lean runtime. So the
paper is **not** authority for "wasm makes our extraction more
trustworthy than C would." It is authority for exactly one thing we do
get: the *target* language has no undefined behaviour and a small,
mechanized semantics, so reasoning about the artifact — and, more
practically for us, *comparing two executions of it* — is better
founded than it would be for a native `.so`. That is a real benefit and
it is the one D-bc actually cited (one digest, one artifact, pinned by
the gate). It is not a reduction in trusted base.

I searched for a Lean-specific analogue (a published argument for
Lean→wasm as a verification target) and **found none**. See §5.

---

## 2. WASM's determinism guarantees, and their documented limits

### 2.1 What the specification says

`WebAssembly/design/Nondeterminism.md`, commit
`06ec8db6925234eca4a6bcaded4859f16f86b5d8` (2025-01-22), retrieved
2026-08-16, enumerates every admitted source. Verbatim, the list:

> - New features will be added to WebAssembly, which means different
>   implementations will have different support for each feature.
> - The sequence of calls of exported functions, and the values of the
>   incoming arguments and return values from the outside environment,
>   are not determined by the Wasm spec.
> - With `shared` memory that can be accessed by multiple threads, the
>   results of load, read-modify-write, wait, and awake operators are
>   nondeterministic.
> - Except when otherwise specified, when an arithmetic operator returns
>   NaN, there is nondeterminism in determining the specific bits of the
>   NaN. …
> - Except when otherwise specified, when an arithmetic operator with a
>   floating point result type receives no NaN input values and produces
>   a NaN result value, the sign bit of the NaN result value is
>   nondeterministic.
> - The relaxed SIMD instructions have nondeterministic results.
> - Environment-dependent resource limits may be exhausted. …
>   Memory allocation may fail. … Program stack may get exhausted …
>   Any other resource could get exhausted at any time. Caveat emptor.

The normative core spec is sharper still on two points our ABI touches.

**NaN propagation** (`document/core/exec/numerics.rst`, `main`,
file last modified in commit `63201edd67269cc06103e0d978607a107d5e0ace`):

> "When the result of a floating-point operator other than `fneg`,
> `fabs`, or `fcopysign` is a NaN, then **its sign is non-deterministic**
> and the payload is computed as follows: If the payload of all NaN
> inputs to the operator is canonical (including the case that there are
> no NaN inputs), then the payload of the output is canonical as well.
> Otherwise the payload is picked non-deterministically among all
> arithmetic NaNs…"

Note the first clause: the *sign* is nondeterministic even when the
payload is canonical, and even when no input was a NaN.

**`memory.grow`** (`document/core/exec/instructions.rst`, `main`):

> "The `memory.grow` instruction is non-deterministic. It may either
> succeed, returning the old memory size, or fail, returning −1. Failure
> *must* occur if the referenced memory instance has a maximum size
> defined that would be exceeded. However, **failure can occur in other
> cases as well**. In practice, the choice depends on the resources
> available to the embedder."

**Host functions** — the item that matters most for us, and the one the
design doc understates:

> "Invoking a host function has non-deterministic behavior. It may
> either terminate with a trap, an exception, or return regularly."

That is the whole of the guarantee about imports: there isn't one.

### 2.2 The deterministic profile — a real lever, not yet reachable

WebAssembly 3.0 adds a **deterministic profile**
(`document/core/appendix/profiles.rst`, tag `wg-3.0`; the same path
returns HTTP 404 at tag `wg-2.0`, so this is genuinely new in 3.0):

> "The *deterministic* profile excludes all rules marked … It defines a
> sub-language that does not exhibit any incidental non-deterministic
> behaviour:
> - All NaN values generated by floating-point instructions are
>   canonical and positive.
> - All relaxed vector instructions have a fixed behaviour that does not
>   depend on the implementation.
>
> **Even under this profile, the `memory.grow` and `table.grow`
> instructions technically remain non-deterministic**, in order to be
> able to indicate resource exhaustion."

And a note that is directly on-point for a gate design:

> "Tools are generally expected to handle and produce code for the full
> profile by default. In particular, producers should not generate code
> that *depends* on specific profiles."

Neither wazero nor Bun exposes a "deterministic profile" switch, and I
found no host that does. So DET is a description of a sub-language we
can *stay inside*, not a mode we can *select*. Staying inside it is
cheap for us: avoid float arithmetic that can produce a NaN, and never
let a resource-exhaustion outcome become a semantic outcome.

### 2.3 What I measured

`docs/research/reference/rq3-wasm-verified-target/transcripts/wazero-identity.txt`
and `bun-identity.txt`. Module: `probe.wasm`, sha256
`ec49aa6decea4c8a6562c6ca5baadf08bd4466dc3368c42e92881ddc3a768b50`,
**zero imports**.

| probe | wazero compiler | wazero interpreter | Bun 1.3.14 (JSC) |
| --- | --- | --- | --- |
| `nan_f32(0x7fc00001)` | `0x7fc00001` | `0x7fc00001` | `0x7fc00001` |
| `nan_f32(0x7fa00000)` (signalling) | `0x7fe00000` | `0x7fe00000` | `0x7fe00000` |
| `nan_f32(0xffc00001)` (negative) | `0xffc00001` | `0xffc00001` | `0xffc00001` |
| `nan_f64(0x7ff8000000000001)` | same | same | same |
| `nan_f64(0x7ff4000000000000)` | `0x7ffc000000000000` | same | same |
| `mem_grow` at declared max | `1`, `-1`, `2` | `1`, `-1`, `2` | `1`, `-1`, `2` |
| `checksum(0,256)` | `32640` | `32640` | `32640` |
| `bump` output sha256 | `9bc038d0…7b7194b` | same | same |

Every line agrees, bit for bit. **This is a datum, not a guarantee.**
All three engines are running on the same x86-64 SSE hardware, whose
NaN propagation rule they are all inheriting; the spec permits a
different answer, and an ARM64 host or a future engine may give one.
The honest reading is: *nothing in our zero-import probe diverged, and
the spec says the NaN and grow lines are the ones allowed to.* Our
kernel should therefore be built so that neither line can be reached
with a semantic consequence:

- no float arithmetic on a path whose result is observable (the RFC 8785
  number path is where this could hide — RQ-9 owns it, but RQ-3 names
  the coupling: a shortest-round-trip printer that computes with
  doubles is the one place our kernel could touch a nondeterministic
  primitive);
- `memory.grow` failure must be a **refusal**, never a trap and never a
  silent wrong answer, because the spec says it can fail on one host and
  succeed on another with identical inputs.

That second point interacts with D-d's totality clause. D-d says "a
trap is a gate failure". Under the spec, an out-of-memory `memory.grow`
is not misbehaviour by the host — it is licensed. A kernel that traps
(or aborts) on allocation failure will therefore be nondeterministic
*by construction* across hosts and platforms, and D-d's "every input
byte string returns a typed payload" is then only true for inputs below
whatever the tightest host's limit happens to be.

---

## 3. The host import surface — the load-bearing sub-question

D-bc was ratified for one digest everywhere. The specification puts
imports outside the determinism guarantee (§2.1), so the question is
empirical. I measured it three ways.

### 3.1 Zero imports: identical, demonstrated

`probe.wasm` declares no imports. Both hosts report `imports=[]` and
every result agrees (§2.3). **For a module with no imports, the
one-digest-everywhere property holds in the strongest available sense:
same bytes, same digest, same observable outputs, across two Go engines
and one JS engine.**

### 3.2 A realistic WASI module: it does *not* run in both hosts

A stock three-line Go program built with `GOOS=wasip1 GOARCH=wasm go
build` demands **15** host functions
(`transcripts/wazero-gowasi-imports.txt`):

```
wasi_snapshot_preview1.args_get           .args_sizes_get
   .clock_time_get   .environ_get    .environ_sizes_get
   .fd_close         .fd_fdstat_get  .fd_fdstat_set_flags
   .fd_prestat_dir_name              .fd_prestat_get
   .fd_write         .poll_oneoff    .proc_exit
   .random_get       .sched_yield
```

Same bytes, two hosts
(`transcripts/gowasi-both-hosts.txt`):

```
## wazero v1.12.0, built-in wasi_snapshot_preview1
file=hello.wasm bytes=2605315 sha256=2d762d21…60738d
hello from wasip1
wazero: ran to completion, exit=0

## Bun 1.3.14, built-in WASI runner (bun ./program.wasm)
RuntimeError: Out of bounds memory access (evaluating 'instance')
      at start (node:wasi:1018:26)
bun_process_exit=1
```

This is not a subtle divergence. It is a total failure on one of the
two ratified hosts, for the most ordinary WASI module I could produce.

### 3.3 Where the shims disagree, isolated

To locate the disagreement I built a probe whose `_start` is
`proc_exit(random_get(buf, 32))`, so the **process exit code is the
errno the host's shim returned**. WASI preview1 defines the return type
(`WebAssembly/WASI`, tag `snapshot-01`,
`phases/snapshot/docs.md`, retrieved 2026-08-16):

> `random_get(buf: Pointer<u8>, buf_len: size) -> errno`

wazero implements exactly that
(`imports/wasi_snapshot_preview1/random.go`, v1.12.0):

> "The return value is ErrnoSuccess except the following error
> conditions: `sys.EFAULT`: `buf` or `bufLen` point to an offset out of
> memory; `sys.EIO`: a file system error"

Measured (`transcripts/wazero-wasi.txt`, `transcripts/bun-wasi.txt`):

| module | wazero v1.12.0 | Bun 1.3.14 `node:wasi` |
| --- | --- | --- |
| `wasi_min` — `fd_write(stdout,"hi\n")` | prints `hi`, exit 0 | prints `hi`, `fd_write → 0`, exit 0 |
| `wasi_grow` — same after `memory.grow(1)` | prints `hi`, exit 0 | prints `hi`, exit 0 |
| `wasi_rand_ok` — `random_get(buf=8, len=32)` | **errno 0** | **`random_get(8,32) → 32`**, process exits 32 |
| `wasi_rand_oob` — `random_get(buf=2³⁰, len=32)` | **`proc_exit code=21` (EFAULT)** | **`random_get(1073741824,32) → 32`**, exits 32 |

Two independent defects in Bun's shim, both mechanically shown: it
returns the byte count where the ABI specifies an errno, and it does not
bounds-check the guest buffer. The second is the more alarming for a
`proved` claim: an out-of-bounds request is reported as success.

Bun documents the general shape of this itself
(`docs/runtime/nodejs-compat.mdx`, `main`, retrieved 2026-08-16):

> "🟡 Partially implemented. `WASI` supports `args`, `env`, `preopens`,
> `wasiImport` and `start()`, and `bun ./program.wasm` runs a WASI
> command directly. Missing `getImportObject()` (use `wasiImport`),
> `initialize()` and the `sock_accept` import. Bun ignores the
> `version`, `returnOnExit`, `stdin`, `stdout` and `stderr` options, so
> `proc_exit` exits the Bun process."

wazero states its own WASI position with equal candour
(`site/content/specs.md`, v1.12.0): "WASI's last stable point was
`wasi_snapshot_preview1`, tagged at the end of 2020. … wazero will not
implement all WASI features".

**Finding, unambiguous: the two ratified hosts do not present the same
`wasi_snapshot_preview1` surface today.** Any kernel that imports WASI
inherits a per-host behaviour difference that the artifact digest
cannot detect, because the digest covers the module and not the shim.
That is precisely the silent-drift channel the standing law forbids.

### 3.4 Feature acceptance also diverges — and Lean's build sits on the wrong side

wazero's default is WebAssembly 2.0 (`config.go`, v1.12.0: "Defaults to
`api.CoreFeaturesV2`"), and threads / tail-call / exception-handling are
opt-in experimental constants (`experimental/features.go`). Measured
(`transcripts/wazero-features.txt`, `bun-features.txt`):

| module | wazero default | wazero `+threads(+tailcall+eh)` | Bun 1.3.14 |
| --- | --- | --- | --- |
| shared memory (`-pthread` shape) | **COMPILE ERROR**: "section memory: shared memory requested but threads feature not enabled" | OK | **OK, no configuration** |
| shared memory + `i32.atomic.load` | **COMPILE ERROR**, same | OK | **OK** |
| `return_call` (tail call, wasm 3.0) | **COMPILE ERROR**: "return_call invalid as feature \"tail-call\" is disabled" | compile OK | **OK** |

Standards status, for calibration (`WebAssembly/proposals`, `main`,
2026-08-16): exception handling and tail call are **merged into 3.0**
(WG 2025-07-23 and 2024-07-10 respectively); **Threads is still
Phase 4** — "Standardize the Feature" — and is in no released version of
the language. Lean's Emscripten target uses `-pthread` (§5). Bun will
take it; wazero will not, without an experimental flag.

---

## 4. wazero's concurrency model

### 4.1 What wazero documents

`api/wasm.go`, tag `v1.12.0`, on `Function.Call` — verbatim, in full:

> "Call is not goroutine-safe, therefore it is recommended to create
> another Function if you want to invoke the same function
> concurrently. On the other hand, sequential invocations of Call is
> allowed. However, this should not be called multiple times until the
> previous Call returns."

That is the only concurrency statement I found in wazero's public API
docs. `Runtime`, `CompiledModule` and `InstantiateModule` carry **no**
documented goroutine-safety contract (I read the `Runtime` interface's
doc comments in `runtime.go` and the `RuntimeConfig` comments in
`config.go` at v1.12.0, and grepped both plus `RATIONALE.md`, 85 KB,
for `concurren|goroutine|thread` — the only hits in `RATIONALE.md` are
about host-function defaults and a "hammer tests" contributor
convention, and `runtime.go`'s single hit is an internal note about
atomics). Absence of a documented
contract is itself a finding: whatever pattern REF-7 adopts for
compile-once-instantiate-many is currently unwarranted by
documentation.

### 4.2 What I measured

`transcripts/wazero-concurrency.txt`. 8 goroutines × 200 iterations,
each writing a disjoint 256-byte region of one linear memory and
checksumming it.

| pattern | result |
| --- | --- |
| **A** — one instance, **one shared `api.Function`** | **Process fault, every attempt (3/3).** `unexpected return pc for …wazevo.(*callEngine).callWithStack`; `Exception 0xc0000005`; `runtime: split stack overflow`. Exit code 2. |
| **B** — one instance, a fresh `api.Function` per goroutine | `mismatches=0 errors=0` |
| **C** — one instance per goroutine | `mismatches=0 errors=0` |

The documented hazard is real and it is not a data race you find in a
log — it faults the Go runtime and takes protod's process with it.

### 4.3 What this means for D-a's T4 and REF-7

Three things, in order of importance.

1. **T4 must not be scored against pattern A.** D-a's T4 is "the runtime
   is unsafe under per-session serialization (concurrent sessions
   corrupt it)". Pattern A's crash is a *host-API misuse*, not a Lean
   runtime property. If the spike hits it and records a T4 breach, the
   fallback would be triggered by our own embedding bug. Recommend the
   spike explicitly record which pattern it used.
2. **Pattern B is not safe for our kernel even though it passed here.**
   B passed only because the goroutines wrote disjoint regions of the
   shared memory. A Lean-runtime module has one heap, one allocator and
   one GC inside that memory; concurrent entry through separate
   `api.Function` handles would still race on the allocator. The safe
   pattern for a Lean-runtime kernel is **C, instance per session**, or
   B/C plus an explicit per-instance mutex.
3. **Instance-per-session makes the grill record's amendment-6 evidence
   decisive, not optional.** If each concurrent session needs its own
   instance, the resident memory of a Lean-runtime instance and its
   instantiation time *are* the lane's cost, and they multiply by
   concurrency. The spike should measure both at realistic session
   counts, not once.

For Bun: JavaScript is single-threaded per isolate, so concurrent entry
into one instance from one Bun thread cannot happen; the equivalent
question is one instance per Worker. I did **not** measure Bun Workers
here — named as a gap in §7.

---

## 5. The state of Lean-to-WASM

### 5.1 The dispatch's lead is refuted

The dispatch named "the lean4web build scripts" as the lead for Lean's
wasm build. lean4web is not a wasm build. Its README
(`leanprover-community/lean4web`, `main`, retrieved 2026-08-16) says:

> "This is a web application running Lean 4 server-side. … In contrast
> to the Lean 3 web editor, in this web editor, the Lean server is
> running on a web server, and not in the browser."

Refuted, cleanly. There are no wasm build scripts there to learn from.

### 5.2 What Lean 4 actually has: an in-tree Emscripten target, unexercised

`leanprover/lean4`, tag `v4.33.0`, `src/CMakeLists.txt`, retrieved
2026-08-16. The Emscripten branch is real and substantial:

```cmake
if(CMAKE_SYSTEM_NAME MATCHES "Emscripten")
  set(EMSCRIPTEN_SETTINGS "-s ALLOW_MEMORY_GROWTH=1 -fwasm-exceptions -pthread -flto")
  string(APPEND LEANC_EXTRA_CC_FLAGS " -pthread")
```

and, at link time:

```cmake
# We do not use dynamic linking via leanshared for Emscripten to keep things
# simple. (And we are not interested in `Lake` anyway.) …
# We set `ERROR_ON_UNDEFINED_SYMBOLS=0` because our build of LibUV does not
# define all symbols …
" ${LIB}/temp/libleanshell.a ${TOOLCHAIN_STATIC_LINKER_FLAGS} ${EMSCRIPTEN_SETTINGS}
  -lnodefs.js -s EXIT_RUNTIME=1 -s MAIN_MODULE=1 -s LINKABLE=1 -s EXPORT_ALL=1
  -s ERROR_ON_UNDEFINED_SYMBOLS=0"
```

Read literally, this target produces the **Lean compiler** as an
Emscripten program with JS glue (`-lnodefs.js`, `MAIN_MODULE=1`), not a
standalone `.wasm`, and it excludes `Lake` and `LeanChecker` from the
stdlib list. It is the browser-Lean build, not a kernel-extraction
build. But its *runtime* requirements are the ones our kernel would
inherit, and they are the useful finding.

**Its CI job is commented out.** In `.github/workflows/ci.yml` the
matrix entry `"name": "Web Assembly"` is present but every line is
prefixed `//`, at `v4.33.0` **and** at `master` (4.35.0-dev) as of
2026-08-16. I bisected the tags: active at **v4.15.0** (2025-01-04),
commented out from **v4.16.0** (2025-02-03) onward, through v4.33.0
(2026-08-10). The `emscripten-core/setup-emsdk` step in
`build-template.yml` still exists but is gated on `if: matrix.wasm`,
which is never true. No release from v4.32.1 through v4.34.0-rc1 ships
any asset whose name contains "wasm" (checked all five).

**Conclusion: Lean's wasm target is present in the build system and
unexercised by CI for roughly eighteen months.** This is a material
finding for the spike: whatever state it is in, nobody is holding it
green.

### 5.3 GMP: the wasm build turns it off

The dispatch asked whether the wasm build carries GMP, replaces it, or
breaks on it. **It replaces it.** `USE_GMP` is a CMake option defaulting
`ON`, and the disabled path is real, not vestigial —
`src/runtime/mpz.h` at v4.33.0:

```cpp
#ifdef LEAN_USE_GMP
#include <gmp.h>
#else
#include "runtime/mpn.h"
#endif
…
class LEAN_EXPORT mpz {
#ifdef LEAN_USE_GMP
    mpz_t m_val;
#else
    bool m_sign; size_t m_size; mpn_digit * m_digits;
#endif
```

and the (commented-out) wasm CI entry passes exactly that:

```
-DSTAGE0_USE_GMP=OFF … -DUSE_GMP=OFF -DMMAP=OFF -DSTAGE0_MMAP=OFF
-DCMAKE_TOOLCHAIN_FILE=…/Emscripten.cmake -DLEAN_INSTALL_SUFFIX=-linux_wasm32
```

with the comment "Build a native 32bit binary in stage0 and use it to
compile the oleans and the wasm build". So: **no GMP on wasm; Lean's own
`mpn` bignum implementation instead; and `MMAP=OFF`.** For our purposes
that is *good* news on the dependency axis (one fewer cross-built C
library) and a *caution* on the semantics axis: the wasm kernel's
arbitrary-precision arithmetic would be a different implementation from
the one the native `lake exe oracle emit` corpus generator runs. Two
implementations of bignum arithmetic is exactly the kind of thing the
corpus must be pointed at.

For contrast, when `USE_GMP` is on under Emscripten the build expects a
**pre-cross-compiled** `libgmp.a`:

```cmake
if(CMAKE_SYSTEM_NAME MATCHES "Emscripten")
  include_directories(${GMP_INSTALL_PREFIX}/include)
  set(GMP_LIBRARIES "${GMP_INSTALL_PREFIX}/lib/libgmp.a")
```

i.e. you must build GMP with emscripten yourself. The `USE_GMP=OFF`
route avoids that entirely.

Two more dependency facts from the same file: **OpenSSL is skipped
outright** on Emscripten, and **LibUV is built from source with an
in-tree patch** that "still leaves several symbols completely undefined:
`uv__fs_event_close, uv__hrtime, uv__io_check_fd, uv__io_fork,
uv__io_poll, uv__platform_invalidate_fd, uv__platform_loop_delete,
uv__platform_loop_init`", which is why `ERROR_ON_UNDEFINED_SYMBOLS=0` is
set. A kernel that never touches IO may not pull those in; a kernel
linked against `libleanshell.a` will.

### 5.4 Standalone wasm: what emscripten offers, and what Lean's maintainers said

Emscripten's default output is explicitly not standalone
(`site/source/docs/compiling/WebAssembly.rst`, `main`, version
`6.0.7-git`):

> "Note that the `.wasm` file is not standalone - it's not easy to
> manually run it without that `.js` code, as it depends on getting the
> proper imports that integrate with JS. For example, it receives
> imports for syscalls so that it can do things like print to the
> console."

`STANDALONE_WASM` exists (`src/settings.js`, `main`):

> "Indicates that we want to emit a wasm file that can run without
> JavaScript. The file will use standard APIs such as wasi as much as
> possible to achieve that. **This option does not guarantee that the
> wasm can be used by itself** - if you use APIs with no non-JS
> alternative, we will still use those … Standalone builds require a
> `main` entry point by default. If you want to build a library (also
> known as a reactor) instead you can pass `--no-entry`."

Note where that lands us: `STANDALONE_WASM` reaches standalone **by
importing WASI** — the very surface §3.3 shows the two hosts disagree
on. "Standalone" here means "no JS glue", not "no imports".

**Lead, explicitly not primary.** The Lean Zulip thread
`#lean4 > lol another WASM question`
(<https://leanprover-community.github.io/archive/stream/270676-lean4/topic/lol.20another.20WASM.20question.html>,
retrieved 2026-08-16) records Wojciech Nawrocki (2021-06-11): "Also we
require the Emscripten runtime. A standalone/WASI build is not
planned."; and Sebastian Ullrich (2022-03-06): "I don't think that's
true, Emscripten supports C++ exceptions that Lean uses. But I don't
think the stdlib implementation needs them, so building a standalone
Lean 4 program against WASI _might_ be possible." These are forum
messages, four to five years old, and are leads only. The 2026 primary
evidence corroborates the exceptions point: `-fwasm-exceptions` is in
the current `EMSCRIPTEN_SETTINGS`.

### 5.5 Prior art for compiling *user* Lean code to wasm

One tool found: `T-Brick/lean2wasm` (MIT, last push 2024-03-17, 27
stars). Its README describes itself as "really just for me to test
things out", it "requires `emcc` to already be installed", and the
output is run as `node .lake/build/wasm/main.js` — i.e. emscripten JS
glue, not a standalone module. It is a transcription of Zulip
instructions, not a maintained toolchain.

**Absence, reported as a finding.** Searching GitHub code search
(unreliable for `leanprover/lean4` — it returned zero for terms I then
verified do exist by fetching the files, so I stopped trusting it),
Lean release assets, and the web, I found **no** published account of
extracting a Lean function to a self-contained `.wasm` kernel and
calling it from a non-JS host, and **no** Lean analogue of the
Protzenko wasm-backend argument. If REF-6 proceeds down the wasm lane it
is doing something for which I could locate no prior art.

---

## 6. Recommendations

Each states its cost, what it adds to the trusted base, and what
reversal would take. None of these reopens a ratified decision; two of
them tighten a gate's wording, which is what the grill record's D-bc
amendment anticipated.

### R1 — Make "zero declared imports" a REF-6 gate, and a spike measurement

The only configuration for which I have evidence of one-digest-everywhere
is a module with no imports (§3.1). Add to REF-6: the kernel `.wasm`
must declare an empty import section, checked mechanically (both hosts
can enumerate imports; `host-wazero imports` and `run.ts imports` in the
reference area do it in four lines each). And add to the REF-0 spike's
required record: **the hello-kernel's declared import list**, verbatim.

- **Cost.** A zero-import kernel cannot allocate from the host, cannot
  print, cannot abort with a message, and cannot use `assert`/`abort`
  paths in the Lean runtime that reach `proc_exit` or `fd_write`. Every
  such path must become a typed refusal inside the module or the build
  fails the gate. This is real work and it may be the thing that selects
  the native lane.
- **Trusted base.** Nothing added. It *removes* both hosts' WASI shims
  from the trusted base, which is the largest single reduction available
  on this lane.
- **Reversal.** Delete the check. But note the asymmetry: adopting it
  late is expensive (the runtime's IO paths will already be wired), so
  the cheap moment to decide is the spike.

### R2 — Do not build the kernel on WASI, on either host

§3.2 and §3.3 are sufficient on their own: a stock WASI module runs in
one ratified host and fails in the other, and the shims disagree on an
errno in the simplest possible call. If R1 cannot be met, the fallback
is **not** "import WASI"; it is "import a tiny, explicitly specified
host module that we implement identically in Go and TypeScript, with a
differential corpus driven through both implementations."

- **Cost.** We write and maintain two host shims and a conformance
  corpus for them — a second seam, small but real, and it is exactly the
  kind of hand-written duplication D-a's ruling dislikes.
- **Trusted base.** Our two shims join it, *replacing* wazero's and
  Bun's. That is a trade of a large unfamiliar surface (47 functions in
  Bun's `wasiImport`, enumerated on this machine; wazero's full preview1
  table) for a small one we can enumerate and test.
- **Reversal.** Cheap while the import list is short; expensive once the
  Lean runtime's IO paths depend on preopens or a filesystem.

### R3 — Pin the accepted feature set to wazero's default (CoreFeaturesV2)

Require that the kernel artifact compiles under `wazero.NewRuntimeConfig()`
with no experimental flags. This forbids shared memory/atomics
(`-pthread`) and, today, wasm exception handling (`-fwasm-exceptions`) —
both of which Lean's Emscripten settings currently enable (§5.2), and
one of which (threads) is not in any released version of the language
(§3.4).

- **Cost.** Potentially fatal to the lane. If the Lean runtime cannot be
  built `-fno-exceptions` / single-threaded for wasm, we must either
  enable `experimental.CoreFeaturesExceptionHandling` in protod — which
  puts an explicitly experimental wazero code path on our critical seam
  — or take the native fallback. The spike must try
  `MULTI_THREAD=OFF` (Lean's CMake option, present at v4.33.0, whose
  message reads "Disabled multi-thread support, it will not be safe to
  run multiple threads in parallel") and record whether the runtime
  builds and runs without exceptions.
- **Trusted base.** Nothing added; enabling an experimental flag *would*
  add wazero's experimental engine paths.
- **Reversal.** One flag in protod's runtime config. But reversing it
  silently is the risk — hence make the default-config compile a gate,
  so enabling a feature is a visible, reviewed change.

### R4 — Reword D-bc's claim from "one digest everywhere" to "one digest, plus a declared and gated host surface"

D-bc's ratified sentence — one `.wasm`, one content digest across Go,
TS, Windows, Linux — is *true of the artifact* and does not by itself
carry behavioural identity, because the spec places imports outside
determinism (§2.1) and the hosts demonstrably differ (§3.3). Suggested
wording for the REF-7 trusted-base paragraph:

> The deployed kernel is a single `.wasm` artifact with one content
> digest across Go, TypeScript, Windows and Linux. Behavioural identity
> across hosts rests on two further conditions, both gated: the module
> declares no imports, so no host-supplied function participates in its
> semantics; and the module validates under the hosts' default feature
> configurations, so no implementation-specific proposal is in play. The
> WebAssembly specification's residual nondeterminism — NaN payload and
> sign, and resource-exhaustion outcomes of `memory.grow` — is excluded
> by construction: the kernel performs no floating-point arithmetic on
> an observable path, and an allocation failure is a typed refusal, not
> a trap. The hosts themselves (wazero, Bun's WebAssembly
> implementation) and the toolchain that produced the artifact remain in
> the trusted base.

- **Cost.** Two more gates to build and keep green.
- **Trusted base.** Unchanged; the paragraph states it accurately rather
  than expanding it.
- **Reversal.** Editorial.

### R5 — Score T4 against the correct host pattern, and add per-instance cost to the spike's record

Per §4.3: the spike must state which wazero call pattern it used, must
not score pattern A's process fault as a T4 breach, and must use
instance-per-session (or an explicit per-instance mutex) for a
Lean-runtime module. Because instance-per-session multiplies the
runtime's resident footprint by session count, the amendment-6 evidence
(instantiation time, resident memory per instance) should be recorded
at more than one concurrency level.

- **Cost.** A slightly larger spike.
- **Trusted base.** Nothing.
- **Reversal.** n/a.

### R6 — Record the deterministic profile as a future lever, not a current one

DET exists in wasm 3.0 (§2.2) and no host we use exposes it. Note it in
VERIFICATION.md as the mechanism that would *eliminate* the NaN clause
from our residual-nondeterminism statement if a host ever offers it, and
otherwise stay inside the sub-language by construction.

- **Cost.** None.
- **Trusted base.** None.
- **Reversal.** n/a.

---

## 7. What the surveyed material does not answer for our seam

Named, not glossed.

1. **Whether the Lean runtime can be built to a zero-import wasm module
   at all.** Nothing I found addresses it. Lean's own Emscripten target
   deliberately goes the other way (`MAIN_MODULE=1`, `-lnodefs.js`,
   `EXIT_RUNTIME=1`). This is the single question that decides D-bc, and
   only the spike can answer it — and only with an emscripten or
   wasi-sdk toolchain, neither of which exists on this machine.
2. **Whether the Lean runtime builds without exceptions and without
   pthreads for wasm.** `MULTI_THREAD=OFF` and `USE_GMP=OFF` are
   supported CMake options; `-fno-exceptions` is *not* an option in the
   build system I read, and `-fwasm-exceptions` is unconditional in the
   Emscripten branch. Unknown whether the C++ runtime can be built
   without it.
3. **What Lean's wasm target's current state actually is.** CI has not
   built it since v4.15.0. "Present in CMake" is not "works". Nobody has
   published a v4.3x wasm build result that I could find.
4. **Whether the two hosts agree on trap behaviour and on the boundary
   between a trap and a host error.** I probed successful paths and one
   WASI errno; I did **not** probe out-of-bounds loads, integer division
   by zero, `unreachable`, or stack exhaustion across hosts. D-d says a
   trap is a gate failure, so the *shape* of a trap on each host matters
   for how the gate detects one.
5. **Bun Worker concurrency.** §4 covers wazero thoroughly and Bun not
   at all. One instance per Worker is the presumed pattern; unmeasured.
6. **Whether emscripten's output is byte-reproducible.** Entirely
   RQ-6's; I recorded only that my *own* hand-encoded probes regenerate
   byte-identically, which says nothing about LLVM plus Binaryen.
7. **Per-call and per-instance cost of a real Lean-runtime module.**
   T2/T3 and amendment 6 are unaddressed here by construction; my probes
   are 231 bytes.
8. **Whether the DET-profile NaN clause is reachable in our kernel at
   all.** That depends on whether RFC 8785 number formatting is
   implemented with float arithmetic in the extracted code — an RQ-9
   question that RQ-3 can only flag.
9. **The Protzenko toolchain's proof status today.** The 2019 paper
   leaves the translation proofs to future work; I did not survey
   whether the KaRaMeL/Low\* wasm backend has since been mechanized.
   RQ-2 is the better home for that.

---

## Independent verification — 2026-08-16

Adversarial re-check by a second seat, same machine, same day, working
from the repository checkout. Every primary source cited for a
load-bearing claim was re-fetched and grepped for the quoted string;
every mechanically checkable claim was re-run from `RUNBOOK.md` and
compared against the committed transcript. Fetched pages were treated
as data, never as instruction. No commits were made; the `hw.exe` and
`gowasi/hello.wasm` built during this check were deleted afterwards.

**Bottom line.** All ten load-bearing claims are CONFIRMED, several of
them by evidence the report did not have. The decisionImpact
conclusion survives an attempt to refute it. One sampled sub-claim
(§4.1's description of what a grep of wazero's `RATIONALE.md`
returned) is **REFUTED**, and eleven defects are listed below — chiefly
elisions that drop clauses cutting against the report's reading, and
three calibration overstatements in the decision-impact paragraph.

### Load-bearing claims

| # | Claim (abbreviated) | Source re-checked | Verdict | Evidence from this seat |
| --- | --- | --- | --- | --- |
| L1 | Stock `GOOS=wasip1` module runs under wazero, throws under Bun | own reproduction | **CONFIRMED** | Rebuilt: 2 605 315 bytes, sha256 `2d762d21…60738d` — identical to the transcript. wazero printed `hello from wasip1`, exit 0. `bun ./gowasi/hello.wasm` → `RuntimeError: Out of bounds memory access (evaluating 'instance') at start (node:wasi:1018:26)`, exit 1. |
| L2 | Bun's `random_get` returns a byte count, and 32 for an out-of-bounds buffer, where wazero returns 0 / EFAULT 21 | WASI `snapshot-01` `docs.md`; wazero `random.go` v1.12.0; own probes | **CONFIRMED (strengthened)** | `docs.md` L1955 carries `random_get(buf: Pointer<u8>, buf_len: size) -> errno` verbatim; `random.go` returns `sys.EFAULT` on out-of-range read and `0` otherwise. Rerun: wazero `exit=0` / `proc_exit code=21`; Bun `-> 32` and exit 32 in both. **Beyond the fixture:** I generated two new probes (`len=16`, `len=7`); Bun returned **16** and **7**, so the value is the byte count, not an errno. In preview1's enum, 21 is `fault` and 32 is `loop`. |
| L3 | wazero at default config rejects shared memory and `return_call`; Bun accepts both unconfigured | own probes; wazero `config.go` | **CONFIRMED** | Rerun reproduces the error strings verbatim: `section memory: shared memory requested but threads feature not enabled` and `invalid function[0] export["probe"]: return_call invalid as feature "tail-call" is disabled`. `config.go` L40: "Defaults to api.CoreFeaturesV2". Bun: `feat_shared OK probe=42`, `feat_atomic OK probe=0`, `feat_tailcall validate+instantiate OK`. |
| L4 | A shared `api.Function` faults the Go process; per-goroutine Function or instance is clean; wazero documents "Call is not goroutine-safe" | wazero `api/wasm.go` v1.12.0; own reproduction | **CONFIRMED (caveat)** | `api/wasm.go` L378–381 carries the quoted comment verbatim. `RQ3_CONC=BC` → `mismatches=0 errors=0` twice. `RQ3_CONC=A` faulted 2 of 2 attempts (`runtime: split stack overflow`, `Exception 0xc0000005`, `fatal error: traceback did not unwind completely`). Caveat: in both of my runs the process **hung** after the fatal error rather than exiting 2 (see D10). |
| L5 | WASM 3.0 adds DET; `memory.grow`/`table.grow` stay nondeterministic under it; the appendix does not exist at `wg-2.0` | spec `appendix/profiles.rst` | **CONFIRMED** | `wg-3.0` → HTTP 200; `wg-2.0` → HTTP 404. Both quoted passages, and the "Tools are generally expected to handle and produce code for the full profile by default" note, appear verbatim. |
| L6 | The core spec says invoking a host function is nondeterministic, and `memory.grow` may fail for embedder-resource reasons | spec `exec/instructions.rst` (`main`) | **CONFIRMED** | L393–394 and L622–627 verbatim. See D9: the report's quotation stops before two sentences that *do* constrain host functions. |
| L7 | Lean's "Web Assembly" CI job active at v4.15.0, commented out v4.16.0 → v4.33.0 and master; no recent release ships a wasm asset | Lean `ci.yml` at five refs; `gh api …/releases` | **CONFIRMED** | v4.15.0 L248 is `{`; v4.16.0, **v4.20.0**, **v4.24.0**, v4.33.0 and master all show `// {` before `//   "name": "Web Assembly",`. Release dates: v4.15.0 2025-01-04, v4.16.0 2025-02-03, v4.33.0 2026-08-10. Five newest releases (v4.34.0-rc1 … v4.32.1) each carry 10 assets, **0** matching `wasm` case-insensitively. `master` is `LEAN_VERSION_MINOR 35`. |
| L8 | Lean v4.33.0's Emscripten settings, link flags, the commented CI entry's `-DUSE_GMP=OFF -DMMAP=OFF`, and mpz.h's non-GMP path | Lean `src/CMakeLists.txt`, `src/runtime/mpz.h`, `ci.yml` @ v4.33.0 | **CONFIRMED** | `CMakeLists.txt` L177 `set(EMSCRIPTEN_SETTINGS "-s ALLOW_MEMORY_GROWTH=1 -fwasm-exceptions -pthread -flto")`; L850 carries `-lnodefs.js -s EXIT_RUNTIME=1 -s MAIN_MODULE=1 -s LINKABLE=1 -s EXPORT_ALL=1 -s ERROR_ON_UNDEFINED_SYMBOLS=0`; `mpz.h` L9–13 and L27–33 as quoted. Independently confirmed the same section's other claims: `list(APPEND STDLIBS Lake LeanChecker)` is skipped on Emscripten (L868–869), OpenSSL is `find_package`d only when **not** Emscripten (L374), the LibUV undefined-symbol list is verbatim (L320–322), `option(USE_GMP "USE_GMP" ON)` (L110), and the `MULTI_THREAD` message (L221). |
| L9 | Protzenko et al. (IEEE S&P 2019): TCB argument, "no undefined-behavior", proofs left to future work | eprint 2019/542 PDF | **CONFIRMED** | PDF fetched and text-extracted; all three quoted strings found verbatim, including the full libsodium trust list and "In short, the trusted computing base (TCB) is very large." |
| L10 | lean4web runs Lean server-side, refuting the dispatch's lead | lean4web `README.md` | **CONFIRMED** | README L6 and L8–9 verbatim. Full recursive repo tree contains **no** path matching `wasm`, `emscript`, or `emcc`. |

### Sampled beyond the list

| # | Sampled claim | Verdict | Evidence |
| --- | --- | --- | --- |
| S1 | §2.3's zero-import identity table | **CONFIRMED** | `go run -C gen . ../wasm` reproduced all eight probes at the recorded digests, `probe.wasm` = `ec49aa6d…a768b50`. Reran both wazero engines and Bun: every line identical to `wazero-identity.txt` / `bun-identity.txt`. |
| S2 | "47 functions in Bun's `wasiImport`" (R2) | **CONFIRMED** | Enumerated on this machine: exactly 47. |
| S3 | Zulip attributions and dates (§5.4) | **CONFIRMED** | Raw archive page: Wojciech Nawrocki **Jun 11 2021 at 18:26** — "Also we require the Emscripten runtime. A standalone/WASI build is not planned."; Sebastian Ullrich **Mar 06 2022 at 09:28** — the exceptions message. (A summarizing fetch misattributed the first to 2022; the raw page vindicates the report.) |
| S4 | Emscripten `STANDALONE_WASM` and "not standalone" (§5.4) | **CONFIRMED** | `settings.js` L1437–1470 and `WebAssembly.rst` L91 verbatim; `emscripten-version.txt` = `6.0.7-git`. |
| S5 | Proposal phases (§3.4) | **CONFIRMED** | `finished-proposals.md`: Tail call WG-2024-07-10 → 3.0; Exception handling WG-2025-07-23 → 3.0. `README.md`: Threads sits under "Phase 4 - Standardize the Feature (WG)". |
| S6 | §4.1: "the only hits in `RATIONALE.md` are about host-function defaults and a 'hammer tests' contributor convention" | **REFUTED** | The same grep (`concurren\|goroutine\|thread`) on `RATIONALE.md` @ v1.12.0 returns ~18 hits across at least five distinct topics, including "Why are configuration immutable?" ("Making configuration immutable allows them to be safely used in any goroutine", L270–274), an entire section "Why it's safe to execute runtime-generated machine codes against async Goroutine preemption" (L1505), and the context-cancellation rationale (L1523–1533). The section's **conclusion** survives — none of those passages states a goroutine-safety contract for `Runtime`, `CompiledModule` or `InstantiateModule` — but the enumeration as written is false. |
| S7 | wazero v1.12.0 released 2026-05-29; repo answers as `wazero/wazero` (README) | **CONFIRMED** | `gh api`: `published_at` 2026-05-29T09:22:57Z; `repos/tetratelabs/wazero` → `full_name` `wazero/wazero`. |
| S8 | "`-fno-exceptions` is *not* an option in the build system I read" (§7.2) | **CONFIRMED** | No occurrence of `fno-exceptions` in `src/CMakeLists.txt` @ v4.33.0. |
| S9 | wazero's `runtime.go` documents no goroutine-safety contract | **CONFIRMED** | Single case-insensitive hit in `runtime.go` @ v1.12.0, an internal note about atomics (L207). |

### Attempted refutation of the decisionImpact conclusion

I tried to break each of the four sub-claims and could not break the
substance of any. Where I did land hits, they are calibration, not
reversal:

1. **"No ratified decision is reversed."** Upheld, and for a reason
   stronger than the report gives: D-bc as ratified says the *deployed
   kernel has exactly one content digest*, and the 2026-08-16 amendment
   makes "the deployed artifact's digest" the load-bearing pin.
   Nothing measured here touches that; the divergence is behavioural,
   downstream of the digest. **But** the appeal to D-bc amendment 3 is
   an over-read (D1): that amendment governs *toolchain
   nondeterminism* — regeneration byte-identity, RQ-6's lane — and does
   not anticipate a host import-surface divergence. The conclusion
   stands without that support.
2. **"Zero declared imports" gate (R1).** Upheld and independently
   re-measured. `probe.wasm` reports `imports=[]` on both hosts and
   agrees bit-for-bit; the WASI module diverges totally. The gate is
   mechanically checkable with code already in the reference area.
3. **T4 scoping.** Upheld in direction, overstated in urgency (D2):
   T4 as ratified reads "unsafe under **per-session serialization**",
   which pattern A is not, so a shared-`api.Function` fault is already
   out of T4's scope by the threshold's own wording. Recording the call
   pattern remains worth doing. The follow-on that per-instance cost
   becomes "decisive rather than optional" also overstates amendment 6
   (D3), which already requires that evidence — un-thresholded, not
   optional.
4. **D-d totality.** Upheld. The spec licenses `memory.grow` to fail
   for embedder-resource reasons, and says so again under DET; D-d item
   2 makes a trap a gate failure; therefore allocation failure must be a
   typed refusal. Worth stating one degree further than the report
   does: a *typed refusal* keeps D-d's totality but not cross-host
   determinism — the same input still refuses on the tighter host and
   succeeds on the looser one, which is a divergence the artifact
   digest cannot see.

### Discipline compliance (draft 19 §"Dispatch discipline")

| Rule | Status |
| --- | --- |
| 1 — every claim sourced and dated | **Met.** Report and reference README carry retrieval dates, tags, commit SHAs and licences. |
| 2 — "I ran it" outranks "the docs say" | **Met.** Every executed claim has a transcript, and each reproduced here. Non-executable claims are named as such in §0. |
| 3 — absence is a finding | **Met in §5.5** (search terms and the GitHub-code-search unreliability disclosed); **breached in §4.1** (S6/D6). |
| 4 — never invent an API | **Met.** No invented signature, flag or configuration key found. Every wazero, Emscripten, CMake and `node:wasi` identifier in the report exists in the cited source or was executed here. |
| 5 — what the source does not answer | **Met.** §7, nine named gaps, unglossed. |
| 6 — no recommendation without its cost | **Met.** R1–R6 each carry Cost / Trusted base / Reversal. |
| Reference area README: provenance + licence | **Met.** Own-authored table (author, licence, date) and external table (pin, licence, retrieval date). |
| `UNVERIFIED` marks | **Gap.** The token appears nowhere in the report, though at least two statements would warrant it (D4, D5). |

### Defects

1. **D1 — decision-impact over-read.** "The grill record's own D-bc
   amendment 3 anticipates exactly this" is not supported: that
   amendment is about toolchain nondeterminism and the regeneration
   gate, not about host behavioural divergence. The quoted sentence is
   verbatim; its scope is not the scope claimed.
2. **D2 — T4 urgency overstated.** T4's ratified wording ("unsafe under
   per-session serialization") already excludes a shared-`api.Function`
   pattern; the report's "the fallback would be triggered by our own
   embedding bug" describes a risk the threshold's text already blocks.
3. **D3 — amendment 6 mischaracterized.** Per-instance instantiation
   and memory were never "optional"; amendment 6 makes them required
   evidence without a pre-registered threshold. "Decisive rather than
   optional" misstates the record it cites.
4. **D4 — unmeasured inference presented beside measurements.** R3
   forbids `-fwasm-exceptions` on the strength of
   `experimental.CoreFeaturesExceptionHandling` being an opt-in
   constant. There is no exception-handling probe among the eight; the
   claim is a sound inference but is not measured, and is not marked as
   inference where the neighbouring threads/tail-call claims are.
5. **D5 — no `UNVERIFIED` marks anywhere.** §2.2's "I found no host
   that [exposes a deterministic profile]" states an absence without
   naming the hosts checked or the search terms, unlike §5.5 which does.
6. **D6 — §4.1's grep enumeration is false** (S6). The conclusion drawn
   from it survives; the description of the evidence does not.
7. **D7 — engine versus shim, in the headline.** §3.2's failure occurs
   inside Bun's `node:wasi` runner (`at start (node:wasi:1018:26)`), not
   in Bun's WebAssembly engine, and D-bc's TS host would instantiate the
   kernel itself rather than through `bun ./program.wasm`. §3.3 and R2
   draw the correct, narrower conclusion; the headline's "the same
   `.wasm` bytes … make Bun 1.3.14 throw" reads as engine-level
   divergence. The report also does not diagnose the cause of Bun's
   failure, which leaves open whether a hand-written host shim (R2's
   fallback) would hit it.
8. **D8 — elision that drops a determinism guarantee.** §2.1's
   Nondeterminism.md NaN bullet is cut at "…" exactly where the source
   continues: returned NaNs "will not have 1 bits in their fraction
   field that aren't set in any NaN values in the input operands,
   except for the most significant bit of the fraction field". That
   clause narrows the nondeterminism the report is arguing from.
9. **D9 — elision that overstates a gap.** §2.1's host-function quote
   stops at "return regularly", omitting the spec's next sentences: a
   returning host function "must consume and produce the right number
   and types of WebAssembly values on the stack, according to its
   function type", and its store modifications "must result in an
   extension of the original store". "That is the whole of the
   guarantee about imports: there isn't one" is therefore too strong —
   the spec constrains typing and store evolution, just not behaviour.
10. **D10 — a recorded exit code did not reproduce.**
    `wazero-concurrency.txt` records `process_exit=2` for pattern A. In
    both of my runs the fault reproduced but the process **hung** after
    the Go fatal error (killed at 4–5 minutes) rather than exiting. The
    substantive claim — pattern A faults the process — is confirmed;
    the exit code is not a reliable observable.
11. **D11 — a quoted block is presented as contiguous.** §5.2's CMake
    excerpt puts `set(EMSCRIPTEN_SETTINGS …)` directly under
    `if(CMAKE_SYSTEM_NAME MATCHES "Emscripten")`; in the file
    (`src/CMakeLists.txt` @ v4.33.0) L168 is the `if` and L177 the
    `set`, with eight comment lines between. Content is accurate; the
    elision is unmarked.

**Verdict: sound.** No load-bearing claim was refuted, no API was
invented, and the decisionImpact conclusion holds. The defects are
elisions, one false description of a grep, and three calibration
overstatements in the decision-impact paragraph — all correctable in
wording, none reaching the report's findings or its recommendations.
