/**
 * The run replay wall: the engine executes the model's own executions.
 *
 * The corpus's `run` group carries, for every committed program declaration,
 * one execution the model performed: the door it was judged at, the writ it
 * acted under, the execution-time supplies its completion read, and the
 * outcome. This suite runs each of them through `Engine.run` and compares the
 * outcome the engine reaches with the bytes the model emitted.
 *
 * ## What is compared, and why it is not the encodings
 *
 * The two sides run at different identity scales. The model's labels are small
 * naturals it chose; this engine's are content addresses its hasher computed,
 * and the one translation between them is the guarded identity seam. Comparing
 * encoded sentences would therefore fail for a reason that is not a defect.
 *
 * What the vector states instead is label-free, and it is the whole outcome:
 * the arm, the refusing node, the taught reason, the walked node sequence, and
 * for each step the generator and the TAGS of the payload atoms the door swept.
 * The tags survive relabelling and still catch the defect that matters here — a
 * consumed local must reach the door as a literal, an unfilled hole as a hole.
 * The comparison is byte-for-byte against the vector's own `bytes` field,
 * through the estate's one canonicalizer.
 *
 * ## Where the expectations come from
 *
 * Nowhere in this file. The program declarations, the doors, the writs, the
 * supplies and the outcomes are all read out of the committed corpus; the
 * label map is built by declaring one real carrier per referent the vector's
 * OWN door names; and the payload atoms come off the engine's verdict stream,
 * which is the engine's own published data rather than a re-derivation of its
 * completion. The suite executes its own falsification once: the same wall,
 * run against a one-byte mutation of a committed vector, must refuse it.
 *
 * ## One bound, stated
 *
 * The engine judges at a door that EXTENDS the vector's: its replica also holds
 * the root writ it was seeded with and every carrier this suite declared to
 * build the label map. Admission is monotone in the door, so a landing replays
 * as a landing; the refusing vectors refuse for candidate-intrinsic reasons — an
 * unfilled hole is an atom sweep, an unfenced decide is a missing token — which
 * no door growth repairs. A vector refusing for a door-RELATIVE reason could not
 * be replayed this way, and none is carried.
 *
 * Every arm is byte-compared, the `unspeakable` one included. It was the one
 * exemption here: the model kept the steps that stood before the node it could
 * not speak and this engine's error channel discarded them. The operator ruled
 * the arm into the model and the prefix-keeping semantics with it, the engine
 * was repaired to match, and the divergence closed — so all five vectors are
 * one claim, and this file has no arm it only half checks.
 */
import { beforeAll, describe, expect, test } from "bun:test"

import { Effect, Fiber, Layer, Result, Stream } from "effect"
import { Schema } from "effect"

import type { WireValue } from "../src/truth/Canonical.js"
import { digestOf, type Digest } from "../src/truth/Digest.js"
import { structuralRefusal, type Refusal } from "../src/truth/Refusal.js"
import type { KernelCandidateAct } from "../src/kernel/KernelDoor.js"
import type { KernelDeclKind } from "../src/kernel/KernelTables.generated.js"
import type { TokenClaim } from "../src/kernel/KernelSdk.generated.js"
import type {
  KernelProgramDeclaration,
  KernelRunRecord,
} from "../src/kernel/KernelCorpusSchemas.js"
import {
  Engine,
  type EngineService,
  type EngineVerdict,
  type RunSupplies,
} from "../src/carriage/Engine.js"
import { Catalog, Payloads } from "../src/planes/Catalog.js"
import { stateOf, Cells, type Observation, CellName } from "../src/planes/Cell.js"
import { Lanes, declare as declareLaneValue, type EmittedEvent, LaneHandle } from "../src/planes/Lane.js"
import { Registers, type RegisterState, WorkKey } from "../src/planes/Register.js"

import type { JsonValue } from "@foldlab/core/jcs"

import { writeCanonicalValue } from "../scripts/kernel-corpus.js"
import { loadKernelArtifact } from "./KernelConformance.harness.js"
import { Holder } from "../src/kernel/Wire.js"

/* ------------------------------------------------------------- carriers */

