/**
 * The five tools, as the manifest declares them.
 *
 * Two spellings sit beside each other in this file on purpose:
 *
 * - the MIRROR (`code`), a literal transcription of the canonical
 *   schema code `Cas/Backend/Mcp.lean` emits for that tool. It is the
 *   drift tripwire — `manifest.ts` compares it, byte for byte through
 *   the canonical printer, against the generated document at boot —
 *   and it is the same discipline `ConformanceVector.ts` already runs
 *   against the vector emitter: a hand-mirror that is checked, never a
 *   second authority. Editing a mirror to make a boot gate pass is the
 *   defect the gate exists to catch.
 *
 * - the CARRIER (`parameters`/`success`), the Effect Schema the
 *   handler actually decodes and encodes through. It is the estate's
 *   own — `Cas.ConformanceVector.VectorNode` for the node document,
 *   `Cas.ContentId` for addresses, `Cas.Byte` for the version and tag
 *   plane — so nothing here mints a shape. The carrier says what the
 *   code deliberately cannot: the manifest types a payload `String`
 *   because the code language has no byte code, and the carrier says
 *   which string — hex, `Schema.Uint8ArrayFromHex`, the one spelling
 *   the vectors, `cas show --json`, and the wire already share.
 *
 * The mirror keeps the host honest about WHAT is served; the carrier
 * is HOW it is served. Neither is authoritative over the Lean estate.
 */
import { Schema } from "effect"
import { Tool, Toolkit } from "effect/unstable/ai"
import { Cas } from "../../src/index.ts"
import type { ServedTool, ToolCode, ToolCodeField, ToolCodeFields } from "./manifest.ts"

/* ── the mirrored codes ──────────────────────────────────────────── */

/** A struct field of the revision-0 tagged projection: every field the
 * manifest spells is required, so `optional` is always false. */
const field = (schema: ToolCode): ToolCodeField => ({ optional: false, schema })

const struct = (fields: ToolCodeFields): ToolCode => ({ _tag: "Struct", fields })

const array = (item: ToolCode): ToolCode => ({ _tag: "Array", item })

const stringCode: ToolCode = { _tag: "String" }
const integerCode: ToolCode = { _tag: "Integer" }

/** `Mcp.lean`'s `addressDoc`. */
const addressDoc = struct({ address: field(stringCode) })

/** `Mcp.lean`'s `emptyDoc`. */
const emptyDoc = struct({})

/** `Mcp.lean`'s `rootsDoc`. */
const rootsDoc = struct({ roots: field(array(stringCode)) })

/** `Mcp.lean`'s `nodeDoc` — the conformance-vector wire node, which is
 * the ONE node document across vectors, replay, and MCP. */
const nodeDoc = struct({
  payload: field(stringCode),
  refs: field(array(struct({
    expectedTag: field(integerCode),
    id: field(stringCode),
  }))),
  tag: field(integerCode),
  version: field(integerCode),
})

/** `Mcp.lean`'s `RunParams.schemaCode`. */
const runParamsDoc = struct({
  instructions: field(array(struct({
    payloadHex: field(stringCode),
    refs: field(array(struct({
      expectedTag: field(integerCode),
      source: field(integerCode),
    }))),
    tag: field(integerCode),
    version: field(integerCode),
  }))),
})

/** `Mcp.lean`'s `RunResult.schemaCode`. */
const runResultDoc = struct({
  word: field(array(struct({ address: field(stringCode) }))),
})

/* ── the mirrored descriptions ───────────────────────────────────── */

/** Transcribed from `Mcp.lean`'s `tools`. A tool teaches by use, and
 * what it says about itself is the estate's sentence, not the host's —
 * so these are compared at boot like the codes are. */
const description = {
  put:
    "Admit one node; the reply is its content address. Admission is the only gate: well-formedness, reference presence, and kind agreement are checked, duplicates are inert, collisions refuse.",
  load:
    "Load the node at an address, fail-closed: the frame is parsed exactly and the kind is answered as stored.",
  run:
    "Run a straight-line program: instructions in admission order, references naming earlier answers by index. The reply is the word — the run's history, byte-decidable evidence.",
  publishRoot: "Publish an address as a root.",
  listRoots: "List the published roots.",
}

/* ── the carrier schemas ─────────────────────────────────────────── */

