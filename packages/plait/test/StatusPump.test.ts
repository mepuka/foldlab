import { readFileSync } from "node:fs"
import { resolve } from "node:path"

import { describe, expect, test } from "bun:test"

import type { Status } from "@nats-io/nats-core"
import { Effect, Stream } from "effect"

import { canonicalBytes, type WireValue } from "../src/truth/Canonical.js"
import type { Digest } from "../src/truth/Digest.js"
import type { Refusal } from "../src/truth/Refusal.js"
import { declaredConnect } from "../src/internal/transport.js"
import type { SessionFact } from "../src/internal/sessionfacts.js"
import { SESSION_EVENT_FORM, mintSession } from "../src/internal/sessionfacts.js"
import {
  estateDeclaration,
  substrateDeclarationOf,
  type SessionGroups,
} from "../src/internal/substrate.js"
import { declareSubstrateWrit } from "../src/internal/writs.js"
import {
  CONNECTION_TRANSITIONS,
  OBSERVATION_EVENTS,
  STATUS_EVENTS,
  STATUS_VOCABULARY_PIN,
  TRANSITION_EVENTS,
  statusRowFor,
  transitionRowFor,
} from "../src/internal/statusvocabulary.js"
import {
  projectPayload,
  statusFacts,
  type StatusPumpTerms,
} from "../src/internal/statuspump.js"
import {
  checkDrift,
  checkNoEventBranch,
  checkReadingsAreNotStates,
  checkTotality,
  readVendorRows,
  PIN_DECLARATION_PATH,
  PUMP_PATH,
} from "../scripts/status-vocabulary.js"

/**
 * The status pump's brokerless half.
 *
 * Everything the pump decides is a function of the transcribed tables and the
 * status values the pinned client sends, so everything below is measured
 * without a server: the tables against the vendor's own declaration bytes, the
 * transducer against constructed status values, and the single-consumption
 * fence against the client's own dispatch. What needs a real server — the
 * ordered kill-the-server sequence, the restart-and-reconnect chain, the
 * terminal cause — is the wall file next door.
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
const packageRoot = resolve(import.meta.dir, "..")

const groupsFor = Effect.fn("wall.groups")(function* (
  info: unknown = INFO,
): Effect.fn.Return<SessionGroups, Refusal> {
  const declared = yield* declaredConnect({ servers: SERVERS }, LAYER)
  const writ = yield* declareSubstrateWrit(LAYER)
  return {
    substrate: yield* substrateDeclarationOf(info),
    options: declared.digest,
    estate: estateDeclaration({ writ: writ.digest, layer: LAYER, shapes: [] }),
  }
})

/**
 * A pump's terms over a connection that is not there.
 *
 * The successor mint reads the substrate's declaration again, so the arm that
 * exercises a reconnect hands back the declaration a reconnected connection
 * would carry — the one field a same-server reconnect always moves. Nothing
 * else about the terms is a stand-in: the options digest, the estate
 * declaration and the mint are the spine's own.
 */
const termsOver = async (input: {
  readonly session: Digest
  readonly groups: SessionGroups
  readonly reconnectedInfo?: unknown
  readonly cause?: string
}): Promise<StatusPumpTerms> => ({
  session: input.session,
  options: input.groups.options,
  estate: input.groups.estate,
  declaration: substrateDeclarationOf(input.reconnectedInfo ?? INFO),
  cause: Effect.succeed(input.cause ?? ""),
})

const pumped = async (
  events: ReadonlyArray<Status>,
  terms: StatusPumpTerms,
): Promise<ReadonlyArray<SessionFact>> =>
  Effect.runPromise(
    Stream.runCollect(
      statusFacts(Stream.fromIterable(events), terms, () => {}),
    ).pipe(Effect.orDie),
  )

const bytesOf = (value: unknown): Promise<Uint8Array> =>
  Effect.runPromise(canonicalBytes(value as WireValue).pipe(Effect.orDie))

const rowNamed = (name: string) => {
  const row = statusRowFor(name)
  if (row === undefined) throw new Error(`the transcription carries no row named ${name}`)
  return row
}

