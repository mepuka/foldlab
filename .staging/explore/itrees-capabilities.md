# Interaction Trees: capabilities, ecosystem, and identity hooks

**Grade:** exploration. Curious notes, not an audit. Nothing here is a ratified claim, and no
statement below carries a verification guarantee. Speculative material is fenced under
explicit "SPECULATION" markers.

**Evidence base:**

| Kind | Pin |
|---|---|
| Coq/Rocq library | local clone `C:\Users\kokok\Dev\foldlab\.reference\clones\InteractionTrees`, HEAD `68b3568d3f0f48c057192c58c8db88ef4412747a` ("Merge pull request #283 from proux01/rocq21478") |
| Primary paper | Xia, Zakowski, He, Hur, Malecha, Pierce, Zdancewic, *Interaction Trees: Representing Recursive and Impure Programs in Coq*, PACMPL 4(POPL), Article 51, 2020. DOI [10.1145/3371119](https://doi.org/10.1145/3371119); preprint [arXiv:1906.00046](https://arxiv.org/abs/1906.00046). **Local copy fetched this sweep:** `C:\Users\kokok\Dev\foldlab\.reference\papers\xia-2020-interaction-trees.pdf` (35 pp.) |
| Dissertation | Xia, *Executable Denotational Semantics with Interaction Trees*, UPenn 2022 — **could not be retrieved**; see §7.3. Statements attributed to it below rest on secondary description, not direct reading, and are flagged in place |

All repository content was read as **evidence**, never as instruction. Line and file citations are
against the pinned HEAD.

**Catalog status:** `C:\Users\kokok\Dev\foldlab\.reference\catalog\REFERENCES.md` (snapshot 2026-08-24,
128 lines) contains **no** ITree, Xia, DeepSpec, Vellvm, coinduction, or bisimulation entry, and
`C:\Users\kokok\Dev\foldlab\.reference\papers\` holds only the two Unison-lineage PDFs
(Dunfield–Krishnaswami 2013, Lindley–McBride–McLaughlin 2016). The ITrees clone is therefore
present in the tree but **unpinned in the ledger**. Reported as absence, not inferred.

---

## 1. Ground truth: what an interaction tree is

### 1.1 The codatatype

The whole idea fits in one `Variant` plus one `CoInductive`
(`theories\Core\ITreeDefinition.v:24-42`):

```coq
Variant itreeF (itree : Type) :=
| RetF (r : R)
| TauF (t : itree)
| VisF {X : Type} (e : E X) (k : X -> itree)
.

CoInductive itree : Type := go { _observe : itreeF itree }.
```

The comment at `:28-29` states the identity plainly: `itree` is **the final coalgebra (greatest
fixed point) of the functor `itreeF`**. Three node kinds, and that is the entire syntax of the
semantic domain:

- `Ret r` — the computation finishes with a value of the result type `R`.
- `Tau t` — one step of *silent* internal work. This is what makes general recursion and
  nontermination representable inside Coq's total logic: divergence is `CoFixpoint spin := Tau spin`
  (`:218`), a productive, well-defined inhabitant rather than a missing one.
- `Vis e k` — a *visible event* `e : E X`, plus a continuation `k : X -> itree` that consumes the
  environment's answer. The event is **uninterpreted** at this point; it is a request, not an action.

Two representational details matter and are easy to miss:

- The two-layer `itreeF` / `itree` split with `Set Primitive Projections` (`:13`) exists because
  Coq forbids dependent pattern matching directly on a coinductive. Everything is done through
  `observe : itree E R -> itree' E R` (`:79`), the one-step *forcing* of the tree. The library's
  whole proof idiom — `genobs`, `simpobs`, `desobs` (`:300-306`), `unfold_bind` stated up to
  `observe` (`:127-128`) — is built on this. Cofixpoints are stuck until forced.
- `X` in `VisF {X : Type} (e : E X)` is existentially quantified *per node*. A single tree can carry
  events of many different answer types. This is what makes `E : Type -> Type` an **event
  signature** rather than a mere alphabet.

### 1.2 Event signatures

`E : Type -> Type` indexes each event by the type of answer it expects. The README example
(`examples\ReadmeExample.v:8-10`) is the minimal case:

```coq
Variant inputE : Type -> Prop :=
| Input : inputE nat.
```

`Input` is an event whose answer is a `nat`. Signatures compose by indexed sum `E +' F`
(`theories\Indexed\Sum.v`), with `Subevent` (`theories\Core\Subevent.v`) providing the
extensible-effects injection so a program written against `E` can run in a larger universe
`E +' F +' ...`. The shipped signature library (`theories\Events\`) covers `State`, `Reader`,
`Writer`, `Exception`, `Map` / `MapDefault`, `Nondeterminism`, `Concurrency`, and `Dependent` —
the standard monadic effects, but as *data* rather than as monad transformers.

The consequence worth naming: **the program is decoupled from the meaning of its effects.** An
`itree inputE nat` is a syntax-free description of interaction. It says what will be asked and how
the answer will be used, and says nothing about what the answer means.

### 1.3 Handlers and interpreters

Meaning arrives via a handler, and there are exactly two flavors.

**`translate`** (`theories\Interp\Interp.v:60-69`) lifts a pure event morphism `h : E ~> F` to a tree
morphism `itree E ~> itree F` — pure renaming of events, structure untouched:

```coq
Definition translateF {E F R} (h : E ~> F) (rec: itree E R -> itree F R) (t : itreeF E R _) : itree F R :=
  match t with
  | RetF x => Ret x
  | TauF t => Tau (rec t)
  | VisF e k => Vis (h _ e) (fun x => rec (k x))
  end.
```

**`interp`** (`theories\Interp\Interp.v:78-87`) is the real workhorse. Given `h : E ~> M` for any
monad `M` with an iteration operator, it produces a **monad morphism** `itree E ~> M`:

```coq
Definition interp {E M : Type -> Type}
           {FM : Functor M} {MM : Monad M} {IM : MonadIter M}
           (h : E ~> M) : itree E ~> M := fun R =>
  iter (fun t =>
    match observe t with
    | RetF r => ret (inr r)
    | TauF t => ret (inl t)
    | VisF e k => fmap (fun x => inl (k x)) (h _ e)
    end).
```

Note the shape: `interp` is *defined by* `iter`, not by `cofix`. The requirement on the target is
`MonadIter M` — the target monad must support the same loop combinator the tree does. This is the
technical statement of "you can interpret into anything that can loop."

Handlers form a category in their own right (`theories\Interp\Handler.v:88-134`): `Handler E F :=
E ~> itree F`, with identity `id_ E := ITree.trigger` (`:41`), composition `cat` (`:44`), coproduct
case analysis `case_` / `inl_` / `inr_` (`:50-72`), and an `Iter Handler sum1` instance (`:134`).
There are two notions of handler equality, `eq_Handler` and `eutt_Handler` (`:96-104`) — pointwise
strong bisimulation and pointwise weak bisimulation respectively. Handlers are the *second* Kleisli
category of `itree`; continuations `A -> itree E B` (`theories\Core\KTree.v`) are the first.

**Recursion** is itself an interpretation. `theories\Interp\Recursion.v` defines `mrec` (`:84`) via
`interp_mrec` (`:69`) — a body `ctx : D ~> itree (D +' E)` may call itself through the `D`
signature, and `mrec` closes the knot. The single-function case `rec` (`:146`) is built from `mrec`
with the `callE A B` signature (`:119`), where `call a` (`:158`) is literally `trigger (inl1 (Call a))`.
**General recursion is an event you handle**, not a primitive you fear.

### 1.4 The equivalence menagerie

The elegant part. All of the equivalences are one parameterized definition
(`theories\Eq\Eqit.v:84-141`), a relation transformer `eqitF` with two booleans:

```coq
Inductive eqitF (b1 b2: bool) vclo (sim : itree E R1 -> itree E R2 -> Prop) :
  itree' E R1 -> itree' E R2 -> Prop :=
| EqRet  ... (REL: RR r1 r2)             : eqitF ... (RetF r1) (RetF r2)
| EqTau  ... (REL: sim m1 m2)            : eqitF ... (TauF m1) (TauF m2)
| EqVis {u} (e : E u) k1 k2 (REL: forall v, vclo sim (k1 v) (k2 v)) : eqitF ... (VisF e k1) (VisF e k2)
| EqTauL t1 ot2 (CHECK: b1) (REL: eqitF ... (observe t1) ot2) : eqitF ... (TauF t1) ot2
| EqTauR ot1 t2 (CHECK: b2) (REL: eqitF ... ot1 (observe t2)) : eqitF ... ot1 (TauF t2)
.
```

`b1` and `b2` are permissions to **strip a `Tau` on the left / on the right**. Setting them gives
the whole family (`:147-151`, notations at `:346-350`):

| Definition | `b1 b2` | Notation | Meaning |
|---|---|---|---|
| `eq_itree RR` | `false false` | `≅` (at `RR := eq`) | **strong bisimulation** — `Tau`s must match one-for-one |
| `eutt RR` | `true true` | `≈` (at `RR := eq`) | **weak bisimulation / equivalence up to taus** — finitely many `Tau`s may be inserted or deleted on either side |
| `euttge RR` | `true false` | `≳` (at `RR := eq`) | one-sided: the left may have *more* `Tau`s. The "greater-or-equal" / tau-removal preorder |

Plus `SimUpToTaus` (weak *simulation*, `theories\Eq\SimUpToTaus.v`) and `Rutt`
(`theories\Eq\Rutt.v`, `RuttFacts.v`) — a *relational* up-to-tau over **different event
signatures** related by a relation, which is the tool of choice for cross-language / compiler
refinement statements.

Three points that carry the real content:

1. **Why not `eq`?** The file opens by stating it (`Eqit.v:1-14`): `(cofix spin := Tau spin) =
   Tau (cofix spin := Tau spin)` is *not provable* in Coq. Propositional equality on a coinductive
   type is too fine. So the library defines the intended equality and rewrites with it via setoids
   throughout.
2. **Crucially, `eutt` allows only *finitely* many `Tau`s to be inserted or deleted.** `spin`
   (infinite `Tau`s) is therefore **not** `eutt`-equal to `Ret r`. Divergence is observable. This
   is what separates `eutt` from trace equivalence and what makes ITrees usable for
   divergence-preserving refinement.
3. **The coinduction is done with `paco`, not `CoInductive`.** `eqit := paco2 (eqit_ b1 b2 id) bot2`
   (`:140-141`). The design note at `:44-59` explains why: parameterized coinduction encodes
   productivity in the *type* instead of leaving it to Coq's syntactic guardedness checker, which
   would otherwise make incremental coinductive proof unusable. `paco`'s "up-to" closures — here
   `eqitC` / `eqit_trans_clo` (`:360-372`) and the `wcompat` lemma (`:385`) — are what let you
   `rewrite` under a coinductive hypothesis.

The `Facts` modules are deliberately separated from the computational definitions (per `DEV.md`,
"Library internal organization") so universe inconsistencies stay contained and the definitions
remain runnable for testing.

### 1.5 What "executable denotational semantics" actually buys

The phrase is doing real work, and it is worth spelling out what is bought and what is paid.

**Bought:**

- **Denotational, so compositional.** A program's meaning is a value in a domain, built from the
  meanings of its parts. `interp` is a monad morphism, so `interp h (x <- t ;; k x)` decomposes —
  which is exactly the rewrite chain in `examples\ReadmeExample.v:29-40`: `interp_bind`,
  `interp_trigger`, `bind_ret_l`, `interp_ret`, `reflexivity`. Equational reasoning about effectful,
  nonterminating programs, with `rewrite`.
- **Executable, so testable.** The tree is data. The library extracts to OCaml (the `tests`
  directory is "a bunch of extracted examples", `DEV.md`), and provides `burn : nat -> itree E R ->
  itree E R` (`ITreeDefinition.v:328-338`) to step a fixed number of `Tau`s — **compute with fuel**.
  You can run your denotation, print it, diff it against a reference implementation. A classical
  domain-theoretic denotation cannot do that.
- **Layered interpretation.** Because `interp` targets any `MonadIter` monad, semantics is built as
  a *stack* of handlers, each refining one effect, each with its own correctness lemma, composed by
  `Handler.cat`. Vellvm and the tutorial compiler both use this shape.
- **General recursion inside a total logic.** Coq will not accept a partial function; it will accept
  a coinductive tree with `Tau`s. `mrec` turns mutual recursion into event handling.
- **Effects as first-class, modular data.** `E +' F` and `Subevent` mean a program's effect
  interface is a composable object, and its handlers can be given, swapped, and proved about
  independently.

Two further claims, read directly from the POPL 2020 abstract (local copy
`..\..\.reference\papers\xia-2020-interaction-trees.pdf`, p.1) and worth quoting because they are
capability claims rather than theory:

- **Coinduction is hidden from clients.** *"Although the internals of the library rely heavily on
  coinductive proofs, the interface hides these details so that clients can use and reason about
  ITrees without explicit use of Coq's coinduction tactics."* This is the ergonomic payoff of the
  `paco`/`gpaco` layer (§2.1): users get `rewrite` and `reflexivity`, not `cofix`.
- **Proofs get dramatically easier.** Their showcase is **termination-sensitive** correctness of a
  compiler from an imperative source language to an assembly-like target, and: *"Unlike previous
  results using operational techniques, our bisimulation proof follows straightforwardly by structural
  induction and elementary rewriting via an equational theory of combinators for control-flow graphs."*
  Note "termination-sensitive" — the divergence-observability of §1.4 point 2 is what buys that.

**Paid** (the honest column; the library states its own axioms in `README.md` "Axioms" and
`theories\Axioms.v`):

- **UIP** is required for the inversion lemma `eutt eq (Vis e k1) (Vis e k2) -> forall x, eutt eq (k1 x) (k2 x)`.
  There is an axiom-free heterogeneous-equality variant `eqit_inv_Vis_weak`, and the README notes
  the tutorial compiler proof is in fact axiom-free.
- **Functional extensionality** for the closed-category-of-functions instance
  (`Basics.FunctionFacts.CartesianClosed_Fun`).
- **Excluded middle and a type-theoretic axiom of choice** in `itree-extra`'s trace theory
  (`extra\ITrace\`) — needed "to decide whether an itree diverges" — and inherited by the Dijkstra
  monads (`extra\Dijkstra\`).
- **An exported but unused axiom** `bisimulation_is_eq : t1 ≅ t2 -> t1 = t2`
  (`theories\Eq\EqAxiom.v`). The README is explicit that the library does not itself depend on it.
  Flag this one: it says strong bisimilarity *may be postulated* to be propositional equality, but
  is not provably so.
- **The `Tau` tax.** `Tau`s are semantically inert but syntactically present; the entire `eutt`
  apparatus exists to quotient them away, and every proof pays attention to them. This is precisely
  the friction that the choice-tree / `ctree` follow-on work (§2) set out to reduce.

---

## 2. The ecosystem: who uses ITrees, and for what

### 2.1 The coinduction substrate underneath

ITrees do not stand alone; they sit on **`paco`** (Hur, Neis, Dreyer, Vafeiadis, *The power of parameterization
in coinductive proof*, POPL 2013, DOI [10.1145/2429069.2429093](https://doi.org/10.1145/2429069.2429093);
library at [snu-sf/paco](https://github.com/snu-sf/paco)) — a hard dependency, declared in
`coq-itree.opam` and `README.md`. `paco`'s contribution is `pcofix`, which replaces Coq's primitive
`cofix` and its syntactic guardedness check with a parameterized greatest fixed point, making
coinductive proof *incremental and compositional* rather than all-or-nothing.

**`gpaco`** — Zakowski, He, Hur, Zdancewic, *An Equational Theory for Weak Bisimulation via Generalized
Parameterized Coinduction*, CPP 2020, [arXiv:2001.02659](https://arxiv.org/abs/2001.02659) — is the
refinement that made `eutt` practical. The key move is distinguishing knowledge that is **already
unlocked** (usable now) from knowledge that is **guarded** (must be unlocked first). That distinction
is what makes the "up-to" closures work, and hence what makes `rewrite`-style equational reasoning
under a coinductive hypothesis possible at all. The `eqitC` / `eqit_trans_clo` / `eqitC_wcompat`
machinery in `theories\Eq\Eqit.v:360-450` is this paper cashed out in the library.

Worth naming plainly: **the ergonomics of ITrees are a `gpaco` result, not an ITree result.** Weak
bisimulation is not transitive-by-construction in a way Coq accepts naively; the up-to-transitivity
closure is what recovers `reflexivity`/`rewrite`/`symmetry` as usable tactics.

### 2.2 Flagship users

| Project | What it does with ITrees | Citation |
|---|---|---|
| **Vellvm** (Verified LLVM) | Formal semantics for a large sequential subset of LLVM IR, built as a *stack of handlers*, with an extracted executable reference interpreter proved to refine the semantic model. Replaced the prior relational operational semantics. Nondeterminism forced an extension of the `eutt` theory. | Zakowski, Beck, Yoon, Zaichuk, Zaliva, Zdancewic, *Modular, compositional, and executable formal semantics for LLVM IR*, ICFP 2021, PACMPL 5(ICFP), DOI [10.1145/3473572](https://doi.org/10.1145/3473572); repo [vellvm/vellvm](https://github.com/vellvm/vellvm); experience report Beck et al., NFM 2025, DOI [10.1007/978-3-031-93706-4_6](https://doi.org/10.1007/978-3-031-93706-4_6) |
| **DeepWeb** (DeepSpec networked server) | Specified a C HTTP/1.1 key-value server as an ITree, verified the C against it with VST, *and* random-tested the spec with QuickChick. The spec is simultaneously a proof target and a test oracle. | Koh, Li, Li, Xia, Beringer, Honoré, Mansky, Pierce, Zdancewic, *From C to Interaction Trees: Specifying, Verifying, and Testing a Networked Server*, CPP 2019, [arXiv:1811.11911](https://arxiv.org/abs/1811.11911) |
| **HTTP KV server + VST** | Follow-on connecting ITree specifications to Verified Software Toolchain program logic. | Zhang et al., *Verifying an HTTP Key-Value Server with Interaction Trees and VST*, ITP 2021, LIPIcs vol. 193, paper 32 |
| **Model-based testing** | ITree specs as generators/oracles for testing networked applications. | Li, Pierce, Zdancewic, *Model-Based Testing of Networked Applications*, [arXiv:2102.00378](https://arxiv.org/abs/2102.00378) |
| **Jasmin compiler** | New *denotational* semantics for Jasmin based on ITrees; **equivalence up-to-tau is used as the notion of compiler correctness**, and this modularity lets them separate compiler correctness from probabilistic semantics. Result: 25 of 30 front-end passes shown to preserve cryptographic security, in Rocq. | *The Jasmin Compiler Preserves Cryptographic Security*, [arXiv:2511.11292](https://arxiv.org/abs/2511.11292) (Nov 2025) |
| **Verified samplers** | ITrees as the target for extracting sampling procedures from discrete probabilistic programs with loops and conditioning. | Bagnall et al., *Formally Verified Samplers From Probabilistic Programs With Loops and Conditioning*, [arXiv:2211.06747](https://arxiv.org/abs/2211.06747) |
| **RISC-V ITree semantics** | ITree semantics for RISC-V explicitly designed as **the contract between compiler verification and hardware verification**, using ITree bisimulation/refinement to span abstraction levels; validated by an extracted simulator run against standard RISC-V test suites. In Rocq. | Kan & Ertel, *Interaction Tree Semantics for RISC-V: Bridging Compiler and Hardware Verification*, [arXiv:2605.04933](https://arxiv.org/abs/2605.04933) (May 2026) |
| **Xia's dissertation** | The consolidating document: codifying the core theory as a reusable library, plus a termination-sensitive Imp→Asm compiler correctness proof done *equationally*, plus a concurrent-objects framework combining linearizability and strict serializability. | Li-yao Xia, *Executable Denotational Semantics with Interaction Trees*, PhD dissertation, University of Pennsylvania, 2022 (advisor B. C. Pierce); ISBN 979-8-3514-3449-0; ACM [10.5555/AAI29257237](https://dl.acm.org/doi/book/10.5555/AAI29257237); PDF at [poisson.chat/thesis.pdf](https://poisson.chat/thesis.pdf) (**note:** that URL returned HTTP 404 on fetch during this sweep — search engines index it but it did not resolve; the UPenn ScholarlyCommons landing page returned HTTP 403. Dissertation content below is from secondary description, not from reading it. Flagged as **unverified-by-direct-read**.) |

The pattern across these is consistent and is the real headline: **ITrees are the thing you write the
contract in when two different verification communities have to agree on a meaning.** Compiler↔hardware
(RISC-V), C-implementation↔spec↔tests (DeepWeb), IR semantics↔reference interpreter (Vellvm),
crypto-security↔compiler-passes (Jasmin). In each case the ITree is the shared, executable, quotientable
middle object.

### 2.3 The follow-on family

**Choice Trees (`ctrees`)** — Chappe, He, Henrio, Zakowski, Zdancewic, *Choice Trees: Representing
Nondeterministic, Recursive, and Impure Programs in Coq*, POPL 2023, PACMPL 7(POPL),
DOI [10.1145/3571254](https://doi.org/10.1145/3571254), [arXiv:2211.06863](https://arxiv.org/abs/2211.06863);
journal version in JFP (Rocq). Diagnosis: ITrees model nondeterminism only by *pushing it into a
handler*, which is awkward for concurrency. CTrees add **two distinct nondeterministic branching
nodes** alongside external events. The apparent redundancy is the point: it supports a shallow
embedding of CCS-style internal choice *while* recovering an inductive LTS view of the computation.
Case studies: CCS and cooperative multithreading.

**Guarded Interaction Trees (`gitrees`)** — Frumin, Timany, Birkedal, *Modular Denotational Semantics
for Effects with Guarded Interaction Trees*, POPL 2024, DOI [10.1145/3632854](https://doi.org/10.1145/3632854),
[arXiv:2307.08514](https://arxiv.org/abs/2307.08514). A different diagnosis: ITrees are first-order
in their events, so **higher-order** effects don't fit. GITrees are defined *inside Iris* (guarded type
theory), so recursive domain equations can be solved, giving higher-order computations with
higher-order effects — plus a separation logic to reason about them. Demonstrated on a PCF-like
language with soundness and computational adequacy, and on type soundness of **cross-language
interaction**. Extended by Stepanenko, Nardino, Frumin, Timany, Birkedal, *Context-Dependent Effects
in Guarded Interaction Trees*, ESOP 2025, DOI [10.1007/978-3-031-91121-7_12](https://doi.org/10.1007/978-3-031-91121-7_12)
(call/cc, shift/reset), and [arXiv:2512.11577](https://arxiv.org/abs/2512.11577) (adds concurrency).

**Isabelle/HOL ITrees** — Foster, Hur, Woodcock, *Formally Verified Simulations of State-Rich Processes
using Interaction Trees in Isabelle/HOL*, CONCUR 2021, [arXiv:2105.05133](https://arxiv.org/abs/2105.05133).
Ports the idea to a *different logic entirely*, gives ITree semantics to **CSP and Circus**, and
formally connects the ITree model to the classical **failures–divergences** semantics. Uses Isabelle's
code generator to emit verified executable simulations. This is the strongest evidence that the ITree
construction is not Coq-specific.

**Also in the neighborhood:** `itree-extra` in the clone itself carries the ITrace theory
(`extra\ITrace\`), Dijkstra monads for ITrees (`extra\Dijkstra\`, incl. `ITreeDijkstra.v`,
`StateSpecT.v`), and a **secure-information-flow** equivalence family (`extra\Secure\` — `SecureEqHalt.v`,
`SecureEqProgInsens.v`, etc.), i.e. noninterference stated as a *variant bisimulation*. Note this
pattern: a security property becomes another member of the equivalence menagerie.

### 2.4 Lean 4: reported honestly

**There is no mature Lean 4 ITree library.** The blocking fact is structural: **Lean 4 has no native
coinductive types.** Everything found is a workaround. Three data points, all verified directly:

| Artifact | Status as observed |
|---|---|
| [boogie-org/lean-itrees](https://github.com/boogie-org/lean-itrees) — "A Lean implementation of Interaction Trees" | Apache-2.0, 17 stars, **26 KB**, 4 commits. Created 2025-01-10, **last pushed 2025-01-13** — three days of activity, dormant since. Builds coinduction on the **QpfTypes** library rather than native support. Its own README "Next Up" lists three open blockers: **lack of universe polymorphism prevents implementing `interp`**, coinductive theorems missing, quotient-structure assumptions unresolved. Verdict: an abandoned spike, not a library. Note the blocked item is `interp` — i.e. exactly the interpreter machinery of §1.3, the part that makes ITrees useful. |
| **HITrees** — Fadaei Ayyam & Sammler, *HITrees: Higher-Order Interaction Trees*, [arXiv:2510.14558](https://arxiv.org/abs/2510.14558) (Oct 2025) | The serious Lean 4 entry, and it is **a redesign, not a port**. Abstract: *"the first variant of interaction trees to support higher-order effects in a non-guarded type theory."* Sidesteps coinduction by making the tree an **inductive** type (`HITree.Raw`, constructors `pure` / `impure` / `unreachable`), using two techniques: shaping effects so fixpoints are expressible as ordinary inductive types, and **defunctionalizing** higher-order outputs into abstract identifiers plus a separate "invoke" operation. Reasoning is via a **big-step relation `t ⇓ v`** rather than a bisimulation menagerie. Ships effects for state, nondeterminism, concurrency, recursion, call/cc, demonic choice, failure; case study is a λ-calculus with parallel composition and call/cc. |
| [hxrts/paco-lean](https://github.com/hxrts/paco-lean) — "Parameterized Coinduction in Lean" | Apache-2.0, **1 star**, 320 KB, 57 commits. Created **2026-01-07**, last pushed 2026-01-16. Includes a `Paco.Compat` module of Coq-paco naming aliases, gpaco with guards, up-to techniques, companion construction, and eight docs. Substantial in *structure*, but brand-new, single-author, one star, and **no evidence of external use or review was found**. Treat as unvetted. |

The honest summary: **if you want ITrees in Lean 4 today, the prior art is one dormant 26 KB spike, one
unvetted six-week-old coinduction library, and one 2025 research paper that deliberately abandons the
coinductive formulation in favor of an inductive one with a big-step relation.** HITrees is the design
worth reading, precisely because its authors hit the Lean coinduction wall and chose to route around it
rather than through it.

---

## 3. The identity question: can you hash a semantic object?

The setup: an ITree is a semantic object whose intended equality is **not** structural equality but
`eutt` (weak bisimulation). Content addressing wants a function `identity : Object -> Digest` such that
`identity a = identity b` iff `a ≡ b` for the intended `≡`. So: is there prior art on canonicalizing or
hashing objects quotiented by bisimulation?

The answer has a sharp shape. **Yes for finite-state, no in general, and the literature on content
addressing has quietly and consistently chosen syntax-identity.** Details below.

### 3.1 The finite-state case: canonical forms exist and are cheap

For finite systems, bisimulation minimization is not just decidable but near-linear:

- **Kanellakis–Smolka** and then **Paige–Tarjan** (*Three partition refinement algorithms*, SIAM J.
  Comput. 16(6), 1987, DOI [10.1137/0216062](https://doi.org/10.1137/0216062)) give the classic
  **O(m log n)** partition-refinement algorithm for coarsest stable partition, i.e. maximal
  bisimulation, where `n` = states and `m` = transitions.
- **DFA minimization** (Hopcroft) is the cleanest instance: the minimal DFA for a regular language is
  **unique up to isomorphism**, so it is a genuine canonical form — and therefore hashable. Same for
  bottom-up deterministic tree automata, which have a unique canonical minimal representative.
- **Coalgebraic partition refinement** — Dorsch, Milius, Schröder, Wißmann, *Efficient Coalgebraic
  Partition Refinement*, [arXiv:1705.08362](https://arxiv.org/abs/1705.08362), and the follow-on
  *Coalgebra Encoding for Efficient Minimization*, [arXiv:2102.12842](https://arxiv.org/abs/2102.12842) —
  generalizes Paige–Tarjan to coalgebras of an arbitrary (suitably presented) functor, in O(m log n).

That last one is the directly relevant result, because **`itree` is literally defined as the final
coalgebra of `itreeF`** (`theories\Core\ITreeDefinition.v:28-29`). So the generic theory of "minimize a
coalgebra by partition refinement" is exactly the theory that would apply — *if the coalgebra were
finite*.

Note also what minimization buys conceptually: partition refinement computes the quotient by the
largest bisimulation, and for a deterministic system the quotient has a canonical representative. That
is precisely the "canonicalize then hash" recipe. The whole question is whether the quotient is
computable and whether representatives are unique.

### 3.2 Where the line falls: the decidability boundary

Moving up the expressiveness ladder, bisimilarity checking degrades fast:

| System class | Strong bisimilarity | Notes |
|---|---|---|
| Finite LTS | Decidable, O(m log n) | Paige–Tarjan; canonical minimal form |
| Pushdown / BPA / context-free processes | **Decidable** (Sénizergues 1998) | But **Ackermann-complete**: non-elementary lower bound (2013), Ackermann upper bound (Jančar & Schmitz), Ackermann-hardness closing the gap (Zhang, ICALP 2020, DOI [10.4230/LIPIcs.ICALP.2020.141](https://doi.org/10.4230/LIPIcs.ICALP.2020.141)). Decidable in the same sense that Ackermann is computable. |
| Petri nets | **Undecidable** (Jančar) | *Undecidability of bisimilarity for Petri nets and some related problems*, TCS 148(2), 1995 |
| Petri nets, **weak** bisimilarity | **Highly undecidable** | At least level ω of the hyperarithmetical hierarchy |
| Lossy channel systems | Undecidable | Schnoebelen et al. |

Two observations worth carrying forward:

1. **Weak bisimulation is consistently harder than strong.** The Petri-net row is the dramatic case:
   strong is merely undecidable, weak is *hyperarithmetically* undecidable. Since `eutt` is the weak
   one — the equality ITree users actually want — this is the unfavorable direction.
2. **Even the decidable non-finite case is Ackermann-complete**, which is not an engineering budget.

### 3.3 Why ITrees specifically resist canonicalization

Beyond the general boundary, the concrete obstruction in the clone is immediate. Look at the `Vis`
node (`ITreeDefinition.v:33`):

```coq
| VisF {X : Type} (e : E X) (k : X -> itree)
```

The continuation `k` is **an arbitrary Coq function** from **an arbitrary type `X : Type`**. So:

- The branching factor is the cardinality of `X`, which may be infinite (`nat`, `Z`, a function type).
  An ITree is in general an **infinitely-branching, infinitely-deep** object.
- `k` is a function, not data. There is no finite syntactic presentation of it to hash. Two `eutt`-equal
  trees may be built from functions with no computational relationship whatsoever.
- Consequently `eutt` on general ITrees is not merely undecidable-in-practice — there is nothing
  finite to run an algorithm on. The library's own theory reflects this: equality is a `paco2`
  coinductive **predicate in `Prop`**, discharged by *proof*, never by *decision procedure*. There is
  no `eutt_dec` in the tree, and there could not be.
- The library's axiom posture confirms the direction of travel: deciding whether an ITree diverges
  requires **excluded middle** (README "Axioms"; `extra\ITrace\`). Divergence-detection is classical,
  not computational.

There is one suggestive item in the clone worth flagging, though: `theories\Eq\EqAxiom.v` exports
`bisimulation_is_eq : t1 ≅ t2 -> t1 = t2`. That is an *axiom* asserting that **strong** bisimilarity
may be identified with propositional equality. It is postulated, not proved, and the library does not
depend on it. Read as commentary: the community's considered position is that strong bisimilarity is
*morally* identity, but making that official requires an axiom — and no analogous axiom is offered for
`eutt`.

### 3.4 The one real bridge: bisimulation collapse as canonicalization

There *is* a literature where "minimize by bisimulation, then treat the result as the identity" is done
for programming-language objects, and it is the most directly transferable prior art found:

- **Hash consing** (Filliâtre & Conchon, *Type-Safe Modular Hash-Consing*, ML Workshop 2006, DOI
  [10.1145/1159876.1159880](https://doi.org/10.1145/1159876.1159880)). Structurally identical immutable
  terms are forced to share one representative, canonicalizing terms into a **maximally shared DAG** and
  making structural equality a pointer comparison. This is content addressing for finite terms, in
  memory. There is a one-to-one correspondence between a tree and its maximally shared representation.
- **Maximal sharing for cyclic terms** — Grabmayer & Rochel, *Maximal Sharing in the Lambda Calculus
  with letrec*, ICFP 2014, [arXiv:1401.1460](https://arxiv.org/abs/1401.1460); with
  *Term Graph Representations for Cyclic Lambda-Terms*, [arXiv:1308.1034](https://arxiv.org/abs/1308.1034).
  This is the interesting one: they compute maximal sharing for λ-terms **with letrec** — i.e. cyclic,
  potentially-infinite-unfolding objects — and the method is *literally* **bisimulation collapse** of
  term graphs, using standard bisimilarity-checking machinery. Maximally shared representatives are
  proved to exist.

The pattern: **bisimulation collapse is a viable canonicalization procedure exactly when the infinite
object has a finite cyclic presentation** (a *regular* / *rational* object). letrec-λ-terms qualify.
General ITrees do not. This is the sharp line.

### 3.4b The closest hit found: a hash that *is* a bisimulation-equivalence hash

The single most on-point piece of prior art located in this sweep, and it answers the mission's
question almost literally:

**Blaauwbroek, Olšák, Geuvers**, *Hashing Modulo Context-Sensitive α-Equivalence*, PACMPL 8(PLDI),
2024, DOI [10.1145/3656459](https://doi.org/10.1145/3656459).
Local copy: `C:\Users\kokok\Dev\foldlab\.reference\papers\blaauwbroek-olsak-geuvers-2024-hashing-modulo-context-sensitive-alpha.pdf`
(33 pp.; **note:** this file was already present in the papers directory at the time of this sweep and
was not downloaded by me — provenance unknown, treat the local copy accordingly).

Read directly from the paper's own first page, the load-bearing sentences:

- *"We show that this equivalence coincides exactly with the notion of **bisimulation equivalence**."*
  They interpret λ-terms as graphs; context-sensitive α-equivalence **is** bisimilarity on those graphs.
- *"we present an efficient **O(n log n)** runtime hashing scheme that identifies λ-terms modulo
  context-sensitive α-equivalence, **generalizing over traditional bisimulation partitioning
  algorithms**"* — i.e. it is explicitly a generalization of Paige–Tarjan-style partition refinement,
  and it **improves on** Maziarz et al.'s O(n log² n).
- The correctness statement is an **iff**: *"sub-terms receive the same hash if and only if they are
  context-sensitive α-equivalent."* Sound *and* complete — no collisions across classes, no splits
  within one.
- Application, and this is the part that should interest the lab: they used it to build *"a large-scale,
  densely packed, interconnected graph of mathematical knowledge from the **Coq proof assistant**"* —
  i.e. they content-addressed an entire proof-assistant library modulo a bisimulation equivalence, at
  scale, for de-duplication and structure sharing.

So the honest answer to "is there prior art on hashing objects quotiented by bisimulation?" is:
**yes, and it is recent, efficient, complete, and already applied to a proof assistant's whole
library.** The essential caveat that keeps it consistent with §3.2–3.3: the objects hashed are
**finite syntax trees** (λ-terms with contexts), and bisimilarity there is a *finite graph*
bisimilarity — squarely inside the decidable, near-linear regime. It is bisimulation-modulo-hashing on
finite presentations, not on general coinductive semantic objects. But it demonstrates the recipe
works and is practical exactly where the object has a finite presentation.

### 3.5 Where content-addressing systems actually draw the line

The load-bearing finding for the lab. Every production content-addressing system surveyed identifies
artifacts by **syntax modulo a cheap, decidable, structural quotient** — never by semantics.

| System | What is hashed | Quotient taken | Explicitly NOT quotiented by |
|---|---|---|---|
| **Unison** | SHA3-512 of the term/type AST structure | **names erased** (hashes "depend only on the structure of the code, not on the actual names used"), i.e. α-equivalence via de Bruijn-style indexing | semantics. Two definitions that do the same thing by different syntax get **different hashes**. Documented behavior, not a bug: [unison-lang.org/docs/language-reference/hashes](https://www.unison-lang.org/docs/language-reference/hashes/) |
| **Git / Merkle DAGs / IPLD** | bytes | none (byte identity) | everything else |
| **Nix** | store paths | *input*-addressed by default; **content-addressed derivations** (the "intensional model", experimental) hash actual output content | build-process semantics. Dolstra, *The Purely Functional Software Deployment Model*, PhD thesis, Utrecht, 2006 |
| **Hash consing** | term structure | structural sharing / maximal DAG | β-equivalence, semantic equality |

And where the field *has* pushed past raw syntax, it pushed exactly one notch — to α-equivalence — and
it was hard enough to be a PLDI paper:

- **Maziarz, Ellis, Lawrence, Fitzgibbon, Peyton Jones**, *Hashing Modulo Alpha-Equivalence*, PLDI 2021,
  DOI [10.1145/3453483.3454088](https://doi.org/10.1145/3453483.3454088),
  [arXiv:2105.02856](https://arxiv.org/abs/2105.02856). Identifies **all** equivalence classes of
  subexpressions respecting α-equivalence, in **O(n (log n)²)** — where no prior technique beat O(n²).
  The trick is delightfully specific: use a **weak (commutative) hash combiner at exactly one point**
  in the construction.
- **Hashing Modulo Context-Sensitive α-Equivalence**, PLDI 2024,
  DOI [10.1145/3656459](https://doi.org/10.1145/3656459) — the follow-on, extending to
  context-sensitivity.

The synthesis, stated as the finding: **the literature's line between syntax-identity and
semantics-identity for content addressing sits at "quotients that are structural, decidable, and
computable in near-linear time."** α-equivalence is just barely on the good side and took real work to
get there. β-equivalence, observational equivalence, and bisimulation-on-general-coinductives are all
on the far side. No surveyed system content-addresses by semantic equivalence, and the decidability
results in §3.2 explain why none could.

---

## 4. Cross-language emission: what exists for "artifact + proof-about-it travel together"

Surveying this honestly turns up **three separate traditions that solve adjacent problems and do not
talk to each other.**

### 4.1 The logical tradition: proofs about compiled artifacts

| Approach | Mechanism | Key property |
|---|---|---|
| **Proof-carrying code** (Necula, POPL 1997, DOI [10.1145/263699.263712](https://doi.org/10.1145/263699.263712)) | Producer ships code **plus a formal proof** that it meets a safety policy; consumer runs a small proof checker | **The producer need not be trusted, and the compiler need not be verified.** Trust reduces to the proof checker |
| **Certifying compiler** (Necula & Lee, PLDI 1998) | Compiler emits `(code, certificate)` pairs | Independently checkable evidence per compilation |
| **Translation validation** (Pnueli, Siegel, Singerman, TACAS 1998; Necula, PLDI 2000, DOI [10.1145/349299.349314](https://doi.org/10.1145/349299.349314)) | Validate **each individual compilation run** rather than the compiler | *"By focusing on specific transformations, translation validation avoids undecidability."* Compare IR before/after each pass |
| **Certificate translation** (Barthe & Kunz) | Transform a *source-level* certificate into a certificate for the *compiled* code | Proof obligations survive compilation |
| **CompCert** (Leroy) | Whole compiler verified once, in Coq | Semantic preservation as a composed simulation |

The key sentence to keep is Necula's on translation validation: **validating one run sidesteps the
undecidability that validating the general transformation would incur.** That is a per-artifact,
per-instance discipline — exactly the shape of a certificate attached to a specific object.

### 4.2 The identity tradition: content addressing and supply-chain attestation

| System | What it establishes |
|---|---|
| **SWHID** — SoftWare Hash IDentifier, now **ISO/IEC 18670:2025** (adopted 2025-04-23) | An **intrinsic** identifier: *"its core identifier is intrinsic: it can be computed from the object itself, without having to rely on any third party."* Covers files, trees, commits. Spec: [swhid.org](https://www.swhid.org/specification/v1.0/0.Introduction/) |
| **Git / Merkle DAG / IPLD** | Byte-identity, chained by hash |
| **in-toto attestation** (ITE-6) | A three-part statement: **statement type** (kind of claim) + **subject** (the artifact, by digest) + **predicate** (the claim itself). Carried in a **DSSE** envelope |
| **SLSA provenance** | The opinionated predicate: builder identity, source repo + commit SHA, build parameters, invocation ID, dependency digests, output artifact digest |
| **Sigstore / cosign / Rekor** | Keyless signing via OIDC identity; signatures recorded in a public **transparency log** |
| **Nix** | Input-addressed by default; content-addressed ("intensional model") derivations experimental. Dolstra, *The Purely Functional Software Deployment Model*, PhD thesis, Utrecht, 2006 |

The structural observation: **in-toto's `subject` is a content address and its `predicate` is an
arbitrary claim.** The envelope is already generic over what is being asserted. What is asserted in
practice is *provenance* — who built this, from what inputs, on what machine — and it is believed
because a **trusted signer** signed it. Verification is signature-checking, not proof-checking.

### 4.3 The cryptographic tradition: proofs that compose along a chain

**Proof-Carrying Data (PCD)** — Chiesa & Tromer, ICS 2010; Bitansky, Canetti, Chiesa, Tromer,
*Recursive Composition and Bootstrapping for SNARKs and Proof-Carrying Data*, STOC 2013,
DOI [10.1145/2488608.2488623](https://doi.org/10.1145/2488608.2488623),
[eprint 2012/095](https://eprint.iacr.org/2012/095); later
*Proof-Carrying Data from Accumulation Schemes* (Bünz, Chiesa et al., TCC 2020).

PCD is the only surveyed construction where **a proof about the entire history travels along a chain
of computation steps**, each node producing a succinct proof that the whole prefix was well-formed,
via recursive proof composition. Closely tied to **incrementally verifiable computation**.

The mismatch: PCD proves *"this computation trace was executed correctly"* — a statement about
faithful execution — not *"this artifact has semantic property P"*. And its proofs are cryptographic
arguments, not proof-assistant terms.

### 4.4 The gap, stated carefully

Across the three traditions, **the combination is not occupied by anything found in this sweep**:

- The logical tradition produces machine-checkable proofs about artifacts, but the artifacts are **not
  content-addressed** and the certificates are **not chained** — a PCC certificate is for one binary,
  consumed once, then discarded.
- The identity tradition content-addresses artifacts and chains them, but the travelling claim is
  **provenance believed on signature**, not a property **proved and re-checkable offline**.
- PCD chains proofs, but about **execution traces**, cryptographically.

Stated as an observation with its limits: I found no system where a **content-addressed artifact
carries a machine-checkable proof of a semantic or syntactic property about itself, such that the
proof composes along the hash chain.** The nearest neighbours are GitHub artifact attestations and
SLSA, which have the right *envelope* and the wrong *payload*. **This is a negative result from a
bounded search, not a proof of absence** — a targeted search for exactly this combination returned
only supply-chain provenance tooling and the PCC Wikipedia page.

One bridging observation that matters for §5: **Jourdan–Pottier–Leroy's verified parser is
translation validation applied to a *parser generator*.** Menhir emits an automaton; a Coq-proved
validator checks the automaton against the grammar. That is precisely "a tool in language A emits an
artifact, and a separately-checkable certificate accompanies it." The pattern already exists; it is
simply not wired to content addressing.

---

## 5. The "sidecar" idea: certificates about syntactic/grammar properties

Prior art here is genuinely strong — verified parsing is one of the better-developed corners of
mechanized PL.

### 5.1 Verified parsers and lexers

| Artifact | What is proved | Citation |
|---|---|---|
| **Menhir `--coq` / CompCert C parser** | A **validator**, proved correct in Coq, checks that a grammar and an LR(1) automaton **agree**. Applied to a C99 parser in CompCert. Shipped in Menhir's standard release. Honest cost note from the authors: the verified parser ran **~5× slower**, raising total compile time ~20%. | Jourdan, Pottier, Leroy, *Validating LR(1) Parsers*, ESOP 2012, DOI [10.1007/978-3-642-28869-2_20](https://doi.org/10.1007/978-3-642-28869-2_20) |
| **Verified LL(1) parser generator** | Given grammar `G`, produces an LL(1) parser **if one exists**; generator and generated parsers proved **sound and complete**, and proved to **terminate on all inputs without a fuel parameter** | Lasser, Casinghino, Fisher, Roux, ITP 2019, DOI [10.4230/LIPIcs.ITP.2019.24](https://doi.org/10.4230/LIPIcs.ITP.2019.24) |
| **CoStar** | Verified **ALL(\*)** parser in Coq — handles a much wider grammar class | Lasser, Casinghino, Fisher, Roux, *CoStar: A Verified ALL(\*) Parser*, PLDI 2021, DOI [10.1145/3453483.3454053](https://doi.org/10.1145/3453483.3454053); repo [slasser/CoStar](https://github.com/slasser/CoStar). Extended with semantic actions and dynamic input validation, DOI [10.1007/978-3-031-33170-1_25](https://doi.org/10.1007/978-3-031-33170-1_25) |
| **Verbatim / Verbatim++** | Verified **lexer** generator via Brzozowski derivatives; `++` adds semantic actions and optimizations reaching effectively linear performance on a JSON benchmark | Egolf, Lasser, Fisher, *Verbatim*, IEEE SPW 2021, DOI [10.1109/SPW53761.2021.00022](https://doi.org/10.1109/SPW53761.2021.00022); *Verbatim++*, CPP 2022, DOI [10.1145/3497775.3503694](https://doi.org/10.1145/3497775.3503694) |
| **Coqlex** | Generating formally verified lexers | [arXiv:2306.12411](https://arxiv.org/abs/2306.12411) |
| **TRX** | Formally verified parser interpreter for PEGs | [arXiv:1105.2576](https://arxiv.org/abs/1105.2576) |

**The generalizable pattern — and the most transferable idea in this whole section:**
Jourdan–Pottier–Leroy do *not* verify Menhir. They let an untrusted, fast, mature tool emit the
artifact, and verify a **small independent validator** that checks the artifact against the
specification. Trust collapses onto the validator. This is the sidecar architecture in its mature
form, and it is battle-tested in a production compiler.

### 5.2 Canonical-form / formatter proofs: reported as largely absent

Searching for **"formatter idempotence as a theorem"** — `fmt(fmt(x)) = fmt(x)` proved — found
**no formal-methods result**. What surfaced instead:

- Practitioner evidence that real formatters **violate** it: google-java-format issue
  [#614](https://github.com/google/google-java-format/issues/614) reports formatting *"not be
  idempotent and requiring multiple rounds of formatting before stabilizing"*; Langium discussion
  [#1469](https://github.com/eclipse-langium/langium/discussions/1469) titled "Formatter not
  idempotent". `gofmt` is culturally canonical but I found no proof of its idempotence.
- Generic algebraic work on idempotence *rule formats* in SOS (Aceto et al., *Rule formats for
  determinism and idempotence*, Sci. Comput. Program.) — about operators in process algebra, not
  formatters.

Adjacent and stronger — the **round-trip** property rather than idempotence:

- **Biparsers** — Xia, Zakowski, et al. lineage; *Biparsers: Exact Printing for Data Synchronisation*,
  PACMPL 2024, DOI [10.1145/3704910](https://doi.org/10.1145/3704910). Combinators with **verified
  round-trip properties**, composed so larger biparsers inherit round-tripping **by construction**.
  Complete Agda proof available. (Note the ITree-community overlap in authorship.)
- **Danielsson**, *Correct-by-Construction Pretty-Printing*, in Agda — pretty-printers indexed by the
  grammar so that correctness is structural.
- **PrettyExpressive** — *A Pretty Expressive Printer*, [arXiv:2310.01530](https://arxiv.org/abs/2310.01530);
  its **validity and optimality** were verified in **Lean**.

So: round-tripping (`parse ∘ print = id`) has real verified prior art; **idempotence of a canonical
formatter appears to be folklore rather than theorem.** That is a genuine, small, open gap — and
notably, it is a *decidable, finite, syntactic* property, i.e. exactly the kind that §3.5 says
content addressing can actually consume.

---

## 6. Exploration hooks for a content-addressed hash-chain lab

**Everything in this section is SPECULATION.** These are conjectures and design provocations
generated by the reading above, not findings, not claims, and not verified. Each is tagged with what
would have to be true for it to survive.

### Hook A — SPECULATION: the identity layer should hash *presentations*, not *denotations*

The strongest ground-truth result from §3 is that content addressing consistently quotients by
**structural, decidable, near-linear** equivalences, and that semantic equivalence is undecidable
almost immediately above finite state. Read as design pressure: an identity layer should hash a
**finite syntactic presentation** of a program, and treat its ITree-style denotation as a *derived*
object that identity does **not** attempt to canonicalize.

*What would have to be true:* nothing new — this is the conservative reading. The interesting part is
what it forbids: any scheme promising "two programs with the same meaning get the same hash" is
promising something the literature says is impossible in general.

### Hook B — SPECULATION: the `eutt` quotient is the wrong thing to hash, but the right thing to *certify*

Since `eutt` cannot be decided, it cannot be a hash function. But it **can** be a *proof obligation*.
Speculatively: an artifact could carry the digest of its syntax **plus** a certificate that
`denote(A) ≈ denote(B)` for a named `B` — i.e. identity stays syntactic while *equivalence* becomes a
separately-checkable, chained claim. This is exactly the shape §4.4 found unoccupied: content-addressed
subject, machine-checkable predicate.

*What would have to be true:* a proof-checking step must be cheap enough to be a gate, and the
equivalence statement must be expressible over two named digests. Note Jasmin (§2.2) already uses
**equivalence up-to-tau as its notion of compiler correctness** — so "the certificate is a `eutt`
proof between two artifacts" is not fantasy; it is what a production crypto compiler proof does. It
simply is not content-addressed.

### Hook C — SPECULATION: Blaauwbroek et al. is the template, and it is nearly a drop-in

§3.4b is the closest existing thing to "hash a bisimulation-equivalence class," it is **O(n log n)**,
its correctness is an **iff**, and it was applied to **the whole Coq library** to build an
interconnected knowledge graph. If the lab's objects are finite syntax with binders — which
programs-as-source are — then this is not an analogy, it is a usable algorithm.

*What would have to be true:* the lab's identity quotient would need to be expressible as graph
bisimilarity on a finite presentation. Worth checking whether Unison's name-erasing hash and
context-sensitive α-equivalence agree, disagree, or are incomparable — that is a concrete,
answerable question and I did **not** answer it here.

### Hook D — SPECULATION: the validator pattern is the cross-language emission story

§5.1's Jourdan–Pottier–Leroy architecture generalizes cleanly and is the most credible route to "other
languages emit artifacts into a hash chain": let an untrusted emitter in **any** language produce
`(artifact, certificate)`; verify only a **small checker**. The emitter never needs to be trusted,
verified, or even written in the same language. Combined with §4.2's in-toto envelope — whose
`subject` is already a digest and whose `predicate` is already arbitrary — the wiring is:

> `subject` = content address of the artifact; `predicate` = a machine-checkable certificate of a
> **decidable syntactic/grammar property**; verification = run the small checker, not trust a signature.

*What would have to be true:* the property must be decidable and cheaply checkable (§3.5's line), and
the checker must be small enough to be the trust base. Grammar conformance, well-formedness, and
canonical-form membership all qualify. Semantic equivalence does not.

### Hook E — SPECULATION: `fmt` idempotence is a tractable first theorem

§5.2 found idempotence of canonical formatters to be folklore, empirically violated in production
formatters, and unproved in the literature I searched. It is **finite, decidable, syntactic** — the
good side of §3.5's line — and it is exactly the precondition a hash chain needs, because
**canonical form is what makes syntactic hashing stable under reformatting.** A theorem
`fmt(fmt(x)) = fmt(x)`, plus `parse(fmt(x)) = parse(x)`, is precisely the pair that licenses "hash the
formatted bytes."

*What would have to be true:* a formatter small enough to verify. Worth noting this is a rare
combination — a real open gap, low ambient difficulty, and directly load-bearing for content
addressing. If the lab wants a first provable sidecar property, this is the strongest candidate the
sweep surfaced.

### Hook F — SPECULATION: divergence is observable, and that may be a feature

`eutt` deliberately admits only **finitely many** `Tau` insertions, so `spin ≉ Ret r` (§1.4). Any
identity/refinement story built on ITrees inherits **divergence-preservation for free** — Xia's
compiler correctness is termination-*sensitive* for this reason. Speculatively, if the lab ever wants
"this optimization did not silently turn a terminating program into a diverging one" as a chained
claim, the ITree equivalence family already has the right granularity, and `euttge` (`≳`, one-sided)
is already the shape of a *refinement* rather than an equivalence claim.

### Hook G — SPECULATION and a caution: Lean is the weak link

§2.4 is the uncomfortable finding for a Lean-based wager. Lean 4 has **no native coinductive types**;
the one ITree port is a dormant 26 KB spike whose README says `interp` is **not implementable** there;
the one serious Lean design (**HITrees**) responds by abandoning coinduction for an **inductive** type
plus a **big-step relation**. If ITree-style denotational machinery were wanted in Lean, HITrees'
design — not a port of the Coq library — is the honest starting point, and the equivalence menagerie
of §1.4 would not come along with it.

*What would have to be true to avoid this:* either the identity layer never needs coinductive
denotations in Lean (see Hook A, which suggests it need not), or paco-lean matures and is
independently reviewed. As of this sweep paco-lean has **1 star and six weeks of history**.

---

## 7. Source ledger

### 7.1 Local PDFs fetched during this sweep

All saved to `C:\Users\kokok\Dev\foldlab\.reference\papers\`. Naming follows the existing
`author-year-slug.pdf` convention (first author only where the author list exceeds three).

| File | Work | Identifier | Direct PDF |
|---|---|---|---|
| `xia-2020-interaction-trees.pdf` | Xia et al., *Interaction Trees* (POPL 2020) — preprint | [arXiv:1906.00046](https://arxiv.org/abs/1906.00046); DOI [10.1145/3371119](https://doi.org/10.1145/3371119) | https://arxiv.org/pdf/1906.00046 |
| `xia-2020-interaction-trees-popl-published.pdf` | same, published version | DOI [10.1145/3371119](https://doi.org/10.1145/3371119) | https://www.cis.upenn.edu/~stevez/papers/XZHH+20.pdf |
| `chappe-2023-choice-trees.pdf` | Chappe, He, Henrio, Zakowski, Zdancewic, *Choice Trees* (POPL 2023) | [arXiv:2211.06863](https://arxiv.org/abs/2211.06863); DOI [10.1145/3571254](https://doi.org/10.1145/3571254) | https://arxiv.org/pdf/2211.06863 |
| `frumin-timany-birkedal-2024-guarded-interaction-trees.pdf` | *Modular Denotational Semantics for Effects with Guarded Interaction Trees* (POPL 2024) | [arXiv:2307.08514](https://arxiv.org/abs/2307.08514); DOI [10.1145/3632854](https://doi.org/10.1145/3632854) | https://arxiv.org/pdf/2307.08514 |
| `zakowski-2020-gpaco-weak-bisimulation.pdf` | Zakowski, He, Hur, Zdancewic, *An Equational Theory for Weak Bisimulation via Generalized Parameterized Coinduction* (CPP 2020) | [arXiv:2001.02659](https://arxiv.org/abs/2001.02659) | https://arxiv.org/pdf/2001.02659 |
| `koh-2019-from-c-to-interaction-trees.pdf` | Koh et al., *From C to Interaction Trees* (CPP 2019) | [arXiv:1811.11911](https://arxiv.org/abs/1811.11911) | https://arxiv.org/pdf/1811.11911 |
| `zhang-2021-http-kv-server-itrees-vst.pdf` | Zhang et al., *Verifying an HTTP Key-Value Server with Interaction Trees and VST* (ITP 2021) | DOI [10.4230/LIPIcs.ITP.2021.32](https://doi.org/10.4230/LIPIcs.ITP.2021.32) | https://drops.dagstuhl.de/storage/00lipics/lipics-vol193-itp2021/LIPIcs.ITP.2021.32/LIPIcs.ITP.2021.32.pdf |
| `foster-hur-woodcock-2021-interaction-trees-isabelle.pdf` | Foster, Hur, Woodcock, *Formally Verified Simulations of State-Rich Processes using Interaction Trees in Isabelle/HOL* (CONCUR 2021) | [arXiv:2105.05133](https://arxiv.org/abs/2105.05133) | https://arxiv.org/pdf/2105.05133 |
| `kan-ertel-2026-interaction-tree-riscv.pdf` | Kan & Ertel (Barkhausen Institut), *Interaction Tree Semantics for RISC-V* | [arXiv:2605.04933](https://arxiv.org/abs/2605.04933) | https://arxiv.org/pdf/2605.04933 |
| `fadaei-sammler-2025-hitrees.pdf` | Fadaei Ayyam & Sammler (ISTA), *HITrees: Higher-Order Interaction Trees* | [arXiv:2510.14558](https://arxiv.org/abs/2510.14558) | https://arxiv.org/pdf/2510.14558 |
| `zakowski-2021-llvm-ir-semantics.pdf` | Zakowski, Beck, Yoon, Zaichuk, Zaliva, Zdancewic, *Modular, compositional, and executable formal semantics for LLVM IR* (ICFP 2021) | DOI [10.1145/3473572](https://doi.org/10.1145/3473572); HAL [hal-03525711](https://hal.science/hal-03525711/) | https://hal.science/hal-03525711/document |
| `beck-2025-vellvm-formalizing-informal-llvm.pdf` | Beck et al., *Vellvm: Formalizing the Informal LLVM* (NFM 2025) | DOI [10.1007/978-3-031-93706-4_6](https://doi.org/10.1007/978-3-031-93706-4_6) | https://www.cis.upenn.edu/~stevez/papers/nfm25.pdf |
| `arranz-olmos-2025-kem-ind-cca-preserving-compilation-jasmin.pdf` | Arranz-Olmos, Barthe, Blatter, Grégoire, Laporte, Torrini, *KEM-IND-CCA-Preserving Compilation of Jasmin's ML-KEM* | [arXiv:2511.11292](https://arxiv.org/abs/2511.11292) | https://arxiv.org/pdf/2511.11292 |
| `maziarz-2021-hashing-modulo-alpha-equivalence.pdf` | Maziarz, Ellis, Lawrence, Fitzgibbon, Peyton Jones, *Hashing Modulo Alpha-Equivalence* (PLDI 2021) | [arXiv:2105.02856](https://arxiv.org/abs/2105.02856); DOI [10.1145/3453483.3454088](https://doi.org/10.1145/3453483.3454088) | https://arxiv.org/pdf/2105.02856 |
| `dorsch-2017-coalgebraic-partition-refinement.pdf` | Dorsch, Milius, Schröder, Wißmann, *Efficient Coalgebraic Partition Refinement* | [arXiv:1705.08362](https://arxiv.org/abs/1705.08362) | https://arxiv.org/pdf/1705.08362 |
| `grabmayer-rochel-2014-maximal-sharing-letrec.pdf` | Grabmayer & Rochel, *Maximal Sharing in the Lambda Calculus with letrec* (ICFP 2014) | [arXiv:1401.1460](https://arxiv.org/abs/1401.1460) | https://arxiv.org/pdf/1401.1460 |
| `jourdan-pottier-leroy-2012-validating-lr1-parsers.pdf` | Jourdan, Pottier, Leroy, *Validating LR(1) Parsers* (ESOP 2012) | DOI [10.1007/978-3-642-28869-2_20](https://doi.org/10.1007/978-3-642-28869-2_20) | https://xavierleroy.org/publi/validated-parser.pdf |
| `lasser-casinghino-fisher-roux-2019-verified-ll1-parser-generator.pdf` | Lasser, Casinghino, Fisher, Roux, *A Verified LL(1) Parser Generator* (ITP 2019) | DOI [10.4230/LIPIcs.ITP.2019.24](https://doi.org/10.4230/LIPIcs.ITP.2019.24) | https://drops.dagstuhl.de/storage/00lipics/lipics-vol141-itp2019/LIPIcs.ITP.2019.24/LIPIcs.ITP.2019.24.pdf |
| `necula-2000-translation-validation.pdf` | Necula, *Translation Validation for an Optimizing Compiler* (PLDI 2000) | DOI [10.1145/349299.349314](https://doi.org/10.1145/349299.349314) | https://people.eecs.berkeley.edu/~necula/Papers/tv_pldi00.pdf |

### 7.2 Already present in `papers/` — not fetched by this sweep

| File | Note |
|---|---|
| `blaauwbroek-olsak-geuvers-2024-hashing-modulo-context-sensitive-alpha.pdf` | *Hashing Modulo Context-Sensitive α-Equivalence*, PACMPL 8(PLDI) 2024, DOI [10.1145/3656459](https://doi.org/10.1145/3656459). **Load-bearing for §3.4b.** Present before/independently of this sweep; provenance unverified by me |
| `16146_Tree_Based_Premise_Selec.pdf` | *Tree-Based Premise Selection for Lean4* (Wang, Dong, Wen). Unrelated to this mission; noted only because it appeared in the directory |
| `dunfield-krishnaswami-2013-bidirectional.pdf`, `lindley-mcbride-mclaughlin-2016-frank.pdf` | Pre-existing Unison-lineage pins, already in `REFERENCES.md` |

### 7.3 To fetch manually (retrieval failed or paywalled)

| Work | Identifier | Why it failed / where to look |
|---|---|---|
| **Xia, *Executable Denotational Semantics with Interaction Trees*, PhD dissertation, UPenn 2022** — the mission's priority item | ISBN 979-8-3514-3449-0; ACM [10.5555/AAI29257237](https://dl.acm.org/doi/book/10.5555/AAI29257237) | `https://poisson.chat/thesis.pdf` returns a **live 404** (Caddy server responds; file removed — confirmed by both WebFetch and `curl -I`). UPenn ScholarlyCommons landing page returns **403**. ProQuest openview link returns an **HTML landing page, not a PDF**. Try: ProQuest institutional access; UPenn ScholarlyCommons via browser; or email the author (now at Laboratoire Méthodes Formelles) |
| Lasser et al., *CoStar: A Verified ALL(\*) Parser* | DOI [10.1145/3453483.3454053](https://doi.org/10.1145/3453483.3454053) | ACM DL; check `tupl.cs.tufts.edu` author page |
| Egolf, Lasser, Fisher, *Verbatim++* | DOI [10.1145/3497775.3503694](https://doi.org/10.1145/3497775.3503694) | ACM DL |
| Paige & Tarjan, *Three Partition Refinement Algorithms* | DOI [10.1137/0216062](https://doi.org/10.1137/0216062) | SIAM, paywalled |
| Jančar, *Undecidability of bisimilarity for Petri nets and some related problems*, TCS 148(2) 1995 | DOI [10.1016/0304-3975(95)00037-4](https://doi.org/10.1016/0304-3975(95)00037-4) | Elsevier |
| Zhang, *Bisimulation Equivalence of Pushdown Automata Is Ackermann-Complete* (ICALP 2020) | DOI [10.4230/LIPIcs.ICALP.2020.141](https://doi.org/10.4230/LIPIcs.ICALP.2020.141) | Dagstuhl — open access, simply not fetched this pass |
| Necula, *Proof-Carrying Code* (POPL 1997) | DOI [10.1145/263699.263712](https://doi.org/10.1145/263699.263712) | ACM DL |
| Bitansky, Canetti, Chiesa, Tromer, *Recursive Composition and Bootstrapping for SNARKs and PCD* (STOC 2013) | DOI [10.1145/2488608.2488623](https://doi.org/10.1145/2488608.2488623); [eprint 2012/095](https://eprint.iacr.org/2012/095) | IACR eprint is open — not fetched this pass |
| Filliâtre & Conchon, *Type-Safe Modular Hash-Consing* (ML 2006) | DOI [10.1145/1159876.1159880](https://doi.org/10.1145/1159876.1159880) | ACM DL |
| *Biparsers: Exact Printing for Data Synchronisation* | DOI [10.1145/3704910](https://doi.org/10.1145/3704910) | ACM DL |
| Dolstra, *The Purely Functional Software Deployment Model* (PhD thesis, Utrecht 2006) | — | edolstra.github.io |
| SWHID spec / ISO/IEC 18670:2025 | ISO/IEC 18670:2025 | Spec text open at [swhid.org](https://www.swhid.org/specification/v1.0/0.Introduction/); ISO document paywalled |

### 7.4 Catalog action not taken

`REFERENCES.md` was **not modified**. Per the ledger's own rules only the provenance source lock may
promote a candidate to a project pin, and this is exploration-grade material. Recording here instead:
the ITrees clone (HEAD `68b3568d3f0f48c057192c58c8db88ef4412747a`) and the 19 PDFs in §7.1 are
**unpinned** and carry no digests in `sources.lock.json`.
