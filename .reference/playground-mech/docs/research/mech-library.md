# @playground/mech — the TypeScript half of the model gate

`packages/mech` is an explicit-state model-checking library in the workspace's
own language, built as the application-layer counterpart to `go/effector/model`
(docs/research/effector-model-gate.md). It has three layers, each earning its
place by a different kind of evidence.

Epistemic placement first, per SPEC §10.1: everything here is **bounded model
checking** and **cross-implementation corroboration**. Nothing here is proof,
and nothing below claims to be.

## 1. The System layer (`src/system.ts`)

A generic transition system — state, fixed-order action enumeration, a step
function returning both successor and OBSERVABLE OUTCOME — with a deterministic
BFS checker, transition-level invariants, minimal counterexample traces, and
path enumeration for schedule derivation. Structurally a port of the Go
checker's engine, with the same discipline:

- invariants are checked on transitions, not states — fencing safety is a
  property of a write, invisible to a state predicate once the state moves on;
- the visited set is keyed on a caller-supplied canonical encoding, so there is
  no hash collision to reason about;
- the report carries a 64-bit fingerprint: the sum (mod 2^64) of FNV-1a over
  every discovered state's encoding.

An Effect surface (`checkEffect`) exposes a check as
`Effect<Report, MechViolation>` — a typed error carrying the formatted minimal
counterexample, so an application can gate a migration or a config rollout on a
model check and handle the counterexample like any domain error.

## 2. The cross-language wall (`src/effector.ts`, `test/effector.wall.test.ts`)

The abstract effector protocol (SPEC §6.1, both the ratified single-key form
and the withdrawn two-key form) is ported from Go with a byte-identical
canonical encoding, and the test suite pins the Go checker's recorded numbers
as frozen fixtures, in the P2a cross-language-wall tradition:

| Configuration | States | Transitions | Fingerprint |
|---|---:|---:|---|
| single-key gate model, depth 12 | 172,214 | 708,876 | `5cb6d2203cb19cce` |
| single-key, two owners | 4,612 | 15,170 | `91ac83b6a0eea571` |
| single-key, lease-gated steals | 13,133 | 55,542 | `a275416d936c396a` |
| single-key closure, caps 2/3/4 | 584 / 2,312 / 6,848 | 2,436 / 11,610 / 37,332 | `eb2cea9db6b2ad30` / `813d304ac616be98` / `d8f80ef5ae39eb90` |
| two-key at violation | 265 | 443 | `c07c50b821dc2d9c` |
| two-key, unique-outcome only | 235,184 | 968,562 | `cddfc5667843e2de` |

All pins hold, on the first run of the completed port. Both counterexample
traces also match action-for-action: the gate shape
`claim(A), begin(A), claim(B), finish(A)` and the audit's single-owner
self-steal shape `claim(A), begin(A), claim(A), finish(A)`.

What that means, stated precisely: two implementations of the protocol
semantics, in two languages, sharing no code, agree on the exact reachable
state set (not just its size — the summed fingerprint over canonical encodings
moves under any single-state divergence), on every transition count, and on
minimal counterexamples. A semantic transcription error in either port would
have to be matched by a compensating error in the other with fingerprint-level
precision. This is corroboration of the MODEL's transcription, complementary
to what trace conformance established about the IMPLEMENTATION.

The pins are fixtures: generated once from the Go side, then frozen. A failure
here means one port drifted, and which one is a finding — not a constant to
update.

## 3. The Scenario layer (`src/scenario.ts`) — model checking for code you can read

The System layer wants an explicit state machine; the translation from
algorithm to machine is itself a place bugs hide. The Scenario layer removes
the translation: each concurrent worker is a **generator function that reads
like the client code it models** — sequential logic, local variables, early
returns — yielding at exactly the points where it touches shared state. Each
`yield* atomic(...)` is one linearization point, one store round-trip. The
explorer runs every interleaving of those points (deterministic DFS, replayed
prefixes — generators cannot be forked), checks an invariant after every step,
and reports the first failing schedule.

Coverage is exact and stated: workers that terminate give a finite schedule
tree, explored exhaustively; retry loops are bounded and truncations are
counted in the report, never hidden.

### Demo 1 — the A6 story from worker code (`test/scenario.demo.test.ts`)

Two workers, ~30 readable lines each, differing in ONE atomic step:

- **two-key** (withdrawn): validate the fence by reading `work`, then CREATE
  the outcome on a separate register. The explorer refutes it immediately,
  printing exactly CEX-3:

  ```
   1. alice    claim           -> {fence:1, rev:1}
   2. alice    read-fence      -> sees Claim(f=1)
   3. bob      claim           -> {fence:2, rev:2}      <- the steal
   4. alice    create-outcome  -> "first"               <- lands anyway: VIOLATION
  ```

- **single-key** (ratified): same worker, but the write is a CAS on the same
  register at the revision the fence read observed. Every schedule clean
  (14 complete schedules with two workers, 450 with three, exhaustive).

The demo also recorded a real lesson at authoring time: the first draft stated
fencing safety as a state predicate and the explorer "refuted" a legal
schedule — a commit legal when it linearized is not retroactively illegal
because a later claim raised the bar. The property had to be moved to the
write itself (max-generation-at-commit-time), which is precisely why the Go
gate checks transitions, not states. The explorer catching its author's
property bug is the tool working.

