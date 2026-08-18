import { describe, expect, test } from "bun:test"

import type { Next } from "../src/Refusal.js"
import { transportRefusal as anchorsRefusal } from "../src/internal/anchors.js"
import { transportRefusal as cellsRefusal } from "../src/internal/cells.js"
import { transportRefusal as chaosRefusal } from "../src/internal/chaos.js"
import { transportRefusal as foldsRefusal } from "../src/internal/folds.js"
import { transportRefusal as lanesRefusal } from "../src/internal/lanes.js"
import { transportRefusal as natsRefusal } from "../src/internal/nats.js"
import { transportRefusal as pumpRefusal } from "../src/internal/pump.js"
import { transportRefusal as registersRefusal } from "../src/internal/registers.js"
import {
  teachRetryOperation,
  transportRefusalFor,
  type TransportRefusal,
} from "../src/internal/transport.js"

/**
 * The transport spine's refusal wall (FH-1's stated deliverable, charged by the
 * DEV-748 round-2 review).
 *
 * `internal/transport.ts` collapsed eight copies of one connection-and-refusal
 * shape onto one module. That extraction is only behaviour-preserving if every
 * adapter still mints exactly the refusal its own copy minted: the absence
 * kind, the law sentence, the expectation, and the taught repair are what a
 * caller reads to decide whether to retry and what to do next, and a spine that
 * homogenized any of them would be a behaviour change wearing a refactor.
 *
 * The oracle is outside the spine: every expectation below is transcribed from
 * the eight pre-extraction definitions at `14298c2`, the commit before this
 * module existed (`git show 14298c2:packages/plait/src/internal/<adapter>.ts`).
 * The table is therefore a restatement of the old behaviour, not a mirror of
 * the new implementation — un-homogenizing is what makes it green.
 *
 * Its negative control is in this file: the same checker run against a
 * homogenized spine must refute every adapter whose terms that homogenization
 * erases.
 */

interface SpineRow {
  /** The adapter module that owns these terms. */
  readonly adapter: string
  /** The refusal that module mints, as the module exports it. */
  readonly refuse: TransportRefusal
  readonly kind: string
  readonly law: string
  readonly expected: string
  /** The taught repair, restated as a function of the refused operation. */
  readonly next: (operation: string) => ReadonlyArray<Next>
}

/** The note the two operation-tracking adapters teach, restated per `14298c2`. */
const retryNote = (operation: string): ReadonlyArray<Next> => [{
  subject: operation,
  note: "Retry this absence with retryAbsence and a temporal Schedule.",
}]

/** One row per pre-extraction definition; the operation each row is exercised on. */
const rows: ReadonlyArray<SpineRow> = [
  {
    adapter: "nats",
    refuse: natsRefusal,
    kind: "transport-unavailable",
    law: "Transport absence may be retried; structural envelope evidence may not.",
    expected: "the pinned local NATS operation to be available",
    next: retryNote,
  },
  {
    adapter: "registers",
    refuse: registersRefusal,
    kind: "register-transport-unavailable",
    law: "Transport absence may be retried; fencing-law refusals may not.",
    expected: "the pinned local NATS KV operation to be available",
    next: () => [{
      subject: "register.observe",
      note: "Reconnect to the pinned server and observe the register: a transport refusal leaves this operation's outcome unknown, so read the landed holder, token, and outcome back before retrying it.",
    }],
  },
  {
    adapter: "cells",
    refuse: cellsRefusal,
    kind: "cell-transport-unavailable",
    law: "Transport absence may be retried; lattice-law refusals may not.",
    expected: "the pinned local NATS KV operation to be available",
    next: retryNote,
  },
  {
    adapter: "anchors",
    refuse: anchorsRefusal,
    kind: "anchor-transport-unavailable",
    law: "Transport absence may be retried; anchor revision conflicts may not.",
    expected: "the pinned local NATS KV operation to be available",
    next: () => [{
      subject: "Folds.deploy",
      note: "A transport refusal leaves this anchor write's outcome unknown. Do not retry it in place: detach and redeploy - resumption reads the landed anchor back, and a retried CAS that already landed refuses as lost-anchor-cas by design.",
    }],
  },
  {
    adapter: "lanes",
    refuse: lanesRefusal,
    kind: "lane-transport-unavailable",
    law: "Transport absence may be retried; declared lane shape violations may not.",
    expected: "the pinned local NATS JetStream operation to be available",
    next: () => [{
      subject: "Lane.emit",
      note: "Reconnect and re-emit; F2 makes duplicate delivery harmless, and the envelope digest is the message id.",
    }],
  },
  {
    adapter: "pump",
    refuse: pumpRefusal,
    kind: "fold-transport-unavailable",
    law: "Transport absence may be retried; consumer and checkpoint shape violations may not.",
    expected: "the pinned local NATS durable-consumer operation to be available",
    next: () => [{
      subject: "Folds.deploy",
      note: "Reconnect and redeploy; resumption re-attaches at floor + 1, and redelivery replaces anything left unacknowledged.",
    }],
  },
  {
    adapter: "folds",
    refuse: foldsRefusal,
    kind: "fold-transport-unavailable",
    law: "Transport absence may be retried; declared fold laws may not.",
    expected: "the pinned local NATS operation to be available",
    next: () => [{
      subject: "Folds.deploy",
      note: "Reconnect and redeploy; resumption re-attaches at floor + 1, and redelivery replaces anything left unacknowledged.",
    }],
  },
  {
    adapter: "chaos",
    refuse: chaosRefusal,
    kind: "chaos-transport-unavailable",
    law: "The chaos schedule uses only the real durable-consumer protocol for redelivery.",
    expected: "the pinned local NATS consumer operation to be available",
    next: () => [{
      subject: "plait chaos",
      note: "Restore the consumer protocol and re-run the measurement against the same pinned span.",
    }],
  },
]

