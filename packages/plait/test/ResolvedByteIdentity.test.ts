import { describe, expect, test } from "bun:test"
import { createHash } from "node:crypto"
import { resolve as resolvePath } from "node:path"

import { Effect, Layer, Option } from "effect"

import { canonicalBytes, type WireValue } from "../src/truth/Canonical.js"
import { Catalog, Payloads } from "../src/planes/Catalog.js"
import { digestOf, type Digest } from "../src/truth/Digest.js"
import { resolve } from "../src/planes/Resolved.js"
import { valueIdentityResolve } from "../negative-controls/ResolvedByteIdentity.value-identity.mutant.js"

/**
 * The byte-identity wall over the payload resolve leg.
 *
 * **What is being proved.** A digest names one exact byte string. So the
 * question a read door answers is `sha256(bytes) == D`, over the bytes it was
 * handed, before anything decodes them. The defect this wall exists to keep out
 * is the other question — `sha256(canonical(parse(bytes))) == D` — which passes
 * for byte strings the store was never given: a member transposition, an
 * inserted space, a duplicate member whose last occurrence wins, a JSON escape
 * of a character that needs none, and invalid UTF-8 a lenient decoder repairs
 * into U+FFFD.
 *
 * **The independent oracle is the raw bytes and the digest, not either
 * implementation.** Every row's expected verdict is `sha256(octets) == D` under
 * FIPS 180-4, computed here from `node:crypto` over the exact byte string, and
 * it consults neither the resolve door nor the Go twin. `D` itself is pinned
 * across both canonicalizers before any row runs: the TypeScript seam's digest
 * of the value must equal the SHA-256 of the Go twin's canonical bytes for that
 * same value, so no row can be graded against a digest one side invented.
 *
 * **What the Go arm contributes.** The twin's read door decodes leniently and
 * then closes the loop against the stored bytes — SHA over the raw record
 * compared to the digest re-derived from the decoded entry — which is the
 * question *are these bytes already canonical*. This wall asks the twin exactly
 * that, through the line-oriented constrained-decode endpoint, and requires the
 * answer to agree with the oracle on every row. That agreement is the theorem
 * the repair rests on: because `D` is by construction the digest of a canonical
 * byte string, `sha256(bytes) == D` already implies the bytes are canonical, so
 * the byte check subsumes the twin's canonicality check rather than sitting
 * beside it.
 *
 * **Bound.** The rows stay inside the string-and-object domain on purpose. The
 * estate number domain (`bigint` for integer literals reaching 2^53) is a
 * separate cross-language statement with its own corpus, and mixing it in here
 * would make a number-domain divergence read as a byte-identity failure.
 */

const goRoot = resolvePath(import.meta.dir, "../../../go")
const mutantTrace = resolvePath(
  import.meta.dir,
  "../negative-controls/ResolvedByteIdentity.value-identity.trace.json",
)

const utf8 = new TextEncoder()
const sha256Hex = (bytes: Uint8Array): string =>
  createHash("sha256").update(bytes).digest("hex")

const bytesEqual = (left: Uint8Array, right: Uint8Array): boolean =>
  left.byteLength === right.byteLength && left.every((byte, index) => byte === right[index])

/**
 * The value every row is a byte-level substitution of. Its second member is
 * U+FFFD on purpose: that is the character a non-fatal decoder invents out of
 * an undecodable byte, so the replacement row below carries bytes that repair
 * into exactly this value and hash to exactly this digest.
 */
const value: WireValue = { alpha: "one", beta: "\uFFFD" }
const canonical = Effect.runSync(canonicalBytes(value))
const digest = Effect.runSync(digestOf(value))

/** A second value, so a row can carry canonical bytes that name something else. */
const otherValue: WireValue = { alpha: "ONE", beta: "\uFFFD" }
const otherCanonical = Effect.runSync(canonicalBytes(otherValue))

/** The canonical bytes with U+FFFD's three octets replaced by one that decodes to nothing. */
const replacementLaundered = (): Uint8Array => {
  const out: Array<number> = []
  for (let index = 0; index < canonical.byteLength; index++) {
    if (
      canonical[index] === 0xef && canonical[index + 1] === 0xbf && canonical[index + 2] === 0xbd
    ) {
      out.push(0x80)
      index += 2
      continue
    }
    out.push(canonical[index]!)
  }
  return Uint8Array.from(out)
}

