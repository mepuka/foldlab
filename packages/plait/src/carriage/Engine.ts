/**
 * Plane: carriage — hosts and transport clients.
 *
 * The algebra engine: the one language-speaking service. A caller speaks a
 * candidate sentence; the sentence is judged by the imported kernel door —
 * never a wrapper, never a second validator — and only an admitted sentence
 * reaches a carrier. Judgment precedes carriage on every write path, which is
 * ingress totality made a property of the surface rather than a discipline
 * callers are asked to keep.
 *
 * ## What the engine is, and what it is not
 *
 * The engine decides nothing: `KernelDoor.admit` decides, and this module
 * routes every judgment through that exact imported function. The engine
 * schedules nothing: no clock, no retry, no queue lives here, and a program
 * run is one pass that stops at its first refusal — pacing, retries, and
 * reaction are the caller's, the same fence the daemon shape states. The
 * engine stores nothing authoritative: state lives in the carriers, and what
 * the engine holds is a REPLICA of the door context — a lower bound in
 * exactly the cell-replica sense, grown only by the engine's own admitted
 * declares and seeded at layer build. Growth is monotone, so the
 * read-judge-grow race between fibers is benign: a candidate admitted under a
 * smaller context is admitted under every larger one. The seeded pinned
 * universe grows in lockstep with the catalog: this engine's writ-universe
 * view extends with its own admissions, and a narrower per-writ discipline
 * belongs to the writ slice, not here.
 *
 * ## The two identity scales
 *
 * The door speaks model identity labels; the carriers speak content
 * addresses. The one translation is `KernelIdentity.kernelIdentity`, the
 * guarded seam. The engine remembers every translation it makes — label back
 * to address — and never computes the inverse itself: a label this engine has
 * not seen refuses as absence, and the repair is to declare the value through
 * this engine first. The runtime projection of a declared value's payload is
 * its pins as digest references followed by one literal carrying the value's
 * own identity label: the model reads a value as an opaque identity label,
 * and pins surface real referents to the door's sweep. An unpinned reference
 * escapes the sweep; that bound is stated, not hidden.
 *
 * ## Configuration is declared sentences
 *
 * The engine has no registration surface beside the language: a lane, a cell,
 * or a register becomes usable by DECLARING it — the declaration is judged,
 * cataloged, and the runtime binding remembered against the landed label. The
 * bindings map is the engine's directory replica, built by speaking.
 *
 * ## Refusals are data
 *
 * A refused sentence is not an error of this surface: the taught row rides
 * the outcome value, verbatim from the generated table, and every judgment —
 * admitted or refused — is published on the verdict stream. The error channel
 * carries only the seam vocabulary: translation refusals from the guarded
 * identity seam, carriage refusals from the planes, structural refusals at
 * the one parse boundary, and absence where this engine's replica holds no
 * binding for an admitted referent.
 *
 * ## What a run interprets, and what it does not
 *
 * An admitted trigger or spawn lands nothing: the model interprets both as
 * world-identity — hints are a derived read, writs are not world state — so a
 * verdict is their whole carriage here, they enter no landing a later node
 * could consume, and the reaction and writ machinery are their own slices. A
 * fold's landing is the state label its supplied anchor names; the read canon
 * that returns values stays on the session and fold seams.
 *
 * @module
 */
import { Context, Effect, Layer, PubSub, Ref, Result, Stream } from "effect"

import type { WireValue } from "../truth/Canonical.js"
import { digestOf, type Digest } from "../truth/Digest.js"
import {
  absenceRefusal,
  decodeRefusing,
  structuralRefusal,
  type AbsenceRefusal,
  type Refusal,
  type StructuralRefusal,
} from "../truth/Refusal.js"
import { kernelIdentity } from "../kernel/KernelIdentity.js"
import {
  admit as kernelAdmit,
  Candidate,
  type KernelAct,
  type KernelCandidateAct,
  type KernelDoorContext,
  type KernelRawArg,
  type KernelRef,
  type KernelVerdict,
} from "../kernel/KernelDoor.js"
import {
  KERNEL_GENERATOR_FIELDS,
  type KernelBuilderField,
  type KernelGenerator,
} from "../kernel/KernelBuilder.generated.js"
import type {
  KernelArgRef,
  KernelProgramDeclaration,
  KernelRunOutcome,
} from "../kernel/KernelCorpusSchemas.js"
import { admissionFault, erase, type KernelProgram } from "../kernel/KernelProgram.js"
import type { KernelDeclKind, KernelRefusalRow } from "../kernel/KernelTables.generated.js"
import type {
  CandidateAnchor,
  CandidatePredicate,
  TokenClaim,
} from "../kernel/KernelSdk.generated.js"
import { Catalog, Payloads } from "../planes/Catalog.js"
import { Cells, type CellState, type Observation } from "../planes/Cell.js"
import { Lanes, type DeclaredLane, type EmittedEvent } from "../planes/Lane.js"
import { Registers, type RegisterState } from "../planes/Register.js"
import { resolve as resolveVerified } from "../planes/Resolved.js"

/** One reference at the runtime scale: the kind brand and the content address. */
export interface EngineRef {
  readonly kind: KernelDeclKind
  readonly digest: Digest
}

/** What a layer build may seed: already-admitted referents, by address. */
export interface EngineSeed {
  /** Referents the door context opens with; each also joins the pinned universe. */
  readonly catalog?: ReadonlyArray<EngineRef>
}

/**
 * One landed result at both scales: the model identity label the door reasons
 * with, the kind brand when one exists, and the content address when this
 * engine performed the translation. A fold's landing carries a state label
 * and no address, because the model's fold returns no value.
 */
