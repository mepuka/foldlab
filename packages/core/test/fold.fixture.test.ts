/**
 * Single-implementation fold PIN: these states and digests were generated once
 * by TypeScript over the existing frozen stream event corpus. This is not a
 * cross-language wall until a future Go twin independently reproduces it.
 */

import { describe, expect, test } from "bun:test"
import { readFileSync } from "node:fs"
import { join } from "node:path"
import { encodeFoldState, type FoldState } from "../src/algebra.ts"
import { foldFixtureEvents, primitiveFolds } from "./foldTestData.ts"

interface FixtureEntry {
  readonly step: string
  readonly state: FoldState
  readonly digest: string
}

const fixture = JSON.parse(
  readFileSync(join(import.meta.dir, "../fixtures/fold-pin.json"), "utf8"),
) as { readonly _provenance: string } & Record<string, FixtureEntry | string>

describe("the fold single-implementation pin", () => {
  for (const [name, fold] of Object.entries(primitiveFolds)) {
    test(`${name}: state and fold digest stay pinned`, () => {
      const expected = fixture[name] as FixtureEntry
      expect(encodeFoldState(fold.fold(foldFixtureEvents))).toEqual(
        encodeFoldState(expected.state),
      )
      expect(fold.digest).toBe(expected.digest)
    })
  }

  test("provenance explicitly refuses a wall claim", () => {
    expect(fixture._provenance).toContain("single-implementation pin, not a wall")
  })
})
