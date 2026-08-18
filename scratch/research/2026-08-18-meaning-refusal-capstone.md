# Refusal as the learning plane: a capstone synthesis

Status: SYNTHESIS, coordinator-written at the operator's direction,
2026-08-18, at the close of the kernel-model walkthrough session.
Draws on: the kernel model and its KM-1..KM-21 sheet (PR #91), the
projection survey, the CALM/formats/chirality survey (CR-1..CR-10,
CP-1..CP-9), the LLM-as-algebraic-interpreter survey (LI-1..LI-10,
experiments E-α/β/γ), and the columnar spike (SK-1..SK-6). Everything
below composes existing findings; no new machinery is proposed. The
standing fences ride the whole document: safety only — nothing here
claims convergence WILL happen, only what is true when it does; and
the attribution fence — every "who" means a credentialed connection
under a writ.

For an outsider, the one-paragraph frame: this estate coordinates
fleets of AI agents (and their human operators) over a store where
every value is named by the hash of its bytes, all shared state
merges like sets (order-free, duplicate-free), and the only
non-mergeable act — picking one winner — is quarantined behind a
fenced door. The question this document answers: in such a system,
what IS semantic alignment, how do meanings settle without anyone
coordinating, and where does learning live? The answer, compressed:
alignment is digest equality, settling is a measured lattice process
punctuated by rare fenced seals, and learning lives on the refusal
plane — the one channel that carries structured negative information.

---

## 1. The three responses to disagreement, and why only one teaches

Every system that lets many parties speak must answer: what happens
when they disagree? The estate has exactly three answers, and the
triage between them is the CALM split itself:

1. **Join it.** Compatible knowledge merges — two observation sets
   union, two ontology proposals coexist as candidates. No
   coordination, no loss, no teacher. The join plane accumulates
   POSITIVE knowledge silently.
2. **Fence it.** Genuinely exclusive choices — which binding is
   authoritative, which outcome landed — pass through the one priced
   door, at most one winner, by token. The fence SETTLES but does not
   explain.
3. **Refuse it.** Unlawful shapes — the closure list's fourteen rows,
   the door-completeness checks — are returned with structure:
   reason, the law defended, the taught repair, and a
   machine-applicability marking. Only this channel carries "why
   not."

The first two channels are where classical CRDT and consensus
literature live, and neither teaches: a join has no opinion, and a
fence has no explanation. The refusal is the estate's only
information-bearing NO — and the session's refusal work (KM-20,
KM-21) made it a first-class citizen: refusals have digests, repairs
pin the refusal they answer (the repair loop is catalog lineage),
fault sets are semilattices arbitrated by a declared priority order,
and refusals re-enter the monotone plane as evidence. Conflict, in
this design, is not an error state. It is a data plane.

## 2. Alignment is digest equality — semantic space, not time

The operator's standing theory — alignment is a knowable semantic
state over a content-addressed DAG, not a moment in time — becomes
mechanical with this session's results:

- Two parties are ALIGNED on a domain exactly when their semantic
  carriers have joined to the same digest. Alignment is not an
  agreement event; it is the observable state of a semilattice
  having absorbed both parties' evidence. The chirality survey's
  CP-1 (equal root digests iff equal verified object sets) is this
  claim's invariant form, and no surveyed system occupies it.
- MISALIGNMENT is therefore computable, not diagnosed: the symmetric
  difference of two semantic states, locatable by Merkle diff in
  time proportional to the divergence, not the corpus. "How aligned
  are these two agents" stops being a survey question and becomes a
  subtree listing.
- And because reads are anchored, alignment claims are dated by
  position, never by clock: "aligned at anchor A" is a permanent
  fact; "aligned now" is not a sentence the language can say. This
  is the semantic-space thesis enforced by the grammar: there is no
  time coordinate for alignment to be relative to.

## 3. The settling machine: how ontology converges without coordination

The estate already contains the full lifecycle of uncoordinated
semantic settling, distributed across constructs that this synthesis
reads as one machine:

