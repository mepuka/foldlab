# The counterexample algebra: negative information and the refusal machinery

FROM OPERATOR-DIRECTED RESEARCH

Author: counterexample-algebra lane (Opus), 2026-08-14, isolated worktree.
Research only — no machinery. Consumer-gated to tickets 003 (the concierge),
015 (the grammar foundry), and 016 (the ontology explorer). Sibling lane:
`docs/design/2026-08-14-the-language-surface.md` (branch
`worktree-agent-a6fdcad180ebc5ae0`), whose repair loop this dossier grades.

Discipline: every literature claim carries author/year/venue and was checked
against a live source this session; every repository claim carries file:line.
Theorems are stated with their actual hypotheses. Where the correspondence to
foldlab is exact it is proved; where it is an analogy it is labelled one.

Two label vocabularies are used and kept separate.

**Correspondence strength** — how tight is the map from the literature to
foldlab: **EXACT** (the definitions coincide under a stated translation),
**STRUCTURAL** (the algebra is the same; the semantics differ in a named way),
**ANALOGY** (rhetorically useful, not load-bearing).

**Build state** — following the unified fold's convention: **SHIPPED** (walled
or tested in-repo), **RATIFIED-UNBUILT**, **ASPIRATIONAL**.

---

## 0. The one-paragraph verdict

