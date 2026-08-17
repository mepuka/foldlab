import type { Effect } from "effect"

import { canonicalBytes } from "../src/Canonical.js"
import { digestOf } from "../src/Digest.js"
import type { FabricClientService } from "../src/FabricClient.js"
import type { Refusal } from "../src/Refusal.js"
import { retryAbsence } from "../src/Refusal.js"
import { evidenceSubject, factSubject, nodeSubject } from "../src/Subjects.js"
import { decodeEnvelope, encodeEnvelope, verifyEnvelopeDigest } from "../src/Wire.js"

type PublicFunction = (...args: ReadonlyArray<never>) => unknown

/** Whether a public function returns an Effect whose complete error type is Refusal. */
export type IsRefusalEffect<F extends PublicFunction> =
  ReturnType<F> extends Effect.Effect<unknown, infer E, unknown>
    ? [E] extends [Refusal] ? true : false
    : false

/** Fails compilation unless its argument is literally true. */
export type Assert<T extends true> = T

/** Compile-time inventory of every exported fallible Effect operation in slice 0. */
export type PublicEffectErrorConformance = [
  Assert<IsRefusalEffect<typeof canonicalBytes>>,
  Assert<IsRefusalEffect<typeof digestOf>>,
  Assert<IsRefusalEffect<typeof evidenceSubject>>,
  Assert<IsRefusalEffect<typeof factSubject>>,
  Assert<IsRefusalEffect<typeof nodeSubject>>,
  Assert<IsRefusalEffect<typeof decodeEnvelope>>,
  Assert<IsRefusalEffect<typeof encodeEnvelope>>,
  Assert<IsRefusalEffect<typeof verifyEnvelopeDigest>>,
  Assert<IsRefusalEffect<typeof retryAbsence>>,
  Assert<IsRefusalEffect<FabricClientService["publish"]>>,
  Assert<IsRefusalEffect<FabricClientService["subscribe"]>>,
]
