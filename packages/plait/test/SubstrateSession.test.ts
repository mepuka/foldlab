import { readdirSync, readFileSync } from "node:fs"
import { resolve } from "node:path"

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
  SUBSTRATE_ROSTER,
  connectOptionsDeclaration,
  connectOptionsDigest,
  estateConnectArguments,
  estateDeclaration,
  fieldRoster,
  rosterDigest,
  substrateDeclarationOf,
  substrateDeclarationUnder,
  substrateSession,
  type SessionGroups,
  type SubstrateField,
} from "../src/internal/substrate.js"
import { endedFact, mintSession, sessionLane } from "../src/internal/sessionlanes.js"
import {
  SUBSTRATE_WRITS,
  declareSubstrateWrit,
  resolveSubstrateWrit,
  substrateWritValue,
  writDigestFor,
} from "../src/internal/writs.js"
import {
  declareCarrierPermissionMap,
  type CarrierPermissionScope,
} from "../src/internal/permissions.js"

/**
 * The substrate declaration one connection carried at the pins, verbatim.
 *
 * The exchange key is now IN the roster under the operator's expansion ruling,
 * so it folds like every other measured field and this record is the whole of
 * what the fold consumes.
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
const LAYER = "foldlab-plait-lanes"
const OTHER_LAYER = "foldlab-plait-cell"

/**
 * The group-1 roster exactly as it stood when this slice's predecessor landed.
 *
 * This is the ADD-ONLY wall's pin, and it is a prefix rather than a whole: an
 * appended row leaves it untouched, and a rename, reorder, retype, or removal
 * moves it. It is also the record of what the roster was before the operator's
 * expansion ruling, kept where the wall can read it.
 */
const COMMITTED_ROSTER_PREFIX: ReadonlyArray<SubstrateField> = [
  { name: "server_id", sort: "string", provenance: "declared" },
  { name: "server_name", sort: "string", provenance: "declared" },
  { name: "version", sort: "string", provenance: "declared" },
  { name: "proto", sort: "number", provenance: "declared" },
  { name: "go", sort: "string", provenance: "declared" },
  { name: "host", sort: "string", provenance: "declared" },
  { name: "port", sort: "number", provenance: "declared" },
  { name: "headers", sort: "boolean", provenance: "declared" },
  { name: "max_payload", sort: "number", provenance: "declared" },
  { name: "jetstream", sort: "boolean", provenance: "declared" },
  { name: "client_id", sort: "number", provenance: "declared" },
  { name: "client_ip", sort: "string", provenance: "declared" },
  { name: "connect_info", sort: "boolean", provenance: "measured" },
  { name: "remote_account", sort: "string", provenance: "measured" },
  { name: "api_lvl", sort: "number", provenance: "declared" },
]

/**
 * The spine's own path: declare the connect, declare the layer's writ, read the
 * substrate's declaration off the connection, and fold. This is the code
 * `establishConnection` runs; only the socket is missing.
 */
const spineFold = Effect.fn("wall.spineGroups")(function* (
  info: unknown,
  layer: string = LAYER,
): Effect.fn.Return<SessionGroups, Refusal> {
  const declared = yield* declaredConnect({ servers: SERVERS }, layer)
  const writ = yield* declareSubstrateWrit(layer)
  const substrate = yield* substrateDeclarationOf(info)
  return {
    substrate,
    options: declared.digest,
    estate: estateDeclaration({ writ: writ.digest, layer, shapes: [] }),
  }
})

const spineGroups = (
  info: unknown = INFO,
  layer: string = LAYER,
): Effect.Effect<SessionGroups> => spineFold(info, layer).pipe(Effect.orDie)

