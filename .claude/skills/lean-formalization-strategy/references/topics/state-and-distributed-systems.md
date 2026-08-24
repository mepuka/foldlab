# State and distributed systems

## Separate the layers

1. state and legal initial states;
2. commands/events and a pure transition function or relation;
3. traces and the observations visible to clients;
4. local invariants and global safety/liveness properties;
5. scheduler, delivery, fairness, clock, failure, and environment assumptions;
6. executable interpreter, simulator, monitor, or implementation relation.

Use indexed typestate for stable local call sequencing. Use transition relations for
nondeterminism, concurrency, loss, reordering, and environment actions. A list or `WriterT` log is a
sequential history, not a causal distributed ledger; concurrent histories need event identity,
causal/order structure, merge rules, and conflict semantics.

For global protocols, a well-formed global description and local endpoint projection are different
artifacts; deadlock/progress claims require explicit conditions. ZipperGen is architecture-only
evidence unless its license is established separately; at the inspected revision it contains global
message-sequence syntax, projection correctness, and a conditional deadlock-freedom theorem
([projection source](https://github.com/zippergen-io/zippergen-lean/blob/b8f0b068df395f7c07882ef3fede44faaf638aea/msc-agents/MSCAgents/Correctness.lean#L961),
[deadlock source](https://github.com/zippergen-io/zippergen-lean/blob/b8f0b068df395f7c07882ef3fede44faaf638aea/msc-agents/MSCAgents/DeadlockFreeness.lean#L44)).

Safety tooling is generally more mature than liveness. Never prove liveness without naming fairness,
availability, productivity, or delivery assumptions and where they are monitored.
