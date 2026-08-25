# Tool register

A tool whose output flows into a gated artifact is admitted here first, with
its role and trust statement (modeled on the Rust std-lib verification
project's approved-tools rule). Start light; grow as work gets defined.
("Register", not "ledger" — the artifact-kind ledger is
[KINDS.md](KINDS.md).)

| Tool | Role | Trust statement |
| --- | --- | --- |
| mise | Toolchain and task runner | Trusted for reproducing the declared environment; contributes nothing to claims. |
| bun | Dev runtime, package manager, test runner | Test results are sampled evidence only (G4 at best); never a proof. |
| node (pinned) | Claim-target JavaScript engine (L0) | Named host for any future hosted-execution claim (G6). |
| elan / Lake / Lean 4 | Proof toolchain and referee | The kernel is the trust anchor for G1 claims; axiom reports required. |
| LLM harnesses | Proof search, drafting, review | Empty trust contribution: every output must pass a machine-checked gate; the gate carries the trust. |
| opam (annex-pinned) | Package manager for the [Coq/OCaml annex](../../annex/coq/README.md) | Trusted for reproducing the annex's declared switch from its committed export; contributes nothing to claims. |
| Rocq / Coq (annex) | Reading and running executable prior art | Evidence and technique only. A Rocq development is never an estate artifact, no gate G0–G6 may be stamped on one, and a technique read there enters the estate only by being restated and reproved in Lean. |

Pending admission (not yet used in gated work): lean4-tree-sitter (C FFI —
named trusted seam required), liteparse (`npm:@llamaindex/liteparse`;
PDF/local text extraction — evidence preparation only, and the extractor
behind the [paper corpus](../../.reference/catalog/PAPERS.md)).
