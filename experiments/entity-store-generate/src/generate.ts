import { mkdirSync, readFileSync, writeFileSync } from "node:fs"
import { dirname, join, resolve } from "node:path"

type JsonObject = Record<string, unknown>

interface SourceFilePin {
  path: string
  gitBlobSha1: string
}

interface SourcePins {
  repository: string
  commit: string
  package: string
  files: Array<SourceFilePin>
}

interface InventoryVariant {
  variant: string
  tagLiteral: string
  unionIndex: number
  declLine: number
  tagDeclLine: number
  fields: Array<InventoryField>
  ctorParams: Array<ConstructorParameter>
}

interface InventoryField {
  name: string
  typeText: string
  kind: "data" | "closure" | "closure-bearing" | "derived-cache"
  kindBy: "syntax" | "name-table"
  declLine: number
  optional: boolean
}

interface ConstructorParameter {
  name: string
  typeText: string
  optional: boolean
  hasDefault: boolean
}

export interface InventoryV1 {
  schemaVersion: 1
  source: SourcePins
  extractor: {
    name: string
    instrument: string
    instrumentVersion: string
    mode: string
    nameTables: {
      closureBearing: Array<string>
      derivedCache: Array<string>
    }
  }
  counts: {
    variants: number
    unionAlias: number
    guardTags: number
    representationUnion: number
    runtimeArray: number
  }
  baseFields: Array<InventoryField>
  variants: Array<InventoryVariant>
}

export class InventoryValidationError extends Error {
  readonly code = "schema-invalid"

  constructor(readonly path: string, message: string) {
    super(`schema-invalid: ${path}: ${message}`)
    this.name = "InventoryValidationError"
  }
}

const fail = (path: string, message: string): never => {
  throw new InventoryValidationError(path, message)
}

const objectAt = (value: unknown, path: string): JsonObject => {
  if (value === null || typeof value !== "object" || Array.isArray(value)) {
    fail(path, "expected an object")
  }
  return value as JsonObject
}

const arrayAt = (value: unknown, path: string): Array<unknown> => {
  if (!Array.isArray(value)) fail(path, "expected an array")
  return value
}

const stringAt = (value: unknown, path: string): string => {
  if (typeof value !== "string") fail(path, "expected a string")
  return value
}

const booleanAt = (value: unknown, path: string): boolean => {
  if (typeof value !== "boolean") fail(path, "expected a boolean")
  return value
}

const naturalAt = (value: unknown, path: string): number => {
  if (typeof value !== "number" || !Number.isSafeInteger(value) || value < 0) {
    fail(path, "expected a non-negative safe integer")
  }
  return value
}

const stringArrayAt = (value: unknown, path: string): Array<string> =>
  arrayAt(value, path).map((entry, index) => stringAt(entry, `${path}[${index}]`))

const fieldAt = (value: unknown, path: string): InventoryField => {
  const field = objectAt(value, path)
  const kind = stringAt(field.kind, `${path}.kind`)
  if (!["data", "closure", "closure-bearing", "derived-cache"].includes(kind)) {
    fail(`${path}.kind`, `unsupported field kind ${JSON.stringify(kind)}`)
  }
  const kindBy = stringAt(field.kindBy, `${path}.kindBy`)
  if (!["syntax", "name-table"].includes(kindBy)) {
    fail(`${path}.kindBy`, `unsupported field provenance ${JSON.stringify(kindBy)}`)
  }
  return {
    name: stringAt(field.name, `${path}.name`),
    typeText: stringAt(field.typeText, `${path}.typeText`),
    kind: kind as InventoryField["kind"],
    kindBy: kindBy as InventoryField["kindBy"],
    declLine: naturalAt(field.declLine, `${path}.declLine`),
    optional: booleanAt(field.optional, `${path}.optional`)
  }
}

const constructorParameterAt = (value: unknown, path: string): ConstructorParameter => {
  const parameter = objectAt(value, path)
  return {
    name: stringAt(parameter.name, `${path}.name`),
    typeText: stringAt(parameter.typeText, `${path}.typeText`),
    optional: booleanAt(parameter.optional, `${path}.optional`),
    hasDefault: booleanAt(parameter.hasDefault, `${path}.hasDefault`)
  }
}

