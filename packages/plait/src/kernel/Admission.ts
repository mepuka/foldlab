/**
 * Plane: kernel — the language: corpus, door, programs, and wire grammar.
 *
 * THE one admission seam, as a shared Effect service. Every host that judges
 * a candidate — the CLI, the fabric client, the daemon — re-exports the exact
 * module-level `admit` accessor, which takes this service from the Effect
 * environment; a private validator anywhere else is a second door and a drift
 * surface. The implementation behind the seam is the shipped door
 * (`Door.ts`), the same artifact the conformance harness replays the Lean
 * model's admission vectors against, so what the fleet calls is what the
 * model checked.
 *
 * Refusal parity rides the seam through the one refusal family: a failed
 * admission is a `StructuralRefusal` of kind `kernel-admission` whose taught
 * content — the model's reason, the law it defends, the repair it teaches,
 * and the repair's machine-applicability — is looked up from the generated
 * table, never restated here. The reason travels as `next[0].subject`, the
 * repair as `next[0].note`, the applicability in `next[0].body`; the refused
 * candidate itself rides `got` so a repair loop can pin what it answers.
 *
 * @module
 */
import { Context, Effect, Layer } from "effect"

import { structuralRefusal, type Refusal, type RefusalFields } from "../truth/Refusal.js"
import { decodeAct, makeKernelDoor, type KernelAct } from "./Door.js"
import type { KernelCandidateAct, KernelDoor, KernelDoorContext } from "./KernelDoor.js"
import { KERNEL_REFUSALS, type KernelRefusalReason } from "./KernelTables.generated.js"

/** One admitted sentence: its canonical encoding and the intrinsic act it names. */
export interface KernelSentence {
  readonly encoded: ReadonlyArray<number>
  readonly act: KernelAct
}

const taughtByReason = new Map(KERNEL_REFUSALS.map((row) => [row.reason, row]))

const taughtRefusal = (
  reason: KernelRefusalReason,
  candidate: KernelCandidateAct,
): Refusal => {
  const taught = taughtByReason.get(reason)
  return structuralRefusal({
    kind: "kernel-admission",
    law: taught?.law ?? reason,
    path: ["admit", candidate._tag],
    got: candidate as unknown as RefusalFields["got"],
    expected: "a lawful kernel sentence",
    next: [
      {
        subject: reason,
        note: taught?.repair ?? "",
        body: { applicability: taught?.applicability ?? "advisory" },
      },
    ],
  })
}

const serviceOver = (door: KernelDoor) => ({
  admit: (candidate: KernelCandidateAct): Effect.Effect<KernelSentence, Refusal> => {
    const verdict = door.admit(candidate)
    if (verdict.verdict === "refused") {
      return Effect.fail(taughtRefusal(verdict.reason, candidate))
    }
    const act = decodeAct(verdict.encoded)
    if (act === null) {
      // The shipped door only emits encodings produced by encodeAct, and the
      // conformance suite replays decode-of-encode identity; reaching this
      // branch means the door and the codec disagree — a defect, not a
      // refusal the language teaches.
      return Effect.die(
        new Error("admitted encoding failed to decode; door and codec disagree"),
      )
    }
    return Effect.succeed({ encoded: verdict.encoded, act })
  },
})

/** The service surface: candidate in, sentence or taught refusal out. */
export interface AdmissionService {
  readonly admit: (
    candidate: KernelCandidateAct,
  ) => Effect.Effect<KernelSentence, Refusal>
}

/**
 * The one admission seam.
 *
 * @example
 * ```ts
 * import { Effect } from "effect"
 * import { Admission } from "@foldlab/plait/Admission"
 *
 * const program = Effect.gen(function* () {
 *   const door = yield* Admission
 *   return yield* door.admit(candidate)
 * })
 * ```
 */
export class Admission extends Context.Service<Admission, AdmissionService>()(
  "@foldlab/plait/Admission",
) {
  /** The shipped door over one admission context. */
  static readonly layer = (context: KernelDoorContext): Layer.Layer<Admission> =>
    Layer.succeed(Admission, Admission.of(serviceOver(makeKernelDoor(context))))

  /** Any door through the production tag — the conformance harness's seam. */
  static readonly fromDoor = (door: KernelDoor): Layer.Layer<Admission> =>
    Layer.succeed(Admission, Admission.of(serviceOver(door)))
}

/**
 * Routes one candidate through the supplied {@link Admission} service.
 *
 * Hosts re-export this exact function instead of wrapping it. The service in
 * the Effect environment therefore remains the only replaceable boundary: a
 * fixture may supply a conformance target through {@link Admission.fromDoor},
 * but no CLI, carriage, or daemon fixture can replace judgment itself.
 */
export const admit = Effect.fn("Admission.admit")(function* (
  candidate: KernelCandidateAct,
): Effect.fn.Return<KernelSentence, Refusal, Admission> {
  const admission = yield* Admission
  return yield* admission.admit(candidate)
})