export interface EngineLanded {
  readonly label: bigint
  readonly kind: KernelDeclKind | null
  readonly digest: Digest | null
}

/**
 * The outcome of one judged write: either the sentence was admitted and
 * carried — the act, its canonical encoding, and what the carrier landed —
 * or the door refused it and the taught row is the whole answer. The row is
 * the generated table's, passed through; this module constructs no verdict.
 */
export type EngineOutcome<Landed> =
  | {
    readonly _tag: "carried"
    readonly act: KernelAct
    readonly encoded: ReadonlyArray<bigint>
    readonly landed: Landed
  }
  | {
    readonly _tag: "refused"
    readonly refusal: KernelRefusalRow
  }

/** One judgment the engine issued, published on the verdict stream. */
export interface EngineVerdict {
  readonly candidate: KernelCandidateAct
  readonly verdict: KernelVerdict
}

/** What an admitted declare landed: the address and its identity label. */
export interface DeclaredLanding {
  readonly digest: Digest
  readonly label: bigint
}

/** Inputs for declaring one value through the door. */
export interface DeclareOptions {
  readonly kind: KernelDeclKind
  readonly value: WireValue
  /** The policy digest this declaration acts under; must be admitted already. */
  readonly writ: Digest
  /** Referents the value names, surfaced to the door's sweep. */
  readonly pins?: ReadonlyArray<EngineRef>
}

/** Inputs for declaring an evidence lane and binding its runtime carrier. */
export interface DeclareLaneOptions<Event, Partitions extends number> {
  readonly lane: DeclaredLane<Event, Partitions>
  readonly writ: Digest
}

/** Inputs for declaring a cell resource and binding its runtime carrier. */
export interface DeclareCellOptions {
  readonly cell: string
  /** The address of the already-declared merge algebra this cell joins under. */
  readonly algebra: Digest
  readonly writ: Digest
}

/** Inputs for declaring a commitment register and binding its runtime carrier. */
export interface DeclareRegisterOptions {
  readonly work: string
  readonly writ: Digest
}

/** Inputs for one judged emit. */
export interface EngineEmitOptions {
  /** The address of the declared lane the event lands on. */
  readonly lane: Digest
  readonly event: WireValue
  readonly holder: string
  readonly pins?: ReadonlyArray<EngineRef>
}

/** Inputs for one judged join. */
export interface EngineJoinOptions {
  /** The address of the declared cell resource the delta joins into. */
  readonly cell: Digest
  readonly delta: ReadonlyArray<Observation>
}

/** Inputs for one judged decide. */
export interface EngineDecideOptions {
  /** The address of the declared work whose register lands the outcome. */
  readonly register: Digest
  /** The fencing token the caller was granted for that register. */
  readonly token: number
  readonly outcome: WireValue
}

/** Inputs for one judged resolve. */
export interface EngineResolveOptions {
  readonly kind: KernelDeclKind
  readonly target: Digest
}

/**
 * Execution supplies for one program run, bound by node name. Everything here
 * is what the declaration form deliberately does not carry: a declare's kind
 * brands the builder handle and is never written, and a fold's anchor, a
 * decide's token, and a trigger's predicate are execution-time by the model's
 * own field forms. A missing supply is refused by the DOOR with its own
 * teaching; the engine performs no judgment of its own over these.
 */
export interface RunSupplies {
  readonly kinds?: ReadonlyMap<bigint, KernelDeclKind>
  readonly anchors?: ReadonlyMap<bigint, CandidateAnchor>
  readonly tokens?: ReadonlyMap<bigint, TokenClaim>
  readonly predicates?: ReadonlyMap<bigint, CandidatePredicate>
}

/** Inputs for one program run. */
export interface RunOptions {
  /** The policy digest declare nodes act under; must be admitted already. */
  readonly writ: Digest
  /** Attribution carried on every event or observation a run lands. */
  readonly holder: string
  readonly supplies?: RunSupplies
}

/**
 * One executed node: its name, the admitted sentence's canonical encoding,
 * and what landed — null for the acts the model interprets as
 * world-identity.
 */
export interface RunStep {
  readonly node: bigint
  readonly encoded: ReadonlyArray<bigint>
  readonly landed: EngineLanded | null
}

/**
 * The way a slot had no value, in the model's own four words. The vocabulary
 * is read off the corpus's run schema rather than restated here, so a fifth
 * way would have to reach this type through the corpus that minted it.
 */
type RunGapDetail = Extract<KernelRunOutcome, { outcome: "unspeakable" }>["detail"]

/**
 * How one run ended: every node admitted and carried, stopped at the first
 * refusing node with the taught row intact, or stopped at the first node the
 * completion could not speak — and in both stopping cases every earlier step
 * is kept as evidence.
 *
 * The third arm is the model's own `RunOutcome.unspeakable` (operator ruling,
 * 2026-08-19) with the gap the model's arm leaves to the carriage: which slot,
 * and which of the four ways it had no value. A completion that cannot answer
 * never reaches the door, so there is no verdict to report — but the
 * admissions that already stood are still what happened, which is why they
 * stand here instead of being discarded with an error.
 */
export type RunOutcome =
  | {
    readonly _tag: "landed"
    readonly steps: ReadonlyArray<RunStep>
    readonly landed: EngineLanded | null
  }
  | {
    readonly _tag: "refused"
    readonly node: bigint
    readonly refusal: KernelRefusalRow
    readonly steps: ReadonlyArray<RunStep>
  }
  | {
    readonly _tag: "unspeakable"
    readonly node: bigint
    readonly slot: string
    readonly detail: RunGapDetail
    readonly steps: ReadonlyArray<RunStep>
  }

