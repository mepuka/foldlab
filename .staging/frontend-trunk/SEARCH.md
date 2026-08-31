# SEARCH — the searcher is an LLM: the query plane under agent execution

Status: **STAGED DIRECTION — pre-grade**. Written 2026-08-30 on
operator order: model the reality that users ask their LLMs, and the
LLM completes the search via MCP — multi-step reasoning, dependent
branching, sub-queries, memories, multi-agent identities, embedding
consumers — "always being simple, letting the algebra guide us as to
what is maximally efficient and what can we get away with before
performance requires us to improve." Builds on
[QUERIES.md](QUERIES.md) (the three shapes, the rungs, the
patchability law). SOTA rows RESOLVED 2026-08-30: the reader's full
report + its self-correcting addendum are banked at
[../agent-reports/2026-08-30-sota-search-survey.md](../agent-reports/2026-08-30-sota-search-survey.md)
— every external figure below now cites that report; §5 and §8 were
CORRECTED against its measured numbers (the original model-knowledge
ballparks were optimistic in places, noted inline).

## 1. The searcher is an interpreter — the search plane IS the program plane

An LLM executing a multi-step, dependently-branching search is not a
new kind of thing. It is a PROGRAM in the store's own language:

- each sub-query step is an effect with a typed answer;
- "branching dependently" is the continuation discipline — the next
  step computed from the last answer — which is exactly what
  `step`/`cont` defunctionalization models (COLUMNS §two-audience:
  "an agent run IS an effectful program");
- a search session, defunctionalized, is CONTENT: addressable,
  replayable, auditable, renderable in the trunk like any run.

So the operator's list collapses into machinery that exists. What a
search plane adds is a signature summand for query effects (the
`WordSig ⊕ₛ StoreSig` precedent), not an architecture.

**The standing rule this implies — SR-1, the load-bearing one:
searches leave receipts.** Search execution writes its program and
its cuts into the store like any other run. Nothing else in this
file works without it, and everything else falls out of it.

## 2. Sub-query results in the CAS — yes, and dedup is the memoizer

A materialized sub-result is a binding: `(querySpec, mark, value)` —
the cached fold of SPEC §2.2(b), made content.

- **Memoization is free**: same spec at the same mark canonicalizes
  to the same address; a duplicate put is the identity (L92). The
  store's dedup IS the query cache — no cache subsystem to design.
- **Refresh is `run_append`**: result@m′ = merge(result@m, run of the
  delta). The patchability law (QUERIES §4) says which results
  advance and which are cut-stamped.
- **Addresses, not payloads — the MCP payoff, now standardized.**
  A later step of the search program references a result SET by
  address instead of re-carrying rows through the LLM's context. The
  store becomes the agent's working memory; tools pass names; only
  the final render loads bytes. MCP rev. 2026-07-28 standardizes
  exactly this (Stateful Tools handles; `resource_link`), and the
  measured payoff is 98.7% token reduction (report §5).
- **But never a NAKED hash.** The reader's one finding that cuts
  against us: cryptic identifiers measurably degrade LLM retrieval
  precision (Anthropic tool guidance). Resolution: **opaque to the
  protocol, legible to the model** — every returned address rides in
  a record `{address, kind, name/path, size, one-line summary}`,
  which is `resource_link`'s own shape. The receipt already carries
  most of this; the naming inventory supplies the rest.

## 3. Memories — annotation nodes with provenance

A memory is an annotation: a node referencing what it is about,
carrying text/structure, optionally published as a root (`cas name`
is the landed precedent — names are annotations, idempotent by
addressing, L197). LLM-authored memories are Rewriter outputs and
carry provenance like every completion (decision 36f visibility;
decision 37 pins when anything "meaning"-shaped is claimed). No new
plane: memories are content about content, searched by the same
algebra.

## 4. Identity is a sub-query — the operator's reading, ratifiable

"Agents who started their runs on Tuesday morning" decomposes as
attribution ∘ time-window: a Q-SEG over the receipt plane composed
with the agent classifier. So identities are DERIVED, not primitive —
an identity is a NAME for a query (multi-valued, like all names,
decision 34), and it obeys the same honesty rules: time-windows are
receipt-plane and per-device honest (QD-4/N5), and non-monotone
identity predicates are cut-stamped (§4 of QUERIES). The
prerequisite is QD-3: content-plane attribution (`entry.agent`) —
without it "who" bottoms out in per-device receipt metadata. QD-3 is
now doubly load-bearing.

## 5. Embeddings — a pinned function and a top-k monoid

