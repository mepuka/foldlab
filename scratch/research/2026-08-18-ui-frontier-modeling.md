# The UI as coalgebra: frontier views, anchor lag, and the screen inventory

Status: EXPLORATORY consultation note, coordinator-written 2026-08-18
at the operator's direction, modeling the read surface under the
ruled visualization principle. Companions: the CAS-motion note
(scratchpad/cas-motion-and-ingress.md, §2 the frontier table), the
architecture note (scratchpad/algebra-engine-architecture.md, §5
duplex, §4.6 sessions, §10 the cost ladder), and the kernel algebra
(docs/design/2026-08-18-plait-kernel-algebra.md §4.2, the eight
generators). Nothing here is adopted; §6 is a decision sheet.
Standing fences ride the document: safety only — no liveness or
convergence promises, and "productive through anchor p" is the
strongest aliveness sentence any screen may print; attribution fence
— every "who" on screen is a credentialed connection under a writ,
and displayed attribution is the envelope's claim under that
credential, never a proof of a person.

---

## 0. The stance, in one sentence

**A view is not a window onto state; a view is a declared fold read at
an anchor under a writ, and the screen is its rendering.** Everything
below is that sentence applied to laws, to the flagship screen, to
the inventory, and to flow control.

The truth plane does not move, so there is nothing on it to animate.
What a UI shows is the frontier: heads, anchors, cell joins, landed
outcomes, rebinds. Dots are resolved on demand and then held forever.

## 1. The view model, stated as law

Seven statements. The first is the law; the rest are its consequences
made checkable at the surface.

**UI-L1 — Every view is a declaration.** A screen denotes a value with
a digest: the folds it reads, the lanes and cells they range over,
the anchors it holds, and the writ it renders under. This is the UI
face of the pre-registered egress law (architecture §5, AE-4): *every
outbound byte is the image of an anchored read under a declared,
writ-scoped fold.* A pixel with data in it and no declaration behind
it is an unlogged egress. Consequences worth the constraint: screens
are citable and diffable by digest, "what was on your screen" is
answerable by replay rather than by memory, and two operators
comparing dashboards compare two digests, not two impressions.

**UI-L2 — Two datum sorts, unconfusable by type.** The kernel's
§4.1 split lands directly on the screen. Every datum is either

- a **resolved dot** — `resolve : Digest σ → Value σ`, anchor-free,
  verified on read, *immutable and cacheable forever* (no TTL, and
  therefore no refresh affordance may exist on it); or
- an **anchored fold state** — `fold : Algebra × Lane × Anchor →
  State × Anchor`, head-relative, true at its anchor, never wrong
  later.

The two age differently, so the rendering must distinguish them.
House rule: fold-class panels carry a lag chip; resolve-class panels
never do. A lag chip on an immutable value is a category error
visible to the naked eye, which is the point of making it structural.

**UI-L3 — Staleness is anchor lag.** The staleness of a panel is
`head − anchor`, in positions, per lane, per consumer. It is a
number, it is exact, and it needs no clock. Three renderings are
refused:

| Refused rendering | Why | Nearest refusal reason |
| --- | --- | --- |
| a spinner standing for staleness | a spinner is a claim about the future — a liveness promise | (fence, not a door refusal) |
| "last updated 12:04" | a wall-clock read in the read path | `clock-read` |
| a "live" badge | asserts absence of unseen positions | `absence-claim` |

The lawful rendering is `anchor p / head q · lag q−p`. A view that
cannot compute its lag is not behind; it is undeclared.

**UI-L4 — Rates carry their denominator's attribution.** "Advance
rate" needs a denominator, and the fabric has no clock (G32: claimed
time is observation data arriving by `emit`, never a coordinate). So
a rate is itself a declared fold over two lanes — positions of the
subject lane per tick fact of a named tick lane — and it renders with
its tick source attributed, or in the honest unit *positions per
tick*. A dashboard printing "1.2k/s" with no attributed tick source
is reading a clock behind the operator's back.

