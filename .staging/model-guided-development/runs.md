# Run ledger

Append-only. One row per scout run plus a short note; law in
[LOOP.md](LOOP.md) §10. `class`: `baseline` (current process, no scout —
timings for the comparison), `scout` (a real run), `demonstration`
(harness/process exercise; never counts toward the adoption measure),
`contaminated` (blinding broken; recorded, never counted).

Counts: `prop` proposed, `dedup` after normalization, `ref` refuted,
`sel` selected. Time in minutes; `op` = operator/agent attention,
`wall` = elapsed.

| run | date | target | class | op | wall | luna | sol | prop | dedup | ref | sel | cx | outcome |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| RUN-001 | 2026-08-30 | value plane codec (`library/effects/src/cas/Value.ts`) | demonstration | ~10 | ~2 | 4 | 0 | 32 | 19 | 0 | 10 | 0 | lane proven end-to-end; proposals banked; NO checker pass — statuses all `proposed` |
| RUN-002 | 2026-08-30 | store join algebra T1–T6 (`Cas/Core/Admission.lean`, `Cas/Lang/Defun.lean`, host `Store.ts`/`Programs.ts`) | scout | ~35 | ~25 | 6 | 0 | 47 | 35 | 1 | 12 | 1 | first real run: 12-candidate handoff incl. the join-realization synthesis; 4 host properties `sampled-survivor(fast-check)`; 10 held theorems named by the model instead of reproposed; CX-011 banked |

## Notes

### RUN-001 — value-plane codec, demonstration (2026-08-30)

First end-to-end exercise of [LOOP.md](LOOP.md) steps 1, 3, 4, 5(dedup
only), 10. Snapshot: working tree at `e5e97f37` (dirty:
`Programs.ts`/`Programs.test.ts`, untouched by this run). Intent: the
value plane's canonical-encoding draft contract (round-trip, injective
encode, exact refusal of non-canonical spellings, generator admits only
admitted values). Four luna batches, angle-rotated, counterexample
ledger fed in. No checker was run — `ref` and true selection await a
real (non-demonstration) run; `sel` counts the rank-selected set below.

**Selected candidate set** (all status `proposed`; handoff offered to
any future breaker of this surface):

1. Envelope byte-canonicality: `decodedVersionedEnvelope(b) = ok(e) ⇒
   utf8(canonicalJson(e))` byte-equals `b` (three batches converged).
2. Its duplicate-key corollary: a successful decode admits no
   duplicate object key at any depth — the CX-003 guard, stated
   decode-side.
3. Markerize/resolve round-trip, both directions, plus the
   marker-index-equals-canonical-traversal-order law.
4. `put`/`get` round-trip on admitted values.
5. Put injectivity: distinct admitted values ⇒ distinct canonical
   payload bytes or ContentId (serves DISTINCTNESS too).
6. Encode failure ⇒ no `CasStore.put` invocation (FAIL-CLOSED
   crossover, pipeline stage 1).
7. Markerize failure ⇒ no node admission (stage 2).
8. Generator/decoder agreement: `arbitraryContentId` emits exactly the
   admitted 64-lowercase-hex spellings `ContentId.make` accepts.
9. `refCodec` sentinel round-trip preserving ContentId AND expectedTag.
10. Revision agreement: `decodedEnvelope(payload, r)` succeeds ⇒
    `decodedVersionedEnvelope` yields the same envelope with
    `revision = r`.

Notable unselected-but-banked: the b3 (failure/retry angle) replay-
determinism family — encode/decode replay-stable, failure replay yields
the same violation class, no stale parser state after a failed decode.
Cheap fc properties if the surface ever grows state.

**Observations for the calibration ledger:** angle rotation produced
genuinely disjoint candidate families per batch (admission guards /
marker algebra / replay determinism / exactness); the counterexample
feed was visibly used (CX-003/CX-004 cited in a proposed falsifier);
~50s per batch at low effort; dedup rate 32→19 (~41% duplication across
four batches — consistent with the plateau-probe expectation).

### RUN-002 — store join algebra, the first real run (2026-08-30)

Steps 1–6, 8–10 of [LOOP.md](LOOP.md); repairs 0, sol calls 0 (nothing
stalled). Frozen at `e5e97f37` + the 2026-08-30 working tree (the
`putOutcome` host mirror and fresh-only word fix IN; dirty list in the
session record). Intent: "the store under compatible union is a
join-semilattice; put is its point-join; closure, positive reads,
restore, and the word respect the order" — T1–T6 per
[store-crdt.md](../algebraic-review/store-crdt.md). Waves: 4 luna
batches (angle-rotated) + 2 focused (Honest/Compatible, missing-lemma
decompositions); receipts `run-002-join-b1..b4`, `run-002-join-w2-b1/2`
in `annotate/receipts.jsonl`.

