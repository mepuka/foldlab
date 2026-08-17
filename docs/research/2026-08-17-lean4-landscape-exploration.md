# Lean 4 landscape exploration: Sal, Veil, and CSLib

Acquisition and hands-on audit, 2026-08-17. Sources were retrieved and
executed on 2026-08-17 unless a row says otherwise.

## Result first

The earlier blanket decline in the proof-support briefing is not sustained.
Its outcome happened to be conservative, but its premise—“zero dependency is
load-bearing”—was not an estate ruling and is excluded here. The re-derived
answer is selective: use Veil as an isolated safety-modeling substrate, build
on CSLib when unordered network/LTS semantics become a named lane, and learn
or transliterate Sal's corrected bridge structure until its legacy build
surface is reproducible. **[ran-it + primary-source]**

| Material | Re-derived disposition | What moves the verdict | Cost | Reversal | Briefing §5.6 |
| --- | --- | --- | --- | --- | --- |
| **Veil** | **DEPEND**, in a separately pinned verification package; require `veil.smt.trust=false` for claimed proofs | The patched default build passed 1,503 jobs; the FloodSet manual agreement theorem is kernel-checkable; Veil generates initialization and action-preservation VCs. Its default interactive SMT mode is nevertheless trusted and produces `sorryAx` | Lean 4.28.0, Mathlib, Loom, lean-smt/cvc5, 8.04 GiB installed here, a Windows cvc5 compiler compatibility patch, and a safety-only scope | Keep the package/toolchain boundary separate; remove that directory and its wall if it does not pay for a named transport/sub-session model | **Overturns** the blanket decline; confirms only that direct insertion into the extraction core would be the wrong seam. **[ran-it + inference]** |
| **CSLib** | **DEPEND when the transport/LTS lane opens**; meanwhile cite and learn from its exact theorems | It builds cleanly and already models unordered in-flight messages as `Multiset`, proves receive commutation/diamond properties, HML characterization, and the one-fault FLP impossibility theorem | Lean 4.34.0-rc1, Mathlib, 7.61 GiB installed here, 338.687 s build; a separate toolchain from the estate's 4.33.0 | Isolate the import in its own model package; remove the package if the future transport consumer chooses different semantics | **Overturns** the briefing's broad “no unordered protocol semantics” claim and its process-calculus-only characterization. **[ran-it + primary-source + inference]** |
| **Sal** | **LEARN now; TRANSLITERATE the bridge seam for a future replicated-data lane; do not depend on the four legacy instance files yet** | The corrected RA-linearizability bridges and conditioned OR-Set capstone compile without `sorryAx`, but the four files advertised as the residual Blaster set all fail to elaborate on this pinned Windows run | Lean 4.28.0, Mathlib, Blaster, Z3 4.15.2, 6.77 GiB installed here; the root default target is vacuous and per-module builds are required | Delete the isolated clone or transliterated experiment; no production seam is changed | **Overturns** the premise and the undifferentiated verdict; retains “no dependency now” for reproducibility and consumer-fit reasons. **[ran-it + primary-source + inference]** |
| **Mathlib `Multiset`** | **DEPEND directly** if evidence bags become a first-class data type; keep list-permutation statements while they remain only theorem premises | It is the actual provider used by CSLib for unordered messages, not a local-library feature to reimplement | At the Sal/Veil pin: about 0.09 GiB checked-out working files + 0.48 GiB Git metadata + 5.63 GiB compiled cache = 6.20 GiB total | Remove the dependency and return to `List.Perm`; the semantic change must be explicit because `Multiset` preserves multiplicity | Refines §5.6's useful note into a consumer-triggered dependency recommendation. **[ran-it + primary-source + inference]** |

No estate code, specification, or fixture was changed by this exploration.
The recommendations are proposals; the repository's ratification-before-
machinery rule still governs adoption. **[ran-it]**

## Confidence vocabulary and method

- **ran-it** — command output captured in the reference directory on this
  machine; highest confidence for build and axiom-footprint claims.
- **primary-source** — read at the pinned repository commit or in its pinned
  dependency source.
- **inference** — an estate recommendation derived from the observed theorem
  contract, build surface, and named consumer.
- **unresolved** — an attempted question that execution did not settle; the
  access ledger records the attempt.

