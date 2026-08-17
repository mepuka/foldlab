# RQ-8 reference area — proof maintenance for a living model

Companion material for `docs/research/2026-08-16-rq8-proof-maintenance.md`.

Everything here is either **own-authored** (written for this report, no
third-party code) or a **link plus a distilled note**. No third-party code
is vendored. Retrieval date for every external item below: **2026-08-16**.

---

## Own-authored reproductions (committed, runnable)

### 1. `lean-rebuild-propagation/`

**What it is.** A five-file Lean project that answers one question
mechanically: under Lean 4.33.0, does editing *only the proof body* of an
upstream theorem force a rebuild of a downstream module that consumes only
that theorem's *statement*?

**Provenance.** Written for this report, foldlab, 2026-08-16. No
third-party sources. Licensed with the repository.

**How to run.** `bash run.sh` from inside the directory. It copies the
sources into a temporary directory, so nothing here is mutated. Requires
`lake` on PATH (elan).

**Result on this machine.** Downstream module rebuilt, downstream `.olean`
digest changed. Full transcript, including the `module`-system variants,
in `lean-rebuild-propagation/TRANSCRIPT.md`.

### 2. `proof-edit-artifact-stability/`

**What it is.** A script that applies a proof-body-only patch inside a
scratch copy of `verify/moves` and reports (a) which modules Lake rebuilds,
(b) whether the generated C changes, (c) whether the emitted conformance
corpus changes.

**Provenance.** Written for this report, foldlab, 2026-08-16. It reads
`verify/moves` from this repository and copies it to a temporary directory;
the repository working tree is never modified. Licensed with the
repository.

**How to run.** `bash run.sh` from inside the directory. Requires `lake`
and `python` on PATH.

**Result on this machine.** Every downstream module rebuilt (about 10 s),
but every generated `.c` file and the emitted corpus were **byte-identical**
across the edit. Transcript and the companion timing/composition tables in
`proof-edit-artifact-stability/TRANSCRIPT.md`.

---

## External sources — links and licences (nothing vendored)

### Published papers

| Item | What it is | Where | Licence / rights | Retrieved |
| --- | --- | --- | --- | --- |
| Ringer, Palmskog, Sergey, Gligoric, Tatlock, **"QED at Large: A Survey of Engineering of Formally Verified Software"**, *Foundations and Trends in Programming Languages* 5(2–3):102–281, 2019 | The field's survey of proof engineering; §6.2 design principles, §7.2 proof evolution, §7.3 cost estimation are the sections this report uses | preprint PDF <https://arxiv.org/pdf/2003.06458>, abstract <https://arxiv.org/abs/2003.06458>, version of record <http://dx.doi.org/10.1561/2500000045> | arXiv.org perpetual, non-exclusive licence (as stated on the abstract page). Quoted under fair use; not redistributed here | 2026-08-16 |
| Klein, Andronick, Elphinstone, Murray, Sewell, Kolanski, Heiser, **"Comprehensive Formal Verification of an OS Microkernel"**, *ACM TOCS* 32(1), Article 2, Feb 2014 | §7.4 "The Cost of Change" is the field's best published proof-maintenance data | <https://trustworthy.systems/publications/nicta_full_text/7371.pdf> | © ACM. Author-hosted copy. Quoted under fair use; not redistributed here | 2026-08-16 |
| Matichuk, Murray, Andronick, Jeffery, Klein, Staples, **"Empirical Study Towards a Leading Indicator for Cost of Formal Software Verification"**, ICSE 2015 | Quadratic relationship between statement size and proof size across 15,018 lemmas / ~215,000 lines of Isabelle proof | <https://www.trustworthy.systems/publications/nicta_full_text/8318.pdf>; DOI record <https://ieeexplore.ieee.org/document/7194620/> | © IEEE. Author-hosted copy. Quoted under fair use; not redistributed here | 2026-08-16 |
| Woos, Wilcox, Anton, Tatlock, Ernst, Anderson, **"Planning for Change in a Formal Verification of the Raft Consensus Protocol"**, CPP 2016 | The five design-for-change recommendations; the statement/proof interface split and its measured build-time effect | <https://homes.cs.washington.edu/~mernst/pubs/raft-proof-cpp2016.pdf>; conference record <https://conf.researchr.org/details/CPP-2016/CPP-2016-main/11/Planning-for-Change-in-a-Formal-Verification-of-the-Raft-Consensus-Protocol> | © ACM. Author-hosted copy. Quoted under fair use; not redistributed here | 2026-08-16 |
| Elphinstone, Heiser, **"From L3 to seL4: What Have We Learnt in 20 Years of L4 Microkernels?"**, SOSP 2013, pp. 133–150 | Source of the "powerful disincentive to changing the kernel" statement | <https://sigops.org/s/conferences/sosp/2013/papers/p133-elphinstone.pdf>; DOI <https://doi.org/10.1145/2517349.2522720> | © ACM. SIGOPS-hosted copy. Quoted under fair use; not redistributed here | 2026-08-16 |
| Disselkoen et al., **"How We Built Cedar: A Verification-Guided Approach"**, FSE Companion 2024 | Lean model + Rust production code + DRT; proof-to-model ratio, proof-check wall clock, and the explicit rejection of the Lean→C deployment route | <https://arxiv.org/pdf/2407.01688>, abstract <https://arxiv.org/abs/2407.01688>; DOI <https://doi.org/10.1145/3663529.3663854> | **CC BY 4.0** (per the arXiv abstract page) — redistributable with attribution; still linked rather than vendored | 2026-08-16 |

