# Real CI configurations — links and distilled techniques

Per the reference-area rule, third-party CI configurations are captured
as **links plus a distilled summary of the technique**, not copied. Every
entry names the file, the repository state it was read at, and the date.
All measurements in this file were read from the public GitHub Actions
API on **2026-08-16** with `gh api`, not from anyone's prose.

---

## 1. `aws/s2n-tls` — CBMC proofs as a blocking pull-request check

* File: `.github/workflows/proof_ci.yaml`
  <https://github.com/aws/s2n-tls/blob/main/.github/workflows/proof_ci.yaml>
* Tool versions: `.github/workflows/proof_ci_resources/config.yaml`
* Repository `main` at `72f5db1fb96635a655ec90569ade0d500ea0555c` (2026-08-13),
  read 2026-08-16.
* Licence: Apache-2.0 (repository); the workflow file carries
  `SPDX-License-Identifier: MIT-0`. Nothing copied here.

**Technique.**

1. *The gate is the ordinary PR path.* Triggers are `push`,
   `pull_request`, and `merge_group` — no schedule, no conditional on the
   job. One job, `run_cbmc_proofs`, `timeout-minutes: 60`, on a
   64-core runner label (`runs-on: cbmc_ubuntu-latest_64-core`).
2. *Every solver is version-pinned in a separate data file*, and a
   dedicated step fails the build if any version is unset — including an
   explicit refusal of `latest` for Z3 and Bitwuzla. The pins are
   `cbmc-version: "6.9.0"`, `z3-version: "4.13.0"`,
   `bitwuzla-version: "0.5.0"`, `kissat-tag: "rel-4.0.3"`. An unpinned
   solver is treated as an unpinned gate.
3. *The proof run is one command from a config key*
   (`run-cbmc-proofs-command: ./run-cbmc-proofs.py`), so the workflow
   cannot drift from the driver.
4. *The HTML report is uploaded as an artifact on public repositories* —
   the gate's output survives the run.

**Measured wall clock** (GitHub Actions API, 30 most recent successful
runs, 2026-07 to 2026-08-14): min 15 min 59 s, median 18 min 14 s,
max 22 min 30 s for the whole job. Inside run `31747929174` the step
breakdown was: toolchain install ≈ 69 s (CBMC, viewer, Litani, Z3,
Bitwuzla built from source, kissat, cadical), **`Run CBMC proofs`
15 min 28 s**, report zip + upload ≈ 43 s.

---

## 2. `aws/s2n-tls` — SAW/Cryptol equivalence proofs, and their negative tests

* Driver: `tests/saw/Makefile`
  <https://github.com/aws/s2n-tls/blob/main/tests/saw/Makefile>
* Description: `tests/saw/README.md`
* Wiring: `codebuild/spec/buildspec_generalbatch.yml` — batch entry
  `identifier: s2nSawTls` with `SAW: true`, on AWS CodeBuild rather than
  GitHub Actions. Started from `.github/workflows/codebuild.yml`.
* Licence: Apache-2.0. Nothing copied.

**Technique.**

1. *Pipeline status is protected explicitly.* Verbatim comment in the
   Makefile:

   > `# The pipefail command causes the entire command to fail if saw fails, even though we pipe it to tee`
   > `# without it we would see only the tee return code`

   and the recipe is `set -o pipefail; saw $< | tee $@`.
2. *The gate ships negative controls, and they are Makefile targets, not
   prose.* `failure-tests` applies a patch to the source, rebuilds the
   bitcode, runs the **same** proof script, and requires it to fail
   *with the expected error*:

   ```
   set -o pipefail; \
   ! (saw verify_HMAC.saw 2>&1 | tee $@)
   grep "error: in _SAW_verify_prestate" $@
   ```

   Five planted defects: `tls_early_ccs`, `tls_missing_full_handshake`,
   `sha_bad_magic_mod`, `cork_one`, `cork_two`. The `grep` is what makes
   this a control rather than a coincidence — a proof that failed for an
   unrelated reason does not satisfy it.
3. *The patch is reverted and the original exit status preserved* — the
   bitcode recipe captures `status=$$?`, un-patches, then `exit $$status`.

**Wall clock:** not publicly retrievable. These run on AWS CodeBuild,
whose run durations are not exposed by the GitHub API. The published
number for this proof family is in the CAV 2018 paper (below).

---

## 3. `seL4/l4v` — a three-tier Isabelle proof CI

* PR tier: `.github/workflows/proof.yml`
  <https://github.com/seL4/l4v/blob/master/.github/workflows/proof.yml>
* Clean tier: `.github/workflows/weekly-clean.yml`
* Toolchain tier: `.github/workflows/external.yml`
* The action they all call: `seL4/ci-actions` `aws-proofs/action.yml`
  <https://github.com/seL4/ci-actions/blob/master/aws-proofs/action.yml>
