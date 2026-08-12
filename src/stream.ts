/**
 * The stream-journal lane, TS half — byte-identical mirror of `go/stream`
 * (the cross-language wall: packages/mech/fixtures/stream-wall.json, pinned
 * once from the Go side).
 *
 * The one idea underneath the whole lane: an event stream is a left fold
 * twice over. Folded with a hash you get IDENTITY (the chain head commits to
 * the exact history); folded with a state function you get MEANING (what the
 * history did). The two folds disagree on purpose — the chain remembers what
 * the fold forgives — and every law in this lane is about which of the two a
 * given operation must preserve:
 *
 *   fingerprint  identity of canonical bytes; heads extend in O(1)
 *   merge        a committed linearization: a tiny replayable FACT
 *   fold         meaning; classifies events into commuting / non-commuting
 *   compaction   discard a prefix, preserve BOTH folds across the boundary
 *   fork         two heads, one parent — shared structure, distinct identity
 *   compression  transport only; identity is always of uncompressed bytes
 *
 * Canonical encodings (pinned, mirrored in go/stream/stream.go):
 *   enc(event)  = len(stream) u16 BE || stream utf8 || seq u64 BE || len(payload) u32 BE || payload
 *   seed(s)     = SHA-256("playground.stream.v1:" + s)
 *   extend(h,e) = SHA-256(h || enc(e))
 */

import { createHash } from "node:crypto"
import { Data, Effect } from "effect"

export interface StreamEvent {
  readonly stream: string
  readonly seq: number
  readonly payload: Uint8Array
}

export const event = (
  stream: string,
  seq: number,
  payload: string,
): StreamEvent => ({ stream, seq, payload: new TextEncoder().encode(payload) })

// ---------- canonical encoding and the identity fold ----------

export const encodeEvent = (e: StreamEvent): Uint8Array => {
  const id = new TextEncoder().encode(e.stream)
  const buf = new Uint8Array(2 + id.length + 8 + 4 + e.payload.length)
  const view = new DataView(buf.buffer)
  view.setUint16(0, id.length)
  buf.set(id, 2)
  view.setBigUint64(2 + id.length, BigInt(e.seq))
  view.setUint32(2 + id.length + 8, e.payload.length)
  buf.set(e.payload, 2 + id.length + 8 + 4)
  return buf
}

/** A chain head: 32 bytes committing to an entire history, hex-encoded. */
export type Head = string

const sha256 = (...parts: ReadonlyArray<Uint8Array>): Head => {
  const h = createHash("sha256")
  for (const p of parts) h.update(p)
  return h.digest("hex")
}

const utf8 = (s: string): Uint8Array => new TextEncoder().encode(s)
const fromHex = (hex: string): Uint8Array => {
  const out = new Uint8Array(hex.length / 2)
  for (let i = 0; i < out.length; i++) {
    out[i] = Number.parseInt(hex.slice(i * 2, i * 2 + 2), 16)
  }
  return out
}

export const streamSeed = (stream: string): Head =>
  sha256(utf8(`playground.stream.v1:${stream}`))

export const mergeSeed = (): Head => sha256(utf8("playground.merge.v1"))

/** The identity fold: one event onto a head, O(1) incremental. */
export const extend = (head: Head, e: StreamEvent): Head =>
  sha256(fromHex(head), encodeEvent(e))

export const headFrom = (base: Head, events: ReadonlyArray<StreamEvent>): Head =>
  events.reduce(extend, base)

// ---------- merge: committing one linearization ----------

export interface Pick {
  readonly stream: string
  readonly seq: number
}

export interface MergeFact {
  readonly picks: ReadonlyArray<Pick>
}

export const encodeFact = (m: MergeFact): Uint8Array => {
  const chunks: Array<Uint8Array> = []
  const count = new Uint8Array(4)
  new DataView(count.buffer).setUint32(0, m.picks.length)
  chunks.push(count)
  for (const p of m.picks) {
    const id = utf8(p.stream)
    const head = new Uint8Array(2 + id.length + 8)
    const view = new DataView(head.buffer)
    view.setUint16(0, id.length)
    head.set(id, 2)
    view.setBigUint64(2 + id.length, BigInt(p.seq))
    chunks.push(head)
  }
  const total = chunks.reduce((n, c) => n + c.length, 0)
  const out = new Uint8Array(total)
  let off = 0
  for (const c of chunks) {
    out.set(c, off)
    off += c.length
  }
  return out
}

export const factDigest = (m: MergeFact): Head =>
  sha256(utf8("playground.mergefact.v1"), encodeFact(m))

/** A pick referencing no source event: a gap is data, not noise. */
export class MergeGap extends Data.TaggedError("MergeGap")<{
  readonly pick: Pick
  readonly index: number
}> {}

/**
 * Replay a merge fact over source streams — deterministic, and total only
 * over complete sources: the Effect fails with a typed MergeGap otherwise.
 */
