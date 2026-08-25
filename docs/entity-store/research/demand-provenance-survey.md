# Heat, demand, and provenance as semantics (literature survey)

> Provenance: written 2026-08-25 on the Mac coordinator, in answer to the operator's §14
> theses in `entity-store-kickoff.md` ("observability is denotation, not instrumentation";
> "entities are not static objects"). Staged, pre-grade. **Highest satisfied gate: none.**
> Nothing here is a gated claim; every external formalism is evidence, never authority
> (`DEVELOPMENT-INVARIANTS.md`, I-004).
>
> **Method.** Primary sources were downloaded and read as text (`pdftotext`) rather than
> through a summarizing fetch; every quotation below was taken from the extracted text of
> the named PDF, and OCR ligature damage was repaired by hand where it occurred. Repository
> facts (last-push dates, file contents, admitted proofs) were read through the GitHub API,
> not from prose about the repositories. Lean 4 facts were read from the local
> `v4.33.1` toolchain source, not from documentation. **A minority of citations are marked
> `[standing knowledge — DOI unverified this session]`**: the session's web-search budget
> was exhausted partway through, and those items could not be re-checked against a primary
> source. They are flagged individually and none of them is load-bearing.
>
> **Judgment marks.** `EVIDENCE` = read from a primary source. `JUDGMENT` = the survey's
> own opinion. `GAP` = an honest hole.

---

## 0. Result first

**0.1 — Semiring provenance is the centerpiece, and it earns the title on one theorem, not
on vibes.** The load-bearing fact is not "you can annotate tuples with semiring elements".
It is the *factorization theorem*: compute once in the free semiring `N[X]` over source
identifiers, and **every** other quantity — multiplicity, cost, confidence, clearance level,
mere reachability — is recovered afterwards by applying a semiring homomorphism, with a
proof that the two orders of operation agree (§1.2). That is exactly the operator's thesis in
algebraic form. Telemetry collects each metric separately and perturbs the subject;
provenance semirings compute the most general object once and derive the rest by
homomorphism. `JUDGMENT`: adopt it as the algebra of the store's dynamics. Its one
mechanization is real but modest and in Coq, not Lean (§1.7) — so the estate would be
building, not reusing.

**0.2 — Build Systems à la Carte is the closest structural kin, and the map is exact.**
Its `Task`/`Rebuilder`/`Scheduler`/trace vocabulary lands on the entity store almost
without translation, and it locates the estate on its 3×4 design grid — one cell *better*
than Nix (§3.1–3.2). Its mechanization does not exist (§3.7): the only attempt is a 2018
work-in-progress Coq repo whose key definition is `Admitted`. `JUDGMENT`: take the
vocabulary and the correctness definition; expect to prove things nobody has proved.

**0.3 — The Xia/clairvoyance finding is stronger than the brief anticipated.** The charter's
cited author is not merely adjacent to demand semantics; he is the first author of the paper
that *makes demand a denotation*: a total, typed, bidirectional demand semantics deriving,
from a lazy function `f : A → B`, a demand function `f^D : A → B^D → ℕ × A^D`, mechanized
in Rocq, cross-validated against the clairvoyance monad (§2.4). Two of the three papers in
that line are axiom-clean or near-clean, with live artifacts.

**0.4 — Recommended shape (detail in §7).** Not a choice among the three; a stack.
**Build-trace records as the store's own entities → semiring provenance as the algebra over
those records → demand projections deferred until the store answers partial reads.** The
first two compose immediately and are G1-statable in Lean 4 against the existing E2 scaffold
(§7.3). The third has a named trigger and no work before it fires (§7.4).

**0.5 — One unification worth the whole survey.** Garbage collection and heat are the same
computation. `hash-db-anatomy.md` §7.4 records reachability GC as an operational policy;
under the semiring frame, "is this entity retained" is the **Boolean-semiring image of the
roots' provenance polynomials, evaluated at the entity's indicator** — the same polynomials
whose tropical image is cost and whose ℕ image is usage count. `JUDGMENT`: this is among the
first theorems the estate should state, because it turns a storage-engine chore into a
corollary of the dynamics semantics.

---

## 1. Semiring provenance — the centerpiece

### 1.1 The construction, plainly

Take a relation not as a set of tuples but as a **function from tuples to annotations**.

> `EVIDENCE` — "**Definition 3.1.** Let `K` be a set containing a distinguished element `0`.
> A `K`-relation over a finite set of attributes `U` is a function `R : U-Tup → K` such that
> its support defined by `supp(R) = {t | R(t) ≠ 0}` is finite."
> — Green, Karvounarakis, Tannen, *Provenance Semirings*, PODS 2007, §3.

Query operators then act on annotations. Union adds, join multiplies, projection sums over
the fibres:

> `EVIDENCE` — Definition 3.2, same paper: `(R₁ ∪ R₂)(t) = R₁(t) + R₂(t)`;
> `(π_V R)(t) = Σ_{t = t' on V, R(t')≠0} R(t')`; join multiplies the tags of joinable
> tuples; `(ρ_β R)(t) = R(t ∘ β)`; the empty relation is `∅(t) = 0`.

The algebraic structure is **forced**, not chosen:

> `EVIDENCE` — "**Proposition 3.4.** The following RA identities: • union is associative,
> commutative and has identity `∅`; • join is associative, commutative and distributive over
> union; • projections and selections commute with each other as well as with unions and
> joins (when applicable)" hold exactly when `(K, +, ·, 0, 1)` is a commutative semiring
> — i.e. `(K,+,0)` and `(K,·,1)` are commutative monoids, `·` distributes over `+`, and
> `∀a. 0·a = a·0 = 0`.

`JUDGMENT`: the "forced" direction is the part the estate should care about most. It means
the semiring laws are not an imported convenience — they are what the store's own combining
operations already satisfy, whether or not anyone writes them down. If the entity store's
derivation combinators satisfy those identities (and the store's join-semilattice
`ST1–ST4` says the store layer does), then its annotations *are* semiring-valued.

### 1.2 The two theorems that do the work

**(i) Homomorphism commutation.** This is the whole reason to record one thing instead of
many.

> `EVIDENCE` — "**Proposition 3.5.** Let `h : K → K'` and assume that `K, K'` are commutative
> semirings. The transformation given by `h` from `K`-relations to `K'`-relations commutes
> with any RA⁺ query (for queries of one argument) `q(h(R)) = h(q(R))` **if and only if** `h`
> is a semiring homomorphism." — PODS 2007, §3.
>
> Restated as the headline in the survey version: "**Theorem 3.3 (Fundamental Theorem).**"
> — Karvounarakis & Green, *Semiring-Annotated Data: Queries and Provenance*, SIGMOD Record
> 41(3), 2012, §3.

The "if and only if" is load-bearing: **only** semiring homomorphisms are safe to push
through a computation. Any derived metric that is not a semiring homomorphism of the
provenance is not recoverable after the fact and must be computed in-line — which is
precisely the instrumentation-perturbs-the-subject failure mode the operator rejected.

**(ii) Universality / factorization.** The free object exists and everything factors through
it.

> `EVIDENCE` — "**Definition 4.1.** Let `X` be the set of tuple ids of a (usual) database
> instance `I`. The **positive algebra provenance semiring** for `I` is the semiring of
> polynomials with variables (a.k.a. indeterminates) from `X` and coefficients from `N`,
> with the operations defined as usual: `(N[X], +, ·, 0, 1)`."
>
> "**Proposition 4.2.** Let `K` be a commutative semiring and `X` a set of variables. For any
> valuation `v : X → K` there exists a unique homomorphism of semirings `Eval_v : N[X] → K`
> such that for the one-variable monomials we have `Eval_v(x) = v(x)`."
>
> "**Theorem 4.3.** For any RA⁺ query `q` we have `q(R) = Eval_v ∘ q(R̄)`" — where `R̄` is the
> "abstractly tagged" version of `R`, each tuple tagged with its own id. The paper's gloss:
> "the semantics of RA⁺ on `K`-relations for any semiring `K` **factors through** the
> semantics of the same in provenance semirings." — PODS 2007, §4.

Worked instance from the paper, which is also the best one-line explanation of what a
polynomial *means*: the provenance of a tuple `(f,e)` is `2s² + rs`, read as "`(f,e)` is
computed by `q` in three different ways; two of them use the input tuple `s` twice; the third
uses input tuples `r` and `s`." Evaluating `2r² + rs` in `N` at `p=2, r=5, s=1` gives `55`,
which is that tuple's multiplicity under bag semantics.

### 1.3 The semiring zoo — heat, cost, confidence, clearance, and mere existence

> `EVIDENCE` — from PODS 2007 §5 and SIGMOD Record 2012 §3, verbatim in substance:
>
> | Semiring | What the annotation computes |
> |---|---|
> | `(B, ∨, ∧, false, true)` | ordinary set semantics — "is it there at all" |
> | `(N, +, ·, 0, 1)` | bag semantics — **multiplicity**, i.e. usage count |
> | `(PosBool(B), ∨, ∧, false, true)` | Imielinski–Lipski c-tables (incomplete databases) |
> | `(P(Ω), ∪, ∩, ∅, Ω)` | Fuhr–Rölleke–Zimányi event tables (probabilistic) |
> | `(N∞, min, +, ∞, 0)` | **the tropical semiring** — "a tuple `(x,y)` … would be annotated by the cost of the cheapest path" |
> | `([0,1], max, min, 0, 1)` | the fuzzy semiring |
> | `(C, min, max, P, 0)` with `P < C < S < T < 0` | **the semiring of confidentiality policies** — public / confidential / secret / top-secret |
> | `(P(X), ∪, ∪, ∅, ∅)` | why-provenance (the *set* of contributing sources) |
> | `(N[X], +, ·, 0, 1)` | how-provenance — the free object, above all of the others |

The access-control use is not a footnote; it is a theorem about deployment order:

> `EVIDENCE` — "**Example 3.5 (Non-interference).** … 'Erasing' tuples exceeding a given
> clearance level `c` corresponds to applying the semiring homomorphism `h_c : C → C` … **Theorem 3.3
> implies that we get the same result by evaluating the query first, then erasing unauthorized
> tuples from the result, that we get by erasing first, then evaluating the query.**"
> — SIGMOD Record 2012, §3.

There is a strict informativeness order among the models:

> `EVIDENCE` — "**Figure 6: Provenance hierarchy.** A path downward from `K₁` to `K₂`
> indicates that there exists a surjective semiring homomorphism from `K₁` to `K₂`." with
> `N[X]` at the top ("most informative") and `B` at the bottom ("least informative"); `B[X]`
> drops coefficients, `Trio(X)` drops exponents, `Why(X)` drops both, `Lin(X)` (lineage)
> "collapse[s] all variables appearing in the polynomial into a single monomial."
> — SIGMOD Record 2012, §4.

`JUDGMENT`: this hierarchy is the argument for *what the entity store should physically
record*. Record the polynomial (or the trace it is read off, §3.1); every cheaper answer is
a homomorphic image and can be recomputed. Record only a set of sources (lineage/why) and
the counting and cost answers are gone forever.

### 1.4 Recursion: where the theory gets harder, and why the store escapes it

For non-recursive queries `N[X]` suffices. For recursion the sum over derivations can be
infinite, and the theory needs order structure:

> `EVIDENCE` — "**Definition 5.1.** Let `(K, +, ·, 0, 1)` be a commutative ω-continuous
> semiring. … For any `K`-relation `R` define `q(R)(t) = Σ_{τ yields t} ( Π_{t' ∈ leaves(τ)} R(t') )`
> where `τ` ranges over all `q`-derivation trees for `t`." — PODS 2007, §5. The provenance
> object becomes a **formal power series**, `N∞[[X]]` (Definition 6.1), and "**Theorem 6.4.**
> The semantics of datalog on `K`-relations for any commutative ω-continuous semiring `K`
> factors through the semantics of the same in provenance semirings (of formal power series)."

The modern successor pushes this to full least/greatest fixed-point interleaving:

> `EVIDENCE` — Dannert, Grädel, Naaf, Tannen, *Semiring Provenance for Fixed-Point Logic*,
> CSL 2021, LIPIcs 183, 17:1–17:22, DOI `10.4230/LIPIcs.CSL.2021.17` (full version
> arXiv:1910.07910):
> "**Definition 8.** A semiring `K` is **absorptive** if `a + ab = a` for all `a, b ∈ K`";
> "**Theorem 17 (Universality).** Every mapping `h : X → K` into an absorptive, fully
> continuous semiring `K` uniquely extends to a fully continuous semiring homomorphism
> `h : S∞[X] → K`";
> "**Proposition 7 (Fundamental Property).** … for every `K₁`-interpretation `π`, the mapping
> `h ∘ π` is a `K₂`-interpretation and for every `ϕ ∈ LFP`, we have `h(π[[ϕ]]) = (h ∘ π)[[ϕ]]`."
> The abstract states the boundary: "the common approach based on Kleene's Fixed-Point
> Theorem for ω-continuous semirings is not sufficient for these general languages."

