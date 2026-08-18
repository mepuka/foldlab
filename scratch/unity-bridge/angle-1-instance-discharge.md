# Unity bridge — Angle 1: instance discharge at ground carriers

**Lens.** Unity is not a simulation and not an isomorphism. It is
*instantiation*: fabric's real ground carriers are the distinguished
instance of every abstract structure the kernel names. Wherever the
kernel says "assume any associative, idempotent merge", the bridge
supplies fabric's actual merge and fabric's actual proofs, by
application — not by a lemma that says the two are "corresponding".
Wherever that shape is unavailable, this lens says so and refuses the
seam rather than manufacturing a simulation relation.

Everything below was checked against the worktree
`C:\Users\kokok\Dev\foldlab-kernel-model` (branch `agent/kernel-model`,
`d9a13b67f`). The worktree was not modified; `git status --short` is
empty after this work.

**Glossary, first use.** A *cell* is fabric's evidence container: a
finite set of `(holder, value)` pairs — who observed what — that merges
by set union. A *directory* is the same shape for naming: a finite set
of `(petname, digest)` bindings, where a *petname* is a human-facing
label and a *digest* is a content address. A *journal* is an
append-only sequence of operations each carrying a venue-local
*position*; an *anchor* is a resume coordinate `(floor, state, head)`
into one journal. The *admission door* is the kernel's single function
that takes a raw candidate act and either translates it into a lawful
sentence or refuses it with the law it defends and a repair to apply. A
*writ* is the set of referents an actor is authorised to name. A *hole*
is a declared parameter of a program; *filling* is substituting values
for holes. A *fencing token* (fabric calls the record a "seal") is a
monotone number that decides who wins a contested rebind.

---

## 0. What I verified, and how

Every count below is mine, from the worktree — the commission's
briefing numbers are corrected where they differ.

| Fact | Value | How I counted |
| --- | --- | --- |
| fabric rostered theorems | **206** | parsed the `roster=( … )` array out of `verify/fabric/run.sh` (the array the gate diffs against discovery); 206 entries, 206 unique |
| fabric declared theorems | **207** | regex `^\s*(@\[…\]\s*)?(private\|protected )?(theorem\|lemma)\s+NAME` over `verify/fabric/Fabric/*.lean`; the extra one is the single gate-pinned private helper `applySuccessors_of_completeBuffer` |
| fabric law statements | **27** | the `expected_laws=( … )` array in `verify/fabric/run.sh:73-82` |
| fabric negative controls | **16** `.cex.txt` + **27** corpus vectors | `ls verify/fabric/negative-controls/*.cex.txt`; the vector count is pinned in the gate's `expected_header` (`"vectors":27`) |
| kernel rostered theorems | **60** | same parse over `verify/kernel/run.sh`; 60 entries, 60 unique, and the gate pins the private set to empty |
| kernel law statements | **12** | `expected_laws` in `verify/kernel/run.sh:58-64`; 11 proven, `CandidateF13BoundExecutionReplay` stated-only and gate-enforced |
| kernel controls | **18** `.cex.txt` + **4** must-not-compile (each with a witness twin and a pinned diagnosis) | `ls verify/kernel/negative-controls`, `ls verify/kernel/must-not-compile` |
| kernel citation strings naming a fabric law | **8** | regex for snake-case identifiers in `verify/kernel/Kernel/*.lean` intersected with the 207 fabric names, plus the one veil name; all 8 sit in the taught refusal table, `Definitions.lean:445-489` |
| …of those, resolving in fabric | **7** | the miss is `at_most_one_landed_commit` (below) |
| taught refusal rows | **16**, of which **8** name no theorem at all | read `taught` in `Kernel/Definitions.lean:442-506` |
| prose obligation markers in kernel sources | **17 lines** | `grep -n "obligation\|cited\|never restated\|not restated\|at its own wall\|trusted base"` over `verify/kernel/Kernel/*.lean` (10 in Definitions, 5 in Laws, 2 in Proofs) |

**Four briefing corrections.**

1. Fabric is **206**, not "~200", and it does not carry an F1–F12
   sequence: the 27 statements span F1, F2, F2b, F3, F4, F7, F9, F10,
   F11, F12 and C7. There is no F5, F6 or F8 in this package — **F5 is
   the register model's, and it lives in `verify/fabric-veil` at Lean
   `v4.28.0`**, across the toolchain split. Both fabric and kernel pin
   `leanprover/lean4:v4.33.0` and both commit `"packages": []`.
2. **Fabric's merge does not ride `mergeSort`.** `Cell.merge` is
   `Std.ExtTreeSet` union (`Definitions.lean:38-39`). `mergeSort`
   appears at exactly two definition sites — `topK`
   (`Definitions.lean:450`) and `candidates` (`Definitions.lean:716`) —
   i.e. in the *derived-read* path, not the join path. The opacity is
   real but it bites the greatest-wins seam, not the merge seam, and
   fabric already ships the workaround: `candidates_eq_canonical`,
   whose own docstring says "the canonical sort itself is opaque to
   kernel reduction, while membership, sortedness, and duplicate-freedom
   of a literal listing all compute."
