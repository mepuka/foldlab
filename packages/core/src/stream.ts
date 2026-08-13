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

const maxU16 = 0xffff
const maxU32 = 0xffff_ffff
const encoder = new TextEncoder()

const hasUnpairedSurrogate = (value: string): boolean => {
  for (let i = 0; i < value.length; i++) {
    const unit = value.charCodeAt(i)
    if (unit >= 0xd800 && unit <= 0xdbff) {
      const next = value.charCodeAt(++i)
      if (!(next >= 0xdc00 && next <= 0xdfff)) return true
    } else if (unit >= 0xdc00 && unit <= 0xdfff) {
      return true
    }
  }
  return false
}

const streamBytes = (stream: string): Uint8Array => {
  if (hasUnpairedSurrogate(stream)) throw new RangeError("stream ID is not valid UTF-8")
  const bytes = encoder.encode(stream)
  if (bytes.length > maxU16) throw new RangeError("stream ID exceeds u16 bytes")
  return bytes
}

const checkedSeq = (seq: number): bigint => {
  if (!Number.isSafeInteger(seq) || seq < 0) throw new RangeError("sequence is not a safe unsigned integer")
  return BigInt(seq)
}

export const event = (
  stream: string,
  seq: number,
  payload: string,
): StreamEvent => ({ stream, seq, payload: new TextEncoder().encode(payload) })

// ---------- canonical encoding and the identity fold ----------

