# ITrees + ctrees literature notes (primary-source sweep)

> Provenance: delivered 2026-08-25 by a literature-sweep child dispatched from the
> Rocq/ITrees survey session, landing after its parent finished; persisted verbatim-in-substance
> by the Mac coordinator (the child wrote no files; HTML entities normalized). All Coq below
> was pulled from primary sources (paper PDFs and raw.githubusercontent.com source files);
> the child flags where a snippet came through a summarizing extraction step. A third
> sibling (Vellvm / layered-interpreter material) could not be cancelled and may post a
> separate result later; this report does not depend on it. Staged, pre-grade; nothing here
> is a gated claim.

**Notation pin (authoritative; one extraction pass glossed `≅` incorrectly):**
**`≅` = `eq_itree eq` (strong), `≈` = `eutt eq` (weak), `≳` = `euttge eq` (left-strippable).**

---

## 1. Xia et al., POPL 2020 — Interaction Trees

Li-yao Xia, Yannick Zakowski, Paul He, Chung-Kil Hur, Gregory Malecha, Benjamin C. Pierce,
Steve Zdancewic. *Interaction Trees: Representing Recursive and Impure Programs in Coq.*
PACMPL 4(POPL), Art. 51, Jan 2020. DOI 10.1145/3371119 · arXiv 1906.00046.

### 1.1 The coinductive definition

Paper Fig. 1 (simplified): `CoInductive itree E R := Ret (r) | Tau (t) | Vis (A) (e : E A) (k : A → itree E R)`.
The Vis continuation is a meta-level Gallina function — "we can embed computation in an
ITree and the resulting datatype is extractable." The library uses the negative/record
form (`theories/Core/ITreeDefinition.v`):

```coq
Variant itreeF (itree : Type) :=
| RetF (r : R) | TauF (t : itree) | VisF {X : Type} (e : E X) (k : X -> itree).
CoInductive itree : Type := go { _observe : itreeF itree }.
Notation Ret x := (go (RetF x)).  Notation Tau t := (go (TauF t)).  Notation Vis e k := (go (VisF e k)).
Definition trigger : E ~> itree E := fun R e => Vis e (fun x => Ret x).
CoFixpoint spin {E R} : itree E R := Tau spin.
```

`Ret`/`Tau`/`Vis` are **notations, not constructors** — matters for tactics. `~>` is
`forall X, E X -> F X`.

### 1.2 Why Tau exists

§2 verbatim: "Representing silent steps explicitly allows ITrees to represent diverging
computations without violating Coq's guardedness condition." Footnote 3: guardedness is a
syntactic side condition on `cofix` bodies — corecursive results must occur under
constructors, not be eliminated by matching. `spin := Tau spin` is the canonical diverging
tree; without `Tau` every guard would be an observable `Vis`.

### 1.3 The monad, and exactly what "up to eutt" means

`bind` is a `cofix` pushing through `Ret/Tau/Vis`. The finer-than-folklore story:

(a) **The three monad laws hold at strong bisimulation `≅`** (`theories/Eq/Eqit.v`):
`bind_ret_l/bind_ret_r/bind_bind/bind_tau/bind_vis` are all `≅`. What fails at `≅` is
only **`tau_eutt : Tau t ≈ t`**.

(b) **The library's canonical monad equivalence is `eutt`** (`Core/ITreeMonad.v`):
`Eq1 (itree E) := fun a => eutt eq`, with `MonadLawsE` stated at `≈` plus
`Proper_bind : (eq1 ==> pointwise eq1 ==> eq1) bind`. Crisp statement: **`itree E` is a
monad in the category of setoids with `eq1 = eutt eq`** — not a monad on the nose, because
`bind (Ret v) k = go (observe (k v))`, not `k v`. Consequence: everything must be `Proper`;
rewrite with `setoid_rewrite`.

(c) **Where `eutt` is forced** — the sharpest point: `iter` guards its recursive call with
`Tau`:

```coq
iter f a0 ≅ ITree.bind (f a0) (fun ab => match ab with inl a => Tau (iter f a) | inr b => Ret b end)
```

