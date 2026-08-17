# RQ-4 reference area — verifying the implementations we already have

Serves `docs/research/2026-08-16-rq4-verify-existing-implementations.md`.

All retrieval dates are **2026-08-16**. No third-party source code is
vendored here. Everything below is either (a) a link plus a distilled
technique summary, or (b) own-authored material written for this report.
The one third-party artefact quoted at length — the s2n CI wiring — is
captured as a link plus a distilled chain, per the dispatch discipline.

---

## Own-authored items (this repository's license applies)

### `subset-census.mjs` + `subset-census.txt`

- **What it is.** A short script that counts, in the five files the
  DEV-674/675 concentration left holding the seam's decisions, the
  source constructs that the candidate verifiers' own documentation
  places outside or weakly inside their input subsets. Each row cites
  the primary source key listed under "Sources" below.
- **Provenance.** Written for this report; no third-party code.
- **License.** This repository's (`LICENSE` at the root).
- **How to run.** From the repository root:
  `bun docs/research/reference/rq4-verify-existing-implementations/subset-census.mjs`
- **Executed.** 2026-08-16 on Windows 11, Bun 1.3.14, Go 1.26.5,
  Lake 5.0.0-src+d8b1897 (Lean 4.33.0). Transcript in
  `subset-census.txt`, which also records that **Gobra could not be run
  on this machine** (no JVM configured under mise; SAW not installed).
- **Honest limits.** It is a census, not a verifier. A zero does not
  mean a tool would accept the file; a nonzero means the tool's own
  documentation says the construct is outside or weakly inside its
  subset. Regex counts are a *lower* bound.

### `measured-ci-durations.txt`

- **What it is.** A transcript of read-only GitHub REST API calls
  measuring wall-clock duration of three real proof-bearing CI
  workflows (s2n-tls CBMC, VerifiedSCION Gobra, Perennial Rocq).
- **Provenance.** Commands run by this agent, 2026-08-16. Output is
  GitHub API data, quoted as retrieved.
- **License.** The commands and framing are this repository's; the
  embedded timestamps are factual API output.
- **Caveat recorded in the file.** Durations are
  `updated_at - run_started_at` and therefore include runner
  provisioning, not only the proof step.

---

## Links plus distilled technique (nothing copied)

### 1. AWS s2n-tls — SAW/Cryptol proofs of the TLS handshake, in CI

- **Repository.** <https://github.com/aws/s2n-tls>, Apache-2.0.
  Pinned commit `72f5db1fb96635a655ec90569ade0d500ea0555c`
  (`main`, committed 2026-08-13), retrieved 2026-08-16.
- **The SAW gate, as an actual chain** (each link read from the repo at
  that commit, not recalled):
  1. `.github/workflows/codebuild.yml` — triggers on `push` to `main`,
     `pull_request_target` to `main`, and `merge_group`; runs
     `./codebuild/bin/start_codebuild.sh`.
  2. `codebuild/bin/start_codebuild.sh` — its `BUILDS` array includes
     `s2nGeneralBatch`.
  3. `codebuild/spec/buildspec_generalbatch.yml` — 31 batch entries;
     exactly one is the SAW job, `identifier: s2nSawTls`, with
     `SAW: true` and `TESTS: tls`.
  4. `codebuild/spec/buildspec_ubuntu.yml` — runs
     `./codebuild/bin/s2n_codebuild.sh`.
  5. `codebuild/bin/s2n_codebuild.sh` line 112 —
     `if [[ "$TESTS" == "ALL" || "$TESTS" == "tls" ]]; then make -C tests/saw tmp/verify_handshake.log ; fi`
  6. `tests/saw/verify_handshake.saw` — `prove_handshake_io_lowlevel;`
     `prove_state_machine;` `prove_cork_uncork;`
- **What is proved.** `tests/saw/spec/handshake/handshake.saw`: three
  C functions verified against a low-level Cryptol spec
  (`s2n_connection_get_client_auth_type`, `s2n_advance_message`,
  `s2n_conn_set_handshake_type` — the last twice, once per `chosen_psk`
  case); then `tls12rfcSimulatesS2N` and `tls13rfcSimulatesS2N`, each
  instantiated at `` `{16} ``.
- **What is assumed.** Eight functions are supplied via
  `crucible_llvm_unsafe_assume_spec` (socket cork/uncork/quickack,
  managed-cork query, session-id generation, cache permission, resume
  decrypt). These are the proof's internal trusted base.
- **Bound, stated.** In `tests/saw/spec/handshake/rfc_handshake_tls12.cry`,
  `traceRFC`/`traceS2N` are `take`-prefixes of length `n`; the CI
  instance is `` `{16} ``. The correspondence is a *bounded trace
  equality*, universally quantified over connections and parameters but
  over the first 16 messages only.
