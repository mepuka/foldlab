# Effects library research inputs

Status: project-local copies, 2026-08-26.

These documents are copied inputs for scoping the `effects` library. They are
not new authorities, specifications, or claim-bearing outputs. Their canonical
owners remain the corresponding files under the repository's `docs/` tree;
refresh these copies explicitly rather than editing them independently.

The copies are retained because the project bootstrap requested a local
research pack. Before implementation milestone M1, a mise task must refresh
them from the canonical owners and fail unless the copies are byte-equal. Until
that task exists, drift is checked manually and no claim may cite a copied path
when a canonical path exists.

A manual SHA-256 check on 2026-08-26 found that `CONTEXT.md` and
`effect-modeling-wasm-interoperability-optimization-frontier.md` match their
canonical owners. The other five listed copies differ and must be treated as
stale until the M1 sync task refreshes them.

## Effect research reports

- [`effect-operational-semantics-reference-sweep.md`](docs/research/effect-operational-semantics-reference-sweep.md) — copied from `docs/research/`
- [`effect-runtime-ground-truth-extraction-scope.md`](docs/research/effect-runtime-ground-truth-extraction-scope.md) — copied from `docs/research/`
- [`effect-modeling-wasm-interoperability-optimization-frontier.md`](docs/research/effect-modeling-wasm-interoperability-optimization-frontier.md) — copied from `docs/research/`

## Effect semantics reference pack

- [`README.md`](docs/effect-typescript-semantics/README.md)
- [`CONTEXT.md`](docs/effect-typescript-semantics/CONTEXT.md)
- [`CLAIM-GATES.md`](docs/effect-typescript-semantics/CLAIM-GATES.md)
- [`IMPLEMENTATION-PLAN.md`](docs/effect-typescript-semantics/IMPLEMENTATION-PLAN.md)

The reference pack is copied from `docs/effect-typescript-semantics/`. Its
internal links to documents outside this snapshot point back to their canonical
repository locations.

## Project research

- [`cas-effect-program-replay.md`](cas-effect-program-replay.md) studies how a
  content-addressed program graph, an append-only effect history, checkpoints,
  and replay witnesses must remain separate. It proposes a fail-closed replay
  design and staged research direction without selecting a domain contract.
- [`xet-prior-art.md`](xet-prior-art.md) evaluates the exact
  `draft-denis-xet-05` edition as bounded CAS storage/transfer prior art for the
  ratified Effect Replay design. It records reusable materialization patterns,
  strict non-support boundaries, and deferred recommendations without amending
  the contract.
- [`tree-sitter-plan-prior-art.md`](tree-sitter-plan-prior-art.md) records the
  `lean4-tree-sitter` implementation plan as design prior art for the
  conformance workflow's schema bundles: proof obligations as structure
  fields, kits made unrepresentable-when-missing, and the sentence field as
  the plain-meaning source.

## Local external inputs

- [`BLAZE.md`](BLAZE.md) records the study note for the gitignored checkout at
  `.reference/clones/blaze`. Blaze has not been admitted to the canonical
  Source Lock, so the note is prior-art orientation rather than claim evidence.
- `.reference/papers/relational_separation_logic_for_effect_handlers.pdf` and
  its LiteParse reading copy under `.reference/papers/extracted/` are local-only
  paper inputs. They remain pending paper-lock and catalog admission and must
  not be cited as estate evidence until that admission is completed.
- [`general_compilation_techniques_effect_handlers_3473576.pdf`](docs/general_compilation_techniques_effect_handlers_3473576.pdf)
  is an off-pattern local copy, not an admitted project document or evidence
  source. M0 must either relocate its exact bytes into `.reference/papers/`
  through the provenance procedure or remove the duplicate after confirming a
  canonical copy. No move or deletion is authorized by this note.
