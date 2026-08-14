# The limits of learning by refutation: what is proven, what is open, what is ours

Synthesis of a five-lane literature sweep (2026-08-13, coordinator-run;
Opus research fleet, ~600 primary-source fetches). Companion to
`2026-08-14-inference-frame-and-grill-record.md` (the ratified frame) and
the type-population dossier. Provenance discipline inherited from the
lanes: every load-bearing claim below was read in primary text by a lane
unless marked secondhand; the lanes' own dry-thread and unverified lists
are preserved in §8.

## 1. Verdict

The operator's question — *is definitive type identification theoretically
possible given data, a sound certifier, a fallible human, and unbounded
parallel interaction?* — decomposes into settled, impossible, and open,
and the open part is narrow, well-posed, and partly ours to claim.

**The oracle model has a name.** Positive data plus a sound,
conjecture-directed refutation oracle is `NCEx` (Jain & Kinber, ALT 2004;
*JCSS* 74(4):431–456, 2008). Their Theorem 14: **every indexed family is
identifiable in the limit in this model** — text kills
under-generalization, refutation kills over-generalization. `flb.type.v0`
is an indexed family. The possibility question is answered yes, by
citation.

**What is impossible, each by a short proof:**
- Finite-time exact identification at any infinite-domain position
  (string, number), even with a perfect two-sided oracle and unbounded
  finite parallelism per round — for any finite transcript, `union(S)` and
  `union(S ∪ {y})` are both consistent.
- Any halting rule correct with probability 1 under a noisy-Yes channel —
  standard indistinguishability.
- Digest-level identification from certifier evidence — the **fiber
  theorem**: brands and checks are denotationally invisible by
  ratification, so the certifier resolves `≡⟦⟧` while the catalog keys on
  `≡_dig`, and the gap is infinite. **Brands and checks are pure intent:
  assertable, refutable, never confirmable by evidence.**
- Limit-identification under *persistent* one-sided error — and
  persistence, not independence, is the defensible human-error model,
  because content-addressed memoization forecloses resampling (a repeated
  query is a cache hit; a rephrased query is not the same query).

**What is open — the two theorems nobody has:**
1. The **split-soundness model**: soundness on refutation, unsoundness on
   acceptance, no oracle whose silence is trustworthy. Every neighbouring
   literature has one half (faulty-teacher work corrupts MQ and keeps EQ
   perfect; CEGIS assumes all oracles sound; Rényi–Ulam half-lie has the
   asymmetry for element search only; pMAT has the architecture and zero
   theorems). Conjecture in §4.
2. The **sharing-factor lower bound**: no result anywhere makes the
   tree-to-DAG sharing ratio the complexity parameter of an interactive
   learner. Conjecture in §5.

## 2. The settled valuations

- **Query budget dominates counterexample quality** (Jain & Kinber,
  *Inf. & Comp.* 204:123–175, 2006, Prop. 7.2): at any finite-but-unbounded
  budget a bare `no` equals a certified witness equals a *least* witness,
  for learnability. The witness's provable payoff is **mind-change
  complexity** — with counterexamples, classes needing `2ⁿ−3` mind changes
  from an informant need `n−1`. The refusal corpus buys convergence speed,
  not convergence.
- **Refutation must be conjecture-directed.** A verifier that screens
  values against fixed laws moves the learnability boundary not at all
  (Li et al. "Flood and Harvest" Thm 3.1, arXiv:2606.14688; Shinohara
  1986). The certifier's power is that it refutes *the presented
  candidate*. Design invariant.
- **Generation does not evade identification.** Exact breadth ⟺ Angluin's
  condition (Kalavasis–Mehrotra–Velegkas, arXiv:2412.18530, Thm 3.3). The
  honest escape hatch is **approximate breadth** — a type under-shooting
  intent by finitely many values — which needs only weak Angluin
  (Thm 3.8). Kleinberg–Mullainathan (NeurIPS 2024) opened the field;
  negative examples restore everything at optimal rate `e⁻ⁿ` (STOC 2025).