**Checker record** (host lane): one scratch fast-check probe
(`scratch/run002-probe.ts`, sha256 `3e545f9e…`, DELETED after the run —
this note is its record), seed 4242, 60 sampled rounds, all held:

- P1 order-independence: two topological orders of one node-DAG answer
  identical addresses, all `fresh`, loads byte-identical.
- P1b admissibility: a ref-carrying node put before its dependency
  refuses `DanglingReference` (the CX-011 witness).
- P2 duplicate ⟺ pre-resident, same id either way (T2 host face).
- P3 growth preserves positive loads byte-identically (T4 host face).

Statuses: `sampled-survivor(fast-check)`. T6's host face was already
pinned same-day by the CX-007 fix tests (word = fresh fold; re-run word
empty) — cited, not re-run.

**Selected set** (12, ranked; statuses `proposed` unless noted):

1. JOIN-REALIZATION (coordinator synthesis over held pieces): under
   `Honest w₁ ∧ Honest w₂ ∧ InjOn H (canonical bytes)`,
   `toStore (w₁ ++ w₂) = toStore w₁ ⊔ toStore w₂` — word concatenation
   through `toStore` IS the join. `Honest.append` (Tree.lean:253),
   `Honest.no_alias` (:337), `toStore_append_shadowed` (Word.lean:252),
   `toStore_snoc` (:283) already exist: T1 likely needs ONE theorem and
   possibly NO new carrier — the `Store.join` mint may reduce to
   notation.
2. Honest ⇒ Compatible with the injectivity premise BYTE-SCOPED
   (w2-b1.2 + w2-b2.2): `encodeNode_injOn` (held, Separation.lean) +
   H-injective-on-canonical-bytes ⇒ address-injectivity ⇒
   compatibility. Never global `Injective H` — CX-001 hygiene.
3. Honest-uniqueness kernel (w2-b1.7): `Honest σ ∧ σ a = some n ∧
   addr H m = a ⇒ m = n` — `no_alias`'s store face.
4. RefsOk join transport (b1.4): `RefsOk σ₁ rs ∧ Compatible ⇒
   RefsOk (σ₁ ⊔ σ₂) rs` — the T3 kernel.
5. Duplicate-as-join-identity (b1.6/b4.4): `put = ok (duplicate a) ⟺
   ⟨a ↦ n.val⟩ ⊑ σ`, and the singleton join is the identity there —
   T2's exact biconditional over held `put_duplicate_spec`.
6. Refusal-preserves-word (b3.3; decomposition w2-b2.4/5): `runPFrom
   … = (.refused why, w') ⇒ w' = w`, per-case (failed put admission /
   absent load / dangling index / explicit fail) — the MISSING lemma,
   now with its case split and `putWord` two-arm helper (w2-b2.8).
7. Exact fresh-fold (b3.4/w2-b2.7): `w' = w ++ (in-order fresh-outcome
   bindings of the reached prefix)` — strengthens
   `runPFrom_puts_sound`'s Sublist to an exact characterization (T6
   exact form).
8. Step/put three-arm agreement (b3.2): `step`'s word transition arm
   equals `Cas.put`'s outcome arm on `toStore w`, fresh appending
   exactly one binding, duplicate none, conflict refusing.
9. Closure-local observational agreement (b3.6): agreement on the
   transitive ref-closure of a root ⇒ loads and walks from that root
   agree — T5/T4 localized to bounded replay.
10. Byte-level restore-inclusion (b3.5): address inclusion is NOT
    enough for T5 — the relation requires byte-identical canonical
    payload, kind, and refs per resident address; then load
    projections agree. Host site: `scripts/litestream-check.ts`
    already checks exactly this — the formal statement should match
    the script, not the weaker address-only reading.
11. Interrupt/continuation fuel-frame (b3.7): continuing a `running`
    status with the returned rest and word equals running the original
    with remaining fuel — replay compositionality.
12. Receipt-failure retry square (b3.1, host fixture proposal): after
    bytes land and the receipt append fails, retry answers `duplicate`,
    writes nothing, appends no receipt — matches the FAIL-CLOSED bank
    template; NEEDS a failure-injection seam on
    `writer.putBytes`/`wordLog.append` to become a fixture (flagged).

**Held theorems the model NAMED instead of reproposing** (the intent
asked; calibration signal): `checkRefs_ok_iff`, `put_fresh_spec`,
`put_duplicate_spec`, `put_conflict_spec`, `put_fresh_closed`,
`run_preserves_wf`/`runP_preserves_wf`, `runP_embed_agree`,
`runPFrom_append_done`, `runPFrom_load_present`, `runP_frame_sound`,
`decodeProg_encodeProg`, `toStore_snoc`, `encodeNode_injOn`,
`admitNode_error_condemns` (w2-b1.6 mapped to it at curation).

