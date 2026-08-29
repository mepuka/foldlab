# Lean 4 as a host for a scripting-language implementation

Date: 2026-08-24. First-hand probe on this machine plus a web sweep. Everything
marked **measured** was run here; everything marked **read** was read out of a
file whose path is given; everything marked **reading** is my interpretation and
is not a fact.

| Identity | Value |
|---|---|
| Toolchain under test | `leanprover/lean4:v4.33.1` (`lean --version` → `Lean (version 4.33.1, x86_64-w64-windows-gnu, commit 819816b2e0a3bf405af45ae5c7af2491d8f5bee6, Release)`) |
| Lake | `Lake version 5.0.0-src+819816b` |
| elan | `elan 4.2.3 (b6cec7e10 2026-06-08)` |
| Toolchain root | `c:\Users\kokok\scoop\persist\elan\.elan\toolchains\leanprover--lean4---v4.33.1` |
| Bundled C compiler | `leanc` → `clang version 22.1.4`, target `x86_64-w64-windows-gnu` |
| Node baseline | `v22.23.2`, real binary `C:\Users\kokok\AppData\Local\mise\installs\node\22.23.2\node.exe` (86,997,320 bytes) |
| Host | Windows 11, PowerShell |
| Scratch projects | `…\scratchpad\leanhost\{hw,ffi,bench,sys}` (session scratchpad) |

Prior probe `concrete-spine-feasibility.md` established that Concrete's Core IR
compiles clean at v4.33.1. That is not re-litigated here; §4 only characterises
Concrete's *pipeline*, which that probe did not cover.

---

## 1. The compilation story, first-hand

### What `lake build` actually produces

`lake new hw exe` at v4.33.1 emits a `lakefile.toml` with one `[[lean_exe]]`.
`lake build` on it (**measured**, cold, 2,013 ms wall) prints four jobs and lays
down this tree under `.lake/build`:

```
   4064768  \bin\hw.exe
      1169  \bin\hw.exe.rsp          <- the link response file
      4517  \ir\Main.c               <- the generated C
      6936  \ir\Main.c.o.noexport
     17304  \lib\lean\Main.olean
       485  \lib\lean\Main.ilean
```

So the pipeline is `Main.lean → ir/Main.c → Main.c.o.noexport → bin/hw.exe`, and
the C is a real, readable artefact on disk, not a temp file. Jobs as reported:
`Built Main (557ms)`, `Built Main:c.o (298ms)`, `Built hw:exe (893ms)`.

### What the generated C looks like

**Read**, `…\hw\.lake\build\ir\Main.c` (133 lines for `IO.println "Hello, world!"`).
The shape a language implementor should know:

- One `#include <lean/lean.h>`. That header is 140,133 bytes and is the entire
  ABI surface (`…\toolchains\…v4.33.1\include\lean\lean.h`).
- Every Lean function becomes a C function taking and returning `lean_object*`.
  Names are mangled with a package prefix: `lp_hw_IO_println___at___00main_spec__0`.
  Note `___at___…_spec__0` — the compiler had already **specialised and inlined**
  `IO.println` into a monomorphic copy for this call site.
- A `___boxed` wrapper is emitted alongside each function, for calls that arrive
  through the generic `lean_apply_N` path.
- String literals are emitted as **static const heap objects with `m_rc = 0`**:
  ```c
  static const lean_string_object lp_hw_main___closed__0_value =
    {.m_header = {.m_rc = 0, ...}, .m_size = 14, .m_capacity = 14,
     .m_length = 13, .m_data = "Hello, world!"};
  ```
  Refcount zero is the sentinel for "static, never free, never increment". This
  is how compile-time-known constants avoid runtime allocation.
- Refcount traffic is explicit in the C: `lean_inc_ref(v_putStr_4_);`,
  `lean_dec_ref(v___x_3_);`. There is no GC pass; this is all of it.
- `main` is a real C `main`. It calls, in order: `lean_setup_args`,
  `lean_initialize_runtime_module`, `initialize_hw_Main(1)`,
  `lean_io_mark_end_initialization`, `lean_init_task_manager`,
  `lean_run_main(&run_main, argc, argv)`, `lean_finalize_task_manager`.
  On Windows it also calls `SetErrorMode(SEM_FAILCRITICALERRORS)` and
  `SetConsoleOutputCP(CP_UTF8)`.
- Module initialisation is an explicit, idempotent, ordered graph:
  `initialize_hw_Main` guards on a `_G_initialized` flag and calls
  `initialize_Init(builtin)` first.

**Reading**: this is a conventional, boring C backend. Nothing about it would
surprise someone who has read GHC's or OCaml's C output. It is legible enough
that you could debug a miscompilation by reading it, which is not true of most
managed runtimes.

### What a Lean binary links

**Read**, `…\hw\.lake\build\bin\hw.exe.rsp` — the full link line for a
hello-world. Static (`-Wl,-Bstatic`): `gmp`, `uv`, `ssl`, `crypto`, `unwind`,
`icu`, plus the Lean libraries `leancpp`, `Lean`, `Std`, `Init`, `leanrt`,
`Lake`, and `c++`/`c++abi`. Dynamic: `crypt32`, `gdi32`. Windows system libs:
`psapi user32 advapi32 iphlpapi userenv ws2_32 dbghelp ole32 shell32 ucrtbase
bcrypt`. Linker is `lld` (`-fuse-ld=lld`), with `-Wl,--gc-sections`.

Two facts worth extracting:

1. **libuv and OpenSSL are already in every Lean binary.** That is where the
   networking and crypto capability in §2 comes from — it is not an add-on.
2. **`-Wl,--stack,104857600`** — the PE stack reserve is set to 100 MiB at link
   time. Confirmed by reading the PE optional header of the produced binary
   (**measured**): `SizeOfStackReserve=104857600 bytes (100.0 MiB)`,
   `SizeOfStackCommit=4096`. But see §3 — this is *not* the stack the program
   actually runs on.

### Startup time and binary size, measured

n=50 per row, PowerShell `Stopwatch` around the process, 5 warmup runs
discarded. The `cmd /c echo` row is the harness floor — the cost of spawning
*anything* from this shell — and should be subtracted before comparing.

| Binary | Size | min | median | mean | median above floor |
|---|---|---|---|---|---|
| `cmd /c echo` (floor) | — | 14.99 ms | 16.78 ms | — | 0 |
| Lean `hw.exe` | 4,064,768 B | 21.11 ms | **22.59 ms** | 39.96 ms | **≈5.8 ms** |
| `node -e "…"` (real binary) | 86,997,320 B | 40.64 ms | **42.93 ms** | 45.65 ms | **≈26.2 ms** |

