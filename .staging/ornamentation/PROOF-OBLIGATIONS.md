# PROOF-OBLIGATIONS — what a front end that speaks the language owes

**Lane:** front end / ornamentation (decisions 29, 31(e), 32(a), 33).
**Status:** pre-grade. Every obligation below is a **candidate**, assessed, not
assumed. Nothing here is commissioned by this document; the grill decides.
**Written against:** `main` @ `43b59e01`, 2026-08-29. (Drafted at `c042afa3`;
citations into `docs/SPECS.md` and `GRILLING-DOCKET-2026-08-29.md` were
re-resolved after decisions 28–33 landed those files — the docket was
working-tree-only at `c042afa3`, so every line number into it has moved.)
**Companion:** `ORNAMENTATION.md` in this directory.

---

## How to read this file

The estate's discipline is that a claim names its gate (C5, I-003), and the
fastest way to waste a lane is to dress a test as a theorem. So every entry
carries a **grade** before anything else:

| Grade | Means | Discharged by |
|---|---|---|
| **THEOREM** | a statement over the model, provable in Lean | a proof |
| **GATE** | byte-identity or compile-time; a red gate is the evidence | wiring + regeneration |
| **TYPE** | true by construction; owed only a *statement* so a reader can see it | a signature + a docstring |
| **TEST** | a property over a running artifact; honest, and not a theorem | a test |
| **RULING** | a decision, not a fact; nothing to prove until it is taken | the record |

Twelve entries. Five are the brief's named candidates; two of those come back
**split** because half of each is provable and half is not, and saying so is
the point. Seven are additions this lane found.

---

## 0. The blocker that is not an obligation — read this first

**Three of `FRONTEND.md`'s eleven ruling asks are unaccounted for in the
grilling docket**, and one of them blocks nearly everything below.

Measured against `.staging/operational-structure/GRILLING-DOCKET-2026-08-29.md`
(every occurrence of the string `FRONTEND`, lines 9, 12, 13, 36, 130, 159):

| Ask | Subject | Docket status |
|---|---|---|
| 1 | rc.112 | STRUCK — landed `cd48232d` |
| 2, 7, 10 | browser tier, generated/authored, MCP revision | RULED — Tier-2 item 17 |
| 5 | `cas_word` | STRUCK — in merge, `704a4eb9` |
| 8, 9 | emitted agent configs; `check:workbench` + ledger | DISPATCHED — Tier 3 |
| 11 | distribution | STRUCK — decision 26 seat 2 |
| **3** | **transport split (stdio + Streamable HTTP, one tool table)** | **absent** — plausibly absorbed by decision 26 seat 1 and decision 32(a), but not on the record as such |
| **4** | **auth over HTTP (`ServePolicy.credentialEnv` has no checker)** | **absent** |
| **6** | **`Ts.Decl` grows an N-parameter arrow with an expression body** | **absent** — appears once, as "FRONTEND 6 adjacent" to Tier-1 item 1 (`:36`) |

**Ask 6 is this lane's critical path.** `Ts.Decl` today has exactly three arms —
`const`, `prog`, `raw` — and `ProgDecl` is a **one-parameter** arrow whose body
is an `Effect.gen` block (`library/cas/Cas/Backend/Ts.lean:59-80`). A foldkit
view is a two- or three-parameter arrow with an **expression** body
(`experiments/workbench/src/main.ts:106`: `(model, h) => ({ title, body })`;
`defineView<Model, Message, ViewInputs>` puts `ViewInputs` in the middle when
present, `FRONTEND.md:143`). **The fragment cannot spell a view.** No component
emitter, no component register, and therefore no FE-O1, FE-O2, or FE-O3 can
start until that one additive arm is ruled and landed.

It is a small change with a real consumer, which is exactly R6's own admission
test (`Ts.lean:4-5`, "grown only with a real consumer"). It should have been
ruled with Tier-2 item 17 and was not. **Recommendation: rule it in the next
sitting, on its own line, so the front end's compile blocker is on the record
rather than adjacent to something else.** Ask 4 should also be closed — the
recommendation on the table is "refuse credentialed stores exactly as stdio
does until a remote deployment exists" (`FRONTEND.md:305`), and refusing is
cheap; decision 32(a)'s daemon-served `/projections` makes it live, not
theoretical. Ask 3 is probably answered by events; confirm rather than assume.

---

## FE-O1 — The component register is emitted and byte-gated

