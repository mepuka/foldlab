# Literature lane: dispute taxonomies and resolution semantics (argumentation, ontology matching, DL repair, dialogue games, aggregation)

2026-08-14, Opus reader report, persisted with all substance intact.
One of four lanes dispatched from the study lane; synthesis follows when
all four land.

## 0. The model restated in the literature's vocabulary

| Foldlab primitive | Argumentation | Ontology matching | Social choice |
|---|---|---|---|
| hole | (no analogue — the slot is ours) | entity to be aligned | issue / agenda item |
| fill | argument's conclusion | correspondence ⟨e,e′,r,n⟩ | individual judgment |
| dispute | attack relation R (here: symmetric) | mapping incoherence / conservativity violation | profile with disagreement |
| candidate set | set of conflicting arguments | candidate correspondences | feasible alternatives |
| fence rule | extension-selection + resolute choice function | repair/diagnosis operator | aggregator F |
| protocol value | dialogue system ⟨Lt, L, K, Lc, P, C, T, O⟩ | alignment agreement protocol | agenda + domain conditions |

**The most important structural fact: the dispute has no attack
relation.** A candidate set of n mutually-exclusive fills is, as an
argumentation framework, the symmetric complete graph K_n. On K_n:
grounded = ∅, ideal = ∅, preferred = stable = the n singletons. Every
principled semantics says "undecided" or "n equally good answers". The
fence is the resolute selection layer on top, and min-by-bytes is a
lexicographic tie-break by alternative NAME — the thing social choice
applies AFTER a rule, never as the rule. That is the precise sense in
which it is degenerate.

## 1. Abstract argumentation (Dung 1995 and after)

Definitions: AF = (A,R); conflict-free, admissible, complete, preferred
(⊆-max admissible), stable, grounded (least complete = lfp of the
characteristic function). Containments: st ⊆ sst ⊆ pr ⊆ co ⊆ ad ⊆ cf.
Every semantics except stable guarantees nonempty σ(F). Grounded and
ideal are unique-status.

Complexity (Dvořák & Dunne, Handbook of Formal Argumentation ch. 14):
grounded — P-complete (credulous, skeptical, verification); stable —
NP-c / coNP-c, existence NP-c; preferred — credulous NP-c, **skeptical
Π₂P-c**; ideal — Θ₂P-c; semi-stable/stage — Σ₂P/Π₂P. Trap: under stable
with no extension, EVERYTHING is vacuously skeptically accepted — use
the guarded variant (Dunne & Wooldridge 2009) or a dispute with no
coherent resolution reads as all-decided.

**Principle-based evaluation** (Baroni & Giacomin, AIJ 171, 2007):
I-maximality, admissibility, reinstatement, **directionality**,
skepticism adequacy. **Directionality is the property foldlab already
needs without naming it**: extensions restricted to an unattacked set U
equal the extensions of the restriction — the formal statement of "a
dispute in one region cannot un-decide another region", the license for
shard-local folds and parallel replay. Grounded and preferred satisfy
it; **stable and semi-stable do not** — adopting semi-stable would
silently unsound the sharding.

**Structured argumentation.** ASPIC+ (Modgil & Prakken, AIJ 195, 2013):
three attack types — **undermining** (attack a premise), **rebutting**
(attack a defeasible conclusion), **undercutting** (attack a rule's
applicability). Rationality postulates (Caminada & Amgoud, AIJ 171,
2007): closure under strict rules, direct + indirect consistency —
satisfied when strict rules are closed under transposition; this is the
theorem "the fence never emits a jointly inconsistent decided set". ABA
(Bondarenko–Dung–Kowalski–Toni, AIJ 93, 1997): attacks COMPUTED from a
contrary map — with cataloged typed fills, `contrary` is type-level
incompatibility, the cheaper instantiation.

**The three attack types are the missing schema on the dispute record**:
"your premise is stale", "your value is wrong", "this type does not
govern this hole" are three different disputes; only the second is a
candidate set.

Import: the semantics zoo as definitions; the complexity table as a
budget sheet; Baroni–Giacomin as a fence-rule conformance suite; the
attack-kind enum; guarded skeptical acceptance. Prove (in our setting):
dispute→fence computes the grounded extension of the reified attack
graph; directionality for journal shards; ASPIC+ closure/consistency
for the decided set. Do not build: semi-stable, stage, cf2.