3. The KM notes' §1 counts (50 theorems, 17 door controls) are **stale**
   against the gate as it stands (60, 18). Drift between prose and
   roster is not a hypothetical risk here; it is already present.
4. `at_most_one_landed_commit`, cited in the kernel's taught table at
   `Definitions.lean:453`, resolves nowhere in fabric. It is
   `verify/fabric-veil/FabricVeil/Statements.lean:96`. No Lean bridge
   can discharge it.

**Compile evidence.** I copied both packages into the scratchpad
(`…/scratchpad/probe/{fabric,kernel}`), built them there, and
elaborated three probe files against both `.olean` trees with
`lake env lean`. Nothing in the worktree was built or written. Every
statement marked **[compiled]** below actually elaborated; every
statement marked **[refuted]** actually failed to elaborate, with the
error text quoted. Axiom footprints were taken with `#print axioms`.
This matters for the memo's honesty: the cheap seams are not cheap
because I estimated them cheap, they are cheap because the term
typechecked on the first attempt.

---

## 1. Unity, as a finite set of theorem statements

Unity under this lens is **ten statements**, plus one stated-with-cost
and a short list of explicit refusals. Namespace `Bridge` throughout;
`Kernel.` and `Fabric.` qualify their packages.

### The translations the statements quantify over

```lean
/-- A kernel program node, read as a fabric ledger entry: the node's
    program-scoped name becomes the work digest, and the nodes it
    consumes become the digests it pins. The generator tag and the raw
    arguments are erased — the pin order does not read them. -/
def ledgerEntry (node : Kernel.ProgramNode) : Fabric.ActionDeclaration :=
  { work := node.name, pins := node.uses }

/-- The distinguished evidence carrier: fabric's emitted ground cell,
    the finite set of holder-attributed observations the conformance
    corpus is generated over. Not a toy. -/
abbrev GroundEvidence := Fabric.Emitter.GroundCell   -- = Cell Nat Nat observationCmp

/-- A positioned provision fact, read as a fabric landed-decision
    record: the journal position becomes the fencing token, the provided
    value becomes the decided digest. The holder is constant because the
    kernel models no attribution (kernel honest bound 8) — sound,
    because fabric's own law says the holder is never an arbitration
    input, but stated here rather than hidden. -/
def decisionRecord (fact : Nat × Nat × Nat) : Fabric.Seal Nat :=
  { token := fact.1, holder := 0, digest := fact.2.2 }

def decisionsAt (facts : List (Nat × Nat × Nat)) (hole : Nat) :
    List (Fabric.Seal Nat) :=
  (facts.filter (fun fact => hole == fact.2.1)).map decisionRecord

/-- Hole epistemic stages, kernel to fabric. Both packages declare the
    same five-constructor inductive independently; this is the tripwire
    that notices if one of them renumbers. -/
def holeStage : Kernel.HoleStage -> Fabric.HoleStage
  | .opened => .opened | .filled => .filled | .disputed => .disputed
  | .decided => .decided | .sealed => .sealed
```

### U1–U10 — the unity claim

```lean
/-- U1. The two packages' derived join orders are the same predicate at
    a common carrier: kernel's `supLe` is fabric's restricted to
    `Type 0`. Everything downstream reads the same order. -/
theorem derived_orders_agree {alpha : Type}
    (sup : alpha -> alpha -> alpha) (left right : alpha) :
    Kernel.supLe sup left right = Fabric.supLe sup left right
```
**[compiled]** — `rfl`.

```lean
/-- U2. The kernel's first merge hypothesis, discharged at fabric's real
    evidence carrier. -/
theorem ground_evidence_associative : forall a b c : GroundEvidence,
    Fabric.Cell.merge (Fabric.Cell.merge a b) c =
      Fabric.Cell.merge a (Fabric.Cell.merge b c)

/-- U3. The kernel's second merge hypothesis, same carrier. -/
theorem ground_evidence_idempotent : forall a : GroundEvidence,
    Fabric.Cell.merge a a = a
```
**[compiled]** — `Fabric.cell_merge_assoc` and `Fabric.cell_merge_idem`
verbatim; no rewriting, no `conv`, no unfolding.

```lean
/-- U4. The headline. The kernel's world-growth law holds at fabric's
    ground evidence carrier under fabric's own merge: no kernel sentence
    forgets, at the estate's real cell rather than at a numeral. -/
theorem interp_grows_the_ground_world
    (contribution : Kernel.Value -> GroundEvidence)
    (act : Kernel.Act) (world : Kernel.World GroundEvidence) :
    Kernel.World.Le Fabric.Cell.merge world
      (Kernel.interp Fabric.Cell.merge contribution act world)
```
**[compiled]** — footprint `[propext, Classical.choice, Quot.sound]`.

