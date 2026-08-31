# The store as a CRDT — the algebra, the free Datalog reading, two rulings

Status: **STAGED RESEARCH DIRECTION — pre-grade, conception register
(C3)**. Written 2026-08-30 on operator order, following the CRDT/Datalog
assessment and the same-day store-usage audit. Every theorem below is
status `proposed`; nothing here stamps a gate, mints a term (one owed
mint is flagged), or changes stored state. Successor to
[word-store.md](word-store.md) on the algebra line (its CX-007 finding
was fixed 2026-08-30; its emission-vs-admission naming ruling is still
open and is NOT one of the two rulings asked here).

Source: Yanakieva, Bieniusa & Dumbrava, *A Datalog Framework for
Conflict-Free Replicated Data Types*, TPLP 2026, arXiv 2605.31569v2 —
receipt `.reference/provenance/receipts/crdtlog-paper.json` (local-file
digest; upstream arXiv resolution pending).

## The one-sentence claim

The store's persistent state is already a state-based CRDT of the
degenerate, best kind — grow-only, content-addressed, no removal — so
replica convergence needs no conflict policy, monotone queries over it
are coordination-free (CALM), and the insertion behavior of any derived
view is mechanically the semi-naive delta of its defining rules.

## Why by construction — the paper's hard case cannot arise

The paper's running conflict (its Fig. 1) is the dangling edge:
concurrent `addE(n,m)` and `rmvN(m)` break the invariant
`∀(u,v)∈A: u∈V ∧ v∈V`, and the entire SLS/ICS apparatus exists to pick
a resolution policy (add-wins, update-wins, isolate- vs detach-delete).
The store's admission invariant is the SAME invariant — every reference
resolves at its declared kind (`Cas.RefsOk`, `checkRefs`) — but the
store has **no removal operation on any seam**, so the precondition is
stable under concurrency and the conflict is unconstructible.

In the paper's own model (its Def. 1: a replicated type is a function
of an operation context `(E, op, vis, ar)`): because there is no
delete, `F_CAS` is **independent of `vis` and `ar`** — a pure function
of the event *set*. Strong eventual consistency degenerates to a
triviality. The paper's machinery is what you need when you did not
make our design choice; its relevance to us is (a) the testing
workflow, and (b) the vocabulary for the one plane where a policy
question remains (naming — Ruling 1).

## Proposed theorem set T1–T6 — the scout target

Carriers are the existing ones: `Cas.Store = Addr32 → Option Node`,
`Cas.put : (Bytes → Addr32) → Store → AdmittedNode → Except PutError
PutOutcome`, `Cas.PutOutcome` (`fresh`/`duplicate` — host mirror
`CasStoreShape.putOutcome` landed 2026-08-30), `Cas.RefsOk`,
`Cas.Lang.runP` / `runPFrom_puts_sound`. Define `σ ⊑ σ'` as store
inclusion (`∀ a n, σ a = some n → σ' a = some n`) — a Prop, inline.

| id | statement (sketch) | family |
|---|---|---|
| T1 | Compatible union `⊔` on `Store` is a join: associative, commutative, idempotent, `⊑`-least-upper-bound — PARTIAL: halves disagreeing at an address (the `Collision` shape) have no join, refusal-typed | HOMOMORPHISM, DISTINCTNESS |
| T2 | Put is join with a singleton: `put H σ n = ok o` ⇒ the updated store equals `σ ⊔ ⟨addr H n ↦ n⟩`, with `o = duplicate` exactly when the singleton was already below `σ` | EXACT-STEP |
| T3 | Closure survives join: `RefsClosed σ₁ ∧ RefsClosed σ₂ ⇒ RefsClosed (σ₁ ⊔ σ₂)` — each node's refs resolve in its own half, and residency is monotone. (The paper proves its Lemmas 1–2 per deletion policy; ours is policy-free.) | WF-PRESERVE |
| T4 | Monotone-read stability: `σ ⊑ σ'` preserves every POSITIVE observation — loads, reachability, kind agreement. Boundary stated, not hidden: negative observations (`ContentNotFound`, doctor/audit absences) are NOT stable and live at the read edge against a named cut | WF-PRESERVE, TRACE-EXCLUDES |
| T5 | Restore is inclusion: a verified replica restore satisfies `σ_restore ⊑ σ_primary` — the formal shape of what `litestream-check.ts` already verifies per object; "a replica cannot lie, only lag" IS this order | AGREEMENT |
| T6 | The word is derived observation, never merged state: `word = fresh-admissions fold of the run against σ` (`runPFrom_puts_sound` + the 2026-08-30 host fix, CX-007) — replicas exchange stores, not words | EXACT-STEP, AGREEMENT |

