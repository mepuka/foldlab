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

import { streamSeed, type StreamEvent } from "./stream.ts"

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

export const renameStream = (to: string): Xform => {
  try {
    streamSeed(to)
  } catch {
    return () => null
  }
  return (e) => ({ ...e, stream: to })
}

const equal = "=".charCodeAt(0)

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

/**
 * Uppercase ASCII a-z bytes in the value half only. Non-ASCII bytes are
 * preserved verbatim so digest behavior depends on no runtime Unicode table.
 */
export const mapValueUpper = (): Xform => {
  return (e) => {
    const i = indexByte(e.payload, equal)
    if (i < 0) return e
    const payload = e.payload.slice()
    for (let offset = i + 1; offset < payload.length; offset++) {
      const byte = payload[offset]!
      if (byte >= 0x61 && byte <= 0x7a) payload[offset] = byte - 0x20
    }
    return { ...e, payload }
  }
}
