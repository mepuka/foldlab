/**
 * The TLA+/TS wall: exact reachable-STATE-SET equality.
 *
 * specs/Effector.tla claims to be a transcription of the transition table in
 * packages/mech/src/effector.ts (itself pinned byte-for-byte against
 * go/effector/model by effector.wall.test.ts). Counts matching could still
 * hide two ports that disagree state-for-state, so this test compares the
 * SETS: TLC dumps every reachable state (-dump), each dumped state is parsed
 * and canonicalized through the TS model's own encoder, and the result must
 * equal — as a set, exactly — the TS checker's BFS closure.
 *
 * Green here completes the chain TLA+ = TS = Go, which is what entitles the
 * Go conformance driver (go/effector traceconform) to say its schedules are
 * derived from the same pinned transition table as the TLA+ specs.
 */

import { describe, expect, test } from "bun:test"
import { mkdtempSync, readFileSync, rmSync } from "node:fs"
import { tmpdir } from "node:os"
import { join } from "node:path"
import {
  effectorSystem,
  gateConfig,
  MaxOwners,
  TagAbsent,
  TagClaim,
  TagDone,
  type ModelConfig,
  type Process,
  type Register,
  type State,
  type Tag,
} from "../src/effector.ts"
import { distinctStates, foundNoError, runTlc } from "../scripts/tlc.ts"

const TLC_TIMEOUT_MS = 180_000

// ---------- a tiny parser for TLC's printed values ----------
// Grammar of what -dump emits: record `[ name |-> v, ... ]`, tuple
// `<< v, ... >>`, string `"x"`, integer, TRUE/FALSE.

type TlaValue =
  | { readonly kind: "record"; readonly fields: ReadonlyMap<string, TlaValue> }
  | { readonly kind: "tuple"; readonly items: ReadonlyArray<TlaValue> }
  | { readonly kind: "string"; readonly value: string }
  | { readonly kind: "int"; readonly value: number }
  | { readonly kind: "bool"; readonly value: boolean }

class Parser {
  private pos = 0
  constructor(private readonly text: string) {}

  parse(): TlaValue {
    const v = this.value()
    this.ws()
    if (this.pos !== this.text.length) {
      throw new Error(`trailing input at ${this.pos}: ${this.text.slice(this.pos, this.pos + 40)}`)
    }
    return v
  }

  private ws(): void {
    while (this.pos < this.text.length && /\s/.test(this.text[this.pos]!)) this.pos++
  }

  private lit(s: string): boolean {
    this.ws()
    if (this.text.startsWith(s, this.pos)) {
      this.pos += s.length
      return true
    }
    return false
  }

  private expect(s: string): void {
    if (!this.lit(s)) {
      throw new Error(`expected ${s} at ${this.pos}: ${this.text.slice(this.pos, this.pos + 40)}`)
    }
  }

  private value(): TlaValue {
    this.ws()
    if (this.lit("<<")) {
      const items: Array<TlaValue> = []
      if (!this.lit(">>")) {
        do {
          items.push(this.value())
        } while (this.lit(","))
        this.expect(">>")
      }
      return { kind: "tuple", items }
    }
    if (this.lit("[")) {
      const fields = new Map<string, TlaValue>()
      do {
        this.ws()
        const m = /^[A-Za-z_][A-Za-z0-9_]*/.exec(this.text.slice(this.pos))
        if (m === null) throw new Error(`expected field name at ${this.pos}`)
        this.pos += m[0].length
        this.expect("|->")
        fields.set(m[0], this.value())
      } while (this.lit(","))
      this.expect("]")
      return { kind: "record", fields }
    }
    if (this.lit('"')) {
      const end = this.text.indexOf('"', this.pos)
      if (end < 0) throw new Error("unterminated string")
      const value = this.text.slice(this.pos, end)
      this.pos = end + 1
      return { kind: "string", value }
    }
    if (this.lit("TRUE")) return { kind: "bool", value: true }
    if (this.lit("FALSE")) return { kind: "bool", value: false }
    const m = /^-?\d+/.exec(this.text.slice(this.pos))
    if (m === null) {
      throw new Error(`unrecognized value at ${this.pos}: ${this.text.slice(this.pos, this.pos + 40)}`)
    }
    this.pos += m[0].length
    return { kind: "int", value: Number(m[0]) }
  }
}

const field = (v: TlaValue, name: string): TlaValue => {
  if (v.kind !== "record") throw new Error(`expected record for ${name}`)
  const f = v.fields.get(name)
  if (f === undefined) throw new Error(`missing field ${name}`)
  return f
}
const int = (v: TlaValue): number => {
  if (v.kind !== "int") throw new Error("expected int")
  return v.value
}
const bool = (v: TlaValue): boolean => {
  if (v.kind !== "bool") throw new Error("expected bool")
  return v.value
}
const str = (v: TlaValue): string => {
  if (v.kind !== "string") throw new Error("expected string")
  return v.value
}

const tagOf = (s: string): Tag => {
  switch (s) {
    case "absent":
      return TagAbsent
    case "claim":
      return TagClaim
    case "done":
      return TagDone
    default:
      throw new Error(`unknown tag ${s}`)
  }
}