```lean
/-- U5. Anti-vacuity companion to U4: the abstract order component is
    not an abstract order, it is observation-set inclusion. This
    statement cannot be made at a numeral carrier — there is no `∈`. -/
theorem ground_growth_is_observation_inclusion
    (contribution : Kernel.Value -> GroundEvidence)
    (act : Kernel.Act) (world : Kernel.World GroundEvidence) :
    forall observation, observation ∈ world.evidence ->
      observation ∈
        (Kernel.interp Fabric.Cell.merge contribution act world).evidence
```
**[compiled]** — via `Fabric.cell_le_iff_subset.mp`.

```lean
/-- U6. Node admission transports: a kernel program admitted node by
    node is a fabric ledger admitted declaration by declaration. -/
theorem admission_transports {nodes : List Kernel.ProgramNode} :
    Kernel.ProgramAdmission nodes -> Fabric.Admission (nodes.map ledgerEntry)

/-- U7. The consumption relation transports. This is the half that can
    fail, and the half a wrong erasure breaks. -/
theorem pins_transport {nodes : List Kernel.ProgramNode}
    {parent child : Kernel.ProgramNode} :
    Kernel.NodePins nodes parent child ->
      Fabric.PinsWithin (nodes.map ledgerEntry)
        (ledgerEntry parent) (ledgerEntry child)

/-- U8. The kernel's program-DAG well-foundedness IS fabric's C7, pulled
    back along node erasure — not an analogous proof, the same proof. -/
theorem program_wf_is_c7 {nodes : List Kernel.ProgramNode}
    (admission : Kernel.ProgramAdmission nodes) :
    WellFounded (Kernel.NodePins nodes) :=
  Subrelation.wf (fun {_ _} pins => pins_transport pins)
    (InvImage.wf ledgerEntry
      (Fabric.c7_pin_well_founded (nodes.map ledgerEntry)
        (admission_transports admission)))
```
**[compiled]** — U8 footprint `[propext, Classical.choice, Quot.sound]`.

```lean
/-- U9. Anti-vacuity companion to U8: the translation carries a real
    pin, so the transported relation is inhabited and the
    well-foundedness claim is not about the empty relation. -/
theorem translation_carries_a_real_pin :
    Fabric.PinsWithin (probeNodes.map ledgerEntry)
      { work := 1, pins := [] } { work := 2, pins := [1] }
```
**[compiled]** — `decide`, over a committed two-node ground program.

```lean
/-- U10. The tripwire: the two independently declared hole-stage
    inductives agree on rank. -/
theorem hole_stage_rank_agrees : forall stage : Kernel.HoleStage,
    (holeStage stage).rank = stage.rank
```
**[compiled]** — `cases <;> rfl`.

### U11 — stated with cost, not claimed

```lean
/-- U11. The kernel's greatest-position read of a provision chain is
    fabric's greatest-token read of the corresponding decision records.
    The kernel's environment lookup and the directory's fenced
    arbitration are ONE algebra, at the positioned instance. -/
theorem greatest_position_read_is_greatest_token_read
    (events : List (Nat × Nat)) (hole : Nat) :
    (Kernel.greatestAt (Kernel.positionedOf events) hole).map
        (fun best => best.2) =
      (Fabric.greatestSeal
        (decisionsAt (Kernel.positionedOf events) hole)).map
        (fun observed => observed.digest)
```
Not proved. Its enabling premise **is** proved (below), and its naive
unconditional cousin is **refuted** (§4, TR5). Estimated 60–120 lines,
because the two implementations decide ties in opposite directions and
the proof must route through the positions-unique lemma at every step
rather than following the recursion.

```lean
/-- U11a — the enabling premise, and the one place the bridge
    STRENGTHENS fabric. Fabric's `SealsWellFenced` ("every token names
    at most one record") is today a named premise fabric can only
    discharge by citing the register model in the other toolchain. At
    the kernel's positioned provision facts it is a theorem: journal
    positions are assigned distinct by construction. -/
theorem positioned_provision_is_well_fenced
    (events : List (Nat × Nat)) (hole : Nat) :
    Fabric.SealsWellFenced (decisionsAt (Kernel.positionedOf events) hole)
```
**[compiled]** — footprint `[propext, Quot.sound]`, with two helper
lemmas (`position_le_length`, `position_unique`).

This is the result I would lead a review with. It is the shape the
meta-objective asks for: not "the kernel matches fabric", but a bridge
that hands each model something it did not have. Fabric gains a witness
class where a cited premise becomes a proof; the kernel gains its
abstract law at a real carrier.

### What unity deliberately does NOT claim

- **No runtime claims.** Nothing about the TypeScript projection, the
  emitter binary, wall-clock behaviour, or the wire.
- **No liveness.** Nothing says a fencing token is ever granted or
  renewed; the kernel's own taught table calls grant and renew
  "runtime liveness, not grammar" (`Definitions.lean:454`).
- **No F13.** `CandidateF13BoundExecutionReplay` stays stated-only. The
  bridge inherits the kernel gate's rule that any mention of
  `CandidateF13` outside `Kernel/Laws.lean` fails the run.
- **No F5, and no landed-set dedup.** `at_most_one_landed_commit` is
  Lean 4.28 in `verify/fabric-veil`. The kernel's `interp` dedup
  (`if register.id ∈ world.landed then world else …`) is model-local.
  The bridge can transport membership monotonicity of the landed set;
  it cannot transport at-most-one, and must say so at the seam.