- **Order-induced refutation collapses EQ complexity** (Braverman, Livni,
  Mansour, Moran, Nissim, COLT 2026): against a counterexample generator
  returning the *simplest* counterexample under a fixed order, exact
  learning costs **Θ(Ldim)** equivalence queries, tight, versus the
  classical `N−1`. A deterministic certifier returning the first failing
  (Law, Path) under a fixed traversal IS order-induced. **Free, and
  fragile**: nondeterministic law-check parallelization that makes the
  returned refusal hypothesis-dependent could forfeit it. The traversal
  order is complexity-bearing law.
- **The human's noise costs O(1), not a rate.** A false accept is
  re-checkable by one certified query; the human is a *proposal channel
  filtered by a sound acceptor*, not a noisy oracle. This is what pMAT
  (arXiv:2408.02999) cannot do — its persistent errors defeat voting and
  re-checking — and what Weiss et al. (ICML 2018) and black-box checking
  (Peled–Vardi–Yannakakis 1999) both do: **every rigorous system makes NO
  sound and lets YES be heuristic. Nobody certifies acceptance.**
- **Parallelism buys queries, not rounds.** Bshouty–Cleve (FOCS 1992):
  `p` processors give `O(log|C|/log p)` halving rounds, but Ω(n/log n)
  rounds are necessary for read-once formulas regardless of processor
  count. Group-testing's "two rounds suffice" provably does not transfer
  to recursive structure: a refusal at path π needs a hypothesis already
  committed at π's parent. **Rounds are floored by target depth; fan-out
  makes learning cheap, not fast.** The floor is ~3.7 bits/node
  (`log₂ 13`); the one known device against the depth floor is ICE-style
  **implication refusals** (Garg et al., CAV 2014) — constraints over
  path *pairs*, able to refute subtrees not yet hypothesized.
