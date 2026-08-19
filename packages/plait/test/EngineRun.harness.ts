/**
 * The corpus's own run vectors, staged onto carriers a suite can read.
 *
 * A run vector states the door it was judged at, the writ it acted under, and
 * the execution-time supplies its completion read — all at the MODEL'S
 * identity scale, which is small naturals it chose. A runtime reasons in
 * content addresses, so replaying one means declaring a real carrier for every
 * referent the vector's own door names and then relabelling the declaration's
 * digest arguments onto the labels those declarations landed at. The graph, the
 * edges, and the holes stay the model's; only identities move.
 *
 * Everything a suite needs to do that lives here so that a wall over what a run
 * PRODUCES and a wall over what a run MEANS can stand on the same staging
 * rather than on two readings of it.
 *
 * **The carriers are fixtures with real semantics where a wall reads them.**
 * The cell fixture joins through the shipped join and the register fixture
 * enforces the token fence, so a run that would be refused for staleness is
 * refused by the fence rather than by arrangement. The lane fixture records
 * what it was handed, which is what makes it an oracle: the recorder is
 * outside the engine, so what a wall reads there is data the engine cannot
 * reach.
 */
import { Effect, Layer } from "effect"
import { Schema } from "effect"

import type { WireValue } from "../src/truth/Canonical.js"
import { digestOf, type Digest } from "../src/truth/Digest.js"
import { structuralRefusal, type Refusal } from "../src/truth/Refusal.js"
import type { KernelDeclKind } from "../src/kernel/KernelTables.generated.js"
import type { TokenClaim } from "../src/kernel/KernelSdk.generated.js"
import type {
  KernelProgramDeclaration,
  KernelRunRecord,
} from "../src/kernel/KernelCorpusSchemas.js"
import { Holder } from "../src/kernel/Wire.js"
import { Engine, type EngineService, type RunSupplies } from "../src/carriage/Engine.js"
import { Catalog, Payloads } from "../src/planes/Catalog.js"
import { CellName, Cells, stateOf, type Observation } from "../src/planes/Cell.js"
import {
  declare as declareLaneValue,
  LaneHandle,
  Lanes,
  type DeclaredLane,
  type EmittedEvent,
} from "../src/planes/Lane.js"
import { Registers, WorkKey, type RegisterState } from "../src/planes/Register.js"

import { loadKernelArtifact } from "./KernelConformance.harness.js"

/* ------------------------------------------------------------- carriers */

/** One emission the lane fixture was handed, recorded outside the engine. */
export interface RecordedEmit {
  readonly handle: string
  readonly event: unknown
  readonly holder: string
}

/** Fixture carriers with real semantics, and the recorders a wall reads. */
export interface FixtureCarriers {
  readonly layer: Layer.Layer<Lanes | Cells | Registers, Refusal>
  /** Every event the lane fixture was handed, in the order it was handed them. */
  readonly emits: ReadonlyArray<RecordedEmit>
  /** Advances one register's fence, so a decide can be staged at its token. */
  readonly grant: (work: string) => Effect.Effect<RegisterState, Refusal>
}

/**
 * Builds one set of fixture carriers and the recorders over them.
 *
 * The lane carrier may be replaced by a real one, which is how a wall over a
 * substrate reuses the same staging as a wall over fixtures. When it is, the
 * recorder below sees nothing, because nothing was handed to it — what landed
 * is then read back from the substrate rather than from this process.
 */
export const makeCarriers = (lanes?: Layer.Layer<Lanes, Refusal>): FixtureCarriers => {
  const emits: Array<RecordedEmit> = []
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
        const joined = yield* stateOf([...(cells.get(cell) ?? []), ...delta])
        cells.set(cell, joined.observations)
        return joined
      }),
  })

  const stateFor = (work: string): RegisterState =>
    registers.get(work) ?? { token: 0, holder: null, outcome: null }

  const granted = (work: string, holder: Holder): RegisterState => {
    const current = stateFor(work)
    const next = { token: current.token + 1, holder, outcome: current.outcome }
    registers.set(work, next)
    return { token: next.token, holder, outcome: next.outcome }
  }

  const registersLayer = Registers.testLayer({
    grant: (work, holder) => Effect.sync(() => granted(work, holder)),
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
    expireSteal: (work, holder) => Effect.sync(() => granted(work, holder)),
    observe: (work) => Effect.sync(() => stateFor(work)),
  })

  return {
    layer: Layer.mergeAll(lanes ?? lanesLayer, cellsLayer, registersLayer),
    emits,
    grant: (work) => Effect.sync(() => granted(work, Holder.make("run-harness"))),
  }
}

/* ------------------------------------------------------------- the root */

/** The policy every staged declaration acts under. */
export const rootWrit: WireValue = { v: 0, kind: "policy", name: "run-harness-root" }

/** The address that policy lands at. */
export const rootWritDigest: Digest = Effect.runSync(digestOf(rootWrit))

/** The holder every staged run attributes its carriage to. */
export const runHolder: Holder = Holder.make("run-harness")

const AnyEvent = Schema.Unknown as Schema.ConstraintDecoder<unknown>

/** One lane a staged referent stands for; its event form admits anything. */
export const fixtureLane = (handle: LaneHandle): DeclaredLane<unknown, 1> =>
  Effect.runSync(declareLaneValue({
    handle,
    event: AnyEvent,
    eventSchema: rootWritDigest,
    partitions: 1,
    partitionKey: { path: [] },
  }))