export const applyMerge = (
  m: MergeFact,
  sources: ReadonlyMap<string, ReadonlyArray<StreamEvent>>,
): Effect.Effect<Array<StreamEvent>, MergeGap> =>
  Effect.suspend(() => {
    const index = new Map<string, Map<number, StreamEvent>>()
    for (const [name, events] of sources) {
      index.set(name, new Map(events.map((e) => [e.seq, e])))
    }
    const out: Array<StreamEvent> = []
    for (let i = 0; i < m.picks.length; i++) {
      const pick = m.picks[i]!
      const found = index.get(pick.stream)?.get(pick.seq)
      if (found === undefined) {
        return Effect.fail(new MergeGap({ pick, index: i }))
      }
      out.push(found)
    }
    return Effect.succeed(out)
  })

// ---------- the semantic fold: a last-write-wins KV ----------

export class MalformedPayload extends Data.TaggedError("MalformedPayload")<{
  readonly event: StreamEvent
}> {}

export interface KVState {
  readonly entries: ReadonlyMap<string, string>
  readonly count: number
}

export const emptyKV: KVState = { entries: new Map(), count: 0 }

export const applyKV = (
  state: KVState,
  e: StreamEvent,
): Effect.Effect<KVState, MalformedPayload> =>
  Effect.suspend(() => {
    const text = new TextDecoder().decode(e.payload)
    const eq = text.indexOf("=")
    if (eq <= 0) return Effect.fail(new MalformedPayload({ event: e }))
    const entries = new Map(state.entries)
    entries.set(text.slice(0, eq), text.slice(eq + 1))
    return Effect.succeed({ entries, count: state.count + 1 })
  })

export const foldKV = (
  events: ReadonlyArray<StreamEvent>,
): Effect.Effect<KVState, MalformedPayload> =>
  Effect.reduce(events, () => emptyKV, applyKV)

/**
 * Canonical fingerprint of the fold STATE: sorted keys, so two histories
 * that converge to the same state digest identically even when their chain
 * heads differ. The chain remembers what the fold forgives.
 */
export const stateDigest = (state: KVState): Head => {
  const h = createHash("sha256")
  h.update(utf8("playground.fold.kv.v1"))
  const count = new Uint8Array(4)
  new DataView(count.buffer).setUint32(0, state.count)
  h.update(count)
  for (const key of [...state.entries.keys()].sort()) {
    h.update(utf8(key))
    h.update(new Uint8Array([0]))
    h.update(utf8(state.entries.get(key)!))
    h.update(new Uint8Array([0]))
  }
  return h.digest("hex")
}

// ---------- compaction: replacing a prefix by its fold ----------

export interface Compacted {
  /** Chain head of the discarded prefix. */
  readonly base: Head
  /** Fold state at the boundary. */
  readonly state: KVState
  readonly tail: ReadonlyArray<StreamEvent>
}

/**
 * Fold away the first k events. The two-fold law (tested): the state fold
 * of prefix+tail equals state-at-k then tail, and the final head recomputed
 * from `base` over `tail` equals the uncompacted head — verification
 * crosses the compaction boundary. What is lost, only by explicit choice:
 * step-through INSIDE the discarded prefix.
 */
export const compact = (
  base: Head,
  events: ReadonlyArray<StreamEvent>,
  k: number,
): Effect.Effect<Compacted, MalformedPayload> =>
  Effect.map(foldKV(events.slice(0, k)), (state) => ({
    base: headFrom(base, events.slice(0, k)),
    state,
    tail: events.slice(k),
  }))

// ---------- fork: two histories sharing a prefix ----------

export interface Segment {
  readonly parent: Head
  readonly events: ReadonlyArray<StreamEvent>
}

export const segmentHead = (s: Segment): Head => headFrom(s.parent, s.events)

/** With hash chaining, ABSENCE is detectable: the missing head is named. */
export class SegmentGap extends Data.TaggedError("SegmentGap")<{
  readonly head: Head
}> {}

/** Content-addressed segment store: head -> segment. Fork = same parent. */
export const put = (store: Map<Head, Segment>, s: Segment): Head => {
  const h = segmentHead(s)
  store.set(h, s)
  return h
}

export const replay = (
  store: ReadonlyMap<Head, Segment>,
  head: Head,
  root: Head,
): Effect.Effect<Array<StreamEvent>, SegmentGap> =>
  Effect.suspend(() => {
    const segments: Array<Segment> = []
    let cursor = head
    while (cursor !== root) {
      const s = store.get(cursor)
      if (s === undefined) return Effect.fail(new SegmentGap({ head: cursor }))
      segments.push(s)
      cursor = s.parent
    }
    segments.reverse()
    return Effect.succeed(segments.flatMap((s) => [...s.events]))
  })

// ---------- compression: transport, never identity ----------

/** Concatenated canonical frames, for (de)compression interop with Go. */
export const parseFrames = (raw: Uint8Array): Array<StreamEvent> => {
  const out: Array<StreamEvent> = []
  const view = new DataView(raw.buffer, raw.byteOffset, raw.byteLength)
  let off = 0
  while (off < raw.length) {
    const idLen = view.getUint16(off)
    off += 2
    const stream = new TextDecoder().decode(raw.slice(off, off + idLen))
    off += idLen
    const seq = Number(view.getBigUint64(off))
    off += 8
    const payLen = view.getUint32(off)
    off += 4
    out.push({ stream, seq, payload: raw.slice(off, off + payLen) })
    off += payLen
  }
  return out
}
