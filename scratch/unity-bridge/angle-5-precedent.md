# Angle 5 — Precedent and literature: the bridge shape mature projects would pick

Status: **EXPLORATORY approach memo. No code, no gate, no package.** Written
against the worktree `C:\Users\kokok\Dev\foldlab-kernel-model` at
`d9a13b67f` (branch `agent/kernel-model`, PR #91), read in place and
modified nowhere. Lean theorem *statements* appear below as they would
appear in a bridge; no proof is offered and none is claimed.

For an outsider, one paragraph. The estate keeps two machine-checked
models of the same system. `verify/fabric` models the **substrate**: a
*cell* (the finite set of holder-attributed observations a replica has
verified), a *directory* (a finite set of petname-to-digest bindings), a
positioned *journal* (an ordered arrival log), policies, and trigger
state — all concrete, all with real merge operations. `verify/kernel`
models the **language**: eight primitive acts over content-addressed
identifiers, one *admission door* (a single function that either
translates a candidate act into a lawful sentence or refuses it with the
law it defends and the repair to try), and a semantics that runs against
*abstract* carriers — any merge operation that is associative and
idempotent will do. The two models share no code. This memo asks what
shape a proof connecting them should take, judged against how mature
verification projects have solved the same problem, and what it would
cost here.

---

## 0. Ground truth — every number below, and how I counted it

The commission's figures are briefing claims. Here is what the worktree
actually contains. Each row names the command I ran.

| Fact | Value | How counted |
| --- | --- | --- |
| fabric rostered theorems | **206** | the `roster=(…)` array in `verify/fabric/run.sh` lines 118–221, lowercase identifiers counted; independently `grep -cE '^(theorem\|lemma) '` over `Proofs.lean` (107) + `ControlProofs.lean` (53) + `BridgeProofs.lean` (46) = 206, and fabric's own gate `diff`s roster against discovered |
| fabric public law statements | **27** | `grep -cE '^def ' verify/fabric/Fabric/Laws.lean`; the gate's `expected_laws` array carries the same 27 names |
| fabric law families actually present | F1, F2, F2b, F3, F4, F7, F9, F10, F11, F12, C7 | enumerated from the 27 names; **F5, F6, F8 do not appear** — F5 lives at `verify/fabric-veil` |
| fabric law-dropping controls | **16** | `.cex.txt` files under `verify/fabric/negative-controls/`; gate echo says "16 law-dropping controls; 27 canonical model vectors" |
| fabric private theorems | **1** (`applySuccessors_of_completeBuffer`) | pinned by name in `verify/fabric/run.sh` line 97 |
| kernel rostered theorems | **60** | the `roster=(…)` array in `verify/kernel/run.sh` lines 103–129; independently `grep -cE '^(theorem\|lemma) ' verify/kernel/Kernel/Proofs.lean` = 60 |
| kernel law statements | **12** | `grep -cE '^def ' verify/kernel/Kernel/Laws.lean`; 11 `K…` proven, 1 (`CandidateF13BoundExecutionReplay`) stated-only |
| kernel door controls | **18** | `.cex.txt` files under `verify/kernel/negative-controls/`; gate's closing echo says 18 |
| kernel must-not-compile controls | **4** | `.lean` files (excluding `.witness.lean`) under `verify/kernel/must-not-compile/` |
| kernel private theorems | **0** | gate pins the private set to empty (line 88) |
| kernel citation strings naming a proof identifier | **8 distinct** | `grep -oE '\([a-z][a-z0-9_]{3,}\)' verify/kernel/Kernel/Definitions.lean \| sort -u` |
| …of those, resolving into fabric's roster | **7 of 8** | `c7_pin_well_founded`, `cell_absorb_inflationary`, `compact_below_floor_preserves_resumption`, `f10_stability`, `f11_query_deterministic`, `f11_topk_of_support`, `f1_cell_merge_aci` — each grepped against `verify/fabric/run.sh` |
| …the eighth | `at_most_one_landed_commit` | **not fabric.** It is an invariant name in `verify/fabric-veil/FabricVeil/Statements.lean:96` |
| fabric / kernel toolchain | `leanprover/lean4:v4.33.0`, `"packages": []` both | `lean-toolchain` and `lake-manifest.json` in each |
| fabric-veil toolchain | `leanprover/lean4:v4.28.0`, **14 network packages** (veil, mathlib, batteries, aesop, cvc5, …) | `verify/fabric-veil/lean-toolchain` and its manifest |
| verify Lean packages with a non-empty manifest | **1 of 5** (only fabric-veil) | surveyed `catalog, fabric, fabric-veil, implication, ir, moves, pipeline, kernel` |

Two corrections worth recording, because they are live instances of the
drift the commission asks me to price:

1. **The KM sheet's counts are stale at HEAD.** `docs/research/2026-08-18-kernel-model-notes.md` §1 says 50 theorems, 8 law statements, 17 door controls; §11b updates to 57 theorems and 18 controls. HEAD carries **60 / 12 / 18**. The notes were measured at `f74c2ca6e`; the worktree is at `d9a13b67f`. Nothing is wrong — the notes say what they measured — but a reader taking §1 as current is already 10 theorems and 4 law statements behind. This is honest bound 12's failure mode reproduced inside the document that names it.
2. **The commission's "~200 theorems (F1–F12 and C7)" is right on the count and loose on the families.** 206 is exact. F5, F6 and F8 are not in fabric at all.

---

## 1. The precedent survey

My lens is: *before choosing a shape, look at how projects that already
solved this chose*. I extract five patterns and four anti-patterns, state
what each assumes about **module systems**, **instance mechanisms**, and
**CI gates**, and then test each against this repository's actual
constraints. Where I rely on training knowledge rather than a fetched
source, I say so inline.

### P1 — Little theories and theory interpretation (IMPS; Isabelle locales)

Farmer, Guttman and Thayer's *little theories* method develops
mathematics across a network of small axiomatic theories related by
inclusion and by **theory interpretation**: you give a translation of the
abstract theory's sorts and constants into the concrete theory, you prove
the translated axioms, and then **every theorem of the abstract theory
transports for free**. Isabelle's locale system is the living
realization: `interpretation` grounds an abstract locale at concrete
constants, `sublocale` relates two locales, and every theorem proved in
the locale is relativized by a locale predicate and exported. ([Little
Theories](https://web.cs.wpi.edu/~guttman/pubs/cade_little-theories.pdf);
[Ballarin, *Locales: A Module System for Mathematical
Theories*](https://link.springer.com/article/10.1007/s10817-013-9284-7);
[Ballarin's locale
tutorial](https://courses.grainger.illinois.edu/cs576/sp2015/doc/locales.pdf).)

*Assumes:* a module system with first-class theory morphisms; automatic
theorem transport; one library, one build.

*Fit here:* **strong in spirit, absent in mechanism.** Lean 4 has no
locale system. But the kernel's laws are already hand-rolled locales:
`KInterpInflationary` takes the merge operation, associativity and
idempotence as explicit universally-quantified arguments and implications
—

```lean
def KInterpInflationary : Prop :=
  forall {Evidence : Type} (merge : Evidence -> Evidence -> Evidence)
      (contribution : Value -> Evidence),
    (forall a b c : Evidence, merge (merge a b) c = merge a (merge b c)) ->
    (forall a : Evidence, merge a a = a) ->
    forall (act : Act) (world : World Evidence),
      World.Le merge world (interp merge contribution act world)
```

— which is exactly a locale with two assumptions. In this idiom
"interpretation" is *function application*: hand it fabric's merge and
fabric's two proofs and the theorem lands at fabric's carrier. That is
the cheapest transport available in any of these traditions, and it needs
no new mechanism at all.

### P2 — mathlib's "prove the package once, instantiate per carrier"

mathlib proves order and algebra packages once from minimal axioms and
instantiates them at every carrier; `SemilatticeSup.mk'` builds the full
order package from associativity, commutativity and idempotence alone.
The mechanism is typeclasses, and the mechanism's hazard is well
documented: multiple inheritance paths produce **instance diamonds** that
fail to be definitionally equal, repaired by *forgetful inheritance* —
including the poorer structure's data inside the richer one so that
deducing one from the other is erasure. ([Affeldt & Cohen, *Competing
Inheritance Paths in Dependent Type
Theory*](https://link.springer.com/chapter/10.1007/978-3-030-51054-1_1);
[*Use and abuse of instance parameters in the Lean mathematical
library*](https://arxiv.org/abs/2202.01629); [*Multiple-inheritance
hazards in dependently-typed algebraic
hierarchies*](https://arxiv.org/pdf/2306.00617).)

*Assumes:* typeclass resolution, and a definitional-equality discipline
maintained library-wide.

*Fit here:* **the pattern already runs inside fabric, and its mechanism
must not cross the seam.** `verify/fabric/Fabric/Definitions.lean:609-632`
says so in its own words — the package is "the `SemilatticeSup.mk'`
construction transliterated" — and `join_semilattice_of_aci` is proved
once over ACI hypotheses and instantiated twice, at the cell
(`f1_cell_join_semilattice`) and at the directory
(`f12_directory_join_semilattice`). So the repository has already
executed this precedent internally and it worked. What must **not** cross
is the typeclass mechanism: a `class KernelEvidence` would have to be
*declared* in one of the two gated packages to be found by instance
search, which edits a package the bridge is supposed to leave alone.
Explicit hypothesis passing (P1) achieves the same transport with zero
edits upstream.

### P3 — CompCert's per-pass forward simulation

CompCert proves each compiler pass correct as a forward simulation
diagram over transition systems, with a decreasing measure to rule out
infinite stuttering, and composes the passes vertically with
`compose_forward_simulations`. ([CompCert `driver.Compiler`
module](https://compcert.org/doc/html/compcert.driver.Compiler.html);
[Leroy, *A formally verified compiler
back-end*](https://xavierleroy.org/publi/compcert-backend.pdf).)

*Assumes:* both sides are transition systems with observable behaviours;
the payoff is amortizing one relation across many passes.

*Fit here:* **poor, and actively dangerous.** There is one "pass", not
twenty, so vertical composition buys nothing. Worse, both sides here are
algebraic — `interp` is a state-to-state function and every law is a
proposition about folds, not about traces. Dressing the bridge as a
simulation over executions would make it a statement about *runs*, which
is precisely the claim `CandidateF13BoundExecutionReplay` is deliberately
withheld from making, and which the kernel gate mechanically refuses
(`verify/kernel/run.sh:78` fails the run on any mention of `CandidateF13`
in the proof file or the control executable). Adopting CompCert's shape
would smuggle a runtime claim past a gate built to stop exactly that.

### P4 — seL4's layered data refinement; Back/von Wright

seL4 stacks a hierarchy of models — security statements, access-control
model, abstract operational specification, executable specification, C,
binary — and proves data refinement between adjacent layers in
Isabelle/HOL, with the executable-model step alone reported at roughly
100K lines of proof. The underlying calculus is Back and von Wright's:
abstraction and representation functions play the roles of decoding and
encoding, and correctness is established by forward simulation.
([*Refinement in the Formal Verification of the seL4
Microkernel*](https://trustworthy.systems/publications/nicta_full_text/3087.pdf);
[Cock, Klein, Sewell, *Secure microkernels, state monads and scalable
refinement*](https://trustworthy.systems/publications/nictaabstracts/Cock_KS_08.abstract).)

*Assumes:* a monadic/state-machine setting and a very large proof budget.

*Fit here:* **poor on cost, decisive on one point — direction.** The
budget is unavailable and unnecessary. But the tradition's direction
discipline is exactly right and should be adopted verbatim: the
*abstraction function* runs from concrete to abstract. Fabric is
concrete; the kernel is abstract. Therefore every translation function in
the bridge points **fabric → kernel**, and the bridge never constructs a
fabric object from a kernel object except at ground demonstration
carriers where the construction is a chosen witness, not a claim.

### P5 — CertiKOS certified abstraction layers, and the word "deep"

A certified abstraction layer is a predicate stating that a layer
implementation over an underlay faithfully implements an overlay
interface via a simulation relation; a *deep* specification determines
the implementation up to that relation, so the implementation is
swappable. ([Gu et al., *Deep Specifications and Certified Abstraction
Layers*, POPL'15](https://dl.acm.org/doi/10.1145/2676726.2676975);
[project page](http://www.normalesup.org/~ramanana/research/certikos/deepspec/).)

*Fit here:* **aspirational, and it names the honest limit precisely.**
The kernel model is *not* a deep specification of fabric, and the notes
say why in their own honest bounds: attribution is absent, so no kernel
statement mentions a holder (bound 8); the world conflates evidence and
per-cell carriers into one (bound 4); reads return no value (bound 11);
the writ premise is modeled at one act, not all ten rules (bound 9). A
deep specification would forbid all four. So the unity claim must be
**soundness of abstraction** — every abstract hypothesis is discharged
concretely — and must never be phrased as adequacy, completeness, or
equivalence. CertiKOS's vocabulary is worth borrowing solely for the
sentence it lets us write about what we are *not* doing.

### P6 (supporting) — Iris's cameras, and the value of a non-instance

Iris proves its logic once over the CMRA/camera interface and then
discharges the camera laws at each concrete construction — `gmap`,
`auth`, `gmap_view` — so the generic theory applies to real resources.
([`iris.algebra.lib.gmap_view`](https://plv.mpi-sws.org/coqdoc/iris/iris.algebra.lib.gmap_view.html).)
Same shape as P2 with a different mechanism (canonical structures). The
transferable idea beyond P2 is the **documented non-instance**: a
construction that *fails* one law, kept around so the reader can see the
law is load-bearing. That is fabric's own control discipline stated in
algebra vocabulary, and it is the discipline the bridge must inherit.

### The four anti-patterns

- **A1 — bundling the abstract hypotheses as a typeclass inside a gated package.** The mathlib diamond literature is the general warning; here the specific cost is blast radius: an instance must live where instance search can find it, i.e. upstream. Refused.
- **A2 — simulation framing where there is no transition system.** P3's misapplication. Refused, and refused twice over because the gate already treats execution claims as findings.
- **A3 — the vacuous instance.** Discharging the abstract theory at a carrier that satisfies the hypotheses but is not the shipped one. The kernel already has this in-package and labels it honestly: `ground_interp_inflationary` instantiates at `Nat` with `Nat.max`, described as "the demonstration carrier". A bridge that instantiated at anything like that would be a restatement, not a bridge.
- **A4 — re-proving instead of transporting.** The failure little theories was invented to name. The repository has already paid it once; see §2.

### CI-gate precedent, flagged as training knowledge

None of P1–P6 runs N mutually-independent gates; all run one build graph
over one library. The closest precedent for "independent entries, one of
which depends on two others" is the Archive of Formal Proofs, where each
entry builds independently and declares its dependencies in its session
`ROOT`, and the build order is the declaration closure. I did not fetch a
source for this; treat it as training knowledge. The transferable rule is
the one AFP enforces structurally: **dependency is declared by the
dependent, never by the dependency.** That maps onto this repo as: the
bridge's gate may assert facts about fabric and kernel; fabric's and
kernel's gates may never mention the bridge.

---

## 2. The diagnosis this survey produces: a hand-executed theory morphism

Reading both packages with P1's eyes turns up something the briefing does
not mention. The two packages are already related by a partial theory
morphism — someone just executed it by hand, with a text editor.

Three verified duplications:

1. **`supLe` is one definition living in two files.** `Fabric.supLe` (`Definitions.lean:617`) and `Kernel.supLe` (`Definitions.lean:1127`) are the same three lines, differing only in universe polymorphism (`Type uH` versus `Type`). Both mean "joining adds nothing".
2. **`HoleStage` and `HoleStage.rank` are byte-identical across the two packages** — five constructors in the same order (`opened, filled, disputed, decided, sealed`), the same rank function, the same "reached-at-least" docstring clause. `Fabric/Definitions.lean:837` and `Kernel/Definitions.lean:155`.
3. **The admission-rank well-foundedness proof is one proof, typed twice.** Compare `Fabric.pin_rank_lt` with `Kernel.node_pin_rank_lt`: same induction, same case split, same `by_cases hit`, same `rw [if_pos …, if_neg …]`, same closing `exact`. The only differences are field renames (`work`→`name`, `pins`→`uses`) and type renames (`ActionDeclaration`→`ProgramNode`, `admissionRank`→`nodeRank`, `PinsWithin`→`NodePins`, `Admission`→`ProgramAdmission`). The kernel notes call this out and defend it: "the catalog admission proof transliterated to node scale… Nothing new was invented; that is the point" (§5).

The defence is correct as far as it goes — transliteration was the right
call for a package that had to ship independently. But little theories
names the standing cost precisely: a copied proof is a proof that has to
be *maintained* twice and can *drift* silently, and the copy count grows
with the carrier count. At two carriers this is fine. The bridge's real
job, on this reading, is not to invent a correspondence — it is to make
an already-existing correspondence into a **checked object** so the next
carrier costs an instantiation instead of a copy.

That reframing is what my lens contributes and it changes what the first
theorem should be (§8) and what the negative controls must catch (§6).

---

## 3. Commission point 1 — unity, as a finite set of theorem statements

**Definition.** *Unity* is the conjunction of six bridge theorems B1–B6,
each of the form "an abstraction the kernel names, discharged at a
carrier the fabric ships", together with the four explicit non-claims
N1–N4. Nothing else is unity. The set is finite, closed, and each member
is independently falsifiable.

The single sentence: **the kernel model is a sound abstraction of the
fabric model** — every hypothesis the kernel leaves open is closed by a
fabric theorem at a carrier fabric's own gate exercises, and the two
proof shapes the kernel inherited (admission-rank well-foundedness,
greatest-wins reads) are transports of fabric's, witnessed by named
translation functions.

**What unity deliberately does NOT claim.**

- **Not an isomorphism, not adequacy, not deep specification.** Soundness only, in CertiKOS's sense of the word (P5). Fabric has structure the kernel does not name (holders, per-cell carriers, returned read values, the full writ premise) and the kernel has structure fabric does not name (branded digest sorts, the candidate layer, hole valuations, sentence encoding). Unity says the kernel does not *lie* about fabric; it does not say the kernel *determines* fabric.
- **No runtime claims.** No statement about executions, schedules as they actually occur, processes, or the shipped TypeScript. The bridge is a statement about two Lean models.
- **No liveness.** Nothing about eventual arrival, progress, termination, or lease renewal. Every bridge theorem is a safety statement: an equality, an implication, or a well-foundedness.
- **No F13.** `CandidateF13BoundExecutionReplay` acquires no proof, no instance, no consumer, and no mention inside `verify/kernel`. If the bridge ever wants to talk about composed execution it must first obtain a ruling; until then the bridge does not name it and the kernel gate's line-78 check keeps that honest. (The bridge may, without touching F13, prove the *assembly* seam separately — see N3.)
- **Nothing crosses the fabric–veil toolchain split.** The one kernel citation that points at the register model (`at_most_one_landed_commit`) is handled as an allowlisted string, never an import. This is not a preference: fabric-veil is pinned at Lean v4.28.0 with fourteen network dependencies including mathlib, against v4.33.0 zero-dependency here. A Lean import across that seam is impossible, and the bridge should say so rather than describe it as discipline.
- **No claim about the closure list's coverage.** Honest bound 1 (the `Unlawful` predicate's coverage of the fourteen closure rows is an argued mapping, not a theorem) is untouched by the bridge and stays untouched.

---

## 4. Commission point 2 — package topology, and what the bridge's gate checks

**Recommendation: a third package, `verify/unity/`, and nothing else moves.**

```
verify/fabric/   lake-manifest.json: "packages": []     run.sh   (unchanged)
verify/kernel/   lake-manifest.json: "packages": []     run.sh   (unchanged)
verify/unity/    lake-manifest.json: two PATH requires  run.sh   (new, third gate)
                 require fabric from "../fabric"
                 require kernel from "../kernel"
```

Both existing packages keep their empty manifests, their toolchain pins,
their rosters, their controls, and their gate scripts **byte-identical**.
The bridge is the only package that has dependencies, and the dependency
arrow points one way only. Deleting `verify/unity/` restores the world
exactly — which is the rollbackability the house rules demand of
un-grilled machinery.

The alternatives, priced:

- **Bridge inside kernel** (kernel requires fabric). Breaks kernel's manifest pin (`run.sh:26` checks `"packages": []`), puts fabric's whole 206-theorem roster inside the kernel gate's trusted surface, and reverses KM-3's ruling without a ruling. Refused.
- **Bridge inside fabric** (fabric requires kernel). Same violation, and worse in direction: it would make the substrate depend on the language, inverting the abstraction arrow P4 fixes. Refused.
- **No Lean bridge; a gate-side citation checker only.** Cheap, deployable this week, catches honest bound 12 (stale citation strings) and nothing else. It proves no theorem. Worth doing *anyway* as part of the bridge gate (check G6 below), but it is not unity.
- **Extract the shared abstract theory into a fourth zero-dependency `verify/algebra` package that both depend on.** This is what P1/P2 would recommend if the packages were being designed today: put `supLe`, `JoinSemilatticePackage`, `join_semilattice_of_aci`, `HoleStage`, and the admission-rank well-foundedness skeleton in a common base, and let fabric and kernel both instantiate. It is the *correct* long-run shape and it eliminates all three duplications from §2 at the root. **I do not recommend it now**, for one reason that is about house rules rather than mathematics: it requires editing both gated packages simultaneously, which is the largest blast radius available, and it would be un-grilled machinery landing inside two green gates. The bridge package is the version of this idea that can be rolled back. If the bridge lands and holds, `verify/algebra` is the natural successor slice and the bridge's theorems become its acceptance test.

**One house-novel fact worth flagging.** There is currently **no verify
package that depends on another verify package** — four of the five Lean
packages carry `"packages": []` and the fifth (fabric-veil) depends only
on upstream network libraries. `verify/unity` would be the first
intra-repo path dependency in the tree. That is not a reason to refuse
it, but it means the topology has no house precedent to cite and the
gate below is doing genuinely new work.

### What the bridge's gate checks

Ten checks, in order. The first four are the ones that make the topology
safe; the rest are the standard house battery.

- **G1 — toolchain unanimity.** `verify/unity/lean-toolchain`, `../fabric/lean-toolchain` and `../kernel/lean-toolchain` are all `leanprover/lean4:v4.33.0`, compared as strings. A toolchain bump upstream fails the bridge before it fails anything else.
- **G2 — no network dependency.** `verify/unity/lake-manifest.json` contains exactly two package entries, both path-typed, resolving to `../fabric` and `../kernel`. No `"url"` key, no `https://`. This is the bridge's analogue of the upstream `"packages": []` check: it says the bridge widens the trusted base by exactly two known packages and nothing else.
- **G3 — upstream zero-dependency re-assertion.** The bridge gate re-reads `../fabric/lake-manifest.json` and `../kernel/lake-manifest.json` and fails unless both are still `"packages": []`. This is the load-bearing anti-coupling check: if someone adds a dependency to fabric, the *bridge* breaks, not fabric. Dependency is declared by the dependent (the AFP rule from §1).
- **G4 — no reverse mention.** `grep` `../fabric/run.sh` and `../kernel/run.sh` for `unity`; any hit fails. This is what stops the coupling from becoming bidirectional by someone's well-meant CI edit. Without it, a future `fabric/run.sh` that calls `unity/run.sh` would make fabric's zero-dependency claim false by transitivity while both gates stayed green.
- **G5 — source hygiene.** The standard forbidden-token sweep. **Adopt fabric's word list, not the kernel's.** The kernel's list additionally bans the bare token `seal` (`kernel/run.sh:37`), which is right for a package that must not describe fenced arbitration in prose, and wrong for a bridge whose most valuable theorem is about exactly that. Note the mechanics, because they are not obvious: the regex requires a non-identifier character on both sides, so the identifier `f12_greatest_seal_wins` passes (underscores are identifier characters) and the constructor `.sealed` passes (trailing `e`), while the bare word in a sentence does not. Every docstring proposed in this memo respects the stricter list anyway.
- **G6 — citation resolution (the bound-12 repair).** For every parenthesized lowercase identifier appearing in the kernel's `taught` refusal table, require that it appear in the `roster=(…)` array of `../fabric/run.sh` — with a single committed allowlist file naming the exceptions and their true home. Today the allowlist has exactly one line: `at_most_one_landed_commit  verify/fabric-veil/FabricVeil/Statements.lean`. This is the *only* place the bridge touches the veil, and it touches it as a string with a filename, never as an import. Verified today: 7 of the 8 citations resolve; the eighth is the allowlisted one. **I recommend this as a gate check and not as a Lean theorem**, even though my lens would prefer everything inside the logic: encoding fabric's 206 names as a Lean `List String` inside the bridge creates a second copy of the roster, which is a new drift surface to fix an old one. The gate script can read the one true roster directly. This is a place where the precedent tradition loses to the house's gate-script tradition, and the house is right.
- **G7 — roster and footprint.** Every public theorem in `verify/unity` is rostered by name and swept with `#print axioms`, with the footprint confined to `propext`, `Classical.choice`, `Quot.sound` — the same three both upstream gates pin. A bridge theorem that drags in a new axiom is a finding.
- **G8 — private set pinned to empty**, as the kernel does. A visibility modifier removes a theorem from the roster sweep.
- **G9 — the negative-control battery**, one control per translation function, each with a committed trace and each with its attributability twin (§6).
- **G10 — the no-new-definitions partition.** The bridge may define **translation functions and control witnesses only**. It must define no new law, no new carrier, and no new algebra. Mechanically: a pinned allowlist of `def`/`abbrev` names, diffed like the roster. This is the check that stops the bridge from quietly becoming a third model.

**One operational hazard to name.** A lake path dependency builds the
dependency in its own directory: running `verify/unity/run.sh` writes
into `../fabric/.lake/build` and `../kernel/.lake/build`. Both upstream
gates begin with `lake build`, so they self-heal, but a reader who runs
the bridge and then reads a fabric build artifact is reading something
the bridge produced. Either isolate the build directory or state the
effect in the bridge's README. A green gate that mutates its neighbours'
outputs is the kind of thing that makes a later "it passed" untrue.

---

## 5. Commission point 3 — the seam inventory, ordered by cost

I derived this by hand from the 12 kernel law statements against the 27
fabric law statements plus the two definition files, asking of each
kernel abstraction: *is there a fabric object that discharges it, and can
the discharge be typed?* Six seams survive as claimable (B1–B6); four are
named non-claims (N1–N4). Ordered cheapest first.

### B1 — the derived order is one definition (cost: trivial; value: drift alarm)

```lean
/-- The two packages' derived join orders are one definition: `a` is at
    or below `b` exactly when joining `a` into `b` adds nothing. Stated
    at the shipped ground carrier as a definitional equality, so an edit
    to either side breaks this build rather than drifting quietly. -/
theorem unity_sup_order_agrees
    (left right : Fabric.Emitter.GroundCell) :
    Kernel.supLe Fabric.Cell.merge left right
      = Fabric.supLe Fabric.Cell.merge left right := rfl
```

One `rfl`. Its value is entirely as an alarm: duplication (1) from §2
becomes a checked fact.

### B2 — the evidence hypotheses, discharged at fabric's shipped carrier (cost: low; value: the headline)

The kernel's `KInterpInflationary` demands associativity and
idempotence of an abstract merge. Fabric's `f1_cell_merge_aci` supplies
commutativity, associativity and idempotence at the cell. The
instantiation is function application.

```lean
/-- The kernel's inflation law at the fabric's shipped evidence carrier:
    the cell of holder-attributed observations the generated conformance
    vectors are computed over. The merge hypotheses are discharged by the
    fabric's own algebra package, not restated. The holder is universally
    quantified so the statement is not secretly about one writer. -/
theorem unity_interp_inflationary_at_ground_cell
    (holder : Nat) (act : Kernel.Act)
    (world : Kernel.World Fabric.Emitter.GroundCell) :
    Kernel.World.Le Fabric.Cell.merge world
      (Kernel.interp Fabric.Cell.merge (Unity.contributionAt holder)
        act world)
```

Discharge terms: `(Fabric.f1_cell_merge_aci).2.1` (associativity) and
`(Fabric.f1_cell_merge_aci).2.2` (idempotence).

**A typing fact this seam forces, which I did not expect and which is
load-bearing.** `Kernel.World` is declared over `(Evidence : Type)` —
universe zero only. `Fabric.Cell Holder Value cmp` lives at
`Type (max uH uV)`. So the kernel statement can be *typed* at fabric's
cell only when both parameters are universe-zero. The one carrier where
that holds and which fabric's gate actually exercises is
`Fabric.Emitter.GroundCell = Cell Nat Nat Emitter.observationCmp` — the
carrier the 27 generated conformance vectors run over. The universe
constraint and the anti-vacuity requirement coincide exactly: the only
carrier the bridge *can* use is the one it *should* use. Either the
bridge accepts universe-zero scope and says so, or the kernel's `World`
must be generalized to `Type u`, which is an upstream edit and therefore
out of scope for a rollbackable bridge. Recommend: accept, and state the
bound.

### B3 — the trigger grammar transports, and the kernel gets stronger (cost: low-medium; value: highest)

The two trigger grammars — the closed set of conditions that may fire a
declaration — match constructor-for-constructor:

| Kernel `KTriggerPredicate` | Fabric `TriggerPredicate Holder Value` |
| --- | --- |
| `evidenceAppears (lane) (pattern)` | `evidenceAppears (pattern)` |
| `cellReaches (cell) (threshold)` | `cellReaches (cell) (threshold)` |
| `holeReaches (hole) (target)` | `holeReaches (hole) (target)` |
| `outcomeLanded (register)` | `outcomeLanded (work)` |
| `headAdvancedPast (partition) (position)` | `headAdvancedPast (position)` |

and `HoleStage` is byte-identical on both sides (duplication (2) of §2).

```lean
/-- Every firing condition the kernel's closed grammar can spell is
    monotone at the fabric's real state: once it holds, componentwise
    growth cannot un-hold it. The kernel states closure — five
    productions, no constructor for absence, negation, or deadline; the
    fabric supplies the meaning that makes closure worth having. -/
theorem unity_kernel_trigger_is_monotone
    (predicate : Kernel.KTriggerPredicate)
    (before after :
      Fabric.FabricState Nat Nat Fabric.Emitter.observationCmp) :
    Fabric.FabricState.Le before after ->
      Fabric.holds (Unity.triggerAt predicate) before ->
        Fabric.holds (Unity.triggerAt predicate) after
```

This is the seam I would fight for. Every other bridge theorem
*re-derives* something one side already has. This one **adds a property
the kernel cannot currently state at all**: the kernel interprets a
trigger act as the identity (honest bound 5), so within `verify/kernel`
there is no sense in which a kernel trigger is monotone. The bridge gives
the kernel's syntactic closure a semantic payoff, borrowed from fabric's
`f10_stability`. In little-theories terms this is transport in the
valuable direction — the abstract theory acquires a theorem it could not
prove about itself.

### B4 — admission-rank well-foundedness, transported instead of copied (cost: medium; value: retires duplication (3))

```lean
/-- A kernel program node is a fabric action declaration: the node's
    name is the declared work digest, its uses are that declaration's
    pins. Under this reading the kernel's program admission order IS the
    fabric's ledger admission order. -/
theorem unity_program_admission_is_ledger_admission
    {nodes : List Kernel.ProgramNode} :
    Kernel.ProgramAdmission nodes ->
      Fabric.Admission (nodes.map Unity.declarationOf)

/-- …and the consumption relation is the pin relation. -/
theorem unity_node_pins_is_ledger_pins
    {nodes : List Kernel.ProgramNode}
    {parent child : Kernel.ProgramNode} :
    Kernel.NodePins nodes parent child ->
      Fabric.PinsWithin (nodes.map Unity.declarationOf)
        (Unity.declarationOf parent) (Unity.declarationOf child)

/-- …so the kernel's program DAG guarantee is the fabric's C7 pulled back
    along the translation: one proof at two carriers, replacing one proof
    written twice. -/
theorem unity_program_pin_well_founded_via_c7
    (nodes : List Kernel.ProgramNode) :
    Kernel.ProgramAdmission nodes ->
      WellFounded (Kernel.NodePins nodes)
```

Cost sits in the third statement. Transporting well-foundedness backwards
along `declarationOf` needs the map to be injective on the node set,
which follows from `ProgramAdmission`'s freshness clause (names admit at
most once) but is a real lemma, not a rewrite. Both `Admission` and
`ProgramAdmission` are newest-first (cons is the newest admission) and
both rank functions return distance from the oldest, so the orientation
matches with nothing to reverse — verified by reading both inductives and
both `…Rank` definitions.

Note that this seam is **brand-free**: `ProgramNode.name` and
`ProgramNode.uses` are already bare `Nat`, so no digest-brand erasure is
required here. Brand erasure bites at B6, not here — see §6.

### B5 — the greatest-wins read (cost: medium; value: high; danger: highest)

The kernel's provision environment is a valuation built by reading the
greatest-position fact at a hole (`greatestAt`, and the proven collapse
`provision_positioned_correspondence`). The fabric's directory resolution
is the binding sealed at the greatest token (`greatestSeal`,
`f12_greatest_seal_wins`, `greatest_seal_of_support`). These are the same
algebra at two carriers and the kernel notes say so, deferring the
support-invariance half to fabric "as the instantiation obligation in the
KM-3 posture" (§11b).

```lean
/-- The kernel's greatest-position provision read is the fabric's
    greatest-token arbitration at the provision carrier. The premise is
    supplied by construction: positions assigned along the chain are
    distinct, which is what the fabric names as its fencing premise and
    what the kernel's own position assignment guarantees. The
    unrestricted form of this statement is FALSE; its refutation is
    committed beside it. -/
theorem unity_greatest_position_is_greatest_token
    (events : List (Nat × Nat)) (hole : Nat) :
    Kernel.greatestAt (Kernel.positionedOf events) hole
      = (Fabric.greatestSeal (Unity.factsAt events hole)).map
          (fun top => (top.token, top.digest))
```

Why this is dangerous is §6's first finding, and it is the sharpest thing
I found in the code.

### B6 — the catalog reference seam, and where brands get erased (cost: high; value: medium)

The kernel's admission door holds `Door.catalog : List Ref` where
`Ref = DeclKind × Nat`: a kind-tagged identifier. The fabric's ledger
holds `ActionDeclaration.work : Nat`: untagged. So *this* seam, unlike
B4, requires a genuine brand erasure `Ref → Nat`, and it is where the
kernel's cross-kind discipline can be silently thrown away. Statement
sketch:

```lean
/-- Erasing the declaration-kind brand from a catalog is injective on
    any catalog the door admits, so the fabric's untagged ledger view of
    an admitted catalog loses no distinctions the kernel was keeping. -/
theorem unity_brand_erasure_injective_on_admitted
    (door : Kernel.Door) :
    Unity.CatalogAdmitted door ->
      forall left right, left ∈ door.catalog -> right ∈ door.catalog ->
        Unity.eraseBrand left = Unity.eraseBrand right -> left = right
```

I put this last deliberately. It is the seam where a wrong translation
does the most damage, and it is also the seam where the kernel currently
has the least to bridge *to*: fabric has no door. I would state it, prove
it, and stop there — the erasure's injectivity is the fact that licenses
every future catalog-level bridge, and proving it now is cheap insurance
against a later bridge that assumes it silently.

### The four named non-claims

- **N1 — the landed-set dedup.** The kernel's `interp` for `decide` deduplicates by register id and cites the register invariant package. That package is `verify/fabric-veil` at Lean v4.28.0 with mathlib. **Not bridgeable in Lean.** Handled as the one allowlisted citation string in G6, and named here so nobody mistakes the allowlist for a proof.
- **N2 — spawn's attenuation.** The kernel interprets `spawn` as the identity because writs are per-connection facts, not world state (honest bound 5 / KM-7). Fabric has `f9_policy_meet_semilattice` and `f9_tree_attenuation` ready and waiting. There is nothing to bridge until the kernel gives writs a carrier. Named, not claimed.
- **N3 — assembly determinism.** Fabric's F7 (three halves, all proven) is exactly the `assemble` hop of the kernel's F13 statement. It is tempting to bridge it. **Do not** — not because the theorem would be wrong, but because the kernel gate fails on any mention of `CandidateF13` and the bridge should not launder a forbidden mention through a neighbouring package. If the estate wants the assembly seam, it should be requested as its own statement over the kernel's `ContextProgram`-shaped objects with a ruling, not smuggled.
- **N4 — read return values.** Kernel `resolve` and `fold` interpret as identity; their returned values are unmodeled (honest bound 11). Fabric's F11 owns determinism of the returned answer. Nothing to bridge.

---

## 6. Commission point 4 — the translations, where a wrong one lies, and the controls

Four translation functions. All point fabric-ward from kernel objects or
kernel-ward from fabric carriers per §1/P4's direction rule, all are
computable so ground controls can `decide`, and each gets a committed
negative control *and* an attributability twin — the two-sided idiom
fabric already uses (`drop_meet_clamping_killed` beside
`drop_meet_clamping_keeps_already_attenuated`; `drop_greatest_token_killed`
beside `unfenced_row_keeps_seal_support`) and which `verify/AGENTS.md`
states as law: *"The controls that keep an unrelated invariant checked and
passing are what prove two laws independent — keep them."*

### T1 — `contributionAt : Nat -> Kernel.Value -> Fabric.Emitter.GroundCell`

`fun holder value => Fabric.Cell.singleton (holder, value.bytes)`.

**Where it lies.** The kernel has no holder (honest bound 8). A
translation that hard-codes one — `fun value => Cell.singleton (0, value.bytes)` —
makes B2 a theorem about a single-writer world while reading like a
theorem about the fabric's evidence carrier. The lie is silent because
inflation is true in both, so no test fails; the statement is just weaker
than it appears.

**Control.** Quantify the holder in the statement (as B2 does) and commit
a two-holder ground vector showing the resulting cells differ:
`Cell.singleton (0, 10) ≠ Cell.singleton (1, 10)`, by `decide`. If a
future edit collapses holders, that control dies.

**Attributability twin.** At a fixed holder the two contributions agree,
so the control's kill is attributable to attribution and not to the cell
algebra.

### T2 — `declarationOf : Kernel.ProgramNode -> Fabric.ActionDeclaration`

`fun node => { work := node.name, pins := node.uses }`.

**Where it lies.** Orientation. If someone writes `pins := node.uses.reverse`
or maps a newest-first node list onto an oldest-first ledger, the
`Admission` inductive still typechecks — it just describes a *different*
graph, and well-foundedness holds for that different graph too. The
bridge would be green and meaningless. I verified the orientations match
today (both cons-newest, both ranks measuring distance from oldest), but
nothing in either package records that they must.

**Control.** A committed three-node program with a deliberately asymmetric
`uses` structure, plus a theorem that the translated ledger's rank
ordering agrees with the kernel's node ranks pointwise:
`Fabric.admissionRank (nodes.map declarationOf) n.name = Kernel.nodeRank nodes n.name`,
by `decide` at the ground vector. Reverse either list and it fails.

**Attributability twin.** A single-node program where both orientations
coincide, showing the kill above is attributable to orientation alone.

### T3 — `factsAt : List (Nat × Nat) -> Nat -> List (Fabric.Seal Nat)`

Filter `positionedOf events` to the hole, then map
`(position, _, value) ↦ { token := position, holder := 0, digest := value }`.

**Where it lies — and this is the finding.** The two greatest-wins
functions **break ties on opposite sides.** Read them:

```lean
-- Fabric/Definitions.lean:735 — replacement only on a strictly larger token
| arrival :: rest =>
    match greatestSeal rest with
    | none => some arrival
    | some best =>
        if arrival.token < best.token then some best else some arrival
```

```lean
-- Kernel/Definitions.lean:1085 — replacement only on a strictly greater position
facts.foldr (fun fact best =>
  if hole == fact.2.1 then
    match best with
    | none => some (fact.1, fact.2.2)
    | some prior =>
        if prior.1 < fact.1 then some (fact.1, fact.2.2) else some prior
  else best) none
```

Fabric's strict comparison sits on the *head*, so a tie keeps the head.
The kernel's sits on the *accumulator*, so a tie keeps the tail. Worked
by hand at a two-element tied input: on `[(1,h,10), (1,h,20)]` the kernel
returns `some (1, 20)`; on the corresponding
`[⟨1,0,10⟩, ⟨1,0,20⟩]` the fabric returns `some ⟨1,0,10⟩`. **The
unrestricted correspondence is false.** Both docstrings are individually
honest — each says no tie is decided in the function and each defers to a
premise — and neither package can see the other's convention.

This is exactly the "tie semantics" trap the commission names, and it is
not something any precedent would have predicted. Little theories gave me
the discipline to look for the premise; only reading the two definitions
side by side found the divergence.

**Control (this is the one that makes the bridge falsifiable).**

```lean
/-- The unrestricted correspondence is false: at equal positions the
    kernel's read keeps the later fact and the fabric's arbitration keeps
    the earlier one. Refuted at a two-element tied chain, so the
    distinctness premise carried by B5 is load-bearing and not
    decoration. -/
theorem unity_tied_positions_refute_the_correspondence :
    Kernel.greatestAt Unity.tiedFacts 7
      ≠ (Fabric.greatestSeal Unity.tiedFacts_asFenced).map
          (fun top => (top.token, top.digest)) := by decide
```

**Attributability twin.** At distinct positions the two reads agree — so
the kill is attributable to the tie and not to the seal translation, the
holder choice, or the filter.

**Tactic texture worth pre-recording.** Fabric's `resolve` matches on
`greatestSeal` *first*, so in the arbitrated branch `candidates` is never
forced and the `mergeSort` inside it is never reduced. That matters
because `mergeSort` is opaque to kernel reduction: a bridge that targets
`greatestSeal` can `decide`; one that targets `candidates` or the
unsealed branch of `resolve` cannot. Target `greatestSeal`.

### T4 — `triggerAt : Kernel.KTriggerPredicate -> Fabric.TriggerPredicate Nat Nat`

Five rows, constructor for constructor.

**Where it lies.** Three of the five kernel productions carry payload the
fabric production does not: `evidenceAppears` carries a lane digest,
`headAdvancedPast` carries a partition, `outcomeLanded` carries a branded
register rather than a bare `Nat`. Dropping the lane and the partition on
the way across is *sound* for B3 (fabric's stability is universally
quantified over predicates, so a coarser predicate is still monotone) but
it means B3 is a statement about the *fabric shadow* of a kernel trigger,
not about the kernel trigger. A translation that silently merged two
distinct kernel predicates into one fabric predicate and then claimed
"the kernel's grammar is monotone" would be over-claiming by exactly the
information it dropped.

**Control.** Two kernel predicates differing only in lane, translated;
require the translated pair to be distinguishable, or — if they are not,
which is the honest outcome for `evidenceAppears` — state B3 explicitly
as a statement about the shadow and commit a witness pair showing the
collapse. **A collapse you commit is a bound; a collapse you don't is a
lie.** I would commit the collapse: it is a true and useful fact that the
lane is not load-bearing for monotonicity.

**Attributability twin.** `holeReaches` translates without loss (both
sides carry a bare hole name and the byte-identical `HoleStage`), so a
control on `holeReaches` that *passes* shows the collapse above is
specific to the payload-carrying productions.

### The general rule this section is arguing for

A bridge that cannot fail proves nothing, and a bridge negative control
must fail for *its own* reason. The house already encodes this
(`verify/AGENTS.md`: controls "refuted on exactly its own invariant").
Concretely, for the bridge: **every translation function ships a pair —
one theorem that dies when the translation is wrong, and one that lives
when a neighbouring translation is wrong.** Four translations, eight
control theorems, each with a committed trace. That is the minimum
battery, and I would refuse to call the bridge green with fewer.

---

## 7. Commission point 5 — risks

### Risk 1 — vacuity (the highest, and the one my lens most fears)

A3 in §1: instantiating the abstract theory somewhere it holds trivially.
The failure mode here is concrete and near: the kernel *already ships* a
toy instantiation (`ground_interp_inflationary`, at `Nat` with `Nat.max`,
labelled "the demonstration carrier"), and a bridge that instantiated at
anything of that shape would be indistinguishable from what already
exists while sounding like much more.

*Mitigation, and it is unusually clean here.* Bind the bridge to
`Fabric.Emitter.GroundCell` and the emitter's `observationCmp` — the
carrier fabric's own gate runs 27 generated conformance vectors over and
byte-compares. Not a fresh carrier chosen by the bridge; the shipped one.
And as §5/B2 records, the universe constraint on `Kernel.World` makes
this the *only* fabric cell the kernel statement can be typed at, so the
non-vacuity requirement is enforced by the elaborator rather than by
discipline. Add one gate check: the bridge's roster may not contain a
theorem whose statement mentions no `Fabric.` identifier — a bridge
theorem that talks only about kernel objects is not a bridge theorem.

*Residual.* B2 is still universe-zero-scoped and holder-quantified but
not holder-*general* in fabric's sense (fabric's cell is polymorphic in
`Holder`; the bridge's is `Nat`). State it. The repair is upstream
generalization of `Kernel.World` to `Type u`, which is a later slice.

### Risk 2 — gate coupling

Three distinct failure modes, only the first of which is obvious.

1. **Reverse dependency.** Someone wires `fabric/run.sh` to call the bridge, and fabric's zero-dependency claim becomes false by transitivity while both gates stay green. Caught by G4.
2. **Silent widening upstream.** Someone adds a network dependency to kernel; the kernel gate's own `"packages": []` check catches it — but if that check were ever relaxed, the bridge would inherit the widened trusted base invisibly. Caught by G3, which re-asserts the upstream property from the dependent side.
3. **Build-directory bleed.** The bridge's `lake build` writes into `../fabric/.lake/build` and `../kernel/.lake/build`. Nothing becomes unsound, but a reader who inspects a fabric artifact after running the bridge is reading bridge-produced bytes. Name it in the README or isolate the build directory.

There is also a fourth, softer coupling my lens flags: **the bridge is a
consumer, and consumers freeze names.** Once the bridge cites
`Fabric.f1_cell_merge_aci` and `Kernel.interp_inflationary` by name, a
rename upstream breaks the bridge build. That is *good* — it is precisely
the drift alarm honest bound 12 lacks — but it must be stated as a cost
so that a future rename is priced with the bridge in view. KM-3's warning
("removing a dependency after statements cite fabric names verbatim is
surgery") is exactly right and applies to the bridge package too.

### Risk 3 — drift between citation strings and rosters

Already real, already measured, and already visible in two directions:

- **Kernel → fabric.** 7 of 8 citations in the kernel's `taught` table resolve into fabric's roster today; nothing checks that they will tomorrow. Honest bound 12 says so. Repair: G6.
- **Kernel → the KM sheet.** The notes' §1 counts (50 / 8 / 17) are behind HEAD (60 / 12 / 18). Nothing checks prose against the gate. Repair: out of scope for the bridge, but worth naming — if the bridge's own memo quotes a count, it should quote it with the command that produced it, as §0 does here.
- **Kernel → veil.** The one veil citation names an invariant in a Veil-DSL model at a different toolchain. It cannot rot into a Lean symbol; it can only rot into a *wrong file path*. The allowlist should therefore carry the path, not just the name, and the gate should check the path exists.

The deeper drift risk my lens surfaces is the one §2 describes: the three
duplications are unchecked today, and the bridge only checks the first
(`supLe`, via B1) and the third (the admission proof, via B4). `HoleStage`
would remain duplicated and unchecked unless the bridge adds a fourth
trivial theorem asserting the rank functions agree — cheap, and I would
add it.

---

## 8. Commission point 6 — the one theorem I would prove first

**B2: `unity_interp_inflationary_at_ground_cell`** — the kernel's
inflation law, instantiated at the fabric's shipped ground evidence
carrier, with the merge hypotheses discharged by `f1_cell_merge_aci` and
the holder universally quantified.

Why this one, in my lens's terms:

1. **It is the canonical first move in every precedent surveyed.** Isabelle's `interpretation`, Iris's "`gmap` is a camera", mathlib's "this carrier is a `SemilatticeSup`" — the tradition's opening move is always *discharge the abstract theory's axioms at the real concrete construction and watch the abstract theorem land*. Doing anything else first means the tradition's cheapest, best-understood step was skipped.

2. **The risk here is the topology, not the mathematics, and this theorem is the smallest thing that tests the topology completely.** Nobody has ever put these two packages in one Lean environment. B2 requires: two path dependencies resolving, one toolchain serving both, both namespaces coexisting (`Fabric.supLe` and `Kernel.supLe` both in scope), fabric's `Std.TransCmp` instance for the emitter comparator being findable from a third package, and a statement mentioning `Kernel.World`, `Fabric.Cell.merge` and `Fabric.f1_cell_merge_aci` in one line. If any of that fails, every other bridge theorem fails the same way, and better to learn it from a theorem whose mathematical content is two projections out of a conjunction.

3. **It forces the anti-vacuity decision immediately and mechanically.** As §5/B2 records, `Kernel.World` is universe-zero, so the elaborator will accept exactly one fabric cell: the ground emitter carrier the conformance corpus runs over. A first theorem that *cannot be typed at a toy* is the strongest possible defence against Risk 1, and it lands that defence on day one rather than as a discipline maintained by memory.

4. **It de-risks B3, B4, B5 in that order.** B3 needs the same carrier plumbing plus a five-row translation; B4 needs it plus an injectivity lemma; B5 needs it plus the tie premise. All three inherit B2's environment. And if B2 turns out to be impossible for a reason I have not foreseen — a universe wall that does not yield, an instance that will not resolve across the package boundary — then the correct conclusion is that the bridge should be `verify/algebra` (the fourth-package alternative in §4) rather than `verify/unity`, and B2 is the cheapest experiment that tells us which.

What I would *not* prove first: B5. It is the most interesting theorem
and the one with the real finding in it, and it is therefore the one most
likely to consume a week arguing about premises before anyone has
confirmed the two packages can share a build.

---

## 9. Which precedent this most resembles, and where it deviates on purpose

**Resembles: Isabelle's `interpretation` — a grounded realization of an
abstract locale at concrete constants** (P1), with mathlib's
"prove-once-instantiate-per-carrier" discipline (P2) supplying the
justification for why the abstract statements were written
hypothesis-parameterized in the first place. The kernel's laws are
already locales in all but name; the bridge is their interpretation at
fabric's constants.

Three deliberate deviations, each forced by a house rule rather than by
taste:

1. **No module mechanism; transport is hand-written function application.** Isabelle transports every theorem of an interpreted locale automatically. Lean 4 has no such facility, and the substitute — a typeclass — would have to be *declared upstream* to be found by instance search (A1), editing a gated package. So the bridge writes one `theorem` line per transported fact. **Forced by:** smallest blast radius; both packages stay byte-identical. **Costs:** the bridge grows linearly in the seam count and is itself a maintained artifact. Acceptable at six seams; this design does not scale to thirty.

2. **The interpretation lives in a third package, not in either theory's library.** Every precedent surveyed puts the interpretation inside the one library. **Forced by:** both packages must keep `"packages": []` and independently green gates. **Costs:** a house-novel topology with no intra-repo precedent (four of five Lean packages have empty manifests today), and the build-directory bleed of §7. **Buys:** total rollbackability — `rm -rf verify/unity` restores the exact prior world.

3. **One obligation is discharged by a gate-side string check rather than inside the logic.** The theory-morphism tradition would insist every obligation be a proof. G6 (citation resolution) is a `grep` against fabric's roster array, not a theorem, because encoding 206 names as a Lean list inside the bridge creates a second copy of the roster — a new drift surface installed to fix an old one. **Forced by:** the drift discipline itself, not by cost. This is my lens conceding to the house.

And one deviation that is *not* forced, which I want on the record as an
argued choice: **the abstraction is a function, not a relation.**
Back/von Wright and seL4 would use a relation, because a relation can
express holder-forgetting faithfully (many fabric cells abstract to one
kernel evidence value) while a function must *pick*. I choose functions
because the house's control battery needs `decide`-able witnesses and
because a relational bridge doubles the proof obligations at every seam.
The cost is real and lands in T1: the holder choice moves from a
quantifier in the statement to a parameter in the translation. I mitigate
it by quantifying the holder in B2's statement, which recovers most of
the strength — but a purist would say B2 is still a family of
single-holder facts rather than one fact about the evidence carrier, and
the purist would be right.

---

## 10. Where my lens loses

Three places, stated plainly.

**It found the discipline, not the bug.** Precedent told me to look for
the premise that makes a greatest-wins correspondence true, and to commit
its refutation. It did not tell me that the two tie-breaks point opposite
ways — only reading `greatestSeal` and `greatestAt` side by side did
that. An architect working purely from code, with no literature at all,
finds the tie divergence faster than I did. My lens's contribution to
that finding was the *insistence on a negative control*, which is real
value, but it arrived second.

**It over-values transport at n=6.** Little theories exists because
re-proving is quadratic. At two carriers, transliteration is cheaper than
building a bridge, and the kernel lane's decision to transliterate the
admission proof was correct at the time. My recommendation to make the
morphism explicit only pays if a third carrier arrives — the fold
carrier, the register carrier, a second evidence plane. If the estate
knows that will not happen, B4 is ceremony and B1/B2/B3/B5 are the whole
bridge. I believe a third carrier is coming (KM-12's `KindContent`
family, KM-15's positioned environments, the `verify/algebra` successor
in §4 all point that way), but I am arguing from the record's direction,
not from a commitment anyone has made.

**It would have chosen a worse first theorem if I had weighted CompCert
more heavily.** The simulation tradition's instinct is to build the
relation first and prove the diagram; applied here that produces a
statement about `interp` over execution sequences, which is F13's
territory and which the kernel gate refuses by design. I only avoided it
because I read the gate script before choosing. A precedent survey that
stops at the papers picks the wrong shape here. The papers had to be
tested against `run.sh`, and the test is what settled it.

---

## Sources

Fetched this session:

- [Farmer, Guttman & Thayer, *Little Theories* (CADE-11)](https://web.cs.wpi.edu/~guttman/pubs/cade_little-theories.pdf) — PDF would not parse; the method's content above is from the search summary plus training knowledge, flagged as such.
- [Ballarin, *Locales: A Module System for Mathematical Theories*, JAR](https://link.springer.com/article/10.1007/s10817-013-9284-7)
- [Ballarin, *Tutorial to Locales and Locale Interpretation*](https://courses.grainger.illinois.edu/cs576/sp2015/doc/locales.pdf)
- [Affeldt & Cohen, *Competing Inheritance Paths in Dependent Type Theory*](https://link.springer.com/chapter/10.1007/978-3-030-51054-1_1)
- [*Use and abuse of instance parameters in the Lean mathematical library*](https://arxiv.org/abs/2202.01629)
- [*Multiple-inheritance hazards in dependently-typed algebraic hierarchies*](https://arxiv.org/pdf/2306.00617)
- [CompCert `driver.Compiler`](https://compcert.org/doc/html/compcert.driver.Compiler.html)
- [Leroy, *A formally verified compiler back-end*](https://xavierleroy.org/publi/compcert-backend.pdf)
- [Klein & Sewell, *Refinement in the Formal Verification of the seL4 Microkernel*](https://trustworthy.systems/publications/nicta_full_text/3087.pdf)
- [Cock, Klein & Sewell, *Secure microkernels, state monads and scalable refinement*](https://trustworthy.systems/publications/nictaabstracts/Cock_KS_08.abstract)
- [Gu et al., *Deep Specifications and Certified Abstraction Layers*, POPL'15](https://dl.acm.org/doi/10.1145/2676726.2676975)
- [CertiKOS DeepSpec project page](http://www.normalesup.org/~ramanana/research/certikos/deepspec/)
- [Iris `iris.algebra.lib.gmap_view`](https://plv.mpi-sws.org/coqdoc/iris/iris.algebra.lib.gmap_view.html)
- [Refinement calculus (Back & von Wright), overview](https://en.wikipedia.org/wiki/Refinement_calculus)

Training knowledge, flagged where used: the AFP's per-entry build and
`ROOT`-declared dependency model (§1, CI precedent); the details of the
little-theories obligation structure beyond the search summary; Iris's
canonical-structure mechanism.

Repository surfaces read in place at `d9a13b67f`, modified nowhere:
`verify/kernel/Kernel/{Definitions,Laws,Proofs}.lean`,
`verify/kernel/run.sh`, `verify/kernel/{lakefile.toml,lake-manifest.json,lean-toolchain}`,
`verify/kernel/{negative-controls,must-not-compile}/`,
`verify/fabric/Fabric/{Definitions,Laws,Proofs,ControlProofs,BridgeProofs,Mutants}.lean`,
`verify/fabric/run.sh`, `verify/fabric/{lakefile.toml,lake-manifest.json,lean-toolchain}`,
`verify/fabric/negative-controls/`,
`verify/fabric-veil/{FabricVeil/Statements.lean,lake-manifest.json,lean-toolchain}`,
`verify/AGENTS.md`,
`docs/research/2026-08-18-kernel-model-notes.md`,
`docs/design/2026-08-18-plait-kernel-algebra.md` §3.
