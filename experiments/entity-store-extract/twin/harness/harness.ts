/*
 * Cross-instrument gate for the Stage-1 extractor pair (TOOLS.md admission
 * condition for lean4-tree-sitter): the TypeScript-compiler-API extractor and
 * the lean4-tree-sitter twin must derive the SAME inventory from the SAME
 * pinned bytes — byte-identical except the two fields that name the
 * instrument (`extractor.instrument`, `extractor.instrumentVersion`), which
 * each side must fill with its own declared identity.
 *
 * The git-blob pre-image identity is an Effect Schema here (operator ruling
 * 2026-08-28: "git blob should be an effect schema as the others") — the pin
 * table and every computed digest pass through the branded codec, never
 * through bare strings.
 *
 * Checks, in order (any failure is a loud non-zero exit):
 *   1. Pinned bytes: git blob SHA-1 of each src-cache file equals its pin.
 *   2. TS extractor output is byte-identical to the committed inventory.json.
 *   3. Twin runs twice byte-identically (determinism).
 *   4. Twin output equals the committed inventory byte-for-byte after
 *      normalizing exactly the two exempt instrument fields.
 *   5. Both inventories decode through the Inventory schema, and each
 *      declares its own expected instrument identity.
 */
import { createHash } from "node:crypto"
import { readFileSync } from "node:fs"
import { join } from "node:path"
import { Effect, Schema } from "effect"

// ---------- repo-relative paths ----------

const repoRoot = join(import.meta.dir, "..", "..", "..", "..")
const srcCacheDir = join(repoRoot, ".staging", "e2", "src-cache")
const extractDir = join(repoRoot, "experiments", "entity-store-extract")
const twinExe = join(import.meta.dir, "..", "extract-lean", ".lake", "build", "bin", "extract_twin")

// ---------- the git-blob identity, as a Schema (never a bare string) ----------

/** Git blob object id: SHA-1 over `"blob " <len> "\0" <bytes>`, hex, branded. */
export const GitBlobSha1 = Schema.String.check(
  Schema.isPattern(/^[0-9a-f]{40}$/u),
).pipe(Schema.brand("GitBlobSha1"))
export type GitBlobSha1 = typeof GitBlobSha1.Type

/** Git commit object id — same carrier, distinct brand: a commit id must
 * never satisfy a blob-id-typed seam by accident. */
export const GitCommitSha1 = Schema.String.check(
  Schema.isPattern(/^[0-9a-f]{40}$/u),
).pipe(Schema.brand("GitCommitSha1"))
export type GitCommitSha1 = typeof GitCommitSha1.Type

export const SourceFilePin = Schema.Struct({
  path: Schema.String,
  gitBlobSha1: GitBlobSha1,
})

const FieldEntry = Schema.Struct({
  name: Schema.String,
  typeText: Schema.String,
  kind: Schema.Literals(["data", "closure", "closure-bearing", "derived-cache"]),
  kindBy: Schema.Literals(["syntax", "name-table"]),
  declLine: Schema.Int,
  optional: Schema.Boolean,
})

const CtorParam = Schema.Struct({
  name: Schema.String,
  typeText: Schema.String,
  optional: Schema.Boolean,
  hasDefault: Schema.Boolean,
})

const VariantEntry = Schema.Struct({
  variant: Schema.String,
  tagLiteral: Schema.String,
  unionIndex: Schema.Int,
  declLine: Schema.Int,
  tagDeclLine: Schema.Int,
  fields: Schema.Array(FieldEntry),
  ctorParams: Schema.Array(CtorParam),
})