/** Fixture carriers with real semantics: the cell joins, the register fences. */
const makeCarriers = (): {
  readonly layer: Layer.Layer<Lanes | Cells | Registers>
  readonly grant: (work: string) => Effect.Effect<RegisterState, Refusal>
} => {
  const cells = new Map<string, ReadonlyArray<Observation>>()
  const registers = new Map<string, RegisterState>()
  let position = 0

  const lanesLayer = Lanes.testLayer({
    emit: (_lane, event) =>
      Effect.gen(function* () {
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
    grant: (work) =>
      Effect.sync(() => {
        const current = stateFor(work)
        const next = { token: current.token + 1, holder: Holder.make("replay"), outcome: current.outcome }
        registers.set(work, next)
        return { token: next.token, holder: Holder.make("replay"), outcome: next.outcome }
      }),
  }
}

const rootWrit: WireValue = { v: 0, kind: "policy", name: "replay-root" }
const rootWritDigest: Digest = Effect.runSync(digestOf(rootWrit))

const AnyEvent = Schema.Unknown as Schema.ConstraintDecoder<unknown>

const fixtureLane = (handle: LaneHandle) =>
  Effect.runSync(declareLaneValue({
    handle,
    event: AnyEvent,
    eventSchema: rootWritDigest,
    partitions: 1,
    partitionKey: { path: [] },
  }))

interface Harness {
  readonly engine: EngineService
  readonly grant: (work: string) => Effect.Effect<RegisterState, Refusal>
}

const withEngine = <A>(
  body: (harness: Harness) => Effect.Effect<A, Refusal>,
): Promise<A> => {
  const carriers = makeCarriers()
  const layer = Engine.layer({
    catalog: [{ kind: "policy", digest: rootWritDigest }],
  }).pipe(Layer.provide(Layer.mergeAll(Catalog.layer, Payloads.layer, carriers.layer)))
  return Effect.runPromise(
    Effect.gen(function* () {
      const engine = yield* Engine
      return yield* body({ engine, grant: carriers.grant })
    }).pipe(Effect.provide(layer)) as Effect.Effect<A, never>,
  )
}

/* --------------------------------------------------------------- corpus */

let runVectors: ReadonlyArray<KernelRunRecord> = []
let programs: ReadonlyArray<{ readonly name: string; readonly declaration: KernelProgramDeclaration }> = []

beforeAll(async () => {
  const corpus = await loadKernelArtifact()
  runVectors = corpus.runs
  programs = corpus.programs
})

const programNamed = (name: string): KernelProgramDeclaration => {
  const found = programs.find((program) => program.name === name)
  if (found === undefined) throw new Error(`corpus program ${name} is missing`)
  return found.declaration
}

const runNamed = (name: string): KernelRunRecord => {
  const found = runVectors.find((vector) => vector.name === name)
  if (found === undefined) throw new Error(`corpus run vector ${name} is missing`)
  return found
}

/* ---------------------------------------------------------------- shape */

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
        argument.arg === "digest" ? { ...argument, id: map(argument.kind, argument.id) } : argument,
      ]),
    ),
  })),
})

/**
 * The payload atoms one candidate carries, at the model's own reading of which
 * argument lists the door sweeps.
 */
const payloadTags = (candidate: KernelCandidateAct): ReadonlyArray<string> => {
  switch (candidate._tag) {
    case "declare":
    case "updateInPlace":
      return candidate.payload.map((atom) => atom._tag)
    case "emit":
      return candidate.body.map((atom) => atom._tag)
    case "join":
      return candidate.contribution.map((atom) => atom._tag)
    case "fold":
      return candidate.query.map((atom) => atom._tag)
    case "decide":
      return candidate.outcome.map((atom) => atom._tag)
    default:
      return []
  }
}

/* ---------------------------------------------------------------- stage */

/** One referent this engine declared, at both scales. */
interface Staged {
  readonly label: bigint
  readonly digest: Digest
}

const refKey = (kind: string, id: bigint): string => `${kind}:${id}`

/**
 * Declares one real carrier for every referent the vector's own door names,
 * and answers with the map from the model's labels to this engine's.
 *
 * The kind selects the carrier, which is the whole of the dispatch: a lane
 * becomes a declared lane, a resource a declared cell, a program a declared
 * register, and everything else a declared value. Cells come last because a
 * cell joins under an algebra that must already stand.
 */
