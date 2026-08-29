/**
 * The sidecar annotation loop, end to end (stipulation S2).
 *
 * The kind is authored once, in Lean, with `cas_struct`
 * (`library/cas/Cas/Schema/Annotation.lean`); its canonical payload is
 * pinned as a committed fixture by `lake exe schemas`; the TypeScript
 * mirror is the library's own `Annotations.Annotation`, hand-written and
 * held to those bytes; and an annotation node — whose subject is a typed
 * reference to a schema node — round-trips through the value plane.
 *
 * The point of the kind is that ANNOTATION CONTENT IS STORE CONTENT. The
 * schema carrier gains no annotation field; an annotation is a node that
 * references its subject by address. So "twenty encoded other schemas"
 * is twenty annotation nodes, and an annotation whose value is itself a
 * schema carries that schema's address, resolved through the same front
 * door as any other schema.
 *
 * The node kind an annotation resides at is the caller's — the
 * annotation plane has no reserved tag of its own — so this suite picks
 * one, exactly as any consumer would.
 */
import { expect, it } from "@effect/vitest"
import { Effect, Layer, cast } from "effect"
import { Cas } from "../src/index.ts"
import { ContentId } from "../src/cas/Node.ts"
import { CasStore } from "../src/cas/Store.ts"
import { layerDiskFs } from "./fixtures/diskFs.ts"
import { readFixtureBytes, readFixtureString } from "./fixtures/read.ts"
import { pinSample } from "./fixtures/schemaRegistry.ts"

const { Annotations, CanonicalSchema } = Cas
const layer = Layer.mergeAll(Cas.layerMemoryLive, layerDiskFs)
const utf8 = new TextDecoder("utf-8", { fatal: true })

/** An annotation projection: revision 1 at an unreserved kind tag. */
const AnnotationNode = Cas.value({
  kindTag: 0x41,
  revision: 1,
  schema: Annotations.Annotation,
})

const fixture = readFixtureBytes("../cas/schemas/annotation.json").pipe(
  Effect.orDie,
)

it.effect("the Lean-authored kind and its mirror are one identity, bytes and address", () =>
  Effect.gen(function* () {
    // Byte for byte: the fixture is the Lean self-codec's output, the
    // mirror is hand-written TypeScript, and neither is derived from
    // the other.
    const pinned = yield* fixture
    expect(utf8.decode(CanonicalSchema.payloadOf(Annotations.Annotation)))
      .toBe(utf8.decode(pinned))

    // And at the address: the mirror admitted through the real store
    // answers the address Lean computed over the same node.
    const committed = JSON.parse(
      yield* readFixtureString("../cas/schemas/addresses.json").pipe(Effect.orDie),
    ) as { schemas: ReadonlyArray<{ name: string; address: string }> }
    const expected = committed.schemas.find((row) => row.name === "annotation")
    expect(yield* CanonicalSchema.put(Annotations.Annotation))
      .toBe(expected?.address)
  }).pipe(Effect.provide(layer)))

it.effect("an annotation node addresses the schema it annotates", () =>
  Effect.gen(function* () {
    const store = yield* CasStore
    const subject = yield* CanonicalSchema.put(pinSample)
    const annotation = Annotations.annotationOn(subject)({
      key: `${Annotations.Namespace}note`,
      value: "the pin sample",
    })

    const root = yield* AnnotationNode.put(annotation)
    expect(yield* AnnotationNode.get(root)).toEqual(annotation)

    // The subject rides the node as a typed edge demanding the schema
    // kind, and the payload carries only its positional marker.
    const node = yield* store.load(cast(root))
    expect(node.refs).toEqual([
      { expectedTag: CanonicalSchema.KindTag, id: subject },
    ])
    expect(utf8.decode(node.payload)).toBe(
      `{"revision":1,"value":{"key":"foldlab/cas/note","subject":{"$ref":0},"value":"the pin sample"}}`,
    )
  }).pipe(Effect.provide(layer)))

it.effect("twenty annotations ride one subject, and a value carries another schema", () =>
  Effect.gen(function* () {
    const subject = yield* CanonicalSchema.put(pinSample)
    const carried = yield* CanonicalSchema.put(Annotations.Annotation)

    const on = Annotations.annotationOn(subject)
    const roots = yield* Effect.forEach(
      Array.from({ length: 20 }, (_, index) => index),
      (index) =>
        AnnotationNode.put(on({
          key: `${Annotations.Namespace}related/${index}`,
          // Store content in a value is an address: the twentieth
          // annotation carries a whole schema, not a copy of one.
          value: index === 19 ? carried : `note ${index}`,
        })),
    )

    // Twenty distinct nodes, all naming one subject.
    expect(new Set(roots).size).toBe(20)
    const read = yield* Effect.forEach(roots, (root) => AnnotationNode.get(root))
    expect(read.map((one) => one.subject)).toEqual(Array(20).fill(subject))
    expect(read.map((one) => one.key)).toEqual(
      Array.from({ length: 20 }, (_, index) => `foldlab/cas/related/${index}`),
    )

    // The carried address resolves as a schema through the front door.
    const document = yield* CanonicalSchema.get(
      ContentId.make(read[19]!.value),
    )
    expect(utf8.decode(CanonicalSchema.payloadOf(document)))
      .toBe(utf8.decode(yield* fixture))
  }).pipe(Effect.provide(layer)))

it.effect("an annotation whose subject is not a schema node is refused at admission", () =>
  Effect.gen(function* () {
    const store = yield* CasStore
    const notASchema = yield* store.put({
      kind: { version: Cas.SchemeVersion, tag: 0x42 },
      payload: new TextEncoder().encode("not a schema"),
      refs: [],
    })
    const refusal = yield* AnnotationNode.put(
      Annotations.annotationOn(notASchema)({
        key: `${Annotations.Namespace}note`,
        value: "wrong subject",
      }),
    ).pipe(Effect.flip)
    expect(refusal._tag).toBe("CasError/WrongKindReference")

    const dangling = yield* AnnotationNode.put(
      Annotations.annotationOn(ContentId.make("ab".repeat(32)))({
        key: `${Annotations.Namespace}note`,
        value: "nowhere",
      }),
    ).pipe(Effect.flip)
    expect(dangling._tag).toBe("CasError/DanglingReference")
  }).pipe(Effect.provide(layer)))