`JUDGMENT`: **the entity store does not need any of this at v1, and that is a design
dividend of law L7.** Because recursion lives *inside* one addressed unit and the store graph
is a DAG by construction, the derivation relation is acyclic, every provenance object is a
finite polynomial, and `N[X]` — the easy, free, universal case — is exactly right. The
ω-continuous/absorptive machinery is the named trigger in §7.4, not v1 work.

### 1.5 Semiring semantics for logic and games

> `EVIDENCE` — Grädel & Tannen, *Semiring Provenance for First-Order Model Checking*,
> arXiv:1712.01980, submitted 6 Dec 2017: "Previous work on provenance was, to a large
> extent, restricted to the negation-free fragment of first-order logic … In this paper we
> introduce a novel approach to dealing with negation and a corresponding commutative
> semiring of polynomials with **dual indeterminates**. These polynomials are used to perform
> **reverse provenance analysis**, i.e., finding models that satisfy various properties under
> given provenance tracking assumptions."
>
> `EVIDENCE` — the mechanism, from CSL 2021 §3: "**Definition 2.** For any semiring `K`, a
> `K`-interpretation (for `A` and `τ`) is a function `π : Lit_A(τ) → K` mapping true
> equalities and inequalities to 1 and false ones to 0," extended to formulae "by
> interpreting disjunctions and existential quantification via addition, and conjunctions and
> universal quantification via multiplication. Negation is not interpreted directly by an
> algebraic operation. We deal with it syntactically, by evaluating the negation normal form."

Also in this line (`[standing knowledge — listing seen, PDF not read this session]`):
*Semiring Provenance for Büchi Games: Strategy Analysis with Absorptive Polynomials*,
arXiv:2106.12892; *Semiring Provenance for Guarded Logics*, DOI `10.1007/978-3-030-64187-0_3`;
*Semiring Provenance for Fixed-Point Logic* has a KR 2022 Datalog successor,
*Revisiting Semiring Provenance for Datalog*, arXiv:2202.10766.

`JUDGMENT`: **directly relevant to the estate, and under-appreciated.** The logic version
means a semiring annotation can be carried by a *judgment*, not only by a tuple. An estate
obligation is a `Prop`; a `K`-interpretation of the obligation ledger would say, for each
proved obligation, which pinned sources and which prior theorems its truth rests on, in the
same algebra as entity heat. That is the central bus with an algebra on it (§1.8b). The
negation handling (dual indeterminates) is the part to watch: the estate's admission
function is a *rejection* discipline, and rejections are negative information.

### 1.6 The why/where/how taxonomy — read once, then stop worrying about it

> `EVIDENCE` — Buneman, Khanna, Tan, *Why and Where: A Characterization of Data Provenance*,
> ICDT 2001, LNCS 1973, DOI `10.1007/3-540-44503-X_20` (open-access copy read at
> `pure.ed.ac.uk`). The survey of record is Cheney, Chiticariu, Tan, *Provenance in
> Databases: Why, How, and Where*, Foundations and Trends in Databases 1(4):379–474, 2009,
> DOI `10.1561/1900000006`.
>
> From that survey, the distinction that matters: why-provenance is about *witnesses* — which
> input tuples justify an output; where-provenance is about *copying* — "where a piece of data
> is copied from"; how-provenance is the polynomial and "is more general than
> why-provenance." The survey is candid about the limits: all three are "**sensitive to query
> rewriting**" — equivalent queries can produce different provenance (Figs. 1.3, 1.5, 1.6).

`JUDGMENT`: the rewriting-sensitivity caveat transfers to the estate and should be recorded
as a design constraint, not a defect. Provenance is a property of *the derivation actually
performed*, not of the input/output pair. That is fine for a store whose derivations are
recorded acts, and it is exactly why the trace (§3.1) — a record of what was done — is the
right physical carrier and the polynomial is the right algebra over it. It also means
"same output, same provenance" is **false** and must never be asserted; that is the
provenance analogue of the estate's Direction A / Direction B split.

### 1.7 Mechanization status — thin, and one solid exhibit

`EVIDENCE`, checked this session:

| System | Status |
|---|---|
| **Coq/Rocq** | **One real formalization.** Benzaken, Cohen-Boulakia, Contejean, Keller, Zucchini, *A Coq Formalization of Data Provenance*, CPP 2021, 18 pp., DOI `10.1145/3437992.3439920`, HAL `hal-03380459`. Development: `https://framagit.org/formaldata/provcert`. |
| **Lean 4** | **None found.** No repository, no Mathlib-adjacent development. (`gh search repos "lean4 semiring provenance"` → empty.) |
| **Isabelle/AFP** | **None found** for provenance semirings specifically. |
| **Agda** | **None found.** |
| Non-proof-assistant reference implementation | ProvSQL (`github.com/PierreSenellart/provsql`, C++ PostgreSQL extension, actively maintained — last push 2026-08-25). Useful as an oracle, not as evidence. |

What the CPP 2021 development actually contains, read from the paper:

> `EVIDENCE` — "we propose the **first** provenance-aware extended relational algebra
> formalized in a proof assistant (Coq), for a non trivial subset of database queries: queries
> containing aggregates, null values, and correlated sub-queries. The formalization is
> validated by an **adequacy proof** with respect to standard evaluation of queries."
>
> The `K`-relation is a Record, not a bare function — worth noting, because the estate would
> hit the same issue: "our definition of a `K`-relation is a Record with three fields: the
> function itself (named `f`), a **support** that encompasses at least tuples whose annotation
> is non-zero, and the sort of the relation."
>
> The headline theorem: `Theorem K_relations_extend_relational_algebra : ∀ env (b:bool) (q:query),
> well_formed b q = true → env_well_formed env q = true → ∀ (t:tuple),
> f (eval_query_prov_N (create_env env) q) t = Fbag.nb_occ t (eval_query_rel env q).`
> — i.e. specializing `K := N` recovers bag semantics exactly.
>
> Instantiations proved: "Booleans and Boolean functions, natural and tropical integers, as
> well as polynomials." And a generalization the estate should note: "Our formalization of
> tropical integers actually **generalizes the definition of tropical integers to any totally
> ordered monoid**. We have formally proved that the structure of a totally ordered monoid
> with compatibility of addition with respect to order is enough to be equipped with a
> tropical structure."

`JUDGMENT` — two caveats before treating this as reusable prior art. First, it is built on
the **Coccinelle** library, which the paper describes as using "Coq Records to represent
objects of the structure **and axioms on these objects**"; the adequacy theorem is also
stated under explicit `Hypothesis` declarations relating abstract and concrete
interpretations. That is a legitimate engineering choice and a poor fit for an estate whose
axiom gate is an allowlist of three. Second, it is a *database* formalization —
relational algebra with SQL aggregates — not a store formalization. `JUDGMENT`: cite it as
the closest prior art and the proof that the shape is mechanizable; do not plan to port it.

### 1.8 Verdict

**(a) For the store's dynamics program.** `JUDGMENT`: **adopt as the algebra, at the
derivation layer only.** Precisely:

- Entities are annotated facts; the annotation domain is a parameter `K`.
- A *derivation* (an admission, a canonicalization, a decode, a projection, a proof) is the
  "query"; the provenance polynomial over source **addresses** is the record of which
  entities contributed and how many times, in how many distinct ways.
- "Hot" is not a primitive. **Heat is a valuation** — a choice of `K` plus `v : Address → K`,
  applied to a polynomial the store already holds. Usage count is `K = N`; cost is
  `K = (N∞, min, +, ∞, 0)`; "was it touched at all" is `K = B`; "may this tenant see the
  result" is the confidentiality semiring; "is it collectable" is `K = B` again, reading the
  roots' polynomials at the candidate's indicator (§7.3, P5).
- Keep the store's own algebra and the provenance algebra **distinct**. The store layer is a
  join-semilattice (idempotent: `ST1–ST4`, insertion-order-independent). `N[X]` is *not*
  idempotent, deliberately — PODS 2007 notes the relational identity list "does not include
  the idempotence of unions and joins, since these fail for bag semantics." Conflating them
  would silently discard the counting information that makes how-provenance worth having.

**(b) For the central bus.** `JUDGMENT`: **this is the bus's missing algebra, and the fit is
better than for the store.** The charter defines the bus as "recorded links between artifacts
and their evidence." A recorded link is a monomial. A polynomial over an artifact's sources
*is* its evidence record, and §1.5's logic-side semiring semantics says an obligation's proof
can carry the same annotation. Concretely: an artifact's provenance polynomial answers "which
pinned sources, which prior theorems, and how many independent derivations" in one object,
and each of the estate's existing questions — "does this claim depend on an unpinned source",
"is this artifact still reachable from a live claim", "what is the axiom footprint" — becomes
a homomorphism applied to it. The axiom-footprint case is the clearest: an axiom report is
already a `Why(X)`-style *set*, i.e. the bottom of §1.3's hierarchy; the polynomial is
strictly more informative and the set is recoverable from it.

---

## 2. Demand and usage as semantics

### 2.1 Wadler–Hughes projections — and an honest note on the word

> `EVIDENCE` — Wadler & Hughes, *Projections for Strictness Analysis*, FPCA 1987, LNCS 274,
> pp. 385–407, DOI `10.1007/3-540-18317-5_21`.
>
> "A continuous function `α` is a **projection** if for every object `u`, `α u ⊑ u` and
> `α (α u) = α u`. … The first line says that projections only remove information from an
> object. The second line says that all the information is removed at once, so applying the
> projection a second time has no effect. These two properties can also be written
> `α ⊑ ID` [and] `α ∘ α = α`."
>
> The safety condition — this is *the* definition of demand in that paper:
> "We say that a function `f` is **β-strict in context α** if `α ∘ f = α ∘ f ∘ β`, and write
> `f : α ⇒ β`."
> "**Proposition:** `f : α ⇒ β` iff `α ∘ f ⊑ f ∘ β`."
>
> Read as demand: *if the context demands only `α` of the result, then at most `β` of the
> argument is needed.* Contexts are lattice-ordered, with `ID` at the top; strictness needs
> lifted domains, giving four base projections ordered `FAIL ⊑ STR, ABS ⊑ ID`, where "`ABS`.
> The value of `e` is ignored."

`EVIDENCE / JUDGMENT` — **the terminological resonance with the estate's vocabulary, stated
honestly.** The estate uses "projection" in two senses, and this is a *third*:

| Sense | Object | Shape |
|---|---|---|
| Charter / Honda–Yoshida–Carbone | global type → endpoint type | a map **between different carriers**, with a fidelity theorem |
| Charter H2 / Schema codec | one description → Type view and Encoded view | a **pair of carriers** linked by coherence laws |
| Wadler–Hughes | a domain → itself | an **idempotent endomorphism below the identity** |

These are **not the same notion**, and the survey declines to pretend otherwise: endpoint
projection is not an endomorphism, and it does not sit below an identity in any definedness
order. But there is one precise, useful point of contact, and it is worth recording:

`JUDGMENT` — **`canonS` is exactly half a Wadler–Hughes projection today, and the missing
half is the thing the estate would have to add to talk about demand at all.** The E2 scaffold
already owes `ObligationCanonIdempotent : ∀ s, canonS (canonS s) = canonS s` — that is
`α ∘ α = α`, the algebraic half. The order half, `α ⊑ ID`, is undefined because `SchemaCore`
carries no definedness order; `canonS` is a *retraction onto canonical forms*, a quotient
normalizer, not a domain projection. The move that supplies the missing half is precisely
Xia et al.'s approximation types (§2.4): add `ValueA` with a `⊥` for un-demanded material and
an inductive definedness order, and `canonV`/`canonS` become projections in the exact 1987
sense, with "what part of this entity was demanded" a first-class object. **That is the
cleanest available answer to "what would it take for the store to have a demand semantics",
and it is one datatype away.**

### 2.2 GHC's demand and cardinality line

