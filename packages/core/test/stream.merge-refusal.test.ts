import { describe, expect, test } from "bun:test"
import { readFileSync } from "node:fs"
import { join } from "node:path"
import { Effect } from "effect"
import * as FastCheck from "fast-check"
import {
  applyMerge,
  event,
  MergeDuplicateSequence,
  type MergeFact,
  type StreamEvent,
} from "../src/stream.ts"

interface MergeRefusalVector {
  readonly sources: ReadonlyArray<{
    readonly source: string
    readonly events: ReadonlyArray<{ readonly seq: number; readonly payload: string }>
  }>
  readonly picks: MergeFact["picks"]
  readonly offenders: MergeDuplicateSequence["offenders"]
}

const vector = JSON.parse(
  readFileSync(join(import.meta.dir, "../../../go/stream/testdata/m1-duplicate-seq.json"), "utf8"),
) as MergeRefusalVector

describe("the shared merge-refusal wall", () => {
  test("M1: a source carrying a duplicate sequence is refused before replay", () => {
    const sources = new Map<string, ReadonlyArray<StreamEvent>>(vector.sources.map((source) => [
      source.source,
      source.events.map(({ seq, payload }) => event(source.source, seq, payload)),
    ]))
    const refusal = Effect.runSync(Effect.flip(applyMerge(
      { picks: vector.picks },
      sources,
    )))

    expect(refusal).toBeInstanceOf(MergeDuplicateSequence)
    if (!(refusal instanceof MergeDuplicateSequence)) throw refusal
    expect(refusal.offenders).toEqual(vector.offenders)
  })

  /** Issue #21 regression: discovery order cannot choose the refusal value. */
  test("all duplicate-bearing sources are listed independent of insertion order", () => {
    const alpha = [event("alpha", 1, "a=1"), event("alpha", 1, "a=2")]
    const beta = [event("beta", 1, "b=1"), event("beta", 1, "b=2")]
    const picks = [{ stream: "alpha", seq: 1 }]

    for (let run = 0; run < 50; run++) {
      const first = Effect.runSync(Effect.flip(applyMerge(
        { picks },
        new Map([["alpha", alpha], ["beta", beta]]),
      )))
      expect(first).toBeInstanceOf(MergeDuplicateSequence)
      expect((first as MergeDuplicateSequence).offenders).toEqual([
        { source: "alpha", seq: 1, indexes: [0, 1] },
        { source: "beta", seq: 1, indexes: [0, 1] },
      ])

      const second = Effect.runSync(Effect.flip(applyMerge(
        { picks },
        new Map([["beta", beta], ["alpha", alpha]]),
      )))
      expect((second as MergeDuplicateSequence).offenders).toEqual((first as MergeDuplicateSequence).offenders)
    }
  })

  test("M1 generated law: duplicate coordinates always refuse, unique sparse sources still replay", () => {
    const generatedCase = FastCheck.record({
      source: FastCheck.string({ minLength: 1, maxLength: 12 }),
      unique: FastCheck.uniqueArray(
        FastCheck.record({
          seqHalf: FastCheck.integer({ min: 0, max: 10_000 }),
          payload: FastCheck.string({ maxLength: 24 }),
        }),
        { minLength: 2, maxLength: 8, selector: ({ seqHalf }) => seqHalf },
      ),
      duplicateFrom: FastCheck.nat(),
      insertionAt: FastCheck.nat(),
      duplicatePayload: FastCheck.string({ maxLength: 24 }),
    }).map(({ source, unique, duplicateFrom, insertionAt, duplicatePayload }) => {
      const base = unique.map(({ seqHalf, payload }) => event(source, seqHalf * 2, payload))
      const originalIndex = duplicateFrom % base.length
      const insertionIndex = insertionAt % (base.length + 1)
      const duplicate = event(source, base[originalIndex]!.seq, duplicatePayload)
      const events = [...base]
      events.splice(insertionIndex, 0, duplicate)
      const shiftedOriginal = originalIndex + (insertionIndex <= originalIndex ? 1 : 0)
      return {
        source,
        base,
        events,
        seq: duplicate.seq,
        firstIndex: Math.min(insertionIndex, shiftedOriginal),
        duplicateIndex: Math.max(insertionIndex, shiftedOriginal),
      }
    })

    FastCheck.assert(
      FastCheck.property(generatedCase, ({ source, base, events, seq, firstIndex, duplicateIndex }) => {
        const reversed = [...base].reverse()
        const picks = reversed.map((input) => ({ stream: source, seq: input.seq }))
        const duplicateExit = Effect.runSyncExit(applyMerge(
          { picks },
          new Map([[source, events]]),
        ))
        expect(duplicateExit._tag).toBe("Failure")
        const refusal = Effect.runSync(Effect.flip(applyMerge(
          { picks },
          new Map([[source, events]]),
        )))
        expect(refusal).toEqual(new MergeDuplicateSequence({
          offenders: [{ source, seq, indexes: [firstIndex, duplicateIndex] }],
        }))

        const replayed = Effect.runSync(applyMerge(
          { picks },
          new Map([[source, base]]),
        ))
        expect(replayed).toEqual(reversed)
      }),
      { seed: 0x6d31cafe, numRuns: 500, endOnFailure: false, verbose: 1 },
    )
  })
})
