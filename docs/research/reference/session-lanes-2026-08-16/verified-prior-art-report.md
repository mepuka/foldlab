# Verified prior art — CRDTs, CAS, and mechanized distributed-systems proofs

Lane report, 2026-08-16. All web retrievals this date. Environment:
`C:\Users\kokok\Dev\foldlab`, branch `agent/codex/kernel-hygiene-gates`.

Toolchain check, run before relying on anything (dispatch rule 2):

```
$ which lake lean elan
/c/Users/kokok/scoop/apps/elan/4.2.3/.elan/bin/lake
/c/Users/kokok/scoop/apps/elan/4.2.3/.elan/bin/lean
/c/Users/kokok/scoop/apps/elan/4.2.3/.elan/bin/elan
$ go version    -> go1.26.5 windows/amd64
$ bun --version -> 1.3.14
$ git --version -> git version 2.55.0.windows.2
```

Lean IS available (the brief marked it UNKNOWN). `cd verify/moves && lake build`
completed successfully, 23 jobs, exit 0. Every model claim marked **ran-it** was
obtained by EVALUATING the shipped Lean model, not by reading it.

## 0. What this lane adds, and what it deliberately does not repeat

Read first, per the brief: `docs/research/2026-08-13-number-determinism-dossier.md`
(111 lines) and `docs/research/2026-08-16-rq9-rfc8785-numbers.md` (885 lines).
Also checked for overlap: `rq2-extraction-proved-or-trusted` (camps A-D; the
seL4 / CompCert / CakeML / Lean-backend table), `rq3-wasm-verified-target`,
`rq6-reproducible-artifacts`, `rq4-verify-existing-implementations`.

- **Section 4 (verified kernels) is deliberately thin.** RQ-2 already places seL4,
  CompCert and CakeML in a four-camp taxonomy with primary quotes. Section 4 adds
  only what that framing does not cover: what seL4's *state-machine* refinement
  implies for D-d's *stateless* ABI.
- **Section 3 (CAS) extends rather than repeats.** RQ-9 covers numbers
  exhaustively. The strings `DAG-CBOR`, `IPLD`, `key order` appear NOWHERE in
  either dossier (grepped). The key-ordering divergence in 3.3 is new ground.

---

## 1. Mechanized CRDT proofs

### 1.1 Gomes, Kleppmann, Mulligan, Beresford - Isabelle/HOL (2017)

