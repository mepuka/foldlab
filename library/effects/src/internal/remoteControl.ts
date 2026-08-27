/** Closed codecs for cas-http/0 control-plane documents. */
import { Encoding, Equal, Option, Schema } from "effect"
import { ContentId, type ContentId as ContentIdType } from "../cas/Node.ts"
import {
  RemoteCapabilities,
  type CasPresence,
  type RemoteCapabilities as RemoteCapabilitiesType,
} from "../cas/Remote.ts"

const Byte = Schema.Int.check(Schema.isBetween({ minimum: 0, maximum: 0xff }))
const CapabilityDocumentBytes = Schema.Array(Byte).check(Schema.isLengthBetween(8, 8))
const ByteArray = Schema.Array(Byte)

const readUint32 = (bytes: ReadonlyArray<number>, offset: number): number =>
  (bytes[offset] ?? 0) * 0x1000000
  + (bytes[offset + 1] ?? 0) * 0x10000
  + (bytes[offset + 2] ?? 0) * 0x100
  + (bytes[offset + 3] ?? 0)

const writeUint32 = (bytes: Uint8Array, offset: number, value: number): void => {
  bytes[offset] = (value >>> 24) & 0xff
  bytes[offset + 1] = (value >>> 16) & 0xff
  bytes[offset + 2] = (value >>> 8) & 0xff
  bytes[offset + 3] = value & 0xff
}

export type CapabilityDecodeResult =
  | { readonly _tag: "Decoded"; readonly limits: RemoteCapabilitiesType }
  | { readonly _tag: "Rejected" }

const encodeUnchecked = (limits: RemoteCapabilitiesType): Uint8Array => {
  const bytes = new Uint8Array(8)
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength)
  view.setUint32(0, limits.maxBatchKeys, false)
  view.setUint32(4, limits.maxBlobBytes, false)
  return bytes
}

/** Encode the unique eight-byte, big-endian capability representation. */
export const encodeCapabilityDocument = (
  limits: RemoteCapabilitiesType,
): Uint8Array => encodeUnchecked(limits)

/**
 * Decode only exact canonical capability documents. Length and byte bounds
 * are checked by Schema before either uint32 field is observed.
 */
export const decodeCapabilityDocument = (
  input: Uint8Array | ReadonlyArray<number>,
): Option.Option<RemoteCapabilitiesType> => {
  const decodedBytes = Schema.decodeUnknownOption(CapabilityDocumentBytes)(Array.from(input))
  if (Option.isNone(decodedBytes)) return Option.none()

  const bytes = Uint8Array.from(decodedBytes.value)
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength)
  const decodedLimits = Schema.decodeUnknownOption(RemoteCapabilities)({
    maxBatchKeys: view.getUint32(0, false),
    maxBlobBytes: view.getUint32(4, false),
  }, { onExcessProperty: "error" })
  if (Option.isNone(decodedLimits)) return Option.none()
  return Equal.equals(Array.from(encodeUnchecked(decodedLimits.value)), decodedBytes.value)
    ? decodedLimits
    : Option.none()
}

/** Manifest-facing total result carrier. */
export const decodeCapabilityResult = (
  input: Uint8Array | ReadonlyArray<number>,
): CapabilityDecodeResult => {
  const decoded = decodeCapabilityDocument(input)
  return Option.isSome(decoded)
    ? { _tag: "Decoded", limits: decoded.value }
    : { _tag: "Rejected" }
}

/** Encode an order-preserving collection of 32-byte content identifiers. */
export const encodeKeyListDocument = (
  keys: ReadonlyArray<ContentIdType>,
): Uint8Array => {
  const bytes = new Uint8Array(4 + keys.length * 32)
  writeUint32(bytes, 0, keys.length)
  let offset = 4
  for (const key of keys) {
    const decoded = Encoding.decodeHex(key)
    if (decoded._tag === "Failure" || decoded.success.length !== 32) {
      throw new Error("validated ContentId failed key-list encoding")
    }
    bytes.set(decoded.success, offset)
    offset += 32
  }
  return bytes
}

/** Decode exactly one canonical, order-preserving key-list document. */
export const decodeKeyListDocument = (
  input: Uint8Array | ReadonlyArray<number>,
): Option.Option<ReadonlyArray<ContentIdType>> => {
  const decodedBytes = Schema.decodeUnknownOption(ByteArray)(Array.from(input))
  if (Option.isNone(decodedBytes) || decodedBytes.value.length < 4) return Option.none()
  const count = readUint32(decodedBytes.value, 0)
  if (decodedBytes.value.length !== 4 + count * 32) return Option.none()

  const keys: Array<ContentIdType> = []
  for (let index = 0; index < count; index += 1) {
    const offset = 4 + index * 32
    const key = Schema.decodeUnknownOption(ContentId)(
      Encoding.encodeHex(Uint8Array.from(decodedBytes.value.slice(offset, offset + 32))),
    )
    if (Option.isNone(key)) return Option.none()
    keys.push(key.value)
  }
  return Equal.equals(Array.from(encodeKeyListDocument(keys)), decodedBytes.value)
    ? Option.some(keys)
    : Option.none()
}

/** Decode the closed positional status document for the requested keys. */
export const decodePresenceDocument = (
  keys: ReadonlyArray<ContentIdType>,
  input: Uint8Array | ReadonlyArray<number>,
): Option.Option<CasPresence> => {
  const statuses = Schema.decodeUnknownOption(ByteArray)(Array.from(input))
  if (Option.isNone(statuses) || statuses.value.length !== keys.length) return Option.none()

  const present: Array<ContentIdType> = []
  const missing: Array<ContentIdType> = []
  const failed: Array<ContentIdType> = []
  for (let index = 0; index < statuses.value.length; index += 1) {
    const key = keys[index]
    if (key === undefined) return Option.none()
    switch (statuses.value[index]) {
      case 0:
        missing.push(key)
        break
      case 1:
        present.push(key)
        break
      case 2:
        failed.push(key)
        break
      default:
        return Option.none()
    }
  }
  return Option.some({ present, missing, failed })
}
