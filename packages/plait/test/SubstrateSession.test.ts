import { describe, expect, test } from "bun:test"

import { Effect } from "effect"

import { canonicalBytes, type WireValue } from "../src/truth/Canonical.js"
import { digestOf } from "../src/truth/Digest.js"
import type { Refusal } from "../src/truth/Refusal.js"
import { declaredConnect } from "../src/internal/transport.js"
import {
  CONNECT_OPTIONS,
  CONNECT_OPTION_DEFAULTS,
  SUBSTRATE_FIELDS,
  connectOptionsDeclaration,
  connectOptionsDigest,
  estateConnectArguments,
  estateDeclaration,
  substrateDeclarationOf,
  substrateSession,
  type SessionGroups,
} from "../src/internal/substrate.js"
import { endedFact, mintSession, sessionLane } from "../src/internal/sessionlanes.js"

/**
 * The substrate declaration one connection carried at the pins, verbatim.
 *
 * The exchange key the same connection carried is deliberately absent from the
 * roster and therefore from every fold below: whether it belongs is an open
 * pin, and this suite lands with it out.
 */
const INFO = {
  server_id: "NDWIHWMLKQJOZYTCEYMM6GLXPEV65FWVAGUTBB7G4GQXCMZCMWZD5B6V",
  server_name: "NDWIHWMLKQJOZYTCEYMM6GLXPEV65FWVAGUTBB7G4GQXCMZCMWZD5B6V",
  version: "2.14.4",
  proto: 1,
  go: "go1.26.5",
  host: "127.0.0.1",
  port: 62433,
  headers: true,
  max_payload: 1048576,
  jetstream: true,
  client_id: 5,
  client_ip: "127.0.0.1",
  connect_info: true,
  remote_account: "$G",
  api_lvl: 4,
  xkey: "XBYJ4PZQ5YC5CJ7D7QZPYJLIHS4GQ3R7AQWINRBNK42NVZMR5ATUOGW5",
}

const SERVERS = "127.0.0.1:62433"
const LAYER = "foldlab-plait-lane"

/**
 * The spine's own path: declare the connect, read the substrate's declaration
 * off the connection, and fold. This is the code `establishConnection` runs;
 * only the socket is missing.
 */
const spineFold = Effect.fn("wall.spineGroups")(function* (
  info: unknown,
): Effect.fn.Return<SessionGroups, Refusal> {
  const declared = yield* declaredConnect({ servers: SERVERS }, LAYER)
  const substrate = yield* substrateDeclarationOf(info)
  return {
    substrate,
    options: declared.digest,
    estate: estateDeclaration({ writ: null, layer: LAYER, shapes: [] }),
  }
})

const spineGroups = (info: unknown = INFO): Effect.Effect<SessionGroups> =>
  spineFold(info).pipe(Effect.orDie)

/**
 * A second party's path: the same three groups written down as data, by
 * someone who never held a connection and never called the spine. Key orders
 * are deliberately shuffled against the spine's, because canonical bytes are
 * what is being compared.
 */
const recordedGroups = (overrides: {
  readonly clientId?: number
  readonly optionsDigest?: string
} = {}) =>
  Effect.gen(function* () {
    const options = {
      v: 0,
      kind: "substrate-connect-options",
      options: {
        waitOnFirstConnect: false,
        verbose: false,
        timeout: 20000,
        servers: [SERVERS],
        reconnectTimeWait: 2000,
        reconnectJitterTLS: 1000,
        reconnectJitter: 100,
        reconnect: true,
        pingInterval: 120000,
        pedantic: false,
        noRandomize: false,
        noEcho: false,
        name: LAYER,
        maxReconnectAttempts: 10,
        maxPingOut: 2,
        inboxPrefix: null,
        ignoreClusterUpdates: false,
        ignoreAuthErrorAbort: false,
        debug: false,
        authenticator: null,
      },
    }
    const digest = overrides.optionsDigest ?? (yield* digestOf(options as WireValue).pipe(Effect.orDie))
    return {
      substrate: {
        v: 0,
        kind: "substrate-declaration",
        fields: {
          api_lvl: 4,
          remote_account: "$G",
          connect_info: true,
          client_ip: "127.0.0.1",
          client_id: overrides.clientId ?? 5,
          jetstream: true,
          max_payload: 1048576,
          headers: true,
          port: 62433,
          host: "127.0.0.1",
          go: "go1.26.5",
          proto: 1,
          version: "2.14.4",
          server_name: "NDWIHWMLKQJOZYTCEYMM6GLXPEV65FWVAGUTBB7G4GQXCMZCMWZD5B6V",
          server_id: "NDWIHWMLKQJOZYTCEYMM6GLXPEV65FWVAGUTBB7G4GQXCMZCMWZD5B6V",
        },
      },
      options: digest,
      estate: { shapes: [], layer: LAYER, writ: null, kind: "substrate-estate", v: 0 },
    } as unknown as SessionGroups
  })

