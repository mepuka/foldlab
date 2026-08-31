# SPECS — the spec ledger and decision record

Status: archival law, operator-ordered 2026-08-29 ("these are now
archival-grade documents and we must stay organized … they are specs
and I want to track the decisions I made and why").

Every `.md` the estate builds from is categorized here, tracked in
git, and referenced from the AGENTS.md of the domain it governs.
`.staging` `.md` files (to depth 3) are tracked; corpora, caches,
clones, and `node_modules` stay local (see `.gitignore`).

**Maintenance law.** A new spec lands with a row here and a pointer in
its domain's AGENTS.md, in the same change. A ruling made in-session
lands in the Decision record below (or the owning spec's ruling
queue) before the session ends. A superseded spec is marked, never
deleted.

## Category 1 — Ratified law (binding; changes are versioning events)

| Spec | Domain | Carries |
|---|---|---|
| [library/cas/EFFECTS-BACKEND.md](../library/cas/EFFECTS-BACKEND.md) | store language | R1–R15: reference handler owns meaning, word equality, direction law, programs-are-content, acquisition loop, gates carry all trust |
| [library/cas/SCHEMA-MATERIALIZATION.md](../library/cas/SCHEMA-MATERIALIZATION.md) | schema plane | S1–S5 stipulations; the 33-item ruling queue (the live queue of undecided asks) |
| [.staging/operational-structure/REIFICATION-SUBSTRATE.md](../.staging/operational-structure/REIFICATION-SUBSTRATE.md) | Sorts/Kinds/Lang | Ratified "proceed apace" 2026-08-29: P0–P8 ruling asks, growth order G0–G8 (G0–G4 landed; rows 14/15 landed via G3) |
| [.staging/product-sphere/VISION.md](../.staging/product-sphere/VISION.md) | product | The grilled product thesis: one task, dual output, prose/Linear/work-as-content pillars, critical path |
| [docs/entity-store/RULINGS.md](entity-store/RULINGS.md) | entity store | The entity-store ruling series (prior era, still binding where cited) |
| [docs/lab-core/TOOLS.md](lab-core/TOOLS.md) | tool trust | Tool register: admissions and trust statements |
| [CHARTER.md](../CHARTER.md) | lab | Thesis, tower, principles P1–P4, roadmap |
| [CONTEXT-MAP.md](../CONTEXT-MAP.md) | vocabulary | Which context owns which vocabulary |
| [docs/effect-typescript-semantics/CLAIM-GATES.md](effect-typescript-semantics/CLAIM-GATES.md) | claims | Claim ladder G0–G6 |
| [docs/effect-typescript-semantics/IMPLEMENTATION-PLAN.md](effect-typescript-semantics/IMPLEMENTATION-PLAN.md) | effect semantics | Lane implementation plan |
| [docs/lab-core/KINDS.md](lab-core/KINDS.md) | artifact kinds | Artifact-kind ledger |
| [docs/DEVELOPMENT-INVARIANTS.md](DEVELOPMENT-INVARIANTS.md) | formal core | Code invariants I-001–I-005 |
| [library/machine/MACHINE-ALGEBRA.md](../library/machine/MACHINE-ALGEBRA.md) | machine algebra | The machine-algebra spec |
| [library/effects/IMPLEMENTATION-PLAN.md](../library/effects/IMPLEMENTATION-PLAN.md) | effects host | Effects library implementation plan |
| [experiments/lift-harness/docs/differential-testing-spec.md](../experiments/lift-harness/docs/differential-testing-spec.md) | lift harness | R1–R12 differential-testing rulings (landed 7d8dda24) |
| [library/effects/VOCABULARY.md](../library/effects/VOCABULARY.md) | word law | The ratified CLI/API register: everyday vs protocol; consumer-gated term entry |
| [library/effects/PROFILE-CAS-HTTP-0.md](../library/effects/PROFILE-CAS-HTTP-0.md) | byte plane | The cas-http/0 wire profile (§6 /control/missing, §7 roots publication; §14 co-tenancy, added additively at /0 by decision 32(c)) |
| [library/effects/BACKEND.md](../library/effects/BACKEND.md) | store backends | The backend seam law (ByteReader/ByteWriter/RootStore; invariants above the seam) |
| [library/cas/REGISTRY.md](../library/cas/REGISTRY.md) | kind registry | GENERATED human registry (projection of Cas.Grammar.manifestV0; byte-gated) |
| [library/cas/UNION-DESIGN.md](../library/cas/UNION-DESIGN.md) | union semantics | The ratified union design (order is identity; mode is identity) |
| [library/effects/PACKAGING.md](../library/effects/PACKAGING.md) | distribution | Operating record of implemented, gated state (2026-08-29, decision 26 seat 2): publish-capable-not-published posture, the exhaustive flip list, the effectProvenance field, the repo+bun+mise bar implemented, the Windows honesty list (T7 retired `a5fb51a9`, not rebuilt) |
| [library/effects/SERVING.md](../library/effects/SERVING.md) | serving plane | Operational law, PROMOTED to Category 1 and moved out of `docs/lab-core/` by decision 32(b) (landed under decision 26 seat 1, 2026-08-29): the two hosts (`cas serve` stdio, `cas daemon` HTTP — both planes one port), per-transport ServePolicy rulings, the daemon's front door (Origin/Host, refuse-first credentials), the stated protocol ceiling (2025-11-25 pin; 2026-07-28 corroborated against the spec changelog and OWED), telemetry + the hoover log-field vocabulary, crash/shutdown semantics, litestream sidecar. Wire authority stays PROFILE-CAS-HTTP-0.md |
| [library/effects/RELEASING.md](../library/effects/RELEASING.md) | releases | Operating procedure (2026-08-29): the seven-step gate sequence a release runs, check:ci-on-fresh-clone as the floor; steps 6–7 fire only on operator order |
| [.staging/operational-structure/GRILLING-DOCKET-2026-08-29.md](../.staging/operational-structure/GRILLING-DOCKET-2026-08-29.md) | cross-spec rulings | The ratified grilling docket (decision 28, "agreed on all counts"): Tier-1 rulings, Tier-2 postures, the proof-grill batch, the language ranking; strikeout ledger of asks answered by landed work |

## Category 2 — Pre-grade designs (grilled or awaiting grill; build only what a ruling has released)

| Spec | Lane | State |
|---|---|---|
| [.staging/operational-structure/DESIGN.md](../.staging/operational-structure/DESIGN.md) | selective/λ• formalization | Landed theory; L-A "exact" claim corrected (over-approximation witnessed) |
| [.staging/operational-structure/PLAIN-LANGUAGE.md](../.staging/operational-structure/PLAIN-LANGUAGE.md) | semantics → prose | GO AHEAD 2026-08-29; E3 slice dispatched; 8 ruling asks open |
| [.staging/operational-structure/INGESTION-HARNESS.md](../.staging/operational-structure/INGESTION-HARNESS.md) | TS ingestion harness | Scout report; items 10/11/12 + variants ruled 2026-08-29, lanes dispatched; remaining grill items open |
| [.staging/operational-structure/LANGUAGE-POLICE.md](../.staging/operational-structure/LANGUAGE-POLICE.md) | reflexive tooling | GO AHEAD 2026-08-29; scope grown to bootstrap semantics (see Decision record); 9 ruling asks open |
| [.staging/schema-materialization/ADMISSION-MAP.md](../.staging/schema-materialization/ADMISSION-MAP.md) | ACC-1 | Being mechanized as an emitted, byte-gated artifact ("get the variants in", 2026-08-29) |
| [.staging/schema-materialization/DERIVING-DESIGN.md](../.staging/schema-materialization/DERIVING-DESIGN.md) | deriving handlers | Landed design record |
| [.staging/schema-materialization/JIT-SUBSTRATE-SURVEY.md](../.staging/schema-materialization/JIT-SUBSTRATE-SURVEY.md) | JIT/staging | Survey; carries the measured kernel walls (B13 string-reduction ~2k chars) |
| [.staging/schema-materialization/TOOLS-DX-REVIEW.md](../.staging/schema-materialization/TOOLS-DX-REVIEW.md) | tools DX | Review record behind the Gate.lean consolidation |
| [.staging/schema-materialization/SALVAGE-DOSSIER.md](../.staging/schema-materialization/SALVAGE-DOSSIER.md) | old-era salvage | The 17 attic tags + 23-item grill list |
| [.staging/libfree/dsl-proposal.md](../.staging/libfree/dsl-proposal.md) | libfree/DSL | "Proceed cautiously" 2026-08-29; D1 ruled Option A; D2–D10 await the second grill |
| [.staging/treesitter/MATERIALIZER-LANE.md](../.staging/treesitter/MATERIALIZER-LANE.md) | grammar materializer | Union half unblocked (landed); recursion half (Suspend/Reference, GROW C6) stands |
| [.staging/verbal-register/REGISTER.md](../.staging/verbal-register/REGISTER.md) | verbal register | DO-NOT-RATIFY-AS-WRITTEN (PLAIN-LANGUAGE.md verdict): wrong plane; regenerate over `Ast` with witnesses |
| [.staging/operational-structure/BOOTSTRAP.md](../.staging/operational-structure/BOOTSTRAP.md) | bootstrap semantics | Pre-grade design (2026-08-29): env ledger, AGENTS-as-projection gates, MCP setup story; 9 ruling asks; honest limit — "Lean owns the descriptions; mise owns the execution; the doctor for the Lean plane is not Lean" |
| [.staging/operational-structure/D1-OPTION-A-SCOPING.md](../.staging/operational-structure/D1-OPTION-A-SCOPING.md) | grammar pin | Scoping report (2026-08-29): Option A's premise refuted — pin is upstream HEAD; D1b discovered (Schema.ts unparseable at any pin under tree-sitter); A′ fork recipe + 6 re-ruling asks. Superseded in urgency by ruling 13 — OXC is the capability instrument; tree-sitter defects gate only the tree-sitter legs. Census run (2026-08-29) measured the variance-annotations stratum EMPTY (192 of 140,583 corpus decls, ~0 in the stratum's own projects) — the D1 evidence stratum cannot supply evidence as materialized |
| [.staging/operational-structure/EFFECT-AST-PLACEMENT.md](../.staging/operational-structure/EFFECT-AST-PLACEMENT.md) | program/layer carriers | Placement study (2026-08-29): seat check + corpus measurement; G6-a commissioned from it (decision 9); program half ruled to stay L-A + classification |
| [.staging/operational-structure/BUILD-SEMANTICS.md](../.staging/operational-structure/BUILD-SEMANTICS.md) | build semantics | Study (2026-08-29, decision 14): Nix/mise/Bazel mapped onto the estate; measured ≥67s recoverable per check via mise sources/outputs (BS1 slice, 9 ruling asks); verdict — no build system needed, three declarations + one already-made ruling (R10 = spawn_strategy); the address is the certificate, no signing plane |
| [.staging/operational-structure/BUILD-MODELING-AUDIT.md](../.staging/operational-structure/BUILD-MODELING-AUDIT.md) | build/speculation semantics | Deep-modeling audit (2026-08-29, saved VERBATIM per ruling 19): build time HAVE-BY-COMPOSITION; speculation OWED with SPEC-1 false-as-designed (the word pollutes) and SPEC-2 the scoped rescue; multi-runtime HAVE except the runtime memo fact (Persistable's seat); §4 proof-obligation list is the lane's ledger; MS-1 commissioned |
| [.staging/research-backlog/ml-embeddings-tooling.md](../.staging/research-backlog/ml-embeddings-tooling.md) | research backlog | Parked (no domain AGENTS.md — the ledger row is its home) |
| [.staging/research-backlog/telemetry-hoover.md](../.staging/research-backlog/telemetry-hoover.md) | telemetry/logging | Backlog research (decision 20): telemetry + logging hoovers that speak the language; the word IS the trace; Defun envelope-vs-word analysis as periodic health checking |
| [.staging/operational-structure/FRONTEND.md](../.staging/operational-structure/FRONTEND.md) | front end | Design (2026-08-29, decision 21): tier-1 read-only browser store; components-as-projections mechanics (zero new Ts forms); BYOA matrix (4 MCP clients + pi-gets-the-CLI); FE-1 emitagents commissioned-ask; 11 ruling asks incl. rc.112 and cas_word |
| [.staging/operational-structure/PAPERWORK-AND-PROJECTION-AUDIT.md](../.staging/operational-structure/PAPERWORK-AND-PROJECTION-AUDIT.md) | store semantics + hygiene | Ruling prep (2026-08-29): projection is TWO things (kind→component = emitted manifest, seat taken; value↔view = Annotation two fields short); published programs unspellable until items 22/23 + host step/cont codec; paperwork defects D1-D11 incl. the SECURITY item and the sessions convention |
| [.staging/operational-structure/BACKEND-ROBUSTNESS.md](../.staging/operational-structure/BACKEND-ROBUSTNESS.md) | server robustness | Probed sweep (2026-08-29): store crash-safe by construction (2097/2097 verified post-SIGKILL); host NOT live-safe — oversized frames silently lost, SQLite busy = whole-process stall; BS-1 slice specified; adopt-vs-build table per Rust/Go ruling; hashing centralized-as-service is a virtue, scheme identification the real gap; 6 ruling asks |
| [.staging/operational-structure/DOGFOOD.md](../.staging/operational-structure/DOGFOOD.md) | dogfooding | The wave plan (decision 24): five personalities, successive release, capability baseline, rules of engagement |
| [.staging/operational-structure/STATE-OF-MECHANIZATION.md](../.staging/operational-structure/STATE-OF-MECHANIZATION.md) | status | The proof-ladder status report (L5 rock-solid → L0 paper) with the waiting list and critical-path order; two-hour audit cadence scheduled |
| [.staging/operational-structure/CLI-AUDIT.md](../.staging/operational-structure/CLI-AUDIT.md) | CLI | Pre-dogfood audit (2026-08-29): verb matrix, freshness defects F1-F5, the E-transcript with grades — found the PHANTOM STORE (BROKEN-SILENT: an explicit --store typo silently creates a store, contradicting init-is-the-only-creator); fix lane dispatched; 5 ruling asks (cas doctor the highest-leverage) |
| [.staging/operational-structure/PROPOSED-LOGIC.md](../.staging/operational-structure/PROPOSED-LOGIC.md) | proposed theorems | The friction-proposed logic ledger (operator directive): P1-P6 from the CLI lane, P1-P4 from the brain stem, house hazard notes — all PROPOSED, awaiting the grill |
| [.staging/ornamentation/ORNAMENTATION.md](../.staging/ornamentation/ORNAMENTATION.md) | front-end ornamentation | Design-and-aesthetics review (decisions 29/33): trust as the design material — four marks, saturation spent only on doubt; the Codex synthesis assessed element-by-element |
| [.staging/ornamentation/PROOF-OBLIGATIONS.md](../.staging/ornamentation/PROOF-OBLIGATIONS.md) | front-end proofs | 12 graded front-end obligations (FE-O1..): Ts.Decl arrow-arm ruling ask, wf_prefix, Style/R6 discharge, tier-0 gate reuse, tag trichotomy; docket-consistent |
| [.staging/ornamentation/WASM-CANVAS.md](../.staging/ornamentation/WASM-CANVAS.md) | canvas stack | Decision 31(e) research: DOM-first position, WebGL2 the escalation of record, Rust-WASM UI refused (a11y + second-emitter cost); WASM belongs in the store not the renderer; falsifiable trigger + three owed measurements |
| [.staging/operational-structure/AUTH-AUDIT.md](../.staging/operational-structure/AUTH-AUDIT.md) | auth posture | Decision 31(c) full technical audit: two BROKEN-SILENT (unreadable config serves gated store open; --allow-host transitively grants origin write trust) — both routed to the daemon fix pass; secrets CLEAN across full history (23,466 objects); rotation of the non-expiring Turso RW token URGENT (operator) |
| [.staging/research-backlog/agent-streaming-integrations.md](../.staging/research-backlog/agent-streaming-integrations.md) | streaming/integrations | Decision 31(a) research: pi dev studied (8 ranked borrows — telemetry vocabulary as emitted artifact first); protocol landscape; the sketch — since(n) beats every surveyed resumption mechanism, cas_word lands pull-first, push is additive into §13's advisory plane, never /mcp; extension = manifest row not plugin API; 9 refusals; 11 ruling asks |
| [.staging/research-backlog/MULTICA-DAEMON-STREAMING.md](../.staging/research-backlog/MULTICA-DAEMON-STREAMING.md) | streaming/daemon harness | G0 pinned implementation recovery (2026-08-31): Multica daemon control socket, local agent adapters, liveness, buffering, disconnect, task-claim uncertainty, configuration repair, transcript and auxiliary-state durability, 20-entry robustness register, and 9 pre-grade Foldlab asks; not ratified or dispatched |
| [.staging/model-guided-development/SOURCE-STUDY.md](../.staging/model-guided-development/SOURCE-STUDY.md) | model scout | Staged strategy + source study (2026-08-30): the model-scout decision, eight operating strategies, source-by-source notes; 14 artifacts pinned with receipts; awaiting grill |
| [.staging/model-guided-development/IMPLEMENTATION-PLAN.md](../.staging/model-guided-development/IMPLEMENTATION-PLAN.md) | model scout | Staged coded-kernel plan (MGS-001…013): event-sourced evidence kernel, 12 required laws, milestones M0–M6, 24-packet evaluation, 20% adoption bar; ratification stops explicit; awaiting grill |
| [.staging/model-guided-development/LOOP.md](../.staging/model-guided-development/LOOP.md) | model scout | OPERATIONAL 2026-08-30 (operator: CAS APIs not ready — run the loop by hand): the ten-step scout run as agent procedure; third role beside breaker/implementer; run-ledger duty is the measurement apparatus |
| [.staging/model-guided-development/BANK.md](../.staging/model-guided-development/BANK.md) | model scout | OPERATIONAL 2026-08-30: outcome-bank + blinded-benchmark data law over tracked markdown (depth-3 ruling honored); nine families seeded from the archived conformance registry's own vocabulary; 10 counterexamples, 8 patterns, 36 mined bench cases |
| [.staging/model-guided-development/ANNOTATE.md](../.staging/model-guided-development/ANNOTATE.md) | model scout | OPERATIONAL 2026-08-30: gpt-5.6-luna harness law (read-only sandbox, schema-constrained, receipted; canonical script embedded); first live run receipted; scout-annotator ROLE EXTENSION row landed in TOOLS.md same day (ratifies at commit) |
| [.staging/model-guided-development/GRILL.md](../.staging/model-guided-development/GRILL.md) | model scout | Vocabulary grill record (2026-08-30, operator go-ahead): nine family names confirmed as registry reuse (Registry.lean #guard); `constructors`→`templates` renamed lane-wide; checker-naming rule added; minting manifest for promotion; SOURCE-STUDY/IMPLEMENTATION-PLAN ratification explicitly not covered |
| [.staging/frontend-trunk/COLUMNS.md](../.staging/frontend-trunk/COLUMNS.md) | front end | Trunk column orientation (2026-08-30): columnBy/column/unregistered algebra (partition operator = algebra, classifier = the view's; sorts view privileged by ofTag_wireTag); the naming homomorphism (free monoid over grammar identifiers, dot concatenation) + full 11-column inventory persisted, emitted as `names.json` (alias discipline: semantic names alias derived strings, never replace); two-audience positioning statement (boundary law: the effects correspondence is BUILT, joint = defunctionalized code points); 4 ruling asks (entry.agent, git refinement, fixed column order, hypotenuse-by-height) |
| [.staging/frontend-trunk/GEOMETRY.md](../.staging/frontend-trunk/GEOMETRY.md) | front end | Trunk layout algebra + derivation programme (2026-08-30): two regimes (absolute = monotone fold, positions immutable; normalized = pure function of a cut) under the shared law "motion only at named cuts"; DOI/recency-compression as formulas; squares ruled presence marks (Cleveland–McGill/Stevens); replay-driven layout studies (the word is the laboratory); 12-row prior-art survey pin-PENDING (Draco flagship — constraint-checked view specs harmonize with the datalog direction); ruling asks G1–G4 |
| [.staging/frontend-trunk/JUDGE.md](../.staging/frontend-trunk/JUDGE.md) | front end | The semantic judge (2026-08-30): human meaning functionalized as frozen, receipted LLM judgments over the derived names — an UNINTERPRETED function like H, empty trust contribution, judge-hypothesis lattice parallel to the hash lattice; "functor" earned at Level 2 (Compositional = Frege's principle of the judge → accepted structures form a subalgebra; blame bisection; ladder renumbered by decision 38 — L1 STABLE defined in JudgeRate, L3 LIMIT-STABLE a registered debt); panels (aggregator decides Level-2 survival); anti-smuggling law + judge-pin schema; the fold law (thesis-candidate sentence); Lean face `Cas/Llm/Judge.lean` (the `CasLlm` lib); ruling asks J1–J7 |
| [.staging/frontend-trunk/RESEARCH.md](../.staging/frontend-trunk/RESEARCH.md) | front end | The concordance (2026-08-30, four reader briefs): the circle drawn — CRDTLog→store algebra→naming→judge→Gregory–Prest (interpretation functors: folds are an IFF, recovery "hidden but not lost", isolating pairs)→Xiong LRH (FCA in embedding space; cheap panel ≈75–83% of expensive judge)→Asperti et al. (error landscapes, codomain critique, de Bruijn 5–10, pass@k=union); aggregator theorem corroborated 3 independent ways; lattice re-rank RULED (decision 38); theorem backlog T-J1..7 (RUN-003 material); decidability boundary RULED (decision 39); anti-smuggling scores per paper; adopt/refuse vocabulary; 4 receipts (2 local-pinned, 2 pending copies); J10 open |
| [.staging/frontend-trunk/STANDUP.md](../.staging/frontend-trunk/STANDUP.md) | front end | The UI standup plan (2026-08-30, research pinned): formalize laws not arithmetic — names DONE (names.json); views land as `Word.View` (view = monoid hom from the word; run_append = incremental render; column/unregistered/height/prod inhabitants); LLM calls land as `Rewriter` (NEW kind beside untouched Judge: pipelines = andThen, `Into` = schema-forced output, `Idempotent` = canonicalizer law w/ CX-003); geometry stays TS (one engine over the six-field spec, motion only at cuts) with the measured-monoid layout law formalizable on demand; interactions arc previewed (programs are already content); asks S1–S2 |
| [.staging/research-backlog/lean-design-patterns.md](../.staging/research-backlog/lean-design-patterns.md) | design patterns | BACKLOG STUB (2026-08-30, operator order — "not now"): the house Lean-4 API-with-theorems design patterns, seeded with 12 shapes from one day's landings (uninterpreted-function+hypothesis-lattice, parameterize-don't-import, two-halves theorems, partial join w/ typed refusal, monoid-hom-as-view, closed registry+round-trip pin, decide-over-#guard, emitter+gate, structured debts, hand/derived split, refute-own-premise stops, biased-fact+earned-symmetry); companion to the scout bank's PT ledger |
| [.staging/operational-structure/LIBRARIES.md](../.staging/operational-structure/LIBRARIES.md) | packaging | The publish-shaped partition (2026-08-30, pre-migration): META adjudicated (yes for plane/artifacts, NEVER a Lean namespace — Lean.Meta collision; lib = CasMeta); the `.META.` infix for self-description artifacts only (language-plane exempt, one rename event at M4); five-lib Lean strata (CasValues→Cas→CasBackend→CasMeta + Wp/Examples) with a DECLARED, MACHINE-CHECKED dependency DAG (`strata --check`) and the no-loose-modules rule; TS mirrors the strata inside one package with lint-enforced direction; sequencing CasValues-first; asks L1–L3 |
| [.staging/operational-structure/META-OUTPUTS.md](../.staging/operational-structure/META-OUTPUTS.md) | reflexive tooling | Ledger-apparatus proposal (2026-08-30, grounded in the day's landing friction): developer-facing D1 DEBTS projection (one pane merging owed markers + 28 unbound laws + pending receipts, on structured `owed(ID)`/`discharges(ID)` markers), D2 surface diff-by-name, D3 anchor checker (C5 as lint); prover-facing A1 `slice` proof-brief extractor, A2 `mentions` inverted index (the proof-plane EDB — unifies with the Datalog direction), A3 axioms-as-gate (replaces the scratch-file ritual), A4 unbound-laws as scout targets; vacuity census + name-length budget; asks M1–M2 |
| [.staging/operational-structure/LEAN-AGENT-SURFACE-PASS-A.md](../.staging/operational-structure/LEAN-AGENT-SURFACE-PASS-A.md) | Lean agent surface | Staged Pass A implementation plan (2026-08-31): domain-contract docket, positive and rejected cases, semantic-level decisions, provisional declaration DAG, prior-art and correctness investigations, obligation ledger, Pass A work packages, and Pass B handoff; awaiting grill, no implementation authorized |
| [.staging/algebraic-review/store-crdt.md](../.staging/algebraic-review/store-crdt.md) | store algebra | Staged direction (2026-08-30): the store's persistent state shown CRDT-by-construction (grow-only, no removal — the CRDTLog paper's hard case unconstructible; paper receipt pinned local, upstream pending); free Datalog reading (CALM; semi-naive deltas; no deletion ⇒ no DRed) + the rules-as-spec API emission direction; both ruling asks RULED same day (decisions 34/35); RUN-002 scout handoff EXECUTED and its T1–T3 core LANDED kernel-checked in `Cas/IR/Join.lean` same day (join realized by word append — no `Store.join` sort; `Compatible`/`Sub` minted as defs, CONTEXT drafts staged; axiom ceiling propext+Quot.sound); T5/T6 remain proposed |
| [.staging/effect-core-v1/README.md](../.staging/effect-core-v1/README.md) | Effect Core v1 | Human packet index and exact pre-grade status; no cutover or promoted semantic claim |
| [.staging/effect-core-v1/PLAN.md](../.staging/effect-core-v1/PLAN.md) | Effect Core v1 programme | Closed-alphabet scope, operator-set representation constraints, literature roles, ordered proof-bearing slices |
| [.staging/effect-core-v1/EXISTING-TYPES.md](../.staging/effect-core-v1/EXISTING-TYPES.md) | Effect Core v1 reuse | Existing Lean/Effect declarations annotated as reuse, restriction, bridge, embedding, separate calculus, target-only, or proposed-new |
| [.staging/effect-core-v1/ALGEBRA.md](../.staging/effect-core-v1/ALGEBRA.md) | Effect Core v1 semantics | Proposed graph, direct-handler, machine, relational/fixed-decision/finite-observation, cause, and target algebra over existing carriers |
| [.staging/effect-core-v1/CLASSIFICATION.md](../.staging/effect-core-v1/CLASSIFICATION.md) | Effect Core v1 analysis | Independent D0–D14 abstract domains, concretizations, transfer obligations, precision boundaries, and PProg anchors |
| [.staging/effect-core-v1/CONTRACT-PACKET.md](../.staging/effect-core-v1/CONTRACT-PACKET.md) | Effect Core v1 breaker contract | Quantified clauses, frames, decreases, falsifiers, and refusal/frontier/nondeterminism boundaries |
| [.staging/effect-core-v1/PROOF-DAG.md](../.staging/effect-core-v1/PROOF-DAG.md) | Effect Core v1 proofs | Proposed declaration/theorem graph, existing anchors, contradicted-row amendments, and slice closure order |
| [.staging/effect-core-v1/REIFICATION-CHECKLIST.md](../.staging/effect-core-v1/REIFICATION-CHECKLIST.md) | Effect Core v1 source/target closure | Recursive public-surface, raw TypeScript type, per-profile proof closure, closed target grammar, and exact Effect TS7 file-set gates |
| [.staging/effect-core-v1/EXHIBITS-REVIEW.md](../.staging/effect-core-v1/EXHIBITS-REVIEW.md) | Effect Core v1 exhibits | Applicability limits for staged Lean probes; refusal ownership and relational nondeterminism ruling |
| [.staging/effect-core-v1/COUNTEREXAMPLES.md](../.staging/effect-core-v1/COUNTEREXAMPLES.md) | Effect Core v1 counterexamples | Central stable-ID register separating counterexamples, falsifiers, negative fixtures, mutants, boundary witnesses, and evidence states |
| [.staging/effect-core-v1/TYPE-CLOSURE.md](../.staging/effect-core-v1/TYPE-CLOSURE.md) | Effect Core v1 cutover | Per-type proof-edge schema and mechanical full-cutover refusal predicate |
| [.staging/effect-core-v1/ORGANIZATION.md](../.staging/effect-core-v1/ORGANIZATION.md) | Effect Core v1 continuity | AGENTS ownership, authored/generated split, manifests, resume protocol, and context-loss gates |
| [.staging/effect-core-v1/WORKSHOP-RESULTS.md](../.staging/effect-core-v1/WORKSHOP-RESULTS.md) | Effect Core v1 workshop | Exact local probe commands, theorem anchors, source-census measurements, and explicit evidence limits |
| [library/effect-protocol/README.md](../library/effect-protocol/README.md) | language-neutral effect protocol | Scaffold boundary: portable identities, bytes, profiles, and vectors; no manifest or semantic declaration yet |
| [formal/effect-core-v1/README.md](../formal/effect-core-v1/README.md) | Effect Core v1 Lean package | Empty module sweep reserving proof-owned categories; no semantic declaration or closure claim |
| [experiments/effect-core-surface/README.md](../experiments/effect-core-surface/README.md) | Effect TypeScript profile instrument | Empty source-census, adapter, and exact-file-set language-service scaffold; no semantic trust |

## Category 3 — Era records (archival; read for provenance, not authority)

| Set | What it is |
|---|---|
| [.staging/paper-notes/](../.staging/paper-notes/) | The five-seats pre/post-reads of Paper + workbench requirements + API contract (S5's origin) |
| [.staging/explore/](../.staging/explore/) | 2026-08-2x exploration era: language-design case studies, spine design, verified-SHA survey, itrees, curriculum |
| [.staging/e1/](../.staging/e1/) | First-era hash/spec drafts and recovered docs |
| [.staging/scouts/](../.staging/scouts/), [.staging/reviews/](../.staging/reviews/) | 2026-08-25 scout waves and assurance review |
| [.staging/fixture-gen/DECISIONS.md](../.staging/fixture-gen/DECISIONS.md), [DESIGN.md](../.staging/fixture-gen/DESIGN.md) | Fixture-generation lane decisions and design |
| [.staging/parser-experiments/*.md](../.staging/parser-experiments/) | Pre-lift-harness briefs (dslv0 chassis superseded by experiments/lift-harness) |
| [.staging/HANDOFF-2026-08-25.md](../.staging/HANDOFF-2026-08-25.md) | The 2026-08-25 session handoff (rescued from the depth-1 gitignore hole, D2) |
| [.staging/sessions/](../.staging/sessions/) | Session records — one pointer-shaped index per operator session (rulings, lanes, specs rowed, debts opened); the pre-content form of press 6's work-as-content |
| [docs/entity-store/](entity-store/) + [docs/research/](research/) | Prior-era working sets (audits, dispatches, research notes) — era records, one set row each |
| [experiments/lift-harness/docs/](../experiments/lift-harness/docs/) | The harness's own doc set (engine-service spec, graduation design, R11 record) — differential-testing-spec.md is the Category-1 member |

## Decision record — 2026-08-29 (the operator's rulings, with why)

Earlier rulings live in their owning specs (EFFECTS-BACKEND R1–R15,
SCHEMA-MATERIALIZATION S1–S5 + queue, entity-store RULINGS.md). This
records the 2026-08-29 session rulings that cut across specs.

1. **Product sphere ruled** (VISION.md): one task — direct an AI to
   use data + code to perform an end; Effect-TS computes, Lean
   verifies; dual output (product + OSS libraries). *Why: focus —
   the grill collapsed three product framings into one.*
2. **No new abstractions** (standing): the vision is fully possible
   with what is built; work is organization, specs, seams, backend,
   CLI+MCP. *Why: the library level is the abstraction budget,
   spent; new machinery dilutes it and delays the product.*
3. **Reification substrate ratified** ("proceed apace"): P0–P8,
   G0–G8. *Why: Sorts/Kinds/Lang are the substrate for program
   synthesis, layer generation, and context generation.*
4. **Union: order is identity**; stage-1 landed. Rows 14/15 ratified
   (G3). *Why: identity must be spellable; a reservation whose
   consumer landed is reconciliation debt.*
5. **Ingestion is priority — the Great Hoovering sequence**: place
   the wildtype-understanding estate (OXC parsing, static analysis,
   Effect program reification) BEFORE hoovering the rest of the
   Effect codebase as canonical substrate vectors. The loop: wild
   ingestion → instant plain-language prose; tagged ingestion feeds
   deep semantic registers; git → Effect program model; code →
   context-aware spec + invariant generation — guided by the
   recursive proving and theorem literature. *Why: the magic starts
   at ingestion scale, and unplaced tooling gums the future.*
6. **`.staging` opened**: inputs may be promoted/vendored as needed;
   spec `.md` files are tracked archival documents (this ledger).
   *Why: nothing in the harness ran on a fresh clone; archival specs
   must not live untracked.*
7. **Harness grill items 10, 11, 12: yes.** D1 goes Option A
   (grammar-pin upgrade, sequenced before the first libfree corpus
   run); the census instrument gets built; the Lift → PProg decoder
   is commissioned (puts-only domain, decoder delivers a PProg and
   stops — the direction law). **The eleven un-rowed variants get
   rows** and the admission map becomes an emitted, gated artifact.
   *Why: the Effect codebase is the language for generalized
   computation — in semantics, separation of concepts, and typing
   discipline; we return the favor by offering our tooling back.*
   **⚠ PREMISE REFUTED 2026-08-29 (same day, scoping scout —
   [D1-OPTION-A-SCOPING](../.staging/operational-structure/D1-OPTION-A-SCOPING.md)):
   there is no upstream rev to upgrade to — the pin IS upstream HEAD
   (dormant 19 months); "Option A" would mean vendoring an unmerged
   PR head (#364) via an estate fork of the binding. And D1b: a
   second, independent grammar defect leaves Schema.ts (the R8
   public surface) unparseable at ANY known pin. Option A as ruled
   does not unblock full R8. RE-RULING OWED — six asks in the
   report; census counts are grammar-rev-stamped provisional
   meanwhile.*
8. **DSL proposal: proceed cautiously.** Everyone self-aware —
   understand what and why they're building, and BLOCK fast and
   early instead of producing work that gums up the future.
9. **Effect program AST — SUPERSEDED same day** by the placement
   study
   ([EFFECT-AST-PLACEMENT](../.staging/operational-structure/EFFECT-AST-PLACEMENT.md)):
   the question was already answered by ratified law. The layer half
   IS G6 of REIFICATION-SUBSTRATE (unblocked — its blocker B-B,
   `Projection.putNode`, landed with G4); the general-program half
   is refuted by measurement (Layer vocabulary: top-5 members cover
   92% of 10k corpus sites; Effect.gen bodies: only ~35% straight-
   line — the noun is regular, the verb is not). Operator then
   **commissioned G6-a verbatim** (SystemNode described kind → 
   EmitLayer → Context-key-set differential, ~230 lines, zero new
   abstraction) and ruled the **codegen-via-MCP floor a first-class
   lane-1 priority** — the MCP host serving cas-tools.json plus the
   cas_emit_layers verb. *Why: fluent service-level composition
   generation, usable by the rest of the spectrum, is base server
   infrastructure and needs robust engineering.*
10. **Bootstrap semantics** (language-police scope growth): consider
    Lean owning ALL tooling, shipping detailed fixtures for building
    itself; config tooling + robust env awareness ship day 1. Flow:
    user sets up MCP ← detailed proven config/logging/metaprogramming
    tooling makes setup, understanding, building, and agent direction
    free. AGENTS.md declarations, skill derivations from tools, and
    pins become emitted artifacts of the police lane. *Why: build for
    a future where an LLM reads the code and interfaces on the CLI.*
11. **GO AHEAD: plain-language and language-police lanes.** First
    slices: `Envelope.toProse` (E3) and the walker promotion +
    obligations tracker (E + B1).
12. **Spec ledger law** (this document): specs categorized, tracked,
    referenced from domain AGENTS.md files; decisions recorded with
    their why. *Why: the operator's decisions are estate content —
    untracked rationale is the same defect as untracked prose.*
13. **TS-GO NATIVE / OXC IN-PROCESS** (2026-08-29 night): the estate
    is TypeScript-7-native — tsgo everywhere; classic tsc is banned
    from prod hot paths ("slow and completely unneeded anymore,
    ignore all prior warnings"). OXC in-process is the parsing
    instrument — fast TypeScript parsing with pattern matching.
    **The 100%-fidelity mandate**: grammar-defect excuses (D1/D1b's
    "Schema.ts unparseable") are rejected as claims about the
    CAPABILITY — they are facts about the tree-sitter instrument
    only; 100% fidelity to the pinned Effect fixtures from wildtype
    code ingestion is achievable and is the standard. Build the
    capability on OXC; an agent unwilling to build it is off the
    lane.
14. **Bootstrap builds cleared**: proceed with the recommended
    builds (envledger EL1 first). Tuning direction: study real
    build tools (Nix, mise); a dedicated CAS + performance tooling
    for this build-out is probably worth it, with the CRUCIAL
    determination that it has **fluent semantics for LOCAL,
    SELF-HOSTED, and CLOUD resource handling**. May fold into the
    G6/server-infra lane.
15. **Persistable — top of backlog, no bumping** (2026-08-29 night):
    Effect 4's `Persistable` (PrimaryKey + attached success/error
    Schemas; serializeExit/deserializeExit/exitSchema) is to be
    **folded into every one of the estate's TypeScript layers for
    clean semantics** when the backlog reaches it. The three keying
    regimes stack: Layer → object reference; Cache → structural
    Equal/Hash; PersistedCache → PrimaryKey string over a
    Schema-described request with a serialized Exit stored —
    structurally the Bazel digest → ActionResult mapping, a
    content-derived key with backends shipped as layers
    (Persistence.layerMemory/layerKvs/layerSql/layerSqlMultiTable/
    layerRedis; KeyValueStore.layerMemory/layerFileSystem/layerSql/
    layerStorage). *Why: "the language evolves" — Effect already
    carries the content-keyed regime the estate's semantics need;
    aligning with it beats minting one.* Relayed to the G6-a
    SystemNode lane and the build-semantics study on ruling.
16. **Code-mode MCP is the default register** (2026-08-29 night):
    the MCP lane may need a ground-up re-look — the server's primary
    register is CODE SUBMISSION with in-house DSL and TypeScript
    support; the granular tools are the floor, not the interface.
    Safe because the gates carry all trust: submitted documents pass
    the existing doors (ingest, decodeLift, admission at put, word
    equality). Defun is what turns code mode from sandbox+trust into
    admission+proof (the envelope is the pre-execution audit; the
    fragment tower is the capability ladder; encodeProg makes a
    submission its own cacheable identity).
17. **Services architecture** (2026-08-29 night): look into custom
    high-performance Rust/Go MCP/services to layer functionality and
    boost performance; SEPARATE services when possible — configurable
    and piecemeal deployable; easy self-host AND cloud setup guides
    accompany the in-house semantics. *Why: "the world is going
    cloud — we must speak cloud."*
18. **The MCP speaks our language** (2026-08-29 night, after the
    host's first slice): "good first slice BUT WE CAN DO BETTER — the
    MCP will speak our language as we will speak all languages."
    Direction: the tool register IS a signature (McpTool params and
    results are already Ast codes); tools become operations, code-
    mode plans become store-resident programs over that signature,
    and every host language's typed surface is MATERIALIZED from the
    same codes — which also closes the host lane's named
    carrier-vs-mirror gap.
19. **LLM IN THE PATH for speculative JIT builds — THE PATH**
    (2026-08-29 night, on reading the Defun audit): the audit's
    regime split is ratified in the direction of regime 2 — floating-
    output build steps summed in and oracled in `handleLlm`'s exact
    shape, trace store at Persistable. "The user supplies the LLM;
    the system builds with what they have; CAPABILITIES BECOME
    LANGUAGE." The audit
    ([BUILD-MODELING-AUDIT](../.staging/operational-structure/BUILD-MODELING-AUDIT.md))
    is saved verbatim; its §4 proof-obligation list (HD-1, HD-2,
    FRAME-1, SPEC-1 false-as-designed / SPEC-2 scoped, RESID-1,
    CUT-1, CANON-1) is CRITICAL and is the lane's ledger; MS-1 (the
    hash-determination boundary) is the commissioned first slice.
20. **The telemetry and logging hoovers** (2026-08-29 late night,
    backlog research —
    [telemetry-hoover](../.staging/research-backlog/telemetry-hoover.md)):
    hoovers that speak the language; internal introspection and a
    semantic layer; ALL agents able to look into logs and see event
    order. Research: applying Defun trace analysis (the
    envelope-against-the-word relation) for periodic health checking
    and system self-awareness. *Why: the word is already the trace;
    self-awareness is the police lane applied to the running
    estate.*
21. **The front end — semantics, aesthetics, architecture**
    (2026-08-29 late night, CRITICAL): nearing time. Four questions
    commissioned to design: local-first + browser-based operations;
    serving projections of the harness for seamless local browser
    access; seamless BRING-YOUR-OWN-AGENT integrations (Claude Code,
    Codex, pi dev, opencode, VSCode); and what the language gives for
    CONSUMER-READY no-nonsense agent setup. *Why: the substrate is
    the product; the front end is its projection — and the views
    pillar (VISION.md, Paper/Linear) was deferred behind substrate
    completeness, which tonight's stack has substantially closed.*
    **Addendum (same night): FOLDKIT is ruled the chassis.** The
    direction is server-side estate AST → front-end components —
    modular, composable, components SPEAKING the estate language:
    a described kind's canonical code determines its component the
    way it already determines its wire mirror, admission row, and
    prose (the materializer discipline extended to UI — EmitAst/
    EmitLayer/ProgProse precedents). "We speak all languages and we
    teach others to speak ours" — the component register itself a
    gated manifest, so third-party front ends learn the UI
    vocabulary the way agents learn the tool vocabulary.
22. **Backend robustness sweep + store-semantics rulings prep**
    (2026-08-29 night): commissioned. (a) Server robustness audit —
    event handling, responsiveness, liveness, transport loads
    without hangs (with telemetry), crash/restart semantics, the
    custom-daemon question, WASM integrations, and whether the
    hashing strategy is too centralized (the AddressScheme seam as
    the abstraction). (b) Ruling prep — front-end projection as a
    node type (linking tooling and published programs; connects to
    G6-a's named catalog-kind gap), where published programs go
    (roots/registry conventions; gated on queue item 23), and the
    estate-paperwork audit (files, sessions, the ledger's own
    maintenance law checked against tonight's practice). *Why:
    "let's stay organized — we've been firing at peak performance."*
    **Addendum to 17/22 (same night): PREFER well-regarded Rust/Go
    implementations for the hosting plane** — "if we can bootstrap
    from well-regarded Rust or Go implementations we should do that;
    performance, liveness, responsiveness is crucial." Adopted
    binaries are admission events (TOOLS.md rows, pins); semantics
    stay Lean-authored; the trust story is unchanged because the
    address is the certificate — a fast foreign host serving
    content-addressed bytes cannot lie. litestream (Go) is the
    standing precedent already in the estate.
23. **The backend backlog — RATIFIED as three waves** (2026-08-29
    night, operator: "RATIFIED"): Wave 1 — BS-1 (the host cannot
    stall silently; precondition for every served surface), the
    rc.112 move (closes C6, unlocks foldkit + the browser store),
    the convergent naming ruling (Annotation.subject widened to a
    union over addressable planes with typed store-content values;
    CodeRef promoted to (file StoreRef, export) while stored
    topologies number two), and the two ServePolicy fields (frame
    cap, maxInFlight). Wave 2 — cas_word; published programs (queue
    22→23, host step/cont codec, R7 stamp first); the daemon bind
    AFTER BS-1; FE-1 emitagents. Wave 3 — mise sources/outputs,
    litestream TOOLS row + lag metric, the working-tag register,
    Persistable folding, the libsql/sqld scout, the code-mode
    manifest row. Also ratified: names are annotations never
    identity; Addr32 stands (under-identified not under-sized —
    R5's cheap half only); new kinds yes (three arm-additive), new
    sorts NO — the sort registry's stillness is the discipline.
24. **The dogfood phase** (2026-08-29 night): the final stage of the
    hard build push — successive dogfood agents with defined
    personalities stress the system for REAL use, released one wave
    at a time, never all at once
    ([DOGFOOD](../.staging/operational-structure/DOGFOOD.md): the
    newcomer, the apprentice, the composer, the adversary, the
    reader). CLI audit runs first. Law: we do not panic when
    something breaks and we do not ignore hard work when it
    surfaces; BROKEN-SILENT is the only alarm category. *"Have fun,
    be proud of what you've built — let's get this thing working."*
25. **The CLI push — all five asks accepted, the bar is A** (2026-08-29
    night): cas doctor is IN (the runtime reader of the four emitted
    ledgers + full config validation, closing VOCABULARY.md's
    forward-reference); --store at a non-store REFUSES (init stays
    the only creator); kind names enter the human register off the
    generated registry; put says working tags out loud; --json on
    ALL verbs (serve exempt — stdout is the protocol). And the
    standing law: **every refusal answers at grade A — the everyday
    register, the defect named, the fix named — "we do not accept
    anything less than A-level work, period."** A non-A answer is a
    named framework blocker, never an accepted grade.
26. **Three Fable agents authorized** (2026-08-29 night, cautious,
    per-instance per the standing ceiling): focused high-value
    development, non-overlapping, for the hardest challenges where
    redesign may be needed — "no compromises, we get this system up
    no matter the cost." Seats: (1) the PRODUCTION SERVING SPINE —
    the daemon bind (cas-http/0 + MCP-over-HTTP), telemetry export,
    structured logging, crash/restart hardening: everything that
    touches LLMs and MCP proved with our lives; (2) the PRODUCTION
    PACKAGE — build, dist, publish posture, CI running check:ci on a
    fresh clone, the admission register completed: rock solid,
    production level; (3) CAS_WORD — the receipts/history spine
    (WordSig, since, the three theorems, the CLI surface): the last
    unwired critical-path semantics.
    **Addendum to 26 (same night):** (a) the cas_word seat must
    answer the WORD REGISTRY question — the word-log record and mark
    spellings are registered, gated artifacts, never ad-hoc JSON;
    where no registry surface exists for the word's carriers, the
    seat MAKES it, no excuses, with any ratification event
    documented rather than deferred. (b) MERGE PROTOCOL for the
    Fable seats: each seat's output is reviewed by TWO independent
    Opus reviewers (adversarial, non-overlapping lenses) before the
    coordinator merges — no slip in standards.
    **Second addendum to 26 (same night): Lean permission granted to
    all Fable seats** under production methods — statement triage
    first, the axiom trio, citations for every imported
    determination, ledgers regenerated, every gate green; EVIDENCE
    IS THE LICENSE: a Lean change lands with its reasons and audit
    trail or not at all. The Mcp.lean fence stands. The operator's
    words, verbatim: "the types the algebra serves — but only
    through our honesty does she grace us with expression."
27. **The new deep-engineering push** (2026-08-29 late): Fable fence
    officially lifted for the topic lanes — (a) research: continued
    development and refinement of the algebra semantics; (b) tooling
    for falsification, theorem-proven development, and code
    analysis; (c) planning for FULL ingestion of Effect code
    fixtures; (d) analysis for CAS search and self-reasoning gates;
    (e) UX/front-end open: algebra-driven front-end ORNAMENTATION
    (deep dive at .staging/ornamentation/ — dir to be created),
    data-dense but practical utility and aesthetics; (f) production
    hardening: backend FILE-HANDLING audit against reference code;
    (g) CODEGEN full push. **GATEKEEPER FIRST**: before the topic
    gates open, one agent audits every open issue and attempts to
    PROVE each is not a problem; where that cannot be done without
    error, it must FIX and prove it fixed. Temporary Lean fixtures
    and Lean scratch allowed for theorem scratch work.
28. **The grilling docket ratified whole** (2026-08-29 late, "AGREED
    ON ALL COUNTS FULL STEAM AHEAD"): every recommendation in
    [GRILLING-DOCKET-2026-08-29](../.staging/operational-structure/GRILLING-DOCKET-2026-08-29.md)
    is ruled as written. Tier 1: C6 references as proposed (address
    is the reference name); the annotation bag is STORED; RootStore-
    over-SQL answered by compare-and-set, RootStore.list
    unimplementable until then; EmitProg lowers from PProg; CANON-1
    canonicalizes at the door; D1 re-ruled NO FORK, six asks one act
    (tree-sitter defects gate only tree-sitter legs, census stamped
    provisional); annotation tag + subject arms one versioning
    event; the cas_word seat's registered word spelling wins, the
    Word.toStore non-injectivity theorem commissioned as its
    license; NAMING PUBLISHES (roots carry annotations until item
    23's index exists). Tier 2 postures, the proof-grill batch, and
    the language ranking as the docket states. Propagation of each
    ruling into its owning spec's queue rides the planning lane.
    **Protocol: one Fable writes the plan, Opus 5 hard-reviews it —
    plans cited, proofs sketched and decomposed, hard parts named.
    "These are core abstractions, no compromise."**
29. **The front end authorized** (same breath): the ornamentation
    deep dive opens at `.staging/ornamentation/` (decision 27e's
    dir) — design and aesthetics review, algebra-driven, data-dense
    but practical. Paper and the Paper MCP are TIER-ONE front-end
    inspiration — details and subtleties studied, not copied; the
    front end speaks the language. The lane names and lands the
    front-end proof obligations.
30. **The productization call**: harness and productize the
    algebraic-effect coding semantics for real developers doing
    AI-driven development. The philosophy: no compromise on the
    sanctity of rigor — and software exists to abstract complexity.
    The standing question every lane answers: where more is that
    calling met; where more is the complexity of design, language,
    and operations conquered.
31. **The integration and audit push** (2026-08-29 late, same
    sitting): (a) FIRST-CLASS AGENT-STREAMING INTEGRATIONS
    commissioned — the protocols landscape studied and a design
    sketched on the daemon/host's actual surfaces; pi dev and its
    extension system studied as tier-one harness prior art ("what
    can we borrow?"); (b) algebra expressiveness joins the plan —
    how the algebra grows MORE expressive, how the effects
    abstractions' power is SHOWN, the horizontal efforts named;
    (c) THE AUTH ORIENTATION AUDITED — full technical audit of
    every serving and secret surface against the refuse-first
    posture; (d) PLAIN-LANGUAGE PROJECTIONS ARE PRIORITY, "no
    doubt" — the lane sequences at the top of the plan; (e)
    front-end WASM research commissioned: data-dense, high-quality,
    high-fidelity performant canvas.
32. **The daemon's three releases** (2026-08-29 late, "YES.
    RELEASE"): (a) `/projections` RELEASED to the daemon — tier-0
    serving of the emitted, byte-gated artifacts is the daemon's,
    read-only; FRONTEND's static-host story updates to match;
    (b) SERVING.md PROMOTED to Category 1 and moved to
    `library/effects/` beside its siblings; (c) PROFILE-CAS-HTTP-0
    gains an additive §14 co-tenancy clause (a versioning event):
    the profile owns its three resource spaces within the
    authority, the co-tenant prefixes enumerated; the daemon's
    totality wording softens to "every unclaimed exchange."
33. **The ornament coordination** (same sitting; Codex package +
    the frontend lane): the ornament-grammar proposal stages at
    `.staging/ornamentation/` under a partitioned namespace
    (COORDINATION.md carries the partition and owners). MotifNode
    and Ornament enter as PROPOSED described kinds — the grill
    decides, under decision 23's new-kinds-yes / new-sorts-NO law.
    The image-generation service is a pre-grade design: addressed
    prompt/spec/model/version/seed/input/provenance/rights records;
    deterministic VECTOR is the only authority — raster and
    image-generation output never are. All generated visuals and
    Paper output are pre-grade conception evidence with no trust
    contribution.
    **Correction to 33 (same sitting, operator):** Claude and the
    Fable fleet DRIVE; Codex is support — guidance, research,
    investigation, proof analysis, independent overwatch — on
    bounded, non-overlapping tasks the coordinator assigns. Codex
    owns no lane and no files; the ornament synthesis and images are
    optional input, not a parallel workstream. COORDINATION.md
    rewritten to match.
34. **The name-resolution law** (2026-08-30, "I agree with both
    asks"; asked by
    [store-crdt.md](../.staging/algebraic-review/store-crdt.md)):
    name resolution is a QUERY at the read boundary — stored naming
    stays grow-only annotation nodes, nothing rebinds. The query is
    multi-valued with fail-closed ties: it surfaces ALL maximal
    claims for a name; a tie is SHOWN, never silently picked;
    single-answer surfaces present the set or refuse with a typed
    "ambiguous name" naming every claimant. A deterministic
    tiebreak may exist only as an explicitly-labeled projection of
    the multi-valued answer, never as the silent default.
    Last-writer-wins is REFUSED: no wall-clock trust in a store
    that otherwise trusts only content. Why: the 2026-08-30 audit
    found stored state monotone everywhere — the CRDT-by-
    construction reading holds — and this closes the one unpinned
    read-boundary law without touching storage. Binding on every
    future resolution surface; no current code violates it.
35. **The replication target** (same breath): the store replicates
    as what it is — objects shipped and UNIONED through the
    existing seams (`ByteReader`/`ByteWriter`/`RootStore`) against
    an S3-compatible object store; one immutable object per
    address, roots as zero-byte keys. SQLite is demoted to a
    derived local index, rebuildable from the object plane.
    Litestream stays the admitted short-term mechanism
    (single-writer); its owed Wave-3 lag metric is superseded in
    shape — replica lag becomes a missing-object SET DIFFERENCE,
    measurable per object by the read law. cr-sqlite and LiteFS
    refused: machinery for conflicts the store cannot have. Why:
    convergence by the join algebra
    ([store-crdt.md](../.staging/algebraic-review/store-crdt.md)
    T1/T3/T5) instead of by replication protocol; multi-writer
    safety by construction. Rides the robustness lane's
    adopt-vs-build table (decisions 22/23) for landing order.
36. **The judge architecture** (2026-08-30, spoken): (a) THE HUMAN
    IS THE JUDGE OF RECORD — the human's judgment is the view being
    optimized for, and the user's control is the product value;
    (b) NO MODEL-ON-MODEL FEEDBACK LOOPS — the optimization loop
    closes only through the human; model judgments never optimize
    against model judgments; (c) the operating shape is ONE LARGE
    MODEL plus FINITE small-judge panels (never unbounded), panels
    sampling their inputs from the sort lattice over the
    content-addressed store; (d) VISIBILITY RULE: every LLM
    completion is visible, with where its data came from — surfaced
    provenance, human-facing, always; (e) THE BLINDING ABSTRACTION:
    the large model must not know that material it receives derives
    from smaller models' judgments — aggregates reach it as
    provenance-ERASED data while the store keeps full provenance for
    the human. The dual discipline: the human sees all provenance;
    the large model sees none of the judgment-attribution.
    Noninterference is the owed theorem shape (the large judge's
    output well-defined through the erasure quotient); (f) small
    models enter only as PINNED SPECIFIC ARCHITECTURES per the
    judge-pin schema; (g) a WHITE-BOX NLP TIER is commissioned:
    classical, encoding-free text operations (co-occurrence,
    association, similarity — the Firth/Harris distributional
    tradition, the pinned DisCoCat paper's own concrete-model
    substrate) defined as deterministic derived views over the
    store — fully specified algorithms carrying ordinary G-grades,
    never pinned-oracle trust; they may feed panels. Why: control
    stays with the person, and loops that could self-reinforce are
    structurally cut.
37. **Anti-smuggling adopted estate-wide** (same breath; JUDGE.md
    ask J7): "meaning" appears in gated work only as a reference to
    a pinned judge instance (receipt schema in JUDGE.md), and the
    categorical bullshit test — objects instantiable as data, arrows
    as algorithms, equations checked by kernel or measurement —
    governs what may borrow mathematical authority.
38. **The judge-hypothesis lattice re-ranked** (same breath;
    RESEARCH.md ask J8, two independent literature votes): L0
    nothing; L1 STABLE (inert-variation invariance); L2
    COMPOSITIONAL; L3 LIMIT-STABLE (acceptance survives directed
    growth); L4 DISTRIBUTIONAL. Formal definitions of L1/L3 ride the
    theorem backlog (tracked as the Judge module's owed marker in
    the obligations ledger); `Judge.lean` docstrings renumbered same
    day.
39. **The decidability boundary** (same breath; RESEARCH.md ask
    J9): derived names are EMIT-ONLY; any parser of, or recursion
    on, derived names is a ruling event — the
    interpretation-from-a-free-structure template (Gregory–Prest
    Cor 4.6–4.7) is the reason.
40. **The sort event — one greenfield batch** (2026-08-30;
    store-crdt.md §"The sort event"; ruled after the operator's
    ordered vision readback — "lets stick to it, 1-4 added, done").
    FOUR sorts adopted as a single grilled batch: `annotation`
    (working tag 0x41 promoted to a ratified registry row — the
    trunk's meaning column), `query` (specs as content — the
    product's center object), `result` ({spec→query, mark, member
    edges} — materialized answers whose memoization key is the
    node's own preimage; the "index kind" naming.ts anticipates),
    `agent` (the attribution anchor on its OWN tag — a typed
    →agent edge is unspellable while the form rides `entry`'s tag).
    Riders in the same versioning event (priced by Annotation.lean's
    arm-additive ruling): the `AnnotationSubject`/`AnnotationValue.ref`
    widening to the content planes and the new sorts; the `foldlab/`
    key-family ratification (related, search-note, pref, embedding,
    tombstone — spellings at grill); column placements (agent
    near-still; query/result/annotation steady-fast). `text` (the
    CRDT run) REFUSED from the batch on VISION grounds: no logged
    vision sentence orders collaborative document editing, and the
    operator clarified same day that Paper is a design inspiration,
    not the product identity; TB-1's parameterized Lean model stays
    available sortless, and the self-referencing parent pointer
    forces the tag only if a buffer is ever commissioned. Adopted
    with the batch, the DECISION PRINCIPLE: a thing deserves a sort
    iff the algebra needs typed, admission-checked references TO it
    — a reference demands one tag. This decision SCOPES the
    no-new-abstractions stillness rather than repealing it: one
    batch, grilled once, stillness resumes. Why: the search, meaning,
    and identity planes the vision names land fail-closed on
    registry vocabulary instead of riding convention.
41. **The trunk slate — adopted whole** (2026-08-31; "I'll go with
    all recommendations"; plan of record
    `.staging/frontend-trunk/TRUNK-PLAN.md` §1, which carries the
    letter of each item): aesthetics A1–A6 (ink on paper, hue only
    on `unregistered`; family palette as deferred teaching overlay;
    sediment band over recency compression; hypotenuse as later
    chord toggle; keyboard-nav a11y in v1; address-keyed
    micro-tint); canvas CV-5/CV-6/CV-3′ (aggregation at cuts +
    Placement/place split + lastK carrier + rects-only union +
    virtualized viewport; `limit` on the seam now, `from`/`to`
    later; **v1 renders as SVG in foldkit's vdom** — one artifact is
    gate, SSR, a11y, tests, and the live view — with Canvas/WebGL
    the later Mount-admitted scale handler on measured budgets);
    query-engine QE-1..4 (derived folds where the consumer is; the
    server executes only what answers an ADDRESS; QuerySpec AST as
    the `query` payload; no query-SQL in v1; the cut law +
    poke-only off-CAS liveness as the streaming lane's entry).
    Three parallel implementation lanes cut (effects route / Lean
    minis / workbench trunk), reviewed before dispatch.
42. **QA-4 ratified + the S3a packet's two OPENs ruled** (2026-08-31,
    "yeah proceed", adopting the coordinator's recommendations).
    (a) **The patchability law is standing surface rule**: a query's
    rendered answer may be PATCHED across growth iff the query is
    monotone under append; a non-monotone answer is computed at a
    cut and carries its mark on its face (QUERIES §4, previously an
    open ask — the epoch law's licence now ruled, closing plan-review
    TP-11). (b) **OPEN-1**: a page whose `next` is BELOW the current
    mark (the truncation-repair signature) is REFUSED AND SURFACED
    ("store truncated — reset?"); the fold resets only by explicit
    user action, never silently — a backwards `next` is a repair
    event, not growth. (c) **OPEN-2**: address-syntax validity is
    DOCUMENT-BOUNDARY validation — the fold refuses the whole page
    if any address is not 64-hex, at the seam decode, one authority;
    never a per-op second opinion, and the tint ladder never meets
    NaN.
43. **Effect Core v1 commissioned as a staged, closed-alphabet lane**
    (2026-08-31; the operator ordered the plan persisted, existing
    types annotated, workshops begun, the vendored Effect surface made
    mechanically exhaustive, and full proof closure required before
    cutover). This is a versioned authored-language lane, not a repeal
    of decision 9's wild-ingestion ceiling and not ratification of the
    packet's proposed declarations. The representation economy is
    ruled for the packet: block bodies are the existing `PProg`; scoped
    children are `BlockId` data interpreted through existing
    `Handler`/`Handler.sum`/`Handler.through` into a target that can observe
    child state and failure (the scratch `ReaderT Env (Prog CasSig)` target is
    not adequate for catch/finalization); no `HHandler`, public
    `Behavior`, second straight-line carrier, duplicate CAS refusal
    kind, or second EffHOL modality is admitted. Full meaning is
    relational over typed decisions, replies, and schedules; only fixed
    choices and the deterministic CAS subfragment receive uniqueness.
    Coherence composes at `interpretRef`, because the existing
    fixed-fuel no-composition theorem rules out a `run` bind law.
    EffHOL specializes to existing `wlp`; fuel and unanswered choices
    remain frontiers outside failure/cause. Rich ordered cause topology
    stays project-owned and stock rc.112 receives an explicit lossy
    quotient. The public Effect ledger is separate from the authored
    alphabet; arbitrary closures are refused or target-only unless a
    first-order registered implementation is supplied. Exact TS7
    `@effect/tsgo` file-set coverage is mandatory hygiene evidence and
    contributes no semantic trust. Every existing/proposed/source/target
    type has a proof-closure row, and no full cutover is eligible while
    any required edge or red control is open. Counterexamples live in
    one stable-ID register and remain distinct from negative fixtures
    and mutants. AGENTS prose remains authored; volatile links, pins,
    type annotations, obligations, counterexamples, and status become
    generated companion facts only after their schemas and consumers
    are accepted. *Why: make arbitrary effect-flow work successive and
    resumable without duplicating landed semantics, losing adversarial
    evidence, or letting source-tool success masquerade as proof.*
44. **The eight evidence-backed Effect Core §17 conditions ruled; the
    cutover is one profile of a larger language-neutral interface**
    (2026-08-31; operator: "rule the eight §17 conditions that already
    have evidence ... the effects cut over should be a portion of the larger
    effectful interface but not exclusive to the lean interfaces" and "yes
    continue"). Conditions 10, 11, 15, 16, 18, 19, and 20 are adopted at
    their proved representation boundaries; condition 17 is adopted only
    for mask-selected classifier overlap, while renderer injectivity remains
    open. Thus: full-core meaning is relational and has no choice-free
    denotation function; existing refusal kinds/maps are reused with
    H-dependent writes and explicit observation masks; raw `PProg` ingress is
    partial and total injection starts at `CheckedPProg`; checking is
    fail-first with existential rejection completeness and duplicate-free
    checked rows; scoped recovery/finalization reuse existing `Handler` and
    first-order `BlockId`, but the target must preserve post-body state on
    failure (the minimum CAS witness has state outside error); `toPProg` is a
    sound canonical-image recognizer only; and Mod-E uses existing `wlp` with
    nonempty prefix and threaded history, while `wlp_append` is a new theorem
    obligation derived from shipped `wpAux_append`.

    Condition 14 remains open for the exact bridge from portable operation
    identity into existing Lean `Sig.Op`; this is not permission to replace
    `Sig`. The shared seam is a versioned language-neutral protocol whose
    manifest owns stable identities, canonical bytes, profile membership, and
    shared vectors. Lean owns admission, relational meaning, and proof; Effect
    TypeScript rc.112 is one generated adapter/profile with exact
    language-service coverage; later hosts may implement the same admitted
    rows. Proof status and runtime evidence remain sidecars and cannot change
    protocol identity.

    Development proceeds from the immutable packet baseline through a
    coordinator-owned integration worktree, with separate
    breaker/builder/reviewer worktrees.
    File stubs establish the broad category sweep, but implementation depth
    waits for per-type proof-graph closure. *Why: preserve one portable
    effectful core without making either Lean syntax or Effect TypeScript the
    universal consumer API, while keeping every cutover claim mechanically
    local.*
