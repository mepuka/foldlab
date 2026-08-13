# The estate structures map — working backwards from the laws

Date: 2026-08-14

Purpose (operator directive): map the estate's accumulated proven laws and
design work backwards onto the concrete DATA STRUCTURES, IMPLEMENTATIONS, and
SERVICE APIs that must exist as base infrastructure — every demand signal in the
corpus, with its citation, its present status, its proof obligation, and the
language that owes it.

**Ranking note.** The top-5 ranking at the end predates FINDING-FRONTIER-001.
That finding refuted E1's per-hole premise for the *current* grammar: with
`flb.type.v0` as it stands, hole position does not discriminate legality the way
row E1 assumes, so "derive `Legal` per hole from the grammar and the hole's path"
is not the fix issue #19 supposed it to be. **E2 survives** — mechanizing the
prefix property as tree-automaton emptiness remains the real obligation and is
unaffected. Per-hole derivation now awaits **ticket 025** (typed metadata holes),
where the grammar question is to be decided inside ticket 015's design rather
than retrofitted. Read entry 3 of the ranking as superseded on its premise and
surviving on its emptiness half; the E1/E2 rows in section E are left verbatim as
the demand signal that produced the finding.

---

# DEMAND INVENTORY — foldlab @ origin/main (0994a3e42) + 4 dossier branches

**Surfaces read:** `docs/design/*` on main (3) + 4 branch dossiers
(counterexample-algebra, catalog-sessions, language-surface, MCP deep-read);
`docs/research/2026-08-13-*` (11 files); all 24 tickets (13 open); GH issues 9,
12, 14, 16–20; `VERIFICATION.md`; `NEXT.md`; `CONTEXT.md`;
`proto/wire/CONTRACT.md`; `FINDING-WRIT-001`; and the actual source trees
(`go/`, `packages/`, `proto/`, `verify/`) to adjudicate "exists today."

**Branch paths** are abbreviated: `[CEA]`=`worktree-agent-af2a7ea8aa34b1c43`
`docs/research/2026-08-14-counterexample-algebra-dossier.md`;
`[SES]`=`worktree-agent-a6bb1538686c7f389`
`docs/design/2026-08-14-concierge-sessions-and-catalog.md`;
`[LANG]`=`worktree-agent-a6fdcad180ebc5ae0`
`docs/design/2026-08-14-the-language-surface.md`;
`[MCP]`=`worktree-agent-a59cc472f3cd11347`
`docs/design/2026-08-14-mcp-surface-deep-read.md`.

**Grep-verified absences** (whole repo, excluding `repos/effect`): the strings
`merkle`, `inclusion`, `crdt`, `semilattice`, `commutativ`, `observation table`,
`concept lattice`, `refusal corpus`, `transition certificate`, `materialized`,
`certify(` appear in **zero** `.go`/`.ts` files. `verify/effector/` and
`verify/journal/` do not exist. `packages/{client,codegen,ai}/src/index.ts` are
`export {}`.

---

## A — Log / journal substrate

| # | STRUCTURE / API implied | Law or claim demanding it | Cited at | Exists today | Proof obligation | Language |
|---|---|---|---|---|---|---|
| A1 | **Merkle history tree / MMR beside the linear chain** — O(log n) prefix + membership proofs, compaction at peak boundaries | "history-tree / MMR shape as a COMPANION structure to the chain: O(log n) prefix/membership proofs at zero new assumptions"; constraint "the chain stays the pinned identity" | `docs/research/2026-08-13-literature-resonances.md:87-93` | **MISSING** (chain only: `go/journal/journal.go`, `packages/core/src/stream.ts:112-116`) | none specced; would be a derived index or a deliberate v2 — R0 fixture parity with the chain | Go authority; TS verifier twin |
| A2 | **Sorted-key Merkle non-inclusion proof** for absence | "Absence has no proof behind it: every 'not present' is a daemon assertion… Sorted-key Merkle non-inclusion proofs close it under collision resistance alone"; ledger must say lineage-as-query is a *convenience* claim until then | `.../literature-resonances.md:188-192`; `docs/research/2026-08-13-expressive-power-dossier.md:506-509` | **MISSING**; VERIFICATION.md makes no absence claim (correctly) | new claim class; R0/R1 | both twinned |
| A3 | **C2SP checkpoint note format + witness cosigning** (origin/size/hash/extensions) | "Split-view equivocation is unaddressed… Remedy: import B's checkpoint format + witness cosigning" | `.../literature-resonances.md:80-86, 183-187` | **MISSING** — head is a bare hex string (`stream.ts:86`) | none; would be a stated-limitation retirement | Go serializer, TS verifier |
| A4 | **Batch / transactional journal append scope** (begin/commit/abort, atomic multi-key append, conditional append) | `withTransaction` is one of sixteen `MessageStorage` ops; "`ProtoClient` cannot: its complete authority is one `read`, one `publish`, or one `request` at a time… There is no transaction context, begin/commit/abort request, conditional append, or atomic batch request" | `proto/ts/src/cluster/FINDING-WRIT-001.md:17-21, 60-70`; disposition options `:80-88` | **MISSING**; `journal.Append` is single-payload (`go/journal/journal.go:152-170`); writ is 5 subjects (`proto/go/protod/dispatch.go:17-21`) | **parked pending operator ratification**; option 2 demands "its own law and gate" | Go daemon-side (writ verb) + TS adapter |
| A5 | **Server-side atomic batch CAS publish** (vendor-provided alternative to A4) | "Opportunity class: server-side atomic batch CAS publish and counters overlap effector hand-rolls; adopting them moves the safety argument into vendor code — a trust-migration decision" | `docs/research/2026-08-13-nats-vendor-corpus-scorecard.md:88-92` | **MISSING** (vendor feature unused) | would re-open the substrate envelope (ticket 011) | Go |
| A6 | **Journal read index / get-batch read path** | "journal.Read is the walk antipattern with a scaling wall"; determination target "Read-path: get-batch migration walled by digest equality" | `.../nats-vendor-corpus-scorecard.md:82, 108-110` | **PARTIAL** — `journal.Read` walks (`go/journal/journal.go:180-241`), holds mutex across N round-trips (external-review S-9) | R0 digest-equality wall on the migration | Go |
| A7 | **Journal crash-recovery model** (CAS-append racing appenders, crash-anywhere, restart-from-storage) | "the journal is the second concurrency kernel… and the only one without its own model"; target theorem "every crash state equals the abstract log at some prefix" | `docs/map/tickets/012-journal-model-gate.md:12-30, 55-57`; `VERIFICATION.md:200-203` | **MISSING** — `verify/journal/` absent; only `verify/catalog/` exists | **R2 → R3**, then refinement into the catalog model; pre-registered predictions (prophecy variables, EPR test, Lamport meter) | spec-side TLA + Go harness |
| A8 | **Split-CAS (Begin/Finish) conformance harness driven at the journal API** | "protod serializes create — so its conformance obligation lands HERE… drive that racing directly against the journal API" | `docs/map/tickets/012-...md:65-74`; `VERIFICATION.md:112-119` | **MISSING** | **R4** for the split branch; inherited from R4-FINDING-001 | Go |
| A9 | **Replica role: prefix preservation, read-only enforcement, lag transport, origin-position copy** | ADR-0009 ratified; "`MirrorAdvance` is a named re-create-and-project substitute while replica roles are unbuilt" | `VERIFICATION.md:169-172, 297-300`; `docs/adr/0009-...md` (whole) | **MISSING** (shape gate refuses mirror config: `journal.go:283`) | ticket 009 climb 3 — "a mirror serves only prefixes of the origin"; + resonances C5 verifiable-MPC theorem | Go |
| A10 | **Query-safety classifier per read verb** (monotone ⇒ replica-servable) | "classify every read verb monotone/non-monotone; a mirror answers exactly the monotone ones" | `.../literature-resonances.md:154-156` | **MISSING** | theorem candidate C7 | Go |
| A11 | **Session journal** (`flb.session.v0`, reserved name prefix, one journal per session) | "A session is a journal; its chain head names the exact construction history" | `[SES]:31, 80-81, 276-280` | **MISSING**; transcript is a private TS array (`proto/ts/src/session.ts:18-31`) | **U3 R0** frozen per-step head/state fixture + **L2** kernel-witness property | Go (journal) + TS (client) |
| A12 | **`expectedHead` optimistic-concurrency precondition on session append** | "This is not optional… The head precondition is what keeps the fold total" | `[SES]:262, 623-638` | **MISSING** | preserves **L1 totality**; owed grilling #4 (`[SES]:745-746`) | Go |

---

## B — Register / effector / decisions