The operator's conjecture is **right about which datum carries the information
and wrong about why**. Under a pinned grammar digest, the certifier is a total
deterministic function, so its accept-set and its refuse-set are *equally*
permanent and *equally* unbounded — persistence is symmetric, and "negatives
grow, positives don't" is false as stated. The real asymmetry is Gold's, and it
is directional: **a positive example can only refute a hypothesis that is too
small; a negative example can only refute a hypothesis that is too large**, and
over-generality is the failure mode a language model actually has and cannot
exit from certificates alone. Layered on top of that is a second asymmetry that
is foldlab's own and stronger: a certificate is an existential fact about one
term, whereas a **typed** refusal names a law and a path, and a law is a
universally quantified sentence — so one typed refusal refutes a *class*. That
is precisely the version-space `G`-boundary refinement, and foldlab's certifier
hands it over already computed instead of making a learner search for it. The
gap between that and the operator's picture is not conceptual, it is
infrastructural: **foldlab does not currently persist a single refusal
anywhere.** Refusals are ephemeral reply values (`proto/go/protod/refusal.go:33`).
The monotone, federated, content-addressed refusal corpus that the conjecture
is really about is ASPIRATIONAL, and the sibling lane's `flb.certification.v0
Refused` record is the one missing piece.

---

# PART 1 — THE LITERATURE

## 1.1 Gold 1967: identification in the limit, and why text does not suffice

E. M. Gold, "Language identification in the limit," *Information and Control*
10(5):447–474, 1967.

**The protocol.** A learner receives an infinite presentation of a target
language `L` drawn from a known class `C`, and after each datum emits a guess.
It *identifies `L` in the limit* if there is a finite point after which every
guess is the same correct index. Two presentation regimes:

- **Text** (positive presentation): an enumeration of exactly the strings of
  `L`, every member eventually appearing, and nothing else.
- **Informant** (complete presentation): an enumeration of *all* strings over
  the alphabet, each labelled in-`L` or not-in-`L`.

**The theorem (the negative half).** A class is *superfinite* if it contains
every finite language over the alphabet plus at least one infinite language.
**No superfinite class is identifiable in the limit from text.** The stronger
form usually quoted: if a class contains an infinite ascending chain
`L₁ ⊊ L₂ ⊊ ⋯` together with `L_∞ = ⋃ₙ Lₙ`, it is not identifiable from text.

Since the regular languages are superfinite, **the regular languages are not
identifiable in the limit from positive data alone** — this is not a subtlety
about exotic classes; it bites at the very bottom of the Chomsky hierarchy.

**The theorem (the positive half).** From an *informant*, identification in the
limit succeeds for regular, context-free, context-sensitive, primitive
recursive, and recursive/recursively-enumerable classes. From text, only the
finite classes.

**The mechanism, which is the part that matters here.** The proof of the
negative half is an over-generalisation trap. A text for `Lₙ` is also a legal
prefix of a text for `L_∞`. A learner that ever conjectures `L_∞` while the
target is `Lₙ` can never be refuted, because **every datum consistent with the
target is also consistent with the over-general hypothesis**. Positive data has
no way to say "and not that." Negative data does, and it is the only thing in
the protocol that does.

## 1.2 Angluin 1980: the exact characterisation (tell-tales)

Dana Angluin, "Inductive inference of formal languages from positive data,"
*Information and Control* 45(2):117–135, 1980.

**Theorem.** An indexed family of non-empty recursive languages
`C = {L₁, L₂, …}` is identifiable in the limit from positive data **iff** every
`Lᵢ ∈ C` has a finite *tell-tale* `Tᵢ ⊆ Lᵢ` such that for every `j`, if
`Tᵢ ⊆ L_j` then `L_j ⊄ Lᵢ` (i.e. `L_j` is not a **proper subset** of `Lᵢ`).
For effective learners the tell-tales must additionally be uniformly
enumerable.

Read the quantifier carefully: the tell-tale is a finite *positive* witness set
that **pins a language against its proper sublanguages**. This is the exact
statement of the asymmetry. Positive data protects you against being too
specific; nothing in positive data protects you against being too general. In a
superfinite class, `Σ*` has no finite tell-tale — every finite `T ⊆ Σ*` sits
inside some finite `L_j ⊊ Σ*` — which is Gold's counterexample recovered as a
corollary. Angluin's positive contribution in the same paper is the *pattern
languages*, a non-trivial class that does satisfy the condition and therefore
*is* learnable from text.

## 1.3 Angluin 1987: L*, and the counterexample as the engine

Dana Angluin, "Learning regular sets from queries and counterexamples,"
*Information and Computation* 75(2):87–106, 1987.

**The teacher.** A *minimally adequate teacher* (MAT) answers two query kinds:
a **membership query** ("is `w ∈ L`?") returning yes/no, and an **equivalence
query** ("does hypothesis DFA `H` accept exactly `L`?") returning yes, or **no
plus a counterexample** — a string in the symmetric difference `L △ L(H)`.

**The theorem.** L* identifies any regular set from a MAT in time polynomial in
`n`, the number of states of the minimum DFA for `L`, and `m`, the maximum
length of any counterexample the teacher returns.

**The bounds.** At most `n` equivalence queries suffice, because each negative
answer strictly increases the number of distinguished states of the hypothesis
and that count is bounded by `n`; filling the observation table costs
`O(n(n + n|Σ|))` membership queries at fixed table size. The total membership
count is usually quoted as `O(|Σ| m n²)`, the extra `m` arising because a
counterexample of length `m` contributes its prefixes (in Angluin's original
formulation) as new table rows. Treat the `O(|Σ| m n²)` form as the textbook
consolidation rather than a verbatim quotation; the two bounds actually sourced
here are the `≤ n` equivalence queries and the table-filling count.

**Why the counterexample is load-bearing.** Membership queries alone cannot
identify a regular set — they explore, but nothing forces the hypothesis to be
*complete*. The equivalence query is where the teacher's superior knowledge
enters, and it enters **only as a counterexample**. Each counterexample is a
point where the learner's language and the target disagree; incorporating it
splits at least one state. The number of equivalence queries is therefore
bounded by the state count: **counterexamples are the only monotone progress
measure in the algorithm**.

**Successors.** Kearns & Vazirani, *An Introduction to Computational Learning
Theory*, MIT Press 1994, ch. 8 ("Learning Finite Automata by Experimentation"),
replaces the observation table with a **discrimination tree**, dropping the
membership-query count. Isberner, Howar & Steffen, "The TTT algorithm: a
redundancy-free approach to active automata learning," RV 2014 (LNCS 8734,
307–322), analyses counterexamples to extract only the single refining suffix,
achieving optimal (linear) space and remaining efficient when counterexamples
are pathologically long — which is the practical situation when the "teacher"
is a running system rather than a mathematician. Isberner & Steffen, "An
abstract framework for counterexample analysis in active automata learning"
(PMLR 34, 2014) generalises the counterexample-decomposition step itself.

## 1.4 CEGIS and CEGAR: the counterexample loop in verification and synthesis

**CEGIS.** Solar-Lezama, Tancau, Bodík, Seshia & Saraswat, "Combinatorial
sketching for finite programs," *ASPLOS 2006*, 404–415 (the Sketch system).

The synthesis problem is a doubly-quantified formula

> `∃ h ∈ H. ∀ x ∈ X. Φ(h, x)`

which is intractable directly. CEGIS decomposes it into an alternation over a
**finite, monotonically growing** set `S ⊆ X` of counterexample inputs:

1. **Synthesise / learn.** Find `h` with `∀ x ∈ S. Φ(h, x)` — a finite
   constraint system, discharged by a solver (or, in the modern variant, by a
   language model).
2. **Verify.** Ask `∀ x ∈ X. Φ(h, x)`. If yes, done. If no, the verifier
   returns a concrete `x₀` with `¬Φ(h, x₀)`.
3. `S ← S ∪ {x₀}`; go to 1.

**Monotone growth is the whole trick.** `S` only ever grows; each new element
strictly rules out the candidate that produced it (and everything else that
fails at `x₀`), so no candidate is ever proposed twice, and the surviving
hypothesis set shrinks antitonely in `S`.

**Termination.** Guaranteed when the candidate space `H` is finite (the Sketch
setting: bounded holes over bounded types) — each round eliminates at least one
candidate. Over infinite `H` or infinite `X`, termination requires an
additional argument: a compactness/covering property such that each
non-redundant counterexample prunes a fixed volume of hypothesis space. Absent
such an argument, **CEGIS may loop forever**, and no general convergence
theorem is available.

**CEGAR**, the verification-side twin: Clarke, Grumberg, Jha, Lu & Veith,
"Counterexample-guided abstraction refinement," *CAV 2000*, LNCS 1855, 154–169
(journal version: *JACM* 50(5):752–794, 2003). Model-check an abstraction; if
it reports a counterexample, test whether the counterexample is *spurious*
(has no concrete pre-image); if spurious, refine the abstraction to eliminate
it and repeat. The abstraction sequence is monotone in precision. Same shape,
opposite polarity: CEGIS grows a constraint set until the candidate is right;
CEGAR grows a precision until the abstraction is right.

## 1.5 Version spaces: Mitchell's lattice, the algebra, the Galois connection

**Mitchell.** Tom M. Mitchell, "Generalization as search," *Artificial
Intelligence* 18(2):203–226, 1982.

Generalisation is search through a hypothesis space partially ordered by
*more-general-than*. The **version space** `VS(D)` is the set of hypotheses
consistent with the observed data `D`. Because the order is a partial order and
consistency is convex with respect to it, `VS(D)` is exactly represented by two
boundary sets:

- **`S`** — the maximally *specific* consistent hypotheses,
- **`G`** — the maximally *general* consistent hypotheses,

and `VS(D) = { h : ∃ s ∈ S, g ∈ G. s ≤ h ≤ g }`. The **candidate-elimination**
algorithm maintains both: **a positive example generalises `S` upward** (any
`s` that excludes it must be minimally relaxed); **a negative example
specialises `G` downward** (any `g` that admits it must be minimally
restricted). Termination is `|S| = |G| = 1`; collapse to `VS = ∅` means the
data is inconsistent with the hypothesis language.

**Version space algebra.** Lau, Wolfman, Domingos & Weld, "Programming by
demonstration using version space algebra," *Machine Learning* 53(1–2):111–156,
2003 (see also Lau, Domingos & Weld, ICML 2000, on the algebra itself). The
contribution is compositional: extend version spaces from concepts to
*functions*, then compose simple version spaces into complex ones by algebraic
operators — **union**, **join** (a cross-product-with-consistency-filter), and
**transform** — so that a large program space is represented in polynomial
space and updated compositionally. Implemented in **SMARTedit**, which learns
repetitive text-editing programs and generalises correctly from one or two
demonstrations.

**The Galois connection, stated properly.** The clean lattice-theoretic
statement lives in formal concept analysis (Ganter & Wille, *Formal Concept
Analysis: Mathematical Foundations*, Springer 1999). For a context `(G, M, I)`
of objects `G`, attributes `M`, incidence `I`, the derivation operators

> `A′ = { m ∈ M : ∀ g ∈ A. (g,m) ∈ I }`  for `A ⊆ G`
> `B′ = { g ∈ G : ∀ m ∈ B. (g,m) ∈ I }`  for `B ⊆ M`

form an **antitone Galois connection**: `B ⊆ A′ ⇔ A ⊆ B′`, and each is
order-reversing (`A₁ ⊆ A₂ ⇒ A₂′ ⊆ A₁′`). The composites `A ↦ A″` and
`B ↦ B″` are closure operators (extensive, monotone, idempotent).

Specialised to learning: `Examples` ordered by `⊆` sits opposite `Hypotheses`
ordered by `⊇`, and `D ↦ VS(D)` is antitone — **more data, fewer surviving
hypotheses**. This is the formal content of "the version space narrows."
Crucially it is antitone in `D` *regardless of the sign of the examples*:
positives and negatives both shrink `VS`. **Monotone accumulation is not what
distinguishes negatives** — see §2.1.

## 1.6 Attribute exploration: counterexample-driven completion of a theory

Ganter & Obiedkov, *Conceptual Exploration*, Springer 2016 (the textbook
treatment); the canonical basis is Guigues & Duquenne, "Familles minimales
d'implications informatives résultant d'un tableau de données binaires,"
*Mathématiques et Sciences Humaines* 95:5–18, 1986.

**The protocol.** The system maintains an implication set `L` (accepted rules
`A → B` over attributes) and a counterexample set `K` (objects). It repeatedly
proposes an implication `A → A″` and asks a domain expert: *does this hold?*

- **Yes** → the implication joins `L`.
- **No** → the expert must supply a **counterexample object** — one that has
  all of `A` and lacks something in `A″`. It joins `K`.

**The completeness guarantee.** At termination, `L` is *complete* for the
domain: every implication valid in the domain follows from `L` by Armstrong's
rules, and an implication follows from `L` iff it is refuted by no member of
`K`. The exploration terminates having *characterised* the theory, not merely
sampled it.

**Why no question is redundant.** The proposed premises are the **pseudo-intents**
of the evolving context, enumerated in the *next-closure* order. A pseudo-intent
`P` is by construction *closed under the implications already accepted* — so
the question `P → P″` is **never entailed by `L`**, and answering it always
strictly increases information. The resulting implication set
`{ P → P″ \ P : P pseudo-intent }` is the **Duquenne–Guigues (canonical /
stem) basis**: complete, non-redundant, and of **minimum cardinality** among
all complete implication bases.

**The honest cost.** Whether pseudo-intents can be recognised in polynomial time
is open; the basis can be exponential in `|M|`; deciding the next question is
coNP-hard. Ticket 016 already prices this in — the budget is contract and
overflow is a typed refusal carrying the still-sound partial basis
(`docs/map/tickets/016-the-ontology-explorer.md:25-29`).

**The query-learning connection is published, not folklore.** Konev, Lutz,
Ozaki & Wolter, "Exact learning of lightweight description logic ontologies,"
*JMLR* 18(201):1–63, 2018, studies ontology learning directly in Angluin's
exact-learning model with membership and equivalence queries, and separates
DL-Lite-shaped fragments (polynomially learnable) from `EL` (not). Marta Arias
& José L. Balcázar have the propositional line (canonical Horn formulas, and
"Learning definite Horn formulas from closure queries," *TCS* 2015): Horn
theories are polynomial-time learnable with membership + equivalence queries.
Ozaki and co-authors also connect exact learning to test theory, where
attributes correspond to membership queries and exact learning adds equivalence
queries. **The reduction to internalise:** attribute exploration's expert
question *is* an equivalence query restricted to implications, and the expert's
counterexample *is* the counterexample of the MAT protocol. Ticket 016's
"two task verbs, theorem-forced (Konev–Lutz–Ozaki–Wolter): membership and
equivalence — neither alone suffices"
(`docs/map/tickets/016-the-ontology-explorer.md:30-34`) is a correct reading of
that literature.

## 1.7 The modern LLM-era thread: what is actually established

**Grammar-constrained decoding.** Geng, Josifoski, Peyrard & West,
"Grammar-constrained decoding for structured NLP tasks without finetuning,"
*EMNLP 2023*, 10932–10952. Masking the sampler with a formal grammar guarantees
the output parses. **Established: syntactic validity. Not established: quality.**

**And its cost.** Park, Wang, Berg-Kirkpatrick, Polikarpova & D'Antoni,
"Grammar-aligned decoding," *NeurIPS 2024*. Constrained decoding **distorts the
model's learned distribution**: outputs are grammatical but appear with
likelihoods not proportional to the LLM's own, so grammaticality is bought with
quality. The paper formalises *grammar-aligned decoding* (grammatical **and**
unbiased) and gives ASAp, an adaptive-sampling algorithm approximating it. This
is already in foldlab's ledger as a stated limitation
(ticket 015 item 6, `docs/map/tickets/015-the-grammar-foundry.md:49-51`).

**Verify-then-select.** Ni, Iyer, Radev, Stoyanov, Yih, Wang & Lin, "LEVER:
learning to verify language-to-code generation with execution," *ICML 2023*
(PMLR 202) — train a verifier on (NL input, program, execution result) and
rerank; 4.6–10.9 point gains over code-davinci-002 across table-QA, math-QA and
Python. Chen, Zhang, Nguyen, Zan, Lin, Lou & Chen, "CodeT: code generation with
generated tests," *ICLR 2023* — have the model generate its own tests, then use
agreement between solution clusters and test clusters to select; HumanEval
pass@1 65.8% (+18.8 absolute). Both are **selection over a sampled pool**, not
a refinement loop: they use the verifier's signal to *choose*, not to *repair*.

**Self-repair, and the honest ceiling.** Olausson, Inala, Wang, Gao &
Solar-Lezama, "Is self-repair a silver bullet for code generation?," *ICLR
2024* (arXiv:2306.09896). When repair cost is accounted for, gains are modest,
highly variable across data subsets, and sometimes absent. The bottleneck is
identified as **the quality of the feedback**: substituting a stronger model's
feedback produces substantially larger gains, and human feedback beats every
self-generated variant. GPT-4 benefits; GPT-3.5 often does not improve or
degrades.

> This is the single most important empirical result for foldlab's thesis, and
> it cuts *for* the design: the repair loop's yield is a function of feedback
> quality, and foldlab's proposition is that a certifier emitting a law name, a
> path, a `got`/`expected` pair and a directly-acceptable `example`
> (`proto/SPEC.md:53-56`) is strictly higher-quality feedback than a model's
> own commentary on its own output. **The claim is testable with Olausson's own
> methodology, and nobody has run it.** That is the falsifiable benchmark
> ticket 015 already asks for
> (`docs/map/tickets/015-the-grammar-foundry.md:26-30`).

**LLM-as-proposer inside CEGIS.** The strongest published examples:

- Jha, Jha & Pujari (and successors), "Neuro-symbolic reasoning for planning:
  counterexample-guided inductive synthesis using large language models and
  satisfiability solving," arXiv:2309.16436 — the LLM occupies the *learner*
  slot of the classical CEGIS architecture, with a SAT/SMT verifier producing
  counterexamples, yielding formally verified plans.
- Pereira et al., "Property-guided LLM program synthesis for planning,"
  arXiv:2605.16142 — LLM synthesiser, property checker as verifier, concrete
  counterexamples fed back as repair guidance. Explicitly notes that CEGIS has
  seen little use with LLMs despite underpinning classical synthesis.
- Vatsa, Shome, Zhou & Eiers, "AutoCedar: an agentic framework for
  verifier-guided access control policy synthesis," arXiv:2607.03656 (July
  2026) — decomposes authoring into small reviewed "intent atoms", then runs
  model-proposes / verifier-checks / failure-becomes-repair-signal, converging
  on all 221 tasks of their CedarBench.

**Established vs hype.** Established: (i) a sound verifier in the loop raises
the *admissible* output rate, and this is a property of the verifier, not the
model; (ii) grammar constraints guarantee syntax at a measured distributional
cost; (iii) feedback quality dominates repair yield. **Not established, and
frequently implied:** that an LLM proposer *converges*. Classical CEGIS
convergence rests on the learner being consistent with the accumulated
constraint set by construction — a solver cannot re-propose a refuted
candidate. **An LLM has no such property.** It reads counterexamples as tokens,
maintains no symbolic version space, and can re-propose a previously refuted
candidate at any temperature. Every published LLM-CEGIS convergence claim is
empirical over a benchmark, never a theorem.

## 1.8 The negative-information asymmetry in grammar induction

**RPNI.** Oncina & García, "Inferring regular languages in polynomial update
time," in *Pattern Recognition and Image Analysis*, World Scientific 1992,
49–61. Given a sample split into positives `S⁺` and negatives `S⁻`, RPNI builds
the prefix-tree acceptor of `S⁺` and greedily merges states in a fixed order,
**rejecting any merge that would make some `w ∈ S⁻` accepted**. Polynomial in
`|S⁺| + |S⁻|`.

Read what `S⁻` does there: it does nothing at all to build the hypothesis. It
exists *only* to veto merges. **The positives determine the search space; the
negatives determine where the search stops.** Without `S⁻` the greedy merge
runs to the universal automaton — Gold's over-generalisation trap, as an
algorithm.

**Characteristic samples.** de la Higuera, "Characteristic sets for polynomial
grammatical inference," *Machine Learning* 27(2):125–138, 1997. For each
regular `L` there is a finite characteristic set `CS(L) = S⁺ ∪ S⁻`, of size
polynomial in the minimal DFA, such that **any** training sample containing
`CS(L)` drives RPNI to output a DFA equivalent to `L`. This converts Gold's
limiting result into a finite, quantitative one: *this many* labelled examples,
and identification is exact. There is no such theorem for positive-only samples
over the regular class, and by §1.2 there cannot be.

**Summary of Part 1 in one line.** Across four independent literatures —
identification in the limit, query learning, grammatical inference by state
merging, and inductive synthesis — the negative datum plays the same role and
it is always the same role: **it is the only datum that can refute an
over-general hypothesis, and it is therefore the only monotone progress measure
available.**

---

# PART 2 — THE CORRESPONDENCE

## 2.a A typed refusal is a labelled counterexample — and the asymmetry, stated correctly

### The refusal, typed

The Go daemon's refusal is a record, not an exception
(`proto/go/protod/refusal.go:33-42`):

```go
type Refusal struct {
	Kind     string     `json:"kind"`
	Law      string     `json:"law"`
	Path     []string   `json:"path,omitempty"`
	Got      any        `json:"got,omitempty"`
	Expected any        `json:"expected,omitempty"`
	Example  any        `json:"example,omitempty"`
	Next     []NextHint `json:"next"`
	Local    bool       `json:"local"`
}
```

The TS mirror is `proto/ts/src/wire.ts:24-34`. The contract that forces the
payload is W7 (`proto/SPEC.md:53-56`): every refusal carries "the law sentence
that refused, `path`/`got`/`expected`/`example` where applicable, and `next`
hints sufficient for self-repair without external docs." W8
(`proto/SPEC.md:57-59`) makes it data rather than control flow: "nothing throws
across the seam."

**Translation to the MAT protocol** (§1.3). Under a pinned grammar digest `g`
and catalog head `h`, define the language `L_{g,h} = { b ∈ Bytes :
certify_{g,h}(b) = Certificate }`. A client submitting bytes `b` is issuing a
**membership query**; the daemon's reply is the label. When the client submits
`b` believing it admissible and receives a refusal, that reply is a
**counterexample in the symmetric difference `L_{g,h} △ L_model`**, where
`L_model` is the model's implicit hypothesis. This is exactly ticket 015's
already-ratified theorem obligation: "the concierge is a minimally adequate
teacher for the grammar universe (frontier decides membership; every refusal is
a counterexample in the symmetric difference)"
(`docs/map/tickets/015-the-grammar-foundry.md:26-30`).

**Verdict on "a typed refusal IS a labelled counterexample": EXACT.** The
translation is definitional, and the repository's own contract already carries
the missing piece a bare counterexample lacks (the label, `Law`) and the locus
(`Path`).

**One honest caveat on the MAT claim itself.** A MAT answers *equivalence*
queries, and the concierge answers no equivalence query — there is no verb that
asks "is my model of the grammar the grammar?" The client can only ask
membership, one term at a time. Ticket 015's theorem obligation is therefore
**not yet dischargeable as stated**; what the concierge is today is a
*membership oracle plus a hint channel*, and by §1.3 membership alone does not
identify a regular set. See §2.d for where the equivalence query actually
exists in the estate (it exists — in ticket 016).

### The asymmetry, worked out honestly

Fix a grammar digest `g` and a catalog head `h`.

**Claim A (persistence is symmetric — the conjecture as stated is false).**
`certify_{g,h}` is a total deterministic function of `(candidate bytes, grammar,
catalog head)` — the sibling lane derives this from C1's byte-identical-reply
law (`proto/wire/CONTRACT.md:70-73`) and states it in its sort table. Therefore
its accept-set `A_{g,h}` and refuse-set `R_{g,h}` partition `Bytes`, both are
determined the moment `(g,h)` is pinned, and both are permanent: re-asking is
guaranteed to give the same answer forever, at that pin. Both are infinite in
general (there are infinitely many well-formed `flb.type.v0` terms and
infinitely many malformed byte strings). **A positive certificate is exactly as
permanent, and exactly as unboundedly extensible, as a refusal.** The operator's
"negatives can grow unbounded but not positives" does not hold under a pinned
grammar.

**Claim B (Gold's asymmetry — the real one).** The asymmetry is not a property
of the certifier's outputs; it is a property of what each output *rules out* in
the space of hypotheses about the grammar. Let `H` be a hypothesis language over
the same alphabet and `L = L_{g,h}` the target.

> A positive datum `b ∈ L` refutes `H` **iff** `b ∉ H` — i.e. only if `H` is too
> *small* somewhere.
> A negative datum `b ∉ L` refutes `H` **iff** `b ∈ H` — i.e. only if `H` is too
> *large* somewhere.
> Hence if `H ⊋ L`, **no positive datum whatsoever can refute `H`**; if `H ⊊ L`,
> no negative datum can.

That is Gold's mechanism (§1.1) in two lines, and Angluin's tell-tale theorem
(§1.2) is the exact characterisation of when the second failure mode is
recoverable from text: precisely when every language in the class carries a
finite positive witness set pinning it against its **proper sublanguages**.

**Claim C (the specialisation to LLM proposers, which is where the asymmetry
becomes load-bearing).** An LLM's hypothesis about `flb.type.v0` is not an
arbitrary language. It is systematically **over-general**: the model has seen
enormous quantities of JSON, of JSON Schema, of protobuf, of TypeScript type
literals, and its prior is a much larger language of which `flb.type.v0` is a
small sublanguage. The characteristic error is a term that is JSON-shaped,
plausible, adjacent-to-legal, and *not in the declared grammar* — an extra
field, an undeclared check name, a `k` that exists in a neighbouring schema
language. By Claim B, **certificates cannot correct an over-general model.** A
stream of successes is fully consistent with the model believing the grammar is
ten times larger than it is; the moment it reaches for the part it invented, it
fails, and it had no way to know. The refusal is the only reply in the system
that carries "and not that."

**Claim D (foldlab's own asymmetry, which is stronger than Gold's and is not in
the literature).** A certificate is an **existential** fact: these bytes are in
`L`. It bounds `L` from below at one point. A **typed** refusal is a
**universal** fact: it names `Law`, and by W7 a law is a *sentence* over the
grammar, not a property of one term. `Path` says where the sentence was
violated. Together they refute not `{b}` but the whole class

> `{ b′ : b′ violates Law at Path }`

in one reply. In version-space terms (§1.5) a negative example obliges the
learner to **specialise `G`**, and the hard part of candidate elimination is
*finding the minimal specialisation* — searching the refinement lattice for
which restriction to apply. **foldlab's certifier hands over the refinement
already computed.** `(Law, Path)` *is* the `G`-boundary refinement step; `Got`
and `Expected` bound it; `Example` supplies a witness that the refined boundary
is non-empty. That last point is not decoration: it is what stops the
version-space collapse (§3.3).

So the honest summary the operator asked for:

> **THE ASYMMETRY.** Under a pinned grammar digest, refusals and certificates
> are equally permanent, equally recomputable, and equally unbounded —
> *persistence is symmetric, and the conjecture is false if read that way.* The
> asymmetry is Gold's and it is **directional**: a positive example can only
> refute a hypothesis that is too small, a negative example can only refute one
> that is too large, and an LLM's error mode is over-generality — so
> certificates are structurally incapable of correcting it while refusals are
> structurally the only thing that can. Layered on that is foldlab's own,
> sharper asymmetry: a certificate is an existential fact about one term, while
> a **typed** refusal is a universal fact — it names a law, and a law quantifies
> over the grammar — so one typed refusal refutes a class. The typing, not the
> negativity, is what makes foldlab's counterexamples worth more than the
> literature's.

**A corollary the code does not yet know.** Claim A held `(g, h)` fixed. Vary
`h`. Catalog growth is monotone (README:57-61, "presence of evidence is
monotone (append-only journals only grow)"). Under that growth:

- A **structural** refusal — the walk rejecting a malformed or ill-kinded term
  (`proto/go/protod/walk.go`, kinds `malformed`, `invalid-structure`,
  `bad-cursor`, `unknown-request` at `refusal.go:9-19`) — depends on the term
  and the grammar only. It is **stable under catalog growth: once refused,
  always refused, at every later head.** It is *monotone evidence*.
- An **absence** refusal — `unknown-ref`, `unknown-identity`, `unknown-journal`
  (`refusal.go:9-19`) — is a claim that a digest is *not yet present*. Catalog
  growth **repeals** it. It is not evidence; it is the *absence* sort, which
  the README itself says "can go stale" and routes through a CAS
  (README:57-61).

**Finding (sharp, unrecorded).** `refusal.go`'s nine kinds straddle foldlab's
own evidence/absence line, and nothing in the code or the docs marks the split.
Only the structural kinds can seed a monotone, federating refusal corpus; the
absence kinds must not, because they are precisely the ones a later head
falsifies. Ticket 016 already ratified the correct sort mapping for its own
domain — "a counterexample is monotone evidence (grow-only journal,
plain-check admissible, federates); an accepted implication is an absence claim
that can rot" (`docs/map/tickets/016-the-ontology-explorer.md:35-42`) — and the
same mapping needs to be applied one level down, to the daemon's refusal kinds
themselves, before any corpus is built on top of them. Build state:
**ASPIRATIONAL** (nothing exists), and this is a design obligation, not a bug.

## 2.b The refusal stream as a semilattice fold, and the version-space question

**The algebra.** Refusal sets under union form a **join-semilattice**: `∪` is
associative, commutative, idempotent, with `∅` as identity, and the induced
order is `⊆`. A fold with this as its monoid is monotone in its input and
order-insensitive, which is precisely the licence foldlab's fold algebra
requires: `defineFold` demands identity and associativity and generates the
property suite (`packages/core/src/algebra.ts:192-198` for the `Algebra`
interface; `packages/core/src/foldLaws.ts:154-177` for the identity and
associativity properties; the third-homomorphism split wall at `:196-200`).

**And it already exists.** `packages/core/src/algebra.ts:390-399` declares
`setUnion` with semantics `sorted-unique-unicode-strings-utf16`, normalising via
`normalizeSet` at `:340`, exported in the registry at `:412`. A refusal corpus
folded as a set of refusal digests is **not a new algebra** — it is `setUnion`
with a canonical encoding of `(Law, Path, candidate digest, grammar digest)` as
the element type.

**Finding.** The word *semilattice* appears nowhere in the repository — not in
code, not in docs. `setUnion`, `max`, `min`, `any`, `all` are all in fact
idempotent and commutative, but the generated law suite checks only identity and
associativity (`foldLaws.ts:154-177`). **Idempotence and commutativity are
unchecked properties of five of the seven declared primitives**, and they are
exactly the two properties that buy coordination-free merge (§2.f). Adding them
to the generated suite is cheap and it converts an accident into a licence.
Build state: **SHIPPED** for the monoid, **ASPIRATIONAL** for the semilattice
claim.

**The Galois half.** By §1.5, if `R` is the accumulated refusal set and
`VS(R) = { H : ∀ (b, ¬) ∈ R. b ∉ H }` the set of hypotheses consistent with it,
then `R ↦ VS(R)` is antitone: `R₁ ⊆ R₂ ⇒ VS(R₂) ⊆ VS(R₁)`. Growing refusals,
shrinking candidate space. This is a theorem about the *induced* structure, and
it is true. **Verdict: STRUCTURAL** — the algebra is exactly right; what is
missing is that foldlab never materialises `VS`, so the narrowing is not
observable anywhere in the system.

**The `S`-boundary question, checked against ticket 003's laws — and refuted.**
The mission asks whether the concierge's frontier is literally a version-space
`S`-boundary. It is not, and the reason is in the code:

```go
func (d *Daemon) buildFrontier(holes [][]string) []frontierEntry {
	refs := d.catalog.resolvableDigests(frontierRefLimit)
	legal := frontierChoices(refs)
	frontier := make([]frontierEntry, len(holes))
	for index, path := range holes {
		frontier[index] = frontierEntry{ Path: frozenPath(path), Legal: legal, Refs: ... }
```
(`proto/go/protod/concierge.go:124-136`)

`legal` is computed **once, outside the loop**, and the identical slice is
assigned to every hole. `frontierChoices` (`concierge.go:138-167`) is a
hand-written table of twelve fixed kinds plus `ref` when the catalog has
anything resolvable (`:160-165`). **The frontier is context-free**: it does not
depend on the hole's path, on the surrounding partial, or on any accumulated
history. A version-space boundary is by definition a function of the data seen
so far; this is a constant.

Ticket 003 already ratified the fix and names it as such: the three additional
laws — SENSIBILITY, CONSTRUCTION REACHABILITY, and the PREFIX PROPERTY
("every offered fill admits a closed completion, discharged mechanically as
tree-automaton emptiness — no dead ends, ever") — and then, explicitly, "the
frontier becomes a DERIVED artifact: successor states of the tree automaton
compiled from the declared grammar, **never a hand-written table**"
(`docs/map/tickets/003-the-wrapper-prototype.md:47-60`). None of those three law
names appears in any `.ts` or `.go` file.

**Verdict on "the frontier is an `S`-boundary": ANALOGY today; STRUCTURAL once
ticket 003's automaton lands.** Even then the analogy is imperfect and it is
worth being precise about why: a tree-automaton successor set is a function of
the *partial term*, not of an accumulated example set. It is the set of moves
that keep a closed completion reachable — closer to the **`G`-boundary** of the
still-satisfiable completions than to `S`. The prefix property is the statement
that this boundary is never empty, which is the version-space non-collapse
condition (§3.3) discharged *statically, by construction* rather than
*dynamically, by luck*. That is a genuinely better guarantee than
candidate-elimination has, and it deserves to be claimed in those terms.

## 2.c The repair loop as CEGIS — and precisely where it is not

The sibling lane's loop is: propose → certify-or-refuse → human answers
refusals → loop. Map it onto §1.4:

| CEGIS | foldlab |
| --- | --- |
| synthesiser / learner | the model, emitting `flb.proposal.v0` fills |
| candidate `h` | candidate bytes / partial term |
| verifier | `certify(bytes) → Certificate \| Refusal` |
| counterexample `x₀` | the typed `Refusal` |
| constraint set `S`, growing | **absent — see below** |
| `∀ x ∈ X. Φ(h, x)` | **absent — see below** |

**Verdict: STRUCTURAL, with two named breaks.**

**Break 1 — the verifier is weaker than CEGIS's.** CEGIS's verifier discharges
`∀ x ∈ X. Φ(h, x)`: a universally quantified *behavioural specification* over
inputs. `certify` discharges well-formedness, identity, and declared closure
laws over the *term* (CONTEXT.md:178-184; ticket 015 item 1,
`docs/map/tickets/015-the-grammar-foundry.md:19-25`). There is no `∀ x` and no
`Φ`. **A term can certify and still be wrong** — it can be a perfectly legal
`flb.type.v0` term that means something other than what the utterance meant.
Ticket 015 already names this and refuses to paper over it: "the semantic gap
(whether the induced grammar means what the description said) is irreducible"
(`:47-51`). CEGIS converges to a program *correct against a spec*; this loop
converges to a term *admissible under a grammar*. Those are different
guarantees and the difference is exactly the semantic gap. **Anyone describing
this loop as CEGIS without naming Break 1 is overclaiming.**

**Break 2 — nothing maintains the constraint set.** CEGIS's convergence rests
entirely on `S` growing monotonically and the learner being consistent with all
of `S` **by construction**. A solver cannot re-propose a refuted candidate.
An LLM can, and the LLM-CEGIS literature says so directly (§1.7). In foldlab
today the situation is worse than "the model might forget": **there is no `S`
at all.** Searching the repository for any place a refusal is journaled,
appended, recorded, or persisted returns nothing — refusals are constructed by
`refuse()` (`proto/go/protod/refusal.go:44-54`), returned on the wire, and
dropped. The only memory of a refusal is the model's own context window. The
sibling lane's `flb.certification.v0` `Certified | Refused` record is exactly
the missing `S`, and it is the single highest-leverage unbuilt thing in this
dossier's scope.

**Termination.** Ticket 003's PREFIX PROPERTY gives a real well-founded measure
for the *fill* loop, and it is worth stating carefully because it is stronger
than it looks. Fill strictly decreases the hole count (each `type.fill` replaces
a hole with a subtree; subtrees may introduce new holes, so the measure is not
hole-count but the ordinal of the remaining-completion tree). The prefix
property — every offered fill admits a closed completion, discharged as
tree-automaton emptiness — guarantees **no dead ends, ever**
(`docs/map/tickets/003-the-wrapper-prototype.md:54-56`), i.e. from every
reachable state a terminating strategy exists. That is *progress-preservation*,
not termination: it removes the possibility that the loop is forced to fail, but
a model that fills a `list` with a `list` forever still diverges. **Honest
statement: the concierge guarantees the loop can always terminate successfully,
not that it will.** No convergence theorem is available and none should be
claimed. Build state for the prefix property: **RATIFIED-UNBUILT** — C4 ("no
dead ends") is tested today only in the weak sense that every advertised
frontier example is accepted at that path
(`proto/ts/test/concierge.test.ts:304`), which is a property of the twelve-entry
table, not of a compiled automaton.

## 2.d Attribute exploration as the ontology-side twin

This is the closest match in the dossier, and it holds up against the ticket's
actual text.

| Attribute exploration (§1.6) | Ticket 016 |
| --- | --- |
| the expert's question `A → A″` | "Two task verbs, theorem-forced: membership and equivalence" (`016:30-34`) |
| the expert's counterexample object | "a counterexample is monotone evidence (grow-only journal, plain-check admissible, federates)" (`016:35-42`) |
| the accepted implication | "an accepted implication is an absence claim that can rot and routes through the effector's CAS" (`016:35-42`) |
| Duquenne–Guigues basis | "Duquenne–Guigues canonical basis — complete, non-redundant, minimum-cardinality" (`016:16-19`) |
| coNP next-question, exponential basis | "Bounded ≠ small (coNP next-question, exponential worst-case basis) — the sharp edge arrives as a taught refusal, never a hung endpoint" (`016:25-29`) |
| the formal context | "The scale is a cataloged type (`flb.scale.v0`)" (`016:20-24`) |

**Verdict: EXACT.** Every clause of the correspondence is already ratified in
the ticket, with the right citations, including the query-learning connection
(Konev–Lutz–Ozaki–Wolter) and the hardness. Three observations that sharpen it:

1. **The equivalence query lives here, not in the foundry.** §2.a noted that the
   concierge answers only membership queries and therefore is not yet a MAT. The
   explorer's proposed implication *is* an equivalence query (restricted to the
   implication fragment), and the digest stream supplying counterexamples is the
   teacher's counterexample channel. **The estate has both MAT verbs; they are
   in different tickets.** Ticket 015's theorem obligation ("the concierge is a
   minimally adequate teacher") may be dischargeable only by composing 015's
   membership oracle with 016's equivalence machinery — worth grilling before
   anyone tries to prove it in 015 alone.

2. **"No redundant question" is a stronger guarantee than the ticket claims.**
   The ticket says the basis is "complete, non-redundant, minimum-cardinality"
   — properties of the *output*. The next-closure enumeration additionally
   guarantees a property of the *process*: every question posed has a premise
   closed under the already-accepted implications, so **no question is entailed
   by any prior answer**. That is the sentence to put in front of an operator
   who asks why the system will not waste their time, and it is a theorem, not
   a heuristic.

3. **The sort mapping is genuinely ours.** The ticket flags item 4 as "the core
   claim (ours; not in the FCA literature)" (`016:35-42`). Confirmed: the FCA
   literature treats the counterexample set `K` and implication set `L` as two
   halves of one mutable state. Splitting them by *durability* — counterexamples
   monotone and federating, accepted implications rot-prone and CAS-homed — is
   not in Ganter & Obiedkov, and it is the right split, because it is exactly
   the accept/refuse durability analysis of §2.a's corollary applied one level
   up: an accepted implication is a universally quantified absence claim ("no
   counterexample exists"), and absence is the one thing catalog growth can
   falsify.

## 2.e The teaching claim, carefully

The operator says "we teach the model by giving it negative examples." Taken
literally this is false — no weights update. What is true splits in two, and the
second half is the interesting one.

### (i) In-context learning from counterexamples: real, modest, feedback-limited

The strongest published evidence that negative examples help *in context*:

- **LEAP** — Zhang, Madaan, Gao, Zheng, Mishra, Yang, Tandon & Alon,
  "In-context principle learning from mistakes," *ICML 2024* (PMLR 235).
  Deliberately induce mistakes on the few-shot examples, have the model reflect
  on them to extract explicit task-specific **principles**, then prompt with the
  original few-shot examples *plus* the principles. Explicitly framed against
  the norm: standard ICL learns only from correct input–output pairs; LEAP
  leverages negative examples. Gains on GPT-4: +7.5 on DROP, +3.3 on HotpotQA,
  with no additional input beyond standard few-shot.
- **Olausson et al., ICLR 2024** (§1.7): repair gains are modest and variable,
  and the binding constraint is *feedback quality*.

**Read together, these say exactly the thing foldlab needs.** LEAP shows that
the useful artefact distilled from a mistake is a **principle** — a general
sentence, not the failed instance. Olausson shows that when the model generates
that sentence itself, quality is the bottleneck. **foldlab's `Law` field is a
principle, supplied by a proved certifier rather than distilled by the model.**
The design is, in effect, LEAP with the reflection step replaced by a theorem.
That is a testable hypothesis and the estate should test it, per ticket 015's
falsifiable-benchmark obligation. Build state: **ASPIRATIONAL** — no benchmark
exists.

### (ii) The system learns even if the model does not — and this is the deep claim

Here is the claim in its strong form:

> **The version space is maintained outside the model.** In classical CEGIS the
> constraint set `S` lives in the solver; in L* it lives in the observation
> table; in attribute exploration it lives in the counterexample set `K` and the
> implication set `L`. In an LLM loop there is no such structure — which is
> exactly the AutoCedar-style observation that LLMs break CEGIS's assumptions.
> foldlab's answer is to put the structure in the **catalog**: content-addressed,
> append-only, digest-identified, federating for free. The refusal corpus is a
> `setUnion` fold over typed counterexamples keyed by grammar digest. It is
> monotone, so it merges without coordination; it is content-addressed, so a
> corpus has an identity anyone can recompute; and it survives every model
> swap, every context-window eviction, and every vendor change, because nothing
> about it lives in the weights.

Why this is the deep one: it converts the LLM from *the thing that must learn*
into *a replaceable proposer*. The intelligence accumulates in a monotone
federated artefact whose value is independent of which model produced the
proposals that generated it. That inverts the usual economics of agent systems,
where capability is rented from a vendor and evaporates on a model deprecation.
Here the capability is a digest.

Two things must be said honestly about it.

**It does not exist.** Not one refusal is persisted anywhere in the repository
today (§2.c, Break 2). The claim is a design, and the design's load-bearing
record is the sibling lane's `flb.certification.v0 Refused`, which carries
exactly the daemon's refusal shape and — critically — `catalog_head`, without
which "this refused" is not a recomputable claim. **Build state: ASPIRATIONAL.**

**Not every refusal belongs in the corpus.** §2.a's corollary: only the
structural refusal kinds are monotone evidence; `unknown-ref`,
`unknown-identity` and `unknown-journal` are absence claims that later heads
repeal. A corpus that folds all nine kinds together would accumulate false
negatives — teaching the model that a construction is illegal when the truth was
only that a digest had not landed yet. The sort split must be made *before*
the corpus is built, not after.

**A corollary worth naming.** Because a refusal is a deterministic function of
`(candidate bytes, grammar digest, catalog head)`, the corpus is **replayable
against a new certifier**. Re-running every recorded candidate against a
changed grammar produces a diff of exactly which previously-refused terms now
certify and vice versa. That is a regression suite for the *grammar*, derived
for free from the history of agents failing at it — and it is the honest
version of "the system learns": what the system accumulates is a corpus with a
digest, and what that corpus buys is a differential test.

## 2.f What the algebra buys operationally

**Refusal corpora as CRDTs.** Shapiro, Preguiça, Baquero & Zawirski,
"Conflict-free replicated data types," *SSS 2011*, LNCS 6976, 386–400, and the
INRIA tech report RR-7506. The state-based (CvRDT) sufficient condition is:
the state space is a **join-semilattice**, `merge` is its **join**, and every
update is **inflationary** (monotone in the lattice order). Under those
conditions replicas converge to the same state — Strong Eventual Consistency —
with **no coordination whatsoever**.

Structural refusal sets under `∪` satisfy this exactly: it is a grow-only set,
the canonical CvRDT example. So:

> **Two foldlab daemons that have never communicated can merge their refusal
> corpora by union and are guaranteed to agree, with no lock, no consensus, and
> no ordering.** This is not a new theorem — it is Shapiro et al.'s applied to
> `setUnion` (`packages/core/src/algebra.ts:390-399`) — and it is exactly the
> "evidence federates freely" clause of foldlab's own sort ontology
> (README:37-46) instantiated on refusals.

Ticket 016 already anticipates the interaction and gets it right: "Merge is a
colimit, not a join (ratified) ... Joins remain the shared-signature special
case and inherit the CRDT results"
(`docs/map/tickets/016-the-ontology-explorer.md:43-46`). Union of refusal sets
over the **same grammar digest** is the shared-signature special case, so it is
a join and inherits the results directly. Across *different* grammar digests
there is no free merge — the refusals are about different languages and the
alignment between them is a decision. Verdict: **STRUCTURAL, unbuilt.** The
word *CRDT* appears in no `.ts` or `.go` file.

**Corpus digests as reproducible training-set identities.** A refusal corpus is
a set of canonical values, so it has a digest by the ordinary machinery
(`bytes-sha256-v1`, `proto/SPEC.md:63-65`). That gives a **reproducible
identity for a teaching set**: "model M, prompted with corpus `c0ffee…` over
grammar `deadbe…` at catalog head `abc123…`, achieved yield Y" is a fully
recomputable experimental claim, in a field where prompt-corpus provenance is
usually a paragraph of prose. This is the same move ADR-0005/§1.4 of the sibling
lane makes for interpreter identity, applied to the teaching corpus. Verdict:
**STRUCTURAL** — the digest machinery is SHIPPED, the corpus is not.

**The hardness map.** Fold the corpus with a different algebra: group refusals
by `(Law, Path-prefix)` and count. `product` (`algebra.ts:436-475`) and the
declared-homomorphism `map` (`:496-519`) give this as a derived view with no
replay, and the banana-split law makes the multi-statistic version one traversal
(`foldLaws.ts:178-193`). The result is a **hardness map of the grammar**: which
constructs agents stumble on, ranked, with the law that caught them.

That is direct foundry ergonomics (ticket 015). A construct with a heavy
refusal mass is a construct whose *frontier hints are inadequate* — because W7
says the refusal must be "sufficient for self-repair without external docs"
(`proto/SPEC.md:53-56`), a construct that keeps refusing repeatedly is prima
facie evidence that W7 is not being met there. **The hardness map is a
measurement of W7 compliance, not just a usability report.** That reframing is
worth having: it turns an ergonomics nice-to-have into a law-conformance
instrument. Verdict: **STRUCTURAL, unbuilt** — every algebra it needs is
SHIPPED; the input stream is not.

---

# PART 3 — WHAT THIS DOES NOT SAY

**3.1 No convergence guarantee for an LLM proposer.** None of Gold, Angluin,
Solar-Lezama, or Mitchell yields a theorem about a language model in a loop.
Classical CEGIS convergence rests on the learner being consistent with the
accumulated constraint set *by construction*; an LLM has no such property, does
not maintain a symbolic version space, and can re-propose a refuted candidate at
any temperature. Every published LLM-CEGIS success is an empirical benchmark
result, never a proof. **The estate must not claim convergence.** What it may
claim is a monotone *admissibility* guarantee — nothing wrong ever enters the
catalog, however long the model flails — which is a property of the certifier
and is independent of the proposer entirely.

**3.2 The idealised-protocol gap.** Gold and Angluin concern **exact
identification** of a language, in the limit or by polynomially many queries,
under protocols that assume a truthful oracle, a fixed hypothesis class known to
the learner, and a learner that computes. None of those hold for a model reading
prose. Two specific slippages to guard against:

- *Which grammar is being learned?* In the concierge (ticket 003) the grammar is
  **given** and pinned by digest; nothing is being identified, and Gold does not
  apply to that loop at all. In the foundry (ticket 015) a grammar is being
  **induced** from NL plus examples, and Gold applies with full force — which is
  why ticket 015's ratification 2 ("positive-only description-in/DSL-out is
  provably unlearnable, so the endpoint always runs the refusal round-trip",
  `015:26-30`) is correct and important. Conflating the two loops would let the
  foundry's theorem be claimed for the concierge, where it means nothing.
- *"Minimally adequate teacher" is a technical term with two verbs.* The
  concierge supplies one (§2.a). Claiming MAT status on membership queries alone
  is a category error, and by §1.3 membership queries alone provably do not
  identify a regular set.

**3.3 Version-space collapse under noise, and what refusal-noise would be.**
Mitchell's candidate elimination is famously brittle: a **single** mislabelled
example makes `S` and `G` cross and `VS` collapse to `∅`, with no recovery and
no diagnostic — the algorithm cannot distinguish "your hypothesis language is
too weak" from "one of your labels is wrong." Generalising version spaces to
tolerate noise is a known research line (Hirsh, "Generalizing version spaces,"
*Machine Learning* 17:5–46, 1994).

Applied here, the analysis is unusually favourable and then unusually specific:

- For **structural refusals**, there is no label noise. `certify` is total and
  deterministic, and the label is not a human judgement — it is a function of
  the bytes. This is a real advantage over every learning setting in Part 1
  except CEGIS with a sound verifier, and it is worth stating plainly: **the
  teacher cannot lie.**
- For **absence refusals**, there is noise, and it has an exact
  characterisation: a `unknown-ref` refusal at head `h` is a **false negative**
  with respect to any later head `h′ ⊒ h` at which the digest resolves.
  **Catalog lag is the noise channel**, and it hits precisely the refusal kinds
  that §2.a showed are not monotone evidence. The two analyses agree, which is
  the encouraging part: the sort split that makes the corpus sound is the same
  split that makes it noise-free.
- The human is also a noise source in the loop the sibling lane describes
  ("human answers refusals"), and human answers are **decisions**, not evidence
  — which is exactly where the sibling lane puts them (`Interpreted` is
  effector-homed). A human who adopts a wrong meaning creates a durable wrong
  fact, and the only remedy the machinery offers is `Corrected`, a new record
  naming its predecessor, never an overwrite.
- Ticket 016 has a fourth noise source that this dossier does not resolve: a
  **fallible oracle** answering exploration questions. The ticket already gates
  on it — "the fallible-oracle consistency number decides whether a consistency
  protocol precedes architecture" (`016:56-58`). Correct call; leave it there.

**3.4 Grammar classes where the results weaken.** The Part 1 results are
sharpest at the bottom of the hierarchy and degrade upward:

- **Regular / finite tree languages.** L* (exact, polynomial), RPNI (exact,
  polynomial, with characteristic samples), tree-automaton emptiness (decidable,
  and the discharge mechanism ticket 003 relies on). `flb.type.v0` terms are
  ranked trees, so the *regular tree language* setting is the right one, and it
  is the setting where everything works. Ticket 004's closure law (regularity)
  is what keeps the estate inside it — this dossier is one more reason not to
  give that law up.
- **Context-free.** Identifiable from an informant in Gold's limiting sense; not
  polynomially learnable from membership + equivalence queries under standard
  cryptographic assumptions. Equivalence of CFGs is undecidable, so the
  equivalence query cannot be implemented by a checker at all — it must come
  from a human or a sampling approximation.
- **Beyond.** For context-sensitive and above, Gold's informant result survives
  as a limiting statement and every effective procedure the estate would want
  (equivalence, emptiness, the prefix property) becomes undecidable. **If the
  declared grammar ever escapes the regular-tree fragment, the prefix property
  is no longer mechanically dischargeable and ticket 003's "no dead ends, ever"
  becomes unprovable.** That is the sharpest reason the closure law is
  load-bearing, and it should be recorded as such.
- **Description logics.** Ticket 016's target choice is already theorem-forced:
  DL-Lite-shaped fragments are polynomially learnable from membership +
  equivalence queries, `EL` provably is not (Konev, Lutz, Ozaki & Wolter, JMLR
  2018). The ticket's "EL interop, if ever needed, is a derived view, never the
  learning target" (`016:30-34`) is exactly the right consequence.

**3.5 What is unbuilt, listed plainly.** So that no reader mistakes this
dossier's structure for the repository's:

| Claim | Build state |
| --- | --- |
| Typed refusal with law/path/got/expected/example | **SHIPPED** (`proto/go/protod/refusal.go:33-42`; W7 `proto/SPEC.md:53-56`) |
| Concierge fill/unfill/frontier, laws C1–C5 | **SHIPPED** (`proto/go/protod/concierge.go`; `proto/AGENTS.md:24-27`) |
| `setUnion` monoid with generated identity/associativity suite | **SHIPPED** (`packages/core/src/algebra.ts:390-412`; `foldLaws.ts:154-177`) |
| Semilattice status (idempotence, commutativity) checked | **ASPIRATIONAL** — word absent from repo |
| Frontier as derived tree-automaton successors | **RATIFIED-UNBUILT** (`003:47-60`; today a table at `concierge.go:138-167`) |
| Prefix property / SENSIBILITY / CONSTRUCTION REACHABILITY | **RATIFIED-UNBUILT** — names absent from code |
| Refusals persisted anywhere | **ASPIRATIONAL** — nothing in the repository journals a refusal |
| Refusal corpus, its digest, its fold, the hardness map | **ASPIRATIONAL** |
| Evidence/absence sort split *within* refusal kinds | **ASPIRATIONAL** — the split is not marked anywhere |
| `certify(bytes)` as a named entry point; trusted-base line count in VERIFICATION.md | **RATIFIED-UNBUILT** (CONTEXT.md:178-184; `015:19-25`); no `certify(` exists in code, and VERIFICATION.md contains no trusted-base figure |
| Attribute exploration engine | **RATIFIED-UNBUILT** (ticket 016) |
| Falsifiable benchmark vs. an L*LM-style oracle | **ASPIRATIONAL** (`015:26-30`) |

---

## Sources

Verified this session via web search; primary venues named.

**Learning theory and grammatical inference**

- E. M. Gold, "Language identification in the limit," *Information and Control*
  10(5):447–474, 1967. — https://www.semanticscholar.org/paper/Language-Identification-in-the-Limit-Gold/20cc59e8879305cbe18409c77464eff272e1cf55
  and the summary of presentation regimes and class results at
  https://en.wikipedia.org/wiki/Language_identification_in_the_limit
- D. Angluin, "Inductive inference of formal languages from positive data,"
  *Information and Control* 45(2):117–135, 1980. —
  https://www.wikidata.org/wiki/Q55881523
- D. Angluin, "Learning regular sets from queries and counterexamples,"
  *Information and Computation* 75(2):87–106, 1987. —
  https://dl.acm.org/doi/10.1016/0890-5401(87)90052-6 ;
  https://www.sciencedirect.com/science/article/pii/0890540187900526
- M. Kearns & U. Vazirani, *An Introduction to Computational Learning Theory*,
  MIT Press, 1994, ch. "Learning Finite Automata by Experimentation," 155–158.
- M. Isberner, F. Howar & B. Steffen, "The TTT algorithm: a redundancy-free
  approach to active automata learning," *RV 2014*, LNCS 8734, 307–322. —
  https://link.springer.com/chapter/10.1007/978-3-319-11164-3_26
- M. Isberner & B. Steffen, "An abstract framework for counterexample analysis
  in active automata learning," PMLR 34, 2014. —
  http://proceedings.mlr.press/v34/isberner14a.pdf
- J. Oncina & P. García, "Inferring regular languages in polynomial update
  time," in *Pattern Recognition and Image Analysis*, World Scientific, 1992,
  49–61 (RPNI). —
  https://www.researchgate.net/publication/239643375_Inferring_regular_languages_in_polynomial_update_time
- C. de la Higuera, "Characteristic sets for polynomial grammatical inference,"
  *Machine Learning* 27(2):125–138, 1997. —
  https://link.springer.com/article/10.1023/A:1007353007695

**Synthesis and verification**

- A. Solar-Lezama, L. Tancau, R. Bodík, S. Seshia & V. Saraswat, "Combinatorial
  sketching for finite programs," *ASPLOS 2006*, 404–415. —
  https://people.csail.mit.edu/asolar/papers/asplos06-final.pdf ;
  https://dblp.org/rec/conf/asplos/Solar-LezamaTBSS06.html
- E. Clarke, O. Grumberg, S. Jha, Y. Lu & H. Veith, "Counterexample-guided
  abstraction refinement," *CAV 2000*, LNCS 1855, 154–169; journal version
  *JACM* 50(5):752–794, 2003. —
  https://www.cs.cmu.edu/~emc/papers/Papers%20In%20Refereed%20Journals/Counterexample-guided%20abstraction%20refinement.pdf ;
  https://dl.acm.org/doi/10.1145/876638.876643
- S. Gulwani, O. Polozov & R. Singh, *Program Synthesis*, Foundations and Trends
  in Programming Languages 4(1–2):1–119, 2017. —
  https://www.microsoft.com/en-us/research/wp-content/uploads/2017/10/program_synthesis_now.pdf
- CEGIS loop formulation and termination conditions (finite candidate space;
  covering arguments for infinite domains) —
  https://www.emergentmind.com/topics/counterexample-guided-inductive-synthesis-cegis

**Version spaces and formal concept analysis**

- T. M. Mitchell, "Generalization as search," *Artificial Intelligence*
  18(2):203–226, 1982. —
  http://www-cs-students.stanford.edu/~pdoyle/quail/summaries/learning-mitchell-summary.html ;
  https://www.cs.cornell.edu/courses/cs472/2004fa/Materials/2004/8-version-space-4up.pdf
- T. Lau, S. Wolfman, P. Domingos & D. Weld, "Programming by demonstration
  using version space algebra," *Machine Learning* 53(1–2):111–156, 2003. —
  https://link.springer.com/article/10.1023/A:1025671410623 ;
  https://homes.cs.washington.edu/~weld/papers/mlj02.pdf
- H. Hirsh, "Generalizing version spaces," *Machine Learning* 17:5–46, 1994. —
  https://link.springer.com/article/10.1023/A:1022600917598
- B. Ganter & R. Wille, *Formal Concept Analysis: Mathematical Foundations*,
  Springer, 1999 (antitone Galois connection of the derivation operators). —
  https://phoenix.inf.upol.cz/esf/ucebni/formal.pdf
- B. Ganter & S. Obiedkov, *Conceptual Exploration*, Springer, 2016. —
  https://dl.acm.org/doi/book/10.5555/2967107 ;
  https://link.springer.com/chapter/10.1007/978-3-031-16663-1_5
- J.-L. Guigues & V. Duquenne, "Familles minimales d'implications informatives
  résultant d'un tableau de données binaires," *Mathématiques et Sciences
  Humaines* 95:5–18, 1986; minimum-cardinality and completeness properties
  surveyed in K. Bazhanov & S. Obiedkov, "Optimizations in computing the
  Duquenne–Guigues basis of implications," *Annals of Mathematics and AI*,
  2014. — https://link.springer.com/article/10.1007/s10472-013-9353-y
- B. Konev, C. Lutz, A. Ozaki & F. Wolter, "Exact learning of lightweight
  description logic ontologies," *JMLR* 18(201):1–63, 2018. —
  https://jmlr.org/papers/v18/16-256.html ; https://arxiv.org/abs/1709.07314
- M. Arias & J. L. Balcázar, "Construction and learnability of canonical Horn
  formulas" and "Learning definite Horn formulas from closure queries,"
  *Theoretical Computer Science*, 2015. —
  https://www.sciencedirect.com/science/article/pii/S0304397515011809

**Distributed algebra**

- M. Shapiro, N. Preguiça, C. Baquero & M. Zawirski, "Conflict-free replicated
  data types," *SSS 2011*, LNCS 6976, 386–400; INRIA RR-7506. —
  https://link.springer.com/chapter/10.1007/978-3-642-24550-3_29 ;
  https://www.cs.tufts.edu/~nr/cs257/archive/marc-shapiro/CRDTs_SSS-2011.pdf

**LLM-era**

- S. Geng, M. Josifoski, M. Peyrard & R. West, "Grammar-constrained decoding for
  structured NLP tasks without finetuning," *EMNLP 2023*. —
  https://aclanthology.org/2023.emnlp-main.674/
- K. Park, J. Wang, T. Berg-Kirkpatrick, N. Polikarpova & L. D'Antoni,
  "Grammar-aligned decoding," *NeurIPS 2024*. —
  https://proceedings.neurips.cc/paper_files/paper/2024/hash/2bdc2267c3d7d01523e2e17ac0a754f3-Abstract-Conference.html ;
  https://arxiv.org/abs/2405.21047
- A. Ni, S. Iyer, D. Radev, V. Stoyanov, W. Yih, S. Wang & X. Lin, "LEVER:
  learning to verify language-to-code generation with execution," *ICML 2023*,
  PMLR 202. — https://proceedings.mlr.press/v202/ni23b/ni23b.pdf
- B. Chen, F. Zhang, A. Nguyen, D. Zan, Z. Lin, J.-G. Lou & W. Chen, "CodeT:
  code generation with generated tests," *ICLR 2023*. —
  https://openreview.net/forum?id=ktrw68Cmu9c
- T. Olausson, J. Inala, C. Wang, J. Gao & A. Solar-Lezama, "Is self-repair a
  silver bullet for code generation?," *ICLR 2024*, arXiv:2306.09896. —
  https://iclr.cc/virtual/2024/poster/17429 ; https://arxiv.org/pdf/2306.09896
- T. Zhang, A. Madaan, L. Gao, S. Zheng, S. Mishra, Y. Yang, N. Tandon & U.
  Alon, "In-context principle learning from mistakes," *ICML 2024*, PMLR 235. —
  https://proceedings.mlr.press/v235/zhang24at.html ;
  https://arxiv.org/abs/2402.05403
- "Neuro-symbolic reasoning for planning: counterexample-guided inductive
  synthesis using large language models and satisfiability solving,"
  arXiv:2309.16436. — https://arxiv.org/pdf/2309.16436
- A. G. Pereira et al., "Property-guided LLM program synthesis for planning,"
  arXiv:2605.16142. — https://arxiv.org/html/2605.16142
- A. Vatsa, S. Shome, Y. Zhou & W. Eiers, "AutoCedar: an agentic framework for
  verifier-guided access control policy synthesis," arXiv:2607.03656, July
  2026. — https://arxiv.org/abs/2607.03656

**In-repo**

- `README.md:37-46`, `:57-61`, `:83-85` — the three sorts; monotone presence;
  the typed-refusal promise on the MCP surface.
- `CONTEXT.md:171-177` — identity order and "construction history never leaks
  into evidence"; `:178-184` — the certifier.
- `proto/SPEC.md:41-65` — laws W1–W10 (W7 teach, W8 refusals are data, W9 the
  three-verb writ, W10 scheme tagging).
- `proto/go/protod/refusal.go:9-19`, `:23-27`, `:33-42`, `:44-54` — the nine
  refusal kinds, `NextHint`, the `Refusal` record, `refuse()`.
- `proto/go/protod/concierge.go:9`, `:124-136`, `:138-167`, `:169-194` —
  `frontierRefLimit`, `buildFrontier` (constant `legal`), the hand-written
  choice table, hint generation.
- `proto/go/protod/walk.go:84-87` — C5 enforced in the walk.
- `proto/ts/src/wire.ts:17-40`, `:53-72`, `:145-155` — refusal and frontier
  schemas; `localRefusal`.
- `proto/wire/CONTRACT.md:70-73`, `:79-85`, `:119-143`, `:162-164` — C1
  byte-identical replies against the same catalog; frontier order and C4; the
  uniform refusal shape; ref resolution.
- `proto/AGENTS.md:24-27` — concierge laws C1–C5 as walls.
- `proto/ts/test/concierge.test.ts:173,195,213,280,304,382` — C1–C5 as tests.
- `packages/core/src/algebra.ts:192-198`, `:340`, `:390-399`, `:412`,
  `:436-475`, `:496-519` — the `Algebra` interface, `normalizeSet`, `setUnion`,
  the registry, `product`, declared homomorphisms and `mapped`.
- `packages/core/src/foldLaws.ts:154-177`, `:178-193`, `:196-200` — generated
  identity/associativity, banana-split, third-homomorphism split.
- `docs/map/tickets/003-the-wrapper-prototype.md:29-45`, `:47-60` — the
  concierge verbs; SENSIBILITY, CONSTRUCTION REACHABILITY, PREFIX PROPERTY, and
  "never a hand-written table."
- `docs/map/tickets/015-the-grammar-foundry.md:19-25`, `:26-30`, `:31-34`,
  `:47-51` — the certifier as sole admission path; the Gold/Angluin teaching
  loop and the MAT theorem obligation; unrealizability as a refusal; the
  semantic gap and GAD.
- `docs/map/tickets/016-the-ontology-explorer.md:16-19`, `:20-24`, `:25-29`,
  `:30-34`, `:35-42`, `:43-46`, `:56-59` — the DG basis; the scale as a
  cataloged type; the budget refusal; the two theorem-forced verbs; the sort
  mapping; colimit-not-join; the fallible-oracle gate.
- `docs/design/2026-08-14-the-language-surface.md` (branch
  `worktree-agent-a6fdcad180ebc5ae0`) — the sort table placing the certifier's
  refusal as evidence; `flb.certification.v0 Certified | Refused`;
  `catalog_head` as a required field; the certifier-not-sampler anchor.
- `VERIFICATION.md` — contains no trusted-base or certifier line count, contrary
  to ticket 015's obligation.