/** Transport-free engine operations: judgment first, carriage after. */
export interface EngineService {
  /** Candidate judgment is the kernel function itself; the engine adds none. */
  readonly admit: typeof kernelAdmit
  /** The engine's current door context — a replica, a lower bound, never an oracle. */
  readonly context: Effect.Effect<KernelDoorContext>
  /** Judges one candidate at the current context. Judgment only: nothing is carried. */
  readonly offer: (candidate: KernelCandidateAct) => Effect.Effect<KernelVerdict>
  /** Every judgment this engine issues, refusals included, as they happen. */
  readonly verdicts: Stream.Stream<EngineVerdict>
  readonly declare: (
    options: DeclareOptions,
  ) => Effect.Effect<EngineOutcome<DeclaredLanding>, Refusal>
  readonly declareLane: <Event, const Partitions extends number>(
    options: DeclareLaneOptions<Event, Partitions>,
  ) => Effect.Effect<EngineOutcome<DeclaredLanding>, Refusal>
  readonly declareCell: (
    options: DeclareCellOptions,
  ) => Effect.Effect<EngineOutcome<DeclaredLanding>, Refusal>
  readonly declareRegister: (
    options: DeclareRegisterOptions,
  ) => Effect.Effect<EngineOutcome<DeclaredLanding>, Refusal>
  readonly emit: (
    options: EngineEmitOptions,
  ) => Effect.Effect<EngineOutcome<EmittedEvent>, Refusal>
  readonly join: (
    options: EngineJoinOptions,
  ) => Effect.Effect<EngineOutcome<CellState>, Refusal>
  readonly decide: (
    options: EngineDecideOptions,
  ) => Effect.Effect<EngineOutcome<RegisterState>, Refusal>
  readonly resolve: (
    options: EngineResolveOptions,
  ) => Effect.Effect<EngineOutcome<WireValue>, Refusal>
  readonly run: (
    program: KernelProgram<never> | KernelProgramDeclaration,
    options: RunOptions,
  ) => Effect.Effect<RunOutcome, Refusal>
}

interface LaneBinding {
  readonly lane: DeclaredLane<never, number>
  readonly digest: Digest
}

interface CellBinding {
  readonly cell: string
  readonly algebra: bigint
  readonly digest: Digest
}

interface RegisterBinding {
  readonly work: string
  readonly digest: Digest
}

interface EngineState {
  readonly catalog: ReadonlyArray<KernelRef>
  readonly addresses: ReadonlyMap<bigint, Digest>
  readonly lanes: ReadonlyMap<bigint, LaneBinding>
  readonly cells: ReadonlyMap<bigint, CellBinding>
  readonly registers: ReadonlyMap<bigint, RegisterBinding>
}

type DeclarationNode = KernelProgramDeclaration["nodes"][number]

const contextOf = (state: EngineState): KernelDoorContext => ({
  catalog: state.catalog,
  pinned: state.catalog,
})

const grown = (
  state: EngineState,
  reference: KernelRef,
  digest: Digest,
): EngineState =>
  state.catalog.some((held) => held.kind === reference.kind && held.id === reference.id)
    ? state
    : {
      ...state,
      catalog: [...state.catalog, reference],
      addresses: new Map(state.addresses).set(reference.id, digest),
    }

/**
 * The taught row of a refused verdict. The parameter is the intersection the
 * refused arm already satisfies, so the projection is total and this module
 * neither constructs nor declares a verdict shape of its own.
 */
const rowOf = (refused: KernelRefusalRow): KernelRefusalRow => ({
  reason: refused.reason,
  law: refused.law,
  repair: refused.repair,
  applicability: refused.applicability,
})

const unboundCarrier = (subject: string, wanted: WireValue): AbsenceRefusal =>
  absenceRefusal({
    kind: "cataloged-value-absent",
    law: "The engine carries an admitted act only at a binding its own declarations registered.",
    path: ["bindings", subject],
    got: "absent",
    expected: wanted,
    next: [{
      subject: `Engine.${subject}`,
      note: "Declare the carrier through this engine first, then retry the act.",
    }],
  })

const unspeakableNode = (
  node: bigint,
  generator: string,
  detail: string,
): StructuralRefusal =>
  structuralRefusal({
    kind: "malformed-value",
    law: "A program node executes only when its declaration and supplies complete one candidate sentence.",
    path: ["nodes", String(node), generator],
    got: detail,
    expected: "arguments and supplies that complete the generator's candidate form",
    next: [{
      subject: "Engine.run",
      note: "Supply the execution-time slot the declaration form cannot carry, or repair the node's arguments.",
    }],
  })

/**
 * The gap that stopped one node's completion: which slot, and which of the
 * four ways it had no value. It travels the completion's error channel and is
 * caught by the run, which turns it into the outcome's third arm — so it is
 * never a refusal a caller sees, and never an error that swallows the prefix.
 */
interface CompletionGap {
  readonly _tag: "CompletionGap"
  readonly node: bigint
  readonly slot: string
  readonly detail: RunGapDetail
}

const completionGap = (
  node: bigint,
  slot: string,
  detail: RunGapDetail,
): Effect.Effect<never, CompletionGap> =>
  Effect.fail({ _tag: "CompletionGap", node, slot, detail } as const)

const inadmissibleProgram = (fault: string): StructuralRefusal =>
  structuralRefusal({
    kind: "malformed-value",
    law: "A program executes only when its node list satisfies the model's admission relation.",
    path: ["nodes"],
    got: fault,
    expected: "newest-first nodes, every consumption already admitted, every name minted once",
    next: [{
      subject: "Engine.run",
      note: "Build the program through the builder, whose accumulator keeps the admission order.",
    }],
  })

