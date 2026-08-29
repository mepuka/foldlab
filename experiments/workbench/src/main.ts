/**
 * The pure half of the workbench: Model, Message, update, init, view.
 *
 * `entry.ts` is the only module that starts anything, so tests import
 * this one directly and drive the loop without a runtime.
 *
 * Everything here is skeleton. There is one page and one interaction,
 * chosen because it is the smallest thing that exercises the whole loop
 * — Message in, pure transition out, a Command as data, a result Message
 * back — without deciding anything that belongs to another lane. The
 * workbench's actual screens are Lane B's; what those screens talk to is
 * Lane C's.
 */
import { Effect, Schema as S } from "effect"
import { Command, Runtime, type Update } from "foldkit"
import type { Document, HtmlBuilder, Html } from "foldkit/html"
import { defineMessageUnion } from "foldkit/message"
import { defineTaggedUnion } from "foldkit/schema"
import { evo } from "foldkit/struct"

import { StoreSeam } from "./store/seam.ts"

// MODEL

/** What the workbench currently knows about the store seam. Four states,
 * not a boolean: refusal carries its reason, and "never asked" is not the
 * same fact as "asked and was refused". */
export const Probe = defineTaggedUnion({
  Idle: {},
  Probing: {},
  Answered: { identity: S.String },
  Refused: { reason: S.String },
})
export type Probe = typeof Probe.Type

export const Model = S.Struct({
  probe: Probe,
})
export type Model = typeof Model.Type

// MESSAGE

export const Message = defineMessageUnion({
  ClickedProbeStore: {},
  SucceededProbeStore: { identity: S.String },
  RefusedProbeStore: { reason: S.String },
})
export type Message = typeof Message.Type

// COMMAND

/** Ask the seam to identify itself. Refusal is converted into a Message,
 * so the error channel is empty by the time the runtime sees it and
 * update handles both outcomes through the same loop. */
export const ProbeStore = Command.define("ProbeStore", {
  messages: [Message.SucceededProbeStore, Message.RefusedProbeStore],
  execute: Effect.gen(function* () {
    const seam = yield* StoreSeam
    const identity = yield* seam.probe
    return Message.SucceededProbeStore({ identity })
  }).pipe(
    Effect.catch((error) =>
      Effect.succeed(Message.RefusedProbeStore({ reason: error.reason })),
    ),
  ),
})

// UPDATE

export const update = (model: Model, message: Message) =>
  Message.match<Update.Return<Model, Message, StoreSeam>>(message, {
    ClickedProbeStore: () => ({
      model: evo(model, { probe: () => Probe.Probing() }),
      commands: [ProbeStore()],
    }),
    SucceededProbeStore: ({ identity }) => ({
      model: evo(model, { probe: () => Probe.Answered({ identity }) }),
    }),
    RefusedProbeStore: ({ reason }) => ({
      model: evo(model, { probe: () => Probe.Refused({ reason }) }),
    }),
  })

// INIT

export const init: Runtime.ApplicationInit<Model, Message> = () => ({
  model: { probe: Probe.Idle() },
})

// VIEW

const probeLine = (probe: Probe): string =>
  Probe.match(probe, {
    Idle: () => "Not asked.",
    Probing: () => "Asking...",
    Answered: ({ identity }) => `Answered: ${identity}`,
    Refused: ({ reason }) => `Refused: ${reason}`,
  })

const owed = (what: string, lane: string, h: HtmlBuilder<Message>): Html =>
  h.li([h.Class("owed-item")], [
    h.span([h.Class("owed-what")], [what]),
    h.span([h.Class("owed-lane")], [lane]),
  ])

export const view = (model: Model, h: HtmlBuilder<Message>): Document => ({
  title: "foldlab workbench",
  body: h.main([h.Class("page")], [
    h.h1([h.Class("title")], ["foldlab workbench"]),
    h.p([h.Class("lede")], [
      "Experimental grade, skeleton only. This page exists to prove the loop runs and the build is honest, not to show the product.",
    ]),

    h.section([h.Class("panel"), h.AriaLabelledBy("seam-heading")], [
      h.h2([h.Id("seam-heading"), h.Class("heading")], ["Store seam"]),
      h.p([h.Class("prose")], [
        "The workbench reaches the store through one Effect service. Nothing is bound to it in this build, so every probe refuses. That refusal is the true state of the package, and it is what the page reports.",
      ]),
      h.button(
        [h.Class("action"), h.OnClick(Message.ClickedProbeStore())],
        ["Probe the seam"],
      ),
      h.p([h.Class("status"), h.Role("status")], [probeLine(model.probe)]),
    ]),

    h.section([h.Class("panel"), h.AriaLabelledBy("owed-heading")], [
      h.h2([h.Id("owed-heading"), h.Class("heading")], ["Deliberately absent"]),
      h.ul([h.Class("owed")], [
        owed("Screens, navigation, and the workbench's own vocabulary", "Lane B", h),
        owed("The store contract, its transport, and the sync database", "Lane C", h),
        owed("Everything derived from the language: generated, never typed by hand", "gen tasks", h),
      ]),
    ]),
  ]),
})
