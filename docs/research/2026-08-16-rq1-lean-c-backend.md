# RQ-1 — What does Lean's C backend actually give us?

Research seat, 2026-08-16. Serves the REF-0 spike
(`scratch/dispatch/18-ref0-hello-kernel-spike.md`) and REF-6.
Question and discipline: `scratch/dispatch/19-refinement-research-questions.md`.

Reference area, including the runnable example and every recorded
transcript: `docs/research/reference/rq1-lean-c-backend/`.

## Grounding

Everything below is one of three kinds, and each claim says which:

* **ran** — executed on the operator's machine on 2026-08-16 and recorded
  in `docs/research/reference/rq1-lean-c-backend/minimal-example/TRANSCRIPT.md`;
* **quoted** — copied verbatim from a primary source named with its URL or
  on-disk path and its version;
* **lead** — recalled or inferred, `UNVERIFIED` until a primary source
  confirms it.

Toolchain, all `ran`: `elan 4.2.3`, `Lake 5.0.0-src+d8b1897`,
`Lean (version 4.33.0, x86_64-w64-windows-gnu, commit d8b1897…, Release)`,
`gcc.exe (Rev5, Built by MSYS2 project) 16.1.0`, `go1.26.5 windows/amd64`,
`bun 1.3.14`, Windows 11 Home 10.0.26200. The toolchain's own `leanc`
driver reports `clang version 22.1.4`.

The primary documentation is the Lean 4 language reference at
<https://lean-lang.org/doc/reference/4.33.0/Run-Time-Code/Foreign-Function-Interface/>.
That version is not guessed: the toolchain's `include/lean/version.h`
defines `LEAN_MANUAL_ROOT "https://lean-lang.org/doc/reference/4.33.0/"`.
The older `lean-lang.org/lean4/doc/dev/ffi.html` still resolves but
301-redirects to a four-line stub in the repository pointing here.

**Headline caveat, quoted from that page:** "The current interface was
designed for internal use in Lean and should be considered unstable".
Whatever REF-6 builds on this sits on an interface its authors decline to
stabilise. That belongs in VERIFICATION.md's trusted base as stated, not
paraphrased into something softer.

---

## 1. The `@[export]` mechanism and what may cross

### What the attribute does

Quoted: "Exports a Lean constant with the unmangled symbol name `sym`."
The Lean type is then encoded per the ABI: for a normalised
`α₁ → … → αₙ → β`, `n = 0` yields `extern s sym;` and `n > 0` yields
`s sym(t₁, …, tₙ);`.

Quoted type mappings: `UInt8`…`UInt64`, `USize` → `uint8_t`…`uint64_t`,
`size_t`; `Char` → `uint32_t`; `Float` → `double`; `Nat` and `Int` →
`lean_object *`. A `Sort u`, a `… → Sort u`, or a `p : Prop` is
irrelevant. The reference's own String and Array FFI subsections were not
retrieved in usable form during this run; **the C representation of
`ByteArray` is not documented on the FFI page I read**, and what follows
about it is `ran` and `quoted from lean.h`, not from the FFI chapter.

### What the compiler actually emitted (ran)

`Spike.lean` declares five exports. `.lake/build/ir/Spike.c` — the
compiler's own output — declares them as:

```c
LEAN_EXPORT uint64_t     spike_add (uint64_t, uint64_t);
LEAN_EXPORT lean_object* spike_step(lean_object*);
LEAN_EXPORT lean_object* spike_pair(lean_object*);
LEAN_EXPORT lean_object* spike_io  (lean_object*);
LEAN_EXPORT uint64_t     spike_size(lean_object*);
```

Four things follow, none of them obvious from the prose:

**(a) Scalars never touch `lean_object`.** `spike_add` is
`uint64_t(uint64_t, uint64_t)`. `spike_size : ByteArray → UInt64` returns
an unboxed `uint64_t`. A host that only needs a length or a status code
pays nothing for boxing.

**(b) `ByteArray` is a scalar array.** `lean.h` lines 196–201 define

```c
typedef struct {
    lean_object   m_header;
    size_t        m_size;
    size_t        m_capacity;
    uint8_t       m_data[];
} lean_sarray_object;
```

built by `lean_alloc_sarray(elem_size, size, capacity)` (line 1014) with
`elem_size = 1`, read by `lean_sarray_size` (1029) and `lean_sarray_cptr`
(1038). Constructing one from the host is a single allocation plus one
`memcpy`; reading one back is a pointer and a length. This is as cheap as
a bytes ABI can be — no serialization layer between the host buffer and
the Lean value.

**(c) A product return is an ordinary constructor.** `spike_pair :
ByteArray → ByteArray × ByteArray` compiles to

```c
v___x_26_ = lean_alloc_ctor(0, 2, 0);
lean_ctor_set(v___x_26_, 0, v___x_24_);
lean_ctor_set(v___x_26_, 1, v___x_25_);
return v___x_26_;
```

