# Search in native estate idioms — the implementation shape, and the tracer slices that build it

Date: 2026-08-18. Status: **EXPLORATORY consultation note, pre-grill.**
Written by the search-design seat against `main` at `7223ff79fd` in
response to a coordinator commission. The estate has already ruled what
search **is**; this note designs the implementation shape that honors
those rulings and cuts it into slices. It changes no code, no ledger
row, no ticket, no gate, and no seam status. It ran nothing. Its only
write is this file.

Confidence tiers, as the house uses them: **ratified** (grill record or
standing ruling) · **proven** (a Lean theorem behind a green gate, cited
by its real name) · **measured** (a ran-it result in a durable estate
document) · **shipped** (code on main, read in place this session) ·
**proposed** (this note's own design) · **lead** (external, unverified
here).

Three fences ride every sentence.

- **Safety only.** Nothing below claims liveness, termination, or
  throughput. No index is claimed to be fast; tier assignments are
  ordering claims (cost-ladder §10.5).
- **No relevance claim, ever.** F11 governs the identity and provenance
  of a result set, never its usefulness — part 3 §4.2's fence, carried
  verbatim. An LLM-ranked result set is an author claim wearing a
  certificate's clothes (demand row G11), and this note treats that as
  API law.
- **No new physics.** Search is the `fold` generator (ruling C10); this
  note mints no generator, no declaration kind, no wire name, and — one
  small exception, argued in §4.4 — no refusal kind.

---

## 0. Two citation corrections, before anything is built on them

The commission's citations were verified in place. Two need correcting,
and both change what a ticket may safely cite.

