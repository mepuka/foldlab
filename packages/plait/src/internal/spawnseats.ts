/**
 * Plane: internal — private adapters, housed flat.
 * Seam: carriage — hosts and transport clients.
 *
 * @module
 */
import { Effect, Match, Ref, Scope, Stream } from "effect"

import type { WireValue } from "../truth/Canonical.js"
import type { Digest } from "../truth/Digest.js"
import { structuralRefusal, type Refusal } from "../truth/Refusal.js"
import { decodeAct } from "../kernel/KernelDoor.js"
import { kernelIdentity } from "../kernel/KernelIdentity.js"
import type { Holder } from "../kernel/Wire.js"
import type { KernelProgramDeclaration } from "../kernel/KernelCorpusSchemas.js"
import type { KernelProgram } from "../kernel/KernelProgram.js"
import type { KernelRefusalRow } from "../kernel/KernelTables.generated.js"
import { LaneReads, type EmittedEvent, type LandedFact } from "../planes/Lane.js"
import {
  Engine,
  type DeclaredLanding,
  type EngineOutcome,
  type RunSupplies,
} from "../carriage/Engine.js"
import { matchTraceLanding, runTraced, type TracedRun } from "../carriage/RunTrace.js"
import { runTraceLane, type RunTraceFact, type RunTraceStep } from "./runtraces.js"
import {
  SPAWN_SEAT_OPENED,
  SPAWN_SEAT_RETIRED,
  seatName,
  spawnSeatLane,
  type SeatOpened,
  type SeatRetired,
} from "./seats.js"

/**
 * The spawn consumer: admitted spawns become seats under the writs they
 * requested.
 *
 * ## What this consumer is, and what it is not
 *
 * It is CARRIAGE. The spawn it reads was judged at the one door before it ever
 * landed, so nothing here judges, constructs a verdict, or re-asks a question
 * the door already answered: this consumer reads what stood and builds what the
 * sentence called for. The one thing it decides is whether it holds a charter
 * for the requested policy, and that is not a judgment — it is the same absence
 * the engine reports when an admitted act names a carrier no declaration bound.
 *
 * ## Where an admitted spawn is legible
 *
 * The kernel's spawn LANDS NOTHING: the model interprets it as world-identity,
 * so a spawn enters no landing a later node could consume and there is no
 * spawn-shaped value anywhere to read. What does exist is the run's trace — one
 * fact per run, carrying every admitted sentence's canonical encoding in the
 * order the engine walked them — so an admitted spawn is legible exactly where
 * every other admitted sentence is: as a step of a landed trace. That is why
 * this consumer folds the run-trace lane and declares no lane of its own for
 * announcing spawns. A lane that announced them would be the per-step landing
 * the trace's own law refuses, and it would say a second time what the trace
 * already says.
 *
 * The step is read back through the DOOR'S OWN decode. The framing of an
 * intrinsic sentence is the door's, and reading a tag position by hand here
 * would be a second statement of the act grammar standing beside the generated
 * one. What comes back is a decoded sentence and not a verdict: decoding is not
 * judging, and this module could not admit anything if it tried.
 *
 * ## A refused spawn brings up nothing, by construction
 *
 * A run stops at its first refusing node, and the refused node is NOT among the
 * steps the trace keeps — every arm keeps the prefix that STOOD. So a refused
 * spawn has no step, this consumer sights nothing, and no carriage is
 * performed. The property is structural rather than a check written here, which
 * is why the wall reads it off a recorder outside this module instead of off an
 * assertion inside it.
 *
 * ## One spawn is one seat
 *
 * A seat is named by the coordinate its spawn was sighted at — the landed trace
 * fact's identity and the node the spawn stood at — so the name is a function
 * of what landed. A redelivered trace, a second consumer, and a restart all
 * compute the same name, and the bring-up is fenced on it. The fence has two
 * halves answering different questions: an atomic claim in this consumer's own
 * state absorbs a duplicate within its life, and the seat lane's own opening
 * facts seed that state when a consumer starts, so a restart absorbs what the
 * record already shows. The seeding is a REPLICA in the cell-replica sense — a
 * lower bound taken through a bounded tail, never an oracle — and past that
 * bound a restarted consumer may bring a seat up again. The bound is stated
 * rather than papered over: an exclusive claim across every consumer that ever
 * ran is a fenced register round, and it is not this slice's.
 *
 * ## What a seat is
 *
 * One scope, one writ, one run. The scope is forked from this consumer's, so a
 * seat's resources are the seat's and every live seat dies when its consumer
 * does; this slice's seat acquires nothing in it, and the scope exists so that
 * whatever a later seat holds — its own connection, its own completion — has a
 * home that closes with the seat rather than with the process. The writ is the
 * policy the spawn REQUESTED, reached by the charter that policy's own identity
 * label selects, so a seat cannot speak under a policy its spawn did not name.
 * The run is one traced program run: the same engine, the same door, the same
 * three ways to end, and the same one fact per run.
 *
 * ## A seat ends by landing, never by going quiet
 *
 * A seat's retirement is a fact it lands after its run reached an outcome, and
 * it names where the run's trace went. Nothing infers retirement from silence:
 * a holder that dies mid-seat leaves an opening fact and no retirement, which
 * is exactly what a dead seat looks like, and a finalizer that landed a
 * retirement on interruption would forge the one fact this posture exists to
 * protect. The retirement is therefore written on the ordinary path only.
 *
 * ## Pacing is the caller's
 *
 * The fold is sequential: one seat at a time, in the order the lane delivered
 * the traces. A seat that runs long delays the next, and the answer to that is
 * more consumers over more partitions rather than concurrency inside one fold,
 * because two seats brought up concurrently would race the claim that makes one
 * spawn one seat.
 */