**Grade: GATE.** Not a theorem, and it should not be dressed as one.

**Statement shape.**
`lake exe emitcomponents --check` reproduces `library/cas/surface/components.json`
and the emitted foldkit module byte-for-byte from the described values
(`Cas.Grammar.manifestV0` plus the described kinds); any hand edit to either
output turns `check:cas` red.

**What exists today.**
- The pattern is executed thirteen times in one line — `vectors`, `schemas`,
  `verdicts`, `admissionmap`, `emitwire`, `emitgate`, `emitprograms`,
  `emitlayers`, `materialize`, `mcpspec`, `emitlift`, `emitgrammar`,
  `envledger`, each `--check` (`mise.toml:441`).
- The exact precedent: **one described value → two surfaces, both byte-gated,
  neither hand-maintained** — `emitgrammar` renders `manifestV0` to
  `manifest.json` for front ends and `REGISTRY.md` for humans
  (`.staging/operational-structure/PLAIN-LANGUAGE.md:135`;
  `library/effects/src/cas/generated/grammar/kindTags.ts:1-18`).
- **Nothing for components.** `library/cas/surface/` holds `cas-laws.json`,
  `cas-obligations.json`, `cas-surface.json` and no `components.json`;
  `library/cas/Cas/Backend/` holds `Admission`, `EmitAst`, `EmitLayer`,
  `EmitProg`, `Mcp`, `ProgProse`, `Target`, `Ts` and no `EmitView`.

**What is owed.** The emitter, the row shape, and the gate wiring. The row
shape proposed at `FRONTEND.md:179` is endorsed with four amendments
(`ORNAMENTATION.md` §6.2), of which one is load-bearing here: **`overridden`
must not be a boolean.** A boolean records that a hand wrote something without
recording what, which is a hand-maintained fact about generated material and so
a P4 violation in miniature. Make it `override : Option { module, address }`
naming the overriding file node's address — then a stale override is a dangling
reference and the existing store law catches it for free.

**Who owes it.** The codegen lane (decision 27g) builds the emitter; this lane
owns the row shape. **Blocked on §0 ask 6.**

---

## FE-O2 — Projection totality per described kind

**Grade: SPLIT — TYPE on the Lean side, GATE on the TypeScript side.** The
brief's phrasing ("every kind renders, no fallback branch") is two obligations
wearing one name, and only one of them is free.

**Statement shape, Lean side (TYPE).**
`viewOf : Ty → ViewDescriptor` is a total function by elaboration — a `match`
on an inductive with no catch-all. There is no `∃` to prove; the obligation is
to *state* it and to keep the dispatch a match on `Ty` rather than on `UInt8`.
This is the same discipline `Cas.matchError` already embodies for refusals.

**Statement shape, TypeScript side (GATE).**
Adding a sort to the registry must **fail to compile** the front end until a
viewer exists for it. Totality is free in Lean and is *not* free in TypeScript:
a `switch` over a widened `number` compiles happily with a missing case. The
gate is a discriminated union plus a `never`-assignment exhaustiveness idiom in
the generated dispatcher — generated, so no hand can weaken it.

**What exists today.**
- `kindTags.ts` **is** the dispatch table, emitted from
  `library/cas/Cas/Grammar/Manifest.lean` by `lake exe emitgrammar`, byte-gated
  into `check:cas` (`kindTags.ts:1-18`). `FRONTEND.md:158` already names it the
  dispatch table; the mapping is marked derivable **yes**.
- `KindTagRow` carries `{ name, tag, reserved }` (`kindTags.ts:25-29`) — enough
  to enumerate, not yet enough to dispatch to a viewer.
- The door already refuses every registered tag from caller-defined projections,
  which is what stops an alias (`kindTags.ts:9-13`).

**What is owed.** (a) The Lean-side statement, cheap. (b) The generated
exhaustive dispatcher. (c) **A dependency worth naming:** the trichotomy.
`P5 — tag_trichotomy : ∀ t : UInt8, registered t ∨ working t ∨ refused t`,
mutually exclusive (`.staging/operational-structure/PROPOSED-LOGIC.md`, CLI
lane P5; commissioned as item **B** of the docket's proof-obligation grill,
`GRILLING-DOCKET-2026-08-29.md:174`). The UI needs it because a *working*
tag must render distinctly from a *registered* one — without the trichotomy the
front end has two states and the model has three, and the front end will
silently pick one. **FE-O2 is not complete without B.**

