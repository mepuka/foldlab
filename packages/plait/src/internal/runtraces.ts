/**
 * Plane: internal — private adapters, housed flat.
 * Seam: planes — the state carriers, one seam per plane.
 *
 * @module
 */
import { Effect, Schema } from "effect"

import type { WireValue } from "../truth/Canonical.js"
import { Digest, digestOf, type Digest as DigestValue } from "../truth/Digest.js"
import type { Refusal } from "../truth/Refusal.js"
import { declare, laneHandle, type DeclaredLane } from "../planes/Lane.js"

/**
 * The run-trace vocabulary: what one program run leaves behind as a fact, and
 * the lane that carries it.
 *
 * **One fact per run, never one per step.** A run's per-act flux already
 * exists — every judgment the engine issues is published on its verdict
 * stream, live and in process — and flux is transport. What lands here is the
 * run's whole trace as ONE canonical value, so a lane carries runs rather than
 * a confetti of tokens, and a reader taking the digest of a trace is naming
 * the run rather than naming one of its keystrokes.
 *
 * **The route carries no estate-invented word.** The handle IS the digest of
 * the declared event form below, exactly as the substrate-session and
 * heartbeat lanes derive theirs, so the subject the wire sees is a function of
 * a declaration rather than a name this package chose.
 *
 * **Keyed by the writ, because that is what has an order.** Every trace cites
 * the policy digest its run acted under, and the partition key is that field,
 * so one writ's runs never separate across partitions and the positions a
 * reader sees are one sequence. Two writs' positions come from two sequences
 * and are not comparable, which is the same reading every lane in this package
 * takes of its own partitions.
 *
 * **Unbounded integers travel as exact decimal text.** A node name, a landed
 * identity label, and every atom of an admitted sentence's encoding are
 * unbounded naturals — at this runtime they are 256-bit content addresses read
 * as integers — and a JSON number holds 2^53 exactly and no more. A number
 * would round an identity into a different identity, so the trace writes each
 * one as its minimal decimal, which is the same reading the served tool face
 * takes of the same values.
 *
 * **Nothing here lands anything.** Landing a trace is a judged emit through
 * the one door, and it belongs where the engine is reached; this module is the
 * shape and the route. A landing path built beside the door would be an emit
 * nobody judged.
 */

/** The one name every trace fact carries, whichever way its run ended. */
export const RUN_TRACE_KIND = "engine-run-trace"

/**
 * How many partitions the run-trace lane declares.
 *
 * A writ keys the lane, so this number is how widely unrelated writs spread and
 * never how a single writ's runs are ordered — one writ's traces land on one
 * partition however many there are.
 */
export const RUN_TRACE_PARTITIONS = 8

/**
 * The declared event form for the run-trace lane.
 *
 * Its digest is both the lane's admitted event-schema digest and its route
 * handle, so a party holding this record reproduces the route with no I/O and
 * no access to this module's runtime.
 *
 * The three variants share one `kind` and are told apart by `outcome`, because
 * they are one fact about one run and the model's own run outcome is spelled
 * the same way: one discriminator naming the arm, and the arm's own fields
 * beside it. The list is ADD-ONLY for the reason every declared roster in this
 * package is — the form's digest is the route, so appending moves the route
 * visibly while rewriting one in place would move it silently.
 */
export const RUN_TRACE_EVENT_FORM = {
  v: 0,
  kind: "engine-run-trace-event",
  variants: [
    {
      outcome: "landed",
      fields: ["writ", "steps", "landed"],
    },
    {
      outcome: "refused",
      fields: ["writ", "steps", "node", "refusal"],
    },
    {
      outcome: "unspeakable",
      fields: ["writ", "steps", "node", "slot", "detail"],
    },
  ],
} as const

/**
 * What one walked node landed, at both identity scales.
 *
 * `label` is the model identity label the door reasoned with, written exactly.
 * `kind` is the brand where the landing has one and `digest` the content
 * address where this engine performed the translation; a fold's landing
 * carries a state label and neither, which is why both are nullable rather
 * than absent.
 */
