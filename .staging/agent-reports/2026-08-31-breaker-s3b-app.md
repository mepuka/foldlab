# S3b — the trunk APP, breaker report

- Role: BREAKER, Lane C app half (S3b), package `experiments/workbench`.
  Fable, by explicit operator order. **This session does not implement
  the contracted surface** (castle-vs-attack; `implement` SKILL.md).
- Packet: `.staging/frontend-trunk/packets/S3B-TRUNK-APP.md`.
- Date: 2026-08-31.

STATUS: DONE — packet, battery, probes, dev viewer, browser proof all landed; handover to the coordinator.

## Read-in (whole, per dispatch)

- TRUNK-PLAN.md v3 (§3 Lane C S3b scope, §1 rulings, §4 constraints,
  §6 corrections ledger incl. the satisfiability-probe duty).
- S3A-TRUNK-ENGINE.md whole, including §10 amendments (Doi field is
  `span`; A-1..A-3 unsatisfiable-case record).
- CANVAS.md v2 + §6b + §8 (CV-3′: SVG in foldkit's vdom; camera-once;
  createLazy per column; two-threshold virtualization).
- The LANDED engine at 24dead16: `src/trunk/{model,fold,placement,place}.ts`,
  battery green 87/87 per the implementer report, `fixtures/harness.ts`.
- `.staging/agent-reports/2026-08-31-implementer-s3a-engine.md` — spike
  PASS binds S3b: SVG vdom, camera `<g transform>` once, createLazy per
  column keyed on the immutable snapshot; no Canvas2D fallback at v1.
- S1-HISTORY-ROUTE.md — the seam S3b consumes: `{since, limit}`
  fail-closed door, refusal grammar, `--allow-origin`, L-A14 no-ETag.
  Verified in-tree: `historyPath = "/history"` exists at
  `library/effects/bin/mcp/http.ts:232` (S1 implementation is in the
  working tree).
- Workbench skeleton: `src/main.ts`, `src/entry.ts`, `src/store/seam.ts`,
  `src/scene.test.ts`, `src/story.test.ts`, `styles.css`, configs.
- Aesthetics report (token values: `--mark-strip #6c6c6f/#87878a`,
  `--mark-strip-deep #a9a9ab/#4e4e51`, `--owed #bc442c/#ec775f`, the
  five-step micro-tint ladder §2.2, geometry §1.5, WCAG 2.5.8
  Equivalent-control budget §1.9).
- decision 42 (docs/SPECS.md:614-630): QA-4, OPEN-1 refuse-and-surface,
  OPEN-2 document-boundary addresses.
- SPEC.md N1/N5/N9, §3.2 (EMPTY vs spinner; the CLI's two wordings —
  verified verbatim at `bin/cli/history.ts:164-165`).

Foldkit facts established by reading `node_modules/foldkit` (0.154.0):

- foldkit's dist carries `__setRuntime`/`__htmlBuilder` for
  out-of-render VNode building — but they are NOT on the public export
  map (see the harness probe below); the memo law's real path is
  `foldkit/scene`.
- `createLazy` cache key = (fn, dispatch, args by `===`)
  (`dist/html/lazy.js`); `scene` steps are plain
  `simulation => simulation` functions, and the simulation exposes
  `html: VNode` — battery tests can walk raw VNodes.
- `Command.define` supports `args` (callable as `Definition(args)`).
- `TagName` includes the SVG element set (`svg`, `g`, `rect`, `text`);
  `h.svg`/`h.rect` exist on the builder.

Mise facts: `check:workbench` = frozen install, lint, typecheck, test,
build (leaf gate). Mirror regeneration tasks are `gen:backend-word` and
`gen:grammar-manifest` (mise.toml:273,332; the workbench mirrors are
second outputs of those emitters — mise.toml:792-799 comment).

## Harness feasibility probes (before freezing the battery — the satisfiability duty applied to the harness devices)

Probed with a scratch scene test inside the workbench (written, run,
DELETED — no scratch left in the tree):

1. `__setRuntime`/`__htmlBuilder` are NOT on foldkit's public export
   map (`foldkit/html` resolves to `dist/html/public.js`, which
   re-exports only the builder types, `createLazy`, `inertHtml`). A
   harness path through them would not compile. The sanctioned render
   path for VNode laws is therefore `foldkit/scene`'s `scene(...)`,
   whose steps are plain `simulation => simulation` functions and
   which exports `tap` for side-effect assertions on `sim.html`.