/**
 * The model's own wire spelling for one raw argument. Only the four
 * declaration forms are reachable from a run — the door refuses unlawful
 * atoms before any carriage — and the unlawful arms carry their own tags so
 * totality is visible rather than asserted.
 */
const wireArg = (argument: KernelRawArg): WireValue => {
  switch (argument._tag) {
    case "digestRef":
      return { arg: "digest", id: argument.id, kind: argument.kind }
    case "literal":
      return { arg: "literal", value: argument.value }
    case "hole":
      return { arg: "hole", name: argument.name }
    case "clockNow":
    case "randomSeed":
      return { arg: argument._tag }
    case "secretBytes":
      return { arg: argument._tag, bytes: argument.bytes }
    case "mintedId":
      return { arg: argument._tag, token: argument.token }
    case "functionValue":
      return { arg: argument._tag, code: argument.code }
  }
}

/** The canonical value a run's carriage lands for one payload. */
const wireValueOfPayload = (
  kind: string,
  payload: ReadonlyArray<KernelRawArg>,
): WireValue => ({
  v: 0,
  kind,
  payload: payload.map(wireArg),
})

const fieldsOf = (
  generator: string,
): ReadonlyArray<KernelBuilderField> | undefined =>
  KERNEL_GENERATOR_FIELDS[generator as KernelGenerator]

type CompletedArg =
  | { readonly _tag: "raw"; readonly raw: KernelRawArg }
  | { readonly _tag: "landing"; readonly landing: EngineLanded }
  | { readonly _tag: "missing"; readonly local: bigint }

/**
 * One completed argument: the declaration's reference with dataflow
 * substituted. A consumed local becomes its producer's landing — a literal in
 * value slots, the raw label in reference slots — which is the model's own
 * reading of a value as an opaque identity label.
 */
const completeArg = (
  argument: KernelArgRef,
  landings: ReadonlyMap<bigint, EngineLanded>,
): CompletedArg => {
  switch (argument.arg) {
    case "digest":
      return {
        _tag: "raw",
        raw: { _tag: "digestRef", kind: argument.kind as KernelDeclKind, id: argument.id },
      }
    case "literal":
      return { _tag: "raw", raw: { _tag: "literal", value: argument.value } }
    case "hole":
      return { _tag: "raw", raw: { _tag: "hole", name: argument.name } }
    case "local": {
      const landing = landings.get(argument.name)
      return landing === undefined
        ? { _tag: "missing", local: argument.name }
        : { _tag: "landing", landing }
    }
  }
}

