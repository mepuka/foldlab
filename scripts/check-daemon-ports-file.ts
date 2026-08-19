/**
 * The ports-file poll's retirement, measured.
 *
 * Under the stock-binary posture a suite's readiness signal is a ports file
 * appearing on disk, polled on a fixed budget. That file proves a client port
 * is bound and proves nothing about JetStream, so every suite that waits on it
 * races the JetStream API afterwards. Under the daemon the signal is
 * in-process: the vendor's own readiness gate, then its own health read with
 * JetStream enablement requested, then two positioned observations on the
 * incarnation lane. No port is involved and no file appears.
 *
 * This check is the retirement's measurement rather than its claim. It walks
 * the declared roster of files that make up the daemon-backed suite and prints
 * every line that reaches for a ports file or for the stock-binary harness
 * whose readiness IS that poll. Printing nothing is passing; the battery stage
 * that runs it refuses any output at all.
 *
 * The stock-binary harness itself is NOT retired and is deliberately not
 * walked: both postures run side by side, and the suites that spawn a stock
 * binary keep polling its ports file because that is the only signal a spawned
 * binary gives them.
 *
 * **The detector proves it can fire before it reports that it did not.** A
 * scanner that silently stopped matching would print nothing and read as a
 * pass, which is the failure mode an empty-output stage is most exposed to, so
 * the run begins by scanning a planted sample and reports a detector that does
 * not fire on it.
 */
import { readFileSync } from "node:fs"
import { resolve } from "node:path"

const repo = resolve(import.meta.dir, "..")

/**
 * The daemon-backed suite, named rather than discovered.
 *
 * Naming it is the point: the claim is about a suite, and a suite is a set of
 * files somebody decided belongs to it. A file joining the daemon-backed suite
 * joins this roster in the same commit, which is a visible act; a discovery
 * rule would let one join silently and inherit the claim without being
 * measured.
 */
const suite: ReadonlyArray<string> = [
  "go/daemon/daemon.go",
  "go/daemon/daemon_test.go",
  "go/daemon/greeting.go",
  "go/daemon/options.go",
  "go/daemon/readiness.go",
  "go/daemon/serveroptions.go",
  "go/daemon/serveroptions_test.go",
  "go/daemon/session.go",
  "go/daemon/session_test.go",
  "go/cmd/daemonwall/main.go",
  "go/cmd/optionswall/citation.go",
  "go/cmd/optionswall/main.go",
  "go/cmd/optionswall/parity.go",
  "packages/plait/test/process/substrate-daemon-mint.ts",
  "packages/plait/test/process/substrate-options-mint.ts",
]

/** What a ports-file readiness poll looks like, in either language. */
const reaches: ReadonlyArray<{ readonly pattern: RegExp; readonly what: string }> = [
  { pattern: /ports_file/i, what: "a ports-file option" },
  { pattern: /portsFile/, what: "a ports-file handle" },
  { pattern: /ports file/i, what: "a ports-file wait" },
  { pattern: /NatsHarness/, what: "the stock-binary harness, whose readiness signal is that poll" },
]

const offences = (path: string, source: string): ReadonlyArray<string> => {
  const found: Array<string> = []
  source.split("\n").forEach((line, index) => {
    for (const reach of reaches) {
      if (reach.pattern.test(line)) {
        found.push(`${path}:${index + 1}: reaches for ${reach.what}: ${line.trim()}`)
      }
    }
  })
  return found
}

// The detector's own control, executed before anything is reported. Each
// pattern is planted once; a pattern that no longer fires is reported here
// rather than quietly widening what the walk below accepts.
const planted = [
  `await waitFor(join(dir, "ports_file"))`,
  `const portsFile = await readPorts()`,
  `throw new Error("nats-server did not write its ports file")`,
  `import { startNatsHarness } from "./NatsHarness.js"`,
]
planted.forEach((line, index) => {
  if (offences("control", line).length === 0) {
    process.stdout.write(
      `control: the detector did not fire on planted sample ${index + 1}: ${line}\n`,
    )
  }
})

for (const path of suite) {
  let source: string
  try {
    source = readFileSync(resolve(repo, path), "utf8")
  } catch {
    process.stdout.write(`${path}: the daemon-backed suite names a file that is not there\n`)
    continue
  }
  for (const offence of offences(path, source)) process.stdout.write(`${offence}\n`)
}
