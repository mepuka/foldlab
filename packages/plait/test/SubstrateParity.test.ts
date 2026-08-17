import { afterEach, describe, expect, test } from "bun:test"

import {
  jetstream,
  jetstreamManager,
  JetStreamApiError,
  RetentionPolicy,
  StorageType,
} from "@nats-io/jetstream"
import { Kvm } from "@nats-io/kv"
import { connect } from "@nats-io/transport-node"

import { startNatsHarness, type NatsHarness } from "./NatsHarness.js"

const encode = (value: string): Uint8Array => new TextEncoder().encode(value)
let harness: NatsHarness | undefined

afterEach(async () => {
  if (harness !== undefined) await harness.stop()
  harness = undefined
})

type WrongLastOperation = "journal-cas" | "kv-create" | "kv-update"
type WrongLastClassification = "cas-conflict" | "key-exists" | "revision-mismatch"

const captureWrongLastSequence = async (
  run: () => Promise<unknown>,
): Promise<JetStreamApiError> => {
  let refusal: unknown
  try {
    await run()
  } catch (error) {
    refusal = error
  }
  expect(refusal).toBeInstanceOf(JetStreamApiError)
  const apiError = refusal as JetStreamApiError
  expect({ status: apiError.status, code: apiError.code }).toEqual({ status: 400, code: 10071 })
  return apiError
}

const classifyWrongLastSequence = (
  operation: WrongLastOperation,
  refusal: JetStreamApiError,
): WrongLastClassification => {
  expect({ status: refusal.status, code: refusal.code }).toEqual({ status: 400, code: 10071 })
  switch (operation) {
    case "journal-cas":
      return "cas-conflict"
    case "kv-create":
      return "key-exists"
    case "kv-update":
      return "revision-mismatch"
  }
}

describe("@nats-io 3.4.0 substrate parity wall", () => {
  test("classifies by operation context and exposes the pinned PubAck fields", async () => {
    harness = await startNatsHarness()
    const connection = await connect({ servers: harness.url })
    try {
      const js = jetstream(connection)
      const manager = await jetstreamManager(connection)
      await manager.streams.add({
        name: "TS_SUBSTRATE_PARITY",
        subjects: ["ts.parity.>"],
        retention: RetentionPolicy.Limits,
        storage: StorageType.File,
        num_replicas: 1,
        max_msgs: -1,
        max_bytes: -1,
        max_msgs_per_subject: -1,
      })

      const first = await js.publish("ts.parity.dedup", encode("first"), {
        msgID: "ts-puback-id",
      })
      const duplicate = await js.publish("ts.parity.dedup", encode("different bytes"), {
        msgID: "ts-puback-id",
      })
      expect(first).toEqual({
        stream: "TS_SUBSTRATE_PARITY",
        seq: 1,
        duplicate: false,
      })
      expect(duplicate).toEqual({
        stream: "TS_SUBSTRATE_PARITY",
        seq: 1,
        duplicate: true,
      })

      const casFirst = await js.publish("ts.parity.cas", encode("cas"), {
        msgID: "ts-cas-id",
        expect: { lastSubjectSequence: 0 },
      })
      expect(casFirst).toEqual({
        stream: "TS_SUBSTRATE_PARITY",
        seq: 2,
        duplicate: false,
      })
      const journalCasRefusal = await captureWrongLastSequence(() =>
        js.publish("ts.parity.cas", encode("cas"), {
          msgID: "ts-cas-id",
          expect: { lastSubjectSequence: 0 },
        }),
      )
      const casDuplicate = await js.publish("ts.parity.cas", encode("changed bytes"), {
        msgID: "ts-cas-id",
        expect: { lastSubjectSequence: 2 },
      })
      expect(casDuplicate).toEqual({
        stream: "TS_SUBSTRATE_PARITY",
        seq: 2,
        duplicate: true,
      })

      const kv = await new Kvm(connection).create("TS_SUBSTRATE_PARITY", {
        history: 8,
        replicas: 1,
        storage: StorageType.File,
      })
      const created = await kv.create("alpha", encode("created"))
      expect(created).toBe(1)
      const duplicateCreateRefusal = await captureWrongLastSequence(() =>
        kv.create("alpha", encode("duplicate")),
      )
      const updated = await kv.update("alpha", encode("updated"), created)
      expect(updated).toBe(2)
      const staleUpdateRefusal = await captureWrongLastSequence(() =>
        kv.update("alpha", encode("stale"), created),
      )

      const classifications: ReadonlyArray<WrongLastClassification> = [
        classifyWrongLastSequence("journal-cas", journalCasRefusal),
        classifyWrongLastSequence("kv-create", duplicateCreateRefusal),
        classifyWrongLastSequence("kv-update", staleUpdateRefusal),
      ]
      expect(classifications).toEqual(["cas-conflict", "key-exists", "revision-mismatch"])

      const labelSwapPlant: ReadonlyArray<WrongLastClassification> = [
        classifyWrongLastSequence("journal-cas", journalCasRefusal),
        classifyWrongLastSequence("kv-update", duplicateCreateRefusal),
        classifyWrongLastSequence("kv-create", staleUpdateRefusal),
      ]
      expect(labelSwapPlant).not.toEqual(["cas-conflict", "key-exists", "revision-mismatch"])

      console.info(
        "SUBSTRATE TS TRACE clients=@nats-io/*@3.4.0 errors=[journal-cas:400/10071=>cas-conflict,kv-create:400/10071=>key-exists,kv-update:400/10071=>revision-mismatch] label-swap=refused puback=[stream,seq,duplicate] cas-precedence=[2/new,400/10071,2/duplicate]",
      )
    } finally {
      await connection.close()
    }
  }, 120_000)
})
