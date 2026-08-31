# Effect Core v1 — end-to-end packet audit

Date: 2026-08-31
Lane: assurance review, read-only
Target: `.staging/effect-core-v1/` (14 `.md`, 5 `.lean`, TypeScript probe harness)

## Stage and gate

Stage: `.claude/skills/lean/workflows/lean-assurance-review/SKILL.md`, with its
`references/trust-taxonomy.md`, `references/report-schema.md`, and
`references/refinement-and-conformance.md`.

Gate passed: the stage's completion gate — every in-scope link carries either
evidence or an explicit gap, and the headline claim is stated no stronger than
its weakest required link. Findings use the stage's verdict vocabulary
(`spec-mismatch`, `model-mismatch`, `proof-debt`, `implementation-gap`,
`external-trust`, `observational-gap`). The tree was not mutated; this file is
the only artifact written.

## Headline claim, and what it is actually worth

The packet's own claim is correct as far as it goes: every Lean file in the
packet elaborates, every stated axiom ceiling reproduces, and no counterexample
row rests on a failing command. I reran all six Lean files and both TypeScript
probes; all exit 0 with the receipt counts and axiom ceilings the packet
states. The three red controls are red with exactly their stated diagnostics.

What that does not establish, and what this audit found instead: the packet's
**traceability layer is not built**. The counterexample register is internally
clean but is joined to nothing — no proof-DAG row, no type-closure edge, and
none of the 92 contract falsifiers cites a single counterexample ID. Separately,
one theorem the packet repeatedly calls "existing" does not exist in the estate,
and the counterexample ID space collides with the report that produced its own
witnesses.

Strongest supported claim: *the packet's Lean exhibits and probes reproduce
exactly as stated, and the four owed proof-DAG amendments have been made.*
Not supported: *the register is a working index that a mechanical gate could
consume*, and *`EC1-T130` transfers an already-proved estate theorem*.

## Findings

Ranked most severe first. Every line number was verified by grep or by reading
the cited file, not inferred.