**Refuted / discarded**: w2-b1.1 REFUTED by inspection against CX-001 —
its "injectivity" premise is vacuous (`b₁ = b₂ → H b₁ = H b₂ → b₁ =
b₂`), so it claims Honest ⇒ Compatible with no real injectivity; a
kind-tag-drop collision kills it. w2-b1.5 discarded VACUOUS (conclusion
`n = n`) — caught by the step-8 vacuity check.

**Adequacy gaps** (step 8, the CAV-2001 pass):

- AG-1 (feeds decision 35's landing): T3's `RefsClosed` premise is
  ENFORCED nowhere at a raw byte-plane union — a joined store can hold
  a dangling ref if one half was unclosed. The union door must run
  per-object read-law verification (`verifyNodeBytes`) or an explicit
  closure re-check. The object-plane replication backend inherits this
  obligation.
- AG-2: TWO Honest spellings exist — `Grammar.Tree.Honest`
  (Tree.lean:250) and `Auth.HonestWord` (Auth.lean:78) — reconcile
  before any store-level honesty mint (vocabulary debt).
- AG-3: injectivity premises must be byte-scoped explicitly; the
  refuted w2-b1.1 shows how a sloppy premise goes vacuous-or-false.
- Boundary confirmed as NON-THEOREM (b4.8, banked in agreement.md):
  store-projection equality of two words does not imply word equality
  without a receipt/order premise — words are per-host observations.

**Handoff** (to the breaker of the join surface, or the operator): take
1–5 as the T1/T2/T3 packet core (mostly assembly over held theorems —
cheap, high-value); 6–8 as the Defun lane's next three lemmas; 9–10 as
T5's exact form with the litestream check as the host gate; 11–12 as
replay/robustness follow-ons. The `Store.join` mint question SOFTENS:
rule first whether T1 is stated word-level (`++` through `toStore`,
zero new carriers) with store-level join as derived notation.

**Calibration**: 47 proposed → 35 distinct (~26% dup, lower than
RUN-001's 41% — focused waves dedup better); the held-theorem-naming
instruction worked (14 named, none reproposed as new); angle rotation
again produced disjoint families; the two malformed wave-2 candidates
(vacuous premise, trivial conclusion) argue for a schema-side
tautology lint before scoring in future runs.

**Post-run addendum (same day) — the handoff core LANDED, one item
refuted.** On operator order ("mint everything we can and get the lean
theorems proven"), an Opus 5 proving agent landed
`library/cas/Cas/IR/Join.lean` (+ the root import); coordinator
verified: `lake build` green (102 jobs), surface ledger regenerated
(2164 declarations, `surface`/`obligations`/`laws` checks all ok),
axiom reports re-derived independently — `propext`/`Quot.sound` at
most, no `Classical.choice`, no `sorryAx`. Status upgrades, per the
evidence discipline:

- Items 1–5 → **`lean-theorem`**: `Store.Compatible`, `Store.Sub`
  (defs), `Compatible.symm`, `toStore_append` (left-biased
  characterization), `toStore_sub_append_left/right`,
  `toStore_append_comm`, `toStore_append_self`, `Honest.compatible`
  (Level-1 `Function.Injective H`, byte-scoped refinement owed AG-3),
  `resolvesIn_prefix_lift`, `wfFrom_left_extend`, `wf_append`,
  `RefsOk_mono`, `put_duplicate_iff`. All eleven briefed statements
  true as dictated; zero adjusted.
- Item 6, whole-run form → **REFUTED** (CX-012, decide-checked and
  coordinator-replayed): a first-line fresh put grows the word before
  a later line refuses — refusal is per-step fail-closed, never
  run-level rollback. Per-line head forms stay `proposed`, re-homed to
  the Defun frame group beside `runPFrom_puts_sound`.
- Items 7–12 unchanged (`proposed`; Defun/host lanes).

The `Store.join` mint dissolved as predicted: the join is REALIZED by
`Word.append` through `toStore`; only `Compatible` and `Sub` were
minted as defs (drafted for CONTEXT ratification in store-crdt.md).
Surface-ledger note: adding `Cas.IR.Join` to the root import closure
is the lakefile's "promotion is a ruling" case — regenerated as the
mechanical consequence of the ordered landing; reversing it is
deleting one import line. `Compatible.symm` kept beyond the brief (it
licenses the word "join" and serves reverse-oriented callers).