/**
 * A second party's path: the same three groups written down as data, by
 * someone who never held a connection and never called the spine. Key orders
 * are deliberately shuffled against the spine's, because canonical bytes are
 * what is being compared. The roster and the writ are written out in full and
 * hashed here rather than imported, which is the derivability claim executed:
 * this party computes the same names from the same declarations with zero I/O.
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
    const roster = {
      v: 0,
      kind: "substrate-field-roster",
      fields: [
        { name: "server_id", sort: "string", provenance: "declared" },
        { name: "server_name", sort: "string", provenance: "declared" },
        { name: "version", sort: "string", provenance: "declared" },
        { name: "proto", sort: "number", provenance: "declared" },
        { name: "go", sort: "string", provenance: "declared" },
        { name: "host", sort: "string", provenance: "declared" },
        { name: "port", sort: "number", provenance: "declared" },
        { name: "headers", sort: "boolean", provenance: "declared" },
        { name: "max_payload", sort: "number", provenance: "declared" },
        { name: "jetstream", sort: "boolean", provenance: "declared" },
        { name: "client_id", sort: "number", provenance: "declared" },
        { name: "client_ip", sort: "string", provenance: "declared" },
        { name: "connect_info", sort: "boolean", provenance: "measured" },
        { name: "remote_account", sort: "string", provenance: "measured" },
        { name: "api_lvl", sort: "number", provenance: "declared" },
        { name: "xkey", sort: "string", provenance: "measured" },
      ],
    }
    const writ = {
      subscribe: ["_INBOX.{evidence-publisher-inbox}.>"],
      publish: [
        "$JS.API.INFO",
        "$JS.API.STREAM.INFO.{evidence-stream}",
        "flb.fab.ev.{lane}.*",
      ],
      roles: ["evidence-publisher"],
      holder: LAYER,
      kind: "substrate-writ",
      v: 0,
    }
    const digest = overrides.optionsDigest ?? (yield* digestOf(options as WireValue))
    const rosterName = yield* digestOf(roster as WireValue)
    const writName = yield* digestOf(writ as WireValue)
    return {
      substrate: {
        v: 0,
        kind: "substrate-declaration",
        roster: rosterName,
        fields: {
          xkey: "XBYJ4PZQ5YC5CJ7D7QZPYJLIHS4GQ3R7AQWINRBNK42NVZMR5ATUOGW5",
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
      estate: { shapes: [], layer: LAYER, writ: writName, kind: "substrate-estate", v: 0 },
    } as unknown as SessionGroups
  }).pipe(Effect.orDie)

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

  test("no wall-clock field is in the fold, on the grown roster or in the bytes", async () => {
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

    // The roster is walked too: an appended row is a new folded key, so the
    // no-clock wall has to cover the expansion mechanism and not only the
    // fifteen rows it was written against.
    for (const field of SUBSTRATE_FIELDS) {
      for (const segment of field.name.toLowerCase().split(/[^a-z]+/u)) {
        expect(clockish.has(segment)).toBe(false)
      }
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

describe("the group-1 roster expands, add-only", () => {
  test("the committed roster is a PREFIX of the standing one: appends pass, every other edit reddens", () => {
    expect(SUBSTRATE_FIELDS.length).toBeGreaterThanOrEqual(COMMITTED_ROSTER_PREFIX.length)
    expect(SUBSTRATE_FIELDS.slice(0, COMMITTED_ROSTER_PREFIX.length))
      .toEqual([...COMMITTED_ROSTER_PREFIX])
    // No row is ever added twice, so an "append" cannot quietly be a rename.
    expect(new Set(SUBSTRATE_FIELDS.map((field) => field.name)).size)
      .toBe(SUBSTRATE_FIELDS.length)
  })

  test("the operator's ruling is executed: the exchange key is IN the fold and moves the session", async () => {
    const xkey = SUBSTRATE_FIELDS.find((field) => field.name === "xkey")
    expect(xkey).toEqual({ name: "xkey", sort: "string", provenance: "measured" })
    // Appended, not inserted: the expansion is the last row.
    expect(SUBSTRATE_FIELDS[SUBSTRATE_FIELDS.length - 1]!.name).toBe("xkey")

    const withKey = await Effect.runPromise(spineGroups(INFO))
    const withoutKey = await Effect.runPromise(spineGroups(
      Object.fromEntries(Object.entries(INFO).filter(([key]) => key !== "xkey")),
    ))
    const first = await Effect.runPromise(mintSession(withKey, null))
    const second = await Effect.runPromise(mintSession(withoutKey, null))
    // Under the pre-ruling roster these two named ONE session. They no longer do.
    expect(second.digest).not.toBe(first.digest)
    expect(withoutKey.substrate.fields["xkey"]).toBe(null)
    // And both parties folded the SAME roster, so the disagreement is about the
    // substrate's declaration and says so.
    expect(withoutKey.substrate.roster).toBe(withKey.substrate.roster)
  })

  test("a party on a GROWN roster names a different session, and the growth is readable", async () => {
    const grown = fieldRoster([
      ...SUBSTRATE_FIELDS,
      { name: "ldm", sort: "boolean", provenance: "measured" },
    ])
    const standing = await Effect.runPromise(rosterDigest(SUBSTRATE_ROSTER).pipe(Effect.orDie))
    const grownName = await Effect.runPromise(rosterDigest(grown).pipe(Effect.orDie))
    expect(grownName).not.toBe(standing)

    const mine = await Effect.runPromise(spineGroups())
    const theirs: SessionGroups = {
      ...mine,
      substrate: await Effect.runPromise(
        substrateDeclarationUnder(grown, INFO).pipe(Effect.orDie),
      ),
    }
    const byMe = await Effect.runPromise(mintSession(mine, null))
    const byThem = await Effect.runPromise(mintSession(theirs, null))
    expect(byThem.digest).not.toBe(byMe.digest)

    // Not silent: each fact names the roster it was folded under, and the two
    // rosters differ by exactly one appended row.
    expect(byMe.established.roster).toBe(standing)
    expect(byThem.established.roster).toBe(grownName)
    expect(byThem.established.roster).not.toBe(byMe.established.roster)
    expect(grown.fields.slice(0, SUBSTRATE_FIELDS.length)).toEqual([...SUBSTRATE_FIELDS])
    expect(grown.fields.length - SUBSTRATE_FIELDS.length).toBe(1)
  })

  test("the roster digest rides the declaration, so a same-roster pair still byte-matches", async () => {
    const spine = await Effect.runPromise(spineGroups())
    const recorded = await Effect.runPromise(recordedGroups())
    const standing = await Effect.runPromise(rosterDigest(SUBSTRATE_ROSTER).pipe(Effect.orDie))
    expect(spine.substrate.roster).toBe(standing)
    expect(recorded.substrate.roster).toBe(standing)
    expect(Array.from(await bytesOf(spine.substrate)))
      .toEqual(Array.from(await bytesOf(recorded.substrate)))
  })
})

/**
 * The scope whose free coordinates are brace-wrapped names.
 *
 * Every token here is a coordinate the deployment binds, written as its own
 * name, so what comes back out of the permission projection is the FAMILY the
 * writ declares rather than one deployment's subjects. The inbox prefixes are
 * per role because the projection refuses prefixes that are not
 * token-prefix-disjoint.
 */
