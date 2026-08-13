/**
 * The laws-index gate.
 *
 * `docs/LAWS.md` claims, for every law ID in the repository, where the law is
 * STATED and which test ENFORCES it. Claims rot. This script reads the index
 * and checks it against the tree in BOTH directions:
 *
 *   forward   every row's statement file exists and still names the law;
 *             every enforcer file exists, still names the law (when the row
 *             claims a checkable binding), and still contains the named test.
 *   reverse   every law ID that appears in a test file has a row. A law added
 *             without an index entry fails, so the index cannot go stale by
 *             omission.
 *
 * What this buys, precisely: "rewrite the comment and the law is gone" becomes
 * impossible to do quietly. Most of this repository's law statements live in
 * comment blocks above tests (EL0–EL10, WL1–WL4, EC1–EC4) — deleting one is a
 * one-line diff that no gate reads today. After this gate, it is a red build.
 *
 * What it does NOT buy: nothing here checks that the test actually tests the
 * law. A bound law is checkable, not sufficient (see CL1–CL5 in the index —
 * all five bound, all five defeatable by #37 G-01's fabricated corpus).
 *
 * Usage:
 *   bun scripts/check-laws.ts              # the gate
 *   bun scripts/check-laws.ts --self-test  # the negative controls
 *
 * A gate that cannot fail proves nothing (AGENTS.md). `--self-test` runs two
 * positive controls and plants one defect per failure rule, requiring each
 * attack to be caught by that rule alone.
 */

import { readFileSync, existsSync } from "node:fs"
import { join } from "node:path"
import { execSync } from "node:child_process"

const root = join(import.meta.dir, "..")
const indexPath = join(root, "docs/LAWS.md")

/** The families the reverse scan knows about. A new family must be added here AND to the index. */
const FAMILIES = ["W", "C", "EC", "EL", "WL", "GV", "RL", "TV", "CL", "SL"] as const
const ID_RE = /\b(?:EC|EL|WL|GV|RL|TV|CL|SL|W|C)[0-9]+\b/g

type Enforcer = { readonly path: string; readonly selector: string }
type Row = {
  readonly law: string
  readonly scanToken: string
  readonly stmtPath: string
  readonly stmtAnchor: string
  readonly enforcers: ReadonlyArray<Enforcer>
  readonly status: "BOUND" | "UNBOUND" | "DESIGN" | "NONE"
}

const AMBIGUOUS_REGISTRY = new Map<string, ReadonlyArray<string>>([
  ["C1", ["concierge:C1", "entity:C1"]],
  ["W1", ["proto-wire:W1", "catalog-model:W1"]],
  ["W2", ["proto-wire:W2", "catalog-model:W2"]],
  ["W3", ["proto-wire:W3", "catalog-model:W3"]],
  ["W4", ["proto-wire:W4", "catalog-model:W4"]],
  ["W5", ["proto-wire:W5", "catalog-model:W5"]],
])

