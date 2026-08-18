/**
 * Plane: internal — private adapters serve any layer and reach back only to their own public seam.
 *
 * @module
 */
import { Effect, Scope } from "effect"

import type {
  SessionOptions,
  SessionService,
} from "../planes/Session.js"
import type { Refusal } from "../truth/Refusal.js"
import { makeAnchorStore } from "./anchors.js"
import { acquireConnection, transportRefusalFor } from "./transport.js"

/** Exported for the spine wall; no other `src` module imports it. */
export const transportRefusal = transportRefusalFor({
  kind: "session-transport-unavailable",
  law: "Transport absence may be retried; writ and view refusals may not.",
  expected: "the pinned local NATS KV operation to be available",
  next: () => [{
    subject: "Session.subscribe",
    note: "Reconnect and subscribe again; a session is a value the substrate never learned, so re-opening under the same writ resumes the same read.",
  }],
})

/**
 * The consumer half of the fold plane: it reads the anchors deployed pumps
 * checkpoint and images them under the fold the session declared.
 *
 * It writes nothing. The one substrate call that is not a read is the anchor
 * store's own bucket-shape gate, which is the same gate every anchor reader
 * passes and the reason a lying bucket refuses here as it does under a pump.
 * The anchor revision the store loads stays here: a revision is write-side
 * evidence and no read-plane value carries one.
 */
export const makeSessionService = Effect.fn("Sessions.make")(function* (
  options: SessionOptions,
): Effect.fn.Return<SessionService, Refusal, Scope.Scope> {
  const connection = yield* acquireConnection(
    options,
    "foldlab-plait-sessions",
    "session.connection.acquire",
    transportRefusal,
  )
  const anchors = yield* makeAnchorStore(connection)

  const subscribe: SessionService["subscribe"] = Effect.fn("Sessions.subscribeLive")(
    function* (fold, subscribeOptions) {
      const position = subscribeOptions.policy === "replay"
        ? 0
        : (yield* anchors.read(anchors.key(fold, subscribeOptions.partition))).floor
      return {
        writ: subscribeOptions.writ,
        view: fold.digest,
        partition: subscribeOptions.partition,
        position,
      }
    },
  )

  const read: SessionService["read"] = Effect.fn("Sessions.readLive")(
    function* (session, fold) {
      const loaded = yield* anchors.load(fold, session.partition)
      return {
        view: {
          view: fold.digest,
          writ: session.writ.digest,
          partition: session.partition,
          from: session.position,
          anchor: loaded.anchor,
          state: loaded.state,
        },
        session: { ...session, position: loaded.anchor.floor },
      }
    },
  )

  return { subscribe, read }
})
