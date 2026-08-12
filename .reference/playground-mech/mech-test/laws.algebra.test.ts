/**
 * The algebraic law suite (mech-production-spec.md §2–§3).
 *
 * ML1–ML6: Proc's functor/monad/Kleisli laws, checked OBSERVATIONALLY — two
 * procs are equal iff their complete behavior sets (every schedule against a
 * rival worker, full op logs, final states) are structurally identical. For
 * concurrent code this is the equivalence that matters: it is sensitive to
 * linearization points, not just return values.
 *
 * ML7 is why: a bind that adds one no-op yield is semantically inert and
 * value-equal, yet observably UNLAWFUL — the rival can be scheduled into the
 * new gap, so the schedule space itself changes. The suite must see it.
 *
 * WL1–WL3: the P6 shadow — SPEC §8.1's bind-preservation evidenced against
 * the REAL layerJournal at the pin: monad-law regrouping preserves the
 * journal byte-for-byte and replays compositionally; a path-renaming
 * "refactor" (monad-law-equal!) orphans the recorded history, exactly as
 * §8.1 warns. Evidence toward PO-19; the owed P6 suite stays the
 * coordinator's.
 */

import { describe, expect, test } from "bun:test"
import * as Effect from "effect/Effect"
import * as Layer from "effect/Layer"
import * as Schema from "effect/Schema"
import * as Activity from "effect/unstable/workflow/Activity"
import * as Workflow from "effect/unstable/workflow/Workflow"
import { layerJournal } from "../../kernel/src/engine.ts"
import { initialCursor } from "../../kernel/src/chain.ts"
import {
  JournalStore,
  makeMemory,
  type JournalStoreService,
} from "../../kernel/src/store.ts"
import {
  andThen,
  flatMap,
  flatMapWithTick,
  map,
  pure,
  type Proc,
} from "../src/proc.ts"
import { atomic, behaviors, type Scenario, type Worker } from "../src/scenario.ts"

// ---------- the environment: a counter with a rival in the room ----------

interface Counter {
  readonly n: number
}

const bump = (label: string, by: number): Proc<Counter, number> =>
  function* () {
    return yield* atomic(label, (s: Counter) => [{ n: s.n + by }, s.n + by] as const)
  }

/** Wrap a proc as a worker whose return value is itself observable. */
const asWorker = (name: string, p: Proc<Counter, unknown>): Worker<Counter> => ({
  name,
  body: function* () {
    const r = yield* p()
    yield {
      label: `ret=${JSON.stringify(r)}`,
      run: (s: Counter) => [s, null] as const,
    }
  },
})

const rival: Worker<Counter> = {
  name: "rival",
  body: function* () {
    yield* atomic("r1", (s: Counter) => [{ n: s.n + 10 }, s.n + 10] as const)
    yield* atomic("r2", (s: Counter) => [{ n: s.n * 3 }, s.n * 3] as const)
  },
}

const envOf = (p: Proc<Counter, unknown>): Scenario<Counter> => ({
  initial: { n: 0 },
  workers: [asWorker("main", p), rival],
})

const behaviorSet = (p: Proc<Counter, unknown>) =>
  behaviors(envOf(p), (s) => `n=${s.n}`)

const expectEquiv = (a: Proc<Counter, unknown>, b: Proc<Counter, unknown>) => {
  const left = behaviorSet(a)
  const right = behaviorSet(b)
  expect(left.length).toBe(right.length)
  expect(left).toEqual(right)
  return left.length
}

// The stage functions the laws quantify over — each adds a real
// linearization point, so regrouping COULD go wrong if bind were unlawful.
const f = (x: number): Proc<Counter, number> => bump(`f(${x})`, x + 1)
const g = (y: number): Proc<Counter, number> => bump(`g(${y})`, y * 2)
const h = (z: number): Proc<Counter, number> => bump(`h(${z})`, z - 3)
const base: Proc<Counter, number> = bump("base", 5)

