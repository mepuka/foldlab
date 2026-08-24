# Operations, laws, and interpreters

`Monad M` supplies executable `pure`/`bind`; lawful instances separately establish identity and
associativity. Those laws do not make arbitrary monadic code first-order, serializable, or statically
inspectable ([Lean monads](https://lean-lang.org/doc/reference/latest/Functors___-Monads-and--do--Notation/)).

## Representation ladder

| Composition capability                               | Reify when inspection is required                                      | Cost/limit                                                                                         |
| ---------------------------------------------------- | ---------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------- |
| Applicative, fixed independent shape                 | free/reified Applicative or explicit first-order DAG                   | reified topology enables parallel/static analysis; ordinary Applicative alone exposes no syntax    |
| Selective, effectful choice among known alternatives | free/reified Selective syntax                                          | explicit alternatives are inspectable; ordinary Selective alone need not reveal them               |
| Ordinary monad, data-dependent sequencing            | free/reified monadic syntax where the instruction signature permits it | host continuations hide future syntax; reification adds syntax and dependent-response design costs |
| Free/reified program                                 | folds, interpreters, tests, serialization policy                       | larger syntax; functions in responses may still block canonical encoding                           |
| Indexed free program                                 | illegal local phase sequencing uninhabited                             | dependent bind/packaging and transitions                                                           |
| Graded program                                       | static effect/resource summary                                         | soundness depends on a domain-specific grade algebra                                               |

For a reified program, implement at least two independent interpreters early: a pure simulator and
one of executor/analyzer/renderer. State constructor equations and prove the fold/interpreter laws
before adding optimization.

PolyFun provides a concrete state-indexed free-program design where responses select subsequent
state indices ([source](https://github.com/Verified-zkEVM/PolyFun/blob/f60bb39a85e8f3243ee70a3775d124112a599fa1/PolyFun/IPFunctor/Free/Family.lean)).
