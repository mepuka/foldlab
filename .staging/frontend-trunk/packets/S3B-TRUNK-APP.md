# S3B-TRUNK-APP — the contract packet

Breaker: Lane C breaker (app half), Fable by explicit operator order,
2026-08-31. **This session does not implement the contracted surface.**
The packet and the battery are read-only to the implementer; a defect in
either is a BLOCK back here in writing, never an edit (`implement`
SKILL.md §Phase I).

- Subject: `../TRUNK-PLAN.md` §3 Lane C / **S3b — the app** (the SVG
  view, tokens, micro-tint, labels, N9 fallback, inspector, zero-state,
  a11y with its named gate, Lane-A seam integration, epoch handling,
  README refresh).
- Composes with: `packets/S3A-TRUNK-ENGINE.md` **including §10
  amendments** (the Doi field is `span`). The LANDED engine
  (`src/trunk/{model,fold,placement,place}.ts`, battery 87/87) is the
  frozen substrate; nothing in S3b re-decides what it decided. Its §5
  pinned `canonicalRects` serialization is **binding on this packet**:
  the engine's numbers are the byte reference the SVG must realize.
- Consumes: `packets/S1-HISTORY-ROUTE.md` — the `{since, limit}`
  fail-closed door, the refusal grammar, `--allow-origin`, L-A14's
  no-validator rule. S3b's seam sends what that door accepts and
  nothing else.
- Design of record: `../CANVAS.md` v2 §§2–6b, §8 (CV-3′ ruled by the
  spike: SVG in foldkit's vdom, camera-once, createLazy per column,
  NO Canvas2D fallback at v1 — the implementer report
  `.staging/agent-reports/2026-08-31-implementer-s3a-engine.md` §1);
  the aesthetics report §1.2/§1.3/§1.5/§1.8/§1.9/§2.2 (token values,
  geometry, WCAG 2.5.8 Equivalent budget); `../SPEC.md` N1/N5/N9, §3.2;
  decision 42 (docs/SPECS.md:614-630).
- Battery, under `experiments/workbench/src/trunk/` — **62 contract
  cases in eight files** (the split is oxlint's `max-lines: 300`, not
  a seam), red at COLLECTION today (each imports `./app.ts` and/or
  `./view.ts`, which do not exist):

  | file | cases | laws |
  |---|---|---|
  | `app.test.ts` | 9 | L-B1, L-B2, L-B5, L-B9, L-B10, L-B11 |
  | `app-poll.test.ts` | 11 | L-B3, L-B4, L-B6, L-B7, L-B8 |
  | `app-seam.test.ts` | 10 | L-S1..L-S5 |
  | `view-svg.test.ts` | 9 | L-V1, L-V2, L-V3, L-V5 |
  | `view-chrome.test.ts` | 8 | L-V6..L-V8 |
  | `view-inspector.test.ts` | 3 | L-V9, L-V10 |
  | `view-a11y.test.ts` | 7 | L-Y1..L-Y4 — **the named a11y gate** |
  | `view-memo.test.ts` | 5 | L-V4 (+ L-V3's memo half) |

  plus `fixtures/app-harness.test.ts` — **HARNESS VALIDATION, green
  today**, counted separately: it imports nothing under contract and
  proves the S3b harness devices are sound (the `__setRuntime` render
  path, lazy reference stability under a stable dispatch, the VNode
  walkers, the stub HTTP server), so a failure the implementer sees is
  a contract failure and never a harness bug.
- Harness: `src/trunk/fixtures/app-harness.ts` (breaker-owned,
  read-only, imports nothing under contract) beside S3a's
  `fixtures/harness.ts`, which the battery also reuses.
- **The browser battery is §7** — operator order 2026-08-31
  (browser-verification law): the VNode battery above is the
  implementer's red/green gate; renderer CLAIMS are proved only by
  running §7's scripted CDP checklist in a real browser and recording
  page-measured evidence. `check:workbench` is VNode-only and cannot
  see it (TP-8); §7 is therefore NAMED SCOPE, not a courtesy.

**The declared degree.** I have shown algebraically that S3b can be
implemented to: an exact-agreement statement of the SVG register
against the engine's byte gate (`canonicalRects`, computed
reference, all four golden DPRs); a delegation equation of the app's
fold to the engine's `foldDocument`; a one-authority statement of
layout (every chrome coordinate an engine number); a reference-equality
memo statement per column; a homomorphic refusal surface (transport,
door, truncation each landing in its own arm, none silent); and a
bijection statement of the a11y register against the placement's Square
set. Every law carries an executable falsifier against the TypeScript.
No soundness word attaches to any of it (estate C5) — host laws under a
battery, gate class G0/G1, plus a browser checklist whose evidence is
measured pages, not claims.

**CATEGORIES** (assigned here; the dispatch carried none — saying so
per BREAKER.md step 1): `contracts` · `abstraction-modules` ·
`representation-invariants` · `algebraic-laws` ·
`specification-design` · `mutation-frames` · `assertions` ·
`inductive-data` · `loops` (the poll drain and the backoff cadence).

**Obligation classes touched**: `domain`, `contract`, `adequacy`,
`invariant`, `frame`, `abstraction`, `conformance`, `claim-scope`.
(`termination` generates one line only: the poll is a 1 Hz loop by
design — it does not terminate and must not; the DECREASES heading
states the per-cycle variant instead. `conformance` is live here,
unlike S3a: the SVG register ↔ `canonicalRects` agreement is exactly
the model↔carrier class, discharged by L-V1.)

---

## 0. The frozen surface

Two new modules under `experiments/workbench/src/trunk/`, one CSS token
edit, and the rewiring of the skeleton's entry. The battery imports
these paths and these names; **nothing may be renamed** — a rename is a
packet change, which is a breaker commit.

### `src/trunk/app.ts` — the app's state machine and the Lane-A seam

```ts
export const POLL_MS: 1000          // the poll cadence (SPEC N4: the trunk POLLS and says so)
export const BACKOFF_MS: 5000       // the cadence after a refusal (TRUNK-PLAN §3: back off the poll)
export const CUT_SLACK: 2           // hysteresis: cut when a span exceeds CUT_SLACK · WINDOW (§4 OPEN-2)
export const BODY_PREVIEW_MAX: 4096 // bytes of a node body the inspector may hold

/** Transport refusals — the SEAM's vocabulary. Document malformedness is
 * NOT here: the engine's `decodeHistory` is the one door (S3a L-F7). */
export const PullRefusal: /* defineTaggedUnion */ {
  NoRoute: {}                        // HTTP 404 — no /history on this daemon
  Forbidden: {}                      // HTTP 403 — the Origin/Host door; fix names --allow-origin
  Status: { status: S.Int }          // any other non-200
  Unreachable: { detail: S.String }  // fetch threw (daemon down, CORS block)
}
export type PullRefusal = typeof PullRefusal.Type

export interface HistorySeamShape {
  /** GET {base}/history?since=<mark>. Answers the parsed 200 body as
   * `unknown` — the seam holds NO schema opinion; a 200 that is not
   * JSON answers the raw text for the door to refuse. */
  readonly pull: (since: number) => Effect.Effect<unknown, PullRefusal>
  /** GET {base}/cas/{address}. Answers at most BODY_PREVIEW_MAX bytes
   * as lowercase hex, plus the body's true byte size. */
  readonly load: (address: string) => Effect.Effect<
    { readonly hex: string; readonly size: number }, PullRefusal>
}
export class HistorySeam extends Context.Service<HistorySeam, HistorySeamShape>()(
  "foldlab/workbench/HistorySeam") {}
export const makeHttpSeam: (baseUrl: string) => Layer.Layer<HistorySeam>

export const Selection: /* defineTaggedUnion */ {
  None: {}
  Mark: { col: S.Int; row: S.Int; address: S.String }
  Run: { col: S.Int; fromRow: S.Int; count: S.Int }
}
export const Focus: /* defineTaggedUnion */ {
  None: {}
  Mark: { col: S.Int; row: S.Int }
}
export const BodyState: /* defineTaggedUnion */ {
  None: {}
  Loading: { address: S.String }
  Loaded: { address: S.String; hex: S.String; size: S.Int }
  Refused: { address: S.String; reason: S.String }
}

export const AppModel = S.Struct({
  trunk: Model,                       // the ENGINE's model, whole (S3a §0)
  doi: S.Struct({ span: S.Int, floor: S.Array(S.Int) }),   // the engine's Doi shape
  epoch: S.Struct({
    widthCss: S.Number, heightCss: S.Number, originYCss: S.Number,
    dpr: S.Number, theme: S.String, classifierRevision: S.Int,
  }),
  liveOriginYCss: S.Number,           // the scroll position; epoch.originYCss lags it by < DRIFT_CSS
  selection: Selection, focus: Focus, body: BodyState,
  pollMs: S.Number,                   // POLL_MS, or BACKOFF_MS while refused
  store: S.String,                    // the base URL — the face's store identity (N5)
})
export type AppModel = typeof AppModel.Type

export const Message: /* defineMessageUnion */ {
  TickedPoll: {}
  SucceededPullHistory: { body: S.Unknown }
  RefusedPullHistory: { refusal: PullRefusal }
  ClickedMark: { col: S.Int; row: S.Int; address: S.String }
  ClickedRun: { col: S.Int; fromRow: S.Int; count: S.Int }
  PressedKey: { key: S.String }       // "ArrowUp" | "ArrowDown" | "ArrowLeft" | "ArrowRight" | "Enter"
  ClickedReset: {}
  SucceededLoadBody: { address: S.String; hex: S.String; size: S.Int }
  RefusedLoadBody: { address: S.String; refusal: PullRefusal }
  Scrolled: { originYCss: S.Number }
  Resized: { widthCss: S.Number; heightCss: S.Number }
  ChangedDpr: { dpr: S.Number }
  ChangedTheme: { theme: S.String }
}
export type Message = typeof Message.Type

export const PullHistory: Command  // args { since: S.Int },  messages [SucceededPullHistory, RefusedPullHistory]
export const LoadBody: Command     // args { address: S.String }, messages [SucceededLoadBody, RefusedLoadBody]

export const initialApp: (store: string, boot: {
  readonly widthCss: number; readonly heightCss: number
  readonly dpr: number; readonly theme: string
}) => AppModel                      // Idle trunk (emptyModel), initialDoi, Selection.None,
                                    // Focus.None, BodyState.None, pollMs = POLL_MS,
                                    // liveOriginYCss = epoch.originYCss = -boot.heightCss,
                                    // classifierRevision = 0

/** max(min(doiFloor, count), count − tail.length) — the SAME effective
 * floor `placementOf` computes internally; L-V2 gates the agreement. */
export const effectiveFloor: (column: Column, doiFloor: number) => number

/** ∃t. count[t] − doi.floor[t] > CUT_SLACK · WINDOW. The ONLY trigger. */
export const needsCut: (trunk: Model, doi: Doi) => boolean

/** The engine's Epoch, projected for `terminators`. */
export const epochOf: (m: AppModel) => Epoch

export const update: (model: AppModel, message: Message) =>
  Update.Return<AppModel, Message, HistorySeam>
```

