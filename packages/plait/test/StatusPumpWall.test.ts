import { mkdtemp, readdir, readFile, rm } from "node:fs/promises"
import { tmpdir } from "node:os"
import { join } from "node:path"

import { afterEach, describe, expect, test } from "bun:test"

import { Effect } from "effect"

import type { SessionFact } from "../src/internal/sessionfacts.js"
import { transportRefusal } from "../src/internal/lanes.js"
import { establishConnection } from "../src/internal/transport.js"
import type { StatusPump } from "../src/internal/statuspump.js"
import { CONNECTION_TRANSITIONS } from "../src/internal/statusvocabulary.js"
import { CONNECT_OPTION_DEFAULTS } from "../src/internal/substrate.js"
import { buildServerBinary, startNatsHarness, type NatsHarness } from "./NatsHarness.js"

/**
 * The status pump against a real server, taken away.
 *
 * Three arms, and the claim in each is the SHAPE. The kill arm claims an
 * ordered sequence — a drop, then one attempt per retry, then a permanent
 * teardown carrying the cause the pin resolved — and reports the attempt count
 * and the elapsed span as MEASUREMENTS rather than asserting them as bounds:
 * they are one host on one night and the next host will produce its own. The
 * restart arm claims the successor chain. The readings arm claims that a
 * reading lands as a reading.
 *
 * Nothing here changes a declared connect-option value. If the attempt budget
 * exhausts, that is a measurement to report and not a licence to move the pin.
 */

const LAYER = "foldlab-plait-lanes"

let harness: NatsHarness | undefined
let restarted: { readonly stop: () => Promise<void> } | undefined

afterEach(async () => {
  if (restarted !== undefined) await restarted.stop()
  restarted = undefined
  if (harness !== undefined) await harness.stop()
  harness = undefined
})

const portOf = (url: string): number => {
  const port = Number.parseInt(url.slice(url.lastIndexOf(":") + 1), 10)
  if (!Number.isFinite(port)) throw new Error(`no port in ${url}`)
  return port
}

/**
 * Brings a server back up on a port a previous incarnation held.
 *
 * The harness mints a fresh port per server, which is exactly right for row
 * isolation and exactly wrong for a reconnect: the client retries the address
 * it was given. So the restart arm gets its own launcher, on the same pinned
 * binary and the same fresh store, bound to the address the client is still
 * trying.
 */
const startAtPort = async (port: number): Promise<{
  readonly url: string
  readonly stop: () => Promise<void>
}> => {
  const { binary } = await buildServerBinary()
  const directory = await mkdtemp(join(tmpdir(), "plait-status-"))
  const server = Bun.spawn({
    cmd: [
      binary,
      "-js",
      "-sd",
      join(directory, "store"),
      "-a",
      "127.0.0.1",
      "-p",
      String(port),
      "--ports_file_dir",
      directory,
    ],
    stdout: "ignore",
    stderr: "ignore",
  })
  for (let attempt = 0; attempt < 2400; attempt++) {
    const file = (await readdir(directory)).find((name) => name.endsWith(".ports"))
    if (file !== undefined) {
      const ports = JSON.parse(await readFile(join(directory, file), "utf8")) as {
        readonly nats: ReadonlyArray<string>
      }
      const url = ports.nats[0]
      if (url === undefined) throw new Error("restarted server wrote no client URL")
      return {
        url,
        stop: async () => {
          server.kill()
          await server.exited
          await rm(directory, { recursive: true, force: true })
        },
      }
    }
    await Bun.sleep(25)
  }
  server.kill()
  await server.exited
  await rm(directory, { recursive: true, force: true })
  throw new Error("restarted server did not write its ports file")
}

/** Takes from the pump until the predicate holds or the bound is spent. */
const drainUntil = (
  pump: StatusPump,
  holds: (facts: ReadonlyArray<SessionFact>) => boolean,
  bound: number,
): Effect.Effect<ReadonlyArray<SessionFact>> =>
  Effect.gen(function* () {
    const seen: Array<SessionFact> = []
    for (let attempt = 0; attempt < bound; attempt++) {
      seen.push(...(yield* pump.take))
      if (holds(seen)) return seen
      yield* Effect.sleep(50)
    }
    return seen
  })

const isEnded = (fact: SessionFact): boolean => fact.kind === "substrate-session-ended"

const eventOf = (fact: SessionFact): string =>
  fact.kind === "substrate-session-transition" || fact.kind === "substrate-session-observation"
    ? fact.event
    : fact.kind

