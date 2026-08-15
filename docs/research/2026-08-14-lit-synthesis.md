# The four-lane literature synthesis: what we import, what we owe, what we decide

2026-08-14, closing the sweep the operator requested ("look into the
literature so we understand what we may have to prove or model
properly"). The four lane reports, persisted beside this file:

1. [Monotone determinism](2026-08-14-lit-monotone-determinism.md) —
   LVars, CALM, CRDTs, Bloom^L.
2. [Disputes & argumentation](2026-08-14-lit-disputes-argumentation.md)
   — Dung semantics, ontology mismatch taxonomy, DL repair, dialogue
   games.
3. [Belief revision & merging](2026-08-14-lit-belief-revision-merging.md)
   — AGM/Hansson, IC postulates, judgment aggregation.
4. [Epistemic logic & reason maintenance](2026-08-14-lit-epistemic-reason-maintenance.md)
   — Halpern–Moses, Aumann/Aaronson, ATMS/JTMS, Belnap, provenance.

Method note: the lanes ran blind to each other. Convergences below are
independent; they carry more weight than any single citation.

## 1. Where the lanes converge (the load-bearing agreements)

**C1. The fence seat is forced by non-monotonicity — three lanes,
independently.** Lane 1: CALM's Theorem 12 — deciding needs
completeness of the candidate set, an absence check, non-monotone,
hence coordination. Lane 3: fill/dispute are monotone in Belnap's
information order; decide is the one non-monotone move. Lane 4: the
same via Prop. 4 + CALM composed (and: do NOT cite coordinated attack,
which is about simultaneity we don't need). Design assertion → citable
theorem. The single seat is not a choice; it is the price of exactly
one move class.

**C2. The stability law is real, has prior art, and now has a
syntactic home.** Lane 1: Threshold Consistency (Joining Forces Def. 6)
and Laddad et al.'s monotone CRDT queries — the law verbatim. Lane 2:
directionality (Baroni–Giacomin) — the shard-locality version. Lane 4:
public-announcement logic — successful formulas are those preserved
under submodels; the refuted naive predicate is Moore-shaped
(p ∧ ¬K p). What is genuinely ours: stability as a PROTOCOL obligation
(seats-as-seal, lane 1's naming), enforcement in types, and the theorem
to prove: the watch combinator grammar generates only
journal-extension-preserved formulas.

**C3. The candidate set needs more structure — three different
deficiencies, one record shape.** Lane 2: no attack relation (every
dispute is K_n, all semantics degenerate; and no reasons means no
principled rule can exist). Lane 3: no multiplicity (Finset forecloses
plurality — the unique language-independent operator — and cannot even
state fairness or dictatorship). Lane 4: no canonicity conditions when
candidates derive from justifications (label minimality/completeness),
and no INTERNAL/EXTERNAL provenance typing. One repair direction: the
dispute record grows (holder-keyed multiplicity now; attack kind enum
and justification pointers at the protocol grill).

**C4. min-by-canonical-bytes: acquitted of one charge, convicted of
two.** Acquitted: IC4 fairness is unsatisfiable by ANY resolute fence
(lane 3; Moulin trilemma) — min is forced, up to choice of order.
Convicted: (a) language dependence — the winner changes under
re-encoding (SIN-M, provably independent of IC compliance); (b)
manipulability — an agent injects a low-digest candidate via dispute
and wins (lane 3's concrete attack; lane 2's "dictatorship over
alternative names"). Verdict: keep a deterministic order as the LAST
tie-break in a declared lexicographic criterion order; let the fence
return UNDECIDED (the oligarchy escape foldlab already lives in);
route most dispute kinds away from any fence at all (lane 2's
taxonomy table).

**C5. The novelties survived four adversarial literatures.** Confirmed
as genuinely unclaimed anywhere surveyed: (1) the two-fold separation —
committing a linearization certificate while meaning stays confluent
(lane 1: "no surveyed system does this"); (2) repairable refusals —
fill → refusal → dispute preserving confluence, where every surveyed
error is terminal (lanes 1, 3); (3) evidence-carrying ⊤ — disputed(cs)
instead of error (lane 1); (4) the compiled common prior — same prefix
⟹ same state digest as an enforced invariant, making Aumann's
assumption a build artifact (lane 4); (5) fold-over-verified-prefix as
the "clearly impractical" global relabeling of 1991 distributed TMS
(lane 4). Items 4 and 5 are R2-post headlines.

**C6. decided is stronger than we said, and head-relative.** Lane 3:
decided = maximal entrenchment (treating the value as unrevisable — an
epistemological commitment to name as a law). Lane 4: the fence attains
timestamped common knowledge C^T (fence number = HM's phase clock),
hence eventual common knowledge C^◊ — never C; therefore decided is
decided_h, no global predicate exists, and no bounded-time coordination
promise is ever sound.

## 2. The import ledger (cite, never reprove)

| Theorem | Source | What it licenses |
|---|---|---|
| LVars determinism proof chain (frame → diamond → strong local confluence → determinism) | Kuper & Newton FHPC'13 | task 48's proof skeleton; no Newman's lemma needed |
| Threshold Consistency; monotone CRDT queries | WoDet'14 Def. 6; Laddad PVLDB'22 | the stability law's formal statement |
| CALM (monotone ⟺ coordination-free) | Ameloot et al. JACM'13 | the fence's existence; sealing for single seats |
| SEC + emulation theorems | Shapiro et al. SSS'11 | two-fold architecture (op-based moves / state-based fold); hash chain = causal delivery |
| Path independence | Plott '73 | fence_deterministic for ANY fixed-preorder rule |
| IC4-unsatisfiability; anonymity/neutrality/resoluteness trilemma | K&PP '02; Moulin '83 | min is forced; stop apologizing |
| Relative Success; screened revision | Hansson et al. JSL'01; Makinson '97 | the refusal + repair discipline's postulates |
| Oligarchy escape; quota rules; status-quo rule | Dietrich & List '07/'08; Nehring & Puppe '10 | disputed-as-output is principled; multi-seat designs |
| Grounded semantics: P-complete, unique, directional | Dung '95; Dvořák & Dunne | the principled default fence over reified attacks |
| Mismatch taxonomy (11 kinds, 4 axes) | Klein '01; Euzenat & Shvaiko '13 | the dispute routing table |
| Justifications; repair = hitting sets | Kalyanpur '07; Reiter '87 | type-level disputes; enumeration budgeting |
| C^T/C^◊; internal knowledge consistency; knowledge-based programs | Halpern & Moses '90; FHMV '97 | what the fence attains; eager-action license; frontier well-definedness |
| Agreement bounds | Aumann '76; G-P '82; Parikh-Krasucki '90; Aaronson STOC'05 | the informational/authoritative bifurcation; reconciliation-before-fence |
| ATMS/JTMS definitions; consumer discipline; focus tiers | de Kleer '86; Forbus & de Kleer '93 | journal/agent/incision naming; watch contract; stability ladder |
| Belnap four values; Rescher-Manor Strong/Weak | Entailment II '92; Batens '03 | Both as legitimate record state; the two default folds |
| Fork consistency | Mazières & Shasha PODC'02; SUNDR OSDI'04 | the venue's split-view spec |
| Consensus numbers | Herlihy '91 | head-CAS as audit, not meaning |
| Ω as weakest failure detector | Chandra-Hadzilacos-Toueg '96 | protocols declare liveness assumptions |
| Aggregation provenance (idempotent-safe; K ⊗ M otherwise) | Amsterdamer-Deutch-Tannen PODS'11 | admission rule on fold algebras |

## 3. The prove ledger (ours, ranked)

**In task 48 (dispatched, amended twice):** fill_comm, conflict_surfaces,
step_preserves_wf, fence_deterministic-as-path-independence, stability
(decided_stable + value-consistent single-seat), no_loss,
clash_repair_confluence, clobber_diverges, lww_converges + lww_loses,
filled_unstable, fence_manipulable, no_fair_resolute_fence.

**Next wave (behind the protocol grill):**
1. Watch-grammar preservation: the combinator grammar generates only
   formulas preserved under journal extension (subsumes the stability
   law; DEL positive-fragment result as the guide).
2. Internal knowledge consistency of eager action (the at-least-once /
   exactly-once license).
3. Fence-factors-through-closure, or re-key dispute state on the base
   (Hansson's static/dynamic gap).
4. Termination + correspondence for the dialogue protocol (cite-the-
   catalog restriction; grounded-game soundness/completeness).
5. Conservativity of fills w.r.t. ingested catalogs.
6. The ill-foundedness guard: fence decisions require INTERNAL support
   in the deciding venue (certify-walk checkable).
7. Label minimality/completeness once candidates carry justifications.

**Pre-registered open problems (estate-of-safety pattern — ours to
attempt, nobody has them):** communication complexity of distributed
truth maintenance (Aaronson's technique + content-addressed journal);
the 1991 "global consistency is impractical" reversal, stated as a
theorem about fold-over-verified-prefix relabeling.

## 4. The decision sheet (operator ratification queue)

**D1 — the by-field ruling.** Drop `by` from the filled meaning state;
provenance lives in journal entries. (Confirmed defect; recommendation
already in task 48 Addendum 1.A; codex builds this form.)
RECOMMENDATION: ratify.

**D2 — candidate structure.** Upgrade dispute candidates from
Finset Value to a holder-keyed multiset (a holder's redelivery
collapses; distinct holders' identical proposals count). Unlocks
plurality (the unique language-independent operator) and makes
fairness statable; preserves redelivery idempotence. The attack-kind
enum and justification pointers come later, at the protocol grill.
RECOMMENDATION: ratify the multiset now (it is upstream of any real
fence rule); defer the rest.

**D3 — the revise fork.** Options: (A) Success/prioritized — agent's
later commitment wins; Levi gives revise = retract;fill; BREAKS
fence_deterministic. (B) Relative Success — refusal-or-unchanged; what
the current discipline already satisfies. (C) merging-as-now — the
self-dispute; no self-correction without the fence.
RECOMMENDATION: keep (B)/(C) now — the E2 semantics stands, named
honestly ("no prioritized self-revision; correction goes through the
fence") — and revisit per-protocol once protocols can declare a revise
policy. Choosing (A) globally would trade away the theorem the whole
edifice rests on.

**D4 — the fence direction.** (i) Typed routing first (most dispute
kinds never reach a fence); (ii) UNDECIDED becomes a legal fence
outcome (the oligarchy escape); (iii) the default rule becomes a
DECLARED lexicographic criterion order (seat authority →
conservativity → provenance recency → multiplicity once D2 lands →
canonical bytes last), path-independent by construction; (iv) grounded
semantics over reified attacks is the target once reasons enter the
journal; (v) reconciliation-before-fence: exchange heads on CAS
refusal, escalate only survivors, instrument the informational-vs-
authoritative ratio.
RECOMMENDATION: ratify as the protocol grill's frame.

**D5 — the venue hardening set.** Fork-consistency specification +
gossip fork detection (SUNDR-shaped; go/journal already has the
mechanics); INTERNAL/EXTERNAL evidence typing with the
ill-foundedness guard; every protocol declares its liveness assumption
(failure-detector class). RECOMMENDATION: ratify as named obligations
on the daemon/protocol roadmap (not immediate builds).

**D6 — watch API epistemics.** decided is head-relative everywhere;
payloads constrained to the stable fragment (not just predicates —
lane 1's leak); handlers retroactive from head 0 (late subscription
must not change what fires); morphism vs monotone tiers decide
incremental vs re-fold evaluation. RECOMMENDATION: ratify as the
stable-watch surface's design constraints.

## 5. What did NOT survive the sweep

- "The fence creates common knowledge" — false; it creates C^T/C^◊.
- "Coordinated attack explains the fence" — wrong theorem; use
  Prop. 4 + CALM.
- "min-by-bytes is a placeholder awaiting a fair rule" — no fair
  resolute rule exists; min is forced up to order choice.
- "The candidate Finset is an implementation detail" — it is an
  expressiveness ceiling (no majority, no fairness, no dictatorship
  even statable).
- "Claim 1 holds" unqualified — refuted for same-value multi-writer
  fills until D1 lands.
- "Fence determinism protects the system" unqualified — it protects
  the fence; the candidate set's schedule-invariance (theorem 4(a) in
  the value-only model) is the necessary companion.
