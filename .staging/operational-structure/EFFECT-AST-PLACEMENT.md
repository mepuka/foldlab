# Effect program AST — placement study

**Verdict: BLOCK. The thing the operator is inclined to mint was ruled, placed, priced and sequenced four hours earlier the same day, in a document that is Category-1 ratified law.** Nothing needs designing. One half of it is buildable today because its stated blocker has landed; the other half is refuted by measurement and should not be built at all.

---

## 0. The blocking fact

`.staging/operational-structure/REIFICATION-SUBSTRATE.md:1-3` — RATIFIED 2026-08-29 "proceed apace" (`docs/SPECS.md:24`, Category 1). Its "four answers" (`:56-79`) already answer this brief, in the operator's own ruling:

> **`:68-73`** — "LAYER GENERATION: a topology is a schema-plane described kind (`cas_union SystemNode`, Exchange.lean's 85-line shape, children as StoreRefs → SYS5 acyclicity free). The emitter needs **ZERO new fragment forms** (`Ts.Expr.call` + `ConstDecl.type` + `LayerType.lower`); `lake exe materialize` is the pipeline pattern. The missing piece is B-B's bridge, not a sort. Smallest slice: bridge (~150) + System.lean (~85) + EmitLayer (~90) + tools/EmitLayers (~57) + the Context-key-set differential. **No `Ty` change.**"

> **`:63-67`** — "PROGRAM SYNTHESIS: ratify 14/15 after P4; the guarded table is FORMS on step/cont (3rd/2nd), **never a third tag** … First consumer: `agentStep` (P7)."

Growth order (`:80-89`): `G6 layer generation (~230 on top)`, gated on **G4** (the B-B bridge).

**G4 has landed.** `library/cas/Cas/Schema/Projection.lean:425` `putNode {α} [Described α] (version tag) (revision) (x) : Option Node` is exactly the El→RValue→Node bridge B-B (`:14-22`) called "THE decisive constraint"; `INGESTION-HARNESS.md:132` (M8) confirms it — "The bridge now exists." `SPECS.md:24` records G0–G4 landed.

**So: G6 is unblocked today, at ~230 lines, with no new abstraction and no registry row.** The correct answer to "should we build an Effect program AST" is *"you already ruled you should, for layers only, and the thing you were waiting on shipped."*

Two incidentals I must flag before anything else:

- **The working tree is mid-merge with unresolved conflicts.** `git status`: `UU mise.toml`, `UU library/cas/Cas/Schema/Schema.lean`, `UU library/cas/lakefile.toml`, `UU library/cas/surface/cas-surface.json`. `mise.toml:123-127` carries live `<<<<<<< HEAD` markers, so **`mise` cannot parse its config and no gate runs on this host right now.**
- **HEAD is `ab347a85`, not "past `0716e436`"** — and it *refutes* a premise of my own frame: "D1 scoping report — Option A premise refuted, re-ruling owed … Decision record item 7 flagged." Decision-record item 7 (`SPECS.md:91-99`) is stale on D1.

---

## 1. The seat check