const variantAt = (value: unknown, path: string): InventoryVariant => {
  const variant = objectAt(value, path)
  return {
    variant: stringAt(variant.variant, `${path}.variant`),
    tagLiteral: stringAt(variant.tagLiteral, `${path}.tagLiteral`),
    unionIndex: naturalAt(variant.unionIndex, `${path}.unionIndex`),
    declLine: naturalAt(variant.declLine, `${path}.declLine`),
    tagDeclLine: naturalAt(variant.tagDeclLine, `${path}.tagDeclLine`),
    fields: arrayAt(variant.fields, `${path}.fields`).map((field, index) =>
      fieldAt(field, `${path}.fields[${index}]`)
    ),
    ctorParams: arrayAt(variant.ctorParams, `${path}.ctorParams`).map((parameter, index) =>
      constructorParameterAt(parameter, `${path}.ctorParams[${index}]`)
    )
  }
}

export const validateInventoryV1 = (value: unknown): InventoryV1 => {
  const inventory = objectAt(value, "$")
  if (inventory.schemaVersion !== 1) {
    fail("$.schemaVersion", "expected exactly 1")
  }

  const source = objectAt(inventory.source, "$.source")
  const extractor = objectAt(inventory.extractor, "$.extractor")
  const nameTables = objectAt(extractor.nameTables, "$.extractor.nameTables")
  const counts = objectAt(inventory.counts, "$.counts")

  return {
    schemaVersion: 1,
    source: {
      repository: stringAt(source.repository, "$.source.repository"),
      commit: stringAt(source.commit, "$.source.commit"),
      package: stringAt(source.package, "$.source.package"),
      files: arrayAt(source.files, "$.source.files").map((entry, index) => {
        const pin = objectAt(entry, `$.source.files[${index}]`)
        return {
          path: stringAt(pin.path, `$.source.files[${index}].path`),
          gitBlobSha1: stringAt(pin.gitBlobSha1, `$.source.files[${index}].gitBlobSha1`)
        }
      })
    },
    extractor: {
      name: stringAt(extractor.name, "$.extractor.name"),
      instrument: stringAt(extractor.instrument, "$.extractor.instrument"),
      instrumentVersion: stringAt(
        extractor.instrumentVersion,
        "$.extractor.instrumentVersion"
      ),
      mode: stringAt(extractor.mode, "$.extractor.mode"),
      nameTables: {
        closureBearing: stringArrayAt(
          nameTables.closureBearing,
          "$.extractor.nameTables.closureBearing"
        ),
        derivedCache: stringArrayAt(
          nameTables.derivedCache,
          "$.extractor.nameTables.derivedCache"
        )
      }
    },
    counts: {
      variants: naturalAt(counts.variants, "$.counts.variants"),
      unionAlias: naturalAt(counts.unionAlias, "$.counts.unionAlias"),
      guardTags: naturalAt(counts.guardTags, "$.counts.guardTags"),
      representationUnion: naturalAt(
        counts.representationUnion,
        "$.counts.representationUnion"
      ),
      runtimeArray: naturalAt(counts.runtimeArray, "$.counts.runtimeArray")
    },
    baseFields: arrayAt(inventory.baseFields, "$.baseFields").map((field, index) =>
      fieldAt(field, `$.baseFields[${index}]`)
    ),
    variants: arrayAt(inventory.variants, "$.variants").map((variant, index) =>
      variantAt(variant, `$.variants[${index}]`)
    )
  }
}

export const loadInventory = (path: string): InventoryV1 => {
  let parsed: unknown
  try {
    parsed = JSON.parse(readFileSync(path, "utf8"))
  } catch (error) {
    const detail = error instanceof Error ? error.message : String(error)
    throw new InventoryValidationError("$", `could not read JSON: ${detail}`)
  }
  return validateInventoryV1(parsed)
}

const constructorName = (tag: string): string => {
  if (/^[A-Za-z][A-Za-z0-9_]*$/.test(tag)) return `tag_${tag}`
  const encoded = new TextEncoder().encode(tag)
  return `tag_hex_${[...encoded].map((byte) => byte.toString(16).padStart(2, "0")).join("")}`
}