## 2. Ontology matching — the taxonomy of "different understandings"

**Klein (IJCAI-01 WS, CEUR Vol-47), two levels, 11 mismatch types.**
Language level: (1) syntax — rewritable; (2) logical representation —
translation rules; (3) semantics of primitives — same construct name,
different semantics (OIL vs RDFS reading of multiple rdfs:domain as
intersection vs union) — silently corrupts meaning; (4) language
expressivity — "the mismatch with the most impact". Ontology level,
conceptualization (domain genuinely conceived differently): (5) scope —
extensions merely intersect (Wiederhold's `employee`); (6) coverage/
granularity — often "the reason to use both ontologies", requires a
domain expert. Explication (same conception, different spec):
(7) paradigm (interval vs point time); (8) concept description
(attribute-vs-subclass; where in the is-a hierarchy a distinction is
drawn); (9) synonyms — thesauri look sufficient and are not (hidden
scope differences); (10) homonyms; (11) encoding — trivially solvable.

**Euzenat & Shvaiko (Ontology Matching, 2nd ed., 2013), four
heterogeneity types**: syntactic, terminological, conceptual (coverage/
granularity/perspective), **semiotic/pragmatic** — the same entity
interpreted differently by different people, **not resolvable by
matching at all**; resolved by context and use. A fence that decides a
semiotic dispute is not resolving anything; it is destroying
information.

**Alignments are first-class**: a correspondence is ⟨e, e′, r, n⟩ —
entity, entity, relation (=, ⊑, ⊒, ⊥), confidence. **The dispute record
currently carries values but no relation and no confidence.**
Zimmermann & Euzenat (ISWC 2006): three distinct semantics for networks
of ontologies; composition is where they differ. **Euzenat, Revision in
networks of ontologies (AIJ 228, 2015): network revision operators
cannot be built from local revision operators on the parts.** The fence
is a per-hole local operator; a network of ingested catalogs plus fills
is a network of ontologies — per-hole locality cannot implement network
revision.

**Conservativity** (Solimando, Jiménez-Ruiz & Guerrini, ISWC 2014; KAIS
51(3), 2017): an alignment must not introduce novel subsumptions between
named concepts of a single input ontology. Translated: **a locally
legal fill can quietly redefine schema.org.** No gate for this exists
today; consistency is the weaker check.

**schema.org caution**: domainIncludes/rangeIncludes are descriptive,
not prescriptive; ingesting schema.org yields almost no logical
conflicts — every type-level dispute after ingest is about the
constraint layer WE added. Label the provenance or agents will argue
about house policy while believing they argue about the world.

**The routing table** (probably the highest-value item in this report —
different mismatch kinds get different handling, most never reach a
fence):

| Kind | Correct handling | Fence? |
|---|---|---|
| syntax, logical representation, encoding | automatic transformation | no |
| semantics of primitives, expressivity | ingest-time refusal or lossy-translation marker | no |
| scope, coverage/granularity | keep both + alignment with ⊑/⊒ | no — not a dispute |
| paradigm, concept description | type-level dispute → repair/diagnosis | yes, not over values |
| synonym / homonym | matcher proposes, agent confirms; check hidden scope | yes, value-level |
| semiotic | quarantine to context | **no — deciding it is a bug** |

Prove: the fill gate is conservative w.r.t. every ingested catalog.

## 3. Type-level disputes: DL debugging, justifications, repair

MUPS/MIPS (Schlobach & Cornet, IJCAI 2003; JAR 39(3), 2007);
justifications/MinAs and black-box computation (Kalyanpur, Parsia,
Horridge & Sirin, ISWC 2007); **repair = minimal hitting set over all
justifications** (Reiter, AIJ 32(1), 1987). Complexity (Peñaloza &
Sertkaya, AIJ 2017): MinA enumeration not output-polynomial for Horn-EL
unless P=NP; polynomial-delay only in small DL-Lite fragments — **hard
even in tractable logics**. Alignment repair as diagnosis: Meilicke
2011 (ALCOMO); LogMap.

Consequences: (1) **disputes are not independent across holes** — one
mismatched axiom can justify conflicts at dozens of holes; per-hole
fencing can remove 12 fills where removing 1 axiom was the diagnosis.
The "unbounded dispute sets" residual is really disputes not quotiented
by justification. (2) **The complexity is in enumeration, not
decision** — compute ONE justification on the commit path; "enumerate
all" is an explicitly budgeted, cancellable operation, never a commit
step.

Prove: a fenced decision set is a hitting set of the justification set
(the type-level analogue of ASPIC+ direct consistency).

## 4. Dialogue games

**Walton & Krabbe (1995) typology** by initial situation × goal:
persuasion, negotiation, inquiry, deliberation, information-seeking,
eristic. The fill/dispute/decide loop is currently **inquiry with an
arbitrator**. The three relevant types have different outcome criteria
and warrants; unmarked shifts between them ("dialectical shifts") are
the classic fallacy source — the protocol value should mark its type.

**Prakken (KER 21(2), 2006) — the anatomy of a dialogue system**: topic
language + logic; context K (here: the catalog); communication language
Lc with an explicit **reply structure** (each move attacks or surrenders
to an earlier move); commitments per participant; protocol P (dialogue
prefixes → legal moves; termination = P returns ∅); turntaking;
outcome rules. The protocol value currently declares holes, seats,
fence rule, stability tier — **it owes Lc, reply structure, turntaking,
termination, outcome.**

**Results that constrain design**: termination is provable only if
argument premises must come from the context/belief bases — **fills
must cite the catalog or the protocol does not terminate** (endless
why-regress otherwise). Relevance (Prakken JLC 15(6), 2005): a move is
relevant iff making its target `out` would make the speaker the current
winner. The dynamification warning: when the theory is the journal
built so far, the proponent can be defeasibly right yet unable to win —
positive results exist only for relevant protocols. **Argument games as
proof theories** (Modgil & Caminada 2009): sound and complete two-party
games for grounded/preferred — the dialogue terminating IS a proof that
the semantics gives this answer.

**Exact prior art**: Laera, Tamma, Euzenat, Bench-Capon & Payne
(ISWC 2006 / AAMAS 2007) — agents arguing over ontology alignments with
value-based AFs (Bench-Capon JLC 13(3), 2003; audiences = preference
orders over values); dos Santos & Euzenat (OM 2010); **van den Berg,
Atencia & Euzenat (JAAMAS 35(2), 2021)** — the ontology alignment
repair game with a DEOL model proving correctness/partial redundancy/
incompleteness of adaptation operators, measured by success rate,
semantic precision/recall, rounds-to-converge — **a working template
for the gauntlet's protocol metrics.**

Prove: termination from the cite-the-catalog restriction;
correspondence (fence decision = skeptical acceptance under the chosen
semantics in the framework built from the journal prefix). "The fence
is the last mover" is the empirical shadow of that theorem.

## 5. Aggregation — what a fence rule cannot have

Caminada & Pigozzi (JAAMAS 22(1), 2011): aggregating labellings with
down-admissible/up-complete interpretations; skeptical/credulous/
super-credulous operators; compatibility = no member committed against
their own position. **Porello & Endriss (JLC 24(6), 2014): ontology
merging as judgment aggregation under the open world assumption —
Arrow-style impossibility generalized.** Konieczny & Pino Pérez IC0–IC8;
majority (utilitarian) vs arbitration (egalitarian) operators.

**The consequence**: min-by-bytes as a social choice function is
anonymous, non-neutral (depends on the alternative's NAME), independent
of everything relevant (support, evidence, confidence, authority,
recency), resolute, and **manipulable — an agent controlling its own
serialization can win by naming.** The fence-determinism theorem proves
anonymity and order-independence; the impossibility results say
resolute + independent + non-dictatorial over a rich agenda is exactly
what cannot jointly exist. **min-by-bytes escapes by being a
dictatorship over alternative names.** Write that down as a declared
property.

## 6. Resolution semantics ranked (implementability × known properties)

Tier 1 — implement now: (1) **grounded extension over a reified attack
graph** — P-complete, unique, always exists, directionality, honest
UNDECIDED; the right default fence. (2) **Lexicographic criterion
order** (seat authority → conservativity-safety → provenance recency →
confidence → canonical bytes last) — O(n log n), resolute, explainable;
formally a VAF with a fixed audience; ship-this-week quality.
(3) **Typed routing before any fence** (the §2 table) — O(1), stops
fencing the unfenceable. (4) **Repair-by-diagnosis** for type-level —
one justification on the commit path, enumeration budgeted.

Tier 2 — needs an NP oracle: (5) ideal semantics (Θ₂P, unique, no
selection layer needed) if grounded returns ∅ too often; (6) preferred
+ Tier-1 selection (mature SAT solvers, ICCMA); (7) Caminada–Pigozzi
labelling aggregation when the unit is an agent's whole position.

Tier 3 — do not build: semi-stable/stage (Σ₂P/Π₂P + directionality
violations break sharding), stable (may not exist + vacuous-acceptance
footgun), cf2, IC merging operators (need an indefensible distance
measure).

## 7. Where the model is naive (consolidated)

1. No attack relation — every dispute is K_n; reasons never enter the
   journal, so the only available rule is content-free.
2. Resolute by construction — the impossibilities bite; min-by-bytes
   escapes by name-dictatorship. **Allow UNDECIDED.**
3. Manipulable by serialization — canonical byte order is an input an
   agent controls. Strategyproofness is a live property.
4. Flat candidate sets — type-level disputes are hitting-set repairs,
   coupled across holes.
5. Per-hole locality vs network revision (Euzenat 2015).
6. No conservativity gate.
7. Semiotic heterogeneity treated as decidable — fencing it destroys
   information, unrecorded.
8. Scope/granularity treated as conflict — should produce alignments.
9. Missing locutions — no why/because, hence no reply structure, no
   relevance, no termination or correspondence theorems.
10. Dialogue type unmarked.
11. schema.org will not fight back — label the constraint layer's
    provenance.

## 8. Top 5 changes to the model

1. **Reify the attack relation (three ASPIC+ kinds); grounded becomes
   the real fence** — P-complete, unique, order-free by construction
   (fence determinism becomes a corollary), directionality named and
   guaranteed; min-by-bytes demoted to last tie-break in a declared
   lexicographic order.
2. **Let the fence return UNDECIDED** — the honest answer where the
   impossibilities bite; escalation becomes a protocol move; undecided
   disputes become a queryable frontier instead of a leak.
3. **Import the mismatch taxonomy as a typed enum and ROUTE on it** —
   most dispute kinds never reach a fence (transform / refuse-at-ingest
   / align / quarantine); only synonym-homonym and paradigm/concept-
   description disputes are fence-shaped.
4. **Type-level disputes are diagnoses; fills need a conservativity
   gate** — one justification on the commit path, enumeration budgeted;
   consistency is not enough.
5. **The loop is a dialogue game missing two locutions and two
   theorems** — add why/because with a reply structure; fills must cite
   the catalog (termination); correspondence upgrades "the fence is the
   last mover" from observation to theorem; measure fence rules by the
   alignment-repair game's metrics.

## Sources

Dung AIJ 77 (1995); Dvořák & Dunne HOFA ch. 14; Baroni & Giacomin AIJ
171 (2007); Dunne AIJ 173 (2009); Modgil & Prakken AIJ 195 (2013) +
tutorial (2014); Caminada & Amgoud AIJ 171 (2007); Bondarenko et al.
AIJ 93 (1997); Modgil & Caminada (2009); ICCMA 2023; Klein CEUR Vol-47
(2001); Euzenat & Shvaiko, Ontology Matching 2nd ed.; Zimmermann &
Euzenat ISWC 2006; Euzenat AIJ 228 (2015); Solimando et al. ISWC 2014 /
KAIS 51(3) (2017); schema.org data model; Schlobach et al. JAR 39(3)
(2007); Kalyanpur et al. ISWC 2007; Reiter AIJ 32(1) (1987); Peñaloza &
Sertkaya AIJ (2017); Meilicke (2011); Prakken KER 21(2) (2006) + JLC
15(6) (2005); Walton & Krabbe (1995); McBurney, Parsons & Wooldridge
AAMAS 2002; Rahwan et al. KER 18(4) (2003); Laera et al. (2006-07);
Bench-Capon JLC 13(3) (2003); van den Berg, Atencia & Euzenat JAAMAS
35(2) (2021); Caminada & Pigozzi JAAMAS 22(1) (2011); Porello & Endriss
JLC 24(6) (2014); SEP "Belief Merging and Judgment Aggregation".
