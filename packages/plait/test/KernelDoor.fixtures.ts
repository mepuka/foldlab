/**
 * Test material for the shipping admission door.
 *
 * The names and expected verdicts come from the generated corpus. These
 * candidate values spell the model's planted definitions in the generated
 * runtime candidate type; they carry model identity labels as `bigint` and do
 * not manufacture identities from runtime digests.
 */
import type {
  KernelCandidateAct,
  KernelDoor,
  KernelDoorContext,
} from "../src/kernel/KernelDoor.js"
import { KERNEL_REFUSAL_BY_REASON } from "../src/kernel/KernelTables.generated.js"

/**
 * The ground context of `Kernel.Planted.door`. The pinned universe omits one
 * admitted schema so an off-writ referent can resolve and still be refused.
 */
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

/** The planted candidates, keyed by the names in emitted admission records. */
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
    strategy: { _tag: "lastWriterWins", algebra: 7n },
  },
  trustingRead: { _tag: "trustBytes", kind: "schema", target: 8n, asserted: 999n },
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
    kind: "schema",
    target: 8n,
    payload: [{ _tag: "literal", value: 43n }],
    writ: 4n,
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
  // A lawful trigger production carrying a stage rank the closed table cannot
  // read. There are five stages, so rank 5 decodes to nothing and the door owes
  // the absence-trigger row.
  staleStageTrigger: {
    _tag: "trigger",
    predicate: { _tag: "holeReaches", hole: 0n, stage: 5n },
    declaration: 3n,
  },
  // A lawful trigger with every referent it names already catalogued: the
  // declaration (program, 3) and the predicate's lane leaf (lane, 1). Both
  // other planted triggers refuse on their predicate, so this is the only row
  // whose admission reaches the trigger arm's referent check. It says nothing
  // about a predicate naming an UNCATALOGUED leaf - that reading is open.
  catalogedTrigger: {
    _tag: "trigger",
    predicate: { _tag: "evidenceAppears", lane: 1n, pattern: 17n },
    declaration: 3n,
  },
  // No entry for the aliasing pair. Those two rows are emitted into the
  // `model-admission` group marked `scope: "model-internal"`, so no host
  // replays them and this table - which exists only to feed the replay - has
  // nothing to say about them (operator grill ruling A8, DEV-772).
}

/** Negative control: the conformance replay must kill an all-refusing door. */
export const refuseEverythingDoor: KernelDoor = {
  admit: () => ({ verdict: "refused", ...KERNEL_REFUSAL_BY_REASON["clock-read"] }),
}
