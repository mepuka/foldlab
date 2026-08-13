import { encodeJsonValue } from "../packages/core/src/jcs.ts"
import { algebras, mapped, homomorphisms, type Algebra } from "../packages/core/src/algebra.ts"
import { applyMerge, type MergeFact, type StreamEvent } from "../packages/core/src/stream.ts"
import { Effect, Exit } from "effect"

console.log("=== J1: jcs encodeValue accepts non-JSON objects, folds to {} ===")
// Date and Map have no enumerable own keys -> both canonicalize to "{}"
const asDate = encodeJsonValue(new Date(0) as any)
const asMap = encodeJsonValue(new Map([["a", 1]]) as any)
const asEmpty = encodeJsonValue({})
console.log("Date  ->", JSON.stringify(asDate))
console.log("Map   ->", JSON.stringify(asMap))
console.log("{}    ->", JSON.stringify(asEmpty))
console.log("COLLISION Date==={}:", asDate.ok && asEmpty.ok && asDate.bytes === asEmpty.bytes)
console.log("COLLISION Map(a=1)==={}:", asMap.ok && asEmpty.ok && asMap.bytes === asEmpty.bytes)
// A class instance with a method: method is not enumerable -> {} ; distinct instances collide
class Money { constructor(public cents: number) {} get dollars() { return this.cents / 100 } }
const m1 = encodeJsonValue(new Money(100) as any)
console.log("Money(100) ->", JSON.stringify(m1), "(cents is enumerable own prop)")

console.log("\n=== A1: algebra Declaration brand is forgeable via Symbol.for ===")
const realMax = algebras.max
const brand = Symbol.for("@foldlab/core/Declaration")
// Forge a declaration copying the REAL max digest, but attach a LYING combine.
const forgedDecl = {
  [brand]: true as const,
  spec: realMax.declaration!.spec,
  encoding: realMax.declaration!.encoding,
  digest: realMax.declaration!.digest, // copied digest -> passes compatibility gate
}
const impostor: Algebra<number | null> = {
  empty: null,
  combine: (l, _r) => l, // NOT max: ignores right operand entirely
  declaration: forgedDecl as any,
}
const derived = mapped(homomorphisms.isPositiveFromMax, impostor)
console.log("impostor combine is max? ", impostor.combine(1, 5) === Math.max(1, 5))
console.log("mapped() certified impostor (declaration present, no identityIssue):",
  derived.declaration !== undefined, "/", derived.identityIssue)
console.log("  -> the digest gate admitted a source whose combine is NOT the declared algebra")

console.log("\n=== M1: applyMerge duplicate seqs within one source silently last-write-win ===")
const ev = (stream: string, seq: number, p: string): StreamEvent =>
  ({ stream, seq, payload: new TextEncoder().encode(p) })
// Two DIFFERENT events share seq=1 in source "s": last one wins the index slot.
const sources = new Map<string, ReadonlyArray<StreamEvent>>([
  ["s", [ev("s", 1, "FIRST"), ev("s", 1, "SECOND")]],
])
const fact: MergeFact = { picks: [{ stream: "s", seq: 1 }] }
const out = Effect.runSyncExit(applyMerge(fact, sources))
if (Exit.isSuccess(out)) {
  const picked = new TextDecoder().decode(out.value[0]!.payload)
  console.log("picked payload for seq=1:", picked, "(no refusal of the duplicate seq)")
} else {
  console.log("refused:", out)
}
