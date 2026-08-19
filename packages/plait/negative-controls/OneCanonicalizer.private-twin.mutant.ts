/**
 * The planted second canonicalizer.
 *
 * A minimal re-creation of the twin DEV-804 slice C retired: the name, the
 * member-order sort, and the serializer. It is deliberately correct-looking
 * and deliberately wrong — its number arm writes a JavaScript number, so an
 * identity label past 2^53 rounds, which is the exact defect the estate
 * number-domain ruling (DEV-807) removed the excuse for.
 *
 * The control at `scripts/check-one-canonicalizer-negative.ts` copies this
 * file into `src/truth/`, runs the wall, and restores the tree. It is never
 * imported and never compiled in place.
 */

/** A value in the twin's domain. */
export type CanonicalJson =
  | null
  | boolean
  | string
  | number
  | ReadonlyArray<CanonicalJson>
  | { readonly [key: string]: CanonicalJson }

/** The twin: sort the members, serialize each, join without whitespace. */
export const encodeCanonicalJson = (value: CanonicalJson): string => {
  if (value === null || typeof value !== "object") return JSON.stringify(value)
  if (Array.isArray(value)) {
    return `[${value.map((entry) => encodeCanonicalJson(entry)).join(",")}]`
  }
  const source = value as { readonly [key: string]: CanonicalJson }
  const members = Object.keys(source)
    .sort()
    .map((key) => `${JSON.stringify(key)}:${encodeCanonicalJson(source[key]!)}`)
  return `{${members.join(",")}}`
}
