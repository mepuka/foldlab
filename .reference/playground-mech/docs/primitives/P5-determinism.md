# P5 — The Determinism Frontier (record/replay over the Effect runtime)

Status: **SPEC RULED — climbing, dispatched WITH P4.** Fitness function:
`packages/kernel/test/engine.determinism.laws.test.ts`. Coordinator-owned; do
not edit it or this document. A law that seems wrong is a finding for the
attempts log, not an edit.

**This spec is deliberately at the edge.** By operator directive it was NOT
prototyped by the coordinator before dispatch — the laws pin observables, the
mechanisms are open, and each law below carries an honest satisfiability
status. Reviews run in concert with the climb; a law proven unimplementable
in a finding becomes a coordinator amendment, not a workaround.

## The problem

A durable workflow replays its body. Everything the body observes that is
not a journaled fact is a fork waiting to happen: the winner of a race, the
reading of a clock, the remaining duration of a sleep, the arrival of an
external signal. Temporal solves this with a determinism sandbox and a
banned-API list; Restate with journaled promises. The academic question this
rung poses: **how much of it falls out of Effect's own service seam** — the
body's context is engine-provided, so every nondeterministic observation can
in principle be a service whose live interpretation JOURNALS and whose replay
interpretation READS — and where does that model break against the fiber
runtime (interruption, races, structured concurrency)?

## New fact kinds

`EngineFact` (packages/kernel/src/store.ts — UNFROZEN for this climb, fact
alphabet only) gains one member:

```ts
Schema.Struct({
  _tag: Schema.tag("Observation"),
  key: Schema.String,    // "<executionId>/obs/<n>" — n is the observation ordinal
  value: Schema.Unknown, // the observed value, canonical
})
```

The CloudEvents consumer contract (SL2) runs against the extended alphabet —
its checks may not weaken. Observation facts ride the same journal, same
chain, same CAS discipline as every other fact.

## New surface: `packages/kernel/src/durable.ts`

```ts
/** Journal-backed observations: live = observe once, journal, return;
 *  replay = return the recorded value. Ordinals are per-execution and
 *  assigned in observation order. */
export class DurableNow extends Context.Service<DurableNow, {
  /** current wall time in ms — journaled on first observation */
  readonly now: Effect.Effect<number>
}>()("playground/DurableNow") {}

/** A durable sleep: journals its absolute DEADLINE (an Observation fact) on
 *  first entry; on replay, sleeps only the REMAINDER (deadline - now, floor
 *  0). A crash mid-sleep costs the remainder, never a restart. */
export class DurableSleep extends Context.Service<DurableSleep, {
  readonly sleep: (name: string, durationMs: number) => Effect.Effect<void>
}>()("playground/DurableSleep") {}

/** A durable gate: blocks until a DeferredOutcome fact named `name` exists
 *  in the execution's journal (poll or better), then returns its decoded
 *  success value. Replay returns it immediately. The fact may be delivered
 *  by ANY writer through the journal — the gate trusts the chain, not the
 *  process. */
export class DurableGate extends Context.Service<DurableGate, {
  readonly await: (name: string) => Effect.Effect<string>
}>()("playground/DurableGate") {}

/** One layer provides all three, with NO stated requirements. Inside a
 *  journal-engine execution the implementations must find the execution's
 *  journal state AT CALL TIME and record/replay; outside one (layerMemory,
 *  plain code) they must degrade to live observation (DT5). HOW a
 *  context-free service discovers the executing workflow instance and its
 *  journal — fiber-context inspection, an engine-installed registry, a
 *  services handshake — is the open problem this rung poses. */
export const layerDurable: Layer.Layer<DurableNow | DurableSleep | DurableGate>
```

How the observation ordinals stay stable when the body's fiber structure
replays — and where the discovery mechanism breaks under interruption and
races — is the climb.

## Laws

