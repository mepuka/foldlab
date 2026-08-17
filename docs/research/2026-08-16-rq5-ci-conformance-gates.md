# RQ-5 — CI patterns for conformance as a build invariant

Research seat, 2026-08-16. Serves REF-9's standing law ("no silent drift
channel") and D-e obligation 5 (status-as-gate), per
`scratch/dispatch/19-refinement-research-questions.md`.

Reference area:
[`docs/research/reference/rq5-ci-conformance-gates/`](reference/rq5-ci-conformance-gates/)
— links plus distilled technique summaries in
[`links-and-techniques.md`](reference/rq5-ci-conformance-gates/links-and-techniques.md),
four own-authored runnable reproductions with transcripts, and the
inventory README recording provenance, licence, and retrieval date for
every item.

## Evidence grades used below

* **[ran]** — executed on this machine or read from a public API by this
  seat on 2026-08-16, with the transcript recorded.
* **[quoted]** — verbatim from a primary source (repository file at a
  named commit, official documentation, published paper), URL recorded.
* **[lead]** — recalled or secondary; explicitly unverified.

Every wall-clock number in this report was **read from the GitHub
Actions API on 2026-08-16**, not from anyone's prose, except the s2n
Travis figure which is quoted from the CAV 2018 paper and labelled as
such.

---

## 1. Summary of findings

1. **The field's blocking proof gate sits at 15–25 minutes.** Three
   independent projects converge there: s2n-tls's CBMC gate has a
   measured median of 18 min 14 s over its 30 most recent successful
   runs; Cedar's Lean job is 15 min 10 s; s2n's SAW gate was published at
   "an average of ten minutes". Above roughly half an hour, every project
   surveyed moves the work off the pull-request path. [ran], [quoted]

2. **Caching is not an optimisation for proof gates; it is the thing
   that makes them pull-request gates.** seL4's l4v runs the *same*
   proofs at 12–68 minutes per architecture with a warm Isabelle image
   cache and at 3 h 11 m – 4 h 45 m with `cache_read: ''`. Roughly 4× to
   15×. [ran]

3. **Every serious project pairs the cache with a cache-free tier.** l4v
   runs a weekly clean build with an explicitly emptied cache, and a
   semi-monthly build against *released* Isabelle rather than its own
   patched toolchain. Without those, a green tick can be an artifact of
   the cache or of the fork. [quoted]

4. **Gates that appear to check something and do not are the best
   documented failure mode in this material, and one of them is a
   documented GitHub behaviour, not a mistake.** "A job is skipped by a
   conditional → The job reports 'Success'." A required check carried on
   an `if:`-guarded job is satisfied by a job that never ran. [quoted]

5. **`lake build` exits 0 on a `sorry`.** Verified here on Lean 4.33.0.
   A Lean gate whose content is "the project builds" is not a proof
   gate; the axiom footprint is what carries the load, and
   `#print axioms` itself exits 0, so the gate must parse output rather
   than check a status. `verify/moves/run.sh` already does all of this
   correctly — this finding is a warning against future gates written
   more casually, not a defect report. [ran]

6. **No prior art found for a *blocking* executable-documentation-status
   gate in a verification project**, having searched the complete
   workflow sets of `aws/s2n-tls`, `seL4/l4v`, `cedar-policy/cedar-spec`,
   `hacl-star/hacl-star`, and `leanprover-community/mathlib4`. The
   nearest things are advisory (mathlib's weekly debt counters to Zulip;
   HACL\*'s regeneration bot PR) or coverage-shaped (Cedar's `lake lint`
   completeness check). The general-software answer — Rust doctests,
   OCaml MDX — is mature and blocking, but it verifies *examples*, not
   *status claims*. D-e obligation 5 is, on this evidence, ahead of the
   field rather than behind it, and we should expect to design it rather
   than copy it. [ran]

7. **No prior art found for REF-6's byte-identical regeneration gate
   either.** HACL\* is the closest — it commits generated C and proof
   hints — but reconciles drift by a weekly bot pull request, not by
   failing the build. That is a deliberate trade we should understand
   before adopting the stricter form. [quoted]

---

## 2. Wall-clock reality

All figures measured from the public GitHub Actions API on 2026-08-16
unless marked otherwise. Method: `gh api
repos/<owner>/<repo>/actions/workflows/<file>/runs`, differencing
`run_started_at` and `updated_at`; per-job and per-step figures from
`.../actions/runs/<id>/jobs`. [ran]

| Project | Gate | Where it runs | Measured wall clock |
| --- | --- | --- | --- |
| `aws/s2n-tls` | CBMC proofs, blocking PR check | GitHub-hosted, `cbmc_ubuntu-latest_64-core`, `timeout-minutes: 60` | job min 15 m 59 s, **median 18 m 14 s**, max 22 m 30 s (n = 30 successes). Inside run `31747929174`: toolchain install 69 s, **`Run CBMC proofs` 15 m 28 s**, report + upload 43 s |
| `aws/s2n-tls` | SAW/Cryptol HMAC equivalence | Travis CI (2018), now AWS CodeBuild | "These proofs run in an average of ten minutes." — CAV 2018, p. 439 [quoted] |
| `seL4/l4v` | 5-arch Isabelle proofs, blocking PR check, **warm** image cache | AWS VMs driven from GitHub Actions | run `31312545469`: X64 12 m 47 s, RISCV64 13 m 37 s, ARM_HYP 13 m 58 s, ARM 15 m 06 s, **AARCH64 67 m 50 s**; workflow 67 m 53 s. Other recent PR runs 68 m – 4 h 27 m |
| `seL4/l4v` | ~35-config weekly clean, **`cache_read: ''`** | same | per-config jobs 3 h 11 m – 4 h 45 m; six most recent successful workflow totals 4 h 05 m – 4 h 30 m |
| `cedar-policy/cedar-spec` | `lake build Cedar SymCC` + `lake lint` + unit/symbolic tests + docs, blocking PR check, **no cache** | stock `ubuntu-latest` | **15 m 10 s**; whole `ci.yml` 24 m 17 s (six recent successes 24 m – 73 m) |
| `hacl-star/hacl-star` | `nix build .#hacl`, per push and PR | self-hosted, warm Nix store | 77–85 s across the successful runs observed (one failed run 108 s) — **this measures a cache hit, not proof effort**; recorded as a cautionary datum, not as HACL\*'s verification cost |
| **this estate** | `lean-gates.yml` — `verify/moves/run.sh` + `verify/ir/run.sh` | stock `ubuntu-latest`, cold toolchain | **27–35 s** total (all three runs to date). Run `31969900190` step detail: checkout 4 s, elan bootstrap 1 s, **moves gate 22 s** (of which Lean 4.33.0 toolchain download and install ≈5.5 s, `lake build` a further ≈16 s), ir gate 2 s |
| **this estate** | `gates.yml` battery | stock `ubuntu-latest` | 1 m 47 s – 2 m 15 s (eleven successful runs) |
| **this estate** | `model-gate.yml` TLC | recorded on the author's machine | ~11 m 23 s gate config; ~12 m full six-verdict run (from the workflow's own header comment) [quoted] |