| # | Class | Sev | Finding | Evidence | Correction |
|---|---|---|---|---|---|
| **F1** | `proof-debt` | **blocker** | `wlp_append` is cited as an **existing** estate theorem in five places. It does not exist anywhere in `library/cas`. The estate has `wpAux_append` (`/Users/pooks/Dev/foldlab/library/cas/Cas/Lang/Wp.lean:501`) and `wp_append` (`:528`) only. `wlp_append` exists solely as `EffectCoreBreaker.wlp_append` at `/Users/pooks/Dev/foldlab/.staging/effect-core-v1/breaker-exhibits.lean:874`, inside the scratch file `README.md:82-85` explicitly refuses to promote. | `grep -rn 'wlp_append' /Users/pooks/Dev/foldlab/library/cas/` → **zero hits**. Cited as existing at `CONTRACT-PACKET.md:546`, `CONTRACT-PACKET.md:793`, `PLAN.md:229`, `PROOF-DAG.md:400`, `PROOF-DAG.md:502`; relied on at `PROOF-DAG.md:539-540` and `COUNTEREXAMPLES.md:113`. | `EC1-T130` is a **new** obligation, not a transfer. Either promote `wlp_append` into `Cas/Lang/Wp.lean`, or restate every occurrence as "existing `wpAux_append`, specialized to `wlp` — owed". The breaker file's own docstring at `breaker-exhibits.lean:889-891` already says the packet "has been reading that side condition as a `wp`-only" fact. |
| **F2** | `spec-mismatch` | **blocker** | `EC1-CE045`–`EC1-CE048` denote **different statements** in the register than in the breaker report that produced their witnesses, and `EC1-CE051`/`EC1-CE052` were dropped with no `SUPERSEDED` row. `EC1-CE045` means "`projectCas` is a projection" in one document and "`ensuring` finalizes" in the other. | `/Users/pooks/Dev/foldlab/.staging/agent-reports/2026-08-31-effect-core-breaker.md:578-586` proposes CE045=`toPProg`, CE046=scoped catch, CE047=`ensuring`, CE048=(Mod-E), CE049=restarted history, CE050=fuel/refusal, CE051, CE052. The register assigns CE040=`toPProg`, CE041=scoped catch, CE045=`ensuring`, CE046=(Mod-E), CE047=restarted history, CE048=fuel/refusal. `COUNTEREXAMPLES.md:38-40`: "IDs are never reused." | Record the renumbering explicitly, or restore the breaker's numbering. A generated `COUNTEREXAMPLES.json` keyed on these IDs will silently mis-join today. `EC1-CE051`/`EC1-CE052` need admission or an explicit refusal. |
| **F3** | `model-mismatch` | major | The breaker **narrowed** `EC1-CE003`'s witness and the register does not record it. `exhausted_is_not_a_refusal` is not a schema: its second conjunct is vacuous for any graph that has not halted by fuel 1. | `breaker-exhibits.lean:496-501` (§3, "NARROWED"); witnesses `loop_exhausts_at_0_1_2` (`:508`) and `loop_run_exhausts` (`:518`), both in the 40 verified receipts. `COUNTEREXAMPLES.md:61` still cites the unnarrowed witness. | CE003's prose does scope the witness to "the smallest completing graph", so the row is not false — but §10 clause 4 ("a stronger statement reopens the row") is unhonoured, and the ID that carried the narrowing (`EC1-CE051`) was dropped. |
| **F4** | `observational-gap` | major | **The register is joined to nothing.** `PROOF-DAG.md` cites zero `EC1-CE` IDs. So do `TYPE-CLOSURE.md`, `CONTRACT-PACKET.md`, `ALGEBRA.md`, `CLASSIFICATION.md`, `PLAN.md`, `ORGANIZATION.md`, `EXHIBITS-REVIEW.md`, `EXISTING-TYPES.md`, `REIFICATION-CHECKLIST.md`, `AGENTS.md`. All 92 `EC1-F*` falsifier rows in `CONTRACT-PACKET.md` carry zero counterexample joins. | Per-file ID census (see §"Commands run"). Only `README.md` (1 ID) and `WORKSHOP-RESULTS.md` (4 IDs) cite outside the register. | This fails two of the packet's **own** gates: `TYPE-CLOSURE.md:86-88` ("Every active counterexample attacking an edge is named by stable ID from `COUNTEREXAMPLES.md`") and `ORGANIZATION.md:361-364` gate 20 ("a type/theorem row that ignores an active counterexample"). |
| **F5** | `external-trust` | major | `EXHIBITS-REVIEW.md` §1's verification receipt is **not reproducible as written**. Its rerun command names a file that does not exist. | `EXHIBITS-REVIEW.md:9` and `:23` give `.staging/effect-core-v1/exhibits.lean`; the file is at `.staging/effect-core-v1/workshop/exhibits.lean`. I ran `:23` verbatim from `library/cas`: **exit 1**, "no such file or directory". | Correct both lines to `workshop/exhibits.lean`. The receipt itself is true of the correct path — I reran it: exit 0, 17 receipts. `README.md:73` already uses the correct path. |
| **F6** | `observational-gap` | major | 10 of 29 register rows carry **no literal runnable command**. | `EC1-CE002` names files and cwd but no command string (`COUNTEREXAMPLES.md:60`). §5 (`EC1-CE030`–`CE033`) says only "run its packet command" (`:90`). §8's mutant table (`:128-133`) has no command column at all; `bun .staging/effect-core-v1/workshop/tsgo/run-probes.ts` appears only in `README.md:79`. | `ORGANIZATION.md:361-363` gate 20 names "a registered counterexample with no ... reproducible evidence command" as a drift defect. Add the literal command to §5 and §8. |
| **F7** | `observational-gap` | major | `EC1-CE021` has no retained concrete witness. | `COUNTEREXAMPLES.md:79`: "the original false-green fixture was not retained." | The row is `REPORTED` and honest, but it cannot close, and §10's `missingConcreteWitness` is non-empty on its account alone. Reconstruct the fixture or mark the row permanently historical. |
| **F8** | `model-mismatch` | major | `EC1-CE002`'s prose **inverts its own witness**. | `COUNTEREXAMPLES.md:60` describes "a composite run finishes although the two fixed-fuel component results do not determine it". `run_composite_outruns_its_parts` (`/Users/pooks/Dev/foldlab/library/cas/Cas/Backend/Universal.lean:918`, docstring `:911-916`) states the opposite: at fuel 2 **each half has DONE-halted while the composite is still RUNNING**. The parts finish; the composite does not. | The row's consequence (coherence at `interpretRef`, never fixed fuel) is unaffected. Restate the witness in the theorem's own direction. |
| **F9** | `observational-gap` | minor | The packet's evidence-input list omits the breaker report. | `README.md:33-36` lists four reports. `.staging/agent-reports/2026-08-31-effect-core-breaker.md` — producing lane for `breaker-exhibits.lean`, on which six register rows depend — is absent, though `README.md:74` runs its Lean file. | Add it, or state why it is excluded. F2 and F3 are both consequences of this report being un-tracked. |
| **F10** | `spec-mismatch` | minor | Transposed citation: `through_id_left`/`through_id_right` are swapped. | `WORKSHOP-RESULTS.md:438` cites them at `Universal.lean:739,757,765,785`. Actual: 739 `through_assoc` ✓, **757 `through_id_right`**, **765 `through_id_left`**, 785 `through_monoid` ✓. | Swap the two names, or cite `757,765` as `through_id_right/left`. |
| **F11** | `spec-mismatch` | minor | Falsifier count is wrong: "six" should be **seven**. | `WORKSHOP-RESULTS.md:488` says "six falsifiers ... `Wp.lean:773–858`". Actual seven: `falsifier_wp_not_faithful` (773), `falsifier_empty_family` (787), `falsifier_append_needs_history` (798), `falsifier_empty_prefix` (815), `falsifier_wlp_ne_wp` (832), `falsifier_partial_is_not_total` (843), `falsifier_fuel_bound_is_tight` (858). | Say seven. |
| **F12** | `observational-gap` | minor | §3's axiom-ceiling note understates the classification file's actual ceiling. | `COUNTEREXAMPLES.md:70-72` claims the file's ceiling is axiom-free plus `propext`. My rerun: `grade_closed_sound` also reports `Quot.sound`. | True of the counterexample rows, mislabelled as "for the classification file". `EXHIBITS-REVIEW.md:28-31` states it correctly — copy that wording. |
| **F13** | `spec-mismatch` | minor | `STATE-OF-MECHANIZATION.md:47` is cited without a path and with a loose paraphrase. | `WORKSHOP-RESULTS.md:661` says it "says there is no Effect host runner". The file is not under `library/cas` (where the surrounding citations point) but at `.staging/operational-structure/STATE-OF-MECHANIZATION.md`; line 47 is the heading "## L3 — proved, unwired". The "NO host codec"/"no host verifyHandler" text is at `:49-51`. Nothing at `:47` mentions a host runner. | Add the directory and cite `:49-51`. |

