# RQ-6 reference area — byte-identical artifact generation

Companion to `docs/research/2026-08-16-rq6-reproducible-artifacts.md`.
Everything here is either **own-authored** (written for this report, no
third-party code) or a **link plus a distilled note**. No third-party code is
vendored, so no third-party license text needs to be carried here; the
licenses of the sources quoted in the report are recorded below anyway,
because the dispatch discipline asks for them.

All retrieval dates are **2026-08-16**. All executions are on Windows 11
(10.0.26200), Git Bash, Go 1.26.5 windows/amd64, Bun 1.3.14, Lean 4.33.0
(`x86_64-w64-windows-gnu`, commit `d8b1897832`).

---

## Own-authored artifacts in this directory

| File | What it is | Ran? |
| --- | --- | --- |
| `build-path-probe.sh` | Builds one Go source to `GOOS=wasip1` wasm from two directories whose names differ in length, with and without `-trimpath`, and compares sha256. The executable form of the build-path nondeterminism claim. | Yes — `transcripts/2026-08-16-build-path-probe-windows.txt` |
| `lean-c-emission-probe.sh` | Asks whether `lean -c` emits byte-identical C for the same source, and whether the containing directory leaks into that C. | Yes — `transcripts/2026-08-16-lean-c-emission-probe-windows.txt` |
| `wasm-sections.mjs` | Dependency-free lister of a `.wasm` module's sections, flagging the custom sections that carry build identity (`name`, `producers`, `build_id`, `target_features`, `.debug_*`) and printing the `producers` text verbatim. Own decoder — it never instantiates the module. | Yes — `transcripts/2026-08-16-wasm-sections-windows.txt` |
| `ci-rebuild-identity.sample.yml` | Sample (inactive) CI shape for REF-6's gate: blocking same-platform rebuild identity at two different checkout paths, blocking deployment-digest pin, non-blocking cross-platform build identity, blocking corpus-through-the-one-artifact on both platforms. | Not run — it references build scripts REF-6 has not written yet. |
| `transcripts/` | Verbatim stdout of the three runs above. | — |

Licence for the four own-authored files: they are part of this repository and
carry the repository's licence.

`build-path-probe.sh` writes and builds a two-line Go program; it needs the Go
toolchain on PATH. `lean-c-emission-probe.sh` needs `lean` on PATH.
`wasm-sections.mjs` runs under Bun or Node with no dependencies.

---

## Links surveyed (no code vendored)

### Reproducible-builds practice

| Item | What it is | Licence | URL |
| --- | --- | --- | --- |
| Reproducible Builds — definition | The field's definition of a reproducible build; the phrase "given the same source code, build environment and build instructions" is the one our gate has to honour. | Site content CC BY-SA 4.0 (footer) | https://reproducible-builds.org/docs/definition/ |
| Reproducible Builds — documentation index | The enumerated catalogue of nondeterminism sources: env variations, `SOURCE_DATE_EPOCH`, volatile inputs, stable order for inputs, stripping, value initialization, version information, timestamps, timezones, locales, archive metadata, stable order for outputs, randomness, build path, system images. | CC BY-SA 4.0 | https://reproducible-builds.org/docs/ |
| Reproducible Builds — build path | The single most on-point page for our gate; names `-ffile-prefix-map`, `-fmacro-prefix-map`, `-fdebug-prefix-map`. | CC BY-SA 4.0 | https://reproducible-builds.org/docs/build-path/ |
| Reproducible Builds — stable order for inputs | Directory-listing order is not guaranteed; mitigations are explicit enumeration and `LC_ALL=C sort`. Link order changes a wasm binary. | CC BY-SA 4.0 | https://reproducible-builds.org/docs/stable-inputs/ |
| `SOURCE_DATE_EPOCH` specification | The standardised environment variable for pinning "now". | CC BY-SA 4.0 | https://reproducible-builds.org/docs/source-date-epoch/ |
| Reproducible Builds — tools | `diffoscope` (recursive difference explainer), `reprotest` (deliberately varies the environment), `strip-nondeterminism`, `disorderfs`, `rebuilderd`. | CC BY-SA 4.0 | https://reproducible-builds.org/tools/ |

### Toolchain primary sources

