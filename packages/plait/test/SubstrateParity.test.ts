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
import {
  assertDistinguishingFieldSet,
  pinnedWrongLastSequenceShape,
  wireShape,
} from "./WrongLastSequenceShape.js"

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

// The substrate emits no distinguishing signal for these refusals (DEV-704),
// so classification can never be derived from the refusal: it is a
// client-side convention keyed by operation context (part 1 §6.3). The
// refusal contributes exactly two facts — it is a wrong-last-sequence
// refusal, and it reports the journal state its capture site produced. The
// fixture seeds the journal so the three reported states are PAIRWISE
// DISTINCT (3, 1, 2), which is what lets the state pin refuse every
// cross-position substitution rather than only the uniquely-numbered one.
const classifyWrongLastSequence = (
  operation: WrongLastOperation,
  refusal: JetStreamApiError,
  capturedJournalState: string,
): WrongLastClassification => {
  expect({ status: refusal.status, code: refusal.code }).toEqual({ status: 400, code: 10071 })
  expect(refusal.message).toBe(capturedJournalState)
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
  test("pins wire-indistinguishable refusals, context-convention classification, and the PubAck fields", async () => {
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
      // One seeded frame keeps the three refusals' reported journal states
      // pairwise distinct (journal-cas: 3, kv-create: 1, kv-update: 2), so no
      // captured refusal can stand in for another at any position.
      const casSeed = await js.publish("ts.parity.cas", encode("seed"), {
        expect: { lastSubjectSequence: 2 },
      })
      expect(casSeed).toEqual({
        stream: "TS_SUBSTRATE_PARITY",
        seq: 3,
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
        expect: { lastSubjectSequence: 3 },
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

      // The wall: on this client pin the three refusals are
      // wire-indistinguishable. Every distinguishing-capable field is
      // identical once journal state is masked; the day @nats-io/* starts
      // telling create-conflict from update-conflict apart, these three stop
      // matching one pinned shape and this wall REDS — that drift is the one
      // thing the wall exists to catch. The field-set guard pins WHAT the
      // wall compares: narrowing either side of the comparison reds here.
      assertDistinguishingFieldSet(pinnedWrongLastSequenceShape)
      for (const refusal of [journalCasRefusal, duplicateCreateRefusal, staleUpdateRefusal]) {
        assertDistinguishingFieldSet(wireShape(refusal))
      }
      expect(wireShape(journalCasRefusal)).toEqual(pinnedWrongLastSequenceShape)
      expect(wireShape(duplicateCreateRefusal)).toEqual(pinnedWrongLastSequenceShape)
      expect(wireShape(staleUpdateRefusal)).toEqual(pinnedWrongLastSequenceShape)

      // The convention, layered on that indistinguishable wire: operation
      // context decides the classification. The state pin binds each captured
      // refusal to the operation that raised it — journal CAS refused at
      // subject sequence 3, duplicate create at bucket revision 1, stale
      // update at bucket revision 2: pairwise distinct by the seeded frame,
      // deterministic in this fixture.
      const classifications: ReadonlyArray<WrongLastClassification> = [
        classifyWrongLastSequence("journal-cas", journalCasRefusal, "wrong last sequence: 3"),
        classifyWrongLastSequence("kv-create", duplicateCreateRefusal, "wrong last sequence: 1"),
        classifyWrongLastSequence("kv-update", staleUpdateRefusal, "wrong last sequence: 2"),
      ]
      expect(classifications).toEqual(["cas-conflict", "key-exists", "revision-mismatch"])

      console.info(
        "SUBSTRATE TS TRACE clients=@nats-io/*@3.4.0 wrong-last-sequence=400/10071 wire-indistinguishable=[constructor,name,status,code,message,cause,apiError] field-set=pinned classification=operation-context-convention states=[journal-cas:3,kv-create:1,kv-update:2]=pairwise-distinct puback=[stream,seq,duplicate] cas-precedence=[2/new,3/seed,400/10071,2/duplicate]",
      )
    } finally {
      await connection.close()
    }
  }, 120_000)
})
