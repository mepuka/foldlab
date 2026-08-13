# Literature resonances: what the field knows about foldlab's core structures

Provenance: four parallel research scouts (Opus), dispatched 2026-08-12,
each over a domain cluster (distributed monotonicity and logs; category
theory and PLT; verifiable computation and provenance; formal methods
and concurrency semantics), all working by live web search with
citation verification. Coordinator synthesis (Fable), 2026-08-13.
Verification status: every URL below was located by live search;
roughly half the sources were fetched and read; items the scouts could
not open are marked. Three keystone sources should be READ before the
community piece leans on them: Hellerstein "Complete CALM"
(arXiv 2602.09435), Kuper et al. "Freeze After Writing" (POPL 2014),
Crosby & Wallach (USENIX Sec 2009).

## The headline: one construction, four literatures

The codata→data crossing — commitment, "the moment codata becomes
data" — appears independently in four literatures that do not cite
each other:

1. As `freeze` on a monotone lattice: LVars (Kuper, Turon,
   Krishnaswami, Newton, POPL 2014,
   https://doi.org/10.1145/2535838.2535842). Their quasi-determinism
   theorem (every run yields the same answer or a typed error) is the
   effector theorem's shape; their threshold-read/freeze split is our
   monotone/CAS split; their error-not-wrong-answer is refusals-as-data.
2. As the positive/negative polarity shift: Zeilberger, "On the Unity
   of Duality" (APAL 2008,
   https://www.lix.polytechnique.fr/~zeilberger/papers/unity-duality.pdf);
   Levy, call-by-push-value. Content addressing is a positive-type
   phenomenon: identity-by-construction exists exactly for values
   built from constructors.
3. As the canonical map μF → νF and commitment as its SECTION: Freyd,
   "Algebraically Complete Categories" (1991); Rutten, "Universal
   coalgebra" (TCS 2000). "The chain remembers what the fold forgives"
   is the kernel of the minimization map into the final coalgebra.
4. As the monotone frontier: the CALM theorem (Hellerstein & Alvaro,
   CACM 2020, https://arxiv.org/abs/1901.01930; proof: Ameloot, Neven,
   Van den Bussche, JACM 2013). Coordination-free consistency exists
   iff the computation is monotone; absence-checking is the canonical
   non-monotone predicate, so the effector's CAS is a price, not a
   choice.

Framing for publication: not "we invented this," but "four fields
triangulate one construction; here is a running system where all four
views are simultaneously true and machine-checked."

## A. Rediscoveries (cite the ancestor; claim the delta)

- The monotone-theorem DISTINCTION has four prior formalizations:
  stable vs unstable predicates (Chandy & Lamport 1985,
  https://lamport.azurewebsites.net/pubs/chandy.pdf; Marzullo & Neiger
  1991), CALM, LVars threshold/freeze, and CRDT query-safety (Laddad
  et al., "Keep CALM and CRDT On," PVLDB 2023,
  https://www.vldb.org/pvldb/vol16/p856-863.pdf). OUR delta, which no
  prior work has: the placement conclusion (which primitive, where the
  linearization point lands) plus a self-certifying prefix (the head).
- Trillian's verifiable log-derived map checkpoint (log checkpoint +
  map root; https://transparency.dev/articles/logs-vs-maps/) IS the
  compaction pair (head, fold state), shipped in production. Their
  stated open problem — map evolution verifies linearly in revisions —
  is our linear audit cost: the field's problem, not our defect.
- Nix's realisation map (RFC 0062) and build-system "early cutoff"
  (Mokhov, Mitchell, Peyton Jones, "Build Systems à la Carte," ICFP
  2018,
  https://www.microsoft.com/en-us/research/wp-content/uploads/2018/03/build-systems.pdf)
  are, respectively, the commitment register keyed by content address
  and the head/state divergence, independently derived.
- Unison (https://www.unison-lang.org/docs/the-big-idea/) is
  content-addressed program identity, shipped: names are metadata,
  hashes are identity, annotations never move identity.
- Monotonic Prefix Consistency (Girault, Gössler, Guerraoui, Hamza,
  Seredinschi, FORTE 2018, https://arxiv.org/pdf/1710.09209) proves
  our mirror law is OPTIMAL: nothing stronger is implementable for
  available, convergent replication. Our prefix is additionally
  self-certifying, which MPC lacks.

## B. Imports (adopt; low cost, high leverage)

- C2SP checkpoint note format
  (https://github.com/C2SP/C2SP/blob/main/tlog-checkpoint.md) as the
  serialized chain head (origin / size / hash / extensions;
  certificates ride extension lines). Buys: every existing
  transparency-log witness becomes an off-the-shelf split-view defense.
- History-tree / Merkle-Mountain-Range shape (Crosby & Wallach, USENIX
  Security 2009,
  https://static.usenix.org/event/sec09/tech/full_papers/crosby.pdf;
  tiles: https://research.swtch.com/tlog) as a COMPANION structure to
  the chain: O(log n) prefix/membership proofs at zero new
  assumptions; compaction at MMR peak boundaries needs no bespoke
  proofs. Constraint: the chain stays the pinned identity — the tree
  is a derived index or a deliberate v2, never a silent rewrite of
  frozen fixtures.
- Frozen-head certificates: the MMR-optimality lower bound (Bonneau,
  Chen, Christ, Karantaidou, CRYPTO 2025,
  https://eprint.iacr.org/2025/234) makes maintained inclusion
  witnesses cost ω(n) total; certificates therefore carry the head at
  run time, frozen forever, with prefix-relation recomputed on demand.
  Decides a ticket-005 fork.
- Unison's cycle rule for recursive types (hash the strongly-connected
  component; order members by cycle-removed hashes; address digest.n)
  — REQUIRED before ticket 004 reaches SchemaAST's Suspend nodes: a
  catamorphism does not terminate on a cyclic AST, so the structural
  digest is currently underdefined on recursion. v0 is safe only
  because refs-must-resolve forces a DAG.
- Vocabulary: "quasi-determinism" (LVars) for admission semantics;
  "decider" (accumulation schemes) for the once-at-the-end expensive
  check; "frozen" (history trees) for immutable subtree commitments;
  auditor vs monitor role split (SEEMless, CCS 2019,
  https://eprint.iacr.org/2018/607); D/I and the chain rule (DBSP,
  PVLDB 2023, https://arxiv.org/abs/2203.16684) for incremental state
  folds.

## C. Theorem candidates (ranked by my judgment of value ÷ effort)

1. Free-monoid fundamental theorem (Green–Tannen reframe; provenance
   semirings, PODS 2007,
   https://web.cs.ucdavis.edu/~green/papers/pods07.pdf): the head is
   the free monoid X*; every state fold is the UNIQUE homomorphism out
   of it; "the chain remembers what the fold forgives" = ker(ĝ); the
   certificate is a commuting-triangle witness (span head = free
   object, program digest = ĝ, schema digest = carrier, input anchor =
   generator map) — explains ticket 005's four fields exactly. mathlib
   already has FreeMonoid.lift + uniqueness, so R5 mechanization is
   plausibly a short Lean proof. STRONGEST single item of the fleet.
2. N-owner effector generalization via IC3PO (Goel & Sakallah, NFM
   2021, https://arxiv.org/abs/2103.14831): symmetry in the finite
   instance IS the quantifier in the unbounded invariant; the
   identity-free variant is evidence the register is owner-symmetric.
   Mechanizable route for ticket 013. Fallbacks: Ip & Dill scalarsets,
   cutoff synthesis, (0,1,∞)-counter abstraction.
3. Linearization-point placement corollary (over Complete CALM,
   Hellerstein, arXiv 2602.09435 — READ FIRST; decides corollary vs
   strengthening): minimal synchronization is a plain read iff P is
   stable, a CAS at evaluation iff ¬P is stable. The four sabotaged
   variants are ready-made only-if witnesses.
4. Forget(fence) safety (Helland, "Idempotence Is Not a Medical
   Condition," ACM Queue 2012; Ramalingam & Vaswani, POPL 2013):
   nothing retires a Done — the register is a monotonically growing
   liability. Conjecture: forgetting is safe iff gated on the fence
   watermark, never wall-clock. Apalache-fast; publishable because
   everyone ships the unsafe time-based policy.
5. Verifiable MPC (MPC + heads): a client determines a replica's
   prefix in O(1) bytes and detects off-prefix replicas; "a mirror
   read is linearizable iff mirror head = origin head, MPC-consistent
   otherwise, distinguishable from the head alone" (chain-replication
   lineage: van Renesse & Schneider, OSDI 2004). Slots into the
   existing catalog model; designs ADR-0009's replica read path.
6. Polarity admissibility law for flb.type.v0 (Zeilberger/Levy): only
   positive shapes may be content-addressed; a negative-type node
   refuses with polarity named. Turns "functions have no canonical
   bytes" into a theorem that predicts which extensions break identity.
7. Query-safety law for replicas (Keep CALM and CRDT On): classify
   every read verb monotone/non-monotone; a mirror answers exactly the
   monotone ones — non-monotone reads become structurally unservable
   from replicas.
8. Early-cutoff theorem (Build Systems à la Carte): state-equal
   implies downstream-agree; register Done keyed on state digest
   short-circuits re-derivation; Nix-style resolved form for program
   identity.
9. Third-homomorphism wall (Gibbons, JFP 1996): a fold computable as
   both left and right fold is a homomorphism — random-split wall test
   grants a fold the parallel-replay and mid-compaction licenses.
10. Monoid-annotated state proofs (SADS, EUROCRYPT 2013,
    https://www.iacr.org/archive/eurocrypt2013/78810351/78810351.pdf;
    Trillian gap): if the state fold factors through a monoid, state
    evolution between heads verifies in O(log n) via measure-annotated
    Merkle nodes — the audit-cost collapse, bounded experiment first.
11. Event-structure characterization (Winskel 1987): register events
    with ≤ = fence monotonicity, # = same-fence-different-owner;
    theorem: reachable spec states ≡ configurations. Partial-order
    proof that ignores interleaving; natural route to unbounded owners.
    The scouts found NO prior work connecting event structures to
    replicated logs — possibly open ground.
12. Certificate dual digests (Interaction Trees, Xia et al., POPL
    2020, https://arxiv.org/abs/1906.00046): digest equality implies
    weak bisimilarity, not conversely; fusion is a
    bisimulation-preserving digest-CHANGING rewrite, so certificates
    should record fused and unfused program digests. Ticket-005 input.

## D. Warnings and stated-limitation candidates for VERIFICATION.md

- Split-view equivocation is unaddressed: recomputation proves
  self-consistency, never that everyone saw the same history; the two
  histories can be incomparable (neither a prefix). Anti-equivocation
  is irreducibly social (a witness with memory). Remedy: import B's
  checkpoint format + witness cosigning (C2SP tlog-witness).
- Absence has no proof behind it: every "not present" is a daemon
  assertion — awkward beside recompute-everything. Sorted-key Merkle
  non-inclusion proofs close it under collision resistance alone.
  Until then the ledger should say: lineage-as-query is a convenience
  claim, not a verifiability claim (SEEMless line of work).
- 828/828 is fault-sensitivity, not coverage (eXtreme Modelling in
  Practice, MongoDB, PVLDB 2020, https://arxiv.org/abs/2006.00915).
  Owed: spec-state coverage of the schedule corpus, published beside
  the sensitivity number. Complementary second bridge: trace
  validation of production/gauntlet kill-9 runs via constrained TLC
  (Cirstea, Kuppe, Loillier, Merz, SEFM 2024,
  https://arxiv.org/abs/2404.16075), with corrupted-trace negative
  controls.
- The assumption ladder is a theorem, not a preference: O(1) audit is
  provably unreachable from hashing alone under mild hypotheses
  (Hall-Andersen & Nielsen, EUROCRYPT 2023,
  https://eprint.iacr.org/2022/542). Rungs: collision resistance →
  O(n) replay (today); + tree shape → O(log n) (free); random-oracle /
  knowledge assumptions → O(1) (Nova/ProtoStar/Arc territory,
  https://eprint.iacr.org/2021/370). State it as a table.
- Adoption vs fork-detectability tension: fork-linearizability makes
  forks PERMANENT so they stay detectable (SUNDR, OSDI 2004); our
  adoption heals forks. Depot's fork-join-causal consistency (OSDI
  2010, https://www.cs.utexas.edu/depot/depot-osdi10.pdf) is the one
  prior resolution — merge facts as the join. Must be grilled before
  the public piece; the theorem "adoption cannot launder a concealed
  operation out of the head" may come out NEGATIVE, which would be a
  finding.
- RFC 8785 is Informational, not Standards Track; canonicalization
  closes half the hole — a constrained parser is as load-bearing as a
  canonical writer. JCS number edges (±2^53 boundaries, negative zero,
  exponent boundaries) are the sharpest near-term cross-language risk:
  a differential fuzz lane is cheap insurance (codex-shaped).
- Lamport's composition critique ("Composition: A Way to Make Proofs
  Harder," 1998,
  https://lamport.azurewebsites.net/pubs/lamport-composition.pdf)
  challenges ticket 012's premise: composition pays only if the
  boundary buys something — decidability of the verification
  conditions is the purchasable something (Taube et al., PLDI 2018,
  EPR discipline). Before building: write the falsifiable
  proof-effort claim; predicted structure: the abstract CAS resolving
  late-determined nondeterminism is the prophecy-variable signature
  (Abadi & Lamport 1991,
  https://lamport.azurewebsites.net/pubs/refinement.pdf; Lamport &
  Merz 2017).

## E. Tooling accelerants for the ladder

- endive (Schultz, Dardik, Tripakis, FMCAD 2022,
  https://arxiv.org/abs/2205.06360): invariant inference directly on
  TLA+. Calibration discipline: run on the EFFECTOR first (answer
  known) as a negative control on the tool, then aim at
  CatalogInd.tla.
- Kondo taxonomy (Zhang et al., OSDI 2024): split invariants into
  Protocol (human) and Regular (mechanical) piles; the Regular
  fraction of our catalog invariant is itself a publishable number.
- DPOR / unfoldings (Abdulla et al., JACM 2017; Pham, Jéron, Quinson,
  FORTE 2019 — TLA+-formalized, our exact system shape): measure how
  much of 12.7M states is commuting re-exploration before investing;
  conditional independence (equal-bytes appends commute, unequal
  don't) is expressible in their framework.
- GoJournal / Perennial (Chajed et al., OSDI 2021,
  https://www.chajed.io/papers/gojournal:osdi2021.pdf): ticket 012's
  object, already proved once — steal the crash-spec shape (crash =
  discard local state + unobserved CAS outcomes; theorem: every crash
  state equals the abstract log at some prefix — which is what
  verify-on-read enforces at runtime, aligning model and
  implementation for the ticket-010 bridge).

## Unclaimed territory (searched for, not found)

- Provenance semirings × cryptographic commitment: no paper appears to
  cross the universal provenance object with a commitment scheme. C1
  is that crossing.
- Event structures × append-only replicated logs: the CRDT literature
  re-derives the machinery without citing Winskel. C11 sits in the gap.

## Read-first stack

1. Hellerstein, "Complete CALM" (arXiv 2602.09435) — decides whether
   C3 is a corollary or a strengthening; determines the community
   piece's framing.
2. Kuper et al., "Freeze After Writing" (POPL 2014) — the nearest
   structural neighbor; vocabulary and theorem shape, one afternoon.
3. Crosby & Wallach (USENIX Security 2009) — the smallest change with
   the largest ledger delta.
4. Goel & Sakallah (NFM 2021) — the N-owner theorem, possibly this
   quarter.
5. Green, Karvounarakis, Tannen (PODS 2007) — the theorem that
   explains why the whole design was always going to work.
