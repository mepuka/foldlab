import { afterEach, describe, expect, test } from "bun:test"

import { StorageType, jetstreamManager } from "@nats-io/jetstream"
import { connect } from "@nats-io/transport-node"
import { Effect } from "effect"

import { canonicalBytes } from "../src/Canonical.js"
import { FabricClient } from "../src/FabricClient.js"
import { StructuralRefusalKind } from "../src/Refusal.js"
import { evidenceSubject } from "../src/Subjects.js"
import {
  decodeEnvelope,
  INLINE_BODY_MAX_BYTES,
  verifyEnvelopeDigest,
} from "../src/Wire.js"
import { startNatsHarness, type NatsHarness } from "./NatsHarness.js"

const utf8 = new TextEncoder()
const digest = "015abd7f5cc57a2dd94b7590f04ad8084273905ee33ec5cebeae62276a97f862"
const envelope = (body: unknown): Uint8Array => utf8.encode(JSON.stringify({
  v: 0,
  kind: "emit",
  lane: digest,
  key: "entity-1",
  holder: "seat-a",
  body,
  pins: [],
}))

let harness: NatsHarness | undefined

afterEach(async () => {
  if (harness !== undefined) await harness.stop()
  harness = undefined
})

describe("structural refusal repairs", () => {
  test("every shipped structural kind carries a taught next action", async () => {
    const refusals = await Promise.all([
      Effect.runPromise(Effect.flip(canonicalBytes(Number.NaN))),
      Effect.runPromise(Effect.flip(evidenceSubject("lane.*", 0))),
      Effect.runPromise(Effect.flip(decodeEnvelope(utf8.encode("{}")))),
      Effect.runPromise(Effect.flip(decodeEnvelope(envelope({ blob: "not-a-digest" })))),
      Effect.runPromise(Effect.flip(decodeEnvelope(envelope(
        "x".repeat(INLINE_BODY_MAX_BYTES - 1),
      )))),
      Effect.runPromise(Effect.flip(verifyEnvelopeDigest(envelope(1), "0".repeat(64)))),
    ])

    harness = await startNatsHarness()
    const connection = await connect({ servers: harness.url })
    try {
      const manager = await jetstreamManager(connection)
      await manager.streams.add({
        name: "WRONG_SHAPE",
        subjects: ["flb.fab.ev.*.*"],
        storage: StorageType.Memory,
        num_replicas: 1,
      })
    } finally {
      await connection.close()
    }
    const substrate = await Effect.runPromise(
      FabricClient.pipe(
        Effect.provide(FabricClient.layer({
          servers: harness.url,
          stream: "WRONG_SHAPE",
        })),
        Effect.scoped,
        Effect.flip,
      ),
    )
    if (substrate.sort !== "structural") {
      throw new Error(`expected substrate-shape structural refusal, got ${substrate.kind}`)
    }
    refusals.push(substrate)

    expect(refusals.map((refusal) => refusal.kind).sort()).toEqual(
      [...StructuralRefusalKind.literals].sort(),
    )
    for (const refusal of refusals) {
      expect(refusal.sort).toBe("structural")
      expect(refusal.next.length, refusal.kind).toBeGreaterThan(0)
    }
  }, 120_000)
})
