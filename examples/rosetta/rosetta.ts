/**
 * THE ROSETTA DEMO — foldlab's core theorem in Effect-community vocabulary.
 *
 * Run from the repository root:  bun examples/rosetta/rosetta.ts
 *
 * The theorem: every recursive tagged union has EXACTLY ONE fold that respects
 * its shape (the initial algebra / catamorphism / universal property). That
 * uniqueness is not a curiosity — it is what pays for the three sections marked
 * PAYOFF below. Every section names the Effect-community term first and the
 * house term in parentheses.
 *
 * Nothing here reimplements foldlab. Every fold, digest and refusal comes from
 * `@foldlab/core`; this file only arranges them.
 */

import { Effect } from "effect"
import { algebras, encodeFoldState, product, productStep, steps } from "@foldlab/core/algebra"
import { defineFold } from "@foldlab/core/fold"
import { emptyFoldCache, getFoldCache, putFoldCache } from "@foldlab/core/foldCache"
import { applyKV, foldKV, headFrom, streamSeed, type StreamEvent } from "@foldlab/core/stream"
// The ONE import to change when `@effect-atom/atom` is installed. See atom.ts.
import { Atom, Registry } from "./atom.ts"

export interface RosettaCheck {
  readonly label: string
  readonly held: boolean
}

export const rosettaOutput: Array<string> = []
export const rosettaChecks: Array<RosettaCheck> = []

const write = (text: string): void => {
  rosettaOutput.push(text)
  if (import.meta.main) console.log(text)
}
const banner = (text: string): void => write(`\n${"─".repeat(66)}\n${text}\n`)
const check = (label: string, held: boolean): void => {
  rosettaChecks.push({ label, held })
  write(`  ${held ? "PASS" : "FAIL"}  ${label}`)
}
const short = (digest: string): string => `${digest.slice(0, 16)}…`

// ═══ A. THE SHAPE ══════════════════════════════════════════════════════════
// The tagged union (house name: the shape). A discriminated union is exactly a
// sum of products, which is exactly what an initial algebra is built from — so
// the moment this type is written, its fold already exists and is already
// unique. Nothing below chooses the fold; it only spells it out.

type LabEvent =
  | { readonly _tag: "Deposited"; readonly amount: number }
  | { readonly _tag: "Withdrew"; readonly amount: number }
  | { readonly _tag: "Labelled"; readonly key: string; readonly value: string }

const STREAM = "rosetta"
const utf8 = new TextEncoder()

/** The one encoding: the shape's constructors, rendered as canonical bytes. */
const wire = (e: LabEvent, index: number): StreamEvent => ({
  stream: STREAM,
  seq: index + 1,
  payload: utf8.encode(
    e._tag === "Labelled"
      ? `${e.key}=${e.value}`
      : JSON.stringify({ amount: e._tag === "Withdrew" ? -e.amount : e.amount }),
  ),
})
const onWire = (events: ReadonlyArray<LabEvent>): ReadonlyArray<StreamEvent> => events.map(wire)

const history: ReadonlyArray<LabEvent> = [
  { _tag: "Deposited", amount: 120 },
  { _tag: "Labelled", key: "region", value: "eu-west" },
  { _tag: "Withdrew", amount: 45 },
  { _tag: "Deposited", amount: 310 },
  { _tag: "Labelled", key: "tier", value: "gold" },
  { _tag: "Withdrew", amount: 20 },
]

banner("A. THE SHAPE — a tagged union (house name: the shape)")
write(`  constructors : Deposited | Withdrew | Labelled`)
write(`  history      : ${history.map((e) => e._tag).join(" → ")}`)

// ═══ B. THE ONE FOLD ═══════════════════════════════════════════════════════
// The reducer (house name: the meaning fold). In Effect terms this is the
// `Stream.runFold` shape — an initial value plus a step — and it is the UNIQUE
// monoid homomorphism from the free monoid on LabEvent into the carrier. The
// carrier here is a product monoid: how many events, and the largest signed
// amount seen. `defineFold` takes exactly two things, an algebra and a step,
// because exactly two things determine a fold; there is no third knob to get
// wrong, and no way for two callers to write "the same" fold differently.

