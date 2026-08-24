# Algebra and composition

## Discriminating questions

- What composes: values, operations, proofs, resources, traces, or interpretations?
- Is composition associative? What are the identities? Is it commutative, idempotent, ordered, or
  only partially defined?
- Is the goal an equality, homomorphism, universal property, refinement order, or monotonicity law?
- Are structures bundled data, typeclasses for coherent reusable structure, or explicit parameters?

## Smallest useful shapes

| Need                       | Start with                           | Typical obligations                                     |
| -------------------------- | ------------------------------------ | ------------------------------------------------------- |
| Sequential combination     | Semigroup/Monoid-like operation      | associativity, identities                               |
| Merge/retry tolerance      | Join-semilattice                     | associativity, commutativity, idempotence, monotonicity |
| One syntax, many meanings  | Algebra/fold/interpreter             | constructor equations, fusion/homomorphism              |
| Change of representation   | Equivalence/isomorphism/refinement   | round trips, preservation/reflection                    |
| Category-shaped components | objects, morphisms, composition      | typing, identities, associativity, functor laws         |
| Static resource summary    | product/map of per-resource algebras | field-specific composition and soundness to semantics   |

Use typeclasses for stable coherent structure; pass versioned policy, costs, schedulers, and other
operational choices explicitly. Do not invent one universal resource monoid when latency, memory,
permissions, and probabilities compose differently.

For reified effectful syntax and interpreters, hand off to `$lean-algebraic-systems`. For existing
Mathlib structures, use [Mathlib discovery](mathlib-discovery.md).

Mathlib's current APIs provide the vocabulary for ordinary algebraic hierarchy and category-shaped
composition; inspect them at the target revision instead of recreating parallel classes
([algebraic group definitions](https://leanprover-community.github.io/mathlib4_docs/Mathlib/Algebra/Group/Defs.html),
[category basics](https://leanprover-community.github.io/mathlib4_docs/Mathlib/CategoryTheory/Category/Basic.html)).
