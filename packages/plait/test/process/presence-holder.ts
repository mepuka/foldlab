import { Effect } from "effect"

import {
  attachHeartbeatSeat,
  clientHealth,
  declareSchedule,
} from "../../src/internal/heartbeat.js"
import { heartbeatLane, landTick } from "../../src/internal/heartbeatlane.js"
import { transportRefusal } from "../../src/internal/lanes.js"
import { landFact, sessionLane } from "../../src/internal/sessionlanes.js"
import { establishConnection } from "../../src/internal/transport.js"
import { Lanes } from "../../src/planes/Lane.js"

/**
 * One holder: a session established against a real substrate, its establishment
 * landed on the session lane, and a heartbeat seat emitting ticks for it.
 *
 * It exists as a separate process because the arm that matters kills it with
 * signal 9, and a signal 9 is only honest against a process that cannot run a
 * finalizer. Nothing here writes an ended fact on the way out: there is no way
 * out to write one on, which is exactly the loss the presence read must report
 * as silence rather than as a connection.
 */
const [url, readyPath, name, origin, period] = process.argv.slice(2)
if (
  url === undefined || readyPath === undefined || name === undefined ||
  origin === undefined || period === undefined
) {
  throw new Error("usage: presence-holder URL READY_PATH NAME ORIGIN PERIOD")
}

await Effect.runPromise(Effect.gen(function* () {
  const established = yield* establishConnection(
    { servers: url, connectionName: name },
    name,
    "wall.presence.establish",
    transportRefusal,
  )
  const sessions = yield* sessionLane()
  const heartbeats = yield* heartbeatLane()
  const schedule = yield* declareSchedule({ origin, period: Number.parseInt(period, 10) })

  yield* landFact(sessions, established.minted.established, name)

  const seat = yield* attachHeartbeatSeat({
    schedule,
    // Read at the firing, so a reconnect's successor session is what the next
    // tick cites rather than the session this seat was built with.
    session: established.pump.session,
    health: Effect.sync(() => clientHealth(established.connection)),
    land: (tick) => Effect.asVoid(landTick(heartbeats, tick, name)),
  })
  // One firing before the ready file, so the parent knows a tick has landed
  // rather than merely that a process started.
  yield* seat.fire
  yield* Effect.promise(() =>
    Bun.write(
      readyPath,
      JSON.stringify({ session: established.minted.digest, schedule: schedule.digest }),
    )
  )
  yield* Effect.forkScoped(seat.run)
  return yield* Effect.never
}).pipe(
  Effect.provide(Lanes.layer({ servers: url, connectionName: `${name}-lanes` })),
  Effect.scoped,
  Effect.orDie,
))