### `src/trunk/view.ts` — the SVG register and the chrome

```ts
/** Pinned: `translate(0 ${String(epochOriginYCss - liveOriginYCss)})` +
 * ` scale(${String(1 / dpr)})`, single space between the two. The ONE
 * transform that carries both scroll continuity and the device scale
 * (CANVAS §8 camera-once; spike §1.2). */
export const cameraTransform: (dpr: number, epochOriginYCss: number,
  liveOriginYCss: number) => string

/** One column's device rects — the per-column projection of the engine's
 * `place ∘ placementOf`, for the lazy groups. L-V2 pins the agreement:
 * concatenated over columns in order, this IS the engine's answer. */
export const columnRects: (column: Column, col: number, floor: number,
  viewport: Viewport, dpr: number) => ReadonlyArray<Rect>

/** The class vocabulary for marks: Square → `mark tint-N` with
 * N = tintIndex(address); Strip → `strip`; either on the unregistered
 * lane → `mark owed` / `strip owed` (no tint ladder on doubt). */
export const markClass: (op: Op) => string

export const view: (model: AppModel, h: HtmlBuilder<Message>) => Document
```

### Frozen test hooks (`data-testid` values the battery and §7 address)

`trunk-canvas` (the one `<svg>`) · `camera` (the one `<g>` carrying
`cameraTransform`'s string) · `column-<col>` (one `<g>` per lane,
0..15, each a `createLazy` group) · `label-<col>` (one lane label per
non-empty lane; DOM chrome per CR-41, carrying
`style.left = "<columnOriginCss(col)>px"` — the executable form of
TP-23) · `face` (the face-facts line) · `face-unregistered` (the
unregistered count element) · `inspector` · `trunk-list` (the a11y
list register) · `list-row` (one per Square op, carrying `data-col`
and `data-row` attributes, its text carrying the lane name, the
address and the kind name) · `list-strip` (one per Strip op, carrying
`data-col` and its count in text) · `zero-state`. The selection/focus
ring element carries class `ring`. The refusal surface carries a
control whose accessible name contains `reset` (role `button`).

### The CSS tokens (`src/styles.css` — the implementer edits it)