- **The finite fragment is one non-adaptive round.** Corpus-mutation
  probes (delete field / add unknown / kind-swap leaf) decide every
  finitely-branching position in `O(|X|·size)` queries, lower bound
  Ω(size), no adaptivity needed — the corpus realizes deep positions so
  probes need no answers to construct. The open complexity gap is **union
  arm decomposition**, where positional independence fails. The right
  imported frame is constraint acquisition (Bessiere's QuAcq): the
  (Law, Path) refusal is structurally QuAcq's `FindC` locator obtained
  for free; `O(m log n)` is the target if the reduction holds.

## 3. The polarity flip, and what replaces independence

Since certainty via noisy confirmation is dead, flip every dialogue move
so all informative answers land on the human's reliable side: synthesize a
separator value (effective, by regular-tree-language closure over the
DAG catalog) and present the certifier's own exclusion — *"this candidate
excludes this value; is that wrong?"* Both answers are refutations; the
noisy channel contributes nothing to the version space; the learner is
sound by construction. Convergence then rests not on independence but on
**fairness** — the human eventually refutes every wrong candidate
presented infinitely often — which is weaker, positional, and compatible
with memoization. The conjectured limit: the achievable target is the
quotient of the type space by the human's **unfairness kernel**, and from
a refuter-only oracle one can never certify maximality — Angluin's
tell-tale re-imported at the meta level, about refutations. If proved,
learning-by-refutation has its theorem and its limit in one statement.

## 4. Conjecture I — asymmetric-oracle identification (steer, never close)

For an indexed family with a sound refutation oracle `R` and a fallible
intent oracle `C` (rejections sound, accepts noisy, no rate bound):
**(a)** a learner using `C` only to *order* its enumeration — never to
eliminate — identifies in the limit; fallibility costs only mind-changes
(reduction to Jain–Kinber Thm 14). **(b)** any learner letting a single
accept retire a candidate fails for every false-accept rate > 0.
**(c)** hence the intent oracle buys speed, never truth: **the human may
steer the search and must never be permitted to close it.** Part (a) is
near-mechanical; (b) is the theorem with teeth. Adjacent open problems
recorded by the lanes: relax soundness of one OGIS query type
(Jha–Seshia) and see which relative-power theorems survive; add a sound
refutation oracle to Ben-David et al.'s uniform exterior separability
(arXiv:2606.28309).

## 5. Conjecture II — the sharing-factor lower bound (transposition formalized)

RG-A re-verified this session from the frozen bundle: n=40, 1,681 states,
8 workers, path-tree 4.248×10²³ nodes, **collapse factor 2.527×10²⁰**
(correcting the ~10⁴ figure sometimes quoted; that number belongs to
ticket 026's chain lengths). Closest published relatives: FlashMeta's
`⟨N,φ⟩` memo cache (OOPSLA 2015 — same collapse arithmetic, heap-local
key, single-call scope, no concurrency, no post-hoc verification) and
TDS (IEEE TPDS 2002, already cited by the spec). The **Myhill–Nerode
connection is unclaimed**: L*'s observation table IS a transposition
table over residual languages (rows = residuals = canonical keys;
inconsistency = discovery that a merge was wrong; the repair = key
refinement), and no paper writes that sentence. Kopystiański & Otop
(arXiv:2605.07710) cache membership queries modulo TRS normal forms —
the residual-soundness condition stated exactly — with measured 29–96%
query reductions and **no theorem**; their null result matters equally:
advice already implied by the learner's own queries buys nothing.

The claim someone should prove: with a content map σ satisfying
residual-soundness (σ(p)=σ(q) ⟹ identical residual query behaviour — the
Myhill–Nerode condition, the TRS-consistency condition, and the exact
negation of graph-history interaction), any sound learner must issue
**Ω(|D|)** queries where D is the quotient DAG — making the sharing
factor tight, not merely achievable — plus the online discovery version
and a rate statement in |D| rather than |T|. The novelty must live in
the lower bound; the upper is memoization plus an accounting identity.

Caveats the claim must carry (each with a citation in the lane record):
the key alone is a *cost* until a cache keys on it (Filliâtre–Conchon:
hash-consing alone 2.1× slower); path-dependence kills state-keying and
full-path keying costs ~1000× (Kishimoto–Müller GHI; RG-A is sound
because it caches facts, not search control); finer is not always
better (R2's 890MB→3MB by moving the replay cut UP a semantic level;
domino effect; Nominal Adapton); and key precision is a third axis
independent of step size (client-selected stamps, projection keys).

## 6. Novelty map for the composition

Grep-verified negatives, not search misses, per the lanes:
- **A hole denoting a version space with S/G bounds: unpublished.** The
  pieces sit in three non-citing literatures — AGT's `γ(?) = TYPE` with a
  Galois connection and an undeveloped one-sentence bounded-unknown
  aside (POPL 2016); Hazel's holes-as-typed-unknowns (never a set);
  Liquid Types' unique-minimum-bound theorem (an S-computation in all but
  name); Frankle et al.'s goals-as-refinement-types with `not(r)`
  (a refusal IS a type there — re-run, never accumulated); FlashMeta,
  which cites Mitchell and discards the boundary representation.
- **A persistent, deduplicated, federated refutation corpus:
  unpublished.** Peleg's `S_i` (VMCAI 2018) is the only named, monotone,
  formally analyzed refusal accumulator and it is session-scoped; Neo's
  conflict KB is "initially empty" per run; the only cross-field
  precedent (Dynabench/ANLI adversarial corpora) has no synthesis
  counterpart.
- **Transposition as verified economy under universal content
  addressing: unpublished.** Agent-UCT (arXiv:2607.24162) built the
  machine, measured a sharing factor of 3.79, and has no theorem and no
  name for the number — simultaneously the strongest threat to and
  evidence for the novelty.
- Three published theorems the estate should cite *for* its thesis:
  Peleg ICSE 2018 Claim 4.1 (examples can provably never eliminate a
  syntactic element present in an equivalent program); Peleg VMCAI 2018
  Thm 1 + Ex 4 (structural exclusions are a wqo and terminate; "examples
  are not a wqo"); Le et al. / RESL (semantic negatives are the weakest
  citizen of a version space; structural refusals are negatively-stable
  and prune subtrees) — the independent derivation of #18's
  structural/absence sort split.
- One refutation of our own prior: **Adaptive Schema Databases**
  (CIDR 2017) is an honest schema inferrer — candidate set plus
  distribution by design — though with no order-theoretic bounds, no
  journal, no refusal. Closest system on the honesty axis; Peleg's
  interaction model closest on the refusal axis; **no two components of
  the composition co-exist in any published system.**
- One warning: the **Tunneling hill** (OOPSLA 2025) — VSA sharing does
  not survive constraint conjunction for free; intermediate intersections
  averaged ~300× the endpoint sizes. The scale gauntlet should probe for
  the hill.

## 7. Design consequences (proposed, for the operator)

1. **Ratify the certifier's fixed traversal order as law** — it carries
   the Θ(Ldim) collapse (order-induced property). Any parallel law
   checking must return the order-first refusal deterministically.
2. **Amend the concierge dialogue contract to the polarity flip**:
   present exclusions, not confirmations; the guess-license (Q3 ruling)
   upgraded so a guess is delivered as its consequences — "this excludes
   v" — putting every informative answer on the sound side.
3. **The human steers, never closes** (Conjecture I posture): dialogue
   answers order the search and are journaled; only certifier-checked
   evidence eliminates. Termination criteria are corpus-relative
   exactness (stoppable, already ADR-0007's stance) or ε-on-the-journal;
   never human certainty.
4. **Extend `flb.certification.v0` (task 32) with an implication-refusal
   kind** — (Law, Path→Path) pairs — the one device against the depth
   floor. Grill before building; it touches the record shape being built
   now.
5. **Add the RG-A row to VERIFICATION.md** — the 10²⁰ claim is asserted
   in README and ticket 026 but absent from the ledger; by the estate's
   own rule the claim is currently not made.
6. **Cite Peleg, Le/RESL, Jain–Kinber, and Braverman in CONTEXT/laws**
   where the corresponding invariants are stated, so the walls know their
   theorems.
7. Keep **approximate breadth** in the back pocket as the ratifiable
   relaxation if exactness at infinite positions is ever needed
   finite-time.

## 8. Provenance and dry threads

Lane reports (verbatim, with per-item verification keys, dry threads,
and unread-paper lists) are preserved in the session transcript of
2026-08-13; the headline dry threads: no named model for split-soundness
oracles (zero hits, two independent sweeps); no CEGIS-with-imperfect-
oracle results; no convergence theorem for LLM teachers; the half-lie
asymptotic threshold unread (Pelc's 2002 survey is the highest-value
unread item); Haussler 1988 unobtainable in primary; UCD (Saffidine et
al. 2012, paywalled) is the one paper that could refute Conjecture II's
novelty. Corrections recorded: the RG-A magnitude is 10²⁰ not 10⁴; the
`O(kn²+n log m)` query bound is Rivest–Schapire, not Angluin; Haussler's
boundary blowup needs only plain monotone terms.

## 9. CORRECTIONS AND REFEREE FINDINGS (2026-08-13, adversarial pass — supersedes conflicting claims above)

A three-lane formal attempt (possibility, impossibility/kernel, hostile
referee) was run against §§1–5. The referee's verdict is accepted. The
record above is preserved unedited; this section states what changed.

**Withdrawn:**
- §1's "the possibility question is answered yes, by citation." FALSE as
  cited: the NCEx oracle (Jain–Kinber Def. 9) is target-relative and
  COMPLETE — its silence certifies containment. foldlab's certifier is a
  fixed-law well-formedness checker that never sees a value
  (proto/SPEC.md:25-28; the wire reply literally says payload conformance
  "was NOT checked"). A decidable predicate on the hypothesis space is
  not an oracle; the learner can compute it. Theorem 14 does not apply.
  The only target-relative refuter in the system is the human.
- §3's fairness conjecture as an open problem. It is Jain–Kinber
  Definition 42 (model D4) and Theorem 43 (NCEx = D2 ⊆ D4), proved 2008,
  in the same paper, thirty pages after Theorem 14. Cite it.
- §2's "the human's noise costs O(1)" — a false accept about
  OVER-GENERALITY is not re-checkable by any certified query; that is
  the exact failure a law-checker cannot see. Restricted to
  law-violating proposals only.
- The "unnamed model" claim. Motoki (IPL 39(4), 1991) names the
  ∃-advisor version (text + sound incomplete negative source) with a
  characterization; Angluin–Kriķis–Sloan–Turán 1997 is the persistent
  asymmetric-error architecture; Pelc §5.4 names lie patterns. The
  genuinely unclaimed cell is narrower: the ∀-advisor (adversarial
  selection) with the unfairness kernel as the object — and the
  impossibility lane's Theorem D2 (a tell-tale characterization
  relativized to the oracles' blind spots, interpolating Angluin 1980 ⟷
  Jain–Kinber) is the candidate theorem for exactly that cell.
- §7.1's "free Θ(Ldim) collapse." Unestablished transfer: Braverman et
  al.'s bound needs a SYMMETRIC counterexample generator (a function of
  H △ target); the certifier's first-failing-(Law,Path) against fixed
  laws is not one. The traversal-order ratification stands as a
  determinism/reproducibility law only.
