# Unity bridge — angle 3: proof-shape inheritance, classified honestly

**Lens.** Unity is theorem *reuse*, and reuse has to be graded. For every
kernel proof shape the commission calls "inherited", I ask which of three
things is actually true: **(a) literal reuse** — the fabric theorem applies
through a translation function with no restatement; **(b) skeleton reuse** —
same induction or well-foundedness shape, but the statement has to be
re-proved in bridge terms; **(c) false cognate** — it looks parallel, it is
not, and claiming otherwise is the lie. The memo's centre of gravity is §3,
the seam inventory with that classification column.

**Status.** Approach memo. No code, no package, no gate written; both
packages read in place at `C:\Users\kokok\Dev\foldlab-kernel-model`, branch
`agent/kernel-model` @ `d9a13b67f`. Lean theorem *statements* appear below as
they would be spelled in a bridge; none is proved here.

**Glossary, first use.** A **cell** is fabric's evidence carrier: a finite set
of holder-attributed observations (who saw what), merged by set union. A
**journal** is an append-only positioned log; an **anchor** is the
`(floor, state, head)` coordinate you resume a fold from. The **admission
door** is the kernel's single function that takes an agent-spelled candidate
act and either translates it into a lawful sentence or refuses it with the law
it defends and a repair to try. A **writ** is the universe of referents a
declaration is allowed to name. A **digest** is a content address. A
**petname** is a human-facing name, deliberately outside identity. A
**roster** is the gate's pinned list of every public theorem in a package; a
**control** is a deliberately broken variant that the gate requires to *fail*,
with its output committed byte-for-byte.

---

## 0. Ground truth — every number below, and how I got it

The commission's briefing numbers are claims. These are measurements.

| Quantity | Verified value | How I counted |
| --- | --- | --- |
| fabric public theorems (roster) | **206** | extracted the `roster=( … )` array from `verify/fabric/run.sh` with `awk '/^roster=\(/{f=1;next} f&&/^\)/{f=0} f{print}'`, split on whitespace, `sort \| wc -l` |
| fabric theorems declared in source | **207** | `grep -rhoE "^[[:space:]]*(@\[[^]]+\][[:space:]]*)?(private[[:space:]]+)?(theorem\|lemma)[[:space:]]+[A-Za-z0-9_']+" Fabric \| wc -l` — the extra one is `private theorem applySuccessors_of_completeBuffer` (`Fabric/Proofs.lean:288`), pinned by name at `run.sh:97` |
| fabric law statements | **27** | `grep -cE '^def [A-Z]' Fabric/Laws.lean` (F1×5, F2×2, F2b×2, F3×2, F4, F7×3, F9×2, F10×2, F11×2, F12×7, C7) |
| fabric negative controls | **16** | `grep -c "^check_control " verify/fabric/run.sh`; gate's own closing line agrees ("16 law-dropping controls") |
| fabric conformance vectors | **27** | the `expected_vector_witnesses` array in `run.sh`, cross-checked against the gate's `-ne 27` assertion |
| kernel public theorems (roster) | **60** | same `awk` extraction on `verify/kernel/run.sh`; independently, `grep -rhoE "…(theorem\|lemma)…" Kernel \| wc -l` = 60, and the gate diffs the two |
| kernel law statements | **12** | `grep -cE '^def [A-Z]' Kernel/Laws.lean`; 11 carried by proofs, 1 (`CandidateF13BoundExecutionReplay`) stated-only and gate-fenced |
| kernel door controls | **18** | `grep -c "^check_control " verify/kernel/run.sh` |
| kernel must-not-compile controls | **4** | `grep -c "^check_must_not_compile " verify/kernel/run.sh` |
| fabric-law citation strings inside `Kernel.taught` | **8** | `grep -oE '\(([a-z0-9_]+)\)' Kernel/Definitions.lean \| sort -u` |
| …of those, present in fabric's roster | **7** | each name `grep -qx`'d against the extracted fabric roster |
| …of those, unreachable across the toolchain split | **1** | `at_most_one_landed_commit`, found only in `verify/fabric-veil/FabricVeil/{Proofs,Statements}.lean` |
| toolchain pins | fabric **v4.33.0**, kernel **v4.33.0**, fabric-veil **v4.28.0** | `cat verify/*/lean-toolchain` |
| dependency manifests | fabric `"packages": []`, kernel `"packages": []`, fabric-veil has a `veil` git dep | `cat verify/*/lake-manifest.json` |
| code-level cross-references between fabric and kernel | **0** | `grep -rn "Fabric\|fabric" verify/kernel/Kernel/*.lean` returns 6 hits, all in prose docstrings; `grep -rn "Kernel\." verify/fabric/Fabric/*.lean` returns none |

**Two counts in committed prose are already stale, which matters for §5.** The
KM sheet (`docs/research/2026-08-18-kernel-model-notes.md` §1) says "50
theorems" and "17 door controls"; §11b then says "57 total". `verify/kernel/README.md`
says "seventeen door controls". The gate runs **60** and **18**. Nobody lied —
the lane grew and the prose did not. That is drift, in the exact documents a
bridge would cite, before the bridge exists.

---

## 1. What "unity" is, as a finite theorem set

### 1.1 The claim, in one sentence

> **Unity** = the kernel model is a *sound abstraction* of the fabric model in
> the narrow, checkable sense that (U1) every hypothesis the kernel leaves
> abstract is discharged, through an explicit total translation function, by a
> named fabric theorem *at a carrier fabric actually ships*; (U2) every kernel
> proof shape claimed as inherited is either derived from its fabric donor
> through that translation, or is honestly re-proved and labelled as
> skeleton-only; and (U3) the translation functions are brand-, orientation-,
> and tie-faithful, witnessed by controls that fail when they are not.

Three clauses, three failure modes: U1 fails by vacuity, U2 fails by analogy
dressed as instance-hood, U3 fails by a translation that lies quietly.

### 1.2 The theorem set — twelve rows

Named `B1…B12` and detailed in §3. Grouped:

- **Vocabulary agreement (2).** `B1` the derived order agrees; `B7` the hole
  stage enum agrees, rank-preservingly.
- **Hypothesis discharge (3).** `B2` fabric's cell satisfies the kernel's two
  merge equations; `B3` the kernel's inflation law instantiated at the cell;
  `B4` the same at fabric's *ground* cell — the `Nat × Nat` carrier the 27
  conformance vectors actually run on.
- **Proof-shape inheritance (4).** `B6a` admission transports under erasure;
  `B6b` the pin relation transports; `B6c` the rank embeddings are one
  function; `B6d` the kernel's program-DAG well-foundedness *is* fabric's C7,
  reached through the erasure and not re-proved.
