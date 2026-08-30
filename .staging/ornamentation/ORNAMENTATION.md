# ORNAMENTATION — the design-and-aesthetics review

**Lane:** front end / ornamentation (decision 29, `docs/SPECS.md:404-410`; the
dir is decision 27e's, `docs/SPECS.md:376-378`).
**Status:** pre-grade, conception mode (C3). No claim here carries a gate
stamp. Every external source is C6 **PENDING** — see §8.
**Written against:** `main` @ `43b59e01`, 2026-08-29. (Drafted at `c042afa3`;
citations into `docs/SPECS.md` and `GRILLING-DOCKET-2026-08-29.md` were
re-resolved after decisions 28–33 landed those files — the docket was
working-tree-only at `c042afa3`, so every line number into it has moved.)

---

## 0. The position, in one paragraph

The estate has already decided most of its aesthetics and has not noticed,
because it decided them as *language* rather than as *design*. The register
split in `VOCABULARY.md` is a density rule. The closed refusal family in
`Cas.matchError` is an empty-state rule. Admission order is a reading order.
`Ts.Style` is a theme system that was ratified as content and never built
(`.staging/operational-structure/PAPERWORK-AND-PROJECTION-AUDIT.md:15`). So the
ornamentation lane's job is **not to invent a visual language**; it is to
finish reading the one the algebra already wrote, name the small residue that
is irreducibly authored, and put a byte gate under the boundary between them.
The one genuinely new position this document takes is that **trust is the
design material** — the estate's differentiator is that it can show you *why*
you should believe a row, and every ornament either carries that or is
decoration and gets cut.

---

## 1. Two things are called "Paper" and the collision is in our tree

Before anything else, a legibility defect (C7) that will cost an hour of some
future agent's life.

- **VISION.md's Paper** is [paper.design](https://paper.design) — the design
  tool, the tier-one front-end inspiration of decision 29
  (`.staging/product-sphere/VISION.md:20-21`, `docs/SPECS.md:404-410`).
- **`.staging/paper-notes/`** is *not about that Paper*. It is the estate's
  five-seats study of an **academic paper** — HILBERT (ICLR 2026), read
  2026-08-29 (`.staging/paper-notes/PROVENANCE.md:5-20`). The five pre-reads
  `01`–`05` are the five seats (S5) applied to that paper, and
  `10-workbench-requirements.md` / `11-api-contract.md` are the front-end
  design and contract notes produced in the same session.

Both are prior art for this lane and both are load-bearing, but they are
different bodies of work. **Recommendation:** rename `.staging/paper-notes/` to
`.staging/hilbert-notes/` (or `.staging/proof-session-2026-08-29/`) in the same
change that lands this lane's dir. Cost: a `grep` and ~6 pointer fixes. The
alternative is that "the Paper notes" means two things in a repo whose whole
discipline is that one word means one thing (`VOCABULARY.md` collision 4, cited
at `10-workbench-requirements.md:167`).

For the rest of this document, **Paper** means paper.design.

---

## 2. Paper, studied — what it actually is, verified

All of §2 was retrieved 2026-08-29 by direct fetch. URLs are given per claim.
Nothing is pinned into `.reference/provenance/`; see §8.

### 2.1 The document model is the target format

Paper's canvas is **real HTML/CSS/DOM**, not a proprietary scene graph. Its own
Figma comparison states the split flatly: Paper renders real CSS styles,
outlines, shadows and filters; Figma renders abstracted properties that require
translation to CSS (<https://paper.design/compare/figma>). Its landing page
claims designs export as code with nothing lost in translation
(<https://paper.design>).

This is the single most transferable fact in the whole study, and it is *not*
a fact about aesthetics. It is the **direction law** wearing a design tool's
clothes. Paper's bet is that if the editing representation and the delivery
representation are the same object, the handoff step — and every drift defect
that lives in it — stops existing. The estate made the identical bet in
`EFFECTS-BACKEND` R6/R7 and in decision 18 (every host language's typed surface
is materialized from the same codes, `docs/SPECS.md:230-236`). Paper is
independent confirmation that the bet is commercially legible, not just
formally tidy.

Two further colour facts, small but real: Paper uses OkLCH/Oklab rather than
HSB/HSL, and supports sRGB and Display-P3 *simultaneously*, per element, where
Figma has a file-wide toggle (<https://paper.design/compare/figma>). §4.1 takes
this up — it is the difference between a palette we can *compute over* and one
we can only eyeball.

### 2.2 The MCP server — the tool table, verbatim

Per <https://paper.design/docs/mcp> unless otherwise noted:

- **Transport:** Streamable HTTP, at `http://127.0.0.1:29979/mcp`. Loopback
  only. A stdio path also exists — the official plugin repo configures
  `${HOME}/.paper/bin/paper mcp` as the command
  (<https://github.com/paper-design/agent-plugins>).
- **Precondition:** the Paper **Desktop** app must be running **with a file
  open** for the server to start; it is embedded in Desktop, not a separate
  package, and is versioned in lockstep with it (both v0.5.6, 2026-08-27,
  <https://paper.design/downloads>). The MCP server is a *view onto a live
  editing session*, not a headless service over a document store.
- **Scope:** the server operates on the **currently open file**; there is no
  file-selection parameter (<https://paper.design/docs/support>). Desktop tabs
  (Aug 2026) let agents work across several files, including background ones
  (<https://paper.design/build-log>).
- **Auth:** no token; the desktop app is the authority, access is
  localhost-bound, and the agent is prompted for permission when it wants to
  call tools.
- **Distribution:** first-party plugins for Cursor, Claude Code, and Claude
  Desktop, from `paper-design/agent-plugins`. **There is no official npm
  package** — `@paper/mcp` is a 404, and every `paper*mcp` package on npm is a
  third-party bridge to the same loopback endpoint.
- **21 tools**, split 12 read / 9 write:

  | Read | Write |
  |---|---|
  | `get_basic_info` | `create_artboard` |
  | `get_selection` | `write_html` |
  | `get_node_info` | `set_text_content` |
  | `get_children` | `rename_nodes` |
  | `get_tree_summary` | `duplicate_nodes` |
  | `get_screenshot` | `move_nodes` |
  | `get_jsx` | `update_styles` |
  | `get_computed_styles` | `delete_nodes` |
  | `get_fill_image` | `finish_working_on_nodes` |
  | `get_font_family_info` | |
  | `get_guide` | |
  | `export` | |

- **What is addressable:** nodes by id, the current selection, artboards, and
  the file/page context.
- **What comes back:** JSX (Tailwind or inline styles), computed CSS,
  base64 screenshots at variable scales, and exports (PNG/JPG/SVG/MP4).
- **Metering:** MCP tool calls are the billed unit — 100/week on Free, 1M/week
  on Pro ($20/editor/month, $16 billed yearly) (<https://paper.design/pricing>).
  Paper is generally available — the strings "alpha", "beta", and "waitlist"
  appear on none of the product pages — and the MCP is on every tier. Desktop
  plus the MCP shipped March 2026 (<https://paper.design/build-log>).

### 2.3 Where Paper's MCP docs are thin — said plainly

The brief asked for this to be stated rather than padded, so: **on four
questions the documentation is silent, and I could not resolve them.**

1. **Change detection.** No mechanism is documented by which an agent learns
   what changed since its last call. There is no revision number, no cursor, no
   diff tool in the table. PENDING.
2. **Locks or leases.** None documented. `finish_working_on_nodes` clears a
   *working indicator* — a visual affordance — and the docs do not describe it
   as releasing a claim. PENDING whether any exclusion exists underneath.
3. **Undo, history, versioning, multiplayer conflict.** Entirely unmentioned in
   the MCP docs. The version-control story the docs actually give is
   **external**: set up git in the folder and commit
   (<https://paper.design/docs/mcp>). Nor is there an undo *model* anywhere in
   the product docs — only incidental changelog lines about undo not clearing
   redo history, which imply a conventional linear undo/redo stack and state
   nothing (<https://paper.design/build-log>). The multiplayer *features* are
   documented (cursors, follow, comments, presence) and the sync mechanism —
   CRDT, OT, server-authoritative — is not stated anywhere. For a multiplayer
   design tool this is a striking silence, and §5.8 argues it is the place
   where the estate is structurally ahead rather than behind.
4. **Node id stability — partly answered, and the answer is deliberate.**
   `move_nodes` repositions or reparents **preserving ids**, and
   `duplicate_nodes` returns new ids plus a descendant id map
   (<https://paper.design/docs/mcp>). So identity survives the two operations
   that most often break it, and Paper clearly designed for that. What remains
   PENDING is whether an id survives a reload, a file copy, or another user's
   concurrent edit — and there is **no published file-format or persistence
   spec** to answer it from. This is the joint §5.4 contrasts against
   content-addressing.

Also PENDING, and not from the MCP docs: any latency, frame-budget, or
input-lag figure. Paper's comparison page makes **no** performance claim
(<https://paper.design/compare/figma>), and the only rendering-engineering
material I found is a shader post about making effects fast and tweakable
(<https://paper.design/blog/retro-print-cmyk-halftone-shader>). **So I cannot
tell you what makes Paper's canvas feel fast, because Paper does not say.**
Anything this document asserted about their frame budget would be invention.
What *is* documented and inspectable is the tool table, the token model, and
the positioning — and that is what §5 borrows from.

### 2.4 Tokens, and the hole in them

Per <https://paper.design/docs/tokens>: ten token types (color, radius,
spacing, container, breakpoint, and five typographic), added by name and value
in a Theme tab, with edits propagating to everything using the token. They map
onto Tailwind's CSS-variable model and can be copied into a CSS theme file.
Theme *modes* ("dark", "compact") are roadmap, not shipped
(<https://paper.design/roadmap>).

And then the sentence that matters most to this estate: tokens copied between
files **do not update when changed in another file**
(<https://paper.design/docs/tokens>).

That is a token system with **no identity for a token**. A token is a name plus
a value in a file; copying it produces a second, unrelated token that merely
looks the same. Every design system ever built has this defect and treats it as
an operations problem to be solved with governance. **The estate does not have
to have it**, because R6 already ratified `Style` as *digested content* —
addressed by the digest of its own bytes, so two files holding the same theme
hold the *same object* by construction
(`library/cas/EFFECTS-BACKEND.md:96-105`, cited in
`.staging/operational-structure/PAPERWORK-AND-PROJECTION-AUDIT.md:15`). §6.3
turns this into the lane's cheapest real deliverable. Paper's own docs are the
falsifier that says the problem is real and unsolved by the market leader.

### 2.5 The philosophy, and the one line worth keeping

Paper's position piece argues that the canvas became disconnected from
production, that agent-era teams over-corrected into pure conversation, and
that a canvas should be a productive medium rather than a representational
mockup (<https://paper.design/blog/a-real-space-to-design-in-the-age-of-agents>).
The argument's sharpest move is about *chat as an interface*: spatial layout
"keeps multiple futures visible at once" in a way a transcript cannot (ibid.).

Take that line seriously and it is an argument **against** the estate's own
ruled v0 surface, because our ruled surface is a transcript — the terminal is
the word (`.staging/paper-notes/10-workbench-requirements.md:25`). §5.7 answers
it, and the answer is not "Paper is wrong"; it is that the estate has a
*better-founded* version of the same thing (`W-U3` fork-by-prefix,
`10-workbench-requirements.md:334-338`) and has not built it.

Paper raised $34M in July 2026 (<https://paper.design/blog/series-a>), which is
context for how seriously to take the positioning, not evidence for any claim.
The same post asserts that independent benchmarking finds Paper's agent flows
faster, more accurate, and cheaper in tokens than other design tools' — **and
names no benchmark, no methodology, and no third party.** I could not locate
one. Recorded here as an uncited vendor claim and as a small object lesson: it
is exactly the sentence shape `CLAIM-GATES.md` exists to stop us writing.

### 2.6 The property panel is a lossy view over a style bag — the best single steal

The subtlety worth the whole study is buried in Paper's changelog: they shipped
an **"Other styles" panel to view all agent-added styles that aren't editable
properties yet** (<https://paper.design/build-log>).

Unpack it. Paper's substrate is CSS — the full, open-ended property space. Its
inspector is a curated set of panels (Layout, Flex, Radius, Blending, Fill,
Outline, Filters, Constraints, Stroke, Shadow) that covers the properties a
designer manipulates by hand. An agent writing through `update_styles` or
`write_html` can set **any** CSS property, including ones no panel knows. So
the panel is *structurally* a lossy projection of the node, and Paper's answer
is not to hide the residue or to widen the panel indefinitely: it is a panel
that shows you the styles it cannot edit, labelled as such.

**That is `W-S2`, independently derived by a commercial team under production
pressure** — the detail view must be able to say "I cannot show you this", and
unknown is rendered as unknown at full weight
(`.staging/paper-notes/10-workbench-requirements.md:197-201`). The estate ruled
it from the algebra (the refusal family is closed, so the rendering is
exhaustive rather than a fallback); Paper arrived at it from experience. When
two independent derivations meet, the rule is load-bearing. **Elevate `W-S2`
from a requirement to a design principle of the lane:** every panel in the
product declares its own coverage, and the residue is a first-class rendering.

Three smaller facts from the same source, each a useful calibration:

- **Components are not shipped at Paper.** "Components with slots… including
  support for props and slots" is *coming soon*; "use your code components" is
  *in progress* (<https://paper.design/roadmap>). The estate is not behind on
  the component-model question — the tier-one inspiration has not answered it
  either, and our answer is derived from a described kind rather than designed.
- **Agent presence is a first-class multiplayer citizen.** Teammate *and agent*
  presence in file, cursor follow, cursor chat, comments
  (<https://paper.design/build-log>). Agents are drawn, not logged. §5.1.
- **The GPU is confined to effects, not to the document.** Paper Shaders is
  open source, npm-published, and **WebGL2** (`getContext('webgl2', …)`), with
  no WebGPU path (<https://github.com/paper-design/shaders>). The *document*
  renders as DOM. That split is the central finding of `WASM-CANVAS.md` beside
  this file, arrived at independently.

---

## 3. What the algebra has already decided (the inherited ruleset)

These are not proposals. They are decisions already in the record that this
lane inherits and must not silently re-open.

| Rule | Where it was decided | What it settles visually |
|---|---|---|
| Hue is reserved for verdicts; one saturated colour, spent on `owed` | `experiments/workbench/src/styles.css:1-13` | the entire palette question |
| Exactly two resolution levels; the boundary is the everyday/protocol register split | `10-workbench-requirements.md:119-125` | density, collapse, what a row is |
| Uniform row height; variability in fixed-width gutters | `10-workbench-requirements.md:127-131` | scannability at 10³ rows |
| Three gestures: expand, focus, descend. Hover carries no information | `10-workbench-requirements.md:133-143` | the whole interaction vocabulary |
| The resolution knob is a predicate, not a slider; the view is reconstructible from its URL | `10-workbench-requirements.md:145-148` | filtering, sharing, deep links |
| One detail view, four slots, every substrate | `10-workbench-requirements.md:191-195` | the inspector's shape |
| Completed rows never re-render | `10-workbench-requirements.md:78-81` | motion budget, layout stability |
| Where the model computes nothing, render `—`, never `0` | `10-workbench-requirements.md:219-220` | every empty cell in the product |
| Fixed layout under a `Style` value; no width-adaptive grouping, ever | `library/cas/Cas/Backend/Ts.lean:10-14` | generated code's look, and diffs |
| Generated viewer is the default; an authored component is a registered override, never a fork | ratified: decision 28 over docket Tier-2 item 17 (`GRILLING-DOCKET-2026-08-29.md:130-133`), under decision 21's addendum (`docs/SPECS.md:270-279`) | the generated/authored boundary |
| Browser tier 1 (read-only `PathReader` over `fetch`) is v0 | ratified, same item | what the front end may do |
| Tier 0 is **daemon-served and read-only**: `/projections` is released to the daemon | decision 32(a), `docs/SPECS.md:432-435` | where the emitted artifacts come from |
| Refuse the graph view | `.staging/operational-structure/FRONTEND.md:282` | the most-requested wrong feature |

**Note on decision 32.** `FRONTEND.md:78-80` costed tier 0 as "read projections
+ speak the tool table to a local `cas`", blocked on FE-B4 (no HTTP transport).
Decision 32 releases `/projections` to the daemon, so tier 0 is now *served*
rather than *static*, and the front end's first real dependency is a route
rather than a build step that copies JSON into an asset tree. Two consequences
this lane must carry: (i) the read-only property now has **two** enforcement
sites, not one — the daemon's route and the browser bundle's module graph
(`PROOF-OBLIGATIONS.md`, FE-O6); (ii) a served projection can be *stale* in a
way a copied file cannot, which makes `W-E2`'s `Stale` state
(`10-workbench-requirements.md:350-354`) load-bearing on day one rather than
later. §7.4 refuses the shimmer precisely because `Stale` is the honest answer.

The remainder of this document adds to that list only where the list is silent.

---

## 4. The aesthetic direction

### 4.1 Ink, and one hue — but computed, not picked

`styles.css:1-13` declares tone only and deliberately withholds the palette,
because spending the accent in a skeleton would settle a decision belonging to
whoever designs the verdict surface. This lane is that seat. The position:

> **The palette is a small computed object in OkLCH, not a list of hex
> values, and its correctness properties are checkable.**

Concretely. Neutrals are one lightness ramp at chroma ~0. Verdicts are one hue
family at a fixed chroma, separated only in lightness, so that
**`W-X1` greyscale legibility (`10-workbench-requirements.md:379-381`) becomes
arithmetic rather than a screenshot review**: if two verdict colours differ in
OkLCH `L` by more than the threshold, they survive greyscale, and a unit test
can say so. In HSL that check is not expressible, which is why Paper's move to
Oklab (§2.1) is worth copying — not for prettier gradients, for *decidability*.

The existing tokens stay as the neutral ramp
(`experiments/workbench/src/styles.css:17-31`: `--paper`, `--ink`,
`--ink-soft`, `--rule`, `--measure: 62ch`, with a `prefers-color-scheme` dark
block). What is added is exactly one saturated hue and a rule for spending it.

**The spending rule.** Saturation marks **a claim the system is making about
itself**, and nothing else:

- `owed` / `refused` / `stale` — saturated. Something is not settled.
- `admitted` / `verified` / `done` — **ink**, never green. A green check is the
  most over-spent pixel in software; here, "the row exists and is addressed" is
  already the strongest statement the system can make, and it should look like
  a fact, not like praise.
- `running` — ink, plus the only motion in the product (§4.5).

That asymmetry is the aesthetic thesis in miniature: **this product is
loud about doubt and quiet about certainty**, which inverts the industry
default and is the correct inversion for a system whose refusals carry their
clause (`bin/cas.ts:31`, cited at `FRONTEND.md:252`).

### 4.2 Trust as a design material — the four marks

The estate can say things about a row that generic tools cannot
(`FRONTEND.md:244-254`). That capability is invisible unless ornament carries
it. So define exactly **four trust marks**, and refuse a fifth:

1. **Addressed** — the row's identity is the digest of its own bytes. The
   address chip *is* the mark; no separate badge. `W-A1` already rules the chip
   a control (`10-workbench-requirements.md:285-288`).
2. **Verified-here** — the digest was recomputed in *this* process on *these*
   bytes, not accepted from a host. This is a real distinction the substrate
   already makes (`PathReader` treats the serving host as untrusted by
   construction, `FRONTEND.md:56`), and it is currently invisible to a user.
   One mark, in the gutter, and it is the most honest pixel in the product.
3. **Gated** — this value was emitted from a described value and a byte gate
   guards it (`emitgrammar --check` and its eleven siblings in `check:cas`,
   `mise.toml:441`). A gated row is one nobody typed.
4. **Owed** — the saturated one. A statement the estate has made that no gate
   or theorem backs yet, carried in the UI at the same weight as the fact it
   qualifies (`FRONTEND.md:256-262` is the model list; `PROOF-OBLIGATIONS.md`
   beside this file is the front end's own).

Everything else — timestamps, counts, sizes — is *data*, rendered as data, and
gets no mark. The discipline: **a mark is a claim, and every claim names its
gate.** That is C5 applied to pixels, and it is the sentence I would put on the
lane's wall.

### 4.3 Density is derived, and the derivation is the product's best trick

`W-D1` is already the strongest "our language gives us the UI" claim available
(`FRONTEND.md:280`), and the reason it is strong is that it is *falsifiable*:
the row count of a collapsed transcript equals the count of bindings whose sort
is in the everyday register (`10-workbench-requirements.md:122-125`).

This lane adds one thing: **make the derivation visible, once.** A single line
in the density control that reads, in effect, *"showing 41 of 203 — the 162
hidden are protocol-register sorts (node, payload, tag, …); the fix is to land
the verb, not to widen the view."* It costs one sentence and it converts the
product's central design decision from an unexplained behaviour into a teaching
moment. Users forgive a rule they can see the shape of.

**Data-dense but practical, made concrete.** The bar is that a level-1 row
carries five fields in one line at uniform height (`W-D2`,
`10-workbench-requirements.md:127-131`) and that 10³ rows are scannable without
zoom. Against that bar, three ornaments earn their space and no others do:
the verdict gutter (1ch), the address chip (constant width), and the
right-aligned spend column. Rules between rows: none — use the ramp, one step
of `--paper` alternation at most. Grid lines are ornament that carries no
claim, and §7 refuses them.

### 4.4 Typography: two registers, three carriers

`--measure: 62ch` is declared and stands. The mono/serif split (machine-checked
vs informal) is a real signal but `W-X3` already rules it insufficient alone
(`10-workbench-requirements.md:385-387`). So:

- **Monospace is confined to addresses, hex, and machine fields.** It is not
  the product's voice. A workbench that is monospace everywhere looks rigorous
  and reads worse; the estate's prose surfaces read well already
  (`PLAIN-LANGUAGE.md:231`, cited at `FRONTEND.md:274`) and deserve a text face.
- **Three carriers per distinction, always**: shape (case/weight), position
  (which gutter), and a word. Never colour alone, never typography alone,
  never a one-character glyph alone (`W-X1`, `W-X4`).
- **Numerals are tabular everywhere.** A column of costs that jitters is a
  density defect, not a taste one.

### 4.5 Motion: only spend

One rule, inherited and endorsed: no motion except in-flight operations —
determinism of the answer does not license invisibility of the spend
(`10-workbench-requirements.md:265-270`, cited at `FRONTEND.md:296`). `W-T4`
makes this cheap to hold: completed rows never re-render, so there is nothing
*to* animate. The `running` status is a first-class value
(`library/cas/Cas/Lang/Interp.lean:42-46`: `done | running | refused`), and
`W-T3` demands a rendering for `running` that is not a spinner and that offers
"continue with more fuel" (`10-workbench-requirements.md:73-76`). **Fuel is the
progress bar.** That is a genuinely unusual and honest affordance and it should
be the product's signature motion, if it has one at all.

### 4.6 The book, not the dashboard

Rule 1 of `FRONTEND.md:273-274` — reading the estate should feel like reading a
book, and it is mechanical rather than a mood: the emitted Markdown surfaces
(`REGISTRY.md`, the lift manifest doc, the owed `LITERATURE.md`) are first-class
UI content, and the **default** surface for a described kind is its prose
projection, with the structured view as the second click. Endorsed without
change. This is the aesthetic direction's largest single commitment and the one
most likely to be eroded by a well-meaning contributor adding a dashboard.

---

## 5. Paper's subtleties, translated

Each row: what Paper does (cited), the underlying subtlety, and what the estate
should do with it. **Translated, not copied** (decision 29).

### 5.1 The working indicator — agent presence is rendered on the artifact

Paper's write tool set ends with `finish_working_on_nodes`, whose documented
effect is to clear a *working indicator* from artboards
(<https://paper.design/docs/mcp>). Read that as a design decision, not an API
wart: **when an agent is operating on a region, the region says so, and the
agent is responsible for saying it stopped.** Presence is on the object, not in
a sidebar.

**Estate translation.** The estate's analogue is not a lock (nothing needs
locking — the store is grow-only and re-insertion of identical bytes is the
identity, `KvsBackend.ts:20-24` via `FRONTEND.md:52`). The analogue is
**attribution on the row**: which agent's `cas_run` admitted this binding, drawn
in the row's own gutter, not in a separate activity feed. The estate is
better placed than Paper here because agent activity *is already content* —
decision 22's "work as content" and VISION's press-6 ruling
(`.staging/product-sphere/VISION.md:41-43`) say tasks, dispatches, and rulings
live on the same plane. Paper has to invent an indicator; we have a binding.
**Owed:** nothing renders it. Recorded as a proof obligation candidate
(FE-O11).

### 5.2 `get_guide` — the tool table teaches its own use

Paper ships `get_guide` as a *tool*: an agent asks the server for the workflow
document for a topic (<https://paper.design/docs/mcp>). The documentation is
inside the protocol, not beside it.

**Estate translation.** This is the ruled slogan — "we teach others to speak
ours" (`docs/SPECS.md:276-279`) — with a mechanism attached, and it is
*cheaper* here than at Paper because our teaching artifacts are already emitted
and byte-gated: `manifest.json`, `REGISTRY.md`, `cas-tools.json`,
`cas-surface.json` (`FRONTEND.md:105-113`). The move is to add one row to the
tool table that returns the emitted register for a named plane, so an agent
that has the tool table has, transitively, the *whole vocabulary*. **Position:
do it, and emit the tool row like every other one** — a hand-written guide tool
would be exactly the hand-maintained derived surface P4 forbids.

### 5.3 The document model is the target format — and ours already is

§2.1. The estate's version of Paper's bet is stronger, and the front-end lane
should say so precisely rather than loosely: Paper's canvas *is* HTML, so
export is not a translation. The estate's component *descriptor* is a described
value, so a component's source is not a translation either — the emitted
foldkit view needs **zero new `Ts.Expr` forms**, because
`h.li([h.Class("owed-item")], [...])` is already `call (ident "h.li") [arr […],
arr […]]` over the existing fragment (`FRONTEND.md:145`, against
`library/cas/Cas/Backend/Ts.lean:29-43` and the workbench's own view at
`experiments/workbench/src/main.ts:100-135`).

**The honest asymmetry, which must be said out loud:** Paper's canvas is
*editable* in the target format; ours is not. `Html = VNode | null` is an
opaque runtime object, so a component cannot be store content the way a schema
code is — **what is store-resident is the descriptor; what is emitted is the
source** (`FRONTEND.md:169`). Anyone who says "components as CAS content"
means the descriptor. Say it before someone designs the wrong thing.

### 5.4 Selection is addressable — and here we win outright

Paper exposes `get_selection` and addresses nodes by id, and works to keep
those ids stable — `move_nodes` preserves them across reparenting,
`duplicate_nodes` hands back a descendant id map
(<https://paper.design/docs/mcp>). That is careful engineering, and it is
*machinery the estate does not have to build*, because it exists to hold a
name and a thing together across edits. There is still no published
persistence format to say whether an id survives a reload or a concurrent edit
(§2.3). That joint — the agent's reference going stale under the human's
hands — is the fragile one in every agent-plus-design-tool integration.

**Estate translation.** The joint does not exist here, because the name *is*
the content. But there is a real design consequence the lane must honour:
`W-A2` rules prefix addressing **input-only**, resolving against the current
word and never the store, because the store is grow-only and network-shared, so
a prefix unique today is not unique tomorrow
(`10-workbench-requirements.md:289-294`). Git-style short hashes are the
obvious move and they are wrong here. Combine with `W-A1`: full 64 lowercase
hex on copy, never the abbreviation. **The abbreviation is a rendering; the
address is the value.** Every design tool blurs that line; we may not.

### 5.5 Permission is per-call, and the docs recommend asymmetric trust

Paper's docs say the agent asks permission when it wants to call tools, and
recommend "always allow" for read-only servers while advising selective
approval for write-capable ones in an existing project
(<https://paper.design/docs/mcp>).

**Estate translation.** The estate should *not* build a per-call permission UI,
and the reason is a real structural advantage rather than laziness: the gates
carry all trust and admission is at `put` (R15, via `FRONTEND.md:233`), and
`cas_run`'s document **structurally cannot** spell a load or a literal address
— both pinned by theorems (`RunRef.ofPRef_lit`, `RunInstruction.ofPLine_load`,
`Cas/Backend/Mcp.lean:33-38`, via `FRONTEND.md:233`). The current surface is
already the narrowest possible sandbox. What the UI owes instead is the
**pre-flight**: `W-L1` demands one key that turns any affordance into its
program text before it runs (`10-workbench-requirements.md:207-213`), and
`ProgProse` already verbalizes an envelope computed from the table alone, as a
projection rather than a generation
(`library/cas/Cas/Backend/ProgProse.lean:6-14`). **So the estate's answer to
"do you approve this tool call" is not a dialog: it is a sentence, generated,
byte-gated, saying what the program will do.** That is a materially better
consent surface than the industry's, and it is 90% built.

### 5.6 MCP calls are metered — and metering is a UI plane we lack

Paper bills MCP tool calls: 100/week free, 1M/week Pro
(<https://paper.design/pricing>). Ignore the pricing; keep the *shape*. A tool
call is a unit of spend, and a product that renders spend teaches its users
what things cost.

**Estate translation.** `W-L2` already rules that where the model computes
nothing the UI renders the absence, and names the exact gap: `handleLlm`
records no meter, so the cost column reads `—`
(`10-workbench-requirements.md:215-220`). The docket's item 6 (`METER infer`,
[c7]) would close it by making R15's answer-as-recorded-content a law of the
handler rather than a convention of the example
(`GRILLING-DOCKET-2026-08-29.md:198-200`). **Position: the spend column ships
in the row grammar from day one, reading `—`.** An empty column that is honest
is a specification; a column added later is a redesign.

### 5.7 "Multiple futures visible at once" — the one real challenge to our v0

Paper's strongest argument is against the transcript as an interface
(§2.5). The estate's ruled v0 *is* a transcript
(`10-workbench-requirements.md:25`), so this deserves an answer rather than a
dismissal.

**The answer.** The estate already has the object Paper is reaching for, and it
is better founded than a canvas of alternatives: a session's word is a *value*,
and `run` takes a word and returns a word, so "go back to #0044 and try
differently" is taking the word's prefix through #0044 and running a different
program over it — `W-U3`, fork by prefix
(`10-workbench-requirements.md:334-338`). Forks are values; they can be
compared by construction, because two words agreeing are byte-equal. Paper's
multiple futures are multiple *pictures*; ours are multiple *values*.

**But we have not built it, and it rests on an unnamed corollary.** `W-U3`'s
own PENDING obligation says "every prefix of an admitted word is admitted" is
not a named lemma — it follows from `Word.wfFrom_append` by one `Bool.and`
elimination, and it should be named on the Lean side before fork ships, because
fork is the product's entire undo story
(`10-workbench-requirements.md:340-344`). Carried as FE-O7.

**Design consequence.** Take Paper's spatial insight only this far: the fork
list is a *second* column beside the transcript, showing sibling words by their
divergence point and their first differing binding. Not a canvas. Not a graph
(`FRONTEND.md:282`). A list, in admission order, because order is the
semantics.

### 5.8 No undo, no history, no version model in the MCP — our largest inherited win

§2.3 item 3: Paper's MCP documents no undo, no history, no versioning, no
multiplayer conflict story, and points at **git** for version control
(<https://paper.design/docs/mcp>). This is the market leader in agent-native
design tooling telling you, in its own documentation, that the hard problem is
unsolved and delegated.

**Estate translation.** The estate's answer is not a feature; it is the
substrate. There is no merge function because there is no pair of distinct
values that can share a key (`FRONTEND.md:63`). The word *is* the history. The
transcript *is* the version model.

**And the honest counterweight, which this lane must keep saying:** that answer
is true of the model and **not yet true of the running system**. `cas_run`'s
reply is the word for that call and nothing persists it; the estate cannot hand
a user their own history until the word ships (`FRONTEND.md:258`). Decision 26
seat 3 built it with theorems and it is in merge (`GRILLING-DOCKET`, STRUCK
list: "FRONTEND 5 (cas_word) — built with theorems, in merge (704a4eb9)"). So
this is the lane's single largest dependency, and its status is *landing*, not
*owed*. The ornamentation lane should design against the word and be prepared
for the merge to move.

### 5.9 Tokens have no identity — and R6 already fixed it

§2.4. Not repeated; the deliverable is §6.3.

---

## 6. How ornamentation is *generated* from the algebra

### 6.1 The precedents, and what they license

Three emitters have already executed the move this lane needs, and the claim
should be made in their idiom rather than freshly argued:

- **`EmitLayer`** — "The ratified claim that layer generation needs ZERO new
  fragment forms is executed here rather than restated"
  (`library/cas/Cas/Backend/EmitLayer.lean:22-24`). It also names the three
  DERIVED things — the expression, the declared type, the import list — and
  states the one real constraint the derivation imposes (a dotted reference's
  first segment must be a real named export, `EmitLayer.lean:37-45`). That is
  the shape a component emitter's docstring should have.
- **`ProgProse`** — a *projection*, not a generation, so the byte gate over the
  generated programs checks it for free; and it states in the same file exactly
  what the envelope cannot say (`ProgProse.lean:6-14`, `:23-35`). **This is the
  model for prose ornament**: derived, gated free, self-limiting out loud.
- **`emitgrammar`** — one described value (`Cas.Grammar.manifestV0`) rendered
  to two surfaces, `manifest.json` for front ends and `REGISTRY.md` for humans,
  both byte-gated, neither hand-maintained
  (`.staging/operational-structure/PLAIN-LANGUAGE.md:135`;
  `library/effects/src/cas/generated/grammar/kindTags.ts:1-18`).

**The component register is the fifth instance of that pattern**, after
grammar, lift, MCP, and literature. It is not a new kind of thing, and the
lane should refuse to describe it as one. That is decision 21's addendum read
literally — a described kind's canonical code determines its component the way
it already determines its wire mirror, admission row and prose, and the
component register is itself a gated manifest so third-party front ends learn
the UI vocabulary the way agents learn the tool vocabulary
(`docs/SPECS.md:270-279`).

### 6.2 What a component-manifest row carries

`FRONTEND.md:179` proposes `library/cas/surface/components.json` beside
`grammar/manifest.json`, with rows
`{ kind, tag, view: {name, module}, props: [{name, code}], edges: [{field,
kind}], overridden: bool }`. Endorsed, with four amendments this lane owes:

1. **`overridden` must not be a boolean.** A boolean records that a hand wrote
   something; it does not record *what*, and P4 forbids a hand-maintained fact
   about generated material. Make it
   `override : Option { module : String, address : Hex }` — the override names
   the *file node's address*, so the register says which bytes overrode which
   kind. A stale override is then a dangling reference and the gate catches it.
2. **Every row carries its `style` address.** §6.3. Without it the register
   describes structure and lies by omission about presentation.
3. **Every row carries its `prose` slot** — the kind's plain-language
   projection, so the "prose first, structure second click" rule (§4.6) is a
   *fact of the register* rather than a convention of the renderer. This is
   what makes `registers_agree` extensible to views (FE-O3).
4. **Rows are emitted in the manifest's own order**, which is tag order, and
   arm order within a union is not a design choice because order is identity
   (decision 4, via `FRONTEND.md:154`). A component register sorted
   alphabetically for readability would be a second spelling of the identity.

The derivability table at `FRONTEND.md:151-160` is endorsed as written,
including its honest last row: layout, density, emphasis, gesture, and what
deserves a whole screen are **irreducibly authored**. This lane's job is to
keep that row short and to keep everything above it out of human hands.

### 6.3 `Style` as content — the lane's cheapest real deliverable

The state of play, exactly: R6 ratified L3 rendering under the
Substance/Denotation/Style split with `Style` as **digested content from the
first slice** (`library/cas/EFFECTS-BACKEND.md:96-105`). What exists is
`library/cas/Cas/Backend/Ts.lean:19-26` — `structure Style where indent : Nat
:= 2; quote : Char := '"'` and `def house0 : Style := {}`. A plain Lean record.
No `cas_struct`, no address, no `put`. The paperwork audit calls this a
ratified-law drift and warns that the front-end lane will otherwise re-mint a
theme system out of band **and be correct to do so**
(`PAPERWORK-AND-PROJECTION-AUDIT.md:15`, `:52`, `:138`).

**Position: discharge R6's clause in this lane, and grow `Style` in the same
act.** Two moves, in order:

1. **Address the record that exists.** `Style` becomes a described value with a
   `cas_struct` code and an address; `house0` is a *published root*, not a
   default. Cost is small; the gate is the existing `emitgate`/`materialize`
   pattern. This alone closes D7 and needs no new ruling — only the discharge
   of an old one.
2. **Then grow it consumer-gated, exactly as R6 requires.** Today's two fields
   (`indent`, `quote`) serve the code printer. The UI's ornament values —
   the neutral ramp, the one verdict hue in OkLCH, the measure, the row height,
   the gutter widths — are the same *kind* of thing and belong in the same
   carrier, added only when an emitter consumes them. **Do not mint a second
   theme object for the browser.** The estate would then have two Styles, which
   is precisely Paper's token defect (§2.4) reproduced by our own hand.

The dividend, stated so it can be checked: a theme is then an *address*. "Which
theme is this screen rendered under" has a 64-hex answer, two products holding
the same theme hold the same object, and a theme change is a new address rather
than an edit. No design system on the market can say that, and the estate can
say it for roughly the cost of one `cas_struct`.

### 6.4 The generated/authored boundary, and why it is not a placeholder

Ratified — decision 28 over docket Tier-2 item 17
(`GRILLING-DOCKET-2026-08-29.md:130-133`): generated-viewer-default,
authored-override.
`FRONTEND.md:164` states the discipline in the estate's own idiom and it should
be quoted into the lane's charter: a kind with no override renders through its
generated viewer, and **that is not a placeholder — it is the truthful
rendering of a kind nobody has designed yet**, on the same discipline as "the
column reads `—`, never `0`."

The aesthetic consequence is worth naming because it is unusual: **the
generated viewer must be designed to look finished.** If the default viewer
looks like scaffolding, every kind acquires an override for cosmetic reasons,
the authored set grows without bound, and the register stops meaning anything.
So the generated viewer gets the *full* type treatment — the measure, the
gutters, the trust marks, the prose-first ordering — and an override must earn
itself by doing something the generator structurally cannot (§6.2, last row of
the derivability table). **An override that only changes colours is a defect
and the register should make it visible**, which is the fourth argument for
amendment 1 in §6.2.

### 6.5 The ornament grammar — assessed, and what this lane absorbs

A Codex synthesis is on record as optional input to this lane
(`COORDINATION.md`, "Input on record"; pre-grade, no trust contribution). It
proposes **one addressable ornament grammar** rather than a CSS theme:
`MotifNode` (a canonical geometric DAG) plus `Ornament` (semantic placements)
as candidate described kinds; three related families (Prairie Ledger = order,
Light Screen = boundaries/projection/lift, Taliesin Bloom = memory/earned
completion); a precedence chain foundation → datum → joint → cadence → sign →
bloom → light/motion; denotation-first with per-surface projections; raster
never authority. This lane owns the call. **Verdict: absorb the spine, absorb
one family derivation conditionally, refuse the free-standing carrier, and hold
the families as authored until a derivation is produced.** Reasoning follows.

**ABSORBED — three counts, into this lane's direction.**

1. **Denotation-first, raster never authority** is not a stylistic preference;
   it is P4 and the direction law, and it is the same argument this document
   makes at §7.8 (no screenshot-shaped export) and §2.4 (Paper's tokens have no
   identity because they are values in files rather than addressed objects).
   An ornament that is an addressed vector denotation *cannot* drift between
   two surfaces. That is a real and unusual property and it is worth building.
2. **Geometry as a canonical DAG is a good fit, not a stretch.** Path data is a
   tree; canonicalization-at-the-door is a solved problem in this estate
   (Tier-1 item 5, CANON-1); and identity-by-digest gives motif reuse for free
   the way `putTree_correct`/F2 gives shared-subterm dedup for free
   (`.staging/paper-notes/00-postread-coordinator.md`, §2). The estate's
   machinery genuinely applies here.
3. **"Ornament = semantic placements" resolves my §7.11 rather than colliding
   with it.** I refuse decoration that carries no claim. The grammar's own
   framing says a placement is semantic. **Then that is the grammar's admission
   test, and it should be written into the grammar itself:** every placement
   names the claim it carries — which register, which verdict, which boundary,
   which trust mark (§4.2) — and a motif with no claim is not admitted. Stated
   that way the two lanes are one lane.

**CONDITIONS AND REFUSALS — four, and they are this lane's rulings on the
input, not questions passed back.**

1. **Kinds, not sorts — say it explicitly.** Decision 23 ratified "new kinds
   yes, new sorts NO — the sort registry's stillness is the discipline"
   (`docs/SPECS.md:317-318`). `MotifNode` and `Ornament` are admissible as
   *described kinds over existing sorts* (struct/union/arr over `Ast`) at
   roughly zero cost. If either needs a **new wire tag** for geometry, that is
   a versioning event and a separate, much larger ask that must be argued on
   its own and carried through the working-tag process. The proposal must state
   which it is on its first page. My expectation: no new tag is needed, and
   claiming none is needed is a stronger proposal than leaving it open.
2. **Name the consumer, or R6 refuses the growth.** The fragment grows *only
   with a real consumer* (`library/cas/Cas/Backend/Ts.lean:4-5`), and the
   estate's standing posture is to consolidate rather than mint. **Gate the
   grammar's admission on one emitter consuming one motif in one generated
   viewer** — the same bar `EmitLayer` met. An ornament grammar with no emitter
   is a beautiful un-consumed abstraction, and this estate has a rule against
   exactly that.
3. **Three families need a three-valued thing in the algebra, or an honest
   "authored" label.** My §4.3 position is that density has exactly two levels
   *because the language has two registers* — the strength of that rule is that
   it is derived. Three families with no derivation is an authored choice, and
   authored choices are allowed (§6.2's derivability table has a whole row for
   them) but must be *labelled* so nobody later mistakes taste for law. That
   said, there is a candidate derivation sitting right there and I would take
   it if it holds: **the estate declares exactly three transformations of
   record — projection, lift, and the human semantic projection**
   (`AGENTS.md:78-81`). Codex's Light Screen is already glossed
   "boundaries/projection/lift". If the three families are the three
   transformations wearing visual clothes, the proposal stops being a mood
   board and becomes a projection of the estate's own law. If they are not,
   say so and label them authored. Either answer is fine; drift is not.
4. **One carrier, or we have reproduced Paper's defect by our own hand.** §6.3
   asks this lane to discharge R6 by making `Ts.Style` addressed content and
   growing it consumer-gated. The ornament grammar is a *larger* version of the
   same object. **They must be one carrier.** If the estate ends the week with
   an addressed `Style` for the printer and a separate addressed ornament
   grammar for the UI, we will have built two theme systems that cannot see
   each other — which is precisely the defect I documented at Paper in §2.4 and
   held up as the thing content-addressing prevents. The precedence chain in
   particular is an authored total order and belongs *in that carrier*, not in
   CSS. **Ruled for this lane: there is exactly one addressable presentation
   carrier. `Style` grows into it, or the grammar subsumes `Style` and R6's
   clause is discharged by that act — but a second theme object is refused.**
   A free-standing ornament carrier beside `Style` is the one version of this
   proposal this lane will not build, because it is Paper's token defect (§2.4)
   reproduced by our own hand after we documented it.

**What this leaves owed, to this lane and no one else.** A palette
*specification* behind §4.1's position — actual values, contrast measurements,
P3-to-sRGB and print behaviour, colour-blind and greyscale checks — and an
assets pass over the motif vocabulary if the grammar clears conditions 1 and 2.
Both are second slices, sequenced after `PROOF-OBLIGATIONS.md` and
`WASM-CANVAS.md`, and both land as this lane's own files. Nothing in §4.1 or
§6.5 waits on another producer.

---

## 7. What we refuse

1. **No hand-maintained view of a generated fact.** P4, and it is the whole
   discipline. If the screen shows a kind, an arm order, a tag, a tool, a
   theorem, or a register row, it read it from an emitted, byte-gated artifact.
   A hard-coded list of kinds in the front end is the defect this lane exists
   to prevent.
2. **No graph view of the DAG.** Held from `FRONTEND.md:282`: it replaces a
   proved carrier (a list, whose order is the semantics) with an unproved
   picture, and it cannot satisfy "completed rows never re-render" because a
   grow-only store reflows a force layout on every put.
3. **No green checks, no trophies, no confetti.** §4.1. Certainty is rendered
   as ink.
4. **No skeleton shimmer.** `W-E2` gives named loading states — `Idle` /
   `Loading` / `Refreshing` / `Stale` — and `Stale` is the one that matters,
   because a content-addressed read that fails leaves previously verified bytes
   valid (`10-workbench-requirements.md:350-354`). A shimmer asserts "content
   is coming" where the honest statement is "the last verified bytes stand, and
   here is the clause that failed."
5. **No modals.** `W-K2`, and the reason is structural rather than aesthetic: a
   modal cannot be part of the word (`10-workbench-requirements.md:311-312`).
6. **No abbreviated address on a clipboard, ever, and none accepted as input**
   (`W-A1`). No prefix resolution against the store (`W-A2`).
7. **No user-attached labels that live only in the front end's database.**
   Names come from content or they do not exist (`W-A4`,
   `10-workbench-requirements.md:299-303`). Stated cost, accepted: you cannot
   rename anything, ever; you can only publish a new naming.
8. **No screenshot-shaped export.** Renderings are derived; a picture is
   generated from the word by the same renderer (`W-C2`).
9. **No CSS framework and no utility vocabulary chosen by default.** The
   skeleton stylesheet already refuses Tailwind on the grounds that a utility
   vocabulary is a design-system decision this lane must make deliberately
   (`experiments/workbench/src/styles.css:11-14`). If Tailwind is chosen, it is
   chosen because the generated component surface wants class strings the
   emitter can spell — a *language* argument — and it is written down.
10. **No `default:` case in the refusal renderer.** `W-E3`: the family is
    closed (`Cas.matchError`'s seven arms,
    `library/effects/bin/cli/render.ts:95-118`), and adding a clause to the
    model must break the front end's typecheck
    (`10-workbench-requirements.md:356-361`). A fallback branch converts a
    proof into a shrug.
11. **No decoration that carries no claim.** §4.2. Grid lines, dividers,
    drop shadows, and icons that restate an adjacent word are all cut.

---

## 8. Provenance — C6

**Explicitly PENDING.** No source consulted for this document is resolved into
`.reference/provenance/`, and nothing here is gated work.

| Source | URL | Retrieved | Status |
|---|---|---|---|
| Paper — product page | <https://paper.design> | 2026-08-29 | PENDING, no digest held |
| Paper — MCP docs | <https://paper.design/docs/mcp> | 2026-08-29 | PENDING, no digest held |
| Paper — tokens docs | <https://paper.design/docs/tokens> | 2026-08-29 | PENDING, no digest held |
| Paper — roadmap | <https://paper.design/roadmap> | 2026-08-29 | PENDING, no digest held |
| Paper — pricing | <https://paper.design/pricing> | 2026-08-29 | PENDING, no digest held |
| Paper — vs Figma | <https://paper.design/compare/figma> | 2026-08-29 | PENDING, no digest held |
| Paper — position piece | <https://paper.design/blog/a-real-space-to-design-in-the-age-of-agents> | 2026-08-29 | PENDING, no digest held |
| Paper — Series A | <https://paper.design/blog/series-a> | 2026-08-29 | PENDING, context only; carries one **uncited** benchmark claim (§2.5) |
| Paper — shader post | <https://paper.design/blog/retro-print-cmyk-halftone-shader> | 2026-08-29 | PENDING, context only |
| Paper — changelog | <https://paper.design/build-log> | 2026-08-29 | PENDING; source for §2.6's "Other styles" panel |
| Paper — support / shortcuts | <https://paper.design/docs/support> | 2026-08-29 | PENDING |
| Paper — downloads | <https://paper.design/downloads> | 2026-08-29 | PENDING; MCP/Desktop v0.5.6, 2026-08-27 |
| Paper — agent plugins | <https://github.com/paper-design/agent-plugins> | 2026-08-29 | PENDING; the stdio path and plugin manifests |
| Paper Shaders | <https://github.com/paper-design/shaders> | 2026-08-29 | PENDING; WebGL2, open source, npm-published |

**Retrieval caveat, weaker evidence — read this.** Every Paper page above was
read through a fetch-and-summarize path, not as retained raw bytes. No digest
was computed and no copy is held, so the tool names in §2.2 and the token facts
in §2.4 are *reported* rather than *verified against held bytes*. Before any of
this is cited in gated work — or in anything a customer reads — the pages must
be re-read directly and pinned through the declared procedure. The estate has
been burned by exactly this once already, in this same `.staging` neighbourhood
(`.staging/paper-notes/PROVENANCE.md:34-46`: a fetch returned a
model-generated reconstruction of an essay rather than the source, and the
notes carry the warning).

**Marked PENDING and unresolved** (§2.3): Paper's change-detection mechanism,
lock/lease semantics, node-id stability, undo/history/versioning/multiplayer
model, and any latency or frame-budget figure. These are not gaps in the
research; they are gaps in the documentation, and this document does not fill
them with invention.

---

## 9. What this lane asks the record for

Small, and each is a discharge rather than a mint:

1. **Discharge R6's `Style`-as-content clause** with a date (§6.3). No new
   ruling needed — `PAPERWORK-AND-PROJECTION-AUDIT.md:52` already asks for it.
2. **Amend the component-register row shape** per §6.2 before `components.json`
   is first emitted — cheapest now, a versioning event later.
3. **Rename `.staging/paper-notes/`** (§1), or rule the collision acceptable on
   the record.
4. **Rule the palette a computed object** (§4.1) so `W-X1` becomes a test
   rather than a review.
5. **Rule one addressable presentation carrier** (§6.5, condition 4) before any
   ornament work starts, so `Style` and the ornament grammar cannot become two
   theme systems that cannot see each other.
6. **Rule on the three families** (§6.5, condition 3): either they are the
   estate's three transformations of record wearing visual clothes — projection,
   lift, human semantic projection (`AGENTS.md:78-81`) — or they are authored
   and labelled authored. Not left to drift.
7. **Close the three unaccounted FRONTEND asks.** `FRONTEND.md`'s ruling asks
   3 (transport split), 4 (auth over HTTP), and 6 (the `Ts.Decl` arrow arm)
   appear in the grilling docket neither as struck, nor ruled, nor dispatched —
   ask 6 is mentioned only as "adjacent" to Tier-1 item 1
   (`GRILLING-DOCKET-2026-08-29.md:36`). **Ask 6 blocks every component
   emitter**, so it is this lane's critical path and it is currently
   unaccounted for. Detail in `PROOF-OBLIGATIONS.md` §0.
8. Everything else this lane owes is in `PROOF-OBLIGATIONS.md`, beside this
   file.