/** The engine over whatever carriers a suite supplies, seeded with the root. */
export const engineLayer = (
  carriers: Layer.Layer<Lanes | Cells | Registers, Refusal>,
): Layer.Layer<Engine, Refusal> =>
  Engine.layer({ catalog: [{ kind: "policy", digest: rootWritDigest }] }).pipe(
    Layer.provide(Layer.mergeAll(Catalog.layer, Payloads.layer, carriers)),
  )

/* --------------------------------------------------------------- corpus */

/** The corpus's run vectors and the program declarations they execute. */
export interface RunCorpus {
  readonly runs: ReadonlyArray<KernelRunRecord>
  readonly programs: ReadonlyArray<{
    readonly name: string
    readonly declaration: KernelProgramDeclaration
  }>
}

/** Reads the committed corpus's run group and its program group. */
export const loadRunCorpus = async (): Promise<RunCorpus> => {
  const corpus = await loadKernelArtifact()
  return { runs: corpus.runs, programs: corpus.programs }
}

/** The vector of one name; a corpus that lost it fails loudly rather than skips. */
export const runNamed = (
  corpus: RunCorpus,
  name: string,
): KernelRunRecord => {
  const found = corpus.runs.find((vector) => vector.name === name)
  if (found === undefined) throw new Error(`corpus run vector ${name} is missing`)
  return found
}

/** The declaration of one name, read out of the corpus's program group. */
export const programNamed = (
  corpus: RunCorpus,
  name: string,
): KernelProgramDeclaration => {
  const found = corpus.programs.find((program) => program.name === name)
  if (found === undefined) throw new Error(`corpus program ${name} is missing`)
  return found.declaration
}

/* ---------------------------------------------------------------- stage */

/** One referent this engine declared, at both scales. */
interface Staged {
  readonly label: bigint
  readonly digest: Digest
}

const refKey = (kind: string, id: bigint): string => `${kind}:${id}`

/** Replaces digest-argument identities; the graph and holes stay the model's. */
export const relabel = (
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
 * Declares one real carrier for every referent the vector's own door names.
 *
 * The kind selects the carrier and that is the whole of the dispatch: a lane
 * becomes a declared lane, a resource a declared cell, a program a declared
 * register, and everything else a declared value. Cells come last because a
 * cell joins under an algebra that must already stand.
 */
const stage = (
  engine: EngineService,
  vector: KernelRunRecord,
): Effect.Effect<ReadonlyMap<string, Staged>, Refusal> =>
  Effect.gen(function* () {
    const staged = new Map<string, Staged>()
    const declareValue = (kind: KernelDeclKind, id: bigint, value: WireValue) =>
      Effect.gen(function* () {
        const outcome = yield* engine.declare({ kind, value, writ: rootWritDigest })
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
          const lane = fixtureLane(LaneHandle.make(`staged-lane-${id}`))
          const outcome = yield* engine.declareLane({ lane, writ: rootWritDigest })
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
          const outcome = yield* engine.declareRegister({
            work: WorkKey.make(`staged-work-${id}`),
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
            name: `staged-${reference.kind}-${id}`,
          })
      }
    }

    // A cell's merge algebra is the one slot the run's supplies name and the
    // engine reads from its own binding instead, so the vector's `strategy`
    // supply is staged as a BINDING here rather than passed as a supply.
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
      const outcome = yield* engine.declareCell({
        cell: CellName.make(`staged-cell-${reference.id}`),
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
 * The vector's supplies at this engine's scale.
 *
 * Four of the five slots are the engine's own `RunSupplies` members and
 * translate directly; `strategy` is staged as a cell binding instead and
 * contributes nothing here. A slot nobody has staged refuses loudly rather
 * than being skipped: a vector whose supply nobody translated would otherwise
 * replay green by omission.
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
            `this harness does not stage a ${supply.slot} supply; the corpus grew one and the`
              + " translation has to grow with it",
          )
      }
    }
    return { kinds, tokens }
  })

/** One vector staged to the point where the engine can walk it. */
export interface PreparedRun {
  /** The corpus declaration with its digest arguments relabelled. */
  readonly declaration: KernelProgramDeclaration
  /** The address the vector's own policy was declared at. */
  readonly writ: Digest
  /** The vector's execution-time supplies, translated. */
  readonly supplies: RunSupplies
}

/**
 * Stages one vector: every referent its door names becomes a real carrier, its
 * declaration is relabelled onto those carriers, and its supplies are
 * translated with any register fenced forward to the token its completion used.
 */
export const prepare = (
  engine: EngineService,
  corpus: RunCorpus,
  vector: KernelRunRecord,
  grant: (work: string) => Effect.Effect<RegisterState, Refusal>,
): Effect.Effect<PreparedRun, Refusal> =>
  Effect.gen(function* () {
    const declaration = programNamed(corpus, vector.program)
    const staged = yield* stage(engine, vector)
    const writ = staged.get(refKey("policy", vector.writ))
    if (writ === undefined) {
      throw new Error(`the vector acts under policy ${vector.writ}, which its door has not`)
    }
    const supplies = yield* suppliesOf(vector, staged, (register, value) =>
      Effect.gen(function* () {
        // The fixture register fences from zero, so it is granted forward until
        // its fence IS the value the vector's completion used.
        for (let issued = 0n; issued < value; issued += 1n) {
          yield* grant(`staged-work-${register}`)
        }
      }))
    return {
      declaration: relabel(declaration, (kind, id) => staged.get(refKey(kind, id))?.label ?? id),
      writ: writ.digest,
      supplies,
    }
  })
