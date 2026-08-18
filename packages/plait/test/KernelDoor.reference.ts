/**
 * The conformance harness's join table: planted candidates named by the
 * emitted admission records, plus the mutant door the replay must catch.
 *
 * The door itself does not live here. `src/kernel/Door.ts` is the shipping
 * target, and every value below is written in the model-generated bigint
 * candidate language exported by `KernelDoor.ts`.
 */
import type {
  KernelCandidateAct,
  KernelDoor,
  KernelDoorContext,
} from "../src/kernel/KernelDoor.js"
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

/** The harness's historical name for the builder, now the shipping door. */
export const referenceDoor = makeKernelDoor

/** The admission context of `Kernel.Planted.door`. */
export const PLANTED_CONTEXT: KernelDoorContext = {
  catalog: [
    { kind: "schema", id: 8n },
    { kind: "schema", id: 9n },
    { kind: "program", id: 3n },
    { kind: "policy", id: 4n },
    { kind: "policy", id: 5n },
    { kind: "lane", id: 1n },
    { kind: "index", id: 2n },
    { kind: "resource", id: 6n },
    { kind: "algebra", id: 7n },
  ],
  pinned: [
    { kind: "schema", id: 8n },
    { kind: "program", id: 3n },
    { kind: "policy", id: 4n },
    { kind: "lane", id: 1n },
  ],
}

const groundAnchor = {
  foldId: 2n,
  lane: 1n,
  shard: 0n,
  floor: 4n,
  state: 11n,
  head: 6n,
} as const

/** One generated-language candidate for every emitted admission name. */
export const PLANTED_CANDIDATES: {
  readonly [name: string]: KernelCandidateAct
} = {
  clockFold: {
    _tag: "fold",
    declared: 2n,
    anchor: groundAnchor,
    query: [{ _tag: "clockNow" }],
  },
  absenceTrigger: {
    _tag: "trigger",
    predicate: { _tag: "onAbsence", subject: 6n },
    declaration: 3n,
  },
  unfencedDecide: {
    _tag: "decide",
    register: 3n,
    token: undefined,
    outcome: [{ _tag: "literal", value: 42n }],
  },
  lastWriterJoin: {
    _tag: "join",
    cell: 6n,
    contribution: [{ _tag: "literal", value: 42n }],
    strategy: { _tag: "lastWriterWins" },
  },
  trustingRead: {
    _tag: "trustBytes",
    kind: "schema",
    target: 8n,
    asserted: 999n,
  },
  crossRegisterDecide: {
    _tag: "decide",
    register: 3n,
    token: { register: 99n, value: 7n },
    outcome: [{ _tag: "literal", value: 42n }],
  },
  mintedDeclare: {
    _tag: "declare",
    kind: "schema",
    payload: [{ _tag: "mintedId", token: 12345n }],
    writ: 4n,
  },
  latestRead: { _tag: "readLatest", subject: 6n },
  forwardDeclare: {
    _tag: "declare",
    kind: "schema",
    payload: [{ _tag: "digestRef", kind: "schema", id: 77n }],
    writ: 4n,
  },
  secretEmit: {
    _tag: "emit",
    lane: 1n,
    body: [{ _tag: "secretBytes", bytes: 31337n }],
  },
  absenceClaimTrigger: {
    _tag: "trigger",
    predicate: { _tag: "absentEverywhere", cell: 6n },
    declaration: 3n,
  },
  pastMutation: {
    _tag: "updateInPlace",
    target: 8n,
    payload: [{ _tag: "literal", value: 43n }],
  },
  offWritDeclare: {
    _tag: "declare",
    kind: "schema",
    payload: [{ _tag: "digestRef", kind: "schema", id: 9n }],
    writ: 4n,
  },
  functionDeclare: {
    _tag: "declare",
    kind: "schema",
    payload: [{ _tag: "functionValue", code: 555n }],
    writ: 4n,
  },
  anchoredResolve: {
    _tag: "resolveDigest",
    kind: "schema",
    target: 8n,
    anchor: 4n,
  },
  holeyEmit: {
    _tag: "emit",
    lane: 1n,
    body: [{ _tag: "hole", name: 0n }],
  },
  lawfulDeclare: {
    _tag: "declare",
    kind: "schema",
    payload: [
      { _tag: "digestRef", kind: "schema", id: 8n },
      { _tag: "literal", value: 5n },
    ],
    writ: 4n,
  },
}

/** The falsification control: a replay must catch this divergent door. */
export const refuseEverythingDoor: KernelDoor = {
  admit: () => ({ verdict: "refused", reason: "clock-read" }),
}
