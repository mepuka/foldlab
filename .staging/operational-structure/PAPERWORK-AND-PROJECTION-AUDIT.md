# RULING-PREP AUDIT — three questions, 2026-08-29 night

Ground read: `docs/SPECS.md` in full (260 lines, decisions 1–21 + addendum), `library/cas/REGISTRY.md`, `Cas/Grammar/Sorts.lean`, `Cas/Schema/{System,Exchange,Annotation,Projection}.lean`, `Cas/Lang/Roots.lean`, `Cas/Lang/Defun.lean` (encodeProg region), `Cas/Backend/{Mcp,EmitLayer,Ts}.lean`, `tools/EmitPrograms.lean`, `library/effects/{bin/cas.ts,bin/cli/commands.ts,bin/mcp/*,src/cas/{Backend,SqlRootStore,Store,Node}.ts,VOCABULARY.md}`, generated `VectorPrograms.ts` + `VectorProgramLifts.json`, `EFFECTS-BACKEND.md` R5–R8, `SCHEMA-MATERIALIZATION.md` queue items 22–26, `.staging/operational-structure/{EFFECT-AST-PLACEMENT,BUILD-MODELING-AUDIT,REIFICATION-SUBSTRATE}.md`, `.staging/product-sphere/VISION.md`. I did not open the front-end lane's component design; nothing below designs a component.

---

## ANSWER 1 — SHOULD FRONT-END PROJECTION BE A NODE TYPE

### Verdict: SPLIT. Two different things are being called "projection." One seat is taken. The other seat is taken *and the chair is too small* — and fixing it is the same ruling as the CodeRef/catalog gap.

**(A) kind → component ("which component renders a `SystemNode`") — SEAT TAKEN. Do not mint.**

This is the materializer discipline, and decision 21's addendum already says so in the estate's own words (`docs/SPECS.md:254-260`: "a described kind's canonical code determines its component the way it already determines its wire mirror, admission row, and prose"). The landed precedent is exact: `Cas/Backend/Mcp.lean:297-330` declares five tools whose params and results *are* `Ast` codes, `lake exe emitmcp` projects them to `library/cas/mcp/cas-tools.json`, and the bytes are gated in `check:cas`. Decision 18 (`docs/SPECS.md:210-218`) rules the tool register *is a signature*. A component register is the same object one plane over: an emitted, versioned, byte-gated manifest — **not a node kind**. A per-kind component mapping stored as content would be a second, unproved copy of what the emitter already derives.

There is a sharper point here the front-end lane should be handed rather than left to discover: **R6 already ratified the rendering parameter as content and it was never built.** `EFFECTS-BACKEND.md:96-105` — "L3 rendering under the ratified Substance/Denotation/Style split with `Style` as digested content from the first slice." What exists is `Cas/Backend/Ts.lean:21-26`: `structure Style` with `def house0 : Style := {}`, a plain Lean record, no `cas_struct`, no address, no put. The front end's theme/style seat is *already ruled as content* and is undischarged. That is the cheapest genuine content object the front-end lane can take, and it needs no new ruling — only the discharge of an old one.

**(B) value ↔ view instance ("this published program is shown under that component at that revision") — seat is Annotation's, and Annotation as built cannot hold it.**

This is the half that becomes out-of-band config if not addressed, and the falsifiability duty lands here. I checked whether the Annotation/Exchange subject machinery already covers it. It does not, for two structural reasons, both citable:

1. **`Annotation.subject` is monomorphic.** `Cas/Schema/Annotation.lean:45` — `subject : StoreRef schemaKindTag`. It can address a schema node (`0x53`) and nothing else. A projection of a *program* (`0x0F`), a *topology* (`0x54`), an *exchange* (`0x58`), or a *git object* (`0x47`) is literally unspellable. And the constraint is real, not decorative: `library/effects/test/SchemaAnnotation.test.ts:121` asserts "an annotation whose subject is not a schema node is refused at admission." `ExchangeSubject` (`Exchange.lean:77-79`) has the same reach problem — arms are `exchange | schema` only.
2. **`Annotation.value : String` degrades the component link to text.** The module's own docstring says it (`Annotation.lean:24-26`): "A content address in hex when the value is itself store content." A component address carried as a hex string is *exactly* the out-of-band config the operator wants eliminated — it is not a typed edge, it does not appear in `refCount`, `Graph.verify` does not walk it, and `WrongKindReference` can never fire on it.