> `EVIDENCE` — Ilya Sergey, Dimitrios Vytiniotis, Simon Peyton Jones, *Modular, Higher-Order
> Cardinality Analysis in Theory and Practice*, POPL '14, San Diego, DOI
> `10.1145/2535838.2535861` (DOI read from the paper's own copyright block). Extended in JFP
> (2017) `[standing knowledge — DOI unverified this session]`.
>
> The contributions, in the paper's words: "(a) the notion of **call demands**, (b) a full
> implementation." "Call demands are, to the best of our knowledge, new." A usage demand
> `C^ω(C^1(U))` "describes how a [function is used]": `C^n(d)` means "called `n` times, and
> the result is used with usage `d`"; `U` means "is used in some unknown way". A **usage
> signature** summarizes a function modularly; "A usage demand `d` always uses the root of the
> value exactly once."

The denotational successor is the more interesting one for this estate:

> `EVIDENCE` — Sebastian Graf, Simon Peyton Jones, Sven Keidel, *Abstracting Denotational
> Interpreters: A Pattern for Sound, Compositional and Higher-order Static Program Analysis*,
> arXiv:2403.02778v2, 12 Jul 2024. (The PDF carries an unfilled acmart placeholder,
> "Proc. ACM Program. Lang., Vol. 1, No. POPL, Article 1", so the final venue/article number
> is `GAP` — unverified this session.)
>
> "We explore **denotational interpreters**: denotational semantics that produce coinductive
> traces of a corresponding small-step operational semantics." The payoff for demand: "we
> recover **summary-based usage analysis**, a generalisation of absence analysis … This enables
> us to prove usage analysis sound wrt. the by-name and by-need semantics in half a page."
> "**Theorem 1 (`A⟦ ⟧` infers absence).** If `A⟦e⟧ρ = ⟨φ, π⟩` and `φ(x) = A`, then `x` is
> absent in `e`."
>
> **Mechanization:** "**Theorem 5 (Totality).** The interpreters `S_name⟦e⟧ρ` and
> `S_need⟦e⟧ρ(μ)` are defined for every `e, ρ, μ`. *Proof sketch.* In the Supplement, we
> provide an implementation of the generic interpreter `S⟦ ⟧` and its instances at `ByName`
> and `ByNeed` in **Guarded Cubical Agda**, which offers a total type theory with guarded
> recursive types."

Isabelle/HOL has the other end of this line, and it is finished work:

> `EVIDENCE`, read from the AFP entry pages:
> - **`Launchbury`** — Joachim Breitner, *The Correctness of Launchbury's Natural Semantics for
>   Lazy Evaluation*, AFP, 31 Jan 2013 (adequacy added 24 May 2014; booleans/if 16 Mar 2015).
>   "We have formalized both semantics and machine-checked the correctness proof, clarifying
>   some details. Furthermore, we provide a new and more direct adequacy proof."
> - **`Call_Arity`** — Joachim Breitner, *The Safety of Call Arity*, AFP, 20 Feb 2015.
>   "We formalize the Call Arity analysis, **as implemented in GHC**, and prove both functional
>   correctness and, more interestingly, **safety (i.e. the transformation does not increase
>   allocation)**. … We use Christian Urban's Nominal2 package … and Brian Huffman's HOLCF
>   package for the domain-theoretical aspects."

`JUDGMENT`: Breitner's pair is the *only* case in this whole survey of a shipping compiler's
demand analysis being mechanized against a denotational semantics, with a **quantitative**
safety property ("does not increase allocation"), not merely a functional one. It is the
existence proof that quantitative claims can sit at the estate's G1/G2 rather than in a
benchmark. It is also Isabelle/HOLCF, so it is technique, not transportable artifact.

### 2.3 Clairvoyant call-by-value

> `EVIDENCE` — Jennifer Hackett & Graham Hutton, *Call-By-Need Is Clairvoyant Call-By-Value*,
> PACMPL 3(ICFP), Article 114, August 2019, DOI `10.1145/3341718`.
>
> "**Theorem 4.1 (Moral Equivalence of CBN and Clairvoyant CBV).** Given a term `e` and a heap
> `Γ` that consists only of values, we have the following two properties:
> (i) If `Γ : e ⇓ᵏ_N` then `Γ : e ⇓^CV_k`;
> (ii) If `Γ : e ⇓^CV_k` then there is some `k' ≤ k` such that `Γ : e ⇓^{k'}_N`."
> The paper's own gloss: "the two parts of Theorem 4.1 imply that the call-by-need cost will
> be **the minimum clairvoyant call-by-value cost**."
>
> "**Theorem 4.2 (Contextual Cost-Equivalence of CBN and Clairvoyant CBV)**"; plus
> "**Theorem 5.3 (Soundness of the Denotational Semantics)**" and "**Theorem 5.4 (Adequacy …)**"
> for the accompanying heapless denotational semantics.

The idea in one line: replace the heap with **nondeterminism plus a minimum** — at each
thunk, guess whether it will be needed; the branch that guesses right is the call-by-need
cost. "This process will then result in the derivation tree with the minimum cost, which we
can think of as the 'maximally lazy' computation cost."

### 2.4 The Xia line — demand as a denotation, mechanized

This is the thread's most important finding and the reason the brief singled it out.

**Step 1 — the clairvoyance monad in Coq.**

> `EVIDENCE` — Yao Li, Li-yao Xia, Stephanie Weirich, *Reasoning about the Garden of Forking
> Paths*, PACMPL 5(ICFP), Article 80, August 2021, DOI `10.1145/3473585`, arXiv:2103.07543.
>
> "A computation in the clairvoyance monad, of type `M a`, nondeterministically yields a value
> `v : a` after some time `n`. A computation is defined as a set of such pairs `(v, n)`,
> encoded in Coq as a predicate `a -> nat -> Prop`." In the source:
> `Definition M (a : Type) : Type := a -> nat -> Prop.` — "around 20 lines of Coq" (the paper
> says "merely 21 nonblank, noncomment lines").
> "The type of thunks `T` is structurally an option type. A thunk is either a known value,
> under the `Thunk` constructor, or it is `Undefined`. **`Undefined` thunks are placeholders
> introduced when a computation is 'skipped,' because its result won't be needed.**"
>
> "**Theorem 4.1.** For any well-typed term `t` and heap `h`, and for any value-cost pair
> `(v, n)`, the following propositions are equivalent. (1) `(v,n) ∈ ⟦t⟧(⟦h⟧). (2) There exists
> `u` and `h'` such that `t, h ⇓ⁿ_CV u, h'` and `v = ⟦u⟧(⟦h'⟧)`." — adequacy forward,
> soundness backward, against Hackett & Hutton's operational semantics.

> `EVIDENCE` — **Repository**: `github.com/lastland/ClairvoyanceMonad` (Coq; last push
> **2025-02-07**; two files, `Clairvoyance.v` 38 kB and `Translation.v` 53 kB). From its
> README: "The artifact is known to work with Coq versions 8.10.2, 8.11.2, 8.12.2, and
> 8.13.2 … Equations 1.2.4." **Axiom status, stated by the authors:** "The proofs in
> `Clairvoyance.v` **does not rely on any additional axioms.** The proofs in `Translation.v`
> rely on axioms for **functional and propositional extensionality**. The artifact does not
> contain any unfinished/admitted proofs."

`JUDGMENT`: `Clairvoyance.v` is axiom-free; `Translation.v`'s two axioms are *inside* the
estate's allowlist in spirit but not in letter — `propext` is allowlisted, functional
extensionality is not (it is derivable in Lean from `Quot.sound`, which **is** allowlisted, so
a Lean port would land inside the allowlist). That is a favourable and non-obvious fact.

**Step 2 — the bidirectional demand semantics.** This is where demand stops being an analysis
and becomes a denotation.

> `EVIDENCE` — Li-yao Xia, Laura Israel, Maite Kramarz, Nicholas Coltharp, Koen Claessen,
> Stephanie Weirich, Yao Li, *Story of Your Lazy Function's Life: A Bidirectional Demand
> Semantics for Mechanized Cost Analysis of Lazy Programs*, PACMPL 8(ICFP), **Article 237**,
> August 2024, DOI `10.1145/3674626`. Received 2024-02-28, accepted 2024-06-18, published
> 2024-08-15.
>
> The core object: "Given a lazy function `f : A → B`, we can use the bidirectional demand
> semantics to systematically derive a **demand function** `f^D : A → B^D → ℕ × A^D`, where
> `A^D` represents the demand on type `A` and `ℕ` is the computation cost. That is, given the
> input (`A`) to function `f` and the demand on its output (`B^D`), the demand function `f^D`
> calculates the **minimal** demand on the input (`A^D`), as well as the computation cost
> required to obtain the demanded output (`ℕ`). … We can calculate such an input demand
> because, in a deterministic language, given any valid input and output demand, **there
> exists exactly one minimal input demand**."
>
> Provenance of the idea: "The semantics was first described by **Bjerner and Holmström
> [1989]** in an untyped setting. We adapt and expand it to a typed and total semantics."
> The judgment form: "`⟦M⟧_dem : ⟦Γ⟧_eval × ⟦A⟧_approx ⇀ ℕ × ⟦Γ⟧_approx`", defined by
> "**backwards evaluation**".
>
> Approximations — the missing order from §2.1, supplied: "The set of approximations
> `⟦A⟧_approx` consists of values with the same shape as in `⟦A⟧_eval`, possibly with some
> subterms replaced with a special value `⊥` representing an unneeded thunk. Approximations
> are ordered by definedness. This partial order, denoted `a ≤ b`, is defined inductively …
> `⊥ ≤ a` for all `a`. The `≤` relation is reflexive, and all constructors … are monotone."
>
> The three theorems that pin it down (§3.3, "Correctness: Correspondence with Clairvoyant
> Semantics"):
> - "**Theorem 3.7 (Functional correctness).** Let `g ∈ ⟦Γ⟧_eval`, and `g' ≺ g`.
>   `∀(n, a') ∈ ⟦M⟧_cv(g'), a' ≺ ⟦M⟧_eval(g)`"
> - "**Theorem 3.8 (Cost existence).** … `g₁ ≤ g₂ ⟹ ∃(n₂, a₂) ∈ ⟦M⟧_cv(g₂), n = n₂ ∧ a₁ ≤ a₂`"
> - "**Theorem 3.9 (Cost minimality).** … `∀(n₂, a₂) ∈ ⟦M⟧_cv(g₂), a₁ ≤ a₂ ⟹ n ≤ n₂ ∧ g₁ ≤ g₂`"
>
> And the guard against triviality, stated by the authors: "Note that the minimality property
> forbids the trivial definition `⟦M⟧_dem(g, a) = (0, ⊥_g)`."
>
> The amortization method: "we propose the **reverse physicist's method**, a novel variant of
> the classical physicist's method … [which] makes use of a potential function, which we apply
> to **approximations** of datatypes to describe their accumulated potential." Applied to
> "Okasaki's banker's queue and implicit queue" to prove them "both amortized and persistent",
> and: "Our mechanized proof **does not rely on trusting the demand functions**."
>
> **Artifact:** Zenodo DOI `10.5281/zenodo.11493754`, v1.0.0, 5 June 2024, MIT license
> (`LazyAnalysis-ICFP24-artifact.tar.gz` + VM image). Rocq Prover.
>
> **Limitations, stated by the authors:** "All of our examples of demand functions were
> translated manually … an automatic translation would significantly improve the usability."
> "The bidirectional demand semantics presented here **does not support general recursive and
> higher-order functions**."

**Step 3 — the line is live in 2026.** From Yao Li's publication page (`EVIDENCE`, read this
session):

- Xing Li, Yao Li, Peter Schachte, Christine Rizkallah, *The Memorist Tale: Every Thunk Every
  Cost All At Once*, **ESOP 2026**, DOI `10.1007/978-3-032-22720-1_17`, artifact
  `10.5281/zenodo.18168559`.
- Nicholas Coltharp, Steven Libby, Laura Israel, Yao Li, *Unifying Hindsight and Foresight:
  Lazy Cost Analysis as Functional Logic Programming*, **FLOPS 2026**, DOI
  `10.1007/978-981-92-0184-6_5`, artifact `10.5281/zenodo.18808173`.

`JUDGMENT`: the estate's charter cites Xia for interaction trees; this is a second, entirely
separate body of his work that is closer to the *dynamics* thesis than ITrees are. If the
store ever needs a demand semantics, this is the design, the theorem shapes, and a live
artifact, from an author the estate already tracks. **Recommend adding it to `REFERENCES.md`
alongside the dissertation, with the same provenance discipline.**

### 2.5 Relevance and usage typing

Deliberately brief: the sibling `cost-semantics-survey.md` owns graded and quantitative types
and this survey will not duplicate it. The one-line map, for orientation:

`[standing knowledge — DOIs unverified this session]` Ghica & Smith, *Bounded Linear Types in
a Resource Semiring* (ESOP 2014); Brunel, Gaboardi, Mazza, Zdancewic, *A Core Quantitative
Coeffect Calculus* (ESOP 2014); Petricek, Orchard, Mycroft, *Coeffects* (ICFP 2014); Atkey,
*Syntax and Semantics of Quantitative Type Theory* (LICS 2018); Orchard, Liepelt, Eades,
*Quantitative Program Reasoning with Graded Modal Types* (ICFP 2019, the Granule language);
Brady, *Idris 2: Quantitative Type Theory in Practice* (ECOOP 2021).

`JUDGMENT` — the one observation this survey adds, because it belongs here and not in the
cost survey: **graded types and semiring provenance are the same algebra pointed in opposite
directions.** A graded type `!_r A` annotates a *variable* with how much it will be used —
demand looking forward. A provenance polynomial annotates a *fact* with how it was used —
demand looking back. Both are semiring-valued, both use the same zoo (`N` for counting, `B`
for relevance, tropical for cost, a security lattice for confidentiality). `JUDGMENT`: for
the entity store the **backward** direction is primary (the store records what happened), so
provenance is the right instrument and grading is the sibling survey's business.

### 2.6 Mechanization scoreboard for this thread

| Work | Prover | Where | State |
|---|---|---|---|
| Launchbury natural semantics | Isabelle/HOL(CF) | AFP `Launchbury`, 2013-01-31 | complete, refereed |
| GHC's Call Arity | Isabelle/HOL(CF) | AFP `Call_Arity`, 2015-02-20 | complete, refereed; quantitative safety proved |
| Clairvoyance monad + adequacy | Coq | `lastland/ClairvoyanceMonad`, push 2025-02-07 | complete, no admits; `Clairvoyance.v` axiom-free |
| Bidirectional demand semantics | Rocq | Zenodo `10.5281/zenodo.11493754`, 2024-06-05 | complete for the stated fragment |
| Denotational interpreters / usage analysis | Guarded Cubical Agda | supplement to arXiv:2403.02778 | totality only |
| Wadler–Hughes projections | — | — | **`GAP`: no mechanization found** |
| Sergey/Vytiniotis/SPJ cardinality analysis | — | — | **`GAP`: no mechanization found** |

### 2.7 Verdict

**(a) Store dynamics.** `JUDGMENT`: **not v1, but the best-specified option for later, and
with a concrete entry cost.** Demand semantics answers a *finer* question than the store
currently asks: not "which entities were touched" but "which parts of this entity were
needed". Nothing in the v1 store answers partial reads — decode is all-or-nothing — so there
is no demand to denote yet. The entry cost is one datatype (`ValueA`/`SchemaA` with `⊥`) plus
a definedness order; after that, `canonV` becomes a genuine projection (§2.1) and
`decode^D : Value → ValueA → ℕ × ValueA` is a well-posed object with three known theorem
shapes to hit.

**(b) Central bus.** `JUDGMENT`: **modest.** Demand is about intra-artifact granularity; the
bus is about inter-artifact links. The one bus-relevant transfer is the *minimality*
discipline: Theorem 3.9's "there is exactly one minimal input demand" is the shape the estate
should want for evidence links too — not "these sources were available" but "these sources
were **necessary**". Recording a minimal evidence set rather than an ambient one is the same
theorem shape in a different domain, and it is a better question than the bus currently asks.

---

## 3. Demand-driven and incremental computation

### 3.1 Build Systems à la Carte — the close kin, mapped exactly

> `EVIDENCE` — Andrey Mokhov, Neil Mitchell, Simon Peyton Jones, *Build Systems à la Carte*,
> PACMPL 2(ICFP), Article 79, September 2018, DOI `10.1145/3236774`; extended as
> *Build systems à la carte: Theory and practice*, JFP 30:e11, 2020, 55 pp., DOI
> `10.1017/S0956796820000088`. Quotations below are from the JFP text.

The types, verbatim:

```haskell
newtype Task  c k v      = Task (forall f. c f => (k -> f v) -> f v)
type    Tasks c k v      = k -> Maybe (Task c k v)
type    Build c i k v    = Tasks c k v -> k -> Store i k v -> Store i k v
type    Scheduler c i ir k v = Rebuilder c ir k v -> Build c i k v
type    Rebuilder c   ir k v = k -> v -> Task c k v -> Task (MonadState ir) k v
```

The two definitions the estate would inherit:

> "**Definition (Minimality).** A build system is minimal if it executes tasks at most once
> per build and only if they transitively depend on inputs that changed since the previous
> build."
>
> "**Definition (Correctness).** … The build result is correct if the following two conditions
> hold: • `result` and `store` agree on inputs, that is, for all input keys `k ∈ I`:
> `getValue k result == getValue k store`. In other words, no inputs were corrupted during the
> build. • The result is consistent with the tasks, i.e. for all non-input keys `k ∈ O`, the
> result of recomputing the corresponding task matches the value stored in the result:
> `getValue k result == compute task result`. A build system is correct if it produces a
> correct result for any `tasks`, `key` and `store`."
>
> With the caveat the estate should note, because it is law L7 restated from the other side:
> "It is hard to satisfy the above definition of correctness given a task description with
> cycles. **All build systems discussed in this paper are correct only under the assumption
> that the given task description is acyclic.**"

The trace taxonomy — this is the part that maps onto the store one-to-one:

```haskell
-- §5.2 verifying traces: hashes only, small, verify-or-rebuild
recordVT :: k -> Hash v -> [(k, Hash v)] -> VT k v -> VT k v
verifyVT :: (Monad m, Eq k, Eq v) => k -> Hash v -> (k -> m (Hash v)) -> VT k v -> m Bool

-- §5.2.1 the record itself
data Trace k v a = Trace { key :: k, depends :: [(k, Hash v)], result :: a }
--   a = Hash v  for verifying traces
--   a = v       for constructive traces

-- §5.3 constructive traces: store the value; shareable; cloud builds
recordCT    :: k -> v -> [(k, Hash v)] -> CT k v -> CT k v
constructCT :: (Monad m, Eq k, Eq v) => k -> (k -> m (Hash v)) -> CT k v -> m [v]
```

> "**§5.3.** … Once we are storing the complete result it makes sense to record many
> constructive traces per key, and to share them with other users, providing cloud-build
> functionality. … In practice, many cloud build systems store hashes of values in the trace
> store … and have a separate **content-addressable cache** which associates hashes with
> their actual contents."
>
> "**§5.4 Deep Constructive Traces.** … A deep constructive trace optimises this process by
> only looking at the terminal input keys, ignoring any intermediate dependencies. … There are
> two primary disadvantages of deep constructive traces: • **Tasks must be deterministic** …
> • **No early cutoff** … since the results of intermediate computations are not considered."
> And the generalization: "the technique also works if we skip any number of dependency levels
> (say `n` levels). The input-only approach is the special case of `n = ∞`, and constructive
> traces are the special case of `n = 1`."

The design grid (Table 2, JFP §6):

| Rebuilder ↓ / Scheduler → | Topological | Restarting | Suspending |
|---|---|---|---|
| Dirty bit | Make | Excel | — |
| Verifying traces | Ninja | — | **Shake** |
| Constructive traces | CloudBuild | Bazel | *(empty — "CloudShake")* |
| Deep constructive traces | Buck | — | **Nix** |

> "**§6.5** … `nix :: (Ord k, Hashable v) => Build Monad (DCT k v) k v; nix = suspending
> dctRebuilder`." And "Bazel … uses the restarting scheduler and is an applicative build
> system, whereas Nix uses the suspending scheduler [and is monadic]."

**The mapping onto the entity store**, stated precisely (`JUDGMENT`):

| BSLC | Entity store |
|---|---|
| `k` (key) | an **address** |
| `v` (value) | pre-image bytes at that address |
| `Hash v` | **collapses into `k`** — in a content-addressed store the hash *is* the key |
| `Store i k v` | the store map plus the trace store `i` |
| `Task` | a derivation: admission, canonicalization, decode, projection, proof |
| `Tasks c k v` | the derivation registry (the §4.1 closed vocabulary, by name) |
| `Trace k v v` | `(derived address, [source addresses], recipe address)` |
| the trace store `i` | **itself entities in the store** — P2 applied to the dynamics |
| "correct build" | "every derived entity's address equals the address of recomputing its derivation from its recorded sources" |

Three consequences the estate can act on:

1. **`Hash v = k` is a real simplification, not a cosmetic one.** BSLC's `Trace` carries
   `[(k, Hash v)]` because keys and content are separate. In a content-addressed store the
   pair degenerates to a single address, and a constructive trace becomes
   `(out : Address, deps : List Address, recipe : Address)` — three addresses and a list.
   That is small enough to be an entity under its own schema.
2. **The estate sits in the empty cell, not Nix's.** Nix is input-addressed and therefore
   lands at deep constructive traces, paying determinism-as-an-assumption and losing early
   cutoff. A content-addressed store with per-derivation traces is *constructive traces*, one
   row up; combined with a suspending scheduler (forced, because what a derivation demands can
   depend on what it read — a monadic `Task`) it lands exactly in BSLC's unfilled cell, the one
   the authors name CloudShake and describe as providing "many benefits". `JUDGMENT`: this is
   a concrete architectural win to bank, and it is the same trade `hash-db-anatomy.md` §5.2
   already tabulated ("Early cutoff … impossible [input-addressed] / possible
   [content-addressed]") — now with a name, a taxonomy position, and a correctness definition.
3. **Deep constructive traces remain available as an *option*, per artifact kind.** The
   anatomy document's §5.3 advice — "Know which axis you are on, per artifact kind" — is
   BSLC's `n`-levels generalization. A store can hold both, distinguished by the kind tag,
   with the determinism obligation attached only to the deep ones.

### 3.2 Self-adjusting computation

> `EVIDENCE`, via the background reader, quoting Umut A. Acar, *Self-Adjusting Computation*,
> PhD thesis, CMU-CS-05-129, May 2005:
> "**Formally, a dynamic dependence graph `DDG = ((V, L), (E, D))` consists of nodes
> partitioned into vertices `V` and locations `L`, and a set of edges partitioned into call
> edges `E ⊆ V × V`, and dependences: `D ⊆ L × V`.** The tree `(V, E)` is the
> (function-)call tree for the execution."
>
> The invariant that makes it a semantics rather than a cache: "A property of the
> change-propagation algorithm is that **the DDG after change propagation is identical to the
> DDG that would have been given by a from-scratch re-execution** of the program on the
> changed input."
>
> Trace stability (Def. 23, "Worst-Case Stability"), built on a trace-distance metric
> `δ_C(T,T′) = Σ_{v∈Y} w(v) + Σ_{v′∈R} w(v′)` over unpaired vertices under a cognate relation.
>
> Also: Acar, Blelloch, Harper, *Adaptive Functional Programming*, POPL 2002, pp. 247–259;
> TOPLAS 28(6):990–1034, 2006, DOI `10.1145/1186632.1186634`. And Acar, Blume, Donham,
> *A Consistent Semantics of Self-Adjusting Computation*, ESOP 2007, arXiv:1106.0478.

`GAP` — **no mechanization found** for DDGs, change propagation, or trace stability.

### 3.3 Adapton and demanded computation graphs

> `EVIDENCE`, via the background reader, quoting Hammer, Khoo, Hicks, Foster, *Adapton:
> Composable, Demand-Driven Incremental Computation*, PLDI 2014, pp. 156–166, DOI
> `10.1145/2594291.2594324` (extended as UMD CS-TR-5027):
> "To implement D²CP we use a novel form of execution trace we call the **demanded computation
> trace (DCT)**, which in practice we represent as a graph (the **DCG**)."
> "IC systems stratify a computation into two distinct layers. The **inner layer** performs a
> computation whose inputs may later change… The **outer layer** actually changes these inputs
> and decides what to do with the (automatically updated) inner-layer outputs."
> "when the outer layer mutates a reference cell, the **dirtying phase** sets the dirty flag of
> certain nodes and edges; when the outer layer re-forces a thunk already present in the graph,
> the **propagate phase** traverses the graph … repairing dirty graph components by
> re-evaluating dirty thunk nodes."
> Core calculus: `λ_ic^cdd`, "an extension of Levy's call-by-push-value (CBPV) calculus."
> Meta-theory: subject reduction, inner purity, inner determinism.
>
> Successor: Hammer, Dunfield, Headley, Labich, Foster, Hicks, Van Horn, *Incremental
> Computation with Names*, OOPSLA 2015, DOI `10.1145/2814270.2814305`, arXiv:1503.07792.

`GAP` — **no mechanization found**; the reader checked Hammer's GitHub account directly.

`JUDGMENT`: Adapton is the closest thing in the literature to the operator's phrase "which
entities become hot during computation" — the DCG *is* a heat map, maintained as a first-class
object rather than sampled. But it is a *mutable* graph over *mutable* refs, and the entity
store is append-only over immutable addresses. The transferable idea is the inner/outer
stratification, which the store already has in a different guise: the store (inner, pure,
addressed) and the name layer (outer, mutable, beside the store). `JUDGMENT`: worth naming
that correspondence in the store's own vocabulary; not worth importing the machinery.

### 3.4 The incremental λ-calculus

> `EVIDENCE`, via the background reader, quoting Cai, Giarrusso, Rendel, Ostermann, *A Theory
> of Changes for Higher-Order Languages: Incrementalizing λ-Calculi by Static Differentiation*,
> PLDI 2014, pp. 145–155, DOI `10.1145/2594291.2594304`, arXiv:1312.0658:
> "**Definition 2.1.** A quadruple `V̂ = (V, Δ, ⊖, ⊕)` is a change structure (for `V`) if the
> following holds: (a) `V` is a set. (b) Given `v ∈ V`, `Δv` is a set, called the change set.
> (c) Given `v ∈ V` and `dv ∈ Δv`, `v ⊕ dv ∈ V`. (d) Given `u, v ∈ V`, `u ⊖ v ∈ Δv`.
> (e) Given `u, v ∈ V`, `v ⊕ (u ⊖ v)` equals `u`."
> The headline equation: "`f (a ⊕ da) ≅ (f a) ⊕ (Derive(f) a da)`."
> "**Theorem 2.9 (Nil changes are derivatives).**"
>
> **Mechanization — two, both confirmed:**
> - **Agda**: `github.com/inc-lc/ilc-agda`, last commit **2018-04-06**, 1,032 commits; the
>   paper says "a machine-checked formalization in Agda"; the README claims every lemma and
>   theorem in §§2–3.
> - **Coq**: `github.com/inc-lc/cts` for Giarrusso, Régis-Gianas, Schuster, *Incremental
>   λ-Calculus in Cache-Transfer Style*, ESOP 2019, LNCS 11423, DOI
>   `10.1007/978-3-030-17184-1_20`. From that paper: "Dealing with six distinct evaluation
>   environments at the same time was error prone on paper and for this reason, we conducted
>   the proof using Coq." Tested with Coq 8.8.1/8.8.2 + Equations 1.1. Extends correctness
>   from simply-typed to untyped via step-indexed logical relations.

`JUDGMENT`: **the best-mechanized item in thread 3, and the least immediately applicable.**
Change structures answer "given a delta on the input, compute a delta on the output" — which
presumes the store *updates* derived artifacts. The append-only store does not update; it mints
a new address. ILC becomes relevant exactly when schema evolution arrives (charter L4:
"negotiation, versioning, evolution"), because then "what changed between schema version *n*
and *n+1*, and what does that do to every entity derived under it" is a change-structure
question with a mechanized answer available. Named trigger in §7.4.

### 3.5 Demanded abstract interpretation

> `EVIDENCE`, via the background reader: Benno Stein, Bor-Yuh Evan Chang, Manu Sridharan,
> *Demanded Abstract Interpretation*, PLDI 2021, pp. 282–295, DOI `10.1145/3453483.3454044`.
> "Our technique, demanded abstract interpretation, lifts program syntax and analysis state to
> a dynamically evolving graph structure, in which program edits, client-issued queries, and
> evaluation of abstract semantics are all treated uniformly." Correctness claim: "desirable
> abstract interpretation meta-properties, including soundness and termination, are preserved
> … and … demanded analysis results are **equal to** those computed by a batch abstract
> interpretation."
> Successor: *Interactive Abstract Interpretation with Demanded Summarization*, TOPLAS,
> Feb 2024, DOI `10.1145/3648441`. (Not to be confused with Erhard et al., *Interactive
> Abstract Interpretation: Reanalyzing Whole Programs for Cheap*, arXiv:2209.10445 — a
> different group and a different line.)

`JUDGMENT`: the interesting move for the estate is "edits, queries, and evaluation treated
uniformly" — the demanded-analysis-graph is a single object in which *the question being
asked* is a node. That is the right instinct for a store whose dynamics are semantic content:
the demand itself should be representable, not ambient. Filed as a design principle, not a
formalism to import.

### 3.6 The Nix / input-addressing axis

> `EVIDENCE` — Eelco Dolstra, *The Purely Functional Software Deployment Model*, PhD thesis,
> Utrecht University, January 2006; Dolstra, de Jonge, Visser, *Nix: A Safe and Policy-Free
> System for Software Deployment*, LISA 2004, pp. 79–92.
>
> BSLC's own summary (JFP §9.1): "Nix … has coarse-grained dependencies, with precise hashing
> of dependencies and downloading of precomputed build products. We provided a model of Nix in
> Section 6.5, although it is worth noting that Nix is not primarily intended as a build
> system."

This is the point where the survey and `hash-db-anatomy.md` §5.2 meet. The anatomy document
already tabulated the trade ("Address known before/after", "Two recipes, identical output →
no dedup / dedup free", "'Address ⇒ content' holds only if builds are deterministic — an
assumption about the world", "Early cutoff impossible / possible"). BSLC supplies the missing
piece: **that trade is not Nix-specific, it is the deep-vs-shallow constructive trace axis,
parameterized by how many dependency levels you skip.** The anatomy's §7.5 warning ("an
input-addressed path has no self-check at all") is the same fact stated in integrity terms.

`GAP` — **no formal treatment of Nix, of derivations, or of the input-vs-content-addressed
distinction was found**, beyond BSLC's Haskell model and the Nix project's own documentation
(the manual's content-addressing pages, NixOS RFC 0062). The reader flags this negative as the
least-thoroughly-searched of the survey's negatives, because the web-search budget ran out
during that sub-investigation. **Do not cite it as settled.**

### 3.7 Mechanization scoreboard for this thread

| Work | Prover | Where | State |
|---|---|---|---|
| **Build Systems à la Carte** | Coq | `tuura/build-systems-in-coq`, last push **2018-12-09** | **`GAP` — abandoned WIP.** See below. |
| Forward build systems (Rattle) | **Agda** | `github.com/spall/rattle-model`; Spall, Mitchell, Tobin-Hochstadt, *Forward Build Systems, Formally*, CPP 2022, DOI `10.1145/3497775.3503687`, arXiv:2202.05328 | complete; **found a real bug in Rattle** |
| Selective applicative functors | Coq | `tuura/selective-theory-coq`, last commit 2020-03-12; Mokhov, Lukyanov, Marlow, Dimino, PACMPL 3(ICFP) Art. 101, DOI `10.1145/3341694` | partial; three free theorems taken as axioms |
| Self-adjusting computation | — | — | **`GAP`** |
| Adapton / DCG | — | — | **`GAP`** |
| ILC static differentiation | Agda | `inc-lc/ilc-agda`, 2018-04-06 | complete for §§2–3 |
| ILC cache-transfer style | Coq | `inc-lc/cts` | complete |
| Nix / content-addressed derivations | — | — | **`GAP`** (weakly searched) |

The Build Systems à la Carte negative is worth stating carefully, because it is the survey's
single most useful "nobody has done this" (`EVIDENCE`, read from the repository):

- The repo's own README: "[Build Systems à la Carte] formalised in Coq. **Work in progress.**"
- The accompanying abstract — Georgy Lukyanov & Andrey Mokhov, *Towards a Coq Formalisation of
  Build Systems*, CoqPL'19 extended abstract — says: "These complex build systems and
  frameworks use subtle algorithms and are mission-critical, yet **to the best of our knowledge
  they come with no formal proofs of correctness.** A recent ICFP paper … presented a definition
  of correctness for build systems, and modelled several major build systems in Haskell,
  **without exhibiting any proof of their correctness.** … This is an experience report on
  on-going work which is **very far from being complete.**"
- And `src/Build/SystemAcyclic.v` line 14 reads, in full:
  `Definition undefined {a : Type} : a. Admitted.`

`JUDGMENT`: seven years on, that is where it still stands. **No build system's correctness
has been machine-checked against the BSLC definition.** If the estate proves its store's
derivation layer correct against that definition in Lean 4, it is not catching up to prior
art — it is first, in a field whose own authors said in print that the proofs do not exist.

### 3.8 Verdict

**(a) Store dynamics.** `JUDGMENT`: **take BSLC's vocabulary and correctness definition
whole; take nothing else from this thread at v1.** The trace record is the physical carrier
for everything §1 wants to compute over, and the correctness definition is the first
non-identity theorem the store's dynamics layer can state. Self-adjusting computation and
Adapton are the wrong shape (mutable graphs over mutable refs). ILC is the right shape for a
question the store does not yet ask.

**(b) Central bus.** `JUDGMENT`: **strong, and it resolves a naming problem.** The charter's
"recorded links between artifacts and their evidence" *is* a constructive trace store. Naming
it that buys: an existing correctness definition, an existing minimality definition, the early
cutoff property with a precise statement of when it is and is not available, and the
determinism obligation attached to exactly the traces that need it. It also makes the kickoff
§10.6 reflexive endpoint concrete — "obligations and receipts become entities in it" is
"the trace store `i` lives in the store", which BSLC's `Store i k v` type says is a legitimate
place to put it.

---

## 4. Dependency as semantics

### 4.1 The Dependency Core Calculus

> `EVIDENCE` (bibliographic only) — Martín Abadi, Anindya Banerjee, Nevin Heintze, Jon G.
> Riecke, *A Core Calculus of Dependency*, POPL 1999, DOI `10.1145/292540.292555`. Title,
> authors, year and venue confirmed via the Semantic Scholar record; **`GAP` — the full text
> could not be retrieved this session** (no open-access copy located before the search budget
> ran out), so no quotation from DCC itself appears below.

`[standing knowledge, stated at the level the survey is confident in]`: DCC's contribution is
that four apparently unrelated analyses — binding-time analysis, information-flow security,
program slicing, and call tracking — are all instances of one calculus, in which a lattice of
levels `ℓ` indexes a family of monadic type constructors `T_ℓ`, and the key judgment is
"type `τ` is protected at level `ℓ`". Noninterference is the theorem that a computation at
a level cannot observe data above it.

`JUDGMENT`: **the idea the estate needs from DCC does not require the paper's details.** It
is: *dependency is a lattice-indexed modality, and every analysis that asks "does this depend
on that" is the same calculus at a different lattice.* Which is, in semiring terms, §1.3's
confidentiality semiring — and the two literatures met explicitly in §4.3.

### 4.2 Descendants

`EVIDENCE` (bibliographic, verified via Semantic Scholar this session):

- Stephen Tse & Steve Zdancewic, *Translating Dependency into Parametricity*, ICFP 2004,
  DOI `10.1145/1016850.1016868`.
- William J. Bowman & Amal Ahmed, *Noninterference for Free*, ICFP 2015,
  DOI `10.1145/2784731.2784733`.
- Andrew K. Hirsch & Ethan Cecchetti, *Giving Semantics to Program-Counter Labels via Secure
  Effects*, PACMPL (POPL 2021), DOI `10.1145/3434316`.

`[standing knowledge — unverified this session]`: Shikuma & Igarashi identified and repaired
a defect in the original DCC noninterference argument; Algehed and Russo have work on encoding
DCC in Haskell and a "perspective" paper on the calculus.

`GAP` — **no Coq/Agda/Isabelle/Lean mechanization of DCC or of its noninterference theorem
was found** (`gh search repos "dependency core calculus noninterference"` → empty; no
formalization surfaced in any of the retrieved bibliographies). Mechanized noninterference
exists for *specific* languages and IFC type systems; a mechanization of DCC-the-core-calculus
was not located.

### 4.3 Provenance as dependency analysis — the bridge between threads 1 and 4

This is the paper that makes threads 1 and 4 one thread.

> `EVIDENCE` (bibliographic) — James Cheney, Amal Ahmed, Umut A. Acar, *Provenance as
> Dependency Analysis*, DBPL 2007; journal version in *Mathematical Structures in Computer
> Science* 21(6), 2011, DOI `10.1017/S0960129511000211`. The journal version supersedes the
> conference paper. **`GAP` — the full text could not be retrieved this session.**
>
> `EVIDENCE` (quoted, from a primary source that *is* in hand) — the survey of record
> describes it as follows: "The dependency provenance model proposed by Cheney et al. [20] was
> defined in terms of NRC … In this approach each part of the database carries a set of
> annotations, and an annotation–propagation semantics is defined such that the annotations on
> a part of the output highlight parts of the input on which the given output '**depends**'.
> Cheney et al. develop a formal characterization of this dependence property **inspired by
> techniques in information flow security and program slicing**, show that obtaining
> '**minimal**' dependence information is **undecidable** for full NRC, and show that the
> annotation–propagation semantics is a **safe approximation**."
> — Cheney, Chiticariu, Tan, *Provenance in Databases: Why, How, and Where*, FnTDB 1(4), 2009,
> §5.

Two facts in that quotation are worth carrying forward as design constraints:

1. **Minimal dependence is undecidable in general.** So "these sources were *necessary*"
   (§2.7's aspiration) is not achievable by analysis for an arbitrary derivation language.
   It *is* achievable by *recording* — a trace says what was actually read. `JUDGMENT`: this
   is the strongest available argument for the recording-over-analysis posture, and it is
   also why the store's derivation vocabulary should stay a closed, named registry (§4.1 of
   the kickoff): minimal dependence is decidable for a finite, first-order vocabulary and
   undecidable the moment closures enter. Fail-closed admission buys decidable provenance.
2. **A safe approximation is the honest fallback**, and it is directional: over-approximating
   dependence is safe (you keep too much); under-approximating is unsound (you drop evidence
   the artifact actually rests on). The estate's GC policy inherits exactly this asymmetry.

### 4.4 Verdict

**(a) Store dynamics.** `JUDGMENT`: **DCC contributes the qualitative skeleton and nothing
operational.** "Dependency degree" is not an independent mechanism — it is §1.3's
confidentiality semiring, i.e. a homomorphic image of the provenance polynomial into a finite
lattice. Building a separate dependency layer would duplicate the semiring layer. Build the
semiring layer; get the dependency layer by choosing `K` to be a lattice.

**(b) Central bus.** `JUDGMENT`: **one specific, high-value use.** The estate's claim-gate
ladder G0–G6 *is* a lattice of levels, and "this artifact's claim is protected at gate `n`"
is a DCC-shaped judgment. The theorem the estate would want — *a G2 claim may not depend on
G0 evidence except through a declared admission* — is noninterference in the gate lattice.
`JUDGMENT`: that is a genuinely attractive future statement and it is stated in the semiring
frame with `K = (gates, min, max, ⊥, ⊤)`, evaluated on the artifact's provenance polynomial.
Record it as a candidate; do not build a DCC.

---

## 5. Memoization and hash-consing semantics

### 5.1 Hash-consing, formally

> `EVIDENCE` — Thomas Braibant, Jacques-Henri Jourdan, David Monniaux, *Implementing and
> reasoning about hash-consed data structures in Coq*, Journal of Automated Reasoning 53(3),
> 2014, DOI `10.1007/s10817-014-9306-0`; arXiv:1311.2959v4 (25 Sep 2015). Predecessor: ITP
> 2013, *Implementing hash-consed structures in Coq*.
>
> "**Hash-consing** is a programming technique used to share identical immutable values in
> memory, keeping a single copy of semantically equivalent objects. … A hash-consing library
> maintains a global pool of expressions and never recreates an expression equal to one already
> in memory … This makes it possible to get **maximal sharing** between objects, if
> hash-consing is used systematically when creating objects."
>
> "We report on **four different approaches** to implementing hash-consing in Coq programs":
> **pure-deep** ("a deep embedding of memory as finite maps and uses indices as surrogates of
> pointers"), **pure-shallow** ("a shallow embedding of memory"), **smart** ("an 'impure'
> implementation … we implement hash-consing and memoization through the **extraction
> mechanism** of Coq"), and **smart+uid** ("a variation … in which we discuss how to expose and
> **axiomatize** the operations on the unique identifiers associated with BDD nodes").
>
> The trade the paper is honest about: "We explore the different trade-offs between faithful
> use of pristine extracted code, and code that is fine-tuned to make use of OCaml programming
> constructs not available in Coq. We discuss the possible consequences in terms of
> performances and **guarantees**."

> `EVIDENCE` — Jean-Christophe Filliâtre & Sylvain Conchon, *Type-Safe Modular Hash-Consing*,
> ML Workshop 2006, DOI `10.1145/1159876.1159880` — the OCaml library the Coq work is
> "inspired by".

`JUDGMENT`: the four-way split is the estate's own material/abstract spectrum (kickoff §10.2)
in a different domain, and the verdict transfers: only **pure-deep** and **pure-shallow**
survive an axiom allowlist of three; **smart** and **smart+uid** move the guarantee into
extraction and into axioms respectively. Since the entity store *is* a hash-cons table by
construction — an address is a maximal-sharing key — the estate is on the pure side by
architecture, not by discipline. That is a structural advantage worth stating.

### 5.2 Lean 4's own hash-consing, measured — and why the estate cannot use it

`EVIDENCE`, read from the local toolchain `leanprover--lean4---v4.33.1/src/lean` this session:

`Init/ShareCommon.lean`:
```lean
unsafe def Object.ptrEq (a b : Object) : Bool := ...
@[extern "lean_sharecommon_eq"]   unsafe opaque Object.eq   (a b : @& Object) : Bool
@[extern "lean_sharecommon_hash"] unsafe opaque Object.hash (a : @& Object) : UInt64
@[implemented_by StateFactory.mkImpl] opaque StateFactory.mk : StateFactoryBuilder → StateFactory
@[implemented_by mkStateImpl]         opaque State.mk (σ : StateFactory) : State σ
@[extern "lean_state_sharecommon"]
def State.shareCommon {σ : @& StateFactory} (s : State σ) (a : α) : α × State σ := (a, s)
@[extern "lean_sharecommon_quick"]
def ShareCommon.shareCommon' (a : @& α) : α := a
```

`Init/Util.lean`:
```lean
unsafe opaque ptrAddrUnsafe {α : Type u} (a : @& α) : USize
@[inline] unsafe def ptrEq (a b : α) : Bool := ptrAddrUnsafe a == ptrAddrUnsafe b
@[implemented_by withPtrEqUnsafe]
def withPtrEq {α : Type u} (a b : α) (k : Unit → Bool) (h : a = b → k () = true) : Bool := k ()
```

Two observations, and they point in opposite directions.

**(i) The soundness discipline is exactly right, and worth stealing.** `shareCommon'` is
*definitionally the identity* — `def shareCommon' (a : @& α) : α := a` — with the maximal-sharing
implementation installed only by `@[extern]`. `withPtrEq` is a plain `def` returning `k ()`,
whose fast path is installed by `@[implemented_by]` and whose *caller* must supply
`h : a = b → k () = true`. That is the canonical statement of "hash-consing has no denotation":
**it is the identity function, and its only observable is time.** `JUDGMENT`: if the estate
ever wants sharing, this is the pattern — a function that is `id` in the kernel and fast in the
runtime, with the proof obligation on the caller.

**(ii) But every constant on that path trips the estate's own standing gate.** The kickoff §12
proposes, with operator assent, "a ~15-line environment scan asserting no constant in an
artifact's namespaces is `opaque`/`unsafe` or carries `@[implemented_by]`/`@[extern]`". Lean's
hash-consing stack is built from precisely those four constructs. `JUDGMENT`: **the estate
cannot use Lean 4's native maximal sharing inside a gated artifact, and this is the right
answer, not a limitation** — because in a content-addressed store, sharing is not a runtime
optimization at all. It is the *specification*: two entities with the same address *are* the
same entity, by the encoder-injectivity obligation, provable in the kernel. The store gets
maximal sharing as a theorem where Lean gets it as an `@[extern]`.

### 5.3 Memoization soundness

> `EVIDENCE` — Umut A. Acar, Guy E. Blelloch, Robert Harper, *Selective Memoization*, POPL
> 2003, DOI `10.1145/604131.604133`; extended version arXiv:1106.0447. From the extended text:
> the paper gives "a **type system** to enable the programmer to express programs that reveal
> their true data [dependences]", formalizes the core language MFL, and: "The main result is a
> **soundness theorem stating that memoization does not affect the outcome of evaluation** as
> compared to the non-memoized semantics (Theorem 5)." "We prove the soundness of MFL relative
> to a **non-memoizing semantics** for the language." Notably: "we impose **no linearity
> constraints** in our type system."

> `EVIDENCE` — Simon Wimmer, Shuwei Hu, Tobias Nipkow, *Verified Memoization and Dynamic
> Programming*, ITP 2018, pp. 579–596, DOI `10.1007/978-3-319-94821-8_34`. AFP entry
> **`Monad_Memo_DP`** (*Monadification, Memoization and Dynamic Programming*), 22 May 2018,
> BSD: "We present a lightweight framework for the **automatic verified** (functional or
> imperative) memoization of recursive functions. Our tool can turn a pure Isabelle/HOL
> function definition into a monadified version in a state monad or the Imperative HOL heap
> monad, and **prove a correspondence theorem**."

> `EVIDENCE` — David Monniaux & Cyril Six, *Simple, Light, Yet Formally Verified, Global Common
> Subexpression Elimination and Loop-Invariant Code Motion*, LCTES 2021, DOI
> `10.1145/3461648.3463850`, arXiv:2105.01344 — hash-consing inside a verified compiler.

`JUDGMENT`: `Monad_Memo_DP` is the shape the estate should note. It does not prove "the cache
is correct"; it proves **the memoized function equals the pure function**, automatically, by a
correspondence relation — the same move as Shape B in kickoff §12 (a generated correspondence
that the kernel checks, with an empty TCB). The estate already owns that pattern.

### 5.4 The memo table as heat map — an honest gap

The brief asks for "the store as a memo table whose hit pattern IS the heat map". `GAP`:
**this framing is thin in the literature.** What exists:

- Adapton's DCG (§3.3) is the closest — a demanded-computation graph that *is* the reuse
  record — but it is not treated as a denotation and is not mechanized.
- BSLC's trace store (§3.1) is the closest *formalized* object, and it comes with a
  correctness definition — but the traces are treated as build metadata, and the paper proves
  nothing about them.
- The cost-semantics literature (Danielsson's thunk-annotated types; Xia et al.'s clairvoyance
  monad, §2.4) makes *cost* denotational but treats the cache as heap structure to be avoided,
  not as an observable to be denoted. Xia et al. explicitly position their work against
  "approaches based on heaps of mutable cells … which rely on separation logic".
- Nothing found treats *cache hits* as semantic content in the operator's sense.

`JUDGMENT`: this is a real opening, and the survey believes it is the operator's thesis at its
sharpest. The reason nobody has done it is that in every one of these settings the memo table
is an implementation of an equivalence the language already has, so its hits carry no
information the semantics needs. **In a content-addressed store that is false**: the address
*is* the equivalence class, the store *is* the quotient, and a hit is the observation that two
independently-derived things were the same thing. That observation has semantic content —
it is a witness of the declared equivalence — and it is exactly what the provenance polynomial
records when a monomial's coefficient exceeds one ("computed in three different ways"). `JUDGMENT`:
the coefficient of a monomial in `N[X]` **is** the hit count, and that is the survey's tidiest
answer to "the memo table's hit pattern is the heat map".

### 5.5 Verdict

**(a) Store dynamics.** `JUDGMENT`: **the store already is the memo table; do not build a
second one.** Take the "hash-consing is the identity, only time differs" discipline from Lean
core as a *design principle*, note that the estate gets it as a theorem rather than an
`@[extern]`, and read the coefficient of `N[X]` monomials as the hit count.

**(b) Central bus.** `JUDGMENT`: `Monad_Memo_DP`'s automatic correspondence theorem is the
model for how a derived artifact should relate to its recomputation, and it is the same shape
as the estate's Shape B gate. Reuse the pattern; there is nothing to import.

---

## 6. Trace semantics for observability (brief)

This section deliberately does not duplicate `.staging/e2/itrees-ctrees-literature-notes.md`.
What the estate already holds, and which is the relevant fact:

> Already held (`itrees-ctrees-literature-notes.md` §4.3(C)): **ITrees ↔ traces**
> (`Interp/Traces.v`): `trace_incl ⟺ sutt`, **`trace_eq ⟺ eutt`** — weak bisimulation
> coincides with trace equivalence.

`JUDGMENT`: that correspondence is the licence to use traces for usage questions without
importing concurrency theory. If the estate's derivation semantics is ever given an ITree
denotation (a T5-era question per §13), trace equivalence and the equational theory agree, so
a usage claim proved about traces is a claim about the denotation and not about an
instrumentation artifact.

The one genuinely new item this section adds is the database-side "trace as the most
informative provenance object", which is the missing rung between §1 and §3:

> `EVIDENCE` — James Cheney, Umut A. Acar, Amal Ahmed, *Provenance Traces*, arXiv:0812.0564,
> 2 Dec 2008 (extended report). Its contributions, verbatim in substance:
> "We define traces, traced evaluation for NRC queries, and a trace adaptation semantics."
> "We show that we can **extract** several other forms of provenance that have been developed
> for the NRC **from traces**, including where-provenance …, dependency provenance …, and
> **semiring-provenance** … Provenance traces thus **unify three previously unrelated
> provenance models**."
> "We state and prove properties which establish traces as a solid semantic foundation for
> provenance. Specifically, we show that the trace generated by evaluating an expression is
> **consistent** with the resulting store, and that such traces are 'explanations'."
> Successor: Cheney, Ahmed, Acar, *Database Queries that Explain their Work*, PPDP 2014,
> pp. 271–282, DOI `10.1145/2643135.2643143`, arXiv:1408.1675.

`JUDGMENT`: **this is the keystone of the synthesis.** It says the *trace* sits above the
polynomial in the informativeness hierarchy, and the polynomial is an extraction from it —
exactly as §1.3's hierarchy says `Why(X)` is an extraction from `N[X]`. So the store's
physical record should be the trace, the polynomial should be a derived view of the trace, and
heat should be a valuation of the polynomial. Three layers, each a homomorphic image of the
one above, each with a theorem saying the extraction commutes.

`[standing knowledge — DOIs unverified this session]` For completeness, the concurrency-theory
neighbours the brief mentioned and this survey recommends *not* entering at v1: Nielsen,
Plotkin, Winskel on event structures (TCS 1981) and Winskel's *Event Structures* (LNCS 255,
1987); Pratt, *Modeling Concurrency with Partial Orders* (IJPP 1986) and Gischer's equational
theory of pomsets (TCS 1988); van Glabbeek's linear-time/branching-time spectrum (CONCUR 1990).
`JUDGMENT`: the store's derivation traces are sequential and acyclic; event structures buy
concurrent independence structure the store does not have. Enter only if derivations become
genuinely concurrent *and* their independence is semantically significant — the same boundary
criterion §13 records for ctrees.

