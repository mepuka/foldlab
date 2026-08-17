/**
 * The cross-package plant for `packages/plait`'s public-surface walk.
 *
 * `packages/plait/DECISIONS.md` T7 splits the authority: the emitted-declaration
 * gate owns members authored in plait's own `src`, and the type-level walk is
 * load-bearing for members authored OUTSIDE it — a sibling workspace package's
 * member surfaced through plait's barrel. This module is that member's real
 * home, so the class has an executable witness instead of a described one:
 * plait's `PublicEffects.core-probe` control surfaces it through a planted
 * barrel and the type-level walk must redden on its non-Refusal error.
 *
 * It lives outside `src` on purpose. Core's exports map is `./*` → `./src/*.ts`,
 * so nothing here enters this package's public surface; the only reader is
 * plait's control project, which compiles this file on every battery run.
 *
 * One value export, deliberately: the plant is the member, and a second export
 * would put a second path in the control's committed refusal trace.
 */

import { Effect } from "effect"

/** A deliberately non-Refusal error, minted in this package, not in plait's. */
export interface CoreProbeError {
  readonly _tag: "CoreProbeError"
  readonly reason: string
}

/** A fallible member whose declaration is authored here, one package over. */
export const load = (token: string): Effect.Effect<string, CoreProbeError> =>
  token === ""
    ? Effect.fail({ _tag: "CoreProbeError", reason: "empty work token" } as const)
    : Effect.succeed(token)
