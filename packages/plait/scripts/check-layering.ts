/**
 * Standing law 4's wall: the plane-layering lint.
 *
 * Walks every module under `packages/plait/src/`, reads its imports out of its
 * source bytes through the TypeScript AST, and refuses any edge that points
 * from a deeper plane to a shallower one. The law, the placements it encodes,
 * and the reason each exclusion exists are all in `./plane-layering.ts`.
 *
 * Three arms, each with its own failure line:
 *
 * 1. **The standing law.** The ladder this wall encodes is compared against
 *    law 4's own bytes in the root `AGENTS.md`.
 * 2. **The roster.** The directories under `src/` must be exactly the five
 *    planes plus the stated exclusions — an unplaced directory is refused, not
 *    skipped.
 * 3. **The graph.** Every module's directory placement and its declared
 *    `Plane:` tag must agree, and every ladder edge must point deeper or level.
 *
 * The mutation arm is `bun run check:layering-control`.
 *
 * @module
 */
import { readdirSync } from "node:fs"
import { resolve } from "node:path"

import { Console, Effect, Predicate, Schema } from "effect"

import {
  checkDirectoryRoster,
  checkModuleLayering,
  checkStandingLaw,
  PLANE_LADDER,
  readDeclaredPlane,
  readModuleImports,
  readStandingLaw,
  SOURCE_ROOT,
  sourcePath,
  STANDING_LAW_PATH,
  STATED_EXCLUSIONS,
  placeModule,
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

/**
 * The modules the wall walks, `src/`-relative with forward slashes and sorted,
 * so a failure list reads the same on every host.
 */
const walk = (): ReadonlyArray<string> =>
  readdirSync(resolve(repository, SOURCE_ROOT), { recursive: true, withFileTypes: true })
    .filter((entry) => entry.isFile() && entry.name.endsWith(".ts"))
    .map((entry) =>
      `${entry.parentPath}/${entry.name}`
        .replaceAll("\\", "/")
        .slice(`${resolve(repository, SOURCE_ROOT).replaceAll("\\", "/")}/`.length)
    )
    .sort()

const directoriesOf = (paths: ReadonlyArray<string>): ReadonlyArray<string> => {
  const found = new Set<string>()
  for (const path of paths) {
    const segments = path.split("/")
    if (segments.length > 1) found.add(segments[0]!)
  }
  return [...found].sort()
}

const check = Effect.fn("PlaneLayering.check")(function* () {
  const law = yield* Effect.tryPromise({
    try: async () => readStandingLaw(await read(STANDING_LAW_PATH), STANDING_LAW_PATH),
    catch: (cause) =>
      new CheckFailure({ message: `PLANE LAYERING: FAIL — ${messageOf(cause)}` }),
  })
  const transcription = checkStandingLaw(law)
  if (!transcription.ok) {
    return yield* new CheckFailure({
      message: `PLANE LAYERING: FAIL — ${transcription.reason}`,
    })
  }

  const paths = yield* Effect.try({
    try: walk,
    catch: (cause) =>
      new CheckFailure({ message: `PLANE LAYERING: FAIL — ${messageOf(cause)}` }),
  })
  if (paths.length === 0) {
    return yield* new CheckFailure({
      message: `PLANE LAYERING: FAIL — ${SOURCE_ROOT} carries no modules`,
    })
  }

  const roster = checkDirectoryRoster(directoriesOf(paths))
  if (!roster.ok) {
    return yield* new CheckFailure({ message: `PLANE LAYERING: FAIL — ${roster.reason}` })
  }

  const modules: Array<PlaneModule> = []
  for (const path of paths) {
    const source = yield* Effect.tryPromise({
      try: () => read(sourcePath(path)),
      catch: (cause) =>
        new CheckFailure({ message: `PLANE LAYERING: FAIL — ${messageOf(cause)}` }),
    })
    // Only the AST read can throw; a module whose header carries no plane tag
    // returns its refusal, so one untagged module costs one report line rather
    // than the rest of the walk.
    const module = yield* Effect.try({
      try: (): PlaneModule => ({
        path,
        placement: placeModule(path),
        declaredPlane: readDeclaredPlane(source, sourcePath(path)),
        imports: readModuleImports(source, sourcePath(path)),
      }),
      catch: (cause) =>
        new CheckFailure({ message: `PLANE LAYERING: FAIL — ${messageOf(cause)}` }),
    })
    modules.push(module)
  }

  const reasons: Array<string> = []
  let ladderEdges = 0
  let exemptEdges = 0
  let walked = 0
  for (const module of modules) {
    const checked = checkModuleLayering(module)
    if (checked.ok) {
      ladderEdges += checked.ladderEdges
      exemptEdges += checked.exemptEdges
      if (module.placement.sort === "plane") walked += 1
      continue
    }
    reasons.push(...checked.reasons)
  }

  if (reasons.length !== 0) {
    return yield* new CheckFailure({
      message: [
        ...reasons.map((reason) => `PLANE LAYERING VIOLATION: ${reason}`),
        `PLANE LAYERING: FAIL — ${reasons.length} violation${reasons.length === 1 ? "" : "s"}`
        + ` across ${modules.length} modules`,
      ].join("\n"),
    })
  }

  const exempt = STATED_EXCLUSIONS.map((entry) => entry.directory).join(", ")
  yield* Console.log(
    `PLANE LAYERING: PASS (${walked} modules on the ${PLANE_LADDER.length}-plane ladder,`
      + ` ${ladderEdges} ladder edges all pointing deeper or level;`
      + ` ${modules.length - walked} modules and ${exemptEdges} edges under the stated`
      + ` ${exempt} exclusion, which this wall does not judge)`,
  )
})

if (import.meta.main) {
  await Effect.runPromise(
    check().pipe(
      Effect.catch((failure) =>
        Console.error(failure.message).pipe(
          Effect.andThen(Effect.sync(() => {
            process.exitCode = 1
          })),
        )),
    ),
  )
}