Declared in `:root` AND redeclared in the dark
`@media (prefers-color-scheme: dark)` block, at exactly these values
(aesthetics §1.2/§2.2, lowercase hex — the existing file's convention):

| token | light | dark |
|---|---|---|
| `--mark-strip` | `#6c6c6f` | `#87878a` |
| `--mark-strip-deep` | `#a9a9ab` | `#4e4e51` |
| `--owed` | `#bc442c` | `#ec775f` |
| `--mark-0` | `#121216` | `#e7e7ea` |
| `--mark-1` | `#141418` | `#e9e9ed` |
| `--mark-2` | `#16161a` | `#ececf0` |
| `--mark-3` | `#18181c` | `#efeff2` |
| `--mark-4` | `#1a1a1e` | `#f1f1f5` |

Class → paint: `.tint-N { fill: var(--mark-N) }`, `.strip { fill:
var(--mark-strip) }`, `.owed { fill: var(--owed) }` (and the face's
owed count takes `color: var(--owed)`). `--mark-strip-deep` is
DECLARED and UNUSED in v1 — it is the ramp's reserved deep-tail tone
for the layer-2 sediment band (aesthetics §1.6); declaring it now keeps
the ramp one decision. Hue appears NOWHERE else: `--owed` is the whole
saturated budget and it is spent on the unregistered lane and its count
(aesthetics §0/§1.2; ORNAMENTATION §3 inherited).

### The skeleton rewiring (implementer scope, named)

- `src/main.ts` becomes the trunk app's assembly (re-exporting
  `AppModel`/`Message`/`update`/`view` composition for `entry.ts`);
  `src/entry.ts` binds `makeHttpSeam(<base>)`, the boot facts
  (viewport, `devicePixelRatio`, theme), the poll timer subscription,
  and the scroll/resize/dpr/theme listeners **as Message producers** —
  the world enters as Messages, never read inside `update` or `view`
  (the engine's L-P8 posture carried up one level).
- The skeleton's probe panel, `src/store/seam.ts`, and the panel's
  scene/story assertions are RETIRED with it (TP-27: the "Lane B"/
  "Lane C" panel assertions are deleted WITH the panel; the skeleton's
  lane letters are inverted relative to the plan — ignore them).
- `README.md`: the skeleton sections are refreshed to describe the
  trunk app, §6's dev-viewer section stays as written by the breaker,
  and **no provenance-backed claim is added** while
  `package.json#foldlab.effectProvenance` says PENDING (§4 OPEN-4).

---

## 1. The algebra

Write `E` for the engine's exports (S3a §0), `m` for an `AppModel`,
`p` for a delivered body.

**The app is a labelled transition system over the engine's fold.** Its
whole store-facing dynamics is one delegation equation:

```
step(m, SucceededPullHistory p).trunk   =  E.foldDocument(m.trunk, p)
step(m, TickedPoll).commands  =  [ PullHistory { since: m.trunk.mark } ]
```

Everything else the app owns is chrome state (selection, focus, body
preview), epoch state (viewport, dpr, theme, doi), and cadence — none
of it a second opinion about the word. The app never parses the wire
(R2's heir), never computes its own mark (SPEC §2.2(a)), never holds a
receipt outside `trunk.columns[*].tail` (L-F6's heir).

**The view is a register of the engine's numbers.** With
`V = epoch viewport`, `d = epoch.dpr`, `F(t) = effectiveFloor(col t)`:

```
rects(m)        =  E.place(E.placementOf(m.trunk, m.doi), V, d)
rects(m)        =  ⧺_{t ∈ LANES} columnRects(m.trunk.columns[t], t, F(t), V, d)
svg(m)          =  one <g transform=cameraTransform(d, epoch.oy, live.oy)>
                     [ one <rect x y width height> per Rect, in order ]
```

The first line is the conformance square: the SVG's attribute
quadruples, read in tree order, must be the byte-identical integers of
`E.canonicalRects(rects(m), V, d)` (S3a §5). The second line is the
churn split (per-column lazy groups) constrained to be a PARTITION of
the first — so memoization can never change what is rendered, only
what is recomputed.

**The epoch law at app level** (decision 42(a), QA-4): between
terminators the placement extends and the camera absorbs scroll;
`E.terminators(epochOf(m), epochOf(m'), m'.trunk) ≠ []` is the ONLY
licence to re-place. The doi moves only through `E.cutDoi`, only when
`needsCut` — cuts are discrete events, never a per-fold slide (S3a
L-C3's premise kept true by construction).

**The a11y register is a bijection.** `listRows(m) ≅ Squares(m) ⊎
Strips(m)` — same placement, second register, nothing hidden (WCAG
2.5.8 Equivalent control, aesthetics §1.9; TP-21).

---

## 2. The headings

```
REQUIRES   Run-relative, over the STARTING AppModel and the delivered
           message:

  R1  m.trunk satisfies CI-1..CI-5 (S3a §2a) and m.doi.floor has
      length 16; m.epoch.dpr > 0; m.epoch.heightCss > 0.
  R2  bodies reach the fold only through Message.SucceededPullHistory; the door
      is E.decodeHistory inside E.foldDocument — the app adds NO
      precondition of its own on the body (it is `unknown` by type).
  R3  boot facts (viewport, dpr, theme) arrive through initialApp and
      the epoch Messages; nothing under src/trunk reads them ambiently.

ENSURES    Two-state, old = the model before the message:

  E1  SucceededPullHistory: trunk' = E.foldDocument(trunk, body); pollMs' =
      POLL_MS if trunk'.status = Live else BACKOFF_MS.
  E2  RefusedPullHistory: trunk'.status = Refused{reason naming the arm},
      trunk'.mark = mark, trunk'.columns === columns (reference);
      pollMs' = BACKOFF_MS.
  E3  TickedPoll: commands = [PullHistory{since: trunk.mark}], exactly;
      status' = Loading iff status = Idle, else status' = status.
  E4  ClickedReset: trunk' = E.emptyModel, doi' = E.initialDoi,
      commands = [PullHistory{since: 0}]. NO other message discards a
      column (decision 42 OPEN-1: reset is explicit, always).
  E5  after any fold: doi' = E.cutDoi(trunk', WINDOW) if
      needsCut(trunk', doi) else doi' === doi (reference).
  E6  Scrolled{y}: liveOriginYCss' = y; epoch.originYCss' = y iff
      |y − epoch.originYCss| ≥ E.DRIFT_CSS, else unchanged.
  E7  epoch fields move only by their own message (Resized, ChangedDpr,
      ChangedTheme, and E6's drift arm); classifierRevision is 0 in v1.
  E8  ClickedMark: selection' = Mark, body' = Loading, commands =
      [LoadBody{address}]. ClickedRun: selection' = Run, commands = [].
      SucceededLoadBody/RefusedLoadBody land iff their address is still the selected
      Mark's; a stale answer changes nothing.
  E9  PressedKey "Enter" with focus = Mark(c, r): the transition equals
      ClickedMark{c, r, address at (c, r)} exactly — model and commands.
      Arrow keys move focus over INDIVIDUATED cells only
      (row ∈ [effectiveFloor, count) of the column), clamped at every
      edge: Up = row+1, Down = row−1, Left/Right = the previous/next
      non-empty lane with the row clamped into its range; from
      Focus.None any arrow lands on the TIP (count−1) of the FIRST
      non-empty lane.

DECREASES  The poll loop deliberately does not terminate (it is the
           product). Per cycle: one PullHistory, one answer message —
           no message produces more than one in-flight pull, so the
           command count per cycle is bounded by 1 (the §13.2 stuck/
           spin hazard is cadence-side: pollMs ∈ {POLL_MS, BACKOFF_MS},
           never 0). Every other operation is a fold or map over the
           bounded model.

FRAME      update      reads  model, message
                       writes a NEW AppModel; no argument mutated;
                       untouched engine snapshots stay ===  (S3a E7
                       lifted: a chrome message keeps trunk === )
           view        reads  model                 writes nothing
           makeHttpSeam.pull/load
                       reads  the wire              writes nothing
                       (no store mutation, no caching, no validator
                       headers — W1's face + S1 L-A14)
           Nothing under src/trunk reads window, document,
           devicePixelRatio, Date, performance, Math.random,
           globalThis, or fetch — EXCEPT app.ts, which may name fetch
           ONLY inside makeHttpSeam (the one transport module), and
           nothing else. L-B11's scan decides it from the module text.
```

---

## 3. The laws and their falsifiers

`≡` is deep structural equality; `===` is reference equality. Every
fold in the battery is followed by S3a's `expectValid` (the carrier
invariant travels).

### The app's state (`src/trunk/app.test.ts`)

```
LAW  L-B1   INIT IS HONEST; THE FOUR STATES KEEP THEIR MEANINGS.
            initialApp(...) has trunk = E.emptyModel (Idle), doi =
            E.initialDoi, Selection/Focus/Body None, pollMs = POLL_MS.
            A tick from Idle moves to Loading; a tick from Live stays
            Live (the live face never flickers back to a spinner).
FALSIF      exhibit an initialApp that pre-folds anything, or a tick
            that degrades Live → Loading (SPEC §3.2: a hole never
            shows a spinner where it means EMPTY — or FILLED).
LICENCE     TRUNK-PLAN §3 (four-state union); SPEC §3.2; the
            skeleton's Probe precedent.
BATTERY     app.test.ts "the initial app is honest…", "the first tick
            asks and moves Idle to Loading", "a live trunk never
            degrades to Loading on a tick"

LAW  L-B2   THE DOOR IS THE ENGINE'S — one authority, no second parse.
            ∀ m, body. update(m, SucceededPullHistory{body}).trunk ≡
                       E.foldDocument(m.trunk, body)
            including every malformed body and the truncated page.
FALSIF      exhibit a body on which the app's trunk differs from the
            engine's answer — an app-side try/catch, pre-validation,
            "helpful" sort, or partial fold is exactly such a body.
LICENCE     S3a L-F7/E6 (the engine owns the door); the README law
            (described surfaces are generated, never re-parsed);
            §9.3 α-commutation (update commutes with the engine fold).
BATTERY     app.test.ts "the fold is the engine's foldDocument,
            verbatim" (fixture pages, marks fixture, garbage bodies)

LAW  L-B5   THE CUT IS DISCRETE AND DERIVED.
            needsCut(t, doi) ⟺ ∃lane. count − floor > CUT_SLACK·WINDOW
            ∧ after any fold: doi' = cutDoi(trunk', WINDOW) iff
              needsCut(trunk', doi), else doi' === doi
            ∧ cutDoi is the only producer of a doi value (S3a L-C3).
FALSIF      exhibit a fold after which the floor moved without
            needsCut (the sliding window S3a ADEQUACY-4 exhibits, one
            level up), or a needsCut fold that kept a 200-row span
            individuated forever (no cut ever — the unbounded-squares
            failure).
LICENCE     CANVAS §4 (aggregation is a CUT EVENT); §8 adopted
            two-threshold discipline (hysteresis, so a cut is not
            per-fold); TP-29 (WINDOW = 30 is the visible span).
            CUT_SLACK = 2 is the breaker's pin — §4 OPEN-2.
BATTERY     app.test.ts "the cut fires exactly when a span exceeds the
            slack", "update cuts through cutDoi and otherwise keeps
            the doi by reference"

LAW  L-B9   THE POLL ASKS FROM THE MARK, EXACTLY.
            update(m, TickedPoll).commands = [PullHistory{since:
            m.trunk.mark}] — never 0 after the first page, never a
            count, never mark±1.
FALSIF      exhibit a tick whose since ≠ the model's mark — the client
            that computes its own cursor has left the contract.
LICENCE     SPEC §2.2(a) ("a view stores next as received and sends it
            back unmodified"); W5; TP-19b (mark is a receipt INDEX).
BATTERY     app.test.ts "a tick asks exactly from the mark" (property
            over folded models)

LAW  L-B10  NO SECOND STORE, at the app level.
            Receipts reachable from an AppModel ≤ the engine's L-F6
            bound; body previews ≤ BODY_PREVIEW_MAX bytes of hex ×1;
            |JSON(AppModel)| ≤ engine B + 32 KB chrome slack after the
            10⁵-receipt feed driven THROUGH update.
FALSIF      exhibit a message sequence after which the app retains
            receipts outside the trunk's tails (a "recently seen"
            list, an inspector history, an unbounded preview).
LICENCE     S3a L-F6; SPEC §2.2 (mirror forbidden); CANVAS §3.
BATTERY     app.test.ts "the app model is bounded: no second store"

LAW  L-B11  THE APP IS AMBIENT-FREE; THE SEAM IS THE ONE TRANSPORT.
            No module under src/trunk names window, document,
            devicePixelRatio, Date, performance, Math.random, or
            globalThis; `fetch` appears in app.ts only (inside
            makeHttpSeam) and in no other src/trunk module. The world
            arrives as Messages through entry.ts.
FALSIF      exhibit the token in the module text — the scan is the
            executable form. (view.ts reading devicePixelRatio is the
            live hazard: the epoch's dpr is then unfalsifiable.)
LICENCE     S3a L-P8 lifted; TP-4; §2 FRAME.
BATTERY     app.test.ts "the app names no ambient global" (runs iff
            the modules exist; scan scoped to app.ts/view.ts —
            NOT to the engine, whose own L-P8 already scans it)
```

*(L-B11 rides `app.test.ts` as its 9th case, listed here out of
numeric order because it guards both new modules.)*

### The poll, refusals, epochs, input (`src/trunk/app-poll.test.ts`)

```
LAW  L-B3   REFUSAL KEEPS THE PLACEMENT AND BACKS OFF; RECOVERY
            RESTORES.
            transport refusal (E2) or door refusal (via L-B2):
              columns === (reference), mark unchanged on transport /
              E6-identical on door, pollMs = BACKOFF_MS, the reason a
              non-empty string naming the arm (Forbidden's names
              --allow-origin — the operator's fix, on the face)
            next Live fold: pollMs = POLL_MS.
FALSIF      exhibit a refusal that cleared a column, moved the mark
            (transport case), or kept polling at 1 Hz against a
            refusing daemon; or a recovery that stayed backed off.
LICENCE     TRUNK-PLAN §3 ("keep the last placement, stale-mark the
            face line, back off the poll"); S1's refusal grammar
            (the arms are decidable from status alone).
BATTERY     app-poll.test.ts "a transport refusal backs off…",
            "a malformed page refuses through the door…",
            "a success restores the cadence"

LAW  L-B4   BACKWARDS NEXT SURFACES; RESET IS EXPLICIT AND TOTAL.
            a page with next < mark folds to the engine's
            Refused{truncated} (columns kept, mark = next — S3a E1/
            OPEN-1 as ruled); ∀ message ≠ ClickedReset: columns are
            never discarded; ClickedReset ⟹ trunk = emptyModel, doi =
            initialDoi, commands = [PullHistory{since: 0}].
FALSIF      exhibit a non-reset message that discarded columns (the
            silent reset decision 42 forbids), or a reset that resumed
            from the stale mark (refolding nothing).
LICENCE     decision 42(b); S3a L-F3/OPEN-1 record; TRUNK-PLAN §6.
BATTERY     app-poll.test.ts "a backwards next surfaces truncation and
            only an explicit reset clears it", "no message but reset
            ever discards columns" (property over message samples)

LAW  L-B6   THE EPOCH MOVES ONLY BY ITS OWN MESSAGE; DRIFT IS THE
            SCROLL THRESHOLD.
            Scrolled y: live' = y always; epoch.originYCss follows iff
            |y − epoch.originYCss| ≥ DRIFT_CSS (199 stays, 200 moves —
            both directions). Resized/ChangedDpr/ChangedTheme move
            exactly their fields. E.terminators(epochOf(m),
            epochOf(m'), trunk') then reports exactly the moved facts.
FALSIF      exhibit a 199 px scroll that moved the epoch (thrash — the
            single-threshold failure CANVAS §8 names) or a 200 px one
            that did not (stale cull marches off-screen); exhibit an
            epoch field moved by a foreign message.
LICENCE     CANVAS §8 (two-threshold, Perfetto-attributed); S3a L-P9;
            TP-15.
BATTERY     app-poll.test.ts "scroll below the drift moves only the
            live origin; at the drift the epoch follows", "dpr, theme
            and resize move the epoch by their own message only"

LAW  L-B7   SELECTION IS A FACT CHAIN; STALE ANSWERS DROP.
            ClickedMark → Selection.Mark + BodyState.Loading +
            [LoadBody{address}]; ClickedRun → Selection.Run + NO
            command (v1 strips load nothing — TP-7's "not yet");
            SucceededLoadBody/RefusedLoadBody for an address ≠ the currently
            selected Mark's address change NOTHING.
FALSIF      exhibit a strip click that issued a load (there is no
            ranged read to serve it — CANVAS §3's stated price), or a
            superseded body answer overwriting the current selection's
            panel (the stale-iterator shape, §17.3).
LICENCE     CANVAS §3 (unclickable strips v1, priced); TP-7; the
            frame class.
BATTERY     app-poll.test.ts "clicking a mark selects it and asks for
            its body; a stale body answer is dropped", "clicking a
            strip selects the run and asks for nothing"

LAW  L-B8   KEYS ARE MESSAGES; ENTER IS THE CLICK, EXACTLY.
            PressedKey arrows move Focus.Mark over INDIVIDUATED cells
            only, per E9's pinned semantics (clamped; strip rows never
            focusable; from None, the tip of the first non-empty
            lane); PressedKey "Enter" at focus (c,r) ≡
            ClickedMark{c, r, address(c,r)} — the same model and the
            same commands.
FALSIF      exhibit an Enter whose transition differs from the click's
            in any field (the two-input-paths drift that voids the
            a11y equivalence), or an arrow that walks focus into a
            strip row (whose address the carrier does not hold —
            S3a L-C5's domain argument).
LICENCE     TP-21 (arrow keys emit the SAME Messages as clicks);
            aesthetics §1.9 (WCAG 2.5.8 Equivalent control).
BATTERY     app-poll.test.ts "arrow keys move focus over the square
            lattice, clamped", "enter on the focused square is the
            click, exactly"
```

### The seam (`src/trunk/app-seam.test.ts` — a real local HTTP stub)

```
LAW  L-S1   THE REQUEST IS THE DOOR'S GRAMMAR, AND NOTHING MORE.
            pull(n) issues exactly GET {base}/history?since=<n> — the
            canonical decimal, no other query key, no If-None-Match /
            validator header (S1 L-A8's fail-closed door approached
            from the client side; L-A14's cut respected).
FALSIF      exhibit a request carrying another key (`limit`, `tag`,
            `from`…) or a conditional header — the door 400s the
            former and the packet forbids courting the latter.
LICENCE     S1 L-A7/L-A8/L-A14; QE-A3.
BATTERY     app-seam.test.ts "pull asks exactly GET /history?since=…"

LAW  L-S2   THE SEAM CLASSIFIES TRANSPORT AND HOLDS NO SCHEMA OPINION.
            404 → NoRoute; 403 → Forbidden; other non-200 → Status;
            thrown fetch → Unreachable; 200 JSON → that value as
            unknown (garbage included); 200 non-JSON → the raw TEXT
            (the door refuses it downstream, one authority).
FALSIF      exhibit a 200 body the seam rejected or reshaped (a
            second decode authority — exactly what the mirrors exist
            to prevent), or a 403 surfaced as a generic error (the
            operator then never learns --allow-origin is the fix).
LICENCE     S3a L-F7 (the one door); S1 L-A9/L-A10 (the statuses are
            law on the server side, so they are decidable here).
BATTERY     app-seam.test.ts "a 200 page arrives as the body,
            undecoded", "404 is NoRoute", "403 is Forbidden",
            "another status is Status", "an unreachable daemon is
            Unreachable", "a 200 that is not JSON answers the raw
            text for the door to refuse"

LAW  L-S3   THE ZERO STORE IS AN ANSWER, NOT AN ERROR.
            200 {"next":0,"word":[]} → pull succeeds; the fold answers
            Live, mark 0, 16 empty columns (S1 L-A10: never 404 on an
            empty word — and the app must not treat it as one).
FALSIF      exhibit the empty page surfacing as a refusal, or folding
            to anything but Live/0/empty.
LICENCE     S1 L-A10; SPEC §3.2 (EMPTY is a state, not an absence).
BATTERY     app-seam.test.ts "the zero store's page is an answer"

LAW  L-S4   THE BODY PREVIEW IS BOUNDED AND HONEST.
            load(a) issues GET {base}/cas/<a>; answers ≤
            BODY_PREVIEW_MAX bytes as lowercase hex plus the TRUE
            size; a longer body arrives truncated with size intact.
FALSIF      exhibit a 1 MB body held whole in the model (L-B10 dies),
            or a truncated preview reporting the truncated length as
            the size (the honest count is the law — the Perfetto
            carry, one level up).
LICENCE     L-B10; CANVAS §8 (count through the collapse).
BATTERY     app-seam.test.ts "load answers a bounded hex preview with
            the true size"

LAW  L-S5   READING IS STATE-FREE AT THE CLIENT TOO.
            pull ; pull ≡ pull (same answers, same requests — no
            cache, no validator, no cookie growth).
FALSIF      exhibit two identical pulls answered differently by the
            seam layer, or a second request that grew headers.
LICENCE     W1's face; S1 L-A4/L-A14.
BATTERY     app-seam.test.ts "two pulls are identical and stateless"
```

### The SVG register (`src/trunk/view-svg.test.ts`)

```
LAW  L-V1   THE GOLDEN REGISTER — the SVG realizes the engine's bytes.
            For every model: under testid `camera`, the <rect> nodes
            in tree order number |rects(m)| and their x/y/width/height
            attributes are STRING-EQUAL to the four integers of the
            corresponding E.canonicalRects line — at the pinned state
            (the 220-receipt fixture folded whole, doi =
            cutDoi(trunk, WINDOW), viewport {507, 660, −660}) and at
            ALL FOUR golden DPRs 1 / 1.5 / 2 / 3.
FALSIF      exhibit one rect whose attribute differs from the engine's
            line by one character — a view-side re-round, a CSS-float
            leak (S3a FLAG-5), a reordered column, a culled rect
            rendered or a rendered rect culled.
LICENCE     S3a §5 ("S3b's SVG register must reproduce these numbers
            verbatim"); TP-13 (the four DPRs); CANVAS §5 (agreement is
            GEOMETRIC, the gate compares place's lists); the dispatch
            ("canonicalRects goldens from the engine are the byte
            reference").
BATTERY     view-svg.test.ts "the SVG register realizes canonicalRects
            verbatim at dpr 1", "…at each golden DPR", "rects arrive
            in place's order under one camera group", "culling is the
            engine's: what place answers is what renders"

LAW  L-V2   ONE LAYOUT AUTHORITY (TP-23, executable).
            ⧺_cols columnRects(column, col, effectiveFloor(column,
            doi.floor[col]), V, d) ≡ E.place(E.placementOf(trunk,
            doi), V, d)   — deep-equal, in order —
            ∧ every label / foot-band x-position in the chrome equals
              E.columnOriginCss(col) for its lane
            ∧ effectiveFloor agrees with the placement's own floor
              (strip count and first square row).
FALSIF      exhibit a column whose split-out rects differ from the
            whole placement's (a second layout arithmetic — the
            contract violation S3a §7 names, not a style preference),
            or a label at a position place did not derive.
LICENCE     TP-23 ("positioned FROM place's column origins — no
            second layout arithmetic"); S3a §7 edge.
BATTERY     view-svg.test.ts "columnRects agrees with the whole
            placement, column by column" (property), "labels and the
            foot band sit at place's column origins"

LAW  L-V3   THE CAMERA IS ONE TRANSFORM.
            Exactly one element carries testid `camera`; its transform
            attribute equals cameraTransform(d, epoch.oy, live.oy) =
            `translate(0 <delta>) scale(<1/dpr>)` (String(), single
            spaces); at rest delta = 0. A sub-drift Scrolled changes
            the transform attribute and NOTHING else in the svg.
FALSIF      exhibit a second transform between camera and rect (a
            per-column transform re-litigates the camera), or a
            sub-drift scroll that re-rendered a column.
LICENCE     CANVAS §8 (camera-once); spike §1.2 (a camera edit
            re-rendered ZERO columns, measured).
BATTERY     view-svg.test.ts "the camera transform is the pinned
            formula"; view-memo.test.ts "a sub-drift scroll changes
            only the camera transform"

LAW  L-V5   TINTS AND TOKEN CLASSES ON THE MARKS.
            Every Square rect's class = markClass(op) = `mark tint-N`,
            N = E.tintIndex(address) — except the unregistered lane,
            `mark owed`. Every Strip rect: `strip` / `strip owed`.
            All five tint steps occur on the fixture (its addresses
            realize them — S3a §8).
FALSIF      exhibit a square whose class disagrees with the pinned
            index (char-code tint, `"a" % 5` NaN — TP-13's two named
            failures), a tint ladder on the unregistered lane (hue is
            for doubt, undiluted), or flat ink everywhere (A6 adopted,
            not optional).
LICENCE     TP-13 (pinned index); aesthetics §2.2 (the ladder), §1.2
            (owed spent on unregistered); S3a L-M4.
BATTERY     view-svg.test.ts "each square carries its pinned tint
            class; unregistered marks carry owed", "strips carry the
            strip class"
```

### The chrome (`src/trunk/view-chrome.test.ts` — L-V6..L-V8; `src/trunk/view-inspector.test.ts` — L-V9/L-V10)

```
LAW  L-V6   THE TOKENS EXIST AT THE RULED VALUES, BOTH THEMES; HUE
            STAYS RESERVED.
            src/styles.css declares the eight §0 tokens in :root and
            redeclares all eight in the dark block, exact lowercase
            hex; `.owed` (fill) and the face's owed color read
            var(--owed); in the rendered VNode the class `owed`
            appears ONLY on unregistered-lane rects and the
            face-unregistered element.
FALSIF      exhibit a missing/mistyped token (theme-blind trunk), or
            `owed` on any registered lane's surface — the one
            saturated colour spent twice means it no longer means
            doubt.
LICENCE     aesthetics §1.2 (measured values, contrast-checked), §0
            (hue reserved — ORNAMENTATION §3 inherited); the dispatch
            (tokens are S3b scope by name).
BATTERY     view-chrome.test.ts "styles.css declares the ruled tokens,
            light and dark, at the measured values", "the five-step
            mark ladder exists at the measured values", "owed appears
            nowhere but the unregistered surfaces"

LAW  L-V7   THE FACE SAYS THE FACTS — N1, N5, TP-19b.
            The face (testid `face`) carries: the total count
            (E.totalCount), the mark as a DECIMAL INDEX (never hex),
            the store string, the clock attribution ("the admitting
            host's clock" — per-device honest, N5), and the
            unregistered count (testid `face-unregistered`), which
            takes class `owed` iff > 0. On Refused status the face
            additionally carries the refusal reason verbatim and the
            word "stale" against the mark (the placement stays — the
            face says why it is old).
FALSIF      exhibit a face presenting the mark as an address (TP-19b's
            named confusion), claiming a global position (N5), or a
            refusal with a fresh-looking face (stale-but-fresh is the
            lie TP-12 killed ETag over).
LICENCE     SPEC N1/N5; TP-19b; aesthetics §1.8 (face-facts line);
            TRUNK-PLAN §3 (stale-mark the face line).
BATTERY     view-chrome.test.ts "the face carries the facts…", "the
            unregistered count takes owed exactly when non-zero", "a
            refused face carries the reason and the stale mark"

LAW  L-V8   FIRST PAINT AND EMPTY STORE ARE DIFFERENT SENTENCES —
            the CLI's wordings, verbatim.
            Live ∧ total 0 ∧ mark 0 ⟹ the zero-state (testid
            `zero-state`) contains EXACTLY the CLI's sentence: "no
            history yet — receipts begin when a store first opens with
            the word log; earlier content is present without receipts"
            (bin/cli/history.ts:164). Live ∧ total 0 ∧ mark N>0 ⟹
            "nothing since mark N" (:165). Idle/Loading ⟹ NEITHER
            sentence appears (asking is not emptiness).
FALSIF      exhibit a first paint claiming the store is empty (the
            spinner/EMPTY confusion SPEC §3.2 forbids), or a reworded
            sentence (two registers of one document disagreeing —
            N9's argument applied to prose).
LICENCE     SPEC §3.2 + FT-1b ("reuse the wording; it is N1 rendered
            honestly"); TRUNK-PLAN §3 (the two wordings, verbatim).
BATTERY     view-chrome.test.ts "the empty store sentence is the
            CLI's, verbatim; first paint is not it", "nothing since
            mark N is the second wording"

LAW  L-V9   THE INSPECTOR APPENDS; SELECTION NEVER TOUCHES A MARK.
            The inspector (testid `inspector`) is a following sibling
            of the canvas in document order — never an overlay; with a
            selection, every rect's x/y/width/height is IDENTICAL to
            the unselected render (uniform marks: the ring is a
            separate non-filled element in the gap); the panel shows
            the receipt's facts: seq, at (the stored instant), the
            full address in 8-char groups, kindName (bare hex for
            unregistered — N9), size, and the body preview; absent
            facts render as "—", never 0.
FALSIF      exhibit a selection that moved or restyled the mark's own
            rect (the mark carries presence only — S3a L-P6's spirit
            at the app), an occluding panel (the append-only layout
            law), or a 0 where the model computed nothing.
LICENCE     aesthetics §1.9 (append below, never occlude; selection
            outside the rect; — never 0); CANVAS §6 (CR-41: chrome is
            DOM); SPEC N9.
BATTERY     view-inspector.test.ts "the inspector appends after the
            canvas; selection changes no rect geometry", "the
            inspector shows the receipt's facts…"

LAW  L-V10  A STRIP SAYS NOT YET — and names its count (and its marks
            when it honestly can).
            Selecting a Run shows: the count; the words "not yet"
            (never "cannot" — TP-7); and the mark range "marks a–b"
            EXACTLY WHEN every stripped receipt is still held
            (count = tail.length, i.e. the carrier holds the whole
            column: a = tail[0].seq, b = tail[floor−1].seq); beyond
            the carrier, no range is invented.
FALSIF      exhibit a strip face saying "cannot"; a fabricated mark
            range for rows the carrier does not hold (inventing
            addresses is S3a L-C5's crime, inventing marks is its
            prose form); or a strip selection with no count (the
            collapse stops being honest).
LICENCE     TP-7 ("not yet", not "cannot"); CANVAS §3 (the announce
            text carries the count; the bounded window's stated
            price); S3a CI-2 (what is held is decidable). The
            range-when-held refinement is the breaker's — §4 OPEN-3.
BATTERY     view-inspector.test.ts "a selected strip says not yet,
            with its count — and its marks only when held" (fixture:
            range present; synthetic beyond-carrier column: count
            only, no invented range)
```

### The a11y register (`src/trunk/view-a11y.test.ts`) — **THE NAMED GATE**

The gate's name is **`trunk-a11y`**: this file, whole, plus §7 BB-5.
TP-21 requires the gate to be NAMED; this is it, and `check:workbench`
runs it.

```
LAW  L-Y1   THE LIST IS THE SAME PLACEMENT — a bijection, nothing
            hidden.
            Under testid `trunk-list`: one row per Square op (lane
            name, row, address, kindName — bare hex included) and one
            row per Strip op (lane name, count), in canonical op
            order; no row besides; Σ list rows ≡ |placement.ops|.
FALSIF      exhibit a Square with no row or a row with no Square (the
            Equivalent control then fails WCAG 2.5.8 exactly where it
            is needed), or a hidden unregistered receipt (fail-closed
            rendering dies).
LICENCE     TP-21 (Square-set ↔ list-row-set correspondence property);
            aesthetics §1.9 (the addressable list view IS the
            conformance device); TRUNK-PLAN §6 (a11y equivalence
            seed).
BATTERY     view-a11y.test.ts "every square has exactly one list row;
            every list row a square", "the list rows carry lane, row,
            address and kind", "strips appear in the list with their
            counts"

LAW  L-Y2   THE TWO INPUT PATHS ARE ONE LAW.
            The Message a square rect's click handler carries ≡ the
            Message the Enter path produces at that cell's focus —
            extracted from the VNode handlers and compared as values;
            with L-B8 this closes click ≡ keyboard end to end.
FALSIF      exhibit a rect whose click Message differs from the
            keyboard path's for the same (col, row) — two routes into
            update that can drift independently.
LICENCE     TP-21 ("arrow-keys emitting the SAME Messages as clicks").
BATTERY     view-a11y.test.ts "the rect's click message is the
            keyboard's message"

LAW  L-Y3   THE CANVAS IS ADDRESSABLE; THE MARKS ARE NOT THE REGISTER.
            The svg (testid `trunk-canvas`) is focusable (tabindex 0)
            and carries an aria-label naming the trunk with the face
            facts (store, mark — N1/N5 reach the tree); the mark
            rects are aria-hidden (the LIST is the accessible
            register, one authority — a parallel per-rect tree would
            be a second one).
FALSIF      exhibit an unlabelled or unfocusable canvas (keyboard
            users cannot reach the equivalence at all), or marks
            exposed as 2 000 anonymous tree nodes (the a11y-tree
            flooding the fallback exists to prevent).
LICENCE     CANVAS §5 (the fallback conveys the canvas's purpose —
            WHATWG requirement cited there); aesthetics §1.9.
BATTERY     view-a11y.test.ts "the canvas is focusable and labelled;
            the marks are hidden from the tree"

LAW  L-Y4   FOCUS IS VISIBLE AND SURVIVES GROWTH.
            The focused cell renders the ring element (in the gap,
            L-V9's device); a fold that grows OTHER lanes leaves focus
            where it was; a fold growing the focused column keeps the
            focused (col, row) — positions never move (S3a L-P1), so
            neither does focus.
FALSIF      exhibit focus silently lost on growth (the 1 Hz poll then
            steals the keyboard user's place once a second).
LICENCE     S3a L-P1/L-C4 (positions immutable — what makes stable
            focus POSSIBLE); WCAG visible-focus (aesthetics §1.9).
BATTERY     view-a11y.test.ts "the focused cell is visible: the ring
            rides focus", "focus survives growth"
```

### The memo (`src/trunk/view-memo.test.ts`)

```
LAW  L-V4   THE MEMO LAW AT THE VIEW — the spike's measurement, as
            contract.
            Rendered under one stable dispatch (__setRuntime — the
            harness proves the device sound):
            (a) view(m) twice ⟹ all sixteen column-group VNodes
                reference-identical;
            (b) a fold touching lane i only ⟹ column i's group is a
                new VNode, the other fifteen are ===;
            (c) a sub-drift scroll ⟹ ALL sixteen are === (the camera
                alone changed — L-V3);
            (d) a dpr change ⟹ the rects are the engine's at the new
                dpr (the terminator voids the memo; correctness
                survives it);
            (e) a cut ⟹ exactly the columns whose effective floor
                changed re-render; the rest stay ===.
FALSIF      (a/b) exhibit an untouched column re-rendered — createLazy
            keyed on a fresh-per-render object (the per-column rect
            ARRAY is the tempting one: place() output sliced per
            column is a new array every render and the memo never
            hits — TP-10's actual failure, one level up);
            (b) exhibit a stale column — a key missing the snapshot;
            (d) exhibit stale device numbers under a new scale (the
            camera-only dpr flip is a spike INSTRUMENT, not a
            rendering law: rects must be re-placed).
LICENCE     TP-10 + spike §1.2 (15/16 columns skip construction AND
            diffing, measured); S3a L-F5 (the engine holds up its half:
            snapshots are ===-stable); createLazy's contract
            (fn, dispatch, args by ===  — foldkit dist/html/lazy.js).
BATTERY     view-memo.test.ts, all five cases
```

---

## 4. Open rulings and breaker pins (escalated, not settled)

```
OPEN-1  EFFECT PROVENANCE IS PENDING (TRUNK-PLAN §4). package.json
        names effect 4.0.0-rc.112 UNRESOLVED against the provenance
        lock (rc.111). S3b claims nothing provenance-backed: the
        README refresh must not add such a claim, and this packet's
        laws cite none. Settling the pin is one of the three acts the
        README already lists, none of them this lane's. ESCALATED.

OPEN-2  THE CUT TRIGGER is the breaker's pin: needsCut ⟺ span >
        CUT_SLACK·WINDOW, CUT_SLACK = 2 (hysteresis on CANVAS §8's
        two-threshold discipline; cut cadence = every WINDOW receipts
        per lane at steady state). No ruling names a trigger; one is
        REQUIRED for cuts to be events at all (L-B5's ground). If the
        operator rules a different trigger, needsCut's equation and
        its two battery cases change; every other law survives as
        stated. The implementer BLOCKS rather than choosing a third.

OPEN-3  THE STRIP ANNOUNCE RANGE. CANVAS §3's announce text is
        "N admissions, marks a–b", but a strip's interior marks are
        HELD only while the whole column fits the carrier (CI-2);
        beyond it the range is unknowable without the ranged read v1
        does not have. L-V10 pins: range exactly when held, count
        always, "not yet" always. If the operator wants the range
        always, that is a Lane-A `from`/`to` dependency (TP-7), not an
        app edit.

OPEN-4  POLL NUMBERS. POLL_MS = 1000 (the SPEC's 1 Hz reading) and
        BACKOFF_MS = 5000 are breaker pins; only the two-level
        structure is law (L-B3). Re-ruling the numbers re-pins two
        constants and no law.

OPEN-5  THE STORE IDENTITY ON THE FACE. N5 wants the face to name the
        store and the device. The app has one honest carrier today:
        the daemon base URL (the `store` field) and the receipts'
        own clock attribution. The face pins those. A richer identity
        (store path, host name) needs a Lane-A surface that does not
        exist; nothing here should be read as settling what it would
        look like.
```

---

## 5. The pinned golden state (binding on the battery and §7)

One state, used by L-V1 and by §7's BB-3 so the two batteries measure
the same page:

```
trunk    = foldDocument(emptyModel, <the 220-receipt fixture, whole>)
doi      = cutDoi(trunk, WINDOW)          // = what update itself
                                          // produces after that fold
                                          // (needsCut: chunk 85 > 60)
viewport = { widthCss: 507, heightCss: 660, originYCss: -660 }
dprs     = GOLDEN_DPRS = [1, 1.5, 2, 3]
```

At this state the placement carries strips (chunk floors at 55, step at
8) AND squares in every non-empty lane, all five tint steps, and the
unregistered lane's three receipts — every rendering law has a witness
on the page. The expected bytes are COMPUTED from the engine
(`canonicalRects`) at test time, never stored: the engine's own battery
pins the byte format, so a drift in either half is a red here.

---

## 6. The dev fixture viewer (breaker-built harness; dev-only)

Operator order, second deliverable — **implemented by the breaker as
harness territory**; it is NOT the contracted app and must never be
mistaken for it.

- `dev/index.html` + `src/dev/fixture-view.ts` (pure scene builder) +
  `src/dev/entry.ts` (plain-DOM SVG renderer — deliberately NOT
  foldkit, so it cannot be confused with the contracted view). Open
  `bun run dev` → `http://localhost:5173/dev/index.html` and SEE the
  220-receipt fixture rendered through the REAL engine pipeline:
  fixture bytes → `decodeHistory` (S0's generated mirror — the ONE
  decode path, never a second parse) → `foldDocument` → `cutDoi` →
  `placementOf` → `place` → rects, with the page banner saying
  DEV-ONLY.
- Freshness rules, enforced mechanically:
  1. `fixtures/conformance.test.ts` (S3a, green) — the fixture decodes
     through the generated `wordHistorySchema`.
  2. `src/dev/fixture-view.test.ts` (**the dev-fixture freshness
     gate**, green today, runs in `check:workbench`) — the dev
     module's scene: fixture accepted by the engine door, totals
     220/Σ220/unregistered 3, rects non-empty, disjoint
     (`isDisjoint`), byte-agreement of its canonical serialization
     with the engine's.
  3. The mirrors are OUTPUTS: regenerate with `mise run
     gen:backend-word` and `mise run gen:grammar-manifest`
     (mise.toml:273,332; the workbench copies are second outputs of
     the same emitters — never edited by hand). A mirror/fixture
     drift reds gates 1–2.
- The viewer is breaker-owned like `fixtures/harness.ts`. The
  implementer does not edit it; when the app lands, the app's OWN
  fixture story is the §5 golden state through its own view, gated by
  L-V1 — the dev viewer stays as the engine's independent witness.

---

## 7. THE BROWSER BATTERY (named scope; run by the implementer, evidence recorded)

Operator law 2026-08-31: renderer claims are proved in a REAL browser
via the user-level `cdp` skill (`~/.claude/skills/cdp`,
`browser-harness-js` — a persistent typed CDP session). The VNode
battery cannot see namespaces, computed styles, hit-testing, the a11y
tree, or DPR; these eight items can. **Each item names its pass
criterion in exhibit form and the evidence the implementer's report
must record — numbers measured from the page, never prose.** Run
against `bun run dev` in `experiments/workbench` with the app mounted
on the §5 golden state (the fixture-backed run; BB-8 alone needs the
live daemon). Setup:

```bash
# one-time: launch a disposable Chrome and connect
"/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" \
  --remote-debugging-port=9222 --user-data-dir=/tmp/s3b-bb --headless=new &
browser-harness-js 'await session.connect({port:9222})'
browser-harness-js 'await session.Page.navigate({url:"http://localhost:5173/"})'
```

```
BB-1  NAMESPACE. Every mark is an SVG rect, none an
      HTMLUnknownElement.
      SNIPPET  Runtime.evaluate:
        const rs=[...document.querySelectorAll('[data-testid=camera] rect')];
        ({n:rs.length, allSvg:rs.every(r=>r instanceof SVGRectElement),
          anyUnknown:[...document.querySelectorAll('*')]
            .some(e=>e instanceof HTMLUnknownElement)})
      PASS     n = the engine's rect count at the golden state;
               allSvg true; anyUnknown false.
      RECORD   the three values.

BB-2  TOKENS, BOTH THEMES. Computed styles resolve the ruled values.
      SNIPPET  for each theme via Emulation.setEmulatedMedia
               ({features:[{name:'prefers-color-scheme',value:'dark'}]})
               then getComputedStyle(document.documentElement)
               .getPropertyValue('--owed') (and --mark-strip,
               --mark-0..4), plus getComputedStyle on one unregistered
               rect and one strip rect → fill.
      PASS     values equal §0's table (as rgb() equivalents for
               fills); the unregistered rect's fill = --owed's value;
               a registered square's fill = its tint step's value.
      RECORD   the resolved strings, light and dark.

BB-3  GOLDEN DPRS. The page realizes the engine's bytes at 1/1.5/2/3.
      SNIPPET  per dpr: Emulation.setDeviceMetricsOverride({width:900,
               height:800, deviceScaleFactor:dpr, mobile:false}); then
               in page:
        const m=await import('/src/trunk/model.ts'),
              f=await import('/src/trunk/fold.ts'),
              p=await import('/src/trunk/placement.ts'),
              pl=await import('/src/trunk/place.ts');
        // fold the fixture, cutDoi, place at the §5 viewport with
        // THIS dpr, compare canonicalRects' lines to the DOM rects
        // under [data-testid=camera] in order (x,y,width,height).
      PASS     per dpr: line count = rect count; zero mismatched
               quadruples; window.devicePixelRatio = dpr.
      RECORD   per dpr: rect count and mismatch count (must be 0).

BB-4  HIT-TESTING IS THE BROWSER'S (TP-22). elementFromPoint over a
      known square's CSS center answers that exact rect; over a
      class-gutter x answers a non-rect.
      SNIPPET  compute a square's CSS box from its attrs (x/dpr +
               camera translate + svg client origin), then
               document.elementFromPoint(cx, cy) === that node; then
               probe x = (columnOriginCss(4) − 15)/1 mid-gutter.
      PASS     identity true; gutter probe not a rect.
      RECORD   both answers.

BB-5  THE A11Y TREE AND THE KEYBOARD (trunk-a11y's browser half).
      SNIPPET  Accessibility.getFullAXTree → the canvas node's name
               carries the store and mark; the list rows exist; then
               Input.dispatchKeyEvent Tab until the canvas has focus
               (document.activeElement), ArrowUp ×2, Enter; read the
               inspector's address; click the same square with
               Input.dispatchMouseEvent; compare panels.
      PASS     labelled canvas node present; ≥ |Squares| list entries
               reachable; Enter-panel address = click-panel address;
               focused cell's ring present
               (querySelector('.ring') non-null while focused).
      RECORD   the AX name string, the two addresses (equal), the
               focus path taken.

BB-6  REFUSAL AND BACKOFF, LIVE. With the daemon absent (or the seam
      pointed at a dead port): the face carries the refusal and
      "stale"; the poll slows.
      SNIPPET  Network.enable; count /history requests over 12 s;
               read the face text.
      PASS     face names the refusal arm; request count ≤ 3 in 12 s
               (BACKOFF_MS = 5000), against ≥ 10 when live at
               POLL_MS.
      RECORD   both counts and the face string.

BB-7  SCROLL CONTINUITY. A sub-drift scroll edits the camera only.
      SNIPPET  read the camera transform + one column <g> node
               reference (mark via data attribute in page), scroll
               150 CSS px (Input.dispatchMouseEvent wheel), re-read;
               then scroll past 200 more.
      PASS     after 150: transform changed, same element nodes, rect
               attrs unchanged; after the drift: re-place occurred
               (transform's translate returned toward 0 / attrs
               moved).
      RECORD   the two transforms and the node-identity booleans.

BB-8  THE DONE SMOKE (TP-8 — MANUAL BY NAME; the only item needing
      the daemon). `cas daemon` serving a real store with
      --allow-origin for the dev origin; another process runs
      `cas put`; within 2 s a new square appears and the face count
      increments; nothing in the tab can write.
      PASS     observed growth; screenshot.
      RECORD   the before/after face lines and the screenshot path
               beside the implementer's report.
```

Evidence discipline: §7 results go in the implementer's report as
measured values (counts, strings, booleans), each labelled BB-n.
"Looked right" is not evidence. A BB failure on a law this packet
states is a red gate; a BB failure on something no law states is a
finding to bring back, not a licence to edit the packet.

---

## 8. Adversarial implementations (the `adequacy` discharge)

Wrong-but-passing candidates exhibited before any code exists; each is
the reason a law reads the way it does.

```
ADEQUACY-1  view slices place() output per column each render and
            feeds the slices to createLazy. Renders pixel-identical,
            passes L-V1/L-V2 — the memo NEVER hits (fresh array ≠
            fresh array) and every fold re-renders 16 columns.
            Killed by L-V4(b)'s reference check. (TP-10's failure.)
ADEQUACY-2  app-side JSON.parse + shape check before foldDocument
            ("defensive"). Passes every happy-path case; on a body
            with an extra key or a subtle malformation the app and
            the engine now disagree about WHICH refusal — and one
            day it "fixes" a page the door refuses. Killed by L-B2's
            ∀-body delegation equation.
ADEQUACY-3  `mark = Math.max(model mark, page next)` at the app (the
            engine already answers next; the app "protects" it).
            Passes all forward cases; on truncation the app asks from
            a mark the store no longer has, forever. Killed by L-B9 +
            L-B4 (S3a ADEQUACY-6 one level up).
ADEQUACY-4  refusal rendered by CLEARING the trunk ("show the error
            state"). Passes any test that only reads the error text.
            Killed by L-B3/L-B4's reference-kept columns — the ruled
            rendering keeps the last placement and stale-marks it.
ADEQUACY-5  labels laid out by CSS flex over 16 equal columns.
            Looks identical at default width, passes any text
            assertion. Killed by L-V2's equality against
            columnOriginCss (27/42/57 px gutters are not equal).
ADEQUACY-6  Enter handled in the DOM by synthesizing a click on the
            focused rect. Passes end-to-end behaviour today; the two
            paths drift the day the click handler gains a modifier
            arg. Killed by L-Y2 + L-B8 comparing the MESSAGES, not
            the outcomes.
ADEQUACY-7  the a11y list rendered from the DOM rects ("one source").
            Passes the bijection while the placement and the render
            agree; when a culling bug drops a rect, the list lies in
            sympathy. Killed by L-Y1 building its expectation from
            placementOf directly (the register mirrors the ALGEBRA,
            not the other register).
```

## 9. Where the implementer starts

`bun --bun vitest run` in `experiments/workbench` today:

```
Test Files  8 failed | 11 passed (19)
      Tests  94 passed (94)
Error: Cannot find module './app.ts'  (every battery file, directly
       or via ./view.ts)
```

The eight red files are this battery, red at COLLECTION on the missing
modules — not on an assertion, not on a harness error. The eleven
green: S3a's six engine files, its `fixtures/conformance.test.ts`,
this packet's `fixtures/app-harness.test.ts`, the dev-fixture
freshness gate (`src/dev/fixture-view.test.ts`, §6), and the
skeleton's two (scene/story — which the implementer retires WITH the
probe panel, TP-27, §0). `check:workbench`'s lint and build stay green; `tsc`'s
errors are confined to the eight battery files (the missing modules
and their `any` cascades) — every pre-existing file typechecks. First vertical slice: `app.ts` with `initialApp`/`update`
minus the seam (turns `app.test.ts` into named failures), then
`makeHttpSeam`, then `view.ts` against L-V1's golden state, law by
law. **Promote `fast-check` if desired exactly as S3a FLAG-7 already
licenses — same terms.**

## 10. The edge — what the implementer may NOT do

- **No edits to this packet, the battery, `fixtures/app-harness.ts`,
  the dev viewer (`dev/`, `src/dev/*`), or anything S3a froze.** A
  defect anywhere in them is a written BLOCK to the breaker.
- **No second decode of the wire, anywhere** (L-B2, L-S2). The door is
  `decodeHistory`, reached through `foldDocument`.
- **No second layout arithmetic** (L-V2). Every coordinate on the page
  is an engine number or a CSS token; a hand-computed pixel is a
  contract violation.
- **No ETag / If-None-Match / 304 / Last-Modified; no `limit`,
  `from`, `to`, or any receipt-field parameter on the wire** (L-S1;
  S1 L-A8/L-A14; TP-7 — the strip face says "not yet", never
  "cannot").
- **No store mirror, no receipt retained outside the trunk's tails,
  no unbounded body** (L-B10, L-S4).
- **No Canvas2D, no `Mount` paint path, no `hit`/`toCanvasPoint`**
  (CV-3′ ruled by the spike; TP-22 — the browser owns hit-testing).
- **No hue outside the §0 tokens; no gradient, shadow, radius, motion
  between cuts, tooltip-borne information, legend, or webfont**
  (aesthetics §3's restraint list — each row carries its reason
  there).
- **No silent reset** (decision 42 OPEN-1; L-B4). Reset is a control
  with a name.
- **No ambient reads under src/trunk** (L-B11): the world arrives as
  Messages via entry.ts; `fetch` lives in `makeHttpSeam` alone.
- **No new query keys, headers, or routes toward the daemon**; the
  co-tenant surface is S1's, whole.
- **No provenance-backed claim** while the effect pin is PENDING
  (§4 OPEN-1).

## Breaks

*(empty — no falsifier has fired against an implementation yet; the
battery is red by construction because the app does not exist, which
is not a break.)*

## Probe record (BREAKER.md steps 6a/6b)

```
DEGENERATE PROBE   Run 2026-08-31 against a scratch implementation of
                   the WHOLE §0 surface with constant/identity bodies
                   (update = identity, seam answering constants,
                   columnRects = [], view = an empty svg+camera) —
                   written at the real paths, typechecked and linted
                   the battery clean, then DELETED (git shows the
                   breaker committing no src/trunk/app.ts or view.ts).
                   60 of the 62 cases FIRE against it. Two survive,
                   both structurally rather than vacuously: L-B1's
                   init case (init IS a constant; the case pins which
                   constant) and L-B11's ambient scan (a restriction
                   law; a clean module passes it by design — S3a's
                   L-P8 has the same shape). Two cases the first run
                   caught passing vacuously were SHARPENED with
                   non-triviality guards (L-Y4 focus-survives-growth
                   now asserts the fold landed; L-B4's frame sweep now
                   asserts the refusing and epoch messages were
                   actually processed) — after which both fire.

DEGENERATE        The probe run itself surfaced two contract-surface
FINDINGS          corrections, made by the breaker before handover:
                   (1) foldkit's own lint law reserves Got*-prefixed
                   Message names for Submodel wrappers
                   (foldkit/got-prefix-requires-submodel-payload, at
                   error in this package) — the §0 messages are
                   therefore SucceededPullHistory / RefusedPullHistory
                   / SucceededLoadBody / RefusedLoadBody, on the
                   skeleton's own Succeeded*/Refused* precedent.
                   (2) oxlint max-lines: 300 split the chrome battery
                   into view-chrome + view-inspector (a file split,
                   not a seam — S3a's precedent).

SATISFIABILITY     Checked per the new step-6 duty:
                   - magnitudes vs the invariant classes: every case's
                     depths sit inside CI-2's carrier equation (the
                     memo/cut cases grow 20/61/100 receipts against
                     CUT_SLACK·WINDOW = 60 and K_CARRIER = 512; the
                     beyond-carrier strip case uses 700 > 512
                     deliberately and expects NO range); L-B10's bound
                     is the engine's L-F6 number plus stated slack.
                   - source scans vs THIS packet's own frozen surface:
                     the scratch conforming surface PASSES L-B11's
                     scan and the styles scan parses the existing
                     styles.css block structure — no A-1-shaped
                     self-contradiction (the scan was run, not
                     reasoned about).
                   - sibling boundaries: L-V10's range-when-held
                     condition is CI-2's equation read back (count =
                     tail.length); L-V1's golden viewport keeps strips
                     AND squares inside L-P7's cull band (checked
                     numerically: the chunk strip band [-822, 0] lies
                     inside [-960, 300]); L-B5's trigger fires on the
                     fixture (chunk 85 > 60) so the golden state IS
                     the state update produces — L-V1 and L-B5 assert
                     the same doi from two sides.
```