so **D-d's two-output shape `step(stateBytes, opBytes) → (stateBytes',
receiptBytes)` is expressible directly**: the caller reads
`lean_ctor_get(r, 0)` and `lean_ctor_get(r, 1)` and then `lean_dec`s the
constructor, which frees both fields. Verified end to end (ran).

**(d) `IO` loses its world token at the export.** This is the most
surprising result and I would not have predicted it. `spikeIO : ByteArray
→ IO ByteArray` exports as a **one**-argument function. The compiler's
internal boxed wrapper still takes two:

```c
LEAN_EXPORT lean_object* lp_spike_spikeIO___boxed(lean_object* v_input_32_, lean_object* v_a_33_){
  v_res_34_ = spike_io(v_input_32_);
  return v_res_34_;
}
```

The result is an `IO` result object: tag 0 = ok, tag 1 = error, checked by
`lean_io_result_is_ok` (`lean.h:2918`, `return lean_ptr_tag(r) == 0;`) and
unwrapped by `lean_io_result_get_value` (2920), which returns a **borrowed**
reference (`b_lean_obj_res`) — so the caller `lean_dec`s the result
object, not the value inside it. Ran and confirmed.

For our seam this is a non-decision: D-d's kernel is a pure function, so
nothing needs `IO`. But it is worth knowing that the `IO` wrapper costs one
extra constructor allocation and one extra tag test per call, and nothing
else.

### What `@[export]` does **not** refuse (ran — the load-bearing negative)

`Reject.lean` marks a polymorphic function, a type-class-dispatched
function, and a theorem with `@[export]`. `lake env lean -c` emits C with
no diagnostic at all:

```c
LEAN_EXPORT lean_object* reject_poly(lean_object*, lean_object*);
LEAN_EXPORT lean_object* reject_cls (lean_object*, lean_object*, lean_object*, lean_object*);
```

`reject_poly`'s first parameter is the erased type argument;
`reject_cls`'s first two are the type and the `Add` instance dictionary.
And `grep -c reject_thm` on the emitted C returns **0** — the theorem's
export produced no symbol and no warning.

Two consequences for REF-6, both concrete:

1. **`@[export]` is not a type-checked ABI gate.** A signature that drifts
   into polymorphism still "exports"; it just grows silent extra
   parameters that a bytes host cannot supply. The ABI discipline must be
   ours, enforced mechanically.
2. **A missing export is silent.** A REF-6 gate must assert that each
   expected symbol *exists in the built artifact* — `nm`/`dumpbin` against
   a pinned symbol list — because absence produces no build error.

---

## 2. Memory and lifetime

### The convention, quoted from `lean.h` (comment block, lines 150–174)

> In our runtime, a Lean function consume the reference counter (RC) of
> its argument or not. We say this behavior is part of the "calling
> convention" for the function.
>
> 1- "standard" calling convention if it consumes/decrements the RC. …
> When this calling convention is used for an argument `x`, then it is
> safe to perform destructive updates to `x` if its RC is 1.
>
> 2- "borrowed" calling convention if it doesn't consume/decrement the RC,
> and it is the responsibility of the caller to decrement the RC.

and for results: "standard" means "The caller is responsible for consuming
the RC of the result." The typedefs at lines 176–181 document which is
which: `lean_obj_arg` (owned argument), `b_lean_obj_arg` (borrowed),
`lean_obj_res` (owned result), `b_lean_obj_res` (borrowed result).

The FFI page adds, quoted: "Return values and `@[export]` parameters are
always owned at the moment." So an `@[export]`ed function **consumes every
`lean_object *` it is passed and hands back an object the caller must
release**. There is no borrowing at the export boundary. The `@&` borrow
annotation applies to `@[extern]`, not to us.

### What that means in practice (ran)

`spike_size` compiles to `lean_byte_array_size(input); lean_dec_ref(input);`
— it really does consume. `main.c` therefore never `lean_dec`s an argument
it passed in, and `lean_dec`s every result exactly once. That program runs
clean.

The counters themselves: `lean_inc`/`lean_dec` (lean.h 559, 561) delegate
to `lean_inc_ref`/`lean_dec_ref`, which are **non-atomic** when
`m_rc > 0`. From the header comment at line 124:

> The reference counter `m_rc` field also encodes whether the object is
> single threaded (> 0), multi threaded (< 0), or reference counting is not
> needed (== 0).

Objects become multi-threaded via `lean_mark_mt` (line 610) — the atomic
path — or persistent via `lean_mark_persistent` (611). Nothing does this
for you.

### The cost model the host controls (ran)

Because arguments are owned, an owned array at RC 1 can be updated in
place. Measured directly:

| input | result |
| --- | --- |
| RC 1, `size == capacity` | **copied** (grow) |
| RC 1, spare capacity | **mutated in place** |
| RC 2 (host kept a reference) | **copied**, host's copy intact |

This is the whole per-call cost story for a bytes ABI, and the host holds
the lever: allocate with headroom, hand the object over, do not keep a
second reference.

### Leaks and double-frees

The rule is short enough to state as law for REF-6: **for each call, one
`lean_dec` on each returned object, zero on any argument.** For a product
return, `lean_dec` the constructor only — its fields are freed with it
(ran, confirmed by `main.c` §4 releasing only `pr`).

---

## 3. Initialization

### The documented sequence (quoted)

The reference prints a C block introduced by "Together with initialization
of the Lean runtime, code like the following should be run exactly once
before accessing any Lean declarations:". Its load-bearing lines:

```c
void lean_initialize_runtime_module();
void lean_initialize();
char ** lean_setup_args(int argc, char ** argv);

lean_object * initialize_A_B(uint8_t builtin);

argv = lean_setup_args(argc, argv); // if using process-related functionality
lean_initialize_runtime_module();
// necessary (and replaces `lean_initialize_runtime_module`) for code that (indirectly) accesses the `Lean` package:
//lean_initialize();

lean_object * res;
uint8_t builtin = 1;
res = initialize_foo_A_B(builtin);
if (lean_io_result_is_ok(res)) { lean_dec_ref(res); }
else { lean_io_result_show_error(res); lean_dec(res); return ...; }

