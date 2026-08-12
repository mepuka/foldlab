# Proof tooling and the ADT/monad/fold literature: what bears load here

Coordinator briefing. Two questions answered: (1) which mechanized-proof
tools fit which of OUR claims; (2) which results in the algebraic-datatype /
monad / fold space are genuinely relevant, not just adjacent.

## 1. The tool ladder, matched claim-by-claim

The amended SPEC §10.1 distinguishes five epistemic states (proof, bounded
model check, property sampling, integration tests, deployment assumptions).
Each tool below upgrades specific claims one rung.

### Model checking — TLA+/TLC and Apalache (first target, highest yield)

The effector audit's hand-rolled bounded enumerator (14-transition
counterexample; 3,919-state clean check) is exactly what TLC does
professionally. The upgrade path:

- Specify the single-key effector (SPEC §6.1) as a TLA+ module: states
  Absent | Claim(f,o,e) | Done(f,r), actions create/steal/commit-begin/
  commit-finish/crash, invariants FencingSafety and UniqueOutcome.
- TLC checks all interleavings to a bound; **Apalache** (symbolic, SMT-backed)
  can prove an INDUCTIVE invariant — an unbounded proof, mechanically
  checked, of A6.1/A6.2. That closes the audit's own caveat ("the bounded
  result is not substituted for proof").
- Same treatment for the journal: J1–J3 as a module, then the engine's
  appendOutcome retry loop against concurrent engines + crash-stop. The
  P3b sibling-conflict defect and the conflict-retry convergence question
  are liveness properties TLC finds mechanically (WF/SF fairness).
- Precedent: Newcombe et al., "How Amazon Web Services Uses Formal
  Methods", CACM 2015 — the tool pays off precisely on protocols this size.

### Decidable protocol verification — Ivy (the sleeper candidate)

Padon et al.'s Ivy (PLDI 2016+) restricts specifications to a decidable
fragment (EPR) where invariant checking is AUTOMATIC and unbounded.
Mutual-exclusion-with-generations protocols are its home turf; the
single-key effector very likely fits. If it does, we get a push-button,
unbounded fencing proof — stronger than Apalache's per-invariant workflow.
Worth a one-day feasibility spike.

### SMT solvers directly — Z3/CVC5 (embedded refutation harness)

- **Naming injectivity for OP-5**: encode the combinator grammar (Angle A's
  dseq/dpar/dforEach/drace ASTs) and the address-assignment function;
  assert two distinct occurrences receive equal addresses; UNSAT = an
  injectivity proof for the whole fragment, not a test.
- **Institutionalize the audit's method**: a tiny transition-system DSL in
  the repo compiling to SMT, so "bounded refutation" becomes a standing
  gate capability instead of a heroic one-off.
- Honest limit: RFC 8785's shortest-round-trip float serialization is a
  poor SMT target; E1's number case stays with the external-vector gate.

### Proof assistants — Lean 4 / Coq (the mechanization rung proper)

The valid core of SPEC is inductive structures and folds — proof-assistant
bread and butter:

- §2 chains: head–history identity (T1), incremental ≡ whole verification
  (2.5), cursor safety — model H as an injective oracle (the standard
  collision-resistance axiomatization) and these are short inductive
  proofs.
- §4 deciders: fold segmentation (monoid action), history quotient.
- §5: replay determinism over the free monad — see interaction trees below;
  the induction is mechanized-friendly.
- **The proof-carrying-fixture bridge** (the payoff that fits our repo):
  the mechanized model EXPORTS golden vectors (canonical encodings, chain
  heads, replay results) that the existing TS/Go law suites consume as
  fixtures. Then a fixture mismatch means implementation-vs-THEOREM
  divergence, not implementation-vs-implementation. Our conformance
  discipline already runs on frozen fixtures — this only upgrades their
  provenance.

### History checkers — Elle/Jepsen (evidence from the real substrate)

Kingsbury & Alvaro's Elle infers (anti-)serializability from recorded
histories. Deployment premises (3.2a/3.3 leader-consistency, K3) can be
CHECKED against real NATS run histories rather than assumed — the
"deployment assumptions" epistemic state gets its own instrument.

## 2. Recent ADT/monad/fold results that actually bear load

### Interaction trees and choice trees (the mechanized free monad, solved)

