# Plait proof lane — adequacy audit and proof-obligation program

> **LANDED BY THE COORDINATOR, 2026-08-17**, with dispositions:
> **A-1/A-2/A-3** ride PR #71 (brief 34 items 4 and 3 plus the ledger
> sentence) — under adversarial review as DEV-717; E4 stays held behind
> the bridge lemma exactly as recommendation 1 asks. **A-4** repaired
> same day (part 1's four stale floor-guard sites amended to the
> successor-discipline posture; the §10/§11 control texts now demand the
> discipline-dropped mutant, since `guard_is_redundant` proves the
> guard-removal control unstatable). **A-5** queued as a follow-up-brief
> candidate after the DEV-717 round closes (no mid-review scope, ratified
> item 19). **B-3/B-7 are adopted as the binding acceptance bars** for
> the F11/F12 statements — the DEV-706 grill verdict on the board applies
> them, and the eventual E12 build spec inherits them verbatim in kind.
> **B-9 ruled as recommended**: F8 is a corollary under F7+F3, no
> separate theorem, no refusal cites it by name (part 2 §8 amendment 1
> now says so). **B-2** is the acceptance reference for DEV-711's
> register PR. B-10's obligations ride their named slices.

Auditor: Fable proof-adequacy agent, 2026-08-17. Repository read at
`main` `0d575c824`. Read-only run: no repairs, no ledger edits, no branch.
Findings are reported with the evidence left standing; every repair
obligation names its owner and its already-ruled route where one exists.

**Gate run record.** `bash verify/fabric/run.sh` was executed once on
this machine (Windows 11, Git Bash, elan/lake present) and ran **GREEN**
end to end: kernel source hygiene PASS, definitions/statements/proofs
partition PASS, `lake build` PASS (24 jobs), **70 theorem roster and
footprint PASS**, all four negative controls refuted with byte-compared
traces, and 11 canonical vectors regenerated **byte-identically**. The
DEV-709 Windows environment issue did not manifest; every judgment below
is therefore run-level, not statement-level. Independently verified:
`sha256(packages/plait/fixtures/fabric-conformance.ndjson) =
c1b974492d2d73bbd504364e1a38fbca7fc8dcd2fc06a782c307adf60db6baa7`,
matching the ledger row's `c1b97449…` pin (`VERIFICATION.md:47`); a
repository-wide grep confirms nothing outside the fixture references
`fabric-conformance.ndjson` — the row's "nothing consumes the emitted
corpus today" sentence is true of the tree.

**Scope note.** The Plait lane's only mechanized package on `main` is
`verify/fabric/` (Lean 4.33.0, zero dependencies). `verify/fabric-veil`
does not exist yet — slice 2 (dispatch 32, epic E5) is in flight. The
successor-discipline artifacts (`ingestSchedule`, `applySuccessors`,
`guard_is_redundant`) live in `verify/fabric` and landed with **PR #66**
(`850779722`, DEV-695 — the fabric model); PR #67 (`b51d1d8c4`) is the
spine, `packages/plait`, which carries no Lean. The tasking's attribution
of the successor artifacts to PR #67 is a mislabel; locations below are
exact. The spine's ledger row (`VERIFICATION.md:41`, section `:478-539`)
makes wall/integration claims only (R0/R1), states its quantifier blind
spots as named hardening-brief scope, and makes no model claim — it is
checked here only for bound fidelity (clean; see A.4).

---

## PART A — adequacy audit of `verify/fabric`

### A.1 The proved statements, enumerated from source

70 rostered theorems (`verify/fabric/run.sh:92-123`; the gate diffs this
hand-listed roster against a *derived* enumeration of every
`theorem|lemma` under `Fabric/` in both directions, so an orphan or a
stale line is a gate failure — the enumerated-gate discipline holds).
Grouped:

| Family | Statements (`Fabric/Laws.lean`) | Proofs (`Fabric/Proofs.lean`) | Count incl. lemmas |
| --- | --- | --- | --- |
| F1 cell ACI + convergence | `F1CellMergeACI` :15-21; `F1SameVerifiedSetConverges` :24-26 | `f1_cell_merge_aci` :39-40; `f1_same_verified_set_converges` :43-47 (+3 merge lemmas) | 5 |
| F2 perm+dup invariance | `F2TraceInvariant` :30-33 | `f2_trace_invariant` :59-64; `f2_permutation` :67-70; `f2_duplication` :73-81 | 3 |
| Emitter comparator lawfulness | — | :87-121 | 3 |
| F3 resumption | `F3ResumeExact` :36-40 | `f3_resume_exact` :130-134 | 1 |
| F2b successor discipline | `F2bSerialSuccessorPremise` :45-47; `F2bGuardedExactlyOnce` :54-61 | :143-348, incl. `guard_is_redundant` :326-338 and `f2b_guarded_exactly_once` :343-348 | 10 |
| F4 partition merge | `F4PartitionFold` :65-70 | `f4_partition_fold` :404-408 (+3 lemmas) | 4 |
| F9 meet-semilattice + attenuation | `F9PolicyMeetSemilattice` :74-85; `F9TreeAttenuation` :88-91 | `f9_policy_meet_semilattice` :557-562; `f9_tree_attenuation` :566-573 (+12 lemmas) | 14 |
| Negative-control proofs | — | `Fabric/ControlProofs.lean` :8-97 | 12 |
| Bridge instances (one per vector) | — | `Fabric/BridgeProofs.lean` :7-162 | 18 |
| Total | | | **70** |

Carriers (`Fabric/Definitions.lean`): a cell is
`Std.ExtTreeSet (Holder × Value) cmp` (:20-22) — the *extensional*
tree-set quotient, which is what makes replica equality a real statement
rather than a tree-shape accident; traces are lists; positioned delivery
is `Positioned Op` (:111-114) with `ingestSchedule` (:144-146),
`applySuccessors` (:150-157), `guardedApply` (:162-166); the partition
fold is the contribution-form `foldCommutative` (:219-224) under a
`CommutativeAlgebra` record (:210-216); policies are four finite sets
plus four `Nat` ceilings (:246-254) with `meet` (:263-271), `Le`
(:274-283), and the `DescendantEffective` action-tree relation
(:298-307).

### A.2 Law-by-law fidelity

#### F1 — evidence lattice

1. **Prose** (`docs/design/2026-08-17-plait-coordination-fabric.md:247-250`):
   "fabric evidence forms a join-semilattice of holder-attributed
   observations; merge is associative, commutative, idempotent; and the
   terminal state of any evidence trace is invariant under permutation
   AND duplication of the trace." Convergence half (`:883`): "same
   verified set ⇒ same state".
2. **Theorems**: `Laws.F1CellMergeACI` (`Fabric/Laws.lean:15-21`) —
   comm/assoc/idem of `Cell.merge` (set union), proved
   `Fabric/Proofs.lean:39-40`; `Laws.F1SameVerifiedSetConverges`
   (`Laws.lean:24-26`) — `SameVerifiedSet left right -> left = right`,
   proved `Proofs.lean:43-47`.
