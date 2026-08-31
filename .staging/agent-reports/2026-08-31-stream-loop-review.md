# Stream-loop review — the query-execution law sniffed, the streaming loop sketched

Lane: read-only review (Mac coordinator seat)
Date: 2026-08-31
Consumed by: QUERY-ENGINE.md revision + the streaming-loop model (future lane)

Repo state at review: `main` @ `d9cf99ee`, **plus a large uncommitted working
tree**. That distinction turns out to be load-bearing and is called out
wherever it bites (QE-A9, QE-A10). External claims carry fetched URLs;
in-repo claims carry `file:line`.

---

## Verdict in one paragraph

The law is right and it survives the attack. "Queries are derived folds
executed where the consumer is" is the correct reading of a grow-only
word, and the four-step trust chain is the estate's own pattern applied
faithfully. What the document does **not** yet have is a *liveness*
story: snapshot+tail assumes a materializer, and there is no periodic
anything in the estate that could be one — no `Schedule.` call exists in
`library/effects/src` or `bin` at all. Two of its five load-bearing
sentences also rest on surfaces that do not exist (`GET /history`) or on
a ledger row that has already been discharged (N2). The sharpest
correction is not a retreat but a *sharpening*: the honest line between
"a store" and "a query engine" is not **where** compute runs, it is
**what the answer is** — the daemon may execute anything whose answer is
an **address**, and nothing whose answer is a computed **value**. That
single sentence grandfathers `cas_run`, licenses a materializer forked
inside the daemon, and refuses `GET /history?tag=1`, all at once. I
recommend QUERY-ENGINE adopt it as QE-1's second clause.

---

# JOB A — the law, sniff-tested

## A.1 Findings

