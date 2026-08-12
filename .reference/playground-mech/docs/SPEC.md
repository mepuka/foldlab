# The Kernel: A Formal Specification

Status: **NORMATIVE.** This document is the mathematical definition of the
system. Every rung in docs/primitives/ is an instantiation of a fragment of
this specification; every law suite is a falsification harness for a theorem
or axiom stated here. Where this document and an implementation disagree, the
implementation is wrong or this document gets a recorded amendment — never a
silent divergence. Vocabulary here extends CONTEXT.md; terms defined here are
canonical.

Conventions: `≜` definition, `Σ*` finite byte strings, `ℕ` naturals from 0,
`⇀` partial function, `∘` composition, `f[x↦v]` map update. All identity
claims are stated up to the collision assumption C1. Proof obligations are
marked **[PO-n]** and map to law suites; assumptions are marked **[A]**;
open problems **[OP-n]**.

RATIFIED AMENDMENTS A1–A10 (2026-08-11): a formal audit
(docs/research/kernel-formal-specification-primary-sources.md — ten
countermodels CEX-1..10, lemmas F1–F13 for the valid core, a bounded
transition check, and a primary-source index) refuted several original
universal claims. The clauses marked [AMENDED An] below are the ratified
replacements; the audit document is the provenance record. Headline: the
original two-key effector protocol was UNSAFE (fencing violated at depth
14); §6 now specifies the single-key protocol, verified by proof and by
3,919-state enumeration.

---

## §1. Values, encoding, identity

**1.1 (Canonical value universe).** [AMENDED A1] `V` is the least set
containing `null`, booleans, IEEE-754 binary64 values other than NaN,
infinities, and **negative zero**, Unicode strings consisting only of scalar
values permitted by I-JSON (no unpaired surrogates and no Unicode
noncharacters), finite sequences over `V`, and finite extensional maps from
such strings to `V` with unique keys. String equality is
code-point-sequence equality without normalization. (Excluding `-0` is what
makes E1 an actual injectivity statement — CEX-1.)

**1.2 (Canonical encoding and recognizer).** [AMENDED A1] `enc : V → Σ*` is
RFC 8785 serialization. Define `parseJson : Σ* ⇀ V` by strict I-JSON
parsing and `dec(b) = v` iff `parseJson(b) = v ∧ enc(v) = b`. `dec` is a
*canonical-byte recognizer*; a permissive boundary parser is a distinct
operation and confers no identity.

- **E1 (injectivity):** `enc(u) = enc(v) ⟺ u = v`.
- **E2 (retraction):** `dec ∘ enc = id_V`, and `enc ∘ dec = id` on the image
  of `enc`.
- **E3 (implementation agreement):** every conforming encoder — in any
  language — computes the same bytes for the same value. **[PO-1: P2a
  cross-language fixtures; SL1 external RFC 8785 vectors.]** E3 is what
  makes identity *portable*: it removes the encoder from the trusted base by
  making it recomputable everywhere.

**1.3 (Hash).** `H : Σ* → D` is SHA-256 (hex, |D| = 2²⁵⁶).

- **C1 [A] (collision resistance):** no feasible computation produces
  `x ≠ y` with `H(x) = H(y)`. Every "identity" and "detects" claim below is
  modulo C1.

**1.4 (Content identity).** `id ≜ H ∘ enc : V → D`. By E1 + C1, `id` is a
feasible-world injection: byte equality is value identity, and `id(v)` is a
location-independent, verifier-recomputable name for `v`.

**1.5 (The five addressable sorts).** The system content-addresses exactly
five sorts of data, all through `id`: **facts** (§2), **work** (§6),
**plans** (§8.4), **programs** (§8.5, [OP-3]), **artifacts** (opaque
`Σ*` under `H` directly). Nothing else carries identity; everything else is
a name, and names confer no authority (§9).

---

## §2. Chains

