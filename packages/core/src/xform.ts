/**
 * The TS half of the transform wall: the same Xform algebra as
 * go/stream/transform.go, mirrored function for function. A TS pipeline and
 * a Go pipeline are "the same transform" exactly when they take equal input
 * streams to equal-head output streams — checked in
 * test/xform.wall.test.ts against the frozen Go pin (xformPipelineHead).
 *
 * The algebra: compose is associative with identity, and FUSES — one pass,
 * no intermediate streams. `null` drops the event (Go's ok=false). Xforms
 * never mutate their input.
 *
 * This is also the execution model a Schema decodeTo chain lowers onto:
 * Schema gives the typed, annotated, effect-capable presentation; Xform is
 * the fused per-event hot path a derived collector or NATS node runs.
 */

import type { StreamEvent } from "./stream.ts"

export type Xform = (e: StreamEvent) => StreamEvent | null

export const compose =
  (...fs: ReadonlyArray<Xform>): Xform =>
  (e) => {
    let cur: StreamEvent | null = e
    for (const f of fs) {
      if (cur === null) return null
      cur = f(cur)
    }
    return cur
  }

export const apply = (
  f: Xform,
  events: ReadonlyArray<StreamEvent>,
): Array<StreamEvent> => {
  const out: Array<StreamEvent> = []
  for (const e of events) {
    const t = f(e)
    if (t !== null) out.push(t)
  }
  return out
}

export const renameStream =
  (to: string): Xform =>
  (e) => ({ ...e, stream: to })

const equal = "=".charCodeAt(0)
const replacementRune = 0xfffd

const indexByte = (bytes: Uint8Array, value: number): number => {
  for (let i = 0; i < bytes.length; i++) {
    if (bytes[i] === value) return i
  }
  return -1
}

export const filterKeyPrefix = (prefix: string): Xform => {
  const encodedPrefix = new TextEncoder().encode(prefix)
  return (e) => {
    const boundary = indexByte(e.payload, equal)
    if (boundary <= 0 || encodedPrefix.length > boundary) return null
    for (let i = 0; i < encodedPrefix.length; i++) {
      if (e.payload[i] !== encodedPrefix[i]) return null
    }
    return e
  }
}

const continuation = (byte: number): boolean => byte >= 0x80 && byte <= 0xbf

// Invalid UTF-8 consumes one byte and emits U+FFFD, matching utf8.DecodeRune.
const decodeRune = (bytes: Uint8Array, offset: number): readonly [number, number] => {
  const a = bytes[offset]!
  if (a < 0x80) return [a, 1]
  if (a < 0xc2) return [replacementRune, 1]
  const b = bytes[offset + 1]
  if (a <= 0xdf) {
    return b !== undefined && continuation(b)
      ? [((a & 0x1f) << 6) | (b & 0x3f), 2]
      : [replacementRune, 1]
  }
  const c = bytes[offset + 2]
  if (a <= 0xef) {
    const validB = b !== undefined && continuation(b) &&
      (a !== 0xe0 || b >= 0xa0) && (a !== 0xed || b < 0xa0)
    return validB && c !== undefined && continuation(c)
      ? [((a & 0x0f) << 12) | ((b! & 0x3f) << 6) | (c & 0x3f), 3]
      : [replacementRune, 1]
  }
  const d = bytes[offset + 3]
  if (a <= 0xf4) {
    const validB = b !== undefined && continuation(b) &&
      (a !== 0xf0 || b >= 0x90) && (a !== 0xf4 || b < 0x90)
    return validB && c !== undefined && continuation(c) &&
        d !== undefined && continuation(d)
      ? [
          ((a & 0x07) << 18) | ((b! & 0x3f) << 12) |
            ((c! & 0x3f) << 6) | (d & 0x3f),
          4,
        ]
      : [replacementRune, 1]
  }
  return [replacementRune, 1]
}

const simpleUpperExpansion = (rune: number): number | undefined => {
  if (
    (rune >= 0x1f80 && rune <= 0x1f87) ||
    (rune >= 0x1f90 && rune <= 0x1f97) ||
    (rune >= 0x1fa0 && rune <= 0x1fa7)
  ) {
    return rune + 8
  }
  if (rune === 0x1fb3) return 0x1fbc
  if (rune === 0x1fc3) return 0x1fcc
  if (rune === 0x1ff3) return 0x1ffc
  return undefined
}

const simpleUpper = (rune: number): number => {
  const upper = String.fromCodePoint(rune).toUpperCase()
  const points = [...upper]
  return points.length === 1
    ? points[0]!.codePointAt(0)!
    : simpleUpperExpansion(rune) ?? rune
}

export const mapValueUpper = (): Xform => {
  const enc = new TextEncoder()
  return (e) => {
    const i = indexByte(e.payload, equal)
    if (i < 0) return e
    let ascii = true
    for (let offset = i + 1; offset < e.payload.length; offset++) {
      if (e.payload[offset]! >= 0x80) {
        ascii = false
        break
      }
    }
    if (ascii) {
      const payload = e.payload.slice()
      for (let offset = i + 1; offset < payload.length; offset++) {
        const byte = payload[offset]!
        if (byte >= 0x61 && byte <= 0x7a) payload[offset] = byte - 0x20
      }
      return { ...e, payload }
    }
    const payload = Array.from(e.payload.subarray(0, i + 1))
    for (let offset = i + 1; offset < e.payload.length;) {
      const [rune, width] = decodeRune(e.payload, offset)
      payload.push(...enc.encode(String.fromCodePoint(simpleUpper(rune))))
      offset += width
    }
    return {
      ...e,
      payload: Uint8Array.from(payload),
    }
  }
}
