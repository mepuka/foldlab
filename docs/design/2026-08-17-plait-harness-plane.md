# Plait, part 3 — the harness plane (design commission, continued)

Status: **commissioned continuation**, dispatched by the coordinator
2026-08-17 (epic DEV-699, issue DEV-700) after the ratification record
chartered the program. Part 1
([the fabric](2026-08-17-plait-coordination-fabric.md)) built the
coordination substrate; part 2
([the action plane](2026-08-17-plait-action-plane.md)) made the act a
fabric citizen. Part 3 takes the next ring outward: **the harness** —
how an agent finds things, where things live and what they are called,
and how ordinary production work (scheduling, watching, paying,
approving, upgrading) rides the constructs already proven. **Everything
new here is PROPOSED pending the coordinator's grill** (§12). This
document changes no code, no ledger row, no dispatch spec, and no seam
status. Findings it raises against the ratified records are FILED in
§11, not fixed.

> **Adopted 2026-08-17** under the ratified grill sheet
> ([2026-08-17-plait-grill-sheet.md](2026-08-17-plait-grill-sheet.md),
> item 1/G13, all items on recommended options): C10–C11 join the
> construct set; F11/F12 enter the proof plan as separate,
> minimally-scoped candidate statements (item 12); the composition gap
> table is the program's readiness map, its two deliberately-open rows
> kept open (item 10 defers declaration-upgrade to its owner).

Confidence tiers, as parts 1–2: **ratified** (grill record or standing
ruling) · **proven** (Lean theorem behind a green gate) · **measured**
(ran-it result in a durable estate document) · **shipped** (code on
main, read in place) · **proposed** (this document's own design) ·
**lead** (external claim not verified against a primary source this
session).

Design law this document obeys, stated once: **no new physics.** Every
capability below either REDUCES to the proven constructs (C1–C9,
F1–F10) or is FLAGGED as genuinely new, with a candidate law named and
a consumer named — and the law itself is left for the coordinator to
rule on, never invented here.

---

## 1. What a harness is

Parts 1 and 2 answer *how many agents agree* and *how one agent acts*.
Neither answers the questions a production deployment asks on its first
day: **how do I find the thing I need? where does my data live and what
do I call it? and who is watching the money, the clock, and the
upgrade?**

Those three questions are the harness. For an outsider, in one
sentence: *on a substrate where every value has a content address and
every state is a fold, searching is a fold you can query, storage is a
declaration about which fold or blob set holds your data, naming is a
small fenced table from human-readable names to content addresses, and
almost everything a production checklist asks for turns out to be a
read over material the fabric already keeps.*

That last clause is the finding of this part, and §6 is its evidence:
of twelve production concerns inventoried, eight are covered by
construction, two need an API surface and no new mathematics, and two
are genuinely new and are flagged for a ruling rather than answered.

House-jargon gloss, for readers outside the estate: a **digest** is a
SHA-256 hash over the one canonical byte form of a value — its
permanent name. A **fold** is a declared reduction over a stream of
events; because the declaration itself has a digest, "the state of
fold F over history H" is a name, not a cache entry. An **anchor** is
the checkpoint fact `(fold, partition) → (position floor, state
digest, head)` — the fabric's answer to "where did we get to". A
**certificate** is the derivation claim riding on any produced record
(schema digest, program digest, input anchor, span head), every field
of which an auditor recomputes. A **refusal** is a typed value
returned instead of an error, carrying what was wrong and a legal next
move; refusals sort into **structural** (permanently true evidence)
and **absence** (head-relative, repealed by later presence).

---

## 2. Result first — the five moves

**2.1 An index is a fold; a query is a read.** No new object joins the
substrate. An index declaration is a fold declaration (C4) plus one
field: a declared *query algebra* — the pure function from
`(state, query value)` to a result value. Its state is anchored exactly
like any other fold's, its resumption is F3, and its right to run
partitioned is F4's commutativity brand. The estate already recorded
this shape as a demand: *"catalog search is… the meaning fold at a query
algebra"* (measured, [estate structures
map](2026-08-14-estate-structures-map.md) row G1), with the query
pattern carried as canonical data (row G2) and result rows as
certificates rather than hints (row G8). Part 3 makes it a fabric
citizen and states the law it wants (F11, §4.2) without proving it.

**2.2 Freshness is a fact; staleness is an absence refusal.** Because
an index's anchor is a fact keyed by fold identity and history
identity, "how fresh is this index?" has a byte answer, not an
estimate. A caller who needs head-current results does not block: it
states a precondition (`atLeastHead: h`) and receives an
**absence-sorted refusal** until the anchor passes `h` — the estate's
retry class doing freshness duty, with no new mechanism and no wait
primitive (§4.3). This is F8's head-relative-truth vocabulary applied
to retrieval: a result is never *wrong* later, it is a true record of a
DAG position.

**2.3 Embeddings are actions, and model drift is visible by
construction.** An embedding is a derived record whose certificate pins
the embedder's **capability digest** and its **input digest** — which
means producing one is an ordinary C7 action, fenced by the register,
at most one landed outcome per `(input, embedder)` declaration. An
embedding index is a fold over embedding evidence. Changing the
embedder changes a capability digest, which changes the declarations,
which changes the index digest: **re-embedding is a new fold, and
silent in-place index mutation is not representable.** The old index
stays a true record at its anchor. Approximate (ANN) structures are
handled honestly rather than waved at: they are order-sensitive and
randomized, therefore *not* in the commutative class, therefore
single-partition and resumable but never partition-merged — the
declared-rights table (C4) sorts them without anyone legislating (§4.4).

**2.4 A resource is a cataloged declaration; naming is a fenced
directory cell.** A resource declaration — `{schema, family, state,
access class, retention policy, lineage}` — is a canonical value
admitted through the certifier like every other value (ruling G12), and
its *state* is one of four substrate families: a lane, a cell, a blob
set, or an **edge capability** (a declared door to something outside
the fabric, held at the boundary, never in identity). Naming is a
**directory**: a lattice cell mapping petnames to sets of digests.
Binding-append is monotone and therefore coordination-free (F1);
**rebinding is non-monotone and therefore fenced** — it is a register
act under declared rebind authority, and its arbitration order is the
fencing-token order (F5), not a clock. Candidate law F12 (§5.4) states
resolution; "latest" is a head-relative read that requires an anchor,
and an unanchored `resolve` does not exist in the API.