### What these numbers mean for REF-9

The estate's Lean gate is **two orders of magnitude cheaper than the
field's** — 22 seconds against Cedar's 15 minutes for a comparable
"build the Lean library and check it" step. That is not luck: `verify/moves`
depends on Lean core and Std only, with no Mathlib, no FFI static
libraries, no symbolic compiler, and no doc build. It is worth naming
that as a property to defend rather than an accident to spend.

The practical consequence for REF-9's update cycle: at 22 seconds the
proof half of the chain can run on **every** commit with no caching
machinery at all. The cost will move to the other slices — corpus
regeneration, the wasm build, the corpus driven through the kernel on two
platforms — and the budget should be set against s2n's demonstrated
18-minute median rather than against the current 22 seconds.

s2n's own operational lesson, quoted verbatim (CAV 2018, p. 439):

> We discovered that it's best to stay well clear of the 60 min limit imposed by Travis in order to avoid false-negatives due to variations in execution time.

A gate whose failures are sometimes timeouts teaches people to re-run,
and a gate people re-run reflexively is an advisory gate wearing a
blocking gate's costume.

---

## 3. How projects handle proof-breaks-the-build

### 3.1 Blocking, and stated as such

s2n-tls is unambiguous. CAV 2018, §4 "Operationalizing the Proof", p. 443,
verbatim:

> We have integrated the checking of our proof into the build system of s2n, as well as the Continuous Integration (CI) system used to check the validity of code as it is added to the s2n repository on GitHub. For the green "build passed" badge displayed on the s2n GitHub page to appear, all code updates now must successfully verify with our proof scripts.

and p. 439:

> The proof runs alongside the tests that are present in the s2n repository on every build, and if the proof fails a flag is raised just as if a test case were to fail.

The published maintenance data behind that decision, p. 444 (§4,
"Proof Metrics"):

> Since deployment of the proof to the CI system in November of 2016 our proofs have been re-played 956 times. This number does not account for proof re-plays performed in forks of the repository. We have had to update the proof three times. In all cases the proof update was complete before the code review process finished.

Three proof updates in 956 replays is the number that makes a blocking
gate tolerable, and the paper says so directly, p. 443:

> Too many proof updates can lead to significantly slowed development or, in the extreme case, to proofs being disabled or ignored in the CI environment.

That sentence is the field's own statement of RQ-5's anti-pattern
section. A blocking proof gate degrades into an ignored one when it is
too brittle, and brittleness is a *design* property of the proof, not of
the CI. s2n's mitigation — proofs structured so that changes to parts of
a struct that do not affect the computation do not break the proof — is a
proof-engineering answer, and belongs to RQ-8's territory more than
this one.

### 3.2 Tiering: the l4v three-tier shape

The clearest tiering design in the survey, and the one I recommend
copying. [quoted]

| Tier | Trigger | Scope | Cache | Question it answers |
| --- | --- | --- | --- | --- |
| PR | `pull_request_target` | 5 architectures, `session: '-x AutoCorresSEL4'`, `skip_dups: true` | warm S3 Isabelle images | Did this change break a proof? |
| Weekly clean | `cron: '1 15 * * 6'` | ~35 arch × domain × platform configs | **`cache_read: ''`** | Is the green tick an artifact of the cache? |
| External | `cron: '1 15 1,15 * *'` | 5 architectures | default | Is the green tick an artifact of our patched toolchain? (`manifest: default.xml`, vanilla Isabelle) |

Two things to notice. First, the PR tier is *deliberately incomplete* —
one large session excluded, duplicates skipped — and the incompleteness
is written into the workflow file where a reader sees it, not buried in a
script. Second, each lower tier exists to refute a specific way the tier
above it could be lying. That is the same discipline as this estate's
negative-controls battery, applied to CI infrastructure rather than to
the proofs.

### 3.3 Caching and incrementalisation, concretely

* **l4v**: Isabelle heap images in S3. The action's own input
  descriptions are the documentation — `cache_read: 'Read Isabelle image
  cache from S3. Set to empty string to skip.'`, `cache_write`,
  `cache_bucket` defaulting to `isabelle-images`, and `skip_dups: 'Skip
  duplicate proofs.'` Measured benefit above: 4×–15×. [quoted], [ran]
* **HACL\***: SMT proof hints committed to the repository (`hints/`), plus
  a Nix store on a self-hosted runner. The hints make F\*'s SMT queries
  replay against recorded unsat cores instead of being re-searched.
* **Cedar**: no cache at all. elan is installed from the upstream shell
  script on every run and everything is rebuilt. At 15 minutes they can
  afford it, and they get cache-poisoning immunity for free. **This is
  the shape our Lean gate already has**, and at 22 seconds we are even
  further inside the affordable envelope.
* **s2n-tls**: no cache; every solver downloaded and, for Bitwuzla, built
  from source on each run — 69 seconds of the 18-minute median. The
  benefit is that the pinned versions are what actually ran.

The pattern across all four: **cache only when you must, and when you
do, run a cache-free tier on a schedule.** Nobody in this survey caches a
proof gate without a cold-start canary.

---

## 4. Prior art for D-e's status-as-gate

D-e obligation 5 asks for one command that re-verifies a documented
status claim at HEAD, cited by the ledger row, so documentation cannot
silently drift from code.

### 4.1 What exists, ranked by closeness

**Closest in a verification project — Cedar's `lake lint`.** The CI step
is named "Lint for unchecked theorems"; the implementation, quoted from
`cedar-lean/lakefile.lean`, is a `@[lint_driver] script checkThm` that
walks `Cedar/Thm.lean` and `SymCC.lean` and fails if any `.lean` file in
the corresponding directory is not transitively imported. It is a
*completeness* check, not a `sorry` check: the hazard it closes is a
proof file that exists in the tree, is believed to be checked, and is not
in the build. That is the same hazard this estate's orphan rule in
`verify/moves/run.sh` closes, approached from the import side rather than
the theorem side. Worth noting: reading the step name alone would give
you the wrong idea of what it does — a small instance of the very drift
these gates exist to prevent. [quoted]

**Closest in general software — Rust doctests and OCaml MDX.** Rustdoc,
verbatim: "`rustdoc` supports executing your documentation examples as
tests. This makes sure that examples within your documentation are up to
date and working." MDX, verbatim: "MDX allows to execute code blocks
inside markdown and mli/mld documentation to help keeping them up to
date." MDX's mechanism is the interesting one: `dune runtest` executes
the blocks, writes the correct output to `README.md.corrected`, and fails
with a `git diff`; `dune promote` accepts. [quoted]