---

## 7. Synthesis — the recommended semantic shape for heat

### 7.1 The three candidates are three layers, not three options

`JUDGMENT`. The brief offered "semiring annotation on the store's DAG vs demand projections
vs build-trace semantics — they may compose." They compose, and the composition order is
forced by the informativeness hierarchies in §1.3 and §6:

```
  LAYER 3   TRACE            what actually happened
            (BSLC constructive trace = Cheney provenance trace)
            record:  Step { out : Address, deps : List Address, recipe : Address }
            stored:  as entities, under their own schema        [P2: the dynamics are in the store]
                │
                │  extraction (a homomorphism; the theorem says it commutes)
                ▼
  LAYER 2   POLYNOMIAL       how it depended
            N[Address] — the free commutative semiring over source addresses
            coefficient of a monomial = number of distinct derivations = memo-hit count
                │
                │  Eval_v : N[X] → K  (Prop 4.2: unique, for any valuation v)
                ▼
  LAYER 1   VALUATION        the question you are asking
            K = N        → usage count           "how hot"
            K = (N∞,min,+,∞,0) → cost            "how expensive"
            K = B        → retention             "is it collectable"     [anatomy §7.4]
                             (evaluate a root's polynomial at the candidate's indicator)
            K = gates    → claim level           "what grade does this evidence support"
            K = C        → clearance             "who may see the result"
            K = PosBool  → conditional presence  "under which pins does it exist"
```