const bytesOf = (value: unknown): Promise<Uint8Array> =>
  Effect.runPromise(canonicalBytes(value as WireValue).pipe(Effect.orDie))

describe("the substrate-session fact", () => {
  test("two independent mints over the same three groups are byte-identical and name one session", async () => {
    const spine = await Effect.runPromise(spineGroups())
    const recorded = await Effect.runPromise(recordedGroups())

    const spineValue = substrateSession(spine)
    const recordedValue = substrateSession(recorded)

    const spineBytes = await bytesOf(spineValue)
    const recordedBytes = await bytesOf(recordedValue)
    expect(Array.from(recordedBytes)).toEqual(Array.from(spineBytes))

    const [bySpine, byRecord] = await Effect.runPromise(Effect.all([
      mintSession(spine, null),
      mintSession(recorded, null),
    ]))
    expect(byRecord.digest).toBe(bySpine.digest)
    expect(byRecord.established).toEqual(bySpine.established)
  })

  test("the exchange key is out of the fold, so a connection carrying one names the same session", async () => {
    expect(SUBSTRATE_FIELDS.some((field) => field.name === "xkey")).toBe(false)
    const withKey = await Effect.runPromise(spineGroups(INFO))
    const withoutKey = await Effect.runPromise(spineGroups(
      Object.fromEntries(Object.entries(INFO).filter(([key]) => key !== "xkey")),
    ))
    const first = await Effect.runPromise(mintSession(withKey, null))
    const second = await Effect.runPromise(mintSession(withoutKey, null))
    expect(second.digest).toBe(first.digest)
  })

  test("a reconnect mints a successor citing its predecessor and edits nothing", async () => {
    const first = await Effect.runPromise(mintSession(await Effect.runPromise(spineGroups()), null))
    const firstBytes = await bytesOf(first.established)

    // The one thing a same-server reconnect always moves.
    const reconnected = await Effect.runPromise(spineGroups({ ...INFO, client_id: 6 }))
    const second = await Effect.runPromise(mintSession(reconnected, first.digest))

    expect(second.established.predecessor).toBe(first.digest)
    expect(first.established.predecessor).toBe(null)
    expect(second.digest).not.toBe(first.digest)
    // The predecessor rides the fact, not the fold: the successor's NAME is a
    // function of its three groups alone, which is what keeps it derivable.
    const derivedByAThirdParty = await Effect.runPromise(digestOf(
      substrateSession(reconnected) as unknown as WireValue,
    ))
    expect(derivedByAThirdParty).toBe(second.digest)

    // The past is not edited: the first fact's bytes are what they were.
    expect(Array.from(await bytesOf(first.established))).toEqual(Array.from(firstBytes))
  })

  test("the session fact pins the options digest, and the pinned value is what the connection ran under", async () => {
    const declared = await Effect.runPromise(declaredConnect({ servers: SERVERS }, LAYER).pipe(Effect.orDie))
    const groups = await Effect.runPromise(spineGroups())
    const minted = await Effect.runPromise(mintSession(groups, null))

    expect(minted.established.options).toBe(declared.digest)
    // Resolving the pinned digest returns the exact declared value.
    const resolved = await Effect.runPromise(connectOptionsDigest(declared.declaration).pipe(Effect.orDie))
    expect(minted.established.options).toBe(resolved)

    // And the declared value is not a description of the connect — it is its
    // source. Every estate-set option, and only those, reached the client.
    const estate = await Effect.runPromise(estateConnectArguments(declared.declaration).pipe(Effect.orDie))
    expect(declared.arguments_.servers).toEqual([...estate.servers])
    expect(declared.arguments_.name).toBe(estate.name)
    expect(Object.keys(declared.arguments_).sort()).toEqual(["name", "servers"])
    for (const option of CONNECT_OPTIONS) {
      if (option.source === "estate-set") continue
      expect(Object.hasOwn(declared.arguments_, option.name)).toBe(false)
      expect(declared.declaration.options[option.name]).toBe(
        CONNECT_OPTION_DEFAULTS[option.name] as never,
      )
    }
  })

  test("moving exactly one declared option moves the session digest", async () => {
    const declared = await Effect.runPromise(declaredConnect({ servers: SERVERS }, LAYER).pipe(Effect.orDie))
    // One field of one declared value, and nothing else in the three groups.
    const moved = {
      ...declared.declaration,
      options: { ...declared.declaration.options, maxReconnectAttempts: -1 },
    }
    const movedDigest = await Effect.runPromise(connectOptionsDigest(moved).pipe(Effect.orDie))
    expect(movedDigest).not.toBe(declared.digest)

    const groups = await Effect.runPromise(spineGroups())
    const before = await Effect.runPromise(mintSession(groups, null))
    const after = await Effect.runPromise(mintSession({ ...groups, options: movedDigest }, null))
    expect(after.digest).not.toBe(before.digest)
  })

  test("a credentialed connect declares its authenticator and inbox prefix and passes exactly those", async () => {
    const { Redacted } = await import("effect")
    const declared = await Effect.runPromise(declaredConnect({
      servers: SERVERS,
      credential: {
        user: "carrier",
        password: Redacted.make("secret"),
        inboxPrefix: "_INBOX.carrier",
      },
    }, LAYER).pipe(Effect.orDie))
    expect(declared.declaration.options["authenticator"]).toBe("username-password")
    expect(declared.declaration.options["inboxPrefix"]).toBe("_INBOX.carrier")
    expect(Object.keys(declared.arguments_).sort())
      .toEqual(["authenticator", "inboxPrefix", "name", "servers"])
    // The redacted secret never enters the declared value or its digest.
    const bytes = new TextDecoder().decode(await bytesOf(declared.declaration))
    expect(bytes).not.toContain("secret")
  })

  test("no wall-clock field is in the fold, on the roster or in the bytes", async () => {
    const clockish = new Set([
      "at", "claimed", "clock", "created", "date", "now", "rtt", "stamp",
      "stats", "time", "timestamp", "ts", "when",
    ])
    const keys = (value: unknown, into: Set<string>): Set<string> => {
      if (Array.isArray(value)) {
        for (const item of value) keys(item, into)
      } else if (value !== null && typeof value === "object") {
        for (const [key, item] of Object.entries(value)) {
          into.add(key)
          keys(item, into)
        }
      }
      return into
    }

    const minted = await Effect.runPromise(mintSession(await Effect.runPromise(spineGroups()), null))
    const walked = keys(substrateSession(await Effect.runPromise(spineGroups())), new Set<string>())
    for (const key of walked) {
      for (const segment of key.toLowerCase().split(/[^a-z]+/u)) {
        expect(clockish.has(segment)).toBe(false)
      }
    }

    const text = new TextDecoder().decode(
      await bytesOf(substrateSession(await Effect.runPromise(spineGroups()))),
    )
    expect(text).not.toMatch(/\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/u)

    // The executable half: a fold that consulted a clock would move between
    // these two mints, and this one does not.
    await new Promise((resolve) => setTimeout(resolve, 25))
    const later = await Effect.runPromise(mintSession(await Effect.runPromise(spineGroups()), null))
    expect(later.digest).toBe(minted.digest)

    // And the arm can go red: the same fold with a claimed time in it moves
    // across the same interval, which is what makes the equality above evidence.
    const clocked = async () => {
      const groups = await Effect.runPromise(spineGroups())
      return Effect.runPromise(digestOf({
        ...(substrateSession(groups) as unknown as Record<string, WireValue>),
        claimed: new Date().toISOString(),
      } as WireValue))
    }
    const early = await clocked()
    await new Promise((resolve) => setTimeout(resolve, 25))
    expect(await clocked()).not.toBe(early)
  })

  test("a substrate field sent at the wrong sort refuses instead of folding a coerced value", async () => {
    const refusal = await Effect.runPromise(Effect.flip(
      substrateDeclarationOf({ ...INFO, max_payload: "1048576" }),
    ))
    expect(refusal.sort).toBe("structural")
    expect(refusal.kind).toBe("malformed-value")
    expect(refusal.path).toEqual(["info", "max_payload"])
  })

  test("a field the substrate did not send folds as null rather than vanishing", async () => {
    const partial = Object.fromEntries(
      Object.entries(INFO).filter(([key]) => key !== "api_lvl"),
    )
    const declaration = await Effect.runPromise(substrateDeclarationOf(partial).pipe(Effect.orDie))
    expect(declaration.fields["api_lvl"]).toBe(null)
    expect(Object.keys(declaration.fields).sort())
      .toEqual(SUBSTRATE_FIELDS.map((field) => field.name).sort())
  })

  test("the session lane's route is derived from its declared event form, not named", async () => {
    const lane = await Effect.runPromise(sessionLane().pipe(Effect.orDie))
    expect(lane.handle).toBe(lane.declaration.eventSchema)
    expect(lane.handle).toMatch(/^[0-9a-f]{64}$/u)
    expect(lane.partitionKey).toEqual({ path: ["session"] })
  })

  test("the ended fact cites the session and the cause the substrate reported", async () => {
    const minted = await Effect.runPromise(mintSession(await Effect.runPromise(spineGroups()), null))
    const ended = endedFact(minted.digest, "ConnectionError: connection refused")
    expect(ended.session).toBe(minted.digest)
    expect(ended.kind).toBe("substrate-session-ended")
  })

  test("every declared connect option carries a value, and the roster covers what the spine sets", async () => {
    const declared = await Effect.runPromise(
      connectOptionsDeclaration({
        servers: [SERVERS],
        name: LAYER,
        inboxPrefix: null,
        authenticator: null,
      }).pipe(Effect.orDie),
    )
    expect(Object.keys(declared.options).sort())
      .toEqual(CONNECT_OPTIONS.map((option) => option.name).sort())
    for (const value of Object.values(declared.options)) {
      expect(value).not.toBe(undefined)
    }
  })
})
