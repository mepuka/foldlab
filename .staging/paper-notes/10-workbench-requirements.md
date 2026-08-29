# Lane B · WORKBENCH — minimum professional requirements and the decisions owed early

Conception mode (C3). Nothing here is stamped. Requirement IDs are for citation,
not for a backlog. Every requirement below is written so that a later reader can
say it was met or missed.

Read: `Cas/Lang/Ops.lean`, `Cas/Lang/Interp.lean`, `Cas/Lang/Roots.lean`,
`Cas/IR/Word.lean`, `Cas/Core/{Node,Store,Admission}.lean`,
`Cas/Grammar/{Sorts,Syntax}.lean`, `Cas/Schema/Notation.lean`,
`examples/CasExamples/{AgentStep,Roots}.lean`, `library/cas/mcp/cas-tools.json`,
`library/effects/{VOCABULARY.md,PROFILE-CAS-HTTP-0.md}`,
`library/effects/bin/cas.ts` + `bin/cli/*`, `research/merkle-set-reconciliation-design.md` §6,
`.staging/paper-notes/01-preread-using.md`, the artifact "The Owed Column".

**Provenance marks.** foldkit's API surface was read from `foldkit.dev/llms-full.txt`
on 2026-08-29 and is **pending (C6)** — not pinned into `.reference/provenance/`.
The local-sync-DB engine is an **assumption**: a libSQL/Turso-shaped credential file
sits untracked at repo root and was not read. Nothing below depends on which engine
it is; see OWED-3 for what actually changes if it is wrong.

---

## 0. The one-line position

**The terminal is the word, with an input line at the bottom.**

Not a terminal that prints output. The scrollback *is* the admission history: an
append-only ordered list, read top to bottom, that nothing can edit after the fact.
`Word` is a list of bindings in admission order; `wf` says every reference resolves
among *strictly earlier* bindings; first-binding `find` makes any later binding at an
occupied address inert. A terminal's scrollback has exactly those properties. Every
other candidate surface has to *maintain* a correspondence between what you did and
what you see. Here there is nothing to maintain, and that is the whole reason the
operator's invariant 1 is satisfiable rather than merely aspirational.

---

## 1. The terminal question

### What it is not