const stage = (
  harness: Harness,
  vector: KernelRunRecord,
): Effect.Effect<ReadonlyMap<string, Staged>, Refusal> =>
  Effect.gen(function* () {
    const staged = new Map<string, Staged>()
    const declareValue = (kind: KernelDeclKind, id: bigint, value: WireValue) =>
      Effect.gen(function* () {
        const outcome = yield* harness.engine.declare({ kind, value, writ: rootWritDigest })
        if (outcome._tag !== "carried") {
          throw new Error(`staging ${kind} ${id} was refused: ${outcome.refusal.reason}`)
        }
        staged.set(refKey(kind, id), {
          label: outcome.landed.label,
          digest: outcome.landed.digest,
        })
      })

    const cellRefs: Array<{ readonly kind: string; readonly id: bigint }> = []
    for (const reference of vector.context.catalog) {
      const id = reference.id
      switch (reference.kind) {
        case "resource":
          cellRefs.push({ kind: reference.kind, id })
          break
        case "lane": {
          const lane = fixtureLane(LaneHandle.make(`replay-lane-${id}`))
          const outcome = yield* harness.engine.declareLane({ lane, writ: rootWritDigest })
          if (outcome._tag !== "carried") {
            throw new Error(`staging lane ${id} was refused: ${outcome.refusal.reason}`)
          }
          staged.set(refKey("lane", id), {
            label: outcome.landed.label,
            digest: outcome.landed.digest,
          })
          break
        }
        case "program": {
          const outcome = yield* harness.engine.declareRegister({
            work: WorkKey.make(`replay-work-${id}`),
            writ: rootWritDigest,
          })
          if (outcome._tag !== "carried") {
            throw new Error(`staging register ${id} was refused: ${outcome.refusal.reason}`)
          }
          staged.set(refKey("program", id), {
            label: outcome.landed.label,
            digest: outcome.landed.digest,
          })
          break
        }
        default:
          yield* declareValue(reference.kind as KernelDeclKind, id, {
            v: 0,
            kind: reference.kind,
            name: `replay-${reference.kind}-${id}`,
          })
      }
    }

    // A cell's merge algebra is the one slot the run's supplies name and this
    // engine reads from its own binding instead. The vector's `strategy` supply
    // is therefore staged as a BINDING here rather than passed as a supply.
    for (const reference of cellRefs) {
      const strategy = vector.supplies.find((supply) => supply.slot === "strategy")
      const algebraId = strategy === undefined ? undefined : strategy.bound.algebra
      if (algebraId === undefined) {
        throw new Error(`the vector names resource ${reference.id} and binds no merge algebra`)
      }
      const algebra = staged.get(refKey("algebra", algebraId))
      if (algebra === undefined) {
        throw new Error(`the vector's strategy names algebra ${algebraId}, which its door has not`)
      }
      const outcome = yield* harness.engine.declareCell({
        cell: CellName.make(`replay-cell-${reference.id}`),
        algebra: algebra.digest,
        writ: rootWritDigest,
      })
      if (outcome._tag !== "carried") {
        throw new Error(`staging cell ${reference.id} was refused: ${outcome.refusal.reason}`)
      }
      staged.set(refKey("resource", reference.id), {
        label: outcome.landed.label,
        digest: outcome.landed.digest,
      })
    }
    return staged
  })

/**
 * The vector's supplies at this engine's scale. Four of the five slots are the
 * engine's own `RunSupplies` members and translate directly; `strategy` is
 * staged as a cell binding instead and contributes nothing here. A slot this
 * wall has never staged refuses loudly rather than being skipped: a vector
 * whose supply nobody translated would otherwise replay green by omission.
 */