describe("ML: the Proc monad, observationally, against a rival", () => {
  test("ML1 functor identity", () => {
    const n = expectEquiv(map(base, (x) => x), base)
    console.log(`ML1 over ${n} schedules`)
  })
  test("ML2 functor composition", () => {
    const inc = (x: number) => x + 1
    const dbl = (x: number) => x * 2
    expectEquiv(map(map(base, inc), dbl), map(base, (x) => dbl(inc(x))))
  })
  test("ML3 monad left identity", () => {
    expectEquiv(flatMap(pure<Counter, number>(7), f), f(7))
  })
  test("ML4 monad right identity", () => {
    expectEquiv(flatMap(base, (x) => pure<Counter, number>(x)), base)
  })
  test("ML5 monad associativity", () => {
    const n = expectEquiv(
      flatMap(flatMap(base, f), g),
      flatMap(base, (x) => flatMap(f(x), g)),
    )
    console.log(`ML5 over ${n} schedules`)
  })
  test("ML6 Kleisli associativity (pipeability)", () => {
    const left = andThen(andThen(f, g), h)
    const right = andThen(f, andThen(g, h))
    expectEquiv(left(2), right(2))
  })
  test("ML7 a bind that adds a linearization point is CAUGHT", () => {
    // Same values everywhere; one extra no-op yield. If the equivalence
    // cannot see this, ML1-ML6 above were vacuous.
    const lawful = behaviorSet(flatMap(pure<Counter, number>(7), f))
    const tick = behaviorSet(flatMapWithTick(pure<Counter, number>(7), f))
    expect(tick.length).toBeGreaterThan(lawful.length)
    console.log(
      `ML7: lawful bind ${lawful.length} schedules, ticked bind ${tick.length} — the extra linearization point is visible`,
    )
  })
})

// ---------- WL: the P6 shadow against the real journal engine ----------

const runWorkflow = async (
  store: JournalStoreService,
  workflowLayer: Layer.Layer<never, never, import("effect/unstable/workflow/WorkflowEngine").WorkflowEngine>,
  program: Effect.Effect<string, never, never>,
): Promise<string> => {
  const engine = layerJournal.pipe(Layer.provide(Layer.succeed(JournalStore)(store)))
  const full = workflowLayer.pipe(Layer.provideMerge(engine))
  return Effect.runPromise(program.pipe(Effect.provide(full)) as Effect.Effect<string>)
}

const journalPayloads = async (
  store: JournalStoreService,
  executionId: string,
): Promise<ReadonlyArray<string>> =>
  Effect.runPromise(
    Effect.gen(function* () {
      const handle = yield* store.open(`wf-${executionId}`)
      const page = yield* handle.read(initialCursor, 10_000)
      return page.entries.map((e) => e.payload)
    }).pipe(Effect.orDie),
  )

interface VariantCounters {
  a1: number
  a2: number
}

/** One workflow, three shapes. `shape` controls composition structure;
 * `secondName` controls the dynamic operation path of the second activity. */
const makeVariant = (shape: "seq" | "assoc", secondName: string) => {
  const counters: VariantCounters = { a1: 0, a2: 0 }
  const Wf = Workflow.make("P6Shadow", {
    payload: { key: Schema.String },
    idempotencyKey: (p) => `p6-${p.key}`,
    success: Schema.String,
  })
  const act1 = Activity.make({
    name: "stage-one",
    success: Schema.String,
    execute: Effect.sync(() => {
      counters.a1++
      return "A"
    }),
  })
  const act2 = (x: string) =>
    Activity.make({
      name: secondName,
      success: Schema.String,
      execute: Effect.sync(() => {
        counters.a2++
        return `${x}/B`
      }),
    })
  const layer =
    shape === "seq"
      ? Wf.toLayer(
          Effect.fnUntraced(function* (_p: { readonly key: string }) {
            const x = yield* act1
            const y = yield* act2(x)
            return y
          }),
        )
      : Wf.toLayer(
          Effect.fnUntraced(function* (_p: { readonly key: string }) {
            // The same program regrouped by monad-law associativity:
            // (act1 >>= act2) >>= pure  ===  act1 >>= (act2 >=> pure)
            // (ELS suggests simplifying the trailing flatMap-to-succeed into
            // a map — i.e. it recognizes right identity. That law being
            // applicable is the point; the redundant shape stays on purpose.)
            return yield* Effect.flatMap(
              Effect.flatMap(act1, (x) => act2(x)),
              (y) => Effect.succeed(y),
            )
          }),
        )
  return { Wf, layer, counters }
}

