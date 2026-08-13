import { existsSync } from "node:fs"
import { resolve } from "node:path"

type PrepareOptions = {
  readonly cliPath: string
  readonly required: boolean
}

type PrepareDependencies = {
  readonly exists: (path: string) => boolean
  readonly run: (path: string) => number
  readonly info: (message: string) => void
  readonly error: (message: string) => void
}

export const prepareEffectLanguageService = (
  options: PrepareOptions,
  dependencies: PrepareDependencies,
): number => {
  if (!dependencies.exists(options.cliPath)) {
    const message =
      "Effect language-service patch deferred: dependencies are not linked yet; " +
      "the next `bun run prepare` or `bun run typecheck` will apply it."
    if (options.required) {
      dependencies.error(message)
      return 1
    }
    dependencies.info(message)
    return 0
  }
  return dependencies.run(options.cliPath)
}

const repo = resolve(import.meta.dir, "..")
const cliPath = resolve(repo, "node_modules", "@effect", "language-service", "cli.js")

if (import.meta.main) {
  const exitCode = prepareEffectLanguageService(
    {
      cliPath,
      required: process.argv.includes("--require"),
    },
    {
      exists: existsSync,
      run: (path) => {
        const result = Bun.spawnSync({
          cmd: [process.execPath, path, "patch"],
          cwd: repo,
          stdin: "inherit",
          stdout: "inherit",
          stderr: "inherit",
        })
        return result.exitCode ?? 1
      },
      info: console.log,
      error: console.error,
    },
  )
  process.exit(exitCode)
}