const suppliesOf = (
  vector: KernelRunRecord,
  staged: ReadonlyMap<string, Staged>,
  fence: (register: bigint, value: bigint) => Effect.Effect<void, Refusal>,
): Effect.Effect<RunSupplies, Refusal> =>
  Effect.gen(function* () {
    const kinds = new Map<bigint, KernelDeclKind>()
    const tokens = new Map<bigint, TokenClaim>()
    for (const supply of vector.supplies) {
      switch (supply.slot) {
        case "kind":
          kinds.set(supply.node, supply.bound as KernelDeclKind)
          break
        case "token": {
          const register = staged.get(refKey("program", supply.bound.register))
          if (register === undefined) {
            throw new Error(`a token supply names register ${supply.bound.register}, unstaged`)
          }
          yield* fence(supply.bound.register, supply.bound.value)
          tokens.set(supply.node, { register: register.label, value: supply.bound.value })
          break
        }
        case "strategy":
          break
        default:
          throw new Error(
            `this wall does not stage a ${supply.slot} supply; the corpus grew one and the` +
              " translation has to grow with it",
          )
      }
    }
    return { kinds, tokens }
  })

/* ---------------------------------------------------------------- replay */

/** What one replay produced: the outcome as the vector spells outcomes. */
interface Replay {
  readonly bytes: string | null
  readonly structural: Refusal | null
}

/**
 * Runs one vector and answers with the outcome at the vector's own shape.
 *
 * The steps' node names come from the engine's own run outcome, the generator
 * from the declaration both sides read, and the payload atoms from the verdict
 * stream — the engine's published judgments, in the order it issued them, which
 * is what makes the payload the engine's answer rather than this file's guess.
 */
const replay = (vector: KernelRunRecord): Promise<Replay> =>
  withEngine(({ engine, grant }) =>
    Effect.gen(function* () {
      const declaration = programNamed(vector.program)
      const staged = yield* stage({ engine, grant }, vector)
      const label = (kind: string, id: bigint): bigint => {
        const found = staged.get(refKey(kind, id))
        return found === undefined ? id : found.label
      }
      const writ = staged.get(refKey("policy", vector.writ))
      if (writ === undefined) {
        throw new Error(`the vector acts under policy ${vector.writ}, which its door has not`)
      }
      const supplies = yield* suppliesOf(vector, staged, (register, value) =>
        Effect.gen(function* () {
          // The fixture register fences from zero, so it is granted forward
          // until its fence IS the value the vector's completion used.
          for (let issued = 0n; issued < value; issued += 1n) {
            yield* grant(`replay-work-${register}`)
          }
        }))

      const seen: Array<EngineVerdict> = []
      const collector = yield* Effect.forkChild(
        Stream.runForEach(engine.verdicts, (verdict) =>
          Effect.sync(() => {
            seen.push(verdict)
          })),
      )
      yield* Effect.yieldNow
      yield* Effect.yieldNow

      const mapped = relabel(declaration, label)
      const outcome = yield* Effect.result(
        engine.run(mapped, { writ: writ.digest, holder: Holder.make("replay"), supplies }),
      )

      yield* Effect.yieldNow
      yield* Effect.yieldNow
      yield* Fiber.interrupt(collector)

      if (Result.isFailure(outcome)) return { bytes: null, structural: outcome.failure }

      const generatorOf = (node: bigint): string => {
        const found = declaration.nodes.find((carried) => carried.name === node)
        if (found === undefined) throw new Error(`the engine walked node ${node}, undeclared`)
        return found.generator
      }
      const steps = outcome.success.steps.map((step, index) => {
        const judged = seen[index]
        if (judged === undefined) {
          throw new Error(`the engine published no verdict for step ${index}`)
        }
        return {
          generator: generatorOf(step.node),
          node: step.node,
          payload: payloadTags(judged.candidate),
          verdict: "admitted",
        }
      })
      const reached = outcome.success
      const shaped: JsonValue = reached._tag === "landed"
        ? { outcome: "landed", steps }
        : reached._tag === "refused"
        ? {
          node: reached.node,
          outcome: "refused",
          reason: reached.refusal.reason,
          steps,
        }
        : {
          detail: reached.detail,
          generator: generatorOf(reached.node),
          node: reached.node,
          outcome: "unspeakable",
          slot: reached.slot,
          steps,
        }
      return { bytes: writeCanonicalValue(shaped, `run vector ${vector.name}`), structural: null }
    })
  )

/**
 * The wall over one vector: byte-for-byte against the vector's own bytes, on
 * every arm. Nothing is exempt any more — the unspeakable arm is the model's
 * own outcome now, with the prefix standing on both sides, and this engine
 * reports the same node, the same slot, and the same one of the four ways the
 * slot had no value.
 */
