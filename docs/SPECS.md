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
| [.staging/operational-structure/D1-OPTION-A-SCOPING.md](../.staging/operational-structure/D1-OPTION-A-SCOPING.md) | grammar pin | Scoping report (2026-08-29): Option A's premise refuted — pin is upstream HEAD; D1b discovered (Schema.ts unparseable at any pin); A′ fork recipe + 6 re-ruling asks |
| [.staging/research-backlog/ml-embeddings-tooling.md](../.staging/research-backlog/ml-embeddings-tooling.md) | research backlog | Parked (no domain AGENTS.md — the ledger row is its home) |

## Category 3 — Era records (archival; read for provenance, not authority)

| Set | What it is |
|---|---|
| [.staging/paper-notes/](../.staging/paper-notes/) | The five-seats pre/post-reads of Paper + workbench requirements + API contract (S5's origin) |
| [.staging/explore/](../.staging/explore/) | 2026-08-2x exploration era: language-design case studies, spine design, verified-SHA survey, itrees, curriculum |
| [.staging/e1/](../.staging/e1/) | First-era hash/spec drafts and recovered docs |
| [.staging/scouts/](../.staging/scouts/), [.staging/reviews/](../.staging/reviews/) | 2026-08-25 scout waves and assurance review |
| [.staging/fixture-gen/DECISIONS.md](../.staging/fixture-gen/DECISIONS.md), [DESIGN.md](../.staging/fixture-gen/DESIGN.md) | Fixture-generation lane decisions and design |
| [.staging/parser-experiments/*.md](../.staging/parser-experiments/) | Pre-lift-harness briefs (dslv0 chassis superseded by experiments/lift-harness) |

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
9. **Effect program AST — inclined** ("may as well build"): Effect
   program and Layer construction semantics are regular enough; at
   minimum it is a CODEGEN-via-MCP workflow, one of the estate's
   most powerful language expressions. Design first, not minted yet.
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