/**
 * What this consumer knows how to bring up: one seat shape per spawnable
 * policy.
 *
 * A charter is a DECLARATION of capability and never a guard. It does not
 * license a spawn — the door already admitted the one that was said — and its
 * absence refuses nobody: a spawn whose requested policy no charter names
 * reaches a consumer that cannot name what it would run, which is an absence
 * and is reported as one.
 */
export interface SeatCharter {
  /** The policy a seat under this charter speaks, named by its digest. */
  readonly writ: Digest
  /** Attribution carried on every fact the seat lands. */
  readonly holder: Holder
  /** The one program a seat runs, under the writ above. */
  readonly program: KernelProgram<never> | KernelProgramDeclaration
  /** Execution-time supplies for that program, bound by node name. */
  readonly supplies?: RunSupplies
}

/** What one consumer needs in order to bring seats up. */
export interface SpawnSeatTerms {
  /**
   * The address the run-trace lane was declared at, through the same engine.
   *
   * It is both what this consumer folds and where a seat's own run writes its
   * trace, and that is one lane on purpose: a seat's run is a run like any
   * other, and giving it a private trace lane would split one record in two.
   */
  readonly traceLane: Digest
  /** The address the seat lane was declared at, through the same engine. */
  readonly seatLane: Digest
  /** The seats this consumer holds a charter for. */
  readonly charters: ReadonlyArray<SeatCharter>
}

/** One admitted spawn, as a landed trace shows it. */
export interface SpawnSighting {
  /** The seat this spawn names: the digest of its own coordinate. */
  readonly seat: Digest
  /** The landed trace fact that carried the spawn. */
  readonly trace: Digest
  /** The program node the spawn stood at, exactly as the trace writes it. */
  readonly node: string
  /** The parent policy's identity label, written exactly. */
  readonly parent: string
  /** The requested policy's identity label, written exactly. */
  readonly request: string
}

/** One seat brought up: its writ, its opening, its run, and its retirement. */
export interface SeatRun {
  /** The seat's name. */
  readonly seat: Digest
  /** The policy the spawn requested and this seat speaks under. */
  readonly writ: Digest
  /** Who every fact this seat landed is attributed to. */
  readonly holder: Holder
  /** Where the opening fact landed; the seat's first landed act. */
  readonly opened: EmittedEvent
  /** The seat's one run, its trace, and what became of landing it. */
  readonly run: TracedRun
  /**
   * What became of the retirement fact.
   *
   * A refused retirement leaves a seat that ran and did not retire, which is a
   * true statement about this estate and is handed back rather than thrown
   * away — the run happened either way.
   */
  readonly retired: EngineOutcome<EmittedEvent>
}

/**
 * What one sighted spawn produced.
 *
 * Four arms and no fifth, because there are four honest answers: the seat came
 * up, this consumer had already answered that spawn, no charter names the
 * policy the spawn requested, or the door refused the fact that would have
 * announced the seat. The last arm carries the generated table's own row,
 * passed through; nothing here mints one. A refusal on the SEAM — a substrate
 * that is not answering, a fact past the payload budget — is a different
 * register and travels the error channel, exactly as it does at every other
 * seam in this package.
 */
