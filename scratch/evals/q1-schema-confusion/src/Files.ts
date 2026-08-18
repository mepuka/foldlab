import { Effect, FileSystem, Schema } from "effect"

import { RunRecordSchema, ToolDocumentSchema, type RunRecord } from "./Domain.ts"
import type { ToolDocument } from "./Projection.ts"

export class EvalFileError extends Schema.TaggedError<EvalFileError>()(
  "EvalFileError",
  {
    operation: Schema.String,
    path: Schema.String,
    cause: Schema.Defect(),
  },
) {}

export class ExternalDecodeError extends Schema.TaggedError<ExternalDecodeError>()(
  "ExternalDecodeError",
  {
    path: Schema.String,
    raw_head: Schema.String,
    cause: Schema.Defect(),
  },
) {}

const decodeToolDocument = Schema.decodeUnknownEffect(
  Schema.fromJsonString(ToolDocumentSchema),
)

export const readToolDocument = Effect.fn("readToolDocument")(
  function*(path: string): Effect.fn.Return<
    ToolDocument,
    EvalFileError | ExternalDecodeError,
    FileSystem.FileSystem
  > {
    const fileSystem = yield* FileSystem.FileSystem
    const raw = yield* fileSystem.readFileString(path).pipe(
      Effect.mapError((cause) => new EvalFileError({
        operation: "readToolDocument",
        path,
        cause,
      })),
    )
    return yield* decodeToolDocument(raw).pipe(
      Effect.mapError((cause) => new ExternalDecodeError({
        path,
        raw_head: raw.slice(0, 512),
        cause,
      })),
    )
  },
)

export const readToolDocumentSource = Effect.fn("readToolDocumentSource")(
  function*(path: string): Effect.fn.Return<
    { readonly raw: string; readonly document: ToolDocument },
    EvalFileError | ExternalDecodeError,
    FileSystem.FileSystem
  > {
    const fileSystem = yield* FileSystem.FileSystem
    const raw = yield* fileSystem.readFileString(path).pipe(
      Effect.mapError((cause) => new EvalFileError({
        operation: "readToolDocumentSource",
        path,
        cause,
      })),
    )
    const document = yield* decodeToolDocument(raw).pipe(
      Effect.mapError((cause) => new ExternalDecodeError({
        path,
        raw_head: raw.slice(0, 512),
        cause,
      })),
    )
    return { raw, document }
  },
)

export const makeDirectory = Effect.fn("makeDirectory")(
  function*(path: string): Effect.fn.Return<
    void,
    EvalFileError,
    FileSystem.FileSystem
  > {
    const fileSystem = yield* FileSystem.FileSystem
    yield* fileSystem.makeDirectory(path, { recursive: true }).pipe(
      Effect.mapError((cause) => new EvalFileError({
        operation: "makeDirectory",
        path,
        cause,
      })),
    )
  },
)

export const writeText = Effect.fn("writeText")(
  function*(path: string, content: string): Effect.fn.Return<
    void,
    EvalFileError,
    FileSystem.FileSystem
  > {
    const fileSystem = yield* FileSystem.FileSystem
    yield* fileSystem.writeFileString(path, content).pipe(
      Effect.mapError((cause) => new EvalFileError({
        operation: "writeText",
        path,
        cause,
      })),
    )
  },
)

/**
 * The file's bytes, or `null` when it is absent. The check arm needs absence
 * to be an answer rather than a failure: "committed and no longer generated"
 * and "generated and never committed" are two different reds, and a read that
 * threw could report neither.
 */
export const readTextIfPresent = Effect.fn("readTextIfPresent")(
  function*(path: string): Effect.fn.Return<
    string | null,
    EvalFileError,
    FileSystem.FileSystem
  > {
    const fileSystem = yield* FileSystem.FileSystem
    const present = yield* fileSystem.exists(path).pipe(
      Effect.mapError((cause) => new EvalFileError({
        operation: "readTextIfPresent",
        path,
        cause,
      })),
    )
    if (!present) return null
    return yield* fileSystem.readFileString(path).pipe(
      Effect.mapError((cause) => new EvalFileError({
        operation: "readTextIfPresent",
        path,
        cause,
      })),
    )
  },
)

const decodeRunRecord = Schema.decodeUnknownEffect(
  Schema.fromJsonString(RunRecordSchema),
)

export const readRunRecords = Effect.fn("readRunRecords")(
  function*(path: string): Effect.fn.Return<
    readonly RunRecord[],
    EvalFileError | ExternalDecodeError,
    FileSystem.FileSystem
  > {
    const fileSystem = yield* FileSystem.FileSystem
    const raw = yield* fileSystem.readFileString(path).pipe(
      Effect.mapError((cause) => new EvalFileError({
        operation: "readRunRecords",
        path,
        cause,
      })),
    )
    const lines = raw.split("\n").filter((line) => line.length > 0)
    return yield* Effect.forEach(lines, (line, index) =>
      decodeRunRecord(line).pipe(
        Effect.mapError((cause) => new ExternalDecodeError({
          path: `${path}:${index + 1}`,
          raw_head: line.slice(0, 512),
          cause,
        })),
      )
    )
  },
)

export const writeRunRecords = (
  path: string,
  records: readonly RunRecord[],
): Effect.Effect<void, EvalFileError, FileSystem.FileSystem> =>
  writeText(path, `${records.map((record) => JSON.stringify(record)).join("\n")}\n`)