const ledger = defineFold(
  product(algebras.count, algebras.max),
  productStep<StreamEvent, readonly [1, number | null]>(
    steps.constOne,
    steps.payloadNumber(["amount"]),
  ),
)

banner("B. THE ONE FOLD — the reducer (house name: the meaning fold)")
const wired = onWire(history)
const state = ledger.fold(wired)
write(`  events folded : ${history.length}`)
write(`  fold state    : [count=${state[0]}, max=${state[1]}]`)
write(`  fold digest   : ${short(ledger.digest!)}`)
check("the fold carries a name, so it can be referred to elsewhere", ledger.digest !== undefined)

// ═══ C. THE IDENTITY FOLD ══════════════════════════════════════════════════
// The Merkle/content hash (house name: the identity fold). The SAME shape,
// folded with SHA-256 instead of with meaning: `extend(head, event)` is the
// step, `streamSeed` is the initial value. Two folds over one history — one
// says what it means, one says what it was. The chain remembers what the fold
// forgives, which is why the pair is enough to key a cache in section D.

banner("C. THE IDENTITY FOLD — the Merkle head (house name: the identity fold)")
const head = headFrom(streamSeed(STREAM), wired)
const stateBytes = encodeFoldState(state)
const stateEncoding = stateBytes.ok ? stateBytes.bytes : undefined
write(`  chain head        : ${short(head)}`)
write(`  fold state canon. : ${stateEncoding ?? "REFUSED"}`)
check("the history has a content address", /^[0-9a-f]{64}$/.test(head))

// ═══ D. PAYOFF 1 — CACHE BY DIGEST, NOTHING TO INVALIDATE ══════════════════
// Memoisation (house name: the fold cache). The key is (fold digest, chain
// head): the name of the computation and the name of the exact input. Neither
// half can drift, so an entry can never become wrong — a longer history is a
// DIFFERENT head, not a stale one. There is no invalidation API here because
// there is nothing invalidation could mean.

banner("D. PAYOFF 1 — memoise by digest (house name: the fold cache)")
const written = putFoldCache(emptyFoldCache(), ledger, head, state)
check("the result was stored under its two names", written.ok)
if (!written.ok) throw new Error(`fold cache refused the demo: ${written.refusal.reason}`)

// A structurally equal value built from scratch: different objects, same bytes.
const rebuiltHead = headFrom(streamSeed(STREAM), onWire([...history]))
const read = getFoldCache(written.cache, ledger, rebuiltHead)
check("a freshly rebuilt, structurally equal history hits the same entry", read.ok && read.hit)
if (read.ok && read.hit) {
  write(`  cached bytes  : ${read.bytes}`)
  check("the cached value is what a fresh fold would produce", read.bytes === stateEncoding)
}

// ═══ E. PAYOFF 2 — PARALLEL REPLAY ═════════════════════════════════════════
// Associativity (house name: split-and-combine). Because the carrier is a
// monoid, the history may be cut ANYWHERE, the pieces folded independently —
// different machines, different order of completion — and the results combined.
// Determinism is not a discipline anyone has to maintain; it is a consequence.

banner("E. PAYOFF 2 — split, fold halves, combine (house name: parallel replay)")
const cut = wired.length >> 1
const leftState = ledger.fold(wired.slice(0, cut))
const rightState = ledger.fold(wired.slice(cut))
const combined = ledger.algebra.combine(leftState, rightState)
const combinedBytes = encodeFoldState(combined)
write(`  sequential : ${stateBytes.ok ? stateBytes.bytes : "REFUSED"}`)
write(`  left ⊕ right: ${combinedBytes.ok ? combinedBytes.bytes : "REFUSED"}`)
check(
  "folding the halves and combining equals folding the whole",
  stateBytes.ok && combinedBytes.ok && stateBytes.bytes === combinedBytes.bytes,
)
check(
  "so both routes agree with the cached entry, under one digest",
  combinedBytes.ok && read.ok && read.hit && read.bytes === combinedBytes.bytes,
)

