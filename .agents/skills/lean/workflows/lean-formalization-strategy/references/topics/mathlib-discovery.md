# Mathlib and Std discovery

Use this topic when the mathematics or general-purpose theorem library is the work. For a small AST,
protocol, or executable checker, Core/Std may be the better starting point.

## Discovery loop

1. Inspect imports and toolchain; theorem names and available tactics are revision-specific.
2. Search by concept and goal shape, then inspect the exact declaration type and namespace.
3. Use `#check`/`#print`, editor hover, and suggestion tactics such as `exact?`, `apply?`, `rw?`, or
   `simp?` in a scratch file supported by the project.
4. Prefer the weakest sufficient structure in public statements and existing API lemmas over
   unfolding implementations.
5. Minimize imports after the route works; confirm the saved project still builds.

`#print axioms theoremName` reveals logical dependencies such as classical choice, but an expected
Mathlib axiom is not interchangeable with an unreviewed domain axiom
([Mathlib logic notes](https://leanprover-community.github.io/mathlib4_docs/Mathlib/Logic/Basic.html)).

## Common traps

- copying a theorem name from a different Mathlib snapshot;
- strengthening typeclasses until automation works, changing theorem generality;
- adding a broad import to hide a missing dependency;
- confusing a tactic suggestion with a stable proof/API choice;
- reproving a local fact without checking an existing abstraction or universal property.
