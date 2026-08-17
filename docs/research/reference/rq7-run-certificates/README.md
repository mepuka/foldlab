# RQ-7 reference area — certificates: what a per-run proof buys

Supporting material for
[`docs/research/2026-08-16-rq7-run-certificates.md`](../../2026-08-16-rq7-run-certificates.md).

**Nothing in this directory is a foldlab gate.** The runnable items are
own-authored minimal reproductions written to answer RQ-7 and to be
re-runnable by a sceptic; they are evidence, not machinery. No
third-party code is vendored here.

All retrieval dates below are **2026-08-16**.

## Inventory

| Item | What it is | Where it came from | Licence | Retrieved |
| --- | --- | --- | --- | --- |
| `links-and-quotations.md` | Every source consulted, with the single load-bearing sentence from each, its URL, and its licence where the licence is stated. Includes section E: the searches issued and what they did **not** find. Quotations only; no third-party file is copied. | `satcompetition.github.io`, `cs.utexas.edu/~marijn`, `drops.dagstuhl.de`, `cse.chalmers.se/~myreen`, `people.eecs.berkeley.edu/~necula`, `isafor-ceta.uibk.ac.at`, `inesc-id.pt`, `github.com/tanyongkiam/cake_lpr`, and the local Lean 4.33.0 toolchain — each URL or path recorded in the file | Own-authored summary. Source licences recorded per entry: Lean 4 Apache-2.0; LIPIcs SAT 2023 CC-BY-4.0; cake_lpr under the CakeML BSD-style licence quoted from its `LICENSE`; CeTA licence **not stated on its page and therefore not asserted**. Short attributed quotations only. | 2026-08-16 |
| `lean-lrat-certificate/` | Own-authored Lean 4 sources (5 files) plus `run.sh`: inspect the Lean-core verified LRAT checker's soundness theorem, emit a real certificate with `bv_decide?`, re-check it with `bv_check`, and run three tampering controls. Uses only Lean 4.33.0 core — no external package, no `lakefile`, no network. | Written for this report. The checker, the solver (CaDiCaL) and the `bv_check` tactic are Lean toolchain components, invoked, not copied. | Own-authored, same licence as this repository | executed here 2026-08-16 |
| `lean-lrat-certificate/TRANSCRIPT.md` | The recorded run on this machine, the axiom footprints, the measured certificate sizes (130 KB / 5.8 MB / 734 MB), and the separately-run 12-bit measurement whose *check* exceeded Lean's default `maxHeartbeats`. | Executed here | Own-authored | 2026-08-16 |
| `certificate-shape/` | Own-authored `kernel.mjs` (a toy D-d-shaped stateless, total, self-identifying kernel), `emit.mjs`, `check.mjs`, `run.sh`: a session certificate whose eight obligations a third party re-derives from the kernel artifact and the journal alone, with six controls — one honest, four tamperings, one restore. | Written for this report. Runs on `bun 1.3.14` (or node); no packages. | Own-authored, same licence as this repository | executed here 2026-08-16 |
| `certificate-shape/TRANSCRIPT.md` | The recorded run, the obligation table, and the record of a first-attempt negative control that silently could not fail (`sed` against escaped JSON) and how `run.sh` now forbids that. | Executed here | Own-authored | 2026-08-16 |

## Running the reproductions

```sh
bash lean-lrat-certificate/run.sh   # needs elan/lake with Lean 4.33.0; ~25 s
bash certificate-shape/run.sh       # needs bun (or node); ~2 s
```

Both scripts generate files beside themselves and **delete them at the
end**, so the committed tree is source only. `lean-lrat-certificate`
writes a multi-megabyte `.lrat` during the run. Neither script is wired
into any workflow, and neither is referenced by any foldlab gate.

## What is deliberately absent

* **No vendored third-party code.** `cake_lpr` is linked, not copied; its
  licence is a permissive CakeML BSD-style licence but GitHub's detector
  reports `NOASSERTION`, and the reference-area rule prefers links plus
  own-authored reproductions regardless. CeTA states no licence on its
  page, so nothing from it is copied and no licence is claimed for it.
* **No copied paper text beyond short attributed quotations.** The
  papers are behind their publishers' terms; `links-and-quotations.md`
  quotes at most the one sentence that carries each claim.
* **No `docs/research/reference/README.md` at the parent level.** Sibling
  research seats are writing adjacent directories in this same session;
  the root index is left to whoever consolidates them, so that this run
  cannot clobber another's file.
* **No signature, key, or transparency-log machinery** in
  `certificate-shape/`. The certificate there is evidence that a verdict
  follows from a journal and a kernel — not evidence about who produced
  it. Authenticity is named as a gap in the report, not simulated here.
