/**
 * Generates the schema-identity wall fixture, ONCE (the streamfix
 * tradition): structural digests over the battery, frozen.
 *
 *   bun packages/core/test/schemafix.ts > fixtures/schema-wall.json
 */

import { Effect } from "effect"
import { structuralDigest } from "../src/mint.ts"
import { battery } from "./schemaBattery.ts"

const digests: Record<string, string> = {}
for (const [name, schema] of Object.entries(battery)) {
  digests[name] = await Effect.runPromise(structuralDigest(schema))
}

console.log(
  JSON.stringify(
    {
      _provenance:
        "generated once by packages/core/test/schemafix.ts against " +
        "effect@4.0.0-beta.107; frozen. Regeneration requires a stated reason.",
      ...digests,
    },
    null,
    2,
  ),
)