**2.1 (Entry).** An entry is `e = (seq ∈ ℕ, prev ∈ D, payload ∈ Str)` with
`digest(e) ≜ H(enc(e))`. (The no-newline constraint on `payload` is an API
boundary rule at authoring surfaces, not part of the mathematical object.)

**2.2 (Chain).** `G ≜ "0"⁶⁴` (genesis). A chain is a finite sequence
`c = ⟨e₀, …, e_{n−1}⟩` satisfying the linkage predicate:
`eᵢ.seq = i`; `e₀.prev = G`; `e_{i+1}.prev = digest(eᵢ)`.
`head(c) ≜ G` if `c = ⟨⟩` else `digest(e_{n−1})`.

**2.3 (Theorem — head–history identity).** If chains `c, c′` satisfy
linkage and `head(c) = head(c′)` with `|c| = |c′|`, then `c = c′`.
*Proof:* reverse induction; `digest` injective on entries by E1 + C1; each
entry embeds its predecessor's digest. ∎ **[PO-2: P1 CL laws.]**
Corollary: a single element of `D` commits an entire history. A head is a
*proof-carrying name* for a log.

**2.4 (Cursor; verified prefix).** A cursor is `(seq ∈ ℕ ∪ {−1}, head ∈ D)`.
`stepVerify((s,h), e)` accepts iff `e.seq = s+1 ∧ e.prev = h`, yielding
`(s+1, digest(e))`. A cursor `κ` is *valid for* chain `c` iff it is reachable
from `(−1, G)` by stepVerify over a prefix of `c`.

- **2.5 (Theorem — incremental completeness):** the fold of stepVerify from
  `(−1, G)` accepts exactly the linked chains, and equals whole-chain
  verification. *Proof:* fold fusion. ∎ **[PO-3: P1 incremental ≡ whole.]**
- **2.6 (The cursor law):** every reader interface returns only cursors valid
  for the bytes it has verified itself; a cursor never advances past an entry
  that failed stepVerify. A cursor is a *claim of a verified prefix*, and the
  claim is checkable by any third party holding the same bytes. **[PO-4: P1,
  P2b JL4/JL5, P3 EL5/EL9, P3b LP5.]**

---

## §3. The substrate (first-class: the broker is the model)

The system is defined against two abstract machines. NATS JetStream is the
*distinguished model*; the Go packages `kernel/journal` and `kernel/effector`
are the *reference morphisms* from the abstract machines to that model. The
TypeScript runtime is a *client* of the substrate, never a second authority.

**3.1 (Log substrate 𝕁).** A family of single-writer-per-position logs
indexed by name. Operations per name: `append(i, x)` and `read(i)`. Axioms:

- **J1 (linearizable positions):** all `append`s to position `i` are
  linearized; **exactly one** `append(i, ·)` ever succeeds, and it succeeds
  only when positions `0..i−1` are occupied and `i` is empty (create-only
  CAS at the tail).
- **J2 (immutability):** a successful `append(i, x)` fixes `read(i) = x`
  forever. No mutation, no deletion, no truncation is expressible.
- **J3 (durability):** a successful append survives crash-stop failure of
  every process; recovery loses no acked append. **[A at the physics level;
  PO-5: P3b LP3/LP4 and the measured kill/recovery evidence.]**
- **3.2 (Theorem — blind-retry byte decidability):** [AMENDED A2] after an
  `append(i, x)` with unknown outcome, a successful leader-consistent
  `read(i)` decides between: (a) `read(i) = x` — the retry is safely
  absorbed *regardless of which writer stored the bytes*; and (b)
  `read(i) ≠ x` — a foreign conflict. If nothing can be read, the operation
  remains unavailable. No observation of the immutable position
  distinguishes "my append succeeded" from "another writer first stored
  identical bytes" (CEX-6: the two histories are observationally
  identical). This byte-level dichotomy is the strongest decidable claim,
  and it is all the retry rule needs. ∎ **[PO-6: P2b JL3/LP7.]**

