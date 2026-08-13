import { algebras, steps } from "../src/algebra.ts"
import { defineFold } from "../src/fold.ts"
import { event, type StreamEvent } from "../src/stream.ts"

const alpha = [
  event("alpha", 1, "a=1"),
  event("alpha", 2, "b=2"),
  event("alpha", 3, "a=3"),
] as const
const beta = [event("beta", 1, "c=4"), event("beta", 2, "a=5")] as const

export const foldFixtureEvents: ReadonlyArray<StreamEvent> = [
  alpha[0],
  beta[0],
  alpha[1],
  beta[1],
  alpha[2],
]

export const primitiveFolds = {
  sum: defineFold(algebras.sum, steps.payloadLength),
  count: defineFold(algebras.count, steps.constOne),
  max: defineFold(algebras.max, steps.sequenceNumber),
  min: defineFold(algebras.min, steps.sequenceNumber),
  any: defineFold(algebras.any, steps.payloadNonEmpty),
  all: defineFold(algebras.all, steps.payloadNonEmpty),
  setUnion: defineFold(algebras.setUnion, steps.streamSet),
} as const