const makeEngine = Effect.fn("Engine.make")(function* (
  seed: EngineSeed,
): Effect.fn.Return<
  EngineService,
  Refusal,
  Catalog | Payloads | Lanes | Cells | Registers
> {
  const catalogService = yield* Catalog
  const payloadsService = yield* Payloads
  const lanesService = yield* Lanes
  const cellsService = yield* Cells
  const registersService = yield* Registers

  const provideStores = <A, E>(
    effect: Effect.Effect<A, E, Catalog | Payloads>,
  ): Effect.Effect<A, E> =>
    effect.pipe(
      Effect.provideService(Catalog, catalogService),
      Effect.provideService(Payloads, payloadsService),
    )

  const seededCatalog: Array<KernelRef> = []
  const seededAddresses = new Map<bigint, Digest>()
  for (const reference of seed.catalog ?? []) {
    const label = yield* kernelIdentity(reference.digest)
    seededCatalog.push({ kind: reference.kind, id: label })
    seededAddresses.set(label, reference.digest)
  }

  const state = yield* Ref.make<EngineState>({
    catalog: seededCatalog,
    addresses: seededAddresses,
    lanes: new Map(),
    cells: new Map(),
    registers: new Map(),
  })
  const verdictHub = yield* PubSub.unbounded<EngineVerdict>()

  /** Judges at the current replica and publishes the verdict as data. */
  const judge = (candidate: KernelCandidateAct): Effect.Effect<KernelVerdict> =>
    Effect.flatMap(Ref.get(state), (current) => {
      const verdict = kernelAdmit(contextOf(current), candidate)
      return Effect.as(PubSub.publish(verdictHub, { candidate, verdict }), verdict)
    })

  const pinsOf = Effect.fn("Engine.pinsOf")(function* (
    pins: ReadonlyArray<EngineRef> | undefined,
  ): Effect.fn.Return<ReadonlyArray<KernelRawArg>, Refusal> {
    const references: Array<KernelRawArg> = []
    for (const pin of pins ?? []) {
      references.push({
        _tag: "digestRef",
        kind: pin.kind,
        id: yield* kernelIdentity(pin.digest),
      })
    }
    return references
  })

  const declareThrough = Effect.fn("Engine.declare")(function* (
    options: DeclareOptions,
  ): Effect.fn.Return<EngineOutcome<DeclaredLanding>, Refusal> {
    const valueDigest = yield* digestOf(options.value)
    const valueLabel = yield* kernelIdentity(valueDigest)
    const writLabel = yield* kernelIdentity(options.writ)
    const pins = yield* pinsOf(options.pins)
    const verdict = yield* judge({
      _tag: "declare",
      kind: options.kind,
      payload: [...pins, { _tag: "literal", value: valueLabel }],
      writ: writLabel,
    })
    if (verdict.verdict === "refused") return { _tag: "refused", refusal: rowOf(verdict) }
    const stored = yield* catalogService.put(options.value)
    const label = yield* kernelIdentity(stored)
    yield* Ref.update(state, (current) =>
      grown(current, { kind: options.kind, id: label }, stored))
    return {
      _tag: "carried",
      act: verdict.act,
      encoded: verdict.encoded,
      landed: { digest: stored, label },
    }
  })

  const emitThrough = Effect.fn("Engine.emit")(function* (
    options: EngineEmitOptions,
  ): Effect.fn.Return<EngineOutcome<EmittedEvent>, Refusal> {
    const laneLabel = yield* kernelIdentity(options.lane)
    const bodyDigest = yield* digestOf(options.event)
    const bodyLabel = yield* kernelIdentity(bodyDigest)
    const pins = yield* pinsOf(options.pins)
    const verdict = yield* judge({
      _tag: "emit",
      lane: laneLabel,
      body: [...pins, { _tag: "literal", value: bodyLabel }],
    })
    if (verdict.verdict === "refused") return { _tag: "refused", refusal: rowOf(verdict) }
    const bindings = yield* Ref.get(state)
    const binding = bindings.lanes.get(laneLabel)
    if (binding === undefined) return yield* unboundCarrier("emit", options.lane)
    const landed = yield* lanesService.emit(binding.lane, options.event as never, {
      holder: options.holder,
      pins: (options.pins ?? []).map((pin) => pin.digest),
    })
    return { _tag: "carried", act: verdict.act, encoded: verdict.encoded, landed }
  })

  const joinThrough = Effect.fn("Engine.join")(function* (
    options: EngineJoinOptions,
  ): Effect.fn.Return<EngineOutcome<CellState>, Refusal> {
    const cellLabel = yield* kernelIdentity(options.cell)
    const bindings = yield* Ref.get(state)
    const binding = bindings.cells.get(cellLabel)
    if (binding === undefined) return yield* unboundCarrier("join", options.cell)
    const deltaDigest = yield* digestOf(options.delta as unknown as WireValue)
    const deltaLabel = yield* kernelIdentity(deltaDigest)
    const verdict = yield* judge({
      _tag: "join",
      cell: cellLabel,
      contribution: [{ _tag: "literal", value: deltaLabel }],
      strategy: { _tag: "declaredAlgebra", algebra: binding.algebra },
    })
    if (verdict.verdict === "refused") return { _tag: "refused", refusal: rowOf(verdict) }
    const landed = yield* cellsService.merge(binding.cell, options.delta)
    return { _tag: "carried", act: verdict.act, encoded: verdict.encoded, landed }
  })

  const decideThrough = Effect.fn("Engine.decide")(function* (
    options: EngineDecideOptions,
  ): Effect.fn.Return<EngineOutcome<RegisterState>, Refusal> {
    const registerLabel = yield* kernelIdentity(options.register)
    const outcomeDigest = yield* digestOf(options.outcome)
    const outcomeLabel = yield* kernelIdentity(outcomeDigest)
    const verdict = yield* judge({
      _tag: "decide",
      register: registerLabel,
      token: { register: registerLabel, value: BigInt(options.token) },
      outcome: [{ _tag: "literal", value: outcomeLabel }],
    })
    if (verdict.verdict === "refused") return { _tag: "refused", refusal: rowOf(verdict) }
    const bindings = yield* Ref.get(state)
    const binding = bindings.registers.get(registerLabel)
    if (binding === undefined) return yield* unboundCarrier("decide", options.register)
    yield* catalogService.put(options.outcome)
    const landed = yield* registersService.commit(
      binding.work,
      options.token,
      outcomeDigest,
    )
    return { _tag: "carried", act: verdict.act, encoded: verdict.encoded, landed }
  })

  const resolveThrough = Effect.fn("Engine.resolve")(function* (
    options: EngineResolveOptions,
  ): Effect.fn.Return<EngineOutcome<WireValue>, Refusal> {
    const targetLabel = yield* kernelIdentity(options.target)
    const verdict = yield* judge({
      _tag: "resolveDigest",
      kind: options.kind,
      target: targetLabel,
      anchor: undefined,
    })
    if (verdict.verdict === "refused") return { _tag: "refused", refusal: rowOf(verdict) }
    const landed = yield* provideStores(resolveVerified(options.target))
    return { _tag: "carried", act: verdict.act, encoded: verdict.encoded, landed }
  })

  /* ---------------------------------------------------------------- run */

  /**
   * The value-form payload of one node: every wired value-slot argument in
   * the model's field order, dataflow substituted, holes kept — an unfilled
   * hole reaching the door refuses there, with the model's own row.
   */
  const payloadOf = Effect.fn("Engine.payloadOf")(function* (
    node: DeclarationNode,
    landings: ReadonlyMap<bigint, EngineLanded>,
  ): Effect.fn.Return<ReadonlyArray<KernelRawArg>, Refusal | CompletionGap> {
    const fields = fieldsOf(node.generator)
    if (fields === undefined) {
      return yield* unspeakableNode(node.name, node.generator, "names no generator of the model")
    }
    const payload: Array<KernelRawArg> = []
    for (const field of fields) {
      if (field.form.form !== "value") continue
      const wired = node.args[field.name]
      if (wired === undefined) continue
      const completed = completeArg(wired, landings)
      switch (completed._tag) {
        case "raw":
          payload.push(completed.raw)
          break
        case "landing":
          payload.push({ _tag: "literal", value: completed.landing.label })
          break
        case "missing":
          return yield* completionGap(node.name, field.name, "unlanded")
      }
    }
    return payload
  })

  /** One reference-slot argument, completed to an identity label and brand. */
  const referenceAt = Effect.fn("Engine.referenceAt")(function* (
    node: DeclarationNode,
    field: KernelBuilderField | undefined,
    landings: ReadonlyMap<bigint, EngineLanded>,
  ): Effect.fn.Return<
    { readonly id: bigint; readonly kind: KernelDeclKind | null } | undefined,
    Refusal | CompletionGap
  > {
    if (field === undefined) return undefined
    const wired = node.args[field.name]
    if (wired === undefined) return undefined
    const completed = completeArg(wired, landings)
    switch (completed._tag) {
      case "missing":
        return yield* completionGap(node.name, field.name, "unlanded")
      case "landing":
        return { id: completed.landing.label, kind: completed.landing.kind }
      case "raw":
        switch (completed.raw._tag) {
          case "digestRef":
            return { id: completed.raw.id, kind: completed.raw.kind }
          case "literal":
            return { id: completed.raw.value, kind: null }
          default:
            return yield* completionGap(node.name, field.name, "unbranded")
        }
    }
  })

  /**
   * Completes one node to a candidate sentence, or names the gap that stopped
   * it. Four provenances and no fifth: declaration bytes, dataflow landings,
   * the run's supplies, and the engine's own bindings (a join's strategy is
   * the declared cell's merge algebra). Where a slot the generator requires
   * has no value from any of them, the completion answers with the gap — the
   * slot, and which of the four ways it had none — rather than handing an
   * absent field to the decoder, so the run can report WHERE a program the
   * admission relation accepts stopped being executable. Everything that does
   * complete is still constrained-decoded through the generated candidate
   * schema — the one parse boundary — so a shape no candidate slot carries
   * refuses structurally, never silently.
   */
  const completeNode = Effect.fn("Engine.completeNode")(function* (
    node: DeclarationNode,
    options: RunOptions,
    writLabel: bigint,
    landings: ReadonlyMap<bigint, EngineLanded>,
  ): Effect.fn.Return<KernelCandidateAct, Refusal | CompletionGap> {
    const fields = fieldsOf(node.generator)
    if (fields === undefined) {
      return yield* unspeakableNode(node.name, node.generator, "names no generator of the model")
    }
    const supplies = options.supplies ?? {}
    const payload = yield* payloadOf(node, landings)
    const digestField = (kind: KernelDeclKind): KernelBuilderField | undefined =>
      fields.find((field) => field.form.form === "digest" && field.form.kind === kind)
    const raw: Record<string, unknown> = { _tag: node.generator }
    switch (node.generator) {
      case "declare": {
        // The declaration's own writ argument is the sentence's authority when
        // wired; the run's writ answers only for nodes that carry none.
        const writ = yield* referenceAt(node, digestField("policy"), landings)
        const kind = supplies.kinds?.get(node.name)
        if (kind === undefined) return yield* completionGap(node.name, "kind", "unsupplied")
        raw["kind"] = kind
        raw["payload"] = payload
        raw["writ"] = writ?.id ?? writLabel
        break
      }
      case "resolve": {
        const targetField = fields.find((field) => field.form.form === "digestOf")
        const target = yield* referenceAt(node, targetField, landings)
        if (target === undefined) return yield* completionGap(node.name, "target", "unwired")
        if (target.kind === null) return yield* completionGap(node.name, "kind", "unbranded")
        raw["_tag"] = "resolveDigest"
        raw["kind"] = target.kind
        raw["target"] = target.id
        raw["anchor"] = undefined
        break
      }
      case "emit": {
        const lane = yield* referenceAt(node, digestField("lane"), landings)
        if (lane === undefined) return yield* completionGap(node.name, "lane", "unwired")
        raw["lane"] = lane.id
        raw["body"] = payload
        break
      }
      case "join": {
        const cell = yield* referenceAt(node, digestField("resource"), landings)
        if (cell === undefined) return yield* completionGap(node.name, "cell", "unwired")
        const bindings = yield* Ref.get(state)
        const binding = bindings.cells.get(cell.id)
        if (binding === undefined) {
          return yield* completionGap(node.name, "strategy", "unsupplied")
        }
        raw["cell"] = cell.id
        raw["contribution"] = payload
        raw["strategy"] = { _tag: "declaredAlgebra", algebra: binding.algebra }
        break
      }
      case "fold": {
        const declared = yield* referenceAt(node, digestField("index"), landings)
        if (declared === undefined) {
          return yield* completionGap(node.name, "declared", "unwired")
        }
        raw["declared"] = declared.id
        raw["anchor"] = supplies.anchors?.get(node.name)
        raw["query"] = payload
        break
      }
      case "decide": {
        const register = yield* referenceAt(node, digestField("program"), landings)
        if (register === undefined) {
          return yield* completionGap(node.name, "register", "unwired")
        }
        raw["register"] = register.id
        raw["token"] = supplies.tokens?.get(node.name)
        raw["outcome"] = payload
        break
      }
      case "trigger": {
        const declaration = yield* referenceAt(node, digestField("program"), landings)
        if (declaration === undefined) {
          return yield* completionGap(node.name, "declaration", "unwired")
        }
        const predicate = supplies.predicates?.get(node.name)
        if (predicate === undefined) {
          return yield* completionGap(node.name, "predicate", "unsupplied")
        }
        raw["predicate"] = predicate
        raw["declaration"] = declaration.id
        break
      }
      case "spawn": {
        const policyFields = fields.filter((field) =>
          field.form.form === "digest" && field.form.kind === "policy"
        )
        const parent = yield* referenceAt(node, policyFields[0], landings)
        if (parent === undefined) return yield* completionGap(node.name, "parent", "unwired")
        const request = yield* referenceAt(node, policyFields[1], landings)
        if (request === undefined) return yield* completionGap(node.name, "request", "unwired")
        raw["parent"] = parent.id
        raw["request"] = request.id
        break
      }
      default:
        return yield* unspeakableNode(node.name, node.generator, "names no generator of the model")
    }
    return yield* decodeRefusing(Candidate)(raw)
  })

  /**
   * Carries one admitted act and reports what landed. Trigger and spawn land
   * nothing — the model interprets both as world-identity — and a fold lands
   * the state label its anchor names, with no address.
   */
  const carryNode = Effect.fn("Engine.carryNode")(function* (
    node: DeclarationNode,
    act: KernelAct,
    candidate: KernelCandidateAct,
    options: RunOptions,
  ): Effect.fn.Return<EngineLanded | null, Refusal> {
    switch (act._tag) {
      case "declare": {
        if (candidate._tag !== "declare") {
          return yield* unspeakableNode(node.name, act._tag, "verdict and candidate disagree")
        }
        const value = wireValueOfPayload(candidate.kind, candidate.payload)
        const stored = yield* catalogService.put(value)
        const label = yield* kernelIdentity(stored)
        yield* Ref.update(state, (current) =>
          grown(current, { kind: candidate.kind, id: label }, stored))
        return { label, kind: candidate.kind, digest: stored }
      }
      case "resolve": {
        const bindings = yield* Ref.get(state)
        const address = bindings.addresses.get(act.target.id)
        if (address === undefined) {
          return yield* unboundCarrier("resolve", String(act.target.id))
        }
        yield* provideStores(resolveVerified(address))
        return { label: act.target.id, kind: act.kind, digest: address }
      }
      case "emit": {
        if (candidate._tag !== "emit") {
          return yield* unspeakableNode(node.name, act._tag, "verdict and candidate disagree")
        }
        const bindings = yield* Ref.get(state)
        const binding = bindings.lanes.get(act.lane.id)
        if (binding === undefined) {
          return yield* unboundCarrier("emit", String(act.lane.id))
        }
        const event = wireValueOfPayload("emitted", candidate.body)
        const landed = yield* lanesService.emit(binding.lane, event as never, {
          holder: options.holder,
        })
        const label = yield* kernelIdentity(landed.digest)
        return { label, kind: null, digest: landed.digest }
      }
      case "join": {
        if (candidate._tag !== "join") {
          return yield* unspeakableNode(node.name, act._tag, "verdict and candidate disagree")
        }
        const bindings = yield* Ref.get(state)
        const binding = bindings.cells.get(act.cell.id)
        if (binding === undefined) {
          return yield* unboundCarrier("join", String(act.cell.id))
        }
        const landed = yield* cellsService.merge(binding.cell, [{
          holder: options.holder,
          value: wireValueOfPayload("contribution", candidate.contribution),
        }])
        const label = yield* kernelIdentity(landed.digest)
        return { label, kind: null, digest: landed.digest }
      }
      case "decide": {
        if (candidate._tag !== "decide") {
          return yield* unspeakableNode(node.name, act._tag, "verdict and candidate disagree")
        }
        const bindings = yield* Ref.get(state)
        const binding = bindings.registers.get(act.register.id)
        if (binding === undefined) {
          return yield* unboundCarrier("decide", String(act.register.id))
        }
        const outcome = wireValueOfPayload("outcome", candidate.outcome)
        const stored = yield* catalogService.put(outcome)
        yield* registersService.commit(binding.work, Number(act.token.value), stored)
        const label = yield* kernelIdentity(stored)
        return { label, kind: null, digest: stored }
      }
      case "fold":
        return { label: act.anchor.state.value, kind: null, digest: null }
      case "trigger":
      case "spawn":
        return null
    }
  })

  const runProgram = Effect.fn("Engine.run")(function* (
    program: KernelProgram<never> | KernelProgramDeclaration,
    options: RunOptions,
  ): Effect.fn.Return<RunOutcome, Refusal> {
    const declaration = "declaration" in program ? program.declaration : program
    const fault = admissionFault(erase(declaration))
    if (fault !== null) return yield* inadmissibleProgram(fault)
    if (declaration.nodes.length === 0) {
      return yield* inadmissibleProgram("the declaration carries no node")
    }
    const writLabel = yield* kernelIdentity(options.writ)
    const landings = new Map<bigint, EngineLanded>()
    const steps: Array<RunStep> = []
    let terminal: EngineLanded | null = null
    // Execution order is admission order read back: oldest node first.
    for (const node of [...declaration.nodes].reverse()) {
      // A completion that cannot answer ends the run HERE, with the steps that
      // already stood standing (operator ruling, 2026-08-19): the admissions
      // before this node are what happened, and none of them depended on it.
      const completed = yield* Effect.result(
        completeNode(node, options, writLabel, landings),
      )
      if (Result.isFailure(completed)) {
        const stopped = completed.failure
        if (stopped._tag !== "CompletionGap") return yield* stopped
        return {
          _tag: "unspeakable",
          node: stopped.node,
          slot: stopped.slot,
          detail: stopped.detail,
          steps,
        }
      }
      const candidate = completed.success
      const verdict = yield* judge(candidate)
      if (verdict.verdict === "refused") {
        return { _tag: "refused", node: node.name, refusal: rowOf(verdict), steps }
      }
      const landed = yield* carryNode(node, verdict.act, candidate, options)
      if (landed !== null) landings.set(node.name, landed)
      steps.push({ node: node.name, encoded: verdict.encoded, landed })
      terminal = landed
    }
    return { _tag: "landed", steps, landed: terminal }
  })

  return {
    admit: kernelAdmit,
    context: Effect.map(Ref.get(state), contextOf),
    offer: judge,
    verdicts: Stream.fromPubSub(verdictHub),
    declare: declareThrough,
    declareLane: Effect.fn("Engine.declareLane")(function* <
      Event,
      const Partitions extends number,
    >(
      options: DeclareLaneOptions<Event, Partitions>,
    ): Effect.fn.Return<EngineOutcome<DeclaredLanding>, Refusal> {
      const outcome = yield* declareThrough({
        kind: "lane",
        value: options.lane.declaration as unknown as WireValue,
        writ: options.writ,
      })
      if (outcome._tag === "carried") {
        yield* Ref.update(state, (current) => ({
          ...current,
          lanes: new Map(current.lanes).set(outcome.landed.label, {
            lane: options.lane as unknown as DeclaredLane<never, number>,
            digest: outcome.landed.digest,
          }),
        }))
      }
      return outcome
    }),
    declareCell: Effect.fn("Engine.declareCell")(function* (
      options: DeclareCellOptions,
    ): Effect.fn.Return<EngineOutcome<DeclaredLanding>, Refusal> {
      const algebraLabel = yield* kernelIdentity(options.algebra)
      const outcome = yield* declareThrough({
        kind: "resource",
        value: { v: 0, kind: "cell", cell: options.cell, algebra: options.algebra },
        writ: options.writ,
        pins: [{ kind: "algebra", digest: options.algebra }],
      })
      if (outcome._tag === "carried") {
        yield* Ref.update(state, (current) => ({
          ...current,
          cells: new Map(current.cells).set(outcome.landed.label, {
            cell: options.cell,
            algebra: algebraLabel,
            digest: outcome.landed.digest,
          }),
        }))
      }
      return outcome
    }),
    declareRegister: Effect.fn("Engine.declareRegister")(function* (
      options: DeclareRegisterOptions,
    ): Effect.fn.Return<EngineOutcome<DeclaredLanding>, Refusal> {
      const outcome = yield* declareThrough({
        kind: "program",
        value: { v: 0, kind: "work", work: options.work },
        writ: options.writ,
      })
      if (outcome._tag === "carried") {
        yield* Ref.update(state, (current) => ({
          ...current,
          registers: new Map(current.registers).set(outcome.landed.label, {
            work: options.work,
            digest: outcome.landed.digest,
          }),
        }))
      }
      return outcome
    }),
    emit: emitThrough,
    join: joinThrough,
    decide: decideThrough,
    resolve: resolveThrough,
    run: runProgram,
  }
})

