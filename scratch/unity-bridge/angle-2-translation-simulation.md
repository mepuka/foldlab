# Angle 2 — Translation and simulation: unity as commuting squares under explicit maps

Approach memo. No code was written or modified; the worktree
`C:\Users\kokok\Dev\foldlab-kernel-model` (branch `agent/kernel-model`
@ `d9a13b67f`) was read in place only. Lean theorem *statements* appear
below as they would appear in a bridge package; no proofs are offered.

**Who this is for.** An outsider should be able to read this without
the house dialect. Glosses, once, on first use:

- A **cell** is the fabric model's evidence container: a finite set of
  *holder-attributed observations* — pairs of (who vouched for it,
  what they said) — merged by set union, so duplicate and out-of-order
  delivery cannot change it.
- A **journal** is an append-only log of operations; a **positioned**
  journal stamps each operation with its venue-local position number,
  so a redelivery can be recognised by position rather than by content.
- A **directory** is a finite set of (petname, digest) bindings — human
  names pointing at content addresses — with a read that says which
  digest a name resolves to.
- A **digest** is a content address: the identity of an immutable value.
  A **branded** digest carries, in its *type*, which kind of declaration
  it names, so a schema digest cannot be passed where a program digest
  is expected.
- The **admission door** is the kernel model's single function `admit`,
  which takes a candidate sentence an agent could spell and either
  translates it into a lawful sentence or refuses it, attaching the law
  it defends and a repair the agent can apply.
- A **writ** is the set of referents a declaration is permitted to
  mention; an **anchor** is a resume coordinate (floor, state, head) for
  a fold; a **fold** is a declared reduction over a journal, read at an
  anchor.
- **F1…F12, C7** are the fabric package's law families, each a named
  `def … : Prop` in `Fabric/Laws.lean` with proofs in
  `Fabric/Proofs.lean`.

---

## 0. The lens, and the one ruling it forces

The commission asks how to prove that the kernel model is a *sound
abstraction* of the fabric model. My lens says: unity is a finite set
of **commuting squares under explicitly named maps**. Nothing is
"corresponding"; every claim is an equation or an implication with a
function in it, and if the function is wrong the equation must break.

Reading both packages, I found the seams split cleanly into **two
mechanisms that are not the same thing and must never share a name**:

1. **Erasure** — a total function from a kernel object to a fabric
   object, written `kernel → fabric`. Used where the kernel's sorts are
   *finer* than fabric's: branded digests → bare numerals, program nodes
   → action declarations, type-indexed positions → numerals. The bridge
   theorem is a *pullback*: the kernel's law follows from fabric's law
   along the erasure.
2. **Instantiation** — substituting a fabric type and fabric theorems
   into a hypothesis slot of a kernel statement. Used where the kernel
   is *more abstract* than fabric: the evidence carrier and its merge.
   The bridge theorem is an *application*: the kernel's universally
   quantified law, evaluated at fabric's real carrier.

**Ruling I commit to: every translation runs kernel → fabric, and no
fabric → kernel map is ever defined.** Three reasons.

- Erasure is a *function*; introduction is a *choice*. Fabric's
  `ActionDeclaration.work` is a bare `Nat`; turning one back into a
  branded `Kernel.Ref` requires picking a `DeclKind`, and nothing in
  fabric determines it. A "translation" that picks would be a modelling
  decision hidden inside a bridge.
- One direction makes composition well-defined and makes the gate's job
  a grep: any bridge definition whose result type is a `Kernel.*` type is
  a finding.
- The one place a fabric → kernel map looks necessary — putting
  `Fabric.Cell` into the kernel's abstract carrier slot — is not a
  translation at all. It is mechanism (2), and keeping the two words
  apart is what stops a reader from concluding the models are
  interchangeable.

**Where this loses, stated up front.** A kernel→fabric-only discipline
can only ever prove *soundness* (the kernel claims nothing fabric
denies). It structurally cannot prove *completeness* (the kernel loses
nothing), because at three seams the erasure is provably non-injective:
it drops the **holder** on every observation, drops the **lane** from
`evidenceAppears`, and drops the **partition** from `headAdvancedPast`.
If somebody later wants "the kernel is expressive enough", this memo's
approach will not deliver it — and I think that is correct, because the
two models were built at deliberately different strengths and an
isomorphism claim would be false. Better to discover that in a design
memo than in a stalled proof.

---

## 1. Unity, as a finite set of theorem statements

Unity = **eleven statements in four groups**, plus an explicit
non-claims list. Group A is hypothesis discharge (mechanism 2), Group B
is law pullback (mechanism 1), Group C is the one run-level square,
Group D is alignment hygiene. Statements are written in a `Bridge`
namespace against both packages' public names.

### Group D — alignment (cheapest, and load-bearing for everything else)

```lean
/-- The two packages independently declare the same five epistemic
    stages of a hole. This pins the alignment: a reorder of either
    inductive breaks the gate. -/
def BStageRankAgrees : Prop :=
  forall stage : Kernel.HoleStage, (stageOf stage).rank = stage.rank

def BStageBijective : Prop :=
  Function.Injective stageOf /\ Function.Surjective stageOf

/-- The two packages define the same derived join order. Stated so that
    no later bridge silently transports an order across a definitional
    difference. -/
def BSupLeAgrees : Prop :=
  forall {alpha : Type} (sup : alpha -> alpha -> alpha) (a b : alpha),
    Kernel.supLe sup a b <-> Fabric.supLe sup a b

/-- Brand erasure on references is injective. A collapsing erasure is
    the committed negative control; this is the theorem it violates. -/
def BWorkOfRefInjective : Prop :=
  Function.Injective workOfRef
```

### Group A — hypothesis discharge at fabric's real carrier