- **No state isomorphism.** `Kernel.World ≇ Fabric.FabricState`.
  `World.catalog : List Ref` has no `FabricState` counterpart;
  `FabricState.cells : Nat -> Cell` and `holes : Nat -> HoleStage` have
  no `World` counterpart (kernel honest bound 4). Unity is at
  **carriers** and **proof shapes**, never at states.
- **No attribution.** `decisionRecord` sets `holder := 0` because the
  kernel has no holder. No bridge statement may mention a holder.
- **Nothing above `Type 0`.** `Kernel.World : Type → Type` (verified);
  `Fabric.FabricState : … → Type (max u₁ u₂)`. The bridge is confined
  to `Type 0` carriers, which is exactly where fabric's ground carriers
  live.
- **No closure-list coverage claim.** That the kernel's `Unlawful`
  predicate exhausts the fourteen closure rows is kernel honest bound 1
  — a kernel-internal debt, not something a fabric bridge can pay.
- **No canonicalizer injectivity, no hash preimage.** Trusted base, both
  packages, unchanged.

---

## 2. Package topology

**Recommendation: a third package, `verify/bridge`.** Neither existing
package moves; both keep their independent gates and their
`"packages": []` manifests, byte for byte.

Why the alternatives lose:

- **Bridge inside `verify/fabric`.** Rejected mechanically: fabric's
  gate at `run.sh:33-35` fails unless its own `lake-manifest.json`
  matches `"packages"\s*:\s*\[\]`. Requiring kernel from fabric breaks
  fabric's gate on the first line.
- **Bridge inside `verify/kernel`.** Rejected twice: the same manifest
  check at `kernel/run.sh:25-29`, and it puts fabric's whole 206-theorem
  roster inside the kernel gate's trusted surface — precisely the cost
  KM-3 priced and the operator's posture refused.
- **No package; gate-side grep parity only.** This is cheap and should
  ship *regardless* (it catches citation drift), but it proves nothing:
  a grep cannot discharge an obligation. It belongs inside the bridge's
  gate as one check, never as the bridge.

A path `require` in the *bridge's* lakefile records the dependency in
the *bridge's* manifest. Lake does not rewrite a path dependency's
committed manifest, so fabric's and kernel's stay `[]`. This is the
whole argument for why the topology is safe, so the bridge's gate
should **prove** it rather than assume it.

### What the bridge's gate checks

1. **Toolchain and shape.** All three `lean-toolchain` files read
   `leanprover/lean4:v4.33.0`; the bridge's manifest names exactly
   `fabric` and `kernel` as path requires and nothing else.
2. **Non-interference (the anti-coupling check).** After `lake build`,
   `git diff --exit-code -- ../fabric ../kernel` must be empty, and
   `../fabric/run.sh` and `../kernel/run.sh` must each still exit 0.
   This is the check that makes "both packages stay independently
   gated" a measured fact rather than a promise.
3. **Partition**, mirroring both packages: `Bridge/Translations.lean`
   holds only definitions; `Bridge/Statements.lean` holds only
   `def U… : Prop` and is grepped for `:= by`; `Bridge/Proofs.lean`
   holds only theorems. Private/protected theorem set pinned to empty,
   as the kernel does.
4. **Roster and footprint sweep** over every bridge theorem, confined to
   `propext`, `Classical.choice`, `Quot.sound`. Measured on my probes:
   every bridge theorem I compiled stays inside that set, and the
   refutation theorem (§4, TR5) needs no axioms at all.
5. **Discharge completeness — the anti-drift wall.** A committed
   `obligations.txt`, one row per named obligation with its site
   (`Kernel/Definitions.lean:453`, …) and its disposition
   (`discharged-by: Fabric.cell_merge_assoc` / `refused: cross-toolchain`
   / `refused: no kernel carrier`). The gate diffs that file against the
   theorem roster in both directions: an obligation with no
   disposition fails, and a bridge theorem with no obligation row fails.
6. **Citation resolution.** For each law-name string in the kernel's
   taught table, grep it against fabric's `roster` array. Today: 8
   strings, 7 resolve, 1 allow-listed by name with the toolchain reason
   in a comment. A new unresolved string fails the run. This is the
   mechanical repair for kernel honest bound 12.
7. **Must-not-compile controls** for the wrong translations (§4), each
   with a witness twin and a pinned diagnosis substring — the kernel's
   precedent, reused verbatim.
8. **Hygiene, at the stricter of the two lists.** The kernel's word list
   adds `seal` to fabric's; fabric carries that bare token on **42
   lines across 8 files** (`Definitions.lean` 11, `Proofs.lean` 8,
   `ControlProofs.lean` 7, `Laws.lean` 5, `Mutants.lean` 5, others 6).
   A bridge that inherits the kernel's list and restates fabric's
   arbitration vocabulary in prose fails its own gate. The bridge's
   docstrings must say "fencing token" and "landed-decision record".
   (I confirmed empirically that `seal` is also a reserved token in Lean
   4.33 — a binder named `seal` is a parse error, which is presumably
   why the word list carries it.)
