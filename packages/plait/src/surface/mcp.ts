/**
 * Plane: surface — entry points.
 *
 * The agent face: the kernel language served over MCP, served-equals-derived.
 *
 * The eight tools are NOT written here. They are read from the committed copy
 * of the model's own tool-schema projection — `fixtures/tools.schema.json`,
 * byte-identical to the emission the model's gate holds fresh — and served
 * verbatim: names, descriptions, and input schemas reach the wire as the
 * artifact's own values, because the pinned release's dynamic tools carry a
 * raw JSON schema through to the served listing untouched. A hand-written
 * schema twin has no seam to enter through.
 *
 * Every tool call routes through the engine, so judgment is the door's: an
 * unlawful sentence returns the taught row — reason, law, repair,
 * applicability, exactly the artifact's refusal shape — and a seam refusal
 * (a malformed digest, an absent carrier, a non-canonical value) returns the
 * estate refusal's own fields. The two vocabularies stay distinct on the
 * wire the way they are distinct in the estate: a door row speaks `reason`,
 * a seam refusal speaks `sort` and `kind`, and neither is dressed as the
 * other.
 *
 * The wire-name mapping below — which artifact field feeds which candidate
 * slot — is hand-carried, reviewed data under a Law 1 waiver: the corpus
 * provably carries no wire-name group (the naming rows live in the model's
 * reviewed projection manifest), and the owed repair is that manifest growing
 * an emitted wire-name group this module then consumes. Until then, the
 * artifact's own gate walls the names and this module walls its parity with
 * the artifact.
 *
 * Two model-faithful bounds, stated: `kernel_fold`, `kernel_trigger`, and
 * `kernel_spawn` answer with the verdict alone — the model's fold returns no
 * value and interprets trigger and spawn as world-identity — and integers in
 * results travel as decimal strings, because a JSON double cannot carry an
 * exact identity coordinate and the serving layer stringifies through JSON.
 *
 * @module
 */
import { readFileSync } from "node:fs"
import { resolve as resolvePath } from "node:path"

import { Effect, Layer } from "effect"
import type { Stdio } from "effect/Stdio"
import { McpProtocol, McpServer, Tool, Toolkit } from "effect/unstable/ai"

import { decodeJson, encodeJsonValue, type JsonValue } from "@foldlab/core/jcs"

import type { WireValue } from "../truth/Canonical.js"
import { digestOf, type Digest } from "../truth/Digest.js"
import { structuralRefusal, type Refusal } from "../truth/Refusal.js"
import { kernelIdentity } from "../kernel/KernelIdentity.js"
import type {
  KernelCandidateAct,
  KernelCandidatePredicate,
} from "../kernel/KernelDoor.js"
import { HOLE_STAGE_RANK, type DeclKind, type HoleStage } from "../kernel/KernelSdk.generated.js"
import { Engine, matchOutcome } from "../carriage/Engine.js"

/** One served tool, exactly as the committed artifact spells it. */
export interface ServedTool {
  readonly name: string
  readonly description: string
  readonly input_schema: Record<string, unknown>
}

interface ToolArtifact {
  readonly tools: ReadonlyArray<ServedTool>
}

const artifactPath = resolvePath(import.meta.dir, "../../fixtures/tools.schema.json")

let cachedBytes: string | undefined
let cachedArtifact: ToolArtifact | undefined

/** The committed artifact's exact bytes; the parity wall compares against these. */
export const artifactBytes = (): string => {
  if (cachedBytes === undefined) cachedBytes = readFileSync(artifactPath, "utf8")
  return cachedBytes
}

/** The served tool rows, parsed from the committed artifact and nothing else. */
export const servedTools = (): ReadonlyArray<ServedTool> => {
  if (cachedArtifact === undefined) {
    cachedArtifact = JSON.parse(artifactBytes()) as ToolArtifact
  }
  return cachedArtifact.tools
}

/**
 * The toolkit: one dynamic tool per artifact row. Dynamic tools carry the raw
 * JSON schema verbatim into the served listing, which is what makes
 * served-equals-derived a construction fact here rather than a diff to keep.
 */
