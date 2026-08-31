/**
 * S3b BATTERY — tokens, face facts, zero-state (L-V6..L-V8).
 *
 * Contract packet: `.staging/frontend-trunk/packets/S3B-TRUNK-APP.md`.
 * Red at COLLECTION today because `./app.ts` and `./view.ts` do not
 * exist. Read-only to the implementer.
 */
import { readFileSync } from "node:fs"
import { given, scene, tap } from "foldkit/scene"
import { expect, test } from "vitest"

import { Message, initialApp, update, type AppModel } from "./app.ts"
import { view } from "./view.ts"
import { foldDocument } from "./fold.ts"
import { WINDOW, emptyModel, laneIndex, totalCount } from "./model.ts"
import { cutDoi } from "./placement.ts"
import { loadWhole, syntheticPage } from "./fixtures/harness.ts"
import {
  allNodes,
  byTestId,
  classesOf,
  textOf,
  type VNodeShape,
} from "./fixtures/app-harness.ts"

const BOOT = { widthCss: 507, heightCss: 660, dpr: 1, theme: "light" }
const STORE = "http://127.0.0.1:7101"

const app0 = (): AppModel => initialApp(STORE, BOOT)

const goldenModel = (): AppModel => {
  const trunk = foldDocument(emptyModel, loadWhole())
  return { ...app0(), trunk, doi: cutDoi(trunk, WINDOW) }
}

const NO_HISTORY_YET =
  "no history yet — receipts begin when a store first opens with the word log; earlier content is present without receipts"

/** The declarations inside one CSS block, token → value. */
const declarationsOf = (block: string): Readonly<Record<string, string>> => {
  const out: Record<string, string> = {}
  for (const match of block.matchAll(/(--[a-z0-9-]+)\s*:\s*([^;]+);/gu)) {
    const name = match[1]
    const value = match[2]
    if (name !== undefined && value !== undefined) out[name] = value.trim()
  }
  return out
}

const themeTokens = (): { light: Readonly<Record<string, string>>; dark: Readonly<Record<string, string>> } => {
  const css = readFileSync(new URL("../styles.css", import.meta.url), "utf8")
  const darkStart = css.indexOf("@media (prefers-color-scheme: dark)")
  expect(darkStart, "the dark block exists").toBeGreaterThan(-1)
  return {
    light: declarationsOf(css.slice(0, darkStart)),
    dark: declarationsOf(css.slice(darkStart)),
  }
}

// ---------------------------------------------------------------- L-V6

test("styles.css declares the ruled tokens, light and dark, at the measured values", () => {
  const { light, dark } = themeTokens()
  expect(light["--mark-strip"]).toBe("#6c6c6f")
  expect(light["--mark-strip-deep"]).toBe("#a9a9ab")
  expect(light["--owed"]).toBe("#bc442c")
  expect(dark["--mark-strip"]).toBe("#87878a")
  expect(dark["--mark-strip-deep"]).toBe("#4e4e51")
  expect(dark["--owed"]).toBe("#ec775f")
})

test("the five-step mark ladder exists at the measured values", () => {
  const { light, dark } = themeTokens()
  const lightLadder = ["#121216", "#141418", "#16161a", "#18181c", "#1a1a1e"]
  const darkLadder = ["#e7e7ea", "#e9e9ed", "#ececf0", "#efeff2", "#f1f1f5"]
  lightLadder.forEach((value, step) => {
    expect(light[`--mark-${String(step)}`], `light step ${String(step)}`).toBe(value)
  })
  darkLadder.forEach((value, step) => {
    expect(dark[`--mark-${String(step)}`], `dark step ${String(step)}`).toBe(value)
  })
})

