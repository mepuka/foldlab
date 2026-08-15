import { ProtoClient } from "./client.ts"
import type { Json } from "./jcs.ts"

export const taskAcceptanceTypeStructures: Readonly<Record<string, Json>> = {
  spec: {
    k: "struct",
    fields: { title: { k: "string" }, body_digest: { k: "string" } },
    optional: [],
  },
  authorization: {
    k: "struct",
    fields: { granted: { k: "bool" }, note: { k: "string" } },
    optional: ["note"],
  },
  build_report: {
    k: "struct",
    fields: { commit: { k: "string" }, gates: { k: "string" }, notes: { k: "string" } },
    optional: ["notes"],
  },
  review: {
    k: "struct",
    fields: {
      findings: {
        k: "list",
        of: {
          k: "struct",
          fields: { title: { k: "string" }, severity: { k: "string" }, note: { k: "string" } },
          optional: [],
        },
      },
    },
    optional: [],
  },
  decision: {
    k: "struct",
    fields: {
      verdict: {
        k: "union",
        of: [
          { k: "literal", value: "accept" },
          { k: "literal", value: "revise" },
          { k: "literal", value: "reject" },
        ],
      },
      note: { k: "string" },
    },
    optional: ["note"],
  },
}

export interface TaskAcceptanceBootstrap {
  readonly protocol: string
  readonly types: Readonly<Record<string, string>>
}

/** Create the five task-acceptance hole types first, then catalog the
 * flb.protocol.v0 record that refers to their daemon-derived identities. */
export const bootstrapTaskAcceptance = async (
  client: ProtoClient,
  submitter = "bootstrap",
): Promise<TaskAcceptanceBootstrap> => {
  const digests: Record<string, string> = {}
  for (const [name, structure] of Object.entries(taskAcceptanceTypeStructures)) {
    const reply = await client.createType(structure, { submitter })
    if (!reply.ok) throw new Error(`create task.${name}.v0: ${JSON.stringify(reply.refusal)}`)
    digests[name] = reply.fact.digest
  }
  const typeDigest = (name: string): string => {
    const digest = digests[name]
    if (digest === undefined) throw new Error(`bootstrap omitted task.${name}.v0`)
    return digest
  }
  const protocol: Json = {
    scheme: "flb.protocol.v0",
    name: "task-acceptance",
    seats: ["operator", "coordinator", "builder"],
    holes: [
      { name: "spec", type: typeDigest("spec"), seats: ["coordinator"] },
      { name: "authorization", type: typeDigest("authorization"), seats: ["operator"] },
      { name: "build_report", type: typeDigest("build_report"), seats: ["builder"] },
      { name: "review", type: typeDigest("review"), seats: ["coordinator"] },
      {
        name: "decision",
        type: typeDigest("decision"),
        seats: ["coordinator", "operator"],
        fence: { rule: "seat-authority", order: ["operator", "coordinator"] },
      },
    ],
    identity: "trusted-principals",
    liveness: ["builder", "coordinator", "operator"],
  }
  const created = await client.createProtocol(protocol, { submitter })
  if (!created.ok) throw new Error(`create flb.protocol.v0: ${JSON.stringify(created.refusal)}`)
  return { protocol: created.fact.digest, types: digests }
}
