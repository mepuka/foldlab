import { afterAll, beforeAll, describe, expect, test } from "bun:test"

import {
  StorageType,
  jetstream,
  jetstreamManager,
} from "@nats-io/jetstream"
import { Kvm } from "@nats-io/kv"
import {
  PermissionViolationError,
  type NatsConnection,
} from "@nats-io/nats-core"
import { connect } from "@nats-io/transport-node"
import { Effect, Redacted, Result, Schema } from "effect"

import { ANCHOR_BUCKET } from "../src/planes/Anchor.js"
import { CELL_BUCKET } from "../src/planes/Cell.js"
import { REGISTER_BUCKET } from "../src/planes/Register.js"
import {
  CarrierPermissionMap,
  CarrierPermissionScope,
  CarrierRole,
  declareCarrierPermissionMap,
  type CarrierPermissionMap as CarrierPermissionMapValue,
  type CarrierRole as CarrierRoleValue,
} from "../src/internal/permissions.js"
import {
  acquireConnection,
  transportRefusalFor,
} from "../src/internal/transport.js"
import {
  startNatsHarness,
  type NatsHarness,
} from "./NatsHarness.js"

const encode = (value: string): Uint8Array => new TextEncoder().encode(value)
const decode = (value: Uint8Array): string => new TextDecoder().decode(value)

const ALPHA_STREAM = "PLAIT_PERMISSION_ALPHA"
const BETA_STREAM = "PLAIT_PERMISSION_BETA"
const COMMONS_STREAM = "PLAIT_PERMISSION_COMMONS"

const scope = {
  evidenceLane: "alpha",
  evidenceStreams: [ALPHA_STREAM],
  commonsStream: COMMONS_STREAM,
  factVenue: "venue-a",
  node: "node-a",
  inboxPrefixes: {
    "evidence-publisher": "_INBOX.plait.evidence.alpha",
    "fact-publisher": "_INBOX.plait.fact.venue-a",
    "node-publisher": "_INBOX.plait.node.node-a",
    cell: "_INBOX.plait.kv.cell",
    anchor: "_INBOX.plait.kv.anchor",
    register: "_INBOX.plait.kv.register",
    requester: "_INBOX.plait.requester.client-a",
  },
} as const

const permissionMap = declareCarrierPermissionMap(scope)

const inboxes: Readonly<Record<CarrierRoleValue, string>> = {
  ...scope.inboxPrefixes,
  responder: "_INBOX.plait.responder.venue-a",
}

const passwordFor = (role: CarrierRoleValue): string => `test-${role}-password`

const quote = (value: string): string => JSON.stringify(value)

const renderList = (values: ReadonlyArray<string>): string =>
  `[${values.map(quote).join(", ")}]`

const renderPermissions = (
  permissions: CarrierPermissionMapValue[CarrierRoleValue],
): string => {
  const response = permissions.allow_responses === undefined
    ? ""
    : `allow_responses: { max: ${permissions.allow_responses.max}, expires: ${quote(permissions.allow_responses.expires)} }`
  return `permissions: {
    publish: { allow: ${renderList(permissions.publish)} }
    subscribe: { allow: ${renderList(permissions.subscribe)} }
    ${response}
  }`
}

const serverConfiguration = (): string => `authorization {
  users: [
    { user: "admin", password: "admin" }
    ${CarrierRole.literals.map((role) => `{
      user: ${quote(role)}
      password: ${quote(passwordFor(role))}
      ${renderPermissions(permissionMap[role])}
    }`).join("\n    ")}
  ]
}
`

const refusal = transportRefusalFor({
  kind: "permission-probe-unavailable",
  law: "The permission wall reports only pinned-client transport evidence.",
  expected: "the local permission probe connection to be available",
  next: () => [],
})

let harness: NatsHarness | undefined

const credential = (role: CarrierRoleValue) => ({
  user: role,
  password: Redacted.make(passwordFor(role)),
  inboxPrefix: inboxes[role],
})

const withRole = <A>(
  role: CarrierRoleValue,
  use: (connection: NatsConnection) => Promise<A>,
): Promise<A> => Effect.runPromise(Effect.scoped(
  Effect.flatMap(
    acquireConnection(
      {
        servers: harness!.url,
        credential: credential(role),
        connectionName: `plait-permission-probe-${role}`,
      },
      "plait-permission-probe",
      "permission.connection.acquire",
      refusal,
    ),
    (connection) => Effect.promise(() => use(connection)),
  ),
))

const withDeadline = async <A>(
  operation: Promise<A>,
  label: string,
  milliseconds = 5_000,
): Promise<A> => {
  let timer: ReturnType<typeof setTimeout> | undefined
  const deadline = new Promise<never>((_, reject) => {
    timer = setTimeout(() => reject(new Error(`timed out waiting for ${label}`)), milliseconds)
  })
  try {
    return await Promise.race([operation, deadline])
  } finally {
    if (timer !== undefined) clearTimeout(timer)
  }
}

