# Plait — consolidated grill sheet (part 3 + the standing ruling queue)

Drafted 2026-08-17 for the operator's grill. **Twenty-one open items**,
one decision at a time, recommended option first, alternatives priced
with cost and reversal, one line on what lands if ratified — the house
style of the estate-focus grill record
(`docs/design/2026-08-15-estate-focus-grill-record.md`).

Sources consolidated and deduplicated: part 3's own grill rows G13–G24
(`docs/design/2026-08-17-plait-harness-plane.md` §12, with its §11
findings and inline coordinator's-call notes); the API iteration log
(`docs/design/plait-api-log.md`, entries 0001–0020, all `proposed`);
the coordinator's standing queue (chaos CLI timing, Synadia posture,
the Effect id-collision disclosure, the draft-33 CI rulings, the
F11/F12 status call); the three wave-2 coordinator drafts
(`draft-31/32/33-*` in this directory — explicitly stated open rulings
only); and the board threads DEV-700 (part-3 report + coordinator
disposition) and DEV-697 (the DevRel product read). Nothing here is a
new grill item; every recommendation cites the law, record,
measurement, or primary source that grounds it. Where a source's
G-number exists it is kept in parentheses.

**What this sheet does not do:** reopen anything already ruled (§B);
answer the two questions part 3 deliberately left unanswered
(declaration upgrade and erasure — item 10 defers the first to its
owner; the second is adopted as a flagged gap, not decided); or edit
any record — this is a scratchpad draft for the grill session.

---

## A. Outsider's key (house terms used below, one line each)

- **digest** — SHA-256 over the one canonical byte form (RFC 8785) of a
  value; its permanent name. Identity is always re-derived, never
  trusted.
- **fold** — a declared reduction over an event stream; the declaration
  has a digest, so "state of fold F over history H" is a name, not a
  cache.
- **anchor** — the checkpoint fact `(fold, partition) → (position
  floor, state digest, head)`; the byte answer to "where did we get
  to".
- **lane / cell / register / blob** — the four commons object families:
  evidence stream; merge-by-union lattice value; lease authority
  advanced by compare-and-swap under a **fencing token** (a
  strictly-increasing number that decides which commit lands, never
  who holds it); content-addressed payload store.
- **refusal** — a typed value returned instead of an exception,
  naming what was wrong, the **law** it defends, and a legal next
  move. Two sorts: **structural** (permanently true; fix the input)
  and **absence** (not-here-yet; retry later).
- **certificate** — the derivation claim on any produced record:
  `{schema digest, program digest, input anchor, span head}`; every
  field re-computable by an auditor.
- **writ / seat / venue / commons** — what a connection may do (read /
  publish / request); a bound role in a protocol session; one
  single-writer daemon with its journals; the shared NATS system
  carrying lanes/cells/registers/blobs.
- **catalog / certifier** — the content-addressed store of declared
  values, and the single admission door into it (ruling G12: programs,
  frames, toolkits — and per part 3, indexes, resources, directories,
  retention policies — are cataloged values, never prose config).
- **the battery vs model gates** — the one required CI check mirrors
  `bun run gates` exactly (no Lean); the Lean/TLA model gates
  (`verify/*/run.sh`) run in CI but are deliberately not required.
- **rungs R0–R5 / layers L0–L4** — the claim ladder (fixture wall →
  mechanized proof) and the assurance ladder (Lean model → generated
  vectors → runtimes walled against them → substrate gate → chaos
  demo). Nothing at L2+ is "proven"; it is walled against the model
  that is.
- **C1–C11, F1–F12** — the construct roster and law roster. C1–C9 and
  F1–F10 are the ratified base (parts 1–2); C10/C11 and F11/F12 are
  part 3's proposals, decided below.
- **epics E1–E11** — the board ladder mirroring the slices: E2 carries
  slice 0 (the spine), E4 slice 1 (the durable fold, dispatch draft
  31), E5 slice 2 (the register, dispatch draft 32), E9 the action
  plane, E10 the chaos gauntlet, E11 MCP/codegen.

---

## B. Already ruled — constraints, not reopened

**The ratification record** (`docs/design/2026-08-17-plait-ratification-record.md`),
operator, 2026-08-17 — G1 charter/home (`packages/plait` +
`verify/fabric*`, own board project); G2 the name Plait; G3 v0 commons
= one non-clustered JetStream node, R=1, liveness SPOF named in the
ledger; G4 connection-identity now, signature seam reserved,
evidentiary claims gated on the estate attribution decision; G5 three
proof homes (zero-dep `verify/fabric` F1–F4/F2b/F9; Veil-pinned
`verify/fabric-veil` F5 with `veil.smt.trust=false`; CSLib F6
deferred); G6 ledger rows land only with slices; G7 dependencies =
`effect@4.0.0-rc.108` + `@nats-io/*@3.4.0` exact, nothing else; G8
part 2 adopted (C6–C9, F7–F10); G9 monotone-only triggers, the
deadline seat as the one sanctioned non-monotone door; G10 policies as
meet-semilattice values, writ compiled to Layers (DX, not security);
G11 the model seam wraps pinned `effect/unstable/ai`; G12 cataloged
values with digests and walls, never files of prose config.

