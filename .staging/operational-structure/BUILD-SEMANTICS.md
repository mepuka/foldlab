# BUILD SEMANTICS — a study for the G6/bootstrap build-out

**Status: pre-grade study, 2026-08-29.** Answers decision-record item 14 (`docs/SPECS.md:168-174`). Adversarial verdict up front, then the evidence.

> **The estate does not need a build system. It needs three declarations it has not made, and one ruling it has already made and not noticed.** Nix's model maps onto the estate almost completely — and the one piece the estate lacks (a build step as a described value keyed by content) is *not* the first thing to build, because two zero-abstraction declarations recover a measured **≥65 s per `mise run check`** first. The "fluent local/self-hosted/cloud" determination is not a design question: **R10 already rules it** (`library/cas/EFFECTS-BACKEND.md:172-176`) and the estate's addressing is strictly *stronger* than Nix's at the exact seam where Nix has to fall back on signatures.

---

## 0. Measurements (this Mac, warm build, medians of 3–5)

Everything below is measured, not read. Caveat: taken while the working tree was **mid-merge** (`.git/MERGE_HEAD` present; `UU mise.toml`, `UU library/cas/surface/cas-surface.json` — the police lane landing concurrently). `mise.toml` carries **no** conflict markers and parses; `check:cas` is green. `gen:backend-programs` returned rc=1, which is merge state, not a finding.

### The gate loop — `mise run check:cas`

| | ms |
|---|---|
| `mise run check:cas` (whole task, clean) | **5 319** |
| 12 × `lake exe X --check` serially | **7 695** |
| same 12 binaries under ONE `lake env sh -c` | **4 274** |
| 11 of 12 (all but `surface`), one `lake env` | **991** |
| 11 of 12, no `lake` at all | **684** |
| `lake env true` (env-setup floor) | 76 |
| `lake exe X` wrapper tax, per invocation | **283** |
| `lake --wfail build`, warm | 277 |

Two facts fall out:

1. **`lake exe` process/wrapper startup is ~283 ms and is paid 12 times = ~3.4 s, which is 64% of `check:cas`.** Batching the 12 invocations into one `lake env` call removes ~3.4 s of the ~7.7 s with a one-line `mise.toml` edit.
2. **`surface` is 77% of the remaining real work** (~3.3 s of the 4.27 s batched total). It is the only `lean_exe` with `supportInterpreter = true` (`library/cas/lakefile.toml:94-98`), it is the only one that cannot run without `lake env`, and its cost is `importModules` — the police lane already measured the same shape ("~11 s wall including import", `LANGUAGE-POLICE.md:235`). Every other gate is 6–122 ms.

### The regeneration loop — `mise run gen`, per task

| task | ms | | task | ms |
|---|---|---|---|---|
| `gen:cas-vectors` | **25 889** | | `gen:backend-materialize` | 1 304 |
| `gen:ledger` | **16 812** | | `gen:backend-programs` | 831 (rc=1, merge) |
| `gen:cas-verdicts` | 5 832 | | `gen:backend-mcp` | 468 |
| `gen:cas-schemas` | 4 018 | | `gen:effects-materialize` | 351 |
| `gen:cas-surface` | 3 914 | | `gen:lift-manifest` | 283 |
| `gen:inventory` | 3 584 | | `gen:grammar-manifest` | 273 |
| `gen:backend-wire` | 2 831 | | `gen:cas-admission-map` | 252 |
| | | | `gen:backend-gate` | 222 |
| | | | **SUM (15 of 16)** | **66 864** |

`gen:vectors` (the `estore-vectors` + `git clean` + harness-record chain) not measured; it is the sixteenth and almost certainly the largest.

**`mise run check` runs `mise run gen` first** (`mise.toml`, `[tasks.check]`), then `git diff --exit-code`. **So every full check pays ≥67 s of regeneration whose output is byte-identical to the committed tree on an unchanged working copy.** That is the single largest recoverable number in the estate's loop, and it is recoverable with declarations, not code.

### The declaration that is missing

```
$ grep -c "sources\s*=\|outputs\s*=" mise.toml   → 0
```

Zero `sources`/`outputs` across **all six** `mise.toml` files in the estate (root, `.staging/fixture-gen`, `experiments/parser-census`, `experiments/lift-harness`, `annex/coq`, `.staging/parser-experiments/harness`). mise 2026.8.12 installed.

---

## 1. Nix, precisely where it maps

Cited from the Nix 2.35 reference manual (`nix.dev/manual/nix/latest/…`), RFC 62, and `src/libstore/path-info.cc`.