9. **F13 posture inherited:** `grep -n 'CandidateF13' Bridge/` fails.

---

## 3. The seam inventory — the per-obligation discharge table

I derived the obligation list from the 17 prose obligation markers in
`verify/kernel/Kernel/*.lean` plus the 8 law-name citations in the
taught table plus the notes-level obligations in the KM sheet (§7, §9,
§11b). Ordered by cost, cheapest first. **[c]** = compile-verified by
me; **[s]** = statement only.

| # | Kernel abstraction (site) | Fabric instance | Bridge statement | Instantiation term | Cost |
| --- | --- | --- | --- | --- | --- |
| S1 | `Kernel.supLe` (`Definitions.lean:1127`) | `Fabric.supLe` at `Type 0` | U1 | `rfl` | free **[c]** |
| S2 | `Kernel.HoleStage.rank` | `Fabric.HoleStage.rank` | U10 | `cases <;> rfl` | free **[c]** |
| S3 | merge assoc hypothesis of `KInterpInflationary` (`Laws.lean:119`) | `Fabric.cell_merge_assoc` | U2 | the fabric theorem, verbatim | free **[c]** |
| S4 | merge idem hypothesis (`Laws.lean:120`) | `Fabric.cell_merge_idem` | U3 | verbatim | free **[c]** |
| S5 | `KInterpInflationary` at an abstract `Evidence` | `Fabric.Emitter.GroundCell` | U4 | one application (below) | free **[c]** |
| S6 | `World.Le.evidence` as an abstract order | `Fabric.cell_le_iff_subset` | U5 | `.mp` of the fabric iff | free **[c]** |
| S7 | `ProgramNode` / `ProgramAdmission` (`Definitions.lean:952-971`) | `ActionDeclaration` / `Admission` (`Definitions.lean:1001-1018`) | U6 | induction on the kernel derivation, ~15 lines | cheap **[c]** |
| S8 | `NodePins` (`Definitions.lean:975`) | `PinsWithin` (`Definitions.lean:1021`) | U7 | anonymous constructor, 3 lines | cheap **[c]** |
| S9 | `KProgramPinWellFounded` (`Laws.lean:43`) | `Fabric.c7_pin_well_founded` | U8 (+U9) | `Subrelation.wf ∘ InvImage.wf`, 5 lines | cheap **[c]** |
| S10 | positions of `positionedOf` (`Definitions.lean:1078`) | `Fabric.SealsWellFenced` (`Definitions.lean:749`) | U11a | two helpers + a `mem_map` unpack, ~30 lines | moderate **[c]** |
| S11 | `Kernel.greatestAt` (`Definitions.lean:1085`) | `Fabric.greatestSeal` (`Definitions.lean:735`) | U11 | induction mirroring `greatest_seal_is_ub` / `greatest_seal_mem`, routed through S10 | 60–120 lines **[s]** |
| S12 | `World.landed : List Nat` membership | `FabricState.landed : FiniteSet Nat compare` | membership monotone under `ExtTreeSet.ofList` | one `mem_ofList` rewrite | cheap **[s]**, but see the refusal below |

**Refused seams, with reasons.** These are the seams a simulation lens
would attempt and this lens will not:

| Seam | Why refused |
| --- | --- |
| at-most-one-landed (`Definitions.lean:453`, `Laws.lean:115`) | `at_most_one_landed_commit` is `verify/fabric-veil` at Lean **4.28**. No import, no restatement (restating it here would be drift risk, not evidence — fabric says so itself at `Definitions.lean:743-751`). S12 transports membership only; the uniqueness half stays cited. |
| `World` ↔ `FabricState` | Structurally not a map: `World.catalog` has no counterpart, `FabricState.cells`/`holes` have none. Kernel honest bound 4. |
| trigger productions (`KTriggerPredicate` ↔ `TriggerPredicate`) | Lossy in both directions: kernel's `evidenceAppears` carries a lane digest and one opaque value, fabric's carries a list of holder-attributed observations; kernel's `headAdvancedPast` carries a type-indexed partition, fabric's a bare position. There is no kernel `holds` denotation to instantiate — kernel's `interp` sends `trigger` to the identity. The honest cheap artefact is a *cardinality tripwire* in the gate (five productions each side), not a theorem. |
| F11 returned-value determinism (kernel honest bound 11) | Kernel's `fold` and `resolve` are world identities and return no value. There is no kernel operation to instantiate. Revisit when a read result exists. |
| F9 / spawn attenuation (kernel honest bound: writs are not world state) | No kernel carrier for a policy. KM-7's territory. |
| F2b / F3 resumption | Kernel's `AnchorFact` is a type-indexed triple with no fold function and no journal. F13's territory, and F13 is stated-only. |

### The instantiation-term skeleton

Every discharging row has exactly this shape, and the shape is the
lens's whole claim:

```lean
theorem <kernel-law>_at_<fabric-carrier> <args> :
    <the kernel law's conclusion, with Evidence := <a fabric type>
       and the abstract operation := <a fabric operation>> :=
  Kernel.<the kernel proof> <fabric operation> <extra data>
    <Fabric.hypothesis₁> <Fabric.hypothesis₂> <args>
```

