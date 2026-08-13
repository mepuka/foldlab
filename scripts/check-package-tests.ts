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

const testPattern = /(?:^|[\\/])(?:test|tests)[\\/].+\.(?:test|spec)\.[cm]?[jt]sx?$/
const sourcePattern = /\.[cm]?[jt]sx?$/

const check = (): ReadonlyArray<string> => {
  const errors: Array<string> = []
  for (const entry of readdirSync(packagesDir, { withFileTypes: true })) {
    if (!entry.isDirectory()) continue
    const packageDir = join(packagesDir, entry.name)
    const files = filesUnder(packageDir)
    if (files.some((file) => testPattern.test(file))) continue

    const sources = filesUnder(join(packageDir, "src")).filter((file) => sourcePattern.test(file))
    if (sources.length === 0) {
      errors.push(`packages/${entry.name}: no tests and no source files`)
      continue
    }
    for (const source of sources) {
      const error = testFreePlaceholderError(readFileSync(source, "utf8"))
      if (error !== undefined) errors.push(`${relative(repo, source)}: ${error}`)
    }
  }
  return errors
}

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
  console.log(`package-test policy self-test: PASS (${controls.length} controls)`)
}

if (process.argv.includes("--self-test")) {
  selfTest()
} else {
  const errors = check()
  if (errors.length > 0) {
    console.error("PACKAGE TEST COVERAGE: REFUSED")
    for (const error of errors) console.error(`  ${error}`)
    process.exit(1)
  }
  console.log("package test coverage: PASS (every package has tests or an empty-placeholder marker)")
}