// ═══ F. PAYOFF 3 — THE WALL ════════════════════════════════════════════════
// The typed error channel (house name: the wall). A payload outside the fold's
// declared domain — here a NUL inside the key — does not enter state, does not
// half-apply, and does not throw. It comes back as a value in the error
// channel, naming the event it refused. A fold that admits everything cannot
// have a unique meaning; the wall is what makes the domain a domain.

banner("F. PAYOFF 3 — a refused input (house name: the wall)")
const poison = wire({ _tag: "Labelled", key: "region\u0000EU", value: "eu-west" }, 99)
const initialKV = Effect.runSync(foldKV([]))
const refusal = Effect.runSync(Effect.flip(applyKV(initialKV, poison)))
write(`  refusal tag   : ${refusal._tag}`)
write(`  refused seq   : ${refusal.event.seq}`)
check("a NUL key is refused as a typed value, not thrown", refusal._tag === "MalformedPayload")
check("and no state was produced to be corrupted", initialKV.count === 0)

// ═══ G. REACTIVE STATE ═════════════════════════════════════════════════════
// Derived atoms (house name: the two folds, made live). Three atoms: the source
// of truth (the event log), the meaning fold over it, and the identity fold
// over it. The derived pair is not "cached state that must be kept in sync" —
// each is a pure function of the log, and the log only ever grows. This is the
// surface a live daemon feed plugs into: push an event, both folds move.

banner("G. REACTIVE STATE — atoms over the two folds (Effect-Atom-ready)")
const registry = Registry.make()
const eventsAtom = Atom.make(history)
const stateAtom = Atom.make((get) => ledger.fold(onWire(get(eventsAtom))))
const digestAtom = Atom.make((get) => headFrom(streamSeed(STREAM), onWire(get(eventsAtom))))

const seen: Array<string> = []
registry.subscribe(stateAtom, (next) => {
  seen.push("state")
  write(`  → state  : [count=${next[0]}, max=${next[1]}]`)
})
registry.subscribe(digestAtom, (next) => {
  seen.push("digest")
  write(`  → digest : ${short(next)}`)
})

write(`  initial state  : [count=${registry.get(stateAtom)[0]}, max=${registry.get(stateAtom)[1]}]`)
write(`  initial digest : ${short(registry.get(digestAtom))}`)
write("  appending Deposited(900) …")
registry.set(eventsAtom, [...registry.get(eventsAtom), { _tag: "Deposited", amount: 900 }])

check("appending one event moved both derived atoms", seen.includes("state") && seen.includes("digest"))
check("the meaning fold advanced", registry.get(stateAtom)[0] === history.length + 1)
check("the identity fold advanced", registry.get(digestAtom) !== head)
check(
  "and the live state still equals a cold fold of the same log",
  encodeFoldState(registry.get(stateAtom)).ok &&
    JSON.stringify(registry.get(stateAtom)) === JSON.stringify(ledger.fold(onWire(registry.get(eventsAtom)))),
)

banner("All payoffs demonstrated. One shape, one fold, three consequences.")

export const rosettaReport = {
  foldDigest: ledger.digest,
  foldState: state,
  foldStateBytes: stateEncoding,
  head,
  cacheBytes: read.ok && read.hit ? read.bytes : undefined,
  refusal: { tag: refusal._tag, seq: refusal.event.seq },
  liveState: registry.get(stateAtom),
  liveHead: registry.get(digestAtom),
} as const

if (import.meta.main && rosettaChecks.some(({ held }) => !held)) process.exitCode = 1