| Item | What it is | Licence | URL |
| --- | --- | --- | --- |
| Emscripten `tools/system_libs.py` | Defines `DETERMINISTIC_PREFIX = '/emsdk/emscripten'` with the comment "to produce reproducible builds across platforms", and passes `-ffile-prefix-map` / `-fdebug-compilation-dir` — for emscripten's **own system libraries**, not for user translation units. | MIT / UIUC-NCSA (dual, per repo `LICENSE`) | https://github.com/emscripten-core/emscripten/blob/main/tools/system_libs.py |
| Emscripten `tools/cmdline.py` | `output_eol = os.linesep` with the comment "Defaults to using the native EOL on each platform". Generated **text** output is host-EOL by default. | MIT / UIUC-NCSA | https://github.com/emscripten-core/emscripten/blob/main/tools/cmdline.py |
| Emscripten `emcc` docs — `--output-eol` | The documented `windows|linux` override for the above. | MIT / UIUC-NCSA | https://github.com/emscripten-core/emscripten/blob/main/site/source/docs/tools_reference/emcc.rst |
| Emscripten `emcc.py` — `--reproduce=` / `EMCC_REPRODUCE` | Packages the link inputs and the response file into a tar for exact re-invocation. | MIT / UIUC-NCSA | https://github.com/emscripten-core/emscripten/blob/main/emcc.py |
| Emscripten issue #7714 | The emscripten lead's own statement of the same-machine / cross-machine boundary (2018). | Repo licence; issue text is the author's. | https://github.com/emscripten-core/emscripten/issues/7714 |
| LLVM `lld/wasm/Options.td` | `--build-id=[fast,sha1,uuid,0x<hexstring>]`, `--strip-all`, `--strip-debug`, `--keep-section`, `--reproduce`. | Apache-2.0 WITH LLVM-exception | https://github.com/llvm/llvm-project/blob/main/lld/wasm/Options.td |
| LLVM `lld/wasm/Writer.cpp` | `populateProducers()` — the linker synthesises the `producers` section from the input objects, so the compiler version becomes part of the artifact. | Apache-2.0 WITH LLVM-exception | https://github.com/llvm/llvm-project/blob/main/lld/wasm/Writer.cpp |
| LLVM commit `2c090162` | "[Frontend] Recognize environment variable SOURCE_DATE_EPOCH", 2022-10-12; sets `__DATE__`, `__TIME__` **and** `__TIMESTAMP__`. | Apache-2.0 WITH LLVM-exception | https://github.com/llvm/llvm-project/commit/2c090162746a6b901c5639562c090e4bb2b7327e |
| Clang command line reference | `-ffile-prefix-map` ("Implies -ffile-reproducible"), `-fdebug-prefix-map`, `-fdebug-compilation-dir`. | Apache-2.0 WITH LLVM-exception | https://clang.llvm.org/docs/ClangCommandLineReference.html |
| LLVM blog — "Deterministic builds with clang and lld" | Nico Weber, 2019-11-07. The four-level ladder (basic / incremental / local / universal determinism) this report's recommendation is built on. | LLVM project content | https://blog.llvm.org/2019/11/deterministic-builds-with-clang-and-lld.html |
| WASI SDK README | Surveyed for determinism language; there is none. Release assets are per-host (`-x86_64-linux`, `-windows`, `-macos`). | Apache-2.0 | https://github.com/WebAssembly/wasi-sdk/blob/main/README.md |
| WebAssembly core spec — binary module format | Preamble is magic + version; sections 0–13. No timestamp field exists in the format. | W3C Software and Document Notice and License | https://webassembly.github.io/spec/core/binary/modules.html |
| WebAssembly tool-conventions — `ProducersSection.md` | Defines the `producers` custom section (`language`, `processed-by`, `sdk`) and says tools should keep it "even in release builds". | Artistic-2.0 (repo licence) | https://github.com/WebAssembly/tool-conventions/blob/main/ProducersSection.md |
| Binaryen `src/passes/pass.cpp` | Registers `strip-debug`, `strip-dwarf`, `strip-producers`, `strip-target-features` — the passes that remove the identity-bearing custom sections. | Apache-2.0 | https://github.com/WebAssembly/binaryen/blob/main/src/passes/pass.cpp |

### Precedent — how others express the gate

| Item | What it is | Licence | URL |
| --- | --- | --- | --- |
| Go blog — "Perfectly Reproducible, Verified Go Toolchains" | Russ Cox, 2023-08-28. The strongest published claim of host-OS-independent bit-for-bit builds, and the list of what had to be removed to get there. | Go website content (CC BY 4.0 per go.dev) | https://go.dev/blog/rebuild |
| `golang.org/x/build/cmd/gorebuild` | An independent rebuild verifier run against published releases, with its bit-for-bit exceptions enumerated in the package doc. | BSD-3-Clause | https://github.com/golang/build/blob/master/cmd/gorebuild/main.go |
| CosmWasm `optimizer` README | The production "reproducible wasm" pipeline: pinned Docker image, `checksums.txt`, and the explicit statement that the ARM image "produces different wasm artifacts than the Intel version" so only Intel builds may be used for release. | Apache-2.0 | https://github.com/CosmWasm/optimizer/blob/main/README.md |
| SLSA v1.0 FAQ — "What about reproducible builds?" | Why a supply-chain standard does **not** require reproducibility, and treats it as one implementation option. | CC BY 4.0 (slsa.dev) | https://slsa.dev/spec/v1.0/faq |
| Bazel — Hermeticity | "a hermetic build system always returns the same output by isolating the build from changes to the host system"; the isolation is from the host, achieved by treating tools as source. | CC BY 4.0 (bazel.build docs) | https://bazel.build/basics/hermeticity |

---

## Searches that found nothing (absence as a finding)

Recorded so a later reader can re-run them rather than re-guess.

- `WebAssembly/wasi-sdk` issues, GitHub search API, `is:issue reproducible` →
  3 results, none about build reproducibility; `is:issue deterministic` → 1
  result, unrelated ("import function", 2019). The wasi-sdk README contains no
  occurrence of "determin" or "reproduc".
- `emscripten-core/emscripten` issues, `is:issue "different output" windows`
  → 14 results, none reporting a Windows/Linux wasm byte difference.
- Web search, "emscripten emsdk build reproducibility identical wasm Windows
  Linux cross platform 2025" → no published claim of cross-OS byte identity
  for emscripten output, positive or negative.
- Emscripten's own `test_deterministic` (`test/test_other.py`) is about
  **runtime** determinism — `clock_gettime`, `rand()`, `Math.random()` — not
  build determinism. It is not evidence for our question, and is listed here
  so nobody later cites it as if it were.
