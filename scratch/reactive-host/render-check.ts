// EXEMPLAR ONLY — not a gate, wired into nothing.
//
// The headless render check, in three arms.
//
//   Arm A  the view is a PURE FINISHING PROJECTION: applied to a Model it
//          produces a VNode value, with no DOM anywhere. The markup is
//          serialized from that value and asserted to carry the Model's raw
//          values and no visual vocabulary.
//   Arm B  the same view is accepted by foldkit's own Scene render path under
//          happy-dom, so the projection is not merely well-typed — the
//          framework's runtime renders it.
//   Arm C  the rendered surface is emitted as `rendered.html`, one frame per
//          fold position, and the committed artifact is diffed byte-for-byte
//          against a fresh regeneration. `bun render-check.ts --write`
//          regenerates it; that command is the artifact's whole provenance.
//
// DELIBERATELY UNSTYLED. Arm A asserts that mechanically: no class, no style,
// no colour, no unit — and the emitted document carries no stylesheet, so the
// screenshot beside it is the browser's own defaults and nothing else. Any
// visual vocabulary belongs to the design lane, and this slice makes no
// design decision.

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

const write = process.argv.includes("--write")
const artifact = new URL("./rendered.html", import.meta.url)

let failed = false
const fail = (detail: string): void => {
  console.log(`FAIL  render check: ${detail}`)
  failed = true
  process.exitCode = 1
}

// ---------------------------------------------------------------------------

const slice = await Effect.runPromise(Slice.declareSlice())

const notes = ["alpha", "beta", "gamma", "delta", "epsilon", "zeta"]
const arrivals = await Effect.runPromise(
  Effect.forEach(
    notes,
    (note, index) => Slice.positionedOf(slice, { room: "north", note }, index + 1),
  ),
)

const step = Slice.update(slice.fold)
const applyAll = (
  model: SliceTypes.Model,
  messages: ReadonlyArray<SliceTypes.Message>,
): SliceTypes.Model => messages.reduce((current, message) => step(current, message)[0], model)

const arrivedAt = (positions: ReadonlyArray<number>) =>
  positions.map((position) => Slice.Arrived(arrivals[position - 1]!))

// The frames the artifact shows: the surface at four points of one fold, so
// the rendering is of a slice doing its job rather than of one static Model.
const frames: ReadonlyArray<{ readonly label: string; readonly model: SliceTypes.Model }> = [
  {
    label: "1. anchor 0 — nothing resolved yet; behind 0 because the head is unknown",
    model: Slice.init,
  },
  {
    label: "2. three arrivals applied, head at 6 — staleness is 3 positions, not a duration",
    model: applyAll({ ...Slice.init, head: 6 }, arrivedAt([1, 2, 3])),
  },
  {
    label: "3. the subscription tore — the watch plane decided nothing, truth is unmoved",
    model: applyAll({ ...Slice.init, head: 6 }, [...arrivedAt([1, 2, 3]), { _tag: "Torn" }]),
  },
  {
    label: "4. recovered by read, out of order and duplicated — frontier at 6, 3 absorbed",
    model: applyAll({ ...Slice.init, head: 6 }, [
      ...arrivedAt([1, 2, 3]),
      { _tag: "Torn" },
      { _tag: "Recovered" },
      ...arrivedAt([6, 5, 4, 6, 5, 4]),
    ]),
  },
]

const folded = frames[3]!.model

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
    data?: { props?: Record<string, unknown>; attrs?: Record<string, unknown> }
    children?: ReadonlyArray<Html | string>
  }
  if (vnode.sel === undefined) return vnode.text ?? ""
  const named = { ...vnode.data?.attrs, ...vnode.data?.props }
  const rendered = Object.entries(named)
    .map(([key, value]) => ` ${key}="${String(value)}"`)
    .join("")
  const inner = (vnode.children ?? []).map(serialize).join("")
  return `<${vnode.sel}${rendered}>${inner}</${vnode.sel}>`
}

const render = (model: SliceTypes.Model): string =>
  serialize(Slice.view(model, inertHtml as unknown as HtmlBuilder))

const markup = render(folded)

if (markup === "") fail("the view projected nothing")

for (
  const expected of [
    "floor 6",
    "head 6",
    "behind 0",
    "chatter recovering",
    "absorbed 3",
    ...notes,
  ]
) {
  if (!markup.includes(expected)) fail(`markup is missing ${JSON.stringify(expected)}`)
}

for (const forbidden of ["class=", "style=", "rgb(", "px", "#"]) {
  if (markup.includes(forbidden)) fail(`markup carries visual vocabulary (${forbidden})`)
}

// The projection is a function of the Model alone: same Model, same markup.
if (markup !== render(folded)) fail("the projection is not a function of the Model")

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
// Arm C — the artifact.
//
// No stylesheet, no script, no attribute the view did not put there. What the
// browser shows for this document is its own default rendering of the Model's
// raw values, which is the whole point.
// ---------------------------------------------------------------------------

const document_ = [
  "<!doctype html>",
  `<html lang="en">`,
  "<head>",
  `<meta charset="utf-8">`,
  "<title>reactive-host — the rendered surface</title>",
  "</head>",
  "<body>",
  "<h1>scratch/reactive-host — the rendered surface</h1>",
  "<p>Generated by <code>bun render-check.ts --write</code>. Deliberately unstyled:",
  "this document carries no stylesheet and no script, so a browser shows its own",
  "defaults over the Model's raw values. The visual language is the design lane's.</p>",
  `<p>lane <code>${slice.lane.digest}</code><br>fold <code>${slice.fold.digest}</code></p>`,
  ...frames.flatMap(({ label, model }) => [
    "<hr>",
    `<h2>${label}</h2>`,
    render(model),
  ]),
  "</body>",
  "</html>",
  "",
].join("\n")

if (write) {
  await Bun.write(artifact, document_)
  console.log(`WROTE rendered.html — ${document_.length} bytes, ${frames.length} frames`)
} else {
  const committed = await Bun.file(artifact).text().catch(() => null)
  if (committed === null) {
    fail("rendered.html is absent; regenerate it with `bun render-check.ts --write`")
  } else if (committed !== document_) {
    fail(
      "rendered.html does not match a fresh regeneration; " +
        "the artifact is stale (regenerate with `bun render-check.ts --write`)",
    )
  }
}

// ---------------------------------------------------------------------------

if (!failed) {
  console.log(`PASS  render check — ${markup.length} bytes of unstyled markup, values only`)
  console.log(`      ${markup}`)
  if (!write) console.log(`PASS  rendered.html matches a fresh regeneration (${frames.length} frames)`)
}
