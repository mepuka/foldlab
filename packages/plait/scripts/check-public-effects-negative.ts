import { resolve } from "node:path"

import {
  emitDeclarations,
  inspectPublicDeclarations,
} from "./public-effect-declarations.js"

const packageRoot = resolve(import.meta.dir, "..")

const controls = [
  {
    name: "value-union export",
    project: "tsconfig.negative-control.json",
    trace: "negative-controls/PublicEffects.value-union.trace.txt",
  },
  {
    name: "new non-Refusal Effect export",
    project: "tsconfig.negative-new-export.json",
    trace: "negative-controls/PublicEffects.new-export.trace.txt",
  },
  {
    name: "FabricClient class layer",
    project: "tsconfig.negative-fabric-client.json",
    trace: "negative-controls/PublicEffects.fabric-client.trace.txt",
  },
  {
    name: "Stream error inside Effect success",
    project: "tsconfig.negative-stream-success.json",
    trace: "negative-controls/PublicEffects.stream-success.trace.txt",
  },
  {
    name: "plain Effect value export",
    project: "tsconfig.negative-effect-value.json",
    trace: "negative-controls/PublicEffects.effect-value.trace.txt",
  },
  {
    name: "curried data-last Effect operation",
    project: "tsconfig.negative-curried.json",
    trace: "negative-controls/PublicEffects.curried.trace.txt",
  },
  {
    name: "deeply nested Effect operation",
    project: "tsconfig.negative-deep-object.json",
    trace: "negative-controls/PublicEffects.deep-object.trace.txt",
  },
  {
    name: "Schema-shaped fallible decode",
    project: "tsconfig.negative-schema-value.json",
    trace: "negative-controls/PublicEffects.schema-value.trace.txt",
  },
  {
    name: "plain class fallible static",
    project: "tsconfig.negative-plain-class.json",
    trace: "negative-controls/PublicEffects.plain-class.trace.txt",
  },
  {
    name: "cross-package member surfaced through the barrel",
    project: "tsconfig.negative-core-probe.json",
    trace: "negative-controls/PublicEffects.core-probe.trace.txt",
  },
  {
    name: "walk quantified over an empty surface",
    project: "tsconfig.negative-empty-quantifier.json",
    trace: "negative-controls/PublicEffects.empty-quantifier.trace.txt",
  },
  {
    name: "walk quantified over part of the barrel",
    project: "tsconfig.negative-narrowed-quantifier.json",
    trace: "negative-controls/PublicEffects.narrowed-quantifier.trace.txt",
  },
] as const

const declarationControls = [
  {
    name: "measured nested-carrier bounds",
    project: "tsconfig.negative-bounds.json",
    entry: "negative-controls/PublicEffects.bounds.mutant.d.ts",
    trace: "negative-controls/PublicEffects.bounds.trace.txt",
  },
  {
    name: "package-authored Schema declaration extension",
    project: "tsconfig.negative-schema-declaration.json",
    entry: "negative-controls/PublicEffects.schema-declaration.mutant.d.ts",
    trace: "negative-controls/PublicEffects.schema-declaration.trace.txt",
  },
  {
    name: "string-indexed fallible operation",
    project: "tsconfig.negative-string-index.json",
    entry: "negative-controls/PublicEffects.string-index.mutant.d.ts",
    trace: "negative-controls/PublicEffects.string-index.trace.txt",
  },
  {
    name: "declaration recursion depth ladder",
    project: "tsconfig.negative-depth-ladder.json",
    entry: "negative-controls/PublicEffects.depth-ladder.mutant.d.ts",
    trace: "negative-controls/PublicEffects.depth-ladder.trace.txt",
  },
  {
    name: "construct-signature-only fallible instance",
    project: "tsconfig.negative-construct-signature.json",
    entry: "negative-controls/PublicEffects.construct-signature.mutant.d.ts",
    trace: "negative-controls/PublicEffects.construct-signature.trace.txt",
  },
  {
    name: "fallible non-final instance overload signature",
    project: "tsconfig.negative-overload-instance.json",
    entry: "negative-controls/PublicEffects.overload-instance.mutant.d.ts",
    trace: "negative-controls/PublicEffects.overload-instance.trace.txt",
  },
  {
    name: "fallible first overload signature",
    project: "tsconfig.negative-overload-first.json",
    entry: "negative-controls/PublicEffects.overload-first.mutant.d.ts",
    trace: "negative-controls/PublicEffects.overload-first.trace.txt",
  },
  {
    name: "fallible last overload signature",
    project: "tsconfig.negative-overload-last.json",
    entry: "negative-controls/PublicEffects.overload-last.mutant.d.ts",
    trace: "negative-controls/PublicEffects.overload-last.trace.txt",
  },
] as const