**Who owes it.** Lean statement + trichotomy: the Lean grill batch (docket item
B), pairing with Tier-1 item 7. The dispatcher: the codegen lane.
**Blocked on §0 ask 6.**

---

## FE-O3 — `registers_agree`, extended to views

**Grade: SPLIT — THEOREM over descriptors, TEST over renderings.** This is the
entry where assessing rather than assuming changes the answer most, so the
reasoning is given in full.

**The parent.** `P4 — registers_agree : ∀ v s, facts (prose v s) = facts (json v s)`,
with `facts` a projection into a common record; `show` is a deliberate
exception because its `--json` is the canonical document, and the exception is
recorded rather than smelled (`PROPOSED-LOGIC.md`, CLI lane P4). It is staged
**after A–G** in the docket's grill because it is among the harder ones
(`GRILLING-DOCKET-2026-08-29.md:183`).

**Why the naive extension fails.** The obvious statement is
`facts (component v s) = facts (json v s)`. It is not provable and should not
be attempted, for a stated reason: `Html = VNode | null` is an **opaque runtime
object, not a serializable value** (`FRONTEND.md:169`). There is no total
`facts` projection out of a snabbdom `VNode` — you would be proving a theorem
about a rendering library's internals, which is neither in the model nor worth
having.

**What is provable.** Move the statement down one level, to the descriptor:

> `component_register_agrees : ∀ k, facts (componentRow k) = facts (manifestRow k)`

where `facts` projects kind name, wire tag, field names and order, union arm
order, and edge targets. Both sides are first-order emitted data. This is
provable **and** byte-gateable, and it is the statement that actually carries
the product claim: the component register and the kind registry cannot disagree
about what a kind *is*.

**What stays a test.** That a *rendered* component displays those facts is a
property of a running artifact, and the estate already has the seam for it with
no new machinery: foldkit's `Story` and `Scene` run a view with **no DOM**
(`FRONTEND.md:292`; `experiments/workbench/src/story.test.ts`,
`scene.test.ts`). So: render each generated viewer over a fixture and assert
the facts appear. A test, called a test.

**The third register.** `ORNAMENTATION.md` §6.2 amendment 3 asks every register
row to carry its **prose slot**. That is what makes the parent statement
three-way — `facts(prose) = facts(json) = facts(component)` — and it is also
what makes "prose first, structure second click" (§4.6) a fact of the register
rather than a convention of the renderer. The prose plane's own emitter is
already designed and blocked: `cas-literature.json` + `LITERATURE.md` from one
described value, E5 blocked on E4 (`PLAIN-LANGUAGE.md:135-140`, `:191`).

**What this entry explicitly does not do.** It does not widen P4, restate it, or
stage ahead of it. The docket commissions P4 as written — prose against json,
with `show`'s recorded exception — inside batch item **H**, after A–G
(`GRILLING-DOCKET-2026-08-29.md:183`). `component_register_agrees` is a
**sibling statement over different terms** (two emitted registers), and it is
cheaper than its parent rather than harder, because both of its sides are
first-order data. If the grill takes H before the front end exists, nothing
here changes; if the front end lands first, this sibling can be taken without
waiting on H. **Neither ordering creates a dependency the docket did not
already accept.**

**Who owes it.** The descriptor theorem: the Lean grill batch, as a sibling of
P4 rather than inside it. The test: this lane. The prose slot: the
plain-language lane (E4/E5).

---

## FE-O4 — `Style` as content: R6's undischarged clause

**Grade: RULING first, then TYPE, then THEOREM.** Three things are tangled
under one name and they have different costs.

**What ratified law says.** R6: L3 rendering under the ratified
Substance/Denotation/Style split, with **`Style` as digested content from the
first slice** (`library/cas/EFFECTS-BACKEND.md:96-105`).

**What exists.** `library/cas/Cas/Backend/Ts.lean:19-26`:

```
structure Style where
  indent : Nat := 2
  quote : Char := '"'

def house0 : Style := {}
```

A plain Lean record with two fields and a default inhabitant. **No
`cas_struct`, no address, no `put`.** The paperwork audit calls this a
ratified-law drift — which `AGENTS.md`'s own words call a defect — and warns
that the front-end lane will otherwise re-mint a theme system out of band **and
be correct to do so** (`.staging/operational-structure/PAPERWORK-AND-PROJECTION-AUDIT.md:15`,
`:52`, `:138` = **D7**).