**Established**: a Lean hello-world executable on this machine is **4.06 MB** and
starts in about **6 ms of its own time**; Node is **87 MB** and about **26 ms**.
Lean is roughly 21x smaller and about 4.5x cheaper to start, above the floor.

The `sys.exe` binary from §2, which imports `Std.Net`, `Std.Async`, `Std.Time`
and `Std.Sync`, is **5,615,616 B** — so the whole async/networking/time stack
costs about **1.5 MB** of binary over hello-world.

**Reading**: for a scripting language whose selling point is short-lived CLI
invocations, ~6 ms and ~4 MB is a good place to start from. It is not as good as
a hand-written C tool (the floor suggests a few hundred microseconds is
possible) but it removes the "JVM/Node startup tax" objection entirely.

### The `@[extern]` FFI, both directions

Built and run as `…\leanhost\ffi` (a `lakefile.lean`, because `extern_lib`
needs a build function and the TOML format has no place for one). The Lake
recipe that works at v4.33.1, **verbatim from the file that built**:

```lean
target shim.o pkg : FilePath := do
  let oFile := pkg.buildDir / "c" / "shim.o"
  let srcJob ← inputTextFile <| pkg.dir / "c" / "shim.c"
  let flags := #["-I", (← getLeanIncludeDir).toString, "-fPIC"]
  buildO oFile srcJob flags

extern_lib libshim pkg := do
  let name := nameToStaticLib "shim"
  let job ← fetch <| pkg.target ``shim.o
  buildStaticLib (pkg.staticLibDir / name) #[job]
```

**Direction 1 — C called from Lean.** Declare the Lean-side type, bind the C
symbol:

```lean
@[extern "foldlab_mix64"]  opaque mix64 (x : UInt64) : UInt64
@[extern "foldlab_sum_bytes"] opaque sumBytes (a : ByteArray) : UInt64
@[extern "foldlab_upper_bytes"] opaque upperBytes (s : String) : ByteArray
@[extern "foldlab_io_answer"] opaque ioAnswer : IO UInt64
```

The C side (`ffi\c\shim.c`) shows the four calling conventions that matter:

- **Scalars are unboxed.** `uint64_t foldlab_mix64(uint64_t x)` — no
  `lean_object*` in sight. `UInt64`/`UInt32`/`USize`/`Bool` pass as native C
  types.
- **Borrowed heap arguments** are `b_lean_obj_arg`; you must not decrement them.
  Reading a `ByteArray` is `lean_sarray_size(arr)` + `lean_sarray_cptr(arr)` —
  a direct pointer to the bytes, no copy.
- **Allocating into the Lean heap** from C: `lean_alloc_sarray(1, n, n)` returns
  an owned `lean_obj_res` you hand back.
- **An `IO` action in C** takes an extra world-token `lean_object*` and returns
  `lean_io_result_mk_ok(...)`.

**Measured**, running `ffi.exe`:
```
mix64 1        = 12994781566227106604
sumBytes       = 294
upperBytes     = FOLDLAB
ioAnswer       = 42
```
(294 = 97+98+99, the UTF-8 bytes of `"abc"`. So the ByteArray pointer view is
correct.)

**Direction 2 — Lean exposed to C.** `@[export foldlab_lean_triangle]` on a
Lean `def` emits that C symbol with external linkage. Confirmed to compile and
run; the exported name appears in the emitted C. To *call* it from a C `main`
you must first run the module's `initialize_<Mod>` function and
`lean_initialize_runtime_module()` — the same sequence the generated `main`
performs (read from `Main.c`, §1). **Not measured**: I did not build a
C-driver-plus-Lean-library binary, so "you can embed Lean in a C host" is a
reading here, not an established fact, though the generated `main` shows exactly
what the sequence would be.

### The `@[extern]` trust hole — established, and it matters

`@[extern]` can be put on a `def` that *has a Lean body*. The kernel then uses
the Lean body; the compiler uses the C symbol. They are never checked against
each other.

```lean
@[extern "foldlab_mix64"]
def mix64OrPure (x : UInt64) : UInt64 := x + 1
```

**Measured**, two runs on the same declaration:

```
$ ffi.exe
mix64OrPure 1  = 12994781566227106604      <- compiled: took the C path

$ lake env lean Probe2.lean
theorem kernel_believes_x_plus_1 : mix64OrPure 1 = 2 := rfl
#print axioms kernel_believes_x_plus_1
  → 'kernel_believes_x_plus_1' does not depend on any axioms
```

An axiom-free `rfl` proof says the value is 2. The binary prints
12,994,781,566,227,106,604. **`#print axioms` does not reveal this.** This is
the single most important fact in this document for anyone attaching proofs to a
Lean-hosted interpreter; §5 develops it.

---

## 2. Runtime realities for a scripting-language implementor

### Memory model: reference counting with reuse

Lean 4 does not have a tracing garbage collector. It uses non-atomic-when-it-can
reference counting with two optimisations that come from a named research line:

- **Ullrich & de Moura, "Counting Immutable Beans: Reference Counting Optimized
  for Purely Functional Programming"**, IFL 2019. arXiv **1908.05647**.
  Contributions relevant here: *reset/reuse* (turn a dead constructor cell into
  the allocation for the next one, giving functional code in-place update), and
  *borrowed references* with an inference heuristic, to avoid refcount traffic
  on arguments that are only read.
- **Reinking, Xie, de Moura & Leijen, "Perceus: Garbage Free Reference Counting
  with Reuse"**, PLDI 2021 (distinguished paper). This is the systematised
  algorithm; Lean is one of its two named implementations (Koka is the other).
- **Lorenzen, Leijen & Swierstra, "FP²: Fully in-Place Functional
  Programming"**, ICFP 2023 (PACMPL 7, art. 198, doi 10.1145/3607840). This is
  the "FBIP" paper — the linear calculus that says *when* a functional function
  provably runs with zero allocation and constant stack.