// ------------------------------------------------------------------- parsing
const backticked = (cell: string): ReadonlyArray<string> =>
  [...cell.matchAll(/`([^`]+)`/g)].map((m) => m[1]!)

export const parseIndex = (markdown: string): ReadonlyArray<Row> => {
  const rows: Array<Row> = []
  for (const line of markdown.split("\n")) {
    if (!line.startsWith("|")) continue
    const cells = line.split("|").slice(1, -1).map((c) => c.trim())
    if (cells.length !== 4) continue
    const law = backticked(cells[0]!)[0]
    if (law === undefined) continue
    // The status-vocabulary table at the top has no law in column one that
    // parses as an ID; skip anything that is not a law token.
    if (!/^(?:[a-z][a-z0-9-]*:)?(?:EC|EL|WL|GV|RL|TV|CL|SL|W|C)[0-9]+$/.test(law)) continue
    const rawStatus = cells[3]!
    const status = rawStatus === "BOUND"
      ? "BOUND"
      : rawStatus === "UNBOUND"
        ? "UNBOUND"
        : rawStatus === "DESIGN"
          ? "DESIGN"
          : "NONE"
    const [stmtPath, stmtAnchorRaw] = (backticked(cells[1]!)[0] ?? "").split("#")
    const enforcers = backticked(cells[2]!).map((spec) => {
      const at = spec.indexOf("::")
      return at < 0
        ? { path: spec, selector: "" }
        : { path: spec.slice(0, at), selector: spec.slice(at + 2) }
    })
    const scanToken = law.includes(":") ? law.slice(law.lastIndexOf(":") + 1) : law
    rows.push({
      law,
      scanToken,
      stmtPath: stmtPath ?? "",
      stmtAnchor: stmtAnchorRaw ?? scanToken,
      enforcers,
      status,
    })
  }
  return rows
}

export const checkRegistryIds = (rows: ReadonlyArray<Row>): ReadonlyArray<string> => {
  const violations: Array<string> = []
  for (const [token, required] of AMBIGUOUS_REGISTRY) {
    const actual = rows.filter((row) => row.scanToken === token).map((row) => row.law)
    for (const law of actual) {
      if (!required.includes(law)) {
        violations.push(
          `${law}: ${token} is ambiguous and must use one of the context-qualified registry IDs ` +
            required.join(" or "),
        )
      }
    }
    for (const law of required) {
      if (!actual.includes(law)) {
        violations.push(`${law}: required context-qualified registry entry is missing`)
      }
    }
  }
  return violations
}

/** How far a law ID may sit from the test it binds, in lines. See `namesLawNear`. */
const BINDING_WINDOW = 30

/**
 * True when `id` appears as a standalone token within BINDING_WINDOW lines of
 * a line containing `selector`. With an empty selector this degrades to
 * "anywhere in the file", which is why every index row names a selector.
 */
export const namesLawNear = (content: string, id: string, selector: string): boolean => {
  const lines = content.split("\n")
  const token = new RegExp(String.raw`\b${id}\b`)
  if (selector === "") return lines.some((l) => token.test(l))
  const anchors = lines.flatMap((l, i) => (l.includes(selector) ? [i] : []))
  return anchors.some((a) =>
    lines
      .slice(Math.max(0, a - BINDING_WINDOW), a + BINDING_WINDOW + 1)
      .some((l) => token.test(l)),
  )
}

// -------------------------------------------------------------- the checking
/**
 * `files` maps repository-relative path -> content, for every path the index
 * cites. `testFiles` maps repository-relative path -> content for every test
 * file in the tree (the reverse scan's domain). Both are injected so
 * --self-test can attack the rules without touching the working tree.
 */
export const checkRows = (
  rows: ReadonlyArray<Row>,
  files: ReadonlyMap<string, string>,
  testFiles: ReadonlyMap<string, string>,
): ReadonlyArray<string> => {
  const violations: Array<string> = []
  const v = (msg: string) => violations.push(msg)
  const seen = new Set<string>()

  // A law ID is "bound in a test name" when it appears inside the string
  // literal that names a test. That is the binding the index calls BOUND for
  // TS; for Go the binding is the named func plus the ID somewhere in the file.
  const namedInSomeTest = (id: string): string | undefined => {
    const callRe = new RegExp(
      String.raw`(?:t\.Run|test|describe|it)\(\s*"[^"]*\b${id}\b[^"]*"`,
    )
    const goFuncRe = new RegExp(
      String.raw`\bfunc\s+Test[A-Za-z0-9_]*${id}(?![0-9])[A-Za-z0-9_]*\s*\(`,
    )
    for (const [path, content] of testFiles) {
      if (callRe.test(content) || goFuncRe.test(content)) return path
    }
    return undefined
  }

  for (const row of rows) {
    if (seen.has(row.law)) v(`${row.law}: duplicate row in the index`)
    seen.add(row.law)

    // --- statement ---------------------------------------------------------
    const stmt = files.get(row.stmtPath)
    if (stmt === undefined) {
      v(`${row.law}: statement file ${row.stmtPath} does not exist`)
    } else if (!stmt.includes(row.stmtAnchor)) {
      v(
        `${row.law}: statement file ${row.stmtPath} no longer contains ${JSON.stringify(row.stmtAnchor)} — ` +
          "the law lost its statement, or the index lost the law",
      )
    }

    // --- status/enforcer agreement ----------------------------------------
    if ((row.status === "NONE" || row.status === "DESIGN") && row.enforcers.length > 0) {
      v(`${row.law}: status is ${row.status} but the row names ${row.enforcers.length} enforcer(s)`)
    }
    if (row.status !== "NONE" && row.status !== "DESIGN" && row.enforcers.length === 0) {
      v(`${row.law}: status is ${row.status} but the row names no enforcer`)
    }

    // --- enforcers ---------------------------------------------------------
    for (const e of row.enforcers) {
      const content = files.get(e.path)
      if (content === undefined) {
        v(`${row.law}: enforcer file ${e.path} does not exist`)
        continue
      }
      if (e.selector !== "" && !content.includes(e.selector)) {
        v(
          `${row.law}: ${e.path} no longer contains ${JSON.stringify(e.selector)} — ` +
            "the enforcing test was renamed or deleted",
        )
      }
      // The binding is PROXIMITY, not mere co-occurrence. Two rules together:
      //
      //  - word boundary, so `func TestEC1` does not count as the file naming
      //    EC1 (otherwise every Go row satisfies its own binding by accident);
      //  - within BINDING_WINDOW lines of the named test, so a law ID sitting
      //    in an unrelated section of a 700-line test file cannot stand in for
      //    the comment that actually labels this test.
      //
      // Measured against the tree: every real binding in the index sits within
      // 29 lines of its test (the widest is TV4). The window is the smallest
      // round number above that, and it is deliberately not generous — a law
      // whose only mention is half a file away from its test is not bound.
      const namesLaw = namesLawNear(content, row.scanToken, e.selector)
      if (row.status === "BOUND" && !namesLaw) {
        v(
          `${row.law}: ${e.path} is claimed as a BOUND enforcer but does not name the law — ` +
            "the ID was rewritten out of the test, which is exactly the drift this gate exists for",
        )
      }
      if (row.status === "UNBOUND" && namesLaw) {
        v(
          `${row.law}: ${e.path} DOES name the law, so the row should be BOUND, not UNBOUND — ` +
            "an upgrade is not drift, but the index must say so",
        )
      }
    }

    // --- rows claiming no enforcement --------------------------------------
    if (row.status === "NONE") {
      const where = namedInSomeTest(row.scanToken)
      if (where !== undefined) {
        v(
          `${row.law}: the index says no test enforces it, but ${where} names it in a test — ` +
            "someone wrote the missing test and left the index claiming a hole",
        )
      }
    }
  }

  // --- reverse scan --------------------------------------------------------
  const indexed = new Set(rows.map((r) => r.scanToken))
  for (const [path, content] of testFiles) {
    for (const m of content.matchAll(ID_RE)) {
      const id = m[0]
      if (!indexed.has(id)) {
        v(
          `${id}: named in ${path} but absent from docs/LAWS.md — ` +
            "a law without an index entry is a law nothing checks",
        )
      }
    }
  }
  return [...new Set(violations)]
}

// ---------------------------------------------------------------- self-test
if (process.argv.includes("--self-test")) {
  const ok = (name: string, fired: boolean) => {
    console.log(`${fired ? "  as required" : "  CONTROL DID NOT FIRE"} — ${name}`)
    return fired ? 0 : 1
  }
  const files = (o: Record<string, string>) => new Map(Object.entries(o))
  let bad = 0

  // Synthetic rows use real family tokens on purpose: a self-test that used
  // invented IDs would parse to zero rows and every control would "pass" by
  // checking nothing — which is the exact failure this file exists to prevent.
  const honestRows = parseIndex(
    "| `EC1` | `spec.md` | `x_test.go::func TestEC1` | BOUND |\n" +
      "| `EC2` | `spec.md` | — | — |",
  )
  if (honestRows.length !== 2) {
    console.error(`SELF-TEST FAIL: the synthetic index parsed to ${honestRows.length} rows, want 2.`)
    process.exit(1)
  }
  const honestFiles = files({
    "spec.md": "EC1 the first law\nEC2 the second law",
    "x_test.go": "// EC1\nfunc TestEC1(t *testing.T) {}",
  })
  const honestTests = files({ "x_test.go": "// EC1\nfunc TestEC1(t *testing.T) {}" })

  bad += ok(
    "an honest index must PASS (the gate has to be able to pass)",
    checkRows(honestRows, honestFiles, honestTests).length === 0,
  )
  bad += ok(
    "a statement file that no longer names the law",
    checkRows(honestRows, files({ ...Object.fromEntries(honestFiles), "spec.md": "nothing here" }), honestTests)
      .some((s) => s.includes("lost its statement")),
  )
  bad += ok(
    "an enforcing test that was renamed away",
    checkRows(
      honestRows,
      files({ ...Object.fromEntries(honestFiles), "x_test.go": "// EC1\nfunc TestSomethingElse() {}" }),
      honestTests,
    ).some((s) => s.includes("renamed or deleted")),
  )
  bad += ok(
    "the ID rewritten out of a BOUND enforcer (the comment-deletion attack)",
    checkRows(
      honestRows,
      files({ ...Object.fromEntries(honestFiles), "x_test.go": "func TestEC1(t *testing.T) {}" }),
      honestTests,
    ).some((s) => s.includes("does not name the law")),
  )
  bad += ok(
    "a statement file that vanished",
    checkRows(honestRows, files({ "x_test.go": "// EC1\nfunc TestEC1(t *testing.T) {}" }), honestTests)
      .some((s) => s.includes("does not exist")),
  )
  bad += ok(
    "a law named in a test but absent from the index",
    checkRows(honestRows, honestFiles, files({ "y_test.go": 'test("EC9: a new law", () => {})' }))
      .some((s) => s.startsWith("EC9:")),
  )
  bad += ok(
    "a row claiming NO enforcement while a test now names the law",
    checkRows(honestRows, honestFiles, files({ "z_test.go": 'test("EC2 now checked", () => {})' })).some(
      (s) => s.includes("left the index claiming a hole"),
    ),
  )
  bad += ok(
    "a Go row claiming NO enforcement while a Test function now names the law",
    checkRows(honestRows, honestFiles, files({ "z_test.go": "func TestEC2Refused(t *testing.T) {}" })).some(
      (s) => s.includes("left the index claiming a hole"),
    ),
  )
  bad += ok(
    "a row claiming UNBOUND whose enforcer does name the law",
    checkRows(
      parseIndex("| `EC1` | `spec.md` | `x_test.go::func TestEC1` | UNBOUND |"),
      honestFiles,
      honestTests,
    ).some((s) => s.includes("should be BOUND")),
  )
  bad += ok(
    "a duplicated law row",
    checkRows([...honestRows, honestRows[0]!], honestFiles, honestTests).some((s) =>
      s.includes("duplicate row"),
    ),
  )
  const completeRegistry = parseIndex(
    "| `concierge:C1` | `spec.md` | `x_test.go::func TestC1` | BOUND |\n" +
      "| `entity:C1` | `spec.md` | `x_test.go::func TestC1` | BOUND |\n" +
      [...AMBIGUOUS_REGISTRY]
        .filter(([token]) => token.startsWith("W"))
        .flatMap(([, ids]) => ids.map((id) => `| \`${id}\` | \`spec.md\` | — | DESIGN |`))
        .join("\n"),
  )
  bad += ok(
    "a complete context-qualified collision registry must PASS",
    checkRegistryIds(completeRegistry).length === 0,
  )
  bad += ok(
    "an ambiguous source-local ID left unqualified",
    checkRegistryIds([...completeRegistry, ...parseIndex("| `C1` | `spec.md` | — | DESIGN |")]).some(
      (s) => s.includes("is ambiguous"),
    ),
  )
  bad += ok(
    "one missing side of a context-qualified collision",
    checkRegistryIds(completeRegistry.filter((row) => row.law !== "entity:C1")).some(
      (s) => s.includes("entity:C1") && s.includes("missing"),
    ),
  )

  if (bad > 0) {
    console.error(`SELF-TEST FAIL: ${bad} control(s) missed their required verdict; this gate proves nothing.`)
    process.exit(1)
  }
  console.log("SELF-TEST PASS: 13 controls (2 positive, 11 attacks refuted on their own rules).")
  process.exit(0)
}

