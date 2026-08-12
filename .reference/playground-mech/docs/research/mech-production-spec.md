# PROPOSED SPEC — @playground/mech, production implementation

Status: **PROPOSAL for coordinator ratification.** This is not a ratified
`docs/primitives/P*` spec and does not claim that authority; it is the
implementing lane's design for hardening `packages/mech` from demo-grade to
production-grade, written in the house style (definition + numbered laws, each
law with its mechanical check and epistemic label). The law suite named here
already runs (`packages/mech/test/laws.algebra.test.ts`).

## 1. What production means for a checker

A model checker earns production status by different virtues than a service:

- **P1 (Determinism as law).** Every public entry point is a pure function of
  its inputs. No wall clock, no randomness, no iteration-order dependence.
  Check: repeated-run identity over states/transitions/fingerprints (already
  gated), plus the cross-language fingerprint wall.
- **P2 (Honest coverage).** Every bound (depth, generation cap, grant cap,
  schedule limit) appears in the report it bounds. A truncated sweep that
  reports itself exhaustive is the one unforgivable bug. Check: `capped`/
  `truncated` fields are load-bearing in every consumer test.
- **P3 (Falsifiability).** Every suite ships its own sabotage: a checker,
  property, or substrate corrupted in a named way that MUST be caught.
  (Currently: broken counter, sabotaged engine, broken-mutex substrate,
  two-key rediscovery, 828-mutation Go sweep.)
- **P4 (Frozen fixtures).** Cross-implementation pins (the Go fingerprints)
  are generated once and frozen; regeneration requires an attempts-log entry.

## 2. The algebraic layer — Proc as a monad, checked

Production composition needs `map`/`flatMap`/pipe on concurrent process
bodies, and those operators are only trustworthy if they are LAWFUL. The
mech vocabulary makes the laws checkable rather than assumed.

**Definition.** `Proc<S, R>` ≜ `() => Generator<AtomicOp<S>, R, unknown>` — a
process body over shared state `S` returning `R`, yielding at exactly its
linearization points. Operators (`src/proc.ts`):

- `pure(r)` — no yields, returns `r`.
- `map(p, f)` — run `p`, apply `f` to its return. Adds no yields.
- `flatMap(p, f)` — run `p`, then run `f(result)`. Adds no yields of its own
  (`yield*` delegation IS bind).
- `andThen(f, g) = x => flatMap(f(x), g)` — Kleisli composition; `.pipe`-able.

**Equivalence.** `p ≡ q` iff they are observationally indistinguishable under
EVERY schedule against a common environment: for each explored schedule, the
op log (labels + results), the completed-schedule count, and the serialized
final shared state are identical. Computed by `behaviors(...)` (exhaustive,
deterministic order) and compared structurally. This is contextual
equivalence restricted to the stated environment and bounds — the honest,
finite stand-in for full contextual equivalence.

**Laws (ML — mech laws), each checked in `laws.algebra.test.ts`:**

| # | Law | Statement (≡ as above) |
|---|---|---|
| ML1 | Functor identity | `map(p, x => x) ≡ p` |
| ML2 | Functor composition | `map(map(p, f), g) ≡ map(p, x => g(f(x)))` |
| ML3 | Monad left identity | `flatMap(pure(a), f) ≡ f(a)` |
| ML4 | Monad right identity | `flatMap(p, pure) ≡ p` |
| ML5 | Monad associativity | `flatMap(flatMap(p, f), g) ≡ flatMap(p, x => flatMap(f(x), g))` |
| ML6 | Kleisli associativity (pipeability) | `andThen(andThen(f, g), h) ≡ andThen(f, x => andThen(g, h)(x))` |
| ML7 | **Atomicity neutrality** (the production law) | a `flatMap` that introduces even one extra linearization point is DETECTED: `flatMapWithTick` breaks ML3 observably |

ML1–ML6 hold definitionally for generator delegation — the point of checking
them observationally, against a rival worker interleaving at every yield, is
ML7's contrapositive: the equivalence is sensitive enough to catch any future
"improvement" (logging, tracing, batching, an await) that smuggles a
linearization point into a combinator. In concurrent code the monad laws are
not bookkeeping — an unlawful bind CHANGES THE SCHEDULE SPACE, and the
checker sees it. Epistemic label: bounded-exhaustive observational check over
the stated environment; plus the definitional argument.

## 3. The P6 shadow — SPEC §8.1's bind-preservation, evidenced at the pin

SPEC §8.1 (PO-19, owed): interpreters preserve bind — `I(W >>= f) = I(W) >>=
I∘f` — and ONLY path-preserving monad-law transformations preserve recorded
semantics. The shadow suite runs the REAL `layerJournal` over `makeMemory`:

- **WL1 (bind preservation, observable form):** a workflow written as one
  sequential body and the same workflow regrouped by monad-law associativity
  (nested `flatMap`) produce byte-identical journals and equal results.
- **WL2 (compositional replay):** a fresh engine over the recorded journal
  replays both to the same value with zero re-executions.
- **WL3 (the caveat is real):** the same program with ONE activity renamed —
  a monad-law-equal but path-changing transformation — produces a DIFFERENT
  journal (the recorded history is orphaned), while returning the same value.
  §8.1's warning demonstrated, not just quoted.

This is evidence toward PO-19, not the owed P6 suite — the coordinator owns
that suite; this shadow gives it a running head start and a refutation
harness. Epistemic label: integration test on the reference engine.

## 4. Production module layout (target)

```
packages/mech/src/
  system.ts     — System/check/enumeratePaths/fingerprints (stable API)
  effector.ts   — the §6.1 model, wall-pinned (FROZEN encoding)
  scenario.ts   — Scenario/explore/behaviors (observational equivalence)
  proc.ts       — pure/map/flatMap/andThen + the ML law surface
  conform.ts    — (extract from test) gated-substrate conformance driver:
                  SharedWorld, virtual clock, stateless explorer — reusable
                  for any Context.Service-shaped substrate
```

Hardening backlog, in dependency order: (a) extract `conform.ts` so other
engines (P3b live plane, future P6 combinators) can be swept without copying
the driver; (b) TestClock-based lease-lapse lane (at-least-once regime — the
one behavior class the no-lapse sweep cannot see); (c) partial-order
reduction if schedule spaces outgrow brute force — with the reduction itself
validated against unreduced runs on small instances (P3 discipline);
(d) `Scenario` product/sequence combinators with their own ML-style laws.

## 5. What is NOT claimed

ML/WL checks are bounded and environment-relative. They do not prove the
generator monad lawful for all environments (that argument is definitional,
made in prose), do not touch the free-monad-catamorphism theorem itself
(§8.1's proof obligation stands with the coordinator), and say nothing about
schedules or state spaces beyond their stated bounds.