So: the seat is taken, the occupant is the right one, and it is two fields short.

### The convergence — this is the same ruling as the catalog gap (G6-a finding 1)

`EFFECT-AST-PLACEMENT.md:121` promised the topology would carry "constructor references (**catalog addresses** → emitted as named imports)." What landed is `Cas/Schema/System.lean:154-156`:

```lean
cas_struct CodeRef where
  name : String
  path : String
```

A module-specifier string and an export name. `EmitLayer.lean:209-239` consumes `c.path` directly as an import path. **The topology's edge to written code is not an address** — it is out-of-band by precisely the same mechanism as (B)'s hex string. One defect, two sites.

But "there is no catalog kind" is only half true, and the adversarial correction matters for scoping: **written code already has a content seat.** `file` (`0x0B`) over `manifest` (`0x0A`) over `chunk` (`0x08`) puts a named file with a media type (`REGISTRY.md:31, :116-130`); `git` (`0x47`) puts a source object with dual identity (`REGISTRY.md:36`). What has no seat is the *named export within a module* — `AddressScheme.layerSha256`. That is one struct, `(file : StoreRef fileTag, export : String)`, not a new plane.

### Mechanics

- Minting a working tag costs nothing at the door. `library/effects/src/cas/Store.ts:111-114` — `ensureKnownKind` checks the **version byte only**; any tag at scheme 0 admits. That is why `0x54` and `0x58` work today (`System.lean:127-135`, `Exchange.lean:51-59`) and why the annotation suite picks a tag ad hoc (`SchemaAnnotation.test.ts:18-19, :35`). The registry row is the *only* thing that would refuse a collision, and there is no registry of working tags anywhere.
- Growth cost, from the estate's own audit: `BUILD-MODELING-AUDIT.md:124` §D.2 — union growth is arm-additive and **does not move stored node addresses**; it *does* move the **schema code's** address, because arms are canonically alphabetical and decision 4 rules order is identity. "A documented versioning event, not an address-moving event for content."
- Promoting `CodeRef` from strings to an addressed pair **does** move every stored `SystemNode` address (payload change). Today that is two authored topologies in `tools/EmitLayers.lean:84-152`. It will never be cheaper.
- Nothing in the ratified growth order reserves a projection kind: `REIFICATION-SUBSTRATE.md:82-89` runs G0–G8 and ends at the exchange context arm and `Tree.context`. A projection kind is new growth and needs a ruling; growing Annotation is *inside* the ratified pattern.

### Ruling asks

1. **Rule the split.** (A) kind→component is an emitted gated manifest on the `cas-tools.json` precedent — no node kind, and the front-end lane should be told so before it designs a stored component registry. (B) value↔view is content.
2. **Rule Annotation grows, rather than a `Projection` kind mints.** Two growths on the ratified Exchange pattern: `subject : AnnotationSubject` (a `cas_union` with one arm per addressable plane), and the value's store-content case becomes a **typed reference**, not hex text. Cost: one union, one versioning event on the schema code. Falsifiable alternative if you disagree: mint `0x55` as a working tag — but then say why an annotation with a widened subject is not the same node.
3. **Rule the catalog in the same breath.** `CodeRef` becomes `(file : StoreRef 0x0B, export : String)`. This discharges the front-end's component link *and* G6-a's written-code gap with one struct. Name the migration cost explicitly (two stored topologies).
4. **Rule R6's `Style`-as-digested-content clause** discharged with a date, or the front-end lane will re-mint a theme system out-of-band and it will be correct to do so.
5. **Rule the working-tag register.** Three unregistered tags exist and the door checks none of them. Either a generated WORKING-TAGS section in `REGISTRY.md`, or mint rows now.

---