/** One status value of the named type, built from the row's own field list. */
const statusOf = (
  name: string,
  fields: { readonly [field: string]: unknown } = {},
): Status => ({ type: name, ...fields }) as unknown as Status

describe("the transcribed status vocabulary", () => {
  test("every row is the vendor's own declaration, in the vendor's order, with the vendor's shapes", () => {
    const vendor = readVendorRows(
      readFileSync(resolve(packageRoot, PIN_DECLARATION_PATH), "utf8"),
    )
    // The oracle is the installed package's bytes, not a copy of them kept
    // here: this arm reads what the pin actually ships and compares.
    expect(vendor.rows.length).toBe(11)
    expect(checkDrift(STATUS_EVENTS, vendor)).toEqual({ ok: true })

    // Per-row provenance is the vendor's own alias name, so a row resolves to a
    // declaration rather than to a position in a list.
    for (const row of STATUS_EVENTS) {
      const declared = vendor.rows.find((entry) => entry.declaration === row.declaration)
      expect({ row: row.type, found: declared !== undefined }).toEqual({
        row: row.type,
        found: true,
      })
      expect(declared!.type).toBe(row.type)
    }
  })

  test("the pin the table names is the package version actually installed", async () => {
    const manifest = await Bun.file(
      resolve(packageRoot, "node_modules/@nats-io/nats-core/package.json"),
    ).json() as { readonly name: string; readonly version: string }
    expect(manifest.name).toBe(STATUS_VOCABULARY_PIN.package)
    expect(manifest.version).toBe(STATUS_VOCABULARY_PIN.version)
  })

  test("full adoption: all eleven rows are transcribed and every one is placed", () => {
    expect(STATUS_EVENTS.length).toBe(11)
    expect(TRANSITION_EVENTS.length + OBSERVATION_EVENTS.length).toBe(STATUS_EVENTS.length)
    expect(checkTotality(STATUS_EVENTS, CONNECTION_TRANSITIONS)).toEqual({ ok: true })
    // No row is transcribed twice, so a "full" table cannot be full by repetition.
    expect(new Set(STATUS_EVENTS.map((row) => row.type)).size).toBe(STATUS_EVENTS.length)
  })

  test("the four readings are readings, and no row of the machine names one as a state", () => {
    expect(OBSERVATION_EVENTS.length).toBe(4)
    expect(checkReadingsAreNotStates(STATUS_EVENTS, CONNECTION_TRANSITIONS)).toEqual({ ok: true })
    for (const row of OBSERVATION_EVENTS) {
      expect(transitionRowFor(row.type)).toBeUndefined()
      expect(CONNECTION_TRANSITIONS.some((entry) => entry.state === row.type)).toBe(false)
    }
    // And the arm can go red: a machine that named one of them a state is
    // refused by the same clause, which is what makes the pass evidence.
    const promoted = [
      ...CONNECTION_TRANSITIONS,
      {
        event: OBSERVATION_EVENTS[0]!.type,
        state: OBSERVATION_EVENTS[0]!.type,
        from: [null],
        mintsSuccessor: false,
        emits: "transition" as const,
        absorbing: false,
      },
    ]
    expect(checkReadingsAreNotStates(STATUS_EVENTS, promoted).ok).toBe(false)
  })

  test("the terminal state is reachable from every state and leaves none", () => {
    const absorbing = CONNECTION_TRANSITIONS.filter((row) => row.absorbing)
    expect(absorbing.length).toBe(1)
    const terminal = absorbing[0]!
    // Normal, not exceptional: at the pinned defaults a connection that
    // exhausts its attempt budget closes permanently, so every state including
    // the unobserved one reaches this row.
    expect(terminal.from).toContain(null)
    for (const row of CONNECTION_TRANSITIONS) {
      if (row.state === terminal.state) continue
      expect({ from: row.state, reaches: terminal.from.includes(row.state) })
        .toEqual({ from: row.state, reaches: true })
      expect((row.from as ReadonlyArray<string | null>).includes(terminal.state)).toBe(false)
    }
  })

  test("exactly one row mints a successor, and it is the one that re-attaches", () => {
    const minting = CONNECTION_TRANSITIONS.filter((row) => row.mintsSuccessor)
    expect(minting.length).toBe(1)
    // The row that mints is the row whose payload names the server it attached
    // to, which is the pin's own way of saying the connection is a different one.
    const row = rowNamed(minting[0]!.event)
    expect(row.payload.map((field) => field.name)).toEqual(["server"])
    expect(row.placement).toBe("transition")
  })

  test("the consumer branches on no event name", () => {
    const source = readFileSync(resolve(packageRoot, PUMP_PATH), "utf8")
    expect(checkNoEventBranch(STATUS_EVENTS, source)).toEqual({ ok: true })
    // Red on plant: a reaction to the lame-duck row is exactly the shape this
    // slice must not carry, and the same clause refuses it.
    const reacting = `${source}\nconst react = (t: string) => t === "ldm"\n`
    expect(checkNoEventBranch(STATUS_EVENTS, reacting).ok).toBe(false)
  })

  test("the session lane's event form grew add-only, and the two original variants are untouched", () => {
    expect(SESSION_EVENT_FORM.variants.slice(0, 2)).toEqual([
      {
        kind: "substrate-session-established",
        fields: ["session", "options", "roster", "predecessor"],
      },
      { kind: "substrate-session-ended", fields: ["session", "cause"] },
    ])
    expect(SESSION_EVENT_FORM.variants.length).toBe(5)
    expect(new Set(SESSION_EVENT_FORM.variants.map((variant) => variant.kind)).size).toBe(5)
  })
})