**UI-L5 — No polling; a watch is a consumer.** The UI is the
coalgebra half of the duplex (architecture §5): it subscribes,
receives pushed deltas at T2, and never asks again. `subscribe`
is derived precisely because consuming a lane *is* deploying a fold
(kernel §4.3). Recovery from disconnect is recover-by-read from the
last held anchor — `f3_resume_exact` is what makes that exact rather
than approximate — never a re-query and never a reload.

**UI-L6 — Reads are writ-scoped, and over-reach is taught, not
blank.** A panel the current writ does not reach renders the taught
refusal — reason, law, repair, applicability — not an empty state and
not a toast. `off-writ-referent` is advisory and its repair is a next
move the operator can take (spawn under a writ that pins the
referent, or request it). Refusals are content, not error handling.

**UI-L7 — Every control is one of the eight generators.** A button is
a candidate act; its disabled state is `admit` pre-run at T0 and its
tooltip is the taught repair. Nothing on the surface may be a verb
the alphabet refuses: there is no *refresh* (dots never change and
folds push), no *delete* (`past-mutation`), no *save* (revision is a
successor `declare`), no *sort by latest* on an unanchored read
(`ambient-query-input`). The absent buttons are the language showing
through the chrome.

**Monotone rendering, as the corollary.** What a view displayed at
anchor `p` stays true of anchor `p` forever; advancing the anchor
adds rows, raises cells (join is inflationary —
`cell_absorb_inflationary` says a local view is a lower bound), and
moves greatest bindings. It never corrects a lie. The single place a
displayed value can *flip* is a fenced register outcome, and that
flip is a landed `decide` with a token — which is why it should be
the most salient animation the product owns.

## 2. The flagship: the frontier dashboard

The dashboard is the frontier table of the CAS-motion note (§2)
rendered once, with cadence determining layout: fast things get
bars, rare things get highlights.

| Panel | Denotation | Plane / cadence | Hot or cold | Tier |
| --- | --- | --- | --- | --- |
| lane heads + advance rate | `fold` (head fold) per lane; rate = positions per attributed tick (UI-L4) | positioned / fast | hot — pushed deltas | T2 |
| per-consumer lag | `head − anchor` per (consumer, lane); consumer anchors are read-plane state (arch §4.6) | read / consumer-paced | hot | T2 |
| cell states | `join` carriers observed through their declared ACI fold | set / measurement-paced | hot, coalescible (§4) | T1–T2 |
| directory rebinds | greatest-binding fold per name (`greatestAt` / `provisionFold`) | directory / rare | hot and **salient** | T2 |
| fenced outcomes | landed `decide` per register, with token and expected position | fence / rare, priced | hot, salient | T4 to produce, T2 to observe |
| refusal rate at anchor | fold over refusal facts, keyed by reason, agent, writ | read / derived | hot | T1 on a maintained fold |
| new declarations | catalog-membership fold (schemas, programs, skills) | set + directory / minting-paced | warm | T2 |
| any dot body | `resolve(digest)` on click | truth / static | **cold — on demand** | T1 hot, T3 cold blob |

**The hot/cold line, stated once.** Hot is everything whose *shape* is
a frontier: bounded by (lanes × consumers × registers × watched
names), pushed, and small no matter how large the estate grows. Cold
is everything whose shape is the set: dot bodies, declaration values,
historic envelopes, replays. The dashboard subscribes to the first
and never to the second. This is why the screen's cost does not grow
with the corpus — the invariant worth defending in review.

**Refusal-rate-at-anchor is the fleet-alignment gauge.** The capstone
metric, and the one number an operator watches: refusals per admitted
act, folded at an anchor, split by reason class. Its reading is not
"errors":

- **Intrinsic refusals rising** (`clock-read`, `unfenced-decide`,
  `cross-sort-identifier`, `last-writer-wins`, `minted-identifier`)
  — competence drift. These refuse at every world
  (`intrinsic_fault_refused_everywhere`); no amount of waiting helps;
  the fleet is writing unlawful shapes and needs teaching.
- **Door-relative refusals rising** (`forward-reference`,
  `off-writ-referent`) — ignorance, not fault. Every one of these
  admits unchanged at some larger world
  (`relative_refusal_repairable_by_growth`); the repair is wait or
  ask. A spike here is a coordination signal, often a healthy one.

