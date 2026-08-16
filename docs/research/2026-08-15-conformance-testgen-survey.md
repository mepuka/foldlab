# Model-based test generation & conformance testing — primary-source survey

Commissioned 2026-08-15 as part of the operator-ordered independent
review (sub-report of the SOTA research thread; Opus 5 agent).
Verbatim below, including the agent's own verification discipline:
`[V]` = source fetched and claim read; `[C]` = citation verified from
another paper's bibliography, full text not read; `[U]` = unverified,
do not rely on it. The agent's stated coverage gaps are preserved.

---

**Coverage gaps, stated up front:**
- **§2 (TLS/QUIC — de Ruiter/Poll, McMillan/Zuck Ivy) is NOT in this
  report.** A delegated agent had not reported back.
- §3 and §4 are partial (search budget exhausted mid-task).

## §1. ioco — input/output conformance for labelled transition systems

**This is the on-point theory: the model IS an LTS.**

### 1.1 The relation, precisely

`[V]` From Brandán Briones, Gerhold, van den Bos, Stoelinga, *Time for
Quiescence*, arXiv:2507.18205v1 (https://arxiv.org/abs/2507.18205):

> Let 𝒜I be an IOTS and 𝒜S an LTS. Then **𝒜I ioco 𝒜S iff
> ∀σ ∈ Straces(𝒜S): out(𝒜I after σ) ⊆ out(𝒜S after σ)**

with `out(s) = {o ∈ ActO | s →ᵒ} ∪ {δ | if s is quiescent}`.

- **δ (quiescence)** — a virtual output denoting the absence of any
  real output, observed as a timeout. The defining move of ioco vs
  plain trace inclusion: "produced no output" is itself an observation
  that can be right or wrong.
- **Straces** — suspension traces over inputs ∪ outputs ∪ {δ}.
- **IOTS vs LTS** — the implementation is assumed input-enabled; the
  specification may be partial. This asymmetry is load-bearing.

The relation says: the implementation must never produce an output the
spec cannot produce at that point, and must never be silent where the
spec must speak. It quantifies only over traces of the specification.
ioco is not an equivalence and has known pathologies (§1.4).

### 1.2 Test generation and what a suite establishes

`[V]` From TorXakis docs
(https://torxakis.org/userdocs/stable/mbt/mbt_with_lts.html):

> "There are test generation algorithms that are proved to be *sound*
> – all ioco/uioco-correct suts pass all generated tests – and
> *exhaustive* – all ioco/uioco-incorrect suts are **eventually**
> detected by **some** generated test."

Read the quantifiers: **soundness** holds for every generated test (a
red test is always a real defect, modulo harness bugs).
**Exhaustiveness** is existential over an infinite generated set — a
green finite ioco suite establishes nothing about absence of faults.

`[C]` Theory primary sources (fetch attempts 403'd):
- J. Tretmans, *Conformance testing with labelled transition systems*,
  Computer Networks & ISDN Systems 29(1):49–79, 1996.
- J. Tretmans, *Model based testing with labelled transition systems*,
  LNCS 4949, pp. 1–38, Springer 2008.
  https://link.springer.com/chapter/10.1007/978-3-540-78917-8_1

### 1.3 n-complete test suites for ioco — finite exhaustiveness

`[C]` P. van den Bos, R. Janssen, J. Moerman, *n-Complete Test Suites
for IOCO*, ICTSS 2017, LNCS 10533, pp. 91–107 —
https://link.springer.com/chapter/10.1007/978-3-319-67549-7_6 ;
author copy
https://petravdbos.nl/publications/CompleteTestSuitesForIOCO.pdf ;
journal version Software Quality Journal 27(2):563–588, 2019.

`[V, abstract-level only]` An n-complete suite guarantees detection of
all faulty implementations with a bounded number of states; this work
eliminates prior structural restrictions, relying only on (a) a bound
on implementation states and (b) fairness in test execution. **The
agent could not verify the precise assumption set (PDF extraction
failed) — read the paper directly before relying on details.**

Related `[V]`: van den Bos & Vaandrager, *State Identification for
Labeled Transition Systems with Inputs and Outputs*, arXiv:1907.11034
— generalizes Lee & Yannakakis adaptive distinguishing sequences from
FSMs to LTSs (LTSs allow arbitrary input/output ordering, output
nondeterminism, partiality).

### 1.4 Known sharp edges

`[C]` Janssen, van den Bos, Tretmans et al., *the corner cases of
ioco* (unread, 403): ioco is not transitive in general; `uioco`
exists to repair behaviour under underspecification. Also flagged:
compositional testing with ioco (van der Bijl & Rensink); quiescence
under composition (arXiv:1202.6124); probabilistic ioco
(arXiv:1504.02441).

## §1b. FSM conformance — the W-method and the rigorous "enough tests" result

### The completeness statement, precisely

`[V]` From Kocsis & Rot, *Complete Test Suites for Automata in
Monoidal Closed Categories*, arXiv:2411.13412v3
(https://arxiv.org/abs/2411.13412):

> "A test suite T ⊆ Σ* is complete for 𝒮 with respect to a fault
> domain 𝒰 if for all DFAs ℳ ∈ 𝒰, 𝒮 ∼_T ℳ implies 𝒮 ∼ ℳ."

A suite is **m-complete** when 𝒰ₘ = all DFAs with at most m states.
**You cannot get unconditional exhaustiveness from finitely many
black-box tests, but you can get exhaustiveness relative to a bound on
the implementation's state count.** Passing an m-complete suite means:
either the implementation is equivalent to the spec, or it has more
than m states.

The W-method suite: state cover P (one access sequence per state);
characterization set W (a distinguishing sequence per inequivalent
state pair); suite `T^k_{P,W} = P · Σ^{≤k+1} · W`; **theorem: the
suite is (n+k)-complete** for minimal deterministic 𝒮 with n states,
implementation ≤ n+k states. Size O(|P| × |Σ|^{k+1} × |W|) —
exponential only in the extra-state budget k. For a small LTS with
small k, tractable.

Assumptions `[V]`: 𝒮 minimal; both deterministic over the identical
alphabet; implementation state bound n+k (the risk-carrying
assumption); P and W available. The paper recovers this for DFAs,
Moore, and Mealy machines.

Primary sources `[C]`: T. S. Chow, IEEE TSE 4(3):178–187, 1978 (the
W-method's origin); Fujiwara et al., IEEE TSE 17(6):591–603, 1991
(the Wp-method — shorter suites, same power).

`[U]` UIO sequences and the Lee & Yannakakis 1996 survey: not
verified. Live research leads (unfetched): arXiv:2410.19405,
arXiv:2502.04035, arXiv:2106.14284.

## §1c. Tooling — are the ioco tools alive?

- **TorXakis** (https://github.com/TorXakis/TorXakis) `[V]`: Haskell,
  BSD-3, SMT-backed (Z3/CVC4), Philips as industrial partner.
  **Dormant**: latest develop commit 2025-06-20 is a dependency bump;
  the one before is 2021-08-06; 325 open issues; self-described
  proof-of-concept. Take the theory, not the dependency.
- **JTorX** `[U]`: assume unmaintained until checked.
- **Axini** (commercial, ioco-based) `[U]`: unconfirmed.
- **LearnLib** (https://github.com/LearnLib/learnlib) `[V]`: active
  (Java, Apache 2.0); L*, TTT, KV, Lambda; RPNI, OSTIA. `[U]` whether
  it ships W/Wp equivalence oracles — strongly suspected, unverified.

## §2. TLS & QUIC conformance — NOT DELIVERED

Delegated agent had not reported. Uncovered, all high priority:
Wycheproof; tlsfuzzer; TLS-Attacker; **de Ruiter & Poll, Protocol
State Fuzzing of TLS, USENIX Security 2015** (learn the
implementation's automaton with L*, diff against the model — arguably
the single most transferable idea); DTLS (USENIX 2020) and SSH (SPIN
2017) follow-ons where a model checker over the learned automaton is
the oracle; **McMillan & Zuck, Formal Specification and Testing of
QUIC, SIGCOMM 2019** (Ivy spec compiled into a randomized active
tester); quic-interop-runner; h2spec.

## §3. PBT against executable specifications — PARTIAL

**QuickChick** (Coq/Rocq) `[V]`: active; ITP 2015 *Foundational
Property-Based Testing*; POPL 2018 generator derivation; PLDI 2022 /
2023; Software Foundations Vol. 4. `[U]` **whether QuickChick can
test a foreign implementation at all** — the framing suggests it is an
in-proof-assistant tool for testing Coq propositions, which would be a
negative result for the Lean→Go use case. Verify before relying.

Not reached: **Lean 4 Plausible** (the consumer's actual language —
highest-value unexamined area), Quviq/AUTOSAR numbers (folklore here
— do not cite), PropEr, quickcheck-state-machine, Go-side rapid /
gopter / `go test -fuzz` corpus format, fiat-crypto.

## §4. Test vectors as a shipped artifact — PARTIAL, one live finding

### Ethereum — the production pattern, verified

`[V]` **`ethereum/execution-spec-tests` is ARCHIVED**; everything
migrated into https://github.com/ethereum/execution-specs (EELS,
CC0-1.0). Verified README quotes: "an executable Python reference
implementation of Ethereum's execution layer, along with the test
cases that verify it"; "a shared, runnable description of
consensus-critical behaviour, and the accompanying tests generate
fixtures that can be used to validate execution client
implementations."

**What crosses the gap:** declarative pre-state/transaction/post-state
cases are *filled* by executing a reference transition tool, which
computes expected outputs; serialized as JSON fixtures; released as
tarballs; replayed by every client in its own language. **Consumers
named in the README: besu, erigon, ethrex, geth, nethermind, reth** —
six independent production clients replaying fixtures produced by one
executable spec.

**The trust-base fact `[V]`:** EELS characterizes itself as a
reference implementation, NOT normative (normative prose is the EIPs).
The oracle computing expected post-states is itself a hand-written
program: a green fixture suite means "you agree with EELS," not "you
are correct."

`[U]` fixture counts, fill mechanics, formats, and — importantly —
**any concrete evidence of bugs caught**. Adoption evidence is strong;
efficacy evidence was not verified.

### WebAssembly and Wycheproof — NOT COVERED

`[U]` Priors worth checking before citing: wast core tests may be
hand-written with the OCaml reference interpreter as oracle;
Wycheproof vectors may be hand-curated-to-known-bugs rather than
model-generated (which would make it a weaker precedent than its
reputation).

## Synthesis for foldlab's situation

1. The instinct is correct for a specific reason: 12 hand-written
   vectors carry **no fault-domain argument** — no statement "an
   implementation passing these differs from the model only if
   ⟨condition⟩." Every technique above supplies that conditional.
2. Two different guarantees; don't conflate: ioco generation gives
   soundness over an unbounded stream (red = real defect; green means
   nothing); W/Wp m-completeness gives **conditional exhaustiveness**
   (pass ⇒ equivalent, provided the implementation has ≤ m states) —
   for a small LTS this is a small suite and the strongest available
   "enough tests" claim. The bridge for LTSs is n-complete ioco
   (§1.3) — read it directly.
3. Assumption audit first: W-method needs minimal, deterministic,
   same-alphabet, known state bound. LTS complications (output
   nondeterminism, partiality) are real and named.
4. The shipping architecture with the best production evidence is
   Ethereum's: executable spec computes expected outputs → JSON
   fixtures → each implementation replays in its own language. Same
   shape as the existing vectors — **the fix is not to abandon the
   vector format but to stop hand-writing the vectors and have the
   Lean model emit them**, with enumeration driven by a W/Wp-style
   cover rather than intuition.
5. The trust base shifts but does not vanish: generated vectors move
   trust from "did the human think of this case" to "is the model
   right, and is the serialization faithful." The serialization
   boundary becomes new unverified surface.
6. Don't adopt the ioco tools (TorXakis dormant). Take the theory;
   write the generator in Lean.

## Explicit unverified list

All of §2; exact Tretmans 2008 theorem wording; n-complete ioco
assumption set; LearnLib W/Wp oracles; JTorX/Axini status; QuickChick
foreign-implementation capability; all Quviq/AUTOSAR numbers; all
Lean 4 specifics (Plausible, ToJson, native oracle, FFI); all Go PBT
specifics; all Ethereum counts/mechanics/efficacy; all WebAssembly
claims; Lee & Yannakakis contents; UIO; Wp internals.