Checkers: `lean-decide`-style finite enumeration where carriers permit,
`fast-check` on the host mirrors; statuses per LOOP.md evidence
discipline (`proposed` → `checker-accepted(<lane>)` → `lean-theorem`
only when the kernel holds it).

**The single mint owed:** `Store.join` (compatible pointwise union).
Everything else reuses existing carriers and predicates. Enters by
proposal + grill (C4) before any theorem citing it lands in `docs/` or
`formal/`.

## The free Datalog reading

The EDB is already materialized (SQLite `cas_objects`, or derivable
from bytes by the read law):

```
node(A, Version, Tag).            ref(A, I, B, ExpectedTag).
root(A).                          nameAnn(A, Subject, Name).
progLine(P, I, Op, ...).          -- a stored PProg is literally a relation
```

- **Set semantics is free**: content addressing means re-asserting a
  fact is the `duplicate` arm — Datalog's idempotent insert and the
  store's put are the same move.
- **The estate already runs Datalog programs** without the name:
  children-first closure is `reach(Y) :- reach(X), ref(X,_,Y,_)`; the
  untrusted-host audit is `dangling(A,B) :- ref(A,_,B,_), ¬node(B,_,_)`;
  kind agreement is the obvious join. The "API" is a reading of the
  existing Graph surface, not a new engine.
- **CALM**: grow-only EDB + monotone rules ⇒ confluent, coordination-
  free, deterministic across replicas — the paper's §2 grounding, ours
  by construction.
- **Mechanical insertion**: semi-naive evaluation derives the Δ-rules
  syntactically from any monotone program, so `put` fires exactly its
  deltas into every materialized view. **No deletion ⇒ no DRed**: the
  hard half of incremental view maintenance vanishes. The maintenance
  law is one legible square: `view(σ ⊔ δ) = view(σ) ⊔ Δview(δ)` (T1's
  homomorphism face).
- **Prototype path, zero new abstractions**: recursive CTEs over the
  existing SQLite backend are the monotone fragment today. Negation
  only in audits, run against a named cut, evidence-graded.
- **What the paper adds**: the SLS/ICS + property-testing workflow as a
  G4 lane. The SLS is one line — `resident(N) ⟺ ∃e: put(N) ∈ op(e)` —
  and the harness generates concurrent put/publish contexts, checking
  that memory/file/sql backends AND replica unions converge to it
  (`fast-check` is already admitted; this is a suite, not a system).

## Audit result (2026-08-30): stored state is already monotone

- Roots registry: a grow-only idempotent set — "the set only grows"
  (`library/effects/src/cas/Backend.ts:96-104`); file form is presence
  of `roots/<id>`, a G-Set whose union is file union.
- Naming: `cas name` stores an `Annotations.Annotation` node
  (`foldlab/name` about a subject) and publishes it as a root
  (`bin/cli/naming.ts`) — content, addressed, idempotent. A "rebind" is
  a SECOND node; both stay resident. No overwrite exists.
- Words and receipts: append-only, per-host observations; the run word
  is now explicitly derived (T6).
- No delete/overwrite operation on any backend seam (checked:
  Backend, FileBackend, KvsBackend, SqlRootStore; the Kvs "upsert" is
  of identical bytes — the identity).

**The one gap is the read boundary**: when two name-annotations claim
one name for different subjects, "the current binding" has no pinned
law. Hence:

## Ruling ask 1 — the name-resolution law (query only, no storage change)

**RULED 2026-08-30 — decision 34: option (a) adopted as written** ("I
agree with both asks"). Binding on every future resolution surface; no
current code violates it. The options stand below as the record of
what was weighed.

- **(a) RECOMMENDED — multi-value with fail-closed ties**: the
  resolution query surfaces ALL maximal claims for a name; a tie is
  SHOWN, never silently picked. Single-answer surfaces (e.g. a `--json`
  field wanting one address) either present the set or refuse with a
  typed "ambiguous name" naming every claimant.
- (b) Deterministic tiebreak (e.g. address order): deterministic but
  arbitrary; acceptable only as an explicitly-labeled projection OF
  (a), never as the silent default.
- (c) Last-writer-wins by timestamp: rejected — imports wall-clock
  trust into a store that otherwise trusts only content.
- (d) Defer: tolerable while naming is single-writer, but the query
  should be DOCUMENTED as multi-valued now, so no caller bakes in
  uniqueness.

## Ruling ask 2 — the replication target

**RULED 2026-08-30 — decision 35: target adopted as written** (same
breath). Litestream stays short-term; the lag debt reshapes to the
missing-object set difference; landing order rides the robustness
lane's adopt-vs-build table.

Keep litestream short-term (admitted, restore-verified, single-writer).
The algebra-aligned target: **replicate the object plane as what it is**
— ship objects, union them — via the EXISTING seams
(`ByteReader`/`ByteWriter`/`RootStore`) bound to an S3-compatible object
store (R2/minio/S3): one immutable object per address, roots as
zero-byte keys. Consequences:

- Convergence is T1/T3, not a replication protocol: concurrent writers
  are safe by algebra, no lock, no WAL ordering.
- litestream's named gap ("replica lag UNBOUNDED AND UNMEASURED",
  TOOLS.md row) dissolves into a **missing-object set difference** —
  observable, per-object checkable by the read law (T5).
