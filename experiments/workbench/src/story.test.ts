/**
 * Story drives `update` directly: a Message in, the next Model and the
 * Commands out, with the Command left as data until the test says what
 * happened. No Effect runs, so the seam's implementation is irrelevant
 * here — which is the point of Commands being values.
 */
import { Command, given, message, model, story } from "foldkit/story"
import { expect, test } from "vitest"

import { Message, Probe, ProbeStore, update } from "./main.ts"

test("clicking probe moves to Probing and dispatches ProbeStore", () => {
  story(
    update,
    given({ probe: Probe.Idle() }),
    message(Message.ClickedProbeStore()),
    Command.expectExact(ProbeStore),
    model((m) => {
      expect(m.probe._tag).toBe("Probing")
    }),
    Command.resolve(
      ProbeStore,
      Message.RefusedProbeStore({ reason: "no store is wired" }),
    ),
    model((m) => {
      expect(m.probe).toStrictEqual(Probe.Refused({ reason: "no store is wired" }))
    }),
  )
})

test("an answered probe keeps the identity the seam returned", () => {
  story(
    update,
    given({ probe: Probe.Idle() }),
    message(Message.ClickedProbeStore()),
    Command.resolve(
      ProbeStore,
      Message.SucceededProbeStore({ identity: "memory" }),
    ),
    model((m) => {
      expect(m.probe).toStrictEqual(Probe.Answered({ identity: "memory" }))
    }),
  )
})

test("refusal is a distinct fact from never having asked", () => {
  story(
    update,
    given({ probe: Probe.Refused({ reason: "no store is wired" }) }),
    message(Message.ClickedProbeStore()),
    Command.expectExact(ProbeStore),
    Command.resolve(
      ProbeStore,
      Message.RefusedProbeStore({ reason: "still nothing" }),
    ),
    model((m) => {
      expect(m.probe).toStrictEqual(Probe.Refused({ reason: "still nothing" }))
    }),
  )
})
