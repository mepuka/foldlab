import { Effect } from "effect"

import type { CommutativeAlgebra } from "../../src/Algebra.js"
import { declare } from "../../src/Fold.js"
import { fold as declared, lane } from "./chaos-fold.js"

const betweenArmsBias = process.argv[2] === "__pump" ? 2 : 1

/** Negative control: declared contribution behavior moves between the two arms. */
export const fold = await Effect.runPromise(declare({
  lane,
  algebra: declared.algebra as CommutativeAlgebra<number>,
  contribution: {
    declaration: declared.contribution.declaration,
    apply: (event) => declared.contribution.apply(event) + betweenArmsBias,
  },
}))

export { lane }
