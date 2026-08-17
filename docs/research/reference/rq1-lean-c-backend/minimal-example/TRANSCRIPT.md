# RQ-1 minimal example — recorded transcripts

All runs on the operator's machine, 2026-08-16. Nothing below is
reconstructed; each block is pasted from the run that produced it.

## Machine and toolchain

```
$ elan --version
elan 4.2.3 (b6cec7e10 2026-06-08)

$ lake --version
Lake version 5.0.0-src+d8b1897 (Lean version 4.33.0)

$ lean --version
Lean (version 4.33.0, x86_64-w64-windows-gnu, commit
d8b18978322de05a8f3dba51ef03cf5461676c17, Release)

$ gcc --version
gcc.exe (Rev5, Built by MSYS2 project) 16.1.0

$ go version
go version go1.26.5 windows/amd64

$ bun --version
1.3.14
```

Windows 11 Home 10.0.26200. The `leanc` driver in this toolchain reports
`clang version 22.1.4`, target `x86_64-w64-windows-gnu`.

## 1. The Lean side builds and emits C

```
$ lake build Spike:static
info: spike: no previous manifest, creating one from scratch
info: toolchain not updated; already up-to-date
✔ [2/4] Built Spike (847ms)
✔ [3/4] Built Spike:c.o (688ms)
✔ [4/4] Built Spike:static (89ms)
Build completed successfully (4 jobs).
```

Symbols in the resulting archive:

```
$ nm -g .lake/build/lib/spike_Spike.a | grep spike_
0000000000000000 T initialize_spike_Spike
0000000000000000 T lp_spike_spikeAdd___boxed
0000000000000000 T lp_spike_spikeIO___boxed
0000000000000000 T lp_spike_spikeSize___boxed
0000000000000000 T spike_add
0000000000000000 T spike_io
0000000000000000 T spike_pair
0000000000000000 T spike_size
0000000000000000 T spike_step
```

The compiler's own declarations, from `.lake/build/ir/Spike.c`:

```c
LEAN_EXPORT uint64_t spike_add(uint64_t, uint64_t);
LEAN_EXPORT lean_object* spike_step(lean_object*);
LEAN_EXPORT lean_object* spike_pair(lean_object*);
LEAN_EXPORT lean_object* spike_io(lean_object*);
LEAN_EXPORT uint64_t spike_size(lean_object*);
```

Note `spike_io` takes **one** argument, not two: the `IO` world token is
dropped at the export. The internal boxed wrapper still carries it:

```c
LEAN_EXPORT lean_object* lp_spike_spikeIO___boxed(lean_object* v_input_32_, lean_object* v_a_33_){
_start:
{
lean_object* v_res_34_;
v_res_34_ = spike_io(v_input_32_);
return v_res_34_;
}
}
```

The emitted module initializer, verbatim:

```c
static bool _G_initialized = false;
LEAN_EXPORT lean_object* initialize_spike_Spike(uint8_t builtin) {
lean_object * res;
if (_G_initialized) return lean_io_result_mk_ok(lean_box(0));
_G_initialized = true;
res = initialize_Init(builtin);
if (lean_io_result_is_error(res)) return res;
lean_dec_ref(res);
...
```

The guard is a plain `bool`, not an atomic — which is exactly what the
manual means by "idempotent … but not thread-safe".

## 2. The gcc link wall

Compiling against `lean.h` with MSYS2 gcc succeeds. Linking `libleanrt.a`
with MSYS2 `ld` does not:

```
$ gcc main.o .lake/build/lib/spike_Spike.a -L$T/lib/lean -lleanrt -lStd -lInit -lm -o spike_native.exe
ld.exe: libleanrt.a(debug.cpp.obj):debug.cpp:(.text+0x3c): undefined reference to `operator delete(void*)'
ld.exe: libleanrt.a(debug.cpp.obj):debug.cpp:(.text+0x110): undefined reference to
    `std::__1::basic_ostream<char, std::__1::char_traits<char> >::operator<<(int)'
ld.exe: libleanrt.a(debug.cpp.obj):debug.cpp:(.xdata+0x8): undefined reference to `__gxx_personality_seh0'
... (hundreds more)
collect2.exe: error: ld returned 1 exit status
```

`std::__1::` is LLVM libc++; `__gxx_personality_seh0` is its unwinder.
MSYS2's libstdc++ cannot supply them. Linking with the toolchain's own
`leanc` works:

```
$ leanc main.o .lake/build/lib/spike_Spike.a -o spike_native.exe
(exit 0)
```

`leanc -### bare.o` shows why — the driver's own link line, abridged:

```
-lgmp -luv -lpsapi -luser32 -ladvapi32 -liphlpapi -luserenv -lws2_32
-ldbghelp -lole32 -lshell32 -lssl -lcrypto -lunwind -lcrypt32 -lgdi32
--start-group -lleancpp -lLean --end-group -lStd --start-group -lInit
-lleanrt --end-group -lc++ -lc++abi -lLake ... -lucrtbase --stack 104857600
-licu --gc-sections -lm -lbcrypt ...
```

