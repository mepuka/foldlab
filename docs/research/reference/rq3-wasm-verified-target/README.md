# RQ-3 reference area — WebAssembly as a target for verified code

Serves `docs/research/2026-08-16-rq3-wasm-verified-target.md`.
Everything here was retrieved or executed on **2026-08-16** on
Windows 11 (10.0.26200), x86-64, with Go 1.26.5, Bun 1.3.14,
Lean 4.33.0 (elan 4.2.3).

House rule for this area: **links plus own-authored reproductions, never
vendored third-party code.** Nothing in this directory is copied from
another project. The only third-party bytes present are the module-hash
lines in `host-wazero/go.sum`, which are checksums, not code.

---

## Own-authored artifacts committed here

| Path | What it is | Author / licence | Date |
| --- | --- | --- | --- |
| `gen/main.go` | Hand-encodes eight `.wasm` probes directly from the core spec's binary format. No dependencies beyond the Go compiler. | Written for this report; same licence as this repository | 2026-08-16 |
| `gen/go.mod` | Module file for the generator (`module rq3gen`, no requires). | as above | 2026-08-16 |
| `wasm/*.wasm` | The eight generated probes (50–231 bytes each). Regenerable byte-identically by `go run -C gen . ../wasm`. | as above | 2026-08-16 |
| `host-wazero/main.go` | wazero driver: identity, feature acceptance, WASI, import listing, concurrency patterns. | as above | 2026-08-16 |
| `host-wazero/go.mod`, `go.sum` | Declares `github.com/tetratelabs/wazero v1.12.0`. Checksums only — no vendored source. | as above | 2026-08-16 |
| `host-bun/run.ts` | Bun driver, output shaped to diff line-for-line against the wazero transcript. Uses only the standard `WebAssembly` JS API and `node:wasi`. | as above | 2026-08-16 |
| `gowasi/main.go`, `go.mod` | Three-line Go program built with `GOOS=wasip1 GOARCH=wasm`, used only to obtain a realistic WASI import surface. The built `hello.wasm` (2.6 MB) is **not** kept here; rebuild it with the command in `RUNBOOK.md`. | as above | 2026-08-16 |
| `transcripts/*.txt` | Verbatim stdout of the runs described in `RUNBOOK.md`. Nothing edited except where a line is marked `#` as a header. | as above | 2026-08-16 |

`wasm/probe.wasm` has sha256
`ec49aa6decea4c8a6562c6ca5baadf08bd4466dc3368c42e92881ddc3a768b50`.
It was generated twice from two directories on this machine and both
builds produced that digest, which is a small independent datum for
RQ-6.

---

## External sources — links, licences, retrieval dates

Nothing below is copied into this directory. Quotations appear in the
report with their URL and retrieval date.

One naming note: the Go module path is still
`github.com/tetratelabs/wazero`, but the GitHub repository now answers
as `wazero/wazero` (`gh api repos/tetratelabs/wazero` returns
`"full_name":"wazero/wazero"`, checked 2026-08-16). Links below use the
current name; the `go.mod` requirement uses the module path.