- **A shell.** One already exists and is better at it (`cas init|status|ls|show`,
  `--wizard`, help carrying VOCABULARY.md's everyday register). Cost of choosing it:
  a second grammar between the user and the language, and results that are characters
  rather than things you can point at. It fails invariant 4 ("faithfully translate the
  language") at the first argument parser.
- **A command bar (⌘K).** An accelerator with no notion of a composed expression or a
  result you can name. Cost: composition. There is no way to say "put a node whose ref
  is the answer of line 44," which is the only interesting thing a CAS prompt does.
- **A read-only transcript.** This is the artifact "The Owed Column" as drawn. Cost:
  the entire "program *into*" half of invariant 1. See §6.1.

### What it is

A REPL over the store language whose scrollback is the word, fused with the run log.
Grounded in what exists: the ops are `put`/`load`/`fail`/`infer`; a run answers
`Status × Word`; `Status` is `done | running | refused`; `cas_run` in the generated
MCP manifest already fixes what a submittable program is on the wire — *instructions
in admission order, references naming earlier answers by index*.

**W-T1 — Two row species, and they are structurally different.**
A **binding** row is addressed, permanent, and is in the word. An **event** row is
unaddressed, session-local, and is in the run log. Nothing else may produce a row.
*Falsifiable:* export the transcript, drop every event row, re-run the remainder —
the resulting word is identical to the session's word. (This is the existing
conformance-vector equality gate, not a new mint.)

**W-T2 — A refusal is an event, never a binding.**
`step` refuses in every clause with the word *unchanged*. So a refused row carries a
clause name and no address, and the address column is structurally empty for it.
*Falsifiable:* no refusal row ever displays an address.

**W-T3 — `running` is a shown state, not an internal one.**
`run` is fuel-bounded and returns `.running rest` on exhaustion. A suspended program
is a value. *Falsifiable:* there is a rendering for `running` that is not a spinner and
that offers "continue with more fuel."

**W-T4 — Completed rows never re-render.**
A row's rendering is a pure function of its binding, and first-binding resolution means
nothing admitted later can change anything admitted earlier. *Falsifiable:* rows never
reflow, reorder, resize, or change verdict after landing.

### The cost of this position, stated

**You cannot type `agentStep` at this prompt.** `agentStep` is a `do`-block with
`foldlM`; `cas_run` carries straight-line instructions only. The workbench's language
is therefore *strictly weaker* than the Lean language it is a front end to at v0. Two
exits — a stored program addressed by F3 code point (`PLine`/`PProg`, tags 14/15,
registry rows owed per VOCABULARY.md), or a program encoding grown on the wire. **Not
my call → Lane C** (OWED-6). What must not happen is that the limit gets chosen by
default because the manifest that exists is the straight-line one, leaving the estate's
own worked example inexpressible in its own workbench without anyone deciding that.

---

## 2. Density without overwhelming resolution

### The unit of resolution is the binding, not the node

A node is a byte frame. A **binding** is an (address, node) pair *at a position*, and
position is what makes it readable — it has predecessors it may cite and successors
that may cite it. That is the unit.

But bindings arrive in the wrong numbers. One 1 MB file under recipe 1 is ~16 chunks +
tree nodes + a manifest + a file node: ~19 bindings for something a person calls one
file. That is the density problem in its exact form, and it is not solved by a zoom
slider.

### The collapse rule is derived, not designed

`VOCABULARY.md` already rules which words a person sees unprompted (**everyday
register**: store, address, kind, value, link, blob, file, schema, roots, refused,
verify, history) and which stay hidden until a verb summons them (**protocol
register**: node, payload, tag, sort, word, binding, marker, vector, entry, context,
git, step/cont, canonical, form address, and the language machinery). That document's
consumer-gating rule — *a term enters the everyday register only when a verb needs it* —
is the collapse rule, applied to pixels instead of help text.

**W-D1 — Exactly two levels of resolution, and the boundary is VOCABULARY.md.**
Level 1 is the everyday register. Level 2 is the protocol register for one row. There
is no level 3 and no continuous zoom.
*Falsifiable:* the row count of a collapsed transcript equals the count of bindings
whose sort is in the everyday register. A `context` or `entry` binding cannot produce
a level-1 row until a verb summons it — the fix when that feels wrong is to land the
verb, not to widen the view.

**W-D2 — Uniform rows. Variability lives in fixed-width gutters.**
A level-1 row is: [verdict, 1ch] [address chip, constant width] [kind, 8ch]
[name/statement, flex, single line, clipped, never wrapped] [cost, right-aligned].
*Falsifiable:* every level-1 row has identical height at every window width. This is
the single rule that makes 203 rows scannable, and it is the first one tools break.

**W-D3 — Three gestures, and only three.**
- **Expand** — one row becomes its level-2 rendering, in place. The only thing that
  changes row height, and only for that row.
- **Focus** — a row becomes the subject of the detail pane. A selection, not a
  navigation: nothing scrolls, nothing reflows.
- **Descend** — a binding becomes the transcript's root; the transcript shows its
  closure in admission order, and a breadcrumb is pushed.

*Falsifiable:* there is no fourth gesture that changes what is on screen. **Hover
carries no information** — it may preview what a click would do and nothing else.
Testable by unplugging the mouse.

**W-D4 — The resolution knob is a predicate, not a slider.**
Filter by verdict or by kind. Both are predicates over bindings, both are stateable as
text, both appear in the URL, both are shareable. A slider is unfalsifiable; a filter
is a value. *Falsifiable:* the current view is fully reconstructible from its URL.

**W-D5 — Find-in-word is minimum, not enhancement.**
A viewer of one run can scroll; a workbench accumulates. Jump-to-address, filter, and
a match count are level-1 requirements. *Falsifiable:* getting from 10⁴ bindings to a
named one takes bounded keystrokes and no scrolling.

---

## 3. Chain heads visible as you move

Three different things are called "head" and conflating them is the trap.

| Name | What it is | Scope |
|---|---|---|
| **frontier** | the last binding of the current session's word (`NonemptyWord.root` = `getLast`) | session, ephemeral, exists before anything is published |
| **roots** | the published set (`RootStore.list` / `listRoots`); grow-only; publication is fail-closed on presence and **confirms nothing about bytes** (PROFILE §7) | store, shared |
| **head** | the latest `entry` (0x0C) of a named journal, reached by walking predecessor refs — `journal%` builds genesis → entry → entry; `agentStep` appends exactly one per step | derived, never stored |

**W-H1 — One word per thing.** VOCABULARY.md collision 4 already rules "root" for the
CLI; the workbench inherits it. *Falsifiable:* grep the UI strings — "root" never means
"frontier."

**W-H2 — "Visible as you move" is a marker, not a counter.**
The frontier is drawn at the boundary between the last binding and the input line. On
append it moves down exactly one row. *Falsifiable:* after a `put`, the only pixels that
change are the new row, the marker, and the counters.

**W-H3 — Heads are derived, and an index is a cache or it is a lie (P4).**
An index of journal heads may exist. It must be reconstructible from the store alone.
*Falsifiable:* delete the index database, reopen — the screen is identical, slower.
This forbids a maintained `heads` table that is the source of truth. **→ Lane C**, this
constrains the sync DB schema.

---

## 4. Detail views of language substrates

Five substrates exist, and they are the five the language actually has: the **node**
(version, tag, payload, refs), the **schema plane** (`Ast`, `cas_struct`/`cas_union`,
`rawSchema`, `Described`), the **grammar** (`Tree`, sorts, `flatten`, `save%`/`journal%`),
the **word** (bindings, `wf`), and the **program** (`Prog`, ops, `Status`, fuel, handlers).

**W-S1 — One detail view, four slots, every substrate.**
(a) the thing; (b) the bytes it is identified by; (c) what it was derived *from*;
(d) what it is derived *into*. Same four slots at every substrate — that is what makes
it a substrate browser instead of five bespoke inspectors.
*Falsifiable:* no substrate view has a fifth slot or is missing one of the four.

**W-S2 — The detail view must be able to say "I cannot show you this."**
A `chunk` payload is arbitrary bytes; a `git` node is a foreign preimage; an `infer`
prompt has no address at all today. Unknown is rendered as unknown at full weight.
*Falsifiable:* there is a specific rendering for "opaque payload, N bytes, no described
codec claims it," and it is not a blank panel.

---

## 5. Faithfully translate, and refine

**W-L1 — The workbench may add sugar, never semantics. This is the strongest
requirement here and it kills the most features.**
Every gesture must be expressible as a program in the language, and the workbench must
be able to *show you that program*.
*Falsifiable:* one key turns any UI affordance into its program text before it runs;
an affordance with no program text does not exist. A button is a public name and is
judged from all five seats.

**W-L2 — Refinement is filed as a finding, never shipped as a divergence (P4).**
Where the UI wants a value the model does not compute, the UI renders the absence. For
this build that is at least three: the prompt has no address, `handleLlm` records no
meter, and there is no canonical spelling for propositions.
*Falsifiable:* no cost number in the product is computed by the product. If nothing
recorded it, the column reads `—`, never `0`.

---

## 6. Where the sketch ("The Owed Column") is wrong or insufficient

Pressure, not extension.

**6.1 It is a post-mortem and has no input.** "the post-mortem is simply the live view
after the frontier stops moving" is elegant and hides the problem: a proof-session
viewer's job ends when the run ends; a workbench's job *starts* at an empty store. The
sketch has no empty state, no composer, and no prompt. Its one authoring surface
(`cas_sketch`/`cas_close`) is *Lean source in your editor* — which answers "where do you
type?" with "not in this product." If that stands, the workbench is a viewer and
invariant 1 is unmet.

**6.2 The verdict gutter is internally contradictory, and this must be resolved before
any renderer is written.** The sketch argues three *orthogonal* axes — provenance,
economy, lifecycle — and then draws **one** gutter carrying values from all three
(`held`, `cached`, `owed`, `refused`, `abandoned`, `open`). If the axes are orthogonal,
one gutter cannot carry them; if one gutter suffices, they are not orthogonal.
Worse: **three of those six cannot be bindings at all.** `open` has not been admitted,
so it has no address and no position. `abandoned` admitted nothing. `refused` leaves the
word unchanged by every clause of `step`. So the sketch's "word · admission order" pane
is not a word — it is a word interleaved with pending obligations, which is exactly the
hand-maintained-beside-it structure P4 forbids.
**Position:** the gutter carries **provenance only** — the axis the type system already
decides, because `⊕ₛ` gives `held` vs `owed` for free. Economy is the cost column (it
already is one). Lifecycle is the row's *species and presence* (W-T1). Ruling on the
vocabulary itself belongs to whoever owns it; the workbench simply cannot ship three
axes in one character.

**6.3 The address chip is designed for reading, not for pointing.** Constant width and
the shard byte are right and I keep them. But there is no story for *entering* an
address, for pasting one, for disambiguating one, or for what a click does. And the
digest bar — "eight columns, one per byte of the elided middle" — is a shape/colour
encoding of bytes, which is the thing the sketch elsewhere forbids: not copyable, not
speakable, diffable only by eye. It needs an accessibility answer (W-X4) or it goes.

**6.4 "Concurrency is legible by being absent" is a bet a workbench cannot make.**
True for pure store programs — the schedule cannot affect the answer. But `infer` is an
unbounded network call, and `push`/`pull` carry deadlines (PROFILE §10), `retry-after`
(§1), and capacity refusals. A workbench that shows nothing for forty seconds has no
attention model — the exact failure the USING pre-read predicted. The correction is not
a Gantt chart: **in-flight operations are events (W-T1 species 2), with elapsed time and
a cancel, and they are the only moving pixels.** Determinism of the answer does not
license invisibility of the spend.

**6.5 The cost rail is unbuildable today and it is the drawing's main plank.** The
sketch itself concedes "Nothing anywhere is a meter" — `handleLlm` eliminates the
`infer` node entirely, so a completed run carries no trace that inference occurred. Under
P4 the indent-guide-as-cost-rail cannot be drawn. Without it, the indent guide is back to
carrying no information and the density argument loses its best idea. Either the meter
lands first, or v0 has no rail and says so.

**6.6 The bottom counters ("held 178, cached 9, owed 1…") are undersourced and invite
the paper's own failure** — "unexamined size gets narrated as strength." If they stay,
each must be derived and each must be clickable into the filter that produces it.

---

## 7. The minimum professional bar

### Addressing and selection

- **W-A1 — The address chip is a control.** Click = focus; ⌘-click = descend; copy =
  full 64 lowercase hex, never the abbreviation. *Falsifiable:* nothing in the product
  ever puts an abbreviated address on the clipboard, and nothing ever accepts one as
  input.
- **W-A2 — Prefix addressing is input-only and resolves against the current word, never
  the store.** Git-style short hashes are the obvious move and they are wrong here: the
  store is grow-only and network-shared, so a prefix unique today is not unique tomorrow,
  and first-binding `find` would resolve a collision silently. A prefix resolves only if
  it matches exactly one binding in the current word; otherwise it is a refusal listing
  candidates. *Falsifiable:* prefix resolution never reads the object directory.
- **W-A3 — Position is the second name, and the wire already ratified it.** `#0048` is
  what a person says out loud, and `cas_run` already names earlier answers by index.
  Rule: **positions live in programs, addresses live in content.** *Falsifiable:* a
  position is never persisted into a node.
- **W-A4 — Names come from content or they do not exist (the direction law).** A `file`
  carries a name; an `entry` carries a note; the workbench may display those. It may not
  let a user attach a label that lives only in the workbench's database — that is minting
  identity outside the store. User labels, if wanted, are `put` as content.
  *Falsifiable:* the sync DB has no `label` column keyed by address.
  **Cost, stated:** you cannot rename anything, ever. You can only publish a new naming.

### Keyboard and focus

- **W-K1 — The prompt owns focus and every command returns it there.** The transcript is
  navigable without stealing it. *Falsifiable:* there is no state in which typing a
  character does nothing.
- **W-K2 — No modals.** Confirmations are inline rows the next command answers. Not
  taste: a modal cannot be part of the word.
- **W-K3 — Every gesture's key is shown where the gesture lives**, not only in a cheat
  sheet. *Falsifiable:* no shortcut requires a help screen to discover.
- **W-K4 — Focus is visible at ≥3:1 against both adjacent surfaces in both themes, and
  the ring is never the only indicator** — the focused row also carries a non-colour
  marker. This is the sketch's anti-colour-only argument applied where it is usually
  forgotten.

### Undo in an append-only store

There is no undo. Three affordances replace it, and calling any of them "undo" is
forbidden.

- **W-U1 — Dry mode.** The program runs against a copy of the word and shows the delta it
  *would* produce, admitting nothing. Sound because `step` is a pure function of the word
  and `run` is fuel-bounded. This is the real undo: not undoing, but not doing.
  *Falsifiable:* dry rendering is identical to committed rendering except in the verdict
  gutter.
- **W-U2 — Retraction is a view operation and is itself visible.** You can drop a binding
  from your session's view; you cannot remove it from the store, and the verb must not
  say "delete." A retracted row leaves a stub. *Falsifiable:* a session with retractions
  and one without are distinguishable on screen.
- **W-U3 — Fork by prefix.** A session's word is a value; `run` takes a word and returns a
  word. "Go back to #0044 and try differently" is: take the word's prefix through #0044
  and run a different program over it. This is the resumable partial the USING pre-read
  was asking for. *Falsifiable:* forking at k yields a word whose first k bindings compare
  equal, and the fork appears as a branch in the session list.

  **Obligation (C5, PENDING):** "every prefix of an admitted word is admitted" is not a
  named lemma. It follows from `Word.wfFrom_append` —
  `wf (x ++ y) = wf x && wfFrom x y`, so `wf (x ++ y) = true → wf x = true` — by one
  `Bool.and` elimination. **It should be named on the Lean side before fork ships**, because
  fork is the product's whole undo story and it currently rests on an unnamed corollary.

### Empty, loading, error

- **W-E1 — Empty is not blank.** The empty state contains an executable, editable program
  — the one that ends emptiness — typed into the prompt and not submitted.
- **W-E2 — Loading has named states, not a spinner.** The honest subset of foldkit's
  `AsyncData` here is `Idle` / `Loading` / `Refreshing` / `Stale`. `Stale` is the one that
  matters: a content-addressed read that fails leaves previously *verified* bytes valid.
  *Falsifiable:* a failed refresh never blanks previously verified content — it marks it
  stale and names the clause.
- **W-E3 — The error renderer is exhaustive over a closed family, and a `default:` case is
  a defect.** The clauses are `notWellFormed`, `dangling(missing)`,
  `wrongKind(ref, expected, actual)`, `collision(addr)`, `noObject(addr)`,
  `failed(reason)`, plus the transport classes from PROFILE §1/§8. `Cas.matchError` already
  exists in `bin/cli/render.ts`; the workbench builds on it rather than on a switch.
  *Falsifiable:* **adding a clause to the model breaks the front end's typecheck.**
  → **Lane A**: this is a build-gate wiring requirement, not just a coding style.
- **W-E4 — `failed(reason)` is the only free-text error and renders as quoted foreign
  text**, visually distinct from clause names. It is the one channel where an unstructured
  string enters, and the sketch's critique of HILBERT applies to us the moment we render
  it like a first-class label.

### Copy and export

- **W-C1 — Three copy targets, all values the system already has:** the address (64 hex),
  the canonical node document (what `--json` emits — the exact bytes the address is
  computed over), and the word (the serialized admission history, which *is* a conformance
  vector). *Falsifiable:* an exported word re-runs to an identical word, checked by the
  existing equality gate.
- **W-C2 — No screenshot-shaped export.** Renderings are derived (P4). If someone needs a
  picture it is generated from the word by the same renderer.

### Accessibility

- **W-X1 — Greyscale legibility.** *Falsifiable:* greyscale a screenshot; every verdict
  remains distinguishable. At level 1 each verdict carries a word, not only a mark —
  one-character shapes are as hard as colours.
- **W-X2 — One reading order, and it is admission order.** Screen readers get what the eye
  gets because there is only one order. (The admission-order-as-reading-order argument is
  **argued, not proved** — the sketch marks it so, and this note inherits that mark.)
- **W-X3 — The mono/serif register split is not the only carrier of machine-checked vs
  informal.** Typography fails at low vision and in narrow columns. Level 2 carries a text
  label. *Falsifiable:* force one font family; the distinction survives.
- **W-X4 — Address chips have a usable accessible name.** 64 hex read aloud is useless.
  The name is kind + position + grouped short form; the full address is available by copy.
  *Falsifiable:* the accessible name is under twelve spoken words.

### Session, persistence, windows

- **W-P1 — A session is a persisted object: name, word, cursor, forks.** Kill the process
  mid-run, reopen: the transcript is identical through the last admitted binding, and a
  suspended program shows as `running`, not lost.
- **W-P2 — Resumption is not replay.** The bindings are already in the store; reopening
  loads them. *Falsifiable:* reopening a session issues zero writes.
- **W-W1 — One window, many sessions, one open store.** Grow-only makes a second window
  safe by construction, so a second window is *possible and unsupported*, not prevented.
  *Falsifiable:* the app takes no exclusive lock.

### Does the user edit content?

**No.** Content is immutable; editing is `put`ting a new node. But the authoring surface
is text before admission.

- **W-M1 — Exactly one mutable surface exists: the composer, holding unadmitted text.**
  Everything above the frontier is immutable and rendered as such — not disabled inputs,
  *not inputs at all*. *Falsifiable:* no `<input>` or `contenteditable` in the transcript
  region.
- **W-M2 — A draft has no address and the product says so.** *Falsifiable:* the word
  "draft" is never used for anything that has an address.

---

## 8. Decisions made (with the alternative rejected)

| # | Decision | Rejected | Why |
|---|---|---|---|
| D1 | The terminal is the word with an input line; scrollback and history are one object | terminal-as-output-pane; command bar; shell | every other option requires maintaining a correspondence the data structure already gives free |
| D2 | The terminal is **authoritative**: exactly one Message family extends the word, and every affordance produces it | terminal as an "advanced" panel beside buttons | two writers drift; you end up with UI actions that have no program text, which kills W-L1 |
| D3 | Two row species — bindings and events — visually and structurally distinct | one unified log (the sketch) | `refused`, `abandoned`, `open` cannot be bindings; merging them makes the "word" pane not a word |
| D4 | Two resolution levels, boundary = VOCABULARY.md's register split | designer-chosen collapse rules; a zoom slider | the split already exists, is consumer-gated, and is falsifiable |
| D5 | Local-first: the workbench owns a store; the network is a push/pull target | server-first thin client over `cas-http/0` | the direction law's verification happens above the seam on load, and a thin client has nowhere to put it; terminal latency becomes network latency; PROFILE §5 forbids persisting capabilities, so every session start becomes a round trip. Evidence: the file backend is "the directory IS the store", `PathReader` makes any static host a read plane, `push(root)` composes over a *local* closure, and the client ordering gate is the law with server verification optional |
| D6 | Sessions are first-class persisted objects; **publishing a session is an explicit act that mints it as content** | sessions as ephemeral UI state; sessions always stored as content | ephemeral kills fork/resume/frontier; always-content fills a grow-only store with keystroke garbage |
| D7 | No undo. Dry mode + visible retraction + prefix-fork | a synthetic undo stack | there is no un-`put`; a fake undo is a lie about the substrate |
| D8 | Names come from content only; no workbench-local labels | a label table keyed by address | hoover never mints identity |
| D9 | v0 minimum ships **without `infer`** | shipping `infer` early because the product is "AI authorship" | `infer` without a meter is unshippable under the product's own thesis. **The meter gates `infer`, not the calendar.** |

---

## 9. Decisions OWED — ranked by cost of deferral

**OWED-1 · Are words persisted? Does anything preserve admission order on disk?**
*The one nobody listed, and I rank it first.* The word is the semantics carrier — the
order IS semantics, it is the conformance gate, and it is what "the CAS is the user's
history" means. But the file backend's layout is `objects/<2 hex>/<62 hex>`: **a
directory has no order.** A store's admission history is recoverable only from words
that were kept somewhere. If nobody decides this, the workbench's central invariant
rests on a side table that the store does not know about, and P4 is violated the day
someone rebuilds from the store alone and gets a different screen.
*Breaks if deferred:* the sync DB schema, W-H3's rebuild test, W-C1's export claim, and
the honest answer to "is this history, or is it my app's log?"
**→ Lane C for the schema; a finding for the Lean/model side about whether order has a
resident carrier at all.**

**OWED-2 · Is every address in the Model `(store, address)` or a bare `ContentId`?**
An address without a store is not resolvable — PROFILE §11: there is no global
does-this-digest-exist query, presence is scoped by authority. If the Model assumes one
store, adding a second later touches every address-bearing type, every Message, every
route, and every persisted row. If it carries the pair from line one, single-store is the
degenerate case and costs one field.
*Recommendation:* **type multi-store, ship single-store** — one open store, a switcher,
no cross-store views at v0.
*Breaks if deferred:* cross-store comparison — "is this the same content as theirs?",
the single most valuable thing a CAS front end can do — becomes a rewrite instead of a
feature. **→ Lane C.**

**OWED-3 · What is the sync surface, and what actually depends on the engine?**
Stated as an assumption above. **Nothing structural depends on it** — local-first (D5)
survives any local engine. What *does* depend on it: whether sync is a background
subscription or an explicit push verb, and whether two devices can hold the same session.
Naming it this way is the point: if the Turso/libSQL guess is wrong, only the sync
mechanism moves, not the architecture. **→ Lane C.**

**OWED-4 · What exactly can be typed at the prompt?**
Straight-line-only (`cas_run` as it stands) / stored programs addressed by F3 code point
(`PLine`/`PProg`, tags 14/15, registry rows owed) / a new surface grammar.
*Breaks if deferred:* it will be decided by default in favour of straight-line, because
that manifest exists — and then `agentStep` is inexpressible in its own workbench without
anyone having chosen that.
*Recommendation:* v0 ships straight-line and **labels the prompt with its mode**, so the
limit is on the screen rather than in a footnote. **→ Lane C.**

**OWED-5 · Does `infer` run from the workbench, and how is it gated?**
Higher stakes than it looks. If `infer` is freely available, every program is
`Prog AgentSig` unless proved otherwise, so the whole product is `owed`-coloured and the
one saturated hue loses its signal entirely.
*Recommendation:* available only from an explicitly entered composer mode, and **entering
it changes the composer's own type badge from `Prog CasSig` to `Prog AgentSig` before you
type anything** — the colour is the type, so the composer must be coloured by its type
too, not just the results.
*Breaks if deferred:* credential handling, and shipping an unmetered LLM inside a product
whose thesis is provenance. **→ Lane C + operator.**

**OWED-6 · Is there a workspace above the store?**
*Recommendation: no, and say so now.* The store directory already is the project —
`locateStore` is flag → `CAS_STORE` → search parents for `.cas`, which is git's model
exactly. Deferring invites someone to invent a `workspace.json` duplicating `.cas/config`.
*Cost if wrong:* a person working across two stores opens two sessions. Acceptable at v0.
**Coupled to OWED-2** — cheap to defer if the pair-typing lands, expensive if it does not,
so decide them together. **→ Lane C.**

**OWED-7 · Where does the front end live in the grade tree?**
`.staging/` → `experiments/` | `formal/`; `library/` is distributables. A workbench is
neither a distributable nor a formal artifact, and the merkle §6 precedent already put its
demo under `experiments/` pending an S2 grill.
*My lane's stake, whatever the answer:* the workbench must run under `mise run check` with
its own gates, because a UI with no gate has no claim. **→ Lane A.**

**OWED-8 · Does the verdict vocabulary get ruled before the renderer is written?**
See §6.2. One gutter cannot carry three orthogonal axes, and three of the six proposed
values have no binding to attach to. Somebody must rule this or the first renderer will
guess. **→ whoever owns the vocabulary; the workbench cannot resolve it unilaterally.**

**OWED-9 · Does the meter land before or after the cost column exists?**
`handleLlm` eliminates the `infer` node, so a completed run carries no trace that
inference occurred; the recording in `AgentStep.lean` is a convention of the example, not
a law of the machinery. Under P4 the cost column reads `—` until this changes.
*Breaks if deferred:* the cost rail (the sketch's best density idea) stays undrawable, and
D9's gate on `infer` stays closed. **→ model side.**

---

## 10. The minimum — the smallest genuinely professional thing

One window, one open store, one session:

- transcript of two row species at everyday-register resolution, fixed row height, no
  reflow, find/filter present;
- frontier marker, roots count;
- a prompt that submits straight-line programs, labels its mode, and shows the program
  text of every UI affordance before it runs;
- dry mode;
- detail pane with the four slots, exhaustive over the closed refusal family via
  `Cas.matchError`, with a real rendering for "cannot show";
- address chips: three behaviours, full-hex copy, accessible name, word-scoped prefix
  input;
- word export that re-runs to an identical word;
- session persistence with prefix-fork and zero-write resumption;
- keyboard-complete, focus-disciplined, modal-free, greyscale-legible.

**Not in the minimum, deliberately:** `infer`, the cost rail, multi-store views, journals
UI, any graph.

---

## 11. What I would refuse

**A graph view of the DAG.** It is the single most predictable ask for a content-addressed
store and it is wrong three ways:

1. **It destroys the thing that is semantics.** The word is a list; the order is the
   meaning; `wf`, the conformance gate, and the reading-order argument are all statements
   about a list. A graph drawing replaces a proved carrier with an unproved picture.
2. **It cannot satisfy W-T4.** The store is grow-only, so a force layout re-flows on every
   `put`. Rows that move are rows you cannot trust to still be the ones you were reading.
3. **It does not scale past a toy.** The closure of anything real is thousands of nodes,
   and the interesting relations are local anyway.

What people actually want from a graph is *"what does this rest on, and what rests on it"*
— which is exactly slots (c) and (d) of W-S1, rendered as lists in admission order.
Ordered, addressable, exportable, and it does not move.

---

## 12. Handoffs, named

- **→ Lane A (SETUP):** W-E3 is a build gate — the front end's typecheck must fail when
  the model grows an error clause. W-P2 (zero writes on reopen) needs a test seam. OWED-7
  is yours; my only constraint is that the workbench runs under `mise run check` with its
  own gates.
- **→ Lane C (CONTRACT):** OWED-1 (word persistence / resident order), OWED-2
  (`(store, address)` in every address-bearing type — decide before the first Model line),
  OWED-3 (sync surface), OWED-4 (the prompt's program language), OWED-5 (`infer` gating),
  OWED-6 (workspace). Also W-H3: the head index must be a cache, which constrains your
  schema.
- **→ model / Lean side:** name the prefix-admission lemma (W-U3, C5 PENDING); the meter
  (OWED-9); the prompt's address; and §6.2 — `open` and `abandoned` have no carrier in the
  word, so either they are not verdicts on bindings or something must carry them.
