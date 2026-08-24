---
name: lean-project-bootstrap
description: Create, repair, or standardize an ordinary Lean 4 Lake project with reproducible toolchain, dependency, build, and test state. Use for a new Lean package or a broken/incomplete project setup; do not use for building the Lean compiler repository itself.
---

# Lean Project Bootstrap

Leave the selected project in a reproducible, minimally provisioned state and return a setup
receipt. Preserve its domain design; this skill establishes the environment, not the model.

## Classify before changing

1. Read repository instructions and inspect `lean-toolchain`, `lakefile.toml`/`lakefile.lean`,
   `lake-manifest.json`, source roots, tests, CI, and dirty state.
2. Classify the task as new package, existing-package repair, dependency/toolchain migration, or
   Lean compiler development. For compiler development, follow that repository's own workflow.
3. Record whether network access, a toolchain install, cache download, or dependency update would
   occur. Obtain authorization before any of those mutations.

Read [project shapes](references/project-shapes.md) when choosing Core/Std, Batteries, Mathlib,
library, executable, or mixed layouts. Read
[toolchains and dependencies](references/toolchains-and-dependencies.md) before creating or changing
pins.

## Establish the package

- For a new target, use the installed Lake's supported `new`/`init` interface and then edit the
  generated package; do not hand-invent a stale Lake template.
- For an existing target, make the smallest repair. Preserve package names, public modules,
  dependency revisions, and manifest state unless the user asked to migrate them.
- Pin an exact Lean release or revision in `lean-toolchain`. Commit the resolved Lake manifest when
  the repository's policy expects reproducible dependency resolution.
- Start with the smallest dependency surface. Add Mathlib only when its mathematics, tactics, or
  library APIs materially support the work.
- Add repository-shaped build/test/lint tasks only when they express real targets.

## Gate

Run the narrowest commands that prove the saved tree is usable, then the repository's full required
gate. At minimum verify the selected toolchain and build the declared targets. Exercise tests,
linters, executables, cache retrieval, or `leanchecker` only when present or required by policy.

Read [verification matrix](references/verification-matrix.md) to select the gate. Finish with:

- files created or changed;
- exact Lean and dependency pins;
- commands run and their results;
- network/install/external mutations authorized;
- unresolved platform, cache, native-library, or CI risks;
- a self-contained domain-work handoff; use `$lean-formalization-strategy` when that sibling skill is
  installed.
