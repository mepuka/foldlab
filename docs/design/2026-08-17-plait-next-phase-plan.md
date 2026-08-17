# Plait — the model-completion slice and the parallel fan-out

Status: **RATIFIED 2026-08-17** — the operator ruled all thirteen §E grill
items on their recommended options ("I'll go with recommendations for
now. Lets start running and we shouldnt stop until M3 is complete."),
with the standing directive that execution runs continuously until wave
M3 merges. Every recommendation is priced with alternatives; nothing
previously ratified was reopened.

**The operator's charge, restated:** scope the near-term work so
application-level work proceeds in parallel DURING the next slice of model
work; pick the model bundle that approaches completeness of the model lane,
so that afterward application work fans out rapidly without waiting on
proofs; begin determining the UX/DX affordances and the NATS/KV API
extensions to allow, so first-class production agent-harness features can be
planned while building incrementally off the core estate.

**Reading base, verified against the tree this session** (not trusted from
the tasking summary): `verify/fabric` on `main` carries **70 rostered
theorems** (run.sh roster array counted); PR #71 (DEV-710 hygiene, in final
confirm via DEV-722) carries **73** — bridge lemma
`foldCommutative_eq_fold` plus the two retained-property pins, verified
clean under attack in the DEV-717 round. `verify/fabric-veil` is merged:
36 censused VC theorems, 15-row model-exported corpus, TS `Registers` +
`go/register` replay walls, ledger row landed (`VERIFICATION.md:49-113`,
R3 + replay wall, R4 RESERVED at the 15,378-schedule bar). The dependency
store is landed (DEV-721 done; measured 40–113 s incremental fabric-veil
gate, ~48 s steady state, vs 1172 s cold + 15–20 min fetch). Board: the
confirm cascade is DEV-722 (Rev combined confirm of PR #71 + PR #73);
held behind it are DEV-712 (E4 fold, dispatch 31), DEV-713 (CI
faithfulness, dispatch 33; blocked on 34+31), DEV-719 (tsgo cutover),
DEV-715 (quickstart samples doctest). The model-hygiene brief's content is
fixed by the DEV-706 verdict routing (roster findings 1–3) plus proof-
program audit A-5. The F11/F12 acceptance bars are B-3/B-7 with the
DEV-706 binding deltas. The DEV-704 substrate verdict and its §6.3 fold
are read in place; DEV-716 (the eight-suite substrate gate re-land) is the
other half of the confirm cascade.

House law binding this plan, stated once: safety-only, no liveness claim
anywhere; capabilities-never-vendors in any outward framing (ratified item
14); pins are law; everything builds incrementally off the fold/meaning
substrate — nothing here bypasses it; ledger rows land only with slices
(G6); **no full rebuilds ever** — the model-slice logistics below assume
the in-place-plants / one-built-tree / dependency-store discipline
(`docs/research/2026-08-17-local-gates-unification.md`, adopted); sizes
are in sessions and review rounds with today's measured rounds as
calibration, never vibes.

---

## A. The model-completion slice

### A.1 The doctrinal question, answered first

The proof-program cards sequence F7 behind slice 2a, F10 behind slice 4a,
and F11/F12 behind the harness slices — proof acts placed on the ruled
build ladder, the build-behind-consumers shape. The operator now wants the
model lane front-loaded so no application slice ever again waits on a
proof. Is front-loading execution-order (allowed) or
concept-before-consumer (a doctrine violation)?

**It is execution-order, and the line sits exactly here: a model item may
be front-loaded iff its statement and acceptance bar are already ratified,
its consumer is a named epic on the board, and its ledger row carries the
honest no-consumer-yet sentence until the consuming slice's wall lands.**
Four grounds, each citable:

1. **The concepts are ratified.** "Concepts are ratified before machinery
   exists" (AGENTS.md) gates *un-grilled* machinery. F7/F10 were ratified
   into the proof plan by G8; F11/F12 were ruled separate, minimally
   scoped R5 statements by grill item 12, and their acceptance bars
   (B-3/B-7) were adopted as binding with the DEV-706 grill deltas
   applied; C7 well-foundedness and the compaction corollary are
   enumerated obligations (B-10 items 3 and 6) riding ratified rulings
   (G8, G21). Nothing in the bundle below states a new law. The one
   genuinely new *carrier* decision (F12's directory lattice) is grill
   item 2 in §E — put through the door before the build, honoring the
   precept rather than testing it.
2. **The precedent is the program's own wave 1.** `verify/fabric` landed
   F1–F4/F2b/F9 with no runtime consumer; the fidelity-review D1
   disposition demanded the ledger row *say so* ("nothing consumes the
   emitted corpus today"), not that the model wait. The generated-vectors
   law inverts the consumer relation for models: the corpus is the spec
   artifact the consuming slice's wall replays, so the model is the
   *authoring side* of a wall that closes when the slice lands. A model
   package with a named future wall is standing evidence, not
   un-consumed machinery.
3. **The program already front-loaded statement work.** DEV-706 drafted
   and graded F11/F12 "now" — wave-5 items by the ladder — because the
   statements' acceptance bars were worth fixing early. The bundle
   completes what that dispatch started.
4. **What would violate doctrine, named so it is fenced:** inventing laws
   for the two open gap-table rows (declaration upgrade — deferred to the
   estate's grilling #2 by G22; erasure — flagged, no law manufactured);
   racing F6 ahead of its CSLib ratification and REF-4's close semantics
   (part 1 §12 risk 6); any liveness statement (D-5a kind-change
   discipline); building ANN machinery (G15 defers behind a measured
   consumer); an un-grilled F12 carrier refactor. None of these is in the
   bundle.

One more consideration that decides *consolidated* over *dribbled*:
execution directive 6 makes model work Fable-implemented until stability.
Every app slice that carries a model half becomes a mixed slice split at
dispatch — two seats plus a coordinator join per slice. Consolidating the
model work into one Fable push amortizes that overhead once, and converts
every subsequent application dispatch into a pure-runtime issue a codex/CC
seat can run without a join. The no-rebuild law makes the push cheap to
iterate: the fabric gate is 8.1 s local (measured, DEV-697), and the
in-place-plant discipline means review plants cost seconds, not rebuilds.

### A.2 The recommended bundle, in three merge waves

**Everything in {model-hygiene brief, F7, F10+C7-wf, F11, F12, compaction
corollary} lands, plus two riders the sequencing analysis surfaces: the
dispatch-31 decision-8 emitter families (moved into the model lane per
directive 6 — grill item 3) and the F9 policy-carrier allowlist extension
(B-6 item 2, fields ratified by part 3 amendment 4).** Internal order:

**Wave M1 — hygiene + the E4 families + the F9 extension.**
*Unblocks: E4's wall, DEV-713, and clean carriers for every later wave.*

- The model-hygiene brief, content fixed by the DEV-706 routing and audit:
  (1) rename `f1_same_verified_set_converges` (extensionality named as
  convergence) and add the genuine history-level convergence theorem
  derived from F2; (2) split `SerialSuccessorSchedule` into
  `WindowCoverage` ∧ `PositionPayloadIntegrity`, with the
  `[(11,2),(11,999),(12,3)]` payload-conflict control; (3) re-posture
  `apply_successors_exact` as a helper; plus **A-5**: the gate gains
  verdict-truth pinning (grep-assert the pinned verdict fields true, or
  emit verdicts from the bridge-theorem terms — the second is preferred,
  it stays derived).
- The dispatch-31 decision-8 corpus families, built against the *split*
  premise: the F3∘F2b composed resume-then-redeliver family (the kill-9
  shape), ahead-of-ceiling arrival, multi-gap window,
  redeliver-everything-twice-shuffled — each row naming its theorem
  instance, witnessed in `BridgeProofs`, counts re-pinned.
- The F9 carrier extension: `indexes` and `resources` allowlist fields
  through `Policy`, meet/`Le`/`ext` and every componentwise proof moved
  together, corpus regenerated (mechanical by DECISIONS T3's design; a
  real model edit, so it rides a wave, not a slice).

Why hygiene first: the F2b premise split renames the premise that every
later family and statement cites (the composed F3∘F2b rows, F10's
support-invariance, F7's congruence idiom). Building M2/M3 against the
pre-split premise and re-threading costs a full regeneration round.

Gates: `verify/fabric/run.sh` green with roster and counts moved;
byte-identical regeneration; footprints inside
`{propext, Classical.choice, Quot.sound}`; the payload-conflict control
refuted with committed trace; corpus grows by the four E4 families with
pinned counts. Size: **2–3 Fable sessions, 1 review round.** Calibration:
brief 34's three model items were a fraction of one session and came
through DEV-717 verified clean under attack; the premise split is the one
risky item (it re-threads the ~200-line F2b induction) and is priced a
full session alone.

**Wave M2 — F7, then F11.**
*Unblocks: E6's assembly wall (slice 2a) and E12's index/search wall
(slice 1b); F11 composes into F7, so RAG-shaped programs inherit both.*

- **F7** per card B-4: the `ContextProgram` carrier (selectors as declared
  addresses, renderers as pure `Value -> String` at the emitter grammar,
  volatility-stable segment ordering); `f7_assembly_reads_only_declared`
  (the frame/congruence shape already proved once as
  `apply_successors_congr`) and `f7_segment_order_stable` (stability of
  the class sort stated explicitly — two lawful implementations must not
  disagree on equal-class order). Controls: ambient-read variant killed
  off the read set; arrival-order segment variant killed; the runtime
  refusal (planted timestamp selector refused at declaration citing F7)
  is E6's gate, named here. Corpus: an assembly family (programs ×
  valuations, mutant-kill rows).
- **F11** per card B-3 with the DEV-706 deltas binding: the list-level
  half is the content — `topK` as `dedup ∘ mergeSort` under the identity
  tie-break, invariant under permutation and duplication of a
  `List Entry`, antisymmetry from a *named* distinctness premise; the
  state half rides F3; the composition
  `render (Q.answer (stateOf anchor) q)` is the law; the admission-level
  purity refusals cite F11 by name. Controls: insertion-order tie-break
  mutant killed on a two-orders row; ambient-thread mutant on a
  two-schedules row; undeclared-seed refused at admission with the
  declared-seed *admitted* positive half; hand-edit dies on the diff.
  Corpus: a query family.

Gates: as M1 plus the new families consumed-by-name lists for slices 1b
and 2a written into the closing report (the wall lands with the slice, per
G6). Size: **3–4 Fable sessions, 1–2 review rounds** (F7 1–1.5; F11 is
the heaviest single item — the dedup∘mergeSort permutation induction is
"the real induction" — 2–2.5).

**Wave M3 — F12, F10 + C7-wf, the compaction corollary.**
*Unblocks: E12's directory wall (slice 2b), E9's trigger wall (slice 4a),
and the retention slice's refusal fence.*

- **F12** per card B-7 with the DEV-706 deltas binding, *after grill item
  2 rules the carrier route*: the directory as
  `Map Petname (FiniteSet Digest)` under componentwise union with its own
  F1-for-maps ACI+convergence package (recommended) — or the ratified
  generalization of `Cell`; `SealsWellFenced` carried as a named premise
  discharged by citation of the Veil package's I1/I2 (never restated in
  4.33 — G5's toolchain split makes import impossible and the bar forbids
  restatement); `resolve` *computes* the greatest token over seal data;
  the four-verdict characterization in the verify/moves refusal-iff
  idiom. Controls: drop-`SealsWellFenced` (two seals at one token make
  resolve schedule-dependent — proves the premise load-bearing and points
  its discharge at F5); LWW two-orders→ambiguity; holder-arbitration;
  permuted-seal `(7,A)/(9,B)`. The snapshot-pair atomicity non-coverage
  sentence rides the row. Corpus: a resolution family, the stale-token
  rebind row citing the Veil corpus vintage.
- **F10** per card B-5: the closed five-production predicate grammar as
  an inductive (absence/negation/deadline unrepresentable — G9 enforced
  by construction), the fabric-state order, `f10_stability` (the
  hole-state production in reaches-form only — the is-exactly variant IS
  the negative control), `f10_hints_of_support` riding
  `SameDeliveredSet`. Landed-claim uniqueness cites F5, never restates
  it. **C7 well-foundedness** beside it (B-10 item 3): pinning as an
  inductive admission order, well-founded by construction, the
  digest-preimage argument staying in the trusted base with the row
  saying so.
- **The compaction corollary** (B-10 item 6):
  `compact_below_floor_preserves_resumption` — an F3 instance over the
  minimum anchor floor; small, but it is the theorem `Retention.horizon`
  and the compaction-past-horizon *refusal* cite by name (G21's derived
  horizon made citable).

Gates: as above; the F12 controls' traces committed; the trigger and
resolution families join the corpus with pinned counts. Size: **3–4
Fable sessions, 1–2 review rounds** (F12 ~2 including the carrier
package — the ACI package is a known ~55-line shape; F10+C7-wf ~1.5; the
corollary ~0.5).

**Bundle total: 8–11 Fable sessions, 3–5 adversarial review rounds,
three merge waves.** Calibration anchors: the entire wave-1+2 program
(spine, fabric model, register, hygiene, probes) ran in one day on this
cadence; DEV-695 (the original 39→70-theorem package) was one seat run
plus three review rounds; DEV-711 was three rounds; DEV-706 drafted both
F11/F12 statements in one session. The gate cost per iteration is
seconds (8.1 s fabric; the store holds fabric-veil at 40–113 s), so
review plants and repairs are cheap by construction. Logistics per the
no-rebuild law: one built tree per wave branch, in-place plants,
`verify/fabric` has **exactly one writer for the whole push** (the Fable
lane — a direct benefit of grill item 3 moving E4's emitter families
here; dispatch 33's manifest emission is the one other toucher and lands
behind M1 by the board's own sequencing).

### A.3 Alternatives, priced

- **Strict per-slice placement (the cards as written).** F7 waits for
  E6's dispatch, F10 for E9's, F11/F12 for E12's. Cost: every one of
  those becomes a mixed slice under directive 6 — model half to Fable,
  runtime half to a seat, coordinator join, per slice — and each app
  slice serializes behind its model wait, which is precisely what the
  operator charged against. Benefit: zero speculative-carrier risk.
  Reversal: n/a. Rejected on the charge, kept as the fallback if the
  operator rules front-loading itself out.
- **Partial front-load (M1+M2 only; M3 rides E9/E12 dispatches).** Saves
  ~3 sessions now; E9 and slice 2b wait on mid-slice model joins later.
  Defensible if the operator wants M1/M2 evidence before committing M3;
  the doctrine line does not move (M3's statements are equally
  ratified).
- **Full bundle plus the F6 interim transition table.** Rejected: the
  table's consumer is E8's monitor (not near-term), and REF-4's
  close/authority semantics are a named upstream dependency (risk 6) —
  emitting the fill-fragment table early risks re-work the moment REF-4
  moves. Recorded as grill item 13 so nobody bundles it by oversight.

### A.4 What "the model lane approaches completeness" means afterward

At the close of M3, `verify/fabric` (4.33.0, zero-dep) holds proven, with
controls and model-emitted corpus families: F1 (+the directory-carrier
ACI package), F2, F2b under the split premise, F3, F4 + the bridge, F7,
F9 (+allowlist fields), F10, F11, F12, C7 well-foundedness, the
compaction corollary, and the retained-property pins — roughly 95–115
rostered theorems (a range, not a commitment; the roster count is pinned
by the gate at each wave). `verify/fabric-veil` holds F5 at R3 + replay
wall. Every application slice on the board then has its corpus family
and its citable law names available *at dispatch time*.

**Remaining unproven, and why that is ruled fine — each by standing
ruling, none by neglect:**

| Unproven | Why fine |
| --- | --- |
| F6 automaton–model equivalence | G5 defers the CSLib package to its own ratification; the interim generated transition table is E8's consumer-timed artifact (risk 6 sequences the close fragment behind REF-4) |
| F5 at R4 (lockstep) | embargoed by ruling at the 15,378-schedule bar; no R4 language until a lockstep run at that bar exists |
| F8 | ruled a corollary under F7+F3 (B-9); no theorem exists to prove, no refusal cites it by name |
| the projection IOU (per-seat frontier soundness) | owed when the fabric frontier ships (slice 4/E8); until then the frontier stays state-anchored, seat-relative, never `legal`-enumerating (B-10 item 5) |
| the §5.7 composite ("meaning cannot be corrupted from the wire") | a composite, never one theorem — the ledger cites clauses only (B-10 item 4) |
| batch-vs-incremental drain equivalence | explicitly declined by dispatch 31 decision 4; the wall and chaos gates carry it (B-10 item 9) |
| declaration upgrade; erasure | G22 defers upgrade to the estate's grilling #2; erasure stays a flagged gap with consumers named — manufacturing either law here would front-run an estate decision |
| anything liveness; attribution | D-5a kind-change discipline; G4's estate gate |

That table *is* the completeness claim: after M3, everything left
unproven is unproven by ruling, with its owner and trigger named — which
is what lets application work fan out without a proofs queue.

---

## B. The parallel application lanes

The trigger event is the confirm cascade merging (DEV-722 confirms
PR #71 + PR #73). "Day 0" below means that day. Seat classes follow
directive 6's boundary: model work Fable; runtime, adapter, Go-twin, and
infrastructure on codex/CC seats; Rev adversarial review before every
merge; the coordinator merges.

### B.1 The lanes and their dependency edges

| Lane (board home) | Consumes from the model lane | Seat | Starts |
| --- | --- | --- | --- |
| **E4 durable fold** (DEV-712, dispatch 31 amended per grill 3) | the landed corpus (7 rows) + M1's four families (the wall's family list pins at M1's merge); the bridge lemma (in PR #71) | codex/CC Eng + Rev | **Day 0** — pump, Lane/Algebra/Fold/Anchor modules, chaos harnesses build immediately; the row-for-row wall completes when M1 merges (~1 round later) |
| **tsgo cutover** (DEV-719) | nothing | codex/CC or Ops | **Day 0** (held only on PR #71) |
| **Quickstart samples doctest** (DEV-715) | nothing (E2 rows run today; E4 rows activate when E4 lands) | codex/CC low-priority or DevRel | **Day 0** |
| **CI faithfulness** (DEV-713, dispatch 33) | M1's corpus counts (the manifest pins them) | codex/CC Eng | after 34+31 merge per the board; the alternative — start at M1 with rebase-on-31 discipline — is priced in the dispatch's own cross-slice note; keep the board's order to hold `verify/fabric`-adjacent writers to one at a time |
| **E6 contexts, runtime half** (DEV-688, slice 2a; split per grill 4) | today: nothing — `Cell.ts` + the F1 vector family are ruled to land with E6 (mid-flight ruling 5), the ResolvedOf route is adopted and probe-verified (DEV-705), `Catalog.ts`/`Resolved.ts` shapes are binding in the architecture record | codex/CC Eng | **Day 0** for Cell/Catalog/Resolved/ContextProgram scaffolding and the F1 cell wall; the byte-identical reassembly wall lands when M2's F7 family merges |
| **E12 harness plane, slice 1b** (DEV-699: Index/Search) | F11's query family + the F11 name for admission refusals (M2) | codex/CC Eng | scaffold after E4's Fold discipline exists (an index deploys through `Folds.deploy`); wall at M2 |
| **E12 slice 2b** (Resource/Directory/Retention) | F12's resolution family + the Veil corpus vintage for the rebind interleavings + the compaction corollary for `Retention.horizon`'s refusal (M3); `Registers` is already merged | codex/CC Eng | after slice 1b or beside it; wall at M3 |
| **E9 actions/triggers** (DEV-691, slice 4a) | F9 rows (already emitted: 2) + F9-allowlist regeneration (M1); F5 (landed); F10's trigger family + C7-wf (M3); the C7 row cites F5 + the G23 sentence verbatim | codex/CC Eng | Policy/Capability/Action module scaffolding can start once E6's catalog half exists (declarations are cataloged values); the trigger pump wall lands at M3 |
| **`plait chaos` CLI ticket** (E4 rider, ratified item 13; design note merged) | E4's own gates (it re-dresses them); law names + corpus digest by citation | codex/CC Eng | when E4's fold lands; grill items 5–6 settle host and reorder axis |
| **Error catalogue + outward glossary** (E11 early ticket, grill 12) | the shipped refusal union (today) + CONTEXT.md's glosses; walled served-equals-derived | codex/CC or DevRel | **Day 0** if grill 12 admits it |
| **MCP introspection/config surface** (E11/DEV-693 proper) | cataloged declarations (E6's catalog half); the estate MCP untyped-argument fix (named wait — not worked around) | codex/CC Eng | after E6 catalog; the argument-shape half waits on the estate fix |
| **E7 federation** (DEV-689, slice 3) | no Plait-model edge — verify-on-ingest's chain law is the journal/REF lane's | codex/CC Eng | after E4/E5 per the ladder; no model wait |
| **E8 sessions + monitor** (DEV-690, slice 4) | the F6 interim table (deferred to this slice's dispatch, grill 13); the projection IOU stays owed | codex/CC + Fable model half at dispatch | later; not near-term |

Prose reading of the DAG: **nothing below E8 waits on anything it does
not consume.** Three lanes have zero model edges and start day 0 (tsgo,
doctest, error catalogue); E4 starts day 0 with a one-round wall
dependency on M1; E6's runtime half starts day 0 with its assembly wall
keyed to M2; E12-1b keys to M2, E12-2b and E9's walls key to M3; CI
faithfulness keys to M1+E4 by the board's own order. The model waves are
sized (1–2 rounds each) so no application lane idles more than one
review cycle waiting for its wall material — and the build halves of
every lane are wait-free.

### B.2 What lands where, and the review load

Concurrency shape: at any moment the coordinator runs one Fable model
wave plus two to three seat lanes plus Rev. That matches the measured
wave-2 cadence (four dispatches + two reviews live at once). The
cross-slice write map stays clean: `verify/fabric` — model lane only;
`packages/plait` — E4 and E6 touch disjoint modules (dispatch 31's
module list vs Cell/Catalog/Resolved/ContextProgram), with the
architecture record binding placement so collisions surface as findings,
not improvisation; `scripts/` + workflows — DEV-713 alone; docs —
doctest and catalogue lanes.

---

## C. UX/DX affordances

Discipline for this catalog: every entry is tied to the law that
licenses it (universal-properties-to-DX: a proved law becomes a
convenience surface with inherited correctness), or is honestly marked
**NEEDS-A-LAW** with the candidate named (estate-of-safety: pre-register
the law that extends safety by construction), or **NEEDS-API-ONLY**
(surface over existing law). Consumers named; nothing enters the public
surface without its law (ADR-0010 via the lawful-surface precept).

### C.1 The developer journey — quickstart to production

| Affordance | Licensed by | Notes |
| --- | --- | --- |
| **`plait dev`** — boot the pinned `nats-server v2.14.4`, R=1, file-backed, print the URL | the substrate envelope (G3) + the DEV-716 gate content; the pin is law | DEV-697 R4; the quickstart's minute 0–2 today is "build it from the Go module" — the command is packaging, not new machinery. When pointed at a cluster it REFUSES with the envelope named — the substrate gate surfaced as help (grill 5 settles the bin owner) |
| **`plait chaos`** — kill/duplicate/reorder a declared fold, digest-equality verdict | F3, F2, F2b cited by name; the corpus digest by citation; ratified item 13 + the merged design note | the one quickstart ending no competitor in the DEV-697 scan can ship: "it worked, and here is the machine-checked reason." Scoreboard is canonical bytes (both-audience door); axis `n/a` prints its reason; the F2b line names the discipline, never the floor |
| **Scaffolding: `plait new fold` / `new action` / `new index`** | G12 (declarations are cataloged values) + the codegen family (architecture §6): generators are semantic folds over committed inputs | NEEDS-API-ONLY. Generates the declaration + the generated law-suite stub the brand needs (F4's suite for `commutative`) — the earned-brand discipline as a template, so the first thing a developer meets is the law their algebra must pass |
| **Quickstart samples as gated files** (DEV-715) | the dogfood rule — a report without the artifact is a failed run | doctest harness keeps the quickstart's "runs today" labels mechanically true |
| **The three-example ladder** (two processes, one digest → kill it → two workers, one outcome → one-line LLM upgrade) | walls of slices 0/1/2 re-dressed; F5's zombie-commit refusal is the teaching moment | DEV-697 §3's order of belief: identity → resumption → exclusivity — matches the epic ladder, so examples land as slices land |
| **Cost envelope headline** — per-action grants/renews/commits/bytes | measured-tier scoreboard only (part 2 §9.6); never a ledger claim | DEV-697 gap 5: evaluators ask before they build; publish the number as a scoreboard headline |

### C.2 MCP introspection and configuration

All of it rides the ratified architecture §5: every tool **derived** from
the declarations the runtime executes, walled served-equals-derived,
projected through the caller's writ. One door, both audiences.

| Surface | Licensed by |
| --- | --- |
| Declarations served as digest-addressed MCP **resources** | the MCP deep-read verdict ("serve digests as resources — a strong, cheap fit"); `resources/subscribe` stays RATIFIED-AGAINST — the verifiable `{seq, head}` cursor is the door |
| `index.list/describe/anchor`, `search.query/explain` | C10/F11 (query results as certificates; freshness as the anchor fact; `explain` = the query digest + anchor + declared ranking fold) |
| `resource.list/describe`, `directory.list/resolve` (anchor required), `retention.horizon` | C11/F12/G20/G21 + the compaction corollary once M3 lands |
| `register.observe` / **`register.audit`** — token/commit history as certified rows | F5's I1/I2 make the retained history the witness; the replay wall already audits it per row (see §D.2 for the API's bounds) |
| `action.tree` — the live action tree with its attenuation audit annotation (every node's policy ≤ root) | F9 + the slice-4a attenuation vector wall |
| Configuration write plane: `resource.declare`, `directory.bind/rebind` (fenced, returns the token), `retention.declare`, policy/program/capability submission | G12 — configuration is cataloged data through the certifier: digested, refusable, diffable, walled. No YAML of semantics exists |
| Writ-projected tool lists | F9/G10; the projection inherits the frontier's ruled shape and its projection-soundness IOU — stated on the surface until the IOU is discharged at E8 |

Named waits carried, not worked around: the estate MCP untyped-argument
fix (gates the search tool's argument shape); the attribution decision
(gates any human-identity claim on approval surfaces).

### C.3 Codegen from cataloged declarations (ratified directive 5)

Every generator is a semantic fold over committed inputs, output carrying
its source digest, walled generated≡derived — the model→fixtures family
already is law; these join family 2:

- **TS types for lane events and capability schemas** — licensed by G12
  + the certifier (the schema digest is the source pin).
- **Law-suite stubs beside declared algebras** — the F4 brand's
  generated suite as scaffold (dispatch 31 decision 3's
  step↔algebra-compatibility property included).
- **The error catalogue** — every refusal kind with its sort, the law it
  defends, and its taught `next`, generated from the shipped refusal
  union (which is exactly why brief 34 item 8's enumerate-from-the-union
  test matters: the catalogue and the test share a derivation). DEV-697
  gap 2; no competitor can generate this because no competitor's errors
  carry laws.
- **The outward glossary** — CONTEXT.md's standard-term entries pointed
  outward ("you call it X; here it is Y; the difference that matters is
  Z"), served-equals-derived. DEV-697 R2.
- **The inverted rights table** — "you want X → this function → this law
  makes it safe → what it does NOT cover", generated from the
  declared-rights table. DEV-697 §1.1's point that F2b currently has no
  developer-visible face lands here: *"write a non-idempotent fold and
  stay redelivery-safe"* becomes a documented capability with F2b's name
  on it.
- **Reference docs + MCP tool descriptions** — same family, same walls.

### C.4 Typed writ and policy Layers

| Affordance | Licensed by |
| --- | --- |
| `Policy.declare` seat profiles (worker/frontier exemplars), `Policy.layer` compiling writ to the Layer stack; handler R-channels checked at declaration | G10 — with the honesty box verbatim on every surface: **type-level writ is DX, not security**; server-side refusal + the attribution decision carry security |
| Spawn defined only as `child = parent ⊓ requested` | F9 — over-grant is unrepresentable; the thousand workers cannot jointly exceed the one lead |
| Budget-exhaustion as an ordinary typed refusal kind | estate demand row D8; budgets stay liveness machinery, never identity (part 2 §7) — NEEDS-API-ONLY |
| `retryAbsence` with real `Schedule` semantics, absence-only | landing in PR #71 (brief 34 item 7); structural refusals stay non-retryable |
| Allowlist fields (`indexes`, `resources`) meet-intersected on spawn | F9 + part 3 amendment 4; the model carrier extension rides M1 |

### C.5 Observability — what a production operator sees

- **Spans for free**: `Effect.fn` names every exported effectful
  function; telemetry rides built-in tracing exported via standard Otlp
  (architecture §4). A span id *is* the segment's chain head —
  recomputable, not assigned (part 3 row 2).
- **Dashboards are declared folds** — "the fold algebra IS the metrics
  engine" (estate row C11): a counting metric is commutative but not
  idempotent, so it rides F2b and needs no dedup layer. The metrics
  story is a *consumer* of the fabric, not a bolt-on. NEEDS-API-ONLY
  (metric fold declarations + a reader).
- **The wire scoreboard** everywhere gates run: refusals by kind/sort,
  redeliveries absorbed, buffered out-of-order drains, anchor writes,
  steals — measured, not narrated (the dogfood rule); `plait chaos` and
  the demo share the format (canonical bytes).
- **2 a.m. debugging is the MCP introspection surface as a CLI** —
  "which shard is stuck / who holds this lease / why did my commit
  refuse" are `register.observe`/`audit`, `fold.anchor`, and the refusal
  record itself (DEV-697 gap 4). Same derivation, second presentation;
  the human without an agent in the loop is a first-class audience.

### C.6 Configuration legibility for agents AND humans (the standing charge)

The mandate is discharged by construction where G12 reaches, and the
remaining affordances make it *pleasant*:

- **One door, two renderings**: every declaration is a cataloged value;
  agents diff digests and decode structures; humans get `describe`
  renderings and `--output json|text` on every CLI (the chaos note's
  pattern generalized). The MCP tools and the CLI are the same
  derivation — served-equals-derived is what guarantees the two
  audiences never see different truths.
- **The API log as the standing "why"** (ratified item 21): one file
  answers "why is the surface shaped like this" for both audiences; the
  bundle and fan-out append entries per house mechanics.
- **A declaration-change recipe** (DEV-697 gap 3): the procedure for
  "edit a prompt/program/lane" — new digest, `lineage` pins the
  predecessor, old anchors stay true (F8's vocabulary), consumers move
  by explicit successor adoption. NEEDS-API-ONLY as a documented recipe
  + a `lineage`-aware `describe`; the upgrade *law* stays G22-deferred,
  and the recipe says so — prose honesty instead of a front-run.
- **Config drift is not representable**: there is no file to drift — a
  changed declaration is a different digest, and the diff is the audit.
  The affordance is surfacing that diff well (`catalog.diff a b` —
  NEEDS-API-ONLY over value diff).

### C.7 Error and refusal DX — where the teaching `next` goes next

The just-landed discipline (every structural refusal teaches at least
one legal next move — brief 34 item 8, the replies-teach law) extends
along three lines, all licensed by the shipped refusal envelope:

1. **The generated catalogue** (C.3) — the estate's pedigree makes an
   error reference *with laws attached* generatable; entries carry
   kind, sort, law, taught next, and the negative-control trace that
   proves the refusal fires.
2. **Law names in admission refusals** — the grill-12 payoff arrives
   with M2/M3: a clock-reading query algebra refuses *citing F11*; a
   stale-token rebind gate *names F12*. The proof budget spent on
   separate statements was priced exactly for these citable names.
3. **Typed next-moves** — where the legal next move is itself an API
   act (ambiguous-binding → rebind under the declared authority), the
   `next` field carries the typed act reference, not prose. NEEDS-API-
   ONLY; the refusal schema already has the field.

**NEEDS-A-LAW entries in this section, honestly marked:** a "just pick
one" resolve default (part 3 risk 4 predicted the demand): any default
is an arbitration rule, and `fence_deterministic` demands arbitration be
a declared function of the candidate set — the candidate law is a
*declared* default-arbitration constant on the directory declaration;
recommended posture is to keep refusing and let the rebind door carry it
until a consumer demonstrates the need (grill 11 pre-registers the
refusal posture for batch atomicity; this one stays a recorded demand,
not a grill item, until demand exists). The projection-soundness IOU
(C.2) is the other named law debt, owed at E8 by the standing MPST
refusal.

---

## D. NATS/KV API extensions

Ground rules from the probed semantics (DEV-704 verdict + part 1 §6.3 as
amended): the fabric may rely on subject CAS (cursor = global stream
sequence of the subject's last message), KV revision CAS with
read-after-ack inside the R=1 envelope, bounded dedup (with the
CAS-before-dedup exception and stream-wide ID namespace), at-least-once
redelivery with no application-order guarantee, work-queue filter
uniqueness/removal, and process-crash recovery. It may NOT rely on
duplicate PubAck to resolve an exact CAS retry, message-ID scoping below
a stream, per-key consecutive revisions, transport delivery as
application order, KV/stream terminality without the credential/shape
guard, or SIGKILL evidence as power-loss proof. Every F5-flavored runtime
claim is bounded to a fixed backing-stream incarnation (the DEV-711
operator finding). Each extension below names what it enables, what
could go wrong against the refused list, and its law obligation.

### D.1 Watch surfaces over cells, anchors, and directories

- **Enables**: live UIs and agents observing cell/anchor/directory state
  without polling — `Cells.watch` is already in the ruled service
  surface (part 1 §8.2, streams as the only read surface); directories
  are cells, so `directory.watch` is the same door.
- **Law obligation**: none new *if and only if* watch stays an advisory
  monotone read: every delivered state re-derives digests like any read
  (verify-on-read is the schema); staleness is head-relative absence
  (F8's vocabulary). The dangerous affordance is the missing-by-design
  one: **no absence reasoning from a watch** — "I watched and nothing
  came" is the non-monotone inference G9's grammar refuses; a
  watch-driven trigger is only lawful over the monotone productions.
- **Could go wrong**: KV watch semantics (initial-value replay, delete
  markers, resume-from-revision, missed-update coalescing) are
  **unprobed** — DEV-704 did not touch watch. Coalescing is fine for
  lattice cells (F1 makes intermediate states skippable) but would be a
  correctness trap for anything treated as a log.
- **Needs**: a probe suite in the DEV-704 idiom (watch under the
  envelope, coalescing behavior, resume semantics at the pin) landing as
  a **ninth suite on the DEV-716 gate** before any watch API ships.
  Grill item 9.

### D.2 KV history reads as audit APIs (`Registers.audit`)

- **Enables**: "who held this lease, in what token order, what landed" —
  the 2 a.m. question answered from the substrate's own retained
  history. The register replay wall already audits per-row history
  (DEV-711 evidence: history depth declared in-slice, draft 32
  decision 9); this promotes the wall's read into a served, certified
  surface.
- **Grounded**: probed — delete keeps tombstones, purge rollup leaves
  only its marker, revisions are bucket-global stream sequences that
  totally order writes per key but are **not consecutive per key**. The
  API must present the token order, never invent per-key ordinals.
- **Law obligation**: F5's I1/I2 make the retained history the witness
  of the fence order — audit is a read of what the theorems govern, so
  it inherits correctness rather than claiming any. Two bounds ride
  every response: history depth is the declared retention (G21 — the
  audit says how much history exists, by declaration); and **every audit
  row is stamped with the backing-stream incarnation** — an audit
  spanning a bucket recreation is two histories, never one order.
- **Could go wrong**: reading across an incarnation reset as one token
  order (the exact DEV-711 finding); classifying by `ErrKeyExists`
  instead of operation-context + code 10071 (the frozen classification
  rule).
- **Needs**: grill item 7 (admission + the incarnation stamp).

### D.3 The incarnation pin — when T6's deferral converts to machinery

- **Today**: the bound rides every register claim in prose
  ("within a fixed backing-stream incarnation"); the guards are the
  DEV-716 ACL suite (application credentials cannot delete/recreate
  streams or buckets — landing with the cascade) plus the T6 recorded
  deferral. Epoch-bearing tokens are ruled out for v0.
- **Conversion trigger, recommended (grill item 8)**: the pin becomes
  real machinery when either (a) `Registers.audit` ships (audit rows
  need the incarnation identity to be honest — D.2), or (b) any
  deployment exists where admin credentials are not operator-held
  (tenancy, third-party commons). Not a date — a named consumer, per
  build-behind-consumers.
- **Shape when converted**: capture the backing stream's creation
  identity at register-open; revalidate on the read-back reconciliation
  path that already exists for ambiguous CAS outcomes (zero extra round
  trips in the happy path — the probe-verified reconciliation read
  carries the check); mismatch is a structural refusal naming the
  incarnation bound.
- **Law obligation**: extends the F5 *runtime* claim from
  "bounded to an incarnation" to "incarnation mismatch refuses" — a
  runtime guard walled by a lifecycle-mutation control (recreate the
  bucket mid-run; the reborn bucket's stale-holder update must refuse at
  the pin rather than land — the exact scenario the DEV-711 finding
  demonstrated landing today). The model is unchanged; the bound moves
  from prose to gate. Estate-of-safety through-line: this is the
  candidate that extends safety by construction for the register
  family.

### D.4 Blob / object store beyond the inline threshold

- **Enables**: embedding vectors (`{blob: digest}` in embedding
  records), corpus shards for E10, federated payloads — anything above
  the proposed 256 KiB inline threshold. `Blob.ts` is in the binding
  module map; `OBJ flb-fab-blob` is in the subject grammar; nothing is
  built.
- **Law obligation**: identity is of canonical uncompressed value bytes
  (the standing law) — the blob wall re-derives the digest on read;
  object-store metadata carries **no identity role** (§6.3's refused
  column, verbatim). Inline-vs-blob is invisible to identity, so the
  threshold is deployment configuration with a wall, never an
  identity-bearing constant.
- **Could go wrong**: the object store's chunking/metadata semantics at
  the pin are **unprobed** (DEV-704 scoped to streams/KV); a chunked
  read path that trusts store-side digests would be a verify-on-read
  hole.
- **Needs**: a probe dispatch (put/get integrity, chunk boundaries,
  partial-read behavior at `@nats-io/obj@3.4.0` + server 2.14.4) before
  `Blob.ts` lands — grill item 10. Consumer: E12 embeddings and the E10
  corpus; timing fits after M2.

### D.5 Batched / pipelined CAS patterns

- **The demand**: register traffic per action is nonzero (part 2 risk
  6); anchor writes per checkpoint; server 2.12+ ships atomic batch
  publish.
- **Recommended posture (grill item 11): refuse batch-as-atomicity;
  admit pipelining only as adapter-internal throughput, surfaced
  never.** A cross-key atomic batch would smuggle a multi-register
  transaction into a fabric whose whole design is that cells converge
  without coordination and registers fence one work digest each — new
  physics, exactly what the no-new-physics audit exists to catch. The
  batch primitive's interaction with per-subject CAS and stream-wide
  dedup is unprobed, and FINDING 1 (CAS-before-dedup) is a warning about
  exactly this class of composed-header semantics.
- **Law obligation if ever surfaced**: a probe suite plus a statement of
  which failure atomicity is and is not claimed — until a consumer
  demonstrates the need, the declaration-granularity answer stands
  (batch at the declaration level: one action per shard, not per
  token).

### D.6 Per-subject direct-get reads

- **Enables**: cheaper anchor/freshness reads (`Search.anchor`,
  `fold.anchor`) than consumer machinery.
- **Could go wrong**: direct-get reads can be served from replicas in
  clustered deployments — a linearizability hole the moment G3's
  envelope ever widens. Inside R=1 it is same-node and benign, but
  admitting it silently would couple an API to the envelope without
  saying so.
- **Posture**: defer until a measured read-cost consumer exists; if
  admitted, it enters through the substrate gate with its own suite and
  an explicit R=1-only bound that the G3 cluster grill must revisit.
  Folded into grill item 9's probe-rider mechanism, not its own item.

### D.7 Purge/retention fencing (the compaction corollary's consumer)

- **Enables**: `Retention.horizon(lane)` (a derived read) and
  `Retention.compact(lane, upTo)` — the fenced act: journaled,
  attributed, carrying the `(head, state digest)` pair it replaced;
  refusing past the horizon rather than warning (G21, ratified).
- **Grounded**: the substrate primitives (delete/purge with revision
  checks; purge rollups) are probed and work — FINDING 2 is precisely
  that they work *too well*: terminal immutability is supplied by the
  credential/shape guard, not the mechanism. So compaction needs a
  **declared admin door**: application credentials cannot purge (the
  ACL suite refuses lifecycle ops — that is the fence), and the
  compaction act runs under a distinct declared authority whose act is
  itself fenced and journaled.
- **Law obligation**: the compaction-horizon corollary (M3) is the
  refusal boundary's citable theorem — compacting strictly below the
  minimum anchor floor preserves every deployed fold's resumed terminal
  state (an F3 instance). Negative controls: compaction past the
  horizon refused naming the corollary; an application-credential purge
  attempt refused (DEV-716 suite 1 already covers); **a register-bucket
  purge is lifecycle mutation** — outside the compaction API entirely,
  guarded by the ACL + (later) the incarnation pin, never a retention
  operation.
- **Needs**: grill item 7's sibling — the admin-door shape rides the
  E12 retention ticket; the corollary must land first (M3), which the
  bundle order guarantees.

**Standing refusals to record beside the extensions** (so they are
decisions, not oversights): NATS counter streams (`Nats-Incr`, ADR-49)
stay unadopted — not content-addressed; the lattice discipline stays in
the fabric where its identity and proofs live (part 1 §6.3 already says
this; record it as the answer to "why not server CRDTs"). Server-side
`partition(n)` transforms stay routing-only — partition derivation is
identity-bearing and stays declared client-side. Per-message TTLs stay
refused for identity-bearing lanes — retention is declared policy, never
a per-message flag. `resources/subscribe` on MCP stays RATIFIED-AGAINST.

---

## E. The grill sheet

House style: one decision per item, recommended option first,
alternatives priced. Nothing ratified is reopened. Items 1–4 are
sequencing; 5–6 CLI; 7–11 API extensions; 12–13 DX/model admissions.

**1. Adopt the consolidated model-completion bundle (§A.2) as one
Fable-implemented push in three merge waves — hygiene+families+F9-fields
first, then F7+F11, then F12+F10+C7-wf+corollary.**
Recommended: yes. Front-loading is execution-order over already-ratified
statements with named board consumers and honest no-consumer ledger
sentences (§A.1's four grounds); size 8–11 sessions / 3–5 rounds at
measured calibration; after M3 every application dispatch is
pure-runtime. Alternatives: strict per-slice placement (cards as
written) — zero speculative-carrier risk, but every app slice becomes a
directive-6 mixed slice and serializes behind its model wait, the
charged-against outcome; partial front-load (M1+M2 now, M3 later) —
saves ~3 sessions, leaves E9/slice-2b with mid-slice model joins;
reversal of the bundle at any wave boundary is cheap (waves are
severable, each independently green).

**2. The F12 directory carrier: a separate `Directory` carrier with its
own F1-for-maps ACI package, not a generalization of `Cell` to a
parametric join-semilattice.**
Recommended: separate carrier. It touches no landed proof (the F1 family
stays byte-stable mid-push), matches the B-7 card's default, and the
generalization remains available later as its own ratifiable refactor if
a third lattice carrier ever appears. Alternative: generalize `Cell` now
— one abstraction instead of two carriers, but it reopens the landed F1
statements for re-review inside the same push that builds on them;
priced at one extra session plus one extra review round and a
mid-bundle re-baseline. Reversal of the recommended route: the
generalization subsumes the map package later at known cost.

**3. Split dispatch 31 per directive 6: the decision-8 emitter families
move into the model bundle (wave M1); E4's issue is amended to consume
them, and E4 dispatches day 0 with its wall's family list pinning at
M1's merge.**
Recommended: yes. Dispatch 31 predates directive 6 and is a mixed slice
as written (its one sanctioned `verify/fabric` write is model work);
the split gives `verify/fabric` a single writer for the whole push and
lets E4's Eng seat run Lean-free. The join is the coordinator's; a
family that would need a law change remains a blocker report either
way. Alternative: leave decision 8 in E4 — either a codex seat writes
Lean against directive 6, or E4 stalls mid-slice on an unplanned Fable
sub-dispatch; both priced worse than one planned wave. Reversal: n/a
(the families land identically either way; only the writer changes).

**4. Split E6: dispatch the runtime half (Cell + F1 cell wall, Catalog,
Resolved, ContextProgram scaffolding) at day 0; the assembly wall lands
behind M2's F7 corpus.**
Recommended: yes. Everything the runtime half consumes is merged or
ruled (ResolvedOf adopted via the DEV-705 probe; `Cell.ts` + the F1
vector family ruled to land with E6; module shapes binding in the
architecture record); the F7 dependency is real only for the
byte-identical reassembly wall. Alternative: hold E6 whole until M2 —
one fewer in-flight lane, at the cost of the catalog/cell machinery that
E9 and E11 also queue behind. Reversal: the split is a dispatch-order
fact, free to re-join.

**5. The CLI host: E4's ticket establishes the `@foldlab/plait` bin
with `plait chaos`; `plait dev` ships as a small separate ticket on the
same bin beside DEV-715.**
Recommended: yes. The chaos note's open item 2 needs an owner; E4 is
the first slice that needs an entry point, and `plait dev` is packaging
over the pinned server the tests boot anyway (DEV-697 R4), with the
cluster refusal speaking the DEV-716 gate's envelope. Alternatives:
E2-followup owns the bin (delays `chaos` behind a second dispatch);
no `dev` command (keeps quickstart minute 0–2 at "build it from the Go
module" — the measured friction #1 in the DevRel read). Reversal:
commands are severable; the bin stays.

**6. `plait chaos` reorder axis: arrival-reorder in v0; partition-
reorder deferred until E4's partitioned path has a commutative-branded
sample fold.**
Recommended: yes (the design note's own recommendation, needing the
ruling). Arrival reorder is the duplication harness under a different
schedule — near-free — and exercises F2b, the law this cycle
re-attributed; partition reorder without a real partitioned deployment
would be a staged demo. Alternative: both axes now — buys a fuller
matrix at the cost of building E4's partitioned sample early. Reversal:
add the axis when the sample exists.

**7. Admit `Registers.audit` (KV-history audit API): served, certified
history rows in fence-token order, every row stamped with the
backing-stream incarnation and bounded by declared retention depth.**
Recommended: yes, as an E12-adjacent ticket after M3. Licensed by
F5's I1/I2 (the history is the witness); grounded in probed history
semantics (tombstones, purge rollups, bucket-global revisions);
answers the 2 a.m. operator question from substrate truth. Alternatives:
introspection-only via `register.observe` current-state (cheaper, loses
the audit trail that already exists in the bucket); defer entirely (the
wall keeps auditing privately; operators grep logs). Reversal: a read
surface — removable.

**8. The incarnation pin converts from recorded deferral (T6) to
machinery on a named trigger: whichever comes first of `Registers.audit`
shipping or a deployment where admin credentials leave the operator's
hands.**
Recommended: yes — trigger-named, not scheduled. Until then the DEV-716
ACL suite + the bound sentence are the guard (both halves land with the
cascade). The conversion shape: creation-identity captured at
register-open, revalidated on the existing read-back reconciliation
path, mismatch refuses structurally; walled by a bucket-recreation
control. Alternatives: build it now (un-consumed machinery — the exact
T6 reasoning, still valid); never (leaves the audit API of item 7
unable to be honest across recreations). Reversal: additive guard,
removable.

**9. Watch surfaces are admitted advisory-only, behind a ninth probe
suite on the substrate gate (KV watch semantics at the pin: initial
replay, coalescing, delete markers, resume-from-revision); no absence
reasoning from any watch, ever.**
Recommended: yes. F1 licenses coalesced lattice watches (intermediate
states are skippable by construction); the G9 grammar already refuses
the absence inference; the probe is required because DEV-704 did not
touch watch and the refused-semantics list is exactly where unprobed
assumptions die. Direct-get reads ride the same mechanism if ever
wanted: probe suite first, R=1-only bound stated. Alternatives: admit
watch unprobed (the register slice's FINDING-1 experience argues not);
refuse watch (polling forever — costs the live-UI story E11 needs).
Reversal: suite stays either way.

**10. `Blob.ts` waits on an object-store probe dispatch (put/get
integrity, chunking, partial reads at the pins); the 256 KiB inline
threshold is deployment configuration with a wall, never
identity-bearing.**
Recommended: yes, timed after M2 so it meets E12's embedding consumer.
Verify-on-read extends to blobs (re-derive on read; store metadata has
no identity role — §6.3 refused column). Alternatives: build on the
client docs without probing (the probe-first mandate exists because
FINDING 1 was found by probe, not docs); inline-only v0 (caps payloads
at the server max; blocks embeddings-at-scale and the E10 corpus).
Reversal: probe evidence is permanent either way.

**11. Pre-register the refusal: no batch-as-atomicity surface. Atomic
batch publish is not adopted; pipelining lives adapter-internal with no
public name and no claim; declaration granularity remains the answer to
per-action overhead.**
Recommended: yes. A cross-key atomic batch is a multi-register
transaction — new physics against the CALM split; the unprobed
batch×CAS×dedup interaction sits in the exact class FINDING 1 came
from. Alternative: probe-then-admit a batched anchor-write optimization
if the E10 scoreboard shows anchor-write cost dominating — admissible
later precisely because this item records the bar it must clear (probe
suite + an explicit statement of what atomicity is not claimed).
Reversal: free (nothing built).

**12. Admit the two day-0 codegen deliverables — the generated error
catalogue and the outward glossary — as an early E11 ticket, both
walled served-equals-derived.**
Recommended: yes. Both derive from shipped sources (the refusal union +
its taught `next`s; CONTEXT.md's standard-term entries), both are
DEV-697 recommendations (gaps 2, R2) with named consumers (every
first-page reader; every refusal-handling developer), and the walls
make them maintenance-free by construction. Alternative: hand-written
docs now (drift is guaranteed — the wall exists because the daemon's
MCP surface already taught this lesson); defer to E11 proper (the
cheapest two artifacts wait behind the most complex ones). Reversal:
stop generating; nothing depends on it.

**13. The F6 interim transition table is NOT in the model bundle: it
rides E8's dispatch as that slice's model half.**
Recommended: yes — recorded so nobody bundles it by oversight. Its
consumer is E8's monitor; the fill-fragment automaton depends on REF-4's
close/authority semantics (part 1 §12 risk 6), and emitting early risks
re-work the moment REF-4 moves. The CSLib equivalence theorem stays
G5-deferred regardless. Alternative: emit the table in M3 (completes
the "model lane" optics; builds an artifact with no consumer for two
slices and a named upstream dependency in motion). Reversal: n/a.

---

*Prepared by the Fable planning agent, 2026-08-17. Sources: the
proof-obligation program and its cards (B-1..B-10) with the landed
dispositions; parts 1–3 and the architecture record as amended on main;
the ratification record and consolidated grill sheet (items 1–21); the
DEV-697 DevRel read; the DEV-704 substrate verdict and its §6.3 fold;
the DEV-706 grill verdict (F11/F12 deltas; roster findings routing); the
DEV-717/DEV-720/DEV-722 review chain; dispatches 31/32/33/34; the
local-gates-unification determination; the plait API log 0001–0025; the
board state read via the Multica CLI this session. Tree facts verified
at `main` d1f306c27.*
