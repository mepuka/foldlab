# Effect Core v1 — rulings on the eight evidence-backed §17 freeze conditions

**Ruled by: Opus (Mac), 2026-08-31, on operator delegation.**
Advisory to codex, which owns implementation. Each ruling is made *from the
record* — a kernel-checked counterexample or an existing estate theorem — not
from preference. Where the evidence does not reach, the condition stays open and
says so.

`PROOF-DAG.md` §17 gates all 130 pending rows: "Until those are ruled, the
identifiers above are organizational targets only." Twenty conditions stand.
**Eight have evidence. These are those eight.** Conditions 1–9, 12, 13, 14 have
no kernel evidence under them and are NOT ruled here; they are design choices
requiring the grilling pass.

---

## R10 — deterministic `Denotes` is CAS/block-only; there is no full-core uniqueness theorem

**Condition 10.** *the CAS/block-only boundary of deterministic `Denotes`/coherence and the absence of a full-core uniqueness theorem.*

**Evidence.**
- `EC1-CE042`, `workshop/counterexamples/Nondeterminism.lean`: `no_choice_free_denotation` proves `¬ ∃ f, ∀ p w d o, Runs H p w d o → o = f p w`. The candidate `f` is chosen first, may depend on `H`, may be non-computable, and may inspect the whole program. Verified here: exit 0, 29 receipts, `[propext]` ceiling, zero `Classical.choice`.
- `EC1-CE048`, `breaker-exhibits.lean`: `denotes_does_not_determine_the_refusal`.
- `workshop/exhibits.lean`: `denotes_unique` — the positive result, on the deterministic CAS fragment.

**RULED.** A full-core `denotes_unique` node is **prohibited**. The public
semantics is relational. The admissible uniqueness statements are exactly three,
and they are ordered by how much must be fixed:

1. `denotes_unique_given` — a fixed initial configuration plus one complete
   compatible decision tape yields one observation.
2. `denotes_unique_on_the_askFree_fragment` — uniqueness with *nothing* fixed,
   on the fragment containing no decision operation.
3. the deterministic CAS/block specialization, restricted to **stable
   non-frontier outcomes** (`EC1-CE048` forbids extending it to incidental
   exhaustion labels at smaller fuels).

**What this forecloses.** `denotes : Prog → Word → Obs` cannot be *defined*, not
merely "is not proved unique". Any row proposing a total denotation function is
refuted before it is written.

**Note for codex — VERIFIED AND NARROWED, 2026-08-31.** The witness lane reported
that the same refutation goes through at declarations already in `library/`, and
concluded that "relational semantics is not an Effect Core design choice — it is
already forced on main the moment `AgentSig` is admitted." I checked it. The
theorem is sound; **the conclusion is over-claimed, and I had repeated it.**

- `Prog.handleLlm (oracle : String → String) : Prog AgentSig A → Prog CasSig A`
  does exist (`Cas/Lang/Interp.lean:184`), and `¬ ∃ f, ∀ oracle p w,
  interpretRef H (p.handleLlm oracle) w = f p w` is true — two oracles answering
  one `infer` differently give different results.
- **But the oracle is an explicit parameter, in the type.** `runAgent`
  (`Interp.lean:190`) takes it explicitly too. So main does not *need* a
  relational semantics; main already *answers* nondeterminism the way this
  ruling's admissible statement (1) does — fix the decision source as an explicit
  argument and recover a function. `handleLlm` is `denotes_unique_given` in
  concrete form.
- A second reason not to lean on it: `Cas/Backend/Universal.lean:802` records that
  L18 reaches `handleLlm` only **conditionally** on `IsMonadMorphism AgentSig`,
  whose `bind_law` "is precisely the judgment `Interp.lean:19,181-183` asserts and
  **nothing on main proves**." The declaration's own handler law is owed.

**Net effect on this ruling: none.** R10 stands on `EC1-CE042` and `EC1-CE048`,
which are in the packet and verified here. The correct use of the `handleLlm`
observation is as *precedent for the fixed-tape form*, not as evidence that main
is already relational — and no row should cite it as the latter.

## R11 — CAS refusal classification, H-dependence, and the refusal-word mask are all reused, not re-minted

**Condition 11.** *reuse of existing `Refusal.Clause`/`RefusalMap`, H-dependent write facts, and the refusal-word observation masks.*

**Evidence.** `EC1-CE008` (`div4_envelope_does_not_bound_the_error_row`),
`EC1-CE009` (`div5_write_addresses_not_in_envelope`), `EC1-CE010`
(`div6_refusal_word_outside_the_mask`) — all `VERIFIED-KERNEL`, reran here.
Existing owners: `Refusal.clause`, `Refusal.clause_surjective`,
`Refusal.admissionClauses`, `RefusalMap.table`, `Cas/Lang/Representation.lean:198`
`ObsEq.run_refused`.