Findings from the two sub-lanes (parts D and E) are listed in their own sections
below and are not renumbered here.

## §10 completeness contract, run by hand

Every set below was computed from `COUNTEREXAMPLES.md` §10 against the current
tree. **Four of eleven are empty.**

| Set | Result | Members / detail |
|---|---|---|
| `unregisteredContradictionClaims` | **NON-EMPTY** | The register-adjacent ones are the load-bearing cases: `PROOF-DAG.md:214-217` ("The local two-defect counterexample proves that a fail-fast checker cannot promise every condemning clause") and `PROOF-DAG.md:357-360` ("No theorem requires complete classifier equality under `SemEq`... the local CAS witness has equal runs but different `PProg.envelope` answer-dataflow graphs") both state a refutation by description without naming `EC1-CE031` / `EC1-CE032`. `PROOF-DAG.md:195` cites "`Cas/Backend/Canon.lean`'s duplicate-key counterexample" without naming `EC1-CE030`. `PROOF-DAG.md:402-403` states the admission stop without naming `EC1-CE033`. `PROOF-DAG.md:236` ("There is deliberately no `race_commute` or unconditional `par_commute`") names no row. Part D's lane found the same pattern in `WORKSHOP-RESULTS.md`. |
| `orphanCounterexamples` | **NON-EMPTY — 24 of 29** | Cited **outside** the register, anywhere in the packet: `EC1-CE002` (README), `EC1-CE040`, `EC1-CE041`, `EC1-CE045`, `EC1-CE048` (WORKSHOP-RESULTS). The other 24 are cited only by the register itself: `CE001`, `CE003`–`CE010`, `CE020`, `CE021`, `CE030`–`CE033`, `CE042`–`CE044`, `CE046`, `CE047`, `M001`–`M004`. Counting the four agent reports named as evidence inputs as citers lowers this to **17**. |
| `duplicateCounterexampleIds` | **EMPTY within the register**; **NON-EMPTY across the packet's evidence corpus** | No ID appears twice in `COUNTEREXAMPLES.md`. But `EC1-CE045`–`CE048` each carry a *different* statement in `2026-08-31-effect-core-breaker.md` — see **F2**. |
| `missingAttackedQuantifier` | **EMPTY** | All 25 `EC1-CE` rows name an exact statement with its quantifier or premise. Checked row by row. The four `EC1-M` controls are exempt by §8's own framing. |
| `missingConcreteWitness` | **NON-EMPTY — 1** | `EC1-CE021` ("the original false-green fixture was not retained"). The three `OWED` rows (`CE042`–`CE044`) are exempt by §10's own clause and each states its required witness. |
| `missingEvidenceCommand` | **NON-EMPTY — 10** | `EC1-CE002`, `CE021`, `CE030`, `CE031`, `CE032`, `CE033`, `M001`, `M002`, `M003`, `M004`. See **F6**. |
| `verifiedRowsWhoseCommandFails` | **EMPTY** | I ran every command the register states. All exit 0; all receipt counts and axiom ceilings match. See §"Commands run". (The one failing command in the packet, `EXHIBITS-REVIEW.md:23`, is not a register row — **F5**.) |
| `falsifierRowsWithoutCounterexampleOrOwedAttack` | **NON-EMPTY — 92 of 92** | Every `EC1-F*` row in `CONTRACT-PACKET.md` lacks a counterexample or owed-attack join. `COUNTEREXAMPLES.md:135-137` says this join is future work, so the set is non-empty by design — recorded because §10 requires all sets empty for a slice to close. |
| `proofEdgesIgnoringActiveCounterexamples` | **EMPTY by the letter; NON-EMPTY by intent** | No `PROOF-DAG.md` row still *asserts* a statement a `VERIFIED-KERNEL` row contradicts — all four owed amendments were made (see next section). But §10 clause 1 requires each edge to *list* every counterexample attacking it, and **zero of 25 rows are joined to any DAG row**. See **F4**. |
| `resolvedRowsWhoseForcedPremiseWasDropped` | **NON-EMPTY — 1** | `EC1-CE003`: the breaker's narrowing and its two witnesses were dropped along with `EC1-CE051`. See **F3**. `CE030`/`CE031`/`CE032`/`CE033`/`CE041`/`CE046` all had their forced premises retained — verified individually against `PROOF-DAG.md:179`, `:206`, `:355`, `:381`, `:539-540`, `:400`. |
| `mutantsNeverObservedRed` | **EMPTY** | I ran the harness. `EC1-M002` `floatingEffect` (code 377001), `EC1-M003` `missingEffectError` (377003), `EC1-M004` `lazyPromiseInEffectSync` (377082) — each rejected by exactly its stated diagnostic with `strictExitVerified: true` and `actualExit: 1`. `EC1-M001` positive: 1 file, 0 diagnostics, `detectedEffectV4: true`. Note `M004` is a *warning* promoted to nonzero exit by `--strict`; `COUNTEREXAMPLES.md:133` states this precisely ("strict nonzero exit", not "error"). |

