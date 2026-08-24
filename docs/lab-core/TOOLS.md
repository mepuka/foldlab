# Approved-tools ledger

A tool whose output flows into a gated artifact is admitted here first, with
its verification kind and trust statement (modeled on the Rust std-lib
verification project's approved-tools rule). Start light; grow as work gets
defined.

| Tool | Role | Trust statement |
| --- | --- | --- |
| mise | Toolchain and task runner | Trusted for reproducing the declared environment; contributes nothing to claims. |
| bun | Dev runtime, package manager, test runner | Test results are sampled evidence only (G4 at best); never a proof. |
| node (pinned) | Claim-target JavaScript engine (L0) | Named host for any future hosted-execution claim (G6). |
| elan / Lake / Lean 4 | Proof toolchain and referee | The kernel is the trust anchor for G1 claims; axiom reports required. |
| LLM harnesses | Proof search, drafting, review | Empty trust contribution: every output must pass a machine-checked gate; the gate carries the trust. |

Pending admission (not yet used in gated work): lean4-tree-sitter (C FFI —
named trusted seam required), liteparse (PDF/local extraction — evidence
preparation only).
