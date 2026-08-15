# Literature lane: monotone determinism (LVars, CALM, CRDTs, Bloom^L)

2026-08-14, Opus reader report, persisted verbatim (minor formatting
only). One of four lanes dispatched from the study lane; synthesis
follows when all four land. The by-field prediction in §3 was CONFIRMED
by probe the same day (E2 record, Addendum 2).

## 0. Verdict table

| E2 claim | Nearest theorem in the literature | Status |
|---|---|---|
| **1.** Commuting moves → one state digest | LVars **Theorem 1 (Determinism)**, via Lemma 4 (Diamond) → Corollary 1 (Strong Local Confluence) → Lemma 7 | **Proof skeleton importable verbatim.** Your claim is a strictly *smaller* statement than theirs (fixed intent lists, named holes, no allocation) |
| **2.** Conflicts surface to a fence, never LWW | **Nothing.** SEC is satisfied by LWW-Register too | **Must prove; and the current negative control does not have teeth** |
| **3.** Consumers may hook only stable predicates | Kuper & Newton **Def. 6 (Threshold Consistency)**; Laddad et al. monotone-query condition; CALM | **Importable as a definition**, but your `watch` is a *handler*, not a threshold read — the correspondence breaks in two places |

## 1. LVars / LVish (Kuper, Turon, Krishnaswami, Newton)

### The exact statements

**Determinism** — LVars, FHPC 2013, Theorem 1: if σ ↪→\* σ′ and
σ ↪→\* σ″ and neither can step except reflexively, then σ′ = σ″. Chain:
Lemma 1 (Independence, a frame rule generalizing separating conjunction
to ⊔) → Lemma 2 (Clash: if the framed store joins to ⊤, the
configuration steps to `error`) → Lemma 3 (Error Preservation) → Lemma 4
(Diamond) → Corollary 1 (**Strong** Local Confluence, i ≤ 1 ∧ j ≤ 1) →
Lemmas 5–7 → Theorem 1.

**Quasi-Determinism** — Freeze After Writing, POPL 2014, Theorem 1: if
σ ↪→\* σ′ and σ ↪→\* σ″ and neither can step, then either (1) σ′ = σ″ up
to a permutation on locations π, or (2) σ′ = `error` or σ″ = `error`.

**Threshold set**: a non-empty Q ⊆ D that is *pairwise incompatible* —
the lub of any two distinct elements of Q is ⊤. `get` blocks until the
LVar's state is at or above some d′ ∈ Q, then returns **{d′}, not the
LVar's contents**. Enforced semantically by the `incomp(Q)` premise on
E-GETVAL.

### Correspondence and its limits

**The fence is `freeze`, and E2 ran the freeze-last idiom.** LVish loses
determinism only because freeze does not commute with a value-changing
write. The E2 fence runs only after every agent has settled and decides
by a function of the order-free candidate set. That is exactly LVish's
freeze-after-quiescence, which is why E2 saw zero error outcomes: **E2
was in LVish's fully-deterministic `Det` fragment, not the
quasi-deterministic one.** LVish encodes this distinction as a
determinism level indexing the `Par` monad — the static type reflects
the guarantee. That is the typed-watch-API design, already built, in
Haskell, in 2014.

**The limit that matters:** production fences cannot wait for global
quiescence. The moment a fence may fire before all disputes have
arrived, you leave `Det` and the strongest available theorem is the
*disjunction* — same answer or an error — not equality. Pre-registration
should say which regime each fence is in.

**Three ways claim 1 is not an instance of theirs:**

1. **The nondeterminism space is smaller here.** LVish quantifies over
   all executions with dynamic allocation; hence "up to a permutation on
   locations" and a renaming metatheory. Foldlab holes are string-named
   and runs are interleavings of fixed intent lists — **drop the
   permutation clause and get syntactic byte-equality of the state
   digest**, strictly stronger and strictly cheaper. Bank this.
2. **Their determinism covers observations by construction; ours does
   not.** LVars' only read is a threshold read. Claim 1 is about state;
   the stability law is the observation half — two theorems, one of
   which was unproved.
3. **Their ⊤ is terminal; our conflict is repairable.** LVars send an
   incompatible write to ⊤/error, discarding both values. Foldlab
   refuses it as data and the agent re-issues as a dispute. **There is
   no theorem in the LVars line for a repairable clash.** Name it
   `clash_repair_confluence`: if `step s m = refusal r`, the canonical
   repair `repair(m, r)` is admissible and restores the diamond. Without
   it, `conflict_surfaces` is a one-step statement, not a run statement.

