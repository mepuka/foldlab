/**
 * NEGATIVE CONTROL - this file must not typecheck.
 *
 * The sorts sweep's acceptance, executed. Every canonical string crossing a
 * public seam is a branded sort, so a bare string offered at one of those
 * seams has no derivation and the compiler says so. This file offers one bare
 * string per sort at the real public call sites - an option object a caller
 * builds, a function a caller calls - rather than at aliases, because a sweep
 * that only proved the alias would be a sweep of nothing.
 *
 * Every planted spelling carries its LAWFUL TWIN beside it, in this same
 * project. That is what separates "the unlawful shape is unrepresentable" from
 * "this file does not compile": the twins keep compiling while the planted
 * spellings keep failing, and the committed trace names which lines fail and
 * why.
 *
 * The whole family stands in ONE project on purpose. The claim the sweep makes
 * is about the family - no bare string survives for ANY canonical value - so a
 * sort that quietly stopped refusing has to redden this wall, and seven copies
 * of one file would only make that harder to see.
 *
 * The twins mint through the sorts' own doors: the smart constructor where the
 * seam teaches a refusal, and the schema's own constructor where the value is
 * already known to be lawful.
 */
import { Effect, Schema } from "effect"

import { Digest } from "../src/truth/Digest.js"
import { CellName } from "../src/kernel/Subjects.js"
import { Holder } from "../src/kernel/Wire.js"
import { SegmentName, type ContextProgram } from "../src/kernel/ContextProgram.js"
import { declare as declareLane, LaneHandle } from "../src/planes/Lane.js"
import { hold, OutcomeValue, WorkKey, type RegisterOutcome } from "../src/planes/Register.js"
import { writ } from "../src/planes/Session.js"
import { FabricClient, StreamName } from "../src/carriage/FabricClient.js"

const eventSchema = Digest.make("a".repeat(64))
const renderer = Digest.make("b".repeat(64))
const Event = Schema.Struct({ tenant: Schema.String }) as Schema.ConstraintDecoder<{
  readonly tenant: string
}>

/* ------------------------------------------------------- lane handles */

/** The witness: a handle minted at the door that teaches its grammar. */
export const lawfulLane = declareLane({
  handle: LaneHandle.make("orders"),
  event: Event,
  eventSchema,
  partitions: 1 as const,
  partitionKey: { path: ["tenant"] },
})

/** The planted spelling: a route name nobody minted. */
export const plantedLane = declareLane({
  handle: "orders",
  event: Event,
  eventSchema,
  partitions: 1 as const,
  partitionKey: { path: ["tenant"] },
})

/* ------------------------------------------------------------ holders */

/** The witness: attribution presented as the sort it is. */
export const lawfulWrit = writ({ holder: Holder.make("reader"), views: [] })

/** The planted spelling: attribution as a bare string. */
export const plantedWrit = writ({ holder: "reader", views: [] })

/* ------------------------------------------------------- stream names */

/** The witness: a stream named by the token sort the substrate carries. */
export const lawfulClient = FabricClient.layer({
  servers: "nats://127.0.0.1:4222",
  stream: StreamName.make("flb-fab-commons"),
})

/** The planted spelling: a stream named by a bare string. */
export const plantedClient = FabricClient.layer({
  servers: "nats://127.0.0.1:4222",
  stream: "flb-fab-commons",
})

/* ------------------------------- cell names and segment names, together */

/** The witness: both sorts minted, at the two seams one program spells. */
export const lawfulProgram: ContextProgram = {
  v: 0,
  segments: [{
    name: SegmentName.make("frame"),
    volatility: "static",
    selector: { _tag: "cell", cell: CellName.make("membership") },
    renderer: { renderer },
  }],
}

/** The planted spelling: a segment named, and a cell selected, by bare strings. */
export const plantedProgram: ContextProgram = {
  v: 0,
  segments: [{
    name: "frame",
    volatility: "static",
    selector: { _tag: "cell", cell: "membership" },
    renderer: { renderer },
  }],
}

/* ------------------------------------------ work keys and outcome values */

/** The witness: a fenced hold taken at a minted key by a named holder. */
export const lawfulHold = hold(
  WorkKey.make("render-report"),
  Holder.make("seat-a"),
  () => Effect.succeed(0),
)

/** The planted spelling: a register key as a bare string. */
export const plantedHold = hold(
  "render-report",
  Holder.make("seat-a"),
  () => Effect.succeed(0),
)

/** The witness: a landed outcome carrying the outcome sort. */
export const lawfulOutcome: RegisterOutcome = {
  token: 1,
  value: OutcomeValue.make("done"),
}

/** The planted spelling: a landed outcome carrying a bare string. */
export const plantedOutcome: RegisterOutcome = { token: 1, value: "done" }

/* ------------------------------------------------------- cross-sort spend */

/**
 * The witness: a cell name is a cell name.
 *
 * The planted spelling below is the sort discipline's own clause. Both sorts
 * are the same literal-token grammar and the same runtime string, so nothing
 * but nominal identity separates them - which is exactly why a register key
 * spent where a cell name is demanded has to be a compile error and not a
 * convention.
 */
export const lawfulSort: CellName = CellName.make("membership")

/** The planted spelling: a register key spent where a cell name is demanded. */
export const plantedSort: CellName = WorkKey.make("membership")
