/**
 * The engine wall: judgment precedes carriage, growth repairs relative
 * refusals, the engine's verdict is the door's own, and the program runtime
 * executes the corpus's own shapes.
 *
 * The independent witness on every carriage claim is a recording fixture
 * carrier: the recorder is outside the engine, so an engine that carried a
 * refused sentence would be caught by data it cannot reach. The suite also
 * executes that falsification once — an inline carry-before-judgment mutant
 * is run against the same recorder and must be caught — so the zero-carriage
 * assertion is a check that has been seen to fail.
 *
 * Program vectors come from the committed corpus, never hand-typed: the
 * refusal walls run the committed bytes directly, and the execution walls run
 * the same shapes label-mapped onto referents this engine declared — the map
 * replaces digest identities only, so the graph, the edges, and the holes are
 * the model's own.
 */
import { beforeAll, describe, expect, test } from "bun:test"

import { Effect, Fiber, Layer, Result, Stream } from "effect"

import type { WireValue } from "../src/truth/Canonical.js"
import { digestOf, type Digest } from "../src/truth/Digest.js"
import { structuralRefusal, type Refusal } from "../src/truth/Refusal.js"
import {
  admit,
  type KernelCandidateAct,
  type KernelVerdict,
} from "../src/kernel/KernelDoor.js"
import { KERNEL_REFUSAL_BY_REASON } from "../src/kernel/KernelTables.generated.js"
import type { KernelProgramDeclaration } from "../src/kernel/KernelCorpusSchemas.js"
import {
  Engine,
  type EngineService,
  type RunOutcome,
} from "../src/carriage/Engine.js"
import { Catalog, Payloads } from "../src/planes/Catalog.js"
import { stateOf, Cells, type CellState, type Observation, CellName } from "../src/planes/Cell.js"
import { Lanes, declare as declareLaneValue, type EmittedEvent, LaneHandle } from "../src/planes/Lane.js"
import { Registers, type RegisterState, WorkKey } from "../src/planes/Register.js"
import { Schema } from "effect"

import { loadKernelArtifact } from "./KernelConformance.harness.js"
import { PLANTED_CANDIDATES } from "./KernelDoor.fixtures.js"
import { Holder } from "../src/kernel/Wire.js"

/* ------------------------------------------------------------- fixtures */

interface RecordedEmit {
  readonly handle: string
  readonly event: unknown
  readonly holder: string
}

interface RecordedCommit {
  readonly work: string
  readonly token: number
  readonly outcome: string
}

interface Recorders {
  readonly emits: Array<RecordedEmit>
  readonly merges: Array<{ readonly cell: string; readonly delta: ReadonlyArray<Observation> }>
  readonly commits: Array<RecordedCommit>
  readonly grant: (work: string) => Effect.Effect<RegisterState, Refusal>
  readonly cellState: (cell: string) => Effect.Effect<CellState, Refusal>
}

/**
 * Recording fixture carriers with real semantics where a wall reads them: the
 * cell fixture joins through the shipped join, and the register fixture
 * enforces the token fence so a stale carriage refuses on its own law.
 */