**Advisory analogues.** mathlib4's `technical_debt_metrics.yml` runs a
counter script weekly and posts to Zulip — no merge is blocked. HACL\*'s
`hintsanddist.yml` regenerates `hints/` and `dist/` weekly and opens a
bot PR. Both are the honest shape for a *trend*; neither is a status
claim's truth-value. [quoted]

**Absence, stated.** Searching the complete workflow lists of
`aws/s2n-tls` (23 workflow files), `seL4/l4v` (10),
`cedar-policy/cedar-spec` (8), `hacl-star/hacl-star` (5), and
`leanprover-community/mathlib4` (54) — counts read from the contents API
on 2026-08-16 — plus the s2n `codebuild/spec` batch (24 buildspecs),
**no gate was found
that re-derives a claim written in a status or assurance document and
fails the build when the document is false.** [ran]

### 4.2 The shape I recommend, with its reproduction

The reference area contains a working minimal version:
[`status-as-gate/`](reference/rq5-ci-conformance-gates/status-as-gate/).
`STATUS.md` carries machine-readable markers beside its prose;
`check-status.sh` re-derives every claim from the sources at HEAD;
`--self-test` plants a defect and requires the checker to go red on
exactly the claims that cover it. All four paths are in the transcript:
green, drifted, markers-deleted, and self-test. [ran]

Three properties make the shape work, and each corresponds to a way it
fails without them:

1. **The claim lives beside the prose it makes true.** A status document
   with the number in one place and the gate reading it from another is
   two documents that can disagree.
2. **Values are re-derived, never read back.** The failure this avoids —
   a gate that compares the status file against a lockfile the same
   command regenerates — is always green and checks nothing. This estate
   already gets this right in `verify/moves/run.sh`, which emits the
   corpus to a *temporary* file and `cmp`s against the committed
   fixture rather than regenerating in place.
3. **Deleting the claim is a failure, not a pass.** Without the
   zero-claims check, the cheapest route to green is to delete the
   documentation.

---

## 5. Anti-patterns: gates that appear to check something and do not

Ordered by how quietly they fail. The first three are the dangerous ones
because they fail *open* and *silent*.

### A1. A required check carried on a conditional job — fails open

Verbatim, GitHub documentation, section "Handling skipped but required
checks" (`github/docs`,
`content/pull-requests/how-tos/merge-and-close-pull-requests/troubleshooting-required-status-checks.md`,
read 2026-08-16): [quoted]

| Cause | Result |
| --- | --- |
| A workflow is skipped by path filtering, branch filtering, or a commit message | Associated checks stay in a "Pending" state and block merging |
| **A job is skipped by a conditional** | **The job reports "Success"** |
| A job depends on a failed job | The dependent job is skipped and may not block merging |

and, from "Required check needs to succeed against the latest commit
SHA":

> Successful check statuses are `success`, `skipped`, and `neutral`.

The asymmetry is the point. Path filtering fails **safe** — the check
hangs Pending and blocks the merge; annoying, visible, fixed in an hour.
A job-level `if:` fails **open** — the required check reports Success on
the strength of a job that never executed, and the green tick is
indistinguishable from a real one.

**Bearing on us.** `negative-controls.yml` gates its `bridge` and
`windows-r4` jobs on
`if: ${{ github.event_name == 'schedule' || github.event_name == 'workflow_dispatch' }}`.
That is correct *as a scheduled tier*. It would become silently vacuous
the day either job name is added to the required-checks list. The D-e
status command must therefore live in an unconditional job, in a workflow
with no `paths:` filter. See
[`skipped-required-check/`](reference/rq5-ci-conformance-gates/skipped-required-check/).

I could not read this repository's branch-protection settings — the
available token returns `403 Resource not accessible by personal access
token` for
`repos/mepuka/foldlab/branches/main/protection` — so **whether any check
is currently required here is unverified by me.** [ran]

### A2. `continue-on-error` — fails open, by design

Verbatim, GitHub workflow syntax reference: [quoted]

> `jobs.<job_id>.continue-on-error` ... Prevents a workflow run from failing when a job fails. Set to `true` to allow a workflow run to pass when this job fails.

and for steps:

> Prevents a job from failing when a step fails. Set to `true` to allow a job to pass when this step fails.

Neither appears in this repository today. The recommendation is negative
and permanent: **no gate step or gate job may carry
`continue-on-error`.** A gate that is allowed to fail is a metric.

### A3. The gate's exit status lost in the pipe — fails open

Executed here 2026-08-16
([transcript](reference/rq5-ci-conformance-gates/exit-code-masking/TRANSCRIPT.md)): [ran]

* bash without `pipefail`: `false | tee /dev/null` observed exit **0**.
  With `set -eo pipefail`, exit 1.
* Command substitution swallows `set -e` too: `out=$(false | tee ...) || ...`
  continues.
* PowerShell 7.6.5: `Tee-Object` does *not* clobber `$LASTEXITCODE`
  (measured: stays 3), but there is no `set -e` for native commands, and
  `$ErrorActionPreference = 'Stop'` does **not** stop execution after a
  failing native command.

This is not folklore. AWS's own SAW driver documents it in a comment,
verbatim from `aws/s2n-tls` `tests/saw/Makefile`: [quoted]

> `# The pipefail command causes the entire command to fail if saw fails, even though we pipe it to tee`
> `# without it we would see only the tee return code`

**Bearing on us.** `gates.yml` and `negative-controls.yml` both set
`defaults.run.shell: bash -Eeuo pipefail {0}`, so their many
`... 2>&1 | tee ci-logs/...` steps are safe. `lean-gates.yml` does **not**
set that default — it does not currently pipe, so nothing is wrong
today, but the next `| tee` added there would be silently unguarded. The
Windows job's explicit `if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }`
is load-bearing and should never be "simplified away".

### A4. "The proofs build" is not "the proofs check"

Executed here on Lean 4.33.0
([transcript](reference/rq5-ci-conformance-gates/lean-sorry-gate/TRANSCRIPT.md)): [ran]

```text
warning: SorryLab/Basic.lean:21:8: declaration uses `sorry`
Build completed successfully (4 jobs).
lake build exit code: 0
```

Four findings from that run:

1. `lake build` exits **0** with a `sorry`; the hole is a warning.
   (`lake build -DwarningAsError=true` is not available:
   `error: unknown short option '-D'`.)
2. A theorem one hop downstream inherits `sorryAx` with no `sorry` token
   on any of its own lines — a source grep confined to one package cannot
   see a hole imported from another.