export const kernelToolkit = () =>
  Toolkit.make(
    ...servedTools().map((row) =>
      Tool.dynamic(row.name, {
        description: row.description,
        parameters: row.input_schema as never,
      })
    ),
  )

/* ------------------------------------------------------------ wire reads */

const DIGEST_PREFIX = "sha256:"

const malformedField = (
  field: string,
  got: JsonValue,
  expected: string,
): Refusal =>
  structuralRefusal({
    kind: "malformed-value",
    law: "A tool call carries exactly the fields its served input schema declares, in their declared spellings.",
    path: [field],
    got,
    expected,
    next: [{
      subject: "tools.schema.json",
      note: "Follow the served input schema; every field is named for the value it carries.",
    }],
  })

/** Reads one wire digest: the literal prefix, then the runtime's spelling. */
const wireDigest = Effect.fn("mcp.wireDigest")(function* (
  field: string,
  value: unknown,
): Effect.fn.Return<Digest, Refusal> {
  if (typeof value !== "string" || !value.startsWith(DIGEST_PREFIX)) {
    return yield* malformedField(
      field,
      typeof value === "string" ? value : String(value),
      "the literal prefix sha256: followed by 64 lowercase hexadecimal characters",
    )
  }
  const bare = value.slice(DIGEST_PREFIX.length)
  // The width and alphabet are the digest schema's own; the guarded identity
  // seam re-judges them wherever a label is minted.
  yield* kernelIdentity(bare)
  return bare as Digest
})

/** Renders a runtime digest in the wire's spelling. */
const wireOf = (digest: Digest): string => `${DIGEST_PREFIX}${digest}`

/** Reads one canonical-bytes field: the text must BE its value's one form. */
const readCanonical = Effect.fn("mcp.readCanonical")(function* (
  field: string,
  value: unknown,
): Effect.fn.Return<WireValue, Refusal> {
  if (typeof value !== "string") {
    return yield* malformedField(field, String(value), "one canonical byte string")
  }
  const decoded = decodeJson(new TextEncoder().encode(value))
  if (!decoded.ok) {
    return yield* structuralRefusal({
      kind: "non-canonical-value",
      law: "A value travels as its one canonical byte form; bytes the constrained decoder refuses have no identity to name.",
      path: [field],
      got: decoded.refusal.reason,
      expected: "one RFC 8785 wire value",
      next: [{ subject: field, note: "Send the value's canonical uncompressed bytes." }],
    })
  }
  const reencoded = encodeJsonValue(decoded.value)
  if (!reencoded.ok || reencoded.bytes !== value) {
    return yield* structuralRefusal({
      kind: "non-canonical-value",
      law: "One canonical form exists; excess or non-canonical bytes refuse.",
      path: [field],
      got: value,
      expected: reencoded.ok ? reencoded.bytes : "one RFC 8785 canonical form",
      next: [{ subject: field, note: "Canonicalize before sending; the bytes are the identity." }],
    })
  }
  return decoded.value as WireValue
})

const string = (payload: Record<string, unknown>, field: string) => payload[field]

/** Every integer leaves as a decimal string, because doubles lose identities. */
const exact = (value: bigint | number): string => String(value)

const jsonSafe = (value: unknown): unknown => {
  if (typeof value === "bigint") return String(value)
  if (Array.isArray(value)) return value.map(jsonSafe)
  if (value !== null && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>).map(([key, member]) => [
        key,
        jsonSafe(member),
      ]),
    )
  }
  return value
}

/* ------------------------------------------------------------- results */

/**
 * The door's refusal, exactly as the artifact's refusal_result spells it:
 * the four taught fields and nothing else. No wrapper field is invented —
 * a result carrying `reason` IS a refusal, and a result carrying `sentence`
 * IS an admission, the same way the artifact distinguishes them.
 */
const rowRefused = (refusal: {
  readonly reason: string
  readonly law: string
  readonly repair: string
  readonly applicability: string
}) => ({
  reason: refusal.reason,
  law: refusal.law,
  repair: refusal.repair,
  applicability: refusal.applicability,
})