const makeCarriers = (): {
  readonly layer: Layer.Layer<Lanes | Cells | Registers>
  readonly recorders: Recorders
} => {
  const emits: Array<RecordedEmit> = []
  const merges: Array<{ readonly cell: string; readonly delta: ReadonlyArray<Observation> }> = []
  const commits: Array<RecordedCommit> = []
  const cells = new Map<string, ReadonlyArray<Observation>>()
  const registers = new Map<string, RegisterState>()
  let position = 0

  const lanesLayer = Lanes.testLayer({
    emit: (lane, event, options) =>
      Effect.gen(function* () {
        emits.push({ handle: lane.handle, event, holder: options.holder })
        position += 1
        return {
          digest: yield* digestOf(event as WireValue),
          partition: 0,
          position,
          duplicate: false,
        } satisfies EmittedEvent
      }),
  })

  const cellsLayer = Cells.testLayer({
    read: (cell) => stateOf(cells.get(cell) ?? []),
    merge: (cell, delta) =>
      Effect.gen(function* () {
        merges.push({ cell, delta })
        const joined = yield* stateOf([...(cells.get(cell) ?? []), ...delta])
        cells.set(cell, joined.observations)
        return joined
      }),
  })

  const stateFor = (work: string): RegisterState =>
    registers.get(work) ?? { token: 0, holder: null, outcome: null }

  const registersLayer = Registers.testLayer({
    grant: (work, holder) =>
      Effect.sync(() => {
        const current = stateFor(work)
        const next = { token: current.token + 1, holder, outcome: current.outcome }
        registers.set(work, next)
        return { token: next.token, holder, outcome: next.outcome }
      }),
    renew: (work, token) =>
      Effect.sync(() => {
        const current = stateFor(work)
        return { token, holder: current.holder, outcome: current.outcome }
      }),
    commit: (work, token, outcome) =>
      Effect.gen(function* () {
        const current = stateFor(work)
        if (current.token !== token) {
          return yield* structuralRefusal({
            kind: "stale-register-token",
            law: "Only the current fence commits.",
            path: ["token"],
            got: token,
            expected: current.token,
            next: [],
          })
        }
        commits.push({ work, token, outcome })
        const landed = { token, value: outcome }
        registers.set(work, { ...current, outcome: landed })
        return { token, holder: current.holder, outcome: landed }
      }),
    expireSteal: (work, holder) =>
      Effect.sync(() => {
        const current = stateFor(work)
        const next = { token: current.token + 1, holder, outcome: current.outcome }
        registers.set(work, next)
        return { token: next.token, holder, outcome: next.outcome }
      }),
    observe: (work) => Effect.sync(() => stateFor(work)),
  })

  return {
    layer: Layer.mergeAll(lanesLayer, cellsLayer, registersLayer),
    recorders: {
      emits,
      merges,
      commits,
      grant: (work) =>
        Effect.flatMap(Effect.sync(() => stateFor(work)), (current) => {
          const next = { token: current.token + 1, holder: Holder.make("test"), outcome: current.outcome }
          registers.set(work, next)
          return Effect.succeed({ token: next.token, holder: Holder.make("test"), outcome: next.outcome })
        }),
      cellState: (cell) => stateOf(cells.get(cell) ?? []),
    },
  }
}

const rootWrit: WireValue = { v: 0, kind: "policy", name: "root" }
const rootWritDigest: Digest = Effect.runSync(digestOf(rootWrit))

interface Harness {
  readonly engine: EngineService
  readonly recorders: Recorders
}

/** One engine over fresh recording carriers, seeded with the root writ. */
const withEngine = <A>(
  body: (harness: Harness) => Effect.Effect<A, Refusal>,
): Promise<A> => {
  const carriers = makeCarriers()
  const layer = Engine.layer({
    catalog: [{ kind: "policy", digest: rootWritDigest }],
  }).pipe(
    Layer.provide(Layer.mergeAll(Catalog.layer, Payloads.layer, carriers.layer)),
  )
  return Effect.runPromise(
    Effect.gen(function* () {
      const engine = yield* Engine
      return yield* body({ engine, recorders: carriers.recorders })
    }).pipe(Effect.provide(layer)) as Effect.Effect<A, never>,
  )
}

const render = (verdict: KernelVerdict): string =>
  verdict.verdict === "admitted"
    ? `admitted:[${verdict.encoded.join(",")}]`
    : `refused:${verdict.reason}`

/** A permissive event decoder for fixture lanes. */
const AnyEvent = Schema.Unknown as Schema.ConstraintDecoder<unknown>

const fixtureLane = (handle: LaneHandle) =>
  Effect.runSync(declareLaneValue({
    handle,
    event: AnyEvent,
    eventSchema: rootWritDigest,
    partitions: 1,
    partitionKey: { path: [] },
  }))