**Mid-flight coordinator rulings** (2026-08-17, recorded as relayed in
the consolidation charge; listed so the grill does not re-ask):

1. **Refusals ride the error channel as values** (part 1 §8.1 design
   rule 1 confirmed) — the spine's boundary-function ok/union shape
   observed on DEV-697 converges to `Effect<A, Refusal, R>` at the
   service surface.
2. **G7's dependency ceiling covers external dependencies only** — a
   workspace dependency on `@foldlab/core` does not breach it
   (resolves the DEV-697 spine observation about the cross-package
   relative import).
3. **The effector re-earn stamps R3 plus the replay wall; R4 stays
   reserved at the 15,378-schedule bar** — the archived rung's own
   lockstep count (`VERIFICATION.md:80`); no R4 language until a
   lockstep run at that bar exists. Binds draft 32 decision 11's
   proposed row text.
4. **`verify/fabric-veil` CI enrolls per draft 33 CI-6** (own
   path-filtered workflow; `~/.elan` + lake-deps caching with the
   10 GiB fit measured before the key is final; weekly cache-free
   tier; cvc5 sha recorded; `trust=false` asserted; `sorryAx`
   refused; `ubuntu-latest` the designated regeneration platform) —
   resolves draft 32's open enrollment DECISION.
5. **`Cell.ts` and the F1 vector family land with E6** — draft 31
   decision 7's named exclusion of cell-merge rows from slice 1's
   wall is now a ruled sequencing fact, not a narrowing.
6. **The Go register twin is written fresh at a new path**, never a
   restore of archived `go/effector`, recorded as a named deviation
   from the restore rule — binds draft 32 decision 7.
7. **`fast-check` is admitted as a devDependency only** (the
   `packages/moves` precedent) — binds draft 31 decision 1.

**Resolved since filing — do not re-open:**

- The two DEV-697 overclaims are already repaired in the ratified
  text: part 2 §2.1 now reads "**at most one landed effect, no matter
  how many attempts** — the safety half only" with the amendment note
  naming the finding, and F10 now closes "that every enabled firing is
  *eventually evaluated* is liveness and carries no claim (amended
  2026-08-17 — the previous 'no missed firings' wording conflated the
  two)" (`docs/design/2026-08-17-plait-action-plane.md:54-69, :259-269`).
- Part 3's findings H-1/H-3/H-4 and DEV-697's Catalog-module finding
  are repaired at commit `62882360e` (`Schema.Codec` arity per the
  pin; `Venues.ts` and `Seats.ts` added to the binding module map) —
  DEV-700 coordinator disposition, re-verified against the pin on the
  same thread.

**Named waits, not rulings** (decisions owned elsewhere; Plait waits
rather than working around): the estate's MCP untyped-argument fix
(gates the search tool's argument shape — part 3 §4.7); the estate
attribution decision (gates tenancy-isolation and human-identity
claims — ruled G4; part 3 §6.2).

---

## C. The open queue — 21 items, program-shaping first, hygiene last

### 1. (G13) Adopt part 3 as the harness plane

**Decide:** whether S1 (search), S2 (resources, naming, retention),
and S3 (the production-composition inventory) enter the program as its
third ring.

**Recommended: yes — adopt whole.** C10 (declared index) and C11
(resource declaration, directory included) join the construct set;
F11/F12 enter the proof plan as *candidates* (their statement-vs-
corollary status is item 12, not assumed here); the §6.1 gap table is
adopted as the production-readiness map **with its two no-answer rows
kept honest** — declaration upgrade deferred to its owner (item 10)
and erasure adopted as a flagged, unanswered gap with consumers named
and no law manufactured. Grounding: the design's own no-new-physics
audit — every S1/S2 capability reduces to the ratified C1–C9/F1–F10
or is flagged with a candidate law and a named consumer (part 3 §2,
§3 grounding table); the demand side is measured, not invented (the
2026-08-14 estate structures map recorded "catalog search is the
meaning fold at a query algebra", query patterns as canonical data,
and result rows as certificates — rows G1/G2/G8 — before this lane
existed); of twelve production concerns inventoried, eight are covered
by construction and two need API only (part 3 §6.1). The text under
ratification is current: merged at `75db129fb`, findings repaired at
`62882360e` (DEV-700 disposition).

**Alternatives, priced:** adopt S1 only, defer S2/S3 — costs the
inventory that shows how little is actually missing, plus the naming
and retention story every deployment asks about on day one; reversal
cheap (S2/S3 return at a later grill). Park part 3 entirely — record
stands, wave-3+ design work loses its basis; reversal free.

**What lands if ratified:** C10/C11 recorded; the gap table becomes
the program's readiness map; slice candidates 1b (the index) and 2b
(resources + directory) become placeable by the coordinator; API-log
entries riding this umbrella (0003–0006, 0010, 0012, 0017, 0020) flip
to `ruled` via item 21's mechanics.

### 2. (G14) An index is a declared fold plus a declared query algebra

**Decide:** the shape of C10.

**Recommended: yes.** An index declaration is a fold declaration (C4)
plus one field — a declared query algebra, a pure function
`(state, query) → result` with queries as canonical data carrying
digests. It deploys under `Folds`' discipline (anchor-guarded
consumption, resumption as the only verb — F3), earns partitioning
only by F4's commutativity brand, and its result rows carry the
**shipped four-field certificate unchanged** (schema = result schema,
program = index digest, input anchor = the anchor read, span head =
the reading span). Ranking is a declared fold, else catalog order; a
model-produced ranking is an action outcome wearing its own
certificate, never the index's — adopting the measured warning "an
LLM-ranked result set is an author claim wearing a certificate's
clothes" (structures map row G11) as API law. Grounding: C4
declared-rights discipline (shipped, CONTEXT.md); F3/F4 proven
shapes; demand rows G1/G2/G8 (measured).

