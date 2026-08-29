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
| [library/effects/PROFILE-CAS-HTTP-0.md](../library/effects/PROFILE-CAS-HTTP-0.md) | byte plane | The cas-http/0 wire profile (§6 /control/missing, §7 roots publication) |
| [library/effects/BACKEND.md](../library/effects/BACKEND.md) | store backends | The backend seam law (ByteReader/ByteWriter/RootStore; invariants above the seam) |
| [library/cas/REGISTRY.md](../library/cas/REGISTRY.md) | kind registry | GENERATED human registry (projection of Cas.Grammar.manifestV0; byte-gated) |
| [library/cas/UNION-DESIGN.md](../library/cas/UNION-DESIGN.md) | union semantics | The ratified union design (order is identity; mode is identity) |

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
