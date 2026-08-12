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

export const filterKeyPrefix = (prefix: string): Xform => {
  const dec = new TextDecoder()
  return (e) => (dec.decode(e.payload).startsWith(prefix) ? e : null)
}

export const mapValueUpper = (): Xform => {
  const dec = new TextDecoder()
  const enc = new TextEncoder()
  return (e) => {
    const text = dec.decode(e.payload)
    const i = text.indexOf("=")
    if (i < 0) return e
    return {
      ...e,
      payload: enc.encode(text.slice(0, i + 1) + text.slice(i + 1).toUpperCase()),
    }
  }
}