**Alternatives, priced:** an opaque service backed by a search engine
— loses the `(fold digest, head)` memo right, the certificate shape,
and the determinism claim item 5 depends on; reversal hard once
certificates cite query results. A materialized view with bespoke
checkpointing — duplicates anchors, and duplicates them worse (log
entry 0002).

**What lands if ratified:** `Index.ts` / `Search.ts` per the binding
module map; log entries 0002–0006 flip; F11's status is decided at
item 12.

### 3. (G15) Approximate (ANN) indexes are non-commutative folds; v0 ships exact search only

**Decide:** the posture toward approximate nearest-neighbor
structures (HNSW, IVF and relatives).

**Recommended: yes.** ANN builds are order-sensitive and randomized,
so they do not earn `Algebra.commutative`; therefore `partitions > 1`
does not type-check for them — the existing rights table (C4/F4)
sorts them with no new legislation. They remain F3-resumable (the
structure rides the anchored state), any PRNG seed is declaration
data inside the index digest or the declaration refuses, and **recall
is measured against exact search at the same anchor, never claimed**.
v0 ships exact search only: the state is a grow-only vector set (ACI,
partition-parallel), and exact k-NN is a total function once ties
break by identity order (RFC 8785 UTF-16 code-unit sort, the shipped
tie-break). Grounding: the declared-rights discipline — brands are
earned by generated law suites, never asserted (draft 31 decision 3
already enforces exactly this at declaration for folds);
build-behind-consumers (AGENTS.md precept; the estate-focus record's
"un-consumed-machinery pattern this estate rolls back"). The cost is
accepted openly: exact search has an O(N·d) scaling wall — a cost,
not a correctness risk (part 3 risk 3), unremarkable at the estate's
own corpus scale.

**Alternatives, priced:** build ANN now — violates
build-behind-consumers; complexity purchased with no measured
consumer; reversal deletes code but not the spent budget. Refuse
approximate search permanently — forecloses a real need on no
evidence. Admit ANN as commutative by fiat — asserts an unearned
brand; refused by the discipline itself (log 0007).

**What lands if ratified:** the v0 index roster is exact-only; the
approximate shape stays specified-but-unbuilt with its rights row
pre-decided; log 0007 flips.

### 4. (G16) Embeddings are derived records produced by ordinary actions

**Decide:** how vectors enter the fabric.

**Recommended: yes.** An embedding is
`{input digest, embedder capability digest, vector}` with the
ordinary certificate; producing one is a C7 action, so **at most one
outcome lands per `(input, embedder)` declaration** no matter how
many workers race (C7 rides F5's fence). An embedding index is a fold
over that evidence; changing the embedder changes a capability
digest, hence the declarations, hence the index digest — so
**re-embedding is a new fold** and the industry's standard failure (a
partially re-embedded index silently mixing two embedding spaces) is
not representable: two spaces are two digests. Vector dimension is
declaration data on the capability's output schema, so a mismatched
vector refuses structurally at the certifier. Grounding: C7/F5
(proven shape, re-earned at slice 2); the provider seam is the ruled
G11 wrap of the pin's `EmbeddingModel` (`embed`/`embedMany` and the
`Dimensions` service — read in place,
`repos/effect/.../unstable/ai/EmbeddingModel.ts:53, :159-163`).

**Alternatives, priced:** a mutable vector store with in-place upsert
— what every vector store does; makes the mixed-space failure the
default failure; reversal is a migration nobody can audit. Pin the
model by vendor string — a name is not a digest and drifts under you
(log 0008).

**What lands if ratified:** embedding production is an ordinary
fenced action with no new machinery; log 0008 flips.

### 5. (G17) Retrieval enters context programs as a selector family

**Decide:** whether `search(index, anchor, query, k)` joins C6's
selector list.

**Recommended: yes.** The assembled context value's digest then
commits the index, the anchor, the query, and k — so F7's assembly
determinism extends to retrieval and an auditor reconstructs exactly
what the model was shown, including why. Volatility class follows the
anchor: pinned ⇒ `session` (stable prefix, reproducible on replay),
head-relative ⇒ `live`. Grounding: without this production, **F7 is
silently voided for every RAG-shaped program** (part 3 §4.2, named
consumers); the DX consequence is free and aligned — the pinned form
is simultaneously the reproducible path and the provider-cacheable
prefix (part 2 §5.3), so the cheap path and the auditable path are
the same path.

**Alternatives, priced:** retrieval performed outside assembly and
pasted into prompts — voids F7, makes "what did the model see?"
unanswerable; reversal hard after RAG programs exist. A new
volatility class for retrieval — unnecessary; the anchor already
discriminates (log 0009).

**What lands if ratified:** C6 grows one production; reproducible
RAG-with-provenance costs one selector; log 0009 flips.

