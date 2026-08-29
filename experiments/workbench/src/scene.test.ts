/**
 * Scene enters through the rendered view: it finds the button by its
 * accessible role and name, invokes the handler, and reads the rendered
 * result. It runs on VNodes, so there is no DOM, no jsdom, and no
 * browser in this suite.
 */
import { Command, click, expect as sceneExpect, given, role, scene, text } from "foldkit/scene"
import { test } from "vitest"

import { Message, Probe, ProbeStore, update, view } from "./main.ts"

test("the page renders and reports that nothing has been asked", () => {
  scene(
    { update, view },
    given({ probe: Probe.Idle() }),
    sceneExpect(role("heading", { level: 1 })).toHaveText("foldlab workbench"),
    sceneExpect(role("status")).toHaveText("Not asked."),
    sceneExpect(role("button", { name: "Probe the seam" })).toExist(),
  )
})

test("probing an unwired seam shows the refusal it actually got", () => {
  scene(
    { update, view },
    given({ probe: Probe.Idle() }),
    click(role("button", { name: "Probe the seam" })),
    sceneExpect(role("status")).toHaveText("Asking..."),
    Command.expectExact(ProbeStore),
    Command.resolve(
      ProbeStore,
      Message.RefusedProbeStore({ reason: "no store is wired" }),
    ),
    sceneExpect(role("status")).toHaveText("Refused: no store is wired"),
  )
})

test("the page names the lanes that owe the absent parts", () => {
  scene(
    { update, view },
    given({ probe: Probe.Idle() }),
    sceneExpect(text("Lane B")).toExist(),
    sceneExpect(text("Lane C")).toExist(),
  )
})