/** An address, alone: the params of `cas_load` and `cas_publish_root`,
 * and the reply of `cas_put`. */
export const AddressDocument = Schema.Struct({ address: Cas.ContentId })

/** The empty document: `cas_list_roots`' params and
 * `cas_publish_root`'s reply. A publication answers nothing because
 * the store answers nothing — `RootStore.publish` is `void` and
 * idempotent.
 *
 * Spelled as a record of nothing rather than a struct of no fields:
 * `Schema.Struct({})` projects to `anyOf: [object, array]` in JSON
 * Schema, which is not an object schema and is not what an MCP tool's
 * input may be. This is Effect's own spelling for the case
 * (`Tool.EmptyParams`), and it projects to a plain empty object. */
export const EmptyDocument = Schema.Record(Schema.String, Schema.Never)

/** The published roots. */
export const RootsDocument = Schema.Struct({
  roots: Schema.Array(Cas.ContentId),
})

/** One straight-line reference: an expected kind tag and the index of
 * the earlier instruction whose answer it names. `source` is an ANSWER
 * INDEX and never an address — the projection theorem
 * `RunRef.ofPRef_lit` is what says the document cannot spell a literal,
 * and the carrier keeps that true by having no field for one. */
export const RunReference = Schema.Struct({
  expectedTag: Cas.Byte,
  source: Schema.Int.check(Schema.isGreaterThanOrEqualTo(0)),
})

/** One instruction. Always a put, never a load
 * (`RunInstruction.ofPLine_load`), and the payload arrives as hex —
 * the field is named `payloadHex` in the document itself. */
export const RunInstruction = Schema.Struct({
  version: Cas.Byte,
  tag: Cas.Byte,
  payloadHex: Schema.Uint8ArrayFromHex,
  refs: Schema.Array(RunReference),
})

/** A self-contained straight-line program. */
export const RunDocument = Schema.Struct({
  instructions: Schema.Array(RunInstruction),
})

/** The word: the run's history in admission order, one address per
 * instruction. */
export const WordDocument = Schema.Struct({
  word: Schema.Array(Schema.Struct({ address: Cas.ContentId })),
})

/* ── the refusal ─────────────────────────────────────────────────── */

/**
 * What a tool answers when the store refuses. The clause is the
 * library's own error tag and the detail is the CLI's own rendering,
 * so a refusal reads the same whether it arrives down a pipe or out of
 * a shell — one vocabulary, per the vocabulary law. Declared as the
 * tools' failure schema, which is what makes the MCP layer report it
 * as a tool error carrying this message instead of swallowing it as an
 * internal error.
 */
export class Refused extends Schema.TaggedError<Refused>()(
  "mcp/Refused",
  { clause: Schema.String, detail: Schema.String },
) {
  override get message(): string {
    return this.detail
  }
}

/* ── the tools ───────────────────────────────────────────────────── */

export const casPut = Tool.make("cas_put", {
  description: description.put,
  parameters: Cas.ConformanceVector.VectorNode,
  success: AddressDocument,
  failure: Refused,
  dependencies: [Cas.Store],
})
  // Admission is content-addressed: the same node admitted twice
  // answers the same address and changes nothing, so the write is
  // idempotent and never destructive.
  .annotate(Tool.Readonly, false)
  .annotate(Tool.Destructive, false)
  .annotate(Tool.Idempotent, true)
  .annotate(Tool.OpenWorld, false)

export const casLoad = Tool.make("cas_load", {
  description: description.load,
  parameters: AddressDocument,
  success: Cas.ConformanceVector.VectorNode,
  failure: Refused,
  dependencies: [Cas.Loader],
})
  .annotate(Tool.Readonly, true)
  .annotate(Tool.Destructive, false)
  .annotate(Tool.Idempotent, true)
  .annotate(Tool.OpenWorld, false)

export const casRun = Tool.make("cas_run", {
  description: description.run,
  parameters: RunDocument,
  success: WordDocument,
  failure: Refused,
  dependencies: [Cas.Store],
})
  .annotate(Tool.Readonly, false)
  .annotate(Tool.Destructive, false)
  .annotate(Tool.Idempotent, true)
  .annotate(Tool.OpenWorld, false)

