import { describe, expect, test } from "bun:test"
import { Effect } from "effect"

import { declareCarrierPermissionMap } from "../src/internal/permissions.js"
import { STATUS_EVENTS, STATUS_VOCABULARY_PIN } from "../src/internal/statusvocabulary.js"
import {
  WIRE_API_SUBJECT_BY_DECLARATION,
  WIRE_API_SUBJECTS,
  WIRE_LIFECYCLE_BY_ENTRY,
  WIRE_LIFECYCLE_ENTRIES,
  WIRE_PROTOCOL_VERBS,
  WIRE_STATUS_BY_DECLARATION,
  WIRE_STATUS_EVENTS,
  WIRE_SYSTEM_SUBJECTS,
  WIRE_VOCABULARY,
} from "../src/internal/wirevocabulary.js"
import { canonicalBytes, type WireValue } from "../src/truth/Canonical.js"

/**
 * The spine's half of the wire vocabulary's evidence.
 *
 * The parity wall holds this module byte-identical to its normative home and
 * re-derives every provenance digest from the pinned vendor sources. What the
 * suite adds here are the properties a consumer of the table depends on and the
 * wall does not look at: that the table renders deterministically in THIS
 * language, that the by-declaration lookups reach the rows they name, and that
 * the status group is the same eleven rows the connection machine walks.
 */

const render = (value: unknown): Promise<Uint8Array> =>
  Effect.runPromise(canonicalBytes(value as WireValue))

describe("the wire vocabulary in the spine", () => {
  test("renders the same bytes every time", async () => {
    const first = await render(WIRE_VOCABULARY)
    for (let attempt = 0; attempt < 8; attempt += 1) {
      expect(Array.from(await render(WIRE_VOCABULARY))).toEqual(Array.from(first))
    }
  })

  test("every row carries a provenance pin and one of the three wire shapes", () => {
    const shapes = new Set(["journal-fact", "commitment-register", "ephemeral-chatter"])
    const rows = [
      ...WIRE_PROTOCOL_VERBS,
      ...WIRE_API_SUBJECTS,
      ...WIRE_SYSTEM_SUBJECTS,
      ...WIRE_STATUS_EVENTS,
      ...WIRE_LIFECYCLE_ENTRIES,
    ]
    expect(rows.length).toBe(111)
    for (const row of rows) {
      expect(row.pin.package.length).toBeGreaterThan(0)
      expect(row.pin.version.length).toBeGreaterThan(0)
      expect(row.pin.digest).toMatch(/^[0-9a-f]{64}$/u)
      expect(shapes.has(row.wire)).toBe(true)
      // A chatter row says what it may accelerate and what it may never
      // decide; a row that decides something says nothing, because there is
      // nothing to promote.
      if (row.wire === "ephemeral-chatter") expect(row.promotion.length).toBeGreaterThan(0)
      else expect(row.promotion).toBe("")
    }
  })

  test("the by-declaration lookups reach the rows they name", () => {
    expect(WIRE_STATUS_BY_DECLARATION.LDMStatus).toBe(WIRE_STATUS_EVENTS[4])
    expect(WIRE_API_SUBJECT_BY_DECLARATION["server.JSApiAccountInfo"].declaration)
      .toBe("server.JSApiAccountInfo")
    expect(WIRE_LIFECYCLE_BY_ENTRY["server.Server.ReadyForConnections"].phase).toBe("ready")
    for (const row of WIRE_STATUS_EVENTS) {
      expect(WIRE_STATUS_BY_DECLARATION[row.declaration]).toBe(row)
    }
  })

  test("the status group is the eleven rows the connection machine walks", () => {
    // The absorption, checked from the consumer's side: the machine's table is
    // a PROJECTION of the wire vocabulary's status group and not a second
    // statement of it, so the two agree row for row by construction and this
    // test is what says so out loud.
    expect(STATUS_EVENTS.length).toBe(WIRE_STATUS_EVENTS.length)
    for (const [index, row] of WIRE_STATUS_EVENTS.entries()) {
      const absorbed = STATUS_EVENTS[index]!
      expect(absorbed.type).toBe(row.type)
      expect(absorbed.declaration).toBe(row.declaration)
      expect(absorbed.placement).toBe(row.placement)
      expect(absorbed.payload).toEqual(
        row.payload.map((field) => ({
          name: field.name,
          sort: field.sort,
          optional: field.optional,
        })),
      )
    }
    // Seven transitions and four readings, carried as a column rather than as
    // a comment.
    const transitions = WIRE_STATUS_EVENTS.filter((row) => row.placement === "transition")
    expect(transitions.length).toBe(7)
    expect(WIRE_STATUS_EVENTS.length - transitions.length).toBe(4)
  })

  test("the status group is pinned at the package the vocabulary names", () => {
    for (const row of WIRE_STATUS_EVENTS) {
      expect(row.pin.package).toBe(STATUS_VOCABULARY_PIN.package)
      expect(row.pin.version).toBe(STATUS_VOCABULARY_PIN.version)
    }
  })

  test("the permission projection's subjects come out of the table", () => {
    // Not a restatement of the subjects: what is checked is that every subject
    // the projection emits under the API prefix is one the table can produce,
    // so a table row edited without the projection following fails here rather
    // than at a broker.
    const prefix = WIRE_API_SUBJECT_BY_DECLARATION["server.JSApiPrefix"].subject
    const map = declareCarrierPermissionMap({
      evidenceLane: "lane",
      evidenceStreams: ["EV_ALPHA"],
      commonsStream: "COMMONS",
      factVenue: "venue",
      node: "node",
      inboxPrefixes: {
        "evidence-publisher": "_INBOX.ev",
        "fact-publisher": "_INBOX.fact",
        "node-publisher": "_INBOX.node",
        cell: "_INBOX.cell",
        anchor: "_INBOX.anchor",
        catalog: "_INBOX.cat",
        register: "_INBOX.reg",
        requester: "_INBOX.req",
      },
    })
    const emitted = Object.values(map).flatMap((permission) => [...permission.publish])
    const underPrefix = emitted.filter((subject) => subject.startsWith(prefix))
    expect(underPrefix.length).toBeGreaterThan(0)
    for (const subject of underPrefix) {
      const matched = WIRE_API_SUBJECTS.some((row) => {
        const template: string = row.template.length === 0 ? row.subject : row.template
        if (template.length === 0) return false
        const pattern = template
          .split("%s")
          .map((segment) => segment.replaceAll(/[.*+?^${}()|[\]\\]/gu, "\\$&"))
          .join("[^.]+(?:\\.[^.>]+)*|>")
        return new RegExp(`^${pattern}$`, "u").test(subject)
      })
      expect({ subject, matched }).toEqual({ subject, matched: true })
    }
  })
})
