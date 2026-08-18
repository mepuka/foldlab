/**
 * The generated kernel corpus, read as this harness's authority for what sort
 * a digest slot carries.
 *
 * Law 1 (root `AGENTS.md`, "the machine-generated type kernel IS the core")
 * makes a private candidate shape a defect rather than a style choice. Round 1
 * of this eval hand-authored nine ledger keys. One referent its battery named —
 * "the planted declaration" — was in none of them, and sixteen of the
 * seventeen confused calls in the entire population were models guessing at a
 * referent the ledger did not carry. The generated builder table names that
 * field `declaration` outright (`trigger`, `Digest(program)`), so the corpus
 * would have refused the ambiguity the hand-written ledger introduced. The
 * ledger is derived now, and the sorts it brands entries with are read out of
 * the generated module at generate time rather than retyped here.
 *
 * The module is loaded by path rather than by package import on purpose: this
 * eval is its own install island and declares no dependency on the package a
 * live seat owns. `KernelBuilder.generated.ts` carries one import and it is
 * `import type`, so loading it pulls in no runtime module of its own.
 *
 * @module
 */
import { pathToFileURL } from "node:url"

import { Effect, Schema } from "effect"

/** The generated module could not be loaded from the path it was sought at. */
export class CorpusUnavailableError extends Schema.TaggedError<CorpusUnavailableError>()(
  "CorpusUnavailableError",
  {
    path: Schema.String,
    cause: Schema.Defect(),
  },
) {}

/** The generated module loaded, and its shape is not the one read here. */
export class CorpusShapeError extends Schema.TaggedError<CorpusShapeError>()(
  "CorpusShapeError",
  {
    path: Schema.String,
    cause: Schema.Defect(),
  },
) {}

const DigestForm = Schema.Struct({
  form: Schema.Literal("digest"),
  kind: Schema.String,
})

const DigestOfForm = Schema.Struct({
  form: Schema.Literal("digestOf"),
  field: Schema.String,
})

const PlainForm = Schema.Struct({
  form: Schema.Literals(["kind", "value", "absent"]),
})

const BuilderField = Schema.Struct({
  name: Schema.String,
  model: Schema.String,
  form: Schema.Union([DigestForm, DigestOfForm, PlainForm]),
})

/**
 * Only the members this harness reads. The generated module carries more; a
 * struct decode ignores what it is not asked for, so a corpus that grows a
 * member does not break this reader, while a corpus that drops or reshapes one
 * of these fails as a typed error instead of as `undefined` three frames later.
 */
const CorpusModule = Schema.Struct({
  KERNEL_GENERATORS: Schema.Array(Schema.String),
  KERNEL_GENERATOR_FIELDS: Schema.Record(
    Schema.String,
    Schema.Array(BuilderField),
  ),
  KERNEL_BUILDER_PROVENANCE: Schema.Struct({
    command: Schema.String,
    corpus: Schema.String,
    generator: Schema.String,
    source: Schema.String,
  }),
})

export type BuilderField = typeof BuilderField.Type

export interface KernelCorpus {
  readonly generators: readonly string[]
  readonly fields: Readonly<Record<string, readonly BuilderField[]>>
  readonly provenance: {
    readonly command: string
    readonly corpus: string
    readonly generator: string
    readonly source: string
  }
}

const decodeCorpusModule = Schema.decodeUnknownEffect(CorpusModule)

/**
 * The generated builder module, relative to this harness's own directory. The
 * path is stated once so a corpus that moves is one edit and a loud failure
 * rather than a silent fallback.
 */
export const BUILDER_MODULE_PATH =
  "../../../packages/plait/src/kernel/KernelBuilder.generated.ts"

export const loadKernelCorpus = Effect.fn("loadKernelCorpus")(
  function*(path: string): Effect.fn.Return<
    KernelCorpus,
    CorpusUnavailableError | CorpusShapeError
  > {
    // A file URL rather than the raw path: an absolute Windows path is not a
    // valid module specifier, and the difference shows up only off Linux.
    const loaded = yield* Effect.tryPromise({
      try: () => import(pathToFileURL(path).href) as Promise<unknown>,
      catch: (cause) => new CorpusUnavailableError({ path, cause }),
    })
    const module = yield* decodeCorpusModule(loaded).pipe(
      Effect.mapError((cause) => new CorpusShapeError({ path, cause })),
    )

    return {
      generators: module.KERNEL_GENERATORS,
      fields: module.KERNEL_GENERATOR_FIELDS,
      provenance: module.KERNEL_BUILDER_PROVENANCE,
    }
  },
)

/**
 * The digest-carrying fields one generator declares, in the model's own
 * declaration order. A generator the corpus does not name yields none, which
 * is what makes an unresolved cross-walk a reported divergence rather than a
 * crash.
 */
export const corpusDigestFields = (
  corpus: KernelCorpus,
  generator: string,
): readonly BuilderField[] =>
  (corpus.fields[generator] ?? []).filter((field) =>
    field.form.form === "digest" || field.form.form === "digestOf"
  )

/** The declaration kind a generated digest field is branded with, when it fixes one. */
export const corpusFieldKind = (field: BuilderField): string | null =>
  field.form.form === "digest" ? field.form.kind : null