2. `scene` creates ONE capturing dispatch per run
   (`dist/test/scene.js:1371`) and re-renders after every step with
   it; `__htmlBuilder()` returns a cached SINGLETON builder
   (`dist/html/index.js:2077-2079`). Consequence, measured: a
   `createLazy` slot with a STABLE fn and `===`-stable args
   memo-hits across `given`/`tap` steps — grabbed the column group
   VNode across three renders: equal args (camera-only change
   included) → same reference; changed arg → new reference. The memo
   law (L-V4) is VNode-executable through scene. A fresh arrow passed
   to the lazy slot defeats it (fn identity is part of the key) —
   this is also exactly ADEQUACY-1's failure shape, so the probe
   doubles as its witness.
3. VNode shape pinned: `sel` ("svg"/"g"/"rect"), `data.attrs`
   (string-valued; `data-testid` lands here), `data.class` (record of
   booleans), `data.on.click` (function), `data.ns` set to the SVG
   namespace on the whole svg subtree — foldkit propagates it, which
   is what the S3a spike proved in a live browser.

## Decisions taken while breaking (each recorded in the packet)

- Message names: foldkit's `got-prefix-requires-submodel-payload` lint
  law (at error in this package) reserves `Got*` for Submodel
  wrappers, discovered when the degenerate scratch hit the lint gate.
  The frozen messages are `SucceededPullHistory`/`RefusedPullHistory`/
  `SucceededLoadBody`/`RefusedLoadBody` (the skeleton's own
  Succeeded*/Refused* precedent). Packet §0/§2/§3 updated before
  handover — no law changed, only names.