* `master` at `f49402738d48a902c2426be7ee4a8c4d5ef3ca2d` (2026-08-09),
  read 2026-08-16.
* Licence: BSD-2-Clause on the workflow files (SPDX headers present).
  Nothing copied.

**Technique — the tiering is the whole design.**

| Tier | Trigger | Matrix | Cache | Excluded |
| --- | --- | --- | --- | --- |
| PR | `pull_request_target` | 5 arches | Isabelle images read from S3 (default `cache_read: true`) | `session: '-x AutoCorresSEL4'`, `skip_dups: true` |
| Weekly clean | `cron: '1 15 * * 6'` | ~35 arch × domain × platform configs | **`cache_read: ''`** — start from an empty cache | nothing |
| External | `cron: '1 15 1,15 * *'` | 5 arches | default | uses `manifest: default.xml` — released Isabelle, not the project's `devel`/`ts-*` |

Three separate hazards, three separate tiers:

* the PR tier answers *did this change break a proof*, fast;
* the weekly clean tier answers *is the green tick an artifact of the
  cache* — this is the anti-pattern guard, and it is a scheduled job
  precisely because it cannot be afforded per PR;
* the external tier answers *is the green tick an artifact of our
  patched toolchain*.

The proof work runs on AWS VMs, not the GitHub runner; the action's
inputs are the documentation of what is cached (`cache_read`,
`cache_write`, `cache_bucket` default `isabelle-images`, described as
"Read Isabelle image cache from S3").

**Measured wall clock** (GitHub Actions API, 2026-08-16):

* PR tier, run `31312545469` (2026-08-09, cache warm): ARM 15 min 06 s,
  RISCV64 13 min 37 s, X64 12 min 47 s, ARM_HYP 13 min 58 s,
  **AARCH64 67 min 50 s**; workflow total 67 min 53 s. Older PR runs in
  the same window ranged 68 min to 4 h 27 m.
* Weekly clean tier, cold cache: per-config jobs 3 h 11 m to 4 h 45 m;
  workflow totals for the six most recent successes 4 h 12 m, 4 h 05 m,
  4 h 06 m, 4 h 06 m, 4 h 12 m, 4 h 30 m.

**The number that matters:** the same proofs, same machines, differ by
roughly 4× to 15× between warm and cold Isabelle image cache. Caching is
not an optimisation here, it is what makes a proof gate a *pull-request*
gate at all.

Hardware floor, quoted from `l4v/README.md`:

> Almost all proofs in this repository should work within 4GB of RAM. Proofs involving the C refinement, will usually need the 64bit mode of polyml and about 16GB of RAM.

---

## 4. `cedar-policy/cedar-spec` — Lean proofs + differential testing per PR

* `.github/workflows/ci.yml`
  <https://github.com/cedar-policy/cedar-spec/blob/main/.github/workflows/ci.yml>
* `.github/workflows/build_and_test_drt_reusable.yml`
* `.github/workflows/corpus_generation_test_reusable.yml`
* `cedar-lean/lakefile.lean` — the `lake lint` driver
* `main` at `a3f2accb100fa49ac1347c1c436fa57eb32bd464` (2026-08-14),
  read 2026-08-16.
* Licence: Apache-2.0. Nothing copied.

**Technique.**

1. *The Lean job runs on a stock `ubuntu-latest` runner with no cache at
   all* — elan installed from the upstream shell script on every run.
   Steps: `lake -R -Kenv=dev update`, `lake build Cedar SymCC`,
   **`lake lint`**, `lake build ...:static` for the FFI libraries,
   `lake exe CedarUnitTests && lake exe CedarSymTests`, then docs.
2. *`lake lint` is a completeness check, not a `sorry` check.* The step is
   named "Lint for unchecked theorems"; the `@[lint_driver] script checkThm`
   in `cedar-lean/lakefile.lean` walks `Cedar/Thm.lean` and `SymCC.lean`
   and fails if any `.lean` file in the corresponding directory is not
   transitively imported. The hazard it closes is a proof file that exists
   in the tree, is believed to be checked, and is not in the build.
   Directly analogous to this estate's orphan rule in
   `verify/moves/run.sh`, approached from the import side rather than the
   theorem side.
3. *The PR-tier DRT job builds the fuzz targets and runs `cargo test`; it
   does not fuzz.* The long differential campaigns are not on the PR path.
4. *The corpus-generation job is a smoke test of the generator, with the
   budget written into the command*: `TIMEOUT=5 FUZZ_TARGET=abac
   ./create_corpus.sh`. Five seconds. It proves the generator runs, not
   that the corpus is adequate.

**Measured wall clock** (run `31823824816`, 2026-08-14, all successful):
whole `ci.yml` 24 min 17 s. Jobs: *Build and test Lean* 15 min 10 s,
*Build and test DRT* 15 min 51 s, *Test Corpus Generation (ABAC)*
17 min 48 s, *Run integration tests* 9 min 00 s, *Build and Test Cedar
Lean CLI* 12 min 22 s. Five other recent successful runs: 24 m, 27 m,
42 m, 48 m, 73 m.