**The derivation.** A `.drv` is `name, outputs, inputs (srcs + drvs), system, builder, args, env` — and `inputs` is "all store objects needed in order to perform this build step", **explicitly collected, never inferred** (`store/derivation/index.html`). Its ATerm encoding is canonical (fields in fixed order, keys ascending, no duplicates — `protocols/derivation-aterm.html`). A `.drv` is *itself* a store object under the `text:` content-addressing method, so **derivations are content-addressed even in a stock input-addressed store** (`store/store-object/content-address.html`). Instantiate (expression → `.drv`) and realise (`.drv` → outputs) are separate verbs; `nix-instantiate --eval` hashes and discards.

**Input- vs content-addressed.** Input-addressed output paths are a hash of *the way the thing was made*: `hashQuotientDerivation` replaces each input drv path by its quotient hash, prints ATerm, SHA-256s it. The manual is explicit that "identical outputs from different derivations have different paths" (`store/derivation/outputs/input-address.html`). **So "the Nix store is content-addressed" is false as stated for ordinary build outputs** — the `narHash` in store-object-info is *integrity metadata*, and the `ca` field is literally `null` when the object is not content-addressed (`protocols/json/store-object-info.html`). What genuinely is CA in a stock store: `.drv` files, added sources, and fixed-output derivation outputs. Floating CA (`__contentAddressed = true`) needs the still-experimental `ca-derivations` (Nix milestone 35, ~67% closed as of April 2026). Its payoff is **early cutoff**: RFC 62 introduces `DrvOutput = (hashModulo(drv), output)` plus a `Realisation` map, and *resolved derivations* — substitute concrete input paths, then notice the resolved derivation was already built and stop.

**Substituters — the local/remote seam.** `GET /nix-cache-info`, `GET /<hashpart>.narinfo`, `GET /nar/<filehash>.nar.<compression>`. narinfo fields (`src/libstore/nar-info.cc`): `StorePath, URL, Compression, FileHash, FileSize, NarHash, NarSize, References, Deriver, Sig*, CA`. `nix-store --realise` first narinfo-queries the whole closure, then builds only the residue.

**How a remote-built output is certified — the load-bearing detail.** The `Sig` is an Ed25519 signature over a fingerprint string, from `path-info.cc`:

```
"1;" + storePath + ";" + narHash + ";" + narSize + ";" + join(",", references)
```

It asserts *key K says path P has this NAR hash, size, and references*. **It does not bind P back to the derivation that produced it** — that link is pure trust in K. And critically:

> `checkSignature()` … **content-addressed paths bypass signature checks entirely via `isContentAddressed()`.**

`require-sigs` accepts a path on any one of: a trusted-key signature, `require-sigs = false`, a trusted store, **or the object being content-addressed**. RFC 62 closes the binding gap by signing *realisations* instead of paths.

**Remote builders.** `builders = ssh://mac x86_64-darwin ; ssh://beastie x86_64-freebsd` — 8 space-separated fields (store URI, system types, identity file, max jobs, speed factor, supported features, mandatory features, base64 host key). Local instantiates, copies the closure over SSH, remote builds, outputs copy back. `builders-use-substitutes` lets the remote pull deps itself.

**The impurity door.** Fixed-output derivations declare `outputHash`/`outputHashAlgo`/`outputHashMode` in advance, and in exchange the sandbox setting states builds run in private namespaces "**except that fixed-output derivations do not run in private network namespace to ensure they can access the network**". Soundness: all information flows downstream through an output whose content address is fixed, so an impure builder "cannot influence downstream builds in unanticipated ways". `__impure` (experimental) drops the fixed address and is consequently **not recorded in the build trace** — never cached.

**Where the time goes.** Eval, not build: the evaluator is lazy, thunk-based, effectively single-threaded, and dies at process end. The `eval-cache` (SQLite under `~/.cache/nix/eval-cache-v*/`, keyed by flake content hash) is sound *only because flakes are hermetic and the lock file already contains content hashes of every input* — measured 5.55 s → 0.41 s on a package search (Tweag, 2020-06-25). It applies only to source-controlled flakes.

### What the estate already has that Nix has, and what it lacks

