/**
 * The one-door wall's mutation arm.
 *
 * Seven second-door spellings are planted into the *bytes the production wall
 * parses*, and the production readers and the production law are then run over
 * the planted bytes. Nothing here re-states the law or hands a helper a
 * hand-built argument: the only difference between each run and the green one
 * is the one thing that was planted.
 *
 * One arm per clause, and each arm plants only what its clause reads, so a
 * clause that stopped refusing is reported as an accepted mutant rather than
 * absorbed by a neighbour. The clauses are ordered in the law, so an arm that
 * tripped two of them would answer with whichever came first and could no
 * longer name the law it drops — every planted module below therefore avoids
 * every clause but its own.
 *
 * The planted module paths are this file's, not the package's, so the committed
 * trace pins the shape refused rather than the line an unrelated edit moved.
 * What is read from the shipped tree is what the law is held against: the
 * generated symbol roster, the door's own form, and every real module's bytes.
 */
import { resolve } from "node:path"

import {
  KERNEL_DOOR_PATHS,
  checkKernelDoorContainment,
  readDoorForm,
  readGeneratedExports,
  readRoutePin,
  sweepModule,
  type DoorForm,
  type KernelDoorEvidence,
  type ModuleFindings,
} from "../scripts/kernel-door-containment.js"

const packageRoot = resolve(import.meta.dir, "..")
const read = (path: string): Promise<string> => Bun.file(resolve(packageRoot, path)).text()

const doorSource = await read(KERNEL_DOOR_PATHS.door)
const generatedSource = await read(KERNEL_DOOR_PATHS.generatedSchemas)
const pinSource = await read(KERNEL_DOOR_PATHS.routePin)

const generatedExports = readGeneratedExports(
  generatedSource,
  KERNEL_DOOR_PATHS.generatedSchemas,
)
const form = readDoorForm(doorSource, KERNEL_DOOR_PATHS.door)
const pin = readRoutePin(pinSource, KERNEL_DOOR_PATHS.routePin)

/**
 * The shipped modules the pin's liveness clause is evaluated against. Only the
 * two the arms below need are read: the pinned one, so the green pin row still
 * has its route, and one clean host, so the stale-pin arm has a module that
 * carries routes and violates nothing.
 */
const shipped: ReadonlyArray<string> = ["src/planes/Address.ts", "src/carriage/CasDaemon.ts"]
const baselineModules: Array<ModuleFindings> = []
for (const modulePath of shipped) {
  baselineModules.push(sweepModule(await read(modulePath), modulePath, form))
}

/** A second door spelled as a wrapper: the host keeps the name and adds a hop. */
const WRAPPER_ROUTE = `import { admit as kernelAdmit } from "../kernel/KernelDoor.js"
export const admit = (context: never, candidate: never) => kernelAdmit(context, candidate)
`

/** A private validator that mints a verdict of its own. */
const PRIVATE_VERDICT = `export const judgeLocally = () => ({ verdict: "refused", reason: "clock-read" })
`

/** A host surface whose admission takes a candidate shape of its own naming. */
const HOST_CANDIDATE_SURFACE = `export interface HostCandidate { readonly tag: string }
export interface HostOutcome { readonly outcome: string }
export interface SecondDoorService {
  readonly admit: (candidate: HostCandidate) => HostOutcome
}
`

/** A hand-written twin of the name the shared form owns. */
const FORM_TWIN = `export interface KernelCandidateAct { readonly _tag: string }
`

/** A form name reached without importing it from the door or the generator. */
const UNBOUND_FORM_NAME = `export const judged = (candidate: KernelCandidateAct): boolean => candidate !== undefined
`

const planted = (modulePath: string, source: string): ModuleFindings =>
  sweepModule(source, modulePath, form)

const withModule = (modulePath: string, source: string): KernelDoorEvidence => ({
  generatedExports,
  form,
  modules: [...baselineModules, planted(modulePath, source)],
  pin,
})

/**
 * The door's own form, planted so its candidate role names a symbol the
 * generator never emitted. This is the drift that would silently widen what
 * the sweep is held against, so it is refused before any module is read.
 */
const driftedForm = (): DoorForm =>
  readDoorForm(
    doorSource.replace(
      "export const Candidate = Generated.KernelCandidateAct",
      "export const Candidate = Generated.KernelHandWrittenCandidate",
    ),
    KERNEL_DOOR_PATHS.door,
  )

const arms: ReadonlyArray<{ readonly name: string; readonly evidence: () => KernelDoorEvidence }> = [
  {
    name: "door-form-drift",
    evidence: () => ({ generatedExports, form: driftedForm(), modules: baselineModules, pin }),
  },
  {
    name: "private-verdict",
    evidence: () => withModule("src/planes/SecondDoor.verdict.ts", PRIVATE_VERDICT),
  },
  {
    name: "wrapper-route",
    evidence: () => withModule("src/carriage/SecondDoor.wrapper.ts", WRAPPER_ROUTE),
  },
  {
    name: "host-candidate-surface",
    evidence: () => withModule("src/carriage/SecondDoor.surface.ts", HOST_CANDIDATE_SURFACE),
  },
  {
    name: "form-twin",
    evidence: () => withModule("src/carriage/SecondDoor.twin.ts", FORM_TWIN),
  },
  {
    name: "unbound-form-name",
    evidence: () => withModule("src/planes/SecondDoor.unbound.ts", UNBOUND_FORM_NAME),
  },
  {
    name: "stale-pin",
    evidence: () => ({
      generatedExports,
      form,
      modules: baselineModules,
      pin: [...pin, { module: "src/carriage/CasDaemon.ts", ticket: "DEV-763" }],
    }),
  },
]

const reasons: Array<string> = []
for (const arm of arms) {
  const checked = checkKernelDoorContainment(arm.evidence())
  if (checked.ok) {
    console.error(`KERNEL DOOR MUTANT: the ${arm.name} plant was accepted`)
    process.exit(0)
  }
  reasons.push(`${arm.name}: ${checked.reason}`)
}

console.error(reasons.join("\n"))
process.exit(1)