describe("the status pump as a fact source", () => {
  test("a transition lands one fact citing the session, naming the state it left and entered", async () => {
    const groups = await Effect.runPromise(groupsFor().pipe(Effect.orDie))
    const minted = await Effect.runPromise(mintSession(groups, null))
    const terms = await termsOver({ session: minted.digest, groups })

    const facts = await pumped([statusOf("disconnect", { server: SERVERS })], terms)
    expect(facts.length).toBe(1)
    const fact = facts[0]!
    expect(fact.kind).toBe("substrate-session-transition")
    expect(fact.session).toBe(minted.digest)
    expect(fact).toEqual({
      v: 0,
      kind: "substrate-session-transition",
      session: minted.digest,
      event: "disconnect",
      from: null,
      to: "disconnect",
      payload: { server: SERVERS },
    })
  })

  test("the four readings land as observations citing the state they were read within, and move nothing", async () => {
    const groups = await Effect.runPromise(groupsFor().pipe(Effect.orDie))
    const minted = await Effect.runPromise(mintSession(groups, null))
    const terms = await termsOver({ session: minted.digest, groups })

    const readings = OBSERVATION_EVENTS.map((row) =>
      statusOf(row.type, {
        added: ["one"],
        deleted: [],
        error: new Error("protocol"),
        pendingPings: 2,
        pending: 4096,
        sub: { getSubject: () => "flb.fab.ev.x.0" },
      })
    )
    const facts = await pumped(
      [statusOf("disconnect", { server: SERVERS }), ...readings],
      terms,
    )
    expect(facts.length).toBe(1 + readings.length)
    const observations = facts.slice(1)
    for (const observation of observations) {
      expect(observation.kind).toBe("substrate-session-observation")
      expect(observation.session).toBe(minted.digest)
      // Read WITHIN the state the last transition entered, and it did not move
      // it: every one of them reports the same state.
      expect((observation as { readonly state: string | null }).state).toBe("disconnect")
    }
    expect(observations.map((observation) => (observation as { readonly event: string }).event))
      .toEqual(OBSERVATION_EVENTS.map((row) => row.type))
  })

  test("a reading never feeds a state decision: the transition after them left the same state", async () => {
    const groups = await Effect.runPromise(groupsFor().pipe(Effect.orDie))
    const minted = await Effect.runPromise(mintSession(groups, null))
    const terms = await termsOver({ session: minted.digest, groups })

    const facts = await pumped([
      statusOf("disconnect", { server: SERVERS }),
      statusOf("ping", { pendingPings: 1 }),
      statusOf("slowConsumer", { sub: { getSubject: () => "s" }, pending: 9 }),
      statusOf("reconnecting"),
    ], terms)
    const last = facts[facts.length - 1] as { readonly from: string | null; readonly to: string }
    expect(last.from).toBe("disconnect")
    expect(last.to).toBe("reconnecting")
  })

  test("payloads are transcribed, not invented: each fact carries exactly its row's field set", async () => {
    const groups = await Effect.runPromise(groupsFor().pipe(Effect.orDie))
    const minted = await Effect.runPromise(mintSession(groups, null))
    const terms = await termsOver({ session: minted.digest, groups })

    const facts = await pumped(
      STATUS_EVENTS.filter((row) => row.type !== "close").map((row) =>
        statusOf(row.type, {
          server: SERVERS,
          added: ["a"],
          deleted: ["b"],
          error: new Error("protocol"),
          pendingPings: 3,
          pending: 7,
          sub: { getSubject: () => "flb.fab.ev.x.0" },
        })
      ),
      terms,
    )
    for (const fact of facts) {
      if (fact.kind === "substrate-session-established") continue
      const carried = fact as { readonly event: string; readonly payload: object }
      const row = rowNamed(carried.event)
      expect({ event: carried.event, keys: Object.keys(carried.payload).sort() })
        .toEqual({ event: carried.event, keys: row.payload.map((f) => f.name).sort() })
    }

    // The two payload shapes the pin declares that are not wire values at all
    // are projected to the one string that survives leaving the process.
    const slow = projectPayload(rowNamed("slowConsumer"), statusOf("slowConsumer", {
      sub: { getSubject: () => "flb.fab.ev.x.0" },
      pending: 7,
    }))
    expect(slow).toEqual({ sub: "flb.fab.ev.x.0", pending: 7 })
    const failed = projectPayload(rowNamed("error"), statusOf("error", {
      error: new Error("permissions violation"),
    }))
    expect(String(failed["error"])).toContain("permissions violation")
  })

  test("a field the client did not send folds as null rather than vanishing", () => {
    const payload = projectPayload(rowNamed("update"), statusOf("update", { added: ["one"] }))
    expect(payload).toEqual({ added: ["one"], deleted: null })
  })

  test("the re-attach mints a successor naming its predecessor, and the predecessor's bytes do not move", async () => {
    const groups = await Effect.runPromise(groupsFor().pipe(Effect.orDie))
    const first = await Effect.runPromise(mintSession(groups, null))
    const firstBytes = await bytesOf(first.established)
    const terms = await termsOver({
      session: first.digest,
      groups,
      // The one field a same-server re-attach always moves.
      reconnectedInfo: { ...INFO, client_id: 6 },
    })

    const facts = await pumped([
      statusOf("disconnect", { server: SERVERS }),
      statusOf("reconnecting"),
      statusOf("reconnect", { server: SERVERS }),
    ], terms)

    expect(facts.map((fact) => fact.kind)).toEqual([
      "substrate-session-transition",
      "substrate-session-transition",
      "substrate-session-transition",
      "substrate-session-established",
    ])
    const successor = facts[3] as {
      readonly session: string
      readonly predecessor: string | null
    }
    expect(successor.predecessor).toBe(first.digest)
    expect(successor.session).not.toBe(first.digest)
    // The transition that produced it cites the session that was live when the
    // client sent it, so the chain reads in the order it happened.
    expect(facts[2]!.session).toBe(first.digest)
    // The past is not edited.
    expect(Array.from(await bytesOf(first.established))).toEqual(Array.from(firstBytes))

    // And the successor's NAME stays derivable by a party holding only the
    // three groups: the predecessor rides the fact, never the fold.
    const reconnected = await Effect.runPromise(
      groupsFor({ ...INFO, client_id: 6 }).pipe(Effect.orDie),
    )
    const derived = await Effect.runPromise(mintSession(reconnected, first.digest))
    expect(successor.session).toBe(derived.digest)
  })

  test("every fact after a re-attach cites the successor, not the session that ended", async () => {
    const groups = await Effect.runPromise(groupsFor().pipe(Effect.orDie))
    const first = await Effect.runPromise(mintSession(groups, null))
    const terms = await termsOver({
      session: first.digest,
      groups,
      reconnectedInfo: { ...INFO, client_id: 6 },
    })
    const facts = await pumped([
      statusOf("reconnect", { server: SERVERS }),
      statusOf("ping", { pendingPings: 1 }),
    ], terms)
    const successor = (facts[1] as { readonly session: string }).session
    expect(facts[2]!.session).toBe(successor)
    expect(facts[2]!.session).not.toBe(first.digest)
  })

  test("the terminal row lands the ended fact with the cause the pin resolved, and nothing else", async () => {
    const groups = await Effect.runPromise(groupsFor().pipe(Effect.orDie))
    const minted = await Effect.runPromise(mintSession(groups, null))

    const hard = await pumped(
      [statusOf("close")],
      await termsOver({
        session: minted.digest,
        groups,
        cause: "ConnectionError: connection refused",
      }),
    )
    expect(hard).toEqual([{
      v: 0,
      kind: "substrate-session-ended",
      session: minted.digest,
      cause: "ConnectionError: connection refused",
    }])

    // Orderly teardown and hard kill share an end state and do not share a
    // cause, which is what keeps the two distinguishable in the record.
    const orderly = await pumped(
      [statusOf("close")],
      await termsOver({ session: minted.digest, groups, cause: "" }),
    )
    expect((orderly[0] as { readonly cause: string }).cause).toBe("")
    expect((orderly[0] as { readonly cause: string }).cause)
      .not.toBe((hard[0] as { readonly cause: string }).cause)
  })

  test("the lame-duck row is emitted and nothing reacts to it", async () => {
    const groups = await Effect.runPromise(groupsFor().pipe(Effect.orDie))
    const minted = await Effect.runPromise(mintSession(groups, null))
    const terms = await termsOver({ session: minted.digest, groups })

    const facts = await pumped([statusOf("ldm", { server: SERVERS })], terms)
    // Exactly one fact, of the same shape every other transition produces: no
    // successor mint, no teardown, no second emission, nothing moved but the
    // machine's own position.
    expect(facts).toEqual([{
      v: 0,
      kind: "substrate-session-transition",
      session: minted.digest,
      event: "ldm",
      from: null,
      to: "ldm",
      payload: { server: SERVERS },
    }])
    expect(transitionRowFor("ldm")!.mintsSuccessor).toBe(false)
    expect(transitionRowFor("ldm")!.emits).toBe("transition")
  })

  test("a value the transcription does not carry produces nothing rather than a guess", async () => {
    const groups = await Effect.runPromise(groupsFor().pipe(Effect.orDie))
    const minted = await Effect.runPromise(mintSession(groups, null))
    const terms = await termsOver({ session: minted.digest, groups })
    expect(await pumped([statusOf("somethingTheVendorNeverDeclared")], terms)).toEqual([])
  })

  test("order is the claim: the facts leave in the order the client sent the events", async () => {
    const groups = await Effect.runPromise(groupsFor().pipe(Effect.orDie))
    const minted = await Effect.runPromise(mintSession(groups, null))
    const terms = await termsOver({ session: minted.digest, groups })
    const facts = await pumped([
      statusOf("disconnect", { server: SERVERS }),
      statusOf("reconnecting"),
      statusOf("reconnecting"),
      statusOf("reconnecting"),
      statusOf("close"),
    ], terms)
    expect(facts.map((fact) =>
      fact.kind === "substrate-session-ended"
        ? fact.kind
        : (fact as { readonly event: string }).event
    )).toEqual([
      "disconnect",
      "reconnecting",
      "reconnecting",
      "reconnecting",
      "substrate-session-ended",
    ])
    for (const fact of facts) expect(fact.session).toBe(minted.digest)
  })

  test("every fact the pump mints is admitted by the lane's declared event schema", async () => {
    const groups = await Effect.runPromise(groupsFor().pipe(Effect.orDie))
    const minted = await Effect.runPromise(mintSession(groups, null))
    const terms = await termsOver({
      session: minted.digest,
      groups,
      reconnectedInfo: { ...INFO, client_id: 6 },
    })
    const facts = await pumped(
      STATUS_EVENTS.map((row) =>
        statusOf(row.type, {
          server: SERVERS,
          added: ["a"],
          deleted: ["b"],
          error: new Error("protocol"),
          pendingPings: 3,
          pending: 7,
          sub: { getSubject: () => "flb.fab.ev.x.0" },
        })
      ),
      terms,
    )
    expect(facts.length).toBeGreaterThan(STATUS_EVENTS.length)
    const { Schema } = await import("effect")
    const { SessionFact } = await import("../src/internal/sessionfacts.js")
    for (const fact of facts) {
      // Round-trips through the exact schema the lane admits, with no excess
      // property tolerated — the lane's own decoder refuses those.
      expect(Schema.decodeSync(SessionFact)(fact, { onExcessProperty: "error" }))
        .toEqual(fact)
      // And every one canonicalizes: a fact that could not be given bytes could
      // not be given a name.
      expect((await bytesOf(fact)).length).toBeGreaterThan(0)
    }
    // Every fact cites a session digest, so the lane's partition key resolves.
    for (const fact of facts) expect(fact.session).toMatch(/^[0-9a-f]{64}$/u)
  })

  test("the transition facts carry no clock and no invented protocol word", async () => {
    const groups = await Effect.runPromise(groupsFor().pipe(Effect.orDie))
    const minted = await Effect.runPromise(mintSession(groups, null))
    const terms = await termsOver({ session: minted.digest, groups })
    const facts = await pumped(
      TRANSITION_EVENTS.filter((row) => row.type !== "close").map((row) =>
        statusOf(row.type, { server: SERVERS })
      ),
      terms,
    )
    const names = new Set<string>(STATUS_EVENTS.map((row) => row.type))
    for (const fact of facts) {
      if (fact.kind !== "substrate-session-transition") continue
      const moved = fact as { readonly event: string; readonly to: string }
      // Every event name and every state name is the vendor's own.
      expect(names.has(moved.event)).toBe(true)
      expect(names.has(moved.to)).toBe(true)
      const text = new TextDecoder().decode(await bytesOf(fact))
      expect(text).not.toMatch(/\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/u)
    }
  })
})