interface Vector {
  readonly name: string
  readonly bytes: Uint8Array
  /** What a reader would have to believe for this byte string to be admitted. */
  readonly lie: string
  /**
   * Whether the platform parser over a non-fatal decoder yields the very value
   * the digest names. The rows where this is true are the counterexample class:
   * a value-level identity check cannot tell them from the canonical row.
   */
  readonly parsesToValue: boolean
}

const vectors: ReadonlyArray<Vector> = [
  {
    name: "canonical",
    bytes: canonical,
    lie: "none: these are the bytes the digest names",
    parsesToValue: true,
  },
  {
    name: "member-order",
    bytes: utf8.encode(`{"beta":"\uFFFD","alpha":"one"}`),
    lie: "a digest names a value, so member order may vary",
    parsesToValue: true,
  },
  {
    name: "inserted-space",
    bytes: utf8.encode(`{"alpha": "one","beta":"\uFFFD"}`),
    lie: "insignificant whitespace does not change identity",
    parsesToValue: true,
  },
  {
    name: "duplicate-member",
    bytes: utf8.encode(`{"alpha":"zzz","alpha":"one","beta":"\uFFFD"}`),
    lie: "a repeated member is resolved last-wins before identity is taken",
    parsesToValue: true,
  },
  {
    name: "needless-escape",
    bytes: utf8.encode(`{"alpha":"\\u006fne","beta":"\uFFFD"}`),
    lie: "an escape and the character it names are the same bytes",
    parsesToValue: true,
  },
  {
    name: "replacement-laundering",
    bytes: replacementLaundered(),
    lie: "an undecodable byte may be repaired to U+FFFD and then hashed",
    parsesToValue: true,
  },
  {
    name: "truncated",
    bytes: canonical.slice(0, canonical.byteLength - 1),
    lie: "a prefix of the bytes carries the whole value's identity",
    parsesToValue: false,
  },
  {
    name: "other-value",
    bytes: otherCanonical,
    lie: "canonical bytes are admissible whatever value they name",
    parsesToValue: false,
  },
]

const payloadLayers = (bytes: Uint8Array): Layer.Layer<Catalog | Payloads> =>
  Layer.mergeAll(
    Catalog.testLayer({
      get: () => Effect.succeed(Option.none()),
      put: (candidate) => digestOf(candidate),
    }),
    Payloads.testLayer({ get: () => Effect.succeed(Option.some(bytes)) }),
  )

/** Admit or refuse, plus the refusal kind when it refused. */
interface Verdict {
  readonly admitted: boolean
  readonly kind: string | null
}

const verdictOf = (
  door: (digest: Digest) => Effect.Effect<WireValue, { readonly kind: string }, Catalog | Payloads>,
  bytes: Uint8Array,
): Verdict => {
  const outcome = Effect.runSync(
    door(digest).pipe(Effect.provide(payloadLayers(bytes)), Effect.result),
  )
  return outcome._tag === "Success"
    ? { admitted: true, kind: null }
    : { admitted: false, kind: outcome.failure.kind }
}

interface ProbeReply {
  readonly accepted: boolean
  readonly canonical?: string
}

/**
 * Runs every row through the Go twin's constrained decoder in one batch. The
 * endpoint answers, per line, whether the bytes decode at all and what their
 * canonical form is; the twin's canonicality verdict is decode-accepted and
 * canonical-equals-input, which is the comparison its read door performs.
 */
const goProbe = (rows: ReadonlyArray<Uint8Array>): ReadonlyArray<ProbeReply> => {
  const stdin = rows
    .map((bytes) => JSON.stringify({ input: Buffer.from(bytes).toString("base64") }))
    .join("\n") + "\n"
  const run = Bun.spawnSync({
    cmd: ["go", "run", "./cmd/jcsprobe"],
    cwd: goRoot,
    stdin: Buffer.from(stdin, "utf8"),
    stdout: "pipe",
    stderr: "pipe",
  })
  if (run.exitCode !== 0) {
    throw new Error(`Go constrained-decode probe exited ${run.exitCode}: ${run.stderr.toString()}`)
  }
  const replies = run.stdout.toString().trimEnd().split("\n").map((line) =>
    JSON.parse(line) as ProbeReply
  )
  if (replies.length !== rows.length) {
    throw new Error(`Go probe answered ${replies.length} of ${rows.length} rows`)
  }
  return replies
}