//lean_init_task_manager();  // necessary for code that (indirectly) uses `Task`
lean_io_mark_end_initialization();
```

Also quoted: "The initializer for module `A.B` in a package `foo` is called
`initialize_foo_A_B`." Confirmed (ran): package `spike`, module `Spike`
gives `initialize_spike_Spike`.

### Idempotence — two different answers for two different functions

Quoted, of *module* initializers: "Module initializers will automatically
initialize any imported modules. They are also idempotent (when run with
the same `builtin` flag), but not thread-safe."

The emitted C shows exactly why, and exactly how thin the guarantee is:

```c
static bool _G_initialized = false;
LEAN_EXPORT lean_object* initialize_spike_Spike(uint8_t builtin) {
  if (_G_initialized) return lean_io_result_mk_ok(lean_box(0));
  _G_initialized = true;
  ...
```

A plain `bool`. Two threads entering concurrently both see `false`. Ran:
calling it a second time returns ok and does nothing.

The *runtime* initializer is a different matter. Its definition at tag
`v4.33.0`
(<https://github.com/leanprover/lean4/blob/v4.33.0/src/runtime/init_module.cpp>,
Apache 2.0, fetched via `gh api …?ref=v4.33.0`) is, verbatim:

```cpp
extern "C" LEAN_EXPORT void lean_initialize_runtime_module() {
    initialize_alloc();
    initialize_debug();
    initialize_object();
    initialize_io();
    initialize_thread();
    initialize_mutex();
    initialize_process();
    initialize_stack_overflow();
    initialize_libuv();
}
```

**No guard.** Whatever idempotence it has is whatever each of those nine
sub-initializers has; the top-level function does not provide it. Calling
it twice did not crash on this machine (ran), which is evidence of nothing
in particular. The honest kernel design is to guard it ourselves — which is
what `shim.c` does with its own `g_booted` flag.

`lean_initialize` (the `//`-commented alternative in the manual's block)
is **not in the runtime**: `nm -g` across the toolchain's archives finds
`T lean_initialize` only in `libleancpp.a` and `libleanshared.dll.a`, while
`libleanrt.a` provides `lean_initialize_runtime_module`,
`lean_initialize_thread`, `lean_finalize_thread`, `lean_setup_args`, and
`lean_finalize_task_manager` (ran). A kernel that never touches the `Lean`
package therefore never needs `lean_initialize` — and never links the
elaborator. That is worth ~65 MB, see §5.

### Is it safe from a non-main thread?

The manual does not say `lean_initialize_runtime_module` may be called
from a non-main thread, and I did not test it. It does say (quoted): "any
other thread not spawned by the Lean runtime itself must be initialized for
Lean use by calling `void lean_initialize_thread();` and should be
finalized in order to free all thread-local resources by calling `void
lean_finalize_thread();`". Treat "boot the runtime once, on one thread,
before anything else" as the rule; anything else is unattested.

### The trap: skipping initialization appears to work (ran)

Four probes — documented order, doubled runtime init, module-init-only,
and **no initialization whatsoever** — all exit 0 and all produce correct
answers. The reason is visible in the emitted C: in v4.33.0 closed terms
are either statically allocated persistent objects
(`.m_header = {.m_rc = 0, …}`, so no allocation is needed) or built lazily
behind `lean_obj_once`, whose token is

```c
typedef struct { _Atomic(int) state; _Atomic(int) lock; } lean_once_cell_t;
```

— atomic, therefore thread-safe (lean.h 3250–3253). This module simply
never needed its initializer.

This is precisely the kind of green that DEV-670's naive-corpus history
teaches us to distrust. **A REF-6 gate that only checks "it produced the
right bytes" will not catch a missing initializer**, and the failure will
arrive later, on a different module, as memory corruption.

---

## 4. Threading — the direct input to T4

### What the documentation states (quoted)

* Module initializers are "idempotent (when run with the same `builtin`
  flag), but **not thread-safe**."
* "any other thread not spawned by the Lean runtime itself must be
  initialized for Lean use by calling `void lean_initialize_thread();` and
  should be finalized … by calling `void lean_finalize_thread();`"

That is the whole of what the FFI chapter says about threads. It does not
state whether two host threads may call the same export concurrently on
**disjoint** objects; that is inferred from the RC design, not documented.

### What the runtime's design implies (quoted from `lean.h`)

Reference counting is non-atomic while `m_rc > 0` and atomic once an
object is marked multi-threaded (`m_rc < 0`, `lean_mark_mt`). Therefore
concurrency is safe *only* if no Lean object is reachable from two threads
— which is exactly the per-session-isolation shape D-a's T4 asks about,
and exactly what D-d's stateless ABI gives us for free: the kernel owns no
state, so no object survives a call.

### What ran

**In-process C threads, own objects each, `lean_initialize_thread()`
called:** 1, 4, and 8 threads × 20 000 iterations at 10 KB, all correct,
0.005 s / 0.006 s / 0.012 s wall. No corruption, no crash.

**A thread that omitted `lean_initialize_thread()`:** 1000 iterations,
completed cleanly. This proves nothing. Do not read it as a licence.

**cgo, and here is the real finding.** The Go host calling the kernel
through cgo:

| mode | result |
| --- | --- |
| naive — no `runtime.LockOSThread()` | **access violation `0xc0000005`** inside `kernel_step`, reproduced twice (the second run faulted earlier, inside `kernel_init`) |
| `runtime.LockOSThread()` before any Lean call | correct, stable, 20 000 × 100 calls |
| `LockOSThread` **plus** `lean_initialize_thread()` on that same thread | correct throughout, then **faults at `PC=0x0` in the deferred `lean_finalize_thread()`** |

Read together: cgo migrates a goroutine's C calls across OS threads, and
the Lean runtime's thread-local state does not follow. The safe pattern on
this machine is **pin the OS thread; do not call the per-thread
init/fini pair on the thread that booted the runtime.**

### Verdict against T4

T4 asks whether "the runtime is unsafe under per-session serialization
(concurrent sessions corrupt it)". On the evidence: **T4 is not breached**
— serialized, isolated sessions ran clean at 8× concurrency. But the
threading requirement is *sharper than T4's wording*, and the sharpening
matters:

> The runtime is safe under per-session serialization **provided every
> host thread that calls it is an OS thread the runtime has been told
> about, and no Lean object is shared across threads.** In Go that means
> `runtime.LockOSThread()` or a dedicated kernel goroutine/thread; it is
> not a property the host gets by default.

I recommend the REF-0 record capture that sentence beside the T4 row,
because a naive cgo integration crashes and a lucky one does not, and the
difference is invisible in a passing test.

---

## 5. The runnable example, and what building it taught

Committed at
`docs/research/reference/rq1-lean-c-backend/minimal-example/`; every
transcript is in `TRANSCRIPT.md` there. It builds and runs. Four findings
came out of making it build that no amount of reading would have produced.

### The gcc link wall (ran)

Compiling against `lean.h` with MSYS2 gcc 16.1.0 succeeds. **Linking
`libleanrt.a` with MSYS2 `ld` fails**, with hundreds of undefined
references of the form

```
undefined reference to `std::__1::basic_ostream<char, std::__1::char_traits<char> >::flush()'
undefined reference to `__gxx_personality_seh0'
```

`std::__1::` is LLVM libc++; MSYS2's libstdc++ cannot supply it. The
toolchain's own `leanc` (clang 22.1.4, bundled libc++) links it in one
step. Practical rule: **compile with whatever you like; link with `leanc`.**

Its link line, which is also the honest inventory of what the native lane
drags in (from `leanc -###`): `-lgmp -luv -lssl -lcrypto -lc++ -lc++abi
-lunwind -licu -lpsapi -luser32 -ladvapi32 -liphlpapi -luserenv -lws2_32
-ldbghelp -lole32 -lshell32 -lcrypt32 -lgdi32 -lbcrypt`, plus
`--stack 104857600` and `--gc-sections`. GMP, libuv, OpenSSL and ICU are in
the native lane's trusted base whether we use them or not.