describe("WL: SPEC 8.1 bind preservation, on the real engine", () => {
  test("WL1+WL2: monad-law regrouping preserves the journal byte-for-byte and replays", async () => {
    const seq = makeVariant("seq", "stage-two")
    const assoc = makeVariant("assoc", "stage-two")
    const storeSeq = await Effect.runPromise(makeMemory)
    const storeAssoc = await Effect.runPromise(makeMemory)

    const vSeq = await runWorkflow(
      storeSeq,
      seq.layer,
      seq.Wf.execute({ key: "k" }) as Effect.Effect<string>,
    )
    const vAssoc = await runWorkflow(
      storeAssoc,
      assoc.layer,
      assoc.Wf.execute({ key: "k" }) as Effect.Effect<string>,
    )
    expect(vSeq).toBe("A/B")
    expect(vAssoc).toBe(vSeq)

    const executionId = await Effect.runPromise(
      seq.Wf.executionId({ key: "k" }) as Effect.Effect<string>,
    )
    const jSeq = await journalPayloads(storeSeq, executionId)
    const jAssoc = await journalPayloads(storeAssoc, executionId)
    expect(jSeq.length).toBeGreaterThan(0)
    // I(W >>= f) and its regrouping recorded IDENTICAL histories.
    expect(jAssoc).toEqual(jSeq)

    // WL2: compositional replay — a fresh engine over the same store
    // replays to the same value without re-executing anything.
    const before = { ...seq.counters }
    const replayed = await runWorkflow(
      storeSeq,
      seq.layer,
      seq.Wf.execute({ key: "k" }) as Effect.Effect<string>,
    )
    expect(replayed).toBe(vSeq)
    expect(seq.counters).toEqual(before)
    console.log(`WL1: ${jSeq.length} identical journal entries across regrouping`)
  })

  test("WL3: a path-renaming refactor is monad-law-equal and STILL orphans history", async () => {
    const honest = makeVariant("seq", "stage-two")
    const renamed = makeVariant("seq", "stage-two-renamed")
    const storeA = await Effect.runPromise(makeMemory)
    const storeB = await Effect.runPromise(makeMemory)

    const vA = await runWorkflow(
      storeA,
      honest.layer,
      honest.Wf.execute({ key: "k" }) as Effect.Effect<string>,
    )
    const vB = await runWorkflow(
      storeB,
      renamed.layer,
      renamed.Wf.execute({ key: "k" }) as Effect.Effect<string>,
    )
    // Same value — the rename is invisible to the caller...
    expect(vB).toBe(vA)
    const executionId = await Effect.runPromise(
      honest.Wf.executionId({ key: "k" }) as Effect.Effect<string>,
    )
    const jA = await journalPayloads(storeA, executionId)
    const jB = await journalPayloads(storeB, executionId)
    // ...and NOT to the record: the histories diverge, so replaying A's
    // journal under B's program would orphan the renamed activity's fact.
    expect(jB).not.toEqual(jA)
    console.log(
      `WL3: rename kept the value (${vA}) and changed ${jA.filter((p, i) => jB[i] !== p).length}+ journal entries`,
    )
  })
})
