import { existsSync, readFileSync, readdirSync } from "node:fs"
import { join, relative, resolve } from "node:path"

const repo = resolve(import.meta.dir, "..")
const packagesDir = join(repo, "packages")
const marker = "// foldlab-test-policy: intentionally-test-free empty promotion placeholder"

const filesUnder = (dir: string): ReadonlyArray<string> => {
  if (!existsSync(dir)) return []
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const path = join(dir, entry.name)
    return entry.isDirectory() ? filesUnder(path) : [path]
  })
}

const executableBody = (source: string): string =>
  source
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/\/\/.*$/gm, "")
    .trim()

export const testFreePlaceholderError = (source: string): string | undefined => {
  if (!source.includes(marker)) return `missing exact policy marker: ${marker}`
  if (executableBody(source) !== "export {}") {
    return "the intentionally-test-free marker licenses only an empty `export {}` placeholder"
  }
  return undefined
}

export const testScriptError = (script: unknown): string | undefined =>
  typeof script === "string" && script.trim() !== ""
    ? undefined
    : "package.json has no executable test script"

const testPattern = /(?:^|[\\/])(?:test|tests)[\\/].+\.(?:test|spec)\.[cm]?[jt]sx?$/
const sourcePattern = /\.[cm]?[jt]sx?$/

const checkPackage = (name: string): ReadonlyArray<string> => {
  const errors: Array<string> = []
  const packageDir = join(packagesDir, name)
  if (!existsSync(packageDir)) return [`packages/${name}: package directory does not exist`]

  const manifestPath = join(packageDir, "package.json")
  if (!existsSync(manifestPath)) return [`packages/${name}: package.json does not exist`]
  const manifest = JSON.parse(readFileSync(manifestPath, "utf8")) as {
    readonly scripts?: { readonly test?: unknown }
  }
  const scriptError = testScriptError(manifest.scripts?.test)
  if (scriptError !== undefined) errors.push(`packages/${name}: ${scriptError}`)

  const files = filesUnder(packageDir)
  if (files.some((file) => testPattern.test(file))) return errors

  const sources = filesUnder(join(packageDir, "src")).filter((file) => sourcePattern.test(file))
  if (sources.length === 0) {
    errors.push(`packages/${name}: no tests and no source files`)
    return errors
  }
  for (const source of sources) {
    const error = testFreePlaceholderError(readFileSync(source, "utf8"))
    if (error !== undefined) errors.push(`${relative(repo, source)}: ${error}`)
  }
  return errors
}

const packageNames = (): ReadonlyArray<string> =>
  readdirSync(packagesDir, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name)

const check = (only?: string): ReadonlyArray<string> =>
  (only === undefined ? packageNames() : [only]).flatMap(checkPackage)

const selfTest = () => {
  const controls: ReadonlyArray<readonly [string, string, boolean]> = [
    ["empty marked placeholder", `${marker}\nexport {}\n`, true],
    ["unmarked placeholder", "export {}\n", false],
    ["marker cannot hide a runtime export", `${marker}\nexport const value = 1\n`, false],
  ]
  for (const [name, source, shouldPass] of controls) {
    const passed = testFreePlaceholderError(source) === undefined
    if (passed !== shouldPass) throw new Error(`package-test policy self-test failed: ${name}`)
  }
  const scriptControls: ReadonlyArray<readonly [string, unknown, boolean]> = [
    ["real package test script", "bun test ./test", true],
    ["missing package test script", undefined, false],
    ["blank package test script", "  ", false],
  ]
  for (const [name, script, shouldPass] of scriptControls) {
    const passed = testScriptError(script) === undefined
    if (passed !== shouldPass) throw new Error(`package-test policy self-test failed: ${name}`)
  }
  console.log(
    `package-test policy self-test: PASS (${controls.length + scriptControls.length} controls)`,
  )
}

if (process.argv.includes("--self-test")) {
  selfTest()
} else {
  const packageFlag = process.argv.indexOf("--package")
  const only = packageFlag === -1 ? undefined : process.argv[packageFlag + 1]
  if (packageFlag !== -1 && (only === undefined || only.startsWith("--"))) {
    console.error("PACKAGE TEST COVERAGE: REFUSED\n  --package requires a package directory name")
    process.exit(1)
  }
  const errors = check(only)
  if (errors.length > 0) {
    console.error("PACKAGE TEST COVERAGE: REFUSED")
    for (const error of errors) console.error(`  ${error}`)
    process.exit(1)
  }
  console.log(
    only === undefined
      ? "package test coverage: PASS (every package has an executable test script and tests or an empty-placeholder marker)"
      : `package test coverage: PASS (packages/${only})`,
  )
}