/**
 * The one language-speaking service: judgment through the kernel door,
 * carriage through the plane services, configuration by declaration.
 *
 * There is no fixture engine and no test layer, because judgment cannot be
 * replaced: a test configuration is this same layer over fixture carriers.
 */
export class Engine extends Context.Service<Engine, EngineService>()(
  "@foldlab/plait/Engine",
) {
  /** The kernel's one candidate-judgment function; the engine adds none. */
  static readonly admit = kernelAdmit

  /** Builds the engine over whatever carrier layers the caller provides. */
  static readonly layer = (
    seed: EngineSeed = {},
  ): Layer.Layer<Engine, Refusal, Catalog | Payloads | Lanes | Cells | Registers> =>
    Layer.effect(Engine, makeEngine(seed))
}

/** Judges one candidate at the engine's current context; judgment only. */
export const offer = Effect.fn("Engine.offer")(function* (
  candidate: KernelCandidateAct,
): Effect.fn.Return<KernelVerdict, never, Engine> {
  const engine = yield* Engine
  return yield* engine.offer(candidate)
})

/** Declares one value through the door and catalogs it when admitted. */
export const declare = Effect.fn("Engine.declare")(function* (
  options: DeclareOptions,
): Effect.fn.Return<EngineOutcome<DeclaredLanding>, Refusal, Engine> {
  const engine = yield* Engine
  return yield* engine.declare(options)
})