- The chrome battery split at oxlint `max-lines: 300` into
  `view-chrome.test.ts` (L-V6..L-V8) + `view-inspector.test.ts`
  (L-V9/L-V10) — a file split, not a seam (S3a's own precedent).
- The memo law's harness path is `foldkit/scene` + `tap` + mid-chain
  `given` (one capturing dispatch per scene run), NOT `__setRuntime`
  (not on the public export map). Proven in
  `fixtures/app-harness.test.ts`.
- The cut trigger, the poll numbers, the strip announce range and the
  face's store identity are breaker pins, each flagged as packet §4
  OPEN-2..OPEN-5 for the operator; effect provenance stays the
  standing OPEN-1 (nothing in S3b claims provenance-backed).

## Probe results (BREAKER.md step 6, recorded in packet §Probe record)

DEGENERATE: scratch implementation of the whole frozen surface with
constant/identity bodies, written at the real paths, typechecked and
linted the battery clean, run, then DELETED. First run: 58/62 fired;
two cases caught passing vacuously (L-Y4 focus-survives-growth against
an identity update; L-B4's frame sweep) were sharpened with
non-triviality guards. Final: **60/62 fire**; the two survivors are
structurally non-vacuous (L-B1's init pins a constant; L-B11 is a
restriction scan — S3a L-P8's shape).

SATISFIABILITY: magnitudes checked against CI-2/K_CARRIER/CUT_SLACK
(the beyond-carrier strip case uses 700 > 512 deliberately and expects
NO mark range); the L-B11 source scan was RUN against the conforming
scratch surface (passes — no A-1-shaped self-contradiction); sibling
boundaries checked numerically (golden viewport [-960, 300] contains
the chunk strip band [-822, 0]; L-B5's trigger fires on the fixture so
L-V1's pinned doi IS the doi update produces). Details in packet
§Probe record.

## Handover state (verified by running, 2026-08-31)

- `bun --bun vitest run` (final, dev viewer included): **Test Files
  8 failed | 11 passed (19); Tests 94 passed** — the 8 red are the
  battery, at COLLECTION on the missing `./app.ts`/`./view.ts` only.
  Every pre-existing, harness-validation and dev-gate test green.
- `bun run lint`: green over the whole tree (battery included).
- `bun run typecheck`: errors confined to the eight battery files
  (missing modules and their `any` cascades); every pre-existing file
  typechecks.
- `bun run build`: green.
- `mise run check:workbench` is therefore red ONLY in the mandated
  red-at-collection way; green on everything that existed before this
  lane.

## Dev fixture viewer (second deliverable — built, browser-proved)

Files (breaker-built, dev-only, cleanly outside the contracted app):

- `experiments/workbench/dev/index.html` — the dev page, own DEV-ONLY
  style block (ink-on-paper + the aesthetics token values, commented
  as such), served by `bun run dev` at `/dev/index.html`; excluded
  from the production build (vite's only build input is the root
  `index.html`).
- `experiments/workbench/src/dev/fixture-view.ts` — the pure scene:
  fixture bytes (`?raw`) → `decodeHistory` (S0's generated mirror, the
  ONE decode path — no second parse) → `foldDocument` → `cutDoi` →
  `placementOf` → `place` → rects + canonical bytes + labels + face.
- `experiments/workbench/src/dev/entry.ts` — plain-DOM SVG renderer
  (deliberately NOT foldkit, so it cannot be mistaken for the
  contracted view); re-renders on devicePixelRatio change.
- `experiments/workbench/src/dev/fixture-view.test.ts` — **the
  dev-fixture freshness gate**, green, runs in `check:workbench`.
- README section "Dev fixture viewer": the run command, the
  not-the-app status, the no-store-minted-this-fixture honesty note,
  and the three freshness rules (conformance gate; freshness gate;
  mirrors regenerate via `mise run gen:backend-word` /
  `gen:grammar-manifest`, never hand-edited).

PAGE-MEASURED EVIDENCE (cdp skill, `browser-harness-js`, headless
Chrome over CDP against `bun run dev`; server and browser torn down
after):

- dpr 1 (default, dark scheme): rectCount **159** (= the engine's op
  count at cutDoi(WINDOW); the S3a smoke's own number), allSvgRect
  **true**, anyUnknown **false**, svg namespace
  `http://www.w3.org/2000/svg`, camera `scale(1)`, stripCount **2**,
  owedRectCount **3**, computed fills: owed `rgb(236,119,95)`
  (= dark `#ec775f`), strip `rgb(135,135,138)` (= `#87878a`), tint-2
  `rgb(236,236,240)` (= `#ececf0`); face "220 admissions · mark 220 ·
  159 rects · dpr 1 · … · 3 unregistered"; 16 labels; svg height 1335
  (85·15 + 60).
- dpr 2 (Emulation.setDeviceMetricsOverride) + emulated LIGHT:
  devicePixelRatio **2**, rectCount **159**, camera `scale(0.5)`,
  first rect quad `[0, 2646, 24, 24]` — hand-checked against the
  engine: square (0,0), y = (−12 + 1335)·2 = 2646, 24 = 12·2; ALL 159
  quads integer device pixels (`allIntegers true`, measured not
  sampled); light owed `rgb(188,68,44)` (= `#bc442c`) — theme-aware
  both ways.
- label origins measured off the page: 0, 27, 54, 81, 123 px =
  `columnOriginCss` exactly (the class gutter before `step`:
  81 + 12 + 30 = 123).
- screenshots beside this report ON DISK (staging ignore keeps non-md
  untracked, Mac-local): `2026-08-31-s3b-dev-viewer-dpr2.png` (the
  skylines + strips + owed marks at dpr 2),
  `2026-08-31-s3b-dev-viewer-baseline.png` (the baseline: sixteen
  lanes, ruled gutter ladder, rotated labels, unregistered set apart
  in vermilion).

## Deliverables (no commits — the coordinator commits; TRUNK-PLAN §4)

- Packet: `.staging/frontend-trunk/packets/S3B-TRUNK-APP.md` — frozen
  surface §0; laws L-B1..L-B11, L-S1..L-S5, L-V1..L-V10, L-Y1..L-Y4,
  each with its exhibit-form falsifier and licence; §4 OPEN-1..5
  escalated, not settled; §5 pinned golden state; §6 the dev viewer's
  rules; §7 the BROWSER BATTERY (BB-1..BB-8, scripted CDP snippets,
  exhibit-form pass criteria, evidence discipline); §8 seven
  adversarial implementations; §9 starting state; §10 the edge;
  §Probe record.
- Battery: 62 red-at-collection cases in eight files under
  `experiments/workbench/src/trunk/` (counts: app 9 · app-poll 11 ·
  app-seam 10 · view-svg 9 · view-chrome 8 · view-inspector 3 ·
  view-a11y 7 [the NAMED `trunk-a11y` gate] · view-memo 5), plus the
  breaker harness `fixtures/app-harness.ts` and its 5 green
  validation cases in `fixtures/app-harness.test.ts`.
- Dev viewer: `dev/index.html`, `src/dev/*` (3 files), README section.