/** A seam refusal in the estate refusal's own fields; `kind` names it. */
const seamRefused = (refusal: Refusal) => ({
  sort: refusal.sort,
  kind: refusal.kind,
  law: refusal.law,
  path: [...refusal.path],
  got: jsonSafe(refusal.got),
  expected: jsonSafe(refusal.expected),
  next: refusal.next.map((step) => ({ subject: step.subject, note: step.note })),
})

/** An admitted sentence: its canonical encoding, exact integers as strings. */
const admitted = (
  encoded: ReadonlyArray<bigint>,
  extra: Record<string, unknown> = {},
) => ({
  sentence: encoded.map(exact),
  ...extra,
})

type ToolResult = Record<string, unknown>

const renderSeam = <A extends ToolResult>(
  effect: Effect.Effect<A, Refusal, Engine>,
): Effect.Effect<ToolResult, never, Engine> =>
  Effect.catch(effect, (refusal) => Effect.succeed(seamRefused(refusal)))

/* ------------------------------------------------------------- handlers */

const declareHandler = (payload: Record<string, unknown>) =>
  renderSeam(Effect.gen(function* () {
    const kind = string(payload, "kind") as DeclKind
    const value = yield* readCanonical("value", string(payload, "value"))
    const writ = yield* wireDigest("writ_digest", string(payload, "writ_digest"))
    const outcome = yield* Engine.pipe(
      Effect.flatMap((engine) => engine.declare({ kind, value, writ })),
    )
    return matchOutcome(outcome, {
      refused: (refused): ToolResult => rowRefused(refused.refusal),
      carried: (carried): ToolResult =>
        admitted(carried.encoded, { digest: wireOf(carried.landed.digest) }),
    })
  }))

const resolveHandler = (payload: Record<string, unknown>) =>
  renderSeam(Effect.gen(function* () {
    const kind = string(payload, "kind") as DeclKind
    const target = yield* wireDigest("digest", string(payload, "digest"))
    const outcome = yield* Engine.pipe(
      Effect.flatMap((engine) => engine.resolve({ kind, target })),
    )
    return matchOutcome(outcome, {
      refused: (refused): ToolResult => rowRefused(refused.refusal),
      carried: (carried): ToolResult => {
        const rendered = encodeJsonValue(carried.landed as JsonValue)
        return admitted(carried.encoded, {
          value: rendered.ok ? rendered.bytes : undefined,
        })
      },
    })
  }))

const emitHandler = (holder: string) => (payload: Record<string, unknown>) =>
  renderSeam(Effect.gen(function* () {
    const lane = yield* wireDigest("lane_digest", string(payload, "lane_digest"))
    const body = yield* readCanonical("body", string(payload, "body"))
    const outcome = yield* Engine.pipe(
      Effect.flatMap((engine) => engine.emit({ lane, event: body, holder })),
    )
    return matchOutcome(outcome, {
      refused: (refused): ToolResult => rowRefused(refused.refusal),
      carried: (carried): ToolResult =>
        admitted(carried.encoded, {
          digest: wireOf(carried.landed.digest),
          position: exact(carried.landed.position),
        }),
    })
  }))

const joinHandler = (holder: string) => (payload: Record<string, unknown>) =>
  renderSeam(Effect.gen(function* () {
    const cell = yield* wireDigest("cell_digest", string(payload, "cell_digest"))
    const contribution = yield* readCanonical("contribution", string(payload, "contribution"))
    const outcome = yield* Engine.pipe(
      Effect.flatMap((engine) =>
        engine.join({ cell, delta: [{ holder, value: contribution }] })
      ),
    )
    return matchOutcome(outcome, {
      refused: (refused): ToolResult => rowRefused(refused.refusal),
      carried: (carried): ToolResult =>
        admitted(carried.encoded, { state_digest: wireOf(carried.landed.digest) }),
    })
  }))