describe("the status pump over a real substrate", () => {
  test(
    "the server is killed: a drop, then one fact per attempt, then a permanent teardown, in order",
    async () => {
      harness = await startNatsHarness()
      const url = harness.url

      const measured = await Effect.runPromise(Effect.scoped(Effect.gen(function* () {
        const established = yield* establishConnection(
          { servers: url },
          LAYER,
          "wall.status.establish",
          transportRefusal,
        )
        // The session fact this slice's predecessor mints is what every fact
        // below cites; the arm depends on it and says so.
        expect(established.minted.established.kind).toBe("substrate-session-established")
        expect(established.minted.established.session).toBe(established.minted.digest)
        expect(established.minted.established.predecessor).toBe(null)

        const started = Date.now()
        yield* Effect.promise(async () => {
          if (harness !== undefined) await harness.stop()
          harness = undefined
        })
        const facts = yield* drainUntil(
          established.pump,
          (seen) => seen.some(isEnded),
          2400,
        )
        return { facts, session: established.minted.digest, elapsed: Date.now() - started }
      })).pipe(Effect.orDie))

      const names = measured.facts.map(eventOf)
      // Order is the claim, and it is asserted on the SEQUENCE rather than on a
      // set: a drop first, retries next, teardown last and once.
      expect(names[0]).toBe("disconnect")
      expect(names[names.length - 1]).toBe("substrate-session-ended")
      expect(names.filter((name) => name === "substrate-session-ended").length).toBe(1)
      const attempts = names.filter((name) => name === "reconnecting")
      expect(attempts.length).toBeGreaterThan(0)
      const middle = names.slice(1, names.length - 1)
      expect(middle.every((name) => name === "reconnecting" || name === "staleConnection"))
        .toBe(true)

      // Every fact cites the session, and the transitions name the states the
      // machine's own rows enter.
      const states = new Set(CONNECTION_TRANSITIONS.map((row) => row.state))
      for (const fact of measured.facts) {
        expect(fact.session).toBe(measured.session)
        if (fact.kind !== "substrate-session-transition") continue
        expect(states.has(fact.to as never)).toBe(true)
      }

      // The teardown carries the cause the pin resolved, not one inferred here.
      const ended = measured.facts.find(isEnded) as { readonly cause: string }
      expect(ended.cause.length).toBeGreaterThan(0)

      // MEASUREMENTS, reported and not asserted as bounds. The shape above is
      // the claim; these two numbers are one host on one night.
      console.log(
        `STATUS PUMP MEASUREMENT: ${attempts.length} retry facts observed at a declared budget of ${
          String(CONNECT_OPTION_DEFAULTS["maxReconnectAttempts"])
        }; ${measured.elapsed}ms from the kill to the teardown fact; ${measured.facts.length} facts in total.`,
      )
    },
    240_000,
  )

  test(
    "the server comes back: a re-attach fact, then a successor session naming its predecessor",
    async () => {
      harness = await startNatsHarness()
      const url = harness.url
      const port = portOf(url)

      const observed = await Effect.runPromise(Effect.scoped(Effect.gen(function* () {
        const established = yield* establishConnection(
          { servers: url },
          LAYER,
          "wall.status.reconnect",
          transportRefusal,
        )
        const first = established.minted
        yield* Effect.promise(async () => {
          if (harness !== undefined) await harness.stop()
          harness = undefined
        })
        // Wait for the drop, then bring the substrate back well inside the
        // declared attempt budget so the connection re-attaches rather than
        // exhausting.
        yield* drainUntil(
          established.pump,
          (seen) => seen.some((fact) => eventOf(fact) === "disconnect"),
          600,
        ).pipe(Effect.asVoid)
        yield* Effect.promise(async () => {
          restarted = await startAtPort(port)
        })
        const facts = yield* drainUntil(
          established.pump,
          (seen) => seen.some((fact) => fact.kind === "substrate-session-established"),
          1200,
        )
        return { facts, first, live: yield* established.pump.session }
      })).pipe(Effect.orDie))

      const names = observed.facts.map(eventOf)
      expect(names).toContain("reconnect")
      const successor = observed.facts.find(
        (fact) => fact.kind === "substrate-session-established",
      ) as { readonly session: string; readonly predecessor: string | null }
      expect(successor.predecessor).toBe(observed.first.digest)
      expect(successor.session).not.toBe(observed.first.digest)
      // The re-attach fact comes first and cites the session that was live when
      // the client sent it; the successor's establishment follows it.
      expect(names.indexOf("reconnect"))
        .toBeLessThan(names.indexOf("substrate-session-established"))
      const moved = observed.facts.find((fact) => eventOf(fact) === "reconnect")!
      expect(moved.session).toBe(observed.first.digest)
      // The predecessor's own fact is exactly as it was minted; nothing edited it.
      expect(observed.first.established.predecessor).toBe(null)
      expect(observed.first.established.session).toBe(observed.first.digest)
      // And the pump now cites the successor.
      expect(String(observed.live)).toBe(successor.session)
    },
    240_000,
  )

  test(
    // The other reading this arm was commissioned to induce is the client's own
    // ping, and it is NOT induced here: the client emits one on its declared
    // ping interval, that interval is a declared connect option, and this slice
    // may not move a declared value to make a test convenient. The ping row is
    // exercised over a constructed status value in the brokerless suite, where
    // the value is the pin's own shape and no option has to move.
    "a reading taken on a live connection lands as an observation, never as a state",
    async () => {
      harness = await startNatsHarness()
      const url = harness.url

      const facts = await Effect.runPromise(Effect.scoped(Effect.gen(function* () {
        const established = yield* establishConnection(
          { servers: url },
          LAYER,
          "wall.status.readings",
          transportRefusal,
        )
        // A subscription that falls behind its declared budget is the reading
        // this substrate produces on demand: the client watches its own pending
        // count and reports the crossing on the status source. Nothing is
        // iterated, so the messages pile up behind the budget of one.
        yield* Effect.sync(() => {
          established.connection.subscribe("wall.status.slow", { slow: 1 })
          for (let message = 0; message < 8; message++) {
            established.connection.publish("wall.status.slow", new Uint8Array([message]))
          }
        })
        yield* Effect.promise(() => established.connection.flush()).pipe(Effect.ignore)
        return yield* drainUntil(
          established.pump,
          (seen) => seen.some((fact) => fact.kind === "substrate-session-observation"),
          200,
        )
      })).pipe(Effect.orDie))

      const observations = facts.filter(
        (fact) => fact.kind === "substrate-session-observation",
      )
      // The arm is not vacuous: a real reading was induced on a real
      // connection and it landed.
      expect(observations.length).toBeGreaterThan(0)
      expect(observations.map((fact) => (fact as { readonly event: string }).event))
        .toContain("slowConsumer")

      // Nothing that landed is a state the machine names, and every observation
      // carries the state it was read within rather than being one. This arm is
      // the runtime half; the standing half is the machine table itself, which
      // names no reading as a state at all.
      const states = new Set(CONNECTION_TRANSITIONS.map((row) => row.state))
      for (const fact of facts) {
        if (fact.kind !== "substrate-session-observation") continue
        expect(states.has(fact.event as never)).toBe(false)
        // Read on a live connection that has moved nowhere: no transition has
        // been observed on this session, and a reading did not invent one.
        expect(fact.state).toBe(null)
        expect(Object.keys(fact.payload).sort()).toEqual(["pending", "sub"])
      }
      // No transition fact landed at all: a reading moves the machine nowhere.
      expect(facts.filter((fact) => fact.kind === "substrate-session-transition").length).toBe(0)
      console.log(
        `STATUS PUMP MEASUREMENT: ${observations.length} readings observed on a live connection; ${facts.length} facts in total.`,
      )
    },
    120_000,
  )

  test(
    "the spine attaches exactly one pump per connection, and a second connection gets its own",
    async () => {
      harness = await startNatsHarness()
      const url = harness.url
      const both = await Effect.runPromise(Effect.scoped(Effect.gen(function* () {
        const first = yield* establishConnection(
          { servers: url },
          LAYER,
          "wall.status.one",
          transportRefusal,
        )
        const second = yield* establishConnection(
          { servers: url },
          LAYER,
          "wall.status.two",
          transportRefusal,
        )
        const { hasStatusPump } = yield* Effect.promise(
          () => import("../src/internal/statuspump.js"),
        )
        return {
          firstPumped: hasStatusPump(first.connection),
          secondPumped: hasStatusPump(second.connection),
          sameSession: first.minted.digest === second.minted.digest,
          firstClient: first.groups.substrate.fields["client_id"],
          secondClient: second.groups.substrate.fields["client_id"],
        }
      })).pipe(Effect.orDie))

      expect(both.firstPumped).toBe(true)
      expect(both.secondPumped).toBe(true)
      // Two connections are two sessions: the substrate assigns each its own
      // connection identifier, which the fold carries.
      expect(both.firstClient).not.toBe(both.secondClient)
      expect(both.sameSession).toBe(false)
    },
    120_000,
  )
})