| Nix piece | Estate | State |
|---|---|---|
| Store as CAS | `objects/<2hex>/<62hex>`, address computed by the host's own digest, admission at put, **re-verification at load** (`library/effects/BACKEND.md`) | **HAS — and stronger.** Every object is in Nix's `isContentAddressed()` branch. |
| Canonical serialization the hash is taken over (NAR) | Canonical encoding as the identity's pre-image (R12, `EFFECTS-BACKEND.md:206-212`); order-is-identity for unions (decision 4) | **HAS** |
| Binary cache / substituter protocol | `cas-http/0` §6 `POST /control/missing` (positional presence bytes) and §7 `PUT /roots/{hex}` with declared closure; `Graph` closure-walk transfer "idempotent and resumable for free" | **HAS the protocol.** `/control/missing` is verbatim REAPI's `FindMissingBlobs` and Nix's closure pre-query. |
| Signatures / `trusted-public-keys` | — | **DOES NOT NEED.** Nix needs `Sig` because input-addressed paths are unverifiable from content. The estate's are verifiable. R5: the observation is the WORD, byte-decidable. |
| Fixed-output derivation (impurity door) | R15's acquisition loop (acquire → ingest → **normalize** → gate → admit); R10's "nondeterminism admitted only as recorded content"; `.reference/provenance/sources.lock.json` | **HAS, stronger.** Nix's FOD declares a hash in advance; the estate additionally re-emits through the canonical printer, so the impure producer's *spelling* dies at the boundary. |
| Early cutoff | Byte-identity gates give the *detection* (`--check` says `ok`), but nothing consumes it to skip downstream work | **PARTIAL** |
| **A build step as a described value with declared inputs/outputs, addressed, cached on that address** | **Nothing.** No `Derivation`, no `Action`, no declared-inputs record anywhere. `Gate.Fixture = {path, content, label}` (`library/cas/tools/Gate.lean:39-42`) — `content` is the *already-rendered output*; the emitter always does full work and `--check` only compares. | **THE VACANCY** |

---

## 2. mise, and whether the free win is real

Verified against `mise.jdx.dev/tasks/task-configuration.html`, `running-tasks.html`, and `jdx/mise` source (`src/task/task_source_checker.rs`, `src/task/task_sources.rs`, `src/task/mod.rs`).

**Semantics, exactly.** From the docs:

> "if this and `outputs` is defined, mise will skip executing tasks where the modification time of the oldest output file is newer than the modification time of the newest source file."
> "**This uses last modified timestamps. It wouldn't be hard to add checksum support.**"

So: **mtime, not content hash, by default.** The implementation (`sources_are_fresh`) compares `max(source mtimes)` **strictly `<`** `max(output mtimes)`; either side `None` (a missing output pattern) → stale. Secondary baseline: a hash over `(path, len, mtime)` stat tuples stored at `$MISE_STATE_DIR/task-sources/<key>`, **deliberately not rewritten on a failed run**. A source with `mtime == UNIX_EPOCH` is always stale (tarball extraction).

Four behaviours that matter here:

- **`sources` without `outputs` still caches** — `outputs` is silently promoted to `Auto`, which touches `$MISE_STATE_DIR/task-auto-outputs/<hash>`. (`outputs = []` is a *different* variant and never caches.)
- **"The task itself will be automatically added as a source"** — editing the task definition invalidates it.
- **Dependency invalidation propagates:** a task whose dependency re-ran because *its* sources changed also re-runs.
- **Content hashing is one setting away:** `task.source_freshness_hash_contents = true` → blake3 over contents, memoized by git-style stat-info. Docs: "More accurate but slower."
- **`mise run --force` bypasses.**
- **Doc/implementation discrepancy worth knowing:** the doc says "*oldest* output … newer than the newest source", the code takes `max()` on both sides. A stale-but-present sibling output does not force a rerun; only a wholly missing output pattern does.

**Does the estate's gen/check discipline hand-roll a subset of this? Yes — and worse than a subset: it hand-rolls the *detection* and throws away the *skip*.** `mise run gen` unconditionally re-runs 16 emitters; `git diff --exit-code` then asserts nothing moved. mise's `sources`/`outputs` is the identical relation (declared inputs, declared outputs, skip when fresh) with the skip actually wired.

**Does declaring them buy incremental gen for free? Yes, with two conditions.**

- The emitters' outputs are already enumerable — every `Gate.Fixture.path` is a declared output, and `lakefile.toml`'s `[[lean_exe]]` blocks name what each regenerates. The inputs are the Lean tree.
- **Condition A — over-declare `sources`.** Under-declaration is the one real hazard: a Lean source outside the glob changes, the emitter is skipped, `git diff` is vacuously clean, gate green while the fixture is wrong. Mitigation is cheap: glob whole trees (`Cas/**/*.lean`, `tools/**/*.lean`, `lakefile.toml`, `lean-toolchain`). Over-declaration costs only stats.
- **Condition B — CI must not trust it.** On a fresh clone git stamps every file with checkout time, so `max(sources) < max(outputs)` is false under the default strict `<`, and everything runs. That is the right behaviour and it is free — **but I reasoned it from the source, I did not test it.** The slice must verify it, and belt-and-braces the CI job should force.

