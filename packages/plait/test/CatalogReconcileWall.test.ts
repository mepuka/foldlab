import { afterEach, describe, expect, test } from "bun:test"
import { resolve as resolvePath } from "node:path"

import { JetStreamApiError } from "@nats-io/jetstream"
import { Kvm, type KV } from "@nats-io/kv"
import { connect } from "@nats-io/transport-node"
import { Effect, Option, Result } from "effect"

import { trustingReconcileStore } from "../negative-controls/Catalog.trusting-reconcile.mutant.js"
import {
  catalogStoreOver,
  openCatalogBucket,
  reconcileByReadBack,
  valueKey,
} from "../src/internal/catalogs.js"
import { CATALOG_BUCKET } from "../src/planes/Catalog.js"
import { startNatsHarness, type NatsHarness } from "./NatsHarness.js"
import {
  assertDistinguishingFieldSet,
  pinnedWrongLastSequenceShape,
  wireShape,
} from "./WrongLastSequenceShape.js"

const trace = resolvePath(
  import.meta.dir,
  "../negative-controls/Catalog.trusting-reconcile.trace.json",
)

let harness: NatsHarness | undefined

afterEach(async () => {
  if (harness !== undefined) await harness.stop()
  harness = undefined
})

const encoder = new TextEncoder()

/**
 * A genuine server-minted wrong-last-sequence, taken from the substrate rather
 * than fabricated here.
 *
 * The control needs a real one because the whole point is that the client
 * cannot tell a spurious report from a genuine one: fabricating a lookalike
 * would prove only that the code believes this test's fiction. The shape is
 * held to the pinned wire shape at the same time, so a report that stopped
 * looking like the one the tolerance is about fails here rather than silently
 * passing through.
 */
const captureWrongLastSequence = async (bucket: KV): Promise<JetStreamApiError> => {
  const probe = "control.wrong-last-sequence"
  await bucket.create(probe, encoder.encode("first"))
  try {
    await bucket.create(probe, encoder.encode("second"))
  } catch (cause) {
    if (!(cause instanceof JetStreamApiError)) {
      throw new Error(`a duplicate create raised ${String(cause)}, not a JetStream API error`)
    }
    const shape = wireShape(cause)
    assertDistinguishingFieldSet(shape)
    expect(shape).toEqual(pinnedWrongLastSequenceShape)
    return cause
  }
  throw new Error("a duplicate create did not refuse")
}

/**
 * The bucket every arm of this control runs over: a create that LANDS and then
 * reports wrong-last-sequence anyway.
 *
 * That is the shape of the upstream defect this store's tolerance exists for —
 * a create whose outcome the client cannot read off its own report. The
 * interposition is on the substrate handle, behind the store's API, so the
 * store under test is the shipped one and nothing in it knows this is a
 * control.
 */
const spuriouslyRefusingCreate = (bucket: KV, planted: JetStreamApiError): KV =>
  new Proxy(bucket, {
    get(target, property, receiver) {
      if (property === "create") {
        return async (key: string, value: Uint8Array): Promise<number> => {
          await target.create(key, value)
          throw planted
        }
      }
      const held: unknown = Reflect.get(target, property, receiver)
      return typeof held === "function" ? held.bind(target) : held
    },
  }) as KV

describe("the duplicate-create reconcile tolerates a spurious wrong-last-sequence", () => {
  /**
   * The ratified wall.
   *
   * `nats-io/nats-server` issue 5162 — a KV `Create` racing a `Delete` on a
   * tombstoned key returns a spurious wrong-last-sequence — is OPEN and judged
   * on the record to be unfixable under the current protocol, so the client's
   * tolerance of a spurious report is load-bearing and removing it means
   * checking that stated fact first. This row is the mechanical half: the
   * shipped read-back-and-compare disposition admits a value whose create
   * landed and reported a conflict anyway, and the variant that believes the
   * report refuses it.
   */
  test("the shipped reconcile admits it; the trusting variant refuses and is killed", async () => {
    harness = await startNatsHarness()
    const connection = await connect({ servers: harness.url })
    try {
      const bucket = await Effect.runPromise(openCatalogBucket(connection))
      const planted = await captureWrongLastSequence(bucket)
      const substrate = spuriouslyRefusingCreate(bucket, planted)

      const lawfulValue = { reconciled: "by read-back" }
      const lawful = await Effect.runPromise(Effect.result(
        catalogStoreOver(substrate, reconcileByReadBack).put(lawfulValue),
      ))
      if (Result.isFailure(lawful)) {
        throw new Error(`the shipped reconcile refused a landed create: ${lawful.failure.kind}`)
      }
      const admitted = lawful.success

      // The bytes really are at the key: the create landed, which is exactly
      // what makes the report spurious and the read-back decisive.
      const raw = await bucket.get(valueKey(admitted))
      if (raw === null) throw new Error("the interposed create did not land its bytes")
      const served = await Effect.runPromise(
        catalogStoreOver(bucket, reconcileByReadBack).get(admitted),
      )
      expect(Option.getOrNull(served)).toEqual(lawfulValue)

      const mutantValue = { reconciled: "not at all" }
      const mutant = await Effect.runPromise(Effect.result(
        trustingReconcileStore(substrate).put(mutantValue),
      ))
      if (!Result.isFailure(mutant)) {
        throw new Error("the trusting variant admitted a create it did not read back")
      }

      // The variant refused a value the store is holding: its own create landed
      // the bytes. Re-presenting the same value through the shipped store takes
      // the ordinary duplicate-create path — a genuine wrong-last-sequence this
      // time — and the same read-back admits it, so the two reports are shown
      // to be indistinguishable at the seam that has to dispose of them.
      const strandedDigest = await Effect.runPromise(
        catalogStoreOver(bucket, reconcileByReadBack).put(mutantValue),
      )
      const stranded = await Effect.runPromise(
        catalogStoreOver(bucket, reconcileByReadBack).get(strandedDigest),
      )

      const record = {
        control: "runtime-catalog-trusting-reconcile-mutant",
        schedule: "a create that landed, reporting the pinned wrong-last-sequence anyway",
        plantedCode: planted.code,
        plantedStatus: planted.status,
        lawfulVerdict: "admitted",
        lawfulDigest: admitted,
        mutantVerdict: "refused",
        mutantRefusal: {
          sort: mutant.failure.sort,
          kind: mutant.failure.kind,
          law: mutant.failure.law,
          got: mutant.failure.got,
        },
        valueTheMutantRefusedIsHeld: Option.isSome(stranded),
        violatedLaw:
          "a wrong-last-sequence is evidence about a sequence number and never about content, so the bytes at the digest key settle the create",
      }
      expect(JSON.stringify(record, null, 2) + "\n").toBe(await Bun.file(trace).text())
    } finally {
      await connection.close()
    }
  }, 180_000)

  test("the control ran against the ruled bucket, not one it made up", async () => {
    harness = await startNatsHarness()
    const connection = await connect({ servers: harness.url })
    try {
      await Effect.runPromise(openCatalogBucket(connection))
      const status = await (await new Kvm(connection).open(CATALOG_BUCKET)).status()
      expect(status.bucket).toBe(CATALOG_BUCKET)
      expect(status.storage).toBe("file")
      expect(status.replicas).toBe(1)
      expect(status.history).toBe(1)
    } finally {
      await connection.close()
    }
  }, 120_000)
})