const decideHandler = (payload: Record<string, unknown>) =>
  renderSeam(Effect.gen(function* () {
    const register = yield* wireDigest("register_digest", string(payload, "register_digest"))
    const fence = string(payload, "token_fence")
    if (typeof fence !== "number" || !Number.isSafeInteger(fence)) {
      return yield* malformedField("token_fence", String(fence), "one exact integer")
    }
    const outcome = yield* readCanonical("outcome", string(payload, "outcome")).pipe(
      Effect.flatMap((value) =>
        Engine.pipe(Effect.flatMap((engine) =>
          engine.decide({ register, token: fence, outcome: value })
        ))
      ),
    )
    return matchOutcome(outcome, {
      refused: (refused): ToolResult => rowRefused(refused.refusal),
      carried: (carried): ToolResult =>
        admitted(carried.encoded, { landed_token: exact(carried.landed.token) }),
    })
  }))

const labelOfCanonical = Effect.fn("mcp.labelOfCanonical")(function* (
  field: string,
  value: unknown,
): Effect.fn.Return<bigint, Refusal> {
  const parsed = yield* readCanonical(field, value)
  return yield* kernelIdentity(yield* digestOf(parsed))
})

const labelOfDigestField = Effect.fn("mcp.labelOfDigestField")(function* (
  field: string,
  value: unknown,
): Effect.fn.Return<bigint, Refusal> {
  const digest = yield* wireDigest(field, value)
  return yield* kernelIdentity(digest)
})

const foldHandler = (payload: Record<string, unknown>) =>
  renderSeam(Effect.gen(function* () {
    const declared = yield* labelOfDigestField("reduction_digest", string(payload, "reduction_digest"))
    const lane = yield* labelOfDigestField("lane_digest", string(payload, "lane_digest"))
    const state = yield* labelOfDigestField("anchor_state", string(payload, "anchor_state"))
    const shard = string(payload, "shard")
    const floor = string(payload, "anchor_floor")
    const head = string(payload, "anchor_head")
    if (
      typeof shard !== "number" || typeof floor !== "number" || typeof head !== "number"
    ) {
      return yield* malformedField("shard", String(shard), "exact integers for shard, anchor_floor, anchor_head")
    }
    const query = yield* labelOfCanonical("query", string(payload, "query"))
    const candidate: KernelCandidateAct = {
      _tag: "fold",
      declared,
      anchor: {
        foldId: declared,
        lane,
        shard: BigInt(shard),
        floor: BigInt(floor),
        state,
        head: BigInt(head),
      },
      query: [{ _tag: "literal", value: query }],
    }
    const verdict = yield* Engine.pipe(Effect.flatMap((engine) => engine.offer(candidate)))
    return verdict.verdict === "refused" ? rowRefused(verdict) : admitted(verdict.encoded)
  }))

const triggerHandler = (payload: Record<string, unknown>) =>
  renderSeam(Effect.gen(function* () {
    const declaration = yield* labelOfDigestField(
      "declaration_digest",
      string(payload, "declaration_digest"),
    )
    const production = string(payload, "production")
    let predicate: KernelCandidatePredicate
    switch (production) {
      case "evidence-appears":
        predicate = {
          _tag: "evidenceAppears",
          lane: yield* labelOfDigestField("lane_digest", string(payload, "lane_digest")),
          pattern: yield* labelOfCanonical("pattern", string(payload, "pattern")),
        }
        break
      case "cell-reaches":
        predicate = {
          _tag: "cellReaches",
          cell: yield* labelOfDigestField("cell_digest", string(payload, "cell_digest")),
          threshold: yield* labelOfCanonical("threshold", string(payload, "threshold")),
        }
        break
      case "hole-reaches": {
        const hole = string(payload, "hole")
        const stage = string(payload, "stage")
        if (typeof hole !== "number" || typeof stage !== "string") {
          return yield* malformedField("hole", String(hole), "an exact integer hole and a stage name")
        }
        const rank = HOLE_STAGE_RANK[stage as HoleStage]
        predicate = {
          _tag: "holeReaches",
          hole: BigInt(hole),
          stage: rank === undefined ? -1n : rank,
        }
        break
      }
      case "outcome-landed":
        predicate = {
          _tag: "outcomeLanded",
          register: yield* labelOfDigestField("register_digest", string(payload, "register_digest")),
        }
        break
      case "head-advanced-past": {
        const shard = string(payload, "shard")
        const position = string(payload, "position")
        if (typeof shard !== "number" || typeof position !== "number") {
          return yield* malformedField("shard", String(shard), "exact integers for shard and position")
        }
        predicate = {
          _tag: "headAdvancedPast",
          lane: yield* labelOfDigestField("lane_digest", string(payload, "lane_digest")),
          shard: BigInt(shard),
          position: BigInt(position),
        }
        break
      }
      default:
        return yield* malformedField(
          "production",
          String(production),
          "one of the five monotone productions",
        )
    }
    const verdict = yield* Engine.pipe(Effect.flatMap((engine) =>
      engine.offer({ _tag: "trigger", predicate, declaration })
    ))
    return verdict.verdict === "refused" ? rowRefused(verdict) : admitted(verdict.encoded)
  }))

