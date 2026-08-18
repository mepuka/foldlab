// EXEMPLAR ONLY — not a gate, wired into nothing.
//
// The headless render check, in two arms.
//
//   Arm A  the view is a PURE FINISHING PROJECTION: applied to a Model it
//          produces a VNode value, with no DOM anywhere. The markup is
//          serialized from that value and asserted to carry the Model's raw
//          values and no visual vocabulary.
//   Arm B  the same view is accepted by foldkit's own Scene render path under
//          happy-dom, so the projection is not merely well-typed — the
//          framework's runtime renders it.
//
// DELIBERATELY UNSTYLED. Arm A asserts that mechanically: no class, no style,
// no colour, no unit. Any visual vocabulary belongs to the design lane, and
// this slice makes no design decision.

import { GlobalRegistrator } from "@happy-dom/global-registrator"

import type * as SliceTypes from "./slice.js"

// happy-dom has to own the globals before foldkit's render path loads, so the
// value imports are deferred; the type import above is erased and safe.
GlobalRegistrator.register()

const { Effect } = await import("effect")
const { inertHtml } = await import("foldkit/html")
const { Scene } = await import("foldkit/test")
const Slice: typeof SliceTypes = await import("./slice.js")

type Html = import("foldkit/html").Html
type HtmlBuilder = import("foldkit/html").HtmlBuilder<SliceTypes.Message>

let failed = false
const fail = (detail: string): void => {
  console.log(`FAIL  render check: ${detail}`)
  failed = true
  process.exitCode = 1
}

// ---------------------------------------------------------------------------

const slice = await Effect.runPromise(Slice.declareSlice())

const arrivals = await Effect.runPromise(
  Effect.forEach(
    ["alpha", "beta", "gamma"],
    (note, index) => Slice.positionedOf(slice, { room: "north", note }, index + 1),
  ),
)

const step = Slice.update(slice.fold)
const folded = arrivals.reduce(
  (model, arrival) => step(model, Slice.Arrived(arrival))[0],
  { ...Slice.init, head: arrivals.length + 2 },
)

// ---------------------------------------------------------------------------
// Arm A — the projection is a value.
//
// FINDING F-4: `inertHtml` is the only headless HtmlBuilder foldkit exports,
// and it is `HtmlBuilder<never>`. A Message-typed view therefore needs this
// cast to be rendered outside the runtime. The sanctioned retyping helper
// (`__htmlBuilder`) is marked @internal AND unreachable — the package
// `exports` map has no deep entry, so `foldkit/dist/html/index.js` does not
// resolve. This view dispatches nothing, so the cast is sound here; a view
// with handlers would have no public headless render path at all.
// ---------------------------------------------------------------------------

const serialize = (node: Html | string | null): string => {
  if (node === null) return ""
  if (typeof node === "string") return node
  const vnode = node as unknown as {
    sel?: string
    text?: string
    data?: Record<string, unknown>
    children?: ReadonlyArray<Html | string>
  }
  if (vnode.sel === undefined) return vnode.text ?? ""
  const attributes = vnode.data?.["attrs"] as Record<string, unknown> | undefined
  const rendered = attributes === undefined ? "" : Object.entries(attributes)
    .map(([key, value]) => ` ${key}="${String(value)}"`)
    .join("")
  const inner = (vnode.children ?? []).map(serialize).join("")
  return `<${vnode.sel}${rendered}>${inner}</${vnode.sel}>`
}

const markup = serialize(Slice.view(folded, inertHtml as unknown as HtmlBuilder))

if (markup === "") fail("the view projected nothing")

for (
  const expected of [
    `floor ${arrivals.length}`,
    `head ${arrivals.length + 2}`,
    "behind 2",
    "chatter live",
    "absorbed 0",
    ...arrivals.map((arrival) => arrival.event.note),
  ]
) {
  if (!markup.includes(expected)) fail(`markup is missing ${JSON.stringify(expected)}`)
}

for (const forbidden of ["class=", "style=", "rgb(", "px", "#"]) {
  if (markup.includes(forbidden)) fail(`markup carries visual vocabulary (${forbidden})`)
}

// The projection is a function of the Model alone: same Model, same markup.
if (markup !== serialize(Slice.view(folded, inertHtml as unknown as HtmlBuilder))) {
  fail("the projection is not a function of the Model")
}

// ---------------------------------------------------------------------------
// Arm B — foldkit's own render path accepts it.
//
// FINDING F-6: Scene keeps the rendered VNode on the simulation and
// materializes DOM only when an interaction demands it, so "headless render"
// here means a VALUE, not a document. happy-dom is loaded because Scene's
// render path touches document globals, not because the render needs a page.
// ---------------------------------------------------------------------------

const adapted = (model: SliceTypes.Model, message: SliceTypes.Message) =>
  [step(model, message)[0], [] as ReadonlyArray<never>] as const

let sceneSel = ""
Scene.scene<SliceTypes.Model, SliceTypes.Message>(
  { update: adapted, view: Slice.view },
  Scene.given(folded),
  Scene.tap((simulation) => {
    sceneSel = (simulation as unknown as { html: { sel?: string } }).html?.sel ?? ""
  }),
)
if (sceneSel !== "div") fail(`Scene did not render the view (root sel ${JSON.stringify(sceneSel)})`)

// ---------------------------------------------------------------------------

if (!failed) {
  console.log(`PASS  render check — ${markup.length} bytes of unstyled markup, values only`)
  console.log(`      ${markup}`)
}