**RULED, in three parts.**

1. **Reuse is mandatory.** Effect Core does not mint `CasRefusalKind`, does not
   copy the six clause constructors into `CauseTree`, and does not maintain a
   second host map. CAS classification references `Refusal.Clause` directly.
2. **The envelope does not decide `E`.** `EC1-CE008` proves an operand-free put
   at a colliding address refuses with `.collision`; exact `E` is synthesized
   from admitted operations and handlers. `EC1-CE009` proves write *addresses*
   are not in the envelope at all — `PutShape` carries no address and the address
   is `H`-dependent. The envelope owns write **shapes** only.
3. **The refusal-word mask is a deliberate quotient, and must be declared.**
   `ObsEq` forgets the partial word on a refusing branch. Two programs may be
   `ObsEq`-related and leave different partial words. Any finer mask is a **new
   observation** and must be named as such, not presented as `ObsEq`.

**What this forecloses.** A universal error sum that flattens each boundary's
payload and laws. Every boundary keeps its owner.

---

## R15 — CAS ingress is partial; total injection from raw `PProg` is refuted

**Condition 15.** *`CasAdmissible` and the rejection boundary for empty/dangling raw `PProg`.*

**Evidence.** `EC1-CE033`, `workshop/counterexamples/LocalAnchors.lean`:
`injectCas_cannot_be_total`. Empty and dangling-answer tables are representable
but fail the proposed admission conditions.

**RULED.** `injectCas` has type `PProg → Option CheckedProgram` (or `Except
Diagnostic CheckedProgram`), **never** `PProg → CheckedProgram`. Its domain is
`CasAdmissible`. The theorem it satisfies is meaning preservation on that domain,
not totality.

**Scope caveat, carried from the witness.** The row refutes a *meaning-preserving*
total injection. It does not refute an arbitrary input-ignoring function. The
statement must therefore carry the meaning-preservation premise explicitly, or
the refutation does not bite.

---

## R16 — the checker is first-error; completeness is existential

**Condition 16.** *first-error checker semantics and duplicate-free row-normalization premises.*

**Evidence.** `EC1-CE031` (`diagnostic_local_is_false`,
`checker_reports_only_the_first`) and `EC1-CE030` (`normalizeRow_forward_is_false`,
with repaired `normalizeRow_with_nodup`), both in `LocalAnchors.lean`. The
`EC1-CE030` proof uses `propext`, `Classical.choice` and `Quot.sound` — the two
`Classical.choice` uses I reran are confined to this pair and are declared.

**RULED, in two parts.**

1. **Checker semantics are first-error.** The estate's checker returns the first
   condemning clause, not a set. The admissible pair is *first-error soundness*
   (what it reports is a real violation) plus *existential rejection completeness*
   (a violating program is rejected, though not necessarily with every clause).
   A specification demanding a diagnostic per condemning clause requires a
   **separate accumulating census pass**, which is a different declaration.
2. **Row normalization requires `NodupKeys`.** `rowEq r s → norm r = norm s` is
   false for arbitrary keyed rows — a permutation with duplicate keys selects
   different last values. Either the premise is stated, or row validity supplies
   it. The row stays in the register and records the premise it forced.

---

## R17 — classifier soundness is mask-selected overlap, not whole-product invariance

**Condition 17.** *mask-selected classifier overlap rather than whole-product `SemEq` invariance, plus renderer injectivity on normalized admitted targets.*

**Evidence.** `EC1-CE032` (`classifier_semEq_is_false`, `runs_agree`), strengthened
independently by `breaker-exhibits.lean` `load12_ObsEq` / `load12_dataflow_differs`:
two `ObsEq` tables with different answer-dependence graphs.

**RULED — first half only.** Full observational equality does **not** determine
the syntactic classification product. The classifier is finer than the semantics,
and that is not a defect: it is the direction R4 already fixes (identity hashes
presentations, not denotations). Replace whole-product `SemEq` invariance with
**concretization soundness / mask-selected overlap**, or enumerate the specific
fields that are genuinely semantic invariants and claim invariance only for
those.

**NOT RULED — second half.** *Renderer injectivity on normalized admitted
targets* has no kernel evidence in the register. It is TypeScript-target work and
remains open. Condition 17 is therefore **partially** discharged; codex must not
treat it as closed.

---

## R18 — the scoped target must observe failure and state; `ReaderT Env (Prog CasSig)` cannot

**Condition 18.** *the adequate state/error/machine target for scoped recovery and ensuring, with `ReaderT Env (Prog CasSig)`, scratch `scopeHandler`, `scopeHandlerR`, and `Prog.bind` kept at their proved boundaries.*