test("owed appears nowhere but the unregistered surfaces", () => {
  const model = goldenModel()
  scene(
    { update, view },
    given(model),
    tap((simulation) => {
      const residueGroup = byTestId(simulation.html, `column-${String(laneIndex("unregistered"))}`)
      const face = byTestId(simulation.html, "face")
      const allowed = new Set<VNodeShape>([
        ...allNodes(residueGroup ?? {}),
        ...allNodes(face ?? {}),
      ])
      const owedNodes = allNodes(simulation.html).filter((node) =>
        classesOf(node).includes("owed"),
      )
      expect(owedNodes.length, "the saturated budget is spent somewhere").toBeGreaterThan(0)
      for (const node of owedNodes) {
        expect(allowed.has(node), "owed only on doubt").toBe(true)
      }
    }),
  )
})

// ---------------------------------------------------------------- L-V7

test("the face carries the facts: count, mark, store, clock, unregistered", () => {
  const model = goldenModel()
  scene(
    { update, view },
    given(model),
    tap((simulation) => {
      const face = textOf(byTestId(simulation.html, "face") ?? {})
      expect(face).toContain(`${String(totalCount(model.trunk))} admissions`)
      expect(face).toContain(`mark ${String(model.trunk.mark)}`)
      expect(face).toContain(STORE)
      expect(face, "N5: per-device honest").toContain("admitting host's clock")
      const unregistered = byTestId(simulation.html, "face-unregistered")
      expect(textOf(unregistered ?? {})).toContain("3")
      expect(classesOf(unregistered ?? {})).toContain("owed")
    }),
  )
})

test("the unregistered count takes owed exactly when non-zero", () => {
  const registeredOnly = foldDocument(emptyModel, syntheticPage(0, 20, [1, 8]))
  const model: AppModel = { ...app0(), trunk: registeredOnly }
  scene(
    { update, view },
    given(model),
    tap((simulation) => {
      const unregistered = byTestId(simulation.html, "face-unregistered")
      expect(unregistered).not.toBeNull()
      expect(textOf(unregistered ?? {})).toContain("0")
      expect(classesOf(unregistered ?? {}), "zero doubt spends no hue").not.toContain("owed")
    }),
  )
})

test("a refused face carries the reason and the stale mark", () => {
  const refused = update(goldenModel(), Message.SucceededPullHistory({ body: "garbage" })).model
  expect(refused.trunk.status._tag).toBe("Refused")
  const reason = refused.trunk.status._tag === "Refused" ? refused.trunk.status.reason : ""
  scene(
    { update, view },
    given(refused),
    tap((simulation) => {
      const face = textOf(byTestId(simulation.html, "face") ?? {})
      expect(face).toContain(reason)
      expect(face, "stale-but-fresh-looking is the lie").toContain("stale")
      expect(face).toContain(`mark ${String(refused.trunk.mark)}`)
    }),
  )
})

// ---------------------------------------------------------------- L-V8

test("the empty store sentence is the CLI's, verbatim; first paint is not it", () => {
  const empty = update(app0(), Message.SucceededPullHistory({ body: { next: 0, word: [] } })).model
  scene(
    { update, view },
    given(empty),
    tap((simulation) => {
      expect(textOf(byTestId(simulation.html, "zero-state") ?? {})).toContain(NO_HISTORY_YET)
    }),
  )
  const loading = update(app0(), Message.TickedPoll()).model
  scene(
    { update, view },
    given(loading),
    tap((simulation) => {
      const body = textOf(simulation.html)
      expect(body, "asking is not emptiness").not.toContain(NO_HISTORY_YET)
      expect(body).not.toContain("nothing since mark")
    }),
  )
})

test("nothing since mark N is the second wording", () => {
  const marked = update(app0(), Message.SucceededPullHistory({ body: { next: 5, word: [] } })).model
  expect(marked.trunk.mark).toBe(5)
  expect(totalCount(marked.trunk)).toBe(0)
  scene(
    { update, view },
    given(marked),
    tap((simulation) => {
      expect(textOf(byTestId(simulation.html, "zero-state") ?? {})).toContain(
        "nothing since mark 5",
      )
    }),
  )
})

