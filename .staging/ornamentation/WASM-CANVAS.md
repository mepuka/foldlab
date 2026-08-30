# WASM-CANVAS — the rendering substrate, assessed

**Lane:** front end / ornamentation. Commissioned by **decision 31(e)**
(`docs/SPECS.md:430-431`): WASM-integration research for a data-dense,
high-quality, high-fidelity, **performant** canvas.
**Status:** pre-grade. External sources are C6 **PENDING** unless a pin says
otherwise (§8).
**Written against:** `main` @ `43b59e01`, 2026-08-29. (Drafted at `c042afa3`;
citations into `docs/SPECS.md` and `GRILLING-DOCKET-2026-08-29.md` were
re-resolved after decisions 28–33 landed those files — the docket was
working-tree-only at `c042afa3`, so every line number into it has moved.)
**Companions:** `ORNAMENTATION.md`, `PROOF-OBLIGATIONS.md`.

---

## 0. The position, stated first

**Plain DOM renders the document. No WASM canvas for v0, and the reason is not
caution — it is that the estate's own ruled interaction model has already
deleted the three workloads that justify one.**

The three canonical arguments for a WASM/GPU canvas in a data-dense product are
(a) an unbounded free-form scene, (b) continuous re-layout of many elements per
frame, and (c) a node-link graph with force layout. Against the estate:

- (a) does not exist. The ruled surface is a transcript of **uniform
  fixed-height rows** with variability confined to fixed-width gutters
  (`W-D2`, `.staging/paper-notes/10-workbench-requirements.md:127-131`).
  Constant row height is the single best case for DOM virtualization: windowing
  needs no measurement pass and scroll position is arithmetic.
- (b) is forbidden. **Completed rows never re-render** — a row's rendering is a
  pure function of its binding, and first-binding resolution means nothing
  admitted later can change anything admitted earlier
  (`W-T4`, `:78-81`). On append, the only pixels that change are the new row,
  the frontier marker, and the counters (`W-H2`, `:171-174`). The steady-state
  cost of the live feed is **O(1) per admission**, not O(n) per frame, and that
  is a *derived* property of the word, not a rendering optimization.
- (c) is refused outright. The graph view replaces a proved carrier — a list,
  whose order is the semantics — with an unproved picture, and cannot satisfy
  `W-T4` because a grow-only store reflows a force layout on every put
  (`.staging/operational-structure/FRONTEND.md:282`).

So the workload that most justifies a GPU canvas is the one the estate has
already ruled out on semantic grounds, and the two that remain are the two DOM
does best. **A WASM canvas here would be an expensive answer to a question the
algebra already answered.**

**Where WASM does belong in this estate** is the store and the interpreter, not
the renderer — §6. And **where the GPU belongs** is ornament and effects,
never the document — which is, independently, exactly the split the tier-one
inspiration ships (§5.2).

**The stack, named, so the position is a choice rather than an abstention.**
The document renders as **foldkit over the DOM** — the committed stack, and the
only one the component emitter can already spell with zero new fragment forms
(§3.1, §4.1). Ornament that outruns CSS gets a **WebGL2 region** (Baseline
since September 2021), never a canvas that owns the document (§3.3, §5.3).
WebGPU is the rung above that and waits for a workload, because its holes are
current and named (§3.4). **Rust→WASM UI toolkits are refused on both branches
and for two different reasons** (§3.5) — the strongest single finding in this
document is that AccessKit, the accessibility layer that family relies on,
publishes no web adapter at all. And the whole position is falsifiable: §4.4
gives the trigger, §3.7 gives the frame budget and the three measurements that
would have to fail before any of this is reopened.

---

## 1. What the estate already researched, and why it does not answer this

`docs/research/effect-modeling-wasm-interoperability-optimization-frontier.md`
(636 lines, 2026-08-25) is the estate's standing WASM research. **It is about
WebAssembly as a substrate for the effect language, and it contains no
rendering material.** Building on it therefore means *not* duplicating it and
being precise about the three places it actually bears.

Its own architectural split is (`:243-247`):

```text
EffectCore operations and data
  -> WIT imports/exports and Component Model async     (interop path)
  -> Wasm continuation/stack-switching instructions    (control path)
```

A canvas renderer is **neither**. It is a third thing — call it the
**presentation path** — and the most useful contribution this document can make
to that research is to name it and to state that **it does not share the
effect language's theorem targets.** Nothing about a renderer's correctness is
downstream of WasmFX, WIT, or the Canonical ABI. Conflating them would be the
category error that research file spends its length avoiding.

