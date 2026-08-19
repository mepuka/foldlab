import { afterEach, describe, expect, test } from "bun:test"

import { Kvm } from "@nats-io/kv"
import { connect } from "@nats-io/transport-node"
import { Effect, Result } from "effect"

import { REGISTER_BUCKET, Registers, OutcomeValue, WorkKey } from "../src/planes/Register.js"
import { startNatsHarness, type NatsHarness } from "./NatsHarness.js"
import { Holder } from "../src/kernel/Wire.js"

/**
 * What the register's pre-CAS reads decide, measured against a real server.
 *
 * This file makes NO repair and proposes none. It exists because the audit's
 * F-3 disposition turns on one question — whether the compare-and-set the
 * pre-check precedes would reach the same verdict on its own — and that
 * question is answerable on the substrate rather than by reading.
 *
 * **What a single-replica server cannot show.** The finding's failure mode is a
 * direct get served by a replica that has not applied the leader's latest
 * revision. One replica is the only replica, so nothing here reproduces
 * staleness, and no row below claims to. What is measurable here is the shape
 * the finding rests on: that the bucket is opened with the direct-read route
 * enabled and pinned to one replica, and — the load-bearing half — what the
 * compare-and-set does and does not arbitrate once a pre-check is passed.
 */

let harness: NatsHarness | undefined

afterEach(async () => {
  if (harness !== undefined) await harness.stop()
  harness = undefined
})

const work = WorkKey.make("0123456789abcdef")

interface StoredRegister {
  readonly holder: string
  readonly outcome: null | { readonly token: number; readonly value: string }
}

describe("register pre-CAS reads", () => {
  test("the bucket is opened direct-read and single-replica, which is what makes the pre-check's read authoritative", async () => {
    harness = await startNatsHarness()
    const url = harness.url
    await Effect.runPromise(
      Effect.gen(function* () {
        const registers = yield* Registers
        yield* registers.grant(work, Holder.make("holder"))
      }).pipe(Effect.provide(Registers.layer({ servers: url })), Effect.scoped, Effect.orDie),
    )

    const connection = await connect({ servers: url })
    try {
      const bucket = await new Kvm(connection).open(REGISTER_BUCKET)
      const status = await bucket.status()
      expect(status.replicas).toBe(1)
      expect(status.streamInfo.config.allow_direct).toBe(true)
      console.log(
        `REGISTER PRECHECK TRACE route=direct-get replicas=${status.replicas} ` +
          `allow_direct=${status.streamInfo.config.allow_direct} ` +
          `bound=one-replica-cannot-lag-behind-itself`,
      )
    } finally {
      await connection.close()
    }
  }, 120_000)

  test("the compare-and-set arbitrates the revision and never the outcome's immutability", async () => {
    harness = await startNatsHarness()
    const url = harness.url

    const landed = await Effect.runPromise(
      Effect.gen(function* () {
        const registers = yield* Registers
        const granted = yield* registers.grant(work, Holder.make("holder"))
        yield* registers.commit(work, granted.token, OutcomeValue.make("first"))
        // The shipped door refuses a second commit, and the reason it gives is
        // the outcome — not the token. That refusal is a PRE-check: it is
        // decided from a read, before any compare-and-set is attempted.
        const second = yield* Effect.result(registers.commit(work, granted.token, OutcomeValue.make("second")))
        return { granted: granted.token, second }
      }).pipe(Effect.provide(Registers.layer({ servers: url })), Effect.scoped, Effect.orDie),
    )
    expect(Result.isFailure(landed.second)).toBe(true)
    expect((landed.second as { failure: { kind: string } }).failure.kind).toBe(
      "outcome-already-landed",
    )

    const connection = await connect({ servers: url })
    try {
      const bucket = await new Kvm(connection).open(REGISTER_BUCKET)
      const entry = await bucket.get(work)
      expect(entry).not.toBeNull()
      const stored = entry!.json<StoredRegister>()
      expect(stored.outcome?.value).toBe("first")
      const current = entry!.revision

      // The substrate's own compare-and-set, presented with the revision the
      // landing produced. It succeeds: the CAS compares revisions and knows
      // nothing about an outcome having landed. So the immutability law is
      // held by the pre-check alone — a read — and not by the authority the
      // pre-check precedes. Any disposition that demotes the pre-check to an
      // advisory optimization has to answer for this row.
      const overwritten = await bucket.update(
        work,
        new TextEncoder().encode(
          JSON.stringify({
            holder: stored.holder,
            outcome: { token: current, value: "second" },
          } satisfies StoredRegister),
        ),
        current,
      )
      expect(overwritten).toBeGreaterThan(current)

      const after = await bucket.get(work)
      expect(after!.json<StoredRegister>().outcome?.value).toBe("second")
      console.log(
        `REGISTER PRECHECK TRACE landed-at=${current} shipped-second-commit=refused:outcome-already-landed ` +
          `raw-cas-at-${current}=accepted revision=${overwritten} outcome=first->second ` +
          `arbitrated-by=pre-check-not-cas`,
      )
    } finally {
      await connection.close()
    }
  }, 120_000)
})
