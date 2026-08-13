/**
 * Refusals, printed. Spawns the real protod binary against a temp
 * JetStream store, provokes five refusals, and repairs one of them using
 * nothing but the refusal's own `example` field.
 *
 * Run from proto/ts (after `bun install` there):
 *   bun examples/refusals.ts
 *
 * proto/ts/test/smoke.test.ts ASSERTS this thread; this file SHOWS it. The
 * assertions are the gate, this is the tutorial — keep them in step.
 *
 * Provenance: docs/research/2026-08-14-tangible-examples.md, where the
 * output of each block is recorded verbatim.
 */

import { ProtoClient } from "../src/client.ts"
import { structureDigest, type Json } from "../src/jcs.ts"
import { Session } from "../src/session.ts"
import { spawnProtod } from "../test/harness.ts"

const show = (label: string, value: unknown): void => {
  console.log(`\n### ${label}`)
  console.log(JSON.stringify(value, null, 2))
}

const daemon = await spawnProtod()
const connected = await ProtoClient.connect(daemon.url)
if (!connected.ok) throw new Error(`connect refused: ${JSON.stringify(connected.refusal)}`)
const client = connected.fact
const session = new Session(client)

// 1 — a typo'd node kind: the daemon names the path, the value it got, every
// value it accepts, and hands back a node that WOULD have been accepted.
const typoed = await session.createType({ k: "strng" })
show("REFUSAL 1: type.create with a typo'd node kind", typoed)

// 2 — self-repair from the refusal alone: resubmit `example` verbatim. No
// documentation was consulted, and the reply's `next[].body` is the request
// that comes after this one, already filled in.
if (!typoed.ok) {
  show("REPAIR: submit refusal.example verbatim", await session.createType(typoed.refusal.example as Json))
}

// 3 — W4: a frame claiming an identity the catalog never admitted.
show("REFUSAL 2: ingress frame claiming an uncataloged identity",
  await session.publish("data", { type: "e".repeat(64), payload: 1 }))

// 4 — W1: an asserted identity the daemon cannot re-derive. `expected` is the
// digest the daemon computed itself; the line below recomputes it locally.
const lie = "d".repeat(64)
show("REFUSAL 3: asserted identity the daemon cannot re-derive",
  await session.createType({ k: "bool" }, { assertedDigest: lie }))
console.log("\nlocal structureDigest({k:'bool'}) =", structureDigest({ k: "bool" }))

// 5 — absence is a typed refusal, and it names the subject that would bring
// the journal into being.
show("REFUSAL 4: read of a journal that does not exist", await session.read("nope"))

// 6 — W6: heads are claims. The daemon first binds a supplied cursor to its
// stored entry; the client then verifies the returned suffix before adoption.
show("REFUSAL 5: read from a cursor that does not verify",
  await client.read("catalog", { seq: -1, head: "a".repeat(64) }, 0))

// 7 — and the read that works: entries plus a head this client re-folded
// locally rather than believed.
show("VERIFIED READ: catalog", await session.read("catalog"))

await client.close()
await daemon.stop()