Every substantive paragraph or table row carries one of those tiers. Clone
provenance, command lines, timestamps, output, wall-clock time, and exit status
are preserved in `docs/research/reference/lean4-landscape-2026-08-17/`.
**[ran-it]**

## Acquisition and measured build surface

| Repository | Canonical URL and pinned commit | Toolchain / solver | License | Build result | Installed size |
| --- | --- | --- | --- | --- | --- |
| Sal | `https://github.com/fplaunchpad/sal`, `4e71ff7069141b2b40a53d8dd2cd48a00f2c50be` | Lean 4.28.0; Blaster `985dab1`; signature-published Z3 4.15.2, SHA-256 `39C367...BDC0269` | MIT | `lake build`: exit 0, **0 jobs**, 2.846 s. Corrected central targets compiled; all four legacy residual targets failed. | 6.77 GiB **[ran-it]** |
| Veil | `https://github.com/verse-lab/veil`, `300c305e945750ab3fb62de4a79c23161b24da39` | Lean 4.28.0; lean-smt `5c14319`; cvc5 FFI `ef0efbf`, cvc5 1.3.2 | Apache-2.0 | Clean checkout failed in cvc5 FFI; compatibility build passed 1,503 jobs in 393.534 s | 8.04 GiB **[ran-it]** |
| CSLib | `https://github.com/leanprover/cslib`, `2e1824a4d8d896cbb1a0f03eab62e3e344a825c4` | Lean 4.34.0-rc1; Mathlib `77cbcbc` | Apache-2.0 | `lake build`: exit 0, 2,809 jobs, 338.687 s | 7.61 GiB **[ran-it]** |

The three cache preparations were accidentally started concurrently. Sal's
completed; Veil and CSLib downloaded their requested artifacts but raced on
the global `%USERPROFILE%/.cache/mathlib/curl.cfg` and exited 1. Serial retries
then exited 0 in 226.161 s and 273.936 s respectively. That is a cache-client
concurrency defect observed here, not a source-build failure. **[ran-it]**

### How big is Mathlib here?

At the shared Sal/Veil Mathlib commit `8f9d9cff`, one local checkout measures:
0.09 GiB working files, 0.48 GiB Git metadata, and 5.63 GiB compiled `.lake`
artifacts—**6.20 GiB total**. The GitHub repository-size field observed during
acquisition was about 475,397 KiB (0.453 GiB), which aligns with the local Git
metadata order of magnitude but does not include compiled artifacts. “Mathlib
is about half a gigabyte” describes source history; “Mathlib costs about six
gigabytes here” describes a ready-to-build checkout. **[ran-it]**

## Sal

### Exact contract and compiled capstones