**3.2a (Model facts).** JetStream (nats-server ≥ 2.14.4) models 𝕁 via
`Nats-Expected-Last-Subject-Sequence` create-only publishes on a
deny-delete/deny-purge, no-eviction file stream. Measured model caveats are
normative for implementers: CAS is evaluated *before* msg-id dedupe at R=1
(so 3.2, not the dedupe window, is the retry mechanism); the max-payload
bound makes oversized values a named residue (§10).

**3.3 (Register substrate 𝕂).** A family of named registers with
`create(k, v)` (write-once wins at most once — **K1**), `get(k)` (returns
value and a revision), `cupdate(k, v, rev)` (succeeds iff `rev` is current —
**K2**), all linearizable per key **(K3)**. [AMENDED A3] JetStream KV
refines 𝕂 only in a deletion-free, TTL-free configuration whose reads are
leader-consistent. The reference deployment is standalone R1 with no
mirror; a clustered deployment MUST replace direct KV `Get` with a
leader-served read or separately prove linearizability (CEX-2: a
follower-served read after a completed update violates K3). Generic
follower/mirror reads are outside the model.

**3.4 (Journal).** A journal is a chain (§2) stored in 𝕁, entry at position
`i` in log slot `i`, with the additional invariant that stored bytes are
canonical: `read(i) = enc(eᵢ)`. Readers re-verify linkage AND
`H(read(i)) = digest(dec(read(i)))` — the wire is the canonical encoding or
it is refused. **[PO-7: P2b JL1/JL5, TestNonCanonicalWireRejected.]**

---

## §4. State machines

**4.1 (Decider).** `𝔇 = (C, E, S, s₀, decide : C × S → E*, evolve : S × E →
S, T ⊆ S)` with all components total functions over subsets of `V`.
`replay ≜ foldl(evolve, s₀) : E* → S`.

- **D1 (determinism):** decide/evolve are functions. **D2 (replay
  equivalence):** any incremental evolution equals cold replay — `E*` acts
  on `S` as a monoid action, so folds segment arbitrarily. **D3 (terminal
  absorption):** `s ∈ T ⟹ decide(c, s) = ⟨⟩`. **[PO-8: P0 suite.]**
- **4.2 (Theorem — state is a history quotient):** reachable states are in
  bijection with `E*/∼` where `x ∼ y ⟺ replay(x) = replay(y)`; with §1,
  state identity is byte identity of `enc(replay(·))`. ∎

**4.3 (Bridge).** A journal whose payloads are `enc(e)` for events `e` of a
decider ties §2 to §4: `replay ∘ mapDec ∘ verify` — integrity from the
chain, meaning from the fold. **[PO-9: P1 bridge law.]**

---

## §5. Journaled interpretation (durable execution)

**5.1 (Programs).** A workflow body is a computation in the free monad
`W ∈ Free(Op, A)` over the operation signature

`Op ::= act(name, eff) | obs(src) | gate(name) | sleep(name, d) | spawn(plan)`

where `eff` is an external effect producing a `V`-encodable exit, `obs`
observes an environment value (time, randomness), `gate` awaits an external
fact, `sleep` awaits a deadline, `spawn` starts a plan (§8.4). The *program
constraint*: all nondeterminism and all effects occur through `Op` — the
pure spine between operations is a function. **[A per program; discharged
for the catalog by construction.]**

**5.2 (Operation identity).** [AMENDED A4] In the *proved fragment*, each
dynamic operation carries an explicit occurrence label `path`, stable and
injective within its execution; human-readable names are metadata and need
not be unique. Sequential and structured-parallel combinators MUST assign
disjoint paths compositionally. Programs whose host scheduling can change
paths are outside the proved fragment pending **[OP-5]** (CEX-8: colliding
labels break oracle agreement even crash-free). Operationally the deployed
identity is `opId = tag(executionId ∥ "/" ∥ path ∥ "/" ∥ attempt)` where
`tag ≜ H ∘ utf8` — a DISTINCT named sort from `id = H ∘ enc` (CEX-10);
`utf8` is injective, so `tag` inherits injectivity from the label modulo
C1. Wherever this document previously wrote `id(work)` for operation or
work identity, read `tag` of the pinned label string.