### Artifact size — T2 (ran)

| artifact | bytes |
| --- | --- |
| bare C driver, `leanc`-linked, no Lean | 83,456 |
| the same driver with the Lean runtime | 4,063,232 |
| self-contained `kernel.dll` | 4,038,656 |

**Delta over a bare driver: ≈ 3.8 MB.** T2's ceiling is 64 MB. Not
breached, with a factor of ~17 in hand. Import table of the static build is
Windows system DLLs only — no Lean DLL.

### The shared-library trap (ran) — a genuine hazard for the native lane

`lake build Spike:shared` succeeds and produces a **66,560-byte** DLL,
which looks wonderful until you read its imports: `libInit_shared.dll`,
which chains to `libleanshared.dll` (69,306,880 B), `libleanshared_1.dll`
(51,915,776 B), `libleanshared_2.dll` (57,494,016 B). **178 MB of runtime
behind a 65 KB stub** — a T2 breach by a factor of nearly three, and an
easy one to miss because the DLL you built is tiny. `leanc -### -shared`
confirms the driver appends `-lInit_shared -lleanshared_2 -lleanshared_1
-lleanshared`.

Passing the static archives explicitly instead
(`libInit.a libStd.a libleanrt.a` with `--gc-sections`) gives a
**self-contained 4,038,656-byte DLL** whose only imports are Windows
system DLLs. That is the recipe the native fallback lane needs, and it is
in `build.ps1`.

### The shim is not optional

`bun:ffi` and cgo dlopen symbols by name. They cannot construct a
`ByteArray`, because `lean_alloc_sarray` is a **`static inline` in
`lean.h`** — a header-only definition with no linkable symbol. Confirmed
(ran): `nm -g --defined-only kernel.dll | grep lean_alloc_sarray` finds
nothing, and `lean_initialize_runtime_module` is likewise absent from the
DLL's exports because `--gc-sections` drops what the module does not call.

So the kernel must ship its own plain-C façade compiled on the Lean side
of the wall — `shim.c` in the example — exporting

```c
int  kernel_init(void);
int  kernel_step(const uint8_t *in, size_t in_len, uint8_t **out, size_t *out_len);
void kernel_free(uint8_t *p);
const char *kernel_build_id(void);
void kernel_thread_init(void);
void kernel_thread_fini(void);
```

No Lean object crosses. This is a small, real addition to REF-6's scope
that the draft does not currently name, and it is hand-written C — which
brushes the 2026-08-15 no-hand-authoring ruling. My reading: the ruling
forbids hand-authoring *where generation is possible*, and this façade is
boundary plumbing, not seam behavior. But it is trusted code on the
critical path and should be named as such rather than absorbed silently.
The WASM lane may make it moot, since a wasm module's exports are already
flat numeric functions over linear memory — that is RQ-3's question, not
mine.

### Both host lanes, end to end (ran)

| host | 10 KB round trip |
| --- | --- |
| in-process C (`QueryPerformanceCounter`, 20 000 samples) | **p50 0.3 µs**, p90 0.3 µs, p99 0.5 µs |
| `bun:ffi` (`Bun.nanoseconds`, 20 000 samples) | **p50 4.1 µs**, p90 6.5 µs, p99 15.4 µs |
| cgo, `LockOSThread` (batched, 50 × 2000) | **p50 4.085 µs**, p90 6.526 µs, p99 8.054 µs |

Both hosts returned the correct bytes, including refusal-as-data on empty
input (`[1]`), and both computed the SHA-256 of the artifact they loaded —
D-d's host-journaled digest, demonstrated rather than asserted.

### Verdict against T3

T3's binding cell is "steady-state p50 of `spike_step` at the 10 KB
payload, any host, any platform, breached above 1 ms". Worst measured host
p50 is **4.1 µs — 244× under the threshold**. **T3 not breached** in the
native lane on Windows.

Three honest deflations, because this number will be quoted:

1. The Lean function under test appends one byte. A real kernel doing RFC
   8785 canonicalization and a step will cost more — though the numbers
   suggest the *boundary* is not where the cost will be.
2. This is the native lane. The WASM lane (wazero, Bun WebAssembly) is
   unmeasured here and is RQ-3's and the spike's business.
3. Windows only. See §"What this does not answer".

### Verdict against T1

**T1 not breached on Windows**: the spike links and runs, in three
configurations (freestanding C executable, `bun:ffi`, cgo). The Linux leg
is untested — `wsl --list` shows an `Ubuntu` distribution on this machine
but it has neither `lean` nor `gcc`, and provisioning one was outside this
run's remit. **T1 remains open for Linux.**

---

## 6. `panic!` is a silent-drift channel, not a trap (ran)

D-d says: "Total by refusal … A WASM trap or native crash on any input is
a gate failure." That wording quietly assumes the failure mode is a trap.
On the C backend it is not.

`spikePanic` hits `panic!` on empty input. The C caller sees:

```
before spike_panic(empty)
after  spike_panic(empty): returned, len=0
PROCESS SURVIVED PANIC
PANIC at spikePanic Spike:49:4: spike: empty input      [stderr]
```

Exit code 0. The function **returned the `Inhabited` default** — an empty
`ByteArray` — and the only signal was a line on stderr the host never
reads. A host that checks return codes and ignores stderr records a
successful step with a wrong answer.

For a program whose standing law is "no silent drift channel", this is the
sharpest single finding in the report. Recommendation, with cost, in §7.

---

## 7. Recommendations, each with its cost and its reversal

### R1. Keep D-a's backend-first choice. No threshold is breached.

T1 (Windows), T2 (3.8 MB vs 64 MB), T3 (4.1 µs vs 1 ms) and T4
(per-session isolation clean at 8×) all pass in the native lane on
Windows. Nothing found here argues for the freestanding-C-generator
fallback.

*Cost:* the trusted base gains the Lean C backend, the Lean runtime, the
`leanc`/clang 22.1.4 driver and LLVM libc++, and — in the native lane —
GMP, libuv, OpenSSL, ICU and libunwind, because they are on `leanc`'s link
line whether we call them or not. Plus an interface its own documentation
calls "unstable".
*Reversal:* cheap while REF-6 has not landed; the generator fallback is
already named in D-a and the ABI in D-d is backend-agnostic.

### R2. Add a symbol-existence gate to REF-6.

A pinned list of expected exports, checked against the built artifact with
`nm`/`dumpbin`, failing the build on any absence.

