/**
 * The door-conformance harness: replay the model's emitted verdicts against a
 * runtime door, one vector at a time, and report each agreement or divergence.
 *
 * The harness is target-agnostic on purpose. It takes the door and candidate
 * table as parameters, so host routes and negative controls cross the same
 * wall as the shipping door.
 *
 * The corpus and door both carry arbitrary-precision integers. There is no
 * number conversion and therefore no precision-losing identity bridge hidden
 * in the replay.
 *
 * Agreement is agreement, not proof. A green replay says the runtime returns
 * the model's verdict on the model's committed candidates; it promotes no
 * model theorem into a runtime guarantee.
 */
import { resolve } from "node:path"

import { CORPUS_PATH, loadKernelCorpus, type KernelCorpus } from "../scripts/kernel-corpus.js"
import {
  decodeAct,
  encodeAct,
  type KernelCandidateAct,
  type KernelDoor,
  type KernelVerdict,
} from "../src/kernel/KernelDoor.js"

const repository = resolve(import.meta.dir, "../../..")

/** The corpus path the committed tables and this harness both read. */
export const corpusPath = resolve(repository, CORPUS_PATH)

/** Loads and validates the format-2 corpus the tables were generated from. */
export const loadKernelArtifact = async (): Promise<KernelCorpus> => loadKernelCorpus(repository)

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

const render = (verdict: KernelVerdict): string =>
  verdict.verdict === "admitted"
    ? `admitted:[${verdict.encoded.join(",")}]`
    : `refused:${verdict.reason}`

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
      ? `admitted:[${admission.encoded.join(",")}]`
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
    const vector = encoding.act.join(",")
    const decoded = decodeAct(encoding.act)
    const roundTrip = decoded === undefined ? "undecodable" : encodeAct(decoded).join(",")
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