**5.3 (Fact log).** The execution's journal carries facts
`F ⊆ {(opId ↦ outcome)}` as chain entries; §3.4 applies. Define
`memo(F) : D ⇀ V`, the map of first-committed outcomes.

**5.4 (The interpretation).** `I_J(W)` evaluates `W` under the rule: at
operation `op` with identity `k`:

1. if `memo(F)(k) = o` — yield `o`; the effect does not run (replay);
2. else perform the operation obtaining `o`; append `(k, o)` at the current
   verified head (J1); on conflict, re-read (3.2): if `k` now committed with
   `o′`, yield `o′` (adoption); else retry at the new head.

`I_live(W)` is the same evaluation with rule 1 and the append deleted (the
oracle). `I_∅` denotes `I_J` over an empty store.

**5.5 (Theorem — replay determinism).** [AMENDED A4] For terminating
programs in the proved fragment — total deterministic continuations, ALL
nondeterminism (race winners included) represented as an `Op` outcome in
`F` — and fixed `F` covering all of `W`'s operations, `I_J(W)` is a
deterministic function of `F`: independent of schedule, wall clock, and
prior evaluations. *Proof:* induction on `Free(Op)`: every leaf yields
`memo(F)(opId)` (injective labels, 5.2), and the spine is a function. ∎
**[PO-10: P3 EL1/EL2, P3b LP6 quantified over generated programs.]** A race
whose winner is NOT a recorded outcome is outside the fragment (CEX-8's
second schedule).

**5.6 (Theorem — exactly-once commitment).** For every `opId`, at most one
outcome is ever in `memo(F)`. *Proof:* first commit wins by J1 + J2;
adoption never writes. ∎ **[PO-11: EL6, LP8 fact-uniqueness.]**

**5.7 (Proposition — opaque-effect crash window).** [AMENDED A5] No
protocol can guarantee exactly one execution of an *opaque, non-idempotent*
external effect that neither participates in an atomic transaction with the
fact log nor exposes an idempotency key or authoritative status lookup: a
crash between effect and fact commit creates indistinguishable histories.
Systems such as RIFL escape the proposition precisely by adding a durable
atomic completion record at the authoritative target — the escape hatch is
*scope*, not cleverness. §6 minimizes the window for opaque effects and
cannot eliminate it. **[Honest-scope clauses: P3b LP6, P4 spec.]**