Fetched to `C:\Users\kokok\Dev\foldlab\.reference\papers\` (**measured**
`Get-FileHash -Algorithm SHA256`; all five verified to start with `%PDF`):

| File | Bytes | SHA-256 |
|---|---|---|
| `ullrich-demoura-2019-counting-immutable-beans.pdf` | 823,649 | `070f0078a22998afa837b59159933c028004b44bbb9d9725c8c1bd48c8903093` |
| `ullrich-demoura-2019-counting-immutable-beans-appendix.pdf` | 577,106 | `18b1d55ec2c91d3f1b293e9027199364aa049dc76eb4cd37614aca1aba88a04c` |
| `reinking-xie-2021-perceus-garbage-free-refcounting.pdf` | 635,385 | `714189db3df1efbb22562ae55f301da4ef7610cdb9cfd3c051009c84a3d87a76` |
| `reinking-xie-2020-perceus-tech-report.pdf` | 688,302 | `8ddbabf9ed351208c745181292b88802eeea6d7e2df10c7421dfd665c71abc5e` |
| `lorenzen-leijen-2023-fp2-fully-in-place.pdf` | 476,702 | `761b769251955ea58ec1fe5b3d78ce714120e8db2684cf937198e98dd4821db1` |

Sources: arXiv `1908.05647`; `lean-lang.org/papers/beans_appendix.pdf`;
`xnning.github.io/papers/perceus.pdf`; `xnning.github.io/papers/perceus-tr.pdf`
(MSR-TR-2020-42); `webspace.science.uu.nl/~swier004/publications/2023-icfp.pdf`.

**Owed, not done**: `.reference/README.md` states that a paper enters the
catalog only when the generator assigns it a cluster, and that this is also the
only way `provenance/papers.lock.json` will accept it. These five files are on
disk with digests recorded above but are **not** in the lock. That is a
generator run someone still has to make.

The refcounting is visible in the emitted C (§1: `lean_inc_ref` / `lean_dec_ref`)
and the whole optimisation pipeline that inserts it is Lean source, not C++ —
`src/Lean/Compiler/LCNF/` contains `ExplicitRC.lean`, `InferBorrow.lean`,
`ResetReuse.lean`, `ExpandResetReuse.lean` (see §4).

**Consequences an implementor must plan for** (reading, grounded in the papers):

- **Cycles leak.** Perceus is garbage-free *for cycle-free programs*. A
  scripting language with mutable cyclic data (objects pointing at each other,
  a naive mutable environment for recursive closures) will leak unless the
  implementor breaks cycles deliberately — e.g. by indexing into an arena/`Array`
  rather than storing direct references. This is a real design constraint on the
  environment representation, and it points the same way §3's measurement does.
- **Uniqueness is where performance lives.** `Array.set` is O(1) in place when
  the refcount is 1 and O(n) copying otherwise. A held-onto reference silently
  converts your in-place update into a copy. This is the failure mode to
  benchmark for, not to reason about.
- Refcount operations become atomic once a value is shared across threads;
  `IO.Runtime.markMultiThreaded` exists in `Init/System/IO.lean` for exactly
  this.

### Data types

`String` in Lean 4 is UTF-8. In v4.33.1 the string API is mid-migration:
`String.trim` is **deprecated in favour of `String.trimAscii`**, and the
replacement has type `String → String.Slice` rather than `String → String`
(**measured**, the deprecation warning fired on my own test file). **Reading**: a
`String.Slice` type appearing in the core API is the signature of a zero-copy
substring redesign in progress; anyone building a lexer on top of `String`
should expect churn here across 4.3x releases, and should check whether
`Slice` is the intended lexer substrate before writing one against `String`.

`ByteArray` is a flat, unboxed byte buffer with a direct C pointer view
(`lean_sarray_cptr`, §1) — this is the right type for a content-addressed
store's I/O path, and it hands to C with no marshalling.

`Array α` is a dynamic array of boxed elements with the uniqueness caveat above.
`Std.Data` provides `HashMap`, `TreeMap`, `HashSet`, `TreeSet`, and `DHashMap`
(dependent) — **read** from the toolchain `src/lean/Std/Data`.

### What core IO can actually do

**Read**, `…\v4.33.1\src\lean\Init\System\IO.lean` (68,710 bytes). Enumerated
`@[extern]` primitives — this is the whole syscall surface, and it is broad:

- **Files**: `Handle.mk/read/write/getLine/putStr/flush/rewind/truncate`,
  `lock`/`tryLock`/`unlock` (advisory file locking, exclusive or shared),
  `isTty`, `realPath`, `removeFile`, `createDir`, `rename`, `hardLink`,
  `createTempFile`, `createTempDir`, `readDir`, `metadata`, `symlinkMetadata`,
  `walkDir`, `setAccessRights` (chmod).
- **Streams**: `getStdin/getStdout/getStderr`, and crucially
  `setStdin/setStdout/setStderr` plus `withIsolatedStreams` — you can redirect
  the interpreter's own stdio into a buffer, which is what a REPL and a test
  harness both need.
- **Processes**: `IO.Process.spawn` with `Stdio` config, `Child.wait`,
  `tryWait`, `kill`, `takeStdin`, `pid`; `IO.Process.output` and `run`
  convenience wrappers with optional stdin string.
- **Environment**: `getEnv`, `getCurrentDir`, `setCurrentDir`, `appPath`,
  `getPID`, `exit`, `forceExit`.
- **Randomness**: `IO.getRandomBytes : USize → IO ByteArray` (runtime CSPRNG).
- **Clocks**: `monoMsNow`, `monoNanosNow`.
- **Tasks**: `asTask`, `mapTask`, `bindTask`, `wait`, `waitAny`, `cancel`,
  `checkCanceled`, `getTaskState`.

Then, beyond `Init`, the `Std` library in v4.33.1 ships things I did not expect
to find in core (**read**, `…\src\lean\Std\`):

| Module | Size on disk | What it is |
|---|---|---|
| `Std/Net/Addr.lean` | 5.7 KB | IPv4/IPv6/MAC addresses, `SocketAddress` |
| `Std/Async/` | 11 files, ~85 KB | TCP, UDP, DNS, Process, Signal, Timer, `Select` |
| `Std/Http/` | 45 files, ~330 KB | **A complete HTTP/1.1 server**: `Protocol/H1.lean` (56.5 KB), `H1/Parser.lean` (20 KB), `Writer`, `Reader`, chunked bodies, header multimap, full status/method tables, a URI parser (14 KB) and percent-encoder (24 KB) |
| `Std/Sync/` | 12 files, ~87 KB | `Mutex`, `RecursiveMutex`, `SharedMutex`, `Semaphore`, `Barrier`, `Channel`, `CloseableChannel`, `Broadcast`, `Notify`, `CancellationToken` |
| `Std/Time/` | 45 files, ~370 KB | Full date/time with IANA tzdata: `Zoned/Database/TZdb.lean`, `TzIf.lean`, `PosixTz.lean`, `Windows.lean`, strftime-style `Format` |

### Verified by running, not by reading

I wrote `…\leanhost\sys\Main.lean` to exercise this rather than trust the file
listing. **Measured** output of `sys.exe`:

```
[fs]      wrote+read 11 bytes, type=IO.FS.FileType.file
[fs]      readDir -> 1 entry
[env]     PATH present=true, cwd len=128
[rand]    8 bytes, first=229
[task]    2 parallel tasks -> 4499998500000 4500001500000
[sync]    mutex=41 channel recv=7
[time]    now=2026-8-24
[tcp]     bound 127.0.0.1:64322, echoed=ping
```

The `[tcp]` line is a real loopback socket: `TCP.Socket.Server.mk`, `bind` to
port 0, `listen`, `accept` on one task, `Client.mk` + `connect` + `send` +
`recv?` on the main thread, message echoed back. **Established: TCP networking
works out of the box at v4.33.1 with no external package.**

Process spawning: a separate probe (`Spawn.lean`) established that
`IO.Process.output { cmd := "<path to hw.exe>" }` returns `exit=0
stdout=Hello, world!`, and that piping stdin works
(`findstr e` over `apple\nbanana\ncherry` → `apple|cherry`, exit 0). But
**a Windows quoting quirk is real**: `{ cmd := "cmd.exe", args := #["/c", "echo hello"] }`
fails with `'"echo hello' is not recognized…`, exit 1 — Lean quotes each
argument individually and `cmd.exe` does not accept that. Spawning ordinary
executables is fine; spawning through `cmd.exe` needs care.

### Exceptions and panics

Two distinct mechanisms:

- `IO` is `EIO IO.Error`, an error monad. `try/catch`, `IO.Error` is a
  structured inductive (`Init/System/IOError.lean`, 11.6 KB) with cases like
  `noFileOrDirectory`, `resourceBusy`, `permissionDenied`. This is ordinary
  typed error handling and is what a script's runtime errors should use.
- Partial functions and `panic!`/`get!`/`[i]!` abort. `LEAN_ABORT_ON_PANIC` is a
  real env var in the binary (**measured**, found in the `bench.exe` string
  table). Panics are *not* catchable as `IO.Error`.

**Reading**: an interpreter should never use `!` accessors on user-controlled
input — every `arr[i]!` in an evaluator is a way for a user program to abort the
host process rather than raise a script-level error. This is a discipline
matter, and it is exactly the kind of thing a proof obligation can retire
(index-in-bounds as a precondition rather than a runtime `panic`).

### Threading

`Task` is real parallelism over the runtime's worker pool, not green threads —
confirmed by the `[task]` line above. `LEAN_NUM_THREADS` controls the pool
(**measured**, present in the binary's string table alongside
`lean::task_manager::spawn_dedicated_worker`). `Std.Sync` supplies the
primitives; `Std.Async` supplies a structured async layer over libuv with
`Select`.

---

## 3. Interpreter architecture options in Lean

### Tree-walking over an inductive AST

This is the natural first move and it works. The AST is an `inductive`, the
evaluator is a `partial def` (or a well-founded `def` if you can supply a
measure), and the pattern match compiles to a C tag switch — visible in the
generated C (§1).

Where proofs attach, concretely:

- On a **total** evaluator (`def eval : Fuel → Exp → Option Value`), you get
  determinism and fuel-monotonicity theorems essentially for free, and they are
  about the same function that runs.
- On a `partial def`, you get **nothing** — `partial` introduces an opaque
  constant with an `Inhabited`-based implementation and the kernel cannot see
  the body. This is the first real fork in the road: `partial` is the
  convenient choice and it costs you the ability to state anything about the
  evaluator.
- Both of my §3 benchmark evaluators are `partial def`, deliberately, because I
  was measuring the *unverified shell* case.

### Environment representation — measured, not argued

I built the same tiny language twice, differing only in how the environment is
represented, and ran `fib(30)` interpreted — **2,692,537** interpreted function
calls (`2·F(31) − 1`), so roughly 2.7 M frame constructions and ~19 M AST nodes
visited:

- **array-env**: `Array Int`, one flat frame per call, variables are `Nat`
  indices.
- **alist-env**: `List (String × Int)`, variables are `String`, lookup is a
  linear scan with `String` equality.

**Measured** (median of 3, `bench.exe`, v4.33.1 release build):

| | Lean | Node v22.23.2 | Lean advantage |
|---|---|---|---|
| native `fib(30)` (host-language recursion) | **5.61 ms** | 7.31 ms | 1.3x |
| interpreted, **array env** | **73.5 ms** | 148.3 ms | 2.0x |
| interpreted, **alist env** | **149.9 ms** | 301.0 ms | 2.0x |

Two established results:

1. **The environment representation costs 2x**, in both languages, identically.
   String-keyed association lists double the interpreter's runtime versus flat
   indexed frames. This is a portable fact about interpreter design, not about
   Lean.
2. **Interpretation costs about 13x over native**, in Lean (73.5 / 5.61).

**A measurement trap worth recording.** My first run reported `0.0001 ms` for
every Lean fib benchmark, with correct results. The cause: in

```lean
let t0 ← IO.monoNanosNow
let v := act ()          -- a PURE let inside `do`
let t1 ← IO.monoNanosNow
```

the Lean compiler is free to sink the pure `let` past the second clock read, and
it does. The fix that pins evaluation between the clocks is to pass the value to
an IO primitive: `let r ← IO.mkRef (act ()); let v ← r.get`. **Anyone
benchmarking Lean must check for this**; it silently produces beautiful numbers.

### Where Lean loses: tight scalar loops

**Measured**, 50 M iterations of `acc = (acc + (i*7) % 1000003) % 1000003`,
arithmetic chosen so every intermediate fits in 2^53 and Lean's `UInt64` and a
JS `Number` compute *the same result* (both printed `79275`):

| | median |
|---|---|
| Lean `UInt64` while-loop | **625 ms** (12.5 ns/iter) |
| Node `Number` while-loop | **133 ms** (2.7 ns/iter) |

**Node is 4.7x faster here.** Honest attribution: the loop contains two integer
divisions, and Lean's `UInt64 %` compiles to a genuine 64-bit `div` (~20-40
cycles) while V8 keeps the values as small integers/doubles and uses a much
cheaper path. This is a real and reproducible loss, but it is a loss on
*scalar arithmetic throughput with division*, not on the interpreter dispatch
loop, where Lean won by 2x. **Reading**: the two results are consistent — V8's
JIT wins on hot monomorphic arithmetic; Lean's ahead-of-time monomorphic tag
dispatch wins on the polymorphic-object AST walking that defeats V8's inline
caches. A spine implementation is dominated by the second, not the first.