const permissionCause = (cause: unknown): PermissionViolationError | undefined => {
  let current = cause
  for (let depth = 0; depth < 4; depth++) {
    if (current instanceof PermissionViolationError) return current
    if (!(current instanceof Error) || current.cause === undefined) return undefined
    current = current.cause
  }
  return undefined
}

const expectPermissionRefusal = async (
  connection: NatsConnection,
  operation: PermissionViolationError["operation"],
  subject: string,
  attempt: () => Promise<unknown>,
): Promise<void> => {
  const statuses = connection.status()[Symbol.asyncIterator]()
  let direct: unknown
  try {
    await attempt()
  } catch (cause) {
    direct = cause
  }

  let refusal = permissionCause(direct)
  if (refusal === undefined) {
    refusal = await withDeadline((async () => {
      while (true) {
        const next = await statuses.next()
        if (next.done) throw new Error(`connection status ended before refusal for ${subject}`)
        if (next.value.type !== "error") continue
        const permission = permissionCause(next.value.error)
        if (permission !== undefined) return permission
      }
    })(), `permission refusal for ${subject}`)
  }
  await statuses.return?.()
  expect(refusal).toBeInstanceOf(PermissionViolationError)
  expect({ operation: refusal.operation, subject: refusal.subject }).toEqual({ operation, subject })
}

beforeAll(async () => {
  harness = await startNatsHarness({ config: serverConfiguration() })
  const admin = await connect({
    servers: harness.url,
    user: "admin",
    pass: "admin",
    name: "plait-permission-probe-admin",
  })
  try {
    const manager = await jetstreamManager(admin)
    await manager.streams.add({
      name: ALPHA_STREAM,
      subjects: ["flb.fab.ev.alpha.*"],
      storage: StorageType.File,
      num_replicas: 1,
    })
    await manager.streams.add({
      name: BETA_STREAM,
      subjects: ["flb.fab.ev.beta.*"],
      storage: StorageType.File,
      num_replicas: 1,
    })
    await manager.streams.add({
      name: COMMONS_STREAM,
      subjects: ["flb.fab.fact.*", "flb.fab.node.*"],
      storage: StorageType.File,
      num_replicas: 1,
    })
    const buckets = new Kvm(admin)
    for (const bucket of [CELL_BUCKET, ANCHOR_BUCKET, REGISTER_BUCKET]) {
      await buckets.create(bucket, {
        history: 1,
        replicas: 1,
        storage: StorageType.File,
        allow_direct: true,
      })
    }
  } finally {
    await admin.close()
  }
}, 30_000)

afterAll(async () => {
  if (harness !== undefined) await harness.stop()
  harness = undefined
})