**The three obligations, separated.**

1. **RULING / discharge.** Make `Style` a described value with a `cas_struct`
   code and an address; `house0` becomes a published root rather than a
   default. **Needs no new ruling — only the discharge of an old one, with a
   date.** This is the cheapest genuine content object the lane can take.
2. **TYPE.** `Ts.lean:10-14` asserts fixed layout with **no width-adaptive
   grouping, ever** — stable bytes and stable diffs are the point. Today that
   is a docstring. It is *already* true at the type level, because `render`
   takes no width parameter; the obligation is to **say so in the signature's
   own words** so a future contributor cannot add one without noticing they are
   breaking a ratified property. One sentence, zero risk, real value.
3. **THEOREM — and R6 already names it.** The printer obligations are
   `render` **idempotence** and **parse-back**, with the admitted
   lean4-tree-sitter twin as the style-blind structural falsifier: generator
   and extractor as each other's check, never self-comparison
   (`EFFECTS-BACKEND.md:104-110`). These are undischarged. The front end is the
   consumer that makes them urgent, because a component's diff is supposed to
   tell you a *kind* changed and can never tell you a hand slipped
   (`FRONTEND.md:290`) — a claim that rests entirely on printer determinism.

**Scope note, and it is a ruling ask, not a detail.** Today's two fields serve
the code printer. The UI's ornament values — the neutral ramp, the one verdict
hue, the measure, row height, gutter widths, and any ornament precedence order
— are the same *kind* of thing and belong in the **same carrier**, grown
consumer-gated per R6. **There must be exactly one addressable presentation
carrier** (`ORNAMENTATION.md` §6.5, condition 4). Two would reproduce, by our
own hand, the identity defect this lane documented at Paper: tokens copied
between files do not update when changed elsewhere
(<https://paper.design/docs/tokens>, retrieved 2026-08-29, C6 PENDING).

**Who owes it.** Discharge: this lane, in the next slice. Printer theorems: the
backend-materialize / printer lane. Field growth: this lane, one emitter at a
time.

---

## FE-O5 — The verdict type, and exactly what the UI needs from it

**Grade: RULING.** There is nothing to prove until the type exists, and this
lane's job is to state the consumer requirements precisely enough that the
ruling is decidable.

**The gap, as the record states it.** Docket language-value ranking item 5,
[c7]: *nothing can state a computation's standing*; provenance, economy, and
lifecycle are **orthogonal axes**; commission the ruling ask
(`GRILLING-DOCKET-2026-08-29.md:195-197`). It is named there as the gap
decision 27 misses.

**What exists, and why neither is it.**
- `Status` (`library/cas/Cas/Lang/Interp.lean:42-46`) — `done | running |
  refused`, "where a program stands after some steps", with `isDone`,
  `isRefused`, `isRunning` and the note that `running` is the only status that
  says nothing about the program (`:56-59`). This is about **execution
  progress**, not standing.
- `AdmissionVerdict` (`library/cas/Cas/Schema/AdmissionMap.lean:125-130`) —
  `admitted | deferred (code) | rejected (code)`, with the code carried by
  exactly the two non-admitted arms so that **no row can defer without saying
  behind what** (`:122-124`). This is about a **representation variant at the
  door**, not about a computation.
- `Cas.Error` — a closed seven-arm refusal family, folded by `Cas.matchError`
  so a new clause cannot slip through unworded
  (`library/effects/bin/cli/render.ts:95-118`). This is about a **failed read**.

Three verdict-shaped types, none of which answers "should I trust this answer,
what did it cost, and is it still current."

**One subject correction before the requirements, so this entry cannot be read
as pre-empting the ruling.** The docket's item is *a verdict type for
**programs*** — the standing of a **computation**
(`GRILLING-DOCKET-2026-08-29.md:195-197`). The UI's gutter, by contrast, is a
column on a **row**, and a row is a binding. **These are not the same carrier,
and this lane does not get to pick which one the type is over.** What the front
end actually requires is weaker and does not compete with the ruling: *the
verdict of the computation that produced a binding is reachable from that
binding, totally*. If the ruled type is over programs, the UI's gutter renders a
projection along that reachability; if the ruling puts it elsewhere, the gutter
follows. **The requirements below are stated over whatever carrier the ruling
names**, and requirement 1's spelling is the front end's *consumer* obligation,
not a proposed signature.

**What the UI needs from it — five requirements, and they are the lane's
contribution to the ruling.**

1. **Totality.** The verdict lookup is total over the carrier the UI renders,
   so the verdict gutter has no fallback branch — the same shape as FE-O2, and
   for the same reason. Spelled at the row, that is
   `verdict : Binding → Verdict` with no partiality and no `Option`; spelled at
   the ruled carrier, it is totality plus the reachability above.
2. **Reason-carrying arms.** Every non-neutral arm carries its own code, on the
   `AdmissionVerdict` pattern where the *shape* forbids a silent deferral
   (`AdmissionMap.lean:122-124`). This is what lets the gutter render the clause
   name rather than a colour, which is `W-X1` greyscale legibility
   (`.staging/paper-notes/10-workbench-requirements.md:379-381`) and `W-E3`
   exhaustiveness at once.
3. **The three axes stay separate in the type.** A row can be
   provenance-strong and economy-unknown. Collapsing three axes into one badge
   is precisely the design defect a proper type prevents, and it is the defect
   a UI will introduce on its own if the type does not forbid it.
4. **Orderable and partitionable.** `W-D4` rules the resolution knob a
   predicate, not a slider, stateable as text and reconstructible from the URL
   (`10-workbench-requirements.md:145-148`). A verdict that cannot be sorted or
   filtered cannot serve that rule.
5. **`—` must be inhabitable.** "Not computed" is a **value**, not a missing
   field. `W-L2` already rules that where the model computes nothing the UI
   renders the absence, and names the live instance: `handleLlm` records no
   meter, so the cost column reads `—`, never `0`
   (`10-workbench-requirements.md:215-220`). The economy axis therefore ships
   *uninhabited but present*. Docket item 6 (`METER infer`, [c7]) would
   populate it by making R15's answer-as-recorded-content a law of the handler
   rather than a convention of the example (`:198-200`).

**Who owes it.** The ruling: the operator, via the docket's language ranking
(item 5). The type: the language lane. Requirements 1–5: this lane, above.

---

## FE-O6 — Read-only is enforced, at two sites

**Grade: TYPE at tier 1 (already true, unstated), GATE at tier 0 (owed).**
Decision 32(a) changed this entry after it was drafted, and the change matters.

**Tier 1 — the browser store. Already a type-level fact.**
`library/effects/src/cas/PathReader.ts:15-18` says it outright: read-only is a
type-level fact; the module provides `ByteReader` **and nothing else**, so
writing over a path-reader composition is a **compile error, not a runtime
refusal**. The same docstring states the host is untrusted by construction — the
store law above the seam recomputes the digest and re-decodes canonically on
every read, so a hostile or corrupted host surfaces as a typed refusal, never
as silently served bytes (`:10-14`).

**So what is actually owed here is narrower than "prove read-only", and naming
it narrowly is the useful contribution.** The type protects a *composition*; it
does not protect a *bundle*. Nothing today stops a future import of
`layerSqliteCasAt` (`library/effects/bin/cli/store.ts:226-242`) from adding
write capability to the browser build, silently, because every layer in that
stack is platform-free except the last two lines (`FRONTEND.md:86`). Three
candidate gates, ascending:

- (a) an import lint on the browser entry — weakest, easy to bypass;
- (b) an **emitted allowlist** of modules the browser bundle may import, gated
  like every other emitted artifact — consistent with the estate's idiom;
- (c) a **layer type test**: assert the composed browser layer's `ROut` never
  mentions the admission seam, so a wrong composition is a TypeScript compile
  error.

**Position: (c), with (b) as its documentation.** A wrong fold being a compile
error in the generated module is the estate's own stated argument for the
cheapest gate in the chain (`library/cas/Cas/Backend/EmitLayer.lean:31-34`),
and it is exactly this shape.

**Tier 0 — the daemon. New, and now the primary site.**
Decision 32(a) releases `/projections` to the daemon, read-only. `FRONTEND.md`
costed tier 0 as a static host (`:78-80`, `:116`), which needed no enforcement
at all because a directory cannot be written through a `GET`. A daemon route
can. So tier 0 acquires a real obligation it did not have as a static host:

> **The `/projections` route serves emitted artifacts and admits nothing.**

The precedent for how to hold it is strong and should be reused rather than
re-argued: the MCP host asserts agreement between the emitted manifest and its
served table **before the transport is constructed** — a host that would answer
`tools/list` with a table the estate did not emit must never reach `initialize`
(`library/effects/bin/mcp/server.ts:138-160`, via `FRONTEND.md:246`), and that
gate is transport-independent. **The `/projections` route owes the same
boot-time posture: serve only what a `--check`-gated emitter produced, and
refuse to bind otherwise.**

**And the adjacent open item.** `ServePolicy.credentialEnv` still has no checker
anywhere in the tree; the stdio host handles it honestly by **refusing** a
policy-gated store outright, explaining that stdio's peer is the process that
launched it (`bin/mcp/server.ts:92-109`, via `FRONTEND.md:41-42`). With a
daemon serving routes, that refusal must become either a real credential check
or an identical refusal — **it must not become silence.** This is §0's ask 4,
and decision 32(a) makes it live.

**Who owes it.** Tier 0: the production serving-spine seat (decision 26 seat 1).
Tier 1: this lane, wired by the production-package seat (seat 2).

---

## FE-O7 — Every prefix of an admitted word is admitted

**Grade: THEOREM. Small, real, and already named PENDING by the prior art.**

**Statement shape.**
`wf_prefix : ∀ x y, Word.wf (x ++ y) = true → Word.wf x = true`

**Why the front end owes it.** There is no undo in an append-only store, and
three affordances replace it — `W-U1` dry mode, `W-U2` retraction as a view
operation, `W-U3` **fork by prefix**
(`10-workbench-requirements.md:320-338`). Fork is the product's *entire* undo
story: a session's word is a value, `run` takes a word and returns a word, so
"go back to `#0044` and try differently" is taking the word's prefix through
`#0044` and running a different program over it. It is also this lane's answer
to Paper's strongest argument against a transcript interface — that spatial
layout keeps several futures visible where a chat log cannot
(<https://paper.design/blog/a-real-space-to-design-in-the-age-of-agents>,
retrieved 2026-08-29, C6 PENDING). Our futures are *values*, and comparing them
is byte equality. See `ORNAMENTATION.md` §5.7.

**What exists.** `Word` is `List Binding` (`library/cas/Cas/IR/Word.lean:35`)
with the namespace at `:53`. The corollary follows from `Word.wfFrom_append` —
`wf (x ++ y) = wf x && wfFrom x y`, hence `wf (x ++ y) = true → wf x = true` —
by one `Bool.and` elimination. The prior art flags it explicitly: it **is not a
named lemma**, and it **should be named on the Lean side before fork ships**,
because fork is the whole undo story and currently rests on an unnamed
corollary (`10-workbench-requirements.md:340-344`, marked `(C5, PENDING)`).

**What is owed.** One named lemma and its docstring. This is the cheapest
theorem in the file and it licenses the product's most-used gesture.

**Who owes it.** The `cas_word` seat (decision 26 seat 3), or the Lean grill
batch — note the docket already commissions **D**, `Word.toStore` non-injective
plus **prefix-wf** [c7] (`GRILLING-DOCKET-2026-08-29.md:177`). If that
`prefix-wf` is this lemma, **FE-O7 is already commissioned and merely needs to
be recognized as the front end's licence.** Confirm at merge rather than
duplicating it.

---

## FE-O8 — Adding a refusal clause breaks the front end's typecheck

**Grade: GATE. Already ruled; what is owed is a second consumer.**

**Statement shape.** The refusal renderer is exhaustive over a closed family and
a `default:` case is a defect; adding a clause to the Lean model fails the
front end's compile.

**What exists.**
- The family is closed and folded: `Cas.matchError` with seven arms —
  `AddressMismatch`, `ContentNotFound`, `DanglingReference`, `NonCanonicalBytes`,
  `StoreFailure`, `UnknownKind`, `WrongKindReference` — and the CLI builds on
  the fold **so a new clause cannot slip through unworded**
  (`library/effects/bin/cli/render.ts:93-118`). Each arm names the store law it
  broke, in the everyday register.
- `W-E3` states the requirement and its falsifier — adding a clause to the model
  breaks the front end's typecheck — and flags it explicitly as a build-gate
  wiring requirement, not a coding style
  (`10-workbench-requirements.md:356-361`).
- **The unification is already ruled**: docket Tier-2 item 9 — one Lean
  inductive, projected to TS `CasError` **and** the cas-http status table, with
  an **R11 byte gate on the mirror**, total by construction
  (`GRILLING-DOCKET-2026-08-29.md:101-103`).

**What is owed.** The front end becomes the *second* consumer of that mirror,
on the same footing as the CLI. Plus `W-E4`: `failed(reason)` is the only
free-text error and renders as quoted **foreign** text, visually distinct from
clause names — it is the one channel where an unstructured string enters
(`10-workbench-requirements.md:362-365`), and the estate's own critique of
HILBERT's `str` return applies to us the moment we render it like a first-class
label (`.staging/paper-notes/00-postread-coordinator.md`, §3).

**Who owes it.** Taxonomy: the refusal-taxonomy lane (Tier-2 item 9). Second
consumer: this lane.

---

## FE-O9 — The UI speaks the everyday register

**Grade: SPLIT — THEOREM over generated components, GATE over authored ones.**

**The parent.** `P3 — everyday_closure : ∀ o, reachableFrom userInvocation o →
words o ⊆ everydayRegister`, which turns register drift from an audit finding
into a proof obligation; the proposer names the hard part honestly — *modeling
`words` over the renderers* (`PROPOSED-LOGIC.md`, CLI lane P3). Staged after
A–G in the docket grill, with P4 (`:207-208`).

**Why the UI's version splits, and why it is easier on one side.** A
**generated** component's strings come from the manifest, so `words` over it is
first-order and the statement is a theorem about the emitter — genuinely
easier than the CLI case that motivated P3. An **authored override** contains
hand-written strings and cannot be reasoned about; it gets a grep gate over UI
strings, which the prior art already assumes twice: `W-D1`'s falsifier counts
rows against everyday-register sorts, and `W-H1`'s falsifier is literally *grep
the UI strings — "root" never means "frontier"*
(`10-workbench-requirements.md:119-125`, `:167-169`).

**What exists.** `VOCABULARY.md`'s two registers, with the consumer-gating rule
that a term enters the everyday register only when a verb needs it — which the
prior art identifies as **the collapse rule applied to pixels instead of help
text** (`:111-119`). `FRONTEND.md:280` calls this the single strongest "our
language gives us the UI" claim available, and it is already written down.

**What is owed.** The generated-side statement (after P3 lands), and the
authored-side grep gate. **The interesting consequence, worth stating so it is
not lost:** when a level-1 row *ought* to exist for a protocol-register sort,
the fix is to **land the verb, not to widen the view** (`:123-125`). That is a
design rule enforced by a proof obligation, which is the whole thesis of this
lane in one line.

**Who owes it.** P3: the language-police lane. The UI split: this lane.

---

## FE-O10 — The view is reconstructible from its URL

**Grade: TEST today; promotable to THEOREM cheaply.**

**Statement shape.** `∀ v, parse (print v) = some v` over view state.

**What exists.** `W-D4` rules the resolution knob a predicate rather than a
slider: filter by verdict or by kind, both predicates over bindings, both
stateable as text, both in the URL, both shareable — *a slider is
unfalsifiable; a filter is a value* — with the falsifier "the current view is
fully reconstructible from its URL" (`10-workbench-requirements.md:145-148`).
Nothing implements it.

**Assessment, honestly.** A round-trip property over a hand-written parser is a
**test**. It becomes a **theorem** the moment view state is a described value —
and a filter predicate over verdict and kind is a *tiny* AST that the existing
`Ast` plane can already spell. **Recommendation: ship the test at v0, and note
the promotion path rather than taking it now.** Taking it now would be minting
an abstraction ahead of its consumer, which R6's own growth rule forbids.

**Who owes it.** This lane.

---

## FE-O11 — Agent attribution on a binding

**Grade: NOT AN OBLIGATION — an open question, recorded so it is not invented.**

Paper renders agent presence as a first-class multiplayer citizen, and its MCP
write set ends with `finish_working_on_nodes`, which clears a *working
indicator* from artboards — the agent is responsible for saying it stopped
(<https://paper.design/docs/mcp>, <https://paper.design/build-log>, retrieved
2026-08-29, C6 PENDING). `ORNAMENTATION.md` §5.1 argues the estate's analogue
is not a lock — nothing needs locking, since re-insertion of identical bytes is
the identity (`KvsBackend.ts:20-24` via `FRONTEND.md:52`) — but **attribution on
the row**, which is natural here because agent work is already content
(decision 22 / VISION press 6, `.staging/product-sphere/VISION.md:41-43`).

**Why this is not yet an obligation.** It is unknown to this lane whether a
binding records its admitting agent. `cas_run`'s reply is the word for that
call and nothing persists it (`FRONTEND.md:258`), and the `cas_word` seat's
spelling is in merge (`704a4eb9`). **Inventing an obligation against an
unlanded surface would be exactly the error this file exists to avoid.**

**The question, for the `cas_word` seat.** Does a binding record its admitting
agent, or is attribution session-local? If session-local, the UI renders `—`
per `W-L2` and says so — which is a perfectly good answer, and a better one
than a fabricated column.

---

## FE-O12 — Verdict colours survive greyscale

**Grade: TEST. Deliberately not called a theorem.**

**Statement shape.** For every pair of verdict tokens, `|ΔL| ≥ θ` in OkLCH.

**What exists.** `W-X1` requires greyscale legibility with the falsifier
"greyscale a screenshot; every verdict remains distinguishable", and adds that
at level 1 each verdict carries **a word, not only a mark** — one-character
shapes are as hard as colours (`10-workbench-requirements.md:379-381`). `W-K4`
requires focus visible at ≥3:1 against both adjacent surfaces in both themes,
with the ring never the only indicator (`:315-318`). The palette is
deliberately unspent: `experiments/workbench/src/styles.css:1-13` declares tone
only, reserving hue for verdicts, on the stated grounds that spending it in a
skeleton would settle a decision belonging to whoever designs the verdict
surface.

**What is owed.** The palette as a **computed object in OkLCH** rather than a
list of hex values (`ORNAMENTATION.md` §4.1), which is what converts `W-X1`
from a screenshot review into arithmetic a unit test can perform. In HSL the
check is not expressible; Paper made the same move to Oklab, for perceptual
uniformity rather than for decidability
(<https://paper.design/compare/figma>, retrieved 2026-08-29, C6 PENDING) — we
get the second benefit for free.

**Who owes it.** This lane. Called a test, because it is one.

---

## Ranking — what to take, in order

Ordered by (blocking weight × cheapness), not by interest.

| # | Obligation | Grade | Cost | Note |
|---|---|---|---|---|
| 1 | §0 ask 6 — the `Ts.Decl` arrow arm | RULING | one arm | **blocks FE-O1/2/3 entirely** |
| 2 | FE-O7 — `wf_prefix` | THEOREM | one lemma | possibly already commissioned as docket **D**; confirm |
| 3 | FE-O4.1 — discharge R6's `Style` clause | RULING | one `cas_struct` | needs no new ruling, only a date |
| 4 | FE-O6 tier 0 — `/projections` admits nothing | GATE | reuse `server.ts:138-160` | made live by decision 32(a) |
| 5 | FE-O2(c) — tag trichotomy | THEOREM | docket item **B** | already commissioned; FE-O2 incomplete without it |
| 6 | FE-O1 — component register gate | GATE | one emitter | after (1) |
| 7 | FE-O8 — refusal mirror, second consumer | GATE | wiring | taxonomy already ruled |
| 8 | FE-O5 — the verdict type | RULING | a grill | requirements 1–5 supplied above |
| 9 | FE-O3 — `component_register_agrees` | THEOREM | after P4 | descriptor level only |
| 10 | FE-O4.3 — printer idempotence + parse-back | THEOREM | real work | R6 already names it |
| 11 | FE-O9 — everyday closure over the UI | SPLIT | after P3 | grep gate is cheap now |
| 12 | FE-O12, FE-O10 | TEST | small | this lane, with the palette slice |

**The honest summary.** Of the six candidates the brief named, **one is free
and merely unstated** (tier-1 read-only, FE-O6), **two split** into a provable
half and a test half (FE-O2, FE-O3), **one is a discharge rather than a proof**
(FE-O4), **one is a ruling with no type yet** (FE-O5), and **one is a gate
rather than a theorem** (FE-O1). The single cheapest thing on this list that
nobody has done is a one-line lemma about word prefixes, and the product's
entire undo story rests on it.

---

## Provenance — C6

Estate citations are to `main` @ `43b59e01` at 2026-08-29 and are re-checkable
at those paths and lines. All Paper citations
are **PENDING**: retrieved 2026-08-29 by fetch, no bytes retained, no digest
computed, nothing resolved into `.reference/provenance/`. The full source table
and the retrieval caveat are in `ORNAMENTATION.md` §8, which also records why
that caveat is not boilerplate here — a fetch in this same `.staging`
neighbourhood previously returned a model-generated reconstruction of a source
rather than the source (`.staging/paper-notes/PROVENANCE.md:34-46`).
