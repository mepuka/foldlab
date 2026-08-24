# Proof-tool routing

| Operational shape                     | Primary proof route                                                         |
| ------------------------------------- | --------------------------------------------------------------------------- |
| Pure recursive interpreter/fold       | structural induction and simp lemmas for constructors                       |
| Single-threaded stateful Lean program | weakest-precondition/Hoare reasoning; consider `mvcgen`                     |
| Protocol/open system                  | reachable states, induction over transitions/traces                         |
| Compiler/representation change        | simulation, refinement, logical relation, or adequacy                       |
| Finite bounded obligation             | `decide`/`bv_decide` or certificate checking under an explicit trust policy |
| Resource bound                        | resource semantics plus soundness to operational steps                      |
| External implementation               | oracle/differential tests plus a proved bridge where feasible               |

The official `mvcgen` tactic targets monadic verification through specifications; do not extrapolate
it into a native concurrency or distributed-system logic
([Lean `mvcgen`](https://lean-lang.org/doc/reference/latest/The--mvcgen--tactic/)).

Select the theorem relation before proof search. Equality is often too strong for nondeterminism,
partiality, optimized layouts, or differing observables; a refinement/simulation theorem should
name what clients can observe.
