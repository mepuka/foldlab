/**
 * The Schema workshop: a compressed stream AS a type.
 *
 * Effect v4 Schema is one object carrying three things at once — the ADT
 * (its Type), the wire form (its Encoded), and the bidirectional
 * transformation between them (its Getters). This module cashes that in on
 * the lab's own wire: `GzipEventFrame` is a schema whose ENCODED side is the
 * base64 gzip frame emitted by `go/cmd/streamfix` (Go stdlib gzip over the
 * canonical event encoding) and whose TYPE side is typed events. Decoding IS
 * ingestion from Go; encoding IS emission to Go. The language boundary
 * becomes a schema transformation, and the chain-head law is walled at the
 * crossing (test/schema.wall.test.ts: heads recomputed from decoded values
 * equal Go's digests over the admitted corpus). A leading UTF-8 BOM remains
 * a preserved finding (`FINDING-SCHEMA-BOM-001.md`), not part of that claim.
 *
 * Compression note, per the lane's law: identity is of canonical
 * UNCOMPRESSED bytes. The schema round-trip is judged by decoded values and
 * chain heads, never by compressed-frame bytes — gzip output may differ
 * across encoders; the type does not.
 */

import { gunzipSync, gzipSync } from "node:zlib"
import { Effect, Schema, SchemaGetter, SchemaIssue } from "effect"
import { encodeEvent, parseFrames, type StreamEvent } from "./stream.ts"

const maxU16 = 0xffff
const maxU32 = 0xffff_ffff

const utf8ScalarLength = (value: string): number | undefined => {
  let bytes = 0
  for (let index = 0; index < value.length; index++) {
    const unit = value.charCodeAt(index)
    if (unit <= 0x7f) {
      bytes += 1
    } else if (unit <= 0x7ff) {
      bytes += 2
    } else if (unit >= 0xd800 && unit <= 0xdbff) {
      const next = value.charCodeAt(index + 1)
      if (!(next >= 0xdc00 && next <= 0xdfff)) return undefined
      bytes += 4
      index += 1
    } else if (unit >= 0xdc00 && unit <= 0xdfff) {
      return undefined
    } else {
      bytes += 3
    }
  }
  return bytes
}

const utf8TextWithin = (maximum: number, label: string) =>
  Schema.makeFilter<string>((value) => {
    const length = utf8ScalarLength(value)
    if (length === undefined) return `${label} must contain only Unicode scalar values`
    return length <= maximum ? undefined : `${label} exceeds ${maximum} UTF-8 bytes`
  })

const StreamText = Schema.String.check(utf8TextWithin(maxU16, "stream"))
const PayloadText = Schema.String.check(utf8TextWithin(maxU32, "payload"))
const strictDecoder = new TextDecoder("utf-8", { fatal: true })

/**
 * The typed event as it crosses the boundary (payloads are UTF-8 text).
 *
 * Domain: stream and payload contain only Unicode scalar values and fit their
 * canonical u16/u32 UTF-8 byte lengths; `seq` is a non-negative SAFE integer,
 * narrower than Go's u64 because a JS number above 2^53 cannot round-trip.
 * The bounds are the schema's, not a handler's, so an inadmissible event is
 * refused as data before `encodeEvent`: a surface must not admit what its own
 * canonical encoder refuses.
 */
export const WireEvent = Schema.Struct({
  stream: StreamText,
  seq: Schema.Int.check(
    Schema.isBetween({ minimum: 0, maximum: globalThis.Number.MAX_SAFE_INTEGER }),
  ),
  payload: PayloadText,
})

export type WireEvent = typeof WireEvent.Type

const toStreamEvent = (w: WireEvent): StreamEvent => ({
  stream: w.stream,
  seq: w.seq,
  payload: new TextEncoder().encode(w.payload),
})

export const toStreamEvents = (
  ws: ReadonlyArray<WireEvent>,
): Array<StreamEvent> => ws.map(toStreamEvent)

const concatFrames = (events: ReadonlyArray<StreamEvent>): Uint8Array => {
  const frames = events.map(encodeEvent)
  const out = new Uint8Array(frames.reduce((n, f) => n + f.length, 0))
  let off = 0
  for (const f of frames) {
    out.set(f, off)
    off += f.length
  }
  return out
}

/**
 * base64 string <-> Uint8Array <-> gunzipped canonical frames <-> typed
 * events: one schema, four representations, both directions.
 */
export const GzipEventFrame = Schema.String.pipe(
  Schema.decodeTo(Schema.Uint8Array, {
    decode: SchemaGetter.decodeBase64(),
    encode: SchemaGetter.encodeBase64(),
  }),
  Schema.decodeTo(Schema.Array(WireEvent), {
    decode: SchemaGetter.transformOrFail((bytes: Uint8Array) =>
      Effect.try({
        try: () => parseFrames(gunzipSync(new Uint8Array(bytes))),
        catch: () =>
          new SchemaIssue.InvalidValue({
            message: "not a gzip frame of canonical stream events",
          }),
      }).pipe(
        Effect.flatMap((events) =>
          Effect.try({
            try: () => events.map((event) => ({
              stream: event.stream,
              seq: event.seq,
              payload: strictDecoder.decode(event.payload),
            })),
            catch: () =>
              new SchemaIssue.InvalidValue({
                message: "canonical event payload is not valid UTF-8 text",
              }),
          }),
        ),
      ),
    ),
    encode: SchemaGetter.transform((events: ReadonlyArray<WireEvent>) =>
      Uint8Array.from(
        gzipSync(new Uint8Array(concatFrames(toStreamEvents(events)))),
      ),
    ),
  }),
)

export const decodeFrame = Schema.decodeEffect(GzipEventFrame)
export const encodeFrame = Schema.encodeEffect(GzipEventFrame)
