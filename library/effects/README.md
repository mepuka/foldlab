# effects — Effect-native CAS replay and bounded semantics

Status: M0 domain contract ratified by grilling, 2026-08-26. No public model,
theorem, or Effect implementation claim has been admitted; implementation
begins at M1.

This mixed TypeScript/Lean library carries a deliberately bounded programme.
Its ratified first slice is described in
[`IMPLEMENTATION-PLAN.md`](IMPLEMENTATION-PLAN.md):

1. implement CAS and replay as public Effect TypeScript services;
2. derive replaying adapters for explicitly described Effect services;
3. use Lean 4 to model the sequential replay protocol and establish its model
   laws; and
4. keep model claims, source bridges, implementation observations, compilation,
   and hosted execution at separate claim gates.

The plan's domain contract is ratified: vocabulary, the mismatch taxonomy,
session semantics, and construction roles are minted in
[docs/effect-replay/CONTEXT.md](../../docs/effect-replay/CONTEXT.md). Compiler
acceptance, sampled execution, and a Lean model remain separate observations
and will not be collapsed into one claim.

The project starts with no Mathlib or external Lake dependencies. Its Lean
toolchain is pinned in [`lean-toolchain`](lean-toolchain), and the canonical
root gate will include this package through `mise run check:effects`.

Project-local copies of the relevant research inputs are indexed in
[`research/README.md`](research/README.md). Their canonical owners remain the
source documents under the repository's `docs/` tree.

Build locally with:

```text
lake --wfail build
```