export const RunTraceLanding = Schema.Struct({
  label: Schema.String,
  kind: Schema.NullOr(Schema.String),
  digest: Schema.NullOr(Digest),
})

/** What one walked node landed, at both identity scales. */
export type RunTraceLanding = typeof RunTraceLanding.Type

/**
 * One walked node: its local name, the admitted sentence's canonical encoding,
 * and what the carrier landed.
 *
 * `landed` is null for the acts the model interprets as world-identity, which
 * is the engine's own reading and is carried through rather than repaired.
 */
export const RunTraceStep = Schema.Struct({
  node: Schema.String,
  encoded: Schema.Array(Schema.String),
  landed: Schema.NullOr(RunTraceLanding),
})

/** One walked node, as the trace writes it. */
export type RunTraceStep = typeof RunTraceStep.Type

/**
 * The door's taught row, carried verbatim.
 *
 * The four fields are the generated table's own and are held as text here: a
 * closed union spelled beside the generated one would be a second statement of
 * the refusal vocabulary, and this lane restates nothing — it carries what the
 * door said.
 */
export const RunTraceRow = Schema.Struct({
  reason: Schema.String,
  law: Schema.String,
  repair: Schema.String,
  applicability: Schema.String,
})

/** The door's taught row, carried verbatim. */
export type RunTraceRow = typeof RunTraceRow.Type

/** What every arm carries: the version, the name, the writ, and the walk. */
const traceFields = {
  v: Schema.Literal(0),
  kind: Schema.Literal(RUN_TRACE_KIND),
  writ: Digest,
  steps: Schema.Array(RunTraceStep),
}

/** A run every node of which was admitted and carried. */
export const RunTraceLanded = Schema.Struct({
  ...traceFields,
  outcome: Schema.Literal("landed"),
  landed: Schema.NullOr(RunTraceLanding),
})

/** A run the door refused at a named node, with the taught row intact. */
export const RunTraceRefused = Schema.Struct({
  ...traceFields,
  outcome: Schema.Literal("refused"),
  node: Schema.String,
  refusal: RunTraceRow,
})

/**
 * A run whose completion could not speak a node at all.
 *
 * There is no row on this arm and that is the whole reason it is a third one:
 * a completion that cannot answer never reaches the door, so there is no
 * verdict to report — only the slot, and which of the model's four ways it had
 * no value.
 */
export const RunTraceUnspeakable = Schema.Struct({
  ...traceFields,
  outcome: Schema.Literal("unspeakable"),
  node: Schema.String,
  slot: Schema.String,
  detail: Schema.String,
})

/**
 * Every fact the run-trace lane carries: one run, one value, three arms.
 *
 * Each arm keeps the steps that stood, because in all three cases they are
 * what happened — a run that stopped did not undo the nodes it had already
 * carried, and a trace that discarded them would report a partial run as
 * nothing.
 */
export const RunTraceFact = Schema.Union([
  RunTraceLanded,
  RunTraceRefused,
  RunTraceUnspeakable,
])

/** Every fact the run-trace lane carries. */
export type RunTraceFact = typeof RunTraceFact.Type

/** The digest of the declared event form, which is also the lane's handle. */
export const runTraceEventSchema: Effect.Effect<DigestValue, Refusal> = digestOf(
  RUN_TRACE_EVENT_FORM as unknown as WireValue,
)

/**
 * Declares the run-trace lane.
 *
 * Keyed by the writ digest, so every trace of one policy routes to one
 * partition and a writ's runs read in the order they landed.
 */
export const runTraceLane = Effect.fn("RunTraceLane.declare")(function* (): Effect.fn.Return<
  DeclaredLane<RunTraceFact, typeof RUN_TRACE_PARTITIONS>,
  Refusal
> {
  const eventSchema = yield* runTraceEventSchema
  return yield* declare({
    handle: yield* laneHandle(eventSchema),
    event: RunTraceFact,
    eventSchema,
    partitions: RUN_TRACE_PARTITIONS,
    partitionKey: { path: ["writ"] },
  })
})
