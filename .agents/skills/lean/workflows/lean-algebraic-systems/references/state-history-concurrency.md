# State, history, and concurrency

Transformer order is semantics. `StateT σ (Except ε)` and `ExceptT ε (State σ)` differ in whether
state is observable on failure; add a history layer and the same issue decides whether failed
attempts remain auditable.

Split state by commitment:

- ephemeral attempt state, allowed to roll back;
- committed domain state;
- append-only attempt/evidence events;
- external observations and receipts.

A sequential list has a total order chosen by one writer. A distributed history needs event IDs,
authors, causal parents or clocks, an explicit partial/order relation, merge laws, duplicate policy,
conflict semantics, and delivery/fairness assumptions. A replay theorem should state which events
contribute to logical state and what permutations are observationally irrelevant.

For protocols, model environment actions and nondeterminism in a transition relation instead of
pretending the executor controls delivery, time, failures, or other agents. State safety and liveness
separately; liveness requires named progress assumptions.