/** Emits one judged event onto a declared lane's carrier. */
export const emit = Effect.fn("Engine.emit")(function* (
  options: EngineEmitOptions,
): Effect.fn.Return<EngineOutcome<EmittedEvent>, Refusal, Engine> {
  const engine = yield* Engine
  return yield* engine.emit(options)
})

/** Joins one judged delta into a declared cell's carrier. */
export const join = Effect.fn("Engine.join")(function* (
  options: EngineJoinOptions,
): Effect.fn.Return<EngineOutcome<CellState>, Refusal, Engine> {
  const engine = yield* Engine
  return yield* engine.join(options)
})

/** Lands one judged, fenced outcome at a declared register's carrier. */
export const decide = Effect.fn("Engine.decide")(function* (
  options: EngineDecideOptions,
): Effect.fn.Return<EngineOutcome<RegisterState>, Refusal, Engine> {
  const engine = yield* Engine
  return yield* engine.decide(options)
})

/** Resolves one judged reference through the verify-on-read seam. */
export const resolve = Effect.fn("Engine.resolve")(function* (
  options: EngineResolveOptions,
): Effect.fn.Return<EngineOutcome<WireValue>, Refusal, Engine> {
  const engine = yield* Engine
  return yield* engine.resolve(options)
})

/** Runs one closed program: per node, complete, judge, carry, bind. */
export const run = Effect.fn("Engine.run")(function* (
  program: KernelProgram<never> | KernelProgramDeclaration,
  options: RunOptions,
): Effect.fn.Return<RunOutcome, Refusal, Engine> {
  const engine = yield* Engine
  return yield* engine.run(program, options)
})