```lean
/-- The complete set of abstract hypotheses the kernel's semantics
    names, discharged at the fabric's ground evidence carrier: finite
    sets of holder-attributed observations under the emitter's own
    comparator. -/
def BEvidenceHypothesesDischarged : Prop :=
  (forall a b c : GroundCell,
      Fabric.Cell.merge (Fabric.Cell.merge a b) c =
        Fabric.Cell.merge a (Fabric.Cell.merge b c)) /\
  (forall a : GroundCell, Fabric.Cell.merge a a = a)

/-- The kernel's headline semantic law, at fabric's real carrier and at
    an arbitrary attribution: no kernel sentence's meaning shrinks a
    world whose evidence component is a fabric cell. -/
def BInterpInflationaryAtCell : Prop :=
  forall (holder : Nat) (act : Kernel.Act) (world : Kernel.World GroundCell),
    Kernel.World.Le Fabric.Cell.merge world
      (Kernel.interp Fabric.Cell.merge (contributionAt holder) act world)
```

A hard, verified bound on this group, which I think is the single most
important honest finding in this memo: **the kernel names exactly two
dischargeable hypotheses.** `KInterpInflationary` demands associativity
and idempotence of the evidence merge, and that is the entire list.
Everything else the kernel calls an "instantiation obligation" is either
trusted base (hashing, canonical byte form), walled behind the
fabric–veil toolchain split (the landed-set dedup), or prose citation in
the refusal table. So the commission's clause "*every abstract
hypothesis the kernel names is discharged by a fabric theorem*" is,
literally, two hypotheses at one law. Unity cannot rest on this group.
It has to rest on Group B.

### Group B — law pullback along erasure (the substance)

```lean
/-- Translation preserves admission: an admitted kernel program becomes
    an admitted fabric ledger. Fabric's freshness clause is what forces
    the translation to be injective on names — a name-collapsing
    translation cannot discharge this. -/
def BAdmissionPreserved : Prop :=
  forall nodes : List Kernel.ProgramNode,
    Kernel.ProgramAdmission nodes ->
      Fabric.Admission (nodes.map declarationOfNode)

/-- Translation preserves consumption: a kernel node's use of a prior
    node is exactly the fabric ledger's pin. -/
def BPinsPreserved : Prop :=
  forall (nodes : List Kernel.ProgramNode) (parent child : Kernel.ProgramNode),
    Kernel.NodePins nodes parent child ->
      Fabric.PinsWithin (nodes.map declarationOfNode)
        (declarationOfNode parent) (declarationOfNode child)

/-- Unity at the dependency-graph seam, stated as an implication between
    the two packages' own law statements: fabric's action pin order
    being well-founded IS the kernel's program pin order being
    well-founded. Not a second proof of the same shape — the same
    theorem, pulled back along one map. -/
def BKernelPinLawFromFabric : Prop :=
  Fabric.Laws.C7PinWellFounded -> Kernel.Laws.KProgramPinWellFounded

/-- Greatest-wins reads agree, with NO uniqueness premise: the kernel's
    greatest-position read at a hole is the fabric's greatest-token
    arbitration over the translated, reversed history. Premise-freedom
    is deliberate and is argued in section 4. -/
def BGreatestAgrees : Prop :=
  forall (facts : List (Nat × Nat × Nat)) (hole holder : Nat),
    (Kernel.greatestAt facts hole).map (fun best => best.2) =
      (Fabric.greatestSeal (historyOfFactsAt holder hole facts)).map
        (fun landed => landed.digest)

/-- Attribution is not an arbitration input, proved rather than
    assumed: the read is the same at every holder, which is what makes
    the invented attribution in the translation harmless. -/
def BArbitrationIsHolderBlind : Prop :=
  forall (left right hole : Nat) (facts : List (Nat × Nat × Nat)),
    (Fabric.greatestSeal (historyOfFactsAt left hole facts)).map
        (fun landed => landed.digest) =
      (Fabric.greatestSeal (historyOfFactsAt right hole facts)).map
        (fun landed => landed.digest)

/-- The provision environment, read through fabric's arbitration: the
    value a provision chain binds at a hole is the digest fabric's
    greatest-token rule selects from the chain's positioned facts.
    Composed with the kernel's own `provision_newest_wins`, this says
    the fabric rule selects the chain's NEWEST event — the orientation
    fact, carried across rather than assumed. -/
def BProvisionIsFabricArbitration : Prop :=
  forall (events : List (Nat × Nat)) (hole holder : Nat),
    Kernel.provisionFold events hole =
      (Fabric.greatestSeal
        (historyOfFactsAt holder hole (Kernel.positionedOf events))).map
          (fun landed => landed.digest)
```

### Group C — the one run-level square

```lean
/-- The single run-level simulation this slice claims: a run of kernel
    `emit` sentences over a body list reaches the evidence that
    fabric's own evidence fold reaches over the translated observation
    list. The right-hand side is an EXISTING fabric function; no fabric
    transition system is invented here. -/
def BEmitRunIsEvidenceFold : Prop :=
  forall (holder : Nat) (lane : Kernel.Digest Kernel.DeclKind.lane)
      (bodies : List Kernel.Value) (world : Kernel.World GroundCell),
    (bodies.foldl (fun current body =>
        Kernel.interp Fabric.Cell.merge (contributionAt holder)
          (.emit lane body) current) world).evidence =
      Fabric.Cell.merge world.evidence
        (Fabric.foldEvidence Fabric.Emitter.observationCmp
          (bodies.map (fun body => (holder, body.bytes))))

/-- The payoff: fabric's F2 lands on kernel emit runs. Delivery order
    and multiplicity cannot move a kernel emit run's evidence. The
    kernel never stated this and cannot state it alone — it has no
    notion of delivered support. It inherits it here. -/
def BEmitRunTraceInvariant : Prop :=
  forall (holder : Nat) (lane : Kernel.Digest Kernel.DeclKind.lane)
      (left right : List Kernel.Value) (world : Kernel.World GroundCell),
    Fabric.SameDeliveredSet
        (left.map (fun body => (holder, body.bytes)))
        (right.map (fun body => (holder, body.bytes))) ->
      (left.foldl (fun current body =>
          Kernel.interp Fabric.Cell.merge (contributionAt holder)
            (.emit lane body) current) world).evidence =
        (right.foldl (fun current body =>
          Kernel.interp Fabric.Cell.merge (contributionAt holder)
            (.emit lane body) current) world).evidence
```

