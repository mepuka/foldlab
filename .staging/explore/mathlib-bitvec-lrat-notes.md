# Mathlib BitVec delta, bv_decide/LRAT state, and axiom mechanics

**Provenance:** delivered 2026-08-24 by a child of the implementation-tactics audit (the lane its
parent marked "not assessed" at converge); persisted verbatim-in-substance by the coordinator from
its final report. Closes Appendix B of `.staging/explore/implementation-approach-notes.md`.
Staged material, pre-grade. All claims carry the agent's primary-source citations (§Sources).

---

## 1. Mathlib's BitVec content — thinner than assumed

**Mathlib master (read 2026-08-24) contains exactly ONE BitVec file: `Mathlib/Data/BitVec.lean`**
(~105 lines). Complete contents: `ofFin_intCast`/`toFin_intCast`, `toNat_injective`/`toFin_injective`,
`toFin_nsmul`/`toFin_zsmul`/`toFin_pow`, `CommSemiring`/`CommRing (BitVec w)` instances, and
`equivFin : BitVec m ≃+* Fin (2 ^ m)`. The module docstring forbids extending it. The collapse
happened in Mathlib PR #13286 ("remove most of the material on BitVec", merged 2024-05-31) — BitVec
is actively developed in core, and Mathlib deliberately carries only the algebra bridge.

Verified negatives for hash-proof purposes: `BitVec.getElem` appears **0 times** in Mathlib; no
`rotateLeft`/`rotateRight`/`getLsbD`/`getMsbD`/`setWidth`/`extractLsb` lemmas; no order instances on
BitVec. The only instance-level gain is a transitive `Fintype (BitVec n)` via `FinEnum` —
irrelevant here. `Mathlib/Data/LawfulXor/Basic.lean` (2026, Wieser) adds `xor_cancel_left/right`
as one-line corollaries of core lemmas.

**Verdict: for Keccak/SHA-256 bit-level correctness, importing Mathlib buys nothing and costs a
very large import graph plus `Classical.choice` in any lemma actually used.**

## 2. Nat.testBit / Nat.bitwise — core is already complete; Batteries is the useful thin layer

Core v4.28.0 `Init/Data/Nat/Bitwise/Lemmas.lean` has 118 theorems, verified by name at the tag:
`testBit_{and,or,xor}`, `eq_of_testBit_eq`, full comm/assoc/self families, all distributivity
lemmas, `shiftLeft/shiftRight` distributions, `testBit_shiftLeft/Right`, `testBit_two_pow*`,
`bitwise_lt_two_pow`, `and_two_pow_sub_one_eq_mod`, etc.

`Mathlib/Data/Nat/Bitwise.lean` (364 lines) adds: name-duplicates of core facts (`testBit_lor` ≡
`testBit_or`, …), `Nat.bit`/`binaryRec`-structural lemmas (a different induction principle), and
order/parity/nim material (`exists_most_significant_bit`, `xor_trichotomy`, `xor_range`). None of
it serves SHA-2 round functions.

**`Batteries/Data/Nat/Bitwise/Lemmas.lean` is the layer worth taking** (tiny dependency):
`{and,or,xor}_{left,right}_comm`, `xor_xor_cancel_{left,right}`, `eq_of_xor_eq_zero`,
`xor_{left,right}_inj(ective)`, `and_or_{left,right}_inj`.

## 3. bv_decide, LRAT, and the kernel

### The v4.29.0 change (RFC #12216 → PR #12217, merged 2026-02-03, missed v4.28.0's branch point)

`bv_decide`/`native_decide` no longer route through the kernel's `reduceBool` hook. The tactic runs
the compiled computation and **mints a fresh per-computation axiom**
(`<thm>._native.bv_decide.ax_N`); `ofReduceBool`/`trustCompiler`/`reduceBool`/`reduceNat` are
deprecated (since 2026-02-01). In-tree test `tests/elab/bv_axiom_check.lean` pins the observable:
axioms = `[propext, Classical.choice, Quot.sound, <thm>._native.bv_decide.ax_1_5]`.

**Direction check: this is the opposite of kernel checking.** Compiler trust is unchanged in
substance — it moved from a global axiom to a named local one. Upside for audit: a `._native.`
constant in `#print axioms` is an unambiguous, greppable compiler-trust marker; and external
checkers (lean4checker/lean4lean) can now check a bv_decide proof modulo an opaque axiom.

### Kernel-trust-only routes, current state