*Why:* `@[export]` on a proposition emits nothing, silently; a renamed or
mistyped export emits nothing, silently.
*Cost:* one CI step and one list to maintain.
*Reversal:* delete the step.

### R3. Forbid `panic!` and partiality in kernel code, mechanically.

Two complementary gates, both cheap:

1. A **source-level** check that no kernel-namespace declaration reaches
   `panic!`, `partial`, `sorry`, or `Inhabited.default` in its compiled
   path — Lean can be asked this; the existing footprint gate is the
   natural home.
2. An **artifact-level** check that the emitted C for the kernel names no
   panic entry point. This is a one-line grep: the compiler emits the
   declaration `lean_object* lean_panic_fn_borrowed(lean_object*,
   lean_object*);` at the top of `Spike.c` and a per-call-site wrapper
   (`lp_spike_panic___at___00spikePanic_spec__0`). A count of
   `lean_panic_fn` over the kernel's emitted C must be 0 — ran: 2 for
   `Spike.c`, which contains `spikePanic`, and 0 for the C emitted from
   `Reject.lean`, which contains no partial definition.

Additionally, since a panic writes to stderr and returns junk, the host
side should treat any kernel-produced stderr output during a session as a
gate failure.

*Why:* without this, D-d's totality obligation is enforced against traps
that the C backend does not produce, and unenforced against the failure
mode it does.
*Cost:* one more gate; some Lean definitions must be rewritten to be
visibly total rather than convenient.
*Reversal:* remove the gate — but the drift channel comes back with it.

### R4. Own the initialization, do not inherit it.