export const encodeEvent = (e: StreamEvent): Uint8Array => {
  const id = streamBytes(e.stream)
  if (e.payload.length > maxU32) throw new RangeError("payload exceeds u32 bytes")
  const buf = new Uint8Array(2 + id.length + 8 + 4 + e.payload.length)
  const view = new DataView(buf.buffer)
  view.setUint16(0, id.length)
  buf.set(id, 2)
  view.setBigUint64(2 + id.length, checkedSeq(e.seq))
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

const utf8 = (s: string): Uint8Array => encoder.encode(s)
const fromHex = (hex: string): Uint8Array => {
  if (!/^[0-9a-f]{64}$/i.test(hex)) {
    throw new RangeError("head must be exactly 32 hexadecimal bytes")
  }
  const out = new Uint8Array(hex.length / 2)
  for (let i = 0; i < out.length; i++) {
    out[i] = Number.parseInt(hex.slice(i * 2, i * 2 + 2), 16)
  }
  return out
}

export const streamSeed = (stream: string): Head =>
  sha256(utf8("playground.stream.v1:"), streamBytes(stream))

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
  if (m.picks.length > maxU32) throw new RangeError("merge pick count exceeds u32")
  const chunks: Array<Uint8Array> = []
  const count = new Uint8Array(4)
  new DataView(count.buffer).setUint32(0, m.picks.length)
  chunks.push(count)
  for (const p of m.picks) {
    const id = streamBytes(p.stream)
    const head = new Uint8Array(2 + id.length + 8)
    const view = new DataView(head.buffer)
    view.setUint16(0, id.length)
    head.set(id, 2)
    view.setBigUint64(2 + id.length, checkedSeq(p.seq))
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

export interface MergeDuplicateOffender {
  readonly source: string
  readonly seq: number
  readonly indexes: ReadonlyArray<number>
}

/** Sources contain events claiming the same identity coordinates. */
export class MergeDuplicateSequence extends Data.TaggedError("MergeDuplicateSequence")<{
  readonly offenders: ReadonlyArray<MergeDuplicateOffender>
}> {}

const compareBytes = (left: Uint8Array, right: Uint8Array): number => {
  const length = Math.min(left.length, right.length)
  for (let index = 0; index < length; index++) {
    const difference = left[index]! - right[index]!
    if (difference !== 0) return difference
  }
  return left.length - right.length
}

const compareDuplicateOffenders = (
  left: MergeDuplicateOffender,
  right: MergeDuplicateOffender,
): number => {
  const sourceOrder = compareBytes(streamBytes(left.source), streamBytes(right.source))
  return sourceOrder === 0 ? left.seq - right.seq : sourceOrder
}

/**
 * Replay a merge fact over source streams — deterministic, and total only
 * over complete sources with unique sequence coordinates. Ambiguity and gaps
 * are typed failures; replay never resolves either with a silent policy.
 */
export const applyMerge = (
  m: MergeFact,
  sources: ReadonlyMap<string, ReadonlyArray<StreamEvent>>,
): Effect.Effect<Array<StreamEvent>, MergeGap | MergeDuplicateSequence> =>
  Effect.suspend<Array<StreamEvent>, MergeGap | MergeDuplicateSequence, never>(() => {
    const index = new Map<string, Map<number, { readonly event: StreamEvent; readonly index: number }>>()
    const offenders: Array<MergeDuplicateOffender> = []
    for (const [name, events] of sources) {
      const bySeq = new Map<number, { readonly event: StreamEvent; readonly index: number }>()
      const indexesBySeq = new Map<number, Array<number>>()
      for (let i = 0; i < events.length; i++) {
        const event = events[i]!
        const indexes = indexesBySeq.get(event.seq)
        if (indexes === undefined) indexesBySeq.set(event.seq, [i])
        else indexes.push(i)
        if (!bySeq.has(event.seq)) bySeq.set(event.seq, { event, index: i })
      }
      for (const [seq, indexes] of indexesBySeq) {
        if (indexes.length > 1) offenders.push({ source: name, seq, indexes })
      }
      index.set(name, bySeq)
    }
    if (offenders.length > 0) {
      offenders.sort(compareDuplicateOffenders)
      return Effect.fail(new MergeDuplicateSequence({ offenders }))
    }
    const out: Array<StreamEvent> = []
    for (let i = 0; i < m.picks.length; i++) {
      const pick = m.picks[i]!
      const found = index.get(pick.stream)?.get(pick.seq)
      if (found === undefined) {
        return Effect.fail(new MergeGap({ pick, index: i }))
      }
      out.push(found.event)
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

const strictDecoder = new TextDecoder("utf-8", { fatal: true })

/**
 * One meaning-fold step, pure. `undefined` NAMES the walled refusal domain —
 * a payload that is not valid UTF-8, not a `key=value` fact, carries a NUL in
 * either half, or would overflow the u32 count. It is the single definition of
 * "what the meaning fold admits": the Effect-typed `applyKV` turns `undefined`
 * into a typed `MalformedPayload`, while the entity collector's synchronous
 * fold forgives it as a no-op. There is one meaning-fold, not two.
 */
export const kvStep = (state: KVState, e: StreamEvent): KVState | undefined => {
  let text: string
  try {
    text = strictDecoder.decode(e.payload)
  } catch {
    return undefined
  }
  const eq = text.indexOf("=")
  if (eq <= 0) return undefined
  const key = text.slice(0, eq)
  const value = text.slice(eq + 1)
  if (
    key.includes("\0") || value.includes("\0") ||
    !Number.isSafeInteger(state.count) || state.count < 0 || state.count >= maxU32
  ) {
    return undefined
  }
  const entries = new Map(state.entries)
  entries.set(key, value)
  return { entries, count: state.count + 1 }
}

export const applyKV = (
  state: KVState,
  e: StreamEvent,
): Effect.Effect<KVState, MalformedPayload> =>
  Effect.suspend(() => {
    const next = kvStep(state, e)
    return next === undefined
      ? Effect.fail(new MalformedPayload({ event: e }))
      : Effect.succeed(next)
  })

export const foldKV = (
  events: ReadonlyArray<StreamEvent>,
): Effect.Effect<KVState, MalformedPayload> =>
  Effect.reduce(events, () => emptyKV, applyKV)

/** Combining two states would carry the event count past the u32 it is stored in. */
export class KVCountOverflow extends Data.TaggedError("KVCountOverflow")<{
  readonly left: number
  readonly right: number
}> {}

/**
 * The meaning fold's missing `combine`: the last-write-wins map union, with
 * `right` read as the LATER half of one history. `undefined` names the same
 * kind of walled refusal `kvStep` names — here, a summed event count outside
 * the u32 the state digest stores it in.
 *
 * This is a MONOID and nothing more, which is exactly the license parallel
 * replay needs and exactly the license federation does not get:
 *
 *   identity      combineKV(emptyKV, s) = combineKV(s, emptyKV) = s
 *   associative   grouping does not matter, so a history may be cut anywhere
 *   homomorphic   combineKV(foldKV(xs), foldKV(ys)) = foldKV(xs ++ ys)
 *
 * The homomorphism is unconditional over the admitted domain — the law test
 * checks it against the frozen wall corpus at EVERY split point, and the
 * resulting `stateDigest` is the frozen `foldStateDigest` byte for byte. That
 * is the whole parallel-replay right: split, fold the pieces on separate
 * cores or hosts, combine, and the answer the wall already froze comes back.
 *
 * It is NOT commutative and NOT idempotent, and both failures are structural
 * rather than incidental. Order IS the semantics of last-write-wins, so
 * `combineKV(a, b)` and `combineKV(b, a)` disagree wherever `a` and `b` write
 * the same key; and `count` is a sum, so `combineKV(s, s)` double-counts every
 * event `s` already admitted. `test/stream.combine.test.ts` pins both with
 * minimized counterexamples rather than leaving them to inspection. A fold
 * that federates without a committed order needs the join-semilattice in
 * `kvSemilattice.ts`, whose price — carrying every event's identity
 * coordinate — this monoid does not pay.
 */
export const combineKV = (left: KVState, right: KVState): KVState | undefined => {
  if (
    !Number.isSafeInteger(left.count) || left.count < 0 ||
    !Number.isSafeInteger(right.count) || right.count < 0
  ) {
    return undefined
  }
  const count = left.count + right.count
  if (count > maxU32) return undefined
  const entries = new Map(left.entries)
  for (const [key, value] of right.entries) entries.set(key, value)
  return { entries, count }
}

/**
 * `combineKV` on the typed channel, the way `applyKV` is `kvStep` on the typed
 * channel: the one refusal the union can carry becomes a `KVCountOverflow`
 * naming both counts, so a parallel replay that overran the digest's u32 says
 * which two halves did it.
 */
export const mergeKV = (
  left: KVState,
  right: KVState,
): Effect.Effect<KVState, KVCountOverflow> =>
  Effect.suspend(() => {
    const next = combineKV(left, right)
    return next === undefined
      ? Effect.fail(new KVCountOverflow({ left: left.count, right: right.count }))
      : Effect.succeed(next)
  })

/**
 * Canonical fingerprint of the fold STATE: sorted keys, so two histories
 * that converge to the same state digest identically even when their chain
 * heads differ. The chain remembers what the fold forgives.
 */
export const stateDigest = (state: KVState): Head => {
  if (!Number.isInteger(state.count) || state.count < 0 || state.count > maxU32) {
    throw new RangeError("KV count is outside u32")
  }
  const h = createHash("sha256")
  h.update(utf8("playground.fold.kv.v1"))
  const count = new Uint8Array(4)
  new DataView(count.buffer).setUint32(0, state.count)
  h.update(count)
  const entries = [...state.entries].map(([key, value]) => {
    if (
      key.includes("\0") || value.includes("\0") ||
      hasUnpairedSurrogate(key) || hasUnpairedSurrogate(value)
    ) {
      throw new RangeError("KV entry is outside the state-digest domain")
    }
    return { key, keyBytes: utf8(key), valueBytes: utf8(value) }
  })
  entries.sort((left, right) => {
    const n = Math.min(left.keyBytes.length, right.keyBytes.length)
    for (let i = 0; i < n; i++) {
      const delta = left.keyBytes[i]! - right.keyBytes[i]!
      if (delta !== 0) return delta
    }
    return left.keyBytes.length - right.keyBytes.length
  })
  for (const entry of entries) {
    h.update(entry.keyBytes)
    h.update(new Uint8Array([0]))
    h.update(entry.valueBytes)
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

export class CompactionBoundary extends Data.TaggedError("CompactionBoundary")<{
  readonly boundary: number
  readonly length: number
}> {}

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
): Effect.Effect<Compacted, MalformedPayload | CompactionBoundary> =>
  Effect.suspend<Compacted, MalformedPayload | CompactionBoundary, never>(() => {
    if (!Number.isInteger(k) || k < 0 || k > events.length) {
      return Effect.fail(new CompactionBoundary({ boundary: k, length: events.length }))
    }
    return Effect.map(foldKV(events.slice(0, k)), (state) => ({
      base: headFrom(base, events.slice(0, k)),
      state,
      tail: events.slice(k),
    }))
  })

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

export class SegmentCycle extends Data.TaggedError("SegmentCycle")<{
  readonly head: Head
}> {}

const cloneEvent = (e: StreamEvent): StreamEvent => ({
  stream: e.stream,
  seq: e.seq,
  payload: e.payload.slice(),
})

/** Content-addressed segment store: head -> segment. Fork = same parent. */
export const put = (store: Map<Head, Segment>, s: Segment): Head => {
  const h = segmentHead(s)
  store.set(h, { parent: s.parent, events: s.events.map(cloneEvent) })
  return h
}

export const replay = (
  store: ReadonlyMap<Head, Segment>,
  head: Head,
  root: Head,
): Effect.Effect<Array<StreamEvent>, SegmentGap | SegmentCycle> =>
  Effect.suspend<Array<StreamEvent>, SegmentGap | SegmentCycle, never>(() => {
    const segments: Array<Segment> = []
    const seen = new Set<Head>()
    let cursor = head
    while (cursor !== root) {
      if (seen.has(cursor)) return Effect.fail(new SegmentCycle({ head: cursor }))
      seen.add(cursor)
      const s = store.get(cursor)
      if (s === undefined) return Effect.fail(new SegmentGap({ head: cursor }))
      segments.push(s)
      cursor = s.parent
    }
    segments.reverse()
    return Effect.succeed(segments.flatMap((s) => s.events.map(cloneEvent)))
  })

// ---------- compression: transport, never identity ----------

/** Concatenated canonical frames, for (de)compression interop with Go. */
export const parseFrames = (raw: Uint8Array): Array<StreamEvent> => {
  const out: Array<StreamEvent> = []
  const view = new DataView(raw.buffer, raw.byteOffset, raw.byteLength)
  let off = 0
  while (off < raw.length) {
    if (raw.length - off < 2) throw new RangeError(`truncated frame at ${off}`)
    const idLen = view.getUint16(off)
    off += 2
    if (raw.length - off < idLen + 8 + 4) {
      throw new RangeError(`truncated frame at ${off}`)
    }
    let stream: string
    try {
      stream = strictDecoder.decode(raw.subarray(off, off + idLen))
    } catch {
      throw new RangeError(`stream ID at ${off} is not valid UTF-8`)
    }
    off += idLen
    const rawSeq = view.getBigUint64(off)
    if (rawSeq > BigInt(Number.MAX_SAFE_INTEGER)) {
      throw new RangeError(`sequence at ${off} exceeds Number.MAX_SAFE_INTEGER`)
    }
    const seq = Number(rawSeq)
    off += 8
    const payLen = view.getUint32(off)
    off += 4
    if (payLen > raw.length - off) throw new RangeError(`truncated payload at ${off}`)
    out.push({ stream, seq, payload: raw.slice(off, off + payLen) })
    off += payLen
  }
  return out
}
