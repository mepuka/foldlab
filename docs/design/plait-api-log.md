# Plait — the API iteration log

An **append-only** record of every decision taken about Plait's API
surfaces: what was decided, what else was on the table, and where the
decision stands. It exists so that design state stays legible without
re-reading four design records — an agent or a human can answer "why is
the surface shaped like this?" from one file, and "has anyone thought
about X?" by grepping one file.

Opened 2026-08-17 (DEV-700). Maintained by the API and capability
design seat; entries land via PRs on that seat's branch and the
coordinator merges.

## How this log works

1. **Append only.** A landed entry is never edited for content. Fix a
   decision by writing a NEW entry that supersedes it, and mark the old
   one `superseded by NNNN`. Typos and broken links may be repaired in
   place; nothing else.
2. **One decision per entry.** If two things can be ruled on
   separately, they are two entries.
3. **Numbering is monotone**, four digits, never reused — the same
   discipline `proto/DECISIONS.md` uses. Gaps are fine; renumbering is
   not.
4. **Every entry carries its source**: the design record section, the
   ruling, or the issue that produced it. An entry with no source is a
   preference, not a decision.
5. **Status vocabulary**, and nothing else:

   | Status | Meaning |
   | --- | --- |
   | `proposed` | stated in a design record; awaiting the coordinator's grill |
   | `ruled` | grill closed; the ruling is cited in the entry |
   | `shipped` | code on main implements it, behind its gate |
   | `superseded by NNNN` | replaced; the entry stays for the record |
   | `withdrawn` | dropped before any ruling; the reason is stated |

   A ruling updates an entry's `Status` line in place and cites the
   ruling there; the prose above it is never touched. Entry
   [0021](#0021--a-ruling-flips-an-entrys-status-never-its-prose) states
   the mechanic and carries each ratification's flip table. (Clause
   added 2026-08-17 with the first ratification pass; the five rules
   above are unchanged.)

6. **Claims are tiered** here as in the design records (ratified /
   proven / measured / shipped / proposed / lead). An entry never
   claims a rung its evidence does not carry.

## Index