Three places where it does bear:

1. **The StableHLO lesson, transferred.** That survey observes StableHLO
   succeeds by restricting its domain to tensor programs, and warns the estate
   to expect the same: an admitted operation universe with an explicit
   extension mechanism, never an unconstrained promise
   (`:267`). Applied here: **a rendering target is a domain, and the
   estate should have exactly one.** Adding a canvas target beside the DOM
   target doubles the emission surface (§4.3) for no proved gain.
2. **The evidence classes.** Its claim-discipline table separates "shipped tool
   or runtime" from "specification or proposal" and insists the two never be
   read as one (`:19-31`, table at `:23-29`). §3 below uses those classes
   verbatim, because the canvas field is full of proposals being cited as if
   they shipped — and, as §3.4 shows, of shipped things being cited without
   the holes their own maintainers publish.
3. **The G5 boundary.** "A named JS or Wasm engine remains a G5 boundary"
   (`:31`). A renderer is entirely inside that boundary. **No rendering choice
   can ever raise a claim gate**, which is worth saying out loud before anyone
   argues for a stack on rigor grounds. Renderers are judged on cost,
   accessibility, and fit — never on soundness.

---

## 2. What the estate actually has to render — the workload, measured

Design decisions should be made against numbers, so here are the ones the
record supplies.

| Workload | Size | Source |
|---|---|---|
| Transcript rows, level 1 | "203 rows scannable" is the stated bar | `10-workbench-requirements.md:131` |
| Transcript, addressability bar | **10⁴ bindings**, reachable in bounded keystrokes with no scrolling | `W-D5`, `:150-153` |
| Bindings per user-visible file | ~19 for a 1 MB file under recipe 1 (~16 chunks + tree nodes + manifest + file node) | `:104-107` |
| Kind registry | one row per wire tag; small, fixed | `manifest.json`, `kindTags.ts` |
| Tool table | 5 tools | `library/cas/mcp/cas-tools.json`, via `FRONTEND.md:110` |
| Detail view | one thing, **four slots**, every substrate | `W-S1`, `:191-195` |
| Resolution levels | exactly **two**; no level 3, no continuous zoom | `W-D1`, `:119-121` |
| Gestures | exactly **three** — expand, focus, descend | `W-D3`, `:133-139` |
| Motion | none except in-flight operations | `:265-270` via `FRONTEND.md:296` |

**Read that table as a hardware requirement and the answer falls out.** 10⁴
uniform-height rows with a windowed viewport is on the order of 30–60 live DOM
nodes at any moment. That is not a rendering problem in 2026; it is a
`position: sticky` and an index calculation. The product's stated ceiling is
three orders of magnitude below where DOM virtualization gets interesting.

**The one honest caveat.** `W-D5` requires *find-in-word* and jump-to-address
over 10⁴ bindings with bounded keystrokes. That is a **search and index**
problem, not a paint problem — and if it ever needs acceleration, the
acceleration belongs in the store (a query) or in a Worker, not in a renderer.
Naming it here so nobody later cites "10⁴ rows" as a canvas argument when the
cost is in the filter.

---

## 3. The stacks, surveyed

*Evidence classes are the estate's own (`effect-modeling-wasm-…:19-31`):
**shipped** (a usable implementation exists) versus **proposal** (a candidate
contract exists). They are never read as one.*

Six stacks are live candidates for a data-dense front end in 2026. Each gets
its evidence class, what it would cost **this** estate, and the one fact that
decides it. Where a number is not published, this section says so rather than
estimating.

### 3.1 DOM + CSS — the baseline, and the incumbent

**Class: shipped.** It is also the committed stack already: foldkit `0.154.0`
over vite `8.2.2` over effect `4.0.0-rc.112`
(`experiments/workbench/package.json`), rendering through snabbdom `VNode`s.

**Cost to this estate: zero new.** The generated-component path targets
foldkit's `HtmlBuilder` with **zero new `Ts.Expr` forms** (§4.1). Reading
order, text selection, browser find, clipboard, focus management and linking
are properties of the substrate rather than features of the product (§4.2).

**The deciding fact.** Every stack below is measured against an incumbent whose
marginal cost is zero and whose accessibility bill is already paid. A
challenger has to beat *free*, at this workload (§2). None of them do.

### 3.2 Canvas 2D — the honest challenger