/**
 * Every way a minted refusal can differ from its row, named. The checker is the
 * test surface: the shipped refusals and the planted homogenization both go
 * through it, so a green row and a refuted mutant are the same measurement.
 */
const mismatches = (
  row: SpineRow,
  refuse: TransportRefusal,
  operation: string,
  cause: unknown,
): ReadonlyArray<string> => {
  const minted = refuse(operation, cause)
  const problems: Array<string> = []
  if (minted.sort !== "absence") problems.push(`sort ${minted.sort}`)
  if (minted.kind !== row.kind) problems.push(`kind ${minted.kind}`)
  if (minted.law !== row.law) problems.push(`law ${minted.law}`)
  if (minted.expected !== row.expected) problems.push(`expected ${String(minted.expected)}`)
  if (JSON.stringify(minted.path) !== JSON.stringify([operation])) {
    problems.push(`path ${JSON.stringify(minted.path)}`)
  }
  if (minted.got !== String(cause)) problems.push(`got ${String(minted.got)}`)
  if (JSON.stringify(minted.next) !== JSON.stringify(row.next(operation))) {
    problems.push(`next ${JSON.stringify(minted.next)}`)
  }
  return problems
}

/** Two operations per row: the adapter's own, and a foreign one it never uses. */
const operations = ["connection.acquire", "some.other.operation"] as const

describe("the transport spine mints each adapter's own refusal", () => {
  for (const row of rows) {
    for (const operation of operations) {
      test(`${row.adapter} on ${operation}`, () => {
        expect(mismatches(row, row.refuse, operation, new Error("boom"))).toEqual([])
      })
    }
  }

  test("eight definitions carry seven distinct absence kinds", () => {
    expect(rows.length).toBe(8)
    // `fold-transport-unavailable` is shared by the pump and the fold service,
    // which is why eight sites carry seven kinds. The affordances record's
    // "six absence kinds" undercounts by one.
    expect(new Set(rows.map((row) => row.kind)).size).toBe(7)
  })

  test("the refusal path names the operation and the cause survives verbatim", () => {
    const cause = new Error("the pinned server refused the connection")
    for (const row of rows) {
      const minted = row.refuse("bucket.status", cause)
      expect(minted.path).toEqual(["bucket.status"])
      expect(minted.got).toBe(String(cause))
    }
  })
})

describe("negative control — a homogenized spine is refuted", () => {
  /**
   * What a careless extraction produces: one kind, one law, one expectation,
   * one taught repair for all eight adapters. It reproduces the `nats` row's
   * terms exactly — that row is the one adapter this mutation cannot be caught
   * on, and saying so is the point of naming the survivor.
   */
  const homogenized = transportRefusalFor({
    kind: "transport-unavailable",
    law: "Transport absence may be retried; structural envelope evidence may not.",
    expected: "the pinned local NATS operation to be available",
    next: teachRetryOperation,
  })

  test("seven of the eight rows refute it, and the survivor is nats", () => {
    const survivors = rows
      .filter((row) => mismatches(row, homogenized, "connection.acquire", new Error("boom")).length === 0)
      .map((row) => row.adapter)
    expect(survivors).toEqual(["nats"])
  })

  test("each refuted row names the field the homogenization erased", () => {
    for (const row of rows.filter((candidate) => candidate.adapter !== "nats")) {
      const problems = mismatches(row, homogenized, "connection.acquire", new Error("boom"))
      expect(problems.length).toBeGreaterThan(0)
      // Every adapter but `cells` differs in its kind; `cells` shares the
      // generic teach note, so its refutation must come from kind and law.
      expect(problems.some((problem) => problem.startsWith("kind "))).toBe(true)
    }
  })

  test("erasing only the taught repair still refutes the six fixed-subject rows", () => {
    const refuted = rows
      .filter((row) => {
        const noteOnly = transportRefusalFor({
          kind: row.kind,
          law: row.law,
          expected: row.expected,
          next: teachRetryOperation,
        })
        return mismatches(row, noteOnly, "connection.acquire", new Error("boom")).length > 0
      })
      .map((row) => row.adapter)
    expect(refuted).toEqual(["registers", "anchors", "lanes", "pump", "folds", "chaos"])
  })
})