const normalize = (text: string): string =>
  text.replaceAll("\\", "/").replaceAll("\r\n", "\n")

/**
 * Twenty controls, each a whole `tsc` invocation, ran end to end because the
 * runner spawned them synchronously. They share nothing — every compiler
 * control reads its own project and trace, and every declaration control emits
 * into its own `--outDir` — so the only thing serializing them was the spawn.
 * The pool is bounded rather than unbounded because twenty concurrent
 * compilers thrash a machine that has to keep the rest of the battery running.
 */
const poolSize = 8

/** A control's verdict: the lines to print before refusing, or nothing. */
type Refusal = ReadonlyArray<string>

const passed: Refusal = []

const traceRefusal = (
  label: string,
  expected: string,
  actual: string,
): Refusal => [
  `PUBLIC EFFECT CONTROL: FAIL — ${label}`,
  "--- expected ---",
  expected,
  "--- actual ---",
  actual,
]

const checkCompilerControl = async (
  control: (typeof controls)[number],
): Promise<Refusal> => {
  const child = Bun.spawn({
    cmd: ["bunx", "tsc", "-p", control.project, "--noEmit", "--pretty", "false"],
    cwd: packageRoot,
    stdout: "pipe",
    stderr: "pipe",
  })
  const [exitCode, stdout, stderr] = await Promise.all([
    child.exited,
    new Response(child.stdout).text(),
    new Response(child.stderr).text(),
  ])

  if (exitCode === 0) {
    return [`PUBLIC EFFECT CONTROL: FAIL — ${control.name} typechecked`]
  }

  const actual = normalize(`${stdout}${stderr}`)
  const expected = normalize(await Bun.file(resolve(packageRoot, control.trace)).text())
  return actual === expected
    ? passed
    : traceRefusal(`${control.name} compiler trace moved`, expected, actual)
}

const checkDeclarationControl = async (
  control: (typeof declarationControls)[number],
): Promise<Refusal> => {
  const emitted = await emitDeclarations(control.project)
  try {
    const actual = inspectPublicDeclarations(
      emitted.directory,
      control.entry,
      "plantedPublicApi",
    ).violations
    if (actual === "") {
      return [`PUBLIC EFFECT CONTROL: FAIL — ${control.name} typechecked`]
    }
    const traceFile = Bun.file(resolve(packageRoot, control.trace))
    const expected = await traceFile.exists() ? normalize(await traceFile.text()) : ""
    return normalize(actual) === expected
      ? passed
      : traceRefusal(`${control.name} declaration trace moved`, expected, actual)
  } finally {
    emitted.dispose()
  }
}

/**
 * Runs the checks at most `poolSize` at a time and returns their verdicts in
 * the order the controls were declared, never the order they finished: a
 * refusal names the same control on every run, and a red is reproducible.
 */
const pooled = async <A>(
  checks: ReadonlyArray<() => Promise<A>>,
): Promise<ReadonlyArray<A>> => {
  const verdicts = new Array<A>(checks.length)
  let next = 0
  const worker = async (): Promise<void> => {
    for (let index = next++; index < checks.length; index = next++) {
      verdicts[index] = await checks[index]!()
    }
  }
  await Promise.all(
    Array.from({ length: Math.min(poolSize, checks.length) }, worker),
  )
  return verdicts
}

const verdicts = await pooled([
  ...controls.map((control) => () => checkCompilerControl(control)),
  ...declarationControls.map((control) => () => checkDeclarationControl(control)),
])

const refused = verdicts.find((verdict) => verdict.length > 0)
if (refused !== undefined) {
  for (const line of refused) console.error(line)
  process.exit(1)
}

console.log("PUBLIC EFFECT CONTROL: PASS (twenty public-surface regressions refused)")
