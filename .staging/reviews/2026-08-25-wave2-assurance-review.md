# Wave 2 entity-store assurance review

Status: **staged G0 review; no claim or amendment is promoted by this report**  
Date: 2026-08-25  
Reviewed tree: `6f8a102ab76a40ce25b51ed52a21facdc8bcbe05`  
Toolchain exercised: Lean `4.33.1`, Lake `5.0.0-src+819816b`, Bun `1.4.0`, macOS/APFS  

## 1. Claim under review

The two Wave 2 reports say that their refutation wave found 21 items, that the major
model and shell counterexamples are real, and that the proposed repair families are
ready to guide the next formalization pass:

- [`2026-08-25-wave2-triage.md`](../../docs/entity-store/audit/2026-08-25-wave2-triage.md)
- [`2026-08-25-wave2-faults.md`](../../docs/entity-store/audit/2026-08-25-wave2-faults.md)

This review asks a narrower assurance question: which results are proofs, which are
finite checks or executable observations, which proposals remain conjectures, and how
far the chain reaches from the written model to the disk implementation and Effect
source material.

## 2. Executive verdict

**The Wave 2 diagnosis is substantially valid, but its evidence does not support the
current end-to-end store claims.** Sixteen fault claims reproduced directly, and the
current F-43 remediation was demonstrated independently. F-31 and F-38 are useful
positive evidence but are not the advertised full theorems. F-37 is only partly
established without a Windows run. F-44 was not remeasured and must remain a
platform-specific reported measurement.

The strongest justified statement is:

> At commit `6f8a102`, the existing E2 theorems replay in the Lean kernel within the
> estate axiom allowlist and apply to the exact `Reachable` model. The current shell can
> accept or open stores outside that model. Therefore the shell's claim that opening a
> directory establishes `Reachable`, and the model's unrestricted typed-reachability
> prose, are not justified by those theorems.

This is a **no-go** for saying the disk store establishes reachability, well-typedness,
acyclicity, or full Effect conformance. It is a **go** for citing the individual Lean
theorems at their exact signatures and model scope.

## 3. Assurance findings

### AR-1 — Wave 2 evidence is absent from a clean checkout

- **Class:** external-trust / observational gap
- **Severity:** major
- **Status:** confirmed
- **Evidence:** the R1/R2/R3 probes, adversarial scripts, transcripts, and Effect source
  cache are under ignored `.staging/` in `/Users/pooks/Dev/foldlab`. They do not exist in
  this clean Codex worktree. A clone of the reviewed commit cannot reproduce the audit
  from repository contents alone.
- **Correction:** before promotion, give the evidence a declared source, content
  identity, toolchain pin, replay command, and durable home allowed by the estate's
  artifact rules.

### AR-2 — the R1/R2 substrate pin does not contain the tested model

- **Class:** proof-trust / provenance gap
- **Severity:** blocker for promoting the audit evidence
- **Status:** confirmed
- **Evidence:** R1/R2 name `d994bd3` as their substrate. Git resolves it to
  `d994bd3616abd540d9fa9ecec1e8e215067c39ba` (`add effect research docs`), whose tree
  contains no `formal/entity-store`. The probes do replay against `6f8a102`, but that
  does not repair the false historical pin.
- **Correction:** record the actual tested tree for each probe and bind source, command,
  stdout, stderr, exit status, and toolchain into one receipt.

### AR-3 — bridge B1 through B4 are statements, not proved bridges

- **Class:** proof gap
- **Severity:** major
- **Status:** confirmed
- **Evidence:** `E2/Bridge.lean` defines four `Prop` values
  (`ObligationCanonPreservesClosed`, `ObligationCanonPreservesGuarded`,
  `ObligationCanonPreservesDupFree`, and `ObligationCanonRespectsConforms`). It contains
  no theorem inhabiting them. The R1 finite probes are counterexample searches and
  witnesses, not general proofs.
- **Correction:** keep B1-B4 in the obligation ledger until named theorems inhabit the
  approved statements and their axiom reports pass.

### AR-4 — the repository's canonical check does not check the entity store

- **Class:** observational gap
- **Severity:** major
- **Status:** confirmed
- **Evidence:** root `mise run check` passed, but the task runs only generation, a clean
  diff assertion, and `check:fips202`. It does not build or replay `formal/entity-store`,
  build the shell, run the differential harness, run generator/extractor tests, or
  regenerate the specified `LEDGER.md`. The ledger-extractor brief exists, but neither
  `experiments/entity-store-ledger/` nor `docs/entity-store/LEDGER.md` exists.
