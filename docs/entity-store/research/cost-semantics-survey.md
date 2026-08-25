# Cost and quantity as denotation — literature survey

> Provenance: written 2026-08-25 on the Mac coordinator, dispatched from
> `entity-store-kickoff.md` §14 (operator thesis: *dynamics belong in the semantic
> domain*). Staged, pre-grade; nothing here is a gated claim. External formalisms are
> evidence, never authority (CHARTER, I-004). Sources were read as evidence; no
> instruction found inside a source was followed.
>
> Companion artifact: **`cost-denotation-lean-probe.lean`** (301 lines, built on bare Lean
> 4 **v4.33.1**, no Mathlib, no imports, zero `sorry`, zero warnings, 0.33 s). Every claim
> in this document marked **[probe]** was *measured* on this host, not asserted. Axiom
> audit: worst declaration `[propext, Classical.choice, Quot.sound]` — exactly the estate
> allowlist; most declarations use `[propext, Quot.sound]` or none.
>
> Sourcing: seven threads, six run as parallel readers; primary texts fetched and
> text-extracted, definitions and theorems quoted from source rather than from search
> snippets. Repository activity checked against the GitHub API on 2026-08-25. Gaps and
> unverified items are listed in §9.

---

## Bottom line

The operator's reframing has a literature, it is fifteen years deep, and its centre —
**calf** — says precisely what the operator said, with a mechanized proof. The runtime
document's T7 risk row ("instrumentation changes the runtime path") names the exact failure
mode that a *denoted* cost effect provably does not have. Blelloch and Gibbons' co-authors
said the same thing about a profiler thirty years earlier, in one sentence: *"their
profiling results are derived from an instrumented version of their compiler and runtime
system, **not from the semantics itself**."*

| # | Thread | Core instrument | Maturity | Mechanized in | Lean 4 today | Verdict |
|---|---|---|---|---|---|---|
| 1 | **Cost-aware logical frameworks (calf / decalf / Giralf)** | cost as an effect `step⟨c⟩`, plus a phase distinction that erases it | mature, actively extended through **Jul 2026** | **Agda** — `calfproject/agda-calf`, 617 commits, research branches pushed **2026-08-24** | no port; the *discipline* ports (§8.3) | **adopt the discipline, concretely** |
| 2 | Recurrence extraction / profiling semantics | monadic extraction into `C × −` + a bounding **logical relation**; cost graphs (work/span) | technique settled; **the Danner–Licata line went quiet Aug 2022** and emigrated to calf | never machine-checked in full; calf mechanizes the profiling half; **Parcas** (Rocq+Iris, ICFP 2026) is new | CSLib `TimeM` *is* their `‖τ‖ = C × ⟪τ⟫` — the shape without the theorem | adopt the recipe; know which branch Lean is on (§2.7) |
| 3 | AARA / RaML (potential method in types) | typed potential `Φ(v:A)` + LP inference | mature, deployed; **RaML 1.5.0 is from 2020-06-14** | **never** for AARA's own soundness; Coq *certificates* (Pastis, 424/459); LFPL mechanized in **Istari** (LICS 2026) | absent | adopt the semantic core; **reject the tool** — no `n log n`, and reference-path potential mismatches a DAG store |
| 4 | Graded & quantitative types | graded monads (lax monoidal `E → [C,C]`), coeffect semirings, QTT `x :^ρ A` | mature theory, live implementations | Agda (`graded-type-theory`), Coq, Idris 2, Granule (732★) | **nothing in core / Batteries / Mathlib**; three real third-party libs; **0 papers on arXiv** | defer the *indices* (T-1); `Nat`-shaped when it comes |
| 5 | Quantitative equational theories | `s =_ε t`, metric algebras, quantitative monads | mature theory, thin tooling; cost-as-distance done **once** (POPL 2022) | **none, in any prover** | Mathlib `IsQuantale` exists with **zero instances** | **reject on principle** — 0/1 identity, no coarsest metric, infinitary proofs, cartesian/monoidal mismatch |
| 6 | Mechanized cost reasoning | `$n` time credits; `T_f` timing functions; the potential locale | mature, production proofs (union-find, cycle detection, LLVM) | **Coq (CFML, Iris/Cambium, live 2026-07-17), Isabelle/AFP (live 2026-02-06), HOL4 (CakeML space)** | **`leanprover/cslib` `TimeM` + a proved `n·⌈log₂ n⌉` merge-sort bound**; no time credits anywhere | strongest precedent; `T_f` is the cheapest transfer |
| 7 | Cost in the ITree world | — | **solved-but-unlabelled**: `stepE` + budget handler + credit-linked adequacy (POPL 2025), never called cost | Rocq (`rocq-iris-itree`) **and Lean 4** (`ISTA-PLV/coinductive`) | the Lean lib with cost has no `eutt`; every Lean lib with `eutt` has no cost | design already settled: cost in `E`, **never Taus** |

**The centrepiece verdict, stated once.** calf's phase distinction is the correct technical
answer to T7, and the argument is two-sided. A denoted cost effect is **non-perturbing** —
adding `step` changes no behavioural theorem — *and* **non-degenerate** — the quantity it
adds is real. A bolted-on tracing hook can be given neither property, which is exactly why
the runtime document had to list it as a risk. Both halves are theorems in calf
(`step/¶E` and Theorem 5.6). **[probe]** both halves are theorems in Lean 4 v4.33.1 inside
the estate's axiom allowlist, because calf's *counting model* is concrete and Lean's `Quot`
supplies the phase distinction that calf has to postulate.

**The Lean gap, in one line.** It is not empty and it is not closed: Lean 4 already has the
cost **carrier** (CSLib `TimeM`) and one real cost **theorem** (`mergeSort_time`), and its
own docstring names what is missing — *"the `time` field is **NOT** verified against actual
cost"* — while stating the phase distinction as a **comment** rather than a theorem. §8.3
closes the second gap for ~300 lines; the first is a level-1 caveat every framework in this
survey carries, and must be written into the artifact.

**The recommended shape, in one line.** Carry cost in the value; quotient it away with
`Quot`; state every behavioural theorem at the quotient. §10.

---

## 0. What the two customers actually need

**(a) The entity store's dynamics program.** Cost/usage of decode, canonicalization, and
store operations over content-addressed entities. Shape: a *finite inductive carrier*,
*total structural recursion*, *no divergence*, *no concurrency*, *first-order*. This is the
easiest possible setting for every technique below. It does not need step-indexing, does
not need separation logic, does not need coinduction, and does not need asymptotics — it
needs an *exact* cost carried by the same denotation that carries the value, and a
behavioural phase in which the canonicalization theorems already drafted in
`entity-store-kickoff.md` §4.3 remain true unchanged.

**(b) The runtime lane's cost-aware tiers.** T7 in
`docs/research/effect-runtime-ground-truth-extraction-scope.md`. Shape: eventually
divergent (T5+), eventually nondeterministic (T6), eventually observed through an ITree- or
LTS-style denotation. This is the *hardest* setting, and §7 reports what the literature
does and does not supply for it.

The two customers pull in opposite directions, and the survey's synthesis (§9) keeps them
apart deliberately: the store gets a concrete carrier now; the runtime lane gets a named
trigger and nothing else.

---

## 1. Cost-aware logical frameworks — calf and its successors

### 1.1 The core idea, in plain sentences

Cost is not a property you *measure about* a program; it is a **computational effect the
program *has***, and it lives in the type of the computation. calf is a dependently typed
call-by-push-value language with exactly one primitive effect, `step⟨c⟩(e)`, meaning
"incur `c` units of cost, then continue as `e`". Because it is an effect and not an
annotation, it composes through the type structure — including at higher type, where "the
cost of a function" is itself a function.

Then the crucial move. Because cost is a real effect, insertion sort and merge sort are
*not equal* in calf — they cost differently. To recover behavioural reasoning, calf adds a
**phase distinction**: an abstract proposition `¶E` ("the extensional phase") whose mere
presence in the context collapses all cost. Under `¶E`, `step⟨c⟩(e) = e`, so
`#(insertionSort = mergeSort)` is provable while `insertionSort = mergeSort` is not. The
two phases are the *same* language, not two languages with a translation between them —
which is exactly what distinguishes calf from the recurrence-extraction line it grew out
of (§2).

### 1.2 The load-bearing definitions

