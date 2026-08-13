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
| 15 | `verify/catalog/run-{ind,r4,wire}.ps1` | Windows only | **was NEVER** — now `negative-controls.yml` runs `run-r4.ps1` (and therefore `run-wire.ps1`) weekly; `windows-induction.yml` runs `run-ind.ps1` monthly |
| 16 | `verify/catalog/probes/*.cfg` (B1–B4, C1–C2, T1–T4, W1–W2, `CTIProbe.tla`, `BridgeFix.tla`) | human invocation | breaker-only by contract; the cited `probes/run-probe.sh` has existed since `149ab34b4`, already an ancestor of the audited base |
| 17 | `cmd/gauntletverify`, `cmd/realverify`, `cmd/transposeverify` against `artifacts/` | human invocation | **was NEVER** (#37 G-09) → now `controls`. Compiled by `gates.yml`, never run |
| 18 | `cmd/climbverify` against `artifacts/receipts/r2-*` | fetched corpus absent | **was impossible** — now `controls` reconstructs the competition-owned corpus, verifies the verifier-owned digest, and classifies both bundles' exact known-red refusals |
| 19 | `FOLDLAB_JCS_FUZZ_RUNS` (`packages/core/test/jcs.differential.test.ts:15`) | env var | not a skip — a run-count knob, default 160, which THROWS on a bad value. Covered |
| 20 | `bunfig.toml` `[test] root = "packages"` | any test outside `packages/` | structural: a test added at the repository root, in `scripts/`, or in `bench/` is silently undiscovered by `bun test`. No current instance |
| 21 | `packages/{ai,client,codegen,server}` | — | **resolved** — server has a public-route test; ai/client/codegen are exact empty promotion placeholders with explicit markers; `check-package-tests.ts` rejects any untested runtime body |
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

**N-2 — three PowerShell gate twins that no gate read (resolved).**
`negative-controls.yml` runs `run-r4.ps1`, whose first act is `run-wire.ps1`,
on a Windows runner every week and on dispatch. The expensive Apalache
`run-ind.ps1` mirror has its own monthly Windows workflow and manual dispatch.
All three scripts are invoked as gates rather than transcribed into YAML.

**N-3 — the reported missing breaker runner is stale, not reproduced.**
`verify/catalog/probes/run-probe.sh` is tracked at `149ab34b4`, which is already
an ancestor of the audited `72afae43d` base. It records the jar digest, exact
TLC command, timestamps, exit, and verdict into `probes/_runlogs/`. Its header
also correctly bounds it as a breaker probe, never a ratified `run.sh` gate.
No replacement runner or claim promotion was invented.

**N-4 — R2's corpus was the gitignored file its own gate digested (resolved).**
`.gitignore` excludes `artifacts/receipts/*/corpus.json`; `climb.go:215-222`
reads exactly that file. Both R2 bundles in the tree are missing it:

```
$ go run ./cmd/climbverify ../artifacts/receipts/r2-001
climbverify: REFUSED: gauntlet: manifest refused: corpus: open
  ../artifacts/receipts/r2-001/corpus.json: no such file or directory
```

That was a hard blocker on #37's G-09 advisory for the R2 lane specifically.
The verifier-integrity repair now owns the ratified digest as
`gauntlet.R2CorpusSHA256`; the manifest can repeat but cannot choose it.
`negative-controls.yml` runs the checked-in fetcher, which refuses unless the
reconstructed canonical bytes match that external pin, copies those verified
bytes to the second bundle, and runs `climbverify` on both. That first honest
run exposed `FINDING-R2-ARTIFACTS-001`: `r2-001` misses the holdout-gain floor
and `r2-002` uses holdout evidence before final selection. The gate classifies
only those exact refusals and fails on a pass or different failure.
Competition-owned problem text remains uncommitted without leaving the invalid
artifacts unexecuted. The self-declared-corpus test is the independent pin
control.

**N-5 — four of five workspace packages had zero tests (resolved by policy).**
`packages/server` now has an in-process HTTP test that binds health plus the
SL1/SL4 public response laws. `packages/ai`, `packages/client`, and
`packages/codegen` currently contain only `export {}` promotion placeholders;
each carries the exact intentionally-test-free marker. `check-package-tests.ts`
allows that marker only on the empty body and refuses a new runtime export
until the package gains a test. Its self-test proves both refusal directions.

**N-6 — a law-ID namespace collision, and a second one.** `C1` is two live
laws: concierge `C1` (fill/unfill are byte-pure) and entity `C1` (meaning-fold
totality, `packages/core/test/entity.test.ts:85`). Separately, `W1`–`W5` name
the proto wire laws in `proto/SPEC.md` AND the catalog model's SPEC laws in
`verify/AGENTS.md`. This is #33 A1's `D<n>` registry collision, in the law
namespace, and it is why `scripts/check-laws.ts` scopes its reverse scan to
test files rather than the whole tree.

**#61 follow-up:** the registry now requires `concierge:C1` / `entity:C1`
and `proto-wire:W1` / `catalog-model:W1` (through W5). These are index aliases,
not silent edits to the frozen source-local IDs.

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
| verifiers — R2 ×2 after pinned fetch | network + 2 | known red: exact GV8 and CL2/CL3 refusals classified; forged-corpus control refuses |
| laws index `--self-test` | 0 | green (13 controls) |
| laws index gate | 0 | green (71 laws; one unenforced) |
| package test-policy self-test + gate | 0 | green (3 controls; every package accounted for) |
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

**The R2 corpus is reconstructed, independently pinned, and then executed.**
The corpus text remains gitignored because the problems are competition-owned.
The checked-in fetcher is therefore part of the gate: it canonicalizes the
named public dataset and refuses unless the bytes match the verifier-owned
digest. The manifest's matching digest is only a cross-check. The workflow
then runs both committed record bundles, accepts only their exact known-red
classifications, and separately proves that a producer cannot substitute a
forged corpus by changing its own manifest. Neither bundle is presented as
verified; see `go/gauntlet/FINDING-R2-ARTIFACTS-001.md`.

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

### Windows and breaker disposition

The PowerShell R4/wire mirrors run weekly; the 1–2 hour, ~183 MB PowerShell R3
induction mirror runs monthly. The breaker probes remain human-invoked because
their own runner declares them non-ratified exploration, but they do have the
recording runner the issue claimed was absent. Neither breaker evidence nor a
manual invocation is promoted into a verification claim.

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

`docs/LAWS.md` + `scripts/check-laws.ts`. After the #61 enforcement follow-up,
71 context-qualified registry entries are indexed across ten families.

```
laws indexed: 71  (BOUND 56, UNBOUND 11, DESIGN 3, unenforced 1)
laws with NO enforcing test: proto-wire:W9
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

**#61 closure.** GV1 and GV2 now have separate controls, with GV2 rebuilding
the outer chain around a semantically wrong payload. GV3, GV6, GV9, RL1, and
TV1/TV2/TV5/TV8 each have a one-artifact public-verifier control. GV9's
G1-specific manifest refusal names its law while preserving `errors.Is` for
the shared manifest class. RL7 is classified `DESIGN`: it excludes output
quality from the claim and cannot honestly have a quality mutant.
`catalog-model:W2` and W5 are likewise design-only because the model explicitly
does not claim them; catalog-model:W3 remains honestly UNBOUND. The only `—`
row is `proto-wire:W9`. SL4, published and asserted at the server route on the
adopted base, is now bound beside SL1.

The checker ships thirteen self-controls: two positive controls (an honest
index and a complete collision registry) plus eleven attacks covering every
rule, including Go test-name discovery and both collision directions. A gate
that only ever fails is as useless as one that only ever passes. End-to-end verification: removing
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

## 5. Verifier hardening — #37 disposition

The verifier-integrity repair was integrated into this gate branch before the
R2 workflow was enabled. The sections below record the implemented decisions
and any remaining findings.

### G-01 — R2's external corpus pin (implemented)

`gauntlet.R2CorpusSHA256` is the verifier-owned anchor beside the frozen R2
floors. `VerifyClimb` cross-checks the manifest against it and hashes the local
corpus against it; there is no CLI override that could silently restore
producer authority. Synthetic tests use an explicit helper pin so test data
does not weaken the public gate. `TestClimbSelfDeclaredCorpusRefused` mutates
both corpus and manifest together and proves the verifier still refuses, while
the honest fixture tests establish independence. The CI fetch step makes the
external pin checkable without committing competition-owned text.

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
| `scripts/check-laws.ts` | the laws-index gate + 13 self-test controls |
| `docs/LAWS.md` | 71 context-qualified laws → statement → enforcing test or explicit design boundary |
| `docs/FREEZING.md` | the freezing protocol, the inventory, the dangling-pointer correction |
| this document | the audit and the design |

Nothing here fixes #27's underlying divergence, #37 findings outside the
explicit #61 law-control set, or the two fixtures with no generator. Those
stay findings. What changed is that they are now findings a gate can see.