export type SeatBringUp =
  | {
    readonly _tag: "opened"
    readonly seat: SeatRun
  }
  | {
    readonly _tag: "absorbed"
    /** The seat this consumer had already brought up. */
    readonly seat: Digest
  }
  | {
    readonly _tag: "unchartered"
    readonly seat: Digest
    /** The requested policy's identity label, written exactly. */
    readonly request: string
  }
  | {
    readonly _tag: "unopened"
    readonly seat: Digest
    /** The door's taught row, passed through; nothing here constructs one. */
    readonly refusal: KernelRefusalRow
  }

/** The arm where a seat came up and ran. */
type BroughtUp = Extract<SeatBringUp, { readonly _tag: "opened" }>

/** The arm where the spawn had already been answered. */
type Absorbed = Extract<SeatBringUp, { readonly _tag: "absorbed" }>

/** The arm where no charter names the requested policy. */
type Unchartered = Extract<SeatBringUp, { readonly _tag: "unchartered" }>

/** The arm where the door refused the opening fact. */
type Unopened = Extract<SeatBringUp, { readonly _tag: "unopened" }>

/**
 * Folds one bring-up over its four arms.
 *
 * **Bounds.** A fold over what this consumer did with one spawn says nothing
 * about the spawn: every arm is downstream of an admission that already
 * happened, and none of them can unmake it.
 *
 * @example
 * ```ts
 * const named = matchSeatBringUp({
 *   opened: (brought) => brought.seat.seat,
 *   absorbed: (already) => already.seat,
 *   unchartered: (missing) => missing.seat,
 *   unopened: (refused) => refused.seat,
 * })
 * ```
 */
export const matchSeatBringUp: <Out>(cases: {
  readonly opened: (brought: BroughtUp) => Out
  readonly absorbed: (already: Absorbed) => Out
  readonly unchartered: (missing: Unchartered) => Out
  readonly unopened: (refused: Unopened) => Out
}) => (brought: SeatBringUp) => Out = <Out>(cases: {
  readonly opened: (brought: BroughtUp) => Out
  readonly absorbed: (already: Absorbed) => Out
  readonly unchartered: (missing: Unchartered) => Out
  readonly unopened: (refused: Unopened) => Out
}): ((brought: SeatBringUp) => Out) =>
  // The same narrowing the engine's folds state: the pin's matcher answers
  // `Unify<Out>`, which reduces at every real application and cannot reduce
  // over a type parameter no call site has resolved.
  Match.type<SeatBringUp>().pipe(Match.tagsExhaustive(cases)) as (
    brought: SeatBringUp,
  ) => Out

/** The standing consumer: one fold over trace facts, three ways to drive it. */
export interface SpawnSeats {
  /**
   * Brings up a seat for every admitted spawn the source carries, in arrival
   * order, and answers with what each sighting produced.
   *
   * Exposed on its own so the fold can be exercised over a source a caller
   * constructs: the sighting, the fence, the charter selection, and a seat's
   * whole life are properties of this function, and only the live read is
   * missing from a caller that drives it directly.
   */
  readonly consume: (
    source: Stream.Stream<LandedFact<RunTraceFact>, Refusal>,
  ) => Effect.Effect<ReadonlyArray<SeatBringUp>, Refusal>
  /**
   * One pass over the run-trace lane's own bounded tail.
   *
   * The catch-up read and the recovery read are the same read, because the live
   * continuation delivers only what arrives after it subscribes: a consumer
   * that missed a trace reads the tail, exactly as the lane read seam's own
   * taught repair says.
   */
  readonly sweep: Effect.Effect<ReadonlyArray<SeatBringUp>, Refusal>
  /**
   * The standing consumer: the run-trace lane's live continuation, folded to
   * exhaustion.
   *
   * Nothing is collected — the record of what this consumer did is the seat
   * lane and not a buffer in this process — so a consumer may stand for as long
   * as its scope does.
   */
  readonly run: Effect.Effect<void, Refusal>
  /**
   * The seats this consumer holds as brought up.
   *
   * A lower bound in the cell-replica sense: it opens at whatever the seat
   * lane's bounded tail showed and grows with this consumer's own bring-ups,
   * seeded rows first. It is never an oracle, and nothing infers from its
   * silence that a seat does not exist. A spawn this consumer sighted and could
   * not charter is deliberately absent — nothing was brought up, so nothing is
   * held, and the same spawn delivered again is answered the same way.
   */
  readonly seats: Effect.Effect<ReadonlyArray<Digest>>
}

/** The exact-decimal grammar the trace writes every unbounded natural in. */
const EXACT_DECIMAL = /^(0|[1-9][0-9]*)$/

/**
 * One step's encoding as unbounded naturals, or nothing when a member is not
 * the exact decimal the trace's own law says it is.
 */
