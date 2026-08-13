/**
 * Drives the "Two folds" clip with REAL heads and state digests.
 *
 * One event stream is consumed twice: by the identity fold (`extend`, the hash
 * chain) and by the meaning fold (`kvStep`, the walled last-write-wins state).
 * One payload in the middle is outside the walled domain, so `kvStep` returns
 * `undefined` and the meaning lane forgives it as a no-op while the chain still
 * commits to its exact bytes.
 *
 *   bun docs/media/folding/scripts/two-folds.ts
 */

import { mkdirSync, writeFileSync } from "node:fs"
import { dirname, join } from "node:path"
import { fileURLToPath } from "node:url"

import {
  emptyKV,
  event,
  extend,
  kvStep,
  stateDigest,
  streamSeed,
  type KVState,
  type StreamEvent,
} from "@foldlab/core/stream"

const here = dirname(fileURLToPath(import.meta.url))

const payloads = ["status=new", "qty=2", "status=paid", "shipped", "region=eu"]
const history: ReadonlyArray<StreamEvent> = payloads.map((p, i) => event("orders", i, p))

let head = streamSeed("orders")
let state: KVState = emptyKV
const frames: Array<{
  seq: number
  payload: string
  head: string
  admitted: boolean
  stateDigest: string
  entries: Array<[string, string]>
  count: number
}> = []

for (const e of history) {
  head = extend(head, e)
  const next = kvStep(state, e)
  const admitted = next !== undefined
  state = next ?? state
  frames.push({
    seq: e.seq,
    payload: new TextDecoder().decode(e.payload),
    head,
    admitted,
    stateDigest: stateDigest(state),
    entries: [...state.entries],
    count: state.count,
  })
}

const out = {
  _provenance: "bun docs/media/folding/scripts/two-folds.ts",
  seed: streamSeed("orders"),
  emptyStateDigest: stateDigest(emptyKV),
  frames,
  finalHead: head,
  finalStateDigest: stateDigest(state),
  eventsCommitted: frames.length,
  eventsAdmittedToMeaning: frames.filter((f) => f.admitted).length,
}

mkdirSync(join(here, "..", "data"), { recursive: true })
writeFileSync(join(here, "..", "data", "two-folds.json"), `${JSON.stringify(out, null, 2)}\n`)
console.log(JSON.stringify(out, null, 2))
