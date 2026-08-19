/**
 * Standing law 4's wall: the plane-layering lint.
 *
 * Walks every module under `packages/plait/src/`, reads its imports out of its
 * source bytes through the TypeScript AST, and refuses any edge that points
 * from a deeper plane to a shallower one. `internal/` modules are plane members
 * by their `Seam:` tag, so one rule covers the tree in both directions. The
 * law, the placements it encodes, and the rulings behind them are all in
 * `./plane-layering.ts`.
 *
 * Five arms, each with its own failure line:
 *
 * 1. **The standing law.** The ladder this wall encodes is compared against
 *    law 4's own bytes in the root `AGENTS.md`.
 * 2. **The roster.** The directories under `src/` must be exactly the five
 *    planes plus the seam-tagged flat one — an unplaced directory is refused,
 *    not skipped.
 * 3. **The tags.** Every module's directory placement and its declared `Plane:`
 *    tag must agree; every `internal/` module declares a `Seam:` naming a
 *    plane, and no plane module declares one.
 * 4. **The graph.** Every edge must point to a plane at or deeper than the
 *    importer's own, seams counted as planes.
 * 5. **The truth-edge pin.** Every truth-plane edge into `internal/` must be a
 *    reviewed row of `test/fixtures/truth-internal-edges.pin.txt`, and no row
 *    may outlive its edge.
 *
 * The mutation arm is `bun run check:layering-control`.
 *
 * @module
 */
import { resolve } from "node:path"

import { Console, Effect, Predicate, Schema } from "effect"

import {
  checkDirectoryRoster,
  checkModuleLayering,
  checkStandingLaw,
  checkTruthEdgePin,
  PLANE_LADDER,
  readPlaneModules,
  readStandingLaw,
  readTruthEdgePin,
  SEAM_DIRECTORY,
  seamIndexOf,
  SOURCE_ROOT,
  STANDING_LAW_PATH,
  TRUTH_EDGE_PIN_PATH,
  type PlaneModule,
} from "./plane-layering.js"

const repository = resolve(import.meta.dir, "../../..")
const read = (path: string): Promise<string> => Bun.file(resolve(repository, path)).text()

export class CheckFailure extends Schema.TaggedError<CheckFailure>()(
  "PlaneLayeringCheckFailure",
  { message: Schema.String },
) {}

const messageOf = (cause: unknown): string =>
  Predicate.isError(cause) ? cause.message : String(cause)

const failure = (cause: unknown): CheckFailure =>
  new CheckFailure({ message: `PLANE LAYERING: FAIL — ${messageOf(cause)}` })

const directoriesOf = (modules: ReadonlyArray<PlaneModule>): ReadonlyArray<string> => {
  const found = new Set<string>()
  for (const module of modules) {
    const segments = module.path.split("/")
    if (segments.length > 1) found.add(segments[0]!)
  }
  return [...found].sort()
}

const check = Effect.fn("PlaneLayering.check")(function* () {
  const law = yield* Effect.tryPromise({
    try: async () => readStandingLaw(await read(STANDING_LAW_PATH), STANDING_LAW_PATH),
    catch: failure,
  })
  const transcription = checkStandingLaw(law)
  if (!transcription.ok) {
    return yield* new CheckFailure({
      message: `PLANE LAYERING: FAIL — ${transcription.reason}`,
    })
  }

  const modules = yield* Effect.tryPromise({
    try: () => readPlaneModules(repository),
    catch: failure,
  })
  if (modules.length === 0) {
    return yield* new CheckFailure({
      message: `PLANE LAYERING: FAIL — ${SOURCE_ROOT} carries no modules`,
    })
  }

  const roster = checkDirectoryRoster(directoriesOf(modules))
  if (!roster.ok) {
    return yield* new CheckFailure({ message: `PLANE LAYERING: FAIL — ${roster.reason}` })
  }

  const pin = yield* Effect.tryPromise({
    try: async () => readTruthEdgePin(await read(TRUTH_EDGE_PIN_PATH), TRUTH_EDGE_PIN_PATH),
    catch: failure,
  })
  const seams = seamIndexOf(modules)

  const reasons: Array<string> = []
  let edges = 0
  for (const module of modules) {
    const checked = checkModuleLayering(module, seams, pin)
    if (checked.ok) edges += checked.edges
    else reasons.push(...checked.reasons)
  }

  const stale = checkTruthEdgePin(modules, pin)
  if (!stale.ok) reasons.push(`${stale.reason}\n  ${TRUTH_EDGE_PIN_PATH}`)

  if (reasons.length !== 0) {
    return yield* new CheckFailure({
      message: [
        ...reasons.map((reason) => `PLANE LAYERING VIOLATION: ${reason}`),
        `PLANE LAYERING: FAIL — ${reasons.length} violation${reasons.length === 1 ? "" : "s"}`
        + ` across ${modules.length} modules`,
      ].join("\n"),
    })
  }

  yield* Console.log(
    `PLANE LAYERING: PASS (${modules.length} modules on the ${PLANE_LADDER.length}-plane`
      + ` ladder, ${seams.size} of them ${SEAM_DIRECTORY}/ members by seam tag;`
      + ` ${edges} edges all pointing deeper or level,`
      + ` ${pin.length} truth edge${pin.length === 1 ? "" : "s"} pinned)`,
  )
})

if (import.meta.main) {
  await Effect.runPromise(
    check().pipe(
      Effect.catch((caught) =>
        Console.error(caught.message).pipe(
          Effect.andThen(Effect.sync(() => {
            process.exitCode = 1
          })),
        )),
    ),
  )
}
