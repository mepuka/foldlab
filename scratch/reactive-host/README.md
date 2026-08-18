# reactive-host — the read-plane vertical slice (DEV-791)

**Exemplar only.** Wired into nothing, imported by nothing under `packages/`,
gated by nothing. Its dependencies are installed here, not at the root, so the
root lockfile and every gated path are untouched — `run.sh` arm 7 asserts that
mechanically rather than claiming it. Deleting this directory changes no gate
result.

**This is a pre-adoption evaluation, not an adoption.** foldkit (beta) and the
reactivity plane enter as scratch dependencies so the machinery can be
measured. The verdict below could have been negative; §Findings records what it
actually was. No public plait surface changed, and the consumer seam stays
DEV-765's.

## What is under test

The composition `(lane, declared fold, anchor) → Model → view`, and the claim
that foldkit's `update : (Model, Message) → (Model, Commands)` is a
catamorphism over the message stream:

| foldkit | this slice |
| --- | --- |
| `Model` | anchored fold state — `{ floor, state, buffer, head }`, no clock |
| `Message` | a positioned lane envelope arriving by subscription |
| `update` | `Fold.declare`'s own pure `step`, under the successor discipline |
| `Commands` | candidate acts as values (`RequestBackfill`), never a call |
| `View` | a pure finishing projection to a VNode value |

The rendered output is **deliberately unstyled** — raw values, minimal markup,
no class, no colour, no unit, asserted mechanically in `render-check.ts`. The
visual language is the design lane's; this slice proves the spine any visual
lane will ride and makes no design decision.

| File | What it demonstrates | Run |
| --- | --- | --- |
| `slice.ts` | One real lane end to end: `Lane.declare` → `Algebra.declare` → `Fold.declare` → `Anchor`, `Model`/`Message`/`update`/`view`, and the read plane hosted on `Atom.runtime` + `Atom.family` over the plait services layer. Public plait surfaces only. | via `run.sh` |
| `walls.ts` | The three walls plus the digest-keyed resolve leg. The oracle is plait's own `Anchor.initial`/`Anchor.advance` chain, which the MVU code never calls — both-sides-agree would prove only consensus. | `bun walls.ts` |
| `render-check.ts` | Headless render, two arms: the view projects to a VNode **value** with no DOM, and foldkit's own `Scene` render path accepts the same view. | `bun render-check.ts` |
| `run.sh` | Seven arms — pinned `tsgo`, `tsc` as referee, the walls, the render check, **two mutation arms**, and the untouched assertion. | `bash scratch/reactive-host/run.sh` |

Arms 5 and 6 are the teeth. Arm 5 replaces the successor discipline with
arrival-order replay — the same negative control `verify/fabric` uses — and
requires wall 2 to go red. Arm 6 puts a wall clock in the Model and requires
wall 3 to go red. Without them a green run could mean the walls assert nothing.

## The three walls

1. **Replay** — the live fold's state and a replay from the same anchor agree
   by state digest; `f3_resume_exact` observed at the host, as
   `fold (xs ++ ys) = foldFrom (fold xs) ys` over the tape.
2. **Chatter** — the subscription is killed mid-stream and recovery is by read,
   with the remainder deliberately reversed and duplicated. The recovered
   Model's state digest equals the uninterrupted run's: the watch plane decided
   nothing.
3. **No clock** — the Model and the view are invariant under two different
   stubbed wall clocks (both `Date.now` and the `Date` constructor), no
   clock-shaped datum survives a structural scan of either, and staleness is
   still expressible — as `head − anchor`, in positions.

## Output