`BEmitRunTraceInvariant` is the statement I would put in front of a
sceptic. It is the one place the bridge *adds* a fact rather than
reconciling two existing ones, and it is symmetric: the kernel gains a
law it cannot express, and fabric's F2 gains a consumer at a second
model's carrier.

### What is deliberately NOT claimed

1. **No runtime claims.** Nothing about the TypeScript projection, the
   certifier, the wire format, or any executing system. Both sides are
   models; the bridge relates models.
2. **No liveness.** Nothing about grant/renew, eventual delivery, hint
   firing, or scheduling. Fabric's F2b premise halves (`WindowCoverage`,
   `PositionPayloadIntegrity`) are explicitly runtime premises; a bridge
   inherits them as premises and never discharges them.
3. **No F13.** No bound-execution replay, no `ComposedExecution`, no
   kernel program-DAG stepped against a fabric journal. Section 6 of
   this memo defends the boundary and section 2 makes it mechanical.
4. **No isomorphism, and no completeness.** Erasure only. The maps are
   provably non-injective at holder, lane, and partition.
5. **Nothing crosses the fabric–veil toolchain split.** The kernel cites
   `at_most_one_landed_commit`, which resolves only in
   `verify/fabric-veil` — pinned at Lean **v4.28.0** against
   fabric/kernel's **v4.33.0**. It is cited, never imported. Consequence
   stated as a non-claim: the at-most-one-landed content is *not*
   transported, and the landed-set square (below) is deliberately
   insensitive to the kernel's dedup branch, because set insertion is
   idempotent either way.
6. **No claim about the byte canonicalizer, hashing, or preimage
   resistance.** Trusted base on both sides.
7. **No claim about admission refusals.** Fabric has no door; the
   kernel's `admission_refuses_unlawful` and the `Unlawful` predicate's
   coverage of the closure list are untouched by any bridge theorem.
8. **No attribution claim.** The holder is a translation *parameter*;
   the bridge proves the fabric arbitration is holder-blind, never that
   a kernel emit determines a holder.

---

## 2. Package topology, and what the bridge's own gate checks

**Chosen: a third, separately gated package `verify/bridge`, requiring
both models by path, containing every bridge proof and zero changes to
either model.**

The constraint is mechanical, not stylistic. Both gates assert a
zero-dependency manifest:

```
grep -Eq '"packages"[[:space:]]*:[[:space:]]*\[\]' lake-manifest.json
```

appears in `verify/kernel/run.sh:26` and `verify/fabric/run.sh:34`.
Adding a `require` to either package fails that package's own gate
before a single proof is attempted. So the alternatives price
themselves:

| Topology | Verdict | Why |
| --- | --- | --- |
| Bridge inside fabric (fabric requires kernel) | refused | breaks fabric's `"packages": []` pin — gate fails |
| Bridge inside kernel (kernel requires fabric) | refused | same pin failure; also exactly KM-3's refused alternative; also drags `Std.ExtTreeSet` into a package that today imports nothing |
| Restate fabric's definitions inside kernel, prove against the restatement | refused | a restatement is drift risk, not evidence — the estate already ruled this way for the veil citation (fabric `Definitions.lean:748`) |
| Third package `verify/bridge` | **chosen** | neither model changes; both gates keep passing untouched; reversal is `rm -rf` |
| Status quo (a documentation table of citations) | refused | it is what exists, and it proves nothing |

The third package honours KM-3's *letter* (the kernel imports nothing
from fabric) and its *spirit* (either model still builds and gates
alone), while buying real discharge, because the coupling lives in a
third place that can be deleted without touching either model. That
reversal cost — one directory — is the cheapest available under the
"un-grilled machinery must be rollbackable" rule.

**Honest cost of the choice.** This would be a *new* topology for
`verify/`. I checked: no local cross-package `require` exists anywhere
under `verify/` today; the only `require` in the tree is
`verify/fabric-veil/lakefile.lean:9`, which pulls `veil` from git. So
the bridge is inventing a pattern, and it adds a third gate to keep
green. It also creates a warm-build coupling: building the bridge
builds both dependencies' artifacts into their own `.lake/` trees
(both `.gitignore`d, so no source is touched, but a stale warm build in
one model can now be invalidated by work in a third place).

### What the bridge gate checks

1. **Toolchain identity.** All three `lean-toolchain` files read
   `leanprover/lean4:v4.33.0`. Fail if kernel and fabric ever diverge —
   the bridge is the only thing that would notice.
2. **Upstream immutability.** Record and compare a digest of each
   upstream source tree, so a bridge proof can never be quietly proved
   against a modified model. This is the `verify/AGENTS.md` rule
   "run records pin by RECORDING, not by asserting", applied to the two
   things the bridge is about.
3. **Citation reconciliation — the check that closes KM bound 12.**
   Extract every snake-case token from the kernel's taught-refusal table
   and require each to resolve to a name on fabric's roster, except an
   explicitly enumerated walled set. Today the walled set has exactly
   one member. (Verified state below; this check passes today and would
   have caught a rename.)
4. **Roster and footprint.** An enumerated roster of every bridge
   theorem, diffed against discovery, plus `#print axioms` over each,
   allowing only `propext`, `Classical.choice`, `Quot.sound` — the same
   three both models allow.
5. **Source hygiene, at the union of both packages' word lists.** The
   kernel's list is strictly larger: it also forbids the bare tokens
   `seal` and `partial`. Practical consequence for a bridge whose whole
   right-hand side is fabric's fencing machinery: bridge docstrings must
   say "fencing token record" and "landed fenced decision", never the
   bare word. (`Seal`, `greatestSeal`, `sealedAt`, `SealsWellFenced` all
   pass — the pattern is anchored on non-alphanumeric boundaries and is
   case-sensitive.)