3. `#print axioms` **itself exits 0**; it reports on stdout. A gate that
   runs it and checks the exit code checks nothing. `verify/moves/run.sh`
   correctly parses the output, counts the reports against the roster
   size, and rejects any axiom outside
   `{propext, Classical.choice, Quot.sound}`.
4. `native_decide` mints a **per-declaration** axiom name — observed:
   `SorryLab.compiled._native.native_decide.ax_1_1`. An
   allowlist-everything-else-rejected check catches it; a
   denylist-of-known-bad-names would not. This matters specifically for
   REF-6, where compiler trust is the thing under discussion.

### A5. Cache-poisoned green

l4v's answer is a scheduled tier with `cache_read: ''`. The cautionary
datum in the other direction is HACL\*'s `nix.yml`, which completes in
81–108 s on a warm self-hosted Nix store. Quoting that as "HACL\*
verifies in 90 seconds" would be wrong; it measures a cache hit. Any
number this estate publishes about REF-6's build must state whether the
cache was cold. [ran]

### A6. Budget-shrunk checks that keep their full name

Cedar's corpus-generation job runs `TIMEOUT=5 FUZZ_TARGET=abac
./create_corpus.sh` — a five-second fuzz budget. The job is named "Test
Corpus Generation", which is accurate: it tests that generation *works*.
It does not test that the corpus is *adequate*. Similarly Cedar's PR-tier
DRT job builds the fuzz targets and runs `cargo test`; the long
differential campaigns are not on the PR path. Neither is dishonest —
but neither name says so, and a reader inferring "Cedar differentially
tests every PR against the Lean model" would be over-reading. [quoted]

This estate's own precedent is sharper: DEV-670's naive corpus would have
skipped 99% of its universe while reporting green. The mitigation already
in the tree is the right one and should be extended to every new gate:
**pin the count and assert coverage**, as
`packages/moves/test/conformance.test.ts` does (zero skips, count pinned)
and as `negative-controls.yml`'s "corpus determinism + ratified-branch
coverage" step does.

### A7. Promotion workflows: the one-command route to a green lie

MDX's `dune promote` and every snapshot-testing tool in its family
resolve a red gate by rewriting the expectation. That is exactly right
when the expectation is an *example output*, and exactly wrong when it is
a *law*. The distinguishing question is whether a second, independent
gate covers the promoted file.

This estate already has the correct instance: `verify/moves/run.sh` pins
`Moves/Spec.lean` by sha256, so the frozen spec cannot be edited to make
a proof pass without the pin being re-declared in the same commit. Any
regeneration convenience added for REF-6 or REF-9 must sit behind a pin
of the same kind, or the update loop acquires a one-command path to a
green lie.

### A8. Stale gate wiring

mathlib4 gates its own CI wiring: `validate_mathlib_ci_paths.yml`
triggers on `pull_request` with `paths: ['.github/workflows/**']` and
fails if any `$CI_SCRIPTS_DIR/...` reference in any workflow is missing
from a fresh checkout of the shared CI repository or escapes its root.
Its header states the purpose verbatim: "Prevent CI breakages caused by
stale or mistyped `CI_SCRIPTS_DIR` paths in workflow files". A gate whose
script path has rotted is a gate that stopped running. [quoted]

### A9. A gate that has never been observed to run

Three workflows here are schedule-only and, measured on 2026-08-16, have
zero recorded runs: `model-gate.yml` (0 runs; `cron: "17 5 * * 1"`),
`windows-induction.yml` (0 runs; `cron: "23 6 1 * *"`), and
`negative-controls.yml`'s scheduled `bridge` and `windows-r4` jobs (0
schedule-triggered runs of that workflow). **This is expected, not a
defect**: all three landed 2026-08-13, a Thursday, and the first Monday
fire is 2026-08-17. It is recorded here because the general hazard is
real — a scheduled gate's green is not evidence until it has actually
fired once — and because the fix is one `workflow_dispatch` away. [ran]

### A10. Name-matching hazards in required checks

Verbatim from the same GitHub page: "If a check and a commit status have
the same name, both must pass when that name is required." The corollary
worth knowing is the renaming one: required checks are matched by
**name**, so renaming a job — including changing a matrix dimension that
appears in the generated job name — silently un-requires the old name.
Any D-e status command should therefore be a job whose name is treated as
part of the ratified decision, not a cosmetic string. [quoted]

---

## 6. Recommendations

Each states its cost, what it adds to the trusted base, and what
reversal would take, per the dispatch discipline.

### R1. The D-e status command runs in an unconditional job

The workflow carries no `paths:` filter; the job carries no `if:`; no
step or job carries `continue-on-error`; the job's name is treated as
ratified text.

* **Cost.** The status gate runs on every pull request even when nothing
  it covers changed. At the estate's current 22-second Lean gate this is
  free; if the status command later grows to include the corpus and the
  wasm build, the cost becomes real and R3's tiering answers it — by
  splitting *which* tier does the expensive work, never by putting an
  `if:` on the required job.
* **Trusted base.** Adds nothing. It *removes* an implicit trust in the
  CI scheduler's decision to run the job.
* **Reversal.** Delete two lines of YAML. No artifact, no dependency.

### R2. Budget the pull-request tier at 20 minutes; schedule anything longer

Set on the field's evidence — s2n 18 min median, Cedar 15 min, l4v's PR
tier deliberately trimmed to fit — and on s2n's published warning about
running near the runner's limit.

* **Cost.** Some checks REF-6 would like on every PR (the full corpus
  through the kernel on both platforms; cold-cache regeneration) will not
  fit and must go to a scheduled tier, which means a window in which a
  regression is on `main` undetected.
* **Trusted base.** Adds nothing technical; adds a *process* assumption
  that the scheduled tier is watched. That assumption is where this kind
  of design usually rots, and it should be named in VERIFICATION.md
  rather than assumed.
* **Reversal.** Move a job between workflows.

### R3. Adopt l4v's three tiers verbatim in structure

Tier 1 pull-request (fast, may be deliberately incomplete, with the
incompleteness written in the workflow file); tier 2 scheduled
cache-free/clean-checkout; tier 3 scheduled against the *released*
toolchain rather than any pinned-and-patched one.

* **Cost.** Three workflows to maintain instead of one, and two schedules
  whose failures arrive asynchronously. Tier 3 in our case means building
  the wasm kernel against a stock emscripten/WASI-SDK release rather than
  a pinned one, which will find real breakage on someone else's timetable.
* **Trusted base.** Tier 2 *removes* the build cache from the trusted
  base on a weekly cadence. Tier 3 *removes* the pinned toolchain from it
  on a monthly cadence. This is the recommendation that most directly
  serves REF-6's honesty.
* **Reversal.** Delete the two scheduled workflows; the PR tier is
  unaffected.

### R4. Build the status command as a re-derivation with a self-test

Per §4.2 and the working reproduction. Every claim is recomputed from
sources; the checker ships `--self-test`; zero claims is a failure.

* **Cost.** Each new claim needs a derivation written for it, and claims
  that are genuinely hard to re-derive (a prose statement about scope)
  cannot be gated and must be honestly marked as ungated rather than
  quietly included. That discipline is the expensive part.
* **Trusted base.** Adds the checker itself. Mitigated exactly as the
  estate already mitigates it elsewhere: the checker's own refutation
  runs first and cheapest, so a checker that has stopped checking fails
  before anything it certifies.
* **Reversal.** Delete the script and the markers; the ledger row reverts
  to prose. Nothing downstream depends on it.

### R5. Copy Cedar's import-closure check for the new namespaces

When REF-1 lands `verify/wire/` (or `Moves.Wire`), add the mirror of
Cedar's `lake lint`: every `.lean` file under the theorem directory must
be transitively imported by the namespace root. This complements — does
not replace — the existing orphan rule, which works from the theorem
side.

* **Cost.** One Lake script, ~40 lines, and the discipline of keeping the
  root file's imports current. A false positive fires whenever a file is
  added deliberately outside the closure, which then has to be justified.
* **Trusted base.** Adds nothing; it *narrows* the base by removing the
  assumption that every proof file in the tree is in the build.
* **Reversal.** Remove the `@[lint_driver]` attribute.

### R6. For REF-6, gate the regeneration; do not adopt HACL\*'s bot-PR form

HACL\* reconciles regeneration drift by a weekly bot pull request. That
trade buys the ability to accept a legitimate regeneration without a red
build, and it is the right trade for a project whose consumers vendor the
generated C. It is the wrong trade for us: REF-9's standing law is
precisely that a semantic change either regenerates everything or the
build fails, and a bot PR is a channel by which the model and the running
system can disagree for up to a week.

Recommendation: strict byte-diff gate on the designated build platform,
as D-bc already ratifies. Adopt HACL\*'s anti-noise idea, not its
resolution mechanism — their
`[[ 1 -lt $(git diff --compact-summary HEAD~.. | grep -v INFO.txt | wc -l) ]]`
guard against metadata-only diffs is worth having, because a gate that
goes red on a build-timestamp byte will be disabled within a month.
RQ-6 owns which bytes those are.

* **Cost.** A legitimate model change makes the build red until the
  regenerated artifact is committed in the same change. That is the
  intended behaviour and it will feel expensive on the day it happens.
* **Trusted base.** Adds the build platform's toolchain determinism to
  the set of things the gate depends on — which is exactly what D-bc's
  amendment 3 already contemplates and what RQ-6 is dispatched to
  measure.
* **Reversal.** Demote the byte-diff from a gate to a recorded datum, as
  D-bc already does for cross-platform identity. One line in the gate
  script; no artifact changes.

### R7. Do not add a proof cache until measured need

Cedar builds Lean from scratch on every PR at 15 minutes; we do it at 22
seconds. Adding a cache now would buy nothing and would immediately
require R3's tier 2 to refute it.

* **Cost.** If REF-6's build turns out to be minutes rather than seconds,
  this recommendation will need revisiting, and the revisit will cost
  more than building the cache now would have.
* **Trusted base.** Not adding a cache keeps the build cache *out* of the
  trusted base entirely — the strongest position available, and one we
  currently hold for free.
* **Reversal.** N/A — this is a recommendation not to add something.

---

## 7. What the surveyed material does not answer for our seam

Named, not glossed.

1. **No precedent found for gating on byte-identical regeneration of a
   compiled artifact.** HACL\* commits generated C and reconciles by bot
   PR; l4v, Cedar, and s2n generate nothing that they byte-diff. REF-6's
   gate has no surveyed prior art, so its failure modes will be
   discovered here first. RQ-6 owns the toolchain half; the *CI* half —
   what a red regeneration diff should say, and how a legitimate
   regeneration is accepted without opening a drift channel — is
   unanswered by anything in this survey.

2. **No proof gate in the survey runs on Windows.** l4v runs on Linux AWS
   VMs, Cedar on `ubuntu-latest`, s2n's CBMC gate on an Ubuntu 64-core
   label. HACL\* builds on Windows, but that is the *generated C* build,
   not verification. This estate already runs PowerShell gate twins, which
   on this evidence is unusual rather than standard, and there is **no
   published wall-clock for a Lean proof gate on Windows** to budget
   REF-6's Windows lane against.

3. **No precedent for D-d's totality gate as a CI check.** "Every input
   byte string returns a typed refusal; a WASM trap on any corpus row is
   a gate failure" has no analogue in the survey. Cedar's DRT is the
   nearest relative and it compares two implementations' *outputs*, not
   the absence of traps in one. How to make "no trap on 2000 rows" a
   fast, non-flaky check — and how to distinguish a trap from a harness
   crash — is ours to design.

4. **No data on what a *specification* change costs a gated chain.**
   s2n's "956 replays, three proof updates" is the best published number
   in the survey and it measures the wrong thing for REF-9: it counts
   proof updates forced by *code* change, not by *spec* change. REF-9's
   premise is a living model, and the survey has nothing on the cost of
   propagating a spec edit through proofs, corpus, kernel, and two
   runtimes. That gap belongs to RQ-8, and this report cannot close it.

5. **No blocking executable-documentation-status gate found anywhere.**
   Stated in §4.1 with the search scope. D-e obligation 5 is being
   designed rather than adopted. The reproduction in the reference area
   is my proposal, not evidence that anyone runs it.

6. **Branch-protection reality here is unverified.** The token available
   to this seat cannot read
   `repos/mepuka/foldlab/branches/main/protection` (403). Every §5
   anti-pattern about required checks is therefore stated against
   GitHub's documented behaviour, not against this repository's actual
   configuration. Someone with admin access should confirm which checks
   are required before D-e's status command is written, because A1 turns
   on exactly that answer.

7. **s2n's SAW gate wall-clock is not independently retrievable.** The
   SAW proofs run on AWS CodeBuild, whose durations the GitHub API does
   not expose. The ten-minute figure is from the 2018 paper and describes
   a Travis-era configuration; the current CodeBuild cost is unknown to
   me. The CBMC numbers in §2, by contrast, I measured.

8. **How a red proof gate is triaged in practice is thinly documented.**
   Every project surveyed says the gate is blocking; none publishes what
   happens between "the gate went red" and "the gate is green again" —
   who is paged, whether the change is reverted or the proof repaired,
   how long the median red window is. s2n's "in all cases the proof update
   was complete before the code review process finished" is the single
   published sentence on the subject in this survey. For a one-operator
   estate this matters more than for a team, and there is no evidence
   here to design against.

---

## Sources

Repository files, each read 2026-08-16 via the GitHub contents API at the
repository state recorded in
[`reference/rq5-ci-conformance-gates/links-and-techniques.md`](reference/rq5-ci-conformance-gates/links-and-techniques.md):

* <https://github.com/aws/s2n-tls/blob/main/.github/workflows/proof_ci.yaml>
* <https://github.com/aws/s2n-tls/blob/main/.github/workflows/proof_ci_resources/config.yaml>
* <https://github.com/aws/s2n-tls/blob/main/tests/saw/Makefile>
* <https://github.com/aws/s2n-tls/blob/main/tests/saw/README.md>
* <https://github.com/aws/s2n-tls/blob/main/codebuild/spec/buildspec_generalbatch.yml>
* <https://github.com/seL4/l4v/blob/master/.github/workflows/proof.yml>
* <https://github.com/seL4/l4v/blob/master/.github/workflows/weekly-clean.yml>
* <https://github.com/seL4/l4v/blob/master/.github/workflows/external.yml>
* <https://github.com/seL4/ci-actions/blob/master/aws-proofs/action.yml>
* <https://github.com/seL4/l4v/blob/master/README.md>
* <https://github.com/cedar-policy/cedar-spec/blob/main/.github/workflows/ci.yml>
* <https://github.com/cedar-policy/cedar-spec/blob/main/.github/workflows/build_and_test_drt_reusable.yml>
* <https://github.com/cedar-policy/cedar-spec/blob/main/.github/workflows/corpus_generation_test_reusable.yml>
* <https://github.com/cedar-policy/cedar-spec/blob/main/cedar-lean/lakefile.lean>
* <https://github.com/hacl-star/hacl-star/blob/main/.github/workflows/nix.yml>
* <https://github.com/hacl-star/hacl-star/blob/main/.github/workflows/hintsanddist.yml>
* <https://github.com/leanprover-community/mathlib4/blob/master/.github/workflows/validate_mathlib_ci_paths.yml>
* <https://github.com/leanprover-community/mathlib4/blob/master/.github/workflows/technical_debt_metrics.yml>
* <https://github.com/realworldocaml/mdx>

Documentation and papers:

* GitHub Docs, "Troubleshooting required status checks" —
  <https://docs.github.com/en/pull-requests/collaborating-with-pull-requests/collaborating-on-repositories-with-code-quality-features/troubleshooting-required-status-checks>
  (quotations taken from the documentation *source* in `github/docs`,
  `content/pull-requests/how-tos/merge-and-close-pull-requests/troubleshooting-required-status-checks.md`)
* GitHub Docs, workflow syntax reference, `continue-on-error` —
  <https://docs.github.com/en/actions/reference/workflows-and-actions/workflow-syntax>
* Rustdoc book, "Documentation tests" —
  <https://doc.rust-lang.org/rustdoc/write-documentation/documentation-tests.html>
* A. Chudnov, N. Collins, B. Cook, J. Dodds, B. Huffman, C. MacCárthaigh,
  S. Magill, E. Mertens, E. Mullen, S. Tasiran, A. Tomb, E. Westbrook,
  "Continuous Formal Verification of Amazon s2n", CAV 2018, pp. 430–446.
  PDF retrieved 2026-08-16 from
  <https://d1.awsstatic.com/Security/pdfs/Continuous_Formal_Verification_Of_Amazon_s2n.pdf>;
  page numbers in quotations are the printed page numbers visible in the
  running heads.

GitHub Actions API measurements were taken with `gh` 2.97.0 against the
`actions/workflows/*/runs` and `actions/runs/*/jobs` endpoints on
2026-08-16.

---

## Independent verification — 2026-08-16

Adversarial re-check by a second seat, same day, working from the report
and the reference area only. Every source below was re-fetched
independently (`gh` 2.97.0, same machine, Lean 4.33.0 / elan 4.2.3); the
runnable reproductions were re-executed from a scratch copy. Nothing in
the report body above was edited — findings before fixes.

### Claim table

| # | Claim | Source re-checked | Verdict | Evidence |
| --- | --- | --- | --- | --- |
| 1 | s2n's CBMC gate is unconditional on `push`/`pull_request`/`merge_group`, `cbmc_ubuntu-latest_64-core`, `timeout-minutes: 60`, with pinned solvers in a data file and a step refusing unset/`latest` | `aws/s2n-tls` `proof_ci.yaml`, `proof_ci_resources/config.yaml` | CONFIRMED | Both re-read verbatim; job `run_cbmc_proofs` carries no `if:`; config pins `cbmc-version "6.9.0"`, `z3-version "4.13.0"`, `bitwuzla-version "0.5.0"`, `kissat-tag "rel-4.0.3"`. See defect D1 on "every solver". |
| 2 | Gate wall clock min 15 m 59 s, median 18 m 14 s, max 22 m 30 s (n = 30); `Run CBMC proofs` 15 m 28 s in run `31747929174` | GitHub Actions API | CONFIRMED | Recomputed independently: n=30, min 15 m 59 s, max 22 m 30 s, median 1093.5 s = 18 m 13.5 s. Step row 21:58:52 to 22:14:20 = 15 m 28 s exactly. |
| 3 | l4v PR tier (warm cache) 12 m 47 s – 67 m 50 s vs `weekly-clean.yml` `cache_read: ''` 3 h 11 m – 4 h 45 m — "a 4x to 15x difference **on the same proofs**" | `proof.yml`, `weekly-clean.yml`, `aws-proofs/action.yml`, runs `31312545469` / `31263687650` | **REFUTED (as worded)** | Every number reproduces exactly (X64 767 s, RISCV64 817 s, ARM_HYP 838 s, ARM 906 s, AARCH64 4070 s; weekly n=35, min 11514 s, max 17159 s; `cache_read` default `'true'`, described as "Read Isabelle image cache from S3"). But the tiers do **not** run the same proofs: `proof.yml` sets `session: '-x AutoCorresSEL4'` — excluding the session its own comment calls "large" — and `weekly-clean.yml` sets no `session` at all. The ratio conflates cache with scope. |
| 4 | GitHub documents that a conditional-skipped job reports "Success" (fails open) while a path/branch-filtered workflow stays Pending (fails safe); successful statuses are `success`, `skipped`, `neutral` | `github/docs` `troubleshooting-required-status-checks.md` | CONFIRMED | Both table rows and "Successful check statuses are `success`, `skipped`, and `neutral`." re-read verbatim from the contents API. A10's "If a check and a commit status have the same name, both must pass when that name is required." also verbatim. |
| 5 | On Lean 4.33.0 `lake build` exits 0 on `sorry`; `derived` reports `sorryAx`; `#print axioms` exits 0; `native_decide` mints `<decl>._native.native_decide.ax_1_1` | `lean-sorry-gate/` (own-authored) | CONFIRMED | Re-ran `bash run.sh` from a scratch copy: output identical to `TRANSCRIPT.md` line for line, including `SorryLab.compiled._native.native_decide.ax_1_1` and both exit codes 0. `lake build -DwarningAsError=true` independently reproduced `error: unknown short option '-D'`, exit 1. |
| 6 | Cedar's "Lint for unchecked theorems" is an import-closure completeness check, not a `sorry` check | `cedar-lean/lakefile.lean`, `.github/workflows/ci.yml` | CONFIRMED | `@[lint_driver] script checkThm` calls `checkThmFile "Cedar.Thm"` over `Cedar/Thm.lean` and `SymCC.lean`, recursing the directory and printing "missing import"; no `sorry`/axiom scan anywhere in the file. Step name in `ci.yml` is exactly "Lint for unchecked theorems" running `lake lint`. |
| 7 | No gate in the five surveyed repos re-derives a claim written in a status/assurance document and fails the build when the document is false; HACL\* is the only project committing generated artifacts and reconciles by weekly bot PR rather than by failing the build | Workflow sets of all five repos | **REFUTED** | Three counterexamples inside the surveyed set. (a) mathlib4 `build_template.yml` step "check declarations in db files" runs `lake exe check-yaml`; `scripts/check-yaml.lean` reads `docs/100.yaml` — whose own header reads "This file tracks the formalisation status of theorems" — plus `1000/overview/undergrad.yaml`, and calls `IO.Process.exit 1` when a named declaration is absent from the environment or deprecated. No `continue-on-error`; its `post_steps` job gates the `final` post-CI job. (b) `aws/s2n-tls` `ci_rust.yml` job `check-generated-cargo-toml` regenerates `s2n-tls-sys/Cargo.toml` and fails on `git diff --exit-code Cargo.toml`. (c) `aws/s2n-tls` `ci_compliance.yml` job `duvet` re-runs `initialize_duvet.sh` and exits 1 on non-empty `git status --porcelain`. (b) and (c) are on `pull_request` with no job-level `if:`. The HACL\* half is correct in isolation: `hintsanddist.yml` is `on: schedule` `'0 0 * * 0'` with `peter-evans/create-pull-request@v6` and the quoted anti-noise guard, verbatim. |
| 8 | CAV 2018 quotations at pp. 439, 443, 444 | AWS-hosted PDF, retrieved and text-extracted | CONFIRMED | All six quoted passages verbatim at the stated printed pages (PDF pages 10, 14, 15). §4 is indeed titled "Operationalizing the Proof" and "Proof Metrics." is a paragraph head within it. |
| 9 | `lean-gates.yml` 27–35 s cold; moves gate 22 s including ~5.5 s toolchain install; vs Cedar's 15 m 10 s | Actions API, run `31969900190`, job `95220611843` | CONFIRMED | Three runs: 27 s, 32 s, 35 s. Steps: checkout 4 s, elan 1 s, moves 22 s, ir 2 s. Log: `downloading .../lean-4.33.0-linux.tar.zst` 20:13:09.1, `installing .../leanprover--lean4---v4.33.0` 20:13:13.6, `GATE: PASS` 20:13:29.9. Cedar run `31823824816`: "Build and test Lean (stable)" 910 s = 15 m 10 s, whole workflow 1457 s = 24 m 17 s. |
| 10 | This seat cannot read `repos/mepuka/foldlab/branches/main/protection`, so required-check claims are stated against documented behaviour, not this repo's settings | GitHub REST API | CONFIRMED | Reproduced identically: `403 {"message":"Resource not accessible by personal access token"}`. Anti-pattern A1 remains hypothetical here and unverified as live. |
| 11 | Workflow-file counts: s2n 23, l4v 10, cedar-spec 8, hacl-star 5, mathlib4 54 | Contents API | CONFIRMED | Downloaded every file: 23 / 10 / 8 / 5 / 54. (s2n's directory lists 24 entries, one of which is the `proof_ci_resources` directory.) |
| 12 | `tests/saw/Makefile` pipefail comment, verbatim | `aws/s2n-tls` | CONFIRMED | Both comment lines present exactly as quoted; the recipe uses `set -o pipefail` before piping `saw` into `tee`. The negative-control recipes with the `grep "error: in _SAW_verify_prestate"` assertions are present as summarised. |
| 13 | `continue-on-error` doc quotes; neither form appears in this repository | GitHub workflow-syntax docs; this repo | CONFIRMED | Job form and step form both verbatim. `grep -rn continue-on-error .github/workflows/` returns nothing. |
| 14 | Rustdoc and OCaml MDX quotations | rust-lang/rust docs source; realworldocaml/mdx README | CONFIRMED | Both verbatim, including MDX's "to help keeping them up to date". |
| 15 | mathlib4 `validate_mathlib_ci_paths.yml` triggers on `pull_request` with `paths: ['.github/workflows/**']`; header purpose quote | mathlib4 | CONFIRMED | Trigger and header text both as stated. |
| 16 | Cedar's corpus job runs `TIMEOUT=5 FUZZ_TARGET=abac ./create_corpus.sh` under the name "Test Corpus Generation" | `corpus_generation_test_reusable.yml` | CONFIRMED | Present exactly; the sibling ABAC-type-directed job likewise. |
| 17 | A9 — `model-gate.yml`, `windows-induction.yml`, and `negative-controls.yml`'s scheduled jobs have zero recorded runs | Actions API | CONFIRMED | `model-gate.yml` 0 runs, `windows-induction.yml` 0 runs, `negative-controls.yml` 27 runs all `event: push` — so `bridge` and `windows-r4` have never executed. |
| 18 | l4v's three-tier shape (PR / weekly clean / external released toolchain) | `proof.yml`, `weekly-clean.yml`, `external.yml` | CONFIRMED | Triggers `pull_request_target`, `cron: '1 15 * * 6'`, `cron: '1 15 1,15 * *'`; `manifest: default.xml` on the external tier; the `weekly-clean.yml` matrix arithmetic gives exactly 35 configs. |
| 19 | The `exit-code-masking` and `status-as-gate` reproductions behave as transcribed | Reference area | CONFIRMED | Re-ran all of them from a scratch copy. bash without pipefail gives 0, with pipefail gives 1; command substitution swallows `-e`; pwsh keeps `$LASTEXITCODE=3` through `Tee-Object` and continues past a failing native command under `$ErrorActionPreference='Stop'`. Status gate: green exit 0, drifted exit 1, markers-deleted exit 1, `--self-test` exit 0. |
| 20 | `gates.yml` battery "1 m 47 s – 2 m 15 s (eleven successful runs)" | Actions API | **REFUTED** | The API shows 78 successful runs overall spanning 63 s – 136 s, and 27 successes within the most recent 30 runs spanning 97 s – 135 s. Neither the count nor the 1 m 47 s floor reproduces; the 2 m 15 s ceiling does. |

**Tally.** 20 checked — 17 CONFIRMED, 3 REFUTED, 0 UNVERIFIABLE. No
invented API, flag, or signature was found anywhere in the report or the
reference area; every configuration key, CLI flag, and function name
sampled exists in its cited source.

### Bearing on the decisionImpact

Refinement (1) — the D-e status command must run in an unconditional job,
in a workflow with no `paths:` filter and no `continue-on-error` — **stands
unmodified**. Its documentary basis is verbatim, and the estate facts it
rests on (the two `if:`-guarded jobs, the absence of `continue-on-error`,
`lean-gates.yml` having no `paths:` filter) all check out.

Refinement (3) — adopt l4v's three tiers in shape with a 20-minute
pull-request budget — **stands**. The tier structure and both budget
anchors (s2n's 18-minute median, Cedar's 15 m 10 s) reproduced exactly.

Refinement (2) — **its premise is refuted; its recommendation survives.**
The claim that REF-6's byte-diff regeneration gate has *no* surveyed prior
art, and that HACL\*'s weekly bot PR is the only surveyed way anyone
reconciles a committed generated artifact, is false: `aws/s2n-tls`
regenerates `s2n-tls-sys/Cargo.toml` and its duvet compliance data on the
pull-request path and **fails the build** on any diff. That is the strict
form D-bc ratified, running in production in one of the two projects this
report holds up as the field's best practice. The recommendation to keep
D-bc's strict gate is therefore *strengthened*, not weakened — but §7
item 1's "l4v, Cedar, and s2n generate nothing that they byte-diff" and
§1 finding 7's "no prior art" must be withdrawn, and R6 should cite s2n's
two gates as the precedent it says does not exist.

The operational note (three schedule-only workflows with zero recorded
runs) is confirmed exactly as written.

### Defects

1. **D1 — "every solver version pinned" is overstated.** §3.3 says s2n
   runs with "the pinned versions" being "what actually ran", and
   `links-and-techniques.md` §1 technique 2 says "*Every solver is
   version-pinned in a separate data file*". `config.yaml` sets
   `cadical-tag: latest`, `cbmc-viewer-version: latest`, and
   `litani-version: latest`; run `31747929174` contains a step literally
   named "Install latest cadical". Cadical is a SAT solver. The correct
   statement is that s2n pins CBMC, Z3, Bitwuzla and kissat, and *refuses*
   `latest` for Z3 and Bitwuzla only.

2. **D2 — the 4x–15x figure is not a clean cache measurement.**
   §1 finding 2 and `links-and-techniques.md` §3 both assert "the *same*
   proofs". `proof.yml` passes `session: '-x AutoCorresSEL4'`;
   `weekly-clean.yml` passes no `session`, so the weekly tier runs a
   strict superset of proof sessions. The report's own §3.2 correctly
   notes the PR tier is "deliberately incomplete", which contradicts the
   "same proofs" wording two sections earlier. The honest claim is that
   warm-cache PR jobs and cold-cache weekly jobs differ by 4x–15x, with
   cache *and* excluded session both contributing, and this survey unable
   to separate them.

3. **D3 — the central absence claim is false (material).** §1 finding 6,
   §4.1 "Absence, stated", and §7 item 5 all assert that no blocking
   executable-documentation-status gate exists in the surveyed set.
   mathlib4's `lake exe check-yaml` is exactly that gate, and mathlib4 is
   one of the five repositories whose workflow set the report counted.
   `scripts/check-yaml.lean` re-derives, against the environment at HEAD,
   every claim of the form "this theorem or topic is formalised as
   declaration `N`" made by four documentation files, and exits 1 when any
   is false. This is the nearest published relative of D-e obligation 5,
   and the report says it does not exist. Its limits should be stated when
   it is adopted: it checks that the named declaration exists and is not
   deprecated, not that the declaration proves what the prose says — a
   partial re-derivation, but a blocking one on precisely the drift
   channel D-e targets.

4. **D4 — the regeneration-gate absence claim is false (material).**
   §7 item 1's "l4v, Cedar, and s2n generate nothing that they byte-diff"
   is contradicted by `aws/s2n-tls` `ci_rust.yml`
   (`check-generated-cargo-toml`) and `ci_compliance.yml` (`duvet`), both
   blocking pull-request-path regeneration-diff gates. See the
   decisionImpact note above.

5. **D5 — the `gates.yml` wall-clock row does not reproduce.** See
   table row 20. A background datum, load-bearing for nothing, but the
   report opens by stating every wall-clock number was read from the API,
   and this one cannot be recovered from it.

6. **D6 — A1 and R1 name job *ids*, not check names.** The report says a
   hazard arises "the day either job name is added to the required-checks
   list", naming `bridge` and `windows-r4`. Those are the job ids; the
   names GitHub matches required checks against are the `name:` values,
   "D59 wire bridge + R4 lockstep (TLC)" and "PowerShell wire + R4 twins
   (Windows)". Given that A10 is itself about name matching, R1's "the
   job's name is treated as ratified text" should say which string it
   means.

7. **D7 — dispatch deviation, disclosed.** The dispatch requires a
   `README.md` at the root of `docs/research/reference/`. It is absent;
   the RQ-5 README states the omission and the reason (eight sibling
   seats writing concurrently). Recorded here so the consolidation step
   does not lose it. Nine topic directories now exist under
   `docs/research/reference/`.

**Discipline compliance.** Sources dated (2026-08-16 throughout, with
upstream commit SHAs recorded in `links-and-techniques.md`); evidence
grades declared and applied ([ran] x14, [quoted] x18); leads separated —
all four coordinator leads for RQ-5 were pursued and none was smuggled in
as evidence; §7 "what the surveyed material does not answer" present with
eight named gaps; every recommendation in §6 carries cost, trusted-base
delta, and reversal; the reference-area README records provenance,
licence, and retrieval date per item and states what is deliberately
absent. No `UNVERIFIED` marks appear, and none was required — nothing in
the report is asserted from memory. The failure here is not one of
labelling but of search completeness: rule 3 ("absence is a finding") was
invoked twice on searches that missed a gate inside their own stated
scope.

**Verdict: material defects.** Two load-bearing absence claims (D3, D4)
are refuted by primary sources inside the report's own declared search
scope, and one measurement claim (D2) is confounded. No ratified decision
is reversed by these findings and no recommendation is overturned — R6
and R4 are, if anything, better supported once the precedents are
acknowledged — but §1 findings 6 and 7, §4.1's absence paragraph, and §7
items 1 and 5 need withdrawal and rewriting against the counterexamples
named above.
