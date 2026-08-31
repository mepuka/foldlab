# AGENT REPORT — aesthetics research for the trunk canvas

Lane: aesthetics research (read-only), dispatched by the Mac coordinator
alongside the adversarial canvas review.
Date: 2026-08-31.
Consumed by: the trunk-canvas build + `.staging/frontend-trunk/CANVAS.md`.

Read whole before researching: `.staging/frontend-trunk/CANVAS.md`,
`GEOMETRY.md`, `COLUMNS.md` (the two-audience statement), `STANDUP.md`;
`.staging/ornamentation/ORNAMENTATION.md` §§3–4 (the inherited aesthetic
ruleset); `.staging/product-sphere/VISION.md`;
`.staging/visual-directions/2026-08-30/PROMPTS.md` (the operator's own
selected image directions); `experiments/workbench/src/styles.css` (the
tokens that exist); `library/effects/src/cas/generated/grammar/names.json`
(the emitted naming inventory); `library/cas/Cas/Grammar/Sorts.lean` (the
fifteen sorts). Nothing in the tree was edited except this file.

Every external claim below carries a URL I actually fetched. Three sources
I wanted refused the fetch and are marked **UNSOURCED** rather than
paraphrased from memory. Every colour value, contrast ratio and colour-
difference number in this report was computed by me from the sRGB/OKLab
formulas against the tokens that exist in the tree; the method is stated so
the build lane can re-derive them.

---

## 0. The finding that reorders the whole brief

The brief asks for a palette strategy for fifteen sorts. Two independent
lines of evidence say the same thing, and they agree with a rule the estate
has already ruled:

1. **Measurement.** I computed worst-case OKLab colour difference under
   normal, deuteranope and protanope vision (Viénot–Brettel–Mollon
   dichromat simulation) for the industry-default categorical schemes. The
   Tableau 10 palette — the family Observable Plot and d3 default to —
   contains a pair (`#E15759` red / `#59A14F` green) whose worst-case
   separation is **ΔE_OK = 0.003**, i.e. *identical* to a deuteranope. The
   Okabe–Ito colour-universal set's worst pair is **0.080**. So the
   published, proven-safe categorical vocabulary is seven colours with a
   floor of 0.08, and the popular ten-colour one is already broken. Fifteen
   is not a stretch of a good idea; it is off the end of a scale that
   already fails at ten.