- **Negative controls.** `tests/saw/Makefile` target `failure-tests`
  patches the C with five planted defects
  (`tls_early_ccs`, `tls_missing_full_handshake`, `sha_bad_magic_mod`,
  `cork_one`, `cork_two`) and asserts SAW **fails**, grepping for
  `error: in _SAW_verify_prestate` / `error: in llvm_ghost_value`.
  **Not in the per-commit batch**: `failure-tests` is reached only by
  the `sawHMACPlus` / `sawHMACFailure` values of `TESTS`, and neither
  appears in `buildspec_generalbatch.yml`.
- **Separate and unrelated to SAW:** `.github/workflows/proof_ci.yaml`
  is the **CBMC** starter-kit workflow (bounded model checking for
  memory safety), configured by
  `.github/workflows/proof_ci_resources/config.yaml`
  (`cbmc-version: "6.9.0"`, `z3-version: "4.13.0"`,
  `bitwuzla-version: "0.5.0"`, `kissat-tag: "rel-4.0.3"`,
  `proofs-dir: tests/cbmc/proofs`,
  `run-cbmc-proofs-command: ./run-cbmc-proofs.py`), `timeout-minutes: 60`,
  `runs-on: cbmc_ubuntu-latest_64-core`. Anyone reading "proof_ci" as
  the SAW gate is reading the wrong file.

### 2. Chudnov et al., "Continuous Formal Verification of Amazon s2n", CAV 2018

- **Source.** <https://d1.awsstatic.com/whitepapers/Security/Continuous_Formal_Verification_Of_Amazon_s2n.pdf>
  (open-access, Springer LNCS 10982 pp. 430–446, DOI
  10.1007/978-3-319-96142-2_26). Retrieved 2026-08-16; text extracted
  locally with `pypdf` 6.15.0 for quotation. Not vendored.
- **License.** Open access, `© The Author(s) 2018`. Quoted, not copied.
- **Why it is here.** It is the field's own statement of the
  extraction-versus-verify-existing choice, and the only published
  maintenance data for a proof-in-CI of this shape.

### 3. Pereira et al., "Protocols to Code: Formal Verification of a Next-Generation Internet Router" (VerifiedSCION)

- **Source.** <https://arxiv.org/abs/2405.06074> (v1, 9 May 2024); PDF
  <https://arxiv.org/pdf/2405.06074v1>. Retrieved 2026-08-16, text
  extracted locally with `pypdf` for quotation. Not vendored.
- **License.** arXiv author-posted; quoted, not copied.
- **Companion repository.** <https://github.com/viperproject/VerifiedSCION>,
  Apache-2.0, pushed 2026-08-16. Its
  `.github/workflows/gobra.yml` is the live Gobra-in-CI configuration:
  `on: push (master)` + `pull_request`, three jobs
  (`verify-third-party-libs`, `verify-deps`, `verify-router`), 20
  `viperproject/gobra-action@main` steps, per-step timeouts of
  5m ×12, 7m, 10m ×4, 25m, 30m, and **6h for `router/`**.

### 4. Gobra

- **Repository.** <https://github.com/viperproject/gobra>, MPL-2.0 per
  the README badge (GitHub reports `NOASSERTION`), pushed 2026-08-15,
  `master` HEAD `782b530fd700a1527ec36f61fa321d093c0c15f4`
  (2026-08-13). Retrieved 2026-08-16.
- **Docs quoted.** `docs/tutorial.md` at that commit, lines 38 and 448.
- **Open issues quoted.** `select` — issue #902, open, created
  2025-03-31; generics — #671, open, created 2023-08-24.
- **Prior in-house survey.** `docs/research/2026-08-15-gobra-survey.md`
  and `docs/research/2026-08-15-go-assurance-ladder.md` already hold
  the effort figures; this report re-verified the load-bearing ones
  against the primary sources rather than re-citing the survey.

### 5. Goose / Perennial

- **Goose.** <https://github.com/goose-lang/goose>, MIT.
  **Archived**; last push 2026-04-07, last `master` commit
  `7434b9c11026be910d001abb1e1fa6bd432003a8` (2025-05-09). README
  banner: development moved to `mit-pdos/perennial`. Docs quoted:
  `docs/writing-goose.md`, `docs/implementation.md`,
  `docs/testing-proposal.md` at that commit.
- **Perennial.** <https://github.com/mit-pdos/perennial>, MIT, active
  (pushed 2026-08-10, `master` HEAD
  `aa4b4b61f9f564173b01a606360a7583910cd78f`). README records a
  backwards-incompatible "new Goose" migration in progress under `new/`.
- **Target language.** Rocq (Coq), not Lean. No Lean port found.

### 6. Gillian / Gillian-JS

- **Repository.** <https://github.com/GillianPlatform/Gillian>,
  BSD-3-Clause, pushed 2026-07-10, `master` HEAD
  `b195dfc39a99d98f4d3c292537b6c572473653c3` (2026-07-03).
  README verbatim: `Gillian-JS  # Instantiation of Gillian for ES5 JavaScript.`
  Most recent commit touching `Gillian-JS/`: `b195dfc3`, 2026-07-03.
