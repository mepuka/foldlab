# Angle 4 — adversarial gates and vacuity: a unity bridge that is unable to lie

**Status: exploratory approach memo. No code, no package, no gate was
written or modified.** One of five parallel architect memos mapping the
space of proof paths between `verify/fabric` and `verify/kernel`. My
assigned lens is falsifiability: assume somebody builds a bridge, and
ask how it could be green and worthless.

For an outsider, three sentences of vocabulary before anything else. A
**cell** is the estate's evidence container: a finite set of
observations, each observation a pair of *who saw it* and *what they
saw*, merged between replicas by set union, so duplicate and out-of-order
delivery cannot change the answer. A **journal** is an append-only log
whose entries carry venue-local positions, and an **anchor** is a
recorded resume coordinate into one (`floor`, state, `head`) so a
reader can continue a computation from where it stopped rather than
from the beginning. The **admission door** is the single function that
takes a raw sentence an agent tried to write and either translates it
into a lawful sentence or refuses it, attaching the law it defends and
the legal next move — the refusal is data, not an error string.

The two models under discussion: `verify/fabric` is the substrate model
(cells, directories, positioned journals, policies, trigger state) with
concrete carriers; `verify/kernel` is the language model (eight
generators, one door, program graphs) whose semantics run over
*abstract* carriers — any merge operation that is associative and
idempotent will do. The kernel imports nothing from fabric. Today the
connection is citation strings.

---

## 0. What I read, and how I counted

Everything below was read in place in the worktree
`C:\Users\kokok\Dev\foldlab-kernel-model` at `d9a13b67f`. I did **not**
run either gate: `lake build` writes into `.lake/`, and the commission
says the worktree stays untouched. So every number here is static —
computed by the same greps the gates themselves use, run against the
committed sources and the committed gate scripts. Where the gate's
number and the prose's number disagree, I report the gate's.

| Quantity | Briefed | **Verified** | How I counted |
| --- | --- | --- | --- |
| fabric rostered theorems | "~200" | **206** | `awk '/^roster=\(/{f=1;next} f&&/^\)/{f=0} f' verify/fabric/run.sh \| tr -s ' ' '\n' \| grep -E '^[a-z][A-Za-z0-9_]*$' \| wc -l` → 206; independently, fabric's own discovery grep over `Fabric/` → 206 (46 BridgeProofs + 53 ControlProofs + 107 Proofs) |
| fabric law statements | "F1–F12 + C7" | **27**, in families C7(1) F1(4) F2(1) F2b(2) F3(2) F4(1) F7(3) F9(2) F10(2) F11(2) F12(7) | `grep -cE '^[[:space:]]*def[[:space:]]+[A-Z]' Fabric/Laws.lean` → 27; families by `sed`ing the gate's `expected_laws` array. **No F5, F6, F8 in this package** |
| fabric negative controls | — | **16** | `ls negative-controls/*.cex.txt \| wc -l` → 16; `grep -c '^check_control ' run.sh` → 16 |
| fabric private theorems | — | **1**, pinned by name | `applySuccessors_of_completeBuffer`, pinned in the gate |
| kernel rostered theorems | "50" (KM §1) | **60** | roster array → 60; discovery grep → 60; `diff` of the two: identical |
| kernel law statements | "8" (KM §1) | **12** | `grep -cE '^[[:space:]]*def[[:space:]]+[A-Z]' Kernel/Laws.lean` → 12 |
| kernel door controls | "17" (KM §1) | **18** | `ls negative-controls/*.cex.txt` → 18; `grep -c '^check_control '` → 18 |
| kernel must-not-compile | 4 | **4** | `grep -c '^check_must_not_compile '` → 4, each with a witness twin and a pinned diagnosis |
| kernel private theorems | — | **0**, pinned to empty | the gate fails on any `private`/`protected` theorem |
| law citations in the kernel's taught table | — | **8** distinct names, **7** resolve into fabric's roster, **1** does not | `grep -oE '\(([a-z][a-z0-9_]*)\)' Kernel/Definitions.lean \| sort -u`, then `comm` against the fabric roster |

**The stale-count finding is already live, and it is the cheapest
possible demonstration of the risk this memo is about.** The kernel
notes' headline section (`docs/research/2026-08-18-kernel-model-notes.md`
§1) says 50 theorems, 8 law statements, 17 door controls. §11b of the
*same file* says 57 and 18. The gate says 60, 12, 18. Two amendment
waves landed and the summary paragraph did not move. Nothing broke,
because no gate reads that paragraph. **Any obligation carried in prose
rots at exactly this rate; the bridge's obligations must be carried in a
file a gate reads.**

Sources read in full or in the relevant part: `Kernel/Definitions.lean`
(1203 lines, all), `Kernel/Laws.lean` (all 12 statements),
`Kernel/Proofs.lean` (the abstract-world section and the admission
proofs), `kernel/run.sh` and `fabric/run.sh` (both entire),
`kernel/ControlMain.lean`, the must-not-compile controls and their
witnesses, `Fabric/Definitions.lean` (cells, journals, directories,
fenced resolution, trigger state, admission), `Fabric/Laws.lean` (all
27), the seam-relevant statements in `Fabric/Proofs.lean`,
`Fabric/BridgeProofs.lean` (header and pattern), `fabric/DECISIONS.md`
(T5, T16, T29 in full; the T-index), `docs/research/2026-08-18-kernel-model-notes.md`
(all, including bounds 1–12), `docs/design/2026-08-18-plait-kernel-algebra.md`
§3 and §5.2, `verify/AGENTS.md`, `verify/CONTEXT.md`,
`.github/workflows/lean-gates.yml`, and all four package
`lakefile`/`lake-manifest` pairs.