| id | sev | claim hit | finding | fix direction |
|---|---|---|---|---|
| **QE-A1** | **BLOCKING** | "any process **periodically** materializes the standing results" (QUERY-ENGINE.md:59-61) | **"Periodically" has no carrier anywhere in the estate.** Zero `Schedule.` uses in `library/effects/src` or `bin`. The only long-lived processes are `cas serve` (stdio) and `cas daemon`, and the only periodic loops are three forked telemetry loops inside them: heartbeat 2 s (`bin/mcp/telemetry.ts:141,209,220-225`), RSS sampler 5 s (`bin/mcp/http.ts:988,992-998`), replica-lag sampler 5 s (`http.ts:1004,1120-1124`). All three **read**; none puts content. A materializer would be the first forked loop that admits — a category change, not a fourth instance of an existing pattern. | Rule the materializer explicitly. Recommended: a fourth forked loop in `cas daemon`, gated behind the address-not-value line (QE-A3), interval ~60 s or every 10⁴ receipts, whichever first. Name it in QE-1 rather than leaving "any process" to mean "no process." |
| **QE-A2** | **BLOCKING** | "Until stores are large, consumers just fold from zero **with paging**" (:64-65) | **There is no paging.** `since` takes a mark and returns the entire suffix: `SELECT seq, address, tag, size, at FROM <table> WHERE seq >= ${from} ORDER BY seq` — **no `LIMIT` clause** (`library/effects/src/cas/WordLog.ts:264-267`), then every row is schema-decoded into a JS array (`:268-278`). The memory realization is `entries.slice(from)` (`:159-162`), also uncapped. At the document's own 10⁷ figure, `since(0)` decodes ten million rows into one array before answering. Cold start is therefore not a slow path, it is an OOM. CANVAS.md CV-6 asks for `limit`; it does not exist. | `limit` on the seam, not just the route — `WordLogShape.since` gains a bound and `WordHistory.next` already carries the resumption cursor (W5). Note this also makes the paged pull lean on PDD-6 law 2, which is unproved (CANVAS.md CR-30 records it; QUERY-ENGINE does not cite it). |
| **QE-A3** | **HIGH** | "The server serves words and stores content. **It executes no queries**" (:15-16) | **False as written, today.** The daemon already executes arbitrary store programs on a client's behalf: `cas_run` / `cas_run_ref` (`bin/mcp/tools.ts:196-222`) dispatch to `Cas.Programs.runProgram` (`bin/mcp/handlers.ts:243,266-268`), which is a fold over the store with puts and loads. The law as spelled would refuse a landed, ratified verb. | The distinction that actually holds and that the estate already obeys: **the server may execute anything whose answer is an ADDRESS; it may not execute anything whose answer is a computed VALUE.** `cas_run` answers a `WordDocument` (addresses) — grandfathered. A materializer puts and answers an address — licensed. `GET /history?tag=1` would answer a filtered value — refused. Restate QE-1's second sentence this way; it is stronger, testable, and survives contact with the landed surface. |
| **QE-A4** | **HIGH** | "**pulls `GET /history?since=mark`** ← the server's ONE job" (:34) | **The route does not exist.** The daemon's implemented wire is `GET /control/capabilities`, `POST /control/missing`, `GET\|PUT /roots/{hex}`, `GET\|PUT /cas/{hex}` (`library/effects/src/server/Protocol.ts:225-272`), plus co-tenants `POST /mcp`, `GET /metrics`, `GET /projections` (`bin/mcp/http.ts:216,219,223`). `cas history` is CLI-only, reading `WordLog` in-process (`bin/cli/history.ts:100-101,122-142`). SPEC.md:584 already records this as "absent from the docket"; QUERY-ENGINE writes as though it is present. | Say "the server's one job **will be**". FT-1a is the whole lane's gate — everything in Job B's read side is downstream of one unbuilt route. |
| **QE-A5** | **HIGH** | snapshot loaded "under known names" (:61-62) | **Finding the newest snapshot needs a ruling nobody has asked for.** Names are annotations published as roots and are **multi-valued, fail-closed** (decision 34). N materializations at N marks under one stable name = N bindings. QUERIES.md:124 states the gap in its own words: `"latest" needs a ruling nobody has asked for`. So the cold-start pattern's *first step* — resolve `trunk-columns` to the freshest snapshot — has no defined answer. | Either (a) rule "latest binding" for the snapshot key family only, or (b) encode the mark in the name (`trunk-columns@1234000`) and make the consumer enumerate + pick max, which needs no ruling and is honest. (b) is cheaper and I recommend it. |
| **QE-A6** | **HIGH** | trust chain gates the derived **code**; nothing gates a materialized **result** | The gap is real, and the answer is better than the document expects. Two honest materializers computing the same spec at the same mark produce byte-identical `result` nodes ⇒ the **same address** ⇒ one name binding. A liar produces a **second** binding ⇒ decision 34's fail-closed naming surfaces it as a conflict rather than a lie. **The naming plane is the lying-materializer detector, and it is already landed.** But it detects only when ≥2 independent materializers actually run; with one, there is nothing to disagree with. | State the honest claim on the face: a materialized result is **not verified, it is falsifiable** — by recomputation, with disagreement surfacing automatically through the name. This is the same register N8 forces on `verify`. Add the corollary to QE-1: a `result` node's rendering says "computed at mark m by ⟨provenance⟩ — recompute to check", never "the answer". |
| **QE-A7** | **MEDIUM** | "N browsers each folding the same tail = N× wasted work" | It is fine, and the arithmetic says so loudly. The trunk's fold per receipt is one tag→column lookup, one counter increment, one ring push against `View.prod (View.height t) (View.lastK t k)` (CANVAS.md:51-56). At 15 columns and k=512 the carrier is ~1 MB at 10⁷ and the per-poll work is O(delta) — microseconds against a 1–5 ms local HTTP round trip. **The duplication is not the cost; the wire is.** A standing materializer is worth building for *cold start* (QE-A1), not for steady-state CPU. | Do not argue for the materializer on CPU grounds — the argument does not hold and the document is stronger without it. Argue for it on cold-start bytes: 10⁷ × ~90 B ≈ 900 MB fold-from-zero vs ~250 KB snapshot + bounded tail. That is ~750×, and it is the only number that matters. |
| **QE-A8** | **MEDIUM** | "the agent runs the SAME derived accessors in its own host" (:45-47) | **Code-mode has neither a protocol carrier nor a landed verb.** MCP defines exactly six primitives — Resources, Prompts, Tools (server-side) and Sampling, Roots, Elicitation (client-side) — and **no code-execution primitive**: the spec's "Tools represent arbitrary code execution" is about the *server* executing, not the client running server-supplied code (https://modelcontextprotocol.io/specification/2025-06-18). In-repo: decision 16 is a ruling (`docs/SPECS.md:234-243`) and `.staging/operational-structure/DOGFOOD.md:24` says plainly "code-mode register not yet a verb"; `bin/mcp/tools.ts:263-301` describes what such a tool *would* need and implements none. So "code mode" is a property of particular **hosts** (a coding agent with a shell), not of the MCP plane. A chat client cannot fold. | Split the sentence in two. For a host that executes code: derived accessors, as written. For one that cannot: **load a materialized result by name** — which works mechanically (`cas_load` + the naming plane, both landed) and collapses entirely onto QE-A1 and QE-A5. **A3 and A1 are the same hole.** Say so; it doubles A1's weight. |
| **QE-A9** | **MEDIUM** | "landed `Cas/IR/{Query,Reach}.lean`" (:10-11); "decision 40 (`query`/`result` sorts)" (:11) | **Not landed — working tree only.** `Cas/IR/Query.lean` and `Cas/IR/Reach.lean` are **untracked**; `Cas/Grammar/Sorts.lean`, `Cas/Schema/Annotation.lean` and `REGISTRY.md` are **modified, uncommitted**. The decision-40 report says so itself: `.staging/agent-reports/2026-08-30-decision-40-sort-batch.md:9` — "Nothing is committed." In an estate whose whole discipline is landed-vs-asserted, "landed" is the wrong word for a file `git` has never seen. | One-line status correction. The design is unaffected; the citation register is not. |
| **QE-A10** | **MEDIUM** | the trust-chain framing inherits SPEC's N2 surface rule | **N2 is discharged at HEAD and three documents have not noticed.** `Programs.ts:592` now reads `if (put._tag === "fresh") word.push(answered)` — the host appends only on fresh, matching Lean's L92 — and `test/Programs.test.ts:160+` now *gates the agreement* ("a run's word takes only fresh admissions; a re-run admits nothing") rather than the divergence. Landed in `9bbcb901`, under the commit message "Refactor and clean up codebase". Still describing the old world: `THE-ALGEBRA.md:477` (L210 ASSERTED ✗, "`word.push` is unconditional at `:524`" — `:524` is now the interface declaration), `THE-ALGEBRA.md:499` (L227 "contradicts L92/L130"), `THE-ALGEBRA.md:516` (debt **rank 1**), `SPEC.md:222-232`, `SPEC.md:581`. | Re-verify and close the rows. Separately worth an operator eyebrow: the estate's rank-1 debt was discharged under a generic commit message with no ledger update. |
| **QE-A11** | **MEDIUM** | "**Any process** may materialize" (:49) | The process best-positioned to materialize is the one process forbidden to. The trunk already holds the fold; making it publish a snapshot is one put. But a writing browser is refused (`FRONTEND.md:92`, SPEC.md:589 — FRONTEND ask 2, tier 2). So "any process" excludes the obvious candidate, silently. | Say which processes: CLI, agent, daemon-internal. Not the browser, and say why (second admission authority in the least-controlled process). |
| **QE-A12** | **MEDIUM** | the `result` node as a self-describing, recomputable object | Better than expected, with one machine-readability hole. `result` (0x52) payload is `mark` — **described**, `be-u32`, 4 bytes; refs are `free`, edge 0 = the spec at the `query` tag, later edges = members (`decision-40-sort-batch.md:163-169`). So a result node **does** name its own spec and mark, and recomputation from the node alone is possible. But the grammar's `RefDiscipline` has only `.fixed` and `.free` arms — **no headed arm** — so "edge 0 is the spec" lives only in `discipline.meaning` prose. A generic reader of `manifest.json` sees `free` and cannot tell the spec edge from a member (their own GRILL POINT 4, `:211-217`). | QE-A6's "recompute to check" is not mechanizable from the manifest until a `headed` discipline arm exists. Not a blocker; name it where QE-1 promises recomputability. Also note `mark : be-u32` caps the word at ~4.29×10⁹ receipts. |
| **QE-A13** | **LOW** | "**SQL appears NOWHERE in v1**" (:86) | The word log is already SQL — `WordLog.ts:66` imports `effect/unstable/sql/SqlClient`, and `since` is a `SELECT`. The claim is about *query* SQL, not about the estate's backend, but as spelled it reads as the stronger thing. | "No query is compiled to SQL in v1." One word. |
| **QE-A14** | **LOW** | idle polling cost | An **empty** `since` costs **two** SQL round trips: the suffix query, then a second `SELECT COALESCE(MAX(seq), -1) + 1` to answer the true cursor (`WordLog.ts:285-287`). Correct — the empty answer still owes `next` — but at a 1 Hz idle poll per open tab it is 2 queries/s/tab forever. | Idle backoff (Job B parameter table). Not a defect; a number to know. |