### Repositories (read-only inspection via `gh` / raw.githubusercontent.com)

| Item | What it is | Where | Licence | Retrieved |
| --- | --- | --- | --- | --- |
| `cedar-policy/cedar-spec` | AWS's Lean formalization of Cedar plus the DRT harness. Inspected: `cedar-lean/lakefile.lean` (the `@[lint_driver] script checkThm`), `cedar-lean/lean-toolchain` (`leanprover/lean4:v4.33.0`), `cedar-lean/GUIDE.md` (style + "Proof stability" rules), `cedar-lean/Cedar/{Spec,Thm,Validation,SymCC}` layout, `.github/workflows/ci.yml`, `.github/workflows/build_and_test_drt_reusable.yml` | <https://github.com/cedar-policy/cedar-spec> | Apache-2.0 (GitHub API `license.spdx_id`) | 2026-08-16 (default branch `main`, last push 2026-08-14T18:24:39Z) |
| `hacl-star/hacl-star` | HACL\*/EverCrypt: F\* sources, generated C committed under `dist/`, SMT hints committed under `hints/`. Inspected: `.github/workflows/dist.yml`, `.github/workflows/hintsanddist.yml`, `.github/workflows/nix.yml`, `.ci/script.sh` | <https://github.com/hacl-star/hacl-star> | Apache-2.0 (GitHub API `license.spdx_id`) | 2026-08-16 (default branch `main`, last push 2026-06-07T03:50:52Z) |
| `seL4/l4v` | seL4's Isabelle specifications and proofs. Inspected: `.github/workflows/{pr,proof}.yml` | <https://github.com/seL4/l4v> | GitHub API reports `NOASSERTION`. `LICENSE.md` states a REUSE/SPDX per-file scheme — "proofs about the seL4 kernel code itself are licensed under GPL version 2, and general libraries and tools under the 2-Clause BSD license" — with full texts in `LICENSES/`. **Mixed and per-file; do not reuse any file without reading its SPDX tag.** Nothing from it is copied here | 2026-08-16 (default branch `master`, last push 2026-08-09T13:19:59Z) |
| `uwplse/PUMPKIN-PATCH`, `uwplse/pumpkin-pi` | Coq proof-repair plugins (Ringer et al.). Recorded only to establish that the proof-repair tooling line is Coq-only | <https://github.com/uwplse/PUMPKIN-PATCH>, <https://github.com/uwplse/pumpkin-pi> | MIT (GitHub API `license.spdx_id`, both) | 2026-08-16 |

### Distilled technique notes (rather than copied CI configuration)

- **HACL\*: generated artifacts committed, regenerated on a schedule, not
  as a per-commit gate.** `dist.yml` runs on every push and pull request to
  `main`; it invokes `.ci/script.sh`, which `configure`s and `make`s the
  **committed** `dist/gcc-compatible` tree and runs its tests. It does not
  re-derive `dist/` from the F\* sources. Regeneration lives in
  `hintsanddist.yml`, a `schedule: cron '0 0 * * 0'` (weekly) job on a
  self-hosted runner that `nix build`s the artifacts, `git rm`s the old
  `hints` and `dist/*/*`, unpacks the new ones, and opens a bot pull
  request. A separate step asserts the diff is non-trivial before the PR is
  raised.
- **Cedar: a per-PR chain across two repositories, plus a daily heavy
  tier.** `ci.yml` (trigger: `pull_request`) runs, in order, `lake build
  Cedar SymCC` → `lake lint` (the `checkThm` driver, which fails if
  `Cedar/Thm.lean` does not recursively import every file under
  `Cedar/Thm/`) → `lake build Cedar:static … CedarFFI:static` → unit and
  symbolic tests → DRT → corpus-generation test → FFI, CLI, integration and
  benchmarking jobs. The DRT job checks out `cedar-policy/cedar` at the
  *matching branch* of the pull request, so model and implementation are
  pinned to each other. The expensive tier is separate: per the FSE 2024
  paper, fuzz targets run daily on Amazon ECS with 4 vCPU / 8 GB for six
  hours each, and a minimized corpus saved per Cedar version is what runs
  in CI.
- **seL4/l4v: proofs are a per-PR gate, with the largest session
  excluded.** `proof.yml` triggers on `pull_request_target`, runs a matrix
  over five architectures (`ARM`, `ARM_HYP`, `AARCH64`, `RISCV64`, `X64`)
  through the `seL4/ci-actions/aws-proofs` action on AWS hardware with a
  cache bucket, `skip_dups: true`, and `session: '-x AutoCorresSEL4'` —
  i.e. the largest proof session is deliberately excluded from the PR gate.

---

## Not found

Searched on 2026-08-16 for a Lean 4 analogue of the Coq proof-repair line
(PUMPKIN PATCH / PUMPKIN Pi), by the terms *"Lean 4 proof repair tool"*,
*"automated proof maintenance Lean 4"*, *"mathlib port breakage tooling"*,
and *"PUMPKIN PATCH Lean port"*. Nothing was found beyond LLM-assistant
marketing pages, which are not primary sources. **No established Lean 4
proof-repair tool was found**, and the PUMPKIN line's own repositories are
Coq plugins.