- **The positioned read (3).** `B8` the kernel's greatest-position read is
  fabric's greatest-token read through a reversing, per-hole-filtering
  translation; `B9a` the two premises coincide; `B9b` the support-invariance
  law fabric owns, donated to the kernel.

Plus one gate check that is not a theorem: `B13`, the citation roster diff.

### 1.3 What is deliberately NOT claimed

- **No isomorphism.** Erasure is lossy in both directions and §3 says exactly
  what each translation forgets. The kernel's program nodes carry a generator
  tag and arguments that `eraseNode` throws away; fabric's `FabricState`
  carries per-cell and hole components the kernel's `World` has no field for;
  the kernel's `World` carries a catalog `FabricState` has no field for.
- **No runtime claims.** Nothing about the TypeScript projection, the wire,
  scheduling, or execution. Both models are models.
- **No liveness.** Nothing about delivery, progress, grant, renewal, or the
  lease boundary. Fabric's `WindowCoverage` is a *premise*, never a promise,
  and the bridge inherits that posture.
- **No F13.** `CandidateF13BoundExecutionReplay` stays stated-only. Fabric
  *does* own donors for two of its three determinism hypotheses —
  `f7_assembly_reads_only_declared` for assembly, `f3_resume_exact` for
  resumption — and that is precisely why the fence must be re-erected on the
  bridge's side (§2, gate check G7). A bridge that discharges F13's premises
  without a ruling would be the overclaim KM §8 exists to prevent, delivered
  through the one door that gate cannot see.
- **No claim about the door.** The kernel's 16-row taught refusal table has no
  fabric donor (§3, FC3). It is the kernel's best work and it is outside unity.
- **No cross-toolchain claim.** `at_most_one_landed_commit` lives in
  `verify/fabric-veil` at Lean **v4.28.0** against a `veil` git dependency;
  fabric and kernel are both v4.33.0 zero-dependency. The register obligation
  stays a citation, permanently.
- **No polymorphic claim above `Type 0`.** See §4.5 — this is forced, not
  chosen, and it is a stated abstraction.

---

## 2. Package topology

### 2.1 The constraint is textual, not aesthetic

Both gates contain this line verbatim:

```
if ! grep -q 'leanprover/lean4:v4.33.0' lean-toolchain ||
    ! grep -Eq '"packages"[[:space:]]*:[[:space:]]*\[\]' lake-manifest.json; then
  echo "GATE: FAIL — toolchain or zero-dependency manifest pin moved" >&2
```

So the moment either package `require`s the other, that package's own gate
goes red on its second check, before `lake build` is even reached. The
topology question is therefore already answered by the gates; what remains is
picking the shape that keeps them green.

| Option | Verdict | Why |
| --- | --- | --- |
| T1 — fabric requires kernel | **refused** | fabric's manifest line; also inverts the dependency (the substrate would depend on the language stated over it) |
| T2 — kernel requires fabric | **refused** | kernel's manifest line; this is exactly KM-3's priced alternative, and KM-3 recommends against it on self-containment grounds |
| T3 — a third package `verify/unity/` with path requires on both | **recommended** | both upstream manifests stay `[]`; both gates untouched and byte-identical; the bridge carries its own roster, controls, footprint sweep and fences |
| T4 — no package: a prose table plus a gate-side citation grep | **do this today, regardless** | closes KM honest-bound 12 for the price of a shell loop; independent of whether T3 ever lands |
| T5 — factor the shared C7 machinery into a `Common` library both require | **refused** | makes *both* manifests non-empty; trades one clean bridge for two broken gates |

T3 is feasible in fact, not just in principle: the two packages share the
toolchain pin (v4.33.0, measured), their library roots do not collide
(`Fabric` vs `Kernel`), and their duplicated names live in disjoint namespaces
(`Fabric.supLe` / `Kernel.supLe`, `Fabric.HoleStage` / `Kernel.HoleStage`).
Fabric's only import is `Std.Data.ExtTreeSet.Lemmas`, which ships with the
toolchain — that is what lets its manifest be empty, and the bridge inherits
it.

### 2.2 What the bridge's own gate checks

Ten checks. G1–G3 are the anti-drift half, G4–G6 the house-standard half,
G7–G10 the anti-lie half.

- **G1 — upstream pins, read-only.** Assert both `lean-toolchain` files read
  v4.33.0 and both manifests read `[]`. The bridge fails; the upstreams are
  never touched. *This is the whole coupling discipline in one rule.*
- **G2 — roster hashes, pinned.** `sha256` of each upstream's sorted roster
  list against a committed constant (today: 206 names / 60 names). A rename,
  an addition, or a removal on either side trips the bridge with the diff. A
  *count* pin would be weaker — an add-plus-remove slips through — so pin the
  hash.
- **G3 — citation roster diff.** Every parenthesized fabric-law name inside
  `Kernel.taught` (8 today) must be a member of fabric's roster (7 today) or a
  line in an explicit `cross-toolchain-citations.txt` recording the package
  and its toolchain (1 today: `at_most_one_landed_commit`, fabric-veil,
  v4.28.0). This is the cheapest real check in the whole design and it closes
  a named honest bound.
- **G4 — `lake build`.**
- **G5 — roster and footprint.** The bridge's own theorem roster diffed
  against discovery, and `#print axioms` on every row confined to `propext`,
  `Classical.choice`, `Quot.sound`. Both upstream gates already permit exactly
  that triple (I compared the two `grep -Ev` lines — identical), so the union
  needs no widening.
- **G6 — source hygiene at the stricter list.** Copy the *kernel's* word list,
  which is fabric's plus `seal`. Practical consequence for whoever writes this:
  the bare lowercase word "seal" cannot appear in bridge prose. `Fabric.Seal`,
  `SealsWellFenced`, `greatestSeal`, `seals`, `sealed` and `stale_seal_inert`
  all survive the regex (it needs `seal` bounded by non-word characters on both
  sides, and `_` counts as a word character) — only the free-standing English
  noun trips it. Say "fencing token" or "the sealed binding".
- **G7 — the F13 fence, re-erected.** The kernel gate greps `CandidateF13` in
  `Kernel/Proofs.lean` and `ControlMain.lean` only. A bridge package is
  invisible to it. The same grep must run over the bridge's sources or the
  fence has a hole exactly where the strongest temptation is.
- **G8 — controls refuted with committed traces.** The three of §4.6, in the
  house `verdict=refuted` line shape, `diff -u`'d against `*.cex.txt`, with
  the orphan check both upstreams already run.
- **G9 — the anti-toy check.** The discharge rows must name
  `Fabric.Emitter.GroundCell` (or a `Fabric.Cell _ _ _`); a denylist grep
  refuses `Nat.max`, `Unit`, and `Bool` appearing as an instantiation carrier
  in the discharge file. See §5.1 for why this is not paranoia.