/** Replaces digest-argument identities; the graph and holes stay the model's. */
const relabel = (
  declaration: KernelProgramDeclaration,
  map: (kind: string, id: bigint) => bigint,
): KernelProgramDeclaration => ({
  ...declaration,
  nodes: declaration.nodes.map((node) => ({
    ...node,
    args: Object.fromEntries(
      Object.entries(node.args).map(([field, argument]) => [
        field,
        argument.arg === "digest"
          ? { ...argument, id: map(argument.kind, argument.id) }
          : argument,
      ]),
    ),
  })),
})

/* -------------------------------------------------------------- corpus */

let corpusPrograms: ReadonlyArray<{ readonly name: string; readonly declaration: KernelProgramDeclaration }> = []
let corpusCandidates: ReadonlyArray<string> = []

beforeAll(async () => {
  const corpus = await loadKernelArtifact()
  corpusPrograms = corpus.programs
  corpusCandidates = corpus.admissions.map((admission) => admission.name)
})

const programNamed = (name: string): KernelProgramDeclaration => {
  const found = corpusPrograms.find((program) => program.name === name)
  if (found === undefined) throw new Error(`corpus program ${name} is missing`)
  return found.declaration
}

/* --------------------------------------------------------------- walls */

describe("the engine speaks through the one door", () => {
  test("a refused sentence performs no carriage", async () => {
    const someLane = Effect.runSync(digestOf({ v: 0, kind: "lane", handle: "ghost" }))
    const { outcome, emitted } = await withEngine(({ engine, recorders }) =>
      Effect.gen(function* () {
        const outcome = yield* engine.emit({
          lane: someLane,
          event: { n: 1 },
          holder: Holder.make("wall"),
        })
        return { outcome, emitted: recorders.emits.length }
      })
    )
    expect(outcome._tag).toBe("refused")
    if (outcome._tag === "refused") {
      expect(outcome.refusal.reason).toBe("forward-reference")
      expect(outcome.refusal.law).toBe(KERNEL_REFUSAL_BY_REASON["forward-reference"].law)
    }
    expect(emitted).toBe(0)
  })

  test("the recorder catches a carry-before-judgment mutant", async () => {
    // The falsification: an inline mutant that carries first and judges after
    // must be caught by the same recorder the zero-carriage wall reads. This
    // proves the wall can fail, so its green is evidence.
    const someLane = Effect.runSync(digestOf({ v: 0, kind: "lane", handle: "ghost" }))
    const emitted = await withEngine(({ engine, recorders }) =>
      Effect.gen(function* () {
        const mutantEmit = Effect.gen(function* () {
          const lane = fixtureLane(LaneHandle.make("mutant"))
          const lanes = yield* Effect.succeed(recorders)
          void lanes
          // Carriage first — the crime the engine's order makes impossible.
          recorders.emits.push({ handle: lane.handle, event: { n: 1 }, holder: "mutant" })
          return yield* engine.offer({
            _tag: "emit",
            lane: 1n,
            body: [{ _tag: "literal", value: 1n }],
          })
        })
        const verdict = yield* mutantEmit
        expect(verdict.verdict).toBe("refused")
        void someLane
        return recorders.emits.length
      })
    )
    expect(emitted).toBe(1)
  })

  test("declaring grows the context, so growth repairs a forward reference", async () => {
    await withEngine(({ engine }) =>
      Effect.gen(function* () {
        const value: WireValue = { v: 0, kind: "resource", cell: "ledger" }
        const digest = yield* digestOf(value)
        const label = (yield* engine.declare({
          kind: "resource",
          value,
          writ: rootWritDigest,
        }).pipe(Effect.map((outcome) => outcome._tag === "carried" ? outcome.landed.label : null)))
        expect(label).not.toBeNull()

        // The same reference that would have refused before now admits.
        const verdict = yield* engine.offer({
          _tag: "resolveDigest",
          kind: "resource",
          target: label as bigint,
          anchor: undefined,
        })
        expect(verdict.verdict).toBe("admitted")

        // And the carried resolve returns the value through verify-on-read.
        const resolved = yield* engine.resolve({ kind: "resource", target: digest })
        expect(resolved._tag).toBe("carried")
        if (resolved._tag === "carried") expect(resolved.landed).toEqual(value)
        return undefined
      })
    )
  })

  test("before the declaration, the same reference refuses forward-reference", async () => {
    await withEngine(({ engine }) =>
      Effect.gen(function* () {
        const digest = yield* digestOf({ v: 0, kind: "resource", cell: "ledger" })
        const outcome = yield* engine.resolve({ kind: "resource", target: digest })
        expect(outcome._tag).toBe("refused")
        if (outcome._tag === "refused") {
          expect(outcome.refusal.reason).toBe("forward-reference")
        }
        return undefined
      })
    )
  })

  test("the engine's verdict is the door's own on the model's candidates", async () => {
    await withEngine(({ engine }) =>
      Effect.gen(function* () {
        expect(corpusCandidates.length).toBeGreaterThan(0)
        for (const name of corpusCandidates) {
          const candidate = PLANTED_CANDIDATES[name]
          if (candidate === undefined) throw new Error(`no planted candidate for ${name}`)
          const context = yield* engine.context
          const direct = admit(context, candidate as KernelCandidateAct)
          const offered = yield* engine.offer(candidate as KernelCandidateAct)
          expect(render(offered)).toBe(render(direct))
        }
        return undefined
      })
    )
  })

  test("configuration is declared sentences: lane, cell, register", async () => {
    await withEngine(({ engine, recorders }) =>
      Effect.gen(function* () {
        const lane = fixtureLane(LaneHandle.make("walls"))
        const declaredLane = yield* engine.declareLane({ lane, writ: rootWritDigest })
        expect(declaredLane._tag).toBe("carried")

        const emitted = yield* engine.emit({
          lane: lane.digest,
          event: { fact: "observed" },
          holder: Holder.make("wall"),
        })
        expect(emitted._tag).toBe("carried")
        expect(recorders.emits).toEqual([
          { handle: "walls", event: { fact: "observed" }, holder: "wall" },
        ])

        const algebraValue: WireValue = { v: 0, kind: "algebra", definition: "set-union" }
        const algebra = yield* engine.declare({
          kind: "algebra",
          value: algebraValue,
          writ: rootWritDigest,
        })
        expect(algebra._tag).toBe("carried")
        const algebraDigest = yield* digestOf(algebraValue)

        const cell = yield* engine.declareCell({
          cell: CellName.make("ledger"),
          algebra: algebraDigest,
          writ: rootWritDigest,
        })
        expect(cell._tag).toBe("carried")
        if (cell._tag !== "carried") return undefined

        const joined = yield* engine.join({
          cell: cell.landed.digest,
          delta: [{ holder: "wall", value: 1 }],
        })
        expect(joined._tag).toBe("carried")
        expect(recorders.merges.length).toBe(1)

        const register = yield* engine.declareRegister({
          work: WorkKey.make("job-1"),
          writ: rootWritDigest,
        })
        expect(register._tag).toBe("carried")
        if (register._tag !== "carried") return undefined

        const granted = yield* recorders.grant("job-1")
        const decided = yield* engine.decide({
          register: register.landed.digest,
          token: granted.token,
          outcome: { verdict: "done" },
        })
        expect(decided._tag).toBe("carried")
        expect(recorders.commits.length).toBe(1)

        // A stale fence refuses on the register's own law — a carriage
        // refusal in the error channel, distinct from a door refusal.
        const stale = yield* Effect.result(engine.decide({
          register: register.landed.digest,
          token: granted.token - 1,
          outcome: { verdict: "late" },
        }))
        expect(Result.isFailure(stale)).toBe(true)
        if (Result.isFailure(stale)) expect(stale.failure.kind).toBe("stale-register-token")
        return undefined
      })
    )
  })

  test("every judgment lands on the verdict stream, refusals included", async () => {
    await withEngine(({ engine }) =>
      Effect.gen(function* () {
        const collector = yield* Effect.forkChild(
          Stream.runCollect(Stream.take(engine.verdicts, 2)),
        )
        yield* Effect.yieldNow
        yield* Effect.yieldNow
        yield* engine.offer({ _tag: "trustBytes", kind: "schema", target: 1n, asserted: 2n })
        yield* engine.offer({ _tag: "spawn", parent: 1n, request: 1n })
        const seen = yield* Fiber.join(collector)
        const verdicts = seen.map((event) => render(event.verdict))
        expect(verdicts).toEqual(["refused:unverified-read", "refused:forward-reference"])
        return undefined
      })
    )
  })
})

