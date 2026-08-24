---
name: lean-algebraic-systems
description: Model effectful, stateful, protocol, or distributed systems in Lean after their domain contract exists, using lawful operations, reified programs, interpreters, indexed or graded composition, transitions, and traces. Do not use for ordinary theorem-hole repair or simple data invariants alone.
---

# Lean Algebraic Systems

Begin with operational shape, not with `Monad`.

Require a contract naming operations, observables, invalid scenarios, and environment assumptions. If
it is absent, perform a pre-model strategy pass first, using `$lean-formalization-strategy` when that
skill is installed or returning a provisional contract directly. Continue in the same response when
missing choices can be carried as explicit alternatives or assumptions; pause only when a missing
choice changes the semantic architecture or requires new authority.

## Select the weakest sufficient composition

- fixed independent operations: Applicative composition; use a free/reified Applicative or explicit
  first-order DAG only when the topology must be inspected;
- known alternatives with effectful condition: Selective composition; use free/reified Selective
  syntax only when alternatives must remain inspectable;
- later program shape genuinely depends on an earlier result: monadic bind;
- syntax must be inspected, serialized, analyzed, replayed, or interpreted several ways: reify a
  first-order instruction algebra/free program rather than storing only host continuations.

Read [operations, laws, and interpreters](references/operations-laws-interpreters.md) when choosing
the program representation.

## Separate the semantic artifacts

Define independently:

1. operation/command signature and responses;
2. state and pure transition function or relation;
3. program syntax and composition interface;
4. static folds/grades/footprints;
5. interpreters: pure simulator, executor, analyzer, checker, renderer, test generator;
6. event/trace model, replay fold, and concurrency/environment assumptions;
7. laws relating syntax, transitions, interpreters, and observations.

Use pre/post indices for stable protocol phase. Use grades for exact effects or honest static
summaries whose algebra and order match the quantity. Read
[graded and indexed modeling](references/graded-indexed-modeling.md) before defining either. Do not
encode volatile scheduler, retry, tenant, model, or budget policy as a global typeclass.

Read [state, history, and concurrency](references/state-history-concurrency.md) for open systems and
[proof-tool routing](references/proof-tool-routing.md) before selecting `mvcgen`, ordinary induction,
transition reasoning, finite decision, or refinement.

## Gate

Complete the system-model record with:

- constructor/step equations and composition laws;
- interpreter preservation/homomorphism laws;
- invariant preservation and reachable-state definition;
- trace/replay, idempotence, ordering, and merge obligations as applicable;
- refinement/adequacy theorem shape naming observable behavior;
- explicit fairness, delivery, failure, external-effect, and resource assumptions;
- positive scenarios and deliberately invalid programs/traces.

An ordinary `Monad` instance is not a canonical durable plan, and `WriterT` is not a causal ledger.
Return the model to the post-model signature-freeze pass. Use `$lean-formalization-strategy` when
installed or emit a self-contained handoff containing exact carriers, operations, transition and
observation semantics, laws, assumptions, examples/counterexamples, imports/toolchain, signature
skeleton, and unresolved choices. Invoke `$lean-llm-proof-loop` only after those signatures are
approved and only when that skill is available.
