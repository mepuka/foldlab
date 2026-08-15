/**
 * Round two: a successor session citing the closed round. Exercises ruling B
 * (iteration is a new linked session) and finishes the fence demonstration.
 */

import { ProtoClient } from "../src/client.ts"
import { bootstrapTaskAcceptance } from "../src/protocol.ts"

const url = process.env.FOLDLAB_PROTO_URL
if (url === undefined || url === "") throw new Error("set FOLDLAB_PROTO_URL")

const connected = await ProtoClient.connect(url)
if (!connected.ok) throw new Error(JSON.stringify(connected.refusal))
const client = connected.fact

const line = (label: string, value: unknown) =>
  process.stdout.write(`\n### ${label}\n${JSON.stringify(value, null, 2)}\n`)

try {
  const boot = await bootstrapTaskAcceptance(client)
  const bindings = { operator: "mepuka", coordinator: "fable", builder: "codex" }

  // The round-one session is closed; read its final state digest to cite it.
  const first = await client.openProtocolSession({ protocol: boot.protocol, bindings })
  if (!first.ok) throw new Error(JSON.stringify(first.refusal))
  const prior = await client.protocolSessionState(first.fact.session)
  if (!prior.ok) throw new Error(JSON.stringify(prior.refusal))
  const priorState = prior.fact as { status: string; final_state_digest?: string }
  line("round one status", { status: priorState.status, digest: priorState.final_state_digest })

  const opened = await client.openProtocolSession({
    protocol: boot.protocol,
    bindings,
    predecessor: {
      session: first.fact.session,
      state_digest: priorState.final_state_digest as string,
    },
  })
  if (!opened.ok) throw new Error(JSON.stringify(opened.refusal))
  const session = opened.fact.session
  line("round two opened", { session, predecessor: first.fact.session })

  const fill = (principal: string, hole: string, value: unknown) =>
    client.fillProtocolSession(session, principal, hole, value as never)

  await fill("fable", "spec", { title: "Task 49 round two", body_digest: "scratch/codex/49-protocol-v0.md" })
  await fill("mepuka", "authorization", { granted: true, note: "merge it" })
  await fill("codex", "build_report", { commit: "f22a6c6aa", gates: "all green" })
  await fill("fable", "review", { findings: [] })

  // THE FENCE: coordinator proposes revise, operator counters accept.
  const proposed = await fill("fable", "decision", { verdict: "revise", note: "fix completion hole" })
  line("fable proposes revise", proposed.ok ? proposed.fact.hole_state : proposed.refusal)

  const countered = await fill("mepuka", "decision", { verdict: "accept", note: "dogfood, merge it" })
  line("mepuka counters accept — conflict must SURFACE", countered.ok ? countered.fact.hole_state : countered.refusal)

  const unauthorized = await fill("codex", "decision", { verdict: "accept" })
  line("codex has no seat here", unauthorized.ok ? unauthorized.fact : (unauthorized.refusal as { kind: string }).kind)

  const wrongCloser = await client.closeProtocolSession(session, "fable")
  line("coordinator cannot close", wrongCloser.ok ? wrongCloser.fact : (wrongCloser.refusal as { kind: string }).kind)

  const closed = await client.closeProtocolSession(session, "mepuka")
  line("operator closes — fence runs", closed.ok ? closed.fact : closed.refusal)

  const final = await client.protocolSessionState(session)
  line("final fold", final.ok ? final.fact : final.refusal)
} finally {
  await client.close()
}