### 6. (G18) A resource is a cataloged declaration; secrets never enter identity

**Decide:** the shape of C11's resource half.

**Recommended: yes.** A resource is
`{schema, family, state, access class, retention policy, lineage}`
over exactly four substrate families — lane, cell, blob set, edge
capability — admitted through the certifier like every other value
(ruling G12 applied without exception: it has a digest, so it diffs,
refuses on absence, carries a wall, enters certificates). An
edge-capability declaration names `endpoint` and `auth` as
**references, never values**; the credential lives only in the
runtime Layer as the pin's `Redacted` (`Redacted.ts:187, :245`, read
in place), per the architecture's ruled boundary ("only connection
bootstrap stays environmental"); and because **the wire grammar
admits no secret carrier**, a secret-bearing declaration has no
canonical form and refuses structurally — enforcement by grammar, not
by review. Grounding: ruling G12 (ratified); F9 attenuation makes
cataloged edge capabilities attenuable (a door absent from
`parent ⊓ requested` is unreachable to the child).

**Alternatives, priced:** resources as environment config or YAML —
loses the digest, the diff, the refusal-on-absence, the wall, and the
attenuation; G12 already refused this class for programs, frames, and
toolkits; reversal is effectively a re-grill of G12. A fifth "opaque"
family — an untyped escape hatch that swallows exactly the cases
worth declaring (log 0011). Encrypted secrets inside declarations — a
ciphertext is still a value that federates, replays, and lands in
contexts; key management becomes identity management (log 0012).

**What lands if ratified:** `Resource.ts` (name at item 20); the
certifier's structural refusal for secret carriers; log 0011/0012
flip.

### 7. (G19) The directory: grow-only bindings, structural ambiguity, fenced token-ordered rebind

**Decide:** the shape of naming.

**Recommended: yes.** A directory is a lattice cell holding
`Map<Petname, Set<Digest>>` under componentwise union: binding-append
is monotone, coordination-free, duplicate-safe (F1 verbatim — proven
shape, `verify/moves/Moves/Model.lean:200-256` family). Concurrent
binds of one name are not a write-time race but a read-time question:
`resolve` answers with the digest, an **absence** refusal (no
binding — repealed by a later bind), or a **structural**
`ambiguous-binding` refusal listing the candidates and the legal next
move (the replies-teach discipline, `proto/SPEC.md:53`). Rebinding
decides a candidate set is complete — the one non-monotone act — so
it is a register act keyed `(directory digest, petname)` under a
monotone fencing token; resolution reads the binding sealed at the
**greatest observed token**. Grounding: `fence_deterministic`
(proven) demands arbitration be a function of the candidate set
alone — the token order is; no clock enters naming; part 1 §8.5
already refuses LWW registers everywhere. F12 is stated as a
candidate; its status is item 12. One honest bound, pre-registered
(part 3 risk 4): the ambiguity refusal will feel strict — two honest
concurrent binds refuse on read until a rebind decides — and a future
demand for a "just pick one" default is grill material, not a bug
report.

**Alternatives, priced:** an LWW name map — already refused (part 1
§8.5); reintroduces clocks into naming. Single-binding with
create-if-absent — the real fork (named on the DEV-700 thread):
simpler, but an honest concurrent bind becomes a hard failure rather
than a decidable ambiguity, and the coordination-free-append property
dies; reversal moderate (widening to sets later is a schema change on
a cataloged value).

**What lands if ratified:** `Directory.ts` — monotone `bind`, fenced
`rebind`, anchored `resolve`; log 0013/0015 flip.

### 8. (G20) No unanchored resolve — "latest" requires an anchor and is journaled

**Decide:** whether an ambient "latest" exists.

**Recommended: yes — it does not.** `resolve(directory, name,
anchor)` is the only form; a deployed action never carries a name,
only the digest a resolution produced; and the act of resolving is
journaled evidence. Grounding: F8 — a resolution is a head-relative
truth, never wrong later, so "what did `prod` point at last Tuesday?"
is answered by a fact (what resolved, at which anchor, under which
seal) instead of being unanswerable; resolve-picks-one-by-default is
an arbitration rule nobody declared, precisely what
`fence_deterministic` exists to forbid (log 0014).

**Alternatives, priced:** ambient latest — convenience now, an
unanswerable provenance question later; reversal hard once callers
grow dependent on ambience.

**What lands if ratified:** no zero-argument resolve anywhere in the
API; resolution acts appear in journals; log 0014 flips.

### 9. (G21) Retention is cataloged; compaction is a fenced act; the horizon is derived

**Decide:** the retention posture.

