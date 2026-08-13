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
 * becomes a schema transformation, and the chain-head law survives the
 * crossing (test/schema.wall.test.ts: heads recomputed from the decoded
 * values equal the frozen Go fixture digests).
 *
 * Compression note, per the lane's law: identity is of canonical
 * UNCOMPRESSED bytes. The schema round-trip is judged by decoded values and
 * chain heads, never by compressed-frame bytes — gzip output may differ
 * across encoders; the type does not.
 */

import { gunzipSync, gzipSync } from "node:zlib"
import { Effect, Schema, SchemaGetter, SchemaIssue } from "effect"
import { encodeEvent, parseFrames, type StreamEvent } from "./stream.ts"

/**
 * The typed event as it crosses the boundary (payloads are UTF-8 text).
 *
 * Domain: `seq` is a non-negative SAFE integer — narrower than Go's u64,
 * because a JS number above 2^53 cannot round-trip. The bound is the
 * schema's, not a handler's, so an inadmissible sequence is refused at
 * decode as data rather than dying in `encodeEvent`'s `checkedSeq`: a
 * surface must not admit what its own canonical encoder refuses.
 */
export const WireEvent = Schema.Struct({
  stream: Schema.String,
  seq: Schema.Int.check(
    Schema.isBetween({ minimum: 0, maximum: globalThis.Number.MAX_SAFE_INTEGER }),
  ),
  payload: Schema.String,
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
    decode: SchemaGetter.transformOrFail((bytes: Uint8Array, options) =>
      Effect.try({
        try: () =>
          parseFrames(gunzipSync(new Uint8Array(bytes))).map((e) => ({
            stream: e.stream,
            seq: e.seq,
            payload: new TextDecoder().decode(e.payload),
          })),
        catch: () =>
          new SchemaIssue.InvalidValue({
            message: "not a gzip frame of canonical stream events",
          }),
      }),
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