### On the operator's prior ID-hygiene result

Confirmed in the narrow sense, refined in the broad one. The register defines
exactly 29 IDs and no duplicates, and every ID cited inside the packet resolves
to a defined row. But "29 cited" is computed almost entirely from the register
citing its own rows: only 5 IDs are cited from outside it. And the check does
not extend to the agent-report corpus, where `EC1-CE049`–`EC1-CE052` are cited
and undefined (**F2**).

## The four owed PROOF-DAG amendments

`README.md:101-103` names four. **All four have actually been amended. None
cites its counterexample ID.**

| # | Subject / row | Amended? | Amended statement | Cites its ID? |
|---|---|---|---|---|
| 1 | duplicate-free row normalization — `EC1-CE030`, `EC1-T002` | **YES** | `PROOF-DAG.md:179`: `normalizeRow_canonical : NodupKeys r -> NodupKeys s -> (rowEq r s <-> norm r = norm s)`. The forced `NodupKeys` premises are present on both sides. Recorded again at `:530` item 16. | **NO** — `:195` calls it "`Cas/Backend/Canon.lean`'s duplicate-key counterexample" |
| 2 | fail-fast diagnostic completeness — `EC1-CE031`, `EC1-T015` | **YES** | `PROOF-DAG.md:206`: `first_diagnostic_complete : FirstReject r path code -> check r = error (diagnostic path code)`, with `:214-217` stating it is "first-error completeness, not an accumulating-diagnostic theorem" and that changing it back "requires explicitly constructing and separately proving an accumulating checker". | **NO** — "the local two-defect counterexample" |
| 3 | classifier invariance — `EC1-CE032`, `EC1-T088` | **YES** | `PROOF-DAG.md:355`: `classifier_semEq_overlap : SemEq O p q -> Observed O p i x -> x in gammaProjection O (classify p) and x in gammaProjection O (classify q)` — equality replaced by mask-selected concretization overlap, with `:357-360` stating "No theorem requires complete classifier equality under `SemEq`". | **NO** — "the local CAS witness" |
| 4 | total injection from arbitrary raw `PProg` — `EC1-CE033`, `EC1-T100`/`T101` | **YES** | `PROOF-DAG.md:375` restricts the domain ("Injection rows quantify over `p : CheckedPProg`"); `:381` gives `admitCas_iff` as the admission boundary; `:402-403` states "raw empty and dangling `PProg` values remain representable but cannot be silently coerced into `CheckedProgram`". | **NO** |

