/**
 * GENERATED — do not edit. Straight-line Effect programs lowered
 * from the registered grammar terms (`Cas/Vectors/Registry.lean`)
 * by `lake exe emitprograms`; regeneration is byte-identity-gated
 * (`--check`, wired into `check:cas`). Each program re-performs its
 * term's puts against a live store — addresses computed by the
 * host's own digest — and the VectorPrograms suite asserts the
 * answers equal the Lean-computed word, binding for binding: the
 * cross-host run gate.
 */
import { Effect } from "effect"
import type { CasStoreShape } from "../../src/cas/Store.ts"

const hex = (s: string): Uint8Array =>
  Uint8Array.from({ length: s.length / 2 }, (_, i) =>
    Number.parseInt(s.slice(i * 2, i * 2 + 2), 16))

/** One opaque value node — the smallest program. */
export const valueSingle = (store: CasStoreShape) =>
  Effect.gen(function* () {
    const a0 = yield* store.put({ kind: { version: 0, tag: 1 }, payload: hex("68656c6c6f2c20636173"), refs: [] })
    return [a0]
  })

/** A two-leaf blob: chunks, leaves, parent, manifest. */
export const blobTwoLeaves = (store: CasStoreShape) =>
  Effect.gen(function* () {
    const a0 = yield* store.put({ kind: { version: 0, tag: 8 }, payload: hex("30313233343536373839616263646566"), refs: [] })
    const a1 = yield* store.put({ kind: { version: 0, tag: 9 }, payload: hex("0000000000000010"), refs: [{ id: a0, expectedTag: 8 }] })
    const a2 = yield* store.put({ kind: { version: 0, tag: 8 }, payload: hex("6768696a6b6c6d6e6f70717273747576"), refs: [] })
    const a3 = yield* store.put({ kind: { version: 0, tag: 9 }, payload: hex("0000000100000010"), refs: [{ id: a2, expectedTag: 8 }] })
    const a4 = yield* store.put({ kind: { version: 0, tag: 9 }, payload: hex(""), refs: [{ id: a1, expectedTag: 9 }, { id: a3, expectedTag: 9 }] })
    const a5 = yield* store.put({ kind: { version: 0, tag: 10 }, payload: hex("00000001000000000000002000000002"), refs: [{ id: a4, expectedTag: 9 }] })
    return [a0, a1, a2, a3, a4, a5]
  })

/** A named file over a one-chunk blob. */
export const fileReadme = (store: CasStoreShape) =>
  Effect.gen(function* () {
    const a0 = yield* store.put({ kind: { version: 0, tag: 8 }, payload: hex("23207468652073746f726520776f7264"), refs: [] })
    const a1 = yield* store.put({ kind: { version: 0, tag: 9 }, payload: hex("0000000000000010"), refs: [{ id: a0, expectedTag: 8 }] })
    const a2 = yield* store.put({ kind: { version: 0, tag: 10 }, payload: hex("00000001000000000000001000000001"), refs: [{ id: a1, expectedTag: 9 }] })
    const a3 = yield* store.put({ kind: { version: 0, tag: 11 }, payload: hex("00000009726561646d652e6d640000000a746578742f706c61696e"), refs: [{ id: a2, expectedTag: 10 }] })
    return [a0, a1, a2, a3]
  })

/** A journal: genesis and two entries over saved files. */
export const journalTwoEntries = (store: CasStoreShape) =>
  Effect.gen(function* () {
    const a0 = yield* store.put({ kind: { version: 0, tag: 8 }, payload: hex("6368696c6472656e2066697273742c2061646d697373696f6e206f72646572"), refs: [] })
    const a1 = yield* store.put({ kind: { version: 0, tag: 9 }, payload: hex("000000000000001f"), refs: [{ id: a0, expectedTag: 8 }] })
    const a2 = yield* store.put({ kind: { version: 0, tag: 10 }, payload: hex("00000001000000000000001f00000001"), refs: [{ id: a1, expectedTag: 9 }] })
    const a3 = yield* store.put({ kind: { version: 0, tag: 11 }, payload: hex("000000096e6f7465732e7478740000000a746578742f706c61696e"), refs: [{ id: a2, expectedTag: 10 }] })
    const a4 = yield* store.put({ kind: { version: 0, tag: 8 }, payload: hex("23207468652073746f726520776f7264"), refs: [] })
    const a5 = yield* store.put({ kind: { version: 0, tag: 9 }, payload: hex("0000000000000010"), refs: [{ id: a4, expectedTag: 8 }] })
    const a6 = yield* store.put({ kind: { version: 0, tag: 10 }, payload: hex("00000001000000000000001000000001"), refs: [{ id: a5, expectedTag: 9 }] })
    const a7 = yield* store.put({ kind: { version: 0, tag: 11 }, payload: hex("00000009726561646d652e6d640000000a746578742f706c61696e"), refs: [{ id: a6, expectedTag: 10 }] })
    const a8 = yield* store.put({ kind: { version: 0, tag: 12 }, payload: hex(""), refs: [] })
    const a9 = yield* store.put({ kind: { version: 0, tag: 12 }, payload: hex(""), refs: [{ id: a7, expectedTag: 11 }, { id: a8, expectedTag: 12 }] })
    const a10 = yield* store.put({ kind: { version: 0, tag: 12 }, payload: hex(""), refs: [{ id: a3, expectedTag: 11 }, { id: a9, expectedTag: 12 }] })
    return [a0, a1, a2, a3, a4, a5, a6, a7, a8, a9, a10]
  })