The kernel façade should call `lean_initialize_runtime_module()` exactly
once behind its own guard (the runtime's has none), then the module
initializer, then `lean_io_mark_end_initialization()`, and should never
call `lean_initialize` (the elaborator's, in `libleancpp`). Hosts call
`kernel_init()`; it is idempotent because we made it so.

*Cost:* ~15 lines of hand-written C in the shim, on the critical path,
named in the trusted base.
*Reversal:* trivial.

### R5. Write the threading contract into the record now.

Add beside T4: *safe under per-session serialization provided every
calling thread is a pinned OS thread known to the runtime and no Lean
object is shared.* Go hosts use `runtime.LockOSThread()` or a dedicated
kernel thread; `lean_finalize_thread()` is never called on the thread that
booted the runtime.

*Cost:* a constraint on protod's integration shape at REF-7.
*Reversal:* none needed — it is a statement of fact, not a design choice.
If the WASM lane is selected it becomes moot for Go, since wazero does not
run the Lean C runtime's thread-locals; that is RQ-3's to confirm.

### R6. Do not build the native fallback's shared library with `lake build :shared`.

Link it from `libInit.a libStd.a libleanrt.a` with `--gc-sections`, as
`build.ps1` does. The `:shared` target's 65 KB DLL is a 178 MB dependency
in disguise.

*Cost:* a bespoke link step instead of a Lake target, and a Lake API
change could break it.
*Reversal:* trivial; it is one array of flags.

### R7. Add `-Wl,--no-insert-timestamp` (or the platform equivalent) before REF-6 writes its regeneration gate.

Measured (ran): the **emitted C is byte-identical** across a clean
rebuild — Lean's backend is deterministic here, which is the good news for
D-bc. The **linked DLL is not**: two clean rebuilds differed, and
`objdump -p` shows a `Time/Date` field carrying the build clock. With
`-Wl,--no-insert-timestamp`, two clean rebuilds (`.lake` and `*.o` deleted,
two seconds apart) were byte-identical.

*Caveat, stated plainly:* same machine, same absolute path, same
toolchain. Path- and machine-independence is untested and is RQ-6's
question. Do not read this as "reproducible builds solved".
*Cost:* one linker flag.
*Reversal:* remove the flag.

---

## 8. What the surveyed material does not answer for our seam

1. **Linux.** Every executed result is Windows. T1's Linux leg, the
   `.so` equivalent of the shared-library trap, and whether MSYS2-vs-clang
   linking has a Linux analogue are all open. The available WSL image
   lacks a toolchain and provisioning one was out of scope.

2. **The WASM lane — all of it.** D-bc's ratified lane is
   `.wasm` + wazero + Bun. Nothing here touches it. Whether the Lean
   runtime targets wasm32 at all, what it does about GMP and libuv (both
   on the native link line), what the shim looks like when the ABI is
   already flat, and what per-call and per-instance costs look like are
   RQ-3's and the spike's. `lean.h` contains exactly one `LEAN_EMSCRIPTEN`
   conditional (line 3244, a pointer-literal width workaround), which is
   evidence that *someone* has compiled it for emscripten and evidence of
   nothing more.

3. **`ByteArray`'s C representation is not in the FFI documentation I
   retrieved.** Everything §1(b) says about `lean_sarray_object` is read
   off `lean.h` and confirmed by execution. Since the FFI interface is
   documented as unstable, an undocumented corner of it is doubly so. A
   REF-6 gate should include a representation smoke test that fails loudly
   on a toolchain bump.

4. **Concurrent calls into the *same* export from multiple threads is
   inferred, not documented.** The FFI chapter says only that foreign
   threads must be initialized. That disjoint-object concurrency is safe
   follows from the RC design and from 8×20 000 clean iterations — neither
   of which is a guarantee. If REF-7 wants concurrency beyond
   one-session-at-a-time, it needs its own evidence.

5. **`lean_init_task_manager`.** The manual's block comments it as
   "necessary for code that (indirectly) uses `Task`". Whether any code
   the kernel transitively imports uses `Task` is unchecked. If the kernel
   ever does, initialization grows a step.

6. **What the panic path costs under a real workload.** `panic!` returning
   `default` was demonstrated for `ByteArray`, where the default is empty
   and therefore *looks* like a plausible answer. For a record type the
   default may be more plausible still. No bound is offered here on how
   far such a value could travel before something noticed.

7. **Whether `@[export]` symbol names can collide.** They are unmangled
   and global. Two modules exporting the same name were not tested. For a
   single-kernel artifact this is theoretical; for a link that also pulls
   in `libStd.a`, less so.

8. **Nothing here addresses whether extraction is *proved*.** The Lean C
   backend is a compiler, not a verified one, and this report makes no
   claim otherwise. That boundary — and the calibrated language for
   stating it in VERIFICATION.md — is RQ-2's, and D-e's fourth obligation
   depends on it, not on anything measured here.

## 9. Decision impact

**No ratified decision changes.** D-a's mechanism, D-bc's fallback
topology, D-d's ABI and D-e's obligations all survive this evidence
intact; the thresholds T1–T4 are unbreached in the lane and platform
tested.

Two additions to REF-6's scope are recommended rather than decided: the
plain-C façade (§5, R-item on the shim) and the panic/partiality gate
(R3). Both are new work the draft does not name. Neither reverses
anything; both make an existing obligation enforceable rather than
aspirational.

---

## Independent verification — 2026-08-16

Adversarial re-check by a verifier who did not write the report above and
was instructed to refute it where refutable. Nothing in the body was
edited; findings precede fixes, and this addendum is the record.

**Method.** Every primary source was re-fetched independently (the FFI
reference page, `init_module.cpp` at tag `v4.33.0` via `gh api`, `lean.h`
on disk, the grill record and draft 17/19 in this repo). The runnable
example was **not** re-run in place: its sources were copied to a
scratch directory at a *different absolute path*
(`…/scratchpad/verif/`) and rebuilt from clean with `build.ps1`, so the
re-run is an independent build, not a re-read of committed binaries. All
host lanes were re-executed there. Toolchain identical to the report's:
Lean 4.33.0 `d8b1897`, MSYS2 gcc 16.1.0, GNU ld 2.46, go1.26.5
windows/amd64, bun 1.3.14, `leanc` → clang 22.1.4.

### Verdicts

| # | Claim | Source | Verdict | Evidence from the re-run |
| --- | --- | --- | --- | --- |
| 1 | FFI page states the interface is unstable / internal; "Return values and `@[export]` parameters are always owned at the moment"; module initializers "idempotent (when run with the same `builtin` flag), but not thread-safe" | lean-lang.org reference 4.33.0, FFI chapter | **CONFIRMED** | All three strings returned verbatim on an independent fetch; headings 12.4 / 12.4.1 / 12.4.1.1 / 12.4.1.2 / 12.4.2 / 12.4.3 as printed. `grep LEAN_MANUAL_ROOT $(lean --print-prefix)/include/lean/version.h` → line 14, `"https://lean-lang.org/doc/reference/4.33.0/"`. The version pin is the toolchain's own, not a guess. |
| 2 | `lean_initialize_runtime_module()` at v4.33.0 has no idempotence guard; body is nine unconditional sub-initializer calls | github.com/leanprover/lean4 `src/runtime/init_module.cpp` @ v4.33.0 | **CONFIRMED** | `gh api …?ref=v4.33.0` returns exactly the nine calls in the stated order (`alloc, debug, object, io, thread, mutex, process, stack_overflow, libuv`). No `static bool`, no once-flag, no mutex. Contrast holds: emitted `Spike.c:215` carries `static bool _G_initialized = false;` and the early return at 218. |
| 3 | `@[export]` on a theorem emits no symbol and no diagnostic; polymorphic / class-dispatched exports grow erased-type and dictionary parameters | `Reject.lean` | **CONFIRMED** | `lake env lean -c reject.out.c Reject.lean` → exit 0, stdout empty, stderr empty. Emitted C declares `reject_poly(lean_object*, lean_object*)` and `reject_cls(lean_object*, lean_object*, lean_object*, lean_object*)`; `grep -c reject_thm` → 0. `grep -c lean_panic_fn` → 0 for Reject, 2 for `Spike.c`, so R3's artifact gate is mechanizable as described. |
| 4 | `panic!` returns the `Inhabited` default to the C caller; process exits 0; only signal is one stderr line | `Spike.lean` / `probe.c panic` | **CONFIRMED** | `./spike_probe.exe panic` → stdout `after  spike_panic(empty): returned, len=0` / `PROCESS SURVIVED PANIC`, exit code **0**, stderr and only stderr carries `PANIC at spikePanic Spike:49:4: spike: empty input`. No trap, no abort. |
| 5 | cgo without `runtime.LockOSThread()` faults `0xc0000005`; stable with it; `lean_finalize_thread()` on the booting thread faults at `PC=0x0` | `go-host/main.go` | **CONFIRMED** | `naive` faulted **4 of 4** runs — three inside `main._Cfunc_kernel_step`, one inside `main._Cfunc_kernel_init`, exactly the two variants the report records. `lock` completed 3 of 3 (p50 4.19 / 4.37 / 4.87 µs). `lock+ti` completed the benchmark then faulted 3 of 3 in `main._Cfunc_kernel_thread_fini`, twice at literally `PC=0x0`. This is the report's sharpest operational finding and it reproduces. |
| 6 | `lean_alloc_sarray` is a `static inline` with no linkable symbol, so a plain-C shim is mandatory in the native lane | `lean.h:1014`; `nm` over `kernel.dll` | **CONFIRMED** (one adjacent sentence refuted — see D1, D6) | `lean.h:1014` is exactly `static inline lean_obj_res lean_alloc_sarray(unsigned elem_size, size_t size, size_t capacity) {`. `nm -g --defined-only kernel.dll \| grep -c lean_alloc_sarray` → 0. `kernel_build_id`, `kernel_free`, `kernel_init`, `kernel_step`, `kernel_thread_init`, `kernel_thread_fini` all present, and they are 6 of the DLL's 154 PE exports. |
| 7 | `lake build Spike:shared` → ~65 KB DLL behind ~178 MB of Lean DLLs; explicit static archives + `--gc-sections` → self-contained ~4 MB DLL, system imports only | `build.ps1` vs `lake build Spike:shared` | **CONFIRMED** | `Spike:shared` → 66,560 B; `objdump -p` → `libInit_shared.dll`, `ucrtbase.dll`, `KERNEL32.dll`. `libleanshared{,_1,_2}.dll` = 69,306,880 + 51,915,776 + 57,494,016 = **178,716,672 B**. `leanc -### -shared` appends `-lInit_shared -lleanshared_2 -lleanshared_1 -lleanshared`. `build.ps1`'s `kernel.dll` = 4,038,656 B, imports `ucrtbase KERNEL32 ADVAPI32 icu bcrypt WS2_32 IPHLPAPI USERENV USER32 SHELL32 ole32 dbghelp` — Windows only. |
| 8 | ~0.3 µs in-process, ~4.1 µs bun:ffi, ~4.085 µs cgo at 10 KB; added-artifact delta ~3.8 MB against T2's 64 MB | `probe.c bench`, `bun-host.ts`, go `lock` | **CONFIRMED** at the order of magnitude the claim scopes itself to | Re-run: C `payload=10240 p50=0.300us p90=0.300us p99=0.500us`; `bun:ffi p50=3.900us`; cgo `p50=4.186/4.366/4.869µs`. `do_bench` (probe.c 151–162) brackets **both** the host→Lean `mk_ba` alloc+memcpy and the Lean→host `memcpy` inside the timer, so the figure is a round trip. Sizes reproduced byte-for-byte at a different path: `bare_leanc.exe` 83,456, `spike_native.exe` 4,063,232, `kernel.dll` 4,038,656 → delta 3,979,776 B. Three orders under T3; ~17× under T2. |
| 9 | An `@[export]`ed `IO` function drops the world token — one C parameter, `IO` result object returned | `Spike.lean spikeIO`; emitted `Spike.c` | **CONFIRMED** | `Spike.c:34` `LEAN_EXPORT lean_object* spike_io(lean_object*);`; `Spike.c:109` `lp_spike_spikeIO___boxed(lean_object*, lean_object*)` calling `spike_io(v_input_32_)` with one argument at 113. `lean.h:2918` is `static inline bool lean_io_result_is_ok(b_lean_obj_arg r) { return lean_ptr_tag(r) == 0; }`; 2920 returns `b_lean_obj_res` — borrowed, as the report says. `spike_native.exe` prints `spike_io is_ok=1` and the correct six bytes. |
| 10 | Emitted C is byte-identical across clean rebuilds; the linked PE is not until `-Wl,--no-insert-timestamp` | `build.ps1` | **CONFIRMED, and stronger than claimed** | Rebuilt from clean at a *different absolute path*: `Spike.c` → `43d451…350d` and `kernel.dll` → `ce47d5…0519`, **both identical to the committed artifacts**, i.e. this build is path-independent on this machine — more than the report claims, and the report's refusal to claim it is the correct discipline. Negative control: relinking without the flag gave `2CC9DE…` then `0300B1…` two seconds apart, and `objdump -p` shows `Time/Date  Sun Aug 16 17:51:05 2026` versus `Wed Dec 31 18:00:00 1969` with the flag. |

### Sampled beyond the listed set

| Claim | Verdict | Evidence |
| --- | --- | --- |
| §5 gcc link wall: MSYS2 `ld` cannot resolve `libleanrt.a`'s `std::__1::` / `__gxx_personality_seh0` | **CONFIRMED** | Reproduced verbatim, including `std::__1::basic_ostream<char, std::__1::char_traits<char> >::flush()` and `__gxx_personality_seh0`. `leanc` links the same inputs at exit 0. |
| §5 `leanc` link-line inventory (GMP, libuv, OpenSSL, ICU, libunwind, `--stack`, `--gc-sections`) | **CONFIRMED** | `leanc -### bare.o` emits every named flag, `-licu`, `--stack` and `--gc-sections` included. `leanc --version` → `clang version 22.1.4`. |
| §3 `lean_initialize` lives only in `libleancpp.a` / `libleanshared.dll.a`; `libleanrt.a` provides the runtime/thread/args entry points | **CONFIRMED** | `nm -g` over the five archives: `T lean_initialize` count 1 / 1 / 0 / 0 / 0; `libleanrt.a` defines `lean_initialize_runtime_module`, `lean_initialize_thread`, `lean_finalize_thread`, `lean_setup_args`, `lean_finalize_task_manager`. |
| §3 all four init probes exit 0, including `noinit` | **CONFIRMED** | `order`, `double`, `modonly`, `noinit` each exit 0 with correct bytes. The trap the report names is real. |
| §2 ownership: `spike_size` consumes its argument | **CONFIRMED** | `Spike.c:117-126` — `lean_byte_array_size(v_input_35_); lean_dec_ref(v_input_35_);`, exactly as quoted. |
| Every `lean.h` line citation (124, 150 ff, 176 ff, 196–201, 1014, 1029, 1038, 2918, 2920, 3244, 3250–3253) | **CONFIRMED** | Each line reads as quoted, including the source's own grammatical slip "a Lean function consume the reference counter" — a good sign the quoting is verbatim rather than reconstructed. File is 3,333 lines / 133,942 bytes as the README states; exactly one `LEAN_EMSCRIPTEN` conditional, at 3244. |
| §8.3 `ByteArray`'s C representation is absent from the reference manual | **CONFIRMED, and widened** | Not on the FFI chapter, and not on the dedicated *Byte Arrays* page either, which says only that byte arrays "are represented in compiled code as dynamic arrays". The Array FFI section documents `Array`, not `ByteArray`. |
| The report's quotations of D-a's T2/T3/T4 and D-d's totality obligation | **CONFIRMED verbatim** | `docs/design/2026-08-16-ref0-extraction-grill-record.md` lines 26–28 and 68 match word for word, including "A WASM trap or native crash on any input is a gate failure." Note that draft 17's compressed restatement says only "a trap is a gate failure" — the report quotes the grill record, which is the ratified text. |
| §5 "`lean_initialize_runtime_module` is likewise absent from the DLL's exports because `--gc-sections` drops what the module does not call" | **REFUTED** | See D1. |
| `TRANSCRIPT.md`'s claim that every block is "pasted from the run that produced it" | **REFUTED** | See D2. |
| §1 "`Spike.lean` declares five exports" | **REFUTED** | See D3. |

### Attempts to refute the decision impact — all failed

The conclusion "no ratified decision changes" was attacked on five fronts
and survives each:

1. **T2 by the letter.** The grill record binds T2 to "static lib plus
   linked-binary delta over a bare driver". Measured independently:
   9,584 + 3,979,776 B. Unbreached with ~16× margin. The 178 MB
   `:shared` path *would* breach T2 by ~3×, and the report is the thing
   that found it and named the fix.
2. **T3 by the letter.** "Breached if any host on any platform exceeds
   1 ms." Three hosts re-measured; worst p50 4.87 µs. Unbreached in the
   lane and platform tested, which is exactly how the report scopes it.
3. **T4 by the letter, using the report's own crash.** The strongest
   available attack: a naive cgo host faults, so is the runtime "unsafe
   under per-session serialization"? No — T4's binding parenthetical is
   "concurrent sessions corrupt it", and the naive fault is goroutine
   thread-migration in a *single* session, not cross-session corruption.
   Isolated sessions ran clean at 8 × 20,000 on re-run. T4 stands
   unbreached, and the report's R5 sharpening is the correct disposal of
   the residue rather than a threshold breach.
4. **T1.** Re-verified: three configurations link and run on Windows.
   Linux remains untested and the report says so in two places.
5. **D-bc, D-e.** Nothing measured here touches the WASM lane or the
   RQ-2 trusted-base question, and the report claims nothing about them.

Both recommended REF-6 additions hold. The shim's necessity is
confirmed in substance (see D6 for the narrower reason), and R3's
artifact gate is mechanically real: `lean_panic_fn` counts 2 against
`Spike.c` and 0 against the C emitted from `Reject.lean`, on re-run.
The T4 rewording recommendation is confirmed by 4-of-4 naive faults
against 3-of-3 clean `lock` runs — a difference genuinely invisible to a
test that only checks output bytes.

### Defects

**D1 — a "(ran)" claim that does not survive re-running (§5, "The shim is
not optional").** The sentence "`lean_initialize_runtime_module` is
likewise absent from the DLL's exports because `--gc-sections` drops what
the module does not call" is wrong on the fact and wrong on the
mechanism. Under the report's own command,
`nm -g --defined-only kernel.dll`, the symbol **is** present, at
`0000000180030020 T lean_initialize_runtime_module`, alongside
`lean_initialize_thread` and 6,383 other defined symbols. It cannot have
been garbage-collected: `shim.c`'s `kernel_init` calls it directly. It is
absent from the PE *export table* (154 names) for an unrelated reason —
`shim.c` marks its own entry points `__declspec(dllexport)`, and MinGW's
auto-export-everything behaviour is suppressed as soon as any explicit
export exists. The conclusion the sentence was supporting is unaffected;
the reasoning is not evidence.

**D2 — `TRANSCRIPT.md` asserts verbatim provenance it does not have.**
The file opens "Nothing below is reconstructed; each block is pasted from
the run that produced it." Two blocks contradict that. §1's
`nm -g spike_Spike.a` listing shows 9 symbols; building the committed
`Spike.lean` yields 12 — the listing is missing `spike_panic`,
`spike_total`, and `lp_spike_panic___at___00spikePanic_spec__0`, i.e. it
predates the two definitions §6 and §7 of the report depend on. §6's
bench lines drop the `min=` field that `probe.c`'s `printf` (lines
164–167) emits, so they were edited after capture. Under the house
"generated vectors, not hand-typed" ruling, a transcript that claims
paste-fidelity must have it; the fix is to regenerate the file
mechanically, not to weaken the sentence.

**D3 — §1 miscounts the exports.** "`Spike.lean` declares five exports"
— it declares **seven**; the reference README says seven. The five
signatures shown are each correct, but the count is wrong and it is the
same stale-by-two error as D2.

**D4 — reference-area comments contradict the findings they support.**
`Reject.lean`'s docstring says the file "is *expected to fail* to
compile" and instructs "Uncomment one case at a time", while all three
cases are live and the file compiles at exit 0 with no diagnostic — the
exact opposite of the load-bearing negative in §1, sitting in the file
that establishes it. `Spike.lean`'s docstring says "Four exports"
(seven exist). `go-host/main.go` says "time batches of 100" where
`per = 2000`. A reader who trusts the comments reaches the wrong
conclusion from the right artifact.

**D5 — the 178 MB figure omits the DLL actually imported.**
`spike_Spike.dll` imports `libInit_shared.dll`, which is 27,901,952 B and
is not in the sum. The real transitive chain is ≈ 206.6 MB. The error is
conservative for the report's own argument but the number is quoted as a
dependency total and will be re-quoted.

**D6 — "mandatory" is right, the stated reason is narrower than the
evidence.** `lean_alloc_sarray` being `static inline` is not the only
consideration: `lean_byte_array_mk` (1051), `lean_copy_byte_array`
(1053) and `lean_byte_array_push` (1081) are `LEAN_EXPORT` and genuinely
linkable. The conclusion survives — no *linkable* symbol yields an
initial empty `ByteArray` (`lean_mk_empty_byte_array`, 1056, is also
`static inline`), a per-byte `push` loop is not an ABI, and the built
`kernel.dll` exports no `lean_*` symbol at all — but REF-6 should record
the accurate reason, because a toolchain bump could change which of these
is inline.

**D7 — the shim demonstrated is not D-d shaped, and §9 slightly
overstates what was demonstrated.** `shim.c` line 16 admits the ABI is
"deliberately D-d shaped, **minus the second output** for brevity";
`kernel_step` is one buffer in, one buffer out. D-d's
`step(stateBytes, opBytes) → (stateBytes', receiptBytes)` two-output
shape is demonstrated at the Lean/C level by `spike_pair` — genuinely,
including the `lean_ctor_get` / single-`lean_dec` release rule — but not
through the façade the report recommends REF-6 make mandatory. REF-6
must not read `shim.c` as an ABI-complete template.

**D8 — the declared lead/`UNVERIFIED` taxonomy is never used.** §Grounding
promises three kinds of claim, but the word "lead" and the mark
`UNVERIFIED` appear nowhere in the body. Draft 19 rule 4 requires the
mark on anything reconstructed rather than executed or quoted, and there
are untagged inferences: "cgo migrates a goroutine's C calls across OS
threads, and the Lean runtime's thread-local state does not follow" is a
mechanism claim about the Go runtime with no primary source and no
experiment isolating it (the observed faults are consistent with it but
do not establish it), and D1's `--gc-sections` sentence is an untagged
inference presented as executed fact. The report's overall discipline is
otherwise strong — sources dated, the what-it-does-not-answer section
present and genuinely eight items long, every recommendation carrying
cost and reversal, the reference README recording provenance and
honestly recording that the manual's licence could **not** be
established — which is why the two places the taxonomy lapsed are worth
naming rather than excusing.

**Net.** No listed load-bearing claim is refuted; no invented API,
signature, flag or configuration key was found — every symbol, flag and
line number in the report exists and reads as quoted. The defects are one
false mechanism sold as executed, one transcript whose provenance claim
outruns its contents, and a cluster of stale counts and comments. The
decision impact stands.
