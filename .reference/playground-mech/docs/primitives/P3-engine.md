# P3 — The Journal Engine (durable execution over the chained log)

Status: **SPEC RULED — climbing.** The fitness function is
`packages/kernel/test/engine.laws.test.ts`. Coordinator-owned; do not edit it
or this document. A law that seems wrong is a finding for the attempts log.

## The one sentence

**A user's ordinary Effect workflow — activities, fan-out, failure, retry —
becomes durable by running on an engine whose entire memory is a P1 chain:
every activity outcome is a content-addressed, CAS-appended, verify-on-read
journal fact, so a crash costs nothing but a replay and no effect that was
recorded ever runs twice.**

## Why this shape (the ambition, and the leverage)

`effect/unstable/workflow` at the pinned `4.0.0-beta.107` already defines the
durable-workflow vocabulary — `Workflow.make`, `Activity.make`,
`DurableDeferred`, and a `WorkflowEngine` service built from a low-level
`Encoded` contract via `WorkflowEngine.makeUnsafe`, with
`WorkflowEngine.layerMemory` as an in-memory reference implementation.

So this rung does NOT invent a workflow API. It implements the contract that
exists, over our substrate. Three consequences, all load-bearing:

1. **The user-facing API is already ergonomic and already typed.** A workflow
   author writes plain `Effect.gen` with `Activity.make`; durability is a
   Layer swap. That IS the destination stated for this project.
2. **`layerMemory` is a free ORACLE.** The master law is differential: the
   same workflow, run on `layerMemory` and on our journal engine, must agree.
   Nobody has to hand-write the expected semantics of suspension, retry, or
   failure — the reference defines them and the test compares.
3. **Durability is exactly P0–P2b.** An activity fact is a canonical value
   (P0 identity), appended to a chain (P1), through a store whose shape is
   P2b's Go journal API. Verification on read is P1's `stepVerify` and the
   cursor law is unchanged.

MEASURED before this spec was written (probe, discarded): a ~100-line engine
implementing `Encoded` ran a 3-way fan-out workflow, journaled 4 facts,
survived a total loss of engine-local state, and replayed to the identical
result with **zero** additional effect executions.

## The store seam

The engine never touches NATS. It consumes one service whose shape is exactly
P2b's Go journal, so the NATS-backed adapter is a mechanical later rung.

`packages/kernel/src/store.ts` (new):

```ts
import * as Context from "effect/Context"
import * as Data from "effect/Data"
import * as Effect from "effect/Effect"
import * as Layer from "effect/Layer"
import type { ChainEntry, Cursor } from "./chain.ts"

export class StoreError extends Data.TaggedError("StoreError")<{
  readonly reason: "conflict" | "tampered" | "unavailable"
  readonly detail: string
}> {}

export type AppendOutcome = "stored" | "duplicate"

export interface JournalHandle {
  readonly head: Effect.Effect<Cursor>
  readonly append: (
    payload: string,
  ) => Effect.Effect<{ readonly entry: ChainEntry; readonly outcome: AppendOutcome }, StoreError>
  readonly appendEntry: (
    entry: ChainEntry,
  ) => Effect.Effect<AppendOutcome, StoreError>
  readonly read: (
    from: Cursor,
    max: number,
  ) => Effect.Effect<
    { readonly entries: ReadonlyArray<ChainEntry>; readonly cursor: Cursor },
    StoreError
  >
}

export interface JournalStoreService {
  readonly open: (name: string) => Effect.Effect<JournalHandle, StoreError>
}

/** The journal's payload alphabet. Declared HERE, in store.ts — the law suite
 *  imports `EngineFact` from "../src/store.ts". (`import * as Schema from
 *  "effect/Schema"` at the top of the module.) */
export const EngineFact = Schema.Union([
  Schema.Struct({
    _tag: Schema.tag("ActivityOutcome"),
    activityId: Schema.String,   // `${executionId}/${activity.name}/${attempt}`
    exit: Schema.Unknown,        // the ENCODED exit (Workflow.Complete.exit as JSON)
  }),
  Schema.Struct({
    _tag: Schema.tag("DeferredOutcome"),
    deferredName: Schema.String,
    exit: Schema.Unknown,
  }),
])
export type EngineFact = typeof EngineFact.Type

export class JournalStore extends Context.Service<
  JournalStore,
  JournalStoreService
>()("playground/JournalStore") {}

/** A FRESH in-memory store. The test suite builds one and shares it across
 *  engine rebuilds — that sharing is what makes the crash law expressible. */
export const makeMemory: Effect.Effect<JournalStoreService>

/** Convenience layer over `makeMemory` (one store per layer build). */
export const layerMemory: Layer.Layer<JournalStore>
```

