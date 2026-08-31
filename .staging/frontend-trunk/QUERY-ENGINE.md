# QUERY-ENGINE — the queries are derived; the server does nothing

Status: **STAGED DESIGN — pre-grade**. Written 2026-08-31 on the
operator's question ("how do we convert our Lean queries into server
queries?") and CORRECTED same breath by the operator's law: **"we
need to derive the queries so the server is doing nothing."** That
law is adopted as this document's spine. Assembles: QUERIES.md §7,
store-crdt.md §rules-as-spec ("emit, never hand-translate"),
CODEGEN-LEVEL.md (closed description + folds + agreement squares;
the emission fragment), decision 40 (`query`/`result` sorts), landed
`Cas/IR/{Query,Reach}.lean`, and decision 16 (code-mode).

## The law

**The server serves words and stores content. It executes no
queries — not even derived ones.** A query is a FOLD, folds run
where the consumer is, and every query-specific line of code is
EMITTED from the Lean definitions that carry the theorems. There is
no query engine anywhere; there is derived code and one word server.

## How a Lean query becomes an executed one

```
Cas/IR/Query.lean defs            (columnGen, heightGen, natAgg, …
      │                            kernel-checked, total, tiny)
      │  emit (the fragment: if-on-tag, +, ++ — all inside
      │        CODEGEN-LEVEL's own-forms closure)
      ▼
generated/query/*.ts              the generator/aggregator table +
      │                           the QuerySpec registry, byte-gated
      ▼
the consumer's own process        the generic fold core (one tiny
      │                           function) + run_append incrementality
      │  pulls GET /history?since=mark        ← the server's ONE job
      ▼
answers — held locally, or MATERIALIZED as `result` nodes
          through the ordinary put door       ← the server's OTHER job,
                                                which it already has
```

- **The browser** (the trunk): the foldkit Model IS the executor —
  it already folds the since-stream; the column views are the
  derived generators running client-side. Nothing changes; this was
  the design.
- **An agent/LLM consumer**: code-mode (decision 16) — the agent
  runs the SAME derived accessors in its own host and passes result
  ADDRESSES onward. The MCP plane never gains a query verb that
  computes; the store speaks, consumers fold.
- **Any process may materialize**: computing a result and PUTTING it
  (`result` node: spec→query, mark, members) is an ordinary
  admission. Dedup arbitrates concurrent computers (same spec+mark
  ⇒ same address). Work itself is stored content — the vision
  sentence, executing.

## Cold start without a server engine — snapshot + tail

The one place "client folds everything" meets reality: a fresh
consumer against 10⁷ receipts must not pull 900 MB to count columns.
The answer is the epoch pattern, not an engine: **any process
periodically materializes the standing results** (the trunk's
per-column folds at a cut) as `result` nodes published under known
names; a consumer loads snapshot@cut and folds only the tail
(`since cut`) — O(delta), by `run_append`. The server served two
loads and a suffix; it computed nothing. Until stores are large,
consumers just fold from zero with paging.

## The liveness channel — off-CAS, ruled 2026-08-31

Operator, mid-review: "we're using litestream… for now we have an
off-CAS channel for liveness events." Adopted: **liveness is
ephemeral and trust-free.** In-flight events (streaming tokens,
agent-started, tool-running) ride a side channel that is not
admitted, carries no provenance, does not replicate (litestream
replicates the STORE; liveness is per-daemon and dies with the
connection), and is never a source of truth — the word always wins.
Two forms, the stream-loop reviewer sketching both: poke-only (no
data; "word grew" triggers an immediate since-poll — no provisional
state at all) and provisional-stream (in-flight deltas render the
tip PROVISIONALLY as intent, visually distinct, replaced wholesale
by receipt-backed state when the poll lands). The server's "does
nothing" law survives intact: emitting ephemeral pokes asserts
nothing and gates nothing.

## The trust chain — unchanged, aimed at the derived code

1. **Emission is the conversion**: generators/aggregators are total
   little functions on binding fields — squarely inside the TS
   emission fragment. Emitted, byte-gated, like every mirror.
