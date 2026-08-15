# Literature lane: belief revision, merging, judgment aggregation, non-prioritized revision

2026-08-14, Opus reader report, persisted with all substance intact.
Third of four lanes; synthesis when all land.

## 1. AGM and what a lawful `revise` owes

Sources: AGM (JSL 50(2), 1985); Gärdenfors & Makinson (TARK'88);
Gärdenfors, Knowledge in Flux (1988); Levi identity (Synthese 34, 1977)
`K*p = (K÷¬p)+p`; Katsuno & Mendelzon (KR'91, revision vs UPDATE);
Darwiche & Pearl (AIJ 89, 1997, iterated revision); SEP "Logic of
Belief Revision".

Mapping: `fill` on open = EXPANSION (K+p), not revision — Vacuity covers
it. `fill` conflicting = the case revision exists for, and the model
refuses it: **the model has no revision operator; `revise` is a new
move class.**

**The fork that cannot be dodged** — `revise h v` on `filled w` by the
same holder must satisfy exactly one of:
- **(A) Success** (prioritized AGM): later commitment wins. Then the
  self-dispute discovery is WRONG for this case, and Levi gives the
  implementation free: `revise = retract ; fill`. Cost: prioritized
  revision is order-dependent — **choosing Success breaks
  fence_deterministic**; the order-independence theorem exists only
  because the model refused Success.
- **(B) Relative Success** (Hansson–Fermé–Cantwell–Falappa, JSL 66(4),
  2001: `α ∈ K∘α or K∘α = K`): the refusal discipline ALREADY satisfies
  this verbatim — import the postulate. But the self-dispute is a third
  outcome the postulate does not license.
- **(C) Merging semantics** (what E2 does): the past self is a distinct
  source. Coherent — but it means no agent can ever correct itself
  without invoking the fence.

The model currently has no "same source" notion at the fence, so it
cannot express (A) or (B). Second undeclared fork: revision (belief was
wrong, world static — R1-R6) vs update (world changed — U1-U8,
Katsuno-Mendelzon); the self-revision case is where it bites.

Where the model is wrong by this literature's lights: (1) **AGM is the
wrong citation — Hansson's belief BASES govern** (Textbook of Belief
Dynamics 1999; Kernel contraction JSL 59(3) 1994): provenance-carrying,
syntax-sensitive, Recovery fails and that is correct here. (2) The
Value byte order is NOT an entrenchment order (EE2 Dominance fails) —
never call it one. (3) **`decided` irrevocability = maximal
entrenchment = treating the decided value as a tautology** (EE5) — an
unnamed epistemological claim that should be an explicit law.
(4) Iteration is underdetermined (Darwiche-Pearl C1-C4) — any `revise`
inherits the gap.

## 2. Merging: IC postulates and the fence verdict

Sources: Konieczny & Pino Pérez (KR'98; ECSQARU'99; JLC 12(5) 2002 —
definitive for IC0-IC8 + representation theorems; JPhilLogic 40(2)
2011); Konieczny-Lang-Marquis (AIJ 157, 2004); Revesz (arbitration,
1997); **Marquis & Schwind (AIJ 206, 2014 — language independence)**;
Everaere-Konieczny-Marquis (JAIR 28, 2007 — strategy-proofness); Mata
Díaz & Pino Pérez (AIJ 251, 2017 — epistemic Arrow); SEP "Belief
Merging and Judgment Aggregation".

IC0-IC8 as in JLC 2002 (Δ_μ over MULTISET profiles; IC3 = syntax
irrelevance; IC4 = fairness/symmetry between two bases; IC5/IC6 =
subprofile coherence; Maj = repeated subgroup prevails; Arb = median).
Representation: IC operator ⟺ syncretic assignment. Operator table:
Δ^{d,Σ} = majority; Δ^{d,Gmax} (leximax) = arbitration; Δ^{d,max}
fails IC6 (quasi-merging only).

**The verdict on min-by-canonical-order** (as Δ(cs) = ≺-min cs):
satisfies IC0-IC3, IC5-IC8. **Violates exactly IC4** — and **IC4 is
unsatisfiable by ANY resolute fence over atomic values** (only
compliant outputs: stay-disputed, or ⊥ barred by IC1). Cross-check
Moulin 1983: anonymous + neutral + resolute exists iff gcd(n, m!) = 1;
a fixed tie-break agenda sacrifices NEUTRALITY, a designated-voter
tie-break sacrifices anonymity. Min-by-bytes keeps anonymity, drops
neutrality — the canonical principled sacrifice. **Stop calling it a
placeholder; no rule satisfying everything exists.**

**The genuinely embarrassing axis is SIN-M** (Marquis & Schwind):
IC0-IC8 do NOT entail invariance under bijective symbol renaming
(Prop. 14); byte order is tied to the ENCODING — re-encode and the
winner changes. Prop. 13(1): **Δ^{d_D,Σ} (drastic distance + sum =
plurality) is the ONLY language-independent IC merging operator.** With
opaque Values, drastic distance is the only distance — so plurality is
the unique fully lawful upgrade, and plurality needs MULTIPLICITY.

**Finset is one level below multiset** (K&PP need multisets for Maj;
Mata Díaz & Pino Pérez need VECTORS just to state Non-Dictatorship).
Win: redelivery idempotence (theorem 4(a)'s semilattice). Cost: no
majority/quota/weighted/trust operator is expressible, ever; IC4 and
dictatorship are not even statable. **Repair: a holder-keyed multiset**
(a holder's redelivery collapses; two holders' identical proposals
count twice) — preserves idempotence, unlocks plurality. Record the
current Finset as a deliberate trade.

**Strategy-proofness attack, concrete**: `dispute h cs` lets any agent
inject arbitrary candidates; min-by-bytes rewards injecting a low-digest
value nobody believes; the `v ∈ cs` decide guard checks membership in a
set the attacker helped populate. Frame: Everaere et al. JAIR 28.

## 3. Judgment aggregation: what bounds multi-seat designs

Sources: Kornhauser & Sager (Yale LJ 96, 1986 — doctrinal paradox);
Pettit (2001 — discursive dilemma); **List & Pettit (E&P 18(1), 2002,
Thm 1**: no complete+consistent+closed F satisfies Universal domain +
Anonymity + Systematicity); Pauly & van Hees (JPL 35(6), 2006);
**Dietrich & List (SCW 29(1), 2007, Thm 2**: on strongly connected
agendas, universal domain + collective rationality + independence +
unanimity ⟺ dictatorship); Nehring & Puppe (JET 145(2), 2010: non-
dictatorial monotone Arrowian aggregators ⟺ not totally blocked;
anonymous ones ⟺ median point); Dokow & Holzman (JET 145(2), 2010);
List (Synthese 187, 2012 — survey).

**Right now nothing bites: one seat = dictatorship, which is
consistent.** The impossibilities enter the moment holes become
logically interdependent — per-hole fencing IS propositionwise
independence, and **adding cross-hole constraints and adding multiple
seats are formally the same decision.**

Escapes, ranked by fit: (1) **drop completeness → oligarchies**
(Gärdenfors 2006; Dietrich & List SCW 31, 2008): output NO judgment
where oligarchs disagree — **this is exactly the `disputed` state;
foldlab already lives in this escape and should say so.** (2) Drop
closure too → **quota rules** (Dietrich & List JTP 19(4), 2007):
threshold above (k−1)/k for k = largest minimally inconsistent subset
(k=3 ⟹ >2/3) guarantees consistency — the quorum-fence design.
(3) **Nehring-Puppe status-quo rule**: `open` as status quo, move only
on unanimity — the cleanest anonymous non-dictatorial multi-seat
design. (4) AVOID premise-based/sequential-priority (path-dependent,
List APSR 98(3) 2004 — would destroy fence_deterministic).
(5) Distance-based (Pigozzi Synthese 152, 2006 — the bridge paper);
Everaere et al. AAMAS 2015: IC3 ≡ anonymity.

## 4. Non-prioritized revision: the lineage that already fits

Hansson (Erkenntnis 50, 1999 — the taxonomy); Hansson semi-revision
(JANCL 7, 1997); **Makinson screened revision (Theoria 63, 1997)** — a
pre-processor decides WHETHER to revise before revising: **the E2
repair discipline, verbatim**; credibility-limited revision (JSL 66(4),
2001 — Relative Success + credible-set representation); **Fermé &
Hansson selective revision (Studia Logica 63, 1999)**: K∘α = K*f(α)
with ⊢ α → f(α) — the formal home for "propose a weakened claim", a
refinement move the model lacks; Singleton & Booth (KR 2022,
arXiv:2205.00077) — multi-source belief change with unknown topic-
dependent expertise: the closest published framework to foldlab's
setting.

## Import vs prove

**Import:** path independence (Plott, Econometrica 41(6), 1973; Sen
α/β): `fence_deterministic` is a special case — **restate as: any fence
rule rationalized by a fixed total preorder on Value is interleaving-
independent**; every future rule inherits order-independence free.
`clobber_diverges` = the LWW-Register lost-update anomaly (Shapiro et
al. 2011) — free citation. **The single seat is forced by CALM**: fill/
dispute are monotone in Belnap's information order (Belnap 1977:
open ⊑ filled ⊑ disputed); `decide` is non-monotone (destroys
information to escape the lattice); CALM says non-monotone requires
coordination — the fence seat exists BECAUSE decide is non-monotone
(converges with the monotone-determinism lane's finding). Read paths
can avoid the seat via consistent query answering (Arenas-Bertossi-
Chomicki, PODS 1999: answer over ALL repairs). IC4-unsatisfiability +
the Moulin trilemma. Relative Success. Mechanized precedent: Nipkow's
Arrow/Gibbard-Satterthwaite in Isabelle (AFP 2008; JAR 43, 2009).

**Prove (genuinely ours):** (1) `revise` postulate choice + semantics
(Success ⟹ Levi construction; measure the fence_deterministic cost as
a theorem or counterexample). (2) `fence_manipulable` — negative
control: an agent injects a low-digest candidate via dispute and
changes the decision. (3) SIN-M witness — two encodings differing by
relabeling yield different decided values. (4) The IC4 impossibility in
our model (one line: no total function Finset Value → Value treats two
conflicting proposals symmetrically) — upgrades "min is a placeholder"
to "min is forced, up to choice of order".

## Consolidated naive-spots

1. No source identity at the fence (Finset below multiset below
   vector); no fairness/trust/expertise/non-dictatorship statable.
2. Opaque Value forces drastic distance forces plurality — type choice
   and operator choice are the same choice.
3. `decided` irrevocability = unnamed maximal-entrenchment claim.
4. Revision vs update undeclared.
5. Byte order is not entrenchment.
6. AGM cited where Hansson base theory applies.

## Top 5 changes to the model

1. **The fence violates exactly IC4, which nothing resolute can
   satisfy** — two named defects (IC4 by necessity; SIN-M by choice of
   byte order), one paragraph in the README, stop apologizing.
2. **Finset forecloses the only lawful operator; holder-keyed multiset
   is the repair** — preserves redelivery idempotence, unlocks
   plurality (the unique language-independent operator).
3. **`revise` must choose Success or Relative Success; Success destroys
   fence_deterministic** — decide whether an agent's past self is a
   distinct source; if not, Levi gives revise = retract;fill free.
4. **The single seat is forced by CALM, not chosen** — decide is the
   one non-monotone move in Belnap's order; a citable theorem replaces
   a design assertion.
5. **The fence is manipulable and the v ∈ cs guard does not fix it** —
   add `fence_manipulable` and the SIN-M witness as machine-checked
   negative controls.

**The one that bites later:** cross-hole constraints and multiple seats
are formally the same step; when either arrives, Dietrich-List Thm 2
applies. Escapes in fit order: disputed-as-oligarchy (already living in
it), quota above (k−1)/k, status-quo-unless-unanimous. Never
premise-based (path-dependent).