- **Correction:** add entity-store model, shell, canonical/adversarial harness, generator,
  extractor, and ledger regeneration to the canonical task before using a green root
  check as entity-store evidence.

### AR-5 — Effect source identity is only partly pinned

- **Class:** external-trust gap
- **Severity:** major for Effect-conformance claims
- **Status:** confirmed
- **Evidence:** for the five cached core files, the lock's Git blob SHA-1 values match
  the cached LF bytes, but its byte counts and SHA-256 values do not. The census already
  diagnoses a likely CRLF cause. `SchemaTransformation.ts` and other files used by the
  census are outside the lock. The cache itself is ignored and absent from a clean tree.
- **Correction:** regenerate the lock against Git object bytes, pin every cited file,
  and make reconstruction from the upstream commit mechanical. Until then, direct
  source correspondence remains G0 evidence.

### AR-6 — global-projection T-B is under-specified

- **Class:** model mismatch in a research proposal
- **Severity:** major before formalization
- **Status:** confirmed by countermodel reasoning
- **Evidence:** the proposed theorem is
  `addr G1 = addr G2 -> project G1 p = project G2 p`. For an arbitrary content-address
  function, two distinct globals may collide, so equal addresses do not imply equal
  projections. This conflicts with the model's correct practice in M6 of requiring an
  injectivity hypothesis for reverse address reasoning. Finite constructor case analysis
  cannot establish hash injectivity.
- **Correction:** either add `hInj`, state only equality of projected addresses under a
  factorization/coherence premise, or formulate the theorem on canonical preimages and
  lift it to addresses only in the forward direction.

### AR-7 — warning-clean and reproducible-build claims need repair

- **Class:** proof-process and reproducibility gap
- **Severity:** minor individually; major if CI treats warnings as failures
- **Status:** confirmed
- **Evidence:** `lake --wfail build` fails in both model and shell because
  `E2/Decode.lean` emits eight unused-variable warnings. Ordinary builds and the fresh
  checker pass. The extractor test could not start because its exact `typescript`
  dependency is not installed in the clean worktree; no installation was performed in
  this review.
- **Correction:** remove the warnings, provide a locked offline-capable dependency
  bootstrap, and run the extractor from the canonical check.

## 4. Disposition of F-25 through F-45

| Finding | Review disposition | Evidence class | Qualification or correction |
|---|---|---|---|
| F-25 | **confirmed** | proved counterexamples | `M17_store_form_FALSE` and `M17_survives_A6_FALSE` replay. Typed reachability as written is false because insertion canonicalizes while its premises concern raw carriers. |
| F-26 | **confirmed** | proved counterexample + finite model check | A-6 alone re-falsifies S1. The extended `dupFreeS (.lit v) := dupFreeV v` survived 15,310 generated schemas; it is not yet a general theorem. |
| F-27 | **confirmed** | proved carrier equalities | The named schema spellings collapse under lab `Conforms`. Admission importance still differs: some Effect forms are intentionally semantically distinct even when the current lab relation ignores the distinction. |
| F-28 | **confirmed** | proved witness + shell replay | Duplicate-key values are representable, reachable in the model, and admitted by the shell. The old claim that host objects make them impossible is false for the Lean carrier and textual boundary. |
| F-29 | **confirmed** | proved witness | `Check.filter` payload changes schema identity even though the current conformance environment can treat checks identically. This is a priced identity/semantics split, not automatically a defect, but the plan must name it. |
| F-30 | **confirmed** | proved counterexamples | M19 as worded fails on kind, conformance, WFS, and hash collision. The proposed `Admissible -> Reachable` replacement is plausible but unproved. |
| F-31 | **qualified positive** | counterexample search + lemma support | Probes support the intended acyclicity proof shape and found no counterexample. No theorem named M10 currently proves WF3 for `Reachable`; “M10 survives” must not be read as “M10 is proved.” |
| F-32 | **confirmed** | proved witness | WF1 and WF2 do not imply membership in `Reachable`; a colliding toy hash witnesses the gap. This directly refutes SH5's present implication. |
| F-33 | **confirmed** | proved witness + shell replay | The open scan does not enforce WFS and accepts a schema that the inductive model rejects. |
| F-34 | **confirmed with scope caveat** | proved carrier equalities | At least ten single-spelling families are absent from the v1 carrier. This establishes carrier compression, not that every omission is wrong; each family still needs a source-semantics admission ruling. |
| F-35 | **confirmed** | proved witness | References encoded as `.lit (.vaddr a)` are invisible to `refsS`, yet such a schema can be inserted once its other premises hold. A ruling is needed on whether literal addresses are references or data. |
| F-36 | **confirmed at G0 source correspondence** | source inspection + proved model witness | The lab union rule accepts membership in one branch regardless of mode. The cached Effect source rejects a second success under `oneOf`. Source pin defects prevent a stronger correspondence claim. |
| F-37 | **partly confirmed** | code inspection | The shell is not transportable through Git alone because ignored evidence and host assumptions remain. Windows path, CRLF, and filesystem behavior were not executed in this review and remain unverified. |
| F-38 | **qualified positive** | proved companion theorem | `reachable_keys_nodup` and find-extensionality probes support an M11 repair. The complete insertion-semilattice statement has not been pinned and proved. |
| F-39 | **confirmed on this host** | executable observation | `Widget` and `widget` collide on the current case-insensitive APFS name plane while the pure model distinguishes them. A cross-host contract is absent. |
| F-40 | **confirmed** | shell replay | Duplicate-key schema bytes can pass the boundary despite WFS requiring duplicate freedom. |
| F-41 | **confirmed** | shell replay | The shell's scan accepts a structurally valid, canonical schema outside WFS. |
| F-42 | **confirmed, wording narrowed** | executable observation | A directory in place of an object crashes `check`; a FIFO blocks until killed by timeout. Ordinary absent referents produce `wf2`, so “missing file” is too broad. The bug is non-regular, unreadable, or racy directory content. |
| F-43 | **fixed at reviewed commit** | negative mutation tests | Adding `IO.getEnv`, an `unsafe` definition, or a fake `Shell.sha3_512` makes the appropriate root gate fail. Keep the finding as history, not as a current open fault. |
| F-44 | **not remeasured** | prior measurement only | The reported approximately 26 KB/s scan result is platform-specific and staged. It is not theorem evidence and was not treated as current. |
| F-45 | **confirmed** | repository count | There are ten committed harness scripts; the README and shell delivery record still say nine. |