3. **Fidelity**: exact at the model's carrier. The convergence half
   quantifies over arbitrary `Holder`/`Value`/lawful comparator — not a
   degenerate instance. Note the modeling division of labor: convergence
   is carried by the *choice* of `ExtTreeSet` (the extensional quotient;
   `ext_mem` is the license) and the theorem is the certificate that the
   carrier really is extensional. A raw balanced-tree carrier would have
   made this theorem hard and contentful; the quotient makes it short and
   contentful — the content moved into the library's quotient soundness
   (inside the checked footprint), not into vacuum.
4. **Vacuity**: none. Not `rfl`-provable (needs `ext_mem` +
   propositional or-algebra); hypotheses non-trivial and inhabited.
5. **Controls**: `drop-idempotence` (multiplicity-retaining cell,
   `Fabric/Mutants.lean:7-22`) killed on the exact duplication row with
   the retained laws *proved* (`ControlProofs.lean:8-31`);
   `drop-commutativity` (left-biased merge, `Mutants.lean:26-34`) killed
   on the exact permutation row, retained laws proved
   (`ControlProofs.lean:34-55`). Both traces committed and byte-diffed by
   the gate (`run.sh:173-196`); a committed-but-unexercised trace fails
   (`run.sh:198-203`). Redden-on-exactly-the-dropped-law: **established
   by proof** for both F1-family controls.
6. **Ledger**: row 47's F1 clause is licensed as stated.

#### F2 — permutation + duplication invariance

1. **Prose** (part 1 `:884`): "terminal state of an evidence trace is
   invariant under permutation + duplication".
2. **Theorem**: `Laws.F2TraceInvariant` (`Laws.lean:30-33`) — equal
   delivered *support* (`SameDeliveredSet`, `Definitions.lean:60-62`)
   implies equal `foldEvidence`; halves exposed as `f2_permutation` and
   `f2_duplication` (`Proofs.lean:67-81`).
3. **Fidelity**: the support formulation is *exactly* the closure of the
   prose under arbitrary permutation and duplication — strictly stronger
   than proving the two generators separately, and the package DECISIONS
   records the choice as load-bearing (`verify/fabric/DECISIONS.md` T1).
4. **Vacuity**: none; the BEq/cmp coherence instances required are
   themselves proved for the emitter comparator (`Proofs.lean:87-121`),
   so the concrete corpus instance is not carried by an unproven
   instance assumption — the instance/emitter mismatch shape from
   round-1 reviews was checked for and is absent.
5. **Controls**: as F1 (the two mutants discriminate the two F2 halves).
6. **Ledger**: licensed as stated.

#### F2b — successor discipline (the DEV-695 successor artifacts)

1. **Prose** — the governing, *amended* text (part 1 `:354-364`):
   "arrivals are admitted through a window and applied only at the
   contiguous frontier, so any at-least-once redelivery schedule applies
   each event exactly once. The anchor's position floor is the *derived
   record* of that frontier — the resume coordinate — not itself the
   protector … `guard_is_redundant`, footprint-clean."
2. **Theorems**: premise `Laws.F2bSerialSuccessorPremise`
   (`Laws.lean:45-47`, unfolding `SerialSuccessorSchedule`,
   `Definitions.lean:172-177`: in-window raw support = the contiguous
   positioned trace; multiplicity, arrival order, stale and
   out-of-window deliveries free); conclusion
   `Laws.F2bGuardedExactlyOnce` (`Laws.lean:54-61`):
   `applySuccessors step floor operations.length initial
   (ingestSchedule deliveries) = fold step initial operations`, proved
   by real induction (`Proofs.lean:143-348`); and
   `guard_is_redundant` (`Proofs.lean:326-338`): `guardedApply` equals
   the drain over a floor/window-*filtered* ingest — unconditionally, no
   schedule premise — via the window-congruence lemma
   `apply_successors_congr` (:274-291).
