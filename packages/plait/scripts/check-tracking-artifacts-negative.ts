/**
 * Root law 10's control arm, executed.
 *
 * The trace is the contract: every plant has to keep failing for its own named
 * reason, and a refusal that moves is reported as a moved trace rather than
 * absorbed. Run with `--write` to re-record it after a deliberate change — the
 * bytes come from EXECUTING the mutant, never from typing what it ought to say.
 */
import { resolve } from "node:path"

const packageRoot = resolve(import.meta.dir, "..")
const mutant = "negative-controls/TrackingArtifacts.rendered.mutant.ts"
const trace = "negative-controls/TrackingArtifacts.rendered.trace.txt"

const normalize = (text: string): string =>
  text.replaceAll("\\", "/").replaceAll("\r\n", "\n")

const run = Bun.spawnSync({
  cmd: ["bun", mutant],
  cwd: packageRoot,
  stdout: "pipe",
  stderr: "pipe",
})

if (run.exitCode === 0) {
  console.error("TRACKING ARTIFACTS CONTROL: FAIL — a planted tracking artifact was accepted")
  process.exit(1)
}

const actual = normalize(`${run.stdout.toString()}${run.stderr.toString()}`)
if (process.argv.includes("--write")) {
  await Bun.write(resolve(packageRoot, trace), actual)
  console.log(`TRACKING ARTIFACTS CONTROL: wrote ${trace}`)
  process.exit(0)
}

const expected = normalize(await Bun.file(resolve(packageRoot, trace)).text())
if (actual !== expected) {
  console.error("TRACKING ARTIFACTS CONTROL: FAIL — named refusal trace moved")
  console.error("--- expected ---")
  console.error(expected)
  console.error("--- actual ---")
  console.error(actual)
  process.exit(1)
}

console.log(
  "TRACKING ARTIFACTS CONTROL: PASS (planted board-ticket id, sitting-note id, filesystem"
    + " path, generation command, both retired draft markers, and stale by-name exclusion"
    + " each refused for their committed reasons)",
)
