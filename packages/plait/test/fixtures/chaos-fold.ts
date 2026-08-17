import { Effect } from "effect"

import { declareChaosCounter } from "../ChaosFixture.js"

const declared = await Effect.runPromise(declareChaosCounter("cli-chaos-counter"))

export const fold = declared.fold
export const lane = declared.lane