**Label**: all of the above are microbenchmarks, single machine, single run set,
no statistical treatment beyond median-of-3. They establish orders of magnitude
and nothing finer.

### Tail calls and stack behaviour — measured

Lean **does** perform tail-call optimisation on self-recursion. **Read**, the
generated C for an accumulator-passing `tailSum`: the function body opens with
`_start:` and the recursive call is compiled to a jump, not a call. A
non-tail-recursive `deepSum` (`n + 1 + deepSum n`) is compiled as a genuine C
recursion — **read**, `…\bench\.lake\build\ir\Main.c`:

```c
v___x_7_ = lp_bench_deepSum(v_n_5_);      /* real call */
lean_dec(v_n_5_);
v___x_8_ = lean_nat_add(v___x_6_, v___x_7_);
```

So: how deep can a compiled Lean binary recurse? **Measured** by binary search
on `bench.exe deep N`:

| Configuration | Max depth before overflow |
|---|---|
| Lean, **default** | **16,679,688** frames |
| Lean, `LEAN_STACK_SIZE_KB=8192` (8 MiB) | 129,874 frames (64.6 B/frame) |
| Lean, `LEAN_STACK_SIZE_KB=1024` (1 MiB) | 18,145 frames (57.8 B/frame) |
| Node v22.23.2, default | **9,608** frames |