## ANSWER 2 — WHERE PUBLISHED PROGRAMS GO

### Verdict: nowhere, and a PROGRAMS root convention is not merely absent — it is unspellable. Do not build one; the kind filter is the registry.

**A root is an address and nothing else.** Verified at every layer:
- `library/effects/src/cas/Backend.ts:85-92` — `RootStoreShape` is `publish: (root: ContentId) => void` and `list: ContentId[]`. No name, no label, no kind.
- SQL: `cas_roots(address TEXT PRIMARY KEY)`, "the address is the key, so the row's presence IS the publication and there is nothing else in the row to disagree with it" (`SqlRootStore.ts:20-23, :59`).
- File: `roots/<64 hex>`, "an empty file whose presence is the publication" (`Backend.ts:106-108`).
- Lean: `RootSig` is `publish | listRoots`, state is `Word × List Addr32`, grow-only (`Cas/Lang/Roots.lean:29-42, :61`).
- `VOCABULARY.md:83-86`: "the everyday word 'roots' means published entry points, and only that."

The only discipline attached is fail-closed publication — `commands.ts:332-347` loads before publishing, `handlers.ts:160-174` the same on the MCP side, and `Roots.lean:111-119` `publish_mem` states it as a theorem. So a named PROGRAMS root would require either a second out-of-band name→address map (the config failure mode again) or a published directory node. **Neither is needed**, and that is the answer:

**`cas ls` already loads every root and prints its kind** (`commands.ts:203-220`). "Which roots are programs" is `filter tag == 0x0F`. A typed kind plus a listing verb *is* the registry; a named root would be a second, unproved index over the same fact.

### What exists today — three spellings, none of them a store-resident program

1. **The theorem spelling.** `Cas.Lang.encodeProg` (`Cas/Lang/Defun.lean:829`) lays a `PProg` into a `Word` as `step` (`0x0E`) + `cont` (`0x0F`) nodes; `decodeProg_encodeProg` is the landing that earned rows 14/15 (`REGISTRY.md:34-35`). This is the **only** spelling in which a program is content.
2. **The generated-host spelling.** `tools/EmitPrograms.lean:35-42` + `schemaRow` registers **7** programs, emitted to `library/effects/test/generated/VectorPrograms.ts` as TypeScript functions, byte-gated. These are *code*, not content. (The prose half is right: descriptions are computed from the term via `ProgProse`, "there is no doc column" — `EmitPrograms.lean:31-34`.)
3. **The wire spelling.** `VectorProgramLifts.json` — 7 documents keyed by `"name"`, no address field anywhere. And MCP `cas_run` takes `RunParams = { instructions: List RunInstruction }` (`Mcp.lean:60-75`, `bin/mcp/tools.ts:153`) — a program is **submitted inline, never loaded by address**.

**The load-bearing finding:** a grep of `library/effects/src` for `encodeProg`, `contTag`, `0x0f`, `stepTag` returns **nothing**. The host has no step/cont codec. Therefore: no program has ever been put; no program has an address; nothing can be published as a program; `cas_run` cannot be handed one. **R7 — "programs are content, hosts are code" (`EFFECTS-BACKEND.md:111-119`) is today a Lean theorem with no host and no consumer.** Queue item 23's finding — three spellings, and the emitter never builds a `PProg` (`SCHEMA-MATERIALIZATION.md:488-492`) — is the same fact seen from the emitter side.

A second, cheaper R7 breach in the same artifact: R7 requires that "any static projection generated for ergonomics is **stamped with the address of the term it projects**, so parity is a digest check." `VectorPrograms.ts` and `VectorProgramLifts.json` carry names and no addresses. The estate's flagship generated-program artifact does not satisfy the estate's flagship program ruling.

### What publishing a program SHOULD mean

Taken literally from R7: **a published program is a `cont` node at an address, published as a root.** Everything the operator listed as a candidate catalog entry is then either derived or already a store object:

