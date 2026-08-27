import { expect, it } from "@effect/vitest"
import { Effect, Option } from "effect"
import { ContentId } from "../../src/cas/Node.ts"
import {
  decodeKeyListDocument,
  encodeKeyListDocument,
} from "../../src/internal/remoteControl.ts"

const key = (byte: number): ContentId => ContentId.make(byte.toString(16).padStart(2, "0").repeat(32))

it.effect("the key-list framing is canonical, exact, and order preserving", () => Effect.sync(() => {
  const keys = [key(0x12), key(0xab)]
  const encoded = encodeKeyListDocument(keys)
  expect(encoded.length).toBe(68)
  expect(Array.from(encoded.subarray(0, 4))).toEqual([0, 0, 0, 2])
  expect(decodeKeyListDocument(encoded)).toEqual(Option.some(keys))
  expect(decodeKeyListDocument(encodeKeyListDocument([...keys].reverse())))
    .toEqual(Option.some([...keys].reverse()))
  expect(Option.isNone(decodeKeyListDocument(encoded.subarray(0, encoded.length - 1)))).toBe(true)

  const trailing = new Uint8Array(encoded.length + 1)
  trailing.set(encoded)
  expect(Option.isNone(decodeKeyListDocument(trailing))).toBe(true)
}))