2. **Reference vectors, Lean-computed**: an emitter runs each
   registry entry over golden words and emits {spec, word, mark,
   answer}; the derived code must reproduce them byte-for-byte in
   the effects suite (the conformance plane's existing pattern).
3. **The laws as generic properties** (fast-check): incremental-
   equals-fresh (licensed by `run_append`, one property over EVERY
   registry entry), order-shuffle for Comm targets (`run_perm`),
   replay for Idem (`run_redelivered`). The kernel theorems justify
   the property suite's sufficiency.
4. **`Reach` consumers**: the visited-set walk (the memoized search
   `owed(reach-search-memoized)` names) lives in the DERIVED
   accessor layer, gated against `reachB` on vectors — the debt's
   discharge path.

**SQL appears NOWHERE in v1.** If a backlog-scale ask ever exceeds
snapshot+tail, recursive CTEs may be EMITTED from Q-FIX rules as a
fast path (store-crdt's projection (a)) and gated against the fold
on vectors — a growth event, not a foundation. The daemon's code
does not change even then unless a route is separately ruled.

## What is genuinely new work (small)

1. The QuerySpec closed AST (Lean) + emitted schema triple — the
   `query` sort's canonical payload form (its payload landed opaque;
   this is its next mint).
2. The generator/aggregator registry emission from the landed defs,
   with each target's RUNG in the row (the rung tells a consumer
   its patch/replay rights).
3. The Lean reference-vector emitter + the effects conformance
   suite + the two generic fast-check properties.
4. The generic fold core in the workbench/effects (one tiny hand
   function whose only job is `foldr merge empty` over mapped
   receipts — gated by the vectors and the properties).
5. Nothing on the daemon beyond the already-ruled `/history` route.

## Review adoptions (2026-08-31) — the sniff test's corrections

The stream-loop review
([../agent-reports/2026-08-31-stream-loop-review.md](../agent-reports/2026-08-31-stream-loop-review.md))
upheld the law and sharpened it. Adopted into this document:

1. **The line, stated testably** (QE-A3): *the server may execute
   anything whose answer is an ADDRESS, and nothing whose answer is
   a computed VALUE.* Grandfathers the landed `cas_run` (answers a
   word document — addresses); licenses a materializer (puts,
   answers an address); refuses any `?tag=`/`?column=` route
   (computes a value on a content predicate). Word-INDEX arithmetic
   (`mark`/`limit`/`from`/`to`) is safe; receipt-FIELD predicates
   are not.
2. **`limit` lives on the SEAM** (`WordLogShape.since`), not only
   the route — today `since` is unbounded SQL + full decode, so
   cold start is an OOM, not a slow path (QE-A2). Rides FT-1a.
3. **The materializer is a ruling, not "any process"** (QE-A1/A8/
   A11): recommended as a fourth forked loop in `cas daemon` beside
   the three telemetry loops (~60 s or 10⁴ receipts), inside the
   address-not-value line; explicitly NOT the browser. Its real
   justification is cold-start bytes (~900 MB fold-from-zero vs
   ~1.2 MB snapshot+tail ≈ 750×), not CPU. It is also the fallback
   for MCP clients that cannot run code: load-result-by-name.
4. **Snapshot naming needs no new ruling**: encode the mark in the
   name (`trunk-columns@12340000`), consumer enumerates and takes
   max — honest under decision 34's multi-valued naming (QE-A5).
5. **A materialized result is FALSIFIABLE, never "verified"**
   (QE-A6): recomputation is the check, and the naming plane is the
   lying-materializer detector for free (honest duplicates collide
   to one address; a liar's second binding surfaces as a
   fail-closed name conflict). Renders as "computed at mark m by
   ⟨provenance⟩ — recompute to check."
6. **Wording**: `Cas/IR/{Query,Reach}.lean` and the decision-40
   registry are WORKING-TREE, not landed, until the commit (QE-A9);
   and "no QUERY is compiled to SQL in v1" (the word log itself is
   SQL, QE-A13).
7. **The one new modeling obligation the streaming loop creates**:
   the CUT LAW `concat (cut answer) = answer` — protects the
   exchange node's verbatim promise against buffer/cut
   optimizations; paired with the `suspend` buffer strategy (T2/G1).
   The liveness channel itself stays off-CAS, poke-only recommended
   for v1 (its §B.5 — the trilemma dissolves: size-deterministic
   cuts are both well-granulated and dedup-stable once liveness
   rides the channel).

## Ruling asks

- **QE-1**: adopt the law WITH clause (1) — queries are derived
  folds executed where the consumer is; the server serves words and
  admits content, and may execute only what answers an address;
  materialization per adoption (3); snapshot+tail with mark-in-name
  (4); results falsifiable (5).
- **QE-2**: the QuerySpec AST as the `query` sort's canonical
  payload, grilled with the trunk's first registry entries
  (counts/heights per column, unregistered, member pages).
- **QE-3**: no query compiles to SQL in v1; admissible later only
  as an emitted, vector-gated fast path via a growth event.
- **QE-4** (new): the cut law + suspend-buffer pairing (adoption 7)
  as the streaming lane's entry obligation; `/live` poke channel as
  a NEW co-tenant route when built (never a reopening of the MCP
  transport decision).