| Seat | Existing carrier | Filled? |
|---|---|---|
| Store-resident straight-line program, proved | `PProg = List PLine` (`Cas/Lang/Defun.lean:163-170`), envelope + sandwich, `encodeProg`/`decodeProg`, sorts 14/15 ratified (`REGISTRY.md:34-35`) | **FULL.** L-A rung, `Fragments.lean:37-92` |
| Program as an interchange **document** | `cas_struct RunParams/RunInstruction/RunRef` (`Cas/Backend/Mcp.lean:60-83`), `toPProg_ofPProg` (`:247-255`), and two theorems pinning what it *cannot* say (`:167-173`) | **FULL, and already a described value on the schema plane.** This is precisely "an Effect program as a `cas_struct` document." It exists. |
| Recognizer output (hoover side) | `Lift` (`lift-harness/src/contract.ts:68-76`) — field-for-field `PLine.put` | **FULL** (decoder P1 owed, `INGESTION-HARNESS.md:179`) |
| Program → Effect **code** emission | `EmitProg.lean:29-87` (`Tree → straight line`), `Ts.lean:29-52` | **FULL** for L-A |
| Schema code → Effect code emission | `Backend/EmitAst.lean` + `tools/Materialize.lean` (two independent generators, one denotation) | **FULL** |
| Control flow beyond straight line | L-S guarded table — `Fragments.lean:94-143`. **Its ruling ask is literally "name the first consumer"**, and P7 already named one (`agentStep`); P6 already ruled it is *forms on tags 14/15, not tag 16* (amending `Fragments.lean:120-121`) | **DESIGNED, consumer named, not built.** A new AST here would be a *second spelling* of a carrier that R4 refuses. |
| Layer / service **construction topology** | Nothing. `Cas/Backend/Target.lean:43-48,108-118` types `Layer.Layer<ROut,E,RIn>` but carries no wiring. `Architecture.ts:1-15` + `Cas/Architecture.lean:1-19` carry the seams/laws/backends matrix cross-gated by a pinned string — but **no edges**: no `provide`, no `merge`, no order | **THE VACANCY.** Exactly what G6 fills. |
| Codegen SOURCE document for MCP-driven generation of *arbitrary* Effect code | Nothing — and see §2/§3, it should stay nothing | **VACANT BY DESIGN** |

Two seats people will wrongly think are vacant:

- **Recursion in a described kind is not a blocker.** `Cas/Schema/Exchange.lean:77-79` — `cas_union ExchangeSubject | exchange (address : StoreRef exchangeKindTag)` is a self-reference *by store address*. Suspend/Reference being `GROW(C6)` (`ADMISSION-MAP.md:52-53`) is irrelevant: topology recursion goes through `StoreRef`, which buys SYS5 acyclicity free (attic §1.6/§2.1).
- **`Ts.Expr` is already enough.** `Ts.lean:31,36` — `ident` is documented as "a **possibly dotted** reference", and `call` is n-ary. `Layer.provide(a, b)` and `Layer.mergeAll(x, y, z)` are expressible as-is. Only the `.pipe(Layer.provideMerge(x))` *style* the estate hand-writes (`Store.ts:358,364,374,381,388,419,425`) is not — and generated code needn't match hand style, which is why the ratified acceptance is a Context-key-set differential rather than source equality.

---

## 2. The regularity claim, measured