- **`decide +kernel`** — landed v4.15.0 (PR #5999/#6016 lineage); kernel reduces the `Decidable`
  instance.
- **`bv_decide` has NO kernel mode** through v4.33.0 (config fields verified; no `kernel`/`native`
  flag).
- **PR #12509** (draft, hargoniX, opened 2026-02-16, untouched since 2026-07-14): `native := false`
  config for bv_decide — LRAT certificate verified by **`cbv`** reduction instead of native code,
  aux decls added with `addDecl`. **Exactly the no-native-axiom path; unmerged as of 2026-08-24.**
- **`cbv` tactic** — landed v4.29.0, de-experimentalized v4.30.0. Docstring: "The proofs produced
  by `cbv` only use the three standard axioms… they do not require trust in the correctness of the
  code generator." In-tree benchmark `tests/elab_bench/cbv_aes.lean` closes a **full AES-128
  encryption via `decide_cbv`** — kernel-trust-only evaluation of crypto-scale bitvector
  computation is live and benchmarked *for evaluation* (not yet for LRAT certificates).
- **PR #14842** (draft, hargoniX, pushed 2026-08-24): full LRAT-checker rewrite (compact literal
  representation) — a perf prerequisite for cbv/kernel checking becoming affordable.

### Empirical cost of kernel-only LRAT

LRAT-Catcher (Szeider, arXiv:2607.00815, 2026-07-01): kernel-reflection mode needs **28.5 GB and
245 s for a 22 KB certificate** and fails to finish larger ones. Keccak-f[1600]/SHA-256 compression
bit-blasts produce certificates measured in MB–GB — 2–5 orders of magnitude past that point.
**Kernel-checked LRAT is not a viable route for Keccak-scale bv_decide obligations today.**
(PBLean, arXiv:2602.08692, is the VeriPB analogue, pre-v4.29 trust framing.)

### Practical consequence for the hash artifact

A proof with only `[propext, Classical.choice, Quot.sound]` cannot come from `bv_decide` at any
Lean version through v4.34-rc2. The axiom-clean routes are: **hand/`grind`/`simp` proofs over
core's BitVec `getElem`/`getLsbD`/`toNat` API** (complete for rotate/shift/xor), and **`decide_cbv`
for concrete evaluations** (KATs) — the AES benchmark shows the scale is realistic. `decide +kernel`
also works for concrete evaluation (demonstrated by the audit's own 17 s Keccak KAT).

## 4. Importing vs. using — axiom mechanics, verified at source

`#print axioms` = `collectAxioms`, which walks **only the proof term's transitive constant graph**
(`src/Lean/Util/CollectAxioms.lean`); axiom collection never crosses module boundaries; imported
but unreferenced declarations are never visited. So `import Mathlib` costs nothing axiomatically
until a lemma proved with `Classical.choice` is actually used.

**Audit caveat worth pinning:** before PR #8842 (merged 2025-07-08, fixing issue #8840),
`collectAxioms` did not walk types of axioms — `native_decide` theorems reported `ofReduceBool` but
silently omitted `trustCompiler`. Axiom audits run on Lean older than ~v4.22 under-report. Our
v4.28.0 observations are post-fix and trustworthy.

## 5. Not determined

Zulip-only design discussions (no access); whether/when PRs #12509 and #14842 land; cbv-based LRAT
performance (no benchmarks exist); v4.34-rc release-note contents; exact v4.28-era Mathlib
declaration list (BitVec answer stable since 2024-05-31 regardless).

## Sources

Mathlib: `Mathlib/Data/BitVec.lean` (+ docs), PR #13286, `Data/Nat/Bitwise.lean`,
`Data/LawfulXor/Basic.lean`, `Data/FinEnum.lean`. Batteries: `Data/Nat/Bitwise/Lemmas.lean`.
Lean core: `Init/Data/Nat/Bitwise/Lemmas.lean`, `Init/Data/BitVec/Lemmas.lean`,
`Lean/Meta/Native.lean` (`nativeEqTrue`), `BVDecide/Prover/Bitblast.lean`,
`tests/elab/bv_axiom_check.lean`, `tests/elab_bench/cbv_aes.lean`, `Lean/Elab/Tactic/Decide.lean`,
`Lean/Util/CollectAxioms.lean`. Issues/PRs: RFC #12216, PR #12217, #5631/#5665/#5999/#6016,
#12509 (draft), #14842 (draft), #11790 (closed unmerged), #8840/#8842. Release notes: v4.28.0,
v4.29.0, v4.30.0, v4.33.0. Reference manual: "Validating a Lean Proof". External:
LRAT-Catcher arXiv:2607.00815; PBLean arXiv:2602.08692 (leansolving/pblean).
