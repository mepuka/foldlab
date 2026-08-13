import { makeCollector, memoryBacking } from "../packages/core/src/entity.ts"
import { applyKV, emptyKV } from "../packages/core/src/stream.ts"
import { Effect, Exit } from "effect"

// A NUL-key payload: byte 0x00 then "=v"
const nulKeyPayload = new Uint8Array([0x00, 0x3d, 0x76]) // "\0=v"

// 1) The walled applyKV REFUSES it:
const walled = Effect.runSyncExit(applyKV(emptyKV, {
  stream: "s", seq: 1, payload: nulKeyPayload,
}))
console.log("walled applyKV NUL key: refused =", Exit.isFailure(walled))

// 2) applySync (entity.ts) ACCEPTS it, then anchors() throws forever:
const c = makeCollector(memoryBacking(), () => "e")
c.ingest({ stream: "s", seq: 1, payload: nulKeyPayload })
console.log("ingested NUL key OK; now anchors():")
try {
  c.anchors()
  console.log("  anchors() returned (BUG NOT reproduced)")
} catch (err) {
  console.log("  anchors() THREW:", (err as Error).constructor.name, (err as Error).message)
}

// 3) Lossy-decode collision: 0xff and 0xfe both fold to U+FFFD key
const a = makeCollector(memoryBacking(), () => "e")
a.ingest({ stream: "s", seq: 1, payload: new Uint8Array([0xff, 0x3d, 0x76]) }) // 0xff=v
const b = makeCollector(memoryBacking(), () => "e")
b.ingest({ stream: "s", seq: 1, payload: new Uint8Array([0xfe, 0x3d, 0x76]) }) // 0xfe=v
const av = a.entity("e")!, bv = b.entity("e")!
console.log("collision: heads differ =", av.head !== bv.head,
  "| stateDigest same =", a.anchors()[0].state === b.anchors()[0].state)
