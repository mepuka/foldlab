# Lean 4 coinduction realization survey

> Provenance: delivered 2026-08-25 by a research child dispatched from the Rocq/ITrees
> survey session, landing after its parent finished; persisted verbatim by the Mac
> coordinator (the child wrote no files). Closes the gap `rocq-itrees-modeling-survey.md`
> §3.6 flagged (QpfTypes state, Mathlib M-type paths, ecosystem rows). Findings marked as
> built/proved were verified by the child on this Mac; the rest are read from the cited
> repositories. Staged, pre-grade; nothing here is a gated claim.

## Bottom line

Lean 4 still has **no native coinductive types** and none on any roadmap. But the
landscape changed materially in 2026: there are now **two viable, actively-maintained
Lean 4 ITree implementations**, splitting along exactly the estate's Mathlib constraint.
The option one would reach for first (QpfTypes `codata`) is the one that provably cannot
express ITrees.

| Option | Maturity | Toolchain | Mathlib | Axioms | eutt? |
|---|---|---|---|---|---|
| **Verified-zkEVM/PolyFun** | maintained, production-shaped | **v4.33.1 (the estate floor)** | **yes** + cslib | machine-checked `{propext, Classical.choice, Quot.sound}` | **yes, correct** |
| **ISTA-PLV/coinductive** | experimental, active | v4.32.0 (**breaks on v4.33.1**) | **no — zero deps** | same three | **none at all** |
| mit-plv/lean4-itree | experimental, low activity | v4.29.0 | yes (unpinned) | not audited | no (+ has paco) |
| boogie-org/lean-itrees | **dead** (Jan 2025) | v4.12.0 | yes | — | **degenerate (proved)** |
| QpfTypes `codata` | proof-of-concept | v4.25.0 / v4.32.1 | yes (v0.2 dropping it) | not audited | n/a |
| Lean native | predicates only | v4.25.0+ | no | same three | n/a |

## 1. Native Lean 4 coinduction — confirmed predicates-only

`coinductive` (Lean v4.25.0, 2025-11-14) builds **`Prop`-valued predicates only**; the
reference manual states it and the compiler enforces it. `partial_fixpoint` landed in
v4.17.0 (PR #6355); `greatest_fixpoint`/`least_fixpoint` in v4.20.0. Theory: CCPO +
Knaster–Tarski. Axioms: `{propext, Classical.choice, Quot.sound}` — exactly the estate
allowlist, but a strict regression from plain `inductive` (zero). `Lean.Order.CCPO.csup`
is literally `Classical.choose (CCPO.has_csup hc)`
(`src/Init/Internal/Order/Basic.lean:105`). Caveat: the manual declares `Lean.Order`
*"a private API that may change without notice."* Roadmaps Y3/Y4.1 mention coinductive
predicates only; Lean FRO's Wojciech Różowski said on Zulip that kernel extension for
codata is "unlikely."

Key nuance: `partial_fixpoint` cannot build codata with the default flat order (a
recursive call under a constructor is not monotone) but **can** with an
approximation-ordered CCPO on the coinductive type — which is precisely what ISTA-PLV
does. Verified empirically by the child.

## 2. QpfTypes — cannot express ITrees

`github.com/alexkeizer/QpfTypes` (54 stars, Apache-2.0). `main`: last commit 2026-02-21,
Lean v4.25.0, **Mathlib dependency confirmed**. `dev-1-0` (v0.2 rewrite): last commit
2026-07-24, Lean v4.32.1, CI green. Its own README: *"intended as a proof-of-concept…
not at all ready for serious use."*

**The blocking finding:** QpfTypes' own `ITree/Basic.lean` documents that `codata`
**cannot express interaction trees** — `vis {α : Type} : ε α → (α → ITree ε ρ) → …` is a
dependent arrow. It falls back to fixing a single `α` as a type parameter, giving a
degenerate non-ITree. Open PR #56 ("Implement ITrees manually", opened 2024-12-04, never
updated) says the same in the author's words. The v0.2 pivot removes the `codata`/`data`
commands (explicit base functor + `deriving QPF` instead), removes the Mathlib dependency
(v0.2 sources import only `Batteries.Logic`, though the lakefile still lists mathlib),
and adds a CCPO so corecursion goes through `partial_fixpoint` — crediting Michael
Sammler's `coinductive` library.

## 3. ISTA-PLV/coinductive — the zero-dependency option

`github.com/ISTA-PLV/coinductive` (Michael Sammler, 40 commits; Alex Keizer, 3; 10 stars;
Apache-2.0, relicensed 2026-08-19; last commit 2026-08-19).

- **`lake-manifest.json` packages: `[]`. No Mathlib, no Batteries, nothing.** Full clean
  build: 10.4 s, 33 jobs (measured by the child).