6. **Translation controls.** Every committed `*.cex.txt` refuted, and
   the committed set exactly equal to the exercised set — the orphan
   check both models already run.
7. **The F13 fence, extended.** The kernel gate today fences F13 by
   `grep -n 'CandidateF13' Kernel/Proofs.lean ControlMain.lean`
   (`verify/kernel/run.sh:78`). That fence is name-based and confined to
   two files, so **it does not reach a third package.** The bridge gate
   must extend it: refuse any bridge source mentioning `CandidateF13` or
   `ComposedExecution`, and refuse any bridge definition whose type is a
   transition relation over `Kernel.Act` (the shape a step-level
   simulation must introduce). Without this, the bridge is the obvious
   place F13 grows a floor without a ruling.
8. **Anti-vacuity carrier pin.** Refuse any bridge statement mentioning
   `Nat.max` or `Kernel.ground_*` — the kernel's in-package demonstration
   carrier. Every instantiation must land at
   `Fabric.Cell Nat Nat Fabric.Emitter.observationCmp`, the carrier
   fabric's own emitter exercises.
9. **Partition.** Definitions (translations) / Laws (bridge statements,
   no `:= by`) / Proofs (no definitions), with an enumerated expected law
   list — the T31 precedent from fabric's DECISIONS.

Note the direction of dependency for the gates themselves: the bridge
gate consumes both models, but **neither model's gate may ever consume
the bridge's.** If the bridge goes red, two green models stay green.
That is the whole point of the third package.

---

## 3. Seam inventory, ordered by cost

Cost is my estimate of proof effort at Lean 4.33 given what already
exists; "value" is what the estate gains that it does not have today.

| # | Kernel abstraction | Fabric instance | Bridge statement | Cost | Value |
| --- | --- | --- | --- | --- | --- |
| S1 | `Kernel.HoleStage` (5 ctors, own `rank`) | `Fabric.HoleStage` (5 ctors, identical `rank`) | `BStageRankAgrees`, `BStageBijective` | trivial (`cases <;> rfl`) | pins two independently-declared enums; a reorder in either breaks the gate |
| S2 | `Kernel.supLe` | `Fabric.supLe` (textually identical definition) | `BSupLeAgrees` (`Iff.rfl`) | trivial | prerequisite for transporting any order statement |
| S3 | `interp`'s abstract `merge` + `assoc`/`idem` hypotheses | `Cell.merge` at `Cell Nat Nat observationCmp`; `cell_merge_assoc`, `cell_merge_idem` | `BEvidenceHypothesesDischarged`, `BInterpInflationaryAtCell` | low — instances already registered (`emitter_observation_cmp_lawful_eq/_beq` are `attribute [instance]`) | the kernel's headline law stops being demonstrated at a numeral and holds at holder-attributed observation sets |
| S4 | `ProgramAdmission` / `NodePins` / `nodeRank` | `Admission` / `PinsWithin` / `admissionRank` | `BAdmissionPreserved`, `BPinsPreserved`, `BKernelPinLawFromFabric` | moderate — two structural inductions mirroring proofs that already exist on both sides | the kernel's DAG law becomes an *instance* of C7, not a transliteration of it |
| S5 | `greatestAt` over positioned provision facts | `greatestSeal` over an observed fencing history | `BGreatestAgrees`, `BArbitrationIsHolderBlind`, `BProvisionIsFabricArbitration` | moderate-high — `foldr` against structural recursion, plus a filter lemma and a reversal lemma | the "greatest-wins reads" half of the unity claim, and the only theorem that pins list orientation |
| S6 | `interp` over an `emit` run | `foldEvidence` | `BEmitRunIsEvidenceFold`, `BEmitRunTraceInvariant` | moderate — needs `ofList` / union interplay (fabric already uses `Std.ExtTreeSet.mem_ofList`) | the kernel *gains* F2 |
| S7 | `World.landed : List Nat` with an explicit dedup branch | `FiniteSet Nat compare` | `ofList (interp .decide …).landed compare = (ofList world.landed compare).insert register.id` | low | modest, and honestly weak: the statement holds whether or not the kernel dedups, because insertion is idempotent. Ship it labelled as such |
| S8 | `interp`'s `.declare` catalog prepend | `Admission` step | a *guarded* square with a freshness side condition | low-moderate | surfaces a finding (below) rather than a law |
| S9 | `KTriggerPredicate` (5 productions) | `TriggerPredicate` (5 productions) + `holds` | none, this slice | high — **the kernel has no denotation for `KTriggerPredicate`**; a bridge would have to add one, i.e. new machinery in a gated model | deferred |
| S10 | `Valuation = Nat -> Option Nat` | `Directory` + `resolve` (4 verdicts) | none, this slice | high, contested — fabric's `ambiguous` verdict has no kernel counterpart | deferred |
| S11 | `AnchorFact` (floor, state, head) | F3 `f3_resume_exact`, F2b `f2b_guarded_exactly_once` | **none, and none possible** | — | see the hole in section 6 |

Two findings fall out of the inventory rather than out of any theorem,
and both belong in front of the operator:

- **S8: the kernel's interpretation of `declare` is weaker than the
  kernel's own door.** `admit` checks `refMember` against the catalog;
  `interp` prepends `(kind, value.bytes)` to `world.catalog`
  unconditionally, so it can build a catalog with a duplicate entry that
  fabric's `Admission` refuses. This is the "two doors, not yet one" gap
  (kernel notes bound 2, KM-4) reappearing at the *semantics* layer,
  where the notes do not name it. The bridge's honest move is to state
  the freshness side condition explicitly and commit the duplicate-declare
  control that makes it load-bearing.