## 5. Theorem and experiment evidence

### Proved or kernel-replayed

- `formal/entity-store`: ordinary `lake build` completed; `lake env leanchecker --fresh E2`
  completed. The gate scanned 1,444 E2 constants. Reported axioms stayed within
  `propext`, `Classical.choice`, and `Quot.sound`, with many theorems using strict
  subsets. No `sorry`, `admit`, `native_decide`, `bv_decide`, `extern`, or
  `implemented_by` was found in the package.
- Every R1 probe (`p1_order` through `p7_b4_object`) recompiled against the reviewed
  package and reproduced its saved output byte-for-byte.
- Every R3 probe (`p1_graph`, `p2_findext`, `p3_spellings`, `p4_q12`, and
  `p5_openscan`) compiled and printed axiom sets within the allowlist.
- `cost-denotation-lean-probe.lean` compiled on the pinned Lean version. Its writer,
  quotient, cost, boundedness, and transport examples are valid toy-model results at
  their printed axiom footprints.
- `rocq-itrees-lean-probe.lean` compiled. Its carrier, interpreter, observation, and
  `eqit`/`eutt` definitions establish definitional feasibility, not the later equivalence,
  refinement, or source-correspondence laws.

### Model-checked

- The proposed F-26 duplicate-freedom repair was exhaustively checked only over the
  scout's finite universe of 15,310 schemas.
- R1/R3 finite enumerations and searches are useful falsification evidence but do not
  prove their surviving universal claims.

### Tested

- The current canonical shell harness ran all ten scripts successfully from a fresh
  temporary store.
- Seven Wave 2 adversarial scripts replayed. The name case-collision script produced the
  expected model/disk divergence; the other six reproduced the documented admitted or
  rejected behavior.
- The generator ran 10 Bun tests and its generated-tree consistency check successfully.
- Three independent mutations confirmed the repaired shell gate catches forbidden IO,
  unsafe code, and core-name shadowing.

### Measured

- No new throughput measurement was made. F-44 remains a prior local measurement.

### Assumed or externally reported

- Research-survey claims about the wider literature were not re-searched or repinned.
  The local Lean probes substantiate only the constructions they contain.
- The source lock's CRLF explanation is plausible and consistent with the byte-count
  deltas, but the lock itself calls it diagnosed rather than proved.

### Unknown

- Windows behavior and the Windows `Std.Http` leg.
- The complete M10, M11, repaired M19, B1-B4, and M18 theorems.
- A faithful, mechanically pinned end-to-end correspondence to the current Effect
  implementation.
- Shell refinement to `Reachable`, including WFS, typed conformance, and acyclicity.

## 6. Assurance by axis