1. **Proposal is free.** Anyone — agent or human — declares concepts
   (schemas), relations (G27's claims-tier edges), and bindings.
   Proposals accumulate on the join plane; nothing blocks, nothing
   is overwritten. Competing meanings COEXIST as candidates.
2. **Ambiguity is a verdict, not an error.** The directory returns
   contested names as an ambiguity listing in canonical order — the
   conflict held open, visible, citable. The session machinery even
   types the lifecycle: opened, filled, DISPUTED, decided, sealed.
   Dispute is a stage every meaning may pass through, not an
   exception.
3. **Usage is measurement.** Which schemas get referenced, which
   relations get cited, which candidate a fleet actually resolves —
   all of it is fold-class, head-relative, free. De facto settling
   emerges as a MEASUREMENT (usage concentrating on one candidate)
   with no decision ever taken. This is the monotone path to
   consensus-of-practice, and it needs no fence.
4. **The seal is rare and priced.** When settling must be
   authoritative — this schema IS the meaning of "invoice" for this
   protocol — that is one fenced rebind by whoever holds the writ.
   The fence exists so that most settling never needs it.

"Uncoordinated ontological settling" is then precise: the candidate
space fills monotonically, usage folds measure convergence, and the
fenced seal fires only where de facto convergence is insufficient.
Safety-only discipline applies: nothing guarantees usage WILL
concentrate — the claim is that when it does, the state is knowable,
and when it does not, the disagreement is a listing, not a fight.

## 4. The refusal plane routes learning: competence versus ignorance

KM-20's stability classification is, read for learning, a signal
router. Every refusal an agent receives is one of two kinds:

- **Intrinsic** (permanent under world growth — clock reads, LWW,
  unfenced decides, cross-sort comparisons): the agent's model of
  the LANGUAGE is wrong. This is a competence error — a training
  signal. Retrying is provably futile; the repair is a rewrite.
- **Door-relative** (anti-monotone under growth — forward
  references, off-writ referents): the agent's model of the WORLD
  is incomplete. This is an ignorance signal — an acquisition
  prompt. The repair is to grow the world (declare the referent,
  request the writ) or wait for it to grow.

No error channel in surveyed systems makes this distinction, and it
is exactly the distinction a learner needs: update your grammar, or
update your knowledge. The machine-applicable marking refines it
further — four repairs are functions of the refused candidate alone,
so the correction is executable without judgment. A learning agent
in this estate receives, with every mistake: which kind of wrong,
which law, what to do, and whether doing it is mechanical.

## 5. The curriculum assembles itself, uncoordinated

KM-21's re-entry rule — refusals journal onto lanes as attributed
evidence — makes the learning corpus a CRDT:

- Every agent's refusals join into shared negative knowledge; the
  fleet's collective "what has been refused, where, for what" is a
  semilattice, converging like any cell, order-free.
- The measurement canon applies to it: refusal counts per reason
  (commutative monoid), distinct refused shapes (semilattice,
  sloppy-safe), refusal-rate-at-anchor per schema, per agent, per
  reason — a full observability plane of misalignment, all
  monotone, all coordination-free.
- Triggers close the loop lawfully: refusal patterns are evidence,
  evidence-appears is a production, so "when off-writ refusals
  accumulate, hint the writ-widening declaration" is a standing
  sentence in the CURRENT grammar. Refuse → journal → fold →
  trigger → repair declaration → fewer refusals: the compositional
  learning loop runs entirely on the monotone plane, and its
  convergence is measurable as the refusal rate falling toward zero
  at a fixed language version.

That falling rate is the operational definition this synthesis
offers for semantic alignment between a layer and the language:
aligned means no longer being refused, and the path there is paved
with taught repairs.

## 6. One curriculum, three layers

The refusal plane teaches every layer of the stack with the same
material, which is what makes it the alignment instrument rather
than an error log:

- **Humans** learn by the prose register: refusals carry the law's
  name and the repair in words (and after KM-18, in algebra). The
  self-containment gate's refusal leg makes this literal: an agent —
  or a person — has learned the language only when they have been
  refused and executed the taught repair.
- **Symbolic agents** learn by lineage: repairs pin refusals, so an
  agent's improvement is a queryable chain in the catalog — not
  "the agent got better" but "here are the seventeen
  refusal-to-admission chains it traversed."
- **Neural models** learn by label: the reader's survey found that
  richer-than-binary verifier feedback measurably improves training
  (repair benchmarks jumping 28→72 percent on the strength of an
  admissible-alternatives field; process rewards beating outcome
  rewards), and that NO published verifier teaches repairs — making
  E-γ (repair-as-label fine-tuning on the door's output) the
  estate's uniquely enabled experiment. The closure list's planted
  programs are hard negatives with labeled reasons; the emitter's
  generated vectors are label-perfect positives; the door is the
  reward channel. The training loop is the proof infrastructure,
  reused.

One metric spans all three: refusal rate at a fixed language
version. A human, a symbolic agent, and a fine-tuned model are
aligned with the estate's meaning to exactly the degree the door has
stopped saying no to them — and the door says WHY in every case.

## 7. Why the learning is compositional: closure makes the negative space finite

The deepest structural fact under all of this: the grammar's closure
is what makes conflict-as-curriculum tractable. An open language has
an unbounded error space; this language has sixteen refusal reasons,
fourteen closure rows, eight generators, and a combinator discipline
(KM-19: the rungs are varieties, closed under the HSP constructors)
under which every lawful construction inherits its proofs. Learning
the language means learning a FINITE boundary — and everything
beyond the boundary is composition, which inherits lawfulness rather
than requiring new learning. The neural literature's sharpest
weakness — the compositional generalization cliff (in-distribution
mastery collapsing on structurally novel programs) — is exactly the
failure mode the door catches, labels, and converts into the next
round of training data. The known cliff becomes the curriculum's
next chapter, automatically, because the verifier sits where the
generalization fails.

## 8. Human and agent layers: the chiral reading

The two layers meet on identical state — both resolve the same
digests, both join the same cells, both are refused by the same door
with the same taught repairs (refusal parity is layer-blind). Their
difference is not access to truth but ROLE, held apart by exactly
the asymmetries the algebra prices: writs (authority meets downward
— agents hold narrower grants), and ratification (the operator's
seal on concepts is a fenced act agents cannot perform). This is the
chiral-pair shape from the survey, applied to governance: state
plane symmetric, role plane antisymmetric, the asymmetry maintained
by fenced facts rather than by information hiding. This very
session is the existence proof: the agent layer filled the KM sheet
monotonically — twenty-one proposals, no blocking, no overwrites —
usage and walkthrough measured which mattered, and the operator's
rulings (the projection adoptions, the refusal ratifications) were
the rare fenced seals. The grill IS the fence; the sheet IS the
bind plane; the settling was uncoordinated until the moment it was
priced.

## 9. Honest bounds

1. **No liveness.** Nothing above claims meanings WILL settle,
   usage WILL concentrate, or refusal rates WILL fall — only that
   each state, reached, is knowable, citable, and safe.
2. **The learning claims are staged, not proven.** E-α (rung
   coalescence), E-β (emitter fine-tune), E-γ (repair-as-label) are
   priced experiments; the refusal-as-reward reading rests on
   adjacent measurements, not estate runs. The Q1 harness and these
   three are the path from thesis to evidence.
3. **Attribution rides everything.** "Human layer" and "agent
   layer" mean credentialed connections under writs until G4 lands.
4. **The KM-20 stability laws are stated, unproven** — the
   intrinsic/relative split awaits its membership-monotonicity
   inductions after the unity bridge.
5. **Ontological settling by usage measurement needs its folds
   built** — the citation-graph reductions exist as C10 instances
   in principle, not as shipped declarations.

## 10. The thesis, in one sentence

In a substrate where knowledge can only grow, authority can only
narrow, and one door refuses everything else with its reason, its
law, and its repair — conflict stops being the failure mode of
coordination and becomes its instrument: the refusal plane is
simultaneously the curriculum that trains every layer, the metric
that measures their alignment, and the pressure that settles
meaning — without anyone, human or agent, ever having to agree on
anything except what has already been proven.
