# Issue 60 runner/package-gap decisions

## D1. One gate plan, two host-shell entrypoints

Decided: `scripts/gates.sh` and `scripts/gates.ps1` are thin launchers for one
TypeScript command plan. The plan runs the required root battery, every
workspace package test script, and the proto Go/TypeScript batteries. Each
launcher reaches the same planted-exit and non-empty-format-output controls.

Alternatives: duplicate the full command list in Bash and PowerShell; leave CI
as the only complete runner. Why: duplicated transcriptions are the N-2 drift
class, while CI-only coverage leaves the repository without the local public
entrypoint its workflow claims to mirror. **Load-bearing? yes.**

## D2. Empty packages execute policy, not invented laws

Decided: `core` and `server` package scripts execute their real package tests.
The empty `ai`, `client`, and `codegen` promotion placeholders execute
`check-package-tests.ts --package <name>`, which admits only their exact marked
`export {}` body. The central policy additionally refuses every package lacking
an executable `test` script.

Alternatives: add meaningless smoke tests for empty exports; let the central
root test remain their only green signal. Why: a test for behavior that does
not exist would manufacture evidence, while an executable refusal policy makes
the present emptiness explicit and turns the first runtime export red until it
ships a licensed test. **Load-bearing? yes.**

## Audit disposition

N-3 was stale at the assigned base: `verify/catalog/probes/run-probe.sh`
already exists and remains a breaker-only runner. N-2's model-specific
PowerShell jobs and N-5's central package policy/server route test were also
already present. This task changed only the still-reproducible public-entrypoint
gaps above.