- §3's polarity flip as stated ("both answers are refutations"). Only
  the excluding answer is sound; "wrongly excluded" is an accept in
  disguise and eliminating on it reintroduces the closing failure. The
  honest form: the flip makes every ELIMINATING answer sound and demotes
  the other direction to advisory — halving information rate, not
  removing noise.
- §1's fourth impossibility, now scoped: "for classes without finite
  tell-tales."

**Citation repairs:** the "query budget dominates" result is Prop. 42
(§7) of Inf. & Comp. 204, not "Prop. 7.2"; at FIXED budget, least
counterexamples are strictly stronger (2n−1 vs n, tight) — the
equivalence holds only unbounded. The 2ⁿ−3 mind-change figure is
asserted without proof in the primary ("We omit the details"). The
Kopystiański–Otop figures are 13–87% mean 52% on equivalence queries.

**What survives, strengthened:**
- The collapse theorem (SSEx = NCEx; an unconstrained acceptor is worth
  nothing in the limit) and the kernel-cardinality dichotomy
  (reliability is a cardinality, not a rate; κ bounds mind-changes
  exactly; κ=0 gives all of E). Proved by the possibility lane.
- The plumbing dichotomy (accepts to the scheduler, never the kill set;
  one lie defeats any accept-closing learner) — proved with the weakest
  closing definition; the C-as-ranker cost table cost-justifies ruling
  Q5.