// --------------------------------------------------------------------- main
if (!existsSync(indexPath)) {
  console.error("docs/LAWS.md is missing — the laws index IS the gate's input.")
  process.exit(2)
}
const rows = parseIndex(readFileSync(indexPath, "utf8"))
if (rows.length === 0) {
  console.error("docs/LAWS.md parsed to zero law rows; the gate would pass vacuously. Refusing.")
  process.exit(2)
}

const tracked = execSync("git ls-files", { cwd: root, encoding: "utf8" }).trim().split("\n")
const testPaths = tracked.filter(
  (p) =>
    !p.startsWith("repos/") &&
    (/(^|\/)[^/]*_test\.go$/.test(p) || /^(packages\/[^/]+|proto\/ts)\/test\/.*\.ts$/.test(p)),
)

const cited = new Set<string>()
for (const r of rows) {
  cited.add(r.stmtPath)
  for (const e of r.enforcers) cited.add(e.path)
}
const load = (p: string): string | undefined => {
  const full = join(root, p)
  return existsSync(full) ? readFileSync(full, "utf8") : undefined
}
const files = new Map<string, string>()
for (const p of [...cited, ...testPaths]) {
  const c = load(p)
  if (c !== undefined) files.set(p, c)
}
const testFiles = new Map<string, string>()
for (const p of testPaths) {
  const c = files.get(p)
  if (c !== undefined) testFiles.set(p, c)
}