| # | STRUCTURE / API implied | Law or claim demanding it | Cited at | Exists today | Proof obligation | Language |
|---|---|---|---|---|---|---|
| B1 | **N-owner register generalization** (symmetry reduction / IC3PO / bisimulation from N owners to self-interleaving identity) | "the identity-free variant is the generalization argument… it is an argument, not an N-owner proof" | `VERIFICATION.md:72-74`; `docs/map/tickets/013-...md:24-32`; route `.../literature-resonances.md:126-131` | **MISSING** | **R3/R5**; ticket 013 gate — "either the owner bound is discharged or its obstacle is documented" | spec-side TLA |
| B2 | **Public effector proof artifacts** (`verify/effector/`: Effector.tla, EffectorInd.tla, configs, refuted two-key spec + counterexample, run record) | "the public repository asserts this claim without shipping its evidence" | `VERIFICATION.md:78-81`; `docs/map/tickets/013-...md:16-23` | **MISSING** — `.reference/` absent from checkout | ticket 013 gate: green end-to-end with fresh run records | spec-side |
| B3 | **Hash-chained outcome-fact stream** (every `Done` also a journal fact; resurrection detection by recomputation) | "JetStream KV admin Delete/Purge erases a committed `Done`… the unique-terminal-outcome theorem is conditional on an assumption the substrate does not enforce" | `VERIFICATION.md:325-334`; `docs/map/tickets/017-...md:14-43` | **MISSING** (envelope refuses app-cred delete; admin erasure is a stated residual) | ticket 017: decide append/finish order + reconciliation law; "argue it, don't assume it"; feeds ticket 012 | Go |
| B4 | **foldlab-owned register micro-store** (append-only single file, fsync-per-commit, verify-on-read WAL, torn-write handling, recovery fold, KV mirror sync) | "the Done-erasure class dies structurally: no Delete exists because none is written" | `docs/map/tickets/019-the-register-store.md:12-47` | **MISSING** — register is JetStream KV (`go/effector/effector.go:73-107`) | **R4 from day one** — replay the 15,378-schedule corpus against the new backend; model unchanged as SPEC; R5 candidate | Go |
| B5 | **`Forget(fence)` retirement policy gated on the fence watermark, never wall-clock** | "nothing retires a Done — the register is a monotonically growing liability"; escalated to operational need by "KV memory-residency cliff… nothing ages out" | `.../literature-resonances.md:137-142`; `.../nats-vendor-corpus-scorecard.md:74-78` | **MISSING** | Apalache-fast theorem candidate C4 | Go |
| B6 | **Cross-register / multi-key atomicity** — and, failing that, **a typed refusal naming both keys** | "a single activity that attempts to commit across two effector keys must be **refused with a typed refusal naming both keys**"; "the anti-pattern to forbid is letting a workflow write two registers and *claim* exactly-once across both" | `docs/design/2026-08-13-workflow-engine-product-dialogue.md:143-161`; `docs/design/2026-08-13-effector-backed-workflow-replay.md:303-323, 656-661` | **MISSING** — no such refusal kind in `proto/go/protod/refusal.go:9-19` | "**needs its own model gate** before any exactly-once claim across keys"; the refusal itself is a stated DESIGN OBLIGATION | Go (refusal), spec-side (gate) |
| B7 | **Correction-chain fold + fork-resolution policy** (`Corrected` names its predecessor; current meaning = fold, not a cell) | "You cannot express an overwrite in this vocabulary"; "the slot's fold sees a fork it must be told how to resolve" | `[LANG]:179-185, 209-226`; `[CEA]:958-963` | **MISSING** | resolution policy explicitly **unnamed/open** (`[LANG]:583-585`) | Go (records) + TS (fold) |
| B8 | **Named-version adoption register** (which branch is *the* `CustomerType`) | "a decision two parties could legitimately disagree on, so it is single-homed" | `[SES]:582-585`; `NEXT.md:186-188` | **MISSING** | NEXT.md ownership decision 5 | Go |
| B9 | **Library-seam topology gate** — `effector.Open`/`journal.Open` must refuse `Replicas>1`, `Mirror`, `Sources` (only `protod.Acquire` does today) | external review C5: "neither checks Replicas"; `effector.go:465` shape gate must refuse mirror buckets as `journal.go:283` does | `docs/research/2026-08-13-external-review-findings.md:71, 252` | **PARTIAL** — enforced only at `protod.Acquire` (`proto/go/protod/protod.go:87-213`) | ticket 011 envelope law extended to the library seam | Go |
| B10 | **Standing shape re-check** (config-change advisories or cadence) — gates run once at Open, configs are live-mutable | "Shape gates never re-check after Open; configs are now mutable" | `.../nats-vendor-corpus-scorecard.md:15-18, 73` | **MISSING** | envelope widening, post task-16 | Go |

---

## C — Fold algebra / materialized views

| # | STRUCTURE / API implied | Law or claim demanding it | Cited at | Exists today | Proof obligation | Language |
|---|---|---|---|---|---|---|
| C1 | **Generated commutativity + idempotence laws** on `combine`, declared per algebra (`semilattice: true`) | "the suite currently cannot distinguish algebras that may federate from those that must not"; "the word *semilattice* appears in no `.ts` or `.go` file" | GH **issue #20** (whole); `[CEA]:579-603`; `packages/core/src/foldLaws.ts:155,166,179,198,218,232` (six laws, neither present) | **MISSING** — `algebras.setUnion` is semilattice-lawful *by inspection only* (`algebra.ts:412`) | **R1 generated suite** under ADR-0010 ("the law that licenses a use ships as a generated test, not an inspection"); must **refuse** the claim on non-commutative LWW union | TypeScript |
| C2 | **CvRDT merge API over refusal corpora / evidence sets** (state-based grow-only set, `merge = join`, SEC) | "Two foldlab daemons that have never communicated can merge their refusal corpora by union and are guaranteed to agree, with no lock, no consensus, and no ordering" | `[CEA]:847-863, 872-873` | **MISSING** — verdict STRUCTURAL, unbuilt | gated by C1; "evidence federates" (`CONTEXT.md`) becomes a checked claim | both twinned |
| C3 | **Colimit merge** for cross-signature corpora / ontologies (alignment span = decision; recomputed colimit = evidence, refused on mismatch) | "Merge is a colimit, not a join (ratified)… Joins remain the shared-signature special case" | `docs/map/tickets/016-...md:43-46`; `[CEA]:865-872`; `[LANG]:65-78` | **MISSING** | ticket 016 point 5, ratified-unbuilt | both |
| C4 | **Delta streaming for federated evidence** | implied by C2 + "presence is monotone… lock-free ingress"; no delta-CRDT structure named anywhere | `[CEA]:847-863`; `.../expressive-power-dossier.md:164-171` | **MISSING** — **REFUTED as an explicit demand**: the corpus asks for state-based join, not delta-CRDT. Record it as *not demanded* rather than missing | — | — |
| C5 | **Exposed `combine` for the KV meaning fold** (LWW map union — associative, function simply absent) | "the LWW map union that would make `KVState` a monoid is nowhere exported… If the daemon ever wants parallel KV replay, this is the missing primitive" | GH **issue #14** §6.1 finding 3 | **MISSING** — `kvStep` (`stream.ts:234`), `foldKV` (`:267`) give step + left fold only | must **fail** the C1 commutativity law (order is its semantics) — that is the point | TypeScript |
| C6 | **`payloadNumberOrZero` / null-absorbing `sum`** | "the obvious 'sum of amounts' fold cannot be assembled from the declared registry" | `docs/map/tickets/024-rosetta-frictions.md:15-25`; issue #14 §6.1 finding 2 | **MISSING** (`steps.payloadNumber` carrier `number\|null`, `algebras.sum` needs `number`) | grill first — "if any resolution adds machinery without a consumer, the machinery waits" | TypeScript |
| C7 | **`AdmittedFold` narrowing type / type-predicate `isAdmittedFold`** | "the admission check should narrow the type it admits" — the universal-property-to-DX move | `docs/map/tickets/024-...md:33-37` | **PARTIAL** — returns bare `boolean` (`packages/core/src/fold.ts:56`) | type-only, "near-certainly safe" | TypeScript |
| C8 | **`stateDigest` discipline decision** (public ⇒ typed union; internal ⇒ documented) | "`applyKV` returns a typed `MalformedPayload`; `stateDigest` throws `RangeError` on the same class of inputs" | `docs/map/tickets/024-...md:26-32`; issue #14 §6.1 finding 4 | **PARTIAL** — three refusal disciplines in one package | grill; three-way error-discipline law already ratified in the Rosetta pass | TypeScript |
| C9 | **`runCommitted` / `Run<A>` — both folds in one pass, memoized at `(foldDigest, head)`** | "A **committed run** returns both folds and memoizes at `(fold.digest, head)`" | `.../expressive-power-dossier.md:376-392` | **MISSING** — `runFold` exists (`foldBindings.ts:20`), the committed wrapper does not | pure, buildable today; P1 invalidation-free cache | TypeScript |
| C10 | **`replay(fold)(journalHead)` + `branchAt(journalHead, k, alt)`** | ticket 020 phase 2 "the 'I need this' climax"; licensed by state-at-k = pure fold of the first k facts | `.../expressive-power-dossier.md:419-428`; `docs/map/tickets/020-...md:33-38` | **MISSING** | needs `ProtoClient` writ (pre-graduation) | TypeScript |
| C11 | **`foldMetric` — metrics as declared folds** (counter = `count`, gauge summary = `product(min,max,sum,count)`) | "the fold algebra IS the metrics engine… each with digest identity and the invalidation-free cache" | `docs/map/tickets/020-...md:22-25`; `.../expressive-power-dossier.md:407-417` | **MISSING** | ADR-0010: each API named with its licensing law | TypeScript |
| C12 | **Go twin of the fold algebra + fold cache** | ADR-0001 "forbids claiming a cross-language wall before a second implementation"; today "Single-implementation pinned fixtures until the Go twin exists" | `NEXT.md:72-74`; external review C6 | **MISSING** | R0 cross-language wall becomes claimable only then | Go |
| C13 | **Non-test consumer of the fold tower** (the deletion risk) | "**the fold algebra has no non-test consumer**… This is the exact shape that deleted mint. If ticket 020 does not land, the entire §3 deliverable and P1/P2/P8 are deletion candidates" | `.../expressive-power-dossier.md:460-468`; external review C6 (`external-review-findings.md:102, 270`) | **MISSING** — only out-of-package importers touch `stream.ts`/`xform.ts` | the consumer gate itself (NEXT.md mint-rollback precept) | TypeScript |
| C14 | **TS property test for the two-fold compaction law over arbitrary histories × cut points** | external review C7: "(tested)" is exemplified, not quantified on the TS side; "a `compact` returning a reversed tail currently passes every TS assertion" | `.../external-review-findings.md:83, 284, 574` | **PARTIAL** — Go quantifies it (`go/stream/fuzz_test.go` `FuzzCompactionPreservesBothFolds`, 3 seeds at the gate) | R1 property + mutation harness + committed fuzz corpus | TypeScript (+ Go corpus) |
| C15 | **Widened fold-law arbitraries + astral-plane wire vectors** | external review S-3: generators are ±1000 ints (no −0, no 2^53), `stringSet` has no supplementary plane; `chains.json`/`frames.json` carry 2 vectors | `.../external-review-findings.md:121` | **PARTIAL** — silent residual, not in the closure table | ADR-0007 domain statement + divergence probe | TS + shared fixtures |
| C16 | **Incremental materialized-view fold with `(fold digest, head)` cache as the resume accelerator** | "Resume from the last anchor is `getFoldCache(fold, anchor.head)`… resume is **O(events since the last anchored head)**" | `docs/design/2026-08-13-workflow-engine-product-dialogue.md:264-274` | **PARTIAL** — `foldCache.ts` exists and is invalidation-free (`:50-51, 70`); no anchor-driven resume wiring, no reader | RATIFIED-UNBUILT (020); honest edge: O(delta) only if anchors are taken | TypeScript |
| C17 | **Hardness map** — group-by `(Law, Path-prefix)` + count, ranked derived view over the corpus | "a hardness map of the grammar: which constructs agents stumble on, ranked, with the law that caught them"; and it is "a measurement of **W7 compliance**, not just a usability report" | `[CEA]:885-899` | **MISSING** — "every algebra it needs is SHIPPED; the input stream is not" | W7 (`proto/SPEC.md:53-56`) becomes instrumented | TS view over Go corpus |
| C18 | **Materialized version space `VS(R)` with `S`/`G` boundary sets** and candidate-elimination update ops | "foldlab never materialises `VS`, so the narrowing is not observable anywhere in the system" | `[CEA]:206-231, 606-611` | **MISSING** | antitone Galois connection `R₁⊆R₂ ⇒ VS(R₂)⊆VS(R₁)`; Mitchell 1982 | TypeScript |