**KM-22 is not on `main`.** It exists at commit `50b02b2` ("Pin KM-22
and KM-23: the data-processing strata and the placement hint plane"),
reachable from the worktree branches `worktree-agent-abebebb7a9878a1ed`
and `worktree-agent-af3166ca211c3bdd2`, and **not** from `origin/main`.
Its text is exactly as the commission summarizes it: transduction is
algebraic at the transition-monoid and semiring level (a *sideways*
variety extension the HSP discipline absorbs, riding `KindContent
.algebra` as declared data rather than new grammar); the ill-behaved
core — ANN graph construction, clustering — "does not become lawful by
renaming: it enters as fenced or advisory computation whose OUTPUTS
join as attributed evidence, never as a pretended semilattice."
Everywhere this note cites KM-22, read it as citing an **unmerged pin**.
That is a procedural item for the grill (§8, Q7), not a design problem.

**KM-11's rename is recommended, not applied.** The fold-declaration
kind is still `index` at rank 6 in the model
(`verify/kernel/Kernel/Definitions.lean:25-38`, read this session), and
the shipped runtime writes a *third* name into the declaration —
`kind: "fold"` (`packages/plait/src/Fold.ts:25,142`). So one thing has
three names today: `index` (model kind), `fold` (wire declaration), and
`reduction` (KM-11's recommendation). Search is the consumer that makes
that confusion expensive, because "index" is precisely the word KM-11
says over-suggests. **This note's usage:** *reduction* for the declared
thing, *index* for a reduction whose declared role is answering
queries. §8 Q1 raises the rename's timing and its blast radius.

Everything else the commission cited checks out verbatim: the kernel
algebra's §4.2 generator 5 (`docs/design/2026-08-18-plait-kernel-algebra
.md:342-368`), the algebraic register's §7.2 two-order ruling
(`docs/design/2026-08-18-km-algebraic-register.md:1149-1182`), KM-11
(`docs/research/2026-08-18-kernel-model-notes.md:389-406`), and the
rung⇒carrier rule (`scratchpad/algebra-engine-architecture.md:233-257`).

---

## 1. Result first

**1.1 The family is six declared reductions, and one carrier decision
decides the whole shape.** A lexical posting index can be built on a
counting carrier (term → doc → term-frequency, a commutative monoid) or
on a set carrier (term → set of `(entry, position)`, a bounded
semilattice). This note recommends the **set carrier**, and the argument
is the rung⇒carrier rule read forward: the set carrier may read the
deepest quotient (the set plane, T1), redelivery and reordering are free
by theorem rather than by a dedup window's retention setting, and every
count the index owes — term frequency, document length, corpus size,
average document length — is **derived at read time by a finishing
projection off a joinable state** rather than maintained as a
non-idempotent cell (§3.1).

**1.2 The idiom that generalizes it: maintain at the idempotent rung,
present at the counting rung.** The measurement catalog refuses `count`,
`sum`, and `histogram` as cell joins (algebraic register §5.1 — three
refusals, "the design working, not the design failing"). A search
surface needs all three. The resolution is not to drop to the positioned
plane for the whole index; it is to **maintain the set and present the
count**, so the non-idempotent measurement never has a carrier to
double-count on. `present` returns `Finished`, which merges with nothing
(§5.2 of the same record) — so the unlawful reading has no value to be.

**1.3 The BM25 disposition, argued in §5.2 and stated here: BM25-class
scoring is lawful IN-FOLD, not advisory.** Every input to BM25 — `df(t)`,
`N`, `f(t,d)`, `|d|`, `avgdl` — is a counting measurement presentable off
the index's own anchored state, and the formula is a total integer
function of `(state, query)` once it is declared in fixed point. So
BM25 rides inside the declared query algebra's `answer : State → Query →
Result`, exactly where F11's purity side conditions already live. Two
constraints make it honest, and they are the design content: the corpus
parameters (`N`, `avgdl`) must be state of the **same** reduction at the
**same** anchor — a side read of corpus statistics is an ambient input in
disguise — and the arithmetic must be fixed-point with **one** rounding
at the end, because integer division does not distribute over the
per-term sum. The advisory/evidence route (KM-22) is for the genuinely
different case: a score that needs a **capability call** — a
cross-encoder, an LLM reranker, an ANN neighbor score. Those are C7
actions, their outputs join as attributed evidence, and ranking over
that evidence is a **second** reduction with its **own** certificate.
Two certificates, never one (§5.4).

**1.4 The order discipline needs no defending and one bridge.**
`byScoreThenIdentity` is shipped in the model as score-descending then
identity-ascending over two projections `Entry → Nat`
(`verify/fabric/Fabric/Definitions.lean:430-450`, read in place); `topBy`
takes two declared projections by digest and a width, and there is no
`compare` parameter, because a comparator lambda is closure
introspection and was already refused before this note existed
(algebraic register §7.2). The one thing that does **not** fall out:
F11 is proven over a **fixed** score projection on a fixed support, and a
BM25 score is query-dependent. The instantiation is at the
scored-candidate carrier, and it wants its own bridge — named as
candidate `f11_scored_candidates_of_support`, NEEDS-A-LAW, in §8 Q2.

**1.5 A result set is a declared value, so a citation is a digest.**
Cite by **anchor**; memo by **state digest**. The kernel record's
"cacheable by `(fold digest, head)`" is sound but coarser than the laws
allow: two different heads can fold to one state at an idempotent
algebra, and `f11_state_of_anchor` licenses the better key (§4.2, and
§8 Q3).

**1.6 Pagination is keyset continuation at a pinned anchor.** The
declared order is total under `IdentityDistinct`, so `after: (score,
identity)` is a **verifiable** continuation coordinate — two naturals
derivable from the last row the caller already holds — which is demand
row G9's requirement met, not MCP's opaque cursor (§4.3).

**1.7 The MCP surface mints no verb.** Five tools, all derived from
declarations and walled served-equals-derived, all projections of the
one generator. The result set's own digest is the citation, so no
`search.cite` tool exists — `resolve` already does it (§6).

**1.8 Five slices, one session each, `S1 → S2 → S3 → {S4, S5}`.** The
three named walls land where they bite: the determinism wall at S2, the
citability wall and the no-comparator negative control at S3 (§7).

---

## 2. Grounding — verified this session at `7223ff79fd`

| Fact | Where, read in place |
| --- | --- |
| `byScoreThenIdentity (score identity : Entry -> Nat)` — score descending, identity ascending, "ties at one score break by identity bytes, never by arrival" | `verify/fabric/Fabric/Definitions.lean:427-435` |
| `IdentityDistinct` — the named premise content-addressed entries carry by construction | `Definitions.lean:437-445` |
| `topK score identity k entries = ((dedup entries).mergeSort (byScoreThenIdentity score identity)).take k` — "the signature admits no seed, clock, schedule, or arrival-order parameter" | `Definitions.lean:447-450` |
| `QueryAlgebra.answer : State -> Query -> Result` — "the constructor's closure is the purity admission" | `Definitions.lean:453-456` |
| `F11TopKOfSupport`, `F11QueryDeterministic` — invariance under permutation/duplication of the delivered support, and under re-anchoring by F3 | `verify/fabric/Fabric/Laws.lean:139-165` |
| The anchor is `{ floor : Natural, stateDigest : Digest, head : Digest }`; `head` is a digest over the consumed event list, not a stream sequence | `packages/plait/src/Anchor.ts:8-12,35-44` (shipped) |
| `Anchor.advance` refuses any non-contiguous position — `invalid-anchor-advance`, with the successor-discipline law in the refusal text | `Anchor.ts:23-33,53-60` (shipped) |
| `FoldDeclaration = { v: 0, kind: "fold", lane, algebra, step }`; `DeclareOptions.algebra` is `Partitions extends 1 ? DeclaredAlgebra : CommutativeAlgebra` — the rung constraint already type-routes at one place | `packages/plait/src/Fold.ts:23-47` (shipped) |
| 34 structural refusal kinds, including `unearned-commutative-algebra` | `packages/plait/src/Refusal.ts:25-60` (shipped) |
| Conformance corpus format 2: 121 lines, header + 9 groups (`admission` 17, `canon` 10, `doc` 22, `encoding` 12, `kind` 12, `program` 4, `refusal` 16, `stage` 5, `type` 22) | `packages/plait/fixtures/kernel-conformance.ndjson` header |
| `DeclKind` still names `index` at rank 6 | `verify/kernel/Kernel/Definitions.lean:25-38` |
| No MCP server surface exists on main | `grep -rl McpServer packages/*/src` → empty |
| C10's index declaration shape; F11 as candidate; "ranking is a declared fold, else catalog order"; the `{seq, head}`-shaped verifiable cursor | `docs/design/2026-08-17-plait-harness-plane.md:197-273, 391-428` (ratified 2026-08-17) |
| G15 — ANN is a non-commutative-class fold: single-partition, resumable, never F4-merged, seed as declaration data, **recall measured and never claimed**; v0 ships exact search only | `harness-plane.md:1015-1021` (ratified) |
| G16 — embeddings are derived records; re-embedding is a **new fold**; a partially re-embedded index mixing two embedding spaces is unrepresentable | `harness-plane.md:298-327, 1022-1026` (ratified) |
| The rung⇒carrier rule and the T0–T5 cost ladder | `scratchpad/algebra-engine-architecture.md:233-257, 469-547` |

---

## 3. (1) The index family

### 3.0 The carrier decision, stated before the family, because it decides it

Two candidate algebras for a lexical posting index over lane envelopes
and catalog declarations.

**Option A — the counting carrier.** State is
`Map[term → Map[entryDigest → tf : ℕ]]`. Pointwise lifting over both map
indexes preserves the inner law set exactly (KM-19), and the inner value
is `count`: **commutative monoid, suite-backed** (algebraic register
§5.1). Rights that follow: shard-merge ✓ under the earned brand
(`f4_partition_fold`); cell-join ✗ — **refused**, because pointwise
addition is not idempotent and a redelivered envelope double-counts.
rung⇒carrier: commutative-not-idempotent, so it must read the
**multiset** presentation — dedup by content digest plus the successor
discipline (`f2b_guarded_exactly_once`) under the anchor floor, which is
exactly what `Folds.deploy` and `Anchor.advance` already run. Steady
state: T2 maintain, T1 query.

**Option B — the set carrier (recommended).** State is two components:

```
postings   : Map[ term        → Set[ (entryDigest, position) ] ]
extents    : Map[ entryDigest → Set[ position ] ]
```

Both are the map carrier over a finite-set value under union:
**bounded semilattice**, with the donor chain `f1_cell_merge_aci` +
`join_semilattice_of_aci` at the set, transported over the map index by
the same package the directory already instantiates
(`f12_directory_join_semilattice`). Rights: cell-join ✓, shard-merge ✓,
redelivery free by `f2_trace_invariant`, replica reads are lattice lower
bounds by `cell_absorb_inflationary`. rung⇒carrier: it may read the
**deepest** quotient — the set plane, the CAS, T1.

Every count the index owes is then a **derivation off that state**, not a
second maintained carrier:

```
tf(t, d)  = | { p : (d, p) ∈ postings(t) } |
|d|       = | extents(d) |
df(t)     = | { d : (d, _) ∈ postings(t) } |
N         = | dom(extents) |
avgdl     = ( Σ_d |extents(d)| ) / N        -- present, not maintained
```

**Recommend Option B**, on five grounds, each with its licensing ruling:

1. **The deepest carrier is the cheapest right.** rung⇒carrier: a
   bounded semilattice may read the set plane, where redelivery and
   reordering are harmless *by theorem*. Option A's harmlessness is
   bought by a dedup window's retention setting — a carrier
   configuration, which is the class of thing the estate refuses to let
   meaning depend on.
2. **Donor-backed at every component**, where Option A's `count` brand
   is suite-backed (algebraic register §3.4 — the two tiers, and no
   surface may present them as one). One honest bound rides this: the
   transport *through pointwise lifting* is KM-19's rung-preservation
   obligation, which is **NEEDS-A-LAW**. Until it is proved, the
   weaker-of-the-two rule applies and the transported brand is
   **suite-backed** (algebraic register §5.2). Say so on the row; do not
   let a donor chain launder an unproved hop.
3. **The whole family composes by `join`.** Per-kind views, per-lane
   shards, and replica reads all merge with no ordering discipline — the
   `joinAll` affordance, correctness inherited from
   `f1_history_convergence`.
4. **Positions come free, and phrase and proximity queries need them.**
   Option A needs a second index for the same capability.
5. **The one thing Option A buys is state size, and size is a carrier
   concern.** KM-22's compression split: digests are computed over
   canonical *uncompressed* bytes, so compression can never touch
   meaning. A delta-encoded posting list on disk is the same value.

Cost stated honestly: the set carrier's state grows with total postings
and shrinks only by retention's fenced compaction above the derived
horizon (G21, `compact_below_floor_preserves_resumption`). The `present`
derivations are read-time work at T1. Neither is free; both are the
price of the deepest carrier, and this note names them rather than
implying the recommendation is costless.

### 3.1 The family

Each row is a **declared reduction** — a declaration through the one
catalog door (G12), whose digest is its identity, carrying its lane
set, its algebra digest, its contribution digest, its partitioning, and
its declared query algebra (C10's shape, `harness-plane.md:199-209`).

| # | Reduction | Algebra / carrier | Rung | Evidence tier | Carrier tier | Incremental-maintenance license |
| --- | --- | --- | --- | --- | --- | --- |
| I1 | **postings** over lane envelopes and catalog declarations | `Map[term → Set[(entry, pos)]]` × `Map[entry → Set[pos]]` under pointwise union | bounded semilattice | donor chain, **suite** pending KM-19's preservation law | T1 query / T2 maintain | associative + commutative + idempotent ⇒ **incremental, shardable, redelivery-free** |
| I2 | **per-kind filtered views** | I1's algebra under a declared contribution transformer | inherited exactly (KM-19: a filter is a step transformer and preserves rung) | inherited | T1 / T2 *if maintained*; else **derived at read** | same license as I1 — but see the default below |
| I3 | **top-k by declared score** | *not an index* — the read side | — | — | T1 | n/a |
| I4 | **distinct / count surfaces** | `present(distinct-set)` over I1's state | bounded semilattice maintained; the count is `Finished<ℕ>`, which merges with nothing | donor at the set | T1 | derived; **no counting cell exists** |
| I5 | **sketch-backed cardinality** | HyperLogLog register vector under pointwise max | bounded semilattice (donor at the **map** carrier) for the *merge only*; the estimator is `present` | donor (merge), none (estimator) | T1 | incremental; answers in the `Approximate<ℕ>` sort |
| I6 | **vectors** — exact k-NN first | grow-only `Set[(inputDigest, vector)]` | bounded semilattice | donor at the set | T1 query / T2 maintain | incremental; ANN's *construction* is not an algebra — §5.5 |

Notes that are load-bearing rather than decorative:

**I2's default is read-time, not maintained.** A filtered view earns its
own anchor only when a measured consumer's read cost justifies a second
maintained state — build-behind-consumers, which is G15's own precept
applied one construct over. Until then, the filter is a predicate inside
the query algebra over one index. Two things stay true either way: the
predicate is **declared data**, never a lambda (closure-list row 14), and
a maintained view is a **distinct reduction with a distinct digest**,
because its contribution transformer digest differs — so it has its own
anchor and its own citation, and nothing silently shares a certificate.

**Negation is lawful in a query and refused in a contribution.** A
trigger predicate has no absence constructor (T32), and absence
reasoning from a *replica* is closure-list row 11. But a `NOT` over an
**anchored** state is a different act: the anchored state is a true
record of a DAG position and is never wrong later (F8). So this note
proposes `NOT` is admissible in the query grammar **with its answer sort
carrying the anchor** — `AbsentAtAnchor`, on the `atLeast` precedent
where the affordance returns `AtLeast<'yes' | 'unknown'>` rather than a
boolean, so the unlawful reading has no value to be (algebraic register
§7.1). This is unruled; §8 Q4.

**I4 is where §1.2's idiom shows.** "How many hits" is
`present(distinct-set)` over the anchored result support — a finishing
projection returning `Finished<ℕ>`. It is not a `count` cell, because a
`count` cell is refused as a cell join and would double-count a
redelivered envelope. The estate's counting *is* available — as a fold
over a positioned journal under the successor discipline — but here it
is unnecessary, because the support is already a set.

**I5 is the only lawful approximation on the count surface, and it
changes identity.** The error bounds are declared data inside the
algebra's digest (`relative_error_ppm`, `confidence_ppm`,
`register_count` — integers, because the corpus admits no floats), so a
corpus that moves from exact `distinct-set` to `hyperloglog` has **two**
index digests and two histories, never one silently degraded index. That
is G16's re-embedding argument transplanted, and it kills the same
failure class.

---

## 4. (2) The query path

### 4.1 The query is a declared value with a digest

A declared query is canonical data admitted through the one door — the
G2 demand row's `structureMatches(pattern)` shape made general. Its
digest is half the result set's key, which is the whole reason it must
be a value and not an argument bag.

```
query declaration (proposed content, through the one catalog door):
{ v: 0
  reduction: <digest>       // which index this query is written against
  shape:     <declared query-grammar term>   // terms, conjunction, disjunction,
                                             // anchored negation, field predicates
  order:     { score: <digest>, identity: <digest> }   // two declared projections
  width:     <k : Natural>
  lineage:   [<digest>...] }
```

Admission runs the ordinary checks, and three of them are the search
story:

- **Ambient inputs are unrepresentable, not validated.** The query
  carrier has no clock, seed, schedule, or locale parameter to read
  (closure-list row 8; T23). "Latest" is likewise absent — a `latest`
  field is an unanchored derived read, refused by G20.
- **Every referent must lie inside the writ's pinned universe**
  (closure-list row 13, K-8). An index digest, a schema digest, a
  projection digest named by a query is exactly that check.
- **`order` carries two projection digests and no comparator.** Adding a
  `compare` field would be a lambda in a declaration — closure
  introspection, already refused by the model's
  `closure-introspection` reason, whose planted control is
  `functionDeclare` and whose taught repair reads "reference computation
  by digest: declare the fold and pin its digest."

### 4.2 Search is an anchored read, and the result set is a value

```
search : Reduction × Anchor × Query × Width → ResultSet
```

— which is generator 5's projection and nothing else (kernel algebra
§4.3: `search` is *derived*, "a `fold` (C10) plus `resolve` of the
hits; the query is data with a digest").

```
result set (proposed declared value):
{ v: 0
  reduction: <digest>
  anchor:    { floor, stateDigest, head }
  query:     <digest>
  width:     <k>
  hits:      [ { entry: <digest>, score: <Natural> } ... ]   // in the declared order
  exhausted: <bool> }        // the support was shorter than k
```

Three properties, each doing work.

**Its digest is the citation.** An agent that quotes a result quotes a
resolvable name; a reviewer resolves it, re-derives every digest inside
it (verify-on-read), and replays the fold from the anchor to check the
hits. That is the citability wall of §7, and it is F3 + F11 composed
rather than anything new.

**Scores are carried even though they are re-derivable, and the
redundancy is deliberate.** The score is a declared projection, so a
reader can recompute it from the anchored state; carrying it means a
mismatch on re-derivation is a **FINDING**, not a doc bug — the
served-equals-derived discipline applied inside a value. The alternative
(hits as bare digests) is smaller and loses the check.

**Cite by anchor, memo by state digest.** The anchor is what names the
position and belongs in the citation. The *cache* key can be coarser:
`f11_state_of_anchor` says the anchor determines the state, and at an
idempotent algebra two different heads routinely fold to one state — so
`(reduction digest, state digest, query digest, width)` is a strictly
better memo key than `(fold digest, head)`, with more hits and the same
correctness. The kernel record's phrasing is conservative rather than
wrong; §8 Q3 raises adopting the coarser key.

### 4.3 Pagination as anchored continuation

Never cursor-by-time; never an opaque cursor. Two lawful spellings, both
anchored:

**(a) Width extension.** `topK` is `sort … |> take k`, so the width-`k`
result is a **prefix** of the width-`2k` result at the same anchor. Page
two is "take more, drop what you saw." Obviously deterministic,
obviously citable, and it recomputes.

**(b) Keyset continuation (recommended).** `after: { score, identity }`
resumes the declared order strictly after that pair. It is lawful here
for a specific reason: `byScoreThenIdentity` is a **total** order under
`IdentityDistinct` — distinct scores never consult identity, ties break
by identity bytes — so "strictly after" is well-defined and the
continuation coordinate is two naturals the caller already holds from
the last row of the previous page. That makes it **verifiable**, which
is exactly demand row G9's requirement against MCP's opaque cursor.

The rule that makes either honest: **the anchor is part of the page
request.** A page request without one is an unanchored derived read
(G20). A caller paging with a "stale" anchor is not stale — they are
reading one consistent snapshot, which is the correct and citable
behavior. A caller who wants fresher starts a **new** query at a new
anchor, and the result-set digest differs, which is the honest answer.

The freshness precondition already has its shape, carried from part 3
§4.3: `atLeastHead: h` refuses with sort **absence** until the anchor
passes `h` — retryable, repealed by later presence, and no
`waitForFreshness`, no staleness-in-milliseconds, no blocking read
anywhere.

### 4.4 The refusals — half the grammar

Every one reuses an existing door, and the discipline is that **a door
predicate without its paired refusal behavior is an unfinished rule**
(K-9).

| Fault | Refusal | Sort | Reuses |
| --- | --- | --- | --- |
| index declared at an algebra whose brand does not license the carrier or the right it claims | `unearned-rung`, parameterized by the needed rung and the missing equations | structural | algebraic register §3.5 (**proposed**, commit B) |
| `partitions > 1` without the commutative brand (today's spelling) | `unearned-commutative-algebra` | structural | **shipped**, `Refusal.ts:39`; deprecating into `unearned-rung` |
| a `compare`, a scorer, or a tokenizer passed as a function | `closure-introspection` | structural | the model's reason; planted control `functionDeclare` |
| an index digest outside the caller's writ universe | the **off-writ referent** check | structural | closure row 13 / K-8 — **no new kind**; a query naming an index is the identifier-universe check at the read door |
| a query pinning an entry, schema, or projection digest that is not admitted | forward reference | structural, **door-relative** | C7 `c7_pin_well_founded`; KM-20 classes it anti-monotone — catalog growth repairs the unchanged candidate, so the taught next move says *retry after growth*, not *rewrite* |
| a search call with no anchor and no anchor derivation | unanchored read | structural | G20 |
| a query value carrying a clock, seed, locale, or `latest` | ambient query input | structural | closure row 8 / T23; planted control |
| a continuation coordinate presented against a different anchor than page one's | `paged-across-anchors` | structural | **the one new kind this note proposes** (§7, S5) — it names the law *a result set is citable at one anchor* and teaches two next moves: re-query at the new anchor, or pin the old one |
| the anchor has not reached the requested head | absence | **absence** (retryable) | shipped absence sort, part 3 §4.3 |

One honesty box, repeated wherever a ledger row lands: the policy's
`indexes` allowlist is a **value field, not an authority** —
meet-intersected on spawn like every other policy field
(`f9_policy_meet_semilattice`) — and **an allowlist is developer
experience, not security.** The security half is the connection's
permissions plus server-side refusal plus the pending attribution
decision (G4, G10).

---

## 5. (3) Text search, honestly

### 5.1 Tokenization and normalization as declared, digested transformers

A tokenizer is not code the index calls. It is a **declared contribution
transformer** — KM-19's constructor set names them explicitly, and
records that a transformer (map, and filter via the fusion law)
**preserves rung**. So the ingest chain is a composition of declared,
digested transforms:

```
envelope ──▶ [normalize : declared]     -- case folding, Unicode NFC, declared table
         ──▶ [tokenize  : declared]     -- declared boundary rule
         ──▶ [stopwords : declared]     -- a filter = a step transformer
         ──▶ postings contribution
```

Three consequences, none of them new machinery:

1. **The chain is inside the index's digest.** A different stopword list
   is a different index — the same discipline as a different embedder
   capability (G16) and a different sketch bound (§5.2 of the algebraic
   register). A corpus half-indexed under two tokenizers is not
   representable, because it is two indexes.
2. **The rung survives the chain**, so the recommended set carrier stays
   bounded semilattice all the way from envelope to posting — and the
   maintenance license of §3.1 holds unchanged.
3. **Nothing is a lambda.** Each stage is a declared fold referenced by
   digest — the template record's helper discipline verbatim, adopted as
   grammar law.

Locale is the sharp edge: a locale-sensitive normalizer would be an
ambient input (closure row 8). The lawful spelling is that the locale's
**table** is declaration data inside the digest, so the transform is a
function of its declared content alone. A normalizer that reads a
process locale refuses at admission.

### 5.2 Where BM25-class scoring lives — the argument, not a hand-wave

Write BM25 out and look at what it reads:

```
BM25(q, d) = Σ_{t ∈ q}  IDF(t) · [ f(t,d) · (k₁+1) ]
                        ─────────────────────────────────────────
                        [ f(t,d) + k₁ · (1 − b + b · |d| / avgdl) ]
```

Its inputs are `df(t)`, `N`, `f(t,d)`, `|d|`, `avgdl`, and the parameters
`k₁`, `b`. Under §3.0's recommended carrier, **every one of the first
five is a finishing projection off the index's own anchored state**, and
the last two are declaration data. So:

> **BM25 is a total function of `(anchored state, query value)`.**

That is precisely the shape the declared query algebra already has —
`QueryAlgebra.answer : State → Query → Result`, whose "constructor's
closure is the purity admission" (`Definitions.lean:453-456`). BM25
therefore rides **inside the fold**, at the read side, and needs no
fence, no capability, and no evidence detour. Routing it through an
advisory C7 action would be a category error: it would spend a fenced
act (T4, the one mandatory wait) on a computation that is already pure,
and it would hand the result set a second certificate it does not need.

Three constraints make that lawful rather than merely plausible, and
they are the design content:

**(i) The corpus parameters must be state of the same reduction at the
same anchor.** `N` and `avgdl` are global. If they are read from a
*separate* fold, or from a "corpus stats" service, the score becomes a
function of **two** anchors, the citation key `(reduction, anchor,
query)` no longer determines the answer, and F11 is silently voided.
This is the ambient-input failure wearing a respectable coat — a side
read of corpus statistics is exactly the "latest" the closure list
refuses. So `extents` is a component of I1's own state (§3.0), and `N`
and `avgdl` are presented off it.

**(ii) The score is a projection into the naturals, so the arithmetic is
fixed point.** `byScoreThenIdentity` takes `score : Entry → Nat`
(`Definitions.lean:430`), and the corpus admits no floats. So the
declaration carries a `scale` (an integer, e.g. 10⁶) and the score is
`round(scale · BM25)`. The scale, `k₁`, and `b` are declaration data
inside the index digest — so a re-tuned `k₁` is a **different index**,
not a mutated one, which is the same identity discipline everywhere
else in this note.

**(iii) One rounding, at the end — and this is a wall, not a style
note.** Integer division does not distribute over the per-term sum:
rounding each term and then adding gives a different natural than adding
in a wide accumulator and rounding once. Two implementations that
disagree here produce different result-set digests from the same support
and query, which fails the determinism wall. So the declaration pins the
accumulator width and the single final rounding, and the slice carries a
**control that per-term rounding changes the result** — otherwise the
wall is decorative.

What BM25 is **not** allowed to become: a relevance claim. F11 governs
identity and provenance, never usefulness. A BM25-ordered result set is
citable and reproducible; whether it is *good* is a scoreboard question
and never a ledger row.

### 5.3 The query-dependent-score bridge, named

One honest gap. `f11_topk_of_support` quantifies over a **fixed**
`score : Entry → Nat` and a support list; BM25's score depends on the
query. The lawful reading is that the query algebra first materializes a
**scored candidate carrier** — entries paired with their query-relative
score — and `topK` then runs at that carrier with `score = snd`. The
statement that composition needs, stated NEEDS-A-LAW in the F13 posture
(the F-number mints at ratification, and no surface claims it before
then):

> **Candidate `f11_scored_candidates_of_support`.** For a declared
> scorer `σ : State × Query × Entry → ℕ`, the scored candidate list is
> invariant under permutation and duplication of the delivered support;
> hence `topK` at the scored carrier is a function of
> `(state, query, width)` alone.

Its conjuncts are already proven hop by hop — the state is a function of
the anchor (`f11_state_of_anchor`), top-k is a function of the support
(`f11_topk_of_support`) — and the composition is the one obligation.
Whether it is a corollary or wants its own twenty lines is exactly the
G14 question the coordinator was already asked to rule for F11 itself;
§8 Q2.

### 5.4 Model-scored results: the advisory route, and two certificates

Here is where KM-22's fence actually applies, and the split criterion is
crisp:

> **Is the score a total function of declared anchored state and the
> query value alone?** If yes, it is a declared projection and it lives
> in the fold (§5.2). If it needs a **capability call** — a
> cross-encoder, an LLM reranker, a GPU kernel, an external service — it
> is a C7 action and its output is evidence.

The advisory shape, entirely in existing machinery:

1. The rerank is a **C7 action declaration** pinning the candidate result
   set's digest, the scorer's capability digest, and the declared
   parameters. The work digest keys the register; at most one outcome
   lands per declaration no matter how many workers race (F5's
   `at_most_one_landed_commit`), and the outcome constrained-decodes
   against the capability's declared output schema (G26).
2. The landed outcome — a per-candidate score — re-enters the monotone
   plane as **attributed evidence** on a scoring lane (KM-22: "outputs
   join as attributed evidence, never as a pretended semilattice"). The
   attribution fence rides: "attributed" means to a credentialed
   connection under a writ, G4 pending.
3. The **reranked order is a second reduction** over that lane, whose
   score projection reads a declared field of the evidence record. It is
   an ordinary bounded-semilattice fold over `Set[(candidate, scorer,
   score)]`, and its result set is citable exactly like any other.

So the reranked answer **is** citable — but it cites the *rerank*
reduction's digest and the scorer's capability digest, and it **never
wears the lexical index's certificate**. Two certificates, never one.
That is demand row G11's warning made structural: "an LLM-ranked result
set is an author claim wearing a certificate's clothes" cannot happen,
because the two certificates name different reductions.

### 5.5 Embeddings and ANN

Carried from the ratified rulings, with the KM-22 pin sharpening one
line.

**Embeddings are derived records** (G16): `{ input, embedder, vector }`
with the ordinary certificate, produced by an ordinary C7 action. Model
drift is visible by construction — the embedder's capability digest is
in every record and therefore in the index's inputs, so re-embedding is
a **new fold** and the old index remains a true record at its own
anchor. The failure every vector store eventually hits — a partially
re-embedded index silently mixing two embedding spaces — is not
representable, because the two spaces are two digests.

**Exact k-NN first** (G15, and build-behind-consumers). The state is a
grow-only `Set[(input, vector)]` — bounded semilattice, so it joins,
shards, and tolerates redelivery. One design point the ratified record
leaves implicit: a distance is a real, and `score` is a natural, so the
projection is `score = clamp(scale − round(scale · distance), 0)` with
`scale` as declaration data. Two consequences, both stated rather than
hidden: quantization creates **more ties** than a float comparison
would, and those ties break by identity bytes — which is the *right*
answer for determinism; and a different `scale` is a **different index**,
so "the same query at the same anchor" means the same quantized order.
Recall against an unquantized reference is a measured scoreboard number,
never a claim.

**ANN is where KM-22 bites.** HNSW and IVF build a structure whose shape
depends on insertion order and on random level assignment. It is not an
algebra, and it does not become one by renaming. The lawful shape:

- The build is a **fenced act**: a C7 action pinning the source index
  digest, the source **anchor**, the builder capability, the declared
  seed, and the declared parameters. The work digest keys the register;
  one outcome lands.
- The landed outcome is a **declared value** — the built graph, by
  digest, immutable forever. A graph built at anchor A is a value; it is
  never "updated."
- "Which graph is current" is a **naming** question, not an algebra
  question. KM-19 is explicit that arbitration is never an algebra
  operation. This note leans to the **directory** route — a petname
  bound to a graph digest, resolved as a fold-class read
  (`f12_resolution_of_support`, greatest seal wins) — because it needs
  no new machinery. The register route (a work-digest-keyed rebuild
  decision) is equally lawful and costs one more fenced act. Unruled;
  §8 Q6.
- Querying the graph is an ordinary declared query algebra over a state
  that **is** that value. Single partition — the F4 brand is absent, so
  `partitions > 1` does not type-check (`Fold.ts:43-46`, the routing
  already shipped at that one place). Seed as declaration data or the
  declaration refuses. **Recall measured, never claimed.**

**Hybrid retrieval** (lexical plus vector) is two indexes and a declared
merge fold over their result values — one more instance, no new
construct.

---

## 6. (4) The MCP / agent surface

### 6.1 No new generator, and no new verb

Querying is `read` — the estate's existing writ verb; the surface mints
none. Every tool is **derived** from the declarations the runtime
executes, walled served-equals-derived, and projected through the
caller's writ. A hand-written tool list fails the wall, and a
disagreement between the tool an agent calls, the type the SDK checks,
and the sentence the docs teach is a **digest mismatch**, hence a
FINDING (kernel algebra §5.6).

| Tool | Reads | Note |
| --- | --- | --- |
| `reduction.list` | reductions in the caller's writ universe | derived from declarations |
| `reduction.describe` | one declaration plus its query algebra | the declaration is **also** served as a digest-addressed resource |
| `reduction.anchor` | the anchor fact per partition | the freshness answer, in bytes: `{ floor, stateDigest, head }` |
| `search.query` | one result-set page | returns the result set's **digest** first, then the rendering |
| `search.explain` | the query digest, the anchor, the two declared order projections | *why these rows, at this anchor* |

**No `search.cite` tool exists**, and the absence is the alphabet
discipline working: the result set's own digest is the citation, and
`resolve` already resolves it. A sixth tool would be a second name for
one thing.

### 6.2 The tool schema, and the one interesting argument

```
search.query
  reduction : Digest                                   -- must lie in the writ universe
  anchor    : { floor, stateDigest, head }             -- pinned
            | { atLeastHead : Digest }                 -- precondition; absence-refuses
  query     : Digest                                   -- a DECLARED query value
  k         : Natural
  after?    : { score : Natural, identity : Natural }  -- keyset continuation
→ { resultSet : Digest, hits : [{ entry, score }], exhausted : Bool }
```

**The query argument is a digest, not an inline object**, for two
reasons: the result set's key needs a query digest to exist at all, and
MCP's untyped-argument defect is a **named dependency** — this surface
waits for the estate's fix rather than routing around it with a loose
object.

That costs a round trip, and the tempting fix is to let `search.query`
accept an inline value and declare it on the way through. **That is
refused**: publication is an act, never a side effect (the DEV-705
ruling — encode is total, publication is an act). The lawful resolution
is nicer than either: an inline query value **refuses**, and the refusal
carries the digest the value *would* have — which is computable from the
bytes with no publication at all — plus the next move ("declare this
query, then re-issue"). The refusal teaches and does the work, and
publication stays an act. That is the `next`-as-data discipline the
34-kind union already ships.

### 6.3 How results teach citability

Three mechanics, each small:

1. **No hit is ever rendered without its digest.** A hit is
   `{ entry: Digest, score: Natural }`, so an agent that quotes a result
   necessarily quotes a resolvable name.
2. **The result set's digest is the first line of the response**, so
   "cite your search" has a one-token answer and the agent learns it by
   seeing it every time.
3. **`search.explain` resolves to the same three digests** — reduction,
   anchor, query — so "why these rows" is answered with names a reviewer
   can follow, not prose.

The doc layer carries the rest: every generated tool description opens
with its algebraic sentence and names its licensing law and evidence
tier (algebraic register §6.2), and Effect Schema annotations feed the
JSON Schema an MCP surface publishes — so a sentence written once in the
model reaches an agent's tool description with no human in the path.

---

## 7. (5) Tracer-bullet slices — ticket candidates

Five, dependency-ordered, one session each. `S1 → S2 → S3 → {S4, S5}`.
Each states its walls, and each wall is a *named* claim rather than "add
tests."

### S1 · The query value and the result set as declared values

**Build.** Two canonical shapes through the one catalog door (§4.1,
§4.2) plus their generated schemas. No index, no reading, no scoring.
The deliverable is that a query and a result set have digests.

**Walls.** Canonical round-trip: declare → resolve → re-derive,
byte-identical. **Negative controls, with the law named in each
refusal:** a query carrying a clock field; a query carrying a seed; a
query carrying `latest`; a query with an `order.compare` function; a
query naming an off-writ index digest. All five refuse at admission.

**Seams.** The catalog door; the generated schemas.
**Limits.** No reduction is declared. No read exists.
**Blocked by.** Nothing.
**Why first.** Every downstream key is one of these two digests, and
this is the slice that makes a result citable *at all*.

### S2 · The posting reduction at the bounded-semilattice rung

**Build.** I1 (§3.0 Option B): `Map[term → Set[(entry, pos)]]` plus
`Map[entry → Set[pos]]`, declared through the shipped `Fold.declare`
with a declared algebra and contribution, over a lane of envelopes and
catalog declarations. The `present` derivations (`tf`, `|d|`, `df`, `N`,
`avgdl`) as `Finished`-returning projections.

**Walls.** **The determinism wall** — same support, same query,
byte-identical result: over permuted delivery, duplicated delivery, and
partitioned-then-merged delivery, the state digest is identical. This is
`f11_topk_of_support`'s statement carried to the runtime, and it is the
corpus-conformance shape. **The redelivery wall** — replaying an
envelope set leaves the state digest unchanged (idempotence,
`f2_trace_invariant`). **Negative control** — the same index declared at
a counting carrier and cell-joined must refuse (`unearned-rung`, or
today's `unearned-commutative-algebra`), *with the mutation arm*:
weaken the rung constraint and confirm the control stops failing, so
the constraint is measured load-bearing rather than asserted.

**Seams.** `Fold.declare` / `Folds.deploy` / `Anchor.advance`, unchanged.
**Limits.** No scoring beyond catalog order. No MCP. No filtered views.
**Blocked by.** S1.

### S3 · The anchored read, `topBy`, and the citation

**Build.** `search(reduction, anchor, query, k)` returning a declared
result set; `topBy({ score, identity, k })` over two declared projection
digests; the memo at `(reduction, stateDigest, query, k)`.

**Walls.** **The citability wall** — take a result set's digest, resolve
it, replay the reduction from its anchor over the lane, and get a
byte-identical result set. This is F3 + F11 composed, and it is the
two-runtime replay discipline the register wall already runs, pointed at
search. **The no-comparator negative control** — a `compare` lambda
passed to `topBy` must (a) fail to compile and (b) refuse at the door
with `closure-introspection` and its taught repair, *with the mutation
arm* so the control is not decorative. **The unanchored-read control** —
a search call with no anchor refuses under G20.

**Seams.** The read surface over the deployed fold.
**Limits.** Catalog order and simple declared projections only; BM25 is
S4's. No pagination; that is S5's.
**Blocked by.** S2.

### S4 · Lexical scoring — declared transforms and fixed-point BM25

**Build.** The transformer chain (normalize → tokenize → stopwords) as
declared, digested, rung-preserving contribution transformers (§5.1);
BM25 as a declared `score : Entry → Nat` in fixed point, with `k₁`, `b`,
`scale`, accumulator width, and the single final rounding all as
declaration data inside the index digest (§5.2).

**Walls.** **The rounding wall** — one wide accumulator, one final
rounding, *with the control that per-term rounding changes the result*,
so the wall is load-bearing. **The two-index control** — a different
`k₁`, or a different stopword list, yields a different index digest and
therefore a different result-set digest; nothing is silently re-tuned.
**The no-float control** — a float anywhere in the declaration refuses
(the corpus admits no floats). **The single-anchor control** — a scorer
reading corpus statistics from a second fold's anchor refuses as an
ambient input (§5.2 constraint (i)); this is the subtlest failure in the
whole design and it deserves a planted control of its own.

**Seams.** The declared query algebra's `answer`.
**Limits.** No reranking, no embeddings, no ANN. The
query-dependent-score bridge (§5.3) is **stated NEEDS-A-LAW and not
claimed** — this slice ships the runtime, not the theorem.
**Blocked by.** S3.

### S5 · The MCP projection and anchored pagination

**Build.** The five tools of §6.1, generated from declarations; keyset
continuation `after: { score, identity }`; the `paged-across-anchors`
refusal; the inline-query refusal that teaches the computed digest
(§6.2).

**Walls.** **Served-equals-derived** — a hand-written tool list fails
the wall; the tool schema, the SDK type, and the doc sentence are three
folds of one cataloged value, and a disagreement is a digest mismatch.
**Pagination determinism** — at one anchor, page(k) ++ page(k, after=last)
is byte-identical to the width-2k result, over permuted and duplicated
delivery. **The cross-anchor control** — a continuation presented
against a different anchor refuses structurally with both next moves
taught.

**Seams.** The MCP tool surface (which does not exist on main today).
**Limits.** No subscriptions — `resources/subscribe` is
RATIFIED-AGAINST and no part of this surface is built on it. No
`search.cite`.
**Blocked by.** S3. (Parallel with S4 — pagination needs the order, not
the scorer.)

---

## 8. Open questions for the grill — anything unruled, stated as such

**Q1 · Should KM-11's rename land ahead of S1?** One thing has three
names today (§0). Search is the consumer that makes it expensive, and
the `topBy` affordance the estate has already written down is spelled
`Digest<'index'>`. Blast radius of renaming at **fixed rank 6**: the
corpus `kind` group's `name` field (consumers join on name), the digest
brands, and the doc rows. The **act encoding is untouched**, because
`encodeAct` writes `kind.rank` and the rank does not move — so this is a
rename, not a renumber, and the identity of every declaration survives.
Unruled.

**Q2 · Is `f11_scored_candidates_of_support` its own statement or a
corollary?** (§5.3.) This is the same shape as the G14 question the
coordinator was already asked to rule for F11 itself, one level down.
Its answer decides whether S4 ships behind a stated obligation or behind
a proof.

**Q3 · Memo by `head` or by `stateDigest`?** The kernel record says
cacheable by `(fold digest, head)`; the laws license the coarser
`(fold digest, state digest)`, which is strictly more cache hits at
identical correctness (§4.2). Small, and it decides a hot path.

**Q4 · Is `NOT` admissible in the query grammar?** This note proposes
yes, over an **anchored** state, with the answer sort carrying the
anchor (`AbsentAtAnchor`, on the `AtLeast<'yes' | 'unknown'>`
precedent) — because F8 says an anchored read is a true record of a DAG
position, and closure row 11 refuses absence reasoning from a *replica*,
which is a different act. If negation is refused in queries too, the
query grammar's shape changes and §4.1 needs rewriting. Unruled.

**Q5 · The filtered-view crossover.** When does a per-kind view earn its
own maintained fold rather than a read-time predicate? Ultimately a
measurement question (AE-7 territory), but the **default** matters now,
and this note proposes read-time-by-default on build-behind-consumers.

**Q6 · ANN's "current graph": directory rebind or register decide?**
Both lawful; this note leans directory (`f12_resolution_of_support`,
greatest seal wins) because it needs no new machinery. G15 says nothing
is built until a measured consumer exists, so the question is cheap to
leave open — but the answer shapes the declaration.

**Q7 · KM-22 needs to land.** It is pinned at `50b02b2` on worktree
branches and is not reachable from `origin/main` (§0). §5.4 and §5.5
cite it. Procedural, and real: a ticket should not cite an unmerged pin.

**Q8 · Does the result set carry scores?** §4.2 recommends yes, on the
argument that re-derivable redundancy converts a mismatch into a
FINDING. The alternative (bare digests) is smaller and loses the check.
Stated as a choice rather than a fact because it is one.

---

## 9. Honest bounds

- **Nothing here is measured.** No slice was built; no number in this
  note is a capacity claim. Tier assignments (T1/T2) are ordering
  claims, and AE-7 owns the estate's real numbers.
- **The recommended carrier's brand is not fully donor-backed today.**
  The bounded-semilattice claim transports through pointwise lifting,
  and KM-19's rung-preservation obligation is **NEEDS-A-LAW**. Until it
  is proved, the weaker-of-the-two rule applies and the brand is
  **suite-backed** (§3.0, ground 2). A donor chain must not launder an
  unproved hop.
- **F11 remains a candidate** at part 3's own posture; whether it is a
  separate statement or a corollary of F3+F7 was left to the
  coordinator and is not decided here.
- **No relevance, no recall, no liveness.** BM25 ordering is citable and
  reproducible; whether it is *good* is a scoreboard question. ANN
  recall is measured against exact search at the same anchor and never
  enters a ledger row. Nothing in this note says an index is fresh, or
  that a fold catches up.
- **The attribution fence rides §5.4 verbatim:** "attributed evidence"
  means to a credentialed connection under a writ, and the estate's
  attribution decision (G4) is pending.
- **An allowlist is developer experience, not security** (§4.4).