- **Paper.** Maksimović et al., "Gillian, Part II: Real-World
  Verification for JavaScript and C", CAV 2021.
  <https://giltho.github.io/publications/GillianCAV2021.pdf> (author
  copy), retrieved 2026-08-16, text extracted locally with `pypdf`.
  Springer record: <https://doi.org/10.1007/978-3-030-81688-9_38>.
- **Predecessor.** <https://github.com/javert2/JaVerT2.0>,
  BSD-3-Clause, last push 2020-04-22; README begins
  `# Deprected - Please use Gillian-JS instead`.

### 7. TypeScript's own position on soundness and specification

- **Design goals.** <https://github.com/microsoft/TypeScript-wiki>,
  file `TypeScript-Design-Goals.md`, retrieved 2026-08-16. Non-goal 3
  quoted in the report.
- **Language specification.** Commit
  `30cb2043` (2020-09-04, "Mark spec files as archived (#40373)")
  renamed `doc/spec.md` to `doc/spec-ARCHIVED.md` and the Word/PDF
  specifications to `… - ARCHIVED`. At `main` today,
  `GET /repos/microsoft/TypeScript/contents/doc` returns **404** — the
  directory is gone.

### 8. Cedar (the closest peer project, for contrast)

- **Repository.** <https://github.com/cedar-policy/cedar-spec>,
  Apache-2.0, pushed 2026-08-14. Retrieved 2026-08-16.
- **Why it is here.** Cedar has a Lean model of the same shape as
  `verify/moves`, and it did **not** verify its production Rust. It
  keeps `cedar-drt/` (differential + property-based fuzz targets
  against the Lean spec) and `cedar-lean-ffi/` — Rust bindings that
  call the Lean formalization through Lean's FFI, with Protobuf on the
  boundary. That is the extraction road, in production, at a peer.

### 9. "Verify existing C" tools (named because the brief names them)

- **Frama-C.** <https://frama-c.com/html/get-frama-c.html>, latest
  release **33.0 "Arsenic"** as listed on the download page, retrieved
  2026-08-16. The GitHub mirror
  `Frama-C/Frama-C-snapshot` was last pushed 2020-10-21 and carries no
  detected license; the project's own site is the live source.
- **VST.** <https://github.com/PrincetonUniversity/VST>, GitHub reports
  `NOASSERTION`, pushed 2026-08-04.
- **Relevance, stated honestly.** Both verify *C*. There is no Go or
  TypeScript frontend for either. They bear on this question only in
  the counterfactual where the kernel is hand-written C — which D-a
  named and killed.

---

## Sources referenced by key in `subset-census.mjs`

| key | source | quoted text |
|---|---|---|
| `gobra-tutorial-448` | `viperproject/gobra` `docs/tutorial.md` @ `782b530f`, line 448 | "Note that currently the support for strings and specific types of integers such as `rune` is very limited." |
| `gobra-tutorial-38` | same file, line 38 (inside an HTML comment in the source) | "Gobra provides an incomplete but growing support for the Go standard library. Currently, it has partial support for the packages `encoding/binary`, `net`, `strconv`, `strings`, `sync`, and `time`." — `encoding/json` is absent from that list |
| `gobra-readme-prototype` | `viperproject/gobra` `README.md` @ `782b530f` | "Gobra is a prototype verifier for Go programs, based on the Viper verification infrastructure." |
| `gobra-902` | <https://github.com/viperproject/gobra/issues/902> | "Add support for `select` statement" — open, created 2025-03-31 |
| `gobra-671` | <https://github.com/viperproject/gobra/pull/671> | "Parsing and type-checking generics" — open, created 2023-08-24 |
| `goose-writing` | `goose-lang/goose` `docs/writing-goose.md` @ `7434b9c1` | supported-features list ends "`uint64`, `uint32`, `byte` (no signed integers are supported)" |
| `goose-impl` | `goose-lang/goose` `docs/implementation.md` @ `7434b9c1` | "control flow is not perfectly supported (particularly for loops, which must be translated to anonymous recursive definitions)" |
| `gillian-readme-es5` | `GillianPlatform/Gillian` `README.md` @ `b195dfc3` | "Gillian-JS  # Instantiation of Gillian for ES5 JavaScript." |
| `gillian-cav21-caveats` | Gillian Part II, CAV 2021, "JS Verification: Caveats" | "as the AWS SDK JS implementation is written in TypeScript, we elide types to obtain JS"; "some ES6 features … are not yet supported by Gillian-JS; these we rewrite to ES5 Strict"; "as Gillian does not support higher-order reasoning, we axiomatise the `toUtf8` function" |

## Not vendored, and why

- **JSCert** (<https://github.com/jscert/jscert>) — GitHub reports
  license `NOASSERTION`; last push 2024-02-05. Per the dispatch
  discipline, never vendor code whose license is absent or unclear.
  Linked only.
- **KJS** (<https://github.com/kframework/javascript-semantics>) — no
  license detected by GitHub; last push 2016-10-13. Linked only.
- **`s2n-tls` CI files and SAW scripts** — Apache-2.0, so vendorable,
  but the discipline prefers a link plus distilled technique for CI
  configuration. Distilled above; nothing copied.