| № | Date | Surface | Decision, in one line | Status |
| --- | --- | --- | --- | --- |
| [0001](#0001--the-log-itself) | 2026-08-17 | docs | this log exists, append-only, one decision per entry | ruled |
| [0002](#0002--indexdeclare) | 2026-08-17 | `Index` | an index is a declared fold plus a declared query algebra | ruled |
| [0003](#0003--queries-are-canonical-data) | 2026-08-17 | `Query` | a query is a value with a digest, answered by a declared pure function | ruled |
| [0004](#0004--query-purity-side-conditions) | 2026-08-17 | `Index` | no clock, no ambient, no undeclared seed; ties break by identity order | ruled |
| [0005](#0005--searchquery-returns-certified-rows) | 2026-08-17 | `Search` | result rows carry the shipped certificate shape; no new fields | ruled |
| [0006](#0006--freshness-is-a-precondition-not-a-wait) | 2026-08-17 | `Search` | `atLeastHead` refuses with the absence sort; no blocking read exists | ruled |
| [0007](#0007--approximate-indexes-are-non-commutative-folds) | 2026-08-17 | `Index` | ANN fails the commutative brand: single-partition, resumable, never merged | ruled |
| [0008](#0008--embeddings-are-derived-records-produced-by-actions) | 2026-08-17 | `Models` / `Index` | the embedder capability digest rides every embedding; re-embedding is a new fold | ruled |
| [0009](#0009--retrieval-is-a-selector-family) | 2026-08-17 | `Contexts` | `search(index, anchor, query, k)` joins C6; volatility follows the anchor | ruled |
| [0010](#0010--querying-is-the-read-verb) | 2026-08-17 | `Policy` | no new writ verb; allowlists are policy value fields | ruled |
| [0011](#0011--resourcedeclare) | 2026-08-17 | `Resource` | a resource is a cataloged declaration over four substrate families | ruled |
| [0012](#0012--secrets-never-enter-identity) | 2026-08-17 | `Resource` | declarations name credentials; the wire grammar admits no secret carrier | ruled |
| [0013](#0013--the-directory-is-a-grow-only-cell) | 2026-08-17 | `Directory` | petname → set of digests; append is monotone and coordination-free | ruled |
| [0014](#0014--resolve-requires-an-anchor) | 2026-08-17 | `Directory` | there is no ambient "latest"; resolution is journaled | ruled |
| [0015](#0015--rebind-is-a-fenced-register-act) | 2026-08-17 | `Directory` | greatest landed fencing token decides; no LWW, no clock, no force flag | ruled |
| [0016](#0016--retention-is-cataloged-and-the-horizon-is-derived) | 2026-08-17 | `Retention` | the compaction horizon is the minimum anchor floor across deployed folds | ruled |
| [0017](#0017--no-schedule-module) | 2026-08-17 | (none) | scheduling is a declared value plus the deadline seat; no module is minted | ruled |
| [0018](#0018--module-names-against-the-effect-barrel) | 2026-08-17 | packaging | keep `Resource`, state the alias rule; avoid `Schedule` by not minting it | ruled |
| [0019](#0019--the-external-effect-bound-is-part-of-the-surface) | 2026-08-17 | `Actions` | at-most-one landed outcome ≠ at-most-one external side effect | ruled |
| [0020](#0020--introspection-and-configuration-ride-the-one-mcp-door) | 2026-08-17 | `unstable/mcp` | derived tools + digest resources; no subscription product | ruled |
| [0021](#0021--a-ruling-flips-an-entrys-status-never-its-prose) | 2026-08-17 | docs | status is entry state; a ratification lands as one entry with its flip table | ruled |
| [0022](#0022--refusals-ride-the-error-channel) | 2026-08-17 | `Refusal` / every fallible surface | `Effect<A, Refusal, R>` — tagged errors on the error channel, not `{ok}` unions | ruled |
| [0023](#0023--the-conformance-gate-enumerates-the-public-surface) | 2026-08-17 | package gates | the refusal-channel gate derives from the barrel; a gate that lists is a gate that drifts | ruled |
| [0024](#0024--f2b-is-the-successor-discipline-the-floor-is-a-derived-record) | 2026-08-17 | `Folds` / `Anchors` | the discipline protects, the floor records; `guard_is_redundant` is rostered | ruled |
| [0025](#0025--g7s-ceiling-is-external-dependencies-only) | 2026-08-17 | packaging | workspace seams are declared, not smuggled; G7 bounds external deps | ruled |
| [0026](#0026--the-three-cas-disciplines-are-never-unified) | 2026-08-18 | `Cells` / `Registers` / `Anchors` | joins retry, registers reconcile, anchors detach — three laws, never one combinator | ruled |
| [0027](#0027--memo-permanence-a-digest-keyed-entry-is-never-invalid-only-evictable) | 2026-08-18 | `Resolved`, every digest-keyed memo | G-3's licence generalized off the resolve path; validity and retention are different sentences | proposed |
| [0028](#0028--batching-is-carriage-no-public-batch-verb) | 2026-08-18 | `Catalog` / `Payloads` / `Resolved` | resolvers batch underneath; `resolve(digest)` keeps its signature and no `resolveAll` ships | proposed |
| [0029](#0029--the-consumer-seam-streams-by-unfold-and-ships-as-chatter) | 2026-08-18 | `Session` | the coalgebra half is `Stream.unfold` over the landed `read`; no parity claim until AE-4 | proposed |
| [0030](#0030--fan-out-strategy-is-a-rung-claim-not-a-tuning-knob) | 2026-08-18 | watch feeds (`Cells` / `Registers`) | `sliding`/`dropping` are admissible only where the payload's algebra absorbs loss | proposed |
| [0031](#0031--one-algebra-service-and-one-replay-driver-the-cas-disciplines-stay-three) | 2026-08-18 | `Algebra`, the internal drive loops | unify the algebra and F2b's loop; 0026's three write disciplines are untouched | proposed |
| [0032](#0032--rungcombinator-the-license-table-materialized-in-types) | 2026-08-18 | the shared stream surface | a combinator's soundness side-condition is a law atom; §8.5's rows become compile errors | proposed |
| [0033](#0033--every-shared-service-takes-its-sorts-from-the-generated-corpus) | 2026-08-18 | every shared-service Layer | the generated corpus family is the only type vocabulary; a parallel shape is a sketch owing a ticket | proposed |
| [0034](#0034--the-carrier-parameter-is-the-unification-seam) | 2026-08-18 | `Digest` and the brand family | `KernelDigest<Kind, Carrier>` already takes the runtime carrier; unification is an instantiation, not a rewrite | proposed |
| [0035](#0035--the-door-is-total-inward-and-the-error-channel-is-outward) | 2026-08-18 | `KernelDoor` / every host | `admit` stays a total function for conformance; hosts map the verdict to a refusal by table lookup | proposed |

---

### 0001 — the log itself

- **Date:** 2026-08-17
- **Surface:** documentation / process
- **Decision:** maintain an append-only API iteration log at
  `docs/design/plait-api-log.md`, numbered, one decision per entry, each
  carrying its source and a status from the fixed vocabulary above.
  Numbered design records stay where they are (`docs/design/`); this log
  indexes the *decisions*, not the prose.
- **Alternatives:** per-task `DECISIONS.md` files only (they exist per
  task and die with it — no cross-task view); the Multica board only
  (decisions live in comment threads that a fresh checkout cannot read —
  the same failure the estate already recorded when a review lost two
  specs); a section inside each design record (splits the answer to
  "why is the surface like this?" across four documents and grows a
  fifth).
- **Status:** ruled — grill sheet item 21 (ratified 2026-08-17): the log
  stands as the program's decision index in the shape it bootstrapped.
- **Source:** DEV-700 issue body; `AGENTS.md` §Working precepts
  (DECISIONS-log law, `scratch/` tracking rationale).

### 0002 — `Index.declare`

- **Date:** 2026-08-17
- **Surface:** `Index`
- **Decision:** an index declaration is a fold declaration (C4) plus one
  field, a declared query algebra. It deploys under `Folds`' discipline
  — anchor-guarded consumption, ack floor advancing only after the
  anchor CAS lands, resumption (F3) as the only verb. No new substrate
  object is introduced.
- **Alternatives:** an index as an opaque service backed by a search
  engine (loses the `(fold digest, head)` memo right, the certificate
  shape, and any determinism claim retrieval could inherit); an index as
  a materialized view with its own bespoke checkpointing (duplicates
  anchors, and duplicates them worse).
- **Status:** ruled — grill sheet item 2 (G14), ratified 2026-08-17;
  C10 joins the construct set under item 1 (G13).
- **Source:** part 3 §4.1; C4 declared rights; estate demand row G1
  ("catalog search is the meaning fold at a query algebra", measured).

### 0003 — queries are canonical data

- **Date:** 2026-08-17
- **Surface:** `Query`
- **Decision:** a query is a canonical value with a digest, and the
  query algebra is a declared pure function `(state, query) → result`.
  Query identity enters the memo key and the result's certificate.
- **Alternatives:** queries as closures (no digest, no memo, no
  provenance — anonymous algebras already refuse identity by house
  law); queries as strings in a query language (a parser is a second
  admission path, which the certifier law forbids).
- **Status:** ruled — grill sheet item 2 (G14), which adopts
  queries-as-canonical-data as the second half of the index shape; also
  named in item 1's umbrella flip list.
- **Source:** part 3 §4.1; estate demand row G2 (the pattern carried as
  canonical data); CONTEXT.md §Declared algebra ("anonymous algebras run
  fine and refuse identity").

### 0004 — query purity side conditions

- **Date:** 2026-08-17
- **Surface:** `Index` / admission
- **Decision:** a declared query algebra may not read a wall clock, a
  locale, process-local ordering, or an undeclared random source; an
  approximate index that needs a PRNG carries **the seed as declaration
  data**, so the seed is inside the index digest. Ties break by
  **identity order** (RFC 8785 UTF-16 code-unit sort), never insertion
  order, which makes top-k a total function of the state.
- **Alternatives:** enforce purity by convention and review (the estate
  has measured what convention is worth — the drift-engine finding);
  allow undeclared seeds and treat determinism as best-effort (voids the
  candidate law and every consumer that depends on it).
- **Status:** ruled — grill sheet item 2 (G14). These side conditions
  are F11's admission-time enforcement, and item 12 rules F11 a separate
  minimally scoped statement, so the refusal cites the law by name.
- **Source:** part 3 §4.1–4.2; CONTEXT.md §Identity order; part 1 §8.5
  (no wall-clock timestamps in identity-bearing positions).

### 0005 — `Search.query` returns certified rows

- **Date:** 2026-08-17
- **Surface:** `Search`
- **Decision:** a result row carries the shipped certificate unchanged —
  `schema` = result schema digest, `program` = index digest,
  `input anchor` = the anchor read, `span head` = the reading span. The
  caller re-derives; nothing is trusted. Ranking is a declared fold,
  else catalog order; a model-produced ranking is an action outcome with
  its own certificate and never wears the index's.
- **Alternatives:** rows as plain values with a score (the estate's own
  warning applies: "an LLM-ranked result set is an author claim wearing
  a certificate's clothes"); a new certificate variant for search
  (unnecessary — the four shipped fields already fit exactly).
- **Status:** ruled — grill sheet item 2 (G14), which adopts the
  LLM-ranking warning (structures-map row G11) as API law.
- **Source:** part 3 §4.1, §4.2; CONTEXT.md §Certificate; estate demand
  rows G8, G11.

### 0006 — freshness is a precondition, not a wait

- **Date:** 2026-08-17
- **Surface:** `Search`
- **Decision:** `Search.anchor(index)` returns the freshness fact.
  `Search.query({..., atLeastHead: h})` refuses with `sort: "absence"`
  until the anchor passes `h`. No blocking read, no staleness tolerance
  in milliseconds, no `waitForFreshness` exists.
- **Alternatives:** a blocking read with a timeout (reintroduces time
  into the read path and hides backpressure); a staleness tolerance
  parameter (an estimate where a fact is available).
- **Status:** ruled — grill sheet item 2 (G14); named in item 1's
  umbrella flip list.
- **Source:** part 3 §4.3; part 1 §7.1 (refusal sorts as typed
  backpressure); part 2 F8 (head-relative truth).

### 0007 — approximate indexes are non-commutative folds

- **Date:** 2026-08-17
- **Surface:** `Index`
- **Decision:** ANN structures (HNSW, IVF and relatives) are
  order-sensitive and randomized, so they do not earn
  `Algebra.commutative`; therefore `partitions > 1` does not type-check
  for them, they resume by F3 with the structure inside the anchored
  state, and their **recall is measured, never claimed**. v0 ships exact
  search only; the approximate shape is specified and unbuilt until a
  measured consumer exists.
- **Alternatives:** build ANN now (violates build-behind-consumers);
  admit ANN as commutative by fiat (asserts a brand instead of earning
  it — refused by the declared-rights discipline); refuse approximate
  search permanently (forecloses a real need on no evidence).
- **Status:** ruled — grill sheet item 3 (G15): the v0 index roster is
  exact-only; the approximate shape stays specified-but-unbuilt with its
  rights row pre-decided. The O(N·d) scaling wall is accepted openly as
  a cost, not a correctness risk.
- **Source:** part 3 §4.4; C4 commutativity class; F4.

### 0008 — embeddings are derived records produced by actions

- **Date:** 2026-08-17
- **Surface:** `Models` / `Index`
- **Decision:** an embedding is `{input digest, embedder capability
  digest, vector}` with the ordinary certificate; producing one is a C7
  action, so at most one outcome lands per `(input, embedder)`
  declaration. An embedding index is a fold over embedding evidence.
  Changing the embedder changes a capability digest, hence the index
  digest: re-embedding is a new fold and in-place index mutation is not
  representable. Dimension is declaration data on the capability's
  output schema, so a mismatched vector refuses structurally.
- **Alternatives:** a mutable vector store with upsert (what every
  vector store does; makes a half-re-embedded index — two embedding
  spaces mixed silently — the default failure); pin the model by vendor
  string (a name is not a digest and drifts under you).
- **Status:** ruled — grill sheet item 4 (G16): embedding production is
  an ordinary fenced action with no new machinery.
- **Source:** part 3 §4.4; part 2 C7; pinned
  `unstable/ai/EmbeddingModel.ts` (`embed`, `embedMany`, `Dimensions`).

### 0009 — retrieval is a selector family

- **Date:** 2026-08-17
- **Surface:** `Contexts`
- **Decision:** C6's selector list gains
  `search(index, anchor, query, k)`, so the assembled context value's
  digest commits index, anchor, query and k, and F7's determinism
  extends to retrieval. Volatility class follows the anchor: pinned ⇒
  `session` (stable prefix, reproducible), head-relative ⇒ `live`.
- **Alternatives:** retrieval performed outside assembly and pasted into
  a prompt (voids F7 for every RAG-shaped program and makes "what did
  the model see?" unanswerable); a new volatility class for retrieval
  (unnecessary — the anchor already discriminates).
- **Status:** ruled — grill sheet item 5 (G17): C6 grows one
  production, and reproducible RAG-with-provenance costs one selector.
- **Source:** part 3 §4.5; part 2 C6, F7, §5.3.

### 0010 — querying is the `read` verb

- **Date:** 2026-08-17
- **Surface:** `Policy`
- **Decision:** the harness mints no writ verb. Querying is `read`.
  Policy gains `indexes` and `resources` allowlists as **value fields**,
  meet-intersected on spawn (F9). The C8 honesty box is repeated
  wherever these appear: an allowlist is developer experience, not
  security; security is the connection's permissions plus server-side
  refusal plus the pending attribution decision.
- **Alternatives:** a `query` writ verb (grows the three-verb writ that
  W9 keeps small, for no authority that does not already exist); ACLs
  outside the policy value (loses attenuation and the digest).
- **Status:** ruled — grill sheet item 1 (G13), which flips this entry
  by name under part 3's adoption (amendment 4).
- **Source:** part 3 §4.6; part 1 §7.1; part 2 C8/F9.

### 0011 — `Resource.declare`

- **Date:** 2026-08-17
- **Surface:** `Resource`
- **Decision:** a resource is a cataloged declaration `{schema, family,
  state, access class, retention policy, lineage}` whose state is one of
  four substrate families — lane, cell, blob set, or edge capability.
  Admission is through the certifier like every other value (ruling
  G12).
- **Alternatives:** resources as environment configuration or YAML
  (loses the digest, the diff, the refusal-on-absence, the wall, and the
  attenuation — and ruling G12 already refused it for programs, frames
  and toolkits); a fifth "opaque" family (an untyped escape hatch that
  would swallow exactly the cases worth declaring).
- **Status:** ruled — grill sheet item 6 (G18); C11 joins the construct
  set under item 1 (G13).
- **Source:** part 3 §5.1; ruling G12.

### 0012 — secrets never enter identity

- **Date:** 2026-08-17
- **Surface:** `Resource` (edge capabilities)
- **Decision:** an edge-capability declaration names `endpoint` and
  `auth` as **references**, never values. The credential lives only in
  the runtime Layer as the pin's `Redacted`, supplied from the
  environment. The wire grammar admits no secret carrier, so a
  declaration that embeds one has no canonical form and refuses
  structurally at the certifier.
- **Alternatives:** encrypted secrets inside declarations (a ciphertext
  is still a value that federates, replays, and lands in contexts;
  key management then becomes identity management); a separate
  non-cataloged config file for connections (a second admission path,
  which the certifier law forbids).
- **Status:** ruled — grill sheet item 6 (G18): enforcement is by
  grammar, not by review. Also named in item 1's umbrella flip list.
- **Source:** part 3 §5.2; architecture §5 ("only connection bootstrap
  stays environmental"); pinned `Redacted.ts:187, :245`.

### 0013 — the directory is a grow-only cell

- **Date:** 2026-08-17
- **Surface:** `Directory`
- **Decision:** a directory is a lattice cell holding
  `Map<Petname, Set<Digest>>` under componentwise union. Binding-append
  is monotone, coordination-free and duplicate-safe (F1). Concurrent
  binds of one name are not a write-time race; they are a two-element
  set and a **read-time** question.
- **Alternatives:** single-binding with create-if-absent (turns an
  honest concurrent bind into a hard failure rather than a decidable
  ambiguity); LWW name map (already refused by part 1 §8.5 — LWW
  registers are not exposed anywhere).
- **Status:** ruled — grill sheet item 7 (G19), with that item's honest
  bound pre-registered: the ambiguity refusal will feel strict, and a
  future "just pick one" default is grill material, not a bug report.
- **Source:** part 3 §5.3; C1/F1.

### 0014 — `resolve` requires an anchor

- **Date:** 2026-08-17
- **Surface:** `Directory`
- **Decision:** `resolve(directory, name, anchor)` has three answers:
  the digest; an **absence** refusal (no binding — repealable); or a
  **structural** `ambiguous-binding` refusal naming the candidates and
  the legal next move. There is no zero-argument "latest". A deployed
  action carries the digest a resolution produced, and the act of
  resolving is journaled evidence.
- **Alternatives:** ambient latest (convenience now; "what did `prod`
  point at last Tuesday?" becomes unanswerable later); resolve-picks-one
  by some default order (an arbitration rule nobody declared, which is
  precisely what `fence_deterministic` exists to forbid).
- **Status:** ruled — grill sheet item 8 (G20): no zero-argument
  resolve exists anywhere in the API, and resolution acts appear in
  journals.
- **Source:** part 3 §5.3; part 2 F8; W7 *replies teach* — "every fact
  carries what to do next" (`proto/SPEC.md:53`).

### 0015 — rebind is a fenced register act

- **Date:** 2026-08-17
- **Surface:** `Directory`
- **Decision:** rebinding is non-monotone, so it is one of the
  enumerated coordination points: a register act keyed by
  `(directory digest, petname)`, granted and committed under a monotone
  fencing token, whose sealed outcome re-enters the monotone plane as a
  fact. Resolution reads **the binding sealed at the greatest observed
  token** — the arbitration order is the token order, not a clock. No
  force flag exists.
- **Alternatives:** timestamped rebinds (reintroduces clocks into
  naming, which the fabric has been clock-free about on purpose);
  unfenced rebinds (fences evidence and unfences an outcome, exactly
  backwards from part 1 §5.2's rule).
- **Status:** ruled — grill sheet item 7 (G19). The candidate law this
  entry left to the coordinator is answered at item 12: F12 enters the
  `verify/fabric` roster as a separate, minimally scoped statement at
  target rung R5, its register half citing the Veil-pinned F5 package.
- **Source:** part 3 §5.4; C2/C5, F5, `fence_deterministic` (proven).

### 0016 — retention is cataloged and the horizon is derived

- **Date:** 2026-08-17
- **Surface:** `Retention` (on `Resource`)
- **Decision:** the retention policy is declaration data with a digest.
  Compaction is an act — fenced, journaled, carrying the
  `(head, state digest)` pair it replaced. The **compaction horizon** is
  not chosen: it is the minimum anchor floor across every deployed fold
  and index reading that lane, read off F3, and a compaction past it is
  refused rather than warned about. The estate's standing compaction
  discipline is unchanged and the session-journal refusal stands.
- **Alternatives:** inherit NATS retention defaults silently (part 1
  risk 4 names this as the thing not to do); an operator-chosen
  retention window (a heuristic where a derived bound exists).
- **Status:** ruled — grill sheet item 9 (G21): `Retention.horizon`
  lands as a derived read, and the fabric-KV posture is stated at its
  slice rather than inherited from a NATS default.
- **Source:** part 3 §5.5; CONTEXT.md §Compaction; estate demand row
  F10; part 1 risk 4.

### 0017 — no `Schedule` module

- **Date:** 2026-08-17
- **Surface:** (deliberately none)
- **Decision:** scheduling mints no module and no construct. A schedule
  is a declared value (the pin's `Cron` is a pure value module —
  `parse`, `next`, `match` — so a schedule has canonical bytes and a
  digest); the *firing* is the deadline seat's act, which ruling G9
  already sanctioned as the non-monotone door; at-most-one-landed is
  C7's register. The NATS server's own scheduling features are noted and
  not adopted, on the same ground as its counter streams: they are not
  content-addressed.
- **Alternatives:** a `Triggers.onDeadline` primitive (silently
  reintroduces coordination into the reactive path — refused by the
  design's own thesis and already listed as ruling G9's rejected
  alternative); a scheduler service (an orchestrator by another name).
- **Status:** ruled — grill sheet item 1 (G13) by name, and confirmed
  by item 20 (G24), which keeps the `Schedule` barrel collision unminted
  because this module does not exist.
- **Source:** part 3 §6.1 row 1; part 2 C9, §6.3; ruling G9; pinned
  `Cron.ts:294, :545, :789`.

### 0018 — module names against the `effect` barrel

- **Date:** 2026-08-17
- **Surface:** packaging
- **Decision:** keep `Resource` as the module name — it is the plain
  word for the concept in all three vocabularies this surface touches
  (the estate's, MCP's, and an outsider's) — and state the alias rule in
  its JSDoc, since the pin's barrel also exports `Resource`
  (`src/index.ts:497`, a refreshable scoped value). Avoid the second
  collision by minting no `Schedule` module (entry 0017).
- **Alternatives:** rename to `Holding` or `Substrate` (no collision, at
  the cost of the plain word that makes the surface legible to
  outsiders); prefix every Plait module (`PlaitResource` — noise on
  every import in exchange for a collision users hit rarely).
- **Status:** ruled — grill sheet item 20 (G24): `Resource.ts` stands,
  the JSDoc alias note becomes E-series acceptance text, and finding H-2
  is disposed of.
- **Source:** part 3 §7.1; pinned `src/index.ts:497, :512`.

### 0019 — the external-effect bound is part of the surface

- **Date:** 2026-08-17
- **Surface:** `Actions` (documentation and ledger discipline)
- **Decision:** the design and every ledger row touching actions states
  the bound: **at-most-one landed outcome is not at-most-one external
  side effect.** Where a vendor supports an idempotency key, the work
  digest is offered as the natural one (stable across retries of a
  declaration, different for a new round, both by construction). Where a
  vendor supports none, the bound is the bound and the mitigation is
  declaration granularity.
- **Alternatives:** silence (the assumption gets made for us, which is
  how a coordination guarantee becomes a transactional claim); a
  transactional-outbox construct inside the fabric (would claim, at the
  boundary, exactly what part 1 refuses to claim about delivery).
- **Status:** ruled — grill sheet item 11 (G23): the sentence is a
  standing bounds clause for every action-touching VERIFICATION.md row,
  and rows still land only with their slices (ruling G6).
- **Source:** part 3 §6.3; part 2 §2.1 (the at-most-one-landed
  statement and its liveness fence); part 1 §5.6 (exactly-once refused).

### 0020 — introspection and configuration ride the one MCP door

- **Date:** 2026-08-17
- **Surface:** `unstable/mcp`
- **Decision:** the harness's surfaces reach both audiences through the
  one door architecture §5 already ruled: tools **derived** from the
  same declarations the runtime executes, walled served-equals-derived,
  projected through the caller's writ; declarations additionally served
  as digest-addressed **resources**. Query result pagination uses the
  verifiable `{seq, head}`-shaped cursor, never MCP's opaque cursor. No
  part of this surface is built on `resources/subscribe`.
- **Alternatives:** a bespoke admin API beside MCP (two surfaces to keep
  in agreement, and the wall can only check one); a subscription-based
  index-freshness product (the MCP deep read labelled subscriptions
  RATIFIED-AGAINST: stdio-only at the pin, evidence-free notifications,
  removed in the current revision).
- **Status:** ruled — grill sheet item 1 (G13) by name. The named wait
  is unchanged and is not a ruling (sheet §B, "named waits, not
  rulings"): the estate's MCP untyped-argument fix gates the search
  tool's argument shape, and this lane waits for it rather than works
  around it.
- **Source:** part 3 §4.7, §5.6; architecture §5;
  `docs/design/2026-08-14-mcp-surface-deep-read.md` §3.2; estate demand
  row G9.

### 0021 — a ruling flips an entry's status, never its prose

- **Date:** 2026-08-17
- **Surface:** documentation / process (this log)
- **Decision:** `Status` is an entry's **state**, not its content, so a
  ruling updates the status line in place and cites the ruling there;
  the decision, alternatives and source prose above it is never touched.
  Each ratification pass is additionally recorded as **one** entry
  carrying the whole flip table, so "when did this become ruled, and
  under which ruling?" is answered by an append rather than by a diff.
  An adverse ruling is unchanged by this: it gets a superseding entry,
  never an edit. The status vocabulary settles the question by itself —
  an entry that could never change status could never reach `shipped`
  either, so the field was always the entry's mutable state.
- **This pass.** The consolidated grill sheet
  (`2026-08-17-plait-grill-sheet.md`) was ratified 2026-08-17 on every
  recommended option, items 1–21. All twenty landed entries flip to
  `ruled`; none is superseded or withdrawn; none remains `proposed`.

  | Entry | Ruled by sheet item |
  | --- | --- |
  | 0001 | 21 (the log itself) |
  | 0002–0006 | 2 (G14) |
  | 0007 | 3 (G15) |
  | 0008 | 4 (G16) |
  | 0009 | 5 (G17) |
  | 0010 | 1 (G13), by name |
  | 0011, 0012 | 6 (G18) |
  | 0013, 0015 | 7 (G19); 0015's F12 status at 12 |
  | 0014 | 8 (G20) |
  | 0016 | 9 (G21) |
  | 0017 | 1 (G13), by name; confirmed at 20 (G24) |
  | 0018 | 20 (G24) |
  | 0019 | 11 (G23) |
  | 0020 | 1 (G13), by name |

- **Alternatives:** one status-flip entry per ruling (item 21's
  grounding paragraph names this shape; it costs twenty entries that
  carry no decision, and a reader of entry 0007 still sees `proposed`
  with its flip twenty entries away — the one-file legibility this log
  exists for, spent); flip in place with no entry at all (satisfies the
  dispatch, but the ratification event then lives only in git history,
  which is the failure entry 0001 already priced); treat status as
  content and supersede all twenty (twenty superseding entries restating
  unchanged decisions — renumbering by another name).
- **Status:** ruled — the mechanic is ratified item 21's own "what
  lands" clause: *the log then absorbs this whole sheet's outcomes in
  one append.* The per-entry in-place flip citing its sheet item is
  DEV-707's dispatched scope. Noted for the record: item 21's grounding
  paragraph and its "what lands" clause describe two different
  mechanics; this entry adopts the latter, as the dispatch directs.
- **Source:** grill sheet item 21; DEV-707 issue body; rule 1 above
  (append-only governs entry content).

### 0022 — refusals ride the error channel

- **Date:** 2026-08-17
- **Surface:** `Refusal`, and every fallible function on the public
  surface
- **Decision:** a fallible Plait function returns
  `Effect<A, Refusal, R>`. Refusal classes are **tagged errors on the
  error channel** (`Schema.TaggedError` per the pin), not members of a
  value-level `{ok: true, …} | {ok: false, refusal}` union. The house
  sentence is unchanged and is not in tension with this: Effect's error
  channel is a typed *value* position, not a throw, so a refusal is
  still a value returned instead of an exception — it is simply carried
  in the channel the combinators can see. Dispatch 29 decision 6's
  "tagged unions" reads as tagged refusal classes on that channel; the
  value-union reading does not survive decision 6's own final clause,
  because `retryAbsence` takes an `Effect` and is vacuous over value
  unions. A refusal keeps all six fields — kind, sort, law, path as an
  array, got/expected, next — and a seam that consumes a foreign error
  (`packages/core`'s `NonCanonicalValue`) translates it into that shape
  at the seam rather than leaking it outward.
- **Alternatives:** the value-union shape (reads honest, and was the
  drafted spine's shape; it makes every absence combinator unwritable
  and pushes the branch to every call site — proved by typecheck at the
  DEV-698 review); a typed error channel plus a value-level mirror (two
  representations of one fact, and a wall can only check one).
- **Status:** ruled — DEV-694 coordinator ruling, 2026-08-17, recorded
  there as the authoritative reading; carried into the ratified grill
  sheet §B as mid-flight ruling 1.
- **Source:** the DEV-694 coordinator ruling comment (2026-08-17); part
  1 §8.1 design rule 1; architecture record §3; Rev findings on DEV-698
  against PR #67.

### 0023 — the conformance gate enumerates the public surface

- **Date:** 2026-08-17
- **Surface:** package gates (the `packages/plait` battery)
- **Decision:** the gate that enforces entry 0022 is **derived from the
  public surface**, never a hand-written symbol list. Two admissible
  forms: a type-level mapped assertion over the barrel's exports (every
  function-typed export whose return is an `Effect` must have its error
  channel extend `Refusal`), or a generated assertion file derived from
  the built `.d.ts` with byte-diff regeneration. Layers and scoped
  constructors are *inside* the enumeration, not beside it —
  `FabricClient.layer` is the witness a hand-written eleven-symbol tuple
  missed. Two negative controls redden the battery and their traces are
  committed: a new public fallible export with a non-`Refusal` tagged
  error, and a `FabricClient`-class surface.
- **The generalization this entry records:** a gate that lists is a gate
  that drifts; a gate that enumerates has a blind spot exactly the size
  of the surface, which is zero. This is the generated-not-hand-typed
  law applied to gates rather than to vectors, and every later Plait
  surface inherits it — an index, resource, or directory conformance
  check derives from its own public surface or it is not a gate.
- **Alternatives:** a hand-maintained symbol list plus a review rule
  (measured worthless in exactly this instance — the list was green
  while a public surface violated the law the list claimed to enforce);
  a lint rule over source text (checks spellings, not types, and cannot
  see through re-exports).
- **Status:** ruled — DEV-694 spine round-2 charge S1 (major),
  2026-08-17.
- **Source:** the DEV-694 round-2 coordinator charge; Rev findings on
  PR #67 at `4407175`; `AGENTS.md` (generated vectors only; hand-authored
  verdicts banned).

### 0024 — F2b is the successor discipline; the floor is a derived record

- **Date:** 2026-08-17
- **Surface:** `Folds` / `Anchors`, and every surface that names F2b
- **Decision:** exactly-once *application* for non-idempotent algebras
  is manufactured by the **successor discipline** — arrivals admitted
  through a window and applied only at the contiguous frontier — and not
  by a position-floor guard. The anchor's per-partition floor is the
  **derived record** of that frontier, the resume coordinate: state,
  never a protector. `guard_is_redundant` (proved footprint-clean at the
  DEV-695 re-review: with window admission and contiguous-frontier
  application, a floor guard is observationally equivalent to no guard)
  is rostered as the documenting theorem — the law that explains the
  guard's absence. Two consequences follow. The redundant ingestion
  filter is **removed** rather than kept as defense-in-depth, because
  the estate refuses defenses against scenarios its own model proves
  cannot happen. And the fourth negative control is
  drop-**successor-discipline**, not drop-floor-guard: the latter is
  unstatable in the model, which is precisely what the theorem says.
- **API consequence:** no surface offers a floor-guard knob, and no
  JSDoc, report, scoreboard, or ledger row credits the floor with
  protection. `Anchors` reads as a resume coordinate; a caller asking
  why duplicates are harmless is pointed at F2 (idempotent algebras) or
  F2b (the discipline), never at the floor.
- **Alternatives:** keep the guard as defense-in-depth (invites a claim
  its own model contradicts, and adds a code path no vector can kill);
  remove the code but leave the old attribution in prose (the
  drift-engine failure the estate exists to kill, in miniature).
- **Status:** ruled — DEV-695 round-3 coordinator charge, 2026-08-17,
  which accepts the reviewer's theorem and rules the disposition; the
  design prose is corrected at commit `d3649b1`.
- **Source:** the DEV-695 round-3 charge (its item 3 records the
  approved spec deviation); part 1 §5.4 C4, the network-axiom table and
  the glossary as corrected at `d3649b1`; `guard_is_redundant` in
  `verify/fabric` (PR #66).

### 0025 — G7's ceiling is external dependencies only

- **Date:** 2026-08-17
- **Surface:** packaging / `package.json`
- **Decision:** ruling G7 — `effect@4.0.0-rc.108` plus
  `@nats-io/*@3.4.0` exact, nothing else — bounds **external runtime
  dependencies**. A workspace dependency on an estate package is a seam,
  not a new dependency: `Canonical.ts` is built on `packages/core` by
  design, so `@foldlab/core` is *declared*, not smuggled. The
  requirement the ceiling actually imposes is an **accurate declared
  surface** — the workspace specifier in `package.json`, not a
  cross-package relative import that hides the edge from the manifest
  and from every tool that reads it.
- **Alternatives:** read G7 literally as "these two and nothing else in
  the manifest" (forces either a vendored second canonicalizer — the
  exact drift the estate exists to kill — or an undeclared relative
  import, an edge nothing can check); widen G7 to a general allowance
  (loses the ceiling's whole point, which is that a new *external*
  dependency is an operator decision).
- **Status:** ruled — DEV-694 coordinator clarification amending
  dispatch 29 decision 2, 2026-08-17; carried into the ratified grill
  sheet §B as mid-flight ruling 2.
- **Source:** the DEV-694 coordinator ruling comment (2026-08-17);
  ruling G7 (ratification record); the DEV-697 spine observation about
  the cross-package relative import.

### 0026 — the three CAS disciplines are never unified

- **Date:** 2026-08-18
- **Surface:** `Cells` / `Registers` / `Anchors` (internal write paths)
- **Decision:** the merged tree runs three revision-CAS write paths, and
  they stay three. **Joins** retry through `casJoinLoop`
  (`internal/cas.ts`) because idempotence discharges the ambiguity of a
  lost race — a repeated delta adds nothing twice (F1,
  `f1_cell_merge_aci`). **Registers** reconcile by read-back comparison
  against the one intended record, because an outcome lands at most once
  (I2, DEV-704 seam rules 1–2; the shipped `reconcileUpdate`,
  `internal/registers.ts:256-288`). **Anchors** never retry at all: a
  lost anchor revision CAS is a fatal detach under the single-live-pump
  discipline (`lostCas`, `internal/anchors.ts:75-86`). The resemblance of
  the three shapes is the trap this entry exists to disarm. (Line
  citations are read at head after the DEV-734 spine extraction; the
  affordances record's own numbers predate it.)
- **API consequence:** no surface offers a shared "CAS strategy"
  parameter, and no adapter reaches into another's loop. Routing anchors
  through either retry loop — even with the bound set to one — would
  smuggle their exclusivity assumption into a combinator licensed by a
  different law; routing registers through the join loop would give a
  non-idempotent write the retry a lattice earns. The attempt bound on
  the join loop is flow control with no correctness stake, and reading it
  as a general CAS knob is the misreading this entry pre-registers
  against.
- **Alternatives:** unify all three behind one combinator with a
  discipline parameter (one module, three laws, and the first reviewer to
  read it would have to reconstruct which law each caller depends on);
  unify joins and registers only (their reconciliation predicates differ
  in kind — subsumption is a lattice order, byte-equality is identity
  against one intended record — which is the exact difference the
  committed cell control is built to expose).
- **Status:** ruled — grill G-4, refereed 2026-08-18 as ADOPT-AMENDED in
  the affordances record's §C-2 sheet, which widened the original two-way
  sentence to this three-way one; no build either way, and it lands with
  DEV-737's DECISIONS entry (`packages/plait/DECISIONS.md`, task DEV-737
  T7).
- **Source:** `docs/design/2026-08-17-plait-effect-affordances.md` A-7
  ("the three-way refusal, refereed G-4, adopted") and §C-2 G-4;
  dispatch 31 decision 6 (the anchor detach); DEV-704 seam rules 1–2.

### 0027 — memo permanence: a digest-keyed entry is never invalid, only evictable

- **Date:** 2026-08-18
- **Surface:** `Resolved` / every digest-keyed memo in the package
- **Decision:** the licence G-3 granted to one cache is stated as a rule
  about a keyspace, so the next memo inherits it instead of re-deriving
  it. Let `k` be a digest and `f` a function that returns only values it
  has re-derived against `k`. Then any memo of `f` keyed by `k` is
  **forever valid**: it has no invalidation protocol, no coherence
  protocol, and no freshness parameter — not because they were omitted
  but because there is nothing they could compute. Two clauses are the
  point of the entry, being the parts not currently written anywhere
  citable. **The eviction clause:** an entry may still be *removed*, by
  capacity; removal costs a re-fetch and never a wrong answer, so "never
  invalidates" and "never evicts" are different sentences and only the
  first is claimed. The pin forces the distinction — `Cache.makeWith`'s
  `capacity` is mandatory, so no unbounded cache exists to claim
  permanence with. **The anti-clause:** any key naming *whatever is
  current* — anchored, head-relative, `(directory, petname, anchor)`-shaped
  — is outside the rule entirely and gets no memo from it.
- **API consequence:** a digest memo may be shared across processes,
  persisted, warmed, or handed between deployments without a protocol,
  and its capacity is deployment configuration that never touches
  identity. Two sites in the tree are inside the rule and have no memo
  today: `truth/SchemaCanonical.ts:341` (a fresh writer derivation per
  call, and once per record at `:388`) and `internal/anchors.ts:129-152`
  (double canonicalization plus a redundant store write per checkpoint).
- **Alternatives:** leave it as `ResolveCache`'s JSDoc (where it is
  correct and complete, and where every future memo must re-derive it —
  the two uncached sites above are what that costs); mint an F-number
  now (over-claims: storage-stack §8.5 already carries `memoize forever
  ← content addressing` as a license row, so the substance may already
  be covered and only the clauses are missing).
- **Status:** proposed — stated in
  `docs/design/2026-08-18-runtime-primitives-and-shared-algebras.md` §3.3
  and flagged there as a candidate whose disposition (corollary of C3 /
  widening of G-3 / new statement) is the coordinator's, not this
  seat's.
- **Source:** ruling G-3 and affordances A-8a (the ratified core, for
  the resolve path); storage-stack §8.2 first inversion and §8.5 license
  table (the prior statements, `proposed`); the shipped fence at
  `packages/plait/src/planes/Resolved.ts:187` and `:198-239`; C3.

### 0028 — batching is carriage: no public batch verb

- **Date:** 2026-08-18
- **Surface:** `Catalog` / `Payloads` / `Resolved`
- **Decision:** coalescing K independent digest reads into one store
  round trip is licensed by C3 — a digest names one value, so no read's
  answer can depend on another read having happened — and it is
  classified as **carriage, not meaning**, per the storage record's
  ruling that *"batching is a placement-plane choice… invisible to every
  fold"*. Under AE-8's admission test batched resolve **denotes nothing
  new**: it is the same term, `resolve(d)`, with a different carrier. So
  it rides in the environmental band and is fenced out of the fluent
  surface. Concretely: `CatalogService` and `PayloadService` gain
  `getMany` because a `RequestResolver` must sit on something, and the
  **public surface gains nothing** — `resolve(digest)` keeps its exact
  signature and coalesces underneath.
- **API consequence:** no `resolveAll`, no `getMany` on any public seam,
  no batch size parameter reachable by a caller. The one door is
  unmoved: what batches is the *unverified* store fetch, and
  `verified(digest, value)` still re-derives per digest, which is what
  keeps a lying layer refusable (DECISIONS T18). And because DEV-766's
  `Address` declared that it *"ships no service, no store, no layer, and
  no cache"*, batching landing below it means iterated-resolve paths
  inherit it with no line changed — while `at`'s own hop chain stays
  unbatchable, being dependent by construction.
- **Alternatives:** expose a batch verb for callers who know they hold K
  digests (smuggles carriage into meaning, and is the "mostly algebraic
  API with one ad-hoc verb" AE-8 §7.4 refuses by name); batch at the
  verification boundary rather than the fetch (faster, and weakens the
  one door — refused by the pedigree guard).
- **Status:** proposed — and gated on a prior grill, since
  `RequestResolver` has never been priced in this estate (the string
  appears nowhere in `docs/`, `scratch/`, or `packages/`).
- **Source:**
  `docs/design/2026-08-18-runtime-primitives-and-shared-algebras.md` §3.4
  and §8 item 0; storage-stack §7.1/§7.4 (AE-8 and the admission test)
  and the batching-is-placement line; C3; `planes/Resolved.ts:134-144`,
  `:292-294`; `planes/Catalog.ts:51-54`, `:67-69`.

### 0029 — the consumer seam streams by unfold, and ships as chatter

- **Date:** 2026-08-18
- **Surface:** `Session`
- **Decision:** the stream form of a Plait consumer is one combinator
  over the seam DEV-765 landed, not a subsystem. `Session.read` has the
  signature `(session, fold) => Effect<Step<State>, Refusal>` where
  `Step = { view, session }`, and the pin's `Stream.unfold` takes
  exactly `(s: S) => Effect<readonly [A, S] | undefined, E, R>` — the
  coalgebra signature. So `views` is `Stream.unfold` over `read`, and
  there is nothing else to build. DEV-765's properties survive
  unchanged, including the one it was careful about: admission is never
  cached on a session and the writ is re-judged every step, which holds
  because `unfold` calls `read` on every pull.
- **API consequence:** the surface **ships as chatter and makes no
  parity claim**, inheriting the storage record's fence on access
  pattern 7 — the coalgebraic half's meta-language home is AE-4, which
  nothing yet rules. When AE-4 lands the claim can be revisited; until
  then a stream view is a convenience, and no digest equality is
  asserted between it and any term.
- **Alternatives:** a bespoke consumer-stream module with its own
  lifecycle and buffering (invents machinery for a dual that is one
  combinator wide, and would need its own soundness argument where
  `unfold` inherits `read`'s); wait for AE-4 before offering any stream
  form (defensible, and costs every consumer a hand-rolled pull loop in
  the meantime — the polling debt at `surface/cli.ts:341-358` is what
  that already looks like).
- **Status:** proposed — blocked on PR #116 (DEV-765) merging; this
  entry consumes that seam and does not duplicate it.
- **Source:**
  `docs/design/2026-08-18-runtime-primitives-and-shared-algebras.md` §2;
  PR #116 `packages/plait/src/planes/Session.ts` (the `read` signature
  and its "coalgebra half stated as a signature" doc); storage-stack
  access pattern 7 and its AE-4 fence; `repos/effect` `Stream.unfold` at
  the pin.

### 0030 — fan-out strategy is a rung claim, not a tuning knob

- **Date:** 2026-08-18
- **Surface:** watch feeds (`Cells` / `Registers`), and any future
  `PubSub`-backed surface
- **Decision:** a `PubSub` delivers to each subscriber independently, so
  subscribers may observe publications in different orders and may
  observe some twice. That is safe **because F1/F2 make it safe for an
  ACI payload** — every subscriber reaching the same set reaches the
  same state, whatever the permutation and whatever the duplication —
  and for no other reason. The corollary is the decision: the pin's
  `sliding` and `dropping` strategies **lose publications** under
  pressure, and losing a publication is harmless over a monotone lattice
  (the next one carries the join) and corrupting over a positional or
  counting payload. So the strategy argument is a claim about the
  payload's rung, not a performance dial, and it is chosen by the rung
  rather than by a deployment preference.
- **API consequence:** no watch surface takes a free-form strategy
  parameter. This is the same species of trap entry 0026 pre-registered
  against for CAS disciplines — shapes that look alike and are licensed
  by different laws — and it is named here before a combinator exists to
  fall into it.
- **Alternatives:** expose the strategy as ordinary configuration
  (indistinguishable at the call site from a correctness decision, which
  is exactly how a lossy feed reaches a counting fold); always use the
  lossless `suspend` strategy (safe everywhere, and forfeits the
  coalescing A-8b already proved harmless for cells — a fence paid for
  by every monotone consumer).
- **Status:** proposed — gated on a prior grill, since `PubSub` has
  never been priced in this estate, and additionally on DEV-731's probe
  suite and the advisory-only, no-absence-reasoning fence A-8b already
  carries.
- **Source:**
  `docs/design/2026-08-18-runtime-primitives-and-shared-algebras.md` §3.2
  and §8 item 0; F1 and F2; affordances A-8b (the coalescing licence and
  its watch fence); the pin's `PubSub` constructors;
  `packages/plait/src/planes/Cell.ts:226-237` (the exemplar).

### 0031 — one algebra service and one replay driver; the CAS disciplines stay three

- **Date:** 2026-08-18
- **Surface:** `Algebra`, and the internal incremental-step loops
- **Decision:** the package declares two parallel algebra interfaces for
  one job — `DeclaredAlgebra<State>` over `Reducer.Reducer`
  (`truth/Algebra.ts:13-22`) and `CasJoin<A>` (`internal/cas.ts:65-88`),
  bridged one way by `joinOf` and never unified — and writes the
  incremental-step loop out **five times**
  (`internal/successors.ts:64-92`, `:95-118`, `:126-157`;
  `internal/pump.ts:260-324`; `internal/chaos.ts:136-164`). No tag
  exists anywhere in that chain, so a consumer cannot obtain "the fold
  algebra" from the environment and every new carrier restates the loop.
  Decided: the algebra's operations become one Layer-provided service in
  `truth/` (layer by plane, not by NATS construct), `CasJoin` collapses
  into it through `joinOf`, and the five loops become one
  `Stream.mapAccumEffect` driver each consumer parameterises. `cellJoin`
  (`internal/cells.ts:157-161`) then earns the commutative brand by
  construction instead of forgoing it despite being provably ACI.
- **The fence this entry exists to state:** **entry 0026 is untouched.**
  What is unified is the *algebra* and F2b's *drive loop*; the three CAS
  write disciplines — joins retry, registers reconcile, anchors detach —
  stay three. A version of this that grew a "CAS strategy" parameter has
  violated 0026 and is refused on sight. `arrivalOrderReplay` stays a
  negative control and becomes a sharper one by parameterising the same
  driver with the wrong discipline, since a hand-written twin can
  accidentally agree.
- **Alternatives:** leave the five loops (five proof obligations where
  F2b is one, and two of the five have already drifted far enough to
  re-implement `Anchor.advance` beside the anchor module rather than
  through it); extract only the drive loop and leave the two algebra
  interfaces (keeps the seam `internal/cas.ts:10-42` already argues for,
  and leaves `cellJoin` unable to earn a brand it provably deserves).
- **Status:** proposed — blocked on PR #118 (DEV-764) merging, whose
  rung ladder the service's interface types consume.
- **Source:**
  `docs/design/2026-08-18-runtime-primitives-and-shared-algebras.md` §4;
  entry 0026 (the fence); `internal/cas.ts:10-42` (the extraction case,
  in the tree's own words); F2b; storage-stack §7.3 (layer by plane);
  reorg spec §5 stage 3.

### 0032 — rung⇒combinator: the license table materialized in types

- **Date:** 2026-08-18
- **Surface:** the shared stream surface, and any rung-parameterised
  service interface
- **Decision:** the storage record's §8.5 license table — *"shard /
  parallelize ← commutativity · retry, at-least-once ← idempotence ·
  incremental / delta views ← associativity · memoize forever ← content
  addressing"*, under the heading "optimization becomes proof" — is
  materialized in the type system rather than left as documentation,
  because **a combinator's soundness side-condition is a law atom**.
  `Stream.mapEffect`'s `unordered: true` says the consumer does not care
  about arrival order, which is commutativity and nothing else;
  `Stream.changes` collapses repeats, which is sound exactly when
  repeating is a no-op, which is idempotence and nothing else. So a
  service parameterised by a fold's `Laws` exposes only the combinators
  that rung licenses: `positioned` gets ordered pull and concurrency 1;
  `multiset` adds `unordered` and partition merge (F4 verbatim); `set`
  adds dedup and lossy fan-out (F2 verbatim).
- **API consequence:** `unordered: true` on a positional payload becomes
  a compile error rather than a review catch, which is the estate's
  standing position on carrier misuse. This is the same trick
  `LawsFor<LaneQuotient<P>>` already plays at the fold declaration door,
  applied one level down at the combinator.
- **The fence:** no rung licenses *dropping* a message on the durable
  fold path. F2b is a statement about applying each event once, and
  idempotence at the algebra does not license loss at the transport,
  because a dropped message is not a duplicate — it is an absent one. A
  reader discharging the pump-adapter finding by pointing at the `set`
  row has made exactly this error.
- **Alternatives:** keep the table as prose (the status quo, and the
  storage record itself names the type-level form as the goal); brand by
  rung name rather than by law set (cannot express an inherited rung,
  which is a set intersection — KM-17 already priced and refused this).
- **Status:** proposed — and dependent, since KM-17 is itself `proposed`
  (its sheet's status line reads "All items PROPOSED"); this cannot
  precede that ruling or PR #118.
- **Source:**
  `docs/design/2026-08-18-runtime-primitives-and-shared-algebras.md` §5;
  storage-stack §8.5 (the license table) and §4.3 (rung⇒carrier, whose
  closing line names the TypeScript materialization as the goal); KM-17;
  PR #118 `truth/Algebra.ts` (`DeepestQuotient`, `LawsFor`, `Reads`);
  F2, F4, F2b.

### 0033 — every shared service takes its sorts from the generated corpus

- **Date:** 2026-08-18
- **Surface:** every shared-service Layer proposed for Plait
- **Decision:** the machine-generated type kernel is the only language,
  so a shared service names its sorts with generated types or it is a
  sketch that owes a unification ticket. Concretely: declaration kinds
  from `KERNEL_DECL_KINDS` / `KernelDeclKind`; refusal reasons from
  `KERNEL_REFUSAL_REASONS` / `KernelRefusalReason`, with law and repair
  **looked up** from `KERNEL_REFUSAL_BY_REASON` rather than restated at
  each site; identity from the `KernelDigest` family; hole stages from
  `KERNEL_HOLE_STAGES`. No service may introduce a second vocabulary
  for any of these. The shared algebra service of the runtime-primitives
  record is therefore keyed by `AlgebraDigest<Digest>`, not by
  `truth/Digest`'s unindexed brand — which is not merely more compliant
  but strictly stronger, since the unindexed brand cannot distinguish an
  algebra digest from a lane digest and the generated family can.
- **API consequence:** the layer-identity fence composes with this and
  is restated rather than assumed: a Layer **supplies an implementation
  for a digest and never names, brands, or overrides an algebra**. Two
  Layers supplying the same digest are interchangeable; a Layer that
  computed or assigned a digest would be the two-sources failure. And
  the admission test's question 1 ("which algebraic expression does this
  surface name?") becomes mechanically checkable once DEV-796's wall
  flips to enforce mode.
- **Alternatives:** let each plane keep its fabric-era types and bridge
  at the seams (the status quo, and the epic's finding is that it has
  already produced `Digest` twice and seven plane modules with no kernel
  import); unify onto the fabric-era types instead (inverts the referee
  chain — the Lean model gates the corpus, the corpus gates the types,
  and a hand-written type cannot be gated by a model vector).
- **Status:** proposed — the ruling is the operator's (2026-08-18, on
  DEV-792, AGENTS.md law 1 hardened); what is `proposed` here is this
  entry's specific reading of which generated types each service takes.
- **Source:** the operator ruling on DEV-792; epic DEV-795 (one type
  universe) and DEV-796 (the stage-1 wall);
  `packages/plait/src/kernel/KernelTables.generated.ts`;
  `docs/design/2026-08-18-runtime-primitives-and-shared-algebras.md`
  §1.1 and §4; the algebraic-register record's layer fences.

### 0034 — the carrier parameter is the unification seam

- **Date:** 2026-08-18
- **Surface:** `Digest`, and the whole generated brand family
- **Decision:** `Digest` is currently defined twice — `truth/Digest.ts`
  brands a 64-hex string `@foldlab/plait/Digest`, and the generated
  table brands `~foldlab/plait/kernel/Digest/${Kind}` over the model's
  `number` carrier. These are **the same sort at two carriers**, not two
  sorts, and the generated aliases already take the carrier as a type
  parameter: `KernelDigest<Kind extends KernelDeclKind, Carrier = number>`,
  with `AlgebraDigest<Carrier = number>` and eleven siblings. The
  generator says so in its own prose — *"the carrier is the model's own
  scalar; a call site migrating a real runtime value substitutes its
  carrier through the alias's second parameter"*. So unification is
  `AlgebraDigest<Digest>`: an instantiation, not a rewrite, with no wire
  change and no choice forced between the model's scalar and the
  runtime's.
- **API consequence:** one brand namespace, and kind-indexed identity at
  the runtime carrier — so a `LaneDigest` and an `AlgebraDigest` stop
  being the same type, which is what the kernel's brand comment says
  brands are for. This entry reads epic stage 2's "ONE definition" as
  *one brand, one schema, two exports*: the corpus supplies the
  kind-indexed brand, `truth/Digest` supplies the carrier's hex-pattern
  `Schema`, for which the corpus has no equivalent. If the operator
  means something stricter, the runtime loses its pattern check and owes
  a generated replacement first.
- **Alternatives:** re-carrier the runtime onto the model's `number`
  (breaks every wire value and every digest in every fixture, to adopt a
  catalog index as an identity — refused); keep both brands and bridge
  with casts (a cast is exactly the drift surface the wall exists to
  find, and `as unknown as` already appears six times in `src`).
- **Status:** proposed — the substrate ruling is the operator's; this
  entry proposes the specific mechanism and its reading of stage 2.
- **Source:** `KernelTables.generated.ts:249-317` (the brand carrier,
  `KERNEL_BRANDED_SORTS`, and the twelve aliases);
  `packages/plait/src/truth/Digest.ts:13-16`; epic DEV-795 stage 2;
  `docs/design/2026-08-18-runtime-primitives-and-shared-algebras.md` §1.1.

### 0035 — the door is total inward, and the error channel is outward

- **Date:** 2026-08-18
- **Surface:** `KernelDoor`, and every host that judges a candidate
  (`cli`, `FabricClient`, `CasDaemon`)
- **Decision:** `KernelDoor.admit` has the shape
  `(candidate: KernelCandidateAct) => KernelVerdict` — synchronous,
  total, no error channel — while entry 0022 rules that every fallible
  Plait surface returns `Effect<A, Refusal, R>`. These are joined, not
  reconciled by changing either. **The door stays total**, because that
  is what makes it comparable verdict-for-verdict against the model's
  emitted admission vectors, which is the entire reason to trust a
  hand-written door; wrapping it in an error channel would complicate
  the conformance comparison and buy nothing. **The host surface above
  it fails in the error channel**, mapping
  `{ verdict: "refused", reason }` to a refusal whose law and repair are
  **looked up** from `KERNEL_REFUSAL_BY_REASON` — never restated, which
  `KernelDoor.ts` already requires in its own words.
- **API consequence:** totality inward, error channel outward, and one
  translation between them that is a table lookup rather than a mapping
  anybody writes. A second consequence follows from the candidate form
  and is easy to miss: every referent in it is a **catalog index**
  (`KernelRef = { kind, id: number }`), not a content address, so a host
  contract must carry the catalog and translate. That translation is the
  natural `RequestResolver` batching site — K referents in one
  candidate's payload are independent by construction — and it is
  **not** covered by memo permanence, because a catalog index is a
  position in a growing admitted set, not a digest. A memo there is
  keyed by `(catalog identity, KernelRef)` or not at all.
- **Alternatives:** make `admit` return an `Effect` (loses the clean
  total artifact the conformance vectors compare against); let each host
  restate the taught law beside its own refusal mapping (three copies of
  a generated table, which is the hand-written-twin failure estate law 1
  refuses).
- **Status:** proposed — targets epic stage 4 and unblocks T-door
  (DEV-763); no door ships from the record that states it.
- **Source:** `packages/plait/src/kernel/KernelDoor.ts` (the candidate
  form, `KernelVerdict`, `KernelDoorContext`, and the "no door ships"
  fence); `KernelTables.generated.ts:130-247`
  (`KERNEL_REFUSALS` / `KERNEL_REFUSAL_BY_REASON`); entry 0022; DEV-763;
  epic DEV-795 stage 4;
  `docs/design/2026-08-18-runtime-primitives-and-shared-algebras.md` §6.