## 3. The C caller runs

```
$ ./spike_native.exe
init: second call is_ok=1
spike_add(40,2) = 42
in1 exclusive before call = 1
spike_step -> len=6 bytes=68656c6c6f21 ascii="hello!"
spike_step reused input buffer in place: 0
pair.fst -> len=6 bytes=68656c6c6f21 ascii="hello!"
pair.snd -> len=2 bytes=6f6b ascii="ok"
spike_io is_ok=1
spike_io value -> len=6 bytes=68656c6c6f21 ascii="hello!"
rc=2 input reused in place: 0 (0 means the runtime copied)
original still intact -> len=5 bytes=68656c6c6f ascii="hello"
rc=1 + spare capacity reused in place: 1
spike_size(empty) = 0
spike_total(empty) -> len=1 bytes=01 ascii=""
OK
```

Reading the lines that matter: an owned `ByteArray` at RC 1 with spare
capacity is mutated in place; the same array at RC 2 is copied and the
host's copy is left intact.

## 4. `panic!` does not trap — it returns junk

```
$ ./spike_probe.exe panic
before spike_panic(empty)
after  spike_panic(empty): returned, len=0
PROCESS SURVIVED PANIC
PANIC at spikePanic Spike:49:4: spike: empty input      [on stderr]
```

Exit code 0. The panicking function returned `default : ByteArray`, i.e.
the empty array, and the only signal was a line on stderr.

## 5. Initialization: everything "works", which is the trap

```
$ ./spike_init.exe order    ; documented sequence
order: spike_step ok, len=3
order: spike_total(empty) len=1 first=1
order: DONE
$ ./spike_init.exe double   ; lean_initialize_runtime_module() twice
double: survived two lean_initialize_runtime_module()
...
$ ./spike_init.exe modonly  ; module init, no runtime init
modonly: initializer is_ok=1
...
$ ./spike_init.exe noinit   ; no initialization at all
noinit: calling export with no initialization
noinit: spike_step ok, len=3
noinit: spike_total(empty) len=1 first=1
noinit: DONE
```

All four exit 0. The reason is visible in the emitted C: in v4.33.0 closed
terms are either statically allocated persistent objects

```c
static const lean_sarray_object lp_spike_spikeTotal___closed__2_value =
  {.m_header = {.m_rc = 0, ...}, .m_size = 1, .m_capacity = 1, .m_data = {1}};
```

or lazily built behind an atomic once-cell

```c
v___x_78_ = lean_obj_once(&lp_spike_spikeTotal___closed__1,
                          &lp_spike_spikeTotal___closed__1_once,
                          _init_lp_spike_spikeTotal___closed__1);
```

so this particular module never needed its initializer. That is a property
of this module, not a licence.

## 6. Per-call cost, in-process C caller

`spike_step` at four payloads, 20000 samples each (5000 for 100 KB), timed
with `QueryPerformanceCounter`, host→Lean copy and Lean→host copy included:

```
payload=64     iters=20000  p50=0.000us p90=0.100us p99=0.100us max=16.000us
payload=1024   iters=20000  p50=0.100us p90=0.100us p99=0.200us max=15.400us
payload=10240  iters=20000  p50=0.300us p90=0.300us p99=0.500us max=11.700us
payload=102400 iters=5000   p50=6.600us p90=6.700us p99=10.700us max=46.400us
```

## 7. Host threads, own state each

Each thread allocates and frees its own Lean objects; nothing is shared.
Each calls `lean_initialize_thread()` on entry.

```
threads=1 iters=20000 payload=10240 all_ok=1 wall=0.005s
threads=4 iters=20000 payload=10240 all_ok=1 wall=0.006s
threads=8 iters=20000 payload=10240 all_ok=1 wall=0.012s
```

A 1000-iteration run on a thread that *omitted* `lean_initialize_thread()`
also completed without incident. Absence of a crash is not evidence of
safety; see the cgo result below for what the same omission costs.

## 8. Artifact sizes (T2 evidence)

```
bare_leanc.exe        83,456     driver-linked C with no Lean at all
spike_native.exe   4,063,232     the same driver plus the Lean runtime
kernel.dll         4,038,656     self-contained shared library
spike_Spike.a          9,584     the module's own archive
Spike.c                9,624     the emitted C
```

Delta over the bare driver: **3,980 KB ≈ 3.8 MB**.

Import table of `spike_native.exe` — Windows system DLLs only, no Lean DLL:

```
ucrtbase.dll KERNEL32.dll icu.dll bcrypt.dll ADVAPI32.dll WS2_32.dll
IPHLPAPI.DLL USERENV.dll USER32.dll SHELL32.dll ole32.dll dbghelp.dll
```

## 9. The shared-library trap

`lake build Spike:shared` produces a 66,560-byte DLL — which imports
`libInit_shared.dll`, which chains to the Lean shared runtime:

