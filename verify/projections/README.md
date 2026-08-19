# verify/projections — reusable Lean projection tooling

This package turns a committed list of Lean declaration names into a
language-neutral `ProjectionAst`, then folds that AST into a deterministic
prose page. The manifest chooses *which* declarations belong; `Walk.lean`
reads every constructor, field type, and docstring from the compiled
environment. The module set the walk loads travels with each manifest as a
`# modules:` directive, so a future package swaps manifests rather than
editing the executable. `run.sh` proves fresh byte-identical regeneration,
two-run determinism, the one-environment-walk claim (Main.lean's one loader
call is a named allowance), manifest-vs-corpus agreement, an environment-side
orphan register, and the read-only dependency on `verify/kernel`.
environment. `run.sh` proves fresh byte-identical regeneration, two-run
determinism, a field-rename mutation, the read-only dependency on
`verify/kernel`, and one mutation control per slice-A amendment (binder role,
ASCII transliteration, verbatim docstrings, name erasure — DECISIONS P4–P7).

Regenerate and check everything:

```sh
cd verify/projections
./run.sh
```

Emit the committed pages directly:

```sh
lake exe projections --target=prose --names=names.txt   # artifacts/prose.md
lake exe projections --target=orphans --names=names.txt # artifacts/orphans.md
# artifacts/probe.md: the refusal-probe emission renders producer-supplied
# refusal rows (one with applicability, one relying on the printer's fallback)
lake exe projections --target=refusal-probe --names=probe-names.txt
```

Progressive discovery: start in `Projections/Ast.lean` for the interchange,
then `Projections/Walk.lean` for the only environment walk and the orphan
scan, and finally `Projections/Prose.lean` for the pure target printer. The
committed output lives in `artifacts/`: `prose.md` is the manifest's page,
`probe.md` is the refusal-probe baseline, and `orphans.md` is the environment-
side register of declarations the namespace holds that the manifest omits.
Progressive discovery: start in `Projections/Ast.lean` for the interchange —
which also states, once, the three rules a target printer must not re-invent
(the binder role, the name-erasure rule of the reference grammar, and the ASCII
alphabet a docstring is carried in) — then `Projections/Walk.lean` for the only
environment walk, and finally `Projections/Prose.lean` for the pure target
printer. The committed output is
`artifacts/prose.md`; `artifacts/probe.md` is the mutation control's pinned
baseline.

## Admission test

1. The surface names two folds: compiled environment + closed name list to
   `ProjectionAst`, then `ProjectionAst` to `Format`.
2. `walk` emits the AST and `Prose.render` emits the page. `run.sh` proves
   served-equals-derived by two emissions, committed-byte comparison, and a
   temporary field-rename mutation; the refusal-probe emission proves the
   applicability fallback is live by a mutation of its own.
3. This is build tooling, not the kernel meaning path. Its input door refuses
   an empty or duplicate manifest, a manifest without a `# modules:`
   directive, non-inductive names, missing docstrings, unsupported type
   expressions, and unknown targets with named diagnostics.
4. `Walk.lean` is the one environment-walk site, proven across the package
   including Main.lean, whose single `importModulesUsingCache` call is a named
   allowance (it loads the environment; it does not walk it). The orphan scan
   keeps `Walk.lean` the one metaprogramming site: it enumerates the compiled
   namespace's eligible (Type-sorted, doc'd) declarations from the
   environment's own constant table and surfaces any the manifest omits in
   `artifacts/orphans.md`; the manifest's pinned count (22) moves only on
   coordinator ratification.
5. The manifest mirrors the corpus's emitted type roster — the `type` records
   of `../../packages/plait/fixtures/kernel-conformance.ndjson` — by a
   file-to-file Bash diff with a named failure.
6. It performs no state aggregation and therefore claims no algebra rung or
   runtime carrier. Its evidence is an R0 byte wall over a fixed compiled
   environment.
7. It lives beside the model in verification tooling and imports inward only:
   projections requires kernel by path; kernel has no reverse reference.
8. Effect is not in the execution path. The requested CLI is a private Lean
   gate executable (`lake exe`), not a shipped product CLI or a second runtime
   service.

## Honest bounds

This slice emits prose only. It emits no TypeScript or JSON Schema, changes no
kernel source, and makes no runtime or VERIFICATION.md claim. The slice-A
amendments state four rules the existing generators already apply, and the gate
proves each one spells the committed bytes; it does NOT prove agreement with
those generators, because the topology arm forbids this package from reading
the corpus they agree on. That comparison was run once by hand and is recorded
in `DECISIONS.md` as evidence, not as a wall. The generic AST
contains `RefusalRow`; populating model-specific law/repair values is a later
producer's responsibility rather than something the declaration walker may
invent — the probe lane is a producer in that sense (P6). Two findings
surfaces are deliberate and are not claims: the orphan register lists
declarations the namespace holds but the manifest omits (the coordinator
ratifies whether each joins), and the manifest-vs-corpus wall states only that
the two lists agree, never that either is complete.