**`filled_unstable` is a rediscovery of a caveat they flagged**:
quiescence detection is "a transient, negative property" that does not
commute (POPL'14 §3.2 fn. 3). The naive predicate firing on three
meaning-points is that footnote, measured.

### The bridge paper

**Joining Forces (WoDet 2014)** unifies LVars and CvRDTs:
Definition 1 (state-based object with threshold queries), Theorem 1 (a
threshold CvRDT is SEC), and **Definition 6 (Threshold Consistency)**:
for all i, j: if cᵢ ⊆ cⱼ and gⱼ(a) blocks, then gᵢ(a) blocks; if
cᵢ ⊆ cⱼ and gⱼ(a) = s, then gᵢ(a) either blocks or returns s.
**Definition 6 is the stability law, stated as a property of
observations**: a shorter history either blocks or agrees.

## 2. CALM

Ameloot, Neven, Van den Bussche, JACM 60(2):15, 2013: coordination-free
(semantic) transducers; **Theorem 12**: every query distributedly
computed by a coordination-free transducer is monotone. **Corollary 13
(CALM)**: coordination-free ⟺ oblivious ⟺ monotone. Hellerstein &
Alvaro, CACM 63(9), 2020: consistency-as-confluence formulation.

**It subsumes claim 3 and only claim 3.** It does not subsume claim 1
(different object) and says nothing about claim 2.

**Where the fence is unavoidable — the precise answer.** `decide`
requires knowing the candidate set is *complete*. Completeness is an
absence check, non-monotone, hence by Theorem 12 (contrapositive) **no
coordination-free implementation exists.** The fence-CAS is a price, not
a choice — now a citation, not an intuition.

**The single-seat case has a name: sealing** (Marczak et al.,
Confluence Analysis for Distributed Programs, Datalog 2.0 2012; Blazes,
ICDE 2014). "This hole has one seat" statically discharges the absence
check. **The `seats:` declaration is a compile-time seal** — a seal
converts a non-monotone completeness test into a static fact, which is
why single-seat fills are stable while multi-seat fills are not.

Scope caveat: Ameloot quantifies over all horizontal partitions;
foldlab's journal is single-homed per venue. CALM governs the fold over
evidence and cross-venue federation; intra-venue behavior already bought
a total order. See also Ameloot et al., TODS 40(4), 2015 (weaker
monotonicity forms).

## 3. CRDTs (Shapiro, Preguiça, Baquero, Zawirski — SSS 2011 / RR-7506)

Definitions: EC (Def. 2); **SEC** (Def. 3: equal causal histories ⟹
equivalent state); monotonic semilattice object (Def. 4); **Theorem 1**
(state-based semilattice ⟹ SEC); Def. 6 + **Theorem 2** (op-based with
commuting concurrent updates under causal delivery ⟹ SEC);
**Theorems 3–4** (state-based ⟷ op-based emulation).

**SEC does not give claim 2.** LWW-Register is a CvRDT and is SEC.
Convergence is indifferent to data loss. **Control A (clobber) fails
only because it clobbers without a deterministic tiebreak** — a clobber
ordered by (digest, holder) would converge on one state digest across
all 12 schedules and still silently lose a write. The claim-2 control is
therefore weaker than the claim it defends. The teeth must be a
specification property: **no-loss** — every admissible fill either
appears in the terminal state or in the candidate set of a dispute a
fence decided. Add `no_loss` to task 48 and add a deterministic-LWW
control that passes convergence and must fail `no_loss`.

**The dispute set is the MV-Register** (citation for the shape; not a
free theorem). **The `prev` pointer discharges Theorem 2's causal-
delivery hypothesis by construction** — the hash chain IS causal
delivery. **Theorems 3/4 justify the two-fold architecture**: moves are
op-based, fold state is state-based, and the emulation theorems say the
views are interchangeable — the head/fold-state separation now has a
citation.

**Honest scope:** inside one venue, a single journal + CAS is strictly
stronger than SEC. **CRDT theory is a design-space import, not a theorem
import** — load-bearing only if two daemons ever hold the same hole,
which the doctrine forbids.

### The latent claim-1 violation (CONFIRMED by probe same day)

`filled(value, by)` with a single holder: for ⊔ to be idempotent and
commutative, the holder component must itself be a join (attester set)
or must not be in the state. Two agents filling the same hole with the
SAME value: either semantics (idempotent-keep-first, or refuse-and-
dispute) yields schedule-dependent state digests. E2's fixtures used
distinct values per hole, so this was untested. Probe confirmed:
2 digests across 12 schedules. Same defect underlies the initially
false `single_seat_stable` statement.

## 4. Bloom^L / Lasp — typing the watch API

Conway, Marczak, Alvaro, Hellerstein, Maier (SoCC 2012): **monotone
function** (a ≤ b ⟹ f(a) ≤ f(b)) vs **morphism**
(g(a ⊔ b) = g(a) ⊔ g(b)); morphisms are monotone, not conversely.
**Operationally load-bearing for the watch API:** a morphism into
`lbool` evaluates incrementally per move (stream operator off the
journal tail); a merely monotone predicate must re-fold. The `stable()`
combinator set should carry two tiers (`morph` / `monotone`).

**Bloom^L's `lbool` + `when_true` is `watch(pred, {onRise})`, already
built** — their quorum example is structurally identical to
`stableReady`. Bloom^L generalizes CALM analysis from set lattices to
arbitrary declared lattices (the per-hole state lattice is not a set
lattice). **Points-of-order analysis suggests fence placement could be
DERIVED rather than declared**: declare seats + fence rule, compute the
stability tier — removing declaration-drift risk.

**Lasp** (PPDP 2015): programmer-visible non-monotonicity as monotone
metadata inside the CRDT — `decided(v)` is a monotone encoding of a
non-monotone act (closing a hole), the 2P-Set tombstone trick.
Monotonicity-preserving map/filter/product/fold is the composition story
for multi-hole predicates.

**Closest neighbor**: Laddad et al., Keep CALM and CRDT On, PVLDB
16(4), 2022 — monotone query over a CRDT: ∀i ≤ j: Q(i) ⟹ Q(j) — **the
stability law verbatim, four years earlier**, with the observation that
CRDT guarantees cover updates but not observations. Foldlab's delta:
(a) stability as a PROTOCOL obligation rather than developer guesswork;
(b) enforcement in types. Claim exactly that and no more.

## 5. Where the framing genuinely diverges

1. **Committing a linearization and keeping a certificate of it.** CALM
   and CRDT systems discard order; LVars never had one. The chain head
   is deliberately order-dependent while the fold state is not. The
   two-fold separation keeps CALM applicable to meaning while retaining
   an audit artifact. No surveyed system does this — the strongest
   genuine novelty, currently described as a glossary entry rather than
   a result.
2. **"Moves on disjoint holes commute" is a Mazurkiewicz independence
   relation** (Mazurkiewicz 1986; Diekert & Rozenberg 1995). Claim 1
   is: the meaning fold factors through the trace monoid — constant on
   Mazurkiewicz equivalence classes. "12 schedules → 6 orderings →
   6 heads → 1 state digest" says the 6 orderings lie in one trace
   class. Correct formalization, 40 years old, upstream of the DPOR
   work already cited in 2026-08-13-literature-resonances.md.
3. **Refusals are recoverable; every error in this literature is
   terminal.** fill → refusal → dispute is a local repair preserving
   confluence. Unproved and unnamed anywhere in this literature.
4. **Foldlab's ⊤ carries evidence.** LVars collapse conflicts to error,
   discarding both values; foldlab collapses to `disputed({a,b})` — the
   join in a powerset lattice rather than a flat one. Same algebra,
   strictly more information at the top; this is why the fence can be a
   deterministic function of the candidate set while LVish's freeze can
   only be an exception.

## Top 5 changes to the model

1. **Claim 2 has no teeth as tested.** Add `no_loss`; add a
   deterministic-LWW control (passes convergence, must fail no_loss).
2. **The `by` field breaks claim 1** (CONFIRMED). Decide: drop `by`
   from meaning state, or attester set. Same defect as the false
   `single_seat_stable`.
3. **`watch` is a handler, not a threshold read — two bugs**: (a) LVish
   handlers fire retroactively for pre-registration events — that
   retroactivity is what makes them deterministic; a rising-edge loop
   seeing only post-subscription transitions is schedule-dependent on
   late subscription even for stable predicates; (b) threshold `get`
   returns the threshold element, not the whole state — `{onRise}`
   handing the callback the full state leaks unstable parts through a
   stable trigger. **Constrain the payload, not just the predicate.**
4. **The stability law exists in the literature** (Threshold
   Consistency; Laddad monotone queries); the novel parts are protocol-
   declared stability and the seats-as-seal mechanism (with Bloom^L
   points-of-order suggesting tiers be computed, not declared).
5. **Two theorems to prove** (`clash_repair_confluence`; trace-monoid
   factorization) **and one proof chain to import** (LVars'
   Independence → Clash → Error Preservation → Diamond → Strong Local
   Confluence → Determinism; strong local confluence avoids Newman's
   lemma / termination hypotheses; drop the renaming metatheory — named
   holes give byte-equality).

## Sources

LVars FHPC 2013; Freeze After Writing POPL 2014; Joining Forces WoDet
2014; Kuper dissertation; Ameloot–Neven–Van den Bussche JACM 60(2) 2013;
Hellerstein & Alvaro CACM 63(9) 2020; Ameloot et al. TODS 40(4) 2015;
Shapiro et al. SSS 2011 / INRIA RR-7506; Conway et al. SoCC 2012;
Marczak et al. UCB/EECS-2011-154; Alvaro et al. CIDR 2011; Meiklejohn &
Van Roy PPDP 2015; Laddad et al. PVLDB 16(4) 2022; Gomes et al. OOPSLA
2017 (Isabelle/HOL SEC verification — template for the Lean plan).