- The trade-off theorem replacing the memoization argument: ONE-SIDED
  SOUNDNESS AND INDEPENDENCE OF ERROR CANNOT COEXIST — independence
  requires answer-variance across semantically identical presentations,
  which is a noisy semantic channel, which makes rejects noisy too.
  Persistence is derived, not assumed, and matches the published
  persistent-noise model.
- Theorem D2 (relativized tell-tale), Theorem D6 (the fiber is the
  kernel-critical region; content addressing is the canonical selector),
  the finite-fragment corollaries (for finite families with decidable
  containment, refuter completeness is FREE — the shipped regime), and
  the kernel-erosion open problem (model the human as a learner over the
  refusal corpus — the flywheel as mathematics).
- The referee's repair worth adopting: model C as answering per some
  L′ ⊇ L — the user's STATED type versus their intended one. Soundness,
  noise, persistence, and bounded coding all fall out, and the theorem
  aligns with the fiber theorem's shape.

**The corrected headline — "the completeness gap":** a certifier that
checks laws cannot supply the target-relative counterexamples learning
requires; the only agent who can is unreliable in exactly the direction
that matters; the achievable limit is therefore the user's STATED type,
never their intended one — and the engineering program (value-conformance
codec from the ratified codegen seam, exclusion-eliciting dialogue,
kernel instrumentation from the corpus) is precisely what narrows the
gap. The Lean core (verify/ssex, branch lean/ssex-core) formalizes the
finite regime where completeness is free, which is the regime the
product ships.
