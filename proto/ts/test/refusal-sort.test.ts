import { expect, test } from "bun:test"
import vector from "../../wire/refusal-sorts.json"
import {
  DAEMON_REFUSAL_SORTS,
  refusalSortOf,
  type DaemonRefusalKind,
  type RefusalSort,
} from "../src/wire.ts"

test("the TS refusal sorts match the shared all-nine vector", () => {
  const expected = new Map<DaemonRefusalKind, RefusalSort>()
  for (const kind of vector.structural) expected.set(kind as DaemonRefusalKind, "structural")
  for (const kind of vector.absence) expected.set(kind as DaemonRefusalKind, "absence")

  expect(Object.keys(DAEMON_REFUSAL_SORTS).length).toBe(9)
  expect(expected.size).toBe(9)
  for (const [kind, sort] of expected) {
    expect(refusalSortOf(kind)).toBe(sort)
    expect(DAEMON_REFUSAL_SORTS[kind]).toBe(sort)
  }
  expect(refusalSortOf("unreachable")).toBeUndefined()
})

test("absence is excluded from every future refusal corpus", () => {
  const corpusKinds = Object.entries(DAEMON_REFUSAL_SORTS)
    .filter(([, sort]) => sort === "structural")
    .map(([kind]) => kind)
  expect(corpusKinds.sort()).toEqual([...vector.structural].sort())
  for (const kind of vector.absence) expect(corpusKinds).not.toContain(kind)
})