**Recommended: yes.** The retention policy is declaration data with a
digest, referenced by the resource — "what may be dropped here" is a
value that diffs and refuses, not an operator's memory. Compaction is
an act — fenced, journaled, attributed, carrying the
`(head, state digest)` pair it replaced — never a background cron.
The **compaction horizon is derived, not chosen**: the minimum anchor
floor across every deployed fold and index reading the lane, read
directly off F3 (resumption is exact, so everything below every floor
is re-derivable); compaction past it refuses rather than warns. The
fabric-KV posture is stated at its slice, never inherited from a NATS
default. Grounding: F3 (proven shape); the shipped compaction
discipline ("loss only ever by explicit choice"; the session
journal's standing refusal — CONTEXT.md) is carried verbatim, and
Plait licenses nothing the estate refuses; part 1 risk 4 named KV
growth as the thing not to inherit silently; draft 32 decision 9
already practices this ruling for the register bucket (history depth
declared in-slice, recorded in DECISIONS) — ratifying generalizes an
already-dispatched discipline.

**Alternatives, priced:** defer retention wholly to the estate's
row-F10 three-tier lane — leaves part 1 risk 4 unanswered where it
bites first; reversal free but the risk stays open. Operator-chosen
retention windows — a heuristic where a derived bound exists (log
0016).

**What lands if ratified:** `Retention.horizon` (a derived read) plus
a retention declaration kind on `Resource.ts`; log 0016 flips.

### 10. (G22) The declaration-upgrade law is deferred to its owner

**Decide:** where "what does a successor declaration license for
folds, anchors, and results keyed by the predecessor's digest?" gets
answered.

**Recommended: yes — defer to the estate's owed grilling #2** (the
dual-record digest scheme, structures-map demand row F6, which also
settles ticket 004's re-derive-vs-dual-record question), with Plait
contributing its named consumers: every long-lived index, every
deployed fold, every cataloged context program. What does not need
the law is already in item 6's shape: a changed declaration is a new
digest, `lineage` pins the predecessor, and old anchors stay true
records (F8). Grounding: seat law — a Plait-local answer would
front-run an open estate decision (AGENTS.md; part 3 risk 7 names
this exactly); the estate's queue already carries the demand (rows
F6, K11 measured).

**Alternatives, priced:** answer it in this lane — refused by seat
law; forks the estate's own question; reversal painful (two upgrade
semantics to reconcile later).

**What lands if ratified:** the gap-table row stays flagged with
consumers named; the estate grilling gains Plait's consumer list as
pressure to schedule it.

### 11. (G23) The external-effect bound is stated everywhere actions are claimed

**Decide:** whether the bound rides the design and every
action-touching ledger row.

**Recommended: yes.** The sentence, verbatim in kind: **at-most-one
landed outcome is not at-most-one external side effect** — C7's
register fences our record, not a vendor's API; a worker that called
a payment API and lost its lease before committing has already called
the payment API. Where a vendor supports an idempotency key, the work
digest is offered as the natural one — stable across retries of the
same declaration and different for a new round, both by construction;
where none exists, the bound is the bound and the mitigation is
declaration granularity plus a compensating pattern, never a
transactionality claim. Grounding: part 1 §5.6 (exactly-once refused
as a claim); part 2 §2.1's amended safety-only phrasing — this item
is that repair's standing generalization, and the DEV-697 competitive
read shows why it is load-bearing: the program's whole argument
against asserted-guarantee competitors is asserted-vs-walled, which a
single overclaimed row would forfeit.

**Alternatives, priced:** silence — named unacceptable in the design
itself; the assumption gets made for us. A transactional-outbox
construct inside the fabric — would claim at the boundary exactly
what part 1 refuses to claim about delivery (log 0019).

**What lands if ratified:** a standing bounds sentence for every
action-touching VERIFICATION.md row (rows still land only with their
slices, per ruling G6); log 0019 flips.

### 12. F11 and F12 — separate law statements, or corollaries of existing F-laws

**Decide:** the coordinator's standing question (part 3 §4.2, §5.4;
deferred to this grill on the DEV-700 thread): does F11 (query
determinism — `query(I, A, q)` is a function of the triple
`(index digest, anchor, query digest)`) get its own statement in
`verify/fabric`, and does F12 (resolution — a head-relative read
determined by `(directory digest, anchor, petname)`, seals arbitrated
by greatest token), or are they corollary notes under F3+F7 and
F1+F5?

**Recommended: separate, minimally scoped statements — both.** Enter
the `verify/fabric` roster as named theorems at target rung R5 (F12's
register half cites the Veil-pinned F5 package rather than
restating it), each with negative controls; their runtime side
conditions (no clock, no ambient locale, no undeclared seed inside a
query algebra; rebind only under declared authority) are enforced at
admission with refusals that cite the law **by name**. Grounding,
three legs. (i) *Precedent*: the estate deliberately restates
classical or derivable results in-house when consumers need the name
— F3 is "classical (`List.foldl_append` shape; Mathlib carries it);
restated in-house", F4 likewise `Multiset.fold_add` restated (part 1
§9.2); derivability has never disqualified a roster entry. (ii) *The
refusal contract needs the names*: the refusal envelope carries a
`law` field, and the offered slice gates are written to cite one —
slice 1b's negative control refuses a clock-reading query algebra at
declaration, and slice 2b's control demands that a stale-token rebind
landing "names the missing law" (part 3 §9.5). A corollary note gives
those refusals nothing to cite: F7 "says nothing about clocks and
seeds inside a query algebra" (part 3 §4.2's own sentence), so citing
F7 would misname the violated condition. (iii) *Proof cost is
measured-small*: the entire `verify/fabric` gate — 39 theorems, four
negative controls, 11 vectors — builds, checks, and regenerates in
8.1 s (ran-it, DEV-697), and the estate hand-proved the semilattice
package in ~55 lines; two more small statements are noise in that
budget. Roster growth: +2 statements plus ~4 control rows; CI cost ≈
0 at the measured baseline.

