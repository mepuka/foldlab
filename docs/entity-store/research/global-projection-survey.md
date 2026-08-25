# The universe frame — global types, projection, and schemas as views

> Provenance: written 2026-08-25 on the Mac coordinator, third of the three-reader wave
> dispatched from `entity-store-kickoff.md` §14 (siblings: `cost-semantics-survey.md`,
> `demand-provenance-survey.md`). Staged, pre-grade; **nothing here is a gated claim**.
> Every external result is evidence at G0 — read from the cited paper, repository, or
> registry on this host, on this date. Where a claim is my judgment rather than a source's,
> it is marked **[judgment]**. Where I could not verify, it says so.
>
> Local context read in full: `CHARTER.md`; `.staging/e2/entity-store-kickoff.md` §§1–4, §14;
> `docs/schema-json/CONTEXT.md`; `.staging/e2/schema-ast-census.md` §3.
>
> Method: threads 1, 2, 5 and 6 were researched and written directly by this reader from primary
> PDFs (`pdftotext`), repository APIs, and Crossref. Threads 3 and 4 were dispatched to two
> dedicated readers whose reports were merged here, cross-checked against this reader's own
> independent GitHub/Mathlib/Crossref receipts, and **corrected where they disagreed** (see
> §4.0b and §7.5). The session's 200-call web-search budget was exhausted partway through; the
> remainder was done by direct fetch. Nothing in this document was accepted on a reader's
> summary alone where a primary source was reachable.

---

## Bottom line