**2.5 Most of the production checklist is already paid for.** §6's gap
table maps twelve production concerns onto the machinery. Scheduling is
a deadline seat plus a schedule *value*; observability is journal-native
spans and declared metric folds; quotas are policy fields that are
liveness-only by construction; tenancy is venues plus accounts plus the
policy lattice; approval steps are holes filled by human seats; retry
ergonomics is the refusal sort split. Two rows are genuinely new and
are flagged, not solved: **declaration upgrade** (what a successor
declaration licenses for folds and anchors already keyed by the old
digest — a law the estate already owes itself, grilling #2) and
**erasure** (removing admitted content without falsifying an
append-only, tamper-evident record). One row carries a bound that must
never be lost: **at-most-one landed outcome is not at-most-one external
side effect** (§6.3).

---

## 3. Grounding — what is already settled

| Settled thing | Status | What part 3 does with it |
| --- | --- | --- |
| C4 declared algebra / declared step / declared rights; the commutativity class decides partition rights | shipped discipline + proven F4 | an index is a fold; ANN structures fail the brand and are sorted accordingly |
| F3 resumption; anchors are facts, `(fold digest, head)` results are immutable truths | proven (R5 target, part 1 §9.2) | index resumption and the compaction horizon (§5.5) are consequences, not features |
| F7 assembly determinism; F8 contexts are head-relative truths | proposed laws (part 2 §4) | retrieval extends the selector family so RAG inherits F7; freshness/staleness use F8's vocabulary verbatim |
| C6 selector family (catalog value, journal span, cell state, frontier, outcome) | proposed (part 2) | gains one production: query result by `(index, anchor, query, k)` |
| C7 action register; capability digest on every outcome | proposed (part 2), riding proven-shape F5 | embedding production is an ordinary action; the embedder pin is the existing capability field |
| C1/F1 join-semilattice cells; C2 declared arbitration at enumerated coordination points | proven shapes (part 1 §5.1–5.2) | the directory is a cell; rebind is one of the enumerated coordination points |
| F5 monotone fencing tokens; the token decides, never the holder | proven shape, re-earned at slice 2 | the arbitration order for rebinds; no clock enters naming |
| C8/F9 policy meet-semilattice, attenuation | proposed (part 2) | index/resource allowlists are policy *fields*; no new writ verb is minted |
| Three-verb writ (read, publish, request); W9 clients implement no authority protocol | shipped | querying is `read`; the harness adds no verb |
| Refusal sorts: structural = repair class, absence = retry class | shipped | freshness backpressure, empty bindings, and ambiguous names all land as existing sorts |
| Certificate `{schema, program, input anchor, span head}` | shipped vocabulary | a search result row is a certified derived record with **no new fields** |
| Identity order (RFC 8785 UTF-16 code-unit sort) as the estate's canonical tie-break | shipped (CONTEXT.md) | top-k tie-breaking, so exact k-NN is a total function |
| Compaction: replace a prefix by its `(head, fold state)` pair, loss only ever by explicit choice; the session journal refuses until certification can export structural refusals | shipped discipline (CONTEXT.md) | the retention posture; Plait licenses nothing the estate refuses |
| "Catalog search is the meaning fold at a query algebra"; query patterns as canonical data; result rows are certificates; ranking is a declared fold else catalog order | measured demand rows G1, G2, G8, G11 ([structures map](2026-08-14-estate-structures-map.md)) | the S1 design is these rows made fabric-shaped; G11's warning — *"an LLM-ranked result set is an author claim wearing a certificate's clothes"* — is adopted as an API refusal |
| Verifiable journal cursor `{seq, head}` rather than MCP's opaque cursor | measured demand row G9 | pagination of query results |
| MCP: content-addressed resources are an ideal fit and are usable at the pin; `resources/subscribe` is stdio-only, evidence-free, and removed in the current revision — **RATIFIED-AGAINST** | measured ([MCP surface deep read](2026-08-14-mcp-surface-deep-read.md) §3.2) | the introspection surface serves declarations as digest resources and builds no subscription product |
| MCP untyped-argument defect (`opaque` → `{}` schema) | measured, estate queue item 1 | named dependency for the search/config tools; not worked around |
| Three-tier retention keyed on refusal sort; turn-budget exhaustion refusal kind; typed migration plan as a journal fact; dual-record digest scheme (**owed grilling #2**) | measured demand rows F10, D8, K11, F6 | §6's rows cite these as existing demands rather than minting new ones; the upgrade row defers to the owed grilling |
| Ruling G12: programs, frames, toolkits are cataloged values with digests and walls, never files of prose config | ratified | extended to indexes, resources, directories, retention policies — one door, no exceptions |
| Architecture §5: MCP is the introspection and configuration surface; tools are derived from the same declarations the runtime executes, walled served-equals-derived; the served tool list is projected through the caller's writ | ratified-binding | the both-audience door for every surface in this part |

Effect v4 shapes below were re-checked against the vendored pin this
session (`repos/effect/packages/effect/src`, `effect@4.0.0-rc.108`):
`Schema.Schema<out T>` takes **one** type parameter (`Schema.ts:937`)
and the service-carrying form is `Schema.Codec<T, E, RD, RE>`
(`Schema.ts:1037`); `Effect.fn` (`Effect.ts:13563`);
`Context.Service` (used at `unstable/ai/EmbeddingModel.ts:36`);
`EmbeddingModel.embed` / `embedMany` and the `Dimensions` service
(`unstable/ai/EmbeddingModel.ts:53, :159-163`); `LayerMap`
(`LayerMap.ts:77`); `Reducer<A> extends Combiner<A>` (`Reducer.ts:54`);
`Cron.parse` / `Cron.next` / `Cron.match` (`Cron.ts:545, :789, :714`);
`Redacted.make` / `Redacted.value` (`Redacted.ts:187, :245`);
`McpServer.resource` including the URI-template overload
(`unstable/ai/McpServer.ts:1592-1632`). One shape mismatch found in a
binding record is filed as finding H-1 (§11).

---

## 4. S1 — search: indexes, queries, retrieval

### 4.1 C10 — the declared index

**Construct.** An index declaration is a canonical value:

```
{ lanes:      [<lane declaration digest>...]  // what it reads
  algebra:    <declared algebra digest>       // the answering state
  step:       <declared step digest>          // event → state
  partitions: <n>                             // ≤ the lanes' partitioning
  key:        <declared key derivation>       // partition assignment
  queries:    <declared query algebra digest> // the READ side
}
```

Its digest is the index's identity. Everything but `queries` is a fold
declaration (C4) verbatim, which is the whole point: **an index is a
fold whose state answers questions.** It deploys through
`Folds.deploy`'s discipline — anchor-guarded consumption, ack floor
advancing only after the anchor CAS lands, resumption as the only verb
(F3 + F2b at runtime).

The one new field is the read side. A **declared query** is canonical
data (a value with a digest — the estate's demand row G2 for
`structureMatches(pattern)` is exactly this shape), and the query
algebra is a declared pure function `(state, query) → result`. Purity
here is a *declaration constraint*, enforceable at admission and worth
stating precisely because it is where indexes usually rot:

- no wall clock, no `now`, no ambient locale, no process-local ordering;
- no randomness — an approximate index that needs a PRNG declares its
  **seed as declaration data** (so the seed is in the index digest) or
  refuses;
- ties broken by **identity order** (RFC 8785's UTF-16 code-unit sort —
  the order identity's own bytes use), never by insertion order, so
  top-k is a total function of the state rather than of the schedule.

**Result rows are certificates, not hints.** A query result carries the
shipped certificate shape unchanged: `schema` = the result schema
digest, `program` = the index digest, `input anchor` = the anchor the
query read, `span head` = the reading span. No new vocabulary is minted;
demand row G8's *"search cannot lie about identity"* is discharged by
re-derivation on the caller's side, as everywhere else.

### 4.2 Candidate law F11 — query determinism

> **F11 (candidate; STATED, NOT PROVEN).** For a declared index I with
> declared query algebra Q: `query(I, A, q)` is a function of the
> triple `(index digest, anchor A, query digest)` — equal triples give
> byte-equal result values.

Pedigree: this is **F7's shape one level down** (F7 says an assembly is
a function of program plus input values; F11 says a query is a function
of index plus anchored state plus query value), and its state half is
F3's — the anchor determines the state digest, so equal anchors mean
equal state. It is stated separately because its purity side conditions
(§4.1) are the content: F7 says nothing about clocks and seeds inside a
query algebra. Whether F11 is a corollary of F3+F7 or wants its own
twenty lines is **exactly the question for the coordinator**, and this
document does not decide it.

- Target rung: R5, home `verify/fabric` (zero-dep, estate toolchain) if
  it is admitted as its own statement.
- Consumers, named: the retrieval selector family (§4.5) — without F11,
  a context program containing a retrieval selector has no assembly
  determinism, and F7 is silently voided for every RAG-shaped program;
  the memo of query results at `(index, anchor, query)`; the MCP search
  tool's claim that two agents asking the same question at the same
  anchor see the same bytes.
- Consequence if ruled a law: the invalidation-free cache right (C4's
  uniqueness right) extends to query results with no new argument.

**Not claimed, ever:** anything about *relevance*. F11 governs identity
and provenance of results, never their usefulness — the same fence part
2 put around F7 and prompt quality. Demand row G11's rule is adopted as
API law: **ranking is a declared fold, else catalog order.** A model-
ranked result set may be produced, but it is an action outcome with its
own certificate — it never wears the index's certificate.

### 4.3 Freshness as a fact, staleness as an absence

The anchor already is the freshness fact:
`(index digest, partition) → (position floor, state digest, head)`. So
the API answers freshness with bytes and expresses freshness
*requirements* as preconditions:

```
Search.anchor(index)                     // the fact: floor, state digest, head
Search.query({ index, query, k })        // read at the current anchor
Search.query({ index, query, k, atLeastHead: h })
  // refuses with sort:"absence" until the anchor passes h
```

The refusal is the shipped absence sort — repealed by later presence,
and the only class the built-in retry policies touch (part 1 §8.1).
There is no `waitForFreshness`, no staleness tolerance in
milliseconds, and no blocking read anywhere: **the caller's freshness
need becomes typed backpressure**, which is what part 1's refusal sorts
were already doing for transport. F8's sentence carries over unchanged:
a result assembled at an anchor is never wrong later; it is a true
record of a DAG position, and folding forward repeals the absence.

### 4.4 Embeddings, and the honest treatment of ANN

**An embedding is a derived record.**

```
{ input:    <digest>              // what was embedded, by content address
  embedder: <capability digest>   // the cataloged model capability
  vector:   [...]  | { blob: <digest> } }
```

with the ordinary certificate. Producing it is an ordinary C7 action:
the action declaration pins the capability digest and the input anchor,
the work digest keys the register, and **at most one outcome lands per
`(input, embedder)` declaration** no matter how many workers race. The
provider seam is part 2's `Models`, extended to the pin's
`EmbeddingModel` service (`embed`, `embedMany`, and the `Dimensions`
service — read in place this session); vector dimension is declaration
data on the capability's output schema, so a mismatched vector refuses
structurally at the certifier rather than corrupting an index.

**Model drift is visible by construction.** The embedder's capability
digest is in every embedding record and therefore in the embedding
index's inputs. A new model, a new revision, a changed truncation rule
— each is a new capability digest, hence new declarations, hence a new
index digest. **Re-embedding is a new fold**, and the previous index
remains a true record at its own anchor (F8). The failure mode this
kills is the one every vector-store deployment eventually hits: a
partially re-embedded index that silently mixes two embedding spaces.
Here it is not representable — the two spaces are two indexes with two
digests.

**Exact search first.** For an embedding index whose state is the set
of `(input digest, vector)` pairs, the state is a grow-only set: ACI,
commutative class, partition-parallel by F4. Exact k-NN over that state
is a total deterministic function once ties break by identity order
(§4.1). Cost is O(N·d) per query per partition, which for corpora of
the estate's own scale is unremarkable, and the build-behind-consumers
precept says the approximate machinery waits for a measured consumer.

**Approximate search, sorted by the existing rights table.** HNSW, IVF
and their relatives build a structure whose shape depends on insertion
order and on random level assignment. That is precisely a **non-
commutative algebra**, so C4's declared-rights table sorts it without
anyone legislating a new rule:

| Right | Exact embedding index | Approximate (ANN) index |
| --- | --- | --- |
| resumption (F3) | yes — anchor resume | yes — the structure is part of the anchored state; the fold is sequential over the partition's own total order |
| partition-parallel merge (F4) | yes — the `Algebra.commutative` brand is earned | **no** — the brand is absent, so `partitions > 1` does not type-check |
| determinism | by the set | by `(index digest, declared seed, anchor)`; the seed is declaration data or the declaration refuses |
| recall | not applicable | **measured, never claimed** — a scoreboard number against exact search on the same anchor, never a ledger row |

This is the design's best evidence for "no new physics": the awkward
case sorts itself on machinery that already exists, and the awkwardness
shows up as an absent brand rather than as a caveat in prose.

**Hybrid retrieval** (lexical plus vector) is two indexes and a declared
merge fold over their result values — one more instance, no new
construct.

### 4.5 Retrieval as a selector family

Part 2's C6 selector list gains one production:

```
selector  retrieval  search(index, anchor, query, k)
```

and with it, F7's determinism extends to retrieval: **the assembled
context value's digest commits the index, the anchor, the query, and
k**, so an auditor reconstructs exactly what the model was shown,
including *why it was shown that* rather than something else. This is
the design's answer to reproducible RAG with provenance, and it costs
one selector production.

The volatility class falls out of the anchor, which is a useful DX
consequence rather than a new rule:

| Selector form | Volatility class | Consequence |
| --- | --- | --- |
| `search(index, **pinned anchor**, q, k)` | `session` | stable prefix; identical bytes across a fleet's actions; reproducible on replay |
| `search(index, **head-relative**, q, k)` | `live` | fresh, ordered after the stable segments, re-assembles to a new digest as the index advances |

Note what this aligns: the pinned form is simultaneously the
reproducible one *and* the one that sits in the provider-cacheable
prefix (part 2 §5.3). **DX rides the laws** — the cheap path and the
auditable path are the same path, and no one has to be told to prefer
it.

Renderers decide whether a retrieval segment carries bodies or digests
only; either way the segment records the digests of what it rendered,
so the retrieved set is auditable even when the bodies were elided.

### 4.6 Who may query, and through which door

Querying is **`read`** — the estate's existing writ verb. The harness
mints no verb, and W9's shape survives: the client states preconditions
and receives refusals; every authority check stays server-side.

Policy (C8) gains value fields, not authorities: an `indexes` allowlist
and a `resources` allowlist, meet-intersected on spawn like every other
policy field (F9). The same honesty box as C8 applies verbatim and is
repeated wherever a ledger row lands: **an allowlist is developer
experience, not security.** The security half is the connection's NATS
permissions plus server-side refusal plus the pending attribution
decision.

### 4.7 Introspection: what a human sees

Per architecture §5, every tool is *derived* from the declarations the
runtime executes, walled served-equals-derived, and projected through
the caller's writ. The search surface's tools:

| Tool | Reads | Notes |
| --- | --- | --- |
| `index.list` | index declarations in the caller's allowlist | derived from declarations |
| `index.describe` | one declaration + its query algebra | the declaration itself is also served as a digest **resource** |
| `index.anchor` | the anchor fact per partition | the freshness answer, in bytes |
| `search.query` | a query result page | rows carry certificates; pagination by the verifiable `{seq, head}`-shaped cursor (demand row G9), never MCP's opaque cursor |
| `search.explain` | the query digest, the anchor, the declared ranking fold | why these rows, at this anchor |

Serving declarations as digest-addressed resources is the MCP deep
read's own verdict — *"serve digests as resources — a strong, cheap
fit"* — with its two caveats carried: the pin has no way to *declare*
immutability in-protocol (no `CacheableResult` at rc.108), and
`resources/subscribe` is **RATIFIED-AGAINST** (stdio-only, carries no
evidence, removed in the current revision). No part of this surface is
built on subscriptions. The MCP untyped-argument defect is a named
dependency for the query argument, exactly as part 2 named it for the
agentic scene: this lane waits for the estate's fix rather than routing
around it.

---

## 5. S2 — resources, naming, retention

### 5.1 C11 — the resource declaration

**Construct.** A resource is a canonical value admitted through the
certifier:

```
{ schema:    <schema digest>          // what its values are
  family:    "lane" | "cell" | "blobs" | "edge"
  state:     <lane digest | cell coordinate | blob namespace | edge decl>
  access:    <access class>           // writ tier required to read / write
  retention: <retention policy digest>
  lineage:   [<digest>...] }          // predecessors; successor pinning
```

Three of the four families are fabric-resident and already exist: a
**lane** (declared evidence stream), a **cell** (lattice value in
commons KV), a **blob set** (content-addressed object storage). The
fourth — **edge capability** — is a declared door to something the
fabric does not hold: an external API, a database, a vendor endpoint.
Its records are evidence *about* an interaction, never the external
state itself, and the distinction is load-bearing for §6.3's bound.

Why a declaration rather than a config file: ruling G12, applied
without exception. A resource has a digest, so it diffs, refuses on
absence, carries a wall, and enters certificates as an input anchor. A
YAML file does none of those things, which is why "no YAML of
semantics exists" is a fence rather than a preference.

### 5.2 Edge capabilities and the secret that never enters identity

An edge-capability declaration names *what* and *where*, never *the
password*:

```
{ protocol:  <declared protocol/capability digest>
  endpoint:  <declared reference>      // a name resolved at the boundary
  auth:      <declared reference>      // a NAME, never a value
  schemaIn / schemaOut: <digest>
  policy:    <digest> }
```

The secret lives only in the runtime Layer, as the pin's
`Redacted<string>` (`Redacted.make` / `Redacted.value`), supplied from
the environment — which is exactly the boundary the architecture
already drew: *"only connection bootstrap (URLs, credentials) stays
environmental."* The invariant is enforceable without new mathematics:
**the wire grammar admits no secret carrier**, so a declaration that
tries to embed one has no canonical form and the certifier refuses it
structurally. Vault mechanics (which secret store, which rotation
policy) are deployment configuration behind that seam and carry no
identity role whatsoever.

What this buys: a fleet's external connections are *cataloged*,
diffable, and attenuated by the policy lattice (an edge capability in a
parent's allowlist and not in `parent ⊓ requested` is unreachable to
the child by F9), while the credential itself never becomes a fabric
value that could federate, replay, or land in a context.

### 5.3 The directory — naming as a lattice cell

A **directory** is a cell (C1) whose value is a map from **petname** to
a **set of digests**:

```
Directory ≔ Map<Petname, Set<Digest>>      join = componentwise union
```

Both levels are grow-only, so the join is total and F1 applies
verbatim: **binding-append is monotone, coordination-free, and
duplicate-safe.** Two nodes binding the same name concurrently do not
conflict at the substrate level; they produce a two-element set, and
the ambiguity becomes a *read-time* question rather than a write-time
race. That placement is the CALM discipline doing its job: the fabric
never coordinates to accept information, only to decide.

`resolve(directory, name, anchor)` has exactly three answers:

| Observed | Answer |
| --- | --- |
| exactly one binding | the digest |
| no binding | **absence** refusal — head-relative, repealed by a later bind; the retry class |
| more than one binding, no seal | **structural** refusal `ambiguous-binding`, listing the candidates and naming the legal next move (a rebind under the declared authority) — W7's *replies teach* discipline, carried in the refusal's `next` field (`proto/SPEC.md:53`) |
| more than one binding, sealed | the binding sealed at the **greatest observed fencing token** |

### 5.4 Rebinding, and candidate law F12

Rebinding decides that a candidate set is complete — CALM's non-
monotone act — so it is a coordination point, and part 1 §5.2's rule
("evidence is never fenced; only outcomes are") places it precisely: a
rebind is a **register act** keyed by `(directory digest, petname)`,
granted and committed under a monotone fencing token (C5/F5), and its
sealed outcome re-enters the monotone plane as a fact — the same
inflationary-tombstone idiom the fabric already uses for session close.

The arbitration order is therefore **the token order, not time.** F5
gives strictly increasing tokens per register and at most one landed
commit per token; "the greatest observed token wins" is thus a
well-defined function of the observed set, which is what
`fence_deterministic` (proven) demands of any arbitration rule: a
function of the candidate set alone. No clock enters naming.

> **F12 (candidate; STATED, NOT PROVEN).** Resolution is a
> head-relative read determined by `(directory digest, anchor,
> petname)`: with no seal, resolution is the singleton binding, an
> absence refusal, or an ambiguity refusal; with seals, resolution is
> the binding sealed at the greatest observed token; and a rebind lands
> only under the declared rebind authority.

Pedigree: the monotone half is F1 (componentwise union of grow-only
structures), the arbitration half is F5 plus `fence_deterministic`, and
the head-relativity is F8's. What is genuinely new is the *composition*
— resolution reading across both planes in one operation — and whether
that composition deserves its own statement or decomposes into F1+F5 is
the coordinator's ruling to make, not this document's. Target rung R5
for the pure half, home `verify/fabric`; the register half rides the
Veil-pinned F5 package. **Consumers, named:** `Resource.resolve`;
deploying "the current" context program, policy, or index by name;
any human-facing surface that shows a name instead of a hex64.

**"Latest" is head-relative, never ambient.** `resolve` takes an
anchor; there is no zero-argument form, and the API exposes none. A
deployed action never carries a name — it carries the digest that a
resolution produced, and **the act of resolving is journaled
evidence**. The classic failure ("it worked yesterday; nobody knows
what `prod` pointed at then") is answered by a fact: what resolved, at
which anchor, under which seal.

### 5.5 Retention and compaction

Plait licenses nothing the estate refuses. The standing discipline is
carried verbatim: compaction replaces a prefix by its `(head, fold
state)` pair, and what is lost — step-through inside the discarded
prefix — is lost *only ever by explicit choice*; the session journal
refuses compaction outright until certification can export structural
refusals, let absence refusals die with the trace, and preserve the
state digest plus corpus digest as evidence of the summarized prefix
(shipped discipline, CONTEXT.md). The estate's three-tier
retention-keyed-on-sort demand (row F10) is the shape any richer policy
should take, and it belongs to the estate's queue, not this lane's.

What part 3 adds is two things, both consequences:

1. **Retention posture is cataloged.** The retention policy is a
   declaration with a digest, referenced by the resource; "what may be
   dropped here" is a value that diffs and refuses, not an operator's
   memory. Part 1's risk 4 (KV growth for registers and anchors) gets
   its posture stated at the resource's slice rather than inherited
   silently from a NATS default.

2. **The compaction horizon is derived, not chosen.** Because a fold
   resumes from its anchor floor and F3 makes that resumption exact, a
   prefix is safe to compact exactly up to **the minimum anchor floor
   across every deployed fold and index reading that lane**. That is a
   computable fact the API can serve (`Retention.horizon(lane)`), and a
   compaction act beyond it is refused rather than warned about. The
   rule is read off F3; nobody invents a retention heuristic.

Compaction itself is an **act**: fenced, journaled, attributed,
carrying the `(head, state digest)` pair it replaced as evidence. It is
never a background process with a cron and a shrug.

### 5.6 Both audiences, one door

Every declaration in this part — index, resource, edge capability,
directory binding, retention policy — is submitted through the
**certifier**, cataloged, digested, refusable, diffable, walled
(ruling G12). The MCP surface is where both audiences meet it:

| Plane | Tools (derived, writ-projected) |
| --- | --- |
| introspect | `resource.list` / `resource.describe`; `directory.list` / `directory.resolve` (anchor required); `retention.horizon`; declarations served as digest resources |
| configure | `resource.declare`; `directory.bind`; `directory.rebind` (fenced — requires the rebind authority and returns the token); `retention.declare` |

An agent and a human see the same tools, differing only by writ
projection, because both are reading the same derivation of the same
declarations. That is the "legible and configurable by agents AND
humans through one door" mandate discharged by construction rather than
by maintaining two surfaces.

---

## 6. S3 — the composition inventory

Twelve production concerns, each mapped to machinery. Column meanings:
**covered-by-construction** cites the construct that already does the
work; **needs-API-only** names a surface to build with no new
mathematics; **needs-a-law** flags a candidate and its consumer, and
states the law's *content* nowhere — that is the coordinator's.

### 6.1 The gap table

| # | Production need | Covered by construction | Needs API only | Needs a law |
| --- | --- | --- | --- | --- |
| 1 | **Scheduling / cron** | C9 + ruling G9: the trigger algebra is monotone-only and the **deadline seat** is the sanctioned non-monotone door; the firing's at-most-once-landed property is C7's register | `Schedule.declare` as a *protocol value* (the pin's `Cron` is a pure value module — `parse`/`next`/`match` — so a schedule is canonical data with a digest, and only the seat's *act* is authority); the deadline fact stays journaled evidence, per part 2 §6.3 | — |
| 2 | **Observability** | journal-native: a **span** id *is* the segment's chain head, so it is recomputable rather than assigned; certificates carry derivation; `Effect.fn` names every exported effectful function and telemetry rides the built-in tracing exported via the standard Otlp modules (architecture §4) | a dashboard reads **declared folds** over lanes and journals — the estate's own row C11: *"the fold algebra IS the metrics engine"*; a counting metric is commutative but not idempotent, so it rides the **F2b position-floor guard** and needs no dedup layer | — |
| 3 | **Quotas / budgets** | C8 policy fields (`budgets`), meet-intersected on spawn (F9); part 2 §7 already fences them: budgets are **liveness machinery**, never in identity, never gating meaning | a budget-exhaustion **refusal kind** — the estate already named this as an unbuilt demand (row D8: *"exhaustion of a turn budget is an ordinary typed refusal, and the surface needs one"*); edge rate limiting is a boundary concern behind the edge capability | — |
| 4 | **Multi-tenancy** | venues (one single-writer daemon per tenant boundary) + NATS accounts/users at the pin + the policy lattice with F9 attenuation | `LayerMap` keying granularity — the architecture's own open seam ("per-venue vs per-account, decide when E7 makes it real"); a venue map per account | — · **but see the fence below**: a tenancy *isolation claim* is an attribution claim, and attribution is decided elsewhere |
| 5 | **Secrets / connections** | edge capability (§5.2): the declaration is cataloged, the secret is environmental and `Redacted` at the boundary, and the wire grammar admits no secret carrier | the certifier's structural refusal for a secret-bearing declaration; the vault seam as deployment configuration | — |
| 6 | **Human approval steps** | holes + seats: **a human is a seat**, and part 2 §5.4 already types the grader as "a lower- or higher-tier model, a human, or a test harness — the fabric cannot tell and does not care"; the approval itself is a fill, and finality is close under declared authority | an approval-shaped capability + the deadline-seat pattern for expiry; the pin's `McpServer.elicit` is the human-facing door where MCP is the transport | — · human *identity* inherits the attribution fence (G4) |
| 7 | **Failure / retry ergonomics** | refusal sorts as typed backpressure: **absence** = retry class, **structural** = repair class (shipped, part 1 §7.1); attempt/round separation is definitional in C7 — a retry re-claims the same work digest, a revision is a new declaration pinning its predecessor | retry policies bound to `sort: "absence"` only (part 1 design rule 1), expressed with the pin's `Schedule`; a refusal scoreboard by kind/sort, which the demo already demands | — |
| 8 | **Search / indexes** | §4 — a fold with a query algebra | `Index.declare` / `Search.query` / `Search.anchor` | **F11** (query determinism), §4.2 |
| 9 | **Naming / directories** | §5.3–5.4 — a lattice cell plus a fenced rebind | `Directory.bind` / `resolve` / `rebind` | **F12** (resolution), §5.4 |
| 10 | **Backpressure / flow control** | pull consumers with explicit ack; the ack floor advances only after the anchor CAS lands; ack is flow control, never correctness (part 1 §6.3) | consumer-shape defaults per lane declaration; the scoreboard's redelivery counts | — |
| 11 | **Versioning / migration of declarations** | new digest + successor pinning: a changed declaration *is* a new value, and `lineage` records the predecessor; old anchors stay true records (F8) | a successor-declaration surface and a migration **fact** (the estate's demand row K11: *"at anchor k, run R under D_old adopts a continuation under D_new"*) | **YES — flagged, not answered.** Candidate: *what a declared successor licenses* for folds, anchors, and results already keyed by the predecessor's digest. The estate already owes itself this ruling (row F6, the dual-record digest scheme, **owed grilling #2**, which settles ticket 004's re-derive-vs-dual-record question). Consumers: every long-lived index, every deployed fold, every cataloged context program. Plait states its consumers and waits |
| 12 | **Erasure of admitted content** | nothing — and the honest answer is that content addressing plus append-only journals plus federated replicas is the hard case for erasure, not the easy one | — | **YES — flagged, not answered.** Candidate: *erasure that does not falsify an append-only, tamper-evident record.* Nearest existing discipline is compaction ("loss only ever by explicit choice"), which preserves the `(head, state digest)` pair precisely so that nothing is falsified. Consumers: any deployment carrying third-party data; any commons shared across a trust boundary. This document does **not** state the law |

### 6.2 The tenancy fence, stated plainly

Row 4 deserves its own sentence because it is the row most likely to be
misread as delivered: **Plait can partition tenants, and cannot yet
claim isolation between them.** Venues, accounts, and the policy lattice
give the mechanics; but part 1's measured finding stands — seat bindings
are unauthenticated strings and any credentialed connection may act as
any bound principal — so an isolation *claim* is an attribution claim,
and attribution is an undecided estate grill (ruling G4 gates it). A
deployment may run many tenants under one operator's credentials; a
deployment may not advertise cross-tenant isolation until the
attribution decision lands. This sentence belongs in any ledger row that
touches tenancy.

### 6.3 The external-effect bound

The most valuable thing the harness plane can say about actions is a
limit, not a capability:

> **At-most-one *landed outcome* is not at-most-one *external side
> effect*.** C7's register guarantees that at most one outcome record
> lands per action declaration, under arbitrary duplicate scheduling,
> racing claimants, and crash-steal interleavings. It guarantees nothing
> about the world outside the fabric. A worker that calls a payment API
> and then loses its lease before committing has already called the
> payment API.

What the design offers, and its price:

- **Where the vendor supports an idempotency key, the work digest is
  the natural one** — it is stable across retries of the same
  declaration by construction, and it changes for a new round by
  construction. That is a real, cheap alignment.
- **Where the vendor supports none, the bound is the bound**, and the
  ledger says so. The mitigation is declaration granularity (make the
  fenced unit the externally-visible unit) plus the estate's compensating
  pattern of choice — never a claim that the fabric made a foreign API
  transactional.

This bound is the action-plane twin of part 1's refusal to claim
exactly-once delivery, and it is stated here because a harness is
exactly where someone will otherwise assume it away.

---

## 7. The API surface, collected

### 7.1 Module map delta

Against the architecture record's binding map (§2), part 3 proposes
**four** new modules and no changes to existing ones:

```
packages/plait/src/
  Index.ts        declared indexes: fold + query algebra; anchors; deploy handle
  Search.ts       the read side: query, anchor, explain; the retrieval selector
  Resource.ts     cataloged resource declarations over the four substrate families
  Directory.ts    petname → digests; monotone bind; fenced rebind; anchored resolve
```

Scheduling gets **no module** — it is a declared value plus the existing
deadline-seat pattern, and adding a `Schedule.ts` would both duplicate
C9 and collide with the pin. Retention rides `Resource.ts` as a
declaration kind plus one derived read (`horizon`).

Two naming collisions with the `effect` barrel are noted rather than
hidden: the pin exports `Resource` (a refreshable scoped value,
`index.ts:497`) and `Schedule` (`index.ts:512`). A user writing
`import { Resource } from "effect"` and `import { Resource } from
"@foldlab/plait"` in one file must alias. This is filed as finding H-2
(§11) and offered as a grill row (G24) rather than decided here; the
`Schedule` half is avoided by not minting the module at all.

### 7.2 Service surface delta

```
Indexes     declare / deploy / anchor            (rides Folds' discipline)
Search      query / explain / selector           (read verb only)
Resources   declare / describe / resolve
Directories bind / resolve / rebind              (rebind is a Registers act)
Retention   horizon / declare
```

### 7.3 What the API refuses (part-3 additions to part 1 §8.5 and part 2 §6.4)

- **An unanchored resolve.** There is no ambient "latest"; `resolve`
  takes an anchor and journals its act.
- **A wall-clock, a `now`, or an undeclared seed inside a query
  algebra.** Each refuses at declaration; a seed that is not declaration
  data is not a seed, it is nondeterminism.
- **`partitions > 1` on a non-commutative index** — the same brand gate
  as F4, which is what sorts ANN structures automatically.
- **A model-ranked result set wearing the index's certificate.** Ranking
  is a declared fold else catalog order; a model ranking is an action
  outcome with its own certificate and its own attribution.
- **A secret-bearing declaration.** No canonical form, structural
  refusal.
- **A silent rebind.** Rebinding without the declared authority and its
  token does not exist; there is no "force" flag.
- **A compaction past the horizon.** Refused, not warned.
- **An index subscription surface built on MCP `resources/subscribe`**
  — RATIFIED-AGAINST by the MCP deep read; the verifiable cursor is the
  door.
- **A blocking freshness wait.** Freshness preconditions refuse with the
  absence sort; the caller retries under the shipped policy.

---

## 8. Sketches

Shapes checked against the vendored pin this session (§3 lists the
citations); exact signatures are re-confirmed against
`node_modules/effect/dist/*.d.ts` when the package lands, per AGENTS.md.

**An index is a fold with a query side.** The brand gates partitioning
exactly as it does for folds — F4's right, unchanged:

```ts
import { Effect, Reducer, Schema } from "effect"
import { Algebra, Index, Lane, Query } from "@foldlab/plait"

// The query is canonical data with a digest — not a closure, not a string.
const TermLookup = Query.declare({
  input: Schema.Struct({ term: Schema.String, k: Schema.Int }),
  output: TermHitRows,
  // pure: (state, q) => rows. No clock, no seed, no ambient anything.
  answer: lookupTerms
})

const TermIndex = Index.declare({
  lanes: [DistillLane],
  algebra: Algebra.commutative(Reducer.make<TermPostings>(mergePostings, empty)),
  step: (state, e: DocEvent) => addPostings(state, e.terms),
  partitions: 8,                 // type-checks only under the earned brand
  queries: TermLookup
})
```

**A query is a read over anchored state, and freshness is a refusal.**

```ts
// No waiting primitive: `atLeastHead` refuses with sort:"absence" until
// the anchor passes h, and the shipped retry policy is the only thing
// that touches that sort.
const hits = Effect.fn("search.terms")(function* (term: string, h: Head) {
  return yield* Search.query(TermIndex, TermLookup, { term, k: 20 }, {
    atLeastHead: h
  })
  // rows carry the shipped certificate: schema, program = index digest,
  // input anchor, span head. The caller re-derives; nothing is trusted.
})
```

**Retrieval inside a context program** — the whole point of §4.5. The
program is data, and the pinned anchor is what makes the segment both
reproducible and prefix-cacheable:

```
program review/lead@<digest>:
  static   frame     catalog:flb.frame.review-lead@<digest>
  policy   writ      policy:<self>
  session  protocol  session:<self>.protocol
  session  retrieved search(index:<TermIndex digest>,
                            anchor:<pinned anchor digest>,   // ← session class
                            query:<query digest>, k:20)
  live     frontier  frontier(session, seat=<self>)
  turn     hole      hole:<digest>
```

**An embedding index over embedding evidence**, with the embedder pinned
by capability digest so drift is a digest change:

```ts
// Producing embeddings is an ordinary action: the register fences it,
// so at most one outcome lands per (input, embedder) declaration.
const embed = Actions.handler(EmbedDoc, (input) =>
  Effect.gen(function* () {
    const { vector } = yield* Models.embed({ capability: Embedder, input })
    yield* Lanes.emit(EmbeddingLane, { body: { input: input.digest,
                                               embedder: Embedder.digest,
                                               vector } })
  })
)

// Exact first: the state is a grow-only set, so the brand is earned and
// partitions are licensed. An ANN structure would not earn it (§4.4).
const VectorIndex = Index.declare({
  lanes: [EmbeddingLane],
  algebra: Algebra.commutative(Reducer.make<VectorSet>(unionVectors, empty)),
  step: (s, e) => addVector(s, e),
  partitions: 8,
  queries: NearestK                    // ties break by identity order
})
```

**A resource, and a directory that refuses to guess.** Resolution is a
schema whose decode requires services — the architecture's Schema-R move,
written with the pin's actual constructor (`Schema.Codec<T, E, RD, RE>`;
see finding H-1):

```ts
// The declaration is cataloged; the secret is not in it.
const Warehouse = Resource.declare({
  schema: RowSchema, family: "edge",
  state: Edge.declare({ protocol: Postgres, endpoint: "warehouse.primary",
                        auth: "warehouse.readonly" }),  // NAMES, not values
  access: "read:analyst", retention: RetainForever
})

// Petname → value, resolved at an anchor. There is no unanchored form.
export interface Bound<A>
  extends Schema.Codec<A, Petname, Directory | Catalog | Blobs> {}

const program = yield* Directory.resolve(Programs, "review/lead", anchor)
// ambiguous → structural refusal listing candidates + the legal next move
// absent    → absence refusal, repealed by a later bind
```

**A rebind is a register act**, so it looks like every other fenced
outcome in the fabric:

```ts
// The greatest landed token wins resolution (F5). No clock, no LWW.
yield* Registers.hold({ work: Directory.rebindWork(Programs, "review/lead") },
  (token) => Directory.rebind({ directory: Programs, name: "review/lead",
                                to: newProgram.digest, token })
)
```

---

## 9. Amendments proposed to parts 1–2

Proposals only — the epic map and the slice ladder are the
coordinator's, and this document restructures neither.

1. **Constructs.** C10 (the declared index) and C11 (the resource
   declaration, including the directory as a cell) join C1–C9.
2. **Candidate laws.** F11 (query determinism) and F12 (resolution)
   are stated, not proven, each with target rung R5 and home
   `verify/fabric` **if** the coordinator rules them separate
   statements rather than corollaries (§4.2, §5.4).
3. **Selector family.** C6 gains the retrieval production, with the
   volatility rule of §4.5 (pinned anchor ⇒ `session`; head-relative ⇒
   `live`).
4. **Policy.** C8 gains `indexes` and `resources` allowlists as value
   fields, meet-intersected on spawn (F9). No writ verb is added;
   querying is `read`.
5. **Slice candidates**, offered for placement rather than inserted:
   *slice 1b — the index*, gated on a byte-identical re-query wall
   across TS/Go at a pinned anchor plus a negative control (a query
   algebra reading a clock is refused at declaration); *slice 2b —
   resources and the directory*, gated on a concurrent-bind convergence
   vector (two nodes, same name, ambiguity refusal), a rebind
   interleaving corpus replayed from the F5 register model, and a
   negative control (a stale-token rebind lands ⇒ the gate names the
   missing law).
6. **Demo scoreboard additions** (measured facts, not claims): index
   anchor lag at quiesce; query results re-derived identically by three
   independent readers at a pinned anchor; exact-vs-approximate recall
   if an ANN index exists at all; count of ambiguity refusals and
   rebinds with their tokens; compaction horizon vs the minimum anchor
   floor.
7. **Ledger discipline unchanged**: nothing here enters VERIFICATION.md
   before its slice lands (ruling G6), and this document writes no
   ledger text.

---

## 10. Risks and honest bounds (additions)

1. **F11 and F12 may not be laws.** Both may reduce to F3+F7 and F1+F5
   respectively, in which case the right outcome is a corollary note in
   `verify/fabric` and no new theorem. Stating them as candidates is the
   point; a lane that proves a redundant theorem has spent budget on
   ceremony.
2. **No theorem touches relevance.** F11 governs identity and
   provenance of query results, never their usefulness — the same fence
   part 2 put on prompt quality. A bad index answers deterministically.
3. **Exact search has a scaling wall**, and this design accepts it for
   v0 rather than buying ANN's complexity before a measured consumer
   exists. When one exists, §4.4 states the shape the approximate index
   must take; the wall is a cost, not a correctness risk.
4. **The directory's ambiguity refusal will feel strict.** Two honest
   concurrent binds produce a refusal on read until someone decides.
   That is CALM placing the decision where a decision belongs, and the
   rebind authority is the pressure valve — but it is a real ergonomic
   cost and the demand for a "just pick one" default should be treated
   as a grill item, not a bug report.
5. **Tenancy is mechanics, not isolation** (§6.2), until attribution
   lands.
6. **The external-effect bound is permanent**, not a v0 gap (§6.3). No
   future slice removes it; only vendor idempotency keys narrow it.
7. **Two rows of the gap table have no answer** (upgrade, erasure) and
   the design deliberately does not manufacture one. The upgrade row is
   already owed upstream as the estate's grilling #2; a Plait-local
   answer would front-run an estate decision, which seat law forbids.
8. **MCP dependencies are real.** The untyped-argument defect gates the
   search tool's argument shape, and the pin cannot declare resource
   immutability in-protocol. Both are named, neither is worked around.

---

## 11. Findings filed against the ratified records

Per seat law, findings against ratified records are FILED, not fixed.
None of the four below is repaired in this branch.

**H-1 — the architecture record's Schema-R sketches use the wrong
constructor arity for the pin.** Architecture §3 writes
`export const Digest: Schema.Schema<Digest, string>` and
`export interface Resolved<A> extends Schema.Schema<A, Digest, Catalog |
Blobs> {}`. At `effect@4.0.0-rc.108`, `Schema.Schema<out T>` takes
**one** type parameter (`repos/effect/packages/effect/src/Schema.ts:937`,
`extends Top` with only `Type` and `Rebuild`); the form carrying encoded
type and decoding services is `Schema.Codec<out T, out E = T, out RD =
never, out RE = never>` (`Schema.ts:1037-1042`), with `Decoder<T, RD>`
as the decode-only view (`:1060`). The R-channel *design* is sound and
supported; only the written signature is wrong. Suggested disposition
(the coordinator's to make): restate as
`Schema.Codec<A, Digest, Catalog | Blobs>`. Severity: low —
documentation-level, caught before the scaffold lands, but it is exactly
the class of error the "shape-check against the pin, never memory" rule
exists to catch.

**H-2 — two proposed module names collide with the `effect` barrel.**
The pin exports `Resource` (`src/index.ts:497` → `Resource.ts`, a
refreshable scoped value) and `Schedule` (`:512`). A Plait module named
`Resource` forces an alias in any user file importing both barrels.
Filed as a DX cost of the flat-one-concept-per-module convention the
architecture adopts wholesale from the exemplar; §7.1 avoids the
`Schedule` half by minting no such module, and offers the `Resource`
half as grill row G24.

**H-3 — the `Venues` service has no owning module in the architecture
map.** Part 1 §8.2 lists `Venues` ("the request plane: sessions, fills,
close, frontier, catalog") in the service surface; the architecture's
package map (§2) has no `Venue.ts`, and the nearest modules — `Catalog.ts`
and `Guidance.ts` — cover the catalog and frontier halves only, leaving
sessions, fills, and close unowned. This is the same defect shape as the
DEV-697 Catalog finding that the architecture record already records and
repaired ("§3 referenced the service with no module owning it").

**H-4 — `Seats` is used in a part-2 sketch but is listed in no service
roster and owned by no module.** Part 2 §6.3's non-monotone-door sketch
calls `Seats.deadline({...})` and `Seats.close`; part 2 §6's service
list (`Capabilities`, `Contexts`, `Actions`, `Triggers`, `Models`,
`Toolkits`, `Guidance`) does not include `Seats`, and the architecture's
module map has no `Seat.ts`. Since the deadline seat is ruling G9's
sanctioned non-monotone door, the surface that expresses it should have
an owner. Same shape as H-3.

---

## 12. The grill sheet — open rulings

One decision at a time, recommended option first, per house style.

- **G13 — adopt part 3 as the harness plane.** Recommended: yes —
  C10/C11 into the construct set, F11/F12 into the proof plan as
  *candidates*, slice candidates offered for placement, gap table
  adopted as the production-readiness map. Alternative: take S1 only and
  defer resources/composition (loses the inventory that shows how little
  is actually missing).
- **G14 — an index is a declared fold plus a declared query algebra,
  and F11 is stated as a candidate law.** Recommended: yes, with the
  coordinator ruling whether F11 is a separate statement or a corollary
  of F3+F7. Alternative: indexes as an opaque service (loses the memo
  right, the certificate shape, and the determinism claim retrieval
  depends on).
- **G15 — approximate (ANN) indexes are non-commutative-class folds:
  single-partition, resumable by F3, never merged by F4, seed as
  declaration data, recall measured and never claimed; and v0 ships
  **exact** search only, with the approximate shape specified but
  unbuilt until a measured consumer exists.** Alternative: build ANN now
  (violates build-behind-consumers); or refuse approximate search
  permanently (forecloses a real need on no evidence).
- **G16 — embeddings are derived records produced by ordinary actions,
  pinning the embedder capability digest; re-embedding is a new fold.**
  Recommended: yes. Alternative: a mutable index with in-place upsert —
  refused by the design's own thesis and listed only because it is what
  every vector store does.
- **G17 — retrieval enters context programs as a selector family
  pinning `(index, anchor, query, k)`, with volatility class determined
  by whether the anchor is pinned.** Recommended: yes. Alternative:
  retrieval outside assembly (voids F7 for every RAG-shaped program).
- **G18 — a resource is a cataloged declaration over four substrate
  families; edge capabilities never enter identity and secret-bearing
  declarations refuse structurally.** Recommended: yes. Alternative:
  resources as environment configuration (loses the G12 door, the
  diffing, and the attenuation).
- **G19 — the directory is a grow-only map to grow-only sets; ambiguity
  is a structural refusal; rebind is a fenced register act ordered by
  fencing token; F12 stated as a candidate.** Recommended: yes.
  Alternative: an LWW name map — already refused by part 1 §8.5, listed
  for completeness. Second alternative: single-binding with
  create-if-absent only (simpler, but makes an honest concurrent bind a
  hard failure rather than a decidable ambiguity).
- **G20 — no unanchored resolve; "latest" requires an anchor and the
  resolution act is journaled.** Recommended: yes. Alternative: ambient
  latest (convenience now, an unanswerable "what did it point at?"
  later).
- **G21 — retention policy is cataloged declaration data, compaction is
  a fenced act, and the compaction horizon is derived as the minimum
  anchor floor across deployed folds.** Recommended: yes, with the
  fabric-KV posture stated at its slice rather than inherited from a
  NATS default. Alternative: defer retention entirely to the estate's
  row-F10 lane (leaves part 1 risk 4 unanswered where it bites first).
- **G22 — the declaration-upgrade question is deferred to the estate's
  owed grilling #2 (dual-record digest scheme), with Plait naming its
  consumers.** Recommended: yes. Alternative: answer it in this lane —
  refused by seat law, and it would front-run ticket 004's open
  migration question.
- **G23 — the external-effect bound is stated in the design and in
  every ledger row that touches actions: at-most-one landed outcome is
  not at-most-one external side effect; the work digest is offered as
  an idempotency key where a vendor supports one.** Recommended: yes.
  Alternative: silence — unacceptable, and named as such.
- **G24 — module naming against the `effect` barrel** (finding H-2).
  Recommended: keep `Resource` (the domain word is right for both
  audiences and matches MCP's own vocabulary) and state the alias rule
  in the module's JSDoc. Alternative: rename to `Holding` or
  `Substrate` (avoids the collision, costs the plain word that makes
  the surface legible to outsiders).

---

## 13. Glossary additions

| Term | Meaning |
| --- | --- |
| index | a declared fold whose state answers declared queries; identity is the declaration digest |
| declared query | a query carried as canonical data (hence with a digest), answered by a declared pure function of `(state, query)` |
| query algebra | the read side of an index declaration |
| freshness fact | the index's anchor, read as the byte answer to "how current is this?" |
| embedding evidence | derived records `{input digest, embedder capability digest, vector}` folded into an embedding index |
| resource | a cataloged declaration `{schema, family, state, access, retention, lineage}` over one of the four substrate families |
| edge capability | a declared door to something outside the fabric; held at the boundary, never in identity |
| directory | a lattice cell mapping petnames to sets of digests; append is monotone, rebind is fenced |
| petname | a human-readable name that a directory binds to a digest; never an identity |
| rebind authority | the declared authority whose fenced act picks among a petname's bindings |
| compaction horizon | the minimum anchor floor across deployed folds on a lane — the derived limit of what may be compacted |
| harness plane | this part's subject: search, resources, and the production-composition inventory over parts 1–2 |

---

## 14. Sources

Program records, read in place this session on
`agent/design-cc-pc/76983e01` at `b294e8d`:
`docs/design/2026-08-17-plait-coordination-fabric.md` (part 1, whole);
`docs/design/2026-08-17-plait-action-plane.md` (part 2, whole);
`docs/design/2026-08-17-plait-ratification-record.md` (rulings G1–G12,
execution directives, charter);
`docs/design/2026-08-17-plait-architecture.md` (binding module map,
Schema-R core, MCP surface, codegen, open seams).

Estate records, read in place: `AGENTS.md` (seat law, working precepts,
Effect pin discipline); `CONTEXT.md` (canonical encoding, constrained
decode, chain head, compaction, anchor, span, certificate, catalog,
certifier, declared algebra/step/right, commutativity class, effector,
refusal, identity order); `docs/design-effect-conventions.md`;
`docs/design/2026-08-14-estate-structures-map.md` (demand rows C11, D8,
F6, F10, G1, G2, G8, G9, G11, K11 — the catalog-as-query-surface
section is this part's S1 pedigree);
`docs/design/2026-08-14-mcp-surface-deep-read.md` (§3.2 resources and
subscriptions: "serve digests as resources" / subscriptions
RATIFIED-AGAINST; the revision finding; completion's honest use).

Vendored Effect source, read in place at `effect@4.0.0-rc.108`
(`repos/effect/packages/effect/src`): `Schema.ts:937` (`Schema<out T>`),
`:1037` (`Codec<T, E, RD, RE>`), `:1060` (`Decoder<T, RD>`);
`Effect.ts:13563` (`fn`), `:13439` (`fnUntraced`);
`Cron.ts:294, :545, :714, :789`; `LayerMap.ts:77`; `Reducer.ts:54`;
`Combiner.ts:41`; `Redacted.ts:56, :187, :245`;
`index.ts:117, :462, :497, :512` (barrel exports, finding H-2);
`unstable/ai/EmbeddingModel.ts` (whole — `EmbeddingModel`, `Dimensions`,
`Service.embed`/`embedMany`, `make`);
`unstable/ai/McpServer.ts:1413, :1592-1632` (`registerResource`,
`resource` with the URI-template overload), `:1828` (`elicit`);
module rosters for `unstable/` (`ai`, `observability`, `persistence`,
`cluster`, `workflow`) — the last two noted and not adopted, per part 1
§3's refusal of Effect durable execution.

No external sources were fetched for this part; every NATS and provider
claim it relies on is carried at the tier parts 1–2 recorded, not
re-fetched.