## A.2 The three attacks that needed more than a table cell

**Multi-consumer duplication, and where the honest line is (QE-A7 continued).**
The question "does a standing materializer re-create a server-compute
plane under another name" has a clean answer once QE-A3's line is drawn:
**the line is the route, not the process.** A materializer forked inside
`cas daemon` is indistinguishable, from the store's point of view, from a
CLI invocation on a cron — both go through `putBytes` then the receipt
(`Store.ts:304-316`), both answer an address, and a consumer that ignores
every snapshot gets the identical answer by folding. That last clause is
the real test, and the estate already applies it one plane over: SEARCH.md
§5 rules that ANN, when it ever arrives, "arrives as a CACHE whose spec is
the fold, checked against it, **never as the semantics**". A snapshot is
that same object. What would cross the line is a *route* — the moment the
daemon answers `?column=`, `?tag=`, or `?since_time=`, it is computing a
value on a content predicate, and it is a query engine no matter which
process the code sits in. Concretely: `mark`, `limit`, `from`, `to` are
word-**index** arithmetic (`drop`/`take`, W6-licensed) and are safe; every
receipt-**field** predicate is not. That is a rule a reviewer can apply
without judgment, and it is worth writing into QE-1.

**Staleness — cheap to detect, no fallback, and one genuine cliff.**
Detection is a single request: compare `snapshot.mark` to the `next` that
any `since` answers, and the same call returns the delta itself. There is
no *fallback* — the only thing to do with a long tail is fold it — so a
stale snapshot degrades **linearly and never fails**. That is a good
property and QUERY-ENGINE should claim it. The cliff is the **absent**
snapshot: a first-ever consumer, or a name never published, folds from
zero, and by QE-A2 that is currently an OOM rather than a slow path. So
the honest summary is: *stale is fine, absent is fatal* — which is one
more argument that QE-A1 (who materializes) and QE-A2 (`limit`) are the
same blocking pair.