**Artifact.** AFP entry "A framework for establishing Strong Eventual Consistency
for Conflict-free Replicated Datatypes", submitted **2017-07-07**, BSD, sessions
`Util, Convergence, Network, Ordered_List, RGA, Counter, ORSet`
(https://www.isa-afp.org/entries/CRDT.html). Paper: OOPSLA/PACMPL 2017,
arXiv:1707.01747. Mirror: https://github.com/trvedata/crdt-isabelle.

**Runnable/checkable:** yes - AFP re-checks entries against current Isabelle
releases. NOT run here (no Isabelle on this machine; recorded as a limit).

**What it proves, informally.** Two nodes that delivered the same *set* of
messages end in the same state, provided concurrent operations commute and both
delivery orders respect happens-before. Verbatim, `Convergence.thy`:

```isabelle
theorem convergence:
  assumes "set xs = set ys"
          "concurrent_ops_commute xs"
          "concurrent_ops_commute ys"
          "distinct xs" "distinct ys"
          "hb_consistent xs" "hb_consistent ys"
  shows "apply_operations xs = apply_operations ys"
```

The network model is a separate locale and causal delivery is an explicit axiom,
`Network.thy`:

```isabelle
locale causal_network = network +
  assumes causal_delivery: "Deliver m2 : set (history j) ==> hb m1 m2 ==>
                            Deliver m1 <^j Deliver m2"
```

**Estate seam.** S7 (`packages/moves` <-> `verify/moves`); L2/L3 in
`verify/moves/Moves/Spec.lean:41-51`.

**CONFIRMS - and the estate's theorem is strictly stronger in one axis.**
Gomes et al. need `hb_consistent xs` and `hb_consistent ys`: both orders must
respect happens-before, which in any implementation means causal delivery, which
means vector clocks or equivalent. The estate's theorem carries no such premise:

```lean
theorem runRepairK_perm {l1 l2 : List Mv} (hperm : l1.Perm l2) :
    (forall m in l1, WireMove m) ->
      forall s : State, (runRepairK s l1).1 = (runRepairK s l2).1
```

(`Model.lean:1808-1810`.) Arbitrary permutations, not hb-consistent ones. The
reason is one theorem up: `repairK_comm` (`Model.lean:1789-1791`) requires only
`WireMove m1` and `WireMove m2` - EVERY wire move commutes with EVERY other, not
merely concurrent ones. Gomes et al.'s framework would discharge the estate's
case with `hb_consistent` vacuous, which is the sense in which "no vector clocks"
is licensed by the framework rather than in tension with it.

**Gap named.** Gomes et al. model a NETWORK - broadcast, delivery, per-node
histories, message uniqueness. The estate's model has no network: `Runs`
(`Model.lean:380-382`) is a permutation of one intent list applied to one state.
The estate has a theorem about ORDER, not about DELIVERY. Consistent with
`VERIFICATION.md:772-779` ("A single journal is modeled"; "Not modeled: crash
recovery, CAS, retries, leases, liveness...").

### 1.2 Sal - a Lean 4 RDT verification framework (2026)

**The most consequential find in the lane; it did not exist when the estate's
model lane was designed.**

**Artifact.** "Sal: Multi-modal Verification of Replicated Data Types", Pranav
Ramesh, Vimala Soundarapandian, KC Sivaramakrishnan; **arXiv:2603.27202**,
submitted **2026-03-28**; PDF keywords "CRDT, Verification, Lean, Multi-Modal
Proofs, Counterexample Generation"; repo **https://github.com/fplaunchpad/sal**
(811 commits on main). Venue: PaPoC 2026.

**Runnable:** yes; the repo states its own commands - `lake exe cache get`,
`lake update`, `lake lean <file>`, `./run_files.sh`. **Not run here** (needs a
separate toolchain + Mathlib cache + Z3; recorded as a limit).

**What it does.** Verifies state-based CRDTs and MRDTs under *replication-aware
linearizability*, staging automation "by trustworthiness": (1) `dsimp + grind`
producing kernel-checkable proofs; (2) `lean-blaster` encoding to **Z3**; (3)
`dsimp + aesop`. Suite of **30 RDTs (17 CRDTs, 13 MRDTs)** incl. LWW Register,
OR-Set, RGA, PN-Counter, Peritext. Pins **Lean v4.28.0**; forks
`kayceesrk/Lean-blaster`.

**The load-bearing detail.** Per the repository, Sal's SMT results are **not
proof-reconstructed** - they are admitted via Blaster's `MVarId.admit`,
"explicitly enlarging the TCB only at stage 2". Marked **primary-source**
(repository text), not ran-it.

**Estate seam.** `verify/moves` generally; specifically the hand-proved
semilattice obligations `finset_union_comm/_assoc/_idem` and
`dispute_merge_semilattice` (`Model.lean:200-256`).

**CONFIRMS the kernel-hygiene gates (brief 22) with unusual force.** Sal is a
serious published Lean RDT framework whose FAST PATH is exactly the channel
`verify/moves/run.sh`'s axiom-footprint check exists to catch: `MVarId.admit`
closes a goal with `sorryAx`, and the gate runs `#print axioms` over
thirty-nine rostered theorems, failing on anything outside
`{propext, Classical.choice, Quot.sound}` (`VERIFICATION.md:741-744`). A
Sal-style stage-2 discharge inside `verify/moves` would be caught mechanically.
The gates are not paranoia about a hypothetical; the field's newest Lean CRDT
tool ships that channel on by design.

**Prices a reuse option honestly.** Adopting Sal is not free:
- `verify/moves/lake-manifest.json` lists EXACTLY ONE package (`moves`) - the
  model has ZERO dependencies, not even Mathlib (checked). Sal needs Mathlib +
  lean-blaster + Z3.
- Toolchain skew: Sal pins **v4.28.0**; `verify/moves/lean-toolchain` pins
  **v4.33.0**.
- Sal verifies state-based CRDTs under replication-aware linearizability. The
  estate's calculus is neither state- nor op-based in Sal's sense (2.2), and its
  correctness condition is bag-confluence plus strong no-loss, not
  linearizability against a sequential spec.

### 1.3 The rest of the mechanized field, placed

| Artifact | Assistant / method | What it establishes | Runnable |
| --- | --- | --- | --- |
| VeriFx (De Porre, Ferreira, Gonzalez Boix, **ECOOP 2023**, 10.4230/LIPIcs.ECOOP.2023.9; artifact DARTS 9.2.19; `verifx-prover/verifx`) | own language -> **Z3**, fully automated | 51 CRDTs verified, 16 from industrial databases; OT study reproduced; transpiles to Scala/JS | yes (artifact-evaluated) |
| Nieto et al., Coq/**Iris** ("Conflict-free Replicated Data Types have Abstract Specifications", iris-project.org) | Coq + Iris separation logic | foundational verification INCLUDING client code; higher-order CRDT combinators | yes (Coq) |
| "Verifying Replicated Data Types with Typeclass Refinements" (**OOPSLA 2020**, Liquid Haskell) | LH refinement types | convergence obligations as typeclass laws | yes |
| "Type-Checking CRDT Convergence" (**PACMPL 2023**, 10.1145/3591276) | type system | convergence by typing rather than proof | yes |
| Zooid (**PLDI 2021**) | Coq | see section 5 | yes |

All **primary-source** (publisher metadata + repo pages, retrieved 2026-08-16);
none run here.

**Absence, recorded properly.** Searched for a Lean 4 / mathlib CRDT
formalization by the terms *"Lean 4" + CRDT / replicated data type /
convergence*, and *CRDT formalization Coq/Rocq/Lean mechanized*. Before Sal
(2026-03), **no Lean CRDT development was found**. The estate's decision to
hand-prove its semilattice laws in core Lean was, when made, not a failure to
reuse - there was nothing to reuse. That is now false.

---

## 2. Op-based vs state-based, versus evidence-union + fence

### 2.1 Where the literature already says what the estate claims

**Shapiro, Preguica, Baquero, Zawirski, "A comprehensive study of Convergent and
Commutative Replicated Data Types", INRIA RR-7506 (2011)**, HAL
`inria-00555588`; companion SSS 2011 paper (10.1007/978-3-642-24550-3_29).

**What it establishes.** If replica state forms a join-semilattice and merge is
the least upper bound, replicas converge under *eventual delivery with no
ordering, no duplicate suppression, and no causal delivery whatsoever*
("guaranteed to converge in a self-stabilizing manner, despite any number of
failures"). That is the CvRDT sufficient condition.

**Estate seam.** `EpistemicState.evidence` (`Model.lean:38-43`);
`repairFillLocal` / `repairDisputeLocal` (`Model.lean:1025-1037`, `:1573-1583`),
both merging by union only.

**CONFIRMS, and demotes the novelty claim.** The per-hole evidence set is a
grow-only set (G-Set) of `(value, holder)` pairs - the canonical CvRDT example
in the 2011 report. "Permutation-invariant bag union removes the need for vector
clocks" IS the CvRDT convergence theorem, established in 2011. The estate should
cite it rather than present it as a finding. What IS estate-specific: (a) the
union is over HOLDER-ATTRIBUTED pairs so provenance survives (L1 strong no-loss,
`Spec.lean:34-38`), and (b) the fence (2.3).

**Pure op-based CRDTs (Baquero, Almeida, Shoker).** DAIS 2014
(10.1007/978-3-662-43352-2_11); arXiv:1710.04469. Per the paper: commutative
operations need only standard **reliable causal delivery**; NON-commutative
operations need a **PO-Log** plus an extended API - **Tagged (Reliable) Causal
Stable Broadcast** - supplying causality metadata at delivery and later
signalling causal stability so the PO-Log can be compacted.

**REFUTES a possible misreading.** Pure op-based CRDTs do NOT remove vector
clocks; they move them into the broadcast layer's tags and add causal-stability
signalling. If anyone frames the estate as "pure op-based without the clocks",
that is wrong on the literature. The estate's fill/dispute fragment is
**state-based in the algebra and op-shaped on the wire**: it ships operations,
but merge is `replay(left ++ right)` (`packages/moves/src/kernel.ts:413-414`),
idempotent-by-union rather than delivery-dependent. A CvRDT wearing an op-based
transport - exactly the shape that needs no delivery guarantees.

### 2.2 What the estate pays for having no clocks - executed

**Experiment E1** (`lake env lean Probe.lean` from `verify/moves`; transcript
`probe-transcript.txt`). Holder A fills `10`, then corrects to `20`:

```
"E1 meaning      = disputed [(10, 0), (20, 0)]"
"E1 evidence     = [(10, 0), (20, 0)]"
"E1 receipts     = [true, true]"
"E1 support(10)=1 support(20)=1"
```

A single seat disputes with itself. No causal metadata could say "(20,A)
supersedes (10,A)", so **self-supersession is inexpressible**.

Then B fills `10`, agreeing with A's RETRACTED value:

```
"E1b evidence    = [(10, 0), (10, 1), (20, 0)]"
"E1b support(10)=2 support(20)=1"
"E1b plurality  = 10"
```

**The plurality fence returns A's retracted value, counting A's own superseded
fill as a vote against A's live one.**

**Estate seam.** `pluralityFenceRule` (`Model.lean:1331-1337`), `supportCount`
(`Model.lean:1280-1281`), and the DEV-675 "absorb" revision mode.

**This is the exact cost the MV-Register pays clocks to avoid.** In Shapiro et
al.'s multi-value register, a version vector prunes causally dominated values, so
a writer's correction replaces their earlier write and only genuinely CONCURRENT
values survive. The estate keeps everything (L1 is unconditional -
`Spec.lean:34-38`, "no disjunct, no escape hatch"), so the candidate set
conflates DISAGREEMENT BETWEEN SEATS with REVISION WITHIN A SEAT. **REFUTES** any
framing in which the estate's design is strictly better than a clock-pruned
conflict set: it is better on provenance and worse on supersession, and the trade
is not written down in `VERIFICATION.md` or `SLICE.md`.

Honest scoping: `single_seat_stable` (`Model.lean:1546-1549`) covers a seat whose
intents are VALUE-CONSISTENT; it says nothing about a seat that changes its mind,
which is precisely E1. The estate's protocol-level answer is the revision mode
(`successor-round` vs `absorb`, `protocol_step.go:113-119`) - but under `absorb`
the behaviour above is what ships.

### 2.3 The fence is not a CRDT operation, and the literature says it cannot be

**Experiment E2b.** Same bag, two permutations, decided value arriving late:

```
"E2b decide30 early meaning=disputed [(10, 0), (20, 1), (30, 2)] receipts=[true, true, false, true]"
"E2b decide30 late  meaning=decided 30 receipts=[true, true, true, true]"
```

Different terminal meaning AND different receipts. Control (E2): when the decided
value is ALREADY a candidate, decide DOES commute with later fills - `decided 10`
both ways, identical evidence. So the non-commutation is precisely the
"was it in the set yet" gate, not a blanket one.

**CONFIRMS the estate's own honesty.** `VERIFICATION.md:762-766` already says
"decide-bearing bags are order-sensitive by design... a decide admitted
mid-stream gates which later disputes refuse, and that gate is the one deliberate
schedule-sensitivity the calculus keeps." E2b is the concrete witness for a
sentence the ledger currently asserts without one.

**The literature statement the estate should adopt: CALM.** Consistency As
Logical Monotonicity - a problem has a consistent, coordination-free distributed
implementation IFF it is monotonic. Conjectured Hellerstein (PODS 2010 keynote);
proved for relational transducer networks by Ameloot, Neven, Van den Bussche
(JACM 2013); current treatment Hellerstein and Alvaro, "Keeping CALM: When
Distributed Consistency is Easy", CACM 2020, arXiv:1901.01930.

Mapped: the fill/dispute fragment is monotone (evidence only grows) ->
coordination-free, no clocks, confluent, and `runRepairK_perm` is the instance.
`decide` is non-monotone (it CLOSES a set; later information cannot revise it -
`decided_stable`, `Model.lean:1460`) -> CALM says coordination is REQUIRED.

**CONFIRMS close authority; REFUTES a stronger reading of `fence_deterministic`.**
Read the hypotheses precisely (`Model.lean:1342-1345`): `(r1 : Runs intents s1)`
and `(r2 : Runs intents s2)` - THE SAME `intents`. It says: given the same bag,
any sound rule decides identically. It does NOT say two replicas that have seen
DIFFERENT bags agree. The fence buys schedule-freedom, not coordination-freedom;
something must still establish "the candidate set is complete". The estate's
answer is D104 (`proto/DECISIONS.md:2562-2580`): close authority is a required
any-of declaration over seats, and close is a single authorized act. That is the
coordination point CALM predicts is unavoidable, and the estate has built it -
but it should be STATED as such, because "the fence removes the need for
coordination" would be false and is an easy sentence to write.

### 2.4 Attribution forgery - the audit's prediction, executed

`Model.lean:162` is the whole finding: the dispute case binds the actor to `_`.
The actor is discarded; the caller-supplied candidate set `cs` is unioned
wholesale (`Model.lean:168`), with no relation between the holder components of
`cs` and the disputing actor.

**Experiment E3.** Honest state: A and B both fill `10` (support 2). X, who has
filled nothing, disputes with two pairs attributed to A and B:

```
"evidence = [(0, 0), (0, 1), (10, 0), (10, 1)]"
"support(0)=2 support(10)=2"
"plurality=0 min=0"
```

Two forged pairs suffice: the 2-2 tie is broken by canonical value order
(`pluralityBetter`, `Model.lean:1284-1287`), which prefers the smaller value, so
the injected `0` wins. A three-pair variant (also run) gives support 3 vs 2.

**CONFIRMS the estate's own audit, exactly.**
`docs/research/2026-08-15-model-audit-findings.md:83-89` (MOVES-4, medium-high)
predicts this verbatim: "a forger injecting two attributed pairs manipulates
plurality exactly as min was manipulated." The prediction is precise - two pairs,
not three. It is now executed rather than reasoned, with numbers.

Two scoping facts, or the report overstates:

1. **`Violations.fence_manipulable` is correctly scoped.** Its docstring
   (`Violations.lean:335-337`) says plurality gives 10 because that value has two
   distinct holders while the injection has one - a statement about THAT attack.
   `VERIFICATION.md:746-748` lists it under "Controls and executable witnesses"
   with no resistance claim. No over-claim found. The only risk is a reader
   lifting "plurality resists" out of context.
2. **The attack is not reachable through the shipped daemon.** protod's contract
   exposes `protocol.session.fill`, `.close`, `.open`, `.state` - and NO dispute
   or decide operation (`proto/go/protod/contract.go:341-364`). Disputes are
   SYNTHESIZED by the daemon from prior evidence (`canonicalRepairCandidates`),
   never accepted from a caller. MOVES-4 is a model- and library-surface
   exposure, not a shipped wire defect.

**That scoping creates its own finding, which I did not find stated anywhere.**
`packages/moves` IS a shipped, published kernel (`package.json`, exports `./*`)
whose `Move` type includes a dispute variant with caller-supplied candidates
(`kernel.ts:31-36`) and whose `repair`/`runRepairK` are exported
(`kernel.ts:416-448`). Any consumer of `@foldlab/moves` holds the forgery
channel. The model's alphabet is fill/dispute/decide; the daemon's is fill/close.
**REFUTES the framing "the model is the daemon".** The model OVER-APPROXIMATES
the daemon, so REF-3's equation
`translate (wireStep s op) = modelStep (translate s) (translate op)` is a forward
simulation over a strictly smaller op alphabet - sound, but it will not license
any claim of the form "no unlawful move is reachable", because unreachability is
a property of the WIRE SURFACE, not of the model.

**Literature for the cure.** Kleppmann and Howard, "Byzantine Eventual
Consistency and the Fundamental Limits of Peer-to-Peer Databases",
arXiv:2012.00472 (2020-12), code `github.com/ept/byzantine-eventual`; and
Kleppmann, "Making CRDTs Byzantine Fault Tolerant" (PaPoC 2022). BEC's answer to
exactly this problem is that operations are signed and hash-chained so
attribution is DERIVED FROM CRYPTOGRAPHY, NOT ASSERTED, giving tolerance of
arbitrary numbers of Byzantine nodes for the class of applications where it
applies. That is the shape of cure the estate's named gap (no principal
authentication; seat bindings are bare strings) points at, with a proven
algorithm and prototype behind it.

### 2.5 The fence, located in the standard taxonomy

Burckhardt, Gotsman, Yang, Zawirski, "Replicated Data Types: Specification,
Verification, Optimality", **POPL 2014** (ORA uuid:8d98bd40-..., HAL
hal-00934311). Framework: specify a replicated type by relations over events -
**visibility** and **arbitration** - and verify implementations by
replication-aware simulations; applied to 7 implementations of 4 types (LWW
register, counter, MV register, OR-set).

**This gives the estate the vocabulary its fence has been missing.** The estate's
fence is an **arbitration order**, and the shipped rule is a DECLARED one:
`fenceChoice` iterates `hole.Fence.Order` and returns the first candidate whose
seat matches (`proto/go/protod/protocol_step.go:349-360`).

LWW derives arbitration from timestamps, which is why it needs clocks. The estate
declares arbitration IN THE PROTOCOL VALUE, at authoring time. THAT is the
precise, citable statement of "no vector clocks": **arbitration is a declared
constant of the protocol rather than a function of the execution.** A much
stronger and more defensible sentence than "bag union removes clocks", and the
one the estate should make.

**Gap, and a real one.** The estate's mechanized manipulation analysis covers
`minFenceRule` and `pluralityFenceRule` (`Violations.lean`). The SHIPPED rule is
neither - it is seat-priority, which is immune to candidate injection (a low seat
cannot outrank a high seat) but is a DICTATORSHIP in social-choice terms: the
first fence-order seat holding any candidate decides, unconditionally. No
mechanized analysis of the shipped rule's manipulation profile exists in
`verify/moves`. `fence_deterministic` covers it (any sound rule inherits
schedule-freedom), but schedule-freedom is not manipulation-resistance.
**Absence is the finding.**

`no_fair_resolute_fence` (`Model.lean:1948-1953`) is the Arrow-flavoured
impossibility here; `VERIFICATION.md:774-776` already reclassifies its IC4
framing as pending (MOVES-2), which is the right call.

---

## 3. Content-addressed storage and canonical bytes

### 3.1 Git - identity is framing, not canonicalization (ran-it)

```
$ printf 'hello' > blob.txt && git hash-object blob.txt
b6fc4c620b67d95f953a5c1c1230aaab5db5a1b0
$ printf 'blob 5\0hello' | sha1sum
b6fc4c620b67d95f953a5c1c1230aaab5db5a1b0
```

The hand-derivation matches: a Git blob id is SHA-1 over
"blob " + decimal length + NUL + content. Then the same JSON VALUE, three
spellings:

```
{"a":1,"b":2}      -> 73a5d70e33e32e09271e19a98a3326573331d88d
{"b":2,"a":1}      -> f17206a2237359e30a21ee8d0063e18e96a483dd
{ "a": 1, "b": 2 } -> 23bfbfddff6ca4be27eb709ee79f2b653e03e7e9
```

**What Git establishes:** type-and-length framing before hashing, preventing
cross-type collision and making the object self-delimiting. **What it does not:**
anything about value identity. Git delegates canonicalization to the producer.

**Estate seam.** `CONTEXT.md` "Structural digest: SHA-256 over RFC 8785 bytes of
the normalized `flb.type.v0` walk".

**CONFIRMS the framing choice and locates exactly what RFC 8785 buys.** Git is
the most-deployed CAS in existence and addresses FILES, for which "the bytes are
the value" is true. The estate addresses STRUCTURED VALUES, for which it is false
- the three byte strings above are one value. RFC 8785 is precisely the missing
half of Git's model for that case, and the estate's dossiers already price its
cost (45.8% of doubles underdetermined under the normative step; determinism
resting on a promoted non-normative note;
`2026-08-13-number-determinism-dossier.md:10-18, 56-67`).

**Absence, searched and recorded.** Searched for a mechanized treatment of Git's
object model / Merkle-DAG content addressing (terms: formal model Git object
model Merkle DAG mechanized proof Coq Isabelle version control semantics).
Nearest hit: Swierstra and Loeh, "The Semantics of Version Control",
**Onward! 2014** (10.1145/2661136.2661137), a Coq denotational model OF PATCH
THEORY AND REPOSITORIES, NOT OF CONTENT ADDRESSING. I found **no mechanized
proof about content-addressed identity, hash framing, or Merkle-DAG integrity**
in Git, IPFS, or Nix. The estate's digest-equality-as-proof-obligation discipline
has no mechanized prior art to inherit; it is being built, not adopted.

### 3.2 Nix / content-addressed build systems

The executable, citable prior art is **Mokhov, Mitchell, Peyton Jones, "Build
Systems a la Carte", ICFP 2018** (PACMPL 2(ICFP) art. 79, 10.1145/3236774), an
EXECUTABLE Haskell framework factoring build systems along two axes and
modelling early cutoff and cloud/content-addressed builds. A model, not a
mechanized proof.

Deliberately not expanded: `rq6-reproducible-artifacts` already covers build
determinism end to end (emscripten's stated boundary, WASI SDK absence, CosmWasm
as the production reproducible-wasm precedent, designate-a-platform-then-attest)
and grounds D-bc's two-tier regeneration gate. Adding Nix here would be padding.

### 3.3 IPLD / DAG-CBOR - a canonical-form divergence the dossiers do not cover

The IPLD DAG-CBOR spec (https://ipld.io/specs/codecs/dag-cbor/spec/, status
"Descriptive - Draft", retrieved 2026-08-16) requires:

- "The keys in every map must be sorted in (byte-wise) lexical order, INCLUDING
  THEIR MAJOR TYPE 3 AND LENGTH."
- "Integer encoding must be as short as possible."
- "Floating point values must always encoded in 64-bit, double-precision form";
  NaN, Infinity, -Infinity "must not be accepted"; -0.0 "should not appear or be
  accepted".
- And, tellingly: "DAG-CBOR decoders may relax strictness requirements by
  default" because of historical non-conforming data.

**Experiment (ran-it), `bun run sortdiverge.ts`:** does JCS key order agree with
DAG-CBOR key order?

```
agree    "a" vs "ab"        jcs=-1  dagcbor=-1
DIVERGE  "z" vs "ab"        jcs=1   dagcbor=-1
DIVERGE  "b" vs "aa"        jcs=1   dagcbor=-1
agree    "key" vs "id"      jcs=1   dagcbor=1
agree    U+00E9 vs "z"      jcs=1   dagcbor=1
agree    "a" vs U+00E9      jcs=-1  dagcbor=-1
DIVERGE  U+1F600 vs U+FFFD  jcs=-1  dagcbor=1

3/7 pairs order differently under JCS vs DAG-CBOR
```

Because DAG-CBOR's sort key INCLUDES THE LENGTH PREFIX, it is length-first: "z"
(2 bytes encoded) sorts before "ab" (3 bytes). RFC 8785 sorts by UTF-16 code
units of the key string, so "ab" precedes "z". **The divergence is on pure
ASCII**, not an exotic-Unicode edge.

**Estate seam.** "Identity order (RFC 8785 UTF-16 code-unit sort)" in
`CONTEXT.md`; enforced at `proto/go/protod/protocol.go:235-236` (`utf16Less`)
for both the `completion` and `close` declared-name lists.

**CONFIRMS the estate's insistence on naming its canonical form; REFUTES any
"canonical is canonical" intuition.** Two of the most-deployed canonical-bytes
systems disagree about the order of two ASCII keys. A digest is an identity only
RELATIVE TO A NAMED CANONICALIZATION, and the estate is right to name RFC 8785 in
the definition of structural digest rather than saying "canonical JSON". The
estate already knows the UTF-16-vs-UTF-8 hazard internally - see
`proto/go/protod/check_refusal_order_test.go:24-26`, which pins U+1D11E before
U+FFFD precisely because identity order differs from Go string order as well as
map iteration order - so this is the same hazard one system boundary out.

**Extends RQ-9 rather than repeating it.** RQ-9 covers RFC 8785's NUMBER problem
and cites EverCBOR's deterministic-encoding-without-floats status. It does not
mention DAG-CBOR, IPLD, or key ordering at all (grepped). Note also that
DAG-CBOR FORBIDS NaN/Inf and discourages -0.0 - independent corroboration, from
a different standards lineage, that post-sweep ruling 2 (the float leaf leaves
v0) is the direction the field converges on when it wants determinism.

---

## 4. Verified kernels, only where they bear on the REF ladder

RQ-2 already places seL4, CompCert, CakeML, CertiCoq, Fiat-Crypto, HACL* and
Lean's C backend in a four-camp taxonomy with primary quotes and, for CakeML, the
camp-B/camp-C split. Not restated.

The one thing that taxonomy does not address, and this lane does:

**seL4's refinement is state-machine refinement of a STATEFUL kernel; D-d
ratifies a STATELESS ABI.** seL4's chain relates an abstract spec, an executable
spec, and the C, as machine refinements over kernel STATE. The ratified ABI
`step(stateBytes, opBytes) -> (stateBytes', receiptBytes)` (D-d item 1, grill
record :74-79) makes the proved object a PURE FUNCTION, removing the
state-invariant burden entirely: there is no kernel invariant to preserve across
calls because there is no kernel state. The record's stated reason - "a stateful
handle would reintroduce state the theorems do not quantify over" - is correct,
and the comparison sharpens it: the estate is buying out of seL4's single largest
proof cost.

**The cost, which the record already carries and this lane corroborates:** the
host now owns all state, so every property seL4 would have proved ABOUT THE
KERNEL'S STATE MACHINE becomes a property of the host, which is hand-written Go
and TypeScript and is not in the proof. Combined with 1.1's gap (no network, no
delivery model) and 2.3's (coordination lives at close, in the daemon), the
honest summary is: **the estate's proof perimeter is the pure fold; every
distributed property lives outside it.** A defensible perimeter, but
`VERIFICATION.md` should be where a reader learns it, and it currently learns it
only by assembling `VERIFICATION.md:777-782` with SLICE.md.

---

## 5. Multiparty session types and choreography

**Machine-checked artifacts that exist.**

| Artifact | Assistant | What it proves | Runnable |
| --- | --- | --- | --- |
| **Zooid** (Castro-Perez, Ferreira, Gheri, Yoshida, PLDI 2021, 10.1145/3453483.3454041) | **Coq** | first mechanised metatheory of ASYNCHRONOUS MPST: semantics of global and local types, plus a verified endpoint process language inheriting **deadlock freedom, protocol compliance, liveness** from the global type | yes - artifact Zenodo 10.5281/zenodo.4681027 |
| **mpstk** (Scalas and Yoshida, from "Less is More: Multiparty Session Types Revisited", POPL 2019) | model checking (mCRL2), not a proof assistant | checks deadlock-freedom and liveness of a specified multiparty protocol | yes - github.com/alcestes/mpstk, and mpstk-crash-stop |
| **Scribble / nuScr** | none (toolchain) | well-formedness of a global protocol; **projection** to local types | yes |
| "Complete Multiparty Session Type Projection with Automata", CAV 2023 (10.1007/978-3-031-37709-9_17) | automata-theoretic | COMPLETE projection - decides projectability rather than using a sound-but-incomplete rule | yes |
| "Formally Verified Liveness with Multiparty Session Types in Rocq", arXiv:2605.23633 (2026) | **Rocq** | mechanised liveness for an association-relation MPST system | **lead** - artifact unconfirmed |

All retrieved 2026-08-16; none run here.

### The estate should explicitly REFUSE the MPST core, and reuse exactly one idea

**REFUSE: the sequencing apparatus.** MPST's entire value proposition is ORDERED
INTERACTION. A global type is a sequence/choice/recursion structure over message
exchanges between roles; well-formedness plus projection buys deadlock-freedom
and session fidelity. Deadlock is a property of BLOCKING ON AN EXPECTED MESSAGE.

The estate has no ordered interactions and nothing blocks. Holes are unordered;
fills are TOTAL (`repair_fill_total`, `Model.lean:864`, and D85 absorb), so no
participant ever waits for another's move; refusals are data with a `next`, not
blocking. `SLICE.md:71-80` states the thesis directly - semantic space, not time;
outcomes are functions of WHAT WAS SAID, never of WHEN IT ARRIVED.
**MPST's central theorem is about a failure mode the estate has constructed
itself out of.** Adopting MPST would mean reintroducing sequencing in order to
prove the absence of a hazard that sequencing creates. That refusal should be
written down, because "protocol" is a word that will keep drawing reviewers to
MPST.

**REUSE: projection.** The one thing MPST has that the estate lacks a mechanized
story for. MPST projects a global type G onto each role p to yield a local type -
a mechanically derived, per-participant statement of what you may and must do -
and the metatheory relates the projections back to the global type. The estate's
protocol value IS a global object (holes, seats, fence order, `completion`,
`close`), and its per-seat surface is `willAdmit` (a per-move predicate, L5
`Spec.lean:52-54`) plus the concierge's frontier entry with its `Legal` choice
list (`proto/go/protod/concierge.go:22-29`). Neither is a PROJECTION: there is no
derived per-seat object, and no theorem relating it to the protocol value.

The estate's own catalog names the shape without naming the technique - E3's "MCP
completions from the frontier fold", P6 "the UI is a projection of the frontier"
(`scratch/dispatch/21-the-use-catalog.md`). The MPST literature says what such a
projection owes: a soundness theorem (anything the projection permits, the global
object permits) and, per CAV 2023, ideally COMPLETENESS (the projection is
defined exactly when the global object is realizable).
`fence_deterministic`'s "any sound rule" pattern is precisely the shape the estate
already uses for fences and would use again here.

**Absence, recorded.** Searched for machine-checked artifacts relating session
types to UNORDERED or SET-BASED protocol completion (our shape). Found none. The
MPST family is uniformly about sequenced interaction. There is no prior art to
reuse for the estate's completion-set semantics (`completion` as a declared
hole-name set, D92); it is genuinely new ground, and the claim should be sized
carefully rather than assumed covered by the session-types literature.

---

## 6. Consolidated verdicts

**REFUTATIONS (most valuable output).**

| # | Refutes | Evidence |
| --- | --- | --- |
| R1 | "Permutation-invariant bag union removing vector clocks is our finding" - it is the **2011 CvRDT convergence theorem** | Shapiro et al. RR-7506; `Model.lean:200-256, 1025-1037` |
| R2 | "The estate is a pure op-based CRDT without the clocks" - pure op-based REQUIRES tagged causal (stable) broadcast for non-commuting ops | arXiv:1710.04469; DAIS 2014 |
| R3 | "Keeping every candidate is strictly better than a clock-pruned conflict set" - it makes **self-supersession inexpressible**, and a retracted fill votes | **ran-it** E1/E1b: plurality = 10 from A's retracted value |
| R4 | "The fence removes the need for coordination" - `fence_deterministic` quantifies over runs of THE SAME BAG; CALM says non-monotone close needs coordination | `Model.lean:1342-1345`; CACM 2020 / JACM 2013 |
| R5 | "The model is the daemon" - model alphabet fill/dispute/decide strictly contains wire alphabet fill/close; the published TS kernel exposes the wider one | `contract.go:341-364`; `kernel.ts:31-36, 416-448` |
| R6 | "Canonical bytes is canonical bytes" - JCS and DAG-CBOR **disagree on ASCII key order** | **ran-it**: 3/7 pairs diverge |
| R7 | "There is no Lean CRDT prior art" - true until 2026-03; **Sal** now exists | arXiv:2603.27202; github.com/fplaunchpad/sal |

**CONFIRMATIONS.**

| # | Confirms | Evidence |
| --- | --- | --- |
| C1 | Unconditional commutation of all wire moves is STRONGER than Gomes et al.'s concurrent-ops-commute + hb-consistency | `Convergence.thy`; `Model.lean:1789-1791, 1808-1810` |
| C2 | The kernel-hygiene axiom-footprint gate catches exactly the channel the newest Lean CRDT tool ships on by default (`MVarId.admit`) | Sal repo; `verify/moves/run.sh` |
| C3 | Declared close authority (D104) is the coordination point CALM proves unavoidable | `proto/DECISIONS.md:2562-2580` |
| C4 | Git's framing-not-canonicalization model locates precisely what RFC 8785 adds | **ran-it** `git hash-object` derivation |
| C5 | DAG-CBOR independently forbids NaN/Inf and discourages -0.0 - corroborates the float-leaf drop | IPLD spec |
| C6 | MOVES-4's two-forged-pair prediction is exact | **ran-it** E3: support 2 vs 2, tie-break yields 0 |
| C7 | The stateless ABI (D-d) buys out of seL4's largest proof cost | grill record :74-79; RQ-2 |

**Absences (each searched, each a complete answer).**
- No mechanized proof of Git / IPFS / Nix content-addressed identity found.
- No mechanized manipulation analysis of the SHIPPED seat-priority fence.
- No machine-checked prior art for unordered / completion-set protocol semantics.
- No delivery/network model anywhere in `verify/moves` - only order.

---

## 7. Sources

Retrieved 2026-08-16 unless noted. Repository citations are file:line against
`C:\Users\kokok\Dev\foldlab` at branch `agent/codex/kernel-hygiene-gates`.

**Mechanized CRDT proofs**
- Gomes, Kleppmann, Mulligan, Beresford. Verifying Strong Eventual Consistency in Distributed Systems. OOPSLA/PACMPL 2017. https://dl.acm.org/doi/10.1145/3133933 ; arXiv:1707.01747
- AFP entry: A framework for establishing Strong Eventual Consistency for Conflict-free Replicated Datatypes, submitted 2017-07-07, BSD. https://www.isa-afp.org/entries/CRDT.html
- Isabelle sources quoted verbatim: Convergence.thy, Network.thy, https://github.com/trvedata/crdt-isabelle
- Ramesh, Soundarapandian, Sivaramakrishnan. Sal: Multi-modal Verification of Replicated Data Types. arXiv:2603.27202, 2026-03-28. Repo https://github.com/fplaunchpad/sal (Lean v4.28.0)
- De Porre, Ferreira, Gonzalez Boix. VeriFx: Correct Replicated Data Types for the Masses. ECOOP 2023, 10.4230/LIPIcs.ECOOP.2023.9; artifact DARTS 9.2.19; https://github.com/verifx-prover/verifx
- Nieto. Conflict-free Replicated Data Types have Abstract Specifications (Coq/Iris). https://iris-project.org/pdfs/2023-phd-nieto.pdf
- Verifying Replicated Data Types with Typeclass Refinements. OOPSLA 2020 (Liquid Haskell). https://users.soe.ucsc.edu/~lkuper/papers/lh-typeclasses-oopsla20.pdf
- Type-Checking CRDT Convergence. PACMPL 2023, 10.1145/3591276

**CRDT taxonomy and coordination theory**
- Shapiro, Preguica, Baquero, Zawirski. A comprehensive study of Convergent and Commutative Replicated Data Types. INRIA RR-7506, 2011. https://inria.hal.science/inria-00555588/en/
- Shapiro et al. Conflict-free Replicated Data Types. SSS 2011, 10.1007/978-3-642-24550-3_29
- Baquero, Almeida, Shoker. Making Operation-Based CRDTs Operation-Based. DAIS 2014, 10.1007/978-3-662-43352-2_11
- Baquero, Almeida, Shoker. Pure Operation-Based Replicated Data Types. arXiv:1710.04469
- Burckhardt, Gotsman, Yang, Zawirski. Replicated Data Types: Specification, Verification, Optimality. POPL 2014. https://hal.science/hal-00934311
- Hellerstein, Alvaro. Keeping CALM: When Distributed Consistency is Easy. CACM 2020, arXiv:1901.01930. Original proof: Ameloot, Neven, Van den Bussche, JACM 2013
- Kleppmann, Howard. Byzantine Eventual Consistency and the Fundamental Limits of Peer-to-Peer Databases. arXiv:2012.00472 (2020-12); https://github.com/ept/byzantine-eventual
- Kleppmann. Making CRDTs Byzantine Fault Tolerant. PaPoC 2022

**Content addressing and canonical bytes**
- IPLD DAG-CBOR specification, status "Descriptive - Draft". https://ipld.io/specs/codecs/dag-cbor/spec/
- Mokhov, Mitchell, Peyton Jones. Build Systems a la Carte. ICFP 2018, PACMPL 2(ICFP) art. 79, 10.1145/3236774
- Swierstra, Loeh. The Semantics of Version Control. Onward! 2014, 10.1145/2661136.2661137
- Git object framing: derived on this machine, git 2.55.0.windows.2 (section 3.1)

**Session types and choreography**
- Castro-Perez, Ferreira, Gheri, Yoshida. Zooid: a DSL for Certified Multiparty Computation. PLDI 2021, 10.1145/3453483.3454041; artifact Zenodo 10.5281/zenodo.4681027
- Scalas, Yoshida. Less is More: Multiparty Session Types Revisited. POPL 2019; mpstk https://alcestes.github.io/mpstk/ , https://github.com/alcestes/mpstk , https://github.com/alcestes/mpstk-crash-stop
- Complete Multiparty Session Type Projection with Automata. CAV 2023, 10.1007/978-3-031-37709-9_17
- Formally Verified Liveness with Multiparty Session Types in Rocq. arXiv:2605.23633 (2026) - **lead**, artifact unconfirmed

**Estate sources cited by file:line**
`verify/moves/Moves/Model.lean` (:38-43, :145-174, :200-256, :380-382, :864,
:1025-1037, :1280-1287, :1331-1337, :1342-1345, :1460, :1546-1549, :1573-1583,
:1789-1791, :1808-1810, :1948-1953) ; `verify/moves/Moves/Spec.lean` (:34-54) ;
`verify/moves/Moves/Violations.lean` (:44-101, :335-357) ; `verify/moves/run.sh` ;
`verify/moves/lakefile.toml`, `lake-manifest.json`, `lean-toolchain` ;
`packages/moves/src/kernel.ts` (:31-36, :409-414, :416-448) ;
`packages/moves/README.md` (:43) ; `proto/go/protod/protocol_step.go`
(:113-119, :349-360) ; `proto/go/protod/contract.go` (:341-364) ;
`proto/go/protod/protocol.go` (:216-236) ;
`proto/go/protod/check_refusal_order_test.go` (:24-26) ;
`proto/go/protod/concierge.go` (:22-29) ; `proto/DECISIONS.md` (:2160-2175,
:2341-2352, :2559-2580) ; `VERIFICATION.md` (:44-45, :697-782) ; `SLICE.md`
(:25-31, :69-80) ; `docs/research/2026-08-15-model-audit-findings.md` (:83-89) ;
`docs/design/2026-08-16-ref0-extraction-grill-record.md` (:74-107)

**Experiment artifacts (this lane's scratch area)**
`Probe.lean`, `Probe2.lean`, `probe-transcript.txt`, `sortdiverge.ts`,
`blob.txt`, `j1.json`, `j2.json`, `j3.json`.