**The operator's sentence — "the universe in which schemas are projections of a global type,
and which ones become hot during computation" — is two sentences in the literature, and they
have never been joined.** One body of work (MPST, choreographies) owns *global object →
projection → transported theorem* and owns *dynamics*, but its global objects describe
**protocols, not data**. Another body (Spivak's functorial data migration, lenses/view-update)
owns *schemas and their views as principled projections of a larger whole*, but is almost
entirely **static**. The join exists only as a thin, unmechanised seam: **cost- and
time-annotated global types** (CAMP, Timed MPST), which prove exactly the shape the charter
wants — a quantity computed compositionally from the global object, transported to endpoints,
with a soundness theorem — but for latency, not for demand or heat, and with zero
mechanisation.

The single most consequential finding for the estate is not a paper. It is a **library**:

> **`leanprover/cslib` — The Lean Computer Science Library — is co-led by Fabrizio Montesi,
> the founder of choreographic programming, and it already contains
> `Cslib/Languages/Mech/Choreography`.** The full development behind it, **Mech** (Qin,
> Peressotti, Montesi, arXiv:2607.15174, 16 Jul 2026), is **>40,000 lines of Lean 4**
> proving **soundness and completeness of endpoint projection** with general branching,
> general recursion and nondeterministic choice — *the most extensive mechanised theory of
> choreographic programming that exists*, and it is in **Lean 4**, not Coq.

The charter's L3 target has a home, in the estate's own prover, being built by the person who
invented the subject. That reframes the L3 question from "how would we ever build this" to
"what do we contribute, and on what terms do we depend."

### Thread scorecard

| # | Thread | Owns the *global object for data*? | Owns *dynamics*? | Mechanised? | Lean 4? | Verdict for E2 |
|---|---|---|---|---|---|---|
| 1 | Multiparty session types | no (protocols) | yes | **yes, heavily** (Coq/Rocq, Agda) | no | **frame donor**, not carrier |
| 2 | Choreographic programming | no (programs) | yes | **yes** (Rocq, HOL4, **Lean 4**) | **yes — Mech/cslib** | **the L3/L4 vehicle** |
| 3 | Categorical databases (Spivak) | **yes — `∫D`** | no | **no** — one dead, holed Coq attempt | Mathlib has the adjunctions, unnamed | **the statics carrier candidate** |
| 4 | Lenses / view-update | **yes — `get` *is* a projection, `C` *is* the complement** | partly (delta lenses) | **yes** (Isabelle AFP, mature; Agda; Coq for the charter's own pin) | **barely** — record-field generation only | **the H2 law source** |
| 5 | Institutions / sheaves | yes, at meta-altitude | no | essentially no | Mathlib only | **borrow vocabulary, do not formalise** |
| 6 | Quantitative session types | no | **yes, and quantitatively** | **no** | no | **the open seam — and the estate's opening** |

### The five answers the dispatch asked for

1. **MPST mechanisation state (2026):** projection is *proved correct* — but only under
   precisely stated, still-contested conditions, and the correctness proved is not the one
   most people assume. See §1.5 for the honest ledger.
2. **Categorical databases:** the best existing formalisation of "a universe of schemas with
   principled projections between them" for data — and the one with the **worst mechanisation
   story in the survey** (`catdb`, Coq, 8 holes, `Σ ⊣ Δ` never proved, dead since 2013; nothing
   in Lean 4, Agda or Isabelle). The global object the operator is describing is named in the
   primary source — a **federated schema `D : C → Cat`, merged by the Grothendieck construction
   `∫D`** — and developed in two paragraphs. See §3.
3. **View-update / lenses:** Bancilhon–Spyratos (1981) names the **complement** — the part of
   the universe the view forgets — and proves that naming it determines the update policy
   uniquely; **Johnson–Rosebrugh–Wood (MSCS 2012, Prop. 3.2) turn that into the theorem the
   operator's sentence needs: a lens's `get` *is* the product projection `π₀ : V × C → V`, and
   `C` is the Bancilhon–Spyratos complement.** Lens laws are **well** mechanised (Isabelle/AFP
   `Optics`, nine years, four downstream entries) and **barely** mechanised in Lean 4. Two
   findings the estate did not have: its own census already proves the Effect codec is **not an
   isomorphism** (§4.0c), and **typed errors and the profunctor-optic abstraction are mutually
   exclusive** (§4.5). See §4.
4. **Quantitative session types:** they exist, they are mature enough to trust, they prove
   the right theorem shape, and **none of them is mechanised**. See §6.
5. **Recommended frame:** §7.

---

## 0. What "projection" has to mean here, before any literature

The charter uses one word for two different things, and the survey is unreadable unless they
are split. Both appear below; the estate should mint separate names.

- **Projection-as-erasure (P1's sense).** Given a global object `G` describing *many parties*,
  `G ↾ p` is what party `p` alone can see and do. Information is *destroyed*: topology and
  causal order between the other parties are gone. P1 says no equivalence on the `G ↾ p`
  recovers `G`. This is MPST/choreography projection (§1, §2), and it is also
  Bancilhon–Spyratos's view `f : U → V` (§4).
- **Projection-as-reindexing (the data sense).** Given a map of schemas `F : C → D` and an
  instance `I : D → Set`, `Δ_F I = I ∘ F` is the same data *seen through a different index*.
  Information is *reorganised*, and the operation has adjoints on both sides that put it back
  (`Σ_F ⊣ Δ_F ⊣ Π_F`). This is Spivak's migration (§3).

**[judgment]** These are not the same operation and they do not compose. The estate's
"schemas are projections of a global type" is ambiguous between them, and the ambiguity is
load-bearing: erasure gives you P1 and a transported theorem; reindexing gives you a *universe
of schemas* and adjoints. §7 proposes which one carries the global object and which one
carries the store.

---

## 1. Multiparty session types — the honest state of "projection is proved correct"

### 1.1 The charter's own reference, stated precisely

Honda, Yoshida, Carbone, *Multiparty Asynchronous Session Types*, **J. ACM 63(1):9:1–9:67,
2016**, [doi:10.1145/2827695](https://doi.org/10.1145/2827695) — the journal version of
POPL 2008 ([doi:10.1145/1328438.1328472](https://doi.org/10.1145/1328438.1328472)).

The classic pipeline is three steps, and the estate should quote them in this order:

1. a protocol is a **global type** `G` (a bird's-eye description of interactions between roles);
2. `G` is **projected** onto one **local (endpoint) type** per role, `G ↾ p`;
3. each participant's process is type-checked **separately** against its local type.

The payoff theorems are *communication safety*, *session fidelity* (the session's runtime
behaviour follows `G`), and *progress*.

The projection definition, verbatim in shape from Scalas–Yoshida's restatement of the classic
theory (Fig. 3, Def. 3.3 of the technical report cited in §1.2):

```
(q→r: {mᵢ(Sᵢ) . Gᵢ}ᵢ∈I) ↾ p  =  r ⊕ᵢ∈I mᵢ(Sᵢ).(Gᵢ↾p)        if p = q
                             =  q &ᵢ∈I mᵢ(Sᵢ).(Gᵢ↾p)        if p = r
                             =  ⊓ᵢ∈I  Gᵢ↾p                  if q ≠ p ≠ r
```

The third clause is the whole problem, and the estate must understand it: **when `p` is not
involved in a choice, `p`'s projection must be a single behaviour that works for every branch.**
That is what `⊓`, the **merge operator**, computes. Two merges are in the literature:

- **plain merging**: `S ⊓ S = S` — only merges identical behaviours (Honda et al. 2008; Coppo
  et al. 2015);
- **full merging**: recursively combines compatible continuations, unioning branch labels —
  `p&ᵢ∈I mᵢ(Sᵢ).Sᵢ' ⊓ p&ⱼ∈J mⱼ(Sⱼ).Tⱼ' = p&ₖ∈I∩J mₖ(Sₖ).(Sₖ'⊓Tₖ') & p&ᵢ∈I\J … & p&ⱼ∈J\I …`
  (Deniélou et al. 2012, [doi:10.2168/LMCS-8(4:6)2012](https://doi.org/10.2168/LMCS-8(4:6)2012)).

**[judgment] This is the single most transferable idea in the whole survey.** Merge is the
answer to a question the entity store will hit the moment a schema has a union: *what does a
participant who is downstream of a choice, but not party to it, have to be prepared for?*
The merge is a **join in a lattice of local behaviours**. E2 already has a
join-semilattice store (kickoff §4.6). The union constructor's ruling R-5 is the same
question in the small.

### 1.2 What Scalas–Yoshida actually broke, and what replaced it

Alceste Scalas, Nobuko Yoshida, *Less is More: Multiparty Session Types Revisited*, **POPL
2019**, PACMPL 3(POPL):30:1–30:29, [doi:10.1145/3290343](https://doi.org/10.1145/3290343).
Technical report (long version, last update 05/08/2019) read in full on this host:
`doc.ic.ac.uk/research/technicalreports/2018/DTRS18-6.pdf`.

**The flaw, precisely.** Classic MPST's subject-reduction theorem is not the unconditional
statement everybody quotes. It carries a hypothesis — the typing context must be
**consistent** (Def. 3.8: for every pair of roles, the *partial projections* of their types onto
each other are related by subtyping). Consistency is a syntactic, binary-duality-inherited
constraint. The paper's own words for the resulting bind (§3.1, claims C1/C2):

- **(C1) overly restrictive** — "requiring `Γ` consistent drastically constrains typability".
  Plain merging *does* guarantee consistency, by rejecting a great many correct protocols,
  including a three-role OAuth2 fragment that fits on one line.
- **(C2) inflexible and error-prone** — with full merging, `Γ` **need not be consistent**, so
  "the proofs of subject reduction depending on 'full merging' … **do not work**". The paper
  names them: *Yoshida et al. 2010, Thm 3.5*; *Deniélou et al. 2012, Thm 4.6*; "and successive
  papers".

So the historical situation was: the *usable* projection (full merge) invalidated the safety
proofs, and the projection that kept the proofs was too weak to type real protocols.

**What replaced it.** Scalas–Yoshida delete consistency, duality, *and global types* from the
foundations and parameterise the type system by a **safety property** `φ` on typing contexts
(Def. 4.1, verbatim structure):

```
φ is a safety property of typing contexts iff
 [S-⊕&]  φ(Γ, s[p]:q⊕ᵢ∈I mᵢ(Sᵢ).Sᵢ', s[q]:p&ⱼ∈J mⱼ(Tⱼ).Tⱼ')  implies I ⊆ J and ∀i∈I: Sᵢ ⩽ Tᵢ
 [S-µ]   φ(Γ, s[p]:µt.S)  implies  φ(Γ, s[p]:S{µt.S/t})
 [S-→]   φ(Γ) and Γ → Γ'  implies  φ(Γ')
Γ is safe, written safe(Γ), iff φ(Γ) for some safety property φ.
```

with **Theorem 4.8 (Subject Reduction)**: *assume `Θ·Γ ⊢ P` and `Γ` safe; then `P → P'`
implies there is a safe `Γ'` with `Γ →* Γ'` and `Θ·Γ' ⊢ P'`* — and **Corollary 4.9 (Type
safety)**. Two structural features matter for the estate:

- `φ` is a **parameter**, and the metatheory is proved **once, at the weakest (largest) safety
  property**. Instantiating `φ` differently (deadlock-freedom `df`, liveness `live`, `live⁺`,
  `live⁺⁺`, termination `term`, or plain `consistent`) changes what the system accepts without
  reproving anything (Thm. 4.11: type checking is decidable whenever `φ` is; Thm. 5.13: all
  the listed `φ` are decidable, because typing contexts have **finite-state** transition
  systems).
- **Remark 5.16 is the sentence the estate should tape to the wall:** *"we uncover that global
  types / projections … are **ways to produce `live⁺` typing contexts**"* — i.e. a global type
  is a *convenient generator of a semantic property*, not the property itself. Lemma 5.9(9)
  proves `∃G: fproj_{G,s}(Γ) ⟹ live⁺(Γ)`, and the converse **fails**.

**[judgment]** For P1 this is a sharpening, not a refutation. P1 says global structure is not
*derivable* from locals. Scalas–Yoshida say the global object is not *necessary* to state the
theorems — a semantic invariant on the local ensemble suffices, and it is strictly more
general. Both can be true: the global object is not the only route to safety, but it is the
only route to **authoring**, and it is what makes the invariant *cheap to establish*. The
charter's P3 (verification-achievability *because* the authored object is small and
declarative) survives Scalas–Yoshida intact, and arguably is what Remark 5.16 says.

Companion artifact: **mpstk** (MultiParty Session Types toolKit), `alcestes.github.io/mpstk`
(URL read from the technical report itself, §6; the page was **not fetched** on this host),
which encodes `φ` as modal µ-calculus formulas and discharges them with the **mCRL2** model
checker. Type checking and model checking, integrated.

### 1.3 The repair: mergeability is sound after all (2024–2026)

Ping Hou, Nobuko Yoshida, Iona Kuhn, *Less is More Revisited: Association with Global
Protocols and Multiparty Sessions*, **arXiv:2402.16741** (v1 26 Feb 2024; **v6 22 May 2026**),
published in Springer LNCS ([10.1007/978-3-031-66673-5_14](https://doi.org/10.1007/978-3-031-66673-5_14)).

From the abstract, verbatim: *"following the result in [84], the soundness of end-point
projection (with mergeability) has been interpreted in the literature as problematic. We
clarify this concern by proposing a new general proof technique for type soundness (subject
reduction) of multiparty session π-calculus, which relies on an **association relation**
between the behavioural semantics of a global type and its end-point projection."* Behavioural
properties — session fidelity, deadlock freedom, liveness — follow **from global types**.

**[judgment] The honest 2026 status of "projection is proved correct" is therefore:**
*mergeability-based endpoint projection is sound; it was never actually unsound; what was
broken for a decade was the published proof technique, not the operator.* The estate must not
repeat the folklore that "Scalas–Yoshida showed projection is unsound" — that reading is
explicitly named and corrected in the primary literature. That paper is still on arXiv with
active revisions in 2026, i.e. **the repair is recent and the dust has not fully settled.**

### 1.4 Projection as a decision problem: sound *and* complete, in PSPACE

Elaine Li, Felix Stutz, Thomas Wies, Damien Zufferey, *Complete Multiparty Session Type
Projection with Automata*, **CAV 2023**, arXiv:[2305.17079](https://arxiv.org/abs/2305.17079)
(v1 26 May 2023, v3 27 Mar 2024). Artifact: Zenodo record `8161741`.

The reframing: existing projections "are syntactic in nature, and trade efficiency for
completeness". This paper **separates synthesis from checking**: synthesise a candidate
communicating state machine per role by an automata construction, then check *implementability*
of the global type by succinct conditions. Result: *the first projection operator that is
sound, complete, and efficient*, and **MST implementability is in PSPACE** (previously
EXPSPACE, over a smaller class).

Not mechanised — prototype implementation only (verified: no proof-assistant artifact named).

**The follow-on generalises the move away from syntax entirely.** Felix Stutz, Emanuele
D'Osualdo, *An Automata-theoretic Basis for Specification and Type Checking of Multiparty
Protocols*, arXiv:[2501.16977](https://arxiv.org/abs/2501.16977) (28 Jan 2025). The AMP
framework replaces syntactic global types with **Protocol State Machines (PSMs)**, endpoint
types with **Communicating State Machines**, and identifies a class of "**tame**" PSMs for which
there is a **sound and complete PSPACE projection** — computing a CSM describing the same
protocol *if one exists*. Their pitch, verbatim: a *"backwards-compatible new backend for
frameworks in the style of Multiparty Session Types"* offering *"decoupling of the various
components (e.g. projection and typing)"*. Mechanisation status: not stated; assume none.

**[judgment]** This is the paper that tells the estate what "projection is correct" *ought* to
mean: not "there is a partial function `↾` and some theorems about its outputs" but
"**implementability is a decidable property of the global object, and projection is the
witness-extraction for it**". Any E2 notion of "this schema-universe is projectable" should be
stated as a decision problem first and an algorithm second.

### 1.5 Mechanisation ledger — MPST, as of 2026-08-25

| Work | Prover | Venue / receipt | What is actually proved | Live? |
|---|---|---|---|---|
| **Zooid** — Castro-Perez, Ferreira, Gheri, Yoshida | **Coq** | PLDI 2021, [doi:10.1145/3453483.3454041](https://doi.org/10.1145/3453483.3454041); arXiv:2103.10269 | "fully mechanised metatheory for the semantics of global and local types" + a verified endpoint process language; deadlock freedom, protocol compliance, liveness inherited by processes | repo `emtst/zooid-cmpst`, **last push 2021-08-31 — dormant 5 yrs** |
| **Tirore, Bengtson, Carbone** — *A Sound and Complete Projection for Global Types* | **Coq** | ITP 2023 [doi:10.4230/LIPIcs.ITP.2023.28](https://doi.org/10.4230/LIPIcs.ITP.2023.28); journal: J. Autom. Reason. **69(2):14 (2025)**, [doi:10.1007/s10817-025-09726-9](https://doi.org/10.1007/s10817-025-09726-9) | a **computable** projection function, proved **sound and complete w.r.t. its coinductive counterpart** | repo `Tirore96/projection`, last push 2024-10-07 |
| **Tirore, Bengtson, Carbone** — *Multiparty Asynchronous Session Types: A Mechanised Proof of Subject Reduction* | **Coq** | ECOOP 2025, [doi:10.4230/LIPIcs.ECOOP.2025.31](https://doi.org/10.4230/LIPICS.ECOOP.2025.31) | subject reduction, asynchronous | repo `Tirore96/subject_reduction`, last push 2025-05-25 |
| **Ekici, Yoshida** — *Completeness of Asynchronous Session Tree Subtyping in Coq* | **Coq** | ITP 2024, [doi:10.4230/LIPIcs.ITP.2024.13](https://doi.org/10.4230/LIPIcs.ITP.2024.13) | completeness of async subtyping | — |
| **Ekici, Kamegai, Yoshida** — *Formalising Subject Reduction and Progress for Multiparty Session Processes* | **Coq 8.18**, ~16 kLoC | ITP 2025, [doi:10.4230/LIPIcs.ITP.2025.19](https://doi.org/10.4230/LIPIcs.ITP.2025.19) | non-stuck theorem for **synchronous** MPST; recursion via **coinductive infinite trees** + parameterised coinduction. **Found a new bug:** "the structural congruence rule for recursive processes, as presented in several prior works on MPST, **violates subject reduction**" — and revised it | repo `Apiros3/smpst-sr-smer`, last push 2025-06-18 |
| **Jacobs, Balzer, Krebbers** — *Multiparty GV* | **Coq** | ICFP 2022, [doi:10.1145/3547638](https://doi.org/10.1145/3547638) | functional multiparty session types with **certified deadlock freedom** | — |
| **Castro-Perez, Ferreira, Jongmans** — *A Synthetic Reconstruction of Multiparty Session Types* | **Agda** | **POPL 2026**, PACMPL 10(POPL):1442–1470, [doi:10.1145/3776692](https://doi.org/10.1145/3776692); arXiv:2511.22692 (27 Nov 2025) | entire framework, all theorems, many examples, mechanised in Agda; **dispenses with local types and projection entirely** — processes typed directly against a global protocol as an LTS | prototype VS Code extension |
| **Lean 4** | — | — | **nothing, for session types specifically.** `leanprover/cslib` has `CCS`, `HML`, `LinearLogic`, `StatefulProcesses`, and `Mech/Choreography` — but a repo-scoped issue/PR search for `session` returns **`total_count: 0`**. (Choreographies *did* land — PRs #754 "Stateful Processes and Mech directory", opened 2026-07-29, and #769 "Choreographies", opened 2026-08-02, both closed-and-merged; see §2.3.) | — |

**[judgment] Read the ledger honestly and three things fall out.**

1. **Projection *is* proved correct — twice, in two different senses, both in Coq.**
   Tirore et al. proved a computable projection sound and complete against a coinductive
   spec (which is a *statement about the algorithm*, not about processes). Zooid proved the
   metatheory that lets projected processes inherit global properties (which is *the charter's
   theorem*, but at plain-merge strength). Nobody has mechanised the full-merge + association
   repair of §1.3.
2. **Mechanisation keeps finding bugs in this exact area.** #3509 in the estate's own Unison
   study, the Scalas–Yoshida flaw, the ITP 2025 structural-congruence bug, and — in §2 — the
   Mech team's discovery that the textbook semantics of choreographic choice *is not deadlock
   free*. Four independent instances. **This is the estate's strongest argument for its own
   posture**, and it should be cited as such rather than asserted.
3. **The field is drifting away from projection.** POPL 2026's synthetic reconstruction types
   endpoints *directly against the global LTS* and calls avoiding projection an advantage.
   The estate should know that its central mechanism has a credible, mechanised competitor,
   and should be able to say why it still wants projection. **[judgment]** The answer is
   authoring and derivation — the charter wants local artifacts *produced*, not merely
   *checked* — but the estate should say so out loud, because the literature no longer takes
   it for granted.

---

## 2. Choreographic programming — and the Lean 4 finding

### 2.1 The line, and the theorem shape the charter is describing

Fabrizio Montesi, *Choreographic Programming*, PhD thesis, IT University of Copenhagen, 2013;
textbook **Fabrizio Montesi, *Introduction to Choreographies*, Cambridge University Press,
2023**. Practical descendant: **Choral** (Giallorenzo, Montesi, Peressotti,
*Choral: Object-oriented Choreographic Programming*, **TOPLAS 46(1):1:1–1:59, 2024**,
[doi:10.1145/3632398](https://doi.org/10.1145/3632398)).

The difference from MPST in one line: **MPST global types describe *communication structure*;
choreographies are *executable programs*.** The Mech paper states it flatly — "Unlike
choreographies, the global types in MPST describe communication structure rather than
executable programs. Consequently, mechanisations of MPST focus primarily on the correctness
of typing and EPP without computation."

**The correctness of Endpoint Projection (EPP)**, as Mech states it (§1): *"establishes
behavioural equivalence between choreographies and their projected programs: every behaviour
of a choreography is reflected by its projected program, and vice versa. Consequently, the
safety and liveness properties specified by a choreography are guaranteed in endpoint
programs."*

**That sentence is the charter's tooling stance, verbatim, from an independent source.** The
charter's "one theorem — proved once in the model — guarantees that the projected parts, run
together, do exactly what the global description says. Every projected artifact inherits that
guarantee" *is* EPP correctness plus its safety/liveness corollaries. The estate is not
inventing this shape; it is adopting a shape with a 13-year formal literature and, now, a
Lean 4 realisation.

### 2.2 Mech — Lean 4, >40 kLoC, EPP soundness and completeness

**Xueying Qin, Marco Peressotti, Fabrizio Montesi, *Mech: Mechanised Choreographic
Programming*, arXiv:[2607.15174](https://arxiv.org/abs/2607.15174) v1, 16 July 2026**
(University of Southern Denmark; CC-BY-SA 4.0). Read in full on this host.

Syntax (Fig. 1) — note it is a *program*, with local state, not a type:

```
Instr I ::= p.x := e | p.e → q.x | p → q[l]
          | if p.e then C₁ else C₂ | C₁ +p C₂ | X(p⃗) | q : X(p⃗).C
Chor  C ::= I ; C | 0
```

`C₁ +p C₂` is **choreographic choice** (nondeterminism resolved by `p`) — barriers, locks,
first-come-first-served. `p → q[l]` is **selection**: the knowledge-of-choice mechanism.

The four core theorems, as stated in the paper:

- **Thm 6.1 (Completeness of EPP)** — if `⟨C,Σ,𝒞⟩ --μ--> ⟨C',Σ',𝒞⟩` then the projected network
  can match it: `⟨N,Σ,𝒫⟩ --μ--> ⟨N',Σ',𝒫⟩` with `⟦C'⟧ = M'` and `N' ⊒ M'`.
- **Thm 6.2 (Soundness of EPP)** — the converse: every network step is prescribed by the
  choreography.
- **Thm 6.3 / 6.4** — the same, lifted to multi-step executions.
- **Thm 7.2 (Communication Safety)** and **Thm 7.4 (Deadlock Freedom)** — *derived as
  consequences of EPP correctness*, exactly the charter's "inherits that guarantee".

The relation `⊒` ("has at least as many branches as") is the technical device that makes
soundness/completeness state cleanly in the presence of merge; **[judgment]** it is the
lattice structure of §1.1 showing up again, and E2 should expect the same shape.

**Mechanisation facts, verified.**

- **>40,000 lines of Lean 4.** "the first substantial mechanisation of CP".
- **Depends on Mathlib** — explicitly (`Finsupp` discussed and rejected as noncomputable, and
  replaced by a new `FinFun` type: `f : A → B` plus a proof of finite support).
- **`FinFun` and its API are already upstreamed into CSLib**, as is the multi-step transition
  relation `MTr`.
- **The mechanisation found a bug in the textbook.** Verbatim: *"When we attempted to mechanise
  expressive features in the Lean 4 theorem prover, we discovered that the semantics informally
  described in the literature [Montesi 2023b] **is not deadlock free** and does not correctly
  capture the semantics of compiled endpoint programs."* Examples 3.4 and 3.5 are stated to be
  counterexamples to EPP correctness under the textbook's sketched semantics. The author of the
  textbook is a co-author of the paper. There is a public errata page.
- **Not verified on this host:** development LoC breakdown, an artifact/repo URL (the arXiv v1
  names none that I could find), or the Lean toolchain version Mech itself pins.

**Table 1 of the Mech paper — the mechanised-CP state of record**, reproduced because it is
the cleanest such table in existence:

| Work | Assistant | Knowledge of choice | Nondeterminism | Recursion | Comm. |
|---|---|---|---|---|---|
| Kalas (Åman Pohjola et al. 2022, [doi:10.4230/LIPIcs.ITP.2022.27](https://doi.org/10.4230/LIPIcs.ITP.2022.27)) | **HOL4** | binary select, plain merge | none | tail | async |
| Core Choreographies (Cruz-Filipe, Montesi, Peressotti — ITP 2021 [doi:10.4230/LIPIcs.ITP.2021.15](https://doi.org/10.4230/LIPIcs.ITP.2021.15); JAR 67:21, 2023 [doi:10.1007/s10817-023-09665-3](https://doi.org/10.1007/s10817-023-09665-3)) | **Rocq** | binary, **full merge** (first) | none | tail | sync |
| **Pirouette** (Hirsch, Garg — POPL 2022, [doi:10.1145/3498684](https://doi.org/10.1145/3498684)) | **Rocq** | binary, full merge | **local** (first) | general, higher-order | async |
| Quick Change (Samuelson, Hirsch, Cecchetti — OOPSLA2 2025, [doi:10.1145/3763114](https://doi.org/10.1145/3763114)) | **Rocq** | binary, full merge | local | general, higher-order + **process sets** | async |
| **Mech** (this work) | **Lean 4** | **general select, full merge** | **local + choreographic** | general, process params | sync |

Mech scopes out asynchrony deliberately ("asynchrony is generally motivated by
implementation-level concerns … rather than expressive power"), citing Cruz-Filipe & Montesi
2017.

**Pirouette and Chorλ, the two the dispatch named.** *Pirouette: Higher-Order Typed Functional
Choreographies* (Andrew K. Hirsch, Deepak Garg, **POPL 2022**, PACMPL 6(POPL):1–27,
[doi:10.1145/3498684](https://doi.org/10.1145/3498684); arXiv:2111.03484) is, per Mech's Table 1,
the **first mechanised CP language with general recursion and higher-order parameters** — a
choreography with fixed participants can be passed as an argument — and the **first to support
nondeterministic local evaluation**. Mech names its cost: *"Pirouette imposes a global
synchronisation among all processes whenever a choreographic function is invoked"*, which
higher-order CP models and implementations avoid. **Chorλ** (Cruz-Filipe, Graversen, Lugović,
Montesi, Peressotti — *Modular Compilation for Higher-Order Functional Choreographies*,
**ECOOP 2023**, [doi:10.4230/LIPIcs.ECOOP.2023.7](https://doi.org/10.4230/LIPIcs.ECOOP.2023.7))
is the functional line that removes that synchronisation; **it does not appear in Mech's
mechanised-CP table, i.e. it is not mechanised.** Pirouette's Coq artifact URL was not located
on this host (POPL 2022 artifacts are on Zenodo; not fetched) — but note that
`akhirsch/Pirouette-Compiler` (OCaml, 4 stars, **last push 2026-08-23**) exists, so the
Pirouette line has become a compiler project as well as a mechanisation.

### 2.3 cslib — verified live on this host, 2026-08-25

`github.com/leanprover/cslib` — "The Lean Computer Science Library". Created 2025-06-17,
**last push 2026-08-24 (yesterday)**, 670 stars, **Apache-2.0**, site `cslib.io`.
Paper: Clark Barrett, Swarat Chaudhuri, **Fabrizio Montesi**, Jim Grundy, Pushmeet Kohli,
Leonardo de Moura, Alexandre Rademaker, Sorrachai Yingchareonthawornchai, *CSLib: The Lean
Computer Science Library*, **arXiv:2602.04846**, 4 Feb 2026. Its stated aim: *"CSLib aims to be
for computer science what Lean's Mathlib is for mathematics."*

Facts that bear directly on estate decisions:

- **Top contributor is `fmontesi` (202 commits)**; `kim-em` (Kim Morrison, Lean FRO) is also in
  the top five. Backers named on the site include Amazon, Google DeepMind, Stanford CAR.
- **Layout**: `Cslib/{Foundations, Languages, Logics, Computability, Algorithms, Crypto,
  MachineLearning, Probability}`. `Languages/` holds `CCS`, `LambdaCalculus`,
  `CombinatoryLogic`, `Boole`, `StatefulProcesses`, and **`Mech`**.
- **`Cslib/Languages/Mech/README.md`** (Montesi, 2026): *"This directory is a placeholder for
  the upstreaming of Mech… A downstream version of Mech already exists at FORM… This version is
  fairly complete, as it formalises **most of the textbook theory of choreographic programming**
  ('Introduction to Choreographies')"* — upstreamed iteratively, core first. It also states the
  plan to *"establish a strong bisimilarity for the choreography compiler, enabling the
  transference of results from choreographies to their compiled versions"* — i.e. **CSLib is
  building the charter's projection-transport theorem as reusable infrastructure.**
- **The upstreaming is three weeks old.** PR **#754** "feat(Languages): Stateful Processes and
  Mech directory" (opened 2026-07-29) and PR **#769** "feat(Languages): Choreographies"
  (opened 2026-08-02) are both closed and their files are on `main`. Mech's arXiv v1 is
  2026-07-16. **The estate is looking at this while it is happening.**
- **Currently upstreamed**: `Mech/Choreography/Basic.lean` — syntax only (Expr, Prefix with
  `assign`/`com`/`sel`, Choreography with `nil`/`pre`/`cond`/`call`, custom `mechChor` syntax
  category, `pn` process-name functions). Its own docstring lists the limitations: *"Recursion
  (only the syntax is implemented, but no semantics). General recursion… Choreographic choice…
  Asynchronous communication."*
- **Hard constraints for the estate**: `lakefile.toml` **requires `mathlib`** (pinned rev);
  `lean-toolchain` is **`leanprover/lean4:v4.34.0-rc2`**. `Choreography/Basic.lean` imports
  `Mathlib.Data.Finset.Basic`.

**[judgment] The collision with the estate's own floor is the finding, not a footnote.** The
E1 ratified decisions are *v4.33.1 floor*, *axiom allowlist*, *no Mathlib by default*. cslib is
on a v4.34 release candidate and is Mathlib-total. Depending on cslib means taking Mathlib and
tracking a moving toolchain; refusing it means reimplementing choreography metatheory that
Montesi's group is already writing in the estate's own prover. **This is a real fork in the
road and it belongs in front of the operator now, not at H3.** §7 proposes the terms.

### 2.4 The library wave, and the Unison connection

Choreographic programming has escaped the papers. From Mech's own introduction, the current
implementations: Clojure (**Klor**), Elixir, **Haskell (HasChor** — Shen, Kashiwa, Kuper,
OOPSLA 2023), Java (**Choral**), Racket ("Choreographies as Macros", PLACES 2025), **Rust and
TypeScript** (Bates, Kashiwa, Jafri, Shen, Kuper, Near, *Efficient, Portable,
Census-Polymorphic Choreographic Programming*, **PLDI 2025**,
[doi:10.1145/3729296](https://doi.org/10.1145/3729296)) — **and Unison**: *UniChorn: Unison's
Functional Choreographic Programming library* (Chakraborty 2025,
`share.unison-lang.org/@kaychaks/unichorn/`).

Repository state verified on this host, 2026-08-25:

| Repo | State |
|---|---|
| `choral-lang/choral` (Java) | 49 stars, **last push 2026-08-25 (today)** — actively developed |
| `gshen42/HasChor` (Haskell) | 133 stars, last push 2026-06-04 — alive |

**[judgment]** Two things for the estate. First, **there is a TypeScript choreographic
programming implementation with a PLDI 2025 paper behind it** — that is the closest existing
artifact to "author the global object as a first-class TypeScript value, derive locals by
projection", and it should be read before the estate designs its own authoring surface.
Second, **the charter's headline inspiration now has a choreography library** (UniChorn), which
is a signal that content-addressing and global-authoring are converging in exactly the way the
charter bets on. The UniChorn claim rests only on the Mech bibliography entry above; the Unison
Share page was not fetched.

### 2.5 Knowledge of choice — the three schools, because E2 will need one

Mech's related work classifies every approach by *when* knowledge of choice is established:

- **After choice** — select-and-merge (all mechanised work; §1.1's `⊓`). Lugović & Montesi 2024
  ([doi:10.22152/programming-journal.org/2024/8/8](https://doi.org/10.22152/programming-journal.org/2024/8/8))
  add **type-based selection**: convey the choice *by the message type itself* rather than a
  separate label, demonstrated by the first choreographic implementation of IRC.
- **At choice** — broadcast the outcome to everyone (Dynamic Choreographies; HasChor). Simple
  EPP, unnecessary messages.
- **Before choice** — dispense with selections. Jongmans & van den Bos, *A Predicate Transformer
  for Choreographies*, ESOP 2022 ([doi:10.1007/978-3-030-99336-8_19](https://doi.org/10.1007/978-3-030-99336-8_19)),
  formulate KoC as a **logical predicate** with Hoare-style reasoning; Bates et al. 2025 use a
  type system ensuring all choice participants evaluate the same deterministic guard on the
  same data.

**[judgment] Type-based selection is the one to steal.** The estate's schemas *are* types; a
discriminated union's tag is already the message type. Lugović–Montesi's move says the
knowledge-of-choice token need not be a separate protocol artifact when the data itself
discriminates — which is the same instinct as E2's mandatory semantic discriminator (kickoff
§4.2, spine thesis 2). That is a genuine convergence between the estate's independent design
and the 2024 choreography literature, and worth recording as such.

---

## 3. Categorical databases and functorial data migration

### 3.0 What this reader verified directly (GitHub/Mathlib, 2026-08-25)

Independent of the dedicated reader's report below, the following were checked on this host
and are stated as receipts:

| Artifact | State on 2026-08-25 |
|---|---|
| `CategoricalData/CQL` — Categorical Query Language IDE | Java, **360 stars**, created 2019-03-13, **last push 2026-07-26** — alive and maintained. **No license file detected via the API** (`license: null`) — a real adoption hazard, flag it. |
| `AlgebraicJulia/Catlab.jl` | Julia, **726 stars**, MIT, created 2017-04-04, last push 2026-07-02 — the most active applied-category-theory codebase in existence |
| `AlgebraicJulia/ACSets.jl` — "Algebraic databases as in-memory data structures" | Julia, 36 stars, MIT, created 2023-05-24, last push 2026-07-13 |
| **Lean 4 categorical-database work** | GitHub repository search for `lean4 category database` / `lean functorial data migration` returns **`total_count: 0`**. **There is none.** |
| Mathlib4 `CategoryTheory/Functor/KanExtension/` | `Basic.lean` (44 kB), `Pointwise.lean` (35 kB), `Adjunction.lean` (18 kB), `Preserves.lean`, `Dense.lean` — **the `Σ ⊣ Δ ⊣ Π` machinery is there** |
| Mathlib4 `CategoryTheory/PathCategory/Basic.lean` | free category on a quiver (`paths C`), importing `CategoryTheory.Quotient` — **quiver + path equations quotiented is literally a Spivak schema**, and it already exists |
| Mathlib4 `CategoryTheory/{Comma, Elements, Grothendieck, FinCategory}` | all present |

**[judgment] The tax is inverted from what one expects.** Spivak's formalism is *cheap* in
Lean 4 — Mathlib has finitely presented categories and pointwise Kan extensions already — and
*infeasible* under the estate's no-Mathlib rule, where it would mean building category theory
from scratch to say anything at all. The cost of thread 3 is therefore not "category theory is
hard"; it is **exactly the cost of the Mathlib decision**, the same decision §2.3 forces for
cslib. Those two should be ruled on together, not separately.

### 3.1 The formalism, stated precisely

David I. Spivak, *Functorial Data Migration*, **Information and Computation 217:31–51, 2012**,
[doi:10.1016/j.ic.2012.05.001](https://doi.org/10.1016/j.ic.2012.05.001);
arXiv:[1009.1166](https://arxiv.org/abs/1009.1166) (v1 2010-09-06, v4 2013-02-03).

- **Schema (Def. 3.2.6)** — a pair `C = (G, ≃)`: a directed multigraph `G` plus a *categorical
  path equivalence relation* on its paths (Def. 3.2.4: respects source/target, two-sided
  congruence). **The presentation is the object** — generators and path equations, *before*
  quotienting. **Theorem 3.4.4**: `L : Sch ⇄ Cat : R` are mutually inverse equivalences. That
  theorem is the licence for "a schema is a category".
- **Instance (Def. 3.2.8 / §3.5)** — a functor `I : C → Set` (equivalently: a set per vertex, a
  function per arrow, respecting the path equations). Morphisms are natural transformations.
  **Prop. 3.5.4**: `C–Inst` is a **topos**.
- **Translation (Def. 3.3.1)** — `F : C → D` sends vertices to vertices and **arrows to
  *paths***, preserving path equivalence.
- **The adjoint triple** — `Δ_F(I) := I ∘ F` (§4.1, exists always);
  `Π_F ⊣` from the right (**Prop. 4.2.1**, needs `S` complete — a right Kan extension);
  `Σ_F ⊣` from the left (**Prop. 4.3.1**, needs `S` cocomplete — a left Kan extension). So
  **`Σ_F ⊣ Δ_F ⊣ Π_F`**. Both adjunctions are *imported* (Mac Lane X.3.2 / Borceux 3.7.2), not
  reproved.

**The passage that actually answers the operator (§3.6).** Spivak discusses a **category of
kinds** whose objects are themselves categories of types, and observes that applying the
**Grothendieck construction** to a functor `D : C → Cat` merges a *federated schema — a schema
of related schemas —* into a single grand schema `∫D`, and merges all the instances into one
instance over it. **This is the operator's thesis, named, in the primary source — and developed
in exactly two paragraphs.** The global object is `D : C → Cat`; individual schemas are the
fibers `D(c)`.

### 3.2 Algebraic Databases — the version to actually cite

Patrick Schultz, David I. Spivak, Christina Vasilakopoulou, Ryan Wisnesky, *Algebraic
Databases*, **Theory and Applications of Categories 32(16):547–619, 2017**;
arXiv:[1602.03501](https://arxiv.org/abs/1602.03501).

**Why it exists:** §1.1 states outright that the 2012 model's two ways of handling attributes
(infinite coproducts of a terminal; Spivak's Def. 5.1.3 slice over a typing instance) did **not
work convincingly in implementations**.

- **Algebraic database schema (Def. 5.2)** — `S = (S_e, S_o)` where `S_e` is the **entity
  category** and `S_o : S_e ⇸ Type` is an **algebraic profunctor** (product-preserving) into a
  multi-sorted Lawvere theory `Type` — the **observables profunctor**. Work with its
  **collage** `S̃ → 2`, splitting into an *entity side* and a *type side* (Rem. 5.3).
- **Instance (Def. 6.2)** — a functor `I : S̃ → Set` whose restriction to `Type` preserves
  finite products (i.e. is a `Type`-algebra).
- **Schema mapping (Def. 5.10)** — `F = (F_e, F_o)`, equivalently a functor of collages over
  `2`.
- **Migration (§7)** — `Δ_F(I) := I ∘ F̃`; **Prop. 7.3** `Π_F = Ran_{F̃}`; **Prop. 7.4** `Σ_F`
  as the coend `∫^{s} I(s)·y(F̃s)`. **Critical subtlety (§7.2):** for a general map of
  finite-product sketches the pullback has *no* right adjoint (no cofree monoid); `Π_F` exists
  here **only because a schema mapping is the identity on the type side**.
- **§8** assembles this into a **proarrow equipment / framed bicategory `Data`**; **§9**
  For-Where-Return queries are a special case, general bimodules being "uber-queries".

**[judgment] This is the version the estate should cite, and the reason is structural, not
fashionable.** The entity-side/type-side split of the collage is *the same split E2 already
has*: a reference/entity layer over a closed vocabulary of primitives-with-operations
(kickoff §4.1's check vocabulary and pinned registry, §4.5's value universe). The 2012 model's
"slice over a typing instance" has no counterpart in E2 and its authors abandoned it.

### 3.2b Is Poly a live alternative carrier? Yes — and it is heavier

David I. Spivak, Richard Garner, James Fairbanks, *Functorial Aggregation*,
**J. Pure Appl. Algebra 229:107883, 2025**; arXiv:[2111.10968](https://arxiv.org/abs/2111.10968)
(v1 2021-11-22, v7 2025-01-15). This, not the Niu–Spivak *Polynomial Functors* book
(arXiv:2312.00990; Cambridge UP LMS series, 2025 — which is about **interaction, not data**),
is the paper that matters here.

- Polynomial **comonoids in `Poly` are exactly categories** (Ahman–Uustalu 2016); **bicomodules
  between categories are exactly parametric right adjoint (pra) functors `c-Set → d-Set`** —
  and pra functors *are* the data-migration functors.
- The framed bicategory is **`Cat♯`**: objects = categories, loose maps = prafunctors,
  **tight maps = retrofunctors (cofunctors), not functors** (Def. 3.21) — a genuinely different
  notion of schema morphism.
- **Prop. 3.20: every prafunctor factors as `Σ_T ∘ Π_π ∘ Δ_S` with `T` étale (a discrete
  opfibration).** This is a *completeness* theorem for the query normal form: the
  `Σ ∘ Π ∘ Δ` shape is not an ad-hoc restriction, it is exactly the pra functors.
- Motivation for the whole rewrite: **aggregation (sum, group-by) is not functorial**, so the
  2012 framework cannot express it at all.

**[judgment] `Cat♯` subsumes the 2012 story, fixes the `Σ` pathology principledly, and adds
aggregation — and it is far heavier** (comonoids, bicomodules, framed bicategories,
retrofunctors) with **zero mechanisation anywhere**. For a Lean-4 estate it is a worse starting
point than plain functor categories. Record it as the direction the field is going, and note
one thing the estate should not miss: **Prop. 3.20 is the theoretical justification for §3.7's
recommendation to gate `Σ` on étale maps.** That gate is not a pragmatic hack; it is where the
normal form lives.

### 3.3 Where the analogy strains — five named failures

1. **`Σ` is the chase, and the chase diverges.** *Fast Left Kan Extensions Using the Chase*
   (Meyers, Spivak, Wisnesky), **J. Autom. Reason. 66:805–844, 2022**,
   [doi:10.1007/s10817-022-09634-2](https://doi.org/10.1007/s10817-022-09634-2),
   arXiv:2205.02425, §4.2: **"termination of a left Kan extension is undecidable"**. `Σ_F(I)(d)`
   need not be finite even for finite `I`. The problem is semi-computable only.
2. **`Σ` silently identifies data.** Spivak's own warning (*Functorial Aggregation*, §1):
   an unconstrained `Σ` merging two rows can collaterally force `"a" = "b"` across the whole
   database. The fix is to require the schema map be a **discrete opfibration (étale)**, at
   which point `Σ` is a coproduct — which is exactly Spivak–Wisnesky's condition (3) for SQL
   implementability.
3. **`Π` is not ignored — it is unimplementable at scale.** Spivak–Wisnesky exhibit a one-row
   input whose `Π`-image is countably infinite once the target has an `Int` attribute.
   Finiteness requires finite schemas *and* bijective attribute maps, or Algebraic Databases
   §9.7's "no types in the for-clause" rule (which is domain-independence under another name).
4. **Word problems.** A schema is a *presentation*, and deciding whether two paths are equal is
   **undecidable in general** (Algebraic Databases §10.1); §10.2 adds that it is undecidable
   whether a presentation generates a finite category. CQL answers with **unfailing
   Knuth–Bendix completion**.
5. **`Δ` points the wrong way for the slogan.** `Δ_F : D–Inst → C–Inst` migrates *instances*
   contravariantly; on schemas the arrow `F : C → D` points the other way. "Schema is a
   projection of the global type" is honest only as (a) a **fiber** `D(c)` of `D : C → Cat`, or
   (b) a **subcategory inclusion** `S ↪ G` with `Δ` restricting global instances. **[judgment]
   (b) is the one that behaves**: `Δ` along an inclusion is total, cheap, always defined — no
   chase, no Kan extension, no undecidability.

### 3.4 Mechanisation — the honest answer is "none"

**No proof assistant has a complete, maintained formalisation of `Σ ⊣ Δ ⊣ Π` presented as data
migration.** The evidence:

| Effort | State |
|---|---|
| **`CategoricalData/catdb`** (Jason Gross, Coq, MIT, 16 stars) | Files `DataMigrationFunctors.v` (697 lines, **4 `Admitted.`**), `DataMigrationFunctorsAdjoint.v` (1433 lines, **6 `admit.` + 2 `Admitted.`**), `Grothendieck.v`, comma categories. `Δ ⊣ Π` sketched with holes; **`Σ ⊣ Δ` set up but never proved**. **Last real commit 2013-05-25.** Companion: Gross, Chlipala, Spivak, ITP 2014, [doi:10.1007/978-3-319-08970-6_18](https://doi.org/10.1007/978-3-319-08970-6_18) |
| `HoTT/Coq-HoTT` | has `Categories/KanExtensions/`, **no data-migration files** |
| **Lean 4** | code searches for `"data migration functor" language:Lean`, `"categorical database" language:Lean` return **0**. No Lean 4 ACT/database repo exists. |
| **Mathlib4 — but** | **the adjunctions are already there, unnamed**: `Functor.lan`, `Functor.ran`, and `Functor.lanAdjunction (L) (H) : L.lan ⊣ (whiskeringLeft C D H).obj L`, `Functor.ranAdjunction : (whiskeringLeft …).obj L ⊣ L.ran` in `Mathlib/CategoryTheory/Functor/KanExtension/Adjunction.lean`. **`(whiskeringLeft C D H).obj L` *is* `Δ_L`.** With `H := Type u` you have `Σ ⊣ Δ ⊣ Π` proved today. |
| `agda/agda-categories` (409 stars, pushed 2026-08-18) | has `Categories/Kan.agda`, **no database content** |
| Isabelle/AFP | 17 category-theory entries; **none mentions Kan extensions, comma categories or databases in title/blurb**. *Not verified at file level.* |
| `statebox/idris-ct` | dead since 2020-06-23 |

**Calibration for the Mathlib-free option.** Catlab-of-Coq — catdb — spent ~2,100 lines on the
two migration files alone, **left 8 holes, and never finished `Σ ⊣ Δ`**, with a full category
library underneath and Chlipala and Spivak on the paper. A from-scratch Lean 4 `Δ ⊣ Π` and
`Σ ⊣ Δ` for `Set`-valued instances is estimated at **3,000–8,000 lines** even taking pointwise
formulas as definitions. Mathlib's own `CategoryTheory/` is 1,111 files / 11.2 MB, of which
`Limits/` (212 files) is the unavoidable dependency.

**One check the estate should run itself before ruling:** `#print axioms
CategoryTheory.Functor.lanAdjunction`. If it comes back within
`{propext, Classical.choice, Quot.sound}` — which is the expected standard triple but was
**not receipted** by this survey — then "no Mathlib" is a *policy* cost, not a soundness cost,
and a fenced Mathlib dependency for one module is defensible on the estate's own terms.

### 3.5 C-Sets / ACSets — the practically mature realisation, and the identity precedent

Evan Patterson, Owen Lynch, James Fairbanks, *Categorical Data Structures for Technical
Computing*, **Compositionality 4:5, 2022**,
[doi:10.32408/compositionality-4-5](https://doi.org/10.32408/compositionality-4-5),
arXiv:[2106.04703](https://arxiv.org/abs/2106.04703), CC-BY-4.0. An **acset** is a functor from
a finitely presented category to `Set` plus typed attributes; graphs are the case `C = (• ⇉ •)`.

| Repo | Lic | Stars | Last push | Release |
|---|---|---|---|---|
| `AlgebraicJulia/Catlab.jl` | MIT | **726** | 2026-07-02 | v0.17.6 (2026-06-10) |
| `AlgebraicJulia/ACSets.jl` | MIT | 36 | 2026-07-13 | v0.2.29 (2026-06-10) |
| `AlgebraicJulia/DataMigrations.jl` | MIT | **5** | 2026-05-17 | — |

- `Catlab.jl/src/categorical_algebra/pointwise/datamigrations/FunctorialDataMigrations.jl`:
  `DeltaMigration` is literally `migrate(X, M) = X ∘ functor(M)`. **`Σ` is implemented as a
  bounded chase** — `(M::SigmaMigrationFunctor)(d::ACSet; n=100, …)` and on failure
  `error("Sigma migration did not terminate with n=$n")`. **A default of 100 rounds and a hard
  error is what the undecidability of §3.3(1) looks like in production code.**
- **`Π` is not in Catlab at all.** It lives in `DataMigrations.jl` — **5 stars**, documentation
  "mainly via the tests". The `Π` side of the most mature stack in the field is thin.

**The identity precedent, and it matters to E2 directly.**
`ACSets.jl/src/NautyInterface.jl` (442 lines) shells out to **nauty/`dreadnaut`** and exports
`strhsh` (a string identifying the **isomorphism class**), `canon` (the canonical isomorph),
`canonmap`, `orbits`, `ngroup`; attributes are folded in via `hash(attr_dict(g))`.

**[judgment] This is the closest thing in the whole survey to content-addressing an instance,
and it is a warning as much as a precedent.** It tells the estate three things: (i) canonical
identity of a functorial instance *is* the right notion and someone shipped it; (ii) the cost
is an **external binary** and a **worst-case superpolynomial** canonical-labelling problem;
(iii) it is a *flat* hash of an isomorphism class — **not a Merkle structure**, so it gives no
incremental or subtree addressing, which is exactly what E2's framed encoder does give.
**The open ground is therefore not content-addressing instances — ACSets did that — it is
content-addressing schema *presentations* and *migrations*.**

### 3.6 CQL — read the papers, do not take the dependency

`github.com/CategoricalData/CQL`: Java, **360 stars**, 736 `.java` files, last commit
**2026-07-26** (Ryan Wisnesky), contributors `wisnesky` 122 / `caverac` 19 / `Ari-Zerner` 10,
date-tagged releases through `march_31_2026`, ~50 open issues. **Maintained, but a
one-maintainer project.** Two hazards, both verified:

- **The licence is not open source.** Copyright **Conexus AI, Inc.**; the README grants
  BSD-3 for *non-commercial* and *exploratory/evaluative commercial* use, "contact us for other
  licenses". **There is no `LICENSE` file** and the GitHub API reports `license: null`.
  Papers and the website nonetheless describe CQL as open source.
- **The core algorithm is patented.** arXiv:2205.02425's comments field states the work is the
  subject of **US Patent 11,256,672** ("Data migration and integration system", assignee
  Conexus AI, inventors Daimler / Wisnesky / Spivak, filed 2020-04-09, granted 2022-02-22);
  claim 1 is a chase engine adding bounded element layers and merging equals to fixpoint.

Scale, honestly: the JAR 2022 benchmarks ran on a **13″ 2018 MacBook Air, 1.6 GHz i5, 16 GB,
Java 11**, up to **12 million rows**, with row throughput *degrading* as input grows
(union-find is `O(n log n)`). Read the claim as **single node, in memory, gigabytes not
terabytes**.

**Verified negative, and it is the answer to the dispatch's question:** **CQL has no canonical
identity for schemas or instances.** All 154 documented operations and 736 Java sources were
enumerated; nothing does hashing, canonicalisation, instance normal forms, Merkle structure, or
content addressing. Identity is *nominal* — names bound in a `.cql` script. Element identity is
by **Skolem terms / labelled nulls**, and equality is decided by **Knuth–Bendix normal forms**,
whose representatives are procedure-dependent (Algebraic Databases §10.2 says so). `InstExpChase`,
`InstExpAnonymize`, `InstExpDistinct`, `InstExpFrozen` exist; none is an address.

Successor to watch instead: `ToposInstitute/CatColab` — TypeScript + Rust, **Apache-2.0**,
187 stars, **pushed 2026-08-25 (today)**, ~1400 merged PRs. A double-categorical modelling
environment, not a database engine, but it is the funded continuation of this line.
`statebox/cql` (Haskell, AGPL-3.0, 188 stars) is dormant since 2023-04-14;
`CategoricalData/FQL` is archived.

### 3.7 Verdict on thread 3

**What content-addressing adds that CQL structurally cannot** — four things, in priority order:

1. **Schema identity as the hash of a *presentation*.** This is the sharpest idea in the
   thread. A schema is a finite syntactic presentation; the *category it presents* has an
   undecidable word problem, but **the presentation hashes exactly**. Content-addressing
   therefore buys decidable identity at precisely the level where the mathematics denies it —
   and the estate should say clearly that `addr(presentation)` is *finer* than categorical
   equivalence, deliberately, the same way E2's declared equivalence is deliberately not
   semantic equality.
2. **Migration memoisation.** `Σ_F(I)` is expensive and semi-decidable; `(addr(F), addr(I)) ↦
   addr(result)` is the natural cache key and is *sound* because `Σ_F` is determined up to
   canonical iso by `(F, I)`. This is precisely kickoff §7's parked input-addressed option.
3. **Provenance for the chase.** Each chase round is a morphism; a Merkle chain over rounds
   gives replayable, auditable derivations — which is the only honest way to trust a
   semi-decision procedure.
4. **Instance identity up to isomorphism** — *not novel*; ACSets ships it via nauty.

**Recommendation.** Adopt the **formalism** (Algebraic Databases' Def. 5.2 / 6.2 / 5.10 and
Props. 7.3 / 7.4), **not** the tool. Take `Δ` seriously — it is composition, total and cheap,
and it is the operation that actually means "this schema is a view of the global one". Gate `Σ`
behind an **étale/discrete-opfibration precondition as a typed obligation, not a runtime
check**, which makes it a coproduct and makes it terminate. Put unrestricted `Σ` and `Π` out of
v1 scope. Steal engineering from **AlgebraicJulia** (MIT, ~25 live repos), not Conexus.

---

## 4. Lenses, bidirectional transformations, and view-update

### 4.0 What this reader verified directly (GitHub, 2026-08-25) — the Lean 4 state

The dispatch asked specifically for the Lean 4 gap. It is **narrower than expected and it is
moving right now**:

| Repo | Toolchain | Last push | Stars | What is *actually* proved |
|---|---|---|---|---|
| **`VCA-EPFL/leanses`** (Yann Herklotz, EPFL) | `lean4:nightly-2025-06-05` | 2025-06-08 | 17 | **The credible one.** van Laarhoven encoding `Lens s t a b := ∀ f [Functor f], (a → f b) → s → f t`; `class LawfulLens` with `view_set` / `set_view` / `set_set` = **PutGet / GetPut / PutPut**. The `mklenses` command *generates* per-field lenses **and generates the three law theorems, each proved `by intros; rfl`, then registers the instance**. **Zero `sorry`** in `Lens.lean` (548 lines). Apache-2.0. |
| **`fraware/lean-optics`** | `lean4:v4.31.0` | **2026-08-25** | 3 | **Mixed — audit before trusting.** ~1.1 kLoC, **0 `sorry`, 0 `axiom`, 26 theorems**; **batteries only, no Mathlib**. `LawfulLens` (`get_set`/`set_get`/`set_set`) is real, with `comp_preserves_laws`. But **`Prism.lean` contains 0 theorems** — the laws are *stated*, no instance is proved lawful — and **`Traversal.identity_law` / `composition_law` / `naturality_law` are literally `def _ : Prop := True`**, which makes `traversal_comp_preserves_laws` **vacuous**. The README's "production-ready performance guarantees" and "automated proof generation" are not supported by the code. |
| `janmasrovira/lean-lens` | `lean4:v4.31.0` | 2026-06-29 | 2, no licence | `class LawfulLens` declared in `Lawful.lean`, plus three `@[simp] rfl` lemmas — **and never instantiated anywhere in the repo.** |
| `bmorphism/paraoptic` | Lean 4.28 + Agda 2.8 + Dafny | 2026-08-10 (one day) | 0, no licence | `DeltaLens.lean`, `Tambara.lean`, `ParaOptic.lean`, `PolyComonoid.lean`. Unaudited; self-describes as "adversarially audited twice". Treat with suspicion. |
| `unitb/lean-lens` | Lean 3 | 2018 | 0 | historical |

**Being proposed into CSLib.** `fraware/lean-optics`' `docs/upstream/CSLIB_LENS_PROPOSAL.md`
targets `Foundations/Data`, deliberately scoping *out* profunctors, prisms, traversals, macros
and tactics. Status verified: issue
[`leanprover/cslib#658`](https://github.com/leanprover/cslib/issues/658) (opened 2026-06-17,
**open, zero comments**) and draft PR
[`#659`](https://github.com/leanprover/cslib/pull/659) (opened 2026-06-17, updated 2026-08-25,
**open, unmerged, zero comments**).

**Mathlib4** has `Equiv`, `Iso`, `PartialEquiv`, `Function.Embedding` and fibered-category
material, but **no `Lens` / `Prism` / `Optic` / `Traversal` namespace and no BX theory**.
*(Flagged: this negative was inferred, not grepped against a local checkout. Worth 30 seconds
before relying on it.)*

### 4.0b The charter's own H2 pin has Coq proofs — verified

`Lysxia/profunctor-monad` (the charter's "closest prior art for the H2 codec thesis"):
MIT, 50 stars, created 2016-12-19, **last push 2022-05-17**, not archived. GitHub reports its
primary language as **Coq**, and the repository contains a `coq/` directory:
`Promonad.v` (12.7 kB), `ExampleLens.v` (3.0 kB), `ExampleParser.v` (9.4 kB), `_CoqProject`,
`Makefile`. Its `coq/README.md`, verbatim and in full:

> *"Supplementary material for "Composing bidirectional programs bidirectionally".
> Coq proofs of compositionality for some properties of biparsers and lenses."*

`Promonad.v` defines `Monad`/`MonadLaws` (`bind_ret`, `ret_bind`, `bind_bind`) and builds
promonads on top, parameterised by *properties* `Q` on views and `R` on (pro)monadic values —
i.e. the development is explicitly about **which properties compose along the profunctor
structure**.

Package metadata: Hackage `profunctor-monad` **v0.2.0.0, uploaded 2022-05-17**, authors
Li-yao Xia, **Samantha Frohlich**, Dominic Orchard, Meng Wang; `base < 4.17` (GHC ≤ 9.2).

**[judgment] Three notes, one of which is a caution about this survey's own method.**
(1) The charter cites profunctor-monad as prior art *for the design*; it is also prior art *for
the mechanisation*, and the estate did not appear to know that. The Coq proofs are small,
readable, and about exactly the question H2 asks — do the codec's laws compose? — which makes
`coq/Promonad.v` a better first read than any optics paper.
(2) The README's title differs from the ESOP 2019 paper the estate would cite: *Composing
Bidirectional Programs **Monadically***, Xia, Orchard, Wang, **ESOP 2019, LNCS 11423,
pp. 147–175**, [doi:10.1007/978-3-030-17184-1_6](https://doi.org/10.1007/978-3-030-17184-1_6),
arXiv:1902.06950. The ESOP title is confirmed; "bidirectionally" in the `coq/README.md` is
presumably a working title. Cite the ESOP form.
(3) **The dedicated thread-4 reader independently concluded "Mechanization of
`profunctor-monad`: NONE — repo tree contains only Haskell". That is wrong**, and the files
above were listed and read directly from `raw.githubusercontent.com` on this host. Recorded not
to score a point but because it is the failure mode the estate should expect from delegated
literature work: **a confident negative from a tool that did not look in the right place.**
Where this survey states a negative, prefer the ones that name what was searched.

**[judgment] Three consequences for H2.**
(1) **The Lean 4 lens gap is real but small**, and it is *closing from the direction of cslib* —
the same library that hosts Mech. Both of the estate's targets, L2 laws and L3 projection, are
converging on one Lean 4 library, which strengthens §2.3's fork rather than softening it.
(2) `lean-optics` is the **only** Lean 4 optics artifact in this survey that is Mathlib-free,
which makes it the only one the estate could consume under current rules — and it is a
three-star personal project on a toolchain **below** the estate's v4.33.1 floor. Treat it as
*prior art to read and possibly reimplement*, never as a dependency.
(3) The proposal's own scoping is instructive: it argues that CSLib "needs the lawful
data-access core first" and that profunctors are ergonomics. **The estate's H2 thesis makes the
opposite bet** — that the profunctor/codec structure *is* the content. Whichever way that goes,
the estate should know it is taking a position that the nearest Lean 4 community effort
explicitly deprioritises.

### 4.0c The estate's own evidence: the Effect codec is *not* an iso, and the census proves it

Before any optic taxonomy is applied, one local fact should be on the table, because it decides
which optic the H2 codec actually is. From `.staging/e2/schema-ast-census.md` §3 (read on this
host):

- `toEncoded(ast) = toType(flip(ast))`; `flip` reverses the encoding chain and calls
  `Transformation.flip()` on each link, which **swaps `decode`/`encode`**
  (`SchemaTransformation.ts:156-158`). Variants with an explicit `flip` **swap `checks` with
  `encodingChecks`**.
- The census's judgment, verbatim: *"`toType`/`toEncoded` are lossy on non-structural checks
  that sit on the wrong side of an encoding … A round trip Type → Encoded → Type does not
  restore `encodingChecks`, so **the projection is not an isomorphism on checks**."*

**[judgment] Three consequences that any optic classification must respect.**
1. **The codec is not an `Iso`.** Whatever optic it is, `view ∘ review = id` fails on the check
   dimension. The estate should stop reaching for "isomorphism" language in H2 statements.
2. **It is asymmetric in a specific, lens-like way**: the *structure* round-trips, the
   *refinements* do not. That is the signature of a **lens with a complement that the codec
   silently discards** — Bancilhon–Spyratos's complement, not carried. **The single sharpest
   H2 question this survey can pose is therefore: *what is the complement of the Encoded view,
   and is E2 willing to carry it?*** If the answer is "carry it", the codec becomes very
   well-behaved and the round-trip law becomes provable. If the answer is "discard it", the
   estate must state the law it *does* satisfy, and it is weaker than any law in §4's
   literature.
3. **`flip` being an involution that swaps `decode`/`encode` is exactly the shape of a
   symmetric lens's `putr`/`putl` pair.** The census has already found the operator; the
   literature supplies the law it should satisfy.

### 4.1 Bancilhon–Spyratos — the sharpest statement of "a view is part of a whole"

François Bancilhon, Nicolas Spyratos, *Update Semantics of Relational Views*, **ACM TODS
6(4):557–575, December 1981**,
[doi:10.1145/319628.319634](https://doi.org/10.1145/319628.319634). DOI and pagination verified
via Crossref; the paper was read in full by the dedicated thread-4 reader from an open scan.

Let `S` be the set of database states and `M(S)` a set of view mappings on `S` containing the
identity `1` and a constant `0`, closed under product `(f × g)(s) = (f(s), g(s))`.

- **Def 4.1 — `f ⊒ g` ("`f` determines `g`")**: `∀s,s'. f(s) = f(s') ⟹ g(s) = g(s')`.
  **Thm 4.1**: `f ⊒ g` iff the partition `S/f` refines `S/g`. **A view *is* a partition of the
  universe of states**, and the order on views is refinement.
- **Def 4.2 — `f ≡ g`** iff `S/f = S/g`. Note: `1` is equivalent to **every injective map on
  `S`**; `0` to every constant map.
- **Def 4.4 — complement, verbatim:** *"Let `f ∈ M(S)`. A view `g ∈ M(S)` is called a
  **complement of `f`** iff `f × g ≡ 1`."* Because `1 ≡` every injective map, this says exactly
  **`⟨f, g⟩ : S → V × G` is injective**. The paper's own gloss: `s` "can be replaced by the
  pair `(f(s), g(s))`… we shall refer to this pair as a **representation of `s`**".
- **Thm 4.2** — `g` is a complement of `f` iff for all `s ≠ s'`, `f(s) = f(s') ⟹ g(s) ≠ g(s')`.
  **`g` separates exactly the states `f` conflates.**

**The translation machinery.** A **translation** `T_u` of a view update `u` is *consistent*
(`f T_u = u f`) and **acceptable** (`u f(s) = f(s) ⟹ T_u(s) = s` — *no side effects*). A
**complete set** `U` of view updates is closed under composition **and** satisfies
`∀s ∀u∈U ∃v∈U. v u f(s) = f(s)` — *"the user must have the means to cancel the effect of every
update"*. **[judgment] Note that reversibility is baked into the 1981 definition**, which is why
§4.1's later reversibility characterisation is not a surprise.

**The theorems that carry the weight:**

- **Thm 5.6 (uniqueness), the paper's own gloss, verbatim:** *"To every triple `(f, g, u)` such
  that `g` is a complement of `f` and `u` is `g`-translatable, there corresponds **one and only
  one** translation of `u` that leaves `g` invariant."* — namely `γ_u = (f × g)⁻¹(u f × g)`.
- **Thm 7.1 + Thm 7.2/7.3 (the two-way universal property), the paper's own conclusion,
  verbatim:** *"translation under constant complement is the only method of translation, in the
  sense that (i) it provides translators for complete sets; (ii) any translator of a complete
  set translates under some constant complement."* The converse direction constructs the
  complement from the translator: `s ≡ s'` iff `∃u ∈ U. s = T_u(s')`, and `g(s) := [s]`.

**And the honest limitation, which is the operator's own point.** §6 works a numeric example
(`PRODUCT, COST, SALEPRICE, PROFIT, PROFITRATE`) where **the same view update produces three
different database updates** under three different complements. Verbatim: *"a view complement
corresponds to a view update policy. The existence of more than one view complement simply
means that there are more than one view update policies."* **Thm 6.1**: if `h ⊑ g` are both
complements of `f`, a `g`-translatable update is `h`-translatable and the translations agree —
so **smaller complement ⇒ more translatable updates**, and the maximal update sets sit at the
*minimal* complements, of which there are in general several.

**[judgment] This 45-year-old paper is the most useful single definition in the survey for the
operator's sentence.** "Schemas are projections of a global type" is, read literally,
`f : S → V`. What Bancilhon–Spyratos add — and what MPST projection, choreographic EPP, and
Spivak's `Δ` all lack — is the **complement**: a name for *the rest of the universe*, plus an
iff theorem saying naming it determines the policy uniquely, plus the warning that the naming
is a **design choice, not a derivation**. That last part is the estate's real lesson: choosing
E2's complement *is* choosing its update semantics, and no amount of type theory will choose it.

**The downstream ledger** (DOIs verified via Crossref unless noted):

| Work | Receipt | What it does |
|---|---|---|
| Keller, *Algorithms for translating view updates…* | PODS 1985, 154–163, [doi:10.1145/325405.325423](https://doi.org/10.1145/325405.325423) | enumerates candidate translators for select-project-join views |
| Keller, *A Reasonable View Update Translator that Preserves No Complement* | Stanford TR, 1984, [doi:10.21236/ada145016](https://doi.org/10.21236/ada145016) | **a direct counterexample to the constant-complement doctrine — the title is the claim** |
| Keller, *Updating relational views using knowledge at view definition and view update time* | Inf. Syst. 16(2), 1991, 145–168, [doi:10.1016/0306-4379(91)90012-X](https://doi.org/10.1016/0306-4379(91)90012-X) | position: the translator is *chosen in dialogue with the DBA*, not derived. **Text not read** |
| Hegner, *An Order-Based Theory of Updates for Closed Database Views* | Ann. Math. Artif. Intell. 40:63–125, 2004 | per Foster et al. §10: monotonicity makes insert-only/delete-only translations **unique and independent of the choice of complement**. **Statement taken from Foster et al., not from Hegner** |
| Hegner, *Invariance Properties of the Constant-Complement View-Update Strategy* | SDKB 2013, LNCS 118–148, [doi:10.1007/978-3-642-36008-4_6](https://doi.org/10.1007/978-3-642-36008-4_6) | later refinement |
| **Lechtenbörger, *The impact of the constant complement approach towards view updating*** | **PODS 2003, 49–55, [doi:10.1145/773153.773159](https://doi.org/10.1145/773153.773159)** | see below |

**Lechtenbörger — the operator's recollection is correct, verified indirectly.** The PODS text
was not obtained, but Johnson & Rosebrugh, *Constant Complements, Reversibility and Universal
View Updates* (AMAST 2008, LNCS 5140, 238–252,
[doi:10.1007/978-3-540-79980-1_19](https://doi.org/10.1007/978-3-540-79980-1_19)) state it
twice, verbatim: *"Lechtenbörger showed that, in a suitable sense, constant complement updates
were always reversible, and conversely **if all updates to a view are reversible then it is
possible to find a constant complement for it**."* Johnson–Rosebrugh's own contribution in that
paper is the limit of the doctrine: constant-complement updates are universal, **but** there
exist universal — even reversible — updates with *no* constant complement, in the Sketch Data
Model. **So: sufficient, not necessary, once you leave sets.**

### 4.2 Foster–Greenwald–Moore–Pierce–Schmitt — lenses, and the three laws exactly

J. Nathan Foster, Michael B. Greenwald, Jonathan T. Moore, Benjamin C. Pierce, Alan Schmitt,
*Combinators for Bidirectional Tree Transformations: A Linguistic Approach to the View-Update
Problem*, **ACM TOPLAS 29(3), Article 17, May 2007**,
[doi:10.1145/1232420.1232424](https://doi.org/10.1145/1232420.1232424) (POPL 2005 precursor,
[doi:10.1145/1040305.1040325](https://doi.org/10.1145/1040305.1040325)).

**Def 3.1 — a lens `l` is a partial `l↗ : 𝒱 ⇀ 𝒱` (the *get*) and a partial
`l↘ : 𝒱 × 𝒱 ⇀ 𝒱` (the *putback*).** Note the argument order: `l↘(a, c)` takes the **abstract
view first**. **Def 3.2 — well-behaved** (`⊑` is the flat order on partial values):

```
l↘(l↗ c, c)  ⊑ c    for all c ∈ C            (GetPut)
l↗(l↘(a, c)) ⊑ a    for all (a,c) ∈ A × C    (PutGet)
```

and the third law, on p. 7:

```
l↘(a', l↘(a, c)) ⊑ l↘(a', c)                 (PutPut)
```

**Well-behaved** = GetPut + PutGet; **very well behaved** adds PutPut. **There is no separate
`create` in the TOPLAS presentation** — creation is handled by a distinguished "missing"
element `Ω`. (`create` with a `CreateGet` law is the *symmetric lenses* paper's presentation of
asymmetric lenses; §4.4.) Totality is a first-class concern here: Thm 3.15 makes the
well-behaved lenses a **cpo with bottom** under an information order, Thm 3.16 gives fixed
points, and Lemma 3.19 gives the induction scheme for proving recursive lenses total. **PutPut
is deliberately not required of the tree combinators** — `map`, `flatten`, `merge` and
conditionals all violate it "for reasons that seem pragmatically unavoidable".

**The correspondence the dispatch asked for — confirmed, verbatim, §10:**

> *"the set of all well-behaved lenses is isomorphic to the set of dynamic views in the sense of
> Gottlob, Paolini, and Zicari. Moreover, **the set of very well-behaved lenses is isomorphic to
> the set of translators under constant complement in the sense of Bancilhon and Spyratos.**"*

**Carry the caveats — they are in the paper's own footnote 9 and they matter for E2:**
(1) BS translators have type `(A → A) → (C → C)` — they translate *update functions*; lens
`put` has type `A → (C → C)` — it translates *states*.
(2) BS translators are defined only on a chosen **complete set** `U` closed under composition;
lens `put` is defined on **all** abstract states.
(3) BS translators return **total** functions; lens `put` may be partial, and `get` may be
partial while BS views are total.
(4) To make the correspondence tight, the lens sets must be restricted to totality.

And the sentence that closes the loop, same footnote, verbatim: *"if we restrict both `get` and
`putback` to be total functions…, then our lens laws (including PutPut) **characterize the set
`C` as isomorphic to `A × B` for some `B`**."* — **the lens laws force the source to be a
product of the view and a complement.**

**Tooling maturity — the line is archived.** The Harmony project page (`alliance.seas.upenn.edu/~harmony/`)
carries a 2008 copyright and its own "may be out of date" banner; Harmony is described as
archived. `github.com/boomerang-lang/boomerang` (LGPL-2.1, 83 stars) has **zero releases and
zero tags**; its last commit, 2023-03-15, was a README merge, not code. The living descendant is
**relational lenses in Links** (`github.com/links-lang/links`, 358 stars, last push
2025-08-21) — Bohannon, Pierce, Vaughan PODS 2006, and Horn, Perera, Cheney,
*Incremental Relational Lenses*, ICFP 2018, arXiv:1807.01948.

### 4.3 The fibrational account — and a correction the estate should carry

**The common formulation "delta lenses correspond to split opfibrations" is backwards, and there
is a paper whose whole purpose is to say so.**

Michael Johnson, Robert Rosebrugh, *Delta lenses and opfibrations*, **ECEASST 57 (Bx 2013),
1–18**, [doi:10.14279/tuj.eceasst.57.875](https://doi.org/10.14279/tuj.eceasst.57.875).
Abstract, verbatim:

> *"We compare the delta lenses, also known as d-lenses, of Diskin et al. with the c-lenses,
> known to be equivalent to opfibrations… **Contrary to expectation a c-lens is a d-lens but not
> conversely.** This result is surprising because d-lenses appear to provide the same information
> as c-lenses, and some more besides, suggesting that the implication would be the reverse."*

The chain, with receipts:

1. **Delta lenses** — Zinovy Diskin, Yingfei Xiong, Krzysztof Czarnecki, *From State- to
   Delta-Based Bidirectional Model Transformations: the Asymmetric Case*, **JOT 10:6:1–25,
   2011**, [doi:10.5381/jot.2011.10.1.a6](https://doi.org/10.5381/jot.2011.10.1.a6) (ICMT 2010
   precursor, [doi:10.1007/978-3-642-13688-7_5](https://doi.org/10.1007/978-3-642-13688-7_5);
   symmetric case MODELS 2011,
   [doi:10.1007/978-3-642-24485-8_22](https://doi.org/10.1007/978-3-642-24485-8_22)). A *model
   space* is a **connected category** — objects are models, **arrows are deltas**. **Def 4**:
   a delta lens is `(A, B, get, put)` with `get` a graph morphism and
   `put : B₁ ×_{A₀} → A₁`, satisfying `PutInc₁`/`PutInc₂`; well-behaved adds `GetId`, `PutId`,
   `PutGet`; **very well-behaved** adds `GetGet` and `PutPut`:

   ```
   (GetId)   id_A.get₁ = id_B                    (makes get a semi-functor)
   (PutId)   id_A = put(id_B, A)                 (the delta form of GetPut)
   (PutGet)  (put(b, A)).get₁ = b
   (GetGet)  (a; a').get₁ = (a.get₁);(a'.get₁)   (makes get a functor)
   (PutPut)  put(b; b', A) = put(b, A); put(b', A')
   ```

   Their motivating argument: **state-based PutPut is over-restrictive**, and the delta-based
   version fixes it.
2. **c-lenses** — Johnson, Rosebrugh, Wood, *Lenses, Fibrations and Universal Translations*,
   **MSCS 22(1):25–42, 2012**,
   [doi:10.1017/S0960129511000442](https://doi.org/10.1017/S0960129511000442). A c-lens is a
   functor `G : S → V` with `P : (G, 1_V) → S` from the comma category satisfying
   `c-PutGet`, `c-GetPut`, `c-PutPut` — equivalently an **algebra for the KZ monad `(−, 1_V)`
   on `cat/V`**, whose algebras (Street 1974) are the **split opfibrations**.
   **Corollary 4.1, verbatim:** *"A c-lens with codomain `V` is an opfibration with codomain
   `V`, and conversely."* Plus the remark that matters most: *"to be a c-lens is to be an
   op-fibration. This is a **property** of a functor, not extra structure… **there is no choice
   in the update strategy** associated with a view functor that is a c-lens."*
3. **The strictness** — JR 2013 Props 1–2: every c-lens induces a d-lens, and `CLens` sits
   inside `DLens` **as a non-full subcategory**. Their Example 4 exhibits a d-lens that is not a
   c-lens. Their own reading: *"the opfibration requirements for a c-lens are exactly what one
   would want to ensure canonical (least-change) updates."*
4. **The modern restatement** — Bryce Clarke, *The Grothendieck construction for delta lenses*,
   arXiv:[2502.21288](https://arxiv.org/abs/2502.21288) (28 Feb 2025, 41 pp.); journal version
   **Higher Structures, 19 June 2026**, [doi:10.21136/hs.2026.07](https://doi.org/10.21136/hs.2026.07).
   Def 1: a delta lens `(f, φ) : A → B` is a functor with a lifting operation
   `φ(a, u) : a → a'` for `u : fa → b`, satisfying
   `(DL1) fφ(a,u) = u`, `(DL2) φ(a, 1) = 1`, `(DL3) φ(a, v∘u) = φ(a',v) ∘ φ(a,u)`.
   Example 13, verbatim: *"A split opfibration is a delta lens `(f, φ) : A → B` such that each
   chosen lift `φ(a,u)` is **opcartesian**."* Clarke's Thm 35 gives delta lenses `A → B` as
   **lax double functors `Lo(B) → SMult`**, an equivalence of categories.
5. **Set-based lenses are the codiscrete case** — Johnson, Rosebrugh, *Unifying Set-Based,
   Delta-Based and Edit-Based Lenses*, Bx 2016, CEUR-WS Vol-1571. **Prop 4**: asymmetric
   set-based lenses correspond bijectively to delta lenses between the corresponding
   **codiscrete** categories. So *very well-behaved set lens = delta lens on codiscrete
   categories*.

**And here is the theorem the estate should actually quote.** JRW **MSCS 2012 Prop 3.2**,
verbatim:

> *"if `(S,V,g,p)` is a lens, then `g : S → V` **is essentially just a projection** to `V`,
> that is for some `C`, `g ≅ π₀ : V × C → V`. Indeed, given the lens `(S,V,g,p)`, the
> '**complement**' `C` just mentioned is the object of `C` given by the essential inverse of
> `K`."*

Hypothesis to carry: `V → 1` split epi (i.e. `V` has a global element / is non-empty).

**[judgment] That single sentence is the formal content of the operator's thesis, and it has
been available since 2012.** A lens's `get` *is* a product projection, and the second factor
*is* the Bancilhon–Spyratos complement. Everything else in thread 4 is refinement of that.

**[judgment] Note where Clarke's title lands.** §3.1 identified the **Grothendieck
construction** as the categorical home of "a global object whose fibers are schemas"; the
view-update thread published *The Grothendieck construction for delta lenses* in **June 2026**.
**Two independent literatures, one arriving from "many schemas, one universe" and the other
from "a view and its complement", are converging on the same construction within the last
quarter.** That is the strongest structural signal this survey found, and it is three months
old.

### 4.4 Symmetric lenses — the complement made explicit, and made private

Martin Hofmann, Benjamin C. Pierce, Daniel Wagner, *Symmetric Lenses*, **POPL 2011, 371–384**,
[doi:10.1145/1926385.1926428](https://doi.org/10.1145/1926385.1926428); *Edit Lenses*, **POPL
2012, 495–508**, [doi:10.1145/2103656.2103715](https://doi.org/10.1145/2103656.2103715).

The paper's own framing, §2, verbatim — note that it credits the source directly:

> *"**Complements.** The key step toward symmetric lenses is the notion of *complements*. **The
> idea, which dates back to a famous paper in the database literature on the view update
> problem [4]**… If we think of the `get` component of a lens as a sort of projection function,
> then there is another projection from `X` into some set `C` that keeps all the information
> discarded by `get`."*

Reference `[4]` is Bancilhon–Spyratos. **Def 2.1** — a symmetric lens `ℓ ∈ X ↔ Y` is a set of
complements `C`, a distinguished `missing ∈ C`, and

```
putr ∈ X × C → Y × C          putl ∈ Y × C → X × C
```

with round-tripping laws `PUTRL` and `PUTLR`. The intuition, verbatim: *"we can think of the
combined complement `C` as `C_X × C_Y` — that is, each complement contains some 'private
information from `X`' and some 'private information from `Y`'."* Strong put-put laws are
**explicitly rejected** because they would demand that every update's effect *on the complement*
be undoable, which the paper's own list-mapping lenses violate.

**Two structural facts the estate must price in.**

1. **The complement is existentially quantified — it is not part of the type.** Verbatim:
   *"the set `C` is an **internal component, not part of the externally visible type**…
   `Lens(X,Y) = ∃C. {missing : C, get : X → Y × C, put : Y × C → X}`."* **[judgment] Same word
   as Bancilhon–Spyratos, weaker object.** In 1981 the complement is *a view* — externally
   meaningful, itself a projection of the universe. Here it is private state.
2. **Lens equality must be taken up to a bisimulation on complements** (Def 3.2), and
   observational equivalence coincides with it (Thm 3.6). This is not fastidiousness: Lemma 4.5,
   verbatim — *"The equivalence is crucial here: `j;(k;ℓ)` and `(j;k);ℓ` are **not the same
   lens** because their complements are structured differently."* `LENS` is therefore a category
   whose arrows are **equivalence classes**. (It also has a symmetric monoidal tensor and sums
   but provably **no categorical products or sums**.)

**[judgment] Fact 2 is a direct, concrete warning for E2, and it is the kind this survey exists
to produce.** If the estate adds a complement to its codec so the round-trip law becomes
provable (§4.0c), then **`addr` must be defined on the codec modulo complement representation**,
or the store will mint distinct addresses for observationally identical codecs — associativity
of codec composition alone is enough to break it. That is precisely kickoff L3's rule ("never
route carrier information around the encoder") colliding with kickoff §4.3's declared
equivalence, and it is decidable in advance: **either the complement is a carrier field and
enters the pre-image, or it is quotiented and the equivalence table gains a clause.** There is
no third option.

### 4.5 Profunctor optics — and precisely which optic a codec is

- Matthew Pickering, Jeremy Gibbons, Nicolas Wu, *Profunctor Optics: Modular Data Accessors*,
  **The Art, Science, and Engineering of Programming 1(2), Article 7, 2017**,
  [doi:10.22152/programming-journal.org/2017/1/7](https://doi.org/10.22152/programming-journal.org/2017/1/7).
- Guillaume Boisseau, Jeremy Gibbons, *What You Needa Know about Yoneda: Profunctor Optics and
  the Yoneda Lemma (Functional Pearl)*, **ICFP 2018**, PACMPL 2(ICFP) Article 84,
  [doi:10.1145/3236779](https://doi.org/10.1145/3236779).
- Bryce Clarke, Derek Elkins, Jeremy Gibbons, Fosco Loregian, Bartosz Milewski, Emily Pillmore,
  Mario Román, *Profunctor Optics, a Categorical Update*, **Compositionality 6(1), 23 Feb
  2024**, [doi:10.32408/compositionality-6-1](https://doi.org/10.32408/compositionality-6-1);
  arXiv:2001.07488.
- Mitchell Riley, *Categories of Optics*, arXiv:[1809.00738](https://arxiv.org/abs/1809.00738)
  (Sep 2018, 51 pp.). **No `journal_ref`, no DOI — apparently never formally published.**

**Def 2.1 (Clarke et al.), the general optic:**

```
Optic_{◁L,◁R}((A,B),(S,T)) := ∫^{M∈M}  C(S, M ◁_L A) ⊗ D(M ◁_R B, T)
```

The family, with the residual that defines each:

| Optic | Concrete form | Residual |
|---|---|---|
| **Adapter (Iso)** | `C(S,A) ⊗ D(B,T)` | **none** |
| **Lens** | `C(S,A) × D(S • B, T)` | a **product** — the complement |
| **Prism** | `C(S, T • A) × D(B, T)` | a **coproduct** — a failure branch |
| **Affine traversal** | `C(S, T + A ⊗ [B,T])` | lens ∘ prism: "focus that may be absent" |
| **Traversal** | `C(S, Σₙ Aⁿ ⊗ [Bⁿ,T])` | a container |

Concretely (Pickering–Gibbons–Wu; identical in Boisseau–Gibbons):

```haskell
data Adapter a b s t = Adapter { from :: s → a,      to     :: b → t }
data Lens    a b s t = Lens    { view :: s → a,      update :: b × s → t }
data Prism   a b s t = Prism   { match :: s → t + a, build  :: b → t }
```

Boisseau–Gibbons's existential form makes the point explicit —
`data LensC a b s t = ∃c . LensC (s → c × a, c × b → t)` — **that `c` is the complement**.
**Theorem 4.14 (Clarke et al.)**, the profunctor representation theorem:
`∫_{P ∈ Tamb} V(P(A,B), P(S,T)) ≅ Optic((A,B),(S,T))`. Riley supplies the missing general
notion of **lawfulness** (`outside(p) = id_S` and `once(p) = twice(p)`) and **Prop. 3.0.3**
proves it equivalent to the three concrete lens laws.

**The decisive sentence for the estate, Riley §2, verbatim:**

> *"The residual `M` should be thought of as a kind of '**scratch space**'… **The quotienting
> imposed by the coend means we cannot inspect this temporary information**, indeed, given an
> optic `S ⇸ A` there is not even a canonical choice for the object `M` in general."*

**So which optic is a codec?** Instantiate the concrete prism at `s = t = Encoded`,
`a = b = Type`, with `match = decode` and `build = encode`:

| Prism law | Codec reading |
|---|---|
| `match (build a) = Right a` | `decode (encode t) = Ok t` — **round-trip** |
| `either id build (match s) = s` | every valid encoding is the encoding of what it decodes to — **canonicity** |

Those are not analogies; they are the same equations. The classification, with the estate's own
cases:

| Codec flavour | Optic | Law it satisfies |
|---|---|---|
| Bijective, canonical, no invalid states | **Iso / Adapter** — residual collapses to a point | both directions |
| Validating **and** canonical | **Prism** (`Optic_{•,+}`) | both prism laws |
| Validating, **non**-canonical (JSON whitespace, field order) | *not a lawful prism*; `encode` is only a section of `decode` | round-trip only |
| Field that may be absent / refined | **Affine traversal** (= lens ∘ prism) | — |
| **Typed `Error` exposed in the API** | a prism **with its residual pinned**, not an optic | as above, plus `Error` is public |

**[judgment] The last row is the finding, and it is a genuine tension the charter has not
named.** With `decode : Encoded → Error + Type` and `Error` a distinct named type, the second
prism law does not even typecheck — `either id build` needs the failure branch to be `T`. What
the estate has is one *point* of the coend `∫^M C(S, M + A) × C(M + B, T)`, with `M := Error`
**pinned rather than quantified**. But the coend quotient exists *precisely so that `M` cannot
be inspected* — and a codec's error type is the thing callers pattern-match on. **A foldlab
codec therefore wants the Bancilhon–Spyratos / symmetric-lens posture (complement named and
first-class), not the profunctor-optic posture (residual quotiented away). You cannot have
typed errors and the optic abstraction at the same time.** That is a ruling the charter should
make explicitly rather than inherit by accident.

**And the reading of the codec as a projection, derivable from 1981.** If `decode` were total
and surjective, Def 4.4 + JRW Prop 3.2 give `Encoded ≅ Type × Complement`, where the complement
is exactly the **representation freedom** — whitespace, field order, padding. Canonicity forces
`Complement ≅ 1`. **So a canonical validating codec is exactly a view whose complement is a
point, restricted to the valid subset of `Encoded`** — which is a precise formal reading of the
charter's "the smallest instance of the projection pattern", and it falls out of a 1981 paper.

**How Xia's `profunctor-monad` relates — Xia answers this himself.** *Composing Bidirectional
Programs Monadically*, ESOP 2019, LNCS 11423:147–175,
[doi:10.1007/978-3-030-17184-1_6](https://doi.org/10.1007/978-3-030-17184-1_6). Key definitions:
`comap :: (u → Maybe u') → p u' v → p u v` — **the contravariant map is partial**, deliberately;
`upon = flip comap` for do-notation (`d ← char \`upon\` head`); a **monadic profunctor** adds
`comap f` lifting partial functions to **monad morphisms** (laws free by parametricity);
**Def 4 backward** and **Def 5 forward round-tripping**, with `purify`, *compositional
properties* and *quasicompositionality* as the reasoning machinery. §7, verbatim:

> *"Profunctor optics and our monadic profunctors offer orthogonal composition patterns:
> profunctor optics can be composed 'vertically' using function composition, whereas monadic
> profunctor composition is 'horizontal' providing sequential composition. **In both cases,
> composition in the other direction can only be obtained by breaking the abstraction.**"*

| | Profunctor optics | Monadic profunctors (Xia) |
|---|---|---|
| What it is | a *representation* of an optic (Tambara quantification) | a *typeclass structure* on a bidirectional program |
| Composition | **vertical** — nest into a substructure | **horizontal** — sequence field by field |
| Laws | enforced by the Tambara class + Riley's lawfulness | **not enforced**; proved by `purify` / compositionality |
| Contravariant side | `dimap`, **total** | `comap`, **partial** (`u → Maybe u'`) |
| Domain | data access | parse/print, generator/predicate, monadic codecs |

Xia's §7 explicitly names **the Haskell `codec` library** — which the charter's roadmap item 4
already cites — as an instance of this pattern. And Xia is explicit that the interface *"does
not rule out all non-round-tripping BXs"*: **there is no law enforcement, only a reasoning
framework.**

### 4.6 Mechanisation ledger — lens laws, as of 2026-08-25

| Assistant | State of record |
|---|---|
| **Isabelle/HOL** | **The state of the art, by a distance.** AFP entry **`Optics`** — Simon Foster, Christian Pardillo-Laursen, Frank Zeyda; submitted **2017-05-25**, BSD; change history 2020-03-02 (partial-bijective + **symmetric** lenses), 2021-01-27, 2021-11-15, **2022-10-05 (Scene Spaces)**; **used by 4 AFP entries** (Isabelle/UTP, ConcurrentHOL, Shallow Expressions, Z Mathematical Toolkit). Theories: `Lens_Laws`, `Lens_Algebra`, `Lens_Order`, `Lens_Symmetric`, `Scenes`, `Scene_Spaces`, `Lens_Instances`, `Prisms`, `Channel_Type`, `Dataspace`, `Lens_State`. The hierarchy is `weak_lens` (`put_get`) ⊂ `wb_lens` (+`get_put`) / `mwb_lens` (+`put_put`) ⊂ **`vwb_lens`** (all three) ⊂ `pbij_lens` ⊂ `bij_lens`. **`vwb_lens` is exactly Foster–Pierce's very well-behaved lens.** `Lens_Algebra` proves composition/sum/product **closed under very-well-behavedness**; `lens_indep` (`⨝`), `lens_compat`, `lens_obs_eq`, quotient `/⇩L`, `inv⇩L`; `Lens_Order` gives sublens `⊆⇩L` and equivalence `≈⇩L`. Companion: Foster, Zeyda, Woodcock, ICTAC 2016, 295–314, [doi:10.1007/978-3-319-46750-4_17](https://doi.org/10.1007/978-3-319-46750-4_17) |
| **Agda** | **Deepest single result, dead artifact.** **BiGUL** — Ko, Zan, Hu, PEPM 2016, 61–72, [doi:10.1145/2847538.2847544](https://doi.org/10.1145/2847538.2847544). Hackage's own description, verbatim: *"BiGUL was originally developed in the dependently typed programming language Agda, and **its well-behavedness has been completely formally verified**; this package is the Haskell port."* So the **putback-based core language's well-behavedness** is Agda-verified; the Haskell port is not. Extended by Ko & Hu, *An axiomatic basis for bidirectional programming*, POPL 2018, [doi:10.1145/3158129](https://doi.org/10.1145/3158129) (a Hoare logic, also Agda). **Hackage frozen since 2016-08-30**; Agda source on Bitbucket, state unverified. Live Agda work exists (`nad/dependent-lenses`, Danielsson, pushed 2026-06-01; `kztk-m/ps-lenses-agda`, pushed 2026-06-26; `comonoid/agdelte`, pushed 2026-07-12) but none is BX law *algebra*. |
| **Coq / Rocq** | **Essentially nothing.** `bedrocksystems/coq-lens` (17 stars, last push 2022-10-07) — `theories/Lens.v` is **37 lines with zero `Lemma`s and zero `Theorem`s**; it is a MetaCoq *generator* for record lenses, not Rocq-ported. `tchajed/coq-record-update` (48 stars, alive) is not a lens library. **No Coq formalisation of profunctor optics, Tambara modules, the representation theorem, delta lenses, or view-update theory.** (Exception, and the survey's own correction: **`Lysxia/profunctor-monad/coq/` does contain real Coq proofs of compositionality for biparsers and lenses** — §4.0b.) |
| **Lean 4** | **A real gap, only just starting to be filled.** See §4.0's table. `VCA-EPFL/leanses` is the credible artifact. Nothing exists in Lean 4 for: a lens **algebra** with proved closure; **independence / sublens / equivalence**; **any proved lawful prism instance**; **traversal laws** (`lean-optics` fakes them with `Prop := True`); the **profunctor representation theorem**; **delta lenses or opfibrations**; or **any complement / product-decomposition result**. Note for the axiom allowlist: the existing Lean proofs are `rfl`/`simp` and use **no axioms at all**. |

### 4.7 Verdict on thread 4

1. **Which formalism most precisely captures "a schema is a projection of a global type *with a
   complement*"?** **Bancilhon–Spyratos 1981, upgraded by Johnson–Rosebrugh–Wood MSCS 2012 Prop
   3.2.** BS gives the complement as a **first-class view** with an iff theorem and the honest
   warning that the complement *is* the update policy and is not unique; JRW turns it into the
   structural statement that **a lens's `get` is, up to isomorphism, the product projection
   `π₀ : V × C → V`, and `C` is the BS complement**. Second place: **c-lenses ≃ split
   opfibrations** (JRW Cor 4.1), where the update strategy becomes a *property* rather than a
   choice. **Not** profunctor optics — the coend quotient structurally refuses to carry the
   second half of the operator's sentence.
   **Correction to carry: cite *c-lenses*, not delta lenses, as "the fibrational account".**
   Split opfibrations are a **strict special case** of delta lenses, not the other way round
   (JR, ECEASST 57, 2013).
2. **Is the charter right to pin `profunctor-monad`?** Right for what it pins it *for*, wrong if
   it is the only pin. **Pin three:** (i) **Xia–Orchard–Wang ESOP 2019** — authoring,
   horizontal composition, partial `comap`, the parse/print shape, and it names the Haskell
   `codec` library the roadmap already cites; (ii) **Clarke et al. Compositionality 6(1) 2024 +
   Riley** — the *shape* (a codec is a prism, degenerating to an iso) and the law algebra, which
   is exactly the half Xia's line does not enforce; (iii) **Bancilhon–Spyratos 1981 + JRW MSCS
   2012** — the complement, which is the actual thesis and is currently uncited.
   **And record the tension in §4.5's last row: typed errors and the optic abstraction are
   mutually exclusive.**
3. **Mechanisation.** Isabelle/AFP `Optics` is the only mature development and the obvious
   **port target** — it is BSD, it is the only place the *algebra* is proved, and its `vwb_lens`
   is Bancilhon–Spyratos's constant-complement translator by Foster et al. §10. Agda has the
   deepest single result (BiGUL) in a dead artifact. Coq has essentially nothing. **Lean 4 has
   record-field lens generation and nothing else**; `leanses`' `mklenses` metaprogram is a
   reasonable generation layer to build under a ported `Lens_Laws`.

---

## 5. The meta-frame — institutions and sheaves, briefly and honestly

The dispatch asked for one section and a clear judgment on whether the abstraction earns its
cost. It does not, for this program, and here is the precise reason.

### 5.1 Institutions (Goguen–Burstall)

Joseph A. Goguen, Rod M. Burstall, *Institutions: Abstract Model Theory for Specification and
Programming*, **J. ACM 39(1):95–146, January 1992**,
[doi:10.1145/147508.147524](https://doi.org/10.1145/147508.147524) (after "Introducing
Institutions", 1984).

An institution is a four-tuple `(Sign, Sen, Mod, ⊨)`:
- `Sign` — a category of **signatures**;
- `Sen : Sign → Set` — a functor giving the **sentences** over each signature;
- `Mod : Sign^op → Cat` — a functor giving the **models** of each signature;
- `⊨_Σ ⊆ |Mod(Σ)| × Sen(Σ)` — a satisfaction relation for each `Σ`;

subject to the **satisfaction condition**: for every signature morphism `σ : Σ → Σ'`, every
`M' ∈ Mod(Σ')` and every `φ ∈ Sen(Σ)`,

```
M' ⊨_Σ'  Sen(σ)(φ)      ⟺      Mod(σ)(M')  ⊨_Σ  φ
```

Read in the estate's terms: **`Mod(σ)` is projection (reindexing a model along a change of
schema); `Sen(σ)` is translation of a claim. The satisfaction condition says a claim survives
projection exactly when its translation does.** It is the abstract statement of "truth is
invariant under change of notation".

**[judgment] The estate should adopt the satisfaction condition as a design law and should not
formalise institutions.** The condition is a one-line obligation that any E2 projection must
discharge: *every judgment the estate makes about an entity at one schema must have a
translation such that projecting the entity and translating the judgment agree*. That is
directly the charter's **lift** requirement ("every judgment already established for the
artifact survives the lift"). Naming it after Goguen–Burstall gives the estate a 34-year-old
citation for a law it already wants.

The abstraction itself, though, is priced for a problem the estate does not have.
**Institutions pay off when you have *many logics*.** The engineering monument is **HETS**
(the Heterogeneous Tool Set, Mossakowski et al.) — `github.com/spechub/Hets`, Haskell,
63 stars, **last push 2025-10-07**, not archived: alive but slow — which uses institution
comorphisms to move specifications between provers, alongside **CASL**, its specification
language. The estate has *one* schema language, pinned, with a fail-closed admission function.
Buying `Sign`, `Sen`, `Mod`, and a satisfaction proof to relate a language to itself is pure
overhead.

**Mechanisation: none found.** Two places checked directly on this host: the **Isabelle/AFP
`Logic/General logic` topic** (16 entries listed, 2020–2026 — HOL embeddings, Q0 metatheory,
completeness calculi; **nothing on institutions, abstract model theory, or heterogeneous
specification**) and the **AFP category-theory topic** (17 entries, reported by the thread-3
reader; nothing on institutions either). No Coq/Rocq, Agda, or Lean formalisation surfaced.
**Stated as a negative with moderate confidence**: absent from the obvious venues, not proved
absent. Diaconescu's *Institution-Independent Model Theory* (Birkhäuser, 2008) is the standard
monograph and is, as far as this survey can tell, pen-and-paper throughout.

### 5.2 Presheaves and sheaves — the precise statement of P1

A **presheaf** on a category `C` of contexts is a functor `F : C^op → Set`: data assigned to
each context, with **restriction maps** `F(f) : F(D) → F(C)` for each `f : C → D`, functorially.
That is literally "many local views with coherent restrictions", and it is the same object as
Spivak's instances (§3) with the variance flipped.

A presheaf is a **sheaf** for a coverage when, for every cover `{U_i → U}`, the diagram

```
F(U)  →  ∏ᵢ F(Uᵢ)  ⇉  ∏ᵢⱼ F(Uᵢ ×_U Uⱼ)
```

is an equaliser: **local sections that agree on overlaps glue to a unique global section.**

**[judgment] This is the exact formal home of P1, and it is worth the estate knowing it even
if it never formalises a sheaf.** P1 says "global is not derivable from local". The sheaf
condition says *when it is*: gluing succeeds. The failure of gluing — local sections that
pairwise agree but admit no global section — is precisely the obstruction P1 asserts.
The sharpest exhibit of that failure being *measurable* rather than merely present is
Abramsky & Brandenburger, *The Sheaf-Theoretic Structure of Non-Locality and Contextuality*,
New J. Phys. 13:113036, 2011, arXiv:[1102.0264](https://arxiv.org/abs/1102.0264): contextuality
*is* the non-existence of a global section over a family of compatible local ones, with
cohomological obstructions to it. Whether an estate that never leaves the DAG needs that
machinery is doubtful, but "P1 is a gluing failure" is a genuinely clarifying sentence, and it
is the one piece of the meta-frame I would put in the charter's own vocabulary.

**Dynamics over a universe — Schultz & Spivak.** *Temporal Type Theory: A Topos-Theoretic
Approach to Systems and Behavior* (Birkhäuser, 2019, arXiv:[1710.10258](https://arxiv.org/abs/1710.10258))
and Schultz, Spivak, Vasilakopoulou, *Dynamical Systems and Sheaves* (Applied Categorical
Structures 28, 2020, arXiv:[1609.08086](https://arxiv.org/abs/1609.08086)) build behaviour types
as sheaves on an interval site, so that a machine *is* a sheaf and composition of systems is
operadic (wiring diagrams). **[judgment] This is the only formalism in the survey that is
simultaneously about a universe of coherent local views *and* about dynamics** — which makes it
the most tempting and the most expensive option on the table. It is a topos-theoretic
programme with essentially no mechanisation and no tooling. **Recommend against**, and record
the trigger in §7.

**Mechanisation of sheaves — verified on this host.** Mathlib4 has the machinery, at scale:
`Mathlib/CategoryTheory/Sites/` (**71 entries** — `Sheaf`, `Grothendieck`, `Sheafification`,
`ConcreteSheafification`, `CoverLifting`, `Canonical`, `Continuous`, `Coherent/`, …) and
`Mathlib/Topology/Sheaves/` (**25 entries** — `LocalPredicate`, `Stalks`, `EtaleSpace`,
`Limits`, …). So the *proof-assistant* cost of sheaves is zero in Lean 4 **if you take
Mathlib** — and, per the E1 ruling, the estate does not.

---

## 6. The join — quantitative, timed, and cost-annotated global types

This is the section the operator's §14 thesis actually turns on: *"cost, trace, and usage
should be carried by the semantics the way values are"*, and *"which projections become hot
during computation"*. The dispatch asked whether such work exists. **It does. It is a real,
if small, literature; it proves the right theorem shape; and none of it is mechanised.**

### 6.1 CAMP — cost as a denotation of the global type

David Castro-Perez, Nobuko Yoshida, *CAMP: Cost-Aware Multiparty Session Protocols*,
**OOPSLA 2020**, arXiv:[2010.04449](https://arxiv.org/abs/2010.04449) (9 Oct 2020). Read in
full on this host.

**The annotation is *in the global type*, not beside it.** The syntax:

```
G ::= p → q{τ ⋄ c}.G  |  p → q : {lᵢ.Gᵢ}ᵢ∈I  |  µX.G  |  X  |  end
```

`p → q{τ ⋄ c}` is "`p` sends `q` a value of type `τ`, with local computation cost `c`" —
`c` an estimated execution time. Local types carry it through: `p ? τ ⋄ c . L`.
This is exactly the operator's "observability is denotation, not instrumentation": **the cost
is a constructor argument of the description, so no instrumentation can perturb it.**

**Cost is computed compositionally from the global type** — Definition 4.5 (Global Type Cost),
producing a **cost environment** `T : Role → Cost` (not a scalar), with a `max` at branches:

```
C(p→q{τ⋄c}.G, k)(T,W)      = C(G,k)(T[p ↩→ c_O(τ)][p|q ↩→ c_I(τ) + c], W)
C(p→q{lᵢ.Gᵢ}ᵢ∈I, k)(T,W)   = max { C(Gᵢ,k)(T[p ↩→ c_O(1)][p|q ↩→ c_I(1)], W) }ᵢ∈I
C(µX.G, k·k⃗)(T,W)          = C(unfoldₖ(X,G), k)(T⃗,W)
C(end)(T,W)                = (T,W)
```

where `T[c'|r ↩→ c] = T[r ↦→ max(T(r), c') + c]` — the operator that **records cost
dependencies**: `r` incurs `c` *after possibly waiting for* an external action costing `c'`.
**[judgment] That `max` is the whole point.** Cost in a many-party system is not additive; it
is a join over a causal order. That is precisely P1's claim (global causal structure is not
recoverable from any endpoint) restated in the cost domain, and it is why the estate's `T7`
rejection is right: per-endpoint instrumentation *cannot* compute this number, because the
number is a property of the global object's causality.

**The theorems** (all pen-and-paper):

- **Thm 4.12 (Bounded-Cost Soundness)**: if `unfold(G,k⃗) --α⃗--> end` then `C(α⃗) ≤ C(G, k⃗)`.
  *The cost of any actual trace is bounded above by the cost computed from the global type.*
- **Thm 5.5 (Cost Latency Correspondence)** and **Thm 5.7 (Latency Soundness)** — the recursive
  case, via cost recurrences and difference equations, giving latency per iteration.
- **Thm 6.3 (Optimisation Cost)** — the cost consequence of asynchronous message optimisation
  under a subtyping-like refinement `G₁ ⪯ G₂`.

Evaluation: benchmarks in C, MPI-C, Scala, Go, OCaml; *"in most of the cases, we predict an
upper-bound on the real execution costs with < 15% error."*

**Not mechanised.** No proof-assistant artifact stated or found.

### 6.2 Timed MPST — quantities as constraints, projected

Laura Bocchi, Weizhen Yang, Nobuko Yoshida, *Timed Multiparty Session Types*, **CONCUR 2014**,
LNCS 8704:419–434, [doi:10.1007/978-3-662-44584-6_29](https://doi.org/10.1007/978-3-662-44584-6_29).
Technical report DTR14-3 read in full on this host.

```
G ::= p → q : {lᵢ⟨Sᵢ⟩{Aᵢ}.Gᵢ}ᵢ∈I | µt.G | t | end       A ::= {δ_O, λ_O, δ_I, λ_I}
T ::= p ⊕ {lᵢ : ⟨Sᵢ⟩{Bᵢ}.Tᵢ} | p & {…} | µt.T | t | end  B ::= {δ, λ}
δ ::= true | x > c | x = c | ¬δ | δ₁ ∧ δ₂
```

Each interaction carries a **time assertion** `A = {δ_O, λ_O, δ_I, λ_I}`: a clock constraint
`δ` and a reset predicate `λ`, separately for the output and the input side. Projection carries
`A` down to the endpoint's `B = {δ, λ}`. The results: **Thm 3.3** relates timed globals to
timed locals; **Thm 4.4** time-error freedom; **Prop 5.1** — *feasibility* (every partial
execution extends to a correct complete one) and *wait-freedom* (if senders respect their
constraints, no receiver waits) are **decidable**; **Thm 5.4** time-progress; **Thms 5.6/5.7**
a sound and complete characterisation of a class of communicating timed automata with progress
and liveness.

**Not mechanised** (not stated in the TR; I did not find an artifact).

**[judgment] This is the closest existing template for the operator's thesis.** A quantitative
annotation lives in the global type's constructors; projection maps it to endpoints; the
transported theorem is a *quantitative* safety property (time-error freedom); and the
well-formedness conditions that make it work (feasibility, wait-freedom) are **decidable
properties of the global object**. Swap "clock constraint" for "demand" or "heat" and the
architecture is the estate's §14 thesis with the numbers changed.

### 6.3 The rest of the quantitative landscape, with maturity

| Work | What it quantifies | Setting | Maturity | Mechanised |
|---|---|---|---|---|
| **CAMP** (Castro-Perez, Yoshida, OOPSLA 2020) | latency + local computation cost | **multiparty**, global types | published + tool + benchmarks | **no** |
| **Timed MPST** (Bocchi, Yang, Yoshida, CONCUR 2014) | real time (clocks, resets) | **multiparty**, global types | published, decidable conditions | **no** |
| **Work Analysis with Resource-Aware Session Types** (Das, Hoffmann, Pfenning, LICS 2018, [doi:10.1145/3209108.3209146](https://doi.org/10.1145/3209108.3209146)) | total work (amortised analysis, potential) | **binary**, intuitionistic | mature line | no |
| **Parallel Complexity Analysis with Temporal Session Types** (Das, Hoffmann, Pfenning, ICFP 2018, [doi:10.1145/3236786](https://doi.org/10.1145/3236786)) | span/latency via modalities `○A`, `□A`, `◇A` | **binary** | mature | no |
| **Rast** (FSCD 2020, [doi:10.4230/LIPIcs.FSCD.2020.33](https://doi.org/10.4230/LIPIcs.FSCD.2020.33); arXiv:2012.13129) | work + time + arithmetic refinements | **binary** | implemented language | no |
| **Nomos** (Das, Balzer, Hoffmann, Pfenning — resource-aware session types for digital contracts, arXiv:1902.06056) | gas / resource cost of contracts | **binary**, shared | implemented | no |
| **Probabilistic Resource-Aware Session Types** (Das, Wang, Hoffmann, **POPL 2023**, [doi:10.1145/3571259](https://doi.org/10.1145/3571259); arXiv:2011.09037) | **expected** cost; probability distributions over messages | **binary** | published, type inference by LP | no |
| **Probabilistic Refinement Session Types** (Fu et al., [doi:10.1145/3729317](https://doi.org/10.1145/3729317), 2025) | probabilistic refinement | binary | recent | not verified here |
| **Mixed Choice in Asynchronous MPST** (Bocchi, Hu, Voinea, Thompson, arXiv:2602.23927, 2026) | — (expressiveness, not quantity) | multiparty | preprint | no |
| **Timeout Asynchronous Session Types** (arXiv:2401.11197) | timeouts / mixed choice under time | binary-ish | preprint | not verified here |

**[judgment] The shape of the gap, stated precisely.**

1. **The quantitative work that is *multiparty* (CAMP, Timed MPST) is the work that is *not*
   mechanised.** The quantitative work that is deeply developed (Das–Hoffmann–Pfenning's
   amortised-analysis line, Rast, Nomos, probabilistic RAST) is **binary** — two parties,
   linear-logic duality, no global object at all. Nobody has carried potential-based amortised
   analysis up to a multiparty global type.
2. **Nobody quantifies *demand*.** Every quantity in the table is a *cost of doing* — time,
   work, gas, expected cost. The operator's question is about *which projections become hot*,
   which is a quantity over **usage/demand**, i.e. over *how often a given projection is taken*.
   The nearest formal machinery for that is semiring provenance and demand analysis — which is
   the sibling reader's territory (`demand-provenance-survey.md`), not this one. **The join the
   operator is asking for — a global type whose projections carry a demand semiring — is, as
   far as this survey found, unoccupied.**
3. **The estate is unusually well placed to occupy it.** The pattern is fixed by CAMP and Timed
   MPST: put the quantity in the constructor, define the quantity compositionally over the
   global object, prove that projection transports it, prove that the runtime bound follows.
   That is four theorems of a very familiar shape, in a domain (schemas, not π-calculus) where
   the estate already owns the carrier and where Mech has now shown that Lean 4 can carry the
   metatheory.

**Boundary with the sibling readers.** The *algebra* for carrying a quantity in a semantics —
graded modal types, semiring-graded comonads, quantitative type theory, amortised potential —
is `cost-semantics-survey.md`'s subject, and the *demand/provenance semiring* specifically is
`demand-provenance-survey.md`'s. This survey deliberately stops at the boundary: it reports
only what is known about attaching quantities **to a global type and transporting them through
projection**, which is CAMP, Timed MPST, and nothing else. If the sibling readers return a
grading structure, §7.4's trigger fires and the two halves meet at CAMP's Def. 4.5.

---

## 7. Synthesis — the recommended frame

### 7.0 The one decision this survey forces: Mathlib

Three of the six threads converge on the same fork, and it is not a research question — it is a
standing ruling that now has consequences.

- The **L3 vehicle** the estate would most want to stand on (`leanprover/cslib` + Mech) is
  **Mathlib-total** and on a **v4.34.0-rc2** toolchain (§2.3).
- The **statics carrier** the estate would most want for a universe of schemas (finitely
  presented categories, `Δ`/Kan extensions) is **free in Mathlib and prohibitive without it**
  (§3.0).
- The **sheaf vocabulary** that gives P1 its exact formal statement is **71 files of Mathlib**
  and essentially nothing outside it (§5.2).

Meanwhile the estate's own floor is *v4.33.1, axiom allowlist, no Mathlib by default*, and its
one landed artifact (`formal/fips202`, 67 theorems, axioms within
`{propext, Classical.choice, Quot.sound}`) is exactly the kind of thing that ruling protects.

**[judgment] The recommended posture is not "adopt Mathlib" or "refuse Mathlib" but
*stratify*.** Keep the identity layer — carrier, encoder, address, the E2 statics — Mathlib-free
and inside the allowlist, because that is where the estate's distinctive claims live and where
the axiom budget matters. Allow a **separate, clearly-fenced Lake target** for the projection
layer that may depend on Mathlib and cslib, whose claims are stated at a *different* gate and
whose axiom profile is reported separately. The stratification is the same move the estate
already makes between `formal/` and evidence: **the fence is the deliverable, not the
dependency decision.** Without such a fence, every one of §7.4's triggers is a re-litigation of
the same ruling.

### 7.1 The core recommendation, in one paragraph

**Split the sentence, and give the two halves different formalisms.**

- **The universe of schemas and their projections between each other is a category, and it
  should be modelled the way Spivak models it** (§3): schemas as objects, schema morphisms as
  arrows, entities as functors/instances, projection-as-reindexing as `Δ`. This carries the
  *statics* — the entity store's identity layer, kickoff §§1–13.
- **The global object whose projections are schemas is a choreography/global type, and it
  should be modelled the way Mech models it** (§2): an authored global description with a
  projection operator and an EPP soundness/completeness theorem. This carries the *dynamics* —
  kickoff §14.
- **The bridge between them is the codec** (§4, H2). A codec is a *view with a complement*;
  the charter's "one description, two views" is exactly Bancilhon–Spyratos's `f` and its
  complement `g` with `⟨f, g⟩` injective, and JRW MSCS 2012 Prop. 3.2 says the `get` of a lens
  **is** the projection `π₀ : V × C → V`. **[judgment]** The estate should state the codec law
  **as a complement law**, because that is the version that generalises to *n* views — which is
  what "schemas are projections of a global type" needs — and because §4.0c shows the estate's
  actual codec fails the isomorphism law on exactly the dimension a complement would carry.
  §4.5 supplies the sentence: *a canonical validating codec is a view whose complement is a
  point*, and the estate's codec is not canonical, so its complement is not a point.

**One convergence worth flagging above everything else in §7.** The statics thread's global
object is a **Grothendieck construction** (§3.1, Spivak 2012 §3.6). The view-update thread's
categorical account of lenses-as-projections published, on **19 June 2026**, a paper titled
*The Grothendieck construction for delta lenses* (§4.3). **[judgment] Two independent
literatures, one arriving from "many schemas, one universe" and the other from "a view and its
complement", are landing on the same construction within the last quarter.** The estate should
treat that as the strongest available signal about where the frame lives — and as a reason to
read Clarke's 2026 paper before committing to any of §7.4.

**What the global object is *not*: a single mega-schema.** **[judgment]** The temptation is to
read "schemas are projections of a global type" as "there is one giant schema and all others
are sub-schemas of it". That reading fails P1 immediately — it is *reindexing*, not *erasure*,
and it has no dynamics. Two readings survive, and the estate should hold both:

- **The statics reading, and it has a citation.** The global object is a functor
  **`D : C → Cat`** — a *schema of schemas* — and the merge is the **Grothendieck construction
  `∫D`**; individual schemas are the **fibers `D(c)`**, recovered by pullback along `c : 1 → C`.
  Spivak states exactly this in §3.6 of *Functorial Data Migration*, calls it a **federated
  schema**, and develops it in **two paragraphs**. **[judgment] This is simultaneously the
  strongest validation the operator's thesis gets in this survey and the largest piece of
  unclaimed ground in it.** The estate would not be re-deriving; it would be picking up
  something the field named in 2012 and walked past.
- **The dynamics reading, and it is the one with theorems.** The global object describes an
  **interaction** over the store, and the schemas are what each *role* in that interaction has
  to know. That is the MPST/choreography reading (§1, §2), and it is why the operator's second
  clause ("which ones become hot") is not an afterthought: **heat is a property of a role's
  participation in an interaction**, and it is only definable once the global object is an
  interaction rather than a container.

The two readings are compatible and they meet at the same place: `∫D`'s fibers and `G ↾ p`'s
roles are both "what one participant of the universe sees". **[judgment] The estate does not
have to choose today** — but it must not use one word for both, and it must not assume a
theorem proved about one transfers to the other.

### 7.2 How the store's addresses interact with projection

Three concrete consequences, each stated so it can be argued with.

1. **Projection must be a function on addresses, and its functoriality is a theorem.**
   If `addr(G)` is a global description's address and `↾p` is projection, then `addr(G ↾ p)`
   is determined by `addr(G)` and `p` — so the store can hold a **derived-artifact edge**
   `(addr(G), p) ↦ addr(G↾p)`. Kickoff §7's input-addressed option (a derived result addressed
   by *recipe*) is exactly the right home for this: **a projected schema is an input-addressed
   derivation of a content-addressed global object.** The kickoff already parks this
   ("deliberately not v1"); §14's thesis is the reason it will be needed.
2. **Content-addressing gives projection something the literature does not have: a stable
   identity for "the same projection".** MPST/choreography projection is a partial function
   defined up to nothing in particular; two syntactically different global types can project
   to behaviourally equal locals, and no framework in §1–§2 can *say* that two projections are
   the same artifact. **[judgment] This is the estate's genuine contribution surface.** If
   `addr(G↾p)` is canonical, then "the same local artifact arises from two different global
   objects" becomes a *checkable, first-class fact* — which is precisely the sharing the merge
   operator is groping toward, and precisely what the store is for.
3. **Merge is a join, and the store is a join-semilattice.** §1.1's `⊓` (full merge) and the
   kickoff's E1 join-semilattice store are the same algebraic shape. **[judgment]** If E2's
   equivalence is compositional over the schema algebra (kickoff §4.3), then a merge operator
   on Schema Core is *derivable from the same table* — one clause per constructor. That is the
   cheapest possible route from E2's statics to a projection story, and it is worth a probe.
4. **Addressing a *presentation* is decidable where addressing the *thing presented* is not.**
   §3.3(4): the word problem for a finitely presented category is undecidable, and it is
   undecidable whether a presentation generates a finite category. But a presentation is finite
   syntax and hashes exactly. **[judgment] This is the single cleanest statement of what
   content-addressing buys the whole frame**, and it generalises the kickoff's existing
   posture: E2 already chose a *declared* equivalence over semantic equality, and the
   categorical literature supplies the theorem saying that choice was forced, not merely
   convenient. The estate should say plainly that `addr` is **finer than** categorical
   equivalence and that this is deliberate — the same sentence, one layer up, as kickoff §4.3's
   "widening the equivalence means a new scheme version".

### 7.3 The first G1-statable slice

**[judgment]** The smallest slice that is both honest and non-trivial, stated in the estate's
own gate language:

> **Define, in Lean 4, a lab-owned `GlobalDescription` over Schema Core with a finite set of
> roles, and a merge operator `⊓ : SchemaCore → SchemaCore → Option SchemaCore` given by one
> clause per constructor (the same table as kickoff §4.3's equivalence). Define
> `project : GlobalDescription → Role → Option SchemaCore` using `⊓` for the
> not-a-participant case. Prove three theorems:**
>
> - **T-A — `⊓` is a partial join.** Idempotent, commutative, associative where defined, on
>   Schema Core. (This is the merge lattice of §1.1, and it is the piece every branch of §7.4
>   needs.)
> - **T-B — projection is a function of addresses.** `addr(project G p)` is determined by
>   `addr(G)` and `p`: formally, `addr G₁ = addr G₂ → project G₁ p = project G₂ p`, and hence
>   `addr ∘ (project · p)` factors through `addr`. Call it **address–projection commutation**.
> - **T-C — projectability is decidable.** `Decidable (∃ L, project G p = some L)` for every
>   `G`, `p`, and the well-formedness judgment under which `project` is total is itself
>   decidable.

Why this slice and not a bigger one:

- It needs **no process calculus, no LTS, no coinduction, no Mathlib**. It is inductive
  structure over a carrier E2 is already building, plus the digest layer already landed in
  `formal/fips202`.
- **T-B states a theorem nobody in §1–§4 has stated**, because none of those frameworks has
  addresses — verified: CQL has no canonical identity for schemas (§3.6), MPST/CP projection is
  defined up to nothing in particular (§7.2.2). It is provable by the same finite case analysis
  as encoder injectivity (kickoff L1), and it is the estate's own contribution surface.
- **T-C is the shape §1.4 says "projection is correct" ought to have** — implementability as a
  decision problem, projection as witness extraction — at the smallest altitude where the
  estate can honestly state it.
- **T-A is falsifiable in a week.** If `⊓` on Schema Core is not associative, the estate learns
  that before committing to any of §7.4, not at H3.
- Together they discharge the §3.7(1) insight concretely: the estate is addressing
  *presentations*, decidably, precisely where the categorical literature proves the presented
  objects cannot be compared.

**What it explicitly does not claim:** nothing about processes, nothing about runtime, nothing
about session fidelity or deadlock freedom. Those are the theorems of §1/§2, they need a
semantics of *execution*, and the estate does not have one. **The slice above is a statement
about descriptions and their identities only** — which is the only altitude at which the estate
currently owns the definitions.

### 7.4 Defer-with-trigger

| Deferred | Trigger to revisit |
|---|---|
| **Depending on `leanprover/cslib`** | When (a) cslib cuts a release pinned to a toolchain ≥ the estate's floor **and** (b) `Mech/Choreography` upstreams *semantics + EPP*, not just syntax. Until then, **read it, do not require it.** The Mathlib requirement is the blocker, and it is not going away — cslib's own lakefile pins Mathlib by revision. |
| **Adopting Spivak's `Σ ⊣ Δ ⊣ Π`** | When the estate needs to *migrate entities between two schemas* and not merely address them. Until an actual migration is in scope, `Δ` alone (reindexing = composition) is all that is used, and `Δ` needs **no Kan extension machinery at all**. When `Σ` does arrive, it arrives **gated on étale/discrete-opfibration maps** (§3.2b Prop. 3.20, §3.3(2)) — never unrestricted. |
| **Formalising the migration adjunctions from scratch** | Never, on current evidence. The Coq precedent (`catdb`, ~2,100 lines, 8 holes, `Σ ⊣ Δ` unfinished, dead since 2013) is the calibration; the Mathlib route (`Functor.lanAdjunction` / `ranAdjunction`) is proved today. Revisit only if the `#print axioms` check in §3.4 fails. |
| **`Cat♯` / polynomial-functor carrier** | When aggregation (sum, group-by over the store) becomes a first-class requirement — the 2012 framework provably cannot express it. Until then the extra machinery (comonoids, bicomodules, retrofunctors, zero mechanisation) is not earned. |
| **Formalising sheaves / temporal type theory** | When the estate has a concrete instance of *local sections that agree pairwise but do not glue*. Until such an instance exists in the store, "P1 is a gluing failure" is vocabulary, not a proof obligation. Mathlib's `CategoryTheory.Sites` (71 files) is the escape hatch if it is ever needed **and** the Mathlib ban is lifted. |
| **Institutions** | Never, as a formalism. The **satisfaction condition** enters now, as a stated design law on lift/projection (§5.1). |
| **Quantitative global types (demand/heat)** | When §14's dynamics program produces a *demand semiring* candidate from `demand-provenance-survey.md`. At that point CAMP's Def. 4.5 / Thm 4.12 is the template to instantiate, and the estate would be **first to mechanise a quantitative multiparty global type** — a genuine, defensible novelty claim. |
| **Asynchrony** | When the store has an actual concurrent client. Mech scopes it out on purpose; every mechanised CP system except Kalas/Pirouette/Quick Change is synchronous. Do not pay for it early. |
| **Carrying a codec complement** | **This one should not be deferred long.** §4.0c already shows the Encoded view is lossy on non-structural checks, so the H2 coherence law the estate can currently prove is weaker than any law in §4's literature. Trigger: the first time H2 needs to *state* the round-trip law. The ruling is then binary and §4.4 shows there is no third option — **either the complement is a carrier field and enters the pre-image (kickoff L3), or it is quotiented and the equivalence table gains a clause (kickoff §4.3)**. Symmetric lenses pay for the second choice with an equivalence on complements that even *associativity of composition* needs. |
| **Typed errors vs the optic abstraction** | Rule now, not later: §4.5 shows they are mutually exclusive. Exposing `Error` pins the coend's residual and leaves the optic family; quantifying it buys the abstraction and loses the typed error. The estate wants typed errors — so **say that H2's codec is prism-*shaped* but not an optic**, rather than claiming optic status it does not have. |
| **A Lean 4 lens/optics dependency** | Do not take one. cslib PR #659 is open with **zero comments in two months**; `fraware/lean-optics` has **unproved prism laws and `Prop := True` traversal laws**; `janmasrovira/lean-lens` never instantiates its own class. If the estate wants lens laws in Lean 4, the **port target is Isabelle/AFP `Optics`** (`Lens_Laws` + `Lens_Algebra` + `Lens_Order` + `Prisms`, BSD) — the only place the *algebra* is actually proved — with `VCA-EPFL/leanses`' `mklenses` metaprogram as the generation layer under it. Read `Lysxia/profunctor-monad/coq/Promonad.v` first; it is small and it is the charter's own pin. |
| **Clarke, *The Grothendieck construction for delta lenses* (Higher Structures, 2026-06-19)** | Read it **before** ruling on §7.1's two-formalism split. It is the one live paper sitting exactly on the seam this survey identifies, and it is three months old. |

### 7.5 Honest gaps in this survey

- **The web-search budget for this session was exhausted at 200 calls partway through**
  (shared across the wave); the remainder was done by direct fetch, GitHub API, and Crossref.
  Sections 1, 2 and 6 rest on primary sources fetched and read in full on this host; sections 3
  and 4 rest on dedicated readers' primary reading, merged and cross-checked here; section 5's
  *negative* claim about institutions having no mechanisation checked two AFP topic listings
  and is **not exhaustively verified**.
- **Mech's artifact is unlocated.** arXiv v1 (16 Jul 2026) does not, as fetched, name a repo or
  Zenodo DOI, and the FORM-internal version is not public on GitHub under `fmontesi`. The
  ">40,000 lines" figure is the authors' claim, read from the paper, **not independently
  checked**.
- **Honda–Yoshida–Carbone JACM 2016 was not fetched directly** (paywall); its projection and
  merge definitions here are read from Scalas–Yoshida's verbatim restatement (Fig. 3), which is
  a hostile-witness source and therefore *more* reliable for this purpose, but is still second
  hand.
- **No Lean 4 *session-type* work was found.** cslib has none (repo-scoped issue/PR search for
  `session`: `total_count: 0`), and no other Lean 4 session-type repo surfaced. Note the search
  index is word-based, so this is "absent from the obvious places", not "proved absent" —
  the same query for `choreograph` also returned 0 even though PR #769 *"Choreographies"* is
  merged, which is exactly the failure mode to be careful of. Lean 4 **choreography** work,
  by contrast, is confirmed and active.
- **`Beneficial-AI-Foundation/cslib-protocols-lean_experimental`** (created 2026-02-28, last
  push **2026-03-01**, 1 star) advertises "proposing _protocols_ … to cslib infrastructure" —
  **inspected: it is about *cryptographic* protocols** (`Crypto.lean`, `Crypto/`), not
  session/communication protocols. Not relevant, and effectively abandoned after two days.
- **Thread 4 carried a correction, and it is worth naming.** The dispatch (and this reader's
  first draft) both stated that *delta lenses correspond to split opfibrations*. **That is
  backwards.** Johnson–Rosebrugh's *Delta lenses and opfibrations* (ECEASST 57, 2013) exists to
  say so: **c-lenses = split opfibrations, and c-lenses are a strict, non-full subcategory of
  delta lenses.** Every DOI in §4 was resolved through `api.crossref.org` on this host; the
  primary texts were read by the dedicated thread-4 reader.
- **Carried forward from the thread-4 reader as unverified:** Lechtenbörger's PODS 2003 primary
  text (the reversibility ⟺ constant-complement biconditional is reported *verbatim by
  Johnson–Rosebrugh*, but his own hypotheses were not checked); Hegner's AMAI 40 (2004) theorem
  statement (taken from Foster et al. §10, not from Hegner); Keller's actual arguments (titles
  and DOIs only); Bancilhon–Spyratos Thm 4.2's `s ≠ s'` hypothesis (reconstructed from an
  OCR'd scan, high confidence, not literally read); *"Lenses in Isabelle/UTP"* — **no venue
  found, do not cite it**; BiGUL's Bitbucket repo state; and the Mathlib4 negative
  (no `Lens`/`Prism`/`Optic`/`Traversal`) which was inferred, not grepped.
- **`fraware/lean-optics` provenance is unknown.** Its README register plus the
  `Prop := True` traversal laws are consistent with LLM-generated code. The code contents were
  verified directly (0 `sorry`, 0 `axiom`, the `True` laws are real); the authorship was not.
  **Do not cite it as "verified optics".**
- **From the thread-3 reader, carried forward unresolved:** the term *"uber-flower"* appears
  **nowhere** in Spivak–Wisnesky arXiv:1212.5303 (grepped, zero hits); it belongs to
  Schultz–Wisnesky, *Algebraic Data Integration*, JFP 27, 2017,
  [doi:10.1017/S0956796817000168](https://doi.org/10.1017/S0956796817000168), arXiv:1503.03571,
  and *Algebraic Databases* §9.8 uses **"uber-query"** instead. Fix the term before citing it.
  Also unverified: whether any Isabelle/AFP entry contains Kan extensions *at file level* (only
  titles/blurbs were checked), the contents of `agda-categories/src/Categories/Kan.agda`, and
  **Mathlib's axiom profile** — run `#print axioms CategoryTheory.Functor.lanAdjunction`
  locally before relying on §3.4's conclusion.