export const Inventory = Schema.Struct({
  schemaVersion: Schema.Literal(1),
  source: Schema.Struct({
    repository: Schema.Literal("Effect-TS/effect"),
    commit: GitCommitSha1,
    package: Schema.String,
    files: Schema.Array(SourceFilePin),
  }),
  extractor: Schema.Struct({
    name: Schema.String,
    instrument: Schema.String,
    instrumentVersion: Schema.String,
    mode: Schema.Literal("syntax-only"),
    nameTables: Schema.Struct({
      closureBearing: Schema.Array(Schema.String),
      derivedCache: Schema.Array(Schema.String),
    }),
  }),
  counts: Schema.Struct({
    variants: Schema.Int,
    unionAlias: Schema.Int,
    guardTags: Schema.Int,
    representationUnion: Schema.Int,
    runtimeArray: Schema.Int,
  }),
  baseFields: Schema.Array(FieldEntry),
  variants: Schema.Array(VariantEntry),
})

// ---------- declared pins (the extract.ts PIN table, schema-decoded) ----------

const decodePin = Schema.decodeUnknownSync(SourceFilePin)

const PINS = [
  decodePin({
    path: "packages/effect/src/SchemaAST.ts",
    gitBlobSha1: "e99d7f473b4ecc0e6ba919ddbc98bb0dace8fe40",
  }),
  decodePin({
    path: "packages/effect/src/SchemaRepresentation.ts",
    gitBlobSha1: "6282ab9cbf5c7a50b79580065881b5a6c5799aae",
  }),
] as const

const EXPECTED_INSTRUMENTS = {
  reference: { instrument: "typescript-compiler-api", instrumentVersion: "5.9.2" },
  twin: {
    instrument: "lean4-tree-sitter",
    instrumentVersion: "0.2.4+3a57f55e1401484251cfe80e26583d9ed94c82c8",
  },
} as const

// ---------- typed failures ----------

class PinMismatch extends Schema.TaggedError<PinMismatch>()("Harness/PinMismatch", {
  path: Schema.String,
  expected: GitBlobSha1,
  actual: GitBlobSha1,
}) {}

class ByteMismatch extends Schema.TaggedError<ByteMismatch>()("Harness/ByteMismatch", {
  what: Schema.String,
  firstDiffByte: Schema.Int,
}) {}

class InstrumentMismatch extends Schema.TaggedError<InstrumentMismatch>()(
  "Harness/InstrumentMismatch",
  { which: Schema.String, expected: Schema.String, actual: Schema.String },
) {}

class ExtractorRunFailed extends Schema.TaggedError<ExtractorRunFailed>()(
  "Harness/ExtractorRunFailed",
  { command: Schema.String, exitCode: Schema.Int, stderr: Schema.String },
) {}

// ---------- helpers ----------

const computeGitBlobSha1 = (bytes: Uint8Array): GitBlobSha1 => {
  const header = new TextEncoder().encode(`blob ${bytes.length}\0`)
  const h = createHash("sha1")
  h.update(header)
  h.update(bytes)
  return Schema.decodeUnknownSync(GitBlobSha1)(h.digest("hex"))
}

const firstDiff = (a: Uint8Array, b: Uint8Array): number => {
  const n = Math.min(a.length, b.length)
  for (let i = 0; i < n; i++) if (a[i] !== b[i]) return i
  return a.length === b.length ? -1 : n
}

/** Blank exactly the two exempt instrument fields, nothing else. */
const normalizeInstrument = (text: string): string =>
  text
    .replace(/"instrument": "[^"]*"/, '"instrument": "<exempt>"')
    .replace(/"instrumentVersion": "[^"]*"/, '"instrumentVersion": "<exempt>"')

const run = (cwd: string, cmd: Array<string>) =>
  Effect.gen(function* () {
    const proc = Bun.spawnSync(cmd, { cwd })
    if (proc.exitCode !== 0) {
      return yield* new ExtractorRunFailed({
        command: cmd.join(" "),
        exitCode: proc.exitCode,
        stderr: proc.stderr.toString(),
      })
    }
    return proc.stdout.toString()
  })

// ---------- the gate ----------

