import type { BatteryTask } from "./Scoring.ts"

const digest = (hex: string): string => `sha256:${hex.repeat(64)}`

export const CandidateDigests = {
  schema: digest("a"),
  program: digest("b"),
  policy: digest("c"),
  writ: digest("d"),
  lane: digest("e"),
  cell: digest("f"),
  reduction: digest("1"),
  register: digest("2"),
  requested_writ: digest("3"),
} as const

export const PlantedDigestValues: readonly string[] = Object.values(CandidateDigests)

export const Battery: readonly BatteryTask[] = [
  {
    id: "declare-schema",
    instruction:
      'Declare canonical schema value {"minLength":1,"type":"string"} under the available writ authority.',
    tool: "kernel_declare",
    arguments: {
      kind: "schema",
      value: '{"minLength":1,"type":"string"}',
      writ_digest: CandidateDigests.writ,
    },
  },
  {
    id: "resolve-program",
    instruction: "Resolve the planted program declaration.",
    tool: "kernel_resolve",
    arguments: {
      kind: "program",
      digest: CandidateDigests.program,
    },
  },
  {
    id: "emit-to-lane",
    instruction:
      'Emit canonical body {"count":3,"event":"schema-cataloged"} to the planted lane.',
    tool: "kernel_emit",
    arguments: {
      lane_digest: CandidateDigests.lane,
      body: '{"count":3,"event":"schema-cataloged"}',
    },
  },
  {
    id: "join-cell-contribution",
    instruction:
      'Join canonical contribution {"member":"alpha","weight":5} into the planted cell.',
    tool: "kernel_join",
    arguments: {
      cell_digest: CandidateDigests.cell,
      contribution: '{"member":"alpha","weight":5}',
    },
  },
  {
    id: "fold-at-anchor",
    instruction:
      'Read the planted reduction over the planted lane at shard 17, anchor floor 23, anchor state "state-at-floor-23", anchor head 29, with query {"limit":5,"view":"recent"}.',
    tool: "kernel_fold",
    arguments: {
      reduction_digest: CandidateDigests.reduction,
      lane_digest: CandidateDigests.lane,
      shard: 17,
      anchor_floor: 23,
      anchor_state: "state-at-floor-23",
      anchor_head: 29,
      query: '{"limit":5,"view":"recent"}',
    },
  },
  {
    id: "decide-register",
    instruction:
      'Decide the planted register at fencing token 31 with canonical outcome {"status":"landed"}.',
    tool: "kernel_decide",
    arguments: {
      register_digest: CandidateDigests.register,
      token_fence: 31,
      outcome: '{"status":"landed"}',
    },
  },
  {
    id: "trigger-head-position",
    instruction:
      "Trigger the planted declaration when shard 37 of the planted lane advances past position 41.",
    tool: "kernel_trigger",
    arguments: {
      production: "head-advanced-past",
      declaration_digest: CandidateDigests.program,
      lane_digest: CandidateDigests.lane,
      shard: 37,
      position: 41,
    },
  },
  {
    id: "spawn-child-writ",
    instruction:
      "Spawn the requested child writ beneath the planted parent writ.",
    tool: "kernel_spawn",
    arguments: {
      parent_writ_digest: CandidateDigests.writ,
      request_writ_digest: CandidateDigests.requested_writ,
    },
  },
]
