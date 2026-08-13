# Correctness gating: what the gates do not run

Status: built, on a branch, unmerged. Lane: correctness gating.
Audited at `72afae4` (origin/main).

Five filed issues describe one shape of debt. #32: every negative control in
the repository compiles in zero automated gate. #27: the wasm wall auto-skips
into green and is red when built. #35 row 5: no fixture-freezing protocol
exists and one that is cited does not. #33 A9: laws cited as ratified live only
as test comments. #37: three of four gauntlet verifiers have holes, and none of
them runs in CI.

The shape is: **the repository's strongest evidence is the evidence it does not
run.** Everything below is either an inventory of that, or machinery that
removes an instance of it.

---

## 1. The silent-skip inventory

Every conditional, skippable, tagged, or harness-dependent surface in the tree,
its condition, and whether CI satisfies it. "NEVER" means no workflow in
`.github/workflows/` reaches it. `gates.yml` and `model-gate.yml` were read
line by line; this is not inferred from names.

| # | Surface | Skip condition | Covered by |
| --- | --- | --- | --- |
| 1 | `packages/core/test/wasm.wall.test.ts:92` `describe.if(built)` | `built = existsSync(dist/stream.wasm) && existsSync(dist/wasm_exec.js)`; `dist/` is gitignored | **was NEVER** — `gates.yml` runs `bun test` but never `build:wasm`, so the wall reported `0 fail` unrun. Now `negative-controls.yml` → `controls` |
| 2 | `packages/core/test/wasm.wall.test.ts:158-159` `describe.if(!built)` + `test.skip` | the "loud skip" branch | **NEVER, and cannot fail by construction** — a `test.skip` inside a `describe.if` is a no-op that reports as a skip whether or not anything is wrong. See finding N-1 |
| 3 | `go/canonical/differential_fuzz_test.go:264` `t.Skip` | fuzz input > 1 MiB | seeds covered by `gates.yml`; the fuzz ENGINE is never run (no `-fuzz` anywhere in CI), so the skip only ever trims seed-corpus replays |
| 4 | build tag `catalogr4_sabotage` (`proto/go/protod/catalogr4_sabotage.go:1`) | tag absent | **was NEVER** → now `controls` |
| 5–8 | build tags `catalogr4_reply_{created,converged,admitted,refused}` (`proto/go/catalogr4/reply_mutant_*.go:1`) | tag absent | **was NEVER** → now `controls`, one run per tag |
| 9 | build tag `js && wasm` (`go/cmd/wasmwall/main.go:1`) | not cross-compiling | **was NEVER** → now `controls` via `bun run build:wasm` |
| 10 | build tag `!(js && wasm)` (`go/cmd/wasmwall/main_stub.go:1`) | cross-compiling | covered — it is the default build under `gates.yml`'s `go build`/`go vet`/`go test` in `go/` |
| 11 | `verify/catalog/run.sh` (R2, TLC) | human invocation | covered — `model-gate.yml`, weekly |
| 12 | `verify/catalog/run-wire.sh` (D59 CreateAtomic bridge) | human invocation | **was NEVER** → now `negative-controls.yml` → `bridge`, reached through `run-r4.sh` |
| 13 | `verify/catalog/run-r4.sh` (R4 lockstep) | human invocation | **was NEVER** → now `bridge`, weekly |
| 14 | `verify/catalog/run-ind.sh` (R3 induction, Apalache) | human invocation | **NEVER, deliberately** — 1–2 h, ~183 MB toolchain download. Left out with its reason stated rather than added and cancelled by a timeout |
| 15 | `verify/catalog/run-{ind,r4,wire}.ps1` | Windows only | **NEVER by construction** — no Windows runner exists. Three PowerShell twins of three bash gates, maintained by hand, checked by nobody. Finding N-2 |
| 16 | `verify/catalog/probes/*.cfg` (B1–B4, C1–C2, T1–T4, W1–W2, `CTIProbe.tla`, `BridgeFix.tla`) | human invocation | **NEVER, and there is no runner at all.** #32 refers to `probes/run-probe.sh`; that file does not exist in this tree. Finding N-3 |
| 17 | `cmd/gauntletverify`, `cmd/realverify`, `cmd/transposeverify` against `artifacts/` | human invocation | **was NEVER** (#37 G-09) → now `controls`. Compiled by `gates.yml`, never run |
| 18 | `cmd/climbverify` against `artifacts/receipts/r2-*` | human invocation | **NEVER, and currently impossible** — see finding N-4 |
| 19 | `FOLDLAB_JCS_FUZZ_RUNS` (`packages/core/test/jcs.differential.test.ts:15`) | env var | not a skip — a run-count knob, default 160, which THROWS on a bad value. Covered |
| 20 | `bunfig.toml` `[test] root = "packages"` | any test outside `packages/` | structural: a test added at the repository root, in `scripts/`, or in `bench/` is silently undiscovered by `bun test`. No current instance |
| 21 | `packages/{ai,client,codegen,server}` | — | **zero test files in four of five workspace packages.** `bun test` passes for them vacuously. Finding N-5 |
| 22 | `proto/ts/bunfig.toml` `root = "."` | — | covered — `gates.yml` runs `bun test .` in `proto/ts` |
| 23 | `bench/`, `docs/media/folding`, `docs/media/posters-v2` | — | outside every gate, by design (`bench/BENCH.md`) |

### New findings from the audit

**N-1 — the loud skip is itself silent.** `wasm.wall.test.ts` tries to make the
absence visible: when `built` is false it declares a second suite whose single
test is `test.skip("dist/ missing — run \`bun run build:wasm\` first")`. A
skipped test cannot fail. In CI it prints as one more skip among many and
changes no exit code, so the mechanism intended to make the gap loud is exactly
as quiet as the gap. The fix is not a better skip; it is what this lane built —
a step that BUILDS the artifact, so the condition is always satisfied.

**N-2 — three PowerShell gate twins that no gate reads.** `run-ind.ps1`,
`run-r4.ps1`, `run-wire.ps1` mirror the bash gates for the PC lane. There is no
Windows runner, so the two halves can drift silently, and the drift surfaces on
the machine where the operator is trying to reproduce a claim. Either add a
Windows job for the cheap one (`run-wire.ps1`), or record in
`verify/catalog/README.md` that the `.ps1` files are unverified transcriptions.

**N-3 — #32 cites `probes/run-probe.sh`; it does not exist.** The
`verify/catalog/probes/` directory holds seventeen configs, two TLA modules,
three findings, and a verdict — and no runner. Whatever produced
`BREAKER-VERDICT.md` and `FINDING-BOUNDS-001.md` was invoked by hand and left
no script. This is the same class as the two fixtures with no generator (§3):
evidence whose reproduction path was never written down.

**N-4 — R2's corpus is the gitignored file its own gate digests.**
`.gitignore` excludes `artifacts/receipts/*/corpus.json`; `climb.go:215-222`
reads exactly that file. Both R2 bundles in the tree are missing it:

```
$ go run ./cmd/climbverify ../artifacts/receipts/r2-001
climbverify: REFUSED: gauntlet: manifest refused: corpus: open
  ../artifacts/receipts/r2-001/corpus.json: no such file or directory
```

This is a hard blocker on #37's G-09 advisory for the R2 lane specifically, and
it interlocks with G-01: the corpus is simultaneously the ONLY anchor the R2
gate has and the one file the repository does not carry. The other three lanes
have no such problem — all six G1 bundles, both R1 and RG-A, verify green in
about two seconds total (§2).

**N-5 — four of five workspace packages have zero tests.** `packages/ai`,
`packages/client`, `packages/codegen`, `packages/server` ship no test file.
`bun test` is green for them because there is nothing to run. `packages/server`
is also where `SL1` is published to callers as a JSON field and checked by
nobody (§4).

**N-6 — a law-ID namespace collision, and a second one.** `C1` is two live
laws: concierge `C1` (fill/unfill are byte-pure) and entity `C1` (meaning-fold
totality, `packages/core/test/entity.test.ts:85`). Separately, `W1`–`W5` name
the proto wire laws in `proto/SPEC.md` AND the catalog model's SPEC laws in
`verify/AGENTS.md`. This is #33 A1's `D<n>` registry collision, in the law
namespace, and it is why `scripts/check-laws.ts` scopes its reverse scan to
test files rather than the whole tree.

---

## 2. The negative-controls workflow

`.github/workflows/negative-controls.yml`. Two jobs, split on cost.

### `controls` — per push and PR

Every step was run locally first, under `mise x go@1.26.5`, in the workflow's
own order. Measured wall clock on the recording machine (darwin/arm64, warm Go
and Bun caches):

| Step | s | Verdict |
| --- | --- | --- |
| `bun install --frozen-lockfile` | 0 (5.0 cold) | green |
| compile all five `catalogr4_*` tagged variants | 4 | green |
| canary: untagged reply-mutant must FAIL | 0 | **exit 1**, "reply-mutant mode requires one catalogr4_reply_\* build tag" |
| canary: untagged sabotage must FAIL | 1 | **exit 1**, "the AssertedIdentity sabotage went undetected" |
| R4 sabotage control (`-tags catalogr4_sabotage`) | 0 | green |
| R4 reply-mutant gate, four tags | 2 | green (4/4 caught) |
| R4 corrupted controls | 9 | green |
| R4 corpus determinism + branch coverage | 1 | green (131 schedules) |
| R4 honest replay | 11 | green (131 planned / 131 attempted / 3,079 driven steps) |
| `bun run build:wasm` | 0 (2.6 cold cross-compile) | green |
| wasm wall — frozen pin | 0 | green |
| wasm wall — garbage refuses as data | 1 | green |
| wasm wall — divergence classifier `--self-test` | 0 | green (4 controls) |
| wasm wall — known divergence unchanged | 0 | green (27 scalars, exactly the allowlist) |
| verifiers — G1 ×6, R1, RG-A ×3 | 2 | green (all VERIFIED) |
| verifiers — R2 blocked, visibly | 1 | **exit 1 required**, corpus-missing message |
| laws index `--self-test` | 0 | green (9 controls) |
| laws index gate | 0 | green (65 laws) |
| **total** | **29 s warm** | |

A cold CI runner adds module downloads and first builds; 3–6 minutes is the
realistic figure, against a 20-minute timeout.

Three design decisions worth arguing with:

**The job ships its own refutations, first.** Two canaries run before anything
expensive, in the spirit of `run-ind.sh`'s refutability canary: the mutant
harness is invoked with NO build tag and must fail, and the sabotage control is
invoked with NO tag and must fail. Both messages are grepped, not just the exit
code. This is the step that makes the rest of the job mean something — it
proves the controls are still wired to the tags rather than to something that
happens to be true.

**The known-red wall is gated by a classifier, not by hope.** #27 is a finding,
so the red test stays red (findings before fixes). But a permanently red wall
is a wall nobody reads, and its divergence is a single digest: one new scalar
moves that digest exactly as loudly as twenty-seven, which is to say not at all
once the eye has learned to skip the line. So
`scripts/wasm-wall-divergence.ts` attributes the divergence to individual
scalars and compares the SET against `fixtures/wasm-wall-known-divergence.json`
(27 entries: U+019B, U+0264, U+1C8A, U+A7CD, U+A7DB, and the 22 Garay scalars
U+10D70–U+10D85). Exit 0 only on an exact match. A 28th scalar fails; an
allowlisted scalar that CONVERGED also fails, because an allowlist that only
grows is a record of nothing. The two wall assertions that are not about case
tables are run separately and must pass. Verified locally in both directions: a
doctored allowlist (one entry swapped for `U+FFFF`) produced

```
WASM WALL DIVERGENCE: DRIFT — the case tables moved.
  NEW divergent scalars (1) …  U+019B
  Allowlisted scalars that now AGREE (1) …  U+FFFF
```

and exit 1; restoring it returned exit 0.

**The R2 gap is pinned, not omitted.** The step that cannot verify R2 asserts
the exact refusal instead. If someone commits the corpus, the step fails and
demands to be upgraded to a real gate. A gap that is asserted is tracked; a gap
that is absent from the workflow is forgotten.

### `bridge` — weekly and on dispatch

One step: `bash verify/catalog/run-r4.sh`, whose FIRST act is to run
`run-wire.sh`. Calling the script rather than transcribing its steps into YAML
is deliberate — the script is the gate, and a YAML copy would be a second gate
free to drift.

Measured locally, full run:

| Phase | wall clock |
| --- | --- |
| `run-wire.sh` — split-model canary (`Catalog.cap2`) | 2 s, reproduced 119,145 generated / 18,295 distinct / depth 16 |
| `run-wire.sh` — honest `CatalogWire` refinement | 3 min 51 s |
| `run-wire.sh` — faithless `CatalogWireBroken` | < 1 s, refuted on `Action property AtomicRefinement is violated` |
| R4 Go controls (sabotage → mutants → corrupted → coverage → honest) | ~27 s |
| **`run-r4.sh` total** | **≈ 4 min 25 s**, exit 0 |

Plus a one-time `tla2tools.jar` download. TLC runs `-workers 1` on a shared
runner and will be slower; the timeout is 60 minutes.

Why weekly rather than per-push: `model-gate.yml` already established the
schedule tier for TLC, and for a reason that applies here verbatim — the
tlaplus v1.8.0 release tag serves a ROLLING jar, so the toolchain under a
committed claim can move without anyone touching this repository. The canary is
the point of running on a schedule. The cron is 05:43 UTC Monday, after
`model-gate`'s 05:17, so the two TLC jobs do not contend.

### What this workflow does NOT do

R3 (`run-ind.sh`) stays human-invoked: 1–2 hours and a ~183 MB toolchain. The
probe configs (finding N-3) have no runner to call. Neither omission is
disguised as coverage.

---

## 3. The fixture-freezing protocol

`docs/FREEZING.md`. Assembled from what already worked: `wirefix`'s
`-force`-plus-stated-reason guard, ADR-0007's corpus-domain duty, and
`AGENTS.md`'s oracle and negative-control precepts. It covers who freezes, what
a freeze must carry (generator as a runnable command, corpus domain, oracle
statement, negative controls, overwrite guard), and the four-step regeneration
ritual whose first step is *establish that the mismatch is intended* — because
regenerating first destroys the finding permanently, the old bytes being the
only record of the old behaviour.

The inventory it carries confirms #35 row 5 exactly. Eight pre-existing
fixtures; **two have no regeneration path**: `fixtures/golden-conformance.json`
(no `_provenance` field at all, no generator anywhere in the tree, four
readers) and `packages/core/fixtures/fold-pin.json` (names its producer in
prose, no command). Only `wirefix`'s four have an overwrite guard.

**The two dangling pointers, and the proposed correction.** Both
`fixtures/stream-wall.json:2` and `go/cmd/streamfix/main.go:65-66` say
regeneration requires a stated reason in `docs/primitives/MECH-attempts.md`.
That file and that directory do not exist. Proposed, not applied — the fixture
is frozen and this lane reports rather than thaws:

> `"generated once by go/cmd/streamfix (go run ./cmd/streamfix); frozen. Regeneration requires a stated reason, per docs/FREEZING.md."`

The order matters: the sentence lives in the generator that WRITES the fixture,
so the correction is edit `streamfix/main.go`, then regenerate under the
protocol's own ritual with the stated reason "the provenance pointer named a
document that never existed". Every digest must come back byte-identical except
the `_provenance` string; a single moved digest means the correction caught real
drift, and is a finding. That makes the pointer fix the protocol's first
exercise and its own first regression test.

---

## 4. The laws index

`docs/LAWS.md` + `scripts/check-laws.ts`. 65 laws indexed across ten families.

```
laws indexed: 65  (BOUND 41, UNBOUND 13, unenforced 11)
test files scanned: 60
laws with NO enforcing test: W9 GV3 GV6 GV9 RL1 RL7 TV1 TV2 TV5 TV8 SL1
LAWS INDEX: CLEAN
```

`BOUND` means the named test exists AND the law ID appears as a standalone
token within 30 lines of it. `UNBOUND` means a test covers the behaviour but
nothing names the law — the correspondence is a human judgement recorded in the
index and nowhere else. Proximity is load-bearing: an early version accepted the
ID anywhere in the file, and an end-to-end control showed why that is too weak
(deleting `EL3` from the header table left a section comment 400 lines away
holding the binding). The window is 30 lines; the widest real binding in the
tree is 29 (`TV4`).

**The eleven unenforced laws.** `W9` was expected (#33 A9). The other ten were
not:

- `GV3` (registers strictly digest-sorted, in bijection), `GV6` (replay digest
  equality), `GV9` (manifests canonical) — implemented in `verify.go`, never
  refuted. `GV9` is further adrift: `ErrManifest` is the only error class in
  that file carrying no law ID.
- `GV1` and `GV2` share one test, which accepts EITHER `ErrChain` or
  `ErrSemantics` — so neither has a control that fires on it alone, and the two
  cannot be shown independent. That is a weaker position than "unenforced"
  looks like from the outside.
- `RL1` (chain + canonical bytes, "as always") has no control in the R1 lane at
  all; its confidence is inherited from other lanes.
- `RL7` is a scope boundary and is not mechanically checkable — listed so its
  absence is not mistaken for an oversight.
- `TV1`, `TV2`, `TV5`, `TV8` — four of the eight laws in the lane #37 calls the
  strong template. RG-A is the best verifier in the repository AND has the
  most unbound laws; those facts are about different things, which is the
  argument for the index.
- `SL1` is published to clients as a JSON field by `packages/server` and checked
  by nobody.

The checker ships nine negative controls (`--self-test`), one per rule, plus one
positive control asserting an honest index passes — a gate that only ever fails
is as useless as one that only ever passes. End-to-end verification: removing
`CL1`'s only mention from `climb_test.go` produced

```
LAWS INDEX: DRIFT — 1 violation(s).
  - CL1: go/gauntlet/climb_test.go is claimed as a BOUND enforcer but does not
    name the law — the ID was rewritten out of the test, which is exactly the
    drift this gate exists for
```

The reverse scan closes the other direction: a law ID that appears in a test
file with no index row fails, so the index cannot go stale by omission.

---

## 5. Verifier hardening — acceptance criteria for #37

Findings before fixes: the verifier lanes belong to the PC, and this lane does
not touch them. What follows is written to be buildable from without further
design. Each criterion names the file, the change, and the control that proves
the change works.

### G-01 — R2's external corpus pin

Today `climb.go:215-222` hashes `corpus.json` against `man.CorpusSHA256`, a
field of the same manifest. The bundle producer holds the only anchor, and a
`--fake` rehearsal whose corpus literally reads "FAKE problem…" earns
`R2 VERIFIED`.

Acceptance criteria:

1. `VerifyClimb` takes the expected corpus digest as an argument, sourced
   OUTSIDE the bundle: a package-level constant beside the `R2` floors (the
   same "spec's numbers" treatment `TestR2FloorsArePinned` already gives them)
   with a `-corpus-sha256` flag on `climbverify` to override it for a
   deliberately different corpus.
2. The manifest field is not replaced but CROSS-CHECKED: if
   `man.CorpusSHA256 != external`, refuse with both values, in the shape W1
   already uses for asserted identity. A bundle that disagrees with the pin is
   a finding about which corpus was actually run, and the refusal should say so.
3. A missing external pin is a refusal, never a fallback to the manifest.
   Silent degradation to the self-referential path reintroduces the hole under
   a different name.
4. Control, required: `TestClimbForeignCorpusRefused` — a bundle whose corpus
   and `CorpusSHA256` agree with each other but not with the external pin must
   refuse on `ErrManifest`, naming both digests. This is the exact probe that
   passes today.
5. Control, required (independence): the same bundle with the corpus RESTORED
   must still pass every CL law, so the new refusal is shown to fire on the
   pin and not on something it disturbed.
6. Blocker to resolve first: `artifacts/receipts/*/corpus.json` is gitignored
   (finding N-4). Either commit the corpora, or the external pin is
   unverifiable in CI and the R2 lane stays human-invoked. Decide this before
   writing code — it changes whether criterion 1's constant is checkable.

### G-03 — G1 worker attribution bound to the journal

Today `verify.go:268-315` derives ownership from the ledger FILENAME
(`owner := strings.TrimSuffix(filepath.Base(file), ".ndjson")`) and then checks
only that `run.Owner` agrees with it. `stepPayload` (`verify.go:89-93`) is
`{digest, result, step}` — the journal, which is the chain-protected artifact,
carries no worker at all. Re-owning all 525 ledger lines round-robin gives a
byte-identical report. RG-A refuses the same scramble because its attribution is
bound to physical execution.

Acceptance criteria:

1. `stepPayload` gains a `worker` field, canonical-encoded and therefore inside
   the journal's hash chain. Every step names the worker that ran it.
2. `Verify` requires, for every step, that a ledger line exists whose `owner`
   equals the journal's `worker` for the SAME `digest` and `fence`. The ledger
   remains the record of physical runs; the journal becomes the tamper-evident
   claim about who made them.
3. The filename keeps its current role — a grouping convention and a
   self-consistency check — and loses its evidentiary role entirely. Any
   attribution counted from filenames is a bug after this change.
4. `report.Workers` counts DISTINCT journal `worker` values, not ledger files.
   The `GV8` floor (`workers >= 8`) then means eight workers appeared in
   chained evidence.
5. Control, required: `TestG1ReownedLedgerRefused` — take a valid bundle,
   redistribute every ledger line round-robin across the eight owner files
   (rewriting the `owner` field to stay filename-consistent), and require
   refusal on `ErrLedger` naming the disagreeing step. This is the exact
   scramble that passes today, and it is already known to refuse under RG-A —
   so the RG-A run over the same scramble is the positive control that the test
   is measuring the right thing.
6. Control, required (independence): re-owning lines while ALSO updating the
   journal's `worker` fields must still refuse, on the chain, because the
   journal digests moved. If it does not, the worker field was added outside
   the hash.
7. This is a bundle-format change. The frozen bundles under
   `artifacts/gauntlet/` will no longer verify; that regeneration is governed by
   `docs/FREEZING.md`, and the stated reason is this criterion.

### G-04 — storm entries resolved against the journal

Today `verify.go:423-442` decodes `stormLine{Action, At, Target}` and uses only
`Action`, to count kills and restarts. `At` and `Target` are discarded. Twenty
five fabricated kills against `target: "ghost-that-never-existed"` pass, in all
three lanes.

Acceptance criteria:

1. `Target` must resolve. A `kill` names a worker that appears in the journal's
   `worker` set (after G-03) or the literal harness/server identifiers the run
   actually used; `restart-server` names the server. An unresolvable target is
   `ErrFloor` — or better, a new `ErrStorm`, since "the storm narrative is
   fiction" is not the same failure as "the floor was not met" and should not
   share an error class.
2. `At` must lie within the journal's step range, and the sequence of `At`
   values must be non-decreasing. A storm event outside the run it claims to
   describe is not evidence of anything.
3. Every `kill` must be FOLLOWED by evidence of its effect: a steal in
   `registers.ndjson` at a higher fence for a digest the killed worker held, or
   the same worker reappearing in the ledger at a later `At`. A kill with no
   consequence in the chained record did not happen.
4. `dup_runs` gains a floor. #37 recommends it and the shape is already
   present — `GV5` computes `dup_runs = ledger lines − steps` and checks the
   manifest's claim against it, but nothing requires the number to be non-zero,
   so a storm that killed nothing satisfies the honest-at-least-once law
   vacuously.
5. Control, required: `TestGhostKillRefused` — replace `storm.ndjson` with
   twenty five kills against an unknown target and require refusal. The
   verbatim probe from #37 G-04.
6. Control, required: `TestConsequenceFreeKillRefused` — a kill naming a REAL
   worker with no subsequent steal or reappearance must refuse, on criterion 3.
   Without this one, criterion 1 is satisfiable by naming any real worker.
7. Control, required (independence): a valid bundle must still pass with its
   storm untouched, and the RG-A lane's identical scramble must still refuse —
   the cross-lane comparison is what shows the three verifiers converging on
   one discipline rather than each growing its own.

### Not specified here

G-02 (R1's producer-chosen reuse factor), G-05 (R2's unread ledger
`nonce`/`fence`/`at`), G-07, G-08 — filed, real, and outside this lane's brief.
G-05 in particular has a cheap shape: G1 and RG-A already refuse the corruption
that R2 accepts, so the fix is porting a check that exists twice.

---

## 6. What landed

| Artifact | What it is |
| --- | --- |
| `.github/workflows/negative-controls.yml` | two jobs; six build tags, R4 lockstep, D59 bridge, wasm wall, three verifier lanes, both index gates |
| `scripts/wasm-wall-divergence.ts` | per-scalar divergence classifier + 4 self-test controls |
| `fixtures/wasm-wall-known-divergence.json` | the 27 known-divergent scalars, frozen, with corpus domain and a deletion condition |
| `scripts/check-laws.ts` | the laws-index gate + 9 self-test controls |
| `docs/LAWS.md` | 65 laws → statement → enforcing test |
| `docs/FREEZING.md` | the freezing protocol, the inventory, the dangling-pointer correction |
| this document | the audit and the design |

Nothing here fixes #27's underlying divergence, #37's verifier holes, or the
two fixtures with no generator. Those stay findings. What changed is that they
are now findings a gate can see.
