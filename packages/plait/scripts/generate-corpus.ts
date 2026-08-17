import { resolve } from "node:path"

import { generateCorpus } from "./corpus.js"

const target = resolve(import.meta.dir, "../fixtures/envelopes.ndjson")
await Bun.write(target, generateCorpus())
