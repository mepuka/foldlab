/**
 * The one-door containment wall's production run.
 *
 * Reads the four artifacts `kernel-door-containment.ts` names and evaluates the
 * containment law over them. The law itself lives next door so the mutation arm
 * can run the same clauses over planted bytes rather than a second statement of
 * them.
 *
 * The sweep quantifies over every `.ts` file under `src/` except two kinds:
 * the door itself, which is the module the law grants the authority, and the
 * `*.generated.ts` projections, whose bytes are the model's: one of them is
 * held to a byte-identical regeneration here by `check:kernel-schemas`, and the
 * other three by the model emitter's own gate, with `check:kernel-surfaces`
 * holding the committed bytes to the digests that gate registers. Anything else
 * that ships is swept.
 */
import { readdirSync } from "node:fs"
import { relative, resolve } from "node:path"

import { Console, Effect, Predicate, Schema } from "effect"

import {
  KERNEL_DOOR_PATHS,
  checkKernelDoorContainment,
  readDoorForm,
  readGeneratedExports,
  readRoutePin,
  sweepModule,
  sweepSeam,
  type ModuleFindings,
} from "./kernel-door-containment.js"

const packageRoot = resolve(import.meta.dir, "..")

class CheckFailure extends Schema.TaggedError<CheckFailure>()(
  "KernelDoorCheckFailure",
  { message: Schema.String },
) {}

const messageOf = (cause: unknown): string =>
  Predicate.isError(cause) ? cause.message : String(cause)

const normalizePath = (path: string): string => path.replaceAll("\\", "/")

const read = (path: string): Promise<string> =>
  Bun.file(resolve(packageRoot, path)).text()

/**
 * Every shipped module the sweep quantifies over, sorted, so a red wall names
 * the same site on every machine.
 */
const sweptModules = (root: string): ReadonlyArray<string> => {
  const modules: Array<string> = []
  const visit = (current: string): void => {
    for (const entry of readdirSync(current, { withFileTypes: true }).sort((left, right) =>
      left.name < right.name ? -1 : left.name > right.name ? 1 : 0
    )) {
      const path = resolve(current, entry.name)
      if (entry.isDirectory()) {
        visit(path)
        continue
      }
      if (!entry.isFile() || !entry.name.endsWith(".ts")) continue
      if (entry.name.endsWith(".generated.ts")) continue
      const relativePath = normalizePath(relative(packageRoot, path))
      if (relativePath === KERNEL_DOOR_PATHS.door) continue
      modules.push(relativePath)
    }
  }
  visit(resolve(packageRoot, root))
  if (modules.length === 0) throw new Error(`the one-door sweep found no module under ${root}`)
  return modules
}

const check = Effect.fn("KernelDoor.check")(function* () {
  const evidence = yield* Effect.tryPromise({
    try: async () => {
      const form = readDoorForm(
        await read(KERNEL_DOOR_PATHS.door),
        KERNEL_DOOR_PATHS.door,
      )
      const modules: Array<ModuleFindings> = []
      for (const modulePath of sweptModules(KERNEL_DOOR_PATHS.sweepRoot)) {
        modules.push(sweepModule(await read(modulePath), modulePath, form))
      }
      return {
        generatedExports: readGeneratedExports(
          await read(KERNEL_DOOR_PATHS.generatedSchemas),
          KERNEL_DOOR_PATHS.generatedSchemas,
        ),
        form,
        modules,
        pin: readRoutePin(
          await read(KERNEL_DOOR_PATHS.routePin),
          KERNEL_DOOR_PATHS.routePin,
        ),
        seam: sweepSeam(await read(KERNEL_DOOR_PATHS.seam), KERNEL_DOOR_PATHS.seam),
        sitePin: readRoutePin(
          await read(KERNEL_DOOR_PATHS.sitePin),
          KERNEL_DOOR_PATHS.sitePin,
        ),
      }
    },
    catch: (cause) => new CheckFailure({ message: messageOf(cause) }),
  })

  const checked = checkKernelDoorContainment(evidence)
  if (!checked.ok) {
    return yield* new CheckFailure({ message: `ONE DOOR: FAIL — ${checked.reason}` })
  }

  yield* Console.log(
    `ONE DOOR: PASS (${evidence.form.form.length} generated form roles;`
      + ` ${checked.routes} admission routes over ${checked.modules} swept modules,`
      + ` ${checked.pinned} pinned outside the door;`
      + ` ${checked.translations} identity translations, ${evidence.sitePin.length} pinned,`
      + ` ${evidence.seam.guarded} guarded at the seam)`,
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
        )
      ),
    ),
  )
}
