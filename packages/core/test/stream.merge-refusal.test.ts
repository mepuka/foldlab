import { describe, expect, test } from "bun:test"
import { readFileSync } from "node:fs"
import { join } from "node:path"
import { Effect } from "effect"
import {
  applyMerge,
  event,
  MergeDuplicateSequence,
  type MergeFact,
  type StreamEvent,
} from "../src/stream.ts"

interface MergeRefusalVector {
  readonly source: string
  readonly events: ReadonlyArray<{ readonly seq: number; readonly payload: string }>
  readonly picks: MergeFact["picks"]
  readonly duplicateSeq: number
  readonly firstIndex: number
  readonly duplicateIndex: number
}

const vector = JSON.parse(
  readFileSync(join(import.meta.dir, "../../../go/stream/testdata/m1-duplicate-seq.json"), "utf8"),
) as MergeRefusalVector

describe("the shared merge-refusal wall", () => {
  test("M1: a source carrying a duplicate sequence is refused before replay", () => {
    const events: ReadonlyArray<StreamEvent> = vector.events.map(({ seq, payload }) =>
      event(vector.source, seq, payload))
    const refusal = Effect.runSync(Effect.flip(applyMerge(
      { picks: vector.picks },
      new Map([[vector.source, events]]),
    )))

    expect(refusal).toBeInstanceOf(MergeDuplicateSequence)
    if (!(refusal instanceof MergeDuplicateSequence)) throw refusal
    expect(refusal.source).toBe(vector.source)
    expect(refusal.seq).toBe(vector.duplicateSeq)
    expect(refusal.firstIndex).toBe(vector.firstIndex)
    expect(refusal.duplicateIndex).toBe(vector.duplicateIndex)
  })
})