Concretely, U4, exactly as it compiled:

```lean
theorem interp_grows_the_ground_world
    (contribution : Kernel.Value -> GroundEvidence)
    (act : Kernel.Act) (world : Kernel.World GroundEvidence) :
    Kernel.World.Le Fabric.Cell.merge world
      (Kernel.interp Fabric.Cell.merge contribution act world) :=
  Kernel.interp_inflationary Fabric.Cell.merge contribution
    Fabric.cell_merge_assoc Fabric.cell_merge_idem act world
```

Three facts make that a *term* and not a tactic proof, and each is a
property of the current sources that the bridge should treat as a
protected invariant:

1. **The hypotheses are bare quantified equations on both sides.** The
   kernel writes `(forall a b c, merge (merge a b) c = merge a (merge b c))`
   as a hypothesis; fabric proves exactly that sentence. Unification
   does all the work. Fabric's `JoinSemilatticePackage` is a `def … : Prop`
   conjunction, **not** a class — if either side ever bundles ACI into a
   structure or a typeclass instance, the discharge becomes a projection
   chain and this row stops being one application.
2. **The comparator classes are `Prop`.** I checked:
   `Std.TransCmp`, `Std.LawfulEqCmp`, `Std.LawfulBEqCmp` all land in
   `Prop`, so proof irrelevance makes any two instance paths
   definitionally equal. There is no diamond risk on the merge seam.
   `BEq` is data and *does* carry diamond risk — see §5.
3. **The kernel's carrier is a bare `Type` parameter.** No instance has
   to be *constructed* at the seam; `Fabric.Cell.merge`'s own
   `[Std.TransCmp cmp]` argument resolves at the ground comparator from
   fabric's rostered `emitter_observation_comparator_lawful` and the two
   `attribute [instance]` lines beside it.

**Where definitional equality is not available.** Not on the merge seam
— that one is pure unification. It bites on the derived-read seam
(S11): `Fabric.candidates` rides `mergeSort`, and neither `rfl` nor
`decide` will reduce it. Fabric already solved this and the bridge must
copy the solution rather than fight it: go through
`candidates_eq_canonical` (sortedness + no-duplicates + membership of a
literal listing, each of which *does* compute) exactly as fabric's own
ground rows do (`contested_name_candidates`, `Proofs.lean` control
file). By contrast, `Std.ExtTreeSet` at ground values reduces fine —
fabric proves `boundDigests groundDirectory groundPetname = [100, 200]`
by `decide`.

---

## 4. Translations, where a wrong one lies, and the control that catches it

A bridge that cannot fail proves nothing. For each translation: the
lie it can tell, and the committed control that catches it. I checked
the two most important controls by compiling them and confirming they
fail.

**TR1 — `ledgerEntry` (field erasure).** Three wrong versions:

- *Drops `uses`* (`pins := []`). **This is the dangerous one, because
  half the bridge still holds.** I compiled it: `admission_transports`
  still goes through under the broken erasure — the predicate half is
  vacuity-prone. `pins_transport` fails, with:
  > `Application type mismatch: the argument pins.right.right has type`
  > `parent.name ∈ child.uses but is expected to have type`
  > `(eraseNodeDroppingUses parent).work ∈ (eraseNodeDroppingUses child).pins`

  **Control:** must-not-compile file `erasure-drops-uses.lean` pinning
  that diagnosis, plus its witness twin (the correct erasure) that must
  still elaborate. **General lesson, and the sharpest thing I found:
  the predicate half of a translation is the vacuity-prone half; the
  relation half is the falsifying half. A bridge that only transports
  `ProgramAdmission → Admission` proves nothing at all.**
- *Adds a self-pin* (`pins := node.uses ++ [node.name]`). Now
  `admission_transports` fails, at the clash between `pinsAdmitted` and
  `fresh`. Second must-not-compile file.
- *Collapses names* (`work := 0`). `admission_transports` fails at
  `fresh` on any two-node program. Refuted `.cex.txt` control.

**TR2 — the carrier choice.** The lie is instantiating at a toy. The
kernel *already contains the toy*: `ground_interp_inflationary` at
`Nat.max` (`Proofs.lean:674-677`), rostered and honest inside the
kernel as an inhabitability demonstration — and exactly what would make
a bridge vacuous if reused as the discharge. **Control:** U5. It is
stated with `∈` on a cell and therefore cannot be stated at a numeral;
it is a theorem, not a grep, so it cannot rot. (A `grep -n 'Nat.max' Bridge/`
gate line is a cheap belt on top.)

**TR3 — `decisionRecord` (position → token).** The lie is picking the
wrong field: `token := fact.2.1` (the hole name) instead of
`fact.1` (the position). Then two provisions to one hole become two
records at one token and well-fencedness is *false*. **Control:** the
kernel already ships the exact vector — `Provision.overlapOrderOne =
[(1,10), (1,99)]` and its reverse, committed as
`drop-provision-disjointness.cex.txt`. Reuse it; and fabric already
ships the mirror shape as `drop-seals-well-fenced.cex.txt`
(`vector=two-seals-one-token`).