**Demand projections are not a fourth layer at this granularity — they are a refinement of
Layer 3 *inside* one entity**, and they have no work to do until the store answers partial
reads (§2.7). They are correctly deferred, not rejected.

### 7.2 Why this shape and not the alternatives

- **Why not heat as a number on each entity.** A number is a `K`-valuation with `K` fixed at
  mint time. Fix `K` and you have chosen your question forever; §1.2's "if and only if" says
  you cannot recover any other question afterwards unless your choice happened to be the free
  one. Storing the polynomial costs more and answers everything.
- **Why not a set of contributing sources.** That is `Why(X)`, four rungs down §1.3's
  hierarchy: coefficients and exponents are gone, so counting and cost are unrecoverable.
  PODS 2007's own motivating example is precisely two tuples with identical why-provenance and
  different polynomials.
- **Why the trace and not just the polynomial.** §1.6: provenance is sensitive to query
  rewriting, so it is a property of the derivation performed, not of the input/output pair. A
  polynomial without the trace it came from cannot be re-derived or audited. §6: the trace is
  strictly more informative and the extraction is a theorem.
- **Why the store escapes the hard theory.** Law L7 makes the derivation graph acyclic, so
  every polynomial is finite and `N[X]` — the free, easy, universal case — suffices. No
  ω-continuity, no formal power series, no absorptive semirings (§1.4).
