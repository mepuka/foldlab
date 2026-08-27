# Tool register

A tool whose output flows into a gated artifact is admitted here first, with
its role and trust statement (modeled on the Rust std-lib verification
project's approved-tools rule). Start light; grow as work gets defined.
("Register", not "ledger" — the artifact-kind ledger is
[KINDS.md](KINDS.md).)

| Tool | Role | Trust statement |
| --- | --- | --- |
| Git client (version recorded per resolution receipt) | Resolve external repository selectors to full commit, tree, and blob identities and materialize exact blob bytes for Source Provenance | Resolution observation only. Full object identities, byte length, and an independent SHA-256 content digest must agree in the receipt; Git contributes no semantic or authorship claim. |
| PowerShell/.NET HTTP and SHA-256 surfaces (versions recorded per resolution receipt) | Fetch a versioned standards artifact as bytes and compute its external integrity digest | Transport and digest observation only. The receipt records the exact URL, response metadata, byte length, and digest; neither HTTPS nor SHA-256 establishes authorship, endorsement, or semantic correctness. |
| mise | Toolchain and task runner | Trusted for reproducing the declared environment; contributes nothing to claims. |
| bun | Dev runtime, package manager, test runner | Test results are sampled evidence only (G4 at best); never a proof. |
| node (pinned) | Claim-target JavaScript engine (L0) | Named host for any future hosted-execution claim (G6). |
| elan / Lake / Lean 4 | Proof toolchain and referee | The kernel is the trust anchor for G1 claims; axiom reports required. |
| `leanchecker` (toolchain-pinned) | Fresh-environment replay of compiled Lean modules | Uses the same Lean kernel, so it detects environment manipulation but contributes no independent kernel assumption. |
| Lean4Lean (revision-pinned per run) | Separate replay of promoted Lean declarations | A separately implemented checker with shared ancestry noted by its authors; corroborating assurance only, never a replacement for the pinned Lean kernel. |
| `lean-action` v1 | Cross-host Lean setup for the canonical CI task | Build and cache orchestration only; contributes nothing to theorem claims. |
| LLM harnesses | Proof search, drafting, review | Empty trust contribution: every output must pass a machine-checked gate; the gate carries the trust. |
| Effects conformance-lane harness (LLM) | Authors the effects Lean model, schema-bundle instances (statement, sentence, anti-vacuity kit), declared mutants, and the manifest generator — under ratified statement schemas only ([CONFORMANCE-WORKFLOW](../../library/effects/CONFORMANCE-WORKFLOW.md)) | Empty trust contribution: the kernel carries proofs, ratified schemas carry statement shape, the gate carries generation determinism and kit presence. Never edits the TypeScript tree or a manifest by hand. |
| Effects implementation-lane harness (LLM) | Authors the effects TypeScript implementation and mirrored TS mutants until the gate is green against the last ratified manifest ([CONFORMANCE-WORKFLOW](../../library/effects/CONFORMANCE-WORKFLOW.md)) | Empty trust contribution: manifest agreement and the gate carry the evidence. Consumes ratified manifests only; never edits the Lean tree. |
| opam (annex-pinned) | Package manager for the [Coq/OCaml annex](../../annex/coq/README.md) | Trusted for reproducing the annex's declared switch from its committed export; contributes nothing to claims. |
| Rocq / Coq (annex) | Reading and running executable prior art | Evidence and technique only. A Rocq development is never an estate artifact, no gate G0–G6 may be stamped on one, and a technique read there enters the estate only by being restated and reproved in Lean. |
| TypeScript compiler API (`typescript@5.9.2` exactly, npm; classic JS API, not the 7.x native port) | Interim Stage 1 extractor instrument: syntax-only parse (`createSourceFile`, no checker) of the pinned Effect sources ([experiments/entity-store-extract](../../experiments/entity-store-extract/)) | Trusted only that its parser maps the pinned bytes to a faithful syntax tree; no type resolution is used, so no inference is trusted. Output enters gated work solely as `inventory.json`, which must pass the four-way enumeration agreement and the pinned-byte pre-check. Version drift is a re-admission event. |
| Lean `Std` IO surface (toolchain-internal: `Std.Http`, `Std.Async`, `Std.Sync`, `Std.Do`; extern/libuv-backed) | Shell-layer runtime for the executable store ([STORE-SHELL](../entity-store/STORE-SHELL.md), ruling SH8) | Same pin and trust unit as the already-admitted Lean toolchain — no separate instrument. The kernel-checked story covers the pure core only; shell namespaces sit deliberately OUTSIDE the E2 opaque/unsafe gate, and no G-grade claim attaches to `Std`'s IO behavior. `Std.Do` triples are ordinary kernel-checked theorems about shell code and carry trust like any other. |

Pending admission (not yet used in gated work): lean4-tree-sitter
(`predictable-machines/lean4-tree-sitter`, to be revision-pinned; C seam: the
tree-sitter runtime plus the `tree-sitter-typescript` grammar shared library, each
version-and-digest-pinned per host — admitted for the same Stage 1 walk when stood up;
running it beside the TypeScript compiler API and asserting byte-identical inventories
makes the two extractors each other's check), liteparse (`npm:@llamaindex/liteparse`;
PDF/local text extraction — evidence preparation only, and the extractor
behind the [paper corpus](../../.reference/catalog/PAPERS.md)).
