/**
 * The typed-reference marker law (CAS-005) over plain JSON values.
 *
 * A typed reference appears in a payload as exactly `{"$ref": k}`, and
 * the k-th marker in canonical byte order carries index k into the
 * node's reference array — indexes forced, sharing by repeated
 * entries, and the reserved keys refused outside their exact shapes.
 * Canonical order is the order the canonical encoding emits:
 * codepoint-sorted object keys at every depth, arrays in order.
 *
 * Two walks, one order: `markerize` lowers an encode-side value whose
 * references appear as `{"$link": {id, tag}}` sentinels into a
 * marker-bearing payload plus the reference array; `resolveMarkers`
 * is its exact inverse, verifying the forced-index law as it walks.
 * Both refuse — never escape — user data that collides with a
 * reserved key: an escape would invent a second spelling for the same
 * value and split its content identity.
 */
import { Data, Option, Result, Schema } from "effect"
import { Byte, ContentId, type CasReference } from "../cas/Node.ts"

export const RefMarkerKey = "$ref"
export const RefSentinelKey = "$link"

/** The sentinel body: what a reference field encodes to before the
 * walk assigns indexes. */
const SentinelBody = Schema.Struct({ id: ContentId, tag: Byte })

export type MarkerViolation = Data.TaggedEnum<{
  /** A reserved key appears in plain data, or in a non-exact shape. */
  ReservedKeyCollision: { readonly key: string }
  /** The exact marker/sentinel key with an unusable body. */
  MalformedMarker: { readonly reason: string }
  /** The k-th marker in canonical order does not carry index k. */
  IndexOutOfOrder: { readonly expected: number; readonly actual: number }
  /** Marker count and reference count disagree. */
  CountMismatch: { readonly markers: number; readonly refs: number }
}>
export const MarkerViolation = Data.taggedEnum<MarkerViolation>()

/** One human sentence per violation, for the projection error. */
export const violationReason = (violation: MarkerViolation): string =>
  MarkerViolation.$match(violation, {
    CountMismatch: ({ markers, refs }) =>
      `payload carries ${markers} reference markers but the node carries ${refs} references`,
    IndexOutOfOrder: ({ actual, expected }) =>
      `marker ${expected} in canonical order carries index ${actual} — indexes are forced`,
    MalformedMarker: ({ reason }) => reason,
    ReservedKeyCollision: ({ key }) =>
      `the reserved key "${key}" appears outside its exact shape — rename the field, escapes are refused`,
  })

/** Codepoint order — equal to UTF-8 byte order, the canonical key
 * ordering CAS-004 pins. */
export const compareCodepoints = (left: string, right: string): number => {
  const a = Array.from(left)
  const b = Array.from(right)
  const shorter = Math.min(a.length, b.length)
  for (let index = 0; index < shorter; index += 1) {
    const delta = (a[index] as string).codePointAt(0)!
      - (b[index] as string).codePointAt(0)!
    if (delta !== 0) return delta
  }
  return a.length - b.length
}

const isPlainObject = (value: object): boolean => {
  const prototype = Object.getPrototypeOf(value)
  return prototype === Object.prototype || prototype === null
}

const isWalkableObject = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value)
    && isPlainObject(value)

/** Keys in canonical traversal order. */
const canonicalKeys = (value: Record<string, unknown>): ReadonlyArray<string> =>
  Object.keys(value).sort(compareCodepoints)

const markerIndex = (value: Record<string, unknown>): unknown =>
  value[RefMarkerKey]

const exactSingleKey = (
  value: Record<string, unknown>,
  key: string,
): boolean => {
  const keys = Object.keys(value)
  return keys.length === 1 && keys[0] === key
}

export interface MarkerizedValue {
  readonly payload: unknown
  readonly refs: ReadonlyArray<CasReference>
}

/** Lower a sentinel-bearing value: sentinels become markers indexed in
 * canonical order, references accumulate in that order, and a reserved
 * key in plain data refuses the whole encode. */