| Source | What it establishes | Pin | Licence | Retrieved |
| --- | --- | --- | --- | --- |
| [WebAssembly/design `Nondeterminism.md`](https://github.com/WebAssembly/design/blob/06ec8db6925234eca4a6bcaded4859f16f86b5d8/Nondeterminism.md) | The design repo's enumeration of where the language admits nondeterminism. | commit `06ec8db6925234eca4a6bcaded4859f16f86b5d8` (2025-01-22) | Apache-2.0 (repo `LICENSE`) | 2026-08-16 |
| [WebAssembly core spec, `document/core/appendix/profiles.rst`](https://github.com/WebAssembly/spec/blob/wg-3.0/document/core/appendix/profiles.rst) | The **deterministic profile (DET)**; present at tag `wg-3.0`, absent at `wg-2.0` (HTTP 404 on that path). | tag `wg-3.0` | W3C Software and Document Licence (repo `document/LICENSE`) | 2026-08-16 |
| [WebAssembly core spec, `document/core/exec/numerics.rst`](https://github.com/WebAssembly/spec/blob/main/document/core/exec/numerics.rst) | NaN-propagation rule and the DET-profile exception. | `main`; file last touched `63201edd67269cc06103e0d978607a107d5e0ace` (2026-02-26) | as above | 2026-08-16 |
| [WebAssembly core spec, `document/core/exec/instructions.rst`](https://github.com/WebAssembly/spec/blob/main/document/core/exec/instructions.rst) | `memory.grow` nondeterminism note; "Invoking a host function has non-deterministic behavior." | `main` | as above | 2026-08-16 |
| [WebAssembly/proposals `finished-proposals.md`](https://github.com/WebAssembly/proposals/blob/main/finished-proposals.md) and [`README.md`](https://github.com/WebAssembly/proposals/blob/main/README.md) | Exception handling and tail call are **3.0**; **Threads is Phase 4**, in no released version. | `main` | Apache-2.0 | 2026-08-16 |
| [wazero `api/wasm.go`](https://github.com/wazero/wazero/blob/v1.12.0/api/wasm.go) | `api.Function.Call` goroutine-safety contract. | tag `v1.12.0` (released 2026-05-29) | Apache-2.0 | 2026-08-16 |
| [wazero `config.go`, `api/features.go`, `experimental/features.go`](https://github.com/wazero/wazero/blob/v1.12.0/experimental/features.go) | Default is `CoreFeaturesV2`; threads / tail-call / exception-handling are experimental opt-ins. | tag `v1.12.0` | Apache-2.0 | 2026-08-16 |
| [wazero `site/content/specs.md`](https://github.com/wazero/wazero/blob/v1.12.0/site/content/specs.md) | "wazero conforms with tests defined alongside WebAssembly Core Specification 1.0 and 2.0"; WASI status. | tag `v1.12.0` | Apache-2.0 | 2026-08-16 |
| [wazero `imports/wasi_snapshot_preview1/random.go`](https://github.com/wazero/wazero/blob/v1.12.0/imports/wasi_snapshot_preview1/random.go) | wazero's `random_get` returns `0` on success, `EFAULT` out of range. | tag `v1.12.0` | Apache-2.0 | 2026-08-16 |
| [WASI `snapshot-01` docs](https://github.com/WebAssembly/WASI/blob/snapshot-01/phases/snapshot/docs.md) | `random_get(buf, buf_len) -> errno` — the return value is an errno. | tag `snapshot-01` | Apache-2.0 WITH LLVM-exception | 2026-08-16 |
| [Bun `docs/runtime/nodejs-compat.mdx`](https://github.com/oven-sh/bun/blob/main/docs/runtime/nodejs-compat.mdx) | Bun's own statement that `node:wasi` is partially implemented. | `main` | MIT (Bun repo `LICENSE`) | 2026-08-16 |
| [Lean 4 `src/CMakeLists.txt`](https://github.com/leanprover/lean4/blob/v4.33.0/src/CMakeLists.txt) | Emscripten target settings, GMP handling, LibUV patch, `MAIN_MODULE=1`. | tag `v4.33.0` | Apache-2.0 | 2026-08-16 |
| [Lean 4 `.github/workflows/ci.yml`](https://github.com/leanprover/lean4/blob/v4.33.0/.github/workflows/ci.yml) | The "Web Assembly" CI job, commented out. | tags `v4.15.0` (active) … `v4.16.0`–`v4.33.0` and `master` (commented out) | Apache-2.0 | 2026-08-16 |
| [Lean 4 `src/runtime/mpz.h`](https://github.com/leanprover/lean4/blob/v4.33.0/src/runtime/mpz.h) | `#ifdef LEAN_USE_GMP` … `#else #include "runtime/mpn.h"` — a non-GMP bignum path exists. | tag `v4.33.0` | Apache-2.0 | 2026-08-16 |
| [lean4web README](https://github.com/leanprover-community/lean4web/blob/main/README.md) | Refutes the dispatch's lead: lean4web runs Lean **server-side**, not in wasm. | `main` | Apache-2.0 | 2026-08-16 |
| [T-Brick/lean2wasm](https://github.com/T-Brick/lean2wasm) | The only located tool for compiling user Lean code to wasm; emits `main.js` + wasm via emcc. Last push 2024-03-17. | `main` | MIT | 2026-08-16 |
| [Emscripten `src/settings.js`](https://github.com/emscripten-core/emscripten/blob/main/src/settings.js) | `STANDALONE_WASM` semantics and its `--no-entry` reactor note. | `main`, `emscripten-version.txt` = `6.0.7-git` | MIT / NCSA (repo `LICENSE`) | 2026-08-16 |
| [Emscripten `site/source/docs/compiling/WebAssembly.rst`](https://github.com/emscripten-core/emscripten/blob/main/site/source/docs/compiling/WebAssembly.rst) | Default emscripten output is not a standalone `.wasm`. | `main` | MIT / NCSA | 2026-08-16 |
| [Protzenko, Beurdouche, Merigoux, Bhargavan, *Formally Verified Cryptographic Web Applications in WebAssembly*, IEEE S&P 2019](https://eprint.iacr.org/2019/542.pdf) | The published argument for wasm over C as a target for verified code. | IACR ePrint 2019/542 | ePrint posting; **not** redistributed here — fetch from the URL | 2026-08-16 |
| [Lean Zulip, `#lean4 > lol another WASM question`](https://leanprover-community.github.io/archive/stream/270676-lean4/topic/lol.20another.20WASM.20question.html) | **Lead, not primary.** Maintainer statements from 2021–2022 on standalone/WASI builds. | public archive | archive of a public stream | 2026-08-16 |

---

## What each probe is for

| Module | Question it answers |
| --- | --- |
| `probe.wasm` | Does a **zero-import** module produce identical results across wazero (compiler and interpreter) and Bun? Covers NaN payloads, `memory.grow` at the declared maximum, and a pure byte-in/byte-out function over linear memory. |
| `feat_shared.wasm`, `feat_atomic.wasm` | Does the host accept a module built the way Lean's emscripten target is built (`-pthread` ⇒ shared memory + atomics)? |
| `feat_tailcall.wasm` | Does the host accept a wasm 3.0 tail call? (Validate only — running it tail-loops forever by construction.) |
| `wasi_min.wasm`, `wasi_grow.wasm` | Baseline: can each host's WASI preview1 shim service `fd_write`, before and after guest memory growth? |
| `wasi_rand_ok.wasm`, `wasi_rand_oob.wasm` | The sharp pair. `_start` is `proc_exit(random_get(buf, 32))`, so the **process exit code is the errno the host's shim returned**. No host instrumentation needed to see a divergence. |