**Class: shipped**, universally, for over a decade. The serious precedent is
Glide Data Grid, a React grid that paints its cells to a 2D canvas: "It scales
to millions of rows. Cells are rendered lazily on demand for memory
efficiency", and the rationale, "Once you need to load/unload hundreds of DOM
elements per frame nothing can save you"
(<https://github.com/glideapps/glide-data-grid/blob/main/README.md>, retrieved
2026-08-29, C6 PENDING).

Two things follow and they point opposite ways.

**It works, and the estate should say so.** Millions of rows on a canvas grid
is a shipped fact, not a vendor claim. If this product's transcript ever
becomes a million rows with per-cell formatting and sub-pixel scrolling, this
is the stack and the argument is over (§4.4, trigger iii).

**And its own maintainers will not vouch for the part the estate is ruled on.**
Asked directly whether the grid is accessible, the README answers: "Yes.
Unfortunately none of the primary developers are accessibility users so there
are likely flaws in the implementation we are not aware of" (ibid.). That is an
honest answer, and it is exactly the shape §4.2 predicts: painted pixels carry
no semantics, so a parallel structure is maintained beside them, and its
agreement with the painting is **asserted rather than checked**.

The estate has a name for an asserted agreement between two surfaces that must
not drift — it is the class of defect P4 and the byte gates exist to prevent.
Taking canvas for the document would mean taking that obligation on the
product's central surface, in the one place where no gate can discharge it,
because you cannot byte-compare a painting to a tree.

### 3.3 WebGL2 — shipped, and the escalation of record

**Class: shipped. Baseline widely available since September 2021**
(<https://developer.mozilla.org/en-US/docs/Web/API/WebGL2RenderingContext>,
retrieved 2026-08-29, C6 PENDING), including in Web Workers.