const violations = [...checkRows(rows, files, testFiles), ...checkRegistryIds(rows)]
const counts = rows.reduce<Record<string, number>>((acc, r) => {
  acc[r.status] = (acc[r.status] ?? 0) + 1
  return acc
}, {})

console.log(
  `laws indexed: ${rows.length}  (BOUND ${counts["BOUND"] ?? 0}, ` +
    `UNBOUND ${counts["UNBOUND"] ?? 0}, DESIGN ${counts["DESIGN"] ?? 0}, ` +
    `unenforced ${counts["NONE"] ?? 0})`,
)
console.log(`test files scanned: ${testFiles.size}`)
console.log(`families known to the reverse scan: ${FAMILIES.join(" ")}`)

const unenforced = rows.filter((r) => r.status === "NONE").map((r) => r.law)
if (unenforced.length > 0) {
  console.log(`laws with NO enforcing test (each one a finding): ${unenforced.join(" ")}`)
}

if (violations.length > 0) {
  console.error(`\nLAWS INDEX: DRIFT — ${violations.length} violation(s).\n`)
  for (const s of violations) console.error(`  - ${s}`)
  console.error(
    "\nThe index and the tree disagree. Fix the tree, or amend docs/LAWS.md in\n" +
      "the same commit that moved the law. Do not delete the row to make this pass.",
  )
  process.exit(1)
}
console.log("\nLAWS INDEX: CLEAN — every row checks out, and no law hides from the index.")