```
$ objdump -p .lake/build/lib/spike_Spike.dll | grep 'DLL Name'
	DLL Name: libInit_shared.dll
	DLL Name: ucrtbase.dll
	DLL Name: KERNEL32.dll

$ ls -l $T/bin/libleanshared*.dll
69,306,880  libleanshared.dll
51,915,776  libleanshared_1.dll
57,494,016  libleanshared_2.dll
```

178 MB of runtime behind a 65 KB stub. `leanc -###  -shared` confirms the
driver adds `-lInit_shared -lleanshared_2 -lleanshared_1 -lleanshared`.

Passing the static archives explicitly instead gives a self-contained
4,038,656-byte DLL whose imports are Windows system DLLs only.

## 10. `bun:ffi` against the self-contained DLL

```
$ bun bun-host.ts
kernel_init -> 0
kernel_build_id -> [String: "rq1-spike/leanprover-lean4-v4.33.0"]
artifact sha256 -> ce47d53ca9eb81e9d9362912fe0cd95fd4ca3dfa69311cbd2577d4f543820519
step('hello') -> [ 0, 104, 101, 108, 108, 111 ]
step('')      -> [ 1 ]
bun:ffi 10KB round trip  p50=4.100us p90=6.500us p99=15.400us
```

## 11. cgo — the threading result

```
$ go run . naive          # no runtime.LockOSThread()
mode: naive
artifact sha256 -> ...
kernel_init -> 0
kernel_build_id -> rq1-spike/leanprover-lean4-v4.33.0
step("hello") -> [0 104 101 108 108 111] <nil>
step("")      -> [1] <nil>
Exception 0xc0000005 0x0 0xffffffffffffffff 0x7ffecbe36212
PC=0x7ffecbe36212
signal arrived during external code execution
runtime.cgocall(0x7ff633f0e590, 0x328639323c98)
main._Cfunc_kernel_step(...)
```

Reproduced twice; the second run faulted earlier, inside `kernel_init`.

```
$ go run . lock           # runtime.LockOSThread() before any Lean call
mode: lock
kernel_init -> 0
step("hello") -> [0 104 101 108 108 111] <nil>
step("")      -> [1] <nil>
cgo 10KB round trip (batch/2000)  p50=4.085µs p90=6.526µs p99=8.054µs
```

```
$ go run . lock+ti        # LockOSThread AND lean_initialize_thread()
mode: lock+ti
... all output correct, benchmark completes ...
Exception 0xc0000005 0x8 0x0 0x0
PC=0x0
```

The fault in `lock+ti` occurs at the deferred `kernel_thread_fini()`, i.e.
`lean_finalize_thread()` on the thread that had already been initialized by
`lean_initialize_runtime_module()`. Read together: pin the OS thread, and do
**not** call the per-thread init/fini pair on the thread that booted the
runtime.

## 12. Rebuild determinism

```
emitted C  build1 = 43D45152A1D105F783B983B59C2EC1DBD03E96314F314A6450126781E263350D
emitted C  build2 = 43D45152A1D105F783B983B59C2EC1DBD03E96314F314A6450126781E263350D
C identical: True

kernel.dll build1 = 8FF40BAEDB3D4EAAFA1CCAEF410E382393EAE7F579C5BCA31796078450A105E4
kernel.dll build2 = BC8AC635ED0197EE4EB3DB900FDDFC3119DF4440431F6EC4BFFCE51C672571DF
DLL identical: False
```

Cause, from `objdump -p kernel.dll`:

```
Time/Date		Sun Aug 16 17:35:26 2026
```

With `-Wl,--no-insert-timestamp` added to the link, two `.lake`-deleted,
`*.o`-deleted clean rebuilds two seconds apart:

```
clean rebuild 1 = CE47D53CA9EB81E9D9362912FE0CD95FD4CA3DFA69311CBD2577D4F543820519
clean rebuild 2 = CE47D53CA9EB81E9D9362912FE0CD95FD4CA3DFA69311CBD2577D4F543820519
identical: True
```

Same machine, same absolute path, same toolchain. Path- and
machine-independence is untested here and belongs to RQ-6.

## 13. What `@[export]` does not refuse

`Reject.lean` carries a polymorphic function, a type-class-dispatched
function, and a theorem, all marked `@[export]`. `lake env lean -c` emits C
without a single diagnostic:

```c
LEAN_EXPORT lean_object* reject_poly(lean_object*, lean_object*);
LEAN_EXPORT lean_object* reject_cls(lean_object*, lean_object*, lean_object*, lean_object*);
```

`reject_poly`'s first parameter is the erased type argument; `reject_cls`
takes the type, then the `Add` instance dictionary, then the two operands.
`grep -c reject_thm` on the emitted C returns **0** — the theorem's export
produced no symbol and no warning.

Counting the panic entry point over the same two files:

```
Spike.c    lean_panic_fn occurrences: 2   (spikePanic is partial)
Reject C   lean_panic_fn occurrences: 0
```

## 14. Not attempted here

The Linux half of REF-0's spike. `wsl --list` reports an `Ubuntu`
distribution on this machine, but it has neither `lean` nor `gcc`
installed, and provisioning one was out of scope for this run. T1 is
therefore answered for Windows only.