- SQLite is demoted to a derived local index (the Datalog cache),
  rebuildable from the object plane — the regenerability doctrine
  already wants exactly this.
- Considered and declined: cr-sqlite, LiteFS — machinery for conflicts
  this store cannot have.

Feeds the robustness lane's adopt-vs-build table (SPECS decisions
22/23); a ruling here supersedes-in-shape the litestream row's owed
Wave-3 lag metric.

## Ornamentation / Bloom^L tie

The planes are the lattice family Bloom^L wants (store G-Map, roots
G-Set, annotations G-Set); ornament motifs become monotone views with
mechanically-derived maintenance; the non-monotone judgments (doubt,
audit verdicts) live at the edge — which is the ornamentation ruling's
own "saturation spent only on doubt".

## The store→app API: rules as spec, emitted three ways (2026-08-30)

The operator's named pain: the error-prone hand translation of the
algebra into application-accessible JS functions. The pattern that
kills it is NOT embedding a datalog runtime — it is making the rules
the specification and EMITTING everything else, which is this estate's
own materialize discipline applied to reads:

1. **Rules are the API spec.** One tracked ruleset per view family
   (`reach(Y) :- reach(X), ref(X,_,Y,_)` …), datalog syntax, tiny.
   Monotonicity is checkable syntactically (no negation outside
   declared audit strata), so every ruleset is coordination-free by
   CALM before any code exists.
2. **Emit, never hand-translate.** From each ruleset the generator
   emits: (a) SQL recursive CTEs against the existing SQLite tables
   (server side, already-admitted engine — the monotone fragment runs
   in recursive CTEs today); (b) the typed TS accessor functions — the
   JS API, with names, argument types, and row types all generated and
   byte-gated like every other emitted surface (vectors, mirrors,
   programs); (c) optionally the Lean statement of the view's
   maintenance law — `view(σ ⊔ δ) = view(σ) ⊔ Δview(δ)` — for the
   proof lane. One source, three projections; the hand translation
   disappears as a category.
3. **Browser needs no engine at tier 1.** Decision 21/32 architecture:
   views materialize server-side and ship as served projections; the
   read-only browser store reads them. An embedded engine matters only
   if offline/local-first interactivity becomes a requirement.
4. **Writes stay the typed door.** Datalog is the READ algebra; the
   write path is the join (T1–T6), already settled. No rule ever
   writes.

What this simplifies, honestly bounded: it collapses three
hand-maintained layers (store-access code, component data-fetching,
prose describing what a view means) into ruleset + generated code, and
because the store has NO DELETION, incremental maintenance is pure
delta propagation (no DRed) — re-run is cheap now, deltas are a later
optimization with a provable law. It does NOT remove: the emitter
itself (new work, under the backend-materialize discipline),
negation-bearing audits (bespoke, against a named cut), or the write
path.

**Prior art — the pattern is well-trodden** (survey from model
knowledge, 2026-01 cutoff; every row `pin: PENDING`, resolve before
citing in gated work):

| system | shape | note |
|---|---|---|
| DataScript | in-browser Datomic-model datalog (JS-usable) | THE app-state-as-datalog precedent; Roam Research and Logseq ship on it |
| datalog-ts (Vilter) | pure-TS datalog, incremental, explorable traces | the "UI as materialized datalog views" essays; closest in spirit |
| Riffle (reactive relational) | app state in SQLite, components subscribe to queries | the manifesto for query-derived UI; validates the projections architecture |
| CozoDB | embeddable Rust datalog, WASM + node builds | strongest candidate IF an embedded browser engine is ever needed |
| datafrog | ~minimal Rust datalog core (McSherry) | bring-your-own-everything; WASM-able; powers Polonius |
| SQLite recursive CTEs | the monotone fragment in an admitted engine | zero new dependencies; the server-side emission target |
| Differential Datalog (DDlog) | incremental datalog→Rust | REFUSED: upstream archived |
| Soufflé | compiled analysis-grade datalog | REFUSED for this use: not sensibly embeddable |