/** Two leaves over one shared chunk — the duplicate put replays as a dedup. */
export const sharedChunk = (store: CasStoreShape) =>
  Effect.gen(function* () {
    const a0 = yield* store.put({ kind: { version: 0, tag: 8 }, payload: hex("6f6e65206368756e6b2c207477696365"), refs: [] })
    const a1 = yield* store.put({ kind: { version: 0, tag: 9 }, payload: hex("0000000000000010"), refs: [{ id: a0, expectedTag: 8 }] })
    const a2 = yield* store.put({ kind: { version: 0, tag: 8 }, payload: hex("6f6e65206368756e6b2c207477696365"), refs: [] })
    const a3 = yield* store.put({ kind: { version: 0, tag: 9 }, payload: hex("0000000100000010"), refs: [{ id: a2, expectedTag: 8 }] })
    const a4 = yield* store.put({ kind: { version: 0, tag: 9 }, payload: hex(""), refs: [{ id: a1, expectedTag: 9 }, { id: a3, expectedTag: 9 }] })
    return [a0, a1, a2, a3, a4]
  })

/** The vector format's own canonical schema as a schema node. */
export const schemaVectorDocument = (store: CasStoreShape) =>
  Effect.gen(function* () {
    const a0 = yield* store.put({ kind: { version: 0, tag: 83 }, payload: hex("7b227265766973696f6e223a302c2276616c7565223a7b225f746167223a22537472756374222c226669656c6473223a7b226465736372697074696f6e223a7b226f7074696f6e616c223a66616c73652c22736368656d61223a7b225f746167223a22537472696e67227d7d2c22646967657374223a7b226f7074696f6e616c223a66616c73652c22736368656d61223a7b225f746167223a224c69746572616c222c2276616c7565223a227368613235362d736368656d6530227d7d2c226e616d65223a7b226f7074696f6e616c223a66616c73652c22736368656d61223a7b225f746167223a22537472696e67227d7d2c22736368656d6156657273696f6e223a7b226f7074696f6e616c223a66616c73652c22736368656d61223a7b225f746167223a224c69746572616c222c2276616c7565223a317d7d2c22776f7264223a7b226f7074696f6e616c223a66616c73652c22736368656d61223a7b225f746167223a224172726179222c226974656d223a7b225f746167223a22537472756374222c226669656c6473223a7b2261646472657373223a7b226f7074696f6e616c223a66616c73652c22736368656d61223a7b225f746167223a22537472696e67227d7d2c226e6f6465223a7b226f7074696f6e616c223a66616c73652c22736368656d61223a7b225f746167223a22537472756374222c226669656c6473223a7b227061796c6f6164223a7b226f7074696f6e616c223a66616c73652c22736368656d61223a7b225f746167223a22537472696e67227d7d2c2272656673223a7b226f7074696f6e616c223a66616c73652c22736368656d61223a7b225f746167223a224172726179222c226974656d223a7b225f746167223a22537472756374222c226669656c6473223a7b226578706563746564546167223a7b226f7074696f6e616c223a66616c73652c22736368656d61223a7b225f746167223a22496e7465676572227d7d2c226964223a7b226f7074696f6e616c223a66616c73652c22736368656d61223a7b225f746167223a22537472696e67227d7d7d7d7d7d2c22746167223a7b226f7074696f6e616c223a66616c73652c22736368656d61223a7b225f746167223a22496e7465676572227d7d2c2276657273696f6e223a7b226f7074696f6e616c223a66616c73652c22736368656d61223a7b225f746167223a22496e7465676572227d7d7d7d7d7d7d7d7d7d7d7d"), refs: [] })
    return [a0]
  })

/** Every generated program beside its vector fixture's name. */
export const programs = [{ name: "value-single", run: valueSingle }, { name: "blob-two-leaves", run: blobTwoLeaves }, { name: "file-readme", run: fileReadme }, { name: "journal-two-entries", run: journalTwoEntries }, { name: "shared-chunk", run: sharedChunk }, { name: "schema-vector-document", run: schemaVectorDocument }]