- **S11 is a genuine hole in "unity".** Fabric has three great proof
  shapes: the admission-rank embedding (C7), greatest-wins arbitration
  (F12), and *anchored resumption* (F3/F2b). The bridge can reach the
  first two. It cannot reach the third, because the kernel carries
  `AnchorFact` as inert data — `interp` sends `.fold` to the identity
  (kernel notes bound 11, "reads return no value"). So a bridge that
  claims "the kernel's inherited proof shapes are instances of fabric's"
  is claiming it for two of three. Say two of three.

---

## 4. The translations, where a wrong one lies, and the control that catches it

Six translations are needed. For each: the direction I pick and why, the
silent-lie mode, and the negative control. All controls follow the house
shape already in both packages — an executable printing
`control=…;…;verdict=refuted`, byte-compared against a committed
`*.cex.txt`. The **drift-control** shape from
`verify/kernel/ControlMain.lean` fits exactly: refuted when the lawful
translation agrees across two rows *and* the mutant translation
disagrees.

### T1 · Brand erasure on references

```lean
def workOfRef (ref : Kernel.Ref) : Nat := ref.2 * 12 + ref.1.rank
```

**Direction: kernel → fabric, injective.** The alternative — the obvious
`(kind, id) ↦ id` — collapses `(schema, 8)` and `(program, 8)` onto one
work digest. `DeclKind` has exactly 12 constructors with ranks 0…11
(verified), so multiplying the identifier by 12 and adding the rank is
injective and the proof is `omega` after a 12-case `rank < 12`.

**Where the wrong one lies.** It does not, quite — and that is worth
saying, because it is the good case. Under the collapsing erasure,
`BAdmissionPreserved` becomes unprovable: fabric's `Admission.admit`
carries a `fresh` clause requiring every prior work digest to differ
from the new one, and two distinct kernel refs erasing to one number
violate it. **Fabric's freshness clause is a built-in anti-collapse
guard on any translation into a ledger.** That is the strongest
structural property I found in either model for bridge purposes, and it
is worth designing the rest of the bridge to route through admission
wherever possible.

**Control `translation-collapses-brands`.** Row: catalog
`[(schema, 8), (program, 8)]`. Lawful erasure yields works `96` and `97`
— an admission-shaped ledger. Mutant erasure yields `8` and `8` — not
admission-shaped. Refuted when lawful admits and mutant does not.

### T2 · Brand erasure on program nodes

```lean
def declarationOfNode (node : Kernel.ProgramNode) : Fabric.ActionDeclaration :=
  { work := node.name, pins := node.uses }
```

**Direction: kernel → fabric.** Three wrong variants and their fates,
all caught by the elaborator rather than silently:
`pins := []` (drops consumption) breaks `BPinsPreserved`;
`work := 0` (collapses names) breaks `BAdmissionPreserved` at freshness;
`pins := node.uses ++ [node.name]` (adds a self-pin) breaks
`BAdmissionPreserved` at `pinsAdmitted`.

**The remaining vacuity channel is inhabitation, not correctness.** The
statements are universally quantified over admitted programs; if the
only admitted program were `[]`, they would be near-empty. So the
control is a *non-degeneracy witness*, not a refutation.

**Control `pin-inhabitation`.** A two-node admitted kernel program with
a real use, whose translation is a real admitted fabric ledger with a
real pin; the mutant side is the name-collapsing translation, whose
ledger is not admission-shaped. Refuted when the lawful side is
inhabited on both halves and the mutant side fails.

### T3 · Attribution introduction — the holder hole

```lean
def contributionAt (holder : Nat) (value : Kernel.Value) : GroundCell :=
  Fabric.Cell.singleton (holder, value.bytes)
```

**Direction: kernel → fabric, parameterised, never constant.** A fabric
observation is a `(Holder, Value)` pair; a kernel `Value` is
`{ bytes : Nat }` and carries no holder — this is kernel notes bound 8,
which says outright that "the F2 correspondence is to the value half
only".

**Where a wrong translation silently lies, and this one is the nastiest
in the inventory.** Fix the holder to a constant, say `0`. Every Group A
theorem still passes — inflation, associativity and idempotence are all
holder-agnostic. What has actually been proved is inflation on the
sub-lattice of *single-holder* cells, and nothing warns you. A reader
then concludes that the kernel's `emit` has been reconciled with
fabric's attributed evidence, which is false: it has been reconciled
with a slice of it.

**Two mitigations, both required.** (a) The holder is a parameter of
every statement that touches evidence, so no theorem can be discharged
by a choice made inside the bridge. (b) A control proving the parameter
is load-bearing.

**Control `attribution-blind-emit`.** One kernel body, two holders. The
kernel act is literally identical; the fabric cells
`contributionAt 1 v` and `contributionAt 2 v` are distinct. Refuted when
the kernel side is equal and the fabric side is not — a *declared
blindness* control that makes "the kernel under-determines the fabric
state" a committed, machine-checked fact rather than a footnote.

### T4 · List orientation — which end is newest

This is where the two models genuinely diverge, and I verified it by
reducing both definitions by hand.

- **Kernel: head = newest, everywhere.** `provisionFold (e :: rest)`
  applies the head's override *last*, so the head shadows
  (`Definitions.lean:1053`). `positionedOf (e :: rest)` gives the head
  position `rest.length + 1`, the *largest* (`:1078`).
  `ProgramAdmission (node :: nodes)` admits the head *last* and
  `nodeRank` gives it the largest rank (`:963`, `:981`).
- **Fabric: head = oldest, in the fencing history.** `greatestSeal`
  consumes an observed *arrival* list whose head is the earliest
  arrival; DECISIONS T27 states the tie rule as "at a token tie the
  earlier arrival is kept".
- **Fabric: head = newest, in the ledger.** `Admission (declaration ::
  ledger)` and `admissionRank` match the kernel exactly. So the
  orientation flip is *seam-local*, not global — which is precisely why
  it is easy to miss.

Reducing both functions:

