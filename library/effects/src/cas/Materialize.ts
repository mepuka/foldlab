/**
 * The materializer door — the generative direction of a described
 * schema.
 *
 * MATERIALIZE is the estate's word for exactly this: a canonical code,
 * held in the store as content, compiled to its fully typed runtime
 * carrier. Denotation flows to code and never the reverse (the
 * direction law: HOOVER ingests, EXECUTE mints, MATERIALIZE generates).
 * A materialization has two registers, and this module is both of them:
 *
 * - the VALIDATOR register — a live decision about a candidate value,
 *   thin over `Schema.decodeUnknownEffect` and adding nothing Effect
 *   already says;
 * - the SOURCE register — rendered TypeScript, printed by Effect's own
 *   `SchemaRepresentation.toCodeDocument`, stamped with the content
 *   address of the schema node it was materialized from so parity
 *   between the served text and the stored term is a digest check
 *   (R7, the served-equals-derived wall).
 *
 * **Both registers start from a REVIVED schema, by construction.** The
 * only way to get a `Materialized` is `fromStore` or `fromPayload`, and
 * both revive through `CanonicalSchema.fromRepresentation` before they
 * hand anything back. This is not a preference: `toCode` lives in a
 * FUNCTION-valued annotation and does not survive `toJson`, so a
 * persisted document generates nothing at all — code generation runs on
 * the live schema revival produces, and on nothing else. The
 * SchemaMaterialization suite pins that fact directly.
 *
 * Nothing here maintains a second registry, a second decoder, or a
 * second address: the revision switch is `CanonicalSchema.fromEnvelope`,
 * the reviver set is `CanonicalSchema.Revivers`, and the address is
 * either the store's own verified id or the digest of the very bytes
 * that were materialized.
 */
import { Effect, Schema, SchemaRepresentation, type SchemaAST } from "effect"
import { CasNodeInput, type ContentId } from "./Node.ts"
import {
  AddressScheme,
  CasLoader,
  CasSchemeVersion,
  encodeCasNode,
} from "./Store.ts"
import {
  canonicalJson,
  decodedVersionedEnvelope,
  ProjectionCodecFailure,
  type ProjectionError,
} from "./Value.ts"
import * as CanonicalSchema from "./CanonicalSchema.ts"

/** One materialized canonical schema: the live carrier revived out of
 * stored content, and the content address of the node it came from.
 *
 * The address is never supplied by a caller. It is the store's own
 * verified id (`fromStore`) or the digest of the payload bytes that
 * were materialized (`fromPayload`), which is what makes the source
 * register's stamp evidence rather than decoration. */
export interface Materialized {
  readonly address: ContentId
  readonly schema: Schema.Top
}

/** One binding of a materialized module: a materialization plus the
 * name it is exported under. */
export interface Binding extends Materialized {
  readonly name: string
}

/** Excess properties are a decode failure by default here, matching the
 * rest of the CAS plane: canonical content has exactly the fields its
 * code declares. A caller who wants Effect's laxer reading passes its
 * own options through. */
const strictOptions = {
  onExcessProperty: "error",
} satisfies SchemaAST.ParseOptions

/** Materialize the schema node at an address, through the store's read
 * seam. The loader re-verifies the resident bytes against the address,
 * so the id it was asked for IS the materialization's stamp. */
export const fromStore = (
  address: ContentId,
): Effect.Effect<Materialized, ProjectionError, CasLoader> =>
  CanonicalSchema.get(address).pipe(Effect.map((document) => ({
    address,
    schema: CanonicalSchema.fromRepresentation(document),
  })))

/** Materialize one schema node's payload bytes, held in hand rather
 * than fetched. The address is DERIVED: the bytes are re-verified as
 * canonical, wrapped in the schema node envelope they belong to, and
 * digested under the ambient address scheme. A caller cannot stamp a
 * materialization with an address its bytes do not hash to. */
export const fromPayload = (
  payload: Uint8Array,
): Effect.Effect<Materialized, ProjectionError, AddressScheme> =>
  Effect.gen(function* () {
    const envelope = yield* decodedVersionedEnvelope(payload)
    const document = yield* Effect.try({
      try: () => CanonicalSchema.fromEnvelope(envelope),
      catch: (issue) =>
        new ProjectionCodecFailure({
          direction: "decode",
          issue: String(issue),
        }),
    })
    const node = CasNodeInput.make({
      kind: { tag: CanonicalSchema.KindTag, version: CasSchemeVersion },
      payload,
      refs: [],
    })
    const address = yield* AddressScheme.use((scheme) =>
      scheme.digest(encodeCasNode(node))
    )
    return { address, schema: CanonicalSchema.fromRepresentation(document) }
  })