| Axis | Verdict | Boundary of the verdict |
|---|---|---|
| Specification intent | **fails at current prose** | `STORE-MODEL` and `STORE-SHELL` state typed/open reachability more strongly than the formal premises and shell checks support. |
| Formal model | **mixed** | Existing named theorems replay; M17, M19, M10, M11, and B1-B4 are false as worded, unproved, or only partly supported. |
| Proof trust | **passes for existing theorem receipts** | Kernel replay and axiom footprints pass; `--wfail` remains red because of eight warnings. Ignored and falsely pinned scout evidence cannot be promoted as-is. |
| Implementation/refinement | **fails** | The shell admits states outside `Reachable`; open-scan, canonical typing, name portability, and totality gaps remain. |
| External observations | **mixed** | macOS harness and mutation tests reproduce; Windows and clean-clone source reconstruction do not. |
| End-to-end | **no-go** | No theorem chain connects Effect source semantics through the model to every store accepted by the disk shell. |

## 7. Plan and research-document assessment

| Document or group | Assessment | What can be carried forward |
|---|---|---|
| `KICKOFF.md` | **mixed** | The separation of immutable objects from mutable names is useful. “Distinct content cannot collide” is false without a hash-injectivity hypothesis, even though the section is marked under discussion. Its topology and semantic-demand sections remain proposals. |
| `STORE-MODEL.md` | **requires correction** | The encoded carriers and proved M-series results are usable at their exact signatures. Typed reachability, M10, M19, the A-3 closure record, and the A-6 repair record overstate what is currently established. The file's staged/pre-grade status also conflicts with later ratification language. |
| `STORE-SHELL.md` and shell README | **requires correction** | The rung separation and enumerated IO boundary are good. SH5, the promised single-writer mutex, the WFS coverage, the duplicate-key coverage claim, and the nine-script count do not match the implementation. |
| `MAPPING.md` | **useful decision record, incomplete boundary** | The disposition table can continue to drive generation. Its admission prose is not yet one executable predicate, and F-27/F-34/F-36 show that spelling coverage and semantic correspondence need separate rows. |
| `PROCEDURE.md` | **good process specification, incomplete implementation** | Its proof/refutation distinction is the right discipline. The required mechanical ledger and canonical replay path are still absent, so the procedure is not yet enforced by the repository. |
| `schema-ast-census.md` | **substantively useful, provenance-limited** | Direct source observations, including `oneOf` second-success rejection, are useful G0 inputs. Repair the CRLF-sensitive lock fields and pin every cited file before using them in a higher-gate correspondence claim. |
| `cost-semantics-survey.md` + probe | **local construction valid; integration open** | The 301-line Lean probe compiles and supports the proposed writer/quotient/cost modeling technique. It proves no cost theorem about the entity-store program, and the survey's external literature judgments were not independently revalidated here. |
| `demand-provenance-survey.md` | **research agenda only** | The demand-shaped and provenance ideas are plausible design inputs. There is no companion entity-store formalization or theorem receipt, so all proposed obligations remain unknown. |
| `global-projection-survey.md` | **research agenda with one invalid theorem shape** | T-A and T-C are legitimate conjectures to test. T-B must be restated with hash injectivity or at the canonical-preimage/forward-address level before dispatch. |
| `itrees-ctrees-literature-notes.md`, `rocq-itrees-modeling-survey.md`, `lean-coinduction-realization-survey.md`, and probe | **definitional feasibility only** | The 413-line probe compiles and shows that the core datatypes and observations can be represented in bare Lean. It does not establish the full equivalence laws, operational correspondence, guarded corecursion policy, or correspondence with the cited Rocq libraries. |
| `lean-metaprogramming-survey.md` and `lean-toolchain-mechanization-notes.md` | **useful mechanics, not yet adopted** | Fresh checking, axiom reports, JSON diagnostics, and dependency inspection are appropriate ingredients. The current entity-store check and ledger have not incorporated the proposed machinery. |
| generator and extractor plans | **generator reproducible; extractor not demonstrated in clean tree** | Generator tests and regenerate/diff checks pass. The extractor could not start without its exact TypeScript dependency, so clean-checkout extraction remains an open reproducibility obligation. |

The broad surveys are therefore suitable as **proposal inputs**, not as evidence that the
entity-store already has cost, demand, global-projection, or ITree theorems. Their local
probes support representation choices; they do not close the model, refinement, or
external-source axes.

## 8. Proposals

### P0 — repair the evidence and canonical check first

1. Replace the false scout substrate pin with receipts naming the actual Git tree,
   toolchain, input digest, command, output digest, and exit status.
2. Give Wave 2 evidence a reproducible, declared transformation and an estate-approved
   home after grilling; do not cite ignored local paths as durable proof receipts.