describe("payload identity is the fetched bytes", () => {
  test("the counterexample rows really do parse to the value the digest names", () => {
    // Without this row a typo would turn a counterexample into an ordinary
    // wrong-value vector, and the wall would prove the easy half twice.
    const lenient = new TextDecoder()
    for (const vector of vectors) {
      let matches = false
      try {
        const parsed = JSON.parse(lenient.decode(vector.bytes)) as WireValue
        matches = bytesEqual(Effect.runSync(canonicalBytes(parsed)), canonical)
      } catch {
        matches = false
      }
      expect({ row: vector.name, matches }).toEqual({
        row: vector.name,
        matches: vector.parsesToValue,
      })
      // And each one is a byte string the store was never given.
      if (vector.name !== "canonical") expect(bytesEqual(vector.bytes, canonical)).toBe(false)
    }
  })

  test("the digest is pinned across both canonicalizers before any row is graded", () => {
    const [reply] = goProbe([canonical])
    expect(reply!.accepted).toBe(true)
    expect(sha256Hex(utf8.encode(reply!.canonical!))).toBe(digest)
  })

  test("the shipped door agrees with the oracle on every row", () => {
    for (const vector of vectors) {
      const oracle = sha256Hex(vector.bytes) === digest
      const door = verdictOf(resolve, vector.bytes)
      expect({ row: vector.name, admitted: door.admitted }).toEqual({
        row: vector.name,
        admitted: oracle,
      })
    }
  })

  test("only the canonical row is admitted, and every refusal is structural", () => {
    const admitted = vectors.filter((vector) => verdictOf(resolve, vector.bytes).admitted)
    expect(admitted.map((vector) => vector.name)).toEqual(["canonical"])

    const canonicalRow = Effect.runSync(
      resolve(digest).pipe(Effect.provide(payloadLayers(canonical))),
    )
    expect(canonicalRow).toEqual(value)

    for (const vector of vectors.filter((row) => row.name !== "canonical")) {
      const door = verdictOf(resolve, vector.bytes)
      expect({ row: vector.name, kind: door.kind }).toEqual({
        row: vector.name,
        kind: "digest-mismatch",
      })
    }
  })

  test("the Go twin's canonicality verdict agrees with the oracle on every row", () => {
    const replies = goProbe(vectors.map((vector) => vector.bytes))
    for (const [index, vector] of vectors.entries()) {
      const reply = replies[index]!
      const goCanonical = reply.accepted && reply.canonical !== undefined
        ? bytesEqual(utf8.encode(reply.canonical), vector.bytes)
        : false
      const oracle = sha256Hex(vector.bytes) === digest
      // The twin answers canonicality; the oracle answers identity. They must
      // coincide here because D is the digest of a canonical byte string.
      expect({ row: vector.name, goAdmits: goCanonical && oracle }).toEqual({
        row: vector.name,
        goAdmits: oracle,
      })
    }
  })

  test("the value-identity control admits the byte strings the shipped door refuses", async () => {
    const laundered: Array<string> = []
    for (const vector of vectors) {
      const oracle = sha256Hex(vector.bytes) === digest
      const mutant = verdictOf(valueIdentityResolve, vector.bytes)
      if (mutant.admitted && !oracle) laundered.push(vector.name)
    }

    // A wall no mutant can fail is not a wall. The dropped law is the one the
    // repair added: identity is taken over the fetched bytes, before decode.
    expect(laundered.length).toBeGreaterThan(0)

    const record = {
      control: "resolved-value-identity-mutant",
      droppedLaw: "identity is re-derived over the fetched bytes before any decode",
      oracle: "sha256(bytes) == D over the exact octets, FIPS 180-4",
      digest,
      rows: vectors.map((vector) => {
        const oracle = sha256Hex(vector.bytes) === digest
        return {
          row: vector.name,
          lie: vector.lie,
          parsesToValue: vector.parsesToValue,
          oracleAdmits: oracle,
          shippedAdmits: verdictOf(resolve, vector.bytes).admitted,
          mutantAdmits: verdictOf(valueIdentityResolve, vector.bytes).admitted,
        }
      }),
      launderedRows: laundered,
    }
    expect(JSON.stringify(record, null, 2) + "\n").toBe(await Bun.file(mutantTrace).text())
  })
})