If an embedded browser engine is later required, admission candidates
in order: official SQLite WASM (same dialect as the server — one query
language both sides), DataScript (battle-proven, second language),
CozoDB WASM (true datalog, heavier). Each is a TOOLS.md admission with
exact pins; none is admitted today.

## Minting drafts — ready for docs/effect-replay/CONTEXT.md at ratification

Definitions land in `library/cas/Cas/IR/Join.lean` (this session,
working tree; the operator's commit ratifies). Entries per the minting
procedure:

- **Store.Compatible** — judgment, `Store → Store → Prop`: two stores
  disagree nowhere they are both defined (`∀ a n₁ n₂, σ₁ a = some n₁ →
  σ₂ a = some n₂ → n₁ = n₂`). Obligations: symmetric; implied by
  honesty + injective addressing. Avoid: never assumed silently — it
  is the join's partiality boundary, refusal-shaped (the Collision
  arm).
- **Store.Sub** — judgment, `Store → Store → Prop`, the inclusion
  order (`∀ a n, σ₁ a = some n → σ₂ a = some n`). Obligations:
  reflexive/transitive; every positive observation monotone along it;
  `restore ⊑ primary` is its operational face. Avoid: negative
  observations (not-found, audits) do NOT travel along it — state the
  boundary wherever used.
- **join realization** — theorem name, not a carrier: word
  concatenation through `toStore` is the join of compatible words
  (`toStore (w₁ ++ w₂)` = left-biased union; symmetric under
  `Compatible`). Avoid: no `Store.join` operation is minted — the
  join is REALIZED by `++`, per decision 2 (no new sorts) and the
  RUN-002 finding.

## RUN-002 handoff (scout lane)

Target for a real (non-demonstration) scout run per
[LOOP.md](../model-guided-development/LOOP.md): the store join algebra,
T1–T6, frozen at the working tree carrying the 2026-08-30
`putOutcome`/word fix. Intent sentence: "the store under compatible
union is a join-semilattice; put is its point-join; closure, positive
reads, restore, and the word respect the order." Families implicated:
WF-PRESERVE, EXACT-STEP, HOMOMORPHISM, DISTINCTNESS, AGREEMENT.
Falsifiers the run should hunt: a Collision witness against T1's
totality pretensions (must land as the partial-join refusal, not a
wrong join); a cross-half dangling ref against T3 (must be excluded by
its premises); a negative-observation instability presented against T4
(must land on the stated boundary, not inside the theorem). Budget:
LOOP.md defaults. The run row, bank curation, and handoff note are owed
per LOOP.md §10.