Hand-edit safety is intact either way: a hand-edited fixture *is* a `git diff`, and `git diff --exit-code` catches it regardless of whether gen ran.

**mise also already has the cloud tier — do not take it yet.** The experimental per-task `cache = { enabled, audit, env, command_inputs }` is a real content-addressed cache: blake3 over source *contents* + resolved tools + declared env + OS/arch, a local artifact store, and a remote HTTP service (`task.cache.remote_url`, GitHub-Actions OIDC auth, `mise run --task-cache {read-write,read-only,…}`). It requires `experimental = true`, and it is explicitly incompatible with `outputs = { auto = true }`. Its own docs carry the warning that decides this: **"a checksum is not a signature from the original task runner"** — anyone who can write a namespace publishes entries readers trust. The estate has a strictly better primitive for exactly that problem (§4). Adopt the free half now; do not adopt the remote half.

**No remote task execution.** Confirmed absent; mise's monorepo page names "distributed caching, remote execution, and hermetic builds" as *Bazel/Buck2's* features, not its own.

---

## 3. Bazel/Buck2 and Effect, briefly

**Bazel/Buck2 — the industry shape for "same action, local or cloud".** `Action { command_digest, input_root_digest, timeout, do_not_cache, salt, platform }`; `Command { arguments, environment_variables, working_directory, output_paths }`; `Directory` in **canonical form** (entries sorted lexicographically) so equivalent trees hash equal. The ActionCache service header is the whole idea in one sentence: *"The action cache addresses the ActionResult by a digest of the encoded Action which produced them."* The REST binding puts the key in the URL: `/v2/{instance}/actionResults/{action_digest.hash}/{action_digest.size_bytes}`.

Nothing in `Action` names a machine. `--spawn_strategy` picks `local | sandboxed | worker | docker | remote` at execution time, and **dynamic execution** runs both branches for the same spawn and "use[s] the output from the first branch that finishes, cancelling the other". That is the sharpest available statement of one description, many venues. Buck2 goes further — no target-graph/action-graph phase split, one DICE incremental graph, "remote execution first — local execution is considered a special case of remote execution" — and it speaks Bazel's wire protocol.

The failure mode is the one to steal a defence against: where hermeticity fails, the digest certifies nothing **silently** — users with different compilers "wrongly share cache hits because the outputs are different but they have the same action hash". Sandboxing exists to make that loud.

**Effect-side resource fluency.** `Layer` is a description; `Scope` is the acquisition/release lifetime; `Effect.acquireRelease` makes acquisition uninterruptible and release scope-guaranteed. **Layer memoization is by object reference** — the docs say "Layers are memoized using reference equality", and `Layer.ts` `class MemoMapImpl` holds `new Map<Layer<any,any,any>, MemoEntry>()`. `Layer.fresh` is implemented as *build against a brand-new root MemoMap*, which proves sharing is a property of the MemoMap, not of the Layer value. **This is the §3a sharing-divergence hazard of `EFFECT-AST-PLACEMENT.md:97`, confirmed in v4 source.** (v4 note: `Layer.build` does `CurrentMemoMap.forkOrCreate`, child maps read through to the parent — so nested provides in v4 share where v3 did not. The divergence against a digest-addressed description is unchanged.)

`@effect/platform` is the "one interface, per-runtime layer" pattern the estate would ride: `Command.make(...)` produces "an immutable value … without executing anything", and running it needs a `CommandExecutor` service — in the v4 this repo runs (`4.0.0-rc.111`), renamed `ChildProcessSpawner` in `effect/unstable/process`, with `NodeChildProcessSpawner` / `BunChildProcessSpawner` as parallel layers. The described `StandardCommand` record (`command, args, env, cwd, shell, stdio, uid/gid`) is **the same shape as Bazel's `Command` proto**.

**There is no remote/SSH executor in Effect.** Grepped across `effect/src`, `@effect/platform-node/src`, `@effect/platform-bun/src` — every `ssh` hit is the substring in `ChildProce**ssH**andle`. The seam exists; nobody built the venue. Closest existing cross-process machinery: `unstable/workers`, `unstable/rpc`, `unstable/cluster`.

