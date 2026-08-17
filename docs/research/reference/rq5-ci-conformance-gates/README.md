# RQ-5 reference area — CI patterns for conformance as a build invariant

Supporting material for
[`docs/research/2026-08-16-rq5-ci-conformance-gates.md`](../../2026-08-16-rq5-ci-conformance-gates.md).

**Nothing in this directory is a foldlab gate.** The runnable items are
own-authored minimal reproductions written to answer RQ-5 and to be
re-runnable by a sceptic; they are evidence, not machinery. No
third-party code is vendored here.

All retrieval dates below are **2026-08-16**.

## Inventory

| Item | What it is | Where it came from | Licence | Retrieved |
| --- | --- | --- | --- | --- |
| `links-and-techniques.md` | Links to six real CI configurations plus distilled technique summaries and measured wall-clock numbers. Quotations only; no third-party file is copied. | `aws/s2n-tls`, `seL4/l4v`, `seL4/ci-actions`, `cedar-policy/cedar-spec`, `hacl-star/hacl-star`, `leanprover-community/mathlib4`, `realworldocaml/mdx`, `doc.rust-lang.org` — each URL and repository state recorded in the file | Own-authored summary. Sources are Apache-2.0 / MIT-0 / BSD-2-Clause / ISC as recorded per entry; quoted fragments only. | 2026-08-16 |
| `lean-sorry-gate/` | Own-authored Lean 4 package (5 small files) demonstrating what a "the proofs build" gate does and does not catch: `sorry` as a warning, `sorryAx` inherited one hop away, `native_decide` minting a per-declaration axiom. | Written for this report. Depends only on Lean 4.33.0 core — no external Lean package, no `lake-manifest.json` committed. | Own-authored, same licence as this repository | executed here 2026-08-16 |
| `lean-sorry-gate/TRANSCRIPT.md` | The recorded run on this machine (Lean 4.33.0, elan 4.2.3, Windows 11) with the four findings it establishes. | Executed here | Own-authored | 2026-08-16 |
| `exit-code-masking/` | Own-authored `masking.sh` + `masking.ps1` and their transcript: how a gate's nonzero exit is lost between the gate and the CI step, in bash and in PowerShell 7.6.5. | Written for this report | Own-authored | executed here 2026-08-16 |
| `status-as-gate/` | Own-authored minimal reproduction of D-e obligation 5: `STATUS.md` with machine-readable claim markers, `check-status.sh` that re-derives every claim from `kernel/` at HEAD, a `--self-test` refutation, and an anti-vacuity check that fails a status file whose markers were deleted. Transcript includes the green run, the drifted run, and both red paths. | Written for this report | Own-authored | executed here 2026-08-16 |
| `skipped-required-check/NOTES.md` | The verbatim GitHub documentation on skipped-but-required checks, and why the "a job skipped by a conditional reports Success" row is the sharpest hazard for D-e. | `github/docs`, `content/pull-requests/how-tos/merge-and-close-pull-requests/troubleshooting-required-status-checks.md`, read via the GitHub contents API | Documentation content is CC-BY-4.0 per `github/docs` `LICENSE`; short quotations only, attributed in the file | 2026-08-16 |
| `skipped-required-check/example-workflow.yml.sample` | Own-authored illustration of which jobs may carry an `if:` and which may not. Extension is `.yml.sample` and the header is deliberately not valid YAML, so a stray copy into `.github/workflows/` fails to parse rather than running. | Written for this report | Own-authored | 2026-08-16 |

## Running the reproductions

```sh
bash lean-sorry-gate/run.sh          # needs elan/lake with Lean 4.33.0
bash exit-code-masking/masking.sh
pwsh  exit-code-masking/masking.ps1
bash status-as-gate/check-status.sh
bash status-as-gate/check-status.sh --self-test
```

`lean-sorry-gate/run.sh` writes a `.lake/` build directory beside itself;
it was removed after the recorded run so the committed tree is source
only. None of these scripts is wired into any workflow.

## What is deliberately absent

* No copy of any third-party CI configuration. The reference-area rule
  prefers links plus distilled summaries for exactly this material, and
  a copied workflow would start drifting from its upstream the day it
  landed.
* No `docs/research/reference/README.md` at the parent level. Eight other
  research seats are writing sibling directories in the same session;
  the root index is left to whoever consolidates them, so that this run
  cannot clobber another's file.