---

## D — Refusal corpus and the evidence/absence sort split

Bare `D<n>` row labels inside this section are namespaced
`estate-D<n>`; they are not `ticket-004/D<n>`, `proto/D<n>`, or catalog
decision IDs. References outside the table use the full namespace.

| # | STRUCTURE / API implied | Law or claim demanding it | Cited at | Exists today | Proof obligation | Language |
|---|---|---|---|---|---|---|
| D1 | **Refusal persistence — `flb.certification.v0 {Certified \| Refused}` carrying `candidate_digest, grammar_digest, catalog_head, outcome`** | "an exhaustive grep confirms **no refusal is persisted anywhere in the repository today**"; `catalog_head` is required, "without which 'this refused' is not a recomputable claim" | GH **issue #18** (Evidence §); `[CEA]:47-49, 690-696, 824-826, 1176-1178`; `[LANG]:153-159` | **MISSING** — `refuse()` constructs, returns, drops (`proto/go/protod/refusal.go:49-54`) | called "the single highest-leverage unbuilt thing in this dossier's scope"; certifier totality (refusal is a *function* of (bytes, grammar, catalog head)) | both twinned (Go writes, TS mirrors) |
| D2 | **Sort marker on refusal kinds** — `structural` (evidence, permanent) vs `absence` (head-relative, repealable) | "the nine kinds straddle foldlab's own evidence/absence line, and nothing in the code or the docs marks the split"; "The sort split must be made *before* the corpus is built, not after" | GH **issue #18**; `[CEA]:554-575, 828-834` | **MISSING** — flat const block, `proto/go/protod/refusal.go:10-18`; TS mirror `proto/ts/src/wire.ts` | design obligation; corpus soundness + noise-freedom in one split | both twinned |
| D3 | **Corpus admission filter** rejecting absence kinds | "A corpus that folds all nine kinds together would accumulate false negatives — it teaches agents that a construction is illegal when a digest merely hadn't landed yet" | GH **issue #18**; `[CEA]:830-834, 951-957` | **MISSING** | catalog-head partial order `h′ ⊒ h` defines the false-negative window | Go |
| D4 | **Corpus element encoding** — canonical `(Law, Path, candidate digest, grammar digest)` tuple as the `setUnion` element type | "a canonical encoding of … as the element type" | `[CEA]:592-594` | **MISSING** | must pass the C1 semilattice suite | TypeScript |
| D5 | **Candidate-bytes retention + grammar-regression differ** (replay corpus against a changed certifier → diff of newly-certifying / newly-refusing) | "the honest version of 'the system learns'" | `[CEA]:836-843` | **MISSING** | "a regression suite for the *grammar*" | Go + TS |
| D6 | **Corpus digest** as reproducible teaching-set identity | "model M, prompted with corpus `c0ffee…` over grammar `deadbe…` at catalog head `abc123…`" | `[CEA]:875-883` | **MISSING** (digest machinery SHIPPED; corpus not) | `bytes-sha256-v1` | both |
| D7 | **Closed refusal-kind enum / discriminated union**, generated Go→TS, with machine-checked exhaustiveness | external review S-2: "Refusal `kind` is an open string (`contract.go:60`, `wire.ts:26`); no machine-checked exhaustiveness over the nine kinds" | `.../external-review-findings.md:119`; `[MCP]:635-640, 852-854` | **MISSING** — silent residual, never entered the closure table | build-item #2 of the MCP lane | both twinned |
| D8 | **Turn-budget exhaustion refusal kind** | "exhaustion of a turn budget is an ordinary typed refusal, **and the surface needs one**" | `[LANG]:602-607` | **MISSING** | explicitly named as an unbuilt demand | Go |
| D9 | **Unrealizability refusal carrying proof** (SemGuS-shaped) | "no grammar in this universe satisfies your description, WITH proof — the refusal discipline lifted to whole languages" | `docs/map/tickets/015-...md:34-36`; `[LANG]:604-606` | **MISSING** | ticket 015 ratification 3 | Go |
| D10 | **Refusal-`next`-hint replay executor** in the conformance harness | U1: "Every refusal names a legal next move" — gate must *execute* the hint, not assert it non-empty | `[SES]:493-503`; external review C8 residual (`external-review-findings.md:299`) | **PARTIAL** — hints asserted non-empty, never executed | new **R0/R1** gate | Go + TS harness |

---

## E — Grammar, certifier, concierge