Rendering these two classes in one undifferentiated "error rate" is
the single most misleading thing this dashboard could do, so the
gauge splits them at the top level and only then by reason.

**Salience is inverse to cadence.** Lane heads move constantly and get
the quietest treatment (a bar). Rebinds and landed outcomes are rare
and get the loudest (a highlighted row that persists until
acknowledged, since acknowledgement is itself an `emit` and therefore
citable). The design rule: *the rarer the frontier, the louder the
pixel* — the opposite of the usual dashboard instinct, and it follows
from the cadence column rather than from taste.

## 3. Screen inventory

Six screens beyond the dashboard. Each states its denotation (the
generators that feed it), its update discipline, and its cost tier.

### 3.1 Lane / journal inspector — a positioned scroll

- **Denotation.** A windowed `fold` over one lane at an anchor,
  yielding envelope headers: kind, attribution, body digest, position.
  Bodies are *not* in the fold — they `resolve` on demand when a row
  opens. Kind filtering belongs to the declared fold, not to the
  client: a different filter is a different fold digest and a
  different anchor, which is what keeps a filtered view citable.
- **Update discipline.** Watch from the held anchor; envelopes append
  at the head end; nothing above the anchor ever rewrites (append-only
  is the whole reason the scroll can be stable under load). Recovery
  is recover-by-read from the last anchor.
- **Cost.** T2 to follow the head; T3 to replay from a cold anchor;
  T1 per resolved body once fetched, forever.
- **Note.** This is the screen where the kind system pays visibly:
  claim, tool record, instruction, refusal, and repair are different
  kinds on different lanes, so the scroll is typed rather than
  re-parsed. Flattening chatter to one "message" class would push
  that parsing into the renderer.

### 3.2 Dot inspector — one digest, its facets

- **Denotation.** `resolve(digest)` for the value pane (anchor-free,
  cached with no TTL), plus one anchored fold per **facet** — the
  fibers over that digest in adjacent planes: placement facts,
  provenance facts, metadata facts (architecture §6). Peeling a slice
  is resolving the same digest against another plane, never opening
  the bytes.
- **Update discipline.** The value pane never updates — it cannot.
  Each facet pane is its own consumer with its own anchor and its own
  lag chip, because facets accrete monotonically while the dot does
  not move at all. A verification mismatch renders `unverified-read`
  with its machine-applicable repair (resolve again and let the door
  re-derive).
- **Cost.** T1 hot / T3 cold blob fetch plus local verify; facets T2.
- **Note.** The clearest demonstration of UI-L2 in the product: one
  screen, two sorts, visibly different chrome.

### 3.3 Register view — claims, steals, commits, fences

- **Denotation.** A fold over the register's lane (grant, steal,
  renew, heartbeat, commit) at an anchor, plus the landed outcome and
  the token that fenced it.
- **Update discipline.** Hot but rare — T4 acts are priced, so this
  screen is nearly still and then decisive. The one screen where a
  displayed candidate is superseded: a raced claim loses and renders
  as `stale-register-token` with its repair (re-read, re-decide), not
  as a failure.
- **Cost.** T2 to observe; the acts themselves are T4.
- **Note — the outside-meaning band.** Grant, steal, renew, and
  heartbeat are liveness machinery, not grammar (kernel §4.3). They
  render in a visually demoted band, and no fold on any screen may
  read them. Their presence in the UI is diagnostic; their absence
  from the folds is the law. Two sentences ride this screen verbatim:
  at most one landed outcome is not at most one external side effect
  (G23); and the door proves conformance against a read, not that the
  read still holds at landing.

### 3.4 Fold / view browser — the declared reductions

- **Denotation.** A fold over the declaration catalog restricted to
  fold declarations, plus `resolve` of each. Row content: fold digest,
  algebra and its rung brand, the deepest carrier the rung licenses
  (the rung⇒carrier rule, architecture §4.4), current consumers and
  their anchors, and a replay control.
- **Update discipline.** Minting-paced — warm, not hot. Anchors of
  live consumers are hot and shown inline.
- **Cost.** T1–T2 to browse; **replay is T3 and priced before the
  press**. SLA from signature (architecture §10): the rung tells the
  operator the tier, so the estimate on the button is read off the
  declaration rather than guessed.