```
== arm 1: tsgo Version 7.0.0-dev.20260707.2 ==
PASS  the slice type-checks against the pinned effect@4.0.0-rc.108

== arm 2: tsc Version 5.9.3 ==
PASS  referee agrees

== arm 3: the three walls ==
lane   b86b5853a8c5cd231fda85c9f9a5ba2c3331fe861f2c0f7942a3e2821b22ed90
fold   68eb49d4239318688d21c597210f6fe59f9621219330124bb98ed7a08c3909e9

PASS  wall 1 (replay) — live == anchor == resume-from-2 at 0700aeea38850c7b… (AsyncResult entered Success)
PASS  wall 2 (chatter) — torn after 3, recovered by read, 5 redeliveries absorbed, same digest
PASS  wall 3 (no clock) — Model and view invariant under two wall clocks; staleness reads "behind 4" in positions
PASS  resolve leg — Atom.family memoized by digest; absence is AsyncResult.Failure, not a throw

ALL WALLS PASS
PASS  replay, chatter, and no-clock walls hold

== arm 4: headless render check ==
PASS  render check — 139 bytes of unstyled markup, values only
      <div><p>floor 3</p><p>head 5</p><p>behind 2</p><p>chatter live</p><p>absorbed 0</p><ul><li>alpha</li><li>beta</li><li>gamma</li></ul></div>
PASS  the view projects to an unstyled value and foldkit renders it

== arm 5: mutation — successor discipline replaced by arrival-order replay ==
PASS  mutation caught — arrival-order replay leaves the anchor digest:
  FAIL  wall 2 (chatter): recovered a0a01907debcc917… != uninterrupted 0700aeea38850c7b…

== arm 6: mutation — a wall clock put in the Model ==
PASS  mutation caught — the no-clock wall goes red:
  FAIL  wall 3 (no clock): Model carries a clock datum: model.observedAt = 1787083236681

== arm 7: bun run gates is untouched ==
PASS  no gated path moved, and no *.test.ts here can join the battery

ALL ARMS PASS
```

`bun run gates` → `FOLDLAB GATES: PASS`, run with this directory present.

## Findings

### F-1 — "effect-atom" is the wrong package name at this pin. Ship no dependency.

The published `@effect-atom/atom@0.7.0` peer-depends on `effect ^3.22.1`:
adopting it would fork the pin onto Effect **v3**. The v4 line lives **inside
the pinned `effect@4.0.0-rc.108` itself**, exported as
`effect/unstable/reactivity` — `Atom`, `AtomRegistry`, `AsyncResult`,
`AtomRef`, `AtomRpc`, `Reactivity`. The vendored source is at
`repos/effect/packages/effect/src/unstable/reactivity/`; only the framework
bindings (`@effect/atom-react`, `-solid`, `-vue`, all `4.0.0-rc.108`) are
separate packages, and the slice needs none of them.

Everything the read plane wanted composed on the first try and headlessly:
`Atom.runtime(layer)` over the plait services layer, `Atom.family` memoized by
digest, `AtomRegistry.layer` with no DOM and no framework binding, and
`Atom.get`/`Atom.getResult` as ordinary Effects.

Two caveats for DEV-765. `unstable/` is a namespace, not a branch, and it
promotes by moving — the standing posture for `unstable/*` is to absorb churn
in one adapter file, so the consumer seam should wrap it rather than spread
`Atom` through the surface. And the tri-state is **`AsyncResult`**
(Initial/Success/Failure), not `Result` — at this pin `effect/Result` is the
Either successor and has no Initial. Naming it "Result" in a design doc will
mis-cite the pin.

### F-2 — the catamorphism holds, but only over the *state*; the anchor half is effectful

`DeclaredFold.step : (State, Event) => State` is pure and public, so the MVU
`update` really is `List.foldl step` over the message stream. But the two
doors that make the fold *anchored* — `Anchor.advance` and `Digest.digestOf` —
return `Effect<_, Refusal>`, and foldkit's `update` must be pure and total.

So the slice restates the successor rule (`position === floor + 1`, buffer
otherwise) in pure code inside `update`, and uses `Anchor.advance` only in the
oracle. That is the seam DEV-765 has to decide: either publish a pure,
refusal-free successor combinator, or accept that every MVU consumer
re-implements the discipline and only checks it after the fact. **This is the
one place a consumer can silently diverge from the fabric,** which is why
`run.sh` arm 5 mutates exactly there.

### F-3 — a subscription does not deliver positions