**Alternatives, priced:** corollary notes only — saves two roster
entries; costs the citable names, so the two slice-gate refusals must
cite composite laws that do not state the violated condition,
diluting the refusals-teach discipline; reversal cheap now, costly
after slices 1b/2b land (refusal texts and certificates re-pointed).
A split ruling (one separate, one corollary) — defensible if the
operator judges only one composition genuinely new; the design marks
F11's new content as the purity side conditions and F12's as the
cross-plane composition. Honest bound, stated with the
recommendation (part 3 risk 1 verbatim): "a lane that proves a
redundant theorem has spent budget on ceremony" — this recommendation
knowingly spends tens of proof lines on ceremony to buy named,
teachable refusals; that trade is the decision.

**What lands if ratified:** F11/F12 join the proof plan as named R5
statements, home `verify/fabric`; slice 1b/2b gate texts get their
law names; part 3 §9 amendment 2 activates as written.

### 13. `plait chaos` timing — an E4 ticket, not E10 pulled forward

**Decide:** when the developer-facing chaos command (DEV-697 §3: the
quickstart that ends "kill it and get the same answer, and here is
the machine-checked reason") ships.

**Recommended (coordinator's lean, endorsed): a thin harness lands as
an E4 ticket** that re-dresses E4's already-mandatory chaos gates,
with the scope fence stated: v0 `plait chaos` drives a user's
**declared fold** through the kill/resume and duplication harnesses
draft 31 decision 8 already requires (hard-kill mid-stream, restart,
drain, byte-equal terminal digests; redeliveries manufactured through
the consumer protocol only) and prints the digest-equality verdict —
it does not accept arbitrary programs. E10 (the gauntlet) is not
pulled forward. Grounding: the harness machinery is E4's mandatory
gate either way, so the marginal cost of a CLI entry over it is
packaging; DEV-697's own costing splits exactly on this line — the
journey examples are "near zero" *because* they re-dress existing
gates, while "parameterizing [the chaos schedule] over a user's
program is a slice-sized item" (R1's cost paragraph); pulling E10
ahead of E4/E5 inverts the dependency ladder and violates
build-behind-consumers. The payoff is real and unique in the DEV-697
scan: no competitor can end a quickstart with a machine-checked
kill-safety verdict. Bound: the thin-harness cost is a spec-level
estimate (E4's harness is dispatched, not yet built); the E4 ticket's
closing report re-prices it, and the ticket is severable if it
balloons.

**Alternatives, priced:** pull E10 forward (DEV-697 R1 as written) —
slice-sized work ahead of the epics it depends on; reversal: delete
the CLI, the gauntlet script stands. Wait for E10 — the program's
most demonstrable property stays invisible through the entire
adoption window the DevRel read documents; reversal free.

**What lands if ratified:** one ticket appended to E4's scope ("the
chaos harness gains a CLI entry point over declared folds"); E10
unchanged.

### 14. Synadia and the competitive posture — capabilities publicly, vendors only in evidence-tier docs

**Decide:** the public positioning rule, prompted by Synadia's
"Heterogeneous agents, one fabric" line and shipped SDKs (DEV-697
§2.6 names this the most time-sensitive item in its report).

**Recommended (coordinator's lean, endorsed): position publicly
against capabilities, never vendors.** The public line names what
Plait proves — convergence under permutation and duplication, fenced
outcomes, content-addressed identity, resumption with nothing to
configure — and no vendor. Vendor-named comparisons live only in
evidence-tier documents (the DEV-697 report is the template:
per-claim tiers ran-it / read-in-place / fetched / index-only, dated,
with a bounds section), and any promotion of such material to a
public page first re-verifies its claims against primary sources.
Grounding: claims-sized-to-evidence is house law, and the DEV-697
Synadia section's own bounds concede its key lines (at-most-once
delivery; the scope exclusions) "come from a fetch summary … not
quotations I hold verbatim" — below the tier a public vendor claim
requires; on the merits the relationship is complement, not
competitor (they scope coordination guarantees *out*; Plait's layer
is exactly what they exclude), so a versus-frame would be wrong twice
over; and the R2 publication discipline (splash only after a verifier
passes; the gauntlet beside the map) already gates the timing. The
interop-node question (a Plait node also answering their
`agents.prompt.*`) is expressly **not** decided here — it touches
ruled G7 (dependency ceiling) and G4 (attribution) and waits for a
measured consumer.

**Alternatives, priced:** vendor-named public comparison now —
publishes fetch-summary-tier claims, the exact failure the ledger's
credibility is built against; their line makes silence sting, but a
wrong public claim stings longer; reversal (retraction) expensive.
Say nothing and decide later — the framing gets written by others
(DEV-697's warning); reversal free.

**What lands if ratified:** a recorded positioning rule binding every
public artifact; vendor material stays in tiered internal docs until
re-verified.

### 15. The Effect durable-execution id collision — disclose upstream before any public use

**Decide:** the disclosure/publication posture for the reproduced
collision (ran-it, DEV-697 §2.5: workflow tag `order-ship` / key `42`
and tag `order` / key `ship-42` share pre-image `order-ship-42` and
execution id `2b9516063c7a2d2bd6bd5d9f9c31f58d`; the pre-image is an
unescaped `${tag}-${key}` join SHA-256-truncated to 16 bytes —
`Workflow.ts:316-317`, `internal/crypto.ts:4-15` at the vendored pin
`4.0.0-rc.108`).

**Recommended (coordinator's lean, endorsed): keep the committed
reproduction as the refusal's in-tree evidence, and disclose upstream
before any public use.** The reproduction re-establishes in place the
estate's recorded refusal of Effect durable execution (part 1 §3;
synthesis §3.5) — verify-before-belief working as designed — and its
evidentiary value is independent of publicity. The surface is an
`unstable/` namespace in a release candidate of a dependency the
program ships on (ruled G7): an upstream report is cheap, likely
welcomed at RC stage, and both responsible-disclosure norms and plain
self-interest point the same way. Any eventual public material takes
the frame DEV-697 pre-registered: "why we kept our own identity while
adopting Effect for the rest" — never "Effect is broken."

**Alternatives, priced:** publish now as competitive material — the
sharpest fact the program owns (six lines demonstrate a whole bug
class), but it names a live defect in a dependency without notice;
costs upstream goodwill the pin strategy depends on; irreversible
once public. Never publish — wastes a demonstrable contrast; reversal
free. Hold without disclosing — leaves the defect live upstream for
everyone while the RC window (when a fix is cheapest) closes.

**What lands if ratified:** an upstream issue is filed (operator act
or delegated with sign-off); the reproduction stays committed as the
refusal's evidence; public use is gated on the disclosure.

### 16. Promote `lean-gates.yml` to a required check? — no

**Decide:** draft 33 §10.1.

**Recommended (coordinator's lean, endorsed): no — not now, with the
revisit trigger recorded.** Grounding: the required-check ≡
local-battery equation is documented law twice (`docs/OPERATIONS.md`
branch protection; AGENTS.md — "the model gates are separate and are
NOT part of that battery"), and the local battery deliberately runs
no Lean; the silent channel the promotion would close — a hand-edited
fixture passing the required lane — is closed instead *inside* the
battery by CI-3's fixture-manifest tripwire (fixtures-changed-
without-model and model-changed-without-regeneration both fail `bun
run gates` and CI, no Lean toolchain needed); the tripwire's one
stated bound (it cannot detect a forged baseline — fixture edited and
manifest recomputed over it) is exactly what the per-PR Lean gate
catches, and that gate is red-visible on every PR with the
coordinator's merge act reading it (OPERATIONS, "How work reaches
main"). Two independent layers, each named for what it proves —
walls-need-independent-oracles applied to CI. Revisit trigger, on
record now: when the corpus count grows enough that the
forgery-window argument feels thin (draft 33 §10.1's own words).

**Alternatives, priced:** promote now — mechanically viable
(deterministic, pinned, ~30–60 s measured), but breaks required ≡
local (machines without elan cannot reproduce the required lane) and
edits branch protection (operator act); reversal cheap (un-require).

**What lands if ratified:** `lean-gates` stays non-required; CI-3's
tripwire stage is confirmed as the required-lane enforcement; the
revisit trigger is recorded in this sheet's outcome.

### 17. Sha-record the Lean toolchain tarball — at first bundle, not per-run now

**Decide:** draft 33 §10.3 — adopt tarball sha-recording now, or when
the first verifier bundle is assembled.

**Recommended: at first bundle.** Grounding: pins-by-recording serves
a claim consumer, and the first consumer of a tarball sha is the
bundle PROVENANCE (draft 33 CI-4 — tag, commit, toolchain, platform,
green-run URL); before that it is an unconsumed datum. The cheap tier
is already adopted per CI-1: every job log records `elan --version`
and the resolved toolchain line. The distinguishing fact: elan
resolves an **immutable release tag** — "nothing rolls, so there is
nothing for a canary to catch" (draft 33 §1) — unlike the TLC jar and
cvc5, whose sha-recording is already mandated (CI-6) precisely
because those upstream assets can roll. Recording the tarball sha in
the first PROVENANCE also completes tier 3's "a stranger recomputes
it" story: the stranger can confirm the same toolchain bytes.

**Alternatives, priced:** adopt per-run now — one recorded line, near
zero cost; buys belt-and-suspenders integrity for any pre-bundle
VERIFICATION row citing a run; a defensible operator preference if
toolchain integrity is wanted as a claim earlier; reversal free (stop
recording). Defer past the first bundle — leaves PROVENANCE citing a
toolchain by name only; refused.

**What lands if ratified:** the first bundle assembly records the
tarball sha in PROVENANCE; per-run logging stays at the
toolchain-line tier until then.

### 18. Verifier-bundle cadence — first at slice 1, then every slice tag

**Decide:** draft 33 §10.4 — a bundle at every slice tag, or first at
slice 1.

**Recommended: first at slice 1, and every slice tag thereafter.**
Grounding: slice 1 is "the first tag with a Lean-emitted corpus
behind a runtime" (draft 33 §10.4) — the first point where all three
verifier tiers certify something (tier 1 digests; tier 2 the package
wall replaying the corpus against the TS runtime; tier 3 full
re-emission). A slice-0 bundle's middle tier would be vacuous, which
invites exactly the oversold-bound reading the dogfood rule forbids
(a report without a runnable artifact is a failed run). The
OPERATIONS releases law (tag at ladder milestones; artifacts are
verifier bundles) is honored either way, and the `plait-bundle.yml`
trigger (tag push on `plait-*`) makes "every tag thereafter"
automatic once tagging starts.

**Alternatives, priced:** every slice tag from slice 0 — one bundle
with an empty middle tier; reversal free. Later than slice 1 — no
ground; the wall exists at slice 1.

**What lands if ratified:** the first `plait-*` tag lands at slice 1
with the first bundle attached; cadence thereafter is mechanical.

### 19. Route for the two `run.sh` amendments — a follow-up brief, not PR #66 review scope

**Decide:** draft 33 §10.2 — how the two additive amendments to
`verify/fabric/run.sh` (name the divergent row on regeneration
failure; add `--self-test` with the two planted-mutation controls)
reach the tree: PR #66 Rev feedback, or a follow-up brief after
DEV-695 merges.

**Recommended: a follow-up brief.** Grounding: the charter's PM law —
"every dispatch an issue whose body is the whole scope" (ratification
record, execution directive 2) — makes mid-review scope addition
through the Rev channel a discipline break (Rev posts *findings*
against the dispatched scope; these are additive features, not
findings); nothing breaks in the interim, because draft 33's CI-2
upload step is written tolerant (`if-no-files-found: ignore` on the
`.regen/` evidence path), so the CI job can land before the
amendments do; and the amendments are two small separable items —
exactly follow-up-brief shaped.

**Alternatives, priced:** PR #66 Rev feedback — one dispatch
round-trip faster; costs the scope-is-the-issue-body discipline and
asks the Eng seat to build from unreviewed spec text in a comment;
reversal n/a.

**What lands if ratified:** a one-issue follow-up brief (divergent-
row naming; `--self-test`) queued behind DEV-695's merge.

### 20. (G24) Module naming against the `effect` barrel — keep `Resource`, state the alias rule

**Decide:** finding H-2's disposition: the pin's barrel exports
`Resource` (`repos/effect/packages/effect/src/index.ts:497`, a
refreshable scoped value) and `Schedule` (`:512`); Plait proposes a
`Resource` module.

**Recommended: keep `Resource`; state the alias rule in the module
JSDoc; keep avoiding the `Schedule` collision by not minting that
module at all** (already the design — scheduling is a declared value
plus the deadline seat, log 0017). Grounding: `Resource` is the plain
word in all three vocabularies the surface touches — the estate's,
MCP's own (the ruled introspection door serves declarations as MCP
*resources*, architecture §5), and an outsider's; the 2026-08-13
prose ruling (outsider legibility beats house dialect) cuts for the
plain word; the collision costs one import alias only in files that
import both barrels, a pattern Effect users already practice for its
own overlapping names.

**Alternatives, priced:** rename to `Holding` or `Substrate` — no
collision, costs the plain word and the MCP vocabulary alignment;
reversal after ship is a breaking rename. Prefix every module
(`PlaitResource`) — noise on every import for a rarely-hit collision
(log 0018).

**What lands if ratified:** `Resource.ts` stands; the JSDoc alias
note becomes E-series acceptance text; log 0018 flips.

### 21. Ratify the API iteration log itself (log entry 0001)

**Decide:** whether `docs/design/plait-api-log.md` stands as the
program's decision index, in the shape it bootstrapped.

**Recommended: yes.** Append-only; one decision per entry; monotone
four-digit numbering, never reused; every entry carries its source;
fixed status vocabulary (`proposed / ruled / shipped / superseded by
NNNN / withdrawn`); landed entries are never edited for content —
supersede instead. Grounding: DEV-700 commissioned the bootstrap; the
discipline is `proto/DECISIONS.md`'s, already house law (AGENTS.md
DECISIONS-log precept); the alternatives' failure modes are on the
estate's own record — board-only decisions already lost two specs,
and per-task DECISIONS files die with their task (entry 0001's
alternatives, citing that history); and the maintenance mechanics are
already agreed on the DEV-700 thread: when this grill closes, the
seat appends one status-flip entry per ruling, each citing the
ruling, and an adverse ruling gets a superseding entry, never an
edit.

**Alternatives, priced:** per-task logs only / the board only / a
decisions section inside each design record — each priced in entry
0001; all lose the one-file answer to "why is the surface shaped like
this?" and the one-grep answer to "has anyone thought about X?".
Reversal: stop appending; the landed record stands.

**What lands if ratified:** entry 0001 flips to `ruled`, and the log
then absorbs this whole sheet's outcomes in one append — the
bookkeeping that closes the grill.

---

## D. Probe ledger

No item above is marked needs-a-probe: every recommendation is
grounded in a ratified ruling, a proven or measured result, a
read-in-place source, or a ran-it reproduction, as cited inline. Two
in-item conditions are probes by another name and are recorded so
they are not lost: item 13's thin-harness cost is a spec-level
estimate re-priced by the E4 ticket's closing report (severable if it
balloons), and item 14 conditions any future public promotion of
vendor material on re-fetching the primary pages whose claims are
currently index-only or fetch-summary tier (DEV-697's own bounds
section names which).