const naturalsOf = (step: RunTraceStep): ReadonlyArray<bigint> | undefined => {
  const atoms: Array<bigint> = []
  for (const atom of step.encoded) {
    if (!EXACT_DECIMAL.test(atom)) return undefined
    atoms.push(BigInt(atom))
  }
  return atoms
}

const unreadableStep = (node: string, got: string): Refusal =>
  structuralRefusal({
    kind: "malformed-value",
    law:
      "A trace step carries one admitted sentence's canonical encoding, which the door reads back as a vector of unbounded naturals.",
    path: ["steps", node, "encoded"],
    got,
    expected: "the exact decimal of every atom of one intrinsic sentence's framing",
    next: [{
      subject: "SpawnSeats.consume",
      note:
        "Fold traces the engine wrote; a step whose encoding the door cannot read is not a sentence this estate said, and guessing past it would read a spawn out of an unknown word.",
    }],
  })

const twoCharters = (writ: Digest): Refusal =>
  structuralRefusal({
    kind: "ambiguous-binding",
    law: "One policy carries at most one seat charter, because a seat's writ is what selects what it runs.",
    path: ["charters", writ],
    got: "two charters name one policy",
    expected: "one charter per policy",
    next: [{
      subject: "SpawnSeats.attach",
      note:
        "Declare one charter per policy; a seat that could run either of two programs under one writ has no reading that a spawn chose.",
    }],
  })

/**
 * Every admitted spawn one landed trace shows, in the order the run walked
 * them.
 *
 * Exposed so the sighting can be exercised over facts a caller constructs. It
 * reads the steps and nothing else: the arm a run ended on does not change what
 * stood, and the refused node of a refused run is not a step, so a refused
 * spawn is invisible here by construction rather than by a filter.
 */
export const spawnsIn = Effect.fn("SpawnSeats.spawnsIn")(function* (
  fact: LandedFact<RunTraceFact>,
): Effect.fn.Return<ReadonlyArray<SpawnSighting>, Refusal> {
  const sighted: Array<SpawnSighting> = []
  for (const step of fact.event.steps) {
    const atoms = naturalsOf(step)
    if (atoms === undefined) {
      return yield* unreadableStep(step.node, step.encoded.join(","))
    }
    const act = decodeAct(atoms)
    if (act === undefined) {
      return yield* unreadableStep(step.node, step.encoded.join(","))
    }
    if (act._tag !== "spawn") continue
    sighted.push({
      seat: yield* seatName(fact.digest, step.node),
      trace: fact.digest,
      node: step.node,
      parent: String(act.parent.id),
      request: String(act.request.id),
    })
  }
  return sighted
})

/**
 * Declares the seat lane through the door and binds its carrier.
 *
 * The engine has no registration surface beside the language, so a lane becomes
 * usable by being declared — this is that sentence, spoken once per engine,
 * under the writ the caller acts by. The address it lands at is what a
 * consumer's terms name as its seat lane.
 */
export const declareSeatLane = Effect.fn("SpawnSeats.declareSeatLane")(function* (
  writ: Digest,
): Effect.fn.Return<EngineOutcome<DeclaredLanding>, Refusal, Engine> {
  const engine = yield* Engine
  const lane = yield* spawnSeatLane()
  return yield* engine.declareLane({ lane, writ })
})

/**
 * Attaches one standing spawn consumer to the calling scope.
 *
 * Every seat it brings up forks a child of that scope, so closing the consumer
 * closes every seat still running under it. The consumer itself is Scope-owned
 * for the same reason the status pump is: a standing consumer built anywhere
 * but at a scope is a consumer nothing takes down.
 */
