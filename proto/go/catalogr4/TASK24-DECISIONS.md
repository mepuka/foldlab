# Task 24 decisions (merge-time numbering placeholders)

### D??. Reply mutants interpose after wire decode and before comparison

Decided: each build-tagged control mutates the decoded reply map in the R4
harness after a real protod request completes. The daemon state, model state,
schedule, and subsequent journal extraction remain honest. Alternatives:
tagged mutations inside protod response construction (outside this task's
owned file scope); mocked replies (would not exercise the real wire). Why:
the control isolates response-branch sensitivity while every witness still
drives real NATS request/reply and real daemon state. **Load-bearing? yes** —
a state mutant would not prove that reply-only drift is observed.

### D??. Public branch replies use exact top-level shapes and typed required fields

Decided: create, admitted, and refusal branches reject missing, mistyped, or
unexpected top-level fields; nested refusal and next-hint objects likewise
require the contract's fields and types. The four controls target created
true, converged created false, admitted, and refused. Alternatives: retain
Go's comma-ok zero defaults; assert only the branch discriminator; decode
straight into structs (which also defaults absent fields). Why: absence and
mistyping must be divergences, and a refusal must not pass merely because its
kind string survived. **Load-bearing? yes** — these checks are the response
half of the binary refinement comparator.

### D??. Published gate evidence is asserted at the gate that advertises it

Decided: run-r4 executes the corpus coverage pin directly, and the R2 runner
parses cap2's actual generated/distinct/depth values and requires exactly
119,145 / 18,295 / 16. Alternatives: rely on the repository Go test gate for
coverage; print TLC's counts without comparing them. Why: a standalone gate
must fail when its own evidence shrinks or its toolchain canary drifts.
**Load-bearing? yes** — printed evidence that cannot fail the command is not
a gate.