const registerOf = (v: TlaValue): Register => ({
  tag: tagOf(str(field(v, "tag"))),
  fence: int(field(v, "fence")),
  owner: int(field(v, "owner")),
  live: bool(field(v, "live")),
  result: int(field(v, "result")),
})

const processOf = (v: TlaValue): Process => {
  const pend = field(v, "pend")
  return {
    crashed: bool(field(v, "crashed")),
    hasClaim: bool(field(v, "hasClaim")),
    fence: int(field(v, "fence")),
    pend: {
      active: bool(field(pend, "active")),
      usedFence: int(field(pend, "usedFence")),
      snapTag: tagOf(str(field(pend, "snapTag"))),
      snapFence: int(field(pend, "snapFence")),
      snapResult: int(field(pend, "snapResult")),
      fresh: bool(field(pend, "fresh")),
    },
  }
}

const idleProcess: Process = {
  crashed: false,
  hasClaim: false,
  fence: 0,
  pend: {
    active: false,
    usedFence: 0,
    snapTag: TagAbsent,
    snapFence: 0,
    snapResult: 0,
    fresh: false,
  },
}

/**
 * One dumped state -> the TS model's State. TLA owner ids are 1-based and
 * both models STORE owners/results 1-based, so register fields map straight
 * across; the procs tuple (owners 1..N) pads to the TS fixed width.
 */
const stateOf = (stanza: string): State => {
  const vars = new Map<string, TlaValue>()
  for (const part of stanza.split(/^\/\\ /m)) {
    const m = /^(\w+) = /.exec(part)
    if (m === null) continue
    vars.set(m[1]!, new Parser(part.slice(m[0].length).trim()).parse())
  }
  const procsVal = vars.get("procs")
  if (procsVal === undefined || procsVal.kind !== "tuple") {
    throw new Error("dump state lacks procs tuple")
  }
  const procs = procsVal.items.map(processOf)
  while (procs.length < MaxOwners) procs.push(idleProcess)
  return {
    key1: registerOf(vars.get("key1")!),
    key2: registerOf(vars.get("key2")!),
    maxFence: int(vars.get("maxFence")!),
    procs,
  }
}

/** Split a -dump file into per-state stanzas (skipping the `State N:` headers). */
const dumpStates = (path: string): Array<string> => {
  const text = readFileSync(path, "utf8")
  return text
    .split(/^State \d+:\r?\n/m)
    .map((s) => s.trim())
    .filter((s) => s.length > 0)
}

/** The TS checker's reachable set at closure, as canonical encodings. */
const closureSet = (config: ModelConfig): Set<string> => {
  const sys = effectorSystem(config, 0)
  const seen = new Set<string>([sys.encode(sys.init)])
  const queue: Array<State> = [sys.init]
  for (let head = 0; head < queue.length; head++) {
    const cur = queue[head]!
    for (const action of sys.actions(cur)) {
      const [next] = sys.step(cur, action)
      const key = sys.encode(next)
      if (seen.has(key)) continue
      seen.add(key)
      queue.push(next)
    }
  }
  return seen
}

const configs = [
  { label: "gate shape, generation cap 2", cfg: "Effector.cap2.cfg", pinned: 584, patch: { maxFence: 2 } },
  { label: "gate shape, generation cap 3", cfg: "Effector.cap3.cfg", pinned: 2312, patch: { maxFence: 3 } },
  {
    // One identity running concurrent workers — the audit's single-owner-
    // counterexample regime. Bounded-checked clean by TLC and set-equal to
    // the TS model; the unbounded counterpart is the identity-free
    // induction (EffectorIndSelf.cfg).
    label: "self-interleave, generation cap 3",
    cfg: "Effector.self.cfg",
    pinned: 2750,
    patch: { maxFence: 3, selfInterleave: true },
  },
] as const

describe("TLC-dumped state set equals the TS model's closure, exactly", () => {
  for (const { label, cfg, pinned, patch } of configs) {
    test(
      `single-key ${label}: ${pinned} states, set-equal`,
      () => {
        const dir = mkdtempSync(join(tmpdir(), "tlc-dump-"))
        const dumpPath = join(dir, `effector-${cfg}.dump`)
        try {
          const run = runTlc("Effector", cfg, { dumpTo: dumpPath })
          expect(foundNoError(run)).toBe(true)
          expect(distinctStates(run)).toBe(pinned)

          const config: ModelConfig = { ...gateConfig("single-key"), ...patch }
          const sys = effectorSystem(config, 0)
          const ts = closureSet(config)
          expect(ts.size).toBe(pinned)

          const stanzas = dumpStates(dumpPath)
          expect(stanzas.length).toBe(pinned)
          const dumped = new Set<string>()
          for (const stanza of stanzas) {
            const encoded = sys.encode(stateOf(stanza))
            expect(ts.has(encoded)).toBe(true)
            dumped.add(encoded)
          }
          // Same size, no duplicates, every element a member: set equality.
          expect(dumped.size).toBe(ts.size)
        } finally {
          rmSync(dir, { recursive: true, force: true })
        }
      },
      TLC_TIMEOUT_MS,
    )
  }
})