- **Why this is denotation and not telemetry.** Nothing here is sampled, and nothing is
  attached beside the artifact. The trace is a value in the store; the polynomial is a
  function of that value; heat is a function of the polynomial. The runtime is never
  instrumented, so the T7 risk row the operator rejected ("instrumentation changes the runtime
  path") does not arise: there is no path to change.

### 7.3 What could be stated at G1 in Lean 4 first

`JUDGMENT`. All of the following fit the estate's standing rules — v4.33.1 floor, no Mathlib,
pure kernel, allowlist `[propext, Classical.choice, Quot.sound]`, mutual-monomorphic carriers,
no derived instances, `termination_by structural`, `decide` cheap on `Nat`, expensive on
`String` — and all of them attach to the existing `formal/entity-store/` scaffold without
disturbing the identity spine.

**New files, in dependency order:**

```
E2/Semiring.lean     -- hand-rolled CommSemiring class + 3 instances; ~60 lines
E2/Prov.lean         -- Prov (free comm. semiring over Address) + eval; mutual-monomorphic
E2/Trace.lean        -- Step / Ledger; provOf : Ledger → Address → Prov
E2/Dynamics.lean     -- the theorems below
```

**Carrier sketch** — deliberately monomorphic and `List`-free where the survey's own §12
lesson bites (nested types refuse `induction`; a `Nat`-keyed representation keeps `decide`
cheap):

```lean
class CommSemiring (K : Type) where
  zero : K; one : K; add : K → K → K; mul : K → K → K
  add_comm : ∀ a b, add a b = add b a
  add_assoc : ∀ a b c, add (add a b) c = add a (add b c)
  add_zero : ∀ a, add a zero = a
  mul_comm : ∀ a b, mul a b = mul b a
  mul_assoc : ∀ a b c, mul (mul a b) c = mul a (mul b c)
  mul_one : ∀ a, mul a one = a
  mul_zero : ∀ a, mul a zero = zero          -- PODS'07 requires this explicitly
  distrib  : ∀ a b c, mul a (add b c) = add (mul a b) (mul a c)

-- The free object, concretely: a normalized list of (monomial, coefficient),
-- monomial = sorted address multiset. Address order reuses the byte order canonS
-- already needs for the R-10 field sort — no new ordering primitive.
inductive Mono | nil | cons (a : Address) (rest : Mono)
inductive Prov | nil | term (m : Mono) (c : Nat) (rest : Prov)

def eval [CommSemiring K] (v : Address → K) : Prov → K
```

**Theorem ledger — statements first, in the `unison-fragment`/`Obligations.lean` style
the scaffold already uses:**

| # | Statement shape | Why it matters | Cost |
|---|---|---|---|
| **P0** | `CommSemiring` instances for `B`, `N`, and `Trop := Option Nat` (min/+) each check | the zoo exists, kernel-checked | trivial; `decide`/`rfl` |
| **P1** | `provOf` is total and acyclic-well-founded on a `Ledger` with no repeated `out` | the record is well-formed | `termination_by structural` on the ledger |
| **P2a** | `eval v` **is a semiring homomorphism**: `eval v (add p q) = CommSemiring.add (eval v p) (eval v q)`, likewise for `mul`, `zero`, `one` | half of PODS'07 Prop 4.2 | structural induction; zero axioms |
| **P2b** | **Uniqueness**: any two homomorphisms `Prov → K` agreeing on single-address monomials are equal | the other half of Prop 4.2; **P4 falls straight out of it** | induction on `Prov` normal form |
| **P3** | **Factorization** (the estate's Theorem 4.3): heat computed directly in `K` over a ledger equals `eval v` of the polynomial computed over the same ledger | **the theorem that licenses "record once, answer many"** | induction over the ledger |
| **P4** | **Homomorphism commutation**: if `h : K → K'` is a semiring homomorphism then `h (eval v p) = eval (h ∘ v) p` | the erase-then-query = query-then-erase property (SIGMOD'12 Example 3.5); the access-control and gate-lattice results are corollaries | falls out of P2a+P2b: both sides are homomorphisms agreeing on generators |
| **P5** | **GC is a valuation**: `retained L roots addr = true ↔ ∃ r ∈ roots, eval (indicatorB addr) (provOf L r) = true`, in `K = B`. Note the direction: provenance runs derived → sources, so retention is a root's polynomial evaluated at the candidate's indicator, not the candidate's polynomial evaluated at the roots | **`hash-db-anatomy.md` §7.4 becomes a corollary of the dynamics semantics** | `decide`-friendly (`Bool`-valued) |
| **P6** | **Monotonicity**: appending a derivation to a ledger never decreases heat under a naturally-ordered `K` | matches the store's join-semilattice `ST1–ST4`; forbids "heat decay" from sneaking in as a primitive | induction |
| **P7** | **NEG — why-provenance is not enough** (the estate's own #3509-genre exhibit): exhibit two ledgers with identical `Why`-images (`K = P(X)`, `∪`/`∪`) and *distinct* `N[X]` polynomials, and prove the distinctness | the machine-checked argument for storing the polynomial, in the tradition of `v2_stream_not_injective` | small closed term; `decide` |
| **P8** | **Trace→polynomial extraction commutes** with ledger concatenation | the §6 keystone, in miniature | induction |
| **P9** | *(obligation, stated not proved at first pass)* the store's derivation combinators satisfy PODS'07 Prop 3.4's identity list **iff** the annotation domain is a commutative semiring | the "forced, not chosen" result — the estate's own justification for the algebra | hard; a second-pass seat |

**Standing non-claims to write beside them**, so no summary drifts:

- No claim that any *measured* usage in a running Effect program equals the model's valuation.
  Model heat and observed heat are related, if at all, only by a G4 differential lane, and the
  survey recommends the estate never assert that equality.
- No claim about cryptographic properties: `P5`'s reachability is about the ledger's address
  graph, not about the impossibility of forging an address.
- No claim of coverage: `provOf` is defined over the admitted derivation vocabulary only, and
  the vocabulary is enumerated by the same fail-closed `Accept` discipline as `SchemaCore`.
- No claim that provenance is invariant under equivalent derivations (§1.6 says it is not,
  and asserting it would be the estate's own rewriting-sensitivity defect).

**Why this is a good first bite.** It touches no existing obligation, adds no dependency, needs
no Mathlib, is `Nat`- and `Bool`-valued throughout (so it stays on the cheap side of the
`decide` wall measured in kickoff §12: ~150 000 nodes for `Nat` folds versus ~2 000 characters
for `String` encodes), and its hardest proof is a structural induction. And `P5` retires an
open storage question by turning it into a theorem.

### 7.4 Deferred, with named triggers

| Deferred | Trigger — the fact that fires it | Then reach for |
|---|---|---|
| ω-continuous / absorptive semirings, formal power series | the derivation relation acquires a cycle, or the store admits fixpoint-derived entities (a self-referential index, a transitively-closed link table) | Green–Karvounarakis–Tannen §§5–6; Dannert–Grädel–Naaf–Tannen CSL 2021 (absorptive, `S∞[X]`, Theorem 17) |
| Bidirectional demand semantics; approximation types `ValueA`/`SchemaA` with `⊥` | the store answers a **partial** read — any projection that returns less than a whole entity | Xia, Israel, Kramarz, Coltharp, Claessen, Weirich, Li, PACMPL 8(ICFP) Art. 237; artifact `10.5281/zenodo.11493754`. Theorem shapes 3.7/3.8/3.9 transfer directly |
| Wadler–Hughes projection framing of `canonS`/`canonV` | same trigger as above — the order half `α ⊑ ID` needs a definedness order that only approximation types supply | Wadler & Hughes FPCA 1987; the `f : α ⇒ β` safety condition is the statement to aim at |
| Change structures / incremental λ-calculus | schema **evolution** (charter L4): the estate wants "what does bumping this schema do to every entity derived under it" rather than "mint a new address" | Cai–Giarrusso–Rendel–Ostermann PLDI 2014 + `inc-lc/ilc-agda`; the CTS successor + `inc-lc/cts` for the cache-carrying variant |
| DCC-style dependency modality on the gate lattice | the estate wants a *theorem* that a G2 claim cannot rest on unadmitted G0 evidence | Abadi–Banerjee–Heintze–Riecke POPL 1999 for the framing; but implement as `K = gate lattice` in the semiring layer, not as a separate calculus |
| Deep constructive traces / input-addressed derived artifacts | a derived artifact kind wants plan-ahead addressing (know the address before building) and can carry a determinism obligation | BSLC §5.4 and its `n`-levels generalization; `hash-db-anatomy.md` §5.2's trade table |
| Event structures / pomsets | derivations become concurrent **and** their independence is semantically significant | the §13 boundary criterion, restated: only when a rule's behaviour depends on the *existence* of other derivations |
| ITree denotation of derivations | the runtime lane's T5 opens (`yieldNow`, suspension) | already ruled and recorded in kickoff §13 — unchanged by this survey |

---

## 8. Honest gaps

1. **The DCC primary text was not obtained.** Title, authors, venue, year and DOI are verified;
   no quotation from the paper appears in §4.1, and the description there is marked standing
   knowledge. If §4.4's gate-lattice idea is ever promoted, the paper must be read first.
2. **"Provenance as Dependency Analysis" was not obtained either.** §4.3 quotes the Cheney–
   Chiticariu–Tan survey's description of it rather than the paper. The two facts carried
   forward (undecidability of minimal dependence; safe over-approximation) come from that
   secondary-but-authored source and should be re-checked against the MSCS paper before use.
3. **Nix has no located formal treatment**, and this negative is the weakest in the survey —
   the search budget ran out during that investigation. Do not cite it as settled.
4. **The final venue of *Abstracting Denotational Interpreters* is unconfirmed** (the arXiv PDF
   carries an unfilled acmart placeholder). The arXiv id and date are solid.
5. **Relevance/usage typing DOIs (§2.5) were not verified this session** and are marked as
   such. The sibling `cost-semantics-survey.md` owns that ground.
6. **The concurrency-theory citations in §6 are standing knowledge**, unverified this session,
   and deliberately not load-bearing — the section's recommendation is to stay out.
7. **No Lean 4 prior art exists for any thread in this survey.** Every mechanization found is
   Coq/Rocq, Agda, or Isabelle. Whatever the estate builds here it builds from scratch, and
   the reuse-first policy has nothing to point at.
8. **"Memo hits as semantic content" is genuinely under-served** (§5.4). The survey's proposed
   answer — the monomial coefficient *is* the hit count — is the survey's own `JUDGMENT` and
   has no citation behind it.

---

## 9. Receipts index

**Thread 1 — semiring provenance**
- Green, Karvounarakis, Tannen. *Provenance Semirings.* PODS 2007, pp. 31–40. DOI `10.1145/1265530.1265535`. *(read in full)*
- Karvounarakis, Green. *Semiring-Annotated Data: Queries and Provenance.* SIGMOD Record 41(3), 2012, pp. 5–14. DOI `10.1145/2380776.2380778`. *(read in full)*
- Buneman, Khanna, Tan. *Why and Where: A Characterization of Data Provenance.* ICDT 2001, LNCS 1973. DOI `10.1007/3-540-44503-X_20`. *(PDF in hand)*
- Cheney, Chiticariu, Tan. *Provenance in Databases: Why, How, and Where.* FnTDB 1(4):379–474, 2009. DOI `10.1561/1900000006`. *(read in part)*
- Green, Tannen. *The Semiring Framework for Database Provenance.* PODS 2017. DOI `10.1145/3034786.3056125`. *(metadata verified; text not read)*
- Grädel, Tannen. *Semiring Provenance for First-Order Model Checking.* arXiv:1712.01980, 2017-12-06. *(abstract read)*
- Dannert, Grädel, Naaf, Tannen. *Semiring Provenance for Fixed-Point Logic.* CSL 2021, LIPIcs 183, 17:1–17:22. DOI `10.4230/LIPIcs.CSL.2021.17`; arXiv:1910.07910. *(read in part)*
- Benzaken, Cohen-Boulakia, Contejean, Keller, Zucchini. *A Coq Formalization of Data Provenance.* CPP 2021, 18 pp. DOI `10.1145/3437992.3439920`; HAL `hal-03380459`. Development: `https://framagit.org/formaldata/provcert`. *(read in part)*
- ProvSQL: `github.com/PierreSenellart/provsql` (C++/PostgreSQL; last push 2026-08-25).
- Further reading, listing-verified only: arXiv:2106.12892 (Büchi games); arXiv:2202.10766 (Datalog); DOI `10.1007/978-3-030-64187-0_3` (guarded logics).

**Thread 2 — demand and usage**
- Wadler, Hughes. *Projections for Strictness Analysis.* FPCA 1987, LNCS 274, pp. 385–407. DOI `10.1007/3-540-18317-5_21`. *(read in part)*
- Sergey, Vytiniotis, Peyton Jones. *Modular, Higher-Order Cardinality Analysis in Theory and Practice.* POPL 2014. DOI `10.1145/2535838.2535861`. *(read in part)*
- Graf, Peyton Jones, Keidel. *Abstracting Denotational Interpreters.* arXiv:2403.02778v2, 2024-07-12. Guarded Cubical Agda supplement. *(read in part)*
- Breitner. AFP `Launchbury` (2013-01-31) and `Call_Arity` (2015-02-20). Isabelle/HOL + Nominal2 + HOLCF. *(entry pages read)*
- Hackett, Hutton. *Call-By-Need Is Clairvoyant Call-By-Value.* PACMPL 3(ICFP) Art. 114, 2019. DOI `10.1145/3341718`. *(read in part)*
- Li, Xia, Weirich. *Reasoning about the Garden of Forking Paths.* PACMPL 5(ICFP) Art. 80, 2021. DOI `10.1145/3473585`; arXiv:2103.07543. Repo `github.com/lastland/ClairvoyanceMonad` (push 2025-02-07; Coq 8.10.2–8.13.2 + Equations 1.2.4; `Clairvoyance.v` axiom-free, `Translation.v` uses funext + propext; no admits). *(paper and README read)*
- Xia, Israel, Kramarz, Coltharp, Claessen, Weirich, Li. *Story of Your Lazy Function's Life: A Bidirectional Demand Semantics for Mechanized Cost Analysis of Lazy Programs.* PACMPL 8(ICFP) Art. 237, 2024. DOI `10.1145/3674626`. Artifact Zenodo `10.5281/zenodo.11493754` (v1.0.0, 2024-06-05, MIT). *(read in part)*
- Li, Li, Schachte, Rizkallah. *The Memorist Tale: Every Thunk Every Cost All At Once.* ESOP 2026. DOI `10.1007/978-3-032-22720-1_17`; artifact `10.5281/zenodo.18168559`.
- Coltharp, Libby, Israel, Li. *Unifying Hindsight and Foresight: Lazy Cost Analysis as Functional Logic Programming.* FLOPS 2026. DOI `10.1007/978-981-92-0184-6_5`; artifact `10.5281/zenodo.18808173`.
- Bjerner, Holmström (1989) — the untyped origin of demand semantics, cited by Xia et al.; not retrieved.

**Thread 3 — demand-driven and incremental computation**
- Mokhov, Mitchell, Peyton Jones. *Build Systems à la Carte.* PACMPL 2(ICFP) Art. 79, 2018. DOI `10.1145/3236774`. Extended: JFP 30:e11, 2020, 55 pp. DOI `10.1017/S0956796820000088`. *(JFP read in part)*
- Lukyanov, Mokhov. *Towards a Coq Formalisation of Build Systems.* CoqPL 2019 extended abstract. Repo `tuura/build-systems-in-coq` (last push 2018-12-09; `Admitted` core). *(repo and abstract read)*
- Spall, Mitchell, Tobin-Hochstadt. *Forward Build Systems, Formally.* CPP 2022. DOI `10.1145/3497775.3503687`; arXiv:2202.05328. Agda; repo `github.com/spall/rattle-model`.
- Mokhov, Lukyanov, Marlow, Dimino. *Selective Applicative Functors.* PACMPL 3(ICFP) Art. 101, 2019. DOI `10.1145/3341694`. Coq: `tuura/selective-theory-coq` (2020-03-12).
- Acar. *Self-Adjusting Computation.* PhD thesis, CMU-CS-05-129, May 2005.
- Acar, Blelloch, Harper. *Adaptive Functional Programming.* POPL 2002, pp. 247–259; TOPLAS 28(6):990–1034, 2006. DOI `10.1145/1186632.1186634`.
- Acar, Blume, Donham. *A Consistent Semantics of Self-Adjusting Computation.* ESOP 2007; arXiv:1106.0478.
- Hammer, Khoo, Hicks, Foster. *Adapton: Composable, Demand-Driven Incremental Computation.* PLDI 2014, pp. 156–166. DOI `10.1145/2594291.2594324`; TR UMD CS-TR-5027.
- Hammer, Dunfield, Headley, Labich, Foster, Hicks, Van Horn. *Incremental Computation with Names.* OOPSLA 2015. DOI `10.1145/2814270.2814305`; arXiv:1503.07792.
- Cai, Giarrusso, Rendel, Ostermann. *A Theory of Changes for Higher-Order Languages.* PLDI 2014, pp. 145–155. DOI `10.1145/2594291.2594304`; arXiv:1312.0658. Agda: `inc-lc/ilc-agda` (2018-04-06).
- Giarrusso, Régis-Gianas, Schuster. *Incremental λ-Calculus in Cache-Transfer Style.* ESOP 2019, LNCS 11423. DOI `10.1007/978-3-030-17184-1_20`. Coq: `inc-lc/cts`.
- Stein, Chang, Sridharan. *Demanded Abstract Interpretation.* PLDI 2021, pp. 282–295. DOI `10.1145/3453483.3454044`. Successor: TOPLAS, Feb 2024, DOI `10.1145/3648441`.
- Dolstra. *The Purely Functional Software Deployment Model.* PhD thesis, Utrecht, January 2006. Dolstra, de Jonge, Visser. *Nix.* LISA 2004, pp. 79–92.

**Thread 4 — dependency**
- Abadi, Banerjee, Heintze, Riecke. *A Core Calculus of Dependency.* POPL 1999. DOI `10.1145/292540.292555`. *(metadata only)*
- Tse, Zdancewic. *Translating Dependency into Parametricity.* ICFP 2004. DOI `10.1145/1016850.1016868`.
- Bowman, Ahmed. *Noninterference for Free.* ICFP 2015. DOI `10.1145/2784731.2784733`.
- Hirsch, Cecchetti. *Giving Semantics to Program-Counter Labels via Secure Effects.* PACMPL (POPL 2021). DOI `10.1145/3434316`.
- Cheney, Ahmed, Acar. *Provenance as Dependency Analysis.* DBPL 2007; MSCS 21(6), 2011. DOI `10.1017/S0960129511000211`. *(described via the FnTDB survey)*
- Stolarek, Cheney. *Verified Self-Explaining Computation.* MPC 2019; arXiv:1907.05818. Coq (forward/backward slicing duality).

**Thread 5 — memoization and hash-consing**
- Braibant, Jourdan, Monniaux. *Implementing and reasoning about hash-consed data structures in Coq.* JAR 53(3), 2014. DOI `10.1007/s10817-014-9306-0`; arXiv:1311.2959v4. *(read in part)*
- Filliâtre, Conchon. *Type-Safe Modular Hash-Consing.* ML Workshop 2006. DOI `10.1145/1159876.1159880`. *(PDF in hand)*
- Acar, Blelloch, Harper. *Selective Memoization.* POPL 2003. DOI `10.1145/604131.604133`; extended arXiv:1106.0447. *(read in part)*
- Wimmer, Hu, Nipkow. *Verified Memoization and Dynamic Programming.* ITP 2018, pp. 579–596. DOI `10.1007/978-3-319-94821-8_34`. AFP `Monad_Memo_DP` (2018-05-22). *(entry page read)*
- Monniaux, Six. *Simple, Light, Yet Formally Verified, Global CSE and LICM.* LCTES 2021. DOI `10.1145/3461648.3463850`; arXiv:2105.01344.
- Lean 4 v4.33.1 sources, read locally: `Init/ShareCommon.lean`, `Init/Util.lean`.

**Thread 6 — traces**
- Cheney, Acar, Ahmed. *Provenance Traces.* arXiv:0812.0564, 2008-12-02. *(read in part)*
- Cheney, Ahmed, Acar. *Database Queries that Explain their Work.* PPDP 2014, pp. 271–282. DOI `10.1145/2643135.2643143`; arXiv:1408.1675.
- Already held by the estate: `.staging/e2/itrees-ctrees-literature-notes.md` §4.3(C) — `trace_eq ⟺ eutt`.

**Local estate documents this survey stands on**
- `CHARTER.md` (tower L0–L5, P1–P4, central bus, Xia as cited author)
- `.staging/e2/entity-store-kickoff.md` §§1–2, 4, 5, 12, 13, 14
- `.staging/explore/hash-db-anatomy.md` §5 (Nix, input- vs content-addressing), §7.4 (GC), §7.5 (integrity)
- `formal/entity-store/E2/Obligations.lean` (the existing obligation ledger this survey's §7.3 extends)