- **G10 — translation partition and totality.** Copy the upstream partition
  idiom: translations are `def`s in `Unity/Translations.lean`, statements in
  `Unity/Statements.lean`, proofs in `Unity/Proofs.lean`, with the same
  "no theorem in the definitions file, no definition in the proofs file, no
  `:= by` in the statements file" greps. Every translation is a total `def`
  with no `Option` escape on its lawful domain.

**One line:** a third zero-touch package `verify/unity/` requiring both by
path; its gate pins the two upstream rosters by hash, diffs the kernel's
fabric-law citation strings against fabric's roster, re-erects the F13 fence,
and refuses any discharge stated at a toy carrier.

---

## 3. The seam inventory — ordered by cost, classified (a)/(b)/(c)

### 3.1 The table

Cost is my estimate of proof effort in the house idiom: **XS** ≈ `rfl` or a
projection; **S** ≈ under ten lines; **M** ≈ one or two inductions mirroring
an existing proof; **L** ≈ new machinery.

| # | Kernel abstraction | Fabric instance | Class | Cost | Note |
| --- | --- | --- | --- | --- | --- |
| B1 | `Kernel.supLe` | `Fabric.supLe` | **(a)** | XS | textually identical definitions in disjoint namespaces; unfolds to one equation |
| B7 | `Kernel.HoleStage` + `.rank` | `Fabric.HoleStage` + `.rank` | **(a)** | XS | five constructors, same names, same rank table; a rank-preserving bijection |
| B2 | merge hypotheses (assoc, idem) | `f1_cell_merge_aci` conjuncts 2 and 3 | **(a)** | XS | a projection — fabric proves a *superset* (see §3.3) |
| B3 | `interp_inflationary` at an abstract merge | the same, at `Fabric.Cell.merge` | **(a)** | S | the kernel theorem applies unchanged; the "map" is the instantiation |
| B4 | the same, at fabric's shipped carrier | `Emitter.GroundCell` = `Cell Nat Nat observationCmp` | **(a)** | S | the anti-vacuity row; needs a fabricated holder (§4.2) |
| B13 | the 8 fabric-law citation strings | fabric's 206-name roster | *(gate, not a theorem)* | S | 7 hit, 1 is cross-toolchain by construction |
| B5 | *(vacuity control)* | — | *(control)* | S | ground carrier strictly grows; toy carrier can stall |
| B6a | `ProgramAdmission` | `Fabric.Admission` under `eraseNode` | **(a)** | M | induction mirroring `admitted_pins_have_admitted_works` |
| B6b | `NodePins` | `Fabric.PinsWithin` under `eraseNode` | **(a)** | S | three conjuncts, transported |
| B6c | `nodeRank` | `Fabric.admissionRank` under `eraseNode` | **(a)** | S | upgrades "same shape" to "same function" |
| B6d | `KProgramPinWellFounded` | `c7_pin_well_founded` | **(a)** | S given B6a/b | `Subrelation.wf` over `InvImage.wf eraseNode` |
| B10 | `World.Le` | `FabricState.Le` | **(b)** | M | one-way, lossy: the catalog clause has no destination |
| B8 | `greatestAt` | `greatestSeal` | **(b)** | M | tie orientation flips; needs a snoc lemma fabric lacks |
| B9a | positions-unique premise | `SealsWellFenced` | **(b)** | S | holds *only* after the per-hole filter (§4.4) |
| B9b | *(no kernel statement exists)* | `greatest_seal_of_support` | **(b)** | M | the bridge donates a law the kernel does not have |
| B11 | `KTriggerPredicate` closure | `f10_stability` | **(c)→(b)** | M | the kernel has no denotation; see FC1 |
| — | `admit` / `taught` (23 theorems) | `admitQueryInput` | **(c)** | — | no donor either way; see FC3 |
| — | `fill_*` (8 theorems) | — | *no seam* | — | fabric has no typed-hole algebra |
| — | encoding / membership (6) | — | *no seam* | — | kernel-original |
| — | F4 partition folds, F2b successors, F7 assembly, F11 top-k, F9 policy meet | — | *no seam* | — | the kernel has no counterpart to any of them |

### 3.2 The arithmetic of inheritance, honestly

Partitioning the kernel's **60** rostered theorems by section (I read
`Kernel/Proofs.lean` end to end and the section counts sum to 60: Encoding 4,
Membership 2, Taught 2, Door 6, Planted 17, Programs 5, Fill 8, Semantics 6,
Provision 10):

- **(a) literal reuse through a translation: 6 of 60 (10%).** The five-theorem
  Programs section, plus `evidence_absorb`.
- **(b) skeleton reuse: 5 of 60.** `world_le_refl_of_idem`,
  `interp_inflationary`, `greatest_at_cons`, `greatest_at_le_length`,
  `provision_positioned_correspondence`.
- **no donor at all: 49 of 60.** The door, the planted rows, the fill algebra,
  the encoding, most of provision.

And in the other direction, of fabric's **206** theorems, the bridge touches
roughly **fifteen** by name. So: unity in my sense certifies about a fifth of
the kernel and under a tenth of fabric. That is a real result, and it is much
smaller than "the kernel is a sound abstraction of the fabric" sounds. Say the
small number out loud or the bridge will be read as claiming the large one.

**The strongest single datum in this memo.** The kernel's Programs section is
a *name-for-name, order-for-order* transliteration of fabric's C7 section:

| `verify/kernel/Kernel/Proofs.lean` §Programs | `verify/fabric/Fabric/Proofs.lean` §C7 |
| --- | --- |
| `node_rank_lt_length` (375) | `admission_rank_lt_length` (1712) |
| `admitted_uses_have_admitted_nodes` (397) | `admitted_pins_have_admitted_works` (1736) |
| `node_pin_rank_lt` (415) | `pin_rank_lt` (1754) |
| `program_pin_well_founded` (460) | `c7_pin_well_founded` (1797) |
| `program_pin_irrefl` (470) | `c7_pin_irrefl` (1808) |

Five for five, same order, same proof strategy (`Subrelation.wf` over
`InvImage.wf` of a rank embedding), and — I checked the tactic blocks — the
same case structure down to the `rcases List.mem_cons.mp … with rfl | …`
split. This is the commission's "inherited proof shape" in its purest form.
**Today it is inheritance by copy, not by instance.** The bridge is what
converts it. And if it converts, the kernel can *delete* three of those five
proofs and keep the statements.

### 3.3 Statement-strength audit — where commutativity, totality, and decidability get in

This is my lens's specific charge, so it gets its own subsection with counts.