describe("one connection carries one pump", () => {
  test("the client's status source fans out, so a second consumer double-mints rather than steals", () => {
    // Measured at the pin rather than assumed. The commissioning record read
    // this the other way round — "consuming it twice splits events between
    // consumers and silently loses facts" — and the pin's own bytes say
    // otherwise, so the arm reads the client's dispatch rather than repeating
    // the assumption. The fence still stands; its reason is double-minting.
    const dispatch = readFileSync(
      resolve(packageRoot, "node_modules/@nats-io/nats-core/lib/protocol.js"),
      "utf8",
    )
    // Every registered listener is pushed to; nothing selects one of them.
    expect(dispatch).toContain("this.listeners.forEach")
    const client = readFileSync(
      resolve(packageRoot, "node_modules/@nats-io/nats-core/lib/nats.js"),
      "utf8",
    )
    // And each call to the source registers a fresh listener of its own.
    expect(client).toContain("this.protocol.listeners.push(iter)")
  })

  test("two pumps over one source mint every fact twice, which is the defect the fence exists for", async () => {
    const groups = await Effect.runPromise(groupsFor().pipe(Effect.orDie))
    const minted = await Effect.runPromise(mintSession(groups, null))
    const events = [
      statusOf("disconnect", { server: SERVERS }),
      statusOf("reconnecting"),
    ]
    const first = await pumped(events, await termsOver({ session: minted.digest, groups }))
    const second = await pumped(events, await termsOver({ session: minted.digest, groups }))
    // Both consumers see everything, so the lane would carry each fact twice
    // and two successor chains would run over one connection.
    expect(second).toEqual([...first])
    expect([...first, ...second].length).toBe(2 * first.length)
  })

  test("the spine's fence refuses a second pump on one connection, and it refuses as a defect", async () => {
    const { attachStatusPump, hasStatusPump } = await import("../src/internal/statuspump.js")
    const groups = await Effect.runPromise(groupsFor().pipe(Effect.orDie))
    const minted = await Effect.runPromise(mintSession(groups, null))
    const terms = await termsOver({ session: minted.digest, groups })

    // A connection stand-in that carries only what the pump touches: its own
    // status source. Attaching is the whole act under test.
    const connection = {
      status: () => ({
        async *[Symbol.asyncIterator]() {
          // Yields nothing; the fence fires before anything is consumed.
        },
      }),
    } as unknown as import("@nats-io/nats-core").NatsConnection

    expect(hasStatusPump(connection)).toBe(false)
    const once = await Effect.runPromise(
      Effect.scoped(attachStatusPump(connection, terms).pipe(Effect.exit)),
    )
    expect(once._tag).toBe("Success")
    expect(hasStatusPump(connection)).toBe(true)

    const twice = await Effect.runPromise(
      Effect.scoped(attachStatusPump(connection, terms).pipe(Effect.exit)),
    )
    expect(twice._tag).toBe("Failure")
    // A defect, never a refusal: calling the spine wrong is not a sentence the
    // estate's domain language has, and dressing it as a retryable absence is
    // what the transport spine's own two-sided rule forbids. It rides the
    // fiber's cause, so the error channel stays exactly what it was.
    const { Cause } = await import("effect")
    if (twice._tag !== "Failure") throw new Error("the fence admitted a second pump")
    expect(Cause.pretty(twice.cause)).toContain("one connection carries one status pump")
    expect(String(Cause.squash(twice.cause))).toContain("double-mints")
  })
})