**Anything else that smells.** Three smaller things. (i) QUERY-ENGINE
inherits `run_append` incrementality but never says the fold core must be
**total and pure** — the emitted generators are, but the hand-written
"generic fold core" (its new-work item 4) is the one piece nobody emits,
and it is the piece every conformance vector is measured through. Say it
is hand-written *and* that the vectors are the only thing standing under
it. (ii) The document says materialization "arbitrates concurrent
computers" by dedup — true for the *bytes*, but two materializers writing
the same SQLite file are contending at the storage layer, not the content
layer, and with Litestream attached that contention is live (Litestream
"starts a long-running read transaction to prevent any other process from
checkpointing", https://litestream.io/how-it-works/). Whether the
daemon's busy timeout absorbs a second writer process is **unverified
here** and is a parameter to settle, not a defect to report. (iii) The
`Ts` emission fragment is asserted to cover the generators ("if-on-tag,
`+`, `++`") but SPEC.md:585 records that the fragment "cannot spell a
view" and that `ProgDecl` is one-parameter (`Ts.lean:78-82,86-90`). The
generators may well fit; the claim deserves one witness rather than an
assertion, since the whole emission story rests on it.

---

# JOB B — the streaming loop, sketched

Sketch, not design. Everything rides landed vocabulary or names the gap.
The operator's mid-flight ruling is taken as **given**: in-flight
streaming state rides an **ephemeral off-CAS channel** — no admission, no
receipts, no provenance, no durability, does not replicate — and the
store receives only properly-granulated durable content.

## B.0 The headline, computed first

The liveness channel is not polish. It is what lets the run cut obey the
granularity law without lying about liveness, and the arithmetic is
decisive.

Tokens arrive at 20–100 tok/s ≈ **80–400 B/s** (≈4 B/token). The
granularity law fixes ~200 B per binding, ~1 KB ⇒ ~20% overhead, ~10 B ⇒
~2000% (`text-crdt.md:81-100`). An 8 KB turn:

| posture | cut rule | @20 tok/s | @100 tok/s | tip latency | dedup on partial runs |
|---|---|---|---|---|---|
| liveness from the store | ≥1 KB **or 2 s** | 50 cuts, 160 B each, 10 KB fixed — **2.25×** | 10 cuts, 2 KB fixed — 1.25× | ≤3 s | **destroyed** (clock-driven cuts) |
| same, slower cap | ≥1 KB **or 4 s** | 25 cuts, 5 KB fixed — 1.6× | 8 cuts, 1.6 KB — 1.2× | ≤5 s | **destroyed** |
| **liveness from the channel** | **≥1 KB, or 10 s stall** | **8 cuts, 1.6 KB — 1.2×** | **8 cuts, 1.6 KB — 1.2×** | **≤~100 ms** | **preserved** (size-deterministic) |

Two things fall out. First, **the time cap is what costs**: at 20 tok/s a
2 s cap produces 160 B nodes, which is 125% fixed overhead — the punished
regime the law warns about, entered not by choosing fine granularity but
by choosing responsiveness. Second, **time-triggered cuts destroy dedup**:
a re-stream of the same answer cuts at different byte offsets because the
clock is not a function of the text, so no partial run ever collides.
Size-triggered cuts are a function of the bytes alone, so they do.
Moving liveness off-CAS buys the granularity dividend *and* the dedup
back, at the same time, and that is the strongest argument for the
operator's ruling.

## B.1 The loop

```
  model ══SSE (provider)══▶ tokens, 20–100 tok/s ≈ 80–400 B/s
                                  │
        ┌─────────────────────────┴──────────────────────────┐
        ▼                                                    ▼
┌──────────────────────────────┐              ┌──────────────────────────────┐
│ CLIENT BUFFER  = INTENT      │              │  OFF-CAS LIVENESS CHANNEL    │
│ SPEC §2.2(c) — not content   │─── poke ────▶│  GET /live, text/event-stream│
│ Queue.bounded(4096)          │              │  id: <mark>   retry: 1000    │
│ Stream.buffer suspend  ◀─ backpressure      │  per-daemon · dies with the  │
│ NEVER dropping/sliding       │              │  connection · does NOT       │
└──────────────┬───────────────┘              │  replicate · ASSERTS NOTHING │
               │                              │  ⇒ NEEDS NO GATE             │
   aggregateWithin(                           └───────────────┬──────────────┘
     Sink.fold(init, bytes < 1024, append),                   │
     Schedule.spaced("10 seconds"))          ── stall floor    │
   + prefer last "\n\n" in buffer            ── dedup-friendly │
   + HARD CUT at every tool-call boundary    ── causal         │
               │                                              │
               ▼   ═══ RUN CUT — the admission granularity ═══ │
┌──────────────────────────────────────────┐                  │
│ put  value (0x01)  ~1–2 KB               │  ≥64 KB ⇒ chunk  │
│ ordinary door, ordinary dedup            │  path 0x08/09/0A │
│ Store.ts:304-316 — bytes, THEN receipt   │  (Blob.ts:33)    │
└──────────────┬───────────────────────────┘                  │
               ▼                                              │
   RECEIPT in the word  (seq,address,tag,size,at) ~90 B + ~90 B object
               │                                              │
   …2–8× per turn…                                            │
               ▼   ═══════════ TURN END ═══════════           │
┌──────────────────────────────────────────┐                  │
│ put  exchange (0x58)   ONE per turn      │  answer + prompt │
│ subject → prior exchange  (the DAG walk) │  INLINE strings  │
│ "a recorded turn of the agent seam"      │  Exchange.lean:  │
│  = the loop's final, ratified object     │  20-31, 84-89    │
└──────────────┬───────────────────────────┘                  │
               ├──▶ tool calls/results: step 0x0E / cont 0x0F │
               │    (Defun.lean:167-187, 836-849; Programs.ts)│
               ▼   (+1–3 s panel latency — VISIBLY LAGGING)   │
┌──────────────────────────────────────────┐                  │
│ annotation (0x41) on the exchange arm    │  key from the    │
│ per TURN, never per run                  │  ratified family │
└──────────────────────────────────────────┘                  │
                                                              │
 ═══════════════════ THE READ SIDE ═══════════════════════════╪═══
                                                              │
  trunk ──GET /history?since=<next>&limit=N──▶ WordHistory{word[], next}
     ▲     Schedule.spaced 1 s active / 5 s idle       │      │
     └──────────── poke ⇒ poll NOW ◀───────────────────┼──────┘
                                                       ▼
     fold O(delta): tag→column · height+1 · lastK push
     carrier View.prod(height, lastK 512) × 15 cols ≈ 1 MB @ 10⁷
                                                       ▼
     Placement (Square/Strip) ──place──▶ Rect[] ──▶ Canvas2D
     between cuts: monotone ⇒ paint only the new squares (CANVAS §4)
```

## B.2 The parameter table

| # | parameter | proposed | law / ruling it honors | what breaks if wrong |
|---|---|---|---|---|
| 1 | ingest buffer | `Stream.callback` → `Queue.bounded(4096)`, `Stream.buffer({capacity: 4096, strategy: "suspend"})` | pull-based backpressure; the store is the slow consumer | `"dropping"`/`"sliding"` silently loses tokens, and the exchange node's "the bytes are kept as spoken" (`Exchange.lean:26-28`) becomes false. This is the one buffer choice with a *semantic* consequence |
| 2 | run-cut size threshold | **≥ 1024 B** | granularity law: ~1 KB ⇒ ~20% overhead (`text-crdt.md:95-98`) | 160 B cuts ⇒ 125% overhead (§B.0); 64 KB cuts ⇒ 0.3% overhead but 160–800 s between admissions |
| 3 | run-cut stall floor | **10 s** (a floor, not a cap) | liveness comes from the channel, so this only fires on a genuine stall — which is itself worth recording | a 1–4 s cap re-enters the punished regime and destroys partial-run dedup (§B.0) |
| 4 | the combinator | `Stream.aggregateWithin(Sink.fold(init, (b) => byteLen(b) < 1024, append), Schedule.spaced("10 seconds"))` | exact **byte** threshold. `Stream.groupedWithin(n, d)` counts **elements**, not bytes | using `groupedWithin` with n in tokens makes the byte law approximate — acceptable, but say which you used. Verified at `effect@4.0.0-rc.112`: `groupedWithin`, `aggregateWithin`, `buffer`, `debounce`, `grouped`, `paginate`, `scan`, `unfold`, `fromSchedule`, `decodeText`, `splitLines` all exist; **`Stream.async` does not — it is `Stream.callback`**; `Sink.foldWeighted` does not — it is `Sink.fold(init, contPredicate, f)` |
| 5 | cut boundary preference | last `\n\n` within the buffer; hard-cut if none by 1.5× threshold | boundaries are a function of the **text**, not the clock ⇒ dedup-stable and legible as a unit | pure byte cuts split mid-word and mid-UTF-8; the run node stops being an annotatable unit |
| 6 | tool-call boundary | **always a cut**, regardless of size | a tool call is a `step` (0x0E) in the program plane; the run before it is what the model said before it acted | batching across a call makes one node span two causal regimes and the step ordering stops matching the text |
| 7 | exchange node | **one per turn**, at turn end; drop any separate "consolidated text" node | `Exchange.lean:20` — "One exchange node records one turn of the seam"; the exchange payload **is** the consolidation | one per cut ⇒ N exchange nodes each inlining a partial answer: N× the text and a false turn count. Keeping a separate consolidated node adds a third full copy for nothing (§B.3) |
| 8 | annotation cadence | **per turn**, on the exchange arm | SEARCH §7: once per content, ever (dedup amortizes) | per-run panels multiply completions 2–8× for annotations that would be recomputed at turn end anyway |
| 9 | annotation lag | 1–3 s behind the exchange node, **visibly** | honest: the annotation column trails the content column | the alternative is blocking the exchange put on the annotator, i.e. the turn does not land until a model answers. **The lag is acceptable and should be rendered, not hidden** — it is the same register as `-1` rendering as "unmeasured" (SPEC.md:510-512) |
| 10 | poll cadence | `Schedule.spaced("1 second")` while a stream is active, `"5 seconds"` idle | must be ≥ the cut cadence or the tip batches; matches Litestream `monitor-interval` 1 s | 250 ms polls = 4× requests for the same content; 10 s polls put the tip 10 s behind a cut. Idle backoff also halves QE-A14's two-queries-per-empty-poll |
| 11 | `/history` page limit | 10⁴ receipts (≈900 KB) | QE-A2 — there is no limit today | without it, cold start OOMs rather than pages |
| 12 | liveness transport | **SSE**, `GET /live`, `text/event-stream`, as a co-tenant route beside `/projections` | decision 32(c) co-tenancy — the landed precedent (`http.ts:223`, `SERVING.md` §Co-tenancy). One-way is all a poke needs; WebSocket buys a return path nothing uses | choosing WebSocket adds a bidirectional channel into the least-controlled process, which is FRONTEND ask 2's whole objection re-created |
| 13 | SSE `id:` field | the store's current `next` mark | **`Last-Event-ID` on reconnect IS `since`** — the SSE spec's own resumption is W5, for free | omitting `id:` throws the resumption away and forces a full re-poll on every reconnect |
| 14 | SSE reconnect | **client-owned**, `Schedule.exponential("500 millis")` + `Schedule.jittered`, capped 30 s — *not* EventSource's own | WHATWG: on a non-200 or wrong Content-Type "fail the connection", and "**once the user agent has failed the connection, it does not attempt to reconnect**" (https://html.spec.whatwg.org/multipage/server-sent-events.html) | relying on built-in reconnect means one daemon restart returning 503 permanently kills liveness, silently. Default reconnection time is "implementation-defined, probably in the region of a few seconds"; set `retry:` explicitly |
| 15 | SSE connection budget | 1 per tab; degrade to poll-only past 6 tabs unless the daemon speaks HTTP/2 | HTTP/1.1 caps at **6 connections per browser per origin** — per browser, not per tab; HTTP/2 negotiates ~100 streams (https://developer.mozilla.org/en-US/docs/Web/API/EventSource) | a 7th tab's `/history` polls queue behind held-open SSE connections and the whole trunk hangs. This is a concrete, reachable failure on a localhost daemon |
| 16 | disagreement rule | **the word always wins.** `pokeMark` may only *schedule* a poll; the fold's mark comes only from `WordHistory.next` | W5 — the store computes `next`, "so a client never computes its own cursor" (`WordLog.ts:76-79`); SPEC §2.2(a) — "a view that derives its own mark has left the contract" | letting a poke advance the cursor skips receipts permanently. The channel can only ever be ahead (fires at admission) or behind (dropped); neither is an error, and neither may move the mark |
| 17 | snapshot cadence | every 10⁴ receipts or 60 s, whichever first | keeps the tail bounded at the page limit (#11) | see QE-A1 — today the cadence is "never" |
| 18 | trunk carrier | `k = 512` per column, 15 columns | CANVAS.md:51-56 — ~1 MB at 10⁷ | — |

## B.3 Storage, computed (one 8 KB turn, 1 KB size cuts)

| object | n | payload | fixed @200 B | total |
|---|---|---|---|---|
| run value nodes (0x01) | 8 | 8.0 KB | 1.6 KB | 9.6 KB |
| exchange node (0x58) | 1 | ~8.4 KB (answer + prompt + JSON envelope) | 0.2 KB | 8.6 KB |
| annotation node (0x41) | 1 | ~0.3 KB | 0.2 KB | 0.5 KB |
| **turn** | **10 bindings** | | | **~18.7 KB ⇒ 2.34×** |

**What dedup does and does not give.** It gives nothing within a single
turn: the partial runs are segments, the exchange payload is a JSON
envelope around the whole, and three distinct byte strings are three
distinct addresses. It gives everything across a *replayed* turn — but
only if the cuts are size-deterministic (§B.0), which is exactly why the
stall floor is 10 s and not 2 s. Adding a separate consolidated text node
would store the answer a **third** time (26.9 KB ⇒ 3.36×) for no gain,
since the exchange node already carries it verbatim: hence parameter #7.

At scale: 10 receipts/turn ⇒ **10⁶ agent turns *is* the 10⁷-receipt store
the cold-start problem is stated at**, at ~19 GB. 10⁵ turns ≈ 1.9 GB —
inside `text-crdt.md`'s own "store everything is economically sound" band
(`:110-113`), and far inside the ~20–60× it already accepts for per-run
text nodes (`:89`).

**Two gaps this exposes.** (i) `Exchange.answer` is an inline `String`
(`Exchange.lean:86-89`, byte-pinned at `:120-121`) with **no chunk path
and no size cap** — I found no payload bound in `Value.ts`. A 500 KB code
generation becomes a single 500 KB value node, which the granularity law
says to chunk down to 64 KB and which nothing here can. Either cap the
exchange payload or grow a ref-valued answer arm (a 0x58 versioning
event, not ruled). (ii) `Exchanges.ts` exports no ready-made
`CasValue<Exchange>` the way `Annotations.ts` exports `Node`
(`Annotations.ts:328-332`); the test assembles the projection ad hoc
(`test/SchemaExchange.test.ts:42-46,85`). The loop's final object has no
first-class library door.

## B.4 The read side, in numbers

Fold cost per poll is O(delta) and is not the cost. Ten concurrent agents
at 100 tok/s cutting every ~2.5 s ⇒ ~4 receipts/s ⇒ a 1 Hz poll returns
~4 rows ≈ 500 B on the wire and microseconds of fold. The HTTP round trip
(~1–5 ms local) dominates by three orders. During an active stream the tip
shows **one new square every 10–20 s per agent**, arriving in the column
its tag classifies to — squares, not motion, exactly as CANVAS.md §4's
epoch law wants: between cuts the layout is monotone and only new ops are
painted; nothing reflows.

Cold start, with and without the materializer: 10⁷ × ~90 B ≈ **900 MB**
folding from zero, versus one snapshot (15 counts + 15×512 addresses ×
32 B ≈ **245 KB**) plus a tail bounded at 10⁴ × 90 B = 900 KB — **~1.2 MB,
about 750× cheaper**. That ratio is the materializer's entire
justification and it is worth more than the CPU argument (QE-A7).

**Litestream, as ruled.** `sync-interval` defaults to **1 s** and
per-database `monitor-interval` to **1 s**; snapshots every **24 h**;
`checkpoint-interval` 1 m (https://litestream.io/reference/config/). So a
receipt is in replica storage ~1–2 s after admission, comfortably inside
the poll cadence. Replication is asynchronous and replicas are **not
live-readable** in standard mode — restore is snapshot + subsequent LTX
files, with `litestream-vfs` the optional exception
(https://litestream.io/how-it-works/). Consequence for the loop, stated
plainly: **a reader against a restored replica sees the word and no
liveness at all**, which is correct — the channel is a per-daemon
accelerator and the durable truth is what replicates.

## B.5 The liveness channel — both forms, and the recommendation

**(a) Poke-only.** The channel carries no content: `event: word-grew`,
`id: <next>`, empty data; plus `event: stream-active` / `stream-idle` for
chrome. On receipt the client cancels its poll delay and polls
immediately. No provisional state, no reconciliation. Tip latency
collapses from "up to the poll interval" to "poke + one round trip"
(≈100 ms local). The tip still moves only at **cuts** — between them the
trunk renders "a stream is active in column N" as DOM chrome, never as a
square.

**(b) Provisional-stream.** The channel carries in-flight token deltas
and the trunk paints a provisional tip before admission. This demands the
full provisional/reconcile discipline: provisional pixels are INTENT,
must be visually distinct, and are replaced **wholesale** by
receipt-backed squares when the poll lands — never merged.

**Recommend (a) for v1.** Four reasons, in order of weight:

1. It already buys the whole granularity dividend (§B.0) — which is the
   *point* of the channel — at essentially zero design cost.
2. It needs no new `Placement` arm. CANVAS.md's union is deliberately
   rects-only and closed (`:27-35`), and the agreement gate compares
   `place`'s rect lists (`:36-47`, CR-24). A provisional op would either
   enter that union — breaking closure and the gate — or become DOM
   chrome anyway, at which point (b)'s only advantage is sub-cut motion.
3. **(b) stretches SPEC §2.2(c) past its stated scope.** Intent is
   defined as "what *the person* is doing that the store has not learned
   yet… per-viewer" (`SPEC.md:359-363`). Streaming tokens are another
   process's in-flight state, not the viewer's. Admitting them as view
   state is a *ruling* widening (c) from "the viewer's intent" to "any
   unadmitted in-flight state" — not a reading of it.
4. Sub-cut token motion is the **chat pane's** job, and the chat pane has
   the token stream directly. The trunk is a receipt view; showing it
   un-receipted content is the one thing SPEC §2.2 forbids as view state
   (`:365-373`).

Keep (b) on the shelf with its discipline written down, so that if the
operator later wants a live tip it arrives as a ruling with a spec rather
than a patch.

**Trust chain, for both forms.** Nothing rendered from the liveness
channel may claim receipt status: no address chip, no mark, no `at`, no
row in the feed, no contribution to any count. **The channel needs zero
gates precisely because it asserts nothing** — it has no admission, no
provenance, and no durability to be wrong about. The moment anything it
carries is rendered in the same register as a receipt, it acquires all
three obligations at once and every gate in the estate applies to it.
That is the whole reason (a) is cheap and (b) is not.

## B.6 The real tensions

**T1 — liveness vs granularity vs dedup, and how the ruling dissolves
it.** These three cannot all be maximized from the store alone: fast cuts
buy liveness and cost granularity (200 B fixed on a 160 B node) *and*
cost dedup (clock-driven cuts are not a function of the text). §B.0's
table is the trilemma in numbers. The operator's off-CAS channel does not
trade between them — it removes liveness from the store's shoulders, and
the remaining two agree with each other (size-deterministic cuts are both
well-granulated and dedup-stable). **This is the sketch's main result.**

**T2 — the verbatim claim vs the segmented reality.** The exchange node
promises the answer "as spoken… never normalized" (`Exchange.lean:26-28`).
The run nodes claim to be that same answer, cut. **Nothing states that
the runs concatenate to the answer** — not in Lean, not in TypeScript,
not in a test. Two host choices can falsify it silently: a `dropping`
buffer (parameter #1) and any cut that splits a UTF-8 sequence. The
statement is cheap (`List.join (cut s) = s`) and it is the one modeling
obligation the streaming loop genuinely creates.

**T3 — the annotation column trails the content column, and the honesty
is acceptable.** A per-turn panel lands 1–3 s after the exchange node.
The alternative — blocking admission on a model — makes the turn not land
until an annotator answers, which subordinates the store's word to an
oracle. The lag should be *rendered*, with the annotation cell showing
its own absence rather than an empty string, in the estate's existing
`—`-never-`0` register (SPEC.md:510-512, `FRONTEND.md:296`). What makes
this cheap rather than fraught is the write-side quarantine already ruled
in SEARCH §7: the soft judgment happens once, at write, visibly, and
everything downstream consumes exact edges.

## B.7 The frontier — Lean vs host discipline

**Must eventually be modeled in Lean:**

- **T2's cut law** — `concat (cut s) = s`. New, small, and the only thing
  the loop actually forces.
- **`Word.View.lastK`** — CANVAS.md:57-60 already names it as "the one
  new Lean inhabitant this design needs"; the tip's carrier is
  `View.prod (View.height t) (View.lastK t k)` and half of it is unbuilt.
- **PDD-6 law 2** (consecutive pulls concatenate) — the paged pull and
  the cold-start fold both lean on it; unproved (SPEC.md:583, CR-30).
- **PDD-6 law 4's iff** (a non-empty pull ⇒ the word grew) — this is
  precisely what licenses "nothing on the tip refreshes without a new
  receipt", which is the poke-then-poll loop's whole honesty claim.
  SPEC.md:252-259 notes the empty half is free by computation and the iff
  is "unstated".
- **The exchange chain as a walk** — `subject → prior exchange` is a DAG;
  `Reach`'s `wf_edge_index` / `reach_acyclic` / `reach_mono` apply
  verbatim once committed (QE-A9).

**Stays host discipline, and should be *said* to stay:**

- The cut **trigger** (size, stall, boundary). The model needs only that
  cuts concatenate, never which cuts were taken. This is the right line
  and it keeps the scheduling policy free to change.
- The liveness channel, entirely — asserts nothing, gates nothing, models
  nothing.
- Poll cadence, backoff, reconnect, connection budget.
- Litestream, entirely: it replicates bytes *below* the store law and no
  CAS claim depends on it.
- The buffer **strategy** — with one asterisk: the choice is host
  discipline, but its *consequence* (T2) is a modeled property. Say it
  that way, or someone will optimize the buffer and quietly falsify a
  theorem.

**Named gaps — the loop wants these and the vocabulary does not have
them:**

- **G1 — the cut law.** T2. Unstated anywhere.
- **G2 — `Exchange` has no ref-valued answer**, so a long answer inlines
  with no chunk path and no size cap (§B.3).
- **G3 — no `CasValue<Exchange>` door** in `Exchanges.ts` (§B.3).
- **G4 — no write-side panel machinery.** `Rewriter` is landed but
  **Lean-only** — `def Rewriter : Type := String → String`
  (`Cas/Llm/Rewriter.lean:58`), zero hits in `library/effects/src`. And
  `Panel` in landed Lean is `abbrev Panel : Type := List Judge`
  (`Cas/Llm/Judge.lean:120`) — a **verdict aggregator**, not an
  annotation panel. SEARCH.md's "write-side Rewriter panel" therefore
  borrows a word that already means something else in landed Lean, and
  the machinery it names does not exist on either side. Worth fixing as
  vocabulary before it is fixed as code — this is exactly the
  one-language-five-seats problem. (Also: `STANDUP.md:29` cites
  `Rewriter` at `Cas/Grammar/Rewriter.lean`; the file is at
  `Cas/Llm/Rewriter.lean`.)
- **G5 — no `GET /live` route**, and the daemon's MCP transport
  deliberately disclaims SSE resumption ("no legacy two-endpoint SSE, no
  event resumption, no session expiry", `bin/mcp/http.ts:24-26`). The
  liveness channel is a *new co-tenant route*, not a change to that
  transport — worth saying, so nobody reads it as reopening a closed
  protocol decision.

**Gaps that are already closed — and the documents that do not know it.**
`AnnotationSubject` is now a **13-arm** union covering `value` 0x01,
`chunk` 0x08, `context` 0x0D, `annotation` 0x41, `agent` 0x49, `query`
0x51, `result` 0x52, `exchange` 0x58 and five more
(`Cas/Schema/Annotation.lean:212-225`, mirrored
`generated/StoreKindSchema.ts:88-141`), and the key family is ratified as
`["foldlab/name","foldlab/related","foldlab/search-note","foldlab/pref","foldlab/embedding","foldlab/tombstone"]`
(`generated/annotationPlane.ts:73`, from `Annotation.lean:434-436`). That
is **CA-1 and CA-2 discharged**: you can annotate a run node and a chunk
node today, which SEARCH-CARRIERS.md:71-72 lists as the widening ask and
its §4 verdict calls the one thing "the registry cannot yet say". Same
caveat as QE-A9 — present in the working tree, not in any commit.

---

# The five things to settle before the streaming lane opens

Ranked by what blocks the lane, not by what is most interesting.

1. **Serve the word, with a `limit`.** `GET /history` does not exist
   (QE-A4) and `since` has no bound (QE-A2). Every read-side parameter in
   §B.2 is downstream of one unbuilt route, and until the bound exists
   the cold-start path is an OOM rather than a slow path. FT-1a plus
   CV-6's `limit`, ruled together — `limit` belongs on the **seam**
   (`WordLogShape.since`), not only on the route, or the CLI keeps the
   unbounded door open.

2. **Who materializes, on what trigger — and the line the daemon may not
   cross.** One ruling, because they are one question (QE-A1, QE-A3,
   QE-A8, QE-A11). Recommended shape: a fourth forked loop inside
   `cas daemon`, beside the three telemetry loops, at 60 s or 10⁴
   receipts; explicitly **not** the browser; and QE-1 gains the sentence
   **"the server may execute anything whose answer is an address, and
   nothing whose answer is a computed value."** That grandfathers
   `cas_run`, licenses the materializer, and refuses `?tag=` — one
   testable rule covering all three attacks.

3. **The cut law, and the verbatim claim it protects.** State
   `concat (cut answer) = answer` and fix the buffer strategy to
   `suspend` in the same breath (T2, G1, parameter #1). This is the only
   genuinely new modeling obligation the streaming loop creates, it is
   small, and without it the exchange node's "as spoken" promise is a
   host convention that two reasonable optimizations can break silently.

4. **"Latest binding of a name" — or the decision not to need one.**
   Snapshot+tail's first step is unresolvable under multi-valued
   fail-closed naming (QE-A5), and QUERIES.md:124 already says the ruling
   has never been asked for. The cheap escape is to encode the mark in
   the name and let the consumer take the max — no ruling, no new law.
   Decide which, because cold start does not work without one of them.

5. **Re-cite the law against the registry it now has.** Three documents
   under this lane describe a world that has moved: N2's divergence is
   **closed** at HEAD and `THE-ALGEBRA.md:477,499,516` plus
   `SPEC.md:222-232,581` still carry it as rank-1 debt (QE-A10);
   SEARCH-CARRIERS.md's CA-1/CA-2 asks are discharged in the working
   tree; and QUERY-ENGINE calls `Cas/IR/{Query,Reach}.lean` "landed" when
   `git` has never seen them (QE-A9). None of this changes a design
   decision. All of it changes what the documents may claim, and in this
   estate that is the same size of problem.