Established sub-facts:

- The relevant knob is **`LEAN_STACK_SIZE_KB`** (not `LEAN_STACK_SIZE`, which I
  tried first and which does nothing). It was found by scanning the binary's
  string table, alongside `LEAN_MAIN_USE_THREAD`. Setting it to 4 GiB let a 20 M
  deep recursion that otherwise aborts complete successfully.
- The **default stack is ≈1 GiB**, not the 100 MiB the PE header reserves.
  Confirmed by setting `LEAN_STACK_SIZE_KB=1048576` explicitly and reproducing
  the default limit. The `LEAN_MAIN_USE_THREAD` symbol is the mechanism: `main`
  runs on a spawned thread whose stack Lean sizes itself, so the link-time
  `--stack,104857600` is not the operative number.
- Overflow is **clean**: the runtime prints `Stack overflow detected. Aborting.`
  and exits with `0xC0000409`. It is not a silent corruption.
- A heap-allocated tree, non-tail-evaluated (`evalE` over a 5 M-node spine),
  also completes at the default; it aborts at 20 M.

**This is the single largest practical gap between Lean and Node as an
interpreter host: ~1,736x more recursion depth by default.** A tree-walking
interpreter's host-stack depth is proportional to the *interpreted* program's
expression nesting and call depth. On Node you must either trampoline or accept
that a moderately recursive user script kills the interpreter; on Lean you have
about seven orders of magnitude of headroom and a documented env var to raise it
further.

---

## 4. Prior art — languages implemented in Lean 4

Web sweep (URLs are the receipts; figures fetched 2026-08-24/25). Where a claim
below is a repository's own description rather than something inspected, it is
marked as such.

### Lean 4 is self-hosted — and the boundary moved recently

From `github.com/leanprover/lean4`, byte counts off the git tree API:

| Side | Directories | Files | Bytes |
|---|---|---|---|
| Lean | `src/Init`, `src/Lean`, `src/Std` | 2,364 `.lean` | 27.9 MB |
| C++ | `src/kernel` | 36 | 344 KB |
| | `src/runtime` | 78 | 641 KB |
| | `src/library` | 42 | 310 KB |
| | `src/util`, `include`, `initialize`, `shell` | 48 | 273 KB |

Whole-repo linguist: `Lean 41,061,311` / `C++ 1,571,233` bytes — **26:1**.

**The load-bearing fact: the C++ code generator was deleted in July 2025.**
`src/library/compiler/` no longer exists; commit `d2e604f74`
"feat: remove the old compiler (#9275)", 2025-07-09. Code generation is now
entirely Lean source: `src/Lean/Compiler/LCNF/` (~60 files, including
`EmitC.lean`, plus the Perceus machinery `ExplicitRC.lean`, `InferBorrow.lean`,
`ResetReuse.lean`) and `src/Lean/Compiler/IR/` (including `EmitLLVM.lean`,
79 KB). Parser, elaborator, meta layer, pretty-printer and language server are
all `.lean`.

What remains C++ is exactly: the **trusted kernel** (`type_checker.cpp` 54 KB,
`inductive.cpp` 69 KB, `expr.cpp`, `level.cpp`, `quot.cpp`), the **runtime**
(refcounting, boxing, GMP-backed `Nat`/`Int`, IO primitives, task scheduler),
and a thin support layer in `src/library` — notably `ir_interpreter.cpp`, which
is what `#eval` runs on (see §5).

From `doc/dev/bootstrap.md`, quoted: the cycle "is broken by using pre-built C
files checked into the repository". Stage 0 is archived extracted C in
`stage0/src/`; stage 1 is your Lean sources built by stage 0's binary; stage 3
exists as a fixed-point check.

**Established, and it is the answer to "can Lean host a real language": Lean
hosts Lean.** A production compiler with a language server, an optimising
backend and two code generators, written in itself.

**Not established, and important**: none of Lean's own compiler is proved
correct. It is self-hosted, not verified. There is no official WebAssembly
backend (`wasm` appears in 3 files under `src/`, all emscripten build plumbing).

### Cedar — the closest existing analogue to what the lab wants

`github.com/cedar-policy/cedar-spec`, 196 stars, active (pushed 2026-08-24).
**351 `.lean` files, 3.8 MB Lean + 1.2 MB Rust.** AWS's authorization policy
language.

- `cedar-lean/Cedar/Spec/` — the **executable reference interpreter** for the
  policy language, in Lean.
- `Cedar/Validation/` — the type checker. `Cedar/SymCC/` — a symbolic compiler
  to SMT. `Cedar/TPE/` — partial evaluation.
- `Cedar/Thm/` — the proofs. **`sorry` count: 0** (GitHub code search over the
  repo with `language:Lean` returns `total_count: 0`).