It is also the tier-one inspiration's own choice for effects: Paper Shaders is
WebGL2, open source and npm-published, with no WebGPU path
(<https://github.com/paper-design/shaders>) — §5.2.

**Cost to this estate.** As an *ornament carrier over a region*: one
dependency, no second emission target, and no accessibility bill, because the
region carries no fact (§5.3). As a *document renderer*: everything §3.2 costs,
plus a shader pipeline.

**Position: this is the escalation of record.** If §4.4's trigger fires, the
first move is a WebGL2 region — not a canvas document, and not a rewrite.
Widest support, lowest ceremony, and the precedent is the inspiration's own.

### 3.4 WebGPU — newly shipped, with named holes

**Class: shipped, with gaps that are current rather than historical.** Per the
working group's own status page
(<https://github.com/gpuweb/gpuweb/wiki/Implementation-Status>, retrieved
2026-08-29, C6 PENDING):

| Engine | Status as published |
|---|---|
| Safari | enabled by default in macOS Tahoe 26, iOS 26, iPadOS 26, visionOS 26 |
| Chromium | stable on macOS/Windows/ChromeOS since 113; Linux Intel Gen12+ in 144, NVIDIA on Wayland in 147; Windows ARM64 behind a flag |
| Firefox | Windows stable at 141; macOS Apple Silicon at 145, all Macs at 147; **Linux and Android nightly only**, Linux expected during 2026 |

Chromium implements it through Dawn; Firefox and Servo through the Rust `wgpu`
project (ibid.).

Read with the estate's evidence classes, the correct reading is not "WebGPU is
ready" but **"WebGPU is shipped where our users are, minus Linux Firefox and
Firefox Android."** For a developer tool that is a real minus rather than a
rounding error — Linux is a first-class platform for this audience. Secondary
coverage describes WebGPU as reaching Baseline in January 2026
(<https://web.dev/blog/webgpu-supported-major-browsers>, retrieved 2026-08-29,
C6 PENDING); the primary status page is the one to cite, precisely because it
still enumerates the holes.

**The design-tool precedent has moved, and it is worth being exact about which
way.** Figma migrated its renderer from WebGL to WebGPU — for compute shaders
and to escape "WebGL's bug-prone global state" — shipping a dynamic fallback
that can revert a live session to WebGL, and reporting "a performance
improvement when using WebGPU on some classes of devices, and more neutral
results on others, but no regressions"
(<https://www.figma.com/blog/figma-rendering-powered-by-webgpu/>, published
2025-09-18, retrieved 2026-08-29, C6 PENDING).

**Note the shape of that sentence.** A renderer migration of that size,
reported with no percentage, no millisecond, and no benchmark. It is the same
uncited-claim shape `ORNAMENTATION.md` §2.5 flags in Paper's own marketing, and
it is the reason §2 of this document measures the workload out of the estate's
record instead of out of vendor prose.

The precedent's *content*, though, sharpens the split rather than weakening it.
The two design tools diverge exactly where their documents differ: Figma's
document is a picture, so it went further into the GPU; Paper's document is
HTML, so it stayed DOM and confined the GPU to effects. **The estate's document
is a list whose order is the semantics — further from a picture than either of
them.** Follow the document, not the fashion.

### 3.5 Rust → WASM UI toolkits — and the finding that settles the family

This is the stack decision 31(e)'s phrasing most invites, so it gets the most
care. The family splits in two, and the split is not about Rust.

**(a) DOM-driving Rust frameworks** — Leptos, Dioxus's web target, Yew. These
compile to WASM and then *drive the DOM*. Shipped, real, and well regarded. But
notice what they buy here: they replace TypeScript with Rust and keep the DOM.
**For this estate that is a strict loss.** The generated component surface is
emitted from `Ts.Decl`/`Ts.Expr` into TypeScript
(`library/cas/Cas/Backend/Ts.lean`); a Rust view layer means a second emitter,
a second fragment consumer, and a second byte gate (§4.1) — to arrive at the
same DOM the first one already produces. There is no workload argument in this
branch at all, only a language preference, and the estate's language for this
surface is already fixed by the emitter.

**(b) Canvas-painting Rust toolkits** — egui/eframe and the immediate-mode
family. These paint the interface into a `<canvas>`. Here is the finding that
ends the discussion for this product:

> **AccessKit — the accessibility infrastructure these toolkits use — publishes
> adapters for macOS, Unix, and Windows. There is no web adapter**
> (<https://accesskit.dev/>, retrieved 2026-08-29, C6 PENDING). egui's own
> README says it plainly: AccessKit "currently implements the native
> accessibility APIs on Windows and macOS", and "for platforms that AccessKit
> doesn't yet support, **including web**, there is an experimental built-in
> screen reader" (<https://github.com/emilk/egui>, retrieved 2026-08-29, C6
> PENDING).

An *experimental built-in screen reader* is not a screen reader. It is the
application informing the user's actual assistive technology that it intends to
handle that itself. Measured against the four rules already in force — `W-X2`
one reading order and it is admission order, `W-X4` a speakable accessible name
for an address chip, `W-K1` the prompt owns focus with no dead keystroke, `W-C1`
three copy targets one of which **is a conformance vector** (§4.2) — this
family cannot meet requirements the estate has already ruled.

**So the honest statement of the Rust-WASM-UI position is not "it is
immature".** Several of these toolkits are shipped and good, and the DOM-driving
half is genuinely production-grade. It is: **the web-target accessibility
adapter does not exist, and the estate's accessibility rules are consequences
of its semantics rather than a compliance checklist.** A toolkit that cannot
express "one reading order, and it is admission order" cannot render this
product at any level of polish.

**Bundle cost — unresolved, and not estimated.** Secondary sources put a Leptos
WASM payload in the tens of kilobytes gzipped and a tutorial build in the
hundreds of kilobytes uncompressed; **no vendor publishes a comparable figure**
for a canvas-painting toolkit with fonts embedded, and no number is asserted
here. The estate would have to measure — and does not need to, because branch
(a) loses on the emitter argument and branch (b) loses on accessibility, both
before cost is reached.

### 3.6 GPU 2D vector renderers — the frontier, which says so itself

Vello is the serious one: a GPU compute-centric 2D renderer over `wgpu`, the
renderer Xilem builds on. Its own README states the maturity — **"Vello can
currently be considered in an alpha state"**, with blur and filter effects
incomplete, conflation artifacts, GPU memory allocation strategy and glyph
caching still open; it "needs a GPU with support for compute shaders to run";
and on the browser specifically, "the web is not currently a primary target for
Vello, and WebGPU implementations are incomplete"
(<https://github.com/linebender/vello>, retrieved 2026-08-29, C6 PENDING).

**Class: shipped tool, self-declared alpha, web not a target.** A fair
description of a promising project and a disqualifying one for a product
surface. Worth watching for one specific reason: if the estate ever renders an
ornament dense enough to need compute (§5.1), this is the shape the answer
takes.

### 3.7 The comparison, and the budget

| Stack | Class | Second emission target? | Accessibility bill | Verdict here |
|---|---|---|---|---|
| DOM + CSS (foldkit) | shipped | no — zero new `Ts.Expr` forms | paid by the substrate | **the document** |
| Canvas 2D | shipped | yes | rebuilt; agreement asserted, ungateable | region only, if the trigger fires |
| WebGL2 | shipped since 2021-09 | no, as a region | none — the region carries no fact | **the ornament escalation** |
| WebGPU | shipped minus Linux Firefox / Firefox Android | no, as a region | none — same condition | after WebGL2, for compute only |
| Rust→WASM, DOM-driving | shipped | **yes — for the same DOM** | paid by the substrate | refused: strict loss |
| Rust→WASM, canvas-painting | shipped; **no web a11y adapter** | yes | cannot meet `W-X2`/`X4`/`K1`/`C1` | refused |
| Vello / wgpu | alpha; web not a target | yes | rebuilt | watch |

**The budget, stated so a future argument is settled by measurement rather than
by taste.** A 60 Hz frame is 16.7 ms, but the estate's steady state is not a
frame cost at all: completed rows never re-render, so an admission touches the
new row, the frontier marker, and the counters (§0). Three operations could
plausibly exceed the budget, and each has a bar it must fail before any
canvas/WASM renderer proposal is entertained:

1. **Initial mount** of a windowed transcript at the stated ceiling of 10⁴
   bindings (`W-D5`) — first contentful row under 100 ms on the reference
   machine.
2. **Scroll**, windowed at constant row height — no dropped frame at 60 Hz
   across a 10⁴-row scrub. Constant row height is what makes this arithmetic
   rather than a measurement pass (§0).
3. **Find-in-word / filter** over 10⁴ bindings (`W-D5`) — result under 100 ms,
   with §2's caveat standing: this is an index cost, and it belongs in the
   store or a Worker, never in a renderer.

**None of the three has been measured, because none has been built.** That is
the honest state, and it names the right moment for the measurement: the first
time a real transcript renders. Until those three numbers exist, a canvas or
WASM renderer proposal has no evidence to stand on — and this section is the
reason it should be refused without one.

---

## 4. Why DOM wins for this product, in four arguments

The survey matters less than the fit, so the fit is argued explicitly.

### 4.1 A canvas cannot be a projection of a described kind — the emitter argument

This is the decisive one and it is specific to this estate.

The ruled direction is that a described kind's canonical code determines its
component the way it determines its wire mirror and its prose (decision 21
addendum, `docs/SPECS.md:270-279`). The mechanism is already verified: emitting
a foldkit view needs **zero new `Ts.Expr` forms**, because
`h.li([h.Class("owed-item")], [h.span(…)])` is exactly
`call (ident "h.li") [arr […], arr […]]` over the fragment that exists
(`FRONTEND.md:145`, against `library/cas/Cas/Backend/Ts.lean:29-43` and the
workbench's own view at `experiments/workbench/src/main.ts:100-135`). The
element builder `h` is a **parameter**, not an import, so the generated module
imports nothing from `foldkit/html` and `EmitLayer`'s first-dotted-segment
import rule does not even arise (`FRONTEND.md:145`).

A canvas renderer has no `h`. Its output is draw calls against a retained or
immediate scene, which is a **different emission target**: a second lowering
from the same described kinds, a second set of `Ts` fragment consumers, a
second byte gate, and a second thing to keep in agreement with the first. The
estate's standing posture is to consolidate rather than mint, and R6 grows the
fragment only with a real consumer (`Ts.lean:4-5`).

**So the canvas question is not "is WASM fast enough". It is "does the estate
want two rendering targets for its generated components". The answer is no, and
it stays no until a workload exists that the first target cannot serve.**

### 4.2 Accessibility is a ruled requirement, and canvas pays for it twice

Four accessibility rules are already in force, and every one of them is *free*
in DOM and *rebuilt from scratch* on canvas:

- **`W-X2` — one reading order, and it is admission order.** Screen readers get
  what the eye gets because there is only one order
  (`10-workbench-requirements.md:382-384`). In DOM this is document order: it is
  true by construction. On canvas it requires a parallel hidden DOM tree that
  must be *proved* to agree with the painted one — a second surface with its own
  agreement obligation, which is precisely the class of defect P4 exists to
  prevent.
- **`W-X4` — address chips need a usable accessible name.** 64 hex read aloud is
  useless; the name is kind + position + grouped short form, under twelve
  spoken words (`:388-390`).
- **`W-K1` — the prompt owns focus and every command returns it there**, with no
  state in which typing a character does nothing (`:308-310`). Canvas focus
  management is hand-built.
- **`W-C1` — three copy targets**: the address (64 hex), the canonical node
  document, and the word, which *is* a conformance vector (`:369-373`). Text
  selection and clipboard semantics are free in DOM and hand-built on canvas.

Add `W-D5`'s find-in-word: the browser's own find works on DOM text and does
not exist for painted pixels.

**The general position is not controversial and is worth citing rather than
asserting.** Canvas is an immediate-mode bitmap: its painted content is not in
the DOM and carries no accessibility semantics, so a text alternative must be
supplied separately through fallback content or ARIA
(<https://www.tpgi.com/html5-canvas-sub-dom/>, retrieved 2026-08-29, C6
PENDING). And the fallback mechanism is weaker than it sounds — a data table
placed inside a `<canvas>` as fallback is announced as a single run of text,
with no cell navigation and no row or column headers
(<https://stevefaulkner.github.io/Articles/Notes%20on%20accessibility%20of%20text%20replacement%20using%20HTML5%20canvas.html>,
retrieved 2026-08-29, C6 PENDING). **The estate's central surface is a table of
addressed rows.** That is the worst case for the fallback path and the best
case for real DOM.

**The estate's accessibility rules are not a compliance checklist; they are
consequences of the model** — one order because the word has one order, a
speakable name because an address is not speakable. A renderer that makes them
expensive is fighting the model.

### 4.3 The trust marks need the DOM's own affordances

`ORNAMENTATION.md` §4.2 defines four trust marks — addressed, verified-here,
gated, owed. Three of them are *interactive*: the address chip is a control
(click = focus, ⌘-click = descend, copy = full hex, `W-A1`, `:285-288`), the
gated mark should lead to the gate, and the owed mark should lead to its
obligation. Interactive, keyboard-reachable, copyable, linkable affordances are
what the DOM is. Rebuilding them on canvas is the classic canvas tax, and it is
paid per affordance, forever.

### 4.4 Where DOM genuinely loses, said honestly

Three places, none of which the estate is in:

1. **Free-form spatial canvases** with pan/zoom over thousands of arbitrary
   shapes. The estate refuses this surface (`FRONTEND.md:282`).
2. **Continuous animation of many elements.** Forbidden by `W-T4` and the
   motion rule.
3. **Very large spreadsheets with per-cell formatting and sub-pixel scrolling.**
   The estate's grid is a fixed-height row list with five columns.

If any of these arrive, the answer changes and this document should be
re-opened. **The falsifiable trigger** — write it down so the decision is
reviewable rather than defended: *a shipped screen that (i) exceeds 10⁴
simultaneously visible primitives, or (ii) requires re-layout of more than a
few hundred elements per frame, or (iii) requires continuous transform of a
scene the user pans and zooms.* Absent all three, DOM is not a compromise; it
is the correct engineering answer.

---

## 5. Where the GPU does earn its place

Refusing a WASM canvas for the *document* is not refusing the GPU.

### 5.1 Ornament, and only ornament

`ORNAMENTATION.md` §6.5 assesses an ornament grammar whose motifs are
addressed vector denotations with raster never authority. Vector ornament is
SVG, which is DOM, which composes with everything above. If a motif ever needs
an effect DOM cannot express, that effect is a *decoration on a region*, and
the natural carrier is a shader over a small element — not a canvas that owns
the document.

### 5.2 The precedent, and it is the tier-one inspiration's own

Paper — this lane's ruled tier-one inspiration (decision 29) — renders its
**document** as HTML/CSS and confines the GPU to effects: Paper Shaders is open
source, npm-published, and **WebGL2** (`getContext('webgl2', …)`), with no
WebGPU path (<https://github.com/paper-design/shaders>), while its Figma
comparison contrasts its real HTML/CSS canvas against Figma's proprietary
WebGL-based one (<https://paper.design/compare/figma>). A design tool — the
application class with the *strongest* case for a GPU scene graph — chose DOM
for the document and GPU for the effects, and made that split its market
position.

**One correction to Paper's framing, on the record because accuracy is cheaper
than a later surprise.** Figma's engine is no longer WebGL: it migrated to
WebGPU, with a live-session fallback back to WebGL, reported 2025-09-18
(<https://www.figma.com/blog/figma-rendering-powered-by-webgpu/>) — §3.4. So
Paper's comparison page describes a competitor's *previous* renderer. This
strengthens the split rather than blurring it: the two tools diverged along the
nature of their documents, not along fashion. Figma's document is a picture, so
it went deeper into the GPU; Paper's document is HTML, so it stayed DOM.

**The estate should reach the same split for stronger reasons**, because our
document is not a picture at all: it is a list whose order is the semantics —
which places it further from Figma's case than Paper's own document is.

### 5.3 The rule

> **The document is DOM. The GPU decorates regions. A shader may never be the
> only carrier of a fact.**

The last clause is `W-X1`/`W-X3` generalized: if a shader carries a verdict, a
user without WebGL2 loses a fact. Shaders are permitted exactly where their
absence costs nothing but atmosphere — which is also `ORNAMENTATION.md` §7.11,
no decoration that carries no claim, read from the other side.

---

## 6. Where WASM does belong here — the store, not the renderer

Decision 31(e) asks about WASM integration, and the honest answer is that the
estate's real WASM opportunity is already identified elsewhere and is not
graphical.

**Tier 2 — a writing browser store over `@effect/sql-sqlite-wasm` + OPFS.**
`FRONTEND.md:86` establishes that mechanically this is one layer:
`layerSqliteCasAt` is `Layer.mergeAll(layerStore, layerSqlRootStore())` over
`layerKvsBackend` over `KeyValueStore.layerSql({table})` over
`SqliteClient.layer({filename})` over `layerAddressSha256Live`, and **every
layer in that stack is platform-free except the last two lines**; the address
scheme is already WebCrypto (`bin/cli/store.ts:247`), which browsers have
natively. `@effect/sql-sqlite-wasm` publishes `4.0.0-rc.112` under its `rc`
tag and exports `SqliteClient.layer`, `SqliteClient.layerMemory`, and
`OpfsWorker.run` (`FRONTEND.md:21`).

**And it is gated, correctly, for a non-technical reason.** Docket Tier-2 item
17 ruled browser tier 1 (read-only `PathReader` over `fetch`) as v0 with tier 2
behind its own ruling, because a writing browser store is a **second admission
authority** running the estate's only gate in the least-controlled,
least-versioned process in the system (`FRONTEND.md:92`;
`GRILLING-DOCKET-2026-08-29.md:130-133`). Decision 32(a) reinforces this from
the other side: tier 0 is now daemon-served and read-only.

**So the sequencing is already ruled and this document does not reopen it:**
WASM enters this estate as a *store*, after a ruling, not as a *renderer*. The
two questions share only the letters.

The third WASM path — the effect interpreter as a Wasm component, or lowered to
stack switching — is Phase 6 of the standing research
(`effect-modeling-wasm-…:502-509`) and is likewise not a rendering question.

---

## 7. Recommendation

1. **Ship the DOM.** foldkit over vite is already the committed stack
   (`experiments/workbench/package.json`: `foldkit@0.154.0`, `vite@8.2.2`,
   `effect@4.0.0-rc.112`), and the generated-component path targets its
   `HtmlBuilder` with zero new fragment forms. **No canvas dependency for v0.**
2. **Virtualize the transcript with fixed row height**, which `W-D2` already
   requires for scannability and which incidentally makes windowing arithmetic.
   Treat 10⁴ rows as the stated bar (`W-D5`), not as a stretch goal.
3. **Confine the GPU to ornament**, under §5.3's rule.
4. **Do not add a second emission target** (§4.1) — this is the one that would
   be expensive to reverse, because it doubles the codegen surface the
   component register is supposed to unify.
5. **Record the falsifiable trigger** from §4.4 in the lane's record, so a
   future canvas argument is settled by measurement rather than by taste.
6. **Keep WASM on the store track** (§6), where it is already ruled and
   sequenced.
7. **Adopt the escalation ladder, named in advance** (§3.7), so that if the
   trigger does fire nobody re-runs this survey under deadline: a **WebGL2
   region** first (Baseline since 2021, and the inspiration's own choice);
   **WebGPU** only when that region needs compute, and only with a WebGL2
   fallback, because Linux Firefox and Firefox Android are still holes on the
   working group's own status page; **Canvas 2D for the document** only after
   the three measurements in §3.7 exist and fail. **Rust→WASM UI toolkits are
   refused at every rung** — the DOM-driving half for the second emitter it
   buys nothing with, the canvas-painting half because AccessKit publishes no
   web adapter and the estate's accessibility rules are consequences of its
   semantics.
8. **Take the three measurements in §3.7 the first time a real transcript
   renders**, and put them in the lane's record. They are the evidence any
   later renderer argument stands or falls on, and today they do not exist.

---

## 8. Provenance — C6

Estate citations are to `main` @ `43b59e01` at 2026-08-29 and are re-checkable
at those paths and lines.

External sources are **PENDING**: retrieved 2026-08-29 by fetch, no bytes
retained, no digest computed, nothing resolved into `.reference/provenance/`.
The per-source table is §8.1. The retrieval caveat in `ORNAMENTATION.md` §8
applies here identically and is not boilerplate — a fetch in this same
`.staging` neighbourhood previously returned a model-generated reconstruction
of a source rather than the source
(`.staging/paper-notes/PROVENANCE.md:34-46`). **No number in §3 should enter a
document a customer reads until its source is re-read directly and pinned.**

### 8.1 Sources

| Source | URL | Retrieved | Bears on | Status |
|---|---|---|---|---|
| WebGPU implementation status (working group wiki) | <https://github.com/gpuweb/gpuweb/wiki/Implementation-Status> | 2026-08-29 | §3.4 per-engine table | PENDING, no digest held. **Primary.** A living wiki page — re-read before citing, the version numbers move |
| MDN — `WebGL2RenderingContext` | <https://developer.mozilla.org/en-US/docs/Web/API/WebGL2RenderingContext> | 2026-08-29 | §3.3 Baseline since 2021-09 | PENDING, no digest held |
| web.dev — WebGPU in major browsers | <https://web.dev/blog/webgpu-supported-major-browsers> | 2026-08-29 | §3.4 Baseline framing | PENDING; **secondary**, cited only as the framing the primary page qualifies |
| Figma — rendering powered by WebGPU | <https://www.figma.com/blog/figma-rendering-powered-by-webgpu/> | 2026-08-29 (published 2025-09-18) | §3.4, §5.2 | PENDING; vendor post. Carries **no quantitative benchmark** — recorded as such, not as evidence of speed |
| Glide Data Grid — README | <https://github.com/glideapps/glide-data-grid/blob/main/README.md> | 2026-08-29 | §3.2 canvas grid scale + the accessibility caveat | PENDING, no digest held |
| AccessKit | <https://accesskit.dev/> | 2026-08-29 | §3.5 — macOS/Unix/Windows adapters, **no web adapter** | PENDING, no digest held |
| egui — README | <https://github.com/emilk/egui> | 2026-08-29 | §3.5 — "including web… experimental built-in screen reader" | PENDING, no digest held |
| Vello — README | <https://github.com/linebender/vello> | 2026-08-29 | §3.6 — self-declared alpha; web not a primary target | PENDING, no digest held |
| Paper Shaders | <https://github.com/paper-design/shaders> | 2026-08-29 | §3.3, §5.2 — WebGL2, no WebGPU path | PENDING; shared with `ORNAMENTATION.md` §8 |
| Paper — vs Figma | <https://paper.design/compare/figma> | 2026-08-29 | §5.2 — the DOM/GPU split as market position | PENDING; shared with `ORNAMENTATION.md` §8. **Describes Figma's previous renderer** (§5.2 correction) |
| TPGI — canvas and the sub-DOM | <https://www.tpgi.com/html5-canvas-sub-dom/> | 2026-08-29 | §4.2 — painted content carries no accessibility semantics | PENDING, no digest held |
| Faulkner — notes on text replacement using canvas | <https://stevefaulkner.github.io/Articles/Notes%20on%20accessibility%20of%20text%20replacement%20using%20HTML5%20canvas.html> | 2026-08-29 | §4.2 — a table in canvas fallback announces as one run of text | PENDING, no digest held |

**Two source-quality notes that are part of the finding, not caveats to it.**

1. **The primary sources here are stronger than §2's.** Four of the decisive
   facts — WebGPU's per-engine holes, AccessKit's adapter list, egui's web
   fallback, Vello's alpha declaration — come from the projects' own status
   pages and READMEs, which is the best available class short of a pin. Each is
   still C6 PENDING: no bytes retained, no digest computed.
2. **No comparative performance number is cited anywhere in §3, because none is
   published in a form that would survive this estate's claim discipline.**
   Figma reports a migration with no figure; Paper publishes no frame budget
   (`ORNAMENTATION.md` §2.3); Glide publishes scale, not latency. **The
   document therefore recommends a stack on cost, accessibility and fit — never
   on speed — and states its own measurements as owed (§3.7).** That is the
   correct shape: a renderer sits entirely inside the G5 boundary (§1), so no
   rendering choice can raise a claim gate, and no vendor's benchmark can lower
   one.