- **DT1 — Observed time is immutable** (satisfiability: HIGH — pure
  record/replay through the service seam). A body observes `DurableNow.now`
  twice around a real 50ms sleep and embeds both in its value. Crash after
  completion; a fresh engine over the same store returns the byte-identical
  value ≥100ms of wall time later — the timestamps are the ORIGINAL
  observations, proven by capturing them in phase 1 and comparing. Exactly
  two Observation facts exist, whatever the number of replays.
- **DT2 — A recorded race replays its recorded winner** (satisfiability:
  MEDIUM — memoized-fact latency vs live-activity latency should decide the
  re-race identically, but activity interruption under `Effect.race` crosses
  the fiber runtime's interrupt-retry machinery for activities; the open
  question IS the law). Body: `Effect.race` of two activities, A delayed
  10ms / B delayed 300ms in phase 1 — A wins. Crash; the delays are FLIPPED
  (A 300ms / B 10ms); the resumed run still returns A's value, and A's
  effect has executed exactly once across both phases. The loser's effect
  count is deliberately unconstrained (honest residue: an interrupted branch
  may start again on replay before losing).
- **DT3 — A durable sleep resumes at its deadline, not from zero**
  (satisfiability: MEDIUM; the only wall-clock law, bands chosen with ≥400ms
  discrimination). Body: activity a, `DurableSleep.sleep("pause", 2000)`,
  activity b. Phase 1 is interrupted (Effect.timeout) ~500ms in, after a
  completed and the deadline fact landed. A fresh engine re-executes: total
  wall time from phase-1 start to completion lands in [1900, 2400]ms — a
  full-duration restart cannot beat 2500ms — with a executed once total and
  b exactly once. The deadline fact appears exactly once.
- **DT4 — A durable gate opens across process generations** (satisfiability:
  HIGH for the gate itself; the suspension-shaped part is deliberately
  minimal — full `Workflow.Suspended` integration is a later rung's
  problem). Body: activity a, `v = DurableGate.await("token")`, activity
  b(v). Phase 1 is interrupted while blocked on the gate; the journal holds
  exactly a's fact. The TEST then delivers the token by appending the
  DeferredOutcome fact directly through the store handle (any writer may;
  the chain is the authority). A fresh engine re-executes: returns the value
  embedding the token, a executed once TOTAL, b exactly once.
- **DT5 — Observations survive the oracle test** (satisfiability: HIGH).
  The same DT1-shaped workflow run on `WorkflowEngine.layerMemory` (which
  has no journal) must still complete with the same SHAPE of value — the
  durable services must degrade to plain observation when no journal exists
  (live semantics, no facts). Pins that the services are a seam, not a fork
  of the programming model.

DT1/DT4/DT5 run over the in-memory store (fast, deterministic); DT2/DT3 run
over the in-memory store too — the live plane is P3b's proven ground and
adds nothing to THESE claims. (If a law only fails over the live store, that
is a finding worth its own rung.)

## Verification

The whole-workspace gate plus the scoped Go gate, exactly as P4 Part 2 pins
them. Every prior suite stays green — including the perf laws: the
observation machinery may not regress PP1-PP4.

## Frozen / unfrozen

As P4 Part 2, plus: `packages/kernel/src/store.ts` UNFROZEN for the
EngineFact extension ONLY; `packages/standards/src/cloudevents.ts` and its
conformance module UNFROZEN to absorb the extended alphabet (vector counts
may not weaken — SL2 pins the floors) (the store's op semantics are load-bearing for
five suites — a behavioral change there that greens this suite by breaking
the spirit of another is the classic gamed climb, and the in-concert
reviewer is briefed to hunt exactly that); new file
`packages/kernel/src/durable.ts`.

## References

- Temporal — determinism constraints, versioning/patching, the sandbox this
  rung tries to make unnecessary.
- Restate — journaled promises; DBOS — recorded steps.
- Effect v4 `unstable/workflow` — DurableClock/DurableDeferred exist at the
  pin as prior art for DT3/DT4's shapes; the climber may study them but the
  gate binds OUR services, whose replay source is the P1 chain.
- P3 (the engine's replay rulings), P3b (the live plane), P4 (the effector).
- The operator's directive, 2026-08-11: specify at the edge; do not
  pre-solve.
