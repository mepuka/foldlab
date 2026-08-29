# REIFICATION-SUBSTRATE — sorts, kinds, and the road to full Effect program reification

RATIFIED by the operator 2026-08-29, in-session ("proceed apace"): P0-P8 stand as proposed (P2 ratified-DEFERRED), the growth order G0-G8 stands, agentStep is named F3's first consumer (P7), the guarded table is forms-not-tag-16 (P6, amending DESIGN.md §3.1), and the typed-edge promotion is one slice (P5).
(Landed verbatim by the coordinator from the scout's report; the scout ran
read-only. Full text in the session record; this file is the grilling copy.)

## 0. Blockers, first

B-A — Cas.value's reserved set is six tags short of the ratified registry:
kindTags.ts:19-27 reserves {0x48,0x57,8,9,10,0x53,0x47}; REGISTRY.md ratifies
nine sorts. value(1), file(11), entry(12), context(13), step(14), cont(15) are
undefended — a caller can mint a typed projection at 0x0D/0x0E and give a
reification sort a second public interpretation. LIVE correctness hole; ruling
ask P0 (generate ReservedKindTags from manifestV0).

B-B — No Lean path from a described VALUE to a store node. The $link sentinel
(Codec/References.lean:15-16) never meets the typed-DAG layer (Values/Refs.lean
:43,163-207, which consumes RValue — used in exactly one file). Consequence:
Cas.Schema.Exchange cannot be put from Lean; every emitter is a Lean exe, so
any described-kind reification target is a generator Lean cannot drive. THE
decisive constraint; the El → RValue → Node bridge (~150 lines, 2 files)
clears it and pays out four times (topology, exchange authorship, every future
cas_struct kind, Refs.lean's own named coherence law).

B-C — encodeProg_wf's Level-0 proof does not survive a branch line: encodeLine
hardcodes refs=[] and the flat lines++[table] layout stops being children-first
when arms (closed programs, with addresses) appear. Repair known: recurse the
layout like Tree.flatten. Must precede any guarded-table encoding.

B-D — Ty.context: RATIFIED tag, no Tree constructor, one formless manifest row,
only consumer at the Node layer (AgentStep.contextNode).

B-E — agentStep branches on an answer (require over a loaded node's tag), so it
has NO defunctionalized spelling — it is the estate's only inhabitant of the
guarded-table admissibility rule AND the only user of Ty.context. The first
consumer of the guarded table and of the context sort is the same fourteen-line
program, already in the tree.

B-F — "typed edges are the named follow-up" is written three times (schema
$defs, git SHA-1 edges, exchange subject chain); a topology makes four. Ruling
P5: one promotion slice, not four.

## Key measurements

- Ty amplification, measured off landings: schema sort +96/5 files; git sort
  +59/7 files (+ manifest row surcharge ~+33 today). Reference discipline
  surcharge in TreeProg.progK_run: leaf ~9 lines, one child ~45, two ~72, a
  LIST of children: no pattern exists (~250-400 est., kernel-hazard files).
- F3's Ty slice (ratify 14/15): ~5 files, +55/−26 — THE CHEAPEST sort
  ratification yet (no Tree constructors → Tree/TreeProg/EmitProg untouched);
  blocked only on P4 (Form.witness widening), else the formless guard forces a
  fake Tree constructor.
- DESIGN.md B7 is STALE: its three blocking obligations (decodeLine round trip,
  readLine exactness, decodeProg) were discharged 2026-08-29.

## The four answers

1. CONTEXT: give Ty.context a manifest Form with a FREE reference discipline
   (RefDiscipline.free arm; guard = every edge resolves to a ratified sort via
   Ty.ofTag — new law, currently checked by nothing) and a NODE witness, not a
   Tree constructor (P2 deferred at 250-400 lines). R15/Exchange then needs one
   line: an ExchangeSubject context arm.
2. PROGRAM SYNTHESIS: ratify 14/15 after P4; the guarded table is FORMS on
   step/cont (3rd/2nd), never a third tag — arm polymorphism is impossible at
   a new tag (one expected tag per reference) and two tags = two spellings of
   one program, which R4 refuses (amends DESIGN.md §3.1). First consumer:
   agentStep (P7), discharging DESIGN.md slice 5's consumer gate.
3. LAYER GENERATION: a topology is a schema-plane described kind (cas_union
   SystemNode, Exchange.lean's 85-line shape, children as StoreRefs → SYS5
   acyclicity free). The emitter needs ZERO new fragment forms (Ts.Expr.call +
   ConstDecl.type + LayerType.lower); lake exe materialize is the pipeline
   pattern. The missing piece is B-B's bridge, not a sort. Smallest slice:
   bridge (~150) + System.lean (~85) + EmitLayer (~90) + tools/EmitLayers
   (~57) + the Context-key-set differential. No Ty change.
4. UNIFIED: the grammar plane has laws and no growth path; the schema plane
   has growth and no laws; B-B's bridge is the one piece of machinery joining
   them. Health metric: the formless-row count (three today; zero after P4;
   adding a fourth is going backwards).

## Growth order

G0 generate kindTags from manifestV0 (~30 lines; clears B-A) →
G1 widen Form.witness to tree|node (~15 net; two guards RETIRE) →
G2 RefDiscipline + context's form (~35; R11 manifestVersion call) →
G3 ratify 14/15 (+55/−26) → G5 guarded table on agentStep (B-C relayout +
the agreement theorem; cost declined to estimate); with
G4 the El→RValue→Node bridge (~150; clears B-B) AS A CONCURRENT LANE from
day one → G6 layer generation (~230 on top) → G7 the exchange context arm
(one line) ; G8 Tree.context deferred, counted.

## Ruling asks

P0 generated tag registry · P1 RefDiscipline arm · P2 Tree.context (DEFER) ·
P3 don't land P2 in slice one · P4 witness widening (guards :544/:548 retire) ·
P5 typed-edge promotion is ONE slice not four · P6 guarded table = forms not
tag 16 · P7 agentStep named F3's first consumer · P8 manifestVersion bumps
(RefDiscipline JSON key; later cas_run growth).

## Deliberate gaps, counted: nine

Tree.context deferred · $defs edges · git SHA-1 edges · exchange chain edges
(2-4 = one decision, P5) · El(.decl)=Empty · Refs.lean coherence (G4 pays it) ·
unwrap/suspend/catchCause refused by absence · process→world open (honest cap:
recomputability of what was described, never fidelity to what is running) ·
entry's free arity is a codec fact, not yet a form fact.