const assertReplays = async (vector: KernelRunRecord): Promise<void> => {
  const produced = await replay(vector)
  expect(produced.structural).toBeNull()
  expect(produced.bytes).toBe(vector.bytes)
}

/* ----------------------------------------------------------------- walls */

describe("Engine.run replays the model's own executions", () => {
  test("the corpus carries run vectors, and every arm of the outcome", () => {
    expect(runVectors.length).toBeGreaterThan(0)
    const arms = new Set(runVectors.map((vector) => vector.outcome.outcome))
    expect([...arms].sort()).toEqual(["landed", "refused", "unspeakable"])
  })

  test("distill-shape lands over four nodes, byte-equal", async () => {
    await assertReplays(runNamed("distill-shape"))
  })

  test("distill-shape one token short refuses at its decide, byte-equal", async () => {
    await assertReplays(runNamed("distill-shape-unfenced"))
  })

  test("the filled twin lands over two nodes, byte-equal", async () => {
    await assertReplays(runNamed("holey-filled"))
  })

  test("the holey original refuses at its unfilled hole, byte-equal", async () => {
    await assertReplays(runNamed("holey"))
  })

  test("ground-two-node is unspeakable at its unwired lane, byte-equal", async () => {
    // The fifth vector, and the last to become a byte claim: the model's
    // unspeakable outcome carries the step that stood before the node it could
    // not speak, and so does this engine's.
    await assertReplays(runNamed("ground-two-node"))
  })

  test("every run vector replays byte-equal, and none is skipped", async () => {
    for (const vector of runVectors) {
      await assertReplays(vector)
    }
    expect(runVectors.length).toBe(5)
  })

  test("the wall catches a mutated run vector, on every arm it compares", async () => {
    // The falsification, executed. One byte of a committed vector's outcome
    // moves and the same wall that passes on the committed bytes must refuse
    // the mutant — once per thing the comparison is supposed to be sensitive
    // to. Without this, byte equality is a check nobody has seen fail.
    const mutations: ReadonlyArray<{
      readonly vector: string
      readonly from: string
      readonly to: string
      readonly what: string
    }> = [
      // A substituted local reaching the door as an unfilled hole instead of a
      // literal: the dataflow defect the payload tags exist to catch.
      {
        vector: "holey-filled",
        from: '"payload":["literal"]',
        to: '"payload":["hole"]',
        what: "a payload atom",
      },
      // A walked node the run never reached: the step sequence.
      {
        vector: "distill-shape",
        from: '"generator":"join","node":4',
        to: '"generator":"join","node":5',
        what: "a walked node name",
      },
      // A taught reason the door did not give: the refusal itself.
      {
        vector: "distill-shape-unfenced",
        from: '"reason":"unfenced-decide"',
        to: '"reason":"unfilled-hole"',
        what: "the taught refusal reason",
      },
      // The prefix an unspeakable run keeps: drop the step that stood before
      // the node the completion could not speak, and the wall must refuse.
      // This is the ruled semantics as a falsifiable claim rather than a
      // sentence — an engine that discarded the prefix would pass without it.
      {
        vector: "ground-two-node",
        from: '"steps":[{"generator":"declare","node":1,"payload":[],"verdict":"admitted"}]',
        to: '"steps":[]',
        what: "a standing prefix step of an unspeakable run",
      },
    ]

    for (const mutation of mutations) {
      const vector = runNamed(mutation.vector)
      const mutatedBytes = vector.bytes.replace(mutation.from, mutation.to)
      if (mutatedBytes === vector.bytes) {
        throw new Error(`the ${mutation.what} mutation did not change ${mutation.vector}`)
      }
      let refused = false
      try {
        await assertReplays({ ...vector, bytes: mutatedBytes } as KernelRunRecord)
      } catch {
        refused = true
      }
      if (!refused) {
        throw new Error(`the wall accepted ${mutation.vector} with ${mutation.what} moved`)
      }
      // And the unmutated vector still passes, so the refusal above is the
      // mutation and not the wall being broken.
      await assertReplays(vector)
    }
    expect(mutations.length).toBe(4)
  })
})