- **Note.** A replay is a *read*, not a rebuild; its result is citable
  by `(fold digest, head)` and cacheable on that key. This is also
  where partition folds show their earned commutative brand, and
  where an unearned one would have refused at admission
  (`unearned-commutative-algebra`).

### 3.5 Refusal browser — taught refusals as a first-class screen

- **Denotation.** Two panes with two sorts.
  - *Law pane* — the sixteen refusal rows are a declared, resolvable
    value (reason, law, repair, applicability). Immutable at a
    language version; cacheable forever; no lag chip.
  - *Incidence pane* — an anchored fold over refusal facts: rate by
    reason, by agent, by writ, by lane, at an anchor.
- **Update discipline.** Law pane: resolve once. Incidence pane:
  pushed, and coalescible because counting folds are commutative.
- **Cost.** T1 law, T1–T2 incidence.
- **Note — the applicability split is the interaction design.**
  Machine-applicable rows (`last-writer-wins`, `unverified-read`,
  `past-mutation`, `anchored-resolve`) carry a repair that is a
  function of the refused candidate alone, so they offer a codemod
  affordance: apply mechanically. Advisory rows carry a repair that
  needs something the candidate does not hold — a token, a
  declaration, an authority — so they offer *the ask*, routed to the
  writ view (§3.6) or the lane that would carry the missing declare.
  Refusal parity is total: a row with an empty law or repair is
  malformed, so the UI never has an "unknown error" state to design.

### 3.6 Writ view — authority meets

- **Denotation.** `resolve` of the writ declaration (immutable), plus
  the spawn tree as an anchored fold over `spawn` facts. Child =
  parent ⊓ request, computed and displayed as a meet, with clamping
  shown where a request exceeded the parent — clamped, not refused,
  which is the stronger property (`f9_tree_attenuation`).
- **Update discipline.** Warm; spawns are minting-paced.
- **Cost.** T1 resolve, T2 tree.
- **Note.** This screen is the explanation surface for every
  refusal-shaped panel elsewhere: knowledge grows by join, authority
  shrinks by meet, and the operator can see exactly which meet made a
  panel unreachable. Pairing it with §3.5 turns "you can't see this"
  into "here is the request that would let you".

### 3.7 Inventory at a glance

| Screen | Generators | Hot / cold | Update discipline | Tier |
| --- | --- | --- | --- | --- |
| frontier dashboard | `fold` × many lanes | hot | watch-chatter, recover-by-read | T1–T2 |
| lane inspector | `fold` + `resolve` on open | hot head, cold bodies | append at head; anchor stable | T2 / T3 replay |
| dot inspector | `resolve` + facet folds | cold value, hot facets | value never updates | T1 / T3 |
| register view | `fold` over register lane; `decide` acts | hot, rare | still, then decisive | T2 obs / T4 act |
| fold browser | `fold` + `resolve` | warm | anchors inline | T1–T2 / T3 replay |
| refusal browser | `resolve` (law) + `fold` (incidence) | cold law, hot rate | coalescible counts | T1–T2 |
| writ view | `resolve` + `spawn` fold | warm | tree grows by spawn | T1–T2 |

## 4. Flow control: each view picks its own pace

Backpressure is host engineering the algebra does not model
(architecture §8.3), but the *honesty* of degradation is a law-shaped
constraint, and the rung brands decide which strategies are even
available.

**Each view is a pull consumer with a budget.** Max in-flight deltas
and max positions per batch belong to the view, not to the lane. A
slow screen cannot slow a writer: consumers are read-plane state
(architecture §4.6) and truth never waits on a reader.

**Shed load by widening the lag, and say so.** The only lawful
degradation is to advance the anchor less often and let the displayed
lag grow. The lag bar getting longer *is* the load-shedding
indicator; the estate needs no second one. Refused: silently dropped
frames, coalesced updates that do not change the displayed anchor,
and any rendering that looks fresh while holding an old anchor.

**The algebra prices the frame rate.** Which shedding strategy is
legal is read off the fold's rung — the rung⇒carrier rule turned into
a rendering rule:

| Fold rung | Legal shedding | Why |
| --- | --- | --- |
| bounded semilattice (idempotent + commutative) | jump the anchor; skip intermediate states freely | skipping cannot change the value |
| commutative monoid (counting) | batch and merge deltas; dedup by digest | order-free, but every delta must be seen once |
| positional (provision, greatest-wins, sequences) | must step; may narrow the window, never skip | skipping changes the answer |

So a cell panel may legally run at whatever pace the operator's eyes
want, while a directory panel must walk. This is the same theorem
that licenses at-least-once delivery, spent on the read side.

**Three declared degradations, all visible.** (1) Widen the batch —
bigger anchor jumps, lag oscillates, number stays honest. (2) Swap to
a coarser declared fold — a count fold in place of an envelope fold —
which is a *different fold digest*, so the panel says which fold it
is now showing. (3) Unsubscribe entirely and mark the panel cold — it
freezes at its last anchor, keeps its lag chip, and offers
resolve-on-demand. None of the three is a silent quality knob;
each is a change of denotation the screen states.

**Nothing is ever dropped from the journal to serve a view.**
Compaction is a distillation fold plus a fenced rebind of the read
root — a view change, not a data change — and a UI in distress has no
authority to invoke it.

## 5. Honest bounds

1. **Pixels are carriage.** Rendering, layout, component frameworks,
   virtualized scrolling, animation timing, input handling, and
   accessibility are host engineering the algebra is silent on. This
   note models the data flow into a screen and the honesty of what a
   screen may claim; it says nothing about how a screen is drawn.
2. **No liveness promises.** There is no "live" state, no "connected"
   assertion, and no "up to date". The strongest sentence a view may
   print is *productive through anchor p*, and even that is a reader's
   fold over observed positions.
3. **Rates are unmeasured.** Every cadence word here (fast, medium,
   rare) is an ordering claim inherited from the CAS-motion table, not
   a measurement. AE-7 commissions the numbers; until then this note
   licenses design decisions, not capacity plans.
4. **Budget policy is unmodeled.** What batch sizes, what in-flight
   caps, what a view does at the edge of its budget — all host
   choices. The constraint is only that the choice be displayed.
5. **Attribution fence.** Every name on screen is a credentialed
   connection acting under a writ. The UI displays the envelope's
   attribution; it does not and cannot display a person.
6. **The mock is a sketch.** `frontier-dashboard-mock.html` beside
   this note is throwaway, static, and fake-fed — it exists to make
   the layout consequences of §2 concrete and is labeled so in its
   own source.

## 6. Decision sheet

| # | Decision | Recommendation |
| --- | --- | --- |
| UI-1 | View declarations are first-class values with digests (UI-L1) — a screen is a `ProgramDecl`-shaped declaration, citable and replayable | **Adopt** — the egress law's surface obligation |
| UI-2 | Sort-visible chrome: lag chips on fold-class panels, never on resolve-class panels (UI-L2/L3) | **Adopt** — cheap, and makes the split auditable by eye |
| UI-3 | Ban clock-derived staleness rendering in the read path; rates carry attributed tick denominators (UI-L4) | **Adopt** — `clock-read` reaches the surface or it does not hold |
| UI-4 | Refusal-rate-at-anchor split intrinsic vs door-relative as the fleet gauge (§2) | **Adopt** — undifferentiated error rate is the anti-pattern |
| UI-5 | Rung-determined shedding strategy (§4 table) as the flow-control rule | **Pre-register**; needs the KM-17 brands surfaced to the read path |
| UI-6 | Refusal browser with the applicability split driving two interaction modes (codemod vs the ask) | **Adopt when the taught corpus is served** — the data already exists at format 2 |
| UI-7 | Replay pricing shown from the declaration (SLA from signature) before a T3 press | **Adopt**, sequenced behind AE-7 for real constants |

---

STATUS ADDENDUM (2026-08-18, operator review): the data-flow half of this note (view = declared fold + anchor + writ; staleness as head minus anchor; watch-as-chatter) stands. The visual half and the companion dashboard mock are REFUTED as generic chrome � not a composition of the estate's primitives. The visual register is being re-derived as a third concretization under the KM-18 register discipline: a visual-denotation map generated from rule data, researched before any screen ships. Successor note owed.