**TR4 — list orientation. This is where a wrong translation lies most
quietly.** Three orientations coexist in these packages and they are
not the same:

| Construct | Orientation |
| --- | --- |
| `Kernel.provisionFold` (`Definitions.lean:1053`) | **newest first** — the head shadows; `provisionFold [(1,10),(1,99)] 1 = 10`, confirmed by the committed trace `mutant-left=1:10`, `mutant-right=1:99` |
| `Kernel.positionedOf` (`Definitions.lean:1078`) | head gets the **greatest** position (`rest.length + 1`), so positions **descend** down the list |
| `Fabric.positionTrace` (`Definitions.lean:117`) | head gets `floor + 1`, so positions **ascend** — head is oldest |
| `Fabric.Admission` / `greatestSeal` lists | **newest first**, the `admit` constructor conses |

So fabric's *journal* lists run oldest-first while fabric's *ledger*
lists run newest-first, and the kernel's provision chain runs
newest-first with descending positions. A bridge that reuses one
orientation lemma across both fabric list kinds — or that routes
`positionedOf` through `positionTrace` — inverts the positions,
silently flips the environment read from newest-wins to oldest-wins,
and still typechecks. That would contradict the Effect overlay
semantics the kernel is modelling and nothing in either package would
notice. **Control:** a drift control on `[(1,10),(1,99)]` where the
lawful reading yields 10 and the inverted reading yields 99 —
`renderValuation`-shaped, byte-identical in form to the control already
committed.

**TR5 — tie semantics. The one place I found where the obvious bridge
equation is outright false.** The two greatest-wins implementations
break ties in **opposite** directions:

- `Kernel.greatestAt` is a `foldr` replacing only on `prior.1 < fact.1`,
  so on a position tie the **tail** entry survives.
- `Fabric.greatestSeal` recurses with `if arrival.token < best.token
  then best else arrival`, so on a token tie the **head** entry
  survives.

Compiled witnesses, over `tiedFacts = [(5,1,100), (5,1,200)]`:
`Kernel.greatestAt tiedFacts 1 = some (5, 200)` and
`Fabric.greatestSeal (tiedFacts.map decisionRecord) = some ⟨5, 0, 100⟩`,
both by `decide`. Hence:

```lean
/-- The naive unconditional bridge is refutable. Ship this as a rostered
    theorem, not as a comment: a proven disequality is a control that
    cannot rot. -/
theorem naive_greatest_bridge_is_false :
    (Kernel.greatestAt tiedFacts 1).map (fun best => best.2) ≠
      (Fabric.greatestSeal (tiedFacts.map decisionRecord)).map
        (fun observed => observed.digest)
```
**[compiled]** — `decide`, and it depends on **no axioms at all**.

This is why U11 must be stated only at the *positioned* instance, where
U11a rules ties out, and why U11a is worth proving before U11: without
it, U11 is not merely unproven, it is false in general.

**TR6 — `holeStage`.** Any permutation is a lie. Caught by U10, a
`rfl`-per-constructor theorem that breaks the moment either package
renumbers its stages.

---

## 5. Risks

### Top three

**R1 — Vacuity by toy carrier, and by empty relation.** Two distinct
channels. (a) *Toy carrier*: the kernel already ships
`ground_interp_inflationary` at `Nat.max`; a bridge that "discharges the
merge obligation" by gesturing at it discharges nothing, and the
gesture would read plausibly in a review. Detection is U5 — a statement
that cannot be typed at a numeral. (b) *Empty relation*: every
well-foundedness and transport statement is trivially true of an empty
image, so a translation that quietly maps everything to nothing passes
U6–U8. Detection is U9, a `decide`-checked inhabitation witness over a
committed ground program. Both detections must be **theorems on the
roster**, not gate greps, because greps go stale and theorems do not.

**R2 — Gate coupling.** Three measured channels. (a) *Hygiene word
list*: the kernel forbids the bare token `seal`, fabric does not, and
fabric carries it on 42 lines across 8 files; a bridge inheriting the
stricter list and restating fabric's arbitration vocabulary fails its
own gate — the repair is a vocabulary rule for bridge docstrings, and
it must be written down before anyone writes prose. (b) *Manifest
checks*: both gates fail unless their own `lake-manifest.json` reads
`"packages": []`; a path `require` from the bridge does not rewrite
either committed manifest, but the bridge gate must *prove* that with
`git diff --exit-code -- ../fabric ../kernel` after its build rather
than assume it. (c) *Corpus path*: fabric's gate regenerates 27 vectors
and byte-compares them against
`packages/plait/fixtures/fabric-conformance.ndjson` — a path outside
`verify/`. The bridge must never touch the emitter or that fixture, and
the non-interference check is what makes that mechanical.

