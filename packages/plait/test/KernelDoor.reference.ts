/**
 * The conformance harness's join table: the planted candidates the model's
 * emitted admission records name, plus the mutant door the suite must catch.
 *
 * The door itself no longer lives here. The shipped door
 * (`src/kernel/Door.ts`) is the harness target — the vectors gate the
 * artifact the runtime ships, never a test-only twin. What stays test-side
 * is exactly what the docstring of the old reference file said must stay
 * visible beside the harness: the planted-candidate table (the emitted
 * records name a candidate but do not carry its structure) and the
 * refuse-everything mutant (a replay that cannot fail is not evidence).
 */
import type { KernelCandidateAct, KernelDoor, KernelDoorContext } from "../src/kernel/KernelDoor.js"
import { makeKernelDoor } from "../src/kernel/Door.js"

export {
  canonicalBytes,
  decodeAct,
  decodePred,
  encodeAct,
  encodePred,
  makeKernelDoor,
  rankToKind,
  rankToStage,
  type KernelAct,
  type KernelTriggerPredicate,
} from "../src/kernel/Door.js"

/** The harness's historical name for the door builder, now the shipped one. */
export const referenceDoor = makeKernelDoor

/**
 * The ground admission context of `Kernel.Planted.door`. The pinned universe
 * deliberately omits one admitted schema, so the off-writ row has a referent
 * that resolves and still refuses.
 */
export const PLANTED_CONTEXT: KernelDoorContext = {
  catalog: [
    { kind: "schema", id: 8 },
    { kind: "schema", id: 9 },
    { kind: "program", id: 3 },
    { kind: "policy", id: 4 },
    { kind: "policy", id: 5 },
    { kind: "lane", id: 1 },
    { kind: "index", id: 2 },
    { kind: "resource", id: 6 },
    { kind: "algebra", id: 7 },
  ],
  pinned: [
    { kind: "schema", id: 8 },
    { kind: "program", id: 3 },
    { kind: "policy", id: 4 },
    { kind: "lane", id: 1 },
  ],
}

const groundAnchor = { foldId: 2, lane: 1, shard: 0, floor: 4, state: 11, head: 6 } as const

/**
 * The planted candidates, keyed by the `Kernel.Planted` def name the emitted
 * admission records carry. One row per closure row, the two
 * signature-discipline rows, and the lawful twin whose admission refutes the
 * door that refuses everything.
 */
export const PLANTED_CANDIDATES: {
  readonly [name: string]: KernelCandidateAct
} = {
  clockFold: {
    _tag: "fold",
    declared: 2,
    anchor: groundAnchor,
    query: [{ _tag: "clockNow" }],
  },
  absenceTrigger: {
    _tag: "trigger",
    predicate: { _tag: "onAbsence", subject: 6 },
    declaration: 3,
  },
  unfencedDecide: {
    _tag: "decide",
    register: 3,
    token: null,
    outcome: [{ _tag: "literal", value: 42 }],
  },
  lastWriterJoin: {
    _tag: "join",
    cell: 6,
    contribution: [{ _tag: "literal", value: 42 }],
    strategy: { _tag: "lastWriterWins" },
  },
  trustingRead: { _tag: "trustBytes", kind: "schema", target: 8, asserted: 999 },
  crossRegisterDecide: {
    _tag: "decide",
    register: 3,
    token: { register: 99, value: 7 },
    outcome: [{ _tag: "literal", value: 42 }],
  },
  mintedDeclare: {
    _tag: "declare",
    kind: "schema",
    payload: [{ _tag: "mintedId", token: 12345 }],
    writ: 4,
  },
  latestRead: { _tag: "readLatest", subject: 6 },
  forwardDeclare: {
    _tag: "declare",
    kind: "schema",
    payload: [{ _tag: "digestRef", kind: "schema", id: 77 }],
    writ: 4,
  },
  secretEmit: { _tag: "emit", lane: 1, body: [{ _tag: "secretBytes", bytes: 31337 }] },
  absenceClaimTrigger: {
    _tag: "trigger",
    predicate: { _tag: "absentEverywhere", cell: 6 },
    declaration: 3,
  },
  pastMutation: {
    _tag: "updateInPlace",
    target: 8,
    payload: [{ _tag: "literal", value: 43 }],
  },
  offWritDeclare: {
    _tag: "declare",
    kind: "schema",
    payload: [{ _tag: "digestRef", kind: "schema", id: 9 }],
    writ: 4,
  },
  functionDeclare: {
    _tag: "declare",
    kind: "schema",
    payload: [{ _tag: "functionValue", code: 555 }],
    writ: 4,
  },
  anchoredResolve: { _tag: "resolveDigest", kind: "schema", target: 8, anchor: 4 },
  holeyEmit: { _tag: "emit", lane: 1, body: [{ _tag: "hole", name: 0 }] },
  lawfulDeclare: {
    _tag: "declare",
    kind: "schema",
    payload: [{ _tag: "digestRef", kind: "schema", id: 8 }, { _tag: "literal", value: 5 }],
    writ: 4,
  },
}

/**
 * A door that refuses everything with one reason. The control the harness
 * needs: a replay that cannot fail is not evidence, so the suite proves this
 * mutant is caught before it believes the shipped door's pass.
 */
export const refuseEverythingDoor: KernelDoor = {
  admit: () => ({ verdict: "refused", reason: "clock-read" }),
}