/** The VALIDATOR register: the decision a materialized schema makes
 * about one candidate value.
 *
 * Deliberately the thinnest possible surface — Effect's own decoder,
 * defaulted to the strict reading and otherwise untouched. There is no
 * estate-shaped result type, no re-spelled issue, and no second failure
 * taxonomy: `SchemaError` already says what went wrong, and wrapping it
 * would only lose Effect's own reporting. */
export const validator = (
  materialized: Materialized,
  options?: SchemaAST.ParseOptions,
): (input: unknown) => Effect.Effect<unknown, Schema.SchemaError> =>
  Schema.decodeUnknownEffect(
    materialized.schema as Schema.Codec<unknown, unknown>,
    options ?? strictOptions,
  )

/** The SOURCE register: rendered TypeScript for a set of
 * materializations, stamped with the addresses they were materialized
 * from.
 *
 * Pure and total in its inputs — the addresses already ride the
 * materializations, so the header cannot claim an address that was not
 * the one materialized. Generation itself is Effect's
 * `toCodeDocument`, run on the LIVE representation of each revived
 * schema; the estate adds only the module frame and the stamp.
 *
 * Fail-closed on everything the admitted subset does not yet reach: a
 * name that is not a TypeScript identifier, a duplicate name, a
 * representation that allocated a reference table (recursion — open
 * ruling 2), and a generated artifact that is not an import (enums and
 * unique symbols — neither is an admitted representation node yet). */
export const source = (bindings: ReadonlyArray<Binding>): string => {
  const seen = new Set<string>()
  for (const binding of bindings) {
    if (!/^[A-Za-z_$][A-Za-z0-9_$]*$/u.test(binding.name)) {
      throw new TypeError(
        `materialized binding name ${canonicalJson(binding.name)} is not a TypeScript identifier`,
      )
    }
    if (seen.has(binding.name)) {
      throw new TypeError(
        `materialized binding name ${canonicalJson(binding.name)} is declared twice`,
      )
    }
    seen.add(binding.name)
  }

  const representations = bindings.map((binding) => {
    // The live lowering: not JSON-round-tripped, so the `toCode`
    // annotations generation needs are still attached.
    const live = SchemaRepresentation.toRepresentation(binding.schema.ast)
    if (Object.keys(live.references).length > 0) {
      throw new TypeError(
        `materializing ${binding.name} needs a reference table, which the admitted subset does not carry`,
      )
    }
    return live.representation
  })

  const generated = representations.length === 0
    ? { artifacts: [], codes: [] }
    : SchemaRepresentation.toCodeDocument({
      references: {},
      representations: representations as [
        SchemaRepresentation.Representation,
        ...Array<SchemaRepresentation.Representation>,
      ],
    })

  const imports = [`import { Schema } from "effect"`]
  for (const artifact of generated.artifacts) {
    if (artifact._tag !== "Import") {
      throw new TypeError(
        `materialized source needs a ${artifact._tag} artifact, which the admitted subset does not carry`,
      )
    }
    if (!imports.includes(artifact.importDeclaration)) {
      imports.push(artifact.importDeclaration)
    }
  }

  const stamps = bindings.map((binding) =>
    ` *   - ${binding.name} — ${binding.address}`
  )
  const header = [
    `/**`,
    ` * GENERATED — do not edit. Materialized from canonical schema nodes`,
    ` * by \`Cas.Materialize.source\`: every binding below is what Effect's`,
    ` * own \`SchemaRepresentation.toCodeDocument\` prints for the schema`,
    ` * revived out of the addressed node. The addresses are the stamp`,
    ` * that makes this file a projection of store content and parity a`,
    ` * digest check (R7, the served-equals-derived wall) — regenerate,`,
    ` * never edit.`,
    ` *`,
    ` * Materialized from schema nodes (kind tag 0x${
      CanonicalSchema.KindTag.toString(16)
    }):`,
    ...stamps,
    ` */`,
  ]

  const declarations = bindings.map((binding, index) => {
    const code = generated.codes[index]!
    return [
      `export const ${binding.name} = ${code.runtime}`,
      ``,
      `export type ${binding.name} = ${code.Type}`,
    ].join("\n")
  })

  return `${[...header, ...imports, ``, declarations.join("\n\n")].join("\n")}\n`
}

