/**
 * The one-canonicalizer wall.
 *
 * Canonical bytes are identity in this estate: a program's content address is
 * the SHA-256 of its canonical serialization, and the daemon and carriage
 * paths compare those bytes. So a second canonicalizer is not a duplicated
 * helper, it is a second identity - and the two agree right up until the day
 * they do not, which is how `packages/plait` carried private twins of the
 * estate seam (`truth/CanonicalJson.ts` and `truth/SchemaCanonical.ts`) for as
 * long as it did. The justification was real while it lasted: the twins
 * carried unbounded integers and `@foldlab/core/jcs` carried RFC 8785 doubles.
 * The operator ruling of 2026-08-18 (DEV-807) moved the estate number domain
 * into the seam, which removed the divergence, which retired the twins
 * (DEV-804 slice C). This module is what keeps them retired.
 *
 * Three arms, each stating one way a twin comes back.
 *
 * 1. **The file returns.** Either retired module exists again at its own path.
 * 2. **The name returns.** A module under `src/` spells `CanonicalJson` or
 *    `SchemaCanonical`. Only {@link CANONICALIZER_HOME} may, because it is the
 *    seam's wrapper and the seam owns those names.
 * 3. **The shape returns under another name.** A module under `src/` carries
 *    the canonicalizer signature - a member-order sort next to a JSON
 *    serializer - which is what a canonical-JSON encoder is regardless of what
 *    its exports are called.
 *
 * The scan is over source bytes on purpose. A type-level walk would see only
 * what the compiler resolves, and the failure being prevented is a module that
 * compiles perfectly while writing different bytes.
 *
 * @module
 */
import { readdirSync, readFileSync } from "node:fs"
import { resolve } from "node:path"

/** The one module that may reach the canonical seam and wrap it. */
export const CANONICALIZER_HOME = "src/truth/Canonical.ts"

/** The private twins retired by DEV-804 slice C. Neither may exist again. */
export const RETIRED_TWINS = [
  "src/truth/CanonicalJson.ts",
  "src/truth/SchemaCanonical.ts",
] as const

/** The retired spellings. A module naming one is naming a twin. */
export const RETIRED_SPELLINGS = ["CanonicalJson", "SchemaCanonical"] as const

/**
 * The canonicalizer signature: a member-order sort beside a JSON serializer.
 * Every part has to be present, because each alone is ordinary - a `.sort(` is
 * a list, a `JSON.stringify` is a log line, and `Object.keys` is a walk. All
 * three in one module is a canonical-JSON encoder.
 */
export const CANONICALIZER_SIGNATURE = ["JSON.stringify", ".sort(", "Object.keys("] as const

/** One violation, with the file and line a reader repairs. */
export interface CanonicalizerFinding {
  /** Path relative to the package root, in POSIX spelling. */
  readonly path: string
  /** 1-based line, or 0 when the finding is about the file's existence. */
  readonly line: number
  /** The law the file drops. */
  readonly law: string
  /** What the file actually says. */
  readonly got: string
}

const walk = (root: string, relative: string, into: Array<string>): void => {
  for (const entry of readdirSync(resolve(root, relative), { withFileTypes: true })) {
    const next = relative === "" ? entry.name : `${relative}/${entry.name}`
    if (entry.isDirectory()) walk(root, next, into)
    else if (entry.name.endsWith(".ts")) into.push(next)
  }
}

/**
 * Reads every module under `src/` and reports every way a private
 * canonicalizer has come back. An empty report is the wall's green.
 */
export const inspectOneCanonicalizer = (
  packageRoot: string,
): ReadonlyArray<CanonicalizerFinding> => {
  const findings: Array<CanonicalizerFinding> = []
  const files: Array<string> = []
  walk(packageRoot, "src", files)
  const present = new Set(files)

  for (const twin of RETIRED_TWINS) {
    if (present.has(twin)) {
      findings.push({
        path: twin,
        line: 0,
        law: "A twin retired by DEV-804 slice C does not come back.",
        got: "the module exists again",
      })
    }
  }

  for (const path of files.sort()) {
    if (path === CANONICALIZER_HOME) continue
    const source = readFileSync(resolve(packageRoot, path), "utf8")
    const lines = source.split("\n")

    for (const [index, line] of lines.entries()) {
      for (const spelling of RETIRED_SPELLINGS) {
        if (!line.includes(spelling)) continue
        findings.push({
          path,
          line: index + 1,
          law:
            `Only ${CANONICALIZER_HOME} may spell a canonical-JSON encoder's name;` +
            " every other module reaches the seam through it or through @foldlab/core/jcs.",
          got: line.trim(),
        })
      }
    }

    const missing = CANONICALIZER_SIGNATURE.filter((token) => !source.includes(token))
    if (missing.length === 0) {
      const at = lines.findIndex((line) => line.includes("JSON.stringify"))
      findings.push({
        path,
        line: at + 1,
        law:
          "There is one canonical-JSON encoder in this package and it is the seam" +
          ` wrapped by ${CANONICALIZER_HOME}; a member sort beside a JSON serializer is a second one.`,
        got: `the module carries ${CANONICALIZER_SIGNATURE.join(", ")}`,
      })
    }
  }

  return findings
}

/** The findings as the gate prints them: one line per violation, stable order. */
export const formatFindings = (
  findings: ReadonlyArray<CanonicalizerFinding>,
): string =>
  findings
    .map((finding) => `  ${finding.path}:${finding.line} — ${finding.law}\n    got: ${finding.got}`)
    .join("\n")