holds at `≅` only because the `Tau` is written on the right. The categorical fixed-point
law `iter f ⩯ f >>> case_ (iter f) (id_ b)` has no `Tau`, so it holds only at `eq2` =
pointwise `eutt` (`Basics/CategoryKleisli.v`). **The chain to quote: Tau exists for
guardedness → `iter` must insert a Tau to be productive → the fixed-point law only holds
up to Tau → the whole equational theory lives at `eutt`.**

## 2. Recursion combinators

### 2.1 `iter` and the iterative-category structure

```coq
iter : (A -> itree E (A + B)) -> (A -> itree E B)
loop : (C + A -> itree E (C + B)) -> A -> itree E B
mrec : (D ~> itree (D +' F)) -> (D ~> itree F)
```

§4.1: "This operator makes no assumption on the shape of the loop body, a marked
improvement over the intensional guardedness check required by `cofix`." The four
iteration laws (`≐` = pointwise eutt): **fixed point**, **parameter (naturality)**,
**composition (dinaturality)**, **codiagonal** — the fields of `Iterative`
(`Basics/CategoryTheory.v`), implying KTrees form an **iterative category** (Bloom–Ésik).
Generalized by `Class MonadIter M := iter : (A -> M (A + B)) -> A -> M B`; instances lift
through transformers (`MonadState.v` proves the full chain for `stateT`; `MonadProp.v`
gives the `Prop`/Ensemble instance with all four laws).

### 2.2 `loop`

Derived from `iter`; equips KTrees with **traced monoidal** structure (Hasegawa; Joyal
et al.) — what wires control-flow graphs in Imp-to-Asm.

### 2.3 `mrec`, `rec`, `callE`

`mrec ctx R d := interp_mrec ctx (ctx _ d)` (`Interp/Recursion.v`);
`Inductive callE A B : Type -> Type := Call : A -> callE A B B` is the single-function
specialization; `rec body := mrec (calling' body) ∘ Call`. Unfolding law:
`mrec rh d ≈ interp (case_ (mrec rh) id_) (rh d)`; source counterparts
`interp_mrec_bind ≅`, `interp_mrec_trigger ≳`, `mrec_as_interp ≈`, `rec_as_interp ≈`
(`Interp/RecursionFacts.v`). Worked example is Ackermann — recursive calls by triggering
events, "without any requirement to ensure well-foundedness."

### 2.4 KTrees

`ktree E A B := A -> itree E B`; `eq_ktree` = pointwise **eutt**; `cat h k := fun a =>
bind (h a) k`. Cocartesian category (`case_`/`inl_`/`inr_` laws). Handlers get the same
structure with `Eq2_Handler := eutt_Handler`.

### 2.5 Guardedness: `cofix` vs `iter`