Ruled semantics for `layerMemory` (they are P1's, verbatim):

- `open` is idempotent per name and per layer instance: two opens of one name
  in one layer share the SAME underlying entries.
- `append` builds the next entry from the store's own head via `chain.append`
  and refuses newline-bearing payloads (P1's boundary) with a `StoreError`.
- `appendEntry` at an occupied position: byte-identical entry ⇒ `"duplicate"`;
  different bytes ⇒ `StoreError{reason:"conflict"}` (the P2b digest-compare
  resolution, in memory).
- `read` verifies incrementally with `chain.stepVerify` from `from`, and the
  returned cursor NEVER advances past an unverified entry. **Divergence from
  P2b's Go `Read`, stated so the NATS adapter does not mis-port it:** the Go
  journal returns the verified prefix AND the last-good cursor alongside its
  error; this TS store simply FAILS with `StoreError{reason:"tampered"}` and
  returns no partial result. The engine does not need the prefix (it re-replays
  from genesis), and an Effect failure channel is the idiomatic seam here.
  `max <= 0` means unbounded.
- `append` refuses a newline-bearing payload with
  `StoreError{reason:"unavailable"}` (the boundary class; nothing about the
  journal's position is in conflict).
- `JournalHandle` is a **plain object literal**, never a class instance: the
  law suite spreads a handle (`{...handle, read: …}`) to build a tampering
  adapter, and prototype methods would be lost by the spread.

## The engine

`packages/kernel/src/engine.ts` (new):

```ts
import * as Layer from "effect/Layer"
import * as WorkflowEngine from "effect/unstable/workflow/WorkflowEngine"
import { JournalStore } from "./store.ts"

/** Durable engine: journal-backed implementation of Effect's own contract. */
export const layerJournal: Layer.Layer<
  WorkflowEngine.WorkflowEngine,
  never,
  JournalStore
>
```

### The fact schema (canonical, Schema-typed)

One journal per execution, named `wf-<executionId>`. Each entry's payload is
the canonical encoding (P0 `canonical.encode`) of one `EngineFact` — declared
in **store.ts** (above), because the journal's payload alphabet belongs to the
store, and that is where the law suite imports it from.

`Schema.Unknown` for the exit is deliberate: the exit is already encoded by
Effect (`activity.executeEncoded` + `toJsonExit`), and `makeUnsafe` decodes it
back through the activity's own `exitSchemaPartial`. The engine stores JSON,
never re-types it. Canonical encoding still applies, so identity is byte
equality as everywhere else.

### `Encoded` obligations (what the engine must implement)

- **`register`** — remember `(workflow, execute)` by tag.
- **`execute`** — open/create the journal for the executionId, REPLAY it into
  a memo table, then run the workflow body; join and return its `Result`. A
  second `execute` of the same executionId while one is in flight joins the
  same run rather than starting a second body.
  - The replay **independently folds `chain.stepVerify`** over the entries the
    store returns, from `initialCursor`, and dies if the fold diverges or the
    folded head differs from the cursor the store returned. **The store's own
    verification is NOT trusted** — EL5 injects a store that verifies honestly
    and then corrupts the result on its way out.
  - `execute` **ALWAYS re-runs the body** over the replayed memo. The engine
    journals activity and deferred outcomes ONLY — never an execution-level
    result — so a recorded body defect is never replayed as the answer. (This
    is what makes EL3's heal-and-resume possible.)
- **`activityExecute(activity, attempt)`** — the heart:
  `activityId = ${instance.executionId}/${activity.name}/${attempt}`.
  1. If the memo (from replay) holds an outcome for `activityId`, return
     `new Workflow.Complete({ exit })` from the RECORDED exit and **do not
     run the effect**.
  2. Otherwise run `activity.executeEncoded` into a `Result`.
  3. If the result is `Complete`, append the `ActivityOutcome` fact to the
     journal BEFORE returning it, and add it to the memo. A `Suspended` result
     is not journaled.
  4. If the append reports `"duplicate"`, that is success (byte-identical
     re-record). If it reports a conflict, the fact recorded by the winner is
     authoritative: **re-run the whole replay for this execution and take the
     memo entry for this `activityId`**, returning that exit and never the
     local one; die if it is absent. (`StoreError` carries no position, so
     "re-read it" means re-replay, not a positional read.)
- **`resume`** — re-run the body from the replayed journal.
- **`poll`** — `Option.some(result)` once the execution has completed in this
  engine instance, else `Option.none()`.
- **`interrupt` / `interruptUnsafe`** — mark the instance interrupted and stop
  the body; no journaling.
- **`deferredResult` / `deferredDone`** — read/write `DeferredOutcome` facts
  in the same journal; `deferredDone` is idempotent (a second done for the
  same name is absorbed) and resumes the execution.
- **`scheduleClock`** — an in-process timer that calls `deferredDone` after
  the clock's duration. (A durable clock is a later rung; this rung must not
  claim one.)

Ruled: the engine holds NO state that survives its Layer — every memo is
rebuilt by replaying the journal at `execute`/`resume`. That is what makes
the crash law testable by simply rebuilding the Layer.

## Laws

The suite quantifies over a small workflow catalog (below) and uses
`WorkflowEngine.layerMemory` as the oracle.

- **EL1 — Interpreter agreement (the master law).** For every catalog
  workflow and payload, running on `layerJournal` (over `JournalStore.layerMemory`)
  yields the same outcome — success value, or failure value, or defect class —
  as running on `layerMemory`. Non-trivial: it forces correct handling of
  failure exits, not just happy paths.
- **EL2 — Effects run once per recorded outcome (crash law).** Run a workflow
  to completion; discard the engine Layer entirely (a crash), keeping only the
  store; run again with a fresh engine over the SAME store. The result is
  identical and the side-effect counters do NOT increase. Non-trivial: this is
  the whole durability claim, and a memo that is not rebuilt from the journal
  fails it.
- **EL3 — Partial-crash resumption.** With a workflow that fails its own body
  after k activities (an injected `Effect.die` at a chosen index, driven by an
  external switch), run, observe the journal holds exactly the facts for the
  activities that completed, then flip the switch off and re-run over the same
  store: the workflow completes, the already-recorded activities do not
  re-execute, and the remaining ones execute exactly once. Non-trivial: catches
  a memo rebuilt from the wrong cursor or facts journaled after the return.
- **EL4 — Flaky effect, one recorded outcome.** An activity whose effect fails
  the first N attempts and then succeeds via an internal `Effect.retry` INSIDE
  `execute` records exactly ONE `ActivityOutcome` fact, and re-running after a
  crash returns it without executing again. MEASURED, and the reason the route
  matters: an internal retry leaves `Activity.CurrentAttempt` at 1, so the
  activityId does not move; `Activity.retry` deliberately does the opposite —
  it bumps the attempt, so each attempt is a distinct activityId and each
  failure is a legitimate recorded outcome (three facts, not one). Durable
  per-attempt retry is a later rung.
- **EL5 — Journal integrity is enforced.** Corrupt an entry in the store
  (payload mutation at a known position, via a test-only store handle) and a
  fresh engine's replay of that execution FAILS rather than silently losing or
  inventing an activity outcome. The cursor law from P1 is what makes this
  detectable. Non-trivial.
- **EL6 — Facts are canonical and unique per activityId.** Across every run in
  the suite, every journal entry's payload decodes as an `EngineFact` and
  re-encodes to byte-identical bytes; and no `activityId` appears twice in one
  execution's journal.
- **EL7 — Fan-out determinism.** For the demonstration workflow with N
  parallel inference activities (`Effect.forEach` with concurrency), the
  recorded facts are a set keyed by activityId (order-independent), the
  reduced result is identical across repeated runs and matches `layerMemory`,
  and the journal contains exactly **N + 2** activity facts (plan + N infer +
  commit).
- **EL8 — A recorded activity FAILURE replays as a failure, once.** An
  activity that fails (its error caught by the body via `Effect.result`, so
  the workflow still succeeds) records ONE fact whose exit is a `Failure`, and
  a crash-and-resume returns that failure without executing the effect again.
  Non-trivial, and the gap it closes: without it an engine that journals only
  successful exits passes every other law.
- **EL9 — The store's own read refuses an unchained entry.** Two
  `appendEntry` calls whose second entry's `prev` does not chain make the
  store's `read` fail. Ruled with it: `appendEntry` at a FRESH position accepts
  the caller's entry as given (it does not validate `prev` on write — that is
  what makes the test constructible); verification is a READ-side obligation,
  exactly as in P1/P2b.

## The demonstration (what "climbed" means)

`packages/kernel/test/engine.laws.test.ts` runs an agent-inference-shaped
workflow end to end:

```
plan (activity)  ->  fan-out N inference calls (activities, concurrent)
                 ->  reduce (pure)  ->  commit (activity, FLAKY: fails twice
                                        then succeeds)
```

with (a) a crash injected after the fan-out completes but before commit, and
(b) the flaky commit. The assertions are mechanical: the final value equals
the `layerMemory` run's value; the inference counter equals N across BOTH the
pre-crash and post-crash runs combined; the commit effect executes exactly the
number of times its retry policy requires and no more; and the journal holds
exactly N + 2 activity facts with unique activityIds.

## Verification

`bun run typecheck && bun test packages/kernel` — all prior suites (P0, P1)
must stay green. The Go gates are untouched by this rung.

## Risks recorded

- `effect/unstable/workflow` is UNSTABLE at this pin. Its API is verified live
  by the probe above; a spec author must still confirm each import against
  `packages/kernel/node_modules/effect/src/unstable/workflow/*.ts` before use.
- Suspension/`DurableDeferred` semantics are only lightly exercised here by
  design. Durable clocks and deferred-driven suspension are a later rung.
- The store adapter in this rung is in-memory. It is the SAME interface the Go
  journal exposes, so the NATS binding is the next rung, not a redesign.

## References

- `effect/unstable/workflow/{Workflow,Activity,WorkflowEngine}.ts` at the pin
  — the contract implemented and the `layerMemory` oracle.
- Temporal — deterministic replay with memoized activity results; the
  "activity result recorded before it is observable" ordering.
- Restate / DBOS — journal-as-memory durable execution.
- Local: P0 (replay equivalence, canonical identity), P1 (chain, cursor law),
  P2b (store shape, CAS + digest-compare retry resolution).