const FAMILY_SCOPE = {
  evidenceLane: "{lane}",
  evidenceStreams: ["{evidence-stream}"],
  commonsStream: "{commons-stream}",
  factVenue: "{venue}",
  node: "{node}",
  inboxPrefixes: {
    "evidence-publisher": "_INBOX.{evidence-publisher-inbox}",
    "fact-publisher": "_INBOX.{fact-publisher-inbox}",
    "node-publisher": "_INBOX.{node-publisher-inbox}",
    cell: "_INBOX.{cell-inbox}",
    anchor: "_INBOX.{anchor-inbox}",
    register: "_INBOX.{register-inbox}",
    requester: "_INBOX.{requester-inbox}",
  },
} as unknown as CarrierPermissionScope

describe("the substrate writ", () => {
  test("declare then resolve returns the exact bytes the digest names", async () => {
    for (const row of SUBSTRATE_WRITS) {
      const declared = await Effect.runPromise(declareSubstrateWrit(row.layer).pipe(Effect.orDie))
      expect(declared.digest).toMatch(/^[0-9a-f]{64}$/u)
      const resolved = await Effect.runPromise(
        resolveSubstrateWrit(declared.digest).pipe(Effect.orDie),
      )
      expect(Array.from(await bytesOf(resolved)))
        .toEqual(Array.from(await bytesOf(declared.declaration)))
      expect(resolved).toEqual(declared.declaration)
      expect(resolved.holder).toBe(row.layer)
    }
  })

  test("the session fact's group 3 carries a writ digest that resolves round-trip", async () => {
    const groups = await Effect.runPromise(spineGroups())
    const writ = groups.estate.writ
    expect(writ).not.toBe(null)
    const resolved = await Effect.runPromise(resolveSubstrateWrit(writ!).pipe(Effect.orDie))
    expect(resolved.holder).toBe(LAYER)
    const redigested = await Effect.runPromise(digestOf(resolved as unknown as WireValue))
    expect(writ).toBe(redigested)
  })

  test("two layers mean two writs mean two session facts, on otherwise identical groups", async () => {
    const mine = await Effect.runPromise(spineGroups(INFO, LAYER))
    const theirs = await Effect.runPromise(spineGroups(INFO, OTHER_LAYER))
    expect(theirs.estate.writ).not.toBe(mine.estate.writ)

    // Hold everything else identical — same substrate declaration, same options
    // digest, same layer name — so the writ is the only moving part.
    const isolated = {
      ...mine,
      estate: estateDeclaration({
        writ: theirs.estate.writ,
        layer: mine.estate.layer,
        shapes: [...mine.estate.shapes],
      }),
    }
    const byMe = await Effect.runPromise(mintSession(mine, null))
    const byThem = await Effect.runPromise(mintSession(isolated, null))
    expect(byThem.digest).not.toBe(byMe.digest)
  })

  test("every acquire site in src/ has a declared writ, walked rather than listed", () => {
    // The roster of acquire sites is DERIVED from the source, so a ninth site
    // added tomorrow joins this wall by construction instead of by somebody
    // remembering to extend a list here.
    const root = resolve(import.meta.dir, "../src")
    const sources = readdirSync(root, { recursive: true, encoding: "utf8" })
      .filter((name) => name.endsWith(".ts"))
    const sites: Array<{ readonly file: string; readonly layer: string }> = []
    for (const file of sources) {
      const source = readFileSync(resolve(root, file), "utf8")
      // The default layer name is the SECOND argument, and the first is always
      // an options binding or an inline options object. Matching the argument
      // shape rather than "the next quote" keeps the walk from sliding past a
      // call whose layer is a binding — `acquireConnection` forwarding to
      // `establishConnection` is exactly that case, and it is not a site.
      for (const match of source.matchAll(
        /(?:acquire|establish)Connection\(\s*(?:\{[^{}]*\}|[A-Za-z_$][\w$.]*)\s*,\s*"([^"]+)"/gu,
      )) {
        sites.push({ file, layer: match[1]! })
      }
    }
    // A walk that found nothing would pass over no wall at all.
    expect(sites.length).toBe(8)
    const declared = new Set(SUBSTRATE_WRITS.map((row) => row.layer))
    for (const site of sites) {
      expect({ ...site, declared: declared.has(site.layer) })
        .toEqual({ ...site, declared: true })
    }
    expect(new Set(sites.map((site) => site.layer)).size).toBe(8)
  })

  test("a layer with no declared writ is refused by the lookup and folds null at the spine", async () => {
    // The two facts are different and stay different: an undeclared layer has
    // no writ, and the least writ is declared and empty.
    const refusal = await Effect.runPromise(Effect.flip(declareSubstrateWrit("foldlab-plait-ninth")))
    expect(refusal.sort).toBe("structural")
    expect(refusal.path).toEqual(["writ", "layer"])

    expect(await Effect.runPromise(writDigestFor("foldlab-plait-ninth").pipe(Effect.orDie)))
      .toBe(null)
    // A declaration is not a guard: the spine folds the absence rather than
    // refusing the connection over it.
    expect(await Effect.runPromise(writDigestFor("foldlab-plait-chaos").pipe(Effect.orDie)))
      .not.toBe(null)
  })

  test("each writ's families are exactly what the carrier-permission projection grants its roles", () => {
    const map = declareCarrierPermissionMap(FAMILY_SCOPE) as unknown as {
      readonly [role: string]: {
        readonly publish: ReadonlyArray<string>
        readonly subscribe: ReadonlyArray<string>
      }
    }
    const union = (
      roles: ReadonlyArray<string>,
      side: "publish" | "subscribe",
    ): ReadonlyArray<string> =>
      [...new Set(roles.flatMap((role) => [...map[role]![side]]))].sort()

    for (const row of SUBSTRATE_WRITS) {
      for (const role of row.roles) expect(map[role]).toBeDefined()
      const writ = substrateWritValue(row)
      expect(writ.publish).toEqual(union(row.roles, "publish"))
      expect(writ.subscribe).toEqual(union(row.roles, "subscribe"))
    }
  })

  test("no writ carries secret material, and no bound coordinate leaks into a family", async () => {
    const forbidden = ["password", "secret", "token", "credential", "seed", "nkey", "jwt"]
    for (const row of SUBSTRATE_WRITS) {
      const declared = await Effect.runPromise(declareSubstrateWrit(row.layer).pipe(Effect.orDie))
      const text = new TextDecoder().decode(await bytesOf(declared.declaration)).toLowerCase()
      for (const word of forbidden) expect(text).not.toContain(word)
      // A family names its coordinate; it never carries one deployment's value.
      for (const family of [...declared.declaration.publish, ...declared.declaration.subscribe]) {
        expect(family).not.toContain("127.0.0.1")
        expect(family).not.toContain("_INBOX.carrier")
      }
    }
  })

  test("the least writ is empty by declaration, and it is a different writ per holder", async () => {
    const chaos = await Effect.runPromise(
      declareSubstrateWrit("foldlab-plait-chaos").pipe(Effect.orDie),
    )
    const probe = await Effect.runPromise(
      declareSubstrateWrit("foldlab-plait-chaos-pin-head").pipe(Effect.orDie),
    )
    expect(chaos.declaration.roles).toEqual([])
    expect(chaos.declaration.publish).toEqual([])
    expect(chaos.declaration.subscribe).toEqual([])
    // Same content, different holder: the writs are still two, not one.
    expect(probe.digest).not.toBe(chaos.digest)
  })
})