- `CoInd F` = coherent approximation sequences over a polynomial functor, with a bespoke
  CCPO so `partial_fixpoint` handles corecursion. Full ITree stack: effects, handlers,
  `interp`/`interpM`, `exec`, plus a HeapLang. Built library is sorry-free (5 `sorry`s,
  all inside a commented-out block). `Classical.choose` in `CoInd.csup`; **no
  `Quot`/`Quotient` anywhere** — `CoInd` is a structure, not a quotient.
- Ergonomics verified empirically on v4.32.0: a genuinely non-terminating `collatz` via
  `partial_fixpoint` elaborates, axioms `{propext, Classical.choice, Quot.sound}`.

**Two hard caveats:**

1. **Does not build on v4.33.1** (child tried): 5 errors in `Coinductive/CoInd.lean` —
   four one-token fixes, one genuine reducibility regression in `unfold_fold`
   (`CoIndN F (n+1)` no longer unfolds at `implicit` transparency). Bounded, hours-scale,
   but real; toolchain drift is a recurring pattern there (their fortnightly auto-update
   files issues; issue #1 open since 2026-03-01 is exactly that).
2. **No weak bisimulation whatsoever.** Zero occurrences of `bisim`/`eutt` in the repo;
   it substitutes an `exec` refinement judgment (RefinedC-style). The carrier without the
   theory.

Footgun: unproductive definitions elaborate **silently to `⊥` (= `ITree.spin`)** rather
than being rejected — `def loop n := loop n partial_fixpoint` compiled without complaint
(read off `ITree.bot_eq`; the child did not close the `loop = spin` proof).

Related, different design: **HITrees** (arXiv:2510.14558, Fadaei Ayyam & Sammler,
2025-10-16) avoids coinduction entirely via defunctionalized higher-order effects with
inductive fixpoints. No public artifact found.

## 4. Verified-zkEVM/PolyFun — the strongest match to the estate's discipline

`github.com/Verified-zkEVM/PolyFun` (13 stars, Apache-2.0, created 2026-05-08, pushed
2026-08-25, 40 commits in 30 days, CI green across 4 workflows).

- **Lean v4.33.1 — the estate's exact floor.** Pins mathlib v4.33.1 + cslib v4.33.1.
  358 Lean files, 4.1 MB.
- ITrees as the **M-type of a one-step polynomial functor**, following Xia et al. (POPL
  2020), universe-independent event/answer/return universes.
- Complete stack: strong + **weak bisimulation (`WeakBisim` = Coq `eutt`)**, relational
  `WeakBisimRel` (`euttR`), simulation, handlers, traces, resumption, `mrec`/`fixRec`,
  do-notation.
- **Enforces the estate's exact axiom allowlist, machine-checked**:
  `scripts/PolyFunAxiomSweep.lean` walks the compiled environment and gates against
  `{propext, Classical.choice, Quot.sound}`; the committed `axiom_baseline.json` is
  literally `{"sorry": [], "nonstandard": []}`. Also catches `native_decide` trust axioms.
- Gets eutt **right** and documents the trap: the naive coinductive `tauL`/`tauR`
  formulation *"is unsound: it admits `WeakBisim (pure r) diverge`"* — they wrap
  τ-stripping in an inductive `TauSteps`.
- Practical nuance: the ITree layer imports Mathlib but **not** cslib (cslib only backs
  `Control/LTS/*` and `Control/Monad/Free*`). Origin: extracted from VCVio (verified
  cryptography, eprint 2026/899). Child did not build it (full Mathlib); CI and baseline
  taken from the repository.

## 5. Other Lean ITree efforts

- **mit-plv/lean4-itree** (17 stars, MIT, last commit 2026-05-07, Lean v4.29.0, Mathlib
  unpinned, 1123 LOC, zero sorries, no CI). Built on `Mathlib.Data.QPF.Univariate.Basic`
  + `PFunctor.M`, fully universe-polymorphic. Strong bisimulation only — no eutt.
  **This is where the only located Lean 4 paco port lives**: `Paco/PacoDefs.lean`
  implements parameterized least fixpoints over `Lean.Order.CompleteLattice` with
  `plfp_acc` and the classic tactics (`pcofix`, `pfold`, `punfold`, `pleft`, `pright`,
  `pcases`, `pmon`, `ptop`, `pclearbot`). Contributor Joonhyup Lee is from SNU, paco's
  home group.
- **boogie-org/lean-itrees** — dead (4 commits, last 2025-01-13, Lean v4.12.0, Amazon
  copyright, pinned-QpfTypes dependency). **Its `eutt` is degenerate — proved by the
  child**: the naive `taul`/`taur` formulation transcribed onto a working carrier closes
  `Eutt (ret r) spin` with no `sorry`
  (`'eutt_ret_spin' depends on axioms: [propext, Classical.choice, Quot.sound]`). A pure
  return is "weakly bisimilar" to divergence; the definition is unusable as written. Its
  `QITree.lean` also contains `opaque vis_impl := sorry`.
- Stated clearly as absence: no other Lean 4 eutt (GitHub code search returns only
  PolyFun); no Lean 4 CertiCoq/VST analogue; the ITree RISC-V semantics paper
  (arXiv:2605.04933) is Rocq, not Lean.

## 6. Mathlib's M-type / Cofix layer

- `Mathlib/Data/PFunctor/Univariate/M.lean` — `PFunctor.M` as greatest fixpoint via
  `CofixA` approximations + coherence (Hudon 2017; the same construction ISTA-PLV
  re-implements independently). API: `M.mk`, `M.dest`, `M.corec`, `M.bisim`,
  `M.corec_unique`. **Not a quotient** — no `Quot.sound` in the carrier itself.
- `Mathlib/Data/QPF/Univariate/Basic.lean` — `Cofix F := Quot (@Mcongr F q)`; this one
  does use `Quot.sound` (M quotiented by bisimulation congruence). Same for
  `MvQPF.Cofix`. Both inside the allowlist.
- Import chain is shallow: `QPF/Univariate/Basic` ← `PFunctor/Univariate/M` ←
  `PFunctor/Univariate/Basic` ← `Mathlib/Data/W/Basic` — matters if the estate ever
  vendors.
- `Mathlib/Data/Seq/Computation.lean` (Carneiro, 1092 lines) is a **ready-made Delay
  monad** with a **correct** weak equivalence (`c₁ ~ c₂ := ∀ a, a ∈ c₁ ↔ a ∈ c₂`,
  `think_equiv : think s ~ s`, divergence not equated with values). Delay only — no
  events.
- Strongest axiom evidence: PolyFun's whole ITree stack sits on Mathlib's `PFunctor.M`
  and its machine-checked sweep comes back empty — direct evidence the Mathlib M-type
  route stays inside `{propext, Classical.choice, Quot.sound}`.
- Adjacent: `leanprover/cslib` (670 stars; arXiv:2602.04846) has a real LTS theory
  (`Bisimulation`, `Simulation`, `HasTau`, `Divergence`, `TraceEq`). Requires Mathlib.

## 7. Aeneas — the live divergence precedent

`AeneasVerif/aeneas` (925 stars, pushed 2026-08-25, Lean backend v4.31.0 + Mathlib).
**Not fuel-based**: a three-case `Result` monad (`ok | fail | div`) with `div` as the
bottom of a flat CCPO using core `Lean.Order`. Load-bearing history: Aeneas **deleted its
bespoke `divergent` fixpoint elaborator in favour of native `partial_fixpoint`** (commit
`d7b9a04`, 2025-03-26; the README's pointer to the deleted path is stale). Termination is
extrinsic (partial-correctness specs; loop termination via decreasing-measure
combinators). Same architectural move as ISTA-PLV, one level up: **supply the right CCPO,
then let `partial_fixpoint` do the work.**

## 8. Fuel / step-indexing — a meaningful negative

No Lean 4 project was found using fuel or step-indexing to model ITree-like divergence.
Aeneas, ISTA-PLV, and PolyFun all chose domain-theoretic CCPO fixpoints or M-types.
**Fuel is not the Lean 4 idiom here.**

## Recommendation (child's, marked as judgment)

- **If Mathlib is negotiable: take PolyFun.** Only option at the exact toolchain floor,
  only correct eutt, and it independently enforces the estate's precise axiom allowlist
  with a committed zero-debt baseline — adopting someone else's discipline rather than
  imposing ours.
- **If Mathlib is genuinely forbidden:** ISTA-PLV/coinductive is the only zero-dependency
  carrier — budget (a) a v4.33.1 port and (b) building the entire weak-bisimulation
  theory, which is the real cost. lean-itrees is the cautionary tale for getting (b)
  wrong: the naive definition looks right, typechecks, and identifies `ret` with
  divergence.
- **Do not start from QpfTypes `codata`** — it provably cannot express `vis`, and its
  author has carried that as an open PR since December 2024.

## Caveats (child's)

- Two sub-investigations (Mathlib build-cost detail; iris-lean / fuel-theory literature)
  had not reported back; the Mathlib and fuel sections are from the child's own
  verification, so literature breadth on step-indexing trade-offs and iris-lean's COFE
  machinery is thinner than the rest.
- The v4.33.1 breakage analysis is the child's own build on this Mac, not an upstream
  report.
- PolyFun not built locally (full Mathlib); CI and axiom baseline taken from the repo.
- HITrees has no located public artifact.