| # | STRUCTURE / API implied | Law or claim demanding it | Cited at | Exists today | Proof obligation | Language |
|---|---|---|---|---|---|---|
| E1 | **Per-hole legality automaton — tree automaton compiled from the declared grammar; `frontier(hole) = successor states`** | "`buildFrontier` computes `legal := frontierChoices(refs)` **once, outside the hole loop**, then assigns the identical choice list to every hole"; "the frontier becomes a DERIVED artifact… **never a hand-written table**" | GH **issue #19** (whole); `docs/map/tickets/003-...md:58-60`; `[CEA]:617-642`; `[LANG]:408-411` | **MISSING** — constant table at `proto/go/protod/concierge.go:124-136, 138-` | ticket 009 climb 2 (**R1** by induction on the grammar): `unfill∘fill=id`, frontier-empty ⇔ catalogable, **no dead ends** | Go |
| E2 | **Tree-automaton emptiness decision procedure** (discharges the PREFIX PROPERTY) | "every offered fill admits a closed completion, discharged mechanically as tree-automaton emptiness — no dead ends, ever" | `docs/map/tickets/003-...md:53-56`; `[CEA]:636-642, 698-716` | **MISSING** — today only a table property at `proto/ts/test/concierge.test.ts:304` | discharges C4 honestly; **none of SENSIBILITY / CONSTRUCTION REACHABILITY / PREFIX PROPERTY appears in any `.ts` or `.go` file** (`[CEA]:640-642`) | Go |
| E3 | **`grammar.subsumes(A, B)` verb** (automaton inclusion) as inter-agent DSL trust | "automaton inclusion = inter-agent DSL trust"; and it is the replay-safety decision for grammar bumps | `docs/research/2026-08-13-language-ontology-frontier.md:122-124`; `[SES]:304-310` | **MISSING** | closure law (ticket 004 addendum 10) keeps inclusion decidable | Go |
| E4 | **Closure-law admission fold** — regularity preservation argued per node kind, enforced at admission | "every node kind admitted to the grammar must preserve regularity of the induced tree language, with the argument written in the node's spec"; escape ⇒ "'no dead ends, ever' becomes unprovable" | `docs/map/tickets/004-...md:110-117`; `[CEA]:969-990`; `[LANG]:313-314` | **MISSING** (ASPIRATIONAL) | the obligation `[CEA]:990` says "should be recorded as such" and is **unrecorded** | Go |
| E5 | **`certify(bytes) → Certificate \| Refusal` as a named single entry point** | "The certifier is the only path to the catalog… No second admission path, ever — not a convenience API, not a migration script" | `docs/map/tickets/015-...md:19-25`; `CONTEXT.md` "Certifier"; `[CEA]:663-667, 1011` | **MISSING as a named function** — "no `certify(` exists in code"; the behaviour is spread across `walk.go` + `dispatch.go` | RATIFIED-UNBUILT; **trusted-base line count owed in VERIFICATION.md and absent** (`[CEA]:1179-1180`) | Go |
| E6 | **`normalize(term)` as a nameable function; identity = SHA-256(canonical(normalize(term)))** | "ratified now so semantically identical grammars can never fork digests later"; any future normalize ships termination + confluence arguments and a fixture wall BEFORE touching identity | `docs/map/tickets/004-...md:101-111`; `[SES]:212-237` | **PARTIAL** — union member sort at `proto/go/protod/walk.go:158-163` *is* a normalization but is not named as one | **owed grilling #1** (`[SES]:741-742`): correct addendum 9 or name the sort as `normalize` | Go + TS |
| E7 | **Exhaustive SchemaAST fold (owned canonical encoding, `foldlab.schema.v1`) + frozen fixture wall** | "a pin bump that changes the AST is a compile error in the fold, never a silent digest move" | `docs/map/tickets/004-...md:44-51`; `VERIFICATION.md:224-226` | **MISSING** — interim `bytes-sha256-v1` over submitted bytes (`proto/go/protod/scheme.go:17-27`) | ticket 004 is the **critical path**: 005, 015, 016 all gate on it | Go (verifier) + TS (authoring) |
| E8 | **Unison cycle rule for recursive types** (hash the SCC; order members by cycle-removed hashes; address `digest.n`) | "a catamorphism does not terminate on a cyclic AST, so the structural digest is currently underdefined on recursion. v0 is safe only because refs-must-resolve forces a DAG" | `.../literature-resonances.md:100-105`; `.../expressive-power-dossier.md:494-501`; `docs/design/2026-08-13-the-unified-fold.md:109-112` | **MISSING** — REQUIRED before ticket 004 reaches `Suspend` nodes | R0 fixture on cyclic ASTs | Go + TS |
| E9 | **Polarity admissibility law** (only positive shapes may be content-addressed; negative-type node refuses with polarity named) | "turns 'functions have no canonical bytes' into a theorem that predicts which extensions break identity" | `.../literature-resonances.md:149-152` | **MISSING** | theorem candidate C6 | Go |
| E10 | **Merkle node-digest annotation on the partial tree** (`SHA-256(RFC 8785(normalize(subtree)))` per node, bottom-up in one traversal; incremental spine update O(depth)) | "one more semantic fold over the existing walk"; unlocks O(1) equality, O(changed·depth) diff, exact-subtree search by hash | `[SES]:340-356, 695-696`; `[SES]:396` | **MISSING** | unified-fold Face B at every node; diffs "sound, not minimal" | Go |
| E11 | **`opaque` upgraded to a TYPED hole; partials addressable by digest** | SENSIBILITY: "every reachable partial state is well-formed, so every intermediate has a digest… half-built grammars shareable by hash" | `docs/map/tickets/003-...md:47-56`; `[LANG]:420-422` | **PARTIAL** — `{"k":"opaque"}` is untyped (`proto/wire/CONTRACT.md:148-151`); holes have no digest (C5) | ticket 003 amendment; softens tree-with-holes-cannot-be-catalogued into "addressable, never catalogable" | Go |
| E12 | **Frontier → natural-language question renderer (semantic fold)** | "not a prompt someone wrote; it is `frontier[i].legal` rendered into language… you can prove the system asked exactly the questions the grammar left open" | `[LANG]:410-414, 443-444` | **MISSING** | recomputable from (partial, grammar, catalog head) | both |
| E13 | **GBNF/FSM index served by digest** (agent runtimes pin to a DSL by hash) | "any agent runtime (llama.cpp, Outlines, XGrammar) pins to a foldlab DSL by hash"; no MCP protocol field carries it — must be out-of-band | `docs/map/tickets/015-...md:37-42`; `[MCP]:552-557`; `[LANG]:304-306` | **MISSING** (ASPIRATIONAL) | ledger note: GAD distortion — "validity is a syntactic claim, never semantic" | Go (serve) + TS (consume) |
| E14 | **GF reversibility wall** `parse_C(linearize_C(v))` digest-equals `v`, one generated wall over all concrete syntaxes | "one generated wall covers all of them" — the licensing law for derived DSL translation | `.../language-ontology-frontier.md:117-121`; `docs/design/2026-08-13-the-unified-fold.md:213-217` | **MISSING** | ticket 015 deliverable 4 | both |
| E15 | **Witness tier** (declared serializable inverse semantics per step; anonymous witnesses refuse identity; `synthesize(grammar, examples)`) | "one more fold with a by-construction correctness law" | `docs/map/tickets/015-...md:43-46` | **MISSING** | FlashMeta lineage | Go |
| E16 | **Per-hole batch fill as a *client-side* macro** (decomposes into single `type.fill` calls in identity order) | "the batch is a **client-side convenience above the writ**… The writ does not grow" | `[LANG]:390-397` | **MISSING** | W9 three-verb writ preserved — "no new authority, no new law, no new refusal kind" | TypeScript |
| E17 | **`refine` macro** = `unfill(π)·fill(π, narrower)`, never a primitive | "It stays a client-side macro that emits both events" — preserves C2's two-element statement | `[SES]:126-130` | **MISSING** | C2 reversibility | TypeScript |
| E18 | **Open/closed-ness flag per contract struct node**, carried Go→TS through codegen | external review C3: `CONTRACT.md` ratifies extra keys, `ingress.go` admits them, `contract.describe` describes a closed struct, `toJsonSchema` emits `additionalProperties:false` — "the derived MCP publish tool forbids frames the daemon accepts" | `.../external-review-findings.md:46, 220, 570` | **MISSING** — **the only central external-review claim still OPEN, with no issue number** | "a disagreement between contract and daemon is a bug in one of them"; drift test asserting served schema ≡ admission domain | both twinned |

---

## F — Sessions, branching, revision

| # | STRUCTURE / API implied | Law or claim demanding it | Cited at | Exists today | Proof obligation | Language |
|---|---|---|---|---|---|---|
| F1 | **Session meaning-fold** (carrier = partial tree, step = move, monoid action) with per-prefix state digest | "This is the **monoid action** form — the one CONTEXT.md says licenses O(1) extension"; L1 totality ⇒ "**a session can be branched at any step**" | `[SES]:82-87, 162-165` | **MISSING** | **L1** (from SENSIBILITY); **L3** O(1) extension | both |
| F2 | **`session.branch(session, step)`** — new journal, `open.from{session,step,head}`, seed = `ĝ(prefix)` | "The branch point is a checkable claim" | `[SES]:252-255` | **MISSING** | **U3**: `open.from.head` must equal the parent head at k | both |
| F3 | **Rebase engine** — replays parent suffix iff each move's path is disjoint from every path edited since the branch point | "Two moves commute exactly when neither path is a prefix of the other" (**L4** commutativity class = path-disjointness) | `[SES]:190-198, 286-291` | **MISSING** | **L4** licenses fan-out + rebase; O(1) per move | Go |
| F4 | **Unreplayable-move record** `{path, law}` + partial-as-far-as-it-got + frontier in the refusal | "Moves that fail are not dropped silently and are not repaired" | `[SES]:292-296, 311-317` | **MISSING** | **U1** | both |
| F5 | **Structural diff** (compare root digests; recurse only into differing children) with **diff output = a move script** | "a diff *is* a branch suffix"; "Diffs are sound, not minimal" | `[SES]:346-356, 663-666` | **MISSING** — gated on E10 | sound-not-minimal is a stated limit | Go |
| F6 | **Dual-record digest scheme** (a `commit` names a digest *under a scheme*; never re-derive under a new normalize) | "re-deriving would falsify a committed fact in an append-only, tamper-evident log" | `[SES]:319-332` | **MISSING** | settles ticket 004's open migration question (re-derive vs dual-record); **owed grilling #2** | both |
| F7 | **Standing prohibition: frontier is a pure function of `(state, catalog head)`** — never reads the session journal | "no 'you already tried that', no history-dependent ranking, ever, inside the frontier"; history-derived advice belongs in a separate surface | `[SES]:200-208, 531-538` | **not yet violable** (no session journal) | **L5 / U4** at R1 with a **negative control: a memoizing frontier must fail the property** | Go |
| F8 | **Auditor re-derivation API** `Derive(canonicalBytes(normalize(replay(prefix))))` vs the claimed commit digest | "**provenance soundness**: a session cannot lie about which type it produced" | `[SES]:221-228` | **MISSING** | **L7** commit convergence | both |
| F9 | **Enumerable `ker(ĝ)` generator families** (round trips, idempotent unfills, refusals/reads) as property-test witnesses | "assert equal state digests and unequal heads" | `[SES]:167-184` | **MISSING** | **L2** generated-witness property test | both |
| F10 | **Three-tier retention policy keyed on sort** (fill/refusal traces compactible; utterances+proposals irreducible; adoptions never discardable) | "The storage policy is read off the sorts" | `[LANG]:258-263` | **MISSING** | compaction "only ever by explicit choice" (`CONTEXT.md`) | both |

