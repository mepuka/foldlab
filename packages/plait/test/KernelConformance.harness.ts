/**
 * The door-conformance harness: replay the model's emitted verdicts against a
 * runtime door, one vector at a time, and report each agreement or divergence.
 *
 * The harness is target-agnostic on purpose. It takes the door as a parameter
 * and the candidate table as a parameter, so the day a real admission door
 * ships in this package it is checked by the same replay that checks the
 * reference one, with nothing about the harness edited.
 *
 * One seam is worth naming. The corpus carries every integer at arbitrary
 * precision, because an encoded sentence multiplies by about a million per
 * argument and leaves the range a JavaScript number holds exactly. The door
 * under test speaks `number`. So the crossing is written out, and it refuses
 * rather than rounds: the day a vector exceeds the safe range, the replay says
 * so at that vector instead of quietly comparing two rounded values and
 * agreeing.
 *
 * Agreement is agreement, not proof. A green replay says the runtime returns
 * the model's verdict on the model's committed candidates; it promotes no
 * model theorem into a runtime guarantee.
 */
import { resolve } from "node:path"

import { CORPUS_PATH, loadKernelCorpus, type KernelCorpus } from "../scripts/kernel-corpus.js"
import type { KernelCandidateAct, KernelDoor } from "../src/kernel/KernelDoor.js"
import { decodeAct, encodeAct } from "./KernelDoor.reference.js"

const repository = resolve(import.meta.dir, "../../..")

/** The corpus path the committed tables and this harness both read. */
export const corpusPath = resolve(repository, CORPUS_PATH)

/** Loads and validates the format-2 corpus the tables were generated from. */
export const loadKernelArtifact = async (): Promise<KernelCorpus> => loadKernelCorpus(repository)

/**
 * The corpus's unbounded integers, as the numbers the door speaks. Refuses
 * above the safe range rather than rounding: two rounded values that agree
 * agree about nothing.
 */
export const toNumbers = (
  values: ReadonlyArray<bigint>,
  where: string,
): ReadonlyArray<number> =>
  values.map((value) => {
    if (value > BigInt(Number.MAX_SAFE_INTEGER)) {
      throw new Error(`${where}: ${value} is past what a number holds exactly`)
    }
    return Number(value)
  })

/** One replayed admission: what the model emitted, what the door answered. */
export interface AdmissionReplay {
  readonly name: string
  readonly expected: string
  readonly actual: string
  readonly agreed: boolean
}

/** One replayed encoding vector and its round-trip verdict. */
export interface EncodingReplay {
  readonly name: string
  readonly vector: string
  readonly roundTrip: string
  readonly agreed: boolean
}

const render = (verdict: {
  readonly verdict: string
  readonly reason?: string
  readonly encoded?: ReadonlyArray<number>
}): string =>
  verdict.verdict === "admitted"
    ? `admitted:[${(verdict.encoded ?? []).join(",")}]`
    : `refused:${verdict.reason ?? ""}`

/**
 * Replays every emitted admission verdict against one door. A candidate the
 * table cannot supply is a divergence, never a skip: the emitted records name
 * a candidate without carrying its structure, so a missing row would otherwise
 * turn a hole in the corpus into a silent pass.
 */
export const replayAdmissions = (
  door: KernelDoor,
  corpus: KernelCorpus,
  candidates: { readonly [name: string]: KernelCandidateAct },
): ReadonlyArray<AdmissionReplay> =>
  corpus.admissions.map((admission) => {
    const expected = admission.verdict === "admitted"
      ? `admitted:[${toNumbers(admission.encoded, admission.name).join(",")}]`
      : `refused:${admission.reason}`
    const candidate = candidates[admission.name]
    if (candidate === undefined) {
      return { name: admission.name, expected, actual: "no-candidate-in-table", agreed: false }
    }
    const actual = render(door.admit(candidate))
    return { name: admission.name, expected, actual, agreed: actual === expected }
  })

/**
 * Replays every emitted encoding vector through decode-then-encode. The model
 * emitter checks the same round trip before it writes a vector; the runtime
 * checking it again is what makes the encoding a shared name rather than two
 * coincidences.
 */
export const replayEncodings = (
  corpus: KernelCorpus,
): ReadonlyArray<EncodingReplay> =>
  corpus.encodings.map((encoding) => {
    const act = toNumbers(encoding.act, encoding.name)
    const vector = act.join(",")
    const decoded = decodeAct(act)
    const roundTrip = decoded === null ? "undecodable" : encodeAct(decoded).join(",")
    return { name: encoding.name, vector, roundTrip, agreed: roundTrip === vector }
  })

/** The divergences of a replay, rendered one per line for a failure message. */
export const divergences = (
  replays: ReadonlyArray<AdmissionReplay | EncodingReplay>,
): string =>
  replays
    .filter((replay) => !replay.agreed)
    .map((replay) =>
      "expected" in replay
        ? `  ${replay.name}: model ${replay.expected}, door ${replay.actual}`
        : `  ${replay.name}: vector ${replay.vector}, round trip ${replay.roundTrip}`
    )
    .join("\n")
