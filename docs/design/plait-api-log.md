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

6. **Claims are tiered** here as in the design records (ratified /
   proven / measured / shipped / proposed / lead). An entry never
   claims a rung its evidence does not carry.

## Index

| № | Date | Surface | Decision, in one line | Status |
| --- | --- | --- | --- | --- |
| [0001](#0001--the-log-itself) | 2026-08-17 | docs | this log exists, append-only, one decision per entry | proposed |
| [0002](#0002--indexdeclare) | 2026-08-17 | `Index` | an index is a declared fold plus a declared query algebra | proposed |
| [0003](#0003--queries-are-canonical-data) | 2026-08-17 | `Query` | a query is a value with a digest, answered by a declared pure function | proposed |
| [0004](#0004--query-purity-side-conditions) | 2026-08-17 | `Index` | no clock, no ambient, no undeclared seed; ties break by identity order | proposed |
| [0005](#0005--searchquery-returns-certified-rows) | 2026-08-17 | `Search` | result rows carry the shipped certificate shape; no new fields | proposed |
| [0006](#0006--freshness-is-a-precondition-not-a-wait) | 2026-08-17 | `Search` | `atLeastHead` refuses with the absence sort; no blocking read exists | proposed |
| [0007](#0007--approximate-indexes-are-non-commutative-folds) | 2026-08-17 | `Index` | ANN fails the commutative brand: single-partition, resumable, never merged | proposed |
| [0008](#0008--embeddings-are-derived-records-produced-by-actions) | 2026-08-17 | `Models` / `Index` | the embedder capability digest rides every embedding; re-embedding is a new fold | proposed |
| [0009](#0009--retrieval-is-a-selector-family) | 2026-08-17 | `Contexts` | `search(index, anchor, query, k)` joins C6; volatility follows the anchor | proposed |
| [0010](#0010--querying-is-the-read-verb) | 2026-08-17 | `Policy` | no new writ verb; allowlists are policy value fields | proposed |
| [0011](#0011--resourcedeclare) | 2026-08-17 | `Resource` | a resource is a cataloged declaration over four substrate families | proposed |
| [0012](#0012--secrets-never-enter-identity) | 2026-08-17 | `Resource` | declarations name credentials; the wire grammar admits no secret carrier | proposed |
| [0013](#0013--the-directory-is-a-grow-only-cell) | 2026-08-17 | `Directory` | petname → set of digests; append is monotone and coordination-free | proposed |
| [0014](#0014--resolve-requires-an-anchor) | 2026-08-17 | `Directory` | there is no ambient "latest"; resolution is journaled | proposed |
| [0015](#0015--rebind-is-a-fenced-register-act) | 2026-08-17 | `Directory` | greatest landed fencing token decides; no LWW, no clock, no force flag | proposed |
| [0016](#0016--retention-is-cataloged-and-the-horizon-is-derived) | 2026-08-17 | `Retention` | the compaction horizon is the minimum anchor floor across deployed folds | proposed |
| [0017](#0017--no-schedule-module) | 2026-08-17 | (none) | scheduling is a declared value plus the deadline seat; no module is minted | proposed |
| [0018](#0018--module-names-against-the-effect-barrel) | 2026-08-17 | packaging | keep `Resource`, state the alias rule; avoid `Schedule` by not minting it | proposed |
| [0019](#0019--the-external-effect-bound-is-part-of-the-surface) | 2026-08-17 | `Actions` | at-most-one landed outcome ≠ at-most-one external side effect | proposed |
| [0020](#0020--introspection-and-configuration-ride-the-one-mcp-door) | 2026-08-17 | `unstable/mcp` | derived tools + digest resources; no subscription product | proposed |

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
- **Status:** proposed — DEV-700 asked for the bootstrap; the shape is
  the coordinator's to ratify.
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
- **Status:** proposed (grill row G14).
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
- **Status:** proposed.
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
- **Status:** proposed.
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
- **Status:** proposed.
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
- **Status:** proposed.
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
- **Status:** proposed (grill row G15).
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
- **Status:** proposed (grill row G16).
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
- **Status:** proposed (grill row G17).
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
- **Status:** proposed.
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
- **Status:** proposed (grill row G18).
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
- **Status:** proposed.
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
- **Status:** proposed (grill row G19).
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
- **Status:** proposed (grill row G20).
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
- **Status:** proposed (grill row G19); the candidate law F12 covering
  resolution is stated in part 3 §5.4 and is the coordinator's to rule
  on — this seat states candidates and never invents laws.
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
- **Status:** proposed (grill row G21).
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
- **Status:** proposed.
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
- **Status:** proposed (grill row G24); filed as finding H-2 in part 3
  §11.
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
- **Status:** proposed (grill row G23).
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
- **Status:** proposed; blocked in part on the estate's MCP
  untyped-argument fix, which this lane waits for rather than works
  around.
- **Source:** part 3 §4.7, §5.6; architecture §5;
  `docs/design/2026-08-14-mcp-surface-deep-read.md` §3.2; estate demand
  row G9.