Two independent measurements (a subagent's stratified sample, and my own brace-matcher; where they overlap they agree within 6pp). Corpus = `corpus/` 29 repos, vendored Effect clone excluded; note `alchemy-run_alchemy` alone is 52% of all Layer sites, so stratified numbers are the honest ones.

**The noun is regular.** 10,029 `Layer.*` sites, 39 distinct members, median 7 per repo:

| | cumulative % of sites |
|---|---|
| top 1 (`Layer.effect`, 4146) | 41.3% |
| top 5 (`effect, succeed, mergeAll, provide, provideMerge`) | **92.3%** |
| top 10 | 96.4% |
| top 20 | 99.4% |

Constructors only (n=6718): `effect`+`succeed` = **92.6%**. The attic design's refused-by-absence set (`unwrap`/`unwrapEffect`/`suspend`/`catchCause`/`orElse`/`retry` — attic §1.7, §5.4) totals **53 sites = 0.53%**; `fresh` (24) is expressible in that grammar, so genuinely-inexpressible ≈ **0.5%**.

**But the 0.5% sits at the roots.** Three of 29 repos compute their *top-level* wiring from an effect: `corpus/tim-smart_lalph/src/Tracing.ts:14` (`Layer.unwrap` + `if` on a runtime log level, returning `Layer.empty`), `corpus/joelhooks_pdf-brain/src/services/EmbeddingProvider.ts:282` (ternary on config selecting a different graph), `corpus/anomalyco_opencode/packages/core/src/filesystem/search.ts:235` (`Layer.unwrap(Effect.sync(() => flag || !Fff.available() ? ripgrepLayer : fffLayer))`). 36.4% of Layer constructions are not top-level constants (test-skewed). So: a closed layer grammar covers ~96% of *sites* and loses the *entry point* of ~10% of applications — which is exactly the `{"k":"opaque"}` escape the attic already specifies (§2.1, §5.4).

**The verb is not regular.** `Effect.gen` bodies, control-flow classification:

| | estate (n=381) | corpus stratified (n=397) | my run (n=2407) |
|---|---|---|---|
| no control flow at all | 56.2% | **61.0%** | 66.7% |
| flat bind sequence (also: no nested gen, no `.pipe`, no lambda) | 25.7% | **35.3%** | 10.1% (stricter test) |
| contains `if` | 26.0% | 27.0% | 22.5% |
| contains loop | **21.0%** | 6.8% | 6.9% |
| nested `Effect.gen` | 12.3% | 9.1% | 13.3% |
| function literal in body | 48.6% | 50.9% | 33.1% |
| host escape (`Effect.sync/promise/tryPromise/try`) in body | — | 15.1% | 6.4% |

Per-repo straight-line rate ranges **23.3% → 90.0%**, median 65%; the corpus's largest real application sits at **31.7%**. Six-plus live spellings of "define a service" (`Effect.Service` 200, `Context.Tag` 150, `Effect.Tag` 77, `Context.GenericTag` 58, plain-object+`Layer.succeed` 287, `ServiceMap.Service` 3) — none a majority. 39% of Effect-importing files contain a host escape; 57% touch `node:`/`process.env`/`globalThis`.

**Honest headline: the Layer vocabulary is small and closed; the program shapes are not. The claim holds for the noun and fails for the verb.**

And note the estate's own recognizer domain is far narrower still — `lift.ts:119-167` refuses `if` (`E-BRANCH`), loops (`E-LOOP`), `try` (`E-HANDLER`), any non-`store.put` receiver, any binder that isn't `const x = yield*`, and any return that isn't the exact binder array. On wild code that lifts ≈ 0%. D5's self-comparison trap (`dsl-proposal.md:1700-1712`) is live.

---

## 3. Minimum viable form, ranked by abstraction cost

| # | Option | New budget | Verdict |
|---|---|---|---|
| **1** | **G6 as ratified**: `cas_union SystemNode` in a new `Cas/Schema/System.lean`, children as `StoreRef systemKindTag`, at a working kind tag (Exchange's precedent, `Exchange.lean:70-72`), put through the landed `Projection.putNode`; `Backend/EmitLayer.lean` lowering `SystemNode → Ts.Expr.call` + `ConstDecl.type := LayerType.lower …`; `tools/EmitLayers.lean` on the `Gate.mainAt` skeleton into `check:cas` | **ZERO.** No `Ty` row, no `Ast` constructor, no `Ts` fragment form, no new emitter pattern | **WINNER — and already ruled** |
| 2 | Grow `RunParams` to L-S (branch arm) for control flow | Additive params + `manifestVersion` bump (`Mcp.lean:322`) + tag-14/15 *forms* (P6) + B-C's layout repair (`REIFICATION-SUBSTRATE.md:24-27`) + two owed theorems (`Fragments.lean:129-134`) | **Priced, sequenced G5, consumer named (`agentStep`). Not this slice.** Also measurement says it buys little: L-S admits branching only on an *operation's answer* (`Fragments.lean:103-105`), while wild code branches on host values. |
| 3 | Extend the Lift contract with a route-to-schema-plane / route-to-topology classification outcome (P7, `INGESTION-HARNESS.md:185`) | One contract change, 20 refusal codes → +1 classification outcome | **Cheap, real, but hoover-side.** Second, not first. |
| 4 | A new grammar sort for topology (`Ty` row + `Tree` constructor) | Measured amplification: +96/5 files (schema sort), +59/7 (git) plus manifest surcharge (`REIFICATION-SUBSTRATE.md:45-47`); ratification event | **REFUSED.** Answer 3 explicitly says "No `Ty` change." |
| 5 | A general Effect-program AST covering wild `gen` bodies | A whole new plane, and it fails §2 | **REFUSED.** ~65% of bodies need constructs no closed AST holds; 39% of files call out to arbitrary TS. Constructor bodies stay opaque code contributing identity only (attic §2.1, "`ctor` is always a `ref`"; R7 `EFFECTS-BACKEND.md:112-119`). |

### Adversarial against option 1 — two things the ratified answer under-states

**(a) The sharing divergence is a live correctness hazard, and it makes "describe the estate's existing layers" the wrong first slice.** Attic §1.3/§1.6: Effect's memoization is a JS `Map` keyed by **object reference** (`Layer.ts:432,386`), so sharing is a property of where the author put a `const`. A description addresses children by digest, so sharing is extensional and the divergence **is not conservative** — what Effect builds twice, the fold builds once, changing connection-pool counts and finalizer counts. `Layer.fresh` is the only recovery, and it appears 24 times in 10k sites, i.e. authors almost never spell the distinction. **Therefore slice one must be generation-only — emit new layers from a written description — never a round-trip of `Store.ts`'s existing stack into a description.** Round-tripping requires auditing every structurally identical pair, and nothing in the ratified plan says so.

**(b) The named acceptance is weaker than the estate's usual gate, and should say so.** "the Context-key-set differential" compares *which services* the built layer provides. Two topologies with identical key sets can differ in acquisition order, in `provide` vs `provideMerge` residuals, and in how many instances exist. Either widen the acceptance (key set **plus** a finalizer/acquisition count under a counting backend) or record explicitly that G6's gate is behavioural-shape, not byte-identity — the first artifact in the estate whose gate is weaker than `--check`.

---

## 4. Codegen-via-MCP: the workflow floor

**What exists.** `Cas/Backend/Mcp.lean:281-339` — `McpTool` (name, description, params: `Ast`, result: `Ast`), five tools, manifest emitted by `lake exe emitmcp` to `library/cas/mcp/cas-tools.json`, byte-gated in `check:cas` (`mise.toml:86-89,116-131`). Params/results are canonical schema codes (R9/R11).

**The gap, and it is not the AST.** `rg cas-tools` across the tree returns **only the emitter**. There is a generated, versioned, self-describing tool manifest **and no host that serves it.** A producer with no consumer. Memory records "no server yet despite `src/Server.ts`"; this confirms it at the MCP layer specifically.

**The floor, in existing parts:**

```
LLM authors  →  a SystemNode term (JSON, the described kind's own wire shape)
                 ↓  cas_put  (existing tool, existing admission law)
             store-resident topology, content-addressed        ← the SOURCE of truth
                 ↓  NEW VERB: cas_emit_layers { root: address }
             EmitLayer: SystemNode → Ts.Expr → Ts.Render       ← existing machinery
                 ↓
             TypeScript module, byte-gated by lake exe emitlayers --check
```

- **What the LLM authors:** the topology term only — service keys (strings, exactly `Context.Key.key`), constructor references (catalog addresses → emitted as named imports), parameter bindings, and the wiring edges.
- **What is derived:** every byte of the emitted TS; the `Layer.Layer<ROut, E, RIn>` type annotation via `LayerType.lower` (`Target.lean:43-48`); the import list; the residual-requirement check.
- **What the LLM never authors:** constructor bodies. They are `ref`s to already-written code. This is the R7 line (`EFFECTS-BACKEND.md:112-119`: "The backend generates interpreters, services, **layers**, and typed surfaces — host machinery") and it is why layer generation is legal where program lifting is not.
- **The new verb is one row in `Mcp.lean:298-319` plus a `manifestVersion` bump** (`:322`, "bumped only by ruling" — P8 already anticipates this).

**Do not confuse this with lifting.** `dsl-proposal.md:229-238` and `:396-424` already rule R-LAYER as "classify as host machinery; **never a program**" — "Attempting to lift wiring as computation would cross the direction law." That ruling governs the *hoover* leg. Generation is the *materialize* leg and is untouched by it. Any slice that tries to recover a `SystemNode` **from** existing TypeScript is a different, direction-law-loaded question and is not this one.

---

## 5. How this feeds the Great Hoovering loop

| Ruled leg (`SPECS.md:79-86`) | What G6 gives it | What is still owed |
|---|---|---|
| wild ingestion → prose | Nothing new — but a `SystemNode` is a first-order `Described` value, so `Envelope.toProse`'s machinery (`PLAIN-LANGUAGE.md` §A, `Prose = List Inline`) verbalizes a topology the day it exists. "What does this system wire together" becomes an emitted paragraph, not a hand-written one. | The E3 slice |
| **git → Effect program model** | The `git` sort (tag 71, `REGISTRY.md:36`) already puts a commit as content with dual identity. A topology addressed in the same store makes "which wiring did this commit describe" a store query. | git SHA-1 edges are a counted deliberate gap (`REIFICATION-SUBSTRATE.md:99-104`) |
| code → spec/invariant generation | The residual-requirement set of a `SystemNode` **is** an invariant, computable without running (attic SYS7); the capability matrix in `Architecture.lean` is the same shape one level down. | The two are not yet joined — see §6 |
| Effect programs into the structure | Unchanged: L-A landed, P1 decoder owed. §2 says the program half will stay a **narrow fragment plus classification**, not a general AST. That should be stated as a ruling, not discovered. | P1, P3, and the honest ceiling |

The load-bearing loop claim to correct: `VISION.md:40-43` says once Effect programs can be ingested "**any integration becomes trivial**." Measurement (§2) does not support that at program granularity. It *does* support it at **wiring** granularity — which is the half being built.

---

## 6. Ruling asks, and the one slice

**Asks:**

1. **Confirm the inclination is already discharged** — decision-record item 9 (`SPECS.md:103-106`) is answered by ratified `REIFICATION-SUBSTRATE.md:68-73` (layers) and `:63-67` (programs). Item 9 should be marked *superseded by the reification ratification*, not carried as an open design question. **No new abstraction is warranted or needed.**
2. **Rule that G6 is unblocked and release it.** Its named blocker B-B is `Projection.putNode` and it landed. Nothing else in G0–G5 gates it.
3. **Rule slice one generation-only** (§3a): the first `SystemNode` describes a *new* layer stack, not `Store.ts`'s existing one. Reason: extensional-vs-intensional sharing changes resource counts silently and there is no gate that would catch it.
4. **Rule the acceptance** (§3b): Context-key-set differential alone, or key set + acquisition/finalizer count. Either is fine; the record must say which, because this is the estate's first gate weaker than byte identity.
5. **Rule the topology's kind tag** as a *working* tag on Exchange's precedent (`Exchange.lean:70-72`), explicitly not a registry row — and note it aggravates B-A (`REIFICATION-SUBSTRATE.md:9-14`, `Cas.value`'s reserved set is six tags short, a live correctness hole; P0 fixes it).
6. **Rule the program half closed at L-A + classification for v0.** §2's numbers say a general Effect program AST buys ~35% coverage at the cost of a new plane. State the ceiling now so nobody rediscovers it in six weeks.
7. **Re-rule D1.** `ab347a85` refutes item 7's Option A premise (`Schema.ts` is unparseable at any known pin, 332+ error sites). Independent of this lane, but item 7 is in this frame.
8. **Housekeeping, urgent:** the working tree is mid-merge with four `UU` files; `mise.toml:123-127` has live conflict markers, so no gate runs on this host.

**The one slice I would commission:**

> **G6-a — `SystemNode` as a described kind, put and emitted, on one new topology.**
> `Cas/Schema/System.lean` (~85, the `Exchange.lean` shape: `cas_union SystemNode` with `service`/`backing`/`provide`/`provide-merge`/`merge`/`fresh`/`opaque` arms, children as `StoreRef`) → put through the landed `Projection.putNode` → `Cas/Backend/EmitLayer.lean` (~90, `SystemNode → Ts.Expr.call` + `ConstDecl.type := LayerType.lower`) → `tools/EmitLayers.lean` (~57, `Gate.mainAt`) → one emitted module + the Context-key-set differential in the effects test tree, `--check` wired into `check:cas`. **~230 lines, zero new abstraction, no `Ty` change, no registry row.**
> Acceptance: the emitted module's built `Context` has the key set the topology declares, and `lake exe emitlayers --check` is green in `check:cas`.
> Follow-on, not in this slice: `cas_emit_layers` as an MCP verb (§4) — it is one row in `Mcp.lean:tools` plus a manifest bump, and it is worth nothing until something hosts `cas-tools.json`.

**What I would not commission:** anything that recovers a topology from existing TypeScript, anything that widens `Ts.Stmt` beyond `constYield`/`ret`, and any carrier for Effect control flow that is not L-S on tags 14/15.