const leanString = (value: string): string => {
  let result = '"'
  for (const character of value) {
    const point = character.codePointAt(0)!
    if (character === '"') result += '\\"'
    else if (character === "\\") result += "\\\\"
    else if (character === "\n") result += "\\n"
    else if (character === "\r") result += "\\r"
    else if (character === "\t") result += "\\t"
    else if (point < 0x20 || point === 0x7f) result += `\\u{${point.toString(16)}}`
    else result += character
  }
  return result + '"'
}

const provenanceBanner = (inventory: InventoryV1): string =>
  `-- THIS FILE WAS AUTOMATICALLY GENERATED BY src/generate.ts; DO NOT EDIT. Inventory provenance: ${JSON.stringify(inventory.source)}`

const inventoryLean = (inventory: InventoryV1): string => {
  const banner = provenanceBanner(inventory)
  const constructors = inventory.variants
    .map((variant) => `  | ${constructorName(variant.tagLiteral)}`)
    .join("\n")
  const tagCases = inventory.variants
    .map(
      (variant) =>
        `  | .${constructorName(variant.tagLiteral)} => ${leanString(variant.tagLiteral)}`
    )
    .join("\n")
  const allVariants = inventory.variants
    .map((variant) => `.${constructorName(variant.tagLiteral)}`)
    .join(", ")

  return `${banner}
namespace EntityStoreGenerate

inductive InventoryVariant where
${constructors}
deriving DecidableEq

def tagOf : InventoryVariant → String
${tagCases}

def allVariants : List InventoryVariant := [${allVariants}]

theorem all_variants_complete (variant : InventoryVariant) : variant ∈ allVariants := by
  cases variant <;> decide

theorem tags_distinct : (allVariants.map tagOf).Nodup := by decide

theorem constructor_count : allVariants.length = ${inventory.variants.length} := by decide

end EntityStoreGenerate
`
}

const rootLean = (inventory: InventoryV1): string => `${provenanceBanner(inventory)}
import EntityStoreGenerate.Inventory
import EntityStoreGenerate.Fixtures
`

const GENERATED_FILES = [
  ".gitignore",
  "EntityStoreGenerate.lean",
  "EntityStoreGenerate/Inventory.lean",
  "lake-manifest.json",
  "lakefile.toml",
  "lean-toolchain"
] as const

const emittedFiles = (inventory: InventoryV1): Record<(typeof GENERATED_FILES)[number], string> => ({
  ".gitignore": "/.lake\n",
  "EntityStoreGenerate.lean": rootLean(inventory),
  "EntityStoreGenerate/Inventory.lean": inventoryLean(inventory),
  "lake-manifest.json":
    '{"version":"1.2.0","packagesDir":".lake/packages","packages":[],"name":"entity_store_generate","lakeDir":".lake","fixedToolchain":false}\n',
  "lakefile.toml": `name = "entity_store_generate"
version = "0.1.0"
defaultTargets = ["EntityStoreGenerate"]

[[lean_lib]]
name = "EntityStoreGenerate"
`,
  "lean-toolchain": "leanprover/lean4:v4.33.1\n"
})

export const generateProject = (inventoryPath: string, outputDirectory: string): Array<string> => {
  const inventory = loadInventory(inventoryPath)
  const files = emittedFiles(inventory)
  mkdirSync(outputDirectory, { recursive: true })
  for (const relativePath of GENERATED_FILES) {
    const outputPath = join(outputDirectory, relativePath)
    mkdirSync(dirname(outputPath), { recursive: true })
    writeFileSync(outputPath, files[relativePath], "utf8")
  }
  return [...GENERATED_FILES]
}

if (import.meta.main) {
  const inventoryPath = process.argv[2]
  if (inventoryPath === undefined) {
    console.error("usage: bun run src/generate.ts <inventory.json> [output-directory]")
    process.exit(2)
  }
  const outputDirectory = process.argv[3] ?? new URL("../generated", import.meta.url).pathname
  try {
    const files = generateProject(resolve(inventoryPath), resolve(outputDirectory))
    console.log(`generated ${files.length} files from ${inventoryPath}`)
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error))
    process.exit(1)
  }
}