export const casPublishRoot = Tool.make("cas_publish_root", {
  description: description.publishRoot,
  parameters: AddressDocument,
  success: EmptyDocument,
  failure: Refused,
  dependencies: [Cas.Loader, Cas.RootStore],
})
  // The published set only grows and publication is idempotent
  // (`RootStoreShape.publish`), so nothing here can remove a root.
  .annotate(Tool.Readonly, false)
  .annotate(Tool.Destructive, false)
  .annotate(Tool.Idempotent, true)
  .annotate(Tool.OpenWorld, false)

export const casListRoots = Tool.make("cas_list_roots", {
  description: description.listRoots,
  parameters: EmptyDocument,
  success: RootsDocument,
  failure: Refused,
  dependencies: [Cas.RootStore],
})
  .annotate(Tool.Readonly, true)
  .annotate(Tool.Destructive, false)
  .annotate(Tool.Idempotent, true)
  .annotate(Tool.OpenWorld, false)

/**
 * The toolkit, in the manifest's order.
 *
 * ## SEAM — `cas_emit_layers` (G6-a)
 *
 * When `SystemNode` + `EmitLayer` land, the verb is ONE row in
 * `Mcp.lean:298-319` plus a `manifestVersion` bump, and on this side:
 * one `Tool.make` below, one entry in `servedTools`, one handler in
 * `handlers.ts`, and `implementedManifestVersion` follows the bump.
 * The manifest row is Lean's to emit — nothing in this package may add
 * it, and the boot gate refuses a host that tries.
 *
 * ## SEAM — the CODE REGISTER (operator ruling, 2026-08-29)
 *
 * The five tools below are the FLOOR, not the interface. The ruled
 * default register is code: a client submits an estate document — a
 * schema code through the ingest door, a program document through
 * `Lift`/`decodeLift`, a described value like `SystemNode` — or a
 * TypeScript module composed against the emitted typed surfaces, and
 * the host routes it to the doors that already exist.
 *
 * Nothing in this file's shape has to change for that. A code register
 * is one more row of the same kind: a `Tool.make` whose `parameters`
 * carry the submitted document (or module text) and whose handler
 * dispatches to `Cas.CanonicalSchema.admitNode`, `Cas.Materialize`, or
 * the `Cas.Store` doors the handlers here already speak — the same
 * services, the same typed refusals, the same `Refused` clause on the
 * wire. What the register does NOT get is a second trust surface: the
 * gates carry all trust, so a submitted document earns admission the
 * way every other node does — at put, by decode-back, by word
 * equality — and a code register that bypassed them would be the
 * defect, not the feature.
 *
 * Three things it needs that this lane must not invent:
 *
 * 1. THE MANIFEST ROW. `Mcp.lean` is the authority on tool names,
 *    params, and results, and its rows are ruled. The row (and the
 *    `manifestVersion` bump it forces) is Lean's; the boot gate here
 *    refuses any host that serves a tool the manifest does not carry,
 *    which is exactly the protection that makes adding it safe.
 * 2. DISPATCH. Which door a submitted document goes to is decided by
 *    the document's own kind, not by a flag — the estate already has
 *    the kind registry that decides it.
 * 3. SANDBOXING, for the TypeScript half only. A submitted DOCUMENT
 *    needs none: it is data, and admission is its gate. A submitted
 *    MODULE is execution, and this host runs in the operator's own
 *    process over the operator's own store — so the isolation story
 *    (a worker, a fresh runtime, a capability-restricted context, and
 *    what the module is allowed to import) is a ruling this lane did
 *    not take and did not prejudge.
 */
export const casToolkit = Toolkit.make(
  casPut,
  casLoad,
  casRun,
  casPublishRoot,
  casListRoots,
)

/**
 * The served table in the manifest's vocabulary — what the boot gate
 * compares. The order is the manifest's order, and it is part of what
 * is compared.
 */
export const servedTools: ReadonlyArray<ServedTool> = [
  { name: "cas_put", description: description.put, params: nodeDoc, result: addressDoc },
  { name: "cas_load", description: description.load, params: addressDoc, result: nodeDoc },
  { name: "cas_run", description: description.run, params: runParamsDoc, result: runResultDoc },
  {
    name: "cas_publish_root",
    description: description.publishRoot,
    params: addressDoc,
    result: emptyDoc,
  },
  {
    name: "cas_list_roots",
    description: description.listRoots,
    params: emptyDoc,
    result: rootsDoc,
  },
]