const spawnHandler = (payload: Record<string, unknown>) =>
  renderSeam(Effect.gen(function* () {
    const parent = yield* labelOfDigestField(
      "parent_writ_digest",
      string(payload, "parent_writ_digest"),
    )
    const request = yield* labelOfDigestField(
      "request_writ_digest",
      string(payload, "request_writ_digest"),
    )
    const verdict = yield* Engine.pipe(Effect.flatMap((engine) =>
      engine.offer({ _tag: "spawn", parent, request })
    ))
    return verdict.verdict === "refused" ? rowRefused(verdict) : admitted(verdict.encoded)
  }))

/** Options for the served face; the holder attributes what the tools land. */
export interface McpOptions {
  readonly holder: string
}

/**
 * The handlers, keyed by the artifact's own tool names. The record is checked
 * against the served rows at layer build: a tool with no handler, or a
 * handler naming no served tool, refuses to build — the parity is enforced,
 * not assumed.
 */
export const kernelHandlers = (options: McpOptions): Record<
  string,
  (payload: Record<string, unknown>) => Effect.Effect<ToolResult, never, Engine>
> => ({
  kernel_declare: declareHandler,
  kernel_resolve: resolveHandler,
  kernel_emit: emitHandler(options.holder),
  kernel_join: joinHandler(options.holder),
  kernel_fold: foldHandler,
  kernel_decide: decideHandler,
  kernel_trigger: triggerHandler,
  kernel_spawn: spawnHandler,
})

const mismatchedHandlers = (
  served: ReadonlyArray<string>,
  handled: ReadonlyArray<string>,
): Refusal =>
  structuralRefusal({
    kind: "malformed-value",
    law: "The served tool list and the handler record name the same tools; a served tool with no handler is a lie on the wire.",
    path: ["tools"],
    got: handled,
    expected: served,
    next: [{
      subject: "mcp.kernelHandlers",
      note: "Regenerate the artifact copy and align the handler record with its tool rows.",
    }],
  })

/**
 * The toolkit handlers layer: served rows and handler record verified against
 * each other, then registered. Requires the engine.
 */
export const handlersLayer = (
  options: McpOptions,
): Layer.Layer<never, Refusal, Engine> => {
  const toolkit = kernelToolkit()
  return Layer.effectDiscard(Effect.gen(function* () {
    const served = servedTools().map((row) => row.name).sort()
    const handlers = kernelHandlers(options)
    const handled = Object.keys(handlers).sort()
    if (served.join(",") !== handled.join(",")) {
      return yield* mismatchedHandlers(served, handled)
    }
    return undefined
  })).pipe(
    Layer.merge(toolkit.toLayer(kernelHandlers(options) as never) as Layer.Layer<never, never, Engine>),
  )
}

/**
 * The whole served face over stdio: the MCP server, the registered toolkit,
 * and the handlers, requiring the engine and the platform's stdio services.
 */
export const layerStdio = (
  options: McpOptions,
): Layer.Layer<never, Refusal, Engine | Stdio> =>
  McpServer.layerStdio({
    name: "plait-kernel",
    version: "0.0.0",
    protocols: [McpProtocol.v2025_06_18],
  }).pipe(
    // The serialization arm's argument error fires only on an empty protocol
    // list, and the list above is non-empty by construction.
    Layer.orDie,
    Layer.provideMerge(McpServer.toolkit(kernelToolkit() as never) as Layer.Layer<never>),
    Layer.provideMerge(handlersLayer(options)),
  ) as Layer.Layer<never, Refusal, Engine | Stdio>
