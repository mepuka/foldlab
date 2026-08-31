/**
 * THE DEV-FIXTURE FRESHNESS GATE — green today, runs in
 * `check:workbench`. Breaker-built beside the dev viewer it gates
 * (S3b packet §6).
 *
 * Red exactly when the recorded fixture or the generated mirrors
 * drift: the dev scene folds the fixture through the engine's OWN door
 * (`decodeHistory` over S0's `wordHistorySchema`) — there is no second
 * parse to drift independently. Regeneration rule: the mirrors are
 * outputs of `mise run gen:backend-word` / `gen:grammar-manifest`;
 * never edited by hand.
 */
import { expect, test } from "vitest"

import { devScene, isResidue, tintOf } from "./fixture-view.ts"
import { totalCount } from "../trunk/model.ts"
import { opTotal } from "../trunk/placement.ts"
import { isDisjoint } from "../trunk/place.ts"

test("the fixture still passes the engine door and folds to the known totals", () => {
  const scene = devScene(1)
  expect(scene.trunk.status._tag).toBe("Live")
  expect(scene.trunk.mark).toBe(220)
  expect(totalCount(scene.trunk)).toBe(220)
  expect(scene.unregisteredCount, "the residue lane stays surfaced").toBe(3)
  expect(opTotal(scene.placement), "count honesty through the dev path").toBe(220)
})

test("the dev scene renders the engine's rects: non-empty, disjoint, all five tints", () => {
  for (const dpr of [1, 2]) {
    const scene = devScene(dpr)
    expect(scene.rects.length).toBeGreaterThan(0)
    expect(isDisjoint(scene.rects), "no two rects share a device pixel").toBe(true)
    const tints = new Set(scene.rects.map((rect) => tintOf(rect)).filter((tint) => tint >= 0))
    expect([...tints].toSorted((a, b) => a - b)).toStrictEqual([0, 1, 2, 3, 4])
    expect(scene.rects.some((rect) => isResidue(rect)), "doubt is visible").toBe(true)
    expect(scene.rects.some((rect) => rect.of._tag === "Strip"), "the window strips").toBe(true)
    expect(scene.canonical.split("\n")[0]).toContain(`dpr=${String(dpr)}`)
    expect(scene.labels).toHaveLength(16)
  }
})