**5.8 (Theorem — oracle agreement).** [AMENDED A4] For a crash-free,
failure-free, single-writer evaluation of a proved-fragment program with
deterministic operation implementations, `I_∅(W)` and `I_live(W)` return
equal exits. *Proof:* rule 2 always fires, appends never conflict, yielding
live outcomes in live order. ∎ **[PO-12: EL1, DT5, LP6's oracle arm.]**

**5.9 (Corollary — nondeterminism absorption).** [AMENDED A4] Recorded
observations determine replay for a FIXED program/codec version over a
trusted, available fact log; by 5.5 the recorded execution is deterministic
forever. A race is covered only when its winner is itself a recorded
operation outcome. **[PO-13: P5 DT1–DT4.]** [OP-5] marks the frontier.

---

## §6. The effector (exactly-once commitment for shared work)

Work is shared beyond one execution: identity is `d = tag(work-label) ∈ D`
(§5.2). [AMENDED A6 — the original two-key protocol (separate claim and
outcome registers) is REFUTED: its fence check and outcome create are not
atomic across keys, so a stale owner that passes its check, pauses through
a steal, and wins the outcome create commits under a superseded fence.
Countermodel found at depth 14 by bounded enumeration (trace: begin, steal,
finish — legal even with a single owner, since a lapsed claim re-taken by
its own owner increments the fence). Unique commitment survived; fencing
safety did not. The repair couples fence validation and protected mutation
at ONE linearization point.]

**6.1 (Protocol — one-key fenced commitment).** Per `d`, ONE authority
register `work.d` whose canonical value is `Claim(f, owner, expiry)` or
`Done(f, result)`, `f ≥ 1`; `Done` is terminal (no modeled transition
leaves it; no delete, TTL, or administrative mutation in the interface).

- `claim(d, o, ℓ)`: Absent —create→ `Claim(1, o, now+ℓ)` (K1); expired
  `Claim(f, ·, ·)` —cupdate at observed revision→ `Claim(f+1, o, now+ℓ)`
  (K2); live Claim ⇒ Held; Done ⇒ Committed.
- `commit(d, f, r)`: read `Claim(f, ·, ·)` at revision `ρ`; cupdate
  `work.d ← Done(f, r)` at `ρ` (K2). Success ⇒ first. Revision mismatch ⇒
  re-read: `Claim/Done` at `f′ ≠ f` ⇒ Fenced; `Done(f, r)` ⇒ idempotent
  success; `Done(f, r′≠r)` ⇒ Committed; Absent ⇒ Fenced.
- `lookup(d)`: Absent or expired Claim ⇒ Unclaimed; live Claim ⇒ Held;
  Done ⇒ Committed.

- **6.2 (Theorem — unique terminal outcome):** only a cupdate from `Claim`
  produces `Done`, every successful update changes the revision, and `Done`
  is terminal — so every history holds at most one terminal outcome value;
  a repeated same-fence/same-result commit merely reads it. ∎ **[PO-14: Go
  TestConcurrentDoCommitsOnce, TestCommitRefusesToOverwriteAForeignOutcome.]**
- **6.3 (Theorem — single-key fencing safety):** if generation `f′ > f`
  linearizes before a commit under `f`, that generation changed the
  revision of `work.d`, so the stale commit's cupdate — bound to the older
  revision — fails by K2; conversely if the commit under `f` linearizes
  first, the key is terminal and no later generation linearizes. A commit
  under `f` can NEVER succeed after any `f′ > f` claim has linearized. ∎
  Verified additionally by bounded enumeration: 3,919 states / 9,254
  transitions, no violation, with adversarial (pre-expiry-strength) steals.
  Safety mentions neither `now` nor `expiry` — clock-free. **[PO-15: Go
  TestStolenClaimCannotCommit, TestExpiredButUnsupersededClaimStillCommits;
  TS EF2; wire shape pinned by TestWireValuesAreCanonical.]**
- **6.4 (Liveness [A: partial synchrony]):** an uncommitted `d` whose
  claim's lease has lapsed is eventually claimable; no work is stranded by a
  crash. **[PO-16: Go TestLapsedClaimIsRecoverable,
  TestAdversarialCrashSchedule.]**
- **6.5 (Theorem — guarded execution).** `I_JE` ≜ `I_J` with rule 2's
  effects mediated by claim/commit/adopt. In a failure-free run with live
  leases, each effect body runs exactly once *system-wide* across any number
  of concurrent interpreters, and all interpreters agree on all outcomes.
  *Proof:* mutual exclusion by 6.3 while live; adoption (5.4.2, 6.1) makes
  losers readers; 5.6 lifts agreement into every journal. ∎ **[PO-17: EF1,
  EF3; contention measured at 6 executions unguarded vs 3 guarded.]**
  With failures, 5.7 applies: re-execution is bounded by claim generations
  (one per fence increment), each a recorded, countable event.

---

## §7. The trust model

**7.1 (Adversary).** The substrate operator (and the network) may attempt to
mutate, reorder, forge, or omit stored data. Writers are crash-stop, not
Byzantine. Readers trust exactly: their own computation of `enc`, `H`,
`dec`, and the axioms of arithmetic. Names, transports, and processes confer
no authority.

- **7.2 (Theorem — tamper detection and localization).** [AMENDED A7]
  DETECTION: a reader holding a trusted terminal anchor detects any
  different fully-supplied prefix of the anchored length by terminal-head
  mismatch, modulo C1. LOCALIZATION splits: structural corruption is
  reported at the first failed stepVerify; but the first divergence of two
  *individually valid, fully re-chained* histories requires BOTH histories
  or trusted intermediate anchors — a terminal head alone does not contain
  the location (CEX-7: `["a","b","c"]` vs `["a","x","c"]` both verify;
  only the anchor comparison fails, at the end). ∎ **[PO-18: P1 anchored
  soundness + firstDivergence, P2b JL5, P3 EL5.]**
- **7.3 (Theorem — verifiable execution-record CONSISTENCY).** [AMENDED A7]
  Given a trusted root anchor, the exact program and input, all journal
  bytes, and fixed codecs, a verifier proves chain integrity and recomputes
  the claimed result from recorded facts — no interaction with the original
  executor. ∎ What this does NOT prove (CEX-4): that any external effect
  physically occurred or any observation was truthful — a world that
  fabricates plausible facts produces byte-identical records. Claims about
  the WORLD require independently verifiable receipts, signatures,
  attestations, or an authoritative atomic transaction at the target. The
  record is a portable proof of *internal consistency*; that is still the
  system's raison d'être, stated honestly.
- **7.4 (Limits — stated, not waved at).** The substrate can *omit* (present
  a stale prefix) or *fork* (show different readers different extensions);
  content addressing cannot detect absence. Freshness and fork consistency
  require external anchoring or cross-reader gossip — deferred to
  federation. **[OP-1]** Availability is not adversarial-proof: a substrate
  can refuse service; the system degrades to unavailable, never to wrong
  (§3.4, cursor law).

---

## §8. Composition

**8.1 (Sequential).** [AMENDED A8] `W₁ ⨟ f ≜ W₁ >>= f` in `Free(Op)`. Each
interpreter in `{I_live, I_J, I_JE}` is explicitly the free-monad
catamorphism induced by an `Op`-algebra into its target monad, hence
preserves bind: `I(W >>= f) = I(W) >>= I ∘ f` — compositional replay.
Workflows under `⨟` form a Kleisli category. ONLY monad-law
transformations that also preserve dynamic operation *paths* (5.2)
preserve recorded semantics — refactoring that renames paths orphans
history. **[PO-19: P6 suite, owed.]**

**8.2 (Parallel).** [AMENDED A8] `W₁ ⊗ W₂` — JOIN-style composition with
disjoint operation-ID domains, fixed per-key outcomes, no cross-branch
reads of partial state, and no first-completion result. **Theorem
(confluence/isolation):** `memo(F)` is grow-only with per-key write-once
commits, so the final memo — and every result — is independent of commit
interleaving; the chain is a *linearization witness* and IS
order-dependent. Results are confluent; bytes are not. Races are NOT
covered (they need recorded winners, 5.9). The CALM boundary runs at
position allocation. **[PO-20: P6; EL7/LP8 are instances.]**

**8.3 (Theorem — cross-chain anchoring).** [AMENDED A8] For a finite
acyclic reference graph with canonical references, a trusted root, and
AVAILABILITY of every referenced prefix, verifying the referrer verifies
the reachable closure (Merkle DAG). This proves integrity — never
freshness or availability. ∎ **[PO-21: P7.]**

**8.4 (Plans).** [AMENDED A8] A plan is `p = (programRef, payload)` with
execution identity `id(p)`. Memoizing the parent's spawn outcome gives
exactly-once *commitment* of the spawn; **idempotent spawning additionally
requires the child authority to perform atomic create-or-lookup by
`id(p)`** — without it, the §5.7 crash window between child-start and
fact-append starts two children (CEX-5). Content identity makes
deduplication possible; the target's K1 performs it. **[PO-22: P6.]**

**8.5 (Programs as content [OP-3]).** [AMENDED A8] `programRef = id(program)`
when `program ∈ V`, else `H(programBytes)` for opaque canonical program
bytes. The replay-validity predicate `valid(F, P′)` remains open work and
MUST be scoped to a terminating or otherwise decidable program
representation — unrestricted, the question is undecidable.

---

## §9. Cost model (performance as law)

**9.1 (Costs are counted, not timed).** The normative cost measure is
substrate-operation counts (reads, entry-reads, appends, claim ops) — exact,
schedule-independent, and falsifiable with zero variance. Wall-clock appears
only where the *claim itself* is temporal (lease expiry, deadline recovery),
with discrimination bands ≥ 400ms.

**9.2 (Bounds).** [AMENDED A9] Scoped to the measured single-interpreter
regime: cold replay performs one range-read request and exactly `n` entry
verifications **[PO-23: PP3]**; warm catch-up verifies exactly Δ new
entries, possibly plus one empty read per resume **[PO-24: PP2]**; with
serialized local appends and NO foreign writer, each new fact costs exactly
one append attempt **[PO-25: PP1/PP4; the Θ(F³) failure these laws caught
is the precedent]**. Under `w` foreign interpreters the attempt count is
parameterized by contention — J1 supplies NO global `2n` bound (CEX-9:
`w` contenders can each attempt position 0). Progress under `k` cold
restarts is exactly `k·n` verifications — inherent to snapshot-free replay
and the motivation for:

**9.3 (Checkpoints — future).** A checkpoint `(seq, head, enc(state))` is
sound iff replay of the anchored prefix yields `state` (2.3 + 4.2 make this
checkable by any reader); it is an *optimization of §5, verifiable like
everything else, never a new authority*. **[OP-2]**

---

## §10. Conformance and refinement

**10.1 (What an implementation is).** [AMENDED A10] An implementation is:
models of 𝕁 and 𝕂 satisfying J1–J3/K1–K3 under their deployment premises
(3.2a/3.3); encoders satisfying E1–E3; interpreters satisfying §5/§6. Law
suites are FINITE FALSIFICATION AND REGRESSION EVIDENCE — a substrate is a
universal refinement only after a proof over its abstract model plus
evidence that the concrete deployment satisfies the model's premises.
Conformance reports MUST distinguish: formal proof, bounded model checking,
property sampling, integration tests, and deployment assumptions — these
are five different epistemic states and conflating them is how the refuted
§6.3 survived three green gates. Missing P6/P7 suites, every OP, and every
[A] remain explicit non-discharged obligations.

**10.2 (Named residues — normative, not shameful).** At-least-once
execution in the crash window (5.7); oversized values as poison (3.2a);
freshness/forks without anchors (7.4); store-side verification redundancy
(double-verify: reader AND client both fold — deliberate); in-process
scheduleClock pending [OP-2-adjacent]. A residue may be narrowed by a future
rung; it may never be silently assumed away.

**10.3 (Open problems).** **[OP-1]** fork consistency and freshness via
cross-anchoring/federation (P7). **[OP-2]** verifiable checkpoints and
journal reachability/GC. **[OP-3]** program content-addressing and the
`valid(F, P′)` decision procedure. **[OP-4]** budget fences: resource caps
enforced at claim time with provable accounting. **[OP-5]**
schedule-independent operation naming under unrestricted concurrency — the
determinism frontier's hard core.

---

## Appendix A — rung ↔ specification map

| Spec | Rung / suite |
|---|---|
| §1 E1–E3 | P0 canonical, P2a cross-language wall, SL1 (external oracle) |
| §2 | P1 chain laws |
| §3 𝕁 + 3.4 | P2b Go journal (reference morphism), P3b live plane |
| §3 𝕂 | P4 effector bucket |
| §4 | P0 decider laws; §4.3 = P1 bridge |
| §5 | P3 engine (EL), P3b LP/PP, P5 DT (obs/gate/sleep) |
| §6 | P4 Go suite + EF suite |
| §7 | P1 anchored soundness; JL5/EL5/LP5; 7.3 across all |
| §8 | P6 (owed), P7 (owed); LP8/EL7 as §8.2 instances |
| §9 | PP1–PP4; tracked baselines |
