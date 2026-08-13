/**
 * Drives the "Refusal is a value" clip, and checks the wall while it does.
 *
 * Reads the Go driver's output (data/refusal-go.json), asks the TypeScript
 * `applyMerge` for the same refusal, and refuses to write anything unless the
 * two languages name the same fields. The message string rendered in the clip
 * is the Go `Error()` output verbatim; the field shape is asserted identical on
 * both sides of the cross-language wall.
 *
 *   cd docs/media/folding/scripts/refusal && go run .
 *   bun docs/media/folding/scripts/refusal.ts
 */

import { readFileSync, writeFileSync } from "node:fs"
import { dirname, join } from "node:path"
import { fileURLToPath } from "node:url"

import { applyMerge, event, MergeDuplicateSequence, type StreamEvent } from "@foldlab/core/stream"

const here = dirname(fileURLToPath(import.meta.url))
const dataDir = join(here, "..", "data")
const repoRoot = join(here, "..", "..", "..", "..")

// `effect` is a dependency of packages/core, not of this directory, so it is
// resolved from the package that owns it rather than from here.
const { Effect, Exit } = await import(
  Bun.resolveSync("effect", join(repoRoot, "packages", "core"))
) as typeof import("effect")

const go = JSON.parse(readFileSync(join(dataDir, "refusal-go.json"), "utf8")) as {
  tag: string
  source: string
  seq: number
  firstIndex: number
  duplicateIndex: number
  message: string
  payloads: ReadonlyArray<string>
}

const sources = new Map<string, ReadonlyArray<StreamEvent>>([[
  "orders",
  [
    event("orders", 0, go.payloads[0]!),
    event("orders", 1, go.payloads[1]!),
    event("orders", 2, go.payloads[2]!),
    event("orders", 1, go.payloads[3]!),
  ],
]])

const exit = Effect.runSyncExit(
  applyMerge({ picks: [{ stream: "orders", seq: 0 }, { stream: "orders", seq: 1 }, { stream: "orders", seq: 2 }] }, sources),
)

if (!Exit.isFailure(exit)) throw new Error("expected a refusal, got a value")
const found = Exit.findError(exit as never) as { _tag: string; success?: unknown }
const ts = found._tag === "Success" ? found.success : undefined
if (!(ts instanceof MergeDuplicateSequence)) throw new Error("expected MergeDuplicateSequence")

const agrees = ts._tag === go.tag && ts.source === go.source && ts.seq === go.seq &&
  ts.firstIndex === go.firstIndex && ts.duplicateIndex === go.duplicateIndex
if (!agrees) throw new Error("the two languages disagree about the refusal")

const out = {
  _provenance: "bun docs/media/folding/scripts/refusal.ts (after the go driver)",
  tag: ts._tag,
  fields: {
    source: ts.source,
    seq: ts.seq,
    firstIndex: ts.firstIndex,
    duplicateIndex: ts.duplicateIndex,
  },
  message: go.message,
  messageSource: "go/stream/stream.go MergeDuplicateSequence.Error()",
  payloads: go.payloads,
  crossLanguageAgreement: agrees,
}

writeFileSync(join(dataDir, "refusal-is-a-value.json"), `${JSON.stringify(out, null, 2)}\n`)
console.log(JSON.stringify(out, null, 2))
