# RQ-6 — Byte-identical artifact generation, in practice

Research seat, 2026-08-16. Serves REF-6's regeneration gate and D-bc's
one-digest-everywhere claim (`scratch/dispatch/17-the-refinement-ladder.md`,
`docs/design/2026-08-16-ref0-extraction-grill-record.md`). Reference area and
provenance ledger: `docs/research/reference/rq6-reproducible-artifacts/`.

All retrieval dates are **2026-08-16**. Executions are on this machine:
Windows 11 (10.0.26200), Git Bash, Go 1.26.5 windows/amd64, Bun 1.3.14,
Lean 4.33.0 (`x86_64-w64-windows-gnu`, commit `d8b1897832`, Release).

**What could not be checked here, stated up front.** Neither emscripten nor
WASI SDK nor any clang targeting wasm32 is installed on this machine or in its
WSL2 Ubuntu (probed: `clang`, `clang-16..19`, `wasm-ld`, `lld`, `emcc`, `zig`,
`cmake` all absent in WSL; `C:\msys64\*\bin\clang.exe` and `wasm-ld.exe` absent
on Windows). Installing them is a network install this seat did not perform.
**Every claim below about emscripten and WASI SDK is therefore quoted from
their source or documentation, never executed**, and is labelled as such. The
Lean→C step and the general build-path mechanics *were* executed, and those
transcripts are committed.

---

## 0. The answer, first

**The promotion question — is cross-platform (Windows↔Linux) BUILD
byte-identity achievable for the emscripten / WASI-SDK toolchain, such that
D-bc's datum should become a gate?**

**No. Do not promote it.** Recommend the datum stay a datum, and that REF-6's
gate wording be tightened in the three specific ways given in §6.

The grounds, in descending strength:

1. **No vendor in our chain publishes a cross-OS byte-identity guarantee.**
   The only statement on record from the emscripten project draws the boundary
   explicitly at one machine, and reports the opposite result across machines
   (§3.1). WASI SDK's documentation contains no occurrence of "determin" or
   "reproduc" at all, and its issue tracker has none on the subject (§3.3).
2. **The one place emscripten *does* engineer cross-platform reproducibility
   covers its own system libraries, not user translation units** (§3.2) — and
   its generated *text* output defaults to the host's line endings (§3.2b).
3. **The nearest production precedent for reproducible wasm — CosmWasm —
   solves it by pinning a Docker image, and declares even a different CPU
   architecture's output non-interchangeable for release** (§5.2).
4. **The one toolchain that did achieve host independence, Go, got there by
   its own authors removing every host input from the compiler over a release
   cycle** (§5.1). That option is not available to us for LLVM.
5. **Operationally decisive: a cross-OS gate is a gate we could not fix.** A
   red result would be an upstream LLVM or emscripten difference. The estate
   would be blocked on someone else's schedule, with no lawful local remedy —
   the exact anti-pattern of a gate that cannot be honoured.

What *is* achievable, and what REF-6 should gate on, is unchanged from the
amendment: same-platform rebuild identity from two clean checkouts, the
deployed artifact's digest as the load-bearing pin, and cross-platform
*behavioural* equality of that one artifact. The amendment was right; this
report supplies its evidence and sharpens its wording.

**Executed findings that change how the gate must be written:**

- Two rebuilds in the *same directory* prove almost nothing. On this machine,
  same-directory rebuilds were byte-identical while a rebuild from a
  differently-named directory was not (§2.1). REF-6's "two clean checkouts"
  must mean **two different paths**, or the gate passes while blind to the
  most common failure.
- **Lean's emitted C can absorb the build directory's name.** `lean -c` is
  path-insensitive when the module name is fixed, but the module name is
  derived from the source path relative to the package root, and it is baked
  into the emitted C as both a string literal and the `initialize_<module>`
  symbol (§2.2). Drive emission through `lake` (or an explicit `-R`), or the
  checkout directory becomes part of the kernel.

---

## 1. The standard nondeterminism sources, and which ones can reach a `.wasm`