Sal's ordinary CRDT contract says that every active replica state is the
result of some permutation of its event set that respects the configuration's
logical order. Verbatim from
[`RA_Linearizability.lean`](https://github.com/fplaunchpad/sal/blob/4e71ff7069141b2b40a53d8dd2cd48a00f2c50be/Sal/CRDTs/Metatheory/RA_Linearizability.lean#L113-L117):
**[primary-source]**

```lean
def IsRALinearizable (C : Configuration D) : Prop :=
  ∀ (r : Replica) (s : D.State) (E : Set (Op D.AppOp)),
    C.N r = some s → C.L r = some E →
    ∃ π : List (Op D.AppOp),
      listPermOf π E ∧ respects π (lo C) ∧ applySeq D D.init π = s
```

The corrected core-plus-join bridge is, verbatim from
[`RA_Lin_Of_Join.lean`](https://github.com/fplaunchpad/sal/blob/4e71ff7069141b2b40a53d8dd2cd48a00f2c50be/Sal/CRDTs/Metatheory/RA_Lin_Of_Join.lean#L225-L229):
**[primary-source]**

```lean
theorem ra_linearizable_of_core_join
    (hVC : CoreVCs D) (hPeel : JoinPeelVCs D)
    (C : Configuration D)
    (hReach : (labeledTS D).ReachableFrom (initConfig D) C) :
    IsRALinearizable C := by
```

The lattice/causal-delta form is, verbatim from
[`JoinLemma_Of_CD.lean`](https://github.com/fplaunchpad/sal/blob/4e71ff7069141b2b40a53d8dd2cd48a00f2c50be/Sal/CRDTs/Metatheory/JoinLemma_Of_CD.lean#L663-L667):
**[primary-source]**

```lean
theorem ra_linearizable_of_core_lattice_cd
    (hVC : CoreVCs D) (hLat : LatticeVCsPlus D) (hCD : CDVC D)
    (C : Configuration D)
    (hReach : (labeledTS D).ReachableFrom (initConfig D) C) :
    IsRALinearizable C := by
```

The conditioned/MRDT bridge changes the contract to per-version states. Its
bridge and production OR-Set instance are, verbatim from
[`Adequacy.lean`](https://github.com/fplaunchpad/sal/blob/4e71ff7069141b2b40a53d8dd2cd48a00f2c50be/Sal/ConditionedMRDTs/Metatheory/Adequacy.lean#L793-L797)
and
[`ORSet.lean`](https://github.com/fplaunchpad/sal/blob/4e71ff7069141b2b40a53d8dd2cd48a00f2c50be/Sal/ConditionedMRDTs/MRDT_Instances/ORSet/ORSet.lean#L898-L903):
**[primary-source]**

```lean
theorem ra_linearizable3_of_join (hJoin : JoinLemma3 D)
    {hInit : D.Inv D.init}
    (C : Configuration D)
    (hReach : (labeledTS3 D).ReachableFrom (initConfig D hInit) C) :
    IsRALinearizable3 C := by

theorem ORSet_ra_linearizable3
    (C : Configuration ORSet)
    (hReach : (labeledTS3 ORSet).ReachableFrom
      (initConfig ORSet trivial) C) :
    IsRALinearizable3 C :=
  ra_linearizable3_of_join ORSet_joinLemma3 C hReach
```

Runtime axiom audit:

| Declaration | `#print axioms` |
| --- | --- |
| `Sal.Emulation.ra_linearizable_of_core_join` | `[propext, Classical.choice, Quot.sound]` **[ran-it]** |
| `Sal.Emulation.ra_linearizable_of_core_lattice_cd` | `[propext, Classical.choice, Quot.sound]` **[ran-it]** |
| `Sal.ConditionedMRDTs.ra_linearizable3_of_join` | `[propext, Quot.sound]` **[ran-it]** |
| `Sal.ConditionedMRDTs.ORSet_ra_linearizable3` | `[propext, Classical.choice, Quot.sound]` **[ran-it]** |
| `Sal.ConditionedMRDTs.ORSet_ra_linearizable3_eq` | `[propext, Classical.choice, Quot.sound]` **[ran-it]** |

No audited capstone above contains `sorryAx`, `native_decide`, or a custom
axiom. The output is preserved in `sal-central-axioms.txt`. **[ran-it]**

### Where Sal admits goals

Sal's tactic explicitly guards stages 1 and 3 against `sorryAx`, but does not
guard stage 2. Verbatim from `Sal/Tactic/Sal.lean`: **[primary-source]**

```lean
-- Strategy 1: dsimp + grind (no sorry allowed).
try
  runBudgeted (← `(tactic| dsimp <;> grind))
  failIfSorry initialGoals "1 (dsimp + grind)"
  return ()
catch _ =>
  -- Strategy 2: blaster with SMT timeout.
  -- No failIfSorry here: Blaster uses sorryAx by design to accept
  -- Z3's "valid" verdict.
  try
    let n := Syntax.mkNumLit (toString smtTimeoutSec)
    runBudgeted (← `(tactic| blaster (timeout: $n)))
    return ()
  catch _ =>
    runBudgeted (← `(tactic| dsimp <;> aesop <;> all_goals (try grind)))
    failIfSorry initialGoals "3 (dsimp + aesop)"
```

Pinned Blaster `985dab1` turns a Z3 `Valid` result into an admitted goal,
verbatim from `Blaster/Command/Tactic.lean`: **[primary-source]**

```lean
match result with
| .Valid => goal.admit -- TODO: replace with proof reconstruction
| .Falsified cex => throwTacticEx `blaster goal "Goal was falsified (see counterexample above)"
| .Undetermined =>
```

Therefore a theorem whose successful `sal` path is stage 2 contains
`sorryAx` and expands its trusted base to Z3; a theorem closed at stage 1 or 3
does not. That is a per-theorem property, not a verdict on the whole library.
**[primary-source]**

### The four advertised legacy residual files do not elaborate here

The README names four residual stage-2 files. Each was invoked as an explicit
Lake module target after installing the repository's tested Z3 4.15.2:

| Module | Result on pinned Windows run |
| --- | --- |
| `OR_Set_MRDT` | Exit 1 after 200.675 s: native `stack_space_exception` during expression equality **[ran-it]** |
| `OR_Set_Efficient_MRDT` | Exit 1 after 62.817 s: unsolved `aesop` goals and 200,000-heartbeat timeouts **[ran-it]** |
| `Add_Win_Priority_Queue_MRDT` | Exit 1 after 255.818 s: unsolved goals and maximum recursion depth **[ran-it]** |
| `Multi_Valued_Register_MRDT` | Exit 1 after 12.991 s: unsolved `aesop` goals **[ran-it]** |

Because none produced an `.olean`, runtime `#print axioms` for their theorem
names is unavailable. The source shows that all 24 schema theorems in each
file invoke `sal`, but source text alone cannot say which individual theorem
would take stage 2 on a successful platform. The honest result is therefore:
the admission mechanism is settled exactly; the per-theorem legacy residue is
unresolved because the pinned files fail before an axiom audit can run.
**[ran-it + unresolved]**

### What Sal offers the estate

Sal's event-set/permutation witness and its separation between a generic
reachability invariant, a Join Lemma, and a datatype instance are useful
structures for a future replicated-data or multi-venue-mirroring proof. They
do not directly discharge REF-1: Sal reasons about replicated configurations
and event visibility, while the live wire model is a single-homed, total step
function over an explicitly bounded state. **[primary-source + inference]**

Recommendation: learn the bridge decomposition now; transliterate only the
abstract seam if a replicated consumer is ratified; reconsider a direct Sal
dependency after its relevant instance target compiles in the estate gate.
Cost and reversal are in the result table. **[inference]**

## Veil

### The Windows substrate issue and its resolution

The clean checkout's `lake build` failed after 454.035 s at pinned cvc5's FFI
command: Windows selected `C:\msys64\ucrt64\bin\cc.exe` (GCC), while the
dependency hardcoded Clang-only `-stdlib=libc++`. The exact error was
`cc: error: unrecognized command-line option '-stdlib=libc++'`.
**[ran-it]**

The pinned cvc5 README requires Clang and libc++ version 19 on Windows. The
working compatibility recipe was:

1. apply `veil-cvc5-windows.patch` to pinned cvc5 `ef0efbf` (`cc` → `clang`);
2. use the Lean 4.28 toolchain's Clang 19.1.2;
3. unpack the signature-verified official MSYS2
   `mingw-w64-ucrt-x86_64-libc++-19.1.4-1` package workspace-locally
   (SHA-256 `A1E582F8...638BCBA`);
4. set `CPLUS_INCLUDE_PATH` to its `include/c++/v1` plus the installed MSYS2
   compiler builtin headers, and `LIBRARY_PATH` to its library directory plus
   Lean's.

That build completed 1,503 jobs, exit 0, in 393.534 s. The default target also
builds `VeilTest`, whose Lake target globally sets
`weak.veil.smt.trust=false`. **[ran-it + primary-source]**

This is a local compatibility patch to an ignored pinned dependency, not a
claim that upstream Veil builds unmodified on this Windows environment. The
patch and full failed/successful attempts are preserved beside the report.
**[ran-it]**

### How a model and checker are declared

FloodSet starts with a Veil module, uninterpreted sorts, immutable theory,
state fields, initializer, and actions. A representative verbatim slice is:
**[primary-source]**

```lean
veil module FloodSet

type node
type value
instantiate val_ord : TotalOrder value

immutable individual f : Nat

individual round : Nat
function initialValue : node → value
relation W (n : node) (v : value) : Bool
relation decision (n : node) (v : value) : Bool
function crashed (n : node) : Bool
function crashedInRound (n : node) : Nat
individual numCrashed : Nat

action crash (n : node) {
  require numCrashed < f
  require alive n
  crashed n := true
  crashedInRound n := round
  numCrashed := numCrashed + 1
}
```

`#check_invariants` filters the generated VC manager to induction VCs. The
semantic target used for an action is, verbatim: **[primary-source]**

```lean
def VeilM.preservesInvariantsIfSuccessfulAssuming
    (act : VeilM m ρ σ α) (assu : ρ → Prop) (inv : SProp ρ σ) : Prop :=
  VeilM.meetsSpecificationIfSuccessfulAssuming act assu inv inv
```

In the FloodSet audit it reported initializer establishment plus 16 clauses
for each of `nodeDecide`, `crash`, and `advanceRound`, including successful
termination (`doesNotThrow`). The finite model checker separately explored
26,496 states without a violation. Veil's own tutorial explicitly says it
does not yet handle termination as a liveness property, so these are safety
and successful-action obligations, not temporal liveness. **[ran-it + primary-source]**

The source's four-action symbolic `unsat trace` demo timed out at the default
60 seconds. For the axiom audit only, that bounded-search command was removed;
the finite model check, invariant check, and manual theorem were retained.
That derived target built in 467.725 s, and the original source was restored.
**[ran-it]**

### Trusted SMT versus reconstructed proofs

Veil defaults to trusted solver results, verbatim from `Veil/Base.lean`:
**[primary-source]**

```lean
register_option veil.smt.trust : Bool := {
  defValue := true
  descr := "If true, `veil_smt` trusts unsat results from the SMT solver. \
  If false, `veil_smt` asks the SMT backend to reconstruct Lean proofs."
}
```

Pinned lean-smt requests proofs only when trust is false; its UNSAT branch is,
verbatim: **[primary-source]**

```lean
let options := defaultSolverOptions ++
  (if cfg.trust then [] else [("produce-proofs", "true")]) ++
  cfg.extraSolverOptions

| .ok (.unsat pf uc) =>
  if cfg.trust then
    mv.admit (synthetic := false)
    return .unsat [] hs
  let some pf := pf | throwError "failed to reconstruct proof for unsat result"
  let (_, ps, p, hp, mvs) ← reconstructProof pf ctx
  ...
  mv.assign (.mvar mv₀)
```

The executable probe confirms the source reading:

| Probe | `#print axioms` |
| --- | --- |
| `set_option veil.smt.trust true` + `veil_smt` | `[sorryAx]` **[ran-it]** |
| `set_option veil.smt.trust false` + `veil_smt` | `[propext, Classical.choice, Quot.sound]` **[ran-it]** |

Proof reconstruction is not uniformly sorry-free across all theories: pinned
lean-smt's `Smt/Reconstruct/BitVec/Bitblast.lean` defines
`eq_eq_beq ... := sorry`. Neither audited theorem below depends on it, but a
bit-vector consumer must audit its own capstone. **[primary-source + ran-it]**

### Manual FloodSet capstone

The representative interactive theorem is quoted verbatim from
[`Examples/Tutorial/FloodSet.lean`](https://github.com/verse-lab/veil/blob/300c305e945750ab3fb62de4a79c23161b24da39/Examples/Tutorial/FloodSet.lean#L416-L439):
**[primary-source]**

```lean
theorem nodeDecide_agreement (ρ : Type) (σ : Type) (node : Type) [node_dec_eq : DecidableEq.{1} node]
    [node_inhabited : Inhabited.{1} node] (value : Type) [value_dec_eq : DecidableEq.{1} value]
    [value_inhabited : Inhabited.{1} value] [val_ord : TotalOrder value] (χ : State.Label → Type)
    [χ_rep :
      ∀ __veil_f,
        Veil.FieldRepresentation (State.Label.toDomain node value __veil_f) (State.Label.toCodomain node value __veil_f)
          (χ __veil_f)]
    [χ_rep_lawful :
      ∀ __veil_f,
        Veil.LawfulFieldRepresentation (State.Label.toDomain node value __veil_f)
          (State.Label.toCodomain node value __veil_f) (χ __veil_f) (χ_rep __veil_f)]
    [σ_sub : IsSubStateOf (@State χ) σ] [ρ_sub : IsSubReaderOf (@Theory node value) ρ]
    [nodeDecide_dec_0 : delta% @FloodSet.nodeDecide._veil_dec_type_0 node χ value χ_rep]
    [nodeDecide_dec_1 : delta% @FloodSet.nodeDecide._veil_dec_type_1 node χ value χ_rep val_ord] :
    ∀ (n : node),
      Veil.VeilM.meetsSpecificationIfSuccessfulAssuming
        (@nodeDecide.ext ρ σ node node_dec_eq node_inhabited value value_dec_eq value_inhabited val_ord χ χ_rep
          χ_rep_lawful σ_sub ρ_sub nodeDecide_dec_0 nodeDecide_dec_1 n)
        (@Assumptions ρ node node_dec_eq node_inhabited value value_dec_eq value_inhabited val_ord ρ_sub)
        (@Invariants ρ σ node node_dec_eq node_inhabited value value_dec_eq value_inhabited val_ord χ χ_rep χ_rep_lawful
          σ_sub ρ_sub)
        (@agreement ρ σ node node_dec_eq node_inhabited value value_dec_eq value_inhabited val_ord χ χ_rep χ_rep_lawful
          σ_sub ρ_sub) :=
```

`#print axioms FloodSet.nodeDecide_agreement` returned
`[propext, Classical.choice, Quot.sound]`; it does not depend on `sorryAx`.
The surrounding generated `#check_invariants`, however, warned that it trusted
the SMT solver for 58 other goals under the default option. **[ran-it]**

### What Veil offers the estate

Veil fits a future client↔daemon transport safety model, refused-transition
model, and sub-session closure safety exploration: it has first-class actions,
nondeterminism, explicit finite model checking, generated inductiveness VCs,
counterexamples, and an escape hatch to manual Lean proofs. It does not by
itself discharge liveness/fair-retry claims, and its default trust option is
not acceptable for a theorem advertised as kernel-checked. **[primary-source + inference]**

Recommendation: adopt it behind an isolated, pinned package and make
`veil.smt.trust=false` plus capstone `#print axioms` part of that package's
gate. Keep model checking as falsification evidence, not as a proof substitute.
The Windows patch should be upstreamed or pinned as a package patch before the
dependency becomes a durable estate gate. **[inference]**

## CSLib

### LTS and HML

CSLib's core LTS is the expected relation-valued structure, verbatim from
`Cslib/Foundations/Semantics/LTS/Basic.lean`: **[primary-source]**

```lean
@[ext]
structure LTS (State : Type u) (Label : Type v) where
  /-- The transition relation. -/
  Tr : State → Label → State → Prop
```

Its image-finite Hennessy–Milner characterization is, verbatim from
[`HML/Basic.lean`](https://github.com/leanprover/cslib/blob/2e1824a4d8d896cbb1a0f03eab62e3e344a825c4/Cslib/Logics/HML/Basic.lean#L366-L368):
**[primary-source]**

```lean
theorem theoryEq_eq_bisimilarity {lts : LTS State Label}
    [image_finite : ∀ s μ, Finite (lts.image s μ)] :
    TheoryEq lts = HomBisimilarity lts := by
```

`#print axioms Cslib.Logic.HML.theoryEq_eq_bisimilarity` returned
`[propext, Classical.choice, Quot.sound]`. **[ran-it]**

### Unordered protocol semantics and FLP

The prior briefing's absence claim is false in a material way. CSLib's FLP
model uses a multiplicity-preserving unordered bag of in-flight messages and
bag-valued sends, verbatim from
[`FLP/Algorithm.lean`](https://github.com/leanprover/cslib/blob/2e1824a4d8d896cbb1a0f03eab62e3e344a825c4/Cslib/Computability/Distributed/FLP/Algorithm.lean#L58-L78):
**[primary-source]**

```lean
structure State (P M S : Type*) where
  msgs : Multiset (Message P M)
  proc : P → ProcState S

structure Algorithm (P M S : Type*) where
  init : P → S
  next : Message P M → ProcState S → S
  send : Message P M → ProcState S → Multiset (Message P M)
  out : Message P M → ProcState S → Option Bool
```

This is unordered, but it is not the estate's idempotent `Set`/event-fold
semantics: duplicate messages retain multiplicity and `recvMsg` erases one
occurrence. That distinction is load-bearing for retries and deduplication.
**[primary-source + inference]**

The commutation and diamond statements are, verbatim: **[primary-source]**

```lean
theorem recvMsg_comm {m1 m2 : Message P M} {s : State P M S}
    (hd : m1.dest ≠ m2.dest) (h1 : m1 ∈ s.msgs) (h2 : m2 ∈ s.msgs) :
    m2 ∈ (a.recvMsg m1 s).msgs ∧ m1 ∈ (a.recvMsg m2 s).msgs ∧
    a.recvMsg m2 (a.recvMsg m1 s) = a.recvMsg m1 (a.recvMsg m2 s) := by

theorem tr_diamond {ps : Set P} {x1 x2 : Action P M} {s s1 s2 : State P M S}
    (hx1 : DestIn ps x1) (hs1 : a.lts.Tr s x1 s1)
    (hx2 : DestIn psᶜ x2) (hs2 : a.lts.Tr s x2 s2) :
    ∃ s', a.lts.Tr s1 x2 s' ∧ a.lts.Tr s2 x1 s' := by
```

The capstone impossibility statements are, verbatim from
[`FLP/Impossibility.lean`](https://github.com/leanprover/cslib/blob/2e1824a4d8d896cbb1a0f03eab62e3e344a825c4/Cslib/Computability/Distributed/FLP/Impossibility.lean#L154-L167):
**[primary-source]**

```lean
theorem Consensus.one_not_exists [Fintype P] (hc : card P ≥ 2) :
    ¬ ∃ a : Algorithm P M S, a.Consensus 1 := by

theorem Consensus.ge_one_not_exists [Fintype P] {f : ℕ} (hc : card P ≥ 2) (hf : f ≥ 1) :
    ¬ ∃ a : Algorithm P M S, a.Consensus f := by
```

Runtime axiom audit:

| Declaration | `#print axioms` |
| --- | --- |
| `Cslib.FLP.Algorithm.recvMsg_comm` | `[propext, Classical.choice, Quot.sound]` **[ran-it]** |
| `Cslib.FLP.Algorithm.tr_diamond` | `[propext, Classical.choice, Quot.sound]` **[ran-it]** |
| `Cslib.FLP.Consensus.one_not_exists` | `[propext, Classical.choice, Quot.sound]` **[ran-it]** |
| `Cslib.FLP.Consensus.ge_one_not_exists` | `[propext, Classical.choice, Quot.sound]` **[ran-it]** |

No audited CSLib capstone contains `sorryAx`, `native_decide`, or a custom
axiom. **[ran-it]**

### What CSLib offers the estate

CSLib does not replace the pure REF-1 step function. It is a strong substrate
for the separately named transport/LTS question: its bag semantics makes
duplicate deliveries explicit, its commutation theorem identifies an
independence condition, and its diamond theorem shows the shape of a local
confluence result. HML becomes relevant if observational equivalence between
two protocol machines becomes a claim. FLP prevents an asynchronous
fault-tolerant consensus assumption from entering a future model unnoticed.
**[primary-source + inference]**

Recommendation: depend on the verified modules rather than recopying them
when that lane is ratified. First state an abstraction map between `Multiset`
delivery and the estate's idempotent journal/event identity; bag semantics is
not silently interchangeable with set semantics. **[inference]**

## Named estate obligations

| Obligation | Best use of acquired material | Why |
| --- | --- | --- |
| REF-1 wire model | **Learn** from Veil's action/VC decomposition; keep REF-1 a total function | Veil's relational/nondeterministic layer is valuable for environment behavior, not for replacing the already-ruled pure seam. **[inference]** |
| REF-2a canonical value law | No direct Sal/Veil/CSLib import | None of the audited theorems concerns RFC 8785 or canonical bytes; Mathlib remains useful only for general proof infrastructure. **[primary-source + inference]** |
| Client↔daemon transport / refusals | **Depend on Veil** for safety exploration and generated invariant VCs; **depend on CSLib** if unordered bag delivery is the chosen semantics | This is where nondeterminism, enabled/refused actions, duplicate messages, and confluence are actual domain objects. **[inference]** |
| Sub-session closure | **Depend on Veil for safety**, not liveness; use explicit manual theorems for hard VCs | Veil handles invariant preservation and model checking but says termination liveness is unsupported. **[primary-source + inference]** |
| Fence manipulation profile | No direct dependency; learn the invariant/interactive-proof workflow | The acquired libraries do not state the estate's seat-priority rule or its dictatorship property. **[primary-source + inference]** |
| Future replicated/multi-venue model | **Learn/transliterate Sal now; reconsider dependency after a reproducible instance gate** | Sal's event-set RA-linearizability bridge is the closest semantic match, but its legacy instance surface failed here. **[ran-it + inference]** |

## Access and failure ledger

1. **Sal full default build** — `lake build` succeeded with zero jobs because
   the library has no umbrella `Sal.lean`; `lake build Sal` failed looking for
   that file. Explicit module targets were therefore used. Reliance: all Sal
   build claims name their target. **[ran-it]**
2. **Sal legacy per-theorem axioms** — attempted by building each of the four
   README-named modules and preparing `#print axioms` queries. Every module
   failed before producing an importable object, so no per-theorem legacy
   axiom list is claimed. **[ran-it + unresolved]**
3. **Veil clean Windows build** — failed at pinned cvc5's hardcoded compiler;
   recovered with the exact local patch and environment above. Reliance: the
   report distinguishes unmodified failure from compatibility-build success.
   **[ran-it]**
4. **Veil FloodSet unmodified target** — after the substrate fix, the bounded
   four-action symbolic query timed out. The theorem audit used a recorded
   temporary removal of only that query and restored the source afterward.
   Reliance: no claim says the complete unmodified example target passes.
   **[ran-it]**
5. **Veil direct `lake env lean` probe** — failed to load the cvc5 native FFI.
   `lake lean`, the documented workspace-aware entry, built imports and loaded
   native dependencies; that successful output is the one used. **[ran-it]**
6. **Veil reconstructed bit-vectors** — source inspection found a `sorry` in
   `eq_eq_beq`; no bit-vector capstone was executed. Reliance: the report makes
   only a bounded warning, not a claim that all reconstructed proofs inherit
   it. **[primary-source + unresolved]**
7. **Concurrent Mathlib cache preparation** — two clients raced on a global
   configuration file; serial retries passed. Reliance: none on the failed
   cache runs beyond documenting reproducibility. **[ran-it]**
8. **Paper bodies** — theorem contracts and trust claims in this report rest on
   pinned executable source, not paper paraphrase. Paper metadata was verified
   against the repositories/arXiv records but is not load-bearing. **[primary-source]**

## Reproduction artifacts

- `sal-build.txt`, `veil-build.txt`, `cslib-build.txt` — acquisition, cache,
  toolchain, command, timing, exit status, and exact diagnostics.
- `sal-central-axioms.txt`, `veil-trust-axioms.txt`,
  `veil-central-axioms.txt`, `cslib-axioms.txt` — runtime axiom output.
- `queries/` — the exact audit inputs, including inaccessible legacy queries.
- `veil-cvc5-windows.patch` — the one-line pinned-dependency compatibility
  patch used by the successful Windows build.

All artifacts above are **ran-it** evidence from 2026-08-17.

## Primary sources

- Sal repository at commit
  [`4e71ff7`](https://github.com/fplaunchpad/sal/tree/4e71ff7069141b2b40a53d8dd2cd48a00f2c50be)
  and [arXiv:2603.27202](https://arxiv.org/abs/2603.27202).
- Veil repository at commit
  [`300c305`](https://github.com/verse-lab/veil/tree/300c305e945750ab3fb62de4a79c23161b24da39),
  pinned lean-smt
  [`5c14319`](https://github.com/verse-lab/lean-smt/tree/5c14319297bfa8c56dfda2772d18d9710ef2322a),
  and pinned lean-cvc5
  [`ef0efbf`](https://github.com/abdoo8080/lean-cvc5/tree/ef0efbf437ae79124c65557c13aa5bfcee948f80).
- CSLib repository at commit
  [`2e1824a`](https://github.com/leanprover/cslib/tree/2e1824a4d8d896cbb1a0f03eab62e3e344a825c4)
  and arXiv records
  [2602.04846](https://arxiv.org/abs/2602.04846),
  [2602.15078](https://arxiv.org/abs/2602.15078), and
  [2602.15409](https://arxiv.org/abs/2602.15409).
- MSYS2 official UCRT64 package repository, libc++ 19.1.4 package retrieved
  2026-08-17 and verified with the installed MSYS2 developer keyring.

