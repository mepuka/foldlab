/**
 * The transcription gate for the connection status vocabulary.
 *
 * Runs the five clauses next door against the bytes this package holds: the
 * pinned client's own declaration, the transcribed table, the machine built
 * over it, and the one consumer that walks it. Bare, with the exit code the
 * battery reads.
 *
 * `--self-test` is the gate's own negative control and it plants five
 * mutations, one per clause: a row renamed away from the vendor's name, a
 * reading promoted to a state, an event left unplaced, a hand-written state
 * standing beside the table, and a consumer that branches on the lame-duck row
 * instead of merely emitting it. Each must refuse, and each must refuse on ITS
 * clause — a control that reddens for the wrong reason proves the wrong thing.
 *
 * @module
 */
import { resolve } from "node:path"

import type {
  StatusEventRow,
  TransitionRow,
} from "../src/internal/statusvocabulary.js"
import {
  checkVocabulary,
  readEvidence,
  type VocabularyEvidence,
} from "./status-vocabulary.js"

const packageRoot = resolve(import.meta.dir, "..")

const fail: (reason: string) => never = (reason) => {
  console.error(`STATUS VOCABULARY: FAIL — ${reason}`)
  return process.exit(1)
}

const evidence = await readEvidence(packageRoot)
const checked = checkVocabulary(evidence)
if (!checked.ok) fail(checked.reason)

if (process.argv.includes("--self-test")) {
  const rows = evidence.transcribed
  const machine = evidence.machine

  /** The row this control needs, found by its placement rather than by position. */
  const firstOf = (placement: StatusEventRow["placement"]): StatusEventRow => {
    const found = rows.find((row) => row.placement === placement)
    if (found === undefined) fail(`self-test found no ${placement} row to mutate`)
    return found
  }
  const reading = firstOf("observation")
  const moving = firstOf("transition")

  const plants: ReadonlyArray<{
    readonly plant: string
    readonly expect: string
    readonly evidence: VocabularyEvidence
  }> = [
    {
      plant: "a row renamed away from the vendor's own name",
      expect: "at the pin",
      evidence: {
        ...evidence,
        transcribed: rows.map((row) =>
          row === moving ? { ...row, type: `${row.type}-renamed` } : row
        ),
      },
    },
    {
      plant: "a reading within a state promoted to a state",
      expect: "models it as a state",
      evidence: {
        ...evidence,
        machine: [
          ...machine,
          {
            event: reading.type,
            state: reading.type,
            from: [null],
            mintsSuccessor: false,
            emits: "transition",
            absorbing: false,
          } satisfies TransitionRow,
        ],
      },
    },
    {
      plant: "an event placed in neither set",
      expect: "the machine carries no row for it",
      evidence: {
        ...evidence,
        machine: machine.filter((row) => row.event !== moving.type),
      },
    },
    {
      plant: "a hand-written state standing beside the transcribed table",
      expect: "that no transcribed transition enters",
      evidence: {
        ...evidence,
        machine: machine.map((row) =>
          row.event === moving.type ? { ...row, state: "connected" } : row
        ),
      },
    },
    {
      plant: "a consumer that reacts to one named event instead of walking the rows",
      expect: "it must walk the transcribed rows",
      evidence: {
        ...evidence,
        pumpSource: `${evidence.pumpSource}\nconst react = (t: string) => t === "ldm"\n`,
      },
    },
  ]

  for (const arm of plants) {
    const result = checkVocabulary(arm.evidence)
    if (result.ok) fail(`self-test: ${arm.plant} was admitted`)
    if (!result.reason.includes(arm.expect)) {
      fail(`self-test: ${arm.plant} refused for the wrong reason — ${result.reason}`)
    }
    console.log(`STATUS VOCABULARY: control refuted — ${arm.plant}`)
  }
  console.log(`STATUS VOCABULARY: SELF-TEST PASS (${plants.length} controls refuted)`)
}

console.log(
  `STATUS VOCABULARY: PASS (${evidence.transcribed.length} rows transcribed from ${evidence.vendor.rows.length} pinned declarations, ${evidence.machine.length} placed as transitions)`,
)