const gate = Effect.gen(function* () {
  // 1. pinned bytes through the branded codec
  for (const pin of PINS) {
    const file = pin.path.split("/").at(-1)!
    const bytes = readFileSync(join(srcCacheDir, file))
    const actual = computeGitBlobSha1(bytes)
    if (actual !== pin.gitBlobSha1) {
      return yield* new PinMismatch({ path: pin.path, expected: pin.gitBlobSha1, actual })
    }
  }
  yield* Effect.log("1. pinned bytes verified (git blob SHA-1, branded codec)")

  const committed = readFileSync(join(extractDir, "inventory.json"))

  // 2. reference extractor reproduces the committed inventory
  const tsOut = join("/tmp", "harness-ts-inventory.json")
  yield* run(extractDir, ["bun", "run", "src/extract.ts", srcCacheDir, tsOut])
  const tsBytes = readFileSync(tsOut)
  {
    const d = firstDiff(committed, tsBytes)
    if (d !== -1) {
      return yield* new ByteMismatch({ what: "ts-extractor vs committed inventory.json", firstDiffByte: d })
    }
  }
  yield* Effect.log("2. typescript-compiler-api extractor byte-identical to committed inventory")

  // 3. twin determinism: two fresh runs, identical bytes
  const twinOutA = join("/tmp", "harness-twin-a.json")
  const twinOutB = join("/tmp", "harness-twin-b.json")
  yield* run(repoRoot, [twinExe, srcCacheDir, twinOutA])
  yield* run(repoRoot, [twinExe, srcCacheDir, twinOutB])
  const twinA = readFileSync(twinOutA)
  {
    const d = firstDiff(twinA, readFileSync(twinOutB))
    if (d !== -1) {
      return yield* new ByteMismatch({ what: "twin run A vs twin run B", firstDiffByte: d })
    }
  }
  yield* Effect.log("3. twin deterministic across independent runs")

  // 4. twin vs committed, byte-identical modulo the two exempt fields
  {
    const na = new TextEncoder().encode(normalizeInstrument(committed.toString()))
    const nb = new TextEncoder().encode(normalizeInstrument(twinA.toString()))
    const d = firstDiff(na, nb)
    if (d !== -1) {
      return yield* new ByteMismatch({
        what: "twin vs committed inventory (instrument fields normalized)",
        firstDiffByte: d,
      })
    }
  }
  yield* Effect.log("4. twin byte-identical to committed inventory modulo instrument identity")

  // 5. both decode through the Inventory schema; instrument stanzas as declared
  const reference = yield* Schema.decodeUnknownEffect(Inventory)(JSON.parse(committed.toString()))
  const twin = yield* Schema.decodeUnknownEffect(Inventory)(JSON.parse(twinA.toString()))
  const expectations = [
    ["reference", reference, EXPECTED_INSTRUMENTS.reference],
    ["twin", twin, EXPECTED_INSTRUMENTS.twin],
  ] as const
  for (const [which, inv, expected] of expectations) {
    if (inv.extractor.instrument !== expected.instrument) {
      return yield* new InstrumentMismatch({
        which: `${which}.instrument`,
        expected: expected.instrument,
        actual: inv.extractor.instrument,
      })
    }
    if (inv.extractor.instrumentVersion !== expected.instrumentVersion) {
      return yield* new InstrumentMismatch({
        which: `${which}.instrumentVersion`,
        expected: expected.instrumentVersion,
        actual: inv.extractor.instrumentVersion,
      })
    }
    for (const [i, pin] of PINS.entries()) {
      const got = inv.source.files[i]
      if (got === undefined || got.path !== pin.path || got.gitBlobSha1 !== pin.gitBlobSha1) {
        return yield* new PinMismatch({
          path: pin.path,
          expected: pin.gitBlobSha1,
          actual: got?.gitBlobSha1 ?? Schema.decodeUnknownSync(GitBlobSha1)("0".repeat(40)),
        })
      }
    }
  }
  yield* Effect.log("5. both inventories decode; instrument identities and pins as declared")

  yield* Effect.log(
    `CROSS-INSTRUMENT GATE GREEN: ${twin.counts.variants} variants agree across ` +
      `${reference.extractor.instrument} and ${twin.extractor.instrument}`,
  )
})

await Effect.runPromise(gate).catch((error) => {
  console.error("CROSS-INSTRUMENT GATE RED:", error)
  process.exit(1)
})
