# verify/projections — reusable Lean projection tooling

This package turns a committed list of Lean declaration names into a
language-neutral `ProjectionAst`, then folds that AST into a deterministic
prose page. The manifest chooses *which* declarations belong; `Walk.lean`
reads every constructor, field type, and docstring from the compiled
environment. `run.sh` proves fresh byte-identical regeneration, two-run
determinism, a field-rename mutation, and the read-only dependency on
`verify/kernel`.

Regenerate and check everything:

```sh
cd verify/projections
./run.sh
```

Emit the committed page directly:

```sh
lake exe projections --target=prose --names=names.txt
```

Progressive discovery: start in `Projections/Ast.lean` for the interchange,
then `Projections/Walk.lean` for the only environment walk, and finally
`Projections/Prose.lean` for the pure target printer. The committed output is
`artifacts/prose.md`; `artifacts/probe.md` is the mutation control's pinned
baseline.

## Admission test

1. The surface names two folds: compiled environment + closed name list to
   `ProjectionAst`, then `ProjectionAst` to `Format`.
2. `walk` emits the AST and `Prose.render` emits the page. `run.sh` proves
   served-equals-derived by two emissions, committed-byte comparison, and a
   temporary field-rename mutation.
3. This is build tooling, not the kernel meaning path. Its input door refuses
   an empty or duplicate manifest, non-inductive names, missing docstrings,
   unsupported type expressions, and unknown targets with named diagnostics.
4. It performs no state aggregation and therefore claims no algebra rung or
   runtime carrier. Its evidence is an R0 byte wall over a fixed compiled
   environment.
5. It lives beside the model in verification tooling and imports inward only:
   projections requires kernel by path; kernel has no reverse reference.
6. Effect is not in the execution path. The requested CLI is a private Lean
   gate executable (`lake exe`), not a shipped product CLI or a second runtime
   service.

## Honest bounds

This slice emits prose only. It emits no TypeScript or JSON Schema, changes no
kernel source, and makes no runtime or VERIFICATION.md claim. The generic AST
contains `RefusalRow`; populating model-specific law/repair values is a later
producer's responsibility rather than something the declaration walker may
invent.
