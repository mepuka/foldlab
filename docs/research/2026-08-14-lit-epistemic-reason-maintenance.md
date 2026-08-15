# Literature lane: epistemic logic, agreement, truth maintenance, belief bases, provenance

2026-08-14, Opus reader report (verification-key discipline: [P] =
primary text read; [N] = near-primary; [S] = secondary). Fourth of four
lanes; the synthesis document sits beside this file. All substance
retained; quotations preserved where load-bearing.

## 0. Four inequivalent formalizations of "different understandings"

| Formalism | A different understanding is... | Foldlab primitive |
|---|---|---|
| View-based epistemic interpretation (Halpern–Moses §6) [P] | different indistinguishability partitions over runs | head + writ = the view function |
| Belief base (Hansson) [P] | different SETS of explicitly held sentences, even when closures coincide | journal prefix vs fold state |
| ATMS label (de Kleer) [P] | one datum holding in different assumption-environments, all at once | dispute candidate set |
| Told-values / Belnap [P/S] | None / True / False / Both, about what the RECORD was told | hole status |

Within one venue, all participants' views are prefixes of one sequence:
**the indistinguishability partitions are nested — the epistemic lattice
collapses to a chain** (the formal content of "the venue linearizes this
conversation"; it makes D_G = K_{max head}). But agents also hold
private journals, so the real structure is (venue head) ⊕ (private
evidence), which is NOT a chain — every convergence claim must say
which it is about.

**Chandy & Misra, "How Processes Learn" (Dist. Comp. 1, 1986)** [N]:
knowledge of remote events requires message chains; nested knowledge
requires nested chains. Halpern–Moses note their processor knowledge
"essentially corresponds to distributed knowledge" [P, fn. 3]. **Import
as the justification that the fold is complete: an agent's knowledge is
exactly a function of its causal past, and the journal prefix IS its
causal past.**

## 1. Halpern & Moses, JACM 37(3), 1990 [P, arXiv cs/0006009]

Hierarchy: C_G ⟹ ... ⟹ E^k_G ⟹ ... ⟹ E_G ⟹ S_G ⟹ D_G ⟹ φ. C_G
satisfies the fixed-point axiom C_G φ ⇔ E_G(φ ∧ C_G φ) and the
induction rule. Graph reading over the journal: E^k = k-step
reachability; C = the connected component.

Impossibilities, exact: **Lemma 2** — when a fact becomes common
knowledge, ALL members' local histories change SIMULTANEOUSLY.
**Prop. 4** — simultaneous coordinated action ⟹ common knowledge.
**Thm 5 / Cor. 6** — without guaranteed communication nothing new
becomes C; coordinated attack has no correct protocol (and no fixed
E^k suffices). **Thm 7** — same under guaranteed-but-unbounded delivery
(the asynchronous case — ours). **Thm 8** — with temporal imprecision,
C is unattainable in ANY practical system ("even people cannot attain
common knowledge of any new fact"). **Thm 11** — asynchronous channels
cannot attain ε-common knowledge: no bounded-time coordination, ever.

Attainable variants [P §11-12]: **C^◊ eventual common knowledge**
(reliable asynchronous broadcast: a receiver KNOWS sent(m) is ◊-common
knowledge); **C^T timestamped common knowledge** (K^T_i = at time T on
HIS clock; all S5 except the knowledge axiom); **Thm 12(c)**: if each
local clock is guaranteed to read T at some time, C^T ⟹ C^◊. HM's own
worked example: phase-numbered protocols and atomic broadcast — **the
effector's fence number is literally HM's phase counter.**

**Internal knowledge consistency** [P §13]: an interpretation failing
the knowledge axiom may still be such that no processor can ever have
information exhibiting a violation. Applied by HM to distributed
commit's window of vulnerability.

**Knowledge-based programs** (Fagin-Halpern-Moses-Vardi, Dist. Comp.
10(4), 1997) [N]: programs with knowledge tests may have zero, one, or
many implementations; a sufficient condition gives uniqueness.
`frontier(head)` IS a knowledge-based program's test — well-defined
because the tests run over a totally-ordered prefix (the sufficient-
condition regime). Cite, don't assume.

### The two answers

**Is a fence decision the creation of common knowledge? NO — and the
gap is load-bearing.** By Lemma 2 + Thm 8, C is out. What the fence
attains: **timestamped common knowledge C^T at timestamp = the fence
number / head, hence (Thm 12(c), because the venue journal is a
reliable asynchronous broadcast — durable, single-homed, verify-on-
read) eventual common knowledge C^◊.** Consequences: (1) `decided` is
HEAD-RELATIVE — a global decided(hole) predicate in the watch API is a
type error against the epistemics; only decided_h exists. (2) No SLA,
timeout, or "within Δ" coordination promise is ever sound (Thm 11) —
only "eventually". (3) The at-least-once-execution / exactly-once-
commitment decomposition IS internal knowledge consistency — a theorem
to PROVE (eager actors never obtain information violating the knowledge
axiom, because committed outcomes are never overwritten).

**Does the impossibility explain why fence-free agreement cannot
exist? Only partly — and citing coordinated attack would overclaim.**
Fence-free agreement on VALUES is possible: **Parikh & Krasucki (JET
52(1), 1990)** — fair pairwise exchange on a strongly connected graph
yields agreement (no seat, no broadcast); Geanakoplos–Polemarchakis
(JET 28(1), 1982) — posterior exchange converges finitely (with no
visible progress until the end); **Aaronson (STOC 2005)** — (ε,δ)-
agreement in O(1/(δε²)) messages, INDEPENDENT of how much evidence
exists. **The correct justification of the fence is Prop. 4
(simultaneity ⟹ C) composed with CALM (non-monotonicity ⟹
coordination) — not coordinated attack**, which is about simultaneous
action, a requirement foldlab does not have. Warning: Parikh–Krasucki's
C and Halpern–Moses's C live in different models; do not chain them.

## 2. Aumann agreement and refinements

**Aumann (Ann. Stat. 4(6), 1976)**: common prior + common knowledge of
posteriors ⟹ equal posteriors. Structural version: E is common
knowledge at ω iff the cell of the MEET (finest common coarsening) of
the partitions containing ω is inside E — equivalently iff a
**self-evident event** implies it. **Design spec for a fence: a
decision alone is not evident; a decision plus acknowledgements written
back into the journal is.** Refinements: Geanakoplos–Polemarchakis;
Aaronson (bounds above; standard protocol not optimal, Thm 7);
**Rubinstein's e-mail game (AER 79(3), 1989)** — approximate common
knowledge is NOT approximately common knowledge; the sound weakening is
**Monderer–Samet common p-belief via p-evident events** (GEB 1(2),
1989) — in our architecture, acks in the journal; no weaker notion
suffices (Monderer-Samet 1996, Kajii-Morris 1998). Newest: Pawlowitsch
et al., (δ,ε)-common knowledge, arXiv:2606.11902 (2026) — read before
formalizing anything approximate.

**The claimable contribution: the common prior is COMPILED, not
assumed.** The declared fold algebra enforces same-prefix ⟹ same-state
(E2 claim 1). Hence any residual disagreement is purely informational
and provably dissolves under exchange. **Disputes bifurcate:
INFORMATIONAL (heads differ — dissolve by head exchange, bounded
independent of evidence size) vs AUTHORITATIVE (same facts, different
fills — non-monotone, require the seat by CALM).** Current design pays
a fence for both. **Add a reconciliation phase (exchange heads on CAS
refusal; escalate only survivors) and instrument the ratio —
informational vs authoritative contention, a number no agent framework
reports.** Caveats: Aumann governs posteriors on a shared state space,
so the import is the qualitative bifurcation, not numeric bounds; and
it applies to the fold, never the LLM proposer (which the architecture
already quarantines).

## 3. Truth maintenance

**The clean statement: the journal is an ATMS; each agent is a JTMS;
the fence is neither — it is the incision function** (Hansson's σ,
choosing from each kernel; = JTMS dependency-directed culprit choice,
Doyle §4). de Kleer 1986a: ATMS = "problem solving in multiple contexts
simultaneously... context switching is free" — holding both dispute
candidates IS multiple contexts. Doyle 1979 §2.1: "The distinction
between in and out is NOT that between true and false" — an unfilled
hole is out, not false: the typed-refusal-for-absence rule, stated
1979.

Definitions to import verbatim: environment (assumption set), context
(assumptions + everything derivable), label (set of environments per
node), nogood ("the label ⊥ would have"). The four label properties
(sound, consistent, complete, minimal) — cite Forbus & de Kleer 1993
§12.1.3 p. 432 for the numbered form.

**The finding that touches task 48: fence determinism is vacuous until
the candidate set is canonical.** A function of a set is deterministic
only if the SET is schedule-invariant. **Reiter & de Kleer (AAAI-87)
Thm 7**: the ATMS label = the minimal supports = the prime implicates
of the justification set (their "prime implicant" is the dual; modern
name: prime implicate). So when candidates derive from justifications,
the well-definedness conditions are **label minimality** (no
candidate's support ⊃ another's) and **label completeness** (every
consistent environment supporting a rival contains some candidate's
environment), as step-preserved invariants. In the current value-only
model, theorem 4(a) (terminal candidate set interleaving-independent)
IS the canonicity companion; when justifications arrive (protocol
grill), minimality/completeness become explicit obligations.

**Complexity, honestly**: label size exponential in assumptions in the
worst case — realizable "even for Horn clauses without implication
cycles" (McAllester AAAI-90: single ATMS query can need exponential
time AND space); Reiter & de Kleer: exponentially many prime
implicants exist. Do NOT assert "label update is NP-complete" (no
primary source found). Foldlab's saving grace is structural: typed
per-protocol holes keep labels small — **make that a stated invariant
with a bound, not an accident.**

**Focus and consumers** (Forbus & de Kleer 1993): the three-tier rule
ordering intern ⊃ in ⊃ implied-by is a ready-made ladder for watch
stability tiers ("the CMOS design has not become inconsistent, it has
simply become IRRELEVANT"). The **consumer discipline** [1986c §3] is
the watch contract, solved in 1986: consumers run once per node, may
examine only antecedent data, no internal state — "the order of
consumer execution has no effect on the final problem-solver state."
Import the restrictions as type-level watch constraints.

**Distributed TMS — where foldlab is AHEAD.** Bridgeland & Huhns
(AAAI-90; IEEE TSMC 21(6), 1991): four consistency degrees
(Inconsistency / Local / Local-and-Shared / Global), and verbatim:
"To guarantee Global Consistency would require interagent communication
and global relabeling after any inference step... **This is clearly
impractical.**" Neither DTMS nor DATMS communicates JUSTIFICATIONS —
prohibitive in 1990. **Content-addressing + verify-on-read makes the
declared-impractical thing cheap: a fold over a verified prefix IS the
relabeling — local, deterministic, cacheable by (fold digest, head).**
A thirty-year-old dismissal with a mechanism against it; R2-post
material.

**The highest-severity gap the survey found**: DTMS's INTERNAL/EXTERNAL
datum typing exists to prevent **distributed ill-foundedness** — a
belief circularly supported only by agents citing one another.
"Evidence mirrors freely" has the exact hazard: venue A hosting a
decision justified by mirrored evidence from venue B whose
justification traces back to A. Content-addressing prevents tampering,
not circular support. **Add: every mirrored entry carries its
originating venue and seat; every fence decision's support must be
INTERNAL to at least one participant of the deciding venue.** Small,
checkable in the certify walk.

Open in our favor [verified negatives]: no communication-complexity
result for distributed truth maintenance exists; no distributed
analogue of the label properties; Aaronson's technique is the natural
tool.

## 4. Belief bases, paraconsistency, provenance

**Belnap four values** (via Entailment II 1992): None/True/False/Both —
about what the RECORD was told, not the world; two orders (information
vs logical); connectives monotone in the information order. `Both` is a
legitimate record state — **cite Belnap, not Priest, for "we retain
contradictions without exploding"**; the information/logical split is
the formal reason the journal holds Both while the fold answers logical
queries.

**Rescher–Manor / Batens**: maximal consistent subsets; consequence
relations Free/Strong/Weak/C-Based/Argued. Batens: the suitable context
is "each premise has a different source — an MCS is a set of jointly
consistent sources" — the journal exactly (seat-attributed entries).
**Design import: ship `⊢_Strong` ("holds however the dispute
resolves") as the default fold and `⊢_Weak` ("could hold under some
resolution") as the frontier** — and note Strong = ATMS
holds-in-all-interpretations, Weak = nonempty label: the literatures
agree.

**Hansson static vs dynamic equivalence — the sharpest finding
against the core claim.** {p, q} and {p, p↔q} have the same closure
(statically equivalent) but different revision behavior (dynamically
inequivalent). The (fold digest, head) key certifies static
equivalence; incision cuts KERNELS — base-level objects invisible to
the closure. **Consequently (fold digest, head) is a sound cache key
for queries and an unsound key for dispute resolution — unless the
fence rule provably factors through the closure. Prove it (small, model
scale) or key dispute state on the base.** Recovery failing is correct
here (cite Hansson for base theory; foldlab is a FOUNDATIONS system in
Doyle 1992's sense — with SEP's caution against flatly equating bases
with foundationalism).

**Provenance corrections** to material already held: **Amsterdamer–
Deutch–Tannen (PODS 2011) Prop. 3.2** — no K-relation semantics for
MAX/MIN (or SUM) aggregation that is compatible and commutes with
homomorphisms; the repair is the tensor K ⊗ M (semimodules), and
**Thm 3.12: idempotent monoids are safe. Decision rule: idempotent
folds (join/max/union-shaped) are inside the framework; any fold that
COUNTS, SUMS, or TALLIES needs K ⊗ M — make this a refusal in the fold
algebra's admission, not a footnote.** Difference/negation also strains
the framework (TaPP 2011) — disputes and retractions are
difference-shaped. **Grädel & Tannen (arXiv:1712.01980, 1907.08470)**:
dual-indeterminate polynomial semirings where positive and negative
tokens annihilate by congruence rather than exploding — the closest
formal object to a dispute over annotated evidence; unexploited.

## 5. Cross-cutting gaps

1. **No split-view guard on the venue.** Verify-on-read certifies
   entries, not prefix freshness/completeness; a malicious venue can
   fork views. The spec is **fork consistency / fork-linearizability**
   (Mazières & Shasha PODC 2002; SUNDR OSDI 2004): a forking server
   permanently forks views — detectable only by out-of-band gossip.
   Epistemically: once the indistinguishability structure forks it
   never rejoins. SUNDR's hash chains + signed version structures are
   most of what go/journal already does.
2. **The head-CAS is an audit primitive, not a meaning primitive.**
   Herlihy 1991: CAS is consensus-∞; a monotone-only journal is a
   grow-only CvRDT (consensus number 1). "We spend a universal object
   exactly once per genuine decision, and never for evidence."
3. **Fence liveness is an assumption**: FLP + Chandra-Hadzilacos-Toueg
   (Ω is the weakest failure detector). **The protocol value must
   declare its failure-detector/liveness assumption** alongside holes,
   seats, fence rule; a protocol that cannot state it cannot be
   certified live.
4. **Stability has a syntactic characterization**: public announcement
   logic (Plaza 1989; Baltag-Moss-Solecki 1998; van Ditmarsch et al.
   2007). The refuted naive predicate is **Moore-shaped**
   (p ∧ ¬K p — self-refuting on announcement). Successful formulas =
   preserved under submodels = positive/universal fragment. **Prove:
   the watch combinator grammar generates only formulas preserved
   under journal extension** — one theorem, subsumes the stability
   law, 35 years of literature behind it.
5. **No place for an agent that is wrong.** The fold produces knowledge
   (same prefix, same state, verified); the LLM proposer produces
   BELIEF, and a fill from belief is downstream-indistinguishable from
   evidence. DTMS's INTERNAL/EXTERNAL typing is the minimal machinery —
   same fix as the ill-foundedness guard.

## Top 5 changes

1. **The fence attains C^T (fence number as timestamp) hence C^◊ —
   never C.** decided is head-relative; no bounded-time coordination
   promises; internal-knowledge-consistency is the eager-action
   license, to be proved.
2. **The venue's contract is reliable eventual delivery + one seat for
   the non-monotone step; the head-CAS is anchoring/audit.** Add fork-
   consistency spec + gossip detection.
3. **Disputes bifurcate informational/authoritative; add
   reconciliation-before-fence and instrument the ratio.**
4. **Journal=ATMS, agent=JTMS, fence=incision; candidate-set canonicity
   is the companion fence-determinism needs** (in the value-only model,
   theorem 4(a) supplies it; with justifications, label minimality +
   completeness become obligations). INTERNAL/EXTERNAL typing closes
   distributed ill-foundedness — highest severity.
5. **Fold-digest identity is coherence-level; dispute resolution is
   base-level** — prove the fence factors through the closure or re-key;
   idempotent folds only, or K ⊗ M.

Two open problems in our favor (pre-register): communication complexity
of distributed truth maintenance (nobody has bounds; Aaronson's
technique + the content-addressed journal are the tools); global
consistency across a shared dependency network, declared impractical in
1991, made cheap by fold-over-verified-prefix relabeling.