This is the good news in the audit. The amendments are real and each names the
premise, restriction, or domain split its witness forced — which is §10 clause 2.
What is missing throughout is clause 1: the edge does not list the counterexample.

## Part D — cross-document consistency on the nine settled rulings

Delegated to a dedicated read-only lane. Its result, verified against my own
spot-checks:

**Six of nine clean. All five high-risk late-settled rulings (1, 2, 4, 6, 7) are
CONSISTENT** — the reconciliation reached every owning document. Every packet
mention of `HHandler`, `Behavior`, a second straight-line carrier, fixed-fuel
bind, and fuel-as-refusal is a rejection or a counterexample row, never a live
proposal. I independently confirmed that `HHandler` and `Behavior` exist as
declarations nowhere in `library/cas` and appear in the packet only under
prohibition.

**All hard contradictions are concentrated in `WORKSHOP-RESULTS.md`**, which
`AGENTS.md:45` already declares non-authoritative ("Must not own: promoted
claims or frozen declarations"). That mitigates but does not remove them — they
are live prose asserting proof discharge.

| Ruling | Verdict | Contradicting passage | Class | Sev |
|---|---|---|---|---|
| 3 — relational meaning, no global uniqueness | **CONTRADICTED** | `WORKSHOP-RESULTS.md:782-783`: "`EC1-T045` INHERITS from `denotes_unique`". `EC1-T045` (`exec_prefix_unique_given`, `PROOF-DAG.md:258`) is a full-core row over `execN`/`DecisionTape`; `denotes_unique` is the CAS/block-fragment exhibit result. This is exactly the globalization `EXHIBITS-REVIEW.md:132-141` and `PROOF-DAG.md:266-277` forbid. | `model-mismatch` | major |
| 8 — `ReaderT Env (Prog CasSig)` inadequate for catch | **CONTRADICTED** | `WORKSHOP-RESULTS.md:784-785`: "`EC1-T056`/`EC1-T057` were upgraded to INHERITS after the lane read §6 — the scoped-handler construction held under a second reader." That construction is `Handler ScopeSig (ReaderT Env (Prog CasSig))`; `EC1-CE041` refutes precisely this inference. The same file contradicts itself at `:681-683`. | `proof-debt` | major |
| 8 (stale hedge) | minor | `EXHIBITS-REVIEW.md:106-107`: "**may** require a richer existing target-monad stack" — `no_handler_into_ScopeM_catches` proves it always does. | `model-mismatch` | minor |
| 9 — mechanically closed graph before cutover | **CONTRADICTED** | `WORKSHOP-RESULTS.md:782` ("Four rows are discharged outright"), `:557` ("`EC1-T101`, `EC1-T102` \| PROVED"), `:907-908` ("proved rather than pending"). Both rows are PENDING at `PROOF-DAG.md:382,385`, and the exhibit theorems are proved for scratch `GProg`/`ofPProg` carriers that `EXHIBITS-REVIEW.md:73-76` refuses to promote. Also contradicts `README.md:84-85`. | `proof-debt` | major |
| 1, 2, 4, 5, 6, 7 | **CONSISTENT** | — | — | — |

Minor drifts the lane also surfaced: `WORKSHOP-RESULTS.md:101` and `:377` cite
`EC1-R15` (the CAS-identity ruling) where the block-body ruling is `EC1-R29`
(`PLAN.md:227`); `:610` admits coherence "at the colimit" as a second face that
ruling 5's definite article excludes; `EXHIBITS-REVIEW.md:146-149` gives a
`Runs`/`Denotes` signature diverging from the carrier owner at `ALGEBRA.md:607-609`;
`REIFICATION-CHECKLIST.md:739` names `CasPProgAdmissible` where four other
documents name `CasAdmissible`.

## Part E — estate-law conformance (`EFFECTS-BACKEND.md` R1–R15)

Delegated to a dedicated read-only lane.

**R1, R4, R5, R7, R14/R14a are preserved** — checked exhaustively and cleared
with quoted evidence. Notably R5's byte-decidable word gate survives
(`WORKSHOP-RESULTS.md:576-578`, `ALGEBRA.md:760`), R4's presentation identity
survives (`CLASSIFICATION.md:409-414`, `ALGEBRA.md:731-736`), and R1's inductive
carrier survives (`ALGEBRA.md:580-584`, `:612-614`; grep of all four packet
`.lean` files found zero `coinductive`, `partial def`, `Stream`, `sorry`, or
`native_decide`). No packet document claims authority to amend a rule.

| # | Class | Sev | Finding |
|---|---|---|---|
| **E1** | `spec-mismatch` | **blocker** | `PLAN.md:64-66` narrows ratified law to "the ratified law **for CAS**". `EFFECTS-BACKEND.md:6-8` and `library/cas/AGENTS.md:58-60` bind it to the whole lane. A packet that reads the law as CAS-scoped has no rule forbidding E2. |
| **E2** | `spec-mismatch` | major (blocker for `EC1-S9`/`EC1-S10`) | `ALGEBRA.md:249-256` makes `fork`/`await`/`join`/`requestInterrupt`/`interruptAwait`/`yield`/`race`/`mask` core terminators. R10:163-166 says "fibers, interruption, latency, and retries are the target monad's contribution, never the language's", and R10:177-179 says seam effects get their own signature summed by `⊕ₛ`. No packet document makes any of the eight a `Sig` arm — while the packet already does exactly the right thing for time (`REIFICATION-CHECKLIST.md:889`, `TimeSig now/sleep`). |
| **E3** | `model-mismatch` | major | `ALGEBRA.md:658-662`'s `ObservationMask` makes *retaining* seam-added observations the default; R10:167-170 makes quotienting them the discipline. `ALGEBRA.md:740-741` gets it right for CAS; the general statement does not. |
| **E4** | `implementation-gap` / `external-trust` | major | `PROOF-DAG.md:426-427` (`EC1-T116`/`T117`) relates `render` to `structuralDecode`, both authored in the same Lean model — the self-comparison R6:104-109 forbids ("generator and extractor as each other's check, never self-comparison"). The strings `tree-sitter`, `EFFECT-SURFACE`, and `Target.lean` appear nowhere in the packet; the census instrument is a new probe with no admission act (R8). |
| **E5** | `spec-mismatch` | minor | `EXHIBITS-REVIEW.md:56-58` records "another guarded/coinductive boundary" as an admitted alternative. R1:38-44 forecloses it. The next line resolves correctly, so this is wording, not a live proposal. |
| **E6** | `spec-mismatch` | minor | `ALGEBRA.md:362` and `CONTRACT-PACKET.md:331-332` describe canonical ID renumbering as "alpha-normalization"/"alpha-renaming". R4:73-81 puts identity "below even α". The substance is first-order key renumbering and is fine; the word invites the wrong reading. |
| **E7** | `proof-debt` | minor | `CONTRACT-PACKET.md:289-291` assigns the packet the act of "regrading" a contract if a `ProgramWF` clause turns undecidable. |

The lane also noted, about the law rather than the packet:
`library/cas/AGENTS.md:58` says "(R1–R14…)" while `:8` binds "(R1–R15)".

## Commands run

All Lean commands from `/Users/pooks/Dev/foldlab/library/cas`; all `bun`
commands from the repo root. Every one is my own rerun, not a reading of a
recorded receipt.

| Command | Exit | Observed |
|---|---|---|
| `lake env lean ../../.staging/effect-core-v1/exhibits.lean` (`EXHIBITS-REVIEW.md:23` verbatim) | **1** | "no such file or directory" — **F5** |
| `lake env lean ../../.staging/effect-core-v1/workshop/exhibits.lean` | 0 | 17 receipts; `[propext]` / `[propext, Quot.sound]`; no `sorryAx`, no `Classical.choice` |
| `lake env lean ../../.staging/effect-core-v1/workshop/counterexamples/FixedFuel.lean` | 0 | `run_has_no_composition_law` `[propext, Quot.sound]`; `run_composite_outruns_its_parts` `[propext]` — matches `README.md:76` and `COUNTEREXAMPLES.md:60` exactly |
| `lake env lean ../../.staging/effect-core-v1/workshop/counterexamples/LocalAnchors.lean` | 0 | 7 receipts; `Classical.choice` only in the `normalizeRow` pair — matches `README.md:75` |
| `lake env lean ../../.staging/effect-core-v1/breaker-exhibits.lean` | 0 | **40** receipts; ceiling `propext`/`Quot.sound`; no `sorryAx`, `Classical.choice`, or `native_decide` — matches `README.md:74` and `COUNTEREXAMPLES.md:104-105` |
| `lake env lean ../../.staging/agent-reports/2026-08-31-effect-core-classification-anchors.lean` | 0 | 11 receipts; `div1_*` pair axiom-free; `grade_closed_sound` also `Quot.sound` — **F12** |
| `lake env lean ../../.staging/effect-core-v1/workshop/EffectCoreProbe.lean` | 0 | 5 receipts — matches `README.md:72` |
| `bun .staging/effect-core-v1/workshop/tsgo/run-probes.ts` | 0 | `failures: []`; effect `4.0.0-rc.112`, tsgo `0.38.0`, typescript `7.0.2`, all exact; `forbiddenBridgeObserved: false`; all four controls as stated |
| `bun .staging/effect-core-v1/workshop/effect-surface-probe.ts --summary` | 0 | `resolvedCodeEntries: 392`, `stableCanonicalCoordinates: 4613`, `oldBankModules: 359`, `typescriptErrors: 0`, all duplicate/missing-pair checks `[]`, both `MultipartParser` sentinels public and absent from the old bank — matches `README.md:78` exactly |

Mechanical checks (scripts in the session scratchpad, not written to the repo):

- Declaration index over 306 `.lean` files / 4,253 names, then every backticked
  snake_case identifier in all 14 packet `.md` files resolved against it.
  **Result: every declaration name the packet claims to exist does exist.** The
  ~65 unresolved names are all explicitly proposed (`U_*` census sets,
  `PENDING THEOREM` rows, `admitCas_*`, `fullCutoverEligible_iff`) or explicitly
  denied ("There is deliberately no `race_commute`"). Zero cite an
  existence-claiming verb. `wlp_append` (**F1**) escapes this check only because
  it resolves inside the packet's own scratch file.
- All 60 `file:line` citations in `WORKSHOP-RESULTS.md` resolved against the
  declaration actually at that line. **57 correct**, including every
  `EFFECTS-BACKEND.md` rule anchor (R1@32, R5@83, R10@150, R12@204) and every
  doc-comment quotation. Three defects: **F10**, **F11**, **F13**.
- Existence check on all 44 file paths the packet references: **one missing**
  (**F5**). `STATE-OF-MECHANIZATION.md` resolves outside `library/cas` (**F13**).
- Per-file `EC1-CE`/`EC1-M` ID census across the packet and the agent-report
  corpus (**F2**, **F4**, and the orphan set).

## Evidence bundle

```text
proved       : 6 Lean files reran green in this tree — 17 + 2 + 7 + 40 + 11 + 5
               = 82 receipts. Ceiling propext / Quot.sound, plus Classical.choice
               in the LocalAnchors normalizeRow pair only. No sorryAx, no
               native_decide, no unsafe/extern/implemented_by, no axiom
               declarations. Checker policy: Lean kernel via `lake env lean`,
               warm cache, no external solver, no certificate replay.
modelChecked : none. No packet claim exhausts a named finite model with bounds.
tested       : effect-tsgo probe harness — 1 positive + 3 mutants, exact pins
               (effect 4.0.0-rc.112, tsgo 0.38.0, typescript 7.0.2), exact
               file-set equality, planted forbidden bridge not resolved. Oracle
               is the Effect language service, not a semantic model.
measured     : effect-surface-probe census — 392 resolved code entries, 4,613
               canonical stable coordinates, 359-module old bank, at one pinned
               package version on this machine. Instrument is TypeScript 5.9.2's
               compiler API; the probe's own header calls it a coordinate
               instrument with no semantic Effect claim.
monitored    : none.
assumed      : that `.staging/agent-reports/*.lean` and the packet's scratch
               .lean files remain unpromoted (README.md:82-85, 111). F1 is what
               happens when that assumption is silently dropped.
unknown      : whether EC1-CE049–CE052 were deliberately refused or lost (F2);
               whether the EC1-CE045–CE048 renumbering was a decision or drift;
               whether E2's eight concurrency terminators are an intended
               amendment request against R10 or an unnoticed conflict.
```

### Per-axis verdict

- **Intent/requirements**: one blocker (E1 narrows ratified law to CAS).
- **Formal model**: two majors (E2 concurrency terminators outside the signature
  discipline, E3 observation mask default) and one major model inversion (F8).
- **Proof acceptance**: clean. Every stated axiom ceiling reproduced exactly;
  no holes, no unsafe mechanisms, no external trust in any Lean file.
- **Implementation/refinement**: one major (E4 render/decode self-comparison —
  the relation is audited by an instrument authored in the same model).
- **Tests/receipts/deployment**: the probes are sound and the mutants are
  genuinely red; the failure is in traceability (F4, F6, F7) and in one
  unreproducible receipt (F5).

### End-to-end verdict

The packet is **not ready for a slice to close**, on its own §10 terms: seven of
eleven counter-sets are non-empty. It is, however, in far better shape than
concurrent two-author authorship would predict — the four owed amendments are
genuinely made, every Lean receipt reproduces, every declaration name that
claims to exist does exist, and the five late-settled rulings propagated
cleanly. The work owed is joining the register to the graph, fixing `wlp_append`,
and resolving the ID collision — not redoing the design.

## Checks omitted

Named plainly, with why.

1. **`REIFICATION-CHECKLIST.md` (1,685 lines) was never read end to end** by any
   of the three lanes. It was covered by targeted grep for every risky token and
   by the full citation/declaration sweep. Roughly lines 150–700, 776–1100, and
   1330–1660 are prose no lane inspected. It is the largest single unaudited
   surface in the packet, and it owns the rc.112 census — an R8 conformance pass
   over it is its own lane.
2. **`CONTRACT-PACKET.md`'s 92 `EC1-F*` falsifier rows were counted, not read.**
   I confirmed none carries a counterexample join; I did not check whether each
   is well-formed, executable as described, or non-duplicative.
3. **`PROOF-DAG.md`'s theorem rows were read selectively** — the four amendment
   regions, the CAS/injection bundle, the Mod-E bundle, and the closing
   obligation list. Roughly 120 rows in §§5–11 were grepped, not read. I did not
   check whether every `Depends on` edge resolves to a real row, nor whether the
   DAG is acyclic.
4. **`CLASSIFICATION.md` (610 lines) was not read by me at all**; it was swept by
   both sub-lanes for their own tokens and cleared.
5. **No `.lean` proof body was reviewed.** I ran `#print axioms` receipts and
   read theorem *statements* where a register row depended on one. I did not
   check that any proof body proves what its name suggests, and I did not audit
   the scratch definitions (`GProg`, `denoteG`, `ofPProg`, `okBody`, `wZ`) that
   the exhibit statements quantify over. A theorem named
   `no_handler_into_ScopeM_catches` could still state something weaker than the
   register claims; I verified the name resolves and the file elaborates, not
   the statement's adequacy.
6. **`EC1-CE042`, `CE043`, `CE044` (the three `OWED` rows) were not attacked.**
   I confirmed they are correctly marked `OWED` and state their required
   witnesses. I did not try to produce those witnesses or judge whether the
   stated witness would suffice.
7. **The four `.staging/agent-reports/2026-08-31-effect-core-*.md` evidence
   inputs were read only where they bore on ID hygiene.** The provenance report
   in particular — which the packet's pin claims rest on — was not audited.
8. **No estate gate was run.** I did not run `lake build`, the strata gate, the
   byte-identity gates, or `effect-tsgo diagnostics` over `library/effects`
   (`README.md:80`'s last evidence row is therefore unverified by me).
9. **The `.d.ts` stubs under `workshop/tsgo/node_modules/effect/`** were read but
   their role as a planted forbidden bridge was verified only through the
   harness's own `forbiddenBridgeObserved: false` output — I did not
   independently confirm the resolver would have taken them.
10. **Part D's and part E's line citations are the sub-lanes' work**, spot-checked
    by me on the load-bearing rows (`WORKSHOP-RESULTS.md:782-785`, `:557`,
    `:907-908`; `ALGEBRA.md:249-256`; `PLAN.md:64-66`) but not re-derived in
    full. Neither sub-lane ran a Lean command; every `VERIFIED-KERNEL` state
    they relied on is underwritten by my reruns, not theirs.