- `cedar-drt/` — a Rust harness that differentially fuzzes the **Rust production
  implementation against the Lean model over FFI**.

Theorems actually stated (read from `Cedar/Thm/Authorization.lean`):
`forbid_trumps_permit`, `default_deny`,
`allowed_iff_explicitly_permitted_and_not_denied`, and
`order_and_dup_independent` — policy-set evaluation proved invariant under
reordering and duplication. `Cedar/Thm/Verification.lean` carries **26 paired
soundness *and* completeness theorems** for the SMT reduction
(`verifyNeverErrors_is_sound` / `_is_complete`, and nine more pairs).
`Thm/Typechecking.lean` states type soundness with an explicitly-conceded
residual error class (`entityDoesNotExist`, `extensionError`,
`arithBoundsError`).

**The structural weakness, stated plainly**: the Lean↔Rust link is *differential
testing*, not extraction and not a refinement proof. **Reading**: that is
precisely the seam a verification-cost-collapse thesis would want to attack, and
it is the same seam §5 is about.

### Concrete's pipeline, end-to-end and first-hand

Read from the pinned clone `C:\Users\kokok\Dev\foldlab\.reference\clones\concrete`
(pin `28a25a4`, per the prior probe). Line counts measured with
`Get-Content | Measure-Object -Line`.

**Codegen target: textual LLVM IR, then `clang`.** Not C, not a bytecode VM.

The stage sequence, read from `Concrete\Pipeline\Pipeline.lean` (516 lines) and
`Main.lean`:

```
source
  → Frontend\Lexer.lean (397)  →  Frontend\Parser.lean (2358)  → ParsedProgram
  → Resolve\           (2030)                                  → ResolvedProgram
  → Check\             (5565)                                  [type check]
  → Elab\Elab.lean     (1850)  + Elab\CoreCanonicalize (146)   → ElaboratedProgram
  → Pipeline.coreCheck                                         → ValidatedCore
  → IR\Mono.lean       (1122)  [monomorphize]                  → MonomorphizedProgram
  → IR\Lower.lean      (2217)  → SSA (230) / SSACleanup (684) / SSAVerify (500)
                                                               → SSAProgram
  → Backend\EmitSSA.lean (1667) + EmitBuiltins (838)  [SSA → typed LLVM AST]
  → Backend\LLVM.lean    (164)   [the typed LLVM AST]
  → Backend\EmitLLVM.lean (178)  [AST → LLVM text]
  → write <input>.ll  →  llvm-as validate (if present)  →  clang  →  native binary
```

Two design ideas worth stealing, both **read** from the source:

1. **Typestate gates.** Each stage produces a distinct Lean structure, and the
   only way to obtain the next one is to run the pass. The doc comment on
   `ValidatedCore` says it outright: "Core IR that has passed `coreCheckProgram`
   … This is the only way to construct a `ValidatedCore`." The type system is
   carrying the pipeline invariant. No proof required; just constructor
   discipline.
2. **A typed LLVM AST rather than string concatenation.** `Backend\LLVM.lean`
   defines `LLVMTy`, `LLVMOperand`, `LLVMBinOp`, `LLVMInstr`, `LLVMTerm`,
   `LLVMBlock`, `LLVMFnDef`, `LLVMModule` as inductives; `EmitLLVM.lean` is
   purely a printer. Its own rationale, quoted from the file: "Type-safe
   construction (invalid IR is harder to produce) … Foundation for future
   serialization, caching, and backend plurality."

**Concrete also has a second executable semantics**: `Concrete\Interp\Interp.lean`
(1,106 lines), a tree-walking interpreter over validated Core, reachable as
`concrete <file> --interp`. Its environment is `abbrev Env := List (String × IVal)`
— the association-list representation that §3 measured at **2x slower** than
flat indexed frames.

`docs\INTERPRETER_TRUST.md` is the most directly useful document in the clone
for the lab's §5 question. It is explicit that the interpreter's value is
*independence*, and equally explicit about where independence fails — quoted:
"both interpreted and compiled paths trust the same frontend and Core", and
"neither agreement nor a cache/artifact match proves the shared input correct."
The differential corpus is `tests\oracle\`.

### Everything else, briefly

The one seriously-proved *language* artefact outside Cedar is
`github.com/pandaman64/lean-regex` (110 stars, active, 100% Lean): two engines
(backtracker + VM) with claimed soundness, completeness and capture-group
correctness. Its README is candid about the two gaps that matter — "If our
specification differs from expected behavior, our proofs would not detect this",
and its parser/NFA-compiler front end uses non-tail recursion and is not proved
stack-safe.

Other real projects: `leanprover/verso` (375★, 331 `.lean`) — a markup language
with a parameterised document type, no correctness proofs;
`cajal-technologies/talos` (161★, 206 `.lean`) — a Wasm interpreter built for
reasoning, with a weakest-precondition calculus, self-described work-in-progress
and no published spec-suite results; `T-Brick/c0deine` (43★) — a full reference
compiler for the CMU C0 teaching language; `leanprover/LNSym` (116★) — an ARMv8
symbolic simulator; `leanprover/SampCert` (103★, 0 `sorry`) — proved discrete
Gaussian sampler deployed in AWS Clean Rooms, which also ships a **Lean→Dafny
code generator written in Lean** (`SampCert/Extractor/`).

Parser libraries: `Std.Internal.Parsec` exists in core but is *internal*. The
live third-party options are `fgdorais/lean4-parser` (90★, active) and
`janmasrovira/prim-parser` (20★, total parser combinators). The
Megaparsec/Straume lineage is **dead** (untouched since 2023-12/2024-01).

Densest cluster by far is blockchain semantics — `NethermindEth/EVMYulLean`
(94★, executable EVM + Yul model), `Verified-zkEVM/clean` (179★),
`paradigmxyz/solidus` (29★, verified Yul→EVM compiler), and about eight more.

**Reading, and this is the honest headline for §4**: the corpus is bimodal.
Lean itself and Cedar prove the capability exists at production scale. Between
them and the toys there is almost nothing — no Lisp, no Scheme, no ML
interpreter with progress/preservation at any citable scale; a `language:Lean
"type checker"` search returns 4 repositories, max 9 stars. The gap between
"Lean can host a language implementation" and "people routinely do it" is large,
and the evidence says it is not a capability gap.

---

## 5. The proof seam

### The two holes, both measured

A verified component (the lab's SHA3-512 at `formal/fips202`) plugging into an
unverified interpreter shell is fine *as long as the compiled artefact actually
runs the verified code*. Lean gives you two attributes that silently break that
link, and neither is visible to `#print axioms`.