- **envelope + prose** — derived. `ProgProse` computes the description from the term; storing it would be a copy that can drift.
- **the word** — already a store object. R5 makes the run's history the conformance gate (`EFFECTS-BACKEND.md:83-95`); that is the one thing worth storing *beside* the program.
- **a human-facing name** — the annotation seat from question 1. `key = "foldlab/name"`, `subject =` the program's address. **This is the second place tonight's two questions converge on one ruling**: the name is unspellable today for exactly the reason a view link is — `Annotation.subject` is pinned at `0x53`.

### Does ruling 23 gate it?

Partly, and it is the cheaper half. The precise ordering:

- **Queue item 22** (`SCHEMA-MATERIALIZATION.md:482-487`, `cas_run`'s manifest scope) is the gate that actually matters. `RunParams` serves the puts-with-answer-indices sub-fragment; the full `PProg` carries **literal-address operands and `load`**. Until that grows, the run tool cannot *name* an address operand, so "run the program at this address" is outside the manifest. Publishing a program is worth nothing until `cas_run` can be handed one.
- **Queue item 23** (route `EmitProg` through `PProg`) collapses spellings 2 and 3 onto one carrier and turns the surviving prose claim into a theorem. Necessary for coherence; not by itself sufficient to make a program resident.

So: **22 before 23 before publication, or 22 and 23 as one slice.**

### Owed

- O1. A host-side step/cont codec — the TS mirror of `Defun.lean:829`. Nothing on the host speaks tags 14/15.
- O2. Item 22: grow `RunParams` to literal-address operands + `load`.
- O3. Item 23: route `EmitProg` through `PProg`.
- O4. R7's stamp clause on the generated programs (~20 lines in `EmitPrograms.lean`).
- O5. A `cas run <address>` verb. There is none — subcommands are `init, status, put, publish, ls, show, verify, serve` (`bin/cas.ts:40`).

### Ruling asks

1. **Rule that a published program is a published `cont`-node root, and that there is NO named PROGRAMS root** — the kind filter over `cas ls` is the registry.
2. **Rule the ordering 22 → 23 → publication**, or rule 22+23 as a single slice.
3. **Rule O4 the first slice.** Emitting each program's `cont` address into the generated module header discharges an R7 clause, is cheap, and is the forcing function that makes `encodeProg` run outside a theorem for the first time — which is what surfaces O1's absence as a red gate rather than a memo.
4. **Rule that `Cas.Vectors.Registry` stays the generator's input, not the store's index.** Recommendation: keep it Lean-side. Conflating a build-time list with the runtime plane would put a compile-time artifact inside the store's own naming.
5. **Rule the name seat** — `foldlab/name` annotation on a program's address (converges with Q1 ask 2), or explicitly nothing.

---

## ANSWER 3 — ESTATE PAPERWORK

### Verdict: the ledger law is being followed for *rulings* and broken for *specs*. Links are clean; the decision record is intact; the tracking rule has a hole that the gitignore itself cuts; and there is no session record for the highest-output night in the estate's history.

What is working, stated first because it is real: **all 273 lines of `docs/SPECS.md` resolve** — every relative link target exists on disk, including the six directory-style Category 3 rows. Decision numbering 1–21 is contiguous, and the two same-day supersessions (7's premise refutation at `:115-124`, 9's supersession at `:128`) are marked in place rather than rewritten, which is the maintenance law working exactly as written. **Zero untracked files** exist outside `corpus/` and `node_modules`.

### DEFECT LIST (fixes named; I wrote nothing)

**D1 — SECURITY, act first.** `/Users/pooks/Dev/foldlab/turso_tok.md` (394 bytes, present since 2026-08-29 04:49) contains a `libsql://` endpoint and **two JWT-shaped tokens** in plaintext. Verified never committed (ignored, absent from `git ls-files`). `.gitignore:30-32` already states the correct assessment — "Ignoring is CONTAINMENT, NOT SECURITY … rotate anything that has sat here." *Fix: rotate the Turso token, delete the file, keep the rule.*

**D2 — RULED LAW DEFEATED BY THE GITIGNORE.** `SPECS.md:8-10` and `.staging/README.md:7-10` rule that every `.staging` `.md` to depth 3 is tracked. `.gitignore:4-5` is `.staging/*` with only `!.staging/README.md` negated — the depth-2/3 rescues (`!.staging/*/*.md`, `!.staging/*/*/*.md`) never reach depth 1. Verified: `git check-ignore -v .staging/HANDOFF-2026-08-25.md` → `.gitignore:4`. **The estate's only handoff artifact is ignored.** *Fix: add `!.staging/*.md` after line 4; `git add .staging/HANDOFF-2026-08-25.md`; give it a Category 3 row.*

**D3 — LEDGER COVERAGE.** 67 of 135 spec-shaped tracked `.md` files carry no SPECS row. Not all are specs, but these unambiguously are, and **all were touched 08-28 or 08-29** — i.e. the "row in the same change" law was not applied while the estate was firing hardest:
`library/effects/VOCABULARY.md` (the ratified CLI/API word law, cited by the CLI's own register), `library/cas/REGISTRY.md` (a generated, byte-gated Category 1 artifact), `library/cas/UNION-DESIGN.md`, `library/effects/PROFILE-CAS-HTTP-0.md` (the profile `REGISTRY.md:7` cites), `library/effects/BACKEND.md`, and **8 of the 9** `experiments/lift-harness/docs/*.md` — only `differential-testing-spec.md` is rowed (`SPECS.md:36`). The whole `docs/entity-store/` and `docs/research/` subtrees are unledgered (43 files); those are prior-era and want one Category 3 *set* row each, not 43 rows.

**D4 — AGENTS.md POINTERS.** 11 of 34 Category 1+2 specs have no pointer from any AGENTS.md, including one **ratified-law** row: `docs/effect-typescript-semantics/IMPLEMENTATION-PLAN.md` (`SPECS.md:31`) — likely confused with the differently-located `library/effects/IMPLEMENTATION-PLAN.md`, which *is* pointed at (`AGENTS.md:123`). The entire `.staging/schema-materialization/` cluster (5 specs, `SPECS.md:46-50`) is unpointed; its natural home is `library/cas/AGENTS.md`, which already points at `SCHEMA-MATERIALIZATION.md` but not at the design records behind it. Also unpointed: `D1-OPTION-A-SCOPING.md`, `EFFECT-AST-PLACEMENT.md`, `BUILD-SEMANTICS.md`, `BUILD-MODELING-AUDIT.md` — the four documents tonight's rulings 14/19 were made *from*. `library/effects/src/AGENTS.md` references zero specs.

**D5 — STALE CITATION.** `AGENTS.md:26` cites EFFECTS-BACKEND as carrying "(R1–R14)". R15 is ratified and load-bearing — `Exchange.lean:12` is built on it, `SPECS.md:22` says R1–R15.

**D6 — NO WORKING-TAG REGISTER.** `REGISTRY.md` is correct (it is the byte-gated projection of `manifestV0` and rightly carries no unratified row). But **nothing anywhere lists the working tags**: `0x54` (`System.lean:148`), `0x58` (`Exchange.lean:72`), and whatever the annotation suite picks ad hoc (`SchemaAnnotation.test.ts:18-19`). Combined with `Store.ts:111-114` admitting any tag at scheme 0, **two lanes can collide on a working tag with no gate anywhere going red.** *Fix: a generated WORKING-TAGS section in `REGISTRY.md`, or mint rows (Q1 ask 5).*

**D7 — R6 CLAUSE UNDISCHARGED.** `Style` as digested content (`EFFECTS-BACKEND.md:96-105`) vs. `Ts.lean:21-26`. Detailed under Q1; listed here because it is a ratified-law drift, which `AGENTS.md:26`'s own words call "a defect."

**D8 — R7 CLAUSE UNDISCHARGED.** Address stamping on generated program projections. Detailed under Q2.

**D9 — ROOT STRAYS.** `2606.26442v1.pdf` (325 KB, at root since 2026-08-19; `.gitignore:26-29`'s `/*.pdf` rule was added *because* it slipped the net — the comment says so). And `untitled folder`, created 2026-08-29 04:47, empty, invisible to `git status` only because git does not track empty directories, anticipated by no rule. *Fix: delete both; if the paper is wanted, its identifiers and digest belong in `.reference/catalog/REFERENCES.md` per the stated policy.*

**D10 — EMPTY STAGING DIRS.** `.staging/machine/` is empty; `.staging/e2/` holds only an ignored cache. Neither has a README or a row.

**D11 — NO SESSION RECORD.** Tonight produced 8 commits, decisions 19/20/21 + addendum, two audits saved verbatim, and multiple lanes dispatched — and no record of the session as a session. The precedent existed and was abandoned after 2026-08-25: `docs/entity-store/dispatch/2026-08-25-worktree-{1..5}-*.md`, `docs/entity-store/audit/2026-08-25-*.md`, `.staging/scouts/2026-08-25-{mapping,wave2,wave3-design}/`, `.staging/reviews/2026-08-25-wave2-assurance-review.md`. Nothing carried into the 08-28/08-29 era. Dispatch briefs and agent reports currently live **only in task output files** outside the repo — they are not estate content by any reading of the ledger law, and press 6 (`VISION.md:45-46`) rules the opposite: "Tasks, dispatches, rulings are stored content on the same plane."

*Observation, not a defect:* five files are modified-uncommitted at session end (`mise.toml`, and four under `experiments/lift-harness/` including two rowed specs). If a lane is live that is fine; if not, the "row in the same change" law cannot hold over unstaged spec edits.

### PROPOSED MINIMAL SESSIONS CONVENTION

Rides what exists. No new machinery, no new gitignore rule, no new tooling.

**Where:** `.staging/sessions/YYYY-MM-DD-<slug>.md`, one file per operator session. Depth 2 — already tracked by `.gitignore:6-7`'s existing `!.staging/*/*.md` rescue. Nothing to change (unlike D2's depth-1 hole).

**What it is: an index, never a narrative.** Four sections, all pointers:
1. **Rulings made** — decision numbers only, pointing into `SPECS.md`. Never restate a ruling; the ledger owns the text.
2. **Lanes dispatched** — brief name → commit or branch → landed/open. The dispatch brief's *content* stays in the lane's spec; this records that it happened and where it went.
3. **Specs landed / rowed** — the maintenance-law receipt for the session, which makes D3-class drift visible the next morning instead of at the next audit.
4. **Debts opened** — re-rulings owed, premises refuted, clauses left undischarged (tonight: the D1 re-ruling, R6's Style clause, R7's stamp clause).

**Ledger placement:** one Category 3 *set* row for `.staging/sessions/`, on the model of the existing `.staging/scouts/` and `.staging/reviews/` rows (`SPECS.md:69`). One row, not one per session.

**The store form, named and not built:** press 6's eventual home for a session is an `Exchange` chain (`0x58`) — `subject` following the previous exchange is already a DAG walk (`Exchange.lean:36-40`), rooted at a published root. The kind is landed and has an end-to-end host consumer (`SchemaAnnotation`/`SchemaExchange` suites). The migration from the `.md` to content is then `put` + `publish` — no new kind, no new verb. The dated `.md` is the pre-content form, and it should be written that way (short, structured, pointer-shaped) precisely so the migration is mechanical.

**Retroactive first entry:** tonight. It is the session with the most rulings and the least paperwork, which is the argument for the convention rather than an exception to it.

---

## THE ONE THING WORTH SAYING TWICE

Questions 1 and 2 converge on a single ruling. A view's link to the value it projects, a program's human-facing name, and a topology's link to the written code that builds it are **the same defect at three sites**: a store-content identity carried as a string (`Annotation.value` hex text, `CodeRef.path`/`name`) or not carryable at all (`Annotation.subject` pinned at `0x53`). Fixing it is one union widening plus one struct promotion, both inside the ratified arm-additive growth pattern, both costing a documented schema-code versioning event and nothing else. Minting a `Projection` kind, a catalog plane, or a named PROGRAMS root would each solve one third of it while adding a plane — which decision 2 forbids and `BUILD-MODELING-AUDIT.md:124` §D.3 already refused once tonight in the same shape.