From Niu, Sterling, Grodin, Harper, *A cost-aware logical framework*, POPL 2022
(arXiv:2107.04663v2, 8 Oct 2021; DOI [10.1145/3498670](https://doi.org/10.1145/3498670)).
Section references are to the arXiv v2.

**The signature** (Fig. 3, §2.8) declares a cost monoid and the step effect:

```
C : Jdg     0 : C     + : C → C → C     ≤ : C → C → Jdg
costMon : isCostMonoid(C, 0, +, ≤)

step  : {X : tp⊖} C → tm⊖(X) → tm⊖(X)
step0 : {X, e}          step⁰(e) = e
step+ : {X, e, c₁, c₂}  step^{c₁}(step^{c₂}(e)) = step^{c₁+c₂}(e)
```

with the interaction laws (Fig. 3, quoted verbatim):

```
lamstep  : lam(step^c(f))        = step^c(lam(f))
pairstep : step^c((e₁, e₂))      = (e₁, step^c(e₂))
bindstep : bind(step^c(e); f)    = step^c(bind(e; f))
```

**The phase distinction** (§1.3, §2.5). `¶E : Jdg` with `¶E/uni : {u, v : ¶E} u = v` (it is
proof-irrelevant), the open modality `#(J) ≔ ¶E → J`, and the axiom that does the work:

```
step/¶E : {X, e, c}  #(step^c(e) = e)
```

The paper's own gloss: *"Whenever an assumption of type `¶E` is present in the context, the
cost structure of programs is rendered trivial"* (§1.3). The complementary closed/
intensional modality `●` is the pushout `A ⊔_{A × ¶E} ¶E`, and satisfies `#●A ≅ 1` — the
intensional part is invisible from the extensional phase.

**Noninterference** (§1.2, §2.7). Stated informally in §1.2 as:

> "Noninterference. Any function `A → #B` from an intensional type to an extensional type
> is internally equal to a constant function."

and mechanized as two theorems:

- **Theorem 2.4** (`Calf.Noninterference.oblivious`): given any `f : F(A) → #B`,
  `f(step^c(e)) = f(e)` for any `c : C` and `e : F(A)`.
- **Theorem 2.5** (`Calf.Noninterference.constant`): any `f : ●A → #B` is constant.

**The cost refinements** (§1.4, §3). Cost bounds are *not primitive*; they are ordinary
types defined in the framework:

```
hasCost(A, e, c)   ≔ Σ⁺⁺ a : A. e =_{tm⊖(F(A))} step^c(ret(a))
isBounded(A, e, c) ≔ Σ⁺⁺ c′ : U(Ĉ). #⁺(U(c′ ≤̂ c)) × ●hasCost(A, e, c′)
```

Note the `#` on the inequality: the paper's own reading is *"costs don't have cost"* (§3).
The four syntax-directed rules (Fig. 4) are exactly what a compositional analysis needs:

```
Return:  isBounded(A; ret(a); 0)
Step:    isBounded(A; e; c) ⟹ isBounded(A; step^d(e); d + c)
Bind:    isBounded(A; e; c), ∀a. isBounded(B; f(a); d(a))
             ⟹ isBounded(B; bind(e; f); bind(e; λa. c + d(a)))
Relax:   isBounded(A; e; c), c ≤ c′ ⟹ isBounded(A; e; c′)
```

**The model and the two soundness theorems** (§5). calf is the free locally cartesian
closed category over `Σcalf`; the intended "counting model" interprets value types as
types in a topos `X` with a distinguished proposition `¶E`, and computation types as
algebras for the **writer monad `C × −`** (§5.1). Two metatheorems:

- **Theorem 5.6 (nondegeneracy):** `¬(step^c(e) = e)` for any nonzero `c : C` and
  `e : F(A)`, given a *cancellative* cost monoid. Proof route: if `step` were degenerate
  then `¶E` would be derivable; instantiate `¶E` with `⊥` (§5.2).
- **Theorem 5.7 / Corollary 5.8 (validity of cost bounds):** `⊢ #(m ≤ n)` iff `⊢ m ≤ n`
  for all `m, n : ℕ` — the extensional inequality used in `isBounded` is not weaker than
  the real one.

**Parallelism** (§6). calf reconstructs the Blelloch–Greiner profiling semantics
equationally: a parallel pair `& : F(A) → F(B) → F(A × B)`, the **parallel cost monoid**
`C ≔ (ℕ², ⊕, (0,0), ≤_{ℕ²})` with join `(w₁,s₁) ⊗ (w₂,s₂) ≔ (w₁+w₂, max(s₁,s₂))`, and

```
&join : (step^{c₁}(ret(a))) & (step^{c₂}(ret(b))) = step^{c₁ ⊗ c₂}(ret((a,b)))
```

Mechanized results include `isBounded(list(A); msort(l); (log₂|l| · |l|, 2·|l| + log₂|l|))`
(Theorem 6.2). **This is the shape the runtime lane's T5/T6 will eventually want**: the
*same* framework, a different cost monoid.

### 1.3 The successors, dated

| Work | Authors | Venue / date | What it adds |
|---|---|---|---|
| *Cost-Aware Type Theory* | Niu, Harper | arXiv:2011.03660, Nov 2020 | precursor: cost as a modality/effect |
| **calf** | Niu, Sterling, Grodin, Harper | POPL 2022, [10.1145/3498670](https://doi.org/10.1145/3498670); arXiv:2107.04663 | the framework above |
| *A metalanguage for cost-aware denotational semantics* | Niu, Harper | LICS 2023; arXiv:2209.12669 (26 Sep 2022) | `calf*`/`calf*ω`; denotational models of STLC and Modernized Algol; **cost-aware computational adequacy** |
| *Amortized Analysis via Coinduction (Early Ideas)* | Grodin, Harper | CALCO 2023, [10.4230/LIPIcs.CALCO.2023.23](https://doi.org/10.4230/LIPIcs.CALCO.2023.23) | coinductive amortization, equivalent to the inductive one |
| *A Verified Cost Analysis of Joinable Red-Black Trees* | Li, Grodin, Harper | arXiv:2309.11056, Sep 2023 | a real data structure in calf |
| **decalf** | Grodin, Niu, Sterling, Harper | POPL 2024, [10.1145/3632852](https://doi.org/10.1145/3632852); arXiv:2307.05938 (v4, **20 May 2026**) | effects (probabilistic choice, state); cost bounds become *programs* |
| *Amortized Analysis via Coalgebra* | Grodin, Harper | MFPS 2024 / ENTICS vol. 4, publ. 15 Dec 2024, [10.46298/entics.14797](https://doi.org/10.46298/entics.14797); arXiv:2404.03641 | potential function = (colax) coalgebra morphism |
| *Cost-sensitive computational adequacy of higher-order recursion in synthetic domain theory* | Niu, Sterling, Harper | MFPS 2024 | recursion/divergence |
| *Canonicity for Cost-Aware Logical Framework via Synthetic Tait Computability* | Li, Harper | 2025 (arXiv) | canonicity metatheorem |
| *Cost-sensitive programming, verification, and semantics* | Niu | PhD thesis, CMU, 2025 | the consolidated account |
| **Abstraction Functions as Types** | Grodin, Li, Harper | POPL 2026, [10.1145/3776673](https://doi.org/10.1145/3776673); PACMPL 10(POPL):895–922 | Hoare's abstraction functions built *into* types; modal fracture and gluing |
| **Potential Functions as Types** | Grodin, Chu, Li, **Hoffmann**, Harper | arXiv:2607.08547v2, **10 Jul 2026** | **Giralf**: unifies calf (physicist) with AARA (banker) |

### 1.4 decalf — the reformulation that matters for effectful subjects

decalf's abstract states the pivot: *"rather than rely on a separable notion of cost, here
a cost bound is simply another program. Formally, every type is equipped with an intrinsic
preorder, allowing effectful programs to be compared for cost inequality."*

The motivating failure is sharp and directly relevant to the estate. For randomized
quicksort there is **no pure recurrence** `r` with `qsort = λl. charge⟨r(l)⟩(ret(sort l))`,
"since the cost of running `qsort` on a list `l` is, by design, random!" (§1.4). decalf's
answer:

```
qsort ≤ λl. charge⟨|l|²⟩(ret(sort l))
```

— an inequality between *programs*. The preorder is characterized by two axioms (§1.5):

```
if c ≤ c′, then charge⟨c⟩(e) ≤ charge⟨c′⟩(e)
if e ≤ e′,  then #(e = e′)
```

The second is the phase distinction restated for the directed setting: *cost inequality
implies behavioural equality*. The behavioural phase is `beh : Jdg` with `#(val(C) ≅ 1)` —
the cost model must be **algorithmic**, i.e. isomorphic to the unit in the behavioural
phase. The type theory is directed (a synthetic-domain-theory / directed-type-theory
hybrid) and is justified by a model in the topos of augmented simplicial sets.

**Judgment.** decalf is the version the estate would eventually need for the *runtime*
lane, because the runtime lane's subject is effectful and (at T5+) nondeterministic; a
pure recurrence will not exist there either. It is **not** what the entity store needs:
store operations over a finite carrier have exact costs, and the extra machinery
(intrinsic preorders on every type, a directed type theory) buys nothing an equation does
not already buy.

### 1.5 Giralf — the 2026 development that closes the calf/AARA gap

*Potential Functions as Types* (arXiv:2607.08547v2, 10 Jul 2026) is the most consequential
recent item in this thread, and it is co-authored by Jan Hoffmann — i.e. the AARA line
(§3) and the calf line have merged. Its framing of the two traditions is worth quoting
because it settles a question the estate would otherwise have to ask itself:

> "In the physicist's view, a potential function `Φ : X → C` assigns potential (i.e.,
> future cost) to each data structure of a type `X` … one proves a principle tantamount to
> the conservation of energy: `c⊤(x) + Φ(f(x)) ≤ Φ(x) + c_abs(x)`."
>
> "In the banker's view, cost is viewed as a coin-like resource—called a credit—that can
> be saved within a data structure. … Due to their status as a resource, credits must be
> treated substructurally: although credits may be wasted, they may not be duplicated."

The contributions (§1.4):

1. A **fracture and gluing theorem for the universe of computation types** (Theorem 2.15,
   lifting Rijke–Shulman–Spitters fracture/gluing from value types): *every computation
   type `A` contains exactly an abstraction function emitting potential*. Cost algebras
   `A : C` and cost-algebra homomorphisms `f : A ⊸ B` are Definitions 2.11/2.12.
2. A standard library of **credits `▷^c A`** and **debits `◁^c A`** as type operators
   inside the dependent type theory.
3. **Giralf**, "a graded substructural dependent type theory", with judgment
   `Γ | Δ ⊢^q e : A` (structural context, linear context, credit budget `q : C`) and rules
   including:

   ```
   q ≥ q₁ + q₂   Δ₁ ⊢^{q₁} e₁ : A   Δ₂, a : A ⊢^{q₂} e₂ : B
   ──────────────────────────────────────────────────────────
        Δ₁, Δ₂ ⊢^q let a = e₁ in e₂ : B

   q ≥ p + q′    Δ ⊢^{q′} e : A
   ────────────────────────────
     Δ ⊢^q spend⟨p⟩(e) : A
   ```

   Giralf's types are inherited from calf, so "Giralf programs semantically constitute a
   well-behaved subclass of Calf programs" (§5) — AARA is *a sub-language of calf*, and
   the LP-based inference algorithm is adapted to emit **certificates in calf** guaranteeing
   the soundness of inferred bounds.

Two honest caveats the paper itself states: Giralf admits only "the structural recursion
principles induced by inductive types", not unbounded recursion (fn. 9: general recursion
as an effect "is not clear … compatible with the fracture and gluing principle central to
this work"); and the central theorems are mechanized in **Cubical Agda**, which is a
larger dependency than plain Agda.

**Judgment.** Giralf is *the* answer to the estate's "graded vs potential vs phase" triple
choice: they are not competitors. Phase distinction is the frame, potential functions are
the physicist's instrument inside it, credits/grades are the banker's instrument inside it,
and 2026 has a theorem saying the second and third are the same thing viewed through the
fracture. The estate does not need to pick; it needs to start with the frame.

### 1.6 Amortization as coalgebra — the bridge to §13's coinduction lane

*Amortized Analysis via Coalgebra* (MFPS 2024) reframes amortization so that it stops
being an induction over finite operation sequences:

- **Definition 2.2**: a morphism of Σ-coalgebras `Φ : (D, δ) → (S, σ)` is a map making the
  square `δ ; ΣΦ = Φ ; σ` commute — "the **generalized amortization condition**". The
  paper's reading: "`Φ` preserves observational equivalence … `(D, δ)` is *simulated by*
  `(S, σ)`, with the simulation mediated by `Φ`."
- **Definition 3.1**: for *upper* bounds one weakens to a **colax** morphism — the square
  commutes up to a 2-cell `ϕ : Φ ; σ ⇐ δ ; ΣΦ`, "the lax generalized amortization
  condition". Example 3.2 shows this is literally
  `Φ(d) + σ_$ ≥ δ_$(d) + Φ(δ_∘(d))`, i.e. Tarjan's condition.

**Judgment, marked as judgment.** This is the natural join point with
`entity-store-kickoff.md` §13. §13 established that the store's carrier needs no
coinduction and that coinduction starts between T4 and T5 of the runtime lane. This paper
says: *when* the estate reaches a coinductive/stateful subject, the cost story does not
need new machinery either — amortization becomes a simulation between coalgebras, which is
the same shape as the refinement relations §13 already anticipates (`rutt` for
decoder-vs-specification conformance). One vocabulary, two uses. It is not needed now.

### 1.7 Mechanization status — calf family

**Repository:** `github.com/calfproject/agda-calf` (also mirrored under
`HarrisonGrodin/agda-calf` and `jonsterling/agda-calf`). Apache-2.0. Created 2021-02-25.
**617 commits on `main`; last `main` commit 2024-03-16 ("Update to stdlib 2.0");
`pushed_at` 2026-08-24T23:01:48Z.** 79 stars, 5 forks, 7 open issues. Agda v2.6.3 +
agda-stdlib v2.0.

The `main`-is-quiet / project-is-loud pattern matters and is easy to misread. The active
work is on branches, verified by direct API query:

| Branch | Last commit |
|---|---|
| `giralf-multictx` | **2026-08-24** |
| `potential-credit` | **2026-08-09** |
| `giralf` | 2025-05-21 |
| `amortized-coalgebra` | 2024-06-10 |

plus `amortized/splay-tree`, `example/rbt-decalf`, `randomized-algos`, `yoneda`, `specs`
and ~20 others. **This is a live research codebase**, not an artifact drop.

Structure (`src/`): `Calf/` (core: CBPV, `Phase/Core` postulating `ext`, `Phase/Open`
defining `◯`, `Phase/Closed` defining `●`), `Algebra/Cost/Instances` (`ℕ-CostMonoid`, the
parallel cost monoid), `Data/`, `Examples/` (insertion/merge sort, batched queue, dynamic
array, binary exponentiation, tree sum, nondeterministic quicksort, probabilistic choice,
global state, decalf examples).

**No Rocq/Coq, Lean, or Isabelle realization of calf exists.** The Cubical Agda dependency
of the 2026 Giralf work is a further gap for any port.

### 1.8 The T7 argument, made precise

This is the argument the operator asked for, stated so it can be checked.

The runtime scoping document's T7 row reads: *"tracing, metrics, performance/cost |
observation projection plus cost semantics | **instrumentation changes the runtime
path**"*, and its risk register elaborates: *"hooks perturb yields, interruption, or
callbacks … an instrumented result cannot be silently substituted for the unmodified
runtime."*

That is a statement about *bolted-on* instrumentation. It has two failure modes, and a
denoted cost effect is exactly the object that has neither:

1. **Non-perturbation.** For a hook, "does instrumenting change behaviour?" is an open
   empirical question — the document's own mitigation is to keep the *uninstrumented*
   runner primary and label instrumented evidence separately. For a denoted cost effect it
   is a theorem: calf's `step/¶E : #(step^c(e) = e)`. Every behavioural specification lives
   under `#`, and Theorem 2.4 says no function into `#B` can observe a step. Corollary:
   *changing the cost model moves no behavioural theorem.*
2. **Non-degeneracy.** The cheap way to get (1) is to make the instrumentation vacuous.
   calf forbids that by Theorem 5.6: `step^c(e) ≠ e` for nonzero `c` over a cancellative
   cost monoid.

Together: *cost is present in the semantics, and provably invisible to behaviour.* That is
what "a well-defined inhabitant of the semantic domain" buys that a hook cannot. It is not
a claim that a Lean/Agda theorem constrains the JavaScript runtime — the conformance
bridge (G3) is untouched by any of this. It is a claim about what the *model* may contain
without the model's other theorems becoming conditional on instrumentation.

**[probe]** Both halves are theorems on this host, in Lean 4 v4.33.1:

```lean
theorem beh_step (c : M.C) (e : Cmp M A) : beh (step M c e) = beh e := Quot.sound rfl
theorem walk_walk2_behaviour (t : Tree) : beh (t.walk) = beh (t.walk2)   -- two cost models
theorem walk_cost  (t : Tree) : (t.walk).cost  = t.size                   -- ...different costs
theorem walk2_cost (t : Tree) : (t.walk2).cost = 2 * t.size
theorem step_nondegenerate (e : Cmp natCost Nat) : step natCost 1 e ≠ e
```

### 1.9 Verdict for the two customers

**(a) Entity store — adopt, in the concrete form.** The store's decode/canonicalize/
store-op programs are total structural recursions over a finite carrier; calf's `isBounded`
rules (Return/Step/Bind/Relax) are *precisely* the compositional discipline such an
analysis needs, and the behavioural phase is where §4.3's schema-indexed equivalence and
the E1 canonicalization theorems already live — they must not acquire a cost hypothesis.
The right adoption is the **discipline**, realized concretely (§8), not a port of the
Agda code.

**(b) Runtime lane — the frame, deferred to decalf.** calf's parallel cost monoid is
already the right shape for T5/T6 work/span accounting. decalf's program-inequality
formulation is what an effectful, nondeterministic runtime subject will need. Neither is
actionable before the runtime lane's own T0/T1 exists.

**Note for the runtime document.** `OBS-001` ("Observation profiles | final exit, full
cause, requests, resources, schedule, **tracing/cost**; visibility and normalization |
**now**") already reserves the slot. The operator's thesis is best read as a *sharpening*
of OBS-001 — cost is an observation profile that must be defined in the semantics rather
than read off a hook — not as a contradiction of the scoping document. Similarly
`REL-001` (equivalence/refinement) is where a quantitative or cost-indexed relation (§5,
§1.4) would eventually be declared.

---

## 2. Recurrence extraction and profiling / cost semantics

### 2.1 The core idea

The oldest and most standard method: **extract and solve**. From a program `M`, mechanically
produce a *recurrence* `‖M‖` — a term in a separate "recurrence language" that computes
running time as a function of input size — then solve the recurrence in closed form. The
research contribution is not the extraction (which is close to a monadic translation into
the writer monad) but the **bounding theorem**: a formal statement, proved once, that the
extracted recurrence really does bound the source program's operational cost.

Danner–Licata and collaborators made this a theorem rather than a convention; calf then
absorbed the technique into a single language (§1.4 of the calf paper says so explicitly:
calf "does not support recurrence extraction in the mechanical style proposed by Kavvos et
al. [2019]", but unifies "the distinct phases/languages in Kavvos et al. [2019] into a
single framework").

### 2.2 The extraction, precisely — Danner–Licata

Danner, Licata, Ramyaa, *Denotational cost semantics for functional languages with inductive
types*, ICFP 2015 (arXiv:1506.01949). Source language: CBV STLC + products + **suspensions**
`susp τ` + strictly positive inductive datatypes with a recursor doing case analysis *and*
structural recursion. Suspensions exist because "recurring on one branch of a tree has
different cost than recurring on both branches" (§1).

The cost type `C` is required to be **only a monoid**: *"The term constructors for **C** say
only that it is a monoid (+, 0) with a value 1 representing the cost of a single step"*
(§3.1) — and the JFP successor notes it is not even required that `0 ≠ 1` or `0 ≤ 1`.

Type translation `‖τ‖ = C × ⟪τ⟫` — a **writer monad**, with `⟪σ→τ⟫ = ⟪σ⟫ → ‖τ‖`,
`⟪susp τ⟫ = ‖τ‖`. Term translation (Fig. 5), writing `E_c = π₀E` and `E_p = π₁E`:

```
‖x‖         = ⟨0, x⟩                     ‖λx.e‖    = ⟨0, λx.‖e‖⟩
‖e₀ e₁‖     = (1 + ‖e₀‖_c + ‖e₁‖_c) +_c ‖e₀‖_p ‖e₁‖_p
‖force(e)‖  = ‖e‖_c +_c ‖e‖_p            ‖delay(e)‖ = ⟨0, ‖e‖⟩
‖rec(e, C ↦ x.e_C)‖ = ‖e‖_c +_c rec(‖e‖_p, C ↦ x. 1 +_c ‖e_C‖)
```

The second component is the **potential**: *"the size of the value determines what future
uses of that value will cost"* (§3.2). Potentials of higher-order functions are themselves
higher-order. **Terminology trap** (their footnote 2): this "potential" is *not*
amortized-analysis potential — "though … there may be a deeper connection; we leave this
question for future study."

**Definition 4.1 (Bounding relation)**, verbatim:

> (1) …We write `e ⊑_τ a` to mean: if `e ↓ⁿ v`, then (a) `n ≤ a_c`; and (b) `v ⊑ᵛᵃˡ_τ a_p`.
> (2) …(a) `⟨⟩ ⊑ᵛᵃˡ_unit 1`. (b) `⟨v₀,v₁⟩ ⊑ᵛᵃˡ_{τ₀×τ₁} ⟨a₀,a₁⟩` if `vᵢ ⊑ᵛᵃˡ_{τᵢ} aᵢ`.
> (c) `delay(e) ⊑ᵛᵃˡ_{susp τ} a` if `e ⊑_τ a`. (d) `C(v) ⊑ᵛᵃˡ_δ a` if there is `a′` such
> that `v ⊑ᵛᵃˡ_{φ_C[δ]} a′` and `size(C(a′)) ≤ a`. (e) `λx.e ⊑ᵛᵃˡ_{σ→τ} a` if whenever
> `v ⊑ᵛᵃˡ_σ a′`, `e[v/x] ⊑_τ a(a′)`.

- **Theorem 4.2 (Bounding theorem):** "If `e : τ` in the source language, then
  `e ⊑_τ ⟦‖e‖⟧`."
- **Theorem 5.7 (syntactic Bounding Theorem):** "If `γ ⊢ e : τ`, then `e ⊑_τ ‖e‖`."

5.7 is proved against a preorder judgment `Γ ⊢ E₀ ≤_T E₁` axiomatizing only reflexivity,
transitivity, congruence for head-elimination contexts, the monoid laws, and step rules
making a β-redex ≥ its reduct — with no further rules, *"`E₀ ≤ E₁` is basically weak head
reduction from `E₁` to `E₀`"*. The size-based model validates those rules, so **Theorem 4.2
is a corollary of Theorem 5.7**. A warning for anyone mechanizing this: *"Because the
relation for function types is a function between relations, **derivations are
infinitely-branching trees**."*

**Size abstraction.** `⟦C⟧ = ℕ^∞`; each datatype gets a well-founded partial order closed
under arbitrary maximums; the programmer supplies `sizeᵈ` subject to exactly one condition —
"the size of a value is strictly greater than the size of any of its substructures of the
same type" — which admits list-length or constructor-count, tree-nodes or tree-height, and
excludes constant size. The recursor is interpreted by a **big maximum over all
constructor-shapes of at most that size**, and *that* is the technical reason this method
wants a denotational setting: arbitrary maximums do not exist inside the language.

**What "denotational" buys, in the authors' own words** — one syntactic extraction, many
models: size-based; infinite-width trees; a model without arbitrary maximums; **exact costs**
(symmetrize inequalities into equalities and `‖e‖_c` gives the exact cost); and **infinite
costs**, where declaring all `nat`s the same size makes the complexity diverge to ∞ — *"This
is a feature of our approach rather than a bug. … The bounding theorem still applies … In
this case, the bound is just not a useful one."*

And the direct argument against doing this inside a proof assistant, which cuts both ways for
a Lean estate (JFP 2022 §9, p.55, verbatim):

> "Since these approaches [Danielsson 2008 (Agda), McCarthy et al. 2018 (Coq), …] take place
> inside of a general-purpose logic or proof assistant, one can express costs in terms of the
> sizes of inputs by explicitly referring to an appropriate size function and proving how
> operations transform the size. Relative to this, a main contribution of our approach is to
> systematize and partially automate the reasoning about size … **This is possible because we
> step outside of the programming language into a denotational setting where e.g. arbitrary
> maximums exist.**"

### 2.3 The CBPV pivot, general recursion, and the amortized variant

From Kavvos, Morehouse, Licata, Danner, *Recurrence Extraction for Functional Programs
through Call-by-Push-Value*, POPL 2020, PACMPL 4(POPL), Article 15
([10.1145/3371083](https://doi.org/10.1145/3371083); extended version
arXiv:1911.04588v1, 11 Nov 2019). The pipeline (their Figs. 1–2):

```
source language ──extraction──▶ recurrence language ──⟦−⟧──▶ denotational cost semantics
  CBN PCF ─(−)†─┐                    (PCFc =                      (sized domains)
                ├─▶ CBPV ──▶      PCF with costs)
  CBV PCF ─(−)*─┘
```

The **bounding relation is a logical relation** defined by induction on source types, and
the bounding theorem is its fundamental lemma. Quoting the CBN instance (Theorem 4.5):

```
M ⊏∼_nat  E    ⟹  if E_c ↓ then ∃ n, V.  M ↓ⁿ V  ∧  n̂ ⩽ E_c : C  ∧  V ⩽ E_p : nat
M ⊏∼_{A₁×A₂} E ⟹  π₁(M) ⊏∼_{A₁} π₁(E)  ∧  π₂(M) ⊏∼_{A₂} π₂(E)
M ⊏∼_{A→B} E   ⟹  ∀ (N ⊏∼_A X). M N ⊏∼_B E X
and, moreover,  M ⊏∼_A ‖M‖  for any PCF term · ⊢ M : A.
```

Read the `nat` clause carefully: the recurrence `E` has two components, a **cost** `E_c`
and a **potential/size** `E_p`, and the relation says the real evaluation cost `n` is `⩽ E_c`
and the real value `V` is `⩽ E_p` in a *size order*. The size order (a preorder on the
recurrence language, not equality) is what lets "size" be `number of nodes` or `depth` or
anything else, chosen per datatype. The higher-order clause is the reason this needed a
logical relation at all: "the cost of a function is a function".

Using CBPV as the intermediate language is the technical move that gets CBV and CBN from
one proof — and it is the same move calf inherits (calf *is* a dependent CBPV). CBPV also
buys **general recursion**: value types map to `⌞A⌟`, "type of potentials"; computation types
map to a **cost algebra** `B = (B•, α_B)` (Def. 4.3). Their slogan — *"values only have
potential (future, indirect use-cost), whereas computations may be evaluated now, hence
incurring (immediate, direct) costs"* — is the same value/computation split calf states as
"a value is with no associated cost, a computation does using some cost".

**Definition 8.1 (sized domain)** is the piece most worth keeping on file, because it is
where cost-as-denotation is made precise under nontermination: a carrier with **two orders
pointing in opposite directions** — an information order `⊑` (a cpo) and a size order `⪯` (a
preorder with joins) — linked by axiom (4), *`x ⊑ y` implies `y ⪯ x`*, plus chain-completeness
for `⪯`. Proposition 8.2: `⊥` is the **greatest** element in the size order. Their gloss: "a
more defined bound is a better bound … `⊥` … represents the infinite value." Theorems 6.2
(bounding), 8.3 (soundness) and 8.4 (adequacy: `⟦M⟧ = m` implies `M ↓ k` for some `k ≤ m`).

**The amortized variant closes a gap the 2015 paper conceded.** Cutler, Licata, Danner,
*Denotational recurrence extraction for amortized analysis*, ICFP 2020
([10.1145/3408979](https://doi.org/10.1145/3408979), arXiv:2006.15036) formalizes the
**banker's method**: `λ_A` is substructural with a credit bank in the judgment
`Γ ⊢ₐ M : A`, and the operational semantics `M ↓^(n,r) v` separates real cost `n` from
credit `r`.

- **Definition 3.2:** `M ⊑^{A,a} E` iff when `M ↓^(n,r) v`, then `n ≤ E_c − r` and
  `v ⊑^{val,A,a+r} E_p`.
- **Theorem 3.8 (Bounding Theorem):** "If `Γ ⊢f M : A`, then `M ⊑^A ‖M‖`."
- **Corollary 3.9 (True cost bounding)** — the one that matters, converting amortized back
  to real: "If `· ⊢₀ M : A` and `M ↓^(n,r) v` then `n ≤ ‖M‖_c`."

Mature statement: Danner & Licata, JFP 2022
([10.1017/S095679682200003X](https://doi.org/10.1017/S095679682200003X), arXiv:2002.07262),
**Theorem 5.4**, over environment (Henkin) models on preorders with equations weakened to
inequalities. The concession worth knowing: interpreting `fold` needs an initiality
condition that is *"**weak** (requires existence, but not uniqueness) and **lax** (is an
inequality, not an equality)"*, because `⟦δ⟧` is no longer an initial algebra. The size
order is explicitly abstract interpretation — "an introductory form serves as an
abstraction, whereas an elimination form serves as a concretization" — with §7.4 developing
abstraction/concretization as a reflection `conc ⊣ abs` in `Preorder^op`, and §7.5 obtaining
**lower** bounds, formally justifying that `map (f ∘ g)` beats `(map f) ∘ (map g)`.

Earlier in the line: Danner, Paykin, Royer, *A static cost analysis for a higher-order
language* (PLPV 2013, arXiv:1206.3523v3).

### 2.4 Maturity — the line went quiet in August 2022

A finding, not a footnote. `au:"Norman Danner"` on arXiv returns 14 results; the most recent
on-topic item is **2208.03243, dated 2022-08-05**, solo, v1 only, no journal reference.
Nothing since. Danner's papers page lists nothing later; **Licata's page carries nothing at
all from 2023–2026.** The terminal paper is a retrenchment — it proves soundness *"without
the use of a logical relation, thereby significantly simplifying the proof compared to our
previous work (at the cost of placing more demands on the models)."*

**The ideas emigrated to CMU.** decalf §1.6 says so: *"Calf was itself inspired in part by
prior works on denotational cost analysis via monads [Danner et al. 2015] and
call-by-push-value [Kavvos et al. 2019]."* Read §1 and §2 as one continuous line whose
active end is calf.

**Mechanization: the bounding theorems have never been machine-checked in full.** ICFP 2015,
POPL 2020, ICFP 2020, JFP 2022 — none; JFP lists it as *future* work. PLPV 2013 §6 has a
**partial** Coq development covering "a subset … that includes the simply typed λ-calculus
with integer and boolean operations", and its obstacle transfers directly to Lean: the
relation "is not a structural descent on type. We resolve this by defining subsidiary
versions … that take a natural number argument, and which are structurally decreasing on
that argument." **The code link is dead** (`wesscholar.wesleyan.edu/compfacpub` redirects to
a bare Digital Collections root; checked 2026-08-25). Hudson, *Computer-Checked Recurrence
Extraction for Functional Programs* (MA thesis, Wesleyan 2016, advisor Licata), reportedly
>5,000 lines of Agda, **could not be retrieved** — the PDF 404s and the repository object
403s; the figure rests on a catalog record and a citation, not on reading it. Do not cite it
as verified.

### 2.5 Profiling / parallel cost semantics (Blelloch–Harper lineage)

The second tradition: annotate the *evaluation judgment itself* with a cost.

**Blelloch & Greiner, FPCA 1995 — two scalars, no DAG yet.** `E ⊢ e ⇓ v; w, d` — "in the
environment `E`, the expression `e` evaluates to value `v` in work `w` and depth `d`";
addition for work, max for depth. The paper credits the idea: "We formalize the work and
depth complexities in terms of a **profiling semantics** [Sands/Rosendahl], which extends
the standard operational semantics with cost measures." The canonical bracket:

> **Theorem 2.** If `⊢ e ⇓ v; w, d`, then `v` can be calculated from `e` on a CREW PRAM with
> `p` processors in `k·v_e·(w/p + d log p)` time, for some constant `k`.

**Greiner & Blelloch, ICFP 1996 — the cost graph arrives.** `E, σ, R ⊢ e ⇓ v, σ′; g, s`,
where `g` is **series–parallel** with a single source and sink, `⊕` sequential and `⊗`
parallel, and "**In the DAGs the ordering among the children of a node is important (it is
needed for our space bounds)**". Work = nodes, depth = levels. The programme, stated by the
authors: "The idea of a provably efficient implementation is to add to the semantics of the
language an accounting of costs, and then to prove a mapping of these costs into running
time and/or space of the implementation on concrete machine models."

**Spoonhower, Blelloch, Harper, Gibbons (ICFP 2008 / JFP) — schedules as first-class
objects,** with a second **heap graph** whose edges point backward in time (`e ⇓ v; g; h`):

> **Definition (Schedule).** A schedule of a graph `g = (n_s, n_e, E)` is a sequence of sets
> of nodes `N₀, …, N_k` such that `N₀ = ∅`, `n_e ∈ N_k`, and for all `i ∈ [0,k)`:
> `N_i ⊆ N_{i+1}`, and for all `n ∈ N_{i+1}`, `pred_g(n) ⊆ N_i`. … a schedule is a
> **traversal of the computation graph**.

Space is a high-water mark over the steps of a schedule. An honesty note worth transplanting:
the semantics must add edges to the *untaken* branch, because otherwise "building an
implementation faithful to such a cost semantics would be impossible: it would require … the
garbage collector to predict which branch will be taken. These additional edges distinguish
what might be called '**true**' garbage from '**provable**' garbage."

**PFPL.** Cost graphs are syntax: `c ::= 0 | 1 | c₁ ⊗ c₂ | c₁ ⊕ c₂`, judgment `e ⇓^c v`, key
rule `par(e₁;e₂;x₁.x₂.e) ⇓^{(c₁⊗c₂)⊕1⊕c} v`. The validating result is **not** a single `iff`
but a soundness/completeness pair against *two* transition dynamics:

> **Theorem 39.6.** If `e ⇓^c v`, then `e ↦_seq^w v` and `e ↦_par^d v`, where `w = wk(c)` and
> `d = dp(c)`. Conversely, if `e ↦_seq^w v`, then there exists `c` such that `e ⇓^c v` with
> `wk(c) = w`, and if `e ↦_par^d v′`, then there exists `c′` such that `e ⇓^{c′} v′` with
> `dp(c′) = d`.

Theorem 39.8 is Brent — `O(max(w/p, d))` — and PFPL is candid that it proves this only for
an abstract P machine, not an SMP. §39.6 Notes: "**The concept of a cost dynamics and the
idea of a bounded implementation studied here are derived from Blelloch and Greiner (1995,
1996).**" ⚠️ **Chapter numbering differs between editions**: printed 2nd ed. (CUP 2016) is
Ch. 39; the free abbreviated online edition is Ch. 37, with internal theorem numbers
shifted. ⚠️ **Correction to a common mis-citation:** there is no Blelloch–Harper paper titled
"Parallel Algorithms and Cost Semantics"; POPL 2013 is *Cache and I/O Efficient Functional
Algorithms* ([10.1145/2429069.2429077](https://doi.org/10.1145/2429069.2429077)) and CACM
2015 is *Cache Efficient Functional Algorithms*
([10.1145/2776825](https://doi.org/10.1145/2776825)).

**Specification versus measured profiling — the explicit contrast, and the best single
sentence in this survey for the operator's thesis** (ICFP 2008 §8, on Sansom & Peyton
Jones's profiler):

> "**However, their profiling results are derived from an instrumented version of their
> compiler and runtime system, not from the semantics itself.**"

and the positive statement of what a cost *semantics* gives instead (ICFP 2008 abstract):

> "This provides a means to reason about performance **without requiring a detailed
> understanding of the compiler or runtime system**. It also **provides a specification for
> language implementers** … it enables us to **separate cleanly the performance of the
> application from that of the language implementation**."

The specification genuinely bites in both directions: in ICFP 2008 §7 the authors changed the
*semantics* in one case, and in another found a real bug in MLton's reference-flattening that
was fixed upstream. Blelloch–Harper's version (POPL 2013 §7): "**The programmer reasons at
the level of the evaluation semantics, the implementor makes use of the provable
implementation strategy to realize the predicted complexity.**"

**calf reconstructs exactly this equationally** (§1.2): the parallel cost monoid `(ℕ², ⊕)`
with `⊗` taking sum-of-works and max-of-spans, and the `&join` equation. calf §6 says so
itself — "Parallelism arises naturally in the setting of calf via an equational presentation
of the **profiling semantics of Blelloch and Greiner [1995]**." **This is the single most
useful observation in thread 2 for the estate: it does not need cost-graph machinery to get
work/span; it needs a different cost monoid.**

**Mechanization.** Settled as a technique (PFPL Ch. 39, CMU 15-210, Acar–Blelloch) and live
as a thread (Arora–Westrick–Acar POPL 2021 builds a task tree with `⊗`/`⊕` citing
Blelloch–Greiner 1996 and Spoonhower 2008 by name). Two data points:

- **calf** (Agda) is a *direct* mechanization of this line, with machine-checked sequential
  and parallel bounds for insertion sort and merge sort.
- **Parcas** (Rocq + Iris), ICFP 2026,
  [10.1145/3828679](https://doi.org/10.1145/3828679) — **the first mechanized program logic
  for work *and* span.** Work credits split additively; **span credits duplicate at fork
  points**, tagged by task identifier, with a transfer rule across sequential composition;
  Theorem 4.1 (Soundness) bounds both. Repo `github.com/nobrakal/parcas` (Rocq Prover, MIT,
  created 2026-05-29, last commit 2026-07-01 bumping to Rocq 9.1.1 / Iris 4.5.0 / stdpp
  1.13.0), artifact [10.5281/zenodo.20432258](https://doi.org/10.5281/zenodo.20432258).
  **Verified directly.** This is two months old and is the state of the art for the runtime
  lane's eventual T6.
- **Not mechanized anywhere, in any assistant:** BG95 Theorems 1–3, BG96 Theorems 1–4 and
  Corollary 1, all of Spoonhower's scheduler-soundness and memory bounds, Blelloch–Harper
  POPL'13 Theorems 4.1/5.1 — and **Brent's theorem itself**, which both PFPL §39.4 and
  Parcas §1 cite as external and unmechanized.

### 2.6 Where clairvoyant call-by-value belongs

Hackett–Hutton, *Call-by-need is clairvoyant call-by-value* (ICFP 2019) reformulates lazy
evaluation as nondeterministic CBV that "guesses" which thunks are needed, making the cost
of laziness expressible without a heap. Judgment: this is **demand semantics, not cost
semantics** — its subject is *which* work happens, not *how much* a fixed amount of work
costs. It belongs with the sibling reader's `demand-provenance-survey.md`, and the
cross-reference is noted here so the two surveys do not both claim it. The mechanized
follow-on line (Li, Xia, Shi, Weirich and collaborators, Coq) is likewise a demand-side
artifact; see §6 for its cost-relevant half.

### 2.7 The branch point this thread identifies — and where Lean currently sits

This is the sharpest thing thread 2 contributes, and it is a direct hit on §8.

CSLib's `TimeM` (§8.1) is *literally* Danner–Licata's `‖τ‖ = C × ⟪τ⟫`, with the cost monoid
generalized to `[Zero T] [Add T]`. **Lean has the shape. What it does not have is the
theorem** — and its docstring says so ("Time annotations are trusted"). CSLib cites
Danielsson 2008 as its ancestor; and Danner–Licata cite Danielsson 2008 as exactly the
*annotated-monad* approach they distinguish themselves from: *"he relies on explicit
annotation of the program, which our complexity translation inserts automatically, and his
correctness theorem is only for closed programs, whereas we use a logical relation."*

> **Lean today sits on the annotation branch, not the extraction-plus-bounding-theorem
> branch.**

There are exactly two ways off that branch, and the estate should choose deliberately:

1. **Discharge the annotation** with a bounding theorem relating the annotation to an
   operational semantics — the Danner–Licata route (ICFP15 Thms 4.2/5.7, POPL20 Thm 6.2,
   ICFP20 Thm 3.8 + Cor 3.9, JFP22 Thm 5.4). Cost: a logical relation, and in the
   higher-order case infinitely-branching derivations.
2. **Make the annotation unnecessary** by making cost a tracked *effect* behind a
   phase distinction — the calf route, where there is no separate "actual cost" to be
   annotated *against*, because the `step` is the cost. §9 rules for this one.

There is a third, cheaper, and entirely honest option that neither literature emphasizes: a
**fuel-indexed evaluator**, where the step count *is* definitional (§6.7(b)). No gap to
discharge because there is no annotation.

Confirming negative: `abs:"cost semantics" AND abs:"Lean"` on arXiv → **0 results**.

### 2.8 Verdict

**(a) Entity store.** Adopt the *recipe*, not the machinery. The calf paper's §3.2 recipe
— instrument the algorithm with `step` per the cost model; define the recurrence separately
and *cost-free*; prove `isBounded`; solve — is exactly right for decode/canonicalize, and
for a finite structural carrier the "solve" step is usually trivial (the cost is a
structural size). Building a separate recurrence *language* with its own bounding logical
relation would be pure overhead for a first-order total setting: the logical relation exists
to handle higher-order and general recursion, neither of which the store's v1 carrier has
(`entity-store-kickoff.md` §4.1, §4.2).

**(b) Runtime lane.** The bounding-relation shape becomes relevant exactly when the runtime
lane admits general recursion / divergence (T5) and higher-order callbacks — i.e. precisely
where the runtime document already stops. Until then it is over-machinery. The work/span
cost monoid, by contrast, is the natural target for T6.

---

## 3. Amortized resource analysis — AARA, RaML, and where automation ends

### 3.1 The core idea

Annotate types with non-negative rational numbers meaning "this data structure carries this
much *prepaid* resource per constructor". Typecheck as usual; every rule emits a **linear**
side condition on the annotations; solve the resulting linear program; the solution is a
certified upper bound as a function of input size. Tarjan's potential method, moved into the
type system, with the potential function derived rather than invented.

### 3.2 The load-bearing definitions

Source: Hoffmann & Jost, *Two decades of automatic amortized resource analysis*, MSCS
32(6):729–759, 2022, [10.1017/S0960129521000487](https://doi.org/10.1017/S0960129521000487)
(open access) — the authors' own retrospective, used here as the authority for their own
earlier papers. Origin: Hofmann & Jost, *Static prediction of heap space usage for
first-order functional programs*, POPL 2003.

**Potential** is defined by structural recursion on the *type*:

```
Φ([] : L^q(A))       = 0
Φ(v₁::v₂ : L^q(A))   = Φ(v₁ : A) + q₁ + Φ(v₂ : L^{◁(q)}(A))
◁(q₁,…,q_k)          = (q₁+q₂, q₂+q₃, …, q_{k−1}+q_k, q_k)     -- the additive shift
```

**Judgment:** `Γ ⊢^q_{q'} e : A` — "if more than `Φ(Γ) + q` resource units are available
that suffices to evaluate `e`; and if `e` evaluates to `v`, more than `Φ(v:A) + q'` remain."

**Soundness**, against a cost-instrumented big-step semantics `V ⊢ e ⇓ v | (p, p')` where `p`
is the minimum resource needed and `p'` the unused remainder (MSCS 2022 §3.4):

> If `Γ ⊢^q_{q'} e : A` and `V : Γ` and `V ⊢ e ⇓ v | (p,p')`, then `v : A` and
> `Φ(V:Γ) + q ≥ p` and `(Φ(V:Γ) + q) − (Φ(v:A) + q') ≥ p − p'`.

The multivariate form (Hoffmann, Aehlig, Hofmann, TOPLAS 34(3), Nov 2012,
[10.1145/2362389.2362393](https://doi.org/10.1145/2362389.2362393)), Theorem 1, is the same
inequality with `Φ_{V,H}(Γ;Q)` summing over an index set of **base polynomials** built from
binomial coefficients `C(n,k)`. The binomial basis is a *semantic* commitment, not a
convenience: potential must be non-negative, and binomials are "the largest class of
inherently non-negative polynomials" — `C(n,2)` is not expressible with non-negative
coefficients in the standard basis.

Three further structural facts matter:

- **Sharing is the soundness device.** `A ⌣ (B,C)` requires `Φ(v:A) ≥ Φ(v:B) + Φ(v:C)`.
  Referencing a value twice must split its potential. **AARA is therefore an affine type
  system.**
- **The resource pair `(p, p')`** — high-water mark plus leftover, not a single counter — is
  what makes the theorem compose over `let` and what makes *negative* cost constants sound
  (stack space uses `c_Let1 = 1, c_Let2 = 0, c_Let3 = −1`).
- Soundness extends to **failing and diverging** evaluations via a companion partial-
  evaluation judgment.

### 3.3 The known limits — two of which decide the estate's answer

| Class | Basis | Status |
|---|---|---|
| Linear | `q·n` | Hofmann–Jost 2003 |
| Univariate polynomial | `Σ qᵢ·C(n,i)` | Hoffmann–Hofmann 2010 |
| Multivariate polynomial | products over index sets | POPL 2011 / TOPLAS 2012 |
| Exponential | offset Stirling 2nd kind | Kahn–Hoffmann, FoSSaCS 2020, arXiv:2002.09519 |
| **Logarithmic** | `log(a·\|ℓ\|+b)` | **open — requires non-linear constraints** |

**Limit A — `n log n` is out of reach, and canonicalization sorts.** The survey states the
obstruction directly: logarithmic potential "seems to usually require global reasoning
('split the list in the middle until it is empty')", and the spill `log₂ n − log₂(n−1)`
"cannot be directly assigned to the tail of the list like in the polynomial case".
Consequence, verified: **RaML derives a quadratic bound for merge sort.** A tool that
certifies a canonicalizer as `O(n²)` is sound and useless as a specification.

**Limit B — potential is counted by reference-path, and a content-addressed store is a DAG
by construction.** The survey is explicit that potential is "crucially counted by
reference-path". Deduplication is the *point* of content addressing, so the in-memory
object is a DAG whose tree unfolding can be exponentially larger. Therefore:

- if decode/traversal **memoizes on hash**, an AARA bound is sound but hopelessly loose (it
  bounds the unfolding; the implementation pays for the DAG);
- if the traversal **genuinely re-walks each path**, AARA is exactly right and `share`
  models it precisely.

**This is a decision the entity store must make before choosing any cost model, and it is a
decision this survey did not expect to surface: does cost count DAG nodes or tree-unfolding
paths?** AARA can only express the latter. Hofmann–Jost "Views" handles genuine sharing but
drags inference into Skolem–Mahler–Lech territory (Bauer 2019).

Two further limits: **closures cannot capture potential** (the `Γ ⌣ (Γ,Γ)` premise), which
biases the whole system toward fully-uncurried code; and **content-dependent cost** (cost
that depends on a length prefix's *value*, or on hash-collision behaviour) is outside the
basis. Typability characterization: univariate polynomial AARA coincides exactly with PTIME
(Pham & Hoffmann, CSL 2021, arXiv:2010.16353).

### 3.4 Tooling maturity

**RaML 1.5.0, released 2020-06-14** — six years stale. Tarballs, no located GitHub repo, web
interface at raml.co. Worse for the estate's purposes: Grosen, Kahn, Hoffmann, *AARA with
Regular Recursive Types* (LICS 2023,
[10.1109/LICS56636.2023.10175720](https://doi.org/10.1109/LICS56636.2023.10175720)) is the
paper that finally covers arbitrary user-defined ADTs — its running example is literally a
filesystem rose tree, structurally an entity node — and its own future work is *"the
implementation of these resource functions in a fully automated resource analysis
typechecker, like RaML"*. **The theory covering entity-shaped carriers exists; the shipping
tool does not implement it.**

### 3.5 Mechanization

**AARA's own soundness theorem has never been mechanized.** What exists is three separate
things, and conflating them would be an error:

1. **Per-program certificate checking (Coq).** Carbonneaux, Hoffmann, Reps, Shao,
   *Automated Resource Analysis with Coq Proof Objects*, CAV 2017 — tool **Pastis**. A Coq
   support library defines interprocedural potential annotations and an admissibility
   predicate `IPA_VC`, with "the main theorem about admissible IPAs — proved once and for
   all in our library". Per program, Pastis emits a Coq file with the CFG, the LP-derived
   annotation, and two theorems (`admissible_ipa`, `bound_valid`) discharged by ~130 lines
   of tactics over `lia` and `ring`. **424 of 459 bounds Coq-checked**; failures traced to
   LP imprecision and float→rational conversion.

   The motivating admission is the best trust-story quotation in this survey:

   > "it greatly increases the confidence in generated bounds, which is especially critical
   > considering that **we observed LP solvers silently overflow and return an unsound
   > solution. All resource-analysis tools using LP solvers are currently vulnerable to this
   > issue.**"

2. **Partial soundness of a quantitative Hoare logic (Coq).** Carbonneaux, Hoffmann, Shao,
   *Compositional Certified Resource Bounds*, PLDI 2015 (tool C4B) — quantitative Hoare
   logic where predicates map states to non-negative numbers; "the main parts of the
   soundness proof are formalized with Coq", over Clight. The earlier PLDI 2014 stack-space
   work *is* genuinely end-to-end (C source → x86 through a modified CompCert) but C4B's own
   related work describes it as having "very rudimentary support for automation … cannot
   automatically derive symbolic bounds".

3. **Mechanized ancestors (Istari).** Glover & Hoffmann, *LFPL: Revisited and Mechanized*,
   **LICS 2026**, artifact [10.5281/zenodo.18348212](https://doi.org/10.5281/zenodo.18348212).
   LFPL is AARA's direct ancestor. First full mechanization of its metatheory — polynomial-
   time soundness *and* completeness — ~7,000 lines. **Its architecture is the single most
   directly transferable thing in this thread**: intrinsically typed terms
   (`term : ctx → tp → type`), a *denotational* semantics into the host
   (`term_sem : ∀ G A. term G A → env G → tp_sem A`), a *separate* cost-annotated
   operational semantics (`evals : ∀ G A. term G A → env G → value A → nat → type`), and a
   proved **coherence theorem** `operational_equiv_denotational` between them. That is
   exactly the "two semantics and one relation" architecture the runtime scoping document
   already prescribes — with cost added to one side.

   Caveat: the proof assistant is **Istari** (Crary's), not Coq/Lean/Isabelle. Together with
   calf-in-Agda this is a portability warning worth noting: neither of the two most
   important recent mechanizations in this area is in a system the estate uses.

**Isabelle/AFP (adjacent, and instructive).** Nipkow & Brinkop, *Amortized Complexity
Verified*, JAR 62(3):367–391, 2018. This is a **locale** parameterized by user-supplied
data: `exec`, `cost`, a potential `Φ : 's ⇒ real` with `inv s ⟹ 0 ≤ Φ s`, and a claimed
bound `U` with obligation `acost f ss ≤ U f ss` where
`acost f ss = cost f ss + Φ(exec f ss) − sum_list (map Φ ss)`. Induction over well-formed
operation trees yields `wf ot ⟹ cost_sum ot ≤ U_sum ot`. **Nipkow mechanizes no inference
algorithm; he verifies hand-supplied potential functions** — and *therefore* reaches
amortized **logarithmic** bounds (AFP `Root_Balanced_Tree`), which AARA cannot infer. AFP
entries `Amortized_Complexity` (submitted 2014-07-07) and `Root_Balanced_Tree` (2017-08-20)
are both maintained to Isabelle2025-2 (last updated **2026-02-06**), BSD.

**Lean 4: nothing.** No cost monad, no amortized-complexity development, no Mathlib
material. Confirmed by repository search; see §8.

**Session types / concurrency.** Das, Hoffmann, Pfenning, *Work analysis with resource-aware
session types* (LICS 2018) and *Parallel complexity analysis with temporal session types*
(ICFP 2018); Nomos for digital contracts, with gas treated like execution time. Potential
rides on **channels and messages** rather than values — structurally interesting for the
charter's L3, and worth remembering when the multiparty-session layer becomes concrete.
Repos: `ankushdas/Nomos` (OCaml, last push 2022-10-06, stale); `Second-Last/rast` (SML,
last push 2024-03-23). **No proof-assistant mechanization of any of it.**

**Recent (2023–2026), verified to exist:** Pham–Saad–Hoffmann, *Robust Resource Bounds with
Static Analysis and Bayesian Inference* (PLDI 2024, 10.1145/3656380); Pham–Niu–Glover–Saad–
Hoffmann, *Integrating Resource Analyses via Resource Decomposition* (OOPSLA 2025,
10.1145/3763798); Kahn–Reps–Grosen–Hoffmann, *Efficient Cost Bounds with Linear Maps*
(arXiv:2509.22982); Kahn–Hoffmann–Li, *Big-Stop Semantics* (arXiv:2508.15157, POPL 2026);
Xu–Wang, *Dependently-Typed AARA: A Non-Affine Approach* (arXiv:2601.12943, Jan 2026);
Chu et al., *Handling Exceptions and Effects with AARA* (arXiv:2603.02260, OOPSLA 2026).

Probabilistic AARA: Wang, Kahn, Hoffmann, *Raising Expectations: Automating Expected Cost
Analysis with Types* (ICFP 2020). Theorem 5.3 is the same potential inequality with the
right-hand side reinterpreted as an **expectation over the output sub-distribution**:

```
Φ(V:Γ) + q  ≥  Σ_{(v′,q′)} ⟦e⟧_V(v′,q′) · (Φ(v′:A) + q′)
```

For time-like cost models the derived bounds **imply termination with probability one**.

### 3.6 Where automation ends and semantics begins — answered

**The LP solver is a proof-search oracle and nothing more. Every semantic claim AARA makes
survives its removal — and this has been proved, not merely argued.**

The proof is **λ-amor**: Rajani, Gaboardi, Garg, Hoffmann, *A unifying type-theory for
higher-order (amortized) cost analysis*, POPL 2021, PACMPL 5, Article 27,
[10.1145/3434308](https://doi.org/10.1145/3434308). λ-amor is a small affine modal type
theory with exactly two relevant constructs:

- **`[p] τ`, the potential modality.** *"The inhabitants of type `[p] τ` are exactly those of
  type `τ` since the potential is **ghost state without a runtime manifestation**."*
  Introduction `store e`, elimination `release x = e₁ in e₂`, both **operationally inert**
  (`store e` evaluates exactly like `ret e`; `release` exactly like `bind`). Subtyping is
  *contravariant* in `p`, because discarding potential is sound.
- **`M κ τ`, a graded cost monad** — computations of cost at most `κ`, drawn from an ordered
  monoid. Cost is incurred only by `↑κ`.

**Theorem 1 (Soundness):** `∀ e,v,κ,κ′,τ. ⊢ e : M κ τ ∧ e ⇓^{κ′} v ⟹ κ′ ≤ κ`, by a
step-indexed logical relation. Then Theorem 5 (type preservation, univariate RaML → λ-amor),
Theorem 7 (semantics and cost preservation), and — the payoff — **RaML's own soundness
theorem is re-derived as a corollary**. λ-amor also embeds `dℓPCF`, which by Dal Lago–
Gaboardi's completeness makes it relatively complete for all terminating PCF programs.

So the separation is clean:

| Layer | Content | Estate's action |
|---|---|---|
| **Semantic core** | cost-instrumented semantics with the `(p, p′)` resource pair; `Φ(v:A)` as a type-directed map into an ordered monoid; the potential inequality; the affine sharing condition `A ⌣ (B,C)` | **adopt** |
| **Hybrid** | the binomial/Stirling basis and the linear shift `◁` — chosen jointly for non-negativity (semantic) *and* LP-linearity (algorithmic) | **drop the basis with the LP; logarithmic potential becomes available the moment you do** |
| **Automation** | LP encoding, maximal-degree parameter, cost-free typings for resource-polymorphic recursion, float→rational extraction | **discard; if wanted later, run it outside the kernel and re-check the coefficient vector inside — Pastis's architecture** |

The stability of the potential inequality across semantic domains is itself the evidence
that it is semantic content: swap the deterministic relation for a sub-distribution and it
becomes Wang–Kahn–Hoffmann's Theorem 5.3; swap for a session calculus and potential moves
onto channels; swap for coalgebras and it becomes Grodin–Harper's colax morphism (§1.6).

### 3.7 Verdict

**(a) Entity store — adopt the discipline, do not adopt the tool.** The semantic core (§3.6
row 1) transfers directly to Lean over the store's own carrier. The tool does not: RaML is
stale, does not implement the ADT theory the store needs, cannot express `n log n`, and its
reference-path potential model is a mismatch with content-addressed DAGs (§3.3 Limit B).
Nipkow's Isabelle posture — hand-supplied `Φ`, verified, no inference — is the closer
precedent and reaches strictly more bounds.

**(b) Runtime lane — wrong starting point.** AARA handles state, exceptions, and closures
piecemeal and awkwardly, and its LP machinery buys nothing when the task is *specifying*
tiers rather than inferring them. λ-amor's `M κ τ` graded cost monad over an arbitrary
ordered monoid is the right primitive; calf/decalf is the right frame.

---

## 4. Graded and quantitative types — usage as a type-level quantity

### 4.1 Graded monads

**Core idea.** A monad has one type constructor `T`; a graded monad has a *family* `T e`
indexed by an element of a preordered monoid of annotations. Pure lands at the identity;
bind multiplies the indices. Subeffecting is the preorder. Effect systems stop being side
conditions and become denotations.

**Definition** (Gaboardi, Katsumata, Orchard, Breuvart, Uustalu, *Combining effects and
coeffects via grading*, ICFP 2016,
[10.1145/2951913.2951939](https://doi.org/10.1145/2951913.2951939), §5.1, verbatim):

> "an **E-graded monad on `C` is given by a lax monoidal functor of type
> `E → ([C,C], Id, ∘)`**."

Concretely: `T : E → [C,C]`, `η_A : A → T 1 A`, `μ_{e,f,A} : T e (T f A) → T (e•f) A`,
plus a unit square and an associativity pentagon. The preorder is not extra data — `E` is a
preordered monoid *viewed as a category*, so `e ⊑ f` **is** a morphism and functoriality
gives the subeffecting map `G(e ⊑ f)_A : G e A → G f A` (Orchard–Wadler–Eades, MSFP 2020,
[10.4204/EPTCS.317.2](https://doi.org/10.4204/EPTCS.317.2), arXiv:2001.10274 p.18).

Origin: **Katsumata, *Parametric effect monads and semantics of effect systems*, POPL 2014,
[10.1145/2535838.2535846](https://doi.org/10.1145/2535838.2535846)**. Formal theory:
Fujii–Katsumata–Melliès, FoSSaCS 2016,
[10.1007/978-3-662-49630-5_30](https://doi.org/10.1007/978-3-662-49630-5_30) — every graded
monad factors as a strict action along a left adjoint, in two ways generalizing
Eilenberg–Moore and Kleisli. Presentation theory: Kura, *Graded Algebraic Theories*
(FoSSaCS 2020, arXiv:2002.06784) proves graded algebraic theories ≃ graded Lawvere theories
≃ finitary graded monads; Katsumata, McDermott, Uustalu, Wu, *Flexible Presentations of
Graded Monads* (ICFP 2022, [10.1145/3547654](https://doi.org/10.1145/3547654)) fixes the
fact that "many effects do not have natural graded presentations" under the older notion.

**Maturity: high.** Twelve years old, settled definition, active in three communities
(effects, coalgebra, probabilistic semantics) through 2026.

### 4.2 Coeffects

Effects describe what a computation *does to* its context; coeffects what it *demands of*
it. Because a variable can be demanded many times in many places, the grade algebra needs
two operations — sequential/nested demand and merge-at-contraction — hence a **semiring**.

Petříček, Orchard, Mycroft, *Coeffects: a calculus of context-dependent computation*,
ICFP 2014, [10.1145/2628136.2628160](https://doi.org/10.1145/2628136.2628160), Def. 1:

> a coeffect scalar `(C, ⊛, ⊕, use, ign, ≤)` where `(C, ⊛, use)` and `(C, ⊕, ign)` are
> monoids, `(C, ≤)` is a preorder, and `⊛` distributes over `⊕` on both sides

— i.e. exactly a **preordered semiring**, `⊛`/`use` multiplicative (nested use), `⊕`/`ign`
additive (contraction). Judgments are `Γ @ R ⊢ e : τ` with `R` a shape-indexed container of
scalars. Semantics is an **indexed comonad**: `F : I → [C,C]` with
`δ_{X,Y,A} : F_{X•Y} A → F_X (F_Y A)` and `ε_A : F_I A → A` (Def. 17, Def. 21). The earlier
"flat" version is ICALP 2013,
[10.1007/978-3-642-39212-2_35](https://doi.org/10.1007/978-3-642-39212-2_35).

The effects×coeffects paper above contributes **graded distributive laws**: eight formats,
each with a *matched pair* `(ι, κ)` of monotone maps, e.g.
`σ_{r,e,A} : D r (T e A) → T κ(r,e) (D ι(r,e) A)` with four equational axioms and the
matched-pair conditions `κ(r,1)=1, ι(r,1)=r, ι(1,e)=1, κ(1,e)=e`. Those conditions exist
because "when we add gradings to the equational axioms of the classical distributive law,
both sides get different gradings, thus become incomparable" — a coherence obligation worth
knowing about in advance.

**Framing to adopt.** Liepelt, Marshall, Orchard, *Same Coeffect, Different Base:
Connecting Two Dominant Approaches to Graded Types*, arXiv:2606.28042 (v2 2026-07-06),
splits the field into a **graded-base** lineage (annotations on every function arrow — QTT,
Linear Haskell) and a **linear-base** lineage (a graded modality atop linear types —
Granule, BLL), with semantics-preserving translations between them.

### 4.3 Quantitative Type Theory

Attach a semiring element to every context binding; let `0` mean "erased at runtime but
still usable in types". Dependency and linearity stop fighting because `0 + ρ = ρ` and
`0·ρ = 0` make type formation free and non-propagating.

**McBride, *I Got Plenty o' Nuttin'*, 2016,
[10.1007/978-3-319-30936-1_12](https://doi.org/10.1007/978-3-319-30936-1_12)**: a *rig*
(semiring without negation), the *none-one-tons* `{0,1,ω}` with `1+1=ω`, and the reading
`∀x:S.T = (0 x : S) → T`, `(x:S) ⊸ T = (1 x : S) → T`, `Πx:S.T = (ω x : S) → T`. The
erasure result is **Theorem 44 (step simulation)** — erased programs simulate source
programs step for step — and it requires the rig to have **no negation and no
cancellation** (`ρ + π = 0 ⟹ ρ = π = 0`).

**Atkey, *Syntax and Semantics of Quantitative Type Theory*, LICS 2018,
[10.1145/3209108.3209189](https://doi.org/10.1145/3209108.3209189).** Judgment form:

```
x₁ :^ρ₁ S₁, …, xₙ :^ρₙ Sₙ  ⊢  M :^σ T          with ρᵢ ∈ R and σ ∈ {0, 1}
```

The restriction of `σ` to `0` or `1` is Atkey's fix over McBride: *"McBride allowed
arbitrary usages ρ on the final colon. However, this yields a system that does not admit
substitution as we show in Section 2.3."* The semiring must be **positive**
(`ρ + π = 0 ⟹ ρ = 0 ∧ π = 0`) and have the **zero-product property**
(`ρπ = 0 ⟹ ρ = 0 ∨ π = 0`); both "are required for the admissibility of substitution".

The `0`-fragment is the erasure story, and its exact shape matters:

> **Lemma 2.3 (Zero needs nothing).** If `Γ ⊢ M :^0 S`, then `0Γ = Γ`.

with the paper's own warning that the converse fails — *"there is no way to reconstruct the
resource usage."* Soundness is Theorem 3.7 over **Quantitative Categories with Families**.
And the caveat that decides how much QTT actually buys: **Prop. 3.3 (Trivial QCwFs)** — QTT
can be interpreted in *any* model of type theory, ignoring the refinement entirely. **The
resource content is a property of the chosen model, not forced by the syntax.**

**Realizations.** Idris 2 fixes `{0,1,ω}` (Brady, ECOOP 2021,
[10.4230/LIPIcs.ECOOP.2021.9](https://doi.org/10.4230/LIPIcs.ECOOP.2021.9)); Agda's
`--erasure` gives `{@0, @ω}` and its manual cites McBride and Atkey by name. **Atkey's QTT
itself is unmechanized.** The formalized benchmark is Agda's instead: Abel, Danielsson,
Eriksson, *A Graded Modal Type Theory with a Universe and Erasure, Formalized*, ICFP 2023,
[10.1145/3607862](https://doi.org/10.1145/3607862), extended arXiv:2603.29716 (v2
2026-04-30) — Π/Σ/ℕ/⊥/universe over a **partially ordered semiring** of modalities, with
subject reduction, consistency, normalization, decidability of definitional equality, and an
extraction theorem. Repo `graded-type-theory/graded-type-theory` (Agda, last push
2026-08-20).

### 4.4 Granule

A linear base plus graded modalities `□_c A`, with `c` from a **partial preordered
semiring**. Orchard, Liepelt, Eades, *Quantitative program reasoning with graded modal
types*, ICFP 2019, [10.1145/3341714](https://doi.org/10.1145/3341714), §4.2 defines the
resource algebras — and **these are the definitions the estate should reuse verbatim**:

| Resource algebra | Structure | Expresses |
|---|---|---|
| `Nat` (Def. 4.1) | `(ℕ, +, 0, ·, 1, ≡)`, **discrete** order | exact usage counts |
| `Level` (Def. 4.2) | `{Irrelevant ⊑ Private ⊑ Public}` | confidentiality / noninterference |
| **`Interval R` (Def. 4.3)** | `{c..d}`, interval arithmetic, `c..d ⊑ e..f ⟺ e ⊑ c ∧ d ⊑ f` | **lower and upper bounds on usage** |
| `Ext R` (Def. 4.4) | `R ∪ {∞}` | unbounded use; `A[0..∞]` recovers linear logic's `!` |
| `R × S` (Def. 4.5) | pointwise | **several quantities tracked at once** |
| `flatten(c₁,R,c₂,S)` | inter-algebra | composing nested gradings |

Sensitivity / differential privacy is named as reachable but **not built in** as of 2019.
Repo `granule-project/granule`: **732 stars**, BSD-3, 21 contributors, last push
**2026-07-21**, latest release v0.9.6.0 (2024-11-22) — a healthy, continuously published
research prototype, pre-1.0. Sibling `granule-project/gerty` (graded modal *dependent* type
theory, ESOP 2021, 71 stars, last push 2026-07-20). Later line: *Linearity and Uniqueness*
(ESOP 2022), *Deriving Distributive Laws for Graded Linear Types* (arXiv:2112.14966),
*Program Synthesis from Graded Types* (ESOP 2024), *Graded Hoare Logic and its Categorical
Semantics* (ESOP 2021,
[10.1007/978-3-030-72019-3_9](https://doi.org/10.1007/978-3-030-72019-3_9), arXiv:2007.11235
— **graded Freyd categories unifying cost analysis, probabilistic estimates and DP bounds
under "a preordered monoidal analysis"**).

### 4.5 Lean 4 — verified against the local v4.33.1 toolchain

Checked against `~/.elan/toolchains/leanprover--lean4---v4.33.1/src/lean/`, not
documentation.

**Lean 4 core has no quantity annotations. Confirmed.** `Lean/Expr.lean:71`:

```lean
inductive BinderInfo where
  | default | implicit | strictImplicit | instImplicit
```

Four constructors, all *visibility*; no slot for `0`/`1`/`ω`. Greps over `Init/`, `Std/`,
`Lean/` for `quantitative`, `multiplicity`, `linear type`: zero relevant hits. No RFC or
open issue proposes them.

**Three adjacent things that are not it:**

1. **Automatic type-directed erasure.** `Compiler/LCNF/ToLCNF.lean` erases proofs and type
   formers to `lcErased`; `Compiler/LCNF/Irrelevant.lean` computes per-constructor
   relevance bitmasks. This is the degenerate `{0, non-0}` case of a quantity semiring —
   but **inferred from the sort by an untrusted backend, never declared, never checked
   against intent.**
2. **Compiler-internal linear resource discipline** (*Counting Immutable Beans*, Ullrich &
   de Moura, arXiv:1908.05647). As of v4.33.1 these passes live in `Compiler/LCNF/`
   (`InferBorrow`, `PropagateBorrow`, `ExplicitRC`, `CoalesceRC`, `ResetReuse`,
   `ExpandResetReuse`). The representation is a bare `Bool` plus a four-element lattice
   `Ownedness := bot | borrow | own | top` — **not a semiring** — and the `@&` parser
   docstring (`Lean/Parser/Term.lean:399`) is explicit: **"From the perspective of Lean's
   type system, this annotation has no effect."**
3. **Kernel proof irrelevance** — definitional, not annotated.

**Mathlib's "graded" is a different instance of the same abstract pattern — say so
precisely.** `Mathlib/Algebra/GradedMonoid.lean` defines
`class GMul [Add ι] where mul {i j} : A i → A j → A (i + j)`, `GMonoid`,
`SetLike.GradedMonoid`, `DirectSum.Decomposition`, `GradedRing`. By Fujii–Katsumata–Melliès
§2, both notions are `M`-**graded monoids in a monoidal category `C`**: Mathlib takes
`C = Ab`/`Type` with `⊗`, so `A i` is a *carrier type* (the degree-`i` homogeneous
component) and the whole thing is pinned by a decomposition `A ≃ ⨁ i, 𝒜 i`; a graded monad
takes `C = ([Type,Type], ∘, Id)`, so `T e` is an *endofunctor* and nothing is being
decomposed. **The functorial dimension in the value type is present in one and absent in
the other, and there is no import, instance, or lemma in Mathlib connecting them.**
Code-search `GradedMonad` in mathlib4 → `[]`; issue-search "graded monad"/"indexed monad" →
0. **Mathlib has no effect grading of any kind.**

**`WriterT` is not in Lean 4 core and not in Batteries.** Verified: `Init/Control/` has
`Basic, Do, EState, Except, ExceptCps, Id, Lawful/, MonadAttach, Option, Reader, State,
StateCps, StateRef`; grep for `WriterT` across `Init/`, `Std/`, `Lean/` returns **zero
files**; Batteries code-search → 0. Only Mathlib has it
(`Mathlib/Control/Monad/Writer.lean`, `WriterT ω M α := M (α × ω)` with `tell/listen/pass`).
**And it accumulates at the term level** — it cannot lift `ω` to a type index, so it cannot
gate a budget statically.

**But graded monads in Lean 4 *do* exist, outside core/Batteries/Mathlib.** Three real
implementations:

| Repo | Stars | Last push | What it has |
|---|---|---|---|
| `Verified-zkEVM/VCVio` `ToMathlib/Control/Monad/Graded.lean` | 139 | **2026-08-25** | `class GradedMonad (M) [Monoid M] (F : M → Type u → Type v)` with `gpure : α → F 1 α`, `gbind : F i α → (α → F j β) → F (i*j) β`, plus `LawfulGradedMonad`, `GradedMonad.ofMonad`, `GradedMonadT`, and siblings for Atkey-indexed / Dijkstra / relative monads. **Staged in `ToMathlib/` for upstreaming, not yet submitted.** |
| `janmasrovira/prim-parser` | 20 | **2026-08-25** | graded functor/applicative/monad, laws stated with **heterogeneous equality `≍` rather than `▸`**, and — the hardest ergonomic problem — **graded `do` notation**, already solved once |
| `palladin/lean-linq` | 21 | 2026-07-19 | **a graded Freer Dijkstra monad with symbolic cost grades**: `Grade := (String → Nat) → Nat` (grades symbolic in table sizes), pointwise algebra so every evaluation homomorphism is `rfl`, semantic order, execution gated on a proof `r ≤ budget` |

**The single highest-leverage engineering finding in this thread** is named in VCVio's own
docstring:

> "Because the monoid laws (`one_mul`, `mul_one`, `mul_assoc`) are **propositional rather
> than definitional** equalities, the graded monad laws involve `▸` (i.e. `Eq.mpr`) to
> transport terms between propositionally-equal-but-definitionally-distinct types."

prim-parser routes around it with `≍`; `lean-linq` records the same fork as a design pivot:

> "An earlier design kept grades as canonical max-plus polynomials so the *index
> bookkeeping* of a graded monad could be definitional; with cost inside the wp, grades are
> values in specs, and values need no normal form — just arithmetic."

**Treat two prominent-looking Lean repos as low-assurance:** `GrigoryEvko/FX` (43 stars,
"graded dependent type theory", ships `AGENTS.md`/`CLAUDE.md`/`MEMORIES.md` at top level and
reads as an agent-driven project); `Arthur742Ramos/Metatheory` (defines `Qty := zero|one|omega`
but its theorems are largely `rfl` on a three-element enum). Neither is evidence of
ecosystem maturity — the same discipline that condemns `RB-TT` in §8.1.

**Academic negative, hard.** arXiv API 2026-08-25: `all:"Lean 4"` conjoined with each of
`graded monad`, `effect system`, `quantitative type theory`, `coeffect`, `linear types` →
**0 results in every case** (mechanism validated: `all:"Lean 4"` alone → 447). **No
published paper connects Lean 4 to graded monads, effect systems, QTT, or coeffects.**

**Mathlib does supply good grade *objects*, under algebraic names:** `IsOrderedRing` /
`IsStrictOrderedRing` (mixins over `[Semiring R] [PartialOrder R]`), `Tropical R` (min-plus
— worst-case cost), `ENat` (for `ω`-as-⊤), `NonemptyInterval`/`Interval` with `One`/`Mul`/
`Add` instances (Granule's `Interval R` for free), `NNReal`, and `CanonicallyOrderedAdd`
(the "no negative resources" condition). For a no-Mathlib project, `Monoid`/`Semiring` plus
an order is ~20 lines.

### 4.6 Verdict

**(a) Entity store — adopt the semiring vocabulary; do not grade Lean's binders.**

- The *right shape* for decode/canonicalize/store is a preordered semiring: costs compose
  multiplicatively along nesting and additively across branching. Granule's `Interval (Ext
  Nat)` is the exact algebra for "at least `l`, at most `u` store touches, possibly
  unbounded", and `R × S` lets bytes-hashed and entities-decoded ride in one grade. Reuse
  those definitions; they come with proofs that they are preordered semirings.
- **Content addressing gives a free `0`.** A cache hit on a content hash is a QTT-style
  `0`-usage: the entity is available *for identity* without being *decoded*. Atkey's
  Lemma 2.3 is the right invariant to state for a canonicalization path — and its stated
  non-converse is the honest caveat: a cache-hit proof must be **carried**, not
  reconstructed.
- **Do not try to grade Lean's binders.** §4.5 settles it: `BinderInfo` has no quantity
  slot, the compiler's linearity is a `Bool` plus a four-element lattice *below* the type
  system, and `@&` is documented as having no type-system effect. Any discipline must be an
  object-language construction or a graded type constructor in the ambient theory.
- **If a graded index is ever wanted, use `Nat`-shaped grades, not an abstract `Monoid`.**
  This is the concrete engineering ruling from §4.5: `Nat` literal arithmetic reduces
  definitionally, so most `▸` transport disappears and `omega` closes the rest.
- **Axiom allowlist is unaffected** — a `Nat`-graded monad is constructive.

**(b) Runtime lane — grading supplies the composition algebra; calf supplies the tiering
discipline. They answer different questions and the estate needs both.** The preorder on
grades *is* the tier-weakening relation (exact cost refines an upper bound refines
unbounded), and it comes free as functoriality of `T : E → [C,C]` — no extra machinery. If
tiers must also track *context demands* per tier, the eight-format graded distributive-law
taxonomy and its matched-pair conditions are the reference. For Hoare-style cost reasoning
over an effectful lane, Graded Hoare Logic (ESOP 2021) is the closest fit.

**The fork to note, because it was discovered twice independently.** Graded monads put cost
in the **index** (statically checkable budget, transport pain, index bookkeeping); calf and
decalf put cost in an **effect with a phase separation** (richer reasoning, amortization, no
index bookkeeping). `lean-linq`'s recorded pivot is that same fork, found in Lean, and it
went the same way calf did. §9 rules on it.

---

## 5. Quantitative equational and algebraic theories

### 5.1 The core idea

Replace the two-valued judgment `s = t` with a family `s =ε t` indexed by a non-negative
rational, read "`s` and `t` are within `ε` of each other"; keep the whole apparatus of
universal algebra — theories, free algebras, monads, completeness — and watch familiar
metrics fall out as the free-algebra metrics of very small axiom sets.

### 5.2 The load-bearing definitions

Mardare, Panangaden, Plotkin, *Quantitative Algebraic Reasoning*, LICS 2016,
[10.1145/2933575.2934518](https://doi.org/10.1145/2933575.2934518); journal/extended version
arXiv:1804.01682 (5 Apr 2018), which is the source of the quotations below.

**The deduction system** (Table 1, verbatim, with `ǫ` for ε):

```
(Refl)                        ⊢ t =0 t
(Symm)      {t =ǫ s}          ⊢ s =ǫ t
(Triang)    {t =ǫ u, u =ǫ′ s} ⊢ t =ǫ+ǫ′ s
(Max)       {t =ǫ s}          ⊢ t =ǫ+ǫ′ s ,  for all ǫ′ > 0
(Arch)      for ǫ ≥ 0, {t =ǫ′ s | ǫ′ > ǫ} ⊢ t =ǫ s
(NExp)      for f : |I| ∈ Ω, {tᵢ =ǫ sᵢ | i ∈ I} ⊢ f((tᵢ)) =ǫ f((sᵢ))
(Subst) (Cut) (Assumpt)                             -- structural
```

The authors' own statement of the price (§2.1, verbatim):

> "`=0` is the classical term equality. However, for ǫ ≠ 0, `=ǫ` is not an equivalence: the
> transitivity is replaced by a rule encoding the triangle inequality. Notice also that the
> rule (Arch) is infinitary."

**Quantitative algebra** (Def. 3.1, verbatim): *"an Ω-quantitative algebra (QA) is a tuple
A = (A, ΩA, dA) … such that all the functions in ΩA are non-expansive"*, with
`dA : A × A → ℝ⁺ ∪ {∞}`. Homomorphisms are non-expansive. Note the asymmetry: **indices are
rationals, distances are reals**, and `dU(t,s) = inf{ε | ∅ ⊢ t =ε s}` — which is exactly why
(Arch) must exist.

**Basic quantitative inference** restricts hypotheses to finite (or `c`-small) sets of
quantitative equations *between variables only*; completeness (Thm 5.2) holds for that
fragment.

**The headline free-algebra results.** Four small theories present four standard metrics:

| Theory | Free algebra | Metric presented |
|---|---|---|
| Left-invariant barycentric | finitely-supported distributions | **total variation** |
| Quantitative semilattices with zero | finite / compact subsets | **Hausdorff** |
| **Interpolative barycentric (p-IB)** | distributions / Borel probability measures | **p-Wasserstein; p = 1 is Kantorovich** |
| Pointed barycentric | sub-probability measures | as above |

Companion: *On the Axiomatizability of Quantitative Algebras*, LICS 2017,
[10.1109/LICS.2017.8005102](https://doi.org/10.1109/LICS.2017.8005102) — the Birkhoff
programme, with `H` weakened to `Hc` (`c`-reflexive homomorphic images) and a `c`-Variety
Theorem. The categorical settlement is Adámek, Dostál, Velebil, *Quantitative Algebras and a
Classification of Metric Monads* (arXiv:2210.01565, last revised **2026-02-05**), with
Adámek, *Varieties of Quantitative Algebras Presented by 1-Basic Monads*, FoSSaCS 2026
([10.1007/978-3-032-22730-0_1](https://doi.org/10.1007/978-3-032-22730-0_1)) the most recent
node. Milius & Urbat (FoSSaCS 2019, arXiv:1812.02016) give a generic HSP theorem covering
ordered, continuous, quantitative, nominal and profinite algebras uniformly.

### 5.3 Cost as the metric — it has been done, once, precisely

**Dal Lago & Gavazzo, *Effectful program distancing*, POPL 2022,
[10.1145/3498680](https://doi.org/10.1145/3498680).** (Note the title: *distancing*, not
"distances" — a citation trap the reader flagged and verified against dblp.)

A *generalised distance space* (Def. 3.1) is `A = (A, ⌊A⌋, R)` with `R ⊆ A × ⌊A⌋ × A` — a
ternary relation **with no axioms at all**. The distance between two functions is itself a
function from input-differences to output-differences; compositionality rides on a chain
rule, not a triangle inequality.

Examples 3–4 instantiate it at the **writer/cost monad**: for `(W,·,ε) = (ℕ,+,0)`,
`⌊W(A)⌋ ≜ [0,∞] × ⌊A⌋`, and a distance between two costed computations gives a distance
between returned values *"together with an (over-)approximation of the numerical distance
between the computational costs"*; taking the **asymmetric** Euclidean norm *"we obtain
information on which of the two computations is more efficient."*

The worked example (§5.1) computes insertion sort against merge sort, and its first
component is literally the cost gap:

```
d_isort(xs, dxs) = ( G(n log₂ n) − F(n + Σᵢ Iᵢ) ,  (i, di) ↦ xsˢ[i + di] − xsˢ[i] )
```

**So cost-as-distance works, and there is an existence proof.** Related: *Differential
Logical Relations Part I* (ICALP 2019,
[10.4230/LIPIcs.ICALP.2019.111](https://doi.org/10.4230/LIPIcs.ICALP.2019.111)); *A
Relational Theory of Effects and Coeffects* (POPL 2022,
[10.1145/3498692](https://doi.org/10.1145/3498692)); Gavazzo's *Applicative Distances*
(LICS 2018, arXiv:1801.09072).

**And there is now a bridge theorem — with a decisive negative attached.** Dal Lago,
Hoshino, Pistone, *On the Metric Nature of (Differential) Logical Relations* (FSCD 2025,
[10.4230/LIPIcs.FSCD.2025.15](https://doi.org/10.4230/LIPIcs.FSCD.2025.15); expanded journal
version arXiv:2603.01317, **1 Mar 2026**) identify DLR distances as *quasi-quasi-metrics* —
quasi-reflexive, transitive `Q`-valued ternary relations with `φ(x,y) ⊗ φ(y,z) ⊑ φ(x,z)` —
and prove that the finest differential prelogical relation is presented as a **formal
quantitative equational theory**. Then, verbatim from the abstract:

> "the poset **lacks a coarsest** differential prelogical relation. The absence of a coarsest
> differential prelogical relation contrasts with the situations of typed lambda calculi,
> where the contextual equivalences serve as the coarsest program equivalences."

### 5.4 calf/decalf and the quantitative line do not touch

**Zero citation contact in either direction.** The complete bibliographies of calf (POPL
2022), decalf (POPL 2024, v4 2026-05-20), and *Potential Functions as Types*
(arXiv:2607.08547v2) contain no Mardare, no "quantitative algebra", no Lawvere-1973, no
Dal Lago, no Gavazzo, no quantale. calf's only "metric" hits are *termination metric*. **A
citation trap to avoid: calf cites Lawvere 1963 (*Functorial Semantics of Algebraic
Theories*), not Lawvere 1973 (*Metric spaces, generalized logic, and closed categories*) on
which the entire quantitative line rests.** Reporting that as a link would misrepresent
calf.

**But the kinship is real and can be stated precisely, as the estate's own observation
rather than a claim from either literature.** decalf's cost structure is a **preorder**
(`x ⊑_X x′ ≔ ∃α : I → X. α0 = x ∧ α1 = x′`), and cost relaxation is ordinary monotonicity.
Dahlqvist & Neves (*An Internal Language for Categories Enriched over Generalised Metric
Spaces*, CSL 2022, [10.4230/LIPIcs.CSL.2022.16](https://doi.org/10.4230/LIPIcs.CSL.2022.16),
arXiv:2105.08473) give a `V`-equational deductive system parameterized by a quantale `V`,
sound and complete as an *internal language*. Therefore:

> **decalf is enriched in the Boolean/order quantale; quantitative equational theories are
> enriched in the Lawvere quantale `[0,∞]`. Both are instances of one `V`-equational
> framework.** `V = 2` gives ordinary equality; `V` = the two-element order gives
> refinement/preorder (decalf's cost relaxation, and arguably the estate's own G0–G6 claim
> gates); `V = [0,∞]` gives metric approximation.

That single knob is the piece of conceptual economy worth taking from this thread.
Dagnino & Pasquali (LMCS 21(1), 2025-01-28, arXiv:2110.05388) put the theme in one line:
*"Distances are the quantitative counterpart of equivalence relations: they measure how much
two objects are similar, rather than just saying whether they are equivalent or not."*

### 5.5 Mechanization — clean, decisive negative

**Nobody has mechanized quantitative equational theories or quantitative algebras in any
proof assistant.** Direct GitHub code searches run 2026-08-25:

| Query | Result |
|---|---|
| `"quantitative equational" language:Lean` | **0** |
| `"quantitative equational" language:Agda` | **0** |
| `"quantitative algebra" language:Coq` | **0** |

**Lean/Mathlib raw material, and the gap.** `Mathlib/Algebra/Order/Quantale.lean` exists
(created 2024-11-19, last touched 2026-08-17, 10 commits): `IsQuantale`/`IsAddQuantale`,
residuation, `mul_sSup_distrib`. **It has zero instances anywhere in Mathlib** — a repo-wide
search returns only its own definition site. No `ENNReal` instance, hence **no Lawvere
quantale**. `LawvereTheory` → 0 hits. `Wasserstein` → 0 hits; `Kantorovich` → one stub in
`docs/1000.yaml` with no `decl` field, i.e. explicitly *not* formalized (and that entry is
the Newton–Kantorovich theorem, not Kantorovich–Rubinstein duality). What *is* solid:
`LipschitzWith`, `ContractingWith` + Banach fixed point, the `PseudoMetricSpace`/`EMetric`
hierarchy, `NNReal`/`ENNReal`, and `CategoryTheory/Enriched/`.

To reach MPP quantitative algebras in Lean one would need, in order: a `MonoidalCategory`
instance on the poset `ℝ≥0∞ᵒᵈ` with `+` as tensor (does not exist); a bundled nonexpansive-
morphism type (Mathlib has the *predicate* `LipschitzWith 1`, not a bundled hom); the
deduction system; and Wasserstein/Kantorovich, entirely absent.

Coq/Rocq: `math-comp/analysis` has pseudometric structures and nothing above them; a
repository search for `bisimulation metric coq` returned 0. Isabelle/AFP has genuinely more
quantale machinery — `Quantales` (Struth, submitted 2018-12-11) and `Quantales_Converse`
(Struth & Calk, 2023-07-25) — but oriented to Kleene/relation algebra and program
verification, not to Lawvere-quantale-enriched metric algebra. Nobody has connected them.

**The structural obstacle nobody had solved until eight months ago.** Mio, *Compact
Quantitative Theories of Convex Algebras* (MFPS XLI / ENTICS 5, published **2025-12-15**,
[10.46298/entics.16876](https://doi.org/10.46298/entics.16876), arXiv:2511.04201) names it
verbatim: the deduction system lives in `L_{ω1,ω}`, so *"a proof in quantitative algebra is,
in general, not a finite object: it is a well founded tree with countable width"*, because
of (Arch). His remedy: *"If E ⊢ s =ϵ t is derivable, then it is derivable by a finite proof
not using the infinitary rule. We refer to such quantitative equational theories E as
compact."* He proves the interpolative barycentric (Kantorovich), quantitative-semilattice
(Hausdorff), and convex-semilattice theories are compact. **That is the prerequisite theorem
any mechanization would have to cite, and it is eight months old — which is why no
mechanization exists.**

### 5.6 Judgment — marked as judgment

**(a) Entity store — reject, on principle, not on timing.** Content-addressed identity is
0/1 and must stay 0/1. Worse than useless: a good hash is *designed* so that semantic
proximity carries no information about digest proximity — avalanche is the point — so a
metric on digests is actively anti-informative. And "within ε of canonical" is a way of
*not having* a canonical form; for an estate whose central bus is canonical forms that is
the wrong trade. The hard problem is choosing the normalizer, and a metric lets you avoid
choosing rather than helping you choose. The existing evidence agrees: `formal/fips202` is
bit-exact end to end, every theorem is `=` on `List Bool`/`UInt8`/`Fin`, and its lakefile has
**no Mathlib dependency at all**. Adopting this thread would mean adding Mathlib and then
being the first user of a two-year-old uninstantiated abstraction, to serve zero current
artifacts.

**Three structural results say "don't", not "not yet":**

1. **No coarsest program metric** (arXiv:2603.01317, Mar 2026). The estate's architecture
   assumes each layer has a *canonical declared equivalence* that projection and lift are
   checked against (CHARTER, Tooling stance; P2). In the metric world there is no canonical
   coarsest choice to declare — you would replace one canonical relation per layer with a
   lattice of incomparable ones plus a governance problem. **That is a direct attack on P2
   and on the central-bus thesis.**
2. **The proof system is infinitary** (Mio 2025). Compactness rescues *specific* theories;
   you would have to prove compactness for *yours* before mechanizing — a research project
   whose founding result is eight months old.
3. **Cartesian/monoidal mismatch.** MPP quantitative algebras are cartesian; the charter's
   L3 (sessions, global types, projection, topology) is a linear/monoidal world. Lobbia,
   Różowski, Sarkis, Zanasi had to rebuild the theory monoidally (*Quantitative Monoidal
   Algebra*, MFCS 2025, [10.4230/LIPIcs.MFCS.2025.68](https://doi.org/10.4230/LIPIcs.MFCS.2025.68),
   arXiv:2410.09229), one year old with no follow-on. Adopting the cartesian variant at
   L1/L2 would mean discovering at L3 that the wrong variant had been adopted — precisely
   the failure mode P1 warns about.

**(b) Runtime lane — adopt the vocabulary, not the machinery.** Take Dahlqvist–Neves's
`V`-quantale framing as the conceptual home for "cost as denotation" and instantiate it at
the **order quantale**, not the Lawvere quantale. A cost-tier lane wants a preorder with
monotone relaxation — decalf's `c ≤ c′ ⟹ charge⟨c⟩(e) ≤ charge⟨c′⟩(e)` — which is mature
and mechanized. Read Dal Lago–Gavazzo's insertion-vs-merge-sort computation as the existence
proof that cost-as-distance works, then decline it: the symmetric metric buys nothing a
directed preorder does not, and it costs you the triangle inequality's obligations.

**Where it would genuinely earn its keep, hypothetically:** if a *lossy* codec ever enters
the estate (float quantization, compression tier), "decode∘encode is within ε of identity"
is the correct law and has no exact substitute — but no roadmap item produces such an
artifact. And if probabilistic choice ever enters L1 alongside the interaction-tree carrier,
the Kantorovich/Wasserstein presentation and Bacci et al.'s Markov-process axiomatization
(LICS 2018, [10.1145/3209108.3209177](https://doi.org/10.1145/3209108.3209177), with
contractive operators of factor `0 < c < 1`) are exactly the tools.

### 5.7 The unclaimed opportunity, recorded and declined

Stated because it is real and because it is *not* recommended now: **a quantale-valued
rather than Boolean cost ordering inside a mechanized cost-aware framework — decalf's `⊑`
replaced by a `[0,∞]`-valued distance — is unoccupied.** Neither community cites the other;
Dal Lago–Gavazzo's Example 4 shows decalf's preorder is a degenerate instance of their
distance framework and nobody has written that down; arXiv:2603.01317 now supplies the
axiomatics that would make it well-founded. That is a paper. It is not a foldlab roadmap
item.

---

## 6. Mechanized cost reasoning in proof assistants

This is the thread that answers "what could the estate actually stamp G1 on today."

### 6.1 Separation logic with time credits — Charguéraud–Pottier / CFML

**Core idea.** Add a second component to the heap: a natural number of *time credits*. `$n`
owns exactly `n` credits; every function call consumes one. Because `∗` splits resources,
credits split too — so an upper bound on the credits you start with is an upper bound on
your step count. Amortization is free: an abstract predicate can *store* credits inside
itself, and that stored quantity **is** Tarjan's Φ.

**Definitions**, from Charguéraud & Pottier, JAR 62(3):331–365, 2019,
[10.1007/s10817-017-9431-7](https://doi.org/10.1007/s10817-017-9431-7):

```
Heap ≡ Memory × ℕ
$n   ≡ λ(m,c). m = ∅ ∧ c = n
(m₁,c₁) ⊎ (m₂,c₂) ≡ (m₁ ⊎ m₂, c₁ + c₂)

$(n + n′) = $n ∗ $n′            $0 = []
```

> "the partial commutative monoid (Heap, ⊎) is the product of the partial commutative
> monoids (Memory, ⊎) and (ℕ, +)"

Credits are **affine, not linear** (`DISCARD-POST` weakens `$m` to `$n` for `m ≥ n`).
**Definition 2 (Triples with Time Credits)**:

```
{H} t {Q} ≡ ∀m,c,H′. (H ∗ H′)(m,c) ⇒ ∃n,v,m′,c′. t/m ⇓ⁿ v/m′
                                     ∧ (Q v ∗ H′ ∗ ⊤)(m′,c′) ∧ c = n + c′
```

**Theorem 2 (soundness):** every rule of the base logic survives except `APP`, which is
*unsound* and is replaced by `APP-PAY` (a call consumes one credit). Instantiating `H′ = ∅`:
*"if `(m,c)` satisfies the precondition `H`, then the program `t` … runs safely and
terminates after at most `c` computation steps."*

The union-find specs are **concrete constants, not big-O** —
`find` costs `$(2·α(|D|) + 4)`, `union` costs `$(4·α(|D|) + 12)` — and the abstract predicate
`UF D R V` is *defined to include* "Φ time credits, where Φ is the current potential of the
data structure". Users never see Φ.

**The four-levels caveat (§2.7), which every cost theorem in this survey inherits.** The
paper enumerates four cost measures: (1) source-level calls of a specific kind, (2) all
source-level reduction steps, (3) machine instructions, (4) physical time. It attacks
**level 1 only**, and says of levels 1↔2 that the relation "could be formally stated and
verified, if desired. **(We have not done so.)**"

### 6.2 Asymptotics done soundly — "A Fistful of Dollars"

Guéneau, Charguéraud, Pottier, ESOP 2018,
[10.1007/978-3-319-89884-1_19](https://doi.org/10.1007/978-3-319-89884-1_19).

The paper's motivation is three **named pitfalls**, each shown as a worked *flawed* proof:
`waste n` "proved" `O(1)` when it is `O(n)` (the `O` hides an existential swapped with the
universal — the claim is `∃c ∀n`, induction gives `∀n ∃c`); `f n = g(n,0)` "proved" `O(1)`
(you cannot substitute a specific value into a bound that holds only for large arguments);
and Howell's example, the invalid `f ∈ O(g) ⇒ Σf ∈ O(Σg)`. Verdict, verbatim: *"the informal
reasoning style of paper proofs, where the O notation is used in a loose manner, is
unsound."*

The repair. **Definition 1 (Domination)** over a *filtered* type:
`f ≼_A g ≡ ∃c. 𝒰_A x. |f(x)| ≤ c·|g(x)|`. **Definition 2 (Filter)** requires covariance,
stability under binary and 0-ary intersection, and **nonemptiness** (`𝒰x.P ⇒ ∃x.P`).
*"it does not make sense to use the O notation without specifying which filter one
considers."* Multivariate bounds use product filters.

The credit-carrying specification is the `specO` record:

```coq
Record specO (A : filterType) (le : A → A → Prop) (bound : A → Z) (P : (A → Z) → Prop) :=
  { cost : A → Z;  cost_spec : P cost;  cost_dominated : dominated A cost bound;
    cost_nonneg : ∀x, 0 ≤ cost x;  cost_monotonic : monotonic le Z.le cost; }
```

**`cost_nonneg` is load-bearing, not decoration**: the splitting axiom `$(m+n) = $m ∗ $n`
needs `m,n ≥ 0`, else "out of `$0`, one would be able to create `$1 ∗ $(−1)`", discard the
negative half (the logic is affine), and **create credits out of thin air**.

Methodology, and it matters for the estate: assign `O` specs *at module boundaries* only —
*"during the analysis of a function body, we abandon the O notation"*, synthesizing a
concrete cost and discharging domination at the end.

**The methodological import worth stealing outright** comes from the follow-on, Guéneau,
Jourdan, Charguéraud, Pottier, *Formal proof and analysis of an incremental cycle detection
algorithm*, ITP 2019,
[10.4230/LIPIcs.ITP.2019.18](https://doi.org/10.4230/LIPIcs.ITP.2019.18). Its amortized
specs telescope (`add_edge` costs `ψ(m+1,n) − ψ(m,n)`), and alongside them the development
publishes a `DisposeGraph` lemma stating the abstract predicate is affine:

> "By publishing this statement, we guarantee that we are not hiding a debt inside the
> abstract predicate IsGraph."

**Any amortized cost spec for an entity store needs exactly this disposal lemma, or the
bound is unfalsifiable.**

Repos: `github.com/charguer/cfml` (last activity 2025-03-18), `github.com/charguer/tlc`
(2026-01-20), `gitlab.inria.fr/charguer/cfml2`, `gitlab.inria.fr/agueneau/incremental-cycles`,
`github.com/Armael/coq-procrastination` (2019-10-14, stale). Guéneau's 2019 thesis,
*Mechanized Verification of the Correctness and Asymptotic Complexity of Programs*, is the
consolidated account. CFML's library is roughly 5 kLoC. **Maturity: high, but narrow and
deliberately un-automated** — the authors "place emphasis on expressiveness, as opposed to
automation".

### 6.3 Iris time credits and time receipts

Mével, Jourdan, Pottier, *Time Credits and Time Receipts in Iris*, ESOP 2019. The interfaces
(Figs. 1–3), verbatim — **note the notation: `© n` for exclusive receipts and `¥ n` for
persistent ones**, correcting the brief's `✁`:

```
$ : ℕ → iProp        $(n₁+n₂) ≡ $n₁ ∗ $n₂        {$1} tick(v) {λw. w = v}
© : ℕ → iProp        ©(n₁+n₂) ≡ ©n₁ ∗ ©n₂        {True} tick(v) {λw. w = v ∗ ©1}
                     © N ⇛ False                  -- "no machine runs for N time steps"
¥ : persistent       ¥ max(n₁,n₂) ≡ ¥n₁ ∗ ¥n₂     © n ⇛ © n ∗ ¥ n
```

Persistent receipts obey **maximum, not addition**. Soundness, verbatim:

- **Theorem 1 (Iris$).** "If `{$n} e {True}` holds, then the machine configuration `(e, ∅)`
  … is safe and terminates in at most `n` steps."
- **Theorem 2 (Iris©).** "If `{True} e {True}` holds, then the machine configuration
  `(e, ∅)` is `(N−1)`-safe." — it takes *at least* `N−1` steps for `e` to crash.
- **Theorem 3 (Iris$©).** both, when `n < N`.

Receipts exist **not for performance** but to prove a bad event (machine-integer overflow)
cannot happen before an absurd amount of time passes. Mechanism: a `tick` translation
instruments the operational semantics, and Iris's own soundness theorem is "re-used as a
black box, without change".

**Lazy amortization:** Pottier, Guéneau, Jourdan, Mével, *Thunks and Debits in Separation
Logic with Time Credits*, POPL 2024, PACMPL 8(POPL) Art. 50,
[10.1145/3632892](https://doi.org/10.1145/3632892). A thunk carries a **debit**; paying is a
*ghost* operation ("there is no runtime accounting of debits") costing `k` credits and
reducing the debit by `k`. Two hard problems it names: **reentrancy** must be statically
forbidden, and **deep payment** — "a thunk's debit conceptually exists and can be updated
*before this thunk actually exists in the machine's memory*", yielding a debit-forwarding
rule essential for the banker's queue. Verified: streams, physicist's queue, implicit
queues, banker's queue.

Repo: `gitlab.inria.fr/cambium/iris-time-proofs`, created 2018-07-04, **last activity
2026-07-17**. Live, maintained, and **not merged into mainline Iris** — a standalone
Cambium project.

**Port cost.** Time credits are a *small ghost-state module* sitting on top of the entire
Iris base logic: step-indexing, OFEs/COFEs, cameras, the later modality, resource algebras,
fancy updates, invariants, weakest preconditions, and a language instance. **You do not get
to port the small module without the large one.**

### 6.4 Isabelle — the `T_f` idiom, and the three-logic comparison

**The cheapest technique in this entire survey.** Nipkow et al., *Functional Data Structures
and Algorithms: A Proof Assistant Approach*, ACM Books, §1.5 (fdsa-book.net), verbatim:

> "Our approach to reasoning about the running time of a function `f` is very simple: we
> explicitly define a function `T_f` such that `T_f x` models the time the computation of
> `f x` takes. More precisely, `T_f` counts the number of non-primitive function calls in
> the computation of `f`. **It is not intended that `T_f` yields the exact running time but
> only that the running time of `f` is in `O(T_f)`.**"

The translation is meta-level, not in the logic:

```
E[ f p₁ … pₙ = e ]  =  (T_f p₁ … pₙ = T[e] + 1)
T[ f e₁ … eₙ ]      =  T[e₁] + … + T[eₙ] + T_f e₁ … eₙ
T[ if b then e₁ else e₂ ] = T[b] + (if b then T[e₁] else T[e₂])
T[ case e of pᵢ ⇒ eᵢ ]    = T[e] + (case e of pᵢ ⇒ T[eᵢ])
T[ let x = e₁ in e₂ ]     = T[e₁] + (let x = e₁ in T[e₂])
```

with `T_f … = 0` for variables, constructors, and predefined bool/number ops. Example:
`T_append [] ys = 1`, `T_append (x#xs) ys = T_append xs ys + 1`, then
`T_append xs ys = |xs| + 1` by one-line induction.

**What it requires of the host logic: nothing but structural recursion and arithmetic.** No
program logic, no heap, no separation, no step-indexing.

**What it cannot do**, stated by the authors: it has **no connection to real execution**
(*"A full proof that the execution time of our functional programs is in O(T_f) on some
actual software and hardware is a major undertaking… **We do not offer such a proof.** Thus
our formalization of 'time' should be seen as conditional."*); it abstracts call-by-value,
so under **laziness/memoization it is a very loose upper bound** — which is exactly why the
POPL 2024 debits work exists; and higher-order functions need the timing function threaded
explicitly (`T_map T_f (x#xs) = T_f x + T_map T_f xs + 1`).

**Automation exists, in the Isabelle distribution, not the AFP:**
`src/HOL/Library/Time_Commands.thy` (Jonas Stahl) provides `time_fun`, `time_function`,
`time_definition`, `time_partial_function`, `time_fun_0`, with `time_prefix = "T_"`;
`Time_Functions.thy` (Eberl, Nipkow) applies them to the standard library, with an explicit
warning that constant-time assumptions for predefined functions are the user's obligation.

**Amortization:** Nipkow (ITP 2015) / Nipkow & Brinkop (JAR 62(3), 2018,
[10.1007/s10817-018-9459-3](https://doi.org/10.1007/s10817-018-9459-3)) — the potential
method in plain HOL with **no program logic at all**. A locale fixes `inv`, `Φ : 's ⇒ real`
with `Φ init = 0` and `inv s ⟹ 0 ≤ Φ s`, and the per-operation obligation is exactly

```
inv s ⟹ t f s + Φ (nxt f s) − Φ s ≤ U f s
```

Binary counter: `Φ s = |filter id s|`, `U () s = 2`. AFP `Amortized_Complexity` (submitted
2014-07-07, last change 2026-02-06, 19 theories, BSD) covers skew heaps, splay trees, splay
heaps, pairing heaps; `Root_Balanced_Tree` reaches amortized **logarithmic** bounds.

**The comparison that settles methodology.** Haslbeck & Nipkow, *Hoare Logics for Time
Bounds*, TACAS 2018,
[10.1007/978-3-319-89960-2_9](https://doi.org/10.1007/978-3-319-89960-2_9); AFP `Hoare_Time`
(2018-02-26, last change 2026-02-06, 30 theories). Over IMP with a time-counting big-step
semantics `(c,s) ⇒^t s′`, they mechanize **three** logics — Nielson's (classical Hoare with
logical variables and explicit bounds, natively big-O), quantitative Hoare logic (assertions
replaced by potentials `state ⇒ ℕ∞`, after Carbonneaux et al.), and separation logic with
time credits (after Atkey and Charguéraud–Pottier) — each **sound and complete, each with a
sound and complete VCG**, and prove the interrelations (`⊨₁ ⇄ ⊨₂′` by Lemmas 6–7;
`⊨₂′ ⇄ ⊨₃′` by Lemmas 8–9, though "as the third system … talks about partial states, in
general it cannot be simulated by any of the other systems").

Four conclusions, all directly usable:

1. **Do exact cost first, abstract to big-O last.** Verbatim: *"The approach inspired by
   Nielson to incorporate abstraction from multiplicative constants directly into the Hoare
   Logic … **shows weaknesses and seems to complicate matters**. Our theoretical results show
   that **it is always possible to reason about the exact running time and abstract away
   multiplicative constants in a last step**."* This independently confirms the
   Fistful-of-Dollars methodology.
2. **Big-O buys less than expected:** *"we can get rid of multiplicative constants, but not
   additive ones!"*
3. **Potentials are not modular; separation logic is.** *"One drawback of the quantitative
   Hoare logic is that it is not modular… If we change c₂, resulting in a changed time
   consumption, also the analysis for c₁ has to be redone."*
4. **Amortization is not exclusive to the potential method** — Lemma 6 shows Nielson's logic
   supports it too, in theory.

**Other Isabelle work:** Zhan & Haslbeck, IJCAR 2018 (arXiv:1802.01336) — Imperative HOL +
separation logic + time credits with `auto2` automation, arriving independently at the same
filter-based Landau formulation two months before Fistful of Dollars; repo
`bzhan/Imperative_HOL_Time` last pushed 2021-04-14, semi-dormant. Haslbeck & Lammich, *For a
Few Dollars More*, ESOP 2021 — verified fine-grained analysis **down to LLVM** via the
**NREST** monad ("Nondeterministic RESult monad with Time"), now AFP `NREST` (submitted
2024-09-16, last change 2026-02-06).

### 6.5 CakeML — the one line that closes the level gap (for space)

Gómez-Londoño, Åman Pohjola, Syeda, Myreen, Tan, *Do You Have Space for Dessert? A Verified
Space Cost Semantics for CakeML Programs*, PACMPL 4(OOPSLA) Art. 204,
[10.1145/3428272](https://doi.org/10.1145/3428272). A **space** cost semantics answering
"what is a sufficient amount of memory for my program never to reach out-of-memory?" — the
first for a garbage-collected language — phrased over a CakeML compiler IL so that results
"map directly to the space cost of the compiler-generated machine code". In HOL4. **This is
the only development in this survey that closes the level-1-to-level-3 gap** — and it does
so for space, not time. No corresponding CakeML *time* cost semantics was located.

**VST / Perennial: negative result.** No cost or time reasoning found, and neither appears
in the POPL 2024 related-work survey of time-credit users.

### 6.6 Lean 4 — see §8

The mechanized-cost reader's Lean findings are folded into §8, which is the estate-facing
gap assessment. Two items belong here as *negative* results in this thread's own terms:

- **There are no time credits in Lean 4.** `leanprover-community/iris-lean` (215 stars,
  pushed 2026-08-24, 298 `.lean` files) has the full Iris algebra stack — OFE/COFE, CMRA,
  step indices, `Auth`/`Agree`/`Excl`/`Frac`/`View`, `BI`, `WeakestPre`, `ProofMode`,
  invariants, and a complete `HeapLang` — and **requires only Qq and Batteries, not
  Mathlib** (toolchain v4.32.2). But its only `*redit*` file is
  `Iris/Instances/Lib/LaterCredits.lean`, and **later credits ≠ time credits**: later
  credits (Spies et al., ICFP 2022) exist to strip `▷` modalities and have nothing to do
  with execution cost. There is no `$n`, no `tick`, no cost-instrumented operational
  semantics, and no Iris$-shaped soundness theorem anywhere in Lean 4.
- **Batteries states complexity only in doc-comments.** `Batteries/Data/PairingHeap.lean`
  carries `/-- Amortized O(log n). … -/` with **no cost function, no theorem, and no
  proof**; `BinomialHeap.lean`, `RBMap.lean`, `BinaryHeap.lean` do not mention complexity at
  all. **Lean 4's standard amortized data structures have entirely unverified complexity
  claims.**

Also negative: the Lean verification frameworks do not do cost. **Velvet** (Gladshtein et
al., CAV 2026) is a Dafny-style verifier over the **Loom** framework with effects as monad
instances — its only "cost"/"complexity" hits are about *proof* cost — though its monadic-
effects architecture is the natural place a `TimeM`-style effect could be added. **Yolo**
(ITP 2026, [10.4230/LIPIcs.ITP.2026.6](https://doi.org/10.4230/LIPIcs.ITP.2026.6)),
**Veil**, and **LeanSSR** do no cost reasoning.

### 6.7 Verdict

**(a) Entity store.**

| Approach | Verdict |
|---|---|
| **`T_f` / `TimeM` paired cost functions** | **Adopt now.** Decode and canonicalization are pure structural functions; `T_decode`, `T_canon` mirror them by structural recursion and bounds follow by induction. Zero infrastructure. |
| **Nipkow potential method** | **Adopt when — and only when — the store gains a rebalancing/rehashing operation.** One `Φ : Store → ℕ` and one inequality per operation. Still no program logic. |
| **Separation logic with time credits** | **Reject.** The point of `$n` is *mutable heap* ownership; a content-addressed store is immutable and shareable by construction. The discipline buys almost nothing and costs the entire Iris stack. |
| **Thunks and debits** | **Reject — but record it as a design constraint.** If decode is memoized-on-demand (plausible for large entities), `T_f` becomes a loose upper bound by the FDSA book's own admission, and only the POPL 2024 machinery is sound. **If you want cheap cost proofs, do not make decode lazy.** |
| **Asymptotics** | **Defer.** Prove exact ℕ bounds; abstract at the module boundary only if a client needs it (TACAS 2018 conclusion 1). |

**Mandatory methodological import:** any *amortized* store spec must publish the analogue of
`DisposeGraph` — a lemma that the store predicate can be discarded — certifying that no debt
is hidden inside the abstract predicate. Without it the bound is unfalsifiable.

**(b) Runtime lane.** A **fuel-indexed evaluator with an exact step count** is the
Lean-native analogue of `t/m ⇓ⁿ v/m′` and should be *the definition of cost*; a `TimeM`-style
instrumented interpreter is its executable counterpart; a big-step-with-time semantics is the
specification (and TACAS 2018 proves a Hoare logic over exactly that shape sound *and*
complete, so it is a known-good foundation rather than a guess). Iris time credits are
justified only if the runtime lane is both concurrent and heap-mutating — and adding them to
`iris-lean` means porting the Cambium development on top of a port still in progress. That is
a research project.

---

## 7. Cost in the interaction-tree world

### 7.1 The finding, stated plainly

**This is a solved-but-unlabelled area masquerading as an open one.** Two facts, both
verified:

- **There is no paper, library, or repository anywhere titled or scoped as
  "cost-instrumented interaction trees."** Not one of the 178 papers citing Xia et al.
  POPL 2020 ([10.1145/3371119](https://doi.org/10.1145/3371119)) instruments an ITree with
  cost. Across 143 `.v` files of `DeepSpec/InteractionTrees` (256 stars, last commit
  2026-06-12): **zero** occurrences of `cost`, `gas`, `tick`, `budget`, `resource`,
  `graded`, `complexity`, `credit`. Same for `vellvm/ctrees` (41 `.v`, last dev commit
  2026-03-26) and `vellvm/vellvm` (490 stars, pushed 2026-08-10).
- **The exact mechanism the estate would need has nevertheless been built, published,
  mechanized in Rocq, and independently re-implemented in Lean 4 — by people solving a
  different problem.** It was built for step-indexing, and its authors never call it cost.

### 7.2 The Tau tension, resolved

`DeepSpec/InteractionTrees`, `theories/Eq/Eqit.v` (lines 139–151) defines one relation
family with two Tau-stripping switches:

```coq
Definition eqit b1 b2 : itree E R1 -> itree E R2 -> Prop := paco2 (eqit_ b1 b2 id) bot2.
Definition eq_itree := eqit false false.   (* Tau-for-Tau: counts exactly *)
Definition euttge   := eqit true false.    (* strips on one side *)
Definition eutt     := eqit true true.     (* strips on both: the equational theory *)
```

So the standard equational theory (`eutt`) **erases finite Tau runs by construction**, and
`eutt` is the only relation `interp`, `iter`, and the rewriting infrastructure are set up
to respect. Nobody has used `eq_itree` or `euttge` as a cost equivalence (GitHub code
search `eutt cost` language:coq → 0, with validated positive controls).

**And they should not.** There is a second, independent reason beyond the erasure: even
under `eq_itree`, Tau counts are an artifact of *how `bind`/`iter` were written*, not of the
program. `iter` inserts a guard Tau for productivity, not because a step occurred — this is
precisely the guardedness chain `entity-store-kickoff.md` §13 already recorded. **Counting
Taus would make the cost model depend on combinator plumbing.**

### 7.3 The mechanism that exists: cost as an event, discharged by a budget handler

**Vistrup, Sammler, Jung, *Program Logics à la Carte*, POPL 2025 / PACMPL,
[10.1145/3704847](https://doi.org/10.1145/3704847).** Artifact
[10.5281/zenodo.13939385](https://doi.org/10.5281/zenodo.13939385); upstream
`gitlab.mpi-sws.org/iris/itree-program-logic`; maintained Rocq-9 fork
`github.com/mbrcknl/rocq-iris-itree` (created 2025-10-17, pushed 2025-11-28).

`src/step.v` is structurally exactly the `TickE` design:

```coq
Variant stepE : Type → Type :=
  (** An event that marks that a step has been taken. This can be thought of as
  the semantic analogue of the logical later modality [▷ P]. *)
  | EStep : stepE ().

Definition step `{stepE -< E} : itree E () := trigger EStep.
```

Four interpretations of that **one** event are proved: a logical handler sending `EStep` to
`▷`; an executable **budget** handler whose state is a `nat` and whose each `EStep` demands
a successor and decrements; an adequacy instance
`stepEH_adequate ... := {| sehandler_inv s := £ s |}` linking the handler budget to Iris
**later credits** (`£ s`) — a mechanized "one tick = one credit" theorem; and an
interpretation `step_ifn` that *"replaces `EStep`s by `Tau`s"* and truncates after a bound,
where `TauF t => Ret (inl (n, t))` means **pre-existing Taus cost nothing; only `EStep`
events debit the budget.**

The architectural statement, from the artifact's own `coq_vs_paper.md` §6.0:

> "we actually only have **one denotation, the one with step events** … Whether or not
> these step events do anything (and thus whether or not we do total or partial
> verification) is **controlled by the parameter `m : later_modality`**"

**One tree; the handler decides whether steps are charged.** That is the calf phase
distinction, arrived at from the opposite direction.

**The honest caveat.** The file's stated purpose is *"doing termination insensitive
reasoning in spite of our [WPi] being defined as a least fixpoint"*; the POPL 2025 abstract
never mentions cost, time, or resources. **The mechanism is a cost mechanism; the framing
is not.**

### 7.4 The unused infrastructure already in the ITree library

`theories/Events/Writer.v` ships the general writer idiom:

```coq
Variant writerE (W : Type) : Type -> Type := | Tell : W -> writerE W unit.
Definition handle_writer {W E} (Monoid_W : Monoid W) : writerE W ~> stateT W (itree E) := …
Definition run_writer  {W E} (Monoid_W : Monoid W) : itree (writerE W +' E) ~> writerT W (itree E)
```

`writerE ℕ` + `run_writer (ℕ, +, 0)` **is** a monoid-graded cost semantics, available in the
pinned library today. **No development instantiates it as cost.**

### 7.5 The one serious mechanized cost-for-interactive-programs effort explicitly declines ITrees

**Tockman, Singh, Erbsen, Gruetter, Chlipala, *Foundational Verification of Running-Time
Bounds for Interactive Programs*, CPP 2026, pp. 187–200,
[10.1145/3779031.3779088](https://doi.org/10.1145/3779031.3779088).** It cites ITrees once,
to set them aside:

> "While alternative approaches like interaction trees [31] reformulate the shape of
> specifications, Bedrock2 retains the simple structure of Hoare logic, just enriching state
> with the ghost I/O log."

Their design extends the omnisemantics configuration `c/m/ℓ/τ` to a five-tuple
`c/m/ℓ/τ/μ` with `μ : MetricLog` — a four-field ℤ record (`instructions, stores, loads,
jumps`) with pointwise add/sub/leq, i.e. **a free commutative monoid carried as ghost
state**. Bounds are stated as the *difference* between starting and ending metrics, and
postconditions may mention the whole I/O trace. Proofs compose down to RISC-V machine code;
the capstone is a real microcontroller system. Repo `mit-plv/bedrock2` (335 stars, pushed
2026-08-25), branch `metriclightbulb`.

**Judgment.** This is the strongest single piece of evidence that *cost-for-interactive-
programs* and *interaction trees* are, today, disjoint communities. It is also the best
available template for the "separate cost-carrying denotation plus a bridge theorem"
option.

### 7.6 Adjacent instruments worth naming

- **Veltri & Voorneveld, *Inductive and Coinductive Predicate Liftings for Effectful
  Programs*, MFPS 2021, EPTCS 351:260–277, arXiv:2112.14057** (Agda:
  `niccoloveltri/ind-coind-pred-lifts`). Their container-indexed coinductive free monad has
  `sk` = Tau, and Example 4 makes step-observability a **parameter of the observation
  family, not of the tree**: with `O = {↓}` you observe only termination; with `O = ℕ`,
  *"we may consider `sk` to be observable, for instance as a measure of evaluation time"*,
  yielding "termination within at most `n` skips". Same tree, two theories. **This is the
  principled statement of why option (1) below is right rather than merely convenient**, and
  it lands exactly on `REL-001`'s territory in the runtime document.
- **GITrees** (Frumin, Timany, Birkedal, POPL 2024,
  [10.1145/3632854](https://doi.org/10.1145/3632854); `logsem/gitrees`, last commit
  2026-06-23) is the nearest existing thing to a *graded* ITree: `Tick := Tau ◎ NextO`,
  `Tick_n`, `Tick_add : Tick_n (k+l) α = Tick_n k (Tick_n l α)` (an ℕ-monoid action on the
  tree type) and `Tick_inj` (**ticks are not quotiented away**). It got there by *dropping
  weak bisimulation* — GITrees have no `eutt`; equality is the step-indexed OFE. That is the
  price of grading the tree type.
- **Silver & Zdancewic** (Dijkstra monads for ITrees, POPL 2021
  [10.1145/3434307](https://doi.org/10.1145/3434307); ITree Specifications, ECOOP 2023) are
  termination-sensitive, not cost-sensitive.
- **ctrees / probabilistic:** nothing. No weight, probability, or cost extension of Choice
  Trees exists; all 7 citing papers are non-quantitative.
- **False positive worth recording:** `isabelle-utp/interaction-trees` matches `tick` and
  `gas`, but `tick` is notation for `Ret` (the CSP ✓ event) and `gas` is a RoboChart
  chemical-sensor channel. No cost.

### 7.7 Lean 4 ITree ecosystem — cost status per repo

| Repo | Stars | Last commit | `eutt`-class relation | **Cost?** |
|---|---|---|---|---|
| `Verified-zkEVM/PolyFun` | 13 | 2026-08-23 | **yes** (`WeakBisim`, `TauSteps`, `Bisim`) | on `FreeM` yes; **on `ITree` no** |
| `ISTA-PLV/coinductive` | 10 | **2026-08-19** | **none at all** | **YES — `stepE` + budget handler** |
| `mit-plv/lean4-itree` | 17 | 2026-05-07 | strong `IEq` only | no |
| `boogie-org/lean-itrees` | 17 | 2025-01-13 (dead) | `Eutt` with `sorry`s | no (only `run … (fuel : Nat)`) |

**The cleanest statement of the Lean gap: the one Lean 4 ITree library that has cost has no
`eutt`; every Lean 4 ITree library that has `eutt` has no cost.**

`ISTA-PLV/coinductive/ITree/Effects/Step.lean` — verified by direct fetch on this host — is
a Lean port of the Vistrup design (Apache-2.0, created 2026-02-03, pushed 2026-08-19,
`lean-toolchain` = **v4.32.0**, so still below the estate's v4.33.1 floor, matching §13's
earlier measurement):

```lean
def stepE : Effect.{u} where
  I := PUnit
  O _ := PUnit

def StepE.step {E : Effect.{u}} [stepE -< E] : ITree E PUnit := stepE.trigger ⟨⟩

/- nl is the number of laters per step. First component of the state is
the number of steps taken so far. Second component of the state is the number of steps left. -/
def stepEH (nl : Nat → Nat) : SEHandler stepE (ULift.{v} Nat × ULift.{v} Nat) where
  handle i s p :=
    nl s.1.down ≤ s.2.down ∧ p ⟨⟩ (ULift.up (s.1.down + 1), ULift.up (s.2.down - nl s.1.down))
  handle_mono := by grind
```

A `(taken, remaining)` state, a **per-step charge function `nl : Nat → Nat`** that can vary
with progress, and failure when the budget runs out; `exec_step` is the proof rule. And
crucially, the *monadic* handler charges nothing —
`instance stepMH [Monad m] : SMHandler stepE m where handle _ := return ⟨⟩` — so **the same
tree runs free under execution and costed under specification.** (Michael Sammler, a
co-author of the POPL 2025 Rocq work, is among the repo's committers.)

**PolyFun's near-miss, and its own admission.** `PolyFun/PFunctor/Bound.lean` carries a
general cost discipline on the *inductive* free monad:

```lean
def IsRollBound (oa : FreeM P α) (budget : B)
    (canRoll : P.A → B → Prop) (cost : P.A → B → B) : Prop := …
```

— an arbitrary budget type `B` and a **cost function keyed on the event position `a : P.A`**,
i.e. cost-in-the-signature in general form, with congruence/`map`/`bind`/projection lemmas,
specialized in `Verified-zkEVM/VCVio` as `IsQueryBound` for cryptographic query counting.
It never touches `ITree`. Two receipts from PolyFun read as a specification of the gap:

- `PolyFun/ITree/Trace.lean`: *"This explicit policy means finite traces observe replies and
  returns, **but not the number of silent steps**."*
- `PolyFun/Realizability/StepClass.lean:27–28`: *"`Hom` is a proposition because the
  realizability layer only ever asks whether a step map is admissible; **a cost-bearing
  refinement, in which witnesses carry running-time and description-size measures, would
  replace it by a `Type`-valued field**."* — the cost-bearing version is named as future
  work, in the source.

### 7.8 Design consequence — where cost must live

**Not in the Taus.** Two independent reasons, both with receipts (§7.2).

Ranked, for when the runtime lane reaches T5:

1. **In the event signature `E` — the recommended lane.** A `TickE`/`stepE` event. Decisive
   property: **`eutt` preserves the `Vis` trace**, so two `eutt`-equal trees emit the same
   tick sequence and an event-borne cost model is *automatically* compatible with the
   standard equational theory. You keep `eutt`, `interp`, `iter`, and all the rewriting
   infrastructure. Cost is then a `Monoid W` and a handler. Two working precedents (Rocq
   and Lean). Keep two handlers as ISTA-PLV does — a free one for execution, a charging one
   for specification — over **one denotation**.
2. **A graded index on the tree type — unexplored and expensive.** Nobody has built a graded
   ITree; the nearest artifact (GITrees) got its ℕ-graded structure by abandoning weak
   bisimulation. Grading the tree type means rebuilding the equational theory, `interp`, and
   `iter` against a cost-sensitive relation with no prior art to borrow. Do not lead with
   this.
3. **A separate cost-carrying denotation plus a proved relation — the proven fallback.**
   bedrock2's route (§7.5), and the only design demonstrated to carry cost bounds all the
   way to machine code. Choose it if the runtime lane ever needs *tight machine-level*
   bounds rather than *abstract source-level* charges; the price is a second semantics plus
   a bridge theorem.

### 7.9 Verdict

**(a) Entity store.** Not applicable — §13 already ruled that the store's finite inductive
carrier needs no coinduction, and cost does not change that.

**(b) Runtime lane.** The estate is not entering unexplored territory; it is entering
territory where the machinery was built by people solving a different problem. **Naming it
as cost is itself the contribution.** The trigger is unchanged from §13: when T5 opens.
When it does, the design is settled in advance — cost as an event in `E`, two handlers, one
denotation — and there are two implementations to read, one of them in Lean 4.

---

## 8. The Lean 4 gap, measured

Everything in this section was verified on this host today by direct fetch or by building.

### 8.1 What Lean 4 already has — more than expected, and not enough

**`leanprover/cslib` — the official Lean Computer Science Library (670 stars, pushed
2026-08-24) — already ships a cost monad.** `Cslib/Algorithms/Lean/TimeM.lean`, 142 lines,
Apache-2.0, authors Sorrachai Yingchareonthawornhcai and Eric Wieser, © 2025, zero `sorry`:

```lean
structure TimeM (T : Type*) (α : Type*) where
  ret  : α          -- The return value of the computation
  time : T          -- The accumulated time cost of the computation
```

with `pure` at zero cost, `bind` summing costs, `Functor`/`Seq`/`SeqLeft`/`SeqRight`
instances, a proved `instance [AddMonoid T] : LawfulMonad (TimeM T)`, `tick (c : T)`,
do-notation macros `✓[c]` and `✓`, and notation `⟪tm⟫` for `.ret`. **This is precisely the
counting model of calf** — `F(A) = C × A` — under a different name, in the official
library.

Its consumer `Cslib/Algorithms/Lean/MergeSort/MergeSort.lean` (207 lines, zero `sorry`)
proves both halves about the same program:

```lean
theorem mergeSort_correct (xs : List α) : IsSorted ⟪mergeSort xs⟫ ∧ ⟪mergeSort xs⟫ ~ xs
theorem mergeSort_time (xs : List α) :
    let n := xs.length
    (mergeSort xs).time ≤ n * clog 2 n
```

**Lean 4 therefore already has a kernel-checked `n·⌈log₂ n⌉` comparison bound for merge
sort** — the exact bound AARA cannot infer (§3.3 Limit A), obtained the Nipkow way: by
hand, with no inference and no basis restriction.

**And the library states its own limitation, in the docstring, verbatim:**

> "## Design Principles
> 1. **Pure inputs, timed outputs**: Functions take plain values and return `TimeM` results
> 2. **Time annotations are trusted**: The `time` field is NOT verified against actual cost.
>    You must manually ensure annotations match the algorithm's complexity in your cost model.
> 3. **Separation of concerns**: Prove correctness properties on `.ret`, prove complexity on `.time`"

Read those three against §1. Principle 3 **is** the phase distinction — as a *convention*.
Nothing prevents a specification from mentioning `.time`; nothing makes "behaviour cannot
observe cost" a theorem. Principle 2 names the other gap honestly: there is no bounding
theorem relating `.time` to any operational semantics, so a `TimeM` cost claim is a claim
about a Lean definition (G1/G2-about-the-model) and nothing more.

Caveats for the estate: `TimeM` **requires Mathlib** (`Mathlib.Algebra.Group.Defs`; the
merge-sort bound additionally needs `Nat.clog`), and cslib's `lean-toolchain` is
**v4.34.0-rc2**, above the estate's v4.33.1 floor.

**Other Lean 4 material located:**

| Artifact | What it gives | Caveats |
|---|---|---|
| `Mathlib/Computability/TuringMachine/Computable.lean` | `TM2OutputsInTime`, `TM2ComputableInTime`, `TM2ComputableInPolyTime` — structures carrying a step bound | machine-level only; the header itself notes a "fundamental steps"/constant-factor caveat |
| `Mathlib/Computability/AkraBazzi/` (Dupuis, 2023) | the **Akra–Bazzi theorem**, `isTheta_asympBound` — divide-and-conquer recurrence *solving* | solves recurrences; says nothing about where they come from |
| Mathlib `Asymptotics.IsBigO` / `IsTheta` | asymptotics as a library | as above |
| Mathlib issue [#35366](https://github.com/leanprover-community/mathlib4/issues/35366) (opened 2026-02-15, **still open** at 2026-04-16) | proposes `Turing.TM1.runN` fuel-based step counting and `InP`/`InNP`; author reports zero `sorry` against Mathlib v4.28.0-rc1 | not merged; Mathlib has **no** TM1 step counting today |
| `ISTA-PLV/coinductive` `ITree/Effects/Step.lean` | `stepE` + `stepEH` budget handler + `exec_step` (§7.7) | toolchain v4.32.0; no `eutt` at all |
| `Verified-zkEVM/PolyFun` `PFunctor/Bound.lean` | `IsRollBound` — general event-keyed cost bound on the *inductive* free monad | never touches `ITree`; cost-bearing ITree refinement named as future work in the source |
| `leanprover-community/iris-lean` (215 stars, pushed 2026-08-24, 298 `.lean` files) | the full Iris algebra stack — OFE/COFE, CMRA, step indices, `Auth`/`Agree`/`Excl`/`Frac`/`View`, `BI`, **`WeakestPre`**, `ProofMode`, invariants — and a complete `HeapLang`; **`Iris/lakefile.toml` requires only Qq and Batteries, not Mathlib** | toolchain v4.32.2; its only `*redit*` file is `LaterCredits.lean`, and **later credits ≠ time credits** — no `$n`, no `tick`, no cost-instrumented semantics |
| `CoreyThuro/RB-TT` (arXiv:2512.06952, Mannucci & Thuro, 7 Dec 2025) | markets itself as a resource-bounded type theory in Lean, v4.28.0, **no Mathlib** | 4 stars; **unreviewed preprint**; commits are largely "agent formalization attempt"; `Meta/STLCMachineSoundness.lean` carries **7 `sorry`** (its own header: "App cost bound sorry (higher-order gap)"), `Semantics/PresheafSet.lean` 5 more plus a postulated `axiom add_assoc_iso`, `Core/Modality.lean` a postulated `axiom box_intro`. **Not a precedent to build on.** |
| `Verified-zkEVM/VCVio`, `janmasrovira/prim-parser`, `palladin/lean-linq` | three real third-party **graded monads** in Lean 4 — including graded `do` notation and a graded Freer Dijkstra monad with symbolic cost grades (§4.5) | none in core/Batteries/Mathlib; VCVio staged for upstreaming but not submitted |

### 8.2 What Lean 4 does not have

- **No port of calf, decalf, or Giralf.** No Rocq/Coq or Isabelle port either. The two most
  important recent mechanizations in this whole survey are in **Agda** (calf; Cubical Agda
  for the 2026 Giralf work) and **Istari** (LFPL, LICS 2026). Neither is a system the estate
  uses.
- **No phase distinction as a theorem.** cslib's Principle 3 is a comment.
- **No graded monad in the effect-grading sense.** (See §4. Mathlib's `GradedMonoid` /
  `DirectSum` "graded" is grading of *algebras* by a monoid — a different notion.)
- **No bounding theorem** relating any Lean cost annotation to an operational semantics.
- **No amortized-complexity framework** — nothing corresponding to Nipkow's AFP locale.
- **No time credits / separation-logic cost reasoning.**

### 8.3 What ports and what does not — calf's discipline into Lean

The centrepiece question. calf's phase distinction is stated with an **abstract proposition
`¶E` plus the axiom `step/¶E : #(step^c(e) = e)`**. Postulating that in Lean means a new
axiom outside the estate's allowlist — a non-starter under the fips202-era discipline.

**But calf's own counting model (§5.1 of the POPL 2022 paper) is concrete:** `F(A) = C × A`,
and the extensional phase is the quotient that forgets the first component. In Lean, that
quotient is `Quot`, and **`Quot.sound` is already in the allowlist.** So the phase
distinction is available as a *theorem*, not an axiom.

**[probe]** `cost-denotation-lean-probe.lean`, 301 lines, bare Lean 4 v4.33.1, no Mathlib,
no imports, zero `sorry`, zero warnings, 0.33 s:

```lean
def BehRel (M : CostMonoid) (A : Type) (e e' : Cmp M A) : Prop := e.val = e'.val
def Beh (M : CostMonoid) (A : Type) : Type := Quot (BehRel M A)
def beh (e : Cmp M A) : Beh M A := Quot.mk _ e

/-- calf's axiom `step/¶E` — here derived, using only `Quot.sound`. -/
theorem beh_step (c : M.C) (e : Cmp M A) : beh (step M c e) = beh e := Quot.sound rfl
```

`#print axioms beh_step` → `[Quot.sound]`. The most axiom-hungry declaration in the whole
probe reports `[propext, Classical.choice, Quot.sound]` — **exactly the allowlist**.

| calf construct | Lean 4 status | Cost of the port |
|---|---|---|
| ordered cost monoid `isCostMonoid(C,0,+,≤)` | **[probe]** a bundled `structure`, instantiated at ℕ | free |
| `step`, `step0`, `step+`, `bindstep`, `lamstep`, `pairstep` | **[probe]** theorems about `C × A`, not axioms | free |
| CBPV `F`/`U`, `ret`, `bind` | **[probe]** `Cmp`, `ret`, `bind`; monad laws hold **on the nose** | free |
| open modality `#`, axiom `step/¶E` | **[probe]** `Quot (BehRel)`; `beh_step` by `Quot.sound` | free, inside the allowlist |
| noninterference Thm 2.4 | **[probe]** `noninterference`; and `Quot.lift` makes cost-obliviousness a *definitional obligation* | free |
| nondegeneracy Thm 5.6 | **[probe]** `step_nondegenerate` at ℕ | free (trivial in a concrete model) |
| `isBounded` + Return/Step/Bind/Relax | **[probe]** all four proved | free |
| parallel cost monoid `(ℕ², ⊕, ⊗)` | an instance of the same structure | cheap, not yet written |
| **closed/intensional modality `●`** | **absent** — needs a pushout / HIT | **does not port** without cubical/HoTT |
| **noninterference Thm 2.5** (`●A → #B` constant) | **absent** — depends on `●` | does not port |
| **fracture and gluing** (AFAT, Giralf) | **absent** — needs univalence | does not port |
| **decalf's intrinsic preorder on every type** | **absent** — needs directed type theory | does not port |

**The honest ceiling, stated once.** In calf, noninterference is *internal*: the type theory
itself forbids a behavioural function from observing cost. In Lean, `Cmp` is a concrete
structure and `e.cost` is always in reach; only functions *typed at* `Beh` are forced to
be cost-oblivious, and that forcing is real (`Quot.lift` demands the proof) but must be
*chosen* by typing the specification at `Beh`. The enforceable discipline is therefore:

> **Every behavioural specification, equivalence, and canonicalization theorem is stated at
> `Beh`, never at `Cmp`.** A proof that accidentally depended on cost then does not
> typecheck.

That is weaker than calf and stronger than cslib's comment. **[probe]** the payoff is the
transport lemma, which is the property the estate actually needs:

```lean
theorem walk_transport (P : Nat → Prop) (t : Tree) (h : P t.total) :
    P (behVal (beh t.walk)) := by rw [walk_behavior]; exact h
```

— any existing theorem about the cost-free specification transports to the instrumented
program **with no cost hypothesis added**. Instrumenting the model does not make the model's
other theorems conditional.

### 8.4 What the estate could stamp today

| Gate | Statement | Status |
|---|---|---|
| **G1** | The cost monoid, the cost-carrying computation type, `step`/`ret`/`bind`, the behavioural phase, and the `isBounded` refinement are modelled in Lean 4. | **[probe]** available now, 301 lines, allowlist-clean |
| **G2** | The `step` equations, the monad laws, noninterference, non-degeneracy, and the four `isBounded` rules are kernel theorems. | **[probe]** available now |
| **G2** | An exact cost and a behavioural specification are proved about the *same* decode/canonicalize program over the store's carrier. | available as soon as the carrier exists; the probe does it for a toy `Tree` |
| **G2** | Existing canonicalization/equivalence theorems transport unchanged. | **[probe]** available now (`walk_transport`) |
| G3 | The Lean cost model agrees with a measured runtime cost on an enumerated fixture domain. | **not available.** Requires a cost-observation profile under `OBS-001` and a runner; and the runtime document's own warning applies — the measurement instrument perturbs the measured system, which is why the *model* side must be denoted |
| G4 | A translation preserves cost between two formally defined domains. | not available; needs both semantics first |

**The clean statement: everything the entity store needs from this literature is G1/G2 and
is reachable today with no Mathlib, no new axioms, and roughly 300 lines. Everything the
runtime lane needs is gated behind its own T5.**

---

## 9. Honest gaps

**Things this survey could not verify.**

- **Hofmann & Jost, POPL 2003**, the origin of AARA, was not read in the original: the
  Edinburgh mirror 404s and `www2.tcs.ifi.lmu.de` did not resolve. Everything reported about
  it comes from Hofmann and Jost's own MSCS 2022 retrospective — authoritative for their own
  paper, but not the primary text.
- **Hudson, *Computer-Checked Recurrence Extraction for Functional Programs*** (MA thesis,
  Wesleyan 2016, advisor Licata), reportedly >5,000 lines of Agda: **PDF 404s, repository
  object 403s.** The figure rests on a catalog record and a downstream citation. Do not cite
  as verified. Likewise the PLPV 2013 Coq development's code link is **dead**
  (`wesscholar.wesleyan.edu/compfacpub` → bare Digital Collections root, checked 2026-08-25).
- **Haslbeck & Lammich, *For a Few Dollars More*** — the exact statement of the end-to-end
  source→LLVM theorem was not obtained (Springer paywalled; the TOPLAS preprint URL served
  HTML).
- **PFPL §7.4's Theorem 7.7** number is unverified against print; the free abbreviated
  edition omits Chapter 7's body, and the two editions renumber chapters (39 vs 37).
- **Wang, Hoffmann, Reps, *Central Moment Analysis*** (PLDI 2021) confirmed by citation only.
- **Gavazzo's 2025–2026 output** is unverified (dblp returned 503; his homepage ends at
  2024). This is the largest single hole in §5.
- **Adámek, FoSSaCS 2026** (paywalled, no preprint) and **Mio's 2024 HDR** (HAL blocked) were
  not read.
- **`gitlab.inria.fr/cambium/iris-time-proofs`** was confirmed live (last activity
  2026-07-17) but its tree was not enumerated, so whether the POPL 2024 thunks/debits
  development lives in that same repo rests on the paper's landing page.
- **The "no Isabelle/AFP entry for Brent's theorem" claim** is inference from
  absence-of-citation plus repository search, not a positive AFP index check.
- **ACM DL returned 403** throughout, so ACM-hosted PDFs were reached via author copies or
  arXiv where available, and by DOI metadata otherwise.

**Method limitation.** The session's WebSearch budget (200 calls) was exhausted partway
through the wave; later coverage used direct fetches, GitHub/arXiv/dblp APIs, and local
builds. A residual risk of missing an obscure project exists, though the repository-tree
searches over Mathlib, Batteries, CSLib, iris-lean, the ITree libraries, and the four Lean
ITree repos were exhaustive *for those repos*.

**One methodological lesson recorded because it nearly cost a finding.** The Lean sweep in
§7 initially missed `ISTA-PLV/coinductive` — the single most important positive in that
thread — because the keyword list contained `stepCount` but not bare `step`. **Any future
absence claim in this area must include `step`, `later`, and `credit` in its vocabulary.**

**Things that are genuinely absent, and are findings rather than gaps.**

| Absence | Confidence |
|---|---|
| No cost-instrumented interaction-tree paper or library, in any prover | high — 178/178 citing papers checked, 0 keyword hits across 143+41 `.v` files |
| No mechanization of AARA's own soundness theorem | high |
| No mechanization of quantitative equational theories / quantitative algebras, in any prover | high — three zero-result code searches across Lean/Agda/Coq |
| No published paper connecting Lean 4 to graded monads, effect systems, QTT, or coeffects | high — arXiv API, 0 in every conjunction, mechanism validated |
| No Lean 4 cost-semantics paper (`abs:"cost semantics" AND abs:"Lean"`) | high — 0 results |
| No time credits in Lean 4 (later credits ≠ time credits) | high — iris-lean tree enumerated |
| Brent's theorem unmechanized in any assistant | medium-high |
| No port of calf/decalf/Giralf to Rocq, Lean, or Isabelle | high |
| Lean's standard amortized data structures have complexity claims in doc-comments only | high — Batteries tree searched |

---

## 10. Synthesis — the recommended shape for "cost as inhabitant"

### 10.1 The ruling, in one paragraph

**Adopt calf's discipline in its concrete form: a writer-style cost carrier plus a phase
distinction realized as a `Quot`.** Not graded indices, not potential-typed, not metric —
those are all deferrals with named triggers (§10.4), and one of them (metric) is a rejection
on principle. The recommendation is not a compromise between the three: it is the shape that
three independent literatures converged on, that one official Lean library has already
half-built, and that **[probe]** builds fully in 301 lines on the estate's exact toolchain
inside its exact axiom allowlist.

### 10.2 The shape, layered

| Layer | Content | Status | Owner |
|---|---|---|---|
| **L-0 — the carrier** | `Cmp M A` with `cost : M.C` and `val : A`, generic in an ordered cost monoid `(C, 0, +, ≤)`. This is simultaneously calf's counting model (`F(A) = C × A`), Danner–Licata's `‖τ‖ = C × ⟪τ⟫`, and CSLib's `TimeM`. | **[probe]** built | estate-owned; cite all three |
| **L-1 — the equations** | `step0`, `step+`, `bindstep`, plus the monad laws, which hold **on the nose** in the concrete model rather than being postulated. | **[probe]** built | estate-owned |
| **L-2 — the phase** | `Beh M A := Quot (fun e e' => e.val = e'.val)`, with `beh_step : beh (step c e) = beh e` by `Quot.sound`. **Every behavioural specification, equivalence, and canonicalization theorem is stated at `Beh`, never at `Cmp`.** | **[probe]** built | estate-owned |
| **L-3 — the refinement** | `isBounded` with Return / Step / Bind / Relax. | **[probe]** built | calf Fig. 4, restated |
| **L-4 — amortization** | Nipkow's locale shape: one `Φ : Store → ℕ` and one inequality `inv s → t_f s + Φ (nxt f s) − Φ s ≤ U f s`, **plus a mandatory disposal lemma**. | deferred, trigger T-2 | Nipkow / Guéneau |
| **L-5 — the annotation gap** | Named in the artifact, never hidden. | now | estate |

The load-bearing design decision is **L-2**, and it is worth stating why it is not merely
cosmetic. CSLib's `TimeM` has L-0 and L-1 and states L-2 as a *comment* ("Design Principle
3: prove correctness properties on `.ret`, prove complexity on `.time`"). calf makes it a
theorem by postulating `¶E` and `step/¶E` — outside the estate's axiom allowlist. **The
`Quot` construction gets calf's theorem at CSLib's price**, because `Quot.sound` is already
in the allowlist and `Quot.lift` turns "this specification does not observe cost" from a
convention into a proof obligation discharged at definition time.

### 10.3 Why this and not the alternatives

**Not graded indices (thread 4), for v1.** Three reasons, in decreasing order of weight.
(i) The estate's v1 costs are *exact and computed*, not *budgets to be checked* — grading
buys static budget refusal, which the store does not yet need. (ii) There is no Lean core,
Batteries, or Mathlib home for effect grading, and the three third-party implementations
disagree on how to handle the central problem, which VCVio's own docstring names: monoid
laws are *propositional*, so graded bind drags `▸` transport through every proof.
(iii) Lean's binders cannot carry quantities at all (`BinderInfo` has four constructors, all
visibility), so any grading is an object-language or ambient-type-constructor construction
regardless. **When grading is wanted, the ruling is already made: `Nat`-shaped grades, not
an abstract `Monoid`**, so arithmetic reduces definitionally and `omega` closes the rest —
`lean-linq` records exactly this pivot, and it went the same way calf did.

**Not potential-typed (thread 3), for v1.** Two specific mismatches, not general
skepticism. (i) **`n log n` is out of AARA's reach and canonicalization sorts** — RaML
derives a *quadratic* bound for merge sort. Nipkow reaches amortized logarithmic bounds
routinely precisely because he supplies `Φ` by hand and is unconstrained by a basis; Lean
already contains the merge-sort `n·⌈log₂ n⌉` proof by the same route. (ii) **Potential is
counted by reference-path, and a content-addressed store is a DAG by construction.** This
forces a decision the estate has not yet made and should make before choosing any cost
model: *does cost count DAG nodes or tree-unfolding paths?* AARA can express only the
latter. The *semantic core* of AARA — `Φ` as a type-directed map into an ordered monoid, the
potential inequality, and the affine sharing condition — is adopted at L-4, and λ-amor
(POPL 2021) proves that core survives deleting the LP entirely.

**Not metric (thread 5) — rejected on principle, not deferred.** Content-addressed identity
is 0/1 and must stay 0/1; a good hash is designed so semantic proximity carries no
information about digest proximity. "Within ε of canonical" is a way of *not having* a
canonical form, and the estate's central bus is canonical forms. Three structural results
reinforce it: there is **no coarsest program metric** (arXiv:2603.01317, Mar 2026) which
directly attacks P2; the deduction system is **infinitary** (`L_{ω1,ω}`, Mio 2025) so
mechanization requires proving compactness for your own theory first; and MPP quantitative
algebras are **cartesian** while the charter's L3 is monoidal. Take one paragraph of
vocabulary from it (`V`-quantale-valued equality: `V = 2` equality, `V` = order preorder,
`V = [0,∞]` metric) and nothing else.

**Not separation logic with time credits, for the store.** The point of `$n` is *mutable
heap* ownership; the store is immutable and shareable by construction, so the resource
discipline buys almost nothing and costs the entire Iris stack — which in Lean means the
`iris-lean` port (itself in progress, toolchain v4.32.2) plus the Cambium time-credit
development on top. It remains the strongest *precedent* in the survey and the right answer
for a concurrent heap-mutating subject, which is not this one.

### 10.4 Deferrals, with named triggers

| ID | Deferred | Trigger | Then read |
|---|---|---|---|
| **T-1** | graded cost *indices* | an API must **refuse** an operation at type-check time because it would exceed a budget | VCVio `ToMathlib/Control/Monad/Graded.lean`; `prim-parser` for graded `do` and `≍`; `lean-linq` for symbolic cost grades |
| **T-2** | potential / amortization | the first store operation with **non-uniform** cost (rebalancing, rehashing, table doubling) | Nipkow–Brinkop JAR 2018 + AFP `Amortized_Complexity`; Grodin–Harper MFPS 2024 for the coalgebraic form |
| **T-3** | asymptotics | a **client** needs `O`, not the estate | Guéneau et al. ESOP 2018 — replicate all four `specO` fields; `cost_nonneg` and `cost_monotonic` are load-bearing. **Costs Mathlib and `ℝ`.** |
| **T-4** | lazy cost / debits | decode becomes memoized-on-demand | Pottier et al. POPL 2024. **Standing design constraint: keep decode and canonicalization eager, or `T_f`-style bounds become loose by the FDSA book's own admission.** |
| **T-5** | cost in an ITree denotation | runtime lane opens T5 (`yieldNow`, suspension) | Vistrup–Sammler–Jung POPL 2025 `src/step.v`; `ISTA-PLV/coinductive` `ITree/Effects/Step.lean`. **Design already settled: cost as an event in `E`, two handlers, one denotation. Never Taus.** |
| **T-6** | work/span parallel cost | runtime lane opens T6 (fibers, races) | calf §6's parallel cost monoid `(ℕ², ⊕, ⊗)`; **Parcas** (ICFP 2026, `nobrakal/parcas`) for the mechanized program logic — note span credits *duplicate* at forks |
| **T-7** | program-inequality cost bounds | the runtime subject becomes nondeterministic or probabilistic, so **no pure recurrence exists** | decalf (POPL 2024). Its motivating example is exactly this: randomized quicksort has no `r` with `qsort = λl. charge⟨r(l)⟩(ret(sort l))` |
| **T-8** | quantitative / metric equality | a **lossy** codec enters the estate (quantization, compression, float) | Mardare–Panangaden–Plotkin; Dal Lago–Gavazzo POPL 2022 for cost-as-distance |
| **T-9** | fracture-and-gluing (AFAT / Giralf) | — | **no trigger. It needs univalence; it does not port to Lean 4, and adopting a cubical system for this would be a worse trade than the thing it buys.** Read *Potential Functions as Types* for the ideas, not the mechanization. |

### 10.5 The trust story

Five statements the artifact must carry, not the commit message.

1. **What the theorems are about.** Statements about lab-owned Lean definitions: G1 for the
   model, G2 for its kernel theorems. Nothing here is a claim about JavaScript, the Effect
   runtime, a compiler, wall-clock time, or allocation.
2. **The four-levels caveat, inherited from every framework in this survey.**
   Charguéraud–Pottier enumerate (1) source-level calls of a chosen kind, (2) all source-level
   reduction steps, (3) machine instructions, (4) physical time — and attack level 1 only,
   saying of the 1↔2 relation "**(We have not done so.)**" Nipkow: "**We do not offer such a
   proof.** Thus our formalization of 'time' should be seen as conditional." The only
   development in this survey that closes the gap is CakeML's *space* cost semantics
   (OOPSLA 2020). **A Lean cost theorem in this estate is a level-1 theorem and must say so.**
3. **The cost model, documented explicitly** — CSLib's own checklist is the right one: what
   costs 1 unit; what is free; do recursive calls charge for the call itself. An undocumented
   cost model makes a cost theorem unfalsifiable.
4. **The disposal lemma, for any amortized spec.** Guéneau et al.'s `DisposeGraph`: "By
   publishing this statement, we guarantee that we are not hiding a debt inside the abstract
   predicate." Without it an amortized bound is vacuous.
5. **The instrumentation argument is about the model, and licenses nothing about the
   runtime.** Non-perturbation and non-degeneracy (§1.8) say the *model* may carry cost
   without its other theorems becoming conditional. They do not license substituting a model
   theorem for G3 conformance evidence, and the runtime document's own mitigation — public
   uninstrumented runner primary, instrumented adapter separately labelled — stands
   unchanged.

**Trusted computing base for the recommended shape:** the Lean kernel and the three allowlist
axioms; nothing else. No Mathlib, no Batteries, no external solver. **[probe]** measured:
`[propext, Classical.choice, Quot.sound]` worst case, `[propext, Quot.sound]` typical.

### 10.6 What to write down next, in order

1. **An ADR for the cost model** — what counts as one unit for decode, for canonicalization,
   for a store operation; and the DAG-versus-unfolding ruling that §3.3 Limit B forces.
2. **Vocabulary.** The estate owns the definitions appearing in its claims (I-004). Candidate
   terms this survey supplies: *cost monoid*, *cost-carrying computation*, *behavioural
   phase*, *cost refinement*, *cost model*, *non-perturbation*, *non-degeneracy*,
   *disposal lemma*, *level-1 cost claim*. `V`-quantale-valued equality enters as a
   glossary sharpening of "declared equivalence", with `V = 2` / order / `[0,∞]` as the three
   registers — one paragraph, cited, not built.
3. **`OBS-001` sharpening** in the runtime document: cost is an observation profile *defined
   in the semantics*, and the T7 risk row should be annotated with the non-perturbation /
   non-degeneracy distinction rather than left as an open risk.
4. **The probe promoted**, if the operator wants it: `cost-denotation-lean-probe.lean` is
   already allowlist-clean and Mathlib-free, and is the L-0…L-3 stack in full.
5. **Reference pins owed.** calf (arXiv:2107.04663, POPL 2022, `10.1145/3498670`) and
   `calfproject/agda-calf`; decalf (`10.1145/3632852`); *Potential Functions as Types*
   (arXiv:2607.08547v2); CSLib `TimeM` (`leanprover/cslib`, arXiv:2602.04846) — the last of
   these especially, since the recommended L-0 is deliberately the same shape and the estate
   **borrows openly, with credit**.

### 10.7 The one-sentence answer

Carry cost in the value the way CSLib already does, quotient it away with `Quot` the way
calf does with a modality, state every behavioural theorem at the quotient so that
instrumenting the model provably cannot move it — and defer grading, potential, asymptotics,
and distance behind the named triggers above.