3. Implement the mechanical ledger and make root `mise run check` replay the E2 model,
   shell gates, ten canonical scripts, selected negative/adversarial scripts, generator,
   extractor, and ledger regeneration.
4. Fix the eight warnings so `--wfail` is a real acceptance gate.

### P0 — narrow false claims immediately, then freeze repaired declarations

Until repaired theorems exist, change the claim posture—not silently the semantics:

- SH5 should say the scan checks its enumerated disk conditions, not that it establishes
  `Reachable`.
- Typed reachability should be stated only for the exact stored canonical carriers
  actually justified by the `Reachable.putE` premises.
- M10, M11, M19, and B1-B4 remain obligations, not surviving/proved inventory rows.

Any ratified document edit still requires the estate's amendment and grilling procedure.

### P0 — repair canonical typing as one boundary law

Choose and pin one of two coherent contracts:

1. **Canonical-premise contract:** define stored conformance using canonical carriers,
   conceptually `Conforms env (canonS s) (canonV v)`, and require PUT to establish that
   judgment; or
2. **Bridge contract:** retain raw-carrier premises but prove B1-B4 and make every
   necessary side condition part of admission.

In either contract, extend schema duplicate-freedom through `.lit` with `dupFreeV`, reject
duplicate-key values at every textual boundary, and rule whether check payloads and
literal addresses are identity-bearing data or semantically interpreted references.

### P0 — define one admissibility predicate for model and shell

Define a single decidable `Admissible`/`WFS` boundary predicate used by schema PUT,
entity PUT, and full open-scan. It should cover canonical image, duplicate freedom,
closedness, guardedness, reference closure with kind-correct targets, stored conformance,
and acyclicity. Then:

- implement the same decision procedure in the shell;
- return an explicit acyclic insertion-order witness, for example by a deterministic
  topological sort;
- prove the repaired M19 from that witness to `Reachable`;
- prove the shell scan result refines that decidable predicate.

This closes F-30/F-32/F-33/F-40/F-41 as one contract rather than independent patches.

### P1 — make names and disk reads host-independent

- Prefer a lossless filename encoding of UTF-8 name bytes, or restrict and normalize the
  model's name key with an explicit injective encoding. Merely lowercasing the disk name
  would change model semantics and is not sufficient by itself.
- Before reading an object, reject non-regular entries, avoid following unexpected
  links, enforce a size bound, and turn filesystem faults into exit-code-2 environment
  errors. Add directory, FIFO, link, permission, and read-race negative tests beneath
  the normal admission layer.

### P1 — repair source provenance

- Rebuild `sources.lock.json` from LF Git object bytes and verify both Git blob and
  SHA-256 fields.
- Pin every file used by the census, including `SchemaTransformation.ts` and internal
  representation helpers.
- Preserve the exact reconstruction command; the ignored source cache should be a
  reproducible cache, not the only copy of evidence.

### P2 — restate research targets before dispatch

- Replace global-projection T-B with a forward, preimage-level theorem or add an explicit
  address-injectivity hypothesis. Do not claim that different content cannot collide
  without that hypothesis.
- Treat the cost and ITree probes as reusable modeling techniques. They do not yet prove
  entity-store cost laws, demand provenance, operational refinement, or equivalence to
  the Rocq libraries.
- Keep T-A, T-C, demand/provenance obligations, and the full `eqit` law suite in the
  proposed/unknown register until their declarations and proofs exist.

## 9. Recommended execution order

1. Repair evidence identity, root checks, and the mechanical ledger.
2. Narrow SH5 and typed-reachability prose so the public claim matches today's chain.
3. Ratify the canonical-typing contract and prove its bridge or canonical-premise laws.
4. Ratify and implement shared admissibility, then prove repaired M19 and shell-to-model
   refinement.
5. Repair host-independent names and hostile-file totality.
6. Only then dispatch global projection, cost, demand, and ITree integration theorems.

The triage's repair families are directionally good. This ordering adds an assurance
precondition: first make every subsequent green result reproducible and prevent the
current false end-to-end claim from surviving while the repairs are developed.

## 10. Final determination

The two Wave 2 documents are a credible **refutation record at G0**. They should not yet
be treated as a promotable assurance artifact because their receipts are ignored, their
substrate pin is wrong, and several positive or repaired statements are not theorems.
The counterexamples are nevertheless useful and mostly robust: they identify a real
seam between the inductive model and what the shell accepts. The next cycle should close
that seam with one shared admissibility judgment and a proved shell-to-model boundary,
not by accumulating more prose assertions around the current scan.