**`@[extern]` on a def with a Lean body** (§1). Kernel: `x + 1`. Binary: the C
function. `theorem … : mix64OrPure 1 = 2 := rfl` typechecks and
"does not depend on any axioms", while the binary prints
`12994781566227106604`.

**`@[implemented_by]`** — the same hole without leaving Lean. **Measured**:

```lean
def specA (n : Nat) : Nat := n + 1
@[implemented_by specA] def spec (n : Nat) : Nat := n + 100
theorem kernel_says_101 : spec 1 = 101 := rfl
```
```
'kernel_says_101' does not depend on any axioms
#eval spec 1          → 2
compiled spec 1       → 2
```

The kernel proves 101. Both execution paths produce 2. `@[implemented_by]` is
strictly worse than `@[extern]` here, because `@[extern]` at least *fails loudly*
under `#eval` when no native symbol is loaded (measured:
`error: Could not find native implementation of external declaration 'mix64'`),
whereas `@[implemented_by]` diverges quietly everywhere.

**Consequence for the lab, stated as an obligation rather than a fear**: any
claim of the form "the artefact computes the proved SHA3-512" requires an audit
that no `@[extern]` and no `@[implemented_by]` sits between the theorem and the
emitted code. `#print axioms` will not do it — the audit has to walk the
environment for those two attributes. This is a concrete, mechanisable gate and
it does not exist yet.

### `#eval` versus compiled execution

`#eval` does **not** run compiled code. It runs the IR interpreter in
`src/library/ir_interpreter.cpp` (§4), one of the last C++ components. Two
consequences, both measured:

- **Speed.** Same interpreter, same input, `fib(25)` through the array-env
  evaluator: **311.3 ms under `#eval`** versus **6.57 ms compiled** — about
  **47x slower**. Any performance number taken from `#eval` is meaningless.
- **Semantics.** `#eval` follows `@[implemented_by]` (measured above) and needs
  native symbols for `@[extern]` (measured: it errors, and the fix
  `supportInterpreter := true` is what the error message itself recommends). So
  `#eval` agrees with *neither* the kernel nor, necessarily, the compiled
  binary. It is a third semantics.

There is a fourth: `#reduce` / `decide` / `rfl`, which run in the kernel and see
only Lean bodies.

**Reading**: an output is trustworthy in the lab's sense only if you say which of
the four evaluators produced it. A digest printed by `#eval` and a digest printed
by the shipped binary are different claims. The estate's existing posture —
nothing nondeterministic is load-bearing except through admission — extends here
cleanly: *which evaluator produced this* belongs in the admission record.

### One Lake project versus two

`extern_lib` and `lean_lib` in a single `lakefile.lean` (§1) is enough to build a
mixed trusted/untrusted project, and the FFI probe demonstrates it working. The
boundary question is not a build-system question, it is a naming one: nothing in
Lake distinguishes a verified module from an unverified one.

Patterns available, in increasing order of strength (**reading** — none of these
was tested here):

1. **Namespace + review discipline.** `Foldlab.Verified.*` versus
   `Foldlab.Shell.*`, with a CI grep for the two dangerous attributes inside the
   verified namespace. Cheapest; catches the hole above.
2. **Typestate gates, as Concrete does them** (§4). `ValidatedCore` cannot be
   constructed except by running the checker. This is free — no proofs — and it
   is the single highest-value idea in the Concrete clone.
3. **Separate Lake packages with a pinned `require`.** Forces the dependency to
   be one-directional and makes the trusted set enumerable. Note the toolchain
   constraint: `formal/fips202` is at **v4.33.1**, and a Lake dependency must
   agree on the toolchain — a separate package does not buy independent
   toolchain versions.
4. **Deriving the digest inside the trusted module and exporting only an opaque
   handle**, so the shell cannot construct a digest it did not compute. This is
   the one that would make "every digest in the store was produced by the proved
   implementation" a type-level fact rather than a review outcome.

---

## 6. Established facts and open questions

### Established (each with the command or file that produced it)

1. Toolchain under test is Lean **4.33.1** with `leanc` = clang 22.1.4.
   (`lean --version`; `leanc --version`.)
2. `lake build` on an `exe` target emits readable C at `.lake/build/ir/<Mod>.c`
   and links it to a native binary. (Listing of `.lake/build`; the 133-line
   `Main.c` read in full.)
3. A Lean hello-world binary is **4,064,768 bytes**, median startup **22.59 ms**
   against a **16.78 ms** shell floor — about **5.8 ms** of its own. Node
   v22.23.2 is **86,997,320 bytes** and **42.93 ms** median (**26.2 ms** above
   floor). (n=50 each, `Stopwatch`, 5 warmups discarded.)
4. Every Lean binary statically links **libuv, OpenSSL, GMP, ICU, libunwind**.
   (`.lake/build/bin/hw.exe.rsp`, read in full.)
5. `@[extern]` works in both directions and supports unboxed scalars, borrowed
   heap objects with direct pointer access (`lean_sarray_cptr`), allocation into
   the Lean heap (`lean_alloc_sarray`), and `IO` actions. (Built `ffi.exe`;
   output `mix64 1 = 12994781566227106604`, `sumBytes = 294`,
   `upperBytes = FOLDLAB`, `ioAnswer = 42`.)
6. **`@[extern]` on a def with a body lets the kernel and the binary disagree,
   with no axiom trace.** (`theorem kernel_believes_x_plus_1 : mix64OrPure 1 = 2 := rfl`
   elaborates; `#print axioms` → "does not depend on any axioms"; the binary
   prints 12994781566227106604.)
7. **`@[implemented_by]` does the same, and diverges under `#eval` too.**
   (Kernel proves `spec 1 = 101` axiom-free; `#eval` → 2; compiled → 2.)
8. `#eval` runs the C++ IR interpreter and is about **47x slower** than compiled
   code on the same function. (`fib(25)`, array-env evaluator: 311.30 ms vs
   6.57 ms.)
9. Lean core ships a complete systems IO surface: files with advisory locking,
   `readDir`/`metadata`/`walkDir`/chmod, redirectable stdio, process spawn with
   piped stdin/stdout and `kill`, CSPRNG, monotonic clocks, `Task`.
   (`Init/System/IO.lean`, 68,710 bytes, enumerated.)