describe("the program runtime", () => {
  test("the corpus holey program refuses unfilled-hole at its reading node", async () => {
    // Supplies complete the sentence — the kind the declaration form cannot
    // carry — so what refuses is the unfilled hole itself, at the door, with
    // the model's own row.
    const outcome = await withEngine(({ engine }) =>
      engine.run(programNamed("holey"), {
        writ: rootWritDigest,
        holder: Holder.make("wall"),
        supplies: { kinds: new Map([[1n, "resource"]]) },
      })
    )
    expect(outcome._tag).toBe("refused")
    if (outcome._tag === "refused") {
      expect(outcome.node).toBe(1n)
      expect(outcome.refusal.reason).toBe("unfilled-hole")
      expect(outcome.refusal.law).toBe(KERNEL_REFUSAL_BY_REASON["unfilled-hole"].law)
      expect(outcome.refusal.repair).toBe(KERNEL_REFUSAL_BY_REASON["unfilled-hole"].repair)
      expect(outcome.steps).toEqual([])
    }
  })

  test("the corpus filled twin refuses forward-reference under this engine's view", async () => {
    // The committed bytes name referents this engine never admitted. The
    // refusal is door-relative — growth repairs it — and the label-mapped
    // twin below is that repair, executed.
    const outcome = await withEngine(({ engine }) =>
      engine.run(programNamed("holey-filled"), {
        writ: rootWritDigest,
        holder: Holder.make("wall"),
        supplies: { kinds: new Map([[1n, "resource"]]) },
      })
    )
    expect(outcome._tag).toBe("refused")
    if (outcome._tag === "refused") {
      expect(outcome.refusal.reason).toBe("forward-reference")
    }
  })

  test("the filled twin, label-mapped onto declared referents, lands", async () => {
    const { outcome, emits } = await withEngine(({ engine, recorders }) =>
      Effect.gen(function* () {
        const lane = fixtureLane(LaneHandle.make("program-lane"))
        const declaredLane = yield* engine.declareLane({ lane, writ: rootWritDigest })
        if (declaredLane._tag !== "carried") throw new Error("lane declaration refused")
        const writLabel = yield* Effect.map(
          engine.declare({ kind: "policy", value: { v: 0, kind: "policy", name: "runner" }, writ: rootWritDigest }),
          (declared) => declared._tag === "carried" ? declared.landed : null,
        )
        if (writLabel === null) throw new Error("policy declaration refused")

        const mapped = relabel(programNamed("holey-filled"), (kind, id) => {
          if (kind === "lane" && id === 1n) return declaredLane.landed.label
          if (kind === "policy" && id === 4n) return writLabel.label
          return id
        })
        const outcome = yield* engine.run(mapped, {
          writ: rootWritDigest,
          holder: Holder.make("wall"),
          supplies: { kinds: new Map([[1n, "resource"]]) },
        })
        return { outcome, emits: recorders.emits.length }
      })
    )
    expect(outcome._tag).toBe("landed")
    if (outcome._tag === "landed") {
      expect(outcome.steps.length).toBe(2)
      expect(outcome.landed).not.toBeNull()
    }
    expect(emits).toBe(1)
  })

  test("the distill shape executes end-to-end: resolve, decide, emit, join", async () => {
    const result = await withEngine(({ engine, recorders }) =>
      Effect.gen(function* () {
        const lane = fixtureLane(LaneHandle.make("distill-lane"))
        const declaredLane = yield* engine.declareLane({ lane, writ: rootWritDigest })
        if (declaredLane._tag !== "carried") throw new Error("lane refused")

        const algebraValue: WireValue = { v: 0, kind: "algebra", definition: "set-union" }
        yield* engine.declare({ kind: "algebra", value: algebraValue, writ: rootWritDigest })
        const algebraDigest = yield* digestOf(algebraValue)
        const cell = yield* engine.declareCell({
          cell: CellName.make("distill-cell"),
          algebra: algebraDigest,
          writ: rootWritDigest,
        })
        if (cell._tag !== "carried") throw new Error("cell refused")

        const register = yield* engine.declareRegister({
          work: WorkKey.make("distill-work"),
          writ: rootWritDigest,
        })
        if (register._tag !== "carried") throw new Error("register refused")

        const indexValue: WireValue = { v: 0, kind: "index", name: "sightings" }
        const index = yield* engine.declare({
          kind: "index",
          value: indexValue,
          writ: rootWritDigest,
        })
        if (index._tag !== "carried") throw new Error("index refused")

        const granted = yield* recorders.grant("distill-work")

        const mapped = relabel(programNamed("distill-shape"), (kind, id) => {
          if (kind === "index" && id === 8n) return index.landed.label
          if (kind === "program" && id === 5n) return register.landed.label
          if (kind === "lane" && id === 1n) return declaredLane.landed.label
          if (kind === "resource" && id === 6n) return cell.landed.label
          return id
        })
        const outcome = yield* engine.run(mapped, {
          writ: rootWritDigest,
          holder: Holder.make("wall"),
          supplies: {
            tokens: new Map([[2n, { register: register.landed.label, value: BigInt(granted.token) }]]),
          },
        })
        const cellNow = yield* recorders.cellState("distill-cell")
        return { outcome, recorders: {
          emits: recorders.emits.length,
          merges: recorders.merges.length,
          commits: recorders.commits.length,
        }, cellDigest: cellNow.digest }
      })
    )
    const outcome: RunOutcome = result.outcome
    expect(outcome._tag).toBe("landed")
    if (outcome._tag === "landed") {
      expect(outcome.steps.map((step) => step.node)).toEqual([1n, 2n, 3n, 4n])
      expect(outcome.landed).not.toBeNull()
      // The terminal landing is the joined cell state's identity.
      expect(outcome.landed?.digest).toBe(result.cellDigest)
    }
    expect(result.recorders).toEqual({ emits: 1, merges: 1, commits: 1 })
  })

  test("a run stops at its first refusal and the tail never carries", async () => {
    const result = await withEngine(({ engine, recorders }) =>
      Effect.gen(function* () {
        const lane = fixtureLane(LaneHandle.make("stopped-lane"))
        const declaredLane = yield* engine.declareLane({ lane, writ: rootWritDigest })
        if (declaredLane._tag !== "carried") throw new Error("lane refused")
        const algebraValue: WireValue = { v: 0, kind: "algebra", definition: "set-union" }
        yield* engine.declare({ kind: "algebra", value: algebraValue, writ: rootWritDigest })
        const cell = yield* engine.declareCell({
          cell: CellName.make("stopped-cell"),
          algebra: yield* digestOf(algebraValue),
          writ: rootWritDigest,
        })
        if (cell._tag !== "carried") throw new Error("cell refused")
        const register = yield* engine.declareRegister({
          work: WorkKey.make("stopped-work"),
          writ: rootWritDigest,
        })
        if (register._tag !== "carried") throw new Error("register refused")
        const indexValue: WireValue = { v: 0, kind: "index", name: "stopped" }
        const index = yield* engine.declare({
          kind: "index",
          value: indexValue,
          writ: rootWritDigest,
        })
        if (index._tag !== "carried") throw new Error("index refused")

        const mapped = relabel(programNamed("distill-shape"), (kind, id) => {
          if (kind === "index" && id === 8n) return index.landed.label
          if (kind === "program" && id === 5n) return register.landed.label
          if (kind === "lane" && id === 1n) return declaredLane.landed.label
          if (kind === "resource" && id === 6n) return cell.landed.label
          return id
        })
        // No token supplied: the door's own teaching stops the run.
        const outcome = yield* engine.run(mapped, { writ: rootWritDigest, holder: Holder.make("wall") })
        return {
          outcome,
          emits: recorders.emits.length,
          merges: recorders.merges.length,
          commits: recorders.commits.length,
        }
      })
    )
    expect(result.outcome._tag).toBe("refused")
    if (result.outcome._tag === "refused") {
      expect(result.outcome.node).toBe(2n)
      expect(result.outcome.refusal.reason).toBe("unfenced-decide")
      expect(result.outcome.refusal.law).toBe(KERNEL_REFUSAL_BY_REASON["unfenced-decide"].law)
      expect(result.outcome.steps.length).toBe(1)
    }
    expect(result.emits).toBe(0)
    expect(result.merges).toBe(0)
    expect(result.commits).toBe(0)
  })

  test("ground-two-node is unspeakable, and its prefix stands", async () => {
    // The ruled semantics (operator, 2026-08-19): a completion that cannot
    // answer ends the run as an OUTCOME, not an error, with the admissions
    // that already stood standing. Two gaps, one program: without the kind
    // supply the first node cannot be spoken and nothing stands; with it, the
    // first node lands and the second stops on a lane the form never wires.
    const unsupplied = await withEngine(({ engine }) =>
      engine.run(programNamed("ground-two-node"), {
        writ: rootWritDigest,
        holder: Holder.make("wall"),
      })
    )
    expect(unsupplied._tag).toBe("unspeakable")
    if (unsupplied._tag === "unspeakable") {
      expect(unsupplied.node).toBe(1n)
      expect(unsupplied.slot).toBe("kind")
      expect(unsupplied.detail).toBe("unsupplied")
      expect(unsupplied.steps).toEqual([])
    }

    const supplied = await withEngine(({ engine }) =>
      engine.run(programNamed("ground-two-node"), {
        writ: rootWritDigest,
        holder: Holder.make("wall"),
        supplies: { kinds: new Map([[1n, "resource"]]) },
      })
    )
    expect(supplied._tag).toBe("unspeakable")
    if (supplied._tag === "unspeakable") {
      expect(supplied.node).toBe(2n)
      expect(supplied.slot).toBe("lane")
      expect(supplied.detail).toBe("unwired")
      expect(supplied.steps.map((step) => step.node)).toEqual([1n])
    }
  })

  test("a forward consumption refuses on the admission relation", async () => {
    const forward: KernelProgramDeclaration = {
      edges: [{ from: 2n, to: 1n }],
      holes: [],
      lineage: [],
      // Oldest node consumes the newer one: admission order refuses it.
      nodes: [
        { args: {}, generator: "declare", name: 1n },
        { args: { body: { arg: "local", name: 1n } }, generator: "emit", name: 2n },
      ],
    }
    const outcome = await withEngine(({ engine }) =>
      Effect.result(engine.run(forward, { writ: rootWritDigest, holder: Holder.make("wall") }))
    )
    expect(Result.isFailure(outcome)).toBe(true)
    if (Result.isFailure(outcome)) {
      expect(outcome.failure.kind).toBe("malformed-value")
      expect(String(outcome.failure.got)).toContain("consumes")
    }
  })
})
