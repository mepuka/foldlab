# Repository gate decisions the hygiene brief did not fix

### T1. Exercise install hermeticity through the gate runner self-test

Decided: `bun run gates --self-test` drives the install preflight against two
temporary absent-install roots, then plants a lockfile mutation and requires
the preflight to refuse and restore it. Alternatives: a separate preflight
control command; deleting the real checkout's installs during the runner
self-test. Why: the runner already owns gate wiring, and dependency absence is
a filesystem condition that a temporary tree can reproduce without touching
the working checkout or contacting the registry. **Load-bearing? yes** — a
control over the real tree would make the safety test itself destructive.
