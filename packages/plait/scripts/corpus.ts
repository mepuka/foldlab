import { Effect } from "effect"

import { decodeEnvelope, type Envelope } from "../src/kernel/Wire.js"

/** One model-independent digest wall input and its TypeScript verdict. */
export interface CorpusRow {
  readonly case: string
  readonly digest: string
  readonly envelope: Envelope
}

/** The result of comparing corpus bytes with a fresh TypeScript emission. */
export type CorpusCheck =
  | { readonly ok: true }
  | { readonly ok: false; readonly reason: string }

const utf8 = new TextEncoder()
const digestA = "015abd7f5cc57a2dd94b7590f04ad8084273905ee33ec5cebeae62276a97f862"
const digestB = "bb4f3e5e257ca09b067986bbcb6fa72f9b868eea9d4dff92afd94e2876aa795a"

const sourceRows: ReadonlyArray<readonly [string, unknown]> = [
  ["emit-inline-unicode", {
    v: 0,
    kind: "emit",
    lane: digestA,
    key: "entity-1",
    holder: "seat-alpha",
    body: { terms: { "β": 2, a: 1 }, note: "café" },
    pins: [],
  }],
  ["attest-with-certificate", {
    v: 0,
    kind: "attest",
    lane: digestB,
    key: ["corpus", 2],
    holder: "connection:user/7",
    body: [null, true, 1.5],
    cert: {
      schema: digestA,
      program: digestB,
      inputAnchor: digestA,
      spanHead: digestB,
    },
    pins: [digestA, digestB],
  }],
  ["checkpoint-blob-reference", {
    v: 0,
    kind: "checkpoint",
    lane: digestA,
    key: { entity: "entity-1", partition: 0 },
    holder: "checkpoint-writer",
    body: { blob: digestB },
    pins: [digestB],
  }],
  ["sealed-observation", {
    v: 0,
    kind: "sealed",
    lane: digestB,
    key: 17,
    holder: "venue-a",
    body: { accepted: true, score: 0 },
    pins: [],
  }],
]

const rows = (): ReadonlyArray<CorpusRow> => sourceRows.map(([name, envelope]) => {
  const decoded = Effect.runSync(decodeEnvelope(utf8.encode(JSON.stringify(envelope))))
  return {
    case: name,
    digest: decoded.digest,
    envelope: decoded.envelope,
  }
})

/** Emits the deterministic NDJSON corpus, including its provenance line. */
export const generateCorpus = (): string => [
  JSON.stringify({ provenance: "bun run generate:corpus" }),
  ...rows().map((row) => JSON.stringify(row)),
  "",
].join("\n")

/** Checks that committed corpus bytes equal a fresh TypeScript emission. */
export const checkCorpus = (committed: string): CorpusCheck =>
  committed === generateCorpus()
    ? { ok: true }
    : {
      ok: false,
      reason: "committed corpus failed byte-identical regeneration",
    }