describe("the pump's exposure is a hand-off, never a second landing path", () => {
  test("facts leave through the exposed take, in observation order, and the queue empties", async () => {
    const { attachStatusPump } = await import("../src/internal/statuspump.js")
    const groups = await Effect.runPromise(groupsFor().pipe(Effect.orDie))
    const minted = await Effect.runPromise(mintSession(groups, null))
    const terms = await termsOver({ session: minted.digest, groups })
    const events = [
      statusOf("disconnect", { server: SERVERS }),
      statusOf("reconnecting"),
      statusOf("close"),
    ]
    const connection = {
      status: () => ({
        async *[Symbol.asyncIterator]() {
          for (const event of events) yield event
        },
      }),
    } as unknown as import("@nats-io/nats-core").NatsConnection

    const taken = await Effect.runPromise(Effect.scoped(Effect.gen(function* () {
      const pump = yield* attachStatusPump(connection, terms)
      yield* pump.run
      const first = yield* pump.take
      const second = yield* pump.take
      return { first, second }
    })).pipe(Effect.orDie))

    expect(taken.first.map((fact) => fact.kind)).toEqual([
      "substrate-session-transition",
      "substrate-session-transition",
      "substrate-session-ended",
    ])
    // The hand-off empties: a holder that lands them does not land them twice.
    expect(taken.second).toEqual([])
  })

  test("the landing path the pump feeds is the lane's own emit and no other", () => {
    const source = readFileSync(
      resolve(packageRoot, "src/internal/statuspump.ts"),
      "utf8",
    )
    // The consumer holds no lane, no emit, and no connection to land through.
    expect(source).not.toContain("planes/Lane.js")
    expect(source).not.toContain("sessionlanes.js")
    const lanes = readFileSync(
      resolve(packageRoot, "src/internal/sessionlanes.ts"),
      "utf8",
    )
    // And exactly one emit exists on that seam; the batch walker routes through it.
    expect(lanes.match(/yield\* emit\(/gu)?.length ?? 0).toBe(1)
  })
})