export const markerize = (
  value: unknown,
): Result.Result<MarkerizedValue, MarkerViolation> => {
  const refs: Array<CasReference> = []

  const walk = (
    current: unknown,
  ): Result.Result<unknown, MarkerViolation> => {
    if (Array.isArray(current)) {
      const items: Array<unknown> = []
      for (const item of current) {
        const walked = walk(item)
        if (Result.isFailure(walked)) return walked
        items.push(walked.success)
      }
      return Result.succeed(items)
    }
    if (!isWalkableObject(current)) return Result.succeed(current)

    if (RefSentinelKey in current) {
      if (!exactSingleKey(current, RefSentinelKey)) {
        return Result.fail(
          MarkerViolation.ReservedKeyCollision({ key: RefSentinelKey }),
        )
      }
      const body = Schema.decodeUnknownOption(SentinelBody)(
        current[RefSentinelKey],
      )
      if (Option.isNone(body)) {
        return Result.fail(MarkerViolation.MalformedMarker({
          reason: "a $link sentinel must carry exactly {id, tag}",
        }))
      }
      const marker = { [RefMarkerKey]: refs.length }
      refs.push({ expectedTag: body.value.tag, id: body.value.id })
      return Result.succeed(marker)
    }
    if (RefMarkerKey in current) {
      return Result.fail(
        MarkerViolation.ReservedKeyCollision({ key: RefMarkerKey }),
      )
    }

    const rebuilt: Record<string, unknown> = {}
    // Canonical-order recursion assigns indexes; insertion order of the
    // rebuilt object is cosmetic — the canonical encoding sorts keys.
    for (const key of canonicalKeys(current)) {
      const walked = walk(current[key])
      if (Result.isFailure(walked)) return walked
      rebuilt[key] = walked.success
    }
    return Result.succeed(rebuilt)
  }

  return Result.map(walk(value), (payload) => ({ payload, refs }))
}

const isForcedIndex = (value: unknown, expected: number): boolean =>
  typeof value === "number" && Number.isSafeInteger(value)
    && value === expected

/** The exact inverse walk: the k-th marker in canonical order must
 * carry index k and resolves to the k-th reference as a sentinel; the
 * counts must agree; reserved keys outside their exact shapes refuse. */
export const resolveMarkers = (
  payload: unknown,
  refs: ReadonlyArray<CasReference>,
): Result.Result<unknown, MarkerViolation> => {
  let next = 0

  const walk = (
    current: unknown,
  ): Result.Result<unknown, MarkerViolation> => {
    if (Array.isArray(current)) {
      const items: Array<unknown> = []
      for (const item of current) {
        const walked = walk(item)
        if (Result.isFailure(walked)) return walked
        items.push(walked.success)
      }
      return Result.succeed(items)
    }
    if (!isWalkableObject(current)) return Result.succeed(current)

    if (RefMarkerKey in current) {
      if (!exactSingleKey(current, RefMarkerKey)) {
        return Result.fail(
          MarkerViolation.ReservedKeyCollision({ key: RefMarkerKey }),
        )
      }
      const index = markerIndex(current)
      if (typeof index !== "number" || !Number.isSafeInteger(index)
        || index < 0) {
        return Result.fail(MarkerViolation.MalformedMarker({
          reason: "a $ref marker must carry a non-negative integer index",
        }))
      }
      if (!isForcedIndex(index, next)) {
        return Result.fail(MarkerViolation.IndexOutOfOrder({
          actual: index,
          expected: next,
        }))
      }
      const ref = refs[next]
      if (ref === undefined) {
        return Result.fail(MarkerViolation.CountMismatch({
          markers: next + 1,
          refs: refs.length,
        }))
      }
      next += 1
      return Result.succeed({
        [RefSentinelKey]: { id: ref.id, tag: ref.expectedTag },
      })
    }
    if (RefSentinelKey in current) {
      return Result.fail(
        MarkerViolation.ReservedKeyCollision({ key: RefSentinelKey }),
      )
    }

    const rebuilt: Record<string, unknown> = {}
    for (const key of canonicalKeys(current)) {
      const walked = walk(current[key])
      if (Result.isFailure(walked)) return walked
      rebuilt[key] = walked.success
    }
    return Result.succeed(rebuilt)
  }

  return Result.flatMap(walk(payload), (value) =>
    next === refs.length
      ? Result.succeed(value)
      : Result.fail(MarkerViolation.CountMismatch({
          markers: next,
          refs: refs.length,
        })))
}