export const attachSpawnSeats = Effect.fn("SpawnSeats.attach")(function* (
  terms: SpawnSeatTerms,
): Effect.fn.Return<SpawnSeats, Refusal, Engine | LaneReads | Scope.Scope> {
  const engine = yield* Engine
  const reads = yield* LaneReads
  const owner = yield* Scope.Scope
  const traceLane = yield* runTraceLane()
  const seatLane = yield* spawnSeatLane()

  // The charter index is a FORWARD translation, remembered: a policy's digest
  // is run through the guarded identity seam once, here, and the label it
  // produces is what a sighted spawn is matched against. Nothing inverts a
  // label, which is the same discipline the engine keeps over its own
  // addresses — a label nobody translated names nothing this consumer holds.
  const chartered = new Map<bigint, SeatCharter>()
  for (const charter of terms.charters) {
    const label = yield* kernelIdentity(charter.writ)
    if (chartered.has(label)) return yield* twoCharters(charter.writ)
    chartered.set(label, charter)
  }

  const shown = yield* reads.tail(seatLane)
  const answered = yield* Ref.make<ReadonlySet<Digest>>(
    new Set(
      shown
        .filter((row) => row.event.kind === SPAWN_SEAT_OPENED)
        .map((row) => row.event.seat),
    ),
  )

  /** Claims one seat, atomically. `false` means this consumer already had it. */
  const claim = (seat: Digest): Effect.Effect<boolean> =>
    Ref.modify(answered, (held) =>
      held.has(seat)
        ? [false, held] as const
        : [true, new Set(held).add(seat) as ReadonlySet<Digest>] as const)

  const release = (seat: Digest): Effect.Effect<void> =>
    Ref.update(answered, (held) => {
      const next = new Set(held)
      next.delete(seat)
      return next
    })

  const bringUp = Effect.fn("SpawnSeats.bringUp")(function* (
    sighting: SpawnSighting,
  ): Effect.fn.Return<SeatBringUp, Refusal> {
    const charter = chartered.get(BigInt(sighting.request))
    if (charter === undefined) {
      return { _tag: "unchartered", seat: sighting.seat, request: sighting.request }
    }
    if (!(yield* claim(sighting.seat))) return { _tag: "absorbed", seat: sighting.seat }

    // The seat's FIRST landed act, and it carries the writ because that is the
    // whole claim: this seat speaks under the policy its spawn requested.
    const opening: SeatOpened = {
      v: 0,
      kind: SPAWN_SEAT_OPENED,
      seat: sighting.seat,
      writ: charter.writ,
      trace: sighting.trace,
      node: sighting.node,
      request: sighting.request,
    }
    const opened = yield* engine.emit({
      lane: terms.seatLane,
      event: opening as unknown as WireValue,
      holder: charter.holder,
    })
    if (opened._tag === "refused") {
      // A seat whose opening the door refused was never brought up, so its name
      // is not spent: a redelivery after the lane is declared brings it up,
      // which is what at-least-once delivery is for.
      yield* release(sighting.seat)
      return { _tag: "unopened", seat: sighting.seat, refusal: opened.refusal }
    }

    // The seat: its own scope, forked from this consumer's, closed with the
    // exit of the one run it holds — including an interruption, which closes
    // the scope and lands no retirement, because crash is not a fact.
    const seatScope = yield* Scope.fork(owner)
    const run = yield* runTraced(charter.program, {
      writ: charter.writ,
      holder: charter.holder,
      lane: terms.traceLane,
      ...(charter.supplies === undefined ? {} : { supplies: charter.supplies }),
    }).pipe(
      Effect.provideService(Engine, engine),
      Scope.provide(seatScope),
      Effect.onExit((exit) => Scope.close(seatScope, exit)),
    )

    // Where the run's record went is a different question from how the run
    // ended, so the retirement carries both answers rather than one standing
    // in for the other.
    const [landing, trace] = matchTraceLanding<readonly [string, Digest | null]>({
      carried: (carried) => ["carried", carried.emitted.digest] as const,
      refused: () => ["refused", null] as const,
      unlanded: () => ["unlanded", null] as const,
    })(run.landing)
    const retirement: SeatRetired = {
      v: 0,
      kind: SPAWN_SEAT_RETIRED,
      seat: sighting.seat,
      writ: charter.writ,
      outcome: run.outcome._tag,
      landing,
      trace,
    }
    const retired = yield* engine.emit({
      lane: terms.seatLane,
      event: retirement as unknown as WireValue,
      holder: charter.holder,
    })
    return {
      _tag: "opened",
      seat: {
        seat: sighting.seat,
        writ: charter.writ,
        holder: charter.holder,
        opened: opened.landed,
        run,
        retired,
      },
    }
  })

  const bringUps = (
    source: Stream.Stream<LandedFact<RunTraceFact>, Refusal>,
  ): Stream.Stream<SeatBringUp, Refusal> =>
    source.pipe(
      Stream.mapEffect(spawnsIn),
      Stream.flatMap((sighted) => Stream.fromIterable(sighted)),
      Stream.mapEffect(bringUp),
    )

  const consume = (
    source: Stream.Stream<LandedFact<RunTraceFact>, Refusal>,
  ): Effect.Effect<ReadonlyArray<SeatBringUp>, Refusal> => Stream.runCollect(bringUps(source))

  return {
    consume,
    sweep: Effect.flatMap(
      reads.tail(traceLane),
      (rows) => consume(Stream.fromIterable(rows)),
    ),
    run: Stream.runDrain(bringUps(reads.follow(traceLane))),
    seats: Effect.map(Ref.get(answered), (held) => [...held]),
  }
})