3. **Fidelity**: high. The statement is generic in `step` (non-idempotent
   folds included — the prose's whole point), the shipped raw-arrival
   buffer appears *in the statement* (robustness is proved, not assumed
   as an equation about the buffer's output — DECISIONS T2), and the
   premise is exactly the runtime discipline dispatch 31 decision 4
   implements. Two bounds, both already stated where they must be:
   (a) the premise *is* the contiguity discipline — arbitrary reordering
   without it is out of scope *by statement*, and the ledger row says so
   verbatim; (b) the theorem drains a batch window of exactly
   `operations.length` successors, while the runtime pump interleaves
   ingest and drain — dispatch 31 decision 4 names this shape delta and
   assigns it to the wall and chaos gates, demanding no new theorem.
4. **Vacuity**: the premise is proved *inhabited three times* over
   adversarial concrete rows — stale replay, duplicate-current, and
   6-before-5 reordering (`BridgeProofs.lean:26-32, :41-47, :56-61`) —
   so the implication is not truth-by-empty-premise. `guard_is_redundant`
   is contentful: the filtered and unfiltered buffers *differ* as
   functions outside the window; the equality holds because the drain
   provably reads only the window.
5. **Controls**: `drop-successor-discipline` — the arrival-order mutant
   (`Mutants.lean:38-44`) applies ahead of the frontier and is killed by
   the order-sensitive 6-before-5 append row (`[3]` vs lawful `[2,3]`;
   `ControlProofs.lean:57-84`), trace committed. The dispatched
   drop-floor-guard control was proved **unstatable** and the deviation
   was coordinator-ruled (DEV-695 round-3, comment `7cb08c80…`),
   recorded in `verify/fabric/DECISIONS.md` T7 and the README — the
   "control replaced by a proof of non-load-bearingness" path executed
   exactly as house discipline demands. One gap: this control's kill is
   not yet pinned to *reordering alone* by a retained-property theorem
   (see **A-2**).
6. **Ledger**: row 47 states the premise bound and the deviation
   correctly, including "the floor-guard control is unstatable,
   `guard_is_redundant` is the proof". Licensed.

#### F3 — anchored resumption

1. **Prose** (part 1 `:347-349`, `:886`): "folding a suffix from a
   checkpointed state equals folding the whole history … classical
   (`List.foldl_append` shape); restated in-house."
2. **Theorem**: `Laws.F3ResumeExact` (`Laws.lean:36-40`), proved
   `Proofs.lean:130-134` by `List.foldl_append`.
3. **Fidelity/vacuity**: exact; near-definitional *by design* — the
   design itself declares the restatement posture, so proximity to a
   stdlib lemma is a recorded choice, not a hidden vacuity. Consumers
   need the in-house name; the corpus row (`checkpoint-resume`) and
   `emitter_f3_resume` (`BridgeProofs.lean:70-73`) bind it to a vector.
4. **Ledger**: licensed.

#### F4 — partition merge (finding A-1)

1. **Prose** (part 1 `:350-353`, `:887`): "for commutative-class
   algebras, the merge of per-partition folds equals the sequential
   fold"; C4's deployed object is the declared **(algebra, step)** fold,
   and the API consequence (`:827`) is "`partitions > 1` type-checks
   only for `Algebra.commutative`-branded algebras".
2. **Theorem**: `Laws.F4PartitionFold` (`Laws.lean:65-70`), proved
   `f4_partition_fold` (`Proofs.lean:404-408`) over
   `foldCommutative algebra contribution` — the **contribution-form**
   fold (`Definitions.lean:219-224`), with `Interleaves` as list
   permutation of the flattened partitions (:238-240).
3. **Fidelity**: the theorem is true and non-degenerate for the model's
   own fold, but its subject is **not the deployed object**: no theorem
   on `main` links `foldCommutative` to the `(algebra, step)` fold F3
   ranges over, so as specced the `Algebra.commutative` brand would
   license partitioned deployment of step folds F4 does not speak about.
   This is **finding A-1** — independently reached here, then found
   already filed as wave-1 fidelity review D2 and routed: brief 34
   item 4 (bridge lemma, ~15 lines: `foldCommutative algebra c trace =
   fold (fun s op => algebra.merge s (c op)) algebra.empty trace`) plus
   dispatch 31 decision 3 (the step↔algebra compatibility property in
   the generated brand suite). Neither has landed; the routing binds the
   sequencing "close it BEFORE E4 builds `Folds.deploy`".
4. **Vacuity**: none in the theorem itself; `Interleaves` inhabited
   (`emitter_f4_partition`, `BridgeProofs.lean:76-81`).
5. **Controls**: no F4-dropping model mutant exists (the brand *is* the
   control at declaration level — dispatch 31 control (ii) puts it at
   runtime); the model-side non-commuting intruder row
   (`non-commuting-intruder`, witness `emitter_intruder_refused`,
   `BridgeProofs.lean:84-88`) demonstrates refusal of a non-ACI op —
   note this is a two-constructor toy admission (`Corpus.lean:133-143`),
   a demonstration row, not a general alphabet-admission theorem; at the
   model's actual evidence alphabet (observation insertion) all-pairs
   commutation *is* F2, so nothing further is owed here.
6. **Ledger**: row 47 says "F4 partition merge for the commutative
   class" with no contribution-form scope sentence. Model-level the row
   is true of the model's fold; the missing precision is exactly what
   brief 34's closing report already drafts as the row's post-bridge
   upgrade. Recorded under A-1's ledger note, not as a separate
   overclaim.

#### F9 — policy meet-semilattice + attenuation

1. **Prose** (`docs/design/2026-08-17-plait-action-plane.md:240-243`):
   "In any action tree, every descendant's effective policy ≤ the
   root's — induction on the tree, meet monotonicity does all the work.
   Twenty lines of Lean … no delegation chain ever escalates." Spawning
   "only defined as `child = parent ⊓ requested`" (`:231-232`).
2. **Theorems**: `Laws.F9PolicyMeetSemilattice` (`Laws.lean:74-85`) —
   ACI **plus both greatest-lower-bound clauses** (the statement demands
   the glb, not just the ACI equations — stronger than an
   equational-only reading); `Laws.F9TreeAttenuation` (`Laws.lean:88-91`)
   over `DescendantEffective`; proofs `Proofs.lean:417-573`.
3. **Fidelity**: exact, with the definitional posture faithfully carried:
   `DescendantEffective` *constructs* effective policies as meet chains
   (`Definitions.lean:298-307`), matching "spawning is only defined as
   the meet" — the theorem says meet chains never escape the root, which
   is the design's claim, and the type-level-writ honesty box (DX, not
   security) is a runtime posture the model correctly does not touch.
   Texture note, zero severity: the landed attenuation proof uses
   `policy_meet_le_left` + transitivity, not `policy_meet_monotone` —
   the design's proof-sketch prediction ("monotonicity does all the
   work") was wrong in a harmless direction; the monotonicity lemma is
   still proved and rostered (`Proofs.lean:548-554`).
4. **Vacuity**: none; `DescendantEffective` inhabited by the two-level
   bridge tree (`emitter_f9_tree`, `BridgeProofs.lean:134-149`), and the
   executable Boolean order used in emitted verdicts is proved
   equivalent to the propositional order (`policyLeBool_iff`,
   `BridgeProofs.lean:97-121`) — the exact emitter/theorem linkage that
   prevents the instance-mismatch failure shape.
5. **Controls**: `drop-meet-clamping` (trust-the-request,
   `Mutants.lean:76`) refuted on the budget component
   (`ControlProofs.lean:91-97`), trace committed. Not yet pinned by a
   retained-property theorem (agrees-when-request-already-≤-root) —
   **A-2**, routed (brief 34 item 3ii).
6. **Ledger**: row 47's F9 clause licensed. Part-B correction: the
   tasking lists F9 among "unproven laws" — it is proven and claimed;
   only residual runtime obligations remain (card B-6).

#### The gate as a prover-that-can-fail

- Hygiene: token-level refusals for
  `sorry|partial|panic|implemented_by|extern|native_decide|unsafe|axiom`
  over all owned sources (`run.sh:42-47`), empty extern allowlist
  enforced (:38-41). All `decide`-closed facts are kernel-checked
  `Decidable.decide`, not `native_decide` — verified by the hygiene
  sweep passing.
- Partition: theorem-free definition/law files, definition-free proof
  files, proof-free law statements, and a **derived** law-name
  enumeration diffed against the expected law list (`run.sh:52-81`).
- Footprint: `#print axioms` over all 70, report count pinned, anything
  outside `{propext, Classical.choice, Quot.sound}` red
  (`run.sh:140-170`). Ran clean.
- Corpus: regenerated fresh and `cmp`-diffed against the fixture; the
  `(kind, name, witness)` triple of every vector is extracted from the
  *emitted* corpus and diffed against the pinned list, count 11, every
  witness required to be a rostered theorem (`run.sh:205-258`); the
  safe-integer ceiling is mechanically swept (:253-258).
- Would a planted new violation be caught? A new theorem without a
  roster line: caught (both-direction diff). A new vector without a
  pinned triple: caught (count + diff). A committed control trace
  without an exercising control: caught (:198-203). A hand-edited
  fixture: caught (regeneration `cmp`) — and the divergent-row *naming*
  plus `--self-test` planted-mutation controls for the diff machinery
  itself are ruled and routed (grill item 19 → brief 34 items 1-2), not
  yet landed. Residual: see A-5.

### A.3 Findings

**A-1 — MAJOR. F4's proven fold is not the deployed fold's shape.**
`verify/fabric/Fabric/Laws.lean:65-70` proves partition/interleaving
equivalence for `foldCommutative` (contribution form,
`Fabric/Definitions.lean:219-224`); the design's C4 object and E4's
deployment target is the `(algebra, step)` fold (part 1 `:333-353`,
`:827`), and no theorem on `main` links the two. As specced, the earned
`Algebra.commutative` brand would license partitioned deployment of step
folds about which F4 proves nothing. Already found (wave-1 fidelity
review D2) and routed — brief 34 item 4 (bridge lemma) + dispatch 31
decision 3 (step↔algebra compatibility in the generated suite) — with
binding sequencing "before E4 builds `Folds.deploy`"; **neither repair
has landed**. Repair obligation: land brief 34 item 4 in `verify/fabric`
(rostered, footprint-checked) and hold E4's merge behind it; the fabric
ledger row's F4 sentence upgrades only then (the drafted text exists in
brief 34's closing-report extra). Not repaired here.

**A-2 — MINOR. Two of four negative controls lack retained-property
pinning.** `drop-idempotence` and `drop-commutativity` prove what their
mutants retain (`Fabric/ControlProofs.lean:8-21, :34-43`), making each
kill attributable to exactly the dropped law; `drop-successor-discipline`
and `drop-meet-clamping` carry no such theorems (absence verified at
`ControlProofs.lean:57-97`). "Reddens for exactly the dropped law" is
currently by construction (single-operation mutants over shared
carriers, DECISIONS T5), not by proof, for those two. Routed: brief 34
item 3 (statements fixed in kind); not landed. Repair obligation: the
two retained-property theorems, rostered, corpus and traces
byte-unchanged.

**A-3 — MINOR. The ledger's control sentence runs slightly ahead of the
mechanized attribution for the same two controls.**
`VERIFICATION.md:47`: "negative controls each drop exactly one law and
die on named vectors" — true as a construction claim, proof-backed for
2 of 4. Brief 34's closing-report extra already drafts the honest
strengthening ("each control drops exactly one law *and provably retains
the rest*") to land with item 3. Obligation: coordinator lands the
amended sentence with brief 34; until then the row reads one shade
stronger than the mechanized evidence. An overclaimed bound is a
finding; this one is at the precision margin and its repair text is
already written.

**A-4 — MINOR. Four stale pre-amendment floor-guard sites in part 1 on
`main`.** `docs/design/2026-08-17-plait-coordination-fabric.md:526`
("ACI or floor-guarded"), `:885` (F2b row: "position-floor-guarded
application …"), `:987-988` ("a build with the floor guard removed fails
the duplication vector"), `:1055` ("floor guard removed → digest
diverges") all contradict the merged model's ruled posture (the floor is
a derived record; the guard is proved redundant; the floor-guard control
is unstatable — `Proofs.lean:326-338`, DECISIONS T7, DEV-695 round-3
ruling). Pre-filed as fidelity review D3 inside dispatch 31's authority
block; the amendment is the coordinator's, and it has not landed.
Obligation: coordinator amends the four sites (or appends the amendment
note pattern already used at `:361`); slice-1 and demo gate texts
(`:987`, `:1055`) matter most, since an executor building the §10/§11
controls as written would attempt a control the model proves unstatable.

**A-5 — MINOR. The gate pins vector identity and witness presence, but
not verdict truth or the vector↔theorem semantic binding.**
`run.sh:205-258` checks each emitted row's `(kind, name, witness)`
triple and that the witness is rostered; nothing asserts the verdict
booleans (`matchesExact`, `commutes`, `withinRoot`, …) are `true`, and
the binding between a row's computed bytes and its witness theorem's
statement is the shared-literal convention between `Corpus.lean` and
`BridgeProofs.lean` (same terms in both files), enforced by review
rather than mechanically. Today the convention holds (verified by read:
every witness theorem states the exact terms its vector computes). Cheap
derived closures exist: grep-assert the pinned verdict fields `true` in
the gate, or emit verdicts *from* the bridge-theorem terms. Obligation:
offer to the coordinator as a follow-up-brief candidate beside the ruled
`run.sh` amendments (grill item 19 route); no evidence of an actual
divergence exists.

**Attestations (checked, clean).** No `sorry`/`native_decide`/axiom
escapes (gate + read); footprint inside the pinned set at run; no
rfl-provable *law* statement (the only `rfl` proofs are deliberate
mutant-retention trivia, `ControlProofs.lean:37-43`); every implication
premise inhabited in-package (three proved F2b premise instances;
`Interleaves` and `DescendantEffective` witnessed in `BridgeProofs`);
the emitter's executable policy order proved equivalent to the
propositional order (`policyLeBool_iff`); corpus regeneration
byte-identical at run; fixture sha matches the ledger; zero-dependency
manifest and 4.33.0 pin enforced by the gate (`run.sh:27-31`); ledger
row 47's bounds prose (premise scope, no-consumer status, no
F5/F6/crash/CAS/lease/liveness) verified accurate against the tree.
Emitter texture, no finding: `Canonical.object` collapses duplicate keys
first-wins rather than refusing — producer-side only, pinned by theorem
(`emitter_duplicate_key_collapse`, `BridgeProofs.lean:157-162`), and the
README states the narrowed-grammar bounds.

Severity tally: **BLOCKER 0 · MAJOR 1 (A-1) · MINOR 4 (A-2..A-5).** No
merged theorem says less than the ledger claims of it; the one MAJOR is
a statement-target gap whose repair is specced, ruled, and unlanded.

---

## PART B — proof-obligation program for the unproven laws

**Tasking correction, stated up front:** F9 is *not* unproven — it is
claimed at model-level R5 on `main` (Part A). Its card below carries
residual obligations only. F6 is unproven and absent from the tasking
list; it is enumerated (card B-8) because the ledger discipline demands
the roster be complete.

**Priority ladder (the ruled build sequence, with the proof acts placed
on it):**

| # | Wave | Proof acts |
| --- | --- | --- |
| 1 | Hygiene (dispatch 34) | B-1 F4 bridge lemma (repairs A-1); retained-property pinning (repairs A-2); run.sh amendments (context for A-5) |
| 2 | Durable fold (dispatch 31, E4) | corpus family extensions (F3∘F2b composed rows, ahead-of-ceiling, multi-gap, redeliver-everything-twice); the replay wall that closes the fabric row's no-consumer gap. No new laws |
| 3 | CI faithfulness (dispatch 33) | manifest + drift tripwire in the required battery. No new laws |
| — | Register (dispatch 32, E5, **in flight**) | B-2 F5 — the only new proof package this wave |
| 4 | Contexts / actions (slices 2a, 4a) | B-4 F7; B-5 F10; B-6 F9 residuals |
| 5 | Harness plane | B-3 F11 and B-7 F12 (acceptance bars for the DEV-706 drafts, graded now); B-8 F6 (deferred by ruling); B-9 F8 (corollary ruling); B-10 enumerated no-F-number laws |

---

### B-1 — the F4 bridge lemma (repair of A-1; brief 34 item 4)

- **Model extension**: none — one theorem over existing carriers, home
  `verify/fabric`.
- **Candidate statement** (Lean 4.33, zero-dep; name is the executor's,
  `foldCommutative_eq_fold` suggested by the review):

  ```lean
  theorem foldCommutative_eq_fold {State Op : Type}
      (algebra : CommutativeAlgebra State) (contribution : Op -> State)
      (trace : List Op) :
      foldCommutative algebra contribution trace =
        fold (fun state op => algebra.merge state (contribution op))
          algebra.empty trace
  ```

- **Proof sketch**: induction on `trace`; the cons case needs
  `algebra.commutative` (the model has only `leftIdentity`, so the right
  identity of the step-fold seed must come through commutativity) plus
  associativity — the review's ~15-line price is right; the hard step is
  recognizing that without commutativity the lemma is false, which is
  itself the honest reason the brand gates it.
- **Controls**: none new — this is a bridge, not a law; the runtime half
  (dispatch 31 decision 3's compatibility property + its control (ii))
  carries the falsifiability.
- **Non-coverage**: crash recovery, CAS/retries, the Effect runtime,
  code/model correspondence, liveness — unchanged; plus: says nothing
  about *non*-commutative step folds (they earn no brand and no
  partition right — that is the point).
- **Feeds**: brief 34; blocks E4's merge per the routed sequencing.

### B-2 — F5, lease-register safety (the Veil route; dispatch 32, E5, in flight)

- **Prose claim** (part 1 `:370-379`): "at every register, grants carry
  strictly increasing tokens; a commit is accepted iff its token equals
  the register's current token; therefore no two holders ever both land
  commits for one work digest, regardless of crashes, retries, and
  arbitrary interleavings." Ruled route: Veil-pinned package
  `verify/fabric-veil` at Lean 4.28.0, Veil commit `300c305e…`,
  `veil.smt.trust=false` mandatory (ratification G5; landscape probe,
  ran-it: trust=true footprints `[sorryAx]`, trust=false footprints
  `[propext, Classical.choice, Quot.sound]` —
  `docs/research/2026-08-17-lean4-landscape-exploration.md:337-338`).
- **Model** (dispatch 32 decision 4, fixed): ONE register per module
  instance — the per-work-digest authority; work digest a theory
  parameter, never re-derived in-model; state `(token, holder,
  outcome?)`; five actions — grant, renew, commit, expire-steal
  (nondeterministically enabled; **no clocks**), observe. No
  precondition consults holder identity as authority.
- **Candidate statement** (Veil DSL at the pin; syntax per
  `repos/veil/Examples/Tutorial/Ring.lean` — `veil module`, `type`,
  `instantiate tot : TotalOrder _`, Bool-valued relations, `after_init`,
  `action { require … }`, `safety [name]`, `invariant [name]`,
  `#gen_spec`, `#check_invariants`; capitals implicitly universally
  quantified; exact phrasing is the executor's per decision 4):

  ```lean
  import Veil

  veil module LeaseRegister
  -- One instance = one register (one work digest). Tokens are an
  -- uninterpreted total order, not arithmetic: EPR-friendly, and it
  -- states "monotone fencing token" without smuggling in clocks.
  type holder
  type tok
  type outcome
  instantiate tot : TotalOrder tok
  open TotalOrder

  individual granted : Bool          -- some token has been minted
  individual current : tok           -- the register's current token
  individual held    : Bool          -- a lease is live at `current`
  individual owner   : holder        -- informational; never an authority
  individual landed  : Bool
  relation wasCurrent : tok → Bool           -- history: every minted token
  relation landedAt : tok → outcome → Bool   -- history: every landed commit

  after_init {
    granted := false; held := false; landed := false
    wasCurrent T := false; landedAt T O := false
  }

  action grant (h : holder) (t : tok) {
    require ¬ granted
    granted := true; current := t; wasCurrent t := true
    held := true; owner := h
  }
  action renew (h : holder) (t : tok) {
    require held ∧ t = current       -- the token decides, never the who
  }
  action commit (t : tok) (o : outcome) {
    require held ∧ t = current ∧ ¬ landed
    landed := true; landedAt t o := true
  }
  action expireSteal (h : holder) (t : tok) {
    require granted ∧ le current t ∧ current ≠ t   -- strictly larger
    current := t; wasCurrent t := true
    held := true; owner := h
  }
  action observe (h : holder) { }

  -- I1 token monotonicity: history never exceeds the current token,
  -- and grant/steal strictly extend it (strictness is in the guards;
  -- the invariant records its consequence).
  safety [token_monotone] wasCurrent T → le T current
  -- I2 at-most-one landed commit per work digest.
  safety [one_landing]
    landedAt T1 O1 ∧ landedAt T2 O2 → T1 = T2 ∧ O1 = O2
  -- Corollary, stated: no stale token ever lands.
  invariant [landed_at_current_only] landedAt T O → T = current ∨ landed
  #gen_spec
  #check_invariants
  ```

- **Proof sketch / hard steps**: `#check_invariants` generates
  initiation + per-action consecution, discharged by cvc5 with proofs
  reconstructed in-kernel (trust=false). Hard steps to expect: (i) the
  auxiliary invariants that make I2 inductive (e.g. `landed` freezing —
  once `landed`, no action re-enables commit; the frame conditions must
  say `landedAt` grows only through commit); (ii) strict increase on
  steal in EPR terms (`le ∧ ≠` with `TotalOrder`'s antisymmetry doing
  the strictness work); (iii) keeping every guard identity-free so the
  "token decides, never the who" sentence survives into the statement.
  `#model_check` on small instances is falsification evidence only,
  never a proof substitute (decision 5, verbatim).
- **What Veil discharges**: the inductive-invariant obligations at R3,
  kernel-checked through reconstructed SMT proofs with the footprint
  gate (`#print axioms` inside the pinned set; `sorryAx` red) as the
  mechanical enforcement; the exported trace corpus with validity by
  construction (`ToJson (Trace ρ σ l)`, `Trace.isValid`,
  `push_isValid` — `repos/veil/Veil/Core/Tools/ModelChecker/Trace.lean`)
  as the L0→L2 bridge.
- **What Veil does NOT discharge** (per card, stated in the ledger row
  when it lands): the export/driver glue (named in the trusted base,
  decision 6); model↔runtime correspondence (the replay wall's job,
  R0/R1: TS ≡ Go ≡ model with counts pinned); the substrate's CAS
  contract (in-harness probes; the archived assumptions gate's content
  as envelope, G3); any liveness — expire-steal enabledness is
  nondeterministic, so lease *progress*, fair retry, and eventual
  landing are unclaimed by construction; cross-register claims; the
  attribution of holders; crash semantics beyond what interleaving
  covers. **R4 language embargoed** until a lockstep run at the
  archived 15,378-schedule bar exists (mid-flight ruling; dispatch 32
  decision 11 binds the proposed row text verbatim in kind).
- **Negative controls the gate must ship** (decision 5 + gates):
  drop-commit-token-guard variant refuted with committed trace;
  drop-strict-increase-on-steal variant refuted; the trusted-mode twin
  (one theorem at trust=true) shown carrying `sorryAx` and shown
  *refused* by the footprint gate — the checker proven able to fail;
  runtime: a stale-token-accepting build killed by a named corpus
  vector; a hand-edited corpus row killed by the regeneration diff. Each
  control names the guard it drops and claims it load-bearing; a proved
  non-load-bearing drop renames the control (the `guard_is_redundant`
  precedent, now house case law).
- **Feeds**: E5 / dispatch 32; formally re-earns the archived effector
  claims with evidence in-tree (the ledger row must say so in those
  words, decision 11).

### B-3 — F11, query determinism (ACCEPTANCE BAR for the DEV-706 draft)

- **Prose claim** (part 3 `:244-247`): "`query(I, A, q)` is a function
  of the triple `(index digest, anchor A, query digest)` — equal triples
  give byte-equal result values." Ruled a separate, minimally scoped R5
  statement, home `verify/fabric`, with purity side conditions enforced
  at admission by refusals citing **F11 by name** (grill sheet item 12).
- **The vacuity trap, named for the seat**: in Lean, *every* function is
  deterministic — a statement of the shape
  `theorem f11 : query I A q = query I A q` or one provable by `rfl`
  after unfolding is worthless. The draft clears the bar only if its
  carrier makes F11 falsifiable: ambient inputs (clock, seed, insertion
  order) must be *representable* in the model so that a mutant using
  them is refutable, and the shipped algebra provably does not use them.
- **Model extension** (joins the existing fabric model): an index is a
  fold declaration (existing carriers) plus a query algebra; the two
  contentful halves are (i) an *anchored-state* half that rides F3, and
  (ii) an *extensional/tie-break* half that must be stated over lists
  with permutation, NOT over `ExtTreeSet` alone — over the extensional
  quotient any function is automatically order-invariant, so an
  ExtTreeSet-only statement is carrier-discharged and unfalsifiable;
  the F2-shaped list formulation is where an insertion-order mutant can
  die.
- **Candidate statements** (Lean 4.33, zero-dep):

  ```lean
  /-- The answering state at an anchor is the resumed fold — F3's half. -/
  theorem f11_state_of_anchor {State Op : Type}
      (step : State -> Op -> State) (initial : State)
      (prefixOps suffixOps : List Op) :
      foldFrom step (fold step initial prefixOps) suffixOps =
        fold step initial (prefixOps ++ suffixOps) :=
    f3_resume_exact step initial prefixOps suffixOps

  /-- Entries carry their identity bytes; ties break by identity order,
      so top-k is a function of the entry SUPPORT, not the schedule.
      This is the half a tie-break mutant can falsify. -/
  def topK (score : Entry -> Nat) (k : Nat)
      (entries : List Entry) : List Entry :=
    (entries.dedup).mergeSort (byScoreThenIdentity score) |>.take k

  theorem f11_topk_of_support [DecidableEq Entry]
      (score : Entry -> Nat) (k : Nat) {left right : List Entry}
      (same : forall e, left.contains e = right.contains e) :
      topK score k left = topK score k right

  /-- The full law: equal (index, anchored state, query) give equal
      result values, with the query algebra drawn from a carrier that
      cannot read ambient inputs (no clock/seed/order parameter exists
      to read). A variant threading an ambient input is stated as a
      mutant and refuted. -/
  theorem f11_query_deterministic
      (Q : QueryAlgebra State Query Result)
      (anchored : State) (q : Query) :
      Q.answer anchored q = Q.answer anchored q := by rfl
      -- ^ THIS FORM IS THE FAILURE SHAPE. The draft must NOT submit it.
      -- The acceptance form quantifies over two presentations of the
      -- same anchored support (list-level) and proves byte-equal
      -- rendered results — the topK theorem composed with the state
      -- half and the canonical renderer.
  ```

  (The inline `rfl` line is deliberately shown as the *refused* shape so
  the grill can cite it: the accepted statement is the composition
  `render (Q.answer (stateOf anchor) q)` invariant under permutation and
  duplication of the anchored support and under re-anchoring by F3 —
  each half separately falsifiable.)
- **Proof sketch / hard steps**: dedup-then-mergeSort determinism needs
  totality + antisymmetry of the identity tie-break (RFC 8785 UTF-16
  code-unit order on identity bytes — antisymmetry holds only *because*
  identity bytes are distinct per entry: distinctness is a premise or a
  dedup consequence, name it); permutation invariance of
  `dedup ∘ mergeSort` is the real induction; the render half reuses the
  emitter canonical grammar.
- **Negative controls (must ship, each citing F11 in its trace)**:
  (i) insertion-order tie-break mutant (take-first-k in arrival order)
  killed on a two-orders row; (ii) clock/ambient-thread mutant (algebra
  with an extra schedule parameter actually consulted) killed on a
  two-schedules row; (iii) an undeclared-seed variant refused at
  admission (declaration-level structural refusal naming F11), with the
  declared-seed form admitted (seed inside the index digest);
  (iv) emitted query vectors regenerate byte-identically; a hand-edited
  row dies on the diff.
- **Explicit non-coverage**: relevance/usefulness of results (never
  claimed — part 3's own fence); ANN recall (measured only,
  single-partition by the absent brand); runtime correspondence (TS/Go
  re-query wall at a pinned anchor is slice 1b's gate, R0/R1); anchor
  freshness/staleness (absence-sort refusals, runtime); crash/CAS/
  retries/leases; the Effect runtime; liveness; the MCP argument shape
  (named upstream dependency).
- **Feeds**: slice 1b (`Index.ts`/`Search.ts` per part 3 §7.1); the
  retrieval selector (F7's extension); the memo right at
  `(index, anchor, query)`.

### B-4 — F7, assembly determinism (slice 2a)

- **Prose claim** (part 2 `:169-175`): "`assemble(program, inputs)` is a
  function: equal program digests and equal input values give byte-equal
  context values," with the invalidation-free memo keyed
  `(program digest, input digests)`.
- **The same vacuity trap as F11**, resolved the same way: the
  contentful form is a **frame/congruence theorem** — the shape the
  fabric package already ships as `apply_successors_congr`
  (`Proofs.lean:274-291`): assembly reads *only* the addresses the
  program declares.
- **Model extension**: selectors as declared substrate addresses;
  renderers as pure `Value -> String` at the emitter's canonical
  grammar; a program as an ordered list of
  `(selector, renderer, volatility class)`; assembly = volatility-stable
  ordering of rendered segments, each segment recording its source
  digests. Digest faithfulness is modeled as identity on values (the
  `verify/catalog` precedent: "digests are modeled as the identity
  function on values", `VERIFICATION.md:186-188`), with SHA-256
  collision resistance in the trusted base.
- **Candidate statement** (Lean 4.33, zero-dep):

  ```lean
  theorem f7_assembly_reads_only_declared
      (program : ContextProgram Addr Value)
      (left right : Addr -> Value)
      (agree : forall addr, addr ∈ program.reads -> left addr = right addr) :
      assemble program left = assemble program right

  /-- Volatility ordering is a function of the program, not of
      evaluation schedule: segment order is the stable sort by declared
      class over the program's own order. -/
  theorem f7_segment_order_stable (program : ContextProgram Addr Value)
      (valuation : Addr -> Value) :
      (assemble program valuation).segments.map ContextSegment.class =
        (program.segments.map declaredClass).stableSortByClass
  ```

- **Proof sketch / hard steps**: the congruence induction is routine;
  the hard step is the *canonical-bytes* half — byte determinism of the
  segment rendering needs the emitter grammar's object-key sorting and
  the stable sort's determinism (stability matters: two segments of
  equal class keep program order — state it, or two lawful
  implementations can disagree).
- **Negative controls**: (i) an ambient-reading assembly variant (reads
  an address outside `program.reads` — the model's rendering of a
  timestamp selector) killed by a two-valuations row differing only off
  the read set; (ii) an arrival-order segment-ordering variant killed by
  a two-schedules row; (iii) the runtime gate ruled in part 2 §8.2: a
  planted timestamp selector refused at declaration, refusal citing F7.
- **Non-coverage**: context *quality* (F8 fence, part 2 §9.1); provider
  cache behavior (measured DX only); renderer cost/termination beyond
  totality-by-construction; TS/Go assembly correspondence (slice 2a's
  byte-identical reassembly wall); crash/CAS/retries; Effect runtime;
  liveness; attribution.
- **Feeds**: slice 2a (`ContextProgram.ts`, architecture record :60);
  the retrieval selector (F11 composes into F7 — without F11 the
  retrieval production silently voids F7 for RAG programs, part 3 §4.2).

### B-5 — F10, trigger robustness (slice 4a)

- **Prose claim** (part 2 `:259-269`, amended): "for monotone p, once p
  holds at state s it holds at every s' ⊒ s (stability), and evaluating
  over any duplicate-and-permute delivery … fires hints whose landed
  claims are deduplicated by the register … an enabled firing never
  un-fires and never lands twice; … *eventually evaluated* is liveness
  and carries no claim."
- **Model extension**: the closed predicate grammar as an inductive over
  the five ruled productions (evidence-appears ⊒, cell-reaches ⊒,
  hole-state, outcome-landed, head-advanced-past — part 2 `:251-257`);
  a fabric-state order (cells by membership inclusion — already
  present as `Policy.Le`'s set half in spirit; lift to cells); a
  denotation `holds : Trigger -> FabricState -> Prop`.
- **Candidate statements** (Lean 4.33, zero-dep):

  ```lean
  theorem f10_stability (p : TriggerPredicate) (s s' : FabricState)
      (grow : FabricState.Le s s') (now : holds p s) : holds p s'

  /-- Hint emission is a function of the observed state's support:
      duplicate-and-permute delivery of the same growth fires the same
      SET of action declarations. Landed-claim uniqueness is F5's I2,
      cited, not restated. -/
  theorem f10_hints_of_support (t : Trigger)
      {left right : List (Observation Holder Value)}
      (same : SameDeliveredSet left right) :
      enabledDeclarations t (foldEvidence cmp left) =
        enabledDeclarations t (foldEvidence cmp right)
  ```

- **Hard step, named**: the hole-state production is monotone **only in
  its reaches-form** (upward-closed in the epistemic order
  open ≤ filled ≤ disputed ≤ decided/sealed). An is-exactly-open
  predicate is not stable — the model must define the production as
  reached-at-least, and the *negative control is exactly the
  is-exactly variant* refuted on a grow row. Absence/negation/deadline
  productions must be unrepresentable in the inductive (G9), with the
  runtime refusal at declaration citing the grammar.
- **Controls**: is-exactly-state variant breaks stability (named row);
  a negation production refused structurally at declaration (runtime,
  citing G9/F10); a duplicate-hint schedule with a double-landing mutant
  killed by the register corpus (F5's vector family); the slice-4a
  interleaving corpus replayed with verdict equality (part 2 §8.2).
- **Non-coverage**: eventual evaluation of enabled triggers (liveness —
  the amended sentence is the bound); deadlines (the deadline seat is a
  fenced session act, outside the algebra by ruling G9); attribution;
  crash/CAS/retries; Effect runtime; scheduler fairness.
- **Feeds**: slice 4a (`Trigger.ts`, architecture record :62); the
  demo's trigger scoreboard gates (part 2 §8.3, measured facts).

### B-6 — F9 residuals (correction: the law itself is proven)

- Proven and claimed on `main` (Part A): `f9_policy_meet_semilattice`,
  `f9_tree_attenuation`, `VERIFICATION.md:47`. Remaining obligations:
  1. **The attenuation-audit wall** (slice 4a, part 2 §8.2): a generated
     action tree walked at runtime, every node's effective policy ≤ root
     replayed TS/Go against the model's F9 vectors (two already emitted:
     `attenuation-request-clamped`, `delegation-tree-attenuation`);
     negative control: a handler compiled against a widened Layer
     refused at declaration.
  2. **Carrier extension when part 3's allowlists land**: `indexes` and
     `resources` allowlist fields (part 3 §4.6, amendment 4) extend the
     `Policy` structure — the Lean `Policy` has exactly four set
     components (`Definitions.lean:246-254`); the extension is
     mechanical (componentwise, DECISIONS T3 says the uniform
     representation was chosen for exactly this) but it is a real model
     edit that must move the meet, `Le`, `ext`, and every componentwise
     proof together, corpus regenerated.
  3. **No proof obligation** for the Layer compilation: type-level writ
     is DX, not security (ruling G10); the honesty box rides every
     ledger row that touches it.

### B-7 — F12, fenced resolution (ACCEPTANCE BAR for the DEV-706 draft)

- **Prose claim** (part 3 `:533-539`): "Resolution is a head-relative
  read determined by `(directory digest, anchor, petname)`: with no
  seal, resolution is the singleton binding, an absence refusal, or an
  ambiguity refusal; with seals, resolution is the binding sealed at the
  greatest observed token; and a rebind lands only under the declared
  rebind authority." Ruled separate R5 statement; "F12's register half
  cites the Veil-pinned F5 package rather than restating it" (grill
  item 12).
- **The cross-toolchain tooth, named for the seat**: `verify/fabric` is
  4.33.0; the F5 package is 4.28.0 — one package cannot import the
  other (G5's own premise). Therefore the F12 statement **cannot
  literally cite the Veil theorem**; it must carry the token-order facts
  as a *named premise* (below), discharged by F5's I1/I2 **by citation
  in prose and in the gate's honesty text**, never restated as a
  theorem and never left implicit. A draft that restates F5 in 4.33
  fails (duplication, drift risk); a draft whose max-token function is
  total without the distinctness premise fails (it silently decides
  ties — an arbitration rule nobody declared, the exact thing
  `fence_deterministic` exists to forbid).
- **Model extension** (real, name it): the directory is a **new lattice
  carrier** — `Map Petname (FiniteSet Digest cmp)` under componentwise
  union. The existing `Cell` is a set of observations, not a map-to-set
  lattice; the F1-for-maps package (ACI + convergence for the
  componentwise join) must be proved for the new carrier (or `Cell`
  generalized to a parametric join-semilattice — a ratifiable
  refactor, not a silent one). Seals are data:
  `FiniteSet (Token × Digest)` with `Token` linearly ordered.
- **Candidate statements** (Lean 4.33, zero-dep):

  ```lean
  inductive Resolution where
    | bound (digest : Digest)
    | absent
    | ambiguous (candidates : List Digest)   -- identity order, canonical
    | sealedAt (token : Token) (digest : Digest)

  /-- Discharged by the Veil package's I1/I2 (strictly increasing
      tokens; at most one landed commit) — carried here as a named
      premise, never restated. -/
  def SealsWellFenced (seals : FiniteSet (Token × Digest) sealCmp) : Prop :=
    forall s1 s2, s1 ∈ seals -> s2 ∈ seals -> s1.1 = s2.1 -> s1 = s2

  theorem f12_resolution_of_support
      (dir dir' : Directory) (seals seals' : FiniteSet (Token × Digest) sealCmp)
      (name : Petname)
      (dirSame : forall b, b ∈ bindings dir name <-> b ∈ bindings dir' name)
      (sealSame : forall s, s ∈ seals <-> s ∈ seals')
      (wf : SealsWellFenced seals) :
      resolve dir name seals = resolve dir' name seals'

  theorem f12_greatest_seal_wins (dir : Directory) (name : Petname)
      (seals : FiniteSet (Token × Digest) sealCmp)
      (wf : SealsWellFenced seals) (nonempty : seals ≠ ∅) :
      exists top, top ∈ seals /\
        (forall s, s ∈ seals -> s.1 ≤ top.1) /\
        resolve dir name seals = .sealedAt top.1 top.2

  /-- Verdict characterization: the four rows are exhaustive and
      mutually exclusive (the verify/moves refusal-iff idiom). -/
  theorem f12_characterization (dir name seals) (wf : SealsWellFenced seals) :
      (resolve dir name seals = .absent <-> bindings dir name = ∅ /\ seals = ∅)
      /\ ... -- one clause per verdict row
  ```

- **Proof sketch / hard steps**: max-of-finite-set existence and
  uniqueness under `wf` (uniqueness *fails* without it — that is the
  premise's load-bearing proof, and control (c) below demonstrates it);
  ambiguity-listing determinism needs the canonical identity order
  again; the monotone half is the new-carrier F1 package.
- **Negative controls**: (a) LWW variant (latest-bound-by-arrival)
  killed on a two-orders row where the lawful answer is the ambiguity
  refusal; (b) holder-arbitration variant (the who decides) killed;
  (c) drop the `SealsWellFenced` premise: exhibit two seals at one
  token making `resolve` schedule-dependent — the control that proves
  the premise load-bearing and points its discharge at F5; (d) runtime
  (slice 2b, part 3 §9.5): concurrent-bind convergence vector (two
  nodes, same name → ambiguity refusal), rebind interleaving corpus
  replayed from the F5 register model, and a stale-token rebind landing
  must redden with the gate naming F12.
- **Non-coverage**: rebind *authority* enforcement (server-side,
  runtime); the register's own safety (F5's package — cited); the
  atomicity of reading both planes (the model resolves a snapshot pair
  `(directory state, seal set)`; how a runtime obtains a coherent
  snapshot is the slice's harness question, stated in its row); crash/
  CAS/retries; liveness of rebinds; attribution of binders; the Effect
  runtime.
- **Feeds**: slice 2b (`Directory.ts`, part 3 §7.1); `Resource.resolve`;
  every deploy-by-name surface.

### B-8 — F6, conformance soundness (deferred by ruling; enumerate, do not race)

- **Prose claim** (part 1 `:889`): "the acceptance automaton accepts
  exactly the traces the step model admits (per-lane, fill fragment
  first)" — target R5 for automaton–model equivalence, R0 for runtime
  monitors. Ruled home: CSLib-pinned package, **deferred to its own
  ratification** (G5); until then the monitor runs against a transition
  table *generated from* `verify/fabric`'s step model (part 1 §7.2).
- **Interim obligation (pre-ratification)**: the generated table itself
  is a model artifact — its emission joins the corpus discipline
  (generated, provenance line, byte-diffed); the equivalence theorem
  waits for the CSLib ruling and for REF-4's close/authority semantics
  (part 1 §12 risk 6 sequences the close fragment behind the estate's
  own ladder).
- **Non-coverage now and later**: node internals/honesty (§7.3);
  availability; liveness; attribution.
- **Feeds**: slice 4 (the live monitor); the demo's
  zero-violations/planted-intruder gates.

### B-9 — F8, head-relative truth (recommend: corollary, and say so by ruling)

- **Prose claim** (part 2 `:177-184`): "a context assembled at heads H
  is never *wrong* later — a true record of a DAG position; staleness is
  head-relative absence, repealed by reassembly at newer heads, never a
  corruption."
- **Audit judgment**: F8's formalizable safety content is F7 applied at
  pinned inputs (a context value's bytes and certificate re-derive
  forever — determinism at a fixed valuation) plus the absence-sort
  refusal semantics already shipped; the "repealed by reassembly"
  clause in any *eventually* reading is liveness and must never be
  stated. No ruling assigned F8 a home (part 2 §8 amendment 1 names
  homes for F7/F9/F10 only) — a small roster gap worth closing
  explicitly so a future seat does not invent an F8 theorem. Recommend
  the coordinator rule F8 a **corollary note** under F7+F3 (the grill
  item 12 criterion cuts the other way here: no gate refusal needs to
  cite F8 by name — freshness refusals cite the absence sort and the
  anchor precondition).

### B-10 — prose laws with no F-number and no artifact (the completeness sweep)

| # | Prose law (site) | Status / obligation | Feeds |
| --- | --- | --- | --- |
| 1 | C7 at-most-one-landed-outcome per action declaration (part 2 `:211-215`) | F5's I2 verbatim with work digest = declaration digest; declaration-digest injectivity rides SHA-256 (trusted base). No new theorem; the E9 row cites F5 and the G23 external-effect bound sentence verbatim | E9 |
| 2 | C7 attempt/round separation (part 2 `:216-219`) | definitional (same declaration ⇒ same digest; new round ⇒ new digest); at most a two-line disambiguation lemma if E9's reviewers want a name; admission-level otherwise | E9 |
| 3 | C7 well-foundedness — the action DAG is acyclic (part 2 `:220-224`) | genuine small obligation when E9 opens: model pinning as an inductive admission order (a declaration pins only already-admitted digests) ⇒ the pin relation is well-founded by construction; the digest-preimage/collision argument stays in the trusted base and the row says so | E9 |
| 4 | The §5.7 candidate law — "meaning cannot be corrupted from the wire" (part 1 `:413-431`) | a COMPOSITE, never one theorem: clause (1) digest re-derivation = REF-2a's incoming theorem; (2) chain-linked append = the journal model (ticket 012 / REF lane — not Plait's to prove) plus slice 3's verify-on-ingest runtime gate; (3) same-set ⇒ same state = F1/F2 (done); (4) sealed-never-changes + no-stale-commit = F5 (in flight). Obligation: the ledger must only ever cite the clauses, never the composite as a claim | every slice's negative controls |
| 5 | The projection IOU — per-seat frontier soundness in the `fence_deterministic` style (part 1 `:642-647`; MPST refusal) | owed when the fabric frontier ships (slice 4); until then the frontier stays state-anchored and seat-relative, never `legal`-enumerating. Not scheduled — recorded here so it is not lost | slice 4 |
| 6 | Compaction horizon — "derived, not chosen … read off F3" (part 3 `:581-587`) | small corollary when retention lands (G21): compacting strictly below the minimum anchor floor preserves every deployed fold's resumed terminal state — an F3 instance over the min-floor; candidate name `compact_below_floor_preserves_resumption` | retention slice / `Retention.horizon` |
| 7 | External-effect bound (part 3 §6.3; ruled G23) | a BOUND, not a theorem — no obligation except the verbatim-in-kind sentence on every action-touching ledger row | all action rows |
| 8 | Tenancy fence (part 3 §6.2) | not a theorem; attribution-gated claim discipline only | G4-gated |
| 9 | Batch-vs-incremental drain equivalence (dispatch 31 decision 4's shape note) | explicitly DECLINED as a theorem by the spec — the wall and chaos gates carry it; recorded so nobody re-opens it as an oversight | E4 |

---

### The DEV-706 grill protocol (how to use B-3 and B-7)

The codex seat's F11/F12 drafts are graded line-by-line against the
cards, in this order: (1) statement shape — falsifiable carrier, the
named premise present (`SealsWellFenced` for F12; list-level tie-break
for F11), no `rfl`-provable law statement, no F5 restatement in 4.33;
(2) controls — every control from the card present, each refuted on
exactly its dropped condition with committed traces, refusals citing
F11/F12 *by name* (the entire point of ruling them separate statements,
grill item 12); (3) exclusions — the card's non-coverage list verbatim
in kind in the proposed row text; (4) house mechanics — roster +
footprint + partition + byte-identical regeneration in `verify/fabric`'s
gate idiom, corpus rows witnessed by bridge theorems. A draft may exceed
the cards (extra lemmas, tighter statements); it may not fall short of
any numbered bar without a coordinator ruling.