describe("least-privilege carrier permissions", () => {
  test("the declared role map is closed, scoped, and contains no global inbox grant", () => {
    expect(Schema.is(CarrierPermissionMap)(permissionMap)).toBe(true)
    expect(permissionMap).toEqual({
      "evidence-publisher": {
        publish: [
          "$JS.API.INFO",
          `$JS.API.STREAM.INFO.${ALPHA_STREAM}`,
          "flb.fab.ev.alpha.*",
        ],
        subscribe: ["_INBOX.plait.evidence.alpha.>"],
      },
      "fact-publisher": {
        publish: [
          "$JS.API.INFO",
          `$JS.API.STREAM.INFO.${COMMONS_STREAM}`,
          "flb.fab.fact.venue-a",
        ],
        subscribe: ["_INBOX.plait.fact.venue-a.>"],
      },
      "node-publisher": {
        publish: [
          "$JS.API.INFO",
          `$JS.API.STREAM.INFO.${COMMONS_STREAM}`,
          "flb.fab.node.node-a",
        ],
        subscribe: ["_INBOX.plait.node.node-a.>"],
      },
      cell: {
        publish: [
          "$JS.API.INFO",
          `$JS.API.STREAM.INFO.KV_${CELL_BUCKET}`,
          `$JS.API.DIRECT.GET.KV_${CELL_BUCKET}.>`,
          `$KV.${CELL_BUCKET}.>`,
        ],
        subscribe: ["_INBOX.plait.kv.cell.>"],
      },
      anchor: {
        publish: [
          "$JS.API.INFO",
          `$JS.API.STREAM.INFO.KV_${ANCHOR_BUCKET}`,
          `$JS.API.DIRECT.GET.KV_${ANCHOR_BUCKET}.>`,
          `$KV.${ANCHOR_BUCKET}.>`,
        ],
        subscribe: ["_INBOX.plait.kv.anchor.>"],
      },
      register: {
        publish: [
          "$JS.API.INFO",
          `$JS.API.STREAM.INFO.KV_${REGISTER_BUCKET}`,
          `$JS.API.DIRECT.GET.KV_${REGISTER_BUCKET}.>`,
          `$KV.${REGISTER_BUCKET}.>`,
        ],
        subscribe: ["_INBOX.plait.kv.register.>"],
      },
      requester: {
        publish: ["flb.req.>"],
        subscribe: ["_INBOX.plait.requester.client-a.>"],
      },
      responder: {
        publish: [],
        subscribe: ["flb.req.>"],
        allow_responses: { max: 1, expires: "2s" },
      },
    })
    expect(
      Object.values(permissionMap).flatMap((permission) => [
        ...permission.publish,
        ...permission.subscribe,
      ]),
    ).not.toContain("_INBOX.>")

    expect(() => Schema.decodeSync(CarrierPermissionMap)({
      ...permissionMap,
      requester: {
        ...permissionMap.requester,
        subscribe: ["_INBOX.>"],
      },
    }, { onExcessProperty: "error" })).toThrow()

    const unsafePrefixPairs = [
      ["_INBOX.plait", "_INBOX.plait.fact"],
      ["_INBOX.plait.fact", "_INBOX.plait"],
      ["_INBOX.plait", "_INBOX.plait"],
    ] as const
    for (const [evidencePrefix, factPrefix] of unsafePrefixPairs) {
      const nestedScope = {
        ...scope,
        inboxPrefixes: {
          ...scope.inboxPrefixes,
          "evidence-publisher": evidencePrefix,
          "fact-publisher": factPrefix,
        },
      } as const
      const nested = Schema.decodeResult(CarrierPermissionScope)(nestedScope, {
        onExcessProperty: "error",
      })
      expect(Result.isFailure(nested)).toBe(true)
      if (Result.isFailure(nested)) {
        expect(Schema.isSchemaError(nested.failure)).toBe(true)
        expect(nested.failure.message).toContain("token-prefix-disjoint")
      }
      expect(() => declareCarrierPermissionMap(nestedScope)).toThrow()
    }
  })

  test("every publish and KV role can use only its declared carrier", async () => {
    const publishers = [
      ["evidence-publisher", ALPHA_STREAM, "flb.fab.ev.alpha.0"],
      ["fact-publisher", COMMONS_STREAM, "flb.fab.fact.venue-a"],
      ["node-publisher", COMMONS_STREAM, "flb.fab.node.node-a"],
    ] as const
    for (const [role, stream, subject] of publishers) {
      await withRole(role, async (connection) => {
        const manager = await jetstreamManager(connection)
        expect((await manager.streams.info(stream)).config.name).toBe(stream)
        expect((await jetstream(connection).publish(subject, encode(role))).stream).toBe(stream)
      })
    }

    const buckets = [
      ["cell", CELL_BUCKET],
      ["anchor", ANCHOR_BUCKET],
      ["register", REGISTER_BUCKET],
    ] as const
    for (const [role, bucketName] of buckets) {
      await withRole(role, async (connection) => {
        const bucket = await new Kvm(connection).open(bucketName, { allow_direct: true })
        expect((await bucket.status()).bucket).toBe(bucketName)
        await bucket.put("owned", encode(role))
        const entry = await bucket.get("owned")
        expect(entry === null ? null : decode(entry.value)).toBe(role)
      })
    }
  }, 30_000)

  test("request-reply uses a scoped inbox and one tracked responder reply", async () => {
    await withRole("responder", async (responder) => {
      await withRole("requester", async (requester) => {
        const subscription = responder.subscribe("flb.req.permission-probe", { max: 1 })
        const served = (async () => {
          for await (const message of subscription) {
            expect(message.respond(encode("ok"))).toBe(true)
          }
        })()
        await responder.flush()
        const response = await requester.request(
          "flb.req.permission-probe",
          encode("request"),
          { timeout: 5_000 },
        )
        await served
        expect(decode(response.data)).toBe("ok")

        const forged = `${scope.inboxPrefixes.requester}.forged`
        await expectPermissionRefusal(responder, "publish", forged, async () => {
          responder.publish(forged, encode("forged"))
          await responder.flush()
        })
      })
    })
  }, 30_000)

  test("cross-lane publish, foreign bucket API, and global and foreign inbox subscribe refuse loudly", async () => {
    await withRole("evidence-publisher", async (connection) => {
      await expectPermissionRefusal(connection, "publish", "flb.fab.ev.beta.0", () =>
        jetstream(connection).publish("flb.fab.ev.beta.0", encode("cross-lane")))
    })

    await withRole("cell", async (connection) => {
      const foreign = await new Kvm(connection).open(ANCHOR_BUCKET, { allow_direct: true })
      await expectPermissionRefusal(
        connection,
        "publish",
        `$JS.API.DIRECT.GET.KV_${ANCHOR_BUCKET}.$KV.${ANCHOR_BUCKET}.foreign`,
        () => foreign.get("foreign"),
      )
    })

    await withRole("requester", async (connection) => {
      await expectPermissionRefusal(connection, "subscription", "_INBOX.>", async () => {
        connection.subscribe("_INBOX.>")
        await connection.flush()
      })
    })

    await withRole("evidence-publisher", async (connection) => {
      const foreignInbox = `${scope.inboxPrefixes["fact-publisher"]}.>`
      await expectPermissionRefusal(connection, "subscription", foreignInbox, async () => {
        connection.subscribe(foreignInbox)
        await connection.flush()
      })
    })
  }, 30_000)
})
