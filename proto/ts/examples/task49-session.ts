/**
 * Task 49, run through the protocol it built. Retroactive but real: every
 * move below is a live wire request against a running protod.
 */

import { ProtoClient } from "../src/client.ts"
import { bootstrapTaskAcceptance } from "../src/protocol.ts"

const url = process.env.FOLDLAB_PROTO_URL
if (url === undefined || url === "") throw new Error("set FOLDLAB_PROTO_URL")

const connected = await ProtoClient.connect(url)
if (!connected.ok) throw new Error(JSON.stringify(connected.refusal))
const client = connected.fact

const show = (label: string, reply: unknown) => {
  process.stdout.write(`\n### ${label}\n${JSON.stringify(reply, null, 2)}\n`)
}

try {
  const boot = await bootstrapTaskAcceptance(client)

  const opened = await client.openProtocolSession({
    protocol: boot.protocol,
    bindings: { operator: "mepuka", coordinator: "fable", builder: "codex" },
  })
  if (!opened.ok) throw new Error(JSON.stringify(opened.refusal))
  const session = opened.fact.session
  show("open", opened.fact)

  const fill = (principal: string, hole: string, value: unknown) =>
    client.fillProtocolSession(session, principal, hole, value as never)

  show("spec (fable)", await fill("fable", "spec", {
    title: "Task 49 — flb.protocol.v0 + the session runtime",
    body_digest: "scratch/codex/49-protocol-v0.md",
  }))

  show("authorization (mepuka)", await fill("mepuka", "authorization", {
    granted: true,
    note: "protocol grill G1-G6 ratified; build it",
  }))

  show("build_report (codex)", await fill("codex", "build_report", {
    commit: "f22a6c6aa",
    gates: "proto go+ts, root typecheck+220 tests, verify/moves axiom gate: all green",
    notes: "12 conformance vectors incl. both dispute arrival orders",
  }))

  show("review (fable)", await fill("fable", "review", {
    findings: [{
      title: "FINDING-49-COMPLETION",
      severity: "low",
      note: "close outcome keys on a hole literally named 'decision'; scheme is task-acceptance-specific until a completion field names the holes",
    }],
  }))

  // The two-seat blank: coordinator proposes, operator counters. This is the
  // one live fence, and the conflict must surface rather than overwrite.
  show("decision (fable proposes revise)", await fill("fable", "decision", {
    verdict: "revise",
    note: "fix the completion hole before merge",
  }))

  show("decision (mepuka counters accept)", await fill("mepuka", "decision", {
    verdict: "accept",
    note: "dogfood build — it does not matter, merge it",
  }))

  // Unauthorized move: codex has no seat on decision.
  show("decision (codex — expect refusal)", await fill("codex", "decision", {
    verdict: "accept",
  }))

  show("state before close", (await client.protocolSessionState(session)).fact ?? null)

  // Only the operator seat may close. Coordinator first, to see the refusal.
  show("close (fable — expect refusal)", await client.closeProtocolSession(session, "fable"))
  show("close (mepuka)", await client.closeProtocolSession(session, "mepuka"))

  show("state after close", (await client.protocolSessionState(session)).fact ?? null)
} finally {
  await client.close()
}
