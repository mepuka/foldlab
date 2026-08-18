import { Effect } from "effect"

import { declareChaosCounter } from "../ChaosFixture.js"

/**
 * Declared once and handed out as a promise rather than awaited at the top of
 * this module. A top-level await leaves the exported bindings in the temporal
 * dead zone until module evaluation settles, and bun's isolated test workers
 * start running the importing file before that happens — `lane` then reads as
 * "cannot access before initialization" instead of as a declared lane. The CLI
 * already awaits whatever `fold` a chaos module exports (`loadFold`), so a
 * promise is the same contract from its side.
 */
const declared = Effect.runPromise(declareChaosCounter("cli-chaos-counter"))

export const fold = declared.then((declaration) => declaration.fold)
export const lane = declared.then((declaration) => declaration.lane)
