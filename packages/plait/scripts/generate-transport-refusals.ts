import { resolve } from "node:path"

import { generateTransportRefusals } from "./transport-refusals.js"

const target = resolve(import.meta.dir, "../fixtures/transport-refusals.ndjson")
await Bun.write(target, generateTransportRefusals())
