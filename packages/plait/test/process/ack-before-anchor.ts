import {
  AckPolicy,
  DeliverPolicy,
  ReplayPolicy,
  jetstream,
  jetstreamManager,
} from "@nats-io/jetstream"
import { connect } from "@nats-io/transport-node"
import { Effect } from "effect"

import { evidenceSubject } from "../../src/kernel/Subjects.js"
import { laneStreamName } from "../../src/internal/lanes.js"
import { PUMP_ACK_WAIT_NANOS, PUMP_BUFFER_BOUND } from "../../src/internal/pump.js"
import { declareChaosCounter } from "../ChaosFixture.js"

const [url, handleName, partitionText, markerPath] = process.argv.slice(2)
if (url === undefined || handleName === undefined || partitionText === undefined || markerPath === undefined) {
  throw new Error("ack-before-anchor arguments are incomplete")
}
const partition = Number(partitionText)
const { fold } = await Effect.runPromise(declareChaosCounter(handleName))
const connection = await connect({ servers: url, name: "foldlab-ack-before-anchor-mutant" })
const stream = laneStreamName(fold.lane, partition)
const subject = await Effect.runPromise(evidenceSubject(fold.lane.handle, partition))
const name = `FLB_FOLD_${fold.digest}`
const manager = await jetstreamManager(connection)
await manager.consumers.add(stream, {
  durable_name: name,
  ack_policy: AckPolicy.Explicit,
  deliver_policy: DeliverPolicy.StartSequence,
  opt_start_seq: 1,
  replay_policy: ReplayPolicy.Instant,
  filter_subject: subject,
  ack_wait: PUMP_ACK_WAIT_NANOS,
  max_ack_pending: PUMP_BUFFER_BOUND,
})
const consumer = await jetstream(connection).consumers.get(stream, name)
const message = await consumer.next({ expires: 5_000 })
if (message === null) throw new Error("mutant found no message to acknowledge")
if (!await message.ackAck({ timeout: 5_000 })) throw new Error("mutant ack was not confirmed")
await Bun.write(markerPath, JSON.stringify({ partition, acked: message.seq, anchored: false }))

// The parent applies TerminateProcess/SIGKILL. No release or anchor write runs.
await new Promise<never>(() => {})
