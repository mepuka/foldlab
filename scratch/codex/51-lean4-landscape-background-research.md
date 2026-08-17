# Lean 4 landscape background research: Sal, Veil, and CSLib

Retrieved **2026-08-17**. This is source research for
`scratch/codex/51-lean4-landscape-acquisition.md`; it is not the hands-on
exploration report and does not claim a successful build or an axiom audit.

## Result first

| Library | Source-level finding | Confidence |
| --- | --- | --- |
| Sal | The current repository is materially newer than the PaPoC/arXiv artifact. Its corrected binary-merge metatheory proves reachable-configuration RA-linearizability from stronger join or causal-delta contracts. The `sal` tactic's second stage still accepts Z3 `Valid` by `MVarId.admit`; current repository documentation narrows the remaining uses to four legacy MRDT files, but source inspection alone cannot identify the exact declarations whose staged tactic selected stage 2. | High for code paths and theorem statements; medium for the file-level residue because that part is the repository's own report pending `#print axioms`. |
| Veil | `#check_invariants` generates exception-freedom and per-action/per-clause inductive-preservation VCs. At current HEAD, `veil.smt.trust` defaults to `true`, which reaches lean-smt's non-synthetic `MVarId.admit` path on `unsat`. Setting it to `false` requests solver proofs and reconstructs a Lean proof term; the test library globally uses this untrusted/reconstructed mode. | High; settled from Veil and its pinned lean-smt source. |
| CSLib | The current tree contains reusable LTS/bisimulation/HML infrastructure and more distributed semantics than the earlier briefing recorded. In particular, its FLP development models in-flight messages as an unordered `Multiset`, proves independent receives commute and a diamond property, and proves the one-fault consensus impossibility result. This is unordered bag semantics, not an idempotent `Set` of events or a ready-made fold/refinement theorem. | High for present modules and theorem statements; high for the bounded source-tree absence statement below. |

## Provenance and acquisition facts

`git ls-remote --symref <url> HEAD` was run against each canonical HTTPS URL,
then a read-only research copy was inspected outside this repository. No copy
was made under `repos/sal`, `repos/veil`, or `repos/cslib` by this research run.
The commit is a **HEAD candidate as retrieved**, not an upstream release pin.