**And the closest thing Effect has to an ActionCache** is `PersistedCache` (v4: promoted from `@effect/experimental` into `effect/unstable/persistence/`). Its own header: *"checks a process-local `Cache`, then a named `Persistence` store, before running the supplied lookup. It stores the lookup `Exit`, so expensive or idempotent results can be reused across fibers, process restarts, or workers that share the same backing store."* Keys are `Persistable extends PrimaryKey` — "a stable, string-based identifier" — with attached Schemas so the `Exit` serializes. Backends are layers: `Persistence.layerMemory | layerKvs | layerSql | layerRedis`.

The three keying regimes, which is the whole comparison in one line: **Layer → object reference. Cache → structural `Equal`/`Hash`. PersistedCache → a content-derived `PrimaryKey` over a Schema-described request, storing a serialized `Exit`.** Only the third is `digest → ActionResult`.

---

## 4. The mapping table

| Nix / mise / Bazel | Estate concept | Exists? |
|---|---|---|
| Store path / CAS object | `objects/<2hex>/<62hex>`, address = host digest of canonical bytes | **YES**, and unlike Nix, *always* content-addressed |
| NAR canonical serialization | canonical encoding as the identity's pre-image (R12); order-is-identity | **YES** |
| `.drv` as a store object | `RunParams`/`RunInstruction`/`RunRef` as `cas_struct` (`Mcp.lean:60-83`); F3 code points | **PARTIAL** — a *program* is store-resident content; a *build step* is not |
| Derivation `inputDrvs`/`inputSrcs` (explicitly collected) | — nothing declares an emitter's inputs anywhere | **NO** |
| Derivation `outputs` | `Gate.Fixture.path` per emitter; `[[lean_exe]]` prose comments | **YES in Lean, undeclared to the runner** |
| Bazel `input_root_digest` (Merkle, canonical order) | `Graph` closure of a root; `StoreRef` children ⇒ SYS5 acyclicity free | **YES** |
| Bazel `Command` proto | Effect v4 `StandardCommand` record | **YES** (library-side) |
| **Action digest → ActionResult** | — | **NO. THE VACANCY.** |
| Early cutoff / resolved derivation | `--check` detects byte-identity but nothing skips on it | **DETECTION ONLY** |
| mise `sources`/`outputs` freshness | `mise run gen` + `git diff --exit-code` | **HAND-ROLLED, SKIP DISCARDED** |
| `substituters` / narinfo | `cas-http/0` §6 `/control/missing`, §7 `PUT /roots/{hex}` + closure | **YES** |
| REAPI `FindMissingBlobs` | `POST /control/missing`, N positional status bytes | **YES — same verb** |
| `nix copy` closure transfer | `Graph` walk + `Store.put`, "children-first, address-checked at every step" | **YES** |
| `Sig` / `trusted-public-keys` | — | **NOT NEEDED** (Nix's own `isContentAddressed()` bypass) |
| RFC 62 `Realisation` (signed drv→path) | R5's WORD — "cross-host conformance is byte-decidable word equality" | **YES, and it is a proof rather than a signature** |
| Fixed-output derivation (impurity door) | R15 acquisition loop; `sources.lock.json` | **YES, stronger** (adds *normalize*) |
| `__impure` (uncacheable) | R10 "nondeterminism admitted only as recorded content" | **YES** |
| `--spawn_strategy` local/sandboxed/remote | **R10 stratification**: one syntax, every semantics a handler; transports are handler composition | **RULED, NOT BUILT** |
| Bazel dynamic execution (race two venues) | `Handler.sum` over a seam signature | expressible; not built |
| Nix `--builders ssh://` | operator's PC/Mac pair over SSH | **NO handler** |
| mise experimental remote task cache | `cas-http/0` + `Graph` | **YES, and better** — refuse the mise one |
| Bazel action cache | `PersistedCache` (`effect/unstable/persistence`) or the estate's own store | **available, unused** |
| Nix `eval-cache` (SQLite, flake-hash-keyed) | `surface`'s ~3.3 s import, paid every run | **NO** |
| Persistent workers / batching | 12 × 283 ms `lake exe` startup | **NO** |
| Sandboxing (makes non-hermeticity loud) | byte gates + `--self-test` planted defects | **YES, different mechanism, same job** |

---

## 5. The CRUCIAL determination — fluent local / self-hosted / cloud

**The determination is already law, and the report's job is to name it rather than design it.**

> **R10** (`EFFECTS-BACKEND.md:172-176`): "**Transports** (CLI, daemon, HTTP) are handler composition: a signature translation into a wire language plus a remote handler. A Lean program calling the CLI calling a store is the SAME program with the SAME meaning, interpreted through a composed stack whose every seam is named — modeled differently on purpose, because claims and trust attach at seams; **meaning does not move**."
>
> "**Seam effects get signatures.** Transport failure, cancellation, backpressure, progress are operations of their own signature summed in (`⊕ₛ`, `Handler.sum`), never smuggled through request/reply."

That paragraph *is* `--spawn_strategy`. Bazel spent a decade arriving at "one Action, venue chosen at execution time"; the estate ratified the general form on 2026-08-28 and has not spent it.

### The described value

**No new plane. A build step is an operation of a signature, and a build plan is a program over it.** Consumer-gated per R2: the consumer is the gen chain, which exists and is 67 s slow.

```
BuildSig : Cas.Lang.Sig
  build (recipe : StoreRef) (inputs : List StoreRef) : Address
```

A build plan is then `Prog BuildSig` — straight-line, L-A, already ratified (sorts 14/15), already store-resident, already encodable/decodable (`encodeProg`/`decodeProg`). Children by `StoreRef` buys the Merkle input root and SYS5 acyclicity free, exactly as `Exchange.lean:77-79` does for topology recursion. **Zero new sorts, zero `Ty` change, zero registry row.**

The `recipe` payload is the described command — the `StandardCommand` shape Effect already has and Bazel's `Command` proto already validates as sufficient: `command, args, env, cwd, output_paths`. Whether it lands as a `cas_struct` sibling of `RunParams` or as an arm of G6-a's `SystemNode` union is **ruling ask 4**, and it should be decided *after* G6-a lands, not before — the two are the same shape and G6-a is the one already commissioned.

### The handler per venue (R10's three strata, instantiated)

| Venue | Handler | What exists |
|---|---|---|
| **local process** | `BuildSig → ChildProcessSpawner` (`effect/unstable/process`) with `NodeChildProcessSpawner` / `BunChildProcessSpawner` | Both layers ship in `4.0.0-rc.111` |
| **self-hosted** (PC ↔ Mac over SSH) | the *same* handler over an SSH `ChildProcessSpawner` layer + `Graph`/`cas-http/0` for closure transfer. Nix's `--builders ssh://mac x86_64-darwin` shape | **The one genuine build.** Effect has no SSH executor (grepped). It is a Layer, not an abstraction. |
| **cloud** | the same handler over `cas-http/0`; `/control/missing` plans the upload, `PUT /roots/{hex}` with declared closure publishes | Protocol exists and is normative; no host serves it (B2) |

`Handler.through` + `interpret_through` (proved, R12) collapse the tower, so a local build, an SSH build, and a cloud build are *the same program* with three handler stacks. The "fluency" the directive asks for is `Handler.sum` and `Layer` provision — nothing new is minted.

### Where words and gates certify a remote build

**This is where the estate is genuinely ahead of both prior arts, and it should be stated as a ruling.**

Nix must sign, because an input-addressed path is not verifiable from its own bytes; the signature asserts *K says P has this NAR hash* and does **not** bind P to the derivation that made it. Bazel must sandbox, because where hermeticity fails the action digest certifies nothing *silently*. mise's own remote-cache docs concede "a checksum is not a signature from the original task runner."

The estate is in Nix's `isContentAddressed()` bypass branch **for every object it holds**:

1. **The address is the certificate.** `Store.put` admits by recomputing the digest; loads re-verify. A cloud builder that returns bytes cannot lie about what they are — a wrong answer fails admission at the receiving seam, not at a trust boundary. **No signing plane is required for build outputs, and one should not be added.**
2. **The word is the ActionResult.** R5: "a run is deterministic given its inputs, and the run's history is a store word — so cross-host conformance is **byte-decidable word equality**, not bisimulation." Bazel's `ActionResult` is a *cached observation*; the estate's word is a *checkable one*. A remote build's word compared against the local reference handler's word is the same gate slice 2 already runs green (`EFFECTS-BACKEND.md:318-327` — "The store language executes on its second host").
3. **Trust attaches only at the admitted seams** (digest, filesystem, network — R12), which is precisely the FOD/`__impure` line drawn in Nix and the hermeticity line drawn in Bazel.
4. **What a remote builder may still lie about** is *which* inputs it used — the RFC 62 gap. The estate's answer is not a signature but a re-run: cheap for anything whose word is short, and where it is not cheap the honest posture is Nix's `__impure` — record the answer as content and do not cache it.

**One hazard the venue design must respect, unchanged from `EFFECT-AST-PLACEMENT.md:97`:** Effect memoizes layers by object reference (`MemoMapImpl`'s plain `Map`, confirmed in v4 source), a description addresses children by digest. What Effect builds twice, a fold over the description builds once — connection-pool and finalizer counts change, and `Layer.fresh` (24 sites in 10k) is the only recovery. **Consequence for this lane: a described build step must never be recovered *from* an existing layer stack.** Generation only. Same ruling G6-a already needs.

---

## 6. Performance tooling

**What to measure** — three numbers, in the order they pay:

1. **Per-gate wall ms.** `Gate.jsonLine` (`tools/Gate.lean:168-173`) already emits `{tool, fixture, verdict, bytes, hint}` and `Options.json` already parses `--json`. **Add one field, `ms`.** Every one of the 12 emitters becomes self-timing for ~5 lines, and the format is already machine-readable by construction.
2. **Cache hit rate.** Once `sources`/`outputs` are declared: how many of the 16 gen tasks were skipped. mise reports this natively (`mise run --task-cache-explain[-json]`, `--task-cache-stats`, `--no-timings` to suppress); nothing needs building.
3. **Process-startup tax.** Already measured: 283 ms × 12 = 3.4 s, 64% of `check:cas`. This is the estate's version of Nix's eval cost, and it has the same fix shape (amortize the environment) and none of the difficulty.

**What is NOT measurable, and must be said in the artifact.** Per-declaration elaboration time and heartbeats are unavailable on v4.33.1 (`LANGUAGE-POLICE.md:231`, M9). Wall times are host-varying. Therefore:

**The smallest artifact, in the police lane's own pattern.** `LANGUAGE-POLICE.md:229` rules that exact numbers *should* be byte-gated where they are deterministic, and `:231` rules that non-measurable things must be declared as such. Apply both:

- **Byte-gated, in `ENVIRONMENT.json` (EL1's fixture):** the *shape* — each task's declared `sources` globs and `outputs` paths, joined to its `lean_exe` and its gating `--check` line, with `undeclared` / `unjoined` arrays. This is EL1's existing join (`BOOTSTRAP.md:146`) plus two columns. Deterministic, byte-stable, and it makes an emitter that forgets its declaration a **red gate**.
- **Not gated, appended:** a JSONL telemetry sink of `Gate.jsonLine` rows with `ms`. Host-varying, never a fixture — the `--doctor` posture of `BOOTSTRAP.md:43` ("prints and exits nonzero, never writes bytes"), applied to timing.

That split is the whole tooling. No dashboard, no new format, one field and two columns.

---

## 7. Cheap wins, ranked

| # | Win | Measured payoff | Cost | New abstraction |
|---|---|---|---|---|
| **1** | **`sources`/`outputs` on the 16 `gen:*` tasks** | `mise run gen` **≥67 s → ~2 s** on an unchanged tree; and since `[tasks.check]` runs `gen` first, that comes off *every* full check | 16 TOML declarations | none |
| **2** | **Batch `check:cas`'s 12 `lake exe` into one `lake env sh -c`** | **7.70 s → 4.27 s** (−3.4 s, the wrapper tax) | one `mise.toml` line | none |
| **3** | **`sources`/`outputs` on `check:cas` too**, with `surface` split to its own task | batched 4.27 s → **~1.0 s** when `surface`'s inputs are unchanged; `surface` alone is 3.3 s of the 4.27 | 2 declarations + 1 task split | none |
| **4** | **`ms` in `Gate.jsonLine`** | makes 1–3 auditable rather than anecdotal | ~5 lines | none |
| **5** | `task.source_freshness_hash_contents = true` | mtime → blake3 content; matches the estate's byte discipline instead of trusting stat | 1 setting | none |
| **6** | Two `sources`/`outputs` columns in `ENVIRONMENT.json` (EL1) | an undeclared emitter becomes a red gate | ~15 lines on EL1 | none |
| 7 | `BuildSig` + `Prog BuildSig` as the described build step | early cutoff; the venue-neutral description | ~1 signature + handler | none (rides R2/R10) |
| 8 | SSH `ChildProcessSpawner` layer (self-hosted venue) | PC/Mac pair as one build fabric | one Layer | none (rides `@effect/platform`) |
| 9 | ~~mise experimental remote task cache~~ | — | — | **REFUSE.** Experimental; "a checksum is not a signature"; the estate's addressing is strictly better. |

**Win 1 holds up.** It is not free of judgment — see ruling ask 1 — but the judgment is small, the hazard is one-sided (under-declared sources), the mitigation is over-declaring globs, and CI's fresh-clone mtimes make the authoritative gate immune. It is a ~35× cut on the most-run loop in the estate, purchased with declarations the emitters already know.

---

## 8. Ruling asks

1. **Is a *skipped* `gen:*` acceptable?** `[tasks.check]` = `gen` + `git diff --exit-code`. Declaring `sources`/`outputs` means the gate can pass without regenerating. Recommended posture: **yes locally, never in CI** — over-declare `sources` to whole trees, and require CI to force. The residual hazard is a Lean source outside the glob; the ratchet is that an over-wide glob costs only stats.
2. **How does CI force?** `mise run --force` does *not* propagate into the `mise run X` lines inside a `run` list. Options: a `check:ci` variant, `MISE_TASK_SKIP_DEPENDS`-style env, or relying on fresh-clone mtimes (git stamps checkout time; default strict `<` makes equal-mtime stale). **I reasoned the third from mise's source, I did not test it.** The slice must verify it before the gate depends on it.
3. **mtime or blake3?** `task.source_freshness_hash_contents = true` costs a hash of a few hundred small Lean files and matches R4's discipline (identity hashes presentations). Recommended: on. The estate should not have a freshness relation weaker than its identity relation.
4. **Where does the described build step live** — an arm of G6-a's `SystemNode` union, or a sibling `BuildSig`? **Recommended: defer until G6-a lands**, then decide from the landed shape. They are the same shape and deciding now is speculation.
5. **Rule the certificate explicitly:** the content address is the certificate for a remote build's output; **no signing plane is added**, on the ground that every estate object is in Nix's `isContentAddressed()` bypass branch and R5's word is a checkable observation rather than an asserted one. Worth writing down because the absence of signing will look like an omission to anyone who has read Nix.
6. **Rule build-step recovery out**, same as G6-a slice one: a described build step is authored and emitted, never recovered from an existing `mise.toml` or layer stack (Effect's reference-keyed `MemoMap`, confirmed in v4 `Layer.ts`).
7. **Refuse mise's experimental task `cache`** by name, with the reason on the record, so nobody adopts it later as an obvious-looking win.
8. **`surface`'s place in the hot loop.** It is 77% of `check:cas`'s real work and the only `supportInterpreter` exe. Own task, own cadence, or stays inline?
9. **Housekeeping, live:** the tree is mid-merge (`.git/MERGE_HEAD`; `UU mise.toml`, `UU library/cas/surface/cas-surface.json`) with the police lane landing concurrently. `mise.toml` has no conflict markers and `check:cas` is green, but `gen:backend-programs` returns rc=1 in this state. All numbers above were taken on that tree.

---

## 9. The one slice to commission

> **BS1 — declare the build relation to the runner that already implements it.**
>
> 1. `sources` + `outputs` on all 16 `gen:*` tasks and on `check:cas`, sources over-declared as whole-tree globs (`Cas/**/*.lean`, `tools/**/*.lean`, `lakefile.toml`, `lean-toolchain`), outputs taken from each emitter's own `Gate.Fixture` paths.
> 2. `task.source_freshness_hash_contents = true` (ask 3).
> 3. `check:cas`'s 12 `lake exe X --check` collapsed to one `lake env sh -c '…'`; `surface` split to its own task with its own `sources`.
> 4. `ms` added to `Gate.jsonLine`.
> 5. Two columns — declared `sources`, declared `outputs`, with `undeclared`/`unjoined` arrays — added to EL1's `ENVIRONMENT.json`, so a future emitter that forgets its declaration is a red gate rather than a silent slowdown.
>
> **Acceptance:** `mise run check` green; clean tree after `mise run gen`; a *verified* demonstration that a fresh clone re-runs everything (ask 2); before/after wall times recorded in the ledger as declared, host-stamped columns.
>
> **Estimated: ~20 TOML declarations, ~5 lines of Lean in `Gate.lean`, ~15 lines on EL1. Zero new abstraction. Zero new sorts. No registry row. Rides EL1, which is already the commissioned first tool of the bootstrap lane.**

**What I would not commission now:** `BuildSig`, the SSH `ChildProcessSpawner`, any `Derivation` kind, and anything that serves `cas-http/0`. Every one of them is *correct* — the mapping table says the estate is one described value away from having Nix's model with a better trust story — but they are downstream of G6-a landing and of BS1 proving the measurement discipline. The directive says "may fold into the G6/server-infra lane"; **this folds into it, and the fold is: G6-a lands the described-kind shape, BS1 lands the incrementality and the telemetry, and only then does a build step become a described value using the shape G6-a proved.** A build system minted before either is scope creep with a Nix citation attached.