- `Kernel.greatestAt` folds right and, on a tie, keeps `prior` (the
  tail's result). It returns the **last** maximum in list order.
- `Fabric.greatestSeal` recurses structurally and, on a tie, returns
  `arrival` (the head). It returns the **first** maximum in list order.

So the translation must reverse:

```lean
def landedOfFactAt (holder : Nat) (fact : Nat × Nat × Nat) : Fabric.Seal Nat :=
  { token := fact.1, holder := holder, digest := fact.2.2 }

def historyOfFactsAt (holder hole : Nat) (facts : List (Nat × Nat × Nat)) :
    List (Fabric.Seal Nat) :=
  ((facts.filter (fun fact => hole == fact.2.1)).map (landedOfFactAt holder)).reverse
```

because *first maximum of the reverse = last maximum of the original*,
which makes `BGreatestAgrees` hold **unconditionally**.

**Where the wrong translation silently lies — the answer to the
commission's exact question.** Suppose the bridge author states
`BGreatestAgrees` *with* a uniqueness premise (positions distinct, the
mirror of fabric's `SealsWellFenced`). Then **both** the reversing and
the non-reversing translation satisfy it, because away from ties the
greatest is the greatest regardless of orientation, and fabric's
`greatest_seal_of_support` proves the fabric side is a function of the
delivered support alone. The bridge passes, is true, and says *nothing
whatever about which end is newest*. Every later reader takes the
orientation as carried. It is not. That is the vacuity trap in this
seam, and it is invisible.

**Ruling: state the greatest-wins bridge premise-free.** The tie
behaviour is the *only* observable that distinguishes the two
orientations, and it distinguishes them exactly — so removing the
premise is what converts an orientation-blind statement into an
orientation-pinning one. This also follows an existing fabric decision
rather than inventing a posture: DECISIONS T30 ruled
`f12_resolution_characterization` premise-free on the grounds that
"fewer premises where premises add nothing is the stronger and more
honest form; the premise stays exactly where its drop is refutable."

**Control `history-orientation-flip`.** Facts `[(1, h, 10), (1, h, 20)]`
— a deliberate position tie, legitimate exactly because the theorem is
premise-free. Kernel `greatestAt` yields value **20**. Lawful
(reversing) translation yields digest **20**. Mutant (non-reversing)
yields digest **10**. Refuted when lawful matches the kernel and mutant
does not.

### T5 · Position assignment — the orientation control at the data level

Control T4 catches a flip *inside the translation*. It cannot catch a
flip in how positions are assigned in the first place, because at that
point the orientation has already become data and fabric's arbitration
is order-free over data.

**Control `position-orientation-ascending`.** Events `[(h, 10), (h, 20)]`.
Kernel `provisionFold` yields **10** (head shadows). Lawful
`positionedOf` gives `[(2, h, 10), (1, h, 20)]`, whose greatest position
selects **10**. Mutant ascending positioner gives
`[(1, h, 10), (2, h, 20)]`, selecting **20**. Refuted on the
disagreement. This is the control that actually pins "which end of a
journal is newest", and it must exist *in addition* to T4.

### T6 · World translation — the two components the kernel does not model

```lean
def stateOfWorld (cells : Nat -> GroundCell) (holes : Nat -> Fabric.HoleStage)
    (world : Kernel.World GroundCell) :
    Fabric.FabricState Nat Nat Fabric.Emitter.observationCmp :=
  { evidence := world.evidence
    cells := cells
    holes := holes
    landed := Std.ExtTreeSet.ofList world.landed compare
    head := world.head }
```

Fabric's `FabricState.Le` has **five** clauses (evidence, per-cell,
hole stages, landed, head); the kernel's `World.Le` has **four**
(evidence, catalog, landed, head) and has no hole component at all.

**Where a wrong translation lies.** Supply `cells := fun _ => Cell.empty`
and `holes := fun _ => .opened` and two of fabric's five growth clauses
hold by reflexivity. A `World.Le → FabricState.Le` theorem then reports
agreement on five clauses having tested three. Parameterising (as above)
does not fully fix this — with the *same* family on both sides, the
per-cell and hole clauses still hold reflexively — but it does make the
weakness visible in the statement's own signature, and it forbids the
bridge from choosing.

**Ruling: do not state a `World.Le → FabricState.Le` theorem at all in
this slice.** It is two-fifths decoration. State the *component*
statements instead (`BInterpInflationaryAtCell` for evidence, S7 for
landed), where every clause is load-bearing. Record the omission as a
declared non-claim, with the reason: the kernel conflates evidence and
all per-cell carriers into one (kernel notes bound 4) and has no hole
component, so two of fabric's five components have no kernel side to
test against.

---

## 5. Risks

### R1 · Vacuity — instantiating at toy carriers

Three distinct channels, only one of which is the obvious one.

- **The obvious one.** The kernel already ships
  `ground_interp_inflationary` at `Nat.max` over `World Nat`. A bridge
  that instantiates anywhere but `Fabric.Cell Nat Nat
  Emitter.observationCmp` has proved nothing new. *Detector:* gate check
  8 above — refuse `Nat.max` and `Kernel.ground_*` in any bridge
  statement.
- **The subtle one.** Instantiating at the *real* carrier but with a
  constant holder proves inflation only on the single-holder
  sub-lattice, and passes silently (see T3). *Detector:* holder as a
  parameter plus the `attribution-blind-emit` control.
- **The invisible one.** Supplying fabric's unmodelled components as
  constants so their growth clauses hold reflexively (see T6).
  *Detector:* do not state the composite order theorem.

Underneath all three sits a bound worth restating plainly: **the kernel
names two dischargeable hypotheses.** A bridge whose value proposition
is "the abstract hypotheses are discharged" is a bridge whose value
proposition is two `Cell.merge` lemmas the fabric already proves. The
value is in Group B, and Group B is where the effort should go.

### R2 · Gate coupling

- The bridge gate consumes both models; **neither model's gate may
  consume the bridge's.** If that inverts, one red bridge takes two
  green models down, and the estate's "independently gated" property is
  gone.
- Warm-build coupling is real: building the bridge builds both
  dependencies' `.lake/` artifacts. Both are `.gitignore`d, so no source
  moves, but a stale artifact is now a cross-package failure mode.
- The bridge is a *new* topology for `verify/` (no local cross-package
  `require` exists today). Pattern-invention cost is real and should be
  paid deliberately, not discovered.
- **The F13 fence does not currently reach a third package.** The
  kernel's fence is a grep for `CandidateF13` over two named files. A
  bridge is precisely where a step-level simulation would be built, and
  it would never mention that name. Gate check 7 above is not
  optional — without it the bridge is a hole in a standing ruling.

### R3 · Drift between citation strings and rosters

**Verified state today, and it is better than the notes imply.** The
kernel's taught-refusal table cites eight snake-case theorem names.
Seven resolve to real fabric roster entries — `f1_cell_merge_aci`,
`f10_stability`, `f11_query_deterministic`, `f11_topk_of_support`,
`c7_pin_well_founded`, `cell_absorb_inflationary`,
`compact_below_floor_preserves_resumption`. The eighth,
`at_most_one_landed_commit`, resolves only in `verify/fabric-veil` at
Lean v4.28.0. So there is **zero fabric-name drift right now, and
exactly one walled citation** — which makes gate check 3 cheap to build
and cheap to keep green.

**But the record around the code has already drifted, and I can show
it.** `docs/research/2026-08-18-kernel-model-notes.md` §1 states 50
theorems, 8 law statements, and 17 door controls. The gate today
enumerates **60** theorems, **12** law statements, and **18** door
controls; §11b of the same file already says 57 and 18, so §1 is stale
by two revisions of its own document. Separately, §4 counts "eighteen
constructors" of the `Unlawful` predicate while §9 bound 1 says
"seventeen shapes"; the code has 18. None of this is load-bearing
today, but it is the exact failure mode a bridge would inherit and
amplify: a bridge that cites a count is citing a moving target. **Every
bridge statement should cite a *name*, never a count**, and the gate
should reconcile names mechanically.

---

## 6. Step-level simulation: in or out, and the defence

**Position: out of this slice, with a boundary drawn at "who invents the
semantics", not at "how many acts".**

- **In scope:** hypothesis discharge; law-to-law implications along
  erasures; and run-level squares whose right-hand side is an
  **existing** fabric function over an **existing** fabric carrier.
  Today that last class has exactly one member: `foldEvidence` for emit
  runs (S6).
- **Out of scope:** a kernel program-DAG stepped against a fabric
  journal — assembly, resumption, landing.

I chose the boundary this way rather than the tempting "single act in,
multi-act out" line, because `BEmitRunIsEvidenceFold` folds a whole list
of acts and is clearly a simulation. Arity is not the issue. The issue
is whether the fabric side of the square already exists or has to be
written by the bridge author, because **a simulation between two
functions you wrote yourself always commutes.**

Four reasons the out-of-scope half stays out.

1. **There is no right-hand side.** Fabric's dynamics are
   `foldEvidence`, `fold`/`foldFrom`, `guardedApply`, `assemble`,
   `resolve`, and `enabledDeclarations`. Not one of them takes an act.
   A step-level simulation requires a fabric-side act transition system
   that does not exist. Building it inside fabric is blast radius in a
   green-gated model; building it inside the bridge means the bridge
   proves the kernel against the bridge's own invention — a
   restatement, which the estate has already ruled is "drift risk, not
   evidence" (fabric `Definitions.lean:748`).
2. **It is candidate F13's floor.** The kernel's `ComposedExecution`
   names exactly the three hops — assemble, resume, land — that a
   step-level simulation must supply, and
   `CandidateF13BoundExecutionReplay` is stated-only by ruling, with the
   gate mechanically refusing a proof or consumer. Supplying those hops
   concretely *is* the composition the ruling reserves. This is not my
   preference; it is an existing fence, and section 2 makes it reach.
3. **Three declared bounds make most of the square unstatable anyway.**
   Kernel bound 11: reads return no value, so `resolve` and `fold`
   interpret as the identity and the resumption hop has no kernel side.
   Bound 5: `trigger` and `spawn` interpret as the identity. Bound 4:
   one carrier stands for evidence and every per-cell carrier, so
   `join` at two distinct cells is indistinguishable. A full eight-generator
   simulation would, on five generators, be a square between an identity
   and a fabric operation — vacuous where it is not false.
4. **Blast radius.** The in-scope classes need zero new definitions in
   either model. The out-of-scope class needs a transition system, a
   journal-to-act decoder, and an anchor semantics, and every one of
   them is a new modelling decision made in a place with no consumer to
   discipline it.

**Where this position loses, honestly.** It concedes S11: anchored
resumption — F3, F2b, the compaction corollary, arguably fabric's most
valuable proof family for an operator — is not reachable by any bridge
theorem in this slice, because the kernel's `AnchorFact` is inert data.
So "the kernel's inherited proof shapes are instances of fabric's" holds
for two of fabric's three great shapes and not the third, and the memo
should say two of three rather than let the phrase pass. The repair is
not a bigger bridge; it is a change in the *kernel* (make `fold` return
state, or rule F13), and that is a different commission.

---

## 7. The one theorem I would prove first

> **`BKernelPinLawFromFabric`** — *Fabric's law implies the kernel's:*
>
> ```lean
> def BKernelPinLawFromFabric : Prop :=
>   Fabric.Laws.C7PinWellFounded -> Kernel.Laws.KProgramPinWellFounded
> ```
>
> discharged by applying it to `Fabric.c7_pin_well_founded`, and proved
> through the two preservation lemmas `BAdmissionPreserved` and
> `BPinsPreserved` along
> `declarationOfNode node = { work := node.name, pins := node.uses }`.

**Why this one de-risks the rest.**

- **It is the archetype.** Define a map, prove structure preservation,
  pull the law back. Every other Group B statement has this shape. If
  the idiom works once — across two packages, two namespaces, a
  `Subrelation`/`InvImage` composition, and the footprint sweep — the
  topology is proven and the remaining seams are content, not risk.
- **It proves the topology, not just a theorem.** It is the smallest
  proof that actually exercises a cross-package import, a third gate, a
  footprint check over a theorem whose statement mentions both models,
  and the hygiene union. Those are the things that kill a bridge, and
  they get tested on day one for a proof I estimate at a few dozen lines.
- **It is the least vacuous thing available.** The kernel's
  `program_pin_well_founded` and fabric's `c7_pin_well_founded` are
  today two independent proofs of literally the same argument —
  `nodeRank`/`admissionRank`, `node_pin_rank_lt`/`pin_rank_lt`, the same
  `Subrelation.wf ∘ InvImage.wf` composition. That duplication is the
  clearest "connection by analogy" in the two packages, and this theorem
  converts it into a derivation. It is exactly the commission's
  "witnessed by translation functions, not by analogy", at the one seam
  where the analogy is currently most naked.
- **It carries its own anti-collapse guard.** Fabric's `fresh` clause
  makes any name-collapsing translation unprovable, so the theorem
  cannot be discharged by a degenerate map. No other seam has that
  property for free, and discovering it here tells the rest of the
  bridge to route through admission wherever it can.
- **It fails loudly.** The three plausible wrong translations (drop
  uses, collapse names, add a self-pin) each break a *named* clause of
  a *fabric* inductive, at elaboration. Compare S5, where a wrong
  translation passes silently under a premise. Leading with the seam
  that fails loudly, and only then attacking the seam that fails
  silently, is the right order.

Immediately after it, in order: S1/S2 (trivial, and they buy the
alignment the rest assumes), S3 (the anti-vacuity carrier pin), S5 with
both orientation controls, then S6 for the payoff statement.

---

## Appendix — every count in this memo, and how I counted it

All commands run against `C:\Users\kokok\Dev\foldlab-kernel-model` at
`d9a13b67f`, working tree clean.

| Count | Value | Method |
| --- | --- | --- |
| Fabric rostered theorems | **206** | the fabric gate's own discovery regex, `grep -rhoE "^[[:space:]]*(@\[[^]]+\][[:space:]]*)?(theorem\|lemma)[[:space:]]+[A-Za-z0-9_']+" verify/fabric/Fabric \| wc -l`; cross-checked against the `roster=(…)` array in `verify/fabric/run.sh`, which has 206 entries |
| …by file | Proofs 107, ControlProofs 53, BridgeProofs 46 | same regex per file (sums to 206) |
| Fabric law statements | **27** | `expected_laws=(…)` array in `verify/fabric/run.sh` |
| Fabric negative controls | **16** | `grep -c '^check_control ' verify/fabric/run.sh`; equals the count of `verify/fabric/negative-controls/*.cex.txt` |
| Kernel rostered theorems | **60** | same discovery regex over `verify/kernel/Kernel`; equals the `roster=(…)` array in `verify/kernel/run.sh` |
| Kernel law statements | **12** | `expected_laws=(…)` in `verify/kernel/run.sh`; 11 proved + `CandidateF13BoundExecutionReplay` stated-only |
| Kernel door controls | **18** | `grep -c '^check_control '`; equals `*.cex.txt` count |
| Kernel must-not-compile controls | **4** | `grep -c '^check_must_not_compile '`; equals non-witness `.lean` files under `must-not-compile/` |
| Kernel dischargeable hypotheses | **2** | read `Kernel/Laws.lean`: only `KInterpInflationary` carries hypotheses that a fabric theorem can discharge (associativity, idempotence). F13's three determinism hypotheses are excluded by ruling |
| Kernel citation strings | **8** (7 fabric, 1 veil) | `grep -oE "[a-z][a-z0-9]*(_[a-z0-9]+)+" verify/kernel/Kernel/Definitions.lean \| sort -u`, then each name looked up with `grep -E "^[[:space:]]*(theorem\|lemma)[[:space:]]+NAME\b"` in `verify/fabric/Fabric/*.lean` and `grep -r` in `verify/fabric-veil/` |
| Toolchain pins | fabric v4.33.0, kernel v4.33.0, veil v4.28.0 | `cat verify/*/lean-toolchain` |
| Zero-dependency manifests | both `"packages": []` | `cat verify/{kernel,fabric}/lake-manifest.json`; asserted by both gates |
| Local cross-package `require`s under `verify/` | **0** | `grep -rn "require" --include="lakefile.*" verify/` — the only hit is `verify/fabric-veil/lakefile.lean:9`, a git require |
| Constructor cardinalities | `Kernel.Act` 8; `DeclKind` 12; `Kernel.HoleStage` 5; `Fabric.HoleStage` 5; `KTriggerPredicate` 5; `Fabric.TriggerPredicate` 5; `RefusalReason` 16; `Unlawful` 18; `CandidateAct` 11; `Fabric.Resolution` 4 | awk over the inductive blocks in both `Definitions.lean` files |
| Tie behaviour | kernel keeps the **last** maximum; fabric keeps the **first** | hand reduction of `Kernel.greatestAt` (`Definitions.lean:1085`, a `foldr` returning `prior` on a tie) and `Fabric.greatestSeal` (`Definitions.lean:735`, returning `arrival` on a tie), checked on the two- and three-element rows quoted in section 4 |
| Kernel-notes drift | §1 says 50 / 8 / 17 against a gate at 60 / 12 / 18; §4 says 18 `Unlawful` constructors, §9 says 17, code has 18 | read `docs/research/2026-08-18-kernel-model-notes.md` §1, §4, §9, §11b against the gate arrays above |

Numbers I did **not** verify, and am therefore not quoting as fact: I
did not run either `run.sh` (no Lean build was attempted in this
session), so "gate green" is a claim I inherit from the branch record
rather than one I measured. Every count above is a static read of
committed sources, not a build result.