**Commutativity.** I read all seven of fabric's semilattice lemmas
(`Fabric/Proofs.lean:1042–1114`) and recorded each one's actual premise list:

| Lemma | assoc | comm | idem |
| --- | :-: | :-: | :-: |
| `le_refl` | | | ✔ |
| `le_antisymm` | | **✔** | |
| `le_trans` | ✔ | | |
| `le_sup_left` | ✔ | | ✔ |
| `le_sup_right` | ✔ | **✔** | ✔ |
| `sup_le` | ✔ | | |
| `absorb_inflationary` | ✔ | | ✔ |

`JoinSemilatticePackage` (`Fabric/Definitions.lean:625–632`) is the conjunction
of the first six. **The kernel's hypothesis list (assoc + idem) reaches exactly
four of those six conjuncts.** Antisymmetry and the right-upper-bound law are
unreachable without commutativity, which the kernel deliberately does not
assume — KM §7 says so in terms ("commutativity is not load-bearing for
inflation, and the premise list says so").

*What that does to the bridge:* nothing bad, and one thing important. The
direction is favourable — fabric proves *more* than the kernel asks, so B2 is a
projection and B3/B4 go through untouched. But it kills a tempting bridge row.
Anyone who writes "the kernel's world order is fabric's join-semilattice order"
has overclaimed by two conjuncts. That is FC2 below, and it must be stated as a
non-claim, not merely omitted.

Commutativity is load-bearing for a *conclusion* in exactly one fabric family:
F4, where `CommutativeAlgebra` carries `commutative` as a structure field and
`f4_partition_fold` identifies a merged set of partition folds with a
sequential interleaving. The kernel has no partition-fold construct at all, so
F4 contributes no seam in either direction.

**Totality.** This is the largest hidden cost in the bridge and it is not
visible in the kernel's statement at all. The kernel asks for two equations
over a bare function `merge : Evidence → Evidence → Evidence`. Fabric's
carrier does not *exist as a type* without a comparator: `Cell Holder Value
cmp` unfolds to `Std.ExtTreeSet (Holder × Value) cmp`. Reading fabric's
section `variable` lines, the instance classes that ride the law statements
are five: `Std.TransCmp`, `Std.LawfulEqCmp`, `BEq`, `LawfulBEq`,
`Std.LawfulBEqCmp`. `F1CellMergeACI` is *stated* under `[Std.TransCmp cmp]`
(`Laws.lean:10–12`) but `f1_cell_merge_aci` is *proved* in a section that adds
`[Std.LawfulEqCmp cmp]` (`Proofs.lean:12`), so the theorem's real signature
carries both.

*What that does to the bridge:* the honest unity sentence is not "the fabric
cell satisfies the kernel's two hypotheses." It is "the fabric cell satisfies
the kernel's two hypotheses **given a transitive, equality-reflecting total
comparator on observations**." At the polymorphic row (B2/B3) those ride as
instance premises. At the ground row (B4) fabric discharges them outright —
`emitter_observation_comparator_lawful` proves the concrete
`compareLex (compareOn (·.1)) (compareOn (·.2))` satisfies all three classes.
That is another reason B4 and not B3 is the row that matters.

One piece of luck worth recording: both models arbitrate over `Nat`. Fabric's
`Seal.token : Nat` and the kernel's positions are both bare numerals, and
`greatest_seal_is_ub` reaches for `Nat.le_antisymm` / `Nat.le_of_not_lt`
directly. There is no abstract-order mismatch to negotiate at the one seam
where you would most expect one.

**Decidability.** Both sides are decidable-flavoured — `refMember`,
`holdsBool`, `SameDeliveredSet` via `List.contains`, `dedup` via `BEq`,
`DecidableEq` derived on every kernel inductive — with **one exception, and it
runs the wrong way.** `Kernel.Valuation := Nat → Option Nat` is a *function*:
infinite domain, no decidable equality, no extensionality outside `funext`.
Every other carrier in both packages is finite. Consequence for the bridge:
any row equating a valuation with a directory-derived read must be stated
pointwise (`∀ hole, …`), and any *control* over valuations is a sampled,
bounded observation. The kernel already lives with this — its
`renderValuation` (`ControlMain.lean`) samples holes 1 and 2 and nothing else,
so the committed `drop-provision-disjointness` trace certifies exactly two
holes. A bridge control inherits that bound and must say so, per the verify
contract's "a bounded check certifies only its bounds."

**Two toolchain textures that shape the proofs, not the statements.**
`mergeSort` is opaque to kernel reduction, and fabric routes around it
visibly: `contested_name_candidates` (`ControlProofs.lean:437`) proves a ground
candidate listing via `candidates_eq_canonical` plus `decide` on
`boundDigests`, never `decide` on `candidates` itself. The bridge must keep
its positioned-read rows *below* `resolve` — at `greatestSeal`/`greatestAt`,
which are plain recursion and foldr — for exactly this reason. And the
`match`-on-literal idiom the kernel already uses at
`Kernel/Proofs.lean:793–855` (`rw [greatest_at_cons]`, `dsimp only []`,
`by_cases`, `cases prior : …`) is the worked template for B8, which is why I
price B8 at M rather than L.

### 3.4 The false cognates — eight of them

These are the pairs where a bridge row *could* be written, would elaborate,
and would be a lie or an overclaim.

**FC1 — the closed trigger grammar is not F10 stability.** Both packages have
a five-production monotone trigger grammar with the same production names. The
kernel proves *closure*: the datatype has no constructor for absence,
negation, or deadline, and `predicateRefusal` refuses their candidate
spellings. Fabric proves *stability*: `f10_stability` says a predicate holding
at a state holds at every componentwise-grown state. These are different
claims. **The kernel has no `holds` at all** — I grepped; `KTriggerPredicate`
appears only in `encodePred`, the `Act.trigger` constructor,
`translatePredicate` and `predicateRefusal`, and `interp` maps `.trigger _ _`
to the identity. So there is no kernel statement for `f10_stability` to be an
instance of. Repair (B11): define the denotation *in the bridge*, which forces
the erasure of the lane and the partition to be written down and gated — the
value is in the forcing, not in the theorem, which is a one-line application
of `f10_stability`.

**FC2 — the abstract world is not a join-semilattice.** Four of six conjuncts,
per §3.3. State the non-claim.

**FC3 — the door has no fabric donor.** Fabric's only admission function is
`admitQueryInput` (`Definitions.lean:494`): three lawful query inputs pass,
three ambient ones map to `none`. The kernel's `admit` dispatches 11 candidate
constructors into a 16-row taught table carrying a defended law and a repair
each, with a proven parity law. Neither instantiates the other. The 23 kernel
theorems in the Door and Planted sections are outside unity, and that is fine —
they are the kernel's best work.

**FC4 — `greatestAt` and `greatestSeal` resolve ties in opposite directions.**
Full treatment in §4.4. This is the sharpest one.

**FC5 — `positionedOf` and `positionTrace` run in opposite directions.**
Fabric's `positionTrace floor (op :: ops) = ⟨floor+1, op⟩ :: positionTrace (floor+1) ops`
— the head gets the *lowest* position, ascending along the list. The kernel's
`positionedOf (e :: rest) = (rest.length + 1, …) :: positionedOf rest` — the
head gets the *highest*, descending along the list. Any bridge row touching
positions needs a reversal, and a row that omits it is true on lists of length
at most one.

**FC6 — a valuation is not a directory.** KM-15's slogan "environments are
directories" is a good ruling and a bad bridge statement: `Valuation` is a
function on an infinite domain, `Directory` is a finite set of pairs. The
translation runs one way only (directory → valuation, via the
greatest-position read), and the reverse does not exist. State the embedding,
not the equivalence.

**FC7 — the kernel has no holder, so the F1/F2 correspondence is to the value
half only.** Fabric's observation is `Holder × Value`; the kernel's `emit`
carries a lane and a body and its world's contribution is a bare value. KM
honest bound 8 already concedes this. The bridge's contribution function must
*fabricate* a holder (§4.2). It is lawful, but the reason it is lawful is a
fabric theorem, and it must be cited, not assumed.

**FC8 — F13's premises have donors, and the fence must hold anyway.**
`f7_assembly_reads_only_declared` is exactly the assembly-determinism frame
F13 hypothesizes; `f3_resume_exact` is a function equation and therefore
trivially the resumption hypothesis. Writing those two rows would be cheap and
would discharge two of F13's three premises against real fabric theorems, and
it is *forbidden* until the estate rules where the composition is proved and
against which concrete hops. G7 is the mechanism.

---

## 4. Translation functions, where a wrong one lies, and the controls

Five translations. For each: what it is, what it forgets, where a wrong
version would be silently true, and the control that would catch it.

### 4.1 Brand erasure at node scale — `eraseNode`

```lean
namespace Unity

/-- Node-scale brand erasure: a program node's DAG content is exactly a
    fabric action declaration. Lossy by construction — the generator tag
    and the raw arguments have no destination, and no bridge row may
    depend on them. -/
def eraseNode (node : Kernel.ProgramNode) : Fabric.ActionDeclaration :=
  { work := node.name, pins := node.uses }
```

**Forgets:** `generator : GenTag` and `args : List RawArg`.

**Where a wrong version lies:** erasure-based bridges are monotone in what
they forget. If a later slice adds a law about generators — say, "a `decide`
node may not consume a `fold` node" — `eraseNode` ignores it and every bridge
row keeps passing. The bridge would certify a kernel that had grown a
constraint the fabric side never sees.

**Control:** a *lossiness statement*, gated as a row rather than left in
prose: two nodes differing only in generator erase to the same declaration.
That makes the forgetting a committed fact, so a future law about generators
collides with a theorem instead of slipping past.

```lean
theorem erase_forgets_generator (name : Nat) (args : List Kernel.RawArg)
    (uses : List Nat) :
    eraseNode { name, generator := .emit, args, uses }
      = eraseNode { name, generator := .decide, args, uses }
```

**The rows themselves:**

```lean
theorem admission_erases {nodes : List Kernel.ProgramNode}
    (admitted : Kernel.ProgramAdmission nodes) :
    Fabric.Admission (nodes.map eraseNode)

theorem pins_erase {nodes : List Kernel.ProgramNode}
    {parent child : Kernel.ProgramNode}
    (pins : Kernel.NodePins nodes parent child) :
    Fabric.PinsWithin (nodes.map eraseNode) (eraseNode parent) (eraseNode child)

theorem rank_erases (nodes : List Kernel.ProgramNode) (name : Nat) :
    Kernel.nodeRank nodes name
      = Fabric.admissionRank (nodes.map eraseNode) name

/-- The commission's claim, settled: the kernel's program-DAG
    well-foundedness is fabric's C7 reached through the erasure, not a
    parallel proof. -/
theorem kernel_pin_wf_is_c7 (nodes : List Kernel.ProgramNode)
    (admitted : Kernel.ProgramAdmission nodes) :
    WellFounded (Kernel.NodePins nodes)
```

`rank_erases` is optional for `kernel_pin_wf_is_c7` — `InvImage.wf` needs no
injectivity and no rank agreement. I would prove it anyway, because it is the
difference between "the two proofs have the same shape" and "the two proofs
use the same function," and that difference is the whole (a)-versus-(b)
distinction.

### 4.2 The evidence contribution — a fabricated holder

```lean
/-- The kernel's evidence contribution at fabric's shipped ground carrier.
    The kernel carries no holder (its `emit` is lane-and-body), so the
    translation supplies the constant one. Lawful because fabric proves
    arbitration never reads the holder — cited, not assumed. -/
def groundContribution (value : Kernel.Value) : Fabric.Emitter.GroundCell :=
  Fabric.Cell.singleton (0, value.bytes)
```

**Forgets:** attribution entirely, and the lane (the kernel's `emit` names a
lane that the fabric evidence cell has no field for).

**Where a wrong version lies:** if the constant holder were load-bearing —
if arbitration read the "who" — then collapsing every holder to `0` would
merge observations that the real fabric keeps distinct, and every inflation row
would still pass, because inflation is monotone and merging *more* only grows
the carrier. A wrong holder translation is invisible to every row in §3.

**What makes it lawful:** fabric proves the holder is never an arbitration
input (`token_arbitration_keeps_aligned_row`,
`drop_token_arbitration_killed`, and the docstring on `Seal` says it in
words: "the token decides, never the who"). The bridge must cite those by
name in the translation's docstring, and G3-style checking should extend to
them.

### 4.3 The world-to-state map — lossy simulation

```lean
def stateOfWorld {Holder Value : Type}
    {cmp : Fabric.Observation Holder Value → Fabric.Observation Holder Value → Ordering}
    [Std.TransCmp cmp]
    (cells : Nat → Fabric.Cell Holder Value cmp)
    (holes : Nat → Fabric.HoleStage)
    (world : Kernel.World (Fabric.Cell Holder Value cmp)) :
    Fabric.FabricState Holder Value cmp :=
  { evidence := world.evidence, cells, holes,
    landed := Std.ExtTreeSet.ofList world.landed compare,
    head := world.head }

/-- One-way simulation. The catalog clause of `World.Le` has no
    destination in `FabricState.Le`, and the `cells`/`holes` clauses of
    `FabricState.Le` are discharged by the constant arguments — neither
    is evidence of anything and the name says so. -/
theorem world_le_simulates_state_le
    {Holder Value : Type} {cmp} [Std.TransCmp cmp] [Std.LawfulEqCmp cmp]
    (cells : Nat → Fabric.Cell Holder Value cmp)
    (holes : Nat → Fabric.HoleStage)
    {before after : Kernel.World (Fabric.Cell Holder Value cmp)}
    (grow : Kernel.World.Le Fabric.Cell.merge before after) :
    Fabric.FabricState.Le (stateOfWorld cells holes before)
                          (stateOfWorld cells holes after)
```

**Where a wrong version lies:** two of the five `FabricState.Le` clauses
(`cells`, `holes`) are *free* when the arguments are constant — reflexivity of
`supLe` and `Nat.le_refl`. A reader counting "five clauses discharged" would be
counting two that carry no information. The honest report is three of five,
and the row's name should not suggest otherwise.

### 4.4 The positioned read — the tie flip

This is the seam where a wrong translation lies most quietly, and I verified
the disagreement by hand against both definitions.

Fabric (`Definitions.lean:735–741`):

```
greatestSeal (arrival :: rest) =
  match greatestSeal rest with
  | none      => some arrival
  | some best => if arrival.token < best.token then some best else some arrival
```

At a tie, `arrival.token < best.token` is false, so `arrival` — the **head** —
is kept. The docstring agrees: "at a token tie the earlier arrival is kept."

Kernel (`Definitions.lean:1085–1096`), a `foldr`:

```
greatestAt facts hole = facts.foldr (fun fact best =>
  if hole == fact.2.1 then
    match best with
    | none       => some (fact.1, fact.2.2)
    | some prior => if prior.1 < fact.1 then some (fact.1, fact.2.2) else some prior
  else best) none
```

`foldr` reaches the tail first, so `prior` is the tail's answer; at a tie,
`prior.1 < fact.1` is false, so `prior` — the **tail** — is kept.

**Both docstrings say "no tie is decided here." Both are wrong in the same way
and in opposite directions.** Under each package's own premise
(`SealsWellFenced`; positions unique) no tie exists, so neither is caught.

Worked witness. Take `facts = [(5, 1, 10), (5, 1, 99)]` — two facts, both at
hole 1, both at position 5.

- `greatestAt facts 1` = `some (5, 99)` — the tail.
- `greatestSeal [⟨5,0,10⟩, ⟨5,0,99⟩]` = `some ⟨5,0,10⟩` → `(5, 10)` — the head.
- `greatestSeal` of the **reversed** list = `some ⟨5,0,99⟩` → `(5, 99)`. Matches.

So the reversal is the exact repair, and it is invisible everywhere else: at
`facts = [(3,1,a), (7,1,b)]` both orientations return `(7, b)`.

```lean
def toSeal (fact : Nat × Nat × Nat) : Fabric.Seal Nat :=
  { token := fact.1, holder := 0, digest := fact.2.2 }

/-- The positioned facts at one hole, in fabric's arrival orientation.
    Two things are load-bearing and both are invisible at unique
    positions: the per-hole filter (without it `toSeal` is not injective,
    and the fabric premise becomes weaker than the kernel premise it is
    meant to discharge), and the reversal (the kernel's read keeps the
    last element at a tied position, fabric's keeps the first). -/
def sealsAt (hole : Nat) (facts : List (Nat × Nat × Nat)) :
    List (Fabric.Seal Nat) :=
  ((facts.filter (fun fact => hole == fact.2.1)).map toSeal).reverse

theorem greatest_at_is_greatest_seal
    (facts : List (Nat × Nat × Nat)) (hole : Nat) :
    Kernel.greatestAt facts hole
      = (Fabric.greatestSeal (sealsAt hole facts)).map
          (fun top => (top.token, top.digest))
```

**The second lie, in the same translation.** `toSeal` sets `holder := 0`, so
across holes it is *not* injective: `(5,1,10)` and `(5,2,10)` both map to
`⟨5,0,10⟩`. If someone drops the per-hole filter and writes
`facts.map toSeal`, then `SealsWellFenced` on that list is **satisfied** —
the two entries are literally the same fencing token record — while the facts
they came from violate journal position uniqueness. The bridge would then
transport `greatest_seal_of_support` under a premise fabric never actually
checked. With the filter, `toSeal` is injective within one hole (position and
value determine the fact) and the premise correspondence holds:

```lean
def PositionsUniqueAt (hole : Nat) (facts : List (Nat × Nat × Nat)) : Prop :=
  ∀ left ∈ facts, ∀ right ∈ facts,
    hole = left.2.1 → hole = right.2.1 → left.1 = right.1 → left = right

theorem positions_unique_iff_well_fenced
    (hole : Nat) (facts : List (Nat × Nat × Nat)) :
    PositionsUniqueAt hole facts ↔ Fabric.SealsWellFenced (sealsAt hole facts)
```

**The donation.** With B8 and B9a in hand, fabric's support-invariance law
transports into the kernel's vocabulary — a law the kernel does not currently
have:

```lean
/-- Support invariance for the positioned provision read, inherited from
    fabric's fenced resolution: permutation and duplication of the
    positioned facts at a hole cannot move the read. -/
theorem provision_read_of_support
    (hole : Nat) (left right : List (Nat × Nat × Nat))
    (unique : PositionsUniqueAt hole left)
    (same : Fabric.SameDeliveredSet (sealsAt hole left) (sealsAt hole right)) :
    Kernel.greatestAt left hole = Kernel.greatestAt right hole

/-- …and at the kernel's own provision chains, where uniqueness is free
    because `positionedOf` assigns strictly decreasing positions. Composed
    through `Kernel.provision_positioned_correspondence`. -/
theorem provision_fold_of_support
    (hole : Nat) (left right : List (Nat × Nat))
    (same : Fabric.SameDeliveredSet
      (sealsAt hole (Kernel.positionedOf left))
      (sealsAt hole (Kernel.positionedOf right))) :
    Kernel.provisionFold left hole = Kernel.provisionFold right hole
```

KM §11b says this half is "the fabric's `f12_greatest_seal_wins` /
`greatest_seal_of_support` shape verbatim, cited as the instantiation
obligation." It is *not* verbatim — it is verbatim-after-a-reversal-and-a-
filter, and the two corrections are exactly where the lies live. Naming that is
the single most useful thing this angle produces.

**Cost note.** `sealsAt` puts a `.reverse` on the fabric side, so the induction
for B8 hits `greatestSeal (xs ++ [s])`, and fabric has no snoc lemma — it has
`stale_seal_inert` for cons only. That ~15-line lemma is a genuine
contribution back to fabric, and it is the one place the bridge writes new
fabric-flavoured machinery.

### 4.5 The universe pin — forced, and worth stating

`Kernel.World` is declared `structure World (Evidence : Type)` and
`Kernel.interp {Evidence : Type}` — both at `Type 0`. Fabric is
universe-polymorphic (`universe uH uV`), so its theorems specialize freely to
`uH := 0, uV := 0`, and `Cell Holder Value cmp : Type` whenever
`Holder Value : Type`. So every bridge row that mentions `Kernel.World` must
pin `Holder Value : Type`. That covers `Emitter.GroundCell` exactly (its
carrier is `Nat × Nat`), so nothing real is lost — but a bridge written at
`Type uH` will simply not elaborate, and the reason should be in the memo
before someone spends an afternoon on it. It is a stated abstraction: **unity
is claimed at universe level zero.**

### 4.6 The three controls — a bridge that cannot fail proves nothing

House shape, copied from `Kernel/ControlMain.lean`'s `showDriftControl`
("refuted when the lawful side agrees across two orders and the mutant side
disagrees"), with committed `*.cex.txt` traces.

**C1 — `tie-orientation`.** Vector: `facts = [(5,1,10),(5,1,99)]`.
Lawful sides: `greatestAt facts 1` versus `greatestSeal (sealsAt 1 facts)`
projected — must **agree** (`5:99` both). Mutant sides: the same with
`.reverse` dropped from `sealsAt` — must **disagree** (`5:99` versus `5:10`).
This control fails the moment someone "simplifies" the translation by removing
the reversal, and it fails nowhere else.

**C2 — `unfiltered-holder-collapse`.** Vector:
`facts = [(5,1,10),(5,2,10)]`. Lawful side: `PositionsUniqueAt` fails at the
global reading while `Fabric.SealsWellFenced (facts.map toSeal)` *holds* —
the two are visibly out of step. Mutant: the premise correspondence stated
without the per-hole filter. Refuted because the mutant claims a premise
correspondence the vector falsifies. This is the only control that catches the
fabricated holder.

**C3 — `toy-carrier-vacuity`.** Two rows, one lawful and one degenerate.

```lean
/-- At fabric's shipped carrier a fresh emit strictly moves the evidence,
    so the inflation law is not being read where every world is already
    its own successor. -/
theorem ground_emit_strictly_grows
    (lane : Kernel.Digest Kernel.DeclKind.lane)
    (world : Kernel.World Fabric.Emitter.GroundCell)
    (fresh : world.evidence = Fabric.Cell.empty) :
    (Kernel.interp Fabric.Cell.merge groundContribution
        (.emit lane ⟨7⟩) world).evidence ≠ world.evidence

/-- At the demonstration carrier the kernel already ships, it need not:
    the numeral maximum absorbs a smaller contribution and the world does
    not move. The pair is the vacuity control — the bridge's discharge
    rows must name the ground cell, never the demonstration carrier. -/
theorem toy_emit_can_stall
    (lane : Kernel.Digest Kernel.DeclKind.lane) :
    (Kernel.interp Nat.max Kernel.Value.bytes (.emit lane ⟨3⟩)
        { evidence := 9, catalog := [], landed := [], head := 0 }).evidence = 9
```

The temptation this guards against is already sitting in the kernel package:
`ground_interp_inflationary` (`Proofs.lean:674`) instantiates the inflation law
at `Nat.max` with `Value.bytes`. It is honestly labelled a *demonstration*
carrier, and it is exactly what a hurried bridge would reuse.

**A fourth control I considered and rejected.** A "position orientation"
control for FC5 (`positionedOf` versus `positionTrace`). It would be real, but
no bridge row in §3 crosses that seam — the positioned-journal family (F2b/F3)
has no kernel counterpart. Adding the control would gate a translation nobody
wrote. Note the trap in prose instead, and add the control the day a row
crosses it.

---

## 5. Risks

### 5.1 Vacuity

Three distinct flavours, only the first of which is usually named.

**Toy-carrier vacuity.** Discharging at `Nat.max` or `Unit` instead of
`Cell Nat Nat observationCmp`. Concretely available: fabric's own
`Mutants.leftBiasedCellMerge` (`left _right := left`, the first projection) is
associative and idempotent and *not* commutative — fabric proves both halves
(`drop_commutativity_keeps_associativity`,
`drop_commutativity_keeps_idempotence`). It is therefore a perfect witness that
the kernel's premise set is strictly weaker than fabric's, **and** a perfect
toy at which every inflation row is trivially true (`supLe π₁ a b` reduces to
`a = a`). The same object serves two opposite purposes, which is precisely why
G9 must name the carrier textually and C3 must exhibit strict growth.

**Premise-strength vacuity.** A transported theorem whose premise is stronger
than anything the estate can supply never fires. Watch B9a in both directions:
too strong and the law is decorative; too weak — the unfiltered-`toSeal`
reading — and the bridge claims more than fabric checked. C2 is the guard.

**Statement vacuity.** Clauses that are free after unfolding. B10 has two of
five (§4.3). The mitigation is naming and counting honestly, not a control.

### 5.2 Gate coupling

Three failure modes, all avoidable by construction.

- **The bridge re-running upstream gates.** Tempting (it would prove the
  upstreams still pass) and wrong: build time triples, an upstream flake goes
  red on the bridge, and worse, the bridge acquires a *reason* to want upstream
  changes. G1 is a read-only pin instead. Rule, written into the bridge's own
  scoped contract: **the bridge fails; the upstreams never do.**
- **A `require` landing in fabric or kernel.** Immediately red on their own
  manifest lines, so this one is self-policing — which is a compliment to
  whoever wrote those two gate lines.
- **The roster pin becoming a tax.** G2 makes every fabric refactor trip the
  bridge. That is the desired direction, but under deadline pressure the pin
  gets weakened to a count, and a rename-plus-add then slips through. Pin the
  hash, and write the reason next to it.

A fourth, subtler one: **the F13 fence has a hole the day the bridge exists.**
The kernel gate greps only its own two files. G7 closes it, and it should be
the first line of the bridge's gate, not the last.

### 5.3 Drift between citation strings and rosters

This is not hypothetical; it is measurable today.

- **The citation strings.** 8 fabric-law names appear inside `Kernel.taught`,
  carried as plain `String` fields in the refusal table and printed verbatim
  into committed control traces — `closure-last-writer-wins.cex.txt` contains
  `law:cells merge by join under a declared ACI algebra (f1_cell_merge_aci)`.
  7 are live fabric roster names; 1 is unreachable across the toolchain split.
  A fabric rename goes stale here silently *and* the stale name ships in a
  byte-pinned control trace. KM honest bound 12 names this; G3 closes it for
  the price of a shell loop, and it is the one piece of the bridge worth doing
  before anything else.
- **Roster renames at large.** Fabric's 206 names are free to move under a
  fabric-local refactor with no signal to the kernel at all.
- **Prose counts already stale.** KM §1 says 50 theorems and 17 controls; KM
  §11b says 57; the README says seventeen; the gate runs 60 and 18. The
  documents a bridge would cite as its map of the territory are already behind
  the territory. Any bridge memo — including this one — should quote the gate,
  never the prose, and should say which it quoted.

---

## 6. The one theorem I would prove first

**`kernel_pin_wf_is_c7`** — the kernel's program-DAG well-foundedness derived
from `Fabric.c7_pin_well_founded` through `eraseNode`, together with its two
transport lemmas.

```lean
theorem kernel_pin_wf_is_c7 (nodes : List Kernel.ProgramNode)
    (admitted : Kernel.ProgramAdmission nodes) :
    WellFounded (Kernel.NodePins nodes)
```

**Why this one de-risks the rest.**

1. **It settles the commission's central claim outright, in one direction.**
   "Inherited proof shapes are instances, not analogy" is either true here or
   it is true nowhere: this is the one place in the repository where two
   five-theorem sections match name-for-name and order-for-order (§3.2). If it
   lands, class (a) is demonstrated to exist and the erasure methodology is
   validated for every other row. If it does not land cheaply, the honest
   verdict is that *everything* is skeleton reuse, and the bridge's whole value
   proposition changes shape before anyone has built a package around it.
2. **It exercises the full technique on the smallest surface.** An erasure map,
   transport of an inductive predicate, and well-foundedness through
   `InvImage.wf` — the three moves every other (a) row needs — over lists of
   `Nat`s, with no carriers, no typeclasses, no universes, and no comparators.
   Every hazard in §3.3 and §4 is absent here, so a failure is attributable to
   the *idea* rather than to a texture.
3. **It is falsifiable in an interesting way.** If `ProgramAdmission` turns out
   to differ from `Admission` in any load-bearing respect — say, freshness over
   `(name, generator)` pairs rather than names — the transport fails and reveals
   a false cognate hiding inside the most convincing-looking parallel in the
   repository. That is a finding worth having early.
4. **It pays immediately.** On success the kernel can delete
   `node_rank_lt_length`, `admitted_uses_have_admitted_nodes`, and
   `node_pin_rank_lt` — three of its 60 — keeping the statements and inheriting
   the proofs. A bridge that *removes* duplicated proof is a bridge that has
   earned its gate.

**Sequenced with it, in the same slice:** ship control **C1** (the tie flip)
*before* its theorem. C1 costs a vector and a trace, and it pins the
`greatestAt`/`greatestSeal` orientation into the record before anyone writes
the translation that would otherwise get it wrong quietly. Cheap insurance
against the one lie this whole angle exists to find.

---

## 7. Where this lens loses

Committed to honestly, per the meta-objective.

- **Proof-shape inheritance says nothing about meaning.** Two models can share
  induction skeletons and denote unrelated systems. A denotational lens — pick
  one semantics, prove both models sound for it — would catch meaning-level
  divergence that my classification is structurally blind to. My bridge would
  happily certify a world in which the kernel's `emit` and fabric's evidence
  absorb are proof-theoretically parallel and semantically unrelated. If a
  sibling architect proposes that lens, it dominates mine on exactly this axis
  and I would concede the point.
- **It writes off the door.** Twenty-three of the kernel's 60 theorems — the
  admission door, refusal parity, the fourteen planted closure rows — land in
  "no donor," i.e. outside unity. That is the kernel's most distinctive work
  and my lens has nothing to say about it. A refusal-centric lens would put the
  door at the centre and ask what fabric's 16 controls can say about the
  kernel's 18. I would argue back that unity claims should cover what can be
  *proved* shared, and the door genuinely is not shared — but the honest cost
  is that my unity certifies roughly a fifth of one package and under a tenth
  of the other (§3.2).
- **Erasure bridges are monotone in what they forget.** `eraseNode` throws away
  the generator and the arguments; every future kernel law about them is
  invisible to the bridge, which keeps passing. §4.1's lossiness row mitigates
  this but does not solve it — the general problem is that a bridge built on
  forgetful maps gets *easier* as the kernel gets richer, which is the wrong
  gradient.
- **It underweights the negative-control asymmetry.** Fabric's controls are
  law-dropping mutants over shipped carriers; the kernel's are door refusals
  over planted programs. My classification treats controls as evidence about
  theorems, and so has no vocabulary for asking whether the two *control
  disciplines* are unified. They probably are not, and that might be the more
  interesting question.

---

## 8. Sources — read in place, nothing modified

Worktree `C:\Users\kokok\Dev\foldlab-kernel-model`, branch `agent/kernel-model`
@ `d9a13b67f`:

- `verify/kernel/Kernel/Definitions.lean` (1203 lines, whole),
  `verify/kernel/Kernel/Laws.lean` (156, whole),
  `verify/kernel/Kernel/Proofs.lean` (859, whole),
  `verify/kernel/run.sh` (272, whole), `verify/kernel/ControlMain.lean`,
  `verify/kernel/README.md`, the 18 committed `negative-controls/*.cex.txt`
  and the 4 `must-not-compile/` triples (listed, three read).
- `verify/fabric/Fabric/Definitions.lean` (1040, whole),
  `verify/fabric/Fabric/Laws.lean` (333, whole),
  `verify/fabric/Fabric/Proofs.lean` (1896; §F1, §F2, §F3, §JoinSemilattice,
  §CellSemilattice, §F12Directory, §F12Resolution, §F10, §C7, §Compaction read
  in full; §F2b, §F4, §F9, §F7, §F11 read at statement level),
  `verify/fabric/Fabric/ControlProofs.lean` (drop-idempotence,
  drop-commutativity, the F12 ground-candidate rows),
  `verify/fabric/Fabric/Mutants.lean` (the two merge mutants),
  `verify/fabric/Fabric/BridgeProofs.lean` (header and theorem list),
  `verify/fabric/run.sh` (whole).
- `docs/research/2026-08-18-kernel-model-notes.md` (685, whole — §7 KM-3, §9
  bounds 1–12, §11b the Effect correspondence and the CALM decomposition).
- `docs/design/2026-08-18-plait-kernel-algebra.md` §3 (the settled-law table),
  §4.1–4.2, heading map of the whole.
- `verify/AGENTS.md`, `verify/CONTEXT.md` (gate law and control vocabulary);
  `verify/*/lean-toolchain`, `verify/*/lake-manifest.json`,
  `verify/{fabric,kernel}/lakefile.toml` (topology facts);
  `verify/fabric-veil/` (existence and toolchain pin only — nothing crosses).