10. **`Std` at v4.33.1 contains TCP/UDP/DNS, a full HTTP/1.1 server, an async
    layer with `Select`, mutexes/semaphores/channels/broadcast, and IANA-tzdata
    date-time** — no external package.
    (`src/lean/Std/{Net,Async,Http,Sync,Time}`, listed with sizes.)
11. **The TCP stack demonstrably works**: bind loopback:0, listen, accept on a
    task, connect, send, `recv?`, echo. (`sys.exe` →
    `[tcp] bound 127.0.0.1:64322, echoed=ping`.) Process spawn works
    (`exit=0 stdout=Hello, world!`) and stdin piping works
    (`findstr e` → `apple|cherry`).
12. Adding `Std.Net`+`Std.Async`+`Std.Time`+`Std.Sync` costs about **1.5 MB** of
    binary (4,064,768 → 5,615,616 bytes).
13. Lean performs **TCO on self tail-recursion** (generated C uses `_start:` and
    a jump) and compiles non-tail recursion to real C recursion (generated C
    shows `v___x_7_ = lp_bench_deepSum(v_n_5_);` before the add).
14. **Default recursion depth is ≈16.7 M frames** (measured 16,679,688) at
    ~64 bytes/frame, i.e. a **≈1 GiB** default stack — *not* the 100 MiB the PE
    header reserves (`SizeOfStackReserve=104857600`). The knob is
    **`LEAN_STACK_SIZE_KB`**; `LEAN_MAIN_USE_THREAD` is the mechanism. Overflow
    is clean: `Stack overflow detected. Aborting.`, exit `0xC0000409`.
    (Binary search on `bench.exe deep N`; 1 MiB → 18,145 frames, 8 MiB →
    129,874 frames, 4 GiB → 20 M frames succeed.)
15. **Node v22.23.2 manages 9,608 frames by default** — Lean has **≈1,736x** more
    recursion headroom. (Same binary-search method.)
16. A tree-walking interpreter in Lean is **about 2x faster than the same
    interpreter in Node**: `fib(30)` interpreted, array env 73.5 ms vs 148.3 ms;
    alist env 149.9 ms vs 301.0 ms. Native `fib(30)`: 5.61 ms vs 7.31 ms.
    (Medians of 3; microbenchmark.)
17. **Environment representation costs 2x in both languages** (string-keyed alist
    versus flat indexed frames). Interpretation costs ~13x over native Lean.
18. **Node is 4.7x faster on a tight scalar loop with division**: 50 M
    iterations, both computing `79275`, Lean 625 ms vs Node 133 ms.
19. **Benchmark trap**: a pure `let` inside `do` is sunk past a following
    `IO.monoNanosNow`; the first version of my benchmark reported 0.0001 ms with
    correct results. `IO.mkRef` pins it.
20. **Lean 4's C++ code generator was removed in July 2025** (`d2e604f74`). Code
    generation, including `EmitC.lean`, `EmitLLVM.lean` and the whole Perceus
    pipeline, is Lean source. C++ remains only for kernel, runtime and
    `ir_interpreter.cpp`. Whole-repo ratio 26:1 Lean:C++.
21. **Cedar** (`cedar-policy/cedar-spec`) is an executable reference interpreter
    plus type checker plus symbolic compiler for a deployed AWS language, 351
    `.lean` files, **zero `sorry`**, with 26 paired soundness/completeness
    theorems for its SMT reduction — and its bridge to the Rust production
    implementation is **differential testing, not extraction**.
22. **Concrete compiles to textual LLVM IR then invokes `clang`** — not C, not
    bytecode. Full stage list and line counts in §4. It uses typestate gates
    (`ValidatedCore` constructible only via `coreCheck`) and a typed LLVM AST
    with a separate printer.
23. Concrete carries a **second executable semantics** (`Interp.lean`, 1,106
    lines, `Env := List (String × IVal)`) and a written trust boundary
    (`docs/INTERPRETER_TRUST.md`) that concedes "both interpreted and compiled
    paths trust the same frontend and Core".
24. Five runtime-model papers fetched with digests recorded (§2 table). They are
    **not** in `papers.lock.json`; that generator run is owed.
25. Windows quirk: `IO.Process.output` quotes each argument, so invoking
    `cmd.exe /c echo hello` fails (`'"echo hello' is not recognized`, exit 1)
    while invoking an ordinary executable succeeds.
26. `String.trim` is **deprecated at v4.33.1** in favour of `String.trimAscii`,
    whose type is `String → String.Slice`, not `String → String`.

### Open questions

1. **Embedding Lean in a C host was not built.** `@[export]` compiles, and the
   generated `main` shows the required initialisation sequence, but I did not
   link a C driver against a Lean static library. Untested.
2. **No `@[extern]`/`@[implemented_by]` audit tool exists.** Writing one means
   walking the environment for those attributes; I did not check whether Lean
   exposes a clean API for that, nor whether `Std` already ships such a linter.
3. **Cross-package toolchain skew.** `formal/fips202` is pinned at v4.33.1. What
   happens to a two-package split when the shell wants to move to 4.34 and the
   verified package does not is unexamined.
4. **The `String.Slice` migration.** Whether `String.Slice` is the intended
   substrate for a lexer at v4.33.1+, and how stable it is, is unknown. This
   directly affects a spine's front end and should be checked before one is
   written.
5. **Refcount cycles in an interpreter environment** were not measured. §2 says
   they leak in principle; I did not build a cyclic-environment interpreter and
   watch RSS. Since this constrains the environment representation, it is the
   highest-value follow-up measurement.
6. **Uniqueness-driven `Array.set` copying** was not measured either. The 73.5 ms
   array-env number may or may not be paying a hidden copy per frame.
7. **Whether `partial def` is avoidable for a real evaluator.** All my evaluators
   are `partial`, so nothing is provable about them. What a fuel-indexed or
   well-founded evaluator costs — in performance and in ergonomics — is the
   central unmeasured question for the spine.
8. **`Std.Http`'s maturity.** I exercised TCP, not the HTTP server. 45 files
   exist; whether the H1 parser is conformant is unknown.
9. **Benchmarks are single-machine, medians of 3, no statistical treatment.**
   They establish orders of magnitude only. The Lean-beats-Node interpreter
   result in particular deserves a second opinion on other hardware.
10. **Talos and EVMYulLean pass-rates against their official spec suites are
    unpublished**, so "there is a working Wasm/EVM interpreter in Lean" is a
    claim about existence, not conformance.