---

## 5. `hacl-star/hacl-star` — generated C and proof hints committed, regenerated by a bot

* `.github/workflows/nix.yml` — `nix build -L .#hacl` on a self-hosted
  runner; also runs `.#hacl.passthru.resource-monitor` and prints
  `result/resources.txt`.
* `.github/workflows/hintsanddist.yml` — weekly (`cron: '0 0 * * 0'`)
  regeneration of `hints/` and `dist/`, committed by "Hacl Bot" and
  raised as a pull request.
* `.github/workflows/dist.yml` — builds the committed `dist/` C on
  macOS, Ubuntu, Windows, plus Apple Silicon and iOS cross builds.
* `main` at `504c2987452f87fe44bce9b9f12e19d6e051761f` (2026-04-10),
  read 2026-08-16.
* Licence: Apache-2.0 / MIT (dual, per repository `LICENSE`). Nothing
  copied.

**Technique.**

1. *The generated artifact lives in the repository* (`dist/`), and so do
   the SMT proof hints (`hints/`). The consumer of a verified codebase
   gets C without needing F\*.
2. *Regeneration is a scheduled bot PR, not a build gate.* The weekly job
   deletes `hints` and `dist/*/*`, rebuilds them from the Nix derivation,
   commits, and opens a PR. There is an explicit anti-noise guard —
   `[[ 1 -lt $(git diff --compact-summary HEAD~.. | grep -v INFO.txt | wc -l) ]]`
   — so a run whose only change is a metadata file does not raise a PR.
   Regeneration drift is therefore *surfaced for review*, not *refused at
   the gate*. This is the opposite of the byte-diff gate REF-6 wants, and
   the difference is worth stating out loud: HACL\* trades the strict
   invariant for the ability to accept a legitimate regeneration.
3. *Proof cost is measured and printed* (`resource-monitor`), not left to
   folklore.

**Measured wall clock:** the successful `nix.yml` runs observed (2026-04
to 2026-06) completed in 77–85 s; one failed run took 108 s. That is a
warm self-hosted Nix store: the number
measures *cache hit*, not proof effort, and must not be quoted as "HACL\*
verifies in 90 seconds". Recorded here as the cautionary datum it is.

---

## 6. `leanprover-community/mathlib4` — two meta-gates worth stealing

* `.github/workflows/validate_mathlib_ci_paths.yml`
* `.github/workflows/technical_debt_metrics.yml`, which runs
  `reporting/technical-debt-metrics.sh` from `leanprover-community/mathlib-ci`
  and posts the result to Zulip weekly.
* `main`, read 2026-08-16. Licence: Apache-2.0.

**Technique.**

1. *A gate on the gates.* `validate_mathlib_ci_paths.yml` triggers on
   `pull_request` with `paths: ['.github/workflows/**']` and scans every
   workflow file for `$CI_SCRIPTS_DIR/...` references, failing if any
   referenced script is missing from a fresh checkout of the shared CI
   repository or escapes its root. Its own header states the purpose:
   "Prevent CI breakages caused by stale or mistyped `CI_SCRIPTS_DIR`
   paths". It also forbids workflows from checking out the CI repository
   directly rather than through the local action. A stale path in a gate
   is a gate that stopped running; this makes that a build failure.
2. *Debt counters are advisory and scheduled, and they go to a human
   channel.* The technical-debt job is `cron: '0 4 * * 1'`, guarded by
   `if: github.repository == 'leanprover-community/mathlib4'` so forks do
   not spam, and its output is a Zulip message. Nobody's merge is blocked
   by it. This is the honest shape for a *trend* metric, and it is
   explicitly not the shape for a *status claim*.

---

## 7. Executable documentation — the two mature mechanisms

Neither is from a verification project; both are the field's working
answer to "the documentation must not silently drift from the code".

* **Rust doctests.** <https://doc.rust-lang.org/rustdoc/write-documentation/documentation-tests.html>
  (read 2026-08-16). Verbatim: "`rustdoc` supports executing your
  documentation examples as tests. This makes sure that examples within
  your documentation are up to date and working." Run by
  `cargo test --doc`. Technique: the *documentation* is the test input;
  there is no second copy of the example to fall out of sync.

* **OCaml MDX.** <https://github.com/realworldocaml/mdx> (ISC licence;
  README read 2026-08-16). Verbatim: "MDX allows to execute code blocks
  inside markdown and mli/mld documentation to help keeping them up to
  date." Technique: `dune runtest` executes the code blocks in a Markdown
  file, writes what the output *should* be to `.mdx/README.md.corrected`,
  and fails with a `git diff` between the two. `dune promote` accepts the
  new output. The promote step is the interesting part for us and also
  the dangerous part — see the report's anti-pattern section.