**Evidence.** `EC1-CE041`: `no_scoped_catch_clause` and
`no_handler_into_ScopeM_catches` prove **no** clause into `ReaderT Env (Prog
CasSig)` satisfies the catch law — the engine is a separation lemma, a store
program cannot test for absence. `EC1-CE045`: `ensuring_never_finalises_a_refusal`
proves `interpretRef_bind` is refusal-strict, so a `Prog.bind` finalizer runs
exactly when the body **succeeds**. Repair exhibited by `scopeHandlerR_catches` /
`scopeHandlerR_recovers`. Already promoted into estate law at
`library/cas/AGENTS.md`.

**RULED.**

1. **No `HHandler`, no higher-order handler carrier.** Children remain `BlockId`
   data; the existing `Handler` **type** is sufficient. This half of the original
   proposal survives intact.
2. **The target is what changes — and `catch` and `ensuring` do not want the same
   one.** `ReaderT Env (Prog CasSig)` is **prohibited** for both, by theorem.
   But the `EC1-CE041` repair target — `ReaderT E (StateT Word (Except Refusal))`
   — is adequate for `catch` and **still inadequate for `ensuring`**.

   *Amended 2026-08-31 after `EnsuringRepair.lean` (44 receipts, exit 0, `[propext]`
   / `[propext, Quot.sound]`, verified here). My first ruling named that target as
   the minimum. It is not.* The obstruction is structural, not a clause oversight:
   `reraise_is_finalizer_blind` proves **no** clause into `ReaderT EnvR (StateT
   Word (Except Refusal))` can do better, because `Except.error r` **has no word
   slot** — so any clause satisfying the one uncontested half of the law (do not
   swallow the refusal) has its output on that path determined by `r` alone, and
   two finalizers leaving different words are identified.
   `reraise_blindness_is_not_vacuous` supplies the concrete pair.

   **The forced repair is the transformer ORDER: `ExceptT Refusal (StateT Word
   Id)`** — state *outside* error, so the word survives the error branch. All four
   `ensuring` laws close there: runs-on-success, runs-on-refusal without any
   premise on the finalizer, never-replaces-the-refusal, LIFO, and
   exactly-once-as-dependence.

   This is a stronger result than a repair: `run_interpretRefW` states the new
   target against the small-step `run` as an **equation, word included**, where
   the estate's `run_interpretRef_agree` could only give the refusal word
   existentially. `scopeHandlerW_catch_agrees` proves the move is conservative for
   `catchE`, so one target serves both.

   **Codex must not read `library/cas/AGENTS.md` as settling this.** That file
   currently says only that plain `ReaderT Env (Prog CasSig)` is insufficient —
   true, but it does not say the catch repair and the ensuring repair differ, and
   a lane following it alone will build the wrong target.
3. **Boundaries are preserved, not erased.** Scratch `scopeHandler` and
   `scopeHandlerR` are witnesses, not promoted declarations. `Prog.bind` keeps
   its refusal-strict law; `ensuring` is simply not expressible with it.

**Consequence for FORK A.** `Handler.through`'s middle must be `Prog T`-valued,
so it does not compose the scoped layer down. FORK A is therefore **not a single
global choice**: some layers embed into `Prog`, the scoped layer interprets
directly into the adequate target. It must be restated per-layer.

---

## R19 — `toPProg` is a normal-form recognizer, not a projection

**Condition 19.** *`toPProg` as a sound `CasImage` normal-form recognizer rather than a semantic projection.*

**Evidence.** `EC1-CE040`, `breaker-exhibits.lean`: `toPProg_is_not_semantic` and
`toPProg_is_not_entry_stable`. `unreachableTail` and `entryNotZero` are
denotationally **equal** to the injected table, and `toPProg` returns `none` on
both.

**RULED.** `toPProg` is a **sound recognizer for one literal normal form**. It is
not `projectCas` and no row may treat it as a semantic projection. A genuine
projection requires either an admitted canonical graph domain, or a distinct
semantic-quotient theorem — neither exists.

This is **incompleteness, not unsoundness**: what `toPProg` accepts, it gets
right. The `inject_embed` / `runCore_runP` seam laws are unaffected and survive
attack.

---

## R20 — Mod-E's premises are correct, but `wlp_append` is a NEW obligation, not a transfer

**Condition 20.** *Mod-E's nonempty-prefix/threaded-history `wlp_append` premises and the stable non-frontier boundary of CAS/block uniqueness.*

