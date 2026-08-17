# Reference area — RQ-1, Lean's C backend

Topic subdirectory for `docs/research/2026-08-16-rq1-lean-c-backend.md`.
Everything here is either a link with a distilled summary, or code written
for this investigation. **No third-party code is vendored.**

Retrieval date for every entry below: **2026-08-16**.

---

## Items

### `minimal-example/`

**What it is.** An own-authored, runnable Lean-4-through-the-C-backend
example: five `@[export]`ed Lean functions, a freestanding C caller, three
C probe programs, a plain-C shim, a `bun:ffi` host and a cgo host, a build
script, and `TRANSCRIPT.md` recording exactly what ran and what it printed
on the operator's machine on 2026-08-16.

**Where it came from.** Written for foldlab RQ-1 on 2026-08-16. Not copied
or adapted from any other project. The only text taken from elsewhere is
the *shape* of the initialization sequence, which follows the C code block
printed in the Lean 4.33.0 language reference (cited below); the code in
`main.c` is written independently against that documented sequence and
against `<lean/lean.h>` as shipped in the toolchain.

**License.** Same as this repository. It contains no third-party code.

**Files.**

| File | What it is |
| --- | --- |
| `Spike.lean` | seven `@[export]` definitions probing scalars, `ByteArray`, product returns, `IO`, `panic!`, and refusal-as-data |
| `Reject.lean` | three declarations `@[export]` should arguably refuse; the point is that it does not. Emits C without diagnostics |
| `lakefile.toml`, `lean-toolchain` | pins `leanprover/lean4:v4.33.0` |
| `main.c` | the freestanding C caller: init, ownership, in-place vs copy, product return, `IO` unwrap |
| `probe.c` | `panic`, `thread`, `thread-noinit`, `bench`, `threadbench` modes |
| `initprobe.c` | `order` / `double` / `modonly` / `noinit` — initialization-order probes |
| `shim.c` | the plain-C façade a non-C host actually needs (see the report, §The shim is not optional) |
| `bun-host.ts` | `bun:ffi` host against the self-contained DLL |
| `go-host/main.go` | cgo host, with `naive` / `lock` / `lock+ti` threading modes |
| `build.ps1` | reproduces every artifact the report cites |
| `TRANSCRIPT.md` | recorded output of every run, verbatim |

**How to run.** `pwsh ./build.ps1`, then the commands in `TRANSCRIPT.md`.
Requires elan-managed `leanprover/lean4:v4.33.0`, MSYS2 gcc, Bun, and Go
with `CGO_ENABLED=1`.

---

## Primary sources (links, not copies)

### Lean 4 language reference — Foreign Function Interface

* URL: <https://lean-lang.org/doc/reference/4.33.0/Run-Time-Code/Foreign-Function-Interface/>
* Version pinned by the toolchain itself: `include/lean/version.h` in
  `leanprover/lean4:v4.33.0` defines
  `#define LEAN_MANUAL_ROOT "https://lean-lang.org/doc/reference/4.33.0/"`.
* Retrieved 2026-08-16.
* License: the Lean 4 reference manual is published by the Lean FRO. Its
  license was **not** established during this investigation, so nothing
  from it is copied into this directory beyond short quotations used as
  evidence in the report.
* Section headings as printed: 12.4 Foreign Function Interface;
  12.4.1 The Lean ABI; 12.4.1.1 Translating Types from Lean to C;
  12.4.1.2 Borrowing; 12.4.2 Initialization; 12.4.3 `@[extern]` in the
  Interpreter.
* Note: `https://lean-lang.org/lean4/doc/dev/ffi.html` still resolves but
  301-redirects to the lean4 repository's `doc/dev/ffi.md`, which as of
  tag `v4.33.0` is a four-line stub pointing at the reference above.

### `include/lean/lean.h`, toolchain `leanprover/lean4:v4.33.0`

* Not a URL — it is on disk in the elan toolchain directory
  (`$(lean --print-prefix)/include/lean/lean.h`), 3333 lines, 133,942 bytes.
* Header comment: "Copyright (c) 2019 Microsoft Corporation. All rights
  reserved. Released under Apache 2.0 license as described in the file
  LICENSE."
* Upstream equivalent:
  <https://github.com/leanprover/lean4/blob/v4.33.0/src/include/lean/lean.h>
* Retrieved (read on disk) 2026-08-16. **Not vendored** — the report
  quotes short excerpts and cites line numbers.

### `src/runtime/init_module.cpp`, lean4 at tag `v4.33.0`

* URL: <https://github.com/leanprover/lean4/blob/v4.33.0/src/runtime/init_module.cpp>
* Fetched 2026-08-16 via
  `gh api repos/leanprover/lean4/contents/src/runtime/init_module.cpp?ref=v4.33.0`.
* License: Apache 2.0 (stated in the file's own header).
* **Not vendored.** The report quotes the body of
  `lean_initialize_runtime_module()` — nine lines — as evidence that the
  function carries no idempotence guard of its own.

---

## What is deliberately absent

No CI configuration, build script, or source file from any third-party
project has been copied here. Where such a thing would have helped, the
report names it and links it instead, per the dispatch discipline in
`scratch/dispatch/19-refinement-research-questions.md` §"The reference
area".