2. **The tool vendors say it in their own docs.** d3's largest qualitative
   scheme is twelve (`schemePaired`, `schemeSet3`)
   (<https://d3js.org/d3-scale-chromatic/categorical>). Observable Plot's
   scales page states: *"Discrete color schemes are intended for data that
   has only a few unique values. If the size of the categorical domain
   exceeds the number of colors in the scheme, colors will be reused;
   combining values into an 'other' category is recommended."*
   (<https://observablehq.com/plot/features/scales>). Datawrapper's colour
   guide puts the within-hue limit bluntly: *"It's doable to distinguish
   between two, three shades of the same color. Your readers will give up
   with four, five, six different shades."*
   (<https://www.datawrapper.de/blog/quantitative-vs-qualitative-color-scales/>)
   — which kills "hue families with within-family variation" as an identity
   scheme for the six-member steady-fast class before it starts.
3. **The estate already ruled it.** `ORNAMENTATION.md` §3 lists, as an
   inherited decision that must not be silently re-opened: *"Hue is
   reserved for verdicts; one saturated colour, spent on `owed`"*
   (`experiments/workbench/src/styles.css:1-13`), with §4.1's thesis —
   *"this product is loud about doubt and quiet about certainty"*.

**Therefore the recommendation is not a fifteen-colour palette and not a
five-family palette. It is: the trunk canvas is ink on paper. Sorts get no
hue at all.** Identity rides the two channels the trunk already has in
abundance and that no other design gets for free — **fixed position** (the
order ruling is permanent, COLUMNS ask 3) and **direct labels** from
`names.json`. Okabe & Ito's own advice is exactly this: *"Label graph
elements directly rather than using separate color-coded keys"*
(<https://jfly.uni-koeln.de/color/>).

This is also the simplest thing that ships, which is what the operator
asked for. The five-family palette is delivered in full in §1.4, with
measured values for light and dark, staged as a **layer-2 option that
requires an explicit ruling**, because adopting it extends the hue-spending
rule from "verdicts" to "verdicts plus speed classes". I recommend against
making it the resting state and describe the one use where it earns itself
(a temporary teaching mode, §1.4.3).

---

## 1. The design language

### 1.1 What the trunk is, in the literature's words

The trunk is a **unit visualisation**: *"every data item is represented by
a unique visual mark — a visual unit"*, which the Atom paper argues can
*"provide more information, better match the user's mental model, and
enable novel interactions"* than aggregated visualisations
(<https://www.microsoft.com/en-us/research/publication/atom-a-grammar-for-unit-visualizations/>).
That is the correct name for it and it should be used when the design is
defended: one admission, one square, no exceptions.

GEOMETRY's perception check is already right and the sources back it: since
counts are read by **position from a common baseline**, the trunk uses the
strongest available channel and spends nothing on the weakest. The design
therefore **exemplifies** Tufte's data-ink principle rather than violating
it — a presence mark is 100% data-ink; there is no frame, no axis, no
gridline, no legend to erase. It is the sparkline argument at column scale:
*"sparklines have a data-ink or data-pixel ratio = 1.0, consisting entirely
of data, with no non-data at all. Thus sparklines have no frames, tic
marks, and non-data paraphernalia"*, and *"Avoid all data frames; the
physical location of the numbers, words, and graphics enforces the implicit
grid"*
(<https://www.edwardtufte.com/notebook/sparkline-theory-and-practice-edward-tufte/>,
<https://www.edwardtufte.com/notebook/sparklines-history-by-tufte-1324-to-now/>).

Where the trunk is **in tension** with Tufte is elsewhere, and the build
lane should know both:

- **Micro/macro readings** (Envisioning Information ch. 2,
  <https://www.edwardtufte.com/book/envisioning-information/>) — the trunk
  is designed for the macro reading (the skyline, the hypotenuse) and the
  micro reading (this square, this address). It currently has no *middle*
  reading. §1.7's century rule and §1.6's lamination exist to supply one.
- **Layering and separation** (ibid. ch. 3) — with one ink and one
  geometry there is exactly one layer. Labels, the cut hairline and the
  strip must therefore be separated by **value and position only**, never
  by adding a second colour. This is the discipline that keeps the canvas
  from becoming a chart.
- **Small multiples** (ibid. ch. 4) — fifteen columns *are* small
  multiples of one mark under one order. The design's obligation is that
  the columns stay strictly comparable: same square, same pitch, same
  baseline, forever. Any per-column visual accommodation (a wider lane for
  a busy sort, a scaled square) destroys the small-multiple contract.

### 1.2 The v1 palette — it ships on the tokens that already exist

`experiments/workbench/src/styles.css` already declares the ramp, and my
measurements say it is a good one. Nothing needs changing; the canvas needs
**two** new tokens and **one** hue.

| token | light | dark | contrast vs `--paper` (light / dark) | spent on |
|---|---|---|---|---|
| `--paper` | `#fbfbfa` | `#121214` | 1.00 / 1.00 | the ground; **existing** |
| `--ink` | `#16161a` | `#ececf0` | 17.43 / 15.88 | **the square** — the data layer, full strength; **existing** |
| `--ink-soft` | `#5c5c66` | `#9a9aa4` | 6.38 / 6.71 | labels, face-facts line, edge names; **existing** |
| `--rule` | `#dedede` | `#2c2c31` | 1.30 / 1.35 | the cut hairline, the inspector's rules; **existing** |
| `--mark-strip` | `#6c6c6f` | `#87878a` | 5.05 / 5.22 | the density strip's recent band; **NEW** |
| `--mark-strip-deep` | `#a9a9ab` | `#4e4e51` | 2.27 / 2.26 | the strip's deep tail; **NEW** |
| `--owed` | `#bc442c` | `#ec775f` | 5.07 / 6.57 | the one saturated colour, §1.5; **NEW** |

Derivation, so the build can regenerate rather than copy: the two strip
tones are `--ink` mixed toward `--paper` **in OKLab** at t = 0.42 and
t = 0.68. `--owed` is `oklch(0.55 0.16 33)` light / `oklch(0.70 0.15 33)`
dark — a vermilion, the hue Okabe & Ito recommend for red because it stays
*"recognizable to protanopes"* (<https://jfly.uni-koeln.de/color/>). Doing
the palette as a computed OKLCH object rather than a hex list is
`ORNAMENTATION.md` §4.1's standing position, and OKLCH is the right space
because *"L is perceived lightness"* and holding it fixed while changing
hue keeps contrast predictable
(<https://evilmartians.com/chronicles/oklch-in-css-why-quit-rgb-hsl>).

**Where the saturated colour is spent on the trunk: the `unregistered`
lane, and nothing else.** COLUMNS' totality rule says every binding lands
in a column or in `Word.unregistered`, and *"the UI surfaces the
unregistered strip, never hides it"*. An unregistered tag is precisely a
claim the system cannot back — the estate's definition of `owed`. So the
sixteenth lane, set apart at the right, is the only coloured thing on the
canvas, and its count in the face-facts line turns from `--ink-soft` to
`--owed` the moment it is non-zero. One colour, one meaning, visible at a
glance across the whole page. Everything else is fact, and facts are ink.

### 1.3 Ordering and grouping — the fifteen sorts

Left → right, slow-updating → fast, from COLUMNS ask 3 extended by
`store-crdt.md:351-352` (`agent` → near-still; `query`, `result`,
`annotation` → steady-fast):

| # | speed class | sorts (in lane order) | lanes |
|---|---|---|---|
| 1 | near-still | `schema` `git` `cont` `agent` | 4 |
| 2 | bursty-per-program | `step` | 1 |
| 3 | per-artifact | `manifest` `tree` `file` | 3 |
| 4 | steady-fast | `context` `entry` `value` `annotation` `query` `result` | 6 |
| 5 | bursty-fastest on ingest | `chunk` | 1 |
| — | refused | `unregistered` | 1 |

With no hue, the class structure is carried entirely by **gutter width** —
a second channel that costs no ink and cannot be misread. Gestalt proximity
does the grouping that colour would have done, and it does it in greyscale,
in print, and under every colour-vision deficiency.

### 1.4 Layer 2 (needs a ruling): five speed-class hue families

Delivered because the brief asked for values, not because I recommend
switching it on. **Construction:** the five hues are the operator's own
selected direction — *"Marigold, oxblood, cobalt, moss, bone"*
(`PROMPTS.md` 06C) plus aubergine (01C, 08C) — taken as reference colours
and then moved the **minimum** OKLab distance needed to satisfy three
constraints simultaneously: contrast ≥ 3.2:1 against the ground (WCAG 2.2
SC 1.4.11 requires *"a contrast ratio of at least 3:1 against adjacent
color(s)"* for *"parts of graphics required to understand the content"*,
<https://www.w3.org/WAI/WCAG22/Understanding/non-text-contrast.html>);
adjacent-class worst-case ΔE_OK ≥ 0.100 across normal/deutan/protan
vision; any-pair ≥ 0.055.

**Light theme, on `--paper #fbfbfa`:**

| class | hex | OKLCH | contrast | drift from the reference colour |
|---|---|---|---|---|
| near-still | `#1E4E9E` | `oklch(0.44 0.140 260)` | 7.69:1 | 0.033 from cobalt `#0047AB` |
| bursty-per-program | `#7F66A5` | `oklch(0.56 0.100 302)` | 4.67:1 | 0.106 from aubergine `#6B3FA0` |
| per-artifact | `#566C30` | `oklch(0.50 0.090 126)` | 5.66:1 | 0.003 from moss `#556B2F` |
| steady-fast | `#BD7D00` | `oklch(0.64 0.140 75)` | 3.33:1 | 0.123 from marigold `#E9A227` |
| bursty-fastest | `#7F3C33` | `oklch(0.44 0.095 29)` | 7.81:1 | 0.045 from oxblood `#922B21` |

**Dark theme, on `--paper #121214`** (same hues, same lightness *ranks*,
level inverted — the two themes are one palette seen twice):

| class | hex | OKLCH | contrast |
|---|---|---|---|
| near-still | `#3D6DBC` | `oklch(0.54 0.135 260)` | 3.66:1 |
| bursty-per-program | `#B096D9` | `oklch(0.72 0.100 302)` | 7.32:1 |
| per-artifact | `#799053` | `oklch(0.62 0.090 126)` | 5.28:1 |
| steady-fast | `#E3A340` | `oklch(0.76 0.135 75)` | 8.53:1 |
| bursty-fastest | `#A55E54` | `oklch(0.56 0.095 29)` | 3.86:1 |

**Honest weaknesses, stated rather than hidden.** The weakest pair in both
themes is per-artifact vs bursty-fastest at ΔE_OK ≈ 0.057 under
deuteranopia — below the Okabe–Ito floor of 0.080. They sit two classes
apart with six lanes between them, and identity never rests on colour here,
so I judged it acceptable; a ruling could instead lighten `chunk` to
`oklch(0.64 0.05 29)` = `#A9817B` and take the ΔE to 0.106 at the cost of a
duller oxblood. Second: `chunk` and `near-still` are the darkest inks while
`chunk` is the highest-volume column, so the right edge gains weight as the
store grows. That is either a defect or the composition's terminal accent,
depending on taste; it is a ruling, not a fact.

**Within-family variation is refused outright.** Six lightness steps inside
the steady-fast family is exactly the failure Datawrapper names. If the
six-lane block ever reads as a slab, the fix is a two-step alternation for
*neighbour separation only* (never for identity), or a wider intra-class
gutter — the gutter is free and carries no perceptual cost.

**Where the family palette earns itself:** as a **transient teaching
overlay**, not a resting state. COLUMNS' two-audience statement gives the
app one pedagogical job — *install the model that an agent run IS an
effectful program*. A momentary "show me the speed classes" mode that tints
the lanes, then releases back to ink, teaches the ruling without spending
hue permanently. That framing also keeps `ORNAMENTATION.md` §3's rule
intact: hue still means "the system is saying something", it is just saying
it about itself, on request, and then stopping.

### 1.5 Square geometry

| property | v1 value | reasoning |
|---|---|---|
| square | **12 × 12 CSS px** | large enough that the deterministic micro-tint (§2.2) registers as texture; small enough that thirty rows fit in 450 px |
| vertical gap | **3 px** (pitch 15) | 20% air. The gap is the only separator; it must survive at DPR 1 |
| lane width | **12 px** | equal to the square: the lane *is* the mark's width, so nothing implies a column extent that the data does not have |
| intra-class gutter | **15 px** (column pitch 27) | one pitch of air — proximity binds the class |
| class gutter | **30 px** | double: the only carrier of the speed-class grouping in v1 |
| `unregistered` gutter | **45 px** | set apart; it is not a sort |
| corner radius | **0** | see §3 |
| stroke | **none** | a 1 px stroke on a 12 px square is 30% of its ink spent on a border |
| device rounding | `round(x * dpr) / dpr` on every rect | crisp edges at DPR 1/1.5/2/3; the disjointness the Scene guarantees is only visible if edges land on device pixels |
| canvas width | **507 px** | 16 lanes × 12 + 10 intra × 15 + 4 class × 30 + 45 |
| individuated window | **30 rows = 450 px** | the DOI threshold's visible consequence |

The canvas at 507 px fits inside the tree's existing `--measure: 62ch`
(≈ 546 px at the declared 16 px body size) **with room to spare**. The
trunk therefore needs no new page geometry at all: it sits in the same
single column of prose the workbench already uses, which is what
`ORNAMENTATION.md` §4.6 ("the book, not the dashboard") demands.

**Growth direction: upward from a common baseline**, newest square at the
top of the stack, oldest at the bottom. This buys the Cleveland–McGill
channel GEOMETRY already relies on (position from a shared baseline), makes
the emergent diagonal an *upper* edge — a skyline, read as growth, which is
COLUMNS' own pedagogical sentence — and keeps every square's offset from
the base immutable for life, which is the Regime-A law stated
geometrically.

**Tip treatment.** No arrival animation, no pulse, no glow: motion happens
only at named cuts, and Bostock's own summary of why static wins is worth
quoting to anyone who argues otherwise — *"animations are fun to watch, but
static visualizations allow close inspection without being rushed"*, and
*"The eye scans faster than the hand"*
(<https://bost.ocks.org/mike/algorithms/>). The tip is marked by three
things that cost nothing: it is the topmost square (position); the **cut
hairline** — a 1 px `--rule` line drawn across the full canvas at the
current mark, which is the Scene's own `Cursor` DrawOp and therefore data,
not decoration; and the count printed at the column's foot. That last is
Tufte's sparkline convention (the endpoint carried as a number beside the
graphic) moved into the label band, where it does not touch the canvas.

### 1.6 The density strip

Two things must be said before the rendering, because they interact with a
law:

**(a) A per-block recency compression `h(rank) = h₀·r^rank` re-lays the
column and therefore moves positions.** That is legal only at a named cut,
and it costs the spatial memory the order ruling exists to protect. **(b)
There is a construction that gives the same bounded height with *zero*
motion:** make the strip a **fixed-height band at the base** — the origin
of the absolute layout — into which everything older than the individuated
window is folded. Laminations accrue *inside* the band; the band's
geometry never changes; every square above it keeps its offset forever.
I recommend (b), and I recommend that **v1 ship with no strip at all**
(pure Regime A, unbounded upward growth, viewport scroll) so the first
build has nothing to get wrong, with the band landing as layer 2.

Rendering of the band, when it lands:

- **Same lane width as the squares. Never wider.** The strip is the same
  material, compressed; a wider strip would imply a magnitude the mark
  never carries.
- **Two tones, not a gradient**: `--mark-strip` (5.05:1) for the recent
  half, `--mark-strip-deep` (2.27:1) for the deep tail. A gradient would
  encode a continuous magnitude that nothing in the Scene expresses, and
  would defeat the SVG register's byte comparison.
- **Laminated, not solid.** One band per `Strip` run — which is exactly the
  granularity the Scene's `Strip {col, fromRow, count}` op already has —
  separated by a 1 px `--paper` hairline. The macro reading is the mass;
  the micro reading is the laminations; that is the middle reading §1.1
  said was missing. It is also Hobbs' texture technique used honestly:
  *"laying down a bunch of very small objects"* rather than a blur
  (<https://tylerxhobbs.com/essays/2015/creating-soft-textures-generatively>).
- **The century rule.** Every 100th aggregated admission draws a 1 px
  `--ink` hairline across the lane. The strip becomes a ruler; compression
  stops being a vibe and starts being countable. This is the one ornament
  in the whole design I would fight for, because it is pure data.

### 1.7 The hypotenuse

**Do not draw it in v1.** The diagonal is the tips; drawing a line along
the tips adds ink that shows nothing the eye has not already got, which is
the definition of the thing Tufte's data-ink principle refuses
(<https://www.edwardtufte.com/book/the-visual-display-of-quantitative-information/>).

COLUMNS already states the informative part: *"straight = appends spread
evenly across sorts; bowed = activity concentrated"* — that is, **the
information is the deviation, not the edge**. So the layer-2 treatment is
the inversion: draw the *invisible* reference, not the visible edge. A
single 1 px `--rule` chord from the leftmost tip to the rightmost tip, at
1.30:1 contrast, lets the bow read as the gap between the chord and the
tips. Straight = the chord disappears into the skyline; concentrated = a
visible lens of white opens up. One hairline, one diagnostic, zero
decoration. It belongs behind a toggle and off by default.

### 1.8 Typography

The estate's inherited rule (`ORNAMENTATION.md` §4.4) is that **monospace
is confined to addresses, hex and machine fields — it is not the product's
voice**, and that every distinction needs three carriers (shape, position,
a word). The derived dot-path names *are* machine fields, so they take
mono; the `meaning` sentences that `names.json` ships beside them are
prose, and take the text face.

**v1 faces — system only, no webfont:**

```
prose : ui-sans-serif, system-ui, -apple-system, "Segoe UI", sans-serif   (already declared)
code  : ui-monospace, SFMono-Regular, "SF Mono", Menlo, Consolas,
        "Liberation Mono", monospace
```

`ui-monospace` and `system-ui` are the CSS generic families for
*"the default user interface monospace font"* and *"the default user
interface font on a given platform"*
(<https://developer.mozilla.org/en-US/docs/Web/CSS/font-family>); MDN's own
caveat that `system-ui` *"is intended to make UI elements look like native
apps, and not for typesetting large paragraphs"* is the reason the
inspector's prose stays at the existing 16px/1.55 and inside a measure
rather than running wide. Observable Plot makes the same choice for the
same reason — its default is *"the system-ui font"*
(<https://observablehq.com/plot/features/plots>).

**Three sizes, and two of them already exist:**

| role | face | size / leading | colour |
|---|---|---|---|
| column labels, face-facts, addresses | mono | **11 px / 1.0**, `letter-spacing: 0.02em`, `font-variant-numeric: tabular-nums` | `--ink-soft` |
| meaning sentences, inspector prose | sans | 16 px / 1.55 (existing `body`) | `--ink` |
| page title | sans 600 | 24 px (existing `.title`) | `--ink` |

**How to set a technical string beautifully — the actual answer.** Neither
Tufte nor Observable prettifies technical labels; they set them *verbatim*
and modulate the parts. Three moves, all non-destructive:

1. **Never re-case, never re-word.** `names.json` is the authority and
   COLUMNS' law is that the same string serves every seat (UI label, rule
   relation, TS accessor, Lean spelling modulo casing). Title-casing
   `annotation` to "Annotation" quietly forks the naming plane. Lowercase,
   as emitted.
2. **Dim the separators, not the segments.** Render the `.` in a dot-path
   at ~45% of the segment's alpha. `tree.parent.left` then reads as three
   segments at a glance while remaining, byte for byte, the emitted string.
3. **Ink the last segment, step back the prefix.** In the inspector,
   `tree.parent` **.left** — prefix in `--ink-soft`, final segment in
   `--ink`. Hierarchy from value, not from punctuation or size.

**Column labels are rotated −90°** (reading bottom-to-top) in a 96 px foot
band beneath the baseline, aligned to their lane's left edge. This is
forced arithmetic, not taste: the longest sort name (`annotation`, 10
characters) is ~66 px at 11 px mono against a 27 px column pitch. Rotation
keeps every label complete, keeps them *direct* (Okabe & Ito: label
directly, do not use a key), and echoes the columns' own verticality.
Horizontal labels become possible only at a ≥ 70 px column pitch, which
would push the canvas past the measure and break the book.

**The face-facts line** is one line of 11 px mono under the canvas, in
`--ink-soft`, middot-separated, tabular numerals:

```
12 847 admissions · 15 sorts · mark 7bfa…c1 · cut 14:22:07 · 0 unregistered
```

When `unregistered` is non-zero it, alone, takes `--owed`. That is the
whole conditional-emphasis budget for the page.

### 1.9 Page composition — what Paper would do, made checkable

**A caveat first, because the brief asked for primary sources and I could
not find them.** Dropbox has published essentially nothing first-party
about the Paper editor's typography. `brand.dropbox.com/typography`
(fetched) documents the *brand* type system — the custom **DB Sharp
Grotesk** cut with Sharp Type, *"Type is what meaning looks like"* — and
says nothing about the editor surface; `dropbox.design` now redirects to
the same brand site, whose only stated design philosophy is an Eames quote
(<https://brand.dropbox.com/typography>, <https://brand.dropbox.com/>). The
Medium piece that does contain concrete Paper CSS returned HTTP 403, and
the Sharp Type case study returned HTTP 429. **So "Paper as the aesthetics
north star" cannot be cited as design doctrine — it is the estate's own
reading of a product, and it is already recorded as such in
`VISION.md`.** What I can do is convert the quality into properties that
are checkable without the citation, using a source that does publish
numbers — Butterick's *Practical Typography*: body text *"15–25 pixels"* on
the web, line spacing *"120–145% of the point size"*, line length
*"45–90 characters"*
(<https://practicaltypography.com/typography-in-ten-minutes.html>). The
tree's existing `16px/1.55` and `--measure: 62ch` already sit inside all
three. Paper's calm, restated as rules the build can hold:

- **One column, one measure, nothing beside it.** No sidebar, no toolbar,
  no panel rail. The page is `.page { max-width: var(--measure) }` as it
  stands.
- **Vertical rhythm from a single unit.** 8 px. Foot band 96, strip band
  90 (rounds to 6 units after the 6 px hairline), section gaps 48.
- **Air above the canvas is the composition.** Existing `.page` padding is
  `4rem 1.5rem 6rem`; the canvas gets the top of that space and is the
  first thing on the page after the title and lede.
- **The page obeys the store's law.** The inspector is **not** a modal, an
  overlay, or a floating panel: it *appends below* the face-facts line, in
  the same measure. Clicking a square never occludes or displaces the
  canvas. The append-only discipline that governs the word governs the
  layout — which is the kind of rhyme this product should be making.
- **No chrome for state.** `ORNAMENTATION.md` §4.5's rule stands: no motion
  except in-flight spend; and §7's refusal of the shimmer means a stale
  projection says "stale" in words.

**Inspector contents**, all of it emitted, none of it authored: the derived
name (mono, prefix stepped back); the full address (mono, in 8-character
groups, selectable); the `meaning` sentence from `names.json` **verbatim**
— this is the answer to "the meaning must read at a human-semantics level",
and it is already solved in the tree: every block and every edge ships an
English sentence (`"A blob leaf: a positioned pointer at one chunk."`,
`"the chunk this leaf positions"`); the edge table (name / expects /
meaning); the square's index within its column; the admission time from the
receipt plane. Where the model computes nothing, `—`, never `0` — an
inherited rule.

**Selection**, without violating uniform marks: never modify the square.
Draw a 1 px `--paper` halo plus a 1 px `--ink` ring *in the gap outside*
the square's rect, and take the column's label from `--ink-soft` to
`--ink`. The mark is untouched; the space around it changes. Two visual
carriers plus the inspector heading's word satisfies the three-carrier
rule.

**Accessibility note the build must not discover late.** A 12 px square at
15 px pitch fails WCAG 2.2 SC 2.5.8 Target Size (Minimum) — *"at least 24
by 24 CSS pixels"* — and it also fails the Spacing exception, which needs a
24 px-diameter circle on each target not to intersect its neighbours'. The
exception that applies is **Equivalent**: *"The function can be achieved
through a different control on the same page that meets this criterion"*
(<https://www.w3.org/WAI/WCAG22/Understanding/target-size-minimum.html>).
So arrow-key navigation over the squares plus an addressable list view is
not a nice-to-have; it is what makes the dense canvas conformant. Budget it
in v1.

### 1.10 Background and paper feel

Keep `--paper` flat in v1. It is already the right colour: a near-neutral
at 98.8% OKLab lightness, which is where Datawrapper puts backgrounds —
*"For light backgrounds, keep saturation below 7% and lightness above 95%.
For dark backgrounds, stay below 20% saturation and maintain lightness
between 10–25%"* (<https://www.datawrapper.de/blog/beautifulcolors>); the
dark `#121214` sits at 18.3% and is inside that band too.

If a paper grain is ever added (§2.5), one build rule matters more than the
aesthetics: **texture belongs to the page, not to the Scene.** The Scene's
SVG register is the golden-snapshot gate for every layout law (CANVAS CV-2);
a noise layer inside it makes the goldens churn. Grain goes on the page
element as CSS, at ≤ 2% contrast, and the canvas stays byte-clean.

---

## 2. The organic question, answered honestly

Can a grid of identical squares feel alive without magnitude-scaling marks
and without motion between cuts? Yes — but not by any of the moves that
usually get reached for. The organic quality has to come from five places,
in this order of importance.

### 2.1 The data is already irregular — the design's first job is not to tidy it

This is the whole answer, and it is the one most likely to be designed
away. A real word has bursts, droughts, ragged column heights, sorts that
never fire, a `chunk` flood at 03:00 and nothing for six hours. That
irregularity is organic in the strict sense: it is the trace of actual
work. Every instinct to normalise it — padding short columns, capping tall
ones, smoothing the strip, hiding empty sorts, sorting lanes by height —
converts a living record into a chart. **Show empty columns as empty.**
Lupi's manifesto is the discipline here: *"Whenever the main purpose of
data visualization is to open people's eyes to fresh knowledge, it is
impractical to avoid a certain level of visual complexity"*, and
*"Data-driven doesn't mean unmistakably true, and it never did"*
(<https://giorgialupi.com/data-humanism-my-manifesto-for-a-new-data-wold>;
first published in Print Magazine, per that page).

### 2.2 Deterministic micro-variation, keyed by the address

The move that makes a wall of identical squares breathe, without breaking a
single law. **The square's ink is a pure function of its own address.**

| step | light | dark | ΔE_OK from `--ink` |
|---|---|---|---|
| 0 | `#121216` | `#E7E7EA` | 0.018 |
| 1 | `#141418` | `#E9E9ED` | 0.009 |
| 2 | `#16161A` (= `--ink`) | `#ECECF0` | 0.000 |
| 3 | `#18181C` | `#EFEFF2` | 0.009 |
| 4 | `#1A1A1E` | `#F1F1F5` | 0.018 |

Index = `address[0] mod 5`. Five quantised steps, not a continuous
function, so the ladder is enumerable, unit-testable and byte-stable in the
SVG register. The extreme span is ΔE_OK 0.035 — far below what any single
comparison resolves, so **no square is individually a different colour**,
while a field of hundreds acquires the grain of hand-set type. Contrast
never leaves 16.76–18.05:1.

Why this is legitimate rather than a cheat: it is deterministic and
content-addressed, so it is *reproducible* — the same admission renders the
same tint forever, anywhere in the app. That is Hobbs' seed argument
exactly: pseudo-random generators are *"a series of transformations applied
to a starting number: the seed"*, and *"given the same seed, the pRNG will
always produce the same sequence of numbers"*, which is what lets a
generative work be regenerated identically
(<https://tylerxhobbs.com/essays/2016/utilizing-random-number-generator-seeds>).
Here the address *is* the seed, so the variation is not noise added to the
data — it is a projection of the data, at sub-threshold amplitude. And it
is Molnár's principle at 1% amplitude: she built *"1% disorder"* into an
ordered system, made *1% de désordre* (1976) from it, and described the
machine as something that *"actually humanizes your production — not
dehumanizes, but humanizes"*
(<https://www.rightclicksave.com/article/an-interview-with-vera-molnar>).
Hobbs' other essay supplies the constraint that keeps it from becoming
decoration — randomness has to be *"controlled in many ways"*, and where it
is introduced in the composition decides whether it is structure or
surface
(<https://www.tylerxhobbs.com/words/randomness-in-the-composition-of-artwork>).
Here it is deliberately surface, at the smallest amplitude that still
reads.

**Refused: positional jitter.** Tempting and wrong. Offsetting squares by a
hashed fraction of a pixel would break device-pixel snapping (fuzzy edges),
break the disjointness the paint-order theorem rests on, and break
hit-testing's injectivity. Tone only. Geometry is law.

### 2.3 Arrival at the tip, without motion

The organic reading of arrival is **accretion, not animation**. What
changes when a square lands: the square exists; the foot count increments;
at the next named cut, the hairline advances and one more lamination joins
the strip. Nothing eases, nothing fades in. This is not a compromise — it
is the better design, per Bostock (§1.5), and per the estate's own rule
that completed rows never re-render. If the operator later wants arrival to
be *felt*, the honest channel is the **cut**: one transition, at the cadence
the ViewSpec declares, with object constancy — which is already GEOMETRY's
Heer–Robertson row and STANDUP's "critically damped springs" note.

### 2.4 Breathing room is a ratio, not a feeling

Three ratios do the work, and they should be written down so they survive
review: **20% air inside a column** (3 of 15 px pitch); **125% air between
columns** (15 px gutter to a 12 px lane) and 250% at class boundaries;
**canvas ≤ 93% of the measure** (507 of ~546 px). The last one is what
makes the trunk sit *in* a page of prose rather than being a dashboard the
prose is attached to.

### 2.5 Material, last and least

Paper grain, at ≤ 2% contrast, on the page ground only, outside the Scene
(§1.10). This is the only place where the operator's own visual directions
— risograph dots, letterpress bite, deckled fibres, plotter chatter
(`PROMPTS.md` 02, 09C, 10) — can enter without touching the data layer. I
would ship v1 without it and add it once the canvas is right, because grain
on an unfinished composition reads as an excuse.

### 2.6 What I could not source

- **Dropbox Paper's own design writing.** Nothing first-party found; see
  §1.9. Treated as the estate's reading, not as citable doctrine.
  **UNSOURCED.**
- **Tufte's "the smallest effective difference".** Attributed by secondary
  sources to *Visual Explanations* ch. 4; it does **not** appear on
  Tufte's own page for that book
  (<https://www.edwardtufte.com/book/visual-explanations-images-and-quantities-evidence-and-narrative/>).
  The principle is used implicitly throughout this report; if it is ever
  quoted in gated work it needs a page-level pin from the book itself.
  **UNSOURCED (primary).**
- **Molnár's "1% disorder" in an institutional voice.** The Morgan Library's
  page on *Interruptions* returned HTTP 403; the interview cited above is
  the source actually fetched. **PARTIALLY SOURCED.**
- **Szafir's model as a usable number.** *Modeling Color Difference for
  Visualization Design* (InfoVis 2017 best paper) establishes that colour
  discrimination *"varies significantly across mark types"* and that
  standard guidance rests on *"large, uniform fields"* not the *"small,
  elongated marks"* real visualisations use
  (<https://cmci.colorado.edu/visualab/VisColors/>). It is the right
  authority for "12 px squares need bigger colour differences than a
  legend swatch does", but I did not obtain its coefficients, so my ΔE
  thresholds in §1.4 are calibrated against the Okabe–Ito floor instead and
  are stated as heuristics. **PARTIALLY SOURCED.**

---

## 3. The restraint list

Each row: what is refused, and the reason it is refused — not "it's ugly".

| refused | reason |
|---|---|
| **Gradients on marks or strips** | encodes a continuous magnitude the Scene cannot express (`DrawOp` has no magnitude field, by design), and destroys the SVG register's byte comparison. Two flat tones instead |
| **Drop shadows, bevels, glows** | pure non-data ink; a shadow claims a depth ordering the store does not have. Also breaks the pairwise-disjointness that makes paint order irrelevant (CANVAS §3 T1) |
| **Rounded corners > 0** | at 12 px, a 2 px radius removes ~4% of the mark's ink and softens the one thing the design asserts — that admissions are discrete and countable |
| **Animating appends** | motion only at named cuts. *"animations are fun to watch, but static visualizations allow close inspection without being rushed"* — Bostock (<https://bost.ocks.org/mike/algorithms/>) |
| **Loading shimmer / skeletons** | already refused in `ORNAMENTATION.md` §7; a served projection can be genuinely stale, and the honest answer is the word "stale" |
| **A legend** | *"Label graph elements directly rather than using separate color-coded keys"* — Okabe & Ito (<https://jfly.uni-koeln.de/color/>). The labels are already under the columns |
| **Gridlines, axis rules, a canvas frame** | *"sparklines have no frames, tic marks, and non-data paraphernalia"*; *"the physical location of the numbers, words, and graphics enforces the implicit grid"* — Tufte (<https://www.edwardtufte.com/notebook/sparkline-theory-and-practice-edward-tufte/>) |
| **Magnitude-scaled or opacity-ramped squares** | GEOMETRY's ruling, and the Scene's type enforces it. A recency alpha ramp is the sneaky version: it makes a wall of squares look like a gradient and re-opens "how faded is faded" |
| **Fifteen categorical hues** | measured: Tableau 10 already contains a pair at ΔE_OK 0.003 under deuteranopia; d3's largest qualitative scheme is 12; Plot recommends an "other" category once the domain exceeds the scheme (<https://d3js.org/d3-scale-chromatic/categorical>, <https://observablehq.com/plot/features/scales>) |
| **Six shades of one hue for the steady-fast class** | *"Your readers will give up with four, five, six different shades"* — Datawrapper (<https://www.datawrapper.de/blog/quantitative-vs-qualitative-color-scales/>) |
| **Colour as the sole carrier of anything** | inherited three-carrier rule (`ORNAMENTATION.md` §4.4); Okabe & Ito's redundant-coding advice; and the EU guide's *"Perform a colour blindness test on the colours you use"* (<https://data.europa.eu/apps/data-visualisation-guide/colour-guidelines>) |
| **Positional jitter for "organic" feel** | breaks device-pixel snapping, disjointness, and hit-test injectivity. Tone-only variation instead (§2.2) |
| **Sorting lanes by height, or any reflow** | the order ruling is fixed at cuts; *"Reordering destroys spatial memory; stability is the point"* (COLUMNS ask 3) |
| **Per-column visual accommodation** (wider lane for a busy sort) | breaks the small-multiple contract; the columns stop being comparable |
| **A drawn hypotenuse by default** | the edge is already visible; the *deviation* is the information (§1.7) |
| **Tooltips that reflow, hover-carried information** | inherited: hover carries no information (`ORNAMENTATION.md` §3). One inspector, appended below |
| **A green check for "admitted"** | *"'the row exists and is addressed' is already the strongest statement the system can make, and it should look like a fact, not like praise"* (`ORNAMENTATION.md` §4.1) |
| **Texture inside the Scene** | churns the golden SVG snapshots that gate the layout laws (CANVAS CV-2) |
| **A webfont in v1** | one more failure mode, one more byte gate, zero information gained. System stacks (§1.8) |

---

## 4. Sources, ranked for pinning

1. **<https://www.edwardtufte.com/notebook/sparkline-theory-and-practice-edward-tufte/>** — Tufte in his own words on data-ink = 1.0, no frames, the implicit grid, the shrink principle. The single most load-bearing external page for this design; it justifies the canvas having no chrome at all.
2. **<https://jfly.uni-koeln.de/color/>** — Okabe & Ito, Color Universal Design: the colour-blind-safe set, redundant coding, and "label directly rather than using a key". The measured floor (ΔE_OK 0.080) my palette work is calibrated against.
3. **<https://observablehq.com/plot/features/scales>** — Plot's own statement that discrete schemes are for "only a few unique values" and that exceeding the scheme means reusing colours. The vendor-side proof that 15 categories is not a supported idea.
4. **<https://d3js.org/d3-scale-chromatic/categorical>** — the enumerated qualitative schemes and their maxima (12). Cite together with (3).
5. **<https://www.datawrapper.de/blog/quantitative-vs-qualitative-color-scales/>** and **<https://www.datawrapper.de/blog/beautifulcolors>** — the shade limit ("two, three… readers give up with four, five, six"), and the concrete background saturation/lightness bands both themes are checked against.
6. **<https://bost.ocks.org/mike/algorithms/>** — Bostock on static vs animated, "the eye scans faster than the hand". The best available defence of motion-only-at-cuts written by someone with no stake in our laws.
7. **<https://giorgialupi.com/data-humanism-my-manifesto-for-a-new-data-wold>** — Data Humanism: complexity is not the enemy, data is imperfect, context always. The argument for not tidying the word's irregularity away (§2.1).
8. **<https://www.w3.org/WAI/WCAG22/Understanding/non-text-contrast.html>** and **<https://www.w3.org/WAI/WCAG22/Understanding/target-size-minimum.html>** — the 3:1 graphical-object floor every value in §1.2/§1.4 is measured against, and the Equivalent exception that makes a dense unit visualisation conformant.

Secondary, fetched, useful but not pin-grade: OKLCH rationale
(<https://evilmartians.com/chronicles/oklch-in-css-why-quit-rgb-hsl>);
unit-visualisation vocabulary
(<https://www.microsoft.com/en-us/research/publication/atom-a-grammar-for-unit-visualizations/>);
Szafir's mark-size result (<https://cmci.colorado.edu/visualab/VisColors/>);
Hobbs on seeds and on generative texture
(<https://tylerxhobbs.com/essays/2016/utilizing-random-number-generator-seeds>,
<https://tylerxhobbs.com/essays/2015/creating-soft-textures-generatively>);
Butterick's numbers
(<https://practicaltypography.com/typography-in-ten-minutes.html>);
Molnár interview
(<https://www.rightclicksave.com/article/an-interview-with-vera-molnar>);
ColorBrewer's Paired/Accent rationale
(<https://colorbrewer2.org/learnmore/schemes_full.html>); Plot's defaults
(<https://observablehq.com/plot/features/plots>,
<https://observablehq.com/plot/marks/axis>,
<https://observablehq.com/plot/what-is-plot>); Tufte's book pages
(<https://www.edwardtufte.com/book/envisioning-information/>,
<https://www.edwardtufte.com/book/the-visual-display-of-quantitative-information/>);
Dropbox brand type (<https://brand.dropbox.com/typography>).

---

## 5. Ruling asks

- **A1 — the palette.** Adopt v1 as **ink on paper, no sort hue**, on the
  four existing tokens plus `--mark-strip`, `--mark-strip-deep`, `--owed`;
  the one saturated colour spent on the `unregistered` lane and its count,
  and nothing else. (Recommended.)
- **A2 — the five-family palette (§1.4).** Refuse as the resting state;
  admit as a transient teaching overlay, or defer entirely. If admitted in
  any form, it extends `ORNAMENTATION.md` §3's hue rule and that extension
  should be written down rather than absorbed.
- **A3 — strips and motion.** Ship v1 with **no** density strip (pure
  Regime A, scroll); adopt the fixed-height sediment band (§1.6b) as the
  layer-2 construction, so that positions never move even under
  compression. This is a small amendment to how GEOMETRY's recency
  compression is realised, and it is worth making before code exists.
- **A4 — the hypotenuse.** Not drawn in v1; the reference chord (§1.7)
  behind a toggle later.
- **A5 — accessibility budget.** Arrow-key navigation over squares plus an
  addressable list view, in v1, as the WCAG 2.5.8 Equivalent control.
- **A6 — micro-tint (§2.2).** Adopt the five-step address-keyed ladder in
  the Scene (it is deterministic, so the SVG goldens stay byte-stable), or
  refuse it and ship flat ink. It is the only "organic" move I recommend
  that touches the data layer, and it should be an explicit yes or no.