The Reproducible Builds project's own definition, verbatim
(https://reproducible-builds.org/docs/definition/):

> "A build is reproducible if given the same source code, build environment and
> build instructions, any party can recreate bit-for-bit identical copies of all
> specified artifacts."

and, on the environment:

> "It is preferable to reduce this set of attributes"

Its documentation index (https://reproducible-builds.org/docs/) enumerates the
sources: **variations in the build environment, `SOURCE_DATE_EPOCH`, volatile
inputs, stable order for inputs, stripping of unreproducible information, value
initialization, version information, timestamps, timezones, locales, archive
metadata, stable order for outputs, randomness, build path, system images.**

Mapped onto a Lean→C→`.wasm` kernel, most of these are inapplicable and two
dominate.

**Inapplicable or nearly so.**

- *Timestamps and archive metadata.* The WebAssembly binary format has no
  timestamp field. Its module preamble is the magic `\0asm` plus a 4-byte
  version, followed by numbered sections 0–13
  (https://webassembly.github.io/spec/core/binary/modules.html). There is
  nowhere for a build time to hide in the format itself — only in a custom
  section a tool chooses to write. `SOURCE_DATE_EPOCH` therefore matters to us
  only if we ever ship the kernel *inside* an archive, or if a translation unit
  uses `__DATE__`/`__TIME__`. Clang honours the variable since commit
  `2c090162746a6b901c5639562c090e4bb2b7327e` (2022-10-12), whose message says
  it "parses SOURCE_DATE_EPOCH and changes all the three macros" (`__DATE__`,
  `__TIME__`, `__TIMESTAMP__`) — one macro more than GCC.
- *Locales and timezones.* Relevant only through sorting; see ordering below.
- *Randomness.* No symbol-name randomisation is documented for the wasm
  backend. `wasm-ld` does offer `--build-id=` with
  `MetaVarName<"[fast,sha1,uuid,0x<hexstring>]">` (`lld/wasm/Options.td`); a
  `uuid` build id would be an injected nondeterminism, so the flag must either
  be left off or pinned to a content-derived value.

**The two that dominate.**

- **Build path.** Verbatim from
  https://reproducible-builds.org/docs/build-path/: *"Most compilers write the
  path of the source in the debug information in order to locate the associated
  source files."* Mitigations named there: `-fdebug-prefix-map=OLD=NEW`,
  `-fmacro-prefix-map=OLD=NEW` ("addresses unreproducibility from `__FILE__`
  macros"), and `-ffile-prefix-map=OLD=NEW` as an alias for both. Clang's own
  reference describes `-ffile-prefix-map` as *"remap file source paths in debug
  info, coverage mapping, predefined preprocessor macros and `__builtin_FILE()`.
  Implies -ffile-reproducible."*
  (https://clang.llvm.org/docs/ClangCommandLineReference.html). This is the
  source that fired on this machine (§2.1) and the one that fires in most
  people's first attempt.
- **Stable order for inputs.** Verbatim from
  https://reproducible-builds.org/docs/stable-inputs/: *"Most filesystems do not
  guarantee that listing files in a directory always results in the same
  order."* Mitigations: *"List all inputs explicitly and ensure they will be
  processed in that order"* and locale-pinned sorting (`LC_ALL=C sort`). For us
  this is the *link order* of the C files Lean emits. A glob over `.lake/build/ir`
  is a live hazard; an explicit, sorted file list is the fix. NTFS and ext4
  differ here, so this is also one of the concrete reasons cross-OS identity is
  fragile even when compilers behave.

**Version information is a source we should deliberately keep.** `wasm-ld`
synthesises the `producers` custom section from its inputs
(`Writer::populateProducers()`, `lld/wasm/Writer.cpp`); the section's
specification (WebAssembly `tool-conventions/ProducersSection.md`) defines the
allowed field names as *"`language`, `processed-by`, `sdk`"* and says *"tools
are encouraged to emit the section or include themselves in an existing section
by default, keeping the producers section even in release builds"*. Observed on
this machine with the own-authored lister on a Go-produced wasm:

```
 0  custom                71  name="producers"   <- identity-bearing
                             producers: language Go go1.26.5 processed-by Go cmd/compile go1.26.5
```

That is version information *inside* the artifact. It means a toolchain bump
changes the kernel digest — which is correct behaviour for us, not a defect, and
is an argument against stripping it (§6.3).

The field's diagnostic tools, from https://reproducible-builds.org/tools/:
**diffoscope** (*"will try to get to the bottom of what makes files or
directories different"*), **reprotest** (deliberately varies the environment),
**strip-nondeterminism**, **disorderfs** (randomises directory-entry order to
*expose* ordering bugs), **rebuilderd**.

---

## 2. What we hold today, measured

### 2.1 Build path leaks into a wasm artifact — executed

Own-authored probe, committed at
`docs/research/reference/rq6-reproducible-artifacts/build-path-probe.sh`;
transcript at `transcripts/2026-08-16-build-path-probe-windows.txt`. It builds
one Go source to `GOOS=wasip1 GOARCH=wasm` from two directories whose names
differ in length.

```
go version go1.26.5 windows/amd64

1. same directory, built twice          : 02cc5ada45b1d1dfaeae81df3a7fbee5a435ccc170916beb4b617ed554ed8058
                                        : 02cc5ada45b1d1dfaeae81df3a7fbee5a435ccc170916beb4b617ed554ed8058
2. different directory, no -trimpath    : 6e65e4828fbb75b12e73fdff7dad3217135eec5d84801d44104ed2f8fe9cf9a6
3. different directory, with -trimpath  : 633c08cf8f8b9e8c1167e87e90d023f36c91963f0dfe96a8724dd6fa67ba223b
                                        : 633c08cf8f8b9e8c1167e87e90d023f36c91963f0dfe96a8724dd6fa67ba223b

sizes: untrimmed A=2605227 B=2605261 trimmed=2599957
```

Three things follow, and they generalise past Go because the mechanism is the
path-in-the-artifact one, not a Go peculiarity:

- A same-directory rebuild is **not** evidence of reproducibility. It passed
  here while the real property failed.
- The leak is visible in the *size*: 34 bytes, the difference in directory-name
  length. A gate that compares sizes only would also have caught this one, and
  will not catch the next.
- The mitigation is a compile-time flag, and it worked completely.

Caveat, stated: this measures the Go toolchain, which is not the toolchain
REF-6 will use. It is offered as a mechanical demonstration of the *source of
nondeterminism*, not as evidence about emscripten.

### 2.2 Lean's emitted C — executed, and one real hazard found

Own-authored probe at `lean-c-emission-probe.sh`; transcript at
`transcripts/2026-08-16-lean-c-emission-probe-windows.txt`.

```
Lean (version 4.33.0, x86_64-w64-windows-gnu, commit d8b18978322de05a8f3dba51ef03cf5461676c17, Release)

1. same dir, emitted twice (relative invocation): 5b53517becd404c75ce04cf67a2014a7687649ed037df7412babcfefab4f3acc
                                                 : 5b53517becd404c75ce04cf67a2014a7687649ed037df7412babcfefab4f3acc
2. different dir, relative invocation            : 5b53517becd404c75ce04cf67a2014a7687649ed037df7412babcfefab4f3acc
3. different dir, ABSOLUTE invocation, no -R     : 832a710cba0d4a51a4083533c6cf6fc38ef779a6b0d8e2752883f45e92bac766
                                                 : c4accc74048536f569a7c9ed394cd8134e40b74d9ec335fc36dd2961c5e90777
CONFIRMED: the directory name is baked into the emitted C:
< // Module: lp.«dir-a».Kern
> // Module: lp.«dir-b-much-longer-name».Kern
< LEAN_EXPORT lean_object* initialize_lp_dir_x2da_Kern(uint8_t builtin) {
> LEAN_EXPORT lean_object* initialize_lp_dir_x2db_x2dmuch_x2dlonger_x2dname_Kern(uint8_t builtin) {
```

**The good news.** Lean 4.33.0's C emission is deterministic run-to-run and
carries **no absolute path**: a search for a drive-letter path fragment in the
emitted C found none. A `panic!` in the source produced a source-position
string literal built from the *module name*, not from a filesystem path. So the
first link of the REF-6 chain does not, by itself, import the build directory.

**The hazard.** The module name is derived from the source path. `lean --help`,
executed:

```
  -c, --c=fname          name of the C output file
  -R, --root=dir         set package root directory from which the module name
                         and type check all imported modules
```

With no `-R` and an absolute source path, the containing directory's name
becomes part of the module name, and therefore part of the emitted C in two
places: a string literal (the panic position) and the `initialize_*` symbol.
That C compiles to different wasm. Since `lake` fixes the package root, the
normal path is safe — but REF-6's generator must go through `lake`, or pass
`-R` explicitly, and the gate should not be the first place we learn otherwise.
This is a **positive, actionable finding for the spike**: the hello-kernel
build should record the exact `lean`/`lake` invocation it used, so REF-6
inherits a known-good one.

### 2.3 What the estate already has right

- `.gitattributes` at the repo root pins line endings for every file:
  `* text=auto eol=lf`, with `*.sh text eol=lf` and `eol=lf` on the fixture
  trees. `git config --get core.autocrlf` returns `false` on this machine.
  A checkout that rewrote line endings would change the *source bytes* the
  compiler sees, and would defeat any cross-platform comparison before the
  toolchain got a say. That precondition is already satisfied here.
- CI is GitHub Actions with `ubuntu-latest` for the Lean gates
  (`.github/workflows/lean-gates.yml`) and a scheduled `windows-latest` job
  (`.github/workflows/windows-induction.yml`). A designated Linux build
  platform plus a Windows behavioural runner is already the estate's shape;
  REF-6's gate fits it without new infrastructure.

### 2.4 What a `.wasm` actually carries — the inspection tool

`wasm-sections.mjs` (own-authored, dependency-free) lists a module's sections
and flags the custom sections that carry build identity. Executed against the
probe artifact:

```
size      2599957 bytes
sha256    633c08cf8f8b9e8c1167e87e90d023f36c91963f0dfe96a8724dd6fa67ba223b
version   1

id  section        size       detail
 0  custom               114  name="go:buildid"
 ...
10  code             1578758
11  data              964961
 0  custom                71  name="producers"   <- identity-bearing
                             producers: language Go go1.26.5 processed-by Go cmd/compile go1.26.5
 0  custom             50034  name="name"   <- identity-bearing

identity-bearing custom sections: 2, 50105 bytes
```

For our kernel the same inspection answers three REF-6 questions at a glance:
which custom sections exist, how many bytes of the artifact are metadata rather
than semantics, and — once D-d's exported build identity lands — whether the
stamped model-source digest is present. It never instantiates the module, so it
is safe to point at an artifact under suspicion.

---

## 3. The wasm toolchain: what is published, and what is absent

### 3.1 Emscripten's own statement of the boundary

The only project-side statement located on this question is from the emscripten
lead (`kripken`, MEMBER) on emscripten issue #7714, "Emscripten reproducible
builds?" (opened 2018-12-21, comment 2018-12-21, issue now closed). Verbatim:

> "This may be an LLVM issue. LLVM guarantees deterministic builds on the same
> machine, but I've seen differences e.g. in the same LLVM build on MacOS and
> Linux emit something different, even when cross-compiling.
>
> Emscripten also guarantees deterministic builds on the same machine, so if
> LLVM gave us the same input we should produce the same output - if not,
> that's a bug."

The reporter's cross-machine comparison in the same thread (macOS vs Ubuntu)
reported `MyMoneroCoreCpp_WASM.wasm: FAILED` and divergence beginning at the
very first LLVM bitcode artifact, to which the maintainer replied:

> "That's the LLVM bitcode, at the very start of what emcc does. So if it's
> different even there, that means the problem is in LLVM"

**Weight, stated honestly.** This is 2018, on the fastcomp-era pipeline
(`.bc` files), from an issue that went stale rather than being resolved. It is
*not* proof that today's emscripten diverges across Windows and Linux. It is
the field's only located statement of the guarantee's shape, and that shape is
"same machine" — with the cross-machine case reported as observed-different by
the person who would know. A promotion decision that needs a *guarantee* does
not have one.

### 3.2 Where emscripten does engineer cross-platform reproducibility

From `emscripten-core/emscripten`, `tools/system_libs.py` (main branch,
retrieved 2026-08-16), verbatim:

```python
# A (fake) deterministic emscripten path to use in __FILE__ macro and debug info
# to produce reproducible builds across platforms.
DETERMINISTIC_PREFIX = '/emsdk/emscripten'
```

and in `get_base_cflags`:

```python
  source_dir = utils.path_from_root()
  relative_source_dir = os.path.relpath(source_dir, build_dir)
  flags += [f'-ffile-prefix-map={source_dir}={DETERMINISTIC_PREFIX}',
            f'-ffile-prefix-map={relative_source_dir}={DETERMINISTIC_PREFIX}',
            f'-fdebug-compilation-dir={DETERMINISTIC_PREFIX}']
```

This is the strongest positive evidence available: emscripten *intends*
cross-platform reproducibility and uses exactly the mitigation the Reproducible
Builds project prescribes. **The scope matters.** `get_base_cflags` builds
emscripten's **own system libraries** into its cache. Nothing here applies to a
user's translation units — our Lean-emitted C would need its own
`-ffile-prefix-map` and `-fdebug-compilation-dir`, passed by us.

### 3.2b Emscripten's text output is host-EOL by default

From `tools/cmdline.py`, verbatim:

```python
  # Specifies the line ending format to use for all generated text files.
  # Defaults to using the native EOL on each platform (\r\n on Windows, \n on
  # Linux & MacOS)
  output_eol = os.linesep
```

The documented override, from `site/source/docs/tools_reference/emcc.rst`:

> ``--output-eol windows|linux``
>   [link]
>   Specifies the line ending to generate for the text files that are outputted.

So an emscripten build that emits JS glue is **byte-different between Windows
and Linux by default, by design**, before any compiler question is reached.
This does not touch the `.wasm` — but it is decisive for how we define "the
artifact". If the deployed unit were `kernel.js` + `kernel.wasm`, D-bc's single
digest would already be false on the JS half. The kernel must be a standalone
`.wasm` with no generated-JS half in the pinned artifact, or `--output-eol
linux` must be pinned.

Emscripten also ships an inputs-capture mechanism, `--reproduce=<file>` /
`EMCC_REPRODUCE` (`emcc.py:create_reproduce_file`, `tools/cmdline.py`:
`reproduce = os.getenv('EMCC_REPRODUCE')`), which tars the link inputs and a
response file. That is a *debugging* aid for exact re-invocation, not a
determinism guarantee, and should not be cited as one.

### 3.3 WASI SDK — absence, recorded

Searched 2026-08-16:

- `WebAssembly/wasi-sdk` `README.md` (main): **no occurrence** of "determin" or
  "reproduc".
- GitHub issue search `repo:WebAssembly/wasi-sdk is:issue reproducible` →
  3 results, none on the subject (`#401` LTO import pruning, `#111`
  `max_align_t`, `#138` macOS release binaries).
- `repo:WebAssembly/wasi-sdk is:issue deterministic` → 1 result, `#14` "import
  function" (2019), unrelated.

WASI SDK ships per-host release archives
(`wasi-sdk-${VERSION}-${ARCH}-${OS}.tar.gz`, from its README), i.e. the
Windows and Linux users run *different binaries* of the same LLVM version.
Whether those two binaries emit identical bytes is precisely the unguaranteed
question, and the project makes no claim either way.

### 3.4 The linker's determinism-relevant surface, quoted

From `llvm/llvm-project`, `lld/wasm/Options.td` (main), verbatim help text:

- `def build_id_eq: J<"build-id=">, HelpText<"Generate build ID note">,
  MetaVarName<"[fast,sha1,uuid,0x<hexstring>]">;`
- `def strip_all: F<"strip-all">, HelpText<"Strip all symbols">;`
- `def strip_debug: F<"strip-debug">, HelpText<"Strip debugging information">;`
- `defm keep_section: Eq<"keep-section", "Preserve a section even when
  --strip-all is given. ...">`
- `defm reproduce: EEq<"reproduce", "Dump linker invocation and input files for
  debugging">;`

Binaryen (which emscripten drives) registers the complementary passes in
`src/passes/pass.cpp`: `strip-debug`, `strip-dwarf`, `strip-producers`,
`strip-target-features`.

And LLVM's own published ladder, from Nico Weber, "Deterministic builds with
clang and lld", 2019-11-07 (https://blog.llvm.org/2019/11/deterministic-builds-with-clang-and-lld.html):

> "A build is called deterministic or reproducible if running it twice produces
> exactly the same build outputs."

with four levels, of which the top two are ours:

> **local determinism** — "Builds are also independent of the name of the build
> directory"
>
> **universal determinism** — "Like 3, but builds are also independent of the
> machine the build runs on. Everybody that checks out the project at a given
> revision into any directory and builds it following the build instructions
> ends up with exactly the same bits in the build output."

and the requirement it states for reaching the top:

> "By now, your build output is deterministic as long as everyone uses the same
> compiler, and linker binaries, and as long as everyone uses the version of the
> SDK and system libraries."

Note the phrase "the same compiler, and linker **binaries**". Two hosts running
per-host builds of the same LLVM version are not running the same binaries.
That is the gap the promotion question sits in, named by LLVM's own guidance.

---

## 4. The promotion question, answered

> *"Whether cross-platform byte-identity (same bytes from Windows and Linux) is
> realistically achievable for this toolchain, or whether the honest gate is
> same-platform reproducibility plus cross-platform behavioural equality. If it
> is the latter, say so plainly."*

**It is the latter. Say so plainly: same-platform reproducibility plus
cross-platform behavioural equality is the honest gate.**

Restating the case compactly:

| Evidence | Bears on promotion |
| --- | --- |
| Emscripten lead: LLVM "guarantees deterministic builds on the same machine"; observed cross-OS differences (§3.1) | Against — the only stated guarantee stops at one machine |
| Emscripten `DETERMINISTIC_PREFIX` "to produce reproducible builds across platforms" (§3.2) | For — but scoped to emscripten's own system libraries |
| Emscripten `output_eol = os.linesep` (§3.2b) | Against — cross-OS text output differs by design |
| WASI SDK: no determinism claim anywhere; per-host toolchain binaries (§3.3) | Against — unclaimed, and structurally harder |
| LLVM guidance: universal determinism requires "the same compiler, and linker binaries" (§3.4) | Against — per-host toolchain builds are not the same binaries |
| CosmWasm: production reproducible wasm via pinned Docker; ARM output declared non-interchangeable (§5.2) | Against — the field's answer is a designated platform |
| Go: host-independent bit-for-bit achieved (§5.1) | For, but by a route unavailable to us |

There is also a decision-theoretic argument the operator should weigh
explicitly. A gate must be *honourable*: when it goes red, someone in this
estate must be able to make it green by doing correct work. A cross-OS
byte-identity gate fails that test — a red result would be an upstream
difference in LLVM or emscripten, with no lawful local remedy short of
abandoning one platform's build. Adding it would install a gate whose only
available response to failure is to disable it, which is the mechanism by which
gates become theatre.

**What replaces it, with no loss of assurance.** D-bc's actual claim — one
content digest for the deployed kernel across Go, TypeScript, Windows and Linux
— is *not* a claim about builds. It is a claim about the deployed artifact, and
the amended decision already made that the load-bearing pin. Build once on the
designated platform, pin that artifact's digest, embed those exact bytes in
both runtimes, and have every host journal the digest it loaded. Cross-platform
assurance then comes from REF-6's corpus driven through **that one artifact** on
both platforms — which is a stronger property than cross-platform build
identity, because it tests the thing that runs rather than a build that would
have produced it.

---

## 5. How other projects express this gate

### 5.1 Go — the existence proof for host independence, and why it does not transfer

Russ Cox, "Perfectly Reproducible, Verified Go Toolchains", 2023-08-28
(https://go.dev/blog/rebuild), verbatim:

> "As of Go 1.21, the Go toolchain is perfectly reproducible: its only relevant
> input is the source code for that build. We can build a specific toolchain
> (say, Go for Linux/x86-64) on a Linux/x86-64 host, or a Windows/ARM64 host, or
> a FreeBSD/386 host, or any other host that supports Go, and we can use any Go
> bootstrap compiler ... None of that changes the toolchains that are built. If
> we start with the same toolchain source code, we will get the exact same
> toolchain binaries out."

This is the strongest published counter-example to §4's conclusion, and it is
worth stating exactly why it does not rescue the promotion. The post lists what
had to change to get there: cgo disabled in the toolchain build, `package net`
rewritten to avoid host C, dynamic-linker configuration moved from build time
to run time, and a Windows/Unix path-separator inconsistency fixed. That is a
campaign *inside the compiler*, run by the compiler's own authors, to delete
host inputs. We consume LLVM; we cannot run that campaign.

Go also supplies the best-shaped **verification** precedent:
`golang.org/x/build/cmd/gorebuild`, whose package documentation says

> "In general, gorebuild checks that the local rebuild produces a bit-for-bit
> identical copy of the file posted at https://go.dev/dl/."

and then enumerates its exceptions (macOS code signatures, the `.pkg`
installer). Two features are directly borrowable: the gate is an
*independent rebuild compared against the published artifact*, and its
exceptions are **listed in the tool**, not tacitly tolerated. The same doc
notes "Go 1.20 and earlier did not ship reproducible toolchains" — reproducibility
was a dated, versioned property, not a permanent one.

### 5.2 CosmWasm — the production reproducible-wasm precedent

`CosmWasm/optimizer` (Apache-2.0), README main branch, verbatim:

> "This is a Docker build with a locked set of dependencies to produce
> reproducible builds of cosmwasm smart contracts."

> "Run it a few times on different computers and use `sha256sum` to prove to
> yourself that this is consistent."

and, decisively for our question:

> "**However**, the native Arm version produces different wasm artifacts than
> the Intel version. Given that that impacts reproducibility, non-Intel images
> contain a "-arm64" suffix to differentiate them."
>
> "Arm images are released to ease development and testing on Mac M1 machines.
> **For release / production use, only contracts built with the Intel optimizers
> must be used.**"

This is the closest analogue in the field to REF-6: a Rust→wasm (LLVM) pipeline
whose entire value proposition is that a third party can re-derive the deployed
wasm's hash. Its design conclusions are exactly the ones recommended here —
**pin the build environment to one image; designate one platform as the release
platform; publish `checksums.txt`; treat other platforms' output as
development-only.** Even holding the OS constant (Linux, in Docker), changing
the CPU architecture changed the wasm.

### 5.3 The wider practice: designate a platform, then attest

- **Bazel**, https://bazel.build/basics/hermeticity, verbatim: *"When given the
  same input source code and product configuration, a hermetic build system
  always returns the same output by isolating the build from changes to the host
  system."* Hermeticity is isolation *from* the host, achieved by treating tools
  as source — not a claim that two different host OSes agree.
- **SLSA v1.0 FAQ**, https://slsa.dev/spec/v1.0/faq, verbatim: *"Therefore, SLSA
  does not require verified reproducible builds directly. Instead, verified
  reproducible builds are one option for implementing the requirements."* The
  reasons it gives include that reproducibility addresses only build threats and
  that some builds cannot practicably be made reproducible. A supply-chain
  standard designed after this problem was well understood chose **provenance
  over reproducibility** as the primary requirement. That is the same shape as
  the amended D-bc: pin and attest the deployed artifact; treat rebuild identity
  as corroboration.
- **Reproducible Builds tooling** supplies the failure-triage half: `diffoscope`
  when the digests differ, `reprotest` to vary the environment deliberately,
  `disorderfs` to expose ordering bugs on purpose.

A concrete, own-authored CI shape distilled from all of the above is committed
at `docs/research/reference/rq6-reproducible-artifacts/ci-rebuild-identity.sample.yml`:
blocking two-different-paths rebuild identity on the designated platform;
blocking deployed-digest pin; **non-blocking** cross-platform build identity
written to the job summary as a datum; blocking corpus-through-the-one-artifact
on both platforms.

---

## 6. Recommendations, each with its cost, its trusted base, and its reversal

### 6.1 Do not promote cross-platform build identity. Reword REF-6's gate.

REF-6 currently reads: *"regeneration byte-identical from two clean checkouts on
the designated build platform, with cross-platform build identity recorded as a
datum (a gate only if RQ-6 confirms it achievable)"*. Recommended wording:

> Regeneration byte-identical from two clean checkouts **at different filesystem
> paths** on the designated build platform; the deployed artifact's sha256 equals
> that rebuild's; cross-platform build identity recorded as a datum in the job
> summary and never gating; cross-platform assurance carried by the corpus driven
> through **that one deployed artifact** on both platforms.

The one substantive addition is "at different filesystem paths" — §2.1 shows a
same-path double build passes while the property fails.

- **Cost.** The gate needs two checkouts instead of one, roughly doubling the
  build step's wall clock. On GitHub Actions the second checkout is free of
  network cost if `actions/checkout` is reused; the compile is the expense.
- **Trusted base added.** None. This removes a would-be gate rather than adding
  machinery.
- **Reversal.** Trivial and cheap: if a future emscripten or WASI SDK release
  publishes a cross-OS byte-identity guarantee, the datum job's
  `continue-on-error` comes off and it becomes a gate. The datum is being
  collected precisely so that the evidence for promotion accumulates on its own.

### 6.2 Pin the build-path mitigations explicitly rather than relying on defaults

For every translation unit REF-6 compiles: `-ffile-prefix-map=<checkout>=<fixed>`
and `-fdebug-compilation-dir=<fixed>`, mirroring what emscripten does for its own
system libraries (§3.2). Emit the C through `lake` (or an explicit `lean -R`) so
the module name cannot absorb the checkout directory (§2.2). Feed the linker an
explicit, `LC_ALL=C`-sorted file list, never a glob.

- **Cost.** Four extra flags and one sorted file list in the build script; a
  documented invocation the spike must record.
- **Trusted base added.** None beyond what D-bc already accepted (emscripten,
  or WASI SDK). The flags are already inside that boundary.
- **Reversal.** Delete the flags; the gate immediately tells you why you should
  not have.

### 6.3 Keep `producers`; strip `name` and `.debug_*`; do not set `--build-id=uuid`

The `producers` section records the toolchain that made the artifact (§1). Keeping
it means an emsdk or LLVM bump changes the kernel digest — which is the correct
signal under D-e obligation 3, because it *is* a different artifact and the
runtimes' journaled digests must reflect that. Stripping the `name` and DWARF
sections removes both the largest metadata mass (50 KB of 2.6 MB on the probe
artifact) and the residual place a path could hide. `--build-id=uuid` would
inject randomness by construction and must never be used; if a build id is wanted
at all, only a content-derived value is admissible.

- **Cost.** A stripped artifact makes post-mortem debugging of the kernel harder
  — no function names in a trap trace. Mitigation: keep an unstripped sibling
  artifact, un-deployed, digested and archived beside the deployed one.
- **Trusted base added.** If the stripping is done by a separate `wasm-opt` pass,
  binaryen joins the chain that produces the deployed bytes. Prefer doing it with
  linker flags already in the emscripten/WASI-SDK invocation (`--strip-debug`) so
  no post-build tool touches the artifact — this is the same principle that killed
  the embedded-self-digest variant in the D-d amendment.
- **Reversal.** Remove the strip flags; the digest changes once, and the pin is
  re-recorded in the commit that does it.

### 6.4 Treat the deployed artifact as a single `.wasm`, with no generated-JS half

§3.2b shows emscripten's generated text output is host-EOL by default. If the
kernel's deployed unit ever includes generated JS, D-bc's single-digest claim is
false on Windows before anything else is considered.

- **Cost.** Rules out emscripten's default JS-glue output mode for the deployed
  artifact; the wasm must be usable standalone by both wazero and Bun's host. That
  is a real constraint on the spike, and one it should test directly.
- **Trusted base added.** None; it removes a component.
- **Reversal.** If a JS half turns out to be unavoidable, pin `--output-eol linux`
  and digest the pair — but the pin is then a build-script invariant nobody can
  see in the artifact, which is strictly worse.

### 6.5 The standing law this supports, pre-registered

Offered for REF-6/REF-7 to adopt, in the estate's habit of naming the safety
property a gate installs:

> **Nothing runs that CI did not pin.** The artifact digest a host journals at
> session open is a digest CI produced and recorded; a runtime that loads bytes
> with any other digest refuses by name.

This is D-d item 3 and D-e obligation 3 stated as one sentence, and it is what
makes the reproducibility question tractable: the estate needs *one* trustworthy
artifact and a mechanical chain from CI to the loader, not agreement between two
independent builds on two operating systems.

---

## 7. What the surveyed material does NOT answer for our seam

Named, not glossed.

1. **Whether today's emscripten produces byte-identical `.wasm` from Windows and
   Linux.** The only located project statement is 2018, pre-dates the current
   backend, and is a maintainer's recollection rather than a test result. No
   modern statement exists in either direction. Our recommendation not to promote
   rests on the *absence of a guarantee*, which is the right basis for a gate
   decision but is not the same as evidence of divergence. If the operator wants
   the fact rather than the gate decision, it costs one experiment: build the
   spike's hello-kernel with a pinned emsdk on both platforms and compare — and
   that experiment is already inside REF-0's scope.
2. **Whether WASI SDK's per-host LLVM builds agree.** Completely unaddressed by
   the project. Same experiment, same cost.
3. **Whether Lean's C emission stays path-clean at realistic scale.** §2.2 tested
   a six-line module with one `panic!`. A module using `decide`, `native_decide`,
   large `String` literals, or `#eval`-derived data may embed more. The wire model
   is not written yet, so this cannot be settled now; the spike should re-run the
   probe against the largest Lean module it has.
4. **Whether the Lean *runtime* (not the emitted C) compiles reproducibly to
   wasm.** The kernel is Lean-emitted C plus `libleanrt`, and every determinism
   question in §1 applies to the runtime's own sources — which we do not compile
   today and have never measured. This is the larger half of the artifact by
   volume and is entirely unmeasured.
5. **Wall-clock cost of the gate.** No source surveyed publishes rebuild-gate
   timings for a wasm toolchain, and none of our own builds exist yet. RQ-5 owns
   the CI-timing question generally; for REF-6 specifically the number is
   unknown and should be measured by the spike, not estimated.
6. **What a *third party* would need to reproduce our kernel.** CosmWasm answers
   this with a pinned Docker image; we have no equivalent, and the estate has not
   decided whether third-party reproducibility is a goal at all. If it is, the
   cost is a pinned container image joining the trusted base and the release
   process — a decision that belongs to the operator, not to this report.
7. **Nondeterminism inside LLVM that is not path-shaped.** LLVM's tracker
   carries live reports of host state reaching artifacts (e.g. issue #206362,
   "clang serializes host pointer value into module binary (.pcm)", 2026-06-28),
   which is a modules-specific path we do not use. Whether analogous leaks exist
   on the wasm path is not something the surveyed material establishes, and not
   something a rebuild gate on one platform would detect.

---

## Independent verification — 2026-08-16

Adversarial re-check by a second seat, same day, same machine. Every listed
load-bearing source was re-fetched from its primary (GitHub raw / `gh api` /
direct HTTP), not from the report. Both executed probes were re-run from the
committed scripts. Two mitigations the body asserts but did not execute
(`lean -R`, and `lake`) were executed here.

### Claim table

| # | Claim (§) | Source re-fetched | Verdict | Evidence |
| --- | --- | --- | --- | --- |
| 1 | Emscripten lead draws the guarantee at "the same machine", reports cross-OS differences (§3.1) | `gh issue view 7714 --repo emscripten-core/emscripten` | **CONFIRMED** | Comment `449454785`, author `kripken`, `authorAssociation: MEMBER`, `createdAt 2018-12-21T17:51:53Z`; body opens with the quoted sentence verbatim. Issue `CLOSED 2019-12-30` after the stale bot — the body's dating and its "stale, not resolved" caveat are both accurate. |
| 2 | `DETERMINISTIC_PREFIX` and its prefix-map flags are scoped to emscripten's own system libraries (§3.2) | `tools/system_libs.py` raw, main | **CONFIRMED** | Comment at L45–46 ("to produce reproducible builds across platforms"), `DETERMINISTIC_PREFIX = '/emsdk/emscripten'` L47, the three flags L80–82 inside `get_base_cflags` (L61). All three call sites — L482, L511, L603 — are inside `class Library` (L296) and its build paths. No user-TU path reaches them. |
| 3 | Generated text output defaults to host EOL (§3.2b) | `tools/cmdline.py`, `tools/link.py`, `emcc.rst` raw | **CONFIRMED** | `cmdline.py` L89–92: the comment "Defaults to using the native EOL on each platform (\r\n on Windows, \n on Linux & MacOS)" then `output_eol = os.linesep`. Override parsed at L521–528. `emcc.rst` L581–583 documents `--output-eol windows\|linux`. `link.py` L2213–2216 `convert_line_endings_in_file` returns early when `to_eol == os.linesep`. |
| 4 | WASI SDK publishes no determinism/reproducibility claim; per-host binaries (§3.3) | `README.md` raw + two GitHub issue searches | **CONFIRMED** | `grep -i` for "determin" and "reproduc" over the 9144-byte README: **zero** hits. `is:issue reproducible` → `total_count: 3` (#401, #111, #138); `is:issue deterministic` → `total_count: 1` (#14). Both match the body exactly. README L149 shows the per-host archive `wasi-sdk-${WASI_VERSION_FULL}-${WASI_ARCH}-${WASI_OS}.tar.gz`. |
| 5 | CosmWasm pins Docker; ARM output non-interchangeable for release (§5.2) | `CosmWasm/optimizer/README.md` raw; `gh api .../license` | **CONFIRMED** | L128–129 and L131–132 match the body word for word, including the bolded "For release / production use, only contracts built with the Intel optimizers must be used." License `spdx_id: Apache-2.0`. |
| 6 | LLVM's guidance requires the same compiler and linker **binaries** (§3.4) | blog.llvm.org post, fetched | **CONFIRMED** | "By Nico Weber, Nov 7, 2019"; four-level ladder present; the sentence "By now, your build output is deterministic as long as everyone uses the same compiler, and linker binaries, and as long as everyone uses the version of the SDK and system libraries" is verbatim. See defect D2 on the ladder-bullet rendering and D3 on the inference. |
| 7 | Same-path rebuild passes while the property fails; `-trimpath` fixes it (§2.1) | **re-executed** `build-path-probe.sh ./vbp` | **CONFIRMED** | Case 1 identical; case 2 different; case 3 identical **and byte-equal to the committed transcript**: `633c08cf8f8b9e8c1167e87e90d023f36c91963f0dfe96a8724dd6fa67ba223b`. Sizes reproduced exactly: A=2605227 B=2605261 trimmed=2599957. Delta 34 equals the directory-name length delta. `wasm-sections.mjs` re-run on the fresh artifact reproduced the transcript's section table and `producers` line. |
| 8 | Lean 4.33.0 bakes the derived module name into the emitted C (§2.2) | **re-executed** `lean-c-emission-probe.sh ./vlp` | **CONFIRMED, and the mitigation now executed** | Cases 1–2 reproduced byte-exactly: `5b53517becd404c75ce04cf67a2014a7687649ed037df7412babcfefab4f3acc`. Case 3 printed `CONFIRMED` with the diff at `// Module:` and `initialize_`. `lean --help` carries `-R, --root=dir` verbatim. **Additionally executed here:** (a) `lean -R <dir> -c` from two differently-named directories → both `5b53517b…`, module line `// Module: Kern`; (b) two `lake build`s of the same library at `pa/K` and `pb-much-longer-name/K` → `.lake/build/ir/K/Basic.c` identical at `9aec4dc7ec7ac2105b5f0b61acb338cb221f469de426d44168551344c696efd9`. The body's `lake` claim was inference; it is now evidence. |
| 9 | No timestamp in the wasm format; `wasm-ld` synthesises `producers` (§1, §2.4) | W3C spec page; `lld/wasm/Writer.cpp` raw; own tool re-run | **CONFIRMED** | Preamble is magic + version; section ids 0–13 (custom … tag); no temporal field. `Writer.cpp` L75 declaration, L218 `void Writer::populateProducers()`, L1854–1855 call site. Tool re-run printed `producers: language Go go1.26.5 processed-by Go cmd/compile go1.26.5`. |
| 10 | `--build-id` accepts `uuid`; `--strip-all` / `--strip-debug` / `--keep-section` / `--reproduce` exist (§3.4) | `lld/wasm/Options.td` raw | **CONFIRMED** | L51–52: `def build_id_eq: J<"build-id=">, HelpText<"Generate build ID note">, MetaVarName<"[fast,sha1,uuid,0x<hexstring>]">;` — MetaVarName exact. `strip_all` L145, `strip_debug` L147, `keep_section` L210, `reproduce` L133, each with the help text as quoted. No invented flag. |
| 11 | SLSA v1.0 does not require reproducible builds (§5.3) | slsa.dev/spec/v1.0/faq, fetched | **CONFIRMED** | "Therefore, SLSA does not require verified reproducible builds directly. Instead, verified reproducible builds are one option for implementing the requirements." — verbatim. |

### Claims sampled beyond the listed set

| Claim (§) | Verdict | Evidence |
| --- | --- | --- |
| Reproducible Builds definition, introduced as "verbatim" (§1) | **CONFIRMED in substance; misquoted** | Site says "recreate **bit-by-bit** identical copies"; the body's blockquote says "bit-for-bit". See D1. |
| RB build-path and stable-inputs quotes (§1) | **CONFIRMED** | "Most compilers write the path of the source in the debug information in order to locate the associated source files." and "Most filesystems do not guarantee that listing files in a directory always results in the same order." — both verbatim. |
| Clang `-ffile-prefix-map` reference text (§1) | **CONFIRMED** | "remap file source paths in debug info, coverage mapping, predefined preprocessor macros and `__builtin_FILE()`. Implies -ffile-reproducible." verbatim. |
| `-fmacro-prefix-map` gloss placed in quotation marks (§1) | **CONFIRMED in substance; misquoted** | Site: "addresses unreproducibility due to the use of `__FILE__` macros in assert calls for example". See D1. |
| LLVM commit `2c090162…` for `SOURCE_DATE_EPOCH` (§1) | **CONFIRMED** | Commit date `2022-10-12T18:55:26Z`; message contains "This patches parses SOURCE_DATE_EPOCH and changes all the three macros" and the GCC-`__TIMESTAMP__` contrast the body summarises. |
| `ProducersSection.md` field names and release-build advice (§1) | **CONFIRMED** | `language` / `processed-by` / `sdk` at L69–71; L12–14 "tools are encouraged to emit the section or include themselves in an existing section by default, keeping the producers section even in release builds." |
| Binaryen strip passes (§3.4) | **CONFIRMED** | `pass.cpp` L558/561/562/566 register `strip-debug`, `strip-dwarf`, `strip-producers`, `strip-target-features`. |
| Go blog quote and the four removals (§5.1) | **CONFIRMED** | Russ Cox, 28 Aug 2023; the passage is verbatim including the elided middle; cgo, `package net`, dynamic-linker configuration, and the path-separator fix are all in the post. |
| `gorebuild` package documentation (§5.1) | **CONFIRMED** | "In general, gorebuild checks that the local rebuild produces a bit-for-bit identical copy of the file posted at https://go.dev/dl/." and "…because Go 1.20 and earlier did not ship reproducible toolchains." Exceptions enumerated in the doc are macOS code signatures, the `.pkg` installer, **and a Windows `.msi`** the body does not mention. |
| Bazel hermeticity (§5.3) | **CONFIRMED** | Sentence verbatim. |
| `emcc.py` `create_reproduce_file` / `EMCC_REPRODUCE` (§3.2b) | **CONFIRMED** | `emcc.py` L135 definition, L358 call site; `cmdline.py` L99 `reproduce = os.getenv('EMCC_REPRODUCE')`. |
| LLVM issue #206362 (§7.7) | **CONFIRMED** | Title "clang serializes host pointer value into module binary (.pcm)", created `2026-06-28`, state `open`. |
| Estate facts in §2.3 | **CONFIRMED** | `.gitattributes` carries `* text=auto eol=lf`, `*.sh text eol=lf`, and `eol=lf` on the three fixture trees; `git config --get core.autocrlf` returns `false`; `lean-gates.yml` L27 `ubuntu-latest`; `windows-induction.yml` L20 `windows-latest` under `schedule:` `cron "23 6 1 * *"` (monthly). |
| REF-6 gate wording quoted in §6.1 | **CONFIRMED** | Matches `scratch/dispatch/17-the-refinement-ladder.md` §REF-6 word for word. |
| D-bc amendment 3 conditions promotion on RQ-6 | **CONFIRMED** | Grill record, Amendments §3: "regeneration gate two-tiered (designated-platform byte-identity gated now; cross-platform identity a datum pending RQ-6)". |
| Emscripten `test_deterministic` is runtime, not build, determinism (reference README) | **CONFIRMED** | `test/test_other.py` L12421ff exercises `clock_gettime` and `emscripten_get_now`. The README's warning against citing it is correct and worth keeping. |

**No invented API, flag, symbol, or signature was found.** Every one checked
resolves to a real line in a primary source or to an executed command.

### Attempted refutation of the decisionImpact

The core holds. Amendment 3 does condition promotion on RQ-6; the finding is
negative; the datum stays a datum; no ratified decision is reversed. Scope
refinement (1) — "at different filesystem paths" — is sound, and is load-bearing
in the estate's actual CI, where two `actions/checkout` steps land at the same
workspace path unless `path:` is set. The new Lean obligation is sound and now
rests on executed evidence for both of its mitigations rather than one.

**One sub-clause does not survive** — see D4.

### Defects

- **D1 — "verbatim" that is not verbatim (§1).** The Reproducible Builds
  definition is introduced as "verbatim" but reads "bit-for-bit identical
  copies"; the source says "bit-**by**-bit identical copies". Separately, the
  `-fmacro-prefix-map` gloss sits inside quotation marks as "addresses
  unreproducibility from `__FILE__` macros" where the source says "addresses
  unreproducibility due to the use of `__FILE__` macros in assert calls for
  example". Both are semantically faithful; neither is a quotation. In a report
  whose weight rests on quoted primaries, a paraphrase inside quote marks is
  the defect that costs the most trust per byte.
- **D2 — silent truncation inside a blockquote (§3.4).** The ladder bullet is
  rendered as *local determinism* — "Builds are also independent of the name of
  the build directory". The post reads "Like incremental basic determinism, but
  builds are also independent of the name of the build directory." The leading
  clause is dropped and the sentence recapitalised with no ellipsis. The
  universal-determinism bullet's quoted sentences are correct but its
  surrounding sentences are dropped unmarked.
- **D3 — inference presented as the source's own naming (§3.4).** "That is the
  gap the promotion question sits in, **named by LLVM's own guidance**." The
  post states a requirement — same compiler and linker binaries — and says
  nothing about per-host LLVM builds. The step from "same binaries required" to
  "per-host WASI-SDK / emsdk builds are not the same binaries" is the report's
  own, and a sound one, but it is the report's and the body does not say so.
- **D4 — the EOL finding's decision impact is overstated (§3.2b, §6.4, and the
  second scope refinement).** The mechanism is real and correctly sourced; its
  stated consequence is not. D-bc as ratified opens "One `.wasm` artifact, one
  digest everywhere", and the 2026-08-16 amendment makes the load-bearing pin
  the **deployed artifact's digest — built once, embedded everywhere** on a
  designated build platform, which the estate's CI fixes at `ubuntu-latest`. A
  host-EOL default can only diverge when someone *builds* on Windows; under the
  amended D-bc nobody does. So `output_eol = os.linesep` cannot "falsify D-bc's
  single-digest claim on Windows before any compiler question arises" — it can
  only perturb the cross-platform build-identity **datum**, which this report
  already recommends never gating. Recommendation 6.4 is still right, but on a
  ground the report does not lead with and D-bc already states: a JS half is a
  second file carrying a second digest, and "one artifact, one digest" excludes
  it by construction. Re-ground the refinement before it reaches REF-6's gate
  wording, or a later reader will believe the gate defends against a failure
  mode the amended decision had already closed.
- **D5 — an unexecuted mitigation carried as fact, with no `UNVERIFIED` mark
  (§2.2, §6.2).** "Since `lake` fixes the package root, the normal path is safe"
  is an inference; the probe never ran `lake`, and the report contains no
  `UNVERIFIED` marker anywhere, though dispatch discipline rule 4 requires one
  for anything reconstructed rather than quoted or executed. The inference is
  **correct** — verified here by building the same library under `lake` at
  `pa/K` and `pb-much-longer-name/K` and obtaining identical emitted C
  (`9aec4dc7…`) — so the finding is upgraded, not withdrawn. The defect is the
  missing label, which in a different case would have hidden a guess.
- **D6 — minor: paraphrased asset naming (§3.3).** The WASI SDK archive pattern
  is given in backticks as `wasi-sdk-${VERSION}-${ARCH}-${OS}.tar.gz`; the
  README's variables are `WASI_VERSION_FULL`, `WASI_ARCH`, `WASI_OS`. The
  substance — per-host archives, hence different binaries per host — is exact.
- **Discipline note, not a defect.** Rule 1 classes a blog post as a *lead*
  until a primary confirms it. Two load-bearing quotations (blog.llvm.org,
  go.dev/blog) are official project publications on the projects' own domains
  and are treated as evidence without argument. That is defensible and this
  seat accepts it, but the report should say why rather than pass over the rule.

Discipline otherwise met: every source dated 2026-08-16 and re-datable; the
non-executable half declared in the opening paragraph rather than buried; §7
present with seven named gaps and no glossing; every recommendation in §6
carrying its cost, its trusted-base delta, and its reversal; the reference-area
README recording what each item is, its provenance, its licence, and the
retrieval date, and recording four searches that found nothing as findings in
their own right.

**Verdict: sound.** No load-bearing claim refuted, no invented API. Six defects,
of which D4 is material to how REF-6's gate gets worded and should be corrected
before that wording is dispatched.