Xia et al., "Interaction Trees" (POPL 2020): a coinductive free-monad-like
structure over an operation signature, with a mature Coq library: `interp`
into state/error monads IS a monad morphism (our §8.1 claim is their
theorem), equivalence is weak bisimulation, and large verified artifacts
(Vellvm) are built on it. Chappe et al., "Choice Trees" (POPL 2023) extend
to nondeterminism and concurrency — CTrees are the exact vehicle for
mechanizing our recorded-winner race semantics (§5.9/A4). If we mechanize
§5, we do NOT start from scratch; we instantiate ITrees/CTrees with our Op
signature and inherit a decade of metatheory.

### Build systems à la carte (our engine, classified by someone else)

Mokhov, Mitchell, Peyton Jones, JFP 2020: build systems decompose into a
REBUILDER (when to redo) × SCHEDULER (in what order). In their taxonomy our
engine is precisely: rebuilder = **constructive traces** (content-addressed
recorded outcomes — their term for exactly our fact memo), scheduler =
suspending. Consequences imported for free: their **cloud build** theory is
our shared effector cache (P4's cross-execution dedup IS Bazel/Nix remote
caching, formally); their **early cutoff** property is a named optimization
we do not yet have (if a re-run activity produces the SAME outcome bytes,
downstream re-computation can stop — a future rung with a ready-made
theory). Their selective-functor analysis also locates exactly which build
structures admit static dependency analysis — the same boundary as Angle
A's naming fragment.

### Authenticated data structures, generically (the dashboard's theorem)

Miller, Hicks, Katz, Shi, "Authenticated Data Structures, Generically"
(POPL 2014): the λ• language Merkle-izes ANY pure ADT computation — prover
and verifier run the same fold, the prover emits a proof stream, the
verifier checks it against one root hash, with a general correctness
theorem. Our chain verification, DAG anchoring (8.3), and the Observatory's
verifiable dashboard are INSTANCES: a verified fold over authenticated
structures. The generic result says this generalizes to any projection we
will ever write — "verifiable projections" is not a feature list, it is one
theorem applied per fold. (Related engineering lineage: certificate
transparency trees; hash-consing formalized by Conchon & Filliâtre.)

### Recursion schemes with fusion (snapshots and incremental folds)

The bananas/lenses lineage (Meijer et al. 1991) matured into a practical
catalog — Yang & Wu, "Fantastic Morphisms and Where to Find Them" (MPC
2022). Load-bearing for us: replay is a catamorphism; incremental
verification is fold fusion (already cited at 2.5); a SNAPSHOT (§9.3, OP-2)
is precisely a paramorphism checkpoint whose soundness is the fusion law —
when we build the snapshot rung, its proof obligation is a known algebraic
identity, not new mathematics.

### Effect handlers with program logics (verifying the engine as a handler)

Our engine is a handler stack over the Op signature. de Vilhena & Pottier,
"A Separation Logic for Effect Handlers" (Hazel, POPL 2021) and the OCaml 5
effects line (Sivaramakrishnan et al., PLDI 2021) give program logics for
exactly this shape; Zhang & Myers (POPL 2019) treat abstraction-safe
handler composition — relevant when P6 composes interpreters and we need
"the guarded interpreter refines the plain one" as a stated, provable
relation.

### Graded/indexed monads (budget fences, later)

Katsumata's graded monads give effect systems with quantitative indices —
the natural type-theoretic home for OP-4's budget fences (spend caps as
grades composed along ⨟ and ⊗). Noted for the rung that needs it.

## 3. Proposed mechanization lane (P-Mech, when capacity allows)

1. TLA+ single-key effector + Apalache inductive invariant (unbounded
   A6.1/A6.2); journal + appendOutcome next. (Days, high certainty.)
2. Ivy feasibility spike for push-button fencing. (One day, informative
   either way.)
3. Lean 4: chains + folds + replay determinism via an ITree-style Op
   instantiation, EXPORTING golden vectors consumed by the existing suites
   — proof-carrying fixtures. (The real rung; measured in weeks.)
4. SMT injectivity check for whichever OP-5 angle survives its fork.
5. Elle-style history checking over live-plane runs as a standing
   deployment-premise gate.

Each item upgrades a named SPEC claim to a named higher epistemic state;
none replaces the law suites — they are the falsification floor the proofs
must keep agreeing with.