### Demo 2 — the guarded activity protocol (`test/guarded.demo.test.ts`)

The P4 Part 2 protocol that `engine-guarded.ts` implements — lookup → adopt |
claim → effect → commit → journal, losers polling until they can adopt —
written as two racing engine workers over a single-key effector and a
create-only journal slot. Checked over every schedule (426 complete, poll
loops bounded and truncations zero):

- the effect executes exactly once when no lease lapses (EF1's premise);
- exactly one journal fact; every returned value equals it;
- a pre-committed foreign outcome is adopted with ZERO effect executions
  (EF3's shape);
- self-validation: an engine sabotaged to "adopt" its own local value instead
  of the authoritative one is caught, with the disagreeing schedule printed.

Demo 2 checks the protocol SHAPE the spec pins, at every interleaving —
complementary to EF1–EF3, which run the real code on a handful of real
schedules. The rung that closes the gap is §4.

## 4. Conformance: the REAL engine, every interleaving (`test/engine.conformance.test.ts`)

The subject is the actual `layerJournalGuarded` from
`packages/kernel/src/engine-guarded.ts` — unmodified, unaware. The substrate
under it is swapped, exactly as the Go lane swapped the substrate under the
real effector:

- a **virtual clock** provided through the pin's overridable `Clock`
  reference, making the engine's 25ms poll sleeps free and lease lapse
  impossible (EF1's stated regime). `effect/testing/TestClock` exists at the
  pin and is the richer tool — its sleeps suspend until `adjust()` — but that
  would put "advance time" into the schedule alphabet for zero gain while no
  lease may lapse; it is the right tool for a future lease-lapse lane and is
  named here so that lane doesn't rediscover it;
- the kernel's own in-memory journal (`makeMemory`);
- a **gated in-memory effector** implementing the single-key register
  semantics of SPEC §6.1 — the same semantics the Go lane checked over
  172,214 states and then trace-conformed against real NATS. Every effector
  call an engine makes parks at a gate until the driver grants it, one at a
  time, quiescing between grants.

The evidence chain composes:

```
real NATS  <=(Go trace conformance)=>  §6.1 register model
§6.1 register model  <=(this suite)=>  real engine-guarded protocol logic
```

The explorer enumerates ALL interleavings of the engines' linearization
points by stateless exploration (each schedule is a fresh run; single-choice
corridors are extended greedily inside one run, so runs are spent on branch
points). Two real engines race one executionId; per complete schedule:

- both engines return the same value, the effect executed exactly once, the
  journal holds exactly one ActivityOutcome fact;
- the committed register value decodes to a success exit of the agreed value
  at fence 1;
- each engine's op sequence is a word in the protocol automaton P4 Part 2
  pins — an engine emitting an op the protocol does not allow is a
  divergence even when the run ends well.

Recorded results: **86 complete schedules, 0 divergences** (18 branches
truncated at the 18-grant cap — poll tails make the schedule tree infinite;
truncations are counted, never hidden); the foreign-outcome variant adopts
with zero executions on every schedule; three runs of one schedule produce
byte-identical op logs (the interleaving really is driver-owned).

Self-validation, both directions: the earlier demo catches a sabotaged
ENGINE; this suite catches a sabotaged SUBSTRATE — a register whose mutual
exclusion is broken (a live claim granted again at the same fence) is caught
by the sweep at the TOCTOU schedule `[0,1,0,1,…]`, where engine B's claim
lands between its own lookup and A's — the effect runs twice and the
exactly-once property fires. Notably, reaching that defect REQUIRES the
explorer: the engine's lookup-before-claim discipline masks the broken
substrate on almost every schedule.

What this does not establish: behavior under lease lapse (at-least-once
execution, adoption after fencing — the TestClock lane), schedules longer
than the grant cap, or anything about the live sidecar transport (EF1–EF3's
territory, still theirs).

## Gates

`bun run typecheck && bun test` covers the package (13 files, 87 tests
workspace-wide, ~21s; the mech suite itself is ~7s, dominated by the two
235k/172k-state wall runs; the whole real-engine conformance sweep is ~1s
thanks to the virtual clock). No new runtime dependency: `effect@4.0.0-beta.107`
exact, same as the founding set. The Go gates are untouched by this package.

## Honest limits

- Bounds are bounds: depth 12 / stated generation caps on the wall, bounded
  poll budgets in scenarios. Nothing here speaks about behavior outside them.
- The Scenario explorer interleaves at yield granularity. Code between yields
  is atomic by construction — a worker that does two store round-trips inside
  one `atomic` has hidden a linearization point from the checker, and no
  property can recover it. The discipline is the contract.
- Scenario workers must be deterministic (no clock, no randomness); the
  explorer replays prefixes and impure workers would make counterexamples
  unreproducible. This is documented, not enforced by types.
- The unbounded questions (inductive invariants, refinement proofs) remain
  with the proof-tooling lane (Apalache/Ivy per the briefing) — out of reach
  on this machine (no Java, no Z3) and out of scope for this library.