**R3 — Drift between citation strings and rosters.** Kernel honest
bound 12 already names it ("a fabric rename goes stale here silently"),
and it is already real: the KM notes' §1 counts (50 theorems, 17
controls) are stale against the gate (60, 18). Measured surface today:
**8** law-name strings in the taught table, **7** resolving among
fabric's 207 declared names, **1** (`at_most_one_landed_commit`)
resolving only across the Lean-4.28 toolchain split — and **8 of the 16
taught rows name no theorem at all**, so half the table is beyond any
grep's reach. The repair is the two-way `obligations.txt` diff (§2.5)
plus the citation-resolution check (§2.6) with a one-entry allow-list;
the un-nameable half stays a review obligation, and the memo should say
so rather than pretend a grep covers it.

### Also worth naming

- **Universe confinement.** `Kernel.World : Type → Type`, verified by a
  failing probe: `Kernel.World (ULift.{1,0} Nat)` errors with
  *"has type Type 1 … but is expected to have type Type"*. The bridge is
  `Type 0` only. That is fine today — fabric's ground carriers are at
  `Type 0` — but widening later means editing a gated package, not the
  bridge.
- **`BEq` diamond at the resolution seam.** The comparator classes are
  `Prop` and therefore diamond-free, but `Fabric.candidates` and
  `Fabric.resolve` take `[BEq Petname] [BEq Digest]` as **data**. Two
  bridge statements that pick different `BEq` paths are statements about
  different functions and will not unify. Any bridge statement over the
  resolution seam must pin its instances explicitly.
- **`mergeSort` opacity** — confined to `topK` and `candidates`, with
  `candidates_eq_canonical` as the ready-made route. Named here so the
  S11 cost estimate is not surprised by it.
- **Trusted-surface growth of the *claim*, not of either package.** The
  bridge widens what a reader may conclude; it does not widen what
  either gate trusts, because neither gate changes. Every bridge
  theorem I compiled stayed inside
  `{propext, Classical.choice, Quot.sound}`.

---

## 6. The one theorem I would prove first

**`program_wf_is_c7`** (U8), with its two lemmas U6 and U7 and its
anti-vacuity witness U9:

> Under node admission — every use names an already-admitted node, every
> name admits at most once — the kernel program's consumption relation
> is well-founded *because* fabric's action-ledger pin relation is,
> pulled back along the erasure that reads a program node as a ledger
> entry.

It de-risks the rest for four reasons, in order of weight.

1. **It converts a duplication into a derivation, which is a win even
   if unity is never claimed.** The kernel's `nodeRank` /
   `node_pin_rank_lt` / `program_pin_well_founded`
   (`Kernel/Proofs.lean:375-473`) and fabric's `admissionRank` /
   `pin_rank_lt` / `c7_pin_well_founded`
   (`Fabric/Proofs.lean:1712-1811`) are the *same proof written twice*
   — same recursion, same rank embedding, same
   `Subrelation.wf ∘ InvImage.wf` closer, ~100 lines each. U8 replaces
   the second copy with 20 lines. That is a maintenance result the
   estate gets whether or not anyone ever ratifies "unity".
2. **It exercises every mechanism the bridge needs, in the setting with
   the fewest confounders.** A translation function, a predicate
   transport, a relation transport, a well-foundedness pullback, an
   inhabitation witness, and a must-not-compile control — with no
   carriers, no typeclass instances, no universes, no `Quot`, no
   `mergeSort`, and no `BEq`. If the method works anywhere it works
   here; if it fails here, nothing further is worth attempting.
3. **Its falsifier is sharp and I verified it.** The wrong erasure
   passes the predicate half and fails the relation half with a precise,
   pinnable type error. That is a control that genuinely bites, and it
   teaches the generalisable lesson (predicate halves are vacuity-prone;
   relation halves falsify) that the rest of the seam inventory should
   be designed around.
4. **It is orthogonal to every open question.** It needs nothing from
   veil, nothing from F13, nothing from attribution, nothing from the
   trigger inventory, nothing above `Type 0`. If the bridge is later
   refused, deleting it costs one file and strands no statement in
   either package.

**Why not the cheaper one.** `interp_grows_the_ground_world` (U4) is a
single application and it is the headline the KM sheet actually names.
It is nonetheless the wrong first theorem: it exercises no translation
machinery at all — the "translation" is a type abbreviation — so
proving it tells you the easy seam is easy and nothing else. Worse, its
own docstring carries an adjacent citation the bridge can never
discharge (the landed-set dedup, which is veil's), so shipping it alone
maximises the overclaim risk while minimising the information gained.
It should ship in the same slice as U5, immediately after U8 has shown
that the method works.

**Where this lens loses, stated plainly.** Instance discharge buys the
carrier-level and proof-shape seams outright, cheaply, and with terms
rather than tactics. It buys nothing at all for the seams where the
kernel has no carrier to instantiate — the trigger denotation, the
returned value of a read, spawn's attenuation, the composed replay. A
simulation lens would attempt those by building a relation between
`World` and `FabricState` and proving each generator preserves it. I
think that lens overreaches on today's sources — `World.catalog` and
`FabricState.cells` have no counterparts, so the relation would have to
be partial in both directions and would prove correspondingly little —
but it is the lens that could reach seams this one refuses, and if the
estate wants those seams, this memo is not the path to them.