§4: Coq's check "relies on syntactic mechanisms that are not compositional." Practically:
`cofix` lives inside the library (`bind`, `translate`, `iter`, `interp_mrec`, `spin`);
clients use `iter`/`loop`/`mrec`/`rec` — even the exception combinators are `iter`-based.
Realistic boundary: anything that interleaves *several* trees under a scheduling policy
(ctrees' cooperative scheduler) needs hand-written corecursion; folds/unfolds over one
tree do not.

## 3. Higher-order transforms

### 3.1 `translate` — event morphism, structure-preserving

Pushes `h : E ~> F` through the tree; **preserves `≅`** (inserts no Taus):
`translate_ret/tau/vis/bind/id/cmpE` all `≅` (`Interp/TranslateFacts.v`). Use when only
renaming events.

### 3.2 `interp` — the handler mechanism

```coq
interp (h : E ~> M) : itree E ~> M :=
  iter (fun t => match observe t with
                 | RetF r => ret (inr r) | TauF t => ret (inl t)
                 | VisF e k => fmap (fun x => inl (k x)) (h _ e) end).
```

**A handler satisfies no laws; the burden is on the target monad**: `Functor`/`Monad`/
`MonadIter` to define, plus `Eq1`/`Eq1Equivalence`/`MonadLawsE`/`Iterative (Kleisli M)`
to reason. Two verified caveats: (1) **`interp` inserts a `Tau` at every `Vis`** —
`interp_vis … ≅ bind (f e) (fun x => Tau …)` and hence
**`interp_trigger : interp f (trigger e) ≳ f _ e`** (euttge, NOT ≅) — the single most
common "why won't this rewrite"; (2) `InterpFacts.v` proves the theory only for
`h : E ~> itree F` — each transformed target gets a bespoke facts file (the gap the
ICFP'22 paper closes).

### 3.3 `interp` respects `eutt` — the workhorse

`Proper (eq2 ==> respectful_eutt) interp` and `Proper (eutt RR ==> eutt RR) (interp f)`:
licenses `setoid_rewrite` **under** an interpreter. §5.4: the Imp-to-Asm proof is "purely
inductive … all coinductive reasoning is hidden in the library."

### 3.4 `interp_state`

`stateE S` (Get/Put), `h_state`, `interp_state := interp` at `stateT S M`;
`StateFacts.v`: `Ret/Tau/Vis/bind` at `≅`, `trigger` at `≈`, `Proper (eutt RR ==> eq ==>
eutt (prod_rel eq RR))`.

### 3.5 `interp_prop` is Vellvm's, not ITrees'

`vellvm/src/rocq/Utils/PropT.v`: `PropT E X := itree E X -> Prop`, `bind_PropT`
existentially quantifies a tree and continuation. **Load-bearing source comment: "This
domain is *almost* a monad, it lacks the associativity to the left of its bind."** Sets
of itrees are the standard nondeterminism model and the price is a monad law — precisely
the ctrees motivation.

### 3.6 Event sums, `Subevent`, `trigger`

`sum1`/`+'` (`Indexed/Sum.v`), `Subevent E F = ReSum`, notation `E -< F`,
`trigger e := ITree.trigger (subevent _ e)` (`Core/Subevent.v`). Handler algebra:
`case_`, `inl_`, `inr_`, `cat f g := fun _ e => interp g (f _ e)`, `id_ := trigger` —
handlers form a cocartesian category; a stack is `h1 >>> h2 >>> h3`, each `interp`
peeling one signature layer. **`-+-` is not an ITrees notation** (checked; only `+'` and
`-<`). Variant worth knowing: `entree-specs` (Silver et al., ECOOP 2023) uses
`EncodingType E := response_type : E -> Type` and a `ReSum` with an extra `resum_ret`
mapping answers back down — a genuine strengthening.

### 3.7 Typed failure — the codec-relevant part

```coq
Variant exceptE (Err : Type) : Type -> Type := Throw : Err -> exceptE Err void.
Definition throw `{exceptE Err -< E} {X} (e : Err) : itree E X
  := vis (Throw e) (fun v : void => match v with end).
```

**Key design point: `Throw`'s answer type is `void`** — throwing has no continuation, so
`throw` inhabits any `X` and `bind (throw e) k ≅ throw e` structurally. Reification
combinators, both `iter`-based: `try_catch` and `throw_prefix : itree (exceptE Err +' E) R
-> itree (exceptE Err +' E) (R + Err)` (failure reified into the return type), with `≅`
equations in `ExceptionFacts.v`. `interp_fail` exists but is `option` — **untyped**
failure. Practical recommendation for decode/encode: `exceptE DecodeErr` + `throw_prefix`,
or a bespoke `interp_err` into `eitherT Err (itree F)` mirroring `interp_fail` (the
library does not ship it; `eitherT Err M` is Monad+MonadIter whenever `M` is).

Two more verified pieces a codec wants:
- `Props/Leaf.v`: `a ∈ t` ("has a Ret leaf a"), `Leaf_bind_inv`, `Proper (eutt eq ==> iff)`.
- `Props/HasPost.v`: `t ⤳ Q := eutt (fun x _ => Q x) t t` — a unary Hoare logic;
  `has_post_bind`, **`has_post_iter_strong` (a loop-invariant rule: "the decoder, however
  it loops, only ever returns well-formed values")**, `eutt_post_bind`,
  `has_post_Leaf_equiv`.

## 4. Equivalences, paco, and theorem shapes

### 4.1 One definition, two booleans

`Eq/Eqit.v`: `eqitF b1 b2 vclo sim` with `EqRet/EqTau/EqVis` appealing **coinductively**
to `sim` and `EqTauL/EqTauR` (gated by `b1`/`b2`) appealing **inductively** to `eqitF` —
the nested coinductive–inductive structure that strips only **finitely many** Taus per
side, so `spin ≈ spin` but `spin ≉ Ret v` (termination-sensitivity), and eutt stays
transitive. `eq_itree := eqit false false`, `eutt := eqit true true`,
`euttge := eqit true false` (`≳`: Taus stripped on the left only — what interpretation
produces). Also: `SimUpToTaus.v` (`sutt`, one-sided; `sutt ∧ flip sutt ⟺ eutt`) and
**`Eq/Rutt.v`** (5.0.0+): relation up to tau over **different event families**, with
`REv : E1 A -> E2 B -> Prop` and `RAns : E1 A -> A -> E2 B -> B -> Prop` —
Reynolds-style relational parametricity for itrees. **For a codec, `rutt` is likely the
right top-level relation**: decoder over byte events vs abstract spec, events matched by
`REv`, answers by `RAns`.

### 4.2 paco — Hur, Neis, Dreyer, Vafeiadis, POPL 2013

*The Power of Parameterization in Coinductive Proof.* DOI 10.1145/2429069.2429093.
Diagnosis verbatim: syntactic guardedness "is inherently non-compositional: it requires
one to have access to the *proof* of each of the component entailments." Construction:
`G_f(x) ≜ νy. f(x ⊔ y)` with Initialize (`νf ≡ G_f(⊥)`), Unfold
(`G_f(x) ≡ f(x ⊔ G_f(x))`), **Accumulate** (`y ⊑ G_f(x) ⟺ y ⊑ G_f(x ⊔ y)`) — the
mid-proof "add your goal to the knowledge" rule that is `pcofix` — and COMPOSE.
Up-to: respectful ⟹ sound; respectful functions compose; the greatest respectful
function (companion) `f†` gives `G_{f†}(r) ≡ (G_{f†}(r))†` — state the goal once, get
every respectful up-to technique for free.

**gpaco** (Zakowski, He, Hur, Zdancewic, CPP 2020, arXiv 2001.02659): `rclo`/`gpaco2`
with the `r`/`rg` split (unguarded vs guarded knowledge). ITrees wraps it as `euttG`
(`Eq/UpToTaus.v`) with four relation parameters and built-in up-to-bind
(`euttG_bind`) and up-to-transD closures — what makes eutt transitivity and
bind-congruence provable at all; tactic `ecofix`. Pous's `coinduction` library (LICS
2016; companion, later tower induction) is the same idea differently packaged —
**ITrees uses paco/gpaco; ctrees uses Pous's `coinduction`.**

### 4.3 Real theorem-statement shapes

(A) **ITrees' Imp-to-Asm** (`tutorial/Imp2AsmCorrectness.v`): `Renv` relates
environments; `bisimilar t1 t2 := forall g_asm g_imp l, Renv g_imp g_asm ->
eutt state_invariant (interp_imp t1 g_imp) (interp_asm t2 g_asm l)`;
`Theorem compile_correct : equivalent s (compile s)`. **Canonical shape:
`eutt R (interp h_src (denote_src s)) (interp h_tgt (denote_tgt (compile s)))`** — proof
by structural induction, no user coinduction.

(B) **Vellvm's refinement tower** (`Theory/Refinement.v`): deterministic layers are
`eutt R` (refine_L0..L2); nondeterministic layers shift to **sets of itrees with backward
inclusion up to eutt**: `refine_L3 ts ts' := forall t', ts' t' -> exists t, ts t /\ eutt
refine_res3 t t'` (L3..L6; L6 swaps in `refine_OOM_h`).

(C) **ITrees ↔ traces** (`Interp/Traces.v`): `trace_incl ⟺ sutt`,
**`trace_eq ⟺ eutt`** — weak bisimulation coincides with trace equivalence.

(D) **ctrees CCS full abstraction**: `⟦P⟧ ∼ ⟦Q⟧ ↔ P ∼_ccs Q` — sound and complete.

### 4.4 ICFP 2022 follow-up

Yoon, Zakowski, Zdancewic, *Formal Reasoning about Layered Monadic Interpreters*,
PACMPL 6(ICFP) 99. DOI 10.1145/3547630. Names the three gaps confirmed above (handler
lifting through sums; composing interpreters at transformed targets; per-monad relational
theories + inversion principles) and answers with `Trigger`/`Subevent`/`Interp` classes,
a generic `over`, and **`eqmR`** ("equivalence of monads up to R") plus the **image** of
a computation. Honest answer to "what laws must a handler satisfy": *none — the target
monad must be an iterative monad with eqmR structure; this paper is where that is worked
out.*

## 5. Choice Trees (ctrees)

Chappe, He, Henrio, Zakowski, Zdancewic, PACMPL 7(POPL) 61, 2023. DOI 10.1145/3571254 ·
arXiv 2211.06863 (extended). Journal: JFP 35:e21, 2025, DOI 10.1017/S0956796825100105.
Library github.com/vellvm/ctrees (branch `dev`; tag `popl23`).

### 5.1 The datatype — three arities in the wild

Paper Fig. 4: `Ret | Vis | BrS n k | BrD n k` (+ `Guard := BrD 1`, `Step := BrS 1`).
The popl23 artifact: `RetF | VisF | BrF (vis : bool) n k`. Current dev/JFP:
`ctree E B R` parameterized by a branch signature `B`, six constructors
(`RetF | StuckF | StepF | GuardF | VisF | BrF`), `BrS` derived; arities from `Index.v`
(`B0` void, `B1` unit, `B2` bool, `Bn`, `BN`).

### 5.2 Internal vs external branching; Tau splits in two

`BrS` (stepping) = a `tau` LTS transition per edge — observable *that* a branch was
taken. `BrD` (delayed) = **no LTS state**; `trans` inductively recurses through it.
§5.3 verbatim: "ITrees' `Tau` thus corresponds to either a `Guard` or a `Step`.
Nondeterminism forces us to separate both concepts." `Guard t ~ t` (strong), but
`Step t ≁ t` while `Step t ≈ t`.

### 5.3 Why plain ITrees are unsatisfying for nondeterminism

§2.2 verbatim: "thinking of the trees as labeled transition systems, **ITrees are
deterministic**." `nondetE`-as-`Vis` lacks the choice algebra (assoc/comm/idem). The
`itree → Prop` route fails three ways: (1) bind does not associate left (a "Prop monad
transformer" problem, per Maillard et al. 2020) and the existential witness is needed
upfront where it should be produced coinductively; (2) it forgets *when* choices are
made — too coarse to be compositional; (3) propositional sets kill extraction, forcing
nondeterminism last in the stack.

### 5.4 Equivalences and the LTS

`equ` (`≅` analogue, "carefully avoid" calling it strong bisimulation). The key
contribution: an **inductive `trans`** over the coinductive tree with labels
`tau | obs e v | val v`; LTS states are nodes not preceded by delayed choice. Derived
`etrans`/`wtrans` via RelationAlgebra. `ssim` (`≲`), `sbisim` (`~`), `wbisim` (`≈`);
dev adds `cssim` (deadlock-sensitive), trace modules, and transition-free
characterizations (`ssim'`, `sbisim'`).

### 5.5 What survives, what fails

All three **monad laws hold at `equ`** — the direct improvement over PropT. Up to
`sbisim`: `Ret`/`Vis`/`BrS` congruence rules (BrS an iff), `sbisim_clo_bind`. Choice
algebra: **delayed branching is associative, commutative, idempotent; stepping branches
are only commutative, almost idempotent, and crucially NOT associative** (standard
process algebra). `iter` is iterative w.r.t. **strong** bisim (guarded by `Guard`);
cost: `spinD ∼ stuck`. **Weak-bisimulation gotcha (JFP §10.3)**: `wbisim` is not a
congruence for `Br`, up-to-bind fails in general, library support is restricted
(`WBisim` not re-exported from `Eq.v`). **Interpretation is not a monad morphism for
`sbisim` in general** — executable counterexample in `Interp/FoldCTree.v` (`h := fun e =>
Step (trigger e)`); fixed by **simple** handlers (POPL Lemma 5.1) or **quasi-pure**
handlers (JFP Def. 5/Thm 1). Sharpest contrast with ITrees, where `interp` is
unconditionally Proper for eutt. ITree embedding: `embed` with
`eutt t u ⟹ embed t ∼ embed u`.

### 5.6 When ctrees are forced

§2.2's crisp criterion: `BrD` is needed **"whenever the operational semantics includes a
rule whose possible transitions depend on the existence of other transitions"** —
implementing that without `BrD` would require potentially non-computable introspection.
Named instances: mutexes/locks/await, crash failures, relaxed-memory promising rules.
Conversely stay with ITrees when nondeterminism is lack-of-information and no LTS
bisimulation is needed — **"a codec is squarely in ITree territory."** Case studies: CCS
(sound+complete full abstraction) and cooperative multithreading (hand-written
corecursive `schedule`; equations at weak bisim; compositionality lost after the second
interpretation stage). Later: concurrent LLVM memory (CPP 2025).

### 5.7 Library state

`rocq-ctree 2.0-dev`, MIT, active (Rocq 9.0 migration Nov 2025; `mrec` ported Nov 2025).
Deps: rocq-core ≥ 9.0, coq-ext-lib, **rocq-coinduction ≥ 1.21**, rocq-relation-algebra,
rocq-equations, coq-itree ≥ 5.0. Known wart: universe checking locally unset in places
(ITrees + RelationAlgebra import clash). "ctrees is the Vellvm group's successor answer
to Vellvm's nondeterminism problem" is well-supported; whether vellvm/vellvm currently
depends on rocq-ctree is unverified.

## 6. Xia's PhD dissertation

*Executable Denotational Semantics with Interaction Trees*, UPenn 2022, 105 pp.
Supervisor: Pierce (title page; Zdancewic's page says cosupervised). Committee: Weirich
(chair), Zdancewic, Alur, Chlipala. PDF via repository.upenn.edu (Penn Dissertations
5348, CC BY-NC-SA). **Calibrate expectations down**: no eutt-transitivity/up-to/gpaco
chapter (deferred to the CPP 2020 paper), no Elgot development (one-paragraph claim:
ITrees are the free completely iterative monad up to strong bisim, free pointed monad up
to weak — no proof), no traces/testing chapters. Genuinely adds: Ch. 4 (~38 pp) = the
OOPSLA 2022 C4 paper (concurrent objects, linearizability, transactional predication);
§2.1.1 alternative definitions (Isabelle port flattens `E`, partializes the
continuation); and **Ch. 6, the highest-value design criticism**: §6.2(a) redefine
`itree` as the free monad transformer over the **delay monad** so the equational theory
is inherited; §6.2(b) **`Vis` injectivity is equivalent to UIP** (the library assumes
`eq_rect_eq` for `eqit_inv_Vis`; axiom-free weaker form exists) — cross-confirms the
Lean probe's finding that UIP is free in Lean; §6.2(c) internalize event-sum structure
rather than `E -< F` injections; §6.2(d) internal nondeterminism has been patched three
incompatible ways (invisible-branch bisim, sets of itrees, ctrees) and needs a
principled framework; §6.4 ITrees are essentially **first-order** — higher-order needs
game semantics (state-dependent move sets).

## 7. The InteractionTrees library (DeepSpec/InteractionTrees)

**Versions.** Tags only, no Release objects. Current **5.2.1** (opam `coq-itree.5.2.1`,
dated 2025-02-28) — a one-line compat release (Coq 8.20, Paco 4.2.1–4.2.3). Substantive:
5.2.0 (Coq 8.19, `Hint Mode` on MonadIter), 5.1.0 (RuttFacts), **5.0.0 (May 2022)**:
split out `coq-itree-extra` (ITrace, Dijkstra, Secure, IForest), added `rutt`,
`Props.{Finite,HasPost,Leaf}`, `Events.ExceptionFacts`. `master` is 10 commits ahead —
CI/Rocq plumbing only. Deps: coq ≥ 8.14, coq-ext-lib ≥ 0.11.1, coq-paco ≥ 4.2.1; **no
relation-algebra** (category theory home-grown).

**Axioms.** UIP (`eq_rect_eq`) for `eqit_inv_Vis`; funext only for
`CartesianClosed_Fun`; EM+choice only in `itree-extra` (ITrace/Dijkstra).
`Eq/EqAxiom.v` exports but does not use `bisimulation_is_eq`. The tutorial compiler
proof is axiom-free (`tutorial/PrintAssumptions.v`).

**Structure** (logical path `ITree`; note `_CoqProject` does not exist — the files are
`_CoqProject.itree`/`.extra`/`.dune`): `Basics/` (categories, Kleisli,
`HeterogeneousRelations`, `Monad` with Eq1/MonadLawsE, `MonadProp` — the Ensemble monad
proved Iterative, `MonadState`); `Core/` (ITreeDefinition, KTree, Subevent, ITreeMonad);
`Eq/` (Eqit, UpToTaus/euttG/ecofix, SimUpToTaus, Rutt/RuttFacts, Paco2); `Indexed/`
(Sum `+'`); `Interp/` (Interp, InterpFacts, TranslateFacts, Handler, Recursion,
**Traces**); `Props/` (Leaf, Finite, Infinite, Cofinite, HasPost, EuttNoRet — **no
`Divergence.v`**: the 5.0.0 CHANGELOG entry announcing `may_diverge`/`must_diverge` is
stale, those names appear nowhere); `Events/` (State, Reader — note `Type -> Prop` in
source vs `Type -> Type` in coqdoc, cite the source; Writer, Exception `Throw : Err ->
exceptE Err void`, Nondeterminism `Or : nondetE bool` "actually bounded", Map,
MapDefault, Concurrency spawnE, Dependent depE, + facts files).

**tutorial/**: Imp, Asm, AsmCombinators, Imp2Asm, Imp2AsmCorrectness (`compile_correct`),
AsmOptimization, Fin/KTreeFin, PrintAssumptions.

**`extra/Secure/`** (since 5.0.0, package `coq-itree-extra`, namespace `ITree.Extra`):
security-preserving relation **`eqit_secure`** — `eqitF` extended with privilege
assignment `priv : forall A, E A -> L`, observer level `l`, coinductive+inductive rules
for unprivileged events, and **halting rules for empty answer types** (secret halt
indistinguishable from secret-or-silent). Noted in source as **not reflexive**. Case
study `secure_example/`: a labelled Imp→Asm noninterference-preserving compiler. Also
`extra/ITrace` (EM+choice), `extra/Dijkstra` (Dijkstra monads forever, POPL 2021),
`IForest`.

## Things the child could not verify

- `-+-` is not an ITrees notation (only `+'`, `-<`).
- `interp_prop` verbatim definition (Vellvm has `PropT.v`, `PropT2.v`,
  `PropTExperimentations.v` — more than one candidate).
- Xia dissertation ProQuest/ACM records (403 to automation); DBLP has no thesis entry.
- Whether vellvm/vellvm currently depends on rocq-ctree.
- ICFP'22 §3–4 verbatim (`eqmR` axioms, generic-M interp laws) — pp. 8–16 of the PDF are
  the place.
- Full theorem inventory of ctrees `Epsilon.v`/`SSimAlt.v`/`SBisimAlt.v`/`CSSim.v`.