**EXECUTED 2026-08-30 as RUN-002**
([runs.md](../model-guided-development/runs.md)): 12-candidate handoff,
4 host properties `sampled-survivor(fast-check)`, CX-011 banked, three
adequacy gaps (AG-1 feeds decision 35's landing). Headline for the
breaker: T1 likely realizes WORD-LEVEL — `toStore (w₁ ++ w₂)` under
`Honest` + byte-scoped injectivity, over the held `Honest.append` /
`Honest.no_alias` / `toStore_append_shadowed` — so the `Store.join`
mint may reduce to notation. Read the run note before packet work.

## The sort event — the greenfield decision (proposed 2026-08-30)

Operator: "this is all green field, nothing's been built, we can
declare new sorts right now… let's make a decision on the most useful
sorts to add." This section is that decision laid out for ruling. It
SCOPES the no-new-sorts law rather than repealing it: **one batch
event, grilled once, then stillness again** — the registry's growth
discipline honored by doing the growth as a single ruled event.

**The principle** (the registry's own, from Annotation.lean's
subject-union argument): *a thing deserves a sort iff the algebra
needs typed, admission-checked references TO it* — a reference
demands one tag, and expected-tag checking is per-tag. Things only
looked up or described ride composites and annotations; things
REFERENCED get tags.

**The five, ranked, each with its reference-demand evidence:**

| sort | shape (sketch) | who references it (the tag demand) | column speed class |
|---|---|---|---|
| **`annotation`** | promote working tag 0x41 to a ratified row (shape landed: key, subject, value) | notes-about-notes (the reflexive rung); sessions citing the annotations they consumed; TODAY it has no registry row at all — a de facto sort missing its papers. The trunk gains the MEANING column — the fold law's `J_t`, visible | steady-fast |
| **`query`** | the spec as content: {generator/rules, aggregator, rung} payload | results bind spec→query; related-edges; annotations-about-queries; the reflexive tower needs the query column visible. The product's center object | steady-fast |
| **`result`** | {spec→query, mark, member edges (free discipline)} | later session steps (addresses-not-payloads hands RESULT handles onward); annotations. Bonus: the memoization key becomes the node's own preimage — spec+mark+members — so dedup-as-memoization is exact by construction. Also this IS the "index kind" naming.ts anticipates: a materialized R2 view page | steady-fast |
| **`agent`** | the identity anchor (the three-edge form the agent language already writes, given its OWN tag instead of riding `entry`) | everything attributed: annotation provenance, sessions, exchanges. The killer: on `entry`'s tag, an edge expecting AGENT-specifically is UNSPELLABLE (per-tag checking) — "who" queries (QD-3) need the distinct tag. Supersedes the entry.agent section ask with a cleaner event; greenfield means the migration is free | near-still |
| **`text`** | the CRDT run: {run payload, parent→text, site, counter} (text-crdt.md) | the parent pointer is SELF-referencing — an edge expecting `text` is unspellable without the tag; structurally forced the day the buffer ships. Greenfield argues declare now so the buffer lands into a ruled wire form; deferring to the buffer build is the honest alternative (TB-2) | bursty on typing |

**Refused a sort, deliberately** (the principle cutting the other way):

- **`vec`/embedding** — nothing references vectors by typed edge;
  lookups go content→vector THROUGH an annotation
  (`foldlab/embedding`, subject = the content, value = ref to the
  chunk). Carrier: chunk bytes + annotation. No tag demand.
- **`index`** — derived; `result` is the materialized page; the
  reverse-ref index is a result family.
- **memory / preference / judge-pin / tombstone** — all annotation
  KEYS, not sorts. The annotation plane is exactly the machine for
  open vocabulary over closed carriers.
- **`step.query`** — a FORM on `step` (additive), not a sort; still
  deferred to SR-1's Lean half (SEARCH-CARRIERS CA-4).

**What rides the same event** (one versioning batch, priced by
Annotation.lean:85-97 — schema-code address moves, stored nodes
don't; there are no stored annotation nodes to re-author):

- the `AnnotationSubject`/`AnnotationValue.ref` widening (CA-1) —
  arms for the content planes (value, file, context, chunk) AND the
  five new sorts, so annotations can be about anything addressable
  including each other;
- the key-family ratification (CA-2): `foldlab/related`,
  `foldlab/search-note`, `foldlab/pref`, `foldlab/embedding`,
  `foldlab/tombstone` — spellings to grill;
- COLUMNS order extension: `agent` joins near-still; `query`,
  `result`, `annotation` join steady-fast; `text` beside `chunk`.

**RULED 2026-08-30 — decision 40** ("ok lets stick to it 1-4
added. done", after the ordered vision readback):

- **S-1 ADOPTED**: the core four — `annotation`, `query`, `result`,
  `agent` — one grilled batch event.
- **S-2 REFUSED, vision-grounded**: `text` does not ride — no logged
  vision sentence orders collaborative editing, and the operator
  clarified same day that Paper is a DESIGN inspiration, not the
  product identity. TB-1's parameterized Lean model stays available
  sortless; the tag is forced only if a buffer is ever commissioned
  (TB-2's original posture stands).
- **S-3 ADOPTED, scoped to the four**: the union widening (content
  planes + the four new sorts; no text arm), the key family
  (spellings at grill), the column placements.
- The decision principle (a sort iff typed references TO it are
  needed) is adopted with the batch; the stillness law resumes the
  moment the batch lands.

**LANDED same day** (`library/cas/Cas/IR/Join.lean`, kernel-checked;
axiom ceiling `propext`+`Quot.sound`, no `Classical.choice`): **T1**
as the left-biased characterization + both inclusions + commutativity
+ idempotence under `Store.Compatible` (associativity is
`List.append`'s); **T1-totality** as `Honest.compatible` (Level-1
`Injective H`; byte-scoped refinement owed); **T2**'s duplicate half
as `put_duplicate_iff`; **T3** as `wf_append`; **T4** partially
(`RefsOk_mono` + the held `resolvesIn_mono`). The predicted
dissolution held: NO `Store.join` operation exists — the join is
realized by word concatenation; only `Compatible` and `Sub` were
minted (drafts below). T5/T6 remain `proposed` (Defun/host lanes);
run-level refusal-preserves-word was REFUTED en route (CX-012 — the
word is grow-only even under refusal; frame-shaped statements only).
