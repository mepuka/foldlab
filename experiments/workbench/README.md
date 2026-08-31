# Workbench

The front end for the store language: a [foldkit](https://foldkit.dev)
application — the Elm architecture over Effect — that will eventually be the
surface a person touches the language through.

This directory currently holds the **skeleton and nothing else**. It builds, it
typechecks, it tests, it runs in a browser, and it renders one page that reports
the true state of the package. It contains no product.

## Grade

**Experimental** (`experiments/`, artifact grade, no gate stamps).

The three alternatives, and why each was rejected:

- **`.staging/`** is pre-grade and gitignored except its README. Two other lanes
  are expected to build on this scaffold, and the estate's primary development
  host is a different machine. A scaffold that is not committed cannot be built
  on, and its lockfile — which the estate requires — could not exist. Rejected.
- **`library/`** holds *distributable* libraries: an `exports` map, a `prepack`,
  a consumer smoke test, a semver surface. The workbench is an application. It
  has no consumers and nothing to publish, and putting it here would make the
  distributable discipline that guards `library/` vacuous for one of its
  members. Rejected. If the workbench later factors out something genuinely
  reusable — a rendering of the language that other surfaces want — *that*
  belongs in `library/`, extracted, not the app around it.
- **`formal/`** holds claim-gated verification artifacts. Nothing here is a
  claim. Rejected.

`experiments/` is also where the precedent points: the merkle reconciliation
design (`library/effects/research/merkle-set-reconciliation-design.md` §6)
already directs a foldkit front end and says the demo "lives with the demo under
`experiments/` until the S2 grill promotes it."

**What artifact grade obliges here.** "Fully regenerable from declared sources;
no hand-maintained derived files" binds *derived* files, not source — the other
`experiments/` trees are full of hand-written Lean. The obligation the workbench
inherits is sharper and worth stating plainly: **any surface the store language
already describes must be generated, never typed by hand.** The MCP tool
manifest, the canonical schemas, the wire profile and the code-point table are
all emitted from Lean today. When the workbench needs their TypeScript, it comes
from a `mise run gen:` task under this directory. There is no such task yet
because nothing here is derived from anything yet.

**Promotion path.** Nothing in this directory promotes into `formal/` — an app
is not a theorem. Promotion means the opposite direction: pieces leave. A
generated client leaves for a `gen:` task the moment the contract exists; a
reusable rendering of the language leaves for `library/` when a second consumer
appears. The directory itself stays experimental until the operator rules
otherwise.

## What is here

```
index.html            HTML entry point
vite.config.ts        dev/build host, with @foldkit/vite-plugin
vitest.config.ts      Story and Scene run on VNodes; no DOM, no jsdom
oxlint.config.ts      estate categories at error, plus the foldkit rules
tsconfig.json
src/
  entry.ts            the runtime boundary: the only module that starts anything
  main.ts             Model, Message, update, init, view — pure, importable by tests
  store/seam.ts       the hole where the store language will be met
  styles.css          tone only; no palette, no framework
  story.test.ts       drives update directly
  scene.test.ts       drives the rendered view through accessible locators
```

`entry.ts` / `main.ts` is foldkit's own split: runtime side effects stay in
`entry.ts` so tests import the application without starting it. The file layout
follows <https://foldkit.dev/patterns/project-organization> — one module until a
feature is easier to understand as its own state machine, with `story.test.ts`
and `scene.test.ts` beside the code they exercise.

### The one page

It renders the state of the store seam. There is no store behind the seam in
this build, so every probe refuses, and the page says so. That is deliberate: a
skeleton that displayed a fabricated value would be lying about a system whose
entire subject is provenance.

### The seam

`src/store/seam.ts` is an Effect service with one operation and one failure,
bound in `entry.ts` through foldkit's `resources`. It is **not** the API
contract — Lane C owns that and is expected to replace the module wholesale.
What is load-bearing is only the shape of the boundary:

- the store is reached through a service, so the runtime binds one
  implementation once and every Command that needs the store declares that need
  in its type;
- the only operation is a liveness probe returning an opaque string, naming no
  domain vocabulary — no address, no node, no schema, no program;
- the only failure is refusal, carrying a reason and nothing else, keeping the
  shape the language's own `fail` has.

## Running it

```
bun install --frozen-lockfile
bun run dev          # vite dev server
bun run test         # Story + Scene
bun run typecheck
bun run lint
bun run build
```

Or through the estate's runner, which does all of it:

```
mise run check:workbench
```

`mise run check` includes it.

## Dev fixture viewer

```
bun run dev          # then open http://localhost:5173/dev/index.html
```

Renders the recorded 220-receipt fixture
(`src/trunk/fixtures/word-history.fixture.json`) through the REAL
trunk engine — `decodeHistory` → `foldDocument` → `cutDoi` →
`placementOf` → `place` — with no daemon and no store. It is **dev
tooling, not the app**: plain DOM over the engine's output
(`src/dev/`, breaker-built harness territory, S3b packet §6), and the
page's banner says so. The fixture's addresses are syntactically valid
and store-minted by nobody; never cite this view as store-backed.

Freshness rules, enforced mechanically:

- the fixture must decode through the generated `wordHistorySchema` —
  `src/trunk/fixtures/conformance.test.ts` (S3a's gate);
- the dev scene must fold to the known totals, disjoint, all five
  tint steps — `src/dev/fixture-view.test.ts` (**the dev-fixture
  freshness gate**); both run in `check:workbench`;
- the generated mirrors under `src/generated/` are OUTPUTS of
  `mise run gen:backend-word` and `mise run gen:grammar-manifest` —
  regenerate there, never edit by hand; any drift reds the two gates
  above. The dev view decodes through the engine's one door, so there
  is no second parse to drift independently.

## Deliberately absent

Pending **Lane B** (the workbench itself):

- Screens, navigation, routing, and the workbench's own vocabulary.
- The design system. `styles.css` declares tone and nothing else. There is no
  accent colour, on purpose: hue is reserved for verdicts, and spending it in a
  skeleton stylesheet would quietly settle a decision that belongs to whoever
  designs the verdict surface. There is no CSS framework either — Tailwind is
  what foldkit's own scaffolder installs and is a reasonable default, but a
  utility vocabulary is a design-system decision.
- The terminal view, the chain-head display, and the substrate detail views.

Pending **Lane C** (the contract):

- Everything in `src/store/seam.ts`.
- The transport. `vite.config.ts` configures no proxy, and no module in `src/`
  names a URL, a socket, a database, or a credential. Nothing here reads
  `library/effects/PROFILE-CAS-HTTP-0.md` yet, and nothing decides between it
  and something else.
- The local sync database. The working assumption elsewhere in this session is
  Turso/libSQL; this package assumes nothing and depends on nothing.
- The dependency on `@foldlab/cas`. See the version note below — the workbench
  cannot import the TypeScript twin today without a decision nobody in this lane
  is entitled to make.

Absent for reasons of scope, not ownership:

- `@foldkit/ui`, `@foldkit/devtools`, `@foldkit/markdown` — all real and all
  probably wanted; none needed to prove the skeleton runs.
- `oxlint-plugin-effect`. `library/effects` runs it with a long ledger of
  per-rule exemptions worked out against a mature tree; importing that preset
  into an empty package would produce a ledger of exemptions for code nobody has
  written. The first module that is Effect-heavy rather than foldkit-heavy is
  when to add it.

## Pins, and one that is not resolved

Versions are exact and `bun.lock` is committed, per the estate's rule.

**foldkit's documentation is external and unpinned (C6 pending).** Nothing in
this README or in the source comments cites a resolved provenance record for
<https://foldkit.dev>; the API was read from `llms-full.txt` on 2026-08-29 and
verified by compiling and running against `foldkit@0.154.0`, which is the
evidence that matters here.

**The effect version does not agree with the rest of the estate (C6 pending).**

| Package | `effect` | Provenance |
|---|---|---|
| `library/effects` (`@foldlab/cas`) | `4.0.0-rc.111` | resolved: commit `0dd7825e4da4d3a00fa9bd410a1d55f3d4874d07` |
| `experiments/workbench` | `4.0.0-rc.112` | **unresolved** |

`foldkit@0.154.0` declares `effect@4.0.0-rc.112` as an exact peer dependency.
The estate's lock records `rc.111`. This package follows the framework's
declared peer, and therefore names an unresolved pin — marked `PENDING` in
`package.json` under `foldlab.effectProvenance`. Nothing here may be cited as
provenance-backed until that is settled.

It is settled by one of three acts, none of them this lane's:

1. Record `rc.112` in `.reference/provenance/sources.lock.json` and move
   `library/effects` onto it, restoring one effect version across the repo.
2. Keep `rc.111` everywhere and accept the violated peer. **Observed, narrowly:**
   this skeleton's whole surface — Model, Message, update, view, Command, Story,
   Scene, the production build — typechecks, tests and builds against
   `effect@4.0.0-rc.111` with `foldkit@0.154.0`. That covers what is written
   here, not the framework's routing, subscriptions, `AsyncData` or UI packages,
   and a foldkit release could break it at any time.
3. Keep the split and never let the two trees meet.

Option 3 is not viable the moment the workbench imports `@foldlab/cas`: two
`effect` copies in one bundle are two module instances, and `Context.Service`
tags and `Schema` classes have identity per instance. That failure is quiet and
unpleasant to diagnose, which is why it is written down here before anyone hits
it.