- **`embed : String → Vector` is a FUNCTION, not a decision point**
  (the Llm module's own split): deterministic given a checkpoint, so
  it is pinnable — checkpoint hash + code hash → the same bytes. The
  operator's WASM port of a light model is this function's first
  instance; TOOLS admission when it enters gated work.
- **Vectors are content.** `embed(content)` stored as an annotation
  referencing its content: re-embedding is a duplicate put — **the
  CAS is the embedding cache**, same theorem as §2.
- **kNN is a Q-HOM.** Top-k-by-similarity is a fold into the
  bounded-best-set aggregator: merge(A,B) = best k of A ∪ B under a
  canonical tie-break (score, then address). Associative,
  commutative, idempotent — **an R2 target** — so similarity search
  patches under append and agrees across replicas, by the same
  theorems as everything else.
- **Brute-force first — corrected to the reader's MEASURED numbers.**
  The exact scan is the spec AND the implementation until scale
  refuses. Measured (M3, single core): 10⁶ × 768 fp32 = **65 ms**
  (35 ms on 8 threads; int8 **23.7 ms**) vs a realistic LLM round
  trip of 1.7–5.5 s — one to two orders on time, five to six on
  dollars. At the estate's own 10⁷ scale the fp32 scan holds on
  time but **fails on memory** (30.7 GB): the fix is **int8
  quantization** (4×, ~99% retention with rescore — NOT binary,
  whose recall drops to ~0.94–0.96 at 768 dims), not an index.
  Honesty row: LanceDB, the most relevant vendor, draws its
  no-index line at ~10⁵ — our 10⁶ posture is more aggressive than
  their guidance and says so here. ANN's incompatibility with R2 is
  now evidenced, not asserted: HNSW recall shifts up to 12 points
  with insertion order alone, inserts cost a search, adds and
  queries mutually exclude, centroids freeze (report §4 + addendum).
  When ANN ever arrives, it arrives as a CACHE whose spec is the
  fold, checked against it, never as the semantics.
- **The local-encoder law (the addendum's sharpest finding).** A
  REMOTE query embedder's HTTPS floor (100–500 ms) exceeds the
  entire scan — every cost argument here presumes the query encoder
  runs LOCAL. A static model embeds a query in ~9.3 µs and is a
  lookup table (tokenize, gather, average, normalize) — no inference
  runtime needed, which is exactly the operator's WASM port's lane;
  `model2vec-rs` ships a `wasm` feature as prior art.

## 5b. The query fold — the operator's shift, made precise (2026-08-30)

Operator: "model our whole query as a function of a previous query…
which is what the monoid model is, no?" Yes — as TWO folds in ONE
algebra:

- **The answer fold (landed)**: `run (w ++ δ) = run w ⋄ run δ` —
  answers are functions of previous answers as the WORD grows.
- **The query fold (the shift)**: under SR-1 queries are content, so
  the session's query stream is itself a sub-word, and the current
  query context is a View over it — `ctx_{n+1} = ctx_n ⋄
  step(q_n, notes_n)`, with `ask(intent, w) = refine(intent,
  QueryCtx.run w)`. "The whole query as a function of the previous
  query" is the free monoid ACTING on a context state — exactly the
  construction Mathlib bundles as `FreeMonoid.mkMulAction` (the
  correspondence report's sweep row F), and because the query stream
  lives in the word, the second fold is an INSTANCE of the first.
  One algebra, two instances; the fold law (JUDGE.md) now covers the
  present QUESTION, not just the present view.

**The after-query annotation loop** ("a small agent takes the query
hash and annotates it — notes, context, results, the prior queries
that seem most related") lands as machinery that already exists:
the query's address IS its hash (memoized — a re-asked query costs
nothing and its annotations are already there); the annotator is a
write-side Rewriter panel, receipted with provenance; "most related
prior queries" are REF EDGES to prior query addresses, so the
association structure is a DAG that admission keeps topologically
sorted (QD-1's theorem applies verbatim), "related queries" is
Q-FIX over it, and the association index is an R2 view fed by
annotations (QD-2 over queries). Generative Agents' ablation is the
external evidence that this reflection layer is where the value
lives: their no-reflection condition scored below the human
baseline (report §2).

## 6. The reflexive tower collapses — "universally aware" is a classifier

The operator's theory: search over all history, but also over the
history of those searches, and the preferences of those searches.
Under SR-1 the tower is flat: searches are content, their results
are content, preference annotations on them are content — so
"history of queries" and "history of preferences of queries" are the
SAME word, selected by classifiers (columnBy over the search forms).
One algebra, no meta-levels. This is JUDGE.md's fold law landing in
practice: view_t = fold(w_≤t, labels_t), where the labels themselves
live in w. What keeps it honest at the LLM boundary: provenance
visibility (36f) and the blinding rule (36e) when aggregates feed a
large model.

## 7. The annotation theory — one Rewriter kind at both ends, benched

The operator's hypothesis to test: cheap LLM annotation
(rewriters) + structural search over annotations beats or matches
heavier retrieval for our workloads.

- **Write-side**: at admission, cheap ANNOTATORS run `Rewriter`s
  (`Into`-forced to annotation schemas — tags, summaries, entities,
  links), receipted, provenance-carried. Cost amortizes: once per
  content, ever (dedup). (Vocabulary fixed 2026-08-31, stream-loop
  review G4: "panel" is taken — landed Lean's `Panel` is the JUDGE
  aggregator (`List Judge`, verdicts). The write-side machine is the
  ANNOTATOR pipeline, and it exists on neither side yet — a named
  gap, not a landed thing.)
- **The fuzziness quarantine — why the write side structurally
  beats semantic caching.** The annotator's "seems related" IS a
  soft judgment — but it is made ONCE, at write time, visible,
  receipted, revisable by append; what reads consume thereafter are
  EXACT reference edges and exact dedup. Semantic caching makes the
  soft judgment at READ time on every hit, which is where its
  ~7–8% wrong-answer floor lives (addendum §semantic-caching). Same
  fuzziness, opposite side of the admission gate: ours sits in the
  store as auditable content; theirs sits in the serving path as an
  untunable error rate. Cost always wins by amortization + dedup;
  quality is SR-4's bench to measure — with the compounding term
  those systems lack (the query-association graph grows in value
  linearly in cost).
- **Read-side**: query rewriting/expansion is the SAME kind —
  `Rewriter : String → String` (or Into a QuerySpec) at the search
  door. SOTA's query-rewriting literature (reader pinning) is this
  box.
- **The bench**: mechanical, GEOMETRY-studies style — replay recorded
  words, run fixed question sets under (annotations only |
  embeddings only | both | neither), measure retrieval quality and
  cost. Evidence rows before taste, scout-lane discipline.
- **The hypothesis now has direct external evidence** (report §1):
  LogicalRAG (May 2026) — LLM-steered structured retrieval at
  PARITY with dense hybrid (0.717 vs 0.716) at **41× lower build
  cost**, improving as the agent model improves; Contextual
  Retrieval's measured write-time deltas; doc2query beating every
  query-time sparse method; and the counterweights that shape the
  bench: search-alone scores 0–2.2% on multi-hop (decomposition is
  structural, not optional), decomposition LOSES on shallow queries
  (route, don't always-decompose), and the tool surface is worth
  ~1.3 points where training is worth ~50 (BrowseComp) — polish the
  plane's structure, not its chrome.

## 8. Cost posture — where optimization actually lives (CORRECTED)

Reader-verified (report §6 + addendum; the original "2–4 orders" was
too generous): the LLM round-trip dominates the scan by **one to two
orders on time and five to six on dollars** at 10⁶; at the estate's
stated 10⁷ the scan still beats a round trip on time but fp32 fails
on MEMORY — int8 is the rescue, an index is not. **So the algebra's
optimization targets stand, sharpened: fewer completions (annotate
once at write — measured at −35..67% retrieval failure for
$1.02/Mtok, vs >2 s per query forever on the read side; materialize
sub-results; pass legible handles), a LOCAL query encoder, int8
vectors — never store indexes.** Two hard problems dissolve in our
shape, provably: semantic-cache EVICTION is NP-hard and
inapproximable past 0.632 — an append-only store never evicts; and
semantic cache HITS carry a ~7–8% wrong-answer floor no threshold
fixes — our dedup-as-memoization is EXACT and has no such floor.
The patchability law still governs the index conversation when it
comes: caches with specs.

## 9. MCP consequences — mostly already paid

- Cursors are the pagination LLMs handle best, and ours are theorems
  (W5/W6) — the store computes `next`; the tool answer carries it.
- Documents-in/documents-out with Ast-coded params (decision 18)
  already matches tool-design guidance; few orthogonal tools.
- The search verb itself (a tool that runs a search PROGRAM and
  answers addresses + receipts) is a future `Mcp.lean` event —
  fenced, versioned, an operator ruling; FT-1a's host route needs
  none of it.

## Ruling asks

- **SR-1**: searches leave receipts — search execution is a store
  program; the standing architecture rule everything above rests on.
- **SR-2**: sub-results as content — `(querySpec, mark, value)`
  bindings; dedup-as-memoization; refresh by patchability law;
  addresses-not-payloads as the MCP discipline.
- **SR-3**: embeddings posture — pinned deterministic `embed`,
  vectors as content, top-k as R2 aggregator, brute-force-first, ANN
  only ever as spec-checked cache.
- **SR-4**: commission the annotation bench (§7) when the trunk
  renders — the operator's theory as evidence rows.
- **SR-5**: identity-as-query ratified (§4), QD-3 prerequisite
  acknowledged.
- **SR-6**: the search-verb tool as a fenced future registry event;
  nothing before it needs Lean edits.

## Provenance

Landed-law citations resolve at `main` @ `d9cf99ee`. SOTA and cost
rows: model knowledge only until the reader lane lands URLs;
`pin: PENDING` throughout. The operator's WASM embedding model is
theirs, unexamined here ("we can look into later"); no claim about
it is made beyond determinism-if-fixed-weights.
