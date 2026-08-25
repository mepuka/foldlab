import { spawnSync } from "node:child_process"
import { lakePath } from "./paths.ts"

export class CommandFailedError extends Error {
  readonly code = "command-failed"

  constructor(command: string, exitCode: number, output: string) {
    super(`command-failed: ${command} exited ${exitCode}\n${output}`)
    this.name = "CommandFailedError"
  }
}

export const runLake = (args: Array<string>, cwd: string): string => {
  const result = spawnSync(lakePath, args, { cwd, encoding: "utf8" })
  const stdout = result.stdout ?? ""
  const stderr = result.stderr ?? ""
  const output =
    stderr.length > 0 && stdout.length > 0
      ? stderr.endsWith("\n")
        ? stderr + stdout
        : `${stderr}\n${stdout}`
      : stderr + stdout
  const command = `~/.elan/bin/lake ${args.join(" ")}`
  if (result.error !== undefined) {
    throw new CommandFailedError(command, 127, output + result.error.message)
  }
  if (result.status !== 0) {
    throw new CommandFailedError(command, result.status ?? 1, output)
  }
  return output
}