`FabricClientService.subscribe` yields `Stream<ReceivedEnvelope, Refusal>`, and
`ReceivedEnvelope` is `{ subject, envelope, digest }` — **no position**.
Position exists only on the write side (`EmittedEvent.position`,
`PublishedEnvelope.sequence`), and everything that consumes positions
(`PositionedEvent`, `SuccessorMachine`, `replaySuccessors`, `ingestSuccessor`)
lives in `src/internal/successors.ts` and is unreachable through the package's
`exports` map. A consumer running the successor discipline from a subscription
must therefore carry a digest → position side table of its own, which is
exactly what `walls.ts` does and what the exemplar reports rather than works
around. Ruled positions are the partition stream's own sequence
(DEV712-POS-1), so the datum exists on the wire; it is dropped at the public
read seam.

### F-4 — foldkit has no public headless render path for a Message-typed view

`inertHtml` is the only `HtmlBuilder` foldkit exports, and it is
`HtmlBuilder<never>`. The sanctioned retyping helper `__htmlBuilder` is marked
`@internal` **and** unreachable — the `exports` map has no deep entry, so
`foldkit/dist/html/index.js` does not resolve at all. Rendering a Message-typed
view outside the runtime needs a cast. This slice's view dispatches nothing, so
the cast is sound here; a view with handlers has no public headless render path
short of `Scene` (which pulls in a DOM emulator).

### F-5 — a foldkit Command is inspectable, but the pair is not sealed

`Command<T, E, R>` is `{ name, args?, key?, effect }` — better than a bare
thunk: a candidate act arrives with a declarative head a policy could refuse on.
But the runtime runs `effect`, not `name`/`args`, and nothing binds the two, so
a refusal computed from the head is not binding on what executes. For plait,
where a candidate act must be refusable *before* it runs, that gap is the whole
question. This slice keeps its candidate acts as inert records and drops them
at the `Scene` adapter rather than minting Commands whose Effect nothing has
declared.

### F-6 — smaller frictions, recorded not fixed

- `FoldDeclaration` **is** canonical data but its interface carries no index
  signature, so it is not assignable to `WireValue`; publishing or digesting a
  declaration means restating it field by field (`walls.ts`, `resolveLeg`).
- `Scene` keeps the rendered VNode on the simulation and materializes DOM only
  when an interaction demands it. "Headless render" therefore means a *value*,
  not a document — which suits the algebra, but the rendered element is not in
  the public `SceneSimulation` shape (`{ model, commands, outMessage }`), so
  reading the produced markup needs a cast.
- `Lanes.testLayer` / `Folds.testLayer` ship, but no in-memory `LaneService` or
  `FoldService` does; a NATS-free exemplar writes its own fixture. Only
  `Catalog.substrateLayer` is a shipped composite.
- `Atom.get` on a synchronously-resolving Effect never presents `Initial`; the
  tri-state's absence arm needs an actually-suspended read to observe.

### Verdict

**foldkit (beta): the algebra survives contact.** `update`'s shape is the
catamorphism, `Commands` are values, `Step`/`combine`/`foldChild` compose the
fold the way the design says, and `Story`/`Scene` run headless with no vitest.
`foldkit@0.145.0` is the last release pinned to `effect@4.0.0-rc.108` (0.146.0+
moved to rc.109) — a beta that pins Effect **exactly** will fight this
repository's pin at every bump, and that, not the design, is the adoption risk.
The frictions are all at the edges (F-4, F-5), not in the core correspondence.

**The reactivity plane: adopt nothing, it is already here.** F-1 is the whole
finding. The read plane cost zero dependencies and needed no DOM.

**What DEV-765 should take from this:** F-2 and F-3 are the two seams that
decide whether a consumer can be correct by construction. Everything else is
either already solved (F-1) or cosmetic.

### Noticed, deliberately untouched

`packages/plait/test/ChaosCli.test.ts` — "a planted between-arm state mutation
reddens the harness verdict and CLI" is **flaky**. It failed twice under
`bun run gates` (expected exit 1, got exit 2 with
`invalid-chaos-request … "got":"fully anchored before interruption"`), then
passed on three consecutive `test:walls` runs and on a full `bun run gates`,
all with this directory present. The race is the hard kill landing after the
span is fully anchored. Not this issue's scope; reported, not repaired.