---

## G — Catalog as a query surface

| # | STRUCTURE / API implied | Law or claim demanding it | Cited at | Exists today | Proof obligation | Language |
|---|---|---|---|---|---|---|
| G1 | **Catalog query fold** keyed `(query digest, catalog head)` — `defineFold(setUnion, structureMatches(pattern))` | "Catalog search is… the meaning fold at a query algebra" — the doc's one architectural claim; and it makes the same order-independence assumption C1 gates | `[SES]:364-382`; GH issue #20 | **MISSING** — catalog exposes `resolve` + `resolvableDigests(limit)` only (`proto/go/protod/catalog.go:58-80`) | **U2**: R0 per-row re-derivation fixture + R1 "recomputed fold == returned set" | both twinned |
| G2 | **New `StepSpec` op `structureMatches(pattern)`** carrying the pattern as canonical data | "it needs one new `StepSpec` op carrying the pattern as canonical data" | `[SES]:370-372` | **MISSING** (`packages/core/src/algebra.ts:600` `steps` registry) | queries become content-addressed values | TS + Go |
| G3 | **`type.get {digest}` request kind** + `byDigest` index rebuilt by verify-on-read | "None of five current subjects covers it… One request kind. **Trivial.**" | `[SES]:395, 686-688` | **MISSING** (subjects at `proto/go/protod/dispatch.go:17-21`) | — | Go |
| G4 | **Shape-query pattern matcher** (query language *is* the grammar; holes are wildcards; matching is a co-walk) | "a query is a partial, holes are wildcards" — takes the grammar walk to its 5th consumer | `[SES]:396, 555-562` | **MISSING** | earns-its-keep count 3→5 | Go |
| G5 | **Frontier `refs` from the query fold** (retires `resolvableDigests(16)` lexicographic placeholder) | "the agent is offered sixteen arbitrary types at every hole" | `[SES]:441-454`; GH issue #19 (related) | **PARTIAL** — lexicographic-first-16 (`catalog.go:65-80`, `CONTRACT.md:79-85`) | must stay lawful under **L5** and **C1** | Go |
| G6 | **Provenance fold** over session journals keyed by `commit.digest` | "provenance is a query, never a field" | `[SES]:397, 514-518` | **MISSING** — gated only on the session journal (A11) | keeping the catalog-fact shape frozen is what keeps U2 true | both |
| G7 | **Derived-attribute formal context fold** (attributes computable by fold over structure — "has field named `id`", "references digest D") | "a **derived-attribute formal context is free**" — and it lowers ticket 016's `max_questions` budget before 016 starts | `[SES]:400-409, 697-698` | **MISSING** | ticket 016 point 2 | both |
| G8 | **Certificate row** `{digest, scheme, structure, catalogSeq, catalogHead, submitter}` + caller-side re-derivation | "search cannot lie about identity" (W6: heads are claims) | `[SES]:411-428, 505-513` | **MISSING** | **U2** — rows are certificates, not hints | both |
| G9 | **Verifiable journal cursor `{seq, head}` in the payload** (never MCP's opaque `cursor`) | "our cursor is a **journal cursor**… which verifies" | `[SES]:472-475`; `[MCP]:684-694, 900-901` | **PARTIAL** — cursor exists on `journal.read` (`proto/go/protod/read.go:19-27`, `bad-cursor` refusal); not used as the pagination surface | `bad-cursor` (W6) | both |
| G10 | **Brand index** ("brand or be unfindable" — the only meaning-reaching search key, since identity commits shape only) | "Brands are the one naming channel identity keeps" | `[SES]:49-54, 616-621` | **MISSING** | ticket 004 laws 4–5 | both |
| G11 | **Ranking as a declared fold, else catalog order** | "An LLM-ranked result set is an author claim wearing a certificate's clothes" | `[SES]:657-659` | **not yet violable** | — | both |

---

## H — Learning machinery (MAT, version spaces, induction)

| # | STRUCTURE / API implied | Law or claim demanding it | Cited at | Exists today | Proof obligation | Language |
|---|---|---|---|---|---|---|
| H1 | **Angluin observation table** (rows from counterexample prefixes; `O(n(n+n·\|Σ\|))` membership fills) | L* escape from Gold unlearnability; "a counterexample of length `m` contributes its prefixes as new table rows" | `[CEA]:129-137` | **MISSING** | `≤ n` equivalence queries | TS (learner) |
| H2 | **Equivalence-query verb** — the MAT's *second* verb | "the concierge answers no equivalence query — there is no verb that asks… **Ticket 015's theorem obligation is therefore not yet dischargeable as stated**"; "Claiming MAT status on membership queries alone is a category error" | `[CEA]:460-466, 930-934`; theorem owed at `docs/map/tickets/015-...md:26-33` | **MISSING** — membership *is* shipped (`certify` = the label oracle) | 015's "the concierge is a minimally adequate teacher" theorem; may be dischargeable only by **composing 015's membership oracle with 016's equivalence machinery** (`[CEA]:735-743`) — worth grilling first | Go |
| H3 | **Counterexample minimization / decomposition** (discrimination tree, TTT single-refining-suffix extraction, linear space) | "efficient when counterexamples are pathologically long — which is the practical situation when the 'teacher' is a running system" | `[CEA]:148-158` | **MISSING** | Isberner/Howar/Steffen | TS |
| H4 | **Precomputed `G`-refinement payload** — `(Law, Path)` *is* the minimal specialisation; `Example` is the non-emptiness witness | "**foldlab's certifier hands over the refinement already computed**"; "`Example`… is what stops the version-space collapse" | `[CEA]:516-532, 936-942` | **EXISTS (emit side)** — `Refusal{Kind,Law,Path,Got,Expected,Example,Next}` (`proto/go/protod/refusal.go:33-`), W7 shipped. **MISSING (consume side)** — nothing accumulates it | W7/W8 shipped; the consumer is estate-D1 | Go emits / TS consumes |
| H5 | **Split labelled sample `S⁺ / S⁻` + characteristic set** (RPNI shape; negatives are the merge-veto) | "The positives determine the search space; the negatives determine where the search stops"; no such theorem exists for positive-only samples "and by §1.2 there cannot be" | `[CEA]:383-402` | **MISSING** | de la Higuera 1997 | TS/Go |
| H6 | **Falsifiable teaching benchmark harness** (replace an L*LM-style LLM oracle with the concierge; measure convergence) | "**The claim is testable with Olausson's own methodology, and nobody has run it**" | `docs/map/tickets/015-...md:31-33`; `[CEA]:341-349, 786-794, 1013` | **MISSING** | ticket 015 ratification 2 | TS |
| H7 | **Monotone constraint set `S`** — the CEGIS accumulator | "`constraint set S, growing` \| **absent**"; "**there is no `S` at all**" (Break 2 of the CEGIS correspondence) | `[CEA]:660-696` | **MISSING** | Break 1 (behavioural spec channel) is *irreducible* — "Anyone describing this loop as CEGIS without naming Break 1 is overclaiming"; **"The estate must not claim convergence"** | both |

---

## I — Ontology / FCA (ticket 016)

| # | STRUCTURE / API implied | Law or claim demanding it | Cited at | Exists today | Proof obligation | Language |
|---|---|---|---|---|---|---|
| I1 | **`flb.scale.v0`** — ordered predicate digests over canonical structure, itself a cataloged type; anchor triple (scale digest, exploration-journal head, lattice digest) | "Every ontology names its lens" | `docs/map/tickets/016-...md:20-24`; `[CEA]:236-240, 729` | **MISSING** — gated on ticket 004 | ticket 016 point 1 | both |
| I2 | **Formal context `(G, M, I)`** + **concept lattice** (complete lattice by mechanical closure) | attribute exploration is the bounded-task engine; "the collapse is a mechanical closure yielding a complete lattice" | `.../language-ontology-frontier.md:30-35`; `[CEA]:236-250` | **MISSING** | Ganter & Obiedkov | both |
| I3 | **Pseudo-intent enumerator in next-closure order + Duquenne–Guigues canonical basis** | "**no question is entailed by any prior answer** — a theorem, not a heuristic"; basis is complete, non-redundant, minimum-cardinality | `[CEA]:273-280, 745-752`; ticket 016:16-19 | **MISSING** | RATIFIED-UNBUILT | both |
| I4 | **Armstrong-rule entailment checker** | "every implication valid in the domain follows from `L` by Armstrong's rules" | `[CEA]:267-271` | **MISSING** | completeness at termination | both |
| I5 | **Exploration Q/A journal `flb.exploration.v0`** + ontology as a recomputable fold converging from above | "recompute the lattice from the journal alone; digest must equal the live computation" | `.../language-ontology-frontier.md:171-174`; ticket 016:35-42 | **MISSING** | no-LLM de-risking experiment 4 | both |
| I6 | **Budget contract + overflow refusal carrying the still-sound partial basis and resume journal head** | "Bounded ≠ small (coNP next-question, exponential worst-case basis) — the sharp edge arrives as a taught refusal, never a hung endpoint" | ticket 016:26-31; `VERIFICATION.md:360-363`; `[CEA]:284-286` | **MISSING** | stated limitation already in the ledger | Go |
| I7 | **Two task verbs — membership and equivalence** (neither alone suffices); target fragment declared as contract data | Konev–Lutz–Ozaki–Wolter: DL-Lite/OWL-2-RL polynomially learnable, EL provably not | ticket 016:30-34 | **MISSING** | theorem-forced | both |
| I8 | **Pattern structures** (descriptions ordered by anti-unification; meet = declared commutative idempotent monoid; projection = declared precision dial) | "the fold algebra's own object" — meet must be a **declared** commutative idempotent monoid | ticket 016:48-51; `.../language-ontology-frontier.md:141-145` | **MISSING** — and the commutativity/idempotence laws that would license it are exactly C1 | gated on C1 | TypeScript |
| I9 | **Swoosh ICAR walls** on declared merges (idempotence/commutativity/associativity) ⇒ order-independent entity anchors | "the monotone result applied a second time" | `.../language-ontology-frontier.md:146-148`; ticket 016:53-55 | **MISSING** | gated on C1 | both |
| I10 | **Fallible-oracle consistency protocol** (or the number that says it isn't needed) | "the fallible-oracle consistency number decides whether a consistency protocol precedes architecture" | ticket 016:56-58; `[CEA]:964-967`; `[SES]:610-614` | **MISSING** — explicit **GATE**, "Correct call; leave it there" | de-risking experiment 3 | Go |
| I11 | **Snelting–Tip context over our own catalog+journal usage relations** (types × appears-in-span / consumed-by-program / carries-check) | "the vision's empirical floor, zero LLM calls" | `.../language-ontology-frontier.md:160-163` | **MISSING** | no-LLM de-risking experiment 1 | both |

---

## J — Certificates, provenance, oracle referees

| # | STRUCTURE / API implied | Law or claim demanding it | Cited at | Exists today | Proof obligation | Language |
|---|---|---|---|---|---|---|
| J1 | **Certificate record** `{schema digest, program digest, input anchor, span head}`, itself cataloged, riding every record and/or span | "Every field is recomputable by an auditor" | `docs/map/tickets/005-certificate-shape.md:12-19`; `CONTEXT.md` "Certificate" | **MISSING** — blocked by 004 + 008 | free-monoid theorem C1 "explains ticket 005's four fields exactly"; MMR lower bound decides the frozen-head fork (`.../literature-resonances.md:94-99`) | both twinned |
| J2 | **Certificate dual digests** (fused and unfused program digests) | "fusion is a bisimulation-preserving digest-CHANGING rewrite, so certificates should record both" | `.../literature-resonances.md:175-179` | **MISSING** | theorem candidate C12; ticket-005 input | both |
| J3 | **Transition certificate record** — `{spec digest, bounds, pre-state, action, post-state, observations, journal heads}` validated against the authoritative TLA relation | "Nothing independently establishes that the oracle still denotes the checked TLA relation — the producer's restated semantics referee their own conformance" | `docs/map/tickets/022-the-oracle-referee.md:12-37`; `VERIFICATION.md` R4 bounds | **MISSING** | **R4 upgrade**; checker must carry its own controls (corrupt pre-state/action/post-state each caught); **"NEVER generated from the same transition code it judges"**; named as the estate-of-safety through-line candidate (could upgrade the effector's lockstep for free) | Go + spec-side TLA |
| J4 | **Linearizability history recorder + sequentialization searcher** (per-op invoke/ack/return across *distinct* connections; result-flip control) | "client histories never overlap, so the corpus provides zero linearizability evidence in the Herlihy–Wing sense"; external review C5 adds: `TestLinearizableReads` certifies only per-writer read-your-own-ack monotonicity, 8 writers on one connection | `docs/map/tickets/023-linearizability-histories.md:12-39`; `.../external-review-findings.md:71, 252` | **MISSING** | new obligation class; **result-flip control must be caught in every configuration**; cross-daemon under union resolution is where "a genuine surprise could live" | Go |
| J5 | **Spec-state coverage measure of the schedule corpus**, published beside the sensitivity number | "828/828 is fault-sensitivity, not coverage" | `.../literature-resonances.md:193-196` | **PARTIAL** — catalog R4 publishes 0.008474984% coverage (`VERIFICATION.md:125-127`); effector does not | owed | spec-side |
| J6 | **Trace validation of production/gauntlet kill-9 runs via constrained TLC**, with corrupted-trace negative controls | "Complementary second bridge" | `.../literature-resonances.md:196-200` | **MISSING** | Cirstea/Kuppe/Loillier/Merz | spec-side |
| J7 | **Alignment-span record** `utterance ← interpretation → value` (two evidence feet, one decision edge) + recomputed-colimit checker | "An interpretation is an alignment span between a language artifact and a typed artifact"; merge admitted only as (span digest — decision; colimit digest — evidence, refused on mismatch) | `[LANG]:73-78`; ticket 016:43-46 | **MISSING** | Goguen institutions | both |
| J8 | **Interpreter provenance struct** `{model, version, params_digest, prompt_digest, decode_mode, grammar_index_digest?}` + **config-hashed work key** | "a different model … is a **different unit of work**, and therefore cannot silently overwrite" — "structural, not a policy" | `[LANG]:103-115, 148-150` | **MISSING** | precedent: `docs/design/2026-08-13-effector-backed-workflow-replay.md:137-155` | Go |
| J9 | **`principal_claim{subject, auth_basis}` + auth gate refusing adoption on asserted-but-unauthenticated principals** | "a voiceprint match is evidence about a signal, not authentication of a person"; parallels refusing an `Acquire` whose premise no proof covers | `[LANG]:553-561` | **MISSING** — and `protod`'s loopback listener has **no auth at all** (`.../nats-vendor-corpus-scorecard.md:78-81`) | ticket 011 discipline: assumptions as executable laws | Go |
| J10 | **FoldlabTracer Layer** — span id = segment chain head, injected via `Tracer.externalSpan` | "span id = the segment's chain head (recomputable, never assigned)" | `docs/map/tickets/020-...md:17-21`; `.../expressive-power-dossier.md:394-405` | **MISSING** — needs `ProtoClient`, which is pre-graduation | ticket 005 shape feeds from here | TypeScript |
| J11 | **`JournalMessageStorage` Layer** (`saveRequest`/`saveReply`/`repliesFor`/`unprocessedMessages` … and eleven more ops) | "the highest-leverage seam in the cluster stack"; the ratified **first build slice** | ticket 020 phase 1 resolution `:45-78`; `.../effector-backed-workflow-replay.md:523-560` | **PARKED** — `proto/ts/src/cluster/` holds only `CONTEXT.md` + `FINDING-WRIT-001.md`; **stopped before implementation** on A4 | DONE GATE (two parts): stock examples run unchanged + an authored **differential conformance suite** with negative controls — "No TCK exists at the pin; this suite is the upstream artifact" | TypeScript (Go writ if A4 option 2) |
| J12 | **R2 verifier statistics** — paired discordance (b,c), exact p, Wilson intervals; replicate index in the work-digest preimage; noise-aware selection law | "integer floors become stated statistics"; commissioned research "indicts the floors as noise-dominated" | `docs/gauntlet/R2-attempts.md:175-186` | **MISSING** — **amendment package awaiting ratification** | frozen artifacts change only by ratified amendment | Go |

---

## K — Language-surface records (branch `[LANG]`, names proposed not ratified — `[LANG]:122`)

| # | STRUCTURE | Demanded by | Cite | Exists | Lang |
|---|---|---|---|---|---|
| K1 | `flb.capture.v0 Captured{medium, audio_digest, capture{...}}` | evidence root for voice | `[LANG]:128-132` | MISSING | both |
| K2 | `flb.utterance.v0 Uttered{transcript_digest, source: Typed \| Transcribed{audio_digest, asr_provenance, adoption}, principal_claim, at}` | "`at`: journaled arrival, not asserted wall time" (W1) | `[LANG]:134-140` | MISSING | both |
| K3 | `flb.proposal.v0 Proposed{utterance_digests[], grammar_digest, partial_digest, frontier_digest, fills[], interpreter, catalog_head}` | ADR-0005: LLM traffic is journal traffic | `[LANG]:142-151` | MISSING | both |
| K4 | `flb.certification.v0 {Certified \| Refused}` | = **estate-D1**, the corpus's missing piece | `[LANG]:153-159` | MISSING | both |
| K5 | `flb.interpretation.v0 Interpreted{slot, ..., value_digest, catalog_head, principal}` — effector-homed | value_digest **must** be a Certified outcome | `[LANG]:169-177` | MISSING | Go |
| K6 | `flb.correction.v0 Corrected{supersedes, ...}` | append-naming-predecessor; no overwrite expressible | `[LANG]:179-185` | MISSING | Go |
| K7 | `flb.confirmation.v0 Confirmed{interpretation, principal}` — separate record, separate principal | "A certificate is not a confirmation — the single most damaging error available in this design" | `[LANG]:187-190, 577-581` | MISSING | Go |
| K8 | **`slot` identifier** (hex64 naming what a meaning is FOR) | named bindings go through the effector | `[LANG]:170`; `NEXT.md:186` | MISSING | both |
| K9 | **Interim-ASR chatter channel** (rendered, never admitted) + utterance-final endpointing | "Evidence commits when it stops changing; decisions commit when a principal says so" | `[LANG]:501-519` | MISSING (precedent: `go/effector/watch.go:41-53`) | both |
| K10 | **`flb.workflow.v0`** as a cataloged grammar (slots: sequence, activity, durable-clock, deferred, branch) | "Q4's undecidable runtime check becomes a **decidable admissibility check**" — the strong "refuses what it cannot replay" form | `docs/design/2026-08-13-workflow-engine-product-dialogue.md:193-230`; ticket 008 | MISSING (ASPIRATIONAL) — **open**: whether the useful workflow fragment stays *regular* | both |
| K11 | **Typed migration plan as a journal fact** ("at anchor k, run R under D_old adopts a continuation under D_new") | content addressing forbids silent hot-patching; "you must express migration as a typed fact" | `.../workflow-engine-product-dialogue.md:119-140` | MISSING | Go |

---

## L — MCP surface (branch `[MCP]`; issues #16, #17)

| # | STRUCTURE / API | Demanded by | Cite | Exists | Obligation | Lang |
|---|---|---|---|---|---|---|
| L1 | **Object-typed refusal envelope** `Schema.Struct({ok, fact, refusal})` so `outputSchema` is advertised | "every tool the shipped foldlab MCP server serves today advertises NO output schema… the nine refusal kinds are invisible to any validating client" | GH **issues #16 F1, #17**; `[MCP]:655-661, 848-851` | **MISSING** — `success: Schema.Unknown` at `proto/ts/src/mcp.ts:71` | test asserting non-empty `outputSchema` per tool + the nine kinds + a **negative control** that fails on regression to bare union/`Unknown` | TypeScript |
| L2 | **Digest-URI parser that refuses rather than normalizes** | "Resource lookup routes URIs through `find-my-way` with `ignoreTrailingSlash`… a decoder that repairs its input is naming a different value" | GH **#16 F2**; `[MCP]:803, 861-863` | **MISSING** — no URI scheme exists yet | **BLOCKING conformance item (P11) before any digest-addressed resource ships** | TypeScript (+ Go canonical) |
| L3 | **Stable tool set** — forbid `EnabledWhen`; no per-connection list variance | spec 2026-07-28 "MUST NOT vary per-connection" | GH **#16 F3**; `[MCP]:806, 861-863` | **not yet violated** (recorded as standing design law in HEAD commit 0994a3e42) | **BLOCKING conformance item (P14)** | TypeScript |
| L4 | **URI scheme + minter** (`flb:type/<hex64>`, `flb:journal/<name>`) | "foldlab has no URI scheme today… by ADR-0010 it enters only with the law that licenses it" | `[MCP]:404-406`; D23 | **MISSING** | ADR-0010 declared-right gate | both |
| L5 | **Session state in the journal, never the transport** | spec removes sessions/`initialize`/`ping`/`resources/subscribe`/server-initiated requests; "nothing foldlab builds should depend on transport sessions" | GH **#16 F4**; `[MCP]:883-886` | **satisfied by design** (concierge is stateless) — becomes a demand for A11 (session journal) | axis-B pin-bump risk | both |
| L6 | **`journal.read` as the streaming surface** with the verified `{seq, head}` cursor in tool *arguments* | "No subscriptions, no SSE, no resumability"; "put the cursor in the tool arguments, never in the transport" | `[MCP]:692-694, 858-860` | **PARTIAL** — `journal.read` exists; not wired as the MCP paging surface | build-item #4 | both |
| L7 | **foldlab MCP conformance suite pinning P1–P14 with negative controls** | "P11 and P14 as blocking items before any digest-addressed resource ships" | `[MCP]:841-844, 861-864`; also the uncommitted Appendix A probe `:909-943` | **MISSING** | build-item #5; AGENTS.md negative-control precept | TypeScript |
| L8 | **Per-client progress routing** (`progressToken` from `_meta`; requires `addTool` not `registerToolkit`) | "A `notifications/progress` emitted by a handler goes to **every** connected client, not to the one that supplied the token" | `[MCP]:216-222, 729-735, 867-868` | **MISSING** | build-item #7 | TypeScript |
| L9 | **Journaled progress fact read at a cursor** (progress as evidence, not notification) | "A notification is a hint to go read something; the read is the evidence" | `[MCP]:747-748, 877-879` | **MISSING** | — | Go |
| L10 | **Pluggable journaled synthesizer seam** (sampling as one optional adapter, never the loop's spine) | "sampling is irreducibly the second case — journal the *result*, never claim the *call* is reproducible" | `[MCP]:541-550, 566-570, 865-866` | **MISSING** | build-item #6 | Go + TS |
| L11 | **Elicitation wrapper converting decode-defects into typed refusals**; scalar-only elicitation registry | "a non-validating client turns a protocol-level type error into a server-side **defect**, not a refusal. That inverts foldlab's W8" | `[MCP]:466-483`; `[SES]:476-480` (refuse elicitation as an admission path) | **MISSING** | W8; ticket 015 deliverable 1 permits no second admission path | TypeScript |
| L12 | **Authorization layer** (OAuth 2.1, RFC 9728, audience validation) | "entirely, if the server is ever exposed beyond localhost" | `[MCP]:281-286, 869-870` | **MISSING** | build-item #8 | TypeScript (+ Go) |
| L13 | **Tool-annotation claim set made true by the writ** (`readOnlyHint` etc., pinned by test, never trusted inbound) | "foldlab can make the claim true by construction… but MCP will not check it" | `[MCP]:592-596, 873-876` | **MISSING** | D13 PIN; W9 | both |
| L14 | **MCP resource templates + completion handler routed to the catalog query fold** | "The frontier's ref advertisement and MCP argument completion are the same query fold" | `[SES]:465-471`; `[MCP]:390-394` | **MISSING** | gated on G1 | TypeScript |

---

## M — Model / proof-side structures

| # | STRUCTURE | Demanded by | Cite | Exists | Obligation | Lang |
|---|---|---|---|---|---|---|
| M1 | **`ASSUME` guards on all TLA constants + `CatalogNaturallyBounded` restated against `Cardinality(Vals)`** | "`NumVals=4` and `NumVals=9` produce **byte-identical** closures"; "a future 'checked at 6 values' claim would come back green covering nothing new" | GH **issue #9** (FINDING-BOUNDS-001); `.../external-review-findings.md:148, 383, 586` | **MISSING** — fix in flight on `worktree-agent-a0f6f6a10c577aa55`; **explicitly "the last open issue"** | R2 closure honesty | TLA |
| M2 | **Per-clause negative controls** — split `LagIsAbsenceNeverWrongData` into `LagPrefixLength`/`LagPrefixContent`; new `OverrunMirror` constant | "the forged-mirror trace violates two other laws besides the one checked, so 'exactly its dropped law' is not yet licensed for every control" | `VERIFICATION.md:149-153`; `.../external-review-findings.md:150, 421` | **MISSING** — HARDENER lane, in flight | four → **five** sabotaged variants once `CatalogBroken.overrun.cfg` lands (ledger edit owed) | TLA |
| M3 | **Stated-once law definitions** (`AdmissionStep`/`MonotonicityStep` defined twice: `Catalog.tla:327-332` vs `CatalogInd.tla:69-77`) | closes "R3 silently checks a different law than TLC" | `.../external-review-findings.md:146, 419` | **MISSING** — in flight | stated-once law | TLA |
| M4 | **Recorded-jar-SHA + canary-count registry** as a standing artifact | gate reproducibility across platforms; Apalache reports by conjunct index which renumbers ⇒ controls must run as single named invariants | `.../external-review-findings.md:412-431` | **PARTIAL** — `run-ind.sh` landed with portable sha256 + recorded jar SHAs | R3 gate mechanization | shell/TLA |
| M5 | **Refinement of the journal model into the catalog model** (the catalog's abstract CAS *is* the journal) | "so the two proofs compose instead of overlapping" | ticket 012:28-30 | **MISSING** | pre-registered: prophecy variables at non-monotone checks; EPR test; Lamport meter | TLA |
| M6 | **Ledger edits owed at merge** (R3 claim sentence + Gen bounds; four→five variants; FINDING-BRIDGE-001 disposition) | "Proposed on the PROVER/HARDENER branches, not yet made" | GH **issue #12** "Operator decisions owed"; `.../external-review-findings.md:440-449` | **MISSING** | operator-owned | docs |

---

# (a) Dependency graph among the missing structures

```
                       ┌──────────────────────────────────────────┐
                       │ E7  owned canonical encoding (ticket 004) │  ← the declared critical path
                       │     + E6 normalize + E8 cycle rule        │
                       └───────────────┬──────────────────────────┘
                                       │
           ┌───────────────┬───────────┼──────────────┬─────────────────┐
           ▼               ▼           ▼              ▼                 ▼
    E4 closure law    E5 certify()  J1 certificate  I1 flb.scale.v0   K10 flb.workflow.v0
           │               │          (ticket 005)   (ticket 016)      (ticket 008)
           ▼               ▼                              │                 │
    E1 per-hole estate-D1 refusal record ──┐              ▼                 ▼
    tree automaton   (flb.certification) │        I2 formal context   concierge lifts
           │               │             │        I3 DG basis         to programs
     ┌─────┼──────┐        ▼             │        I5 exploration jrnl
     ▼     ▼      ▼ estate-D2 sort split │                │
   E2    E3    G5 frontier   │           │                │
 emptiness subsumes  refs    ▼           │                │
     │     │      ▲ estate-D3/D4 corpus ─┼────────────────┘
     │     │      │         │            │
     │     │      │    ┌────┼────┬───────┴────────┐
     │     │      │    ▼    ▼    ▼                ▼
     │     │      │  C17 estate-D5 C2 CRDT   H1/H2/H3 MAT
     │     │      │ hardness regr  federation  (H2 also needs I3)
     │     │      │  map    differ   ▲
     │     │      │                  │
     │     │      │            ┌─────┴─────┐
     │     │      │            │ C1 semilattice laws │ ← gates every federation claim
     │     │      │            └─────┬─────┘
     │     │      │                  │
     │     │      └──────────────┐   ▼
     │     │                     │  G1 catalog query fold ──┬──► G3 type.get / G4 matcher
     │     │                     │      (+ G2 StepSpec)     ├──► G6 provenance fold
     │     │                     │            │             ├──► G7 derived-attr context (→ I2)
     │     │                     │            │             └──► L14 MCP completion
     │     │                     └────────────┘
     │     │
     │     └──► [SES] B10 grammar-bump replay safety
     │
     ▼
  E10 Merkle node annotation ──┬──► F5 structural diff
                               ├──► F3 rebase engine
                               └──► exact-subtree search (G4)

  A11 session journal ──┬──► F1 session fold ──► F2 branch ──► F3 rebase ──► F5 diff
  (+A12 expectedHead)   ├──► F8 auditor re-derivation (needs E6)
                        ├──► G6 provenance fold
                        └──► F10 retention policy

  A7 journal model gate (012) ──┬──► B3 journaled Done (017)
                                ├──► A8 split-CAS R4
                                └──► B4 register store (019) ──► B3 emission

  A4 batch/transactional writ ──┬──► J11 JournalMessageStorage (full conformance)
   [PARKED, needs ratification] ├──► A12 session move+append atomicity
                                └──► B3 Done-append atomicity (017's core question)

  A1 Merkle/MMR ──┬──► A2 non-inclusion proofs (retires the absence-has-no-proof limitation)
                  └──► A3 checkpoint+witness (retires split-view equivocation)

  J3 transition certificates ──► upgrades BOTH catalog R4 and effector R4 (the estate-of-safety candidate)
  J4 linearizability histories ──► composes with J3 into "the full conformance story" (ticket 023)

  C9 runCommitted ──► C11 foldMetric ──► C10 replay/branchAt ──► J10 FoldlabTracer
  C13 (a real consumer) is satisfied by ANY of: J11, G1, A11, C11
  C12 Go fold twin ──► cross-language fold wall (ADR-0001)
```

**Three roots with no prerequisites** (buildable today): **C1** (semilattice
laws), **estate-D1 + estate-D2** (refusal record + sort split), **A11**
(session journal). **One
root is blocked on a human decision, not a build**: **A4** (transactional writ
scope — FINDING-WRIT-001 disposition). **One root is the declared critical path
and gates the largest subtree**: **E7** (ticket 004).

---

# (b) Top-5 build-first ranking

*(Predates FINDING-FRONTIER-001 — see the ranking note at the head of this
document. Entry 3 is superseded on its per-hole premise and survives on its
emptiness half.)*

**1. estate-D1 + estate-D2 — persist refusals as
`flb.certification.v0 {Certified | Refused}`
with a required `catalog_head`, and mark the structural/absence sort on the nine
kinds.**
Two small artifacts (one record kind, one enum field, one append call) that
discharge issue #18, unblock estate-D3–estate-D6, C17, C2, H1–H4 and
ticket 015's entire
teaching loop; the corpus dossier names it "the single highest-leverage unbuilt
thing in this dossier's scope," and issue #18 notes the corpus "can be born with
the sort split already correct" only if the split lands **first**. No new proof
machinery — append-only is shipped, W7 already emits every field the corpus
needs.

**2. C1 — generate `combine` commutativity and idempotence laws in
`makeFoldLawSuite`, declared per algebra.**
Pure TypeScript, ~two law generators, and it is the *gate* on every federation
claim in the corpus: refusal-corpus CRDT (C2), catalog query-fold
order-independence (G1), pattern-structure meets (I8), Swoosh ICAR walls (I9),
and CONTEXT.md's "evidence federates." Issue #20 already specifies the
obligation, the licensing doctrine (ADR-0010), and the discriminating test case
(LWW union must **fail** it). Today five of seven declared primitives are
semilattice-lawful by inspection only.

**3. E1 + E2 — derive per-hole legality from the grammar (tree automaton +
emptiness) and delete `frontierChoices`'s constant table.**
Issue #19 shows `buildFrontier` hands every hole the same twelve templates, so C4
("every advertised fill is accepted") holds only because the fixture is shallow —
the guide itself proposes dead ends. Fixing it makes C3/C4 honest, discharges
ticket 003's three ratified laws (none of which appears in any source file
today), and unlocks E3 subsumption, G5 frontier refs, and the only credible route
to H2's equivalence query. The proof obligation is already written as ticket
009's climb 2 at R1.

**4. G1 + G2 + G3 — the catalog query fold (`setUnion` ⊗ `structureMatches`),
keyed `(query digest, catalog head)`, plus `type.get`.**
One `StepSpec` op, one request kind, zero new substrate — and it gives the fold
tower a second real cross-process consumer, which is the deletion risk external
review C6 and the dossier's §4 both name as existential ("if ticket 020 does not
land, P1/P2/P8 are deletion candidates"). It retires the lexicographic-16
placeholder, and feeds G6 provenance, G7 the free FCA context that lowers ticket
016's budget before 016 begins, and L14 MCP completion. Obligations U2 (R0
per-row re-derivation + R1 set completeness) are already specced.

**5. A11 + A12 — the session journal (`flb.session.v0`, reserved name prefix,
four request kinds, `expectedHead` precondition).**
Reuses the shipped journal, entity collector and fold cache; it is journal-adapter
#3 and makes ADR-0005 concrete for authoring traffic. It converts the private TS
transcript into evidence, and unlocks resume/branch/rebase/diff (F1–F5),
provenance (G6), and the auditor re-derivation that makes "a session cannot lie
about which type it produced" checkable. Gate is pre-written: U3 R0 per-step
fixture plus the L2 kernel-witness property, with a named negative control (a
memoizing frontier must fail).

**Runners-up, and why they lost:** **E10** (Merkle node annotation) is cheap and
unlocks diff/rebase/subtree-search, but it is only useful once A11 exists. **A4**
(transactional writ) blocks the *ratified* first slice J11 and is arguably #1 by
leverage — but it is parked on an operator disposition, not a build. **A1/A2**
(MMR + non-inclusion proofs) would retire two of VERIFICATION.md's standing
limitations at once, but no rung is specced for them and the corpus is explicit
that the linear chain stays the pinned identity. **E7** (ticket 004) gates the
largest subtree and is the declared critical path — it is excluded from this
ranking only because it is a grilling ticket whose field-level spec is still
owed, not a build item that could start tomorrow.