---

## 1. Unity, as a finite set of theorem statements

### 1.1 The claim in one sentence

*Unity* is: **every hypothesis the kernel names abstractly is discharged
at a carrier fabric actually ships, and every proof shape the kernel
re-derives is derived instead from fabric's, through a translation whose
losses are themselves proved.**

Not an isomorphism. Not a refinement in the process-algebra sense. Not
even a simulation in general — for two of the seams below, the honest
statement is a *characterised failure* of simulation, and I argue that
is the more valuable artifact.

### 1.2 The statements

Eleven theorem statements and one committed ledger. House ASCII style
(`forall`, `->`, `/\`, `<->`). `Unity` is the bridge namespace; the
translation functions live in `Unity/Definitions.lean` and are specified
in §4.

**Group A — the merge hypotheses, discharged at the shipped evidence
carrier.**

```lean
-- U1
theorem unity_merge_hypotheses_discharged :
    (forall a b c : Fabric.Emitter.GroundCell,
        Fabric.Cell.merge (Fabric.Cell.merge a b) c =
          Fabric.Cell.merge a (Fabric.Cell.merge b c)) /\
    (forall a : Fabric.Emitter.GroundCell,
        Fabric.Cell.merge a a = a)

-- U2  (the headline)
theorem unity_interp_inflationary_at_cell
    (act : Kernel.Act) (world : Kernel.World Fabric.Emitter.GroundCell) :
    Kernel.World.Le Fabric.Cell.merge world
      (Kernel.interp Fabric.Cell.merge cellContribution act world)

-- U3  (U2's anti-vacuity twin: the abstraction is not the constant map)
theorem unity_evidence_strictly_grows :
    (Unity.groundObservation ∉ Unity.groundWorld.evidence) /\
    (Unity.groundObservation ∈
      (Kernel.interp Fabric.Cell.merge cellContribution
        Unity.groundEmit Unity.groundWorld).evidence)
```

**Group B — admission-rank well-foundedness, inherited rather than
re-proved.**

```lean
-- U4
theorem unity_node_admission_transports (nodes : List Kernel.ProgramNode) :
    Kernel.ProgramAdmission nodes ->
      Fabric.Admission (nodes.map Unity.declOf)

-- U5  (reflection, not simulation: both directions)
theorem unity_pins_reflect {nodes : List Kernel.ProgramNode}
    (admission : Kernel.ProgramAdmission nodes)
    (parent child : Kernel.ProgramNode) :
    Kernel.NodePins nodes parent child <->
      Fabric.PinsWithin (nodes.map Unity.declOf)
        (Unity.declOf parent) (Unity.declOf child)

-- U6  (proved through Fabric.c7_pin_well_founded; the gate forbids
--      this file from naming Kernel.program_pin_well_founded)
theorem unity_program_well_foundedness_is_c7
    (nodes : List Kernel.ProgramNode) :
    Kernel.ProgramAdmission nodes -> WellFounded (Kernel.NodePins nodes)

-- U7  (the sharpest agreement statement in the set)
theorem unity_ranks_agree (nodes : List Kernel.ProgramNode) (name : Nat) :
    Kernel.nodeRank nodes name =
      Fabric.admissionRank (nodes.map Unity.declOf) name
```

**Group C — greatest-wins reads, with the premise proved load-bearing.**

```lean
-- U8
theorem unity_greatest_at_is_greatest_token
    (facts : List (Nat × Nat × Nat)) (hole : Nat) :
    Unity.PositionsUniqueAt facts hole ->
      (Kernel.greatestAt facts hole).map Prod.snd =
        (Fabric.greatestSeal (Unity.recordsAt facts hole)).map
          Fabric.Seal.digest

-- U9  (the falsifier: the two models break ties in OPPOSITE directions,
--      so U8's premise is not decoration)
theorem unity_tie_divergence_witness :
    (Kernel.greatestAt Unity.tiedFacts 1).map Prod.snd ≠
      (Fabric.greatestSeal (Unity.recordsAt Unity.tiedFacts 1)).map
        Fabric.Seal.digest
```

**Group D — closed-inventory canaries (cheap, high drift value).**

```lean
-- U10
theorem unity_hole_stage_ranks_agree (stage : Kernel.HoleStage) :
    stage.rank = (Unity.stageToFabric stage).rank

-- U11  (the lane is lost; the bridge proves the loss rather than hoping)
theorem unity_trigger_lane_is_lost :
    Unity.triggerToFabric (.evidenceAppears ⟨1⟩ ⟨10⟩) =
      Unity.triggerToFabric (.evidenceAppears ⟨2⟩ ⟨10⟩)
```

**The ledger (not a theorem).** `Unity/obligations.txt`: one row per
kernel-side abstract hypothesis or citation, each row `discharged-by
<fabric theorem>` or `out-of-scope <reason>`. Today exactly one row is
out of scope: `at_most_one_landed_commit`, cited in the kernel's
unfenced-decide refusal, lives in `verify/fabric-veil` on Lean
**v4.28.0** — across the toolchain split the house forbids crossing. It
is un-dischargeable by any fabric↔kernel bridge, and saying so in a
gate-read file is the whole point.

### 1.3 What is deliberately NOT claimed

- **No runtime claims.** Nothing about the TypeScript projection, the
  JSON wire, the certifier, or any shipped code. The bridge is two Lean
  models agreeing; a runtime that conforms to neither is unaffected.
- **No liveness.** No claim that a grant arrives, a delivery completes,
  a lease renews, a memo hits, or a program terminates. Every statement
  is a safety statement about states or about derivations.
- **No F13.** `CandidateF13BoundExecutionReplay` stays stated-only, and
  §2 shows why the bridge is the exact place that posture could leak.
- **No isomorphism.** The models have different strengths and different
  vocabularies. U11 proves a translation is *not* injective; that is a
  feature.
- **No claim about the register / F5 / fenced commits.** Toolchain split.
- **No attribution claim.** The kernel has no holder anywhere (KM bound
  8). The translation invents one, so no cell extensionality or
  convergence result may ride it — see §4.1.
- **No claim that the kernel's closure list is complete for fabric.**
  KM bound 1 says that mapping is argument, not theorem; the bridge does
  not upgrade it.
- **No universe-general claim.** `Kernel.World` and `Kernel.interp` are
  `Type` (Type 0) — I checked: the kernel declares no `universe` and
  every `Evidence` binder reads `Evidence : Type`. Fabric is
  `universe uH uV uR` polymorphic. The bridge therefore claims the merge
  seam **only at Type-0 fabric carriers**, of which fabric's shipped
  ground carrier is one. Widening this would be a kernel edit, which is
  blast radius in the wrong package.

---

## 2. Package topology (the point I own hardest)

### 2.1 The four options, scored

Criteria, and why each: **zero-dependency preservation** (each existing
gate asserts its own manifest is `"packages": []` — I read both greps);
**gate coupling** (can an upstream change turn an unrelated gate red,
and can one package's failure block another's claim);
**rollbackability** (un-grilled machinery must be removable);
**drift risk**; **trusted-surface widening** (whose theorems end up
inside whose footprint sweep); and the one criterion my lens insists on
— **can this option prove unity at all**.

| | A. third package requiring both | B. kernel-side file (kernel requires fabric) | C. fabric-side file (fabric requires kernel) | D. copy-in + diff check |
| --- | --- | --- | --- | --- |
| Zero-dependency preserved | **Yes, exactly.** Neither upstream manifest changes; both gates' `"packages": []` assertions still pass unmodified | **No.** Kernel's manifest gains an entry; its gate's assertion must be edited away — deleting the check that protects the property | **No.** Same breakage, on the ratified CI-wired package | Yes |
| Gate coupling | One-directional and read-only: the bridge builds both; neither upstream gate ever reads the bridge. A bridge failure blocks only the bridge | Kernel's gate now builds fabric. A fabric break reddens the kernel gate | Fabric's gate now builds an **exploratory** package. A ratified gate held hostage by pre-grill work | None at build time; the diff check still needs a third place to run, so it is option A with a weaker instrument |
| Rollbackability | **Best.** `rm -r verify/unity` + delete one CI step. Zero upstream reverts | Poor. KM-3's own words: removing the dependency after statements cite fabric names verbatim is surgery | Poor, and on the package the estate can least afford to churn | Good |
| Drift risk | Lowest: the bridge is the only place both name spaces are mentioned, so the citation checker has a natural home | Low locally, but the drift moves *into* the kernel, which is the package whose self-containment is the point | Low locally, same objection inverted | **Highest.** A copy drifts by construction; the diff catches bytes, not meaning |
| Trusted surface | Bridge's sweep covers bridge theorems; upstream sweeps unchanged. Importing `Fabric.Proofs` (not `Fabric`) keeps the emitter and corpus out of the bridge's build | Fabric's 206 theorems enter the kernel's footprint surface — exactly what KM-3 refused | Kernel's 60 enter fabric's | Unchanged, because nothing real is shared |
| **Can it prove unity?** | Yes | Yes | Yes | **No.** A copy of `Cell` into the kernel package is a *different type*. A theorem about the copy says nothing about fabric's. A copy-in bridge proves unity with a mirror |

**Recommendation: A, a new package `verify/unity`, decisively.** It is
the only option that leaves both existing gates byte-unchanged, and the
only one whose rollback is a directory deletion.

Three details that make A concrete:

1. **Name it `unity`, not `bridge`.** `Fabric/BridgeProofs.lean` already
   exists and means something else entirely (concrete theorem instances
   whose terms are fed into the emitted conformance rows). Reusing the
   word guarantees a reviewer will conflate them.
2. **Import narrowly.** `import Fabric.Proofs` and `import Kernel.Proofs`,
   never `import Fabric` — fabric's root pulls `Fabric.Emit` and
   `Fabric.BridgeProofs`, which drags the corpus emitter into the
   bridge's build for no benefit.
3. **The one thing I could not verify statically:** that lake's
   relative-path `require ... from "../fabric"` resolves in place rather
   than copying into `.lake/packages`. Every other estate package is
   zero-dependency; the sole precedent is `verify/fabric-veil`, which
   requires `veil` *from git*, not from a path. If lake copies, a stale
   copy is a drift channel and the gate must checksum it. **First build
   answers this; treat it as an open question, not a fact.**

### 2.2 What the bridge's own gate checks

Fourteen checks. Nine are transplants of machinery both existing gates
already run (so a reviewer can diff them against a known-good original);
five are new and exist because a bridge has failure modes a single-model
gate does not.

*Transplanted, verbatim in shape:*

- **B1 · roster diff.** Committed roster array vs. discovery grep over
  `Unity/`; any orphan or stale line fails.
- **B2 · footprint sweep.** `#print axioms` over every rostered theorem;
  allowlist exactly `propext`, `Classical.choice`, `Quot.sound` — the
  same three both gates allow. Fabric already proves all 206 of its
  theorems stay inside that set, so a cross-package proof inheriting a
  fourth axiom would be a real finding.
- **B3 · private set pinned to empty.** Copied from the kernel gate,
  whose comment states the reason exactly: a visibility modifier removes
  a theorem from both the roster and the footprint sweep. In a bridge
  this is worse than usual — a private helper is where a weakened
  restatement would hide.
- **B4 · partition.** No `theorem` in `Unity/Definitions.lean` or
  `Unity/Laws.lean`; no `:= by` in `Unity/Laws.lean`; no
  `def|abbrev|structure|inductive|instance` in `Unity/Proofs.lean`.
- **B5 · law-name array pin.** The gate's `expected_laws` array must
  equal the `def`s found in `Unity/Laws.lean`, in order.
- **B11 · control battery.** One `.cex.txt` per named failure mode,
  each ending `verdict=refuted`, byte-compared against the committed
  trace, plus the orphan check (no committed trace goes unexercised).
- **B12 · must-not-compile battery** with witness twins and pinned
  diagnosis substrings.
- **B13 · record, don't assert, the upstream sizes.** The PASS line
  prints the two upstream roster counts it observed (206 / 60 today).
  `verify/AGENTS.md`: "Run records pin by RECORDING, not by asserting."
  A reviewer sees the numbers move; no gate goes red on a legitimate
  upstream addition.
- **B14 · the citation cross-check** (§2.3).

*New, and specific to bridging:*

- **B6 · dependency pin.** The bridge's own manifest must name exactly
  two packages, at exactly the two local paths; all three
  `lean-toolchain` files must be byte-identical to
  `leanprover/lean4:v4.33.0`. (This is the bridge's analogue of the
  upstream zero-dependency assertion: not "no dependencies" but "exactly
  these, at exactly this pin".)
- **B7 · the gift back upstream.** The bridge gate asserts that *both
  upstream manifests are still* `"packages": []`. The bridge is the only
  gate in the repo that reads both trees, so it is the natural place to
  keep watch on the property that makes the two packages worth bridging
  — and it costs one grep, with the failure landing on the bridge, never
  on them. **The bridge should strengthen the two models' guarantees, not
  dilute them; this is the concrete instance of that.**
- **B8 · the F13 tripwire, extended — this closes a hole the bridge
  itself would open.** The kernel gate greps for `CandidateF13` in
  exactly two files: `Kernel/Proofs.lean` and `ControlMain.lean`. A new
  package that imports `Kernel.Laws` can prove
  `CandidateF13BoundExecutionReplay` — the abstract skeleton is a few
  lines, as the notes say — and **the kernel gate will never see it.**
  The bridge gate must therefore refuse any mention of `CandidateF13`
  anywhere under `Unity/`. Without B8, building a bridge quietly
  converts a ruled-and-fenced posture into an unfenced one.
- **B9 · independent-derivation pin.** `Unity/Proofs.lean` must not name
  `Kernel.program_pin_well_founded`. U6's entire content is that the
  kernel's well-foundedness *follows from* fabric's; discharge it with
  the kernel's own theorem and the statement is true and empty. Lean
  cannot express "proved without using X"; a grep can.
- **B10 · carrier allowlist (positive, not negative).** Every `def` in
  `Unity/Laws.lean` must mention at least one identifier from a committed
  allowlist of *fabric ground carriers* (`Emitter.GroundCell`,
  `Emitter.GroundDirectory`, `Fabric.Cell.merge`, `Fabric.Admission`,
  `Fabric.greatestSeal`, …). A denylist of `Unit`/`Bool` fails on the
  first clever alias; a positive allowlist requires a real carrier to be
  present. This is the mechanical form of `DECISIONS.md` T5's ratified
  reasoning — *"Alternatives: toy scalar algebras … every variant now
  shares the shipped carrier"* — and it is the single cheapest defence
  against the whole vacuity family.

Plus one I would push for and expect argument about:

- **B5b · statement digests.** A committed manifest carrying a hash per
  law `def` block in `Unity/Laws.lean`. The name array (B5) catches
  renames and deletions; nothing catches a *weakening* that keeps the
  name — dropping a conjunct, adding a premise, narrowing a quantifier.
  A digest does, and an intentional edit regenerates the manifest in the
  same commit, which is precisely the corpus discipline fabric already
  ratified (T8, and the gate's own instruction: *"intended change —
  regenerate and commit corpus + manifest IN THE SAME COMMIT"*). Cost:
  one more file to keep honest. The alternative that avoids the file is
  §4.6's consumer pinning, which is stronger where it applies and does
  not apply everywhere.

**CI wiring:** one more step in `.github/workflows/lean-gates.yml`,
after the fabric steps. Nothing else moves. Note the honest cost: that
step rebuilds fabric and kernel from scratch, so the marginal CI time is
roughly a full fabric build plus a kernel build plus the bridge.

### 2.3 The citation cross-check, without coupling the two gates

The problem, stated concretely from what is in the tree today. The
kernel's taught-refusal table cites eight fabric law names inside
string literals. Seven resolve into fabric's 206-name roster
(`f1_cell_merge_aci`, `f10_stability`, `f11_query_deterministic`,
`f11_topk_of_support`, `c7_pin_well_founded`, `cell_absorb_inflationary`,
`compact_below_floor_preserves_resumption`). One does not
(`at_most_one_landed_commit` — fabric-veil, v4.28.0). Nothing checks
this. KM bound 12 says so in words: *"Verified against the fabric roster
when written; a fabric rename goes stale here silently."*

The check, in the bridge gate, pure shell, no Lean:

1. Extract citations: `grep -oE '\(([a-z][a-z0-9_]*)\)' ../kernel/Kernel/Definitions.lean | sort -u`.
   (Today: 8.) Widen the extraction only when the kernel's citation
   convention widens — and pin the extraction count, so a convention
   change is visible rather than silently under-scanned.
2. Extract fabric's authority list with fabric's **own** discovery grep
   over `../fabric/Fabric/` — not the roster array. The fabric gate
   already proves those two agree, so reading the sources borrows
   fabric's guarantee without depending on fabric's script text.
3. Every citation must appear in fabric's list **or** in the committed
   out-of-scope file with a reason.
4. Both directions of orphan check: no out-of-scope row may name a
   citation that no longer exists; no committed obligation row may name
   a fabric theorem that has left the roster.

Coupling analysis: the bridge reads two upstream trees and writes
nothing; neither upstream gate reads the bridge. A fabric rename turns
**only** the bridge red, with a message naming the renamed theorem and
the kernel docstring that still cites it. That is the correct blast
radius: the bridge is the artifact claiming the correspondence, so the
bridge is what fails when the correspondence lapses.

One texture worth pinning while designing these greps: fabric's own
`Mutants.lean` contains a *docstring* line beginning
`    theorem — so its kill …`, which a loose `^\s*theorem\s` pattern
counts as a declaration and the gate's real pattern (which demands an
identifier character class afterwards) correctly ignores. Grep-based
rosters are text-fragile in both directions; copy the gates' exact
patterns rather than an approximation of them.

---

## 3. Seam inventory, ordered by cost

Each row: the kernel abstraction, the fabric instance that discharges
it, the bridge statement, and — my lens's column — the specific way this
seam could be green and worthless.

| # | Kernel abstraction | Fabric instance | Bridge statement | Cost | How this seam lies if unguarded |
| --- | --- | --- | --- | --- | --- |
| S1 | `merge` hypotheses of `KInterpInflationary`: assoc + idem on an abstract `Evidence : Type` | `Cell.merge` at `Emitter.GroundCell`; `cell_merge_assoc`, `cell_merge_idem`, packaged as `f1_cell_merge_aci` | U1, U2 | **Low** — one application; the two lemmas exist | Instantiate at `Nat.max` (the kernel already ships exactly this as `ground_interp_inflationary`) or choose a contribution that always returns the empty cell. Both are true, both are worthless |
| S2 | The same, *not* vacuous | — | U3 | **Low** — `cell_le_iff_subset` gives the membership reading | Omit it. Nothing else in the bridge notices |
| S3 | `HoleStage` + `HoleStage.rank` (kernel's own copy) | `Fabric.HoleStage` + `rank` (constructor-for-constructor identical) | U10 with total, match-exhaustive maps **both ways** | **Very low** | Define only one direction, or use a catch-all `| _ =>`. Then a new stage on either side compiles and the canary is dead |
| S4 | `nodeRank` | `admissionRank` | U7 | **Low–medium** — induction on the list, same shape both sides | State it only at the ground fixture instead of for all node lists; the general drift alarm is then absent |
| S5 | `ProgramAdmission` | `Admission` via `declOf n = ⟨n.name, n.uses⟩` | U4 | **Medium** — induction over the inductive; freshness and uses-admitted transport componentwise | Translate `uses := []`. Admission still transports. Everything downstream still holds. **Nothing catches it without S6** |
| S6 | `NodePins` | `PinsWithin` | U5, as `<->` | **Medium** | State only `->`. The erasing translation of S5 satisfies forward simulation trivially |
| S7 | `program_pin_well_founded` (the kernel's re-proof) | `c7_pin_well_founded` | U6 | **Medium** — `Subrelation.wf` + `InvImage.wf` through `declOf`, mirroring both existing proofs | Prove it from the kernel's own theorem. True; content zero. B9's grep is the only guard |
| S8 | Closed trigger grammar (5 productions, kernel sorts) | Closed trigger grammar (5 productions, fabric carriers) | U11 plus total both-way maps | **Medium** — the data does not correspond (kernel carries a lane, fabric does not; kernel carries one `Value`, fabric a list of observations) | Claim a bijection. It is false — the lane is dropped. U11 makes the loss a theorem instead of a hope |
| S9 | `greatestAt` over positioned provision facts | `greatestSeal` over fenced-token records, `greatest_seal_of_support`, `f12_greatest_seal_wins` | U8 under a positions-unique premise | **High** — option-valued folds in opposite directions (kernel `foldr`, fabric structural recursion), plus a filter-to-hole step. Expect the literal-match texture (`rw` then `dsimp only []`) and `cases h :` pre-substitution to bite here | State U8 without the premise and prove it only on `positionedOf` output, whose positions are always distinct. The statement is then false in general and every fixture agrees with it |
| S10 | The same, premise proved load-bearing | — | U9 | **Low once S9 exists** | Omit it, and nobody learns the two models break ties in opposite directions |

**Seams I am explicitly ruling OUT of v0, with reasons — because a seam
inventory that lists impossible seams is itself a lie:**

- **Trigger *semantics* / `f10_stability`.** Fabric has `holds` and a
  monotone-growth theorem. **The kernel has no denotation for triggers
  at all** — `interp` maps `.trigger _ _` to the identity, documented as
  KM bound 5. There is nothing to bridge until the kernel grows a
  `holds`, and that is new kernel machinery, not bridge work. Naming
  this as a seam today would be the purest form of the lie this memo is
  about.
- **`decide` / registers / at-most-one-landed.** Across the fabric–veil
  toolchain split (v4.28.0 vs v4.33.0). Un-bridgeable by house rule;
  belongs in the out-of-scope ledger, which is exactly where §1.2 puts
  it.
- **Resolution (`resolve`, `candidates`).** Two blockers: the kernel has
  no directory carrier, and fabric's `candidates` runs `.mergeSort`,
  which is opaque to kernel reduction — grep shows `mergeSort` at 14
  sites across fabric's Definitions, Proofs, and ControlProofs. Only
  `greatestSeal` (structural recursion, no sort) is affordable, which is
  why S9 stops there.
- **Policy meet / `spawn` attenuation.** The kernel's `World` has no
  writ carrier at all (KM bound 9: writs are per-connection facts, not
  world state). No carrier, no seam.
- **F2b successor discipline, journals, compaction.** The kernel has
  positions as a type index but no delivery buffer and no journal
  object.
- **F7 assembly / `ComposedExecution`.** F13-adjacent; fenced by B8.

---

## 4. Translations: where a wrong one lies, and what catches it

Four translation functions, each with a lie channel and a control.

### 4.1 Brand erasure and the invented holder

`Kernel.Digest kind` is a `Nat` under a type-level brand;
`Kernel.Value` is a `Nat` of bytes. Fabric's `Observation Holder Value`
is a *pair*, and its ground instance is `Nat × Nat`. The kernel has no
holder anywhere. So the contribution function must invent one:

```lean
def groundHolder : Nat := 1
def cellContribution (value : Kernel.Value) : Fabric.Emitter.GroundCell :=
  Fabric.Cell.singleton (groundHolder, value.bytes)
```

**Where it lies.** Two ways. (a) `fun _ => Fabric.Cell.empty` typechecks,
satisfies U2, and means the kernel's evidence semantics is the constant
map — every "the world grows" theorem becomes "the world stays put, and
staying put is a kind of growing." (b) A constant holder makes the
translation non-injective on observations: two different holders' views
of the same value collapse. Harmless for the inflation direction; fatal
if anyone later rides this translation into a cell-extensionality or
convergence claim, because it quotients the carrier.

**Controls.** (a) U3, rostered — a specific observation absent before
and present after. Plus a committed `.cex.txt` in the house drift-control
idiom, `vacuous-contribution`, running both contributions on one ground
emit and reading `verdict=refuted` because the lawful side grows and the
vacuous side does not. This is the exact mirror of the kernel's existing
`door-admits-lawful` control: that one refutes the door that refuses
everything; this one refutes the abstraction that abstracts everything.
(b) The holder collapse is documented in the ledger as a *stated
abstraction* (the `verify/AGENTS.md` rule: every abstraction that
diverges from the prose is STATED so it can be argued with), and B10's
allowlist plus the ban on any extensionality statement in
`Unity/Laws.lean` keeps it from being ridden.

### 4.2 Node-to-declaration, and the reflection requirement

```lean
def declOf (node : Kernel.ProgramNode) : Fabric.ActionDeclaration :=
  { work := node.name, pins := node.uses }
```

**Where it lies.** `pins := []` erases the entire pin relation. U4 still
holds (an empty-pins ledger admits trivially). U6 still holds
(well-foundedness of the empty relation is free). A "unity" package
consisting of U4 + U6 with this translation would be green, rostered,
footprint-clean — and would prove nothing whatsoever about the kernel's
program graphs. There is a second, subtler channel: `declOf` is not
injective on arbitrary node lists (two nodes with equal name and uses but
different generators collapse), and collapsing can *manufacture*
well-foundedness. Admission's freshness clause rules it out, but only on
admitted lists, so the injectivity lemma must be stated with the
admission hypothesis, not assumed.

**Controls.** U5 as a genuine `<->` (a forward-only statement is
satisfied by the erasing map). Plus a committed control
`erasing-node-translation`: a two-node admitted fixture where the lawful
`declOf` reflects the pin and the erasing variant does not, verdict
`refuted`. Plus a **separation witness** — a rostered theorem exhibiting
two distinct nodes with distinct images — which refutes the constant
translation in one line. Note the precedent: the fabric gate's mutant
discipline (T5) requires each mutant to drop exactly one law and share
the shipped carrier; these controls follow it.

### 4.3 Positioned facts to fenced-token records, and the tie inversion

```lean
def recordsAt (facts : List (Nat × Nat × Nat)) (hole : Nat) :
    List (Fabric.Seal Nat) :=
  (facts.filter (fun f => hole == f.2.1)).map
    (fun f => { token := f.1, holder := groundHolder, digest := f.2.2 })
```

**Where it lies — and this is the sharpest finding in the memo.** The
two models break ties in **opposite** directions, and I verified both
definitions by reading them.

- Fabric's `greatestSeal` recurses `arrival :: rest`, keeps `best` only
  when `arrival.token < best.token`; at a tie the test is false, so it
  keeps **`arrival` — the earlier element**. The docstring says so
  explicitly: *"at a token tie the earlier arrival is kept."*
- Kernel's `greatestAt` is a `foldr` whose accumulator is the *tail's*
  answer, replacing only when `prior.1 < fact.1`; at a tie it keeps
  **`prior` — the later element.**

Worked witness: facts `[(1, h, A), (1, h, B)]` — kernel answers `B`,
fabric answers `A`.

Under the uniqueness premise the two agree, and **every list
`positionedOf` produces has distinct positions**, so the divergence is
invisible at every natural fixture. That is the definition of a silent
lie: a general statement, false, that no example anyone would think to
write can refute. This is precisely the correspondence KM §11b promises
to inherit by citation ("the fabric's `f12_greatest_seal_wins` /
`greatest_seal_of_support` shape verbatim, cited as the instantiation
obligation") — so the citation is currently *sound but unstated as
premised*, and a bridge that transcribes the citation without the
premise would ship the falsehood.

**Controls.** U8 carries `PositionsUniqueAt` as an explicit named
premise. U9 is the load-bearing witness, rostered as a theorem — the
bridge proves its own premise cannot be dropped. Plus a committed
`.cex.txt`, `drop-position-uniqueness`, in the exact shape of the
kernel's existing `drop-provision-disjointness` trace: two arrival
orders, lawful side stable, mutant side visibly disagreeing. And a
must-not-compile control is *not* right here — this is a semantic
divergence, not a sort violation.

### 4.4 Trigger production translation

Total, match-exhaustive, in **both** directions, defined in the bridge.
Kernel→fabric drops the lane and wraps the single `Value` as a
one-element observation list at the invented holder; fabric→kernel must
invent a lane and collapse a list.

**Where it lies.** A catch-all `| _ =>` arm on either side kills the
canary: the whole point of writing both directions exhaustively is that
**adding a sixth production to either grammar becomes a compile error in
the bridge.** That is a stronger drift alarm than any grep, because it
fires on the semantics of the change rather than on its text.

**Controls.** U11 (the lane loss, proved). A must-not-compile control
containing a `KTriggerPredicate` match missing one arm, whose pinned
diagnosis is the non-exhaustiveness error, with the complete match as
its witness twin — so the canary itself is proved to be alive, in the
house's existing witness-twin idiom.

### 4.5 Universes as a translation constraint

Not a function, but it behaves like one. Since `Kernel.World` is
`Type` and fabric is universe-polymorphic, the bridge can only speak
about Type-0 fabric carriers. **Pin this as a fact, not a footnote:** a
must-not-compile control that attempts `Kernel.interp` at a `Type 1`
fabric cell, with the universe error as its pinned diagnosis and the
ground-carrier instantiation as its witness twin. Then the bound is
machine-checked, and a future universe generalisation of the kernel
shows up as a control that stopped failing — which the gate reports as a
failure, correctly.

### 4.6 The anti-weakening device the house already owns

The strongest guard against "same theorem name, weaker statement" is not
a digest — it is fabric's own T17 pattern: *"Emit verdict bits from the
bridge-theorem terms."* Fabric's emitter passes theorem **terms** into
the row constructors, so a weakened theorem stops typechecking at the
consumer. The bridge should do the same: a small `Unity/Emit.lean` whose
row constructors demand each seam theorem *as a term* at its full
strength, emitting a committed NDJSON conformance file regenerated
byte-identically by the gate. Drop a conjunct from U5 and the emitter
stops elaborating.

I would ship both this and B5b's digests: the emitter catches weakenings
in statements that have consumers; the digests catch weakenings in the
ones that do not yet.

---

## 5. Risks

**R1 · Vacuity — the bridge is green and says nothing.** The whole
family: instantiation at toy carriers (`Unit`, `Nat.max`, the kernel's
existing `ground_interp_inflationary` is literally this shape),
contributions that contribute nothing, translations that erase the
relation being transported, premises no fabric object satisfies, and
forward-only simulations that the constant map satisfies. Severity:
total — a vacuous bridge is worse than no bridge, because it launders
"cited" into "proved."
*Mitigations:* B10's positive carrier allowlist; U3, U5's `<->`, U9, the
separation witness, and the inhabitation witnesses, all rostered rather
than commented; the T5 precedent as the ruling to point at.
*Residual:* B10 checks that a real carrier is *mentioned*, not that it is
used non-trivially. A determined author can still write a true, empty
theorem that mentions `GroundCell`. Only review catches that — which is
why the memo's statement list is short enough to review.

**R2 · Gate coupling and trusted-surface widening — including one hole
the bridge itself opens.** Options B and C fail on this outright. Even
option A has real edges: the bridge's build pulls fabric's library into
its own compilation, so a fabric change can redden the bridge (correct,
but it must never be able to redden *fabric*); the bridge's footprint
sweep now spans two packages; and **B8's hole is live** — a package that
imports `Kernel.Laws` can prove `CandidateF13BoundExecutionReplay`
entirely outside the kernel gate's two-file grep, converting a ruled
posture into an unfenced one by accident. Also unverified: whether lake's
path-require copies or references (§2.1, detail 3).
*Mitigations:* A + narrow imports + B6/B7/B8/B9; CI step ordered after
both upstream gates so a bridge failure never masks an upstream one.
*Residual:* build time roughly triples for the bridge step.

**R3 · Drift between citation strings and rosters — already occurring.**
Verified today: 7 of 8 kernel law citations resolve into fabric's roster;
the eighth resolves only across the toolchain split. The KM notes'
headline counts are stale by two amendment waves within one file. Prose
obligations rot at the speed of prose.
*Mitigations:* B14's bidirectional citation check; the obligations ledger
as a gate-read file with explicit out-of-scope rows; U10/U11's exhaustive
translations as compile-time canaries on the closed inventories;
B13's record-don't-assert of upstream sizes.
*Residual:* the check reads a *convention* (parenthesised lowercase names
in docstrings). A citation written in a different shape is invisible to
it. Pinning the extraction count makes a convention change visible, which
is the best a text check can do.

Two more, below the top three but worth writing down. **R4 · The bridge
becomes a back door for un-ratified claims**: it is the natural place to
"just quickly" prove F13, or to restate a fabric-veil law in v4.33.0 and
call the split bridged — B8 covers the first, the ledger's out-of-scope
rows cover the second, and both need a reviewer who knows to look.
**R5 · Rollback pressure**: once VERIFICATION.md carries a bridge row,
deleting the package stops being a directory deletion and becomes a
claim retraction. Keep the bridge out of VERIFICATION.md until it is
grilled — the same posture the kernel notes take for themselves.

---

## 6. The one theorem I would prove first

**`unity_interp_inflationary_at_cell` (U2), shipped in the same commit
as its anti-vacuity twin `unity_evidence_strictly_grows` (U3).**

> For every kernel sentence `act` and every world whose evidence
> component is one of fabric's shipped ground cells — a finite set of
> holder-attributed observations under the emitter's comparator — the
> interpretation of `act` under fabric's own `Cell.merge`, contributing
> each value as a single observation, produces a world componentwise at
> or above the one it started from. The two hypotheses the kernel's
> abstract law demands, associativity and idempotence of the merge, are
> discharged by `Fabric.cell_merge_assoc` and `Fabric.cell_merge_idem`.
> And, separately: there is a ground emit whose interpretation puts an
> observation into the evidence set that was not there before.

Why this one de-risks everything else:

1. **It is the only seam where the bridge adds safety rather than
   re-checking agreement.** S5–S7 transport a theorem the kernel already
   proved independently; their value is anti-drift. S1 is different:
   `KInterpInflationary` is stated over hypotheses whose only
   demonstrated inhabitant inside the kernel package is `Nat.max` — the
   kernel's own `ground_interp_inflationary`, which is exactly the toy
   carrier my lens exists to refuse. Until U2, the kernel's headline
   semantic law has never been shown to hold at anything the estate
   actually stores.

2. **Proof cost is near zero; design cost is everything — and the design
   choices propagate.** Which fabric carrier, what to do about the
   missing holder, which contribution, and the Type-0 universe bound are
   all forced here and inherited by every later seam. Discovering them
   at S1 costs an afternoon; discovering them at S9 costs a rewrite of
   the translation layer.

3. **It is where vacuity is easiest, so the falsifier must exist here
   first.** U3 is the smallest possible test of whether the bridge can
   fail. If U3 cannot be stated — if the honest contribution turns out to
   be the empty cell because the kernel's `Value` carries nothing a cell
   can hold — then the merge seam is decorative and we learn it on day
   one instead of after eleven statements.

4. **It exercises the entire topology end to end at minimum content.**
   A package that requires both, a gate that builds both, a footprint
   sweep that must stay inside the three allowed axioms across a
   cross-package proof through `Std.ExtTreeSet`, and the open lake
   path-require question — all answered by the cheapest possible
   theorem, before anything expensive is attempted.

If U2 and U3 land green together with B7, B8, B9 and B10 in the gate,
the bridge has a spine that cannot be quietly hollowed out, and the
remaining ten statements are ordinary work.

---

### Appendix — a checklist a reviewer can run against any proposed bridge

1. Name a carrier from the allowlist in every law statement. *(B10)*
2. Show a growth or separation witness for every translation. *(U3, §4.2)*
3. State transports as `<->` wherever the `<->` is true, and prove the
   non-injectivity where it is not. *(U5, U11)*
4. Carry every premise you rely on as a named hypothesis, and prove it
   load-bearing. *(U8 + U9)*
5. Derive the transported theorem *without* the local one, and make a
   grep say so. *(B9)*
6. Put every obligation in a file a gate reads. Never in a paragraph.
   *(the ledger; the KM §1 stale-count finding)*
7. Refuse `CandidateF13` in the new package. *(B8)*
8. Assert upstream is still zero-dependency, from the bridge. *(B7)*
9. Make each closed inventory a total, exhaustive, two-way match, so a
   sixth constructor is a compile error. *(U10, U11, §4.4)*
10. Ask of every green theorem: what would have to be true for this to
    be false? If nothing, delete it.