| Library | Canonical upstream | Retrieved `main` HEAD | Commit time / subject | Toolchain at that commit | License |
| --- | --- | --- | --- | --- | --- |
| Sal | [`fplaunchpad/sal`](https://github.com/fplaunchpad/sal) (`kayceesrk/sal` redirects there) | [`4e71ff7069141b2b40a53d8dd2cd48a00f2c50be`](https://github.com/fplaunchpad/sal/commit/4e71ff7069141b2b40a53d8dd2cd48a00f2c50be) | 2026-08-15 18:24 +05:30, “Refine Fugue policy merge observation law” | [`v4.28.0`](https://github.com/fplaunchpad/sal/blob/4e71ff7069141b2b40a53d8dd2cd48a00f2c50be/lean-toolchain) | [MIT](https://github.com/fplaunchpad/sal/blob/4e71ff7069141b2b40a53d8dd2cd48a00f2c50be/LICENSE) |
| Veil | [`verse-lab/veil`](https://github.com/verse-lab/veil) | [`300c305e945750ab3fb62de4a79c23161b24da39`](https://github.com/verse-lab/veil/commit/300c305e945750ab3fb62de4a79c23161b24da39) | 2026-08-13 15:32 +08:00, “chore: documentation and tutorial (#179)” | [`v4.28.0`](https://github.com/verse-lab/veil/blob/300c305e945750ab3fb62de4a79c23161b24da39/lean-toolchain) | [Apache-2.0](https://github.com/verse-lab/veil/blob/300c305e945750ab3fb62de4a79c23161b24da39/LICENSE) |
| CSLib | [`leanprover/cslib`](https://github.com/leanprover/cslib) | [`2e1824a4d8d896cbb1a0f03eab62e3e344a825c4`](https://github.com/leanprover/cslib/commit/2e1824a4d8d896cbb1a0f03eab62e3e344a825c4) | 2026-08-15 07:11 UTC, “Regular languages are closed under reversal (#775)” | [`v4.34.0-rc1`](https://github.com/leanprover/cslib/blob/2e1824a4d8d896cbb1a0f03eab62e3e344a825c4/lean-toolchain) | [Apache-2.0](https://github.com/leanprover/cslib/blob/2e1824a4d8d896cbb1a0f03eab62e3e344a825c4/LICENSE) |

Before any possible execution, I read Sal's `lakefile.toml`,
`lake-manifest.json`, `lean-toolchain`, and `run_files.sh`; Veil's
`lakefile.lean`, `lake-manifest.json`, and `lean-toolchain`; and CSLib's
`lakefile.toml`, `lake-manifest.json`, and `lean-toolchain`. I did **not** run a
library build, install a toolchain, or invoke a solver. This deliberately leaves
build transcripts and `#print axioms` to the acquiring run required by the
binding brief.

## Sal

### Paper artifact versus current repository

The primary paper is Ramesh, Soundarapandian, and Sivaramakrishnan, *Sal:
Multi-modal Verification of Replicated Data Types*, submitted 2026-03-28. Its
evaluation is 13 RDTs and reports 69% of VCs discharged with kernel-verified
automation ([arXiv:2603.27202](https://arxiv.org/abs/2603.27202)). Current HEAD
instead reports 30 RDTs, 672 standard-schema VCs, and names four files with a
remaining stage-2 Blaster residue
([README](https://github.com/fplaunchpad/sal/blob/4e71ff7069141b2b40a53d8dd2cd48a00f2c50be/README.md#L3-L22)).
Those are different artifact epochs; paper counts must not be used as HEAD
counts.

Sal pins Mathlib `v4.28.0` (resolved commit
`8f9d9cff6bd728b17a24e163c9402775d9e6a365`) and its Lean-Blaster fork at
`985dab1eca13534b6d60cbb2614b567be6ba3fe5`
([manifest](https://github.com/fplaunchpad/sal/blob/4e71ff7069141b2b40a53d8dd2cd48a00f2c50be/lake-manifest.json)).

### Load-bearing definitions and bridge theorems

The binary-merge target is not merely convergence. A configuration is
RA-linearizable when every active replica state has a list permutation of its
event set that respects the configuration order and folds to that state:

```lean
def IsRALinearizable (C : Configuration D) : Prop :=
  ∀ (r : Replica) (s : D.State) (E : Set (Op D.AppOp)),
    C.N r = some s → C.L r = some E →
    ∃ π : List (Op D.AppOp),
      listPermOf π E ∧ respects π (lo C) ∧ applySeq D D.init π = s
```

Source: [`RA_Linearizability.lean` lines 107–124](https://github.com/fplaunchpad/sal/blob/4e71ff7069141b2b40a53d8dd2cd48a00f2c50be/Sal/CRDTs/Metatheory/RA_Linearizability.lean#L107-L124).

The current corrected bridge has two explicit forms:

```lean
theorem ra_linearizable_of_core_join
    (hVC : CoreVCs D) (hPeel : JoinPeelVCs D)
    (C : Configuration D)
    (hReach : (labeledTS D).ReachableFrom (initConfig D) C) :
    IsRALinearizable C
```

([`RA_Lin_Of_Join.lean` lines 221–229](https://github.com/fplaunchpad/sal/blob/4e71ff7069141b2b40a53d8dd2cd48a00f2c50be/Sal/CRDTs/Metatheory/RA_Lin_Of_Join.lean#L221-L229))

```lean
theorem ra_linearizable_of_core_lattice_cd
    (hVC : CoreVCs D) (hLat : LatticeVCsPlus D) (hCD : CDVC D)
    (C : Configuration D)
    (hReach : (labeledTS D).ReachableFrom (initConfig D) C) :
    IsRALinearizable C
```

([`JoinLemma_Of_CD.lean` lines 660–667](https://github.com/fplaunchpad/sal/blob/4e71ff7069141b2b40a53d8dd2cd48a00f2c50be/Sal/CRDTs/Metatheory/JoinLemma_Of_CD.lean#L660-L667)). Current HEAD's
metatheory index explicitly says machine-checked countermodels refute the old
24-VC-only merge argument and records these repaired implications
([README](https://github.com/fplaunchpad/sal/blob/4e71ff7069141b2b40a53d8dd2cd48a00f2c50be/README.md#L152-L156)).

For ternary/version-DAG MRDTs, the analogous target quantifies over every
allocated version:

```lean
def IsRALinearizable3 (C : Configuration D) : Prop :=
  ∀ (v : Version) (s : D.State) (E : Set (Op D.AppOp)),
    C.ver v = some (s, E) →
    ∃ π : List (Op D.AppOp),
      listPermOf π E ∧
      respects π (Sal.Emulation.lo (Configuration.core C)) ∧
      applySeq D.toCRDTSig D.init π = s
```

and the generic join bridge is:

```lean
theorem ra_linearizable3_of_join (hJoin : JoinLemma3 D)
    {hInit : D.Inv D.init}
    (C : Configuration D)
    (hReach : (labeledTS3 D).ReachableFrom (initConfig D hInit) C) :
    IsRALinearizable3 C
```

Sources: [`Adequacy.lean` lines 32–41](https://github.com/fplaunchpad/sal/blob/4e71ff7069141b2b40a53d8dd2cd48a00f2c50be/Sal/ConditionedMRDTs/Metatheory/Adequacy.lean#L32-L41) and
[`Adequacy.lean` lines 790–797](https://github.com/fplaunchpad/sal/blob/4e71ff7069141b2b40a53d8dd2cd48a00f2c50be/Sal/ConditionedMRDTs/Metatheory/Adequacy.lean#L790-L797).

### Exact `MVarId.admit` path

The `sal` tactic tries three alternatives in order:

1. `dsimp` plus `grind`, followed by `failIfSorry`;
2. `blaster`, deliberately with no `failIfSorry`;
3. `dsimp` plus `aesop`/`grind`, again followed by `failIfSorry`.

The tactic source says why stage 2 is different: Blaster accepts a solver-valid
goal with `sorryAx` through `MVarId.admit`
([`Sal/Tactic/Sal.lean` lines 20–29 and 54–73](https://github.com/fplaunchpad/sal/blob/4e71ff7069141b2b40a53d8dd2cd48a00f2c50be/Sal/Tactic/Sal.lean#L20-L29)). The pinned
Blaster implementation is exact:

```lean
match result with
| .Valid => goal.admit -- TODO: replace with proof reconstruction
| .Falsified cex => ...
| .Undetermined => ...
```

Source: [`Blaster/Command/Tactic.lean` lines 43–48](https://github.com/kayceesrk/Lean-blaster/blob/985dab1eca13534b6d60cbb2614b567be6ba3fe5/Blaster/Command/Tactic.lean#L43-L48). Its README independently states that proof reconstruction is absent and a
`Valid` result concludes with `admit`
([lines 139–140](https://github.com/kayceesrk/Lean-blaster/blob/985dab1eca13534b6d60cbb2614b567be6ba3fe5/README.md#L139-L140)).

Consequences, stated narrowly:

- A declaration closed by `sal` has a kernel proof if stage 1 or stage 3 won;
  it contains `sorryAx` if stage 2 won on a Z3 `Valid` verdict.
- Current HEAD's README identifies the remaining stage-2 residue only at file
  granularity: `OR_Set_MRDT`, `OR_Set_Efficient_MRDT`,
  `Add_Win_Priority_Queue_MRDT`, and `Multi_Valued_Register_MRDT`
  ([same README evidence](https://github.com/fplaunchpad/sal/blob/4e71ff7069141b2b40a53d8dd2cd48a00f2c50be/README.md#L9-L10)). All four contain multiple
  `by sal` sites. The chosen stage is a runtime tactic result, so static text
  cannot honestly map the admit to exact theorem names. The acquiring run must
  record `#print axioms` per central theorem.
- Direct import search shows those four legacy modules are imported by their
  matching `ReadSide` and `SPOT` companions. The newer conditioned production
  ORSet, ORSetE, MVR, and AWPQ modules define mirrors and import the conditioned
  metatheory rather than the old MRDT modules; for example, see the
  [ORSet imports](https://github.com/fplaunchpad/sal/blob/4e71ff7069141b2b40a53d8dd2cd48a00f2c50be/Sal/ConditionedMRDTs/MRDT_Instances/ORSet/ORSet.lean#L1-L8)
  and its [`ORSet_ra_linearizable3` capstone](https://github.com/fplaunchpad/sal/blob/4e71ff7069141b2b40a53d8dd2cd48a00f2c50be/Sal/ConditionedMRDTs/MRDT_Instances/ORSet/ORSet.lean#L898-L903). This source-level import separation is useful, but it is not a
  substitute for the requested axiom output.

## Veil

### Primary paper and current artifact

The primary reviewed source is Pîrlea, Gladshtein, Kinsbruner, Zhao, and Sergey,
*Veil: A Framework for Automated and Interactive Verification of Transition
Systems*, CAV 2025
([authors' PDF](https://verse-lab.github.io/papers/veil-cav25.pdf)). The paper's
evaluation used Lean 4.16.0 and an older implementation epoch; current HEAD is a
Veil 2.0 pre-release on Lean 4.28.0
([repository README](https://github.com/verse-lab/veil/blob/300c305e945750ab3fb62de4a79c23161b24da39/README.md#L7-L25)). Trust conclusions below therefore come from current
source and its pinned dependency, with the paper used for architecture and
reviewed context.

### What a model and checker mean

The official Ring tutorial declares a `veil module`, uninterpreted `type`,
mutable relations, `#gen_state`, an `after_init` block, imperative `action`s,
`safety`/`invariant` clauses, and finally `#gen_spec`
([Ring source](https://github.com/verse-lab/veil/blob/300c305e945750ab3fb62de4a79c23161b24da39/Examples/Tutorial/Ring.lean#L42-L49),
[state and initializer](https://github.com/verse-lab/veil/blob/300c305e945750ab3fb62de4a79c23161b24da39/Examples/Tutorial/Ring.lean#L136-L167),
[safety/spec generation](https://github.com/verse-lab/veil/blob/300c305e945750ab3fb62de4a79c23161b24da39/Examples/Tutorial/Ring.lean#L215-L227)). Actions compile to transition semantics; this is
not only surface syntax.

`#check_invariants` proves that the conjunction of safety and invariant clauses
holds initially and is preserved by every action for all instances and
unbounded execution length. It also generates `doesNotThrow` VCs for assertions
([tutorial explanation](https://github.com/verse-lab/veil/blob/300c305e945750ab3fb62de4a79c23161b24da39/Examples/Tutorial/Ring.lean#L320-L350)). At the implementation level, the generator creates
`doesNotThrow` VCs for every initializer/action and preservation VCs for every
action × invariant clause
([`Induction.lean` lines 256–321](https://github.com/verse-lab/veil/blob/300c305e945750ab3fb62de4a79c23161b24da39/Veil/Frontend/DSL/Module/VCGen/Induction.lean#L256-L321)). The public preservation target reduces to:

```lean
def VeilM.preservesInvariantsIfSuccessfulAssuming
    (act : VeilM m ρ σ α) (assu : ρ → Prop) (inv : SProp ρ σ) : Prop :=
  VeilM.meetsSpecificationIfSuccessfulAssuming act assu inv inv
```

([`Definitions.lean` lines 194–211](https://github.com/verse-lab/veil/blob/300c305e945750ab3fb62de4a79c23161b24da39/Veil/Frontend/DSL/Action/Semantics/Definitions.lean#L194-L211)). A failed SMT VC is therefore a counterexample to
induction, not automatically a reachable bad state; the explicit-state model
checker separately explores finite instantiated executions.

Veil can print the exact generated theorem for interactive proof. The FloodSet
tutorial contains a concrete `nodeDecide_agreement` theorem whose conclusion is
`VeilM.meetsSpecificationIfSuccessfulAssuming ...`
([`FloodSet.lean` lines 403–438](https://github.com/verse-lab/veil/blob/300c305e945750ab3fb62de4a79c23161b24da39/Examples/Tutorial/FloodSet.lean#L403-L438)). `@[veil]` validates the theorem at the VC's expected
type and rejects unresolved metavariables/free variables/synthetic sorry; the
attribute additionally rejects any theorem value with `hasSorry`
([`TheoremDischarger.lean` lines 29–43 and 144–168](https://github.com/verse-lab/veil/blob/300c305e945750ab3fb62de4a79c23161b24da39/Veil/Core/Tools/Verifier/TheoremDischarger.lean#L29-L43)).

### SMT trust and reconstruction, settled from source

The current Veil option is explicit and defaults to trusted SMT:

```lean
register_option veil.smt.trust : Bool := {
  defValue := true
  descr := "If true, `veil_smt` trusts unsat results from the SMT solver. ..."
}
```

Source: [`Veil/Base.lean` lines 134–137](https://github.com/verse-lab/veil/blob/300c305e945750ab3fb62de4a79c23161b24da39/Veil/Base.lean#L134-L137). Veil passes the value directly into the
pinned lean-smt tactic; when false it also runs the nonempty inference needed by
proof reconstruction
([`Tactic.lean` lines 872–886](https://github.com/verse-lab/veil/blob/300c305e945750ab3fb62de4a79c23161b24da39/Veil/Frontend/DSL/Tactic.lean#L872-L886)).

The pinned dependency is `verse-lab/lean-smt` commit
[`5c14319297bfa8c56dfda2772d18d9710ef2322a`](https://github.com/verse-lab/lean-smt/commit/5c14319297bfa8c56dfda2772d18d9710ef2322a). Its two branches are:

| Veil setting | lean-smt behavior after `unsat` | Axiom consequence |
| --- | --- | --- |
| `veil.smt.trust = true` (default) | Does not request solver proofs; calls `mv.admit (synthetic := false)`. The source warns that this adds both solver and translation to the TCB and that the translation is not always sound. | The resulting theorem contains non-synthetic sorry/admit. |
| `veil.smt.trust = false` | Adds `produce-proofs`, requires a proof, calls `reconstructProof`, and assigns the reconstructed term to the original metavariable. | Intended result is checked by the Lean kernel; an unsupported/missing reconstruction fails rather than silently trusting `unsat`. |

Sources: lean-smt [`Config` lines 47–51](https://github.com/verse-lab/lean-smt/blob/5c14319297bfa8c56dfda2772d18d9710ef2322a/Smt/Tactic/Smt.lean#L47-L51) and
[`unsat` handling lines 205–247](https://github.com/verse-lab/lean-smt/blob/5c14319297bfa8c56dfda2772d18d9710ef2322a/Smt/Tactic/Smt.lean#L205-L247).

There are two important controls:

- Veil's `VeilTest` target globally sets `weak.veil.smt.trust` to `false`
  ([`lakefile.lean` lines 91–101](https://github.com/verse-lab/veil/blob/300c305e945750ab3fb62de4a79c23161b24da39/lakefile.lean#L91-L101)). This means its normal test-library theorem path is reconstructed even though user code defaults to trust.
- A dedicated positive trust test expects Veil's warning telling users to set
  the option false for proof reconstruction
  ([`WarnTrustingSmtSolver.lean` lines 1–46](https://github.com/verse-lab/veil/blob/300c305e945750ab3fb62de4a79c23161b24da39/VeilTest/WarnTrustingSmtSolver.lean#L1-L46)); the warning is generated by counting sorry-bearing VC proofs
  ([`Module/Elaborators.lean` lines 368–374](https://github.com/verse-lab/veil/blob/300c305e945750ab3fb62de4a79c23161b24da39/Veil/Frontend/DSL/Module/Elaborators.lean#L368-L374)).

The CAV paper's footnote also says reconstruction was off by default in that
artifact. A 2026 Veil paper reports reconstruction at a 3–5× performance penalty
([authors' Dafny'26 paper](https://verse-lab.github.io/papers/veil-dafny26.pdf)).

## CSLib

### Primary sources and module coverage at current HEAD

The umbrella source describes CSLib as the Lean library for computer science
([README](https://github.com/leanprover/cslib/blob/2e1824a4d8d896cbb1a0f03eab62e3e344a825c4/README.md)). The primary overview paper is *CSLib: The Lean Computer Science
Library* ([arXiv:2602.04846](https://arxiv.org/abs/2602.04846)). The technical
spine paper records reusable reduction/LTS interfaces and initial language
developments ([arXiv:2602.15078v2](https://arxiv.org/abs/2602.15078)), while the
HML paper states the syntax, satisfaction, denotation, and image-finite
Hennessy–Milner theorem ([arXiv:2602.15409](https://arxiv.org/abs/2602.15409)).

The current umbrella import file is more informative than the February papers
for present coverage:

| Area | Current umbrella modules |
| --- | --- |
| LTS spine | 17 modules: `Basic`, `Bisimulation`, finite/infinite execution, divergence, tau, simulation, trace equivalence, termination, reverse, totality, union, label maps, relations, and categorical basics ([imports](https://github.com/leanprover/cslib/blob/2e1824a4d8d896cbb1a0f03eab62e3e344a825c4/Cslib.lean#L102-L118)). |
| Process calculi / protocol languages | CCS `Basic`, `Semantics`, `BehaviouralTheory`; Stateful Processes `Basic` and `Network` ([imports](https://github.com/leanprover/cslib/blob/2e1824a4d8d896cbb1a0f03eab62e3e344a825c4/Cslib.lean#L125-L127), [lines 166–167](https://github.com/leanprover/cslib/blob/2e1824a4d8d896cbb1a0f03eab62e3e344a825c4/Cslib.lean#L166-L167)). |
| HML | `Basic` and `LogicalEquivalence` ([imports](https://github.com/leanprover/cslib/blob/2e1824a4d8d896cbb1a0f03eab62e3e344a825c4/Cslib.lean#L168-L169)). |
| Distributed consensus | Eight FLP modules: algorithm model, consensus, refined reachability, fair scheduler, pseudo-consensus layers, impossibility, and a zero-fault example ([imports](https://github.com/leanprover/cslib/blob/2e1824a4d8d896cbb1a0f03eab62e3e344a825c4/Cslib.lean#L30-L37); [directory guide](https://github.com/leanprover/cslib/blob/2e1824a4d8d896cbb1a0f03eab62e3e344a825c4/Cslib/Computability/Distributed/FLP/README.md)). |

The LTS abstraction is intentionally small and reusable:

```lean
structure LTS (State : Type u) (Label : Type v) where
  Tr : State → Label → State → Prop

inductive MTr (lts : LTS State Label) : State → List Label → State → Prop
```

Source: [`LTS/Basic.lean` lines 59–95](https://github.com/leanprover/cslib/blob/2e1824a4d8d896cbb1a0f03eab62e3e344a825c4/Cslib/Foundations/Semantics/LTS/Basic.lean#L59-L95). HML gives propositions a `Set State`
denotation and proves, for image-finite LTSs:

```lean
theorem theoryEq_eq_bisimilarity {lts : LTS State Label}
    [image_finite : ∀ s μ, Finite (lts.image s μ)] :
    TheoryEq lts = HomBisimilarity lts
```

([`HML/Basic.lean` lines 233–255 and 319–368](https://github.com/leanprover/cslib/blob/2e1824a4d8d896cbb1a0f03eab62e3e344a825c4/Cslib/Logics/HML/Basic.lean#L233-L255)). Stateful Processes models a network as a function from process identifiers to process terms and gives it symbolic and concrete LTSs
([`Network.lean` lines 33–72](https://github.com/leanprover/cslib/blob/2e1824a4d8d896cbb1a0f03eab62e3e344a825c4/Cslib/Languages/StatefulProcesses/Network.lean#L33-L72)).

### Unordered and set-based semantics: the earlier absence is false in part

The FLP model is direct evidence of unordered protocol state:

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

The source comment explicitly says the multiset of in-flight messages is not
ordered ([`FLP/Algorithm.lean` lines 57–78](https://github.com/leanprover/cslib/blob/2e1824a4d8d896cbb1a0f03eab62e3e344a825c4/Cslib/Computability/Distributed/FLP/Algorithm.lean#L57-L78)). A receive removes one occurrence and adds the emitted multiset; the LTS consumes any member of the bag
([lines 97–120](https://github.com/leanprover/cslib/blob/2e1824a4d8d896cbb1a0f03eab62e3e344a825c4/Cslib/Computability/Distributed/FLP/Algorithm.lean#L97-L120)).

It proves both the local commutation law and a diamond:

```lean
theorem recvMsg_comm ... (hd : m1.dest ≠ m2.dest) ... :
  ... ∧ a.recvMsg m2 (a.recvMsg m1 s) =
        a.recvMsg m1 (a.recvMsg m2 s)

theorem tr_diamond {ps : Set P} ... :
  ∃ s', a.lts.Tr s1 x2 s' ∧ a.lts.Tr s2 x1 s'
```

([`Algorithm.lean` lines 180–214](https://github.com/leanprover/cslib/blob/2e1824a4d8d896cbb1a0f03eab62e3e344a825c4/Cslib/Computability/Distributed/FLP/Algorithm.lean#L180-L214)). The capstone formalizes impossibility of one-fault consensus and then every `f ≥ 1` for at least two processes:

```lean
theorem Consensus.one_not_exists [Fintype P] (hc : card P ≥ 2) :
    ¬ ∃ a : Algorithm P M S, a.Consensus 1

theorem Consensus.ge_one_not_exists [Fintype P]
    {f : ℕ} (hc : card P ≥ 2) (hf : f ≥ 1) :
    ¬ ∃ a : Algorithm P M S, a.Consensus f
```

Source: [`FLP/Impossibility.lean` lines 152–172](https://github.com/leanprover/cslib/blob/2e1824a4d8d896cbb1a0f03eab62e3e344a825c4/Cslib/Computability/Distributed/FLP/Impossibility.lean#L152-L172).

The boundary matters:

- `Multiset` preserves multiplicity and quotients order; it is not `Set`, so it
  does not provide event-id idempotence or duplicate-collapse by itself.
- CSLib's ordinary LTS finite traces are `List Label`, and HML denotations and
  process subsets use `Set`, but those are different roles from an unordered
  event carrier.
- A repository-wide source search at this pinned HEAD for fields resembling
  event/message/history/journal carriers of type `Set`, `Finset`, or `Multiset`
  found the FLP `Multiset` model (plus scheduler auxiliaries) and no generic
  set-of-events fold/refinement framework. This is a bounded absence claim about
  commit `2e1824a`, not a claim about future CSLib or all possible encodings.

## Retrieval and access ledger

Commands used for source acquisition and inspection:

```text
git ls-remote --symref <official-url> HEAD
git clone <official-url> <temporary-directory-outside-foldlab>
git rev-parse HEAD
git log -1 --format=fuller
rg --files
rg -n <target symbols and semantic carrier terms> <source trees>
```

The Sal Lean-Blaster and Veil lean-smt dependency commits were cloned to the
same external temporary research area after their exact revisions were read
from each upstream manifest. Official repository source, author-hosted papers,
and arXiv records were the only evidence used.

Open items intentionally left to the acquiring/exploration run:

1. Builds and timings for all three repositories.
2. Exact solver binary versions actually selected by each build.
3. `#print axioms` for every selected central theorem, especially declaration-
   level identification of Sal's stage-2 residue and Veil theorem outputs under
   both trust settings.
4. Final depend/transliterate/learn verdicts, costs, and reversal plans. This
   background file supplies source facts but does not pre-empt the required
   hands-on report.