**Evidence.** `EC1-CE046` (`modE_unsound_at_the_empty_prefix`): the empty prefix
satisfies every `wlp` postcondition by refusing, while its appended suffix need
not. `EC1-CE047` (`modE_unsound_at_a_restarted_history`): a nonempty-prefix
premise **alone** is insufficient — a suffix with answer references refuses when
restarted alone but succeeds under the prefix history. `EC1-CE048`: the stable
non-frontier boundary.

**RULED, in three parts — and the third is a correction to the packet.**

1. **EffHOL's modality is `wlp`, not `wp`.** `EC1-CE001`: a refusing program
   satisfies `wlp ⊥`, while `wp ⊥` is impossible for every program. Totality is
   added separately by the existing `wp_iff_wlp_and_total`
   (`Cas/Lang/Wp.lean:380`). The identification holds for (Mod-I) and (Mon).
2. **(Mod-E) does not transfer unconditionally.** It needs *both* a nonempty
   prefix *and* a threaded answer history. The table-only reading is unsound.
3. **`wlp_append` DOES NOT EXIST IN THE ESTATE.** Verified: `grep -rn
   'wlp_append' library/` returns zero hits. The estate has `wpAux_append`
   (`Wp.lean:501`), `wp_append` (`:528`), `wp_append_le_total` (`:538`).
   `wlp_append` exists only as `EffectCoreBreaker.wlp_append` in
   `breaker-exhibits.lean:874` — a scratch file the packet's own `README.md`
   refuses to promote. **Five packet passages cite it as existing law**
   (`CONTRACT-PACKET.md:546`, `:793`, `PLAN.md:229`, `PROOF-DAG.md:400`, `:502`).

   Therefore: the *premises* named by condition 20 are correct and ruled. The
   *theorem carrying them is owed*. It is a *new obligation* (`EC1-T130`), not a
   transfer from the estate, and no row may cite it as inherited. This is the
   single most consequential correction in this pass, because it converts a row
   everyone believed was free into work.

---

## Not ruled, and why

| Condition | Why it stays open |
| --- | --- |
| 1 — `ValueTy` universe and row representation | No kernel evidence. A design choice; needs the grilling pass. |
| 2 — daemon fibers admitted or refused in v1 | Corpus has **zero** daemon-fiber material; all three `daemon` hits are the transport CLI. |
| 3 — closed alphabet/version and direct-handler table | No evidence. See scope note below. |
| 4 — default observation mask and independent-event quotient | Related to R11's third part but not decided by it. |
| 5 — external-request frontier representation | `EC1-CE003` forces frontier ≠ refusal but does not fix the representation. |
| 6, 7 — TypeScript constructor list, `@effect/tsgo` pin | Target work; `EC1-CE021` is `REPORTED`, not verified. |
| 8 — CAS canonical normalization | No evidence. |
| 9 — classifier exact-vs-conservative fields | `EC1-CE004`–`CE007` constrain it; they do not decide the field list. |
| 12, 13 — closure schema, `ValueTy`/`El` overlap | Organizational and design, no evidence. |
| 14 — `Alphabet` indexed by `Sig.Op` | **See the scope note.** No evidence, and the operator's scope constraint bears on it directly. |
| 17 (second half) — renderer injectivity | No evidence. |

**Eight ruled. Twelve open, one of them partially.**

---

## Scope note for codex — the interface is larger than the Lean model

Operator constraint, 2026-08-31: *the effects cutover should be a portion of the
larger effectful interface but not exclusive to the Lean interfaces.*

This bears on the plan's phasing, and on condition 14 specifically.

The plan closes `Alphabet` and `OpDesc` in **Phase 3 (foundation closure)** and
places `Foreign/Registry.lean` in Phase 5. Under codex's own rule — *"A signature
change always returns to the breaker. It is never silently made in the
implementation worktree"* — freezing `Alphabet` in Phase 3 without an arm that can
name operations whose semantics live **outside** the Lean model makes the core
Lean-exclusive by construction, and reopening it in Phase 5 is a signature change
that returns the whole foundation to the breaker.

The estate already has the shape this needs and it is ratified law, not a new
idea: **R7 — programs are content, hosts are code.** A foreign operation is
content in the alphabet whose meaning is a host obligation. **R12 — the tower:
a service is a handler, a handler can be a program.**

**Advice, not a ruling** (condition 14 has no evidence and I am not ruling it):
the foreign/registry seam should be a **Phase 3 foundation concern**, at least to
the extent of `OpDesc` carrying the arm that distinguishes a Lean-modeled
operation from a host-obligation one. What may safely defer to Phase 5 is the
registry's *population* and the replay machinery — not the *alphabet's ability to
express* a non-Lean operation.

The deferral of `library/effects/src/effect-core/` is separately well-reasoned
and I would keep it: "Empty runtime APIs must not suggest that cutover has
happened" is correct.

— **Opus**
